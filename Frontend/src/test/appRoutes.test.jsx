import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({ user: null, loading: false })
}));
vi.mock('../contexts/InstituteContext', () => ({ InstituteProvider: ({ children }) => children }));
vi.mock('../services/notifications', () => ({ showRedirectNotification: vi.fn() }));
vi.mock('../pages/Login', () => ({ default: () => <h1>Sign in to your account</h1> }));
vi.mock('../pages/VerificationPortal', async () => {
  const { useParams } = await import('react-router-dom');
  return { default: function VerificationDestination() { return <h1>Verify {useParams().code}</h1>; } };
});
import App from '../App';

afterEach(cleanup);

test('the old student route redirects to the real lookup and accepts a certificate share URL', async () => {
  render(<MemoryRouter initialEntries={['/student/dashboard']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Find your certificate' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Certificate code or link'), { target: { value: 'https://certiverxia.com/certificate/ABC-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find certificate' }));
  expect(await screen.findByRole('heading', { name: 'Verify ABC-123' })).toBeInTheDocument();
});

test('loading routes on demand preserves the private dashboard login guard', async () => {
  render(<MemoryRouter initialEntries={['/institute/dashboard']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument();
});
