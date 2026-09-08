const mongoose = require('mongoose');
const { generateCertificateCode } = require('../utils/CertificateCodeGenerator');

const certificateSchema = new mongoose.Schema({
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
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
    unique: true,
    sparse: true
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
  generatedCertificateImage: String,
  qrCodeImage: String,
  verificationUrl: String,
  emailSent: {
    type: Boolean,
    default: false
  },
  emailSentAt: Date,
  status: {
    type: String,
    enum: ['draft', 'issued', 'suspended', 'revoked', 'superseded'],
    default: 'draft'
  },
  credential: {
    version: String,
    format: String,
    payload: mongoose.Schema.Types.Mixed,
    payloadEncoded: String,
    signature: String,
    algorithm: String,
    keyId: String,
    publicKey: String,
    hash: String,
    signedAt: Date
  },
  lifecycleEvents: [{
    action: {
      type: String,
      enum: ['created', 'issued', 'suspended', 'reinstated', 'revoked', 'superseded', 'renewed']
    },
    fromStatus: String,
    toStatus: String,
    reason: {
      type: String,
      trim: true,
      maxlength: 500
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedByType: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  supersededBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Certificate'
  },
  validUntil: Date,
  approvalRequired: { type: Boolean, default: false },
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  revokedAt: Date,
  suspendedAt: Date,
  previewData: {
    type: mongoose.Schema.Types.Mixed
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

// Generate unique certificate code before saving
certificateSchema.pre('save', async function(next) {
  if (!this.certificateCode) {
    try {
      const institute = await mongoose.model('User').findById(this.instituteId);
      let code = generateCertificateCode(institute?.instituteName);
      let exists = await mongoose.model('Certificate').findOne({ certificateCode: code });
      
      while (exists) {
        code = generateCertificateCode(institute?.instituteName);
        exists = await mongoose.model('Certificate').findOne({ certificateCode: code });
      }
      
      this.certificateCode = code;
    } catch (error) {
      console.error('Error generating certificate code:', error);
      this.certificateCode = generateCertificateCode('CERT');
    }
  }
  if (this.isNew && (!this.lifecycleEvents || this.lifecycleEvents.length === 0)) {
    this.lifecycleEvents = [{
      action: this.status === 'issued' ? 'issued' : 'created',
      fromStatus: null,
      toStatus: this.status,
      performedBy: this.instituteId,
      performedByType: 'institute',
      createdAt: new Date()
    }];
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);
