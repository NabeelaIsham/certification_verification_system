const sharp = require('sharp');
const crypto = require('crypto');
const { Subscription, BankPaymentDetails } = require('../models/Saas');
const User = require('../models/User');
const Notification = require('../models/Notification');
const service = require('./subscriptionService');
const fail = (status, message) => Object.assign(new Error(message), { status });

async function bankDetails(env = process.env) {
  const saved = await BankPaymentDetails.findById('manual-payment').lean();
  if (saved) return saved;
  const bank = {
    bankName: env.PAYMENT_BANK_NAME?.trim(), accountHolder: env.PAYMENT_ACCOUNT_HOLDER?.trim(),
    accountNumber: env.PAYMENT_ACCOUNT_NUMBER?.trim(), branch: env.PAYMENT_BANK_BRANCH?.trim()
  };
  return Object.values(bank).every(Boolean) ? bank : null;
}

async function saveBankDetails(actorId, input) {
  const fields = { bankName: 120, accountHolder: 160, accountNumber: 60, branch: 120 };
  if (!input || Object.keys(input).some(key => !Object.hasOwn(fields, key)) ||
      Object.entries(fields).some(([key, max]) => typeof input[key] !== 'string' || !input[key].trim() || input[key].trim().length > max || [...input[key]].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) {
    throw fail(400, 'Enter valid bank name, account holder, account number and branch.');
  }
  const details = Object.fromEntries(Object.keys(fields).map(key => [key, input[key].trim()]));
  return service.transaction(async session => {
    const before = await BankPaymentDetails.findById('manual-payment').session(session).lean();
    const after = await BankPaymentDetails.findByIdAndUpdate('manual-payment', { $set: details }, { upsert: true, new: true, runValidators: true, session });
    await service.audit({ actorId, event: 'payment_bank_details_updated', details: { before, after: after.toObject() } }, session);
    return after;
  });
}

async function receiptImage(file) {
  if (!file || !['image/jpeg', 'image/png'].includes(file.mimetype) || file.size > 5 * 1024 * 1024) {
    throw fail(400, 'Upload a JPEG or PNG receipt, maximum 5 MB.');
  }
  try {
    const image = sharp(file.buffer, { limitInputPixels: 20_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (metadata.format !== (file.mimetype === 'image/jpeg' ? 'jpeg' : 'png')) throw new Error('Format mismatch');
    const buffer = await image.rotate().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
    if (buffer.length > 5 * 1024 * 1024) throw new Error('Receipt too large');
    return buffer;
  } catch { throw fail(400, 'The receipt image could not be read. Use a valid JPEG or PNG.'); }
}

async function submitProof(instituteId, subscriptionId, transactionNumber, file, information = {}) {
  const bank = await bankDetails();
  if (!bank) throw fail(409, 'Bank payment details are not configured. Contact support before paying.');
  const { payerName, paidAt, notes = '' } = information;
  if (typeof payerName !== 'string' || !payerName.trim() || payerName.length > 160 ||
      typeof paidAt !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(paidAt) || !Number.isFinite(Date.parse(paidAt)) ||
      new Date(paidAt).toISOString().slice(0, 10) !== paidAt || Date.parse(paidAt) > Date.now() + 86400000 ||
      typeof notes !== 'string' || notes.length > 500) throw fail(400, 'Enter the payer name, a valid payment date, and notes of up to 500 characters.');
  if (typeof transactionNumber !== 'string' || !/^[a-zA-Z0-9_:/-]{3,100}$/.test(transactionNumber.trim())) {
    throw fail(400, 'Enter a valid bank transaction number (3–100 characters).');
  }
  transactionNumber = transactionNumber.trim().toUpperCase();
  const receipt = await receiptImage(file);
  return service.transaction(async session => {
    const sub = await Subscription.findOne({ _id: subscriptionId, instituteId }).session(session);
    if (!sub) throw fail(404, 'Subscription not found.');
    if (sub.status !== 'pending' || ['submitted', 'approved'].includes(sub.paymentProof?.status)) throw fail(409, 'This payment is already under review or the subscription is no longer pending.');
    sub.paymentProof = { transactionNumber, packageReference: sub.snapshot.name, status: 'submitted',
      payerName: payerName.trim(), paidAt: new Date(paidAt), notes: notes.trim(), bankSnapshot: bank,
      submittedAt: new Date(), receiptVersion: crypto.randomUUID(), receiptType: 'image/jpeg', receipt };
    await sub.save({ session });
    await service.audit({ actorId: instituteId, instituteId, subscriptionId, event: 'payment_receipt_submitted', details: { transactionNumber, packageReference: sub.snapshot.name } }, session);
    const admins = await User.find({ userType: 'superadmin', isActive: true }).select('_id').session(session);
    if (admins.length) await Notification.create(admins.map(admin => ({ recipient: admin._id, type: 'system_alert',
      title: 'Payment receipt awaiting review', message: `A ${sub.snapshot.name} payment has been submitted for approval.`,
      data: { subscriptionId, instituteId } })), { session, ordered: true });
    return { status: 'submitted', packageReference: sub.snapshot.name };
  });
}

async function rejectProof(subscriptionId, actorId, reason, receiptVersion) {
  if (typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 500 || typeof receiptVersion !== 'string') throw fail(400, 'Receipt version and rejection reason are required.');
  return service.transaction(async session => {
    const sub = await Subscription.findOne({ _id: subscriptionId, status: 'pending', 'paymentProof.status': 'submitted', 'paymentProof.receiptVersion': receiptVersion }).session(session);
    if (!sub) throw fail(409, 'The receipt changed or is no longer awaiting review. Refresh first.');
    sub.paymentProof.status = 'rejected'; sub.paymentProof.rejectionReason = reason.trim();
    sub.paymentProof.reviewedAt = new Date(); sub.paymentProof.reviewedBy = actorId;
    await sub.save({ session });
    await service.audit({ actorId, instituteId: sub.instituteId, subscriptionId, event: 'payment_receipt_rejected', details: { reason: reason.trim(), receiptVersion } }, session);
    await Notification.create([{ recipient: sub.instituteId, type: 'system_alert', title: 'Payment receipt needs attention',
      message: reason.trim(), data: { subscriptionId } }], { session });
    return sub;
  });
}
module.exports = { bankDetails, saveBankDetails, receiptImage, submitProof, rejectProof };
