const express = require('express');
const router = express.Router();
const { 
  authenticateToken, 
  authorizeInstitute,
  authorizeTeacher 
} = require('../middleware/authMiddleware');

const {
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
} = require('../controllers/teacherController');

// ============ PUBLIC ROUTES ============
router.post('/login', teacherLogin);

// ============ INSTITUTE ADMIN ROUTES ============
router.post('/', authenticateToken, authorizeInstitute, createTeacher);
router.get('/', authenticateToken, authorizeInstitute, getTeachers);
router.get('/:id', authenticateToken, authorizeInstitute, getTeacherById);
router.put('/:id', authenticateToken, authorizeInstitute, updateTeacher);
router.delete('/:id', authenticateToken, authorizeInstitute, deleteTeacher);

// ============ TEACHER ROUTES (Self-service) ============
router.get('/profile/me', authenticateToken, authorizeTeacher, getTeacherProfile);
router.put('/profile/me', authenticateToken, authorizeTeacher, updateTeacherProfile);
router.post('/change-password', authenticateToken, authorizeTeacher, changePassword);

// Data routes
router.get('/students/my', authenticateToken, authorizeTeacher, getMyStudents);
router.get('/courses/my', authenticateToken, authorizeTeacher, getMyCourses);
router.get('/templates/course/:courseId', authenticateToken, authorizeTeacher, getTemplatesForCourse);

// Certificate issuance
router.post('/certificates/issue', authenticateToken, authorizeTeacher, issueCertificateAsTeacher);

module.exports = router;