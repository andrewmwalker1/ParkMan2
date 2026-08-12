import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import AddressFields from "./admin/AddressFields.jsx";
import LightningButton from "../components/LightningButton.jsx";
import { buildCorrespondenceSalutation, buildAddressSalutation } from "../lib/salutations.js";
import { resolveCustomerPitchAndCaravan } from "../lib/resolveCustomerPitch.js";
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
  customer1_title: "", customer1_first_name: "", customer1_surname: "", customer1_phone: "", customer1_email: "", customer1_receives_billing: true,
  customer2_title: "", customer2_first_name: "", customer2_surname: "", customer2_phone: "", customer2_email: "", customer2_receives_billing: false,
  correspondence_salutation: "", address_salutation: "",
  street: "", town: "", county: "", country: "UK", postcode: "", language: "",
  delivery_preference: "email", mailing_list: false,
  nok1_name: "", nok1_relationship: "", nok1_phone: "", nok1_email: "",
  nok2_name: "", nok2_relationship: "", nok2_phone: "", nok2_email: "",
};

// Andy, 12 Aug 2026: editing an existing customer moved entirely onto
// the combined Unit page -- this screen is now create-only. Landing
// here with a real id (an old bookmark, a stale link) resolves that
// customer's current pitch and bounces straight to its Customer tab;
// with no current pitch, there's nowhere useful to send them, so this
// just says so rather than reviving the old standalone edit form.
export default function CustomerDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const origin = location.state?.originPath ? location.state : { originPath: "/customers", originLabel: "Customers" };

  const [form, setForm] = useState(isNew ? blank : null);
  const [status, setStatus] = useState("idle"); // idle | saving | error
  const [error, setError] = useState(null);
  const [notOnPitch, setNotOnPitch] = useState(false);

  useEffect(() => {
    if (isNew) return;
    setNotOnPitch(false);
    resolveCustomerPitchAndCaravan(id).then(({ pitch }) => {
      if (pitch?.id) navigate(`/units/${pitch.id}?tab=customer`, { replace: true, state: origin });
      else setNotOnPitch(true);
    });
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    const payload = { ...form, business_id: profile.business_id };

    const { error: err } = await supabase.from("customer").insert(payload);
    if (err) {
      setStatus("idle");
      setError(err.message);
      return;
    }
    navigate("/customers");
  }

  if (!isNew) {
    if (notOnPitch) {
      return (
        <div style={{ padding: "24px", maxWidth: "600px", margin: "0 auto" }}>
          <Link to={origin.originPath} style={{ color: colors.inkSoft, fontSize: "13px", textDecoration: "none" }}>← Back to {origin.originLabel}</Link>
          <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "8px 0 12px" }}>Not currently on a pitch</h1>
          <p style={{ color: colors.inkSoft, fontSize: "13.5px" }}>
            This customer isn't sited on a pitch right now, so there's no combined screen to open. Assign them to a pitch from that pitch's Customer tab to edit their details.
          </p>
        </div>
      );
    }
    return <p style={{ padding: "24px", color: colors.inkSoft }}>Loading…</p>;
  }

  return (
    <div style={{ padding: "24px", maxWidth: "600px", margin: "0 auto" }}>
      <Link to={origin.originPath} style={{ color: colors.inkSoft, fontSize: "13px", textDecoration: "none" }}>← Back to {origin.originLabel}</Link>
      <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: "8px 0 20px" }}>New customer</h1>

      <form onSubmit={handleSave}>
        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Customer 1</div>
          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr", gap: "10px" }}>
            <input placeholder="Title" value={form.customer1_title || ""} onChange={(e) => setForm({ ...form, customer1_title: e.target.value })} style={fieldStyle} />
            <input required placeholder="First name" value={form.customer1_first_name || ""} onChange={(e) => setForm({ ...form, customer1_first_name: e.target.value })} style={fieldStyle} />
            <input required placeholder="Surname" value={form.customer1_surname || ""} onChange={(e) => setForm({ ...form, customer1_surname: e.target.value })} style={fieldStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="Phone" value={form.customer1_phone || ""} onChange={(e) => setForm({ ...form, customer1_phone: e.target.value })} style={fieldStyle} />
            <input type="email" placeholder="Email" value={form.customer1_email || ""} onChange={(e) => setForm({ ...form, customer1_email: e.target.value })} style={fieldStyle} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: colors.inkSoft }}>
            <input type="checkbox" checked={!!form.customer1_receives_billing} onChange={(e) => setForm({ ...form, customer1_receives_billing: e.target.checked })} />
            Receives billing and correspondence
          </label>
        </div>

        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Customer 2 <span style={{ fontWeight: 400, textTransform: "none" }}>(optional)</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr 1fr", gap: "10px" }}>
            <input placeholder="Title" value={form.customer2_title || ""} onChange={(e) => setForm({ ...form, customer2_title: e.target.value })} style={fieldStyle} />
            <input placeholder="First name" value={form.customer2_first_name || ""} onChange={(e) => setForm({ ...form, customer2_first_name: e.target.value })} style={fieldStyle} />
            <input placeholder="Surname" value={form.customer2_surname || ""} onChange={(e) => setForm({ ...form, customer2_surname: e.target.value })} style={fieldStyle} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <input placeholder="Phone" value={form.customer2_phone || ""} onChange={(e) => setForm({ ...form, customer2_phone: e.target.value })} style={fieldStyle} />
            <input type="email" placeholder="Email" value={form.customer2_email || ""} onChange={(e) => setForm({ ...form, customer2_email: e.target.value })} style={fieldStyle} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: colors.inkSoft }}>
            <input type="checkbox" checked={!!form.customer2_receives_billing} onChange={(e) => setForm({ ...form, customer2_receives_billing: e.target.checked })} />
            Receives billing and correspondence
          </label>
        </div>

        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Address & correspondence</div>
          <div>
            <label style={labelStyle}>Correspondence salutation</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="e.g. Andy" value={form.correspondence_salutation || ""} onChange={(e) => setForm({ ...form, correspondence_salutation: e.target.value })} style={{ ...fieldStyle, flex: 1 }} />
              <LightningButton title="Build from names" onClick={() => setForm({ ...form, correspondence_salutation: buildCorrespondenceSalutation(form) })} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Address salutation</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input placeholder="e.g. Mr & Mrs A Smith" value={form.address_salutation || ""} onChange={(e) => setForm({ ...form, address_salutation: e.target.value })} style={{ ...fieldStyle, flex: 1 }} />
              <LightningButton title="Build from names" onClick={() => setForm({ ...form, address_salutation: buildAddressSalutation(form) })} />
            </div>
          </div>

          <AddressFields form={form} setForm={setForm} />

          <div style={{ display: "flex", gap: "16px", alignItems: "center", marginTop: "6px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: colors.inkSoft }}>
              <input type="radio" name="delivery" checked={form.delivery_preference === "email"} onChange={() => setForm({ ...form, delivery_preference: "email" })} /> Email
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: colors.inkSoft }}>
              <input type="radio" name="delivery" checked={form.delivery_preference === "paper"} onChange={() => setForm({ ...form, delivery_preference: "paper" })} /> Paper
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: colors.inkSoft, marginLeft: "auto" }}>
              <input type="checkbox" checked={!!form.mailing_list} onChange={(e) => setForm({ ...form, mailing_list: e.target.checked })} /> Mailing list
            </label>
          </div>
        </div>

        <div style={{ ...cardStyle, padding: "20px 24px", marginBottom: "16px" }}>
          <div style={sectionLabelStyle}>Next of kin</div>
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
        </div>

        {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          <button type="submit" disabled={status === "saving"} style={buttonStyle.primary}>
            {status === "saving" ? "Saving…" : "Create customer"}
          </button>
        </div>
      </form>
    </div>
  );
}
