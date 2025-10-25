import { useState } from 'react'

const ManualVerification = () => {
  const [formData, setFormData] = useState({
    certificateCode: '',
    awardDate: ''
  })
  const [verificationResult, setVerificationResult] = useState(null)
  const [verifying, setVerifying] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setVerifying(true)
    
    // Simulate verification process
    setTimeout(() => {
      const mockResult = {
        success: true,
        certificate: {
          id: formData.certificateCode,
          studentName: 'John Smith',
          courseName: 'Bachelor of Information Technology',
          instituteName: 'University of Moratuwa',
          issueDate: '2024-03-15',
          status: 'verified',
          grade: 'First Class',
          verificationDate: new Date().toISOString()
        }
      }
      setVerificationResult(mockResult)
      setVerifying(false)
    }, 1500)
  }

  const resetForm = () => {
    setFormData({ certificateCode: '', awardDate: '' })
    setVerificationResult(null)
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <h2 className="text-lg font-semibold mb-4">Manual Verification</h2>
      
      {!verificationResult ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="certificateCode" className="block text-sm font-medium text-gray-700 mb-1">
              Certificate Code *
            </label>
            <input
              type="text"
              id="certificateCode"
              value={formData.certificateCode}
              onChange={(e) => setFormData({ ...formData, certificateCode: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter certificate code (e.g., UOM-BIT-2024-00123)"
              required
            />
          </div>

          <div>
            <label htmlFor="awardDate" className="block text-sm font-medium text-gray-700 mb-1">
              Award Date *
            </label>
            <input
              type="date"
              id="awardDate"
              value={formData.awardDate}
              onChange={(e) => setFormData({ ...formData, awardDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifying ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verifying...
              </div>
            ) : (
              'Verify Certificate'
            )}
          </button>
        </form>
      ) : (
        <div className={`p-4 rounded-lg ${
          verificationResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex items-start">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-1 ${
              verificationResult.success ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}>
              {verificationResult.success ? '✓' : '✗'}
            </div>
            <div className="ml-3 flex-1">
              <h3 className={`text-lg font-semibold ${
                verificationResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {verificationResult.success ? 'Certificate Verified Successfully!' : 'Verification Failed'}
              </h3>
              
              {verificationResult.certificate && (
                <div className="mt-3 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <strong>Student Name:</strong>
                      <p>{verificationResult.certificate.studentName}</p>
                    </div>
                    <div>
                      <strong>Course:</strong>
                      <p>{verificationResult.certificate.courseName}</p>
                    </div>
                    <div>
                      <strong>Institute:</strong>
                      <p>{verificationResult.certificate.instituteName}</p>
                    </div>
                    <div>
                      <strong>Issue Date:</strong>
                      <p>{verificationResult.certificate.issueDate}</p>
                    </div>
                    {verificationResult.certificate.grade && (
                      <div>
                        <strong>Grade:</strong>
                        <p>{verificationResult.certificate.grade}</p>
                      </div>
                    )}
                    <div>
                      <strong>Status:</strong>
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        verificationResult.certificate.status === 'verified' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {verificationResult.certificate.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Verified on: {new Date(verificationResult.certificate.verificationDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="mt-4">
                <button
                  onClick={resetForm}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
                >
                  Verify Another Certificate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ManualVerification