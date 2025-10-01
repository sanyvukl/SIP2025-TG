import React, { useEffect, useRef, useState } from "react";
import { listTournaments, deleteTournament } from "../api/tournaments";
import PendingExpand from "./PendingExpand";
import TournamentRow from "./TournamentRow";
import { EightBallBounceModal } from "./EightBallBounce";

const cardStyle = { background: "var(--panel)", border: "1px solid var(--ring)", borderRadius: 14, padding: 16 };


export default function PendingTournamentsSection({
  pageSize = 5,
  title = "Pending Tournaments",
  autoLoad = true,            // ✅ default to autoload like Active
  onPromoteToActive,
}) {
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page:1, pages:1, has_prev:false, has_next:false, total:0 });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Fetching tournaments…");

  // Optional auto-refresh (mirrors Active)
  const [autoRefresh, setAutoRefresh] = useState(false);
  const timerRef = useRef(null);

  async function load(p = 1) {
    setLoadingMessage("Fetching tournaments…");
    setLoading(true);
    try {
      const data = await listTournaments({ status: "pending", page: p, limit: pageSize });
      setItems(data.tournaments || []);
      setMeta(data.meta || { page: p, pages: 1, has_prev:false, has_next:false, total:0 });
      setPage(p);
    } catch (e) {
      console.log("Failed to load pending: " + e.message);
      setItems([]);
      setMeta({ page: 1, pages: 1, has_prev: false, has_next: false, total: 0 });
    } finally {
      setLoading(false);
    }
  }

  // Autoload on mount (and when pageSize changes, like Active)
  useEffect(() => { if (autoLoad) load(1); }, [autoLoad, pageSize]);

  // Auto-refresh management (same pattern as Active)
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

  function onBecameActive() {
    onPromoteToActive?.();
    load(page); // remove from pending list
  }

  function onParticipantsChange(tid, newCount) {
    setItems(prev => prev.map(x => x.id === tid ? { ...x, player_count: newCount } : x));
  }

  async function handleDelete(tid) {
    try {
      setLoadingMessage("Deleting...");
      setLoading(true);
      await deleteTournament(tid);
      setLoading(false);
      await load(page); // reload current page to reflect server truth (meta, pagination, etc.)
    } catch (e) {
      console.log("Failed to delete tournament: " + e.message);
    }
  }

  return (
    <div className="card" style={{ ...cardStyle, marginBottom: 20 }}>
      <>
        <div className="card-header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <button className="btn" onClick={()=>load(1)} disabled={loading}>
              {loading ? "Refreshing…" : (items.length ? "Refresh" : "Load")}
            </button>
          </div>
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
                onBecameActive={onBecameActive}
                onParticipantsChange={onParticipantsChange}
                ExpandComponent={PendingExpand}
                onDelete={handleDelete}
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
      </>
      <>
      <EightBallBounceModal
        open={loading}
        message={loadingMessage}
        size={64}
        speed={1000}
      />
      </>
    </div>
  );
}
