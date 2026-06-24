# X-pense — Plans Hub, Editor Refresh & Vacation Mode

**Date:** 2026-06-24
**Status:** Design approved, ready for implementation planning
**Branch:** phase-1-redesign

## Why

Three connected improvements to the budgeting surface:

1. **A Plans hub** — today the "Plan" menu link goes straight to a single editor. The
   user wants a page *before* the editor to see all saved plans, mark/switch the active
   one, and create/edit/delete/duplicate plans.
2. **An editor refresh** — the current editor doesn't explain its own savings math, mixes
   "Save" and "Save as new", has a flat stack of mismatched fields, and can't remove a
   category from a plan.
3. **Vacation mode** — a lightweight, date-bounded *trip tracker* for one-off trips, kept
   entirely separate from the monthly salary-anchored budget. On a trip the user wants to
   just log and see "what did I spend," with no budget or pace.

Framing from the user: plans and categories are **classification tags**; the **amounts and
the monthly spend calculation are what matter most**. That calculation was verified during
brainstorming (see "Known issue" below) and is correct for normal use.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| Vacation model | **Separate trip with its own identity**, date-bounded, NOT tied to the salary cycle |
| Trip budget | **No budget** — just track: running total + category breakdown. No pace, no safe-to-spend |
| Trip lifecycle | **Manual start / manual end.** Trip is active only when explicitly started; dates are labels |
| Monthly during trip | **Trip takes over Home** while active; monthly pace resumes automatically on End trip |
| Trip vs monthly spend | **Fully separate** — trip expenses (`trip_id` set) are excluded from monthly cycle math |
| Plans hub capabilities | List + set active, create, edit, delete, duplicate, and a "Start a vacation" entry point |
| Editor fixes | Explicit savings breakdown, single Save button, grouped sections, remove-category (✕) |
| Reorder categories | **Deferred** (fiddly on mobile, low value); sort stays by creation order |
| Routing | `/plan` = hub; `/plan/[id]` = edit; `/plan/new` = create; `/vacation` = active trip |

## Navigation & structure

- The dot-menu **"Plan"** link now points at the **Plans hub** (`/plan`).
- The **editor** moves to sub-routes: `/plan/[id]` (edit existing) and `/plan/new` (create).
- **Vacation** is started from the hub and lives at `/vacation` while active.
- The Home **+** logging is unchanged in placement; its *target* changes: logs to the active
  monthly plan's cycle normally, or to the **active trip** when one is running.

## Screen 1 — Plans hub (`/plan`)

```
PLANS

┌─────────────────────────────┐
│ Normal month        ● ACTIVE│   ← teal active marker
│ ₹60,000 · saves ₹45,000     │
└─────────────────────────────┘
┌─────────────────────────────┐
│ Tight month        Make active│
│ ₹60,000 · saves ₹52,000   ✕ │   ← ✕ delete (non-active only)
└─────────────────────────────┘

  + New plan        ⧉ Duplicate

──────────────────────────────
🏖  Start a vacation
    Track a trip separately
```

- **Plan card:** name, salary, derived savings goal (`salary − allowances − buffer`). The
  active plan shows a teal **● ACTIVE** marker.
- **Tap a card** → opens the editor at `/plan/[id]`.
- **Make active** action on non-active cards → calls `activatePlanAction`.
- **Delete** (✕) on non-active cards only — the active plan can't be deleted (it's live).
  Confirm before deleting.
- **+ New plan** → `/plan/new` (blank editor). **Duplicate** → clones a chosen plan
  (server creates a copy named "<name> copy", inactive) then opens its editor.
- **Start a vacation** — visually separated entry; opens the start-trip flow. If a trip is
  already active, this entry instead reads "Trip in progress →" and links to `/vacation`.

## Screen 2 — Plan editor (`/plan/[id]`, `/plan/new`)

```
‹ Plans

EDIT PLAN                          (or NEW PLAN)
[ Plan name....................... ]

── INCOME ──────────────────────
Monthly salary            ₹60,000
Cycle resets on day            25

── ALLOWANCES ──────────────────
🍔 Food          ₹4,000      ✕
⛽ Petrol        ₹4,000      ✕
📺 Subscriptions ₹1,000      ✕
[ + Add category............ Add ]

── SAVINGS ─────────────────────
Salary                    ₹60,000
− Allowances              ₹9,000
− Buffer                  ₹4,000
═══════════════════════════════
= You'll save            ₹47,000     ← live; teal, ember if negative
  ▰▰▰▰▰▱▱▱                            ← glide-style savings bar

        [   Save plan   ]
```

- **Sections:** Income (salary, reset day) / Allowances / Savings, with consistent input
  styling matching the dark Quiet-Instrument tokens.
- **Explicit savings breakdown:** `Salary − Allowances − Buffer = You'll save`, recomputed
  live as the user types. The result is teal when ≥ 0, ember (`paceHue` over-color) when
  negative, with a glide-style bar.
