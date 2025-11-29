import React, { useState, useEffect, useRef } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Send, Sparkles, Trash2, X, Loader2 } from 'lucide-react';
import './Shortlist.css';

const Shortlist = () => {
  const { jobDescriptions } = useRecruiter();
  
  // State
  const [mode, setMode] = useState('single'); 
  const [selectedJobId, setSelectedJobId] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: "Hello! I'm ready to assist. Upload a resume to screen it against your job description." }
  ]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const switchMode = (newMode) => {
    setMode(newMode);
    setUploadedFiles([]); 
    setResults(null);
    setChatMessages(prev => [...prev, { sender: 'bot', text: `Switched to ${newMode === 'single' ? 'Single Check' : 'Bulk Shortlist'} mode.` }]);
  };

  const handleFileChange = (e) => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (mode === 'single') {
        const file = e.target.files[0];
        setUploadedFiles([file]); 
        setChatMessages(prev => [...prev, { sender: 'bot', text: `Uploaded "${file.name}". Ready to analyze.` }]);
    } else {
        const newFiles = Array.from(e.target.files);
        setUploadedFiles((prev) => [...prev, ...newFiles]);
        setChatMessages(prev => [...prev, { sender: 'bot', text: `Added ${newFiles.length} files.` }]);
    }
    e.target.value = '';
  };

  const removeFile = (indexToRemove) => {
    setUploadedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleAnalyze = (e) => {
    e.preventDefault();
    
    // --- BETTER VALIDATION LOGIC ---
    // Instead of disabling the button, we check here and show an alert
    if (!selectedJobId) {
        alert("⚠️ Please select a Job Role first.");
        return;
    }
    if (uploadedFiles.length === 0) {
        alert("⚠️ Please upload at least one resume.");
        return;
    }

    setIsAnalyzing(true);
    setResults(null);

    // Mock Backend Logic
    setTimeout(() => {
      setIsAnalyzing(false);
      
      if (mode === 'single') {
        const score = Math.floor(Math.random() * (95 - 60) + 60);
        setResults({
          type: 'single',
          candidateName: uploadedFiles[0].name,
          score: score,
          isSuitable: score > 75,
          feedback: score > 75 
            ? "Strong match. The candidate has relevant skills in React and Node.js." 
            : "Moderate match. Missing experience in System Design."
        });
        setChatMessages(prev => [...prev, { sender: 'bot', text: `Analysis complete. Score: ${score}%. You can ask me specific questions about their experience.` }]);
      } else {
        const processed = uploadedFiles.map(file => ({
            name: file.name,
            score: Math.floor(Math.random() * (98 - 50) + 50)
        })).sort((a, b) => b.score - a.score);

        const shortlisted = processed.filter(c => c.score >= 75);
        const rejected = processed.filter(c => c.score < 75);

        setResults({ type: 'bulk', total: processed.length, shortlisted, rejected });
        setChatMessages(prev => [...prev, { sender: 'bot', text: `Processed ${processed.length} resumes. ${shortlisted.length} candidates look promising.` }]);
      }
    }, 1500);
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    setTimeout(() => {
        let botResponse = "Checking the resume...";
        if (userMsg.toLowerCase().includes("why")) {
            botResponse = "The score reflects missing keywords like 'Docker' and 'TypeScript' which were in your Job Description.";
        } else if (userMsg.toLowerCase().includes("experience")) {
            botResponse = "The candidate has 3 years of total experience, but only 1 year relevant to this specific role.";
        } else if (userMsg.toLowerCase().includes("contact") || userMsg.toLowerCase().includes("email")) {
             botResponse = "I found the email: candidate@example.com.";
        } else {
            botResponse = "This is mentioned in the 'Projects' section of the resume. They worked on a similar architecture in 2023.";
        }
        setChatMessages(prev => [...prev, { sender: 'bot', text: botResponse }]);
    }, 800);
  };

  return (
    <div className="shortlist-container">
      
      {/* ================= LEFT COLUMN ================= */}
      <div className="left-column"> 
        
        <div className="tab-container">
            <div className="tab-group">
                <button 
                    className={`tab-btn ${mode === 'single' ? 'active' : ''}`}
                    onClick={() => switchMode('single')}
                >
                    Single Check
                </button>
                <button 
                    className={`tab-btn ${mode === 'bulk' ? 'active' : ''}`}
                    onClick={() => switchMode('bulk')}
                >
                    Bulk Shortlist
                </button>
            </div>
        </div>

        <div className="card">
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>{mode === 'single' ? 'Analyze Candidate' : 'Filter Candidates'}</h3>
            
            <form onSubmit={handleAnalyze}>
                <div className="form-group">
                    <label className="form-label">Job Role</label>
                    <select 
                        className="form-select" 
                        value={selectedJobId} 
                        onChange={(e) => setSelectedJobId(e.target.value)}
                        // Removed required attribute so we can show custom alerts
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                    >
                        <option value="">-- Select Role --</option>
                        {jobDescriptions.map(jd => (
                            <option key={jd.id} value={jd.id}>{jd.title}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <div className="upload-box">
                        <UploadCloud size={32} color="#94a3b8" />
                        <p style={{ margin: '10px 0', fontSize: '0.9rem', color: '#64748b' }}>
                            {mode === 'single' 
                                ? 'Click to select a resume (PDF/DOCX)'
                                : 'Drag files or click to upload multiple'}
                        </p>
                        
                        <input 
                            key={mode} 
                            className="upload-input"
                            type="file" 
                            accept=".pdf,.doc,.docx"
                            multiple={mode === 'bulk'}
                            onChange={handleFileChange}
                        />
                    </div>
                </div>

                {uploadedFiles.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px', color: '#64748b' }}>
                            <span>
                                {mode === 'single' ? 'Selected File' : `Files (${uploadedFiles.length})`}
                            </span>
                            <span onClick={() => setUploadedFiles([])} style={{ color: '#ef4444', cursor: 'pointer', fontWeight: '600' }}>Clear All</span>
                         </div>
                         
                         <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {uploadedFiles.map((f, i) => (
                                <div key={i} style={{ 
                                    background: '#f1f5f9', 
                                    padding: '8px 12px', 
                                    borderRadius: '8px', 
                                    fontSize: '0.85rem', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <FileText size={16} color="#64748b" /> 
                                    <span style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                        {f.name}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(i)}
                                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center', color: '#94a3b8' }}
                                        title="Remove file"
                                    >
                                        <X size={16} className="hover:text-red-500" />
                                    </button>
                                </div>
                            ))}
                         </div>
                    </div>
                )}

                {/* --- PROFESSIONAL BUTTON --- */}
                <button 
                    type="submit" 
                    className="btn-analyze" 
                    disabled={isAnalyzing} // Only disable if processing
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 size={20} className="spin-anim" /> Processing...
                        </>
                    ) : (
                        <>
                            {mode === 'single' ? 'Analyze Candidate' : 'Shortlist Best'} <Sparkles size={18} />
                        </>
                    )}
                </button>
            </form>
        </div>

        {results && (
            <div className="card result-card">
                {results.type === 'single' && (
                    <div style={{ textAlign: 'center' }}>
                         <div className={`score-badge ${results.isSuitable ? 'success' : 'warning'}`}>
                             {results.isSuitable ? <CheckCircle size={24}/> : <AlertCircle size={24}/>}
                             <h2 style={{ margin: 0, marginLeft: '10px' }}>{results.score}% Match</h2>
                         </div>
                         <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{results.candidateName}</p>
                         <p style={{ color: '#64748b' }}>{results.feedback}</p>
                    </div>
                )}

                {results.type === 'bulk' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3>Shortlist Results</h3>
                            <span style={{ fontSize: '0.85rem', background: '#e2e8f0', padding: '4px 8px', borderRadius: '4px' }}>
                                Analyzed {results.total}
                            </span>
                        </div>

                        <h4 style={{ color: '#16a34a', marginBottom: '10px' }}>
                            ✅ Shortlisted ({results.shortlisted.length})
                        </h4>
                        {results.shortlisted.length === 0 ? <p style={{ fontSize: '0.9rem', color: '#64748b' }}>No candidates met the criteria.</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                                {results.shortlisted.map((c, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                                        <strong>{c.name}</strong>
                                        <span style={{ fontWeight: 'bold', color: '#15803d' }}>{c.score}%</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <h4 style={{ color: '#dc2626', marginBottom: '10px', marginTop: '20px' }}>
                            ❌ Rejected ({results.rejected.length})
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {results.rejected.map((c, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#fef2f2', borderRadius: '6px', opacity: 0.7 }}>
                                    <span style={{ color: '#7f1d1d' }}>{c.name}</span>
                                    <span style={{ color: '#991b1b' }}>{c.score}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {/* ================= RIGHT COLUMN: AI CHAT ================= */}
      <div className="right-column">
         <div className="chat-wrapper">
            <div className="chat-header">
                <Sparkles size={18} fill="#fbbf24" stroke="none" />
                <span>AI Assistant</span>
            </div>

            <div className="chat-body">
                {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.sender}`}>
                        {msg.text}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>

            <div className="chat-footer">
                <form onSubmit={handleChatSubmit} className="chat-form">
                    <input 
                        className="chat-input"
                        type="text" 
                        placeholder="Ask about the candidate..." 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button type="submit" disabled={!chatInput.trim()} className="chat-send-btn">
                        <Send size={18} />
                    </button>
                </form>
            </div>
         </div>
      </div>

    </div>
  );
};

export default Shortlist;