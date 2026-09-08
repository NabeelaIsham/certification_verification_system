jest.mock('../../Backend/models/Settings', () => ({ findOne: jest.fn() }));
jest.mock('../../Backend/models/Notification', () => ({ create: jest.fn() }));
jest.mock('../../Backend/models/ActivityLog', () => ({ create: jest.fn() }));
jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));
const Settings = require('../../Backend/models/Settings');
const nodemailer = require('nodemailer');
const { updateSettings } = require('../../Backend/controllers/adminController');
const { sendOtpEmail } = require('../../Backend/utils/emailService');

beforeEach(() => jest.resetAllMocks());
test.each(['', '********'])('saving password %j preserves existing SMTP credentials', async (password) => {
  const settings = { email: { smtpPassword: 'existing-secret' }, save: jest.fn(), toObject() { return { email: { ...this.email } }; } };
  Settings.findOne.mockResolvedValue(settings);
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  await updateSettings({ body: { email: { smtpPassword: password, fromName: 'Updated name' } }, user: { email: 'admin@example.com' }, userId: 'admin', get: () => '' }, res);
  expect(settings.email.smtpPassword).toBe('existing-secret');
  expect(settings.email.fromName).toBe('Updated name');
  expect(settings.save).toHaveBeenCalled();
  expect(res.json.mock.calls[0][0].data.email.smtpPassword).toBe('********');
});
test('email delivery uses saved SMTP settings and configured OTP expiry', async () => {
  Settings.findOne.mockResolvedValue({ email: { smtpServer: 'smtp.example.com', smtpPort: 465, smtpUsername: 'sender', smtpPassword: 'password with spaces', fromEmail: 'sender@example.com', fromName: 'Certificates' }, verification: { otpExpiry: 12 } });
  const sendMail = jest.fn().mockResolvedValue({ messageId: 'test' });
  nodemailer.createTransport.mockReturnValue({ sendMail });
  await sendOtpEmail({ to: 'admin@example.com', otp: '123456', purpose: 'login' });
  expect(nodemailer.createTransport).toHaveBeenCalledWith(expect.objectContaining({ host: 'smtp.example.com', port: 465, secure: true, auth: { user: 'sender', pass: 'password with spaces' } }));
  expect(sendMail).toHaveBeenCalledWith(expect.objectContaining({ from: '"Certificates" <sender@example.com>', html: expect.stringContaining('12 minutes') }));
});
