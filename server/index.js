const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000', 'https://smart-sos-system-lf2rtqyfc.vercel.app'],
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://smart-sos-system-lf2rtqyfc.vercel.app']
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

// API endpoint for Step 1: Initial SOS
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
  res.status(200).json({ success: true, message: 'Initial SOS received' });
});

// API endpoint for Step 2: Update SOS
app.post('/api/sos/update', upload.fields([
  { name: 'voice', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), (req, res) => {
  const { id, message } = req.body;
  const voiceFile = req.files['voice'] ? req.files['voice'][0] : null;
  const videoFile = req.files['video'] ? req.files['video'][0] : null;

  const updateData = {
    id,
    message,
    voiceUrl: voiceFile ? `/uploads/${voiceFile.filename}` : null,
    videoUrl: videoFile ? `/uploads/${videoFile.filename}` : null,
    updateTimestamp: new Date().toISOString()
  };

  io.emit('update_sos', updateData);
  res.status(200).json({ success: true, message: 'SOS updated' });
});

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Socket connection
let activeEmergencies = [];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('accept_sos', (data) => {
    console.log('Provider accepted SOS:', data);
    
    // Update status in activeEmergencies
    const index = activeEmergencies.findIndex(e => e.id === data.id);
    if (index !== -1) {
      activeEmergencies[index].status = 'Dispatched';
      io.emit('update_emergency_status', { id: data.id, status: 'Dispatched' });
    }

    // Broadcast to the user that their SOS was accepted
    io.emit('sos_accepted', {
      message: "Help is on the way!",
      sosId: data.id
    });
  });

  socket.on('get_emergencies', () => {
    socket.emit('sync_emergencies', activeEmergencies);
  });

  socket.on('initial_sos', (data) => {
    console.log('Received initial_sos from client:', data.id);
    
    const saveBase64Photo = (base64String, prefix) => {
      if (!base64String) return null;
      if (typeof base64String === 'string' && base64String.startsWith('data:image')) {
        return base64String;
      }
      return null;
    };

    let photoUrl = saveBase64Photo(data.photo, 'photo');
    let photoFrontUrl = saveBase64Photo(data.photoFront, 'front');
    let photoBackUrl = saveBase64Photo(data.photoBack, 'back');

    const sosReport = {
      id: data.id,
      service: data.service,
      location: data.location,
      photoUrl: photoUrl,
      photoFrontUrl: photoFrontUrl,
      photoBackUrl: photoBackUrl,
      profile: data.profile,
      status: 'Pending',
      timestamp: new Date().toISOString()
    };

    activeEmergencies.unshift(sosReport);

    // Broadcast to the dashboard
    io.emit('new_emergency', sosReport);
  });

  socket.on('update_sos', (data) => {
    console.log('Received update_sos from client:', data.id);
    
    let voiceUrl = null;
    if (data.voice) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'voice-' + uniqueSuffix + '.webm';
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, data.voice);
      voiceUrl = `/uploads/${filename}`;
    }

    let videoUrl = null;
    if (data.video) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'video-' + uniqueSuffix + '.' + (data.videoExt || 'webm');
      const filepath = path.join(uploadDir, filename);
      fs.writeFileSync(filepath, data.video);
      videoUrl = `/uploads/${filename}`;
    }

    const updateData = {
      id: data.id,
      message: data.message,
      voiceUrl,
      videoUrl,
      updateTimestamp: new Date().toISOString()
    };

    const index = activeEmergencies.findIndex(e => e.id === data.id);
    if (index !== -1) {
      activeEmergencies[index] = { 
        ...activeEmergencies[index], 
        message: data.message, 
        voiceUrl: voiceUrl || activeEmergencies[index].voiceUrl, 
        videoUrl: videoUrl || activeEmergencies[index].videoUrl 
      };
    }

    io.emit('update_emergency', updateData);
  });

  socket.on('live_location_update', (data) => {
    console.log('Received live_location_update for:', data.id);
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
