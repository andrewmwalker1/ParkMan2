import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
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

const blank = {
  type_id: "", status_id: "",
  make: "", model: "", colour: "", serial_number: "",
  model_year: "", build_year: "",
  length: "", width: "", bedrooms: "", berths: "",
  key_number: "",
  pat_test_expiry: "", gas_test_expiry: "",
  condition_id: "", for_sale: false,
};

// A test date within 60 days (or already past) is worth calling out --
// same "make it easy to act on, not just stored" idea flagged for
// PAT/Gas Test in PROJECT-BRIEF.md.
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
        style={{
          ...fieldStyle,
          borderColor: status ? colors.immediate : colors.lineStrong,
          background: status ? "#F5E5DD" : "#fff",
        }}
      />
      {status === "overdue" && <p style={{ color: colors.immediate, fontSize: "12px", margin: "-6px 0 10px" }}>Overdue</p>}
      {status === "soon" && <p style={{ color: colors.immediate, fontSize: "12px", margin: "-6px 0 10px" }}>Due soon</p>}
    </div>
  );
}

// Andy, 12 Aug 2026: editing an existing caravan moved entirely onto
// the combined Unit page -- this screen is now create-only. Landing
// here with a real id (an old bookmark, a stale link) resolves its
// current placement and bounces straight to that pitch's Caravan tab;
// off-park caravans have nowhere useful to go, so this just says so
// rather than reviving the old standalone edit form.
export default function CaravanDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const origin = location.state?.originPath ? location.state : { originPath: "/caravans", originLabel: "Caravans" };

  const [form, setForm] = useState(isNew ? blank : null);
  const [types, setTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | saving | error
  const [error, setError] = useState(null);
  const [offPark, setOffPark] = useState(false);

  useEffect(() => {
    if (!profile || !isNew) return;
    Promise.all([
      supabase.from("caravan_type").select("id, name").eq("business_id", profile.business_id).order("name"),
      supabase.from("caravan_status").select("id, name").eq("business_id", profile.business_id).order("name"),
      supabase.from("caravan_condition").select("id, name").eq("business_id", profile.business_id).order("name"),
    ]).then(([{ data: t }, { data: s }, { data: c }]) => {
      setTypes(t || []);
      setStatuses(s || []);
      setConditions(c || []);
    });
  }, [profile, isNew]);

  useEffect(() => {
    if (isNew) return;
    setOffPark(false);
    supabase
      .from("placement")
      .select("pitch_id")
      .eq("caravan_id", id)
      .is("end_date", null)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.pitch_id) navigate(`/units/${data.pitch_id}?tab=caravan`, { replace: true, state: origin });
        else setOffPark(true);
      });
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    const payload = {
      business_id: profile.business_id,
      type_id: form.type_id || null,
      status_id: form.status_id || null,
      make: form.make, model: form.model, colour: form.colour, serial_number: form.serial_number,
      model_year: form.model_year === "" ? null : Number(form.model_year),
      build_year: form.build_year === "" ? null : Number(form.build_year),
      length: form.length === "" ? null : Number(form.length),
      width: form.width === "" ? null : Number(form.width),
      bedrooms: form.bedrooms === "" ? null : Number(form.bedrooms),
      berths: form.berths === "" ? null : Number(form.berths),
      key_number: form.key_number,
      for_sale: !!form.for_sale,
      pat_test_expiry: form.pat_test_expiry || null,
      gas_test_expiry: form.gas_test_expiry || null,
      condition_id: form.condition_id || null,
    };

    const { error: err } = await supabase.from("caravan").insert(payload);
    if (err) {
      setStatus("idle");
      setError(err.message);
      return;
    }
    navigate("/caravans");
  }

  if (!isNew) {
    if (offPark) {
      return (
        <div style={{ padding: "24px", maxWidth: "600px", margin: "0 auto" }}>
          <Link to={origin.originPath} style={{ color: colors.inkSoft, fontSize: "13px", textDecoration: "none" }}>← Back to {origin.originLabel}</Link>
          <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "8px 0 12px" }}>Off-park</h1>
          <p style={{ color: colors.inkSoft, fontSize: "13.5px" }}>
            This caravan isn't sited on a pitch right now, so there's no combined screen to open. Site it on a pitch from that pitch's Caravan tab to edit its details.
          </p>
        </div>
      );
    }
    return <p style={{ padding: "24px", color: colors.inkSoft }}>Loading…</p>;
  }

  return (
    <div style={{ padding: "24px", maxWidth: "600px", margin: "0 auto" }}>
      <Link to={origin.originPath} style={{ color: colors.inkSoft, fontSize: "13px", textDecoration: "none" }}>← Back to {origin.originLabel}</Link>
      <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "8px 0 20px" }}>New caravan</h1>

      <form onSubmit={handleSave}>
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Identity</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={labelStyle}>Make</label><input value={form.make || ""} onChange={(e) => setForm({ ...form, make: e.target.value })} style={fieldStyle} /></div>
            <div><label style={labelStyle}>Model</label><input value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} style={fieldStyle} /></div>
            <div><label style={labelStyle}>Colour</label><input value={form.colour || ""} onChange={(e) => setForm({ ...form, colour: e.target.value })} style={fieldStyle} /></div>
            <div><label style={labelStyle}>Serial number</label><input value={form.serial_number || ""} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} style={fieldStyle} /></div>
            <div><label style={labelStyle}>Model year</label><input type="number" value={form.model_year} onChange={(e) => setForm({ ...form, model_year: e.target.value })} style={fieldStyle} /></div>
            <div><label style={labelStyle}>Build year</label><input type="number" value={form.build_year} onChange={(e) => setForm({ ...form, build_year: e.target.value })} style={fieldStyle} /></div>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Type & condition</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={form.type_id || ""} onChange={(e) => setForm({ ...form, type_id: e.target.value })} style={fieldStyle}>
                <option value="">—</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select value={form.status_id || ""} onChange={(e) => setForm({ ...form, status_id: e.target.value })} style={fieldStyle}>
                <option value="">—</option>
                {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Condition</label>
              <select value={form.condition_id || ""} onChange={(e) => setForm({ ...form, condition_id: e.target.value })} style={fieldStyle}>
                <option value="">—</option>
                {conditions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: colors.inkSoft, marginTop: "4px" }}>
            <input type="checkbox" checked={!!form.for_sale} onChange={(e) => setForm({ ...form, for_sale: e.target.checked })} />
            For sale
          </label>
        </div>

        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Size</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><label style={labelStyle}>Length (ft)</label><input type="number" step="0.1" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} style={fieldStyle} /></div>
            <div><label style={labelStyle}>Width (ft)</label><input type="number" step="0.1" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} style={fieldStyle} /></div>
            <div><label style={labelStyle}>Bedrooms</label><input type="number" min="0" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} style={fieldStyle} /></div>
            <div><label style={labelStyle}>Berths</label><input type="number" min="0" value={form.berths} onChange={(e) => setForm({ ...form, berths: e.target.value })} style={fieldStyle} /></div>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Key & compliance</div>
          <label style={labelStyle}>Key number</label>
          <input value={form.key_number || ""} onChange={(e) => setForm({ ...form, key_number: e.target.value })} style={fieldStyle} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <ExpiryField label="PAT test expiry" value={form.pat_test_expiry} onChange={(v) => setForm({ ...form, pat_test_expiry: v })} />
            <ExpiryField label="Gas test expiry" value={form.gas_test_expiry} onChange={(v) => setForm({ ...form, gas_test_expiry: v })} />
          </div>
        </div>

        {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button type="submit" disabled={status === "saving"} style={buttonStyle.primary}>
            {status === "saving" ? "Saving…" : "Create caravan"}
          </button>
        </div>
      </form>
    </div>
  );
}
