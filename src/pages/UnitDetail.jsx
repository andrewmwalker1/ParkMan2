import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { suggestSortKey } from "../lib/sortKey.js";
import { useAuth } from "../lib/AuthContext.jsx";
import NotesSection from "../components/NotesSection.jsx";
import AddressFields from "./admin/AddressFields.jsx";
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

// Search-existing-caravan picker used to site a caravan on this pitch --
// creating a brand new caravan still happens on the full Caravans screen.
// Shows where a matched caravan currently sits (if anywhere), since
// picking one already sited elsewhere moves it here rather than being
// blocked -- caravans do move pitches (see PROJECT-BRIEF.md).
function CaravanPicker({ onPick }) {
  const [query, setQuery] = useState("");
  const [all, setAll] = useState(null);
  const [locations, setLocations] = useState({});

  useEffect(() => {
    supabase
      .from("caravan")
      .select("id, make, model, key_number, serial_number")
      .then(({ data }) => setAll(data || []));
    supabase
      .from("placement")
      .select("caravan_id, pitch:pitch_id(number)")
      .is("end_date", null)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((p) => {
          if (p.pitch) map[p.caravan_id] = p.pitch.number;
        });
        setLocations(map);
      });
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !all) return [];
    return all
      .filter((c) => [c.make, c.model, c.key_number, c.serial_number].filter(Boolean).some((v) => v.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [query, all]);

  return (
    <div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search existing caravans by make, model, or key number…" style={fieldStyle} />
      {matches.map((c) => (
        <div
          key={c.id}
          onClick={() => onPick(c.id, locations[c.id])}
          style={{ ...cardStyle, padding: "8px 12px", marginBottom: "6px", cursor: "pointer", fontSize: "13.5px" }}
        >
          {c.make} {c.model}
          {c.key_number && <span style={{ color: colors.inkSoft }}> · {c.key_number}</span>}
          {locations[c.id] && <span style={{ color: colors.immediate }}> · currently on {locations[c.id]}</span>}
        </div>
      ))}
      {query.trim() && all && matches.length === 0 && <p style={{ fontSize: "13px", color: colors.inkSoft }}>No matches.</p>}
      <Link to="/caravans/new" style={smallLinkStyle}>+ Create a new caravan →</Link>
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
      customer1_receives_billing: !!form.customer1_receives_billing,
      customer2_title: form.customer2_title,
      customer2_first_name: form.customer2_first_name,
      customer2_surname: form.customer2_surname,
      customer2_phone: form.customer2_phone,
      customer2_email: form.customer2_email,
      customer2_receives_billing: !!form.customer2_receives_billing,
      correspondence_salutation: form.correspondence_salutation,
      address_salutation: form.address_salutation,
      street: form.street,
      town: form.town,
      county: form.county,
      country: form.country,
      postcode: form.postcode,
      delivery_preference: form.delivery_preference,
      mailing_list: !!form.mailing_list,
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
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: colors.inkSoft, marginBottom: "10px" }}>
            <input type="checkbox" checked={!!form.customer1_receives_billing} onChange={(e) => setForm({ ...form, customer1_receives_billing: e.target.checked })} />
            Receives billing and correspondence
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr", gap: "10px" }}>
            <input placeholder="Title" value={form.customer2_title || ""} onChange={(e) => setForm({ ...form, customer2_title: e.target.value })} style={fieldStyle} />
            <input placeholder="First name" value={form.customer2_first_name || ""} onChange={(e) => setForm({ ...form, customer2_first_name: e.target.value })} style={fieldStyle} />
            <input placeholder="Surname" value={form.customer2_surname || ""} onChange={(e) => setForm({ ...form, customer2_surname: e.target.value })} style={fieldStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="Phone" value={form.customer2_phone || ""} onChange={(e) => setForm({ ...form, customer2_phone: e.target.value })} style={fieldStyle} />
            <input type="email" placeholder="Email" value={form.customer2_email || ""} onChange={(e) => setForm({ ...form, customer2_email: e.target.value })} style={fieldStyle} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: colors.inkSoft, marginBottom: "10px" }}>
            <input type="checkbox" checked={!!form.customer2_receives_billing} onChange={(e) => setForm({ ...form, customer2_receives_billing: e.target.checked })} />
            Receives billing and correspondence
          </label>

          <div style={{ fontSize: "11px", fontWeight: 600, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", margin: "6px 0 8px" }}>Address & correspondence</div>
          <label style={labelStyle}>Correspondence salutation</label>
          <input placeholder="e.g. Andy" value={form.correspondence_salutation || ""} onChange={(e) => setForm({ ...form, correspondence_salutation: e.target.value })} style={fieldStyle} />
          <label style={labelStyle}>Address salutation</label>
          <input placeholder="e.g. Mr & Mrs A Smith" value={form.address_salutation || ""} onChange={(e) => setForm({ ...form, address_salutation: e.target.value })} style={fieldStyle} />

          <AddressFields form={form} setForm={setForm} />

          <div style={{ display: "flex", gap: "16px", alignItems: "center", margin: "-2px 0 12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: colors.inkSoft }}>
              <input type="radio" name={`delivery-${title}`} checked={form.delivery_preference === "email"} onChange={() => setForm({ ...form, delivery_preference: "email" })} /> Email
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: colors.inkSoft }}>
              <input type="radio" name={`delivery-${title}`} checked={form.delivery_preference === "paper"} onChange={() => setForm({ ...form, delivery_preference: "paper" })} /> Paper
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: colors.inkSoft, marginLeft: "auto" }}>
              <input type="checkbox" checked={!!form.mailing_list} onChange={(e) => setForm({ ...form, mailing_list: e.target.checked })} /> Mailing list
            </label>
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
            {onRemove && <button type="button" onClick={onRemove} style={{ ...buttonStyle.secondary, color: colors.immediate, marginLeft: "auto" }}>Remove</button>}
          </div>
        </form>
      )}

      {customer && <NotesSection table="customer_note" idColumn="customer_id" id={customer.id} />}
    </div>
  );
}

