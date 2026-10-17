const User = require('../../Backend/models/User');

test('JSON user responses omit passwords, setup tokens and encrypted signing material', () => {
  const user = new User({
    email: 'fixture@example.com', password: 'fixture-password', userType: 'superadmin', superAdminName: 'Fixture',
    teacherPasswordSetup: { tokenHash: 'fixture-teacher-token' },
    credentialSigning: { keyId: 'public-key-id', publicKey: 'public-key', encryptedPrivateKey: 'fixture-encrypted-signing-key' }
  });
  const response = JSON.parse(JSON.stringify({ success: true, data: user }));
  expect(response.data.password).toBeUndefined();
  expect(response.data.teacherPasswordSetup).toBeUndefined();
  expect(response.data.credentialSigning.encryptedPrivateKey).toBeUndefined();
  expect(response.data.credentialSigning.publicKey).toBe('public-key');
  // Serialization must not erase material needed for password checks/signing.
  expect(user.password).toBe('fixture-password');
  expect(user.credentialSigning.encryptedPrivateKey).toBe('fixture-encrypted-signing-key');
});
