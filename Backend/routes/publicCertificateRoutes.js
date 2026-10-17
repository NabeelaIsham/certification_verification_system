const router = require('express').Router();
const { createRateLimit } = require('../middleware/rateLimit');
const { showPublicCertificate } = require('../controllers/publicCertificateController');

router.get('/:code', createRateLimit({
  windowMs: Number(process.env.VERIFY_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.VERIFY_RATE_LIMIT_MAX || 120),
  message: 'Too many certificate requests. Please try again later.',
  keyPrefix: 'public-certificate-page'
}), showPublicCertificate);

module.exports = router;
