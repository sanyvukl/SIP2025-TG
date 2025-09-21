import React, { useEffect, useRef, useState } from "react";
import { listTournaments } from "../api/tournaments";
import TournamentRow from "./TournamentRow";
import ActiveExpand from "./ActiveExpand";

const card = { background: "var(--panel)", border: "1px solid var(--ring)", borderRadius: 14, padding: 16 };
const header = { display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, marginBottom: 12 };
const tools = { display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' };

/**
 * Dedicated section optimized for live/active tournaments:
 * - max width 1200 and centered
 * - one-click reload
 * - optional auto-refresh (off by default)
 * - fixed page size tuned for active lists
 */
export default function ActiveTournamentsSection({
  title = "Active Tournaments",
  pageSize = 5,
  autoLoad = true
}) {
  const status = "active";
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page:1, pages:1, has_prev:false, has_next:false, total:0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const timerRef = useRef(null);

  async function load(p = 1) {
    setLoading(true);
    try {
      const data = await listTournaments({ status, page: p, limit: pageSize });
      setItems(data.tournaments || []);
      setMeta(data.meta || { page: p, pages: 1, has_prev:false, has_next:false, total:0 });
      setPage(p);
    } catch (e) {
      alert(`Failed to load active tournaments: ` + e.message);
      setItems([]);
      setMeta({ page: 1, pages: 1, has_prev:false, has_next:false, total:0 });
    } finally {
      setLoading(false);
    }
  }

  // initial load (opt-in)
  useEffect(()=>{ if (autoLoad) load(1); }, [autoLoad, pageSize]);

  // auto-refresh management
  useEffect(() => {
    if (!autoRefresh) { clearTimer(); return; }
    tick(); // immediate
    timerRef.current = setInterval(tick, 15000);
    return clearTimer;
  }, [autoRefresh, page]);

  function clearTimer(){
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }
  function tick(){ load(page); }

  function handleFinished(tournamentId) {
    // Optimistic removal from the "active" list
    setItems(prev => prev.filter(t => t.id !== tournamentId));
    // (Optional) also refresh the current page from the server:
    // load(page);
  }

  // plumb through row-level callbacks that might affect counts
  function onParticipantsChange(tid, newCount) {
    setItems(prev => prev.map(x => x.id === tid ? ({ ...x, player_count: newCount }) : x));
  }

  return (
    <div style={{ maxWidth: 1200, margin:'0 auto 20px' }}>
      <div className="card" style={card}>
        <div className="card-header" style={header}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div style={tools}>
            <label style={{ display:'inline-flex', gap:8, alignItems:'center', fontSize:12, color:'var(--muted)'}}>
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={e=>setAutoRefresh(e.target.checked)}
              />
              Auto-refresh (15s)
            </label>
            <button className="btn" onClick={()=>load(page)} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="tournament-list">
          {!items.length && !loading ? (
            <div className="empty" style={{ fontSize:12, color:'var(--muted)', padding:'6px 0' }}>
              No active tournaments.
            </div>
          ) : (
            items.map(t => (
              <TournamentRow
                key={t.id}
                t={t}
                ExpandComponent={ActiveExpand}
                onParticipantsChange={onParticipantsChange}
                onFinished={handleFinished}
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
    </div>
  );
}
