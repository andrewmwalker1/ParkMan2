import { useState } from "react";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { buildLetterMergeData, buildLetterFolderName, mergeDocxTemplate } from "../lib/letterMerge.js";
import {
  isFileSystemAccessSupported,
  getStoredRootHandle,
  chooseDocumentsFolder,
  ensureReadWritePermission,
  getOrCreateSubfolder,
  saveFile,
  sanitizeName,
} from "../lib/documentsFolder.js";
import { colors, fonts, cardStyle, buttonStyle } from "../lib/theme.js";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "16px",
};

// "Start letter" -- picks a letterhead template, merges in this
// customer's (and, where known, pitch/caravan's) details, and either
// saves the finished .docx straight into a shared-drive folder (Chrome/
// Edge, once the user has connected one) or falls back to a normal
// browser download.
export default function StartLetterButton({ customer, pitch, caravan }) {
  const { profile } = useAuth();
  const supported = isFileSystemAccessSupported();

  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [folderHandle, setFolderHandle] = useState(null);
  const [folderConnected, setFolderConnected] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | generating | done | error
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  async function openModal() {
    setOpen(true);
    setStatus("idle");
    setMessage(null);
    setError(null);

    supabase
      .from("letter_template")
      .select("id, name, storage_path")
      .eq("business_id", profile.business_id)
      .order("name")
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setTemplates(data || []);
      });

    if (supported) {
      const handle = await getStoredRootHandle();
      if (handle) {
        setFolderHandle(handle);
        setFolderConnected((await handle.queryPermission({ mode: "readwrite" })) === "granted");
      }
    }
  }

  async function handleConnectFolder() {
    setError(null);
    try {
      const handle = folderHandle || (await chooseDocumentsFolder());
      const granted = await ensureReadWritePermission(handle);
      setFolderHandle(handle);
      setFolderConnected(granted);
      if (!granted) setError("Permission to the folder wasn't granted.");
    } catch (err) {
      if (err.name !== "AbortError") setError(err.message || String(err));
    }
  }

  async function handleGenerate(template) {
    setStatus("generating");
    setMessage(null);
    setError(null);
    try {
      const { data: blob, error: dlErr } = await supabase.storage.from("letter-templates").download(template.storage_path);
      if (dlErr) throw dlErr;
      const arrayBuffer = await blob.arrayBuffer();

      const { data: business } = await supabase.from("business").select("name").eq("id", profile.business_id).single();

      const data = buildLetterMergeData({ customer, pitch, caravan, business });
      const merged = mergeDocxTemplate(arrayBuffer, data);
      const fileName = `${sanitizeName(template.name)} - ${new Date().toISOString().slice(0, 10)}.docx`;

      if (supported && folderConnected && folderHandle) {
        const folderName = buildLetterFolderName(customer, pitch?.number);
        const subDir = await getOrCreateSubfolder(folderHandle, folderName);
        await saveFile(subDir, fileName, merged);
        setMessage(`Saved to "${folderName}/${fileName}".`);
      } else {
        const url = URL.createObjectURL(merged);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        setMessage(`Downloaded "${fileName}".`);
      }
      setStatus("done");
    } catch (err) {
      setStatus("error");
      setError(err.message || err.properties?.errors?.map((e) => e.message).join("; ") || String(err));
    }
  }

  return (
    <>
      <button type="button" onClick={openModal} style={buttonStyle.secondary}>✎ Start letter</button>

      {open && (
        <div style={overlayStyle} onClick={() => setOpen(false)}>
          <div style={{ ...cardStyle, padding: "20px 24px", maxWidth: "420px", width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontFamily: fonts.display, fontWeight: 600, marginBottom: "12px" }}>Start a letter</div>

            {supported ? (
              <div style={{ marginBottom: "14px" }}>
                {folderConnected ? (
                  <span style={{ fontSize: "13px", color: colors.success }}>✓ Documents folder connected</span>
                ) : (
                  <button type="button" onClick={handleConnectFolder} style={buttonStyle.secondary}>Connect documents folder</button>
                )}
              </div>
            ) : (
              <p style={{ fontSize: "12.5px", color: colors.inkSoft, marginBottom: "14px" }}>
                This browser can't save straight into a folder — letters will download instead. Use Chrome or Edge on a desktop PC to file them automatically.
              </p>
            )}

            {templates === null && <p style={{ color: colors.inkSoft, fontSize: "13px" }}>Loading templates…</p>}
            {templates?.length === 0 && (
              <p style={{ color: colors.inkSoft, fontSize: "13px" }}>No letter templates yet — add one under Admin &gt; Letter Templates.</p>
            )}
            {templates?.map((t) => (
              <button
                key={t.id}
                type="button"
                disabled={status === "generating"}
                onClick={() => handleGenerate(t)}
                style={{ ...buttonStyle.secondary, display: "block", width: "100%", textAlign: "left", marginBottom: "6px" }}
              >
                {t.name}
              </button>
            ))}

            {status === "generating" && <p style={{ fontSize: "13px", color: colors.inkSoft }}>Generating…</p>}
            {message && <p style={{ fontSize: "13px", color: colors.success }}>{message}</p>}
            {error && <p style={{ fontSize: "13px", color: colors.immediate }}>{error}</p>}

            <button type="button" onClick={() => setOpen(false)} style={{ ...buttonStyle.secondary, marginTop: "8px" }}>Close</button>
          </div>
        </div>
      )}
    </>
  );
}
