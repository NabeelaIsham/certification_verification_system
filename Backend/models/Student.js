const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Student name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    default: ''
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'graduated'],
    default: 'active'
  },
  studentId: {
    type: String,
    unique: true
  }
}, {
  timestamps: true
});

// Generate student ID before saving
studentSchema.pre('save', async function(next) {
  if (!this.studentId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Student').countDocuments();
    this.studentId = `STU${year}${(count + 1).toString().padStart(5, '0')}`;
  }
  next();
});

// Ensure unique email per institute
studentSchema.index({ email: 1, instituteId: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);