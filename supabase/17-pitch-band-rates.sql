-- ParkMan2 -- annual rate for a Pitch band, per year. Separate from
-- pitch_band itself (Andy, 9 Aug 2026: "the pitch bands need setting up
-- and applying to pitches ... the word document has the pitch band rates
-- for the 2026 season") since a band's rate changes every season while the
-- band itself (its area, its code) doesn't.

create table if not exists parkman2.pitch_band_rate (
  id uuid primary key default gen_random_uuid(),
  pitch_band_id uuid not null references parkman2.pitch_band(id) on delete cascade,
  year int not null,
  annual_fee numeric(10,2) not null,
  unique (pitch_band_id, year)
);

alter table parkman2.pitch_band_rate enable row level security;

drop policy if exists pitch_band_rate_all on parkman2.pitch_band_rate;
create policy pitch_band_rate_all on parkman2.pitch_band_rate
  for all using (
    exists (
      select 1 from parkman2.pitch_band pb
      join parkman2.area a on a.id = pb.area_id
      join parkman2.park p on p.id = a.park_id
      where pb.id = pitch_band_rate.pitch_band_id and p.business_id = parkman2.current_business_id()
    )
  )
  with check (
    exists (
      select 1 from parkman2.pitch_band pb
      join parkman2.area a on a.id = pb.area_id
      join parkman2.park p on p.id = a.park_id
      where pb.id = pitch_band_rate.pitch_band_id and p.business_id = parkman2.current_business_id()
    )
  );

notify pgrst, 'reload schema';
