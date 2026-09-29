const { tenantFile } = require('../utils/tenantFiles');
const Certificate = require('../models/Certificate');
const Student = require('../models/Student');
const Course = require('../models/Course');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const { sendCertificateEmail } = require('../utils/emailService');
const {
  buildOnlineVerificationUrl,
  createSignedCredential
} = require('../utils/credentialService');

const { buildCertificateUrls, buildInstituteLogoUrl } = require('../services/certificateDeliveryService');
const { generateCertificateImage } = require('../services/certificateRenderingService');
const issuance = require('../services/certificateIssuanceService');

// ============ CERTIFICATE CRUD OPERATIONS ============

// Issue new certificate
const issueCertificate = (req, res) => issuance.issueHttp(req, res);

// Get all certificates for an institute
const getCertificates = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { instituteId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const certificates = await Certificate.find(query)
      .populate('studentId', 'name email')
      .populate('courseId', 'courseName courseCode')
      .populate('templateId', 'templateName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Certificate.countDocuments(query);

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const certificatesWithUrl = certificates.map(cert => ({
      ...cert.toObject(),
      ...buildCertificateUrls({
        baseUrl,
        instituteId,
        certificateCode: cert.certificateCode,
        generatedImagePath: cert.generatedCertificateImage
      })
    }));

    res.json({
      success: true,
      data: certificatesWithUrl,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get certificates error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch certificates',
      error: error.message
    });
  }
};

// Get single certificate by ID
const getCertificateById = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
    const { id } = req.params;

    const certificate = await Certificate.findOne({ _id: id, instituteId })
      .populate('studentId', 'name email phone')
      .populate('courseId', 'courseName courseCode')
      .populate('templateId');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const certificateWithUrl = {
      ...certificate.toObject(),
      ...buildCertificateUrls({
        baseUrl,
        instituteId,
        certificateCode: certificate.certificateCode,
        generatedImagePath: certificate.generatedCertificateImage
      }),
      templateImageUrl: certificate.templateId?.templateImage ?
        `${baseUrl}/${certificate.templateId.templateImage.replace(/\\/g, '/')}` : null
    };

    res.json({
      success: true,
      data: certificateWithUrl
    });
  } catch (error) {
    console.error('Get certificate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch certificate',
      error: error.message
    });
  }
};

// Get certificate by certificate code (public verification) - FIXED VERSION
const verifyCertificate = async (req, res) => {
  try {
    const rawCode = req.params.code || '';
    const code = decodeURIComponent(rawCode).trim().toUpperCase();

    console.log('Verifying certificate with code:', code);

    const certificate = await Certificate.findOne({ certificateCode: code })
      .populate('studentId', 'name')
      .populate('courseId', 'courseName')
      .populate('instituteId', 'instituteName');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    if (certificate.status === 'revoked') {
      return res.status(400).json({
        success: false,
        message: 'This certificate has been revoked',
        data: {
          status: certificate.status,
          revokedAt: certificate.revokedAt
        }
      });
    }

    // Construct proper URLs for images
    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const instituteId = certificate.instituteId?._id || certificate.instituteId;
    const instituteIdString = instituteId ? instituteId.toString() : null;
    
    // Build image URLs using certificate code and institute ID
    let certificateImageUrl = null;
    if (certificate.generatedCertificateImage && instituteIdString) {
      certificateImageUrl = `${baseUrl}/uploads/generated/${instituteIdString}/${certificate.certificateCode}.jpg`;
    }

    let qrCodeUrl = null;
    if (certificate.qrCodeImage && instituteIdString) {
      qrCodeUrl = `${baseUrl}/uploads/qrcodes/${instituteIdString}/${certificate.certificateCode}.png`;
    }

    // Check if files actually exist (optional but good for debugging)
    const imagePath = instituteIdString
      ? path.join(__dirname, '../uploads/generated', instituteIdString, `${certificate.certificateCode}.jpg`)
      : null;
    const imageExists = imagePath ? fs.existsSync(imagePath) : false;
    
    if (!imageExists) {
      console.warn(`Certificate image file missing: ${imagePath}`);
    }

    res.json({
      success: true,
      data: {
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
        imageExists: imageExists // Optional: send this for debugging
      }
    });
  } catch (error) {
    console.error('Verify certificate error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to verify certificate',
      error: error.message
    });
  }
};

