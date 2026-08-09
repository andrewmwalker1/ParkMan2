-- ParkMan2 -- VAT rates for invoice lines (Andy, 9 Aug 2026: "each
-- invoice line will need ... a vat rates (need a VAT rates table and CRUD
-- form)"). `name` matches Sage's own VAT rate names (e.g. "Standard") so
-- the Sage export can write it straight through. Business-scoped, same
-- shape as `season`/`nominal_code`.

create table if not exists parkman2.vat_rate (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  name text not null,
  rate_percent numeric(5,2) not null,
  unique (business_id, name)
);

alter table parkman2.vat_rate enable row level security;

drop policy if exists vat_rate_all on parkman2.vat_rate;
create policy vat_rate_all on parkman2.vat_rate
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

notify pgrst, 'reload schema';
