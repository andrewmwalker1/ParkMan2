-- ParkMan2 -- add an explicit For Sale flag to Caravan.
--
-- Andy (9 Aug 2026): caravans are often sold while still sited on their
-- normal pitch, not moved to a dedicated Display/sales area -- so
-- "has no current Ownership row" isn't a reliable enough signal for a
-- stock sheet (a sold-but-not-yet-processed caravan would also show no
-- current owner, without being for sale). An explicit flag is needed.

alter table parkman2.caravan add column if not exists for_sale boolean not null default false;
