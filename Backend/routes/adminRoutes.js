const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeSuperAdmin } = require('../middleware/authMiddleware');
const adminController = require('../controllers/adminController');

// All admin routes require authenticated superadmin
router.use(authenticateToken, authorizeSuperAdmin);

// Dashboard
router.get('/stats', adminController.getStats);
router.get('/activities', adminController.getActivities);

// Institutes
router.get('/institutes', adminController.getInstitutes);
router.get('/institutes/pending/list', adminController.getPendingInstitutes);
router.get('/institutes/:id', adminController.getInstituteById);
router.put('/institutes/:id/approve', adminController.approveInstitute);
router.delete('/institutes/:id', adminController.rejectInstitute);
router.put('/institutes/:id/toggle-status', adminController.toggleInstituteStatus);

// Users
router.get('/users', adminController.getUsers);
router.put('/users/:id/toggle-status', adminController.toggleUserStatus);
router.post('/users/:id/reset-password', adminController.resetUserPassword);

// Certificates
router.get('/certificates', adminController.getCertificates);
router.get('/certificates/:id', adminController.getCertificateById);
router.put('/certificates/:id/revoke', adminController.revokeCertificate);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);
router.post('/settings/test-email', adminController.testEmail);

module.exports = router;
