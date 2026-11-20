const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  nidNumber: { type: String, default: '' },
  dob: { type: String, default: '' },
  nidVerified: { type: Boolean, default: true },
  phone: { type: String, default: '' },
  bloodGroup: { type: String, default: '' },
  medicalNotes: { type: String, default: '' },
  nidPhotoUrl: { type: String, default: null },
  fcmToken: { type: String, default: null },
  lastLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    updatedAt: { type: Date, default: null }
  }
}, { timestamps: true });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);