const { sendCertificateEmail } = require('../utils/emailService');

const buildCertificateUrls = ({ baseUrl, instituteId, certificateCode, generatedImagePath }) => {
  const normalizedInstituteId = instituteId?.toString?.() || instituteId;
  const generatedUrl = generatedImagePath
    ? `${baseUrl}/uploads/generated/${normalizedInstituteId}/${certificateCode}.jpg`
    : null;

  return {
    generatedCertificateUrl: generatedUrl,
    certificateUrl: generatedUrl,
    downloadUrl: generatedUrl,
    qrCodeUrl: `${baseUrl}/uploads/qrcodes/${normalizedInstituteId}/${certificateCode}.png`
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

  const urls = buildCertificateUrls({
    baseUrl,
    instituteId: certificate.instituteId,
    certificateCode: certificate.certificateCode,
    generatedImagePath: certificate.generatedCertificateImage
  });

  await sendCertificateEmail({
    to: student.email,
    studentName: certificate.studentName || student.name,
    courseName: certificate.courseName,
    awardDate: certificate.awardDate,
    certificateCode: certificate.certificateCode,
    certificateUrl: urls.certificateUrl,
    downloadUrl: urls.downloadUrl,
    verificationUrl: certificate.verificationUrl,
    instituteName: institute?.instituteName,
    instituteLogoUrl: buildInstituteLogoUrl(baseUrl, institute)
  });

  certificate.emailSent = true;
  certificate.emailSentAt = new Date();
  await certificate.save();

  return { sent: true };
};


module.exports = { buildCertificateUrls, buildInstituteLogoUrl, sendIssuedCertificateNotification };
