import PrivateImage from '../../shared/PrivateImage';
import PrivateFileLink from '../../shared/PrivateFileLink';
export default function IssuedCertificates({
  loading,
  certificates,
  handleUpdateStatus,
  handleSendEmail,
  handleLifecycleAction,
  handleCreateShare,
  openShareManager,
  handleRegenerate
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Issued Certificates</h2>
      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {certificates.map((cert) => (
            <div
              key={cert._id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-start space-x-4">
                <div className="w-32 h-32 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                  {cert.generatedCertificateUrl ? (
                    <PrivateImage
                      src={cert.generatedCertificateUrl}
                      alt="Certificate"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No Image
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold">{cert.studentName}</h3>
                      <p className="text-sm text-gray-600">{cert.courseName}</p>
                      <p className="text-xs font-mono text-gray-500 mt-1">
                        {cert.certificateCode}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Award Date:{' '}
                        {new Date(cert.awardDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${cert.status === 'issued' ? 'bg-green-100 text-green-800' : cert.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {cert.status}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {cert.generatedCertificateUrl && (
                      <PrivateFileLink
                        href={cert.generatedCertificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                      >
                        View Certificate
                      </PrivateFileLink>
                    )}
                    {cert.status === 'draft' && (
                      <button
                        onClick={() => handleUpdateStatus(cert._id, 'issued')}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                      >
                        Issue Certificate
                      </button>
                    )}
                    {cert.status === 'issued' && !cert.emailSent && (
                      <button
                        onClick={() => handleSendEmail(cert._id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                      >
                        Send Email
                      </button>
                    )}
                    {cert.status === 'issued' && (
                      <button
                        onClick={() =>
                          handleLifecycleAction(cert._id, 'suspend')
                        }
                        className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200"
                      >
                        Suspend
                      </button>
                    )}
                    {cert.status === 'suspended' && (
                      <button
                        onClick={() =>
                          handleLifecycleAction(cert._id, 'reinstate')
                        }
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                      >
                        Reinstate
                      </button>
                    )}
                    {['issued', 'suspended'].includes(cert.status) && (
                      <button
                        onClick={() =>
                          handleLifecycleAction(cert._id, 'revoke')
                        }
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                      >
                        Revoke
                      </button>
                    )}
                    {cert.status !== 'draft' && (
                      <button
                        onClick={() => handleCreateShare(cert._id)}
                        className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200"
                      >
                        Create Share Link
                      </button>
                    )}
                    {cert.status !== 'draft' && (
                      <button
                        onClick={() => openShareManager(cert._id)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                      >
                        Manage Shares
                      </button>
                    )}
                    <button
                      onClick={() => handleRegenerate(cert._id)}
                      className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-sm hover:bg-cyan-200"
                    >
                      {cert.credential?.signature
                        ? 'Regenerate Certificate'
                        : 'Sign Legacy Certificate'}
                    </button>
                  </div>

                  {cert.credential?.signature && (
                    <p className="mt-2 text-xs text-green-700">
                      Digitally signed · {cert.credential.algorithm}
                    </p>
                  )}

                  {cert.lifecycleEvents?.length > 0 && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer font-medium text-gray-600">
                        Lifecycle history ({cert.lifecycleEvents.length})
                      </summary>
                      <div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                        {[...cert.lifecycleEvents]
                          .reverse()
                          .map((event, index) => (
                            <div key={`${event.createdAt}-${index}`}>
                              <p className="font-medium capitalize">
                                {event.action}
                              </p>
                              <p className="text-xs text-gray-500">
                                {event.createdAt
                                  ? new Date(event.createdAt).toLocaleString()
                                  : 'Date unavailable'}
                                {event.reason ? ` — ${event.reason}` : ''}
                              </p>
                            </div>
                          ))}
                      </div>
                    </details>
                  )}

                  {cert.emailSent && (
                    <p className="text-xs text-green-600 mt-2">
                      ✓ Email sent on{' '}
                      {new Date(cert.emailSentAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {certificates.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No certificates issued yet. Go to "Issue Certificate" to create
              one.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
