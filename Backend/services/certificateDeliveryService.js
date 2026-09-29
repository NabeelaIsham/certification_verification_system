const { sendCertificateEmail } = require('../utils/emailService');
const crypto = require('crypto');
const Share = require('../models/CredentialShare');

const buildCertificateUrls = ({ baseUrl, certificateCode, generatedImagePath }) => {
  const generatedUrl = generatedImagePath
    ? `${baseUrl}/api/private-files/certificates/${certificateCode}/image`
    : null;

  return {
    generatedCertificateUrl: generatedUrl,
    certificateUrl: generatedUrl,
    downloadUrl: generatedUrl ? `${baseUrl}/api/private-files/certificates/${certificateCode}/download` : null,
    qrCodeUrl: `${baseUrl}/api/private-files/certificates/${certificateCode}/qr`
  };
};

const buildInstituteLogoUrl = (baseUrl, institute) => {
  if (!institute?.logo) return null;
  if (/^https?:\/\//i.test(institute.logo)) return institute.logo;

  return `${baseUrl}/${institute.logo.replace(/^\/+/, '').replace(/\\/g, '/')}`;
};

const sendIssuedCertificateNotification = async ({ certificate, student, institute, baseUrl }) => {
  if (!certificate?.generatedCertificateImage || !student?.email) {
    return { sent: false, reason: 'certificate image or student email missing' };
  }

  const token = crypto.randomBytes(32).toString('base64url');
  const instituteId = certificate.instituteId?._id || certificate.instituteId;
  const share = await Share.create({ certificate: certificate._id, institute: instituteId,
    createdBy: instituteId, tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    label: 'Certificate delivery', visibleFields: ['studentName', 'courseName', 'awardDate', 'instituteName', 'certificateCode', 'status', 'certificateImage'],
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), maxViews: 25 });
  const shareUrl = `${(process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '')}/share/${token}`;
  try {
    await sendCertificateEmail({
      to: student.email,
      studentName: certificate.studentName || student.name,
      courseName: certificate.courseName,
      awardDate: certificate.awardDate,
      certificateCode: certificate.certificateCode,
      certificateUrl: shareUrl,
      downloadUrl: shareUrl,
      verificationUrl: certificate.verificationUrl,
      instituteName: institute?.instituteName,
      instituteLogoUrl: buildInstituteLogoUrl(baseUrl, institute)
    });

  } catch (error) {
    await Share.updateOne({ _id: share._id }, { $set: { revokedAt: new Date() } });
    throw error;
  }
  certificate.emailSent = true;
  certificate.emailSentAt = new Date();
  await certificate.save();

  return { sent: true };
};


module.exports = { buildCertificateUrls, buildInstituteLogoUrl, sendIssuedCertificateNotification };
