const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const User = require('../models/User');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Certificate = require('../models/Certificate');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `bulk-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Middleware to verify institute
const verifyInstitute = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findById(decoded.userId);

    if (!user || user.userType !== 'institute' || !user.isActive) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    req.userId = user._id;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// ==================== DASHBOARD STATS ====================
router.get('/stats', verifyInstitute, async (req, res) => {
  try {
    const [totalStudents, totalCourses, totalCertificates] = await Promise.all([
      Student.countDocuments({ instituteId: req.userId }),
      Course.countDocuments({ instituteId: req.userId }),
      Certificate.countDocuments({ instituteId: req.userId })
    ]);

    res.json({
      success: true,
      data: {
        totalStudents,
        totalCourses,
        certificatesIssued: totalCertificates,
        pendingVerifications: 0
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== COURSE MANAGEMENT ====================

// Get all courses
router.get('/courses', verifyInstitute, async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const query = { instituteId: req.userId };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Course.countDocuments(query);

    // Get counts for each course
    const coursesWithCounts = await Promise.all(
      courses.map(async (course) => {
        const studentCount = await Student.countDocuments({ 
          instituteId: req.userId, 
          courseId: course._id 
        });
        const certificateCount = await Certificate.countDocuments({ 
          instituteId: req.userId, 
          courseId: course._id 
        });
        return {
          ...course.toObject(),
          studentCount,
          certificateCount
        };
      })
    );

    res.json({
      success: true,
      data: coursesWithCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create course
router.post('/courses', verifyInstitute, async (req, res) => {
  try {
    const { name, code, duration, fee, description } = req.body;

    // Validation
    if (!name || !code || !duration || !fee) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }

    // Check if course code exists
    const existingCourse = await Course.findOne({ 
      code: code.toUpperCase(), 
      instituteId: req.userId 
    });

    if (existingCourse) {
      return res.status(400).json({ 
        success: false, 
        message: 'Course code already exists' 
      });
    }

    const course = new Course({
      instituteId: req.userId,
      name,
      code: code.toUpperCase(),
      duration: parseInt(duration),
      fee: parseFloat(fee),
      description: description || ''
    });

    await course.save();

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update course
router.put('/courses/:id', verifyInstitute, async (req, res) => {
  try {
    const { name, code, duration, fee, description } = req.body;

    const course = await Course.findOne({ 
      _id: req.params.id, 
      instituteId: req.userId 
    });

    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    // Check if new code conflicts with existing course
    if (code && code.toUpperCase() !== course.code) {
      const existingCourse = await Course.findOne({ 
        code: code.toUpperCase(), 
        instituteId: req.userId,
        _id: { $ne: req.params.id }
      });

      if (existingCourse) {
        return res.status(400).json({ 
          success: false, 
          message: 'Course code already exists' 
        });
      }
    }

    course.name = name || course.name;
    course.code = code ? code.toUpperCase() : course.code;
    course.duration = duration ? parseInt(duration) : course.duration;
    course.fee = fee ? parseFloat(fee) : course.fee;
    course.description = description !== undefined ? description : course.description;

    await course.save();

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete course
router.delete('/courses/:id', verifyInstitute, async (req, res) => {
  try {
    const course = await Course.findOneAndDelete({ 
      _id: req.params.id, 
      instituteId: req.userId 
    });

    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== STUDENT MANAGEMENT ====================

// Get all students
router.get('/students', verifyInstitute, async (req, res) => {
  try {
    const { search = '', courseId, page = 1, limit = 10 } = req.query;
    const query = { instituteId: req.userId };

    if (courseId) {
      query.courseId = courseId;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    const students = await Student.find(query)
      .populate('courseId', 'name code')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Student.countDocuments(query);

    const formattedStudents = students.map(student => ({
      ...student.toObject(),
      courseName: student.courseId?.name,
      courseCode: student.courseId?.code
    }));

    res.json({
      success: true,
      data: formattedStudents,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create student
router.post('/students', verifyInstitute, async (req, res) => {
  try {
    const { name, email, phone, courseId, enrollmentDate } = req.body;

    // Validation
    if (!name || !email || !courseId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email and course are required' 
      });
    }

    // Check if student exists
    const existingStudent = await Student.findOne({ 
      email, 
      instituteId: req.userId 
    });

    if (existingStudent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student with this email already exists' 
      });
    }

    // Verify course exists
    const course = await Course.findOne({ 
      _id: courseId, 
      instituteId: req.userId 
    });

    if (!course) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid course selected' 
      });
    }

    const student = new Student({
      instituteId: req.userId,
      name,
      email,
      phone: phone || '',
      courseId,
      enrollmentDate: enrollmentDate || new Date()
    });

    await student.save();
    await student.populate('courseId', 'name code');

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: {
        ...student.toObject(),
        courseName: student.courseId?.name,
        courseCode: student.courseId?.code
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update student
router.put('/students/:id', verifyInstitute, async (req, res) => {
  try {
    const student = await Student.findOne({ 
      _id: req.params.id, 
      instituteId: req.userId 
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Check email uniqueness if changed
    if (req.body.email && req.body.email !== student.email) {
      const existingStudent = await Student.findOne({ 
        email: req.body.email, 
        instituteId: req.userId,
        _id: { $ne: req.params.id }
      });

      if (existingStudent) {
        return res.status(400).json({ 
          success: false, 
          message: 'Email already exists' 
        });
      }
    }

    Object.assign(student, req.body);
    await student.save();
    await student.populate('courseId', 'name code');

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: {
        ...student.toObject(),
        courseName: student.courseId?.name,
        courseCode: student.courseId?.code
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete student
router.delete('/students/:id', verifyInstitute, async (req, res) => {
  try {
    const student = await Student.findOneAndDelete({ 
      _id: req.params.id, 
      instituteId: req.userId 
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CERTIFICATE MANAGEMENT ====================

// Get all certificates
router.get('/certificates', verifyInstitute, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const certificates = await Certificate.find({ instituteId: req.userId })
      .populate('studentId', 'name email studentId')
      .populate('courseId', 'name code')
      .sort({ issueDate: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Certificate.countDocuments({ instituteId: req.userId });

    const formattedCertificates = certificates.map(cert => ({
      ...cert.toObject(),
      studentName: cert.studentId?.name,
      studentEmail: cert.studentId?.email,
      courseName: cert.courseId?.name,
      courseCode: cert.courseId?.code
    }));

    res.json({
      success: true,
      data: formattedCertificates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create certificate
router.post('/certificates', verifyInstitute, async (req, res) => {
  try {
    const { studentId, courseId, issueDate, grade } = req.body;

    // Verify student
    const student = await Student.findOne({ 
      _id: studentId, 
      instituteId: req.userId 
    });
    if (!student) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid student' 
      });
    }

    // Verify course
    const course = await Course.findOne({ 
      _id: courseId, 
      instituteId: req.userId 
    });
    if (!course) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid course' 
      });
    }

    // Check for existing certificate
    const existingCert = await Certificate.findOne({ 
      studentId, 
      courseId, 
      instituteId: req.userId 
    });

    if (existingCert) {
      return res.status(400).json({ 
        success: false, 
        message: 'Certificate already exists for this student and course' 
      });
    }

    const certificate = new Certificate({
      instituteId: req.userId,
      studentId,
      courseId,
      issueDate: issueDate || new Date(),
      grade: grade || ''
    });

    await certificate.save();

    res.status(201).json({
      success: true,
      message: 'Certificate generated successfully',
      data: certificate
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Revoke certificate
router.put('/certificates/:id/revoke', verifyInstitute, async (req, res) => {
  try {
    const certificate = await Certificate.findOneAndUpdate(
      { _id: req.params.id, instituteId: req.userId },
      { status: 'revoked' },
      { new: true }
    );

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    res.json({
      success: true,
      message: 'Certificate revoked successfully',
      data: certificate
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== BULK UPLOAD ====================

router.post('/students/bulk', verifyInstitute, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    const { courseId } = req.body;

    // Verify course
    const course = await Course.findOne({ 
      _id: courseId, 
      instituteId: req.userId 
    });

    if (!course) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid course' 
      });
    }

    const results = [];
    const errors = [];
    let successCount = 0;

    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    for (const row of results) {
      try {
        const existingStudent = await Student.findOne({
          instituteId: req.userId,
          email: row.email
        });

        if (existingStudent) {
          errors.push(`Email ${row.email} already exists`);
          continue;
        }

        const student = new Student({
          instituteId: req.userId,
          name: row.name,
          email: row.email,
          phone: row.phone || '',
          courseId,
          enrollmentDate: row.enrollmentDate || new Date()
        });

        await student.save();
        successCount++;
      } catch (error) {
        errors.push(`Error: ${error.message}`);
      }
    }

    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Bulk upload completed',
      data: { successCount, errorCount: errors.length, errors }
    });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== REPORT ====================

router.get('/reports/institute', verifyInstitute, async (req, res) => {
  try {
    const [students, courses, certificates] = await Promise.all([
      Student.find({ instituteId: req.userId }),
      Course.find({ instituteId: req.userId }),
      Certificate.find({ instituteId: req.userId })
    ]);

    const report = {
      generatedAt: new Date(),
      institute: {
        name: req.user.instituteName,
        email: req.user.email
      },
      summary: {
        totalStudents: students.length,
        totalCourses: courses.length,
        totalCertificates: certificates.length,
        activeStudents: students.filter(s => s.status === 'active').length,
        activeCourses: courses.filter(c => c.status === 'active').length
      },
      studentsByCourse: courses.map(course => ({
        courseName: course.name,
        count: students.filter(s => s.courseId?.toString() === course._id.toString()).length
      }))
    };

    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;