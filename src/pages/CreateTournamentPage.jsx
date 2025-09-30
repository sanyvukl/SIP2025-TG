import React, { useMemo, useState } from "react";
import { createTournament, createPlayers } from "../api/tournaments";
import { useNavigate } from "react-router-dom";
import PoolOrbitLoaderModal from "../components/PoolOrbitLoaderModal";
import path from "../utils/paths";

function SummaryCard({ name, format, raceTo, playerCount }) {
  const fmtLabel =
    format === "double" ? "Double Elimination"
    : format === "single" ? "Single Elimination"
    : "—";

  return (
    <div className="card">
      <h2>Summary</h2>
      <div className="summary" id="summary">
        <div className="kv"><span className="k">Tournament</span><span className="v" id="sName">{name || "—"}</span></div>
        <div className="kv"><span className="k">Format</span><span className="v" id="sFormat">{fmtLabel}</span></div>
        <div className="kv"><span className="k">Race To</span><span className="v" id="sRace">{raceTo || "—"}</span></div>
        <div className="kv"><span className="k">Player Count</span><span className="v" id="sPlayers">{playerCount || "—"}</span></div>
        <div className="help">Seeding = listed order. Matches created on another page.</div>
      </div>
    </div>
  );
}

function sanitizeNames(raw) {
  return (raw || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

export default function CreateTournamentPage() {
  // form state
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [format, setFormat] = useState("single");
  const [start, setStart] = useState("");           // datetime-local value
  const [raceTo, setRaceTo] = useState("");
  const [playersRaw, setPlayersRaw] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  // derived
  const players = useMemo(() => sanitizeNames(playersRaw), [playersRaw]);
  const playerCount = players.length;

  function onReset() {
    setName("");
    setFormat("single");
    setStart("");
    setRaceTo("");
    setPlayersRaw("");
    setErr("");
  }

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    const raceNum = parseInt(raceTo, 10);
    if (!name.trim()) return setErr("Tournament Name required.");
    if (!format) return setErr("Format required.");
    if (!Number.isFinite(raceNum) || raceNum < 1) return setErr("Race To must be ≥1.");
    if (playerCount < 2) return setErr("At least 2 players required.");
    if (!start) return setErr("Start Date & Time required.");

    // build player objects like your script
    const nowISO = new Date().toISOString();
    const playersPayload = players.map((n, i) => ({
      id: `p${i + 1}`,
      tournament_id: null,
      name: n,
      seed: i + 1,
      wins: 0,
      losses: 0,
      rank: null,
      eliminated: false,
      created_at: nowISO,
    }));

    setSubmitting(true);
    try {
      const tournament_id = await createTournament({
        name: name.trim(),
        format,
        player_count: playerCount,
        race_to: raceNum,
        start_time: start,
      });

      await createPlayers(tournament_id, playersPayload);

      console.log(`Tournament created!\nID: ${tournament_id}\nPlayers saved: ${playerCount}`);
      
      onReset();
      await navigate(path.PENDING_TOURNAMENTS);
    } catch (e2) {
      console.error(e2);
      setErr(e2.message || "Failed to create tournament");
      console.log("Failed: " + (e2.message || "Unknown error"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="shell">
      <div className="header">
        <div className="title">Create Tournament</div>
        <div className="help">
          Creates only <strong>Tournament</strong> and <strong>Player</strong> records. No matches here.
        </div>
      </div>

      <div className="grid">
        {/* Left: Form */}
        <div className="card">
          <h2>Bracket Parameters</h2>
          <div id="err" className="error" style={{ display: err ? "block" : "none" }}>{err}</div>

          <form className="form" onSubmit={onSubmit} onReset={onReset} {...(submitting ? { inert: "" } : {})}>
            {/* Name */}
            <div className="field">
              <label htmlFor="tName" className="label">Tournament Name <span className="req">*</span></label>
              <input
                id="tName"
                className="control"
                type="text"
                placeholder="e.g., Summer Open"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>

            {/* Format */}
            <div className="field">
              <label htmlFor="tFormat" className="label">Format <span className="req">*</span></label>
              <select
                id="tFormat"
                className="control"
                value={format}
                onChange={e => setFormat(e.target.value)}
                required
              >
                <option value="single">Single Elimination</option>
                <option value="double">Double Elimination</option>
              </select>
            </div>

            {/* Start datetime */}
            <div className="field">
              <label htmlFor="tStart" className="label">Start Date & Time <span className="req">*</span></label>
              <input
                id="tStart"
                className="control"
                type="datetime-local"
                value={start}
                onChange={e => setStart(e.target.value)}
                required
              />
            </div>

            {/* Race To */}
            <div className="field">
              <label htmlFor="tRace" className="label">Race To <span className="req">*</span></label>
              <input
                id="tRace"
                className="control"
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="e.g., 5"
                value={raceTo}
                onChange={e => setRaceTo(e.target.value)}
                required
              />
            </div>

            {/* Players */}
            <div className="field">
              <label htmlFor="tList" className="label">Players (one per line) <span className="req">*</span></label>
              <textarea
                id="tList"
                className="control"
                rows={10}
                placeholder={`Player 1
Player 2
Player 3
Player 4`}
                value={playersRaw}
                onChange={e => setPlayersRaw(e.target.value)}
                required
              />
              <div className="help">Player Count will be calculated automatically.</div>
            </div>

            <div className="actions">
              <button type="reset" className="btn" disabled={submitting}>Reset</button>
              <button type="submit" id="submitBtn" className="btn" disabled={submitting}>
                {submitting ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>

        {/* Right: Summary */}
        <SummaryCard
          name={name}
          format={format}
          raceTo={raceTo}
          playerCount={playerCount}
        />
      </div>

      {/* Show the full-screen loader while submitting */}
      <PoolOrbitLoaderModal
        open={submitting}
        message="Creating tournament…"
        size={180}            // tweak size if you like
        backdrop="rgba(0,0,0,.55)" // slightly darker
        // onBackdropClick={() => {}} // leave undefined so users can’t dismiss
      />
    </div>
  );
}
