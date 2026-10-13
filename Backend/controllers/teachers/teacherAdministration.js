const {
  isValidTeacherPermissions
} = require('../../validation/teacherPermissions');
const { appLogger } = require('../../utils/logger.js');
const User = require('../../models/User');
const Course = require('../../models/Course');
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
        {
          firstName: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          lastName: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          email: {
            $regex: search,
            $options: 'i'
          }
        },
        {
          employeeId: {
            $regex: search,
            $options: 'i'
          }
        }
      ];
    }
    const teachers = await User.find(query)
      .select('-password')
      .populate('assignedCourses', 'courseName courseCode')
      .sort({
        createdAt: -1
      });
    res.json({
      success: true,
      data: teachers
    });
  } catch (error) {
    appLogger.error('Get teachers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teachers'
    });
  }
};
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
    appLogger.error('Get teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch teacher'
    });
  }
};
const updateTeacher = async (req, res) => {
  try {
    if (!isValidTeacherPermissions(req.body.permissions))
      return res
        .status(400)
        .json({
          success: false,
          message: 'Permissions must contain valid boolean values.'
        });
    const instituteId = req.userId;
    const { id } = req.params;
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) =>
        [
          'firstName',
          'lastName',
          'phone',
          'department',
          'designation',
          'qualification',
          'employeeId',
          'assignedCourses',
          'permissions',
          'isActive'
        ].includes(key)
      )
    );
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
        _id: {
          $in: updates.assignedCourses
        },
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
      {
        _id: id,
        instituteId,
        userType: 'teacher'
      },
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
      message: 'Teacher updated successfully',
      data: teacher
    });
  } catch (error) {
    appLogger.error('Update teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update teacher'
    });
  }
};
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
    appLogger.error('Delete teacher error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete teacher'
    });
  }
};
module.exports = {
  getTeachers,
  getTeacherById,
  updateTeacher,
  deleteTeacher
};
