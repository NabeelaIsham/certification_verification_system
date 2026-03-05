import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import TeacherStudents from './TeacherStudents';
import TeacherIssueCertificate from './TeacherIssueCertificate';
import TeacherProfile from './TeacherProfile';

const TeacherDashboard = ({ API_URL, teacher }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    certificatesIssued: 0,
    pendingCertificates: 0
  });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [teacherData, setTeacherData] = useState(teacher);
  const [error, setError] = useState('');

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'students', name: 'My Students', icon: '👨‍🎓' },
    { id: 'issue', name: 'Issue Certificates', icon: '📜' },
    { id: 'profile', name: 'Profile', icon: '👤' }
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      
      // Fetch teacher profile with courses
      const profileRes = await axios.get(`${API_URL}/teachers/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (profileRes.data.success) {
        setTeacherData(profileRes.data.data);
        console.log('Teacher data loaded:', profileRes.data.data);
      }

      // Fetch students
      const studentsRes = await axios.get(`${API_URL}/teachers/students/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch courses with stats
      const coursesRes = await axios.get(`${API_URL}/teachers/courses/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (studentsRes.data.success) {
        const students = studentsRes.data.data || [];
        const issuedCount = students.filter(s => s.hasCertificate).length;
        
        setStats({
          totalStudents: students.length,
          totalCourses: coursesRes.data.data?.length || 0,
          certificatesIssued: issuedCount,
          pendingCertificates: students.length - issuedCount
        });
      }

      if (coursesRes.data.success) {
        setCourses(coursesRes.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading && !teacherData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">👨‍🏫</span>
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  Welcome, {teacherData?.firstName} {teacherData?.lastName}
                </h1>
                <p className="text-sm text-gray-500">
                  {teacherData?.designation} • {teacherData?.department}
                </p>
                <p className="text-xs text-gray-400">
                  Institute: {teacherData?.instituteId?.instituteName || 'Loading...'}
                </p>
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
          <div className="flex space-x-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-600'
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
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📚</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">My Courses</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">👨‍🎓</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">My Students</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">📜</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-gray-600">Certificates Issued</p>
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
                    <p className="text-sm text-gray-600">Pending Certificates</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.pendingCertificates}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* My Courses with Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">My Assigned Courses</h3>
                {courses.length > 0 ? (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {courses.map(course => (
                      <div key={course._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{course.courseName}</p>
                          <p className="text-sm text-gray-500">{course.courseCode}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            Students: {course.studentCount || 0}
                          </p>
                          <p className="text-xs text-green-600">
                            Issued: {course.certificateCount || 0}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500">No courses assigned yet</p>
                    <p className="text-xs text-gray-400 mt-2">
                      Contact your institute admin to assign courses
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setActiveTab('students')}
                    className="w-full p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">👨‍🎓</span>
                      <div>
                        <p className="font-medium">View My Students</p>
                        <p className="text-sm text-gray-600">
                          {stats.totalStudents} students in your courses
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('issue')}
                    className="w-full p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">📜</span>
                      <div>
                        <p className="font-medium">Issue Certificate</p>
                        <p className="text-sm text-gray-600">
                          {stats.pendingCertificates} students need certificates
                        </p>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className="w-full p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors text-left"
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">👤</span>
                      <div>
                        <p className="font-medium">Update Profile</p>
                        <p className="text-sm text-gray-600">
                          Manage your personal information
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {/* Institute Info Card */}
            {teacherData?.instituteId && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold mb-2">Institute Information</h3>
                <p className="text-gray-700">{teacherData.instituteId.instituteName}</p>
                <p className="text-sm text-gray-500 mt-1">{teacherData.instituteId.email}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <TeacherStudents 
            API_URL={API_URL} 
            teacherId={teacherData?._id}
            assignedCourses={teacherData?.assignedCourses || []}
            instituteId={teacherData?.instituteId?._id || teacherData?.instituteId}
          />
        )}
        
        {activeTab === 'issue' && (
          <TeacherIssueCertificate 
            API_URL={API_URL} 
            teacher={teacherData}
            assignedCourses={teacherData?.assignedCourses || []}
            instituteId={teacherData?.instituteId?._id || teacherData?.instituteId}
            onCertificateIssued={() => {
              fetchDashboardData();
            }}
          />
        )}
        
        {activeTab === 'profile' && (
          <TeacherProfile 
            API_URL={API_URL} 
            teacher={teacherData}
            onProfileUpdate={(updatedTeacher) => {
              setTeacherData(updatedTeacher);
              // Update localStorage
              const userData = JSON.parse(localStorage.getItem('user'));
              const newUserData = { ...userData, ...updatedTeacher };
              localStorage.setItem('user', JSON.stringify(newUserData));
            }}
          />
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;