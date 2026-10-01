const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: String,
  operationId: { type: mongoose.Schema.Types.ObjectId, required: true },
  attempt: { type: Number, required: true },
  leaseUntil: { type: Date, required: true }
});
// No TTL: acquisition and release must happen in the same transaction as the ledger.
module.exports = mongoose.model('IssuanceLock', schema);
