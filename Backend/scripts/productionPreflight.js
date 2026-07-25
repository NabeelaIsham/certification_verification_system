const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const { assertProductionConfig } = require('../config/production');
const { connectDatabase, loadModels } = require('../config/database');
const { validateSigningKeyMaterial } = require('../utils/credentialService');

const run = async () => {
  assertProductionConfig();
  console.log('Production environment configuration: valid');

  loadModels();
  await connectDatabase();
  await mongoose.connection.db.admin().ping();
  console.log('MongoDB connection: healthy');

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
  if (invalidKeys > 0) {
    throw new Error(`${invalidKeys} institute signing key(s) cannot be decrypted or do not match their public key`);
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
