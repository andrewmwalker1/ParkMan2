-- ParkMan2 -- seed the Tree Tops business and Andy's profile so there's
-- someone who can actually sign in and test. auth.users is shared with
-- Hub (see 01-schema.sql), so this links to Andy's existing Hub account
-- rather than creating a new one.

insert into parkman2.business (id, name, email)
values ('11111111-1111-1111-1111-111111111111', 'Tree Tops Caravan Park', 'info@treetopscaravanpark.co.uk')
on conflict (id) do nothing;

insert into parkman2.profiles (id, business_id, display_name)
values ('da192eb9-87ec-49dc-892c-60327771c4d0', '11111111-1111-1111-1111-111111111111', 'Andy')
on conflict (id) do update set business_id = excluded.business_id, display_name = excluded.display_name;
