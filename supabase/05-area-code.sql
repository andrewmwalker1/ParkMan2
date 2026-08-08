-- ParkMan2 -- add the missing Area.code field (e.g. "PN" for Parc
-- Newydd, "YH" for Ynys Hir). Pitch numbering already assumes this
-- convention (e.g. "PN-A16" seen on the real CampManager printout in
-- PROJECT-BRIEF.md) but the column was never actually added to the
-- schema in 01-schema.sql.

alter table parkman2.area add column if not exists code text;
