import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { colors, fonts, cardStyle, buttonStyle } from "../lib/theme.js";

const fieldStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.lineStrong}`,
  fontFamily: fonts.body,
};

const STATUS_LABELS = { draft: "Draft", issued: "Issued", void: "Void" };
const STATUS_COLORS = { draft: colors.inkSoft, issued: colors.success, void: colors.immediate };

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

export default function Invoices() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("invoice")
      .select("id, invoice_number, invoice_date, status, reference, total_gross, bill_to_name, pitch:pitch_id(number)")
      .eq("business_id", profile.business_id)
      .order("invoice_number", { ascending: false })
      .then(({ data }) => setInvoices(data || []));
  }, [profile]);

  const visible = useMemo(() => {
    if (!invoices) return [];
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== "all" && inv.status !== statusFilter) return false;
      if (!q) return true;
      return [inv.pitch?.number, inv.bill_to_name, inv.reference].filter(Boolean).some((v) => v.toLowerCase().includes(q));
    });
  }, [invoices, statusFilter, search]);

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: 0 }}>Invoices</h1>
        <button onClick={() => navigate("/invoices/new")} style={buttonStyle.primary}>+ New invoice</button>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search pitch, customer, reference…" style={{ ...fieldStyle, flex: 1, minWidth: "220px" }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={fieldStyle}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="void">Void</option>
        </select>
      </div>

      {invoices === null && <p style={{ color: colors.inkSoft }}>Loading…</p>}
      {invoices !== null && visible.length === 0 && <p style={{ color: colors.inkSoft }}>No invoices found.</p>}

      {visible.map((inv) => (
        <Link
          key={inv.id}
          to={`/invoices/${inv.id}`}
          style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>
              INV-{String(inv.invoice_number).padStart(6, "0")} · {inv.pitch?.number || "—"}
              <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: 600, color: STATUS_COLORS[inv.status], textTransform: "uppercase" }}>{STATUS_LABELS[inv.status]}</span>
            </div>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>
              {inv.bill_to_name || "—"} · {inv.reference || "No reference"} · {inv.invoice_date}
            </div>
          </div>
          <div style={{ fontWeight: 600, fontFamily: fonts.mono }}>{currency.format(inv.total_gross)}</div>
        </Link>
      ))}
    </div>
  );
}
