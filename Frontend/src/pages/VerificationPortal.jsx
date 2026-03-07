import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Html5QrcodeScanner } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const VerificationPortal = () => {
  const [certificateCode, setCertificateCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [scanMode, setScanMode] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const scannerRef = useRef(null);
  const certificateRef = useRef(null);

  useEffect(() => {
    // Initialize scanner when scanMode becomes true
    if (scanMode) {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          showTorchButtonIfSupported: true
        },
        false
      );
      
      scanner.render(
        (decodedText) => {
          // Success callback
          console.log('Scanned QR code:', decodedText);
          setCertificateCode(decodedText);
          setScanMode(false);
          scanner.clear();
          // Automatically verify after scan
          setTimeout(() => {
            verifyCertificate(decodedText);
          }, 500);
        },
        (errorMessage) => {
          // Error callback
          console.warn('QR Scan Error:', errorMessage);
        }
      );
      
      scannerRef.current = scanner;
      
      // Cleanup on unmount
      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
        }
      };
    }
  }, [scanMode]);

  const verifyCertificate = async (code) => {
    if (!code) {
      setError('Please enter a certificate code');
      return;
    }

    setLoading(true);
    setError('');
    setVerificationResult(null);
    setImageError(false);

    try {
      console.log('Verifying certificate:', code);
      const response = await axios.get(`${API_URL}/certificates/verify/${code}`);
      
      console.log('Verification response:', response.data);
      
      if (response.data.success) {
        setVerificationResult(response.data.data);
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
  };

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

  const printCertificate = () => {
    if (!certificateRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print');
      return;
    }
    
    const awardDate = new Date(verificationResult.awardDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
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
              <span class="value"><span class="status-badge">${verificationResult.status.toUpperCase()}</span></span>
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

  const stopScanning = () => {
    setScanMode(false);
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
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
                    <div id="qr-reader" className="mb-4"></div>
                    <button
                      onClick={stopScanning}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
                    >
                      Cancel Scan
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setScanMode(true)}
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

            {/* Certificate Image */}
            {verificationResult.certificateImage && !imageError ? (
              <div className="mb-8 border rounded-lg overflow-hidden shadow-lg">
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
            ) : null}

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
                  {new Date(verificationResult.awardDate).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
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
                    {verificationResult.status.charAt(0).toUpperCase() + verificationResult.status.slice(1)}
                  </span>
                </p>
              </div>
            </div>

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