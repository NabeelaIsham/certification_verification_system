const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  operationId: { type: mongoose.Schema.Types.ObjectId, ref: 'CertificateIssuance', required: true },
  actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attempt: { type: Number, required: true },
  event: { type: String, enum: ['reserved', 'consumed', 'released'], required: true },
  units: { type: Number, default: 1, immutable: true },
  certificateId: { type: mongoose.Schema.Types.ObjectId, ref: 'Certificate' },
  createdAt: { type: Date, default: Date.now, immutable: true }
});
schema.index({ operationId: 1, attempt: 1, event: 1 }, { unique: true });
schema.index({ instituteId: 1, createdAt: -1 });
module.exports = mongoose.model('IssuanceEvent', schema);
