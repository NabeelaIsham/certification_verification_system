const {
  buildSignedVerificationUrl,
  buildOnlineVerificationUrl,
  createSignedCredential,
  isCredentialKeyTrusted,
  rotateInstituteSigningKey,
  validateSigningKeyMaterial,
  verifyStoredCredential
} = require('../../Backend/utils/credentialService');

describe('Credential signing service', () => {
  beforeAll(() => {
    process.env.CREDENTIAL_KEY_ENCRYPTION_SECRET = 'credential-service-test-secret';
    process.env.FRONTEND_URL = 'https://verify.example';
    process.env.API_URL = 'https://api.example';
  });

  const createInstitute = () => ({
    _id: '507f1f77bcf86cd799439011',
    instituteName: 'Example University',
    credentialSigning: {},
    save: jest.fn().mockResolvedValue(undefined)
  });

  it('creates a signed education credential that verifies successfully', async () => {
    const institute = createInstitute();
    const credential = await createSignedCredential({
      certificateCode: 'EXA-260725-0001',
      studentName: 'Ada Lovelace',
      courseName: 'Applied Cryptography',
      awardDate: '2026-07-25',
      institute
    });

    const verification = verifyStoredCredential(credential);

    expect(verification.valid).toBe(true);
    expect(verification.payload.certificateCode).toBe('EXA-260725-0001');
    expect(verification.payload.credentialSubject.name).toBe('Ada Lovelace');
    expect(institute.save).toHaveBeenCalledTimes(1);
  });

  it('detects a modified signed payload', async () => {
    const credential = await createSignedCredential({
      certificateCode: 'EXA-260725-0002',
      studentName: 'Grace Hopper',
      courseName: 'Computer Science',
      awardDate: '2026-07-25',
      institute: createInstitute()
    });
    const original = Buffer.from(credential.payloadEncoded, 'base64url');
    const payload = JSON.parse(original.toString('utf8'));
    payload.credentialSubject.name = 'Modified Name';
    credential.payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');

    expect(verifyStoredCredential(credential).valid).toBe(false);
  });

  it('embeds the compact credential in the verification URL', async () => {
    const credential = await createSignedCredential({
      certificateCode: 'EXA-260725-0003',
      studentName: 'Katherine Johnson',
      courseName: 'Orbital Mechanics',
      awardDate: '2026-07-25',
      institute: createInstitute()
    });
    const url = new URL(buildSignedVerificationUrl('EXA-260725-0003', credential));

    expect(url.pathname).toBe('/verify/EXA-260725-0003');
    expect(new URLSearchParams(url.hash.slice(1)).get('credential')).toBeTruthy();
    expect(url.search).toBe('');
  });

  it('builds a short scannable online verification URL', () => {
    const url = buildOnlineVerificationUrl('EXA-260725-ABCDEFGHIJ');
    expect(url).toBe('https://verify.example/verify/EXA-260725-ABCDEFGHIJ');
    expect(url).not.toContain('credential=');
  });

  it('rotates keys while preserving or revoking trust according to compromise status', async () => {
    const institute = createInstitute();
    const credential = await createSignedCredential({
      certificateCode: 'EXA-260725-0004',
      studentName: 'Dorothy Vaughan',
      courseName: 'Numerical Computing',
      awardDate: '2026-07-25',
      institute
    });
    const originalKeyId = credential.keyId;
    expect(validateSigningKeyMaterial(institute.credentialSigning)).toBe(true);

    await rotateInstituteSigningKey(institute, { compromised: false });
    expect(institute.credentialSigning.keyId).not.toBe(originalKeyId);
    expect(isCredentialKeyTrusted(institute.credentialSigning, originalKeyId)).toBe(true);

    const retiredCurrentKeyId = institute.credentialSigning.keyId;
    await rotateInstituteSigningKey(institute, { compromised: true });
    expect(isCredentialKeyTrusted(institute.credentialSigning, retiredCurrentKeyId)).toBe(false);
  });
});
