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

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB successfully connected!'))
  .catch(err => console.error('MongoDB connection error:', err));

const io = new Server(server, {
  cors: {
    origin: true,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['polling', 'websocket'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e7
});

// Built-in Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({
  origin: true,
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));

// NoSQL Injection & XSS Sanitizer
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'string') {
      obj[key] = obj[key]
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '');
    } else if (typeof obj[key] === 'object') {
      sanitizeObject(obj[key]);
    }
  }
  return obj;
};

app.use((req, res, next) => {
  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);
  next();
});

// Rate Limiter
const rateLimitMap = new Map();
const rateLimiter = (maxRequests, windowMs) => (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };
  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + windowMs;
  } else {
    entry.count += 1;
  }
  rateLimitMap.set(ip, entry);
  if (entry.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests from this device. Please wait a few minutes.'
    });
  }
  next();
};

app.use('/api/auth', rateLimiter(60, 15 * 60 * 1000));

// Upload Configuration
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
    const safeExt = path.extname(file.originalname).replace(/[^a-zA-Z0-9.]/g, '') || '.webm';
    cb(null, file.fieldname + '-' + uniqueSuffix + safeExt);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg',
    'video/webm', 'video/mp4', 'video/quicktime',
    'image/jpeg', 'image/png', 'image/webp'
  ];
  if (allowedMimes.some(type => file.mimetype.startsWith(type.split('/')[0]))) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type blocked by security filter'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 }
});

app.use('/uploads', express.static(uploadDir));

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key';

function isValidBangladeshiNID(nid, dob) {
  const cleaned = String(nid || '').trim();
  if (!/^(?:\d{10}|\d{13}|\d{17})$/.test(cleaned)) {
    return { valid: false, message: 'Invalid NID! Must be a valid 10, 13, or 17 digit Bangladeshi NID number.' };
  }
  if (/^(\d)\1+$/.test(cleaned)) {
    return { valid: false, message: 'Fake repeating digits are not allowed as NID.' };
  }
  if (dob && cleaned.length === 17) {
    const birthYear = new Date(dob).getFullYear().toString();
    if (birthYear && birthYear.length === 4 && !cleaned.startsWith(birthYear)) {
      return { valid: false, message: `17-digit NID must start with your birth year (${birthYear}).` };
    }
  }
  return { valid: true, cleaned };
}

app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

