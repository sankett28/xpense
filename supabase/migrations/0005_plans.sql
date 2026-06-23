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
