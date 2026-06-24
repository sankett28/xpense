-- 0006_trips.sql
-- Vacation mode: a date-bounded, track-only trip kept entirely separate from the
-- monthly salary cycle. Trip expenses set transactions.trip_id and are excluded
-- from all monthly-cycle spend math. At most one active trip per user.

create table trips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  start_date  date,
  end_date    date,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index on trips (user_id, is_active);

-- At most one active trip per user.
create unique index trips_one_active_per_user
  on trips (user_id) where is_active;

alter table trips enable row level security;
create policy "own rows" on trips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Link a transaction to a trip. Null = ordinary monthly spend.
alter table transactions
  add column trip_id uuid references trips(id) on delete set null;

create index on transactions (trip_id) where trip_id is not null;
