const crypto = require('crypto');

const otpSecret = () => process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;

const hashOtp = (email, type, otp) => {
  if (!otpSecret()) throw new Error('OTP_HASH_SECRET or JWT_SECRET must be configured.');
  return crypto
    .createHmac('sha256', otpSecret())
    .update(`${String(email).toLowerCase().trim()}:${type}:${String(otp).trim()}`)
    .digest('hex');
};

module.exports = { hashOtp };
