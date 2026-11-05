import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeft } from 'lucide-react';
import { Sky3DScene } from '../App';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://smart-sos-system.onrender.com';

export default function UserLogin() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? '/api/auth/user/register' : '/api/auth/user/login';

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('sos_token', data.token);
        localStorage.setItem('sos_user', JSON.stringify(data.user));
        localStorage.setItem('userToken', data.token);
        localStorage.setItem('userInfo', JSON.stringify(data.user));
        navigate('/user/app');
      } else {
        setError(data.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Server connection failed. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className="water-bg-wrapper">
      <Sky3DScene />

      <div className="glass-3d-shell" style={{ maxWidth: '420px' }}>
        <button className="pill-btn-3d" onClick={() => navigate('/')} style={{ marginBottom: '1.2rem' }}>
          <ArrowLeft size={15} /> Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
          <div className="orb-icon-3d">
            <div className="orb-icon-inner">
              <Users size={34} />
            </div>
          </div>
          <h2 className="title-gradient-3d" style={{ fontSize: '1.75rem' }}>
            Citizen SOS Portal
          </h2>
          <p className="subtitle-vivid" style={{ fontSize: '0.92rem', marginTop: '0.3rem' }}>
            {isRegistering ? 'Create your emergency profile' : 'Sign in for instant 3D SOS access'}
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.85rem', marginBottom: '1.2rem', borderRadius: '14px',
            background: 'rgba(225, 29, 72, 0.12)', border: '1.5px solid rgba(225, 29, 72, 0.45)',
            color: '#be123c', textAlign: 'center', fontSize: '0.88rem', fontWeight: 700
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.35rem' }}>
              Username
            </label>
            <input
              className="input-3d"
              type="text"
              required
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.35rem' }}>
              Password
            </label>
            <input
              className="input-3d"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-3d-aqua" style={{ marginTop: '0.6rem' }} disabled={loading}>
            {loading ? 'Please wait...' : isRegistering ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.4rem' }}>
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#0052cc', cursor: 'pointer', fontWeight: 800, fontSize: '0.92rem' }}
          >
            {isRegistering ? 'Already registered? Sign in' : 'New user? Create emergency account'}
          </button>
        </div>
      </div>
    </div>
  );
}