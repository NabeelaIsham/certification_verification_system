const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { requireDatabaseUri } = require('../config/databaseUri');

function portablePath(value, instituteId, folder, backendRoot) {
  if (typeof value !== 'string' || !/^[a-f\d]{24}$/i.test(String(instituteId))) throw new Error('Invalid file reference');
  const normalized = value.replace(/\\/g, '/');
  const marker = `uploads/${folder}/${instituteId}/`;
  const index = normalized.lastIndexOf(marker);
  if (index < 0 || (index > 0 && normalized[index - 1] !== '/')) throw new Error('File is outside its tenant');
  const relative = normalized.slice(index);
  if (relative.split('/').some(segment => !segment || segment === '..' || segment === '.')) throw new Error('Unsafe file reference');
  const absolute = path.resolve(backendRoot, relative);
  const root = fs.realpathSync(backendRoot);
  const expected = path.resolve(root, relative);
  if (fs.realpathSync(absolute) !== expected || !fs.statSync(absolute).isFile()) throw new Error('Missing or linked file');
  return relative;
}

async function planFilePaths(db, backendRoot = path.resolve(__dirname, '..')) {
  const changes = [];
  let blocked = 0;
  const check = (collection, document, field, folder) => {
    const value = field.split('.').reduce((item, key) => item?.[key], document);
    if (!value) return;
    try {
      const replacement = portablePath(value, document.instituteId, folder, backendRoot);
      if (value !== replacement) changes.push({ collection, id: document._id, field, before: value, after: replacement });
    } catch { blocked++; }
  };
  for (const certificate of await db.collection('certificates').find({}).toArray()) {
    check('certificates', certificate, 'generatedCertificateImage', 'generated');
    check('certificates', certificate, 'qrCodeImage', 'qrcodes');
  }
  for (const template of await db.collection('certificatetemplates').find({}).toArray()) {
    check('certificatetemplates', template, 'templateImage', 'templates');
    (template.imageFields || []).forEach((_, index) => check('certificatetemplates', template, `imageFields.${index}.imagePath`, 'template-assets'));
  }
  return { changes, blocked };
}

async function applyFilePaths(connection, plan) {
  if (!/^certverify_staging(?:_[a-z0-9_]+)?$/.test(connection.db.databaseName)) throw new Error('Only dedicated staging databases may be changed');
  if (plan.blocked) throw new Error('Resolve all blocked file references before applying');
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      for (const change of plan.changes) {
        const result = await connection.db.collection(change.collection).updateOne(
          { _id: change.id, [change.field]: change.before },
          { $set: { [change.field]: change.after } }, { session }
        );
        if (result.modifiedCount !== 1) throw new Error('Record changed after planning; no changes committed');
      }
    });
  } finally { await session.endSession(); }
}

async function main() {
  require('dotenv').config({ quiet: true });
  const args = process.argv.slice(2);
  if (args.some(arg => !['--apply', '--dry-run'].includes(arg)) || args.length > 1) throw new Error('Use --dry-run or --apply');
  const apply = args.includes('--apply');
  const uri = requireDatabaseUri(apply
    ? { MONGODB_URI: process.env.STAGING_MONGODB_URI, DEPLOYMENT_ENV: 'staging' }
    : { MONGODB_URI: process.env.STAGING_MONGODB_URI || process.env.MONGODB_URI });
  await mongoose.connect(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000 });
  const plan = await planFilePaths(mongoose.connection.db);
  // Do not print paths, connection strings or certificate identifiers.
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', proposedChanges: plan.changes.length, blocked: plan.blocked }));
  if (apply) {
    await applyFilePaths(mongoose.connection, plan);
    console.log(JSON.stringify({ applied: plan.changes.length }));
  }
  if (plan.blocked) process.exitCode = 1;
}

if (require.main === module) {
  main().catch(() => {
    console.error('File migration failed. Check the selected database, restored files and permissions; no credentials are logged.');
    process.exitCode = 1;
  }).finally(() => mongoose.disconnect());
}
module.exports = { portablePath, planFilePaths, applyFilePaths };
