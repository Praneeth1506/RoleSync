import React from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

  return (
    <div className="container" style={{ marginTop: '100px', maxWidth: '400px' }}>
      <div className="card" style={{ textAlign: 'center' }}>
        <h1>Recruiter Login</h1>
        <p>Manage your hiring pipeline effectively.</p>
        <button className="btn" style={{width: '100%', marginTop: '20px'}} onClick={() => navigate('/create-profile')}>
          Login / Sign Up
        </button>
      </div>
    </div>
  );
};

export default Login;