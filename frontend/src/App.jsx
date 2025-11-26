import React, { useState, useEffect } from "react";
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
    name: "Test User",
    email: "test@example.com",
    organization: "Acme",
    created_roles: ["admin"],
    joined_at: Date.now(),
  };

  // Close sidebar on route change
  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <>
      <Navbar onAccountClick={() => setOpen(true)} />
      <AccountSidebar open={open} onClose={() => setOpen(false)} user={user} />

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<FileUpload />} />
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
