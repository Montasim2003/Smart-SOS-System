import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Shield, Users, Activity } from 'lucide-react';
import UserLogin from './components/UserLogin';
import UserApp from './components/UserApp';
import ProviderLogin from './components/ProviderLogin';
import ProviderDashboard from './components/ProviderDashboard';
import './App.css';

export function Sky3DScene() {
  return (
    <div className="sky-scene-container">
      <svg className="scene-svg" viewBox="0 0 1440 900" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="orbTreeGrad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="50%" stopColor="#bfe0ff" />
            <stop offset="100%" stopColor="#72aee6" />
          </radialGradient>
          <radialGradient id="orbTreeDark" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#e6f4ff" />
            <stop offset="55%" stopColor="#94c6f5" />
            <stop offset="100%" stopColor="#4f8bc9" />
          </radialGradient>
          <radialGradient id="cloudGrad3D" cx="40%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="70%" stopColor="#eaf5ff" />
            <stop offset="100%" stopColor="#bfdcf9" />
          </radialGradient>
          <linearGradient id="hillBack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#83b8ec" />
            <stop offset="100%" stopColor="#5a94d1" />
          </linearGradient>
          <linearGradient id="hillMid" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b3dbfb" />
            <stop offset="100%" stopColor="#7db5ec" />
          </linearGradient>
          <linearGradient id="hillFront" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#e3f2ff" />
            <stop offset="100%" stopColor="#b5dafc" />
          </linearGradient>
          <linearGradient id="trunkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5e97d1" />
            <stop offset="100%" stopColor="#356ca6" />
          </linearGradient>
        </defs>

        <g className="float-cloud-slow">
          <ellipse cx="220" cy="145" rx="95" ry="52" fill="url(#cloudGrad3D)" />
          <circle cx="165" cy="130" r="55" fill="url(#cloudGrad3D)" />
          <circle cx="240" cy="115" r="68" fill="url(#cloudGrad3D)" />
          <circle cx="305" cy="140" r="46" fill="url(#cloudGrad3D)" />
        </g>

        <g className="float-cloud-fast">
          <ellipse cx="1180" cy="170" rx="110" ry="56" fill="url(#cloudGrad3D)" />
          <circle cx="1115" cy="150" r="62" fill="url(#cloudGrad3D)" />
          <circle cx="1200" cy="132" r="74" fill="url(#cloudGrad3D)" />
          <circle cx="1275" cy="162" r="50" fill="url(#cloudGrad3D)" />
        </g>

        <g className="float-cloud-slow">
          <ellipse cx="730" cy="105" rx="75" ry="38" fill="url(#cloudGrad3D)" opacity="0.85" />
          <circle cx="695" cy="92" r="42" fill="url(#cloudGrad3D)" opacity="0.85" />
          <circle cx="755" cy="88" r="48" fill="url(#cloudGrad3D)" opacity="0.85" />
        </g>

        <path
          className="hill-wave-1"
          d="M-100 680 C 260 560, 620 740, 980 600 C 1220 510, 1380 630, 1560 610 L 1560 900 L -100 900 Z"
          fill="url(#hillBack)"
        />

        <path
          className="hill-wave-2"
          d="M-100 735 C 320 640, 740 780, 1120 675 C 1320 620, 1440 700, 1560 690 L 1560 900 L -100 900 Z"
          fill="url(#hillMid)"
        />

        <g className="float-tree-left">
          <ellipse cx="195" cy="820" rx="75" ry="14" fill="rgba(53, 108, 166, 0.25)" />
          <path d="M185 710 L195 820 L208 820 L202 710 Z" fill="url(#trunkGrad)" />
          <path d="M196 765 L172 735 L179 730 L198 755 Z" fill="url(#trunkGrad)" />
          <path d="M200 755 L224 728 L217 723 L198 747 Z" fill="url(#trunkGrad)" />
          <circle cx="196" cy="625" r="98" fill="url(#orbTreeGrad)" />
          <ellipse cx="95" cy="790" rx="28" ry="42" fill="url(#orbTreeDark)" />
          <ellipse cx="132" cy="805" rx="18" ry="26" fill="url(#orbTreeGrad)" />
        </g>

        <g className="float-tree-left" style={{ animationDelay: '-2.5s' }}>
          <ellipse cx="420" cy="755" rx="18" ry="46" fill="url(#orbTreeGrad)" />
          <ellipse cx="445" cy="770" rx="12" ry="24" fill="url(#orbTreeDark)" />
        </g>

        <g className="float-tree-right">
          <ellipse cx="1255" cy="815" rx="72" ry="14" fill="rgba(53, 108, 166, 0.28)" />
          <path d="M1246 705 L1252 815 L1266 815 L1260 705 Z" fill="url(#trunkGrad)" />
          <path d="M1254 760 L1230 732 L1237 727 L1256 750 Z" fill="url(#trunkGrad)" />
          <circle cx="1256" cy="635" r="88" fill="url(#orbTreeGrad)" />
        </g>

        <g className="float-tree-right" style={{ animationDelay: '-3s' }}>
          <ellipse cx="1055" cy="775" rx="45" ry="9" fill="rgba(53, 108, 166, 0.22)" />
          <path d="M1050 715 L1054 775 L1062 775 L1058 715 Z" fill="url(#trunkGrad)" />
          <circle cx="1056" cy="670" r="54" fill="url(#orbTreeDark)" />
        </g>

        <path
          d="M-100 810 C 350 755, 850 845, 1560 780 L 1560 900 L -100 900 Z"
          fill="url(#hillFront)"
        />

        <g className="float-orb-bob">
          <circle cx="845" cy="715" r="20" fill="url(#orbTreeGrad)" />
          <ellipse cx="920" cy="835" rx="32" ry="40" fill="url(#orbTreeGrad)" />
          <ellipse cx="962" cy="848" rx="24" ry="30" fill="url(#orbTreeDark)" />
          <circle cx="1165" cy="765" r="24" fill="url(#orbTreeDark)" />
        </g>
      </svg>
    </div>
  );
}

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="water-bg-wrapper">
      <Sky3DScene />

      <div style={{ textAlign: 'center', maxWidth: '680px', marginBottom: '1rem' }}>
        <div className="orb-icon-3d" style={{ width: '88px', height: '88px' }}>
          <div className="orb-icon-inner">
            <Shield size={40} />
          </div>
        </div>
        <h1 className="title-gradient-3d" style={{ fontSize: '2.9rem', marginBottom: '0.45rem' }}>
          Smart SOS System
        </h1>
        <p className="subtitle-vivid" style={{ fontSize: '1.08rem' }}>
          Next-Gen 3D Emergency Dispatch & Live Rescue Telemetry Portal
        </p>
      </div>

      <div className="portal-grid">
        <div className="portal-3d-card">
          <div className="orb-icon-3d">
            <div className="orb-icon-inner">
              <Users size={32} />
            </div>
          </div>
          <h2 className="title-gradient-3d" style={{ fontSize: '1.55rem', marginBottom: '0.6rem' }}>
            User Portal
          </h2>
          <p style={{ color: '#2b4c7e', fontSize: '0.94rem', fontWeight: 600, marginBottom: '1.8rem', lineHeight: '1.55' }}>
            Trigger 3D instant emergency SOS alerts, dual-camera evidence, and track live rescue units.
          </p>
          <button className="btn-3d-aqua" onClick={() => navigate('/user/login')}>
            Access User Portal
          </button>
        </div>

        <div className="portal-3d-card">
          <div className="orb-icon-3d">
            <div className="orb-icon-inner">
              <Activity size={32} />
            </div>
          </div>
          <h2 className="title-gradient-3d" style={{ fontSize: '1.55rem', marginBottom: '0.6rem' }}>
            Provider Portal
          </h2>
          <p style={{ color: '#2b4c7e', fontSize: '0.94rem', fontWeight: 600, marginBottom: '1.8rem', lineHeight: '1.55' }}>
            Receive real-time SOS feeds, inspect live telemetry & media, and dispatch rescue teams.
          </p>
          <button className="btn-3d-aqua" onClick={() => navigate('/provider/login')}>
            Access Provider Portal
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  // phn er apk r jonno
  if (Capacitor.isNativePlatform()) {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/user/login" replace />} />
          <Route path="/user/login" element={<UserLogin />} />
          <Route path="/user/app" element={<UserApp />} />
          <Route path="*" element={<Navigate to="/user/login" replace />} />
        </Routes>
      </Router>
    );
  }

  // browser e open korar jonno 
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/app" element={<UserApp />} />
        <Route path="/provider/login" element={<ProviderLogin />} />
        <Route path="/provider/dashboard" element={<ProviderDashboard />} />
      </Routes>
    </Router>
  );
}