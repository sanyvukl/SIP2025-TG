import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import CreateTournamentPage from "./pages/CreateTournamentPage"
import PendingPage from "./pages/PendingPage"
import ActivePage from "./pages/ActivePage"
import PastPage from "./pages/PastPage"



export default function App() {
  return (
    <Router>
      <Header />
      <main style={{ padding: "20px" }}>
        <Routes>
          <Route path="/" element={<CreateTournamentPage />} />
          <Route path="/pending" element={<PendingPage />} />
          <Route path="/active" element={<ActivePage />} />
          <Route path="/past" element={<PastPage />} />
        </Routes>
      </main>
    </Router>
  );
}
