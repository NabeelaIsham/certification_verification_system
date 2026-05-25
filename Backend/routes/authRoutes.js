const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const Notification = require('../models/Notification');
const crypto = require('crypto');
const { sendOtpEmail } = require('../utils/emailService');

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP to Email
const sendEmailOTP = async (email, otp) => {
  try {
    await sendOtpEmail({ to: email, otp, purpose: 'verification' });
    console.log(`Email OTP sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

// Send OTP via SMS (placeholder)
const sendSMSOTP = async (phone, otp) => {
  console.log(`[SMS] Would send OTP ${otp} to ${phone}`);
  return true;
};

const isOtpExpired = (otpRecord) => {
  const now = new Date();
  const otpAge = now - otpRecord.createdAt;
  return otpAge > 5 * 60 * 1000;
};

// Register Institute
router.post('/register', async (req, res) => {
  try {
    console.log('Registration request received:', req.body);
    
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

    if (password !== confirmPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passwords do not match' 
      });
    }

    if (!agreeToTerms) {
      return res.status(400).json({
        success: false,
        message: 'You must agree to the terms and conditions'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    const user = new User({
      instituteName,
      email,
      phone,
      address,
      adminName,
      password,
      instituteType,
      studentCount,
      userType: 'institute',
      status: 'pending',
      isActive: false,
      isEmailVerified: false,
      isPhoneVerified: false,
      isVerifiedByAdmin: false
    });

    await user.save();
    console.log('User saved to database:', user.email);

    const emailOtp = generateOTP();
    console.log('Generated OTP for email:', emailOtp);

    await OTP.deleteMany({ email, type: 'email' });

    await OTP.create({
      email,
      phone: phone || '',
      otp: emailOtp,
      type: 'email'
    });

    let emailSent = false;
    try {
      await sendEmailOTP(email, emailOtp);
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send email OTP:', emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for OTP verification.',
      userId: user._id,
      email: user.email,
      nextStep: 'verify-email',
      emailSent: emailSent
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    console.log('Verify OTP request received:', req.body);
    
    const { email, otp, type = 'email' } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp: otp.toString().trim(),
      type
    });
    
    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (isOtpExpired(otpRecord)) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
        canResend: true
      });
    }

    if (type === 'email') {
      user.isEmailVerified = true;
      user.status = user.isPhoneVerified ? 'admin_approval_pending' : 'email_verified';
      await user.save();
      
      await OTP.deleteOne({ _id: otpRecord._id });

      if (user.isPhoneVerified) {
        return res.json({
          success: true,
          message: 'Email verified successfully. Your account is pending admin approval.',
          nextStep: 'pending-approval'
        });
      } else {
        const phoneOtp = generateOTP();
        
        await OTP.deleteMany({ email, type: 'phone' });
        
        await OTP.create({
          email,
          phone: user.phone,
          otp: phoneOtp,
          type: 'phone'
        });
        
        await sendSMSOTP(user.phone, phoneOtp);
        
        return res.json({
          success: true,
          message: 'Email verified successfully. Please verify your phone number.',
          nextStep: 'verify-phone'
        });
      }
    } 
    else if (type === 'phone') {
      user.isPhoneVerified = true;
      user.status = user.isEmailVerified ? 'admin_approval_pending' : 'phone_verified';
      await user.save();

      await OTP.deleteOne({ _id: otpRecord._id });

      if (user.isEmailVerified) {
        return res.json({
          success: true,
          message: 'Phone verified successfully. Your account is pending admin approval.',
          nextStep: 'pending-approval'
        });
      } else {
        return res.json({
          success: true,
          message: 'Phone verified successfully. Please verify your email.',
          nextStep: 'verify-email'
        });
      }
    }

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found for this email'
      });
    }

    const otp = generateOTP();

    await OTP.deleteMany({ email, type: 'reset_password' });
    await OTP.create({
      email,
      phone: user.phone || '',
      otp,
      type: 'reset_password'
    });

    await sendOtpEmail({ to: email, otp, purpose: 'reset_password' });

    res.json({
      success: true,
      message: 'Password reset OTP sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset OTP'
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase().trim();
    const otp = req.body.otp?.toString().trim();
    const newPassword = req.body.newPassword;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP, and new password are required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const otpRecord = await OTP.findOne({
      email,
      otp,
      type: 'reset_password'
    });

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    if (isOtpExpired(otpRecord)) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    user.password = newPassword;
    await user.save();
    await OTP.deleteMany({ email, type: 'reset_password' });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// Login - UPDATED to handle all user types including teacher
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', { email: req.body.email, userType: req.body.userType });
    
    const { email, password, userType } = req.body;

    // Find user based on userType
    let user = null;
    const query = { email: email.toLowerCase() };
    
    if (userType) {
      query.userType = userType;
    }
    
    user = await User.findOne(query);

    if (!user) {
      console.log('User not found with query:', query);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('User found:', { id: user._id, email: user.email, userType: user.userType });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for user:', user.email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check account status based on user type
    if (user.userType === 'institute') {
      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email first',
          needsEmailVerification: true
        });
      }

      if (!user.isPhoneVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your phone number',
          needsPhoneVerification: true
        });
      }

      if (!user.isVerifiedByAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval',
          pendingAdminApproval: true
        });
      }
    }

    // Check if account is active for all user types
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact administrator.'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        userType: user.userType 
      },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    // Prepare user data based on user type
    const userData = {
      id: user._id,
      email: user.email,
      userType: user.userType,
      isActive: user.isActive
    };

    // Add type-specific fields
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
      userData.adminName = user.adminName || user.superAdminName;
    }

    console.log('Login successful for:', user.email, 'as', user.userType);

    res.json({
      success: true,
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, type = 'email' } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (type === 'email' && user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    if (type === 'phone' && user.isPhoneVerified) {
      return res.status(400).json({
        success: false,
        message: 'Phone already verified'
      });
    }

    const otp = generateOTP();

    await OTP.deleteMany({ email: email.toLowerCase(), type });

    await OTP.create({
      email: email.toLowerCase(),
      phone: user.phone || '',
      otp,
      type
    });

    if (type === 'email') {
      try {
        await sendEmailOTP(email, otp);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        return res.json({
          success: true,
          message: `OTP generated but email failed to send.`,
          otp: process.env.NODE_ENV === 'development' ? otp : undefined
        });
      }
    } else {
      await sendSMSOTP(user.phone, otp);
    }

    res.json({
      success: true,
      message: `OTP resent to your ${type}`,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend OTP'
    });
  }
});

// Check Verification Status
router.get('/verification-status/:email', async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isVerifiedByAdmin: user.isVerifiedByAdmin,
        status: user.status,
        userType: user.userType,
        instituteName: user.instituteName
      }
    });

  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check verification status'
    });
  }
});

module.exports = router;
