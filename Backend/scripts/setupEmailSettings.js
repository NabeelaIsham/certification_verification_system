const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Settings = require('../models/Settings');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const {
  MONGODB_URI = 'mongodb://localhost:27017/certverify',
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_USER,
  EMAIL_PASS,
  EMAIL_FROM_NAME = 'Verify Awards'
} = process.env;

const setupEmailSettings = async () => {
  if (!EMAIL_HOST || !EMAIL_PORT || !EMAIL_USER || !EMAIL_PASS) {
    throw new Error('EMAIL_HOST, EMAIL_PORT, EMAIL_USER, and EMAIL_PASS are required.');
  }

  await mongoose.connect(MONGODB_URI);

  let settings = await Settings.findOne();
  if (!settings) {
    settings = new Settings();
  }

  settings.email.smtpServer = EMAIL_HOST;
  settings.email.smtpPort = Number(EMAIL_PORT);
  settings.email.smtpUsername = EMAIL_USER;
  settings.email.smtpPassword = EMAIL_PASS;
  settings.email.fromEmail = EMAIL_USER;
  settings.email.fromName = EMAIL_FROM_NAME;

  await settings.save();
  console.log(`Email settings updated for ${EMAIL_USER} via ${EMAIL_HOST}:${EMAIL_PORT}`);
};

setupEmailSettings()
  .catch((error) => {
    console.error('Failed to set up email settings:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
