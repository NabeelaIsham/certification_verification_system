const { appLogger } = require('../../utils/logger.js');
const Notification = require('../../models/Notification');
const Certificate = require('../../models/Certificate');
const ActivityLog = require('../../models/ActivityLog');
const { sendEmail } = require('../../utils/emailService');
const getCertificates = async (req, res) => {
  try {
    const query = {};
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
    const certificates = await Certificate.find(query)
      .populate('studentId', 'name email')
      .populate('courseId', 'courseName')
      .populate('instituteId', 'instituteName')
      .sort({
        createdAt: -1
      })
      .limit(100);
    res.json({
      success: true,
      data: certificates
    });
  } catch (error) {
    appLogger.error('Admin getCertificates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificates',
      error: error.message
    });
  }
};
const getCertificateById = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('studentId', 'name email')
      .populate('courseId', 'courseName')
      .populate('instituteId', 'instituteName');
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }
    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    appLogger.error('Admin getCertificateById error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch certificate',
      error: error.message
    });
  }
};
const revokeCertificate = async (req, res) => {
  try {
    const reason = req.body.reason || 'Revoked by administrator';
    const certificate = await Certificate.findById(req.params.id).populate(
      'instituteId',
      'instituteName email'
    );
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found'
      });
    }
    const previousStatus = certificate.status;
    certificate.status = 'revoked';
    certificate.revokedAt = new Date();
    certificate.lifecycleEvents.push({
      action: 'revoked',
      fromStatus: previousStatus,
      toStatus: 'revoked',
      reason,
      performedBy: req.userId,
      performedByType: req.userType
    });
    certificate.revocationReason = reason;
    await certificate.save();
    if (certificate.instituteId?.email) {
      try {
        await sendEmail({
          to: certificate.instituteId.email,
          subject: `Certificate Revoked: ${certificate.certificateCode}`,
          html: `<p>The certificate <strong>${certificate.certificateCode}</strong> has been revoked for reason: ${reason}</p>`
        });
      } catch (sendError) {
        appLogger.error('Admin revokeCertificate email send error:', sendError);
      }
    }
    await Promise.all([
      Notification.create({
        recipient: certificate.instituteId?._id || null,
        type: 'certificate_revoked',
        title: 'Certificate Revoked',
        message: `Certificate ${certificate.certificateCode} has been revoked.`,
        data: {
          revokedBy: req.userId,
          reason
        }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: 'REVOKE_CERTIFICATE',
        details: {
          certificateId: certificate._id,
          certificateCode: certificate.certificateCode,
          reason
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);
    res.json({
      success: true,
      message: 'Certificate revoked successfully',
      data: certificate
    });
  } catch (error) {
    appLogger.error('Admin revokeCertificate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to revoke certificate',
      error: error.message
    });
  }
};
module.exports = {
  getCertificates,
  getCertificateById,
  revokeCertificate
};
