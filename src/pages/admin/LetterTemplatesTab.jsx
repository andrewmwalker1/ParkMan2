import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import { supabase } from "../../lib/supabaseClient.js";
import { MERGE_TAGS } from "../../lib/letterMerge.js";
import { colors, fonts, cardStyle, buttonStyle } from "../../lib/theme.js";

const BUCKET = "letter-templates";

export default function LetterTemplatesTab() {
  const { profile } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | error
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  function refresh() {
    if (!profile) return;
    supabase
      .from("letter_template")
      .select("id, name, storage_path, created_at")
      .eq("business_id", profile.business_id)
      .order("name")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setTemplates(data || []);
      });
  }

  useEffect(refresh, [profile]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setStatus("uploading");
    setError(null);

    const storagePath = `${profile.business_id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_ ]/g, "")}`;
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, file);
    if (uploadErr) {
      setStatus("error");
      setError(uploadErr.message);
      return;
    }

    const { error: insertErr } = await supabase
      .from("letter_template")
      .insert({ business_id: profile.business_id, name: name.trim() || file.name, storage_path: storagePath });
    if (insertErr) {
      setStatus("error");
      setError(insertErr.message);
      return;
    }

    setName("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStatus("idle");
    refresh();
  }

  async function handleDelete(template) {
    const { error: removeErr } = await supabase.storage.from(BUCKET).remove([template.storage_path]);
    if (removeErr) {
      setError(removeErr.message);
      return;
    }
    const { error: deleteErr } = await supabase.from("letter_template").delete().eq("id", template.id);
    if (deleteErr) {
      setError(deleteErr.message);
      return;
    }
    refresh();
  }

  return (
    <div>
      <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, marginTop: 0 }}>Letter templates</h2>
      <p style={{ fontSize: "13px", color: colors.inkSoft }}>
        Upload a .docx with your letterhead in the header and plain placeholder tags in the body, e.g. "Dear {"{correspondence_salutation}"},". The "Start letter" button on a Customer screen fills these in and saves a finished copy.
      </p>

      <form onSubmit={handleUpload} style={{ ...cardStyle, padding: "16px 20px", marginBottom: "20px", maxWidth: "480px" }}>
        <label style={{ display: "block", fontSize: "12px", color: colors.inkSoft, marginBottom: "4px" }}>Template name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. General letter"
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", borderRadius: "8px", border: `1px solid ${colors.lineStrong}`, fontFamily: fonts.body, marginBottom: "10px" }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          style={{ marginBottom: "10px", display: "block" }}
        />
        {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
        <button type="submit" disabled={!file || status === "uploading"} style={buttonStyle.primary}>
          {status === "uploading" ? "Uploading…" : "Upload template"}
        </button>
      </form>

      {templates.map((t) => (
        <div key={t.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: "480px" }}>
          <span style={{ fontSize: "13.5px" }}>{t.name}</span>
          <button type="button" onClick={() => handleDelete(t)} style={{ ...buttonStyle.secondary, color: colors.immediate, padding: "6px 14px" }}>Delete</button>
        </div>
      ))}
      {templates.length === 0 && <p style={{ color: colors.inkSoft, fontSize: "13px" }}>No templates yet.</p>}

      <div style={{ ...cardStyle, padding: "16px 20px", marginTop: "20px", maxWidth: "480px" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: "10px" }}>Available tags</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
          {MERGE_TAGS.map((t) => (
            <div key={t.key} style={{ fontSize: "12.5px" }}>
              <code style={{ background: colors.bg, padding: "1px 4px", borderRadius: "4px" }}>{`{${t.key}}`}</code>
              <span style={{ color: colors.inkSoft }}> {t.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
