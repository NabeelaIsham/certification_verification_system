const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/authMiddleware');
const { enforceOtpPolicy } = require('../middleware/otpPolicy');
router.get('/verification-policy', async (req, res) => {
  try { res.json({ success: true, data: await require('../utils/settingsPolicy').getPolicy('verification') }); }
  catch (error) { res.status(500).json({ success: false, message: 'Unable to load verification settings.' }); }
});

router.post('/register', authController.registerInstitute);
router.post('/verify-otp', enforceOtpPolicy('verify-account'), authController.verifyOtp);
router.post('/resend-otp', enforceOtpPolicy('send-account'), authController.resendOtp);
router.post('/forgot-password', enforceOtpPolicy('send-reset'), authController.forgotPassword);
router.post('/reset-password', enforceOtpPolicy('verify-reset'), authController.resetPassword);
router.post('/login', authController.login);
router.post('/2fa/verify', require('../controllers/twoFactorController').verifyTwoFactor);
router.put('/2fa/settings', authenticateToken, require('../controllers/twoFactorController').updateTwoFactor);
router.get('/me', authenticateToken, authController.getCurrentUser);
router.get('/verification-status/:email', authController.verificationStatus);

module.exports = router;
