import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
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
const smallLinkStyle = { fontSize: "12.5px", color: colors.brandDark, textDecoration: "none" };

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const days = (new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "overdue";
  if (days < 60) return "soon";
  return null;
}

function ExpiryField({ label, value, onChange }) {
  const status = expiryStatus(value);
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...fieldStyle, borderColor: status ? colors.immediate : colors.lineStrong, background: status ? "#F5E5DD" : "#fff" }}
      />
      {status === "overdue" && <p style={{ color: colors.immediate, fontSize: "12px", margin: "-6px 0 10px" }}>Overdue</p>}
      {status === "soon" && <p style={{ color: colors.immediate, fontSize: "12px", margin: "-6px 0 10px" }}>Due soon</p>}
    </div>
  );
}

// Search-existing-customer picker used to assign a Primary/Secondary
// owner -- creating a brand new customer still happens on the full
// Customers screen (deliberately not duplicating that whole form here);
// this just links one that already exists.
function CustomerPicker({ onPick }) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(null);

  useEffect(() => {
    supabase
      .from("customer")
      .select("id, customer1_first_name, customer1_surname, customer2_first_name, customer2_surname, customer1_phone")
      .then(({ data }) => setAll(data || []));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !all) return [];
    return all
      .filter((c) => `${c.customer1_first_name} ${c.customer1_surname} ${c.customer2_first_name || ""} ${c.customer2_surname || ""}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [query, all]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search existing customers by name…" style={fieldStyle} />
      {matches.map((c) => (
        <div
          key={c.id}
          onClick={() => onPick(c.id)}
          style={{ ...cardStyle, padding: "8px 12px", marginBottom: "6px", cursor: "pointer", fontSize: "13.5px" }}
        >
          {c.customer1_first_name} {c.customer1_surname}
          {c.customer2_first_name && <> & {c.customer2_first_name} {c.customer2_surname}</>}
          {c.customer1_phone && <span style={{ color: colors.inkSoft }}> · {c.customer1_phone}</span>}
        </div>
      ))}
      {query.trim() && all && matches.length === 0 && <p style={{ fontSize: "13px", color: colors.inkSoft }}>No matches.</p>}
      <Link to="/customers/new" style={smallLinkStyle}>+ Create a new customer →</Link>
    </div>
  );
}

// One card for Primary or Secondary owner. Manages its own edit-form
// state locally (customer1/2 name+phone+email only -- address/NOK/notes
// stay on the full Customer record, reached via the link at the
// bottom), and separately handles the "no one assigned yet" state via
// CustomerPicker.
function CustomerCard({ title, customer, onSave, onAssign, onRemove, blockedReason }) {
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState("idle");
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    setForm(customer ? { ...customer } : null);
    setStatus("idle");
    setPicking(false);
  }, [customer?.id]);

  async function handleSave(e) {
    e.preventDefault();
    setStatus("saving");
    await onSave({
      customer1_title: form.customer1_title,
      customer1_first_name: form.customer1_first_name,
      customer1_surname: form.customer1_surname,
      customer1_phone: form.customer1_phone,
      customer1_email: form.customer1_email,
      customer2_title: form.customer2_title,
      customer2_first_name: form.customer2_first_name,
      customer2_surname: form.customer2_surname,
      customer2_phone: form.customer2_phone,
      customer2_email: form.customer2_email,
      nok1_name: form.nok1_name,
      nok1_relationship: form.nok1_relationship,
      nok1_phone: form.nok1_phone,
      nok1_email: form.nok1_email,
      nok2_name: form.nok2_name,
      nok2_relationship: form.nok2_relationship,
      nok2_phone: form.nok2_phone,
      nok2_email: form.nok2_email,
    });
    setStatus("saved");
  }

  return (
    <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
      <div style={sectionLabelStyle}>{title}</div>

      {blockedReason && !customer && <p style={{ fontSize: "13px", color: colors.inkSoft }}>{blockedReason}</p>}

      {!blockedReason && !customer && !picking && (
        <button type="button" onClick={() => setPicking(true)} style={buttonStyle.secondary}>+ Assign owner</button>
      )}
      {!customer && picking && (
        <CustomerPicker
          onPick={(id) => {
            setPicking(false);
            onAssign(id);
          }}
        />
      )}

      {customer && form && (
        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr", gap: "10px" }}>
            <input placeholder="Title" value={form.customer1_title || ""} onChange={(e) => setForm({ ...form, customer1_title: e.target.value })} style={fieldStyle} />
            <input required placeholder="First name" value={form.customer1_first_name || ""} onChange={(e) => setForm({ ...form, customer1_first_name: e.target.value })} style={fieldStyle} />
            <input required placeholder="Surname" value={form.customer1_surname || ""} onChange={(e) => setForm({ ...form, customer1_surname: e.target.value })} style={fieldStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="Phone" value={form.customer1_phone || ""} onChange={(e) => setForm({ ...form, customer1_phone: e.target.value })} style={fieldStyle} />
            <input type="email" placeholder="Email" value={form.customer1_email || ""} onChange={(e) => setForm({ ...form, customer1_email: e.target.value })} style={fieldStyle} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr", gap: "10px" }}>
            <input placeholder="Title" value={form.customer2_title || ""} onChange={(e) => setForm({ ...form, customer2_title: e.target.value })} style={fieldStyle} />
            <input placeholder="First name" value={form.customer2_first_name || ""} onChange={(e) => setForm({ ...form, customer2_first_name: e.target.value })} style={fieldStyle} />
            <input placeholder="Surname" value={form.customer2_surname || ""} onChange={(e) => setForm({ ...form, customer2_surname: e.target.value })} style={fieldStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="Phone" value={form.customer2_phone || ""} onChange={(e) => setForm({ ...form, customer2_phone: e.target.value })} style={fieldStyle} />
            <input type="email" placeholder="Email" value={form.customer2_email || ""} onChange={(e) => setForm({ ...form, customer2_email: e.target.value })} style={fieldStyle} />
          </div>

          <div style={{ fontSize: "11px", fontWeight: 600, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", margin: "6px 0 8px" }}>Next of kin</div>
          {[1, 2].map((n) => (
            <div key={n} style={{ marginBottom: "6px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "10px" }}>
                <input placeholder="Name" value={form[`nok${n}_name`] || ""} onChange={(e) => setForm({ ...form, [`nok${n}_name`]: e.target.value })} style={fieldStyle} />
                <input placeholder="Relationship" value={form[`nok${n}_relationship`] || ""} onChange={(e) => setForm({ ...form, [`nok${n}_relationship`]: e.target.value })} style={fieldStyle} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <input placeholder="Contact number" value={form[`nok${n}_phone`] || ""} onChange={(e) => setForm({ ...form, [`nok${n}_phone`]: e.target.value })} style={fieldStyle} />
                <input type="email" placeholder="Email" value={form[`nok${n}_email`] || ""} onChange={(e) => setForm({ ...form, [`nok${n}_email`]: e.target.value })} style={fieldStyle} />
              </div>
            </div>
          ))}

          {status === "saved" && <p style={{ color: colors.success, fontSize: "13px" }}>Saved.</p>}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button type="submit" disabled={status === "saving"} style={buttonStyle.primary}>{status === "saving" ? "Saving…" : "Save changes"}</button>
            <Link to={`/customers/${customer.id}`} style={smallLinkStyle}>Full customer record →</Link>
            {onRemove && <button type="button" onClick={onRemove} style={{ ...buttonStyle.secondary, color: colors.immediate, marginLeft: "auto" }}>Remove</button>}
          </div>
        </form>
      )}
    </div>
  );
}

export default function UnitDetail() {
  const { pitchId } = useParams();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab");

  const [tab, setTab] = useState(["customer", "caravan", "pitch"].includes(initialTab) ? initialTab : "customer");
  const [pitch, setPitch] = useState(null);
  const [caravan, setCaravan] = useState(null);
  const [caravanForm, setCaravanForm] = useState(null);
  const [caravanStatus, setCaravanStatus] = useState("idle");
  const [ownership, setOwnership] = useState(null);
  const [primaryCustomer, setPrimaryCustomer] = useState(null);
  const [secondaryCustomer, setSecondaryCustomer] = useState(null);
  const [error, setError] = useState(null);

  function refresh() {
    supabase
      .from("pitch")
      .select("id, number, area:area_id(name), type:type_id(name), status:status_id(name)")
      .eq("id", pitchId)
      .single()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setPitch(data);
      });

    supabase
      .from("placement")
      .select("caravan_id")
      .eq("pitch_id", pitchId)
      .is("end_date", null)
      .maybeSingle()
      .then(async ({ data: pl }) => {
        if (!pl?.caravan_id) {
          setCaravan(null);
          setCaravanForm(null);
          setOwnership(null);
          setPrimaryCustomer(null);
          setSecondaryCustomer(null);
          return;
        }
        const { data: car } = await supabase.from("caravan").select("*").eq("id", pl.caravan_id).single();
        setCaravan(car);
        setCaravanForm(car);

        const { data: own } = await supabase
          .from("ownership")
          .select("id, primary_customer_id, secondary_customer_id")
          .eq("caravan_id", pl.caravan_id)
          .is("end_date", null)
          .maybeSingle();
        setOwnership(own || null);

        if (own?.primary_customer_id) {
          const { data: pc } = await supabase.from("customer").select("*").eq("id", own.primary_customer_id).single();
          setPrimaryCustomer(pc);
        } else {
          setPrimaryCustomer(null);
        }
        if (own?.secondary_customer_id) {
          const { data: sc } = await supabase.from("customer").select("*").eq("id", own.secondary_customer_id).single();
          setSecondaryCustomer(sc);
        } else {
          setSecondaryCustomer(null);
        }
      });
  }

  useEffect(refresh, [pitchId]);

  async function handleSaveCaravan(e) {
    e.preventDefault();
    setCaravanStatus("saving");
    const { error: err } = await supabase
      .from("caravan")
      .update({
        make: caravanForm.make,
        model: caravanForm.model,
        key_number: caravanForm.key_number,
        for_sale: !!caravanForm.for_sale,
        pat_test_expiry: caravanForm.pat_test_expiry || null,
        gas_test_expiry: caravanForm.gas_test_expiry || null,
      })
      .eq("id", caravan.id);
    if (err) {
      setError(err.message);
      setCaravanStatus("idle");
      return;
    }
    setCaravanStatus("saved");
  }

  async function saveCustomer(customerId, fields) {
    const { error: err } = await supabase.from("customer").update(fields).eq("id", customerId);
    if (err) setError(err.message);
    else refresh();
  }

  async function assignOwner(slot, customerId) {
    setError(null);
    if (!ownership) {
      // First owner ever recorded for this caravan -- always the primary slot.
      const { error: err } = await supabase.from("ownership").insert({
        caravan_id: caravan.id,
        primary_customer_id: customerId,
        start_date: new Date().toISOString().slice(0, 10),
      });
      if (err) setError(err.message);
      else refresh();
      return;
    }
    const field = slot === "primary" ? "primary_customer_id" : "secondary_customer_id";
    const { error: err } = await supabase.from("ownership").update({ [field]: customerId }).eq("id", ownership.id);
    if (err) setError(err.message);
    else refresh();
  }

  async function removeSecondary() {
    if (!ownership) return;
    const { error: err } = await supabase.from("ownership").update({ secondary_customer_id: null }).eq("id", ownership.id);
    if (err) setError(err.message);
    else refresh();
  }

  if (!pitch) return <p style={{ padding: "24px", color: colors.inkSoft }}>Loading…</p>;

  const tabs = [
    { key: "customer", label: "Customer" },
    { key: "caravan", label: "Caravan" },
    { key: "pitch", label: "Pitch" },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "620px", margin: "0 auto" }}>
      <Link to="/pitches" style={{ color: colors.inkSoft, fontSize: "13px", textDecoration: "none" }}>← Back to Pitches</Link>
      <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "8px 0 4px" }}>{pitch.number}</h1>
      <p style={{ color: colors.inkSoft, margin: "0 0 16px", fontSize: "13px" }}>{pitch.area?.name}</p>

      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      <div style={{ display: "flex", gap: "20px", borderBottom: `1px solid ${colors.line}`, marginBottom: "20px" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: "none",
              border: "none",
              borderBottom: tab === t.key ? `2px solid ${colors.brand}` : "2px solid transparent",
              padding: "0 0 10px",
              marginBottom: "-1px",
              fontFamily: fonts.body,
              fontSize: "14px",
              fontWeight: tab === t.key ? 700 : 500,
              color: tab === t.key ? colors.brandDark : colors.ink,
              cursor: "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "customer" && (
        <>
          <CustomerCard
            title="Primary customer"
            customer={primaryCustomer}
            blockedReason={!caravan ? "Add a caravan to this pitch first." : null}
            onSave={(fields) => saveCustomer(primaryCustomer.id, fields)}
            onAssign={(id) => assignOwner("primary", id)}
          />

          {primaryCustomer && (
            <CustomerCard
              title="Secondary customer (optional)"
              customer={secondaryCustomer}
              onSave={(fields) => saveCustomer(secondaryCustomer.id, fields)}
              onAssign={(id) => assignOwner("secondary", id)}
              onRemove={secondaryCustomer ? removeSecondary : null}
            />
          )}
        </>
      )}

      {tab === "caravan" && (
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Caravan</div>
          {!caravan && (
            <p style={{ fontSize: "13px", color: colors.inkSoft }}>
              No caravan currently sited on this pitch. Site one from the <Link to="/caravans" style={smallLinkStyle}>Caravans screen</Link>.
            </p>
          )}
          {caravan && caravanForm && (
            <form onSubmit={handleSaveCaravan}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={labelStyle}>Make</label><input value={caravanForm.make || ""} onChange={(e) => setCaravanForm({ ...caravanForm, make: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Model</label><input value={caravanForm.model || ""} onChange={(e) => setCaravanForm({ ...caravanForm, model: e.target.value })} style={fieldStyle} /></div>
              </div>
              <label style={labelStyle}>Key number</label>
              <input value={caravanForm.key_number || ""} onChange={(e) => setCaravanForm({ ...caravanForm, key_number: e.target.value })} style={fieldStyle} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <ExpiryField label="PAT test expiry" value={caravanForm.pat_test_expiry} onChange={(v) => setCaravanForm({ ...caravanForm, pat_test_expiry: v })} />
                <ExpiryField label="Gas test expiry" value={caravanForm.gas_test_expiry} onChange={(v) => setCaravanForm({ ...caravanForm, gas_test_expiry: v })} />
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: colors.inkSoft, marginBottom: "10px" }}>
                <input type="checkbox" checked={!!caravanForm.for_sale} onChange={(e) => setCaravanForm({ ...caravanForm, for_sale: e.target.checked })} />
                For sale
              </label>
              {caravanStatus === "saved" && <p style={{ color: colors.success, fontSize: "13px" }}>Saved.</p>}
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button type="submit" disabled={caravanStatus === "saving"} style={buttonStyle.primary}>{caravanStatus === "saving" ? "Saving…" : "Save changes"}</button>
                <Link to={`/caravans/${caravan.id}`} style={smallLinkStyle}>Full caravan record →</Link>
              </div>
            </form>
          )}
        </div>
      )}

      {tab === "pitch" && (
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Pitch</div>
          <p style={{ fontSize: "13.5px", color: colors.ink, margin: "0 0 4px" }}>{pitch.number}</p>
          <p style={{ fontSize: "13px", color: colors.inkSoft, margin: "0 0 16px" }}>{pitch.area?.name} · {pitch.type?.name} · {pitch.status?.name}</p>
          <Link to={`/pitches?open=${pitch.id}`} style={smallLinkStyle}>Edit pitch details →</Link>
        </div>
      )}
    </div>
  );
}
