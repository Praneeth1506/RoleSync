import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserProvider";
import "../components-css/acc.css";

export default function AccountSidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const [resume, setResume] = useState(null);

  useEffect(() => {
    try {
      setResume(JSON.parse(localStorage.getItem("resume")));
    } catch {
      setResume(null);
    }
  }, []);

  function logout() {
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");

    window.dispatchEvent(new CustomEvent("user-updated"));

    onClose();
    navigate("/signin");
  }

  if (!open || !user) return null;

  const initials = user.name
    ?.split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="account-sidebar open">
      <div className="account-backdrop" onClick={onClose} />
      <div className="account-panel">
        <header className="account-header">
          <div className="avatar-lg">{initials}</div>
          <h2>{user.name}</h2>
          <p className="email">{user.email}</p>
        </header>

        <section className="account-section">
          <label>📞 Phone</label>
          <p>{user.phone || "-"}</p>
        </section>

        <section className="account-section">
          <label>🔗 LinkedIn</label>
          {user.linkedin ? (
            <a href={user.linkedin} target="_blank" rel="noreferrer">
              View Profile
            </a>
          ) : (
            <p>-</p>
          )}
        </section>

        <footer className="account-footer">
          <button className="btn danger" onClick={logout}>
            Sign Out
          </button>
        </footer>
      </div>
    </aside>
  );
}
