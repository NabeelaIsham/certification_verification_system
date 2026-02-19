import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import InstituteManagement from '../components/admin/InstituteManagement.jsx';
import Analytics from '../components/admin/Analytics.jsx';
import SystemLogs from '../components/admin/SystemLogs.jsx';
import SystemSettings from '../components/admin/SystemSetting.jsx';
import UserManagement from '../components/admin/UserManagement.jsx';
import UserProfile from '../components/admin/UserProfile.jsx';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('institutes');
  const [stats, setStats] = useState({
    totalInstitutes: 0,
    pendingApprovals: 0,
    totalCertificates: 0,
    activeUsers: 0,
    approvedInstitutes: 0,
    rejectedInstitutes: 0,
    suspendedInstitutes: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showUserProfile, setShowUserProfile] = useState(false);

  // Authentication check
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));

    if (!token || !userData || userData.userType !== 'superadmin') {
      navigate('/login');
      return;
    }

    setUser(userData);
    fetchDashboardStats();
  }, [navigate]);

  const fetchDashboardStats = async () => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.get(`${API_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const tabs = [
    { id: 'institutes', name: 'Institutes', icon: '🏛️' },
    { id: 'users', name: 'Users', icon: '👥' },
    { id: 'analytics', name: 'Analytics', icon: '📊' },
    { id: 'logs', name: 'System Logs', icon: '📋' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
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
                <p className="text-sm text-gray-500">Welcome back, {user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* Stats Summary */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-lg font-semibold text-yellow-600">{stats.pendingApprovals}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Institutes</p>
                  <p className="text-lg font-semibold text-blue-600">{stats.totalInstitutes}</p>
                </div>
              </div>
              
              {/* Profile Button */}
              <button
                onClick={() => setShowUserProfile(true)}
                className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center hover:bg-purple-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <span className="text-sm font-medium text-white">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-1 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'institutes' && (
          <InstituteManagement 
            API_URL={API_URL} 
            user={user}
            onStatsUpdate={fetchDashboardStats}
          />
        )}
        
        {activeTab === 'users' && (
          <UserManagement 
            API_URL={API_URL} 
            user={user}
          />
        )}
        
        {activeTab === 'analytics' && (
          <Analytics 
            API_URL={API_URL} 
            stats={stats}
          />
        )}
        
        {activeTab === 'logs' && (
          <SystemLogs 
            API_URL={API_URL} 
          />
        )}
        
        {activeTab === 'settings' && (
          <SystemSettings 
            API_URL={API_URL} 
          />
        )}
      </div>

      {/* User Profile Modal */}
      {showUserProfile && (
        <UserProfile 
          isOpen={showUserProfile}
          onClose={() => setShowUserProfile(false)}
          user={user}
          API_URL={API_URL}
        />
      )}
    </div>
  );
};

export default SuperAdminDashboard;