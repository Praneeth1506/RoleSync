import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecruiter } from '../context/RecruiterContext.jsx';

const CreateProfile = () => {
  const navigate = useNavigate();
  const { loginUser } = useRecruiter();
  const [formData, setFormData] = useState({ companyName: '', recruiterName: '' });

  const handleSubmit = (e) => {
    e.preventDefault();
    loginUser(formData);
    navigate('/dashboard/jobs');
  };

  return (
    <div className="container" style={{ marginTop: '50px', maxWidth: '500px' }}>
      <div className="card">
        <h2>Setup Profile</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Company Name</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Recruiter Name</label>
            <input
              type="text"
              className="form-input"
              required
              value={formData.recruiterName}
              onChange={(e) => setFormData({ ...formData, recruiterName: e.target.value })}
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%' }}>Create Profile</button>
        </form>
      </div>
    </div>
  );
};

export default CreateProfile;