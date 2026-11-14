import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowLeft, ShieldCheck, CreditCard } from 'lucide-react';
import { Sky3DScene } from '../App';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : '';

export default function UserLogin() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nidNumber, setNidNumber] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [nidPhotoName, setNidPhotoName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isNidFormatValid = /^(?:\d{10}|\d{13}|\d{17})$/.test(nidNumber.trim());

  const handleNidPhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNidPhotoName(file.name);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegistering) {
      if (!isNidFormatValid) {
        setError('Please enter a valid Bangladeshi NID number (10, 13, or 17 digits).');
        return;
      }
      if (dob) {
        const age = new Date().getFullYear() - new Date(dob).getFullYear();
        if (age < 12 || age > 110) {
          setError('Please enter a valid Date of Birth matching your NID.');
          return;
        }
      }
      if (!nidPhotoName) {
         setError('Please capture an image of your NID Card.');
         return;
      }
    }

    setLoading(true);

    const endpoint = isRegistering ? '/api/auth/user/register' : '/api/auth/user/login';
    
    let fetchOptions = {};

    if (isRegistering) {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);
      formData.append('nidNumber', nidNumber.trim());
      formData.append('dob', dob);
      formData.append('phone', phone);
      
      const fileInput = document.querySelector('input[name="nidPhotoFile"]');
      if (fileInput && fileInput.files[0]) {
         formData.append('nidPhoto', fileInput.files[0]);
      }

      fetchOptions = {
        method: 'POST',
        body: formData
      };
    } else {
      fetchOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      };
    }

    try {
      const res = await fetch(`${API_URL}${endpoint}`, fetchOptions);
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

      <div className="glass-3d-shell" style={{ maxWidth: '450px' }}>
        <button className="pill-btn-3d" onClick={() => navigate('/')} style={{ marginBottom: '1rem' }}>
          <ArrowLeft size={15} /> Back
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.4rem' }}>
          <div className="orb-icon-3d">
            <div className="orb-icon-inner">
              <Users size={34} />
            </div>
          </div>
          <h2 className="title-gradient-3d" style={{ fontSize: '1.7rem' }}>
            Citizen SOS Portal
          </h2>
          <p className="subtitle-vivid" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            {isRegistering ? 'Bangladesh NID Verified Registration' : 'Sign in for instant 3D SOS access'}
          </p>
        </div>

        {error && (
          <div style={{
            padding: '0.85rem', marginBottom: '1.1rem', borderRadius: '14px',
            background: 'rgba(225, 29, 72, 0.12)', border: '1.5px solid rgba(225, 29, 72, 0.45)',
            color: '#be123c', textAlign: 'center', fontSize: '0.86rem', fontWeight: 700
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.3rem' }}>
              Full Name / Username
            </label>
            <input
              className="input-3d"
              type="text"
              required
              placeholder="Enter your name as on NID"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          {isRegistering && (
            <>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.86rem', fontWeight: 800, color: '#0b2e59' }}>
                    Bangladesh NID Number (10 / 13 / 17 Digits)
                  </label>
                  {nidNumber && (
                    <span style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: isNidFormatValid ? '#059669' : '#e11d48',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px'
                    }}>
                      <ShieldCheck size={14} />
                      {isNidFormatValid ? 'Valid BD NID Format' : 'Invalid Format'}
                    </span>
                  )}
                </div>
                <input
                  className="input-3d"
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="e.g. 1954829104 or 19992694810294812"
                  value={nidNumber}
                  onChange={(e) => setNidNumber(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.3rem' }}>
                    Date of Birth (As on NID)
                  </label>
                  <input
                    className="input-3d"
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.3rem' }}>
                    Mobile Number
                  </label>
                  <input
                    className="input-3d"
                    type="tel"
                    required
                    placeholder="017XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.3rem' }}>
                  Capture NID Card Front Photo
                </label>
                <label className="pill-btn-3d" style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', cursor: 'pointer' }}>
                  <CreditCard size={17} color="#0052cc" />
                  <span>{nidPhotoName ? `NID Attached: ${nidPhotoName}` : 'Open Camera for NID'}</span>
                  {/* capture="environment" সরাসরি ব্যাক ক্যামেরা চালু করবে */}
                  <input type="file" name="nidPhotoFile" accept="image/*" capture="environment" required onChange={handleNidPhotoChange} style={{ display: 'none' }} />
                </label>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.86rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.3rem' }}>
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

          <button type="submit" className="btn-3d-aqua" style={{ marginTop: '0.5rem' }} disabled={loading}>
            {loading ? 'Verifying...' : isRegistering ? 'Verify NID & Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#0052cc', cursor: 'pointer', fontWeight: 800, fontSize: '0.9rem' }}
          >
            {isRegistering ? 'Already NID verified? Sign in' : 'New citizen? Verify NID & Create Account'}
          </button>
        </div>
      </div>
    </div>
  );
}