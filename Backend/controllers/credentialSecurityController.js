const effectiveStatus = (certificate) => certificate.status === 'issued' && certificate.validUntil && new Date(certificate.validUntil) <= new Date() ? 'expired' : certificate.status;
const crypto = require('crypto');
const mongoose = require('mongoose');
const Certificate = require('../models/Certificate');
const CredentialShare = require('../models/CredentialShare');
const VerificationLog = require('../models/VerificationLog');
const { recordVerification } = require('../utils/verificationRiskService');
const { sendCredentialShareEmail } = require('../utils/emailService');
const { isValidEmail } = require('../utils/validators');
const {
  rotateInstituteSigningKey,
  ensureInstituteSigningKey,
  isCredentialKeyTrusted,
  verifyStoredCredential
} = require('../utils/credentialService');
const User = require('../models/User');

const SHARE_FIELDS = [
  'studentName',
  'courseName',
  'awardDate',
  'instituteName',
  'certificateCode',
  'status',
  'certificateImage'
];

const getFrontendUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
const getApiUrl = () => (process.env.API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const isValidId = (value) => mongoose.Types.ObjectId.isValid(value);

const certificateImageUrl = (certificate) => {
  if (!certificate.generatedCertificateImage) return null;
  const instituteId = certificate.instituteId?._id || certificate.instituteId;
  return `${getApiUrl()}/uploads/generated/${instituteId}/${certificate.certificateCode}.jpg`;
};

const createShare = async (req, res) => {
  try {
    const instituteId = req.userId;
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID' });
    }
    const certificate = await Certificate.findOne({ _id: req.params.id, instituteId })
      .populate('studentId', 'name email')
      .populate('instituteId', 'instituteName');
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    if (!isValidEmail(certificate.studentId?.email)) {
      return res.status(400).json({
        success: false,
        message: 'The student does not have a valid registered email address'
      });
    }

    const {
      label = 'Credential share',
      visibleFields = SHARE_FIELDS,
      expiresInHours = 72,
      maxViews = 25
    } = req.body;
    if (!Array.isArray(visibleFields)) {
      return res.status(400).json({ success: false, message: 'visibleFields must be an array' });
    }
    const normalizedFields = [...new Set(visibleFields)].filter((field) => SHARE_FIELDS.includes(field));
    if (normalizedFields.length === 0) {
      return res.status(400).json({ success: false, message: 'Select at least one visible field' });
    }

    const hours = Math.min(Math.max(Number(expiresInHours) || 72, 1), 24 * 30);
    const views = Math.min(Math.max(Number(maxViews) || 25, 1), 10000);
    const token = crypto.randomBytes(32).toString('base64url');
    const share = await CredentialShare.create({
      certificate: certificate._id,
      institute: instituteId,
      tokenHash: hashToken(token),
      label,
      visibleFields: normalizedFields,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
      maxViews: views,
      createdBy: req.userId
    });
    const shareUrl = `${getFrontendUrl()}/share/${token}`;

    try {
      await sendCredentialShareEmail({
        to: certificate.studentId.email,
        studentName: certificate.studentName || certificate.studentId.name,
        courseName: certificate.courseName,
        certificateCode: certificate.certificateCode,
        instituteName: certificate.instituteId?.instituteName,
        shareUrl,
        expiresAt: share.expiresAt,
        maxViews: share.maxViews
      });
    } catch (emailError) {
      await CredentialShare.updateOne(
        { _id: share._id },
        { $set: { revokedAt: new Date() } }
      );
      console.error('Credential share email failed; share revoked:', emailError);
      return res.status(502).json({
        success: false,
        message: 'The share link could not be emailed and was revoked. Check the email configuration and try again.'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Controlled share link created and emailed to the student',
      data: {
        ...share.toObject(),
        shareUrl,
        emailSent: true,
        emailRecipient: certificate.studentId.email
      }
    });
  } catch (error) {
    console.error('Create credential share error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create share link' });
  }
};

const listShares = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID' });
    }
    const certificate = await Certificate.findOne({ _id: req.params.id, instituteId: req.userId });
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    const shares = await CredentialShare.find({ certificate: certificate._id })
      .select('-tokenHash')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: shares });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch share links' });
  }
};

