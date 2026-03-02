const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Authentication
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['superadmin', 'institute', 'teacher'],
    default: 'institute'
  },
  
  // Common fields (used by multiple user types)
  firstName: {
    type: String,
    required: function() {
      return this.userType === 'teacher';
    }
  },
  lastName: {
    type: String,
    required: function() {
      return this.userType === 'teacher';
    }
  },
  phone: String,
  profileImage: String,
  
  // Institute Information (only for institutes)
  instituteName: {
    type: String,
    required: function() {
      return this.userType === 'institute';
    }
  },
  address: {
    type: String,
    required: function() {
      return this.userType === 'institute';
    }
  },
  adminName: {
    type: String,
    required: function() {
      return this.userType === 'institute';
    }
  },
  instituteType: {
    type: String,
    enum: ['University', 'College', 'School', 'Training Center', 'Online Platform', 'Professional Institute', 'Other'],
    required: function() {
      return this.userType === 'institute';
    }
  },
  studentCount: {
    type: Number,
    required: function() {
      return this.userType === 'institute';
    },
    min: 0
  },
  logo: {
    type: String,
    default: ''
  },
  
  // Teacher specific fields
  employeeId: {
    type: String,
    required: function() {
      return this.userType === 'teacher';
    }
  },
  department: {
    type: String,
    required: function() {
      return this.userType === 'teacher';
    }
  },
  designation: String,
  qualification: String,
  joiningDate: {
    type: Date,
    default: Date.now
  },
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.userType === 'teacher';
    }
  },
  assignedCourses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  }],
  permissions: {
    canCreateStudents: { type: Boolean, default: true },
    canEditStudents: { type: Boolean, default: true },
    canDeleteStudents: { type: Boolean, default: false },
    canIssueCertificates: { type: Boolean, default: true },
    canBulkUpload: { type: Boolean, default: false },
    canCreateCourses: { type: Boolean, default: false },
    canEditCourses: { type: Boolean, default: false }
  },
  
  // Super Admin Information (only for superadmins)
  superAdminName: {
    type: String,
    required: function() {
      return this.userType === 'superadmin';
    }
  },
  
  // Verification Status
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  isVerifiedByAdmin: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['pending', 'email_verified', 'phone_verified', 'admin_approval_pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  
  // Admin Notes
  adminNotes: String,
  verifiedAt: Date,
  adminVerifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound index to ensure employeeId is unique per institute
userSchema.index({ instituteId: 1, employeeId: 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { employeeId: { $type: 'string' } }
});

// Update timestamp on save
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);