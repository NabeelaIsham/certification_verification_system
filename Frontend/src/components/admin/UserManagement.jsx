import { useState, useEffect } from 'react';
import axios from 'axios';

const UserManagement = ({ API_URL, user }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  useEffect(() => {
    fetchUsers();
  }, [pagination.page, selectedRole, selectedStatus]);

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm.trim() === '') {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(u => 
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.instituteName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.adminName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm)
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      // Create this endpoint in your backend
      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          role: selectedRole,
          status: selectedStatus,
          page: pagination.page,
          limit: pagination.limit
        }
      });
      
      if (response.data.success) {
        setUsers(response.data.data || []);
        setFilteredUsers(response.data.data || []);
        setPagination(response.data.pagination || {
          page: 1,
          limit: 10,
          total: response.data.data?.length || 0,
          pages: Math.ceil((response.data.data?.length || 0) / 10)
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // If endpoint doesn't exist, use mock data for now
      const mockUsers = [
        {
          _id: '1',
          email: 'superadmin@example.com',
          userType: 'superadmin',
          isActive: true,
          lastLogin: new Date().toISOString()
        },
        {
          _id: '2',
          email: 'institute1@example.com',
          instituteName: 'University of Technology',
          adminName: 'John Doe',
          userType: 'institute',
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isVerifiedByAdmin: true,
          lastLogin: new Date().toISOString()
        },
        {
          _id: '3',
          email: 'institute2@example.com',
          instituteName: 'Medical College',
          adminName: 'Jane Smith',
          userType: 'institute',
          isActive: false,
          isEmailVerified: true,
          isPhoneVerified: false,
          isVerifiedByAdmin: false,
          lastLogin: null
        },
        {
          _id: '4',
          email: 'institute3@example.com',
          instituteName: 'Engineering Institute',
          adminName: 'Bob Wilson',
          userType: 'institute',
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          isVerifiedByAdmin: true,
          lastLogin: new Date().toISOString()
        }
      ];
      setUsers(mockUsers);
      setFilteredUsers(mockUsers);
      setPagination({
        page: 1,
        limit: 10,
        total: mockUsers.length,
        pages: 1
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    if (!window.confirm(`Are you sure you want to ${currentStatus ? 'deactivate' : 'activate'} this user?`)) return;

    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.put(
        `${API_URL}/admin/users/${userId}/toggle-status`,
        { active: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert(`User ${currentStatus ? 'deactivated' : 'activated'} successfully!`);
        fetchUsers();
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const handleResetPassword = async (userId) => {
    if (!window.confirm('Are you sure you want to reset this user\'s password? They will receive an email with reset instructions.')) return;

    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.post(
        `${API_URL}/admin/users/${userId}/reset-password`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.success) {
        alert('Password reset email sent successfully!');
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    }
  };

  const getRoleBadge = (userType) => {
    switch(userType) {
      case 'superadmin':
        return { text: 'Super Admin', color: 'bg-purple-100 text-purple-800' };
      case 'institute':
        return { text: 'Institute', color: 'bg-blue-100 text-blue-800' };
      default:
        return { text: userType, color: 'bg-gray-100 text-gray-800' };
    }
  };

  const getStatusBadge = (user) => {
    if (!user.isActive) {
      return { text: 'Inactive', color: 'bg-red-100 text-red-800' };
    }
    if (user.userType === 'institute') {
      if (!user.isVerifiedByAdmin) {
        return { text: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800' };
      }
      if (!user.isEmailVerified || !user.isPhoneVerified) {
        return { text: 'Pending Verification', color: 'bg-orange-100 text-orange-800' };
      }
    }
    return { text: 'Active', color: 'bg-green-100 text-green-800' };
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">User Management</h2>
        <p className="text-sm text-gray-600 mt-1">Manage system users and their permissions</p>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users by email, name, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="institute">Institute</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-gray-500">No users found</p>
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="mt-2 text-purple-600 hover:text-purple-800"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Verification</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((u) => {
                  const roleBadge = getRoleBadge(u.userType);
                  const statusBadge = getStatusBadge(u);
                  return (
                    <tr key={u._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            u.userType === 'superadmin' ? 'bg-purple-100' :
                            'bg-blue-100'
                          }`}>
                            <span className="text-lg font-semibold text-gray-700">
                              {u.email?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {u.instituteName || u.adminName || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                            {u.phone && (
                              <div className="text-sm text-gray-500">{u.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${roleBadge.color}`}>
                          {roleBadge.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${statusBadge.color}`}>
                          {statusBadge.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.userType === 'institute' && (
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <span className="w-20 text-gray-500">Email:</span>
                              {u.isEmailVerified ? (
                                <span className="text-green-600 flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Verified
                                </span>
                              ) : (
                                <span className="text-red-600">Pending</span>
                              )}
                            </div>
                            <div className="flex items-center text-sm">
                              <span className="w-20 text-gray-500">Phone:</span>
                              {u.isPhoneVerified ? (
                                <span className="text-green-600 flex items-center">
                                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Verified
                                </span>
                              ) : (
                                <span className="text-red-600">Pending</span>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleToggleUserStatus(u._id, u.isActive)}
                            className={`px-3 py-1 rounded-lg text-xs ${
                              u.isActive 
                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleResetPassword(u._id)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200"
                          >
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing page {pagination.page} of {pagination.pages}
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className={`px-3 py-1 rounded-lg text-sm ${
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
                className={`px-3 py-1 rounded-lg text-sm ${
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
    </div>
  );
};

export default UserManagement;