# Plans Hub, Editor Refresh & Vacation Mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/plan` into a multi-plan hub (list / set-active / create / edit / delete / duplicate), refresh the plan editor (explicit savings math, grouped sections, remove-row, single Save), and add a track-only Vacation mode that takes over Home while active and keeps trip spend fully separate from the monthly cycle.

**Architecture:** A new `trips` table + `transactions.trip_id` lets trip expenses live entirely outside the monthly cycle math (every monthly-spend query adds `.is("trip_id", null)`). Pure data access lives in `lib/queries/{plans,trips}.ts`; mutations go through Server Actions in `app/(app)/actions.ts` mirroring existing patterns. The `/plan` route becomes a hub; the editor moves to `/plan/[id]` and `/plan/new`; the active trip lives at `/vacation` and, when active, replaces the Home pace hero.

**Tech Stack:** Next.js 16 (App Router, RSC, Server Actions), React 19, Supabase (Postgres + RLS, `@supabase/ssr`), Tailwind v4 (config-less, `@theme inline`), lucide-react, vitest for pure logic.

## Global Constraints

- **Next.js 16:** `createClient()` is async; await it. Read `node_modules/next/dist/docs/` before unfamiliar APIs (AGENTS.md).
- **Auth pattern:** queries do `const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Not authenticated");` (or `return null`/default for read-optional). Server Actions delegate auth to queries.
- **Server Action pattern:** file starts `"use server";`; validate inputs with explicit `throw new Error("human message")`; after mutation call the relevant `revalidatePath(...)`.
- **Currency/dates:** render amounts via `formatINR()` from `@/lib/utils/currency`; dates are local `YYYY-MM-DD` via `@/lib/utils/date` (`todayISO`, `formatDate`). Never hand-format.
- **Amounts in DB:** `numeric(12,2)`, read back with `Number(...)`.
- **RLS:** every new table gets `enable row level security` + a `"own rows"` policy (`user_id = auth.uid()`), matching `0002_rls.sql`/`0005_plans.sql`.
- **Migrations are NOT applied by the implementer** — write the `.sql` file and commit it; the user runs it. Do not call `supabase db push`.
- **Quiet Instrument tokens:** dark theme. Selected/active pills use `bg-pace-good text-canvas`; surfaces `bg-panel`/`bg-surface-2`; text `text-ink`/`text-ink-dim`; dividers `border-hairline`; focus `focus-visible:ring-pace-good`. Never `bg-ink text-on-dark` (invisible — both resolve light).
- **No commit trailers:** never add `Co-Authored-By: Claude` or "Generated with Claude Code".
- **Decisions locked:** vacation is track-only (no budget/pace); manual start/end; one active trip at a time; trip spend fully separate from monthly (excluded via `trip_id`); active plan can't be deleted; reorder deferred.
- **Known issue NOT in scope:** the cycle-boundary timezone edge (see spec) is fixed separately — do not attempt it here.

---

## File Structure

**Created:**
- `supabase/migrations/0006_trips.sql` — `trips` table, `transactions.trip_id`, RLS, one-active index.
- `lib/queries/trips.ts` — trip data access + active-trip totals/breakdown.
- `app/(app)/plan/[id]/page.tsx` — edit-existing-plan route.
- `app/(app)/plan/new/page.tsx` — create-plan route.
- `app/(app)/vacation/page.tsx` — active-trip route.
- `components/plan/PlansHub.tsx` — hub UI (cards, actions, vacation entry).
- `components/plan/PlanCard.tsx` — one plan card.
- `components/vacation/StartTripSheet.tsx` — start-trip flow (client).
- `components/vacation/TripView.tsx` — active-trip view (total + breakdown + logging + End trip).

**Modified:**
- `lib/types.ts` — add `Trip`, `TripWithSpend` types; add `trip_id` to `Transaction`.
- `lib/queries/plans.ts` — add `getPlanById`, `deletePlan`, `duplicatePlan`.
- `lib/queries/pace.ts` — exclude trip spend (`.is("trip_id", null)`).
- `lib/queries/insights.ts` — exclude trip spend (`.is("trip_id", null)`).
- `lib/queries/transactions.ts` — `AddTransactionInput` gains optional `trip_id`.
- `app/(app)/actions.ts` — add `deletePlanAction`, `duplicatePlanAction`, `startTripAction`, `endTripAction`; route `logEntry` to the active trip when one exists; extend revalidation to `/vacation`.
- `app/(app)/plan/page.tsx` — becomes the hub (was the editor).
- `components/plan/PlanEditor.tsx` — refreshed (grouped sections, savings breakdown, remove-row, single Save, accepts an explicit plan prop + mode).
- `app/(app)/page.tsx` — branch to `TripView` when a trip is active.
- `components/ui/TopBar.tsx` — (no link change; `/plan` already points at the hub route) — verify only.

---

## Task 1: Migration + types (trips, trip_id)

**Files:**
- Create: `supabase/migrations/0006_trips.sql`
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `trips` table, `transactions.trip_id` column; TS types `Trip`, `TripWithSpend`; `Transaction.trip_id`.

No automated test (SQL/types). Verify by `npm run typecheck`. Migration is written, NOT applied.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0006_trips.sql`:
```sql
-- 0006_trips.sql
-- Vacation mode: a date-bounded, track-only trip kept entirely separate from the
-- monthly salary cycle. Trip expenses set transactions.trip_id and are excluded
-- from all monthly-cycle spend math. At most one active trip per user.

create table trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  start_date  date,
  end_date    date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index on trips (user_id, is_active);

