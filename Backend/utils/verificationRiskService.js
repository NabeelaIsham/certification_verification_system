const crypto = require('crypto');
const VerificationLog = require('../models/VerificationLog');
const Notification = require('../models/Notification');

const hashPrivateValue = (value) => {
  const secret = process.env.VERIFICATION_PRIVACY_SECRET || process.env.JWT_SECRET || 'development-only';
  return crypto.createHmac('sha256', secret).update(String(value || 'unknown')).digest('hex');
};

const getClientIp = (req) => {
  // Express resolves req.ip using the explicitly configured TRUST_PROXY policy.
  // Reading X-Forwarded-For directly would allow spoofing when the API is reachable directly.
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const assessRisk = async ({ certificate, instituteId, ipHash, outcome }) => {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const [certificateRecentCount, ipRecentCount, revokedRecentCount] = await Promise.all([
    certificate
      ? VerificationLog.countDocuments({ certificate: certificate._id, createdAt: { $gte: tenMinutesAgo } })
      : 0,
    VerificationLog.countDocuments({ ipHash, createdAt: { $gte: tenMinutesAgo } }),
    certificate
      ? VerificationLog.countDocuments({
        certificate: certificate._id,
        outcome: { $in: ['revoked', 'suspended', 'superseded'] },
        createdAt: { $gte: tenMinutesAgo }
      })
      : 0
  ]);

  let riskScore = 0;
  const riskReasons = [];

  if (certificateRecentCount >= 20) {
    riskScore += 45;
    riskReasons.push('Certificate was checked more than 20 times within 10 minutes');
  }
  if (ipRecentCount >= 30) {
    riskScore += 35;
    riskReasons.push('Verifier made more than 30 checks within 10 minutes');
  }
  if (['revoked', 'suspended', 'superseded'].includes(outcome)) {
    riskScore += 35;
    riskReasons.push(`A ${outcome} credential was presented`);
  }
  if (revokedRecentCount >= 5) {
    riskScore += 30;
    riskReasons.push('A non-active credential was repeatedly presented');
  }

  return { riskScore: Math.min(riskScore, 100), riskReasons, instituteId };
};

const recordVerification = async ({
  req,
  certificate,
  certificateCode,
  outcome,
  signatureValid,
  verificationMethod = 'manual'
}) => {
  try {
    const ipHash = hashPrivateValue(getClientIp(req));
    const instituteId = certificate?.instituteId?._id || certificate?.instituteId;
    const risk = await assessRisk({ certificate, instituteId, ipHash, outcome });
    const log = await VerificationLog.create({
      certificate: certificate?._id,
      institute: instituteId,
      certificateCode,
      outcome,
      verificationMethod,
      signatureValid,
      ipHash,
      userAgentHash: hashPrivateValue(req.headers['user-agent']),
      riskScore: risk.riskScore,
      riskReasons: risk.riskReasons
    });

    if (instituteId && risk.riskScore >= 60) {
      await Notification.create({
        recipient: instituteId,
        type: 'system_alert',
        title: 'Suspicious credential verification',
        message: `${certificateCode || 'Unknown credential'} generated a risk score of ${risk.riskScore}.`,
        data: {
          verificationLogId: log._id,
          certificateCode,
          riskScore: risk.riskScore,
          reasons: risk.riskReasons
        }
      });
    }
    return log;
  } catch (error) {
    console.error('Failed to record verification analytics:', error);
    return null;
  }
};

module.exports = {
  assessRisk,
  hashPrivateValue,
  recordVerification
};
