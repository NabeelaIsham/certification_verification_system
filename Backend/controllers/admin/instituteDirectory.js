const { appLogger } = require('../../utils/logger.js');
const User = require('../../models/User');
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
    appLogger.log(
      'Admin getInstitutes called by:',
      req.user?.email || req.userId,
      'query:',
      req.query
    );
    const institutes = await User.find({
      userType: 'institute',
      ...filter
    })
      .select('-password')
      .sort({
        createdAt: -1
      });
    appLogger.log(`Found ${institutes.length} institutes for filter:`, filter);

    // Get counts for all statuses
    const [
      totalCount,
      pendingCount,
      approvedCount,
      rejectedCount,
      suspendedCount
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
      })
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
    appLogger.error('Admin getInstitutes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institutes',
      error: error.message
    });
  }
};
const getPendingInstitutes = async (req, res) => {
  try {
    const institutes = await User.find({
      userType: 'institute',
      status: {
        $in: ['pending', 'admin_approval_pending']
      }
    })
      .select('-password')
      .sort({
        createdAt: -1
      });
    res.json({
      success: true,
      data: institutes
    });
  } catch (error) {
    appLogger.error('Admin getPendingInstitutes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending institutes',
      error: error.message
    });
  }
};
const getInstituteById = async (req, res) => {
  try {
    const institute = await User.findOne({
      _id: req.params.id,
      userType: 'institute'
    }).select('-password');
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }
    res.json({
      success: true,
      data: institute
    });
  } catch (error) {
    appLogger.error('Admin getInstituteById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institute',
      error: error.message
    });
  }
};
module.exports = {
  getInstitutes,
  getPendingInstitutes,
  getInstituteById
};
