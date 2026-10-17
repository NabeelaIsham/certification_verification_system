jest.mock('../../Backend/utils/emailService', () => ({ sendSubscriptionExpiredEmail: jest.fn(), sendPaidInvoiceEmail: jest.fn() }));
process.env.NODE_ENV = 'test';
process.env.SAAS_ENABLED = 'true';
process.env.JWT_SECRET = 'subscription-lifecycle-integration-secret';
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const express = require('express');
const request = require('supertest');
const User = require('../../Backend/models/User');
const Notification = require('../../Backend/models/Notification');
const { Plan, Subscription, Payment, SubscriptionExpiryEmail, SubscriptionEvent, PaymentInvoiceEmail } = require('../../Backend/models/Saas');
const service = require('../../Backend/services/subscriptionService');
const lifecycle = require('../../Backend/services/subscriptionLifecycleService');
const analytics = require('../../Backend/services/subscriberAnalyticsService');
const email = require('../../Backend/utils/emailService');
const { signAccessToken } = require('../../Backend/config/jwt');
const app = express(); app.use(express.json()); app.use('/subscriptions', require('../../Backend/routes/subscriptionRoutes'));
let replset, institute, other, admin, plan;
const id = () => new mongoose.Types.ObjectId();
const auth = user => ({ Authorization: `Bearer ${signAccessToken(user)}` });
const now = new Date('2026-10-08T10:00:00Z');
async function subscription(overrides = {}) {
  return Subscription.create({ instituteId: institute._id, planId: plan._id, requestKey: String(id()), status: 'active', activation: 'manual',
    snapshot: { name: plan.name, priceMinor: plan.priceMinor, currency: 'LKR', limits: plan.limits.toObject(), features: plan.features.toObject() },
    startsAt: new Date('2026-09-01'), endsAt: new Date('2026-10-01'), allocated: 100, ...overrides });
}
beforeAll(async () => {
  replset = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(replset.getUri(), { dbName: 'subscription_lifecycle_tests' });
  for (const model of Object.values(mongoose.models)) await model.init();
}, 300000);
beforeEach(async () => {
  jest.clearAllMocks(); email.sendSubscriptionExpiredEmail.mockResolvedValue({ messageId: 'test-only' });
  for (const model of Object.values(mongoose.models)) await model.deleteMany({});
  institute = { _id: id(), userType: 'institute', instituteName: 'First Institute', email: 'first@example.com', isActive: true, isVerifiedByAdmin: true };
  other = { ...institute, _id: id(), instituteName: 'Other Institute', email: 'other@example.com' };
  admin = { _id: id(), userType: 'superadmin', email: 'admin@example.com', firstName: 'Test', lastName: 'Admin', isActive: true };
  await User.collection.insertMany([institute, other, admin]);
  plan = await Plan.create({ name: 'Starter', priceMinor: 1490050, active: true, limits: { certificates: 100, teachers: 2, templates: 2 } });
});
afterAll(async () => { await mongoose.disconnect(); await replset?.stop(); });

