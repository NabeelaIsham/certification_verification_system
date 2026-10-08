const mongoose = require('mongoose');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { expireSubscription } = require('./subscriptionLifecycleService');
const { Plan, Subscription, UsageTransaction, SubscriptionEvent, Payment, PaymentInvoiceEmail } = require('../models/Saas');
const enabled = () => process.env.SAAS_ENABLED === 'true';
const fail = (status, message) => Object.assign(new Error(message), { status });
const transaction = work => mongoose.connection.transaction(work);
const activeFilter = instituteId => ({ instituteId, status: { $in: ['active', 'trial'] }, startsAt: { $lte: new Date() }, endsAt: { $gt: new Date() } });
const audit = (values, session) => SubscriptionEvent.create([values], { session });

const TRIAL_DAYS = 14;
const TRIAL_LIMITS = Object.freeze({ certificates: 100, teachers: 2, templates: 2 });
async function trialTerms(session = null) {
  const starter = await Plan.findOne({ name: 'Starter' }).session(session);
  return { days: TRIAL_DAYS, limits: starter?.limits.toObject() || TRIAL_LIMITS,
    features: starter?.features.toObject() || { bulkCertificateIssue: true, secureSharing: true } };
}
// Called in the registration transaction. A permanent unique trial record prevents renewal by retry.
async function createRegistrationTrial(instituteId, session) {
  const existing = await Subscription.findOne({ instituteId, activation: 'trial' }).session(session);
  if (existing) return existing;
  const terms = await trialTerms(session);
  const startsAt = new Date();
  const [trial] = await Subscription.create([{
    instituteId, requestKey: 'registration-trial', activation: 'trial', status: 'trial',
    startsAt, endsAt: new Date(startsAt.getTime() + TRIAL_DAYS * 86400000), allocated: terms.limits.certificates,
    snapshot: { name: 'Free trial', priceMinor: 0, currency: 'LKR', limits: terms.limits, features: terms.features }
  }], { session });
  await UsageTransaction.create([{ instituteId, subscriptionId: trial._id, key: 'initial-allocation', event: 'credit_allocated', units: trial.allocated }], { session });
  await audit({ instituteId, subscriptionId: trial._id, actorId: instituteId, event: 'registration_trial_started' }, session);
  return trial;
}

async function requireActiveSubscription(instituteId, session = null) {
  const subscription = await Subscription.findOne(activeFilter(instituteId)).session(session);
  if (!subscription) throw fail(402, 'An active subscription is required.');
  return subscription;
}
async function requirePlanFeature(instituteId, feature, session = null) {
  if (!enabled()) return;
  const subscription = await requireActiveSubscription(instituteId, session);
  if (subscription.snapshot.features?.[feature] !== true) throw fail(403, 'This feature is not included in your plan.');
}
async function requestSubscription(instituteId, planId, requestKey) {
  if (!mongoose.isObjectIdOrHexString(planId) || typeof requestKey !== 'string' || !/^[a-zA-Z0-9_-]{16,128}$/.test(requestKey)) throw fail(400, 'Valid plan and request key required.');
  return transaction(async session => {
    const institute = await User.findOne({ _id: instituteId, userType: 'institute', isActive: true, isVerifiedByAdmin: true }).session(session);
    if (!institute) throw fail(403, 'Institute verification is required.');
    const existing = await Subscription.findOne({ instituteId, requestKey }).session(session);
    if (existing) {
      if (String(existing.planId) !== String(planId)) throw fail(409, 'Request key already used for another plan.');
      return existing;
    }
    await recoverExpiredCredits(instituteId, session);
    const expiredSubscriptions = await Subscription.find({ instituteId, status: 'active', endsAt: { $lte: new Date() }, reserved: 0 }).session(session);
    for (const expired of expiredSubscriptions) {
      await expireSubscription(expired, session, instituteId);
    }
    const outstanding = await Subscription.findOne({ instituteId, status: 'pending' }).session(session);
    if (outstanding?.status === 'pending' && String(outstanding.planId) === String(planId)) return outstanding;
    if (outstanding) throw fail(409, 'You already have a pending package. Open My packages to continue or cancel that payment.');
    const plan = await Plan.findOne({ _id: planId, active: true }).session(session);
    if (!plan) throw fail(404, 'Plan is unavailable.');
    const current = await Subscription.findOne({ instituteId, status: { $in: ['active', 'suspended'] } }).session(session);
    if (current?.status === 'suspended') throw fail(409, 'Your package is stopped. Contact the super admin before changing packages.');
    if (current && (String(current.planId) === String(planId) || plan.priceMinor <= current.snapshot.priceMinor ||
      ['certificates', 'teachers', 'templates'].some(key => plan.limits[key] < current.snapshot.limits[key]) ||
      ['bulkCertificateIssue', 'secureSharing'].some(key => current.snapshot.features?.[key] && !plan.features?.[key]))) {
      throw fail(409, 'Choose a higher-priced package that preserves your current limits and features.');
    }
    const [subscription] = await Subscription.create([{ instituteId, planId, requestKey, replacesSubscriptionId: current?._id, snapshot: {
      name: plan.name, priceMinor: plan.priceMinor, currency: plan.currency, limits: plan.limits.toObject(), features: plan.features.toObject()
    } }], { session });
    await audit({ instituteId, subscriptionId: subscription._id, actorId: instituteId, event: 'plan_selected' }, session);
    return subscription;
  });
}
function annualExpiry(start) {
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  if (end.getUTCMonth() !== start.getUTCMonth()) end.setUTCDate(0);
  return end;
}
async function activateManual(subscriptionId, actorId, { reference, amountMinor, receiptVersion }) {
  if (typeof reference !== 'string' || !/^[a-zA-Z0-9_:/-]{3,100}$/.test(reference) || !Number.isSafeInteger(amountMinor)) throw fail(400, 'Bank reference and exact amount in minor currency units required.');
  reference = reference.toUpperCase();
  return transaction(async session => {
    const sub = await Subscription.findById(subscriptionId).session(session);
    if (!sub) throw fail(404, 'Subscription not found.');
    if (amountMinor !== sub.snapshot.priceMinor) throw fail(400, 'Payment must match the purchased price.');
    const payment = await Payment.findOne({ subscriptionId }).session(session);
    if (payment) {
      if (payment.reference !== reference) throw fail(409, 'Payment was already recorded with a different reference.');
      return sub;
    }
    if (sub.status !== 'pending') throw fail(409, 'Only pending subscriptions can be activated.');
    if (sub.paymentProof?.status !== 'submitted' || !receiptVersion || sub.paymentProof.receiptVersion !== receiptVersion || sub.paymentProof.transactionNumber !== reference) {
      throw fail(409, 'Review the current uploaded receipt and its transaction number before activation.');
    }
    if (!await User.exists({ _id: sub.instituteId, userType: 'institute', isActive: true, isVerifiedByAdmin: true }).session(session)) throw fail(403, 'Institute is unavailable.');
    await recoverExpiredCredits(sub.instituteId, session);
    const current = await Subscription.findOne({ instituteId: sub.instituteId, status: { $in: ['active', 'suspended'] } }).session(session);
    if (current) {
      if (String(sub.replacesSubscriptionId) !== String(current._id)) throw fail(409, 'Another paid package is active. Review this request before approval.');
      if (current.status === 'suspended') throw fail(409, 'Resume or close the stopped package before approving its upgrade.');
      if (current.reserved > 0) throw fail(409, 'Certificates are still processing. Retry upgrade approval once issuance finishes.');
      current.status = 'expired';
      current.endsAt = new Date(Math.min(current.endsAt.getTime(), Date.now()));
      current.lastStatusChange = { at: new Date(), actorId, reason: 'Replaced by approved package upgrade' };
      await current.save({ session });
      await audit({ instituteId: sub.instituteId, subscriptionId: current._id, actorId, event: 'package_upgraded', details: { replacementSubscriptionId: sub._id } }, session);
    }
    const trial = await Subscription.findOne({ instituteId: sub.instituteId, status: { $in: ['trial', 'trial_suspended'] } }).session(session);
    if (trial) {
      if (trial.reserved > 0) throw fail(409, 'Trial certificates are still processing. Retry approval once issuance finishes.');
      trial.status = 'expired';
      if (trial.endsAt > new Date()) trial.endsAt = new Date();
      await trial.save({ session });
      await audit({ instituteId: sub.instituteId, subscriptionId: trial._id, actorId, event: 'trial_upgraded' }, session);
    }
    const startsAt = new Date();
    sub.set({ status: 'active', activation: 'manual', startsAt, endsAt: annualExpiry(startsAt), allocated: sub.snapshot.limits.certificates });
    sub.paymentProof.status = 'approved'; sub.paymentProof.reviewedAt = startsAt; sub.paymentProof.reviewedBy = actorId;
    await sub.save({ session });
    const institute = await User.findById(sub.instituteId).select('instituteName email').session(session);
    const approver = await User.findById(actorId).select('firstName lastName adminName superAdminName email').session(session);
    const [approvedPayment] = await Payment.create([{ instituteId: sub.instituteId, subscriptionId, reference, packageReference: sub.snapshot.name, amountMinor, recordedBy: actorId,
      receiptSnapshot: { instituteName: institute.instituteName, instituteEmail: institute.email, packageName: sub.snapshot.name,
        startsAt, endsAt: sub.endsAt, payerName: sub.paymentProof.payerName, transferredAt: sub.paymentProof.paidAt,
        approvedByName: approver?.superAdminName || approver?.adminName || [approver?.firstName, approver?.lastName].filter(Boolean).join(' ') || 'Super admin',
        approvedByEmail: approver?.email }
    }], { session });
    await PaymentInvoiceEmail.create([{ paymentId: approvedPayment._id, instituteId: sub.instituteId,
      recipient: institute.email, packageName: sub.snapshot.name }], { session });
    await UsageTransaction.create([{ instituteId: sub.instituteId, subscriptionId, key: 'initial-allocation', event: 'credit_allocated', units: sub.allocated }], { session });
    await audit({ instituteId: sub.instituteId, subscriptionId, actorId, event: 'manual_payment_activated', details: { amountMinor, reference } }, session);
    await Notification.create([{ recipient: sub.instituteId, type: 'system_alert', title: 'Payment approved',
      message: `Your ${sub.snapshot.name} package is now active for 12 months.`, data: { subscriptionId } }], { session });
    return sub;
  });
}
async function setStatus(subscriptionId, actorId, status, reason) {
  if (!['suspended', 'active', 'cancelled', 'expired'].includes(status) || typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 500) throw fail(400, 'Valid status and reason required.');
  return transaction(async session => {
    const sub = await Subscription.findById(subscriptionId).session(session);
    if (!sub) throw fail(404, 'Subscription not found.');
    const allowed = (status === 'suspended' && ['active', 'trial'].includes(sub.status) && sub.endsAt > new Date()) ||
      (status === 'active' && ['suspended', 'trial_suspended'].includes(sub.status) && sub.endsAt > new Date()) ||
      (status === 'cancelled' && sub.status === 'pending') ||
      (status === 'expired' && ['active', 'trial', 'trial_suspended', 'suspended'].includes(sub.status) && sub.endsAt <= new Date() && sub.reserved === 0);
    if (!allowed) throw fail(409, 'This status transition is not allowed.');
    if (status === 'expired') { await expireSubscription(sub, session, actorId); return sub; }
    sub.status = sub.activation === 'trial' && status === 'suspended' ? 'trial_suspended' : sub.activation === 'trial' && status === 'active' ? 'trial' : status;
    sub.lastStatusChange = { at: new Date(), actorId, reason: reason.trim() };
    await sub.save({ session });
    await audit({ instituteId: sub.instituteId, subscriptionId, actorId, event: `subscription_${status}`, details: { reason: reason.trim() } }, session);
    await Notification.create([{ recipient: sub.instituteId, type: 'system_alert', title: status === 'suspended' ? 'Package stopped by administrator' : status === 'active' ? 'Package resumed' : 'Package request cancelled',
      message: reason.trim(), data: { subscriptionId } }], { session });
    return sub;
  });
}
async function reserveCredit(op, session) {
  if (!enabled()) { op.subscriptionId = undefined; return; }
  const sub = await Subscription.findOneAndUpdate({ ...activeFilter(op.instituteId),
    $expr: { $lt: [{ $add: ['$consumed', '$reserved'] }, '$allocated'] }
  }, { $inc: { reserved: 1 } }, { new: true, session });
  if (!sub) throw fail(402, 'No active subscription with available certificate credits.');
  op.subscriptionId = sub._id;
  await UsageTransaction.create([{ instituteId: op.instituteId, subscriptionId: sub._id, operationId: op._id,
    attempt: op.attempt, key: `${op._id}:${op.attempt}:reserved`, event: 'credit_reserved', units: 1 }], { session });
}
async function settleCredit(op, consume, session) {
  if (!op.subscriptionId) return;
  const key = `${op._id}:${op.attempt}:settled`;
  if (await UsageTransaction.exists({ subscriptionId: op.subscriptionId, key }).session(session)) return;
  const updated = await Subscription.updateOne({ _id: op.subscriptionId, instituteId: op.instituteId, reserved: { $gte: 1 },
    ...(consume ? activeFilter(op.instituteId) : {})
  }, { $inc: { reserved: -1, ...(consume ? { consumed: 1 } : {}) } }, { session });
  if (updated.modifiedCount !== 1) throw fail(402, 'Subscription expired, suspended or reservation unavailable.');
  await UsageTransaction.create([{ instituteId: op.instituteId, subscriptionId: op.subscriptionId, operationId: op._id,
    attempt: op.attempt, key, event: consume ? 'credit_consumed' : 'credit_released', units: 1 }], { session });
}
async function saveLimitedResource(document, kind) {
  if (!enabled()) return document.save();
  const original = document.toObject();
  return transaction(async session => {
    // Recreate from the original input on retries so password hooks never rehash a hash.
    const candidate = new document.constructor(original);
    // Writing the subscription serializes competing inserts, including across app instances.
    const sub = await Subscription.findOneAndUpdate(activeFilter(document.instituteId), { $inc: { entitlementVersion: 1 } }, { new: true, session });
    if (!sub) throw fail(402, 'An active subscription is required.');
    const filter = { instituteId: document.instituteId, ...(kind === 'teachers' ? { userType: 'teacher' } : {}) };
    if (await document.constructor.countDocuments(filter).session(session) >= sub.snapshot.limits[kind]) throw fail(402, `Your plan's ${kind} limit has been reached.`);
    await candidate.save({ session });
    candidate.$session(null);
    return candidate;
  });
}
async function recoverExpiredCredits(instituteId, session) {
  const Operation = require('../models/CertificateIssuance');
  const Lock = require('../models/IssuanceLock');
  const IssuanceEvent = require('../models/IssuanceEvent');
  const expired = await Operation.find({ instituteId, subscriptionId: { $exists: true }, state: 'reserved', leaseUntil: { $lte: new Date() } }).limit(100).session(session);
  for (const op of expired) {
    const changed = await Operation.updateOne({ _id: op._id, attempt: op.attempt, state: 'reserved' }, { $set: { state: 'released' } }, { session });
    if (changed.modifiedCount !== 1) continue;
    await settleCredit(op, false, session);
    await Lock.deleteOne({ operationId: op._id, attempt: op.attempt }, { session });
    await IssuanceEvent.create([{ instituteId, operationId: op._id, actorId: op.actorId, attempt: op.attempt, event: 'released' }], { session });
  }
}
module.exports = { enabled, TRIAL_DAYS, TRIAL_LIMITS, trialTerms, createRegistrationTrial, requireActiveSubscription, requirePlanFeature, requestSubscription, activateManual, setStatus,
  reserveCredit, settleCredit, saveLimitedResource, recoverExpiredCredits, annualExpiry, transaction, audit };
