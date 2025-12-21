import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserContext } from "../context/UserProvider";
import "../components-css/acc.css";

export default function AccountSidebar({ open, onClose }) {
  const navigate = useNavigate();
  const { user, setUser } = useContext(UserContext);
  
  // Normalize user data
  const profile = user?.profile || user;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(profile);
  const [resume, setResume] = useState(null);
    
  useEffect(() => {
    try {
      setResume(JSON.parse(localStorage.getItem("resume")));
    } catch {
      setResume(null);
    }
  }, []);

  useEffect(() => {
  if (profile) {
    setForm(profile);
  }
}, [profile]);


  if (!profile) return null;

  const initials = profile.name
    ?.split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  function save() {
    setUser({ ...user, profile: form });
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
              className="header-input"
              value={form.name || ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          ) : (
            <h2>{profile.name}</h2>
          )}

          <p className="email">{profile.email}</p>
        </header>

        <section className="account-section">
          <label>📞 Phone</label>
          {editing ? (
            <input
              value={form.phone || ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          ) : (
            <p>{profile.phone || "-"}</p>
          )}
        </section>

        <section className="account-section">
          <label>🔗 LinkedIn</label>
          {editing ? (
            <input
              value={form.linkedin || ""}
              onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
            />
          ) : profile.linkedin ? (
            <a
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              View Profile
            </a>
          ) : (
            <p>-</p>
          )}
        </section>

        <section className="account-section">
          <label>📄 Resume</label>

          <button
            className="resume-nav-btn"
            onClick={() => {
              onClose();
              navigate("/resume");
            }}
          >
            Upload / Manage Resume
          </button>

          {resume?.url ? (
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
              <button className="btn ghost" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={save}>
                Save
              </button>
            </div>
          ) : (
            <div className="footer-actions">
              <button className="btn ghost" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button className="btn danger" onClick={logout}>
                Sign Out
              </button>
            </div>
          )}
        </footer>
      </div>
    </aside>
  );
}