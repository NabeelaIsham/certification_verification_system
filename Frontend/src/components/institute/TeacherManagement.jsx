import { useState, useEffect } from 'react';
import axios from 'axios';

const TeacherManagement = ({ API_URL }) => {
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    employeeId: '',
    department: '',
    designation: '',
    qualification: '',
    assignedCourses: [],
    permissions: {
      canCreateStudents: true,
      canEditStudents: true,
      canDeleteStudents: false,
      canIssueCertificates: true,
      canBulkUpload: false,
      canCreateCourses: false,
      canEditCourses: false
    }
  });

  useEffect(() => {
    fetchTeachers();
    fetchCourses();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        // Ensure we always have an array
        setTeachers(response.data.data || []);
      } else {
        setTeachers([]);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCourses(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePermissionChange = (permName) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [permName]: !formData.permissions[permName]
      }
    });
  };

  const handleCourseSelection = (courseId) => {
    const updated = formData.assignedCourses.includes(courseId)
      ? formData.assignedCourses.filter(id => id !== courseId)
      : [...formData.assignedCourses, courseId];
    
    setFormData({ ...formData, assignedCourses: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Remove empty password if editing and password field is empty
      const submitData = { ...formData };
      if (editingTeacher && !submitData.password) {
        delete submitData.password;
      }
      
      if (editingTeacher) {
        // Update teacher
        const response = await axios.put(`${API_URL}/teachers/${editingTeacher._id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          alert('Teacher updated successfully');
        }
      } else {
        // Create teacher
        const response = await axios.post(`${API_URL}/teachers`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          alert('Teacher created successfully');
        }
      }

      setShowModal(false);
      setEditingTeacher(null);
      resetForm();
      fetchTeachers();
    } catch (error) {
      console.error('Error saving teacher:', error);
      alert(error.response?.data?.message || 'Error saving teacher');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      firstName: teacher.firstName || '',
      lastName: teacher.lastName || '',
      email: teacher.email || '',
      password: '', // Don't populate password for security
      phone: teacher.phone || '',
      employeeId: teacher.employeeId || '',
      department: teacher.department || '',
      designation: teacher.designation || '',
      qualification: teacher.qualification || '',
      assignedCourses: (teacher.assignedCourses || []).map(c => 
        typeof c === 'object' ? c._id : c
      ),
      permissions: teacher.permissions || {
        canCreateStudents: true,
        canEditStudents: true,
        canDeleteStudents: false,
        canIssueCertificates: true,
        canBulkUpload: false,
        canCreateCourses: false,
        canEditCourses: false
      }
    });
    setShowModal(true);
  };

  const handleDelete = async (teacherId) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/teachers/${teacherId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Teacher deleted successfully');
        fetchTeachers();
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
      alert(error.response?.data?.message || 'Error deleting teacher');
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
      employeeId: '',
      department: '',
      designation: '',
      qualification: '',
      assignedCourses: [],
      permissions: {
        canCreateStudents: true,
        canEditStudents: true,
        canDeleteStudents: false,
        canIssueCertificates: true,
        canBulkUpload: false,
        canCreateCourses: false,
        canEditCourses: false
      }
    });
  };

  // Safe filtering with null checks
  const filteredTeachers = (teachers || []).filter(teacher => {
    if (!teacher) return false;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      (teacher.firstName || '').toLowerCase().includes(searchLower) ||
      (teacher.lastName || '').toLowerCase().includes(searchLower) ||
      (teacher.email || '').toLowerCase().includes(searchLower) ||
      (teacher.employeeId || '').toLowerCase().includes(searchLower)
    );
  });

  if (loading && teachers.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Teacher Management</h2>
        <button
          onClick={() => {
            setEditingTeacher(null);
            resetForm();
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Add New Teacher
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search teachers by name, email, or employee ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courses</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTeachers.length > 0 ? (
              filteredTeachers.map((teacher) => (
                <tr key={teacher._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {teacher.employeeId || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {teacher.firstName} {teacher.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {teacher.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {teacher.department || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {teacher.assignedCourses?.length || 0} courses
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      teacher.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {teacher.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(teacher)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(teacher._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                  {searchTerm ? 'No teachers match your search' : 'No teachers found. Click "Add New Teacher" to create one.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Teacher Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingTeacher ? 'Edit Teacher' : 'Add New Teacher'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={editingTeacher}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {editingTeacher ? 'New Password (leave blank to keep current)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required={!editingTeacher}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Designation
                  </label>
                  <input
                    type="text"
                    name="designation"
                    value={formData.designation}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Qualification
                </label>
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assign Courses
                </label>
                <div className="border rounded-lg p-4 max-h-40 overflow-y-auto">
                  {courses.length > 0 ? (
                    courses.map(course => (
                      <label key={course._id} className="flex items-center space-x-2 mb-2">
                        <input
                          type="checkbox"
                          checked={formData.assignedCourses.includes(course._id)}
                          onChange={() => handleCourseSelection(course._id)}
                          className="rounded focus:ring-blue-500"
                        />
                        <span className="text-sm">
                          {course.courseName} ({course.courseCode})
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No courses available</p>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Permissions
                </label>
                <div className="grid grid-cols-2 gap-4 border rounded-lg p-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canCreateStudents}
                      onChange={() => handlePermissionChange('canCreateStudents')}
                      className="rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Create Students</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canEditStudents}
                      onChange={() => handlePermissionChange('canEditStudents')}
                      className="rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Edit Students</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canDeleteStudents}
                      onChange={() => handlePermissionChange('canDeleteStudents')}
                      className="rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Delete Students</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canIssueCertificates}
                      onChange={() => handlePermissionChange('canIssueCertificates')}
                      className="rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Issue Certificates</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canBulkUpload}
                      onChange={() => handlePermissionChange('canBulkUpload')}
                      className="rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Bulk Upload</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.permissions.canCreateCourses}
                      onChange={() => handlePermissionChange('canCreateCourses')}
                      className="rounded focus:ring-blue-500"
                    />
                    <span className="text-sm">Create Courses</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingTeacher ? 'Update Teacher' : 'Create Teacher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManagement;