import React, { useState } from "react";
import "../components-css/navbar.css";

export default function Navbar({ onAccountClick = () => {} }) {
  const [menuOpen, setMenuOpen] = useState(false);

  // Fallback avatar: compute initials (replace with a real user/avatar prop if available)
  const userName = "Test User"; // <-- replace or accept as prop like ({ user }) for real data
  const initials = userName
    .split(" ")
    .map((s) => s[0] || "")
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="nav">
      <div className="nav-container">
        <div className="nav-left">
          <div className="nav-logo" aria-hidden>
            <span className="logo-mark">AI</span>
            <span className="logo-text">Consortium</span>
          </div>

          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((s) => !s)}
          >
            <span className="hamburger" />
          </button>
        </div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`} aria-label="Primary">
          <a href="/">Home</a>
          <a href="/upload">Job requirements </a>
          <a href="/feedback">Feedback</a>
          <a href="/about">Interview Prep</a>
        </nav>

        <div className="nav-actions">
          <div className="nav-search">
            <input className="nav-search-input" placeholder="Search resumes" aria-label="Search" />
          </div>

          <button className="btn-primary">Sign in</button>
          <div className="nav-profile">
            <button
              className="nav-avatar-btn"
              aria-label="Open account"
              onClick={onAccountClick}
              type="button"
            >
              {/* simple fallback avatar (initials) */}
              <span className="nav-avatar nav-avatar--initials">{initials}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
