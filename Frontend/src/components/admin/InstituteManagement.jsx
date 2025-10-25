import { useState, useEffect } from 'react'
import { instituteService } from '../../services/instituteService'

const InstituteManagement = () => {
  const [institutes, setInstitutes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadInstitutes()
  }, [])

  const loadInstitutes = async () => {
    try {
      const data = await instituteService.getInstitutes()
      setInstitutes(data)
    } catch (error) {
      console.error('Failed to load institutes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (instituteId) => {
    try {
      await instituteService.approveInstitute(instituteId)
      await loadInstitutes()
    } catch (error) {
      console.error('Failed to approve institute:', error)
    }
  }

  const handleReject = async (instituteId) => {
    try {
      await instituteService.rejectInstitute(instituteId, 'Manual rejection by admin')
      await loadInstitutes()
    } catch (error) {
      console.error('Failed to reject institute:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading institutes...</div>
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Institute Management</h1>
        <p className="text-gray-600">Manage all registered educational institutions</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Institute
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Students
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {institutes.map((institute) => (
              <tr key={institute.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {institute.name}
                    </div>
                    <div className="text-sm text-gray-500">{institute.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    institute.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : institute.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {institute.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {institute.studentCount || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  {institute.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(institute.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(institute.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button className="text-blue-600 hover:text-blue-900">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default InstituteManagement