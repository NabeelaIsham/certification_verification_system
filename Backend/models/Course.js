const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseName: {
    type: String,
    required: true,
    trim: true
  },
  courseCode: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  certificateTemplateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CertificateTemplate',
    default: null
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
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

// IMPORTANT: This is the ONLY index we want
// It ensures courseCode is unique per institute
courseSchema.index({ instituteId: 1, courseCode: 1 }, { 
  unique: true,
  name: 'instituteId_1_courseCode_1' // Give it a clear name
});

// Update timestamp on save
courseSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Drop any legacy indexes when the model is initialized
courseSchema.statics.ensureIndexes = async function() {
  try {
    const collection = this.collection;
    const indexes = await collection.indexes();
    
    // Drop any index that starts with 'code_' (legacy)
    for (const index of indexes) {
      if (index.name.startsWith('code_')) {
        console.log(`Dropping legacy index: ${index.name}`);
        await collection.dropIndex(index.name);
      }
    }
  } catch (error) {
    console.error('Error cleaning indexes:', error);
  }
};

const Course = mongoose.model('Course', courseSchema);

// Call this when the app starts
Course.ensureIndexes().catch(console.error);

module.exports = Course;