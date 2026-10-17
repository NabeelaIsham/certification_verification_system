import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import useQrScanner from '../src/pages/verification/useQrScanner';

const { scanner, cameras } = vi.hoisted(() => ({
  scanner: { start: vi.fn(), stop: vi.fn(), clear: vi.fn(), isScanning: false }, cameras: vi.fn()
}));
vi.mock('html5-qrcode', () => {
  function Html5Qrcode() { return scanner; }
  Html5Qrcode.getCameras = cameras;
  return { Html5Qrcode, Html5QrcodeSupportedFormats: { QR_CODE: 0 } };
});

it('stops a fallback camera that finishes opening after leaving the page', async () => {
  const originalMedia = Object.getOwnPropertyDescriptor(navigator, 'mediaDevices');
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn() } });
  vi.stubGlobal('isSecureContext', true);
  vi.spyOn(console, 'error').mockImplementation(() => {});
  cameras.mockRejectedValue(new Error('enumeration unavailable'));
  let finishStarting;
  scanner.start.mockImplementation(() => new Promise(resolve => { finishStarting = () => { scanner.isScanning = true; resolve(); }; }));
  scanner.stop.mockImplementation(async () => { scanner.isScanning = false; });
  try {
    const { result, unmount } = renderHook(() => useQrScanner({ setError: vi.fn(), setCertificateCode: vi.fn(), verifyCertificate: vi.fn() }));
    await act(async () => { await result.current.startScanning(); });
    await waitFor(() => expect(scanner.start).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => { finishStarting(); });
    expect(scanner.stop).toHaveBeenCalledTimes(1);
    expect(scanner.isScanning).toBe(false);
  } finally {
    if (originalMedia) Object.defineProperty(navigator, 'mediaDevices', originalMedia);
    else delete navigator.mediaDevices;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  }
});
