import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../api/axios';

const RecruiterContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
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
      if (Array.isArray(detail)) {
        return detail.map(d => `Field: ${d.loc.slice(-1)}, Error: ${d.msg}`).join('; '); 
      }
      return typeof detail === 'string' ? detail : "An unexpected validation error occurred.";
    }
    return err.message || "An unexpected network error occurred.";
  };

  // --- AUTH & INITIALIZATION ---
  const logout = () => {
    localStorage.removeItem('accessToken');
    setUserProfile(null);
    setJobDescriptions([]);
  };

  const fetchProfile = async () => {
    try {
      const response = await api.get('/recruiter/me');
      const userData = response.data.profile; 
      if (!userData) {
          throw new Error("Recruiter profile data is missing from response.");
      }
      setUserProfile({
          ...userData,
          company_name: userData.company_name || '', 
      });
    } catch (err) {
      console.error("Profile fetch error:", err);
      throw err; 
    }
  };

  const fetchJobs = useCallback(async () => {
    try {
      const response = await api.get('/jobrole/list');
      const jobList = response.data.job_roles; 
      if (!Array.isArray(jobList)) {
          console.error("API /jobrole/list did not return a list. Response:", response.data);
          setJobDescriptions([]); 
          return;
      }
      const mappedJobs = jobList.map(j => ({
          id: j._id || j.id, 
          title: j.role_name || j.title, 
          description: j.description,
          fileName: "View Details", 
          fileUrl: null 
      }));
      setJobDescriptions(mappedJobs);
    } catch (err) {
      console.error("Fetch jobs error", err);
      throw err;
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
      return true;
    } catch (err) {
      setError(parseError(err)); 
      return false;
    }
  };

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

  const getJobRoleDetails = async (id) => {
    try {
        const response = await api.get(`/jobrole/get/${id}`);
        return response.data;
    } catch (err) {
        setError(parseError(err));
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
      setError(parseError(err));
      throw new Error(parseError(err));
    }
  };

  const updateJobDescription = async (id, updatedData) => {
    setError(null);
    try {
        const payload = {
            title: updatedData.title,
            location: updatedData.location || "", 
            required_skills: updatedData.required_skills || [],
            preferred_skills: updatedData.preferred_skills || [],
            responsibilities: updatedData.responsibilities || [],
            tech_stack: updatedData.tech_stack || [],
            experience_min: updatedData.experience_min || "Entry",
        };
        await api.put(`/jobrole/update/${id}`, payload);
        await fetchJobs(); 
        return true;
    } catch (err) {
      setError(parseError(err));
      throw new Error(parseError(err));
    }
  };

  const updateProfile = async (profileData) => {
    setError(null);
    try {
      const profileId = userProfile?.linked_id;
      if (!profileId) {
        throw new Error("User profile link ID is missing. Cannot update.");
      }
      const response = await api.patch(`/recruiter/update/${profileId}`, profileData); 
      await fetchProfile(); 
      return response.data;
    } catch (err) {
      setError(parseError(err));
      throw new Error(parseError(err));
    }
  };

  // --- SHORTLISTING ACTIONS ---
  
  const matchSingle = async (jobId, file) => {
    setError(null);
    try {
        const formData = new FormData();
        formData.append('file', file); 
        formData.append('job_role_id', jobId); 
        const response = await api.post('/match/score_single', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    } catch (err) {
        setError(parseError(err));
        throw new Error(parseError(err));
    }
  };

  // FIXED: Robust Batch Processing to ensure multiple results return
  const aiBatchProcess = async (jobRoleId, filesArray) => {
    setError(null);
    try {
        if (!Array.isArray(filesArray) || filesArray.length === 0) {
            throw new Error("Please select at least one PDF file.");
        }
        
        const formData = new FormData();
        formData.append('job_role_id', jobRoleId);
        
        // Ensure all files are appended to the same key 'files'
        filesArray.forEach((file) => {
            formData.append('files', file); 
        });

        const response = await api.post('/match/shortlist_batch', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        // The response.data should contain the list of results
        return response.data; 
    } catch (err) {
        const msg = parseError(err);
        setError(msg);
        throw new Error(msg);
    }
  };
  
  const uploadResume = async () => { /* Placeholder */ };
  const matchBatch = async () => { /* Placeholder */ };

  // --- FEEDBACK & CHAT ---
  
  const createFeedbackDraft = async (candidateId, jobRoleId, feedbackText) => {
    setError(null);
    try {
        const formData = new URLSearchParams(); 
        formData.append('candidate_id', candidateId); 
        formData.append('job_role_id', jobRoleId);
        formData.append('feedback_text', feedbackText);

        const response = await api.post('/feedback/draft', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
    } catch (err) {
        setError(parseError(err));
        throw new Error(parseError(err));
    }
  };
  
  const fetchPendingFeedback = async () => {
    try {
      const response = await api.get('/feedback/pending');
      return response.data;
    } catch (err) {
      throw new Error(parseError(err));
    }
  };
  
  const editFeedbackDraft = async (draftId, newText) => {
    setError(null);
    try {
        const formData = new URLSearchParams();
        formData.append('new_text', newText);
        const response = await api.put(`/feedback/edit/${draftId}`, formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        return response.data;
    } catch (err) {
        setError(parseError(err));
        throw new Error(parseError(err));
    }
  };

  const approveFeedback = async (draftId) => {
    setError(null);
    try {
      await api.post(`/feedback/approve/${draftId}`);
      return true;
    } catch (err) {
      setError(parseError(err));
      throw new Error(parseError(err));
    }
  };

  const sendChatMessage = async (chatId, message) => {
    try {
      const url = chatId === 'general' ? '/chat/general' : `/chat/contextual/${chatId}`;
      const response = await api.post(url, { message });
      return response.data;
    } catch (err) {
      throw new Error(parseError(err)); 
    }
  };

  const fetchChatList = async () => {
    try {
      const response = await api.get('/chat/list');
      return response.data;
    } catch (err) {
      throw new Error(parseError(err));
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`; 
          await fetchProfile();
        } catch (err) {
          logout();
        }
      }
      setLoading(false); 
    };
    checkAuth();
  }, [fetchJobs]);

  const value = {
    userProfile, isAuthenticated: !!userProfile, loading, error, setError,
    login, register, verifyAccount, logout,
    jobDescriptions, addJobDescription, updateJobDescription, getJobRoleDetails, fetchJobs, 
    updateProfile, 
    uploadResume, matchSingle, matchBatch,
    aiBatchProcess, 
    createFeedbackDraft, fetchPendingFeedback, editFeedbackDraft, approveFeedback,
    sendChatMessage, fetchChatList
  };

  return (
    <RecruiterContext.Provider value={value}>
      {loading ? (
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#0056b3' }}>
          Loading Session...
        </div>
      ) : (
        children
      )}
    </RecruiterContext.Provider>
  );
};