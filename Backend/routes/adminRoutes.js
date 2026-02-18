const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');  // Fixed path
const Notification = require('../models/Notification');  // Fixed path

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

    if (!user || user.userType !== 'superadmin' || !user.isActive) {
      return res.status(403).json({ 
        success: false,
        message: 'Access denied. Super admin only.' 
      });
    }

    req.userId = user._id;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false,
      message: 'Invalid token' 
    });
  }
};

// 1. Get pending institutes
router.get('/institutes/pending', verifySuperAdmin, async (req, res) => {
  try {
    const pendingInstitutes = await User.find({
      userType: 'institute',
      status: 'admin_approval_pending',
      isEmailVerified: true,
      isPhoneVerified: true,
      isVerifiedByAdmin: false
    }).select('-password');

    res.json({
      success: true,
      institutes: pendingInstitutes,
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

// 2. Approve institute
router.post('/institutes/:id/approve', verifySuperAdmin, async (req, res) => {
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

    // Update institute status
    institute.isVerifiedByAdmin = true;
    institute.isActive = true;
    institute.status = 'approved';
    institute.adminVerifiedAt = new Date();
    institute.adminNotes = notes || '';

    await institute.save();

    // Send notification to institute
    await Notification.create({
      recipient: institute._id,
      type: 'account_approved',
      title: 'Account Approved',
      message: 'Your institute account has been approved by the super admin.',
      data: {
        instituteId: institute._id,
        instituteName: institute.instituteName
      }
    });

    res.json({
      success: true,
      message: 'Institute approved successfully'
    });

  } catch (error) {
    console.error('Error approving institute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve institute'
    });
  }
});

// 3. Reject institute
router.post('/institutes/:id/reject', verifySuperAdmin, async (req, res) => {
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

    // Update institute status
    institute.status = 'rejected';
    institute.isActive = false;
    institute.adminNotes = reason || '';

    await institute.save();

    // Send notification to institute
    await Notification.create({
      recipient: institute._id,
      type: 'account_rejected',
      title: 'Account Rejected',
      message: `Your institute account has been rejected. Reason: ${reason}`,
      data: {
        instituteId: institute._id,
        instituteName: institute.instituteName
      }
    });

    res.json({
      success: true,
      message: 'Institute rejected successfully'
    });

  } catch (error) {
    console.error('Error rejecting institute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject institute'
    });
  }
});

// 4. Get all institutes
router.get('/institutes', verifySuperAdmin, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { userType: 'institute' };
    if (status) query.status = status;

    const institutes = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      institutes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching institutes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch institutes'
    });
  }
});

// 5. Get notifications
router.get('/notifications', verifySuperAdmin, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(20);

    // Mark as read if specified
    if (req.query.markRead === 'true') {
      await Notification.updateMany(
        { recipient: req.userId, isRead: false },
        { $set: { isRead: true } }
      );
    }

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications'
    });
  }
});

// 6. Get dashboard stats
router.get('/dashboard/stats', verifySuperAdmin, async (req, res) => {
  try {
    const [
      totalInstitutes,
      pendingInstitutes,
      approvedInstitutes,
      rejectedInstitutes
    ] = await Promise.all([
      User.countDocuments({ userType: 'institute' }),
      User.countDocuments({ 
        userType: 'institute', 
        status: 'admin_approval_pending' 
      }),
      User.countDocuments({ 
        userType: 'institute', 
        status: 'approved' 
      }),
      User.countDocuments({ 
        userType: 'institute', 
        status: 'rejected' 
      })
    ]);

    res.json({
      success: true,
      stats: {
        totalInstitutes,
        pendingInstitutes,
        approvedInstitutes,
        rejectedInstitutes
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats'
    });
  }
});

module.exports = router;