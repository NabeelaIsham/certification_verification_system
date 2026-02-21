const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Certificate = require('../models/Certificate');
const Settings = require('../models/Settings');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Email sending function
const sendEmailOTP = async (email, message) => {
  try {
    const settings = await Settings.findOne();
    const transporter = nodemailer.createTransport({
      host: settings?.email?.smtpServer || process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: settings?.email?.smtpPort || parseInt(process.env.EMAIL_PORT) || 587,
      secure: settings?.email?.smtpPort === 465,
      auth: {
        user: settings?.email?.smtpUsername || process.env.EMAIL_USER,
        pass: settings?.email?.smtpPassword || process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"${settings?.email?.fromName || 'Certificate System'}" <${settings?.email?.fromEmail || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset - Certificate System',
      text: message,
      html: `<p>${message}</p>`
    });
  } catch (error) {
    console.error('Email sending failed:', error);
    // Don't throw error, just log it
  }
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

// ============ DASHBOARD STATS ============

// Get dashboard stats
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
      totalUsers,
      certificatesIssuedToday,
      certificatesIssuedThisMonth,
      certificatesRevoked
    ] = await Promise.all([
      User.countDocuments({ userType: 'institute' }),
      User.countDocuments({ 
        userType: 'institute', 
        status: 'admin_approval_pending' 
      }),
      Certificate.countDocuments(),
      User.countDocuments({ isActive: true }),
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
      User.countDocuments(),
      
      // Today's certificates
      Certificate.countDocuments({
        createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
      }),
      
      // This month's certificates
      Certificate.countDocuments({
        createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
      }),
      
      // Revoked certificates
      Certificate.countDocuments({ status: 'revoked' })
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
        totalUsers,
        certificatesIssuedToday,
        certificatesIssuedThisMonth,
        certificatesRevoked
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

// Get recent activities
router.get('/activities', verifySuperAdmin, async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    // Get recent notifications
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('recipient', 'instituteName email');

    // Get recent certificates
    const recentCertificates = await Certificate.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('instituteId', 'instituteName')
      .select('studentName certificateCode status createdAt');

    // Combine and format activities
    const activities = [
      ...notifications.map(n => ({
        _id: n._id,
        type: n.type,
        action: n.title,
        description: n.message,
        timestamp: n.createdAt,
        user: n.recipient,
        icon: getActivityIcon(n.type)
      })),
      ...recentCertificates.map(c => ({
        _id: c._id,
        type: 'certificate',
        action: `Certificate ${c.status}`,
        description: `${c.studentName}'s certificate (${c.certificateCode}) was ${c.status}`,
        timestamp: c.createdAt,
        user: c.instituteId,
        icon: c.status === 'revoked' ? '❌' : '📜'
      }))
    ];

    // Sort by timestamp descending
    activities.sort((a, b) => b.timestamp - a.timestamp);
    
    // Limit to requested number
    const limitedActivities = activities.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: limitedActivities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities'
    });
  }
});

// Helper function for activity icons
function getActivityIcon(type) {
  const icons = {
    'account_approved': '✅',
    'account_rejected': '❌',
    'account_suspended': '⚠️',
    'account_activated': '🟢',
    'certificate_issued': '📜',
    'certificate_revoked': '🚫',
    'password_reset': '🔑',
    'settings_updated': '⚙️',
    'new_institute': '🏫',
    'verification_request': '🔍'
  };
  return icons[type] || '📌';
}

// ============ INSTITUTE MANAGEMENT ============

