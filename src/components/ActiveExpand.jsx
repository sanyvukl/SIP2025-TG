import React, { useEffect, useMemo, useState } from "react";
import {
  listPlayers,
  listMatches,          // add this in your ../api/tournaments
  saveMatchScore,       // add this in your ../api/tournaments
  advanceMatch          // add this in your ../api/tournaments
} from "../api/tournaments";

// helpers
const cssEscape = (s) => String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
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

  async function updateScores(mid, a, b) {
    a = clamp(a); b = clamp(b);
    // optimistic UI
    setMatches(prev => prev.map(m => m.id === mid ? { ...m, slot_a_score: a, slot_b_score: b } : m));
    try {
      await saveMatchScore(tid, mid, a, b);
      if (autoAdvance && oneSideWon(a, b)) {
        await handleAdvance(mid, /*silent*/true);
      }
    } catch (e) {
      alert("Save failed: " + e.message);
    }
  }

  async function handleAdvance(mid, silent=false) {
    // optimistic: disable button via local flag
    setMatches(prev => prev.map(m => m.id === mid ? { ...m, __advBusy: true } : m));
    try {
      await advanceMatch(tid, mid);
      const fresh = await listMatches(tid);
      setMatches(fresh);
      if (!silent) alert("Advanced.");
    } catch (e) {
      alert("Advance failed: " + e.message);
      setMatches(prev => prev.map(m => m.id === mid ? { ...m, __advBusy: false } : m));
    }
  }

  function ScoreBox({ m, slot }) {
    const disabled = m.status === "completed";
    const val = clamp(slot === "A" ? m.slot_a_score : m.slot_b_score);
    const canInc = raceTo > 0 ? val < raceTo : true;
    const canDec = val > 0;

    const bump = (delta) => {
      const a0 = clamp(m.slot_a_score);
      const b0 = clamp(m.slot_b_score);
      if (slot === "A") updateScores(m.id, clamp(a0 + delta), b0);
      else updateScores(m.id, a0, clamp(b0 + delta));
    };

    const onChange = (e) => {
      const v = clamp(e.target.value);
      if (slot === "A") updateScores(m.id, v, clamp(m.slot_b_score));
      else updateScores(m.id, clamp(m.slot_a_score), v);
    };

    return (
      <div style={{ display:'flex', alignItems:'stretch' }}>
        <button
          className="mx-bump"
          onClick={()=>bump(-1)}
          disabled={disabled || !canDec}
          style={bumpStyle(disabled || !canDec)}
        >−</button>
        <input
          className="mx-score"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          {...(raceTo > 0 ? { max: raceTo } : {})}
          value={val}
          disabled={disabled}
          onChange={onChange}
          style={scoreInputStyle(disabled)}
        />
        <button
          className="mx-bump"
          onClick={()=>bump(1)}
          disabled={disabled || !canInc}
          style={bumpStyle(disabled || !canInc)}
        >+</button>
      </div>
    );
  }

  function MatchCard({ m }) {
    const A = playersById[m.slot_a_player_id] || {};
    const B = playersById[m.slot_b_player_id] || {};
    const aSeed = A.seed ?? "-";
    const bSeed = B.seed ?? "-";

    const a = clamp(m.slot_a_score);
    const b = clamp(m.slot_b_score);
    const aWins = raceTo > 0 && a === raceTo && b < raceTo;
    const bWins = raceTo > 0 && b === raceTo && a < raceTo;

    const advDisabled = m.status === "completed" || !(aWins ^ bWins) || m.__advBusy;

    return (
      <div className="mx-card" data-mid={m.id} style={mxCard}>
        {/* Slot A */}
        <div className="mx-slot" data-slot="A" style={{...mxSlot, ...(aWins ? winnerSlot : null)}}>
          <div className="mx-left" style={mxLeft}>
            <div className="mx-seed" style={mxSeed}>{aSeed}</div>
            <div className="mx-name" style={mxName}>{escapeHtml(A.name || "—")}</div>
          </div>
          <ScoreBox m={m} slot="A" />
        </div>

        {/* Slot B */}
        <div className="mx-slot" data-slot="B" style={{...mxSlot, ...(bWins ? winnerSlot : null)}}>
          <div className="mx-left" style={mxLeft}>
            <div className="mx-seed" style={mxSeed}>{bSeed}</div>
            <div className="mx-name" style={mxName}>{escapeHtml(B.name || "—")}</div>
          </div>
          <ScoreBox m={m} slot="B" />
        </div>

        <div className="mx-actions" style={mxActions}>
          <button
            className="btn sm"
            onClick={()=>handleAdvance(m.id)}
            disabled={advDisabled}
            style={{
              ...btnSm,
              ...(advDisabled ? { opacity:.55, cursor:'not-allowed' } : null)
            }}
          >
            {m.__advBusy ? "Advancing…" : (m.status === "completed" ? "Advanced" : "Advance")}
          </button>
          <span className={`badge ${m.status}`} style={{
            fontSize:10, padding:'3px 6px', border:'1px solid var(--ring)', borderRadius:6, color:'#cfd6e3',
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

  function RoundCol({ title, list }) {
    return (
      <div className="round-col" style={{ width:240, flex:'0 0 auto' }}>
        <div className="round-head" style={roundHead}>
          {title}
        </div>
        {list.map(m => <MatchCard key={m.id} m={m} />)}
      </div>
    );
  }

  function Section({ title, children }) {
    return (
      <div className="section" style={{ marginBottom:18 }}>
        <div className="section-head" style={sectionHead}>{title}</div>
        <div className="track" style={track}>{children}</div>
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

            <div className="grid-shell" style={gridShell}>
              {/* Winners */}
              <Section title="Winners Bracket">
                {grid.winners.length ? (
                  grid.winners.map((col, i) =>
                    <RoundCol key={`W-${i}`} title={`W · R${col.title}`} list={col.matches} />
                  )
                ) : <div className="empty" style={{ fontSize:12, color:'var(--muted)' }}>No matches.</div>}
              </Section>

              {/* Losers (only if double) */}
              {String(tournament.format).toLowerCase() === "double" && (
                <Section title="Losers Bracket">
                  {grid.losers.length ? (
                    grid.losers.map((col, i) =>
                      <RoundCol key={`L-${i}`} title={`L · R${col.title}`} list={col.matches} />
                    )
                  ) : <div className="empty" style={{ fontSize:12, color:'var(--muted)' }}>No matches.</div>}
                </Section>
              )}

              {/* Finals */}
              {grid.finals.length > 0 && (
                <Section title="Finals">
                  <RoundCol title="Grand Final" list={grid.finals} />
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
const track = {
  /* inline-flex avoids parent width = max-content */
  display:'inline-flex',
  gap:18,
  alignItems:'flex-start',
  /* no min/max-content forcing; it can be wider than shell and will scroll */
  padding:'6px 2px'
};
const roundHead = { fontSize:12, color:'#9aa3b2', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 8px 0', textAlign:'center' };
const sectionHead = { display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#cfd6e3', textTransform:'uppercase', letterSpacing:'.04em', margin:'0 0 10px 0' };

const mxCard    = { width:220, border:'1px solid var(--ring)', borderRadius:4, overflow:'hidden', display:'grid', gridTemplateRows:'28px 28px auto', background:'#22262d', marginBottom:16 };
const mxSlot    = { display:'flex', alignItems:'stretch', justifyContent:'space-between', background:'#3a3f48', fontSize:13, lineHeight:1, borderTop:'1px solid var(--ring)' };
const mxLeft    = { display:'flex', alignItems:'center', flex:1, minWidth:0, height:'100%' };
const mxSeed    = { background:'#4a4f58', color:'#cfd6e3', fontSize:11, fontWeight:600, minWidth:24, padding:'0 4px', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', height:'100%', borderRight:'1px solid var(--ring)' };
const mxName    = { flex:1, height:'100%', display:'flex', alignItems:'center', padding:'0 8px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' };
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
