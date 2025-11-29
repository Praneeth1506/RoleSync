import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components-css/navbar.css";

export default function Navbar({ onAccountClick = () => {} }) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [loading, setLoading] = useState(false);

  const initials = (() => {
    if (!userName) return "";
    // if email, use first char before @
    if (userName.includes("@")) return userName[0].toUpperCase();
    return userName
      .split(" ")
      .map((s) => s[0] || "")
      .slice(0, 2)
      .join("")
      .toUpperCase();
  })();

  // Fetch user data on component mount
  useEffect(() => {
    const checkSignInStatus = async () => {
      try {
        // Check localStorage first
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const user = JSON.parse(storedUser);
          if (user) {
            // prefer name, otherwise use email as display name
            const display = user.name || user.email || "";
            setUserName(display);
            setIsSignedIn(true);
            return;
          }
        }

        // Otherwise try to fetch from backend
        const response = await axios.get("http://localhost:8000/api/dummy/user");
        if (response.data && response.data.name) {
          setUserName(response.data.name);
          setIsSignedIn(true);
        }
      } catch (error) {
        console.log("User not signed in yet");
      }
    };

    // Listen for updates from other components (sidebar save)
    function onUserUpdated(e) {
      const u = e?.detail || null;
      if (u) {
        const display = u.name || u.email || "";
        setUserName(display);
        setIsSignedIn(true);
      }
    }

    function onUserLoggedOut() {
      setUserName("");
      setIsSignedIn(false);
    }

    window.addEventListener("user-updated", onUserUpdated);
    window.addEventListener("user-logged-out", onUserLoggedOut);

    checkSignInStatus();

    return () => {
      window.removeEventListener("user-updated", onUserUpdated);
      window.removeEventListener("user-logged-out", onUserLoggedOut);
    };
  }, []);

  return (
    <header className="nav">
  <div className="nav-container">

    {/* LEFT */}
    <div className="nav-left">
      <div className="nav-logo">
        <span className="logo-mark">AI</span>
        <span className="logo-text">Consortium</span>
      </div>
    </div>

    {/* CENTER */}
    <div className="nav-center">
      <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
        <a href="/"></a>
        <a href="/self">Analysis</a>
        <a href="/feedback">Feedback</a>
        <a href="/cht">Interview Prep</a>
      </nav>
    </div>

    {/* RIGHT */}
    <div className="nav-right">
      {!isSignedIn ? (
        <div className="nav-auth-buttons">
          <button className="btn-secondary" onClick={() => navigate("/signin")}>
            Sign In
          </button>
          <button className="btn-primary" onClick={() => navigate("/signup")}>
            Sign Up
          </button>
        </div>
      ) : (
        <>
          <span className="user-name">{userName}</span>
          <button
            className="nav-avatar-btn"
            aria-label="Open account"
            onClick={(e) => {
              e.stopPropagation();
              onAccountClick();
            }}
          >
            <span className="nav-avatar">{initials}</span>
          </button>
        </>
      )}

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
