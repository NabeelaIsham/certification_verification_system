// Run inside the deployed backend container. This sends no emails and changes no
// database records; SMTP verify proves connectivity/authentication, not delivery.
const fs = require('fs/promises');
const path = require('path');
const mongoose = require('mongoose');
const { validateProductionConfig } = require('../config/production');
const { createTransporter } = require('../utils/emailService');
const { loadModels } = require('../config/database');

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
  await check('https-routing', async () => {
    const origin = new URL(process.env.FRONTEND_URL).origin;
    const health = await fetch(`${origin}/health`, { redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!health.ok || (await health.json()).database !== 'connected') throw new Error('health');
    const redirect = await fetch(origin.replace('https:', 'http:'), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (![301, 302, 307, 308].includes(redirect.status) || new URL(redirect.headers.get('location'), origin).protocol !== 'https:') throw new Error('redirect');
    return 'Public HTTPS backend health and HTTP-to-HTTPS redirect passed.';
  });
  await check('uploads-disk', async () => {
    const uploads = path.resolve(__dirname, '../uploads');
    await fs.access(uploads, fs.constants.R_OK | fs.constants.W_OK);
    const disk = await fs.statfs(uploads);
    const availablePercent = Math.floor(100 * disk.bavail / disk.blocks);
    if (availablePercent < Number(process.env.MIN_FREE_DISK_PERCENT || 15)) throw new Error('low disk');
    return { availablePercent, note: 'Container-recreation persistence requires the separate storage probe.' };
  });
  await check('recent-database-backup', async () => {
    const directory = path.resolve(process.env.BACKUP_DIRECTORY || path.join(__dirname, '../backups'));
    const names = (await fs.readdir(directory)).filter(name => /^certverify-.*\.archive\.gz$/.test(name));
    const archives = await Promise.all(names.map(name => fs.stat(path.join(directory, name))));
    const recent = archives.some(file => file.size > 0 && Date.now() - file.mtimeMs < 36 * 60 * 60 * 1000);
    if (!recent) throw new Error('no recent logical backup');
    return 'Nonempty logical backup newer than 36 hours exists. Atlas-managed snapshots require separate evidence.';
  });
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
  const unverified = ['Atlas VPS-only network access', 'container recreation storage persistence', 'email inbox delivery', 'scheduled backup execution', 'backup restore drill', 'monitoring alert delivery', 'credential rotation', 'published Git history cleanup', 'deployed tenant isolation and subscription credits'];
  console.log(JSON.stringify({ checkedAt: new Date().toISOString(), checks, unverified }, null, 2));
  if (checks.some(check => check.status === 'failed')) process.exitCode = 1;
}

if (require.main === module) run().catch(() => { console.error('Deployment checks failed; no credentials were logged.'); process.exitCode = 1; }).finally(() => mongoose.disconnect());
module.exports = { run };
