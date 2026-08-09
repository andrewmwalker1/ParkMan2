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

export default function Caravans() {
  const navigate = useNavigate();
  const [caravans, setCaravans] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from("caravan")
      .select("id, make, model, colour, key_number, serial_number, type:type_id(name), status:status_id(name)")
      .order("make")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setCaravans(data || []);
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
      <Link to="/" style={{ color: colors.inkSoft, fontSize: "13px", textDecoration: "none" }}>← Back</Link>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 20px" }}>
        <h1 style={{ fontFamily: fonts.display, color: colors.mossDark, margin: 0 }}>Caravans</h1>
        <button onClick={() => navigate("/caravans/new")} style={buttonStyle.primary}>+ Add caravan</button>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by key number, make, model, or serial…"
        style={{ ...fieldStyle, marginBottom: "16px" }}
      />

      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {visible.map((c) => (
        <Link
          key={c.id}
          to={`/caravans/${c.id}`}
          style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}
        >
          <div>
            <div style={{ fontWeight: 600 }}>{c.make} {c.model}</div>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>
              {[c.colour, c.type?.name, c.status?.name].filter(Boolean).join(" · ")}
            </div>
          </div>
          {c.key_number && (
            <div style={{ fontFamily: fonts.mono, fontSize: "13px", color: colors.mossDark, background: colors.bg, padding: "4px 10px", borderRadius: "8px" }}>
              {c.key_number}
            </div>
          )}
        </Link>
      ))}
      {visible.length === 0 && <p style={{ color: colors.inkSoft }}>No caravans match.</p>}
    </div>
  );
}
