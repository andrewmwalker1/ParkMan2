-- ParkMan2 -- fixes from Andy's first look at the real admin forms.
--
-- 1. Park.default_vat_rate dropped -- not needed on this screen; VAT
--    handling belongs with the Utilities/Reading Round work (Phase 2),
--    revisit there once that's actually being built rather than
--    leaving an unused field on Park in the meantime.
-- 2. Season's start/end were DATE columns, which bakes in a specific
--    (meaningless) year for something that's meant to repeat
--    identically every year -- e.g. "2026-03-01" implies 2026 matters,
--    it doesn't. Replaced with plain month/day integers.
-- 3. Business/Park/Customer addresses simplified from
--    address_line1/address_line2 to a single `street` field, plus a
--    new `country` (defaults 'UK').

alter table parkman2.park drop column if exists default_vat_rate;

alter table parkman2.season add column if not exists start_month integer;
alter table parkman2.season add column if not exists start_day integer;
alter table parkman2.season add column if not exists end_month integer;
alter table parkman2.season add column if not exists end_day integer;
alter table parkman2.season drop column if exists start_date;
alter table parkman2.season drop column if exists end_date;

alter table parkman2.business add column if not exists street text;
alter table parkman2.business add column if not exists country text not null default 'UK';
update parkman2.business set street = trim(both ', ' from coalesce(address_line1, '') || ' ' || coalesce(address_line2, '')) where street is null;
alter table parkman2.business drop column if exists address_line1;
alter table parkman2.business drop column if exists address_line2;

alter table parkman2.park add column if not exists street text;
alter table parkman2.park add column if not exists country text not null default 'UK';
update parkman2.park set street = trim(both ', ' from coalesce(address_line1, '') || ' ' || coalesce(address_line2, '')) where street is null;
alter table parkman2.park drop column if exists address_line1;
alter table parkman2.park drop column if exists address_line2;

alter table parkman2.customer add column if not exists street text;
alter table parkman2.customer add column if not exists country text not null default 'UK';
update parkman2.customer set street = trim(both ', ' from coalesce(address_line1, '') || ' ' || coalesce(address_line2, '')) where street is null;
alter table parkman2.customer drop column if exists address_line1;
alter table parkman2.customer drop column if exists address_line2;
