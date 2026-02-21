const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CertificateTemplate',
    required: true
  },
  certificateCode: {
    type: String,
    required: true,
    unique: true
  },
  studentName: {
    type: String,
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  awardDate: {
    type: Date,
    required: true
  },
  qrCode: {
    type: String,
    required: true
  },
  qrCodeData: {
    type: String,
    required: true
  },
  certificateUrl: String,
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  status: {
    type: String,
    enum: ['issued', 'revoked', 'pending'],
    default: 'issued'
  },
  revokedAt: Date,
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revocationReason: String,
  metadata: {
    issuedBy: String,
    issuedAt: Date,
    verificationUrl: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for better query performance
certificateSchema.index({ certificateCode: 1 });
certificateSchema.index({ instituteId: 1, createdAt: -1 });
certificateSchema.index({ studentId: 1 });
certificateSchema.index({ status: 1 });

// Update timestamp on save
certificateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);