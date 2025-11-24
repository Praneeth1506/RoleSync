import React, { useState } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';

const Shortlist = () => {
  const { jobDescriptions } = useRecruiter();
  const [mode, setMode] = useState('suitability');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [files, setFiles] = useState(null);

  const handleProcess = (e) => {
    e.preventDefault();
    if(!selectedJobId || !files) return alert("Please select a job and upload files.");
    alert(`Processing ${files.length} resumes for job ID: ${selectedJobId} in ${mode} mode.`);
  };

  return (
    <div className="card">
      <h2>Shortlist Candidates</h2>
      
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <button 
            className={`btn ${mode === 'suitability' ? '' : 'btn-secondary'}`} 
            onClick={() => setMode('suitability')}>
            1. Check Suitability
        </button>
        <button 
            className={`btn ${mode === 'bulk' ? '' : 'btn-secondary'}`}
            onClick={() => setMode('bulk')}>
            2. Suggest Best Resumes
        </button>
      </div>

      <form onSubmit={handleProcess} className="flex-row">
        <div className="flex-col">
           <label className="form-label">Select Job Role</label>
           <select className="form-select" value={selectedJobId} onChange={(e) => setSelectedJobId(e.target.value)}>
               <option value="">-- Select Role --</option>
               {jobDescriptions.map(jd => <option key={jd.id} value={jd.id}>{jd.title}</option>)}
           </select>
        </div>
        <div className="flex-col">
           <label className="form-label">Upload Resumes</label>
           <input type="file" multiple className="form-input" onChange={(e) => setFiles(e.target.files)} />
        </div>
        <button type="submit" className="btn" style={{alignSelf: 'flex-end'}}>Analyze</button>
      </form>
    </div>
  );
};

export default Shortlist;