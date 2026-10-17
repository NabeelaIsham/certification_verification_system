export default function CertificateSecurity({
  securityAnalytics,
  signingKey,
  handleRotateSigningKey,
  loading
}) {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Verification Security</h2>
          <p className="mt-1 text-sm text-gray-500">
            Privacy-preserving verification activity and rule-based risk
            indicators.
          </p>
        </div>
        <div className="rounded-lg bg-red-50 px-4 py-2 text-center">
          <p className="text-2xl font-bold text-red-700">
            {securityAnalytics.suspiciousCount}
          </p>
          <p className="text-xs text-red-600">High-risk checks</p>
        </div>
      </div>
      {signingKey && (
        <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="font-semibold text-blue-900">
                Institute signing key
              </p>
              <p className="mt-1 break-all font-mono text-xs text-blue-700">
                {signingKey.initialized === false
                  ? 'Not initialized yet'
                  : signingKey.keyId}
              </p>
              <p className="mt-1 text-xs text-blue-700">
                {signingKey.initialized === false
                  ? 'The key is initialized automatically during first issuance.'
                  : `${signingKey.algorithm} · ${signingKey.previousKeys?.length || 0} previous keys`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleRotateSigningKey(false)}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {signingKey.initialized === false
                  ? 'Initialize key'
                  : 'Routine rotation'}
              </button>
              {signingKey.initialized !== false && (
                <button
                  type="button"
                  onClick={() => handleRotateSigningKey(true)}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Key compromised
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <p className="py-8 text-center text-gray-500">
          Loading security activity…
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  'Time',
                  'Certificate',
                  'Outcome',
                  'Method',
                  'Risk',
                  'Reasons'
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-4 py-3 text-left font-medium text-gray-600"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {securityAnalytics.logs.map((log) => (
                <tr key={log._id}>
                  <td className="whitespace-nowrap px-4 py-3">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {log.certificateCode || 'Unknown'}
                  </td>
                  <td className="px-4 py-3 capitalize">{log.outcome}</td>
                  <td className="px-4 py-3 capitalize">
                    {log.verificationMethod}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${log.riskScore >= 60 ? 'bg-red-100 text-red-700' : log.riskScore >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}
                    >
                      {log.riskScore}
                    </span>
                  </td>
                  <td className="max-w-sm px-4 py-3 text-xs text-gray-600">
                    {log.riskReasons?.join('; ') || 'No risk rules triggered'}
                  </td>
                </tr>
              ))}
              {securityAnalytics.logs.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No verification activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
