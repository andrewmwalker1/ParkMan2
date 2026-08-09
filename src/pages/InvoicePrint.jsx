import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { colors, fonts } from "../lib/theme.js";

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

function businessAddress(b) {
  return [b.street, b.town, b.county, b.postcode, b.country].filter(Boolean).join(", ");
}

// Standalone, chrome-free layout (rendered outside <Layout> in App.jsx) --
// this is a print/PDF-facing document, not a working screen, same
// reasoning as why it has its own "Print" button rather than living
// inside the normal InvoiceDetail.jsx page. @media print hides that
// button and anything else that shouldn't end up on paper.
export default function InvoicePrint() {
  const { id } = useParams();
  const { profile } = useAuth();
  const [invoice, setInvoice] = useState(null);
  const [lines, setLines] = useState(null);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      supabase.from("invoice").select("*, pitch:pitch_id(number, area:area_id(name))").eq("id", id).single(),
      supabase.from("invoice_line").select("*, nominal_code:nominal_code_id(code, name), vat_rate:vat_rate_id(name)").eq("invoice_id", id).order("sort_order"),
      supabase.from("business").select("name, street, town, county, country, postcode, phone, email, vat_number, company_number").eq("id", profile.business_id).single(),
    ]).then(([{ data: inv, error: err }, { data: ls }, { data: biz }]) => {
      if (err) {
        setError(err.message);
        return;
      }
      setInvoice(inv);
      setLines(ls || []);
      setBusiness(biz);
    });
  }, [id, profile]);

  if (error) return <p style={{ padding: "24px", color: colors.immediate }}>{error}</p>;
  if (!invoice || !lines || !business) return <p style={{ padding: "24px", color: colors.inkSoft }}>Loading…</p>;

  return (
    <div style={{ fontFamily: fonts.body, color: colors.ink, background: "#fff", minHeight: "100vh" }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff; }
        }
      `}</style>

      <div className="no-print" style={{ padding: "16px 24px", borderBottom: `1px solid ${colors.line}`, display: "flex", justifyContent: "flex-end" }}>
        <button
          onClick={() => window.print()}
          style={{ background: colors.brand, color: "#fff", border: "none", borderRadius: "999px", padding: "10px 20px", fontFamily: fonts.body, fontWeight: 600, cursor: "pointer" }}
        >
          Print
        </button>
      </div>

      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "40px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
          <div>
            <div style={{ fontFamily: fonts.display, fontSize: "22px", fontWeight: 700, color: colors.brandDark }}>{business.name}</div>
            <div style={{ fontSize: "13px", color: colors.inkSoft, marginTop: "4px" }}>{businessAddress(business)}</div>
            {(business.phone || business.email) && (
              <div style={{ fontSize: "13px", color: colors.inkSoft }}>{[business.phone, business.email].filter(Boolean).join(" · ")}</div>
            )}
            {business.vat_number && <div style={{ fontSize: "13px", color: colors.inkSoft }}>VAT number: {business.vat_number}</div>}
            {business.company_number && <div style={{ fontSize: "13px", color: colors.inkSoft }}>Company number: {business.company_number}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: fonts.display, fontSize: "20px", fontWeight: 700 }}>INVOICE</div>
            <div style={{ fontSize: "13px", color: colors.inkSoft, marginTop: "4px" }}>INV-{String(invoice.invoice_number).padStart(6, "0")}</div>
            <div style={{ fontSize: "13px", color: colors.inkSoft }}>Date: {invoice.invoice_date}</div>
            {invoice.due_date && <div style={{ fontSize: "13px", color: colors.inkSoft }}>Due: {invoice.due_date}</div>}
            {invoice.reference && <div style={{ fontSize: "13px", color: colors.inkSoft }}>Ref: {invoice.reference}</div>}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "32px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 600, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "4px" }}>Bill to</div>
            <div style={{ fontWeight: 600 }}>{invoice.bill_to_name}</div>
            <div style={{ fontSize: "13px", whiteSpace: "pre-line" }}>{invoice.bill_to_address}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "11px", fontWeight: 600, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "4px" }}>Pitch</div>
            <div style={{ fontWeight: 600 }}>{invoice.pitch?.number}</div>
            <div style={{ fontSize: "13px", color: colors.inkSoft }}>{invoice.pitch?.area?.name}</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${colors.ink}` }}>
              <th style={{ textAlign: "left", padding: "6px 4px", fontSize: "11px", textTransform: "uppercase" }}>Description</th>
              <th style={{ textAlign: "left", padding: "6px 4px", fontSize: "11px", textTransform: "uppercase" }}>Nominal</th>
              <th style={{ textAlign: "right", padding: "6px 4px", fontSize: "11px", textTransform: "uppercase" }}>Net</th>
              <th style={{ textAlign: "left", padding: "6px 4px", fontSize: "11px", textTransform: "uppercase" }}>VAT</th>
              <th style={{ textAlign: "right", padding: "6px 4px", fontSize: "11px", textTransform: "uppercase" }}>VAT amt</th>
              <th style={{ textAlign: "right", padding: "6px 4px", fontSize: "11px", textTransform: "uppercase" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr key={l.id} style={{ borderBottom: `1px solid ${colors.line}` }}>
                <td style={{ padding: "8px 4px", fontSize: "13px" }}>{l.description}</td>
                <td style={{ padding: "8px 4px", fontSize: "13px" }}>{l.nominal_code?.code}</td>
                <td style={{ padding: "8px 4px", fontSize: "13px", textAlign: "right" }}>{currency.format(l.net_amount)}</td>
                <td style={{ padding: "8px 4px", fontSize: "13px" }}>{l.vat_rate?.name}</td>
                <td style={{ padding: "8px 4px", fontSize: "13px", textAlign: "right" }}>{currency.format(l.vat_amount)}</td>
                <td style={{ padding: "8px 4px", fontSize: "13px", textAlign: "right" }}>{currency.format(l.gross_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: "220px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px" }}>
              <span>Net</span><span>{currency.format(invoice.total_net)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "13px" }}>
              <span>VAT</span><span>{currency.format(invoice.total_vat)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: "15px", fontWeight: 700, borderTop: `2px solid ${colors.ink}`, marginTop: "4px" }}>
              <span>Total</span><span>{currency.format(invoice.total_gross)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div style={{ marginTop: "32px", fontSize: "13px", color: colors.inkSoft }}>
            <div style={{ fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "4px" }}>Notes</div>
            {invoice.notes}
          </div>
        )}
      </div>
    </div>
  );
}
