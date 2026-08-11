-- ParkMan2 -- lets Andy re-upload a new version of an existing letter
-- template (fix a typo, update the letterhead) without having to delete
-- and recreate it, which would otherwise break anything mid-flow
-- pointing at that template's id.
--
-- The new file overwrites the same storage_path via upload(..., {upsert:
-- true}) -- Supabase Storage treats overwriting an existing object as an
-- UPDATE, not an INSERT, so 23-letter-templates.sql's insert-only policy
-- silently rejected it. This adds the missing UPDATE policy.

alter table parkman2.letter_template add column if not exists updated_at timestamptz not null default now();

drop policy if exists letter_templates_update on storage.objects;
create policy letter_templates_update on storage.objects
  for update using (
    bucket_id = 'letter-templates'
    and (storage.foldername(name))[1] = parkman2.current_business_id()::text
  )
  with check (
    bucket_id = 'letter-templates'
    and (storage.foldername(name))[1] = parkman2.current_business_id()::text
  );

notify pgrst, 'reload schema';
