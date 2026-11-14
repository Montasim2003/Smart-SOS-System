const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const providerSchema = new mongoose.Schema({
  serviceName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  serviceType: { type: String, required: true }
}, { timestamps: true });

// Mongoose-এর লেটেস্ট ভার্সনের জন্য next() রিমুভ করে ফিক্স করা হয়েছে
providerSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

providerSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Provider', providerSchema);