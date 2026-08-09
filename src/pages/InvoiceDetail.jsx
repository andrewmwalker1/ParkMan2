import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { calcFromNet, calcFromGross, sumLines } from "../lib/invoiceMath.js";
import { colors, fonts, cardStyle, buttonStyle } from "../lib/theme.js";

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.lineStrong}`,
  fontFamily: fonts.body,
  marginBottom: "10px",
};
const labelStyle = { display: "block", fontSize: "12px", color: colors.inkSoft, marginBottom: "4px" };
const sectionLabelStyle = { fontSize: "12px", fontWeight: 600, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "10px" };

const currency = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });

function formatAddress(c) {
  return [c.street, c.town, c.county, c.postcode, c.country].filter(Boolean).join("\n");
}

// Same shape as CustomerPicker/CaravanPicker in UnitDetail.jsx -- used
// only when starting a new invoice that wasn't opened from a Unit page
// (which pre-fills the pitch via ?pitch=<id>).
function PitchPicker({ onPick }) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(null);

  useEffect(() => {
    supabase.from("pitch").select("id, number, area:area_id(name)").then(({ data }) => setAll(data || []));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !all) return [];
    return all.filter((p) => p.number.toLowerCase().includes(q)).slice(0, 8);
  }, [query, all]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pitch number…" style={fieldStyle} />
      {matches.map((p) => (
        <div key={p.id} onClick={() => onPick(p.id)} style={{ ...cardStyle, padding: "8px 12px", marginBottom: "6px", cursor: "pointer", fontSize: "13.5px" }}>
          {p.number} {p.area?.name && <span style={{ color: colors.inkSoft }}>· {p.area.name}</span>}
        </div>
      ))}
      {query.trim() && all && matches.length === 0 && <p style={{ fontSize: "13px", color: colors.inkSoft }}>No matches.</p>}
    </div>
  );
}

// Pitch -> Placement -> Caravan -> Ownership -> Customer, same chain
// UnitDetail.jsx's refresh() walks -- used to default the bill-to fields
// when a pitch is picked, without hard-linking the invoice to a live join
// (bill_to_name/address are snapshotted once, then freely editable).
async function loadCurrentOwner(pitchId) {
  const { data: pl } = await supabase.from("placement").select("caravan_id").eq("pitch_id", pitchId).is("end_date", null).maybeSingle();
  if (!pl?.caravan_id) return null;
  const { data: own } = await supabase.from("ownership").select("primary_customer_id").eq("caravan_id", pl.caravan_id).is("end_date", null).maybeSingle();
  if (!own?.primary_customer_id) return null;
  const { data: c } = await supabase.from("customer").select("*").eq("id", own.primary_customer_id).single();
  return c;
}

export default function InvoiceDetail() {
  const { id } = useParams();
  const isNew = !id;
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, hasPermission } = useAuth();

  const [pitchId, setPitchId] = useState(searchParams.get("pitch") || null);
  const [pitch, setPitch] = useState(null);
  const [nominalCodes, setNominalCodes] = useState([]);
  const [vatRates, setVatRates] = useState([]);
  const [header, setHeader] = useState({
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: "",
    reference: "",
    notes: "",
    status: "draft",
    bill_to_name: "",
    bill_to_address: "",
    customer_id: null,
  });
  const [lines, setLines] = useState([]);
  const [invoiceNumber, setInvoiceNumber] = useState(null);
  const [status, setStatus] = useState(isNew ? "idle" : "loading");
  const [error, setError] = useState(null);

  // Draft invoices are freely editable by anyone -- not yet a real
  // financial document. Once issued/void, only can_edit_invoices holders
  // can edit (matches the RLS in supabase/21-invoicing.sql).
  const editable = isNew || header.status === "draft" || hasPermission("can_edit_invoices");

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      supabase.from("nominal_code").select("id, code, name").eq("business_id", profile.business_id).order("code"),
      supabase.from("vat_rate").select("id, name, rate_percent").eq("business_id", profile.business_id).order("rate_percent", { ascending: false }),
    ]).then(([{ data: n }, { data: v }]) => {
      setNominalCodes(n || []);
      setVatRates(v || []);
    });
  }, [profile]);

  useEffect(() => {
    if (isNew) return;
    setStatus("loading");
    Promise.all([
      supabase.from("invoice").select("*, pitch:pitch_id(id, number, area:area_id(name))").eq("id", id).single(),
      supabase.from("invoice_line").select("*").eq("invoice_id", id).order("sort_order"),
    ]).then(([{ data: inv, error: err }, { data: ls }]) => {
      if (err) {
        setError(err.message);
        setStatus("idle");
        return;
      }
      setPitchId(inv.pitch_id);
      setPitch(inv.pitch);
      setInvoiceNumber(inv.invoice_number);
      setHeader({
        invoice_date: inv.invoice_date,
        due_date: inv.due_date || "",
        reference: inv.reference || "",
        notes: inv.notes || "",
        status: inv.status,
        bill_to_name: inv.bill_to_name || "",
        bill_to_address: inv.bill_to_address || "",
        customer_id: inv.customer_id,
      });
      setLines((ls || []).map((l) => ({ ...l, net_amount: String(l.net_amount), vat_amount: String(l.vat_amount), gross_amount: String(l.gross_amount) })));
      setStatus("idle");
    });
  }, [id, isNew]);

  useEffect(() => {
    if (!isNew || !pitchId) return;
    supabase.from("pitch").select("id, number, area:area_id(name)").eq("id", pitchId).single().then(({ data }) => setPitch(data));
    loadCurrentOwner(pitchId).then((c) => {
      if (!c) return;
      const name = c.address_salutation || [c.customer1_first_name, c.customer1_surname].filter(Boolean).join(" ");
      setHeader((h) => ({ ...h, customer_id: c.id, bill_to_name: name, bill_to_address: formatAddress(c) }));
    });
  }, [isNew, pitchId]);

  const totals = useMemo(() => sumLines(lines), [lines]);

  function vatRateFor(vatRateId) {
    return vatRates.find((v) => v.id === vatRateId);
  }

  function addLine() {
    setLines((ls) => [
      ...ls,
      {
        id: `new-${Date.now()}-${ls.length}`,
        nominal_code_id: nominalCodes[0]?.id || "",
        description: "",
        net_amount: "0.00",
        vat_rate_id: vatRates[0]?.id || "",
        vat_amount: "0.00",
        gross_amount: "0.00",
      },
    ]);
  }

  function removeLine(idx) {
    setLines((ls) => ls.filter((_, i) => i !== idx));
  }

  function updateLine(idx, patch) {
    setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function handleNetChange(idx, value) {
    const rate = vatRateFor(lines[idx].vat_rate_id)?.rate_percent || 0;
    const { vat, gross } = calcFromNet(Number(value) || 0, rate);
    updateLine(idx, { net_amount: value, vat_amount: String(vat), gross_amount: String(gross) });
  }

  function handleGrossChange(idx, value) {
    const rate = vatRateFor(lines[idx].vat_rate_id)?.rate_percent || 0;
    const { net, vat } = calcFromGross(Number(value) || 0, rate);
    updateLine(idx, { gross_amount: value, net_amount: String(net), vat_amount: String(vat) });
  }

  function handleVatRateChange(idx, vatRateId) {
    const rate = vatRateFor(vatRateId)?.rate_percent || 0;
    const { vat, gross } = calcFromNet(Number(lines[idx].net_amount) || 0, rate);
    updateLine(idx, { vat_rate_id: vatRateId, vat_amount: String(vat), gross_amount: String(gross) });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!pitchId) {
      setError("Pick a pitch first.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one line.");
      return;
    }
    setError(null);
    setStatus("saving");

    const payload = {
      business_id: profile.business_id,
      pitch_id: pitchId,
      customer_id: header.customer_id,
      invoice_date: header.invoice_date,
      due_date: header.due_date || null,
      reference: header.reference || null,
      notes: header.notes || null,
      status: header.status,
      bill_to_name: header.bill_to_name || null,
      bill_to_address: header.bill_to_address || null,
      total_net: totals.totalNet,
      total_vat: totals.totalVat,
      total_gross: totals.totalGross,
    };

    if (isNew) {
      const { data: inv, error: err } = await supabase.from("invoice").insert({ ...payload, created_by: profile.id }).select("id").single();
      if (err) {
        setError(err.message);
        setStatus("idle");
        return;
      }
      const lineRows = lines.map((l, i) => ({
        invoice_id: inv.id,
        nominal_code_id: l.nominal_code_id,
        description: l.description,
        net_amount: Number(l.net_amount),
        vat_rate_id: l.vat_rate_id,
        vat_amount: Number(l.vat_amount),
        gross_amount: Number(l.gross_amount),
        sort_order: i,
      }));
      const { error: lineErr } = await supabase.from("invoice_line").insert(lineRows);
      if (lineErr) {
        setError(lineErr.message);
        setStatus("idle");
        return;
      }
      navigate(`/invoices/${inv.id}`, { replace: true });
      return;
    }

    const { error: err } = await supabase.from("invoice").update(payload).eq("id", id);
    if (err) {
      setError(err.message);
      setStatus("idle");
      return;
    }
    const { error: delErr } = await supabase.from("invoice_line").delete().eq("invoice_id", id);
    if (delErr) {
      setError(delErr.message);
      setStatus("idle");
      return;
    }
    const lineRows = lines.map((l, i) => ({
      invoice_id: id,
      nominal_code_id: l.nominal_code_id,
      description: l.description,
      net_amount: Number(l.net_amount),
      vat_rate_id: l.vat_rate_id,
      vat_amount: Number(l.vat_amount),
      gross_amount: Number(l.gross_amount),
      sort_order: i,
    }));
    const { error: lineErr } = await supabase.from("invoice_line").insert(lineRows);
    if (lineErr) {
      setError(lineErr.message);
      setStatus("idle");
      return;
    }
    setStatus("saved");
  }

  if (isNew && !pitchId) {
    return (
      <div style={{ padding: "24px", maxWidth: "560px", margin: "0 auto" }}>
        <Link to="/invoices" style={{ color: colors.inkSoft, fontSize: "13px", textDecoration: "none" }}>← Back to Invoices</Link>
        <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "8px 0 16px" }}>New invoice</h1>
        <div style={{ ...cardStyle, padding: "20px 24px" }}>
          <div style={sectionLabelStyle}>Pitch</div>
          <PitchPicker onPick={setPitchId} />
        </div>
      </div>
    );
  }

  if (!isNew && status === "loading") {
    return <p style={{ padding: "24px", color: colors.inkSoft }}>Loading…</p>;
  }

  return (
    <div style={{ padding: "24px", maxWidth: "760px", margin: "0 auto" }}>
      <Link to="/invoices" style={{ color: colors.inkSoft, fontSize: "13px", textDecoration: "none" }}>← Back to Invoices</Link>
      <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "8px 0 4px" }}>
        {isNew ? "New invoice" : `INV-${String(invoiceNumber).padStart(6, "0")}`}
      </h1>
      <p style={{ color: colors.inkSoft, margin: "0 0 16px", fontSize: "13px" }}>
        {pitch?.number} {pitch?.area?.name && `· ${pitch.area.name}`}
        {!isNew && (
          <>
            {" · "}
            <Link to={`/invoices/${id}/print`} style={{ color: colors.brandDark }}>Print →</Link>
          </>
        )}
      </p>

      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
      {!editable && <p style={{ color: colors.inkSoft, fontSize: "13px" }}>You don't have permission to edit this invoice.</p>}

      <form onSubmit={handleSave}>
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Details</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Invoice date</label>
              <input disabled={!editable} required type="date" value={header.invoice_date} onChange={(e) => setHeader({ ...header, invoice_date: e.target.value })} style={fieldStyle} />
            </div>
            <div>
              <label style={labelStyle}>Due date</label>
              <input disabled={!editable} type="date" value={header.due_date} onChange={(e) => setHeader({ ...header, due_date: e.target.value })} style={fieldStyle} />
            </div>
          </div>
          <label style={labelStyle}>Reference</label>
          <input disabled={!editable} value={header.reference} onChange={(e) => setHeader({ ...header, reference: e.target.value })} placeholder="e.g. Repair — broken step" style={fieldStyle} />
          <label style={labelStyle}>Status</label>
          <select disabled={!editable} value={header.status} onChange={(e) => setHeader({ ...header, status: e.target.value })} style={fieldStyle}>
            <option value="draft">Draft</option>
            <option value="issued">Issued</option>
            <option value="void">Void</option>
          </select>
          <label style={labelStyle}>Notes</label>
          <textarea disabled={!editable} value={header.notes} onChange={(e) => setHeader({ ...header, notes: e.target.value })} rows={2} style={{ ...fieldStyle, resize: "vertical" }} />
        </div>

        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Bill to</div>
          <label style={labelStyle}>Name</label>
          <input disabled={!editable} value={header.bill_to_name} onChange={(e) => setHeader({ ...header, bill_to_name: e.target.value })} style={fieldStyle} />
          <label style={labelStyle}>Address</label>
          <textarea disabled={!editable} value={header.bill_to_address} onChange={(e) => setHeader({ ...header, bill_to_address: e.target.value })} rows={3} style={{ ...fieldStyle, resize: "vertical" }} />
        </div>

        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={sectionLabelStyle}>Lines</div>
            {editable && <button type="button" onClick={addLine} style={buttonStyle.secondary}>+ Add line</button>}
          </div>

          {lines.map((l, idx) => (
            <div key={l.id} style={{ borderBottom: `1px solid ${colors.line}`, paddingBottom: "12px", marginBottom: "12px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Nominal code</label>
                  <select disabled={!editable} required value={l.nominal_code_id} onChange={(e) => updateLine(idx, { nominal_code_id: e.target.value })} style={fieldStyle}>
                    {nominalCodes.map((n) => <option key={n.id} value={n.id}>{n.code} — {n.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>VAT rate</label>
                  <select disabled={!editable} required value={l.vat_rate_id} onChange={(e) => handleVatRateChange(idx, e.target.value)} style={fieldStyle}>
                    {vatRates.map((v) => <option key={v.id} value={v.id}>{v.name} ({v.rate_percent}%)</option>)}
                  </select>
                </div>
              </div>
              <label style={labelStyle}>Description</label>
              <input disabled={!editable} required value={l.description} onChange={(e) => updateLine(idx, { description: e.target.value })} style={fieldStyle} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Net</label>
                  <input disabled={!editable} required type="number" step="0.01" value={l.net_amount} onChange={(e) => handleNetChange(idx, e.target.value)} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>VAT</label>
                  <input disabled type="number" step="0.01" value={l.vat_amount} style={{ ...fieldStyle, color: colors.inkSoft }} />
                </div>
                <div>
                  <label style={labelStyle}>Gross</label>
                  <input disabled={!editable} required type="number" step="0.01" value={l.gross_amount} onChange={(e) => handleGrossChange(idx, e.target.value)} style={fieldStyle} />
                </div>
              </div>
              {editable && <button type="button" onClick={() => removeLine(idx)} style={{ ...buttonStyle.secondary, color: colors.immediate, marginTop: "8px" }}>Remove line</button>}
            </div>
          ))}
          {lines.length === 0 && <p style={{ color: colors.inkSoft, fontSize: "13px" }}>No lines yet.</p>}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "24px", paddingTop: "8px", fontSize: "14px" }}>
            <div><strong>Net:</strong> {currency.format(totals.totalNet)}</div>
            <div><strong>VAT:</strong> {currency.format(totals.totalVat)}</div>
            <div><strong>Total:</strong> {currency.format(totals.totalGross)}</div>
          </div>
        </div>

        {status === "saved" && <p style={{ color: colors.success, fontSize: "13px" }}>Saved.</p>}
        {editable && (
          <button type="submit" disabled={status === "saving"} style={buttonStyle.primary}>
            {status === "saving" ? "Saving…" : isNew ? "Create invoice" : "Save changes"}
          </button>
        )}
      </form>
    </div>
  );
}
