import { useState, useEffect } from 'react';
import axios from 'axios';

const BulkUpload = ({ API_URL }) => {
  const [activeTab, setActiveTab] = useState('students');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [formData, setFormData] = useState({
    studentData: '',
    certificateData: '',
    courseId: '',
    templateId: '',
    awardDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.get(`${API_URL}/certificate-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const handleStudentsUpload = async () => {
  try {
    // Parse the textarea content
    const lines = formData.studentData.trim().split('\n');
    const students = [];
    
    lines.forEach((line) => {
      // Skip empty lines
      if (!line.trim()) return;
      
      // Split by comma and trim each value
      const [name, email, phone, courseCode, enrollmentDate] = line.split(',').map(s => s.trim());
      
      students.push({
        name,
        email,
        phone: phone || '',
        courseCode,
        enrollmentDate: enrollmentDate || new Date().toISOString().split('T')[0]
      });
    });

    console.log('Parsed students:', students);

    setLoading(true);
    const token = localStorage.getItem('token');
    const response = await axios.post(`${API_URL}/students/bulk-upload`, 
      { students }, 
      { headers: { Authorization: `Bearer ${token}` } }
    );

    console.log('Upload response:', response.data);
    
    if (response.data.success) {
      setResults(response.data.data);
      alert(response.data.message);
    }
  } catch (error) {
    console.error('Error in bulk upload:', error);
    alert(error.response?.data?.message || 'Error in bulk upload');
  } finally {
    setLoading(false);
  }
};
  const handleCertificatesUpload = async () => {
    try {
      const certificates = formData.certificateData.split('\n').map(line => {
        const [studentEmail, courseCode, templateId, awardDate] = line.split(',');
        return { studentEmail, courseCode, templateId, awardDate };
      }).filter(c => c.studentEmail && c.courseCode && c.templateId);

      if (certificates.length === 0) {
        alert('Please enter valid certificate data');
        return;
      }

      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/certificates/bulk-issue`, { certificates }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        setResults(response.data.data);
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error in bulk certificate upload:', error);
      alert(error.response?.data?.message || 'Error in bulk certificate upload');
    } finally {
      setLoading(false);
    }
  };

  const downloadSampleCSV = (type) => {
    let content = '';
    let filename = '';

    if (type === 'students') {
      content = 'Name,Email,Phone,CourseCode,EnrollmentDate\nJohn Doe,john@example.com,1234567890,CS101,2024-01-15\nJane Smith,jane@example.com,9876543210,CS102,2024-01-16';
      filename = 'sample_students.csv';
    } else {
      content = 'StudentEmail,CourseCode,TemplateId,AwardDate\njohn@example.com,CS101,TEMP001,2024-03-15\njane@example.com,CS102,TEMP002,2024-03-16';
      filename = 'sample_certificates.csv';
    }

    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Bulk Upload</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => {
              setActiveTab('students');
              setResults(null);
              setFormData({ ...formData, studentData: '', certificateData: '' });
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'students'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Bulk Upload Students
          </button>
          <button
            onClick={() => {
              setActiveTab('certificates');
              setResults(null);
              setFormData({ ...formData, studentData: '', certificateData: '' });
            }}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'certificates'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Bulk Issue Certificates
          </button>
        </nav>
      </div>

      {activeTab === 'students' ? (
        // Student Bulk Upload
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Upload Students</h3>
            <button
              onClick={() => downloadSampleCSV('students')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Download Sample CSV
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Enter student data in CSV format (one student per line):
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Format: Name, Email, Phone, CourseCode, EnrollmentDate (YYYY-MM-DD)
          </p>

          <textarea
            value={formData.studentData}
            onChange={(e) => setFormData({ ...formData, studentData: e.target.value })}
            rows="10"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm mb-4"
            placeholder="John Doe,john@example.com,1234567890,CS101,2024-01-15"
          />

          {results && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Upload Results:</h4>
              <p className="text-sm text-green-600">Successful: {results.successful?.length || 0}</p>
              <p className="text-sm text-red-600">Failed: {results.failed?.length || 0}</p>
              
              {results.failed?.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium">Failed Records:</p>
                  <ul className="text-xs text-red-600 mt-1">
                    {results.failed.map((failed, index) => (
                      <li key={index}>{failed.name || failed.email} - {failed.error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleStudentsUpload}
              disabled={loading || !formData.studentData.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Uploading...' : 'Upload Students'}
            </button>
          </div>
        </div>
      ) : (
        // Certificate Bulk Upload
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Issue Certificates in Bulk</h3>
            <button
              onClick={() => downloadSampleCSV('certificates')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Download Sample CSV
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Enter certificate data in CSV format (one certificate per line):
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Format: StudentEmail, CourseCode, TemplateId, AwardDate (YYYY-MM-DD)
          </p>

          <textarea
            value={formData.certificateData}
            onChange={(e) => setFormData({ ...formData, certificateData: e.target.value })}
            rows="10"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm mb-4"
            placeholder="john@example.com,CS101,TEMP001,2024-03-15"
          />

          {results && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Issuance Results:</h4>
              <p className="text-sm text-green-600">Successful: {results.successful?.length || 0}</p>
              <p className="text-sm text-red-600">Failed: {results.failed?.length || 0}</p>
              
              {results.failed?.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto">
                  <p className="text-sm font-medium">Failed Records:</p>
                  <ul className="text-xs text-red-600 mt-1">
                    {results.failed.map((failed, index) => (
                      <li key={index}>
                        {failed.studentEmail} - {failed.courseCode} - {failed.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={handleCertificatesUpload}
              disabled={loading || !formData.certificateData.trim()}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Issue Certificates'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkUpload;