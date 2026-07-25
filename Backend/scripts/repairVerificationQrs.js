const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const { regenerateCertificateImage } = require('../controllers/certificateController');

dotenv.config();

const applyChanges = process.argv.includes('--apply');
const allSigned = process.argv.includes('--all-signed');

const invokeRegeneration = (certificate) => new Promise((resolve, reject) => {
  let statusCode = 200;
  const req = {
    userId: certificate.instituteId,
    user: { id: certificate.instituteId },
    params: { id: certificate._id.toString() }
  };
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      if (statusCode >= 400 || body?.success === false) {
        reject(new Error(`${certificate.certificateCode}: ${body?.message || `HTTP ${statusCode}`}`));
      } else {
        resolve(body);
      }
      return this;
    }
  };

  Promise.resolve(regenerateCertificateImage(req, res)).catch(reject);
});

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  await mongoose.connect(process.env.MONGODB_URI);

  const query = {
    'credential.signature': { $exists: true, $ne: '' },
    ...(allSigned ? {} : { verificationUrl: { $regex: 'credential=' } })
  };
  const certificates = await Certificate.find(query)
    .select('_id instituteId certificateCode status verificationUrl');

  console.log(
    `Found ${certificates.length} signed certificate(s) ` +
    (allSigned ? 'selected for QR regeneration.' : 'with oversized QR payloads.')
  );
  for (const certificate of certificates) {
    console.log(
      `${applyChanges ? 'Repairing' : 'Would repair'} ${certificate.certificateCode} ` +
      `(status: ${certificate.status}, URL length: ${certificate.verificationUrl?.length || 0})`
    );
    if (applyChanges) await invokeRegeneration(certificate);
  }

  if (!applyChanges && certificates.length) {
    console.log('Dry run only. Re-run with --apply to regenerate these certificates.');
  }
};

run()
  .then(() => mongoose.disconnect())
  .then(() => {
    console.log(applyChanges ? 'QR repair completed.' : 'QR repair audit completed.');
  })
  .catch(async (error) => {
    console.error('QR repair failed:', error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });
