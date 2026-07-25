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
  const [recentTemplate, setRecentTemplate] = useState(null);
  const [securityAnalytics, setSecurityAnalytics] = useState({ logs: [], suspiciousCount: 0 });
  const [shareManager, setShareManager] = useState(null);
  const [signingKey, setSigningKey] = useState(null);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplates();
    } else if (activeTab === 'certificates') {
      fetchCertificates();
    } else if (activeTab === 'security') {
      fetchSecurityAnalytics();
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

  const fetchSecurityAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [analyticsResponse, signingResponse] = await Promise.all([
        axios.get(`${API_URL}/certificates/security/analytics`, { headers }),
        axios.get(`${API_URL}/certificates/security/signing-key`, { headers })
      ]);
      if (analyticsResponse.data.success) setSecurityAnalytics(analyticsResponse.data.data);
      if (signingResponse.data.success) setSigningKey(signingResponse.data.data);
    } catch (error) {
      console.error('Error fetching security analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRotateSigningKey = async (compromised = false) => {
    const warning = compromised
      ? 'This marks the current key as compromised. Existing credentials signed by it will no longer be trusted.'
      : 'Existing credentials will remain trusted through the retired public key.';
    if (!window.confirm(`Rotate the institute signing key?\n\n${warning}`)) return;
    const confirmation = window.prompt('Type ROTATE to confirm:');
    if (confirmation !== 'ROTATE') return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/certificates/security/signing-key/rotate`,
        { confirmation, compromised },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message);
      fetchSecurityAnalytics();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to rotate signing key');
    }
  };

  const handleLifecycleAction = async (certificateId, action) => {
    const needsReason = ['suspend', 'revoke'].includes(action);
    const reason = needsReason
      ? window.prompt(`Reason to ${action} this credential:`)
      : 'Credential reinstated by institute';
    if (needsReason && !reason?.trim()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/certificates/${certificateId}/lifecycle`,
        { action, reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message);
      fetchCertificates();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update credential lifecycle');
    }
  };

  const handleCreateShare = async (certificateId) => {
    const hoursInput = window.prompt('How many hours should this link remain active?', '72');
    if (hoursInput === null) return;
    const viewsInput = window.prompt('Maximum number of views?', '25');
    if (viewsInput === null) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/certificates/${certificateId}/shares`,
        {
          label: 'Shared education credential',
          expiresInHours: Number(hoursInput),
          maxViews: Number(viewsInput),
          visibleFields: [
            'studentName', 'courseName', 'awardDate',
            'instituteName', 'certificateCode', 'status'
          ]
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const shareUrl = response.data.data.shareUrl;
      let copied = false;
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch (clipboardError) {
        console.warn('Share link clipboard copy failed:', clipboardError);
      }
      alert(
        `Controlled share link created and emailed to ${response.data.data.emailRecipient}.` +
        `${copied ? '\nThe link was also copied to your clipboard.' : `\n\n${shareUrl}`}`
      );
    } catch (error) {
      console.error('Create share error:', error);
      alert(error.response?.data?.message || 'Failed to create share link');
    }
  };

  const openShareManager = async (certificateId) => {
    setShareManager({ certificateId, shares: [], loading: true });
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/certificates/${certificateId}/shares`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShareManager({ certificateId, shares: response.data.data, loading: false });
    } catch (error) {
      setShareManager(null);
      alert(error.response?.data?.message || 'Failed to load share links');
    }
  };

  const revokeShare = async (shareId) => {
    if (!shareManager || !window.confirm('Revoke this share link now?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API_URL}/certificates/${shareManager.certificateId}/shares/${shareId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setShareManager((current) => ({
        ...current,
        shares: current.shares.map((share) =>
          share._id === shareId ? { ...share, revokedAt: new Date().toISOString() } : share
        )
      }));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to revoke share link');
    }
  };

  const copyTemplateId = async (templateId) => {
    try {
      await navigator.clipboard.writeText(templateId);
      alert('Template ID copied');
    } catch (error) {
      console.error('Error copying template ID:', error);
      alert(`Template ID: ${templateId}`);
    }
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

  const handleRegenerate = async (certificateId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/certificates/${certificateId}/regenerate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(response.data.message);
      fetchCertificates();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to sign and regenerate certificate');
    }
  };

  const tabs = [
    { id: 'templates', name: 'Templates', icon: '🖼️' },
    { id: 'create-template', name: 'Create Template', icon: '➕' },
    { id: 'issue', name: 'Issue Certificate', icon: '📜' },
    { id: 'certificates', name: 'Certificates', icon: '📁' }
  ];

  const tabsWithSecurity = [
    ...tabs,
    { id: 'security', name: 'Security', icon: '🔐' }
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
          {tabsWithSecurity.map(tab => (
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
          {recentTemplate && (
            <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-green-900">Template created successfully</p>
                  <p className="mt-1 text-sm text-green-800">
                    Bulk upload TemplateId:
                    <span className="ml-2 font-mono break-all">{recentTemplate._id}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => copyTemplateId(recentTemplate._id)}
                  className="self-start rounded-lg border border-green-300 px-3 py-2 text-sm font-medium text-green-800 hover:bg-green-100 sm:self-auto"
                >
                  Copy ID
                </button>
              </div>
            </div>
          )}
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
                    <div className="mt-3 rounded-lg bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Bulk upload TemplateId</p>
                      <div className="mt-1 flex items-start justify-between gap-2">
                        <p className="font-mono text-xs text-gray-800 break-all">{template._id}</p>
                        <button
                          type="button"
                          onClick={() => copyTemplateId(template._id)}
                          className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 hover:bg-white"
                        >
                          Copy
                        </button>
                      </div>
                    </div>
                    
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
          onTemplateCreated={(template) => {
            setRecentTemplate(template);
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
                            onClick={() => handleLifecycleAction(cert._id, 'suspend')}
                            className="px-3 py-1 bg-amber-100 text-amber-700 rounded-lg text-sm hover:bg-amber-200"
                          >
                            Suspend
                          </button>
                        )}
                        {cert.status === 'suspended' && (
                          <button
                            onClick={() => handleLifecycleAction(cert._id, 'reinstate')}
                            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
                          >
                            Reinstate
                          </button>
                        )}
                        {['issued', 'suspended'].includes(cert.status) && (
                          <button
                            onClick={() => handleLifecycleAction(cert._id, 'revoke')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200"
                          >
                            Revoke
                          </button>
                        )}
                        {cert.status !== 'draft' && (
                          <button
                            onClick={() => handleCreateShare(cert._id)}
                            className="px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200"
                          >
                            Create Share Link
                          </button>
                        )}
                        {cert.status !== 'draft' && (
                          <button
                            onClick={() => openShareManager(cert._id)}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                          >
                            Manage Shares
                          </button>
                        )}
                        <button
                          onClick={() => handleRegenerate(cert._id)}
                          className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-lg text-sm hover:bg-cyan-200"
                        >
                          {cert.credential?.signature ? 'Regenerate Certificate' : 'Sign Legacy Certificate'}
                        </button>
                      </div>

                      {cert.credential?.signature && (
                        <p className="mt-2 text-xs text-green-700">
                          Digitally signed · {cert.credential.algorithm}
                        </p>
                      )}

                      {cert.lifecycleEvents?.length > 0 && (
                        <details className="mt-3 text-sm">
                          <summary className="cursor-pointer font-medium text-gray-600">
                            Lifecycle history ({cert.lifecycleEvents.length})
                          </summary>
                          <div className="mt-2 space-y-2 border-l-2 border-gray-200 pl-3">
                            {[...cert.lifecycleEvents].reverse().map((event, index) => (
                              <div key={`${event.createdAt}-${index}`}>
                                <p className="font-medium capitalize">{event.action}</p>
                                <p className="text-xs text-gray-500">
                                  {event.createdAt ? new Date(event.createdAt).toLocaleString() : 'Date unavailable'}
                                  {event.reason ? ` — ${event.reason}` : ''}
                                </p>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                      
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

      {activeTab === 'security' && (
        <div>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Verification Security</h2>
              <p className="mt-1 text-sm text-gray-500">
                Privacy-preserving verification activity and rule-based risk indicators.
              </p>
            </div>
            <div className="rounded-lg bg-red-50 px-4 py-2 text-center">
              <p className="text-2xl font-bold text-red-700">{securityAnalytics.suspiciousCount}</p>
              <p className="text-xs text-red-600">High-risk checks</p>
            </div>
          </div>
          {signingKey && (
            <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                  <p className="font-semibold text-blue-900">Institute signing key</p>
                  <p className="mt-1 break-all font-mono text-xs text-blue-700">
                    {signingKey.initialized === false ? 'Not initialized yet' : signingKey.keyId}
                  </p>
                  <p className="mt-1 text-xs text-blue-700">
                    {signingKey.initialized === false
                      ? 'The key is initialized automatically during first issuance.'
                      : `${signingKey.algorithm} · ${signingKey.previousKeys?.length || 0} previous keys`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleRotateSigningKey(false)}
                    className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    {signingKey.initialized === false ? 'Initialize key' : 'Routine rotation'}
                  </button>
                  {signingKey.initialized !== false && (
                  <button
                    type="button"
                    onClick={() => handleRotateSigningKey(true)}
                    className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
                  >
                    Key compromised
                  </button>
                  )}
                </div>
              </div>
            </div>
          )}
          {loading ? (
            <p className="py-8 text-center text-gray-500">Loading security activity…</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Time', 'Certificate', 'Outcome', 'Method', 'Risk', 'Reasons'].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left font-medium text-gray-600">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {securityAnalytics.logs.map((log) => (
                    <tr key={log._id}>
                      <td className="whitespace-nowrap px-4 py-3">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.certificateCode || 'Unknown'}</td>
                      <td className="px-4 py-3 capitalize">{log.outcome}</td>
                      <td className="px-4 py-3 capitalize">{log.verificationMethod}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                          log.riskScore >= 60 ? 'bg-red-100 text-red-700' :
                          log.riskScore >= 30 ? 'bg-amber-100 text-amber-700' :
                          'bg-green-100 text-green-700'
                        }`}>{log.riskScore}</span>
                      </td>
                      <td className="max-w-sm px-4 py-3 text-xs text-gray-600">
                        {log.riskReasons?.join('; ') || 'No risk rules triggered'}
                      </td>
                    </tr>
                  ))}
                  {securityAnalytics.logs.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                        No verification activity yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {shareManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Controlled share links</h3>
              <button
                type="button"
                onClick={() => setShareManager(null)}
                className="rounded px-3 py-1 text-gray-500 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
            {shareManager.loading ? (
              <p className="py-8 text-center text-gray-500">Loading share links…</p>
            ) : (
              <div className="mt-4 space-y-3">
                {shareManager.shares.map((share) => {
                  const inactive = share.revokedAt || new Date(share.expiresAt) <= new Date() ||
                    share.viewCount >= share.maxViews;
                  return (
                    <div key={share._id} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{share.label}</p>
                          <p className="mt-1 text-xs text-gray-500">
                            {share.viewCount}/{share.maxViews} views · expires {new Date(share.expiresAt).toLocaleString()}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            Fields: {share.visibleFields.join(', ')}
                          </p>
                        </div>
                        {inactive ? (
                          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">Inactive</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => revokeShare(share._id)}
                            className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200"
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {shareManager.shares.length === 0 && (
                  <p className="py-8 text-center text-gray-500">No share links created for this credential.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Field Editor Modal */}
      <FieldEditorModal />
    </div>
  );
};

export default CertificateManagement;
