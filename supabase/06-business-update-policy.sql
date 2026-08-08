-- ParkMan2 -- business only had a select policy (02-rls-policies.sql);
-- the new Business admin tab needs to update it too.

drop policy if exists business_update on parkman2.business;
create policy business_update on parkman2.business
  for update using (id = parkman2.current_business_id())
  with check (id = parkman2.current_business_id());
