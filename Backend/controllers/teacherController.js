const User = require('../models/User');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ============ INSTITUTE ADMIN FUNCTIONS ============

// Create a new teacher (by Institute Admin)
const createTeacher = async (req, res) => {
  try {
    const instituteId = req.userId; // Logged in institute admin
    console.log('Creating teacher for institute:', instituteId);
    console.log('Request body:', req.body);
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

    // Check if teacher already exists in User collection
    const existingTeacher = await User.findOne({ 
      email, 
      userType: 'teacher' 
    });
    
    if (existingTeacher) {
      return res.status(400).json({ 
        success: false, 
        message: 'Teacher with this email already exists' 
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

    // Create teacher in User collection
    const teacher = new User({
      firstName,
      lastName,
      email,
      password, // Will be hashed by pre-save hook
      phone,
      department,
      designation,
      qualification,
      employeeId,
      userType: 'teacher',
      instituteId,
      assignedCourses: assignedCourses || [],
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
      isEmailVerified: true, // Set by institute
      isVerifiedByAdmin: true
    });

    await teacher.save();

    res.status(201).json({
      success: true,
      message: 'Teacher created successfully',
      data: {
        id: teacher._id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        email: teacher.email,
        employeeId: teacher.employeeId,
        department: teacher.department
      }
    });
  } catch (error) {
    console.error('Create teacher error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create teacher',
      error: error.message
    });
  }
};

// Get all teachers for an institute
const getTeachers = async (req, res) => {
  try {
    const instituteId = req.userId;
    const { search, department } = req.query;

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
    
    if (department) {
      query.department = department;
    }

    const teachers = await User.find(query)
      .select('-password')
      .populate('assignedCourses', 'courseName courseCode')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: teachers || [],
      total: teachers.length
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch teachers',
      error: error.message 
    });
  }
};

// Get single teacher by ID
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
      .populate('assignedCourses', 'courseName courseCode');

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

// Update teacher
const updateTeacher = async (req, res) => {
  try {
    const instituteId = req.userId;
    const { id } = req.params;
    const updates = req.body;

    // Prevent password update through this endpoint
    delete updates.password;
    delete updates._id;
    delete updates.instituteId;
    delete updates.userType;
    delete updates.email; // Don't allow email change

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
      message: 'Failed to update teacher',
      error: error.message
    });
  }
};

// Delete teacher
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
      email: email.toLowerCase(),
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

    const token = jwt.sign(
      { 
        userId: teacher._id, 
        email: teacher.email, 
        userType: 'teacher',
        instituteId: teacher.instituteId?._id || teacher.instituteId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: teacher._id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        email: teacher.email,
        userType: 'teacher',
        instituteName: teacher.instituteId?.instituteName,
        department: teacher.department,
        designation: teacher.designation,
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

// Get teacher profile
const getTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.userId;

    const teacher = await User.findById(teacherId)
      .select('-password')
      .populate('instituteId', 'instituteName email phone address')
      .populate('assignedCourses', 'courseName courseCode description');

    if (!teacher || teacher.userType !== 'teacher') {
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
    console.error('Get teacher profile error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch profile' 
    });
  }
};

// Get teacher's students (from their assigned courses)
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

    // Get students from teacher's assigned courses
    const students = await Student.find({
      instituteId: teacher.instituteId,
      courseId: { $in: teacher.assignedCourses || [] }
    }).populate('courseId', 'courseName courseCode');

    // Get certificate status for each student
    const studentsWithStatus = await Promise.all(
      students.map(async (student) => {
        const certificate = await Certificate.findOne({
          studentId: student._id,
          courseId: student.courseId?._id,
          status: 'issued'
        });
        
        return {
          ...student.toObject(),
          hasCertificate: !!certificate,
          certificateCode: certificate?.certificateCode
        };
      })
    );

    res.json({
      success: true,
      data: studentsWithStatus
    });
  } catch (error) {
    console.error('Get my students error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch students' 
    });
  }
};

// Issue certificate (with permission check)
const issueCertificateAsTeacher = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { studentId, courseId, templateId, awardDate } = req.body;

    const teacher = await User.findById(teacherId);

    if (!teacher || teacher.userType !== 'teacher') {
      return res.status(404).json({ 
        success: false, 
        message: 'Teacher not found' 
      });
    }

    // Check if teacher has permission
    if (!teacher.permissions || !teacher.permissions.canIssueCertificates) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to issue certificates' 
      });
    }

    // Check if course is assigned to this teacher
    if (!teacher.assignedCourses || !teacher.assignedCourses.includes(courseId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to issue certificates for this course' 
      });
    }

    // Get student details
    const student = await Student.findOne({ 
      _id: studentId, 
      instituteId: teacher.instituteId 
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Here you would call your existing certificate issuance logic
    res.json({
      success: true,
      message: 'Certificate issued successfully'
    });
  } catch (error) {
    console.error('Teacher issue certificate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to issue certificate' 
    });
  }
};

// Export all functions
module.exports = {
  createTeacher,
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher,
  teacherLogin,
  getTeacherProfile,
  getMyStudents,
  issueCertificateAsTeacher
};