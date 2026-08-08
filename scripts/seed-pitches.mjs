// ParkMan2 -- one-off seed: load real Pitch numbers from a CampManager
// "Holiday Homes" export (Unit Site column, e.g. "OP-A01", "PN-B03").
//
// Per Andy (8 Aug 2026):
// - Area comes from the prefix before the dash (PN = Parc Newydd, etc,
//   matching the four Areas already named in PROJECT-BRIEF.md).
// - A leading zero on the number gets stripped (OP-A01 -> pitch number
//   "A1", not "A01") -- CampManager zero-pads for its own sort order,
//   ParkMan2 has its own sort_key column for that instead (see
//   src/lib/sortKey.js), so the visible number doesn't need to carry it.
//
//   node scripts/seed-pitches.mjs "C:\Users\andy\Downloads\Holiday Homes (3).csv"
import { readFileSync } from "node:fs";
import pg from "pg";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/seed-pitches.mjs "<path-to-csv>"');
  process.exit(1);
}

const AREA_NAMES = {
  OM: "Orchards Meadow",
  OP: "Old Park",
  PN: "Parc Newydd",
  YH: "Ynys Hir",
};

// Andy: OM is an all-Lodge area (its units are all "L" lettered, e.g.
// OM-L01) -- every other area's letters (A-G) are ordinary Caravan
// pitches. Inferred from the data, not explicitly confirmed -- flagged
// in the summary back to Andy so it's easy to correct if wrong.
function pitchTypeFor(letter) {
  return letter === "L" ? "Lodge" : "Caravan";
}

function suggestSortKey(number) {
  return number.replace(/\d+/g, (digits) => digits.padStart(4, "0"));
}

const dbUrl = readFileSync(".supabase-db-url", "utf8").trim();
const lines = readFileSync(csvPath, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const header = lines.shift();
if (!/unit site/i.test(header)) {
  console.error(`Expected a "Unit Site" header, got: ${header}`);
  process.exit(1);
}

const rows = [];
for (const line of lines) {
  const m = line.match(/^([A-Za-z]+)-([A-Za-z]+)0*(\d+)$/);
  if (!m) {
    console.error(`Skipping unrecognised row: "${line}"`);
    continue;
  }
  const [, prefix, letter, digits] = m;
  const areaCode = prefix.toUpperCase();
  if (!AREA_NAMES[areaCode]) {
    console.error(`Skipping "${line}" -- unknown area prefix "${areaCode}"`);
    continue;
  }
  const number = `${letter}${digits}`;
  rows.push({ areaCode, number, sortKey: suggestSortKey(number), type: pitchTypeFor(letter) });
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  await client.query(
    "insert into parkman2.pitch_type (business_id, name) select business_id, 'Lodge' from parkman2.pitch_type where name = 'Caravan' on conflict (business_id, name) do nothing"
  );

  const { rows: areaRows } = await client.query("select id, code from parkman2.area");
  const areaIdByCode = Object.fromEntries(areaRows.map((r) => [r.code, r.id]));

  const { rows: typeRows } = await client.query("select id, name from parkman2.pitch_type");
  const typeIdByName = Object.fromEntries(typeRows.map((r) => [r.name, r.id]));

  const { rows: statusRows } = await client.query("select id from parkman2.pitch_status where name = 'Active'");
  const activeStatusId = statusRows[0]?.id;
  if (!activeStatusId) throw new Error('No "Active" pitch_status found -- create one first.');

  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    const areaId = areaIdByCode[row.areaCode];
    const typeId = typeIdByName[row.type];
    if (!areaId || !typeId) {
      console.error(`Skipping ${row.areaCode}-${row.number} -- missing area or type lookup`);
      skipped++;
      continue;
    }
    const { rowCount } = await client.query(
      `insert into parkman2.pitch (area_id, type_id, status_id, number, sort_key, capacity)
       values ($1, $2, $3, $4, $5, 1)
       on conflict (area_id, number) do nothing`,
      [areaId, typeId, activeStatusId, row.number, row.sortKey]
    );
    if (rowCount > 0) inserted++;
    else skipped++;
  }

  console.log(`Inserted ${inserted} pitches, skipped ${skipped} (already existed or unresolved).`);
} finally {
  await client.end();
}
