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
    expires: 300  // Auto delete after 5 minutes (300 seconds)
  }
}, {
  timestamps: true
});

// Create TTL index for automatic deletion
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

module.exports = mongoose.model('OTP', otpSchema);