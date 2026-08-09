import { supabase } from "./supabaseClient.js";

export function customerName(c) {
  if (!c) return null;
  const name2 = c.customer2_first_name ? ` & ${c.customer2_first_name} ${c.customer2_surname}` : "";
  return `${c.customer1_first_name} ${c.customer1_surname}${name2}`;
}

export function customerContact(c) {
  return c?.customer1_phone || c?.customer1_email || null;
}

export function caravanLabel(c) {
  return c ? [c.make, c.model].filter(Boolean).join(" ") : null;
}

// Shared by SearchResults.jsx and ParkList.jsx -- both are the same
// underlying "one row per pitch, Customer and Caravan alongside it"
// table (CampManager's Holiday Homes shape), just entered from search
// vs. browsing the whole park. Fetches the (small, ~200-row) pitch/
// placement/caravan/ownership/customer tables in full and joins them
// client-side rather than a deep nested PostgREST embed -- reads more
// plainly and sidesteps multi-level embedded-filter edge cases.
export async function loadOperationalRows() {
  const [{ data: pitches }, { data: placements }, { data: caravans }, { data: ownerships }, { data: customers }] = await Promise.all([
    supabase.from("pitch").select("id, number, sort_key, area:area_id(name, code)"),
    supabase.from("placement").select("pitch_id, caravan_id").is("end_date", null),
    supabase.from("caravan").select("id, make, model, key_number, serial_number, for_sale"),
    supabase.from("ownership").select("caravan_id, primary_customer_id").is("end_date", null),
    supabase.from("customer").select("id, customer1_first_name, customer1_surname, customer1_phone, customer1_email, customer2_first_name, customer2_surname"),
  ]);

  const caravanById = new Map((caravans || []).map((c) => [c.id, c]));
  const customerById = new Map((customers || []).map((c) => [c.id, c]));
  const caravanIdByPitchId = new Map((placements || []).map((pl) => [pl.pitch_id, pl.caravan_id]));
  const customerIdByCaravanId = new Map((ownerships || []).map((o) => [o.caravan_id, o.primary_customer_id]));

  const rows = [];
  const sitedCaravanIds = new Set();
  const linkedCustomerIds = new Set();

  (pitches || [])
    .sort((a, b) => {
      const areaCmp = (a.area?.code || "").localeCompare(b.area?.code || "");
      if (areaCmp !== 0) return areaCmp;
      return (a.sort_key || a.number).localeCompare(b.sort_key || b.number);
    })
    .forEach((pitch) => {
      const caravanId = caravanIdByPitchId.get(pitch.id);
      const caravan = caravanId ? caravanById.get(caravanId) : null;
      const customerId = caravanId ? customerIdByCaravanId.get(caravanId) : null;
      const customer = customerId ? customerById.get(customerId) : null;
      if (caravanId) sitedCaravanIds.add(caravanId);
      if (customerId) linkedCustomerIds.add(customerId);
      rows.push({ key: `pitch-${pitch.id}`, pitch, caravan, customer });
    });

  // Off-park caravans and their owners still show up, just without a
  // Pitch cell -- e.g. a caravan in for repair, or between placements.
  (caravans || []).forEach((caravan) => {
    if (sitedCaravanIds.has(caravan.id)) return;
    const customerId = customerIdByCaravanId.get(caravan.id);
    const customer = customerId ? customerById.get(customerId) : null;
    if (customerId) linkedCustomerIds.add(customerId);
    rows.push({ key: `caravan-${caravan.id}`, pitch: null, caravan, customer });
  });

  (customers || []).forEach((customer) => {
    if (linkedCustomerIds.has(customer.id)) return;
    rows.push({ key: `customer-${customer.id}`, pitch: null, caravan: null, customer });
  });

  return rows;
}
