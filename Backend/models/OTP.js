const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: false  // Make optional since phone might not always be available
  },
  otp: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['email', 'phone', 'reset_password'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // Expiration is checked explicitly; TTL cleanup uses expiresAt.
  },
  expiresAt: { type: Date, index: { expires: 0 } },
  attempts: { type: Number, default: 0 }
}, {
  timestamps: true
});

otpSchema.pre('validate', async function() {
  if (this.isNew && !this.expiresAt) {
    const policy = await require('../utils/settingsPolicy').getPolicy('verification');
    this.expiresAt = new Date(Date.now() + policy.otpExpiry * 60000);
  }
});
otpSchema.statics.cleanLegacyIndexes = async function() {
  const indexes = await this.collection.indexes();
  for (const index of indexes) {
    if (index.key.createdAt && index.expireAfterSeconds !== undefined) await this.collection.dropIndex(index.name);
  }
  await this.updateMany({ expiresAt: { $exists: false } }, [{ $set: { expiresAt: { $add: ['$createdAt', 300000] } } }]);
};
module.exports = mongoose.model('OTP', otpSchema);
