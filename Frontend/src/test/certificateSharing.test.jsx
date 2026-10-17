import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import CertificateSharing from '../components/verification/CertificateSharing';

const originalShare = Object.getOwnPropertyDescriptor(navigator, 'share');
const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
const setNavigator = (key, value) => Object.defineProperty(navigator, key, { configurable: true, value });
afterEach(() => {
  cleanup();
  for (const [key, descriptor] of [['share', originalShare], ['clipboard', originalClipboard]]) {
    if (descriptor) Object.defineProperty(navigator, key, descriptor);
    else delete navigator[key];
  }
});

test('social buttons link directly to platform composers with the canonical certificate URL', async () => {
  const writeText = vi.fn().mockResolvedValue();
  setNavigator('clipboard', { writeText });
  const url = 'https://certiverxia.com/certificate/ABC-123';
  render(<CertificateSharing code="ABC-123" shareUrl={url} />);
  for (const [name, host, key] of [
    ['LinkedIn', 'www.linkedin.com', 'url'], ['WhatsApp', 'wa.me', 'text'],
    ['Facebook', 'www.facebook.com', 'u'], ['X', 'twitter.com', 'url'],
  ]) {
    const link = screen.getByRole('link', { name });
    const target = new URL(link.href);
    expect(target.host).toBe(host);
    expect(target.searchParams.get(key)).toBe(name === 'WhatsApp' ? `View this certificate on CERTIVERXIA ${url}` : url);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  }
  expect(screen.getByLabelText('Certificate link')).toHaveValue(url);
  expect(screen.queryByText(/download your certificate/i)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  await screen.findByText('Certificate link copied.');
  expect(writeText).toHaveBeenCalledWith(url);
});

test('native sharing immediately shares the certificate page URL', async () => {
  const share = vi.fn().mockResolvedValue();
  setNavigator('share', share);
  const url = 'https://certiverxia.com/certificate/ABC-123';
  render(<CertificateSharing code="ABC-123" shareUrl={url} />);
  fireEvent.click(screen.getByRole('button', { name: 'Share certificate' }));
  expect(share).toHaveBeenCalledWith({ title: 'CERTIVERXIA certificate', text: 'View this certificate on CERTIVERXIA', url });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share certificate' })).toBeEnabled());
});

test('browsers without native sharing copy the certificate link', async () => {
  const writeText = vi.fn().mockResolvedValue();
  setNavigator('share', undefined);
  setNavigator('clipboard', { writeText });
  render(<CertificateSharing code="ABC-123" />);
  fireEvent.click(screen.getByRole('button', { name: 'Share certificate' }));
  await screen.findByText('Certificate link copied.');
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/certificate/ABC-123`);
});

test('clipboard failure keeps a selectable link available', async () => {
  setNavigator('clipboard', { writeText: vi.fn().mockRejectedValue(new Error('Denied')) });
  render(<CertificateSharing code="ABC-123" />);
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  await screen.findByText('Copy the certificate link from the field below.');
  const field = screen.getByLabelText('Certificate link');
  fireEvent.focus(field);
  expect(field.selectionEnd - field.selectionStart).toBe(field.value.length);
});

test.each(['AbortError', 'NotAllowedError'])('native share handles %s and remains usable', async name => {
  setNavigator('share', vi.fn().mockRejectedValue(Object.assign(new Error('Share stopped'), { name })));
  render(<CertificateSharing code="ABC-123" />);
  fireEvent.click(screen.getByRole('button', { name: 'Share certificate' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Share certificate' })).toBeEnabled());
  if (name === 'AbortError') expect(screen.queryByRole('status')).not.toBeInTheDocument();
  else expect(screen.getByRole('status')).toHaveTextContent('Choose a social button or copy the certificate link below.');
});
