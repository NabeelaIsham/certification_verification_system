const mongoose = require('mongoose');

const loadModels = () => {
  require('../models/User');
  require('../models/Notification');
  require('../models/Course');
  require('../models/Student');
  require('../models/CertificateTemplate');
  require('../models/Certificate');
  require('../models/Settings');
  require('../models/OTP');
  require('../models/ActivityLog');
};

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/certverify';

  await mongoose.connect(mongoUri);
  console.log('MongoDB connected successfully');

  return mongoose.connection;
};

const ensureCollections = async () => {
  const modelNames = [
    'User',
    'Notification',
    'Course',
    'Student',
    'CertificateTemplate',
    'Certificate',
    'Settings',
    'OTP',
    'ActivityLog'
  ];

  for (const modelName of modelNames) {
    const Model = mongoose.model(modelName);
    try {
      await Model.createCollection();
      if (typeof Model.cleanLegacyIndexes === 'function') {
        await Model.cleanLegacyIndexes();
      }
      if (typeof Model.cleanIndexes === 'function') {
        await Model.cleanIndexes();
      }
      await Model.syncIndexes();
      console.log(`Collection ready: ${Model.collection.name}`);
    } catch (error) {
      console.error(`Failed to prepare collection ${modelName}:`, error.message);
      throw error;
    }
  }
};

const seedSuperAdmin = async () => {
  const User = mongoose.model('User');
  const {
    SUPERADMIN_EMAIL,
    SUPERADMIN_PASSWORD,
    SUPERADMIN_NAME = 'System Administrator'
  } = process.env;

  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    console.warn('SUPERADMIN_EMAIL or SUPERADMIN_PASSWORD is missing; skipping superadmin seed.');
    return;
  }

  const email = SUPERADMIN_EMAIL.toLowerCase();
  const existing = await User.findOne({ email, userType: 'superadmin' });

  if (existing) {
    existing.superAdminName = existing.superAdminName || SUPERADMIN_NAME;
    existing.isActive = true;
    existing.isEmailVerified = true;
    existing.isVerifiedByAdmin = true;
    existing.status = 'approved';
    await existing.save();
    console.log(`Superadmin ready: ${email}`);
    return;
  }

  await User.create({
    email,
    password: SUPERADMIN_PASSWORD,
    userType: 'superadmin',
    superAdminName: SUPERADMIN_NAME,
    isActive: true,
    isEmailVerified: true,
    isVerifiedByAdmin: true,
    status: 'approved'
  });

  console.log(`Superadmin created: ${email}`);
};

const seedSettings = async () => {
  const Settings = mongoose.model('Settings');
  const {
    EMAIL_HOST,
    EMAIL_PORT,
    EMAIL_USER,
    EMAIL_PASS,
    EMAIL_FROM_NAME = 'Verify Awards'
  } = process.env;

  let settings = await Settings.findOne();

  if (!settings) {
    settings = new Settings();
  }

  if (EMAIL_HOST) settings.email.smtpServer = EMAIL_HOST;
  if (EMAIL_PORT) settings.email.smtpPort = Number(EMAIL_PORT);
  if (EMAIL_USER) {
    settings.email.smtpUsername = EMAIL_USER;
    settings.email.fromEmail = EMAIL_USER;
  }
  if (EMAIL_PASS) settings.email.smtpPassword = EMAIL_PASS;
  if (EMAIL_FROM_NAME) settings.email.fromName = EMAIL_FROM_NAME;

  await settings.save();
  console.log('Settings ready');
};

const initializeDatabase = async () => {
  loadModels();
  await connectDatabase();
  await ensureCollections();
  await seedSettings();
  await seedSuperAdmin();
};

module.exports = {
  connectDatabase,
  ensureCollections,
  initializeDatabase,
  loadModels
};
