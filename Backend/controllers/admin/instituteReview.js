const { appLogger } = require('../../utils/logger.js');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const ActivityLog = require('../../models/ActivityLog');
const approveInstitute = async (req, res) => {
  try {
    const institute = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        userType: 'institute'
      },
      {
        status: 'approved',
        isVerifiedByAdmin: true,
        isActive: true,
        adminVerifiedAt: new Date(),
        verifiedBy: req.userId
      },
      {
        new: true
      }
    ).select('-password');
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }
    await Promise.all([
      Notification.create({
        recipient: institute._id,
        type: 'account_approved',
        title: 'Institute Approved',
        message:
          'Your institute account has been approved by the administrator.',
        data: {
          approvedBy: req.userId
        }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: 'APPROVE_INSTITUTE',
        details: {
          instituteId: institute._id,
          instituteName: institute.instituteName
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);
    res.json({
      success: true,
      message: 'Institute approved successfully',
      data: institute
    });
  } catch (error) {
    appLogger.error('Admin approveInstitute error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve institute',
      error: error.message
    });
  }
};
const rejectInstitute = async (req, res) => {
  try {
    const { reason } = req.body;
    const institute = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        userType: 'institute'
      },
      {
        status: 'rejected',
        isActive: false,
        adminNotes: reason || 'Rejected by administrator'
      },
      {
        new: true
      }
    ).select('-password');
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }
    await Promise.all([
      Notification.create({
        recipient: institute._id,
        type: 'account_rejected',
        title: 'Institute Rejected',
        message: `Your institute account has been rejected. Reason: ${reason || 'No reason provided'}`,
        data: {
          rejectedBy: req.userId,
          reason
        }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: 'REJECT_INSTITUTE',
        details: {
          instituteId: institute._id,
          instituteName: institute.instituteName,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);
    res.json({
      success: true,
      message: 'Institute rejected successfully',
      data: institute
    });
  } catch (error) {
    appLogger.error('Admin rejectInstitute error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject institute',
      error: error.message
    });
  }
};
const toggleInstituteStatus = async (req, res) => {
  try {
    const institute = await User.findOne({
      _id: req.params.id,
      userType: 'institute'
    });
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }
    institute.isActive = !institute.isActive;
    institute.status = institute.isActive ? 'approved' : 'suspended';
    await institute.save();
    const action = institute.isActive
      ? 'ACTIVATE_INSTITUTE'
      : 'SUSPEND_INSTITUTE';
    await Promise.all([
      Notification.create({
        recipient: institute._id,
        type: institute.isActive ? 'account_activated' : 'account_suspended',
        title: institute.isActive
          ? 'Institute Activated'
          : 'Institute Suspended',
        message: institute.isActive
          ? 'Your institute account was activated.'
          : 'Your institute account was suspended.',
        data: {
          changedBy: req.userId
        }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: action,
        details: {
          instituteId: institute._id,
          instituteName: institute.instituteName,
          status: institute.isActive ? 'activated' : 'suspended'
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);
    res.json({
      success: true,
      message: `Institute ${institute.isActive ? 'activated' : 'suspended'} successfully`,
      data: institute
    });
  } catch (error) {
    appLogger.error('Admin toggleInstituteStatus error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle institute status',
      error: error.message
    });
  }
};
module.exports = {
  approveInstitute,
  rejectInstitute,
  toggleInstituteStatus
};
