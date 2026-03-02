const express = require('express');
const router = express.Router();

// IMPORTANT: Make sure these are imported correctly
const { 
  authenticateToken, 
  authorizeInstitute,
  authorizeTeacher 
} = require('../middleware/authMiddleware.js');

// Import teacher controller
const teacherController = require('../controllers/teacherController');

// ============ PUBLIC ROUTES ============
router.post('/login', teacherController.teacherLogin);

// ============ INSTITUTE ADMIN ROUTES ============
router.post('/', authenticateToken, authorizeInstitute, teacherController.createTeacher);
router.get('/', authenticateToken, authorizeInstitute, teacherController.getTeachers);
router.get('/:id', authenticateToken, authorizeInstitute, teacherController.getTeacherById);
router.put('/:id', authenticateToken, authorizeInstitute, teacherController.updateTeacher);
router.delete('/:id', authenticateToken, authorizeInstitute, teacherController.deleteTeacher);

// ============ TEACHER ROUTES (Self-service) ============
router.get('/profile/me', authenticateToken, authorizeTeacher, teacherController.getTeacherProfile);
router.get('/students/my', authenticateToken, authorizeTeacher, teacherController.getMyStudents);
router.post('/certificates/issue', authenticateToken, authorizeTeacher, teacherController.issueCertificateAsTeacher);

module.exports = router;