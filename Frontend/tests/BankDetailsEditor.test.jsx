import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import api from '../src/services/api';
import BankDetailsEditor from '../src/components/shared/BankDetailsEditor';
vi.mock('../src/services/api', () => ({ default: { get: vi.fn(), put: vi.fn() } }));
const bank = { bankName: 'Bank', accountHolder: 'Holder', accountNumber: '001234', branch: 'Main' };
beforeEach(() => vi.resetAllMocks());
test('loads and saves bank details without dropping leading zeroes', async () => {
  api.get.mockResolvedValue({ data: { data: bank } });
  api.put.mockImplementation((_url, data) => Promise.resolve({ data: { data } }));
  render(<BankDetailsEditor />);
  expect(await screen.findByLabelText('Account number')).toHaveValue('001234');
  fireEvent.change(screen.getByLabelText('Account number'), { target: { value: '009999' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save bank details' }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/subscriptions/admin/bank-details', { ...bank, accountNumber: '009999' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Bank details saved');
});
test('reports a save error without claiming success', async () => {
  api.get.mockResolvedValue({ data: { data: bank } });
  api.put.mockRejectedValue(new Error('Offline'));
  render(<BankDetailsEditor />);
  fireEvent.click(await screen.findByRole('button', { name: 'Save bank details' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('not saved');
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
