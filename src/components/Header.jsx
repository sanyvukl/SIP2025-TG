import React from "react";
import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const location = useLocation();

  return (
    <header
      style={{
        background: "#11161d",
        borderBottom: "1px solid #2b3140",
        padding: "14px 24px",
      }}
    >
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* Logo */}
        <h1
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 700,
            color: "#f9fafb", // clean off-white
            letterSpacing: "0.5px",
          }}
        >
          Tournament App
        </h1>

        {/* Navigation */}
        <ul
          style={{
            display: "flex",
            listStyle: "none",
            gap: 24,
            margin: 0,
            padding: 0,
          }}
        >
          {navItems.map((item) => (
            <li key={item.to}>
              <Link
                to={item.to}
                style={{
                  ...linkStyle,
                  ...(location.pathname === item.to ? activeLinkStyle : {}),
                }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

const navItems = [
  { to: "/", label: "Create Tournament" },
  { to: "/pending", label: "Pending" },
  { to: "/active", label: "Active" },
  { to: "/past", label: "Past" },
];

const linkStyle = {
  color: "#d1d5db", // soft gray
  textDecoration: "none",
  fontSize: 15,
  fontWeight: 500,
  padding: "6px 12px",
  borderRadius: 6,
  transition: "background 0.25s, color 0.25s",
};

const activeLinkStyle = {
  background: "linear-gradient(135deg, #2563eb 0%, #06b6d4 100%)", // blue → teal accent
  color: "#ffffff",
};