- **Remove category (✕):** removes that allowance row from *this plan* (drops it from the
  plan's allowances on save). It does **not** archive/delete the category globally — the
  category remains available to other plans and to logging.
- **Add category:** unchanged behavior (creates a category + a 0 allowance row), kept.
- **Single Save button.** "Save as new" is removed; create/duplicate live on the hub.
- **Back link** to the hub.
- Reset day clamps 1–31 (existing behavior). Buffer optional.

## Screen 3 — Vacation mode (`/vacation`)

**Start flow:** from the hub → name the trip ("Goa trip"), optional start/end dates (labels
only, not enforced). Creates a trip row, sets it active. Only one active trip at a time.

**Active trip — takes over Home and lives at `/vacation`:**

```
GOA TRIP · Day 3                   ← replaces the monthly pace hero on Home
TRIP TOTAL
₹18,400                            ← running total = hero number
Started 21 Jun

   (the + logging hero — unchanged)
   ☕  🍔  ⛽   frequent chips

── ON THIS TRIP ────────────────
🍔 Food            ₹7,200
🏨 Stay            ₹6,000
⛽ Travel          ₹5,200           ← breakdown by category, biggest first

        [  End trip  ]
```

- While a trip is active:
  - **Home** swaps its pace hero for the trip total + breakdown; the **+** logs to the trip.
  - **Dashboard / Reports** show a small "Trip in progress" notice; monthly numbers are
    paused (not lost — they resume on End trip).
- **End trip** → sets the trip inactive (records `end_date`); Home returns to monthly pace.
  Past trips are retained for history.

## Data model changes

Building on the existing schema (`plans`, `plan_allowances`, `transactions`, etc.):

- **New `trips` table:** `id`, `user_id`, `name`, `start_date` (nullable), `end_date`
  (nullable), `is_active` (bool), `created_at`. RLS `"own rows"` via `user_id = auth.uid()`.
  Partial unique index `trips_one_active_per_user on trips(user_id) where is_active` to
  enforce at most one active trip.
- **`transactions.trip_id`** — new nullable uuid FK → `trips(id) on delete set null`. A
  normal monthly expense leaves it null; a trip expense sets it.
- **Monthly cycle math excludes trips:** every query that sums monthly spend
  (`lib/queries/pace.ts`, `lib/queries/insights.ts`) adds `.is("trip_id", null)` alongside
  the existing `recurring_id` filter, so trip spend never pollutes monthly pace.
- **Trip queries** (new `lib/queries/trips.ts`): `getActiveTrip()`, `listTrips()`,
  `startTrip(name, start?, end?)`, `endTrip(id)`, plus trip totals + per-category breakdown
  for the active trip (sum transactions where `trip_id = active.id`).
- **Plans queries** (existing `lib/queries/plans.ts`): add `getPlanById(id)`,
  `deletePlan(id)` (guard: refuse if active), `duplicatePlan(id)`. `savePlan`,
  `activatePlan`, `listPlans`, `getActivePlan` already exist.

## Server actions (new / changed)

In `app/(app)/actions.ts`, mirroring existing patterns (`"use server"`, validate + throw,
`revalidatePath`):

- `deletePlanAction(planId)` — refuse if it's the active plan.
- `duplicatePlanAction(planId)` — clone inactive, return new id.
- `startTripAction({ name, startDate?, endDate? })`, `endTripAction(tripId)`.
- `logEntry` (existing) — when an active trip exists, set `trip_id` on the inserted
  transaction and skip the monthly-cycle revalidation paths in favor of `/vacation`.
- `revalidate` helpers extended to cover `/vacation`.

## Editor / component structure

- `app/(app)/plan/page.tsx` → the **hub** (was the editor).
- `app/(app)/plan/[id]/page.tsx` and `app/(app)/plan/new/page.tsx` → editor routes.
- `components/plan/PlansHub.tsx` → hub UI (cards, actions, vacation entry).
- `components/plan/PlanEditor.tsx` → refreshed editor (grouped sections, savings breakdown,
  remove-row, single Save). The current `selectedPlanId`/switcher logic moves to the hub.
- `components/plan/PlanCard.tsx` → one plan card.
- `components/vacation/TripView.tsx` → active-trip Home/`/vacation` UI.
- `components/vacation/StartTripSheet.tsx` → start-trip flow.
- `app/(app)/vacation/page.tsx` → trip route.
- Home (`app/(app)/page.tsx`) → branch: if an active trip exists, render `TripView`;
  else the existing pace hero.

## Known issue (recorded, fixed separately)

**Cycle-boundary timezone edge:** `transactions.spent_at` defaults to `now()` (UTC) while
cycle boundaries are computed as **local** dates (`lib/pace/cycle.ts`). For a user in
IST (UTC+5:30), an expense logged between ~12:00am and 5:30am local on/around the reset day
can be stamped with a UTC time that falls in the adjacent calendar day, landing it in the
wrong cycle. This affects only the 1–2 boundary days and only that early-morning window;
mid-cycle spend is unaffected. **Out of scope for this work** — to be fixed separately with
systematic-debugging + a regression test (normalize the spend/cycle comparison to a single
timezone). Recorded here so it isn't lost.

## Out of scope (YAGNI)

- Trip budgets / trip pacing (explicitly chosen: trips are track-only).
- Multiple simultaneous active trips (one at a time).
- Drag-reorder of allowance rows (deferred).
- Trip expenses appearing in the main monthly History list (chose "fully separate").
- Auto start/end of trips by date (chose manual).
- Editing a past (ended) trip's expenses — trips are read-only once ended (log/edit happens
  while active). Revisit only if needed.

## Open questions for implementation planning

- Migration ordering: `trips` table + `transactions.trip_id` as a new `0006_*.sql`
  (user applies migrations manually, as before).
- Whether `endTrip` should also stamp `end_date = today` when it was left blank (proposed:
  yes, so history shows a real range).
- Frequent-item chips on the trip screen: reuse the same `listItems()` source as monthly
  (proposed: yes — items are global, the trip only changes where the transaction lands).
