const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
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
    enum: ['active', 'completed', 'inactive'],
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

// CORRECT INDEX: Unique constraint for student per institute and course
studentSchema.index({ instituteId: 1, email: 1, courseId: 1 }, { 
  unique: true,
  name: 'instituteId_1_email_1_courseId_1'
});

// Additional index for faster queries
studentSchema.index({ instituteId: 1, courseId: 1 });
studentSchema.index({ instituteId: 1, status: 1 });

// Update timestamp on save
studentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Clean up legacy indexes on startup
studentSchema.statics.cleanIndexes = async function() {
  try {
    const collection = this.collection;
    const indexes = await collection.indexes();
    
    for (const index of indexes) {
      // Drop any index that starts with 'studentId_' (legacy)
      if (index.name.startsWith('studentId_')) {
        console.log(`Dropping legacy student index: ${index.name}`);
        await collection.dropIndex(index.name);
      }
    }
  } catch (error) {
    console.error('Error cleaning student indexes:', error);
  }
};

const Student = mongoose.model('Student', studentSchema);

// Call this when the app starts
Student.cleanIndexes().catch(console.error);

module.exports = Student;