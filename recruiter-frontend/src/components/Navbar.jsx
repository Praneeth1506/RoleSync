import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { MessageSquare, Users, FileText, UserCircle } from 'lucide-react';
import '../styles/Navbar.css';
import { useRecruiter } from '../context/RecruiterContext.jsx';

const Navbar = () => {
  const { userProfile } = useRecruiter();
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="nav-brand">RecruiterAI</div>
      <div className="nav-links">
        <NavLink to="/dashboard/assistant" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          <MessageSquare size={18} /> Assistant
        </NavLink>
        <NavLink to="/dashboard/shortlist" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          <Users size={18} /> Shortlist
        </NavLink>
        <NavLink to="/dashboard/jobs" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
          <FileText size={18} /> Job Descriptions
        </NavLink>
      </div>
      
      {/* Clickable Profile Section */}
      <div 
        className="nav-profile" 
        onClick={() => navigate('/dashboard/profile')}
        style={{ cursor: 'pointer', userSelect: 'none' }}
        title="Click to Edit Profile"
      >
         <span>{userProfile?.companyName || 'Guest'}</span>
         <UserCircle size={24} />
      </div>
    </nav>
  );
};

export default Navbar;