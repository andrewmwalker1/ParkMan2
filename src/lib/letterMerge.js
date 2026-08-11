import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { buildCorrespondenceSalutation, buildAddressSalutation } from "./salutations.js";

// Every tag a letter template can use, as {tag_name} in the template's
// body text (the letterhead itself lives in the Word header/background
// and is untouched by the merge). Shown as a reference on the Admin >
// Letter templates tab.
export const MERGE_TAGS = [
  { key: "today", label: "Today's date" },
  { key: "correspondence_salutation", label: "Correspondence salutation" },
  { key: "address_salutation", label: "Address salutation" },
  { key: "customer1_title", label: "Customer 1 title" },
  { key: "customer1_first_name", label: "Customer 1 first name" },
  { key: "customer1_surname", label: "Customer 1 surname" },
  { key: "customer1_full_name", label: "Customer 1 full name" },
  { key: "customer2_title", label: "Customer 2 title" },
  { key: "customer2_first_name", label: "Customer 2 first name" },
  { key: "customer2_surname", label: "Customer 2 surname" },
  { key: "customer2_full_name", label: "Customer 2 full name" },
  { key: "street", label: "Street" },
  { key: "town", label: "Town" },
  { key: "county", label: "County" },
  { key: "postcode", label: "Postcode" },
  { key: "country", label: "Country" },
  { key: "pitch_number", label: "Pitch number" },
  { key: "pitch_area", label: "Pitch area" },
  { key: "pitch_type", label: "Pitch type" },
  { key: "pitch_status", label: "Pitch status" },
  { key: "caravan_make", label: "Caravan make" },
  { key: "caravan_model", label: "Caravan model" },
  { key: "caravan_colour", label: "Caravan colour" },
  { key: "caravan_serial_number", label: "Caravan serial number" },
  { key: "caravan_model_year", label: "Caravan model year" },
  { key: "caravan_build_year", label: "Caravan build year" },
  { key: "caravan_pat_test_expiry", label: "Caravan PAT test expiry" },
  { key: "caravan_gas_test_expiry", label: "Caravan gas test expiry" },
  { key: "business_name", label: "Business name" },
];

function formatDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function fullName(title, first, surname) {
  return [title, first, surname].map((s) => (s || "").trim()).filter(Boolean).join(" ");
}

// pitch/caravan/business are all optional -- e.g. a letter started from
// the standalone Customer screen for someone with no sited caravan still
// merges fine, just with those tags coming out blank.
export function buildLetterMergeData({ customer, pitch, caravan, business }) {
  return {
    today: formatDate(new Date().toISOString()),
    correspondence_salutation: customer.correspondence_salutation || buildCorrespondenceSalutation(customer),
    address_salutation: customer.address_salutation || buildAddressSalutation(customer),
    customer1_title: customer.customer1_title || "",
    customer1_first_name: customer.customer1_first_name || "",
    customer1_surname: customer.customer1_surname || "",
    customer1_full_name: fullName(customer.customer1_title, customer.customer1_first_name, customer.customer1_surname),
    customer2_title: customer.customer2_title || "",
    customer2_first_name: customer.customer2_first_name || "",
    customer2_surname: customer.customer2_surname || "",
    customer2_full_name: fullName(customer.customer2_title, customer.customer2_first_name, customer.customer2_surname),
    street: customer.street || "",
    town: customer.town || "",
    county: customer.county || "",
    postcode: customer.postcode || "",
    country: customer.country || "",
    pitch_number: pitch?.number || "",
    pitch_area: pitch?.area?.name || "",
    pitch_type: pitch?.type?.name || "",
    pitch_status: pitch?.status?.name || "",
    caravan_make: caravan?.make || "",
    caravan_model: caravan?.model || "",
    caravan_colour: caravan?.colour || "",
    caravan_serial_number: caravan?.serial_number || "",
    caravan_model_year: caravan?.model_year || "",
    caravan_build_year: caravan?.build_year || "",
    caravan_pat_test_expiry: formatDate(caravan?.pat_test_expiry),
    caravan_gas_test_expiry: formatDate(caravan?.gas_test_expiry),
    business_name: business?.name || "",
  };
}

// Folder name convention: "{pitch number} - {surname}", both surnames
// when they differ, no pitch number segment when there isn't one (e.g.
// letters started from the standalone Customer screen for someone with
// no sited caravan/pitch).
export function buildLetterFolderName(customer, pitchNumber) {
  const s1 = (customer.customer1_surname || "").trim();
  const s2 = (customer.customer2_surname || "").trim();
  const surnames = s2 && s2.toLowerCase() !== s1.toLowerCase() ? `${s1} & ${s2}` : s1;
  return pitchNumber ? `${pitchNumber} - ${surnames}` : surnames;
}

export function mergeDocxTemplate(templateArrayBuffer, data) {
  const zip = new PizZip(templateArrayBuffer);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    delimiters: { start: "{", end: "}" },
    nullGetter: () => "",
  });
  doc.render(data);
  return doc.getZip().generate({
    type: "blob",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
}
