import React, { useState } from "react";
import PendingTournamentsSection from "../components/PendingTournamentsSection";

export default function PendingPage() {
  const [reloadKey, setReloadKey] = useState(0);

  const hardReloadOthers = () => setReloadKey((k) => k + 1); 
  // if you also show Active/Past elsewhere

  return (
    <div
      className="shell"
      style={{ maxWidth: 980, margin: "0 auto", padding: "24px 16px 56px" }}
    >
      <div
        className="header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div
          className="title"
          style={{ fontWeight: 800, fontSize: 20 }}
        >
          Pending Tournaments
        </div>
        <div className="help">
          Create players, seed, and start tournaments.
        </div>
      </div>

      <PendingTournamentsSection
        key={"pending-" + reloadKey}
        onPromoteToActive={hardReloadOthers}
      />
    </div>
  );
}