export default function UnitDetail() {
  const { pitchId } = useParams();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const initialTab = searchParams.get("tab");
  // Every entry point (OperationalTable, Pitches.jsx) passes where it
  // came from via router state, so "← Back" actually returns you to the
  // list you were just on (Park list, Search results, or Pitches)
  // instead of always assuming Pitches.
  const origin = location.state?.originPath ? location.state : { originPath: "/pitches", originLabel: "Pitches" };

  const [tab, setTab] = useState(["customer", "caravan", "pitch"].includes(initialTab) ? initialTab : "customer");
  const [pitch, setPitch] = useState(null);
  const [pitchForm, setPitchForm] = useState(null);
  const [pitchStatus, setPitchStatus] = useState("idle");
  const [areas, setAreas] = useState([]);
  const [bands, setBands] = useState([]);
  const [pitchTypes, setPitchTypes] = useState([]);
  const [pitchStatuses, setPitchStatuses] = useState([]);
  const { profile } = useAuth();
  const [caravan, setCaravan] = useState(null);
  const [caravanForm, setCaravanForm] = useState(null);
  const [caravanStatus, setCaravanStatus] = useState("idle");
  const [caravanTypes, setCaravanTypes] = useState([]);
  const [caravanStatuses, setCaravanStatuses] = useState([]);
  const [caravanConditions, setCaravanConditions] = useState([]);
  const [pickingCaravan, setPickingCaravan] = useState(false);
  const [ownership, setOwnership] = useState(null);
  const [primaryCustomer, setPrimaryCustomer] = useState(null);
  const [secondaryCustomer, setSecondaryCustomer] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      supabase.from("area").select("id, name, code").order("name"),
      supabase.from("pitch_band").select("id, code, area_id").order("code"),
      supabase.from("pitch_type").select("id, name").order("name"),
      supabase.from("pitch_status").select("id, name").order("name"),
    ]).then(([{ data: a }, { data: b }, { data: t }, { data: s }]) => {
      setAreas(a || []);
      setBands(b || []);
      setPitchTypes(t || []);
      setPitchStatuses(s || []);
    });
  }, []);

  useEffect(() => {
    if (!profile) return;
    Promise.all([
      supabase.from("caravan_type").select("id, name").eq("business_id", profile.business_id).order("name"),
      supabase.from("caravan_status").select("id, name").eq("business_id", profile.business_id).order("name"),
      supabase.from("caravan_condition").select("id, name").eq("business_id", profile.business_id).order("name"),
    ]).then(([{ data: t }, { data: s }, { data: c }]) => {
      setCaravanTypes(t || []);
      setCaravanStatuses(s || []);
      setCaravanConditions(c || []);
    });
  }, [profile]);

  function refresh() {
    supabase
      .from("pitch")
      .select("id, number, sort_key, capacity, length, width, area_id, pitch_band_id, type_id, status_id, area:area_id(name, code), type:type_id(name), status:status_id(name)")
      .eq("id", pitchId)
      .single()
      .then(({ data, error: err }) => {
        if (err) {
          setError(err.message);
          return;
        }
        setPitch(data);
        setPitchForm({
          area_id: data.area_id,
          pitch_band_id: data.pitch_band_id || "",
          type_id: data.type_id,
          status_id: data.status_id,
          number: data.number,
          sort_key: data.sort_key,
          capacity: String(data.capacity),
          length: data.length ?? "",
          width: data.width ?? "",
          sortKeyTouched: true,
        });
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
        setCaravanForm({ ...car, model_year: car.model_year ?? "", build_year: car.build_year ?? "", length: car.length ?? "", width: car.width ?? "", bedrooms: car.bedrooms ?? "", berths: car.berths ?? "" });

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
  useEffect(() => setPitchStatus("idle"), [pitchId]);
  useEffect(() => setPickingCaravan(false), [pitchId]);

  // Number stores the area prefix directly (see PROJECT-BRIEF.md), so
  // switching Area mid-edit swaps the prefix in place -- same logic as
  // Pitches.jsx's handleAreaChange.
  function handlePitchAreaChange(newAreaId) {
    setPitchForm((f) => {
      const oldCode = areas.find((a) => a.id === f.area_id)?.code;
      const newCode = areas.find((a) => a.id === newAreaId)?.code;
      let number = f.number;
      if (oldCode && number.toUpperCase().startsWith(`${oldCode}-`)) {
        number = `${newCode || ""}-${number.slice(oldCode.length + 1)}`;
      } else if (!number && newCode) {
        number = `${newCode}-`;
      }
      return {
        ...f,
        area_id: newAreaId,
        pitch_band_id: "",
        number,
        sort_key: f.sortKeyTouched ? f.sort_key : suggestSortKey(number),
      };
    });
  }

  function handlePitchNumberChange(value) {
    setPitchForm((f) => ({
      ...f,
      number: value,
      sort_key: f.sortKeyTouched ? f.sort_key : suggestSortKey(value),
    }));
  }

  async function handleSavePitch(e) {
    e.preventDefault();
    setPitchStatus("saving");
    const { error: err } = await supabase
      .from("pitch")
      .update({
        area_id: pitchForm.area_id,
        pitch_band_id: pitchForm.pitch_band_id || null,
        type_id: pitchForm.type_id,
        status_id: pitchForm.status_id,
        number: pitchForm.number,
        sort_key: pitchForm.sort_key || suggestSortKey(pitchForm.number),
        capacity: Number(pitchForm.capacity) || 1,
        length: pitchForm.length === "" ? null : Number(pitchForm.length),
        width: pitchForm.width === "" ? null : Number(pitchForm.width),
      })
      .eq("id", pitchId);
    if (err) {
      setError(err.message);
      setPitchStatus("idle");
      return;
    }
    refresh();
    setPitchStatus("saved");
  }

  async function handleSaveCaravan(e) {
    e.preventDefault();
    setCaravanStatus("saving");
    const { error: err } = await supabase
      .from("caravan")
      .update({
        type_id: caravanForm.type_id || null,
        status_id: caravanForm.status_id || null,
        make: caravanForm.make,
        model: caravanForm.model,
        colour: caravanForm.colour,
        serial_number: caravanForm.serial_number,
        model_year: caravanForm.model_year === "" ? null : Number(caravanForm.model_year),
        build_year: caravanForm.build_year === "" ? null : Number(caravanForm.build_year),
        length: caravanForm.length === "" ? null : Number(caravanForm.length),
        width: caravanForm.width === "" ? null : Number(caravanForm.width),
        bedrooms: caravanForm.bedrooms === "" ? null : Number(caravanForm.bedrooms),
        berths: caravanForm.berths === "" ? null : Number(caravanForm.berths),
        key_number: caravanForm.key_number,
        for_sale: !!caravanForm.for_sale,
        pat_test_expiry: caravanForm.pat_test_expiry || null,
        gas_test_expiry: caravanForm.gas_test_expiry || null,
        condition_id: caravanForm.condition_id || null,
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

  // Sites caravanId on this pitch. If it's currently sited elsewhere
  // (currentPitchNumber, shown to the user in CaravanPicker before they
  // pick), that placement is end-dated first -- a caravan can only be
  // on one pitch at a time, so picking one moves it rather than being
  // blocked.
  async function assignCaravan(caravanId) {
    setError(null);
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from("placement").update({ end_date: today }).eq("caravan_id", caravanId).is("end_date", null);
    const { error: err } = await supabase.from("placement").insert({ pitch_id: pitchId, caravan_id: caravanId, start_date: today });
    if (err) setError(err.message);
    else refresh();
  }

  async function removeCaravan() {
    if (!caravan) return;
    const today = new Date().toISOString().slice(0, 10);
    const { error: err } = await supabase.from("placement").update({ end_date: today }).eq("pitch_id", pitchId).is("end_date", null);
    if (err) setError(err.message);
    else refresh();
  }

  if (!pitch) return <p style={{ padding: "24px", color: colors.inkSoft }}>Loading…</p>;

  const bandsForArea = pitchForm ? bands.filter((b) => b.area_id === pitchForm.area_id) : [];

  const tabs = [
    { key: "customer", label: "Customer" },
    { key: "caravan", label: "Caravan" },
    { key: "pitch", label: "Pitch" },
  ];

  return (
    <div style={{ padding: "24px", maxWidth: "620px", margin: "0 auto" }}>
      <Link to={origin.originPath} style={{ color: colors.inkSoft, fontSize: "13px", textDecoration: "none" }}>← Back to {origin.originLabel}</Link>
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
          {!caravan && !pickingCaravan && (
            <>
              <p style={{ fontSize: "13px", color: colors.inkSoft }}>No caravan currently sited on this pitch.</p>
              <button type="button" onClick={() => setPickingCaravan(true)} style={buttonStyle.secondary}>+ Assign caravan</button>
            </>
          )}
          {!caravan && pickingCaravan && (
            <CaravanPicker
              onPick={(id) => {
                setPickingCaravan(false);
                assignCaravan(id);
              }}
            />
          )}
          {caravan && caravanForm && (
            <form onSubmit={handleSaveCaravan}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={labelStyle}>Make</label><input value={caravanForm.make || ""} onChange={(e) => setCaravanForm({ ...caravanForm, make: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Model</label><input value={caravanForm.model || ""} onChange={(e) => setCaravanForm({ ...caravanForm, model: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Colour</label><input value={caravanForm.colour || ""} onChange={(e) => setCaravanForm({ ...caravanForm, colour: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Serial number</label><input value={caravanForm.serial_number || ""} onChange={(e) => setCaravanForm({ ...caravanForm, serial_number: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Model year</label><input type="number" value={caravanForm.model_year} onChange={(e) => setCaravanForm({ ...caravanForm, model_year: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Build year</label><input type="number" value={caravanForm.build_year} onChange={(e) => setCaravanForm({ ...caravanForm, build_year: e.target.value })} style={fieldStyle} /></div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={caravanForm.type_id || ""} onChange={(e) => setCaravanForm({ ...caravanForm, type_id: e.target.value })} style={fieldStyle}>
                    <option value="">—</option>
                    {caravanTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={caravanForm.status_id || ""} onChange={(e) => setCaravanForm({ ...caravanForm, status_id: e.target.value })} style={fieldStyle}>
                    <option value="">—</option>
                    {caravanStatuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Condition</label>
                  <select value={caravanForm.condition_id || ""} onChange={(e) => setCaravanForm({ ...caravanForm, condition_id: e.target.value })} style={fieldStyle}>
                    <option value="">—</option>
                    {caravanConditions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div><label style={labelStyle}>Length (ft)</label><input type="number" step="0.1" value={caravanForm.length} onChange={(e) => setCaravanForm({ ...caravanForm, length: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Width (ft)</label><input type="number" step="0.1" value={caravanForm.width} onChange={(e) => setCaravanForm({ ...caravanForm, width: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Bedrooms</label><input type="number" min="0" value={caravanForm.bedrooms} onChange={(e) => setCaravanForm({ ...caravanForm, bedrooms: e.target.value })} style={fieldStyle} /></div>
                <div><label style={labelStyle}>Berths</label><input type="number" min="0" value={caravanForm.berths} onChange={(e) => setCaravanForm({ ...caravanForm, berths: e.target.value })} style={fieldStyle} /></div>
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
                <button type="button" onClick={removeCaravan} style={{ ...buttonStyle.secondary, color: colors.immediate, marginLeft: "auto" }}>Unsite</button>
              </div>
            </form>
          )}
          {caravan && <NotesSection table="caravan_note" idColumn="caravan_id" id={caravan.id} />}
        </div>
      )}

      {tab === "pitch" && pitchForm && (
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Pitch</div>
          <form onSubmit={handleSavePitch}>
            <label style={labelStyle}>Area</label>
            <select required value={pitchForm.area_id} onChange={(e) => handlePitchAreaChange(e.target.value)} style={fieldStyle}>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
              <div>
                <label style={labelStyle}>Number</label>
                <input required value={pitchForm.number} onChange={(e) => handlePitchNumberChange(e.target.value)} placeholder="e.g. OP-A16" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Sort key</label>
                <input
                  required
                  value={pitchForm.sort_key}
                  onChange={(e) => setPitchForm({ ...pitchForm, sort_key: e.target.value, sortKeyTouched: true })}
                  style={fieldStyle}
                />
              </div>
            </div>

            <label style={labelStyle}>Pitch band <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <select value={pitchForm.pitch_band_id} onChange={(e) => setPitchForm({ ...pitchForm, pitch_band_id: e.target.value })} style={fieldStyle}>
              <option value="">No band set</option>
              {bandsForArea.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
            </select>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <label style={labelStyle}>Type</label>
                <select required value={pitchForm.type_id} onChange={(e) => setPitchForm({ ...pitchForm, type_id: e.target.value })} style={fieldStyle}>
                  {pitchTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select required value={pitchForm.status_id} onChange={(e) => setPitchForm({ ...pitchForm, status_id: e.target.value })} style={fieldStyle}>
                  {pitchStatuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Capacity</label>
                <input required type="number" min="1" value={pitchForm.capacity} onChange={(e) => setPitchForm({ ...pitchForm, capacity: e.target.value })} style={fieldStyle} />
              </div>
              <div />
              <div>
                <label style={labelStyle}>Length (ft, indicative)</label>
                <input type="number" step="0.1" value={pitchForm.length} onChange={(e) => setPitchForm({ ...pitchForm, length: e.target.value })} style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Width (ft, indicative)</label>
                <input type="number" step="0.1" value={pitchForm.width} onChange={(e) => setPitchForm({ ...pitchForm, width: e.target.value })} style={fieldStyle} />
              </div>
            </div>

            {pitchStatus === "saved" && <p style={{ color: colors.success, fontSize: "13px" }}>Saved.</p>}
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button type="submit" disabled={pitchStatus === "saving"} style={buttonStyle.primary}>{pitchStatus === "saving" ? "Saving…" : "Save changes"}</button>
              <Link to={`/invoices/new?pitch=${pitchId}`} style={smallLinkStyle}>+ Create invoice for this pitch →</Link>
            </div>
          </form>
          <NotesSection table="pitch_note" idColumn="pitch_id" id={pitchId} />
        </div>
      )}
    </div>
  );
}
