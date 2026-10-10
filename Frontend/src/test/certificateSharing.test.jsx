import { expect, test, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CertificateSharing from '../components/verification/CertificateSharing';

test('social links share the verification page and copy the same URL', async () => {
  const writeText = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<CertificateSharing code="ABC-123" />);
  const url = `${window.location.origin}/verify/ABC-123`;
  for (const name of ['LinkedIn', 'WhatsApp', 'Facebook', 'X']) {
    fireEvent.click(screen.getByRole('button', { name }));
    expect(decodeURIComponent(screen.getByRole('link', { name: `Open ${name}` }).href)).toContain(url);
  }
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  await screen.findByText('Verification link copied.');
  expect(writeText).toHaveBeenCalledWith(url);
});

 test('shares the actual certificate file on supported devices', async () => {
  const { cleanup, waitFor } = await import('@testing-library/react');
  cleanup();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(['image'], { type: 'image/jpeg' }) }));
  const share = vi.fn().mockResolvedValue();
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
  render(<CertificateSharing code="ABC-123" imageUrl="/image" />);
  await waitFor(() => expect(fetch).toHaveBeenCalled());
  await new Promise(resolve => setTimeout(resolve, 0));
  fireEvent.click(screen.getByRole('button', { name: 'WhatsApp' }));
  await waitFor(() => expect(share).toHaveBeenCalled());
  expect(share.mock.calls[0][0].files[0]).toBeInstanceOf(File);
  expect(share.mock.calls[0][0].files[0].name).toBe('certificate-ABC-123.jpg');
  vi.unstubAllGlobals();
 });
