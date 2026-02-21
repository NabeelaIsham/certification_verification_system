const Institute = require('../models/Institute');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Register a new institute
const register = async (req, res) => {
  try {
    const { instituteName, email, password, phone, address } = req.body;

    // Check if institute already exists
    const existingInstitute = await Institute.findOne({ email });
    if (existingInstitute) {
      return res.status(400).json({ success: false, message: 'Institute already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new institute
    const institute = new Institute({
      instituteName,
      email,
      password: hashedPassword,
      phone,
      address
    });

    await institute.save();

    // Generate token
    const token = jwt.sign(
      { id: institute._id, email: institute.email, userType: 'institute' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'Institute registered successfully',
      data: {
        token,
        user: {
          id: institute._id,
          instituteName: institute.instituteName,
          email: institute.email,
          userType: 'institute'
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login institute
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find institute
    const institute = await Institute.findOne({ email });
    if (!institute) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, institute.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if institute is active
    if (!institute.isActive) {
      return res.status(403).json({ 
        success: false, 
        message: 'Account is deactivated. Please contact administrator.' 
      });
    }

    // Generate token
    const token = jwt.sign(
      { id: institute._id, email: institute.email, userType: 'institute' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: institute._id,
          instituteName: institute.instituteName,
          email: institute.email,
          userType: 'institute',
          phone: institute.phone,
          address: institute.address
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get institute statistics
const getStats = async (req, res) => {
  try {
    const instituteId = req.user.id;

    const [
      totalStudents, 
      totalCourses, 
      certificatesIssued,
      activeCourses,
      completedStudents
    ] = await Promise.all([
      Student.countDocuments({ instituteId }),
      Course.countDocuments({ instituteId }),
      Certificate.countDocuments({ instituteId }),
      Course.countDocuments({ instituteId, status: 'active' }),
      Student.countDocuments({ instituteId, status: 'completed' })
    ]);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalCourses,
        certificatesIssued,
        activeCourses,
        completedStudents,
        pendingVerifications: 0 // You can implement this based on your requirements
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
    const instituteId = req.user.id;
    const updates = req.body;

    // Remove sensitive fields from updates
    delete updates.password;
    delete updates._id;
    delete updates.userType;

    const institute = await Institute.findByIdAndUpdate(
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

// Get institute profile
const getProfile = async (req, res) => {
  try {
    const instituteId = req.user.id;
    
    const institute = await Institute.findById(instituteId).select('-password');
    
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

// Change password
const changePassword = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const institute = await Institute.findById(instituteId);
    
    if (!institute) {
      return res.status(404).json({
        success: false,
        message: 'Institute not found'
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, institute.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    institute.password = hashedPassword;
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
  register,
  login,
  getStats,
  updateSettings,
  getProfile,
  changePassword
};