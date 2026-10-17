import { useState, useRef, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { extractCertificateCode } from './verificationData';
export default function useQrScanner({
  setError,
  setCertificateCode,
  verifyCertificate
}) {
  const [scanMode, setScanMode] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('');
  const scannerRef = useRef(null);
  const lastScannerErrorLogRef = useRef(0);
  const scanHandledRef = useRef(false);
  const clearScanner = async (scanner) => {
    if (!scanner) return;
    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      await Promise.resolve(scanner.clear());
    } catch (clearError) {
      console.error('Scanner cleanup error:', clearError);
    }
  };
  const getCameraErrorMessage = (err) => {
    const errorName = err?.name || '';
    if (!window.isSecureContext) {
      return 'Camera access requires HTTPS (or http://localhost). Open the site on a secure URL.';
    }
    if (
      errorName === 'NotAllowedError' ||
      errorName === 'PermissionDeniedError'
    ) {
      return 'Camera permission was blocked. Allow camera access in your browser settings and try again.';
    }
    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return 'No camera was found on this device. You can enter the certificate code instead.';
    }
    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      return 'Camera is in use by another app. Close other camera apps and try again.';
    }
    return 'Unable to start camera. Enter the certificate code instead.';
  };
  const startScanning = async () => {
    setError('');
    setCameraStatus('Starting camera...');
    scanHandledRef.current = false;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        'This browser does not support camera access. Please enter the certificate code manually.'
      );
      setCameraStatus('');
      setScanMode(false);
      return;
    }
    if (!window.isSecureContext) {
      setError(
        getCameraErrorMessage({
          name: 'InsecureContextError'
        })
      );
      setCameraStatus('');
      setScanMode(false);
      return;
    }
    setScanMode(true);
  };
  useEffect(() => {
    if (!scanMode || scannerRef.current) return;
    let cancelled = false;
    const scanner = new Html5Qrcode('qr-reader', {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false
    });
    const scanConfig = {
      fps: 15,
      qrbox: {
        width: 260,
        height: 260
      },
      aspectRatio: 1
    };
    const onScanSuccess = (decodedText) => {
      if (scanHandledRef.current) return;
      const normalizedCode = extractCertificateCode(decodedText);
      if (!normalizedCode) {
        setError(
          'Scanned QR code is invalid. Please scan a valid certificate QR code.'
        );
        return;
      }
      scanHandledRef.current = true;
      setCertificateCode(normalizedCode);
      setCameraStatus('QR code found. Verifying certificate...');
      stopScanning({
        keepStatus: true
      });
      verifyCertificate(normalizedCode, {
        rawQrValue: decodedText,
        method: 'qr'
      });
    };
    const onScanFailure = (errorMessage) => {
      const normalizedError = (errorMessage || '').toLowerCase();
      if (
        normalizedError.includes('not found') ||
        normalizedError.includes(
          'no multiformat readers were able to detect'
        ) ||
        normalizedError.includes('no qr code found')
      ) {
        return;
      }
      const now = Date.now();
      if (now - lastScannerErrorLogRef.current > 5000) {
        console.warn('QR scanner warning:', errorMessage);
        lastScannerErrorLogRef.current = now;
      }
    };
    const startCamera = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cancelled) return;
        if (!cameras.length) {
          throw {
            name: 'NotFoundError'
          };
        }
        const rearCamera = cameras.find((camera) =>
          /back|rear|environment/i.test(camera.label || '')
        );
        const cameraConfig = rearCamera || cameras[0];
        await scanner.start(
          {
            deviceId: {
              exact: cameraConfig.id
            }
          },
          scanConfig,
          onScanSuccess,
          onScanFailure
        );
        if (cancelled) {
          await clearScanner(scanner);
          return;
        }
        scannerRef.current = scanner;
        setCameraStatus(
          'Camera is ready. Point it at the certificate QR code.'
        );
      } catch (err) {
        console.error('Camera start failed:', err);
        try {
          if (!cancelled && !scanner.isScanning) {
            await scanner.start(
              {
                facingMode: 'environment'
              },
              scanConfig,
              onScanSuccess,
              onScanFailure
            );
            if (cancelled) {
              await clearScanner(scanner);
              return;
            }
            scannerRef.current = scanner;
            setCameraStatus(
              'Camera is ready. Point it at the certificate QR code.'
            );
            return;
          }
        } catch (fallbackErr) {
          console.error('Fallback camera start failed:', fallbackErr);
          if (!cancelled) {
            setError(getCameraErrorMessage(fallbackErr));
            setCameraStatus('');
            setScanMode(false);
            await clearScanner(scanner);
          }
        }
      }
    };
    startCamera();
    return () => {
      cancelled = true;
      if (scannerRef.current === scanner) {
        scannerRef.current = null;
      }
      clearScanner(scanner);
    };
  }, [scanMode]);
  const stopScanning = async ({ keepStatus = false } = {}) => {
    setScanMode(false);
    if (!keepStatus) {
      setCameraStatus('');
    }
    if (scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      await clearScanner(scanner);
    }
  };
  return {
    scanMode,
    cameraStatus,
    startScanning,
    stopScanning
  };
}
