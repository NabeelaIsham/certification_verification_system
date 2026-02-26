import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CourseManagement from '../components/institute/CourseManagement';
import StudentManagement from '../components/institute/StudentManagement';
import CertificateManagement from '../components/institute/CertificateManagement'; // Changed this line
import BulkUpload from '../components/institute/BulkUpload';
import InstituteSettings from '../components/institute/InstituteSettings';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const InstituteDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    certificatesIssued: 0,
    pendingVerifications: 0
  });
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'courses', name: 'Courses', icon: '📚' },
    { id: 'students', name: 'Students', icon: '👨‍🎓' },
    { id: 'certificates', name: 'Certificates', icon: '📜' },
    { id: 'bulk-upload', name: 'Bulk Upload', icon: '📁' },
    { id: 'settings', name: 'Settings', icon: '⚙️' }
  ];

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));

    if (!token || !userData || userData.userType !== 'institute') {
      navigate('/login');
      return;
    }

    setUser(userData);
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/institute/stats`, {
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
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">CV</span>
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900">{user?.instituteName}</h1>
                <p className="text-sm text-gray-500">Institute Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-red-600 hover:text-red-800"
              >
                Logout
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
                    ? 'border-blue-600 text-blue-600'
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
        {activeTab === 'dashboard' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👨‍🎓</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Total Courses</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📜</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Certificates</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.certificatesIssued}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">⏳</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingVerifications}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('courses')}
                className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-2">📚</div>
                <h3 className="font-medium">Manage Courses</h3>
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-2">👨‍🎓</div>
                <h3 className="font-medium">Manage Students</h3>
              </button>
              <button
                onClick={() => setActiveTab('certificates')}
                className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-2">📜</div>
                <h3 className="font-medium">Certificates</h3>
              </button>
              <button
                onClick={() => setActiveTab('bulk-upload')}
                className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="text-4xl mb-2">📁</div>
                <h3 className="font-medium">Bulk Upload</h3>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'courses' && <CourseManagement API_URL={API_URL} />}
        {activeTab === 'students' && <StudentManagement API_URL={API_URL} />}
        {activeTab === 'certificates' && <CertificateManagement API_URL={API_URL} />}
        {activeTab === 'bulk-upload' && <BulkUpload API_URL={API_URL} />}
        {activeTab === 'settings' && <InstituteSettings API_URL={API_URL} user={user} />}
      </div>
    </div>
  );
};

export default InstituteDashboard;