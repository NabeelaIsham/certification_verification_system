jest.mock('../../Backend/models/Settings', () => ({ findOne: jest.fn() }));
jest.mock('../../Backend/models/Certificate', () => ({ findOneAndUpdate: jest.fn() }));
jest.mock('../../Backend/middleware/authMiddleware', () => ({ authenticateToken: (req, res, next) => { req.userId = 'admin'; req.user = { email: 'admin@example.com' }; next(); }, authorizeSuperAdmin: (req, res, next) => next() }));
jest.mock('multer', () => {
  const multer = jest.fn(() => ({ fields: () => jest.fn() }));
  multer.diskStorage = jest.fn(); return multer;
});
const express = require('express');
const request = require('supertest');
const Certificate = require('../../Backend/models/Certificate');
const Settings = require('../../Backend/models/Settings');
const multer = require('multer');
const { createTemplate } = require('../../Backend/controllers/certificateTemplateController');
const app = express(); app.use(express.json()); app.use('/admin', require('../../Backend/routes/adminRoutes'));
beforeEach(() => { Certificate.findOneAndUpdate.mockReset(); Settings.findOne.mockReset(); multer.mockClear(); });
test('super admin certificate approval endpoint is removed', async () => {
  const result = await request(app).put('/admin/certificates/123/approve').send({});
  expect(result.status).toBe(404);
  expect(Certificate.findOneAndUpdate).not.toHaveBeenCalled();
});
test('uploads use configured size and reject disabled formats', async () => {
  Settings.findOne.mockResolvedValue({ certificate: { maxFileSize: 12, allowedFormats: ['PNG'] } });
  await createTemplate({}, {});
  const config = multer.mock.calls[0][0];
  expect(config.limits.fileSize).toBe(12 * 1024 * 1024);
  const callback = jest.fn();
  config.fileFilter({}, { originalname: 'template.jpg', mimetype: 'image/jpeg' }, callback);
  expect(callback).toHaveBeenCalledWith(expect.any(Error), false);
  callback.mockClear();
  config.fileFilter({}, { originalname: 'template.png', mimetype: 'image/png' }, callback);
  expect(callback).toHaveBeenCalledWith(null, true);
});
