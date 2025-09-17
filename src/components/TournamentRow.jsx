import React, { useState } from "react";

const kvStyle = { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#191d24", border:"1px solid var(--ring)", borderRadius:10, padding:10, marginBottom:8 };

function fmtFormat(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "double") return "Double Elimination";
  if (s === "single") return "Single Elimination";
  return raw || "—";
}
function fmtDate(dt) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  } catch { return String(dt); }
}

export default function TournamentRow({
  t,
  ExpandComponent,           // component to render when expanded
  initiallyExpanded = false,
  onBecameActive,
  onParticipantsChange,
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  return (
    <>
      <div className="kv" style={kvStyle}>
        <span className="v" style={{ fontWeight: 700 }}>{t.name || "-"}</span>
        <span className="k" style={{ marginLeft: 8 }}>{fmtFormat(t.format)}</span>
        <span className="k" data-field="participants">Participants: {Number(t.player_count) || 0}</span>
        <span className="k" data-field="time">Date: {fmtDate(t.start_time)}</span>
        <button className="btn" onClick={()=>setExpanded(v=>!v)}>
          {expanded ? "Collapse" : "Expand"}
        </button>
      </div>

      {expanded && !!ExpandComponent && (
        <ExpandComponent
          tournament={t}
          onBecameActive={onBecameActive}
          onParticipantsChange={onParticipantsChange}
        />
      )}
    </>
  );
}
