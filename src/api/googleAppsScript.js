// Simple Apps Script POST helpers (FormData, no headers)
const API_URL = "https://script.google.com/macros/s/AKfycbw4nGEjc0J0vU7qJcitsiuiRSI_0spZzkrHR-FvbYkBuZb2FPhlFq226ZEknobyJvmrxQ/exec";

export async function createTournament({ name, format, player_count, race_to, start_time }) {
  const fd = new FormData();
  fd.append("action", "createTournament");
  fd.append("name", name);
  fd.append("format", format);
  fd.append("player_count", String(player_count));
  fd.append("race_to", String(race_to));
  fd.append("start_time", start_time);

  const res = await fetch(API_URL, { method: "POST", body: fd });
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch { throw new Error("Bad JSON: " + raw); }
  if (!res.ok || !data.ok || !data.tournament_id) throw new Error(data.error || "Tournament creation failed");
  return data.tournament_id;
}

export async function createPlayers(tournament_id, players) {
  const fd = new FormData();
  fd.append("action", "createPlayers");
  fd.append("tournament_id", tournament_id);
  fd.append("players", JSON.stringify(players.map(p => ({ ...p, tournament_id }))));

  const res = await fetch(API_URL, { method: "POST", body: fd });
  const raw = await res.text();
  let data; try { data = JSON.parse(raw); } catch { throw new Error("Bad JSON: " + raw); }
  if (!res.ok || !data.ok) throw new Error(data.error || "Player creation failed");
  return true;
}
