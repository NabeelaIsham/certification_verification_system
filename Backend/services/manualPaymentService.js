const sharp = require('sharp');
const crypto = require('crypto');
const { Subscription } = require('../models/Saas');
const service = require('./subscriptionService');
const fail = (status, message) => Object.assign(new Error(message), { status });

function bankDetails(env = process.env) {
  const bank = {
    bankName: env.PAYMENT_BANK_NAME?.trim(), accountHolder: env.PAYMENT_ACCOUNT_HOLDER?.trim(),
    accountNumber: env.PAYMENT_ACCOUNT_NUMBER?.trim(), branch: env.PAYMENT_BANK_BRANCH?.trim()
  };
  return Object.values(bank).every(Boolean) ? bank : null;
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

async function submitProof(instituteId, subscriptionId, transactionNumber, file) {
  if (!bankDetails()) throw fail(409, 'Bank payment details are not configured. Contact support before paying.');
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
      submittedAt: new Date(), receiptVersion: crypto.randomUUID(), receiptType: 'image/jpeg', receipt };
    await sub.save({ session });
    await service.audit({ actorId: instituteId, instituteId, subscriptionId, event: 'payment_receipt_submitted', details: { transactionNumber, packageReference: sub.snapshot.name } }, session);
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
    return sub;
  });
}
module.exports = { bankDetails, receiptImage, submitProof, rejectProof };
