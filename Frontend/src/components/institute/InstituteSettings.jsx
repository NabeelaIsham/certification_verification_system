import { useState } from 'react';
import axios from 'axios';

const InstituteSettings = ({ API_URL, user }) => {
  const [formData, setFormData] = useState({
    instituteName: user?.instituteName || '',
    phone: user?.phone || '',
    address: user?.address || '',
    adminName: user?.adminName || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const token = localStorage.getItem('token');

    try {
      const response = await axios.put(
        `${API_URL}/users/${user.id}`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage('Settings updated successfully!');
        // Update local storage
        const updatedUser = { ...user, ...formData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Institute Settings</h1>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        {message && (
          <div className={`mb-4 p-3 rounded-lg ${
            message.includes('success') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Institute Name</label>
              <input
                type="text"
                value={formData.instituteName}
                onChange={(e) => setFormData({...formData, instituteName: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Admin Name</label>
              <input
                type="text"
                value={formData.adminName}
                onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                rows="3"
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email (cannot be changed)</label>
              <input
                type="email"
                value={user?.email}
                disabled
                className="w-full px-3 py-2 border rounded-lg bg-gray-50"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstituteSettings;