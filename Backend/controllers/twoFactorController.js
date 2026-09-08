const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const LoginChallenge = require('../models/LoginChallenge');
const { getPolicy } = require('../utils/settingsPolicy');
const { sendOtpEmail } = require('../utils/emailService');

const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
const hashCode = (token, code) => crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${token}:${code}`).digest('hex');

const beginTwoFactor = async (user, res, purpose = 'login') => {
  const policy = await getPolicy('verification');
  const recent = await LoginChallenge.findOne({ userId: user._id });
  if (recent && new Date(recent.expiresAt) > new Date() && !policy.allowResendOtp) return res.status(403).json({ success: false, message: 'Use the code already sent. Resending is disabled.' });
  if (recent && Date.now() - new Date(recent.createdAt).getTime() < policy.resendCooldown * 1000) return res.status(429).json({ success: false, message: `Please wait ${policy.resendCooldown} seconds before requesting another login code.` });
  const challengeToken = crypto.randomBytes(32).toString('hex');
  const otp = crypto.randomInt(100000, 1000000).toString();
  const challenge = await LoginChallenge.findOneAndUpdate({ userId: user._id }, {
    tokenHash: hash(challengeToken), codeHash: hashCode(challengeToken, otp), attempts: 0,
    purpose,
    createdAt: new Date(), expiresAt: new Date(Date.now() + policy.otpExpiry * 60000)
  }, { upsert: true, new: true });
  try {
    await sendOtpEmail({ to: user.email, otp, purpose: 'login' });
  } catch (error) {
    await LoginChallenge.deleteOne({ _id: challenge._id, tokenHash: hash(challengeToken) });
    return res.status(503).json({ success: false, message: 'Unable to send your login code. Please try again or check email settings.' });
  }
  return res.json({ success: true, requiresTwoFactor: true, challengeToken, message: `A login code was sent to your email. It expires in ${policy.otpExpiry} minutes.`, verification: policy });
};

const verifyTwoFactor = async (req, res) => {
  const { challengeToken, otp } = req.body;
  if (typeof challengeToken !== 'string' || !/^[a-f0-9]{64}$/.test(challengeToken) || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: 'Enter the 6-digit login code.' });
  }
  try {
    const policy = await getPolicy('verification');
    const challenge = await LoginChallenge.findOneAndUpdate({
      tokenHash: hash(challengeToken), expiresAt: { $gt: new Date() }, attempts: { $lt: policy.maxOtpAttempts }
    }, { $inc: { attempts: 1 } }, { new: true });
    if (!challenge) return res.status(401).json({ success: false, message: 'Login code expired or attempt limit reached. Sign in again.' });
    if (!crypto.timingSafeEqual(Buffer.from(challenge.codeHash, 'hex'), Buffer.from(hashCode(challengeToken, otp), 'hex'))) {
      return res.status(401).json({ success: false, message: 'Invalid login code.' });
    }
    const user = await User.findById(challenge.userId);
    if (!user || !['superadmin', 'institute', 'teacher'].includes(user.userType) || !user.isActive || (user.userType === 'institute' && (!user.isVerifiedByAdmin || (!user.isEmailVerified && !user.isPhoneVerified)))) {
      return res.status(403).json({ success: false, message: 'Account is unavailable.' });
    }
    const consumed = await LoginChallenge.findOneAndDelete({ _id: challenge._id, tokenHash: hash(challengeToken), expiresAt: { $gt: new Date() } });
    if (!consumed) return res.status(401).json({ success: false, message: 'Login code already used or expired. Sign in again.' });
    if (challenge.purpose === 'enable') {
      user.twoFactorEnabled = true;
      await user.save();
    }
    const token = jwt.sign({ userId: user._id, email: user.email, userType: user.userType, twoFactorVerified: true }, process.env.JWT_SECRET, { expiresIn: '24h' });
    const fields = ['instituteName', 'adminName', 'logo', 'isEmailVerified', 'isPhoneVerified', 'isVerifiedByAdmin', 'status', 'firstName', 'lastName', 'employeeId', 'department', 'designation', 'permissions', 'instituteId', 'assignedCourses'];
    const userData = { id: user._id, email: user.email, userType: user.userType, isActive: user.isActive, twoFactorEnabled: user.twoFactorEnabled, adminName: user.superAdminName || user.adminName };
    for (const field of fields) if (user[field] !== undefined) userData[field] = user[field];
    return res.json({ success: true, token, user: userData });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unable to verify login code. Please try again.' });
  }
};

const updateTwoFactor = async (req, res) => {
  try {
    if (!['institute', 'teacher'].includes(req.user.userType)) return res.status(403).json({ success: false, message: 'Use system security settings for super admin 2FA.' });
    const { enabled, password } = req.body;
    if (typeof enabled !== 'boolean' || typeof password !== 'string' || !password) return res.status(400).json({ success: false, message: 'Current password and 2FA preference are required.' });
    if (!await req.user.comparePassword(password)) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    if (enabled) return await beginTwoFactor(req.user, res, 'enable');
    req.user.twoFactorEnabled = false;
    await req.user.save();
    await LoginChallenge.deleteOne({ userId: req.userId });
    return res.json({ success: true, message: 'Two-factor authentication disabled.' });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unable to update two-factor authentication.' }); }
};
module.exports = { beginTwoFactor, verifyTwoFactor, updateTwoFactor };
