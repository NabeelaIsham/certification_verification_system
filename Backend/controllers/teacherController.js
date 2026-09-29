const User = require('../models/User');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const { signAccessToken } = require('../config/jwt');
const { isValidPassword: meetsPasswordPolicy, isValidEmail } = require('../utils/validators');

const createTeacher = async (req, res) => {
  try {
    if (req.body.permissions !== undefined) {
      const allowed = ['canCreateStudents', 'canEditStudents', 'canDeleteStudents', 'canIssueCertificates', 'canBulkUpload', 'canCreateCourses', 'canEditCourses'];
      if (!req.body.permissions || Array.isArray(req.body.permissions) || typeof req.body.permissions !== 'object' || Object.entries(req.body.permissions).some(([key, value]) => !allowed.includes(key) || typeof value !== 'boolean')) return res.status(400).json({ success: false, message: 'Permissions must contain valid boolean values.' });
    }
    const instituteId = req.userId; // Logged in institute admin
    console.log('Creating teacher for institute:', instituteId);
    
    const { 
      firstName, lastName, email, password, phone,
      department, designation, qualification, employeeId,
      assignedCourses, permissions
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !employeeId || !department) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    if (!meetsPasswordPolicy(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 10-128 characters and include uppercase, lowercase, and a number.'
      });
    }

    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: 'Valid email is required.' });
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
        _id: { $in: assignedCourses },
        instituteId: instituteId
      });
      
      if (validCourses.length !== assignedCourses.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more assigned courses are invalid or do not belong to your institute'
        });
      }
    }

    // Create teacher with proper institute link
    const teacher = new User({
      firstName,
      lastName,
      email: normalizedEmail,
      password,
      phone: phone || '',
      department,
      designation: designation || '',
      qualification: qualification || '',
      employeeId,
      userType: 'teacher',
      instituteId: instituteId, // CRITICAL: Link to institute
      assignedCourses: assignedCourses || [], // CRITICAL: Store assigned courses
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

    await teacher.save();
    console.log('Teacher saved successfully with ID:', teacher._id);
    console.log('Linked to institute:', teacher.instituteId);
    console.log('Assigned courses:', teacher.assignedCourses);

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
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
    console.error('❌ Create teacher error:', error);
    
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

// Get all teachers for an institute (Institute Admin only)
const getTeachers = async (req, res) => {
  try {
    const instituteId = req.userId;
    const { search } = req.query;

    let query = { 
      instituteId, 
      userType: 'teacher' 
    };
    
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const teachers = await User.find(query)
      .select('-password')
      .populate('assignedCourses', 'courseName courseCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: teachers
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch teachers' 
    });
  }
};

// Get single teacher by ID (Institute Admin only)
const getTeacherById = async (req, res) => {
  try {
    const instituteId = req.userId;
    const { id } = req.params;

    const teacher = await User.findOne({ 
      _id: id, 
      instituteId, 
      userType: 'teacher' 
    })
      .select('-password')
      .populate('assignedCourses', 'courseName courseCode')
      .populate('instituteId', 'instituteName email');

    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    res.json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Get teacher error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch teacher' 
    });
  }
};

// Update teacher (Institute Admin only)
const updateTeacher = async (req, res) => {
  try {
    if (req.body.permissions !== undefined) {
      const allowed = ['canCreateStudents', 'canEditStudents', 'canDeleteStudents', 'canIssueCertificates', 'canBulkUpload', 'canCreateCourses', 'canEditCourses'];
      if (!req.body.permissions || Array.isArray(req.body.permissions) || typeof req.body.permissions !== 'object' || Object.entries(req.body.permissions).some(([key, value]) => !allowed.includes(key) || typeof value !== 'boolean')) return res.status(400).json({ success: false, message: 'Permissions must contain valid boolean values.' });
    }
    const instituteId = req.userId;
    const { id } = req.params;
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => ['firstName', 'lastName', 'phone', 'department', 'designation', 'qualification', 'employeeId', 'assignedCourses', 'permissions', 'isActive'].includes(key)));
    delete updates.twoFactorEnabled;
    delete updates.sessionVersion;

    // Prevent sensitive updates
    delete updates.password;
    delete updates._id;
    delete updates.instituteId;
    delete updates.userType;
    delete updates.email;

    // If updating assigned courses, verify they belong to institute
    if (updates.assignedCourses) {
      const validCourses = await Course.find({
        _id: { $in: updates.assignedCourses },
        instituteId: instituteId
      });
      
      if (validCourses.length !== updates.assignedCourses.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more assigned courses are invalid'
        });
      }
    }

    const teacher = await User.findOneAndUpdate(
      { _id: id, instituteId, userType: 'teacher' },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: teacher
    });
  } catch (error) {
    console.error('Update teacher error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update teacher' 
    });
  }
};

