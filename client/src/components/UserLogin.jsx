import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, LogIn, ShieldAlert } from 'lucide-react';

export default function UserLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('userToken')) {
      navigate('/user/app');
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/user/login' : '/api/auth/user/register';
    
    // ডাইনামিক API_URL লজিক
    const API_URL = window.location.hostname === 'localhost' 
      ? 'http://localhost:5000' 
      : 'https://smart-sos-system.onrender.com';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userProfile', JSON.stringify(data.user));
        navigate('/user/app');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <ShieldAlert size={48} className="auth-icon" />
          <h2 className="auth-title">User Portal</h2>
          <p className="auth-subtitle">{isLogin ? 'Sign in to your account' : 'Create a new account'}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Noman"
              value={formData.username}
              onChange={e => setFormData({...formData, username: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              required
              minLength={4}
            />
          </div>

          <button type="submit" className="btn-primary flex justify-center items-center gap-2">
            {isLogin ? <><LogIn size={18} /> Sign In</> : <><UserPlus size={18} /> Register</>}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span className="auth-link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register' : 'Sign in'}
          </span>
        </div>
      </div>
    </div>
  );
}