-- At most one active trip per user.
create unique index trips_one_active_per_user
  on trips (user_id) where is_active;

alter table trips enable row level security;
create policy "own rows" on trips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Link a transaction to a trip. Null = ordinary monthly spend.
alter table transactions
  add column trip_id uuid references trips(id) on delete set null;

create index on transactions (trip_id) where trip_id is not null;
```

- [ ] **Step 2: Add types to lib/types.ts**

Append to `lib/types.ts`:
```typescript

// --- Vacation mode ---

export interface Trip {
  id: string;
  user_id: string;
  name: string;
  start_date: string | null; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  is_active: boolean;
  created_at: string;
}

// Active trip with its running spend total and per-category breakdown.
export interface TripWithSpend extends Trip {
  total: number;
  byCategory: Array<{
    categoryId: string;
    name: string;
    icon: string | null;
    spent: number;
  }>;
  dayNumber: number; // 1-based days since start_date (or created_at), min 1
}
```

Also add `trip_id` to the existing `Transaction` interface — find:
```typescript
  recurring_id: string | null;
  created_at: string;
}
```
and change to:
```typescript
  recurring_id: string | null;
  trip_id: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0006_trips.sql lib/types.ts
git commit -m "Add trips table, transactions.trip_id, and trip types"
```

---

## Task 2: Trip queries

**Files:**
- Create: `lib/queries/trips.ts`
- Modify: `lib/queries/transactions.ts` (add `trip_id` to `AddTransactionInput`)

**Interfaces:**
- Consumes: `Trip`, `TripWithSpend` from Task 1; `createClient`; `todayISO`, `daysBetween` from `@/lib/utils/date`.
- Produces:
  - `getActiveTrip(): Promise<Trip | null>`
  - `getActiveTripWithSpend(): Promise<TripWithSpend | null>`
  - `listTrips(): Promise<Trip[]>`
  - `startTrip(input: { name: string; startDate?: string | null; endDate?: string | null }): Promise<Trip>`
  - `endTrip(id: string): Promise<void>`
  - `AddTransactionInput` gains `trip_id?: string | null`.

- [ ] **Step 1: Add trip_id to AddTransactionInput**

In `lib/queries/transactions.ts`, find the `AddTransactionInput` interface (it has `item_id?`, `category_id`, `amount`, `note?`, `spent_at?`) and add a field:
```typescript
  trip_id?: string | null;
```
Then in `addTransaction`, after the line `note: input.note ?? null,` inside the `row` object, add:
```typescript
    recurring_id: null,
    trip_id: input.trip_id ?? null,
```
(If `recurring_id` is already set elsewhere, only add the `trip_id` line. Do not duplicate keys.)

- [ ] **Step 2: Implement lib/queries/trips.ts**

Create `lib/queries/trips.ts`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { todayISO, daysBetween } from "@/lib/utils/date";
import type { Trip, TripWithSpend } from "@/lib/types";

async function userIdOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

export async function getActiveTrip(): Promise<Trip | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return (data as Trip | null) ?? null;
}

export async function listTrips(): Promise<Trip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Trip[];
}

export async function startTrip(input: {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<Trip> {
  const { supabase, userId } = await userIdOrThrow();
  const { data, error } = await supabase
    .from("trips")
    .insert({
      user_id: userId,
      name: input.name,
      start_date: input.startDate ?? todayISO(),
      end_date: input.endDate ?? null,
      is_active: true,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as Trip;
}

// End the trip: mark inactive, and stamp end_date with today when it was blank
// so history shows a real range.
export async function endTrip(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: trip, error: gErr } = await supabase
    .from("trips")
    .select("end_date")
    .eq("id", id)
    .maybeSingle();
  if (gErr) throw gErr;
  const endDate = (trip as { end_date: string | null } | null)?.end_date ?? todayISO();
  const { error } = await supabase
    .from("trips")
    .update({ is_active: false, end_date: endDate })
    .eq("id", id);
  if (error) throw error;
}

// The active trip plus its running total and per-category breakdown.
export async function getActiveTripWithSpend(): Promise<TripWithSpend | null> {
  const trip = await getActiveTrip();
  if (!trip) return null;

  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("amount, category_id, category:categories(name, icon)")
    .eq("trip_id", trip.id);
  if (error) throw error;

  let total = 0;
  const map = new Map<string, { name: string; icon: string | null; spent: number }>();
  for (const r of rows ?? []) {
    const amount = Number((r as { amount: number }).amount);
    total += amount;
    const id = (r as { category_id: string }).category_id;
    const cat = (r as { category: { name: string; icon: string | null } | null }).category;
    const prev = map.get(id);
    if (prev) prev.spent += amount;
    else map.set(id, { name: cat?.name ?? "Other", icon: cat?.icon ?? null, spent: amount });
  }

  const byCategory = Array.from(map.entries())
    .map(([categoryId, v]) => ({ categoryId, name: v.name, icon: v.icon, spent: v.spent }))
    .sort((a, b) => b.spent - a.spent);

  const anchor = trip.start_date ?? trip.created_at.slice(0, 10);
  const dayNumber = Math.max(1, daysBetween(anchor, todayISO()) + 1);

  return { ...trip, total, byCategory, dayNumber };
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/trips.ts lib/queries/transactions.ts
git commit -m "Add trip queries and trip_id on transactions"
```

---

## Task 3: Exclude trip spend from monthly math

