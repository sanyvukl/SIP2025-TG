import React, { useEffect, useMemo, useState } from "react";
import {
  listPlayers,
  listMatches,           
  saveMatchScore,        
  advanceMatch           
} from "../api/tournaments";

// helpers
// === Layout constants (measured) ===
  // MatchCard content height (NOT including margin)
  const MATCH_HEIGHT_PX = 101;
  // Bottom margin between cards in R1
  const MATCH_MARGIN_PX = 16;
  // “Stride” = distance from top of one card to the top of the next in R1
  const BASE_STRIDE_PX = MATCH_HEIGHT_PX + MATCH_MARGIN_PX; // 117
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

export default function ActiveExpand({ tournament }) {
  const tid = tournament.id;
  const [playersById, setPlayersById] = useState({});
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const raceTo = Number(tournament.race_to || 0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [players, ms] = await Promise.all([listPlayers(tid), listMatches(tid)]);
        if (!mounted) return;
        setPlayersById(Object.fromEntries(players.map(p => [String(p.id), p])));
        setMatches(ms);
      } catch (e) {
        alert("Failed to load active view: " + e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, [tid]);

  // ---- render helpers ----
  function splitMatches(ms) {
    const W = {}, L = {}, G = [];
    (ms || []).forEach(m => {
      const br = String(m.bracket || "W").toUpperCase();
      const key = String(m.round || 1);
      if (br === "G") G.push(m);
      else if (br.startsWith("L")) (L[key] ||= []).push(m);
      else (W[key] ||= []).push(m);
    });
    const byRound = (obj) =>
      Object.keys(obj)
        .sort((a,b)=>Number(a)-Number(b))
        .map(r => ({ title: r, matches: (obj[r]||[]).sort((a,b)=>String(a.id).localeCompare(String(b.id))) }));

    return {
      winners: byRound(W),
      losers: byRound(L),
      finals: G.sort((a,b)=>String(a.id).localeCompare(String(b.id)))
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
  const oneSideWon = (a, b) => {
    if (raceTo <= 0) return false;
    const aw = a === raceTo && b < raceTo;
    const bw = b === raceTo && a < raceTo;
    return aw ^ bw;
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
      await saveMatchScore(tid, mid, a, b);

      if (autoAdvance && oneSideWon(a, b)) {
        // NOTE: this will refresh matches; no need to unlock here if list reloads
        await handleAdvance(mid, /*silent*/true);
      }
    } catch (e) {
      alert("Save failed: " + e.message);
    } finally {
      // If handleAdvance fetched fresh matches, this patch is harmless; if not, it unlocks UI.
      patchMatch(mid, { __scoreBusy: false });
    }
  }

  async function handleAdvance(mid, silent=false) {
    withGridScrollPreserved(() => {
      setMatches(prev => prev.map(m => m.id === mid ? { ...m, __advBusy: true } : m));
    });
    try {
      const res = await advanceMatch(tid, mid);
      const fresh = await listMatches(tid);
      withGridScrollPreserved(() => setMatches(fresh));

      if (!silent) alert("Advanced.");
    } catch (e) {
      alert("Advance failed: " + e.message);
      withGridScrollPreserved(() => {
        setMatches(prev => prev.map(m => m.id === mid ? { ...m, __advBusy: false } : m));
      });
    }
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
            <div className="mx-name" style={mxName}>{escapeHtml(A.name || "—")}</div>
          </div>
          <ScoreBox m={m} slot="A" scoreWin={wins.aScoreWin} scoreEnabled={ui.scoreEnabled} />
        </div>

        {/* Slot B */}
        <div className="mx-slot" data-slot="B" style={isGrandFinal ? mxSlotGrandFinal : mxSlot}>
          <div className="mx-left" style={mxLeft}>
            <div className="mx-seed" style={mxSeed}>{bSeed}</div>
            <div className="mx-name" style={mxName}>{escapeHtml(B.name || "—")}</div>
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
            {m.__advBusy ? "Advancing…" : (m.status === "completed" ? "Advanced" : "Advance")}
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
      <div className="section" style={{ marginBottom:18 }}>
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





  return (
    <div className="active-panel" style={panel}>
      {loading ? (
        <div className="k">Loading…</div>
      ) : (
        <div className="active-inner" style={inner}>
          {/* Left rail */}
          <div className="left-rail" style={leftRail}>
            <div className="tabs-vertical" style={{ display:'grid', gap:8 }}>
              <button className="tab active" style={tabActive}>Tournament</button>
              <button className="tab" style={tab}>Ranking (TBD)</button>
            </div>

            <label className="toggle" style={{ display:'inline-flex', gap:8, alignItems:'center', fontSize:12, color:'var(--muted)'}}>
              <span>Race to: <strong>{raceTo || "—"}</strong></span>
              <span>Auto-advance</span>
              <input type="checkbox" checked={autoAdvance} onChange={e=>setAutoAdvance(e.target.checked)} />
            </label>
          </div>

          {/* Right pane */}
          <div className="right-pane" style={rightPane}>
            <div className="pane-head" style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
              <div className="pane-title" style={{ fontSize:14, fontWeight:700, color:'#cfd6e3' }}>Tournament</div>
            </div>

            <div id={`activeGrid_${tid}`} className="grid-shell" style={gridShell}>
              <Section title="Winners Bracket">
              {grid.winners.length ? (
                <div style={{ display: 'flex', gap: 18, alignItems: 'stretch', paddingBottom: 4 }}>
                  {(() => {
                    return (
                      <>
                        <BracketFlex rounds={grid.winners} prefix="W" justify="space-around" />
                        {grid.finals.length > 0 && (
                          <FinalsRail finals={grid.finals} justify="space-around" />
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="empty" style={{ fontSize:12, color:'var(--muted)' }}>No matches.</div>
              )}
              </Section>


              {/* Losers Bracket */}
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
          </div>
        </div>
      )}
    </div>
  );
}


/* ---------------- inline styles (kept minimal & consistent with your theme) ---------------- */
const panel     = { border:'1px solid var(--ring)', background:'#191d24', borderRadius:12, padding:12, marginTop:10, marginBottom:12 };
const inner     = {
  display:'grid',
  gridTemplateColumns:'260px 1fr',
  gap:12,
  alignItems:'start',
  /* make the grid itself not spill */
  overflow:'hidden'
};
const leftRail  = { border:'1px solid var(--ring)', borderRadius:10, background:'#151a20', padding:12, display:'grid', gap:12, alignContent:'start' };
const rightPane = {
  border:'1px solid var(--ring)',
  borderRadius:10,
  background:'#0f141a',
  padding:12,
  minHeight:340,
  /* THE IMPORTANT BITS */
  minWidth: 0,          // allow the 1fr column to shrink
  overflow: 'hidden'    // anything wider gets contained here
};
const tab       = { width:'100%', textAlign:'left', appearance:'none', border:'1px solid var(--ring)', background:'#0f141a', color:'var(--ink)', padding:'10px 12px', borderRadius:10, cursor:'pointer', fontSize:13 };
const tabActive = { ...tab, outline:'2px solid var(--focus)', outlineOffset:1, background:'#132032' };

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
const winnerSlot = { /* highlight only the score box per your theme; subtle row tint is fine */
  background:'#3a3f48'
};
const mxActions = { display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, padding:6, background:'#1b2027', borderTop:'1px solid var(--ring)' };
const btnSm     = { padding:'6px 10px', borderRadius:8, fontSize:12, border:'1px solid var(--ring)', background:'#0f1a28', color:'var(--ink)', cursor:'pointer' };
