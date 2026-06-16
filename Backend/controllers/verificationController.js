const Certificate = require('../models/Certificate');
const path = require('path');
const fs = require('fs');

const verifyCertificate = async (req, res) => {
  try {
    const rawCode = req.params.code || '';
    const code = decodeURIComponent(rawCode).trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ success: false, message: 'Certificate code is required.' });
    }

    const certificate = await Certificate.findOne({ certificateCode: code })
      .populate('studentId', 'name')
      .populate('courseId', 'courseName')
      .populate('instituteId', 'instituteName');

    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    if (certificate.status === 'revoked') {
      return res.status(400).json({ success: false, message: 'This certificate has been revoked', data: { status: certificate.status, revokedAt: certificate.revokedAt } });
    }

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const instituteId = certificate.instituteId?._id || certificate.instituteId;
    const instituteIdString = instituteId ? instituteId.toString() : null;

    let certificateImageUrl = null;
    if (certificate.generatedCertificateImage && instituteIdString) {
      certificateImageUrl = `${baseUrl}/uploads/generated/${instituteIdString}/${certificate.certificateCode}.jpg`;
    }

    let qrCodeUrl = null;
    if (certificate.qrCodeImage && instituteIdString) {
      qrCodeUrl = `${baseUrl}/uploads/qrcodes/${instituteIdString}/${certificate.certificateCode}.png`;
    }

    const imagePath = instituteIdString ? path.join(__dirname, '../uploads/generated', instituteIdString, `${certificate.certificateCode}.jpg`) : null;
    const imageExists = imagePath ? fs.existsSync(imagePath) : false;
    if (!imageExists) {
      console.warn(`Certificate image file missing: ${imagePath}`);
    }

    return res.json({ success: true, data: {
      certificateCode: certificate.certificateCode,
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      awardDate: certificate.awardDate,
      instituteName: certificate.instituteId?.instituteName,
      instituteId: certificate.instituteId,
      status: certificate.status,
      issuedAt: certificate.createdAt,
      certificateImage: certificateImageUrl,
      qrCodeImage: qrCodeUrl,
      imageExists
    }});
  } catch (error) {
    console.error('Verify certificate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify certificate', error: error.message });
  }
};

module.exports = {
  verifyCertificate
};