const revokeShare = async (req, res) => {
  try {
    if (!isValidId(req.params.shareId)) {
      return res.status(400).json({ success: false, message: 'Invalid share ID' });
    }
    const share = await CredentialShare.findOneAndUpdate(
      { _id: req.params.shareId, institute: req.userId, revokedAt: null },
      { $set: { revokedAt: new Date() } },
      { new: true }
    ).select('-tokenHash');
    if (!share) {
      return res.status(404).json({ success: false, message: 'Active share link not found' });
    }
    return res.json({ success: true, message: 'Share link revoked', data: share });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to revoke share link' });
  }
};

const resolveShare = async (req, res) => {
  try {
    const token = String(req.params.token || '');
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) {
      return res.status(400).json({ success: false, message: 'Invalid share token' });
    }
    const now = new Date();
    const share = await CredentialShare.findOneAndUpdate({
      tokenHash: hashToken(token),
      revokedAt: null,
      expiresAt: { $gt: now },
      $expr: { $lt: ['$viewCount', '$maxViews'] }
    }, {
      $inc: { viewCount: 1 },
      $set: { lastViewedAt: now }
    }, {
      new: true
    })
      .populate({
        path: 'certificate',
        populate: {
          path: 'instituteId',
          select: 'instituteName credentialSigning.keyId credentialSigning.previousKeys.keyId credentialSigning.previousKeys.status'
        }
      });
    if (!share) {
      return res.status(410).json({ success: false, message: 'This share link is expired, revoked, or fully used' });
    }

    const certificate = share.certificate;
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    const complete = {
      studentName: certificate.studentName,
      courseName: certificate.courseName,
      awardDate: certificate.awardDate,
      instituteName: certificate.instituteId?.instituteName,
      certificateCode: certificate.certificateCode,
      status: effectiveStatus(certificate),
      certificateImage: certificateImageUrl(certificate)
    };
    const disclosed = Object.fromEntries(
      share.visibleFields
        .filter((field) => Object.prototype.hasOwnProperty.call(complete, field))
        .map((field) => [field, complete[field]])
    );
    const signatureCheck = verifyStoredCredential(certificate.credential);
    const issuerKeyTrusted = signatureCheck.valid && isCredentialKeyTrusted(
      certificate.instituteId?.credentialSigning,
      signatureCheck.keyId
    );

    await recordVerification({
      req,
      certificate,
      certificateCode: certificate.certificateCode,
      outcome: effectiveStatus(certificate) === 'issued'
        ? (issuerKeyTrusted ? 'valid' : certificate.credential?.signature ? 'invalid' : 'unsigned')
        : effectiveStatus(certificate),
      signatureValid: issuerKeyTrusted,
      verificationMethod: 'share'
    });

    return res.json({
      success: true,
      data: {
        ...disclosed,
        disclosure: {
          label: share.label,
          visibleFields: share.visibleFields,
          expiresAt: share.expiresAt,
          remainingViews: Math.max(share.maxViews - share.viewCount, 0)
        },
        signature: {
          available: Boolean(certificate.credential?.signature),
          valid: signatureCheck.valid,
          issuerKeyTrusted,
          algorithm: certificate.credential?.algorithm,
          keyId: certificate.credential?.keyId
        }
      }
    });
  } catch (error) {
    console.error('Resolve credential share error:', error);
    return res.status(500).json({ success: false, message: 'Failed to open share link' });
  }
};

