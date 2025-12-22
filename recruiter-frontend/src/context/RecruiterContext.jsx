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
      const formData = new URLSearchParams();
      formData.append('grant_type', 'password');
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const token = response.data.access_token;
      localStorage.setItem('accessToken', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      await fetchProfile();
      await fetchJobs();
      return true;
    } catch (err) {
      setError(parseError(err));
      return false;
    }
  };

  // --- REGISTRATION ACTION ---
  const register = async (fullName, companyName, email, password, linkedin = "", phone = "") => {
    setError(null);
    try {
      await api.post('/auth/signup/recruiter', {
        name: fullName, 
        company_name: companyName,
        email: email,
        password: password,
        linkedin: linkedin,
        phone: phone
      });
      return true;
    } catch (err) {
      setError(parseError(err));
      return false;
    }
  };

  const verifyAccount = async (email, otp) => {
    setError(null);
    try {
      const trimmedEmail = String(email || '').trim();
      const verificationCode = String(otp || '').trim();
      await api.post('/auth/verify', null, { 
        params: { email: trimmedEmail, code: verificationCode }
      });
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

  // --- CHAT SYSTEM ---
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
  const fetchPendingFeedback = async () => {
    const response = await api.get('/feedback/pending');
    return response.data; 
  };

  const createFeedbackDraft = async (candidateId, jobRoleId, feedbackText) => {
    const params = new URLSearchParams();
    params.append('candidate_id', candidateId);
    params.append('job_role_id', jobRoleId);
    params.append('feedback_text', feedbackText);

    try {
      const response = await api.post('/feedback/draft', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      return response.data; 
    } catch (err) {
      console.error("Draft Creation Error Detail:", err.response?.data?.detail);
      throw new Error(parseError(err));
    }
  };

  const editFeedbackDraft = async (draftId, newText) => {
    try {
        const formData = new URLSearchParams();
        formData.append('new_text', newText);

        const response = await api.put(`/feedback/edit/${draftId}`, formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        
        return response.data;
    } catch (err) {
        console.error("Draft Edit Error:", err.response?.data || err.message);
        throw new Error(parseError(err));
    }
  };

  const approveFeedback = async (draftId) => {
    try {
      const response = await api.post(`/feedback/approve/${draftId}`);
      console.log("Feedback Approved Successfully");
      return response.data;
    } catch (err) {
      console.error("Approval Error Detail:", err.response?.data?.detail);
      throw new Error(parseError(err));
    }
  };

  const rejectRemainingCandidates = async (jobRoleId) => {
    try {
      const response = await api.post(`/feedback/reject_remaining/${jobRoleId}`);
      return response.data;
    } catch (err) {
      throw new Error(parseError(err));
    }
  };

  // --- INITIAL SESSION CHECK ---
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          await Promise.all([fetchProfile(), fetchJobs()]);
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
    login, register, verifyAccount, logout, fetchJobs, fetchProfile,
    jobDescriptions, addJobDescription, deleteJobDescription, updateJobDescription, getJobRoleDetails,
    updateProfile, matchSingle, aiBatchProcess, 
    fetchPendingFeedback, createFeedbackDraft, editFeedbackDraft, approveFeedback, rejectRemainingCandidates,
    sendChatMessage, fetchChatList
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