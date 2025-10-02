// src/components/Standing.jsx
import React, { useCallback, useRef, useState, useEffect } from "react";
import { getRanking } from "../api/tournaments";
import PoolOrbitSolidsLoader from "./Loaders/PoolOrbitSolidsLoader";

const autoFetchedOnce = new Set();            // tournamentId -> true
const rankingCache    = new Map();            // tournamentId -> rows[]
const AUTO_REFRESH_MS = 60_000;

export default function Standing({ tournamentId, finishing }) {
  const [rows, setRows]       = useState(() => rankingCache.get(tournamentId) || []);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState(null);

  // guards
  const mountedRef = useRef(false);
  const busyRef    = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    // 👉 Auto-fetch only if this tournament hasn't fetched before.
    if (!autoFetchedOnce.has(tournamentId)) {
      // Don't mark as fetched yet—wait for a successful, mounted result (StrictMode-safe).
      void load(); 
    }
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const load = useCallback(async () => {
    if (busyRef.current) return;       // ignore double-clicks
    busyRef.current = true;
    setErr(null);
    setLoading(true);

    try {
      const r = await getRanking(tournamentId);
      if (!mountedRef.current) return;

      const next = Array.isArray(r) ? r : [];
      setRows(next);
      rankingCache.set(tournamentId, next);

      // Mark as auto-fetched AFTER a mounted success so StrictMode remounts still get their first fetch.
      autoFetchedOnce.add(tournamentId);
    } catch (e) {
      if (!mountedRef.current) return;
      setErr(e?.message || "Failed to load ranking");
      // Note: we intentionally DO NOT mark autoFetchedOnce on error.
      // That way, the next time the user opens the tab, it can try again automatically.
    } finally {
      if (!mountedRef.current) return;
      setLoading(false);
      busyRef.current = false;
    }
  }, [tournamentId]);

  useEffect(() => {
    if (!AUTO_REFRESH_MS) return;

    const id = setInterval(() => {
      // only refresh while mounted and the tab is visible
      if (mountedRef.current && !document.hidden) {
        void load();
      }
    }, AUTO_REFRESH_MS);

    return () => clearInterval(id);
  }, [load, tournamentId]);

  const hasRows = rows.length > 0;
  
  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {loading ? "Loading…" : err ? "Error" : hasRows ? `${rows.length} players` : "No data"}
        </div>
        <button onClick={load} style={btn} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {err && !loading && (
        <div style={{ fontSize: 12, color: "#fca5a5", marginBottom: 8 }}>Error: {err}</div>
      )}

      {!loading && !err && !hasRows && (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>No standings yet.</div>
      )}

      {!loading && !err && hasRows && (
        <div style={tableWrap}>
          <table style={table}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={thL}>Player</th>
                <th style={th}>Seed</th>
                <th style={th}>W</th>
                <th style={th}>L</th>
                <th style={th}>Win %</th>
                <th style={th}>Frames</th>
                <th style={th}>Diff</th>
                <th style={th}>Last</th>
                <th style={th}>Elim</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.player_id}>
                  <td style={tdCtr}>{r.rank}</td>
                  <td style={tdL}>{r.name || "—"}</td>
                  <td style={tdCtr}>{r.seed ?? "—"}</td>
                  <td style={tdCtr}>{r.wins}</td>
                  <td style={tdCtr}>{r.losses}</td>
                  <td style={tdCtr}>
                    {Number.isFinite(r?.win_pct) ? Math.round(r.win_pct * 100) + "%" : "—"}
                  </td>
                  <td style={tdCtr}>{r.frames_for}:{r.frames_against}</td>
                  <td style={tdCtr}>{(r.frame_diff ?? 0) >= 0 ? `+${r.frame_diff}` : r.frame_diff}</td>
                  <td style={tdCtr}>
                    {r.last_result ? (
                      <span style={{
                        display:'inline-block',
                        padding:'2px 6px',
                        borderRadius:6,
                        background: r.last_result === 'W' ? '#12301b' : '#301214',
                        color:      r.last_result === 'W' ? '#a7f3d0' : '#fecaca',
                        border:     `1px solid ${r.last_result === 'W' ? '#1f5030' : '#5a1d22'}`
                      }}>
                        {r.last_result}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={tdCtr}>
                    {r.eliminated ? (
                      <span style={{
                        fontSize: 11, color:'#fca5a5',
                        background:'#2a1717', border:'1px solid #542222',
                        padding:'2px 6px', borderRadius:6
                      }}>Yes</span>
                    ) : 'No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {(loading || finishing) && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "all",
            background: "rgba(0,0,0,0.2)"
          }}
        >
          <PoolOrbitSolidsLoader
            open={loading || finishing}
            message={finishing ? "Finishing the tournament..." : "Loading..."}
            size={180}
            backdrop="transparent"
            position="absolute"
            lockScroll={false}
          />
        </div>
      )}
    </div>
  );
}

/* ---- local styles ---- */
const wrap = { border:'1px solid var(--ring)', borderRadius:8, background:'#11161d', padding:12, position: "relative", minHeight: 300 };
const bar  = { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 };
const btn  = { padding:'6px 10px', borderRadius:8, fontSize:12, border:'1px solid var(--ring)', background:'#0f1a28', color:'var(--ink)', cursor:'pointer' };
const tableWrap = { overflow:'auto', border:'1px solid var(--ring)', borderRadius:6 };
const table = { width:'100%', borderCollapse:'separate', borderSpacing:0, fontSize:13 };
const th = { textAlign:'center', padding:'8px 10px', background:'#1a2029', color:'#cfd6e3', position:'sticky', top:0 };
const thL = { ...th, textAlign:'left' };
const tdCtr = { textAlign:'center', padding:'8px 10px', borderTop:'1px solid #273040' };
const tdL = { textAlign:'left', padding:'8px 10px', borderTop:'1px solid #273040', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' };
