-- ParkMan2 -- letter templates + a shared documents folder (Andy, 11 Aug
-- 2026: "can we select from existing template letters... a document that
-- includes our letterhead as a background?" plus generating letters onto
-- a shared drive filed by customer/pitch).
--
-- Letters are merged client-side (docxtemplater) from a .docx template
-- stored in Supabase Storage -- the template keeps its letterhead image
-- in the Word header untouched and just has {tag} placeholders in the
-- body (see the "Letter templates" admin tab for the tag reference).
--
-- `documents_folder_label` is a plain text reminder, not a real path the
-- app can open -- browsers can't silently read an arbitrary filesystem
-- path. The actual save target is a folder the user picks once per
-- device via the File System Access API (Chrome/Edge only); this label
-- just tells them which folder to pick.
--
-- Access to both the table and the storage bucket is scoped by
-- business_id only (like role/role_permission), not gated behind a
-- permission key -- can_manage_business is referenced on the Admin tab
-- but, per Admin.jsx's existing comment, isn't actually backed by any
-- granted role_permission row yet, so gating writes behind it here would
-- silently lock everyone out.

alter table parkman2.business add column if not exists documents_folder_label text;
update parkman2.business set documents_folder_label = 'C:\Users\andy\Documents\APP DOCS TEST' where documents_folder_label is null;

create table if not exists parkman2.letter_template (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references parkman2.business(id) on delete cascade,
  name text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

alter table parkman2.letter_template enable row level security;

drop policy if exists letter_template_all on parkman2.letter_template;
create policy letter_template_all on parkman2.letter_template
  for all using (business_id = parkman2.current_business_id())
  with check (business_id = parkman2.current_business_id());

insert into storage.buckets (id, name, public)
  values ('letter-templates', 'letter-templates', false)
  on conflict (id) do nothing;

-- Objects are stored as `{business_id}/{filename}` -- the first path
-- segment is how access is scoped, same idea as the table policy above.
drop policy if exists letter_templates_select on storage.objects;
create policy letter_templates_select on storage.objects
  for select using (
    bucket_id = 'letter-templates'
    and (storage.foldername(name))[1] = parkman2.current_business_id()::text
  );

drop policy if exists letter_templates_insert on storage.objects;
create policy letter_templates_insert on storage.objects
  for insert with check (
    bucket_id = 'letter-templates'
    and (storage.foldername(name))[1] = parkman2.current_business_id()::text
  );

drop policy if exists letter_templates_delete on storage.objects;
create policy letter_templates_delete on storage.objects
  for delete using (
    bucket_id = 'letter-templates'
    and (storage.foldername(name))[1] = parkman2.current_business_id()::text
  );

notify pgrst, 'reload schema';
