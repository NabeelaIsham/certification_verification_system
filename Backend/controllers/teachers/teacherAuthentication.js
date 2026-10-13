const { appLogger } = require('../../utils/logger.js');
const User = require('../../models/User');
const { signAccessToken } = require('../../config/jwt');
const {
  isValidPassword: meetsPasswordPolicy
} = require('../../utils/validators');
const teacherLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    const teacher = await User.findOne({
      email: email.toLowerCase().trim(),
      userType: 'teacher',
      isActive: true
    }).populate('instituteId', 'instituteName');
    if (!teacher) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    const isMatch = await teacher.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    if (teacher.twoFactorEnabled)
      return await require('.././twoFactorController').beginTwoFactor(
        teacher,
        res
      );
    const token = signAccessToken(teacher, {
      instituteId: teacher.instituteId?._id || teacher.instituteId
    });
    res.json({
      success: true,
      token,
      user: {
        id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        userType: 'teacher',
        instituteId: teacher.instituteId?._id || teacher.instituteId,
        instituteName: teacher.instituteId?.instituteName,
        department: teacher.department,
        designation: teacher.designation,
        employeeId: teacher.employeeId,
        permissions: teacher.permissions
      }
    });
  } catch (error) {
    appLogger.error('Teacher login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};
const changePassword = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { currentPassword, newPassword } = req.body;
    if (!meetsPasswordPolicy(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be 10-128 characters and include uppercase, lowercase, and a number.'
      });
    }
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Verify current password
    const isValidPassword = await teacher.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Set new password
    teacher.password = newPassword;
    teacher.sessionVersion = (teacher.sessionVersion || 0) + 1;
    await teacher.save();
    res.json({
      success: true,
      message: 'Password changed successfully. Please sign in again.'
    });
  } catch (error) {
    appLogger.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};
module.exports = {
  teacherLogin,
  changePassword
};
