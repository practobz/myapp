import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { User, Smartphone, Mail, MapPin, FileText, Instagram, Facebook, Linkedin, Youtube, Save } from 'lucide-react';
import { useAuth } from '../admin/contexts/AuthContext';

function Settings() {
  const [activeTab, setActiveTab] = useState('customer');
  const { currentUser } = useAuth();

  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    gstNumber: ''
  });
  const [loading, setLoading] = useState(true);

  // Add this function if you need to fetch all users
  const fetchAllUsers = async () => {
    const res = await axios.get(`${process.env.REACT_APP_API_URL}/users`);
    return res.data;
  };

  useEffect(() => {
    if (!currentUser || !currentUser._id) {
      console.warn('No currentUser._id found!');
      setLoading(false);
      return;
    }
    async function fetchCustomer() {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/customer/${currentUser._id}`);
        const data = res.data;
        console.log('Fetched customer data:', data);
        if (!data.email) throw new Error('Failed to fetch customer data');
        setCustomerData(data);
      } catch (err) {
        console.error('Falling back to currentUser:', err);
        setCustomerData({
          name: currentUser.name || '',
          email: currentUser.email || '',
          mobile: currentUser.mobile || '',
          address: currentUser.address || '',
          gstNumber: currentUser.gstNumber || ''
        });
      } finally {
        setLoading(false);
      }
    }
    fetchCustomer();
    // Optionally, you can call fetchAllUsers() here if you need all users
    // fetchAllUsers().then(users => console.log(users));
  }, [currentUser]);

  const [socialAccounts, setSocialAccounts] = useState({
    instagram: { connected: false, username: '' },
    facebook: { connected: false, username: '' },
    linkedin: { connected: false, username: '' },
    youtube: { connected: false, username: '' }
  });

  const handleConnect = (platform) => {
    setSocialAccounts(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        connected: !prev[platform].connected,
        username: prev[platform].connected ? '' : `demo_${platform}`
      }
    }));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
      <div className="space-y-3 sm:space-y-6">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                type="button"
                onClick={() => setActiveTab('customer')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'customer'
                    ? 'border-[#1a1f2e] text-[#1a1f2e]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <User className="h-4 w-4 inline mr-2" />
                Customer Information
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('social')}
                className={`py-4 px-6 text-sm font-medium border-b-2 ${
                  activeTab === 'social'
                    ? 'border-[#1a1f2e] text-[#1a1f2e]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Smartphone className="h-4 w-4 inline mr-2" />
                Social Media Accounts
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* Customer Information Tab */}
            {activeTab === 'customer' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                <p className="text-sm text-gray-600 mb-6">
                  This information was provided during signup and is read-only. Contact support to make changes.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Full Name
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      <span className="text-gray-900">{customerData.name}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email Address
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      <span className="text-gray-900">{customerData.email}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Smartphone className="h-4 w-4 inline mr-2" />
                      Mobile Number
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      <span className="text-gray-900">{customerData.mobile}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FileText className="h-4 w-4 inline mr-2" />
                      GST Number
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      <span className="text-gray-900">{customerData.gstNumber}</span>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="h-4 w-4 inline mr-2" />
                      Address
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                      <span className="text-gray-900">{customerData.address}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <p className="text-sm text-blue-700">
                    Need to update your information? Please contact our support team at support@auremsolutions.com
                  </p>
                </div>
              </div>
            )}

            {/* Social Media Accounts Tab */}
            {activeTab === 'social' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Social Media Accounts</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Connect your social media accounts to enable content publishing and management.
                </p>
                
                <div className="space-y-6">
                  {/* Instagram */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Instagram className="h-6 w-6 text-pink-600" />
                        <div>
                          <h3 className="font-medium">Instagram</h3>
                          {socialAccounts.instagram.connected && (
                            <p className="text-sm text-gray-500">Connected as @{socialAccounts.instagram.username}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleConnect('instagram')}
                        className={`px-4 py-2 rounded-md ${
                          socialAccounts.instagram.connected
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {socialAccounts.instagram.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>

                  {/* Facebook */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Facebook className="h-6 w-6 text-blue-600" />
                        <div>
                          <h3 className="font-medium">Facebook</h3>
                          {socialAccounts.facebook.connected && (
                            <p className="text-sm text-gray-500">Connected as @{socialAccounts.facebook.username}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleConnect('facebook')}
                        className={`px-4 py-2 rounded-md ${
                          socialAccounts.facebook.connected
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {socialAccounts.facebook.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Linkedin className="h-6 w-6 text-blue-700" />
                        <div>
                          <h3 className="font-medium">LinkedIn</h3>
                          {socialAccounts.linkedin.connected && (
                            <p className="text-sm text-gray-500">Connected as @{socialAccounts.linkedin.username}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleConnect('linkedin')}
                        className={`px-4 py-2 rounded-md ${
                          socialAccounts.linkedin.connected
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {socialAccounts.linkedin.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>

                  {/* YouTube */}
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Youtube className="h-6 w-6 text-red-600" />
                        <div>
                          <h3 className="font-medium">YouTube</h3>
                          {socialAccounts.youtube.connected && (
                            <p className="text-sm text-gray-500">Connected as @{socialAccounts.youtube.username}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleConnect('youtube')}
                        className={`px-4 py-2 rounded-md ${
                          socialAccounts.youtube.connected
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {socialAccounts.youtube.connected ? 'Disconnect' : 'Connect'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button className="btn-primary flex items-center space-x-2">
                    <Save className="h-4 w-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;