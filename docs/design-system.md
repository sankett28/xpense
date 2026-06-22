# X-PENSE Design System — Source of Truth

Derived from the financeux.com/vorxs reference mockups. This is the canonical
visual spec; all screens follow it. When a screen and this doc disagree, this
doc wins (and the screen is a bug).

## Feel

Mobile-first, phone-shaped. On wider screens the app is a single centered column
~440–480px wide (`max-w-[480px] mx-auto`). Editorial/Swiss: lots of negative
space, hairline rules, tiny wide-tracked uppercase labels, oversized mono
numerals, and full-bleed color blocks that bleed edge to edge.

## Palette (tokens in `app/globals.css`)

| token        | hex       | use                                            |
|--------------|-----------|------------------------------------------------|
| `bg`         | `#A6AC92` | page background, sage                           |
| `surface`    | `#DAD9C6` | cards / panels, cream                           |
| `surface-2`  | `#C8C8B2` | secondary surface                               |
| `ink`        | `#1E2318` | primary text                                    |
| `ink-soft`   | `#5C634F` | secondary text, labels, tick motif              |
| `accent`     | `#E3C13D` | mustard — primary accent, the "add"/active block|
| `alert`      | `#D26B4E` | terracotta — overrun, negative amounts, action bar |
| `dark`       | `#3E4634` | dark olive — icon tiles, color blocks           |
| `on-dark`    | `#E7E6D5` | text on dark surfaces                           |

Use the token utilities (`bg-accent`, `text-ink`, …). Never hardcode hex in
components except category colors that come from the DB.

## Type

- **Labels / UI:** Geist Sans. Labels use `.label-caps` (uppercase, 0.12em
  tracking, ~11px, `ink-soft`).
- **All numerals / amounts:** Geist Mono (`font-mono`), `tabular-nums`. Amounts
  are big and confident.
- **Display headings:** Space Grotesk (`font-display`). The signature treatment
  is **two-weight**: first line muted/medium, second line bold ink — e.g.
  "Add your" (medium, `ink-soft`) / "Budget Category" (bold, `ink`). Use the
  `DisplayHeading` component.

## Amounts

- Currency is INR. Display **whole rupees** via `formatINR` → `₹1,894`
  (no decimals). Storage keeps paise. (The mockups show `$1,894.0`; we use ₹ and
  drop the trailing `.0` per product decision.)
- Negative / overrun amounts render in `alert` (terracotta).
- Always `font-mono tabular-nums`.

## Signature components

- **`AmountText`** — the one way to render money. `font-mono tabular-nums`,
  size prop (`sm | md | lg | hero`), `tone` (`ink | on-dark | alert | auto`
  where `auto` → alert when negative).
- **`Hero`** — `.label-caps` label above one oversized `AmountText` (hero size).
  Sits on the page bg (not a rounded card). The right/empty space carries the
  `.tick-motif`.
- **`StatRow`** — a label + amount with a top hairline rule (`BUDGET ₹2,045`,
  `LEFT ₹1,894`), tick motif allowed behind the value.
- **`ColorBlock`** — full-bleed (edge-to-edge, no horizontal margin, no rounded
  corners) colored section. Variants: `accent` (the add block), `alert`
  (overrun), `dark` (olive). Holds a small caps label top-left and an amount
  bottom-right; can hold a centered giant `+`.
- **`DisplayHeading`** — two-line Space Grotesk heading (muted line + bold line).
- **`IconTile`** — square olive (`bg-dark text-on-dark`) tile. In transaction
  lists it may carry a colored left-edge accent bar.
- **`TransactionRow`** — IconTile left (optional edge accent), name + small caps
  category, amount + time right (mono). A list ends with a centered "SHOW MORE"
  pill when truncated.

## Layout rules

- Full-bleed color blocks must escape the column padding: the app `<main>` has
  `px-4`, so blocks use a `-mx-4` bleed wrapper (`FullBleed`) to reach the column
  edges.
- Hairline dividers: `border-ink-soft/20` (or `divide-ink-soft/15` in lists).
- Tick motif (`.tick-motif`) fills empty horizontal space beside large figures.
- Generous vertical rhythm: section gaps `mt-8`, intra-section `gap-3/4`.

## Screen blueprints

- **Home** — TopBar · Hero (AVAILABLE … BUDGET) · StatRows (BUDGET / LEFT) with
  tick motif · quick-log strip · ColorBlock for overrun/highlight when relevant ·
  recent transactions.
- **Credits** — DisplayHeading · current-cycle definition · credit form ·
  grouped history (salary anchors vs other).
- **Categories** — DisplayHeading ("Add your / Budget Category") · stacked
  full-bleed ColorBlocks per category (name top-left, budget bottom-right) · the
  active/add block is mustard with a centered `+`.
- **Dashboard** — budget vs left, per-category bars, recent, and the radial
  "TOTAL SPENT" line-burst (custom SVG, later phase).
- **Reports** — range toggle (Week/Month/Quarter) · charts (later phase).
- **Transaction detail** (later) — centered IconTile · big negative amount ·
  hairline spec table · terracotta full-bleed action bar.
