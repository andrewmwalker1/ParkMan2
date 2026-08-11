import { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { colors, fonts, cardStyle } from "../../lib/theme.js";

// Every permission actually enforced somewhere in the app (client-side
// gating and/or RLS) gets a row here -- see can_edit_invoices
// (InvoiceDetail.jsx) and can_edit_units (UnitDetail.jsx's Edit button,
// gating the Pitch/Customer/Caravan screen).
const PERMISSIONS = [
  { key: "can_edit_invoices", label: "Edit invoices", hint: "Change an issued or void invoice. Draft invoices are always editable by anyone." },
  { key: "can_edit_units", label: "Edit pitch, customer & caravan records", hint: "Shows the Edit button on the Pitch/Customer/Caravan screen. Without it, the screen is view-only." },
];

export default function RolesTab() {
  const { profile } = useAuth();
  const [roles, setRoles] = useState([]);
  const [granted, setGranted] = useState({}); // role_id -> Set(permission_key)
  const [error, setError] = useState(null);
  const [busyKey, setBusyKey] = useState(null); // `${roleId}:${permissionKey}` while saving

  function refresh() {
    if (!profile) return;
    supabase.from("role").select("id, name").eq("business_id", profile.business_id).order("name").then(({ data, error: err }) => {
      if (err) setError(err.message);
      else setRoles(data || []);
    });
    supabase.from("role_permission").select("role_id, permission_key").then(({ data, error: err }) => {
      if (err) {
        setError(err.message);
        return;
      }
      const map = {};
      (data || []).forEach((row) => {
        if (!map[row.role_id]) map[row.role_id] = new Set();
        map[row.role_id].add(row.permission_key);
      });
      setGranted(map);
    });
  }

  useEffect(refresh, [profile]);

  async function toggle(roleId, key, checked) {
    setError(null);
    setBusyKey(`${roleId}:${key}`);
    const { error: err } = checked
      ? await supabase.from("role_permission").insert({ role_id: roleId, permission_key: key })
      : await supabase.from("role_permission").delete().eq("role_id", roleId).eq("permission_key", key);
    setBusyKey(null);
    if (err) setError(err.message);
    else refresh();
  }

  return (
    <div>
      <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark }}>User rights</h2>
      <p style={{ fontSize: "13px", color: colors.inkSoft, marginBottom: "16px" }}>
        Turn permissions on or off per role. Assign a role to each person on the Users tab.
      </p>
      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {roles.map((role) => (
        <div key={role.id} style={{ ...cardStyle, padding: "16px", marginBottom: "12px" }}>
          <div style={{ fontWeight: 600, marginBottom: "10px" }}>{role.name}</div>
          {PERMISSIONS.map((p) => {
            const checked = granted[role.id]?.has(p.key) || false;
            return (
              <label key={p.key} style={{ display: "flex", alignItems: "flex-start", gap: "8px", fontSize: "13px", marginBottom: "10px" }}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busyKey === `${role.id}:${p.key}`}
                  onChange={(e) => toggle(role.id, p.key, e.target.checked)}
                  style={{ marginTop: "2px" }}
                />
                <span>
                  <span style={{ color: colors.ink }}>{p.label}</span>
                  <br />
                  <span style={{ color: colors.inkSoft, fontSize: "12px" }}>{p.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      ))}
      {roles.length === 0 && <p style={{ color: colors.inkSoft }}>No roles yet.</p>}
    </div>
  );
}