// Get all institutes with filters
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
        query.isActive = true;
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
    const [pendingCount, approvedCount, rejectedCount, suspendedCount] = await Promise.all([
      User.countDocuments({ userType: 'institute', status: 'admin_approval_pending' }),
      User.countDocuments({ userType: 'institute', status: 'approved', isActive: true }),
      User.countDocuments({ userType: 'institute', status: 'rejected' }),
      User.countDocuments({ userType: 'institute', status: 'approved', isActive: false })
    ]);

    // Get certificate counts for each institute
    const institutesWithCounts = await Promise.all(
      institutes.map(async (institute) => {
        const certificateCount = await Certificate.countDocuments({ 
          instituteId: institute._id 
        });
        return {
          ...institute.toObject(),
          certificateCount
        };
      })
    );

    res.json({
      success: true,
      data: institutesWithCounts,
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

// Get single institute details
router.get('/institutes/:id', verifySuperAdmin, async (req, res) => {
  try {
    const institute = await User.findById(req.params.id).select('-password');
    
    if (!institute || institute.userType !== 'institute') {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    // Get certificate statistics for this institute
    const [certificateCount, issuedCount, revokedCount] = await Promise.all([
      Certificate.countDocuments({ instituteId: institute._id }),
      Certificate.countDocuments({ instituteId: institute._id, status: 'issued' }),
      Certificate.countDocuments({ instituteId: institute._id, status: 'revoked' })
    ]);

    // Get recent certificates
    const recentCertificates = await Certificate.find({ instituteId: institute._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('studentName certificateCode status createdAt');

    res.json({
      success: true,
      data: {
        ...institute.toObject(),
        certificateStats: {
          total: certificateCount,
          issued: issuedCount,
          revoked: revokedCount
        },
        recentCertificates
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

// Approve institute
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
      message: `Your institute account has been approved by the super admin. You can now log in and start using the system.${notes ? ` Notes: ${notes}` : ''}`,
      data: {
        instituteId: institute._id,
        instituteName: institute.instituteName,
        approvedBy: req.user.email,
        notes
      }
    });

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

// Reject institute
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

    // Store data for notification
    const instituteData = {
      id: institute._id,
      name: institute.instituteName,
      email: institute.email
    };

    // Create notification for super admin about the rejection
    await Notification.create({
      recipient: req.userId,
      type: 'institute_rejected',
      title: 'Institute Rejected',
      message: `${instituteData.name} has been rejected. Reason: ${reason || 'No reason provided'}`,
      data: {
        instituteId: instituteData.id,
        instituteName: instituteData.name,
        rejectedBy: req.user.email,
        reason
      }
    });

    // Send email notification to institute
    try {
      await sendEmailOTP(
        institute.email,
        `Your institute registration has been rejected. Reason: ${reason || 'No reason provided'}`
      );
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError);
    }

    // Delete the institute
    await User.findByIdAndDelete(instituteId);

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

// Suspend/Activate institute
router.put('/institutes/:id/toggle-status', verifySuperAdmin, async (req, res) => {
  try {
    const { action } = req.body; // 'suspend' or 'activate'
    const instituteId = req.params.id;

    if (!['suspend', 'activate'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "suspend" or "activate"'
      });
    }

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
    } else {
      institute.isActive = true;
      institute.status = 'approved';
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
        instituteName: institute.instituteName,
        action,
        performedBy: req.user.email
      }
    });

    // Send email notification
    try {
      await sendEmailOTP(
        institute.email,
        `Your institute account has been ${action}d.`
      );
    } catch (emailError) {
      console.error('Failed to send status email:', emailError);
    }

    res.json({
      success: true,
      message: `Institute ${action}d successfully`,
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

// Get pending institutes (for quick view)
router.get('/institutes/pending/list', verifySuperAdmin, async (req, res) => {
  try {
    const pendingInstitutes = await User.find({
      userType: 'institute',
      status: 'admin_approval_pending',
      isEmailVerified: true,
      isPhoneVerified: true
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(10);

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

// ============ USER MANAGEMENT ============

// Get all users (with filters)
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
    const [totalUsers, activeUsers, pendingUsers, instituteCount, superAdminCount] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ status: 'admin_approval_pending' }),
      User.countDocuments({ userType: 'institute' }),
      User.countDocuments({ userType: 'superadmin' })
    ]);

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

// Toggle user active status
router.put('/users/:id/toggle-status', verifySuperAdmin, async (req, res) => {
  try {
    const { active } = req.body;
    const userId = req.params.id;

    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Active status must be a boolean'
      });
    }

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
        performedBy: req.user.email
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

// Reset user password
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
        performedBy: req.user.email
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

// ============ CERTIFICATE MANAGEMENT ============

// Get all certificates (with filters)
router.get('/certificates', verifySuperAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      instituteId,
      status,
      startDate,
      endDate 
    } = req.query;
    
    const query = {};
    
    // Filter by institute
    if (instituteId) {
      query.instituteId = instituteId;
    }
    
    // Filter by status
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    // Search by certificate code or student name
    if (search) {
      query.$or = [
        { certificateCode: { $regex: search, $options: 'i' } },
        { studentName: { $regex: search, $options: 'i' } }
      ];
    }

    const certificates = await Certificate.find(query)
      .populate('instituteId', 'instituteName email')
      .populate('studentId', 'name email')
      .populate('courseId', 'courseName courseCode')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Certificate.countDocuments(query);

    // Get statistics
    const [totalCertificates, issuedCount, revokedCount, pendingCount] = await Promise.all([
      Certificate.countDocuments(),
      Certificate.countDocuments({ status: 'issued' }),
      Certificate.countDocuments({ status: 'revoked' }),
      Certificate.countDocuments({ status: 'pending' })
    ]);

    res.json({
      success: true,
      data: certificates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        total: totalCertificates,
        issued: issuedCount,
        revoked: revokedCount,
        pending: pendingCount
      }
    });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates',
      error: error.message
    });
  }
});

// Get single certificate details
router.get('/certificates/:id', verifySuperAdmin, async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('instituteId', 'instituteName email phone address')
      .populate('studentId', 'name email phone')
      .populate('courseId', 'courseName courseCode description')
      .populate('templateId', 'templateName layout');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate details'
    });
  }
});

