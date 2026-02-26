const mongoose = require('mongoose');

const certificateTemplateSchema = new mongoose.Schema({
  instituteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Institute',
    required: true
  },
  templateName: {
    type: String,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  templateImage: {
    type: String,
    required: true
  },
  fields: [{
    fieldName: {
      type: String,
      enum: ['studentName', 'awardDate', 'certificateCode', 'courseName'],
      required: true
    },
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    },
    fontSize: {
      type: Number,
      default: 24
    },
    fontColor: {
      type: String,
      default: '#000000'
    },
    fontFamily: {
      type: String,
      default: 'Arial'
    },
    textAlign: {
      type: String,
      enum: ['left', 'center', 'right'],
      default: 'center'
    }
  }],
  qrCodePosition: {
    x: Number,
    y: Number,
    size: {
      type: Number,
      default: 100
    }
  },
  isActive: {
    type: Boolean,
    default: true
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

// Update timestamp on save
certificateTemplateSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('CertificateTemplate', certificateTemplateSchema);