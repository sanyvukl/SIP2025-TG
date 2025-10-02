import React, { useState } from "react";
import PastTournamentsSection from "../components/PastTournamentsSection";

export default function PastPage() {
  const [reloadKey, setReloadKey] = useState(0);

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
          Past Tournaments
        </div>
        <div className="help">
          Final brackets, champions, and archives.
        </div>
      </div>
      <PastTournamentsSection
        key={"past-" + reloadKey}
        title="Past Tournaments"
        status="completed"
        autoLoad
      />
    </div>
  );
}
