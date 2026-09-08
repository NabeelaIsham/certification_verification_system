const express = require('express');
const router = express.Router();
const teacherPermission = require('../middleware/teacherPermission');
const students = require('../controllers/studentController');
const courses = require('../controllers/courseController');
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

// ============ TEACHER ROUTES (Self-service) ============
router.get('/profile/me', authenticateToken, authorizeTeacher, getTeacherProfile);
router.put('/profile/me', authenticateToken, authorizeTeacher, updateTeacherProfile);
router.post('/change-password', authenticateToken, authorizeTeacher, changePassword);

// Data routes
router.get('/students/my', authenticateToken, authorizeTeacher, getMyStudents);
router.post('/students', authenticateToken, authorizeTeacher, teacherPermission('canCreateStudents', true), students.createStudent);
router.post('/students/bulk-upload', authenticateToken, authorizeTeacher, teacherPermission('canBulkUpload', true), students.bulkUploadStudents);
router.put('/students/:id', authenticateToken, authorizeTeacher, teacherPermission('canEditStudents', true), students.updateStudent);
router.delete('/students/:id', authenticateToken, authorizeTeacher, teacherPermission('canDeleteStudents', true), students.deleteStudent);
router.post('/courses', authenticateToken, authorizeTeacher, teacherPermission('canCreateCourses'), courses.createCourse);
router.get('/courses/my', authenticateToken, authorizeTeacher, getMyCourses);
router.get('/templates/course/:courseId', authenticateToken, authorizeTeacher, getTemplatesForCourse);

// Certificate issuance
router.post('/certificates/issue', authenticateToken, authorizeTeacher, teacherPermission('canIssueCertificates'), issueCertificateAsTeacher);

// ============ INSTITUTE ADMIN ROUTES ============
router.post('/', authenticateToken, authorizeInstitute, createTeacher);
router.get('/', authenticateToken, authorizeInstitute, getTeachers);
router.get('/:id', authenticateToken, authorizeInstitute, getTeacherById);
router.put('/:id', authenticateToken, authorizeInstitute, updateTeacher);
router.delete('/:id', authenticateToken, authorizeInstitute, deleteTeacher);

module.exports = router;
