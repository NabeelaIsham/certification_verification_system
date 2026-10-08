const PDFDocument = require('pdfkit');
const { Payment, Subscription } = require('../models/Saas');
const User = require('../models/User');

const dateTime = value => value ? new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Colombo', timeZoneName: 'short' }) : 'Not recorded';
async function paymentReceipt(paymentId, userId, userType) {
  const payment = await Payment.findOne({ _id: paymentId, ...(userType === 'institute' ? { instituteId: userId } : {}) }).lean();
  if (!payment) throw Object.assign(new Error('Approved payment not found.'), { status: 404 });
  const sub = await Subscription.findById(payment.subscriptionId).lean();
  const institute = await User.findById(payment.instituteId).select('instituteName email').lean();
  const snapshot = payment.receiptSnapshot || {};
  const number = `CVX-${String(payment._id).toUpperCase()}`;
  const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `CERTIVERXIA Payment Receipt ${number}`, Author: 'CERTIVERXIA' } });
  const buffer = new Promise((resolve, reject) => {
    const chunks = []; doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
  });
  doc.fillColor('#1464FF').fontSize(25).text('CERTIVERXIA');
  doc.fillColor('#64748B').fontSize(10).text("Mary's Road, Colombo | 078 789 6876 | info@certiverxia.com");
  doc.moveDown(2).fillColor('#071A4D').fontSize(22).text('Payment receipt');
  doc.fontSize(10).text(number).moveDown();
  const row = (label, value) => { doc.fillColor('#64748B').fontSize(10).text(label); doc.fillColor('#071A4D').fontSize(12).text(String(value || 'Not recorded'), { width: 495 }); doc.moveDown(.6); };
  row('Issued to', snapshot.instituteName || institute?.instituteName || String(payment.instituteId));
  row('Account email', snapshot.instituteEmail || institute?.email);
  row('Package', snapshot.packageName || payment.packageReference || sub?.snapshot.name);
  row('Amount received', `${payment.currency} ${(payment.amountMinor / 100).toFixed(2)}`);
  row('Payment method / bank transaction', `Bank transfer / ${payment.reference}`);
  row('Payment submitted by', snapshot.payerName || sub?.paymentProof?.payerName);
  row('Transfer date', dateTime(snapshot.transferredAt || sub?.paymentProof?.paidAt));
  row('Approved on', dateTime(payment.paidAt));
  row('Approved by', [snapshot.approvedByName || 'Super admin', snapshot.approvedByEmail].filter(Boolean).join(' - '));
  row('Subscription term', `${dateTime(snapshot.startsAt || sub?.startsAt)} to ${dateTime(snapshot.endsAt || sub?.endsAt)}`);
  doc.moveDown().fontSize(10).fillColor('#64748B').text('This receipt acknowledges the bank payment verified and approved by CERTIVERXIA. It remains available after the package expires or is stopped.');
  doc.end();
  return { number, buffer: await buffer };
}
module.exports = { paymentReceipt };