// NID Registration Route with upload.single('nidPhoto')
app.post('/api/auth/user/register', upload.single('nidPhoto'), async (req, res) => {
  try {
    const { username, password, nidNumber, dob, phone } = req.body;
    
    if (!username || !password || !nidNumber) {
      return res.status(400).json({ success: false, message: 'Username, Password and NID Number are required.' });
    }

    const nidCheck = isValidBangladeshiNID(nidNumber, dob);
    if (!nidCheck.valid) {
      return res.status(400).json({ success: false, message: nidCheck.message });
    }

    const existingUser = await User.findOne({ username: username.trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }

    const existingNid = await User.findOne({ nidNumber: nidCheck.cleaned });
    if (existingNid) {
      return res.status(400).json({ success: false, message: 'This NID Card is already registered with another account!' });
    }

    const nidPhotoUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const user = new User({
      username: username.trim(),
      password,
      nidNumber: nidCheck.cleaned,
      dob: dob || '',
      nidVerified: true,
      phone: phone || '',
      nidPhotoUrl: nidPhotoUrl 
    });
    await user.save();

    const token = jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        nidNumber: user.nidNumber,
        dob: user.dob,
        nidVerified: true,
        phone: user.phone || '',
        bloodGroup: user.bloodGroup || '',
        medicalNotes: user.medicalNotes || '',
        nidPhotoUrl: user.nidPhotoUrl
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/user/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: String(username || '').trim() });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: 'user' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        nidNumber: user.nidNumber || '',
        dob: user.dob || '',
        nidVerified: Boolean(user.nidNumber),
        phone: user.phone || '',
        bloodGroup: user.bloodGroup || '',
        medicalNotes: user.medicalNotes || ''
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/user/profile', async (req, res) => {
  try {
    const { userId, phone, bloodGroup, medicalNotes, nidNumber } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    if (phone !== undefined) user.phone = phone;
    if (bloodGroup !== undefined) user.bloodGroup = bloodGroup;
    if (medicalNotes !== undefined) user.medicalNotes = medicalNotes;
    if (nidNumber && !user.nidNumber) {
      const check = isValidBangladeshiNID(nidNumber);
      if (check.valid) {
        user.nidNumber = check.cleaned;
        user.nidVerified = true;
      }
    }
    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        nidNumber: user.nidNumber || '',
        nidVerified: Boolean(user.nidNumber),
        phone: user.phone || '',
        bloodGroup: user.bloodGroup || '',
        medicalNotes: user.medicalNotes || ''
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/provider/register', async (req, res) => {
  try {
    const { serviceName, email, password, serviceType } = req.body;
    let provider = await Provider.findOne({ email });
    if (provider) return res.status(400).json({ success: false, message: 'Email already exists' });

    provider = new Provider({ serviceName, email, password, serviceType });
    await provider.save();

    const token = jwt.sign({ id: provider._id, role: 'provider' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({
      success: true,
      token,
      provider: {
        id: provider._id,
        serviceName: provider.serviceName,
        email: provider.email,
        serviceType: provider.serviceType
      }
    });
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
    res.json({
      success: true,
      token,
      provider: {
        id: provider._id,
        serviceName: provider.serviceName,
        email: provider.email,
        serviceType: provider.serviceType
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/sos/update', upload.fields([
  { name: 'voice', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  const { id, message } = req.body;
  const voiceFile = req.files && req.files['voice'] ? req.files['voice'][0] : null;
  const videoFile = req.files && req.files['video'] ? req.files['video'][0] : null;

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
  socket.on('get_emergencies', async () => {
    try {
      const emergencies = await Emergency.find().sort({ createdAt: -1 }).lean();
      const formatted = emergencies.map(e => ({
        ...e,
        id: e.emergencyId,
        chatMessages: e.chatMessages || []
      }));
      socket.emit('sync_emergencies', formatted);
    } catch (err) {
      console.error('Error fetching emergencies:', err);
    }
  });

  socket.on('initial_sos', async (data) => {
    const saveBase64Photo = (base64String) => {
      if (!base64String) return null;
      if (typeof base64String === 'string' && base64String.startsWith('data:image')) {
        return base64String;
      }
      return null;
    };

    try {
      const savedEmergency = await Emergency.findOneAndUpdate(
        { emergencyId: data.id },
        {
          $set: {
            userId: data.userId || null,
            emergencyId: data.id,
            service: data.service,
            location: data.location,
            photoUrl: saveBase64Photo(data.photo),
            photoFrontUrl: saveBase64Photo(data.photoFront),
            photoBackUrl: saveBase64Photo(data.photoBack),
            profile: data.profile
          },
          $setOnInsert: {
            status: 'Pending',
            chatMessages: []
          }
        },
        { upsert: true, new: true, strict: false }
      ).lean();

      const sosReport = {
        ...savedEmergency,
        id: savedEmergency.emergencyId,
        chatMessages: savedEmergency.chatMessages || []
      };

      io.emit('new_emergency', sosReport);
    } catch (err) {
      console.error('Error saving initial SOS:', err);
    }
  });

  socket.on('accept_sos', async (data) => {
    try {
      await Emergency.findOneAndUpdate(
        { emergencyId: data.id },
        { $set: { status: 'Dispatched' } },
        { strict: false }
      );
      io.emit('update_emergency_status', { id: data.id, status: 'Dispatched' });
      io.emit('sos_accepted', { id: data.id, sosId: data.id, message: 'Help is on the way!' });
    } catch (err) {
      console.error('Error accepting SOS:', err);
    }
  });

  socket.on('live_location_update', async (data) => {
    try {
      await Emergency.findOneAndUpdate(
        { emergencyId: data.id },
        { $set: { location: data.location } },
        { strict: false }
      );
      io.emit('update_emergency_location', { id: data.id, location: data.location });
    } catch (err) {
      console.error('Error updating live location:', err);
    }
  });

  socket.on('provider_location_update', async (data) => {
    try {
      await Emergency.findOneAndUpdate(
        { emergencyId: data.id },
        { $set: { providerLocation: data.location } },
        { strict: false }
      );
      io.emit('rescue_team_location', { id: data.id, location: data.location });
    } catch (err) {
      console.error('Error updating provider live location:', err);
    }
  });

  socket.on('send_chat_message', async (data) => {
    const chatItem = {
      msgId: 'MSG-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      sosId: data.sosId,
      senderName: data.senderName,
      senderRole: data.senderRole,
      text: data.text || '',
      image: data.image || null,
      timestamp: Date.now()
    };

    try {
      await Emergency.findOneAndUpdate(
        { emergencyId: data.sosId },
        { $push: { chatMessages: chatItem } },
        { strict: false }
      );
    } catch (err) {
      console.error('Error saving chat message:', err);
    }

    io.emit('receive_chat_message', chatItem);
  });

  socket.on('delete_sos', async (data) => {
    try {
      await Emergency.findOneAndDelete({ emergencyId: data.id });
      io.emit('sos_deleted', { id: data.id });
    } catch (err) {
      console.error('Error deleting SOS:', err);
    }
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});