const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const Notification = require('../models/Notification');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Test endpoint
router.post('/test-json', (req, res) => {
  console.log('Test JSON endpoint called');
  console.log('Request body:', req.body);
  console.log('Body type:', typeof req.body);
  
  res.json({
    success: true,
    receivedBody: req.body,
    bodyType: typeof req.body,
    message: 'If you see this, JSON parsing is working'
  });
});

// Configure email transporter
let transporter;
try {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('Email transporter initialized successfully');
} catch (error) {
  console.error('Email transporter initialization error:', error.message);
  transporter = null;
}

// Generate OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

// Send OTP to Email
const sendEmailOTP = async (email, otp) => {
  if (!transporter) {
    console.error('Email transporter not configured');
    throw new Error('Email service not available');
  }

  const mailOptions = {
    from: `"Certificate Verification System" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your Email - Certificate Verification System',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Email Verification</h2>
        <p>Your OTP for email verification is:</p>
        <h1 style="background: #f4f4f4; padding: 15px; text-align: center; letter-spacing: 5px; border-radius: 5px;">
          ${otp}
        </h1>
        <p>This OTP will expire in 5 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Certificate Verification System</p>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email OTP sent successfully to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

// 1. Register Institute (Simplified and Fixed)
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

    // Validation
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

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Create new user (pending verification)
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

    // Generate OTP for email verification
    const emailOtp = generateOTP();
    console.log('Generated OTP for email:', emailOtp);

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email, type: 'email' });

    // Save new OTP
    await OTP.create({
      email,
      phone: phone || '',
      otp: emailOtp,
      type: 'email'
    });

    console.log('OTP saved to database for email:', email);

    // Send OTP via email
    let emailSent = false;
    try {
      await sendEmailOTP(email, emailOtp);
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send email OTP:', emailError.message);
    }

    // For now, skip SMS until you have proper Twilio setup
    // You can manually verify phone later

    // Create notification for super admin
    try {
      const superAdmin = await User.findOne({ userType: 'superadmin' });
      if (superAdmin) {
        await Notification.create({
          recipient: superAdmin._id,
          type: 'new_institute',
          title: 'New Institute Registration',
          message: `${instituteName} has registered and is pending verification`,
          data: {
            instituteId: user._id,
            instituteName,
            adminName
          }
        });
      }
    } catch (notificationError) {
      console.error('Failed to create notification:', notificationError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for OTP verification.',
      userId: user._id,
      email: user.email,
      emailSent: emailSent,
      debug: process.env.NODE_ENV === 'development' ? {
        otp: emailOtp,
        userId: user._id
      } : undefined
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

// 2. Verify OTP (Simplified and Fixed)
router.post('/verify-otp', async (req, res) => {
  try {
    console.log('Verify OTP request received:', req.body);
    
    const { email, otp, type = 'email' } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log('User not found for email:', email);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find OTP (case insensitive for OTP)
    const otpRecord = await OTP.findOne({
      email: email.toLowerCase(),
      otp: otp.toString().trim(),
      type
    });

    console.log('OTP record found:', otpRecord ? 'Yes' : 'No');
    
    if (!otpRecord) {
      // Check if any OTP exists for this user
      const existingOtps = await OTP.find({ email: email.toLowerCase(), type });
      console.log('Existing OTPs for this user:', existingOtps);
      
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        debug: process.env.NODE_ENV === 'development' ? {
          input: otp,
          existingOtps: existingOtps.map(o => o.otp)
        } : undefined
      });
    }

    // Check if OTP is expired
    const now = new Date();
    const otpAge = now - otpRecord.createdAt;
    const fiveMinutes = 5 * 60 * 1000;
    
    if (otpAge > fiveMinutes) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    // Update user verification status
    if (type === 'email') {
      user.isEmailVerified = true;
      user.status = user.isPhoneVerified ? 'admin_approval_pending' : 'email_verified';
    } else if (type === 'phone') {
      user.isPhoneVerified = true;
      user.status = user.isEmailVerified ? 'admin_approval_pending' : 'phone_verified';
    }

    // If both verified, update status
    if (user.isEmailVerified && user.isPhoneVerified) {
      user.status = 'admin_approval_pending';
      
      // Send notification to super admin for approval
      try {
        const superAdmin = await User.findOne({ userType: 'superadmin' });
        if (superAdmin) {
          await Notification.create({
            recipient: superAdmin._id,
            type: 'verification_request',
            title: 'Institute Verification Required',
            message: `${user.instituteName} has completed OTP verification and is ready for admin approval`,
            data: {
              instituteId: user._id,
              instituteName: user.instituteName,
              adminName: user.adminName
            }
          });
        }
      } catch (notificationError) {
        console.error('Notification creation error:', notificationError.message);
      }
    }

    await user.save();

    // Delete used OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    console.log('OTP verification successful for:', email);

    res.json({
      success: true,
      message: `${type === 'email' ? 'Email' : 'Phone'} verified successfully`,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 3. Login endpoint (Fixed)
router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', { email: req.body.email, userType: req.body.userType });
    
    const { email, password, userType = 'institute' } = req.body;

    // Find user
    const user = await User.findOne({ email: email.toLowerCase(), userType });
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('User found:', user.email, 'Status:', user.status);

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.log('Password mismatch for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // For institutes, check verification status
    if (user.userType === 'institute') {
      console.log('Institute verification check:', {
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isVerifiedByAdmin: user.isVerifiedByAdmin,
        isActive: user.isActive,
        status: user.status
      });

      // Allow login even if not fully verified, but with appropriate message
      if (!user.isEmailVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email first',
          needsEmailVerification: true,
          status: user.status
        });
      }

      if (!user.isPhoneVerified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your phone number',
          needsPhoneVerification: true,
          status: user.status
        });
      }

      if (!user.isVerifiedByAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval',
          pendingAdminApproval: true,
          status: user.status
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account is not active. Please contact administrator.',
          status: user.status
        });
      }
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

    console.log('Login successful for:', email);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        userType: user.userType,
        instituteName: user.instituteName,
        adminName: user.adminName,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        isVerifiedByAdmin: user.isVerifiedByAdmin,
        isActive: user.isActive,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// 4. Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { email, type = 'email' } = req.body;

    console.log('Resend OTP request for:', { email, type });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    console.log('Generated new OTP:', otp);

    // Delete old OTPs
    await OTP.deleteMany({ email: email.toLowerCase(), type });

    // Save new OTP
    await OTP.create({
      email: email.toLowerCase(),
      phone: user.phone || '',
      otp,
      type
    });

    // Send OTP
    if (type === 'email') {
      try {
        await sendEmailOTP(email, otp);
        console.log('Email OTP sent successfully');
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        return res.json({
          success: true,
          message: `OTP generated but email failed to send. Your OTP is: ${otp}`,
          otp: process.env.NODE_ENV === 'development' ? otp : undefined,
          debug: true
        });
      }
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

// 5. Debug endpoint to check OTPs
router.post('/debug-otp', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const otps = await OTP.find({ email: email.toLowerCase() });
    const user = await User.findOne({ email: email.toLowerCase() });
    
    const currentTime = new Date();
    
    res.json({
      success: true,
      data: {
        userExists: !!user,
        user: user ? {
          email: user.email,
          phone: user.phone,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          isVerifiedByAdmin: user.isVerifiedByAdmin,
          isActive: user.isActive
        } : null,
        otpRecords: otps.map(otp => ({
          otp: otp.otp,
          type: otp.type,
          email: otp.email,
          phone: otp.phone,
          createdAt: otp.createdAt,
          age: Math.floor((currentTime - otp.createdAt) / 1000) + ' seconds',
          isExpired: (currentTime - otp.createdAt) > (5 * 60 * 1000)
        }))
      }
    });
  } catch (error) {
    console.error('Debug OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
});

module.exports = router;