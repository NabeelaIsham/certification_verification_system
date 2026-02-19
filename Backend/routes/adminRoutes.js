const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Certificate = require('../models/Certificate');
const Settings = require('../models/Settings'); // Add this import
const crypto = require('crypto');
const nodemailer = require('nodemailer'); // Add this import

// Email sending function (you may already have this in your authRoutes)
const sendEmailOTP = async (email, message) => {
  // This should be your existing email sending function
  console.log(`Sending email to ${email}: ${message}`);
  // Implement your actual email sending logic here
};

// Middleware to verify super admin
const verifySuperAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'No token provided' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (user.userType !== 'superadmin') {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Super admin only.' 
      });
    }

    if (!user.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Account is deactivated' 
      });
    }

    req.userId = user._id;
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    });
  }
};

// ============ INSTITUTE MANAGEMENT ENDPOINTS ============

// 1. Get all institutes with filters
router.get('/institutes', verifySuperAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, search = '' } = req.query;
    
    const query = { userType: 'institute' };
    
    // Add status filter
    if (status && status !== 'all') {
      if (status === 'pending') {
        query.status = 'admin_approval_pending';
      } else if (status === 'approved') {
        query.status = 'approved';
      } else if (status === 'rejected') {
        query.status = 'rejected';
      } else if (status === 'suspended') {
        query.isActive = false;
        query.status = 'approved';
      }
    }

    // Add search filter
    if (search) {
      query.$or = [
        { instituteName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { adminName: { $regex: search, $options: 'i' } }
      ];
    }

    const institutes = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // Get counts for each status
    const pendingCount = await User.countDocuments({ 
      userType: 'institute', 
      status: 'admin_approval_pending' 
    });
    const approvedCount = await User.countDocuments({ 
      userType: 'institute', 
      status: 'approved',
      isActive: true 
    });
    const rejectedCount = await User.countDocuments({ 
      userType: 'institute', 
      status: 'rejected' 
    });
    const suspendedCount = await User.countDocuments({ 
      userType: 'institute', 
      status: 'approved',
      isActive: false 
    });

    res.json({
      success: true,
      data: institutes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        suspended: suspendedCount,
        total: await User.countDocuments({ userType: 'institute' })
      }
    });
  } catch (error) {
    console.error('Error fetching institutes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institutes',
      error: error.message
    });
  }
});

// 2. Get single institute details
router.get('/institutes/:id', verifySuperAdmin, async (req, res) => {
  try {
    const institute = await User.findById(req.params.id).select('-password');
    
    if (!institute || institute.userType !== 'institute') {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    // Get certificate count for this institute
    const certificateCount = await Certificate.countDocuments({ 
      instituteId: institute._id 
    });

    res.json({
      success: true,
      data: {
        ...institute.toObject(),
        certificateCount
      }
    });
  } catch (error) {
    console.error('Error fetching institute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institute details'
    });
  }
});

// 3. Approve institute
router.put('/institutes/:id/approve', verifySuperAdmin, async (req, res) => {
  try {
    const { notes } = req.body;
    const instituteId = req.params.id;

    const institute = await User.findById(instituteId);
    if (!institute || institute.userType !== 'institute') {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    // Check if already approved
    if (institute.isVerifiedByAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Institute is already approved'
      });
    }

    // Update institute status
    institute.isVerifiedByAdmin = true;
    institute.isActive = true;
    institute.status = 'approved';
    institute.adminVerifiedAt = new Date();
    institute.adminNotes = notes || '';
    institute.verifiedBy = req.userId;

    await institute.save();

    // Create notification for institute
    await Notification.create({
      recipient: institute._id,
      type: 'account_approved',
      title: 'Account Approved',
      message: 'Your institute account has been approved by the super admin. You can now log in and start using the system.',
      data: {
        instituteId: institute._id,
        instituteName: institute.instituteName
      }
    });

    // Log activity
    console.log(`Institute ${institute.instituteName} approved by admin ${req.user.email}`);

    res.json({
      success: true,
      message: 'Institute approved successfully',
      data: institute
    });

  } catch (error) {
    console.error('Error approving institute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve institute'
    });
  }
});

