const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeInstitute } = require('../middleware/authMiddleware.js');

// Import all institute controllers
const { 
  getProfile,
  getStats, 
  updateSettings,
  changePassword
} = require('../controllers/instituteController');

// Public routes (if any) - none for institute dashboard

// Protected routes - all require authentication
router.use(authenticateToken, authorizeInstitute);

// Profile routes
router.get('/profile', getProfile);
router.get('/stats', getStats);
router.put('/settings', updateSettings);
router.put('/change-password', changePassword);

module.exports = router;