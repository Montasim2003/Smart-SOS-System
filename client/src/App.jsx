import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserApp from './components/UserApp';
import ProviderDashboard from './components/ProviderDashboard';
import UserLogin from './components/UserLogin';
import ProviderLogin from './components/ProviderLogin';
import HomeSelection from './components/HomeSelection';
import { io } from 'socket.io-client';
import { Shield } from 'lucide-react';
import './App.css';

const socket = io('http://localhost:5000'); // Note: For prod, change this to your backend URL

function App() {
  const [globalNotification, setGlobalNotification] = useState(null);

  useEffect(() => {
    socket.on('sos_accepted', (data) => {
      setGlobalNotification(data.message);
      setTimeout(() => setGlobalNotification(null), 10000);
    });
    return () => socket.off('sos_accepted');
  }, []);

  return (
    <Router>
      {globalNotification && (
        <div className="global-notification">
          <Shield size={28} />
          <span>{globalNotification}</span>
        </div>
      )}
      
      <Routes>
        <Route path="/" element={<HomeSelection />} />
        
        {/* User Routes */}
        <Route path="/user/login" element={<UserLogin />} />
        <Route path="/user/app" element={
          <ProtectedRoute role="user">
            <UserApp socket={socket} />
          </ProtectedRoute>
        } />

        {/* Provider Routes */}
        <Route path="/provider/login" element={<ProviderLogin />} />
        <Route path="/provider/dashboard" element={
          <ProtectedRoute role="provider">
            <ProviderDashboard socket={socket} />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

// Protected Route Component
function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem(`${role}Token`);
  if (!token) {
    return <Navigate to={`/${role}/login`} replace />;
  }
  return children;
}

export default App;
