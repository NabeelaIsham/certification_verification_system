import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import OTPVerification from '../src/pages/OTPVerification';
import api from '../src/services/api';

vi.mock('../src/services/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({ data: { data: { otpExpiry: 5, resendCooldown: 0, allowResendOtp: true } } });
});

test.each([
  [{ emailSent: true, smsSent: false }, 'We could not send the SMS. Use the verification code sent to your email.'],
  [{ emailSent: false, smsSent: false }, 'We could not send your verification code. Try Resend OTP shortly or contact support.']
])('shows registration delivery failure instead of claiming an SMS was sent: %j', async (delivery, message) => {
  render(<MemoryRouter initialEntries={[{ pathname: '/OTPVerification', state: { email: 'new@example.com', delivery } }]}><OTPVerification /></MemoryRouter>);
  expect(screen.getByRole('alert')).toHaveTextContent(message);
  expect(await screen.findByRole('button', { name: 'Resend OTP' })).toBeEnabled();
});

test('resend stays disabled until the current request finishes', async () => {
  let finish;
  api.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<MemoryRouter initialEntries={[{ pathname: '/OTPVerification', state: { email: 'new@example.com' } }]}><OTPVerification /></MemoryRouter>);
  const button = await screen.findByRole('button', { name: 'Resend OTP' });
  fireEvent.click(button);
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(api.post).toHaveBeenCalledTimes(1);
  finish({ data: { message: 'If an eligible account exists, further instructions will be sent.' } });
  expect(await screen.findByText('If an eligible account exists, further instructions will be sent.')).toBeInTheDocument();
});