// Delete teacher (Institute Admin only)
const deleteTeacher = async (req, res) => {
  try {
    const instituteId = req.userId;
    const { id } = req.params;

    const teacher = await User.findOneAndDelete({ 
      _id: id, 
      instituteId, 
      userType: 'teacher' 
    });

    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    res.json({
      success: true,
      message: 'Teacher deleted successfully'
    });
  } catch (error) {
    console.error('Delete teacher error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete teacher' 
    });
  }
};

// ============ TEACHER FUNCTIONS (Self-service) ============

// Teacher login
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

    if (teacher.twoFactorEnabled) return await require('./twoFactorController').beginTwoFactor(teacher, res);

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
    console.error('Teacher login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Login failed' 
    });
  }
};

// Get teacher profile with assigned courses
const getTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.userId;

    const teacher = await User.findById(teacherId)
      .select('-password')
      .populate({
        path: 'instituteId',
        select: 'instituteName email phone address'
      })
      .populate({
        path: 'assignedCourses',
        select: 'courseName courseCode description status',
        match: { status: 'active' }
      });

    if (!teacher || teacher.userType !== 'teacher') {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    console.log(`Teacher ${teacher.email} belongs to institute:`, teacher.instituteId?._id);

    res.json({
      success: true,
      data: teacher
    });
  } catch (error) {
    console.error('Get teacher profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile' 
    });
  }
};

// Get teacher's students (ONLY from their assigned courses)
const getMyStudents = async (req, res) => {
  try {
    const teacherId = req.userId;
    const teacher = await User.findById(teacherId);

    if (!teacher || teacher.userType !== 'teacher') {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    console.log('Teacher institute ID:', teacher.instituteId);
    console.log('Teacher assigned courses:', teacher.assignedCourses);

    // If no courses assigned, return empty array
    if (!teacher.assignedCourses || teacher.assignedCourses.length === 0) {
      return res.json({
        success: true,
        data: [],
        message: 'No courses assigned to you'
      });
    }

    // Get students that belong to:
    // 1. The same institute as the teacher
    // 2. Courses that are in the teacher's assignedCourses array
    const students = await Student.find({
      instituteId: teacher.instituteId, // CRITICAL: Filter by institute
      courseId: { $in: teacher.assignedCourses } // CRITICAL: Filter by assigned courses
    }).populate({
      path: 'courseId',
      select: 'courseName courseCode'
    });

    console.log(`Found ${students.length} students for teacher ${teacher.email}`);

    // Get certificate status for each student
    const studentsWithStatus = await Promise.all(
      students.map(async (student) => {
        const certificate = await Certificate.findOne({
          studentId: student._id,
          courseId: student.courseId?._id,
          instituteId: teacher.instituteId,
          status: 'issued'
        }).select('certificateCode awardDate');
        
        return {
          ...student.toObject(),
          hasCertificate: !!certificate,
          certificateCode: certificate?.certificateCode,
          certificateDate: certificate?.awardDate
        };
      })
    );

    res.json({
      success: true,
      data: studentsWithStatus,
      total: studentsWithStatus.length,
      instituteId: teacher.instituteId
    });
  } catch (error) {
    console.error('Get my students error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch students',
      error: error.message
    });
  }
};

