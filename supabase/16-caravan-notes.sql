-- ParkMan2 -- notes on a Caravan, same shape as customer_note/pitch_note
-- (both already existed; caravan_note was the missing one -- Andy,
-- 9 Aug 2026: "We need to add notes functionality to the customer, the
-- caravan and the pitch").

create table if not exists parkman2.caravan_note (
  id uuid primary key default gen_random_uuid(),
  caravan_id uuid not null references parkman2.caravan(id) on delete cascade,
  text text not null,
  actor_profile_id uuid references parkman2.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table parkman2.caravan_note enable row level security;

drop policy if exists caravan_note_all on parkman2.caravan_note;
create policy caravan_note_all on parkman2.caravan_note
  for all using (
    exists (select 1 from parkman2.caravan c where c.id = caravan_note.caravan_id and c.business_id = parkman2.current_business_id())
  )
  with check (
    exists (select 1 from parkman2.caravan c where c.id = caravan_note.caravan_id and c.business_id = parkman2.current_business_id())
  );

notify pgrst, 'reload schema';
