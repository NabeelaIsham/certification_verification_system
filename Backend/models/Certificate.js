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
  certificateNumber: {
    type: String,
    unique: true
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  grade: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['issued', 'revoked'],
    default: 'issued'
  }
}, {
  timestamps: true
});

// Generate certificate number
certificateSchema.pre('save', async function(next) {
  if (!this.certificateNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Certificate').countDocuments();
    this.certificateNumber = `CERT${year}${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Certificate', certificateSchema);