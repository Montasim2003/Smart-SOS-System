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
  providerLocation: {
    lat: { type: Number },
    lng: { type: Number }
  },
  photoUrl: { type: String },
  photoFrontUrl: { type: String },
  photoBackUrl: { type: String },
  profile: {
    username: { type: String },
    phone: { type: String },
    bloodGroup: { type: String },
    medicalNotes: { type: String },
    contacts: { type: String },
  },
  status: { type: String, default: 'Pending' },
  message: { type: String },
  voiceUrl: { type: String },
  videoUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Emergency', emergencySchema);