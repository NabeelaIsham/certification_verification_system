import { expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CertificateSharing from '../components/verification/CertificateSharing';

test('social links share the verification page and copy the same URL', async () => {
  const writeText = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<CertificateSharing code="ABC-123" />);
  const url = `${window.location.origin}/verify/ABC-123`;
  for (const name of ['LinkedIn', 'WhatsApp', 'Facebook', 'X']) {
    expect(decodeURIComponent(screen.getByRole('link', { name }).href)).toContain(url);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  await screen.findByText('Verification link copied.');
  expect(writeText).toHaveBeenCalledWith(url);
});
