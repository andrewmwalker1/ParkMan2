-- ParkMan2 -- minimal roles/permissions, needed to gate invoice editing
-- by "user rights" (Andy, 9 Aug 2026). Reuses the shape already documented
-- in PROJECT-BRIEF.md as the intended pattern ahead of the eventual
-- Maintenance merge -- a data-driven Role lookup + named permission keys
-- (role_permission, presence = granted), matching Maintenance's own
-- role_permissions -- rather than a hardcoded enum. Only the one
-- permission needed today (can_edit_invoices) is wired up; the broader
-- "which tabs/sections a role can see" system stays deliberately
-- deferred, per that same brief section.

create table if not exists parkman2.role (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  name text not null,
  unique (business_id, name)
);

create table if not exists parkman2.role_permission (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references parkman2.role(id) on delete cascade,
  permission_key text not null,
  unique (role_id, permission_key)
);

alter table parkman2.profiles add column if not exists role_id uuid references parkman2.role(id) on delete set null;

alter table parkman2.role enable row level security;
alter table parkman2.role_permission enable row level security;

drop policy if exists role_all on parkman2.role;
create policy role_all on parkman2.role
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

drop policy if exists role_permission_all on parkman2.role_permission;
create policy role_permission_all on parkman2.role_permission
  for all using (
    exists (select 1 from parkman2.role r where r.id = role_permission.role_id and r.business_id = parkman2.current_business_id())
  )
  with check (
    exists (select 1 from parkman2.role r where r.id = role_permission.role_id and r.business_id = parkman2.current_business_id())
  );

-- Backfill: every existing business gets 'Admin' and 'Staff' roles, Admin
-- gets can_edit_invoices, and every existing profile becomes Admin --
-- nobody is locked out of anything they could already do before this
-- migration.
do $$
declare
  biz record;
  admin_role_id uuid;
begin
  for biz in select id from parkman2.business loop
    insert into parkman2.role (business_id, name) values (biz.id, 'Admin')
      on conflict (business_id, name) do nothing;
    insert into parkman2.role (business_id, name) values (biz.id, 'Staff')
      on conflict (business_id, name) do nothing;

    select id into admin_role_id from parkman2.role where business_id = biz.id and name = 'Admin';

    insert into parkman2.role_permission (role_id, permission_key) values (admin_role_id, 'can_edit_invoices')
      on conflict (role_id, permission_key) do nothing;

    update parkman2.profiles set role_id = admin_role_id
      where business_id = biz.id and role_id is null;
  end loop;
end $$;

-- Surface role_id/role name alongside the rest of the Users tab's data --
-- profiles has no direct visibility of other business members' roles
-- without this, same reasoning as why list_business_users() exists at all
-- (profiles has no email column either, that lives on auth.users).
drop function if exists parkman2.list_business_users();
create or replace function parkman2.list_business_users()
returns table (
  id uuid,
  display_name text,
  is_active boolean,
  email text,
  role_id uuid,
  role_name text
)
language sql security definer stable
set search_path = parkman2, pg_temp
as $$
  select p.id, p.display_name, p.is_active, u.email, p.role_id, r.name
  from parkman2.profiles p
  join auth.users u on u.id = p.id
  left join parkman2.role r on r.id = p.role_id
  where p.business_id = parkman2.current_business_id()
  order by p.display_name;
$$;

grant execute on function parkman2.list_business_users() to authenticated;

notify pgrst, 'reload schema';
