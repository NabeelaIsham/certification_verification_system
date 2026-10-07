import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import api from '../src/services/api';
import { Pricing, InstituteSubscription, AdminSubscriptions } from '../src/components/shared/Subscriptions';
vi.mock('../src/services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const plan = { _id: 'plan', name: 'Starter', priceMinor: 1490000, limits: { certificates: 100, teachers: 2, templates: 2 }, features: {}, active: true, displayOrder: 0, recommended: false };
const empty = { subscriptions: [], payments: [], usage: [], teachers: 0, templates: 0 };
beforeEach(() => { vi.resetAllMocks(); });
test('pricing displays server-provided annual allowances and no automatic renewal', async () => {
  api.get.mockResolvedValue({ data: { data: [plan] } });
  render(<MemoryRouter><Pricing /></MemoryRouter>);
  expect(await screen.findByText('100 certificate credits')).toBeInTheDocument();
  expect(screen.getByText(/No trial or automatic renewal/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Choose package' })).toHaveAttribute('href', '/institute/subscription');
});
test('failed subscription requests reuse the idempotency key on retry', async () => {
  api.get.mockImplementation(url => Promise.resolve({ data: { data: url.endsWith('/mine') ? empty : [plan] } }));
  api.post.mockRejectedValueOnce({ response: { data: { message: 'Try again' } } }).mockResolvedValue({ data: {} });
  render(<InstituteSubscription />);
  fireEvent.click(await screen.findByRole('button', { name: 'Request Starter' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Try again');
  fireEvent.click(screen.getByRole('button', { name: 'Request Starter' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledTimes(2));
  expect(api.post.mock.calls[0][1]).toEqual({ planId: 'plan' });
  expect(api.post.mock.calls[0][2].headers['Idempotency-Key']).toBe(api.post.mock.calls[1][2].headers['Idempotency-Key']);
});
test('institute dashboard shows quota warnings and blocks a second active request', async () => {
  const data = { ...empty, subscriptions: [{ _id: 'subscription', snapshot: plan, effectiveStatus: 'active', consumed: 90, allocated: 100, reserved: 1, remaining: 9, endsAt: new Date(Date.now() + 2 * 86400000).toISOString() }] };
  api.get.mockImplementation(url => Promise.resolve({ data: { data: url.endsWith('/mine') ? data : [plan] } }));
  render(<InstituteSubscription />);
  expect(await screen.findByText('90% usage threshold reached.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Request Starter' })).toBeDisabled();
  expect(screen.getByText(/Renew soon/)).toBeInTheDocument();
});
test('manual activation submits entered bank reference and exact minor-unit amount', async () => {
  const sub = { _id: 'subscription', instituteId: { instituteName: 'Test Institute' }, snapshot: plan, status: 'pending', paymentProof: { transactionNumber: 'BANK-123', status: 'submitted', receiptVersion: 'receipt-1' }, consumed: 0, allocated: 0, reserved: 0 };
  api.get.mockImplementation(url => Promise.resolve({ data: { data: url.endsWith('/plans') ? [plan] : url.endsWith('/events') ? [] : [sub] } }));
  api.post.mockResolvedValue({ data: {} });
  render(<AdminSubscriptions />);
  expect(await screen.findByLabelText('Bank transaction number')).toHaveValue('BANK-123');
  fireEvent.change(screen.getByLabelText('Amount received (LKR)'), { target: { value: '14900' } });
  fireEvent.click(screen.getByLabelText('I verified this bank payment.'));
  fireEvent.click(screen.getByRole('button', { name: 'Record payment and activate' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/subscriptions/admin/subscriptions/subscription/activate', { reference: 'BANK-123', amountMinor: 1490000, receiptVersion: 'receipt-1' }));
});
