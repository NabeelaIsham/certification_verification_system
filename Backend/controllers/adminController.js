const User = require('../models/User');
const Notification = require('../models/Notification');
const Certificate = require('../models/Certificate');
const Settings = require('../models/Settings');
const ActivityLog = require('../models/ActivityLog');
const { sendEmail } = require('../utils/emailService');

const getStats = async (req, res) => {
  try {
    const [
      totalInstitutes,
      pendingInstitutes,
      approvedInstitutes,
      rejectedInstitutes,
      suspendedInstitutes,
      totalTeachers,
      totalCertificates,
      revokedCertificates,
      activeUsers
    ] = await Promise.all([
      User.countDocuments({ userType: 'institute' }),
      User.countDocuments({ userType: 'institute', isVerifiedByAdmin: false }),
      User.countDocuments({ userType: 'institute', isVerifiedByAdmin: true, isActive: true }),
      User.countDocuments({ userType: 'institute', status: 'rejected' }),
      User.countDocuments({ userType: 'institute', isActive: false }),
      User.countDocuments({ userType: 'teacher' }),
      Certificate.countDocuments(),
      Certificate.countDocuments({ status: 'revoked' }),
      User.countDocuments({ isActive: true })
    ]);

    res.json({
      success: true,
      data: {
        totalInstitutes,
        pendingApprovals: pendingInstitutes,
        pendingInstitutes,
        approvedInstitutes,
        rejectedInstitutes,
        suspendedInstitutes,
        totalTeachers,
        totalCertificates,
        revokedCertificates,
        activeUsers
      }
    });
  } catch (error) {
    console.error('Admin getStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch admin stats', error: error.message });
  }
};

const getActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const filter = req.query.action ? { action: req.query.action } : {};

    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('user', 'name email userType')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit),
      ActivityLog.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: activities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin getActivities error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch activities', error: error.message });
  }
};

const getInstitutes = async (req, res) => {
  try {
    const filter = {};
    
    // Map frontend status filters to database queries
    const selectedStatus = req.query.status;
    if (selectedStatus && selectedStatus !== 'all') {
      if (selectedStatus === 'pending') {
        filter.isVerifiedByAdmin = false;
      } else if (selectedStatus === 'approved') {
        filter.isVerifiedByAdmin = true;
        filter.isActive = true;
      } else if (selectedStatus === 'rejected') {
        filter.status = 'rejected';
      } else if (selectedStatus === 'suspended') {
        filter.isActive = false;
      }
    }

    // Debug: log incoming query and authenticated user info
    console.log('Admin getInstitutes called by:', req.user?.email || req.userId, 'query:', req.query);

    const institutes = await User.find({ userType: 'institute', ...filter })
      .select('-password')
      .sort({ createdAt: -1 });

    console.log(`Found ${institutes.length} institutes for filter:`, filter);

    // Get counts for all statuses
    const [totalCount, pendingCount, approvedCount, rejectedCount, suspendedCount] = await Promise.all([
      User.countDocuments({ userType: 'institute' }),
      User.countDocuments({ userType: 'institute', isVerifiedByAdmin: false }),
      User.countDocuments({ userType: 'institute', isVerifiedByAdmin: true, isActive: true }),
      User.countDocuments({ userType: 'institute', status: 'rejected' }),
      User.countDocuments({ userType: 'institute', isActive: false })
    ]);

    res.json({ 
      success: true, 
      data: institutes,
      counts: {
        total: totalCount,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        suspended: suspendedCount
      }
    });
  } catch (error) {
    console.error('Admin getInstitutes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch institutes', error: error.message });
  }
};

const getPendingInstitutes = async (req, res) => {
  try {
    const institutes = await User.find({
      userType: 'institute',
      status: { $in: ['pending', 'admin_approval_pending'] }
    })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: institutes });
  } catch (error) {
    console.error('Admin getPendingInstitutes error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending institutes', error: error.message });
  }
};

const getInstituteById = async (req, res) => {
  try {
    const institute = await User.findOne({ _id: req.params.id, userType: 'institute' }).select('-password');
    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }
    res.json({ success: true, data: institute });
  } catch (error) {
    console.error('Admin getInstituteById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch institute', error: error.message });
  }
};

