import { useEffect, useState } from 'react';
import axios from 'axios';

const getUploadUrl = (API_URL, filePath) => {
  if (!filePath) return '';
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  if (/^https?:\/\//i.test(API_URL)) {
    return `${API_URL.replace(/\/api\/?$/, '')}${normalizedPath}`;
  }

  return normalizedPath;
};

const InstituteSettings = ({ API_URL, user, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    instituteName: user?.instituteName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: user?.address || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(getUploadUrl(API_URL, user?.logo));
  const [activeSection, setActiveSection] = useState('profile');

  useEffect(() => {
    setFormData((current) => ({
      ...current,
      instituteName: user?.instituteName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      address: user?.address || ''
    }));
    setLogoPreview(getUploadUrl(API_URL, user?.logo));
    setLogoFile(null);
  }, [API_URL, user]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/institute/settings`, {
        instituteName: formData.instituteName,
        phone: formData.phone,
        address: formData.address
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Profile updated successfully');
        const userData = JSON.parse(localStorage.getItem('user')) || {};
        userData.instituteName = response.data.data.instituteName;
        userData.phone = response.data.data.phone;
        userData.address = response.data.data.address;
        userData.logo = response.data.data.logo;
        localStorage.setItem('user', JSON.stringify(userData));
        onUserUpdate?.(userData);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.response?.data?.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please choose an image file');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) {
      alert('Please choose a logo first');
      return;
    }

    setUploadingLogo(true);

    try {
      const token = localStorage.getItem('token');
      const uploadData = new FormData();
      uploadData.append('logo', logoFile);

      const response = await axios.post(`${API_URL}/institute/logo`, uploadData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        const updatedUser = {
          ...(JSON.parse(localStorage.getItem('user')) || {}),
          ...response.data.data
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setLogoFile(null);
        setLogoPreview(getUploadUrl(API_URL, response.data.data.logo));
        onUserUpdate?.(updatedUser);
        alert('Logo uploaded successfully');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert(error.response?.data?.message || 'Error uploading logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }

    if (
      formData.newPassword.length < 10 ||
      formData.newPassword.length > 128 ||
      !/[a-z]/.test(formData.newPassword) ||
      !/[A-Z]/.test(formData.newPassword) ||
      !/\d/.test(formData.newPassword)
    ) {
      alert('Password must be 10-128 characters and include uppercase, lowercase, and a number.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.put(`${API_URL}/institute/change-password`, {
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        alert('Password changed successfully');
        setFormData({
          ...formData,
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert(error.response?.data?.message || 'Error changing password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Institute Settings</h2>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Settings Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveSection('profile')}
              className={`px-6 py-3 text-sm font-medium ${
                activeSection === 'profile'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile Settings
            </button>
            <button
              onClick={() => setActiveSection('security')}
              className={`px-6 py-3 text-sm font-medium ${
                activeSection === 'security'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Security
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeSection === 'profile' && (
            <form onSubmit={handleProfileUpdate}>
              <div className="mb-6 flex flex-col gap-4 border-b border-gray-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt={`${formData.instituteName || 'Institute'} logo`}
                        className="h-full w-full object-contain p-2"
                      />
                    ) : (
                      <span className="text-lg font-bold text-blue-600">
                        {(formData.instituteName || 'Institute').slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Institute Logo</h3>
                    <p className="text-sm text-gray-500">Shown on dashboards and certificate emails.</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 sm:w-auto"
                  />
                  <button
                    type="button"
                    onClick={handleLogoUpload}
                    disabled={uploadingLogo || !logoFile}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Institute Name
                  </label>
                  <input
                    type="text"
                    name="instituteName"
                    value={formData.instituteName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {activeSection === 'security' && (
            <form onSubmit={handlePasswordChange}>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    required
                    minLength="10"
                    maxLength="128"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    minLength="10"
                    maxLength="128"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstituteSettings;
