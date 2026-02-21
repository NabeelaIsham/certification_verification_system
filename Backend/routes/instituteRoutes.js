const express = require('express');
const { 
  register, 
  login, 
  getStats, 
  updateSettings,
  getProfile,
  changePassword
} = require('../controllers/instituteController.js');
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (require authentication)
router.use(authenticateToken, authorizeInstitute);

router.get('/profile', getProfile);
router.get('/stats', getStats);
router.put('/settings', updateSettings);
router.put('/change-password', changePassword);

module.exports = router;