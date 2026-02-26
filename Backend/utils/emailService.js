const nodemailer = require('nodemailer');
const Settings = require('../models/Settings');

const createTransporter = async () => {
  try {
    const settings = await Settings.findOne();
    const emailConfig = settings?.email || {};

    return nodemailer.createTransport({
      host: emailConfig.smtpServer || process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: emailConfig.smtpPort || parseInt(process.env.EMAIL_PORT) || 587,
      secure: emailConfig.smtpPort === 465,
      auth: {
        user: emailConfig.smtpUsername || process.env.EMAIL_USER,
        pass: emailConfig.smtpPassword || process.env.EMAIL_PASS
      }
    });
  } catch (error) {
    console.error('Error creating email transporter:', error);
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
};

const sendCertificateEmail = async ({
  to,
  studentName,
  courseName,
  awardDate,
  certificateCode,
  certificateUrl,
  verificationUrl,
  instituteName
}) => {
  try {
    const transporter = await createTransporter();
    
    const settings = await Settings.findOne();
    const fromName = settings?.email?.fromName || 'Certificate Verification System';
    const fromEmail = settings?.email?.fromEmail || process.env.EMAIL_USER;

    const mailOptions = {
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject: `🎓 Your Certificate for ${courseName}`,
      html: `
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
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎉 Congratulations ${studentName}!</h1>
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
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${certificateUrl}" class="button" style="margin-right: 10px;">📄 View Certificate</a>
              <a href="${verificationUrl}" class="button" style="background: #48bb78;">✅ Verify Certificate</a>
            </div>
            
            <p>This certificate is officially issued by ${instituteName || 'our institution'} and can be verified at any time using the certificate code.</p>
            <p>Best regards,<br><strong>${instituteName || 'Certificate Verification System'}</strong></p>
          </div>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} Certificate Verification System. All rights reserved.</p>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Certificate email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

module.exports = { sendCertificateEmail };