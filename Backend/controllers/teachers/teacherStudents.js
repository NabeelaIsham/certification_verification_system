const {
  listTeacherStudents
} = require('../../services/teachers/classroomService');
const { appLogger } = require('../../utils/logger');
const getMyStudents = async (req, res) => {
  try {
    res.json(await listTeacherStudents(req.userId));
  } catch (error) {
    appLogger.error('Failed to fetch students', error);
    res
      .status(error.status || 500)
      .json({
        success: false,
        message: error.status ? error.message : 'Failed to fetch students'
      });
  }
};
module.exports = { getMyStudents };
