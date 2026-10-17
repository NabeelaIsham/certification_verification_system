const { appLogger } = require('../../utils/logger.js');
const Notification = require('../../models/Notification');
const Settings = require('../../models/Settings');
const ActivityLog = require('../../models/ActivityLog');
const { sendEmail } = require('../../utils/emailService');
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    const settingsObj = settings.toObject();
    if (settingsObj.email?.smtpPassword) {
      settingsObj.email.smtpPassword = '********';
    }
    res.json({
      success: true,
      data: settingsObj
    });
  } catch (error) {
    appLogger.error('Admin getSettings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
};
const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    const validationError = require('../../utils/validateSettings')(updates);
    if (validationError)
      return res.status(400).json({
        success: false,
        message: validationError
      });
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }
    const updateNested = (target, source) => {
      Object.keys(source).forEach((key) => {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) return;
        if (
          source[key] &&
          typeof source[key] === 'object' &&
          !Array.isArray(source[key])
        ) {
          if (!target[key]) target[key] = {};
          updateNested(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      });
    };
    const allowed = {};
    for (const section of [
      'general',
      'security',
      'email',
      'verification',
      'certificate'
    ]) {
      if (updates[section]) allowed[section] = updates[section];
    }
    if (
      allowed.email &&
      (!allowed.email.smtpPassword || allowed.email.smtpPassword === '********')
    )
      delete allowed.email.smtpPassword;
    updateNested(settings, allowed);
    if (settings.email?.smtpPassword === '********') {
      const existing = await Settings.findOne();
      if (existing?.email?.smtpPassword) {
        settings.email.smtpPassword = existing.email.smtpPassword;
      }
    }
    settings.updatedBy = req.userId;
    await settings.save();
    const settingsObj = settings.toObject();
    if (settingsObj.email?.smtpPassword) {
      settingsObj.email.smtpPassword = '********';
    }
    await Promise.all([
      Notification.create({
        recipient: req.userId,
        type: 'settings_updated',
        title: 'Settings Updated',
        message: 'System settings have been updated successfully.',
        data: {
          updatedBy: req.user.email
        }
      }),
      ActivityLog.create({
        user: req.userId,
        userEmail: req.user?.email,
        action: 'UPDATE_SETTINGS',
        details: {
          settingsUpdated: Object.keys(updates)
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    ]);
    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settingsObj
    });
  } catch (error) {
    appLogger.error('Admin updateSettings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      error: error.message
    });
  }
};
const testEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const recipient = email || req.user?.email;
    if (!recipient) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required for test email.'
      });
    }
    await sendEmail({
      to: recipient,
      subject: 'Test Email from Certificate Verification System',
      html: `<p>This is a test email from the Certificate Verification System.</p><p>If you receive this, your email settings are working.</p>`
    });
    await ActivityLog.create({
      user: req.userId,
      userEmail: req.user?.email,
      action: 'TEST_EMAIL',
      details: {
        testEmailSentTo: recipient
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
    res.json({
      success: true,
      message: 'Test email sent successfully.'
    });
  } catch (error) {
    appLogger.error('Admin testEmail error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
};
module.exports = {
  getSettings,
  updateSettings,
  testEmail
};
