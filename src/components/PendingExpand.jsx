import React, { useEffect, useMemo, useState } from "react";
import {
  listPlayers,
  createPlayer,
  deletePlayer,
  createFullBracket,
  updateTournamentPlayerCount,
} from "../api/tournaments";
import { useNavigate } from "react-router-dom";

// small helpers
const cssEscape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

export default function PendingExpand({ tournament, onBecameActive, onParticipantsChange }) {
  const tid = tournament.id;
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addName, setAddName] = useState("");
  const [round1, setRound1] = useState([]); // [{id,a,b,bye}]
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await listPlayers(tid);
        if (!mounted) return;
        setPlayers(list);
      } catch (e) {
        console.log("Failed to load players: " + e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [tid]);

  // Build R1 editor “cards” on demand (Submit button)
  function buildRound1({ mode = 'seeded' } = {}) {
    const n = players.length;
    if (n < 2) {
      setRound1([]);
      return;
    }

    const { matches, byeCount } = computeSlots(n);

    if (mode === 'seeded') {
      // 1) Top seeds get BYEs
      const sorted = [...players].sort((a, b) => (a.seed ?? Infinity) - (b.seed ?? Infinity));
      const byeSeeds = sorted.slice(0, byeCount).map(p => p.id);
      const rest = sorted.slice(byeCount).map(p => p.id);

      // 2) Create matches: first all BYE matches (A = top seed, B = BYE), then regular pairs
      const cards = [];
      let idx = 0;

      for (let i = 0; i < byeCount; i++, idx++) {
        cards.push({
          id: `R1M${idx + 1}`,
          a: byeSeeds[i],
          b: "BYE",
          bye: true,
        });
      }

      for (let i = 0; i < rest.length; i += 2, idx++) {
        cards.push({
          id: `R1M${idx + 1}`,
          a: rest[i] ?? null,
          b: rest[i + 1] ?? null,
          bye: false,
        });
      }

      setRound1(cards);
      return;
    }

    // Fallback/random: empty slots; you can click "Auto-Fill Random" after
    const base = Array.from({ length: matches }, (_, i) => ({
      id: `R1M${i + 1}`,
      a: null,
      b: null,
      bye: false,
    }));
    // mark the last `byeCount` as BYE matches
    for (let i = 0; i < byeCount; i++) {
      base[base.length - 1 - i].bye = true;
      base[base.length - 1 - i].b = "BYE";
    }
    setRound1(base);
  }

  // Reusable disabled style for controls
  const ctrlStyle = (disabled, extra={}) => ({
    ...extra,
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : (extra.cursor || 'pointer')
  });

  // For inputs/selects we want default cursor when enabled
  const inputStyle = (disabled, extra={}) => ({
    ...extra,
    opacity: disabled ? 0.6 : 1,
    cursor: disabled ? 'not-allowed' : 'text'
  });


  // disable used players in selects
  const usedIds = useMemo(() => {
    const s = new Set();
    round1.forEach((m) => {
      if (m.a) s.add(m.a);
      if (m.b && m.b !== "BYE") s.add(m.b);
    });
    return s;
  }, [round1]);

  function setSlot(mid, key, value) {
    setRound1((prev) =>
      prev.map((m) => (m.id === mid ? { ...m, [key]: value || null } : m))
    );
  }

  async function onAdd() {
    const name = addName.trim();
    if (!name) return;
    setBusy(true);
    try {
      // Server will auto-assign seed = current_count + 1
      await createPlayer(tid, { name });
      setAddName("");
      const list = await listPlayers(tid);
      setPlayers(list);
      const newCount = await updateTournamentPlayerCount(tid);
      onParticipantsChange?.(tid, newCount);
      setRound1([]);
    } catch (e) {
      console.log("Failed to add player: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(pid) {
    if (!window.confirm("Delete this player?")) return;
    setBusy(true);
    try {
      await deletePlayer(pid);
      const list = await listPlayers(tid);
      setPlayers(list);
      const newCount = await updateTournamentPlayerCount(tid);
      onParticipantsChange?.(tid, newCount);
      setRound1([]);
    } catch (e) {
      console.log("Failed to delete: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  function autoFillRandom() {
    const ids = players.map(p => p.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    let k = 0;
    setRound1(prev =>
      prev.map(m => {
        if (m.bye) {
          return { ...m, a: ids[k++] ?? null, b: "BYE" };
        }
        return { ...m, a: ids[k++] ?? null, b: ids[k++] ?? null };
      })
    );
  }


  function clearEditor() {
    setRound1((prev) =>
      prev.map((m) => ({ ...m, a: null, b: m.bye ? "BYE" : null }))
    );
  }

  async function onStartTournamentClick() {
    if (starting) return;
    setStarting(true);
    setBusy(true);
    try {
      // Normalize your local editor state into an API-friendly array
      const pairs = round1.map(m => ({
        a: m.a || null,                           // player id or null
        b: m.b === "BYE" ? null : (m.b || null),  // BYE -> null on server
        bye: !!m.bye
      }));

      const data = await createFullBracket(tid, { pairs });   // <— pass to API

      console.log(
        `Created ${data.created} matches · Format: ${String(
          data.format
        ).toUpperCase()}${data.byes ? ` · BYEs: ${data.byes}` : ""} · Ready ✅`
      );
      onBecameActive?.(tid);

      const navigate = useNavigate();
      navigate("/active")
    } catch (e) {
      console.log("Failed to start: " + e.message);
    } finally {
      setBusy(false);
      setStarting(false);
    }
  }


  function nextPow2(x) {
    const n = Math.max(2, x|0);
    return 1 << Math.ceil(Math.log2(n));
  }

  function computeSlots(nPlayers) {
    const slots = nextPow2(nPlayers);
    return {
      slots,
      matches: slots / 2,
      byeCount: slots - nPlayers,
    };
  }


  return (
    <div className="expand-panel" style={{ border: '1px solid var(--ring)', background: '#191d24', borderRadius: 12, padding: 12, marginBottom:12 }}>
      {loading ? (
        <div className="k">Loading…</div>
      ) : (
        <div className="expand-inner" style={{
          display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12, alignItems: 'start'
        }}>
          {/* LEFT: Players */}
          <div className="players-col" style={{ border:'1px solid var(--ring)', borderRadius:10, background:'#151a20', padding:12 }}>
            <h3 style={{ margin: 0, marginBottom: 8, fontSize: 14, color: '#cfd6e3' }}>Players</h3>

            <div className="players-actions" style={{ display:'flex', gap:8, marginBottom:8, alignItems:'center' }}>
              <input
                className="control"
                type="text"
                placeholder={busy ? "Loading..." : "Player name"}
                value={busy ? "" : addName}
                onChange={(e)=>setAddName(e.target.value)}
                disabled={busy}
                style={inputStyle(busy, {
                  flexBasis: "85%",
                  minWidth: 0,
                  height: 40,
                  color: busy ? "#888" : "inherit"
                })}
              />

              <button
                className="btn"
                onClick={onAdd}
                disabled={busy || !addName.trim()}
                style={ctrlStyle(busy || !addName.trim(), {
                  flexBasis: "15%",
                  maxWidth: "15%",
                  height: 40,
                  aspectRatio: "1 / 1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: '#2b3140',
                  border: '1px solid var(--ring)',
                  transition: 'background 0.2s',
                  fontSize: 22,
                  fontWeight: 800,
                  lineHeight: 1
                })}
                onMouseEnter={(e)=>{ if (!(busy || !addName.trim())) e.currentTarget.style.background = '#ff6a2f'; }}
                onMouseLeave={(e)=>{ if (!(busy || !addName.trim())) e.currentTarget.style.background = '#2b3140'; }}
              >
                +
              </button>
            </div>


            <div className="player-list" style={{ maxHeight: 360, overflow: 'auto', paddingRight: 6 }}>
              {players.length === 0 ? (
                <div className="empty">No players yet.</div>
              ) : players.map((p) => (
                <div key={p.id} className="player-item" style={{
                  display:'flex', alignItems:'center', justifyContent:'space-between',
                  border:'1px solid var(--ring)', borderRadius:8, padding:8, marginBottom:6, background:'#0f141a', fontSize:13
                }}>
                  <span>{p.seed}. {p.name}</span>
                  <span style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <button
                      className="btn sm"
                      onClick={()=>onDelete(p.id)}
                      disabled={busy}
                      style={ctrlStyle(busy, {
                        background: '#221416',
                        borderColor:'#4a1f1f'
                      })}
                    >
                    X
                  </button>
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop:10, display:'flex', justifyContent:'flex-end' }}>
              <button
                className="btn"
                onClick={buildRound1}
                disabled={busy || players.length < 2}
                style={ctrlStyle(busy || players.length < 2)}
              >
                Submit
              </button>
            </div>
          </div>

          {/* RIGHT: Round 1 Editor / Placeholder */}
          <div className="bracket-col" style={{
            border:'1px solid var(--ring)', borderRadius:10, background:'#0f141a', padding:12,
            maxHeight:'70vh', overflow: 'auto', WebkitOverflowScrolling:'touch'
          }}>
            {round1.length === 0 ? (
              <div className="match-editor-header">
                <div className="k">No matches yet. Click <strong>Submit</strong> to generate first-round slots.</div>
              </div>
            ) : (
              <>
                <div className="match-editor-header" style={{display:'flex', gap:8, alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                  <div className="k">
                    Round 1 · Matches: {round1.length}{round1.some(m => m.bye) ? ` · (${round1.filter(m => m.bye).length} BYE${round1.filter(m => m.bye).length>1?'s':''})` : ''}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn" onClick={autoFillRandom} disabled={busy} style={ctrlStyle(busy)}>Random Shuffle</button>
                    <button className="btn" onClick={clearEditor}   disabled={busy} style={ctrlStyle(busy)}>Clear</button>
                  </div>
                </div>

                <div className="match-grid" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12, maxHeight:400, overflow:'auto' }}>
                  {round1.map((m) => (
                    <div key={m.id} className="match-card" style={{ border:'1px solid var(--ring)', background:'#11161d', borderRadius:10, padding:10 }}>
                      <h5 style={{ margin:0, marginBottom:8, fontSize:12, color:'#9aa3b2', textTransform:'uppercase', letterSpacing:'.04em' }}>
                        {m.id}{m.bye ? ' · (BYE)' : ''}
                      </h5>
                      <div className="pair" style={{ display:'grid', gap:8 }}>
                        {/* Slot A */}
                        <select
                          className="control"
                          value={m.a || ""}
                          onChange={(e)=>setSlot(m.id, 'a', e.target.value)}
                          disabled={busy}
                          style={inputStyle(busy)}
                        >
                          <option value="">{'— Select —'}</option>
                          {players.map((p)=>(
                            <option key={p.id} value={p.id} disabled={(usedIds.has(p.id) && m.a !== p.id)}>
                              {p.seed}. {p.name}
                            </option>
                          ))}
                        </select>

                        {/* Slot B */}
                        {m.bye ? (
                          <select className="control" disabled value="BYE" style={inputStyle(true)}>
                            <option value="BYE">BYE</option>
                          </select>
                        ) : (
                          <select
                            className="control"
                            value={m.b || ""}
                            onChange={(e)=>setSlot(m.id, 'b', e.target.value)}
                            disabled={busy}
                            style={inputStyle(busy)}
                          >
                            <option value="">{'— Select —'}</option>
                            {players.map((p)=>(
                              <option key={p.id} value={p.id} disabled={(usedIds.has(p.id) && m.b !== p.id)}>
                                {p.seed}. {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop:12 }}>
                  <button
                    className="btn"
                    style={ctrlStyle(busy || starting, { width:'100%' })}
                    onClick={onStartTournamentClick}
                    disabled={busy || starting}
                  >
                    {starting ? "Starting a tournament..." : "Start Tournament"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
