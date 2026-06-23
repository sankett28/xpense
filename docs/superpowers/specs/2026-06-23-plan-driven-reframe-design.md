# X-pense — Plan-Driven Reframe

**Date:** 2026-06-23
**Status:** Design approved, ready for implementation planning
**Branch:** phase-1-redesign

## Why

The app today is excellent at **recording the past** (what was spent, what's left right
now) but the user's actual problem is the **future**: money gets spent freely early in the
month and runs short mid-cycle. That is a *pacing and planning* problem, not a tracking
problem.

The user works with a financial advisor and wants to **author a deliberate monthly budget
plan** — set a salary, allocate per-category allowances (e.g. ₹4k food, ₹4k petrol, ₹1k
subscriptions, ₹2k misc), and then follow it. The app's job is to measure spending against
that plan and answer one question on every glance:

> **"Am I on pace to end this cycle with money saved?"**

The reframe keeps the existing screens and logging flow, rebuilds Home, Dashboard, and
Reports around the plan, and adds a Plan screen as the new centerpiece. It also adopts a
**brand-new visual identity** ("Quiet Instrument") — see the Visual Design Direction section.
The previous sage/cream/mustard editorial design system is replaced.

> Note: the ASCII screen sketches further down predate the visual redesign and describe
> *information layout* (what's on each screen), not the final look. The Visual Design
> Direction section is the source of truth for palette, type, and the signature element;
> apply it to every screen.

## Decisions (from brainstorming)

| Topic | Decision |
|---|---|
| North-star metric | **On pace / off pace** with a projection ("at this rate you land at ₹Y") |
| Plan structure | **Savings goal + per-category caps**; start simple, layer caps over time |
| Nudge style | **Calm & factual** — show the truth, no alarms or nagging; intelligence goes into the projection, not warnings |
| Insight types | **Spending patterns** (when/how you slip) + **streaks & wins** (gamified motivation) |
| What trips the user up | Small stuff adding up, impulse big buys, forgotten fixed costs, no buffer for surprises — so committed costs & buffer must be reserved upfront |
| Income handling | **Salary set once in the plan**, changes only when the plan is edited. No payday-by-payday logging, no salary-anchored cycles. |
| Cycle | **Calendar-based** with a user-set reset day (e.g. 1st, or their payday date) |
| Credits | **Demoted** to optional "extra income" that raises spendable; not prominent, no anchoring |
| Plans & time | **One active reusable plan**; user can save multiple named plans ("Normal month", "Tight month") and switch the active one |
| Mid-cycle plan edits | **Apply to the current cycle immediately** — pace recalculates against new allowances |
| Categories vs allowances | **Merged into Plan** — allowances *are* the categories; the standalone Categories screen is removed |
| Scope | **Reframe around the plan** — keep screens & design system, rebuild Home/Dashboard/Reports |

## The mental model (the math)

When a cycle is active, the plan defines:

```
Income (salary, from plan)
 − Savings goal        ← committed to keep (or derived: salary − allowances − buffer)
 − Committed costs     ← recurring bills/EMIs not yet paid this cycle, reserved upfront
 − Buffer (optional)   ← sinking fund for surprises
 ─────────────────────
 = Spendable           ← truly discretionary money
```

From **Spendable** and the active plan, derive:

- **Pace** = `spent-so-far` vs `expected-by-today`, where
  `expected = spendable × days_elapsed / days_in_cycle`.
  Yields the *ahead / on pace / behind* verdict.
- **Projection** = `spent-so-far / days_elapsed × days_in_cycle`.
  Yields *"at this rate you land at ₹Y"* — both overall and per category.
- **Safe to spend today** = `remaining_discretionary / days_remaining`.
- **Projected savings** = `salary − projected_total_spend − committed − buffer`, compared to
  the savings goal.

**Honesty rule:** committed recurring costs are reserved upfront, not counted as overspend
when they hit mid-cycle. So daily "safe to spend" reflects real discretionary money. This
directly addresses forgotten fixed costs and the no-buffer problem.

**Verdicts and tone:** all calm and factual. Off-pace flips the label ("AHEAD OF PLAN" /
"BEHIND PLAN") and turns the projected-savings figure terracotta when it dips below goal.
No warnings, modals, or nagging.

**Data sufficiency:** patterns and projections are only shown once there is enough data to
compute them honestly (e.g. a few days into the cycle, a prior cycle for comparison). No
fabricated early insights.

## Screens

### Plan (new — centerpiece)

Where the user sits down and authors the budget.

```
Your active plan
"Normal month"                 [switch ▾]

MONTHLY SALARY                    ₹60,000   ← tap to edit
───────────────────────────────────────────
ALLOWANCES
 🍔 Food            ₹4,000  ›               ← each row editable (amount, icon, color)
 ⛽ Petrol          ₹4,000  ›
 📺 Subscriptions   ₹1,000  ›
 🛍 Misc            ₹2,000  ›
 + Add allowance
───────────────────────────────────────────
Allocated                         ₹11,000
Savings goal                      ₹45,000   ← salary − allocated − buffer (live)
Buffer (optional)                  ₹4,000
═══════════════════════════════════════════
[ Save plan ]   [ Save as new ]
```

- Savings goal computed **live** as allowances/buffer change — the planning feedback loop.
- **Save as new** clones the current plan under a new name; user builds 3–4 plans once and
  switches the active one.
- If allowances exceed salary, the savings figure goes terracotta and reads "₹X over" —
  calm, factual, not blocking.
- Category management (icon, color, archive) folds into the allowance rows here. No separate
  Categories screen.

### Home (reframed)

Logging hero (**+** button, frequent chips) is unchanged. The hero above it answers pace.

```
Good evening, Sanket

ON PACE                                     ← verdict label
Projected to save        ₹43,200            ← headline: where you LAND
Goal ₹45,000 · ₹1,800 under                 ← honest gap
───────────────────────────────────────────
Spent today              ₹420
Spent this cycle         ₹8,900             ← today + to-date both present
Safe to spend today      ₹1,150

        ╭───────────╮
        │     +     │                       ← unchanged logging hero
        ╰───────────╯
  ☕Chai   🍔Lunch   ⛽Fuel                  ← frequent chips, unchanged
```

- Headline = **projection** (where you land); label = **pace verdict**.
- Today, to-date, and safe-to-spend sit directly below — present and future in one glance.
- Off-pace flips the label and tints projected-savings terracotta when below goal.

### Dashboard (reframed — per-category pace)

Answers "where is it leaking?" Categories trending over float to the top.

```
This cycle · Day 18 of 30

PROJECTED SAVINGS        ₹43,200            ← roll-up, matches Home
Goal ₹45,000
───────────────────────────────────────────
ON PACE BY CATEGORY

🍔 Food      ●━━━━━━━━░░  ahead             ← bar = spent vs allowance
   ₹2,600 / ₹4,000 · proj ₹4,330           ← per-category projection
⛽ Petrol    ●━━━━━━━━━━━ over              ← terracotta when projected over
   ₹3,800 / ₹4,000 · proj ₹6,330
📺 Subs      ●━━░░░░░░░░  under
   ₹1,000 / ₹1,000 · proj ₹1,000
───────────────────────────────────────────
Recent                          [see all ›]
 🍔 Lunch       ₹220   2:30 PM
```

Replaces the old "In / Out / Left" stat with a per-category pace view mapped to the plan.

### Reports & Insights (reframed — patterns + wins)

Two halves: patterns (learn) and streaks/wins (motivate).

```
Your insights                    [W M Q ▾]

── PROGRESS ──────────────────────────────
Saved this cycle         ₹43,200
vs last cycle            ▲ ₹5,400           ← are you improving?
🔥 3 cycles on goal                          ← streak / win
───────────────────────────────────────────
── WHAT THE NUMBERS SAY ──────────────────
"You overspend most on weekends"            ← plain-language pattern
 Sat–Sun avg ₹1,400/day vs ₹620 weekdays
"Week 1 is your heavy week"                 ← timing pattern
 38% of spend lands in days 1–7
"Petrol broke plan 2 cycles"                ← recurring leak
───────────────────────────────────────────
── WHERE IT WENT ─────────────────────────
🍔 Food      ████████  ₹4,330               ← category bars, biggest first
⛽ Petrol    ██████    ₹3,800
```

- **Progress**: saved this cycle, vs last cycle, streak count.
- **What the numbers say**: 2–3 plain-language patterns computed from data (when the user
  slips: weekends, week 1; what repeatedly breaks plan: petrol). Only shown with enough data.
- **Where it went**: category breakdown, biggest first.
- Every insight is a real sentence, not a chart to interpret.

### Unchanged / demoted

| Screen | Disposition |
|---|---|
| **History** | Unchanged — searchable log, tap to edit/delete |
| **Recurring** | Kept — committed costs feed the model, reserved upfront |
| **Credits** | Demoted to an optional "add extra income" action; reachable, not prominent; raises spendable |
| **Categories** | Removed — merged into Plan |

Navigation: existing top-bar dot-menu retained; **Plan** added near the top.

## Data model changes

Building on the existing Supabase schema:

- **New `plans` table:** `id`, `user_id`, `name`, `salary`, `buffer`, `is_active`,
  `created_at`, `updated_at`. Exactly one active plan per user.
- **New `plan_allowances` table** (or embed as rows): `id`, `plan_id`, `category_id`,
  `amount`. Allowances become the source of truth for category budgets, replacing reliance
  on `categories.monthly_budget`.
- **Cycle becomes calendar-based:** a user-set `cycle_reset_day` (stored on profile or plan)
  defines the `[start, end)` window. The salary-anchored `budget_cycles` view and salary-
  credit anchoring logic are simplified/removed.
- **Categories:** retain `categories` table for name/icon/color/archive; budget amount now
  lives in `plan_allowances`. Migrate existing `monthly_budget` values into the active plan
  on rollout.
- **Derived calculations** (pace, projection, safe-to-spend, projected savings) live in a
  **new query module** computing math over transactions + active plan. No new stored data
  for these.
- **Patterns & streaks** computed from transaction history grouped per cycle (day-of-week
  aggregation, week-of-cycle aggregation, per-cycle goal-hit history). May warrant a small
  cached/materialized summary if computation is heavy, but start with on-the-fly queries.

## Visual Design Direction — "Quiet Instrument"

A full new identity (the prior sage/cream/mustard editorial system is replaced). The thesis:
**this app is a glide-path instrument, not a ledger.** Every screen answers "will I land
safe?" The interface stays dark, quiet, and precise so the one signal — your pace — does the
talking. Boldness is spent in exactly one place: the Glide Path and the single accent hue
that shifts with trajectory.

Built with `/frontend-design`. Deliberately avoids the three AI-default looks (cream/serif/
terracotta editorial, neon-on-black, broadsheet). The justified risk is the **variable pace
hue** — one accent whose color *is* the verdict — which directly serves the "calm & factual,
no alarms" requirement.

### Color tokens

| Token | Hex | Role |
|---|---|---|
| `canvas` | `#16181D` | Near-black charcoal page — the instrument panel |
| `panel` | `#1E2128` | Raised surfaces / cards, barely lifted |
| `hairline` | `#2C303A` | Dividers, gauge tracks |
| `ink` | `#F2F0E9` | Warm off-white — primary numerals & text |
| `ink-dim` | `#8A8F9C` | Labels, captions, small-caps |
| `pace-good` | `#5BD6C0` | Calm cyan-teal — on / ahead of pace |
| `pace-warn` | `#E0A33E` | Warm amber — drifting / projected slightly over |
| `pace-over` | `#E0653E` | Soft ember — meaningfully over (used sparingly) |

The accent is **one variable hue** that interpolates `good → warn → over` based on the
projection. It never flashes or alarms; it just *is* the right color. This is the entire
emotional system in one channel. `pace-over` is reserved for the single headline number when
truly over — never on small/decorative elements (keeps it meaningful).

### Typography

- **Numerals (hero):** a tight, low-contrast grotesk or mono at light weight, large size,
  `tabular-nums`. The number is the hero of every screen. (Candidates: Geist light weights,
  or a character mono like Commit Mono for the instrument feel — finalize at build time.)
- **Labels:** small-caps, wide tracking (~0.14em), `ink-dim` — like gauge markings.
- **Body / insight sentences:** a clean humanist sans (Inter or Geist Sans) at comfortable
  reading size for plain-language insights.

Personality: instrument markings meet a beautifully-set number. Not editorial-magazine, not
friendly-rounded — precise.

### Signature element — the Glide Path

A horizontal track with two marks: a **tick** for "where you should be today" (expected) and
a **dot** for "where you actually are."

```
        expected
           │
  ─────────●──────────────      dot LEFT of tick = under pace (pace-good)
          you

  ──────────────────●─────      dot RIGHT of tick = over pace (pace-warn/over)
                    │
                expected
```

The track and dot share the live pace hue. Three sizes of the same element:
- **Home:** full-width hero, under the projected-savings number.
- **Dashboard:** one compact strip per category.
- Reused anywhere pace is shown. This repetition *is* the brand.

### Layout & motion

- Dark canvas; content in a centered phone column; generous vertical rhythm.
- On load: numerals **count up** to value and the glide-path dot **slides** to position once
  — a single orchestrated moment, not scattered effects.
- `prefers-reduced-motion`: no count-up, dot appears in place.

### Accessibility (quality floor, non-negotiable)

- WCAG AA contrast for all text (off-white `#F2F0E9` on charcoal `#16181D` clears it).
- Pace state is **never conveyed by color alone** — always paired with a text label
  ("ON PACE" / "OVER") and the dot's position on the track, so it's legible to color-blind
  users and screen readers.
- Touch targets ≥44px; visible keyboard focus rings (in `pace-good`); full keyboard
  operability of the keypad, sheets, and plan editor.
- Glide Path exposes an `aria-label` summarizing pace in words; numerals announce final
  values (not the count-up animation) to assistive tech.
- Respects `prefers-reduced-motion` and `prefers-contrast`.

### Component implications

- The existing `app/globals.css` palette and primitives (`SpendCard`, `ColorBlock`,
  `BudgetBar`, `CategoryBars`, `IconTile`, etc.) are **restyled or replaced** to the new
  tokens. Plan a token migration in `globals.css` first, then update primitives.
- New shared primitive: **`GlidePath`** (the signature), with `size` (hero / row) and a
  `pace` value that drives hue + dot/tick positions.
- A `pace-hue` helper maps a projection ratio → interpolated accent color, used everywhere.

## Out of scope (YAGNI)

- Bank sync / auto-import.
- Multi-currency (INR only, as today).
- Investments/savings *accounts* tracking — the plan's savings goal is a target to keep
  under expenses, not a portfolio tracker.
- Scheduled per-month plan overrides (the "active plan + scheduled overrides" option was
  declined in favor of one active reusable plan).
- Heavy gamification beyond streaks & cycle-over-cycle progress.
- Predictive/ML insights — patterns are simple, explainable aggregations only.

## Open questions for implementation planning

- Exact `cycle_reset_day` storage location (profile vs plan) and handling of months with
  fewer days than the reset day (e.g. reset day 31 in February).
- Migration path for existing `categories.monthly_budget` → active plan allowances.
- Whether committed-cost reservation counts a recurring expense as committed for the whole
  cycle or only its unpaid remainder once materialized.
- Minimum data thresholds for showing each pattern/projection honestly.
