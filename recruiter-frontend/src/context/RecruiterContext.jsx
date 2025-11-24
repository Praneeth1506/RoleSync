import React, { createContext, useState, useContext } from 'react';

const RecruiterContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useRecruiter = () => useContext(RecruiterContext);

export const RecruiterProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  
  const [jobDescriptions, setJobDescriptions] = useState([
    { id: 1, title: "Frontend Developer", description: "React.js experience required..." },
    { id: 2, title: "Backend Engineer", description: "Node.js and Python..." }
  ]);

  const addJobDescription = (title, description) => {
    const newJD = { id: Date.now(), title, description };
    setJobDescriptions([...jobDescriptions, newJD]);
  };

  const loginUser = (profileData) => {
    setUserProfile(profileData);
  };

  // --- Update Profile ---
  const updateUserProfile = (updatedData) => {
    setUserProfile((prev) => ({ ...prev, ...updatedData }));
  };

  const value = {
    userProfile,
    jobDescriptions,
    addJobDescription,
    loginUser,
    updateUserProfile, // Exporting the new function
    isAuthenticated: !!userProfile
  };

  return (
    <RecruiterContext.Provider value={value}>
      {children}
    </RecruiterContext.Provider>
  );
};
