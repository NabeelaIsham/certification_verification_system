const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendOtpEmail } = require('../utils/emailService');
const { sendOtpSms } = require('../utils/smsService');
const { isValidEmail, isValidPassword, isNonEmptyString } = require('../utils/validators');

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const sendSMSOTP = async (phone, otp) => {
  return sendOtpSms({ to: phone, otp });
};

const isOtpExpired = (otpRecord) => {
  if (!otpRecord || !otpRecord.createdAt) return true;
  const now = new Date();
  const otpAge = now - otpRecord.createdAt;
  return otpAge > 5 * 60 * 1000;
};

const registerInstitute = async (req, res) => {
  try {
    const {
      instituteName,
      email,
      phone,
      address,
      adminName,
      password,
      confirmPassword,
      instituteType,
      studentCount,
      agreeToTerms
    } = req.body;

    if (!isNonEmptyString(instituteName) || !isNonEmptyString(email) || !isNonEmptyString(address) || !isNonEmptyString(adminName) || !isNonEmptyString(password)) {
      return res.status(400).json({ success: false, message: 'All required institute fields must be provided.' });
    }

    if (!agreeToTerms) {
      return res.status(400).json({ success: false, message: 'You must agree to the terms and conditions.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const user = new User({
      instituteName: instituteName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone?.trim() || '',
      address: address.trim(),
      adminName: adminName.trim(),
      password,
      instituteType: instituteType?.trim() || 'Other',
      studentCount: Number(studentCount) || 0,
      userType: 'institute',
      status: 'pending',
      isActive: false,
      isEmailVerified: false,
      isPhoneVerified: false,
      isVerifiedByAdmin: false
    });

    await user.save();

    const accountOtp = generateOTP();
    await OTP.deleteMany({ email: user.email, type: { $in: ['email', 'phone'] } });
    await OTP.create({
      email: user.email,
      phone: user.phone,
      otp: accountOtp,
      type: 'email'
    });

    if (user.phone) {
      await OTP.create({
        email: user.email,
        phone: user.phone,
        otp: accountOtp,
        type: 'phone'
      });
    }

    let emailSent = false;
    let smsSent = false;
    try {
      await sendOtpEmail({ to: user.email, otp: accountOtp, purpose: 'verification' });
      emailSent = true;
    } catch (emailError) {
      console.warn('Warning: failed to send email OTP:', emailError.message);
    }

    if (user.phone) {
      try {
        await sendSMSOTP(user.phone, accountOtp);
        smsSent = true;
      } catch (smsError) {
        console.warn('Warning: failed to send SMS OTP:', smsError.message);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your account with the OTP sent to your email or phone.',
      userId: user._id,
      email: user.email,
      nextStep: 'verify-account',
      emailSent,
      smsSent,
      otp: process.env.NODE_ENV === 'test' ? accountOtp : undefined
    });
  } catch (error) {
    console.error('Register institute error:', error);
    return res.status(500).json({ success: false, message: 'Registration failed', error: error.message });
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { email, otp, type } = req.body;
    if (!isValidEmail(email) || !isNonEmptyString(otp)) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const otpValue = otp.toString().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const verificationTypes = ['email', 'phone'];
    const typeFilter = verificationTypes.includes(type) ? [type, ...verificationTypes.filter((item) => item !== type)] : verificationTypes;
    const otpRecord = await OTP.findOne({
      email: normalizedEmail,
      otp: otpValue,
      type: { $in: typeFilter }
    }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    if (isOtpExpired(otpRecord)) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.', canResend: true });
    }

    user.isEmailVerified = true;
    user.isPhoneVerified = Boolean(user.phone);
    user.status = 'admin_approval_pending';
    await user.save();
    await OTP.deleteMany({ email: normalizedEmail, type: { $in: verificationTypes } });

    return res.json({
      success: true,
      message: 'Account verified successfully. Your account is pending admin approval.',
      nextStep: 'pending-approval',
      verifiedBy: otpRecord.type
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'OTP verification failed', error: error.message });
  }
};

const resendOtp = async (req, res) => {
  try {
    const { email, type = 'account' } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.status === 'admin_approval_pending' || user.isEmailVerified || user.isPhoneVerified) {
      return res.status(400).json({ success: false, message: 'Account already verified.' });
    }

    const otp = generateOTP();
    await OTP.deleteMany({ email: user.email, type: { $in: ['email', 'phone'] } });

    let emailSent = false;
    let smsSent = false;

    if (type === 'email' || type === 'account') {
      await OTP.create({ email: user.email, phone: user.phone || '', otp, type: 'email' });
      try {
        await sendOtpEmail({ to: user.email, otp, purpose: 'verification' });
        emailSent = true;
      } catch (emailError) {
        console.warn('Warning: failed to resend email OTP:', emailError.message);
      }
    }

    if ((type === 'phone' || type === 'account') && user.phone) {
      await OTP.create({ email: user.email, phone: user.phone || '', otp, type: 'phone' });
      try {
        await sendSMSOTP(user.phone, otp);
        smsSent = true;
      } catch (smsError) {
        console.warn('Warning: failed to resend SMS OTP:', smsError.message);
      }
    }

    if (!emailSent && !smsSent) {
      return res.status(500).json({ success: false, message: 'Failed to resend OTP. Please check email/SMS settings.' });
    }

    return res.json({
      success: true,
      message: 'OTP resent successfully.',
      emailSent,
      smsSent,
      otp: process.env.NODE_ENV === 'test' ? otp : undefined
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({ success: false, message: 'Failed to resend OTP', error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found for this email.' });
    }

    const otp = generateOTP();
    await OTP.deleteMany({ email, type: 'reset_password' });
    await OTP.create({ email, phone: user.phone || '', otp, type: 'reset_password' });
    await sendOtpEmail({ to: email, otp, purpose: 'reset_password' });

    return res.json({ success: true, message: 'Password reset OTP sent to your email.', otp: process.env.NODE_ENV === 'test' ? otp : undefined });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send password reset OTP', error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const otp = req.body.otp?.toString().trim();
    const newPassword = req.body.newPassword;

    if (!isValidEmail(email) || !isNonEmptyString(otp) || !isValidPassword(newPassword)) {
      return res.status(400).json({ success: false, message: 'Email, OTP, and a valid new password are required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const otpRecord = await OTP.findOne({ email, otp, type: 'reset_password' });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid OTP.' });
    }

    if (isOtpExpired(otpRecord)) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    user.password = newPassword;
    await user.save();
    await OTP.deleteMany({ email, type: 'reset_password' });

    return res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password', error: error.message });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const safeUser = req.user.toObject();
    delete safeUser.password;

    res.json({ success: true, data: safeUser });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch current user', error: error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;

    if (!isValidEmail(email) || !isNonEmptyString(password)) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const query = { email: email.toLowerCase().trim() };
    if (userType) query.userType = userType;

    const user = await User.findOne(query);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (user.userType === 'institute') {
      if (!user.isEmailVerified && !user.isPhoneVerified) {
        return res.status(403).json({ success: false, message: 'Please verify your account first.', needsAccountVerification: true });
      }
      if (!user.isVerifiedByAdmin) {
        return res.status(403).json({ success: false, message: 'Your account is pending admin approval.', pendingAdminApproval: true });
      }
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Your account is not active. Please contact administrator.' });
    }

    const token = jwt.sign({ userId: user._id, email: user.email, userType: user.userType }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });

    const userData = {
      id: user._id,
      email: user.email,
      userType: user.userType,
      isActive: user.isActive
    };

    if (user.userType === 'institute') {
      userData.instituteName = user.instituteName;
      userData.adminName = user.adminName;
      userData.isEmailVerified = user.isEmailVerified;
      userData.isPhoneVerified = user.isPhoneVerified;
      userData.isVerifiedByAdmin = user.isVerifiedByAdmin;
      userData.status = user.status;
    } else if (user.userType === 'teacher') {
      userData.firstName = user.firstName;
      userData.lastName = user.lastName;
      userData.employeeId = user.employeeId;
      userData.department = user.department;
      userData.designation = user.designation;
      userData.permissions = user.permissions;
      userData.instituteId = user.instituteId;
    } else if (user.userType === 'superadmin') {
      userData.adminName = user.superAdminName || user.adminName;
    }

    return res.json({ success: true, token, user: userData });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed', error: error.message });
  }
};

const verificationStatus = async (req, res) => {
  try {
    const email = req.params.email?.toLowerCase().trim();
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: 'Valid email is required.' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({ success: true, data: {
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      isVerifiedByAdmin: user.isVerifiedByAdmin,
      status: user.status,
      userType: user.userType,
      instituteName: user.instituteName
    }});
  } catch (error) {
    console.error('Verification status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check verification status', error: error.message });
  }
};

module.exports = {
  registerInstitute,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resetPassword,
  getCurrentUser,
  login,
  verificationStatus
};
