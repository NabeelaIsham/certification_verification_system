// Run inside the deployed backend container. This sends no emails and changes no
// database records; SMTP verify proves connectivity/authentication, not delivery.
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const { validateProductionConfig } = require('../config/production');
const { createTransporter } = require('../utils/emailService');
const { loadModels } = require('../config/database');
const { checkHttpsRouting, checkRecentBackup } = require('../utils/deploymentChecks');
const { getTextLkConfiguration } = require('../utils/smsConfiguration');

async function run() {
  const checks = [];
  async function check(name, work) {
    try { checks.push({ name, status: 'passed', evidence: await work() }); }
    catch { checks.push({ name, status: 'failed' }); }
  }
  await check('production-configuration', async () => {
    if (process.env.NODE_ENV !== 'production' || !validateProductionConfig().valid) throw new Error('configuration');
    return 'Required environment variables and production constraints are valid; values are not logged.';
  });
  if (checks[0].status !== 'passed') {
    console.log(JSON.stringify({ checks }, null, 2)); process.exitCode = 1; return;
  }
  loadModels();
  await check('database-topology', async () => {
    await mongoose.connect(process.env.MONGODB_URI, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000 });
    const topology = await mongoose.connection.db.admin().command({ hello: 1 });
    if (!topology.setName && topology.msg !== 'isdbgrid') throw new Error('transactions');
    return 'Database connection and replica-set/sharded topology confirmed.';
  });
  await check('https-routing', () => checkHttpsRouting(process.env.FRONTEND_URL, process.env.PUBLIC_DOMAIN_ALIASES));
  await check('uploads-disk', async () => {
    const uploads = path.resolve(__dirname, '../uploads');
    await fs.access(uploads, fs.constants.R_OK | fs.constants.W_OK);
    const disk = await fs.statfs(uploads);
    const availablePercent = Math.floor(100 * disk.bavail / disk.blocks);
    if (availablePercent < Number(process.env.MIN_FREE_DISK_PERCENT || 15)) throw new Error('low disk');
    return { availablePercent, note: 'Container-recreation persistence requires the separate storage probe.' };
  });
  await check('recent-database-backup', () => checkRecentBackup(
    path.resolve(process.env.BACKUP_DIRECTORY || path.join(__dirname, '../backups'))
  ));
  await check('smtp-authentication', async () => {
    if (mongoose.connection.readyState !== 1) throw new Error('database');
    const transport = await createTransporter();
    try { await transport.verify(); } finally { transport.close(); }
    return 'SMTP authentication passed; inbox delivery has not been tested.';
  });
  await check('outbound-delivery-mode', async () => {
    if (process.env.OUTBOUND_DELIVERY_MODE !== 'live') throw new Error('delivery disabled');
    return 'Live outbound delivery is explicitly enabled.';
  });
  await check('sms-configuration', async () => {
    getTextLkConfiguration();
    return 'SMS configuration is present and structurally valid; provider acceptance and handset delivery are unverified. Run npm run check:sms for safe configuration diagnostics.';
  });
  const unverified = ['Atlas VPS-only network access', 'container recreation storage persistence', 'email inbox delivery', 'scheduled backup execution', 'backup restore drill', 'monitoring alert delivery', 'credential rotation', 'published Git history cleanup', 'deployed tenant isolation and subscription credits'];
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), checks, unverified }, null, 2));
  if (checks.some(check => check.status === 'failed')) process.exitCode = 1;
}

if (require.main === module) run().catch(() => { console.error('Deployment checks failed; no credentials were logged.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { run };
