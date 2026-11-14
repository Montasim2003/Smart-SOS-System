import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  MapPin, Phone, MessageSquare, Clock, AlertCircle,
  User, Activity, LogOut, Trash2, ShieldAlert, ExternalLink,
  Send, Image, ShieldCheck
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Sky3DScene } from '../App';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const rescueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://smart-sos-system.onrender.com';

const fallbackSocket = io(API_URL || window.location.origin, {
  path: '/socket.io/',
  transports: ['polling'],
  upgrade: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1500,
  timeout: 30000
});

export default function ProviderDashboard({ socket: propSocket }) {
  const activeSocket = propSocket || fallbackSocket;

  const [emergencies, setEmergencies] = useState([]);
  const [selectedSosId, setSelectedSosId] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [myLocation, setMyLocation] = useState(null);
  const [chatText, setChatText] = useState('');

  const navigate = useNavigate();
  const trackerRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const info = localStorage.getItem('providerInfo');
    if (info) {
      setProviderInfo(JSON.parse(info));
    } else {
      navigate('/provider/login');
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, [navigate]);

  const serviceType = providerInfo?.serviceType;

  const handleLogout = () => {
    localStorage.removeItem('providerToken');
    localStorage.removeItem('providerInfo');
    navigate('/provider/login');
  };

  useEffect(() => {
    if (!serviceType || !activeSocket) return;

    const playAlarm = () => {
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
        audio.play().catch(() => {});
      } catch (e) {}
    };

    activeSocket.emit('get_emergencies');

    const handleSync = (data) => {
      // Prevent duplicates during initial sync
      const uniqueData = Array.from(new Map(data.map(item => [item.id, item])).values());
      setEmergencies(uniqueData);
    };

    const handleNewEmergency = (data) => {
      if (
        data.service === serviceType ||
        data.service === 'General SOS' ||
        data.service === 'All Emergency'
      ) {
        playAlarm();
      }
      
      // FIX: Check if this SOS ID already exists to prevent duplicate cards
      setEmergencies((prev) => {
        const exists = prev.some(emp => emp.id === data.id);
        if (exists) {
          // Update the existing emergency with any new media/data instead of creating a new one
          return prev.map(emp => emp.id === data.id ? { ...emp, ...data } : emp);
        }
        return [data, ...prev];
      });
    };

    const handleUpdateEmergency = (data) => {
      setEmergencies((prev) =>
        prev.map((emp) =>
          emp.id === data.id
            ? {
                ...emp,
                message: data.message,
                voiceUrl: data.voiceUrl || emp.voiceUrl,
                videoUrl: data.videoUrl || emp.videoUrl
              }
            : emp
        )
      );
    };

    const handleUpdateStatus = (data) => {
      setEmergencies((prev) =>
        prev.map((emp) => (emp.id === data.id ? { ...emp, status: data.status } : emp))
      );
    };

    const handleUpdateLocation = (data) => {
      setEmergencies((prev) =>
        prev.map((emp) => (emp.id === data.id ? { ...emp, location: data.location } : emp))
      );
    };

    const handleReceiveChat = (msg) => {
      setEmergencies((prev) =>
        prev.map((emp) => {
          if (emp.id !== msg.sosId) return emp;
          const existing = emp.chatMessages || [];
          if (existing.some((m) => m.msgId === msg.msgId)) return emp;
          return { ...emp, chatMessages: [...existing, msg] };
        })
      );
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleDeleted = (data) => {
      setEmergencies((prev) => prev.filter((e) => e.id !== data.id));
    };

    activeSocket.on('sync_emergencies', handleSync);
    activeSocket.on('new_emergency', handleNewEmergency);
    activeSocket.on('update_emergency', handleUpdateEmergency);
    activeSocket.on('update_emergency_status', handleUpdateStatus);
    activeSocket.on('update_emergency_location', handleUpdateLocation);
    activeSocket.on('receive_chat_message', handleReceiveChat);
    activeSocket.on('sos_deleted', handleDeleted);

    return () => {
      activeSocket.off('sync_emergencies', handleSync);
      activeSocket.off('new_emergency', handleNewEmergency);
      activeSocket.off('update_emergency', handleUpdateEmergency);
      activeSocket.off('update_emergency_status', handleUpdateStatus);
      activeSocket.off('update_emergency_location', handleUpdateLocation);
      activeSocket.off('receive_chat_message', handleReceiveChat);
      activeSocket.off('sos_deleted', handleDeleted);

      if (trackerRef.current && navigator.geolocation) {
        navigator.geolocation.clearWatch(trackerRef.current);
      }
    };
  }, [activeSocket, serviceType]);

  const handleAccept = (sosId) => {
    activeSocket.emit('accept_sos', { id: sosId });
    setEmergencies((prev) =>
      prev.map((e) => (e.id === sosId ? { ...e, status: 'Dispatched' } : e))
    );

    if (navigator.geolocation) {
      if (trackerRef.current) {
        navigator.geolocation.clearWatch(trackerRef.current);
      }
      trackerRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setMyLocation(coords);
          activeSocket.emit('provider_location_update', {
            id: sosId,
            location: coords
          });
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 }
      );
    }
  };

  const handleDelete = (sosId) => {
    if (window.confirm('Are you sure you want to delete this SOS alert?')) {
      activeSocket.emit('delete_sos', { id: sosId });
      setEmergencies((prev) => prev.filter((e) => e.id !== sosId));
      if (selectedSosId === sosId) setSelectedSosId(null);
    }
  };

  const handleSendProviderChat = (e, sosId) => {
    e.preventDefault();
    if (!chatText.trim() || !sosId) return;
    activeSocket.emit('send_chat_message', {
      sosId,
      senderName: providerInfo?.serviceName || serviceType,
      senderRole: 'provider',
      text: chatText.trim(),
      image: null
    });
    setChatText('');
  };

  const handleSendProviderPhoto = (e, sosId) => {
    const file = e.target.files?.[0];
    if (!file || !sosId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 500;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
        activeSocket.emit('send_chat_message', {
          sosId,
          senderName: providerInfo?.serviceName || serviceType,
          senderRole: 'provider',
          text: '',
          image: compressedDataUrl
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!providerInfo) return null;

  const filteredEmergencies = emergencies.filter(
    (e) =>
      e.service === serviceType ||
      e.service === 'General SOS' ||
      e.service === 'All Emergency'
  );
  const pendingEmergencies = filteredEmergencies.filter((e) => e.status !== 'Dispatched');
  const acceptedEmergencies = filteredEmergencies.filter((e) => e.status === 'Dispatched');

  const displayedEmergencies =
    activeTab === 'pending' ? pendingEmergencies : acceptedEmergencies;

  const activeSos =
    displayedEmergencies.find((e) => e.id === selectedSosId) ||
    displayedEmergencies[0] ||
    null;

  return (
    <div className="provider-sky-page">
      <Sky3DScene />

      <style>{`
        .provider-sky-page {
          min-height: 100vh;
          width: 100%;
          padding: 1.5rem 2rem;
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .cmd-header-sky {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 1.2rem 1.8rem;
          border-radius: 28px;
          background: linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(228, 242, 255, 0.92));
          backdrop-filter: blur(20px);
          border: 2.5px solid #ffffff;
          box-shadow: 0 20px 45px rgba(45, 105, 175, 0.25), inset 0 2px 5px #ffffff;
        }
        .cmd-grid-sky {
          display: grid;
          grid-template-columns: 350px 1fr;
          gap: 1.6rem;
          flex: 1;
          min-height: calc(100vh - 165px);
        }
        @media (max-width: 960px) {
          .cmd-grid-sky {
            grid-template-columns: 1fr;
          }
        }
        .panel-sky-3d {
          background: linear-gradient(155deg, rgba(255, 255, 255, 0.94), rgba(228, 243, 255, 0.9));
          backdrop-filter: blur(22px);
          border-radius: 30px;
          border: 2.5px solid #ffffff;
          box-shadow: 0 22px 50px rgba(45, 105, 175, 0.26), inset 0 2px 5px #ffffff;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .tab-bar-sky {
          display: flex;
          gap: 0.75rem;
          padding: 1rem;
          background: rgba(215, 235, 255, 0.55);
          border-bottom: 1.5px solid rgba(0, 102, 255, 0.12);
        }
        .tab-btn-sky {
          flex: 1;
          padding: 0.82rem 1rem;
          border-radius: 16px;
          border: 1.5px solid #ffffff;
          background: linear-gradient(145deg, #ffffff, #e1effe);
          color: #1e3a8a;
          font-weight: 800;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 4px 6px 14px rgba(80, 130, 190, 0.25), -3px -3px 8px #ffffff;
        }
        .tab-btn-sky.active-pending {
          background: linear-gradient(135deg, #0088ff 0%, #0044cc 100%);
          color: #ffffff;
          border-color: #ffffff;
          box-shadow: 0 8px 20px rgba(0, 85, 225, 0.38), inset 0 2px 3px rgba(255, 255, 255, 0.5);
        }
        .tab-btn-sky.active-accepted {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          color: #ffffff;
          border-color: #ffffff;
          box-shadow: 0 8px 20px rgba(5, 150, 105, 0.35), inset 0 2px 3px rgba(255, 255, 255, 0.5);
        }
        .queue-item-sky {
          margin: 0.8rem 1rem 0;
          padding: 1.1rem 1.25rem;
          border-radius: 22px;
          background: linear-gradient(145deg, #ffffff, #e6f2ff);
          border: 2px solid #ffffff;
          box-shadow: 6px 10px 22px rgba(65, 120, 185, 0.22), -4px -4px 12px #ffffff;
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .queue-item-sky:hover, .queue-item-sky.selected {
          transform: translateY(-3px);
          border-color: #0077ff;
          box-shadow: 10px 14px 28px rgba(45, 105, 180, 0.34), 0 0 18px rgba(0, 119, 255, 0.2);
        }
        .badge-sky {
          padding: 0.32rem 0.8rem;
          border-radius: 999px;
          font-size: 0.74rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge-sky.pending {
          background: #ffe4e6;
          color: #be123c;
          border: 1.5px solid #fda4af;
        }
        .badge-sky.dispatched {
          background: #d1fae5;
          color: #047857;
          border: 1.5px solid #6ee7b7;
        }
        .subcard-sky {
          background: linear-gradient(145deg, #ffffff, #e8f3ff);
          border-radius: 24px;
          padding: 1.45rem;
          border: 2px solid #ffffff;
          box-shadow: 10px 14px 28px rgba(65, 120, 185, 0.22), -6px -6px 16px #ffffff;
        }
        .btn-dispatch-sky {
          padding: 0.88rem 1.55rem;
          border-radius: 16px;
          border: none;
          cursor: pointer;
          font-weight: 800;
          font-size: 0.92rem;
          color: #ffffff;
          background: linear-gradient(135deg, #10b981 0%, #047857 100%);
          box-shadow: 0 10px 22px rgba(5, 150, 105, 0.35), inset 0 2px 4px rgba(255, 255, 255, 0.5);
          transition: all 0.25s ease;
        }
        .btn-dispatch-sky:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 14px 28px rgba(5, 150, 105, 0.5);
        }
        .btn-delete-sky {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.88rem 1.25rem;
          border-radius: 16px;
          cursor: pointer;
          font-weight: 800;
          color: #be123c;
          background: linear-gradient(145deg, #fff1f2, #ffe4e6);
          border: 1.5px solid #fda4af;
          box-shadow: 6px 8px 18px rgba(190, 18, 60, 0.15);
          transition: all 0.2s ease;
        }
        .btn-delete-sky:hover {
          background: #fecdd3;
          transform: translateY(-2px);
        }
        .media-grid-sky {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.2rem;
        }
        .media-frame-sky {
          border-radius: 20px;
          overflow: hidden;
          border: 3px solid #ffffff;
          box-shadow: 10px 14px 28px rgba(55, 110, 175, 0.28);
          background: #dbeafe;
        }
        .media-frame-sky img {
          width: 100%;
          height: 220px;
          object-fit: cover;
          display: block;
        }
      `}</style>

      <header className="cmd-header-sky">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
          <div className="orb-icon-3d" style={{ width: '58px', height: '58px', margin: 0, padding: '6px' }}>
            <div className="orb-icon-inner">
              <Activity size={26} />
            </div>
          </div>
          <div>
            <div className="title-gradient-3d" style={{ fontSize: '1.55rem' }}>
              {providerInfo.serviceName}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#0052cc', fontWeight: 800 }}>
              {serviceType} 3D Command Center
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.55rem',
            color: '#047857', fontWeight: '800', fontSize: '0.84rem',
            backgroundColor: '#d1fae5',
            border: '1.5px solid #34d399',
            padding: '0.55rem 1.15rem', borderRadius: '999px',
            boxShadow: '0 6px 16px rgba(5, 150, 105, 0.2)'
          }}>
            <span style={{
              width: '10px', height: '10px', borderRadius: '50%',
              backgroundColor: '#059669', boxShadow: '0 0 8px #059669',
              display: 'inline-block'
            }} />
            RADAR ONLINE
          </div>

          <button className="pill-btn-3d" onClick={handleLogout} style={{ padding: '0.6rem 1.15rem' }}>
            <LogOut size={17} /> Logout
          </button>
        </div>
      </header>

      <div className="cmd-grid-sky">
        <div className="panel-sky-3d">
          <div className="tab-bar-sky">
            <button
              onClick={() => setActiveTab('pending')}
              className={`tab-btn-sky ${activeTab === 'pending' ? 'active-pending' : ''}`}
            >
              Pending ({pendingEmergencies.length})
            </button>
            <button
              onClick={() => setActiveTab('accepted')}
              className={`tab-btn-sky ${activeTab === 'accepted' ? 'active-accepted' : ''}`}
            >
              Accepted ({acceptedEmergencies.length})
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '1rem' }}>
            {displayedEmergencies.length === 0 ? (
              <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: '#1e40af' }}>
                <Clock size={46} style={{ margin: '0 auto 1rem', color: '#0066ff' }} />
                <p style={{ fontWeight: 800, fontSize: '0.96rem' }}>No emergencies in this category.</p>
              </div>
            ) : (
              displayedEmergencies.map((sos) => (
                <div
                  key={sos.id}
                  onClick={() => setSelectedSosId(sos.id)}
                  className={`queue-item-sky ${activeSos?.id === sos.id ? 'selected' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#062863' }}>
                      <AlertCircle
                        size={18}
                        color={sos.status === 'Pending' ? '#e11d48' : '#059669'}
                      />
                      {sos.service || 'SOS Alert'}
                    </div>
                    <span className={`badge-sky ${sos.status === 'Pending' ? 'pending' : 'dispatched'}`}>
                      {sos.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#1e40af', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{sos.profile?.username || sos.profile?.name || 'Victim'}</span>
                    <span>{new Date(sos.timestamp || sos.createdAt || Date.now()).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="panel-sky-3d" style={{ padding: '1.8rem', overflowY: 'auto' }}>
          {activeSos ? (
            <div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: '1rem', paddingBottom: '1.4rem',
                marginBottom: '1.6rem', borderBottom: '1.5px solid rgba(0, 102, 255, 0.14)'
              }}>
                <div>
                  <h2 style={{
                    fontSize: '1.8rem',
                    fontWeight: 800,
                    color: activeSos.status === 'Pending' ? '#e11d48' : '#059669',
                    marginBottom: '0.35rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem'
                  }}>
                    <ShieldAlert size={28} />
                    SOS ALERT {activeSos.status === 'Dispatched' && '(DISPATCHED)'}
                  </h2>
                  <span style={{ color: '#1e40af', fontSize: '0.92rem', fontWeight: 700 }}>
                    Triggered: {new Date(activeSos.timestamp || activeSos.createdAt || Date.now()).toLocaleString()}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
                  {activeSos.status === 'Pending' && (
                    <button className="btn-dispatch-sky" onClick={() => handleAccept(activeSos.id)}>
                      ACCEPT & DISPATCH TEAM
                    </button>
                  )}
                  <button className="btn-delete-sky" onClick={() => handleDelete(activeSos.id)}>
                    <Trash2 size={18} /> DELETE
                  </button>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '1.4rem'
              }}>
                <div className="subcard-sky">
                  <h3 className="title-gradient-3d" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.1rem' }}>
                    <User size={20} color="#0052d4" /> Victim Details
                  </h3>
                  {activeSos.profile ? (
                    <>
                      <div style={{ fontWeight: '800', fontSize: '1.3rem', marginBottom: '0.7rem', color: '#062863' }}>
                        {activeSos.profile.username || activeSos.profile.name}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.85rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '0.38rem 0.85rem',
                          borderRadius: '10px',
                          background: '#d1fae5',
                          border: '1.5px solid #34d399',
                          color: '#047857',
                          fontWeight: '800',
                          fontSize: '0.84rem'
                        }}>
                          <ShieldCheck size={15} />
                          NID: {activeSos.profile.nidNumber || 'Verified Citizen'}
                        </span>

                        {activeSos.profile.bloodGroup && (
                          <span style={{
                            padding: '0.38rem 0.85rem',
                            borderRadius: '10px',
                            background: '#ffe4e6',
                            border: '1.5px solid #fda4af',
                            color: '#be123c',
                            fontWeight: '800',
                            fontSize: '0.86rem'
                          }}>
                            Blood Group: {activeSos.profile.bloodGroup}
                          </span>
                        )}

                        {activeSos.profile.phone && (
                          <a
                            href={`tel:${activeSos.profile.phone}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.38rem 0.85rem',
                              borderRadius: '10px',
                              background: '#dbeafe',
                              border: '1.5px solid #93c5fd',
                              color: '#0052cc',
                              fontWeight: '800',
                              fontSize: '0.86rem',
                              textDecoration: 'none'
                            }}
                          >
                            <Phone size={14} /> {activeSos.profile.phone}
                          </a>
                        )}
                      </div>

                      {activeSos.profile.medicalNotes && (
                        <div style={{
                          color: '#0a2540',
                          fontSize: '0.92rem',
                          fontWeight: 600,
                          backgroundColor: '#f0f7ff',
                          padding: '0.8rem',
                          borderRadius: '14px',
                          border: '1.5px solid #bfdbfe'
                        }}>
                          <strong style={{ color: '#0052cc' }}>Medical Notes:</strong> {activeSos.profile.medicalNotes}
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{ color: '#1e40af', fontWeight: 700 }}>No profile data provided.</div>
                  )}
                </div>

                <div className="subcard-sky">
                  <h3 className="title-gradient-3d" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '1.1rem' }}>
                    <MapPin size={20} color="#0052d4" /> Live Moving Coordinates
                  </h3>
                  {activeSos.location && activeSos.location.lat ? (
                    <>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', marginBottom: '0.6rem',
                        backgroundColor: '#f0f7ff', padding: '0.7rem 0.95rem',
                        borderRadius: '12px', border: '1.5px solid #bfdbfe'
                      }}>
                        <span style={{ color: '#1e40af', fontWeight: 800 }}>LATITUDE</span>
                        <span style={{ color: '#047857', fontWeight: '800', fontFamily: 'monospace', fontSize: '1rem' }}>
                          {Number(activeSos.location.lat).toFixed(6)}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', marginBottom: '1.1rem',
                        backgroundColor: '#f0f7ff', padding: '0.7rem 0.95rem',
                        borderRadius: '12px', border: '1.5px solid #bfdbfe'
                      }}>
                        <span style={{ color: '#1e40af', fontWeight: 800 }}>LONGITUDE</span>
                        <span style={{ color: '#047857', fontWeight: '800', fontFamily: 'monospace', fontSize: '1rem' }}>
                          {Number(activeSos.location.lng).toFixed(6)}
                        </span>
                      </div>
                      <a
                        href={`https://www.google.com/maps?q=${activeSos.location.lat},${activeSos.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-3d-aqua"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: '0.5rem', textDecoration: 'none', padding: '0.78rem'
                        }}
                      >
                        <ExternalLink size={17} /> Open in Google Maps
                      </a>
                    </>
                  ) : (
                    <div style={{ color: '#1e40af', fontWeight: 700 }}>Acquiring GPS Signal...</div>
                  )}
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '1.4rem',
                marginTop: '1.5rem'
              }}>
                <div className="subcard-sky" style={{ display: 'flex', flexDirection: 'column', minHeight: '360px' }}>
                  <h3 className="title-gradient-3d" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', fontSize: '1.1rem' }}>
                    <MapPin size={20} color="#059669" /> Real-Time Live Tracking Map
                  </h3>
                  {activeSos.location && activeSos.location.lat ? (
                    <div style={{ flex: 1, borderRadius: '18px', overflow: 'hidden', border: '2px solid #bfdbfe', minHeight: '280px' }}>
                      <MapContainer
                        key={activeSos.id}
                        center={[activeSos.location.lat, activeSos.location.lng]}
                        zoom={15}
                        style={{ height: '100%', width: '100%', minHeight: '280px' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution="&copy; OpenStreetMap contributors"
                        />
                        <Marker position={[activeSos.location.lat, activeSos.location.lng]}>
                          <Popup>Victim Live Location (Moving)</Popup>
                        </Marker>
                        {myLocation && (
                          <Marker position={[myLocation.lat, myLocation.lng]} icon={rescueIcon}>
                            <Popup>Your Rescue Unit</Popup>
                          </Marker>
                        )}
                        {myLocation && (
                          <Polyline
                            positions={[
                              [activeSos.location.lat, activeSos.location.lng],
                              [myLocation.lat, myLocation.lng]
                            ]}
                            color="#0066ff"
                            weight={4}
                            dashArray="8, 8"
                          />
                        )}
                      </MapContainer>
                    </div>
                  ) : (
                    <div style={{ margin: 'auto', color: '#1e40af', fontWeight: 700 }}>Waiting for live GPS coordinates...</div>
                  )}
                </div>

                <div className="subcard-sky" style={{ display: 'flex', flexDirection: 'column', height: '360px' }}>
                  <h3 className="title-gradient-3d" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '1.1rem' }}>
                    <MessageSquare size={20} color="#0052d4" /> Live Messenger with Victim
                  </h3>

                  <div style={{
                    flex: 1, overflowY: 'auto', padding: '0.6rem', borderRadius: '16px',
                    background: '#f0f7ff', border: '1.5px solid #bfdbfe',
                    display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem'
                  }}>
                    {(!activeSos.chatMessages || activeSos.chatMessages.length === 0) ? (
                      <div style={{ margin: 'auto', color: '#475569', fontSize: '0.88rem', fontWeight: 600, textAlign: 'center' }}>
                        No messages yet. Send an update or photo to the victim.
                      </div>
                    ) : (
                      activeSos.chatMessages.map((m) => {
                        const isProvider = m.senderRole === 'provider';
                        return (
                          <div
                            key={m.msgId}
                            style={{
                              alignSelf: isProvider ? 'flex-end' : 'flex-start',
                              maxWidth: '82%',
                              padding: '0.6rem 0.85rem',
                              borderRadius: isProvider ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                              background: isProvider
                                ? 'linear-gradient(135deg, #0088ff 0%, #0052cc 100%)'
                                : '#ffffff',
                              color: isProvider ? '#ffffff' : '#0a2540',
                              border: isProvider ? 'none' : '1.5px solid #cbd5e1',
                              boxShadow: '0 3px 10px rgba(0, 82, 204, 0.1)'
                            }}
                          >
                            <div style={{
                              fontSize: '0.68rem', fontWeight: 800, marginBottom: '0.2rem',
                              color: isProvider ? '#dbeafe' : '#0052cc'
                            }}>
                              {m.senderName} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            {m.image && (
                              <img
                                src={m.image}
                                alt="Chat attachment"
                                style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '10px', marginBottom: m.text ? '0.35rem' : 0 }}
                              />
                            )}
                            {m.text && <div style={{ fontSize: '0.88rem', fontWeight: 600, wordBreak: 'break-word' }}>{m.text}</div>}
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <form onSubmit={(e) => handleSendProviderChat(e, activeSos.id)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label className="pill-btn-3d" style={{ padding: '0.68rem', cursor: 'pointer', marginBottom: 0 }}>
                      <Image size={18} color="#0052cc" />
                      <input type="file" accept="image/*" onChange={(e) => handleSendProviderPhoto(e, activeSos.id)} style={{ display: 'none' }} />
                    </label>
                    <input
                      className="input-3d"
                      style={{ flex: 1, padding: '0.68rem 0.95rem' }}
                      placeholder="Reply to victim..."
                      value={chatText}
                      onChange={(e) => setChatText(e.target.value)}
                    />
                    <button type="submit" className="btn-3d-aqua" style={{ width: 'auto', padding: '0.68rem 1rem' }}>
                      <Send size={16} />
                    </button>
                  </form>
                </div>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h3 className="title-gradient-3d" style={{
                  marginBottom: '1.2rem',
                  borderBottom: '1.5px solid rgba(0, 102, 255, 0.14)',
                  paddingBottom: '0.6rem',
                  fontSize: '1.22rem'
                }}>
                  Live Media Evidence
                </h3>

                <div className="media-grid-sky">
                  {activeSos.photoFrontUrl && (
                    <div className="media-frame-sky">
                      <img
                        src={activeSos.photoFrontUrl.startsWith('data:') ? activeSos.photoFrontUrl : `${API_URL}${activeSos.photoFrontUrl}`}
                        alt="Front Camera"
                      />
                    </div>
                  )}
                  {activeSos.photoBackUrl && (
                    <div className="media-frame-sky">
                      <img
                        src={activeSos.photoBackUrl.startsWith('data:') ? activeSos.photoBackUrl : `${API_URL}${activeSos.photoBackUrl}`}
                        alt="Back Camera"
                      />
                    </div>
                  )}
                  {activeSos.photoUrl && !activeSos.photoFrontUrl && !activeSos.photoBackUrl && (
                    <div className="media-frame-sky">
                      <img
                        src={activeSos.photoUrl.startsWith('data:') ? activeSos.photoUrl : `${API_URL}${activeSos.photoUrl}`}
                        alt="Snapshot"
                      />
                    </div>
                  )}
                </div>

                {activeSos.message && (
                  <div className="subcard-sky" style={{ marginTop: '1.2rem' }}>
                    <h3 className="title-gradient-3d" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', fontSize: '1.05rem' }}>
                      <MessageSquare size={18} color="#0052d4" /> Victim Situation Note
                    </h3>
                    <p style={{ color: '#0a2540', fontWeight: 600, lineHeight: 1.5 }}>{activeSos.message}</p>
                  </div>
                )}

                {activeSos.voiceUrl && (
                  <div className="subcard-sky" style={{ marginTop: '1.2rem' }}>
                    <h3 className="title-gradient-3d" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '1.05rem' }}>
                      <Phone size={18} color="#0052d4" /> Emergency Voice Note
                    </h3>
                    <audio controls src={`${API_URL}${activeSos.voiceUrl}`} style={{ width: '100%' }} />
                  </div>
                )}

                {activeSos.videoUrl && (
                  <div className="subcard-sky" style={{ marginTop: '1.2rem' }}>
                    <h3 className="title-gradient-3d" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '1.05rem' }}>
                      <Activity size={18} color="#0052d4" /> Emergency Video Footage
                    </h3>
                    <video
                      controls
                      src={`${API_URL}${activeSos.videoUrl}`}
                      style={{ width: '100%', maxHeight: '320px', borderRadius: '14px', backgroundColor: '#000' }}
                    />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '100%', color: '#1e40af', gap: '0.8rem'
            }}>
              <Activity size={48} style={{ color: '#0066ff' }} />
              <p style={{ fontSize: '1.08rem', fontWeight: 800 }}>Select an emergency alert from the left queue to inspect telemetry</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}