import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { listTournaments, deleteTournament } from "../api/tournaments";
import TournamentRow from "./TournamentRow";
import ActiveExpand from "./ActiveExpand";
import { EightBallBounceLoader } from "./EightBallBounce";

const card = {
  background: "var(--panel)",
  border: "1px solid var(--ring)",
  borderRadius: 14,
  padding: 16,
};

const header = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const tools = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

/**
 * Dedicated section optimized for live/active tournaments:
 * - fixed page size tuned for active lists
 */
export default function ActiveTournamentsSection({
  title = "Active Tournaments",
  pageSize = 5,
  autoLoad = true,
}) {
  const status = "active";
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    pages: 1,
    has_prev: false,
    has_next: false,
    total: 0,
  });
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Fetching tournaments…");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const timerRef = useRef(null);

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const queryTid = searchParams.get("tid");          
  const stateTid = location.state?.autoOpenTid ? String(location.state.autoOpenTid) : null; 
  const desiredTid = (queryTid ?? stateTid) ? String(queryTid ?? stateTid) : null;
  const [expandedTid, setExpandedTid] = useState(null);
  const tidClearedRef = useRef(false);


  useEffect(() => {
    // your previous effect(s)
    if (!desiredTid) return;
    // Wait until list is loaded
    // Example: if you store tournaments in `items`
    if (!items || !items.length) return;
    const hasIt = items.some(t => String(t.id) === String(desiredTid));
    if (!hasIt) return;
    setExpandedTid(String(desiredTid));

    if (queryTid && !tidClearedRef.current) {
      tidClearedRef.current = true;
      const url = new URL(window.location.href);
      url.searchParams.delete("tid");             
      window.history.replaceState(window.history.state, "", url.toString());
    }
   }, [desiredTid, items]);

  async function load(p = 1) {
    setLoadingMessage("Fetching tournaments…");
    setLoading(true);
    try {
      const data = await listTournaments({ status, page: p, limit: pageSize });
      setItems(data.tournaments || []);
      setMeta(
        data.meta || { page: p, pages: 1, has_prev: false, has_next: false, total: 0 }
      );
      setPage(p);
    } catch (e) {
      console.log("Failed to load active tournaments: " + e.message);
      setItems([]);
      setMeta({ page: 1, pages: 1, has_prev: false, has_next: false, total: 0 });
    } finally {
      setLoading(false);
    }
  }

  // initial load (opt-in)
  useEffect(() => {
    if (autoLoad) {
      setLoadingMessage("Fetching tournaments…");
      load(1)
    };
  }, [autoLoad, pageSize]);

  // auto-refresh management
  useEffect(() => {
    if (!autoRefresh) {
      clearTimer();
      return;
    }
    setLoadingMessage("Fetching tournaments…");
    tick(); // immediate
    timerRef.current = setInterval(tick, 15000);
    return clearTimer;
  }, [autoRefresh, page]);

  function clearTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function tick() {
    load(page);
  }

  function handleFinished(tournamentId) {
    setLoadingMessage("Finishing...")
    setItems((prev) => prev.filter((t) => t.id !== tournamentId));
    // (Optional) also refresh the current page from the server:
    // load(page);
  }

  // plumb through row-level callbacks that might affect counts
  function onParticipantsChange(tid, newCount) {
    setItems((prev) => prev.map((x) => (x.id === tid ? { ...x, player_count: newCount } : x)));
  }

  async function handleDelete(tid) {
    try {
      setLoadingMessage("Deleting...")
      setLoading(true);
      await deleteTournament(tid);
      await load(page); // reload current page to reflect server truth (meta, pagination, etc.)
    } catch (e) {
      console.log("Failed to delete tournament: " + e.message);
    }
    setLoading(false);
  }


  return (
    <div style={{ maxWidth: 1200, margin: "0 auto 20px" }}>
      <div className="card" style={card}>
        <div className="card-header" style={header}>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <div style={tools}>
            <button className="btn" onClick={() => load(page)} disabled={loading}>
              {loading ? "Refreshing…" : items.length ? "Refresh" : "Load"}
            </button>
          </div>
        </div>

        <div className="tournament-list">
          {!items.length && !loading ? (
            <div className="empty" style={{ fontSize: 12, color: "var(--muted)", padding: "6px 0" }}>
              No active tournaments.
            </div>
          ) : (
            items.map((t) => (
              <TournamentRow
                key={t.id}
                t={t}
                ExpandComponent={ActiveExpand}
                onParticipantsChange={onParticipantsChange}
                onFinished={handleFinished}
                onDelete={handleDelete}
                shouldClose={loading}
                expandedTid={expandedTid}
              />
            ))
          )}
        </div>

        <div
          className="pager"
          style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}
        >
          <button className="btn" disabled={!meta.has_prev || loading} onClick={() => load(page - 1)}>
            Prev
          </button>
          <span className="k" style={{ fontSize: 12 }}>
            Page {meta.page || page} / {meta.pages || 1} &nbsp;·&nbsp; Total: {meta.total ?? 0}
          </span>
          <button className="btn" disabled={!meta.has_next || loading} onClick={() => load(page + 1)}>
            Next
          </button>
        </div>
      </div>
      <EightBallBounceLoader
        open={loading}
        message={loadingMessage}
        size={64}
        speed={1000}
        closable
      />
    </div>
  );
}
