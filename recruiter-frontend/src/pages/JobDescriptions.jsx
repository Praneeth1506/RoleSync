import React, { useState } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';

const JobDescriptions = () => {
  const { jobDescriptions, addJobDescription } = useRecruiter();
  const [newJob, setNewJob] = useState({ title: '', description: '' });

  const handleCreate = (e) => {
    e.preventDefault();
    if (newJob.title && newJob.description) {
      addJobDescription(newJob.title, newJob.description);
      setNewJob({ title: '', description: '' });
      alert("Job Added!");
    }
  };

  return (
    <div className="flex-row">
      <div className="flex-col card">
        <h2>Create Job Description</h2>
        <form onSubmit={handleCreate}>
          <div className="form-group">
            <label className="form-label">Job Title</label>
            <input
              className="form-input"
              value={newJob.title}
              onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
              placeholder="e.g. Data Scientist"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Requirements</label>
            <textarea
              className="form-textarea"
              value={newJob.description}
              onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
              placeholder="List requirements..."
            />
          </div>
          <button type="submit" className="btn">Save Job Role</button>
        </form>
      </div>

      <div className="flex-col card">
        <h2>Existing Roles</h2>
        {jobDescriptions.length === 0 ? <p>No jobs yet.</p> : (
          <ul>
            {jobDescriptions.map((jd) => (
              <li key={jd.id} style={{marginBottom: '10px'}}>
                <strong>{jd.title}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default JobDescriptions;