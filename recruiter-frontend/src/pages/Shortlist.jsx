import React, { useState, useCallback } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { 
    FileText, Loader2, X, AlertTriangle, Zap, 
    UploadCloud, MessageSquare, Bot, Send, Trash2, Search, FileX 
} from 'lucide-react';
import './Shortlist.css'; 

const Shortlist = () => {
    const { jobDescriptions, matchSingle, aiBatchProcess, createFeedbackDraft, approveFeedback, editFeedbackDraft, setError, error } = useRecruiter();
    const [view, setView] = useState('single');
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [editableText, setEditableText] = useState('');
    const [currentDraftId, setCurrentDraftId] = useState(null);
    const [isProcessingFeedback, setIsProcessingFeedback] = useState(false);

    // AI Standing-by messaging
    const [chatContext, setChatContext] = useState({ 
        contextId: null, 
        contextTitle: 'AI Co-Pilot', 
        initialMessage: "I'm standing by. Once you analyze some resumes, I'll provide a deep technical breakdown and cultural alignment scores." 
    });

    const handleInitiateFeedback = async (candidateId, jobId, score, name) => {
        setIsProcessingFeedback(true);
        const text = `Dear ${name},\n\nWe've analyzed your profile against our requirements. Your match score is ${score}%.\n\nBest regards,\nRecruitment Team`;
        try {
            const res = await createFeedbackDraft(candidateId, jobId, text);
            setCurrentDraftId(res?.draft?._id || res?._id || res);
            setEditableText(text);
            setShowReviewModal(true);
        } catch (err) { console.error(err); }
        finally { setIsProcessingFeedback(false); }
    };

    const handleResultGenerated = useCallback((jobId, result) => {
        setChatContext({ 
            contextId: result.chat_id || 'active_session', 
            contextTitle: `Live Analysis`, 
            initialMessage: "Analysis complete! I've digested the resumes. Ask me anything, like 'Which candidate has the best problem-solving profile?'" 
        });
    }, []);

    return (
        <div className="shortlist-container">
            <div className="left-column">
                <header className="shortlist-header">
                    <h1 className="page-title">Candidate Shortlisting</h1>
                    <div className="tab-navigation">
                        <button className={`tab-btn ${view === 'single' ? 'active' : ''}`} onClick={() => setView('single')}>Single Match</button>
                        <button className={`tab-btn ${view === 'batch' ? 'active' : ''}`} onClick={() => setView('batch')}>Batch Processing</button>
                    </div>
                </header>

                {view === 'single' ? (
                    <SingleMatchView 
                        jobDescriptions={jobDescriptions} 
                        matchSingle={matchSingle} 
                        handleInitiateFeedback={handleInitiateFeedback}
                        onResultGenerated={handleResultGenerated}
                    />
                ) : (
                    <BatchMatchView 
                        jobDescriptions={jobDescriptions} 
                        aiBatchProcess={aiBatchProcess} 
                        handleInitiateFeedback={handleInitiateFeedback}
                        onResultGenerated={handleResultGenerated}
                    />
                )}
            </div>

            <aside className="right-column">
                <ContextualChatSidebar {...chatContext} />
            </aside>

            {showReviewModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3 className="section-title">Finalize Candidate Feedback</h3>
                            <X className="cursor-pointer" onClick={() => setShowReviewModal(false)} />
                        </div>
                        <textarea value={editableText} onChange={(e) => setEditableText(e.target.value)} className="modal-text" />
                        <button className="primary-btn" onClick={async () => {
                            await editFeedbackDraft(currentDraftId, editableText);
                            await approveFeedback(currentDraftId);
                            setShowReviewModal(false);
                            alert("Feedback sent successfully.");
                        }}>Approve & Send</button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- BATCH MATCH VIEW ---
const BatchMatchView = ({ jobDescriptions, aiBatchProcess, handleInitiateFeedback, onResultGenerated }) => {
    const [jobId, setJobId] = useState('');
    const [files, setFiles] = useState([]);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    const runBatch = async () => {
        setLoading(true);
        try {
            const res = await aiBatchProcess(jobId, files);
            setResults(res.shortlisted || []);
            onResultGenerated(jobId, res);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    return (
        <div className="view-grid animate-in">
            <div className="config-card card">
                <h3 className="section-title">Batch Setup</h3>
                <label className="input-label">Target Role</label>
                <select className="form-input" value={jobId} onChange={e => setJobId(e.target.value)}>
                    <option value="">Choose role...</option>
                    {jobDescriptions.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
                
                <div className="upload-zone" onClick={() => document.getElementById('b-up').click()}>
                    <UploadCloud size={32} />
                    <p>{files.length > 0 ? `${files.length} resumes staged` : 'Drag & drop multiple PDFs'}</p>
                    <input id="b-up" type="file" multiple accept=".pdf" hidden onChange={e => setFiles([...files, ...Array.from(e.target.files)])} />
                </div>

                {files.length > 0 && (
                    <div className="staged-container">
                        <div className="staged-header">
                            <span>STAGED FILES ({files.length})</span>
                            <button className="clear-link" onClick={() => setFiles([])}>Clear All</button>
                        </div>
                        {files.map((f, i) => (
                            <div key={i} className="staged-row">
                                <span className="truncate">{f.name}</span>
                                <Trash2 size={14} className="trash-icon" onClick={(e) => { e.stopPropagation(); setFiles(files.filter((_, idx) => idx !== i)); }} />
                            </div>
                        ))}
                    </div>
                )}

                <button onClick={runBatch} className="primary-btn" disabled={loading || !jobId || files.length === 0}>
                    {loading ? <Loader2 className="spin" /> : `Analyze ${files.length} Resumes`}
                </button>
            </div>

            <div className="result-card card">
                <h3 className="section-title">Ranking Table</h3>
                {results ? (
                    <table className="results-table">
                        <thead><tr><th>Candidate</th><th>Match</th><th>ATS</th><th>Action</th></tr></thead>
                        <tbody>
                            {results.map((r, i) => (
                                <tr key={i}>
                                    <td><div className="name-cell"><strong>{r.name || 'Unknown'}</strong><small>{r.email}</small></div></td>
                                    <td><span className={`badge-pill ${r.match_score > 0 ? 'high' : 'fail'}`}>{r.match_score > 0 ? `${r.match_score}%` : 'N/A'}</span></td>
                                    <td><span className="ats-score">{r.ats_score > 0 ? `${r.ats_score}%` : '---'}</span></td>
                                    <td>
                                        {r.match_score > 0 ? (
                                            <button className="review-btn" onClick={() => handleInitiateFeedback(r.candidate_id, jobId, r.match_score, r.name)}>Review</button>
                                        ) : (
                                            <span className="text-status-error">Invalid File</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : <div className="empty-state"><p>Standing by for batch analysis...</p></div>}
            </div>
        </div>
    );
};

// --- SINGLE MATCH VIEW ---
const SingleMatchView = ({ jobDescriptions, matchSingle, handleInitiateFeedback, onResultGenerated }) => {
    const [jobId, setJobId] = useState('');
    const [file, setFile] = useState(null);
    const [res, setRes] = useState(null);
    const [loading, setLoading] = useState(false);

    const runSingle = async () => {
        setLoading(true);
        try {
            const data = await matchSingle(jobId, file);
            setRes(data);
            onResultGenerated(jobId, data);
        } catch (e) { 
            console.error(e);
            setRes({ error: "Could not read this resume. Please ensure the PDF is not password protected and contains selectable text." });
        }
        finally { setLoading(false); }
    };

    return (
        <div className="view-grid animate-in">
            <div className="config-card card">
                <h3 className="section-title">Individual Analysis</h3>
                <label className="input-label">Target Role</label>
                <select className="form-input" value={jobId} onChange={e => setJobId(e.target.value)}>
                    <option value="">Select Role...</option>
                    {jobDescriptions.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>

                <div className="upload-zone" onClick={() => document.getElementById('s-up').click()}>
                    <UploadCloud size={32} />
                    <p>{file ? file.name : 'Select resume PDF'}</p>
                    <input id="s-up" type="file" accept=".pdf" hidden onChange={e => setFile(e.target.files[0])} />
                </div>

                {file && (
                     <div className="staged-container">
                        <div className="staged-row">
                            <span className="truncate">{file.name}</span>
                            <Trash2 size={14} className="trash-icon" onClick={() => setFile(null)} />
                        </div>
                    </div>
                )}

                <button className="primary-btn mt-4" onClick={runSingle} disabled={loading || !file || !jobId}>
                    {loading ? <Loader2 className="spin" /> : 'Compare Match'}
                </button>
            </div>

            <div className="result-card card">
                <h3 className="section-title">Result Matrix</h3>
                {res ? (
                    res.error ? (
                        <div className="error-state-box text-center">
                            <FileX size={48} className="mx-auto text-red-400 mb-4" />
                            <p className="text-red-500 font-bold">Unprocessable File</p>
                            <p className="text-gray-400 text-sm px-8 mt-2">{res.error}</p>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className="score-circle">{res.match_score || res.score}%</div>
                            <p className="mt-6 text-gray-500 text-sm">Review deep technical details in the AI Sidebar.</p>
                        </div>
                    )
                ) : <div className="empty-state"><p>Standing by for resume selection...</p></div>}
            </div>
        </div>
    );
};

// --- SIDEBAR ---
const ContextualChatSidebar = ({ contextId, contextTitle, initialMessage }) => {
    const isWaiting = !contextId;
    return (
        <div className="chat-wrapper">
            <div className={`chat-header ${isWaiting ? 'waiting' : 'active'}`}>
                <Bot size={18}/> <span>{contextTitle}</span>
            </div>
            <div className="chat-body">
                <div className={`chat-bubble bot ${isWaiting ? 'dormant' : ''}`}>
                    {initialMessage}
                </div>
            </div>
            <div className="chat-footer">
                <div className={`chat-input-bar ${isWaiting ? 'idle' : ''}`}>
                    <input className="chat-input" placeholder={isWaiting ? "Waiting for context..." : "Ask me anything about the analysis..."} disabled={isWaiting} />
                    <button className="chat-send-btn" disabled={isWaiting}><Send size={16}/></button>
                </div>
            </div>
        </div>
    );
};

export default Shortlist;