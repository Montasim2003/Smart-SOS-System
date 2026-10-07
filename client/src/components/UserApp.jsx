import React, { useState, useRef } from 'react';
import { AlertTriangle, Flame, Plus, Shield, Mic, Square, Send, Loader2 } from 'lucide-react';

export default function UserApp({ profile, socket }) {
  const mediaRecorderRef = useRef(null);
  
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
    
    // Offline SMS Fallback
    if (!navigator.onLine) {
      alert(`No Internet Connection!\nFallback: Sending Offline SMS to ${profile.emergencyContact}`);
      window.location.href = `sms:${profile.emergencyContact}?body=EMERGENCY! Need ${service}. Name: ${profile.name}, Blood: ${profile.bloodGroup}, Allergies: ${profile.allergies}`;
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
      
      // Start True Live Tracking
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
      return; // Do not proceed without real location
    }
    
    setLocation(currentLoc);

    setLoadingMessage('Capturing Environment...');
    // Try to capture both cameras
    const frontPhoto = await captureCamera('user');
    const backPhoto = await captureCamera('environment');

    // Send Initial SOS via Socket (Step 1)
    const initialData = {
      id: sosId,
      service: service,
      location: currentLoc,
      photo: frontPhoto || backPhoto, // maintain backward compatibility
      photoBack: backPhoto,
      photoFront: frontPhoto,
      profile: profile
    };

    console.log('Emitting initial_sos over socket:', initialData.id);
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
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setAudioChunks([]);
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
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
      // Use existing base API URL as instructed
      const API_URL = 'http://localhost:5000';
      console.log('Sending update_sos via fetch:', currentSosId);
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

  React.useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const services = [
    { name: 'Ambulance', icon: <Plus size={48} className="text-cyan-400" />, color: 'from-blue-900 to-slate-900', ring: 'ring-cyan-500' },
    { name: 'Fire Service', icon: <Flame size={48} className="text-cyan-400" />, color: 'from-blue-900 to-slate-900', ring: 'ring-cyan-500' },
    { name: 'Hospital', icon: <AlertTriangle size={48} className="text-cyan-400" />, color: 'from-blue-900 to-slate-900', ring: 'ring-cyan-500' },
    { name: 'Police', icon: <Shield size={48} className="text-cyan-400" />, color: 'from-blue-900 to-slate-900', ring: 'ring-cyan-500' },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] p-4">

      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4 tracking-tight">
          Smart Emergency Response
        </h1>
        <p className="text-slate-400 text-lg">Tap a service to immediately share your location & situation.</p>
        {profile && (
          <div className="mt-4 inline-flex items-center gap-2 bg-white/5 border border-cyan-500/30 px-4 py-2 rounded-full text-cyan-400 text-sm">
            <span className="font-semibold">{profile.name}</span> • <span className="font-bold text-red-400">{profile.bloodGroup}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 w-full max-w-2xl">
        {services.map((service) => (
          <button
            key={service.name}
            onClick={() => handleEmergencyClick(service.name)}
            disabled={loading}
            className={`relative overflow-hidden flex flex-col items-center justify-center gap-4 p-8 rounded-3xl bg-gradient-to-br ${service.color} hover:scale-105 active:scale-95 transition-all duration-300 ring-2 ring-transparent hover:${service.ring} shadow-xl group`}
          >
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            {service.icon}
            <span className="text-xl font-bold text-slate-200">{service.name}</span>
          </button>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-40 transition-all duration-300">
          <div className="bg-blue-950/70 backdrop-blur-xl rounded-3xl p-6 md:p-8 w-full max-w-md shadow-[0_0_40px_rgba(6,182,212,0.2)] border border-cyan-500/50 transform transition-all">
            <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center gap-3">
              <span className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]"></span>
              SOS Sent!
            </h2>
            <p className="text-cyan-400 font-medium mb-6">Location & Photo dispatched to {selectedService}.</p>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Additional details (Optional)</label>
                <textarea
                  value={textMessage}
                  onChange={(e) => setTextMessage(e.target.value)}
                  className="w-full bg-white/5 text-white rounded-xl p-4 border border-cyan-500/30 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 outline-none transition-all resize-none placeholder:text-slate-400"
                  placeholder="Describe your emergency..."
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-4">
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                    isRecording 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30' 
                      : 'bg-white/5 text-slate-300 border border-cyan-500/30 hover:bg-white/10'
                  }`}
                >
                  {isRecording ? <Square size={20} /> : <Mic size={20} />}
                  {isRecording ? 'Stop' : 'Voice'}
                </button>

                <div className="flex-1 relative">
                  <input
                    type="file"
                    accept="video/*"
                    capture="environment"
                    onChange={(e) => setVideoFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className={`flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all border ${
                    videoFile
                      ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                      : 'bg-white/5 text-slate-300 border-cyan-500/30 hover:bg-white/10'
                  }`}>
                    {videoFile ? 'Video Attached' : 'Attach Video'}
                  </div>
                </div>
              </div>

              {(audioBlob || videoFile) && (
                <div className="text-cyan-400 flex items-center gap-2 text-sm font-medium">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                  Media ready to send
                </div>
              )}

              <button
                onClick={sendAdditionalDetails}
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-lg py-4 rounded-2xl flex items-center justify-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.5)] transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <Send size={24} />
                Send Additional Details
              </button>
              
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full text-slate-500 hover:text-slate-300 font-medium py-2 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-900 p-8 rounded-2xl flex flex-col items-center gap-4 border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <Loader2 className="animate-spin text-cyan-400" size={48} />
            <p className="text-slate-300 font-medium">{loadingMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
