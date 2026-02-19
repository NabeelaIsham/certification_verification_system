import { useState, useEffect } from 'react';
import axios from 'axios';

const Analytics = ({ API_URL, stats }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.get(`${API_URL}/admin/analytics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setChartData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // If analytics endpoint doesn't exist yet, use stats data
  const displayStats = [
    { label: 'Total Institutes', value: stats.totalInstitutes, color: 'bg-blue-500', icon: '🏛️' },
    { label: 'Pending Approvals', value: stats.pendingApprovals, color: 'bg-yellow-500', icon: '⏳' },
    { label: 'Approved Institutes', value: stats.approvedInstitutes, color: 'bg-green-500', icon: '✅' },
    { label: 'Suspended Institutes', value: stats.suspendedInstitutes, color: 'bg-orange-500', icon: '⚠️' },
    { label: 'Rejected Institutes', value: stats.rejectedInstitutes, color: 'bg-red-500', icon: '❌' },
    { label: 'Active Users', value: stats.activeUsers, color: 'bg-purple-500', icon: '👥' },
    { label: 'Total Certificates', value: stats.totalCertificates, color: 'bg-indigo-500', icon: '📜' }
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h2>
        <p className="text-sm text-gray-600 mt-1">Comprehensive overview of system statistics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {displayStats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className={`w-12 h-12 ${stat.color} bg-opacity-10 rounded-lg flex items-center justify-center`}>
                <span className="text-2xl">{stat.icon}</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Institute Status Distribution</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Approved</span>
                <span className="font-medium">{stats.approvedInstitutes}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${(stats.approvedInstitutes / stats.totalInstitutes) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Pending</span>
                <span className="font-medium">{stats.pendingApprovals}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-yellow-600 h-2 rounded-full" 
                  style={{ width: `${(stats.pendingApprovals / stats.totalInstitutes) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Suspended</span>
                <span className="font-medium">{stats.suspendedInstitutes}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-600 h-2 rounded-full" 
                  style={{ width: `${(stats.suspendedInstitutes / stats.totalInstitutes) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Rejected</span>
                <span className="font-medium">{stats.rejectedInstitutes}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full" 
                  style={{ width: `${(stats.rejectedInstitutes / stats.totalInstitutes) * 100 || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Insights</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📊</span>
                <div>
                  <p className="text-sm text-gray-600">Approval Rate</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {stats.totalInstitutes ? 
                      ((stats.approvedInstitutes / stats.totalInstitutes) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📈</span>
                <div>
                  <p className="text-sm text-gray-600">Active Rate</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {stats.totalInstitutes ? 
                      ((stats.activeUsers / stats.totalInstitutes) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📝</span>
                <div>
                  <p className="text-sm text-gray-600">Avg Certificates per Institute</p>
                  <p className="text-xl font-semibold text-gray-900">
                    {stats.totalInstitutes ? 
                      (stats.totalCertificates / stats.totalInstitutes).toFixed(1) : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Timeline (Placeholder) */}
      <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity Timeline</h3>
        <p className="text-gray-500 text-center py-8">
          Activity timeline will be displayed here once implemented
        </p>
      </div>
    </div>
  );
};

export default Analytics;