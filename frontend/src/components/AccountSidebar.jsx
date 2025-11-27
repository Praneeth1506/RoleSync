import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components-css/acc.css";
import { ResumeContext } from "./ResumeProvider";

export default function AccountSidebar({ open = false, onClose = () => { }, user = {} }) {
  const {
    name = "Unknown",
    email: userEmail = "-",
    organization = "-",
    contact_number: userPhone = "-",
    joined_at,
  } = user || {};

  const [displayName, setDisplayName] = useState(name);
  const [email, setEmail] = useState(userEmail);
  const [phone, setPhone] = useState(userPhone);
  const [org, setOrg] = useState(organization);
  const [isEditing, setIsEditing] = useState(false);

  const navigate = useNavigate();
  const { resume } = useContext(ResumeContext);

  const formattedDate = joined_at
    ? new Date(joined_at).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
    : "-";

  const initials = (displayName || name || "")
    .split(" ")
    .map((s) => s[0] || "")
    .slice(0, 2)
    .join("");

  // Prevent body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev;
    return () => (document.body.style.overflow = prev || "");
  }, [open]);

  // Close on ESC
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && open) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside className={`account-sidebar ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="account-backdrop" onClick={onClose} />

      <div className="account-panel" role="dialog" aria-modal={open}>
        <header className="account-header">
          <div className="left">
            <div className="account-avatar">{(displayName || "").split(" ").map(s => s[0] || "").slice(0,2).join("")}</div>
            <div className="title-block">
              {isEditing ? (
                <input className="edit-input name-input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
              ) : (
                <h2 className="name">{displayName}</h2>
              )}
              <p className="org">{org}</p>
            </div>
          </div>
          <button aria-label="Close" onClick={onClose} className="close-btn">✕</button>
        </header>

        <main className="account-body">
          {/* EDIT PROFILE */}
          <div className="edit-profile-bar">
            <button className="btn primary" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? "Save Profile" : "Edit Profile"}
            </button>
          </div>

          {/* CONTACT */}
          <section className="account-section">
            <h3>Contact</h3>
            <div className="meta">
              <div>
                <span className="label">Email</span>
                {isEditing ? (
                  <input className="edit-input" value={email} onChange={(e) => setEmail(e.target.value)} />
                ) : (
                  <div className="value"><a href={`mailto:${email}`} onClick={() => onClose()}>{email}</a></div>
                )}
              </div>

              <div>
                <span className="label">Phone</span>
                {isEditing ? (
                  <input className="edit-input" value={phone} onChange={(e) => setPhone(e.target.value)} />
                ) : (
                  <div className="value"><a href={`tel:${phone}`} onClick={() => onClose()}>{phone}</a></div>
                )}
              </div>

              <div>
                <span className="label">Joined</span>
                <div className="value">{formattedDate}</div>
              </div>
            </div>
          </section>

          {/* PROFILE CARD */}
          <section className="account-section profile-card">
            <div className="tag-row">
              <h3>Profile Card</h3>
              <div className="user-id">#{user?._id || "-"}</div>
            </div>
            <div className="about">
              <span className="label">Job Role</span>
              {isEditing ? (
                <input className="edit-input" value={org} onChange={(e) => setOrg(e.target.value)} />
              ) : (
                <p className="bio">{org}</p>
              )}
            </div>
            <div className="summary">
              <span className="label">Summary</span>
              <div className="stats">
                <div className="stat">Member since: <strong>{formattedDate}</strong></div>
              </div>
            </div>

            {/* RESUME */}
            <div className="resume-section">
              {!resume?.file ? (
                <button className="btn primary upload-btn" onClick={() => navigate("/upload")}>
                  Upload Resume
                </button>
              ) : (
                <div className="card-actions">
                  <a className="btn ghost" href={resume.url} target="_blank" rel="noopener noreferrer">
                    View Resume
                  </a>
                  <a className="btn primary" download={resume.file.name} href={resume.url}>
                    Download
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* FOOTER */}
          <footer className="account-footer">
            <div className="footer-actions">
              <button
                className="link signout"
                onClick={() => {
                  localStorage.removeItem('accessToken');
                  localStorage.removeItem('refreshToken');
                  localStorage.removeItem('user');
                  try { delete axios.defaults.headers.common['Authorization']; } catch (e) {}
                  // notify listeners (navbar) about logout
                  try { window.dispatchEvent(new Event('user-logged-out')); } catch (e) {}
                  onClose();
                  navigate('/signin');
                }}
              >
                Sign Out
              </button>

              <button
                className="link help"
                onClick={() => {
                  onClose();
                  navigate('/help');
                }}
              >
                Help
              </button>
            </div>
          </footer>
        </main>
      </div>
    </aside>
  );
}
