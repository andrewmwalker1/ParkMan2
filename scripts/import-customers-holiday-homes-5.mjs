// ParkMan2 -- one-off import of "Holiday Homes (5).csv" (anonymised
// CampManager customer export) into parkman2.customer, linked to the
// caravan currently placed on the named pitch via a new Ownership row.
//
// The anonymisation pass that produced this file is lossy and uneven:
// - The Title/First Name columns pack two people into one field for
//   couples ("Mr & Mrs" / "Fred & Hilda"), sometimes with only one
//   title or one name given even though the other implies two people.
// - The Email column is fabricated junk -- many unrelated rows share
//   the exact same address (e.g. "Hildae.Hughes@Hotmail.com"), and
//   several are syntactically invalid (".@Hotmail.com"). Not imported.
// - The header itself is corrupted (e.g. "Unit CuGCHomer Address
//   PoGCHcode" for Postcode) from what looks like an "st" -> "GCH"
//   substitution, but the columns are still positionally identifiable
//   from the data.
// - "Unit Site" is the one field Andy confirmed is real and should
//   match an existing Pitch.number -- but written with a leading zero
//   ("OP-E08") where ours has it stripped ("OP-E8", per the same
//   convention used seeding pitches originally), so it's re-normalised
//   here before lookup.
//
//   node scripts/import-customers-holiday-homes-5.mjs

import { readFileSync } from "node:fs";
import pg from "pg";

const CSV_PATH = "C:\\Users\\andy\\Downloads\\Holiday Homes (5).csv";
const BUSINESS_ID = "11111111-1111-1111-1111-111111111111";
const TITLE_WORDS = new Set(["mr", "mrs", "miss", "ms", "mx", "dr"]);

function splitNames(field) {
  return (field || "")
    .split(/\s*(?:&|\/|\band\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitTitles(field) {
  const raw = (field || "").trim();
  if (!raw) return [];
  let parts = raw.split(/\s*(?:&|\/)\s*/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 1) {
    const words = parts[0].split(/\s+/);
    if (words.length === 2 && words.every((w) => TITLE_WORDS.has(w.toLowerCase()))) {
      parts = words;
    }
  }
  return parts;
}

// "OP-E08" -> "OP-E8": strip a leading zero from the trailing digit run
// only, matching the convention used when the pitches were first
// seeded (see scripts/seed-pitches.mjs).
function normalisePitchNumber(site) {
  const m = (site || "").trim().match(/^([A-Za-z]+-[A-Za-z]*)0*(\d+)$/);
  if (!m) return (site || "").trim();
  return `${m[1]}${m[2]}`;
}

function parseLine(line) {
  return line.split(",");
}

const dbUrl = readFileSync(".supabase-db-url", "utf8").trim();
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const lines = readFileSync(CSV_PATH, "utf8").split(/\r?\n/).filter((l) => l.trim().length > 0);
  const rows = lines.slice(1).map(parseLine);

  // pitch has no business_id column directly -- it hangs off
  // area -> park -> business. Only one business exists in this DB today,
  // but join through properly rather than assume that.
  const { rows: pitches } = await client.query(
    `select p.id, p.number from parkman2.pitch p
     join parkman2.area a on a.id = p.area_id
     join parkman2.park pk on pk.id = a.park_id
     where pk.business_id = $1`,
    [BUSINESS_ID]
  );
  const pitchByNumber = new Map(pitches.map((p) => [p.number, p.id]));

  const { rows: placements } = await client.query(
    "select pitch_id, caravan_id from parkman2.placement where end_date is null"
  );
  const caravanByPitchId = new Map(placements.map((p) => [p.pitch_id, p.caravan_id]));

  let created = 0;
  let withSecondCustomer = 0;
  let ownershipsCreated = 0;
  const noPitchMatch = [];
  const noCaravanPlaced = [];

  for (const cols of rows) {
    const [
      site, , title, firstName, , surname,
      addr9, addr7, addr3, town, postcode, county, province, , telephone, mobile,
    ] = cols;

    const names = splitNames(firstName);
    const titles = splitTitles(title);
    const surnameTrimmed = (surname || "").trim();

    // Vacant-pitch rows: CampManager's export includes every pitch, and
    // ones with no current owner just have the site number with every
    // other field blank -- nothing to import.
    if (names.length === 0 && !surnameTrimmed) continue;

    const pitchNumber = normalisePitchNumber(site);
    const pitchId = pitchByNumber.get(pitchNumber);
    if (!pitchId) {
      noPitchMatch.push(site);
      continue;
    }

    const street = [addr9, addr7, addr3].map((s) => (s || "").trim()).filter(Boolean).join("\n");

    const payload = {
      business_id: BUSINESS_ID,
      customer1_title: titles[0] || null,
      customer1_first_name: names[0] || "Unknown",
      customer1_surname: surnameTrimmed || "Unknown",
      customer1_phone: (telephone || "").trim() || (mobile || "").trim() || null,
      street: street || null,
      town: (town || "").trim() || null,
      county: (county || "").trim() || (province || "").trim() || null,
      postcode: (postcode || "").trim() || null,
      country: "UK",
    };

    let secondCustomer = false;
    if (names.length === 2) {
      secondCustomer = true;
      payload.customer2_title = titles.length === 2 ? titles[1] : null;
      payload.customer2_first_name = names[1];
      payload.customer2_surname = surnameTrimmed || "Unknown";
      payload.customer2_phone = (mobile || "").trim() || null;
    }

    const cols_ = Object.keys(payload);
    const values = Object.values(payload);
    const placeholders = cols_.map((_, i) => `$${i + 1}`).join(", ");
    const { rows: inserted } = await client.query(
      `insert into parkman2.customer (${cols_.join(", ")}) values (${placeholders}) returning id`,
      values
    );
    const customerId = inserted[0].id;
    created += 1;
    if (secondCustomer) withSecondCustomer += 1;

    const caravanId = caravanByPitchId.get(pitchId);
    if (!caravanId) {
      noCaravanPlaced.push(site);
      continue;
    }

    await client.query(
      `insert into parkman2.ownership (caravan_id, primary_customer_id, start_date)
       values ($1, $2, current_date)`,
      [caravanId, customerId]
    );
    ownershipsCreated += 1;
  }

  console.log(`Rows processed: ${rows.length}`);
  console.log(`Customers created: ${created} (${withSecondCustomer} with a Customer 2)`);
  console.log(`Ownerships created: ${ownershipsCreated}`);
  console.log(`Pitch not found (${noPitchMatch.length}):`, noPitchMatch);
  console.log(`Pitch found but no caravan currently placed (${noCaravanPlaced.length}):`, noCaravanPlaced);
} finally {
  await client.end();
}
