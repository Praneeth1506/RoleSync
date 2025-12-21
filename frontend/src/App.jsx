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
import ResumePage from "./components/resume";


import { UserProvider } from "./context/UserProvider";

/* -------------------- AppContent -------------------- */

function AppContent() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Restore auth header on app start
  useEffect(() => {
    try {
      const token = localStorage.getItem("accessToken");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Failed to restore auth header");
    }
  }, []);

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <Navbar onAccountClick={() => setOpen(true)} />
      <AccountSidebar open={open} onClose={() => setOpen(false)} />

      <Routes>
        <Route path="/" element={<FileUpload />} />
        <Route path="/upload" element={<Home />} />
        <Route path="/feedback" element={<Feedback />} />
        <Route path="/cht" element={<Chatbot />} />
        <Route path="/self" element={<Selfan />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/resume" element={<ResumePage />} />

      </Routes>
    </>
  );
}

/* -------------------- App (ROOT COMPONENT) -------------------- */

export default function App() {
  return (
    <UserProvider>
      <ResumeProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ResumeProvider>
    </UserProvider>
  );
}
