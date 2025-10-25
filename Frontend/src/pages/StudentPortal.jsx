import { useState, useEffect } from 'react'

const StudentDashboard = () => {
  const [certificates, setCertificates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCertificates([
        {
          id: 1,
          course: 'Bachelor of Information Technology',
          issueDate: '2024-03-15',
          status: 'issued',
          verificationUrl: 'https://verify.certsystem.com/ABC123'
        },
        {
          id: 2,
          course: 'Web Development Certification',
          issueDate: '2024-02-20',
          status: 'verified',
          verificationUrl: 'https://verify.certsystem.com/DEF456'
        }
      ])
      setLoading(false)
    }, 1000)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
              <p className="text-sm text-gray-600">View and manage your certificates</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">My Certificates</h2>
            <p className="text-sm text-gray-600">All certificates issued to you</p>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {certificates.map((cert) => (
                <div key={cert.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{cert.course}</h3>
                    <p className="text-sm text-gray-600">Issued on {cert.issueDate}</p>
                    <p className="text-xs text-gray-400">{cert.verificationUrl}</p>
                  </div>
                  <div className="flex space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      cert.status === 'issued' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {cert.status}
                    </span>
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard