const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Changed from 'Institute' to 'User'
    required: true
  },
  type: {
    type: String,
    enum: [
      'new_institute',
      'verification_request',
      'account_approved',
      'account_rejected',
      'account_suspended',
      'account_activated',
      'password_reset',
      'settings_updated',
      'settings_reset',
      'institute_rejected',
      'certificate_issued',
      'certificate_revoked',
      'system_alert'
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
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for quick retrieval
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);