import { useState, useEffect } from 'react';
import axios from 'axios';

const BulkUpload = ({ API_URL }) => {
  const [file, setFile] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${API_URL}/courses?limit=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedCourse) {
      alert('Please select a file and course');
      return;
    }

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', selectedCourse);

    setUploading(true);
    setResult(null);

    try {
      const response = await axios.post(`${API_URL}/students/bulk`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setResult(response.data.data);
        setFile(null);
        document.getElementById('file-input').value = '';
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const downloadSample = () => {
    const headers = ['name', 'email', 'phone', 'enrollmentDate'];
    const sample = [
      ['John Doe', 'john@example.com', '+1234567890', '2024-01-15'],
      ['Jane Smith', 'jane@example.com', '+0987654321', '2024-01-16']
    ];

    const csv = [
      headers.join(','),
      ...sample.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sample-students.csv';
    link.click();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Bulk Upload Students</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Upload CSV File</h2>

          {result && (
            <div className="mb-4 p-4 bg-green-100 text-green-800 rounded-lg">
              <p className="font-semibold">Upload Complete!</p>
              <p>Successfully added: {result.successCount} students</p>
              {result.errorCount > 0 && (
                <p className="mt-2">Errors: {result.errorCount}</p>
              )}
            </div>
          )}

          <form onSubmit={handleUpload}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Select Course</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Choose a course</option>
                {courses.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">CSV File</label>
              <input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload Students'}
            </button>
          </form>
        </div>

        {/* Instructions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Instructions</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">File Format</h3>
              <p className="text-sm text-gray-600">
                Upload a CSV file with these columns:
              </p>
              <div className="mt-2 bg-gray-50 p-3 rounded-lg font-mono text-sm">
                name, email, phone, enrollmentDate
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Example</h3>
              <div className="bg-gray-50 p-3 rounded-lg text-sm font-mono">
                name,email,phone,enrollmentDate<br />
                John Doe,john@example.com,+1234567890,2024-01-15<br />
                Jane Smith,jane@example.com,+0987654321,2024-01-16
              </div>
            </div>

            <button
              onClick={downloadSample}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              📥 Download Sample CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkUpload;