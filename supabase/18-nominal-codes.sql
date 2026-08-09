-- ParkMan2 -- chart-of-accounts style lookup for invoice lines (Andy,
-- 9 Aug 2026: "to link with sage we will need to add a nominal account
-- against every invoice line. A table of nominals with their description
-- would be a good idea"). Business-scoped, same shape as `season`.

create table if not exists parkman2.nominal_code (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  code text not null,
  name text not null,
  unique (business_id, code)
);

alter table parkman2.nominal_code enable row level security;

drop policy if exists nominal_code_all on parkman2.nominal_code;
create policy nominal_code_all on parkman2.nominal_code
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

notify pgrst, 'reload schema';
