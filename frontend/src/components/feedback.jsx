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
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const json = await res.json();
      // expecting array of { id, name, message, timestamp }
      setItems(Array.isArray(json) ? json : [json]);
    } catch (err) {
      // try fallback to local sample file in `public/feedback.json`
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

      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFeedback();
  }, []);

  return (
    <div className="fb-page">
      <div className="fb-stars" aria-hidden />
      <div className="fb-stars fb-stars-2" aria-hidden />

      <main className="fb-container">
        <header className="fb-header">
          <h1 className="fb-title">Live Feedback</h1>
          <p className="fb-sub">Feedback from your backend about uploaded resumes</p>
        </header>

        <section className="fb-card">
          <div className="fb-actions">
            <button className="btn-ghost" onClick={fetchFeedback} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              className="btn-primary"
              onClick={() => alert("Action placeholder — wire to real flow")}
            >
              Take action
            </button>
          </div>

          {error && <div className="fb-error">Error: {error}</div>}

          <div className="fb-list">
            {!loading && items.length === 0 && !error && (
              <div className="fb-empty">No feedback yet — try refreshing.</div>
            )}

            {items.map((it) => (
              <article className="fb-item" key={it.id || it.timestamp || Math.random()}>
                <div className="fb-item-left">
                  <div className="fb-item-name">{it.name || "Anonymous"}</div>
                  <div className="fb-item-msg">{it.message}</div>
                </div>
                <div className="fb-item-right">{new Date(it.timestamp || Date.now()).toLocaleString()}</div>
              </article>
            ))}
          </div>

          {loading && <div className="fb-loading">Loading feedback…</div>}
        </section>
      </main>
    </div>
  );
}
