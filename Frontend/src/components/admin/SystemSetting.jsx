import { useState, useEffect } from 'react';
import axios from 'axios';

const SystemSettings = ({ API_URL }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null); // Keep original for comparison

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);

    try {
      const response = await axios.get(`${API_URL}/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSettings(response.data.data);
        setOriginalSettings(JSON.parse(JSON.stringify(response.data.data))); // Deep copy
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    const token = localStorage.getItem('token');
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Prepare settings for saving
      const settingsToSave = JSON.parse(JSON.stringify(settings));
      
      // Handle password field
      if (settingsToSave.email && originalSettings.email) {
        // If password hasn't changed, don't send it (keep '********')
        if (settingsToSave.email.smtpPassword === originalSettings.email.smtpPassword) {
          settingsToSave.email.smtpPassword = '********';
        }
      }

      console.log('Saving settings:', settingsToSave); // Debug log

      const response = await axios.put(
        `${API_URL}/admin/settings`,
        settingsToSave,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (response.data.success) {
        showMessage('success', 'Settings saved successfully!');
        setSettings(response.data.data);
        setOriginalSettings(JSON.parse(JSON.stringify(response.data.data)));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('error', error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 5000);
  };

  const handleSettingChange = (category, field, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
  };

  const handleResetToDefault = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      setSettings({
        general: {
          systemName: 'Certificate Verification System',
          supportEmail: 'support@certverify.com',
          companyName: 'Your Company Name',
          timezone: 'UTC+5:30',
          dateFormat: 'DD/MM/YYYY'
        },
        security: {
          twoFactorAuth: false,
          sessionTimeout: 30,
          maxLoginAttempts: 5,
          passwordExpiry: 90,
          requireEmailVerification: true,
          requirePhoneVerification: true
        },
        email: {
          smtpServer: 'smtp.gmail.com',
          smtpPort: 587,
          smtpUsername: '',
          smtpPassword: '',
          fromEmail: '',
          fromName: 'Certificate System'
        },
        verification: {
          otpExpiry: 5,
          maxOtpAttempts: 3,
          allowResendOtp: true,
          resendCooldown: 60
        },
        certificate: {
          defaultValidity: 365,
          allowRevocation: true,
          requireApproval: true,
          maxFileSize: 5,
          allowedFormats: ['PDF', 'PNG', 'JPEG']
        }
      });
      showMessage('success', 'Settings reset to default. Click Save to apply.');
    }
  };

  const handleExportSettings = () => {
    const exportSettings = { ...settings };
    if (exportSettings.email) {
      exportSettings.email.smtpPassword = ''; // Remove password for export
    }
    
    const dataStr = JSON.stringify(exportSettings, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `system-settings-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const handleImportSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target.result);
        setSettings(importedSettings);
        showMessage('success', 'Settings imported successfully! Click Save to apply.');
      } catch (error) {
        showMessage('error', 'Invalid settings file');
      }
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'email', name: 'Email', icon: '📧' },
    { id: 'verification', name: 'Verification', icon: '✅' },
    { id: 'certificate', name: 'Certificate', icon: '📜' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900">System Settings</h2>
        <p className="text-sm text-gray-600 mt-1">Configure system parameters and preferences</p>
      </div>

      {message.text && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Settings Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-4 px-6 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Name
                </label>
                <input
                  type="text"
                  value={settings.general?.systemName || ''}
                  onChange={(e) => handleSettingChange('general', 'systemName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Support Email
                </label>
                <input
                  type="email"
                  value={settings.general?.supportEmail || ''}
                  onChange={(e) => handleSettingChange('general', 'supportEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={settings.general?.companyName || ''}
                  onChange={(e) => handleSettingChange('general', 'companyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Timezone
                  </label>
                  <select
                    value={settings.general?.timezone || 'UTC+5:30'}
                    onChange={(e) => handleSettingChange('general', 'timezone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="UTC+5:30">UTC+5:30 (India)</option>
                    <option value="UTC+0">UTC+0 (London)</option>
                    <option value="UTC-5">UTC-5 (New York)</option>
                    <option value="UTC+8">UTC+8 (Singapore)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date Format
                  </label>
                  <select
                    value={settings.general?.dateFormat || 'DD/MM/YYYY'}
                    onChange={(e) => handleSettingChange('general', 'dateFormat', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">Two-Factor Authentication</p>
                  <p className="text-sm text-gray-500">Require 2FA for super admin accounts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.security?.twoFactorAuth || false}
                    onChange={(e) => handleSettingChange('security', 'twoFactorAuth', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={settings.security?.sessionTimeout || 30}
                  onChange={(e) => handleSettingChange('security', 'sessionTimeout', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={settings.security?.maxLoginAttempts || 5}
                  onChange={(e) => handleSettingChange('security', 'maxLoginAttempts', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password Expiry (days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="365"
                  value={settings.security?.passwordExpiry || 90}
                  onChange={(e) => handleSettingChange('security', 'passwordExpiry', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Email Settings */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Email Configuration</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Server
                </label>
                <input
                  type="text"
                  value={settings.email?.smtpServer || ''}
                  onChange={(e) => handleSettingChange('email', 'smtpServer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="smtp.gmail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.email?.smtpPort || 587}
                  onChange={(e) => handleSettingChange('email', 'smtpPort', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Username
                </label>
                <input
                  type="text"
                  value={settings.email?.smtpUsername || ''}
                  onChange={(e) => handleSettingChange('email', 'smtpUsername', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Password
                </label>
                <input
                  type="password"
                  value={settings.email?.smtpPassword === '********' ? '' : settings.email?.smtpPassword || ''}
                  onChange={(e) => handleSettingChange('email', 'smtpPassword', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter new password to change"
                />
                <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Email
                </label>
                <input
                  type="email"
                  value={settings.email?.fromEmail || ''}
                  onChange={(e) => handleSettingChange('email', 'fromEmail', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Name
                </label>
                <input
                  type="text"
                  value={settings.email?.fromName || ''}
                  onChange={(e) => handleSettingChange('email', 'fromName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Verification Settings */}
          {activeTab === 'verification' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Verification Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OTP Expiry (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.verification?.otpExpiry || 5}
                  onChange={(e) => handleSettingChange('verification', 'otpExpiry', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max OTP Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.verification?.maxOtpAttempts || 3}
                  onChange={(e) => handleSettingChange('verification', 'maxOtpAttempts', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resend Cooldown (seconds)
                </label>
                <input
                  type="number"
                  min="30"
                  max="300"
                  value={settings.verification?.resendCooldown || 60}
                  onChange={(e) => handleSettingChange('verification', 'resendCooldown', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">Allow Resend OTP</p>
                  <p className="text-sm text-gray-500">Allow users to request new OTP</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.verification?.allowResendOtp !== false}
                    onChange={(e) => handleSettingChange('verification', 'allowResendOtp', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* Certificate Settings */}
          {activeTab === 'certificate' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Certificate Settings</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Validity (days)
                </label>
                <input
                  type="number"
                  min="30"
                  max="3650"
                  value={settings.certificate?.defaultValidity || 365}
                  onChange={(e) => handleSettingChange('certificate', 'defaultValidity', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max File Size (MB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.certificate?.maxFileSize || 5}
                  onChange={(e) => handleSettingChange('certificate', 'maxFileSize', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allowed Formats
                </label>
                <div className="space-y-2">
                  {['PDF', 'PNG', 'JPEG', 'JPG'].map(format => (
                    <div key={format} className="flex items-center">
                      <input
                        type="checkbox"
                        id={`format-${format}`}
                        checked={settings.certificate?.allowedFormats?.includes(format) || false}
                        onChange={(e) => {
                          const current = settings.certificate?.allowedFormats || [];
                          const newFormats = e.target.checked
                            ? [...current, format]
                            : current.filter(f => f !== format);
                          handleSettingChange('certificate', 'allowedFormats', newFormats);
                        }}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`format-${format}`} className="ml-2 text-sm text-gray-700">
                        {format}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">Allow Revocation</p>
                  <p className="text-sm text-gray-500">Allow institutes to revoke certificates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.certificate?.allowRevocation !== false}
                    onChange={(e) => handleSettingChange('certificate', 'allowRevocation', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-700">Require Approval</p>
                  <p className="text-sm text-gray-500">Require admin approval for certificates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.certificate?.requireApproval !== false}
                    onChange={(e) => handleSettingChange('certificate', 'requireApproval', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between">
            <div className="flex space-x-3">
              <button
                onClick={handleResetToDefault}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
              >
                Reset to Default
              </button>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportSettings}
                  className="hidden"
                  id="import-settings"
                />
                <label
                  htmlFor="import-settings"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 cursor-pointer inline-block"
                >
                  Import Settings
                </label>
              </div>
              <button
                onClick={handleExportSettings}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200"
              >
                Export Settings
              </button>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;