import React from "react";

export default function PastExpand({ tournament }) {
  return (
    <div className="expand-panel" style={{ border:"1px solid var(--ring)", background:"#191d24", borderRadius:12, padding:12 }}>
      <div style={{ color:"var(--muted)" }}>
        Past tournament summary coming soon… (ID: {tournament.id})
      </div>
    </div>
  );
}
