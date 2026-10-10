import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, Shield } from 'lucide-react';

export default function ProviderLogin() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    serviceName: '',
    email: '',
    password: '',
    serviceType: 'Ambulance'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://smart-sos-system.onrender.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/api/auth/provider/login' : '/api/auth/provider/register';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('providerToken', data.token);
        localStorage.setItem('providerInfo', JSON.stringify(data.provider));
        navigate('/provider/dashboard');
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Server connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-dark)' }}>
      <div className="login-box" style={{ width: '100%', maxWidth: '400px', padding: '2rem', backgroundColor: 'var(--bg-card)', borderRadius: '1rem', border: '1px solid var(--border-color)', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <Activity size={48} color="var(--primary-color)" />
          </div>
          <h2 style={{ color: 'white', fontSize: '1.5rem', fontWeight: 'bold' }}>
            Provider Portal
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {isLogin ? 'Sign in to dashboard' : 'Register new service'}
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '1rem', textAlign: 'center', border: '1px solid var(--danger-color)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isLogin && (
            <>
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Service Name</label>
                <div style={{ position: 'relative' }}>
                  <Shield size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    required
                    style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', backgroundColor: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'white' }}
                    value={formData.serviceName}
                    onChange={(e) => setFormData({...formData, serviceName: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Service Type</label>
                <select
                  style={{ width: '100%', padding: '0.75rem', backgroundColor: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'white' }}
                  value={formData.serviceType}
                  onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                >
                  <option value="Ambulance">Ambulance</option>
                  <option value="Police">Police</option>
                  <option value="Fire Service">Fire Service</option>
                  <option value="Hospital">Hospital</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="email"
                required
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', backgroundColor: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'white' }}
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', backgroundColor: 'rgba(15,23,42,0.5)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', color: 'white' }}
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.75rem', marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Register')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button onClick={() => setIsLogin(!isLogin)} style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer' }}>
            {isLogin ? "Don't have an account? Register" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}