# Salary-anchored budget cycles

**Date:** 2026-07-03
**Status:** Approved

## Problem

Salary is not credited on a fixed day — some months it lands a few days late (or
early). The app currently runs **two** cycle models that only agree when salary
arrives exactly on the expected day:

1. **Salary-anchored** (`budget_cycles` view → `resolveCurrentCycle` in
   `lib/utils/cycle.ts`): a cycle starts on the *actual* salary credit date.
   Drives the Credits page and the "available" number. Already handles a
   variable payday correctly.
2. **Fixed calendar** (`resolveCalendarCycle` in `lib/pace/cycle.ts`, keyed on
   `profiles.cycle_reset_day`, default 25): assumes a new cycle begins on the
   reset day *every month regardless*. Drives Dashboard pace/projection and
   Insights.

When salary is late, the pace engine rolls into a "new month" on the reset day
and resets projections while no salary has actually arrived. The two views
drift apart. That drift is the bug.

## Decision

Make the **actual salary credit date the single anchor** for pace and insights
too. `cycle_reset_day` stops being a hard boundary and becomes only the
**expected payday**, used to estimate the open cycle's length for projections.

- **Late/early salary:** logging a salary credit on any date starts a fresh
  cycle on that date (already true for `budget_cycles`); pace/insights now
  follow it.
- **Overdue (past expected payday, no new salary logged):** show a "salary
  overdue — cycle extended" banner and the remaining balance instead of the
  per-day "safe to spend", which is meaningless past cycle end.

## Design

### 1. `resolveEffectiveCycle` (new, pure, unit-tested)

Lives in `lib/pace/cycle.ts`, reusing the existing private `resetDateFor` /
`lastDayOfMonth` helpers.

```
resolveEffectiveCycle(salaryStart: string | null, resetDay: number, today: string): EffectiveCycle
```

`EffectiveCycle extends CalendarCycle` with two extra fields: `expectedEnd`
(YYYY-MM-DD) and `overdue` (boolean).

- **No salary yet** (`salaryStart === null`): fall back to
  `resolveCalendarCycle(resetDay, today)`, with `expectedEnd = end`,
  `overdue = false`. Keeps brand-new users working.
- **Otherwise:**
  - `start` = actual salary credit date.
  - `expectedEnd` = **next expected payday**: the first reset-day date strictly
    after `start`; if that date is within `MIN_CYCLE_DAYS` (10) of `start` — i.e.
    salary came *early* — skip to the following month. Keeps cycle length near a
    real month across early/on-time/late cases and month-length clamping.
  - `daysInCycle` = `daysBetween(start, expectedEnd)` — the **fixed** projection
    denominator; does not shrink when overdue.
  - `overdue` = `today > expectedEnd` (only possible when no newer salary
    exists, since a newer salary would move `start` forward).
  - `end` (spend-query window, exclusive) = `overdue ? addDays(today, 1) :
    expectedEnd`, so overdue-period spend still counts toward this cycle.
  - `daysElapsed` = `clamp(daysBetween(start, today) + 1, 1, daysInCycle)`.
  - `daysRemaining` = `max(daysInCycle - daysElapsed, 0)`.

### 2. `addDays` helper

Add a pure `addDays(iso, n)` to `lib/utils/date.ts` (a private copy already
exists in `lib/queries/cycles.ts`; point that one at the shared helper).

### 3. Rewire `getCyclePace` (`lib/queries/pace.ts`)

Fetch the current salary cycle (`getCurrentCycle()`), feed its `.start` into
`resolveEffectiveCycle`, and query discretionary spend against the effective
window. `computePace` / `computeCategoryPace` are unchanged.

### 4. Rewire `getInsights` (`lib/queries/insights.ts`)

Drop the reset-day walk-back. Use `getBudgetCycleRows()` +
`resolveCurrentCycle` for the current window and the **immediately preceding
salary row** for the "vs last cycle" window (`null` if none). Fall back to the
effective-cycle current window when no salary exists.

### 5. Overdue UX (Dashboard + `PaceHeadline`)

`PaceHeadline` takes `overdue`, `expectedEnd`, `remaining`. When `overdue`:
render "Salary overdue since {expectedEnd}", show `remaining` (=
`spendable − spentSoFar`), and skip the glide-path/projection. The Dashboard's
"Day X of Y" line switches to "Cycle extended · salary overdue since {date}".
Logging the salary starts a fresh cycle and normal pace resumes.

## Out of scope / unchanged

`budget_cycles` view, `resolveCurrentCycle`, Credits page, available-balance
math, and the schema all stay as-is. The reset-day setting stays; its meaning is
now "expected payday".
