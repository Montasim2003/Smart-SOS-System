import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Phone, MessageSquare, Clock, AlertCircle, User, Activity, LogOut, Trash2 } from 'lucide-react';

const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : 'https://smart-sos-system.onrender.com';

export default function ProviderDashboard({ socket }) {
  const [emergencies, setEmergencies] = useState([]);
  const [providerInfo, setProviderInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const navigate = useNavigate();
  const trackerRef = useRef(null);

  useEffect(() => {
    const info = localStorage.getItem('providerInfo');
    if (info) {
      setProviderInfo(JSON.parse(info));
    } else {
      navigate('/provider/login');
    }
  }, [navigate]);

  const serviceType = providerInfo?.serviceType;

  const handleLogout = () => {
    localStorage.removeItem('providerToken');
    localStorage.removeItem('providerInfo');
    navigate('/provider/login');
  };

  useEffect(() => {
    if (!serviceType) return;

    const playAlarm = () => {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
        audio.play().catch(e => console.log('Audio play failed', e));
      } catch (e) { }
    };

    socket.emit('get_emergencies');

    socket.on('sync_emergencies', (data) => {
      setEmergencies(data);
    });

    socket.on('new_emergency', (data) => {
      if (data.service === serviceType || data.service === 'General SOS') {
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

    socket.on('sos_deleted', (data) => {
      setEmergencies((prev) => prev.filter(e => e.id !== data.id));
    });

    return () => {
      socket.off('sync_emergencies');
      socket.off('new_emergency');
      socket.off('update_emergency');
      socket.off('update_emergency_status');
      socket.off('update_emergency_location');
      socket.off('sos_deleted');
      if (trackerRef.current) {
        if (navigator.geolocation) {
          navigator.geolocation.clearWatch(trackerRef.current);
        } else {
          clearInterval(trackerRef.current);
        }
      }
    };
  }, [socket, serviceType]);

  const handleAccept = (sosId) => {
    socket.emit('accept_sos', { id: sosId });
    setEmergencies((prev) =>
      prev.map(e => e.id === sosId ? { ...e, status: 'Dispatched' } : e)
    );

    if (navigator.geolocation) {
      trackerRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          socket.emit('provider_location_update', { 
            id: sosId, 
            location: { lat: latitude, lng: longitude } 
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Please enable GPS/Location to share live tracking with the victim.");
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const handleDelete = (sosId) => {
    if (window.confirm('Are you sure you want to delete this SOS alert?')) {
      socket.emit('delete_sos', { id: sosId });
      setEmergencies((prev) => prev.filter(e => e.id !== sosId));
    }
  };

  if (!providerInfo) return null;

  const filteredEmergencies = emergencies.filter(e => e.service === serviceType || e.service === 'General SOS');
  const pendingEmergencies = filteredEmergencies.filter(e => e.status !== 'Dispatched');
  const acceptedEmergencies = filteredEmergencies.filter(e => e.status === 'Dispatched');

  const displayedEmergencies = activeTab === 'pending' ? pendingEmergencies : acceptedEmergencies;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="dashboard-title">
          <Activity size={32} />
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{providerInfo.serviceName}</div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{serviceType} Command Center</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success-color)', fontWeight: 'bold', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 1rem', borderRadius: '2rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--success-color)', display: 'inline-block' }}></span>
            ONLINE
          </div>
          <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        <div className="emergency-list">
          <div className="list-header" style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setActiveTab('pending')}
              style={{
                flex: 1, padding: '1rem', background: activeTab === 'pending' ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: activeTab === 'pending' ? '#3b82f6' : 'var(--text-muted)', fontWeight: 'bold',
                borderBottom: activeTab === 'pending' ? '2px solid #3b82f6' : 'none'
              }}
            >
              Pending ({pendingEmergencies.length})
            </button>
            <button
              onClick={() => setActiveTab('accepted')}
              style={{
                flex: 1, padding: '1rem', background: activeTab === 'accepted' ? 'rgba(16,185,129,0.2)' : 'transparent',
                color: activeTab === 'accepted' ? 'var(--success-color)' : 'var(--text-muted)', fontWeight: 'bold',
                borderBottom: activeTab === 'accepted' ? '2px solid var(--success-color)' : 'none'
              }}
            >
              Accepted ({acceptedEmergencies.length})
            </button>
          </div>

          <div className="list-items">
            {displayedEmergencies.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Clock size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                <p>No emergencies in this category.</p>
              </div>
            ) : (
              displayedEmergencies.map(sos => (
                <div key={sos.id} className="emergency-item">
                  <div className="emergency-item-header">
                    <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertCircle size={16} color={sos.status === 'Pending' ? 'var(--danger-color)' : 'var(--success-color)'} />
                      SOS Alert
                    </div>
                    <span className={`badge ${sos.status === 'Pending' ? 'pending' : 'dispatched'}`}>{sos.status}</span>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    {new Date(sos.timestamp || sos.createdAt || Date.now()).toLocaleTimeString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="emergency-detail">
          {displayedEmergencies.length > 0 ? (
            (() => {
              const sos = displayedEmergencies[0];
              return (
                <div>
                  <div className="detail-header">
                    <div>
                      <h2 style={{ fontSize: '2rem', color: sos.status === 'Pending' ? 'var(--danger-color)' : 'var(--success-color)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertCircle /> SOS ALERT {sos.status === 'Dispatched' && '(HANDLED)'}
                      </h2>
                      <span style={{ color: 'var(--text-muted)' }}>{new Date(sos.timestamp || sos.createdAt || Date.now()).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {sos.status === 'Pending' && (
                        <button className="btn-provider" onClick={() => handleAccept(sos.id)}>
                          ACCEPT & DISPATCH TEAM
                        </button>
                      )}
                      <button className="btn-secondary" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger-color)', border: '1px solid var(--danger-color)' }} onClick={() => handleDelete(sos.id)}>
                        <Trash2 size={20} /> DELETE
                      </button>
                    </div>
                  </div>

                  <div className="info-grid">
                    <div className="info-card">
                      <h3><User size={20} /> Victim Details</h3>
                      {sos.profile ? (
                        <>
                          <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginBottom: '0.5rem' }}>{sos.profile.username || sos.profile.name}</div>
                          {sos.profile.email && <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Email: {sos.profile.email}</div>}
                          {sos.profile.phone && <div style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Phone: {sos.profile.phone}</div>}
                          {sos.profile.bloodGroup && <div style={{ color: 'var(--danger-color)', fontWeight: 'bold', marginBottom: '0.5rem' }}>Blood Group: {sos.profile.bloodGroup}</div>}
                          {sos.profile.medicalNotes && <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '0.5rem' }}>Notes: {sos.profile.medicalNotes}</div>}
                        </>
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>No profile data provided.</div>
                      )}
                    </div>

                    <div className="info-card">
                      <h3><MapPin size={20} /> Live Coordinates</h3>
                      {sos.location && sos.location.lat ? (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>LAT</span>
                            <span style={{ color: 'var(--success-color)', fontWeight: 'bold', fontFamily: 'monospace' }}>{sos.location.lat.toFixed(6)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: '0.5rem' }}>
                            <span style={{ color: 'var(--text-muted)' }}>LNG</span>
                            <span style={{ color: 'var(--success-color)', fontWeight: 'bold', fontFamily: 'monospace' }}>{sos.location.lng.toFixed(6)}</span>
                          </div>
                          <a href={`https://www.google.com/maps?q=${sos.location.lat},${sos.location.lng}`} target="_blank" rel="noreferrer" style={{ display: 'block', textAlign: 'center', color: '#3b82f6', textDecoration: 'underline' }}>
                            Open in Google Maps
                          </a>
                        </>
                      ) : (
                        <div style={{ color: 'var(--text-muted)' }}>Acquiring GPS Signal...</div>
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '2rem' }}>
                    <h3 style={{ color: 'white', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Media Evidence</h3>

                    <div className="media-grid">
                      {sos.photoFrontUrl && (
                        <div className="media-box">
                          <img src={sos.photoFrontUrl.startsWith('data:') ? sos.photoFrontUrl : `${API_URL}${sos.photoFrontUrl}`} alt="Front" />
                        </div>
                      )}
                      {sos.photoBackUrl && (
                        <div className="media-box">
                          <img src={sos.photoBackUrl.startsWith('data:') ? sos.photoBackUrl : `${API_URL}${sos.photoBackUrl}`} alt="Back" />
                        </div>
                      )}
                      {sos.photoUrl && !sos.photoFrontUrl && !sos.photoBackUrl && (
                        <div className="media-box">
                          <img src={sos.photoUrl.startsWith('data:') ? sos.photoUrl : `${API_URL}${sos.photoUrl}`} alt="Snapshot" />
                        </div>
                      )}
                    </div>

                    {sos.message && (
                      <div className="info-card" style={{ marginTop: '1rem' }}>
                        <h3><MessageSquare size={20} /> Message</h3>
                        <p>{sos.message}</p>
                      </div>
                    )}

                    {sos.voiceUrl && (
                      <div className="info-card" style={{ marginTop: '1rem' }}>
                        <h3><Phone size={20} /> Voice Note</h3>
                        <audio controls src={`${API_URL}${sos.voiceUrl}`} style={{ width: '100%' }} />
                      </div>
                    )}

                    {sos.videoUrl && (
                      <div className="info-card" style={{ marginTop: '1rem' }}>
                        <h3><Activity size={20} /> Video Footage</h3>
                        <video controls src={`${API_URL}${sos.videoUrl}`} style={{ width: '100%', maxHeight: '300px', backgroundColor: 'black' }} />
                      </div>
                    )}
                  </div>

                </div>
              );
            })()
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
              Select an emergency to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}