const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: String,
  action: {
    type: String,
    required: true,
    enum: [
      'VIEW_INSTITUTES',
      'VIEW_INSTITUTE_DETAILS',
      'APPROVE_INSTITUTE',
      'REJECT_INSTITUTE',
      'SUSPEND_INSTITUTE',
      'ACTIVATE_INSTITUTE',
      'VIEW_SETTINGS',
      'UPDATE_SETTINGS',
      'RESET_SETTINGS',
      'TEST_EMAIL',
      'GENERATE_SYSTEM_REPORT',
      'RESET_USER_PASSWORD',
      'ACTIVATE_USER',
      'SUSPEND_USER',
      'UNAUTHORIZED_ACCESS_ATTEMPT'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
activityLogSchema.index({ timestamp: -1 });
activityLogSchema.index({ user: 1, timestamp: -1 });
activityLogSchema.index({ action: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);