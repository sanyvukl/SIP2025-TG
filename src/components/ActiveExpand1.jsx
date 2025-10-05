import React, { useEffect, useMemo, useState } from "react";
import {
  listPlayers,
  listMatches,           
  saveMatchScore,        
  advanceMatch,
  finishTournament,
} from "../api/tournaments";
import PaneHeader from "./PaneHeader";
import Standing from "./Standing";
import { useNavigate } from "react-router-dom";
import path from "../utils/paths";
import PoolOrbitSolidsLoader from "./Loaders/PoolOrbitSolidsLoader";

// Medium
import LoaderOne from "./Loaders/LoaderOne/LoaderOne";

// Calm
import LoaderTwo from "./Loaders/LoaderTwo/LoaderTwo";

// Fast
import LoaderThree from "./Loaders/LoaderThree/LoaderThree";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

export default function ActiveExpand({ tournament, onFinished }) {
  const navigate = useNavigate();
  const tid = tournament.id;
  const [playersById, setPlayersById] = useState({});
  const [loadingMessage, setLoadingMessage] = useState("Fetching tournaments…");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [finishBusy, setFinishBusy] = useState(false);
  const [activeTab, setActiveTab] = useState('tournament'); // 'tournament' | 'ranking'


  const raceTo = Number(tournament.race_to || 0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadingMessage("Loading...");
        const [players, ms] = await Promise.all([listPlayers(tid), listMatches(tid)]);
        if (!mounted) return;
        setPlayersById(Object.fromEntries(players.map(p => [String(p.id), p])));
        setMatches(ms);
      } catch (e) {
        console.log("Failed to load active view: " + e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [tid]);

  const completion = useMemo(() => {
    const statuses = (matches || []).map(m => String(m.status || '').toLowerCase());
    const any = statuses.length > 0;
    const allCompleted = any && statuses.every(s => s === 'completed');
    const anyActive = statuses.some(s => s === 'in_progress' || s === 'pending');
    return { any, allCompleted, anyActive };
  }, [matches]);

  const tournamentCompleted = String(tournament.status || '').toLowerCase() === 'completed';
  const canFinish = completion.allCompleted && !tournamentCompleted;
  
  // ---- render helpers ----
  // --- helpers to parse match ids like W1M7, R1M3, L4M2, G1 ---
  function parseMatchId(raw) {
    const s = String(raw || '').toUpperCase().trim();

    // Normalize R1M# → W1M# just for ordering consistency
    const r1 = s.match(/^R(\d+)M(\d+)$/);
    if (r1) return { bracket: 'W', round: Number(r1[1]), match: Number(r1[2]) };

    const w = s.match(/^W(\d+)M(\d+)$/);
    if (w) return { bracket: 'W', round: Number(w[1]), match: Number(w[2]) };

    const l = s.match(/^L(\d+)M(\d+)$/);
    if (l) return { bracket: 'L', round: Number(l[1]), match: Number(l[2]) };

    // Finals: support G1 or GF1 styles
    const g = s.match(/^G(?:F)?(\d+)$/);
    if (g) return { bracket: 'G', round: Number(g[1]), match: 1 };

    // Fallback if id unexpected
    return { bracket: String(s[0] || 'W'), round: Number.isFinite(Number(s.slice(1))) ? Number(s.slice(1)) : 1, match: 1 };
  }

  function byIdNatural(a, b) {
    const A = parseMatchId(a.id);
    const B = parseMatchId(b.id);
    // They’re already grouped by bracket+round; compare by match number first,
    // then id as a stable tiebreaker.
    if (A.match !== B.match) return A.match - B.match;
    return String(a.id).localeCompare(String(b.id));
  }

  function splitMatches(ms) {
    const W = {}, L = {}, G = [];
    (ms || []).forEach(m => {
        const br = String(m.bracket || 'W').toUpperCase();
        const key = String(m.round || 1);

        if (br === 'G') {
          G.push(m);
        } else if (br === 'L') {
          (L[key] ||= []).push(m);
        } else {
          (W[key] ||= []).push(m);
        }
      });

    const byRound = (obj) =>
      Object.keys(obj)
        .sort((a, b) => Number(a) - Number(b))               // round 1,2,3...
        .map(r => ({
          title: r,
          matches: (obj[r] || []).slice().sort(byIdNatural)  // W1M1, W1M2, W1M3...
        }));

    return {
      winners: byRound(W),
      losers: byRound(L),
      finals: G.slice().sort((a, b) => {
        // finals: prefer numeric round, then id
        const A = parseMatchId(a.id);
        const B = parseMatchId(b.id);
        if (A.round !== B.round) return A.round - B.round;
        return String(a.id).localeCompare(String(b.id));
      }),
    };
  }

  const grid = useMemo(() => splitMatches(matches), [matches]);

  // ---- score utils ----
  const clamp = (v) => {
    let n = Number(v);
    if (!Number.isFinite(n) || n < 0) n = 0;
    if (raceTo > 0 && n > raceTo) n = raceTo;
    return n;
  };

  // Single source of truth for win state + score highlights
  function computeWins(m, raceTo, clamp) {
    const a = clamp(m.slot_a_score);
    const b = clamp(m.slot_b_score);

    const liveA = raceTo > 0 && a === raceTo && b < raceTo && m.status !== "completed";
    const liveB = raceTo > 0 && b === raceTo && a < raceTo && m.status !== "completed";

    const finalA = m.status === "completed" && m.winner_id && m.winner_id === m.slot_a_player_id;
    const finalB = m.status === "completed" && m.winner_id && m.winner_id === m.slot_b_player_id;

    return {
      a, b,
      aScoreWin: liveA || finalA,
      bScoreWin: liveB || finalB,
      exactlyOneLive: liveA ^ liveB,
    };
  }

  // One gate for controls (score buttons and Advance)
  function computeInteractivity(m, wins) {
    const hasA = !!m.slot_a_player_id;
    const hasB = !!m.slot_b_player_id;
    const oneSided = hasA ^ hasB;              // BYE if true
    const busy = !!(m.__advBusy || m.__scoreBusy);

    const isLiveRound = m.status === "in_progress";

    // Score buttons only when both players present, live, and not busy
    const scoreEnabled = isLiveRound && hasA && hasB && !busy;

    // Advance is allowed only when:
    // - live round
    // - not busy
    // - exactly one live winner (raceTo reached) AND both players present
    // NOTE: one-sided (BYE) *not* actionable from UI because backend auto-advances.
    const advanceEnabled = isLiveRound && !busy && hasA && hasB && wins.exactlyOneLive;

    return { scoreEnabled, advanceEnabled, busy, hasA, hasB, oneSided };
  }

  function patchMatch(mid, patch) {
    withGridScrollPreserved(() => {
      setMatches(prev => prev.map(m => (m.id === mid ? { ...m, ...patch } : m)));
    });
  }

  async function updateScores(mid, a, b) {
    a = clamp(a); b = clamp(b);

    // optimistic + lock score controls
    patchMatch(mid, { slot_a_score: a, slot_b_score: b, __scoreBusy: true });

    try {
      setUpdating(true);
      setLoadingMessage("Updating the score...");
      await saveMatchScore(tid, mid, a, b);
      console.log(`Score updated ${a}:${b}` );
    } catch (e) {
      console.log("Save failed: " + e.message);
    } finally {
      setUpdating(false);
      patchMatch(mid, { __scoreBusy: false });
    }
  }

  async function handleAdvance(mid, silent=false) {
    withGridScrollPreserved(() => {
      setMatches(prev => prev.map(m => m.id === mid ? { ...m, __advBusy: true } : m));
    });
    try {
      setUpdating(true);
      setLoadingMessage("Submitting...");
      await advanceMatch(tid, mid);
      const fresh = await listMatches(tid);
      withGridScrollPreserved(() => setMatches(fresh));

      if (!silent) console.log("Advanced.");
    } catch (e) {
      console.log("Advance failed: " + e.message);
      withGridScrollPreserved(() => {
        setMatches(prev => prev.map(m => m.id === mid ? { ...m, __advBusy: false } : m));
      });
    }
    setUpdating(false);
  }

  function ScoreBox({ m, slot, scoreWin, scoreEnabled }) {
    const val = clamp(slot === "A" ? m.slot_a_score : m.slot_b_score);

    const canInc = scoreEnabled && (raceTo > 0 ? val < raceTo : true);
    const canDec = scoreEnabled && val > 0;

    const bump = (delta) => {
      if (!scoreEnabled) return;
      const a0 = clamp(m.slot_a_score);
      const b0 = clamp(m.slot_b_score);
      if (slot === "A") updateScores(m.id, clamp(a0 + delta), b0);
      else              updateScores(m.id, a0, clamp(b0 + delta));
    };

    return (
      <div style={{ display: "flex", alignItems: "stretch", opacity: scoreEnabled ? 1 : 0.9 }}>
        <button className="mx-bump" onClick={() => bump(-1)}
          disabled={!canDec} aria-disabled={!canDec} style={bumpStyle(!canDec)}>−</button>

        <div className="mx-score" style={{
          ...scoreInputStyle(!scoreEnabled),
          display: "flex", alignItems: "center", justifyContent: "center",
          ...(scoreWin ? { background: "var(--score-win)", color: "var(--ink)" } : null),
        }}>
          {val}
        </div>

        <button className="mx-bump" onClick={() => bump(1)}
          disabled={!canInc} aria-disabled={!canInc} style={bumpStyle(!canInc)}>+</button>
      </div>
    );
  }
  function formatName(fullName) {
    if (!fullName) return "";

    const parts = fullName.trim().split(/\s+/); // split by spaces
    if (parts.length === 1) {
      return parts[0]; // single name only
    }

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const firstInitial = firstName.charAt(0).toUpperCase();

    return `${firstInitial}. ${lastName}`;
  }
  function MatchCard({ m, isGrandFinal = false }) {
    const A = playersById[m.slot_a_player_id] || {};
    const B = playersById[m.slot_b_player_id] || {};
    const aSeed = A.seed ?? "-";
    const bSeed = B.seed ?? "-";

    const wins = computeWins(m, raceTo, clamp);
    const ui   = computeInteractivity(m, wins);

    const advDisabled = !ui.advanceEnabled;

    return (
      <div className="mx-card" data-mid={m.id} style={isGrandFinal ? mxCardGrandFinal : mxCard}>
        {/* Slot A */}
        <div className="mx-slot" data-slot="A" style={isGrandFinal ? mxSlotGrandFinal : mxSlot}>
          <div className="mx-left" style={mxLeft}>
            <div className="mx-seed" style={mxSeed}>{aSeed}</div>
            <div className="mx-name" style={mxName}>{formatName(escapeHtml(A.name || "—"))}</div>
          </div>
          <ScoreBox m={m} slot="A" scoreWin={wins.aScoreWin} scoreEnabled={ui.scoreEnabled} />
        </div>

        {/* Slot B */}
        <div className="mx-slot" data-slot="B" style={isGrandFinal ? mxSlotGrandFinal : mxSlot}>
          <div className="mx-left" style={mxLeft}>
            <div className="mx-seed" style={mxSeed}>{bSeed}</div>
            <div className="mx-name" style={mxName}>{formatName(escapeHtml(B.name || "—"))}</div>
          </div>
          <ScoreBox m={m} slot="B" scoreWin={wins.bScoreWin} scoreEnabled={ui.scoreEnabled} />
        </div>

        <div className="mx-actions" style={mxActions}>
          <button
            className="btn sm"
            onClick={()=>handleAdvance(m.id)}
            disabled={advDisabled}
            style={{ ...btnSm, ...(advDisabled ? { opacity:.55, cursor:'not-allowed' } : null) }}
            title={
              m.status === "completed" ? "Match completed"
              : ui.oneSided ? "BYE — auto-advancing from server"
              : !ui.advanceEnabled ? "Waiting for a winner"
              : undefined
            }
          >
            {m.__advBusy ? "Submitting…" : (m.status === "completed" ? "Submitted" : "Submit")}
          </button>

          <span className={`badge ${m.status}`} style={{
            fontSize:10, padding:'3px 6px', borderRadius:6, color:'#cfd6e3',
            background: m.status === 'completed' ? '#0f2a17'
              : m.status === 'in_progress' ? '#112036'
              : '#2a2f37',
            borderColor: m.status === 'completed' ? '#214b32'
              : m.status === 'in_progress' ? '#2a406b'
              : '#3a404c'
          }}>
            {String(m.status || "pending").replace('_',' ')}
          </span>
        </div>
      </div>
    );
  }

  function Section({ title, children }) {
    return (
      <div className="section" style={{ marginBottom:18,}}>
        <div className="section-head" style={sectionHead}>{title}</div>
        {/* IMPORTANT: block container, not inline-flex */}
        <div className="section-body">{children}</div>
      </div>
    );
  }

  function withGridScrollPreserved(cb) {
    const el = document.getElementById(`activeGrid_${tid}`);
    const prevTop = el?.scrollTop ?? 0;
    const prevLeft = el?.scrollLeft ?? 0;

    const ret = cb(); // do your state updates / re-fetches

    // Restore after React paints
    requestAnimationFrame(() => {
      const el2 = document.getElementById(`activeGrid_${tid}`);
      if (el2) {
        el2.scrollTop = prevTop;
        el2.scrollLeft = prevLeft;
      }
    });

    return ret;
  }

  function BracketHeaderCell({ children }) {
    const COL_W = 240; // keep in one place so headers & columns line up
    return (
      <div
        className="bracket-head-cell"
        style={{
          minWidth: COL_W,
          flex: '0 0 auto',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            background: '#11161d',
            paddingTop: 2,
            paddingBottom: 6,
          }}
        >
          <div style={roundHead}>{children}</div>
        </div>
      </div>
    );
  }


  const COL_W = 240;
  const MATCH_MARGIN_PX = 16;

  function BracketFlex({ rounds, prefix = 'W', justify = 'space-around' ,}) {

    function HeaderRow() {
    return (
      <div
        className={`${prefix}-head-row`}
        style={{
          display: 'flex',
          gap: 18,
          alignItems: 'baseline',
          zIndex: 1,
          background: '#11161d',
        }}
      >
        {rounds.map((col, i) => (
          <BracketHeaderCell key={`${prefix}-head-${i}`}>
            {`${prefix} · R${col.title}`}
          </BracketHeaderCell>
        ))}
      </div>
    );
  }


    // body renderer
    function BodyRow() {
      return (
        <div
          className={`${prefix}-body-row`}
          style={{
            display: 'flex',
            height: "100%",
            gap: 18,
            alignItems: 'center',
            paddingBottom: 4,
          }}
        >
          {rounds.map((col, i) => (
            <div
              key={`${prefix}-col-${i}`}
              style={{
                display: 'flex',
                height: "100%",
                flexDirection: 'column',
                width: COL_W,
                flex: '0 0 auto',
              }}
            >
              <div
                className={`${prefix}-lane`}
                style={{
                  display: 'flex',
                  height: "100%",
                  flexDirection: 'column',
                  justifyContent: justify,   // default = space-around
                  gap: justify === 'space-between' ? 0 : MATCH_MARGIN_PX,
                }}
              >
                {col.matches.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      willChange: 'transform',
                      transition: 'transform .12s ease, box-shadow .12s ease',
                    }}
                  >
                    <MatchCard m={m} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={`${prefix}-flex`} style={{ display: 'grid' }}>
        <HeaderRow />
        <BodyRow />
      </div>
    );
  }

  function FinalsRail({ finals, justify = 'space-around' }) {
  if (!finals?.length) return null;

  return (
    <div
      className="finals-rail"
      style={{ display: 'flex',
          flexDirection: 'column'}}
    >
      <BracketHeaderCell>Grand Final</BracketHeaderCell>

      <div
        className="finals-lane"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: justify,
          alignItems:"center",
          gap: justify === 'space-between' ? 0 : MATCH_MARGIN_PX,
          height: "100%",
          paddingBottom: 4,
        }}
      >
        {finals.map((m) => (
          <div key={m.id} style={{ width: COL_W }}>
            <MatchCard m={m} isGrandFinal />
          </div>
        ))}
      </div>
    </div>
  );
  }

  async function handleFinishTournament() {
      if (finishBusy) return;
      if (!window.confirm("Finish this tournament? This will lock results.")) return;
      setLoadingMessage("Finishing the tournament...");
      try {
        setFinishBusy(true);
        setUpdating(true);
        const res = await finishTournament(tournament.id /*, { force:true }*/);
        onFinished(tournament.id);
        console.log("Tournament finished" + (res.winner_id ? ` — Champion: ${res.winner_name}` : ""));
        
        await navigate(path.PAST_TOURNAMENTS);
      } catch (e) {
        console.log("Failed to finish: " + e.message);
      } finally {
        setFinishBusy(false);
        setUpdating(false);
      }
  }


  return (
    <div className="active-panel" style={panel}>
      {/* Active Component is loading */}
      {(loading) ? (
        <div className="k" style={{height: "400px", position: "relative"}}>
            <PoolOrbitSolidsLoader
                                open={loading}
                                message={loadingMessage}
                                backdrop="rgba(0, 0, 0, 0.2)"  
                                position="absolute"
                                lockScroll={false}
            />
            </div>
      ) : (
         <div className="active-inner" style={inner}>
          {/* Row 1: Tabs */}
          <div className="top-bar" style={topBar}>
            <div style={{ display:'flex', gap:8 }}>
              <button
                className={`tab ${activeTab === 'tournament' ? 'active' : ''}`}
                style={activeTab === 'tournament' ? tabActiveTop : tabTop}
                onClick={() => setActiveTab('tournament')}
              >
                Tournament
              </button>
              <button
                className={`tab ${activeTab === 'ranking' ? 'active' : ''}`}
                style={activeTab === 'ranking' ? tabActiveTop : tabTop}
                onClick={() => setActiveTab('ranking')}
              >
                Ranking
              </button>
            </div>

            <div style={{ marginLeft:'auto', display:'inline-flex', gap:12, alignItems:'center', fontSize:12, color:'var(--muted)', border: "1px solid var(--ring)", background: "rgb(15, 20, 26)", padding: "8px 12px", borderRadius: "8px", fontSize: "13px"}}>
              <span>Race to: <strong style={{ color:'var(--ink)' }}>{raceTo || "—"}</strong></span>
            </div>
          </div>

          {/* Row 2: Content (header + grid or ranking) */}
          <div className="content-pane" style={contentPane}>
            <PaneHeader
              title={activeTab === 'ranking' ? 'Ranking' : 'Tournament'}
              onFinish={handleFinishTournament}
              canFinish={canFinish}
              finished={tournamentCompleted}
              busy={finishBusy}
            />

            <div id={`activeGrid_${tid}`} className="grid-shell" style={gridShell}>
              {activeTab === 'tournament' ? (
                <div>
                  <Section title="Winners Bracket">
                    {grid.winners.length ? (
                      <div style={{ display: 'flex', gap: 18, alignItems: 'stretch', paddingBottom: 4 }}>
                        <>
                          <BracketFlex rounds={grid.winners} prefix="W" justify="space-around" />
                          {grid.finals.length > 0 && (
                            <FinalsRail finals={grid.finals} justify="space-around" />
                          )}
                        </>
                      </div>
                    ) : (
                      <div className="empty" style={{ fontSize:12, color:'var(--muted)' }}>No matches.</div>
                    )}
                    {(updating && activeTab === 'tournament') ? (
                      <div
                        style={{
                          height: "100%",
                          width: "100%",
                          position: "absolute",
                          zIndex: 10000,
                          top:"50%",
                          left: "50%",
                          transform: "translate(-50%,-50%)",
                        }}
                      >
                        <PoolOrbitSolidsLoader
                          open={updating}
                          message={loadingMessage}
                          size={180}
                          backdrop="rgba(0, 0, 0, 0.2)"
                          position="absolute"
                          lockScroll={false}
                        />
                      </div>
                    ) : null}
                  </Section>

                  {String(tournament.format).toLowerCase() === "double" && (
                    <Section title="Losers Bracket">
                      {grid.losers.length ? (
                        <BracketFlex rounds={grid.losers} prefix="L" justify="space-around" />
                      ) : (
                        <div className="empty" style={{ fontSize:12, color:'var(--muted)' }}>No matches.</div>
                      )}
                    </Section>
                  )}
                </div>
              ) : (
                <div className="">
                  <Section title="Standings">
                    <Standing
                      tournamentId={tid}
                      finishing={finishBusy}
                    />
                  </Section>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const gridShell = {
  border:'1px solid var(--ring)',
  borderRadius:8,
  background:'#11161d',
  padding:14,
  height:'100%',
  width:'100%',
  maxWidth:'100%',
  overflow:'auto',              // handles both x and y
  WebkitOverflowScrolling:'touch',
  boxSizing:'border-box'
};

const roundHead = { fontSize:12, color:'#9aa3b2', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 8px 0', textAlign:'center' };
const sectionHead = { display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#cfd6e3', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 10px 0' };

const mxCard = {
  width:220,
  border:'1px solid var(--ring)',
  borderRadius:4,
  overflow:'hidden',
  display:'grid',
  gridTemplateRows:'28px 28px auto',
  background:'#22262d',
};

const mxSlot    = { display:'flex', alignItems:'stretch', justifyContent:'space-between', background:'#3a3f48', fontSize:13, lineHeight:1 };
const mxLeft    = { display:'flex', alignItems:'center', flex:1, minWidth:0, height:'100%' };
const mxSeed    = { background:'#4a4f58', color:'#cfd6e3', fontSize:11, fontWeight:600, minWidth:24, padding:'0 4px', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', height:'100%', borderRight:'1px solid var(--ring)' };
const mxName    = { flex:1, height:'100%', display:'flex', alignItems:'center', padding:'0 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' };


const mxCardGrandFinal = {
  ...mxCard,
  background: 'linear-gradient(180deg, #3a2a10 0%, #1f1608 100%)', // dark → deep gold
  border: '1px solid #facc15', // bright gold border
  boxShadow: '0 0 14px rgba(250, 204, 21, 0.6)', // golden glow
};

const mxSlotGrandFinal = {
  ...mxSlot,
  color: '#fff7e0',      // soft white/golden text
};

const scoreInputStyle = (disabled)=>({
  height:'100%', width:32, margin:0, padding:0, border:'none', borderLeft:'1px solid var(--ring)',
  textAlign:'center', fontWeight:800, fontSize:12, background: disabled ? '#262b33' : '#2d3139', color:'#bfc6d1'
});
const bumpStyle = (disabled)=>({
  appearance:'none', border:'none', background: disabled ? '#242831' : '#2a2f37', color:'#cfd6e3',
  width:24, fontWeight:800, cursor: disabled ? 'not-allowed' : 'pointer', borderLeft:'1px solid var(--ring)'
});
const mxActions = { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:6, background:'#1b2027', borderTop:'1px solid var(--ring)' };
const btnSm     = { padding:'6px 10px', borderRadius:8, fontSize:12, border:'1px solid var(--ring)', background:'#0f1a28', color:'var(--ink)', cursor:'pointer' };

/* ---------------- layout styles (2 rows) ---------------- */
const panel = { border:'1px solid var(--ring)', background:'#191d24', borderRadius:12, padding:12, marginTop:10, marginBottom:12 };

const inner = {
  display:'grid',
  gridTemplateRows:'auto 1fr',   // <-- two rows: tabs + content
  gap:10,
  alignItems:'stretch',
  overflow:'hidden',
  position:'relative',
};

const topBar = {
  display:'flex',
  alignItems:'center',
  gap:8,
  border:'1px solid var(--ring)',
  background:'#0f141a',
  borderRadius:10,
  padding:8,
};

const contentPane = {
  border:'1px solid var(--ring)',
  borderRadius:10,
  background:'#0f141a',
  padding:12,
  minHeight:340,
  minWidth:0,
  overflow:'hidden',
  position:'relative',
};

/* Tabs (horizontal) */
const tabTop = {
  appearance:'none',
  border:'1px solid var(--ring)',
  background:'#0f141a',
  color:'var(--ink)',
  padding:'8px 12px',
  borderRadius:8,
  cursor:'pointer',
  fontSize:13
};
const tabActiveTop = { ...tabTop, outline:'2px solid var(--focus)', outlineOffset:1, background:'#132032' };

/* Keep your existing gridShell / card styles as-is */
