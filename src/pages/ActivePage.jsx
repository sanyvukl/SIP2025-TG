import React from "react";
import ActiveTournamentsSection from "../components/ActiveTournamentsSection";
import ActiveExpand from "../components/ActiveExpand";

export default function ActivePage() {
  return (
    <div className="shell" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px 56px' }}>
      <div className="header" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
        <div className="title" style={{ fontWeight: 800, fontSize: 20 }}>Active Tournaments</div>
        <div className="help">Score entry, advancing, and live bracket.</div>
      </div>

      <ActiveTournamentsSection
        title="Active Tournaments"
        status="active"
        ExpandComponent={ActiveExpand}
        pageSize={5}
        autoLoad
        enableAutoRefresh
        autoRefreshMs={15000}
        onFinished={(id) => console.log("Finished:", id)}
      />
    </div>
  );
}
