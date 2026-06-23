import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats
} from 'html5-qrcode';
import { useParams } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VerificationPortal = () => {
  const { code: routeCode } = useParams();
  const [certificateCode, setCertificateCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [cameraStatus, setCameraStatus] = useState('');
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const scannerRef = useRef(null);
  const certificateRef = useRef(null);
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

    if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
      return 'Camera permission was blocked. Allow camera access in your browser settings and try again.';
    }

    if (errorName === 'NotFoundError' || errorName === 'DevicesNotFoundError') {
      return 'No camera was found on this device. You can still upload a QR image for verification.';
    }

    if (errorName === 'NotReadableError' || errorName === 'TrackStartError') {
      return 'Camera is in use by another app. Close other camera apps and try again.';
    }

    return 'Unable to start camera. You can still upload a QR image to verify the certificate.';
  };

  const startScanning = async () => {
    setError('');
    setCameraStatus('Starting camera...');
    scanHandledRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('This browser does not support camera access. Please enter the certificate code manually.');
      setCameraStatus('');
      setScanMode(false);
      return;
    }

    if (!window.isSecureContext) {
      setError(getCameraErrorMessage({ name: 'InsecureContextError' }));
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
      qrbox: { width: 260, height: 260 },
      aspectRatio: 1
    };

    const onScanSuccess = (decodedText) => {
      if (scanHandledRef.current) return;

      const normalizedCode = extractCertificateCode(decodedText);
      if (!normalizedCode) {
        setError('Scanned QR code is invalid. Please scan a valid certificate QR code.');
        return;
      }

      scanHandledRef.current = true;
      setCertificateCode(normalizedCode);
      setCameraStatus('QR code found. Verifying certificate...');
      stopScanning({ keepStatus: true });
      verifyCertificate(normalizedCode);
    };

    const onScanFailure = (errorMessage) => {
      const normalizedError = (errorMessage || '').toLowerCase();

      if (
        normalizedError.includes('not found') ||
        normalizedError.includes('no multiformat readers were able to detect') ||
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
          throw { name: 'NotFoundError' };
        }

        const rearCamera = cameras.find((camera) =>
          /back|rear|environment/i.test(camera.label || '')
        );
        const cameraConfig = rearCamera || cameras[0];

        await scanner.start(
          { deviceId: { exact: cameraConfig.id } },
          scanConfig,
          onScanSuccess,
          onScanFailure
        );

        if (cancelled) {
          await clearScanner(scanner);
          return;
        }

        scannerRef.current = scanner;
        setCameraStatus('Camera is ready. Point it at the certificate QR code.');
      } catch (err) {
        console.error('Camera start failed:', err);

        try {
          if (!cancelled && !scanner.isScanning) {
            await scanner.start(
              { facingMode: 'environment' },
              scanConfig,
              onScanSuccess,
              onScanFailure
            );
            scannerRef.current = scanner;
            setCameraStatus('Camera is ready. Point it at the certificate QR code.');
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

  useEffect(() => {
    if (!routeCode) return;

    const normalizedCode = extractCertificateCode(routeCode);
    if (!normalizedCode) {
      setError('Invalid certificate code in verification link.');
      return;
    }

    setCertificateCode(normalizedCode);
    verifyCertificate(normalizedCode);
  }, [routeCode]);

  const extractCertificateCode = (input) => {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const value = input.trim();
    if (!value) {
      return '';
    }

    try {
      const url = new URL(value);
      const pathSegments = url.pathname.split('/').filter(Boolean);
      const verifyIndex = pathSegments.findIndex((segment) => segment.toLowerCase() === 'verify');

      if (verifyIndex >= 0 && pathSegments[verifyIndex + 1]) {
        return decodeURIComponent(pathSegments[verifyIndex + 1]).trim().toUpperCase();
      }

      const codeParam = url.searchParams.get('code');
      if (codeParam) {
        return decodeURIComponent(codeParam).trim().toUpperCase();
      }
    } catch (_) {
      // Continue with plain code parsing when value is not a full URL.
    }

    return decodeURIComponent(value).trim().toUpperCase();
  };

  const normalizeVerificationResult = (data) => {
    const source = data?.certificate || data || {};
    const certificateImage =
      source.certificateImage ||
      source.certificateUrl ||
      source.certificateImageUrl ||
      source.generatedCertificateUrl ||
      source.generatedCertificateImage ||
      null;

    return {
      ...source,
      certificateCode: source.certificateCode || source.code || '',
      studentName: source.studentName || source.studentId?.name || 'Not available',
      courseName: source.courseName || source.courseId?.courseName || 'Not available',
      awardDate: source.awardDate || source.issueDate || source.issuedAt || null,
      instituteName: source.instituteName || source.instituteId?.instituteName || 'Not available',
      status: source.status || (data?.success ? 'issued' : 'unknown'),
      certificateImage,
      qrCodeImage: source.qrCodeImage || source.qrCodeUrl || null
    };
  };

  const formatDisplayDate = (dateValue) => {
    if (!dateValue) return 'Not available';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return 'Not available';

    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  async function verifyCertificate(codeInput) {
    const normalizedCode = extractCertificateCode(codeInput);

    if (!normalizedCode) {
      setError('Please enter a certificate code');
      return;
    }

    setLoading(true);
    setError('');
    setVerificationResult(null);
    setImageError(false);

    try {
      console.log('Verifying certificate:', normalizedCode);
      const response = await axios.get(`${API_URL}/certificates/verify/${encodeURIComponent(normalizedCode)}`);
      
      console.log('Verification response:', response.data);
      
      if (response.data.success) {
        setVerificationResult(normalizeVerificationResult(response.data.data));
        setCertificateCode(normalizedCode);
      } else {
        setError(response.data.message || 'Certificate not found');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setError(
        error.response?.data?.message || 
        'Failed to verify certificate. Please check the code and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  const handleVerify = (e) => {
    e.preventDefault();
    verifyCertificate(certificateCode);
  };

  const resetVerification = () => {
    setVerificationResult(null);
    setCertificateCode('');
    setError('');
    setImageError(false);
  };

  const downloadCertificate = async () => {
    if (!verificationResult?.certificateImage) return;
    
    setDownloadLoading(true);
    try {
      // Fetch the image as a blob
      const response = await fetch(verificationResult.certificateImage);
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${verificationResult.certificateCode}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download certificate. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };

  const viewCertificate = () => {
    if (!verificationResult?.certificateImage) return;
    window.open(verificationResult.certificateImage, '_blank', 'noopener,noreferrer');
  };

  const printCertificate = () => {
    if (!certificateRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print');
      return;
    }
    
    const awardDate = formatDisplayDate(verificationResult.awardDate);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Certificate - ${verificationResult.certificateCode}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 40px; 
              max-width: 1000px;
              margin: 0 auto;
            }
            h1 { 
              color: #2563eb; 
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
            }
            .certificate-container {
              margin: 30px 0;
              text-align: center;
            }
            .certificate-image { 
              max-width: 100%; 
              height: auto; 
              margin: 20px 0; 
              border: 1px solid #ddd;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .certificate-details { 
              margin: 30px auto; 
              max-width: 600px; 
              background: #f9fafb;
              padding: 20px;
              border-radius: 8px;
            }
            .detail-row { 
              display: flex; 
              margin: 10px 0; 
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
            }
            .label { 
              font-weight: bold; 
              width: 150px; 
              color: #4b5563;
            }
            .value { 
              flex: 1; 
              color: #111827;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
            .status-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 14px;
              font-weight: 500;
              background: ${verificationResult.status === 'issued' ? '#d1fae5' : '#fee2e2'};
              color: ${verificationResult.status === 'issued' ? '#065f46' : '#991b1b'};
            }
          </style>
        </head>
        <body>
          <h1>Certificate Verification</h1>
          
          <div class="certificate-container">
            <img src="${verificationResult.certificateImage}" class="certificate-image" />
          </div>
          
          <div class="certificate-details">
            <div class="detail-row">
              <span class="label">Certificate Code:</span>
              <span class="value">${verificationResult.certificateCode}</span>
            </div>
            <div class="detail-row">
              <span class="label">Student Name:</span>
              <span class="value">${verificationResult.studentName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Course Name:</span>
              <span class="value">${verificationResult.courseName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Award Date:</span>
              <span class="value">${awardDate}</span>
            </div>
            <div class="detail-row">
              <span class="label">Institute:</span>
              <span class="value">${verificationResult.instituteName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Status:</span>
              <span class="value"><span class="status-badge">${verificationResult.status?.toUpperCase()}</span></span>
            </div>
          </div>
          
          <div class="footer">
            <p>Verified on ${new Date().toLocaleString()}</p>
            <p>This is an official verification from the Certificate Verification System</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

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

  const handleImageError = () => {
    console.log('Certificate image failed to load');
    setImageError(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Verify Certificate
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Scan the QR code or enter the certificate code manually to verify authenticity
          </p>
        </div>

        {/* Main Content */}
        {!verificationResult ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            {loading && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-center">
                Verifying scanned certificate...
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* QR Code Verification */}
              <div className="text-center p-6 border-r border-gray-200">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Scan QR Code
                </h3>
                <p className="text-gray-600 mb-6">
                  Use your device camera to scan the QR code on the certificate
                </p>
                
                {scanMode ? (
                  <div>
                    <div
                      id="qr-reader"
                      className="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-black"
                    ></div>
                    {cameraStatus && (
                      <p className="mb-3 text-sm text-gray-600">
                        {cameraStatus}
                      </p>
                    )}
                    <button
                      onClick={stopScanning}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Cancel Scan
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={startScanning}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 shadow-md"
                  >
                    <span className="flex items-center justify-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Start Camera
                    </span>
                  </button>
                )}
              </div>

              {/* Manual Verification */}
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="w-6 h-6 text-gray-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Manual Verification
                </h3>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {error}
                    </div>
                  </div>
                )}

                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label htmlFor="certificateCode" className="block text-sm font-medium text-gray-700 mb-1">
                      Certificate Code
                    </label>
                    <input
                      type="text"
                      id="certificateCode"
                      value={certificateCode}
                      onChange={(e) => setCertificateCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., TES-260226-9255"
                      disabled={loading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !certificateCode}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Verifying...
                      </span>
                    ) : (
                      'Verify Certificate'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* Verification Result */
          <div ref={certificateRef} className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Certificate Verified Successfully
              </h2>
              <p className="text-gray-600">
                This is an authentic certificate issued through our platform
              </p>
            </div>

            {/* Certificate Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 bg-gray-50 p-6 rounded-lg">
              <div>
                <p className="text-sm text-gray-500 mb-1">Certificate Code</p>
                <p className="font-mono font-medium text-gray-900 break-all bg-white p-2 rounded border">
                  {verificationResult.certificateCode}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Student Name</p>
                <p className="font-medium text-gray-900 bg-white p-2 rounded border">
                  {verificationResult.studentName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Course Name</p>
                <p className="font-medium text-gray-900 bg-white p-2 rounded border">
                  {verificationResult.courseName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Award Date</p>
                <p className="font-medium text-gray-900 bg-white p-2 rounded border">
                  {formatDisplayDate(verificationResult.awardDate)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Institute</p>
                <p className="font-medium text-gray-900 bg-white p-2 rounded border">
                  {verificationResult.instituteName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <p className="font-medium">
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                    verificationResult.status === 'issued' 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {verificationResult.status
                      ? verificationResult.status.charAt(0).toUpperCase() + verificationResult.status.slice(1)
                      : 'Unknown'}
                  </span>
                </p>
              </div>
            </div>

            {/* Certificate Image */}
            {verificationResult.certificateImage && !imageError ? (
              <div className="mb-8 border rounded-lg overflow-hidden shadow-lg bg-white">
                <img 
                  src={verificationResult.certificateImage} 
                  alt="Certificate"
                  className="w-full h-auto"
                  onError={handleImageError}
                  onLoad={() => console.log('Certificate image loaded successfully')}
                />
              </div>
            ) : verificationResult.certificateImage && imageError ? (
              <div className="mb-8 p-6 bg-yellow-50 rounded-lg text-center">
                <p className="text-yellow-700 mb-2">Certificate image could not be loaded.</p>
                <p className="text-sm text-gray-600">Certificate code: {verificationResult.certificateCode}</p>
                {verificationResult.certificateImage && (
                  <a 
                    href={verificationResult.certificateImage} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                  >
                    Click here to open the image directly
                  </a>
                )}
              </div>
            ) : (
              <div className="mb-8 p-6 bg-yellow-50 rounded-lg text-center">
                <p className="text-yellow-700 mb-2">Certificate details are verified, but the certificate image is not available.</p>
                <p className="text-sm text-gray-600">Certificate code: {verificationResult.certificateCode}</p>
              </div>
            )}

            {/* QR Code (if available) */}
            {verificationResult.qrCodeImage && (
              <div className="mb-8 text-center">
                <p className="text-sm text-gray-500 mb-2">QR Code</p>
                <img 
                  src={verificationResult.qrCodeImage} 
                  alt="QR Code"
                  className="w-32 h-32 mx-auto border p-2 rounded-lg"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-4">
              <button
                onClick={viewCertificate}
                disabled={!verificationResult.certificateImage}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                View Certificate
              </button>

              <button
                onClick={resetVerification}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Verify Another
              </button>
              
              <button
                onClick={downloadCertificate}
                disabled={downloadLoading || !verificationResult.certificateImage}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
              >
                {downloadLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Certificate
                  </>
                )}
              </button>
              
              <button
                onClick={printCertificate}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>

            {/* Verification Timestamp */}
            <p className="text-center text-xs text-gray-400 mt-6">
              Verified on {new Date().toLocaleString()}
            </p>
          </div>
        )}

        {/* Trust Badges */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500 mb-4">Trusted by educational institutions worldwide</p>
          <div className="flex justify-center space-x-8">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-600">Blockchain Verified</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-600">Tamper-Proof</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-gray-600">Instant Verification</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPortal;
