import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { authService } from '../src/services/auth';

vi.mock('../src/services/auth', () => ({ authService: { getCurrentUser: vi.fn(), logout: vi.fn() } }));
vi.mock('../src/services/notifications', () => ({ notify: vi.fn() }));
function Session() {
  const auth = useAuth();
  return <><p>{auth.user?.email || 'anonymous'}</p><button onClick={() => auth.acceptUser({ email: 'signed-in@example.com' })}>Complete login</button><button onClick={auth.logout}>Log out</button></>;
}
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); });

it('restores a cookie session through the server and removes legacy browser tokens', async () => {
  localStorage.setItem('token', 'legacy');
  authService.getCurrentUser.mockResolvedValue({ email: 'teacher@example.com' });
  render(<AuthProvider><Session /></AuthProvider>);
  expect(await screen.findByText('teacher@example.com')).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});

it('an older anonymous session check cannot overwrite a successful login', async () => {
  let reject;
  authService.getCurrentUser.mockImplementation(() => new Promise((_resolve, rejectRequest) => { reject = rejectRequest; }));
  render(<AuthProvider><Session /></AuthProvider>);
  fireEvent.click(screen.getByText('Complete login'));
  await act(async () => reject(new Error('old request')));
  expect(screen.getByText('signed-in@example.com')).toBeInTheDocument();
});

it('does not claim logout succeeded until the server clears the session', async () => {
  authService.getCurrentUser.mockResolvedValue({ email: 'teacher@example.com' });
  authService.logout.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce();
  render(<AuthProvider><Session /></AuthProvider>);
  await screen.findByText('teacher@example.com');
  fireEvent.click(screen.getByText('Log out'));
  await waitFor(() => expect(authService.logout).toHaveBeenCalledTimes(1));
  expect(screen.getByText('teacher@example.com')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Log out'));
  expect(await screen.findByText('anonymous')).toBeInTheDocument();
});
