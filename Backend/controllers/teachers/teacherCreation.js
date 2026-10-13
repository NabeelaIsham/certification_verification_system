const {
  isValidTeacherPermissions
} = require('../../validation/teacherPermissions');
const { appLogger } = require('../../utils/logger.js');
const User = require('../../models/User');
const Course = require('../../models/Course');
const {
  isValidPassword: meetsPasswordPolicy,
  isValidEmail
} = require('../../utils/validators');
const createTeacher = async (req, res) => {
  try {
    if (!isValidTeacherPermissions(req.body.permissions))
      return res
        .status(400)
        .json({
          success: false,
          message: 'Permissions must contain valid boolean values.'
        });
    const instituteId = req.userId; // Logged in institute admin
    appLogger.log('Creating teacher for institute:', instituteId);
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      department,
      designation,
      qualification,
      employeeId,
      assignedCourses,
      permissions
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !employeeId || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    if (password !== undefined && !meetsPasswordPolicy(password)) {
      return res.status(400).json({
        success: false,
        message:
          'Password must be 10-128 characters and include uppercase, lowercase, and a number.'
      });
    }
    if (!isValidEmail(email))
      return res.status(400).json({
        success: false,
        message: 'Valid email is required.'
      });
    const normalizedEmail = email.trim().toLowerCase();
    // Login identities are globally unique, across all roles and institutes.
    const existingTeacher = await User.findOne({
      email: normalizedEmail
    });
    if (existingTeacher) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists'
      });
    }

    // Check if employeeId is unique within this institute
    const existingEmployeeId = await User.findOne({
      instituteId,
      employeeId,
      userType: 'teacher'
    });
    if (existingEmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID already exists in your institute'
      });
    }

    // Verify assigned courses belong to this institute
    if (assignedCourses && assignedCourses.length > 0) {
      const validCourses = await Course.find({
        _id: {
          $in: assignedCourses
        },
        instituteId: instituteId
      });
      if (validCourses.length !== assignedCourses.length) {
        return res.status(400).json({
          success: false,
          message:
            'One or more assigned courses are invalid or do not belong to your institute'
        });
      }
    }

    // Create teacher with proper institute link
    let teacher = new User({
      firstName,
      lastName,
      email: normalizedEmail,
      password:
        password || require('crypto').randomBytes(48).toString('base64url'),
      phone: phone || '',
      department,
      designation: designation || '',
      qualification: qualification || '',
      employeeId,
      userType: 'teacher',
      instituteId: instituteId,
      // CRITICAL: Link to institute
      assignedCourses: assignedCourses || [],
      // CRITICAL: Store assigned courses
      permissions: permissions || {
        canCreateStudents: true,
        canEditStudents: true,
        canDeleteStudents: false,
        canIssueCertificates: true,
        canBulkUpload: false,
        canCreateCourses: false,
        canEditCourses: false
      },
      isActive: true,
      isEmailVerified: true,
      isVerifiedByAdmin: true
    });
    teacher =
      await require('../../services/subscriptionService').saveLimitedResource(
        teacher,
        'teachers'
      );
    let invitationEmailSent = false;
    let invitationMessage;
    try {
      await require('../../services/teacherAccessService').sendTeacherAccess(
        instituteId,
        teacher._id,
        true
      );
      invitationEmailSent = true;
    } catch {
      invitationMessage =
        'The account was created, but the invitation email was not sent. Use Send reset link to retry after checking email settings.';
    }
    appLogger.log('Teacher saved successfully with ID:', teacher._id);
    appLogger.log('Linked to institute:', teacher.instituteId);
    appLogger.log('Assigned courses:', teacher.assignedCourses);
    res.status(201).json({
      success: true,
      message:
        invitationMessage ||
        'Teacher created. A password-setup invitation has been emailed to the teacher.',
      invitationEmailSent,
      data: {
        id: teacher._id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        email: teacher.email,
        employeeId: teacher.employeeId,
        department: teacher.department,
        instituteId: teacher.instituteId,
        assignedCourses: teacher.assignedCourses
      }
    });
  } catch (error) {
    appLogger.error('❌ Create teacher error:', error);
    if (error.status)
      return res.status(error.status).json({
        success: false,
        message: error.message
      });
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists. Please use a different value.`
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create teacher',
      error: error.message
    });
  }
};
module.exports = {
  createTeacher
};
