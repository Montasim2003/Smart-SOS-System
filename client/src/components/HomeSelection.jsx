import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Activity } from 'lucide-react';

export default function HomeSelection() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-header">
        <Shield size={64} className="home-icon" />
        <h1 className="home-title">Smart SOS System</h1>
        <p className="home-subtitle">Select your portal to continue</p>
      </div>

      <div className="portal-cards">
        <div className="portal-card" onClick={() => navigate('/user/login')}>
          <Users size={48} className="card-icon" />
          <h2>User Portal</h2>
          <p>Send emergency SOS alerts and track help.</p>
          <button className="btn-primary">Access User Portal</button>
        </div>

        <div className="portal-card provider-card" onClick={() => navigate('/provider/login')}>
          <Activity size={48} className="card-icon provider-icon" />
          <h2>Provider Portal</h2>
          <p>Receive and manage incoming emergency alerts.</p>
          <button className="btn-provider">Access Provider Portal</button>
        </div>
      </div>
    </div>
  );
}
