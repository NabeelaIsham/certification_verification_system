import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const InstituteDashboard = () => {
 
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalCourses: 0,
    certificatesIssued: 0,
    pendingVerifications: 0
  });

  // Mock data - replace with API calls
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setCourses([
        { id: 1, name: 'Bachelor of IT', code: 'BIT2024', students: 450, certificates: 420 },
        { id: 2, name: 'Diploma in Web Development', code: 'DWD2024', students: 120, certificates: 115 },
        { id: 3, name: 'Certificate in Data Science', code: 'CDS2024', students: 85, certificates: 80 }
      ]);

      setStudents([
        { id: 1, name: 'John Smith', email: 'john@student.edu', course: 'BIT2024', status: 'active' },
        { id: 2, name: 'Sarah Johnson', email: 'sarah@student.edu', course: 'DWD2024', status: 'active' },
        { id: 3, name: 'Mike Davis', email: 'mike@student.edu', course: 'CDS2024', status: 'completed' }
      ]);

      setCertificates([
        { id: 1, studentName: 'John Smith', course: 'BIT2024', issueDate: '2024-03-15', status: 'issued' },
        { id: 2, studentName: 'Sarah Johnson', course: 'DWD2024', issueDate: '2024-03-14', status: 'issued' },
        { id: 3, studentName: 'Mike Davis', course: 'CDS2024', issueDate: '2024-03-13', status: 'verified' }
      ]);

      setStats({
        totalStudents: 1250,
        totalCourses: 8,
        certificatesIssued: 845,
        pendingVerifications: 12
      });
    }, 1000);
  }, []);

  const quickActions = [
    {
      title: 'Add New Student',
      description: 'Register a new student',
      icon: '👨‍🎓',
      action: () => console.log('Add student'),
      color: 'bg-blue-500'
    },
    {
      title: 'Generate Certificate',
      description: 'Issue digital certificate',
      icon: '📜',
      action: () => console.log('Generate certificate'),
      color: 'bg-green-500'
    },
    {
      title: 'Create Course',
      description: 'Add new course program',
      icon: '📚',
      action: () => console.log('Create course'),
      color: 'bg-purple-500'
    },
    {
      title: 'Bulk Upload',
      description: 'Upload students via CSV',
      icon: '📁',
      action: () => console.log('Bulk upload'),
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-3">
                <h1 className="text-2xl font-bold text-gray-900">University of Moratuwa</h1>
                <p className="text-sm text-gray-500">Institute Administration Panel</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200">
                Generate Report
              </button>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">IA</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalStudents.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Courses</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCourses}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Certificates Issued</p>
                <p className="text-2xl font-bold text-gray-900">{stats.certificatesIssued.toLocaleString()}</p>
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
                <p className="text-sm font-medium text-gray-600">Pending Verifications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingVerifications}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-4">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-left"
                  >
                    <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                      {action.icon}
                    </div>
                    <div className="ml-4">
                      <h3 className="font-medium text-gray-900">{action.title}</h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Certificates */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Certificates</h2>
              <p className="text-sm text-gray-600">Latest issued certificates</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {certificates.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{cert.studentName}</h3>
                      <p className="text-sm text-gray-600">{cert.course}</p>
                      <p className="text-xs text-gray-400">{cert.issueDate}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      cert.status === 'issued' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {cert.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Courses Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Courses Overview</h2>
              <p className="text-sm text-gray-600">Active courses and enrollment</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {courses.map((course) => (
                  <div key={course.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <h3 className="font-medium text-gray-900">{course.name}</h3>
                      <p className="text-sm text-gray-600">Code: {course.code}</p>
                      <div className="flex space-x-4 mt-2">
                        <span className="text-sm text-gray-500">{course.students} students</span>
                        <span className="text-sm text-gray-500">{course.certificates} certificates</span>
                      </div>
                    </div>
                    <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200">
                      Manage
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Students */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Students</h2>
              <p className="text-sm text-gray-600">Latest registered students</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {students.map((student) => (
                  <div key={student.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">{student.name}</h3>
                        <p className="text-sm text-gray-600">{student.email}</p>
                        <p className="text-xs text-gray-400">{student.course}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      student.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstituteDashboard;