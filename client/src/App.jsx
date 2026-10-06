import React, { useState, useEffect } from 'react';
import UserApp from './components/UserApp';
import ProviderDashboard from './components/ProviderDashboard';
import UserLogin from './components/UserLogin';
import ProviderLogin from './components/ProviderLogin';
import { io } from 'socket.io-client';
import { Shield } from 'lucide-react';

//const socket = io('http://localhost:5000');
const socket = io('https://smart-sos-system.onrender.com');

function App() {
  const [view, setView] = useState('user'); // 'user' or 'provider'
  const [userProfile, setUserProfile] = useState(null);
  const [providerService, setProviderService] = useState(null);
  const [globalNotification, setGlobalNotification] = useState(null);

  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setUserProfile(JSON.parse(savedProfile));
    }

    socket.on('sos_accepted', (data) => {
      setGlobalNotification(data.message);
      setTimeout(() => setGlobalNotification(null), 10000);
    });
    return () => socket.off('sos_accepted');
  }, []);

  return (
    <>
      {globalNotification && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-8 py-5 rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-4 z-[9999] animate-bounce border border-emerald-400">
          <Shield size={28} />
          <span className="font-bold text-xl whitespace-nowrap">{globalNotification}</span>
        </div>
      )}

      <div className="fixed top-2 right-2 z-50 flex gap-2">
        <button 
          onClick={() => setView('user')} 
          className={`px-3 py-1 rounded text-sm font-medium ${view === 'user' ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'} transition-all`}
        >
          User App
        </button>
        <button 
          onClick={() => setView('provider')} 
          className={`px-3 py-1 rounded text-sm font-medium ${view === 'provider' ? 'bg-blue-600 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'} transition-all`}
        >
          Provider Portal
        </button>
      </div>

      {view === 'user' ? (
        userProfile ? <UserApp profile={userProfile} socket={socket} /> : <UserLogin onComplete={setUserProfile} />
      ) : (
        providerService ? <ProviderDashboard serviceType={providerService} socket={socket} onLogout={() => setProviderService(null)} /> : <ProviderLogin onLogin={setProviderService} />
      )}
    </>
  );
}

export default App;
