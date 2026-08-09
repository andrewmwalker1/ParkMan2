-- ParkMan2 -- user admin (invite / edit / deactivate), same shape as
-- the Users tab in Hub and Maintenance.
--
-- Andy: wants a screen to invite/manage staff logins, not just have
-- them added by hand via the dashboard. Phase 1 has no roles or
-- per-section permissions yet (see PROJECT-BRIEF.md), so unlike
-- Maintenance's version this has no role/site scoping -- any signed-in
-- user can reach Admin today, same as every other tab there.

-- 03-expose-schema.sql only granted `authenticated` access to the
-- parkman2 schema -- service_role bypasses RLS but still needs its own
-- ordinary GRANTs, so the Edge Function above (running as service_role)
-- got "permission denied for schema parkman2" reading profiles until
-- this was added.
grant usage on schema parkman2 to service_role;
grant select, insert, update, delete on all tables in schema parkman2 to service_role;
alter default privileges in schema parkman2
  grant select, insert, update, delete on tables to service_role;

-- profiles has no update policy yet (nothing needed one before this).
-- Business-scoped, not permission-gated, matching the rest of Admin.
drop policy if exists profiles_update_business on parkman2.profiles;
create policy profiles_update_business on parkman2.profiles
  for update using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

-- profiles has no email column -- it lives on auth.users, which RLS
-- can't reach directly. security definer so it can read auth.users,
-- but it only ever returns rows for the caller's own business.
create or replace function parkman2.list_business_users()
returns table (
  id uuid,
  display_name text,
  is_active boolean,
  email text
)
language sql security definer stable
set search_path = parkman2, pg_temp
as $$
  select p.id, p.display_name, p.is_active, u.email
  from parkman2.profiles p
  join auth.users u on u.id = p.id
  where p.business_id = parkman2.current_business_id()
  order by p.display_name;
$$;

grant execute on function parkman2.list_business_users() to authenticated;

notify pgrst, 'reload schema';
