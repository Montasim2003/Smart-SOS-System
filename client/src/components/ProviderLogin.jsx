import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft } from 'lucide-react';
import { Sky3DScene } from '../App';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://smart-sos-system.onrender.com';

export default function ProviderLogin() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceType, setServiceType] = useState('Police');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegistering ? '/api/auth/provider/register' : '/api/auth/provider/login';
    const payload = isRegistering
      ? { serviceName, serviceType, email, password }
      : { email, password };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.success) {
        localStorage.setItem('providerToken', data.token);
        localStorage.setItem('providerInfo', JSON.stringify(data.provider));
        navigate('/provider/dashboard');
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

      <div className="glass-3d-shell" style={{ maxWidth: '430px' }}>
        <button className="pill-btn-3d" onClick={() => navigate('/')} style={{ marginBottom: '1.2rem' }}>
          <ArrowLeft size={15} /> Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.6rem' }}>
          <div className="orb-icon-3d">
            <div className="orb-icon-inner">
              <Activity size={34} />
            </div>
          </div>
          <h2 className="title-gradient-3d" style={{ fontSize: '1.75rem' }}>
            Provider Portal
          </h2>
          <p className="subtitle-vivid" style={{ fontSize: '0.92rem', marginTop: '0.3rem' }}>
            {isRegistering ? 'Register emergency response unit' : 'Sign in to 3D Command Center'}
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
          {isRegistering && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.35rem' }}>
                  Service Name
                </label>
                <input
                  className="input-3d"
                  type="text"
                  required
                  placeholder="e.g. Dhaka Metro Police"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.35rem' }}>
                  Service Type
                </label>
                <select
                  className="input-3d"
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                >
                  <option value="Police">Police</option>
                  <option value="Ambulance">Ambulance</option>
                  <option value="Fire Service">Fire Service</option>
                  <option value="Hospital">Hospital</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.35rem' }}>
              Official Email
            </label>
            <input
              className="input-3d"
              type="email"
              required
              placeholder="unit@emergency.gov"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? 'Connecting...' : isRegistering ? 'Register Unit' : 'Access Command Center'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.4rem' }}>
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#0052cc', cursor: 'pointer', fontWeight: 800, fontSize: '0.92rem' }}
          >
            {isRegistering ? 'Already have an account? Sign in' : 'Need a provider account? Register'}
          </button>
        </div>
      </div>
    </div>
  );
}