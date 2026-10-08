const crypto = require('crypto');
const mongoose = require('mongoose');
const { Subscription, SubscriptionEvent, SubscriptionExpiryEmail, PaymentInvoiceEmail } = require('../models/Saas');
const { paymentReceipt } = require('./paymentReceiptService');
const User = require('../models/User');
const Notification = require('../models/Notification');
const email = require('../utils/emailService');

const expirable = ['active', 'trial', 'trial_suspended', 'suspended'];
function effectiveStatus(sub, now = new Date()) {
  if (expirable.includes(sub.status) && sub.endsAt <= now) return 'expired';
  return sub.status === 'trial_suspended' ? 'suspended' : sub.status;
}

// The state transition and durable email job commit together. Sending happens outside the transaction.
async function expireSubscription(sub, session, actorId = sub.instituteId, now = new Date()) {
  if (!expirable.includes(sub.status) || !sub.endsAt || sub.endsAt > now) return false;
  sub.status = 'expired';
  sub.lastStatusChange = { at: now, actorId, reason: 'Package term expired' };
  await sub.save({ session });
  await SubscriptionEvent.create([{ instituteId: sub.instituteId, subscriptionId: sub._id,
    actorId, event: 'subscription_expired', details: { expiredAt: sub.endsAt } }], { session });
  await Notification.create([{ recipient: sub.instituteId, type: 'system_alert', title: 'Your package has expired',
    message: `${sub.snapshot.name} has expired. Renew to continue using package features.`, data: { subscriptionId: sub._id } }], { session });
  const user = await User.findById(sub.instituteId).select('email').session(session);
  if (user?.email) await SubscriptionExpiryEmail.updateOne({ subscriptionId: sub._id }, { $setOnInsert: {
    instituteId: sub.instituteId, recipient: user.email, packageName: sub.snapshot.name, expiredAt: sub.endsAt, nextAttemptAt: now
  } }, { upsert: true, session });
  return true;
}

async function processEmailJobs(Model, deliver, { limit = 25, now = new Date() } = {}) {
  let sent = 0, failed = 0;
  for (let i = 0; i < limit; i++) {
    const claimToken = crypto.randomUUID();
    const job = await Model.findOneAndUpdate({ $or: [
      { status: { $in: ['pending', 'failed'] }, nextAttemptAt: { $lte: now } },
      { status: 'sending', leaseUntil: { $lte: now } }
    ] }, { $set: { status: 'sending', claimToken, leaseUntil: new Date(now.getTime() + 10 * 60000) },
      $inc: { attempts: 1 } }, { new: true, sort: { nextAttemptAt: 1 } });
    if (!job) break;
    try {
      await deliver(job);
      await Model.updateOne({ _id: job._id, claimToken }, {
        $set: { status: 'sent', sentAt: new Date() }, $unset: { leaseUntil: 1, claimToken: 1, lastError: 1 }
      });
      sent++;
    } catch {
      // Do not retain SMTP responses, which may contain addresses or credentials.
      const delay = Math.min(6 * 3600000, 60000 * 2 ** Math.min(job.attempts, 9));
      await Model.updateOne({ _id: job._id, claimToken }, {
        $set: { status: 'failed', lastError: 'Email delivery failed; check SMTP and outbound delivery settings.',
          nextAttemptAt: new Date(now.getTime() + delay) }, $unset: { leaseUntil: 1, claimToken: 1 }
      });
      failed++;
    }
  }
  return { sent, failed };
}

const processExpiryEmails = options => processEmailJobs(SubscriptionExpiryEmail, job =>
  email.sendSubscriptionExpiredEmail({ to: job.recipient, packageName: job.packageName,
    expiredAt: job.expiredAt, subscriptionId: job.subscriptionId }), options);

const processInvoiceEmails = options => processEmailJobs(PaymentInvoiceEmail, async job => {
  const invoice = await paymentReceipt(job.paymentId, job.instituteId, 'institute');
  await email.sendPaidInvoiceEmail({ to: job.recipient, packageName: job.packageName,
    number: invoice.number, buffer: invoice.buffer });
}, options);

async function runExpiryCycle({ limit = 100, now = new Date() } = {}) {
  if (process.env.SAAS_ENABLED !== 'true') return { expired: 0, sent: 0, failed: 0 };
  const rows = await Subscription.find({ status: { $in: expirable }, endsAt: { $lte: now } })
    .select('_id').sort({ endsAt: 1 }).limit(limit).lean();
  let expired = 0;
  for (const row of rows) {
    const changed = await mongoose.connection.transaction(async session => {
      const sub = await Subscription.findById(row._id).session(session);
      return sub ? expireSubscription(sub, session, sub.instituteId, now) : false;
    });
    if (changed) expired++;
  }
  return { expired, ...await processExpiryEmails({ now }) };
}

function startExpiryWorker() {
  if (process.env.SAAS_ENABLED !== 'true') return async () => {};
  let running = null;
  const tick = () => {
    if (!running) running = Promise.all([runExpiryCycle(), processInvoiceEmails()]).catch(error => console.error('Subscription email cycle failed:', error.name))
      .finally(() => { running = null; });
  };
  const interval = setInterval(tick, 60000);
  interval.unref(); tick();
  return async () => { clearInterval(interval); if (running) await running; };
}

module.exports = { effectiveStatus, expireSubscription, processExpiryEmails, processInvoiceEmails, runExpiryCycle, startExpiryWorker };
