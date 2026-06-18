import { useState, useEffect } from 'react';
import axios from 'axios';

const SystemLogs = ({ API_URL }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [filter, page]);

  const fetchLogs = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      let url = `${API_URL}/admin/activities?page=${page}&limit=50`;
      if (filter !== 'all') {
        url += `&action=${filter}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setLogs(response.data.data || []);
        setPagination(response.data.pagination);
        setTotalPages(response.data.pagination?.pages || 1);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    switch(action) {
      case 'APPROVE_INSTITUTE': return '✅';
      case 'REJECT_INSTITUTE': return '❌';
      case 'SUSPEND_INSTITUTE': return '⛔';
      case 'ACTIVATE_INSTITUTE': return '▶️';
      case 'SUSPEND_USER': return '⛔';
      case 'ACTIVATE_USER': return '▶️';
      case 'RESET_USER_PASSWORD': return '🔑';
      case 'REVOKE_CERTIFICATE': return '📋';
      case 'UPDATE_SETTINGS': return '⚙️';
      case 'TEST_EMAIL': return '📧';
      default: return '📝';
    }
  };

  const getActionColor = (action) => {
    switch(action) {
      case 'APPROVE_INSTITUTE':
      case 'ACTIVATE_INSTITUTE':
      case 'ACTIVATE_USER':
        return 'bg-green-100 text-green-800';
      case 'REJECT_INSTITUTE':
      case 'REVOKE_CERTIFICATE':
        return 'bg-red-100 text-red-800';
      case 'SUSPEND_INSTITUTE':
      case 'SUSPEND_USER':
        return 'bg-orange-100 text-orange-800';
      case 'RESET_USER_PASSWORD':
        return 'bg-blue-100 text-blue-800';
      case 'UPDATE_SETTINGS':
      case 'TEST_EMAIL':
        return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatActionName = (action) => {
    return action.replace(/_/g, ' ');
  };

  const getDetailsSummary = (details) => {
    if (!details) return 'N/A';
    if (details.instituteName) return details.instituteName;
    if (details.targetUserEmail) return details.targetUserEmail;
    if (details.certificateCode) return details.certificateCode;
    if (Array.isArray(details.settingsUpdated)) return details.settingsUpdated.join(', ');
    return JSON.stringify(details).substring(0, 50);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">System Logs</h2>
        <p className="text-sm text-gray-600 mt-1">Monitor all system activities and events</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div className="flex space-x-2">
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Activities</option>
              <option value="APPROVE_INSTITUTE">Approve Institute</option>
              <option value="REJECT_INSTITUTE">Reject Institute</option>
              <option value="SUSPEND_INSTITUTE">Suspend Institute</option>
              <option value="ACTIVATE_INSTITUTE">Activate Institute</option>
              <option value="SUSPEND_USER">Suspend User</option>
              <option value="ACTIVATE_USER">Activate User</option>
              <option value="RESET_USER_PASSWORD">Reset Password</option>
              <option value="REVOKE_CERTIFICATE">Revoke Certificate</option>
              <option value="UPDATE_SETTINGS">Update Settings</option>
              <option value="TEST_EMAIL">Test Email</option>
            </select>
          </div>

          <button
            onClick={fetchLogs}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 flex items-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-gray-500">No logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)} {formatActionName(log.action)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {getDetailsSummary(log.details)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.user?.name || log.userEmail || 'System'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing page <span className="font-medium">{pagination.page}</span> of{' '}
              <span className="font-medium">{pagination.pages}</span> ({pagination.total} total activities)
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemLogs;