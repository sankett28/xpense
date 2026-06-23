# X-PENSE Roadmap — research-backed

Derived from a deep, adversarially-verified research pass (105 agents, 22 sources,
25 claims verified, 11 confirmed / 14 refuted). The guiding finding: **a tracker
wins on consistency and trust, not feature richness.** Apps die from feeling like
"homework." Every feature must justify its complexity cost.

## What the evidence confirmed

- **Consistency > features.** Interface/feature/category overload drives
  abandonment. (peer-reviewed HCI; HBR "Defeating Feature Fatigue")
- **Manual three-input logging is correct** — acknowledging a spend is *itself*
  the behavior-change mechanism; auto-categorization "informs but doesn't make
  you aware." (Huebner/Fleisch/Ilic 2020, field experiment)
- **Salary-anchored cycles + per-category caps are behaviorally real** (mental
  accounting; NBER w31613).
- **Dashboard's job = three questions, instantly:** *How much spent? What's left?
  What needs attention?* + category breakdown + trend + budget progress.
- **Reliable categorization = trust = retention.** Name-reuse beats bank-sync.

## What the evidence REFUTED (do not build)

- ❌ One-tap "add" button as a measurable friction reducer (1-2)
- ❌ Voice logging reduces friction (1-2)
- ❌ Recurring/subscription *report* is highest-ROI (0-3)
- ❌ "Apps abandoned in 7-14 days" / "logging takes 5-30s" stats (0-3, marketing fiction)
- ❌ Non-judgmental framing materially aids retention (only 1-2 — keep it, don't over-invest)
- Known bloat to skip: bank-sync, gamification, multi-currency, receipt OCR, shared accounts.

## Ranked backlog (value ÷ effort)

| # | Feature | Value | Effort | Status |
|---|---------|-------|--------|--------|
| 1 | Edit & delete + full searchable history (filter by category/date, search by name) | ★★★ | Low | planned |
| 2 | Dashboard = spent / left / attention + category breakdown + budget progress | ★★★ | Low-Med | planned |
| 3 | Trends over time + month-over-month comparison | ★★★ | Med | planned |
| 4 | Recurring expenses — editable, time-bound (until month X / forever), materialize per cycle | ★★ | Med | planned |
| 5 | CSV export (data ownership) | ★★ | Low | later |
| 6 | Keep categories broad (~5-8) | ★★ | ~free | ongoing |

## Recurring expense design (for #4)

- New `recurring_expenses` table: name, amount, category_id, cadence (monthly),
  `start_date`, `end_date` (null = forever), `is_active`.
- Each cycle it **materializes into a real, individually editable/deletable
  transaction** — editing one instance never touches the template.
- The template itself is editable; setting `end_date` stops future materialization.
- Framed as convenience for the owner, NOT as a headline feature (research
  downgraded recurring's ROI).

## Open questions (from research)

- Friction threshold: where does less friction stop helping consistency and start
  hurting awareness? (refuted time/tap figures left this unquantified)
- Which reports beyond category + trend do users *act on* vs ignore? (evidence thin)

## Sources (strongest)

- Huebner, Fleisch & Ilic 2020, *Computers in Human Behavior* — salience reduces spending
- HBR 2006, *Defeating Feature Fatigue*
- NBER w31613 (2023) — mental accounting / category budgets
- Li et al., *Beyond Abandonment to Next Steps* (PMC5428074) — personal-informatics lapsing
