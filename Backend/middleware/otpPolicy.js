const OTP = require('../models/OTP');
const { getPolicy } = require('../utils/settingsPolicy');

const enforceOtpPolicy = (mode) => async (req, res, next) => {
  try {
    if (typeof req.body.email !== 'string') return next();
    const policy = await getPolicy('verification');
    const email = req.body.email.toLowerCase().trim();
    const types = mode.includes('reset') ? ['reset_password'] : ['email', 'phone'];
    const filter = { email, type: { $in: types } };
    const record = await OTP.findOne(filter).sort({ createdAt: -1 });
    if (mode.startsWith('send')) {
      if (record && !policy.allowResendOtp) return res.status(403).json({ success: false, message: 'Resending OTP codes is disabled.' });
      if (record && Date.now() - new Date(record.createdAt).getTime() < policy.resendCooldown * 1000) {
        return res.status(429).json({ success: false, message: `Please wait ${policy.resendCooldown} seconds between code requests.` });
      }
      if (mode === 'send-account' && !policy.allowResendOtp) return res.status(403).json({ success: false, message: 'Resending OTP codes is disabled.' });
    } else if (record) {
      const expiresAt = record.expiresAt || new Date(new Date(record.createdAt).getTime() + 300000);
      if (new Date(expiresAt) <= new Date()) return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
      const attempted = await OTP.findOneAndUpdate({ _id: record._id, $or: [{ attempts: { $lt: policy.maxOtpAttempts } }, { attempts: { $exists: false } }] }, { $inc: { attempts: 1 } }, { new: true });
      if (!attempted) return res.status(429).json({ success: false, message: 'OTP attempt limit reached. Please request a new code.' });
    }
    next();
  } catch (error) { res.status(500).json({ success: false, message: 'Unable to check verification settings.' }); }
};
module.exports = { enforceOtpPolicy };
