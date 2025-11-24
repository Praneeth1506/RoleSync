import React, { useState } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';

const ProfileSettings = () => {
  const { userProfile, updateUserProfile } = useRecruiter();
  
  // FIX: Initialize state directly from userProfile (No useEffect needed)
  // We use "|| ''" to ensure inputs are never undefined
  const [formData, setFormData] = useState({
    companyName: userProfile?.companyName || '',
    recruiterName: userProfile?.recruiterName || '',
    email: userProfile?.email || ''
  });

  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUserProfile(formData);
    setMessage('Profile updated successfully!');
    
    setTimeout(() => setMessage(''), 3000);
  };

  // Safety check: If for some reason userProfile is missing, don't render the form
  if (!userProfile) return <div className="container">Loading profile...</div>;

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <div className="card">
        <h2>Edit Profile</h2>
        <p style={{ marginBottom: '20px' }}>Update your recruiter details below.</p>

        {message && (
          <div style={{ 
            padding: '12px', 
            background: '#dcfce7', 
            color: '#166534', 
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #bbf7d0'
          }}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input
              type="text"
              name="companyName"
              className="form-input"
              value={formData.companyName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Recruiter Name</label>
            <input
              type="text"
              name="recruiterName"
              className="form-input"
              value={formData.recruiterName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address (Optional)</label>
            <input
              type="email"
              name="email"
              className="form-input"
              value={formData.email}
              onChange={handleChange}
              placeholder="recruiter@company.com"
            />
          </div>

          <button type="submit" className="btn">Save Changes</button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;