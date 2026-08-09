-- ParkMan2 -- turn Caravan.condition into a proper dropdown lookup,
-- same shape as caravan_type / caravan_status.
--
-- Andy (9 Aug 2026): asked for Condition to be a dropdown. It had been
-- a free-text field, which is exactly what nudged him into misusing
-- the Status field for New/Used in the first place -- see the
-- "Corrected (9 Aug 2026)" note in PROJECT-BRIEF.md.

create table if not exists parkman2.caravan_condition (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  name text not null,
  unique (business_id, name)
);

alter table parkman2.caravan_condition enable row level security;

drop policy if exists caravan_condition_all on parkman2.caravan_condition;
create policy caravan_condition_all on parkman2.caravan_condition
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

alter table parkman2.caravan add column if not exists condition_id uuid references parkman2.caravan_condition(id);

-- Seed a condition row for every distinct value already in use, then
-- point existing caravans at it.
insert into parkman2.caravan_condition (business_id, name)
select distinct business_id, condition from parkman2.caravan
where condition is not null and condition <> ''
on conflict (business_id, name) do nothing;

update parkman2.caravan c
set condition_id = cc.id
from parkman2.caravan_condition cc
where cc.business_id = c.business_id and cc.name = c.condition and c.condition_id is null;

alter table parkman2.caravan drop column if exists condition;

notify pgrst, 'reload schema';
