import React, { useContext, useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserProvider";
import "../components-css/acc.css";

export default function AccountSidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(user || {});
  const [resume, setResume] = useState(() => {
      try {
        return JSON.parse(localStorage.getItem("resume"));
      } catch {
        return null;
      }
    });

useEffect(() => {
  const handler = (e) => {
    setResume(e.detail);
  };

  window.addEventListener("resume-updated", handler);

  return () => {
    window.removeEventListener("resume-updated", handler);
  };
}, []);

useEffect(() => {
  setForm(user || {});
}, [user]);

  if (!user) return null;

  const initials = user.name
    ?.split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function save() {
    setUser(form);
    setEditing(false);
  }

  function logout() {
    setUser(null);
    onClose();
    navigate("/signin");
  }

  return (
    <aside className={`account-sidebar ${open ? "open" : ""}`}>
      <div className="account-backdrop" onClick={onClose} />

      <div className="account-panel">
        <header className="account-header">
          <div className="avatar-lg">{initials}</div>
          {editing ? (
            <input
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          ) : (
            <h2>{user.name}</h2>
          )}
          <p className="email">{user.email}</p>
        </header>

        <section className="account-section">
          <label>Phone</label>
          {editing ? (
            <input
              value={form.contact_number || ""}
              onChange={(e) =>
                setForm({ ...form, contact_number: e.target.value })
              }
            />
          ) : (
            <p>{user.contact_number || "-"}</p>
          )}
        </section>

        <section className="account-section">
  <label>Resume</label>

  <button
    className="resume-nav-btn"
    onClick={() => {
      onClose();
      navigate("/resume");
    }}
  >
    📄 Upload / Manage Resume
  </button>

  {resume && resume.url ? (
    <a
      href={resume.url}
      className="resume-download"
      download
      target="_blank"
      rel="noopener noreferrer"
    >
      ⬇ Download Resume
    </a>
  ) : (
    <p className="resume-muted">No resume uploaded</p>
  )}
</section>


        <footer className="account-footer">
          {editing ? (
            <div className="footer-actions">
              <button
                className="btn ghost"
                onClick={() => setEditing(false)}
                aria-label="Cancel editing profile"
              >
                ✕ Cancel
              </button>

              <button
                className="btn primary"
                onClick={save}
                aria-label="Save profile changes"
              >
                💾 Save
              </button>
            </div>
          ) : (
            <div className="footer-actions">
              <button
                className="btn ghost"
                onClick={() => setEditing(true)}
                aria-label="Edit profile"
              >
                ✏️ Edit
              </button>

              <button
                className="btn"
                onClick={logout}
                aria-label="Sign out"
              >
                <span className="signout">🔓 Sign Out</span>
              </button>
            </div>
          )}
        </footer>
      </div>
    </aside>
  );
}