const approveInstitute = async (req, res) => {
  try {
    const institute = await User.findOneAndUpdate(
      { _id: req.params.id, userType: 'institute' },
      {
        status: 'approved',
        isVerifiedByAdmin: true,
        isActive: true,
        adminVerifiedAt: new Date(),
        verifiedBy: req.userId
      },
      { new: true }
    ).select('-password');

    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }

    await Promise.all([
      Notification.create({
        recipient: institute._id,
        type: 'account_approved',
        title: 'Institute Approved',
        message: 'Your institute account has been approved by the administrator.',
        data: { approvedBy: req.userId }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: 'APPROVE_INSTITUTE',
        details: { instituteId: institute._id, instituteName: institute.instituteName },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);

    res.json({ success: true, message: 'Institute approved successfully', data: institute });
  } catch (error) {
    console.error('Admin approveInstitute error:', error);
    res.status(500).json({ success: false, message: 'Failed to approve institute', error: error.message });
  }
};

const rejectInstitute = async (req, res) => {
  try {
    const { reason } = req.body;

    const institute = await User.findOneAndUpdate(
      { _id: req.params.id, userType: 'institute' },
      {
        status: 'rejected',
        isActive: false,
        adminNotes: reason || 'Rejected by administrator'
      },
      { new: true }
    ).select('-password');

    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }

    await Promise.all([
      Notification.create({
        recipient: institute._id,
        type: 'account_rejected',
        title: 'Institute Rejected',
        message: `Your institute account has been rejected. Reason: ${reason || 'No reason provided'}`,
        data: { rejectedBy: req.userId, reason }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: 'REJECT_INSTITUTE',
        details: { instituteId: institute._id, instituteName: institute.instituteName, reason },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);

    res.json({ success: true, message: 'Institute rejected successfully', data: institute });
  } catch (error) {
    console.error('Admin rejectInstitute error:', error);
    res.status(500).json({ success: false, message: 'Failed to reject institute', error: error.message });
  }
};

const toggleInstituteStatus = async (req, res) => {
  try {
    const institute = await User.findOne({ _id: req.params.id, userType: 'institute' });
    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }
    institute.isActive = !institute.isActive;
    institute.status = institute.isActive ? 'approved' : 'suspended';
    await institute.save();

    const action = institute.isActive ? 'ACTIVATE_INSTITUTE' : 'SUSPEND_INSTITUTE';
    await Promise.all([
      Notification.create({
        recipient: institute._id,
        type: institute.isActive ? 'account_activated' : 'account_suspended',
        title: institute.isActive ? 'Institute Activated' : 'Institute Suspended',
        message: institute.isActive ? 'Your institute account was activated.' : 'Your institute account was suspended.',
        data: { changedBy: req.userId }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: action,
        details: { instituteId: institute._id, instituteName: institute.instituteName, status: institute.isActive ? 'activated' : 'suspended' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);

    res.json({ success: true, message: `Institute ${institute.isActive ? 'activated' : 'suspended'} successfully`, data: institute });
  } catch (error) {
    console.error('Admin toggleInstituteStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle institute status', error: error.message });
  }
};

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
        filter.status = { $in: ['pending', 'email_verified', 'phone_verified', 'admin_approval_pending'] };
      } else {
        filter.status = statusFilter;
      }
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Admin getUsers error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users', error: error.message });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = !user.isActive;
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
        message: user.isActive ? 'Your account has been activated.' : 'Your account has been suspended.',
        data: { changedBy: req.userId }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: action,
        details: { targetUserId: user._id, targetUserEmail: user.email, userType: user.userType, status: user.isActive ? 'activated' : 'suspended' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);

    res.json({ success: true, message: `User ${user.isActive ? 'activated' : 'suspended'} successfully`, data: user });
  } catch (error) {
    console.error('Admin toggleUserStatus error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle user status', error: error.message });
  }
};

const resetUserPassword = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const newPassword = req.body.password || Math.random().toString(36).slice(-10);
    user.password = newPassword;
    await user.save();

    await Promise.all([
      Notification.create({
        recipient: user._id,
        type: 'password_reset',
        title: 'Password Reset',
        message: 'Your password was reset by the administrator.',
        data: { changedBy: req.userId }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: 'RESET_USER_PASSWORD',
        details: { targetUserId: user._id, targetUserEmail: user.email },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);

    res.json({
      success: true,
      message: 'User password reset successfully',
      data: { userId: user._id, password: newPassword }
    });
  } catch (error) {
    console.error('Admin resetUserPassword error:', error);
    res.status(500).json({ success: false, message: 'Failed to reset user password', error: error.message });
  }
};

const getCertificates = async (req, res) => {
  try {
    const query = {};
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }

    const certificates = await Certificate.find(query)
      .populate('studentId', 'name email')
      .populate('courseId', 'courseName')
      .populate('instituteId', 'instituteName')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: certificates });
  } catch (error) {
    console.error('Admin getCertificates error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificates', error: error.message });
  }
};

const getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('courseId', 'courseName')
      .populate('instituteId', 'instituteName');

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    res.json({ success: true, data: certificate });
  } catch (error) {
    console.error('Admin getCertificateById error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch certificate', error: error.message });
  }
};

const revokeCertificate = async (req, res) => {
  try {
    const reason = req.body.reason || 'Revoked by administrator';

    const certificate = await Certificate.findById(req.params.id).populate('instituteId', 'instituteName email');
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }

    certificate.status = 'revoked';
    certificate.revokedAt = new Date();
    certificate.revocationReason = reason;
    await certificate.save();

    if (certificate.instituteId?.email) {
      try {
        await sendEmail({
          to: certificate.instituteId.email,
          subject: `Certificate Revoked: ${certificate.certificateCode}`,
          html: `<p>The certificate <strong>${certificate.certificateCode}</strong> has been revoked for reason: ${reason}</p>`
        });
      } catch (sendError) {
        console.error('Admin revokeCertificate email send error:', sendError);
      }
    }

    await Promise.all([
      Notification.create({
        recipient: certificate.instituteId?._id || null,
        type: 'certificate_revoked',
        title: 'Certificate Revoked',
        message: `Certificate ${certificate.certificateCode} has been revoked.`,
        data: { revokedBy: req.userId, reason }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: 'REVOKE_CERTIFICATE',
        details: { certificateId: certificate._id, certificateCode: certificate.certificateCode, reason },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);

    res.json({ success: true, message: 'Certificate revoked successfully', data: certificate });
  } catch (error) {
    console.error('Admin revokeCertificate error:', error);
    res.status(500).json({ success: false, message: 'Failed to revoke certificate', error: error.message });
  }
};

const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    const settingsObj = settings.toObject();
    if (settingsObj.email?.smtpPassword) {
      settingsObj.email.smtpPassword = '********';
    }

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    console.error('Admin getSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch settings', error: error.message });
  }
};

const updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const updateNested = (target, source) => {
      Object.keys(source).forEach((key) => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          updateNested(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      });
    };

    updateNested(settings, updates);

    if (settings.email?.smtpPassword === '********') {
      const existing = await Settings.findOne();
      if (existing?.email?.smtpPassword) {
        settings.email.smtpPassword = existing.email.smtpPassword;
      }
    }

    settings.updatedBy = req.userId;
    await settings.save();

    const settingsObj = settings.toObject();
    if (settingsObj.email?.smtpPassword) {
      settingsObj.email.smtpPassword = '********';
    }

    await Promise.all([
      Notification.create({
        recipient: req.userId,
        type: 'settings_updated',
        title: 'Settings Updated',
        message: 'System settings have been updated successfully.',
        data: { updatedBy: req.user.email }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: 'UPDATE_SETTINGS',
        details: { settingsUpdated: Object.keys(updates) },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);

    res.json({ success: true, message: 'Settings updated successfully', data: settingsObj });
  } catch (error) {
    console.error('Admin updateSettings error:', error);
    res.status(500).json({ success: false, message: 'Failed to update settings', error: error.message });
  }
};

const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const recipient = email || req.user?.email;

    if (!recipient) {
      return res.status(400).json({ success: false, message: 'Recipient email is required for test email.' });
    }

    await sendEmail({
      to: recipient,
      subject: 'Test Email from Certificate Verification System',
      html: `<p>This is a test email from the Certificate Verification System.</p><p>If you receive this, your email settings are working.</p>`
    });

    await ActivityLog.create({
      user: req.userId,
      userEmail: req.user?.email,
      action: 'TEST_EMAIL',
      details: { testEmailSentTo: recipient },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.json({ success: true, message: 'Test email sent successfully.' });
  } catch (error) {
    console.error('Admin testEmail error:', error);
    res.status(500).json({ success: false, message: 'Failed to send test email', error: error.message });
  }
};

module.exports = {
  getStats,
  getActivities,
  getInstitutes,
  getPendingInstitutes,
  getInstituteById,
  approveInstitute,
  rejectInstitute,
  toggleInstituteStatus,
  getUsers,
  toggleUserStatus,
  resetUserPassword,
  getCertificates,
  getCertificateById,
  revokeCertificate,
  getSettings,
  updateSettings,
  testEmail
};
