import React, { useState, useEffect } from 'react';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { User, Building, Mail, Save, Loader2 } from 'lucide-react';

const ProfileSettings = () => {
  const { userProfile, updateProfile } = useRecruiter();
  
  const [formData, setFormData] = useState({
    companyName: '',
    fullName: '',
    email: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState({ type: '', text: '' });

  // Load data from Context when available
  useEffect(() => {
    if (userProfile) {
      // FIX 2: Since RecruiterProvider now flattens the profile, we use the top-level keys
      setFormData({
        // 'name' is present in the /me response
        fullName: userProfile.name || '',
        
        // 'email' is present in the /me response
        email: userProfile.email || '',
        
        // 'company_name' is NOT present in the /me response. We initialize it as blank 
        // until the backend is updated to return it, or an additional fetch is added.
        companyName: userProfile.company_name || '', 
      });
    }
  }, [userProfile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setAlertMessage({ type: '', text: '' });

    const payload = {
      // Keys to be sent to the PATCH endpoint:
      name: formData.fullName, 
      company_name: formData.companyName,
    };

    try {
      await updateProfile(payload);
      setAlertMessage({ type: 'success', text: "Profile updated successfully!" });
    } catch (err) {
      setAlertMessage({ type: 'error', text: `Failed to update profile: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  if (!userProfile) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
        <Loader2 className="spin-anim" size={24} style={{ margin: '0 auto 10px' }}/>
        Loading profile...
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '700px' }}>
      <div className="card">
        <h2 style={{ marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
          Profile Settings
        </h2>
        
        {alertMessage.text && (
            <div 
                style={{ 
                    padding: '10px', 
                    marginBottom: '15px', 
                    borderRadius: '4px', 
                    backgroundColor: alertMessage.type === 'success' ? '#d1e7dd' : '#f8d7da', 
                    color: alertMessage.type === 'success' ? '#0f5132' : '#842029' 
                }}
            >
                {alertMessage.text}
            </div>
        )}

        <form onSubmit={handleSubmit}>
            {/* Full Name */}
            <div className="form-group">
                <label className="form-label">Full Name</label>
                <div style={{ position: 'relative' }}>
                    <User size={18} color="#64748b" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                    <input 
                        type="text" 
                        name="fullName" 
                        className="form-input" 
                        style={{ paddingLeft: '40px' }}
                        value={formData.fullName} 
                        onChange={handleChange}
                        required
                    />
                </div>
            </div>

            {/* Company Name */}
            <div className="form-group">
                <label className="form-label">Company Name</label>
                <div style={{ position: 'relative' }}>
                    <Building size={18} color="#64748b" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                    <input 
                        type="text" 
                        name="companyName" 
                        className="form-input" 
                        style={{ paddingLeft: '40px' }}
                        value={formData.companyName} 
                        onChange={handleChange}
                        required
                    />
                </div>
            </div>

            {/* Email (Read Only) */}
            <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                    <Mail size={18} color="#64748b" style={{ position: 'absolute', top: '12px', left: '12px' }} />
                    <input 
                        type="email" 
                        name="email" 
                        className="form-input" 
                        style={{ paddingLeft: '40px', backgroundColor: '#f8fafc', color: '#64748b', cursor: 'not-allowed' }}
                        value={formData.email} 
                        disabled
                        title="Email cannot be changed"
                    />
                </div>
                <small style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                    Email cannot be changed via this form.
                </small>
            </div>

            <button 
                type="submit" 
                className="btn" 
                disabled={isSaving}
                style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
                {isSaving ? <Loader2 className="spin-anim" size={18} /> : <Save size={18} />}
                {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettings;