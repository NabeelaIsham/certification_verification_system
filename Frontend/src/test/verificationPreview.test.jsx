import { expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';
import VerificationPortal from '../pages/VerificationPortal';

vi.mock('axios', () => ({ default: { get: vi.fn() } }));
vi.mock('html5-qrcode', () => ({ Html5Qrcode: vi.fn(), Html5QrcodeSupportedFormats: { QR_CODE: 0 } }));
test('verification link displays the returned certificate image and social sharing', async () => {
  axios.get.mockResolvedValue({ data: { success: true, data: {
    certificateCode: 'ABC-123', status: 'issued', studentName: 'Jane', courseName: 'Design',
    certificateImage: '/api/certificates/verify/ABC-123/image',
    credential: { signed: true, signatureValid: true, issuerKeyTrusted: true },
  } } });
  render(<MemoryRouter initialEntries={['/verify/ABC-123']}><Routes><Route path="/verify/:code" element={<VerificationPortal />} /></Routes></MemoryRouter>);
  expect(await screen.findByRole('img', { name: 'Certificate' })).toHaveAttribute('src', '/api/certificates/verify/ABC-123/image');
  expect(screen.getByRole('link', { name: 'LinkedIn' })).toBeInTheDocument();
});
