import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecruiter } from '../context/RecruiterContext.jsx';
import { ArrowRight, Mail, Lock, User, Building, Loader2, AlertCircle, Linkedin, Phone, KeyRound, CheckCircle2 } from 'lucide-react';
import '../styles/Login.css';

const Login = () => {
    const navigate = useNavigate();
    const { login, register, verifyAccount, error } = useRecruiter(); 
    
    const [viewState, setViewState] = useState('login'); // 'login' | 'register' | 'verify'
    const [isLoading, setIsLoading] = useState(false);
    const [localError, setLocalError] = useState('');
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        fullName: '',
        companyName: '',
        linkedin: '',
        phone: '',
        otp: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setLocalError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLocalError('');
        
        // --- VALIDATION ---
        if (!formData.email) {
           setLocalError("Please enter your email address."); 
           return; 
        }

        if (viewState === 'verify') {
           if (!formData.otp) { 
             setLocalError("Please enter the verification code."); 
             return; 
           }
        } else {
            if (!formData.password) { 
              setLocalError("Please enter your password."); 
              return; 
            }
            
            if (viewState === 'register' && (!formData.fullName || !formData.companyName)) {
               setLocalError("Please fill in Name and Company."); 
               return;
            }
        }

        setIsLoading(true);

        const performAuth = async () => {
            let success = false;
            
            try {
                if (viewState === 'register') {
                    // --- 1. REGISTER ---
                    // Fixed: Passing arguments in the exact order expected by Context
                    success = await register(
                        formData.fullName,     // fullName
                        formData.companyName,  // companyName
                        formData.email,        // email
                        formData.password,     // password
                        formData.linkedin,     // linkedin
                        formData.phone         // phone
                    );

                    if (success) {
                        setViewState('verify'); 
                        setLocalError(''); 
                        alert("Registration successful! Please check your email for the verification code.");
                    }
                } 
                else if (viewState === 'verify') {
                    // --- 2. VERIFY ---
                    success = await verifyAccount(formData.email, formData.otp);
                    if (success) {
                        // --- 3. AUTO LOGIN (after verification) ---
                        const loginSuccess = await login(formData.email, formData.password);
                        if (loginSuccess) {
                            navigate('/dashboard/jobs');
                        } else {
                            setViewState('login');
                            setLocalError('Verification successful. Please login manually.');
                        }
                    }
                } 
                else {
                    // --- 4. LOGIN ---
                    success = await login(formData.email, formData.password);
                    if (success) {
                        navigate('/dashboard/jobs');
                    }
                }
            } catch (err) {
                console.error("Auth process error", err);
                setLocalError("An unexpected error occurred.");
            } finally {
                setIsLoading(false);
            }
        };

        performAuth();
    };

    return (
        <div className="auth-container">
            <div className="auth-sidebar">
                <div className="brand-large">RoleSync</div>
                <p className="brand-tagline">
                    The intelligent platform for modern hiring. 
                    Automate screening, chat with resumes, and shortlist the best talent in seconds.
                </p>
            </div>

            <div className="auth-form-container">
                <div className="auth-card">
                    
                    <div className="auth-header">
                        <h1 className="auth-title">
                            {viewState === 'verify' ? 'Verify Email' : (viewState === 'register' ? 'Create Account' : 'Welcome Back')}
                        </h1>
                        <p className="auth-subtitle">
                            {viewState === 'verify'
                                ? `Enter the code sent to ${formData.email}`
                                : (viewState === 'register' ? 'Get started with your free account.' : 'Please enter your details to sign in.')
                            }
                        </p>
                    </div>

                    {viewState !== 'verify' && (
                        <div className="auth-toggle">
                            <button 
                                className={`toggle-btn ${viewState === 'login' ? 'active' : ''}`}
                                onClick={() => { setViewState('login'); setLocalError(''); }}
                            >
                                Sign In
                            </button>
                            <button 
                                className={`toggle-btn ${viewState === 'register' ? 'active' : ''}`}
                                onClick={() => { setViewState('register'); setLocalError(''); }}
                            >
                                Register
                            </button>
                        </div>
                    )}

                    {(localError || error) && (
                        <div style={{ 
                            backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px', 
                            borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #fecaca'
                        }}>
                            <AlertCircle size={18} /> {localError || error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        
                        <div className="input-group">
                            <label className="input-label">Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                                <input 
                                    type="email" name="email" className="auth-input" placeholder="name@company.com"
                                    required 
                                    value={formData.email} 
                                    onChange={handleChange}
                                    disabled={viewState === 'verify'}
                                    style={viewState === 'verify' ? { backgroundColor: '#f8fafc', color: '#64748b' } : {}}
                                />
                            </div>
                        </div>

                        {viewState === 'verify' && (
                            <div className="input-group">
                                <label className="input-label">Verification Code</label>
                                <div style={{ position: 'relative' }}>
                                    <KeyRound size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                                    <input 
                                        type="text" name="otp" className="auth-input" placeholder="123456"
                                        value={formData.otp} onChange={handleChange} autoFocus
                                    />
                                </div>
                            </div>
                        )}

                        {viewState === 'register' && (
                            <>
                                <div className="input-group">
                                    <label className="input-label">Full Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                                        <input 
                                            type="text" name="fullName" className="auth-input" placeholder="John Doe"
                                            value={formData.fullName} onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Company Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <Building size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                                        <input 
                                            type="text" name="companyName" className="auth-input" placeholder="Acme Inc."
                                            value={formData.companyName} onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">LinkedIn Profile (Optional)</label>
                                    <div style={{ position: 'relative' }}>
                                        <Linkedin size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                                        <input 
                                            type="text" name="linkedin" className="auth-input" placeholder="linkedin.com/in/..."
                                            value={formData.linkedin} onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="input-label">Phone Number (Optional)</label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                                        <input 
                                            type="text" name="phone" className="auth-input" placeholder="+1 234 567 890"
                                            value={formData.phone} onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {viewState !== 'verify' && (
                            <div className="input-group">
                                <label className="input-label">Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={18} color="#94a3b8" style={{ position: 'absolute', top: '14px', left: '14px' }} />
                                    <input 
                                        type="password" name="password" className="auth-input" placeholder="••••••••"
                                        required value={formData.password} onChange={handleChange}
                                    />
                                </div>
                            </div>
                        )}

                        <button type="submit" className="submit-btn" disabled={isLoading}>
                            {isLoading ? (
                                <>Processing... <Loader2 className="spin-anim" size={18} /></>
                            ) : (
                                <>
                                    {viewState === 'verify' ? 'Verify & Login' : (viewState === 'register' ? 'Create Account' : 'Sign In')} 
                                    {viewState === 'verify' ? <CheckCircle2 size={18} /> : <ArrowRight size={18} />}
                                </>
                            )}
                        </button>
                    </form>

                    {viewState !== 'verify' && (
                        <>
                            <div style={{ display: 'flex', gap: '12px' }}>      
                            </div>
                        </>
                    )}
                    
                    {viewState === 'verify' && (
                        <div style={{ textAlign: 'center', marginTop: '20px' }}>
                            <span 
                                style={{ color: '#2563eb', fontSize: '0.9rem', cursor: 'pointer', fontWeight: '500' }}
                                onClick={() => setViewState('login')}
                            >
                                Back to Sign In
                            </span>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

export default Login;