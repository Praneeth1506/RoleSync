import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { ArrowRight, Mail, Lock, User, Building } from 'lucide-react';
import '../styles/Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { loginUser } = useRecruiter();
  
  // State to toggle between Login and Register views
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Single form state for both views
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    companyName: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // VALIDATION
    if (!formData.email || !formData.password) {
      alert("Please enter email and password.");
      return;
    }

    if (isRegistering) {
      // REGISTER FLOW
      if (!formData.fullName || !formData.companyName) {
        alert("Please fill in your Name and Company.");
        return;
      }
      
      // Save full profile to context
      loginUser({
        companyName: formData.companyName,
        recruiterName: formData.fullName,
        email: formData.email
      });
      alert("Account created successfully!");
    } else {
      // LOGIN FLOW (Mock)
      // We simulate a login by setting a mock profile based on the email
      loginUser({
        companyName: "Tech Recruiters Inc.", // Mock data
        recruiterName: "Demo User",
        email: formData.email
      });
    }

    // Redirect to the first dashboard page
    navigate('/dashboard/jobs');
  };

  return (
    <div className="auth-container">
      
      {/* Left Sidebar (Visual) */}
      <div className="auth-sidebar">
        <div className="brand-large">RecruiterAI</div>
        <p className="brand-tagline">
          The intelligent platform for modern hiring. 
          Automate screening, chat with resumes, and shortlist the best talent in seconds.
        </p>
      </div>

      {/* Right Content (Form) */}
      <div className="auth-form-container">
        <div className="auth-card">
          
          <div className="auth-header">
            <h1 className="auth-title">
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </h1>
            <p className="auth-subtitle">
              {isRegistering 
                ? 'Get started with your 14-day free trial.' 
                : 'Please enter your details to sign in.'}
            </p>
          </div>

          {/* Switcher */}
          <div className="auth-toggle">
            <button 
              className={`toggle-btn ${!isRegistering ? 'active' : ''}`}
              onClick={() => setIsRegistering(false)}
            >
              Sign In
            </button>
            <button 
              className={`toggle-btn ${isRegistering ? 'active' : ''}`}
              onClick={() => setIsRegistering(true)}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            
            {/* Fields only for Registration */}
            {isRegistering && (
              <>
                <div className="input-group">
                  <label className="input-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                    <input 
                      type="text" 
                      name="fullName"
                      className="auth-input" 
                      placeholder="John Doe"
                      value={formData.fullName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label className="input-label">Company Name</label>
                  <div style={{ position: 'relative' }}>
                    <Building size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                    <input 
                      type="text" 
                      name="companyName"
                      className="auth-input" 
                      placeholder="Acme Inc."
                      value={formData.companyName}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Common Fields */}
            <div className="input-group">
              <label className="input-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                <input 
                  type="email" 
                  name="email"
                  className="auth-input" 
                  placeholder="name@company.com"
                  required
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                <input 
                  type="password" 
                  name="password"
                  className="auth-input" 
                  placeholder="••••••••"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {!isRegistering && (
              <div style={{ textAlign: 'right', marginBottom: '20px' }}>
                {/* Forgot Password Link 
                <span style={{ color: '#2563eb', fontSize: '0.85rem', fontWeight: '500', cursor: 'pointer' }}>
                  Forgot password?
                </span>*/}
              </div>
            )}

            <button type="submit" className="submit-btn">
              {isRegistering ? 'Create Account' : 'Sign In'} 
              <ArrowRight size={18} />
            </button>
          </form>

          

        </div>
      </div>
    </div>
  );
};

export default Login;