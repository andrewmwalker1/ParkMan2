-- ParkMan2 -- gate editing on the Pitch/Customer/Caravan ("Unit") screen
-- behind a new can_edit_units permission (Andy, 11 Aug 2026: "there is
-- likely to be a point where parks would want some people to be able to
-- view the new 3 tab screen and not edit it"). Same shape as
-- can_edit_invoices (20-roles.sql, 21-invoicing.sql): a role_permission
-- row, checked both client-side (UnitDetail.jsx's Edit button) and here
-- via RLS, so a view-only user can't push an update through the API
-- directly either.
--
-- Only UPDATE is gated, not INSERT/DELETE/SELECT -- creating or deleting
-- whole pitch/customer/caravan records happens on other screens
-- (Pitches.jsx, Customers/Caravans "new"/"delete") that this feature
-- request didn't touch; gating those too would silently break flows this
-- change was never meant to affect. Ownership/placement *are* fully
-- gated (insert+update) since assigning/removing an owner or caravan is
-- an edit action that only ever happens from this screen.

create or replace function parkman2.has_permission(key text)
returns boolean
language sql security definer stable
set search_path = parkman2, pg_temp
as $$
  select exists (
    select 1 from parkman2.profiles pr
    join parkman2.role_permission rp on rp.role_id = pr.role_id
    where pr.id = auth.uid() and rp.permission_key = key
  );
$$;

grant execute on function parkman2.has_permission(text) to authenticated;

-- Backfill: Admin keeps the ability to edit units it already had --
-- nobody is locked out of anything they could do before this migration.
do $$
declare
  biz record;
  admin_role_id uuid;
begin
  for biz in select id from parkman2.business loop
    select id into admin_role_id from parkman2.role where business_id = biz.id and name = 'Admin';
    if admin_role_id is not null then
      insert into parkman2.role_permission (role_id, permission_key) values (admin_role_id, 'can_edit_units')
        on conflict (role_id, permission_key) do nothing;
    end if;
  end loop;
end $$;

-- Pitch ---------------------------------------------------

drop policy if exists pitch_all on parkman2.pitch;

create policy pitch_select on parkman2.pitch
  for select using (
    exists (
      select 1 from parkman2.area a join parkman2.park p on p.id = a.park_id
      where a.id = pitch.area_id and p.business_id = parkman2.current_business_id()
    )
  );

create policy pitch_insert on parkman2.pitch
  for insert with check (
    exists (
      select 1 from parkman2.area a join parkman2.park p on p.id = a.park_id
      where a.id = pitch.area_id and p.business_id = parkman2.current_business_id()
    )
  );

create policy pitch_update on parkman2.pitch
  for update using (
    exists (
      select 1 from parkman2.area a join parkman2.park p on p.id = a.park_id
      where a.id = pitch.area_id and p.business_id = parkman2.current_business_id()
    )
    and parkman2.has_permission('can_edit_units')
  )
  with check (
    exists (
      select 1 from parkman2.area a join parkman2.park p on p.id = a.park_id
      where a.id = pitch.area_id and p.business_id = parkman2.current_business_id()
    )
  );

create policy pitch_delete on parkman2.pitch
  for delete using (
    exists (
      select 1 from parkman2.area a join parkman2.park p on p.id = a.park_id
      where a.id = pitch.area_id and p.business_id = parkman2.current_business_id()
    )
  );

-- Customer ---------------------------------------------------

drop policy if exists customer_all on parkman2.customer;

create policy customer_select on parkman2.customer
  for select using (business_id = parkman2.current_business_id());

create policy customer_insert on parkman2.customer
  for insert with check (business_id = parkman2.current_business_id());

create policy customer_update on parkman2.customer
  for update using (business_id = parkman2.current_business_id() and parkman2.has_permission('can_edit_units'))
  with check (business_id = parkman2.current_business_id());

create policy customer_delete on parkman2.customer
  for delete using (business_id = parkman2.current_business_id());

-- Caravan ---------------------------------------------------

drop policy if exists caravan_all on parkman2.caravan;

create policy caravan_select on parkman2.caravan
  for select using (business_id = parkman2.current_business_id());

create policy caravan_insert on parkman2.caravan
  for insert with check (business_id = parkman2.current_business_id());

create policy caravan_update on parkman2.caravan
  for update using (business_id = parkman2.current_business_id() and parkman2.has_permission('can_edit_units'))
  with check (business_id = parkman2.current_business_id());

create policy caravan_delete on parkman2.caravan
  for delete using (business_id = parkman2.current_business_id());

-- Ownership / Placement -- only ever written to from the Unit screen's
-- Customer/Caravan tabs (assign/remove owner, assign/unsite caravan), so
-- these get the full can_edit_units gate, insert and update alike.

drop policy if exists ownership_all on parkman2.ownership;

create policy ownership_select on parkman2.ownership
  for select using (
    exists (select 1 from parkman2.caravan c where c.id = ownership.caravan_id and c.business_id = parkman2.current_business_id())
  );

create policy ownership_insert on parkman2.ownership
  for insert with check (
    exists (select 1 from parkman2.caravan c where c.id = ownership.caravan_id and c.business_id = parkman2.current_business_id())
    and parkman2.has_permission('can_edit_units')
  );

create policy ownership_update on parkman2.ownership
  for update using (
    exists (select 1 from parkman2.caravan c where c.id = ownership.caravan_id and c.business_id = parkman2.current_business_id())
    and parkman2.has_permission('can_edit_units')
  )
  with check (
    exists (select 1 from parkman2.caravan c where c.id = ownership.caravan_id and c.business_id = parkman2.current_business_id())
  );

drop policy if exists placement_all on parkman2.placement;

create policy placement_select on parkman2.placement
  for select using (
    exists (select 1 from parkman2.caravan c where c.id = placement.caravan_id and c.business_id = parkman2.current_business_id())
  );

create policy placement_insert on parkman2.placement
  for insert with check (
    exists (select 1 from parkman2.caravan c where c.id = placement.caravan_id and c.business_id = parkman2.current_business_id())
    and parkman2.has_permission('can_edit_units')
  );

create policy placement_update on parkman2.placement
  for update using (
    exists (select 1 from parkman2.caravan c where c.id = placement.caravan_id and c.business_id = parkman2.current_business_id())
    and parkman2.has_permission('can_edit_units')
  )
  with check (
    exists (select 1 from parkman2.caravan c where c.id = placement.caravan_id and c.business_id = parkman2.current_business_id())
  );

notify pgrst, 'reload schema';
