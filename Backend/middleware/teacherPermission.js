const User = require('../models/User');
const Student = require('../models/Student');
const mongoose = require('mongoose');

module.exports = (permission, studentAction = false) => async (req, res, next) => {
  try {
    req.body = req.body || {};
    const teacher = req.user;
    if (teacher.userType !== 'teacher' || teacher.permissions?.[permission] !== true) return res.status(403).json({ success: false, message: 'Your institute has not granted permission for this action.' });
    const institute = await User.findOne({ _id: teacher.instituteId, userType: 'institute', isActive: true, isVerifiedByAdmin: true });
    if (!institute) return res.status(403).json({ success: false, message: 'Your institute is unavailable.' });
    req.instituteId = teacher.instituteId;
    req.allowedCourseIds = (teacher.assignedCourses || []).map(id => String(id._id || id));
    if (studentAction) {
      if (req.params.id) {
        if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid student ID.' });
        const student = await Student.findOne({ _id: req.params.id, instituteId: req.instituteId, courseId: { $in: req.allowedCourseIds } });
        if (!student) return res.status(404).json({ success: false, message: 'Student not found in your assigned courses.' });
      }
      if (req.body.courseId !== undefined && (typeof req.body.courseId !== 'string' || !req.allowedCourseIds.includes(req.body.courseId))) return res.status(403).json({ success: false, message: 'Choose one of your assigned courses.' });
      if (permission !== 'canBulkUpload') {
        req.body = Object.fromEntries(Object.entries(req.body).filter(([key]) => ['name', 'email', 'phone', 'courseId', 'enrollmentDate', 'status'].includes(key)));
      }
    }
    next();
  } catch (error) { res.status(500).json({ success: false, message: 'Unable to check teacher permissions.' }); }
};
