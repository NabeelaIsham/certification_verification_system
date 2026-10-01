const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const { assertProductionConfig } = require('../config/production');
const { connectDatabase, loadModels } = require('../config/database');
const { validateSigningKeyMaterial } = require('../utils/credentialService');
const { auditDeploymentData } = require('../utils/deploymentDataAudit');

const run = async () => {
  if (process.env.NODE_ENV !== 'production') throw new Error('Preflight requires NODE_ENV=production.');
  assertProductionConfig();
  console.log('Production environment configuration: valid');

  loadModels();
  await connectDatabase({ autoCreate: false, autoIndex: false });
  await mongoose.connection.db.admin().ping();
  console.log('MongoDB connection: healthy');
  const topology = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!topology.setName && topology.msg !== 'isdbgrid') {
    throw new Error('Certificate issuance requires a MongoDB replica set or Atlas with transaction support.');
  }
  console.log('MongoDB transaction topology: supported');

  const uploadsDir = path.resolve(__dirname, '../uploads');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.accessSync(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
  console.log(`Uploads directory: writable (${uploadsDir})`);

  const User = mongoose.model('User');
  const institutes = await User.find({
    userType: 'institute',
    'credentialSigning.keyId': { $exists: true }
  }).select('+credentialSigning.encryptedPrivateKey');

  let invalidKeys = 0;
  for (const institute of institutes) {
    if (!validateSigningKeyMaterial(institute.credentialSigning)) {
      invalidKeys += 1;
      console.error(`Signing key validation failed for institute ${institute._id}`);
    }
  }
  const dataIssues = await auditDeploymentData(mongoose.connection.db);
  console.log(`Deployment data audit: ${JSON.stringify(dataIssues)}`);
  if (invalidKeys > 0 || Object.values(dataIssues).some(count => count > 0)) {
    throw new Error(`Deployment blocked: ${invalidKeys} invalid signing key(s); resolve the reported data issues before deployment.`);
  }
  console.log(`Institute signing keys: ${institutes.length} checked`);
  console.log('Production preflight: PASSED');
};

run()
  .catch((error) => {
    console.error(`Production preflight: FAILED\n${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close(false).catch(() => {});
  });
