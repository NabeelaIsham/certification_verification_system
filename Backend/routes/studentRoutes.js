const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware.js');

// Import all student controllers
const {
  createStudent,
  getStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
  bulkUploadStudents,
  getStudentsByCourse,
  updateStudentStatus,
  exportStudents
} = require('../controllers/studentController');

// All student routes are protected
router.use(authenticateToken, authorizeInstitute);

// Student CRUD operations
router.post('/', createStudent);
router.get('/', getStudents);
router.get('/export', exportStudents);
router.get('/by-course/:courseId', getStudentsByCourse);
router.get('/:id', getStudentById);
router.put('/:id', updateStudent);
router.put('/:id/status', updateStudentStatus);
router.delete('/:id', deleteStudent);

// Bulk operations
router.post('/bulk-upload', bulkUploadStudents);

module.exports = router;