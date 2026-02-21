const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema({
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  templateId: {
    type: String,
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  courseName: String,
  layout: {
    type: String,
    enum: ['standard', 'premium', 'simple'],
    default: 'standard'
  },
  design: {
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    fontFamily: {
      type: String,
      default: 'Arial, sans-serif'
    },
    borderStyle: {
      type: String,
      default: '2px solid #2563eb'
    },
    logo: String,
    signature: String
  },
  fields: [{
    fieldName: String,
    xPosition: Number,
    yPosition: Number,
    fontSize: Number,
    fontFamily: String
  }],
  isDefault: {
    type: Boolean,
    default: false
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

// Compound index to ensure templateId is unique per institute
certificateTemplateSchema.index({ instituteId: 1, templateId: 1 }, { unique: true });

// Update timestamp on save
certificateTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);