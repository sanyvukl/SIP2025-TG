import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import CreateTournamentPage from "./pages/CreateTournamentPage"
import PendingPage from "./pages/PendingPage"
import ActivePage from "./pages/ActivePage"
import PastPage from "./pages/PastPage"
import path from "./utils/paths";



export default function App() {
  return (
    <Router>
      <Header />
      <main style={{ padding: "20px" }}>
        <Routes>
          <Route path={path.CREATE_TOURNAMENT} element={<CreateTournamentPage />} />
          <Route path={path.PENDING_TOURNAMENTS} element={<PendingPage />} />
          <Route path={path.ACTIVE_TOURNAMENTS}element={<ActivePage />} />
          <Route path={path.PAST_TOURNAMENTS} element={<PastPage />} />
        </Routes>
      </main>
    </Router>
  );
}
