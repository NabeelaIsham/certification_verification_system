const fs = require('fs');
const Certificate = require('../models/Certificate');
const { normalizeCertificateCode, inspectPublicCertificate, publicCertificateLinks } = require('../utils/publicCertificate');
const { tenantFile } = require('../utils/tenantFiles');
const { privateHeaders } = require('../services/privateFiles');
const { publicCertificatePage } = require('../views/publicCertificatePage');
const { appLogger } = require('../utils/logger');

const showPublicCertificate = async (req, res) => {
  privateHeaders(res);
  const code = normalizeCertificateCode(req.params.code);
  if (!code) return res.status(400).type('text').send('Invalid certificate code.');
  const links = publicCertificateLinks(code);
  const unavailable = (status, description) => res.status(status).type('html').send(publicCertificatePage({
    title: 'Certificate unavailable | CERTIVERXIA', description, links, unavailable: true
  }));
  try {
    const certificate = await Certificate.findOne({ certificateCode: code })
      .populate('studentId', 'name').populate('courseId', 'courseName')
      .populate('instituteId', 'instituteName credentialSigning.keyId credentialSigning.previousKeys');
    if (!certificate) return unavailable(404, 'This certificate could not be found. Check the link or contact the issuing institute.');
    const { status, trusted, imageAllowed } = inspectPublicCertificate(certificate);
    if (status !== 'issued') return unavailable(410, `This certificate is ${status}. Open the verification details for its current record.`);
    if (!imageAllowed) return unavailable(403, 'This certificate could not be authenticated. Open the verification details before relying on it.');
    const image = Boolean(certificate.generatedCertificateImage && fs.existsSync(tenantFile(
      certificate.generatedCertificateImage, certificate.instituteId?._id, ['generated']
    )));
    const student = certificate.studentName || certificate.studentId?.name || 'Recipient';
    const course = certificate.courseName || certificate.courseId?.courseName || 'Achievement';
    const institute = certificate.instituteId?.instituteName || 'Issuing institute';
    return res.type('html').send(publicCertificatePage({
      title: `${student} — ${course} | CERTIVERXIA`,
      description: `${course}, awarded to ${student} by ${institute}. View the certificate and check its current verification status on CERTIVERXIA.`,
      links, image, student, course, institute, code, verified: trusted
    }));
  } catch (error) {
    appLogger.error('Public certificate page failed', error);
    return unavailable(error.status === 403 ? 403 : 503, 'The certificate cannot be displayed right now. Please try again or contact the issuing institute.');
  }
};

module.exports = { showPublicCertificate };
