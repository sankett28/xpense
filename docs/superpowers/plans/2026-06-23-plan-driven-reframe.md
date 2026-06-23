# X-pense Plan-Driven Reframe — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe X-pense from a spend-recorder into a plan-driven pacing instrument — the user authors a monthly budget plan (salary + per-category allowances), and every screen answers "am I on pace to end this cycle with money saved?" with a projection. Adopt a brand-new "Quiet Instrument" dark visual identity built around a signature Glide Path element.

**Architecture:** Build bottom-up. (1) A SQL migration adds `plans` + `plan_allowances` tables, a `cycle_reset_day` on `profiles`, and a `seed_default_plan` RPC. (2) A pure, fully-tested math module (`lib/pace/`) computes calendar cycles, pace, projection, safe-to-spend, and projected savings from plain inputs — zero Supabase. (3) Query modules wrap the math with data fetching. (4) New visual tokens replace `globals.css`; a `GlidePath` primitive and `paceHue` helper embody the signature. (5) Screens (Plan, Home, Dashboard, Reports) are rebuilt on top. Server Actions mirror the existing `actions.ts` patterns.

**Tech Stack:** Next.js 16 (App Router, RSC, Server Actions), React 19, Supabase (Postgres + RLS, `@supabase/ssr`), Tailwind CSS v4 (config-less, `@theme inline` in `globals.css`), `next/font/google`, lucide-react icons. **Vitest** is added as a dev dependency to unit-test the pure `lib/pace/` math only.

## Global Constraints

- **Next.js 16 conventions:** `cookies()` is async — `createClient()` is `async` and must be awaited. Read `node_modules/next/dist/docs/` before using unfamiliar Next APIs (per AGENTS.md).
- **Currency:** INR only. Always render amounts via `formatINR()` / `formatINRWithPaise()` from `lib/utils/currency.ts`. Never hand-format rupees.
- **Dates:** All ISO dates are `YYYY-MM-DD` in **local** time. Reuse `lib/utils/date.ts` helpers (`todayISO`, `toISODate`, `daysBetween`, `formatDate`, `formatDateRange`, `formatTime`). Never introduce UTC-based date math that could shift the day.
- **Amounts in DB:** `numeric(12,2)`. Read back with `Number(...)`.
- **Auth pattern:** queries call `const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("Not authenticated");` (or `return null` for read-optional). Server Actions delegate auth to the query functions; they do not fetch the user themselves.
- **Server Action pattern:** file starts with `"use server";`. Validate inputs with explicit `throw new Error("human message")`. After mutation, call the relevant `revalidatePath(...)`.
- **RLS:** every new table gets `enable row level security` + a `"own rows"` policy (`user_id = auth.uid()`).
- **Color = never the only signal:** pace state must always pair the hue with a text label and/or the dot position. WCAG AA contrast on all text.
- **Commits:** frequent, one per task minimum. Do NOT add `Co-Authored-By: Claude` or "Generated with Claude Code" lines (per user memory).
- **No new salary-credit anchoring:** the cycle is calendar-based off `profiles.cycle_reset_day` (default 25). The `budget_cycles` view and salary-anchored `lib/utils/cycle.ts` are retired for the new surfaces (kept only until Credits is demoted).
- **Decisions locked:** savings goal is **derived** (`salary − allowances − buffer`); reset day default **25**, picker 1–31, **clamped** to month length on short months; committed recurring costs reserved at **full cycle amount upfront**.

---

## File Structure

**Created:**
- `supabase/migrations/0005_plans.sql` — plans, plan_allowances, profiles.cycle_reset_day, seed_default_plan RPC, RLS.
- `lib/pace/cycle.ts` — pure calendar-cycle math (reset-day → `[start, end)`, day numbers).
- `lib/pace/pace.ts` — pure pace/projection/safe-to-spend/savings math.
- `lib/pace/insights.ts` — pure pattern + streak computation from transaction rows.
- `lib/pace/index.ts` — re-exports.
- `lib/pace/*.test.ts` — vitest unit tests for the above.
- `lib/queries/plans.ts` — fetch/save active plan + allowances.
- `lib/queries/pace.ts` — assemble inputs and call `lib/pace` for the current cycle.
- `lib/queries/insights.ts` — fetch transaction history and call `lib/pace/insights`.
- `lib/utils/paceHue.ts` — projection-ratio → interpolated accent color + verdict label.
- `components/ui/GlidePath.tsx` — the signature element (hero + row sizes).
- `components/ui/PaceHeadline.tsx` — projected-savings number + verdict label + GlidePath (shared by Home/Dashboard).
- `components/plan/PlanEditor.tsx` — client plan-authoring form.
- `components/plan/AllowanceRow.tsx` — one editable allowance row.
- `components/plan/PlanSwitcher.tsx` — switch active plan.
- `app/(app)/plan/page.tsx` — Plan screen.
- `vitest.config.ts` — test config scoped to `lib/`.

**Modified:**
- `app/globals.css` — replace tokens with Quiet Instrument palette + fonts + GlidePath utilities.
- `app/layout.tsx` — swap fonts to the new type pairing.
- `app/(app)/page.tsx` — Home reframed.
- `app/(app)/dashboard/page.tsx` — Dashboard reframed (per-category pace).
- `app/(app)/reports/page.tsx` — Reports reframed (progress + patterns + streaks).
- `app/(app)/actions.ts` — add `savePlan`, `setActivePlan`, `setCycleResetDay` actions.
- `components/ui/TopBar.tsx` — add "Plan" link near top; remove "Categories"; demote "Credits".
- `lib/types.ts` — add `Plan`, `PlanAllowance`, `CalendarCycle`, `PaceResult`, `CategoryPace`, `Insight` types.
- `package.json` — add `vitest` dev dep + `test` script.

**Removed:**
- `app/(app)/categories/page.tsx` — folded into Plan (delete in the navigation task).

---

## Task 1: Test runner + types

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Modify: `lib/types.ts` (append new types)

**Interfaces:**
- Produces: `Plan`, `PlanAllowance`, `CalendarCycle`, `PaceInputs`, `PaceResult`, `CategoryPace`, `Insight` TypeScript types; a working `npm test` command.

- [ ] **Step 1: Add vitest dev dependency and test script**

Run:
```bash
npm install -D vitest@^2
```
Then edit `package.json` scripts to add (keep existing scripts):
```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 2: Create vitest config scoped to lib/**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: { "@": new URL("./", import.meta.url).pathname.replace(/\/$/, "") },
  },
});
```

- [ ] **Step 3: Verify the runner works (no tests yet)**

Run: `npm test`
Expected: exits 0 with "No test files found" (acceptable) OR run after Task 2 adds the first test. If it errors on config, fix the config before proceeding.

- [ ] **Step 4: Append new domain types to lib/types.ts**

Append to `lib/types.ts`:
```typescript

// --- Plan-driven reframe ---

export interface Plan {
  id: string;
  user_id: string;
  name: string;
  salary: number;
  buffer: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanAllowance {
  id: string;
  plan_id: string;
  category_id: string;
  amount: number;
}

// A plan joined with its allowances and the categories they reference.
export interface PlanWithAllowances extends Plan {
  allowances: Array<PlanAllowance & { category: Category }>;
}

// Calendar cycle derived from a reset day. Half-open [start, end): `end` is the
// first day of the NEXT cycle. `daysInCycle` and `daysElapsed` drive pacing.
export interface CalendarCycle {
  start: string; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD exclusive (next cycle's start)
  daysInCycle: number; // total days in [start, end)
  daysElapsed: number; // 1-based: today counts as elapsed (clamped 1..daysInCycle)
  daysRemaining: number; // daysInCycle - daysElapsed, clamped >= 0
}

// Everything the pure pace math needs. No Supabase, no Date.now inside.
export interface PaceInputs {
  salary: number;
  buffer: number;
  committed: number; // full-cycle recurring total, reserved upfront
  spentSoFar: number; // discretionary spend so far this cycle
  cycle: CalendarCycle;
}

export type PaceVerdict = "under" | "on" | "over";

export interface PaceResult {
  spendable: number; // salary - savingsGoalDerived... see note; = salary - buffer - committed
  savingsGoal: number; // derived: salary - allocated(allowances) - buffer  (set by caller)
  expectedByToday: number; // spendable * daysElapsed / daysInCycle
  projectedSpend: number; // spentSoFar / daysElapsed * daysInCycle
  projectedSavings: number; // salary - projectedSpend - committed - buffer
  safeToSpendToday: number; // remaining discretionary / daysRemaining (>=0)
  verdict: PaceVerdict; // under/on/over vs expectedBytoday (with tolerance)
  paceRatio: number; // projectedSpend / spendable (1.0 = exactly on plan)
}

export interface CategoryPace {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  allowance: number;
  spent: number;
  projected: number; // spent / daysElapsed * daysInCycle
  verdict: PaceVerdict;
  paceRatio: number; // projected / allowance
}

export type InsightKind = "weekday" | "week-of-cycle" | "recurring-leak";

export interface Insight {
  kind: InsightKind;
  headline: string; // "You overspend most on weekends"
  detail: string; // "Sat–Sun avg ₹1,400/day vs ₹620 weekdays"
}
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS (no errors).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/types.ts
git commit -m "Add vitest and plan-driven domain types"
```

---

## Task 2: Pure calendar-cycle math

**Files:**
- Create: `lib/pace/cycle.ts`
- Test: `lib/pace/cycle.test.ts`

**Interfaces:**
- Consumes: `CalendarCycle` type from Task 1; `daysBetween` from `lib/utils/date.ts`.
- Produces: `resolveCalendarCycle(resetDay: number, today: string): CalendarCycle`.

**Behavior:** Given a reset day (1–31) and today (YYYY-MM-DD), find the cycle containing today. The cycle starts on the reset day of the current or previous month and ends the day before the next reset day. Reset day is **clamped** to each month's last day (e.g. 31 → Feb 28). `end` is exclusive (the next cycle's start).

- [ ] **Step 1: Write the failing tests**

