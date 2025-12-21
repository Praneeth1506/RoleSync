import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/axios';

const RecruiterContext = createContext();

export const useRecruiter = () => useContext(RecruiterContext);

export const RecruiterProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobDescriptions, setJobDescriptions] = useState([]);

  // --- HELPER: FORMAT ERROR MESSAGE ---
  const parseError = (err) => {
    if (err.response && err.response.data && err.response.data.detail) {
      const detail = err.response.data.detail;
      if (typeof detail === 'string' && detail.toLowerCase().includes('email')) {
        return "Missing candidate contact info.";
      }
      if (Array.isArray(detail)) {
        return detail.map(d => `Field: ${d.loc.slice(-1)}, Error: ${d.msg}`).join('; ');
      }
      return typeof detail === 'string' ? detail : "An unexpected error occurred.";
    }
    return err.message || "An unexpected network error occurred.";
  };

  // --- AUTH & INITIALIZATION ---
  const logout = () => {
    localStorage.removeItem('accessToken');
    // Clear header from Axios
    delete api.defaults.headers.common['Authorization'];
    setUserProfile(null);
    setJobDescriptions([]);
  };

  const fetchProfile = async () => {
    try {
      const [authRes, recruiterRes] = await Promise.all([
        api.get('/auth/me'),
        api.get('/recruiter/me')
      ]);
      const profileData = recruiterRes.data.profile || {};
      setUserProfile({
        name: typeof authRes.data === 'string' ? authRes.data : (authRes.data.name || "Recruiter"),
        email: authRes.data.email || "Email not found",
        ...profileData,
        company_name: profileData.company_name || "",
        linked_id: profileData._id || profileData.id
      });
    } catch (err) {
      console.error("Profile fetch error:", err);
      // If profile fetch fails with 401, it's a dead session
      if (err.response?.status === 401) logout();
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      const response = await api.get('/jobrole/list');
      const jobList = response.data.job_roles;
      if (!Array.isArray(jobList)) {
        setJobDescriptions([]);
        return;
      }
      const mappedJobs = jobList.map(j => ({
        id: j._id || j.id || j.job_role_id,
        title: j.role_name || j.title,
        location: j.location || '',
        description: j.description || ''
      }));
      setJobDescriptions(mappedJobs);
    } catch (err) {
      console.error("Fetch jobs error", err);
    }
  }, []);

  const login = async (email, password) => {
    setError(null);
    try {
      // FIX 422: FastAPI OAuth2 expects application/x-www-form-urlencoded
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', email); // FastAPI uses 'username' key for the unique identifier
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const token = response.data.access_token;
      localStorage.setItem('accessToken', token);
      
      // Apply token immediately to the API instance
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      await fetchProfile();
      await fetchJobs();
      return true;
    } catch (err) {
      setError(parseError(err));
      return false;
    }
  };

  // --- JOB ROLE ACTIONS ---
  const getJobRoleDetails = async (id) => {
    try {
      const response = await api.get(`/jobrole/get/${id}`);
      return { ...response.data, id };
    } catch (err) {
      throw new Error(parseError(err));
    }
  };

  const addJobDescription = async (title, file) => {
    setError(null);
    try {
      const formData = new FormData();
      formData.append('jd_file', file);
      formData.append('title', title);
      await api.post('/jobrole/create', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await fetchJobs();
      return true;
    } catch (err) {
      throw new Error(parseError(err));
    }
  };

  const updateJobDescription = async (jobId, updatedData) => {
    if (!jobId) throw new Error("Job ID is missing.");
    setError(null);
    try {
      const formData = new FormData();
      formData.append('title', updatedData.title);
      if (updatedData.location) formData.append('location', updatedData.location);
      if (updatedData.jd_file) formData.append('jd_file', updatedData.jd_file);

      await api.put(`/jobrole/update/${jobId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await fetchJobs();
      return true;
    } catch (err) {
      throw new Error(parseError(err));
    }
  };

  const deleteJobDescription = async (id) => {
    try {
      await api.delete(`/jobrole/delete/${id}`);
      await fetchJobs();
      return true;
    } catch (err) {
      throw new Error(parseError(err));
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const profileId = userProfile?.linked_id || userProfile?._id;
      if (!profileId) throw new Error("Profile ID missing.");
      await api.patch(`/recruiter/update/${profileId}`, profileData);
      await fetchProfile();
      return true;
    } catch (err) {
      throw new Error(parseError(err));
    }
  };

  // --- SHORTLISTING & AI MATCHING ---
  const matchSingle = async (jobId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_role_id', jobId);
    const response = await api.post('/match/score_single', formData);
    return response.data;
  };

  const aiBatchProcess = async (jobRoleId, filesArray) => {
    const formData = new FormData();
    formData.append('job_role_id', jobRoleId);
    filesArray.forEach((file) => formData.append('files', file));
    const response = await api.post('/match/shortlist_batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data; 
  };

  const sendChatMessage = async (chatId, message) => {
    const url = chatId === 'general' ? '/chat/general' : `/chat/contextual/${chatId}`;
    const response = await api.post(url, { message });
    return response.data;
  };

  const fetchChatList = async () => {
    const response = await api.get('/chat/list');
    return response.data;
  };

  // --- FEEDBACK SYSTEM ---
  const createFeedbackDraft = async (candidateId, jobRoleId, feedbackText) => {
    const formData = new URLSearchParams();
    formData.append('candidate_id', candidateId);
    formData.append('job_role_id', jobRoleId);
    formData.append('feedback_text', feedbackText);
    const response = await api.post('/feedback/draft', formData);
    return response.data;
  };

  const approveFeedback = async (draftId) => {
    await api.post(`/feedback/approve/${draftId}`);
    return true;
  };

  // --- INITIAL SESSION CHECK (FIX 401) ---
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Set header FIRST before calling any async functions
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          // Await these properly
          await fetchProfile();
          await fetchJobs();
        } catch (err) {
          console.error("Auth check failed, clearing session.");
          logout();
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, [fetchJobs]);

  const value = {
    userProfile, isAuthenticated: !!userProfile, loading, error, setError,
    login, logout, fetchJobs, fetchProfile,
    jobDescriptions, addJobDescription, deleteJobDescription, updateJobDescription, getJobRoleDetails,
    updateProfile, matchSingle, aiBatchProcess, 
    createFeedbackDraft, approveFeedback, sendChatMessage, fetchChatList
  };

  return (
    <RecruiterContext.Provider value={value}>
      {loading ? (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: '#2563eb', fontWeight: '600' }}>
          Syncing Workspace...
        </div>
      ) : (
        children
      )}
    </RecruiterContext.Provider>
  );
};