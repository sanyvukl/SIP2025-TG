// src/components/PastExpand.jsx
import React, { useEffect, useMemo, useState } from "react";
import { getRanking, listPlayers, listMatches } from "../api/tournaments";
import PoolOrbitSolidsLoader from "./Loaders/PoolOrbitSolidsLoader";

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

export default function PastExpand({ tournament }) {
  const tid = tournament.id;
  const [playersById, setPlayersById] = useState({});
  const [matches, setMatches] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading…");
  const [activeTab, setActiveTab] = useState("bracket"); // "bracket" | "ranking" | "players"

  const raceTo = Number(tournament.race_to || 0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setLoadingMessage("Fetching completed tournament data…");
        const [players, ms, rk] = await Promise.all([
          listPlayers(tid),
          listMatches(tid),
          getRanking(tid),
        ]);
        if (!mounted) return;
        setPlayersById(Object.fromEntries(players.map((p) => [String(p.id), p])));
        setMatches(ms || []);
        setRanking(Array.isArray(rk) ? rk : (rk?.items || []));
      } catch (e) {
        console.log("PastExpand load failed:", e?.message || e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [tid]);

  function splitMatches(ms) {
    const W = {}, L = {}, G = [];
    (ms || []).forEach((m) => {
      const br = String(m.bracket || "W").toUpperCase();
      const key = String(m.round || 1);
      if (br === "G") G.push(m);
      else if (br.startsWith("L")) (L[key] ||= []).push(m);
      else (W[key] ||= []).push(m);
    });
    const byRound = (obj) =>
      Object.keys(obj)
        .sort((a, b) => Number(a) - Number(b))
        .map((r) => ({
          title: r,
          matches: (obj[r] || []).sort((a, b) =>
            String(a.id).localeCompare(String(b.id))
          ),
        }));
    return {
      winners: byRound(W),
      losers: byRound(L),
      finals: G.sort((a, b) => String(a.id).localeCompare(String(b.id))),
    };
  }

  const grid = useMemo(() => splitMatches(matches), [matches]);

  // add near other useMemos
  const framesIndex = useMemo(() => {
    const acc = {};
    (matches || []).forEach((m) => {
      if (!m) return;

      // read scores conservatively (strings -> numbers); skip if not numeric
      const aId = m.slot_a_player_id;
      const bId = m.slot_b_player_id;
      const a = Number(m.slot_a_score ?? m.a_score ?? m.score_a ?? m.a ?? NaN);
      const b = Number(m.slot_b_score ?? m.b_score ?? m.score_b ?? m.b ?? NaN);

      if (!aId || !bId) return;               // BYE or missing player
      if (!Number.isFinite(a) || !Number.isFinite(b)) return; // no scores yet

      // only count completed matches (safer for past tournaments)
      const done = String(m.status || "").toLowerCase() === "completed";
      if (!done) return;

      (acc[aId] ||= { fw: 0, fl: 0 }); acc[aId].fw += a; acc[aId].fl += b;
      (acc[bId] ||= { fw: 0, fl: 0 }); acc[bId].fw += b; acc[bId].fl += a;
    });
    return acc;
  }, [matches]);


  function computeWinsFinal(m) {
    // Ensure we show final scores and highlight the actual winner
    const a = Number(m.slot_a_score || 0);
    const b = Number(m.slot_b_score || 0);
    const finalA = m.status === "completed" && m.winner_id && m.winner_id === m.slot_a_player_id;
    const finalB = m.status === "completed" && m.winner_id && m.winner_id === m.slot_b_player_id;
    return { a, b, finalA, finalB };
  }

  function Section({ title, children }) {
    return (
      <div className="section" style={{ marginBottom: 18 }}>
        <div className="section-head" style={sectionHead}>{title}</div>
        <div className="section-body">{children}</div>
      </div>
    );
  }

  function BracketHeaderCell({ children }) {
    const COL_W = 240;
    return (
      <div
        className="bracket-head-cell"
        style={{ minWidth: COL_W, flex: "0 0 auto", textAlign: "center" }}
      >
        <div style={{ background: "#11161d", paddingTop: 2, paddingBottom: 6 }}>
          <div style={roundHead}>{children}</div>
        </div>
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

  function MatchCardPast({ m, isGrandFinal = false }) {
    const A = playersById[m.slot_a_player_id] || {};
    const B = playersById[m.slot_b_player_id] || {};
    const aSeed = A.seed ?? "-";
    const bSeed = B.seed ?? "-";

    const wins = computeWinsFinal(m);

    return (
      <div className="mx-card past" data-mid={m.id} style={isGrandFinal ? mxCardGrandFinal : mxCard}>
        {/* Slot A */}
        <div className="mx-slot" data-slot="A" style={isGrandFinal ? mxSlotGrandFinal : mxSlot}>
          <div className="mx-left" style={mxLeft}>
            <div className="mx-seed" style={mxSeed}>{aSeed}</div>
            <div className="mx-name" style={mxName}><span style={mxNameSpan} className="mx-name-span-sp">{formatName(escapeHtml(A.name || "—"))}</span></div>
          </div>
          <div
            className="mx-score"
            style={{
              ...scoreReadStyle,
              ...(wins.finalA ? { background: "var(--score-win,#35551a)", color: "var(--ink)" } : null),
            }}
            title={raceTo ? `Race to: ${raceTo}` : undefined}
          >
            {wins.a}
          </div>
        </div>

        {/* Slot B */}
        <div className="mx-slot" data-slot="B" style={isGrandFinal ? mxSlotGrandFinal : mxSlot}>
          <div className="mx-left" style={mxLeft}>
            <div className="mx-seed" style={mxSeed}>{bSeed}</div>
            <div className="mx-name" style={mxName}><span style={mxNameSpan} className="mx-name-span-sp">{formatName(escapeHtml(B.name || "—"))}</span></div>
          </div>
          <div
            className="mx-score"
            style={{
              ...scoreReadStyle,
              ...(wins.finalB ? { background: "var(--score-win,#35551a)", color: "var(--ink)" } : null),
            }}
            title={raceTo ? `Race to ${raceTo}` : undefined}
          >
            {wins.b}
          </div>
        </div>

     
      </div>
    );
  }

  function BracketFlex({ rounds, prefix = "W", justify = "space-around" }) {
    const COL_W = 240;
    const MATCH_MARGIN_PX = 16;

    function HeaderRow() {
      return (
        <div
          className={`${prefix}-head-row`}
          style={{
            display: "flex",
            gap: 18,
            alignItems: "baseline",
            zIndex: 1,
            background: "#11161d",
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

    function BodyRow() {
      return (
        <div
          className={`${prefix}-body-row`}
          style={{
            display: "flex",
            height: "100%",
            gap: 18,
            alignItems: "center",
            paddingBottom: 4,
          }}
        >
          {rounds.map((col, i) => (
            <div
              key={`${prefix}-col-${i}`}
              style={{
                display: "flex",
                height: "100%",
                flexDirection: "column",
                width: COL_W,
                flex: "0 0 auto",
              }}
            >
              <div
                className={`${prefix}-lane`}
                style={{
                  display: "flex",
                  height: "100%",
                  flexDirection: "column",
                  justifyContent: justify,
                  gap: justify === "space-between" ? 0 : MATCH_MARGIN_PX,
                }}
              >
                {col.matches.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      willChange: "transform",
                      transition: "transform .12s ease, box-shadow .12s ease",
                    }}
                  >
                    <MatchCardPast m={m} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className={`${prefix}-flex`} style={{ display: "grid" }}>
        <HeaderRow />
        <BodyRow />
      </div>
    );
  }

  function FinalsRail({ finals, justify = "space-around" }) {
    if (!finals?.length) return null;
    const COL_W = 240;
    const MATCH_MARGIN_PX = 16;

    return (
      <div className="finals-rail" style={{ display: "flex", flexDirection: "column" }}>
        <BracketHeaderCell>Grand Final</BracketHeaderCell>
        <div
          className="finals-lane"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: justify,
            alignItems: "center",
            gap: justify === "space-between" ? 0 : MATCH_MARGIN_PX,
            height: "100%",
            paddingBottom: 4,
          }}
        >
          {finals.map((m) => (
            <div key={m.id} style={{ width: COL_W }}>
              <MatchCardPast m={m} isGrandFinal />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Ranking helpers (robust to slightly different API shapes)
// --- replace your rankRowData with this ---
function rankRowData(r, idx, playersById, framesIndex) {
  const id = r.player_id ?? r.id ?? r.pid;
  const player = playersById[id] || {};
  const name = r.player_name || r.name || player.name || "—";
  const seed = r.seed ?? player.seed ?? "–";

  const wins   = Number(r.wins ?? r.win ?? r.w ?? r.W ?? 0);
  const losses = Number(r.losses ?? r.loss ?? r.l ?? r.L ?? 0);
  const gp = wins + losses;
  const winPct = gp > 0 ? (wins / gp) * 100 : null;

  // Try API frames, else compute from matches
  let fw = Number(r.frames_won ?? r.framesWon ?? r.fw ?? r.FW ?? r.frames_w ?? r.framesW ?? NaN);
  let fl = Number(r.frames_lost ?? r.framesLost ?? r.fl ?? r.FL ?? r.frames_l ?? r.framesL ?? NaN);
  const apiFramesValid = Number.isFinite(fw) && Number.isFinite(fl) && (fw + fl) >= 0;

  if (!apiFramesValid) {
    const fromIdx = framesIndex[id];
    fw = fromIdx?.fw ?? 0;
    fl = fromIdx?.fl ?? 0;
  }

  const frames = (Number.isFinite(fw) && Number.isFinite(fl)) ? (fw + fl) : null;
  const diff = (Number.isFinite(fw) && Number.isFinite(fl)) ? (fw - fl) : null;

  const rank = r.rank ?? r.place ?? r.position ?? r.pos ?? (idx + 1);

  return { id, name, seed, rank, wins, losses, winPct, fw, fl, frames, diff };
}

const fmtPct = (v) => v == null ? "—" : `${(Math.round(v * 10) / 10).toFixed(1)}%`;
const fmtNum = (v) => (v == null || Number.isNaN(v)) ? "—" : String(v);
// <1:0>
const fmtFrames = (fw, fl) =>
  (Number.isFinite(fw) && Number.isFinite(fl)) ? `${fw}:${fl}` : "—";

// <+1>, 0, <-1>
const fmtDiff = (v) =>
  (v == null || Number.isNaN(v)) ? "—" : (v > 0 ? `+${v}` : v < 0 ? `${v}` : "0");

  return (
    <div className="past-panel" style={panel}>
      {loading ? (
        <div className="k" style={{ height: "360px", position: "relative" }}>
          <PoolOrbitSolidsLoader
            open={loading}
            message={loadingMessage}
            size={160}
            position="absolute"
            lockScroll={false}
            backdrop="rgba(0,0,0,.2)"
          />
        </div>
      ) : (
        <div className="past-inner" style={inner}>
          {/* Top tabs (requested) */}
          <div style={tabsBar}>

              <button
                className={`tab ${activeTab === "bracket" ? "active" : ""}`}
                style={activeTab === "bracket" ? tabActiveTop : tabTop}
                onClick={() => setActiveTab("bracket")}
              >
                Bracket
              </button>
              <button
                className={`tab ${activeTab === "ranking" ? "active" : ""}`}
                style={activeTab === "ranking" ? tabActiveTop : tabTop}
                onClick={() => setActiveTab("ranking")}
              >
                Ranking
              </button>
              <button
                className={`tab ${activeTab === "players" ? "active" : ""}`}
                style={activeTab === "players" ? tabActiveTop : tabTop}
                onClick={() => setActiveTab("players")}
              >
                Players
              </button>

              <div style={{ ...tabTop, marginLeft: "auto", fontSize: 12, color: "#9aa3b2" }}>
                {raceTo ? <span>Race to <strong style={{ color: "#cfd6e3" }}>{raceTo}</strong></span> : null}
              </div>
              <div style={{ ...tabTop, fontSize: 12, color: "#9aa3b2" }}>
                Status:&nbsp; <strong style={{ color: "#cfd6e3" }}>
                  {String(tournament.status == "completed" ? "Completed": tournament.status)}
                </strong>
              </div>
          </div>

          <div id={`pastGrid_${tid}`} className="grid-shell" style={gridShell}>
            {activeTab === "bracket" ? (
              <div>
                <Section title="Winners Bracket">
                  {grid.winners.length ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 18,
                        alignItems: "stretch",
                        paddingBottom: 4,
                      }}
                    >
                      <>
                        <BracketFlex rounds={grid.winners} prefix="W" justify="space-around" />
                        {grid.finals.length > 0 && (
                          <FinalsRail finals={grid.finals} justify="space-around" />
                        )}
                      </>
                    </div>
                  ) : (
                    <div className="empty" style={{ fontSize: 12, color: "var(--muted)" }}>
                      No matches.
                    </div>
                  )}
                </Section>

                {String(tournament.format).toLowerCase() === "double" && (
                  <Section title="Losers Bracket">
                    {grid.losers.length ? (
                      <BracketFlex rounds={grid.losers} prefix="L" justify="space-around" />
                    ) : (
                      <div className="empty" style={{ fontSize: 12, color: "var(--muted)" }}>
                        No matches.
                      </div>
                    )}
                  </Section>
                )}
              </div>
            ) : activeTab === "ranking" ? (
              <div>
<Section title="Standings">
  {ranking?.length ? (
    <div style={{ overflowX: "auto" }}>
      <table style={rkTable}>
        <thead>
          <tr>
            <th style={rkTh}>#</th>
            <th style={rkTh}>Player</th>
            <th style={rkTh}>Seed</th>
            <th style={rkTh}>W</th>
            <th style={rkTh}>L</th>
            <th style={rkTh}>Win %</th>
            <th style={rkTh}>Frames</th>
            <th style={rkTh}>Diff</th>
          </tr>
        </thead>
        <tbody>
          {ranking.map((r, i) => {
            const row = rankRowData(r, i, playersById, framesIndex);
            return (
              <tr key={row.id || `rk-${i}`} style={rkTr}>
                <td style={rkTd}>{fmtNum(row.rank)}</td>
                <td style={rkTd}>{escapeHtml(row.name)}</td>
                <td style={rkTd}>{fmtNum(row.seed)}</td>
                <td style={rkTd}>{fmtNum(row.wins)}</td>
                <td style={rkTd}>{fmtNum(row.losses)}</td>
                <td style={rkTd}>{fmtPct(row.winPct)}</td>
                <td style={rkTd}>{fmtFrames(row.fw, row.fl)}</td>  {/* <1:0> */}
                <td style={rkTd}>{fmtDiff(row.diff)}</td>          {/* <+1>, 0, -1 */}
              </tr>
            );
          })} 
        </tbody>
      </table>
    </div>
  ) : (
    <div className="empty" style={{ fontSize: 12, color: "var(--muted)" }}>
      No ranking data.
    </div>
  )}
</Section>
              </div>
            ) : (
              <div>
                <Section title="Players">
                  {Object.keys(playersById).length ? (
                    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                      {Object.values(playersById)
                        .sort((a, b) => (a.seed ?? 9999) - (b.seed ?? 9999) || String(a.name).localeCompare(String(b.name)))
                        .map((p) => (
                          <li key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={playerSeed}>{p.seed ?? "–"}</span>
                            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {escapeHtml(p.name || "—")}
                            </span>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <div className="empty" style={{ fontSize: 12, color: "var(--muted)" }}>
                      No players.
                    </div>
                  )}
                </Section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- styles to match your existing theme ---------------- */
const panel = {
  border: "1px solid var(--ring)",
  background: "#191d24",
  borderRadius: 12,
  padding: 12,
  marginTop: 10,
  marginBottom: 12,
};

const inner = {
  display: "grid",
  gridTemplateRows: "auto 1fr",
  gap: 10,
  overflow: "hidden",
};

const tabsBar = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  border: "1px solid var(--ring)",
  background: "#0f141a",
  borderRadius: 10,
  padding: 8,
};

const tabTop = {
  width: "max-content",
  appearance: "none",
  border: "1px solid var(--ring)",
  background: "#0f141a",
  color: "var(--ink)",
  padding: "8px 16px",
  borderRadius: 8,
  cursor: "pointer",
  fontSize: 13,
};
const tabActiveTop = { ...tabTop, outline: "2px solid var(--focus)", outlineOffset: 1, background: "#132032" };

const gridShell = {
  border: "1px solid var(--ring)",
  borderRadius: 8,
  background: "#11161d",
  padding: 14,
  height: "100%",
  width: "100%",
  maxWidth: "100%",
  overflow: "auto",
  WebkitOverflowScrolling: "touch",
  boxSizing: "border-box",
};

const roundHead = {
  fontSize: 12,
  color: "#9aa3b2",
  textTransform: "uppercase",
  letterSpacing: ".04em",
  margin: "0 0 8px 0",
  textAlign: "center",
};
const sectionHead = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 12,
  color: "#cfd6e3",
  textTransform: "uppercase",
  letterSpacing: ".04em",
  margin: "0 0 10px 0",
};

const mxCard = {
  width: 220,
  border: "1px solid var(--ring)",
  borderRadius: 4,
  overflow: "hidden",
  display: "grid",
  gridTemplateRows: "28px 28px auto",
  background: "#22262d",
};

const mxSlot = { display: "flex", alignItems: "stretch", justifyContent: "space-between", background: "#3a3f48", fontSize: 13, lineHeight: 1 };

const mxLeft = { display: "flex", alignItems: "center", minWidth: 0, height: "100%" };
const mxSeed = {
  background: "#4a4f58",
  color: "#cfd6e3",
  fontSize: 11,
  fontWeight: 600,
  boxSizing: "border-box",
  flex: "0 0 24px",   // ← fixed column: grow 0, shrink 0, basis 24px
  width: 24,
  minWidth: 24,
  maxWidth: 24,
  padding: "0 4px",
  textAlign: "center",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "100%",
  borderRight: "1px solid var(--ring)",
};
const mxName = { flex: 1, height: "100%", display: "flex", alignItems: "center", padding: "0 8px", };
const mxNameSpan = {
  maxWidth: "138px", 
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis", 
}
const mxCardGrandFinal = {
  ...mxCard,
  background: "linear-gradient(180deg, #3a2a10 0%, #1f1608 100%)",
  border: "1px solid #facc15",
  boxShadow: "0 0 14px rgba(250, 204, 21, 0.6)",
};
const mxSlotGrandFinal = { ...mxSlot, color: "#fff7e0" };

const scoreReadStyle = {
  height: "100%",
  width: 31,
  margin: 0,
  padding: 0,
  border: "none",
  borderLeft: "1px solid var(--ring)",
  textAlign: "center",
  fontWeight: 800,
  fontSize: 12,
  background: "#2d3139",
  color: "#bfc6d1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const mxActions = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: 6,
  background: "#1b2027",
  borderTop: "1px solid var(--ring)",
};

const rkTable = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  background: "#182029",
  border: "1px solid var(--ring)",
  borderRadius: 8,
  overflow: "hidden",
};
const rkTh = {
  textAlign: "left",
  fontSize: 12,
  color: "#9aa3b2",
  textTransform: "uppercase",
  letterSpacing: ".04em",
  padding: "10px 12px",
  background: "#121922",
  borderBottom: "1px solid var(--ring)",
};
const rkTd = { padding: "10px 12px", borderBottom: "1px solid #2a3140", fontSize: 13, color: "#cfd6e3" };
const rkTr = {};

const playerSeed = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 24,
  height: 24,
  borderRadius: 6,
  border: "1px solid var(--ring)",
  background: "#242a33",
  color: "#cfd6e3",
  fontSize: 12,
  fontWeight: 700,
};
