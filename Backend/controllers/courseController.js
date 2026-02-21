const Course = require('../models/Course');
const CertificateTemplate = require('../models/CertificateTemplate');

// Create a new course
const createCourse = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { courseName, courseCode, certificateTemplateId, description, duration } = req.body;

    // Validate required fields
    if (!courseName || !courseCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Course name and course code are required' 
      });
    }

    // Check if course code already exists for this institute
    const existingCourse = await Course.findOne({ instituteId, courseCode });
    if (existingCourse) {
      return res.status(400).json({ 
        success: false, 
        message: 'Course code already exists for this institute' 
      });
    }

    // If certificateTemplateId is provided, check if it exists
    if (certificateTemplateId) {
      const template = await CertificateTemplate.findOne({ 
        _id: certificateTemplateId, 
        instituteId 
      });
      if (!template) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid certificate template' 
        });
      }
    }

    const course = new Course({
      instituteId,
      courseName,
      courseCode: courseCode.toUpperCase(),
      certificateTemplateId: certificateTemplateId || null,
      description,
      duration,
      status: 'active'
    });

    await course.save();

    // Populate template details for response
    await course.populate('certificateTemplateId', 'templateName templateId');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: course
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all courses for an institute
const getCourses = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { search, status } = req.query;

    let query = { instituteId };
    
    // Add search filter
    if (search) {
      query.$or = [
        { courseName: { $regex: search, $options: 'i' } },
        { courseCode: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Add status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    const courses = await Course.find(query)
      .populate('certificateTemplateId', 'templateName templateId layout')
      .sort({ createdAt: -1 });

    // Get total counts
    const totalCourses = await Course.countDocuments({ instituteId });
    const activeCourses = await Course.countDocuments({ instituteId, status: 'active' });
    const inactiveCourses = await Course.countDocuments({ instituteId, status: 'inactive' });

    res.json({
      success: true,
      data: courses,
      counts: {
        total: totalCourses,
        active: activeCourses,
        inactive: inactiveCourses
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch courses',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single course by ID
const getCourseById = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    const course = await Course.findOne({ _id: id, instituteId })
      .populate('certificateTemplateId');

    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    res.json({
      success: true,
      data: course
    });
  } catch (error) {
    console.error('Get course by ID error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update course
const updateCourse = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    // Prevent updating certain fields
    delete updates._id;
    delete updates.instituteId;
    delete updates.createdAt;

    // If updating course code, check if it's already taken
    if (updates.courseCode) {
      const existingCourse = await Course.findOne({ 
        instituteId, 
        courseCode: updates.courseCode,
        _id: { $ne: id }
      });
      
      if (existingCourse) {
        return res.status(400).json({ 
          success: false, 
          message: 'Course code already exists for another course' 
        });
      }
      updates.courseCode = updates.courseCode.toUpperCase();
    }

    // If updating certificate template, verify it exists
    if (updates.certificateTemplateId) {
      const template = await CertificateTemplate.findOne({ 
        _id: updates.certificateTemplateId, 
        instituteId 
      });
      if (!template) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid certificate template' 
        });
      }
    }

    const course = await Course.findOneAndUpdate(
      { _id: id, instituteId },
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('certificateTemplateId', 'templateName templateId');

    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: course
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete course
const deleteCourse = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;

    // Check if course has any students enrolled
    const Student = require('../models/Student');
    const enrolledStudents = await Student.countDocuments({ 
      courseId: id, 
      instituteId 
    });

    if (enrolledStudents > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete course with enrolled students. Please deactivate it instead.' 
      });
    }

    const course = await Course.findOneAndDelete({ _id: id, instituteId });

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
    console.error('Delete course error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete course',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Toggle course status (activate/deactivate)
const toggleCourseStatus = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use "active" or "inactive"'
      });
    }

    const course = await Course.findOneAndUpdate(
      { _id: id, instituteId },
      { $set: { status } },
      { new: true }
    ).populate('certificateTemplateId', 'templateName templateId');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    res.json({
      success: true,
      message: `Course ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
      data: course
    });
  } catch (error) {
    console.error('Toggle course status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update course status'
    });
  }
};

// Get courses by template
const getCoursesByTemplate = async (req, res) => {
  try {
    const instituteId = req.user.id;
    const { templateId } = req.params;

    const courses = await Course.find({ 
      instituteId, 
      certificateTemplateId: templateId,
      status: 'active'
    }).select('courseName courseCode');

    res.json({
      success: true,
      data: courses
    });
  } catch (error) {
    console.error('Get courses by template error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch courses'
    });
  }
};

// Export all functions
module.exports = {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
  getCoursesByTemplate
};