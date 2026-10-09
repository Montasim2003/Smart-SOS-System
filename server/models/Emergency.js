const mongoose = require('mongoose');

const emergencySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  emergencyId: { type: String, required: true, unique: true },
  service: { type: String },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    accuracy: { type: Number }
  },
  photoUrl: { type: String },
  photoFrontUrl: { type: String },
  photoBackUrl: { type: String },
  profile: {
    name: { type: String },
    phone: { type: String },
    bloodType: { type: String },
    conditions: { type: String },
    contacts: { type: String },
  },
  status: { type: String, default: 'Pending' }, // Pending, Dispatched, Resolved
  message: { type: String },
  voiceUrl: { type: String },
  videoUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Emergency', emergencySchema);
