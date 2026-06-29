const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

const DEFAULT_FROM_NAME = 'Certificate Verification System';

const getEmailSettings = async () => {
  try {
    const settings = await Settings.findOne();
    return settings?.email || {};
  } catch (error) {
    console.error('Error loading email settings:', error);
    return {};
  }
};

const hasValue = (value) => typeof value === 'string' && value.trim().length > 0;

const createTransporter = async () => {
  const emailConfig = await getEmailSettings();
  const settingsHaveAuth = hasValue(emailConfig.smtpUsername) || hasValue(emailConfig.smtpPassword);
  const host = settingsHaveAuth && hasValue(emailConfig.smtpServer)
    ? emailConfig.smtpServer.trim()
    : process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = Number(settingsHaveAuth && emailConfig.smtpPort ? emailConfig.smtpPort : process.env.EMAIL_PORT || 587);
  const smtpUser = (settingsHaveAuth && hasValue(emailConfig.smtpUsername) ? emailConfig.smtpUsername : process.env.EMAIL_USER || '').trim();
  const smtpPass = (settingsHaveAuth && hasValue(emailConfig.smtpPassword) ? emailConfig.smtpPassword : process.env.EMAIL_PASS || '').replace(/\s+/g, '');

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });
};

const getFromDetails = async () => {
  const emailConfig = await getEmailSettings();
  return {
    fromName: hasValue(emailConfig.fromName) ? emailConfig.fromName.trim() : process.env.EMAIL_FROM_NAME || DEFAULT_FROM_NAME,
    fromEmail: hasValue(emailConfig.fromEmail) ? emailConfig.fromEmail.trim() : process.env.EMAIL_USER
  };
};

const sendEmail = async ({ to, subject, html }) => {
  const transporter = await createTransporter();
  const { fromName, fromEmail } = await getFromDetails();

  if (!fromEmail) {
    throw new Error('Email sender is not configured. Set EMAIL_USER and EMAIL_PASS.');
  }

  return transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    subject,
    html
  });
};

const buildOtpEmailHtml = ({ title, intro, otp, footerNote }) => `
  <!DOCTYPE html>
  <html>
  <body style="font-family: Arial, sans-serif; background: #f7f7f7; margin: 0; padding: 24px;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">
      <div style="background: #1d4ed8; color: #ffffff; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${title}</h1>
      </div>
      <div style="padding: 24px; color: #111827;">
        <p style="margin-top: 0;">${intro}</p>
        <div style="margin: 24px 0; text-align: center;">
          <div style="display: inline-block; background: #eff6ff; color: #1d4ed8; font-size: 32px; letter-spacing: 8px; font-weight: bold; padding: 16px 24px; border-radius: 10px;">
            ${otp}
          </div>
        </div>
        <p style="margin-bottom: 8px;">This OTP expires in 5 minutes.</p>
        <p style="margin-bottom: 0; color: #4b5563;">${footerNote}</p>
      </div>
    </div>
  </body>
  </html>
`;

const sendOtpEmail = async ({ to, otp, purpose = 'verification' }) => {
  const isPasswordReset = purpose === 'reset_password';
  const subject = isPasswordReset ? 'Your Password Reset OTP' : 'Verify Your Email';
  const html = buildOtpEmailHtml({
    title: isPasswordReset ? 'Password Reset OTP' : 'Email Verification OTP',
    intro: isPasswordReset
      ? 'Use the following OTP to reset your password.'
      : 'Use the following OTP to verify your email address.',
    otp,
    footerNote: isPasswordReset
      ? 'If you did not request a password reset, you can ignore this email.'
      : 'If you did not create an account, you can ignore this email.'
  });

  const info = await sendEmail({ to, subject, html });
  console.log(`OTP email sent to ${to}: ${info.messageId}`);
  return info;
};

const sendCertificateEmail = async ({
  to,
  studentName,
  courseName,
  awardDate,
  certificateCode,
  certificateUrl,
  downloadUrl,
  verificationUrl,
  instituteName
}) => {
  const resolvedDownloadUrl = downloadUrl || certificateUrl;
  const subject = `Your Certificate for ${courseName}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .certificate-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
        .certificate-code { background: #f0f0f0; padding: 10px; font-family: monospace; font-size: 18px; text-align: center; border-radius: 5px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; font-weight: bold; }
        .button.secondary { background: #48bb78; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Congratulations ${studentName}!</h1>
      </div>
      <div class="content">
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>We are pleased to inform you that you have successfully completed the course:</p>
        <div class="certificate-info">
          <h2 style="color: #667eea; margin-top: 0;">${courseName}</h2>
          <p><strong>Award Date:</strong> ${new Date(awardDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}</p>
          <p><strong>Institute:</strong> ${instituteName || 'Our Institute'}</p>
        </div>
        <div class="certificate-code">
          <strong>Certificate Code:</strong> ${certificateCode}
        </div>
        <p style="margin: 18px 0 0;"><strong>Award Date:</strong> ${new Date(awardDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}</p>
        <div style="text-align: center; margin: 30px 0;">
          ${resolvedDownloadUrl ? `<a href="${resolvedDownloadUrl}" class="button" style="margin-right: 10px;">Download Certificate</a>` : ''}
          ${verificationUrl ? `<a href="${verificationUrl}" class="button secondary">Verify Certificate</a>` : ''}
        </div>
        <p>This certificate is officially issued by ${instituteName || 'our institution'} and can be verified at any time using the certificate code.</p>
        <p>Best regards,<br><strong>${instituteName || DEFAULT_FROM_NAME}</strong></p>
      </div>
      <div class="footer">
        <p>© ${new Date().getFullYear()} ${DEFAULT_FROM_NAME}. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const info = await sendEmail({ to, subject, html });
  console.log(`Certificate email sent to ${to}: ${info.messageId}`);
  return info;
};

module.exports = {
  createTransporter,
  sendEmail,
  sendOtpEmail,
  sendCertificateEmail
};
