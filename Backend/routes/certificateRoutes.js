const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware');

// Import all certificate controller functions
const {
  issueCertificate,
  getCertificates,
  getCertificateById,
  verifyCertificate,
  updateCertificateStatus,
  sendCertificateEmail,
  regenerateCertificateImage,
  bulkIssueCertificates,
  getCertificateImage  // Make sure this is exported from your controller
} = require('../controllers/certificateController');

// Public route for verification
router.get('/verify/:code', verifyCertificate);

// Public route for serving certificate images (no auth required)
router.get('/image/:instituteId/:filename', getCertificateImage);

// Protected routes (require authentication)
router.use(authenticateToken, authorizeInstitute);

// Certificate CRUD operations
router.post('/', issueCertificate);
router.get('/', getCertificates);
router.get('/:id', getCertificateById);
router.put('/:id/status', updateCertificateStatus);
router.post('/:id/send-email', sendCertificateEmail);
router.post('/:id/regenerate', regenerateCertificateImage);

// Bulk operations
router.post('/bulk-issue', bulkIssueCertificates);

module.exports = router;