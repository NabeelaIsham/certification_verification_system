const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('../models/User');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const {
  SUPERADMIN_EMAIL,
  SUPERADMIN_PASSWORD,
  SUPERADMIN_NAME = 'System Administrator'
} = process.env;

const setupSuperAdmin = async () => {
  if (!SUPERADMIN_EMAIL || !SUPERADMIN_PASSWORD) {
    throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD are required.');
  }

  await mongoose.connect(require('../config/databaseUri').requireDatabaseUri());

  const existing = await User.findOne({
    email: SUPERADMIN_EMAIL.toLowerCase(),
    userType: 'superadmin'
  });

  if (existing) {
    existing.superAdminName = SUPERADMIN_NAME;
    existing.password = SUPERADMIN_PASSWORD;
    existing.isActive = true;
    existing.isEmailVerified = true;
    existing.isVerifiedByAdmin = true;
    existing.status = 'approved';
    existing.sessionVersion = (existing.sessionVersion || 0) + 1;
    await existing.save();
    console.log(`Super admin already exists and was updated with a fresh password: ${existing.email}`);
    return;
  }

  const superAdmin = await User.create({
    email: SUPERADMIN_EMAIL.toLowerCase(),
    password: SUPERADMIN_PASSWORD,
    userType: 'superadmin',
    superAdminName: SUPERADMIN_NAME,
    isActive: true,
    isEmailVerified: true,
    isVerifiedByAdmin: true,
    status: 'approved'
  });

  console.log(`Super admin created: ${superAdmin.email}`);
};

setupSuperAdmin()
  .catch((error) => {
    console.error('Failed to set up super admin. Check database access, account role and protected configuration.', error.name);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
