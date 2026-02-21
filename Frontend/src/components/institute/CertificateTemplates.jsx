import { useState, useEffect } from 'react';
import axios from 'axios';

const CertificateTemplates = ({ API_URL }) => {
  const [templates, setTemplates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    templateId: '',
    templateName: '',
    courseName: '',
    layout: 'standard',
    design: {
      backgroundColor: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      borderStyle: '2px solid #2563eb',
      logo: '',
      signature: ''
    },
    fields: []
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/certificate-templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('design.')) {
      const designField = name.split('.')[1];
      setFormData({
        ...formData,
        design: {
          ...formData.design,
          [designField]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (editingTemplate) {
        const response = await axios.put(`${API_URL}/certificate-templates/${editingTemplate._id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          alert('Template updated successfully');
        }
      } else {
        const response = await axios.post(`${API_URL}/certificate-templates`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data.success) {
          alert('Template created successfully');
        }
      }
      
      setShowModal(false);
      setEditingTemplate(null);
      setFormData({
        templateId: '',
        templateName: '',
        courseName: '',
        layout: 'standard',
        design: {
          backgroundColor: '#ffffff',
          fontFamily: 'Arial, sans-serif',
          borderStyle: '2px solid #2563eb',
          logo: '',
          signature: ''
        },
        fields: []
      });
      fetchTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      alert(error.response?.data?.message || 'Error saving template');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      templateId: template.templateId,
      templateName: template.templateName,
      courseName: template.courseName || '',
      layout: template.layout || 'standard',
      design: template.design || {
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        borderStyle: '2px solid #2563eb',
        logo: '',
        signature: ''
      },
      fields: template.fields || []
    });
    setShowModal(true);
  };

  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.delete(`${API_URL}/certificate-templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        alert('Template deleted successfully');
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(error.response?.data?.message || 'Error deleting template');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Certificate Templates</h2>
        <button
          onClick={() => {
            setEditingTemplate(null);
            setFormData({
              templateId: '',
              templateName: '',
              courseName: '',
              layout: 'standard',
              design: {
                backgroundColor: '#ffffff',
                fontFamily: 'Arial, sans-serif',
                borderStyle: '2px solid #2563eb',
                logo: '',
                signature: ''
              },
              fields: []
            });
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create New Template
        </button>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <div key={template._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-40 bg-gradient-to-r from-blue-50 to-purple-50 p-4">
              <div className="w-full h-full border-2 border-blue-200 rounded-lg bg-white p-2">
                <div className="text-xs text-center text-gray-400">Certificate Preview</div>
                <div className="text-center mt-2">
                  <div className="text-sm font-bold truncate">{template.templateName}</div>
                  <div className="text-xs text-gray-500 mt-1">{template.courseName || 'General'}</div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{template.templateName}</h3>
                  <p className="text-sm text-gray-500">ID: {template.templateId}</p>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  {template.layout}
                </span>
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(template)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template._id)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </div>
                {template.isDefault && (
                  <span className="text-xs text-green-600">Default</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-3xl shadow-lg rounded-lg bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Create New Template'}
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
                    Template ID *
                  </label>
                  <input
                    type="text"
                    name="templateId"
                    value={formData.templateId}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Template Name *
                  </label>
                  <input
                    type="text"
                    name="templateName"
                    value={formData.templateName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Course Name (Optional)
                </label>
                <input
                  type="text"
                  name="courseName"
                  value={formData.courseName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Layout Style
                </label>
                <select
                  name="layout"
                  value={formData.layout}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                  <option value="simple">Simple</option>
                </select>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-3">Design Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Background Color
                    </label>
                    <input
                      type="color"
                      name="design.backgroundColor"
                      value={formData.design.backgroundColor}
                      onChange={handleInputChange}
                      className="w-full h-10 p-1 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Family
                    </label>
                    <select
                      name="design.fontFamily"
                      value={formData.design.fontFamily}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Arial, sans-serif">Arial</option>
                      <option value="Helvetica, sans-serif">Helvetica</option>
                      <option value="Times New Roman, serif">Times New Roman</option>
                      <option value="Georgia, serif">Georgia</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Border Style
                </label>
                <input
                  type="text"
                  name="design.borderStyle"
                  value={formData.design.borderStyle}
                  onChange={handleInputChange}
                  placeholder="e.g., 2px solid #2563eb"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Logo URL (Optional)
                </label>
                <input
                  type="url"
                  name="design.logo"
                  value={formData.design.logo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Signature URL (Optional)
                </label>
                <input
                  type="url"
                  name="design.signature"
                  value={formData.design.signature}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
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
                  {loading ? 'Saving...' : editingTemplate ? 'Update Template' : 'Create Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateTemplates;