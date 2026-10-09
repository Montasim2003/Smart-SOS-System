import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogIn, ShieldPlus } from 'lucide-react';

export default function ProviderLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ serviceName: '', email: '', password: '', serviceType: 'Police' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/provider/login' : '/api/auth/provider/register';
    
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
        localStorage.setItem('providerToken', data.token);
        localStorage.setItem('providerInfo', JSON.stringify(data.provider));
        navigate('/provider/dashboard');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card" style={{borderColor: '#3b82f6'}}>
        <div className="auth-header">
          <Activity size={48} className="auth-icon" style={{color: '#3b82f6'}} />
          <h2 className="auth-title" style={{background: 'linear-gradient(to right, #3b82f6, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'}}>Provider Portal</h2>
          <p className="auth-subtitle">{isLogin ? 'Sign in to access emergency dashboard' : 'Register your service'}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Service Name</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="NYPD Precinct 12"
                  value={formData.serviceName}
                  onChange={e => setFormData({...formData, serviceName: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Service Type</label>
                <select 
                  className="form-select"
                  value={formData.serviceType}
                  onChange={e => setFormData({...formData, serviceType: e.target.value})}
                >
                  <option value="Police">Police</option>
                  <option value="Hospital">Hospital / Ambulance</option>
                  <option value="Fire">Fire Department</option>
                </select>
              </div>
            </>
          )}
          
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="service@domain.com"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
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
            />
          </div>

          <button type="submit" className="btn-provider flex justify-center items-center gap-2">
            {isLogin ? <><LogIn size={18} /> Sign In</> : <><ShieldPlus size={18} /> Register Service</>}
          </button>
        </form>

        <div className="auth-toggle">
          {isLogin ? "Not registered yet?" : "Already registered?"}
          <span className="auth-link" style={{color: '#3b82f6'}} onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? 'Register' : 'Sign in'}
          </span>
        </div>
      </div>
    </div>
  );
}