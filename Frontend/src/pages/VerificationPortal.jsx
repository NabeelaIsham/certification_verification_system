import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useParams } from "react-router-dom";
import {
  ArrowRightIcon,
  CameraIcon,
  QrCodeIcon,
  FingerPrintIcon,
  ShieldCheckIcon,
  QuestionMarkCircleIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { FormField } from "../components/shared/PublicExperience";
import {
  extractCredentialToken,
  verifyOfflineCredential,
} from "../utils/offlineCredential";

const API_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const VerificationPortal = () => {
  const { code: routeCode } = useParams();
  const [certificateCode, setCertificateCode] = useState("");
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanMode, setScanMode] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("");
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
      console.error("Scanner cleanup error:", clearError);
    }
  };

  const getCameraErrorMessage = (err) => {
    const errorName = err?.name || "";

    if (!window.isSecureContext) {
      return "Camera access requires HTTPS (or http://localhost). Open the site on a secure URL.";
    }

    if (
      errorName === "NotAllowedError" ||
      errorName === "PermissionDeniedError"
    ) {
      return "Camera permission was blocked. Allow camera access in your browser settings and try again.";
    }

    if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
      return "No camera was found on this device. You can enter the certificate code instead.";
    }

    if (errorName === "NotReadableError" || errorName === "TrackStartError") {
      return "Camera is in use by another app. Close other camera apps and try again.";
    }

    return "Unable to start camera. Enter the certificate code instead.";
  };

  const startScanning = async () => {
    setError("");
    setCameraStatus("Starting camera...");
    scanHandledRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(
        "This browser does not support camera access. Please enter the certificate code manually.",
      );
      setCameraStatus("");
      setScanMode(false);
      return;
    }

    if (!window.isSecureContext) {
      setError(getCameraErrorMessage({ name: "InsecureContextError" }));
      setCameraStatus("");
      setScanMode(false);
      return;
    }

    setScanMode(true);
  };

  useEffect(() => {
    if (!scanMode || scannerRef.current) return;

    let cancelled = false;
    const scanner = new Html5Qrcode("qr-reader", {
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
      verbose: false,
    });

    const scanConfig = {
      fps: 15,
      qrbox: { width: 260, height: 260 },
      aspectRatio: 1,
    };

    const onScanSuccess = (decodedText) => {
      if (scanHandledRef.current) return;

      const normalizedCode = extractCertificateCode(decodedText);
      if (!normalizedCode) {
        setError(
          "Scanned QR code is invalid. Please scan a valid certificate QR code.",
        );
        return;
      }

      scanHandledRef.current = true;
      setCertificateCode(normalizedCode);
      setCameraStatus("QR code found. Verifying certificate...");
      stopScanning({ keepStatus: true });
      verifyCertificate(normalizedCode, {
        rawQrValue: decodedText,
        method: "qr",
      });
    };

    const onScanFailure = (errorMessage) => {
      const normalizedError = (errorMessage || "").toLowerCase();

      if (
        normalizedError.includes("not found") ||
        normalizedError.includes(
          "no multiformat readers were able to detect",
        ) ||
        normalizedError.includes("no qr code found")
      ) {
        return;
      }

      const now = Date.now();
      if (now - lastScannerErrorLogRef.current > 5000) {
        console.warn("QR scanner warning:", errorMessage);
        lastScannerErrorLogRef.current = now;
      }
    };

    const startCamera = async () => {
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cancelled) return;

        if (!cameras.length) {
          throw { name: "NotFoundError" };
        }

        const rearCamera = cameras.find((camera) =>
          /back|rear|environment/i.test(camera.label || ""),
        );
        const cameraConfig = rearCamera || cameras[0];

        await scanner.start(
          { deviceId: { exact: cameraConfig.id } },
          scanConfig,
          onScanSuccess,
          onScanFailure,
        );

        if (cancelled) {
          await clearScanner(scanner);
          return;
        }

        scannerRef.current = scanner;
        setCameraStatus(
          "Camera is ready. Point it at the certificate QR code.",
        );
      } catch (err) {
        console.error("Camera start failed:", err);

        try {
          if (!cancelled && !scanner.isScanning) {
            await scanner.start(
              { facingMode: "environment" },
              scanConfig,
              onScanSuccess,
              onScanFailure,
            );
            scannerRef.current = scanner;
            setCameraStatus(
              "Camera is ready. Point it at the certificate QR code.",
            );
            return;
          }
        } catch (fallbackErr) {
          console.error("Fallback camera start failed:", fallbackErr);
          if (!cancelled) {
            setError(getCameraErrorMessage(fallbackErr));
            setCameraStatus("");
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
      setError("Invalid certificate code in verification link.");
      return;
    }

    setCertificateCode(normalizedCode);
    verifyCertificate(normalizedCode, {
      rawQrValue: window.location.href,
      method: extractCredentialToken(window.location.href) ? "qr" : "manual",
    });
  }, [routeCode]);

  const extractCertificateCode = (input) => {
    if (!input || typeof input !== "string") {
      return "";
    }

    const value = input.trim();
    if (!value) {
      return "";
    }

    try {
      const url = new URL(value);
      const pathSegments = url.pathname.split("/").filter(Boolean);
      const verifyIndex = pathSegments.findIndex(
        (segment) => segment.toLowerCase() === "verify",
      );

      if (verifyIndex >= 0 && pathSegments[verifyIndex + 1]) {
        return decodeURIComponent(pathSegments[verifyIndex + 1])
          .trim()
          .toUpperCase();
      }

      const codeParam = url.searchParams.get("code");
      if (codeParam) {
        return decodeURIComponent(codeParam).trim().toUpperCase();
      }
    } catch {
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
      certificateCode: source.certificateCode || source.code || "",
      studentName:
        source.studentName || source.studentId?.name || "Not available",
      courseName:
        source.courseName || source.courseId?.courseName || "Not available",
      awardDate:
        source.awardDate || source.issueDate || source.issuedAt || null,
      instituteName:
        source.instituteName ||
        source.instituteId?.instituteName ||
        "Not available",
      status: source.status || (data?.success ? "issued" : "unknown"),
      certificateImage,
      qrCodeImage: source.qrCodeImage || source.qrCodeUrl || null,
    };
  };

  const formatDisplayDate = (dateValue) => {
    if (!dateValue) return "Not available";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Not available";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  async function verifyCertificate(
    codeInput,
    { rawQrValue = "", method = "manual" } = {},
  ) {
    const normalizedCode = extractCertificateCode(codeInput);

    if (!normalizedCode) {
      setError("Please enter a certificate code");
      return;
    }

    setLoading(true);
    setError("");
    setVerificationResult(null);
    setImageError(false);

    try {
      const response = await axios.get(
        `${API_URL}/certificates/verify/${encodeURIComponent(normalizedCode)}`,
        { params: { method } },
      );

      if (response.data.success) {
        setVerificationResult(normalizeVerificationResult(response.data.data));
        setCertificateCode(normalizedCode);
      } else {
        setError(response.data.message || "Certificate not found");
      }
    } catch (error) {
      const token = extractCredentialToken(rawQrValue);
      if (!error.response && token) {
        try {
          const offlineResult = await verifyOfflineCredential(token);
          if (offlineResult.certificateCode !== normalizedCode) {
            throw new Error(
              "QR credential code does not match its verification link",
            );
          }
          setVerificationResult(normalizeVerificationResult(offlineResult));
          setCertificateCode(normalizedCode);
          return;
        } catch (offlineError) {
          console.error("Offline verification error:", offlineError);
          setError(offlineError.message);
        }
      } else {
        console.error("Verification error:", error);
        setError(
          error.response?.data?.message ||
            "Failed to verify certificate. Please check the code and try again.",
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
    setCertificateCode("");
    setError("");
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
      const link = document.createElement("a");
      link.href = url;
      link.download = `certificate-${verificationResult.certificateCode}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download certificate. Please try again.");
    } finally {
      setDownloadLoading(false);
    }
  };

  const viewCertificate = () => {
    if (!verificationResult?.certificateImage) return;
    window.open(
      verificationResult.certificateImage,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const printCertificate = () => {
    if (!certificateRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print");
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
              background: ${verificationResult.status === "issued" ? "#d1fae5" : "#fee2e2"};
              color: ${verificationResult.status === "issued" ? "#065f46" : "#991b1b"};
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
      setCameraStatus("");
    }

    if (scannerRef.current) {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      await clearScanner(scanner);
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const confirmed =
    verificationResult?.status === "issued" &&
    verificationResult?.credential?.signatureValid &&
    verificationResult?.credential?.issuerKeyTrusted;
  const resultWarning = ["issued", "offline-unconfirmed"].includes(
    verificationResult?.status,
  );

  return (
    <section className="cvx-public cvx-verify">
      <div className="cvx-verify-container">
        <header className="cvx-verify-heading">
          <span className="cvx-kicker">
            <span /> THE CERTIVERXIA VERIFICATION PORTAL
          </span>
          <h1>
            Real achievements.
            <br />
            <span>Verified with confidence.</span>
          </h1>
          <p>
            Check a certificate's authenticity and current status.
            <br />
            Enter its unique code or scan the QR code. No account needed.
          </p>
        </header>
        {!verificationResult ? (
          <div className="cvx-verify-workspace">
            <div className="cvx-verify-entry">
              <div className="cvx-verify-label">
                <FingerPrintIcon aria-hidden="true" /> CERTIFICATE LOOKUP
              </div>
              <h2>Let's check your certificate.</h2>
              <p>
                Find the certificate code printed on your document, or paste its
                verification link below.
              </p>
              <form className="cvx-form" onSubmit={handleVerify}>
                <FormField
                  label="Certificate code or verification link"
                  id="certificate-code"
                  hint="Copy the full code, including any letters and hyphens."
                >
                  <input
                    id="certificate-code"
                    value={certificateCode}
                    onChange={(e) => {
                      setCertificateCode(e.target.value);
                      setError("");
                    }}
                    placeholder="e.g. INS-261008-XXXXXXXXXX"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    aria-describedby="certificate-code-hint"
                    aria-invalid={!!error}
                  />
                </FormField>
                {error && (
                  <div role="alert" className="cvx-alert">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || scanMode}
                  className="cvx-submit"
                >
                  {loading ? "Verifying..." : "Verify Certificate"}
                  <ArrowRightIcon aria-hidden="true" />
                </button>
                {loading && (
                  <p role="status" className="cvx-field-hint">
                    Checking the certificate record and its current status...
                  </p>
                )}
              </form>
              <p className="cvx-form-security">
                <ShieldCheckIcon aria-hidden="true" /> Public verification. No
                sign-in required.
              </p>
            </div>
            <div className="cvx-scan-panel">
              {scanMode ? (
                <div className="cvx-camera-live">
                  <h2>Scan the certificate QR</h2>
                  <div id="qr-reader" />
                  {cameraStatus && <p role="status">{cameraStatus}</p>}
                  <button
                    onClick={() => stopScanning()}
                    className="cvx-camera-button"
                  >
                    Cancel Scan
                  </button>
                </div>
              ) : (
                <>
                  <div className="cvx-scan-art" aria-hidden="true">
                    <QrCodeIcon />
                  </div>
                  <h2>Have a QR code?</h2>
                  <p>
                    Point your camera at the QR code on your certificate. We'll
                    take it from there.
                  </p>
                  <button
                    onClick={startScanning}
                    disabled={loading}
                    className="cvx-camera-button"
                  >
                    <CameraIcon aria-hidden="true" /> Start Camera
                  </button>
                  <small>Camera permission is required.</small>
                </>
              )}
            </div>
          </div>
        ) : (
          /* Verification Result */
          <div ref={certificateRef} className="cvx-verify-result">
            <div className="text-center mb-8">
              <div
                className={`cvx-result-icon ${confirmed ? "" : resultWarning ? "cvx-result-warning" : "cvx-result-error"}`}
                aria-hidden="true"
              >
                {confirmed ? (
                  <CheckBadgeIcon />
                ) : resultWarning ? (
                  <ExclamationTriangleIcon />
                ) : (
                  <XCircleIcon />
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {verificationResult.status === "issued" &&
                verificationResult.credential?.signatureValid &&
                verificationResult.credential?.issuerKeyTrusted
                  ? "Certificate Verified Successfully"
                  : verificationResult.status === "issued"
                    ? "Certificate Record Found"
                    : verificationResult.status === "offline-unconfirmed"
                      ? "Digital Signature Verified Offline"
                      : `Certificate ${verificationResult.status}`}
              </h2>
              <p className="text-gray-600">
                {verificationResult.status === "issued" &&
                verificationResult.credential?.signatureValid &&
                verificationResult.credential?.issuerKeyTrusted
                  ? "The signature, registered issuer key, and current lifecycle status were checked online."
                  : verificationResult.status === "issued"
                    ? verificationResult.credential?.signatureValid
                      ? "The signature is internally valid, but the signing key does not match the registered institute key."
                      : "The database record is active, but this credential has no validated digital signature."
                    : verificationResult.status === "offline-unconfirmed"
                      ? "The contents are intact, but connect to the internet to confirm the latest revocation status and issuer trust."
                      : verificationResult.statusMessage ||
                        "This credential is not currently active."}
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
                  <span
                    className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${
                      verificationResult.status === "issued"
                        ? "bg-green-100 text-green-800 border border-green-200"
                        : verificationResult.status === "offline-unconfirmed"
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                    }`}
                  >
                    {verificationResult.status
                      ? verificationResult.status.charAt(0).toUpperCase() +
                        verificationResult.status.slice(1)
                      : "Unknown"}
                  </span>
                </p>
              </div>
            </div>

            {verificationResult.credential && (
              <div
                className={`mb-8 rounded-lg border p-5 ${
                  verificationResult.credential.signatureValid &&
                  verificationResult.credential.issuerKeyTrusted
                    ? "border-green-200 bg-green-50"
                    : "border-yellow-200 bg-yellow-50"
                }`}
              >
                <h3 className="font-semibold text-gray-900">
                  Institute verification
                </h3>
                {verificationResult.credential.signatureValid &&
                verificationResult.credential.issuerKeyTrusted ? (
                  <>
                    <p className="mt-2 font-medium text-green-800">
                      Registered institute — verified
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      This certificate was digitally signed by a registered
                      institute and has not been altered.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="mt-2 font-medium text-amber-800">
                      {verificationResult.offline
                        ? "Connect to confirm institute registration"
                        : "Institute verification could not be confirmed"}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      Check the certificate status and contact the issuing
                      institute if this is unexpected.
                    </p>
                  </>
                )}
              </div>
            )}

            {verificationResult.lifecycleEvents?.length > 0 && (
              <div className="mb-8 rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">
                  Credential lifecycle
                </h3>
                <div className="mt-3 space-y-3">
                  {[...verificationResult.lifecycleEvents]
                    .reverse()
                    .map((event, index) => (
                      <div
                        key={`${event.createdAt}-${index}`}
                        className="border-l-2 border-blue-300 pl-3 text-sm"
                      >
                        <p className="font-medium capitalize">{event.action}</p>
                        <p className="text-gray-500">
                          {event.createdAt
                            ? new Date(event.createdAt).toLocaleString()
                            : "Date unavailable"}
                          {event.reason ? ` — ${event.reason}` : ""}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Certificate Image */}
            {verificationResult.certificateImage && !imageError ? (
              <div className="mb-8 border rounded-lg overflow-hidden shadow-lg bg-white">
                <img
                  src={verificationResult.certificateImage}
                  alt="Certificate"
                  className="w-full h-auto"
                  onError={handleImageError}
                />
              </div>
            ) : verificationResult.certificateImage && imageError ? (
              <div className="mb-8 p-6 bg-yellow-50 rounded-lg text-center">
                <p className="text-yellow-700 mb-2">
                  Certificate image could not be loaded.
                </p>
                <p className="text-sm text-gray-600">
                  Certificate code: {verificationResult.certificateCode}
                </p>
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
                <p className="text-yellow-700 mb-2">
                  Public verification shows credential details and status. Ask
                  the issuing institute for a controlled share link to view or
                  download the certificate.
                </p>
                <p className="text-sm text-gray-600">
                  Certificate code: {verificationResult.certificateCode}
                </p>
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
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                View Certificate
              </button>

              <button
                onClick={resetVerification}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Verify Another
              </button>

              <button
                onClick={downloadCertificate}
                disabled={
                  downloadLoading || !verificationResult.certificateImage
                }
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50"
              >
                {downloadLoading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Downloading...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5 mr-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download Certificate
                  </>
                )}
              </button>

              <button
                onClick={printCertificate}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print
              </button>
            </div>

            {/* Verification Timestamp */}
            <p className="text-center text-xs text-gray-400 mt-6">
              Checked on {new Date().toLocaleString()}
            </p>
          </div>
        )}

        <div className="cvx-verify-steps">
          <div className="cvx-verify-step">
            <span>01</span>
            <div>
              <h3>Find your certificate</h3>
              <p>
                Use the unique code or QR provided by the issuing institute.
              </p>
            </div>
          </div>
          <div className="cvx-verify-step">
            <span>02</span>
            <div>
              <h3>Check the record</h3>
              <p>
                Review the recipient, institute, and current certificate status.
              </p>
            </div>
          </div>
          <div className="cvx-verify-step">
            <span>03</span>
            <div>
              <h3>Share with confidence</h3>
              <p>
                Need the original document? Ask the institute for a secure share
                link.
              </p>
            </div>
          </div>
        </div>
        <div className="cvx-help">
          <QuestionMarkCircleIcon aria-hidden="true" />
          <span>Need a hand with verification?</span>
          <a href="mailto:info@certiverxia.com">Contact our team</a>
        </div>
      </div>
    </section>
  );
};

export default VerificationPortal;
