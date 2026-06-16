const express = require('express');
const router = express.Router();
const { verifyCertificate } = require('../controllers/verificationController');

router.get('/:code', verifyCertificate);

module.exports = router;
