-- ParkMan2 -- RLS policies for the Phase 1 schema (01-schema.sql).
-- Run after 01-schema.sql.
--
-- Phase 1 keeps permissions simple: any authenticated staff profile can
-- read/write everything within their own business. Granular per-role
-- permissions (matching the Maintenance app's role_permissions pattern)
-- can be layered on later without a schema change -- not needed yet,
-- since Phase 1's goal is "get the data model right and usable first."

create or replace function parkman2.current_business_id()
returns uuid
language sql security definer stable
set search_path = parkman2, pg_temp
as $$
  select business_id from parkman2.profiles where id = auth.uid();
$$;

alter table parkman2.business enable row level security;
alter table parkman2.profiles enable row level security;
alter table parkman2.season enable row level security;
alter table parkman2.park enable row level security;
alter table parkman2.area enable row level security;
alter table parkman2.pitch_type enable row level security;
alter table parkman2.pitch_status enable row level security;
alter table parkman2.pitch_band enable row level security;
alter table parkman2.pitch enable row level security;
alter table parkman2.pitch_note enable row level security;
alter table parkman2.meter enable row level security;
alter table parkman2.customer enable row level security;
alter table parkman2.customer_note enable row level security;
alter table parkman2.caravan_type enable row level security;
alter table parkman2.caravan_status enable row level security;
alter table parkman2.caravan enable row level security;
alter table parkman2.ownership enable row level security;
alter table parkman2.placement enable row level security;
alter table parkman2.licence enable row level security;
alter table parkman2.insurance enable row level security;

-- Business / profiles ---------------------------------------------------

drop policy if exists business_select on parkman2.business;
create policy business_select on parkman2.business
  for select using (id = parkman2.current_business_id());

drop policy if exists profiles_select on parkman2.profiles;
create policy profiles_select on parkman2.profiles
  for select using (business_id = parkman2.current_business_id());

-- Park / Area / Season ---------------------------------------------------

drop policy if exists season_all on parkman2.season;
create policy season_all on parkman2.season
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

drop policy if exists park_all on parkman2.park;
create policy park_all on parkman2.park
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

drop policy if exists area_all on parkman2.area;
create policy area_all on parkman2.area
  for all using (
    exists (select 1 from parkman2.park p where p.id = area.park_id and p.business_id = parkman2.current_business_id())
  )
  with check (
    exists (select 1 from parkman2.park p where p.id = area.park_id and p.business_id = parkman2.current_business_id())
  );

-- Pitch lookups & Pitch ---------------------------------------------------

drop policy if exists pitch_type_all on parkman2.pitch_type;
create policy pitch_type_all on parkman2.pitch_type
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

drop policy if exists pitch_status_all on parkman2.pitch_status;
create policy pitch_status_all on parkman2.pitch_status
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

drop policy if exists pitch_band_all on parkman2.pitch_band;
create policy pitch_band_all on parkman2.pitch_band
  for all using (
    exists (
      select 1 from parkman2.area a join parkman2.park p on p.id = a.park_id
      where a.id = pitch_band.area_id and p.business_id = parkman2.current_business_id()
    )
  )
  with check (
    exists (
      select 1 from parkman2.area a join parkman2.park p on p.id = a.park_id
      where a.id = pitch_band.area_id and p.business_id = parkman2.current_business_id()
    )
  );

drop policy if exists pitch_all on parkman2.pitch;
create policy pitch_all on parkman2.pitch
  for all using (
    exists (
      select 1 from parkman2.area a join parkman2.park p on p.id = a.park_id
      where a.id = pitch.area_id and p.business_id = parkman2.current_business_id()
    )
  )
  with check (
    exists (
      select 1 from parkman2.area a join parkman2.park p on p.id = a.park_id
      where a.id = pitch.area_id and p.business_id = parkman2.current_business_id()
    )
  );

drop policy if exists pitch_note_all on parkman2.pitch_note;
create policy pitch_note_all on parkman2.pitch_note
  for all using (
    exists (
      select 1 from parkman2.pitch pt
      join parkman2.area a on a.id = pt.area_id
      join parkman2.park p on p.id = a.park_id
      where pt.id = pitch_note.pitch_id and p.business_id = parkman2.current_business_id()
    )
  )
  with check (
    exists (
      select 1 from parkman2.pitch pt
      join parkman2.area a on a.id = pt.area_id
      join parkman2.park p on p.id = a.park_id
      where pt.id = pitch_note.pitch_id and p.business_id = parkman2.current_business_id()
    )
  );

drop policy if exists meter_all on parkman2.meter;
create policy meter_all on parkman2.meter
  for all using (
    exists (
      select 1 from parkman2.pitch pt
      join parkman2.area a on a.id = pt.area_id
      join parkman2.park p on p.id = a.park_id
      where pt.id = meter.pitch_id and p.business_id = parkman2.current_business_id()
    )
  )
  with check (
    exists (
      select 1 from parkman2.pitch pt
      join parkman2.area a on a.id = pt.area_id
      join parkman2.park p on p.id = a.park_id
      where pt.id = meter.pitch_id and p.business_id = parkman2.current_business_id()
    )
  );

-- Customer ---------------------------------------------------

drop policy if exists customer_all on parkman2.customer;
create policy customer_all on parkman2.customer
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

drop policy if exists customer_note_all on parkman2.customer_note;
create policy customer_note_all on parkman2.customer_note
  for all using (
    exists (select 1 from parkman2.customer c where c.id = customer_note.customer_id and c.business_id = parkman2.current_business_id())
  )
  with check (
    exists (select 1 from parkman2.customer c where c.id = customer_note.customer_id and c.business_id = parkman2.current_business_id())
  );

-- Caravan ---------------------------------------------------

drop policy if exists caravan_type_all on parkman2.caravan_type;
create policy caravan_type_all on parkman2.caravan_type
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

drop policy if exists caravan_status_all on parkman2.caravan_status;
create policy caravan_status_all on parkman2.caravan_status
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

drop policy if exists caravan_all on parkman2.caravan;
create policy caravan_all on parkman2.caravan
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

-- Ownership / Placement ---------------------------------------------------

drop policy if exists ownership_all on parkman2.ownership;
create policy ownership_all on parkman2.ownership
  for all using (
    exists (select 1 from parkman2.caravan c where c.id = ownership.caravan_id and c.business_id = parkman2.current_business_id())
  )
  with check (
    exists (select 1 from parkman2.caravan c where c.id = ownership.caravan_id and c.business_id = parkman2.current_business_id())
  );

drop policy if exists placement_all on parkman2.placement;
create policy placement_all on parkman2.placement
  for all using (
    exists (select 1 from parkman2.caravan c where c.id = placement.caravan_id and c.business_id = parkman2.current_business_id())
  )
  with check (
    exists (select 1 from parkman2.caravan c where c.id = placement.caravan_id and c.business_id = parkman2.current_business_id())
  );

-- Licence / Insurance ---------------------------------------------------

drop policy if exists licence_all on parkman2.licence;
create policy licence_all on parkman2.licence
  for all using (
    exists (select 1 from parkman2.caravan c where c.id = licence.caravan_id and c.business_id = parkman2.current_business_id())
  )
  with check (
    exists (select 1 from parkman2.caravan c where c.id = licence.caravan_id and c.business_id = parkman2.current_business_id())
  );

drop policy if exists insurance_all on parkman2.insurance;
create policy insurance_all on parkman2.insurance
  for all using (
    exists (select 1 from parkman2.caravan c where c.id = insurance.caravan_id and c.business_id = parkman2.current_business_id())
  )
  with check (
    exists (select 1 from parkman2.caravan c where c.id = insurance.caravan_id and c.business_id = parkman2.current_business_id())
  );
