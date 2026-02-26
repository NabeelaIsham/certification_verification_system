import React, { useState, useEffect } from 'react';
import axios from 'axios';

const IssueCertificate = ({ API_URL, onCertificateIssued }) => {
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [awardDate, setAwardDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudents();
      fetchTemplates();
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setError('Failed to load courses');
    }
  };

  const fetchStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/students?courseId=${selectedCourse}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students');
    }
  };

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/certificate-templates?courseId=${selectedCourse}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setError('Failed to load templates');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!selectedStudent || !selectedCourse || !selectedTemplate || !awardDate) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Log the data being sent
      const requestData = {
        studentId: selectedStudent,
        courseId: selectedCourse,
        templateId: selectedTemplate,
        awardDate
      };
      
      console.log('Sending certificate request:', requestData);

      const response = await axios.post(`${API_URL}/certificates`, requestData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log('Certificate response:', response.data);

      if (response.data.success) {
        alert('Certificate issued successfully!');
        onCertificateIssued?.(response.data.data);
        // Reset form
        setSelectedStudent('');
        setSelectedTemplate('');
      }
    } catch (error) {
      console.error('Error issuing certificate:', error);
      
      // Show detailed error message
      if (error.response) {
        console.error('Error response:', error.response.data);
        setError(error.response.data.message || 'Failed to issue certificate');
        alert(error.response.data.message || 'Failed to issue certificate');
      } else if (error.request) {
        console.error('No response received:', error.request);
        setError('No response from server. Please check your connection.');
        alert('No response from server. Please check your connection.');
      } else {
        console.error('Error setting up request:', error.message);
        setError('Error: ' + error.message);
        alert('Error: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Issue New Certificate</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Course *
          </label>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Certificate Template *
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
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
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Generating Certificate...' : 'Generate Certificate'}
        </button>
      </form>
    </div>
  );
};

export default IssueCertificate;