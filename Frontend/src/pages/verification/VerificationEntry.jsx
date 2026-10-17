import {
  ArrowRightIcon,
  CameraIcon,
  QrCodeIcon,
  FingerPrintIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { FormField } from '../../components/shared/PublicExperience';
export default function VerificationEntry({
  handleVerify,
  certificateCode,
  setCertificateCode,
  setError,
  error,
  loading,
  scanMode,
  cameraStatus,
  stopScanning,
  startScanning
}) {
  return (
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
                setError('');
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
            {loading ? 'Verifying...' : 'Verify Certificate'}
            <ArrowRightIcon aria-hidden="true" />
          </button>
          {loading && (
            <p role="status" className="cvx-field-hint">
              Checking the certificate record and its current status...
            </p>
          )}
        </form>
        <p className="cvx-form-security">
          <ShieldCheckIcon aria-hidden="true" /> Public verification. No sign-in
          required.
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
              Point your camera at the QR code on your certificate. We'll take
              it from there.
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
  );
}
