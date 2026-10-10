require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io'); 
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Provider = require('./models/Provider');
const Emergency = require('./models/Emergency');

const app = express();
const server = http.createServer(app);

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB successfully connected!'))
  .catch(err => console.error('MongoDB connection error:', err));

const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000',
  'http://localhost:5174',
  'http://localhost:5175',
  'https://smart-sos-system-lf2rtqyfc.vercel.app',
  'https://smart-sos-system.vercel.app'
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

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

app.use('/uploads', express.static(uploadDir));

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

// User Auth
app.post('/api/auth/user/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ success: false, message: 'Username already exists' });
    
    user = new User({ username, password });
    await user.save();
    
    const token = jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, user: { id: user._id, username: user.username, bloodGroup: user.bloodGroup, medicalNotes: user.medicalNotes } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/user/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, user: { id: user._id, username: user.username, bloodGroup: user.bloodGroup, medicalNotes: user.medicalNotes } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/user/profile', async (req, res) => {
  try {
    const { userId, bloodGroup, medicalNotes } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    user.bloodGroup = bloodGroup;
    user.medicalNotes = medicalNotes;
    await user.save();
    
    res.json({ success: true, user: { id: user._id, username: user.username, bloodGroup: user.bloodGroup, medicalNotes: user.medicalNotes } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Provider Auth
app.post('/api/auth/provider/register', async (req, res) => {
  try {
    const { serviceName, email, password, serviceType } = req.body;
    let provider = await Provider.findOne({ email });
    if (provider) return res.status(400).json({ success: false, message: 'Email already exists' });
    
    provider = new Provider({ serviceName, email, password, serviceType });
    await provider.save();
    
    const token = jwt.sign({ id: provider._id, role: 'provider' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, provider: { id: provider._id, serviceName: provider.serviceName, email: provider.email, serviceType: provider.serviceType } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/provider/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const provider = await Provider.findOne({ email });
    if (!provider) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await provider.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: provider._id, role: 'provider' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ success: true, token, provider: { id: provider._id, serviceName: provider.serviceName, email: provider.email, serviceType: provider.serviceType } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/sos/update', upload.fields([
  { name: 'voice', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  console.log('Received media update via API for ID:', req.body.id);
  
  const { id, message } = req.body;
  const voiceFile = req.files['voice'] ? req.files['voice'][0] : null;
  const videoFile = req.files['video'] ? req.files['video'][0] : null;

  const voiceUrl = voiceFile ? `/uploads/${voiceFile.filename}` : null;
  const videoUrl = videoFile ? `/uploads/${videoFile.filename}` : null;

  try {
    const emergency = await Emergency.findOne({ emergencyId: id });
    if (emergency) {
      if (message) emergency.message = message;
      if (voiceUrl) emergency.voiceUrl = voiceUrl;
      if (videoUrl) emergency.videoUrl = videoUrl;
      await emergency.save();
      
      const updateData = {
        id,
        message: emergency.message,
        voiceUrl: emergency.voiceUrl,
        videoUrl: emergency.videoUrl,
        updateTimestamp: new Date().toISOString()
      };
      
      io.emit('update_emergency', updateData);
      res.status(200).json({ success: true, message: 'SOS media updated successfully', updateData });
    } else {
      res.status(404).json({ success: false, message: 'Emergency not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('get_emergencies', async () => {
    try {
      const emergencies = await Emergency.find().sort({ createdAt: -1 }).lean();
      const formatted = emergencies.map(e => ({
        ...e,
        id: e.emergencyId
      }));
      socket.emit('sync_emergencies', formatted);
    } catch (err) {
      console.error('Error fetching emergencies:', err);
    }
  });

  socket.on('initial_sos', async (data) => {
    console.log('Received initial_sos from client:', data.id);
    
    const saveBase64Photo = (base64String) => {
      if (!base64String) return null;
      if (typeof base64String === 'string' && base64String.startsWith('data:image')) {
        return base64String;
      }
      return null;
    };

    try {
      const newEmergency = new Emergency({
        userId: data.userId || null, 
        emergencyId: data.id,
        service: data.service,
        location: data.location,
        photoUrl: saveBase64Photo(data.photo),
        photoFrontUrl: saveBase64Photo(data.photoFront),
        photoBackUrl: saveBase64Photo(data.photoBack),
        profile: data.profile,
        status: 'Pending'
      });
      await newEmergency.save();

      const sosReport = {
        ...newEmergency.toObject(),
        id: newEmergency.emergencyId
      };

      io.emit('new_emergency', sosReport);
    } catch (err) {
      console.error('Error saving initial SOS:', err);
    }
  });

  socket.on('accept_sos', async (data) => {
    console.log('Provider accepted SOS:', data.id);
    try {
      await Emergency.findOneAndUpdate({ emergencyId: data.id }, { status: 'Dispatched' });
      io.emit('update_emergency_status', { id: data.id, status: 'Dispatched' });
      io.emit('sos_accepted', { message: "Help is on the way!", sosId: data.id });
    } catch (err) {
      console.error('Error accepting SOS:', err);
    }
  });

  socket.on('live_location_update', async (data) => {
    try {
      await Emergency.findOneAndUpdate({ emergencyId: data.id }, { location: data.location });
      io.emit('update_emergency_location', { id: data.id, location: data.location });
    } catch (err) {
      console.error('Error updating live location:', err);
    }
  });

  socket.on('delete_sos', async (data) => {
    try {
      await Emergency.findOneAndDelete({ emergencyId: data.id });
      io.emit('sos_deleted', { id: data.id });
    } catch (err) {
      console.error('Error deleting SOS:', err);
    }
  });

  socket.on('provider_location_update', async (data) => {
    try {
      await Emergency.findOneAndUpdate(
        { emergencyId: data.id }, 
        { providerLocation: data.location }
      );
      io.emit('rescue_team_location', { id: data.id, location: data.location });
    } catch (err) {
      console.error('Error updating provider live location:', err);
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