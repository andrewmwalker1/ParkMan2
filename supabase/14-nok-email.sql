-- ParkMan2 -- add an email address alongside each Next of Kin's name/
-- relationship/phone (Andy, 9 Aug 2026).

alter table parkman2.customer add column if not exists nok1_email text;
alter table parkman2.customer add column if not exists nok2_email text;
