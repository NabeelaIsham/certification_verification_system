const Student = require('../models/Student');
const Course = require('../models/Course');
const Certificate = require('../models/Certificate');

// Create a new student
const createStudent = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { name, email, phone, courseId, enrollmentDate, status } = req.body;

    // Validate required fields
    if (!name || !email || !courseId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, email, and course are required' 
      });
    }

    // Check if course exists and belongs to this institute
    const course = await Course.findOne({ _id: courseId, instituteId });
    if (!course) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid course selected' 
      });
    }

    // Check if student already enrolled in this course
    const existingStudent = await Student.findOne({ 
      instituteId, 
      email: email.toLowerCase(), 
      courseId 
    });
    
    if (existingStudent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Student already enrolled in this course' 
      });
    }

    // Create student
    const student = new Student({
      instituteId,
      name,
      email: email.toLowerCase(),
      phone,
      courseId,
      enrollmentDate: enrollmentDate || new Date(),
      status: status || 'active'
    });

    await student.save();

    // Populate course details
    await student.populate('courseId', 'courseName courseCode');

    res.status(201).json({
      success: true,
      message: 'Student added successfully',
      data: student
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add student',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all students for an institute
const getStudents = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { search, courseId, status, page = 1, limit = 10 } = req.query;

    let query = { instituteId };
    
    // Add search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Add course filter
    if (courseId && courseId !== 'all') {
      query.courseId = courseId;
    }

    // Add status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get students with pagination
    const students = await Student.find(query)
      .populate('courseId', 'courseName courseCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Student.countDocuments(query);

    // Get counts by status
    const activeCount = await Student.countDocuments({ instituteId, status: 'active' });
    const completedCount = await Student.countDocuments({ instituteId, status: 'completed' });
    const inactiveCount = await Student.countDocuments({ instituteId, status: 'inactive' });

    res.json({
      success: true,
      data: students,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      counts: {
        total: await Student.countDocuments({ instituteId }),
        active: activeCount,
        completed: completedCount,
        inactive: inactiveCount
      }
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch students',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single student by ID
const getStudentById = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    const student = await Student.findOne({ _id: id, instituteId })
      .populate('courseId');

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Get certificate history for this student
    const certificates = await Certificate.find({ 
      studentId: id, 
      instituteId 
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        ...student.toObject(),
        certificates
      }
    });
  } catch (error) {
    console.error('Get student by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch student',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update student
const updateStudent = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates._id;
    delete updates.instituteId;
    delete updates.createdAt;

    // If updating email, check if it's already taken
    if (updates.email) {
      updates.email = updates.email.toLowerCase();
      
      const existingStudent = await Student.findOne({
        instituteId,
        email: updates.email,
        courseId: updates.courseId || (await Student.findById(id))?.courseId,
        _id: { $ne: id }
      });

      if (existingStudent) {
        return res.status(400).json({
          success: false,
          message: 'Email already exists for another student in this course'
        });
      }
    }

    // If updating course, verify it exists
    if (updates.courseId) {
      const course = await Course.findOne({ 
        _id: updates.courseId, 
        instituteId 
      });
      
      if (!course) {
        return res.status(400).json({
          success: false,
          message: 'Invalid course selected'
        });
      }
    }

    const student = await Student.findOneAndUpdate(
      { _id: id, instituteId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('courseId', 'courseName courseCode');

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    res.json({
      success: true,
      message: 'Student updated successfully',
      data: student
    });
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update student',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete student
const deleteStudent = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    // Check if student has any certificates
    const certificatesCount = await Certificate.countDocuments({ 
      studentId: id, 
      instituteId 
    });

    if (certificatesCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete student with issued certificates. Please revoke certificates first or mark student as inactive.' 
      });
    }

    const student = await Student.findOneAndDelete({ _id: id, instituteId });

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
    console.error('Delete student error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete student',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Bulk upload students
const bulkUploadStudents = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { students } = req.body;

    console.log('Bulk upload received:', JSON.stringify(students, null, 2));

    if (!students || !Array.isArray(students) || students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array of students'
      });
    }

    // Log the first student to check format
    console.log('First student data:', students[0]);

    const results = {
      successful: [],
      failed: []
    };

    // Get all courses for this institute for quick lookup
    const courses = await Course.find({ instituteId });
    console.log(`Found ${courses.length} courses for institute`);
    
    const courseMap = {};
    courses.forEach(course => {
      courseMap[course.courseCode.toUpperCase()] = course;
    });
    console.log('Available course codes:', Object.keys(courseMap));

    for (let i = 0; i < students.length; i++) {
      const studentData = students[i];
      console.log(`Processing student ${i + 1}:`, studentData);

      try {
        // Check if this is actually a header row
        if (studentData.name && studentData.name.toLowerCase().includes('name')) {
          console.log('Skipping possible header row:', studentData.name);
          continue;
        }

        // Validate required fields
        if (!studentData.name || !studentData.email || !studentData.courseCode) {
          results.failed.push({
            ...studentData,
            error: `Missing required fields. Got: name="${studentData.name}", email="${studentData.email}", courseCode="${studentData.courseCode}"`
          });
          continue;
        }

        // Clean up the data
        const name = studentData.name.trim();
        const email = studentData.email.trim().toLowerCase();
        const courseCode = studentData.courseCode.trim().toUpperCase();
        const phone = studentData.phone ? studentData.phone.trim() : '';
        const enrollmentDate = studentData.enrollmentDate ? new Date(studentData.enrollmentDate) : new Date();

        console.log(`Looking for course with code: "${courseCode}"`);

        // Find course by course code
        const course = courseMap[courseCode];
        if (!course) {
          results.failed.push({
            ...studentData,
            error: `Course with code "${courseCode}" not found. Available codes: ${Object.keys(courseMap).join(', ')}`
          });
          continue;
        }

        console.log(`Found course: ${course.courseName} (${course._id})`);

        // Check if student already exists
        const existingStudent = await Student.findOne({
          instituteId,
          email: email,
          courseId: course._id
        });

        if (existingStudent) {
          results.failed.push({
            ...studentData,
            error: `Student with email ${email} already enrolled in this course`
          });
          continue;
        }

        // Create student
        const student = new Student({
          instituteId,
          name,
          email,
          phone,
          courseId: course._id,
          enrollmentDate
        });

        await student.save();
        console.log(`✅ Student created: ${name} (${email})`);
        
        results.successful.push({
          name: student.name,
          email: student.email,
          courseCode: course.courseCode
        });
      } catch (error) {
        console.error(`Error processing student ${i + 1}:`, error);
        results.failed.push({
          ...studentData,
          error: error.message
        });
      }
    }

    console.log(`Bulk upload complete: ${results.successful.length} successful, ${results.failed.length} failed`);
    
    res.json({
      success: true,
      message: `Bulk upload completed: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    });
  } catch (error) {
    console.error('Bulk upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process bulk upload',
      error: error.message
    });
  }
};

// Get students by course
const getStudentsByCourse = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { courseId } = req.params;

    const students = await Student.find({ 
      instituteId, 
      courseId,
      status: 'active'
    }).select('name email phone enrollmentDate');

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get students by course error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch students'
    });
  }
};

// Update student status
const updateStudentStatus = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'completed', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use "active", "completed", or "inactive"'
      });
    }

    const student = await Student.findOneAndUpdate(
      { _id: id, instituteId },
      { $set: { status } },
      { new: true }
    ).populate('courseId', 'courseName courseCode');

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: `Student status updated to ${status}`,
      data: student
    });
  } catch (error) {
    console.error('Update student status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update student status'
    });
  }
};

// Export students data (for reports)
const exportStudents = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { courseId, status } = req.query;

    let query = { instituteId };
    
    if (courseId && courseId !== 'all') {
      query.courseId = courseId;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const students = await Student.find(query)
      .populate('courseId', 'courseName courseCode')
      .sort({ name: 1 });

    const exportData = students.map(student => ({
      'Name': student.name,
      'Email': student.email,
      'Phone': student.phone || 'N/A',
      'Course': student.courseId?.courseName || 'N/A',
      'Course Code': student.courseId?.courseCode || 'N/A',
      'Enrollment Date': new Date(student.enrollmentDate).toLocaleDateString(),
      'Status': student.status,
      'Created At': new Date(student.createdAt).toLocaleDateString()
    }));

    res.json({
      success: true,
      data: exportData,
      count: exportData.length
    });
  } catch (error) {
    console.error('Export students error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export students'
    });
  }
};

// Export all functions
module.exports = {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  bulkUploadStudents,
  getStudentsByCourse,
  updateStudentStatus,
  exportStudents
};