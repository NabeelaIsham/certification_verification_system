const { appLogger } = require('../../utils/logger.js');
const User = require('../../models/User');
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
        match: {
          status: 'active'
        }
      });
    if (!teacher || teacher.userType !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }
    appLogger.log(
      `Teacher ${teacher.email} belongs to institute:`,
      teacher.instituteId?._id
    );
    res.json({
      success: true,
      data: teacher
    });
  } catch (error) {
    appLogger.error('Get teacher profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};
const updateTeacherProfile = async (req, res) => {
  try {
    const teacherId = req.userId;
    const editableFields = [
      'firstName',
      'lastName',
      'phone',
      'department',
      'designation',
      'qualification'
    ];
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => editableFields.includes(key))
    );
    const teacher = await User.findByIdAndUpdate(
      teacherId,
      {
        $set: updates
      },
      {
        new: true,
        runValidators: true
      }
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
    appLogger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};
module.exports = {
  getTeacherProfile,
  updateTeacherProfile
};
