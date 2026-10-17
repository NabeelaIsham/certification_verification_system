import VerificationEntry from './verification/VerificationEntry';
import VerificationActions from './verification/VerificationActions';
import CertificateSharing from "../components/verification/CertificateSharing";
import { QuestionMarkCircleIcon, CheckBadgeIcon, ExclamationTriangleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import useVerificationPortal from './verification/useVerificationPortal';
export default function VerificationPortal() {
  const {
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
  } = useVerificationPortal();
  return <section className="cvx-public cvx-verify">
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
        {!verificationResult ? <VerificationEntry handleVerify={handleVerify} certificateCode={certificateCode} setCertificateCode={setCertificateCode} setError={setError} error={error} loading={loading} scanMode={scanMode} cameraStatus={cameraStatus} stopScanning={stopScanning} startScanning={startScanning} /> : (/* Verification Result */
      <div ref={certificateRef} className="cvx-verify-result">
            <div className="text-center mb-8">
              <div className={`cvx-result-icon ${confirmed ? "" : resultWarning ? "cvx-result-warning" : "cvx-result-error"}`} aria-hidden="true">
                {confirmed ? <CheckBadgeIcon /> : resultWarning ? <ExclamationTriangleIcon /> : <XCircleIcon />}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {verificationResult.status === "issued" && verificationResult.credential?.signatureValid && verificationResult.credential?.issuerKeyTrusted ? "Certificate Verified Successfully" : verificationResult.status === "issued" ? "Certificate Record Found" : verificationResult.status === "offline-unconfirmed" ? "Digital Signature Verified Offline" : `Certificate ${verificationResult.status}`}
              </h2>
              <p className="text-gray-600">
                {verificationResult.status === "issued" && verificationResult.credential?.signatureValid && verificationResult.credential?.issuerKeyTrusted ? "The signature, registered issuer key, and current lifecycle status were checked online." : verificationResult.status === "issued" ? verificationResult.credential?.signatureValid ? "The signature is internally valid, but the signing key does not match the registered institute key." : "The database record is active, but this credential has no validated digital signature." : verificationResult.status === "offline-unconfirmed" ? "The contents are intact, but connect to the internet to confirm the latest revocation status and issuer trust." : verificationResult.statusMessage || "This credential is not currently active."}
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
                  <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${verificationResult.status === "issued" ? "bg-green-100 text-green-800 border border-green-200" : verificationResult.status === "offline-unconfirmed" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-red-100 text-red-800 border border-red-200"}`}>
                    {verificationResult.status ? verificationResult.status.charAt(0).toUpperCase() + verificationResult.status.slice(1) : "Unknown"}
                  </span>
                </p>
              </div>
            </div>

            {verificationResult.credential && <div className={`mb-8 rounded-lg border p-5 ${verificationResult.credential.signatureValid && verificationResult.credential.issuerKeyTrusted ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}>
                <h3 className="font-semibold text-gray-900">
                  Institute verification
                </h3>
                {verificationResult.credential.signatureValid && verificationResult.credential.issuerKeyTrusted ? <>
                    <p className="mt-2 font-medium text-green-800">
                      Registered institute — verified
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      This certificate was digitally signed by a registered
                      institute and has not been altered.
                    </p>
                  </> : <>
                    <p className="mt-2 font-medium text-amber-800">
                      {verificationResult.offline ? "Connect to confirm institute registration" : "Institute verification could not be confirmed"}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      Check the certificate status and contact the issuing
                      institute if this is unexpected.
                    </p>
                  </>}
              </div>}

            {verificationResult.lifecycleEvents?.length > 0 && <div className="mb-8 rounded-lg border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-900">
                  Credential lifecycle
                </h3>
                <div className="mt-3 space-y-3">
                  {[...verificationResult.lifecycleEvents].reverse().map((event, index) => <div key={`${event.createdAt}-${index}`} className="border-l-2 border-blue-300 pl-3 text-sm">
                        <p className="font-medium capitalize">{event.action}</p>
                        <p className="text-gray-500">
                          {event.createdAt ? new Date(event.createdAt).toLocaleString() : "Date unavailable"}
                          {event.reason ? ` — ${event.reason}` : ""}
                        </p>
                      </div>)}
                </div>
              </div>}

            {/* Certificate Image */}
            {verificationResult.certificateImage && !imageError ? <div className="mb-8 border rounded-lg overflow-hidden shadow-lg bg-white">
                <img src={verificationResult.certificateImage} alt="Certificate" className="w-full h-auto" onError={handleImageError} />
              </div> : verificationResult.certificateImage && imageError ? <div className="mb-8 p-6 bg-yellow-50 rounded-lg text-center">
                <p className="text-yellow-700 mb-2">
                  Certificate image could not be loaded.
                </p>
                <p className="text-sm text-gray-600">
                  Certificate code: {verificationResult.certificateCode}
                </p>
                {verificationResult.certificateImage && <a href={verificationResult.certificateImage} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm mt-2 inline-block">
                    Click here to open the image directly
                  </a>}
              </div> : <div className="mb-8 p-6 bg-yellow-50 rounded-lg text-center">
                <p className="text-yellow-700 mb-2">
                  The certificate image is unavailable for this record. Contact
                  the issuing institute if you need a copy.
                </p>
                <p className="text-sm text-gray-600">
                  Certificate code: {verificationResult.certificateCode}
                </p>
              </div>}

            {/* QR Code (if available) */}
            {verificationResult.qrCodeImage && <div className="mb-8 text-center">
                <p className="text-sm text-gray-500 mb-2">QR Code</p>
                <img src={verificationResult.qrCodeImage} alt="QR Code" className="w-32 h-32 mx-auto border p-2 rounded-lg" />
              </div>}

            {verificationResult.status === 'issued' && (!verificationResult.credential?.signed || verificationResult.credential?.signatureValid && verificationResult.credential?.issuerKeyTrusted) && <CertificateSharing key={verificationResult.certificateCode} code={verificationResult.certificateCode} shareUrl={verificationResult.shareUrl} />}

            {/* Action Buttons */}
            <VerificationActions viewCertificate={viewCertificate} verificationResult={verificationResult} resetVerification={resetVerification} downloadCertificate={downloadCertificate} downloadLoading={downloadLoading} printCertificate={printCertificate} />

            {/* Verification Timestamp */}
            <p className="text-center text-xs text-gray-400 mt-6">
              Checked on {new Date().toLocaleString()}
            </p>
          </div>)}

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
                View the certificate and share its verification link on social media.
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
    </section>;
}
