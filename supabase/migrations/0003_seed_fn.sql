-- 0003_seed_fn.sql
-- seed_new_user: idempotent bootstrap RPC called by the app on first login.
--
-- Why an RPC instead of an auth.users trigger?
--   * It is callable with the authenticated user's own JWT, so it never needs
--     elevated cross-schema trigger privileges that Supabase locks down.
--   * Calling it on every login is safe (fully idempotent), which makes the
--     client logic trivial: just call it after sign-in and ignore the result.
--   * Easy to reason about and test from the SQL editor / supabase CLI.
--
-- SECURITY DEFINER so it can write to profiles regardless of the row that RLS
-- would otherwise restrict for a brand-new user. A fixed search_path prevents
-- search_path-injection against a SECURITY DEFINER function.

create or replace function seed_new_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- 1) Ensure a profile row exists.
  insert into profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  -- 2) Seed the 8 default categories ONLY if the user has none yet.
  if not exists (select 1 from categories where user_id = p_user_id) then
    insert into categories (user_id, name, icon, color, sort_order) values
      (p_user_id, 'Food',        'utensils-crossed', '#D26B4E', 0),
      (p_user_id, 'Transport',   'car',              '#3E4634', 1),
      (p_user_id, 'Shopping',    'shopping-bag',     '#A6AC92', 2),
      (p_user_id, 'Bills',       'receipt',          '#C8C8B2', 3),
      (p_user_id, 'Health',      'heart-pulse',      '#E3C13D', 4),
      (p_user_id, 'Investments', 'trending-up',      '#1E2318', 5),
      (p_user_id, 'Education',   'graduation-cap',   '#8A9270', 6),
      (p_user_id, 'Misc',        'shapes',           '#DAD9C6', 7);
  end if;
end;
$$;

grant execute on function seed_new_user(uuid) to authenticated;
