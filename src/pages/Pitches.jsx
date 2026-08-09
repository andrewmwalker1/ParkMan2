import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient.js";
import { suggestSortKey } from "../lib/sortKey.js";
import { colors, fonts, cardStyle, buttonStyle } from "../lib/theme.js";

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  borderRadius: "8px",
  border: `1px solid ${colors.lineStrong}`,
  fontFamily: fonts.body,
  marginBottom: "10px",
};

const labelStyle = { display: "block", fontSize: "12px", color: colors.inkSoft, marginBottom: "4px" };

function blankForm(defaults) {
  return {
    id: null,
    area_id: defaults.area_id || "",
    pitch_band_id: "",
    type_id: defaults.type_id || "",
    status_id: defaults.status_id || "",
    number: defaults.areaCode ? `${defaults.areaCode}-` : "",
    sort_key: "",
    capacity: "1",
    length: "",
    width: "",
    sortKeyTouched: false,
  };
}

export default function Pitches() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pitches, setPitches] = useState([]);
  const [areas, setAreas] = useState([]);
  const [bands, setBands] = useState([]);
  const [types, setTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [areaFilter, setAreaFilter] = useState("");

  function refresh() {
    Promise.all([
      supabase.from("pitch").select("id, number, sort_key, capacity, length, width, area_id, pitch_band_id, type_id, status_id, area:area_id(name, code), band:pitch_band_id(code), type:type_id(name), status:status_id(name)"),
      supabase.from("area").select("id, name, code").order("name"),
      supabase.from("pitch_band").select("id, code, area_id").order("code"),
      supabase.from("pitch_type").select("id, name").order("name"),
      supabase.from("pitch_status").select("id, name").order("name"),
    ]).then(([{ data: p, error: err }, { data: a }, { data: b }, { data: t }, { data: s }]) => {
      if (err) setError(err.message);
      else setPitches(p || []);
      setAreas(a || []);
      setBands(b || []);
      setTypes(t || []);
      setStatuses(s || []);
    });
  }

  useEffect(refresh, []);

  // Global search (src/components/GlobalSearch.jsx) links straight to a
  // pitch via ?open=<id> -- there's no dedicated /pitches/:id route since
  // editing is an inline modal here, so this is how a search result opens
  // the right one instead of just landing on the unfiltered list.
  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId || pitches.length === 0) return;
    const match = pitches.find((p) => p.id === openId);
    if (match) openEdit(match);
    setSearchParams({}, { replace: true });
  }, [pitches, searchParams]);

  const visiblePitches = useMemo(() => {
    const needle = search.toLowerCase();
    return pitches
      .filter((p) => !areaFilter || p.area_id === areaFilter)
      .filter((p) => !needle || p.number.toLowerCase().includes(needle))
      .sort((a, b) => {
        const areaCmp = (a.area?.code || "").localeCompare(b.area?.code || "");
        if (areaCmp !== 0) return areaCmp;
        return (a.sort_key || a.number).localeCompare(b.sort_key || b.number);
      });
  }, [pitches, search, areaFilter]);

  const bandsForArea = form ? bands.filter((b) => b.area_id === form.area_id) : [];

  function openCreate() {
    setError(null);
    setForm(blankForm({ area_id: areas[0]?.id, areaCode: areas[0]?.code, type_id: types[0]?.id, status_id: statuses[0]?.id }));
  }

  // Number now stores the area prefix directly (Andy, 9 Aug 2026: "B5"
  // should be stored as "PN-B5"), so switching Area mid-edit swaps the
  // prefix in place rather than leaving a stale one behind.
  function handleAreaChange(newAreaId) {
    setForm((f) => {
      const oldCode = areas.find((a) => a.id === f.area_id)?.code;
      const newCode = areas.find((a) => a.id === newAreaId)?.code;
      let number = f.number;
      if (oldCode && number.toUpperCase().startsWith(`${oldCode}-`)) {
        number = `${newCode || ""}-${number.slice(oldCode.length + 1)}`;
      } else if (!number && newCode) {
        number = `${newCode}-`;
      }
      return {
        ...f,
        area_id: newAreaId,
        pitch_band_id: "",
        number,
        sort_key: f.sortKeyTouched ? f.sort_key : suggestSortKey(number),
      };
    });
  }

  function openEdit(p) {
    setError(null);
    setForm({
      id: p.id,
      area_id: p.area_id,
      pitch_band_id: p.pitch_band_id || "",
      type_id: p.type_id,
      status_id: p.status_id,
      number: p.number,
      sort_key: p.sort_key,
      capacity: String(p.capacity),
      length: p.length ?? "",
      width: p.width ?? "",
      sortKeyTouched: true,
    });
  }

  function handleNumberChange(value) {
    setForm((f) => ({
      ...f,
      number: value,
      sort_key: f.sortKeyTouched ? f.sort_key : suggestSortKey(value),
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    const payload = {
      area_id: form.area_id,
      pitch_band_id: form.pitch_band_id || null,
      type_id: form.type_id,
      status_id: form.status_id,
      number: form.number,
      sort_key: form.sort_key || suggestSortKey(form.number),
      capacity: Number(form.capacity) || 1,
      length: form.length === "" ? null : Number(form.length),
      width: form.width === "" ? null : Number(form.width),
    };
    const { error: err } = form.id
      ? await supabase.from("pitch").update(payload).eq("id", form.id)
      : await supabase.from("pitch").insert(payload);
    if (err) {
      setError(err.message);
      return;
    }
    setForm(null);
    refresh();
  }

  async function handleDelete(id) {
    const { error: err } = await supabase.from("pitch").delete().eq("id", id);
    if (err) setError(err.message);
    else refresh();
  }

  const readyToCreate = areas.length > 0 && types.length > 0 && statuses.length > 0;

  return (
    <div style={{ padding: "24px", maxWidth: "760px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h1 style={{ fontFamily: fonts.display, color: colors.brandDark, margin: 0 }}>Pitches</h1>
        <button onClick={openCreate} disabled={!readyToCreate} style={buttonStyle.primary}>+ Add pitch</button>
      </div>

      {!readyToCreate && (
        <p style={{ fontSize: "13px", color: colors.inkSoft }}>
          Add at least one Area, Pitch Type, and Pitch Status under <Link to="/admin" style={{ color: colors.brand }}>Admin</Link> before creating pitches.
        </p>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by pitch number…"
          style={{ ...fieldStyle, marginBottom: 0, flex: 1 }}
        />
        <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} style={{ ...fieldStyle, marginBottom: 0, width: "200px" }}>
          <option value="">All areas</option>
          {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}

      {visiblePitches.map((p) => (
        <div key={p.id} style={{ ...cardStyle, padding: "12px 16px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Link to={`/units/${p.id}`} style={{ fontWeight: 600, color: colors.ink, textDecoration: "none" }}>{p.number}</Link>
            <div style={{ fontSize: "12px", color: colors.inkSoft }}>
              {p.area?.name} · {p.type?.name} · {p.status?.name}
              {p.band && ` · ${p.area?.code}-${p.band.code}`}
              {p.capacity > 1 && ` · capacity ${p.capacity}`}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => openEdit(p)} style={buttonStyle.secondary}>Edit</button>
            <button onClick={() => handleDelete(p.id)} style={{ ...buttonStyle.secondary, color: colors.immediate }}>Delete</button>
          </div>
        </div>
      ))}
      {visiblePitches.length === 0 && readyToCreate && <p style={{ color: colors.inkSoft }}>No pitches match.</p>}

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(49, 56, 45, 0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 16px", overflowY: "auto", zIndex: 100 }}>
          <div style={{ ...cardStyle, padding: "20px", width: "100%", maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: fonts.display, fontSize: "16px", color: colors.brandDark, marginTop: 0 }}>
              {form.id ? "Edit pitch" : "New pitch"}
            </h2>
            <form onSubmit={handleSave}>
              <label style={labelStyle}>Area</label>
              <select required value={form.area_id} onChange={(e) => handleAreaChange(e.target.value)} style={fieldStyle}>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Number</label>
                  <input required value={form.number} onChange={(e) => handleNumberChange(e.target.value)} placeholder="e.g. OP-A16" style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Sort key</label>
                  <input
                    required
                    value={form.sort_key}
                    onChange={(e) => setForm({ ...form, sort_key: e.target.value, sortKeyTouched: true })}
                    style={fieldStyle}
                  />
                </div>
              </div>

              <label style={labelStyle}>Pitch band <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <select value={form.pitch_band_id} onChange={(e) => setForm({ ...form, pitch_band_id: e.target.value })} style={fieldStyle}>
                <option value="">No band set</option>
                {bandsForArea.map((b) => <option key={b.id} value={b.id}>{b.code}</option>)}
              </select>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select required value={form.type_id} onChange={(e) => setForm({ ...form, type_id: e.target.value })} style={fieldStyle}>
                    {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select required value={form.status_id} onChange={(e) => setForm({ ...form, status_id: e.target.value })} style={fieldStyle}>
                    {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Capacity</label>
                  <input required type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} style={fieldStyle} />
                </div>
                <div />
                <div>
                  <label style={labelStyle}>Length (ft, indicative)</label>
                  <input type="number" step="0.1" value={form.length} onChange={(e) => setForm({ ...form, length: e.target.value })} style={fieldStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Width (ft, indicative)</label>
                  <input type="number" step="0.1" value={form.width} onChange={(e) => setForm({ ...form, width: e.target.value })} style={fieldStyle} />
                </div>
              </div>

              {error && <p style={{ color: colors.immediate, fontSize: "13px" }}>{error}</p>}
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" style={buttonStyle.primary}>{form.id ? "Save changes" : "Create pitch"}</button>
                <button type="button" onClick={() => setForm(null)} style={buttonStyle.secondary}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
