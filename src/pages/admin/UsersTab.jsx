import { useEffect, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { colors, fonts, cardStyle, buttonStyle } from "../../lib/theme.js";

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.lineStrong}`,
  fontFamily: fonts.body,
  marginBottom: "10px",
};

const blankInvite = { email: "", displayName: "" };

export default function UsersTab() {
  const { profile } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [invite, setInvite] = useState(blankInvite);
  const [inviteStatus, setInviteStatus] = useState("idle"); // idle | sending | sent | error
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [resendStatus, setResendStatus] = useState({}); // userId -> "sending" | "sent" | "error"

  function refresh() {
    supabase.rpc("list_business_users").then(({ data, error: err }) => {
      if (err) setError(err.message);
      else setUsers(data || []);
    });
  }

  useEffect(refresh, []);
  useEffect(() => {
    if (!profile) return;
    supabase.from("role").select("id, name").eq("business_id", profile.business_id).order("name").then(({ data }) => setRoles(data || []));
  }, [profile]);

  async function handleRoleChange(userId, roleId) {
    setError(null);
    const { error: err } = await supabase.from("profiles").update({ role_id: roleId || null }).eq("id", userId);
    if (err) setError(err.message);
    else refresh();
  }

  async function handleInvite(e) {
    e.preventDefault();
    setError(null);
    setInviteStatus("sending");
    const { error: err } = await supabase.functions.invoke("parkman2-manage-users", {
      body: { action: "invite", email: invite.email, displayName: invite.displayName },
    });
    if (err) {
      setInviteStatus("error");
      setError(err.message);
      return;
    }
    setInviteStatus("sent");
    setInvite(blankInvite);
    refresh();
  }

  async function handleResend(email, userId) {
    setResendStatus((s) => ({ ...s, [userId]: "sending" }));
    // Same self-serve request the sign-in page itself sends -- no admin
    // API needed, this just asks Supabase to email a fresh code/link.
    const { error: err } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setResendStatus((s) => ({ ...s, [userId]: err ? "error" : "sent" }));
    if (err) setError(err.message);
  }

  function startEdit(u) {
    setEditingId(u.id);
    setEditName(u.display_name);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    setError(null);
    const { error: err } = await supabase.from("profiles").update({ display_name: editName }).eq("id", editingId);
    if (err) {
      setError(err.message);
      return;
    }
    setEditingId(null);
    refresh();
  }

  async function setActive(userId, isActive) {
    setError(null);
    setBusyId(userId);
    const { error: err } = await supabase.functions.invoke("parkman2-manage-users", {
      body: { action: isActive ? "reactivate" : "deactivate", userId },
    });
    setBusyId(null);
    if (err) setError(err.message);
    else refresh();
  }

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark }}>Users</h2>
        {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
        {users.map((u) => (
          <div key={u.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px" }}>
            {editingId === u.id ? (
              <form onSubmit={handleSaveEdit}>
                <input required autoFocus value={editName} onChange={(e) => setEditName(e.target.value)} style={fieldStyle} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="submit" style={buttonStyle.primary}>Save</button>
                  <button type="button" onClick={() => setEditingId(null)} style={buttonStyle.secondary}>Cancel</button>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ fontWeight: 600 }}>
                  {u.display_name}
                  {u.is_active === false && (
                    <span style={{ marginLeft: "8px", fontSize: "11px", color: colors.immediate, fontWeight: 600 }}>DEACTIVATED</span>
                  )}
                </div>
                <div style={{ fontSize: "12px", color: colors.inkSoft, marginBottom: "10px" }}>{u.email}</div>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: colors.inkSoft, marginBottom: "10px" }}>
                  Role
                  <select value={u.role_id || ""} onChange={(e) => handleRoleChange(u.id, e.target.value)} style={{ padding: "4px 8px", borderRadius: "8px", border: `1px solid ${colors.lineStrong}`, fontFamily: fonts.body }}>
                    <option value="">No role</option>
                    {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => startEdit(u)} style={buttonStyle.secondary}>Edit</button>
                  {u.is_active === false ? (
                    <button disabled={busyId === u.id} onClick={() => setActive(u.id, true)} style={buttonStyle.secondary}>Reactivate</button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleResend(u.email, u.id)}
                        disabled={resendStatus[u.id] === "sending"}
                        style={buttonStyle.secondary}
                      >
                        {resendStatus[u.id] === "sending" ? "Sending…" : "Resend invite"}
                      </button>
                      <button disabled={busyId === u.id} onClick={() => setActive(u.id, false)} style={{ ...buttonStyle.secondary, color: colors.immediate }}>Deactivate</button>
                    </>
                  )}
                </div>
                {resendStatus[u.id] === "sent" && <p style={{ fontSize: "12px", color: colors.success, margin: "6px 0 0" }}>Sign-in email sent</p>}
                {resendStatus[u.id] === "error" && <p style={{ fontSize: "12px", color: colors.immediate, margin: "6px 0 0" }}>Failed to send — see message above</p>}
              </div>
            )}
          </div>
        ))}
        {users.length === 0 && <p style={{ color: colors.inkSoft }}>No users yet.</p>}
      </div>

      <div>
        <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark }}>Invite a user</h2>
        <p style={{ fontSize: "13px", color: colors.inkSoft }}>Only people invited here can sign in — there's no public sign-up.</p>
        <form onSubmit={handleInvite} style={{ ...cardStyle, padding: "16px" }}>
          <input required type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} placeholder="Work email" style={fieldStyle} />
          <input required value={invite.displayName} onChange={(e) => setInvite({ ...invite, displayName: e.target.value })} placeholder="Display name" style={fieldStyle} />

          {inviteStatus === "sent" && (
            <p style={{ color: colors.success, fontSize: "13px" }}>
              Account created — tell them to go to the sign-in page and enter their email to get a link and code.
            </p>
          )}
          {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

          <button type="submit" disabled={inviteStatus === "sending"} style={{ ...buttonStyle.primary, width: "100%", marginTop: "10px" }}>
            {inviteStatus === "sending" ? "Creating…" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
