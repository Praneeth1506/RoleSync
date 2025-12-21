import React, { useState, useEffect, useRef } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { 
    UploadCloud, Loader2, Bot, Send, CheckCircle, 
    XCircle, Sparkles, Target, X, MessageSquare 
} from 'lucide-react';
import './Shortlist.css';

const Shortlist = () => {
    const { jobDescriptions, aiBatchProcess, sendChatMessage, createFeedbackDraft, approveFeedback, fetchJobs } = useRecruiter();
    
    const [jobId, setJobId] = useState('');
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState({ shortlisted: [], rejected: [] });
    const [chatId, setChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    // UI States
    const [selectedExplanation, setSelectedExplanation] = useState(null);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [sendingFb, setSendingFb] = useState({});

    const chatEndRef = useRef(null);
    useEffect(() => { fetchJobs(); }, [fetchJobs]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleAnalyze = async () => {
        if (!jobId || files.length === 0) return;
        setIsProcessing(true);
        try {
            const data = await aiBatchProcess(jobId, files);
            setResults({ shortlisted: data.shortlisted || [], rejected: data.rejected || [] });
            setChatId(data.chat_id);
            setMessages([{ sender: 'AI', text: "Analysis complete. I've mapped the candidates. You can now view specific reasons or send drafted feedback." }]);
        } catch (err) { console.error(err); } 
        finally { setIsProcessing(false); }
    };

    const handleSendFeedback = async (candidate, text) => {
        setSendingFb(prev => ({ ...prev, [candidate.candidate_id]: 'loading' }));
        try {
            const draft = await createFeedbackDraft(candidate.candidate_id, jobId, text);
            await approveFeedback(draft.draft_id || draft.id);
            setSendingFb(prev => ({ ...prev, [candidate.candidate_id]: 'sent' }));
            setSelectedFeedback(null);
        } catch (err) {
            setSendingFb(prev => ({ ...prev, [candidate.candidate_id]: 'error' }));
        }
    };

    const handleChat = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !chatId) return;
        const txt = chatInput; setChatInput('');
        setMessages(p => [...p, { sender: 'User', text: txt }]);
        setIsTyping(true);
        try {
            const res = await sendChatMessage(chatId, txt);
            const botText = res.reply || res.message || res.response || "No response.";
            setMessages(p => [...p, { sender: 'AI', text: botText }]);
        } finally { setIsTyping(false); }
    };

    return (
        <div className="sl-dashboard">
            {/* LEFT SIDEBAR: CONTROL */}
            <aside className="sl-sidebar-left">
                <div className="form-group">
                    <label className="sl-section-title">Target Job Role</label>
                    <select className="form-select" value={jobId} onChange={e => setJobId(e.target.value)}>
                        <option value="">Select Role...</option>
                        {jobDescriptions.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label className="sl-section-title">Upload Resumes</label>
                    <div className="sl-upload-box" onClick={() => document.getElementById('sl-up').click()}>
                        <UploadCloud size={24} />
                        <div style={{fontSize: '0.8rem', marginTop: '5px'}}>Click to upload PDFs</div>
                        <input id="sl-up" type="file" multiple accept=".pdf" hidden onChange={e => setFiles([...files, ...Array.from(e.target.files)])} />
                    </div>
                </div>

                <div className="sl-action-container">
                    <button className="btn" style={{width: '100%'}} onClick={handleAnalyze} disabled={isProcessing || !jobId || !files.length}>
                        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><Sparkles size={18}/> Run Analysis</>}
                    </button>
                </div>

                <div className="form-group">
                    <label className="sl-section-title">Staged Files ({files.length})</label>
                    <div className="sl-file-tray">
                        {files.map((f, i) => (
                            <div key={i} className="sl-file-item">
                                <span className="truncate">{f.name}</span>
                                <X size={14} style={{cursor:'pointer'}} onClick={() => setFiles(files.filter((_, idx) => idx !== i))} />
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            {/* CENTER WORKSPACE: TABLES */}
            <main className="sl-workspace">
                {/* Shortlisted Table */}
                <div className="sl-table-card">
                    <div className="sl-table-header success">
                        <CheckCircle size={18}/> Shortlisted ({results.shortlisted.length})
                    </div>
                    <table className="sl-data-table">
                        <thead><tr><th>Name</th><th>Match</th><th>Actions</th></tr></thead>
                        <tbody>
                            {results.shortlisted.map((c, i) => (
                                <tr key={i}>
                                    <td className="font-bold">{c.name}</td>
                                    <td className="sl-score">{c.match_score}%</td>
                                    <td className="sl-cell-actions">
                                        <button className="btn-table btn-reason" onClick={() => setSelectedExplanation(c)}>Reason</button>
                                        <button 
                                            className={`btn-table btn-feedback ${sendingFb[c.candidate_id] || ''}`} 
                                            onClick={() => setSelectedFeedback({ 
                                                candidate: c, 
                                                text: `${c.explanation.summary}\n\nRecommendation: ${c.explanation.recommendation}` 
                                            })}
                                            disabled={sendingFb[c.candidate_id] === 'sent'}
                                        >
                                            {sendingFb[c.candidate_id] === 'sent' ? 'Sent' : 'Feedback'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Rejected Table */}
                <div className="sl-table-card">
                    <div className="sl-table-header danger">
                        <XCircle size={18}/> Rejected ({results.rejected.length})
                    </div>
                    <table className="sl-data-table">
                        <thead><tr><th>Name</th><th>Match</th><th>Actions</th></tr></thead>
                        <tbody>
                            {results.rejected.map((c, i) => (
                                <tr key={i}>
                                    <td className="font-bold">{c.name}</td>
                                    <td className="sl-score" style={{color: '#dc3545'}}>{c.match_score}%</td>
                                    <td className="sl-cell-actions">
                                        <button 
                                            className={`btn-table btn-feedback ${sendingFb[c.candidate_id] || ''}`} 
                                            onClick={() => setSelectedFeedback({ candidate: c, text: c.feedback })}
                                            disabled={sendingFb[c.candidate_id] === 'sent'}
                                        >
                                            {sendingFb[c.candidate_id] === 'sent' ? 'Sent' : 'Feedback'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* RIGHT SIDEBAR: AI CHAT */}
            <aside className="sl-sidebar-right">
                <div className="sl-chat-header"><Bot size={18} /> Recruitment Copilot</div>
                <div className="sl-chat-viewport">
                    {!chatId ? (
                        <div className="sl-chat-wait-msg">Waiting for analysis...</div>
                    ) : (
                        messages.map((m, i) => <div key={i} className={`sl-bubble ${m.sender.toLowerCase()}`}>{m.text}</div>)
                    )}
                    <div ref={chatEndRef} />
                </div>
                <form className="sl-chat-footer" onSubmit={handleChat}>
                    <input className="form-input" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask Copilot..." disabled={!chatId} />
                    <button className="btn" disabled={!chatId}><Send size={16}/></button>
                </form>
            </aside>

            {/* MODAL: REASONING (SHORTLISTED ONLY) */}
            {selectedExplanation && (
                <div className="sl-modal-overlay" onClick={() => setSelectedExplanation(null)}>
                    <div className="card sl-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="sl-modal-header">
                            <h2 style={{margin:0, fontSize: '1.1rem'}}>AI Reasoning: {selectedExplanation.name}</h2>
                            <X size={20} style={{cursor:'pointer'}} onClick={() => setSelectedExplanation(null)} />
                        </div>
                        <div className="sl-modal-body">
                            <label className="sl-label-small">STRENGTHS</label>
                            <ul className="sl-strength-list">
                                {selectedExplanation.explanation.strengths.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: FEEDBACK PREVIEW & SEND */}
            {selectedFeedback && (
                <div className="sl-modal-overlay" onClick={() => setSelectedFeedback(null)}>
                    <div className="card sl-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="sl-modal-header">
                            <h2 style={{margin:0, fontSize: '1.1rem'}}>Feedback for {selectedFeedback.candidate.name}</h2>
                            <X size={20} style={{cursor:'pointer'}} onClick={() => setSelectedFeedback(null)} />
                        </div>
                        <div className="sl-modal-body">
                            <textarea 
                                className="form-textarea" 
                                value={selectedFeedback.text} 
                                onChange={(e) => setSelectedFeedback({...selectedFeedback, text: e.target.value})}
                                style={{height: '250px', fontSize: '0.85rem'}}
                            />
                            <button 
                                className="btn" 
                                style={{width: '100%', marginTop: '15px'}}
                                onClick={() => handleSendFeedback(selectedFeedback.candidate, selectedFeedback.text)}
                                disabled={sendingFb[selectedFeedback.candidate.candidate_id] === 'loading'}
                            >
                                {sendingFb[selectedFeedback.candidate.candidate_id] === 'loading' ? 'Sending...' : 'Approve & Send Email'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shortlist;