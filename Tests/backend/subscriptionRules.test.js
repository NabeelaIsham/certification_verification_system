const { annualExpiry } = require('../../Backend/services/subscriptionService');
test('annual terms clamp leap-day expiry without rolling into March', () => {
  expect(annualExpiry(new Date('2024-02-29T12:34:56Z')).toISOString()).toBe('2025-02-28T12:34:56.000Z');
  expect(annualExpiry(new Date('2026-10-01T12:34:56Z')).toISOString()).toBe('2027-10-01T12:34:56.000Z');
});
