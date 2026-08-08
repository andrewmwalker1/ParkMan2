// ParkMan2 -- one-off seed: load real Caravans from a CampManager
// "Holiday Homes" export, link each to its Pitch via a Placement, and
// use the caravan's own Length/Width to set that Pitch's indicative
// size (per Andy, 8 Aug 2026).
//
// Columns used: Unit Site, Unit Make, Unit Model, Unit Year, Unit
// Length, Unit Width, Unit Bedrooms, Unit Colour, Unit Condition, Unit
// Key Number, Unit Chassis Number, Unit Serial Number. "Unit Category"
// (a per-caravan Band code, e.g. "OP-Band 2") is deliberately NOT used
// here -- that's the old CampManager per-caravan-Band workaround
// PROJECT-BRIEF.md already discusses; out of scope for this seed.
//
//   node scripts/seed-caravans.mjs "C:\Users\andy\Downloads\Holiday Homes (4).csv"
import { readFileSync } from "node:fs";
import pg from "pg";

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/seed-caravans.mjs "<path-to-csv>"');
  process.exit(1);
}

// 0/blank is CampManager's "not recorded", not a real value, for these
// numeric-ish columns -- treat as null rather than storing a
// meaningless 0.
function numOrNull(v) {
  const n = Number(v);
  return v && n ? n : null;
}
function strOrNull(v) {
  return v && v.trim() ? v.trim() : null;
}

const dbUrl = readFileSync(".supabase-db-url", "utf8").trim();
const lines = readFileSync(csvPath, "utf8").split(/\r?\n/).map((l) => l.trimEnd());
const header = lines.shift();
if (!/^Unit Site,/i.test(header)) {
  console.error(`Expected a "Unit Site,..." header, got: ${header}`);
  process.exit(1);
}

const rows = [];
for (const line of lines) {
  if (!line.trim()) continue;
  const cols = line.split(",");
  const site = cols[0]?.trim();
  if (!site) continue;

  const m = site.match(/^([A-Za-z]+)-([A-Za-z]+)0*(\d+)$/);
  if (!m) {
    console.error(`Skipping unrecognised Unit Site: "${site}"`);
    continue;
  }
  const [, prefix, letter, digits] = m;
  rows.push({
    areaCode: prefix.toUpperCase(),
    number: `${letter}${digits}`,
    make: strOrNull(cols[2]),
    model: strOrNull(cols[3]),
    modelYear: numOrNull(cols[4]),
    length: numOrNull(cols[5]),
    width: numOrNull(cols[6]),
    bedrooms: numOrNull(cols[7]),
    colour: strOrNull(cols[8]),
    condition: strOrNull(cols[9]),
    keyNumber: strOrNull(cols[11]),
    serialNumber: strOrNull(cols[13]) || strOrNull(cols[12]), // prefer Serial Number, fall back to Chassis Number
  });
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  const { rows: pitchRows } = await client.query(
    `select p.id, p.number, p.type_id, a.code as area_code
     from parkman2.pitch p join parkman2.area a on a.id = p.area_id`
  );
  const pitchByKey = new Map(pitchRows.map((p) => [`${p.area_code}-${p.number}`, p]));

  const { rows: typeRows } = await client.query("select id, name from parkman2.pitch_type");
  const caravanTypeIdByPitchTypeName = {};
  for (const t of typeRows) {
    const { rows: ct } = await client.query("select id from parkman2.caravan_type where name = $1", [t.name]);
    if (ct[0]) caravanTypeIdByPitchTypeName[t.id] = ct[0].id;
  }

  const { rows: bizRows } = await client.query("select id from parkman2.business limit 1");
  const businessId = bizRows[0]?.id;

  let created = 0;
  let sized = 0;
  let skipped = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const row of rows) {
    const pitch = pitchByKey.get(`${row.areaCode}-${row.number}`);
    if (!pitch) {
      console.error(`Skipping ${row.areaCode}-${row.number} -- no matching pitch`);
      skipped++;
      continue;
    }

    // Mirrors the Pitch's own type (Lodge pitch -> Lodge caravan) rather
    // than trying to infer it from the model name text, which is far
    // less reliable ("Stamford Lodge" vs "Portland" vs "Sensation" etc.)
    const typeId = caravanTypeIdByPitchTypeName[pitch.type_id] || null;

    const { rows: inserted } = await client.query(
      `insert into parkman2.caravan
         (business_id, type_id, make, model, model_year, length, width, bedrooms, colour, condition, key_number, serial_number)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       returning id`,
      [businessId, typeId, row.make, row.model, row.modelYear, row.length, row.width, row.bedrooms, row.colour, row.condition, row.keyNumber, row.serialNumber]
    );
    const caravanId = inserted[0].id;
    created++;

    await client.query(
      `insert into parkman2.placement (caravan_id, pitch_id, start_date) values ($1, $2, $3)`,
      [caravanId, pitch.id, today]
    );

    if (row.length && row.width) {
      await client.query(`update parkman2.pitch set length = $1, width = $2 where id = $3`, [row.length, row.width, pitch.id]);
      sized++;
    }
  }

  console.log(`Created ${created} caravans (+ Placements), sized ${sized} pitches from caravan dimensions, skipped ${skipped}.`);
} finally {
  await client.end();
}
