// Minimal API client mirroring your FormData calls
const API_URL = 'https://script.google.com/macros/s/AKfycby1_MG_PdQOmFB2FHdokMmNp3w6YxE5hWHh9ne3n48gWWPMbQfp9mnueUtRClodP5Iztw/exec';

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

export async function createFullBracket(tournament_id) {
  const fd = new FormData();
  fd.append('action', 'createFullBracket');
  fd.append('tournament_id', tournament_id);
  return postFD(fd); // { tournament_id, format, created, byes }
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

