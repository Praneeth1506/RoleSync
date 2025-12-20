import React, { useState, useEffect } from "react";
import axios from "axios";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/navbar";
import FileUpload from "./components/fileupload";
import Feedback from "./components/feedback";
import Home from "./components/Home";
import AccountSidebar from "./components/AccountSidebar";
import Chatbot from "./components/Chatbot";
import { ResumeProvider } from "./components/ResumeProvider";
import Selfan from "./components/selfanalysis";
import SignUp from "./components/SignUp";
import SignIn from "./components/SignIn";
function AppContent() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const user = {
  };

  // Use real user from localStorage if available and listen for updates
  const [userState, setUserState] = React.useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    function onUserUpdated(e) {
      const u = e?.detail || (() => {
        try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
      })();
      setUserState(u);
    }
    function onUserLoggedOut() {
      setUserState(null);
    }
    window.addEventListener('user-updated', onUserUpdated);
    window.addEventListener('user-logged-out', onUserLoggedOut);
    return () => {
      window.removeEventListener('user-updated', onUserUpdated);
      window.removeEventListener('user-logged-out', onUserLoggedOut);
    };
  }, []);

  // Restore auth header on app start if token exists
  useEffect(() => {
    try {
      const token = localStorage.getItem('accessToken');
      if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } catch (e) {}
  }, []);

  // Close sidebar on route change
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <>
      <Navbar onAccountClick={() => setOpen(true)} />
      <AccountSidebar open={open} onClose={() => setOpen(false)} user={user} />

      <Routes>
        <Route path="/upload" element={<Home />} />
        <Route path="/" element={<FileUpload />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/cht" element={<Chatbot />} />
        <Route path="/self" element={<Selfan />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <ResumeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ResumeProvider>
  );
}
