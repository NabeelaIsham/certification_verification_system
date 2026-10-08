const mongoose = require('mongoose');
const { Schema } = mongoose;
const id = { type: Schema.Types.ObjectId, required: true };
const integer = (min = 0) => ({ type: Number, required: true, min, max: Number.MAX_SAFE_INTEGER, validate: Number.isSafeInteger });
const limits = new Schema({ certificates: integer(1), teachers: integer(), templates: integer() }, { _id: false });
const features = new Schema({ bulkCertificateIssue: { type: Boolean, default: false }, secureSharing: { type: Boolean, default: true } }, { _id: false });
const planSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100, unique: true },
  priceMinor: integer(), currency: { type: String, enum: ['LKR'], default: 'LKR' },
  limits: { type: limits, required: true }, features: { type: features, default: () => ({}) },
  active: { type: Boolean, default: false }, displayOrder: { type: Number, default: 0 },
  recommended: { type: Boolean, default: false }
}, { timestamps: true });
const snapshot = new Schema({ name: String, priceMinor: integer(), currency: { type: String, enum: ['LKR'], required: true }, limits, features }, { _id: false });
const subscriptionSchema = new Schema({
  instituteId: { ...id, ref: 'User' }, planId: { type: Schema.Types.ObjectId, required: function () { return this.activation !== 'trial'; } }, requestKey: { type: String, required: true },
  snapshot: { type: snapshot, required: true, immutable: true },
  status: { type: String, enum: ['trial', 'trial_suspended', 'pending', 'active', 'expired', 'suspended', 'cancelled'], default: 'pending' },
  lastStatusChange: { at: Date, actorId: Schema.Types.ObjectId, reason: String },
  paymentProof: {
    transactionNumber: { type: String, maxlength: 100 },
    payerName: { type: String, maxlength: 160 }, paidAt: Date,
    notes: { type: String, maxlength: 500 }, bankSnapshot: Schema.Types.Mixed,
    packageReference: String,
    status: { type: String, enum: ['submitted', 'rejected', 'approved'] },
    submittedAt: Date, reviewedAt: Date, reviewedBy: Schema.Types.ObjectId,
    rejectionReason: String, receiptVersion: String,
    receipt: { type: Buffer, select: false },
    receiptType: String
  },
  startsAt: Date, endsAt: Date, allocated: { ...integer(), default: 0 },
  consumed: { ...integer(), default: 0 }, reserved: { ...integer(), default: 0 },
  entitlementVersion: { type: Number, default: 0 }, activation: { type: String, enum: ['manual', 'trial'] }
}, { timestamps: true });
subscriptionSchema.index({ instituteId: 1, requestKey: 1 }, { unique: true });
subscriptionSchema.index({ status: 1, endsAt: 1 });
subscriptionSchema.index({ instituteId: 1, activation: 1 }, { unique: true, partialFilterExpression: { activation: 'trial' } });
subscriptionSchema.index({ 'paymentProof.transactionNumber': 1 }, { unique: true, partialFilterExpression: { 'paymentProof.transactionNumber': { $type: 'string' } } });
subscriptionSchema.index({ instituteId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['pending', 'active', 'suspended'] } } });
const usageSchema = new Schema({
  instituteId: id, subscriptionId: id, key: { type: String, required: true },
  event: { type: String, enum: ['credit_allocated', 'credit_reserved', 'credit_consumed', 'credit_released', 'credit_adjusted', 'credit_refunded'], required: true },
  units: integer(), operationId: Schema.Types.ObjectId, attempt: Number,
  createdAt: { type: Date, default: Date.now, immutable: true }
});
usageSchema.index({ subscriptionId: 1, key: 1 }, { unique: true });
const auditSchema = new Schema({
  instituteId: Schema.Types.ObjectId, subscriptionId: Schema.Types.ObjectId, planId: Schema.Types.ObjectId,
  actorId: id, event: { type: String, required: true }, details: Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now, immutable: true }
});
const paymentSchema = new Schema({
  instituteId: id, subscriptionId: { ...id, unique: true },
  reference: { type: String, required: true, unique: true }, amountMinor: integer(),
  packageReference: String,
  receiptSnapshot: { instituteName: String, instituteEmail: String, packageName: String,
    startsAt: Date, endsAt: Date, payerName: String, transferredAt: Date,
    approvedByName: String, approvedByEmail: String },
  currency: { type: String, enum: ['LKR'], default: 'LKR' },
  gateway: { type: String, enum: ['manual'], default: 'manual' },
  status: { type: String, enum: ['paid'], default: 'paid' }, recordedBy: id, paidAt: { type: Date, default: Date.now }
});
module.exports = {
  SubscriptionExpiryEmail: mongoose.model('SubscriptionExpiryEmail', new Schema({
    subscriptionId: { ...id, unique: true }, instituteId: id, recipient: { type: String, required: true },
    packageName: String, expiredAt: Date,
    status: { type: String, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending' },
    attempts: { type: Number, default: 0 }, nextAttemptAt: { type: Date, default: Date.now },
    leaseUntil: Date, claimToken: String, sentAt: Date, lastError: String
  }, { timestamps: true }).index({ status: 1, nextAttemptAt: 1 }).index({ status: 1, leaseUntil: 1 })),
  BankPaymentDetails: mongoose.model('BankPaymentDetails', new Schema({
    _id: { type: String, default: 'manual-payment' },
    bankName: { type: String, required: true, maxlength: 120 },
    accountHolder: { type: String, required: true, maxlength: 160 },
    accountNumber: { type: String, required: true, maxlength: 60 },
    branch: { type: String, required: true, maxlength: 120 }
  }, { timestamps: true })),
  Plan: mongoose.model('Plan', planSchema), Subscription: mongoose.model('Subscription', subscriptionSchema),
  UsageTransaction: mongoose.model('UsageTransaction', usageSchema),
  SubscriptionEvent: mongoose.model('SubscriptionEvent', auditSchema), Payment: mongoose.model('Payment', paymentSchema)
};
