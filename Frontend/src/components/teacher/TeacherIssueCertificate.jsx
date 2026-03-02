import { useState, useEffect } from 'react';
import axios from 'axios';
import { useSearchParams } from 'react-router-dom';

const TeacherIssueCertificate = ({ API_URL, teacher, onCertificateIssued }) => {
  const [searchParams] = useSearchParams();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(searchParams.get('student') || '');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [awardDate, setAwardDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchTeacherCourses();
  }, [teacher]);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudents();
      fetchTemplates();
    }
  }, [selectedCourse]);

  const fetchTeacherCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/teachers/profile/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCourses(response.data.data?.assignedCourses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/teachers/students/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        const filtered = response.data.data.filter(
          s => s.courseId?._id === selectedCourse && !s.hasCertificate
        );
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

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/certificate-templates?courseId=${selectedCourse}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTemplates(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
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
      const response = await axios.post(`${API_URL}/certificates`, {
        studentId: selectedStudent,
        courseId: selectedCourse,
        templateId: selectedTemplate,
        awardDate
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setSuccess('Certificate issued successfully!');
        setPreview(response.data.data);
        
        // Refresh student list
        await fetchStudents();
        
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

  const handleSendEmail = async (certificateId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/certificates/${certificateId}/send-email`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Email sent successfully!');
    } catch (error) {
      console.error('Error sending email:', error);
      setError('Failed to send email');
    }
  };

  const resetForm = () => {
    setSelectedStudent('');
    setSelectedTemplate('');
    setAwardDate(new Date().toISOString().split('T')[0]);
    setPreview(null);
  };

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
                    {course.courseName} ({course.courseCode})
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
                disabled={!selectedCourse}
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
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                required
                disabled={!selectedCourse}
              >
                <option value="">Choose a template</option>
                {templates.map(template => (
                  <option key={template._id} value={template._id}>
                    {template.templateName}
                  </option>
                ))}
              </select>
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
                disabled={loading || students.length === 0}
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
        </div>

        {/* Preview Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Certificate Preview</h3>
          {preview ? (
            <div>
              <div className="mb-4 border rounded-lg overflow-hidden">
                <img 
                  src={preview.generatedCertificateUrl} 
                  alt="Certificate Preview"
                  className="w-full h-auto"
                />
              </div>
              <div className="space-y-2 mb-4 p-4 bg-gray-50 rounded-lg">
                <p><span className="font-medium">Certificate Code:</span> {preview.certificateCode}</p>
                <p><span className="font-medium">Student:</span> {preview.studentName}</p>
                <p><span className="font-medium">Course:</span> {preview.courseName}</p>
                <p><span className="font-medium">Award Date:</span> {new Date(preview.awardDate).toLocaleDateString()}</p>
                <p><span className="font-medium">Status:</span> 
                  <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                    preview.status === 'issued' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {preview.status}
                  </span>
                </p>
              </div>
              <button
                onClick={() => handleSendEmail(preview._id)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Email to Student
              </button>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              <p className="mb-2">📜</p>
              <p>Fill the form and issue a certificate to see preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherIssueCertificate;