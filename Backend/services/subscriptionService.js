const mongoose = require('mongoose');
const User = require('../models/User');
const { Plan, Subscription, UsageTransaction, SubscriptionEvent, Payment } = require('../models/Saas');
const enabled = () => process.env.SAAS_ENABLED === 'true';
const fail = (status, message) => Object.assign(new Error(message), { status });
const transaction = work => mongoose.connection.transaction(work);
const activeFilter = instituteId => ({ instituteId, status: 'active', startsAt: { $lte: new Date() }, endsAt: { $gt: new Date() } });
const audit = (values, session) => SubscriptionEvent.create([values], { session });

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
      expired.status = 'expired'; await expired.save({ session });
      await audit({ instituteId, subscriptionId: expired._id, actorId: instituteId, event: 'subscription_expired' }, session);
    }
    if (await Subscription.exists({ instituteId, status: { $in: ['pending', 'active', 'suspended'] } }).session(session)) throw fail(409, 'An existing subscription must finish or its pending request must be cancelled first.');
    const plan = await Plan.findOne({ _id: planId, active: true }).session(session);
    if (!plan) throw fail(404, 'Plan is unavailable.');
    const [subscription] = await Subscription.create([{ instituteId, planId, requestKey, snapshot: {
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
async function activateManual(subscriptionId, actorId, { reference, amountMinor }) {
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
    if (!await User.exists({ _id: sub.instituteId, userType: 'institute', isActive: true, isVerifiedByAdmin: true }).session(session)) throw fail(403, 'Institute is unavailable.');
    const startsAt = new Date();
    sub.set({ status: 'active', activation: 'manual', startsAt, endsAt: annualExpiry(startsAt), allocated: sub.snapshot.limits.certificates });
    await sub.save({ session });
    await Payment.create([{ instituteId: sub.instituteId, subscriptionId, reference, amountMinor, recordedBy: actorId }], { session });
    await UsageTransaction.create([{ instituteId: sub.instituteId, subscriptionId, key: 'initial-allocation', event: 'credit_allocated', units: sub.allocated }], { session });
    await audit({ instituteId: sub.instituteId, subscriptionId, actorId, event: 'manual_payment_activated', details: { amountMinor, reference } }, session);
    return sub;
  });
}
async function setStatus(subscriptionId, actorId, status, reason) {
  if (!['suspended', 'active', 'cancelled', 'expired'].includes(status) || typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 500) throw fail(400, 'Valid status and reason required.');
  return transaction(async session => {
    const sub = await Subscription.findById(subscriptionId).session(session);
    if (!sub) throw fail(404, 'Subscription not found.');
    const allowed = (status === 'suspended' && sub.status === 'active') ||
      (status === 'active' && sub.status === 'suspended' && sub.endsAt > new Date()) ||
      (status === 'cancelled' && sub.status === 'pending') ||
      (status === 'expired' && ['active', 'suspended'].includes(sub.status) && sub.endsAt <= new Date() && sub.reserved === 0);
    if (!allowed) throw fail(409, 'This status transition is not allowed.');
    sub.status = status; await sub.save({ session });
    await audit({ instituteId: sub.instituteId, subscriptionId, actorId, event: `subscription_${status}`, details: { reason: reason.trim() } }, session);
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
module.exports = { enabled, requireActiveSubscription, requirePlanFeature, requestSubscription, activateManual, setStatus,
  reserveCredit, settleCredit, saveLimitedResource, recoverExpiredCredits, annualExpiry, transaction, audit };
