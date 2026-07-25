const Certificate = require('../models/Certificate');
const path = require('path');
const fs = require('fs');
const {
  verifyStoredCredential,
  credentialToCompactToken,
  isCredentialKeyTrusted
} = require('../utils/credentialService');
const { recordVerification } = require('../utils/verificationRiskService');

const getBaseUrl = () => (process.env.API_URL || 'http://localhost:5000').replace(/\/+$/, '');

const toPublicUploadUrl = (storedPath, fallbackPath) => {
  const baseUrl = getBaseUrl();
  const normalizedPath = (storedPath || fallbackPath || '').replace(/\\/g, '/');
  const uploadsIndex = normalizedPath.indexOf('/uploads/');

  if (uploadsIndex >= 0) {
    return `${baseUrl}${normalizedPath.slice(uploadsIndex)}`;
  }

  if (normalizedPath.startsWith('uploads/')) {
    return `${baseUrl}/${normalizedPath}`;
  }

  return fallbackPath ? `${baseUrl}/${fallbackPath.replace(/\\/g, '/')}` : null;
};

const verifyCertificate = async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ success: false, message: 'Certificate code is required.' });
    }
    if (!/^[A-Z0-9][A-Z0-9-]{2,99}$/.test(code)) {
      return res.status(400).json({ success: false, message: 'Certificate code format is invalid.' });
    }

    const certificate = await Certificate.findOne({ certificateCode: code })
      .populate('studentId', 'name')
      .populate('courseId', 'courseName')
      .populate(
        'instituteId',
        'instituteName credentialSigning.keyId credentialSigning.previousKeys.keyId credentialSigning.previousKeys.status'
      );

    if (!certificate) {
      await recordVerification({
        req,
        certificateCode: code,
        outcome: 'not_found',
        signatureValid: false,
        verificationMethod: req.query.method === 'qr' ? 'qr' : 'manual'
      });
      return res.status(404).json({ success: false, message: 'Certificate not found.' });
    }

    const signatureCheck = verifyStoredCredential(certificate.credential);
    const issuerKeyTrusted = Boolean(
      signatureCheck.valid &&
      isCredentialKeyTrusted(certificate.instituteId?.credentialSigning, signatureCheck.keyId)
    );
    const outcome = certificate.status === 'issued'
      ? (!certificate.credential?.signature
        ? 'unsigned'
        : signatureCheck.valid && issuerKeyTrusted
          ? 'valid'
          : 'invalid')
      : certificate.status;
    await recordVerification({
      req,
      certificate,
      certificateCode: code,
      outcome,
      signatureValid: signatureCheck.valid,
      verificationMethod: req.query.method === 'qr' ? 'qr' : 'manual'
    });

    const instituteId = certificate.instituteId?._id || certificate.instituteId;
    const instituteIdString = instituteId ? instituteId.toString() : null;
    const certificateImagePath = instituteIdString
      ? path.join(__dirname, '../uploads/generated', instituteIdString, `${certificate.certificateCode}.jpg`)
      : null;
    const qrImagePath = instituteIdString
      ? path.join(__dirname, '../uploads/qrcodes', instituteIdString, `${certificate.certificateCode}.png`)
      : null;
    const imageExists = certificateImagePath ? fs.existsSync(certificateImagePath) : false;
    const qrCodeExists = qrImagePath ? fs.existsSync(qrImagePath) : false;
    const certificateImageFallback = imageExists && instituteIdString
      ? `uploads/generated/${instituteIdString}/${certificate.certificateCode}.jpg`
      : null;
    const qrCodeFallback = qrCodeExists && instituteIdString
      ? `uploads/qrcodes/${instituteIdString}/${certificate.certificateCode}.png`
      : null;
    const certificateImageUrl = toPublicUploadUrl(certificate.generatedCertificateImage, certificateImageFallback);
    const qrCodeUrl = toPublicUploadUrl(certificate.qrCodeImage, qrCodeFallback);

    if (!imageExists) {
      console.warn(`Certificate image file missing: ${certificateImagePath}`);
    }

    return res.json({ success: true, data: {
      certificateCode: certificate.certificateCode,
      studentName: certificate.studentName || certificate.studentId?.name,
      courseName: certificate.courseName || certificate.courseId?.courseName,
      awardDate: certificate.awardDate,
      instituteName: certificate.instituteId?.instituteName,
      instituteId: certificate.instituteId,
      status: certificate.status,
      statusMessage: certificate.status === 'issued'
        ? 'Credential is active'
        : `Credential is ${certificate.status}`,
      issuedAt: certificate.createdAt,
      validUntil: certificate.validUntil,
      revokedAt: certificate.revokedAt,
      suspendedAt: certificate.suspendedAt,
      lifecycleEvents: certificate.lifecycleEvents,
      certificateImage: certificateImageUrl,
      certificateUrl: certificateImageUrl,
      qrCodeImage: qrCodeUrl,
      verificationUrl: certificate.verificationUrl,
      imageExists,
      qrCodeExists,
      credential: {
        signed: Boolean(certificate.credential?.signature),
        signatureValid: signatureCheck.valid,
        issuerKeyTrusted,
        algorithm: certificate.credential?.algorithm,
        keyId: certificate.credential?.keyId,
        hash: certificate.credential?.hash,
        signedAt: certificate.credential?.signedAt,
        compactToken: credentialToCompactToken(certificate.credential),
        verificationNote: signatureCheck.valid && issuerKeyTrusted
          ? 'The credential contents match the registered institute digital signature.'
          : signatureCheck.valid
            ? 'The signature is internally valid, but its key does not match the registered institute key.'
          : signatureCheck.reason === 'unsigned'
            ? 'This is a legacy certificate without a digital signature.'
            : 'The stored digital signature could not be validated.'
      }
    }});
  } catch (error) {
    console.error('Verify certificate error:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify certificate', error: error.message });
  }
};

module.exports = {
  verifyCertificate
};
