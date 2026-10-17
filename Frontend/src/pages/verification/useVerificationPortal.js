import useQrScanner from './useQrScanner';
import {
  extractCertificateCode,
  normalizeVerificationResult,
  formatDisplayDate
} from './verificationData';
import printVerificationCertificate from './printCertificate';
import { notify } from '../../services/notifications.js';
import { useState, useRef, useEffect } from 'react';
import apiClient from '../../services/api.jsx';
import { useParams } from 'react-router-dom';
import {
  extractCredentialToken,
  verifyOfflineCredential
} from '../../utils/offlineCredential';
const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export default function useVerificationPortal() {
  const { code: routeCode } = useParams();
  const [certificateCode, setCertificateCode] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const { scanMode, cameraStatus, startScanning, stopScanning } = useQrScanner({
    setError,
    setCertificateCode,
    verifyCertificate
  });
  const certificateRef = useRef(null);
  useEffect(() => {
    if (!routeCode) return;
    const normalizedCode = extractCertificateCode(routeCode);
    if (!normalizedCode) {
      setError('Invalid certificate code in verification link.');
      return;
    }
    setCertificateCode(normalizedCode);
    verifyCertificate(normalizedCode, {
      rawQrValue: window.location.href,
      method: extractCredentialToken(window.location.href) ? 'qr' : 'manual'
    });
  }, [routeCode]);
  async function verifyCertificate(
    codeInput,
    { rawQrValue = '', method = 'manual' } = {}
  ) {
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
      const response = await apiClient.get(
        `${API_URL}/certificates/verify/${encodeURIComponent(normalizedCode)}`,
        {
          params: {
            method
          }
        }
      );
      if (response.data.success) {
        setVerificationResult(normalizeVerificationResult(response.data.data));
        setCertificateCode(normalizedCode);
      } else {
        setError(response.data.message || 'Certificate not found');
      }
    } catch (error) {
      const token = extractCredentialToken(rawQrValue);
      if (!error.response && token) {
        try {
          const offlineResult = await verifyOfflineCredential(token);
          if (offlineResult.certificateCode !== normalizedCode) {
            throw new Error(
              'QR credential code does not match its verification link',
              { cause: error }
            );
          }
          setVerificationResult(normalizeVerificationResult(offlineResult));
          setCertificateCode(normalizedCode);
          return;
        } catch (offlineError) {
          console.error('Offline verification error:', offlineError);
          setError(offlineError.message);
        }
      } else {
        console.error('Verification error:', error);
        setError(
          error.response?.data?.message ||
            'Failed to verify certificate. Please check the code and try again.'
        );
      }
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
      if (!response.ok) throw new Error('Certificate image is unavailable');
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
      notify('Failed to download certificate. Please try again.');
    } finally {
      setDownloadLoading(false);
    }
  };
  const viewCertificate = () => {
    if (!verificationResult?.certificateImage) return;
    window.open(
      verificationResult.certificateImage,
      '_blank',
      'noopener,noreferrer'
    );
  };
  const printCertificate = () =>
    printVerificationCertificate({
      certificateRef,
      verificationResult
    });
  const handleImageError = () => {
    setImageError(true);
  };
  const confirmed =
    verificationResult?.status === 'issued' &&
    verificationResult?.credential?.signatureValid &&
    verificationResult?.credential?.issuerKeyTrusted;
  const resultWarning = ['issued', 'offline-unconfirmed'].includes(
    verificationResult?.status
  );
  return {
    verificationResult,
    handleVerify,
    certificateCode,
    setCertificateCode,
    setError,
    error,
    loading,
    scanMode,
    cameraStatus,
    stopScanning,
    startScanning,
    certificateRef,
    confirmed,
    resultWarning,
    formatDisplayDate,
    imageError,
    handleImageError,
    viewCertificate,
    resetVerification,
    downloadCertificate,
    downloadLoading,
    printCertificate
  };
}
