import { useEffect, useRef, useState } from "react";
import { renderAsync } from "docx-preview";
import { useAuth } from "../lib/AuthContext.jsx";
import { supabase } from "../lib/supabaseClient.js";
import { colors, fonts, cardStyle, buttonStyle } from "../lib/theme.js";

const BUCKET = "customer-documents";
const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.lineStrong}`,
  fontFamily: fonts.body,
  marginBottom: "10px",
};
const subLabelStyle = { fontSize: "11px", fontWeight: 600, color: colors.inkSoft, textTransform: "uppercase", letterSpacing: "0.03em", margin: "14px 0 8px" };
const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "24px" };

function sanitizeFileName(name) {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

function detectKind(mimeType, fileName) {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  if (mimeType === "application/pdf" || ext === "pdf") return "pdf";
  if ((mimeType && mimeType.startsWith("image/")) || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
  if (mimeType === DOCX_MIME || ext === "docx") return "docx";
  return "other";
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

// The document register for one customer -- import an existing file
// (scan, PDF, photo, letter), and view or search everything that's
// been filed for them. Files live in Supabase Storage (not a local/
// shared drive -- Andy, 11 Aug 2026: "nothing else needs to access the
// documents", so there's no reason to fight browser folder-permission
// and drive-letter quirks for files only this app ever needs to open).
// Generating a document from a letter template used to live here too
// (Andy, 12 Aug 2026: removed for now, "it's not going to work how I
// want it to" -- letter templates themselves are untouched under
// Admin > Letter Templates for whenever that's redesigned).
export default function DocumentsPanel({ customer, label }) {
  const { profile } = useAuth();

  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState(null);

  const [importDescription, setImportDescription] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);

  const [viewingDoc, setViewingDoc] = useState(null);
  const [viewerKind, setViewerKind] = useState(null);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState(null);
  const docxContainerRef = useRef(null);

  function refreshDocuments() {
    if (!customer?.id) return;
    supabase
      .from("document_register")
      .select("id, description, file_name, mime_type, storage_path, source, created_at, created_by:created_by_profile_id(display_name)")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else setDocuments(data || []);
      });
  }

  useEffect(refreshDocuments, [customer?.id]);

  async function uploadAndRegister({ description, fileName, blobOrFile, mimeType, source }) {
    const storagePath = `${profile.business_id}/${customer.id}/${Date.now()}-${fileName}`;
    const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(storagePath, blobOrFile, { contentType: mimeType || undefined });
    if (uploadErr) throw uploadErr;

    const { error: insertErr } = await supabase.from("document_register").insert({
      business_id: profile.business_id,
      customer_id: customer.id,
      description,
      file_name: fileName,
      mime_type: mimeType || null,
      storage_path: storagePath,
      source,
      created_by_profile_id: profile.id,
    });
    if (insertErr) throw insertErr;
  }

  async function handleImport(e) {
    e.preventDefault();
    if (!importDescription.trim() || !importFile) return;

    setImporting(true);
    setError(null);
    try {
      const fileName = sanitizeFileName(importFile.name);
      await uploadAndRegister({ description: importDescription.trim(), fileName, blobOrFile: importFile, mimeType: importFile.type, source: "imported" });
      setImportDescription("");
      setImportFile(null);
      refreshDocuments();
    } catch (err) {
      setError(err.message || String(err));
    }
    setImporting(false);
  }

  async function handleDownload(doc) {
    setError(null);
    const { data: blob, error: err } = await supabase.storage.from(BUCKET).download(doc.storage_path);
    if (err) {
      setError(err.message);
      return;
    }
    downloadBlob(blob, doc.file_name);
  }

  async function handleView(doc) {
    setViewingDoc(doc);
    setViewerKind(detectKind(doc.mime_type, doc.file_name));
    setViewerUrl(null);
    setViewerError(null);
    setViewerLoading(true);

    const { data: blob, error: err } = await supabase.storage.from(BUCKET).download(doc.storage_path);
    setViewerLoading(false);
    if (err) {
      setViewerError(err.message);
      return;
    }

    const kind = detectKind(doc.mime_type, doc.file_name);
    if (kind === "pdf" || kind === "image") {
      setViewerUrl(URL.createObjectURL(blob));
    } else if (kind === "docx") {
      // Rendered into docxContainerRef by the effect below, once the
      // modal (and so the container element) actually exists.
      setViewerUrl(blob);
    }
  }

  useEffect(() => {
    if (viewerKind !== "docx" || !viewerUrl || !docxContainerRef.current) return;
    docxContainerRef.current.innerHTML = "";
    renderAsync(viewerUrl, docxContainerRef.current).catch((err) => setViewerError(err.message || String(err)));
  }, [viewerKind, viewerUrl]);

  function closeViewer() {
    if (viewerKind === "pdf" || viewerKind === "image") URL.revokeObjectURL(viewerUrl);
    setViewingDoc(null);
    setViewerKind(null);
    setViewerUrl(null);
    setViewerError(null);
  }

  const filteredDocuments = documents.filter((d) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${d.description} ${d.file_name}`.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={subLabelStyle}>{label || "Documents"}</div>

      <form onSubmit={handleImport}>
        <div style={{ ...subLabelStyle, margin: "14px 0 8px" }}>Import existing document</div>
        <input
          value={importDescription}
          onChange={(e) => setImportDescription(e.target.value)}
          placeholder="Brief description, e.g. scanned licence agreement"
          style={fieldStyle}
        />
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <input type="file" onChange={(e) => setImportFile(e.target.files?.[0] || null)} style={{ flex: 1 }} />
          <button type="submit" disabled={!importDescription.trim() || !importFile || importing} style={buttonStyle.primary}>
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
        <p style={{ fontSize: "12px", color: colors.inkSoft, marginTop: "-6px" }}>Accepts Word docs, PDFs, and photos (JPEG/PNG). The original file on your PC isn't touched.</p>
      </form>

      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      <div style={subLabelStyle}>On file</div>
      {documents.length > 3 && (
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this customer's documents…" style={fieldStyle} />
      )}
      {filteredDocuments.map((d) => (
        <div key={d.id} style={{ ...cardStyle, padding: "10px 14px", marginBottom: "6px" }}>
          <div style={{ fontSize: "13.5px", color: colors.ink }}>{d.description}</div>
          <div style={{ fontSize: "11.5px", color: colors.inkSoft, margin: "2px 0 6px" }}>
            {d.file_name} · {d.source === "imported" ? "Imported" : "Letter"} · {d.created_by?.display_name || "Unknown"} · {new Date(d.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="button" onClick={() => handleView(d)} style={{ ...buttonStyle.secondary, padding: "3px 10px", fontSize: "12.5px" }}>View</button>
            <button type="button" onClick={() => handleDownload(d)} style={{ ...buttonStyle.secondary, padding: "3px 10px", fontSize: "12.5px" }}>Download</button>
          </div>
        </div>
      ))}
      {documents.length === 0 && <p style={{ color: colors.inkSoft, fontSize: "13px" }}>No documents on file yet.</p>}
      {documents.length > 0 && filteredDocuments.length === 0 && <p style={{ color: colors.inkSoft, fontSize: "13px" }}>No documents match "{search}".</p>}

      {viewingDoc && (
        <div style={overlayStyle} onClick={closeViewer}>
          <div style={{ ...cardStyle, padding: "16px 20px", maxWidth: "800px", width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <div style={{ fontFamily: fonts.display, fontWeight: 600 }}>{viewingDoc.description}</div>
              <button type="button" onClick={closeViewer} style={buttonStyle.secondary}>Close</button>
            </div>

            <div style={{ overflow: "auto", flex: 1, background: colors.bg, borderRadius: "8px", padding: viewerKind === "docx" ? "16px" : 0 }}>
              {viewerLoading && <p style={{ padding: "16px", color: colors.inkSoft }}>Loading…</p>}
              {viewerError && <p style={{ padding: "16px", color: colors.immediate }}>{viewerError}</p>}
              {!viewerLoading && !viewerError && viewerKind === "pdf" && (
                <iframe title={viewingDoc.file_name} src={viewerUrl} style={{ width: "100%", height: "70vh", border: "none" }} />
              )}
              {!viewerLoading && !viewerError && viewerKind === "image" && (
                <img src={viewerUrl} alt={viewingDoc.file_name} style={{ maxWidth: "100%", display: "block", margin: "0 auto" }} />
              )}
              {!viewerLoading && !viewerError && viewerKind === "docx" && <div ref={docxContainerRef} />}
              {!viewerLoading && !viewerError && viewerKind === "other" && (
                <div style={{ padding: "16px" }}>
                  <p style={{ color: colors.inkSoft, fontSize: "13px" }}>No preview available for this file type.</p>
                  <button type="button" onClick={() => handleDownload(viewingDoc)} style={buttonStyle.primary}>Download</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
