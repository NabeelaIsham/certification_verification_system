const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  key: { type: String, required: true },
  fingerprint: { type: String, required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true },
  state: { type: String, enum: ['reserved', 'consumed', 'released'], required: true },
  attempt: { type: Number, required: true },
  leaseUntil: Date,
  awardDate: { type: Date, required: true },
  certificateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' }
}, { timestamps: true });
schema.index({ instituteId: 1, key: 1 }, { unique: true });
module.exports = mongoose.model('CertificateIssuance', schema);
