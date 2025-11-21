// ChatPage.jsx
import React, { useEffect, useRef, useState } from "react";
import "../components-css/Chatbot.css";

export default function Chatbot() {
  const [conversations, setConversations] = useState([
    { id: "c1", title: "Screening - Frontend", last: "Sent interview questions", updated: Date.now() - 3600_000 },
    { id: "c2", title: "Resume parsing tests", last: "Parsed resume summary", updated: Date.now() - 86_400_000 }
  ]);
  const [activeConvId, setActiveConvId] = useState(conversations[0].id);
  const [messagesByConv, setMessagesByConv] = useState({
    c1: [
      { id: 1, from: "bot", text: "Hello! Which frontend role are you hiring for?", ts: Date.now() - 3600_000 },
      { id: 2, from: "user", text: "Senior React dev", ts: Date.now() - 3500_000 }
    ],
    c2: [
      { id: 1, from: "bot", text: "Upload a resume or paste content to summarize.", ts: Date.now() - 86_400_000 }
    ]
  });
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesRef = useRef(null);

  const activeMessages = messagesByConv[activeConvId] || [];

  useEffect(() => {
    // scroll to bottom on active conversation change
    setTimeout(() => scrollToBottom(), 50);
  }, [activeConvId]);

  useEffect(() => {
    // scroll when messages change
    scrollToBottom();
  }, [activeMessages.length, isTyping]);

  function scrollToBottom() {
    if (!messagesRef.current) return;
    messagesRef.current.scrollTop = messagesRef.current.scrollHeight + 200;
  }

  function sendMessage(text) {
    if (!text.trim()) return;
    const convId = activeConvId;
    const newMsg = { id: Date.now(), from: "user", text: text.trim(), ts: Date.now() };
    setMessagesByConv((m) => ({ ...m, [convId]: [...(m[convId] || []), newMsg] }));
    setInput("");
    // optimistic update: update conversations meta
    setConversations((cs) => cs.map(c => c.id === convId ? { ...c, last: text.trim(), updated: Date.now() } : c));
    simulateReply(convId, text.trim());
  }

  function simulateReply(convId, userText) {
    setIsTyping(true);
    setTimeout(() => {
      const reply = cannedReply(userText);
      const botMsg = { id: Date.now() + 1, from: "bot", text: reply, ts: Date.now() };
      setMessagesByConv((m) => ({ ...m, [convId]: [...(m[convId] || []), botMsg] }));
      setIsTyping(false);
      setConversations((cs) => cs.map(c => c.id === convId ? { ...c, last: reply, updated: Date.now() } : c));
    }, 800 + Math.random() * 900);
  }

  function cannedReply(text) {
    const t = text.toLowerCase();
    if (t.includes("resume")) return "Drop the resume here (pdf/docx) or paste highlights. I will extract skills and top bullets for you.";
    if (t.includes("interview")) return "For Senior React, consider: hooks & performance, testing, architecture, and system-design questions. Want a 10-question set?";
    if (t.includes("screen")) return "I can score the candidate on a 0-10 fit metric and highlight risk areas. Upload resume to start.";
    return "Cool — I can summarize, suggest interview questions, and create screening rubrics. Try: 'generate 8 interview questions for backend' or 'summarize this resume'.";
  }

  function startNewConversation() {
    const id = "c" + (Math.random().toString(36).slice(2, 8));
    const title = "New conversation";
    setConversations((cs) => [{ id, title, last: "New chat", updated: Date.now() }, ...cs]);
    setMessagesByConv((m) => ({ ...m, [id]: [{ id: 1, from: "bot", text: "New chat started — how can I help?", ts: Date.now() }] }));
    setActiveConvId(id);
  }

  function clearConversation(id) {
    setMessagesByConv((m) => ({ ...m, [id]: [] }));
  }

  return (
    <div className="chatpage-root">
      <aside className="left-col">
        <div className="brand">
          <div className="logo">AI</div>
          <div className="title">Consortium Chat</div>
        </div>

        <div className="left-actions">
          <button className="btn primary" onClick={startNewConversation}>+ New chat</button>
          <button className="btn ghost" onClick={() => alert("Export not implemented")}>Export</button>
        </div>

        <div className="conversations">
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`conv-item ${c.id === activeConvId ? "active" : ""}`}
              onClick={() => setActiveConvId(c.id)}
            >
              <div className="conv-title">{c.title}</div>
              <div className="conv-last">{c.last}</div>
              <div className="conv-meta">{new Date(c.updated).toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="sidebar-footer">
          <div className="plan">Premium · <strong>Pro</strong></div>
          <button className="btn link" onClick={() => alert("Account sidebar")}>Account</button>
        </div>
      </aside>

      <main className="main-col">
        <div className="chat-header">
          <div className="conv-info">
            <div className="conv-h-title">{conversations.find(c => c.id === activeConvId)?.title || "Conversation"}</div>
            <div className="conv-h-sub">AI Recruiter — Premium</div>
          </div>
          <div className="chat-actions">
            <button className="btn ghost" onClick={() => clearConversation(activeConvId)}>Clear</button>
            <button className="btn ghost" onClick={() => alert("Exporting conversation...")}>Export</button>
          </div>
        </div>

        <section className="message-area" ref={messagesRef}>
          <div className="messages" ref={messagesRef}>
            {activeMessages.length === 0 && !isTyping ? (
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
            <button className="btn primary" onClick={() => sendMessage(input)}>Send</button>
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