// Revoke certificate
router.put('/certificates/:id/revoke', verifySuperAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const certificateId = req.params.id;

    const certificate = await Certificate.findById(certificateId)
      .populate('instituteId', 'instituteName email');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }

    if (certificate.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'Certificate is already revoked'
      });
    }

    // Update certificate status
    certificate.status = 'revoked';
    certificate.revokedAt = new Date();
    certificate.revokedBy = req.userId;
    certificate.revocationReason = reason || 'Revoked by super admin';

    await certificate.save();

    // Create notification for the institute
    await Notification.create({
      recipient: certificate.instituteId._id,
      type: 'certificate_revoked',
      title: 'Certificate Revoked',
      message: `Certificate ${certificate.certificateCode} for ${certificate.studentName} has been revoked by super admin. Reason: ${reason || 'No reason provided'}`,
      data: {
        certificateId: certificate._id,
        certificateCode: certificate.certificateCode,
        instituteId: certificate.instituteId._id,
        instituteName: certificate.instituteId.instituteName,
        revokedBy: req.user.email,
        reason
      }
    });

    // Send email notification to institute
    try {
      await sendEmailOTP(
        certificate.instituteId.email,
        `Certificate ${certificate.certificateCode} for ${certificate.studentName} has been revoked. Reason: ${reason || 'No reason provided'}`
      );
    } catch (emailError) {
      console.error('Failed to send revocation email:', emailError);
    }

    res.json({
      success: true,
      message: 'Certificate revoked successfully',
      data: certificate
    });
  } catch (error) {
    console.error('Error revoking certificate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke certificate'
    });
  }
});

