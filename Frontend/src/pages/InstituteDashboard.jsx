import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const InstituteDashboard = () => {
  const navigate = useNavigate();
  
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [showModal, setShowModal] = useState(null); // 'addStudent', 'generateCertificate', 'createCourse', 'bulkUpload'
  const [modalData, setModalData] = useState({});
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
      action: () => handleAddStudent(),
      color: 'bg-blue-500'
    },
    {
      title: 'Generate Certificate',
      description: 'Issue digital certificate',
      icon: '📜',
      action: () => handleGenerateCertificate(),
      color: 'bg-green-500'
    },
    {
      title: 'Create Course',
      description: 'Add new course program',
      icon: '📚',
      action: () => handleCreateCourse(),
      color: 'bg-purple-500'
    },
    {
      title: 'Bulk Upload',
      description: 'Upload students via CSV',
      icon: '📁',
      action: () => handleBulkUpload(),
      color: 'bg-orange-500'
    }
  ];

  // ========== ACTION HANDLERS ==========

  const handleAddStudent = () => {
    setModalData({
      title: 'Add New Student',
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', placeholder: 'Enter student name' },
        { name: 'email', label: 'Email Address', type: 'email', placeholder: 'student@example.com' },
        { name: 'course', label: 'Course', type: 'select', options: courses.map(c => ({ value: c.code, label: c.name })) },
        { name: 'enrollmentDate', label: 'Enrollment Date', type: 'date' }
      ]
    });
    setShowModal('addStudent');
  };

  const handleGenerateCertificate = () => {
    setModalData({
      title: 'Generate Certificate',
      fields: [
        { name: 'student', label: 'Select Student', type: 'select', options: students.map(s => ({ value: s.id, label: s.name })) },
        { name: 'course', label: 'Course', type: 'select', options: courses.map(c => ({ value: c.code, label: c.name })) },
        { name: 'issueDate', label: 'Issue Date', type: 'date', value: new Date().toISOString().split('T')[0] },
        { name: 'grade', label: 'Grade', type: 'text', placeholder: 'Enter grade (e.g., A+, Distinction)' }
      ]
    });
    setShowModal('generateCertificate');
  };

  const handleCreateCourse = () => {
    setModalData({
      title: 'Create New Course',
      fields: [
        { name: 'name', label: 'Course Name', type: 'text', placeholder: 'Enter course name' },
        { name: 'code', label: 'Course Code', type: 'text', placeholder: 'e.g., BIT2024' },
        { name: 'duration', label: 'Duration (months)', type: 'number', placeholder: '12' },
        { name: 'fee', label: 'Course Fee ($)', type: 'number', placeholder: '1000' },
        { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Course description...' }
      ]
    });
    setShowModal('createCourse');
  };

  const handleBulkUpload = () => {
    setModalData({
      title: 'Bulk Upload Students',
      fields: [
        { name: 'file', label: 'CSV File', type: 'file', accept: '.csv' },
        { name: 'course', label: 'Assign to Course', type: 'select', options: courses.map(c => ({ value: c.code, label: c.name })) }
      ]
    });
    setShowModal('bulkUpload');
  };

  const handleGenerateReport = () => {
    const reportData = {
      generatedAt: new Date().toLocaleString(),
      stats: stats,
      courses: courses.length,
      students: students.length,
      certificates: certificates.length
    };
    
    // In a real app, this would generate and download a PDF/CSV
    console.log('Generating report:', reportData);
    
    // For demo, create a downloadable JSON file
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `institute-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('Report generated and downloaded! Check console for details.');
  };

  const handleUserProfileClick = () => {
    // In a real app, this would navigate to user profile or show profile modal
    console.log('User profile clicked');
    alert('Profile page would open here. Current user: Institute Admin');
  };

  const handleCourseManage = (courseId) => {
    // Navigate to course management page
    console.log('Managing course:', courseId);
    alert(`Would navigate to course management for ID: ${courseId}`);
  };

  const handleModalSubmit = (formData) => {
    console.log('Form submitted:', formData);
    
    switch(showModal) {
      case 'addStudent':
        const newStudent = {
          id: students.length + 1,
          name: formData.name,
          email: formData.email,
          course: formData.course,
          status: 'active',
          enrollmentDate: formData.enrollmentDate
        };
        setStudents([...students, newStudent]);
        setStats(prev => ({ ...prev, totalStudents: prev.totalStudents + 1 }));
        alert(`Student ${formData.name} added successfully!`);
        break;
        
      case 'generateCertificate':
        const student = students.find(s => s.id === parseInt(formData.student));
        const newCertificate = {
          id: certificates.length + 1,
          studentName: student?.name || 'Unknown Student',
          course: formData.course,
          issueDate: formData.issueDate,
          grade: formData.grade,
          status: 'issued'
        };
        setCertificates([newCertificate, ...certificates]);
        setStats(prev => ({ ...prev, certificatesIssued: prev.certificatesIssued + 1 }));
        alert(`Certificate generated for ${student?.name}!`);
        break;
        
      case 'createCourse':
        const newCourse = {
          id: courses.length + 1,
          name: formData.name,
          code: formData.code,
          students: 0,
          certificates: 0,
          duration: formData.duration,
          fee: formData.fee
        };
        setCourses([...courses, newCourse]);
        setStats(prev => ({ ...prev, totalCourses: prev.totalCourses + 1 }));
        alert(`Course ${formData.name} created successfully!`);
        break;
        
      case 'bulkUpload':
        // Simulate bulk upload processing
        console.log('Processing bulk upload:', formData);
        alert(`Bulk upload initiated for course: ${formData.course}\nFile processing would happen in background.`);
        break;
    }
    
    setShowModal(null);
  };

  const Modal = ({ show, onClose, title, fields, onSubmit }) => {
    const [formData, setFormData] = useState({});
    
    if (!show) return null;
    
    const handleChange = (e) => {
      const { name, value, files } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: files ? files[0] : value
      }));
    };
    
    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(formData);
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            <div className="space-y-4">
              {fields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      name={field.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      name={field.name}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      required
                    />
                  ) : field.type === 'file' ? (
                    <input
                      type="file"
                      name={field.name}
                      onChange={handleChange}
                      accept={field.accept}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  ) : (
                    <input
                      type={field.type}
                      name={field.name}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      defaultValue={field.value}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

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
              <button 
                onClick={handleGenerateReport}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200"
              >
                Generate Report
              </button>
              <button 
                onClick={handleUserProfileClick}
                className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center hover:bg-gray-400 transition-colors duration-200 cursor-pointer"
              >
                <span className="text-sm font-medium text-gray-700">IA</span>
              </button>
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
                    <button 
                      onClick={() => handleCourseManage(course.id)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
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

      {/* Modal Component */}
      <Modal
        show={showModal}
        onClose={() => setShowModal(null)}
        title={modalData.title}
        fields={modalData.fields || []}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default InstituteDashboard;