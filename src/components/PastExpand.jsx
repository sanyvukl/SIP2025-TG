import React, { useEffect, useMemo, useState } from "react";
import { getRanking, listPlayers, listMatches } from "../api/tournaments"; 

export default function PastExpand({ tournament }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [standings, setStandings] = useState([]);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const [s, p, m] = await Promise.all([
          getRanking(tournament.id).catch(() => []),
          listPlayers(tournament.id).catch(() => []),
          listMatches(tournament.id).catch(() => []),
        ]);
        if (!alive) return;
        setStandings(Array.isArray(s) ? s : []);
        setPlayers(Array.isArray(p) ? p : []);
        setMatches(Array.isArray(m) ? m : []);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load past tournament data.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tournament.id]);

  // Helpers
  const byes = useMemo(() => players.filter(p => /bye/i.test(p?.name || "")).length, [players]);

  // Try to detect final/semi from matches.
  // Heuristics:
  // 1) Prefer m.is_final if present.
  // 2) Else prefer round_label containing 'Final'.
  // 3) Else take match with the highest round_number in Winners bracket if such fields exist.
  const finalMatch = useMemo(() => {
    if (!matches.length) return null;
    const withFlag = matches.find(m => m?.is_final);
    if (withFlag) return withFlag;

    const finalsByLabel = matches.filter(m =>
      (m?.round_label && /final/i.test(m.round_label)) ||
      (m?.name && /final/i.test(m.name))
    );
    if (finalsByLabel.length) {
      // Prefer "Grand Final" over "Final" if both exist
      const gf = finalsByLabel.find(m =>
        /grand\s*final/i.test(m.round_label || m.name || "")
      );
      return gf || finalsByLabel[0];
    }

    // Last resort: max round_number among Winners (or overall)
    const withRound = matches
      .filter(m => typeof m?.round_number === "number")
      .sort((a, b) => (b.round_number ?? 0) - (a.round_number ?? 0));
    return withRound[0] || matches[matches.length - 1];
  }, [matches]);

  const semiFinals = useMemo(() => {
    if (!matches.length) return [];
    // Grab matches that look like semifinals by label
    const semisByLabel = matches.filter(m =>
      (m?.round_label && /semi/i.test(m.round_label)) ||
      (m?.name && /semi/i.test(m.name))
    );
    if (semisByLabel.length) return semisByLabel;

    // If we have round numbers, semis are typically the round before the max
    const rounds = matches.map(m => m?.round_number).filter(n => typeof n === "number");
    if (rounds.length) {
      const max = Math.max(...rounds);
      return matches.filter(m => m?.round_number === max - 1);
    }
    return [];
  }, [matches]);

  const winner = standings?.[0];
  const runnerUp = standings?.[1];
  const podium3 = standings?.[2];

  const finishedAt = tournament?.end_time || null;
  const format = tournament?.format || tournament?.type || tournament?.rules || "Unknown";
  const entrants = tournament?.player_count ?? players.length;

  return (
    <div className="expand-panel" style={{ border:"1px solid var(--ring)", background:"#191d24", borderRadius:12, padding:12, marginBottom:12 }}>
      {loading ? (
        <div style={{ color:"var(--muted)" }}>Loading past tournament…</div>
      ) : err ? (
        <div style={{ color:"var(--err)" }}>Error: {err}</div>
      ) : (
        <div style={{ display:"grid", gap:12 }}>
          {/* Header Summary */}
          <div style={{ display:"grid", gap:8 }}>
            <div style={{ fontSize:16, fontWeight:700 }}>
              {tournament?.name || `Tournament #${tournament?.id}`}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:8 }}>
              <SummaryCard label="Winner" value={winner?.player_name || winner?.name || "—"} />
              <SummaryCard label="Runner-up" value={runnerUp?.player_name || runnerUp?.name || "—"} />
              <SummaryCard label="Entrants" value={String(entrants)} sub={byes ? `${byes} BYE(s)` : null} />
              <SummaryCard label="Format" value={String(format)} />
              <SummaryCard label="Finished" value={finishedAt ? formatDate(finishedAt) : "—"} />
            </div>
          </div>

          {/* Podium */}
          <div style={{ border:"1px solid var(--ring)", borderRadius:10, padding:12 }}>
            <div style={{ color:"var(--muted)", marginBottom:8, fontWeight:600 }}>Podium</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, alignItems:"stretch" }}>
              <PodiumCard place="1st" row={winner} highlight />
              <PodiumCard place="2nd" row={runnerUp} />
              <PodiumCard place="3rd" row={podium3} />
            </div>
          </div>

          {/* Top 8 */}
          {Array.isArray(standings) && standings.length > 0 && (
            <div style={{ border:"1px solid var(--ring)", borderRadius:10, padding:12 }}>
              <div style={{ color:"var(--muted)", marginBottom:8, fontWeight:600 }}>Top 8</div>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse" }}>
                  <thead>
                    <tr style={{ textAlign:"left", color:"var(--muted)", fontWeight:600 }}>
                      <th style={th}>#</th>
                      <th style={th}>Player</th>
                      <th style={th}>Wins</th>
                      <th style={th}>Losses</th>
                      <th style={th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.slice(0, 8).map((row, i) => (
                      <tr key={row.player_id ?? i} style={{ borderTop:"1px solid var(--ring)" }}>
                        <td style={td}>{row.rank ?? i + 1}</td>
                        <td style={td}>{row.player_name || row.name || `Player ${row.player_id ?? ""}`}</td>
                        <td style={td}>{valueOrDash(row.wins)}</td>
                        <td style={td}>{valueOrDash(row.losses)}</td>
                        <td style={td} title={row.note || ""}>{row.note || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Finals / Semis */}
          {(finalMatch || (semiFinals && semiFinals.length)) && (
            <div style={{ border:"1px solid var(--ring)", borderRadius:10, padding:12 }}>
              <div style={{ color:"var(--muted)", marginBottom:8, fontWeight:600 }}>Key Matches</div>

              {finalMatch && (
                <MatchRow title="Final" match={finalMatch} />
              )}

              {semiFinals?.length > 0 && (
                <>
                  <div style={{ color:"var(--muted)", margin:"8px 0 6px", fontWeight:600 }}>Semifinals</div>
                  <div style={{ display:"grid", gap:6 }}>
                    {semiFinals.map(m => (
                      <MatchRow key={m.id} match={m} compact />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Raw counts / debug footer */}
          <div style={{ color:"var(--muted)", fontSize:12 }}>
            ID: {tournament.id} • Players: {players.length} • Matches: {matches.length}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- UI bits ---------- */

const th = { padding:"8px 10px", fontSize:13, whiteSpace:"nowrap" };
const td = { padding:"8px 10px", fontSize:14, verticalAlign:"top" };

function SummaryCard({ label, value, sub }) {
  return (
    <div style={{
      border:"1px solid var(--ring)",
      background:"#12161c",
      borderRadius:10,
      padding:10,
      minHeight:64
    }}>
      <div style={{ color:"var(--muted)", fontSize:12, marginBottom:4 }}>{label}</div>
      <div style={{ fontWeight:700, fontSize:15 }}>{value ?? "—"}</div>
      {sub ? <div style={{ color:"var(--muted)", fontSize:12, marginTop:2 }}>{sub}</div> : null}
    </div>
  );
}

function PodiumCard({ place, row, highlight = false }) {
  const name = row?.player_name || row?.name || "—";
  const wl = (row?.wins != null || row?.losses != null) ? `${row?.wins ?? 0}-${row?.losses ?? 0}` : null;
  return (
    <div style={{
      border:`1px solid var(--ring)`,
      background: highlight ? "#0f141c" : "#12161c",
      borderRadius:10,
      padding:10
    }}>
      <div style={{ color:"var(--muted)", fontSize:12, marginBottom:6 }}>{place}</div>
      <div style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{name}</div>
      <div style={{ color:"var(--muted)", fontSize:12 }}>{wl || "—"}</div>
    </div>
  );
}

function MatchRow({ title, match, compact = false }) {
  const label = title || match?.round_label || match?.name || "Match";
  const a = prettySlot(match?.slot_a_name, match?.slot_a_seed);
  const b = prettySlot(match?.slot_b_name, match?.slot_b_seed);
  const sA = scoreStr(match?.slot_a_score);
  const sB = scoreStr(match?.slot_b_score);

  return (
    <div style={{
      border:"1px solid var(--ring)",
      background:"#12161c",
      borderRadius:10,
      padding:10
    }}>
      <div style={{ color:"var(--muted)", fontSize:12, marginBottom:6 }}>{label}</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr auto 1fr", gap:8, alignItems:"center" }}>
        <div style={{ textAlign:"right", fontWeight:600 }}>{a}</div>
        <div style={{ fontFamily:"ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight:700 }}>
          {sA} : {sB}
        </div>
        <div style={{ textAlign:"left", fontWeight:600 }}>{b}</div>
      </div>
      {!compact && match?.note ? (
        <div style={{ color:"var(--muted)", fontSize:12, marginTop:6 }}>{match.note}</div>
      ) : null}
    </div>
  );
}

/* ---------- tiny utils ---------- */

function valueOrDash(v) {
  return (v == null || Number.isNaN(v)) ? "—" : String(v);
}

function prettySlot(name, seed) {
  const base = name || "—";
  if (seed == null || seed === "" || Number.isNaN(seed)) return base;
  return `(${seed}) ${base}`;
}

function scoreStr(s) {
  if (s == null || Number.isNaN(s)) return "—";
  return String(s);
}

function formatDate(d) {
  try {
    const dt = new Date(d);
    if (isNaN(+dt)) return String(d);
    return dt.toLocaleString(undefined, {
      year:"numeric", month:"short", day:"2-digit",
      hour:"2-digit", minute:"2-digit"
    });
  } catch {
    return String(d);
  }
}
