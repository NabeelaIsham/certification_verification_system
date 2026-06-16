const { sendEmail } = require('../utils/emailService');

const sendTestEmail = async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    const destinationEmail = to || process.env.EMAIL_TEST_RECEIVER || req.user?.email;

    if (!destinationEmail) {
      return res.status(400).json({ success: false, message: 'Destination email is required.' });
    }

    const messageSubject = subject || 'Test Email from Certificate Verification System';
    const html = body || `<p>This is a test message from the Certificate Verification System.</p><p>Environment: ${process.env.NODE_ENV || 'development'}</p>`;

    await sendEmail({ to: destinationEmail, subject: messageSubject, html });

    return res.json({ success: true, message: `Test email sent to ${destinationEmail}` });
  } catch (error) {
    console.error('Send test email error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send test email', error: error.message });
  }
};

module.exports = {
  sendTestEmail
};
