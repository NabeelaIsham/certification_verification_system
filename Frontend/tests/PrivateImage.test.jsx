import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import axios from 'axios';
import PrivateImage from '../src/components/shared/PrivateImage';
import PrivateFileLink from '../src/components/shared/PrivateFileLink';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('token', 'test-access-token');
  URL.createObjectURL = vi.fn(() => 'blob:private-image');
  URL.revokeObjectURL = vi.fn();
});

it('loads private previews through authenticated blobs and releases them on unmount', async () => {
  axios.get.mockResolvedValue({ data: new Blob(['image']) });
  const { unmount } = render(<PrivateImage src="/api/private-files/certificates/AAA/image" alt="Certificate" />);
  await waitFor(() => expect(screen.getByAltText('Certificate')).toHaveAttribute('src', 'blob:private-image'));
  expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/private-files/certificates/AAA/image'), expect.objectContaining({
    responseType: 'blob', headers: { Authorization: 'Bearer test-access-token' }
  }));
  unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:private-image');
});

it('opens authorized blobs rather than exposing a bearer token in the link', async () => {
  axios.get.mockResolvedValue({ data: new Blob(['image']) });
  render(<PrivateFileLink href="/api/private-files/certificates/AAA/image">View certificate</PrivateFileLink>);
  expect(await screen.findByRole('link')).toHaveAttribute('href', 'blob:private-image');
});

it('never sends the access token to an arbitrary server URL', async () => {
  axios.get.mockResolvedValue({ data: new Blob(['image']) });
  render(<PrivateImage src="https://untrusted.example/api/private-files/certificates/AAA/image" alt="Certificate" />);
  await waitFor(() => expect(axios.get).toHaveBeenCalled());
  expect(new URL(axios.get.mock.calls[0][0]).origin).toBe(window.location.origin);
});

it('does not expose a previous image after its replacement request fails', async () => {
  axios.get.mockResolvedValueOnce({ data: new Blob(['image']) }).mockRejectedValueOnce(new Error('Forbidden'));
  const { rerender } = render(<PrivateImage src="/api/private-files/certificates/AAA/image" alt="Certificate" />);
  await waitFor(() => expect(screen.getByAltText('Certificate')).toHaveAttribute('src', 'blob:private-image'));
  rerender(<PrivateImage src="/api/private-files/certificates/BBB/image" alt="Certificate" />);
  await waitFor(() => expect(screen.getByAltText('Certificate')).not.toHaveAttribute('src'));
});
