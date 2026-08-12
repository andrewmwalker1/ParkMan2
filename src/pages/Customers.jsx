import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { colors, fonts, cardStyle, buttonStyle } from "../lib/theme.js";

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.lineStrong}`,
  fontFamily: fonts.body,
};

// Andy, 12 Aug 2026: editing moved entirely onto the combined Unit
// page -- this list is now read-only browse/search. Each row resolves
// its current pitch (via Ownership -> Placement, same chain
// resolveCustomerPitch.js walks) and links straight into that pitch's
// Customer tab; a customer with no current pitch (prospective, or has
// left) shows plainly instead of linking anywhere, since there's no
// standalone edit screen left to send them to.
export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [pitchIdByCustomerId, setPitchIdByCustomerId] = useState({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from("customer")
      .select("id, customer1_first_name, customer1_surname, customer1_phone, customer1_email, customer2_first_name, customer2_surname")
      .is("deleted_at", null)
      .order("customer1_surname")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setCustomers(data || []);
      });

    Promise.all([
      supabase.from("ownership").select("caravan_id, primary_customer_id, secondary_customer_id").is("end_date", null),
      supabase.from("placement").select("caravan_id, pitch_id").is("end_date", null),
    ]).then(([{ data: ownerships }, { data: placements }]) => {
      const pitchIdByCaravanId = {};
      (placements || []).forEach((p) => {
        if (p.pitch_id) pitchIdByCaravanId[p.caravan_id] = p.pitch_id;
      });
      const map = {};
      (ownerships || []).forEach((o) => {
        const pitchId = pitchIdByCaravanId[o.caravan_id];
        if (!pitchId) return;
        if (o.primary_customer_id) map[o.primary_customer_id] = pitchId;
        if (o.secondary_customer_id) map[o.secondary_customer_id] = pitchId;
      });
      setPitchIdByCustomerId(map);
    });
  }, []);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter((c) =>
      [c.customer1_first_name, c.customer1_surname, c.customer2_first_name, c.customer2_surname, c.customer1_phone, c.customer1_email]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [customers, search]);

  return (
    <div style={{ padding: "24px", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: 0 }}>Customers</h1>
        <button onClick={() => navigate("/customers/new")} style={buttonStyle.primary}>+ Add customer</button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, phone, or email…"
        style={{ ...fieldStyle, marginBottom: "16px" }}
      />

      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {visible.map((c) => {
        const pitchId = pitchIdByCustomerId[c.id];
        const content = (
          <>
            <div style={{ fontWeight: 600 }}>
              {c.customer1_first_name} {c.customer1_surname}
              {c.customer2_first_name && ` & ${c.customer2_first_name} ${c.customer2_surname}`}
            </div>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>
              {[c.customer1_phone, c.customer1_email].filter(Boolean).join(" · ")}
              {!pitchId && <> · not currently on a pitch</>}
            </div>
          </>
        );
        return pitchId ? (
          <Link
            key={c.id}
            to={`/units/${pitchId}?tab=customer`}
            state={{ originPath: "/customers", originLabel: "Customers" }}
            style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "block", textDecoration: "none", color: "inherit" }}
          >
            {content}
          </Link>
        ) : (
          <div key={c.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px" }}>
            {content}
          </div>
        );
      })}
      {visible.length === 0 && <p style={{ color: colors.inkSoft }}>No customers match.</p>}
    </div>
  );
}
