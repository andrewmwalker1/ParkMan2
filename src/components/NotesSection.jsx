import { useEffect, useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { colors, fonts, buttonStyle } from "../lib/theme.js";

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.lineStrong}`,
  fontFamily: fonts.body,
};
const sectionLabelStyle = { fontSize: "11px", fontWeight: 600, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", margin: "6px 0 8px" };

// Append-only notes log, same shape on Customer/Caravan/Pitch --
// customer_note and pitch_note already existed (see PROJECT-BRIEF.md);
// caravan_note was the missing one (migration 16). `table` + `idColumn`
// let one component serve all three.
export default function NotesSection({ table, idColumn, id }) {
  const { profile } = useAuth();
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [error, setError] = useState(null);

  function refresh() {
    if (!id) return;
    supabase
      .from(table)
      .select(`id, text, created_at, actor:actor_profile_id(display_name)`)
      .eq(idColumn, id)
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setNotes(data || []);
      });
  }

  useEffect(refresh, [table, idColumn, id]);

  async function handleAdd() {
    if (!newNote.trim()) return;
    const { error: err } = await supabase.from(table).insert({
      [idColumn]: id,
      text: newNote.trim(),
      actor_profile_id: profile.id,
    });
    if (err) {
      setError(err.message);
      return;
    }
    setNewNote("");
    refresh();
  }

  return (
    <div style={{ marginTop: "16px" }}>
      <div style={sectionLabelStyle}>Notes</div>
      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
      <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
        <input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add a note…" style={{ ...fieldStyle, flex: 1 }} />
        <button type="button" onClick={handleAdd} style={buttonStyle.secondary}>Add</button>
      </div>
      {notes.map((n) => (
        <div key={n.id} style={{ padding: "8px 0", borderBottom: `1px solid ${colors.line}` }}>
          <div style={{ fontSize: "12px", color: colors.inkSoft }}>
            <strong style={{ color: colors.ink, fontWeight: 500 }}>{n.actor?.display_name}</strong> · {new Date(n.created_at).toLocaleString()}
          </div>
          <div style={{ fontSize: "13px", color: colors.ink }}>{n.text}</div>
        </div>
      ))}
      {notes.length === 0 && <p style={{ color: colors.inkSoft, fontSize: "13px" }}>No notes yet.</p>}
    </div>
  );
}
