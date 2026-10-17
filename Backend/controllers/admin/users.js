const { appLogger } = require('../../utils/logger.js');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const ActivityLog = require('../../models/ActivityLog');
const OTP = require('../../models/OTP');
const crypto = require('crypto');
const { sendOtpEmail } = require('../../utils/emailService');
const { hashOtp } = require('../../utils/otpSecurity');
const getUsers = async (req, res) => {
  try {
    const filter = {};
    const userType = req.query.userType || req.query.role;
    if (userType && userType !== 'all') {
      filter.userType = userType;
    }
    if (req.query.status && req.query.status !== 'all') {
      const statusFilter = req.query.status;
      if (statusFilter === 'active') {
        filter.isActive = true;
      } else if (statusFilter === 'inactive') {
        filter.isActive = false;
      } else if (statusFilter === 'pending') {
        filter.status = {
          $in: [
            'pending',
            'email_verified',
            'phone_verified',
            'admin_approval_pending'
          ]
        };
      } else {
        filter.status = statusFilter;
      }
    }
    const users = await User.find(filter).select('-password').sort({
      createdAt: -1
    });
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    appLogger.error('Admin getUsers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};
const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    user.isActive = !user.isActive;
    user.sessionVersion = (user.sessionVersion || 0) + 1;
    if (user.userType === 'institute') {
      user.status = user.isActive ? 'approved' : 'suspended';
    }
    await user.save();
    const action = user.isActive ? 'ACTIVATE_USER' : 'SUSPEND_USER';
    await Promise.all([
      Notification.create({
        recipient: user._id,
        type: user.isActive ? 'account_activated' : 'account_suspended',
        title: user.isActive ? 'Account Activated' : 'Account Suspended',
        message: user.isActive
          ? 'Your account has been activated.'
          : 'Your account has been suspended.',
        data: {
          changedBy: req.userId
        }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: action,
        details: {
          targetUserId: user._id,
          targetUserEmail: user.email,
          userType: user.userType,
          status: user.isActive ? 'activated' : 'suspended'
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);
    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'suspended'} successfully`,
      data: user
    });
  } catch (error) {
    appLogger.error('Admin toggleUserStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user status',
      error: error.message
    });
  }
};
const resetUserPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const otp = crypto.randomInt(100000, 1000000).toString();
    await OTP.deleteMany({
      email: user.email,
      type: 'reset_password'
    });
    await OTP.create({
      email: user.email,
      phone: user.phone || '',
      otpHash: hashOtp(user.email, 'reset_password', otp),
      type: 'reset_password'
    });
    await sendOtpEmail({
      to: user.email,
      otp,
      purpose: 'reset_password'
    });
    await Promise.all([
      Notification.create({
        recipient: user._id,
        type: 'password_reset',
        title: 'Password Reset',
        message:
          'An administrator requested a password reset. Use the single-use code sent to your email.',
        data: {
          changedBy: req.userId
        }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: 'RESET_USER_PASSWORD',
        details: {
          targetUserId: user._id,
          targetUserEmail: user.email
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);
    res.json({
      success: true,
      message: 'A single-use password reset code was sent to the user.',
      data: {
        userId: user._id
      }
    });
  } catch (error) {
    appLogger.error('Admin resetUserPassword error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset user password',
      error: error.message
    });
  }
};
module.exports = {
  getUsers,
  toggleUserStatus,
  resetUserPassword
};
