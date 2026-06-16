const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware');
const { sendTestEmail } = require('../controllers/emailController');

router.post('/test', authenticateToken, authorizeInstitute, sendTestEmail);

module.exports = router;
