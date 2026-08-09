import { supabase } from "./supabaseClient.js";

// Every field quoted, matching the exact shape of Andy's own
// "SAGE EXPORT.csv" sample (even numeric columns are quoted there).
function csvField(value) {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split("-");
  return `${d}-${m}-${y}`;
}

const HEADER = ["TYPE", "Customer Reference", "Date", "Customer Name", "Reference", "Ledger Account", "Details", "Net", "VAT Rate", "VAT", "Total"];

// One row per invoice_line, matching Andy's Sage import format exactly:
// Customer Reference is always the pitch number (Sage's "customer"
// account is the pitch, ground-rent style, not the person currently
// billed), Customer Name is left blank like every row in the sample
// (Sage resolves the name from the account itself).
export async function exportInvoicesToSage(invoiceIds, filename = "parkman2-sage-export.csv") {
  const [{ data: invoices }, { data: lines }] = await Promise.all([
    supabase.from("invoice").select("id, invoice_date, reference, pitch:pitch_id(number)").in("id", invoiceIds),
    supabase.from("invoice_line").select("invoice_id, description, net_amount, vat_amount, gross_amount, nominal_code:nominal_code_id(code), vat_rate:vat_rate_id(name)").in("invoice_id", invoiceIds).order("sort_order"),
  ]);

  const invoiceById = new Map((invoices || []).map((inv) => [inv.id, inv]));

  const rows = [HEADER.map(csvField).join(",")];
  for (const line of lines || []) {
    const inv = invoiceById.get(line.invoice_id);
    if (!inv) continue;
    const values = [
      "Inv",
      inv.pitch?.number,
      formatDate(inv.invoice_date),
      "",
      inv.reference,
      line.nominal_code?.code,
      line.description,
      Number(line.net_amount).toFixed(2),
      line.vat_rate?.name,
      Number(line.vat_amount).toFixed(2),
      Number(line.gross_amount).toFixed(2),
    ];
    rows.push(values.map(csvField).join(","));
  }

  const blob = new Blob([rows.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
