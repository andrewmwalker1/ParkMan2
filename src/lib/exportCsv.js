import { supabase } from "./supabaseClient.js";

function pitchColumns() {
  return [
    ["Pitch Number", (p) => p?.number],
    ["Pitch Area", (p) => p?.area?.name],
    ["Pitch Area Code", (p) => p?.area?.code],
    ["Pitch Band", (p) => p?.band?.code],
    ["Pitch Type", (p) => p?.type?.name],
    ["Pitch Status", (p) => p?.status?.name],
    ["Pitch Capacity", (p) => p?.capacity],
    ["Pitch Length (ft)", (p) => p?.length],
    ["Pitch Width (ft)", (p) => p?.width],
    ["Pitch Sort Key", (p) => p?.sort_key],
  ];
}

function caravanColumns() {
  return [
    ["Caravan Make", (c) => c?.make],
    ["Caravan Model", (c) => c?.model],
    ["Caravan Colour", (c) => c?.colour],
    ["Caravan Serial Number", (c) => c?.serial_number],
    ["Caravan Model Year", (c) => c?.model_year],
    ["Caravan Build Year", (c) => c?.build_year],
    ["Caravan Length (ft)", (c) => c?.length],
    ["Caravan Width (ft)", (c) => c?.width],
    ["Caravan Bedrooms", (c) => c?.bedrooms],
    ["Caravan Berths", (c) => c?.berths],
    ["Caravan Key Number", (c) => c?.key_number],
    ["Caravan PAT Test Expiry", (c) => c?.pat_test_expiry],
    ["Caravan Gas Test Expiry", (c) => c?.gas_test_expiry],
    ["Caravan For Sale", (c) => (c ? (c.for_sale ? "Yes" : "No") : "")],
    ["Caravan Type", (c) => c?.type?.name],
    ["Caravan Status", (c) => c?.status?.name],
    ["Caravan Condition", (c) => c?.condition?.name],
  ];
}

// Used twice -- once for the primary owner, once for the secondary --
// since Ownership can point at two separate Customer rows and Andy
// wants both consolidated onto the same CSV row rather than two rows.
function customerColumns(label) {
  return [
    [`${label} Title 1`, (c) => c?.customer1_title],
    [`${label} First Name 1`, (c) => c?.customer1_first_name],
    [`${label} Surname 1`, (c) => c?.customer1_surname],
    [`${label} Phone 1`, (c) => c?.customer1_phone],
    [`${label} Email 1`, (c) => c?.customer1_email],
    [`${label} Receives Billing 1`, (c) => (c ? (c.customer1_receives_billing ? "Yes" : "No") : "")],
    [`${label} Title 2`, (c) => c?.customer2_title],
    [`${label} First Name 2`, (c) => c?.customer2_first_name],
    [`${label} Surname 2`, (c) => c?.customer2_surname],
    [`${label} Phone 2`, (c) => c?.customer2_phone],
    [`${label} Email 2`, (c) => c?.customer2_email],
    [`${label} Receives Billing 2`, (c) => (c ? (c.customer2_receives_billing ? "Yes" : "No") : "")],
    [`${label} Correspondence Salutation`, (c) => c?.correspondence_salutation],
    [`${label} Address Salutation`, (c) => c?.address_salutation],
    [`${label} Street`, (c) => c?.street],
    [`${label} Town`, (c) => c?.town],
    [`${label} County`, (c) => c?.county],
    [`${label} Postcode`, (c) => c?.postcode],
    [`${label} Country`, (c) => c?.country],
    [`${label} Language`, (c) => c?.language],
    [`${label} Delivery Preference`, (c) => c?.delivery_preference],
    [`${label} Mailing List`, (c) => (c ? (c.mailing_list ? "Yes" : "No") : "")],
    [`${label} NOK 1 Name`, (c) => c?.nok1_name],
    [`${label} NOK 1 Relationship`, (c) => c?.nok1_relationship],
    [`${label} NOK 1 Phone`, (c) => c?.nok1_phone],
    [`${label} NOK 1 Email`, (c) => c?.nok1_email],
    [`${label} NOK 2 Name`, (c) => c?.nok2_name],
    [`${label} NOK 2 Relationship`, (c) => c?.nok2_relationship],
    [`${label} NOK 2 Phone`, (c) => c?.nok2_phone],
    [`${label} NOK 2 Email`, (c) => c?.nok2_email],
  ];
}

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Andy (9 Aug 2026): "I'd like to be able to export to CSV all of the
// fields from the customer table, the caravan table and the Pitch
// table. Where there's multiple customers for one caravan please
// consolidate these into 1 row." -- the rows passed in only carry the
// trimmed display fields (see loadOperationalRows), so this re-fetches
// full records for exactly the selected pitches/caravans/customers
// before flattening.
export async function exportRowsToCsv(rows, filename = "parkman2-export.csv") {
  const pitchIds = [...new Set(rows.map((r) => r.pitch?.id).filter(Boolean))];
  const caravanIds = [...new Set(rows.map((r) => r.caravan?.id).filter(Boolean))];
  const customerIds = [...new Set([
    ...rows.map((r) => r.customer?.id).filter(Boolean),
    ...rows.map((r) => r.secondaryCustomerId).filter(Boolean),
  ])];

  const [{ data: pitches }, { data: caravans }, { data: customers }] = await Promise.all([
    pitchIds.length
      ? supabase.from("pitch").select("*, area:area_id(name, code), band:pitch_band_id(code), type:type_id(name), status:status_id(name)").in("id", pitchIds)
      : Promise.resolve({ data: [] }),
    caravanIds.length
      ? supabase.from("caravan").select("*, type:type_id(name), status:status_id(name), condition:condition_id(name)").in("id", caravanIds)
      : Promise.resolve({ data: [] }),
    customerIds.length
      ? supabase.from("customer").select("*").in("id", customerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const pitchById = new Map((pitches || []).map((p) => [p.id, p]));
  const caravanById = new Map((caravans || []).map((c) => [c.id, c]));
  const customerById = new Map((customers || []).map((c) => [c.id, c]));

  const columns = [
    ...pitchColumns(),
    ...caravanColumns(),
    ...customerColumns("Customer"),
    ...customerColumns("Secondary Customer"),
  ];

  const lines = [columns.map(([header]) => csvEscape(header)).join(",")];

  for (const r of rows) {
    const pitch = r.pitch ? pitchById.get(r.pitch.id) : null;
    const caravan = r.caravan ? caravanById.get(r.caravan.id) : null;
    const customer = r.customer ? customerById.get(r.customer.id) : null;
    const secondaryCustomer = r.secondaryCustomerId ? customerById.get(r.secondaryCustomerId) : null;

    const values = [
      ...pitchColumns().map(([, get]) => get(pitch)),
      ...caravanColumns().map(([, get]) => get(caravan)),
      ...customerColumns("").map(([, get]) => get(customer)),
      ...customerColumns("").map(([, get]) => get(secondaryCustomer)),
    ];
    lines.push(values.map(csvEscape).join(","));
  }

  const blob = new Blob([lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
