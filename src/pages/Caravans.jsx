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
// page -- this list is now read-only browse/search. A sited caravan
// links straight into its pitch's Caravan tab; an off-park caravan
// (in for repair, between placements, on display) shows plainly, since
// there's no standalone edit screen left to send it to.
export default function Caravans() {
  const navigate = useNavigate();
  const [caravans, setCaravans] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState({});
  const [pitchIds, setPitchIds] = useState({});
  const [owners, setOwners] = useState({});

  useEffect(() => {
    supabase
      .from("caravan")
      .select("id, make, model, colour, key_number, serial_number, for_sale, type:type_id(name), status:status_id(name)")
      .is("deleted_at", null)
      .order("make")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setCaravans(data || []);
      });

    supabase
      .from("placement")
      .select("caravan_id, pitch_id, pitch:pitch_id(number)")
      .is("end_date", null)
      .then(({ data }) => {
        const nameMap = {};
        const idMap = {};
        (data || []).forEach((p) => {
          if (p.pitch) nameMap[p.caravan_id] = p.pitch.number;
          if (p.pitch_id) idMap[p.caravan_id] = p.pitch_id;
        });
        setLocations(nameMap);
        setPitchIds(idMap);
      });

    supabase
      .from("ownership")
      .select("caravan_id, primary_customer:primary_customer_id(address_salutation)")
      .is("end_date", null)
      .then(({ data }) => {
        const map = {};
        (data || []).forEach((o) => {
          if (o.primary_customer?.address_salutation) map[o.caravan_id] = o.primary_customer.address_salutation;
        });
        setOwners(map);
      });
  }, []);

  const visible = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return caravans;
    return caravans.filter((c) =>
      [c.key_number, c.make, c.model, c.serial_number].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [caravans, search]);

  return (
    <div style={{ padding: "24px", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: 0 }}>Caravans</h1>
        <button onClick={() => navigate("/caravans/new")} style={buttonStyle.primary}>+ Add caravan</button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by key number, make, model, or serial…"
        style={{ ...fieldStyle, marginBottom: "16px" }}
      />

      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {visible.map((c) => {
        const pitchId = pitchIds[c.id];
        const rowStyle = { ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" };
        const content = (
          <>
            <div>
              <div style={{ fontWeight: 600 }}>
                {c.make} {c.model}
                {c.for_sale && (
                  <span style={{ marginLeft: "8px", fontSize: "11px", fontWeight: 600, color: colors.brand, background: "#FBF1DA", padding: "2px 8px", borderRadius: "999px" }}>
                    For sale
                  </span>
                )}
              </div>
              <div style={{ fontSize: "12px", color: colors.inkSoft }}>
                {[c.colour, c.type?.name, c.status?.name].filter(Boolean).join(" · ")}
              </div>
              <div style={{ fontSize: "12px", color: colors.inkSoft }}>
                {locations[c.id] || "Off-park"}
                {owners[c.id] && <> · {owners[c.id]}</>}
              </div>
            </div>
            {c.key_number && (
              <div style={{ fontFamily: fonts.mono, fontSize: "13px", color: colors.brandDark, background: colors.bg, padding: "4px 10px", borderRadius: "8px" }}>
                {c.key_number}
              </div>
            )}
          </>
        );
        return pitchId ? (
          <Link key={c.id} to={`/units/${pitchId}?tab=caravan`} state={{ originPath: "/caravans", originLabel: "Caravans" }} style={rowStyle}>
            {content}
          </Link>
        ) : (
          <div key={c.id} style={rowStyle}>
            {content}
          </div>
        );
      })}
      {visible.length === 0 && <p style={{ color: colors.inkSoft }}>No caravans match.</p>}
    </div>
  );
}
