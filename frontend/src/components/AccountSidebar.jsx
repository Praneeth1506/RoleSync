import React, { useEffect } from "react";
import "../components-css/acc.css";

export default function AccountSidebar({ open = false, onClose = () => {}, user = {} }) {
  const {
    name = "Unknown",
    email = "-",
    organization = "-",
    contact_number = "-",
    created_roles = [],
    joined_at
  } = user || {};

  const formattedDate = joined_at
    ? new Date(joined_at).toLocaleDateString("en-IN", {
        year: "numeric",
        month: "short",
        day: "numeric"
      })
    : "-";

  const initials = name
    .split(" ")
    .map((s) => s[0] || "")
    .slice(0, 2)
    .join("");

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = prev || "";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [open]);

  // close on escape
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

      <div className="account-panel" role="dialog" aria-modal={open} aria-label="Account details">
        <header className="account-header">
          <div className="left">
            <div className="account-avatar" aria-hidden>
              {initials}
            </div>
            <div className="title-block">
              <h2 className="name">{name}</h2>
              <p className="org">{organization}</p>
            </div>
          </div>

          <div className="actions">
            <span className="premium-badge">Premium</span>
            <button aria-label="Close account panel" onClick={onClose} className="close-btn">✕</button>
          </div>
        </header>

        <main className="account-body">
          <section className="account-section">
            <h3>Contact</h3>
            <div className="meta">
              <div>
                <span className="label">Email</span>
                <div className="value">{email}</div>
              </div>

              <div>
                <span className="label">Phone</span>
                <div className="value">{contact_number}</div>
              </div>

              <div>
                <span className="label">Joined</span>
                <div className="value">{formattedDate}</div>
              </div>
            </div>
          </section>

          <section className="account-section">
            <div className="section-header">
              <h3>Created roles</h3>
              <button className="manage-btn">Manage</button>
            </div>

            <ul className="roles-list">
              {created_roles.length === 0 ? (
                <li className="empty">No roles created yet</li>
              ) : (
                created_roles.map((r) => (
                  <li key={r} className="role-item">
                    <div className="role-name" title={r}>{r}</div>
                    <div className="role-id">ID</div>
                  </li>
                ))
              )}
            </ul>
          </section>

          <section className="account-section profile-card">
            <div className="tag-row">
              <h3>Profile Card</h3>
              <div className="user-id">#{user?._id || "-"}</div>
            </div>

            <div className="about">
              <span className="label">About</span>
              <p className="bio">Recruiter at {organization} — experienced in technical hiring and talent acquisition. This summary area is a good place for a short bio or recruiter tagline.</p>
            </div>

            <div className="summary">
              <span className="label">Summary</span>
              <div className="stats">
                <div className="stat">Open roles: <strong>{(created_roles || []).length}</strong></div>
                <div className="stat">Member since: <strong>{formattedDate}</strong></div>
              </div>
            </div>

            <div className="card-actions">
              <button className="btn ghost">View resume</button>
              <button className="btn primary">Download</button>
            </div>
          </section>

          <footer className="account-footer">
            <div>Password: <strong>••••••••</strong></div>
            <div className="footer-actions">
              <button className="link signout">Sign out</button>
              <button className="link help">Help</button>
            </div>
          </footer>
        </main>
      </div>
    </aside>
  );
}
