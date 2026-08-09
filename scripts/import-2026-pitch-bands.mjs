// ParkMan2 -- one-time import of the 2026 pitch bands + rates.
//
// Source data (Andy, 9 Aug 2026): "Pitch Bands 2026.docx" (band -> annual
// rate, per Area) and "Pitch Fee Data for PM2.xlsx" (pitch number -> band,
// sheet "Pitch Fee Data"). Both are binary Office files -- neither pandoc
// nor Python is available in this environment, so they were parsed once via
// `unzip` + a throwaway Node script (Office files are zips of XML) and the
// extracted values are embedded below as plain data, rather than re-parsing
// the binary files at run time.
//
// Usage: node scripts/import-2026-pitch-bands.mjs
//   (apply supabase/17-pitch-band-rates.sql first)

import { readFileSync } from "node:fs";
import pg from "pg";

const YEAR = 2026;

// band code -> annual fee, from Pitch Bands 2026.docx. Note: the docx has
// its own typo, "YH-Logde1" -- corrected to "YH-Lodge 1" here, confirmed
// against the xlsx which consistently spells it "YH-Lodge 1".
const BAND_RATES = {
  "OM-Band 1": 5100.00,
  "OM-Band 2": 5100.00,
  "OM-Band 3": 5400.00,
  "OM-Band 4": 5500.00,
  "OM-Band 5": 5600.00,
  "OP-Band 1": 4100.00,
  "OP-Band 1a": 4200.00,
  "OP-Band 2": 4250.00,
  "OP-Band 3": 4325.00,
  "OP-Band 4 Lodge": 4975.00,
  "OP-Band 4": 4350.00,
  "OP-Band 5": 4450.00,
  "PN-Band 1": 4400.00,
  "PN-Band 2": 4430.00,
  "PN-Band 3 & Sky": 4575.00,
  "PN-Band 3": 4725.00,
  "PN-Band 4 & Sky": 4725.00,
  "PN-Band 4": 4700.00,
  "PN-Band Lodge + No Sky": 5025.00,
  "PN-Band Lodge": 5000.00,
  "YH-Band 1": 4800.00,
  "YH-Band 2": 5000.00,
  "YH-Band 3": 5100.00,
  "YH-Lodge 2": 5100.00,
  "YH-Lodge 1": 5300.00,
};

