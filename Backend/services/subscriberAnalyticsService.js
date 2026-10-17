const { Subscription, Payment } = require('../models/Saas');

const statusExpression = now => ({ $switch: { branches: [
  { case: { $and: [{ $in: ['$status', ['active', 'trial', 'suspended', 'trial_suspended']] }, { $lte: ['$endsAt', now] }] }, then: 'expired' },
  { case: { $eq: ['$status', 'trial_suspended'] }, then: 'suspended' }
], default: '$status' } });

async function subscriberAnalytics(now = new Date()) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
  const [subscriptions, payments] = await Promise.all([
    Subscription.aggregate([
      { $set: { effectiveStatus: statusExpression(now) } },
      { $facet: {
        statuses: [{ $group: { _id: '$effectiveStatus', count: { $sum: 1 } } }],
        totals: [{ $group: { _id: null, packages: { $sum: 1 }, institutes: { $addToSet: '$instituteId' }, consumed: { $sum: '$consumed' },
          activeCredits: { $sum: { $cond: [{ $in: ['$effectiveStatus', ['active', 'trial']] }, { $max: [0, { $subtract: ['$allocated', { $add: ['$consumed', '$reserved'] }] }] }, 0] } },
          expiringSoon: { $sum: { $cond: [{ $and: [{ $in: ['$effectiveStatus', ['active', 'trial']] }, { $lte: ['$endsAt', new Date(now.getTime() + 7 * 86400000)] }] }, 1, 0] } },
          pendingReview: { $sum: { $cond: [{ $and: [{ $eq: ['$status', 'pending'] }, { $eq: ['$paymentProof.status', 'submitted'] }] }, 1, 0] } }
        } }, { $project: { _id: 0, packages: 1, institutes: { $size: '$institutes' }, consumed: 1, activeCredits: 1, expiringSoon: 1, pendingReview: 1 } }],
        plans: [{ $group: { _id: '$snapshot.name', subscriptions: { $sum: 1 },
          active: { $sum: { $cond: [{ $in: ['$effectiveStatus', ['active', 'trial']] }, 1, 0] } }, consumed: { $sum: '$consumed' } } }, { $sort: { subscriptions: -1 } }]
      } }
    ]),
    Payment.aggregate([{ $facet: {
      totals: [{ $group: { _id: null, revenueMinor: { $sum: '$amountMinor' }, approvedPayments: { $sum: 1 } } }],
      months: [{ $match: { paidAt: { $gte: monthStart, $lte: now } } }, { $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$paidAt', timezone: 'UTC' } }, revenueMinor: { $sum: '$amountMinor' }, payments: { $sum: 1 }
      } }, { $sort: { _id: 1 } }]
    } }])
  ]);
  const data = subscriptions[0], revenue = payments[0];
  return { asOf: now, totals: { packages: 0, institutes: 0, consumed: 0, activeCredits: 0, expiringSoon: 0, pendingReview: 0,
    revenueMinor: 0, approvedPayments: 0, ...data.totals[0], ...revenue.totals[0] },
    statuses: Object.fromEntries(data.statuses.map(row => [row._id, row.count])), plans: data.plans,
    months: Array.from({ length: 12 }, (_, i) => {
      const month = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + i, 1)).toISOString().slice(0, 7);
      return revenue.months.find(row => row._id === month) || { _id: month, revenueMinor: 0, payments: 0 };
    }) };
}

async function listSubscribers(query = {}, now = new Date()) {
  const page = Number(query.page || 1), pageSize = Number(query.pageSize || 25);
  const search = String(query.search || '').trim(), status = query.status || 'all';
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100 ||
    search.length > 100 || !['all', 'active', 'trial', 'pending', 'expired', 'suspended', 'cancelled'].includes(status)) {
    throw Object.assign(new Error('Invalid subscriber filters.'), { status: 400 });
  }
  const pipeline = [
    { $project: { 'paymentProof.receipt': 0 } },
    { $set: { effectiveStatus: statusExpression(now) } },
    ...(status !== 'all' ? [{ $match: { effectiveStatus: status } }] : []),
    { $lookup: { from: 'users', localField: 'instituteId', foreignField: '_id', pipeline: [{ $project: { instituteName: 1, email: 1 } }], as: 'institute' } },
    { $set: { institute: { $arrayElemAt: ['$institute', 0] } } },
    ...(search ? [{ $match: { $or: ['institute.instituteName', 'institute.email', 'snapshot.name'].map(key => ({ [key]: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } })) } }] : []),
    { $sort: { createdAt: -1, _id: -1 } },
    { $facet: { count: [{ $count: 'total' }], rows: [
      { $skip: (page - 1) * pageSize }, { $limit: pageSize },
      { $lookup: { from: 'payments', localField: '_id', foreignField: 'subscriptionId', pipeline: [{ $project: { amountMinor: 1, paidAt: 1 } }], as: 'payments' } },
      { $lookup: { from: 'subscriptionexpiryemails', localField: '_id', foreignField: 'subscriptionId', pipeline: [{ $project: { status: 1, attempts: 1, sentAt: 1, nextAttemptAt: 1, lastError: 1 } }], as: 'expiryEmails' } }
    ] } }
  ];
  const [result] = await Subscription.aggregate(pipeline);
  return { items: result.rows.map(row => ({ ...row, instituteId: row.institute || { _id: row.instituteId }, expiryEmail: row.expiryEmails[0] || null })),
    total: result.count[0]?.total || 0, page, pageSize };
}
module.exports = { subscriberAnalytics, listSubscribers, statusExpression };
