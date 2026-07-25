import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const CredentialShare = () => {
  const { token } = useParams();
  const [credential, setCredential] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    axios.get(`${API_URL}/certificates/verify/share/${encodeURIComponent(token)}`)
      .then((response) => {
        if (active) setCredential(response.data.data);
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to open this credential share');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return <div className="mx-auto max-w-3xl p-12 text-center text-gray-600">Opening secure credential share…</div>;
  }

  if (error) {
    return (
      <div className="mx-auto my-16 max-w-xl rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <h1 className="text-xl font-semibold text-red-900">Share unavailable</h1>
        <p className="mt-2 text-red-700">{error}</p>
      </div>
    );
  }

  const fields = [
    ['Student', credential.studentName],
    ['Course', credential.courseName],
    ['Award date', credential.awardDate ? new Date(credential.awardDate).toLocaleDateString() : null],
    ['Institute', credential.instituteName],
    ['Certificate code', credential.certificateCode],
    ['Status', credential.status]
  ].filter(([, value]) => value !== undefined && value !== null);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
          <div className="border-b border-gray-200 pb-6 text-center">
            <p className="text-sm font-medium uppercase tracking-wide text-blue-600">Controlled credential disclosure</p>
            <h1 className="mt-2 text-3xl font-bold text-gray-900">{credential.disclosure?.label}</h1>
            <p className="mt-2 text-sm text-gray-500">
              Only the fields authorized by the credential holder or issuing institute are displayed.
            </p>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-gray-50 p-4">
                <dt className="text-xs font-medium uppercase text-gray-500">{label}</dt>
                <dd className="mt-1 break-words font-medium text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>

          {credential.certificateImage && (
            <img
              src={credential.certificateImage}
              alt="Shared certificate"
              className="mt-6 w-full rounded-lg border border-gray-200"
            />
          )}

          <div className={`mt-6 rounded-lg border p-4 text-sm ${
            credential.signature?.valid && credential.signature?.issuerKeyTrusted
              ? 'border-green-200 bg-green-50 text-green-900'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}>
            <p className="font-semibold">
              {credential.signature?.valid && credential.signature?.issuerKeyTrusted
                ? 'Digitally signed by the registered institute'
                : credential.signature?.available
                  ? 'Signature could not be trusted'
                  : 'Legacy credential'}
            </p>
            <p className="mt-1">
              Current status: <span className="font-medium capitalize">{credential.status || 'Not disclosed'}</span>
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-gray-500">
            Expires {new Date(credential.disclosure.expiresAt).toLocaleString()} ·
            {' '}{credential.disclosure.remainingViews} views remaining
          </p>
        </div>
      </div>
    </div>
  );
};

export default CredentialShare;
