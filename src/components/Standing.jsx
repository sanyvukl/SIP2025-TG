// src/components/Standing.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getRanking } from "../api/tournaments";

export default function Standing({ tournamentId, refreshSignal }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    try {
      setErr(null);
      setLoading(true);
      const r = await getRanking(tournamentId); // uses your existing POST API
      setRows(Array.isArray(r) ? r : []);
    } catch (e) {
      setErr(e?.message || "Failed to load ranking");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [tournamentId]);
  useEffect(() => { if (refreshSignal != null) load(); }, [refreshSignal]); // refetch when matches change

  const hasRows = rows.length > 0;

  return (
    <div style={wrap}>
      <div style={bar}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {hasRows ? `${rows.length} players` : "No data"}
        </div>
        <button onClick={load} style={btn}>Refresh</button>
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Loading standings…</div>
      ) : err ? (
        <div style={{ fontSize: 12, color: "#fca5a5" }}>Error: {err}</div>
      ) : !hasRows ? (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>No standings yet.</div>
      ) : (
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
                  <td style={tdCtr}>{(r.win_pct * 100).toFixed(0)}%</td>
                  <td style={tdCtr}>{r.frames_for}:{r.frames_against}</td>
                  <td style={tdCtr}>{r.frame_diff >= 0 ? `+${r.frame_diff}` : r.frame_diff}</td>
                  <td style={tdCtr}>
                    {r.last_result ? (
                      <span style={{
                        display:'inline-block',
                        padding:'2px 6px',
                        borderRadius:6,
                        background: r.last_result === 'W' ? '#12301b' : '#301214',
                        color: r.last_result === 'W' ? '#a7f3d0' : '#fecaca',
                        border:`1px solid ${r.last_result === 'W' ? '#1f5030' : '#5a1d22'}`
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
    </div>
  );
}

/* ---- local styles (match your theme) ---- */
const wrap = { border:'1px solid var(--ring)', borderRadius:8, background:'#11161d', padding:12 };
const bar  = { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 };
const btn  = { padding:'6px 10px', borderRadius:8, fontSize:12, border:'1px solid var(--ring)', background:'#0f1a28', color:'var(--ink)', cursor:'pointer' };
const tableWrap = { overflow:'auto', border:'1px solid var(--ring)', borderRadius:6 };
const table = { width:'100%', borderCollapse:'separate', borderSpacing:0, fontSize:13 };
const th = { textAlign:'center', padding:'8px 10px', background:'#1a2029', color:'#cfd6e3', position:'sticky', top:0 };
const thL = { ...th, textAlign:'left' };
const tdCtr = { textAlign:'center', padding:'8px 10px', borderTop:'1px solid #273040' };
const tdL = { textAlign:'left', padding:'8px 10px', borderTop:'1px solid #273040', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' };