// Get teacher's assigned courses with stats
const getMyCourses = async (req, res) => {
  try {
    const teacherId = req.userId;
    const teacher = await User.findById(teacherId);

    if (!teacher || teacher.userType !== 'teacher') {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    if (!teacher.assignedCourses || teacher.assignedCourses.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get detailed course information for assigned courses
    const courses = await Course.find({
      _id: { $in: teacher.assignedCourses },
      instituteId: teacher.instituteId,
      status: 'active'
    }).select('courseName courseCode description');

    // Get student count and certificate count for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const studentCount = await Student.countDocuments({
          instituteId: teacher.instituteId,
          courseId: course._id
        });

        const certificateCount = await Certificate.countDocuments({
          instituteId: teacher.instituteId,
          courseId: course._id,
          status: 'issued'
        });

        return {
          ...course.toObject(),
          studentCount,
          certificateCount,
          pendingCount: studentCount - certificateCount
        };
      })
    );

    res.json({
      success: true,
      data: coursesWithStats
    });
  } catch (error) {
    console.error('Get my courses error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch courses' 
    });
  }
};

// Get templates for a specific course (only if assigned to teacher)
const getTemplatesForCourse = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { courseId } = req.params;

    console.log(`Fetching templates for course ${courseId} for teacher ${teacherId}`);

    const teacher = await User.findById(teacherId);

    if (!teacher || teacher.userType !== 'teacher') {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    // Verify the course is assigned to this teacher
    if (!teacher.assignedCourses || !teacher.assignedCourses.some(id => String(id) === String(courseId))) {
      console.log('Course not assigned to teacher. Assigned courses:', teacher.assignedCourses);
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access templates for this course'
      });
    }

    // Verify the course exists and belongs to the teacher's institute
    const course = await Course.findOne({
      _id: courseId,
      instituteId: teacher.instituteId,
      status: 'active'
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found or inactive'
      });
    }

    // Get templates for this course
    const templates = await CertificateTemplate.find({
      instituteId: teacher.instituteId,
      courseId: courseId,
      isActive: true
    }).select('templateName templateImage fields imageFields qrCodePosition createdAt');

    console.log(`Found ${templates.length} templates for course ${courseId}`);

    // If no templates found, try to get templates without courseId filter (optional)
    if (templates.length === 0) {
      console.log('No templates found with courseId, checking general templates...');
      const generalTemplates = await CertificateTemplate.find({
        instituteId: teacher.instituteId,
        isActive: true
      }).select('templateName templateImage fields imageFields qrCodePosition createdAt');
      const baseUrl = process.env.API_URL || 'http://localhost:5000';
      
      return res.json({
        success: true,
        data: generalTemplates.map(template => ({
          ...template.toObject(),
          templateImageUrl: `${baseUrl}/${template.templateImage}`,
          imageFields: (template.imageFields || []).map(field => ({
            ...field.toObject(),
            imageUrl: `${baseUrl}/${field.imagePath}`
          }))
        })),
        message: 'Showing all available templates for your institute'
      });
    }
    const baseUrl = process.env.API_URL || 'http://localhost:5000';

    res.json({
      success: true,
      data: templates.map(template => ({
        ...template.toObject(),
        templateImageUrl: `${baseUrl}/${template.templateImage}`,
        imageFields: (template.imageFields || []).map(field => ({
          ...field.toObject(),
          imageUrl: `${baseUrl}/${field.imagePath}`
        }))
      }))
    });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};

// Issue certificate (with strict permission checks and image generation)
const issueCertificateAsTeacher = (req, res) => require('../services/certificateIssuanceService').issueHttp(req, res);

// Update teacher profile (self)
const updateTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.userId;
    const editableFields = ['firstName', 'lastName', 'phone', 'department', 'designation', 'qualification'];
    const updates = Object.fromEntries(Object.entries(req.body).filter(([key]) => editableFields.includes(key)));

    const teacher = await User.findByIdAndUpdate(
      teacherId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!teacher) {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        phone: teacher.phone,
        department: teacher.department,
        designation: teacher.designation,
        qualification: teacher.qualification
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update profile' 
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { currentPassword, newPassword } = req.body;
    if (!meetsPasswordPolicy(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be 10-128 characters and include uppercase, lowercase, and a number.'
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
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

// ============ EXPORT ALL FUNCTIONS ============

module.exports = {
  // Institute admin functions
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  
  // Teacher functions
  teacherLogin,
  getTeacherProfile,
  getMyStudents,
  getMyCourses,
  getTemplatesForCourse,
  issueCertificateAsTeacher,
  updateTeacherProfile,
  changePassword
};
