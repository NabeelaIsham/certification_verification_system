const User = require('../models/User');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');

// Get institute profile
const getProfile = async (req, res) => {
  try {
    const instituteId = req.userId;
    
    const institute = await User.findById(instituteId).select('-password');
    
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
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

// Get institute statistics
const getStats = async (req, res) => {
  try {
    const instituteId = req.userId;

    const [
      totalStudents, 
      totalCourses, 
      certificatesIssued,
      activeCourses,
      completedStudents,
      totalTemplates
    ] = await Promise.all([
      Student.countDocuments({ instituteId }),
      Course.countDocuments({ instituteId }),
      Certificate.countDocuments({ instituteId }),
      Course.countDocuments({ instituteId, status: 'active' }),
      Student.countDocuments({ instituteId, status: 'completed' }),
      CertificateTemplate.countDocuments({ instituteId })
    ]);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalCourses,
        certificatesIssued,
        activeCourses,
        completedStudents,
        totalTemplates,
        pendingVerifications: 0
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update institute settings
const updateSettings = async (req, res) => {
  try {
    const instituteId = req.userId;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates._id;
    delete updates.userType;
    delete updates.email;
    delete updates.isEmailVerified;
    delete updates.isPhoneVerified;
    delete updates.isVerifiedByAdmin;
    delete updates.status;

    const institute = await User.findByIdAndUpdate(
      instituteId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: institute
    });
  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update settings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const instituteId = req.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const institute = await User.findById(instituteId);
    
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    // Verify current password
    const isValidPassword = await institute.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Set new password (will be hashed by pre-save hook)
    institute.password = newPassword;
    await institute.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// Export all functions
module.exports = {
  getProfile,
  getStats,
  updateSettings,
  changePassword
};