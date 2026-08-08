-- ParkMan2 -- correct Customer's address to structured fields.
--
-- The earlier reasoning (see PROJECT-BRIEF.md, now corrected) was that
-- CampManager's own address field was a single free-text block, so
-- Customer's `address` stayed a blob to mirror it for easier import
-- later. That was wrong -- it came from how a printed summary *displayed*
-- an address (stacked lines in one printout cell), not from
-- CampManager's actual underlying data shape, which Andy confirmed is
-- already broken into separate fields. A structured Customer address is
-- actually the better import match, not a worse one -- same correction
-- already applied to Business/Park in 07-structured-addresses.sql.

alter table parkman2.customer drop column if exists address;
alter table parkman2.customer add column if not exists address_line1 text;
alter table parkman2.customer add column if not exists address_line2 text;
alter table parkman2.customer add column if not exists town text;
-- postcode and county already exist from the original schema.
