import { useState, useEffect } from 'react';
import axios from 'axios';

const InstituteManagement = ({ API_URL, user, onStatsUpdate }) => {
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
    total: 0
  });
  const [selectedInstitute, setSelectedInstitute] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchInstitutes();
  }, [selectedStatus, pagination.page, searchTerm]);

  const fetchInstitutes = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      const response = await axios.get(`${API_URL}/admin/institutes`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          status: selectedStatus,
          page: pagination.page,
          limit: pagination.limit,
          search: searchTerm
        }
      });

      if (response.data.success) {
        setInstitutes(response.data.data || []);
        setPagination(response.data.pagination);
        setCounts(response.data.counts);
      }
    } catch (error) {
      console.error('Error fetching institutes:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (instituteId) => {
    if (!window.confirm('Are you sure you want to approve this institute?')) return;

    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.put(
        `${API_URL}/admin/institutes/${instituteId}/approve`,
        { notes: 'Approved by super admin' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert('Institute approved successfully!');
        fetchInstitutes();
        onStatsUpdate();
      }
    } catch (error) {
      console.error('Error approving institute:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleReject = async (instituteId) => {
    const reason = window.prompt('Please enter reason for rejection:');
    if (!reason) return;

    if (!window.confirm('Are you sure you want to reject this institute? This action cannot be undone.')) return;

    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.delete(`${API_URL}/admin/institutes/${instituteId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason }
      });
      
      if (response.data.success) {
        alert('Institute rejected successfully!');
        fetchInstitutes();
        onStatsUpdate();
      }
    } catch (error) {
      console.error('Error rejecting institute:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleToggleSuspend = async (instituteId, currentStatus) => {
    const action = currentStatus === 'active' ? 'suspend' : 'activate';
    const message = action === 'suspend' 
      ? 'Are you sure you want to suspend this institute?' 
      : 'Are you sure you want to activate this institute?';

    if (!window.confirm(message)) return;

    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.put(
        `${API_URL}/admin/institutes/${instituteId}/toggle-status`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert(`Institute ${action}ed successfully!`);
        fetchInstitutes();
        onStatsUpdate();
      }
    } catch (error) {
      console.error('Error toggling institute status:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleViewDetails = async (instituteId) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.get(`${API_URL}/admin/institutes/${instituteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSelectedInstitute(response.data.data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error fetching institute details:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const getStatusBadge = (institute) => {
    if (!institute.isVerifiedByAdmin) {
      return { text: 'Pending', color: 'bg-yellow-100 text-yellow-800' };
    }
    if (!institute.isActive) {
      return { text: 'Suspended', color: 'bg-red-100 text-red-800' };
    }
    return { text: 'Approved', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div>
      {/* Header with Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Institute Management</h2>
            <p className="text-sm text-gray-600 mt-1">Manage and monitor all registered institutes</p>
          </div>
          
          {/* Status Filters */}
          <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                selectedStatus === 'all' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({counts.total})
            </button>
            <button
              onClick={() => setSelectedStatus('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                selectedStatus === 'pending' 
                  ? 'bg-yellow-600 text-white' 
                  : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              Pending ({counts.pending})
            </button>
            <button
              onClick={() => setSelectedStatus('approved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                selectedStatus === 'approved' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              Approved ({counts.approved})
            </button>
            <button
              onClick={() => setSelectedStatus('rejected')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                selectedStatus === 'rejected' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              Rejected ({counts.rejected})
            </button>
            <button
              onClick={() => setSelectedStatus('suspended')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                selectedStatus === 'suspended' 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100'
              }`}
            >
              Suspended ({counts.suspended})
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search institutes by name, email, or admin..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Institutes List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : institutes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <p className="text-gray-500">No institutes found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {institutes.map((institute) => {
              const status = getStatusBadge(institute);
              return (
                <div key={institute._id} className="p-6 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex flex-col md:flex-row md:items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`w-3 h-3 rounded-full mt-2 ${
                        !institute.isVerifiedByAdmin ? 'bg-yellow-500' :
                        !institute.isActive ? 'bg-red-500' : 'bg-green-500'
                      }`}></div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{institute.instituteName}</h3>
                        <div className="mt-1 space-y-1">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Email:</span> {institute.email}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Admin:</span> {institute.adminName}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Phone:</span> {institute.phone}
                          </p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Address:</span> {institute.address}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.text}
                          </span>
                          {institute.isEmailVerified && (
                            <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Email Verified
                            </span>
                          )}
                          {institute.isPhoneVerified && (
                            <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Phone Verified
                            </span>
                          )}
                          <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                            {institute.studentCount?.toLocaleString() || 0} Students
                          </span>
                          <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                            {institute.instituteType}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 mt-4 md:mt-0 md:ml-4">
                      {!institute.isVerifiedByAdmin && (
                        <>
                          <button
                            onClick={() => handleApprove(institute._id)}
                            className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(institute._id)}
                            className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </button>
                        </>
                      )}
                      {institute.isVerifiedByAdmin && (
                        <button
                          onClick={() => handleToggleSuspend(institute._id, institute.isActive ? 'active' : 'suspended')}
                          className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center ${
                            institute.isActive 
                              ? 'bg-orange-600 hover:bg-orange-700' 
                              : 'bg-green-600 hover:bg-green-700'
                          }`}
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {institute.isActive ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            )}
                          </svg>
                          {institute.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                      <button
                        onClick={() => handleViewDetails(institute._id)}
                        className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600 mb-4 sm:mb-0">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  pagination.page === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  pagination.page === pagination.pages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Institute Details Modal */}
      {showDetails && selectedInstitute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Institute Details</h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Institute Name</p>
                    <p className="text-base text-gray-900">{selectedInstitute.instituteName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Institute Type</p>
                    <p className="text-base text-gray-900">{selectedInstitute.instituteType}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-base text-gray-900">{selectedInstitute.email}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Phone</p>
                  <p className="text-base text-gray-900">{selectedInstitute.phone}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="text-base text-gray-900">{selectedInstitute.address}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Admin Name</p>
                  <p className="text-base text-gray-900">{selectedInstitute.adminName}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-500">Student Count</p>
                  <p className="text-base text-gray-900">{selectedInstitute.studentCount?.toLocaleString()}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Registration Date</p>
                    <p className="text-base text-gray-900">
                      {new Date(selectedInstitute.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Certificate Count</p>
                    <p className="text-base text-gray-900">{selectedInstitute.certificateCount || 0}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Verification Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="w-32 text-sm text-gray-600">Email Verified:</span>
                      {selectedInstitute.isEmailVerified ? (
                        <span className="text-green-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Yes
                        </span>
                      ) : (
                        <span className="text-red-600">No</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="w-32 text-sm text-gray-600">Phone Verified:</span>
                      {selectedInstitute.isPhoneVerified ? (
                        <span className="text-green-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Yes
                        </span>
                      ) : (
                        <span className="text-red-600">No</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="w-32 text-sm text-gray-600">Admin Verified:</span>
                      {selectedInstitute.isVerifiedByAdmin ? (
                        <span className="text-green-600 flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Yes
                        </span>
                      ) : (
                        <span className="text-yellow-600">Pending</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <span className="w-32 text-sm text-gray-600">Account Status:</span>
                      {selectedInstitute.isActive ? (
                        <span className="text-green-600">Active</span>
                      ) : (
                        <span className="text-red-600">Inactive</span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedInstitute.adminNotes && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Admin Notes</p>
                    <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-lg">
                      {selectedInstitute.adminNotes}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstituteManagement;