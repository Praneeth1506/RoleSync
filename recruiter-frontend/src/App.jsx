import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RecruiterProvider, useRecruiter } from './context/RecruiterContext.jsx';
import './App.css';

// Pages
import Login from './pages/Login.jsx';
// REMOVED: import CreateProfile from './pages/CreateProfile.jsx'; <-- No longer needed
import DashboardLayout from './pages/DashboardLayout.jsx';
import Assistant from './pages/Assistant.jsx';
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
      {/* Login route now handles both login and registration.
         We removed the /create-profile route.
      */}
      <Route path="/" element={<Login />} />
      
      {/* Dashboard Routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard/assistant" replace />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="shortlist" element={<Shortlist />} />
        <Route path="jobs" element={<JobDescriptions />} />
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