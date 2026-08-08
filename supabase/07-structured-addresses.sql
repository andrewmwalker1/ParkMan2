-- ParkMan2 -- break Business/Park address into structured fields for
-- mail-merge (letterheads, invoices). Unlike Customer's address, which
-- deliberately stayed a free-text block to mirror CampManager's own
-- shape for import compatibility, Business/Park have no such import
-- constraint -- CampManager doesn't really have a multi-park concept at
-- all -- so there's no reason not to structure these properly.

alter table parkman2.business drop column if exists address;
alter table parkman2.business add column if not exists address_line1 text;
alter table parkman2.business add column if not exists address_line2 text;
alter table parkman2.business add column if not exists town text;
alter table parkman2.business add column if not exists county text;
alter table parkman2.business add column if not exists postcode text;

alter table parkman2.park drop column if exists address;
alter table parkman2.park add column if not exists address_line1 text;
alter table parkman2.park add column if not exists address_line2 text;
alter table parkman2.park add column if not exists town text;
alter table parkman2.park add column if not exists county text;
alter table parkman2.park add column if not exists postcode text;
