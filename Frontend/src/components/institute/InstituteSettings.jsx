import { useState } from 'react'

const InstituteSettings = () => {
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState({
    instituteName: 'University of Moratuwa',
    email: 'admin@uom.lk',
    phone: '+94 11 265 0561',
    address: 'Bandaranayake Mawatha, Moratuwa 10400',
    website: 'https://uom.lk',
    certificatePrefix: 'UOM',
    autoEmail: true,
    qrCodeEnabled: true
  })

  const handleSave = () => {
    // Simulate save operation
    console.log('Saving settings:', settings)
    alert('Settings saved successfully!')
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Institute Settings</h1>
        <p className="text-gray-600">Manage your institute's configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <nav className="space-y-2">
              {[
                { id: 'general', name: 'General Settings', icon: '⚙️' },
                { id: 'certificate', name: 'Certificate Settings', icon: '📜' },
                { id: 'email', name: 'Email Settings', icon: '📧' },
                { id: 'security', name: 'Security', icon: '🔒' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            {activeTab === 'general' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">General Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name</label>
                    <input
                      type="text"
                      value={settings.instituteName}
                      onChange={(e) => setSettings({ ...settings, instituteName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={settings.email}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                    <input
                      type="url"
                      value={settings.website}
                      onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      value={settings.address}
                      onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows="3"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'certificate' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Certificate Settings</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Prefix</label>
                    <input
                      type="text"
                      value={settings.certificatePrefix}
                      onChange={(e) => setSettings({ ...settings, certificatePrefix: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., UOM"
                    />
                    <p className="text-sm text-gray-500 mt-1">This will be used as prefix for all certificate codes</p>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.qrCodeEnabled}
                      onChange={(e) => setSettings({ ...settings, qrCodeEnabled: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Enable QR Codes on Certificates
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div>
                <h2 className="text-lg font-semibold mb-4">Email Settings</h2>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.autoEmail}
                      onChange={(e) => setSettings({ ...settings, autoEmail: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Automatically send certificates via email
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Template</label>
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      rows="6"
                      placeholder="Customize your email template..."
                      defaultValue="Dear {student_name},

Congratulations! Your certificate for {course_name} has been issued.

You can download your certificate from: {certificate_url}

Best regards,
{institute_name}"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InstituteSettings