import React, { useState, useEffect, useRef } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { 
    UploadCloud, Loader2, Bot, Send, CheckCircle, 
    XCircle, Sparkles, Target, X, MessageSquare 
} from 'lucide-react';
import './Shortlist.css';

const Shortlist = () => {
    const { 
        jobDescriptions, 
        aiBatchProcess, 
        sendChatMessage, 
        editFeedbackDraft, 
        approveFeedback, 
        fetchJobs 
    } = useRecruiter();
    
    const [jobId, setJobId] = useState('');
    const [files, setFiles] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState({ shortlisted: [], rejected: [] });
    const [chatId, setChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    
    const [selectedExplanation, setSelectedExplanation] = useState(null);
    const [selectedFeedback, setSelectedFeedback] = useState(null);
    const [sendingFb, setSendingFb] = useState({});

    const chatEndRef = useRef(null);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);
    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const formatMessage = (text) => {
        if (!text) return "";
        let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        formatted = formatted.replace(/^\*\s/gm, '• ');
        return <div dangerouslySetInnerHTML={{ __html: formatted }} style={{ whiteSpace: 'pre-wrap' }} />;
    };

    const handleAnalyze = async () => {
        if (!jobId || files.length === 0) return;
        setIsProcessing(true);
        try {
            const data = await aiBatchProcess(jobId, files);
            setResults({ 
                shortlisted: data.shortlisted || [], 
                rejected: data.rejected || [] 
            });
            setChatId(data.chat_id);
            setMessages([{ 
                sender: 'AI', 
                text: "Batch analysis complete. Candidates categorized and **Draft IDs** generated. You can now review the **AI Reasoning** or send **Feedback**." 
            }]);
        } catch (err) { 
            console.error("Analysis Error:", err); 
        } finally { 
            setIsProcessing(false); 
        }
    };

    const handleSendFeedback = async (candidate, text) => {
        const candidateId = candidate.candidate_id;
        const draftId = candidate.draft_id;

        if (!draftId) {
            alert("No Draft ID found for this candidate. Please re-run analysis.");
            return;
        }

        setSendingFb(prev => ({ ...prev, [candidateId]: 'loading' }));
        
        try {
            await editFeedbackDraft(draftId, text);
            await approveFeedback(draftId);
            
            setSendingFb(prev => ({ ...prev, [candidateId]: 'sent' }));
            setSelectedFeedback(null);
        } catch (err) {
            console.error("Feedback flow failed:", err);
            setSendingFb(prev => ({ ...prev, [candidateId]: 'error' }));
        }
    };

    const handleChat = async (e) => {
        e.preventDefault();
        if (!chatInput.trim() || !chatId) return;
        
        const txt = chatInput; 
        setChatInput('');
        setMessages(p => [...p, { sender: 'User', text: txt }]);
        setIsTyping(true);
        
        try {
            const res = await sendChatMessage(chatId, txt);
            const botText = res.reply || res.message || res.response || "No response.";
            setMessages(p => [...p, { sender: 'AI', text: botText }]);
        } catch (err) {
            console.error("Chat Error:", err);
        } finally { 
            setIsTyping(false); 
        }
    };

    return (
        <div className="sl-dashboard">
            <aside className="sl-sidebar-left">
                <div className="form-group">
                    <label className="sl-section-title">Target Job Role</label>
                    <select className="form-select" value={jobId} onChange={e => setJobId(e.target.value)}>
                        <option value="">Select Role...</option>
                        {jobDescriptions.map(j => (
                            <option key={j.id} value={j.id}>{j.title}</option>
                        ))}
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
                        {files.length === 0 ? <p style={{fontSize:'0.75rem', color:'#999', textAlign:'center', marginTop:'20px'}}>No files uploaded</p> : 
                        files.map((f, i) => (
                            <div key={i} className="sl-file-item">
                                <span className="truncate">{f.name}</span>
                                <X size={14} className="pointer" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} />
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            <main className="sl-workspace">
                <div className="sl-table-card">
                    <div className="sl-table-header success"><CheckCircle size={18}/> Shortlisted Candidates ({results.shortlisted.length})</div>
                    <div className="sl-table-responsive">
                        <table className="sl-data-table">
                            <thead>
                                <tr><th>Name</th><th>Match</th><th style={{textAlign: 'right'}}>Actions</th></tr>
                            </thead>
                            <tbody>
                                {results.shortlisted.map((c, i) => (
                                    <tr key={i}>
                                        <td style={{fontWeight: '600'}}>{c.name}</td>
                                        <td className="sl-score">{c.match_score}%</td>
                                        <td className="sl-cell-actions">
                                            <button className="btn-table btn-reason" onClick={() => setSelectedExplanation(c)}>Reason</button>
                                            <button 
                                                className={`btn-table btn-feedback ${sendingFb[c.candidate_id] || ''}`} 
                                                onClick={() => {
                                                    // Reset "sent" status to allow re-sending if modal is re-opened
                                                    setSendingFb(prev => ({ ...prev, [c.candidate_id]: null }));
                                                    setSelectedFeedback({ 
                                                        candidate: c, 
                                                        text: c.feedback || c.explanation?.summary || "" 
                                                    });
                                                }}
                                                disabled={sendingFb[c.candidate_id] === 'loading'}
                                            >
                                                {sendingFb[c.candidate_id] === 'sent' ? 'Resend' : 'Feedback'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="sl-table-card">
                    <div className="sl-table-header danger"><XCircle size={18}/> Rejected Candidates ({results.rejected.length})</div>
                    <div className="sl-table-responsive">
                        <table className="sl-data-table">
                            <thead>
                                <tr><th>Name</th><th>Match</th><th style={{textAlign: 'right'}}>Actions</th></tr>
                            </thead>
                            <tbody>
                                {results.rejected.map((c, i) => (
                                    <tr key={i}>
                                        <td style={{fontWeight: '600'}}>{c.name}</td>
                                        <td className="sl-score" style={{color: '#dc3545'}}>{c.match_score}%</td>
                                        <td className="sl-cell-actions">
                                            <button 
                                                className={`btn-table btn-feedback ${sendingFb[c.candidate_id] || ''}`} 
                                                onClick={() => {
                                                    setSendingFb(prev => ({ ...prev, [c.candidate_id]: null }));
                                                    setSelectedFeedback({ candidate: c, text: c.feedback });
                                                }}
                                                disabled={sendingFb[c.candidate_id] === 'loading'}
                                            >
                                                {sendingFb[c.candidate_id] === 'sent' ? 'Resend' : 'Feedback'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <aside className="sl-sidebar-right">
                <div className="sl-chat-header"><Bot size={18} /> AI Co-Pilot</div>
                <div className="sl-chat-viewport">
                    {!chatId ? <div className="sl-chat-wait-msg">Analysis required to activate chat.</div> : 
                    messages.map((m, i) => (
                        <div key={i} className={`sl-bubble ${m.sender.toLowerCase()}`}>
                            {formatMessage(m.text)}
                        </div>
                    ))}
                    {isTyping && <div className="sl-bubble ai"><div className="typing-dots"><span>.</span><span>.</span><span>.</span></div></div>}
                    <div ref={chatEndRef} />
                </div>
                <form className="sl-chat-footer" onSubmit={handleChat}>
                    <input className="form-input" value={chatInput} onChange={e => setChatInput(e.target.value)} placeholder="Ask Copilot..." disabled={!chatId} />
                    <button className="btn" disabled={!chatId || !chatInput.trim()}><Send size={16}/></button>
                </form>
            </aside>

            {selectedExplanation && (
                <div className="sl-modal-overlay" onClick={() => setSelectedExplanation(null)}>
                    <div className="card sl-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="sl-modal-header">
                            <h2 style={{margin:0, fontSize: '1.2rem'}}>AI Reasoning: {selectedExplanation.name}</h2>
                            <X size={20} className="pointer" onClick={() => setSelectedExplanation(null)} />
                        </div>
                        <div className="sl-modal-body">
                            <label className="sl-label-small">CORE STRENGTHS</label>
                            <ul className="sl-strength-list">
                                {selectedExplanation.explanation?.strengths?.map((s, i) => <li key={i}>{s}</li>) || <li>No data available</li>}
                            </ul>
                            
                            <label className="sl-label-small" style={{marginTop: '20px'}}>AI RECOMMENDATION</label>
                            <div className="sl-recommendation-box">
                                {selectedExplanation.explanation?.recommendation || "Manual review required."}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedFeedback && (
                <div className="sl-modal-overlay" onClick={() => setSelectedFeedback(null)}>
                    <div className="card sl-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="sl-modal-header">
                            <h2 style={{margin:0, fontSize: '1.2rem'}}>Feedback Draft: {selectedFeedback.candidate.name}</h2>
                            <X size={20} className="pointer" onClick={() => setSelectedFeedback(null)} />
                        </div>
                        <div className="sl-modal-body">
                            <label className="sl-label-small">FORMATTED PREVIEW</label>
                            <div className="sl-fb-preview-box">
                                {formatMessage(selectedFeedback.text)}
                            </div>

                            <label className="sl-label-small" style={{marginTop:'15px'}}>EDIT CONTENT</label>
                            <textarea 
                                className="form-textarea" 
                                value={selectedFeedback.text} 
                                onChange={(e) => setSelectedFeedback({...selectedFeedback, text: e.target.value})}
                                style={{height: '220px', fontSize: '0.85rem', lineHeight: '1.5'}}
                            />
                            <button className="btn" style={{width: '100%', marginTop: '15px'}} onClick={() => handleSendFeedback(selectedFeedback.candidate, selectedFeedback.text)}>
                                {sendingFb[selectedFeedback.candidate.candidate_id] === 'loading' ? (
                                    <><Loader2 className="animate-spin" size={14}/> Sending...</>
                                ) : 'Approve & Send '}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Shortlist;