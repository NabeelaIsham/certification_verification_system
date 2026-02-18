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
    enum: ['superadmin', 'institute'],
    default: 'institute'
  },
  
  // Institute Information
  instituteName: {
    type: String,
    required: function() {
      return this.userType === 'institute';
    }
  },
  phone: {
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
    enum: ['pending', 'email_verified', 'phone_verified', 'admin_approval_pending', 'approved', 'rejected'],
    default: 'pending'
  },
  
  // Admin Notes
  adminNotes: String,
  verifiedAt: Date,
  adminVerifiedAt: Date,
  
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