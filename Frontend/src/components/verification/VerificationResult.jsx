const VerificationResult = ({ result, onReset }) => {
  if (!result) return null

  return (
    <div className={`rounded-lg border p-6 ${
      result.success 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-start">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          result.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        }`}>
          {result.success ? '✓' : '✗'}
        </div>
        
        <div className="ml-4 flex-1">
          <h3 className={`text-lg font-semibold ${
            result.success ? 'text-green-800' : 'text-red-800'
          }`}>
            {result.success ? 'Certificate Verified Successfully!' : 'Certificate Verification Failed'}
          </h3>
          
          {result.certificate && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div>
                  <strong className="text-gray-700">Student Name:</strong>
                  <p className="text-gray-900">{result.certificate.studentName}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Course:</strong>
                  <p className="text-gray-900">{result.certificate.courseName}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Institute:</strong>
                  <p className="text-gray-900">{result.certificate.instituteName}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div>
                  <strong className="text-gray-700">Issue Date:</strong>
                  <p className="text-gray-900">{result.certificate.issueDate}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Certificate ID:</strong>
                  <p className="text-gray-900 font-mono">{result.certificate.id}</p>
                </div>
                <div>
                  <strong className="text-gray-700">Status:</strong>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    result.certificate.status === 'verified' 
                      ? 'bg-green-100 text-green-800'
                      : result.certificate.status === 'revoked'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {result.certificate.status}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {result.message && (
            <p className={`mt-3 text-sm ${
              result.success ? 'text-green-700' : 'text-red-700'
            }`}>
              {result.message}
            </p>
          )}
          
          <div className="mt-4">
            <button
              onClick={onReset}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Verify Another Certificate
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerificationResult