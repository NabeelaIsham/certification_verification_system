const User = require('../models/User');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sanitizeUploadedImage } = require('../utils/imageUploadSecurity');
const { isValidPassword: meetsPasswordPolicy } = require('../utils/validators');

const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '..', 'uploads', 'logos', req.user.id);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `logo-${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const uploadLogoFile = multer({
  storage: logoStorage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    }

    cb(new Error('Only JPG, PNG, or WebP logo files are allowed'));
  }
}).single('logo');

const toRelativeUploadPath = (filePath) => path
  .relative(path.join(__dirname, '..'), filePath)
  .replace(/\\/g, '/');

const removeUploadedFile = (relativePath) => {
  if (!relativePath) return;

  const normalizedPath = relativePath.replace(/\\/g, '/');
  if (!normalizedPath.startsWith('uploads/logos/')) return;

  const absolutePath = path.join(__dirname, '..', normalizedPath);
  fs.unlink(absolutePath, (error) => {
    if (error && error.code !== 'ENOENT') {
      console.error('Logo cleanup error:', error);
    }
  });
};

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
    delete updates.twoFactorEnabled;

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates._id;
    delete updates.userType;
    delete updates.email;
    delete updates.logo;
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

// Upload institute logo
const uploadLogo = async (req, res) => {
  uploadLogoFile(req, res, async function(err) {
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    try {
      const instituteId = req.userId;
      const logoFile = req.file;

      if (!logoFile) {
        return res.status(400).json({
          success: false,
          message: 'Logo file is required'
        });
      }
      await sanitizeUploadedImage(logoFile);

      const institute = await User.findById(instituteId);
      if (!institute) {
        removeUploadedFile(toRelativeUploadPath(logoFile.path));
        return res.status(404).json({
          success: false,
          message: 'Institute not found'
        });
      }

      const previousLogo = institute.logo;
      institute.logo = toRelativeUploadPath(logoFile.path);
      await institute.save();
      removeUploadedFile(previousLogo);

      res.json({
        success: true,
        message: 'Logo uploaded successfully',
        data: institute.toSafeObject()
      });
    } catch (error) {
      if (req.file) {
        removeUploadedFile(toRelativeUploadPath(req.file.path));
      }

      console.error('Logo upload error:', error);
      res.status(error.code === 'INVALID_IMAGE' ? 400 : 500).json({
        success: false,
        message: 'Failed to upload logo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
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

    if (!meetsPasswordPolicy(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 10-128 characters and include uppercase, lowercase, and a number.'
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
  uploadLogo,
  changePassword
};
