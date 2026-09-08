const mongoose = require('mongoose');

const verificationLogSchema = new mongoose.Schema({
  certificate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate'
  },
  institute: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  certificateCode: {
    type: String,
    trim: true,
    uppercase: true
  },
  outcome: {
    type: String,
    enum: ['valid', 'invalid', 'expired', 'draft', 'revoked', 'suspended', 'superseded', 'not_found', 'unsigned'],
    required: true
  },
  verificationMethod: {
    type: String,
    enum: ['manual', 'qr', 'share', 'api'],
    default: 'manual'
  },
  signatureValid: Boolean,
  ipHash: {
    type: String,
    required: true
  },
  userAgentHash: String,
  riskScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  riskReasons: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * Number(process.env.VERIFICATION_LOG_RETENTION_DAYS || 180)
  }
});

verificationLogSchema.index({ certificate: 1, createdAt: -1 });
verificationLogSchema.index({ institute: 1, riskScore: -1, createdAt: -1 });
verificationLogSchema.index({ ipHash: 1, createdAt: -1 });

module.exports = mongoose.model('VerificationLog', verificationLogSchema);