// Bulk revoke certificates
router.post('/certificates/bulk-revoke', verifySuperAdmin, async (req, res) => {
  try {
    const { certificateIds, reason } = req.body;

    if (!certificateIds || !certificateIds.length) {
      return res.status(400).json({
        success: false,
        message: 'No certificates selected'
      });
    }

    const certificates = await Certificate.find({
      _id: { $in: certificateIds }
    }).populate('instituteId', 'instituteName email');

    const results = {
      successful: [],
      failed: []
    };

    for (const cert of certificates) {
      try {
        if (cert.status === 'revoked') {
          results.failed.push({
            id: cert._id,
            code: cert.certificateCode,
            error: 'Already revoked'
          });
          continue;
        }

        cert.status = 'revoked';
        cert.revokedAt = new Date();
        cert.revokedBy = req.userId;
        cert.revocationReason = reason || 'Bulk revoked by super admin';
        
        await cert.save();

        // Create notification for each institute
        await Notification.create({
          recipient: cert.instituteId._id,
          type: 'certificate_revoked',
          title: 'Certificate Revoked',
          message: `Certificate ${cert.certificateCode} for ${cert.studentName} has been revoked by super admin.`,
          data: {
            certificateId: cert._id,
            certificateCode: cert.certificateCode,
            instituteId: cert.instituteId._id,
            instituteName: cert.instituteId.instituteName,
            revokedBy: req.user.email
          }
        });

        results.successful.push({
          id: cert._id,
          code: cert.certificateCode
        });
      } catch (error) {
        results.failed.push({
          id: cert._id,
          code: cert.certificateCode,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `${results.successful.length} certificate(s) revoked successfully, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error('Error bulk revoking certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke certificates'
    });
  }
});

// Get certificate statistics by institute
router.get('/certificates/stats/by-institute', verifySuperAdmin, async (req, res) => {
  try {
    const stats = await Certificate.aggregate([
      {
        $group: {
          _id: '$instituteId',
          totalCertificates: { $sum: 1 },
          issued: {
            $sum: { $cond: [{ $eq: ['$status', 'issued'] }, 1, 0] }
          },
          revoked: {
            $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'institute'
        }
      },
      {
        $unwind: '$institute'
      },
      {
        $project: {
          'institute.password': 0,
          _id: 1,
          totalCertificates: 1,
          issued: 1,
          revoked: 1,
          pending: 1,
          institute: {
            _id: '$institute._id',
            instituteName: '$institute.instituteName',
            email: '$institute.email'
          }
        }
      },
      {
        $sort: { totalCertificates: -1 }
      }
    ]);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching certificate stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate statistics'
    });
  }
});

// Export certificates data
router.get('/certificates/export/all', verifySuperAdmin, async (req, res) => {
  try {
    const { format = 'json', instituteId, startDate, endDate } = req.query;
    
    const query = {};
    if (instituteId) query.instituteId = instituteId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const certificates = await Certificate.find(query)
      .populate('instituteId', 'instituteName email')
      .populate('studentId', 'name email')
      .populate('courseId', 'courseName courseCode')
      .sort({ createdAt: -1 });

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = certificates.map(cert => ({
        'Certificate Code': cert.certificateCode,
        'Student Name': cert.studentName,
        'Student Email': cert.studentId?.email || '',
        'Course Name': cert.courseName,
        'Award Date': new Date(cert.awardDate).toLocaleDateString(),
        'Institute': cert.instituteId?.instituteName || '',
        'Status': cert.status,
        'Issued Date': new Date(cert.createdAt).toLocaleDateString(),
        'Revoked Date': cert.revokedAt ? new Date(cert.revokedAt).toLocaleDateString() : ''
      }));

      res.json({
        success: true,
        data: csvData,
        format: 'csv'
      });
    } else {
      res.json({
        success: true,
        data: certificates
      });
    }
  } catch (error) {
    console.error('Error exporting certificates:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export certificates'
    });
  }
});

// ============ SYSTEM SETTINGS ============

// Get system settings
router.get('/settings', verifySuperAdmin, async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    // If no settings exist, create default settings
    if (!settings) {
      settings = await Settings.create({});
    }

    // Mask sensitive data
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

// Update system settings
router.put('/settings', verifySuperAdmin, async (req, res) => {
  try {
    const newSettings = req.body;
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = new Settings();
    }

    // Handle nested objects properly
    const updateNested = (target, source) => {
      Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          updateNested(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      });
    };

    // Apply updates
    updateNested(settings, newSettings);

    // Handle email password specially (if it's masked, keep existing)
    if (settings.email && settings.email.smtpPassword === '********') {
      const existingSettings = await Settings.findOne();
      if (existingSettings && existingSettings.email) {
        settings.email.smtpPassword = existingSettings.email.smtpPassword;
      }
    }

    settings.updatedBy = req.userId;
    await settings.save();

    // Create notification
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
      error: error.message
    });
  }
});

// Reset settings to default
router.post('/settings/reset', verifySuperAdmin, async (req, res) => {
  try {
    // Delete existing settings
    await Settings.deleteMany({});
    
    // Create new default settings
    const settings = await Settings.create({});

    // Create notification
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

// Test email configuration
router.post('/settings/test-email', verifySuperAdmin, async (req, res) => {
  try {
    const { email, settings: emailSettings } = req.body;
    
    // Get current settings if not provided
    let testSettings = emailSettings;
    if (!testSettings) {
      const settings = await Settings.findOne();
      testSettings = settings?.email || {};
    }

    // Handle password - if it's '********', get from DB
    let smtpPassword = testSettings.smtpPassword;
    if (smtpPassword === '********') {
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
    await testTransporter.sendMail({
      from: `"${testSettings.fromName || 'Certificate System'}" <${testSettings.fromEmail || process.env.EMAIL_USER}>`,
      to: email || req.user.email,
      subject: 'Test Email - Certificate Verification System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4F46E5;">Test Email</h2>
          <p>This is a test email from your Certificate Verification System.</p>
          <p>If you're receiving this, your email configuration is working correctly!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">Sent at: ${new Date().toLocaleString()}</p>
        </div>
      `
    });

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

// Generate system report
router.get('/reports/system', verifySuperAdmin, async (req, res) => {
  try {
    const [
      totalInstitutes,
      totalCertificates,
      totalUsers,
      recentRegistrations,
      certificatesByMonth
    ] = await Promise.all([
      User.countDocuments({ userType: 'institute' }),
      Certificate.countDocuments(),
      User.countDocuments(),
      User.find({ userType: 'institute' })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('instituteName email createdAt status'),
      Certificate.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 6 }
      ])
    ]);

    const report = {
      generatedAt: new Date(),
      generatedBy: req.user.email,
      summary: {
        totalInstitutes,
        totalCertificates,
        totalUsers,
        activeInstitutes: await User.countDocuments({ userType: 'institute', isActive: true }),
        pendingApprovals: await User.countDocuments({ userType: 'institute', status: 'admin_approval_pending' }),
        certificatesIssuedToday: await Certificate.countDocuments({
          createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
        }),
        certificatesRevoked: await Certificate.countDocuments({ status: 'revoked' })
      },
      recentRegistrations,
      certificatesByMonth: certificatesByMonth.map(item => ({
        month: `${item._id.year}-${item._id.month}`,
        count: item.count
      })),
      systemHealth: {
        database: 'connected',
        server: 'running',
        lastBackup: 'Not configured',
        uptime: process.uptime()
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

module.exports = router;