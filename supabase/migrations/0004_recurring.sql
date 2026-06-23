-- 0004_recurring.sql
-- Recurring expenses: editable, time-bound templates that materialize into real,
-- individually-editable transactions. Monthly cadence (the common case). A
-- template materializes once per calendar month from start_date until end_date
-- (null = forever), while is_active is true.

create table recurring_expenses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  category_id   uuid not null references categories(id) on delete cascade,
  name          text not null,
  amount        numeric(12,2) not null,
  day_of_month  int not null default 1,          -- 1..28 (clamped) the charge "lands" on
  start_date    date not null,
  end_date      date,                             -- null = forever
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create index on recurring_expenses (user_id, is_active);

alter table recurring_expenses enable row level security;
create policy "own rows" on recurring_expenses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Link a materialized transaction back to its template so we never double-charge
-- a month. Nullable: ordinary one-off transactions leave it null.
alter table transactions
  add column recurring_id uuid references recurring_expenses(id) on delete set null;

-- One materialization per template per calendar month. The partial unique index
-- is keyed on (recurring_id, month-start of spent_at) so re-running the
-- materializer is idempotent.
create unique index transactions_recurring_month_uniq
  on transactions (recurring_id, (date_trunc('month', spent_at)))
  where recurring_id is not null;

-- Materialize all due recurring expenses for the user, up to today. Inserts a
-- real transaction for each (template, month) that is within [start,end], at or
-- before today, and not already materialized. Idempotent (safe every visit).
create or replace function materialize_recurring(p_user_id uuid)
returns int
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  r            recurring_expenses%rowtype;
  m            date;
  charge_day   int;
  charge_date  date;
  inserted     int := 0;
begin
  for r in
    select * from recurring_expenses
    where user_id = p_user_id and is_active = true
  loop
    -- Walk each month from the start month through the current month.
    m := date_trunc('month', r.start_date)::date;
    while m <= date_trunc('month', current_date)::date loop
      -- Stop once past the end date's month.
      exit when r.end_date is not null
            and m > date_trunc('month', r.end_date)::date;

      charge_day := least(r.day_of_month, 28);
      charge_date := (m + (charge_day - 1))::date;

      -- Only materialize charges that have actually come due (<= today) and are
      -- on/after the template start.
      if charge_date <= current_date and charge_date >= r.start_date
         and (r.end_date is null or charge_date <= r.end_date) then
        insert into transactions (user_id, category_id, amount, note, spent_at, recurring_id)
        values (
          p_user_id, r.category_id, r.amount, r.name,
          (charge_date::timestamptz + interval '12 hours'), r.id
        )
        on conflict (recurring_id, (date_trunc('month', spent_at)))
          where recurring_id is not null
          do nothing;
        if found then inserted := inserted + 1; end if;
      end if;

      m := (m + interval '1 month')::date;
    end loop;
  end loop;

  return inserted;
end;
$$;

grant execute on function materialize_recurring(uuid) to authenticated;
