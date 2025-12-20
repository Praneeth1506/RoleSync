import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RecruiterProvider, useRecruiter } from './context/RecruiterContext.jsx';
import './App.css';

// Pages
import Login from './pages/Login.jsx';
import DashboardLayout from './pages/DashboardLayout.jsx';
// === START MODIFICATION: Renamed component for General Chat ===
import GeneralChat from './pages/GeneralChat.jsx'; 
// === END MODIFICATION ===
import Shortlist from './pages/Shortlist.jsx';
import JobDescriptions from './pages/JobDescriptions.jsx';
import ProfileSettings from './pages/ProfileSettings.jsx';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useRecruiter();
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Login route (handles login, register, verify) */}
      <Route path="/" element={<Login />} />
      
      {/* Dashboard Routes (Protected) */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        {/* Default route redirects to the General AI Assistant */}
        <Route index element={<Navigate to="/dashboard/assistant" replace />} />
        
        {/* Maps /dashboard/assistant to the GeneralChat component */}
        <Route path="assistant" element={<GeneralChat />} /> 
        
        {/* Maps /dashboard/shortlist to the Shortlist component */}
        <Route path="shortlist" element={<Shortlist />} /> 
        
        {/* Maps /dashboard/jobs to the JobDescriptions component */}
        <Route path="jobs" element={<JobDescriptions />} />
        
        {/* Maps /dashboard/profile to the ProfileSettings component */}
        <Route path="profile" element={<ProfileSettings />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <RecruiterProvider>
      <Router>
        <AppRoutes />
      </Router>
    </RecruiterProvider>
  );
}

export default App;