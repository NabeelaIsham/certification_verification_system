const effectiveStatus = (certificate) => certificate.status === 'issued' && certificate.validUntil && new Date(certificate.validUntil) <= new Date() ? 'expired' : certificate.status;
const Certificate = require('../models/Certificate');
const {
  verifyStoredCredential,
  isCredentialKeyTrusted
} = require('../utils/credentialService');
const { recordVerification } = require('../utils/verificationRiskService');
const { sendPrivateFile, privateHeaders } = require('../services/privateFiles');

const viewVerifiedCertificate = async (req, res) => {
  privateHeaders(res);
  try {
    const code = String(req.params.code || '').trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9-]{2,99}$/.test(code)) return res.sendStatus(400);
    const certificate = await Certificate.findOne({ certificateCode: code })
      .populate('instituteId', 'credentialSigning.keyId credentialSigning.previousKeys');
    if (!certificate || !certificate.generatedCertificateImage) return res.sendStatus(404);
    if (effectiveStatus(certificate) !== 'issued') return res.sendStatus(410);
    if (certificate.credential?.signature) {
      const signature = verifyStoredCredential(certificate.credential);
      if (!signature.valid || !isCredentialKeyTrusted(certificate.instituteId?.credentialSigning, signature.keyId)) return res.sendStatus(403);
    }
    return sendPrivateFile(res, certificate.generatedCertificateImage, certificate.instituteId._id, 'generated');
  } catch (error) { return res.sendStatus(error.status || 500); }
};

const verifyCertificate = async (req, res) => {
  res.set({ 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
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
    const outcome = effectiveStatus(certificate) === 'issued'
      ? (!certificate.credential?.signature
        ? 'unsigned'
        : signatureCheck.valid && issuerKeyTrusted
          ? 'valid'
          : 'invalid')
      : effectiveStatus(certificate);
    await recordVerification({
      req,
      certificate,
      certificateCode: code,
      outcome,
      signatureValid: signatureCheck.valid,
      verificationMethod: req.query.method === 'qr' ? 'qr' : 'manual'
    });

    return res.json({ success: true, data: {
      certificateCode: certificate.certificateCode,
      certificateImage: ['valid', 'unsigned'].includes(outcome) && certificate.generatedCertificateImage
        ? `${req.baseUrl}/${encodeURIComponent(certificate.certificateCode)}/image` : null,
      studentName: certificate.studentName || certificate.studentId?.name,
      courseName: certificate.courseName || certificate.courseId?.courseName,
      awardDate: certificate.awardDate,
      instituteName: certificate.instituteId?.instituteName,
      status: effectiveStatus(certificate),
      statusMessage: effectiveStatus(certificate) === 'issued'
        ? 'Credential is active'
        : `Credential is ${effectiveStatus(certificate)}`,
      issuedAt: certificate.createdAt,
      validUntil: certificate.validUntil,
      revokedAt: certificate.revokedAt,
      suspendedAt: certificate.suspendedAt,
      verificationUrl: certificate.verificationUrl,
      credential: {
        signed: Boolean(certificate.credential?.signature),
        signatureValid: signatureCheck.valid,
        issuerKeyTrusted,
        algorithm: certificate.credential?.algorithm,
        keyId: certificate.credential?.keyId,
        hash: certificate.credential?.hash,
        signedAt: certificate.credential?.signedAt,
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
  verifyCertificate,
  viewVerifiedCertificate
};
