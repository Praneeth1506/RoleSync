import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/navbar";
import FileUpload from "./components/fileupload";
import Feedback from "./components/feedback";
import Home from "./components/Home";
import AccountSidebar from "./components/AccountSidebar";
import Chatbot from "./components/Chatbot";

export default function App() {
    const [open, setOpen] = useState(true); // start open for testing
    const user = {
        name: "Test User",
        email: "test@example.com",
        organization: "Acme",
        created_roles: ["admin"],
        joined_at: Date.now(),
    };

    return (
        <>
            <BrowserRouter>
                <Navbar onAccountClick={() => setOpen(true)} />
                <AccountSidebar open={open} onClose={() => setOpen(false)} user={user} />
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/upload" element={<FileUpload />} />
                    <Route path="/acc" element={<AccountSidebar />} />
                    <Route path="/cht" element={<Chatbot />} />
                </Routes>
            </BrowserRouter>
        </>
    );
}
