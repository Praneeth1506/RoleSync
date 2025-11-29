import React, { useState } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { FileText, Eye, UploadCloud, Edit2, X, CheckCircle } from 'lucide-react';

const JobDescriptions = () => {
  const { jobDescriptions, addJobDescription, updateJobDescription } = useRecruiter();
  
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  
  // State to track which ID we are editing (null means Create Mode)
  const [editingId, setEditingId] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleEditClick = (jd) => {
    setEditingId(jd.id);
    setTitle(jd.title);
    setFile(null); // Reset file input (user only uploads if they want to replace it)
    
    // Scroll to top to focus on form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setFile(null);
    // Reset the actual DOM input value
    const input = document.getElementById('jd-file-input');
    if (input) input.value = "";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingId) {
        // --- UPDATE MODE ---
        if (!title) return alert("Title is required.");
        
        updateJobDescription(editingId, title, file);
        alert("Job Description Updated Successfully!");
        handleCancelEdit(); // Reset form and exit edit mode
    } else {
        // --- CREATE MODE ---
        if (title && file) {
            addJobDescription(title, file);
            handleCancelEdit(); // Reset form
            alert("Job Description Created!");
        } else {
            alert("Please provide a title and a requirements file.");
        }
    }
  };

  return (
    <>
      {/* Merged CSS Styles */}
      <style>{`
        /* Wrapper for the file input */
        .file-upload-wrapper {
          position: relative;
          width: 100%;
          margin-bottom: 8px;
        }

        /* 1. Hide the default ugly input */
        .hidden-input {
          position: absolute;
          width: 0.1px;
          height: 0.1px;
          opacity: 0;
          overflow: hidden;
          z-index: -1;
        }

        /* 2. Style the Label to look like a professional Dropzone */
        .custom-file-label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px;
          border: 2px dashed #cbd5e1; /* Light grey dashed border */
          border-radius: 12px;
          background-color: #f8fafc;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        /* Hover effects */
        .custom-file-label:hover {
          border-color: #2563eb; /* Blue border on hover */
          background-color: #eff6ff; /* Light blue bg */
          color: #2563eb;
        }

        /* Active/Focus state */
        .custom-file-label:active {
          transform: scale(0.99);
          background-color: #e0e7ff;
        }

        /* Edit Mode styling (Orange theme) */
        .custom-file-label.edit-mode {
          border-color: #fdba74;
          background-color: #fff7ed;
          color: #c2410c;
        }

        .custom-file-label.edit-mode:hover {
          border-color: #f97316;
          background-color: #ffedd5;
        }

        /* Text styling inside the upload box */
        .upload-text {
          margin-top: 12px;
          font-weight: 500;
          font-size: 0.95rem;
        }

        .upload-subtext {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 4px;
        }

        /* Success state (when file is selected) */
        .file-selected {
          border-color: #22c55e;
          background-color: #f0fdf4;
          color: #15803d;
        }

        /* --- New Action Button Styles --- */
        .edit-icon-btn {
          padding: 8px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          background-color: #ffffff;
          cursor: pointer;
          color: #64748b; /* Default Icon Color */
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }

        .edit-icon-btn:hover {
          color: #f97316; /* Orange on Hover */
          border-color: #fdba74;
          background-color: #fff7ed;
        }
      `}</style>

      <div className="flex-row">
        {/* LEFT COLUMN: FORM */}
        <div className="flex-col card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h2 style={{ margin: 0 }}>{editingId ? 'Edit Job Description' : 'Create New Role'}</h2>
              {editingId && (
                  <button 
                      onClick={handleCancelEdit}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                  >
                      <X size={16} /> Cancel
                  </button>
              )}
          </div>
          <p style={{ marginBottom: '24px', color: '#64748b' }}>
              {editingId ? 'Update the role details below.' : 'Define the role and upload the requirements document.'}
          </p>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Job Role Title</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Data Analyst"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                  {editingId ? 'Requirements Document (Optional)' : 'Requirements Document'}
              </label>
              
              <div className="file-upload-wrapper">
                  {/* 1. The Invisible Input */}
                  <input
                      id="jd-file-input"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden-input"
                      required={!editingId} // Only required when creating new
                  />
                  
                  {/* 2. The Styled Label acting as the button */}
                  <label 
                      htmlFor="jd-file-input" 
                      className={`custom-file-label ${editingId ? 'edit-mode' : ''} ${file ? 'file-selected' : ''}`}
                  >
                      {file ? <CheckCircle size={32} /> : <UploadCloud size={32} />}
                      
                      <span className="upload-text">
                          {file ? file.name : (editingId ? "Click to replace file" : "Click to upload requirements")}
                      </span>
                      
                      <span className="upload-subtext">
                          {file ? "File selected - Ready to save" : "PDF or DOCX (Max 5MB)"}
                      </span>
                  </label>
              </div>
            </div>
            
            <button 
              type="submit" 
              className="btn" 
              style={{ width: '100%', backgroundColor: editingId ? '#f97316' : '#2563eb' }}
            >
              {editingId ? 'Update Changes' : 'Create Job Role'}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: LIST */}
        <div className="flex-col card">
          <h2>Active Job Roles</h2>
          {jobDescriptions.length === 0 ? (
            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No job descriptions uploaded yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {jobDescriptions.map((jd) => (
                <div key={jd.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    background: 'white',
                    // Highlight the card being edited
                    borderLeft: editingId === jd.id ? '4px solid #f97316' : '1px solid #e2e8f0',
                    transition: 'all 0.2s',
                    boxShadow: editingId === jd.id ? '0 4px 6px -1px rgba(249, 115, 22, 0.1)' : 'none'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ background: '#eff6ff', padding: '10px', borderRadius: '8px' }}>
                          <FileText size={20} color="#2563eb" />
                      </div>
                      <div>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{jd.title}</div>
                          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                              {jd.fileName || <span style={{ fontStyle: 'italic' }}>No file</span>}
                          </div>
                      </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                      {/* Edit Button */}
                      <button 
                          onClick={() => handleEditClick(jd)}
                          className="edit-icon-btn" // Use new class here
                          title="Edit Job"
                      >
                          <Edit2 size={16} /> {/* Removed hardcoded color to allow CSS hover */}
                      </button>

                      {/* View File Button */}
                      {jd.fileUrl && (
                          <a 
                              href={jd.fileUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="btn-secondary"
                              style={{ 
                                  padding: '8px 12px', textDecoration: 'none', 
                                  display: 'flex', alignItems: 'center', gap: '6px', 
                                  fontSize: '0.85rem', borderRadius: '6px', 
                                  border: '1px solid #e2e8f0', 
                                  backgroundColor: '#ffffff', // Explicitly set to white
                                  color: '#333'
                              }}
                          >
                              <Eye size={16} /> View
                          </a>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default JobDescriptions;