// pitch number (as written in the xlsx, zero-padded) -> band code, from
// Pitch Fee Data for PM2.xlsx, sheet "Pitch Fee Data".
const PITCH_BANDS = [
  ["OM-L01", "OM-Band 1"], ["OM-L03", "OM-Band 2"], ["OM-L04", "OM-Band 2"],
  ["OM-L05", "OM-Band 2"], ["OM-L06", "OM-Band 2"], ["OM-L07", "OM-Band 2"],
  ["OM-L08", "OM-Band 1"], ["OM-L09", "OM-Band 1"], ["OM-L10", "OM-Band 2"],
  ["OM-L12", "OM-Band 2"],
  ["OP-A02", "OP-Band 1a"], ["OP-A03", "OP-Band 1a"], ["OP-A04", "OP-Band 2"],
  ["OP-A05", "OP-Band 2"], ["OP-A11", "OP-Band 2"], ["OP-A12", "OP-Band 2"],
  ["OP-A13", "OP-Band 4"], ["OP-A14", "OP-Band 3"], ["OP-A15", "OP-Band 3"],
  ["OP-A16", "OP-Band 2"],
  ["OP-B01", "OP-Band 1a"], ["OP-B03", "OP-Band 2"], ["OP-B05", "OP-Band 1a"],
  ["OP-B10", "OP-Band 1"], ["OP-B11", "OP-Band 4"], ["OP-B12", "OP-Band 4"],
  ["OP-B13", "OP-Band 4"], ["OP-B14", "OP-Band 4"], ["OP-B15", "OP-Band 1a"],
  ["OP-B17", "OP-Band 4"], ["OP-B18", "OP-Band 1a"], ["OP-B19", "OP-Band 4"],
  ["OP-B20", "OP-Band 1a"], ["OP-B21", "OP-Band 4"], ["OP-B22", "OP-Band 1"],
  ["OP-B23", "OP-Band 1"], ["OP-B24", "OP-Band 4"], ["OP-B25", "OP-Band 1a"],
  ["OP-B26", "OP-Band 1a"], ["OP-B30", "OP-Band 1"],
  ["OP-C01", "OP-Band 1a"], ["OP-C05", "OP-Band 2"], ["OP-C08", "OP-Band 2"],
  ["OP-C09", "OP-Band 1a"], ["OP-C10", "OP-Band 3"], ["OP-C11", "OP-Band 2"],
  ["OP-D02", "OP-Band 1a"], ["OP-D03", "OP-Band 2"], ["OP-D04", "OP-Band 3"],
  ["OP-D05", "OP-Band 3"],
  ["OP-E01", "OP-Band 1a"], ["OP-E02", "OP-Band 1"], ["OP-E03", "OP-Band 5"],
  ["OP-E04", "OP-Band 4"], ["OP-E05", "OP-Band 1"], ["OP-E06", "OP-Band 3"],
  ["OP-E07", "OP-Band 3"], ["OP-E08", "OP-Band 1"], ["OP-E09", "OP-Band 3"],
  ["OP-E12", "OP-Band 1"], ["OP-E14", "OP-Band 4"], ["OP-E15", "OP-Band 1a"],
  ["OP-E18", "OP-Band 1a"], ["OP-E19", "OP-Band 1"], ["OP-E22", "OP-Band 1"],
  ["OP-E23", "OP-Band 2"], ["OP-E24", "OP-Band 1a"], ["OP-E25", "OP-Band 3"],
  ["OP-F01", "OP-Band 4"], ["OP-F02", "OP-Band 4"], ["OP-F03", "OP-Band 4"],
  ["OP-F04", "OP-Band 2"], ["OP-F05", "OP-Band 1"], ["OP-F10", "OP-Band 1a"],
  ["OP-F11", "OP-Band 1"], ["OP-F12", "OP-Band 2"], ["OP-F13", "OP-Band 2"],
  ["OP-F14", "OP-Band 1a"], ["OP-F15", "OP-Band 4"], ["OP-F16", "OP-Band 2"],
  ["OP-F17", "OP-Band 1"], ["OP-F20", "OP-Band 2"],
  ["OP-G01", "OP-Band 5"], ["OP-G02", "OP-Band 5"], ["OP-G03", "OP-Band 5"],
  ["OP-G04", "OP-Band 5"], ["OP-G05", "OP-Band 5"], ["OP-G06", "OP-Band 5"],
  ["OP-G07", "OP-Band 3"], ["OP-G08", "OP-Band 3"],
  ["PN-A01", "PN-Band 1"], ["PN-A02", "PN-Band 1"], ["PN-A03", "PN-Band 4"],
  ["PN-A04", "PN-Band 4"], ["PN-A05", "PN-Band 4"], ["PN-A07", "PN-Band 4"],
  ["PN-A08", "PN-Band 3"], ["PN-A09", "PN-Band 4"], ["PN-A10", "PN-Band 3"],
  ["PN-A11", "PN-Band 4"], ["PN-A12", "PN-Band 4"], ["PN-A13", "PN-Band 4"],
  ["PN-A14", "PN-Band 4"], ["PN-A15", "PN-Band 4"], ["PN-A16", "PN-Band 4"],
  ["PN-A17", "PN-Band 1"],
  ["PN-B01", "PN-Band 4"], ["PN-B02", "PN-Band 4"], ["PN-B05", "PN-Band 4"],
  ["PN-B07", "PN-Band 1"], ["PN-B08", "PN-Band 4"], ["PN-B10", "PN-Band 1"],
  ["PN-B11", "PN-Band 4"], ["PN-B12", "PN-Band 3"], ["PN-B13", "PN-Band 4"],
  ["PN-B14", "PN-Band 4"], ["PN-B15", "PN-Band 4"], ["PN-B17", "PN-Band Lodge + No Sky"],
  ["PN-C01", "PN-Band 4"], ["PN-C02", "PN-Band 1"], ["PN-C03", "PN-Band 4"],
  ["PN-C04", "PN-Band 4"], ["PN-C05", "PN-Band 4"], ["PN-C06", "PN-Band 4"],
  ["PN-C07", "PN-Band 4 & Sky"], ["PN-C08", "PN-Band 4"], ["PN-C09", "PN-Band 4"],
  ["PN-C10", "PN-Band 4"], ["PN-C11", "PN-Band 4"], ["PN-C12", "PN-Band 4"],
  ["PN-C13", "PN-Band 4"], ["PN-C14", "PN-Band 1"], ["PN-C15", "PN-Band 4"],
  ["PN-C16", "PN-Band 4"], ["PN-C17", "PN-Band Lodge"],
  ["YH-D02", "YH-Band 3"], ["YH-D03", "YH-Band 2"], ["YH-D05", "YH-Band 1"],
  ["YH-D06", "YH-Band 3"], ["YH-D07", "YH-Band 3"], ["YH-D08", "YH-Band 2"],
  ["YH-D09", "YH-Band 2"], ["YH-D10", "YH-Band 3"], ["YH-D11", "YH-Band 3"],
  ["YH-D16", "YH-Band 2"],
  ["YH-E01", "YH-Band 1"], ["YH-E03", "YH-Band 1"], ["YH-E04", "YH-Band 1"],
  ["YH-E05", "YH-Band 2"], ["YH-E06", "YH-Band 2"], ["YH-E07", "YH-Band 3"],
  ["YH-E08", "YH-Band 2"], ["YH-E09", "YH-Band 3"], ["YH-E11", "YH-Band 2"],
  ["YH-E12", "YH-Band 3"], ["YH-E13", "YH-Band 3"], ["YH-E14", "YH-Band 2"],
  ["YH-E15", "YH-Band 3"], ["YH-E16", "YH-Band 2"], ["YH-E17", "YH-Band 2"],
  ["YH-E18", "YH-Band 2"], ["YH-E19", "YH-Band 3"], ["YH-E20", "YH-Band 2"],
  ["YH-E21", "YH-Band 2"],
  ["YH-F01", "YH-Lodge 1"], ["YH-F02", "YH-Band 3"], ["YH-F05", "YH-Band 2"],
  ["YH-F06", "YH-Lodge 1"], ["YH-F07", "YH-Lodge 1"], ["YH-F08", "YH-Band 3"],
  ["YH-F09", "YH-Lodge 1"], ["YH-F10", "YH-Band 3"], ["YH-F11", "YH-Band 2"],
  ["YH-F12", "YH-Band 3"], ["YH-F13", "YH-Band 3"], ["YH-F14", "YH-Band 3"],
  ["YH-F15", "YH-Lodge 1"],
];

