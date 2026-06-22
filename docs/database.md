# X-PENSE Database

Supabase / Postgres schema for the X-PENSE personal expense tracker. There is no
public signup: the database is provisioned for a small set of users you create by
hand.

## Schema overview

All user data is owned by an `auth.users` row and protected by Row Level
Security (RLS) so each user sees only their own rows.

| Table | Purpose |
| --- | --- |
| `profiles` | One row per user (`id` = `auth.users.id`). Display name, preferred `currency` (default `INR`), avatar. |
| `credits` | **Unified inflow table.** Every money-in event: salary, bonus, refund, gift, etc. The `kind` column classifies it. |
| `categories` | Spend buckets (Food, Transport, …). Optional `monthly_budget`, ordering, archive flag. |
| `expense_items` | Reusable named line items inside a category (e.g. "Coffee"). Tracks `use_count` / `last_used_at` for smart ordering and pinning. |
| `transactions` | The actual spend events. Optionally linked to an `expense_item`; always linked to a `category`. |

### Relationships

```
auth.users ──┬─< profiles (1:1, id = users.id)
             ├─< credits
             ├─< categories ──< expense_items ──< transactions
             └────────────────────────────────────^ (transactions.category_id, transactions.user_id)
```

- `expense_items.category_id` → `categories(id)` ON DELETE CASCADE
- `transactions.item_id` → `expense_items(id)` ON DELETE SET NULL (a transaction survives if its item is removed)
- `transactions.category_id` → `categories(id)` ON DELETE RESTRICT (cannot delete a category that still has spend)

### Usage trigger

`trg_bump_item_usage` runs `bump_item_usage()` AFTER INSERT on `transactions`.
When the new row has a non-null `item_id`, it increments that item's `use_count`
and sets `last_used_at = spent_at`. This keeps the "most used / most recent"
ordering used by `expense_items` cheap to query.

## Salary-anchored cycle model

A "budget cycle" is the window between one salary deposit and the next. This is
deliberately **not** a calendar month — pay dates drift, and budgeting against
the actual pay window is what users care about.

Key rule: **only `credits` with `kind = 'salary'` anchor a cycle.** All other
inflow (`bonus`, `refund`, `gift`, `interest`, …) still counts as money in, but
it never starts a new cycle.

The `budget_cycles` view encodes this. It filters to `kind = 'salary'` *before*
the window function, then uses `LEAD()` to compute each cycle's end as the day
before the next salary:

```sql
create or replace view budget_cycles as
select
  s.id          as salary_credit_id,
  s.user_id,
  s.amount      as salary_amount,
  s.credited_at as cycle_start,
  (lead(s.credited_at) over (partition by s.user_id order by s.credited_at)
     - interval '1 day')::date as cycle_end
from credits s
where s.kind = 'salary';
```

The most recent cycle has a NULL `cycle_end` (it is still open). The view is
defined with `security_invoker = true`, so it runs with the querying user's
privileges and respects RLS on the underlying `credits` table.

To find spend within a cycle, join `transactions.spent_at` against
`[cycle_start, coalesce(cycle_end, current_date)]`.

## Applying migrations

Migrations live in `supabase/migrations/` and must be applied **in order**:

1. `0001_init.sql` — tables, indexes, trigger, `budget_cycles` view
2. `0002_rls.sql` — enable RLS + owner-only policies
3. `0003_seed_fn.sql` — `seed_new_user()` RPC

### Option A — Supabase Dashboard (SQL editor)

1. Open your project → **SQL Editor** → **New query**.
2. Paste the entire contents of `0001_init.sql`, run it.
3. Repeat for `0002_rls.sql`, then `0003_seed_fn.sql`, in that order.

### Option B — Supabase CLI

```bash
# One-time: link the local project to your hosted Supabase project.
supabase link --project-ref <your-project-ref>

# Push all migrations in supabase/migrations to the linked database.
supabase db push
```

`supabase db push` applies the migration files in filename order, so the
`0001 → 0002 → 0003` sequence is preserved automatically.

## Creating the first (admin) user

There is no public signup. Create the initial user manually:

### Via the Dashboard

1. Project → **Authentication** → **Users** → **Add user**.
2. Enter email + password, confirm the user (or send an invite).

### Via the admin API / CLI (service role key)

The service role key bypasses RLS — keep it server-side only, never in the app
bundle.

```bash
curl -X POST "https://<project-ref>.supabase.co/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "email": "dev@neuralarc.ai", "password": "<strong-password>", "email_confirm": true }'
```

### First login bootstrap

After the user signs in, the app calls the `seed_new_user` RPC once. It is
idempotent (safe to call on every login):

```ts
await supabase.rpc('seed_new_user', { p_user_id: user.id });
```

This creates the user's `profiles` row (if missing) and seeds the 8 default
categories (only if the user currently has zero categories).

## Verifying RLS

RLS should make one user's rows invisible to another. Quick check:

1. Create two users (User A, User B) as above.
2. Sign in as each in two separate clients (anon key + their JWT), or generate
   two access tokens.
3. As User A, insert a credit, then have each user select from `credits`:

```sql
-- Run while authenticated as User A (e.g. via PostgREST with A's JWT):
insert into credits (user_id, amount, kind, credited_at)
values (auth.uid(), 50000, 'salary', current_date);

-- As User A: returns the row.
select count(*) from credits;   -- => 1

-- As User B (different JWT): returns nothing — A's rows are invisible.
select count(*) from credits;   -- => 0
```

You can reproduce the same JWT context inside the SQL editor for a quick smoke
test:

```sql
-- Impersonate a specific user id for one statement.
set local role authenticated;
set local request.jwt.claims = '{"sub":"<USER_A_UUID>","role":"authenticated"}';
select count(*) from credits;   -- only User A's rows

set local request.jwt.claims = '{"sub":"<USER_B_UUID>","role":"authenticated"}';
select count(*) from credits;   -- only User B's rows (should be 0 if B has none)

reset role;
```

If User B can see User A's rows, RLS is not enabled or a policy is too broad —
re-check `0002_rls.sql`.
