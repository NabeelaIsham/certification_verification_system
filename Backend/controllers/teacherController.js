const User = require('../models/User');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');
const CertificateTemplate = require('../models/CertificateTemplate');
const QRCode = require('qrcode');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ============ HELPER FUNCTION FOR CERTIFICATE IMAGE GENERATION ============

const generateCertificateImage = async (certificateData) => {
  try {
    const { 
      template, 
      studentName, 
      courseName, 
      awardDate, 
      certificateCode,
      qrCodeImage,
      instituteId 
    } = certificateData;

    console.log('Starting certificate image generation...');

    // Check if template image exists
    if (!fs.existsSync(template.templateImage)) {
      throw new Error(`Template image not found at path: ${template.templateImage}`);
    }

    // Load the template image
    const templateImage = sharp(template.templateImage);
    const metadata = await templateImage.metadata();
    console.log('Template image loaded:', metadata);

    // Create a composite image with all fields
    const compositeOperations = [];

    // Add text fields
    if (template.fields && template.fields.length > 0) {
      for (const field of template.fields) {
        let text = '';
        switch (field.fieldName) {
          case 'studentName':
            text = studentName;
            break;
          case 'awardDate':
            text = new Date(awardDate).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
            break;
          case 'certificateCode':
            text = certificateCode;
            break;
          case 'courseName':
            text = courseName;
            break;
          default:
            text = '';
        }

        console.log(`Adding text field ${field.fieldName} at (${field.x}, ${field.y}): "${text}"`);

        // Create SVG for text
        const textSvg = `
          <svg width="${metadata.width}" height="${metadata.height}">
            <style>
              .text {
                font-family: ${field.fontFamily || 'Arial'};
                font-size: ${field.fontSize || 24}px;
                fill: ${field.fontColor || '#000000'};
                text-anchor: ${field.textAlign === 'center' ? 'middle' : field.textAlign === 'right' ? 'end' : 'start'};
              }
            </style>
            <text x="${field.x}" y="${field.y}" class="text">${text}</text>
          </svg>
        `;

        compositeOperations.push({
          input: Buffer.from(textSvg),
          top: 0,
          left: 0
        });
      }
    } else {
      console.log('No fields defined in template');
    }

    // Add QR code
    if (qrCodeImage) {
      if (fs.existsSync(qrCodeImage)) {
        console.log('Adding QR code from:', qrCodeImage);
        compositeOperations.push({
          input: qrCodeImage,
          top: template.qrCodePosition?.y || 0,
          left: template.qrCodePosition?.x || 0,
          width: template.qrCodePosition?.size || 100,
          height: template.qrCodePosition?.size || 100
        });
      } else {
        console.log('QR code image not found:', qrCodeImage);
      }
    }

    // Generate final image
    const outputDir = path.join(__dirname, '../uploads/generated', instituteId.toString());
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, `${certificateCode}.jpg`);
    console.log('Saving to:', outputPath);
    
    await templateImage
      .composite(compositeOperations)
      .jpeg({ quality: 90 })
      .toFile(outputPath);

    console.log('Certificate image generated successfully');
    return outputPath;
  } catch (error) {
    console.error('Certificate generation error details:', error);
    throw new Error(`Image generation failed: ${error.message}`);
  }
};

// ============ INSTITUTE ADMIN FUNCTIONS (Create/Manage Teachers) ============

