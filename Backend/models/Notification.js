const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'new_institute',           // When new institute registers
      'verification_request',     // When institute requests verification
      'account_approved',        // When institute is approved
      'account_rejected',        // When institute is rejected
      'account_suspended',       // When institute is suspended
      'account_activated',       // When institute is activated
      'password_reset',          // When password is reset
      'settings_updated',        // WHEN SETTINGS ARE UPDATED (ADD THIS)
      'settings_reset',          // WHEN SETTINGS ARE RESET (ADD THIS)
      'institute_rejected',      // When institute is rejected
      'certificate_issued',      // When certificate is issued
      'certificate_revoked',     // When certificate is revoked
      'system_alert'             // System alerts
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);