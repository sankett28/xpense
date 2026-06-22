-- 0002_rls.sql
-- Row Level Security: owner-only access on every table.
-- profiles is keyed by id (= auth user id); all others by user_id.

alter table profiles      enable row level security;
alter table credits       enable row level security;
alter table categories    enable row level security;
alter table expense_items enable row level security;
alter table transactions  enable row level security;

create policy "own rows" on profiles
  for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "own rows" on credits
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own rows" on categories
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own rows" on expense_items
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "own rows" on transactions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
