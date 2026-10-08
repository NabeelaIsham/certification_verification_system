import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import api from '../src/services/api';
import SubscriberAnalytics from '../src/components/shared/SubscriberAnalytics';
import ApprovedPaymentReceipt from '../src/components/shared/ApprovedPaymentReceipt';
import { AdminSubscriptions } from '../src/components/shared/Subscriptions';
vi.mock('../src/services/api', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
const summary = { asOf: '2026-10-08T10:00:00Z', totals: { institutes: 251, packages: 300, consumed: 800, activeCredits: 100, revenueMinor: 1500050, approvedPayments: 200, pendingReview: 0, expiringSoon: 3 }, statuses: { active: 210, expired: 50, trial: 30, suspended: 10 }, plans: [], months: [] };
const sub = { _id: 'sub', instituteId: { instituteName: 'Trial Institute', email: 'test@example.com' }, status: 'trial', effectiveStatus: 'trial', activation: 'trial', snapshot: { name: 'Free trial', priceMinor: 0 }, startsAt: '2026-10-08T10:00:00Z', endsAt: '2099-10-22T10:00:00Z', consumed: 0, allocated: 100, reserved: 0, payments: [] };
beforeEach(() => vi.resetAllMocks());

test('uses global totals, shows precise timestamps and sends pagination and search filters', async () => {
  api.get.mockImplementation(url => Promise.resolve({ data: { data: url.endsWith('/analytics') ? summary : { items: [sub], page: 1, pageSize: 25, total: 251 } } }));
  render(<SubscriberAnalytics renderActions={() => <p>Package controls</p>} />);
  expect(await screen.findByText('251 matching package records')).toBeInTheDocument();
  expect(screen.getByText('210')).toBeInTheDocument();
  expect(screen.getByText(/^8 Oct 2026, 15:30$/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/subscriptions/admin/subscribers', { params: { search: '', status: 'all', page: 2 } }));
  fireEvent.change(screen.getByLabelText('Search institute, email, or package'), { target: { value: 'Trial' } });
  fireEvent.submit(screen.getByRole('button', { name: 'Search subscribers' }).closest('form'));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/subscriptions/admin/subscribers', { params: { search: 'Trial', status: 'all', page: 1 } }));
});
test('admin can stop a trial package with a reason from the subscriber record', async () => {
  api.get.mockImplementation(url => Promise.resolve({ data: { data: url.endsWith('/analytics') ? summary : url.endsWith('/subscribers') ? { items: [sub], page: 1, pageSize: 25, total: 1 } : url.endsWith('/bank-details') ? null : [] } }));
  api.post.mockResolvedValue({ data: {} });
  render(<AdminSubscriptions />);
  fireEvent.click(await screen.findByText('Manage package and payment'));
  fireEvent.change(screen.getByLabelText('Reason for status change'), { target: { value: 'Account review requested' } });
  fireEvent.click(screen.getByRole('button', { name: 'Stop package' }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/subscriptions/admin/subscriptions/sub/status', { status: 'suspended', reason: 'Account review requested' }));
});
test('approved receipt downloads a PDF from its authenticated payment endpoint', async () => {
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL;
  URL.createObjectURL = vi.fn(() => 'blob:approved'); URL.revokeObjectURL = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  vi.useFakeTimers();
  try {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' });
    api.get.mockResolvedValue({ data: blob });
    render(<ApprovedPaymentReceipt paymentId="payment" />);
    fireEvent.click(screen.getByRole('button', { name: 'Download approved receipt (PDF)' }));
    await vi.waitFor(() => expect(click).toHaveBeenCalled());
    expect(api.get).toHaveBeenCalledWith('/subscriptions/payments/payment/receipt', { responseType: 'blob' });
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    vi.advanceTimersByTime(1000); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:approved');
  } finally { vi.useRealTimers(); click.mockRestore(); URL.createObjectURL = create; URL.revokeObjectURL = revoke; }
});
