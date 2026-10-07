const express = require('express');
const http = require('http');
// Typo fixed here:
const { Server } = require('socket.io'); 
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Update CORS to include your Vercel URL
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000', 
  'https://smart-sos-system-lf2rtqyfc.vercel.app' // Make sure this exactly matches your Vercel URL
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST']
}));
app.use(express.json());

// Set up multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Store active emergencies in memory
let activeEmergencies = [];

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

// --- REST API ENDPOINTS (For Media Uploads) ---

// This endpoint seems unused if initial SOS is purely socket-based, 
// but keeping it if you plan to use fetch for initial SOS later.
app.post('/api/sos/initial', upload.fields([
  { name: 'photo', maxCount: 1 }
]), (req, res) => {
  const { id, service, location } = req.body;
  const photoFile = req.files['photo'] ? req.files['photo'][0] : null;

  const sosReport = {
    id,
    service,
    location: location ? JSON.parse(location) : null,
    photoUrl: photoFile ? `/uploads/${photoFile.filename}` : null,
    timestamp: new Date().toISOString()
  };

  io.emit('initial_sos', sosReport);
  res.status(200).json({ success: true, message: 'Initial SOS received via API' });
});

// This is the endpoint UserApp.jsx hits with FormData
app.post('/api/sos/update', upload.fields([
  { name: 'voice', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), (req, res) => {
  console.log('Received media update via API for ID:', req.body.id);
  
  const { id, message } = req.body;
  const voiceFile = req.files['voice'] ? req.files['voice'][0] : null;
  const videoFile = req.files['video'] ? req.files['video'][0] : null;

  const voiceUrl = voiceFile ? `/uploads/${voiceFile.filename}` : null;
  const videoUrl = videoFile ? `/uploads/${videoFile.filename}` : null;

  const updateData = {
    id,
    message,
    voiceUrl,
    videoUrl,
    updateTimestamp: new Date().toISOString()
  };

  // 1. Update the in-memory array
  const index = activeEmergencies.findIndex(e => e.id === id);
  if (index !== -1) {
    activeEmergencies[index] = { 
      ...activeEmergencies[index], 
      message: message || activeEmergencies[index].message, 
      voiceUrl: voiceUrl || activeEmergencies[index].voiceUrl, 
      videoUrl: videoUrl || activeEmergencies[index].videoUrl 
    };
  } else {
      console.log(`Warning: Tried to update SOS ID ${id} but it wasn't found in memory.`);
  }

  // 2. Broadcast the update to connected clients (ProviderDashboard)
  io.emit('update_emergency', updateData);
  
  res.status(200).json({ success: true, message: 'SOS media updated successfully', updateData });
});


// --- SOCKET.IO LOGIC ---

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('get_emergencies', () => {
    socket.emit('sync_emergencies', activeEmergencies);
  });

  socket.on('initial_sos', (data) => {
    console.log('Received initial_sos from client:', data.id);
    
    const saveBase64Photo = (base64String) => {
      if (!base64String) return null;
      if (typeof base64String === 'string' && base64String.startsWith('data:image')) {
        return base64String;
      }
      return null;
    };

    const sosReport = {
      id: data.id,
      service: data.service,
      location: data.location,
      photoUrl: saveBase64Photo(data.photo),
      photoFrontUrl: saveBase64Photo(data.photoFront),
      photoBackUrl: saveBase64Photo(data.photoBack),
      profile: data.profile,
      status: 'Pending',
      timestamp: new Date().toISOString()
    };

    activeEmergencies.unshift(sosReport);
    io.emit('new_emergency', sosReport);
  });

  socket.on('accept_sos', (data) => {
    console.log('Provider accepted SOS:', data.id);
    const index = activeEmergencies.findIndex(e => e.id === data.id);
    if (index !== -1) {
      activeEmergencies[index].status = 'Dispatched';
      io.emit('update_emergency_status', { id: data.id, status: 'Dispatched' });
    }
    io.emit('sos_accepted', { message: "Help is on the way!", sosId: data.id });
  });

  socket.on('live_location_update', (data) => {
    const index = activeEmergencies.findIndex(e => e.id === data.id);
    if (index !== -1) {
      activeEmergencies[index].location = data.location;
      io.emit('update_emergency_location', { id: data.id, location: data.location });
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});