// Update certificate status
const issueDraft = async (req, res, certificate) => {
  try {
    const result = await issuance.issue({ actorId: req.userId,
      input: { studentId: String(certificate.studentId?._id || certificate.studentId),
        courseId: String(certificate.courseId?._id || certificate.courseId),
        templateId: String(certificate.templateId?._id || certificate.templateId), awardDate: certificate.awardDate },
      legacyCertificateId: certificate._id, idempotencyKey: req.get('Idempotency-Key') });
    return res.json({ success: true, message: 'Certificate issued successfully.', data: issuance.responseData(result.certificate) });
  } catch (error) { return issuance.errorResponse(res, error); }
};

const updateCertificateStatus = async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ _id: req.params.id, instituteId: req.userId });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });
    if (req.body.status !== 'issued' || certificate.status !== 'draft') return res.status(409).json({ success: false, message: 'Use the credential lifecycle action for this transition.' });
    return issueDraft(req, res, certificate);
  } catch (error) { return issuance.errorResponse(res, error); }
};

// Send certificate email
const sendCertificateEmailHandler = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
    const { id } = req.params;

    const certificate = await Certificate.findOne({ _id: id, instituteId })
      .populate('studentId', 'name email')
      .populate('instituteId', 'instituteName logo');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    if (certificate.status !== 'issued') return res.status(409).json({ success: false, message: 'Only issued certificates can be emailed. Issue the draft first.' });
    if (!certificate.studentId || !certificate.studentId.email) {
      return res.status(400).json({
        success: false,
        message: 'Student email not found'
      });
    }

    if (!certificate.generatedCertificateImage) {
      return res.status(400).json({
        success: false,
        message: 'Certificate image not generated yet. Please regenerate the certificate first.'
      });
    }

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    const urls = buildCertificateUrls({
      baseUrl,
      instituteId,
      certificateCode: certificate.certificateCode,
      generatedImagePath: certificate.generatedCertificateImage
    });

    await sendCertificateEmail({
      to: certificate.studentId.email,
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      awardDate: certificate.awardDate,
      certificateCode: certificate.certificateCode,
      certificateUrl: urls.certificateUrl,
      downloadUrl: urls.downloadUrl,
      verificationUrl: certificate.verificationUrl,
      instituteName: certificate.instituteId?.instituteName,
      instituteLogoUrl: buildInstituteLogoUrl(baseUrl, certificate.instituteId)
    });

    certificate.emailSent = true;
    certificate.emailSentAt = new Date();
    // Regeneration replaces the rendered image/QR only. Never undo an existing
    // suspension or revocation as a side effect.

    await certificate.save();

    res.json({
      success: true,
      message: 'Certificate email sent successfully'
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send certificate email',
      error: error.message
    });
  }
};

