const mongoose = require('mongoose');

const credentialShareSchema = new mongoose.Schema({
  certificate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate',
    required: true
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true
  },
  label: {
    type: String,
    trim: true,
    maxlength: 100,
    default: 'Credential share'
  },
  visibleFields: [{
    type: String,
    enum: ['studentName', 'courseName', 'awardDate', 'instituteName', 'certificateCode', 'status', 'certificateImage']
  }],
  expiresAt: {
    type: Date,
    required: true
  },
  maxViews: {
    type: Number,
    min: 1,
    max: 10000,
    default: 25
  },
  viewCount: {
    type: Number,
    default: 0
  },
  revokedAt: Date,
  lastViewedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

credentialShareSchema.index({ certificate: 1, createdAt: -1 });
credentialShareSchema.index({ institute: 1, revokedAt: 1, expiresAt: 1 });
credentialShareSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 * Number(process.env.SHARE_RECORD_RETENTION_DAYS || 30) }
);

module.exports = mongoose.model('CredentialShare', credentialShareSchema);
