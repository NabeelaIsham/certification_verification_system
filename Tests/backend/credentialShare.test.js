jest.mock('../../Backend/models/Certificate', () => ({
  findOne: jest.fn()
}));
jest.mock('../../Backend/models/CredentialShare', () => ({
  create: jest.fn(),
  updateOne: jest.fn()
}));
jest.mock('../../Backend/models/VerificationLog', () => ({}));
jest.mock('../../Backend/models/User', () => ({}));
jest.mock('../../Backend/utils/verificationRiskService', () => ({
  recordVerification: jest.fn()
}));
jest.mock('../../Backend/utils/emailService', () => ({
  sendCredentialShareEmail: jest.fn()
}));

const Certificate = require('../../Backend/models/Certificate');
const CredentialShare = require('../../Backend/models/CredentialShare');
const { sendCredentialShareEmail } = require('../../Backend/utils/emailService');
const { createShare } = require('../../Backend/controllers/credentialSecurityController');

const instituteId = '507f1f77bcf86cd799439011';
const certificateId = '507f191e810c19729de860ea';

const mockResponse = () => {
  const res = {
    statusCode: 200,
    body: null,
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((body) => {
      res.body = body;
      return res;
    })
  };
  return res;
};

const mockCertificateQuery = (certificate) => {
  const query = {
    populate: jest.fn(() => query),
    then: (resolve, reject) => Promise.resolve(certificate).then(resolve, reject)
  };
  Certificate.findOne.mockReturnValue(query);
};

const certificate = {
  _id: certificateId,
  instituteId: {
    _id: instituteId,
    instituteName: 'Example Institute'
  },
  studentId: {
    name: 'Ada Student',
    email: 'ada@example.com'
  },
  studentName: 'Ada Student',
  courseName: 'Applied Cryptography',
  certificateCode: 'EXA-260725-ABCDEFGHJK'
};

const share = {
  _id: '507f1f77bcf86cd799439012',
  expiresAt: new Date('2026-07-28T00:00:00.000Z'),
  maxViews: 25,
  toObject: () => ({
    _id: '507f1f77bcf86cd799439012',
    expiresAt: new Date('2026-07-28T00:00:00.000Z'),
    maxViews: 25
  })
};

describe('Controlled credential sharing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'https://verify.example';
    mockCertificateQuery(certificate);
    CredentialShare.create.mockResolvedValue(share);
    CredentialShare.updateOne.mockResolvedValue({ acknowledged: true });
    sendCredentialShareEmail.mockResolvedValue({ messageId: 'test-message' });
  });

  it('emails the student after creating the controlled link', async () => {
    const req = {
      userId: instituteId,
      params: { id: certificateId },
      body: {}
    };
    const res = mockResponse();

    await createShare(req, res);

    expect(res.statusCode).toBe(201);
    expect(sendCredentialShareEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'ada@example.com',
      certificateCode: certificate.certificateCode,
      shareUrl: expect.stringMatching(/^https:\/\/verify\.example\/share\//)
    }));
    expect(res.body.data.emailSent).toBe(true);
  });

  it('revokes the new share when email delivery fails', async () => {
    sendCredentialShareEmail.mockRejectedValue(new Error('SMTP unavailable'));
    const req = {
      userId: instituteId,
      params: { id: certificateId },
      body: {}
    };
    const res = mockResponse();

    await createShare(req, res);

    expect(res.statusCode).toBe(502);
    expect(CredentialShare.updateOne).toHaveBeenCalledWith(
      { _id: share._id },
      { $set: { revokedAt: expect.any(Date) } }
    );
  });
});
