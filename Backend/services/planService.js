const { Plan } = require('../models/Saas');
const service = require('./subscriptionService');
const planInput = require('../validation/planInput');
const defaultPlans = require('../config/defaultPlans');

const bootstrap = (actorId) => service.transaction(async session => {
  if (await Plan.exists({}).session(session)) throw Object.assign(new Error('The plan catalogue already exists.'), { status: 409 });

  const plans = await Plan.create(defaultPlans.map(([name, priceMinor, certificates, teachers, templates], displayOrder) => ({
    name, priceMinor, limits: { certificates, teachers, templates }, active: true, displayOrder,
    recommended: name === 'Professional', features: { bulkCertificateIssue: true, secureSharing: true }
  })), { session, ordered: true });
  await service.audit({ actorId, event: 'draft_catalogue_initialized', details: plans.map(plan => plan.toObject()) }, session);
  return plans;
});

const create = (actorId, body) => service.transaction(async session => {
  const [plan] = await Plan.create([planInput(body)], { session });
  await service.audit({ actorId, planId: plan._id, event: 'plan_created', details: plan.toObject() }, session);
  return plan;
});

const update = (id, actorId, body) => service.transaction(async session => {
  const before = await Plan.findById(id).session(session);
  if (!before) throw Object.assign(new Error('Plan not found.'), { status: 404 });
  const plan = await Plan.findByIdAndUpdate(id, { $set: planInput(body) }, { new: true, runValidators: true, session });
  await service.audit({ actorId, planId: plan._id, event: 'plan_edited', details: { before: before.toObject(), after: plan.toObject() } }, session);
  return plan;
});

module.exports = { bootstrap, create, update };
