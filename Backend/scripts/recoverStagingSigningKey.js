const mongoose = require('mongoose');
const { randomUUID } = require('crypto');
const { rewrapSigningKey } = require('../utils/rewrapSigningKey');
const { requireDatabaseUri } = require('../config/databaseUri');
const { verifyStoredCredential } = require('../utils/credentialService');

async function recoverSigningKey(connection, { instituteId, previousSecret, nextSecret, apply = false }) {
  if (!/^certverify_staging(?:_[a-z0-9_]+)?$/.test(connection.db.databaseName)) throw new Error('Use a dedicated staging database');
  if (!mongoose.isObjectIdOrHexString(instituteId)) throw new Error('An exact institute ID is required');
  const id = new mongoose.Types.ObjectId(String(instituteId));
  const users = connection.db.collection('users');
  const institute = await users.findOne({ _id: id, userType: 'institute' });
  if (!institute?.credentialSigning) throw new Error('Institute signing key not found');
  const previous = institute.credentialSigning;
  const recovered = rewrapSigningKey(previous, previousSecret, nextSecret);
  const certificates = await connection.db.collection('certificates').find({ instituteId: id, 'credential.keyId': previous.keyId }).toArray();
  if (certificates.some(certificate => !verifyStoredCredential(certificate.credential).valid)) {
    throw new Error('Existing certificate signatures failed verification');
  }
  const result = { mode: apply ? 'apply' : 'dry-run', keyId: previous.keyId, verifiedCertificates: certificates.length, identityPreserved: true };
  if (!apply) return result;
  const session = await connection.startSession();
  try {
    await session.withTransaction(async () => {
      const updated = await users.updateOne({ _id: id, userType: 'institute', credentialSigning: previous },
        { $set: { 'credentialSigning.encryptedPrivateKey': recovered.encryptedPrivateKey } }, { session });
      if (updated.modifiedCount !== 1) throw new Error('Signing key changed after validation; recovery aborted');
      await connection.db.collection('migrationaudits').insertOne({
        migrationId: randomUUID(), operation: 'rewrap-original-signing-key', documentId: id,
        keyId: previous.keyId, before: previous.encryptedPrivateKey,
        after: recovered.encryptedPrivateKey, appliedAt: new Date()
      }, { session });
    });
  } finally { await session.endSession(); }
  return result;
}

async function main() {
  require('dotenv').config({ quiet: true });
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => !['--dry-run', '--apply'].includes(arg))) throw new Error('Use --dry-run or --apply');
  const uri = requireDatabaseUri({ MONGODB_URI: process.env.STAGING_MONGODB_URI, DEPLOYMENT_ENV: 'staging' });
  await mongoose.connect(uri, { autoCreate: false, autoIndex: false, serverSelectionTimeoutMS: 10000 });
  console.log(JSON.stringify(await recoverSigningKey(mongoose.connection, {
    instituteId: process.env.RECOVERY_INSTITUTE_ID,
    previousSecret: process.env.RECOVERY_PREVIOUS_ENCRYPTION_SECRET,
    nextSecret: process.env.CREDENTIAL_KEY_ENCRYPTION_SECRET,
    apply: args.includes('--apply')
  })));
}

if (require.main === module) {
  main().catch(() => {
    console.error('Original signing key recovery failed. Check protected configuration and recovery evidence; no secrets are logged.');
    process.exitCode = 1;
  }).finally(() => mongoose.disconnect());
}
module.exports = { recoverSigningKey };