// 4. Reject institute
router.delete('/institutes/:id', verifySuperAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const instituteId = req.params.id;

    const institute = await User.findById(instituteId);
    if (!institute || institute.userType !== 'institute') {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    // Store rejection reason before deleting
    const instituteData = {
      id: institute._id,
      name: institute.instituteName,
      email: institute.email
    };

    // Delete the institute
    await User.findByIdAndDelete(instituteId);

    // Create notification for super admin about the rejection
    await Notification.create({
      recipient: req.userId,
      type: 'institute_rejected',
      title: 'Institute Rejected',
      message: `${instituteData.name} has been rejected. Reason: ${reason || 'No reason provided'}`,
      data: {
        instituteId: instituteData.id,
        instituteName: instituteData.name
      }
    });

    console.log(`Institute ${instituteData.name} rejected and deleted by admin ${req.user.email}. Reason: ${reason}`);

    res.json({
      success: true,
      message: 'Institute rejected and removed successfully'
    });

  } catch (error) {
    console.error('Error rejecting institute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject institute'
    });
  }
});

// 5. Suspend/Activate institute
router.put('/institutes/:id/toggle-status', verifySuperAdmin, async (req, res) => {
  try {
    const { action } = req.body; // 'suspend' or 'activate'
    const instituteId = req.params.id;

    const institute = await User.findById(instituteId);
    if (!institute || institute.userType !== 'institute') {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    if (action === 'suspend') {
      institute.isActive = false;
      institute.status = 'suspended';
    } else if (action === 'activate') {
      institute.isActive = true;
      institute.status = 'approved';
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "suspend" or "activate"'
      });
    }

    await institute.save();

    // Create notification
    await Notification.create({
      recipient: institute._id,
      type: action === 'suspend' ? 'account_suspended' : 'account_activated',
      title: action === 'suspend' ? 'Account Suspended' : 'Account Activated',
      message: action === 'suspend' 
        ? 'Your institute account has been suspended. Please contact super admin.'
        : 'Your institute account has been activated.',
      data: {
        instituteId: institute._id,
        instituteName: institute.instituteName
      }
    });

    res.json({
      success: true,
      message: `Institute ${action}ed successfully`,
      data: institute
    });

  } catch (error) {
    console.error('Error toggling institute status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update institute status'
    });
  }
});

// 6. Get dashboard stats
router.get('/stats', verifySuperAdmin, async (req, res) => {
  try {
    const [
      totalInstitutes,
      pendingApprovals,
      totalCertificates,
      activeUsers,
      approvedInstitutes,
      rejectedInstitutes,
      suspendedInstitutes,
      totalUsers
    ] = await Promise.all([
      User.countDocuments({ userType: 'institute' }),
      User.countDocuments({ 
        userType: 'institute', 
        status: 'admin_approval_pending' 
      }),
      Certificate.countDocuments(),
      User.countDocuments({ 
        isActive: true 
      }),
      User.countDocuments({ 
        userType: 'institute', 
        status: 'approved',
        isActive: true
      }),
      User.countDocuments({ 
        userType: 'institute', 
        status: 'rejected' 
      }),
      User.countDocuments({ 
        userType: 'institute', 
        status: 'approved',
        isActive: false 
      }),
      User.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        totalInstitutes,
        pendingApprovals,
        totalCertificates,
        activeUsers,
        approvedInstitutes,
        rejectedInstitutes,
        suspendedInstitutes,
        totalUsers
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
});

// 7. Get recent activities
router.get('/activities', verifySuperAdmin, async (req, res) => {
  try {
    // Get recent notifications and actions
    const recentActivities = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('recipient', 'instituteName email');

    const activities = recentActivities.map(activity => ({
      _id: activity._id,
      type: activity.type,
      action: activity.title,
      description: activity.message,
      timestamp: activity.createdAt,
      user: activity.recipient
    }));

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities'
    });
  }
});

// 8. Get pending institutes (specific for quick view)
router.get('/institutes/pending', verifySuperAdmin, async (req, res) => {
  try {
    const pendingInstitutes = await User.find({
      userType: 'institute',
      status: 'admin_approval_pending',
      isEmailVerified: true,
      isPhoneVerified: true,
      isVerifiedByAdmin: false
    }).select('-password').limit(10);

    res.json({
      success: true,
      data: pendingInstitutes,
      count: pendingInstitutes.length
    });
  } catch (error) {
    console.error('Error fetching pending institutes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending institutes'
    });
  }
});

