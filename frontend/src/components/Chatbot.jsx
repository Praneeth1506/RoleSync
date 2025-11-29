// ChatPage.jsx
import React, { useEffect, useRef, useState } from "react";
import "../components-css/Chatbot.css";

const API_BASE = "http://127.0.0.1:8000";

export default function Chatbot() {
  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messagesByConv, setMessagesByConv] = useState({});
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [loadingSidebar, setLoadingSidebar] = useState(false);
  const [deletingId, setDeletingId] = useState(null); // for per-delete UI state
  const messagesRef = useRef(null);

  // localStorage persistence keys
  const LS_CONV = "interview_conversations_v1";
  const LS_MSGS = "interview_messages_v1";

  // helper: get access token from localStorage
  function getToken() {
    return localStorage.getItem("accessToken");
  }

  useEffect(() => {
    try {
      const storedConvs = localStorage.getItem(LS_CONV);
      const storedMsgs = localStorage.getItem(LS_MSGS);
      if (storedConvs) setConversations(JSON.parse(storedConvs));
      if (storedMsgs) setMessagesByConv(JSON.parse(storedMsgs));
    } catch (e) {
      console.warn("Failed to load persisted chats:", e);
    }

    fetchSidebar();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_CONV, JSON.stringify(conversations));
      localStorage.setItem(LS_MSGS, JSON.stringify(messagesByConv));
    } catch (e) {
      console.warn("Failed to persist chats:", e);
    }
  }, [conversations, messagesByConv]);

  useEffect(() => {
    setTimeout(() => scrollToBottom(), 50);
  }, [activeConvId, messagesByConv, isTyping]);

  function scrollToBottom() {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight + 200;
  }

  // Fetch sidebar list
  async function fetchSidebar() {
    setLoadingSidebar(true);
    const token = getToken();
    console.log("[fetchSidebar] Start fetching sidebar, token:", token);

    try {
      const res = await fetch(`${API_BASE}/interview/list`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const text = await res.text();
        console.warn("[fetchSidebar] Failed:", res.status, text);
        setLoadingSidebar(false);
        return;
      }

      const data = await res.json();
      console.log("[fetchSidebar] Raw data:", data);

      const sessionsArray = Array.isArray(data.sessions) ? data.sessions : [];
      const normalized = sessionsArray.map((item, idx) => ({
        id: item._id || `s_${idx}`,
        role: item.target_role || item.role || `Session ${idx + 1}`,
        sessionId: item._id,
        updated: item.updated
          ? new Date(item.updated).getTime()
          : item.created_at
          ? new Date(item.created_at).getTime()
          : Date.now() - idx * 1000,
        last:
          item.last ||
          (item.messages?.length ? item.messages[item.messages.length - 1]?.text : "") ||
          "",
      }));

      console.log("[fetchSidebar] Normalized sessions:", normalized);
      setConversations(normalized);

      for (let conv of normalized) {
        if (conv.sessionId) {
          await openSession(conv);
        }
      }
    } catch (err) {
      console.error("[fetchSidebar] Error:", err);
    } finally {
      setLoadingSidebar(false);
      console.log("[fetchSidebar] Finished fetching sidebar");
    }
  }

  // Open existing session
  async function openSession(conv) {
    if (!conv) return;

    const token = getToken();

    if (!conv.sessionId) {
      const maybeLast = conv.last?.trim();
      if (maybeLast) {
        setMessagesByConv((prev) => ({
          ...prev,
          [conv.id]:
            prev[conv.id] && prev[conv.id].length > 0
              ? prev[conv.id]
              : [{ id: Date.now(), from: "bot", text: maybeLast, ts: Date.now() }],
        }));
      } else {
        setMessagesByConv((prev) => ({ ...prev, [conv.id]: prev[conv.id] || [] }));
      }
      setActiveConvId(conv.id);
      return;
    }

    if (!token) {
      alert("No access token found in localStorage as 'accessToken'. Add it before continuing.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/interview/${encodeURIComponent(conv.sessionId)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });

      if (!res.ok) {
        const txt = await res.text();
        console.warn("Failed to fetch saved chat:", res.status, txt);
        const maybeLast = conv.last?.trim();
        setMessagesByConv((prev) => ({
          ...prev,
          [conv.id]: maybeLast ? [{ id: Date.now(), from: "bot", text: maybeLast, ts: Date.now() }] : (prev[conv.id] || []),
        }));
        setActiveConvId(conv.id);
        return;
      }

      const data = await res.json();

      const serverMsgs = (data.messages || (data.session && data.session.messages) || []).map((m, i) => ({
        id: m.id ?? `${conv.id}_${i}`,
        from: (m.sender === "candidate" || m.sender === "user" || m.from === "user") ? "user" : "bot",
        text: m.text || m.message || "",
        ts: m.timestamp ? new Date(m.timestamp).getTime() : (m.ts ? new Date(m.ts).getTime() : Date.now() - (i * 1000)),
      }));

      const finalMsgs = (serverMsgs && serverMsgs.length > 0)
        ? serverMsgs
        : (conv.last && conv.last.trim()
            ? [{ id: `${conv.id}_last`, from: "bot", text: conv.last, ts: Date.now() }]
            : []);

      setMessagesByConv((prev) => ({ ...prev, [conv.id]: finalMsgs }));

      setConversations((cs) =>
        cs.map((c) =>
          c.id === conv.id
            ? { ...c, role: data.role || c.role || conv.role, last: finalMsgs.slice(-1)[0]?.text || c.last, updated: Date.now() }
            : c
        )
      );

      setActiveConvId(conv.id);
    } catch (err) {
      console.error("Error loading session:", err);
      const maybeLast = conv.last?.trim();
      setMessagesByConv((prev) => ({ ...prev, [conv.id]: maybeLast ? [{ id: Date.now(), from: "bot", text: maybeLast, ts: Date.now() }] : (prev[conv.id] || []) }));
      setActiveConvId(conv.id);
    }
  }

  // Start new session
  async function startNewConversation() {
    const token = getToken();
    if (!token) {
      alert("No access token found in localStorage.");
      return;
    }

    const role = window.prompt("Enter target role to start session (e.g., 'Senior React Engineer'):");
    if (!role || !role.trim()) return;

    try {
      const body = new URLSearchParams();
      body.append("target_role", role.trim());

      const res = await fetch(`${API_BASE}/interview/start`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Server returned ${res.status}: ${text}`);
      }

      const data = await res.json();
      const session = data.session || data;
      const sessionId = session._id || session.session_id || session.id;
      const targetRole = session.target_role || session.targetRole || role;

      const convId = sessionId || `local_${Date.now()}`;
      const convObj = {
        id: convId,
        title: targetRole,
        last: session.messages?.[session.messages.length - 1]?.text || "New chat",
        updated: Date.now(),
        sessionId,
        role: targetRole,
      };

      const initialMessages = (session.messages || []).map((m, i) => ({
        id: m.id ?? i + 1,
        from: m.from || (m.sender === "user" ? "user" : "bot"),
        text: m.text || m.message || JSON.stringify(m),
        ts: m.ts ? new Date(m.ts).getTime() : Date.now() - (session.messages.length - i) * 1000,
      }));

      if (initialMessages.length === 0) {
        initialMessages.push({ id: 1, from: "bot", text: `Session started for role: ${targetRole}`, ts: Date.now() });
      }

      setConversations((cs) => [convObj, ...cs]);
      setMessagesByConv((m) => ({ ...m, [convId]: initialMessages }));
      setActiveConvId(convId);
    } catch (err) {
      console.error("Failed to start session:", err);
      alert(`Failed to start session: ${err.message || err}`);
    }
  }

  // Clear messages in a conversation
  function clearConversation(id) {
    setMessagesByConv((m) => ({ ...m, [id]: [] }));
  }

  // Delete conversation (server + local). Prompts for confirmation.
  async function deleteConversation(convId) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;

    const sessionId = conv.sessionId;
    const yes = window.confirm("Delete this conversation? This will remove the history. Are you sure?");
    if (!yes) return;

    // If there's a server-side session id, try delete on server
    if (sessionId) {
      const token = getToken();
      if (!token) {
        alert("No access token found. Cannot delete server session.");
        return;
      }

      try {
        setDeletingId(convId);
        const res = await fetch(`${API_BASE}/interview/${encodeURIComponent(sessionId)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });

        if (!res.ok) {
          const txt = await res.text();
          console.error("Failed to delete session on server:", res.status, txt);
          alert(`Failed to delete on server: ${res.status}`);
          setDeletingId(null);
          return;
        }

        // success - fall through to local cleanup
      } catch (err) {
        console.error("Error deleting session:", err);
        alert("Error deleting session. See console.");
        setDeletingId(null);
        return;
      } finally {
        setDeletingId(null);
      }
    }

    // Local cleanup (remove from state and localStorage)
    const newConvs = conversations.filter(c => c.id !== convId);
    const newMsgs = { ...messagesByConv };
    delete newMsgs[convId];

    setConversations(newConvs);
    setMessagesByConv(newMsgs);
    if (activeConvId === convId) setActiveConvId(null);

    try {
      localStorage.setItem(LS_CONV, JSON.stringify(newConvs));
      localStorage.setItem(LS_MSGS, JSON.stringify(newMsgs));
    } catch(e) {
      console.warn("Failed to update localStorage after deletion:", e);
    }
  }

  // Send message
  async function sendMessage(text) {
    if (!text.trim()) return;
    const conv = conversations.find((c) => c.id === activeConvId);
    if (!conv) {
      alert("No active conversation selected.");
      return;
    }

    const userMsg = { id: Date.now(), from: "user", text: text.trim(), ts: Date.now() };
    setMessagesByConv((m) => ({ ...m, [activeConvId]: [...(m[activeConvId] || []), userMsg] }));
    setInput("");
    setConversations((cs) =>
      cs.map((c) => (c.id === activeConvId ? { ...c, last: text.trim(), updated: Date.now() } : c))
    );

    const token = getToken();
    if (!token) { alert("No access token found."); return; }
    const sessionId = conv.sessionId;
    if (!sessionId) { simulateLocalReply(activeConvId, text.trim()); return; }

    setIsTyping(true);
    try {
      const body = new URLSearchParams();
      body.append("text", text.trim());

      const res = await fetch(`${API_BASE}/interview/${encodeURIComponent(sessionId)}/message`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: body.toString(),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server error ${res.status}: ${txt}`);
      }

      const data = await res.json();

      const botText =
        data.ai?.reply || data.ai?.next_question ||
        (Array.isArray(data.messages) && data.messages.length ? data.messages.slice(-1)[0].text : null) ||
        data.text ||
        data.reply ||
        "Bot responded";

      if (botText) {
        setMessagesByConv((m) => ({ ...m, [activeConvId]: [...(m[activeConvId] || []), { id: Date.now() + 1, from: "bot", text: botText, ts: Date.now() }] }));
        setConversations((cs) =>
          cs.map((c) => (c.id === activeConvId ? { ...c, last: botText, updated: Date.now() } : c))
        );
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setMessagesByConv((m) => ({ ...m, [activeConvId]: [...(m[activeConvId] || []), { id: Date.now() + 2, from: "bot", text: `Error: ${err.message || "failed to send"}`, ts: Date.now() }] }));
    } finally {
      setIsTyping(false);
    }
  }

  function simulateLocalReply(convId, userText) {
    setIsTyping(true);
    setTimeout(() => {
      const reply = cannedReply(userText);
      setMessagesByConv((m) => ({ ...m, [convId]: [...(m[convId] || []), { id: Date.now() + 1, from: "bot", text: reply, ts: Date.now() }] }));
      setConversations((cs) =>
        cs.map((c) => (c.id === convId ? { ...c, last: reply, updated: Date.now() } : c))
      );
      setIsTyping(false);
    }, 700 + Math.random() * 800);
  }

  function cannedReply(text) {
    const t = text.toLowerCase();
    if (t.includes("resume")) return "Drop the resume here (pdf/docx) or paste highlights.";
    if (t.includes("interview")) return "I can generate interview questions for you.";
    if (t.includes("screen")) return "I can score the candidate on fit metrics.";
    return "Try: 'generate 8 interview questions' or 'summarize this resume'.";
  }

  const activeConv = conversations.find((c) => c.id === activeConvId) || null;
  const activeMessages = messagesByConv[activeConvId] || [];

  return (
    <div className="chatpage-root">
      <aside className="left-col">
        <div className="brand">
          <div className="logo">AI</div>
          <div className="title">Consortium Chat</div>
        </div>

        <div className="left-actions">
          <button className="btn primary" onClick={startNewConversation}>+ New chat</button>
          <button className="btn ghost" onClick={() => fetchSidebar()} disabled={loadingSidebar}>
            {loadingSidebar ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="conversations">
          {conversations.length === 0 ? (
            <div style={{ padding: 12, color: "#6b7280" }}>No conversations yet. Click "New chat" to start.</div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={`conv-item ${c.id === activeConvId ? "active" : ""}`}
              >
                <div
                  className="conv-title"
                  onClick={() => openSession(c)}
                  style={{ cursor: "pointer" }}
                >
                  {c.role || "Conversation"}
                </div>

                {/* nicer red delete button; stopPropagation so clicking delete won't open session */}
                <button
                  className="btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (deletingId === c.id) return;
                    deleteConversation(c.id);
                  }}
                  disabled={deletingId === c.id}
                  title="Delete conversation"
                >
                  {deletingId === c.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <div className="plan">Premium · <strong>Pro</strong></div>
          <button className="btn link" onClick={() => alert("Account sidebar")}>Account</button>
        </div>
      </aside>

      <main className="main-col">
        <div className="chat-header">
          <div className="conv-info">
            <div className="conv-h-title">{activeConv ? (activeConv.title || activeConv.role || "Conversation") : "Conversation"}</div>
            <div className="conv-h-sub">
              AI Recruiter — Premium
              {activeConv && activeConv.role && <span style={{ marginLeft: 12, color: "#6b7280" }}>Role: <strong>{activeConv.role}</strong></span>}
            </div>
          </div>
          <div className="chat-actions">
            <button className="btn ghost" onClick={() => clearConversation(activeConvId)} disabled={!activeConvId}>Clear</button>
            <button className="btn ghost" onClick={() => {
              const payload = { conversation: activeConv, messages: messagesByConv[activeConvId] || [] };
              const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${activeConvId || "conversation"}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }} disabled={!activeConvId}>Export</button>
          </div>
        </div>

        <section className="message-area" ref={messagesRef}>
          <div className="messages">
            {(!activeMessages || activeMessages.length === 0) && !isTyping ? (
              <div className="empty-state">
                <h3>Start the conversation</h3>
                <p>Ask the assistant to summarize a resume, generate interview questions, or screen a candidate.</p>
              </div>
            ) : (
              <>
                {activeMessages.map((m) => (
                  <div key={m.id} className={`msg ${m.from === "bot" ? "bot" : "user"}`}>
                    {m.from === "bot" && <div className="msg-avatar bot">AI</div>}
                    <div className="msg-bubble">{m.text}</div>
                    {m.from === "user" && <div className="msg-avatar user">TR</div>}
                  </div>
                ))}
                {isTyping && (
                  <div className="msg bot typing">
                    <div className="msg-avatar bot">AI</div>
                    <div className="msg-bubble typing-bubble">
                      <span className="dot" /><span className="dot" /><span className="dot" />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <footer className="composer">
          <div className="composer-left">
            <button className="btn circle" title="Upload" onClick={() => alert("Attach file - integrate upload")}>⤓</button>
          </div>

          <div className="composer-center">
            <textarea
              className="composer-input"
              placeholder="Type your message, e.g. 'Generate 10 frontend interview questions'"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            />
          </div>

          <div className="composer-right">
            <button className="btn primary" onClick={() => sendMessage(input)} disabled={!activeConvId && conversations.length === 0}>Send</button>
          </div>
        </footer>
      </main>

      <aside className="right-col">
        <div className="right-card">
          <h4>Quick actions</h4>
          <ul>
            <li onClick={() => alert("Generate questions")}>Generate interview questions</li>
            <li onClick={() => alert("Summarize resume")}>Summarize candidate resume</li>
            <li onClick={() => alert("Create rubric")}>Create screening rubric</li>
          </ul>
        </div>

        <div className="right-card muted">
          <h4>Tips</h4>
          <p>Try prompts like: <em>"Summarize this resume"</em> or <em>"Prepare 8 behavioral & 6 technical questions for Senior Backend"</em>.</p>
        </div>
      </aside>
    </div>
  );
}
