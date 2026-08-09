-- ParkMan2 -- store the area-code prefix directly on Pitch.number.
--
-- Andy (9 Aug 2026): wants "B5" stored as "PN-B5" -- the number staff
-- actually search for and read off screen is the prefixed form, not the
-- bare number. Previously the prefix was only ever added at display
-- time (Area.code + "-" + number), which meant search couldn't match
-- the prefixed form without an awkward join, and every place that
-- displayed a pitch had to remember to re-add the prefix itself.
--
-- Idempotent: only touches rows that don't already start with their
-- area's code, so this is safe to re-run.

update parkman2.pitch p
set number = a.code || '-' || p.number
from parkman2.area a
where a.id = p.area_id
  and p.number not like a.code || '-%';
