const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware.js');

// Import all template controllers
const {
  createTemplate,
  getTemplates,
  getTemplateById,
  updateTemplateFields,
  deleteTemplate
} = require('../controllers/certificateTemplateController');

// All template routes are protected
router.use(authenticateToken, authorizeInstitute);

// Template CRUD operations
router.post('/', createTemplate);
router.get('/', getTemplates);
router.get('/:id', getTemplateById);
router.put('/:id/fields', updateTemplateFields);
router.delete('/:id', deleteTemplate);

module.exports = router;