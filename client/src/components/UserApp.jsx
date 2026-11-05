import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  Plus, Flame, Shield, AlertTriangle, User, LogOut,
  Activity, X, Mic, Send, CheckCircle
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

  const mediaRecorderRef = useRef(null);

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
        (err) => console.warn('Initial GPS warning:', err),
        { enableHighAccuracy: true }
      );
    }

    socket.on('sos_accepted', () => {
      setRescueDispatched(true);
    });

    socket.on('rescue_team_location', (data) => {
      setRescueTeamLocation(data.location);
      setRescueDispatched(true);
    });

    return () => {
      socket.off('sos_accepted');
      socket.off('rescue_team_location');
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
    const sosId = 'SOS-' + Date.now();
    setActiveSosId(sosId);
    setSelectedService(serviceName);
    setSosModalOpen(true);

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
    } catch (e) {
      console.error(e);
    }
    setShowProfileModal(false);
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
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

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setRecordingVoice(false);
    }
  };

  const handleSendAdditionalMedia = async () => {
    if (!activeSosId) return;
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
    } catch (err) {
      console.error(err);
    }
    setIsSendingMedia(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('sos_user');
    localStorage.removeItem('sos_token');
    navigate('/');
  };

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

        {rescueDispatched && (
          <div
            onClick={() => setShowMap(true)}
            style={{
              marginTop: '1.2rem',
              padding: '1rem 1.2rem',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #d1fae5, #e0f2fe)',
              border: '2px solid #059669',
              boxShadow: '0 10px 25px rgba(5, 150, 105, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '44px', height: '44px', borderRadius: '50%',
              background: '#059669', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#ffffff'
            }}>
              <Activity size={24} />
            </div>
            <div>
              <h4 style={{ color: '#065f46', fontSize: '1rem', fontWeight: 800, marginBottom: '2px' }}>
                Rescue Team En Route
              </h4>
              <p style={{ color: '#047857', fontSize: '0.84rem', fontWeight: 700 }}>
                Click here to track live location on map
              </p>
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
          <div className="glass-3d-shell" style={{ maxWidth: '430px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h3 style={{ color: '#e11d48', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={20} /> {selectedService} Alert Sent!
              </h3>
              <button onClick={() => setSosModalOpen(false)} style={{ background: 'none', border: 'none', color: '#0a2540', cursor: 'pointer' }}>
                <X size={22} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: '#1e3a8a', marginBottom: '1rem', fontWeight: 600 }}>
              Your GPS location, Blood Group, Phone Number & Camera photos have been dispatched. Add optional voice or notes:
            </p>

            <textarea
              className="input-3d"
              rows={3}
              placeholder="Describe your emergency situation..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />

            <div style={{ display: 'flex', gap: '0.8rem', marginBottom: '1.2rem' }}>
              {!recordingVoice ? (
                <button className="pill-btn-3d" style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }} onClick={startVoiceRecording}>
                  <Mic size={16} /> {voiceBlob ? 'Voice Recorded ✓' : 'Record Voice'}
                </button>
              ) : (
                <button className="pill-btn-3d" style={{ flex: 1, justifyContent: 'center', background: '#e11d48', color: '#fff' }} onClick={stopRecording}>
                  Stop Recording...
                </button>
              )}
            </div>

            <button className="btn-3d-aqua" onClick={handleSendAdditionalMedia} disabled={isSendingMedia}>
              <Send size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              {isSendingMedia ? 'Uploading...' : 'Send Additional Details'}
            </button>
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
            <h3 style={{ color: '#059669', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
              <Activity size={20} /> Live Rescue Telemetry
            </h3>
            <button onClick={() => setShowMap(false)} style={{ background: 'none', border: 'none', color: '#0a2540', cursor: 'pointer' }}>
              <X size={26} />
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative' }}>
            <MapContainer
              center={
                rescueTeamLocation
                  ? [rescueTeamLocation.lat, rescueTeamLocation.lng]
                  : [location.lat, location.lng]
              }
              zoom={14}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              {location && (
                <Marker position={[location.lat, location.lng]}>
                  <Popup>Your Location</Popup>
                </Marker>
              )}
              {rescueTeamLocation && (
                <Marker position={[rescueTeamLocation.lat, rescueTeamLocation.lng]} icon={rescueIcon}>
                  <Popup>Rescue Team Live Position</Popup>
                </Marker>
              )}
            </MapContainer>
          </div>
        </div>
      )}
    </div>
  );
}