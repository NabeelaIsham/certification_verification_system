const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware');

// Import all certificate controller functions
const {
  issueCertificate,
  getCertificates,
  getCertificateById,
  updateCertificateStatus,
  sendCertificateEmail,
  regenerateCertificateImage,
  bulkIssueCertificates,
  getCertificateImage,
  downloadCertificate
} = require('../controllers/certificateController');
const {
  addLifecycleEvent,
  createShare,
  getSecurityAnalytics,
  getSigningKeyStatus,
  listShares,
  revokeShare,
  rotateSigningKey
} = require('../controllers/credentialSecurityController');

// Public route for serving certificate images (no auth required)
router.get('/image/:instituteId/:filename', getCertificateImage);

// Protected routes (require authentication)
router.use(authenticateToken, authorizeInstitute);

// Certificate CRUD operations
router.post('/', issueCertificate);
router.get('/', getCertificates);
router.get('/security/analytics', getSecurityAnalytics);
router.get('/security/signing-key', getSigningKeyStatus);
router.post('/security/signing-key/rotate', rotateSigningKey);
router.post('/:id/lifecycle', addLifecycleEvent);
router.post('/:id/shares', createShare);
router.get('/:id/shares', listShares);
router.delete('/:id/shares/:shareId', revokeShare);
router.get('/:id/download', downloadCertificate);
router.get('/:id', getCertificateById);
router.put('/:id/status', updateCertificateStatus);
router.post('/:id/send-email', sendCertificateEmail);
router.post('/:id/regenerate', regenerateCertificateImage);

// Bulk operations
router.post('/bulk-issue', bulkIssueCertificates);

module.exports = router;
