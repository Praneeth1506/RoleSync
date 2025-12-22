import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../components-css/navbar.css";
import { UserContext } from "../context/UserProvider";

export default function Navbar({ onAccountClick = () => {} }) {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);

  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const isSignedIn = !!user;
  const userName = user?.name || user?.email || "";

  // Avatar initials
  const initials = userName
    ? userName
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  // Handle click on avatar
  const handleAvatarClick = (e) => {
  e.stopPropagation();
  onAccountClick();
};


  return (
    <header className="nav">
      <div className="nav-container">
        {/* LEFT */}
        <div className="nav-left">
          <div className="nav-logo" onClick={() => navigate("/")}>
            <span className="logo-text">RoleSync</span>
          </div>
        </div>

        {/* CENTER */}
        <div className="nav-center">
          <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
            <a href="/self">Analysis</a>
            <a href="/feedback">Feedback</a>
            <a href="/cht">Interview Prep</a>
          </nav>
        </div>

        {/* RIGHT */}
        <div className="nav-right">
          {!isSignedIn ? (
            <div className="nav-auth-buttons">
              <button
                className="btn-secondary"
                onClick={() => navigate("/signin")}
              >
                Sign In
              </button>
              <button
                className="btn-primary"
                onClick={() => navigate("/signup")}
              >
                Sign Up
              </button>
            </div>
          ) : (
            <>
              <span className="user-name">{userName}</span>

              <button
                className="nav-avatar-btn"
                aria-label="Open account"
                onClick={handleAvatarClick}
              >
                <span className="nav-avatar">
                  {loadingProfile ? "..." : initials}
                </span>
              </button>
            </>
          )}

          {/* Mobile toggle */}
          <button
            className="nav-toggle"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((s) => !s)}
          >
            <span className="hamburger" />
          </button>
        </div>
      </div>
    </header>
  );
}
