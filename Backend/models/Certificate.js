const mongoose = require('mongoose');

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
    enum: ['draft', 'issued', 'revoked'],
    default: 'draft'
  },
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
      const instituteCode = institute?.instituteName?.substring(0, 3).toUpperCase() || 'INS';
      const date = new Date();
      const year = date.getFullYear().toString().slice(-2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      let code = `${instituteCode}-${year}${month}${day}-${random}`;
      let exists = await mongoose.model('Certificate').findOne({ certificateCode: code });
      
      while (exists) {
        const newRandom = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        code = `${instituteCode}-${year}${month}${day}-${newRandom}`;
        exists = await mongoose.model('Certificate').findOne({ certificateCode: code });
      }
      
      this.certificateCode = code;
    } catch (error) {
      console.error('Error generating certificate code:', error);
      this.certificateCode = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
    }
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);