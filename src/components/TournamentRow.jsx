import React, { useEffect, useState } from "react";

const kvStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  background: "#191d24",
  border: "1px solid var(--ring)",
  borderRadius: 10,
  padding: "10px 14px",
  marginBottom: 8,
};

function fmtFormat(raw) {
  const s = String(raw || "").toLowerCase();
  if (s === "double") return "Double Elimination";
  if (s === "single") return "Single Elimination";
  return raw || "—";
}

function fmtDate(dt) {
  if (!dt) return "-";
  try {
    return new Date(dt).toLocaleString('en-US', {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(dt);
  }
}

export default function TournamentRow({
  t,
  ExpandComponent,
  initiallyExpanded = false,
  onBecameActive,
  onParticipantsChange,
  onFinished,
  onDelete,
  shouldClose = false,
  expandedTid,
}) {
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (expandedTid == null) return;
    const isMe = String(expandedTid) === String(t.id);
    setExpanded(isMe);
    // Smooth scroll to the row if it exists
    const el = document.getElementById(`tournament_${String(expandedTid)}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [expandedTid, t.id]);

  useEffect(()=>{
    const kind = typeof shouldClose;

    if (kind === "boolean") {
      if (shouldClose) setExpanded(false);
      return;
    }
  }, [shouldClose])

  async function handleDelete() {
    if (!onDelete) return;
    if (!window.confirm(`Delete tournament "${t.name}"?`)) return;
    try {
      setExpanded(false);
      setDeleting(true);
      await onDelete(t.id); 
    } catch (e) {
      console.log("Failed to delete: " + e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div className="kv" id={`tournament_${t.id}`} style={kvStyle}>
        {/* Left side: name + details */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{t.name || "-"}</span>

          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              fontSize: 14,
              color: "#ccc",
            }}
          >
            <span>{fmtFormat(t.format)}</span>
            <span>Participants: {Number(t.player_count) || 0}</span>
            <span>Date: {fmtDate(t.start_time)}</span>
          </div>
        </div>

        {/* Right side buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            style={{
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              border: "1px solid #ef4444",
              color: "white",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.6 : 1,
            }}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>

          <button
            className="btn"
            style={{
              backgroundColor: "#2b3140",
              border: "1px solid var(--ring)",
              color: "var(--ink)",
              padding: "6px 12px",
              borderRadius: 6,
              cursor: "pointer",
            }}
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Collapse" : "View"}
          </button>
        </div>
      </div>

      {expanded && !!ExpandComponent && (
        <ExpandComponent
          tournament={t}
          onFinished={onFinished}
          onBecameActive={onBecameActive}
          onParticipantsChange={onParticipantsChange}
        />
      )}
    </>
  );
}
