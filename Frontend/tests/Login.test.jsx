import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Login from '../src/pages/Login.jsx';
import { authService } from '../src/services/auth';

vi.mock('../src/services/auth', () => ({ authService: { login: vi.fn(), verifyTwoFactor: vi.fn() } }));

it('waits for the second factor and preserves the code form after an incorrect code', async () => {
  localStorage.clear();
  authService.login.mockResolvedValue({ success: true, requiresTwoFactor: true, challengeToken: 'challenge' });
  authService.verifyTwoFactor.mockRejectedValue({ response: { data: { message: 'Invalid login code.' } } });
  render(<MemoryRouter><Login /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'admin@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByLabelText('Login code');
  expect(localStorage.getItem('token')).toBeNull();
  fireEvent.change(screen.getByLabelText('Login code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify and sign in' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Invalid login code.'));
  expect(screen.getByLabelText('Login code')).toBeInTheDocument();
  expect(localStorage.getItem('token')).toBeNull();
});
