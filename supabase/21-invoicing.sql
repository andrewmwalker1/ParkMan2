-- ParkMan2 -- invoices, for one-off charges (repairs, meter readings,
-- pitch fees) ahead of a future batch-invoicing run. Andy, 9 Aug 2026:
-- "We need to be able to create one off invoices for repairs, for meter
-- reading, for pitch fees ... build an export to Sage Accounting."
--
-- pitch_id is required, not customer_id: confirmed with Andy that Sage's
-- "Customer Reference" is always the Pitch number, ground-rent style --
-- the Sage account persists regardless of who currently owns the caravan
-- on it. customer_id is kept too, but only for convenience/reporting.
--
-- bill_to_name/bill_to_address are snapshotted at creation time rather
-- than living-joined from Customer, because ownership can change over the
-- life of a caravan on a pitch -- a printed invoice from 2 years ago must
-- still show who it was actually billed to at the time, same reasoning as
-- why Ownership/Placement are append-only history rather than mutable
-- current-state columns.

create table if not exists parkman2.invoice (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  pitch_id uuid not null references parkman2.pitch(id),
  customer_id uuid references parkman2.customer(id) on delete set null,
  invoice_number bigint generated always as identity,
  invoice_date date not null default current_date,
  due_date date,
  reference text,
  status text not null default 'draft' check (status in ('draft', 'issued', 'void')),
  bill_to_name text,
  bill_to_address text,
  notes text,
  total_net numeric(10,2) not null default 0,
  total_vat numeric(10,2) not null default 0,
  total_gross numeric(10,2) not null default 0,
  created_by uuid references parkman2.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists parkman2.invoice_line (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references parkman2.invoice(id) on delete cascade,
  nominal_code_id uuid not null references parkman2.nominal_code(id),
  description text not null,
  net_amount numeric(10,2) not null,
  vat_rate_id uuid not null references parkman2.vat_rate(id),
  vat_amount numeric(10,2) not null,
  gross_amount numeric(10,2) not null,
  sort_order int not null default 0
);

alter table parkman2.invoice enable row level security;
alter table parkman2.invoice_line enable row level security;

-- View always open to any signed-in business member, matching how the
-- rest of the app works today. Editing (insert/update/delete on a
-- specific invoice or its lines) is open while the invoice is still
-- 'draft' -- not yet a real financial document, freely editable by
-- whoever's building it -- and requires can_edit_invoices once it's
-- 'issued' or 'void'. (An earlier version of this policy tried to detect
-- "is this invoice_line insert part of the initial batch" by querying
-- invoice_line from within its own policy -- Postgres rejects that as
-- "infinite recursion detected in policy". Keying off the parent
-- invoice's status instead avoids the self-reference and is a cleaner
-- rule anyway.)
drop policy if exists invoice_select on parkman2.invoice;
create policy invoice_select on parkman2.invoice
  for select using (business_id = parkman2.current_business_id());

drop policy if exists invoice_insert on parkman2.invoice;
create policy invoice_insert on parkman2.invoice
  for insert with check (business_id = parkman2.current_business_id());

drop policy if exists invoice_update on parkman2.invoice;
create policy invoice_update on parkman2.invoice
  for update using (
    business_id = parkman2.current_business_id()
    and (
      status = 'draft'
      or exists (
        select 1 from parkman2.profiles pr
        join parkman2.role_permission rp on rp.role_id = pr.role_id
        where pr.id = auth.uid() and rp.permission_key = 'can_edit_invoices'
      )
    )
  )
  with check (business_id = parkman2.current_business_id());

drop policy if exists invoice_delete on parkman2.invoice;
create policy invoice_delete on parkman2.invoice
  for delete using (
    business_id = parkman2.current_business_id()
    and (
      status = 'draft'
      or exists (
        select 1 from parkman2.profiles pr
        join parkman2.role_permission rp on rp.role_id = pr.role_id
        where pr.id = auth.uid() and rp.permission_key = 'can_edit_invoices'
      )
    )
  );

drop policy if exists invoice_line_select on parkman2.invoice_line;
create policy invoice_line_select on parkman2.invoice_line
  for select using (
    exists (select 1 from parkman2.invoice i where i.id = invoice_line.invoice_id and i.business_id = parkman2.current_business_id())
  );

drop policy if exists invoice_line_insert on parkman2.invoice_line;
create policy invoice_line_insert on parkman2.invoice_line
  for insert with check (
    exists (
      select 1 from parkman2.invoice i
      where i.id = invoice_line.invoice_id and i.business_id = parkman2.current_business_id()
      and (
        i.status = 'draft'
        or exists (
          select 1 from parkman2.profiles pr
          join parkman2.role_permission rp on rp.role_id = pr.role_id
          where pr.id = auth.uid() and rp.permission_key = 'can_edit_invoices'
        )
      )
    )
  );

drop policy if exists invoice_line_update on parkman2.invoice_line;
create policy invoice_line_update on parkman2.invoice_line
  for update using (
    exists (
      select 1 from parkman2.invoice i
      where i.id = invoice_line.invoice_id and i.business_id = parkman2.current_business_id()
      and (
        i.status = 'draft'
        or exists (
          select 1 from parkman2.profiles pr
          join parkman2.role_permission rp on rp.role_id = pr.role_id
          where pr.id = auth.uid() and rp.permission_key = 'can_edit_invoices'
        )
      )
    )
  )
  with check (
    exists (select 1 from parkman2.invoice i where i.id = invoice_line.invoice_id and i.business_id = parkman2.current_business_id())
  );

drop policy if exists invoice_line_delete on parkman2.invoice_line;
create policy invoice_line_delete on parkman2.invoice_line
  for delete using (
    exists (
      select 1 from parkman2.invoice i
      where i.id = invoice_line.invoice_id and i.business_id = parkman2.current_business_id()
      and (
        i.status = 'draft'
        or exists (
          select 1 from parkman2.profiles pr
          join parkman2.role_permission rp on rp.role_id = pr.role_id
          where pr.id = auth.uid() and rp.permission_key = 'can_edit_invoices'
        )
      )
    )
  );

notify pgrst, 'reload schema';