// Regenerate certificate image
const regenerateCertificateImage = async (req, res) => {
  try {
    const instituteId = req.user.id || req.userId;
    const { id } = req.params;

    const certificate = await Certificate.findOne({ _id: id, instituteId })
      .populate('templateId');

    if (!certificate) {
      return res.status(404).json({ 
        success: false, 
        message: 'Certificate not found' 
      });
    }

    if (certificate.status === 'draft') return issueDraft(req, res, certificate);
    const template = certificate.templateId;
    
    if (!template || String(template.instituteId) !== String(instituteId)) {
      return res.status(404).json({
        success: false,
        message: 'Template not found'
      });
    }

    // Get student details
    const student = await Student.findOne({ _id: certificate.studentId, instituteId });
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    const course = await Course.findOne({ _id: certificate.courseId, instituteId });
    const User = require('../models/User');
    const institute = await User.findById(instituteId);

    let signedCredential = certificate.credential?.signature
      ? certificate.credential
      : await createSignedCredential({
        certificateCode: certificate.certificateCode,
        studentName: certificate.studentName,
        courseName: certificate.courseName,
        awardDate: certificate.awardDate,
        institute,
        validUntil: certificate.validUntil
      });
    const verificationUrl = buildOnlineVerificationUrl(certificate.certificateCode);
    const qrCodeDir = path.join(__dirname, '../uploads/qrcodes', instituteId.toString());
    fs.mkdirSync(qrCodeDir, { recursive: true });
    
    const qrCodePath = path.join(qrCodeDir, `${certificate.certificateCode}.png`);
    await QRCode.toFile(qrCodePath, verificationUrl, {
      width: 360,
      margin: 1
    });

    // Generate certificate image
    const generatedImagePath = await generateCertificateImage({
      template,
      studentName: certificate.studentName,
      studentEmail: student.email,
      studentPhone: student.phone,
      courseName: certificate.courseName,
      courseCode: course?.courseCode,
      courseDuration: course?.duration,
      awardDate: certificate.awardDate,
      certificateCode: certificate.certificateCode,
      qrCodeImage: qrCodePath,
      instituteId,
      instituteName: institute?.instituteName
    });

    // Update certificate
    certificate.generatedCertificateImage = generatedImagePath.replace(/\\/g, '/');
    certificate.qrCodeImage = qrCodePath.replace(/\\/g, '/');
    certificate.verificationUrl = verificationUrl;
    if (!certificate.credential?.signature) certificate.credential = signedCredential;
    await certificate.save();

    const baseUrl = process.env.API_URL || 'http://localhost:5000';
    res.json({
      success: true,
      message: 'Certificate image regenerated successfully',
      data: {
        ...certificate.toObject(),
        generatedCertificateUrl: `${baseUrl}/uploads/generated/${instituteId}/${certificate.certificateCode}.jpg`
      }
    });
  } catch (error) {
    console.error('Regenerate certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to regenerate certificate image',
      error: error.message
    });
  }
};

// Serve certificate image directly
const getCertificateImage = async (req, res) => {
  try {
    if (String(req.params.instituteId) !== String(req.userId)) return res.status(404).json({ success: false, message: 'Certificate not found' });
    const filename = req.params.filename;
    if (!/^[A-Z0-9-]+\.jpg$/.test(filename)) return res.status(404).json({ success: false, message: 'Certificate not found' });
    const certificate = await Certificate.findOne({ instituteId: req.userId, certificateCode: filename.slice(0, -4) });
    if (!certificate?.generatedCertificateImage) return res.status(404).json({ success: false, message: 'Certificate not found' });
    return res.sendFile(tenantFile(certificate.generatedCertificateImage, req.userId, ['generated']));
  } catch (error) { return res.status(error.status || 500).json({ success: false, message: 'Certificate file unavailable' }); }
};

// Download certificate image directly
const downloadCertificate = async (req, res) => {
  try {
    const instituteId = req.user?.id || req.userId;
    const { id } = req.params;

    const certificate = await Certificate.findOne({ _id: id, instituteId });

    if (!certificate || !certificate.generatedCertificateImage) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found'
      });
    }

    const filePath = tenantFile(certificate.generatedCertificateImage, instituteId, ['generated']);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Certificate image not found on server'
      });
    }

    res.download(filePath, `${certificate.certificateCode}.jpg`);
  } catch (error) {
    console.error('Download certificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download certificate',
      error: error.message
    });
  }
};

// Bulk issue certificates
const bulkIssueCertificates = (req, res) => issuance.bulkHttp(req, res);

// ============ ADDITIONAL ROUTE FOR SERVING CERTIFICATE IMAGES ============
// This is a helper route to serve certificate images directly

// Export all functions
module.exports = {
  issueCertificate,
  getCertificates,
  getCertificateById,
  verifyCertificate,
  updateCertificateStatus,
  sendCertificateEmail: sendCertificateEmailHandler,
  regenerateCertificateImage,
  bulkIssueCertificates,
  getCertificateImage,
  downloadCertificate
};
