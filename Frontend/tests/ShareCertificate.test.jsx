import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ShareCertificate from '../src/components/student/ShareCertificate';
import StudentPortal from '../src/pages/StudentPortal';

describe('Certificate sharing', () => {
  it('shares the canonical public verification URL with encoded certificate codes', () => {
    render(<ShareCertificate certificateCode="ABC/12?x=1" />);
    const expected = 'https://certiverxia.com/verify/ABC%2F12%3Fx%3D1';
    expect(screen.getByLabelText('Public verification link')).toHaveValue(expected);
    for (const name of ['LinkedIn', 'Facebook', 'WhatsApp', 'X']) {
      const anchor = screen.getByRole('link', { name });
      const url = new URL(anchor.href);
      expect([...url.searchParams.values()].join(' ')).toContain(expected);
      expect(anchor).toHaveAttribute('rel', 'noopener noreferrer');
    }
  });
  it('provides manual copy instructions when clipboard permission is denied', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('Denied')) } });
    render(<ShareCertificate certificateCode="ABC123" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('copy it manually'));
  });
  it('looks up a real code instead of displaying sample certificates', () => {
    render(<MemoryRouter initialEntries={['/student/dashboard']}><Routes>
      <Route path="/student/dashboard" element={<StudentPortal />} />
      <Route path="/verify/ABC123" element={<p>Verification result</p>} />
    </Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Certificate code'), { target: { value: ' ABC123 ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Find certificate' }));
    expect(screen.getByText('Verification result')).toBeInTheDocument();
  });
});
