import { notify } from '../../../services/notifications.js';
import { useState, useEffect } from 'react';
import apiClient from '../../../services/api.jsx';
export default function useCertificateManagement({ API_URL }) {
  const [activeTab, setActiveTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [recentTemplate, setRecentTemplate] = useState(null);
  const [securityAnalytics, setSecurityAnalytics] = useState({
    logs: [],
    suspiciousCount: 0
  });
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
      const response = await apiClient.get(`${API_URL}/certificate-templates`, {
        headers: {}
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
      const response = await apiClient.get(`${API_URL}/certificates`, {
        headers: {}
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
    if (!window.confirm('Are you sure you want to delete this template?'))
      return;
    try {
      const response = await apiClient.delete(
        `${API_URL}/certificate-templates/${templateId}`,
        {
          headers: {}
        }
      );
      if (response.data.success) {
        notify('Template deleted successfully');
        fetchTemplates();
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      notify(error.response?.data?.message || 'Failed to delete template');
    }
  };
  const handleEditFields = (template) => {
    setSelectedTemplate(template);
    setShowFieldEditor(true);
  };
  const fetchSecurityAnalytics = async () => {
    setLoading(true);
    try {
      const headers = {};
      const [analyticsResponse, signingResponse] = await Promise.all([
        apiClient.get(`${API_URL}/certificates/security/analytics`, {
          headers
        }),
        apiClient.get(`${API_URL}/certificates/security/signing-key`, {
          headers
        })
      ]);
      if (analyticsResponse.data.success)
        setSecurityAnalytics(analyticsResponse.data.data);
      if (signingResponse.data.success)
        setSigningKey(signingResponse.data.data);
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
    if (!window.confirm(`Rotate the institute signing key?\n\n${warning}`))
      return;
    const confirmation = window.prompt('Type ROTATE to confirm:');
    if (confirmation !== 'ROTATE') return;
    try {
      const response = await apiClient.post(
        `${API_URL}/certificates/security/signing-key/rotate`,
        {
          confirmation,
          compromised
        },
        {
          headers: {}
        }
      );
      notify(response.data.message);
      fetchSecurityAnalytics();
    } catch (error) {
      notify(error.response?.data?.message || 'Failed to rotate signing key');
    }
  };
  const handleLifecycleAction = async (certificateId, action) => {
    const needsReason = ['suspend', 'revoke'].includes(action);
    const reason = needsReason
      ? window.prompt(`Reason to ${action} this credential:`)
      : 'Credential reinstated by institute';
    if (needsReason && !reason?.trim()) return;
    try {
      const response = await apiClient.post(
        `${API_URL}/certificates/${certificateId}/lifecycle`,
        {
          action,
          reason
        },
        {
          headers: {}
        }
      );
      notify(response.data.message);
      fetchCertificates();
    } catch (error) {
      notify(
        error.response?.data?.message || 'Failed to update credential lifecycle'
      );
    }
  };
  const handleCreateShare = async (certificateId) => {
    const hoursInput = window.prompt(
      'How many hours should this link remain active?',
      '72'
    );
    if (hoursInput === null) return;
    const viewsInput = window.prompt('Maximum number of views?', '25');
    if (viewsInput === null) return;
    try {
      const response = await apiClient.post(
        `${API_URL}/certificates/${certificateId}/shares`,
        {
          label: 'Shared education credential',
          expiresInHours: Number(hoursInput),
          maxViews: Number(viewsInput),
          visibleFields: [
            'studentName',
            'courseName',
            'awardDate',
            'instituteName',
            'certificateCode',
            'status'
          ]
        },
        {
          headers: {}
        }
      );
      const shareUrl = response.data.data.shareUrl;
      let copied = false;
      try {
        await navigator.clipboard.writeText(shareUrl);
        copied = true;
      } catch (clipboardError) {
        console.warn('Share link clipboard copy failed:', clipboardError);
      }
      notify(
        `Controlled share link created and emailed to ${response.data.data.emailRecipient}.` +
          `${copied ? '\nThe link was also copied to your clipboard.' : `\n\n${shareUrl}`}`
      );
    } catch (error) {
      console.error('Create share error:', error);
      notify(error.response?.data?.message || 'Failed to create share link');
    }
  };
  const openShareManager = async (certificateId) => {
    setShareManager({
      certificateId,
      shares: [],
      loading: true
    });
    try {
      const response = await apiClient.get(
        `${API_URL}/certificates/${certificateId}/shares`,
        {
          headers: {}
        }
      );
      setShareManager({
        certificateId,
        shares: response.data.data,
        loading: false
      });
    } catch (error) {
      setShareManager(null);
      notify(error.response?.data?.message || 'Failed to load share links');
    }
  };
  const revokeShare = async (shareId) => {
    if (!shareManager || !window.confirm('Revoke this share link now?')) return;
    try {
      await apiClient.delete(
        `${API_URL}/certificates/${shareManager.certificateId}/shares/${shareId}`,
        {
          headers: {}
        }
      );
      setShareManager((current) => ({
        ...current,
        shares: current.shares.map((share) =>
          share._id === shareId
            ? {
                ...share,
                revokedAt: new Date().toISOString()
              }
            : share
        )
      }));
    } catch (error) {
      notify(error.response?.data?.message || 'Failed to revoke share link');
    }
  };
  const copyTemplateId = async (templateId) => {
    try {
      await navigator.clipboard.writeText(templateId);
      notify('Template ID copied');
    } catch (error) {
      console.error('Error copying template ID:', error);
      notify(`Template ID: ${templateId}`);
    }
  };
  const handleUpdateStatus = async (certificateId, status) => {
    try {
      const response = await apiClient.put(
        `${API_URL}/certificates/${certificateId}/status`,
        {
          status
        },
        {
          headers: {}
        }
      );
      if (response.data.success) {
        notify(`Certificate ${status} successfully`);
        fetchCertificates();
      }
    } catch (error) {
      console.error('Error updating certificate:', error);
      notify(error.response?.data?.message || 'Failed to update certificate');
    }
  };
  const handleSendEmail = async (certificateId) => {
    try {
      const response = await apiClient.post(
        `${API_URL}/certificates/${certificateId}/send-email`,
        {},
        {
          headers: {}
        }
      );
      if (response.data.success) {
        notify('Email sent successfully');
        fetchCertificates();
      }
    } catch (error) {
      console.error('Error sending email:', error);
      notify(error.response?.data?.message || 'Failed to send email');
    }
  };
  const handleRegenerate = async (certificateId) => {
    try {
      const response = await apiClient.post(
        `${API_URL}/certificates/${certificateId}/regenerate`,
        {},
        {
          headers: {}
        }
      );
      notify(response.data.message);
      fetchCertificates();
    } catch (error) {
      notify(
        error.response?.data?.message ||
          'Failed to sign and regenerate certificate'
      );
    }
  };
  const tabs = [
    {
      id: 'templates',
      name: 'Templates',
      icon: '🖼️'
    },
    {
      id: 'create-template',
      name: 'Create Template',
      icon: '➕'
    },
    {
      id: 'issue',
      name: 'Issue Certificate',
      icon: '📜'
    },
    {
      id: 'certificates',
      name: 'Certificates',
      icon: '📁'
    }
  ];
  const tabsWithSecurity = [
    ...tabs,
    {
      id: 'security',
      name: 'Security',
      icon: '🔐'
    }
  ];

  // Field Editor Modal

  return {
    tabsWithSecurity,
    setActiveTab,
    activeTab,
    recentTemplate,
    copyTemplateId,
    loading,
    templates,
    handleEditFields,
    handleDeleteTemplate,
    API_URL,
    setRecentTemplate,
    fetchTemplates,
    fetchCertificates,
    certificates,
    handleUpdateStatus,
    handleSendEmail,
    handleLifecycleAction,
    handleCreateShare,
    openShareManager,
    handleRegenerate,
    securityAnalytics,
    signingKey,
    handleRotateSigningKey,
    shareManager,
    setShareManager,
    revokeShare,
    showFieldEditor,
    selectedTemplate,
    setShowFieldEditor,
    setSelectedTemplate
  };
}
