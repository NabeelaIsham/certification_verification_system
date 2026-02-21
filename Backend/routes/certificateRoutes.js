const express = require('express');
const {
  issueCertificate,
  getCertificates,
  getCertificateById,
  verifyCertificate,
  sendCertificateEmail,
  revokeCertificate,
  bulkIssueCertificates,
  downloadCertificate,
  getCertificateStats
} = require('../controllers/certificateController.js');
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public route for verification
router.get('/verify/:code', verifyCertificate);

// Protected routes (require authentication)
router.use(authenticateToken, authorizeInstitute);

// Certificate CRUD operations
router.post('/', issueCertificate);
router.get('/', getCertificates);
router.get('/stats', getCertificateStats);
router.get('/download/:id', downloadCertificate);
router.get('/:id', getCertificateById);
router.post('/:id/send-email', sendCertificateEmail);
router.put('/:id/revoke', revokeCertificate);

// Bulk operations
router.post('/bulk-issue', bulkIssueCertificates);

module.exports = router;