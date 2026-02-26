import React, { useState, useEffect } from 'react';
import axios from 'axios';
import CertificateTemplateCreator from './CertificateTemplateCreator';
import IssueCertificate from './IssueCertificate';

const CertificateManagement = ({ API_URL }) => {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    } else if (activeTab === 'certificates') {
      fetchCertificates();
    }
  }, [activeTab]);

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

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/certificates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setCertificates(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
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
      alert(error.response?.data?.message || 'Failed to delete template');
    }
  };

  const handleEditFields = (template) => {
    setSelectedTemplate(template);
    setShowFieldEditor(true);
  };

  const handleUpdateStatus = async (certificateId, status) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/certificates/${certificateId}/status`, 
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(`Certificate ${status} successfully`);
        fetchCertificates();
      }
    } catch (error) {
      console.error('Error updating certificate:', error);
      alert(error.response?.data?.message || 'Failed to update certificate');
    }
  };

  const handleSendEmail = async (certificateId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/certificates/${certificateId}/send-email`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Email sent successfully');
        fetchCertificates();
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert(error.response?.data?.message || 'Failed to send email');
    }
  };

  const tabs = [
    { id: 'templates', name: 'Templates', icon: '🖼️' },
    { id: 'create-template', name: 'Create Template', icon: '➕' },
    { id: 'issue', name: 'Issue Certificate', icon: '📜' },
    { id: 'certificates', name: 'Certificates', icon: '📁' }
  ];

  // Field Editor Modal
  const FieldEditorModal = () => {
    if (!showFieldEditor || !selectedTemplate) return null;

    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-lg bg-white">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Edit Template Fields - {selectedTemplate.templateName}</h3>
            <button
              onClick={() => {
                setShowFieldEditor(false);
                setSelectedTemplate(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="mb-4">
            <img 
              src={selectedTemplate.templateImageUrl} 
              alt={selectedTemplate.templateName}
              className="w-full max-h-96 object-contain border rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Current Fields</h4>
              {selectedTemplate.fields?.map((field, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg mb-2">
                  <p className="font-medium">{field.fieldName}</p>
                  <p className="text-sm">Position: ({field.x}, {field.y})</p>
                  <p className="text-sm">Font Size: {field.fontSize}px</p>
                </div>
              ))}
            </div>
            <div>
              <h4 className="font-medium mb-2">QR Code Position</h4>
              {selectedTemplate.qrCodePosition && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p>X: {selectedTemplate.qrCodePosition.x}</p>
                  <p>Y: {selectedTemplate.qrCodePosition.y}</p>
                  <p>Size: {selectedTemplate.qrCodePosition.size}px</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => {
                setShowFieldEditor(false);
                setSelectedTemplate(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Templates List */}
      {activeTab === 'templates' && (
        <div>
          <h2 className="text-xl font-bold mb-4">Certificate Templates</h2>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(template => (
                <div key={template._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="h-48 bg-gray-100">
                    <img 
                      src={template.templateImageUrl} 
                      alt={template.templateName}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold">{template.templateName}</h3>
                    <p className="text-sm text-gray-500">
                      Course: {template.courseId?.courseName || 'Not assigned'}
                    </p>
                    
                    <div className="mt-2">
                      <p className="text-xs text-gray-400">
                        Fields: {template.fields?.length || 0} placed
                      </p>
                      {template.fields && template.fields.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {template.fields.map((field, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                              {field.fieldName}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex justify-between">
                      <button
                        onClick={() => handleEditFields(template)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template._id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <p className="text-gray-500 col-span-3 text-center py-8">
                  No templates created yet. Click on "Create Template" to add one.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Create Template */}
      {activeTab === 'create-template' && (
        <CertificateTemplateCreator 
          API_URL={API_URL}
          onTemplateCreated={() => {
            setActiveTab('templates');
            fetchTemplates();
          }}
        />
      )}

      {/* Issue Certificate */}
      {activeTab === 'issue' && (
        <IssueCertificate 
          API_URL={API_URL}
          onCertificateIssued={() => {
            setActiveTab('certificates');
            fetchCertificates();
          }}
        />
      )}

      {/* Certificates List */}
      {activeTab === 'certificates' && (
        <div>
          <h2 className="text-xl font-bold mb-4">Issued Certificates</h2>
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {certificates.map(cert => (
                <div key={cert._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-start space-x-4">
                    <div className="w-32 h-32 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                      {cert.generatedCertificateUrl ? (
                        <img 
                          src={cert.generatedCertificateUrl} 
                          alt="Certificate"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-semibold">{cert.studentName}</h3>
                          <p className="text-sm text-gray-600">{cert.courseName}</p>
                          <p className="text-xs font-mono text-gray-500 mt-1">
                            {cert.certificateCode}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Award Date: {new Date(cert.awardDate).toLocaleDateString()}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          cert.status === 'issued' 
                            ? 'bg-green-100 text-green-800'
                            : cert.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {cert.status}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex flex-wrap gap-2">
                        {cert.generatedCertificateUrl && (
                          <a
                            href={cert.generatedCertificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                          >
                            View Certificate
                          </a>
                        )}
                        {cert.status === 'draft' && (
                          <button
                            onClick={() => handleUpdateStatus(cert._id, 'issued')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                          >
                            Issue Certificate
                          </button>
                        )}
                        {cert.status === 'issued' && !cert.emailSent && (
                          <button
                            onClick={() => handleSendEmail(cert._id)}
                            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
                          >
                            Send Email
                          </button>
                        )}
                        {cert.status === 'issued' && (
                          <button
                            onClick={() => handleUpdateStatus(cert._id, 'revoked')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                      
                      {cert.emailSent && (
                        <p className="text-xs text-green-600 mt-2">
                          ✓ Email sent on {new Date(cert.emailSentAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {certificates.length === 0 && (
                <p className="text-gray-500 text-center py-8">
                  No certificates issued yet. Go to "Issue Certificate" to create one.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Field Editor Modal */}
      <FieldEditorModal />
    </div>
  );
};

export default CertificateManagement;