**Files:**
- Modify: `lib/queries/pace.ts`
- Modify: `lib/queries/insights.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: monthly spend queries that ignore trip transactions.

No new unit test (these are integration queries); verify by `npm run typecheck`. The pure-math tests in `lib/pace` are unaffected and must stay green.

- [ ] **Step 1: Exclude trips in pace.ts**

In `lib/queries/pace.ts`, the discretionary-spend query currently chains
`.is("recurring_id", null).gte("spent_at", cycle.start).lt("spent_at", cycle.end)`.
Add `.is("trip_id", null)` to that chain so it reads:
```typescript
  const { data: discRows, error: dErr } = await supabase
    .from("transactions")
    .select("amount, category_id, spent_at")
    .is("recurring_id", null)
    .is("trip_id", null)
    .gte("spent_at", cycle.start)
    .lt("spent_at", cycle.end);
```

- [ ] **Step 2: Exclude trips in insights.ts**

In `lib/queries/insights.ts`, the transactions fetch selects `amount, spent_at, recurring_id` over the window. Add `.is("trip_id", null)` to that query's chain (immediately after the `.select(...)` and before/after the existing `.gte`/`.lt` range filters — order among `.is/.gte/.lt` does not matter). The select does not need to add `trip_id`.

- [ ] **Step 3: Typecheck + tests**

Run: `npm run typecheck && npm test`
Expected: typecheck PASS; 18/18 pace tests still pass.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/pace.ts lib/queries/insights.ts
git commit -m "Exclude trip spend from monthly cycle and insights math"
```

---

## Task 4: Plan queries (getById, delete, duplicate)

**Files:**
- Modify: `lib/queries/plans.ts`

**Interfaces:**
- Consumes: existing `getActivePlanById` is internal; `userIdOrThrow`, `createClient`, `Plan`, `PlanWithAllowances`.
- Produces:
  - `getPlanById(id: string): Promise<PlanWithAllowances | null>`
  - `deletePlan(id: string): Promise<void>` (throws if the plan is active)
  - `duplicatePlan(id: string): Promise<Plan>` (clones inactive, name "<name> copy")

- [ ] **Step 1: Add the three functions to lib/queries/plans.ts**

Append to `lib/queries/plans.ts` (it already imports `createClient` and the types, and has an internal `userIdOrThrow` and `getActivePlanById`). Add:
```typescript

// Fetch any plan by id with its allowances joined to categories. Null if absent.
export async function getPlanById(id: string): Promise<PlanWithAllowances | null> {
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!plan) return null;
  const { data: rows, error: aErr } = await supabase
    .from("plan_allowances")
    .select("*, category:categories(*)")
    .eq("plan_id", id);
  if (aErr) throw aErr;
  return { ...(plan as Plan), allowances: (rows ?? []) as PlanWithAllowances["allowances"] };
}

// Delete a plan. Refuses to delete the active plan (it's live).
export async function deletePlan(id: string): Promise<void> {
  const supabase = await createClient();
  const { data: plan, error: gErr } = await supabase
    .from("plans")
    .select("is_active")
    .eq("id", id)
    .maybeSingle();
  if (gErr) throw gErr;
  if (!plan) return;
  if ((plan as { is_active: boolean }).is_active) {
    throw new Error("Can't delete the active plan. Activate another plan first.");
  }
  const { error } = await supabase.from("plans").delete().eq("id", id);
  if (error) throw error;
}

// Clone a plan (and its allowances) as a new inactive plan named "<name> copy".
export async function duplicatePlan(id: string): Promise<Plan> {
  const { supabase, userId } = await userIdOrThrow();
  const source = await getPlanById(id);
  if (!source) throw new Error("Plan not found");

  const { data: created, error } = await supabase
    .from("plans")
    .insert({
      user_id: userId,
      name: `${source.name} copy`,
      salary: source.salary,
      buffer: source.buffer,
      is_active: false,
    })
    .select("*")
    .single();
  if (error) throw error;
  const newPlan = created as Plan;

  if (source.allowances.length) {
    const { error: insErr } = await supabase.from("plan_allowances").insert(
      source.allowances.map((a) => ({
        plan_id: newPlan.id,
        category_id: a.category_id,
        amount: a.amount,
      })),
    );
    if (insErr) throw insErr;
  }
  return newPlan;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS. If `userIdOrThrow` is not exported/visible, it is already defined in this file (used by other functions) — reuse it directly; do not redefine.

- [ ] **Step 3: Commit**

```bash
git add lib/queries/plans.ts
git commit -m "Add getPlanById, deletePlan, duplicatePlan"
```

---

## Task 5: Server actions (plan delete/duplicate, trip start/end, logEntry routing)

**Files:**
- Modify: `app/(app)/actions.ts`

**Interfaces:**
- Consumes: `deletePlan`, `duplicatePlan` from `@/lib/queries/plans`; `startTrip`, `endTrip`, `getActiveTrip` from `@/lib/queries/trips`; existing `addTransaction`, `addCategory`, `addItem`.
- Produces server actions: `deletePlanAction(planId)`, `duplicatePlanAction(planId): Promise<{ id: string }>`, `startTripAction({ name, startDate?, endDate? }): Promise<{ id: string }>`, `endTripAction(tripId)`. `logEntry` routes to the active trip when one exists.

- [ ] **Step 1: Add imports**

At the top of `app/(app)/actions.ts`, add to the imports:
```typescript
import { deletePlan, duplicatePlan } from "@/lib/queries/plans";
import { startTrip, endTrip, getActiveTrip } from "@/lib/queries/trips";
```

- [ ] **Step 2: Extend revalidatePlanSurfaces and add a trip revalidate helper**

Find `function revalidatePlanSurfaces()` and add `revalidatePath("/vacation");` inside it. Then add a new helper right after it:
```typescript

