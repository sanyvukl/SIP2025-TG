import React, { useEffect, useState } from "react";
import { listTournaments } from "../api/tournaments";
import PendingExpand from "./PendingExpand";

const cardStyle = { background: "var(--panel)", border: "1px solid var(--ring)", borderRadius: 14, padding: 16 };
const kvStyle = { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#191d24", border:"1px solid var(--ring)", borderRadius:10, padding:10, marginBottom:8 };

function fmtFormat(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "double") return "Double Elimination";
  if (s === "single") return "Single Elimination";
  return raw || "—";
}
function fmtDate(dt) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return String(dt); }
}

function Row({ t, initiallyExpanded = false, onBecameActive, onParticipantsChange }) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return (
    <>
      <div className="kv" style={kvStyle}>
        <span className="v" style={{ fontWeight: 700 }}>{t.name || "-"}</span>
        <span className="k" style={{ marginLeft: 8 }}>{fmtFormat(t.format)}</span>
        <span className="k" data-field="participants">Participants: {Number(t.player_count) || 0}</span>
        <span className="k" data-field="time">Date: {fmtDate(t.start_time)}</span>
        <button className="btn" onClick={()=>setExpanded(v=>!v)}>{expanded ? "Collapse" : "Expand"}</button>
      </div>

      {expanded && (
        <PendingExpand
          tournament={t}
          onBecameActive={(tid)=>onBecameActive?.(tid)}
          onParticipantsChange={(tid, count)=>onParticipantsChange?.(tid, count)}
        />
      )}
    </>
  );
}

export default function PendingTournamentsSection({
  pageSize = 5,
  title = "Pending Tournaments",
  autoLoad = false,               // keep your previous UX where you click “Load”, unless you set this true
  onPromoteToActive,              // parent callback to refresh other pages if needed
}) {
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page:1, pages:1, has_prev:false, has_next:false, total:0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load(p = 1) {
    setLoading(true);
    try {
      const data = await listTournaments({ status: "pending", page: p, limit: pageSize });
      setItems(data.tournaments || []);
      setMeta(data.meta || { page: p, pages: 1 });
      setPage(p);
    } catch (e) {
      alert("Failed to load pending: " + e.message);
      setItems([]);
      setMeta({ page: 1, pages: 1, has_prev: false, has_next: false, total: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ if (autoLoad) load(1); }, [autoLoad]);

  function onBecameActive() {
    // Child told us a pending tournament just started.
    onPromoteToActive?.();
    // Also refresh our own list so it disappears from pending.
    load(page);
  }

  function onParticipantsChange(tid, newCount) {
    setItems(prev => prev.map(x => x.id === tid ? { ...x, player_count: newCount } : x));
  }

  return (
    <div className="card" style={{ ...cardStyle, marginBottom: 20 }}>
      <div className="card-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <button className="btn" onClick={()=>load(1)} disabled={loading}>
          {loading ? "Loading…" : (items.length ? "Reload" : "Load")}
        </button>
      </div>

      <div className="tournament-list">
        {!items.length && !loading ? (
          <div className="empty" style={{ fontSize:12, color:'var(--muted)', padding:'6px 0' }}>
            No tournaments to show.
          </div>
        ) : (
          items.map(t => (
            <Row
              key={t.id}
              t={t}
              onBecameActive={onBecameActive}
              onParticipantsChange={onParticipantsChange}
            />
          ))
        )}
      </div>

      <div className="pager" style={{ display:'flex', gap:8, alignItems:'center', marginTop:10, flexWrap:'wrap' }}>
        <button className="btn" disabled={!meta.has_prev || loading} onClick={()=>load(page-1)}>Prev</button>
        <span className="k" style={{ fontSize:12 }}>
          Page {meta.page || page} / {meta.pages || 1} &nbsp;·&nbsp; Total: {meta.total ?? 0}
        </span>
        <button className="btn" disabled={!meta.has_next || loading} onClick={()=>load(page+1)}>Next</button>
      </div>
    </div>
  );
}
