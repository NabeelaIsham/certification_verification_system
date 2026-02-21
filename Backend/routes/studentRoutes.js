const express = require('express');
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
} = require('../controllers/studentController.js');
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware.js');

const router = express.Router();

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