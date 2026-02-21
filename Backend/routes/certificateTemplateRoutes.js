const express = require('express');
const {
  createTemplate,
  getTemplates,
  getTemplateById,
  getTemplateByCustomId,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  setAsDefaultTemplate,
  previewTemplate
} = require('../controllers/certificateTemplateController.js');
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware.js');

const router = express.Router();

// All template routes are protected
router.use(authenticateToken, authorizeInstitute);

// Template CRUD operations
router.post('/', createTemplate);
router.get('/', getTemplates);
router.get('/by-custom-id/:templateId', getTemplateByCustomId);
router.get('/preview/:id', previewTemplate);
router.get('/:id', getTemplateById);
router.put('/:id', updateTemplate);
router.put('/:id/set-default', setAsDefaultTemplate);
router.post('/:id/duplicate', duplicateTemplate);
router.delete('/:id', deleteTemplate);

module.exports = router;