// Create a new teacher (by Institute Admin)
const createTeacher = async (req, res) => {
  try {
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

    // Check if teacher already exists
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
      email,
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
    const instituteId = req.userId;
    const { id } = req.params;
    const updates = req.body;

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
    if (!teacher.assignedCourses || !teacher.assignedCourses.includes(courseId)) {
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
    }).select('templateName templateImage fields createdAt');

    console.log(`Found ${templates.length} templates for course ${courseId}`);

    // If no templates found, try to get templates without courseId filter (optional)
    if (templates.length === 0) {
      console.log('No templates found with courseId, checking general templates...');
      const generalTemplates = await CertificateTemplate.find({
        instituteId: teacher.instituteId,
        isActive: true
      }).select('templateName templateImage fields createdAt');
      
      return res.json({
        success: true,
        data: generalTemplates,
        message: 'Showing all available templates for your institute'
      });
    }

    res.json({
      success: true,
      data: templates
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
const issueCertificateAsTeacher = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { studentId, courseId, templateId, awardDate } = req.body;

    console.log('Issuing certificate with data:', { studentId, courseId, templateId, awardDate });

    // Get teacher with populated data
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

    // Verify course is assigned to this teacher
    if (!teacher.assignedCourses || !teacher.assignedCourses.includes(courseId)) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not authorized to issue certificates for this course' 
      });
    }

    // Get course details
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

    // Verify student belongs to this course and institute
    const student = await Student.findOne({ 
      _id: studentId, 
      instituteId: teacher.instituteId,
      courseId: courseId
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found or not in your course' 
      });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({
      instituteId: teacher.instituteId,
      studentId: studentId,
      courseId: courseId,
      status: { $in: ['issued', 'draft'] }
    });

    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already exists for this student in this course'
      });
    }

    // Verify template belongs to this course and institute
    const template = await CertificateTemplate.findOne({
      _id: templateId,
      instituteId: teacher.instituteId,
      courseId: courseId,
      isActive: true
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Invalid certificate template for this course'
      });
    }

    // Generate unique certificate code
    const institute = await User.findById(teacher.instituteId);
    const instituteCode = institute?.instituteName?.substring(0, 3).toUpperCase() || 'INS';
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const certificateCode = `${instituteCode}-${year}${month}${day}-${random}`;

    console.log('Generated certificate code:', certificateCode);

    // Generate QR code
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${certificateCode}`;
    const qrCodeDir = path.join(__dirname, '../uploads/qrcodes', teacher.instituteId.toString());
    fs.mkdirSync(qrCodeDir, { recursive: true });
    
    const qrCodePath = path.join(qrCodeDir, `${certificateCode}.png`);
    await QRCode.toFile(qrCodePath, verificationUrl, {
      width: 200,
      margin: 1
    });
    console.log('QR code generated at:', qrCodePath);

    // Generate certificate image with all fields
    let generatedImagePath = null;
    try {
      generatedImagePath = await generateCertificateImage({
        template,
        studentName: student.name,
        courseName: course.courseName,
        awardDate,
        certificateCode,
        qrCodeImage: qrCodePath,
        instituteId: teacher.instituteId
      });
      console.log('Certificate image generated at:', generatedImagePath);
    } catch (imageError) {
      console.error('Image generation failed:', imageError);
      // Continue without image - we'll mark it as draft and can regenerate later
    }

    // Create certificate with all fields
    const certificate = new Certificate({
      instituteId: teacher.instituteId,
      studentId: studentId,
      courseId: courseId,
      templateId: templateId,
      certificateCode,
      studentName: student.name,
      courseName: course.courseName,
      awardDate: awardDate || new Date(),
      generatedCertificateImage: generatedImagePath ? generatedImagePath.replace(/\\/g, '/') : null,
      qrCodeImage: qrCodePath.replace(/\\/g, '/'),
      verificationUrl,
      status: generatedImagePath ? 'issued' : 'draft',
      emailSent: false
    });

    await certificate.save();
    console.log('Certificate issued successfully:', certificateCode);

    // Generate URLs for frontend
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const certificateData = {
      ...certificate.toObject(),
      generatedCertificateUrl: generatedImagePath ? `${baseUrl}/${generatedImagePath.replace(/\\/g, '/')}` : null,
      qrCodeUrl: `${baseUrl}/${qrCodePath.replace(/\\/g, '/')}`,
      templateImageUrl: `${baseUrl}/${template.templateImage}`
    };

    res.json({
      success: true,
      message: generatedImagePath ? 'Certificate issued successfully' : 'Certificate created but image generation failed',
      data: certificateData
    });
  } catch (error) {
    console.error('Teacher issue certificate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to issue certificate',
      error: error.message
    });
  }
};

// Update teacher profile (self)
const updateTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.userId;
    const updates = req.body;

    // Prevent updating sensitive fields
    delete updates.password;
    delete updates._id;
    delete updates.userType;
    delete updates.instituteId;
    delete updates.email;
    delete updates.employeeId;
    delete updates.assignedCourses;
    delete updates.permissions;

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
    await teacher.save();

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