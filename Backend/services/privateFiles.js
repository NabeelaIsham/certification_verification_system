const fs = require('fs');
const jwt = require('jsonwebtoken');
const Certificate = require('../models/Certificate');
const Template = require('../models/CertificateTemplate');
const Share = require('../models/CredentialShare');
const { tenantFile } = require('../utils/tenantFiles');

const activeCertificate = certificate => certificate.status === 'issued' &&
  (!certificate.validUntil || new Date(certificate.validUntil) > new Date());
const privateHeaders = res => res.set({ 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff' });
const sendPrivateFile = (res, storedPath, instituteId, folder, filename) => {
  privateHeaders(res);
  const file = tenantFile(storedPath, instituteId, [folder]);
  if (!fs.existsSync(file)) return res.status(404).json({ success: false, message: 'File unavailable' });
  if (filename) res.attachment(filename);
  return res.sendFile(file, { cacheControl: false, lastModified: false, etag: false, acceptRanges: false }, error => {
    if (error && !res.headersSent) res.status(error.statusCode || 404).json({ success: false, message: 'File unavailable' });
  });
};

const scopeFor = user => {
  if (user.userType === 'institute') return { instituteId: user._id };
  if (user.userType === 'teacher' && user.permissions?.canIssueCertificates) {
    return { instituteId: user.instituteId, courseId: { $in: user.assignedCourses || [] } };
  }
  return null;
};
const certificateFile = async (req, res) => {
  privateHeaders(res);
  try {
    const scope = scopeFor(req.user);
    if (!scope) return res.sendStatus(403);
    if (!['image', 'qr', 'download'].includes(req.params.kind)) return res.sendStatus(404);
    const certificate = await Certificate.findOne({ ...scope, certificateCode: req.params.code });
    if (!certificate) return res.sendStatus(404);
    const qr = req.params.kind === 'qr';
    const file = qr ? certificate.qrCodeImage : certificate.generatedCertificateImage;
    if (!file) return res.sendStatus(404);
    return sendPrivateFile(res, file, certificate.instituteId, qr ? 'qrcodes' : 'generated',
      req.params.kind === 'download' ? `${certificate.certificateCode}.jpg` : undefined);
  } catch (error) { return res.sendStatus(error.status || 500); }
};
const templateFile = async (req, res) => {
  privateHeaders(res);
  try {
    const scope = scopeFor(req.user);
    if (!scope) return res.sendStatus(403);
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) return res.sendStatus(404);
    const template = await Template.findOne({ ...scope, _id: req.params.id });
    if (!template) return res.sendStatus(404);
    const background = req.params.kind === 'background';
    if (!background && !/^\d+$/.test(req.params.kind)) return res.sendStatus(404);
    const file = background ? template.templateImage : template.imageFields[Number(req.params.kind)]?.imagePath;
    if (!file) return res.sendStatus(404);
    return sendPrivateFile(res, file, template.instituteId, background ? 'templates' : 'template-assets');
  } catch (error) { return res.sendStatus(error.status || 500); }
};

// One counted share view grants five minutes for its image and download. Every file
// request still checks revocation, expiry, disclosure and certificate status in MongoDB.
const shareImageUrl = (share, certificate) => {
  if (!share.visibleFields.includes('certificateImage') || !activeCertificate(certificate) || !certificate.generatedCertificateImage) return null;
  const grant = jwt.sign({ shareId: String(share._id), certificateId: String(certificate._id) }, process.env.JWT_SECRET,
    { algorithm: 'HS256', audience: 'credential-file', issuer: 'certverify', expiresIn: '5m' });
  return `${(process.env.API_URL || 'http://localhost:5000').replace(/\/+$/, '')}/api/private-files/share?grant=${encodeURIComponent(grant)}`;
};
const sharedFile = async (req, res) => {
  privateHeaders(res);
  try {
    const grant = jwt.verify(req.query.grant, process.env.JWT_SECRET, { algorithms: ['HS256'], audience: 'credential-file', issuer: 'certverify' });
    const share = await Share.findOne({ _id: grant.shareId, certificate: grant.certificateId, revokedAt: null,
      expiresAt: { $gt: new Date() }, visibleFields: 'certificateImage', viewCount: { $gt: 0 }, $expr: { $lte: ['$viewCount', '$maxViews'] } });
    if (!share) return res.sendStatus(410);
    const certificate = await Certificate.findOne({ _id: share.certificate, instituteId: share.institute });
    if (!certificate || !activeCertificate(certificate) || !certificate.generatedCertificateImage) return res.sendStatus(410);
    return sendPrivateFile(res, certificate.generatedCertificateImage, certificate.instituteId, 'generated',
      req.query.download === '1' ? `${certificate.certificateCode}.jpg` : undefined);
  } catch (error) { return res.sendStatus(error.status || (['JsonWebTokenError', 'TokenExpiredError'].includes(error.name) ? 410 : 500)); }
};

module.exports = { certificateFile, templateFile, sharedFile, shareImageUrl, sendPrivateFile, privateHeaders, activeCertificate };
