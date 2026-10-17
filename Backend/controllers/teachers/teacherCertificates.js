const { appLogger } = require('../../utils/logger.js');
const User = require('../../models/User');
const Course = require('../../models/Course');
const CertificateTemplate = require('../../models/CertificateTemplate');
const getTemplatesForCourse = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { courseId } = req.params;
    appLogger.log(
      `Fetching templates for course ${courseId} for teacher ${teacherId}`
    );
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.userType !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Verify the course is assigned to this teacher
    if (
      !teacher.assignedCourses ||
      !teacher.assignedCourses.some((id) => String(id) === String(courseId))
    ) {
      appLogger.log(
        'Course not assigned to teacher. Assigned courses:',
        teacher.assignedCourses
      );
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
    }).select(
      'templateName templateImage fields imageFields qrCodePosition createdAt'
    );
    appLogger.log(`Found ${templates.length} templates for course ${courseId}`);

    // If no templates found, try to get templates without courseId filter (optional)
    if (templates.length === 0) {
      appLogger.log(
        'No templates found with courseId, checking general templates...'
      );
      const generalTemplates = await CertificateTemplate.find({
        instituteId: teacher.instituteId,
        isActive: true
      }).select(
        'templateName templateImage fields imageFields qrCodePosition createdAt'
      );
      const baseUrl = process.env.API_URL || 'http://localhost:5000';
      return res.json({
        success: true,
        data: generalTemplates.map((template) => ({
          ...template.toObject(),
          templateImageUrl: `${baseUrl}/api/private-files/templates/${template._id}/background`,
          imageFields: (template.imageFields || []).map((field, index) => ({
            ...field.toObject(),
            imageUrl: `${baseUrl}/api/private-files/templates/${template._id}/${index}`
          }))
        })),
        message: 'Showing all available templates for your institute'
      });
    }
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    res.json({
      success: true,
      data: templates.map((template) => ({
        ...template.toObject(),
        templateImageUrl: `${baseUrl}/api/private-files/templates/${template._id}/background`,
        imageFields: (template.imageFields || []).map((field, index) => ({
          ...field.toObject(),
          imageUrl: `${baseUrl}/api/private-files/templates/${template._id}/${index}`
        }))
      }))
    });
  } catch (error) {
    appLogger.error('Get templates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch templates',
      error: error.message
    });
  }
};
const issueCertificateAsTeacher = (req, res) =>
  require('../../services/certificateIssuanceService').issueHttp(req, res);
module.exports = {
  getTemplatesForCourse,
  issueCertificateAsTeacher
};
