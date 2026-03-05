import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const TeacherIssueCertificate = ({ API_URL, assignedCourses = [], instituteId, onCertificateIssued }) => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(searchParams.get('student') || '');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [awardDate, setAwardDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (instituteId) {
      fetchCourses();
    } else {
      console.log('Waiting for institute ID...');
    }
  }, [instituteId]);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudentsForCourse();
      fetchTemplatesForCourse();
    } else {
      setTemplates([]);
      setSelectedTemplate('');
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching courses from:', `${API_URL}/teachers/courses/my`);
      
      const response = await axios.get(`${API_URL}/teachers/courses/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Courses response:', response.data);
      
      if (response.data.success) {
        setCourses(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    }
  };

  const fetchStudentsForCourse = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Fetching students for course:', selectedCourse);
      
      const response = await axios.get(`${API_URL}/teachers/students/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Students response:', response.data);
      
      if (response.data.success) {
        // Filter students by selected course and without certificates
        const filtered = response.data.data.filter(
          s => s.courseId?._id === selectedCourse && !s.hasCertificate
        );
        console.log(`Found ${filtered.length} eligible students for course`);
        setStudents(filtered);
        
        // If student was pre-selected via URL, verify they're in the list
        if (selectedStudent) {
          const studentExists = filtered.some(s => s._id === selectedStudent);
          if (!studentExists) {
            setSelectedStudent('');
          }
        }
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchTemplatesForCourse = async () => {
    if (!selectedCourse) return;
    
    setTemplatesLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const url = `${API_URL}/teachers/templates/course/${selectedCourse}`;
      console.log('Fetching templates from:', url);
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Templates response:', response.data);
      
      if (response.data.success) {
        setTemplates(response.data.data || []);
        if (response.data.data.length === 0) {
          setError('No templates found for this course. Please contact your institute admin.');
        } else {
          setError('');
        }
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError(error.response?.data?.message || 'Failed to load templates');
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedStudent || !selectedCourse || !selectedTemplate || !awardDate) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = `${API_URL}/teachers/certificates/issue`;
      console.log('Issuing certificate to:', url);
      
      const response = await axios.post(url, {
        studentId: selectedStudent,
        courseId: selectedCourse,
        templateId: selectedTemplate,
        awardDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Issue response:', response.data);

      if (response.data.success) {
        setSuccess('Certificate issued successfully!');
        setPreview({
          ...response.data.data,
          awardDate,
          studentName: students.find(s => s._id === selectedStudent)?.name,
          courseName: courses.find(c => c._id === selectedCourse)?.courseName
        });
        
        // Refresh student list
        await fetchStudentsForCourse();
        
        // Notify parent component
        if (onCertificateIssued) {
          onCertificateIssued();
        }
      }
    } catch (error) {
      console.error('Error issuing certificate:', error);
      setError(error.response?.data?.message || 'Failed to issue certificate');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedStudent('');
    setSelectedTemplate('');
    setAwardDate(new Date().toISOString().split('T')[0]);
    setPreview(null);
    setError('');
    setSuccess('');
  };

  if (!instituteId) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">Loading institute information...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Issue Certificate</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Issue Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course *
              </label>
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedStudent('');
                  setSelectedTemplate('');
                  setPreview(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Choose a course</option>
                {courses.map(course => (
                  <option key={course._id} value={course._id}>
                    {course.courseName} ({course.courseCode}) - {course.pendingCount || 0} pending
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Student *
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
                disabled={!selectedCourse || students.length === 0}
              >
                <option value="">Choose a student</option>
                {students.map(student => (
                  <option key={student._id} value={student._id}>
                    {student.name} - {student.email}
                  </option>
                ))}
              </select>
              {selectedCourse && students.length === 0 && (
                <p className="text-sm text-yellow-600 mt-1">
                  All students in this course already have certificates
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Certificate Template *
              </label>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
                  <span className="ml-2 text-sm text-gray-500">Loading templates...</span>
                </div>
              ) : (
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required
                  disabled={!selectedCourse || templates.length === 0}
                >
                  <option value="">Choose a template</option>
                  {templates.map(template => (
                    <option key={template._id} value={template._id}>
                      {template.templateName}
                    </option>
                  ))}
                </select>
              )}
              {selectedCourse && templates.length === 0 && !templatesLoading && (
                <p className="text-sm text-yellow-600 mt-1">
                  No templates available for this course
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Award Date *
              </label>
              <input
                type="date"
                value={awardDate}
                onChange={(e) => setAwardDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading || students.length === 0 || templates.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Issuing...' : 'Issue Certificate'}
              </button>
              {preview && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  New Certificate
                </button>
              )}
            </div>
          </form>

          {/* Assigned Courses Info */}
          {assignedCourses.length === 0 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-700">
                You don't have any courses assigned. Contact your institute admin.
              </p>
            </div>
          )}
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Certificate Preview</h3>
          {preview ? (
            <div>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="font-medium text-gray-900 mb-2">Certificate Details</p>
                <div className="space-y-2">
                  <p><span className="font-medium">Student:</span> {preview.studentName}</p>
                  <p><span className="font-medium">Course:</span> {preview.courseName}</p>
                  <p><span className="font-medium">Award Date:</span> {new Date(awardDate).toLocaleDateString()}</p>
                  <p><span className="font-medium">Certificate Code:</span></p>
                  <p className="font-mono text-sm bg-white p-2 rounded border break-all">
                    {preview.certificateCode}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  alert('Email functionality will be implemented');
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Email to Student
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="text-4xl mb-2">📜</p>
              <p>Fill the form to generate a certificate</p>
              {selectedCourse && templates.length === 0 && !templatesLoading && (
                <p className="text-sm text-yellow-600 mt-2">
                  No templates available. Please contact your institute admin.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherIssueCertificate;