-- Soft delete for Customer and Caravan -- Andy, 12 Aug 2026: never
-- physically delete these records, just flag and hide from lists/
-- search/pickers. A null deleted_at means "live"; every list/search
-- query in the app filters `.is("deleted_at", null)`.

alter table parkman2.customer add column if not exists deleted_at timestamptz;
alter table parkman2.caravan add column if not exists deleted_at timestamptz;
