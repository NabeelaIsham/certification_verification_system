const express = require('express');
const router = express.Router();
const { verifyCertificate } = require('../controllers/verificationController');
const { resolveShare } = require('../controllers/credentialSecurityController');
const { createRateLimit } = require('../middleware/rateLimit');

const shareRateLimit = createRateLimit({
  windowMs: Number(process.env.SHARE_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.SHARE_RATE_LIMIT_MAX || 30),
  message: 'Too many shared credential requests. Please try again later.',
  keyPrefix: 'credential-share'
});
const verificationRateLimit = createRateLimit({
  windowMs: Number(process.env.VERIFY_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.VERIFY_RATE_LIMIT_MAX || 120),
  message: 'Too many certificate verification requests. Please try again later.',
  keyPrefix: 'credential-verification'
});

router.get('/share/:token', shareRateLimit, resolveShare);
router.get('/:code', verificationRateLimit, verifyCertificate);

module.exports = router;
