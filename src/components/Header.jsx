import React from "react";
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="header">
      <nav className="nav">
        <h1 className="logo">Tournament App</h1>
        <ul className="nav-links">
          <li><Link to="/">Create Tournament</Link></li>
          <li><Link to="/pending">Pending</Link></li>
          <li><Link to="/active">Active</Link></li>
          <li><Link to="/past">Past</Link></li>
        </ul>
      </nav>
    </header>
  );
}
