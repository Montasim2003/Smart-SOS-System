const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const providerSchema = new mongoose.Schema({
  serviceName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  serviceType: { type: String, required: true },
}, { timestamps: true });

providerSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

providerSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Provider', providerSchema);