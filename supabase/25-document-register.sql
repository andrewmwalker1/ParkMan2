-- ParkMan2 -- document register, stored in Supabase Storage rather than
-- on a shared local drive (Andy, 11 Aug 2026: "nothing else needs to
-- access the documents... make browsing easy we could have a list of
-- documents in the app with a viewer" -- superseding the local-drive
-- approach from earlier the same day, which needed a folder connected
-- per browser/device and broke if a shared drive was mapped to a
-- different letter on different PCs). Covers both letters generated via
-- a template and existing documents (scans, PDFs, photos) imported
-- into a customer's record -- `source` distinguishes the two.

create table if not exists parkman2.document_register (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  customer_id uuid not null references parkman2.customer(id) on delete cascade,
  description text not null,
  file_name text not null,
  mime_type text,
  storage_path text not null,
  source text not null default 'generated' check (source in ('generated', 'imported')),
  created_by_profile_id uuid references parkman2.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table parkman2.document_register enable row level security;

drop policy if exists document_register_all on parkman2.document_register;
create policy document_register_all on parkman2.document_register
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

insert into storage.buckets (id, name, public)
  values ('customer-documents', 'customer-documents', false)
  on conflict (id) do nothing;

-- Objects are stored as `{business_id}/{customer_id}/{filename}` -- the
-- first path segment is how access is scoped, same as letter-templates.
drop policy if exists customer_documents_select on storage.objects;
create policy customer_documents_select on storage.objects
  for select using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = parkman2.current_business_id()::text
  );

drop policy if exists customer_documents_insert on storage.objects;
create policy customer_documents_insert on storage.objects
  for insert with check (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = parkman2.current_business_id()::text
  );

drop policy if exists customer_documents_delete on storage.objects;
create policy customer_documents_delete on storage.objects
  for delete using (
    bucket_id = 'customer-documents'
    and (storage.foldername(name))[1] = parkman2.current_business_id()::text
  );

notify pgrst, 'reload schema';
