import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { RecruiterProvider, useRecruiter } from './context/RecruiterContext.jsx';
import './App.css';

// Pages
import Login from './pages/Login.jsx';
import CreateProfile from './pages/CreateProfile.jsx';
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
      <Route path="/" element={<Login />} />
      <Route path="/create-profile" element={<CreateProfile />} />
      
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