import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SystemSettings from '../components/admin/SystemSetting.jsx';
import UserProfile from '../components/admin/UserProfile.jsx';

const SuperAdminDashboard = () => {

  const [institutes, setInstitutes] = useState([]);
  const [stats, setStats] = useState({
    totalInstitutes: 0,
    pendingApprovals: 0,
    totalCertificates: 0,
    activeUsers: 0
  });

  // State for modals
  const [showSystemSettings, setShowSystemSettings] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Mock data - replace with API calls
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setInstitutes([
        {
          id: 1,
          name: 'University of Moratuwa',
          email: 'admin@uom.lk',
          status: 'active',
          students: 12500,
          certificates: 8450,
          joinDate: '2024-01-15',
          verificationStatus: 'verified'
        },
        {
          id: 2,
          name: 'Colombo Technical College',
          email: 'admin@colombotech.edu',
          status: 'pending',
          students: 3200,
          certificates: 2100,
          joinDate: '2024-02-20',
          verificationStatus: 'pending'
        },
        {
          id: 3,
          name: 'Kandy Institute of Technology',
          email: 'admin@kit.edu',
          status: 'active',
          students: 5800,
          certificates: 3920,
          joinDate: '2024-01-08',
          verificationStatus: 'verified'
        }
      ]);

      setStats({
        totalInstitutes: 45,
        pendingApprovals: 3,
        totalCertificates: 125430,
        activeUsers: 156
      });
    }, 1000);
  }, []);

  const handleApproveInstitute = (instituteId) => {
    setInstitutes(prev => 
      prev.map(inst => 
        inst.id === instituteId 
          ? { ...inst, status: 'active', verificationStatus: 'verified' }
          : inst
      )
    );
  };

  const handleRejectInstitute = (instituteId) => {
    setInstitutes(prev => prev.filter(inst => inst.id !== instituteId));
  };

  const recentActivities = [
    {
      id: 1,
      action: 'Institute Registered',
      description: 'Colombo Technical College registered for verification',
      time: '2 hours ago',
      type: 'registration'
    },
    {
      id: 2,
      action: 'Certificate Generated',
      description: 'University of Moratuwa generated 25 certificates',
      time: '5 hours ago',
      type: 'certificate'
    },
    {
      id: 3,
      action: 'Institute Verified',
      description: 'Kandy Institute of Technology verification completed',
      time: '1 day ago',
      type: 'verification'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
                <p className="text-sm text-gray-500">System Administration Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
              onClick={() => setShowSystemSettings(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                </svg>
                <span>System Settings</span>
              </button>
              
             <button
              onClick={() => setShowUserProfile(true)}
              className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center hover:bg-gray-400 transition-colors duration-200 cursor-pointer">
                <span className="text-sm font-medium text-gray-700">SA</span>
             </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Stats Cards */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Institutes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalInstitutes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending Approvals</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingApprovals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Certificates</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCertificates.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Institutes Management */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Institute Management</h2>
                <p className="text-sm text-gray-600">Manage registered educational institutions</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {institutes.map((institute) => (
                    <div key={institute.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          institute.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'
                        }`}></div>
                        <div>
                          <h3 className="font-medium text-gray-900">{institute.name}</h3>
                          <p className="text-sm text-gray-500">{institute.email}</p>
                          <div className="flex space-x-2 mt-1">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              institute.verificationStatus === 'verified' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {institute.verificationStatus}
                            </span>
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                              {institute.students.toLocaleString()} students
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {institute.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveInstitute(institute.id)}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors duration-200"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRejectInstitute(institute.id)}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors duration-200"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors duration-200">
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activities</h2>
              <p className="text-sm text-gray-600">Latest system activities</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex space-x-3">
                    <div className={`w-2 h-2 mt-2 rounded-full ${
                      activity.type === 'registration' ? 'bg-blue-500' :
                      activity.type === 'certificate' ? 'bg-green-500' :
                      'bg-purple-500'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
       {/* Modals */}
      <SystemSettings 
        isOpen={showSystemSettings}
        onClose={() => setShowSystemSettings(false)}
      />
      
      <UserProfile 
        isOpen={showUserProfile}
        onClose={() => setShowUserProfile(false)}
      />
    </div>
  );
};

export default SuperAdminDashboard;