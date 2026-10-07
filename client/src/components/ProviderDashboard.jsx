import React, { useEffect, useState } from 'react';
import { MapPin, Phone, MessageSquare, Clock, AlertCircle, User, Activity, LogOut } from 'lucide-react';

//const API_URL = 'http://localhost:5000';
const API_URL = 'https://smart-sos-system.onrender.com';

export default function ProviderDashboard({ serviceType, socket, onLogout }) {
  const [emergencies, setEmergencies] = useState([]);

  useEffect(() => {
    const playAlarm = () => {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
        audio.play().catch(e => console.log('Audio play failed, user interaction needed', e));
      } catch(e) {}
    };

    socket.emit('get_emergencies');

    socket.on('sync_emergencies', (data) => {
      setEmergencies(data);
    });

    socket.on('new_emergency', (data) => {
      if (data.service === serviceType) {
        playAlarm();
      }
      setEmergencies((prev) => [data, ...prev]);
    });

    socket.on('update_emergency', (data) => {
      setEmergencies((prev) => prev.map(emp => 
        emp.id === data.id 
          ? { ...emp, message: data.message, voiceUrl: data.voiceUrl || emp.voiceUrl, videoUrl: data.videoUrl || emp.videoUrl } 
          : emp
      ));
    });

    socket.on('update_emergency_status', (data) => {
      setEmergencies((prev) => prev.map(emp => 
        emp.id === data.id ? { ...emp, status: data.status } : emp
      ));
    });

    socket.on('update_emergency_location', (data) => {
      setEmergencies((prev) => prev.map(emp => 
        emp.id === data.id ? { ...emp, location: data.location } : emp
      ));
    });

    return () => {
      socket.off('sync_emergencies');
      socket.off('new_emergency');
      socket.off('update_emergency');
      socket.off('update_emergency_status');
      socket.off('update_emergency_location');
    };
  }, [socket, serviceType]);

  const handleAccept = (sosId) => {
    socket.emit('accept_sos', { id: sosId });
    setEmergencies((prev) => 
      prev.map(e => e.id === sosId ? { ...e, status: 'Dispatched' } : e)
    );
  };

  const [activeTab, setActiveTab] = useState('pending');

  const filteredEmergencies = emergencies.filter(e => e.service === serviceType);
  const pendingEmergencies = filteredEmergencies.filter(e => e.status !== 'Dispatched');
  const acceptedEmergencies = filteredEmergencies.filter(e => e.status === 'Dispatched');
  
  const displayedEmergencies = activeTab === 'pending' ? pendingEmergencies : acceptedEmergencies;

  return (
    <div className="min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-950 via-slate-950 to-slate-950 p-4 md:p-8 text-slate-200">
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row items-center justify-between mb-8 bg-slate-900/50 backdrop-blur-xl p-6 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)] border border-blue-500/30">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <AlertCircle size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-tight uppercase">{serviceType} COMMAND CENTER</h1>
              <p className="text-blue-400/70 font-medium tracking-wide uppercase text-sm mt-1">Live Emergency Monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="flex items-center gap-3 bg-emerald-500/10 px-5 py-2.5 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.8)]"></div>
              <span className="text-emerald-400 font-bold tracking-widest text-sm">ONLINE</span>
            </div>
            <button onClick={onLogout} className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-full border border-slate-700 transition-colors">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 rounded-xl font-bold tracking-wider transition-all duration-300 border ${
              activeTab === 'pending'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:bg-slate-800/50 hover:text-slate-400'
            }`}
          >
            PENDING ALERTS ({pendingEmergencies.length})
          </button>
          <button
            onClick={() => setActiveTab('accepted')}
            className={`px-6 py-3 rounded-xl font-bold tracking-wider transition-all duration-300 border ${
              activeTab === 'accepted'
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'bg-slate-900/50 text-slate-500 border-slate-800 hover:bg-slate-800/50 hover:text-slate-400'
            }`}
          >
            ACCEPTED / HISTORY ({acceptedEmergencies.length})
          </button>
        </div>

        {displayedEmergencies.length === 0 ? (
          <div className="bg-slate-900/30 backdrop-blur-md rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.3)] border border-slate-800 p-16 flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700">
              <Clock size={40} className="text-slate-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-slate-300 mb-2 tracking-wide">
              {activeTab === 'pending' ? 'No Active Emergencies' : 'No Accepted Emergencies'}
            </h2>
            <p className="text-slate-500 text-lg">
              {activeTab === 'pending' ? `Awaiting incoming signals for ${serviceType}...` : 'History is empty...'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {displayedEmergencies.map((sos) => (
              <div key={sos.id} className={`bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.15)] border ${sos.status === 'Dispatched' ? 'border-emerald-500/80 shadow-[0_0_30px_rgba(16,185,129,0.3)]' : 'border-blue-500/30'} overflow-hidden flex flex-col transform transition-all hover:-translate-y-1 hover:shadow-[0_0_50px_rgba(59,130,246,0.25)] group relative`}>
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none"></div>
                <div className={`backdrop-blur-md p-5 flex justify-between items-center text-white border-b ${sos.status === 'Dispatched' ? 'bg-emerald-600/90 border-emerald-500/50' : 'bg-red-600/90 border-red-500/50'}`}>
                  <h3 className="text-2xl font-black tracking-wider flex items-center gap-3">
                    <AlertCircle className={sos.status === 'Dispatched' ? '' : 'animate-pulse'} />
                    SOS ALERT {sos.status === 'Dispatched' && '(HANDLED)'}
                  </h3>
                  <span className="bg-black/30 px-3 py-1 rounded-lg text-red-100 text-sm font-bold tracking-widest">{new Date(sos.timestamp).toLocaleTimeString()}</span>
                </div>
                
                <div className="p-6 flex-1 flex flex-col gap-6 relative z-10">
                  {/* User Profile Section */}
                  {sos.profile && (
                    <div className="bg-black/30 p-4 rounded-2xl border border-slate-800 grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-indigo-400 font-bold mb-1 text-xs tracking-widest uppercase"><User size={14} /> Victim Details</div>
                        <p className="font-semibold text-lg text-slate-200">{sos.profile.name}</p>
                        <p className="text-slate-400 text-sm">📱 {sos.profile.mobile}</p>
                        <p className="text-slate-400 text-sm">🆘 {sos.profile.emergencyContact}</p>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-rose-400 font-bold mb-1 text-xs tracking-widest uppercase"><Activity size={14} /> Medical Info</div>
                        <div className="inline-block bg-rose-500/20 text-rose-400 font-bold px-2 py-0.5 rounded border border-rose-500/30 text-sm mb-1">{sos.profile.bloodGroup}</div>
                        {sos.profile.allergies && <p className="text-slate-300 text-xs mt-1"><span className="text-slate-500">Allergies:</span> {sos.profile.allergies}</p>}
                        {sos.profile.medicalConditions && <p className="text-slate-300 text-xs mt-1"><span className="text-slate-500">Conditions:</span> {sos.profile.medicalConditions}</p>}
                      </div>
                    </div>
                  )}

                  {/* Photo & Location Section */}
                  <div className="flex flex-col sm:flex-row gap-6">
                    <div className="w-full sm:w-2/5 flex flex-col gap-2">
                      <div className="bg-black/40 rounded-2xl overflow-hidden shadow-inner border border-slate-700 aspect-square flex items-center justify-center relative group-hover:border-slate-500 transition-colors">
                        {(sos.photoFrontUrl || sos.photoUrl) ? (
                          <img src={(sos.photoFrontUrl || sos.photoUrl).startsWith('data:') ? (sos.photoFrontUrl || sos.photoUrl) : `${API_URL}${sos.photoFrontUrl || sos.photoUrl}`} alt="Front Cam" className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-slate-600 text-sm p-4 text-center font-medium tracking-wide">NO FRONT PHOTO</span>
                        )}
                        <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 text-[10px] text-white rounded font-mono">FRONT</span>
                      </div>
                      <div className="bg-black/40 rounded-2xl overflow-hidden shadow-inner border border-slate-700 aspect-square flex items-center justify-center relative group-hover:border-slate-500 transition-colors">
                        {sos.photoBackUrl ? (
                          <img src={sos.photoBackUrl.startsWith('data:') ? sos.photoBackUrl : `${API_URL}${sos.photoBackUrl}`} alt="Back Cam" className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-slate-600 text-sm p-4 text-center font-medium tracking-wide">NO BACK PHOTO</span>
                        )}
                        <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 text-[10px] text-white rounded font-mono">BACK</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-4">
                      <div className="bg-black/30 p-5 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold mb-3 text-sm tracking-widest uppercase">
                          <MapPin size={18} />
                          Live Coordinates
                        </div>
                        {sos.location && sos.location.lat ? (
                          <div className="text-sm text-slate-300 space-y-2">
                            <div className="flex items-center justify-between bg-black/50 p-2 rounded-lg border border-slate-800">
                              <span className="text-slate-500">LAT</span>
                              <span className="font-mono text-emerald-400 font-bold">{sos.location.lat.toFixed(6)}</span>
                            </div>
                            <div className="flex items-center justify-between bg-black/50 p-2 rounded-lg border border-slate-800">
                              <span className="text-slate-500">LNG</span>
                              <span className="font-mono text-emerald-400 font-bold">{sos.location.lng.toFixed(6)}</span>
                            </div>
                            
                            <div className="mt-4 rounded-xl overflow-hidden border border-slate-700 h-48 w-full relative">
                              <iframe 
                                width="100%" 
                                height="100%" 
                                frameBorder="0" 
                                scrolling="no" 
                                marginHeight="0" 
                                marginWidth="0" 
                                src={`https://www.openstreetmap.org/export/embed.html?bbox=${sos.location.lng-0.005},${sos.location.lat-0.005},${sos.location.lng+0.005},${sos.location.lat+0.005}&layer=mapnik&marker=${sos.location.lat},${sos.location.lng}`}
                                className="absolute inset-0"
                                title="Live Map"
                              ></iframe>
                            </div>

                            <a href={`https://www.google.com/maps?q=${sos.location.lat},${sos.location.lng}`} target="_blank" rel="noreferrer" className="block mt-4 text-center bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 py-2 rounded-xl border border-blue-500/30 font-bold tracking-wide transition-colors">LAUNCH GOOGLE MAPS</a>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-600 italic font-medium">Acquiring GPS Signal...</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Message & Voice Section */}
                  <div className="space-y-4">
                    {sos.message && (
                      <div className="bg-black/30 p-5 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2 text-blue-400 font-bold mb-3 text-sm tracking-widest uppercase">
                          <MessageSquare size={18} />
                          Incoming Transmission
                        </div>
                        <p className="text-slate-200 text-sm whitespace-pre-wrap leading-relaxed font-medium bg-black/40 p-4 rounded-xl border border-slate-800/50">{sos.message}</p>
                      </div>
                    )}
                    
                    {sos.voiceUrl && (
                      <div className="bg-black/30 p-5 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2 text-purple-400 font-bold mb-3 text-sm tracking-widest uppercase">
                          <Phone size={18} />
                          Audio Intercept
                        </div>
                        <audio controls src={`${API_URL}${sos.voiceUrl}`} className="w-full h-12 rounded-lg opacity-80 hover:opacity-100 transition-opacity" />
                      </div>
                    )}
                    
                    {sos.videoUrl && (
                      <div className="bg-black/30 p-5 rounded-2xl border border-slate-800">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold mb-3 text-sm tracking-widest uppercase">
                          <AlertCircle size={18} />
                          Video Footage
                        </div>
                        <video controls src={`${API_URL}${sos.videoUrl}`} className="w-full max-h-48 rounded-lg object-contain bg-black border border-slate-700" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-slate-900/80 backdrop-blur-md border-t border-slate-800 mt-auto relative z-10">
                  <button
                    onClick={() => handleAccept(sos.id)}
                    disabled={sos.status === 'Dispatched'}
                    className={`w-full font-black py-4 rounded-2xl transition-all duration-300 text-lg tracking-widest border ${
                      sos.status === 'Dispatched' 
                        ? 'bg-emerald-600/50 text-emerald-200 border-emerald-500/50 cursor-not-allowed shadow-none' 
                        : 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)] hover:shadow-[0_0_25px_rgba(59,130,246,0.7)] hover:scale-[1.02] active:scale-[0.98] border-blue-400/50'
                    }`}
                  >
                    {sos.status === 'Dispatched' ? 'TEAM DISPATCHED' : 'ACCEPT & DISPATCH TEAM'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