// 9. Generate system report
router.get('/reports/system', verifySuperAdmin, async (req, res) => {
  try {
    const [
      totalInstitutes,
      totalCertificates,
      totalUsers,
      recentRegistrations
    ] = await Promise.all([
      User.countDocuments({ userType: 'institute' }),
      Certificate.countDocuments(),
      User.countDocuments(),
      User.find({ userType: 'institute' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('instituteName email createdAt status')
    ]);

    const report = {
      generatedAt: new Date(),
      summary: {
        totalInstitutes,
        totalCertificates,
        totalUsers,
        activeInstitutes: await User.countDocuments({ userType: 'institute', isActive: true }),
        pendingApprovals: await User.countDocuments({ userType: 'institute', status: 'admin_approval_pending' })
      },
      recentRegistrations,
      systemHealth: {
        database: 'connected',
        server: 'running',
        lastBackup: new Date().toISOString().split('T')[0]
      }
    };

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate report'
    });
  }
});

// ============ USER MANAGEMENT ENDPOINTS ============

// 10. Get all users (with filters and pagination)
router.get('/users', verifySuperAdmin, async (req, res) => {
  try {
    const { role, status, page = 1, limit = 10, search = '' } = req.query;
    
    const query = {};
    
    // Filter by role
    if (role && role !== 'all') {
      query.userType = role;
    }
    
    // Filter by status
    if (status && status !== 'all') {
      if (status === 'active') {
        query.isActive = true;
      } else if (status === 'inactive') {
        query.isActive = false;
      } else if (status === 'pending') {
        query.status = 'admin_approval_pending';
      }
    }
    
    // Search functionality
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { instituteName: { $regex: search, $options: 'i' } },
        { adminName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    // Get counts for stats
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const pendingUsers = await User.countDocuments({ status: 'admin_approval_pending' });
    const instituteCount = await User.countDocuments({ userType: 'institute' });
    const superAdminCount = await User.countDocuments({ userType: 'superadmin' });

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      counts: {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        institutes: instituteCount,
        superAdmins: superAdminCount
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
});

// 11. Toggle user active status
router.put('/users/:id/toggle-status', verifySuperAdmin, async (req, res) => {
  try {
    const { active } = req.body;
    const userId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Don't allow deactivating your own account
    if (userId === req.userId && !active) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    user.isActive = active;
    if (user.userType === 'institute' && !active) {
      user.status = 'suspended';
    } else if (user.userType === 'institute' && active) {
      user.status = 'approved';
    }

    await user.save();

    // Create notification
    await Notification.create({
      recipient: user._id,
      type: active ? 'account_activated' : 'account_suspended',
      title: active ? 'Account Activated' : 'Account Suspended',
      message: active 
        ? 'Your account has been activated by super admin.'
        : 'Your account has been suspended. Please contact super admin.',
      data: {
        userId: user._id,
        action: active ? 'activated' : 'suspended',
        performedBy: req.userId
      }
    });

    res.json({
      success: true,
      message: `User ${active ? 'activated' : 'deactivated'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
});

// 12. Reset user password
router.post('/users/:id/reset-password', verifySuperAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const temporaryPassword = crypto.randomBytes(4).toString('hex'); // 8 character password

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Set temporary password
    user.password = temporaryPassword;
    await user.save();

    // Send email with temporary password
    try {
      await sendEmailOTP(
        user.email,
        `Your temporary password is: ${temporaryPassword}. Please change it after logging in.`
      );
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    // Create notification
    await Notification.create({
      recipient: user._id,
      type: 'password_reset',
      title: 'Password Reset',
      message: 'Your password has been reset by super admin. Check your email for temporary password.',
      data: {
        userId: user._id,
        performedBy: req.userId
      }
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      temporaryPassword: process.env.NODE_ENV === 'development' ? temporaryPassword : undefined
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset password'
    });
  }
});

// ============ SYSTEM SETTINGS ENDPOINTS ============

// GET /api/admin/settings - Get system settings
router.get('/settings', verifySuperAdmin, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({});
    }

    // Mask sensitive data for frontend
    const settingsObj = settings.toObject();
    if (settingsObj.email?.smtpPassword) {
      settingsObj.email.smtpPassword = '********';
    }

    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
});

// PUT /api/admin/settings - Update system settings (FIXED VERSION)
router.put('/settings', verifySuperAdmin, async (req, res) => {
  try {
    console.log('Received settings update request:', JSON.stringify(req.body, null, 2));
    
    const newSettings = req.body;
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings();
    }

    // Handle email password specially
    if (newSettings.email) {
      // If password is '********', keep the existing password
      if (newSettings.email.smtpPassword === '********') {
        newSettings.email.smtpPassword = settings.email?.smtpPassword || '';
      }
    }

    // Update settings with new values
    Object.keys(newSettings).forEach(key => {
      if (settings[key] && typeof settings[key] === 'object' && typeof newSettings[key] === 'object') {
        // Deep merge for nested objects
        Object.assign(settings[key], newSettings[key]);
      } else if (newSettings[key] !== undefined) {
        // Direct assignment for top-level fields
        settings[key] = newSettings[key];
      }
    });

    settings.updatedBy = req.userId;
    settings.updatedAt = new Date();
    
    await settings.save();
    console.log('Settings saved successfully');

    // Log the settings update
    await Notification.create({
      recipient: req.userId,
      type: 'settings_updated',
      title: 'Settings Updated',
      message: 'System settings have been updated successfully',
      data: {
        updatedBy: req.user.email,
        timestamp: new Date()
      }
    });

    // Return settings with masked password
    const settingsObj = settings.toObject();
    if (settingsObj.email?.smtpPassword) {
      settingsObj.email.smtpPassword = '********';
    }

    res.json({
      success: true,
      message: 'Settings saved successfully',
      data: settingsObj
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save settings',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/admin/settings/reset - Reset settings to default
router.post('/settings/reset', verifySuperAdmin, async (req, res) => {
  try {
    // Delete existing settings
    await Settings.deleteMany({});
    
    // Create new default settings
    const settings = await Settings.create({});

    await Notification.create({
      recipient: req.userId,
      type: 'settings_reset',
      title: 'Settings Reset',
      message: 'System settings have been reset to default',
      data: {
        resetBy: req.user.email,
        timestamp: new Date()
      }
    });

    // Mask password in response
    const settingsObj = settings.toObject();
    if (settingsObj.email?.smtpPassword) {
      settingsObj.email.smtpPassword = '********';
    }

    res.json({
      success: true,
      message: 'Settings reset to default successfully',
      data: settingsObj
    });
  } catch (error) {
    console.error('Error resetting settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings'
    });
  }
});

// POST /api/admin/settings/test-email - Test email configuration (FIXED VERSION)
router.post('/settings/test-email', verifySuperAdmin, async (req, res) => {
  try {
    const { email, settings: emailSettings } = req.body;
    
    console.log('Test email request received for:', email || req.user.email);
    
    // Get current settings if not provided
    let testSettings = emailSettings;
    if (!testSettings) {
      const settings = await Settings.findOne();
      testSettings = settings?.email || {};
    }

    // Handle password - if it's '********', use env var or existing
    let smtpPassword = testSettings.smtpPassword;
    if (smtpPassword === '********') {
      // Try to get from settings in database
      const dbSettings = await Settings.findOne();
      smtpPassword = dbSettings?.email?.smtpPassword || process.env.EMAIL_PASS;
    }

    // Create test transporter
    const testTransporter = nodemailer.createTransport({
      host: testSettings.smtpServer || process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: testSettings.smtpPort || parseInt(process.env.EMAIL_PORT) || 587,
      secure: testSettings.smtpPort === 465,
      auth: {
        user: testSettings.smtpUsername || process.env.EMAIL_USER,
        pass: smtpPassword
      }
    });

    // Send test email
    const info = await testTransporter.sendMail({
      from: `"${testSettings.fromName || 'Certificate System'}" <${testSettings.fromEmail || process.env.EMAIL_USER}>`,
      to: email || req.user.email,
      subject: 'Test Email - Certificate Verification System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5; border-bottom: 2px solid #4F46E5; padding-bottom: 10px;">Test Email</h2>
          <p>This is a test email from your Certificate Verification System.</p>
          <p>If you're receiving this, your email configuration is working correctly!</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Server:</strong> ${testSettings.smtpServer}</p>
            <p style="margin: 5px 0;"><strong>Port:</strong> ${testSettings.smtpPort}</p>
            <p style="margin: 5px 0;"><strong>Username:</strong> ${testSettings.smtpUsername}</p>
          </div>
          <hr>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    console.log('Test email sent successfully:', info.messageId);

    res.json({
      success: true,
      message: 'Test email sent successfully!'
    });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

module.exports = router;