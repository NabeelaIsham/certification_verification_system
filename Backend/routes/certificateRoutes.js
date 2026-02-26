const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware.js');

// Import all certificate controllers
const {
  issueCertificate,
  getCertificates,
  getCertificateById,
  updateCertificateStatus,
  sendCertificateEmail,
  verifyCertificate
} = require('../controllers/certificateController');

// Public route for verification
router.get('/verify/:code', verifyCertificate);

// Protected routes
router.use(authenticateToken, authorizeInstitute);

// Certificate CRUD operations
router.post('/', issueCertificate);
router.get('/', getCertificates);
router.get('/:id', getCertificateById);
router.put('/:id/status', updateCertificateStatus);
router.post('/:id/send-email', sendCertificateEmail);

module.exports = router;