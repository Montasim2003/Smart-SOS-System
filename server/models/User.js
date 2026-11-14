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
  nidPhotoUrl: { type: String, default: null }
}, { timestamps: true });

// Mongoose-এর লেটেস্ট ভার্সনের জন্য next() রিমুভ করে ফিক্স করা হয়েছে
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);