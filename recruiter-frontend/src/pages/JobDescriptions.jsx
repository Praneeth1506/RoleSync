import React, { useState, useEffect } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { Plus, X, UploadCloud, FileText, Loader2, Edit, Trash2 } from 'lucide-react';

import './JobDescription.css';

// --- Reusable Component for Create/Edit Form ---
const JobRoleForm = ({ mode, jobData, closeModal }) => {
    const { 
        addJobDescription, 
        updateJobDescription, 
        setError, 
        error 
    } = useRecruiter();

    const [formData, setFormData] = useState({
        title: jobData?.title || '',
        location: jobData?.location || '',
        required_skills: jobData?.required_skills?.join(', ') || '',
    });
    const [file, setFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [localError, setLocalError] = useState(null);

    const isEditMode = mode === 'edit';

    useEffect(() => {
        if (jobData && isEditMode) {
            setFormData({
                title: jobData.title || '',
                location: jobData.location || '',
                required_skills: jobData.required_skills?.join(', ') || '',
            });
        }
    }, [jobData, isEditMode]);

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

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLocalError(null);
        setError(null); 

        if (!formData.title.trim()) {
            setLocalError("Job title is required.");
            return;
        }
        if (!isEditMode && !file) {
            setLocalError("A Job Description PDF is required for creation.");
            return;
        }
        
        setIsSubmitting(true);
        try {
            if (isEditMode) {
                const payload = {
                    title: formData.title.trim(),
                    location: formData.location.trim(),
                    required_skills: formData.required_skills.split(',').map(s => s.trim()).filter(s => s),
                    // IMPORTANT: Missing fields like responsibilities, experience_min, etc., 
                    // must be manually added to the payload or backend must be updated to ignore them.
                };
                await updateJobDescription(jobData.id, payload);

            } else {
                await addJobDescription(formData.title.trim(), file);
            }
            
            closeModal();
        } catch (err) {
            console.error("Job operation failed:", err);
            setLocalError(`Operation failed. ${err.message || 'Check connection.'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <h3>{isEditMode ? `Edit Role: ${jobData?.title}` : 'Create New Job Role'}</h3>
            
            {(localError || error) && (
                <div style={{ color: '#842029', backgroundColor: '#f8d7da', padding: '10px', borderRadius: '4px', marginBottom: '15px' }}>
                    {localError || `Context Error: ${error}`}
                </div>
            )}

            {/* Job Title Input */}
            <div className="form-group">
                <label className="form-label">Job Title / Role Name</label>
                <input 
                    type="text" 
                    className="form-input" 
                    name="title"
                    value={formData.title} 
                    onChange={handleChange} 
                    required
                    disabled={isSubmitting}
                />
            </div>
            
            {/* Location Input (Example Metadata) */}
             <div className="form-group">
                <label className="form-label">Location</label>
                <input 
                    type="text" 
                    className="form-input" 
                    name="location"
                    value={formData.location} 
                    onChange={handleChange} 
                    disabled={isSubmitting}
                />
            </div>
            
            {/* Required Skills Input (Example Metadata) */}
             <div className="form-group">
                <label className="form-label">Required Skills (Comma separated)</label>
                <input 
                    type="text" 
                    className="form-input" 
                    name="required_skills"
                    value={formData.required_skills} 
                    onChange={handleChange} 
                    disabled={isSubmitting}
                />
            </div>


            {/* File Upload (Required for Create, Optional for Edit) */}
            {!isEditMode && (
                <div className="form-group">
                    <label className="form-label">Upload Job Description (PDF)</label>
                    <div 
                        className="file-upload-box"
                        style={{ border: '2px dashed #cbd5e1', padding: '20px', textAlign: 'center', cursor: 'pointer' }}
                        onClick={() => document.getElementById('file-input').click()}
                    >
                        <input 
                            type="file" 
                            id="file-input" 
                            accept=".pdf" 
                            onChange={handleFileChange} 
                            style={{ display: 'none' }}
                            disabled={isSubmitting}
                        />
                        {file ? (
                            <p style={{ color: '#0f5132', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FileText size={18} style={{ marginRight: '8px' }} /> {file.name}
                            </p>
                        ) : (
                            <p style={{ color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <UploadCloud size={24} style={{ marginRight: '8px' }} /> Click to upload PDF
                            </p>
                        )}
                    </div>
                </div>
            )}
            
            <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={isSubmitting || !formData.title.trim() || (!isEditMode && !file)}
                style={{ width: '100%', marginTop: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
                {isSubmitting ? <Loader2 className="spin-anim" size={18} /> : <Plus size={18} />}
                {isSubmitting ? 'Saving Role...' : isEditMode ? 'Save Changes' : 'Create Role'}
            </button>
        </form>
    );
};


// --- Main Job Descriptions Component ---
const JobDescriptions = () => {
    const { jobDescriptions, getJobRoleDetails, loading, fetchJobs } = useRecruiter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); 
    const [selectedJob, setSelectedJob] = useState(null); 

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    const handleEditClick = async (jobId) => {
        setModalMode('edit');
        setIsModalOpen(true);
        setSelectedJob(null); 
        
        try {
            const details = await getJobRoleDetails(jobId);
            setSelectedJob(details); 
        } catch (err) { 
            console.error("Failed to load job details for editing:", err); 
            setIsModalOpen(false);
        }
    };
    
    const openCreateModal = () => {
        setModalMode('create');
        setSelectedJob(null);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedJob(null);
    };


    return (
        <div className="job-descriptions container">
            <h1 className="page-title">Job Descriptions</h1>
            <button className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={18} style={{ marginRight: '8px' }}/> Add New Role
            </button>

            <div className="job-list" style={{ marginTop: '20px' }}>
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>Loading roles...</p>
                ) : jobDescriptions.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '40px' }}>
                        No job roles defined yet. Add one to get started!
                    </p>
                ) : (
                    jobDescriptions.map((job) => (
                        <div key={job.id} className="job-card card" style={{ marginBottom: '15px' }}>
                            <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <h3 style={{ margin: 0 }}>{job.title}</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>ID: {job.id}</p>
                                </div>
                                <div>
                                    <button 
                                        className="btn btn-secondary btn-sm" 
                                        onClick={() => handleEditClick(job.id)} 
                                        style={{ marginRight: '10px' }}
                                    >
                                        <Edit size={16} />
                                    </button>
                                    <button className="btn btn-danger btn-sm" disabled>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>


            {/* Create/Edit Job Modal */}
            {isModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal-content" style={{ width: '450px' }}>
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="close-btn" onClick={closeModal}><X size={20} /></button>
                        </div>
                        
                        {(modalMode === 'edit' && !selectedJob) ? (
                             <div style={{ textAlign: 'center', padding: '40px' }}>
                                <Loader2 className="spin-anim" size={24} style={{ margin: '0 auto 10px' }}/>
                                Loading job details...
                             </div>
                        ) : (
                            <JobRoleForm 
                                mode={modalMode} 
                                jobData={selectedJob} 
                                closeModal={closeModal} 
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default JobDescriptions;