const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Course name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Course code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 month']
  },
  fee: {
    type: Number,
    required: [true, 'Fee is required'],
    min: [0, 'Fee cannot be negative']
  },
  description: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Ensure unique course code per institute (compound index)
courseSchema.index({ code: 1, instituteId: 1 }, { unique: true });

module.exports = mongoose.model('Course', courseSchema);