// Minimal API client mirroring your FormData calls
const API_URL = 'https://script.google.com/macros/s/AKfycbwek1-cp47Xt4WJJMK4KOYCxGTmALlXdzNOXMgFDgeQRNcRThB6Z2HC7K4SGpJVUVN7VA/exec';

async function postFD(fd) {
  const res = await fetch(API_URL, { method: 'POST', body: fd });
  const raw = await res.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error('Bad JSON: ' + raw); }
  if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ===== Tournaments =====
export async function listTournaments({ status, page = 1, limit = 5 }) {
  const fd = new FormData();
  fd.append('action', 'listTournaments');
  fd.append('status', status);
  fd.append('limit', String(limit));
  fd.append('page', String(page));
  return postFD(fd); // { tournaments, meta }
}

export async function createFullBracket(tournament_id, opts = {}) {
  const fd = new FormData();
  fd.append('action', 'createFullBracket');
  fd.append('tournament_id', tournament_id);
  if (opts.pairs) fd.append('pairs', JSON.stringify(opts.pairs));  // <—
  return postFD(fd);
}


// ===== Players =====
export async function listPlayers(tournament_id) {
  const fd = new FormData();
  fd.append('action', 'listPlayers');
  fd.append('tournament_id', tournament_id);
  const data = await postFD(fd);
  return data.players || [];
}

export async function createPlayer(tournament_id, { name, seed }) {
  const fd = new FormData();
  fd.append('action', 'createPlayer');
  fd.append('tournament_id', tournament_id);
  fd.append('name', name);
  if (seed != null && seed !== '') fd.append('seed', String(seed));
  const data = await postFD(fd);
  return data.player;
}

export async function deletePlayer(player_id) {
  const fd = new FormData();
  fd.append('action', 'deletePlayer');
  fd.append('player_id', player_id);
  return postFD(fd);
}

// Keep server as source of truth for player_count
export async function updateTournamentPlayerCount(tournament_id) {
  const fd = new FormData();
  fd.append('action', 'updateTournamentPlayerCount');
  fd.append('tournament_id', tournament_id);
  const data = await postFD(fd);
  return data.player_count;
}

// ===== Matches =====
export async function listMatches(tournament_id) {
  const fd = new FormData();
  fd.append('action', 'listMatches');
  fd.append('tournament_id', tournament_id);
  const data = await postFD(fd);
  return data.matches || [];
}

export async function saveMatchScore(tournament_id, match_id, slot_a_score, slot_b_score) {
  const fd = new FormData();
  fd.append('action', 'saveMatchScore');
  fd.append('tournament_id', tournament_id);
  fd.append('match_id', match_id);
  fd.append('slot_a_score', String(slot_a_score));
  fd.append('slot_b_score', String(slot_b_score));
  return postFD(fd);
}

export async function advanceMatch(tournament_id, match_id) {
  const fd = new FormData();
  fd.append('action', 'advanceMatch');
  fd.append('tournament_id', tournament_id);
  fd.append('match_id', match_id);
  return postFD(fd);
}

// Tournament
export async function finishTournament(tournament_id, { force = false, winner_id = null } = {}) {
  const fd = new FormData();
  fd.append('action', 'finishTournament');
  fd.append('tournament_id', String(tournament_id));
  if (force) fd.append('force', 'true');
  if (winner_id) fd.append('winner_id', String(winner_id));

  return postFD(fd); 
}

export async function getRanking(tournament_id) {
  const fd = new FormData();
  fd.append('action', 'getRanking');
  fd.append('tournament_id', tournament_id);
  const res = await fetch(API_URL, { method: 'POST', body: fd });
  const data = await res.json();
  if (!data.ok) throw new Error(data.error || 'Failed');
  return data.standings; // array of ranking rows
}

