import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ActivityTimeline from '../src/components/admin/ActivityTimeline';
import api from '../src/services/api';

vi.mock('../src/services/api', () => ({ default: { get: vi.fn() } }));
beforeEach(() => vi.resetAllMocks());

it('shows recorded details and opens the full activity view', async () => {
  api.get.mockResolvedValue({ data: { success: true, data: [{ _id: '1', action: 'APPROVE_INSTITUTE', details: { instituteName: 'Example University' }, userEmail: 'admin@example.com', timestamp: '2026-09-08T09:00:00Z' }] } });
  const onViewAll = vi.fn();
  render(<ActivityTimeline onViewAll={onViewAll} />);
  expect(await screen.findByText('Institute approved')).toBeInTheDocument();
  expect(screen.getByText('Example University')).toBeInTheDocument();
  expect(screen.getByText('By admin@example.com')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /View all activity/ }));
  expect(onViewAll).toHaveBeenCalledOnce();
});

it('shows a real empty state', async () => {
  api.get.mockResolvedValue({ data: { success: true, data: [] } });
  render(<ActivityTimeline />);
  expect(await screen.findByText(/No activity recorded yet/)).toBeInTheDocument();
});

it('retries a failed request', async () => {
  api.get.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce({ data: { success: true, data: [] } });
  render(<ActivityTimeline />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load recent activity');
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText(/No activity recorded yet/)).toBeInTheDocument();
  expect(api.get).toHaveBeenCalledTimes(2);
});