const addLifecycleEvent = async (req, res) => {
  try {
    const policy = await require('../utils/settingsPolicy').getPolicy('certificate');
    if (req.body.action === 'revoke' && !policy.allowRevocation) return res.status(403).json({ success: false, message: 'Institute certificate revocation is disabled.' });
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid certificate ID' });
    }
    const { action, reason = '', supersededBy } = req.body;
    const actionConfig = {
      suspend: { from: ['issued'], to: 'suspended', event: 'suspended' },
      reinstate: { from: ['suspended'], to: 'issued', event: 'reinstated' },
      revoke: { from: ['issued', 'suspended'], to: 'revoked', event: 'revoked' },
      supersede: { from: ['issued', 'suspended'], to: 'superseded', event: 'superseded' }
    }[action];

    if (!actionConfig) {
      return res.status(400).json({ success: false, message: 'Unsupported lifecycle action' });
    }
    if ((action === 'suspend' || action === 'revoke' || action === 'supersede') && !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A reason is required for this action' });
    }

    const certificate = await Certificate.findOne({ _id: req.params.id, instituteId: req.userId });
    if (!certificate) {
      return res.status(404).json({ success: false, message: 'Certificate not found' });
    }
    if (!actionConfig.from.includes(certificate.status)) {
      return res.status(409).json({
        success: false,
        message: `Cannot ${action} a certificate with status ${certificate.status}`
      });
    }

    if (action === 'supersede') {
      if (!isValidId(supersededBy)) {
        return res.status(400).json({ success: false, message: 'Invalid replacement certificate ID' });
      }
      const replacement = await Certificate.findOne({
        _id: supersededBy,
        instituteId: req.userId,
        status: 'issued'
      });
      if (!replacement || replacement._id.equals(certificate._id)) {
        return res.status(400).json({ success: false, message: 'Select a valid issued replacement certificate' });
      }
      certificate.supersededBy = replacement._id;
    }

    const previousStatus = certificate.status;
    certificate.status = actionConfig.to;
    certificate.lifecycleEvents.push({
      action: actionConfig.event,
      fromStatus: previousStatus,
      toStatus: actionConfig.to,
      reason: reason.trim(),
      performedBy: req.userId,
      performedByType: req.userType
    });
    if (action === 'revoke') certificate.revokedAt = new Date();
    if (action === 'suspend') certificate.suspendedAt = new Date();
    if (action === 'reinstate') certificate.suspendedAt = null;
    await certificate.save();

    return res.json({
      success: true,
      message: `Certificate ${actionConfig.to} successfully`,
      data: certificate
    });
  } catch (error) {
    console.error('Credential lifecycle error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update credential lifecycle' });
  }
};

const getSecurityAnalytics = async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const logs = await VerificationLog.find({ institute: req.userId })
      .populate('certificate', 'studentName courseName certificateCode status')
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('-ipHash -userAgentHash');
    const suspiciousCount = await VerificationLog.countDocuments({
      institute: req.userId,
      riskScore: { $gte: 60 }
    });
    return res.json({ success: true, data: { logs, suspiciousCount } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch verification analytics' });
  }
};

const getSigningKeyStatus = async (req, res) => {
  try {
    const institute = await User.findById(req.userId);
    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }
    const signing = institute.credentialSigning;
    if (!signing?.keyId) {
      return res.json({ success: true, data: { initialized: false, previousKeys: [] } });
    }
    return res.json({
      success: true,
      data: {
        initialized: true,
        keyId: signing.keyId,
        algorithm: signing.algorithm,
        createdAt: signing.createdAt,
        rotatedAt: signing.rotatedAt,
        previousKeys: (signing.previousKeys || []).map((key) => ({
          keyId: key.keyId,
          algorithm: key.algorithm,
          status: key.status,
          retiredAt: key.retiredAt
        }))
      }
    });
  } catch (error) {
    console.error('Get signing key status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to read signing-key status' });
  }
};

const rotateSigningKey = async (req, res) => {
  try {
    if (req.body.confirmation !== 'ROTATE') {
      return res.status(400).json({
        success: false,
        message: 'Set confirmation to ROTATE to rotate the institute signing key'
      });
    }
    const institute = await User.findById(req.userId);
    if (!institute) {
      return res.status(404).json({ success: false, message: 'Institute not found' });
    }
    if (!institute.credentialSigning?.keyId) {
      if (req.body.compromised === true) {
        return res.status(409).json({ success: false, message: 'No signing key exists to mark as compromised' });
      }
      const initialized = await ensureInstituteSigningKey(institute);
      return res.json({
        success: true,
        message: 'Institute signing key initialized',
        data: {
          keyId: initialized.keyId,
          algorithm: initialized.algorithm,
          createdAt: initialized.createdAt
        }
      });
    }
    const signing = await rotateInstituteSigningKey(institute, {
      compromised: req.body.compromised === true
    });
    return res.json({
      success: true,
      message: req.body.compromised
        ? 'Signing key rotated; credentials using the previous compromised key are no longer trusted'
        : 'Signing key rotated; credentials using the retired key remain trusted',
      data: {
        keyId: signing.keyId,
        algorithm: signing.algorithm,
        createdAt: signing.createdAt,
        rotatedAt: signing.rotatedAt
      }
    });
  } catch (error) {
    console.error('Rotate signing key error:', error);
    return res.status(500).json({ success: false, message: 'Failed to rotate signing key' });
  }
};

module.exports = {
  addLifecycleEvent,
  createShare,
  getSecurityAnalytics,
  getSigningKeyStatus,
  listShares,
  resolveShare,
  revokeShare,
  rotateSigningKey
};
