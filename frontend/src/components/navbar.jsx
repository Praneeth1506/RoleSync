import React, { useState } from "react";
import "../components-css/navbar.css";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

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
          <a href="/upload">Upload</a>
          <a href="/feedback">Feedback</a>
          <a href="/about">About</a>
        </nav>

        <div className="nav-actions">
          <div className="nav-search">
            <input className="nav-search-input" placeholder="Search resumes" aria-label="Search" />
          </div>

          <button className="btn-primary">Sign in</button>
          <div className="nav-avatar" title="Profile">TR</div>
        </div>
      </div>
    </header>
  );
}
