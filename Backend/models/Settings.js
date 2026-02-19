const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // General Settings
  general: {
    systemName: {
      type: String,
      default: 'Certificate Verification System'
    },
    supportEmail: {
      type: String,
      default: 'support@certverify.com'
    },
    companyName: {
      type: String,
      default: 'Your Company Name'
    },
    timezone: {
      type: String,
      default: 'UTC+5:30'
    },
    dateFormat: {
      type: String,
      default: 'DD/MM/YYYY'
    }
  },

  // Security Settings
  security: {
    twoFactorAuth: {
      type: Boolean,
      default: false
    },
    sessionTimeout: {
      type: Number,
      default: 30
    },
    maxLoginAttempts: {
      type: Number,
      default: 5
    },
    passwordExpiry: {
      type: Number,
      default: 90
    },
    requireEmailVerification: {
      type: Boolean,
      default: true
    },
    requirePhoneVerification: {
      type: Boolean,
      default: true
    }
  },

  // Email Settings
  email: {
    smtpServer: {
      type: String,
      default: 'smtp.gmail.com'
    },
    smtpPort: {
      type: Number,
      default: 587
    },
    smtpUsername: {
      type: String,
      default: ''
    },
    smtpPassword: {
      type: String,
      default: ''
    },
    fromEmail: {
      type: String,
      default: ''
    },
    fromName: {
      type: String,
      default: 'Certificate System'
    }
  },

  // Verification Settings
  verification: {
    otpExpiry: {
      type: Number,
      default: 5
    },
    maxOtpAttempts: {
      type: Number,
      default: 3
    },
    allowResendOtp: {
      type: Boolean,
      default: true
    },
    resendCooldown: {
      type: Number,
      default: 60
    }
  },

  // Certificate Settings
  certificate: {
    defaultValidity: {
      type: Number,
      default: 365
    },
    allowRevocation: {
      type: Boolean,
      default: true
    },
    requireApproval: {
      type: Boolean,
      default: true
    },
    maxFileSize: {
      type: Number,
      default: 5
    },
    allowedFormats: {
      type: [String],
      default: ['PDF', 'PNG', 'JPEG']
    }
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Settings').countDocuments();
    if (count > 0) {
      const error = new Error('Only one settings document can exist');
      return next(error);
    }
  }
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Settings', settingsSchema);