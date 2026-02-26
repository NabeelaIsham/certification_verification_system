const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware.js');

// Import all course controllers
const {
  createCourse,
  getCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  toggleCourseStatus,
  getCoursesByTemplate
} = require('../controllers/courseController');

// All course routes are protected
router.use(authenticateToken, authorizeInstitute);

// Course CRUD operations
router.post('/', createCourse);
router.get('/', getCourses);
router.get('/by-template/:templateId', getCoursesByTemplate);
router.get('/:id', getCourseById);
router.put('/:id', updateCourse);
router.put('/:id/toggle-status', toggleCourseStatus);
router.delete('/:id', deleteCourse);

module.exports = router;