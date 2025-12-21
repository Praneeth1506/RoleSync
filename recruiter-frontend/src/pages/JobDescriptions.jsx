import React, { useState, useEffect } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { Plus, X, UploadCloud, FileText, Loader2, Edit, Trash2 } from 'lucide-react';

import './JobDescription.css';

// --- Reusable Component for Create/Edit Form ---
const JobRoleForm = ({ mode, jobData, closeModal }) => {
    const { addJobDescription, updateJobDescription, setError, error } = useRecruiter();

    const [formData, setFormData] = useState({
        title: jobData?.title || '',
        location: jobData?.location || '',
    });
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState(null);

    const isEditMode = mode === 'edit';

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'application/pdf') {
            setFile(selectedFile);
            setLocalError(null);
        } else {
            setFile(null);
            if (selectedFile) setLocalError("Please upload a valid PDF file.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);
        setError(null); 

        if (!formData.title.trim()) {
            setLocalError("Job title is required.");
            return;
        }
        
        setIsSubmitting(true);
        try {
            if (isEditMode) {
                // Prepare Payload for Update
                const updatePayload = {
                    title: formData.title.trim(),
                    location: formData.location.trim(),
                    jd_file: file // Only sent if user picks a new file
                };
                // jobData.id is now guaranteed by our fixed Context
                await updateJobDescription(jobData.id, updatePayload);
            } else {
                if (!file) {
                    setLocalError("A Job Description PDF is required.");
                    setIsSubmitting(false);
                    return;
                }
                await addJobDescription(formData.title.trim(), file);
            }
            closeModal();
        } catch (err) {
            setLocalError(err.message || 'Operation failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="animate-in">
            <h3 className="section-title">{isEditMode ? `Edit Role` : 'New Job Role'}</h3>
            
            {(localError || error) && (
                <div className="error-banner">
                    {localError || error}
                </div>
            )}

            <div className="form-group">
                <label className="input-label">Job Title</label>
                <input 
                    type="text" 
                    className="form-input" 
                    value={formData.title} 
                    onChange={(e) => setFormData({...formData, title: e.target.value})} 
                    required
                />
            </div>
            
             <div className="form-group">
                <label className="input-label">Location</label>
                <input 
                    type="text" 
                    className="form-input" 
                    value={formData.location} 
                    onChange={(e) => setFormData({...formData, location: e.target.value})} 
                    placeholder="e.g. Remote, NYC"
                />
            </div>

            <div className="form-group">
                <label className="input-label">
                    {isEditMode ? 'Replace JD File (Optional)' : 'Upload JD (PDF)'}
                </label>
                <div className="upload-zone" onClick={() => document.getElementById('f-up').click()}>
                    <UploadCloud size={24} />
                    <p>{file ? file.name : 'Click to select PDF'}</p>
                    <input id="f-up" type="file" accept=".pdf" hidden onChange={handleFileChange} />
                </div>
            </div>
            
            <button type="submit" className="primary-btn" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="spin" /> : (isEditMode ? 'Update Role' : 'Create Role')}
            </button>
        </form>
    );
};

// --- Main Component ---
const JobDescriptions = () => {
    const { jobDescriptions, getJobRoleDetails, deleteJobDescription, loading, fetchJobs } = useRecruiter();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); 
    const [selectedJob, setSelectedJob] = useState(null); 
    const [isDeleting, setIsDeleting] = useState(null);

    useEffect(() => { fetchJobs(); }, [fetchJobs]);

    const handleEdit = async (jobId) => {
        setModalMode('edit');
        setIsModalOpen(true);
        setSelectedJob(null); 
        try {
            const details = await getJobRoleDetails(jobId);
            setSelectedJob(details); 
        } catch (err) { setIsModalOpen(false); }
    };

    const handleDelete = async (job) => {
        if (window.confirm(`Delete "${job.title}"?`)) {
            setIsDeleting(job.id);
            try { await deleteJobDescription(job.id); } 
            catch (err) { alert(err.message); } 
            finally { setIsDeleting(null); }
        }
    };

    return (
        <div className="job-container">
            <div className="flex-header">
                <h1 className="page-title">Job Descriptions</h1>
                <button className="primary-btn-sm" onClick={() => { setModalMode('create'); setIsModalOpen(true); }}>
                    <Plus size={18} /> Add Role
                </button>
            </div>

            <div className="job-list-grid">
                {loading && jobDescriptions.length === 0 ? (
                    <div className="loader-box"><Loader2 className="spin" /></div>
                ) : jobDescriptions.length === 0 ? (
                    <div className="empty-state">No roles found. Create one to start matching.</div>
                ) : (
                    jobDescriptions.map((job) => (
                        <div key={job.id} className="job-card-item">
                            <div className="job-card-info">
                                <h3>{job.title}</h3>
                                <span>{job.location || 'No Location'} • ID: {job.id.slice(-6)}</span>
                            </div>
                            <div className="job-card-actions">
                                <button className="icon-btn edit" onClick={() => handleEdit(job.id)}><Edit size={18} /></button>
                                <button className="icon-btn delete" onClick={() => handleDelete(job)} disabled={isDeleting === job.id}>
                                    {isDeleting === job.id ? <Loader2 className="spin" /> : <Trash2 size={18} />}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content-box">
                        <button className="close-x" onClick={() => setIsModalOpen(false)}><X size={20}/></button>
                        {modalMode === 'edit' && !selectedJob ? (
                            <div className="loader-box"><Loader2 className="spin" /></div>
                        ) : (
                            <JobRoleForm mode={modalMode} jobData={selectedJob} closeModal={() => setIsModalOpen(false)} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobDescriptions;