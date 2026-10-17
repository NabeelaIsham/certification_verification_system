const {
  listTeacherCourses
} = require('../../services/teachers/classroomService');
const { appLogger } = require('../../utils/logger');
const getMyCourses = async (req, res) => {
  try {
    res.json(await listTeacherCourses(req.userId));
  } catch (error) {
    appLogger.error('Failed to fetch courses', error);
    res
      .status(error.status || 500)
      .json({
        success: false,
        message: error.status ? error.message : 'Failed to fetch courses'
      });
  }
};
module.exports = { getMyCourses };
