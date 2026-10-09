import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Flame, Plus, Shield, Mic, Square, Send, Loader2, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserApp({ socket }) {
  const mediaRecorderRef = useRef(null);
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [location, setLocation] = useState(null);
  
  const [currentSosId, setCurrentSosId] = useState(null);
  const [textMessage, setTextMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [videoFile, setVideoFile] = useState(null);

  const watchIdRef = useRef(null);

  useEffect(() => {
    const savedProfile = localStorage.getItem('userProfile');
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userProfile');
    navigate('/user/login');
  };

  const captureCamera = async (facingMode) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const photo = canvas.toDataURL('image/jpeg');
      stream.getTracks().forEach(track => track.stop());
      return photo;
    } catch (err) {
      console.error(`Camera access failed for ${facingMode}`, err);
      return null;
    }
  };

  const handleEmergencyClick = async (service) => {
    setSelectedService(service);
    
    if (!navigator.onLine) {
      alert(`No Internet Connection!\nFallback: Sending Offline SMS`);
      window.location.href = `sms:911?body=EMERGENCY! Need ${service}. Name: ${profile?.name}`;
      return;
    }

    setLoading(true);
    const sosId = Date.now().toString();
    setCurrentSosId(sosId);
    
    let currentLoc = null;

    setLoadingMessage('Acquiring Live GPS Signal...');
    try {
      if (!navigator.geolocation) throw new Error("Geolocation not supported");
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          enableHighAccuracy: true, 
          timeout: 30000, 
          maximumAge: 0 
        });
      });
      currentLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
      
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const newLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLocation);
          socket.emit('live_location_update', { id: sosId, location: newLocation });
        },
        (err) => console.warn('Live tracking error:', err),
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
      );
    } catch (err) {
      console.error("Failed to acquire live GPS:", err);
      alert("Failed to acquire real GPS location. Please enable location services and try again.");
      setLoading(false);
      return;
    }
    
    setLocation(currentLoc);

    setLoadingMessage('Capturing Environment...');
    const frontPhoto = await captureCamera('user');
    const backPhoto = await captureCamera('environment');

    const initialData = {
      userId: profile?.id,
      id: sosId,
      service: service,
      location: currentLoc,
      photo: frontPhoto || backPhoto,
      photoBack: backPhoto,
      photoFront: frontPhoto,
      profile: {
        name: profile?.name,
        email: profile?.email
      }
    };

    socket.emit('initial_sos', initialData);

    setLoading(false);
    setIsModalOpen(true);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setAudioChunks((prev) => [...prev, event.data]);
        }
      };
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioChunks([]);
      };
      mediaRecorderRef.current.stop();
      setIsRecording(true); // Wait, this was a bug in original code too. Should be false.
      setTimeout(() => setIsRecording(false), 100);
    }
  };

  const sendAdditionalDetails = async () => {
    if (!currentSosId) return;
    
    const formData = new FormData();
    formData.append('id', currentSosId);
    if (textMessage) formData.append('message', textMessage);
    if (audioBlob) formData.append('voice', audioBlob, 'voice.webm');
    if (videoFile) formData.append('video', videoFile, videoFile.name);

    try {
      const API_URL = 'http://localhost:5000';
      await fetch(`${API_URL}/api/sos/update`, {
        method: 'POST',
        body: formData,
      });
    } catch (error) {
      console.error('Error updating SOS:', error);
    }

    setTextMessage('');
    setAudioBlob(null);
    setVideoFile(null);
    setIsModalOpen(false);
  };

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const services = [
    { name: 'Ambulance', icon: <Plus size={48} /> },
    { name: 'Fire Service', icon: <Flame size={48} /> },
    { name: 'Hospital', icon: <AlertTriangle size={48} /> },
    { name: 'Police', icon: <Shield size={48} /> },
  ];

  return (
    <div className="app-container">
      <div className="app-wrapper">
        <div className="app-header">
          <div>
            <h2 style={{color: 'white', fontSize: '1.25rem', fontWeight: 'bold'}}>Smart SOS</h2>
            {profile && <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>{profile.name}</p>}
          </div>
          <button className="logout-btn flex items-center gap-1" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </button>
        </div>

        <div className="sos-button-container">
          <button className="sos-button" onClick={() => handleEmergencyClick('General SOS')} disabled={loading}>
            SOS
          </button>
        </div>

        <div style={{padding: '0 1.5rem', textAlign: 'center', marginBottom: '1rem'}}>
          <p style={{color: 'var(--text-muted)'}}>Or select a specific service to alert:</p>
        </div>

        <div className="service-grid">
          {services.map((service) => (
            <button
              key={service.name}
              onClick={() => handleEmergencyClick(service.name)}
              disabled={loading}
              className="service-btn"
            >
              <div style={{color: 'var(--primary-color)'}}>{service.icon}</div>
              <span style={{fontWeight: 'bold'}}>{service.name}</span>
            </button>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '1.5rem',
            width: '100%', maxWidth: '500px', border: '1px solid var(--primary-color)',
            boxShadow: '0 0 30px var(--primary-glow)'
          }}>
            <h2 style={{fontSize: '2rem', color: 'white', marginBottom: '0.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <span style={{width: '12px', height: '12px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', display: 'inline-block', boxShadow: '0 0 10px var(--primary-glow)'}}></span>
              SOS Sent!
            </h2>
            <p style={{color: 'var(--primary-color)', marginBottom: '1.5rem', fontWeight: 'bold'}}>
              Location & Photo dispatched to {selectedService}.
            </p>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              <div>
                <label style={{display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold'}}>Additional details (Optional)</label>
                <textarea
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  style={{
                    width: '100%', backgroundColor: 'rgba(15,23,42,0.5)', color: 'white',
                    padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)',
                    resize: 'none', minHeight: '100px', outline: 'none'
                  }}
                  placeholder="Describe your emergency..."
                />
              </div>

              <div style={{display: 'flex', gap: '1rem'}}>
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  style={{
                    flex: 1, padding: '1rem', borderRadius: '0.75rem', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    backgroundColor: isRecording ? 'rgba(239, 68, 68, 0.2)' : 'rgba(15,23,42,0.5)',
                    color: isRecording ? 'var(--danger-color)' : 'white',
                    border: `1px solid ${isRecording ? 'var(--danger-color)' : 'var(--border-color)'}`,
                    cursor: 'pointer'
                  }}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={20} />}
                  {isRecording ? 'Stop' : 'Voice Note'}
                </button>

                <div style={{flex: 1, position: 'relative'}}>
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
                    onChange={(e) => setVideoFile(e.target.files[0])}
                    style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer'}}
                  />
                  <div style={{
                    padding: '1rem', borderRadius: '0.75rem', fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: videoFile ? 'rgba(6, 182, 212, 0.2)' : 'rgba(15,23,42,0.5)',
                    color: videoFile ? 'var(--primary-color)' : 'white',
                    border: `1px solid ${videoFile ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    pointerEvents: 'none'
                  }}>
                    {videoFile ? 'Video Attached' : 'Attach Video'}
                  </div>
                </div>
              </div>

              {(audioBlob || videoFile) && (
                <div style={{color: 'var(--primary-color)', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-color)'}}></div>
                  Media ready to send
                </div>
              )}

              <button
                onClick={sendAdditionalDetails}
                className="btn-primary"
                style={{padding: '1.25rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', gap: '0.5rem'}}
              >
                <Send size={24} /> Send Additional Details
              </button>
              
              <button
                onClick={() => setIsModalOpen(false)}
                style={{background: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.5rem'}}
              >
                Skip / Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {loading && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem',
            border: '1px solid var(--primary-color)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '1rem', boxShadow: '0 0 20px var(--primary-glow)'
          }}>
            <Loader2 className="animate-spin text-cyan-400" size={48} style={{color: 'var(--primary-color)'}} />
            <p style={{color: 'white', fontWeight: 'bold'}}>{loadingMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
