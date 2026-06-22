-- 0001_init.sql
-- X-PENSE core schema: tables, indexes, usage trigger, and salary-anchored budget_cycles view.
-- Safe to run on a clean database. Tables are created in FK-dependency order.

-- =========================================================================
-- Tables
-- =========================================================================

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  currency     text not null default 'INR',
  avatar_url   text,
  created_at   timestamptz not null default now()
);

create table credits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  amount      numeric(12,2) not null,
  kind        text not null default 'salary',
  source      text,
  credited_at date not null,
  note        text,
  created_at  timestamptz not null default now()
);

create table categories (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  name           text not null,
  icon           text,
  color          text,
  monthly_budget numeric(12,2),
  sort_order     int not null default 0,
  is_archived    boolean not null default false,
  created_at     timestamptz not null default now()
);

create table expense_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  category_id    uuid not null references categories(id) on delete cascade,
  name           text not null,
  icon           text,
  default_amount numeric(12,2),
  use_count      int not null default 0,
  last_used_at   timestamptz,
  is_pinned      boolean not null default false,
  created_at     timestamptz not null default now()
);

create table transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  item_id     uuid references expense_items(id) on delete set null,
  category_id uuid not null references categories(id) on delete restrict,
  amount      numeric(12,2) not null,
  note        text,
  spent_at    timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- =========================================================================
-- Indexes
-- =========================================================================

create index on transactions (user_id, spent_at desc);
create index on expense_items (user_id, is_pinned desc, use_count desc, last_used_at desc);
create index on credits (user_id, kind, credited_at desc);

-- =========================================================================
-- Usage trigger: bump expense_items.use_count / last_used_at on new spend
-- =========================================================================

create or replace function bump_item_usage()
returns trigger language plpgsql as $$
begin
  if new.item_id is not null then
    update expense_items
       set use_count = use_count + 1,
           last_used_at = new.spent_at
     where id = new.item_id;
  end if;
  return new;
end; $$;

create trigger trg_bump_item_usage
after insert on transactions
for each row execute function bump_item_usage();

-- =========================================================================
-- Budget cycles view
-- Only salary credits anchor cycles. Filter to kind = 'salary' BEFORE the
-- window function so non-salary inflow never starts a new cycle.
-- =========================================================================

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

alter view budget_cycles set (security_invoker = true);
