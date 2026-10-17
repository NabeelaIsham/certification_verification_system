import FieldEditorModal from './certificateManagement/FieldEditorModal';
import TemplateList from './certificateManagement/TemplateList';
import IssuedCertificates from './certificateManagement/IssuedCertificates';
import CertificateSecurity from './certificateManagement/CertificateSecurity';
import CertificateTemplateCreator from './CertificateTemplateCreator';
import IssueCertificate from './IssueCertificate';
import useCertificateManagement from './certificateManagement/useCertificateManagement';
export default function CertificateManagement(props) {
  const {
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
  } = useCertificateManagement(props);
  return <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabsWithSecurity.map(tab => <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>)}
        </nav>
      </div>

      {/* Templates List */}
      {activeTab === 'templates' && <TemplateList recentTemplate={recentTemplate} copyTemplateId={copyTemplateId} loading={loading} templates={templates} handleEditFields={handleEditFields} handleDeleteTemplate={handleDeleteTemplate} />}

      {/* Create Template */}
      {activeTab === 'create-template' && <CertificateTemplateCreator API_URL={API_URL} onTemplateCreated={template => {
      setRecentTemplate(template);
      setActiveTab('templates');
      fetchTemplates();
    }} />}

      {/* Issue Certificate */}
      {activeTab === 'issue' && <IssueCertificate API_URL={API_URL} onCertificateIssued={() => {
      setActiveTab('certificates');
      fetchCertificates();
    }} />}

      {/* Certificates List */}
      {activeTab === 'certificates' && <IssuedCertificates loading={loading} certificates={certificates} handleUpdateStatus={handleUpdateStatus} handleSendEmail={handleSendEmail} handleLifecycleAction={handleLifecycleAction} handleCreateShare={handleCreateShare} openShareManager={openShareManager} handleRegenerate={handleRegenerate} />}

      {activeTab === 'security' && <CertificateSecurity securityAnalytics={securityAnalytics} signingKey={signingKey} handleRotateSigningKey={handleRotateSigningKey} loading={loading} />}

      {shareManager && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Controlled share links</h3>
              <button type="button" onClick={() => setShareManager(null)} className="rounded px-3 py-1 text-gray-500 hover:bg-gray-100">
                Close
              </button>
            </div>
            {shareManager.loading ? <p className="py-8 text-center text-gray-500">Loading share links…</p> : <div className="mt-4 space-y-3">
                {shareManager.shares.map(share => {
            const inactive = share.revokedAt || new Date(share.expiresAt) <= new Date() || share.viewCount >= share.maxViews;
            return <div key={share._id} className="rounded-lg border border-gray-200 p-4">
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
                        {inactive ? <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">Inactive</span> : <button type="button" onClick={() => revokeShare(share._id)} className="rounded bg-red-100 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-200">
                            Revoke
                          </button>}
                      </div>
                    </div>;
          })}
                {shareManager.shares.length === 0 && <p className="py-8 text-center text-gray-500">No share links created for this credential.</p>}
              </div>}
          </div>
        </div>}

      {/* Field Editor Modal */}
      <FieldEditorModal showFieldEditor={showFieldEditor} selectedTemplate={selectedTemplate} setShowFieldEditor={setShowFieldEditor} setSelectedTemplate={setSelectedTemplate} />
    </div>;
}