Create `lib/pace/cycle.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { resolveCalendarCycle } from "./cycle";

describe("resolveCalendarCycle", () => {
  it("today after reset day: cycle starts this month", () => {
    const c = resolveCalendarCycle(25, "2026-06-27");
    expect(c.start).toBe("2026-06-25");
    expect(c.end).toBe("2026-07-25");
    expect(c.daysInCycle).toBe(30);
    expect(c.daysElapsed).toBe(3); // 25,26,27
    expect(c.daysRemaining).toBe(27);
  });

  it("today before reset day: cycle started last month", () => {
    const c = resolveCalendarCycle(25, "2026-06-10");
    expect(c.start).toBe("2026-05-25");
    expect(c.end).toBe("2026-06-25");
    expect(c.daysInCycle).toBe(31); // May 25 -> Jun 25
    expect(c.daysElapsed).toBe(17); // May25..Jun10
  });

  it("today exactly on reset day: that day is day 1", () => {
    const c = resolveCalendarCycle(25, "2026-06-25");
    expect(c.start).toBe("2026-06-25");
    expect(c.daysElapsed).toBe(1);
  });

  it("reset day clamps in short months (31 -> Feb 28)", () => {
    const c = resolveCalendarCycle(31, "2026-02-15");
    expect(c.start).toBe("2026-01-31");
    expect(c.end).toBe("2026-02-28"); // Feb clamps 31 -> 28
  });

  it("reset day 1 is a clean calendar month", () => {
    const c = resolveCalendarCycle(1, "2026-06-15");
    expect(c.start).toBe("2026-06-01");
    expect(c.end).toBe("2026-07-01");
    expect(c.daysInCycle).toBe(30);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- cycle`
Expected: FAIL — "resolveCalendarCycle is not a function" / module not found.

- [ ] **Step 3: Implement lib/pace/cycle.ts**

Create `lib/pace/cycle.ts`:
```typescript
// Pure calendar-cycle math. A cycle is anchored to a monthly reset day (1..31),
// clamped to the actual length of each month. Half-open [start, end): `end` is
// the first day of the NEXT cycle. No Supabase, no implicit "now" — `today` is
// always passed in so this is fully testable.

import type { CalendarCycle } from "@/lib/types";
import { daysBetween } from "@/lib/utils/date";

function lastDayOfMonth(year: number, monthIndex0: number): number {
  // monthIndex0: 0=Jan. Day 0 of next month = last day of this month.
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

// The reset date for a given year/month, clamped to that month's length.
function resetDateFor(year: number, monthIndex0: number, resetDay: number): string {
  const day = Math.min(resetDay, lastDayOfMonth(year, monthIndex0));
  const m = String(monthIndex0 + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

export function resolveCalendarCycle(resetDay: number, today: string): CalendarCycle {
  const [ty, tm, td] = today.split("-").map(Number);
  const year = ty;
  const monthIndex0 = (tm ?? 1) - 1;

  const thisMonthReset = resetDateFor(year, monthIndex0, resetDay);

  let start: string;
  let end: string;
  if (today >= thisMonthReset) {
    // Cycle started this month; ends at next month's reset.
    start = thisMonthReset;
    const next = new Date(year, monthIndex0 + 1, 1);
    end = resetDateFor(next.getFullYear(), next.getMonth(), resetDay);
  } else {
    // Cycle started last month; ends at this month's reset.
    const prev = new Date(year, monthIndex0 - 1, 1);
    start = resetDateFor(prev.getFullYear(), prev.getMonth(), resetDay);
    end = thisMonthReset;
  }

  const daysInCycle = daysBetween(start, end); // exclusive end => count of days
  const elapsedRaw = daysBetween(start, today) + 1; // today counts
  const daysElapsed = Math.min(Math.max(elapsedRaw, 1), daysInCycle);
  const daysRemaining = Math.max(daysInCycle - daysElapsed, 0);

  return { start, end, daysInCycle, daysElapsed, daysRemaining };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- cycle`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/pace/cycle.ts lib/pace/cycle.test.ts
git commit -m "Add pure calendar-cycle math with tests"
```

---

## Task 3: Pure pace / projection math

**Files:**
- Create: `lib/pace/pace.ts`
- Test: `lib/pace/pace.test.ts`

**Interfaces:**
- Consumes: `PaceInputs`, `PaceResult`, `CategoryPace`, `PaceVerdict`, `CalendarCycle` from Task 1.
- Produces:
  - `computePace(inputs: PaceInputs, allocated: number): PaceResult`
  - `computeCategoryPace(args: { categoryId: string; name: string; icon: string | null; color: string | null; allowance: number; spent: number; cycle: CalendarCycle }): CategoryPace`
  - `verdictFor(ratio: number): PaceVerdict` (under < 0.97, on 0.97–1.03, over > 1.03)

**Math (from spec):** `spendable = salary − buffer − committed`. `savingsGoal = salary − allocated − buffer` (allocated = sum of allowances). `expectedByToday = spendable × daysElapsed / daysInCycle`. `projectedSpend = spentSoFar / daysElapsed × daysInCycle`. `projectedSavings = salary − projectedSpend − committed − buffer`. `safeToSpendToday = max(0, (spendable − spentSoFar) / daysRemaining)` (if daysRemaining is 0, use 1 to avoid divide-by-zero). `paceRatio = projectedSpend / spendable` (0 if spendable ≤ 0).

- [ ] **Step 1: Write the failing tests**

Create `lib/pace/pace.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { computePace, computeCategoryPace, verdictFor } from "./pace";
import type { CalendarCycle } from "@/lib/types";

const cycle: CalendarCycle = {
  start: "2026-06-25",
  end: "2026-07-25",
  daysInCycle: 30,
  daysElapsed: 10,
  daysRemaining: 20,
};

describe("verdictFor", () => {
  it("classifies under/on/over with tolerance", () => {
    expect(verdictFor(0.5)).toBe("under");
    expect(verdictFor(1.0)).toBe("on");
    expect(verdictFor(1.02)).toBe("on");
    expect(verdictFor(1.2)).toBe("over");
  });
});

describe("computePace", () => {
  it("derives spendable, savings goal, projection, and verdict", () => {
    // salary 60000, buffer 4000, committed 6000 -> spendable 50000
    // allocated 11000 -> savingsGoal = 60000 - 11000 - 4000 = 45000
    // spentSoFar 10000 over 10 days -> projectedSpend 30000
    // projectedSavings = 60000 - 30000 - 6000 - 4000 = 20000
    const r = computePace(
      { salary: 60000, buffer: 4000, committed: 6000, spentSoFar: 10000, cycle },
      11000,
    );
    expect(r.spendable).toBe(50000);
    expect(r.savingsGoal).toBe(45000);
    expect(r.projectedSpend).toBe(30000);
    expect(r.projectedSavings).toBe(20000);
    expect(r.expectedByToday).toBeCloseTo(50000 * 10 / 30, 2);
    expect(r.safeToSpendToday).toBeCloseTo((50000 - 10000) / 20, 2);
    expect(r.paceRatio).toBeCloseTo(30000 / 50000, 4); // 0.6 -> under
    expect(r.verdict).toBe("under");
  });

  it("flags over when projected spend exceeds spendable", () => {
    // spentSoFar 25000 in 10 days -> projected 75000 > spendable 50000
    const r = computePace(
      { salary: 60000, buffer: 4000, committed: 6000, spentSoFar: 25000, cycle },
      11000,
    );
    expect(r.verdict).toBe("over");
    expect(r.projectedSavings).toBeLessThan(r.savingsGoal);
  });

  it("never returns negative safe-to-spend", () => {
    const r = computePace(
      { salary: 60000, buffer: 4000, committed: 6000, spentSoFar: 49000, cycle },
      11000,
    );
    expect(r.safeToSpendToday).toBeGreaterThanOrEqual(0);
  });
});

