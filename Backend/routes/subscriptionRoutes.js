const express = require('express');
const mongoose = require('mongoose');
const { authenticateToken, authorizeInstitute, authorizeSuperAdmin } = require('../middleware/authMiddleware');
const { Plan, Subscription, UsageTransaction, Payment, SubscriptionEvent } = require('../models/Saas');
const service = require('../services/subscriptionService');
const manualPayment = require('../services/manualPaymentService');
const multer = require('multer');
const receiptUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, fieldSize: 200 } }).single('receipt');
const User = require('../models/User');
const Template = require('../models/CertificateTemplate');
const router = express.Router();
router.use((_req, res, next) => service.enabled() ? next() : res.status(404).json({ success: false, message: 'Subscriptions are not enabled.' }));
const handler = work => async (req, res) => {
  try { res.json({ success: true, data: await work(req) }); }
  catch (error) {
    const status = error.status || (error.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(error.name) ? 400 : 500);
    res.status(status).json({ success: false, message: error.status ? error.message : status === 409 ? 'Conflicting request or payment reference. Refresh and retry.' : status === 400 ? 'Invalid subscription details.' : 'Subscription operation failed.' });
  }
};
router.param('id', (req, res, next, id) => mongoose.isObjectIdOrHexString(id) ? next() : res.status(400).json({ success: false, message: 'Invalid ID.' }));
router.get('/plans', handler(() => Plan.find({ active: true }).sort({ displayOrder: 1, _id: 1 })));
router.use(authenticateToken);
router.get('/bank-details', authorizeInstitute, handler(() => manualPayment.bankDetails()));
router.post('/:id/payment-proof', authorizeInstitute, (req, res, next) => receiptUpload(req, res, error => {
  if (error) return res.status(400).json({ success: false, message: 'Upload one JPEG or PNG receipt up to 5 MB and a transaction number.' });
  next();
}), handler(req => manualPayment.submitProof(req.userId, req.params.id, req.body.transactionNumber, req.file)));
router.get('/:id/receipt', async (req, res) => {
  if (!['superadmin', 'institute'].includes(req.userType)) return res.sendStatus(403);
  try {
    const sub = await Subscription.findOne({ _id: req.params.id, ...(req.userType === 'institute' ? { instituteId: req.userId } : {}) }).select('+paymentProof.receipt');
    if (!sub?.paymentProof?.receipt) return res.sendStatus(404);
    res.set({ 'Content-Type': 'image/jpeg', 'Content-Disposition': 'attachment; filename="payment-receipt.jpg"', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    res.send(sub.paymentProof.receipt);
  } catch { res.sendStatus(500); }
});
router.get('/mine', authorizeInstitute, handler(async req => {
  const subscriptions = await Subscription.find({ instituteId: req.userId }).sort({ createdAt: -1 }).limit(50).lean();
  return { subscriptions: subscriptions.map(sub => ({ ...sub, effectiveStatus: sub.status === 'active' && sub.endsAt <= new Date() ? 'expired' : sub.status,
    remaining: sub.status === 'active' && sub.startsAt <= new Date() && sub.endsAt > new Date() ? Math.max(0, sub.allocated - sub.consumed - sub.reserved) : 0 })),
  teachers: await User.countDocuments({ instituteId: req.userId, userType: 'teacher' }),
  templates: await Template.countDocuments({ instituteId: req.userId }),
  payments: await Payment.find({ instituteId: req.userId }).sort({ paidAt: -1 }).limit(50),
  usage: await UsageTransaction.find({ instituteId: req.userId }).sort({ createdAt: -1 }).limit(100) };
}));
router.post('/requests', authorizeInstitute, handler(req => service.requestSubscription(req.userId, req.body.planId, req.get('Idempotency-Key'))));
router.use('/admin', authorizeSuperAdmin);
router.get('/admin/plans', handler(() => Plan.find({}).sort({ displayOrder: 1 })));
router.post('/admin/plans/bootstrap', handler(req => service.transaction(async session => {
  if (await Plan.exists({}).session(session)) throw Object.assign(new Error('The plan catalogue already exists.'), { status: 409 });
  const rows = [['Starter', 1490000, 100, 2, 2], ['Professional', 2990000, 500, 5, 5], ['Business', 4990000, 1500, 15, 10]];
  const plans = await Plan.create(rows.map(([name, priceMinor, certificates, teachers, templates], displayOrder) => ({
    name, priceMinor, limits: { certificates, teachers, templates }, active: true, displayOrder,
    recommended: name === 'Professional', features: { bulkCertificateIssue: true, secureSharing: true }
  })), { session, ordered: true });
  await service.audit({ actorId: req.userId, event: 'draft_catalogue_initialized', details: plans.map(plan => plan.toObject()) }, session);
  return plans;
})));
function planInput(body) {
  const keys = ['name', 'priceMinor', 'limits', 'features', 'active', 'displayOrder', 'recommended'];
  if (!body || Object.keys(body).some(key => !keys.includes(key)) || typeof body.name !== 'string' || !Number.isSafeInteger(body.priceMinor) || body.priceMinor < 0 ||
      !body.limits || ['certificates', 'teachers', 'templates'].some(key => !Number.isSafeInteger(body.limits[key]) || body.limits[key] < (key === 'certificates' ? 1 : 0)) ||
      Object.keys(body.limits).some(key => !['certificates', 'teachers', 'templates'].includes(key)) ||
      ['active', 'recommended'].some(key => body[key] !== undefined && typeof body[key] !== 'boolean') ||
      (body.displayOrder !== undefined && !Number.isSafeInteger(body.displayOrder)) ||
      (body.features !== undefined && (!body.features || Object.entries(body.features).some(([key, value]) => !['bulkCertificateIssue', 'secureSharing'].includes(key) || typeof value !== 'boolean')))) {
    throw Object.assign(new Error('Valid plan name, integer prices/limits and boolean features required.'), { status: 400 });
  }
  return Object.fromEntries(keys.filter(key => body[key] !== undefined).map(key => [key, body[key]]));
}
router.post('/admin/plans', handler(req => service.transaction(async session => {
  const [plan] = await Plan.create([planInput(req.body)], { session });
  await service.audit({ actorId: req.userId, planId: plan._id, event: 'plan_created', details: plan.toObject() }, session);
  return plan;
})));
router.put('/admin/plans/:id', handler(req => service.transaction(async session => {
  const before = await Plan.findById(req.params.id).session(session);
  if (!before) throw Object.assign(new Error('Plan not found.'), { status: 404 });
  const plan = await Plan.findByIdAndUpdate(req.params.id, { $set: planInput(req.body) }, { new: true, runValidators: true, session });
  await service.audit({ actorId: req.userId, planId: plan._id, event: 'plan_edited', details: { before: before.toObject(), after: plan.toObject() } }, session);
  return plan;
})));
router.get('/admin/subscriptions', handler(() => Subscription.find({}).sort({ createdAt: -1 }).limit(200).populate('instituteId', 'instituteName email')));
router.post('/admin/subscriptions/:id/activate', handler(req => service.activateManual(req.params.id, req.userId, req.body)));
router.post('/admin/subscriptions/:id/reject-receipt', handler(req => manualPayment.rejectProof(req.params.id, req.userId, req.body.reason, req.body.receiptVersion)));
router.post('/admin/subscriptions/:id/status', handler(req => service.setStatus(req.params.id, req.userId, req.body.status, req.body.reason)));
router.get('/admin/events', handler(() => SubscriptionEvent.find({}).sort({ createdAt: -1 }).limit(200)));
module.exports = router;
