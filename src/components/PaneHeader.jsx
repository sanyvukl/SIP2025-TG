// components/PaneHeader.jsx
import React from "react";

export default function PaneHeader({
  title = "Tournament",
  onFinish,
  canFinish = false,   // computed in parent from matches
  finished = false,    // tournament.status === 'completed'
  busy = false,        // finish request in-flight
}) {
  const disabled = busy || finished || !canFinish;

  const btnTitle =
    finished
      ? "Tournament already completed"
      : busy
        ? "Finishing…"
        : !canFinish
          ? "All matches must be completed to finish"
          : "Finish tournament";

  return (
    <div
      className="pane-head"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 10,
      }}
    >
      <div className="pane-title" style={{ fontSize: 14, fontWeight: 700, color: "#cfd6e3" }}>
        {title}
      </div>

      <button
        className="btn"
        onClick={onFinish}
        disabled={disabled}
        aria-disabled={disabled}
        title={btnTitle}
        style={{
          padding: "8px 12px",
          borderRadius: 8,
          fontSize: 12,
          border: "1px solid var(--ring)",
          background: disabled ? "#1a2230" : "#14304d",
          color: disabled ? "#8b93a3" : "#e6f0ff",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: "transform .06s ease, background .15s ease",
        }}
      >
        {busy ? "Finishing…" : finished ? "Finished" : "Finish Tournament"}
      </button>
    </div>
  );
}