describe("computeCategoryPace", () => {
  it("projects a category and classifies it", () => {
    const c = computeCategoryPace({
      categoryId: "x", name: "Petrol", icon: null, color: "pace",
      allowance: 4000, spent: 3800, cycle,
    });
    expect(c.projected).toBeCloseTo(3800 / 10 * 30, 2); // 11400
    expect(c.paceRatio).toBeCloseTo(11400 / 4000, 4);
    expect(c.verdict).toBe("over");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- pace`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Implement lib/pace/pace.ts**

Create `lib/pace/pace.ts`:
```typescript
// Pure pace/projection math. No Supabase, no implicit time. All amounts are
// rupees as numbers. See docs/superpowers/specs/2026-06-23-plan-driven-reframe-design.md.

import type {
  CalendarCycle,
  CategoryPace,
  PaceInputs,
  PaceResult,
  PaceVerdict,
} from "@/lib/types";

// A small tolerance band so "basically on plan" doesn't read as off-pace.
export function verdictFor(ratio: number): PaceVerdict {
  if (ratio > 1.03) return "over";
  if (ratio < 0.97) return "under";
  return "on";
}

function project(spentSoFar: number, cycle: CalendarCycle): number {
  if (cycle.daysElapsed <= 0) return 0;
  return (spentSoFar / cycle.daysElapsed) * cycle.daysInCycle;
}

export function computePace(inputs: PaceInputs, allocated: number): PaceResult {
  const { salary, buffer, committed, spentSoFar, cycle } = inputs;

  const spendable = salary - buffer - committed;
  const savingsGoal = salary - allocated - buffer;
  const expectedByToday =
    cycle.daysInCycle > 0 ? (spendable * cycle.daysElapsed) / cycle.daysInCycle : 0;
  const projectedSpend = project(spentSoFar, cycle);
  const projectedSavings = salary - projectedSpend - committed - buffer;

  const remainingDiscretionary = spendable - spentSoFar;
  const denomDays = cycle.daysRemaining > 0 ? cycle.daysRemaining : 1;
  const safeToSpendToday = Math.max(0, remainingDiscretionary / denomDays);

  const paceRatio = spendable > 0 ? projectedSpend / spendable : 0;

  return {
    spendable,
    savingsGoal,
    expectedByToday,
    projectedSpend,
    projectedSavings,
    safeToSpendToday,
    verdict: verdictFor(paceRatio),
    paceRatio,
  };
}

export function computeCategoryPace(args: {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  allowance: number;
  spent: number;
  cycle: CalendarCycle;
}): CategoryPace {
  const projected = project(args.spent, args.cycle);
  const paceRatio = args.allowance > 0 ? projected / args.allowance : 0;
  return {
    categoryId: args.categoryId,
    name: args.name,
    icon: args.icon,
    color: args.color,
    allowance: args.allowance,
    spent: args.spent,
    projected,
    verdict: verdictFor(paceRatio),
    paceRatio,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- pace`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/pace/pace.ts lib/pace/pace.test.ts
git commit -m "Add pure pace and projection math with tests"
```

---

## Task 4: Pure insights (patterns + streaks)

**Files:**
- Create: `lib/pace/insights.ts`
- Create: `lib/pace/index.ts`
- Test: `lib/pace/insights.test.ts`

**Interfaces:**
- Consumes: `Insight` from Task 1.
- Produces:
  - `computeInsights(rows: Array<{ amount: number; spent_at: string; cycle_start: string }>, opts?: { minRows?: number }): Insight[]`
  - `computeStreak(cycleSavings: Array<{ savings: number; goal: number }>): number` — consecutive most-recent cycles where savings >= goal.
  - `lib/pace/index.ts` re-exports cycle, pace, insights.

**Behavior:** Patterns only emit when there's enough data (default `minRows` = 15). Weekday pattern: compare avg daily spend on Sat/Sun vs Mon–Fri; emit only if weekend avg is ≥ 25% higher. Week-of-cycle: % of spend in days 1–7 of the cycle; emit if ≥ 35%. Return at most 3, highest-signal first.

- [ ] **Step 1: Write the failing tests**

Create `lib/pace/insights.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { computeInsights, computeStreak } from "./insights";

describe("computeStreak", () => {
  it("counts consecutive recent on-goal cycles", () => {
    // most recent first
    expect(
      computeStreak([
        { savings: 5000, goal: 4000 },
        { savings: 4200, goal: 4000 },
        { savings: 3000, goal: 4000 }, // breaks
        { savings: 9000, goal: 4000 },
      ]),
    ).toBe(2);
  });
  it("returns 0 when latest cycle missed goal", () => {
    expect(computeStreak([{ savings: 100, goal: 4000 }])).toBe(0);
  });
});

describe("computeInsights", () => {
  it("returns nothing below the data threshold", () => {
    expect(computeInsights([{ amount: 100, spent_at: "2026-06-25T10:00:00Z", cycle_start: "2026-06-25" }])).toEqual([]);
  });

  it("detects a weekend-heavy pattern", () => {
    const rows: Array<{ amount: number; spent_at: string; cycle_start: string }> = [];
    // 4 weekend days at 1400, 10 weekday days at 200 -> weekend much higher
    const weekend = ["2026-06-27", "2026-06-28", "2026-07-04", "2026-07-05"]; // Sat/Sun
    const weekday = ["2026-06-25","2026-06-26","2026-06-29","2026-06-30","2026-07-01","2026-07-02","2026-07-03","2026-07-06","2026-07-07","2026-07-08"];
    for (const d of weekend) rows.push({ amount: 1400, spent_at: `${d}T10:00:00`, cycle_start: "2026-06-25" });
    for (const d of weekday) rows.push({ amount: 200, spent_at: `${d}T10:00:00`, cycle_start: "2026-06-25" });
    const insights = computeInsights(rows);
    expect(insights.some((i) => i.kind === "weekday")).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- insights`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Implement lib/pace/insights.ts and index.ts**

Create `lib/pace/insights.ts`:
```typescript
// Pure insight computation: simple, explainable aggregations only (no ML).
// Patterns only emit with enough data so we never fabricate early insights.

import type { Insight } from "@/lib/types";
import { daysBetween, formatINRish } from "./_fmt";

interface Row {
  amount: number;
  spent_at: string; // timestamp
  cycle_start: string; // YYYY-MM-DD of the row's cycle
}

function dayOfWeek(ts: string): number {
  // 0=Sun..6=Sat, local.
  return new Date(ts).getDay();
}

export function computeInsights(rows: Row[], opts?: { minRows?: number }): Insight[] {
  const minRows = opts?.minRows ?? 15;
  if (rows.length < minRows) return [];

  const insights: Insight[] = [];

  // --- Weekday pattern: weekend (Sat/Sun) daily avg vs weekday daily avg ---
  const weekendDays = new Set<string>();
  const weekdayDays = new Set<string>();
  let weekendTotal = 0;
  let weekdayTotal = 0;
  for (const r of rows) {
    const dow = dayOfWeek(r.spent_at);
    const dayKey = r.spent_at.slice(0, 10);
    if (dow === 0 || dow === 6) {
      weekendDays.add(dayKey);
      weekendTotal += r.amount;
    } else {
      weekdayDays.add(dayKey);
      weekdayTotal += r.amount;
    }
  }
  const weekendAvg = weekendDays.size ? weekendTotal / weekendDays.size : 0;
  const weekdayAvg = weekdayDays.size ? weekdayTotal / weekdayDays.size : 0;
  if (weekendAvg >= weekdayAvg * 1.25 && weekendDays.size >= 2) {
    insights.push({
      kind: "weekday",
      headline: "You overspend most on weekends",
      detail: `Sat–Sun avg ${formatINRish(weekendAvg)}/day vs ${formatINRish(weekdayAvg)} on weekdays`,
    });
  }

  // --- Week-of-cycle pattern: share of spend in days 1–7 ---
  let firstWeekTotal = 0;
  let total = 0;
  for (const r of rows) {
    total += r.amount;
    const dayIndex = daysBetween(r.cycle_start, r.spent_at.slice(0, 10)); // 0-based
    if (dayIndex >= 0 && dayIndex < 7) firstWeekTotal += r.amount;
  }
  const share = total > 0 ? firstWeekTotal / total : 0;
  if (share >= 0.35) {
    insights.push({
      kind: "week-of-cycle",
      headline: "Week 1 is your heavy week",
      detail: `${Math.round(share * 100)}% of spend lands in days 1–7`,
    });
  }

  return insights.slice(0, 3);
}

// Consecutive most-recent cycles (input ordered newest-first) where savings met goal.
export function computeStreak(
  cycleSavings: Array<{ savings: number; goal: number }>,
): number {
  let streak = 0;
  for (const c of cycleSavings) {
    if (c.savings >= c.goal) streak += 1;
    else break;
  }
  return streak;
}
```

Create `lib/pace/_fmt.ts` (tiny shared helpers so insights stays pure/testable):
```typescript
// Minimal helpers local to lib/pace so the math stays dependency-light and
// testable. daysBetween mirrors lib/utils/date but avoids importing UI code.

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ua = Date.UTC(ay, (am ?? 1) - 1, ad ?? 1);
  const ub = Date.UTC(by, (bm ?? 1) - 1, bd ?? 1);
  return Math.round((ub - ua) / 86400000);
}

// Compact rupee string for insight sentences ("₹1,400"). Whole rupees.
export function formatINRish(amount: number): string {
  return "₹" + Math.round(amount).toLocaleString("en-IN");
}
```

Create `lib/pace/index.ts`:
```typescript
export * from "./cycle";
export * from "./pace";
export * from "./insights";
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all pace tests green).

- [ ] **Step 5: Commit**

```bash
git add lib/pace/insights.ts lib/pace/_fmt.ts lib/pace/index.ts lib/pace/insights.test.ts
git commit -m "Add pure insights and streak math with tests"
```

---

## Task 5: Database migration (plans, allowances, reset day, seed RPC)

**Files:**
- Create: `supabase/migrations/0005_plans.sql`

**Interfaces:**
- Produces: tables `plans`, `plan_allowances`; column `profiles.cycle_reset_day`; RPC `seed_default_plan(p_user_id uuid)`; RLS policies.

This task has no automated test (SQL/DB). Verification is by review + applying the migration. Follow the exact conventions from `0001_init.sql`, `0002_rls.sql`, `0003_seed_fn.sql`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_plans.sql`:
```sql
-- 0005_plans.sql
-- Plan-driven reframe: a user authors budget plans (salary + per-category
-- allowances). Exactly one plan is active. The active plan's allowances are the
-- source of truth for category budgets (replacing categories.monthly_budget).
-- Cycles become calendar-based off profiles.cycle_reset_day.

-- Calendar cycle reset day (1..31, clamped to month length by the app). 25 is
-- the common payday default.
alter table profiles
  add column cycle_reset_day int not null default 25
  check (cycle_reset_day between 1 and 31);

create table plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  salary     numeric(12,2) not null default 0,
  buffer     numeric(12,2) not null default 0,
  is_active  boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table plan_allowances (
  id          uuid primary key default gen_random_uuid(),
  plan_id     uuid not null references plans(id) on delete cascade,
  category_id uuid not null references categories(id) on delete cascade,
  amount      numeric(12,2) not null default 0,
  unique (plan_id, category_id)
);

create index on plans (user_id, is_active);
create index on plan_allowances (plan_id);

-- At most one active plan per user. Partial unique index enforces it.
create unique index plans_one_active_per_user
  on plans (user_id) where is_active;

alter table plans enable row level security;
create policy "own rows" on plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- plan_allowances has no user_id; ownership is via the parent plan.
alter table plan_allowances enable row level security;
create policy "own via plan" on plan_allowances
  for all
  using (exists (select 1 from plans p where p.id = plan_id and p.user_id = auth.uid()))
  with check (exists (select 1 from plans p where p.id = plan_id and p.user_id = auth.uid()));

-- seed_default_plan: idempotent. If the user has no plan yet, create one named
-- "Monthly plan", active, seeding allowances from their existing categories'
-- monthly_budget (coalesced to 0). Salary defaults to 0 for the user to fill in.
create or replace function seed_default_plan(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan_id uuid;
begin
  if exists (select 1 from plans where user_id = p_user_id) then
    return;
  end if;

  insert into plans (user_id, name, salary, buffer, is_active)
  values (p_user_id, 'Monthly plan', 0, 0, true)
  returning id into v_plan_id;

  insert into plan_allowances (plan_id, category_id, amount)
  select v_plan_id, c.id, coalesce(c.monthly_budget, 0)
  from categories c
  where c.user_id = p_user_id and c.is_archived = false;
end;
$$;

grant execute on function seed_default_plan(uuid) to authenticated;
```

- [ ] **Step 2: Apply the migration**

Run (whichever the project uses; CLI shown):
```bash
supabase db push
```
If no CLI link is configured, paste the SQL into the Supabase SQL editor. Expected: success, no errors.

- [ ] **Step 3: Verify schema**

Run a quick check in the SQL editor or `psql`:
```sql
select column_name from information_schema.columns where table_name = 'profiles' and column_name = 'cycle_reset_day';
select tablename from pg_tables where tablename in ('plans','plan_allowances');
```
Expected: `cycle_reset_day` present; both tables listed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_plans.sql
git commit -m "Add plans, allowances, cycle_reset_day migration"
```

---

## Task 6: Plan + reset-day queries

**Files:**
- Create: `lib/queries/plans.ts`
- Modify: `lib/queries/profile.ts` (add `getCycleResetDay`, `setCycleResetDay`)

**Interfaces:**
- Consumes: `Plan`, `PlanWithAllowances`, `Category` types; `createClient`.
- Produces:
  - `getActivePlan(): Promise<PlanWithAllowances | null>`
  - `listPlans(): Promise<Plan[]>`
  - `savePlan(input: SavePlanInput): Promise<PlanWithAllowances>` (upsert plan + replace allowances)
  - `activatePlan(planId: string): Promise<void>`
  - `ensureDefaultPlan(): Promise<void>` (calls `seed_default_plan` RPC)
  - `getCycleResetDay(): Promise<number>` and `setCycleResetDayValue(day: number): Promise<void>`
  - `SavePlanInput` type.

- [ ] **Step 1: Implement lib/queries/plans.ts**

Create `lib/queries/plans.ts`:
```typescript
import { createClient } from "@/lib/supabase/server";
import type { Category, Plan, PlanWithAllowances } from "@/lib/types";

export interface SavePlanInput {
  id?: string | null; // present = update; absent = create new
  name: string;
  salary: number;
  buffer: number;
  makeActive?: boolean;
  allowances: Array<{ categoryId: string; amount: number }>;
}

async function userIdOrThrow() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, userId: user.id };
}

// Idempotent: ensures the user has at least one (active) plan.
export async function ensureDefaultPlan(): Promise<void> {
  const { supabase, userId } = await userIdOrThrow();
  const { error } = await supabase.rpc("seed_default_plan", { p_user_id: userId });
  if (error) throw error;
}

export async function listPlans(): Promise<Plan[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Plan[];
}

export async function getActivePlan(): Promise<PlanWithAllowances | null> {
  const supabase = await createClient();
  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  if (!plan) return null;

  const { data: rows, error: aErr } = await supabase
    .from("plan_allowances")
    .select("*, category:categories(*)")
    .eq("plan_id", (plan as Plan).id);
  if (aErr) throw aErr;

  return {
    ...(plan as Plan),
    allowances: (rows ?? []) as PlanWithAllowances["allowances"],
  };
}

export async function activatePlan(planId: string): Promise<void> {
  const { supabase, userId } = await userIdOrThrow();
  // Deactivate all, then activate the chosen one (partial unique index allows
  // a transient all-false state between statements within one request).
  const { error: offErr } = await supabase
    .from("plans")
    .update({ is_active: false })
    .eq("user_id", userId);
  if (offErr) throw offErr;
  const { error: onErr } = await supabase
    .from("plans")
    .update({ is_active: true })
    .eq("id", planId);
  if (onErr) throw onErr;
}

export async function savePlan(input: SavePlanInput): Promise<PlanWithAllowances> {
  const { supabase, userId } = await userIdOrThrow();

  let planId = input.id ?? null;
  if (planId) {
    const { error } = await supabase
      .from("plans")
      .update({ name: input.name, salary: input.salary, buffer: input.buffer, updated_at: new Date().toISOString() })
      .eq("id", planId);
    if (error) throw error;
  } else {
    const { data, error } = await supabase
      .from("plans")
      .insert({ user_id: userId, name: input.name, salary: input.salary, buffer: input.buffer, is_active: false })
      .select("id")
      .single();
    if (error) throw error;
    planId = (data as { id: string }).id;
  }

  // Replace allowances wholesale (simple + correct for an authored document).
  const { error: delErr } = await supabase.from("plan_allowances").delete().eq("plan_id", planId);
  if (delErr) throw delErr;
  if (input.allowances.length) {
    const { error: insErr } = await supabase.from("plan_allowances").insert(
      input.allowances.map((a) => ({ plan_id: planId, category_id: a.categoryId, amount: a.amount })),
    );
    if (insErr) throw insErr;
  }

  if (input.makeActive) await activatePlan(planId);

  const active = await getActivePlanById(planId);
  return active;
}

async function getActivePlanById(planId: string): Promise<PlanWithAllowances> {
  const supabase = await createClient();
  const { data: plan, error } = await supabase.from("plans").select("*").eq("id", planId).single();
  if (error) throw error;
  const { data: rows, error: aErr } = await supabase
    .from("plan_allowances")
    .select("*, category:categories(*)")
    .eq("plan_id", planId);
  if (aErr) throw aErr;
  return { ...(plan as Plan), allowances: (rows ?? []) as PlanWithAllowances["allowances"] };
}
```

- [ ] **Step 2: Add reset-day helpers to lib/queries/profile.ts**

Append to `lib/queries/profile.ts`:
```typescript

// The user's calendar cycle reset day (1..31). Defaults to 25 if unset.
export async function getCycleResetDay(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 25;
  const { data } = await supabase
    .from("profiles")
    .select("cycle_reset_day")
    .eq("id", user.id)
    .maybeSingle();
  const day = (data as { cycle_reset_day: number | null } | null)?.cycle_reset_day;
  return day ?? 25;
}

export async function setCycleResetDayValue(day: number): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const clamped = Math.min(31, Math.max(1, Math.round(day)));
  const { error } = await supabase
    .from("profiles")
    .update({ cycle_reset_day: clamped })
    .eq("id", user.id);
  if (error) throw error;
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/plans.ts lib/queries/profile.ts
git commit -m "Add plan and cycle-reset-day queries"
```

---

## Task 7: Pace + insights data queries

**Files:**
- Create: `lib/queries/pace.ts`
- Create: `lib/queries/insights.ts`

**Interfaces:**
- Consumes: `getActivePlan`, `getCycleResetDay`, `resolveCalendarCycle`, `computePace`, `computeCategoryPace`, `computeInsights`, `computeStreak`; `createClient`; `todayISO`.
- Produces:
  - `getCyclePace(): Promise<{ cycle: CalendarCycle; pace: PaceResult; categories: CategoryPace[]; spentToday: number; plan: PlanWithAllowances | null } | null>`
  - `getInsights(): Promise<{ insights: Insight[]; streak: number; savedThisCycle: number; savedLastCycle: number | null }>`

**Spend semantics:** discretionary `spentSoFar` = sum of transactions in `[cycle.start, cycle.end)` whose `recurring_id IS NULL`. `committed` = sum of the active recurring expenses' full monthly `amount` (reserved upfront). Per-category `spent` includes all transactions (recurring + discretionary) for that category in the cycle.

- [ ] **Step 1: Implement lib/queries/pace.ts**

Create `lib/queries/pace.ts`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { getActivePlan } from "@/lib/queries/plans";
import { getCycleResetDay } from "@/lib/queries/profile";
import { resolveCalendarCycle, computePace, computeCategoryPace } from "@/lib/pace";
import { todayISO } from "@/lib/utils/date";
import type { CalendarCycle, CategoryPace, PaceResult, PlanWithAllowances } from "@/lib/types";

export interface CyclePace {
  cycle: CalendarCycle;
  pace: PaceResult;
  categories: CategoryPace[];
  spentToday: number;
  spentSoFar: number;
  committed: number;
  plan: PlanWithAllowances | null;
}

export async function getCyclePace(): Promise<CyclePace | null> {
  const plan = await getActivePlan();
  const resetDay = await getCycleResetDay();
  const today = todayISO();
  const cycle = resolveCalendarCycle(resetDay, today);

  const supabase = await createClient();

  // Discretionary spend (recurring_id is null) within the cycle.
  const { data: discRows, error: dErr } = await supabase
    .from("transactions")
    .select("amount, category_id, spent_at")
    .is("recurring_id", null)
    .gte("spent_at", cycle.start)
    .lt("spent_at", cycle.end);
  if (dErr) throw dErr;

  // All spend (for per-category totals).
  const { data: allRows, error: aErr } = await supabase
    .from("transactions")
    .select("amount, category_id")
    .gte("spent_at", cycle.start)
    .lt("spent_at", cycle.end);
  if (aErr) throw aErr;

  // Committed: full monthly amount of active recurring expenses (reserved upfront).
  const { data: recRows, error: rErr } = await supabase
    .from("recurring_expenses")
    .select("amount")
    .eq("is_active", true);
  if (rErr) throw rErr;

  const spentSoFar = (discRows ?? []).reduce((s, r) => s + Number((r as { amount: number }).amount), 0);
  const committed = (recRows ?? []).reduce((s, r) => s + Number((r as { amount: number }).amount), 0);

  const today10 = today;
  const spentToday = (discRows ?? [])
    .filter((r) => String((r as { spent_at: string }).spent_at).slice(0, 10) === today10)
    .reduce((s, r) => s + Number((r as { amount: number }).amount), 0);

  const perCat: Record<string, number> = {};
  for (const r of allRows ?? []) {
    const id = (r as { category_id: string }).category_id;
    perCat[id] = (perCat[id] ?? 0) + Number((r as { amount: number }).amount);
  }

  const salary = plan ? Number(plan.salary) : 0;
  const buffer = plan ? Number(plan.buffer) : 0;
  const allocated = plan ? plan.allowances.reduce((s, a) => s + Number(a.amount), 0) : 0;

  const pace = computePace({ salary, buffer, committed, spentSoFar, cycle }, allocated);

  const categories: CategoryPace[] = plan
    ? plan.allowances.map((a) =>
        computeCategoryPace({
          categoryId: a.category_id,
          name: a.category.name,
          icon: a.category.icon,
          color: a.category.color,
          allowance: Number(a.amount),
          spent: perCat[a.category_id] ?? 0,
          cycle,
        }),
      )
    : [];

  // Categories trending over float to the top (highest paceRatio first).
  categories.sort((x, y) => y.paceRatio - x.paceRatio);

  return { cycle, pace, categories, spentToday, spentSoFar, committed, plan };
}
```

- [ ] **Step 2: Implement lib/queries/insights.ts**

Create `lib/queries/insights.ts`:
```typescript
import { createClient } from "@/lib/supabase/server";
import { getActivePlan } from "@/lib/queries/plans";
import { getCycleResetDay } from "@/lib/queries/profile";
import { resolveCalendarCycle, computeInsights } from "@/lib/pace";
import { todayISO, toISODate } from "@/lib/utils/date";
import type { Insight, CalendarCycle } from "@/lib/types";

export interface InsightsResult {
  insights: Insight[];
  savedThisCycle: number;
  savedLastCycle: number | null;
  streak: number;
}

// Compute the previous cycle's [start,end) by walking the reset day back one step.
function previousCycle(resetDay: number, current: CalendarCycle): CalendarCycle {
  const dayBeforeStart = new Date(current.start);
  dayBeforeStart.setDate(dayBeforeStart.getDate() - 1);
  return resolveCalendarCycle(resetDay, toISODate(dayBeforeStart));
}

export async function getInsights(): Promise<InsightsResult> {
  const plan = await getActivePlan();
  const resetDay = await getCycleResetDay();
  const cycle = resolveCalendarCycle(resetDay, todayISO());
  const prev = previousCycle(resetDay, cycle);

  const supabase = await createClient();

  // Pull recent transactions (this + previous cycle window) for patterns.
  const { data: rows, error } = await supabase
    .from("transactions")
    .select("amount, spent_at, recurring_id")
    .gte("spent_at", prev.start)
    .lt("spent_at", cycle.end);
  if (error) throw error;

  const salary = plan ? Number(plan.salary) : 0;
  const buffer = plan ? Number(plan.buffer) : 0;
  const allocated = plan ? plan.allowances.reduce((s, a) => s + Number(a.amount), 0) : 0;
  const goal = salary - allocated - buffer;

  const inWindow = (start: string, end: string) =>
    (rows ?? []).filter((r) => {
      const d = String((r as { spent_at: string }).spent_at).slice(0, 10);
      return d >= start && d < end;
    });

  const sumDiscretionary = (list: typeof rows) =>
    (list ?? [])
      .filter((r) => (r as { recurring_id: string | null }).recurring_id == null)
      .reduce((s, r) => s + Number((r as { amount: number }).amount), 0);

  const thisSpend = (inWindow(cycle.start, cycle.end) ?? []).reduce(
    (s, r) => s + Number((r as { amount: number }).amount), 0);
  const prevSpend = (inWindow(prev.start, prev.end) ?? []).reduce(
    (s, r) => s + Number((r as { amount: number }).amount), 0);

  const savedThisCycle = salary - thisSpend; // simple saved = income - spend
  const savedLastCycle = plan ? salary - prevSpend : null;

  // Patterns over the current cycle's rows, tagged with cycle_start.
  const patternRows = (inWindow(cycle.start, cycle.end) ?? []).map((r) => ({
    amount: Number((r as { amount: number }).amount),
    spent_at: String((r as { spent_at: string }).spent_at),
    cycle_start: cycle.start,
  }));
  const insights = computeInsights(patternRows);

  // Streak: only this + previous available here -> compute from the two we have.
  const streakInput = [
    { savings: savedThisCycle, goal },
    ...(savedLastCycle != null ? [{ savings: savedLastCycle, goal }] : []),
  ];
  let streak = 0;
  for (const c of streakInput) { if (c.savings >= c.goal) streak += 1; else break; }

  // Avoid unused-var lint on sumDiscretionary if not needed; reference it.
  void sumDiscretionary;

  return { insights, savedThisCycle, savedLastCycle, streak };
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add lib/queries/pace.ts lib/queries/insights.ts
git commit -m "Add pace and insights data queries"
```

---

## Task 8: Quiet Instrument visual tokens + fonts

**Files:**
- Modify: `app/globals.css` (replace the `:root` token block + `@theme inline`, keep/extend utilities)
- Modify: `app/layout.tsx` (font pairing)

**Interfaces:**
- Produces: CSS tokens `--color-canvas`, `--color-panel`, `--color-hairline`, `--color-ink`, `--color-ink-dim`, `--color-pace-good`, `--color-pace-warn`, `--color-pace-over`; utility classes `.label-caps`, `.glide-track`, `.glide-dot`, `.glide-tick`; reduced-motion guard.

This is a visual task; verification = `npm run build` succeeds + manual screenshot review later. No unit test.

- [ ] **Step 1: Replace tokens in app/globals.css**

Replace the entire `:root { ... }` and `@theme inline { ... }` blocks in `app/globals.css` with:
```css
/* Quiet Instrument — dark instrument panel. One variable accent hue (the pace
   color) carries the verdict; everything else is quiet and high-contrast.
   See docs/superpowers/specs/2026-06-23-plan-driven-reframe-design.md. */
:root {
  --canvas: #16181d; /* near-black charcoal page */
  --panel: #1e2128; /* barely-raised cards */
  --hairline: #2c303a; /* dividers, gauge tracks */
  --ink: #f2f0e9; /* warm off-white text/numerals */
  --ink-dim: #8a8f9c; /* labels, captions */
  --pace-good: #5bd6c0; /* on/ahead of pace (teal) */
  --pace-warn: #e0a33e; /* drifting (amber) */
  --pace-over: #e0653e; /* meaningfully over (ember) */
}

@theme inline {
  --color-canvas: var(--canvas);
  --color-panel: var(--panel);
  --color-hairline: var(--hairline);
  --color-ink: var(--ink);
  --color-ink-dim: var(--ink-dim);
  --color-pace-good: var(--pace-good);
  --color-pace-warn: var(--pace-warn);
  --color-pace-over: var(--pace-over);

  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
  --font-display: var(--font-geist-mono);

  --container-app: 480px;
}

body {
  font-family: var(--font-sans), system-ui, sans-serif;
  background: var(--canvas);
  color: var(--ink);
}

/* Instrument-marking labels. */
.label-caps {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-size: 0.6875rem;
  color: var(--ink-dim);
  font-family: var(--font-sans), system-ui, sans-serif;
}

/* Glide Path primitive styling. The hue is supplied inline via --pace-hue. */
.glide-track {
  position: relative;
  height: 2px;
  background: var(--hairline);
  border-radius: 9999px;
}
.glide-tick {
  position: absolute;
  top: -4px;
  width: 1px;
  height: 10px;
  background: var(--ink-dim);
}
.glide-dot {
  position: absolute;
  top: 50%;
  width: 12px;
  height: 12px;
  border-radius: 9999px;
  transform: translate(-50%, -50%);
  background: var(--pace-hue, var(--pace-good));
  transition: left 700ms cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--pace-hue, var(--pace-good)) 22%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .glide-dot {
    transition: none;
  }
}
```
(If the existing file has a `.tick-motif` utility, it may be deleted — no new screen uses it. Leave other rules intact.)

- [ ] **Step 2: Update fonts in app/layout.tsx**

In `app/layout.tsx`, keep `Geist` and `Geist_Mono`; remove `Space_Grotesk` (Geist Mono now doubles as the display/numeral face per `--font-display`). Update the import and the `<html>` className accordingly:
```typescript
import { Geist, Geist_Mono } from "next/font/google";
```
Remove the `spaceGrotesk` const and drop `${spaceGrotesk.variable}` from the `<html>` className. Change the body className to the new tokens:
```typescript
      <body className="min-h-full flex flex-col bg-canvas text-ink">{children}</body>
```

- [ ] **Step 3: Build to verify CSS + fonts compile**

Run: `npm run build`
Expected: build succeeds. (Some screens still reference old tokens like `bg-bg`; those are fixed in later tasks. If the build fails ONLY due to missing token classes in not-yet-touched screens, that's expected — proceed; the screen tasks fix them. If it fails on `globals.css` or `layout.tsx` syntax, fix here.)

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "Replace design tokens with Quiet Instrument palette"
```

---

## Task 9: paceHue helper + GlidePath primitive

**Files:**
- Create: `lib/utils/paceHue.ts`
- Test: `lib/utils/paceHue.test.ts`
- Create: `components/ui/GlidePath.tsx`

**Interfaces:**
- Consumes: `PaceVerdict` type.
- Produces:
  - `paceHue(ratio: number): string` — CSS color: interpolates good→warn→over. ratio ≤ 1 → good; 1..1.15 → blend good→warn; > 1.15 → blend warn→over (cap at over).
  - `verdictLabel(verdict: PaceVerdict): string` — "UNDER PLAN" / "ON PACE" / "OVER".
  - `GlidePath` React component: props `{ paceRatio: number; size?: "hero" | "row"; label?: string }`. Renders a track with a tick at the "expected" position (always centered = 1.0 on the visual scale) and a dot at the user's position. `aria-label` describes pace in words.

**Dot position model:** map `paceRatio` to a 0–100% track position where ratio 1.0 sits at 50% (the tick). Clamp: ratio 0 → ~8%, ratio 2.0+ → ~92%. Linear within [0,2].

- [ ] **Step 1: Write failing tests for paceHue**

Create `lib/utils/paceHue.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { paceHue, verdictLabel } from "./paceHue";

describe("paceHue", () => {
  it("returns the good hue at or below plan", () => {
    expect(paceHue(0.5)).toBe("#5bd6c0");
    expect(paceHue(1.0)).toBe("#5bd6c0");
  });
  it("returns a string color when over plan", () => {
    const c = paceHue(1.5);
    expect(typeof c).toBe("string");
    expect(c.startsWith("#") || c.startsWith("rgb")).toBe(true);
  });
});

describe("verdictLabel", () => {
  it("maps verdicts to copy", () => {
    expect(verdictLabel("under")).toBe("UNDER PLAN");
    expect(verdictLabel("on")).toBe("ON PACE");
    expect(verdictLabel("over")).toBe("OVER");
  });
});
```

- [ ] **Step 2: Run to verify fail**

Run: `npm test -- paceHue`
Expected: FAIL.

- [ ] **Step 3: Implement lib/utils/paceHue.ts**

Create `lib/utils/paceHue.ts`:
```typescript
import type { PaceVerdict } from "@/lib/types";

const GOOD = [0x5b, 0xd6, 0xc0] as const;
const WARN = [0xe0, 0xa3, 0x3e] as const;
const OVER = [0xe0, 0x65, 0x3e] as const;

function hex(rgb: readonly number[]): string {
  return "#" + rgb.map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
}
function lerp(a: readonly number[], b: readonly number[], t: number): number[] {
  return a.map((av, i) => av + (b[i] - av) * t);
}

// ratio = projected/spendable (or projected/allowance). <=1 calm; grows warmer.
export function paceHue(ratio: number): string {
  if (ratio <= 1) return hex(GOOD);
  if (ratio <= 1.15) return hex(lerp(GOOD, WARN, (ratio - 1) / 0.15));
  if (ratio >= 1.5) return hex(OVER);
  return hex(lerp(WARN, OVER, (ratio - 1.15) / 0.35));
}

export function verdictLabel(verdict: PaceVerdict): string {
  if (verdict === "under") return "UNDER PLAN";
  if (verdict === "over") return "OVER";
  return "ON PACE";
}

// Track position (0..100%) for the user's dot; 1.0 sits at the centered tick.
export function dotPercent(ratio: number): number {
  const clamped = Math.min(Math.max(ratio, 0), 2);
  return 8 + (clamped / 2) * 84; // 8%..92%
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- paceHue`
Expected: PASS.

- [ ] **Step 5: Implement components/ui/GlidePath.tsx**

Create `components/ui/GlidePath.tsx`:
```tsx
import { paceHue, dotPercent } from "@/lib/utils/paceHue";

// The signature element. A track with a centered "expected today" tick and a
// dot at the user's actual position. Hue carries the verdict; the dot position
// and the aria-label carry it too (never color alone).
export function GlidePath({
  paceRatio,
  size = "hero",
  label,
}: {
  paceRatio: number;
  size?: "hero" | "row";
  label?: string;
}) {
  const hue = paceHue(paceRatio);
  const left = dotPercent(paceRatio);
  const aria =
    label ??
    (paceRatio <= 1
      ? "On or under pace"
      : paceRatio <= 1.15
        ? "Slightly over pace"
        : "Over pace");

  return (
    <div
      role="img"
      aria-label={aria}
      className={size === "hero" ? "py-3" : "py-1.5"}
      style={{ ["--pace-hue" as string]: hue }}
    >
      <div className="glide-track">
        <span className="glide-tick" style={{ left: "50%" }} aria-hidden />
        <span className="glide-dot" style={{ left: `${left}%` }} aria-hidden />
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.
```bash
git add lib/utils/paceHue.ts lib/utils/paceHue.test.ts components/ui/GlidePath.tsx
git commit -m "Add paceHue helper and GlidePath signature component"
```

---

## Task 10: PaceHeadline shared component

**Files:**
- Create: `components/ui/PaceHeadline.tsx`

**Interfaces:**
- Consumes: `PaceResult`, `GlidePath`, `formatINR`, `paceHue`, `verdictLabel`.
- Produces: `PaceHeadline` component, props `{ pace: PaceResult }`. Renders the verdict label, the projected-savings number (in pace hue when below goal), the "Goal ₹X · ₹Y under/over" caption, and the hero GlidePath.

- [ ] **Step 1: Implement components/ui/PaceHeadline.tsx**

Create `components/ui/PaceHeadline.tsx`:
```tsx
import { GlidePath } from "@/components/ui/GlidePath";
import { paceHue, verdictLabel } from "@/lib/utils/paceHue";
import { formatINR } from "@/lib/utils/currency";
import type { PaceResult } from "@/lib/types";

export function PaceHeadline({ pace }: { pace: PaceResult }) {
  const belowGoal = pace.projectedSavings < pace.savingsGoal;
  const gap = Math.abs(pace.projectedSavings - pace.savingsGoal);
  const gapWord = pace.projectedSavings >= pace.savingsGoal ? "ahead" : "short";
  const numberColor = belowGoal ? paceHue(pace.paceRatio) : "var(--color-ink)";

  return (
    <section className="pt-6">
      <p className="label-caps">{verdictLabel(pace.verdict)}</p>
      <p className="mt-1 text-xs text-ink-dim">Projected to save</p>
      <p
        className="font-display tabular-nums text-5xl font-light leading-none mt-1"
        style={{ color: numberColor }}
      >
        {formatINR(pace.projectedSavings)}
      </p>
      <p className="mt-2 text-sm text-ink-dim">
        Goal {formatINR(pace.savingsGoal)} · {formatINR(gap)} {gapWord}
      </p>
      <GlidePath paceRatio={pace.paceRatio} size="hero" />
    </section>
  );
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.
```bash
git add components/ui/PaceHeadline.tsx
git commit -m "Add PaceHeadline shared pace hero"
```

---

## Task 11: Plan-management server actions

**Files:**
- Modify: `app/(app)/actions.ts` (append actions; add a `revalidatePlanSurfaces` helper)

**Interfaces:**
- Consumes: `savePlan`, `activatePlan`, `ensureDefaultPlan` from `lib/queries/plans`; `setCycleResetDayValue` from `lib/queries/profile`.
- Produces server actions:
  - `savePlanAction(input: { id?: string | null; name: string; salary: number; buffer: number; makeActive?: boolean; allowances: Array<{ categoryId: string; amount: number }> })`
  - `activatePlanAction(planId: string)`
  - `setCycleResetDayAction(day: number)`

- [ ] **Step 1: Append to app/(app)/actions.ts**

Add these imports at the top of `app/(app)/actions.ts` (with the existing imports):
```typescript
import { savePlan, activatePlan, ensureDefaultPlan } from "@/lib/queries/plans";
import { setCycleResetDayValue } from "@/lib/queries/profile";
```
Append at the end of the file:
```typescript

// Every surface whose numbers depend on the active plan.
function revalidatePlanSurfaces() {
  revalidatePath("/");
  revalidatePath("/plan");
  revalidatePath("/dashboard");
  revalidatePath("/reports");
}

export async function savePlanAction(input: {
  id?: string | null;
  name: string;
  salary: number;
  buffer: number;
  makeActive?: boolean;
  allowances: Array<{ categoryId: string; amount: number }>;
}) {
  const name = (input.name ?? "").trim();
  if (!name) throw new Error("Give the plan a name");
  const salary = Number(input.salary);
  if (!Number.isFinite(salary) || salary < 0) throw new Error("Enter a valid salary");
  const buffer = Number(input.buffer);
  if (!Number.isFinite(buffer) || buffer < 0) throw new Error("Buffer can't be negative");

  await ensureDefaultPlan();
  await savePlan({
    id: input.id ?? null,
    name,
    salary,
    buffer,
    makeActive: input.makeActive ?? true,
    allowances: input.allowances
      .map((a) => ({ categoryId: a.categoryId, amount: Number(a.amount) || 0 }))
      .filter((a) => a.categoryId),
  });
  revalidatePlanSurfaces();
}

export async function activatePlanAction(planId: string) {
  if (!planId) throw new Error("Missing plan id");
  await activatePlan(planId);
  revalidatePlanSurfaces();
}

export async function setCycleResetDayAction(day: number) {
  const d = Number(day);
  if (!Number.isFinite(d) || d < 1 || d > 31) throw new Error("Pick a day between 1 and 31");
  await setCycleResetDayValue(d);
  revalidatePlanSurfaces();
}
```

- [ ] **Step 2: Typecheck + commit**

Run: `npm run typecheck`
Expected: PASS.
```bash
git add app/(app)/actions.ts
git commit -m "Add plan-management server actions"
```

---

## Task 12: Plan screen (editor + allowances + switcher)

**Files:**
- Create: `components/plan/AllowanceRow.tsx`
- Create: `components/plan/PlanEditor.tsx`
- Create: `app/(app)/plan/page.tsx`

**Interfaces:**
- Consumes: `PlanWithAllowances`, `Plan`, `Category`; `savePlanAction`, `activatePlanAction`, `setCycleResetDayAction`; `getActivePlan`, `listPlans`, `ensureDefaultPlan`, `getCycleResetDay`, `listCategories`; `formatINR`.
- Produces: the `/plan` route rendering the editor with live derived savings.

- [ ] **Step 1: Implement components/plan/AllowanceRow.tsx**

Create `components/plan/AllowanceRow.tsx`:
```tsx
"use client";

import { formatINR } from "@/lib/utils/currency";

// One editable allowance row: category name + a numeric amount input.
export function AllowanceRow({
  name,
  amount,
  onChange,
}: {
  name: string;
  amount: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 py-3 border-b border-hairline">
      <span className="text-ink">{name}</span>
      <span className="flex items-center gap-2">
        <span className="text-ink-dim text-sm" aria-hidden>
          ₹
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={amount === 0 ? "" : amount}
          placeholder="0"
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-24 bg-panel text-ink tabular-nums text-right rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
          aria-label={`Allowance for ${name}`}
        />
      </span>
    </label>
  );
}
```

- [ ] **Step 2: Implement components/plan/PlanEditor.tsx**

Create `components/plan/PlanEditor.tsx`:
```tsx
"use client";

import { useMemo, useState, useTransition } from "react";
import { AllowanceRow } from "@/components/plan/AllowanceRow";
import { formatINR } from "@/lib/utils/currency";
import { paceHue } from "@/lib/utils/paceHue";
import { savePlanAction, activatePlanAction, setCycleResetDayAction } from "@/app/(app)/actions";
import type { Category, Plan, PlanWithAllowances } from "@/lib/types";

type AllowanceState = Record<string, number>; // categoryId -> amount

export function PlanEditor({
  activePlan,
  plans,
  categories,
  resetDay,
}: {
  activePlan: PlanWithAllowances | null;
  plans: Plan[];
  categories: Category[];
  resetDay: number;
}) {
  const [name, setName] = useState(activePlan?.name ?? "Monthly plan");
  const [salary, setSalary] = useState(activePlan ? Number(activePlan.salary) : 0);
  const [buffer, setBuffer] = useState(activePlan ? Number(activePlan.buffer) : 0);
  const [day, setDay] = useState(resetDay);
  const [allowances, setAllowances] = useState<AllowanceState>(() => {
    const init: AllowanceState = {};
    for (const c of categories) init[c.id] = 0;
    for (const a of activePlan?.allowances ?? []) init[a.category_id] = Number(a.amount);
    return init;
  });
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const allocated = useMemo(
    () => Object.values(allowances).reduce((s, n) => s + (n || 0), 0),
    [allowances],
  );
  const savings = salary - allocated - buffer;
  const over = savings < 0;

  function setAmount(categoryId: string, next: number) {
    setAllowances((prev) => ({ ...prev, [categoryId]: next }));
  }

  function save(makeNew: boolean) {
    setError(null);
    start(async () => {
      try {
        if (day !== resetDay) await setCycleResetDayAction(day);
        await savePlanAction({
          id: makeNew ? null : (activePlan?.id ?? null),
          name: makeNew ? `${name} copy` : name,
          salary,
          buffer,
          makeActive: true,
          allowances: categories.map((c) => ({ categoryId: c.id, amount: allowances[c.id] ?? 0 })),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  return (
    <div className="pt-6">
      <p className="label-caps">Your active plan</p>

      {plans.length > 1 ? (
        <select
          value={activePlan?.id ?? ""}
          onChange={(e) => start(() => activatePlanAction(e.target.value))}
          className="mt-2 bg-panel text-ink rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
          aria-label="Switch active plan"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      ) : null}

      <label className="mt-4 block">
        <span className="label-caps">Plan name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full bg-panel text-ink rounded-md px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
        />
      </label>

      <label className="mt-4 flex items-center justify-between">
        <span className="label-caps">Monthly salary</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={salary === 0 ? "" : salary}
          placeholder="0"
          onChange={(e) => setSalary(Number(e.target.value) || 0)}
          className="w-32 bg-panel text-ink tabular-nums text-right rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
          aria-label="Monthly salary"
        />
      </label>

      <label className="mt-4 flex items-center justify-between">
        <span className="label-caps">Cycle resets on day</span>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={31}
          value={day}
          onChange={(e) => setDay(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
          className="w-20 bg-panel text-ink tabular-nums text-right rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
          aria-label="Cycle reset day of month"
        />
      </label>

      <p className="label-caps mt-8">Allowances</p>
      <div>
        {categories.map((c) => (
          <AllowanceRow
            key={c.id}
            name={c.name}
            amount={allowances[c.id] ?? 0}
            onChange={(n) => setAmount(c.id, n)}
          />
        ))}
      </div>

      <label className="mt-4 flex items-center justify-between">
        <span className="label-caps">Buffer (optional)</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={buffer === 0 ? "" : buffer}
          placeholder="0"
          onChange={(e) => setBuffer(Number(e.target.value) || 0)}
          className="w-32 bg-panel text-ink tabular-nums text-right rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-pace-good"
          aria-label="Buffer"
        />
      </label>

      <div className="mt-6 border-t border-hairline pt-4 flex items-center justify-between">
        <span className="label-caps">Allocated</span>
        <span className="tabular-nums text-ink">{formatINR(allocated)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="label-caps">{over ? "Over by" : "Savings goal"}</span>
        <span
          className="tabular-nums text-2xl font-light"
          style={{ color: over ? paceHue(1.4) : "var(--color-ink)" }}
        >
          {formatINR(Math.abs(savings))}
        </span>
      </div>

      {error ? <p className="mt-3 text-sm" style={{ color: paceHue(1.4) }}>{error}</p> : null}

      <div className="mt-6 flex gap-3">
        <button
          onClick={() => save(false)}
          disabled={pending}
          className="flex-1 rounded-md bg-pace-good text-canvas font-medium py-3 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save plan"}
        </button>
        <button
          onClick={() => save(true)}
          disabled={pending}
          className="rounded-md border border-hairline text-ink py-3 px-4 disabled:opacity-60"
        >
          Save as new
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Implement app/(app)/plan/page.tsx**

Create `app/(app)/plan/page.tsx`:
```tsx
import { ensureDefaultPlan, getActivePlan, listPlans } from "@/lib/queries/plans";
import { getCycleResetDay } from "@/lib/queries/profile";
import { listCategories } from "@/lib/queries/categories";
import { PlanEditor } from "@/components/plan/PlanEditor";

// Plan: the centerpiece. The user authors salary + per-category allowances; the
// savings goal is derived live (salary − allowances − buffer).
export default async function PlanPage() {
  await ensureDefaultPlan();
  const [activePlan, plans, categories, resetDay] = await Promise.all([
    getActivePlan(),
    listPlans(),
    listCategories(),
    getCycleResetDay(),
  ]);

  return (
    <PlanEditor
      activePlan={activePlan}
      plans={plans}
      categories={categories}
      resetDay={resetDay}
    />
  );
}
```

- [ ] **Step 4: Build + manual check**

Run: `npm run build`
Expected: build succeeds (the `/plan` route compiles). Then run `npm run dev`, sign in, visit `/plan`, set salary + allowances, confirm the savings goal updates live and "Save plan" persists.

- [ ] **Step 5: Commit**

```bash
git add components/plan/AllowanceRow.tsx components/plan/PlanEditor.tsx "app/(app)/plan/page.tsx"
git commit -m "Add Plan screen with live-derived savings"
```

---

## Task 13: Home reframed

**Files:**
- Modify: `app/(app)/page.tsx`

**Interfaces:**
- Consumes: `getCyclePace`, `getGreetingName`, `listItems`, `listCategories`, `runMaterialize`, `PaceHeadline`, `HomeLogger`, `formatINR`.
- Replaces the `SpendCard` hero with `PaceHeadline` + today/to-date/safe-to-spend stats. Keeps `HomeLogger` unchanged.

- [ ] **Step 1: Replace app/(app)/page.tsx**

Replace the entire contents of `app/(app)/page.tsx`:
```tsx
import { getCyclePace } from "@/lib/queries/pace";
import { listItems } from "@/lib/queries/items";
import { listCategories } from "@/lib/queries/categories";
import { getGreetingName } from "@/lib/queries/profile";
import { runMaterialize } from "@/lib/queries/recurring";
import { PaceHeadline } from "@/components/ui/PaceHeadline";
import { HomeLogger } from "@/components/quick-log/HomeLogger";
import { formatINR } from "@/lib/utils/currency";

// Home: are you on pace to land safe? The PaceHeadline answers it; today /
// to-date / safe-to-spend sit beneath; the + logging hero is unchanged.
export default async function HomePage() {
  await runMaterialize();

  const [name, paceData, items, categories] = await Promise.all([
    getGreetingName(),
    getCyclePace(),
    listItems(),
    listCategories(),
  ]);

  return (
    <div className="flex min-h-[calc(100dvh-64px)] flex-col">
      <h1 className="font-display text-3xl font-light text-ink pt-8">
        Hi {name}
      </h1>

      {paceData?.plan ? (
        <>
          <PaceHeadline pace={paceData.pace} />
          <dl className="mt-2 divide-y divide-hairline border-t border-hairline">
            <Stat label="Spent today" value={formatINR(paceData.spentToday)} />
            <Stat label="Spent this cycle" value={formatINR(paceData.spentSoFar)} />
            <Stat label="Safe to spend today" value={formatINR(paceData.pace.safeToSpendToday)} />
          </dl>
        </>
      ) : (
        <p className="mt-6 text-ink-dim">
          Set up your budget on the Plan screen to start tracking your pace.
        </p>
      )}

      <HomeLogger categories={categories} recentItems={items.slice(0, 6)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="label-caps">{label}</dt>
      <dd className="tabular-nums text-ink">{value}</dd>
    </div>
  );
}
```

- [ ] **Step 2: Build + manual check**

Run: `npm run build`
Expected: succeeds. `npm run dev`: Home shows the verdict, projected savings, the glide path, and the three stats; the + still logs.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/page.tsx"
git commit -m "Reframe Home around pace and projection"
```

---

## Task 14: Dashboard reframed (per-category pace)

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

**Interfaces:**
- Consumes: `getCyclePace`, `listRecentTransactions`, `PaceHeadline`, `GlidePath`, `formatINR`, `formatTime`, `CategoryPace`.
- Produces: a dashboard with the roll-up PaceHeadline, a per-category pace list (each row = name, spent/allowance, projection, a row-size GlidePath, a text verdict), and recent transactions.

- [ ] **Step 1: Replace app/(app)/dashboard/page.tsx**

Replace the entire contents of `app/(app)/dashboard/page.tsx`:
```tsx
import { getCyclePace } from "@/lib/queries/pace";
import { listRecentTransactions } from "@/lib/queries/transactions";
import { PaceHeadline } from "@/components/ui/PaceHeadline";
import { GlidePath } from "@/components/ui/GlidePath";
import { verdictLabel } from "@/lib/utils/paceHue";
import { formatINR } from "@/lib/utils/currency";
import { formatTime } from "@/lib/utils/date";
import type { CategoryPace } from "@/lib/types";

// Dashboard: where is it leaking? Roll-up pace at the top, then per-category
// pace (over-trending first), then recent spend.
export default async function DashboardPage() {
  const paceData = await getCyclePace();
  const recent = await listRecentTransactions(6);

  if (!paceData?.plan) {
    return (
      <p className="pt-8 text-ink-dim">
        Set up your budget on the Plan screen to see your dashboard.
      </p>
    );
  }

  const { cycle, pace, categories } = paceData;

  return (
    <div className="pt-8">
      <p className="label-caps">
        This cycle · Day {cycle.daysElapsed} of {cycle.daysInCycle}
      </p>

      <PaceHeadline pace={pace} />

      <p className="label-caps mt-8">On pace by category</p>
      <div className="mt-2">
        {categories.map((c) => (
          <CategoryPaceRow key={c.categoryId} c={c} />
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="label-caps">Recent</p>
      </div>
      <ul className="mt-2 divide-y divide-hairline border-t border-hairline">
        {recent.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-3">
            <span className="text-ink">{t.note ?? "Expense"}</span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums text-ink">{formatINR(Number(t.amount))}</span>
              <span className="text-xs text-ink-dim">{formatTime(t.spent_at)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryPaceRow({ c }: { c: CategoryPace }) {
  const verdict =
    c.verdict === "over" ? "over" : c.verdict === "under" ? "under" : "on track";
  return (
    <div className="py-3 border-b border-hairline">
      <div className="flex items-center justify-between">
        <span className="text-ink">{c.name}</span>
        <span className="label-caps">{verdict}</span>
      </div>
      <GlidePath paceRatio={c.paceRatio} size="row" label={`${c.name}: ${verdictLabel(c.verdict)}`} />
      <p className="text-xs text-ink-dim tabular-nums">
        {formatINR(c.spent)} / {formatINR(c.allowance)} · proj {formatINR(c.projected)}
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Build + manual check**

Run: `npm run build`
Expected: succeeds. Dashboard shows roll-up pace + per-category rows with glide paths.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/dashboard/page.tsx"
git commit -m "Reframe Dashboard around per-category pace"
```

---

## Task 15: Reports reframed (progress + patterns + streaks)

**Files:**
- Modify: `app/(app)/reports/page.tsx`

**Interfaces:**
- Consumes: `getInsights`, `getCyclePace`, `formatINR`, `Insight`.
- Produces: a Progress block (saved this cycle, vs last cycle, streak), a "What the numbers say" patterns block, and a "Where it went" category breakdown (reuse `categories` from `getCyclePace`, biggest spent first).

- [ ] **Step 1: Replace app/(app)/reports/page.tsx**

Replace the entire contents of `app/(app)/reports/page.tsx`:
```tsx
import { getInsights } from "@/lib/queries/insights";
import { getCyclePace } from "@/lib/queries/pace";
import { formatINR } from "@/lib/utils/currency";
import type { Insight } from "@/lib/types";

// Reports: progress (are you improving?), plain-language patterns, and where the
// money went. Insights only appear with enough data.
export default async function ReportsPage() {
  const [insightsData, paceData] = await Promise.all([getInsights(), getCyclePace()]);
  const { insights, savedThisCycle, savedLastCycle, streak } = insightsData;

  const delta = savedLastCycle != null ? savedThisCycle - savedLastCycle : null;
  const bySpent = [...(paceData?.categories ?? [])].sort((a, b) => b.spent - a.spent);
  const peak = bySpent[0]?.spent ?? 0;

  return (
    <div className="pt-8">
      <p className="label-caps">Your insights</p>

      <p className="label-caps mt-6">Progress</p>
      <div className="mt-2 divide-y divide-hairline border-t border-hairline">
        <Row label="Saved this cycle" value={formatINR(savedThisCycle)} />
        {delta != null ? (
          <Row
            label="vs last cycle"
            value={`${delta >= 0 ? "▲" : "▼"} ${formatINR(Math.abs(delta))}`}
          />
        ) : null}
        {streak > 0 ? (
          <Row label="Streak" value={`🔥 ${streak} ${streak === 1 ? "cycle" : "cycles"} on goal`} />
        ) : null}
      </div>

      {insights.length > 0 ? (
        <>
          <p className="label-caps mt-8">What the numbers say</p>
          <div className="mt-2 space-y-4">
            {insights.map((i: Insight, idx) => (
              <div key={idx}>
                <p className="text-ink">{i.headline}</p>
                <p className="text-sm text-ink-dim">{i.detail}</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-8 text-sm text-ink-dim">
          Keep logging — patterns appear once there's enough data.
        </p>
      )}

      {bySpent.length > 0 ? (
        <>
          <p className="label-caps mt-8">Where it went</p>
          <div className="mt-2 space-y-2">
            {bySpent.map((c) => (
              <div key={c.categoryId}>
                <div className="flex items-center justify-between">
                  <span className="text-ink text-sm">{c.name}</span>
                  <span className="tabular-nums text-sm text-ink">{formatINR(c.spent)}</span>
                </div>
                <div className="glide-track mt-1" style={{ ["--pace-hue" as string]: "var(--color-ink-dim)" }}>
                  <span
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{
                      width: peak > 0 ? `${(c.spent / peak) * 100}%` : "0%",
                      background: "var(--color-ink-dim)",
                      height: "2px",
                    }}
                    aria-hidden
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="label-caps">{label}</span>
      <span className="tabular-nums text-ink">{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Build + manual check**

Run: `npm run build`
Expected: succeeds. Reports shows progress, patterns (or the empty-state line), and the breakdown.

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/reports/page.tsx"
git commit -m "Reframe Reports around progress, patterns, and streaks"
```

---

## Task 16: Navigation — add Plan, remove Categories, demote Credits

**Files:**
- Modify: `components/ui/TopBar.tsx`
- Delete: `app/(app)/categories/page.tsx`

**Interfaces:**
- Consumes: existing `MENU_LINKS` structure.
- Produces: menu with Plan near the top; no Categories link; Credits moved to the bottom group.

- [ ] **Step 1: Update MENU_LINKS in components/ui/TopBar.tsx**

Replace the `MENU_LINKS` array and add the `Target` icon import. Change the import line:
```typescript
import {
  Home,
  Wallet,
  LayoutDashboard,
  BarChart3,
  History,
  Repeat,
  Target,
  LogOut,
} from "lucide-react";
```
Replace `MENU_LINKS`:
```typescript
const MENU_LINKS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/plan", label: "Plan", icon: Target },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
  { href: "/recurring", label: "Recurring", icon: Repeat },
  { href: "/credits", label: "Add income", icon: Wallet },
] as const;
```
(The `Tag` import is now unused — remove it from the import list to satisfy lint.)

- [ ] **Step 2: Delete the Categories route**

Run:
```bash
git rm "app/(app)/categories/page.tsx"
```
If other files import from the categories page, none should — it's a route. Confirm with:
```bash
grep -rn "categories/page" app components lib || echo "no references"
```
Expected: "no references".

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: both pass. If lint flags an unused import, remove it.

- [ ] **Step 4: Commit**

```bash
git add components/ui/TopBar.tsx
git commit -m "Add Plan to nav, remove Categories, demote Credits"
```

---

## Task 17: Final verification sweep

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: all `lib/pace` and `lib/utils/paceHue` tests PASS.

- [ ] **Step 2: Typecheck, lint, build**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all pass with no errors.

- [ ] **Step 3: Manual smoke test**

Run `npm run dev`, sign in, then verify in order:
1. `/plan` — set salary 60000, allowances totalling 11000, buffer 4000; savings shows ₹45,000 live; Save plan persists; reload keeps values.
2. `/` — Home shows verdict label, projected savings + glide path, and Spent today / this cycle / Safe to spend.
3. Log an expense via `+`; confirm Spent today and the projection update.
4. `/dashboard` — per-category rows render with glide paths; over-trending categories sort first.
5. `/reports` — Progress block renders; patterns show or the empty-state line shows; breakdown lists categories.
6. Menu has Plan (no Categories); `/categories` 404s.
7. Resize to mobile width and tab through Plan inputs — focus rings visible; contrast legible.

- [ ] **Step 4: Final commit (if any fixups were needed)**

```bash
git add -A
git commit -m "Fixups from verification sweep" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Plan-driven model + derived savings → Tasks 1,3,5,6,12. ✓
- Calendar cycle w/ reset day (default 25, clamp) → Tasks 2,5,6. ✓
- Pace / projection / safe-to-spend / projected savings → Task 3, surfaced in 13,14. ✓
- Committed costs reserved upfront (full amount) → Task 7 (`committed`). ✓
- Patterns + streaks → Tasks 4,7,15. ✓
- Plan screen (author/switch/save-as-new, allowances merged categories) → Task 12. ✓
- Home / Dashboard / Reports reframe → Tasks 13,14,15. ✓
- Credits demoted, Categories removed, Plan in nav → Task 16. ✓
- Quiet Instrument tokens, Glide Path signature, paceHue, accessibility → Tasks 8,9,10. ✓
- Optional extra income raises spendable → kept via existing Credits/`logCredit`; income in the model is the plan salary (extra income surfaces as "ahead of pace"). Acceptable per spec ("Optional, raises spendable"); no separate task needed beyond keeping Credits reachable (Task 16).

**Note on TDD scope:** The codebase has no test runner and is UI/RSC-heavy. Per the skill's discipline AND the project's reality, automated TDD is applied to the pure logic where bugs hide (`lib/pace/*`, `lib/utils/paceHue`) via vitest (Tasks 1–4, 9). UI, queries, and SQL are verified by `typecheck` + `build` + `lint` + the manual smoke test (Task 17), since RSC/Supabase integration tests would require infrastructure the user did not request.
