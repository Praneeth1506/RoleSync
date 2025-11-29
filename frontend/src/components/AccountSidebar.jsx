// AccountSidebar.jsx
import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../components-css/acc.css";
import { ResumeContext } from "./ResumeProvider";

export default function AccountSidebar({ open = false, onClose = () => {}, user: userProp = null }) {
  const navigate = useNavigate();
  const { resume } = useContext(ResumeContext);
  const [resumeFromStorage, setResumeFromStorage] = useState(null);
  
  // Helper: read user from localStorage
  function readStoredUser() {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn("[AccountSidebar] failed to parse localStorage user:", e);
      return null;
    }
  }
  // Monkey-patch localStorage.setItem to log writes to "user"


  // Choose source: prop first, then localStorage, then fallback
  const localUser = readStoredUser();
  const initialUser = userProp || localUser || {
    name: "Unknown",
    email: "-",
    role: "-",
    contact_number: "-",
    organization: "-",
    joined_at: null,
    _id: "-"
  };

  // State initialized from chosen user
  const [user, setUser] = useState(initialUser);
  const [displayName, setDisplayName] = useState(initialUser.name || "");
  const [email, setEmail] = useState(initialUser.email || "");
  const [phone, setPhone] = useState(initialUser.contact_number || "");
  const [org, setOrg] = useState(initialUser.organization || initialUser.role || "");
  const [isEditing, setIsEditing] = useState(false);

  // Compute initials from user name
  const initials = (user?.name || displayName || "U")
    .split(" ")
    .map((p) => (p ? p[0].toUpperCase() : ""))
    .join("")
    .slice(0, 2);

  // formatted join date
  const formattedDate = user?.joined_at
    ? new Date(user.joined_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
    : "-";

  // Sync with localStorage on mount and listen for updates
  useEffect(() => {
    // console logs help debug if needed
    console.log("[AccountSidebar] mount - userProp:", userProp, "localStorage user:", localUser);

    // if parent didn't supply a prop and localStorage has user, apply it
    if (!userProp && localUser) {
      setUser(localUser);
      setDisplayName(localUser.name || "");
      setEmail(localUser.email || "");
      setPhone(localUser.contact_number || "");
      setOrg(localUser.organization || localUser.role || "");
    }

    function onUserUpdated() {
      const fresh = readStoredUser();
      console.log("[AccountSidebar] onUserUpdated ->", fresh);
      if (!fresh) return;
      setUser(fresh);
      setDisplayName(fresh.name || "");
      setEmail(fresh.email || "");
      setPhone(fresh.contact_number || "");
      setOrg(fresh.organization || fresh.role || "");
    }

    function onStorage(e) {
      if (e.key === "user") onUserUpdated();
    }

    window.addEventListener("user-updated", onUserUpdated);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("user-updated", onUserUpdated);
      window.removeEventListener("storage", onStorage);
    };
    // intentionally empty deps: mount-only sync. If you want to react to userProp changes,
    // add userProp to the dependency array and handle merges.
  }, []); // eslint-disable-line

  // Save profile locally (and optionally call backend)
  function saveProfile() {
    const updated = {
      ...user,
      name: displayName,
      email,
      contact_number: phone,
      organization: org,
      role: user.role || org || user.role,
    };

    setUser(updated);
    setIsEditing(false);

    try {
      localStorage.setItem("user", JSON.stringify(updated));
      // notify other tabs/components
      window.dispatchEvent(new Event("user-updated"));
    } catch (e) {
      console.warn("Failed to persist user to localStorage:", e);
    }

    // Optional: call backend to persist profile (uncomment and adapt)
    // axios.post('/api/profile/update', updated).then(...).catch(...);
  }

  // Cancel edit and revert to current user state
  function cancelEdit() {
    setIsEditing(false);
    setDisplayName(user.name || "");
    setEmail(user.email || "");
    setPhone(user.contact_number || "");
    setOrg(user.organization || user.role || "");
  }

  // Sign out
  function signOut() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    try { delete axios.defaults.headers.common['Authorization']; } catch (e) {}
    try { window.dispatchEvent(new Event('user-logged-out')); } catch (e) {}
    onClose();
    navigate('/signin');
  }

  return (
    <aside className={`account-sidebar ${open ? "open" : ""}`} aria-hidden={!open}>
      <div className="account-backdrop" onClick={onClose} />

      <div className="account-panel" role="dialog" aria-modal={open}>
        <header className="account-header">
          <div className="left">
            <div className="account-avatar">{initials}</div>
            <div className="title-block">
              {isEditing ? (
                <input
                  className="edit-input name-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              ) : (
                <h2 className="name">{displayName || user.name || "Unknown"}</h2>
              )}
              <p className="org">{org}</p>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {isEditing ? (
              <>
                <button className="btn ghost" onClick={cancelEdit}>Cancel</button>
                <button className="btn primary" onClick={saveProfile}>Save Profile</button>
              </>
            ) : (
              <button className="btn primary" onClick={() => setIsEditing(true)}>Edit Profile</button>
            )}
            <button aria-label="Close" onClick={onClose} className="close-btn">✕</button>
          </div>
        </header>

        <main className="account-body">
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

            <div className="resume-section">
              {!resume?.file ? (
                <button className="btn primary upload-btn" onClick={() => { onClose(); navigate("/upload"); }}>
                  Upload Resume
                </button>
              ) : (
                <div className="card-actions">
                  <a className="btn ghost" href={resume.url} target="_blank" rel="noopener noreferrer">View Resume</a>
                  <a className="btn primary" download={resume.file.name} href={resume.url}>Download</a>
                </div>
              )}
            </div>
          </section>

          <footer className="account-footer">
            <div className="footer-actions">
              <button className="link signout" onClick={signOut}>Sign Out</button>
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
