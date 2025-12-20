import React, { useEffect, useState } from "react";
import "../components-css/feedback.css";

export default function Feedback() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function fetchFeedback() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback");
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      setItems(Array.isArray(json) ? json : [json]);
    } catch (err) {
      // fallback to local sample in public/feedback.json
      try {
        const res2 = await fetch("/feedback.json");
        if (res2.ok) {
          const json2 = await res2.json();
          setItems(Array.isArray(json2) ? json2 : [json2]);
          setError(null);
          return;
        }
      } catch (_) {
        // ignore
      }
      setError(err?.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fmtDate = (ts) => {
    try {
      return new Date(ts || Date.now()).toLocaleString();
    } catch {
      return "-";
    }
  };

  const initials = (name = "A") =>
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");

  const statusToClass = (s) => {
    if (!s) return "fb-badge fb-new";
    const key = String(s).toLowerCase();
    if (key.includes("short")) return "fb-badge fb-badge--shortlist";
    if (key.includes("interview")) return "fb-badge fb-badge--interview";
    if (key.includes("reject")) return "fb-badge fb-badge--rejected";
    return "fb-badge fb-badge--new";
  };

  return (
    <div className="fb-page">
      <div className="fb-container">
        <header className="fb-header">
          <div>
            <h1 className="fb-title">Feedback Hub</h1>
            <p className="fb-sub">Neon insights from recruiters — quick, clear, and actionable</p>
          </div>

          <div className="fb-actions" role="region" aria-label="actions">
            <button className="btn-ghost" onClick={fetchFeedback} disabled={loading} aria-disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </header>

        <main className="fb-card" role="main" aria-live="polite">
          {error && <div className="fb-error">Error: {error}</div>}

          {loading && (
            <div className="fb-loading" aria-hidden>
              Loading feedback…
            </div>
          )}

          {!loading && items.length === 0 && !error && (
            <div className="fb-empty">No feedback yet — try refreshing.</div>
          )}

          <div className="fb-list" aria-label="feedback list">
            {items.map((it) => {
              const key = it.id ?? it.timestamp ?? Math.random().toString(36).slice(2, 9);
              return (
                <article className="fb-item" key={key}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div className="fb-avatar" aria-hidden title={it.company || ""}>
                      {initials(it.company || it.name)}
                    </div>
                  </div>

                  <div className="fb-item-left">
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div className="fb-item-name">{it.company ? `${it.company}` : (it.name || "Anonymous")}</div>
                        {it.position && <div className="fb-meta">{it.position}</div>}
                      </div>

                      <div style={{ textAlign: "right", minWidth: 120 }}>
                        <div className={statusToClass(it.status)}>{it.status || "New"}</div>
                        <div className="fb-item-right" style={{ marginTop: 8 }}>{fmtDate(it.timestamp)}</div>
                      </div>
                    </div>

                    <div className="fb-item-msg" style={{ marginTop: 10 }}>{it.message ?? "—"}</div>

                    {(it.tags?.length > 0 || it.score != null) && (
                      <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                        {it.score != null && <div className="fb-meta">Score: {it.score}</div>}
                        {Array.isArray(it.tags) && (
                          <div style={{ display: "flex", gap: 6 }}>
                            {it.tags.slice(0, 4).map((t, i) => (
                              <div key={i} className="fb-tag">{t}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </main>

        <footer style={{ marginTop: 16, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
          Powered by RoleSync • styled by UI kit
        </footer>
      </div>
    </div>
  );
}
