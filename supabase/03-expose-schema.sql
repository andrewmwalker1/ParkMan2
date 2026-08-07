-- ParkMan2 -- expose the parkman2 schema to PostgREST (Supabase's API
-- layer only serves `public` by default) and grant the base
-- schema/table privileges PostgREST needs before RLS is even
-- evaluated. Without this, every request 404s/403s regardless of the
-- RLS policies in 02-rls-policies.sql -- GRANT is a separate,
-- earlier gate than row-level security.

alter role authenticator set pgrst.db_schemas = 'public, parkman2';
notify pgrst, 'reload config';

-- authenticated only -- ParkMan2 is staff-only (see PROJECT-BRIEF.md,
-- "v1 audience is Andy and office staff only"), no public-facing use
-- case, so anon gets nothing rather than a nominal grant RLS would
-- block anyway.
grant usage on schema parkman2 to authenticated;

grant select, insert, update, delete on all tables in schema parkman2 to authenticated;

alter default privileges in schema parkman2
  grant select, insert, update, delete on tables to authenticated;
