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

export default function Customers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    supabase
      .from("customer")
      .select("id, customer1_first_name, customer1_surname, customer1_phone, customer1_email, customer2_first_name, customer2_surname")
      .order("customer1_surname")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setCustomers(data || []);
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

      {visible.map((c) => (
        <Link
          key={c.id}
          to={`/customers/${c.id}`}
          style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "block", textDecoration: "none", color: "inherit" }}
        >
          <div style={{ fontWeight: 600 }}>
            {c.customer1_first_name} {c.customer1_surname}
            {c.customer2_first_name && ` & ${c.customer2_first_name} ${c.customer2_surname}`}
          </div>
          <div style={{ fontSize: "12px", color: colors.inkSoft }}>{[c.customer1_phone, c.customer1_email].filter(Boolean).join(" · ")}</div>
        </Link>
      ))}
      {visible.length === 0 && <p style={{ color: colors.inkSoft }}>No customers match.</p>}
    </div>
  );
}
