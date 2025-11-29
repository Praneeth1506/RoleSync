import React, { createContext, useState, useContext } from 'react';

const RecruiterContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useRecruiter = () => useContext(RecruiterContext);

export const RecruiterProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  
  // Mock Data
  const [jobDescriptions, setJobDescriptions] = useState([
    { 
      id: 1, 
      title: "Frontend Developer", 
      fileName: "frontend_requirements.pdf", 
      fileUrl: null 
    },
    { 
      id: 2, 
      title: "Backend Engineer", 
      fileName: "backend_specs.pdf", 
      fileUrl: null 
    }
  ]);

  // Add JD
  const addJobDescription = (title, file) => {
    const newJD = { 
      id: Date.now(), 
      title, 
      fileName: file.name,
      fileUrl: URL.createObjectURL(file) 
    };
    setJobDescriptions([...jobDescriptions, newJD]);
  };

  // --- NEW: Update JD ---
  const updateJobDescription = (id, title, file) => {
    setJobDescriptions(prev => prev.map(jd => {
        if (jd.id === id) {
            return {
                ...jd,
                title,
                // If a new file is uploaded, update it. Otherwise keep the old one.
                fileName: file ? file.name : jd.fileName,
                fileUrl: file ? URL.createObjectURL(file) : jd.fileUrl
            };
        }
        return jd;
    }));
  };

  const loginUser = (profileData) => {
    setUserProfile(profileData);
  };

  const updateUserProfile = (updatedData) => {
    setUserProfile((prev) => ({ ...prev, ...updatedData }));
  };

  const value = {
    userProfile,
    jobDescriptions,
    addJobDescription,
    updateJobDescription, // Exported new function
    loginUser,
    updateUserProfile,
    isAuthenticated: !!userProfile
  };

  return (
    <RecruiterContext.Provider value={value}>
      {children}
    </RecruiterContext.Provider>
  );
};