const Settings = require('../models/Settings');
const defaults = {
  verification: { otpExpiry: 5, maxOtpAttempts: 3, allowResendOtp: true, resendCooldown: 60 },
  certificate: { defaultValidity: 365, allowRevocation: true, maxFileSize: 5, allowedFormats: ['PNG', 'JPEG', 'JPG'] }
};
const getPolicy = async (section) => {
  const settings = await Settings.findOne();
  const values = settings?.[section]?.toObject?.() || settings?.[section] || {};
  return { ...defaults[section], ...values };
};
module.exports = { getPolicy };
