import { useState, useEffect } from 'react'

const Analytics = () => {
  const [analytics, setAnalytics] = useState({})

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setAnalytics({
        totalInstitutes: 45,
        totalCertificates: 125430,
        totalVerifications: 89210,
        activeUsers: 156,
        growthRate: 12.5
      })
    }, 1000)
  }, [])

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Analytics</h1>
        <p className="text-gray-600">Overview of system performance and usage</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🏫</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Institutes</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalInstitutes}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📜</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Certificates Issued</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalCertificates?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verifications</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalVerifications?.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <span className="text-2xl">📈</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Growth Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.growthRate}%</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h2 className="text-lg font-semibold mb-4">Monthly Statistics</h2>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Charts and graphs would be displayed here</p>
        </div>
      </div>
    </div>
  )
}

export default Analytics