test('paid upgrade preserves access during review, switches atomically, and queues one paid invoice', async () => {
  const old = await subscription({ endsAt: new Date(Date.now() + 86400000), consumed: 12 });
  const higher = await Plan.create({ name: 'Professional', priceMinor: plan.priceMinor * 2, active: true,
    limits: { certificates: 500, teachers: 5, templates: 5 } });
  await expect(service.requestSubscription(institute._id, plan._id, String(id()))).rejects.toMatchObject({ status: 409 });
  const upgrade = await service.requestSubscription(institute._id, higher._id, String(id()));
  expect(String(upgrade.replacesSubscriptionId)).toBe(String(old._id));
  expect(String((await service.requireActiveSubscription(institute._id))._id)).toBe(String(old._id));
  expect(await PaymentInvoiceEmail.countDocuments()).toBe(0);
  upgrade.paymentProof = { status: 'submitted', transactionNumber: 'UPGRADE-123', receiptVersion: 'upgrade-proof' };
  await upgrade.save();
  const approve = () => service.activateManual(upgrade._id, admin._id, { reference: 'UPGRADE-123', amountMinor: higher.priceMinor, receiptVersion: 'upgrade-proof' });
  await Subscription.updateOne({ _id: old._id }, { $set: { reserved: 1 } });
  await expect(approve()).rejects.toMatchObject({ status: 409 });
  expect(await PaymentInvoiceEmail.countDocuments()).toBe(0);
  await Subscription.updateOne({ _id: old._id }, { $set: { reserved: 0 } });
  await approve(); await approve();
  expect((await Subscription.findById(old._id)).status).toBe('expired');
  const active = await service.requireActiveSubscription(institute._id);
  expect(String(active._id)).toBe(String(upgrade._id)); expect(active.allocated).toBe(500); expect(active.consumed).toBe(0);
  expect(await Payment.countDocuments()).toBe(1); expect(await PaymentInvoiceEmail.countDocuments()).toBe(1);
  expect(await SubscriptionExpiryEmail.countDocuments()).toBe(0);
  email.sendPaidInvoiceEmail.mockRejectedValueOnce(new Error('SMTP failed')).mockResolvedValue({ messageId: 'invoice-test' });
  expect(await lifecycle.processInvoiceEmails()).toEqual({ sent: 0, failed: 1 });
  expect((await service.requireActiveSubscription(institute._id)).status).toBe('active');
  const job = await PaymentInvoiceEmail.findOne();
  await Promise.all([lifecycle.processInvoiceEmails({ now: job.nextAttemptAt }), lifecycle.processInvoiceEmails({ now: job.nextAttemptAt })]);
  expect(email.sendPaidInvoiceEmail).toHaveBeenCalledTimes(2);
  expect(email.sendPaidInvoiceEmail).toHaveBeenLastCalledWith(expect.objectContaining({ to: institute.email, packageName: 'Professional', buffer: expect.any(Buffer) }));
  expect((await PaymentInvoiceEmail.findOne()).status).toBe('sent');
});

test('legacy combined uniqueness index is safely replaced without losing the active package', async () => {
  const old = await subscription({ endsAt: new Date(Date.now() + 86400000) });
  await Subscription.collection.createIndex({ instituteId: 1 }, { name: 'instituteId_1', unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'active', 'suspended'] } } });
  await Subscription.cleanLegacyIndexes();
  const indexes = await Subscription.collection.indexes();
  expect(indexes.map(index => index.name)).toEqual(expect.arrayContaining(['one_current_paid_package', 'one_pending_package']));
  expect(indexes.some(index => index.name === 'instituteId_1')).toBe(false);
  await subscription({ status: 'pending' });
  await expect(subscription({ status: 'pending' })).rejects.toMatchObject({ code: 11000 });
  await expect(subscription({ status: 'active' })).rejects.toMatchObject({ code: 11000 });
  expect((await Subscription.findById(old._id)).status).toBe('active');
});

test('upgrade cancellation preserves the current package and suspension cannot be bypassed', async () => {
  const old = await subscription({ endsAt: new Date(Date.now() + 86400000) });
  const higher = await Plan.create({ name: 'Professional', priceMinor: plan.priceMinor * 2, active: true,
    limits: { certificates: 500, teachers: 5, templates: 5 } });
  const fewer = await Plan.create({ name: 'Fewer limits', priceMinor: plan.priceMinor * 3, active: true,
    limits: { certificates: 50, teachers: 5, templates: 5 } });
  await expect(service.requestSubscription(institute._id, fewer._id, String(id()))).rejects.toMatchObject({ status: 409 });
  const cancelled = await service.requestSubscription(institute._id, higher._id, String(id()));
  await service.setStatus(cancelled._id, admin._id, 'cancelled', 'User changed their mind');
  expect(String((await service.requireActiveSubscription(institute._id))._id)).toBe(String(old._id));
  const upgrade = await service.requestSubscription(institute._id, higher._id, String(id()));
  upgrade.paymentProof = { status: 'submitted', transactionNumber: 'STOPPED-123', receiptVersion: 'stopped-proof' };
  await upgrade.save();
  await service.setStatus(old._id, admin._id, 'suspended', 'Account review required');
  await expect(service.activateManual(upgrade._id, admin._id, { reference: 'STOPPED-123', amountMinor: higher.priceMinor, receiptVersion: 'stopped-proof' })).rejects.toMatchObject({ status: 409 });
  expect(await Payment.countDocuments()).toBe(0); expect(await PaymentInvoiceEmail.countDocuments()).toBe(0);
  await expect(service.requireActiveSubscription(institute._id)).rejects.toMatchObject({ status: 402 });
});

test('expiry blocks access before the worker runs and durably emails exactly once during normal retries', async () => {
  const sub = await subscription();
  await expect(service.requireActiveSubscription(institute._id)).rejects.toMatchObject({ status: 402 });
  expect(await lifecycle.runExpiryCycle({ now })).toEqual({ expired: 1, sent: 1, failed: 0 });
  expect((await Subscription.findById(sub._id)).status).toBe('expired');
  expect(email.sendSubscriptionExpiredEmail).toHaveBeenCalledWith(expect.objectContaining({ to: institute.email, packageName: 'Starter' }));
  expect(await lifecycle.runExpiryCycle({ now })).toEqual({ expired: 0, sent: 0, failed: 0 });
  expect(await SubscriptionExpiryEmail.countDocuments({ subscriptionId: sub._id })).toBe(1);
  expect(await Notification.countDocuments({ recipient: institute._id, title: 'Your package has expired' })).toBe(1);
  expect(await SubscriptionEvent.countDocuments({ subscriptionId: sub._id, event: 'subscription_expired' })).toBe(1);
  expect(email.sendSubscriptionExpiredEmail).toHaveBeenCalledTimes(1);
});
test('SMTP failure preserves the expiry and retries only when due', async () => {
  await subscription(); email.sendSubscriptionExpiredEmail.mockRejectedValueOnce(new Error('SMTP unavailable'));
  expect(await lifecycle.runExpiryCycle({ now })).toMatchObject({ expired: 1, failed: 1 });
  const job = await SubscriptionExpiryEmail.findOne();
  expect(job.status).toBe('failed'); expect(job.nextAttemptAt > now).toBe(true);
  await expect(service.requireActiveSubscription(institute._id)).rejects.toMatchObject({ status: 402 });
  expect(await lifecycle.processExpiryEmails({ now })).toEqual({ sent: 0, failed: 0 });
  expect(await lifecycle.processExpiryEmails({ now: job.nextAttemptAt })).toEqual({ sent: 1, failed: 0 });
});
test('competing workers cannot deliver the same queued notice concurrently', async () => {
  const sub = await subscription();
  await mongoose.connection.transaction(session => lifecycle.expireSubscription(sub, session, institute._id, now));
  await Promise.all([lifecycle.processExpiryEmails({ now }), lifecycle.processExpiryEmails({ now })]);
  expect(email.sendSubscriptionExpiredEmail).toHaveBeenCalledTimes(1);
});
test('an abandoned sending lease is recovered, while unexpired leases are left alone', async () => {
  const sub = await subscription();
  await SubscriptionExpiryEmail.create({ subscriptionId: sub._id, instituteId: institute._id, recipient: institute.email,
    packageName: 'Starter', expiredAt: sub.endsAt, status: 'sending', leaseUntil: new Date(now.getTime() + 1000) });
  expect(await lifecycle.processExpiryEmails({ now })).toEqual({ sent: 0, failed: 0 });
  expect(await lifecycle.processExpiryEmails({ now: new Date(now.getTime() + 1001) })).toEqual({ sent: 1, failed: 0 });
});
test('trial and suspended paid packages expire, but a trial ended by upgrade sends no false expiry', async () => {
  await subscription({ status: 'trial', activation: 'trial' });
  await subscription({ instituteId: other._id, status: 'suspended' });
  await subscription({ instituteId: admin._id, status: 'expired', activation: 'trial' });
  expect(await lifecycle.runExpiryCycle({ now })).toEqual({ expired: 2, sent: 2, failed: 0 });
});
test('only the super admin can stop/resume a trial even with a pending paid upgrade', async () => {
  const trial = await subscription({ status: 'trial', activation: 'trial', endsAt: new Date(Date.now() + 86400000) });
  await subscription({ status: 'pending', endsAt: undefined, allocated: 0 });
  const url = `/subscriptions/admin/subscriptions/${trial._id}/status`;
  expect((await request(app).post(url).set(auth(institute)).send({ status: 'suspended', reason: 'Review required' })).status).toBe(403);
  expect((await request(app).post(url).set(auth(admin)).send({ status: 'suspended', reason: 'Review required' })).status).toBe(200);
  expect((await Subscription.findById(trial._id)).status).toBe('trial_suspended');
  await expect(service.requireActiveSubscription(institute._id)).rejects.toMatchObject({ status: 402 });
  const response = await request(app).post(url).set(auth(admin)).send({ status: 'active', reason: 'Review completed' });
  expect(response.status).toBe(200); expect(response.body.data.status).toBe('trial');
  expect(String((await service.requireActiveSubscription(institute._id))._id)).toBe(String(trial._id));
});
test('approved receipt is private, survives expiry, and keeps the original approval snapshot', async () => {
  const sub = await subscription({ status: 'pending', allocated: 0, paymentProof: { status: 'submitted', transactionNumber: 'BANK-123', receiptVersion: 'proof-1', payerName: 'First Payer' } });
  await service.activateManual(sub._id, admin._id, { reference: 'BANK-123', amountMinor: plan.priceMinor, receiptVersion: 'proof-1' });
  const payment = await Payment.findOne({ subscriptionId: sub._id });
  expect(payment.receiptSnapshot.instituteName).toBe('First Institute');
  expect(payment.receiptSnapshot.approvedByEmail).toBe(admin.email);
  await User.updateOne({ _id: institute._id }, { $set: { instituteName: 'Changed Later' } });
  await Subscription.updateOne({ _id: sub._id }, { $set: { status: 'expired' } });
  const url = `/subscriptions/payments/${payment._id}/receipt`;
  expect((await request(app).get(url)).status).toBe(401);
  expect((await request(app).get(url).set(auth(other))).status).toBe(404);
  for (const user of [institute, admin]) {
    const response = await request(app).get(url).set(auth(user));
    expect(response.status).toBe(200); expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.body.subarray(0, 4).toString()).toBe('%PDF');
    expect(response.headers['content-disposition']).toContain(String(payment._id).toUpperCase());
  }
  expect((await Payment.findById(payment._id)).receiptSnapshot.instituteName).toBe('First Institute');
});
test('global analytics use effective expiry and paginate all records without exposing receipt bytes', async () => {
  await subscription({ consumed: 20 });
  await subscription({ instituteId: other._id, status: 'trial', activation: 'trial', endsAt: new Date('2026-10-10'), consumed: 7, paymentProof: { receipt: Buffer.from('private') } });
  await Payment.create({ instituteId: institute._id, subscriptionId: id(), reference: 'ANALYTICS-PAYMENT', amountMinor: 1490050, recordedBy: admin._id, paidAt: now });
  const summary = await analytics.subscriberAnalytics(now);
  expect(summary.totals).toMatchObject({ institutes: 2, packages: 2, consumed: 27, revenueMinor: 1490050, approvedPayments: 1, expiringSoon: 1 });
  expect(summary.statuses).toMatchObject({ expired: 1, trial: 1 });
  expect(summary.months).toHaveLength(12);
  const results = await analytics.listSubscribers({ search: 'Other', status: 'trial', pageSize: 1 }, now);
  expect(results.total).toBe(1); expect(results.items).toHaveLength(1); expect(results.items[0].paymentProof?.receipt).toBeUndefined();
  expect((await analytics.listSubscribers({ page: 2, pageSize: 1 }, now)).items).toHaveLength(1);
  expect((await request(app).get('/subscriptions/admin/analytics').set(auth(institute))).status).toBe(403);
  expect((await request(app).get('/subscriptions/admin/subscribers?page=0').set(auth(admin))).status).toBe(400);
});
