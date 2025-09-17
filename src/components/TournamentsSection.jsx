import React, { useEffect, useState } from "react";
import { listTournaments } from "../api/tournaments";
import TournamentRow from "./TournamentRow";

const cardStyle = { background: "var(--panel)", border: "1px solid var(--ring)", borderRadius: 14, padding: 16 };

export default function TournamentsSection({
  title,
  status,                  // "pending" | "active" | "past"
  ExpandComponent,         // PendingExpand | ActiveExpand | PastExpand | null
  pageSize = 5,
  onPromoteToActive,       // callback when a pending item becomes active
  autoLoad = false,
}) {
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page:1, pages:1, has_prev:false, has_next:false, total:0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load(p = 1) {
    setLoading(true);
    try {
      const data = await listTournaments({ status, page: p, limit: pageSize });
      setItems(data.tournaments || []);
      setMeta(data.meta || { page: p, pages: 1 });
      setPage(p);
    } catch (e) {
      alert(`Failed to load ${status}: ` + e.message);
      setItems([]);
      setMeta({ page: 1, pages: 1, has_prev: false, has_next: false, total: 0 });
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ if (autoLoad) load(1); /* opt-in */ },[autoLoad]);

  function onBecameActive() {
    onPromoteToActive?.(); // let parent decide to refresh other pages/sections
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
            <TournamentRow
              key={t.id}
              t={t}
              ExpandComponent={ExpandComponent}
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
