import { act, fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

const authState = vi.hoisted(() => ({ user: null, loading: false }));

vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => authState
}));
vi.mock('../contexts/InstituteContext', () => ({ InstituteProvider: ({ children }) => children }));
vi.mock('../services/notifications', () => ({ showRedirectNotification: vi.fn() }));
vi.mock('../pages/Login', () => ({ default: () => <h1>Sign in to your account</h1> }));
vi.mock('../pages/InstituteDashboard', () => ({ default: () => <h1>Institute workspace</h1> }));
vi.mock('../pages/VerificationPortal', async () => {
  const { useParams } = await import('react-router-dom');
  return { default: function VerificationDestination() { return <h1>Verify {useParams().code}</h1>; } };
});
import App from '../App';

async function renderRoute(path) {
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
  // Wait for the real lazy route imports and React's resulting render.
  await act(async () => { await vi.dynamicImportSettled(); });
}

beforeEach(() => {
  authState.user = null;
  authState.loading = false;
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

test('the old student route redirects to the real lookup and accepts a certificate share URL', async () => {
  await renderRoute('/student/dashboard');
  expect(await screen.findByRole('heading', { name: 'Find your certificate' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Certificate code or link'), { target: { value: 'https://certiverxia.com/certificate/ABC-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Find certificate' }));
  await act(async () => { await vi.dynamicImportSettled(); });
  expect(await screen.findByRole('heading', { name: 'Verify ABC-123' })).toBeInTheDocument();
});

test('loading routes on demand preserves the private dashboard login guard', async () => {
  await renderRoute('/institute/dashboard');
  expect(await screen.findByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument();
});

test('a confirmed cookie session opens the dashboard without a browser-stored token', async () => {
  authState.user = { userType: 'institute' };
  await renderRoute('/institute/dashboard');
  expect(await screen.findByRole('heading', { name: 'Institute workspace' })).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});

test('browser-stored credentials do not grant access without a confirmed session', async () => {
  localStorage.setItem('token', 'untrusted-browser-value');
  localStorage.setItem('user', JSON.stringify({ userType: 'institute' }));
  await renderRoute('/institute/dashboard');
  expect(await screen.findByRole('heading', { name: 'Sign in to your account' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Institute workspace' })).not.toBeInTheDocument();
});

test('the dashboard waits for the server session check before granting access', async () => {
  authState.loading = true;
  await renderRoute('/institute/dashboard');
  expect(await screen.findByText('Checking your session...')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Institute workspace' })).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Sign in to your account' })).not.toBeInTheDocument();
});