// The xlsx zero-pads the numeric tail (OM-L01, YH-F01); ParkMan2 stores
// pitch numbers without the padding (OM-L1, YH-F1) -- confirmed by
// querying the live pitch table before writing this script.
function normalizePitchNumber(raw) {
  const m = raw.match(/^([A-Z]+-[A-Z]+)0*(\d+)$/);
  return m ? `${m[1]}${m[2]}` : raw;
}

const dbUrl = readFileSync(".supabase-db-url", "utf8").trim();
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  const { rows: areas } = await client.query("select id, code from parkman2.area");
  const areaIdByCode = new Map(areas.map((a) => [a.code, a.id]));

  const bandCodeToArea = {};
  for (const code of Object.keys(BAND_RATES)) {
    const areaCode = code.slice(0, 2);
    bandCodeToArea[code] = areaCode;
  }

  // pitch_band.code is stored WITHOUT the area prefix (e.g. "Band 1a", not
  // "OP-Band 1a") -- the admin screen concatenates area.code + "-" + code
  // for display, matching the existing "e.g. Band 4" placeholder/convention.
  // BAND_RATES/PITCH_BANDS above use the full docx/xlsx label as the map
  // key purely so the two data sets join on the same string.
  const bandIdByCode = new Map();
  for (const [fullCode, areaCode] of Object.entries(bandCodeToArea)) {
    const areaId = areaIdByCode.get(areaCode);
    if (!areaId) {
      console.warn(`No area found for code ${areaCode} (band ${fullCode}) -- skipping`);
      continue;
    }
    const storedCode = fullCode.slice(areaCode.length + 1);
    const { rows } = await client.query(
      `insert into parkman2.pitch_band (area_id, code) values ($1, $2)
       on conflict (area_id, code) do update set code = excluded.code
       returning id`,
      [areaId, storedCode]
    );
    bandIdByCode.set(fullCode, rows[0].id);
  }
  console.log(`Upserted ${bandIdByCode.size} pitch bands.`);

  let rateCount = 0;
  for (const [code, fee] of Object.entries(BAND_RATES)) {
    const bandId = bandIdByCode.get(code);
    if (!bandId) continue;
    await client.query(
      `insert into parkman2.pitch_band_rate (pitch_band_id, year, annual_fee) values ($1, $2, $3)
       on conflict (pitch_band_id, year) do update set annual_fee = excluded.annual_fee`,
      [bandId, YEAR, fee]
    );
    rateCount++;
  }
  console.log(`Upserted ${rateCount} pitch band rates for ${YEAR}.`);

  const { rows: pitches } = await client.query("select id, number from parkman2.pitch");
  const pitchIdByNumber = new Map(pitches.map((p) => [p.number, p.id]));

  let applied = 0;
  const unmatchedXlsxRows = [];
  const matchedPitchIds = new Set();
  for (const [rawNumber, bandCode] of PITCH_BANDS) {
    const number = normalizePitchNumber(rawNumber);
    const pitchId = pitchIdByNumber.get(number);
    const bandId = bandIdByCode.get(bandCode);
    if (!pitchId || !bandId) {
      unmatchedXlsxRows.push({ rawNumber, number, bandCode, pitchFound: !!pitchId, bandFound: !!bandId });
      continue;
    }
    await client.query("update parkman2.pitch set pitch_band_id = $1 where id = $2", [bandId, pitchId]);
    matchedPitchIds.add(pitchId);
    applied++;
  }
  console.log(`Applied a band to ${applied} pitches.`);

  if (unmatchedXlsxRows.length) {
    console.log(`\n${unmatchedXlsxRows.length} xlsx row(s) could not be applied:`);
    unmatchedXlsxRows.forEach((r) => console.log(`  ${r.rawNumber} (-> ${r.number}) / ${r.bandCode} -- pitch found: ${r.pitchFound}, band found: ${r.bandFound}`));
  }

  const unbandedPitches = pitches.filter((p) => !matchedPitchIds.has(p.id));
  console.log(`\n${unbandedPitches.length} of ${pitches.length} DB pitches have no band from this import (may be legitimate -- e.g. STORE, or pitches not in the xlsx):`);
  unbandedPitches.forEach((p) => console.log(`  ${p.number}`));
} finally {
  await client.end();
}
