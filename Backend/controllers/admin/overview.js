const { appLogger } = require('../../utils/logger.js');
const User = require('../../models/User');
const Certificate = require('../../models/Certificate');
const ActivityLog = require('../../models/ActivityLog');
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
      activeUsers,
      totalUsers
    ] = await Promise.all([
      User.countDocuments({
        userType: 'institute'
      }),
      User.countDocuments({
        userType: 'institute',
        isVerifiedByAdmin: false
      }),
      User.countDocuments({
        userType: 'institute',
        isVerifiedByAdmin: true,
        isActive: true
      }),
      User.countDocuments({
        userType: 'institute',
        status: 'rejected'
      }),
      User.countDocuments({
        userType: 'institute',
        isActive: false
      }),
      User.countDocuments({
        userType: 'teacher'
      }),
      Certificate.countDocuments(),
      Certificate.countDocuments({
        status: 'revoked'
      }),
      User.countDocuments({
        isActive: true
      }),
      User.countDocuments()
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
        activeUsers,
        totalUsers
      }
    });
  } catch (error) {
    appLogger.error('Admin getStats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin stats',
      error: error.message
    });
  }
};
const getActivities = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const filter = req.query.action
      ? {
          action: req.query.action
        }
      : {};
    const [activities, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('user', 'name email userType')
        .sort({
          timestamp: -1
        })
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
    appLogger.error('Admin getActivities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: error.message
    });
  }
};
module.exports = {
  getStats,
  getActivities
};
