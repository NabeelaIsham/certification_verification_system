const ranges = {
  verification: { otpExpiry: [1, 30], maxOtpAttempts: [1, 10], resendCooldown: [30, 300] },
  certificate: { defaultValidity: [30, 3650], maxFileSize: [1, 50] },
  email: { smtpPort: [1, 65535] }
};
module.exports = (updates) => {
  for (const [section, fields] of Object.entries(ranges)) {
    if (updates[section] !== undefined && (!updates[section] || typeof updates[section] !== 'object' || Array.isArray(updates[section]))) return `Invalid ${section} settings.`;
    for (const [key, [min, max]] of Object.entries(fields)) {
      const value = updates[section]?.[key];
      if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) return `${key} must be an integer from ${min} to ${max}.`;
    }
  }
  for (const [section, keys] of Object.entries({ verification: ['allowResendOtp'], certificate: ['allowRevocation'], security: ['twoFactorAuth'] })) {
    for (const key of keys) if (updates[section]?.[key] !== undefined && typeof updates[section][key] !== 'boolean') return `${key} must be true or false.`;
  }
  const formats = updates.certificate?.allowedFormats;
  if (formats !== undefined && (!Array.isArray(formats) || !formats.length || formats.some(f => !['PNG', 'JPEG', 'JPG'].includes(f)))) return 'Choose at least one supported template image format: PNG, JPEG, JPG.';
  for (const key of ['smtpServer', 'smtpUsername', 'smtpPassword', 'fromEmail', 'fromName']) {
    if (updates.email?.[key] !== undefined && typeof updates.email[key] !== 'string') return `${key} must be text.`;
  }
  if (updates.email?.fromEmail && !require('./validators').isValidEmail(updates.email.fromEmail)) return 'Enter a valid sender email address.';
  return null;
};