function revalidateTripSurfaces() {
  revalidatePath("/");
  revalidatePath("/vacation");
  revalidatePath("/history");
}
```

- [ ] **Step 3: Add the plan + trip actions**

Append at the end of `app/(app)/actions.ts`:
```typescript

export async function deletePlanAction(planId: string) {
  if (!planId) throw new Error("Missing plan id");
  await deletePlan(planId);
  revalidatePlanSurfaces();
}

export async function duplicatePlanAction(planId: string): Promise<{ id: string }> {
  if (!planId) throw new Error("Missing plan id");
  const plan = await duplicatePlan(planId);
  revalidatePlanSurfaces();
  return { id: plan.id };
}

export async function startTripAction(input: {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
}): Promise<{ id: string }> {
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("Name your trip");
  const trip = await startTrip({
    name,
    startDate: input.startDate?.trim() ? input.startDate : null,
    endDate: input.endDate?.trim() ? input.endDate : null,
  });
  revalidateTripSurfaces();
  return { id: trip.id };
}

export async function endTripAction(tripId: string) {
  if (!tripId) throw new Error("Missing trip id");
  await endTrip(tripId);
  revalidateTripSurfaces();
}
```

- [ ] **Step 4: Route logEntry to the active trip**

In `logEntry`, the transaction is inserted via `addTransaction({ item_id, category_id, amount, note })` followed by two `revalidatePath` calls. Replace that tail of the function (from the `await addTransaction(...)` call through its two `revalidatePath` lines) with:
```typescript
  const activeTrip = await getActiveTrip();

  await addTransaction({
    item_id: itemId,
    category_id: categoryId,
    amount,
    note: name + (input.note?.trim() ? ` · ${input.note.trim()}` : ""),
    trip_id: activeTrip ? activeTrip.id : null,
  });

  if (activeTrip) {
    revalidatePath("/");
    revalidatePath("/vacation");
  } else {
    revalidatePath("/");
    revalidatePath("/dashboard");
  }
```

- [ ] **Step 5: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add "app/(app)/actions.ts"
git commit -m "Add plan delete/duplicate and trip start/end actions; route logEntry to active trip"
```

---

## Task 6: Plans hub (route + PlanCard + PlansHub)

**Files:**
- Create: `components/plan/PlanCard.tsx`
- Create: `components/plan/PlansHub.tsx`
- Rewrite: `app/(app)/plan/page.tsx` (was the editor; becomes the hub)

**Interfaces:**
- Consumes: `listPlans`, `getActivePlan` (`@/lib/queries/plans`); `getActiveTrip` (`@/lib/queries/trips`); `activatePlanAction`, `deletePlanAction`, `duplicatePlanAction` (`@/app/(app)/actions`); `formatINR`; `Plan`, `PlanWithAllowances`, `Trip` types; `useRouter`, `useTransition`.
- Produces: the `/plan` hub page.

- [ ] **Step 1: Implement components/plan/PlanCard.tsx**

Create `components/plan/PlanCard.tsx`:
```tsx
"use client";

import { formatINR } from "@/lib/utils/currency";
import type { Plan } from "@/lib/types";

export function PlanCard({
  plan,
  active,
  savings,
  pending,
  onOpen,
  onActivate,
  onDelete,
}: {
  plan: Plan;
  active: boolean;
  savings: number;
  pending: boolean;
  onOpen: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-2xl bg-panel p-4">
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="flex items-center justify-between">
          <span className="text-ink">{plan.name}</span>
          {active ? (
            <span className="flex items-center gap-1.5 text-xs text-pace-good">
              <span className="h-2 w-2 rounded-full bg-pace-good" /> ACTIVE
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-ink-dim tabular-nums">
          {formatINR(Number(plan.salary))} · saves {formatINR(savings)}
        </p>
      </button>

      {!active ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onActivate}
            disabled={pending}
            className="rounded-md bg-pace-good px-3 py-1.5 text-sm text-canvas disabled:opacity-60"
          >
            Make active
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            className="rounded-md border border-hairline px-3 py-1.5 text-sm text-ink-dim disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Implement components/plan/PlansHub.tsx**

Create `components/plan/PlansHub.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plane } from "lucide-react";
import { PlanCard } from "@/components/plan/PlanCard";
import {
  activatePlanAction,
  deletePlanAction,
  duplicatePlanAction,
} from "@/app/(app)/actions";
import type { Plan, PlanWithAllowances, Trip } from "@/lib/types";

function savingsOf(plan: Plan, allowancesTotal: number): number {
  return Number(plan.salary) - allowancesTotal - Number(plan.buffer);
}

