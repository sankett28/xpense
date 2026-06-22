# X-PENSE

A lightweight, mobile-first personal expense tracker. Logging an expense takes
under five seconds, amounts are in Indian Rupees (₹), and the budgeting period is
a **salary-anchored cycle** — not the calendar month.

Built with Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4,
Supabase (Postgres + Auth + RLS), and Recharts (charts land in a later phase).
Deploy target: Vercel.

## Core model

- **Credits** are all money in (one `credits` table). A credit of `kind = 'salary'`
  **anchors a budget cycle** starting on its credit date. Every other kind
  (freelance, bonus, refund, gift, …) counts as inflow but does **not** start a
  new cycle.
- A cycle runs from its start to the day before the next salary. The most recent
  cycle is open and runs through today.
- **Available this cycle** = total credited (salary + others) − spend in the
  cycle. Flip `AVAILABLE_FROM_SALARY_ONLY` in [`lib/config.ts`](lib/config.ts) to
  base it on salary only.
- Cycle resolution lives in [`lib/utils/cycle.ts`](lib/utils/cycle.ts) — the single
  source of truth for "which cycle am I in".

## Setup

### 1. Install

```bash
npm install
```

### 2. Environment

Copy [`.env.example`](.env.example) to `.env.local` and fill in your Supabase
project's URL and anon key (Supabase dashboard → Project Settings → API):

```bash
cp .env.example .env.local
```

### 3. Database

Apply the migrations in [`supabase/migrations/`](supabase/migrations/) in order
(`0001` → `0002` → `0003`). Either paste them into the Supabase SQL editor, or use
the CLI:

```bash
supabase link --project-ref YOUR-PROJECT-REF
supabase db push
```

Full details (schema, RLS verification, creating the first admin user) are in
[`docs/database.md`](docs/database.md).

### 4. First user (no public signup)

There is **no signup screen** — users are provisioned by you, the admin. Create
your login in the Supabase dashboard → Authentication → Add user (set "Auto
Confirm"). On first login the app seeds your profile + default categories
automatically.

### 5. Run

```bash
npm run dev          # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint
npm run build        # production build
```

## Vertical slice (Phase 1)

The end-to-end slice that proves the foundation:

1. Log a **salary** credit on `/credits` → starts the active cycle.
2. Log a **non-salary** credit (e.g. a refund) → adds to cycle inflow without
   starting a new cycle.
3. Quick-add an expense on the home screen via the fast-entry sheet.
4. The home **Available** balance updates for the current cycle, and the logged
   item floats toward the top of the quick-log strip (frequency ranking via DB
   trigger).

## Project layout

- `app/(auth)/login` — login-only auth (email + password).
- `app/(app)` — authenticated shell: Home (quick-log), Credits, plus stubs for
  Dashboard / Reports / Categories (built out in later phases).
- `components/ui` — design-system primitives. `components/quick-log` — fast-entry.
- `lib/supabase` — `@supabase/ssr` clients + session proxy.
- `lib/queries` — typed data layer. `lib/utils` — cycle / currency / date.
- `supabase/migrations` — schema, indexes, RLS, trigger, view, seed function.
