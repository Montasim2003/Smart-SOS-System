import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Plus, Flame, Shield, AlertTriangle, User, LogOut,
  Activity, X, Mic, Video, Send, CheckCircle,
  MessageSquare, Image, Trash2, Navigation
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

const BACKEND_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000'
  : 'https://smart-sos-system.onrender.com';

const socket = io(BACKEND_URL, {
  transports: ['polling', 'websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  timeout: 20000
});

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}

export default function UserApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');

  const [activeSosId, setActiveSosId] = useState(null);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('All Emergency');
  const [location, setLocation] = useState(null);
  const [message, setMessage] = useState('');
  const [isSendingMedia, setIsSendingMedia] = useState(false);

  const [rescueDispatched, setRescueDispatched] = useState(false);
  const [rescueTeamLocation, setRescueTeamLocation] = useState(null);
  const [showMap, setShowMap] = useState(false);

  const [voiceBlob, setVoiceBlob] = useState(null);
  const [videoBlob, setVideoBlob] = useState(null);
  const [recordingVoice, setRecordingVoice] = useState(false);
  const [recordingVideo, setRecordingVideo] = useState(false);

  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const mediaRecorderRef = useRef(null);
  const liveVideoPreviewRef = useRef(null);
  const activeStreamRef = useRef(null);
  const watchIdRef = useRef(null);
  const chatEndRef = useRef(null);
  const activeSosIdRef = useRef(null);
  const chatOpenRef = useRef(false);

  useEffect(() => {
    activeSosIdRef.current = activeSosId;
  }, [activeSosId]);

  useEffect(() => {
    chatOpenRef.current = chatOpen;
    if (chatOpen) {
      setUnreadCount(0);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [chatOpen]);

  const startLiveGpsTracking = (sosId) => {
    if (!navigator.geolocation) return;
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(coords);
        if (sosId) {
          socket.emit('live_location_update', { id: sosId, location: coords });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  const stopLiveGpsTracking = () => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('sos_user');
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setPhone(parsed.phone || '');
      setBloodGroup(parsed.bloodGroup || '');
      setMedicalNotes(parsed.medicalNotes || '');
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: true }
      );
    }

    const savedSession = localStorage.getItem('active_sos_session');
    if (savedSession) {
      try {
        const parsedSession = JSON.parse(savedSession);
        if (parsedSession.id) {
          setActiveSosId(parsedSession.id);
          setSelectedService(parsedSession.service || 'All Emergency');
          setRescueDispatched(Boolean(parsedSession.dispatched));
          startLiveGpsTracking(parsedSession.id);
          socket.emit('get_emergencies');
        }
      } catch (e) {}
    }

    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(() => {});
    }

    const handleSyncEmergencies = (list) => {
      const currentId = activeSosIdRef.current || JSON.parse(localStorage.getItem('active_sos_session') || '{}')?.id;
      if (!currentId || !Array.isArray(list)) return;
      const found = list.find((item) => item.id === currentId);
      if (found) {
        if (found.status === 'Dispatched') setRescueDispatched(true);
        if (found.providerLocation) setRescueTeamLocation(found.providerLocation);
        if (Array.isArray(found.chatMessages)) setChatMessages(found.chatMessages);
      }
    };

    const handleSosAccepted = (data) => {
      if (!data?.id || data.id === activeSosIdRef.current) {
        setRescueDispatched(true);
        const saved = JSON.parse(localStorage.getItem('active_sos_session') || '{}');
        if (saved.id) {
          localStorage.setItem('active_sos_session', JSON.stringify({ ...saved, dispatched: true }));
        }
      }
    };

    const handleRescueLocation = (data) => {
      if (!data?.id || data.id === activeSosIdRef.current) {
        setRescueTeamLocation(data.location);
        setRescueDispatched(true);
      }
    };

    const handleReceiveChat = (msg) => {
      if (msg.sosId === activeSosIdRef.current) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.msgId === msg.msgId)) return prev;
          return [...prev, msg];
        });
        if (!chatOpenRef.current && msg.senderRole === 'provider') {
          setUnreadCount((prev) => prev + 1);
        }
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    const handleSosDeleted = (data) => {
      if (data?.id && data.id === activeSosIdRef.current) {
        stopLiveGpsTracking();
        localStorage.removeItem('active_sos_session');
        setActiveSosId(null);
        setRescueDispatched(false);
        setRescueTeamLocation(null);
        setChatMessages([]);
        setChatOpen(false);
        setShowMap(false);
      }
    };

    socket.on('sync_emergencies', handleSyncEmergencies);
    socket.on('sos_accepted', handleSosAccepted);
    socket.on('rescue_team_location', handleRescueLocation);
    socket.on('receive_chat_message', handleReceiveChat);
    socket.on('sos_deleted', handleSosDeleted);

    return () => {
      socket.off('sync_emergencies', handleSyncEmergencies);
      socket.off('sos_accepted', handleSosAccepted);
      socket.off('rescue_team_location', handleRescueLocation);
      socket.off('receive_chat_message', handleReceiveChat);
      socket.off('sos_deleted', handleSosDeleted);
      stopLiveGpsTracking();
    };
  }, []);

  const captureCameraPhoto = async (facingMode = 'user') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode }
      });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      stream.getTracks().forEach((track) => track.stop());
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (err) {
      return null;
    }
  };

  const triggerSOS = async (serviceName) => {
    const sosId = activeSosId || 'SOS-' + Date.now();
    setActiveSosId(sosId);
    setSelectedService(serviceName);
    setSosModalOpen(true);

    localStorage.setItem(
      'active_sos_session',
      JSON.stringify({ id: sosId, service: serviceName, dispatched: rescueDispatched })
    );

    startLiveGpsTracking(sosId);

    let currentLoc = location || { lat: 23.8103, lng: 90.4125 };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          currentLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(currentLoc);
          socket.emit('live_location_update', { id: sosId, location: currentLoc });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }

    const photoFront = await captureCameraPhoto('user');
    const photoBack = await captureCameraPhoto('environment');

    socket.emit('initial_sos', {
      id: sosId,
      userId: user?.id || null,
      service: serviceName,
      location: currentLoc,
      photo: photoFront,
      photoFront,
      photoBack,
      profile: {
        name: user?.username || 'Anonymous User',
        phone: phone || 'Not Provided',
        bloodGroup: bloodGroup || 'N/A',
        medicalNotes: medicalNotes || 'None'
      }
    });
  };

  const handleEndAndDeleteSos = () => {
    if (!activeSosId) return;
    if (window.confirm('Are you sure you want to end this SOS session and disconnect live tracking?')) {
      socket.emit('delete_sos', { id: activeSosId });
      stopLiveGpsTracking();
      localStorage.removeItem('active_sos_session');
      setActiveSosId(null);
      setRescueDispatched(false);
      setRescueTeamLocation(null);
      setChatMessages([]);
      setChatOpen(false);
      setShowMap(false);
      setSosModalOpen(false);
    }
  };

  const handleSaveProfile = async () => {
    const updatedLocal = {
      ...(user || {}),
      phone,
      bloodGroup,
      medicalNotes
    };
    localStorage.setItem('sos_user', JSON.stringify(updatedLocal));
    setUser(updatedLocal);

    try {
      if (user?.id) {
        const res = await fetch(`${BACKEND_URL}/api/auth/user/profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, phone, bloodGroup, medicalNotes })
        });
        const data = await res.json();
        if (data.success) {
          const mergedUser = { ...data.user, phone: data.user.phone || phone };
          localStorage.setItem('sos_user', JSON.stringify(mergedUser));
          setUser(mergedUser);
        }
      }
    } catch (e) {}
    setShowProfileModal(false);
  };

  const startVoiceRecording = async () => {
    try {
      if (recordingVideo) stopRecording();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        setVoiceBlob(new Blob(chunks, { type: 'audio/webm' }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecordingVoice(true);
    } catch (e) {
      alert('Microphone permission required!');
    }
  };

  const startVideoRecording = async () => {
    try {
      if (recordingVoice) stopRecording();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true
      });
      activeStreamRef.current = stream;
      setRecordingVideo(true);

      setTimeout(() => {
        if (liveVideoPreviewRef.current) {
          liveVideoPreviewRef.current.srcObject = stream;
          liveVideoPreviewRef.current.play().catch(() => {});
        }
      }, 100);

      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        setVideoBlob(new Blob(chunks, { type: 'video/webm' }));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch (e) {
      alert('Camera & Microphone permission required for video recording!');
      setRecordingVideo(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
    }
    setRecordingVoice(false);
    setRecordingVideo(false);
  };

  const handleSendAdditionalMedia = async () => {
    if (!activeSosId) return;
    if (recordingVoice || recordingVideo) {
      stopRecording();
    }
    setIsSendingMedia(true);
    try {
      const formData = new FormData();
      formData.append('id', activeSosId);
      if (message) formData.append('message', message);
      if (voiceBlob) formData.append('voice', voiceBlob, 'voice.webm');
      if (videoBlob) formData.append('video', videoBlob, 'video.webm');

      await fetch(`${BACKEND_URL}/api/sos/update`, {
        method: 'POST',
        body: formData
      });
      setSosModalOpen(false);
      setMessage('');
      setVoiceBlob(null);
      setVideoBlob(null);
    } catch (err) {}
    setIsSendingMedia(false);
  };

  const handleSendChatText = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeSosId) return;
    socket.emit('send_chat_message', {
      sosId: activeSosId,
      senderName: user?.username || 'Victim',
      senderRole: 'user',
      text: chatInput.trim(),
      image: null
    });
    setChatInput('');
  };

  const handleSendChatPhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeSosId) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 800;
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
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
        socket.emit('send_chat_message', {
          sosId: activeSosId,
          senderName: user?.username || 'Victim',
          senderRole: 'user',
          text: '',
          image: compressedDataUrl
        });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleLogout = () => {
    localStorage.removeItem('sos_user');
    localStorage.removeItem('sos_token');
    navigate('/');
  };

  const liveDistanceKm =
    location && rescueTeamLocation
      ? calculateDistanceKm(location.lat, location.lng, rescueTeamLocation.lat, rescueTeamLocation.lng)
      : null;

  return (
    <div className="water-bg-wrapper">
      <Sky3DScene />

      <div className="glass-3d-shell">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '1.1rem',
          marginBottom: '0.8rem',
          borderBottom: '1.5px solid rgba(0, 102, 255, 0.14)'
        }}>
          <div>
            <h2 className="title-gradient-3d" style={{ fontSize: '1.5rem' }}>
              Smart SOS
            </h2>
            <span style={{ fontSize: '0.9rem', color: '#0052cc', fontWeight: 800 }}>
              {user?.username || 'Noman'} {phone && `• ${phone}`}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <button className="pill-btn-3d" onClick={() => setShowProfileModal(true)}>
              <User size={15} /> Profile
            </button>
            <button className="pill-btn-3d" onClick={handleLogout}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: '#1e3a8a', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: 700 }}>
          Tap center <strong style={{ color: '#e11d48' }}>SOS Core (Alerts All)</strong> or select a 3D unit:
        </p>

        <div className="cross-hub-stage">
          <div className="cross-track-h" />
          <div className="cross-track-v" />

          <button className="service-orb-node node-top" onClick={() => triggerSOS('Ambulance')}>
            <div className="service-orb-inner">
              <Plus size={24} strokeWidth={2.8} />
              <span>Ambulance</span>
            </div>
          </button>

          <button className="service-orb-node node-left" onClick={() => triggerSOS('Fire Service')}>
            <div className="service-orb-inner">
              <Flame size={24} strokeWidth={2.5} />
              <span>Fire</span>
            </div>
          </button>

          <button className="sos-core-3d" onClick={() => triggerSOS('All Emergency')}>
            <div className="sos-core-inner">
              <span>SOS</span>
            </div>
          </button>

          <button className="service-orb-node node-right" onClick={() => triggerSOS('Police')}>
            <div className="service-orb-inner">
              <Shield size={24} strokeWidth={2.5} />
              <span>Police</span>
            </div>
          </button>

          <button className="service-orb-node node-bottom" onClick={() => triggerSOS('Hospital')}>
            <div className="service-orb-inner">
              <AlertTriangle size={24} strokeWidth={2.5} />
              <span>Hospital</span>
            </div>
          </button>
        </div>

        {activeSosId && (
          <div style={{
            marginTop: '1.1rem',
            padding: '1.15rem',
            borderRadius: '24px',
            background: 'linear-gradient(145deg, #ffffff, #e6f2ff)',
            border: '2px solid #ffffff',
            boxShadow: '0 14px 30px rgba(35, 95, 165, 0.22)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <span style={{
                  width: '11px', height: '11px', borderRadius: '50%',
                  backgroundColor: rescueDispatched ? '#059669' : '#e11d48',
                  boxShadow: rescueDispatched ? '0 0 10px #059669' : '0 0 10px #e11d48',
                  display: 'inline-block'
                }} />
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: '#062863' }}>
                  {rescueDispatched ? 'Rescue Team Dispatched (Live)' : `${selectedService} Alert Active`}
                </span>
              </div>
              <span style={{
                fontSize: '0.75rem', fontWeight: 800, padding: '0.25rem 0.65rem',
                borderRadius: '999px', background: '#dbeafe', color: '#0052cc'
              }}>
                GPS Sharing ON
              </span>
            </div>

            {liveDistanceKm && (
              <div style={{
                marginBottom: '0.85rem', padding: '0.55rem 0.85rem', borderRadius: '12px',
                background: '#d1fae5', border: '1.5px solid #34d399', color: '#065f46',
                fontSize: '0.85rem', fontWeight: 800, textAlign: 'center'
              }}>
                Rescue Team is {liveDistanceKm} km away from your live position
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', marginBottom: '0.75rem' }}>
              <button
                className="btn-3d-aqua"
                style={{ padding: '0.72rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                onClick={() => setShowMap(true)}
              >
                <Navigation size={16} /> Live Map
              </button>

              <button
                className="btn-3d-aqua"
                style={{
                  padding: '0.72rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', position: 'relative'
                }}
                onClick={() => setChatOpen(true)}
              >
                <MessageSquare size={16} /> Live Chat
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '-6px', right: '-6px', background: '#e11d48',
                    color: '#fff', borderRadius: '50%', width: '22px', height: '22px',
                    fontSize: '0.72rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, border: '2px solid #fff'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <button
                className="pill-btn-3d"
                style={{ justifyContent: 'center', padding: '0.68rem', fontSize: '0.82rem' }}
                onClick={() => setSosModalOpen(true)}
              >
                <Video size={15} /> Voice / Video
              </button>

              <button
                onClick={handleEndAndDeleteSos}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  padding: '0.68rem', borderRadius: '14px', border: '1.5px solid #fda4af',
                  background: 'linear-gradient(145deg, #fff1f2, #ffe4e6)', color: '#be123c',
                  fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer'
                }}
              >
                <Trash2 size={15} /> End & Delete SOS
              </button>
            </div>
          </div>
        )}
      </div>

      {showProfileModal && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 37, 64, 0.45)',
          backdropFilter: 'blur(10px)', zIndex: 2500,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-3d-shell" style={{ maxWidth: '430px' }}>
            <h2 className="title-gradient-3d" style={{ fontSize: '1.5rem', marginBottom: '1.2rem' }}>
              Emergency Medical Profile
            </h2>

            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.35rem' }}>
              Phone Number (Emergency Contact)
            </label>
            <input
              className="input-3d"
              type="tel"
              style={{ marginBottom: '1rem' }}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 017XXXXXXXX"
            />

            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.35rem' }}>
              Blood Group
            </label>
            <input
              className="input-3d"
              style={{ marginBottom: '1rem' }}
              value={bloodGroup}
              onChange={(e) => setBloodGroup(e.target.value)}
              placeholder="e.g. A+, O+, B+, AB-"
            />

            <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 800, color: '#0b2e59', marginBottom: '0.35rem' }}>
              Medical Report / Conditions
            </label>
            <textarea
              className="input-3d"
              rows={3}
              style={{ marginBottom: '1.4rem', resize: 'none' }}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Allergies, diabetes, asthma, or medical notes..."
            />

            <div style={{ display: 'flex', gap: '0.8rem' }}>
              <button
                className="pill-btn-3d"
                style={{ flex: 1, justifyContent: 'center', padding: '0.85rem' }}
                onClick={() => setShowProfileModal(false)}
              >
                Cancel
              </button>
              <button className="btn-3d-aqua" style={{ flex: 1 }} onClick={handleSaveProfile}>
                Save Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {sosModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 37, 64, 0.5)',
          backdropFilter: 'blur(12px)', zIndex: 2600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-3d-shell" style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h3 style={{ color: '#e11d48', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={20} /> {selectedService} Alert Active!
              </h3>
              <button
                onClick={() => {
                  if (recordingVoice || recordingVideo) stopRecording();
                  setSosModalOpen(false);
                }}
                style={{ background: 'none', border: 'none', color: '#0a2540', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#1e3a8a', marginBottom: '0.9rem', fontWeight: 600 }}>
              Live GPS Location & Camera snapshots are active. You can also record Voice, Video, or text notes below:
            </p>

            <textarea
              className="input-3d"
              rows={2}
              placeholder="Describe your emergency situation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ marginBottom: '0.9rem' }}
            />

            {recordingVideo && (
              <div style={{ marginBottom: '0.9rem', borderRadius: '14px', overflow: 'hidden', border: '2px solid #e11d48', background: '#000' }}>
                <video ref={liveVideoPreviewRef} muted playsInline style={{ width: '100%', height: '170px', objectFit: 'cover', display: 'block' }} />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.1rem' }}>
              {!recordingVoice ? (
                <button
                  type="button"
                  className="pill-btn-3d"
                  style={{ justifyContent: 'center', padding: '0.75rem' }}
                  onClick={startVoiceRecording}
                  disabled={recordingVideo}
                >
                  <Mic size={16} color="#0052cc" />
                  {voiceBlob ? 'Voice Ready ✓' : 'Record Voice'}
                </button>
              ) : (
                <button
                  type="button"
                  className="pill-btn-3d"
                  style={{ justifyContent: 'center', background: '#e11d48', color: '#fff', borderColor: '#e11d48' }}
                  onClick={stopRecording}
                >
                  Stop Voice...
                </button>
              )}

              {!recordingVideo ? (
                <button
                  type="button"
                  className="pill-btn-3d"
                  style={{ justifyContent: 'center', padding: '0.75rem' }}
                  onClick={startVideoRecording}
                  disabled={recordingVoice}
                >
                  <Video size={16} color="#e11d48" />
                  {videoBlob ? 'Video Ready ✓' : 'Record Video'}
                </button>
              ) : (
                <button
                  type="button"
                  className="pill-btn-3d"
                  style={{ justifyContent: 'center', background: '#e11d48', color: '#fff', borderColor: '#e11d48' }}
                  onClick={stopRecording}
                >
                  Stop Video...
                </button>
              )}
            </div>

            <button className="btn-3d-aqua" onClick={handleSendAdditionalMedia} disabled={isSendingMedia}>
              <Send size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {isSendingMedia ? 'Uploading Media...' : 'Send Voice / Video / Note'}
            </button>
          </div>
        </div>
      )}

      {chatOpen && activeSosId && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 37, 64, 0.55)',
          backdropFilter: 'blur(10px)', zIndex: 2800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div className="glass-3d-shell" style={{
            maxWidth: '450px', height: '540px', display: 'flex', flexDirection: 'column', padding: '1.25rem'
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              paddingBottom: '0.85rem', borderBottom: '1.5px solid rgba(0, 102, 255, 0.15)'
            }}>
              <div>
                <h3 className="title-gradient-3d" style={{ fontSize: '1.25rem' }}>
                  Emergency Live Chat
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 800 }}>
                  Connected with {selectedService} Command Center
                </span>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', color: '#0a2540', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>

            <div style={{
              flex: 1, overflowY: 'auto', padding: '0.9rem 0.3rem',
              display: 'flex', flexDirection: 'column', gap: '0.7rem'
            }}>
              {chatMessages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', color: '#475569', fontSize: '0.88rem', fontWeight: 600 }}>
                  Send a message or photo to the rescue team...
                </div>
              ) : (
                chatMessages.map((m) => {
                  const isMe = m.senderRole === 'user';
                  return (
                    <div
                      key={m.msgId}
                      style={{
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        maxWidth: '80%',
                        padding: '0.7rem 0.95rem',
                        borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMe
                          ? 'linear-gradient(135deg, #0088ff 0%, #0052cc 100%)'
                          : '#ffffff',
                        color: isMe ? '#ffffff' : '#0a2540',
                        boxShadow: '0 4px 12px rgba(0, 82, 204, 0.15)',
                        border: isMe ? 'none' : '1.5px solid #cfe3fb'
                      }}
                    >
                      <div style={{
                        fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.25rem',
                        color: isMe ? '#dbeafe' : '#0052cc'
                      }}>
                        {m.senderName} • {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {m.image && (
                        <img
                          src={m.image}
                          alt="Chat attachment"
                          style={{ width: '100%', maxHeight: '210px', objectFit: 'cover', borderRadius: '12px', marginBottom: m.text ? '0.4rem' : 0 }}
                        />
                      )}
                      {m.text && <div style={{ fontSize: '0.92rem', fontWeight: 600, wordBreak: 'break-word' }}>{m.text}</div>}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            <form onSubmit={handleSendChatText} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', paddingTop: '0.6rem' }}>
              <label className="pill-btn-3d" style={{ padding: '0.75rem', cursor: 'pointer', marginBottom: 0 }}>
                <Image size={18} color="#0052cc" />
                <input type="file" accept="image/*" onChange={handleSendChatPhoto} style={{ display: 'none' }} />
              </label>

              <input
                className="input-3d"
                style={{ flex: 1, padding: '0.75rem 1rem' }}
                placeholder="Type message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />

              <button type="submit" className="btn-3d-aqua" style={{ width: 'auto', padding: '0.75rem 1.1rem' }}>
                <Send size={17} />
              </button>
            </form>
          </div>
        </div>
      )}

      {showMap && (rescueTeamLocation || location) && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 37, 64, 0.85)', zIndex: 3000,
          display: 'flex', flexDirection: 'column'
        }}>
          <div style={{
            padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', background: '#ffffff', borderBottom: '2px solid #059669'
          }}>
            <div>
              <h3 style={{ color: '#059669', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
                <Activity size={20} /> WhatsApp-Style Live Location Map
              </h3>
              <span style={{ fontSize: '0.82rem', color: '#0052cc', fontWeight: 700 }}>
                {liveDistanceKm
                  ? `Blue Pin: You (Live) | Green Pin: Rescue Team (${liveDistanceKm} km away)`
                  : 'Blue Pin: Your Live Moving GPS Position'}
              </span>
            </div>
            <button onClick={() => setShowMap(false)} style={{ background: 'none', border: 'none', color: '#0a2540', cursor: 'pointer' }}>
              <X size={26} />
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <MapContainer
              center={
                location
                  ? [location.lat, location.lng]
                  : [rescueTeamLocation.lat, rescueTeamLocation.lng]
              }
              zoom={15}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
              {location && (
                <Marker position={[location.lat, location.lng]}>
                  <Popup>Your Live Location (Moving)</Popup>
                </Marker>
              )}
              {rescueTeamLocation && (
                <Marker position={[rescueTeamLocation.lat, rescueTeamLocation.lng]} icon={rescueIcon}>
                  <Popup>Rescue Team Live Position</Popup>
                </Marker>
              )}
              {location && rescueTeamLocation && (
                <Polyline
                  positions={[
                    [location.lat, location.lng],
                    [rescueTeamLocation.lat, rescueTeamLocation.lng]
                  ]}
                  color="#0066ff"
                  weight={4}
                  dashArray="8, 8"
                />
              )}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}