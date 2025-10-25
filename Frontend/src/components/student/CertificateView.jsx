import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

const CertificateView = () => {
  const { certificateId } = useParams()
  const [certificate, setCertificate] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCertificate({
        id: certificateId,
        studentName: 'John Smith',
        courseName: 'Bachelor of Information Technology',
        instituteName: 'University of Moratuwa',
        issueDate: '2024-03-15',
        certificateCode: 'UOM-BIT-2024-00123',
        grade: 'First Class',
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=UOM-BIT-2024-00123'
      })
      setLoading(false)
    }, 1000)
  }, [certificateId])

  const downloadPDF = () => {
    // Simulate PDF download
    alert('Downloading certificate as PDF...')
  }

  const shareCertificate = () => {
    // Simulate sharing
    if (navigator.share) {
      navigator.share({
        title: 'My Certificate',
        text: `Check out my certificate for ${certificate.courseName}`,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      alert('Certificate URL copied to clipboard!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificate...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Certificate Preview */}
        <div className="bg-white shadow-2xl rounded-lg overflow-hidden border-4 border-gold-500">
          <div className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">CV</span>
                </div>
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">CERTIFICATE OF COMPLETION</h1>
              <p className="text-lg text-gray-600">This is to certify that</p>
            </div>
            
            {/* Student Name */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-semibold text-blue-700 mb-2 border-b-2 border-blue-200 pb-2">
                {certificate.studentName}
              </h2>
              <p className="text-xl text-gray-700">has successfully completed the course</p>
              <p className="text-2xl font-medium text-gray-900 mt-2">
                {certificate.courseName}
              </p>
              {certificate.grade && (
                <p className="text-lg text-gray-700 mt-2">with <strong>{certificate.grade}</strong> Honors</p>
              )}
            </div>

            {/* Details */}
            <div className="flex justify-between items-center mt-12">
              <div className="text-center">
                <p className="font-semibold">{certificate.issueDate}</p>
                <p className="text-sm text-gray-600">Date of Issue</p>
              </div>
              <div className="text-center">
                {certificate.qrCode && (
                  <img 
                    src={certificate.qrCode} 
                    alt="QR Code" 
                    className="w-24 h-24 mx-auto border border-gray-300 rounded"
                  />
                )}
                <p className="text-xs text-gray-500 mt-2">Scan to verify</p>
              </div>
              <div className="text-center">
                <div className="w-32 h-12 border-b-2 border-gray-400 mb-2"></div>
                <p className="text-sm text-gray-600">Authorized Signature</p>
                <p className="font-semibold">{certificate.instituteName}</p>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-500">
                Certificate ID: {certificate.certificateCode}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Verify this certificate at: https://verify.certsystem.com
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-center space-x-4">
          <button
            onClick={downloadPDF}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download PDF
          </button>
          <button
            onClick={shareCertificate}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share Certificate
          </button>
        </div>
      </div>
    </div>
  )
}

export default CertificateView