export function PlansHub({
  plans,
  activePlan,
  allowanceTotals,
  activeTrip,
}: {
  plans: Plan[];
  activePlan: PlanWithAllowances | null;
  // plan id -> sum of its allowances (computed server-side)
  allowanceTotals: Record<string, number>;
  activeTrip: Trip | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<unknown>) {
    setError(null);
    start(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="pt-6">
      <p className="label-caps">Plans</p>

      <div className="mt-3 space-y-3">
        {plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            active={p.id === activePlan?.id}
            savings={savingsOf(p, allowanceTotals[p.id] ?? 0)}
            pending={pending}
            onOpen={() => router.push(`/plan/${p.id}`)}
            onActivate={() => run(() => activatePlanAction(p.id))}
            onDelete={() => {
              if (confirm(`Delete "${p.name}"?`)) run(() => deletePlanAction(p.id));
            }}
          />
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-pace-over">{error}</p> : null}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={() => router.push("/plan/new")}
          className="flex-1 rounded-md bg-pace-good py-3 font-medium text-canvas"
        >
          + New plan
        </button>
        <button
          type="button"
          disabled={pending || !activePlan}
          onClick={() =>
            activePlan &&
            run(async () => {
              const { id } = await duplicatePlanAction(activePlan.id);
              router.push(`/plan/${id}`);
            })
          }
          className="rounded-md border border-hairline px-4 py-3 text-ink disabled:opacity-60"
        >
          Duplicate
        </button>
      </div>

      <button
        type="button"
        onClick={() => router.push("/vacation")}
        className="mt-8 flex w-full items-center gap-3 rounded-2xl border border-hairline bg-panel p-4 text-left"
      >
        <Plane size={20} className="text-pace-good" />
        <span>
          <span className="block text-ink">
            {activeTrip ? "Trip in progress" : "Start a vacation"}
          </span>
          <span className="block text-sm text-ink-dim">
            {activeTrip ? activeTrip.name : "Track a trip separately"}
          </span>
        </span>
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite app/(app)/plan/page.tsx as the hub**

Replace the entire contents of `app/(app)/plan/page.tsx`:
```tsx
import { ensureDefaultPlan, getActivePlan, listPlans } from "@/lib/queries/plans";
import { getActiveTrip } from "@/lib/queries/trips";
import { getPlanById } from "@/lib/queries/plans";
import { PlansHub } from "@/components/plan/PlansHub";

// Plans hub: list every saved plan, mark/switch the active one, create / edit /
// delete / duplicate, and start a vacation.
export default async function PlanPage() {
  await ensureDefaultPlan();
  const [plans, activePlan, activeTrip] = await Promise.all([
    listPlans(),
    getActivePlan(),
    getActiveTrip(),
  ]);

  // Sum each plan's allowances for the "saves ₹X" line on its card.
  const allowanceTotals: Record<string, number> = {};
  for (const p of plans) {
    const full = await getPlanById(p.id);
    allowanceTotals[p.id] = (full?.allowances ?? []).reduce(
      (s, a) => s + Number(a.amount),
      0,
    );
  }

  return (
    <PlansHub
      plans={plans}
      activePlan={activePlan}
      allowanceTotals={allowanceTotals}
      activeTrip={activeTrip}
    />
  );
}
```

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: succeeds; `/plan` compiles. (Editor routes don't exist yet — that's Task 7; the hub links to them but the build doesn't require them.)

- [ ] **Step 5: Commit**

```bash
git add components/plan/PlanCard.tsx components/plan/PlansHub.tsx "app/(app)/plan/page.tsx"
git commit -m "Add Plans hub at /plan (list, activate, delete, duplicate, vacation entry)"
```

---

## Task 7: Plan editor refresh (routes + rewritten PlanEditor)

**Files:**
- Create: `app/(app)/plan/[id]/page.tsx`
- Create: `app/(app)/plan/new/page.tsx`
- Rewrite: `components/plan/PlanEditor.tsx`

**Interfaces:**
- Consumes: `getPlanById`, `listCategories`, `getCycleResetDay`; `savePlanAction`, `setCycleResetDayAction`, `createCategoryAction`; `formatINR`, `paceHue`; `Category`, `PlanWithAllowances` types; `useRouter`, `useMemo`, `useState`, `useTransition`.
- Produces: `PlanEditor` now takes `{ plan: PlanWithAllowances | null; categories: Category[]; resetDay: number }` (no `plans`/switcher — that's the hub's job), renders grouped sections + savings breakdown + remove-row + single Save, and on save navigates back to `/plan`.

- [ ] **Step 1: Rewrite components/plan/PlanEditor.tsx**

Replace the entire contents of `components/plan/PlanEditor.tsx`:
```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { formatINR } from "@/lib/utils/currency";
import { paceHue, dotPercent } from "@/lib/utils/paceHue";
import {
  savePlanAction,
  setCycleResetDayAction,
  createCategoryAction,
} from "@/app/(app)/actions";
import type { Category, PlanWithAllowances } from "@/lib/types";

type AllowanceState = Record<string, number>; // categoryId -> amount

export function PlanEditor({
  plan,
  categories,
  resetDay,
}: {
  plan: PlanWithAllowances | null;
  categories: Category[];
  resetDay: number;
}) {
  const router = useRouter();
  const isNew = !plan;

  const [name, setName] = useState(plan?.name ?? "Monthly plan");
  const [salary, setSalary] = useState(plan ? Number(plan.salary) : 0);
  const [buffer, setBuffer] = useState(plan ? Number(plan.buffer) : 0);
  const [day, setDay] = useState(resetDay);
  // Rows currently in this plan (id, name). Starts from the plan's allowances,
  // or all categories for a brand-new plan.
  const [rows, setRows] = useState<Array<{ id: string; name: string }>>(() => {
    if (plan) {
      return plan.allowances.map((a) => ({ id: a.category_id, name: a.category.name }));
    }
    return categories.map((c) => ({ id: c.id, name: c.name }));
  });
  const [allowances, setAllowances] = useState<AllowanceState>(() => {
    const init: AllowanceState = {};
    if (plan) for (const a of plan.allowances) init[a.category_id] = Number(a.amount);
    else for (const c of categories) init[c.id] = 0;
    return init;
  });
  const [newCategory, setNewCategory] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allocated = useMemo(
    () => rows.reduce((s, r) => s + (allowances[r.id] || 0), 0),
    [rows, allowances],
  );
  const savings = salary - allocated - buffer;
  const over = savings < 0;
  // Savings-fill ratio for the bar: 0 when nothing saved, ~1 at full salary.
  const fillRatio = salary > 0 ? Math.max(0, Math.min(1, savings / salary)) : 0;

  function setAmount(id: string, next: number) {
    setAllowances((prev) => ({ ...prev, [id]: next }));
  }
  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setAllowances((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }
  function addCategory() {
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    setError(null);
    start(async () => {
      try {
        const created = await createCategoryAction({ name: trimmed });
        setRows((prev) => [...prev, { id: created.id, name: created.name }]);
        setAllowances((prev) => ({ ...prev, [created.id]: 0 }));
        setNewCategory("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not add category");
      }
    });
  }
  function save() {
    setError(null);
    start(async () => {
      try {
        if (day !== resetDay) await setCycleResetDayAction(day);
        await savePlanAction({
          id: plan?.id ?? null,
          name,
          salary,
          buffer,
          makeActive: true,
          allowances: rows.map((r) => ({ categoryId: r.id, amount: allowances[r.id] ?? 0 })),
        });
        router.push("/plan");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  const inputCls =
    "bg-panel text-ink tabular-nums text-right rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-pace-good";

  return (
    <div className="pt-6">
      <button
        type="button"
        onClick={() => router.push("/plan")}
        className="text-sm text-ink-dim"
      >
        ‹ Plans
      </button>

      <p className="label-caps mt-3">{isNew ? "New plan" : "Edit plan"}</p>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        aria-label="Plan name"
        className="mt-1 w-full bg-panel text-ink rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
      />

      <p className="label-caps mt-8">Income</p>
      <label className="mt-2 flex items-center justify-between">
        <span className="text-ink">Monthly salary</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={salary === 0 ? "" : salary}
          placeholder="0"
          onChange={(e) => setSalary(Number(e.target.value) || 0)}
          aria-label="Monthly salary"
          className={`w-32 ${inputCls}`}
        />
      </label>
      <label className="mt-3 flex items-center justify-between">
        <span className="text-ink">Cycle resets on day</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          value={day}
          onChange={(e) => setDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
          aria-label="Cycle reset day of month"
          className={`w-20 ${inputCls}`}
        />
      </label>

      <p className="label-caps mt-8">Allowances</p>
      <div>
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 border-b border-hairline py-3"
          >
            <span className="min-w-0 flex-1 truncate text-ink">{r.name}</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={(allowances[r.id] ?? 0) === 0 ? "" : allowances[r.id]}
              placeholder="0"
              onChange={(e) => setAmount(r.id, Number(e.target.value) || 0)}
              aria-label={`Allowance for ${r.name}`}
              className={`w-28 ${inputCls}`}
            />
            <button
              type="button"
              onClick={() => removeRow(r.id)}
              aria-label={`Remove ${r.name}`}
              className="grid h-8 w-8 place-items-center rounded-full text-ink-dim hover:bg-surface-2"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addCategory();
            }
          }}
          placeholder="Add category"
          aria-label="New category name"
          className="flex-1 bg-panel text-ink rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
        />
        <button
          type="button"
          onClick={addCategory}
          disabled={pending || !newCategory.trim()}
          className="rounded-md border border-hairline px-4 py-2 text-ink disabled:opacity-50"
        >
          Add
        </button>
      </div>

      <label className="mt-6 flex items-center justify-between">
        <span className="text-ink">Buffer (optional)</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={buffer === 0 ? "" : buffer}
          placeholder="0"
          onChange={(e) => setBuffer(Number(e.target.value) || 0)}
          aria-label="Buffer"
          className={`w-32 ${inputCls}`}
        />
      </label>

      <p className="label-caps mt-8">Savings</p>
      <div className="mt-2 space-y-1 text-sm">
        <Row label="Salary" value={formatINR(salary)} />
        <Row label="− Allowances" value={formatINR(allocated)} />
        <Row label="− Buffer" value={formatINR(buffer)} />
      </div>
      <div className="mt-2 border-t border-hairline pt-3 flex items-center justify-between">
        <span className="text-ink">{over ? "You're over by" : "You'll save"}</span>
        <span
          className="tabular-nums text-2xl font-light"
          style={{ color: over ? paceHue(1.4) : "var(--color-pace-good)" }}
        >
          {formatINR(Math.abs(savings))}
        </span>
      </div>
      {/* Glide-style savings bar. */}
      <div className="glide-track mt-3" style={{ ["--pace-hue" as string]: over ? paceHue(1.4) : "var(--color-pace-good)" }}>
        <span
          className="glide-dot"
          style={{ left: `${over ? 8 : dotPercent(fillRatio * 2)}%` }}
          aria-hidden
        />
      </div>

      {error ? <p className="mt-3 text-sm" style={{ color: paceHue(1.4) }}>{error}</p> : null}

      <button
        onClick={save}
        disabled={pending}
        className="mt-6 w-full rounded-md bg-pace-good py-3 font-medium text-canvas disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save plan"}
      </button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-dim">{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Create the edit route app/(app)/plan/[id]/page.tsx**

Create `app/(app)/plan/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { getPlanById } from "@/lib/queries/plans";
import { getCycleResetDay } from "@/lib/queries/profile";
import { listCategories } from "@/lib/queries/categories";
import { PlanEditor } from "@/components/plan/PlanEditor";

// Edit an existing plan. In Next 16 dynamic route params are async.
export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [plan, categories, resetDay] = await Promise.all([
    getPlanById(id),
    listCategories(),
    getCycleResetDay(),
  ]);
  if (!plan) notFound();
  return <PlanEditor plan={plan} categories={categories} resetDay={resetDay} />;
}
```

- [ ] **Step 3: Create the new-plan route app/(app)/plan/new/page.tsx**

Create `app/(app)/plan/new/page.tsx`:
```tsx
import { getCycleResetDay } from "@/lib/queries/profile";
import { listCategories } from "@/lib/queries/categories";
import { PlanEditor } from "@/components/plan/PlanEditor";

// Create a brand-new plan (seeded with all categories at ₹0).
export default async function NewPlanPage() {
  const [categories, resetDay] = await Promise.all([
    listCategories(),
    getCycleResetDay(),
  ]);
  return <PlanEditor plan={null} categories={categories} resetDay={resetDay} />;
}
```

- [ ] **Step 4: Build + manual check**

Run: `npm run build`
Expected: succeeds; `/plan/[id]` and `/plan/new` compile. Then `npm run dev`: open `/plan`, tap a plan → editor shows grouped sections + the live `Salary − Allowances − Buffer = You'll save` breakdown; removing a row drops it; Save returns to the hub.

- [ ] **Step 5: Commit**

```bash
git add components/plan/PlanEditor.tsx "app/(app)/plan/[id]/page.tsx" "app/(app)/plan/new/page.tsx"
git commit -m "Refresh plan editor: grouped sections, savings breakdown, remove-row, single Save"
```

---

## Task 8: Vacation UI (StartTripSheet, TripView, /vacation route, Home branch)

**Files:**
- Create: `components/vacation/StartTripSheet.tsx`
- Create: `components/vacation/TripView.tsx`
- Create: `app/(app)/vacation/page.tsx`
- Modify: `app/(app)/page.tsx`

**Interfaces:**
- Consumes: `getActiveTripWithSpend`, `getActiveTrip` (`@/lib/queries/trips`); `startTripAction`, `endTripAction` (`@/app/(app)/actions`); `listItems`, `listCategories`; `HomeLogger`; `formatINR`, `formatDate`; `TripWithSpend` type; `Sheet`.
- Produces: `/vacation` route; Home renders `TripView` when a trip is active.

- [ ] **Step 1: Implement components/vacation/StartTripSheet.tsx**

Create `components/vacation/StartTripSheet.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { DateField } from "@/components/ui/DateField";
import { startTripAction } from "@/app/(app)/actions";

export function StartTripSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    if (!name.trim()) {
      setError("Name your trip");
      return;
    }
    setError(null);
    start(async () => {
      try {
        await startTripAction({ name, startDate, endDate });
        router.refresh();
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start trip");
      }
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title="Start a vacation">
      <div className="space-y-4 pb-2">
        <label className="block">
          <span className="label-caps">Trip name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Goa trip"
            aria-label="Trip name"
            className="mt-1.5 w-full rounded-xl bg-surface-2 px-4 py-3 text-ink outline-none focus:ring-2 focus:ring-pace-good/40"
          />
        </label>
        <div className="grid grid-cols-2 items-end gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="label-caps whitespace-nowrap">Starts (optional)</span>
            <DateField value={startDate} onChange={setStartDate} ariaLabel="Trip start date" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="label-caps whitespace-nowrap">Ends (optional)</span>
            <DateField value={endDate} onChange={setEndDate} placeholder="Open" ariaLabel="Trip end date" />
          </div>
        </div>
        {error ? <p className="text-sm text-pace-over">{error}</p> : null}
        <button
          onClick={go}
          disabled={pending}
          className="w-full rounded-xl bg-pace-good py-3 font-medium text-canvas disabled:opacity-60"
        >
          {pending ? "Starting…" : "Start trip"}
        </button>
      </div>
    </Sheet>
  );
}
```

- [ ] **Step 2: Implement components/vacation/TripView.tsx**

Create `components/vacation/TripView.tsx`:
```tsx
"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { HomeLogger } from "@/components/quick-log/HomeLogger";
import { endTripAction } from "@/app/(app)/actions";
import { formatINR } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import type { Category, ExpenseItem, TripWithSpend } from "@/lib/types";

export function TripView({
  trip,
  categories,
  recentItems,
}: {
  trip: TripWithSpend;
  categories: Category[];
  recentItems: ExpenseItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col pt-8">
      <p className="label-caps">
        {trip.name} · Day {trip.dayNumber}
      </p>
      <p className="mt-2 text-xs text-ink-dim">Trip total</p>
      <p className="font-display tabular-nums text-7xl font-light leading-none mt-1 text-ink">
        {formatINR(trip.total)}
      </p>
      {trip.start_date ? (
        <p className="mt-2 text-sm text-ink-dim">Started {formatDate(trip.start_date)}</p>
      ) : null}

      <HomeLogger categories={categories} recentItems={recentItems} />

      {trip.byCategory.length > 0 ? (
        <>
          <p className="label-caps mt-8">On this trip</p>
          <div className="mt-2 divide-y divide-hairline border-t border-hairline">
            {trip.byCategory.map((c) => (
              <div key={c.categoryId} className="flex items-center justify-between py-3">
                <span className="text-ink">{c.name}</span>
                <span className="tabular-nums text-ink">{formatINR(c.spent)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}

      <button
        onClick={() => {
          if (confirm("End this trip?")) {
            start(async () => {
              await endTripAction(trip.id);
              router.refresh();
            });
          }
        }}
        disabled={pending}
        className="mt-8 w-full rounded-md border border-hairline py-3 text-ink disabled:opacity-60"
      >
        {pending ? "Ending…" : "End trip"}
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Create app/(app)/vacation/page.tsx**

Create `app/(app)/vacation/page.tsx`:
```tsx
import { getActiveTripWithSpend } from "@/lib/queries/trips";
import { listItems } from "@/lib/queries/items";
import { listCategories } from "@/lib/queries/categories";
import { TripView } from "@/components/vacation/TripView";
import { StartTripGate } from "@/components/vacation/StartTripGate";

// /vacation: shows the active trip, or a prompt to start one.
export default async function VacationPage() {
  const [trip, items, categories] = await Promise.all([
    getActiveTripWithSpend(),
    listItems(),
    listCategories(),
  ]);

  if (!trip) return <StartTripGate />;

  return <TripView trip={trip} categories={categories} recentItems={items.slice(0, 6)} />;
}
```

- [ ] **Step 4: Add the no-trip gate component**

Create `components/vacation/StartTripGate.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Plane } from "lucide-react";
import { StartTripSheet } from "@/components/vacation/StartTripSheet";

// Shown at /vacation when no trip is active: a prompt + the start sheet.
export function StartTripGate() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pt-8">
      <p className="label-caps">Vacation</p>
      <p className="mt-2 text-ink-dim">
        Track a trip separately from your monthly budget. Trip spending won&apos;t touch your
        monthly pace.
      </p>
      <button
        onClick={() => setOpen(true)}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-pace-good py-3 font-medium text-canvas"
      >
        <Plane size={18} /> Start a vacation
      </button>
      <StartTripSheet open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
```
(Add this file to the Task's Files list — it is `components/vacation/StartTripGate.tsx`.)

- [ ] **Step 5: Branch Home to TripView when a trip is active**

In `app/(app)/page.tsx`, add an import:
```typescript
import { getActiveTripWithSpend } from "@/lib/queries/trips";
import { TripView } from "@/components/vacation/TripView";
```
Then in `HomePage`, after `await runMaterialize();`, fetch the active trip first and branch before the existing monthly render:
```typescript
  const activeTrip = await getActiveTripWithSpend();
  if (activeTrip) {
    const [items, categories] = await Promise.all([listItems(), listCategories()]);
    return (
      <TripView trip={activeTrip} categories={categories} recentItems={items.slice(0, 6)} />
    );
  }
```
Leave the rest of the existing monthly Home render unchanged below this branch.

- [ ] **Step 6: Build + manual check**

Run: `npm run build`
Expected: succeeds; `/vacation` compiles. `npm run dev`: from `/plan` tap "Start a vacation" → name it → Home and `/vacation` now show the trip total; logging via + adds to the trip and updates the total; "End trip" returns Home to monthly pace.

- [ ] **Step 7: Commit**

```bash
git add components/vacation/StartTripSheet.tsx components/vacation/TripView.tsx components/vacation/StartTripGate.tsx "app/(app)/vacation/page.tsx" "app/(app)/page.tsx"
git commit -m "Add vacation mode: start sheet, trip view, /vacation route, Home takeover"
```

---

## Task 9: Final verification sweep

**Files:** none (verification only).

- [ ] **Step 1: Full suite + checks**

Run: `npm test && npm run typecheck && npm run lint && npm run build`
Expected: 18/18 tests pass; typecheck clean; lint 0 errors; build compiles all routes.

- [ ] **Step 2: Confirm monthly math still excludes trips**

Run: `grep -n "trip_id" lib/queries/pace.ts lib/queries/insights.ts`
Expected: each file shows `.is("trip_id", null)` in its spend query.

- [ ] **Step 3: Manual smoke test (npm run dev)**

1. `/plan` hub lists plans; active one marked; "Make active" switches; "Duplicate" clones and opens editor; delete blocked on active plan, works on others.
2. `/plan/new` and `/plan/[id]` show grouped editor; savings breakdown updates live; remove-row works; Save returns to hub.
3. Start a vacation → Home shows trip total + breakdown; + logs to trip; monthly Dashboard/Reports unaffected by trip spend; End trip restores monthly Home.

- [ ] **Step 4: Final commit (if fixups needed)**

```bash
git add -A && git commit -m "Fixups from verification sweep" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Plans hub (list/active/create/edit/delete/duplicate/vacation entry) → Tasks 4,6. ✓
- Editor refresh (savings breakdown, single Save, grouped, remove-row) → Task 7. ✓
- Routing (`/plan` hub, `/plan/[id]`, `/plan/new`, `/vacation`) → Tasks 6,7,8. ✓
- Vacation: manual start/end, track-only, takes over Home, fully separate → Tasks 1,2,3,5,8. ✓
- Trip spend excluded from monthly math → Task 3. ✓
- Data model (trips, trip_id, one-active index, RLS) → Task 1. ✓
- logEntry routes to active trip → Task 5. ✓
- Timezone known-issue → explicitly out of scope (Global Constraints). ✓
- Reorder deferred → not built (out of scope). ✓

**Note on TDD scope:** consistent with the existing codebase — pure logic (`lib/pace`) is unit-tested and must stay green (Task 3 re-runs it); SQL/queries/RSC are verified by typecheck + build + lint + manual smoke (Task 9), matching how the prior plan-driven reframe was verified.
