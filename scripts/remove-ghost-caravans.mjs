// ParkMan2 -- one-off cleanup of "ghost" caravans left over from the
// original Holiday Homes CSV seed.
//
// Andy (9 Aug 2026): YH-F4 should count as an empty pitch (no caravan
// sited), but the Dashboard's occupancy stats showed 0 empty pitches.
// Traced to 8 caravan rows created during the original import with
// every real field blank (make/model/key_number/serial_number all
// null) -- the source CSV had a row for these pitches with no actual
// caravan info, and the seed script created a caravan + Placement
// anyway instead of recognising "no make and no model" as "nothing to
// import here". Deleting these caravan rows (cascades to their
// Placement, per the FK) restores those pitches to genuinely empty
// rather than fictionally occupied.
//
//   node scripts/remove-ghost-caravans.mjs

import { readFileSync } from "node:fs";
import pg from "pg";

const dbUrl = readFileSync(".supabase-db-url", "utf8").trim();
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows } = await client.query(`
    select c.id, p.number as pitch_number
    from parkman2.caravan c
    left join parkman2.placement pl on pl.caravan_id = c.id and pl.end_date is null
    left join parkman2.pitch p on p.id = pl.pitch_id
    where (c.make is null or c.make = '') and (c.model is null or c.model = '')
  `);
  console.log(`Removing ${rows.length} ghost caravans:`, rows.map((r) => r.pitch_number));

  const { rowCount } = await client.query(
    `delete from parkman2.caravan where id = any($1)`,
    [rows.map((r) => r.id)]
  );
  console.log("caravans deleted:", rowCount);
} finally {
  await client.end();
}
