import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, Smartphone, Mail, MapPin, FileText,
  Instagram, Facebook, Linkedin, Youtube, Twitter, MessageCircle, Target,
  ExternalLink, Settings as SettingsIcon,
  ArrowLeft, CheckCircle, AlertCircle, 
  TrendingUp, Users, BarChart3, Eye,
  Zap, Globe, Shield, Bell, Lock, X, Phone
} from 'lucide-react';
import { useAuth } from '../admin/contexts/AuthContext';
import FacebookIntegration from './Integration/FacebookIntegration';
import InstagramIntegration from './Integration/InstagramIntegration';
import InstagramAdsIntegration from './Integration/InstagramAdsIntegration';
import YouTubeIntegration from './Integration/YouTubeIntegration';
import TwitterIntegration from './Integration/TwitterIntegration';
import LinkedInIntegration from './Integration/LinkedInIntegration';
import WhatsAppIntegration from '../components/WhatsAppIntegration';
import CustomerSocialMediaLinks from '../components/CustomerSocialMediaLinks';
import { getUserData } from '../utils/sessionUtils'; // Add this import if not present

// Enhanced platform configuration with better styling
const platformIcons = {
  instagram: <Instagram className="h-6 w-6" />,
  facebook: <Facebook className="h-6 w-6" />,
  linkedin: <Linkedin className="h-6 w-6" />,
  youtube: <Youtube className="h-6 w-6" />,
  // twitter: <Twitter className="h-6 w-6" />, 
  // whatsapp: <MessageCircle className="h-6 w-6" />, 
  'instagram-ads': <Target className="h-6 w-6" />
};

const platforms = [
  { 
    key: 'facebook', 
    label: 'Facebook/Meta', 
    description: 'Connect Facebook pages and Instagram business accounts',
    route: '/customer/integration/facebook',
    icon: platformIcons.facebook,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    features: ['Page Management', 'Post Analytics', 'Audience Insights', 'Instagram Integration']
  },
  { 
    key: 'instagram', 
    label: 'Instagram', 
    description: 'Manage Instagram accounts and analytics',
    route: '/customer/integration/instagram',
    icon: platformIcons.instagram,
    color: 'from-pink-500 to-purple-600',
    bgColor: 'bg-pink-50',
    textColor: 'text-pink-600',
    features: ['Media Management', 'Story Analytics', 'Hashtag Tracking', 'Engagement Metrics']
  },
  // {
  //   key: 'instagram-ads',
  //   label: 'Instagram Advertising',
  //   description: 'Create and manage Instagram ad campaigns',
  //   route: '/customer/integration/instagram-ads',
  //   icon: platformIcons['instagram-ads'],
  //   color: 'from-purple-500 to-pink-600',
  //   bgColor: 'bg-purple-50',
  //   textColor: 'text-purple-600',
  //   features: ['Campaign Management', 'Ad Analytics', 'Audience Targeting', 'Budget Optimization']
  // },
  { 
    key: 'youtube', 
    label: 'YouTube', 
    description: 'Connect YouTube channels for video analytics',
    route: '/customer/integration/youtube',
    icon: platformIcons.youtube,
    color: 'from-red-500 to-red-600',
    bgColor: 'bg-red-50',
    textColor: 'text-red-600',
    features: ['Video Analytics', 'Channel Growth', 'Revenue Tracking', 'Audience Demographics']
  },
  { 
    key: 'linkedin', 
    label: 'LinkedIn', 
    description: 'Connect LinkedIn profiles and company pages',
    route: '/customer/integration/linkedin',
    icon: platformIcons.linkedin,
    color: 'from-blue-700 to-blue-800',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    features: ['Professional Networks', 'Company Updates', 'Lead Generation', 'Industry Analytics']
  },
  // Twitter and WhatsApp removed
];

function Settings() {
  const [activeTab, setActiveTab] = useState('customer');
  const [activeIntegration, setActiveIntegration] = useState(null);
  const { currentUser, updateCurrentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    gstNumber: ''
  });
  const [loading, setLoading] = useState(true);
  
  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    address: '',
    gstNumber: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  
  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    facebook: false,
    instagram: false,
    youtube: false,
    linkedin: false
  });

  // Platform access state (controlled by admin)
  const [platformAccess, setPlatformAccess] = useState({
    facebook: true,
    instagram: true,
    linkedin: true,
    youtube: true
  });

  // Modal state for disabled platform access
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [deniedPlatformInfo, setDeniedPlatformInfo] = useState(null);

  // Handle URL-based navigation
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/integration/')) {
      const platform = path.split('/').pop();
      setActiveTab('integrations');
      setActiveIntegration(platform);
    }
  }, [location]);

  useEffect(() => {
    if (!currentUser || !currentUser._id) {
      console.warn('No currentUser._id found!');
      setLoading(false);
      return;
    }
    
    fetchCustomerData();
    fetchConnectionStatus(); // <-- Add this line to fetch connection status
  }, [currentUser]);

  // Fetch integration connection status for the current user
  const fetchConnectionStatus = async () => {
    try {
      let apiStatus = {};
      if (currentUser && currentUser._id) {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/customer/${currentUser._id}/integration-status`);
        if (res.ok) {
          apiStatus = await res.json();
        } else if (res.status === 404) {
          // Endpoint not found, fallback to local/session storage only
          console.warn('Integration status endpoint not found (404). Using local/session storage only.');
        } else {
          // Other errors
          console.warn('Error fetching integration status:', res.status, res.statusText);
        }
      }

      // Use getUserData for robust local/session storage checks
      const fbConnected = Array.isArray(getUserData('fb_connected_accounts')) && getUserData('fb_connected_accounts').length > 0;
      const igConnected = Array.isArray(getUserData('instagram_connected_accounts')) && getUserData('instagram_connected_accounts').length > 0;
      const ytConnected = Array.isArray(getUserData('yt_connected_accounts')) && getUserData('yt_connected_accounts').length > 0;
      const twConnected = Array.isArray(getUserData('tw_connected_accounts')) && getUserData('tw_connected_accounts').length > 0;
      const liConnected = Array.isArray(getUserData('linkedin_connected_accounts')) && getUserData('linkedin_connected_accounts').length > 0;

      setConnectionStatus(prev => ({
        ...prev,
        facebook: apiStatus.facebook === undefined ? fbConnected : apiStatus.facebook,
        instagram: apiStatus.instagram === undefined ? igConnected : apiStatus.instagram,
        youtube: apiStatus.youtube === undefined ? ytConnected : apiStatus.youtube,
        twitter: apiStatus.twitter === undefined ? twConnected : apiStatus.twitter,
        linkedin: apiStatus.linkedin === undefined ? liConnected : apiStatus.linkedin,
        whatsapp: apiStatus.whatsapp === undefined ? false : apiStatus.whatsapp
      }));
    } catch (err) {
      console.error('Error fetching integration status:', err);
    }
  };

  const fetchCustomerData = async () => {
    try {
      console.log('Fetching customer data for ID:', currentUser._id);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/customer/${currentUser._id}`);
      const data = await res.json();
      console.log('Fetched customer data:', data);
      
      if (!res.ok || !data.email) throw new Error('Failed to fetch customer data');
      setCustomerData(data);
      
      // Set platform access from customer data (defaults to true if not set)
      if (data.platformAccess) {
        setPlatformAccess({
          facebook: data.platformAccess.facebook !== false,
          instagram: data.platformAccess.instagram !== false,
          linkedin: data.platformAccess.linkedin !== false,
          youtube: data.platformAccess.youtube !== false
        });
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
      // Fallback to currentUser data if API fails
      const fallbackData = {
        name: currentUser.name || '',
        email: currentUser.email || '',
        mobile: currentUser.mobile || '',
        address: currentUser.address || '',
        gstNumber: currentUser.gstNumber || ''
      };
      console.log('Using fallback customer data:', fallbackData);
      setCustomerData(fallbackData);
      
      // If currentUser has platformAccess, use it
      if (currentUser.platformAccess) {
        setPlatformAccess({
          facebook: currentUser.platformAccess.facebook !== false,
          instagram: currentUser.platformAccess.instagram !== false,
          linkedin: currentUser.platformAccess.linkedin !== false,
          youtube: currentUser.platformAccess.youtube !== false
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setActiveIntegration(null);
    // Remove navigation to non-existent routes
    // if (tab === 'customer') {
    //   navigate('/customer/settings');
    // } else {
    //   navigate('/customer/settings/integrations');
    // }
  };

  const handleIntegrationSelect = (platformKey) => {
    // Check if platform access is enabled
    const platform = platforms.find(p => p.key === platformKey);
    
    // Map platform keys to access keys (instagram-ads uses instagram access)
    const accessKey = platformKey === 'instagram-ads' ? 'instagram' : platformKey;
    
    if (platformAccess[accessKey] === false) {
      // Platform is disabled by admin - show modal
      setDeniedPlatformInfo(platform);
      setShowAccessDeniedModal(true);
      return;
    }
    
    setActiveIntegration(platformKey);
    // navigate(`/customer/integration/${platform}`);
  };

  const handleBackToIntegrations = () => {
    setActiveIntegration(null);
    // navigate('/customer/settings/integrations');
  };

  const handleConnectionStatusChange = (platform, status) => {
    setConnectionStatus(prev => ({
      ...prev,
      [platform]: status
    }));
  };

  const renderConnectionStatus = (platform) => {
    const isConnected = connectionStatus[platform];
    return (
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
        isConnected 
          ? 'bg-green-100 text-green-700' 
          : 'bg-gray-100 text-gray-600'
      }`}>
        {isConnected ? (
          <CheckCircle className="h-4 w-4" />
        ) : (
          <AlertCircle className="h-4 w-4" />
        )}
        <span>{isConnected ? 'Connected' : 'Not Connected'}</span>
      </div>
    );
  };

  // Handle edit mode toggle
  const handleEditClick = () => {
    setEditFormData({ ...customerData });
    setIsEditing(true);
    setSaveMessage({ type: '', text: '' });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditFormData({ ...customerData });
    setSaveMessage({ type: '', text: '' });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    setSaveMessage({ type: '', text: '' });
    
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/customer/${currentUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || 'Failed to update customer data');
      }
      
      const updatedData = await res.json();
      setCustomerData(updatedData);
      
      // Update the currentUser in AuthContext so header and other components reflect the changes
      updateCurrentUser({
        name: updatedData.name,
        displayName: updatedData.name,
        email: updatedData.email,
        mobile: updatedData.mobile
      });
      
      setIsEditing(false);
      setSaveMessage({ type: 'success', text: 'Your information has been updated successfully!' });
    } catch (err) {
      console.error('Error updating customer data:', err);
      setSaveMessage({ type: 'error', text: err.message || 'Failed to update information. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Password change handlers
  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    
    // Validation
    if (!passwordData.oldPassword) {
      setPasswordError('Please enter your current password');
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordError('Please enter a new password');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordData.oldPassword === passwordData.newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/customer/${currentUser._id}/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          oldPassword: passwordData.oldPassword,
          newPassword: passwordData.newPassword
        })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to change password');
      }
      
      setPasswordSuccess('Password changed successfully!');
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordSuccess('');
      }, 2000);
    } catch (err) {
      console.error('Error changing password:', err);
      setPasswordError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  };

  const renderCustomerTab = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
          <User className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Information</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Manage your account details and security settings.
        </p>
      </div>

      {/* Success/Error Message */}
      {saveMessage.text && (
        <div className={`p-4 rounded-lg flex items-center space-x-3 ${
          saveMessage.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {saveMessage.type === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600" />
          )}
          <span className="font-medium">{saveMessage.text}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
          {!isEditing ? (
            <button
              onClick={handleEditClick}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <SettingsIcon className="h-4 w-4" />
              <span>Edit Details</span>
            </button>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={handleCancelEdit}
                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center space-x-2"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={editFormData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100">
                    <span className="text-gray-900 font-medium">{customerData.name || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={editFormData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your email address"
                  />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100">
                    <span className="text-gray-900 font-medium">{customerData.email || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Smartphone className="h-4 w-4 inline mr-2" />
                  Mobile Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    name="mobile"
                    value={editFormData.mobile}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your mobile number"
                  />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100">
                    <span className="text-gray-900 font-medium">{customerData.mobile || '-'}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-2" />
                  GST Number
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="gstNumber"
                    value={editFormData.gstNumber}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                    placeholder="Enter your GST number"
                  />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100">
                    <span className="text-gray-900 font-medium">{customerData.gstNumber || '-'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Address
                </label>
                {isEditing ? (
                  <textarea
                    name="address"
                    value={editFormData.address}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors resize-none"
                    placeholder="Enter your address"
                  />
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100">
                    <span className="text-gray-900 font-medium">{customerData.address || '-'}</span>
                  </div>
                )}
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Secure Account</p>
                    <p className="text-xs text-blue-700">
                      Your information is encrypted and protected.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-50 to-red-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Password & Security</h3>
          </div>
          {!showPasswordChange && (
            <button
              onClick={() => setShowPasswordChange(true)}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
            >
              Change Password
            </button>
          )}
        </div>

        {showPasswordChange && (
          <div className="p-6">
            {passwordError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 font-medium">{passwordError}</span>
              </div>
            )}
            {passwordSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-800 font-medium">{passwordSuccess}</span>
              </div>
            )}

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="oldPassword"
                  value={passwordData.oldPassword}
                  onChange={handlePasswordInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="Enter your current password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="Enter your new password"
                  disabled={!passwordData.oldPassword}
                />
                <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordInputChange}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="Confirm your new password"
                  disabled={!passwordData.oldPassword}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                    setPasswordSuccess('');
                  }}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                  disabled={changingPassword}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasswordChange}
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium flex items-center space-x-2"
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      <span>Changing...</span>
                    </>
                  ) : (
                    <span>Change Password</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {!showPasswordChange && (
          <div className="p-6">
            <p className="text-sm text-gray-600">
              It's a good idea to use a strong password that you don't use elsewhere.
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderIntegrationsOverview = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4">
          <Globe className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Social Media Integrations</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Connect your social media accounts to streamline content management and gain valuable insights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platforms.map((platform) => {
          // Map platform keys to access keys (instagram-ads uses instagram access)
          const accessKey = platform.key === 'instagram-ads' ? 'instagram' : platform.key;
          const isAccessEnabled = platformAccess[accessKey] !== false;
          
          return (
          <div
            key={platform.key}
            className={`group bg-white rounded-2xl shadow-lg border overflow-hidden transition-all duration-300 cursor-pointer transform ${
              isAccessEnabled 
                ? 'border-gray-100 hover:shadow-xl hover:-translate-y-1' 
                : 'border-gray-200 opacity-75'
            }`}
            onClick={() => handleIntegrationSelect(platform.key)}
          >
            <div className={`h-2 bg-gradient-to-r ${isAccessEnabled ? platform.color : 'from-gray-300 to-gray-400'}`}></div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`${isAccessEnabled ? platform.bgColor : 'bg-gray-100'} p-3 rounded-xl ${isAccessEnabled ? platform.textColor : 'text-gray-400'} relative`}>
                    {platform.icon}
                    {!isAccessEnabled && (
                      <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-0.5">
                        <Lock className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xl font-semibold transition-colors ${isAccessEnabled ? 'text-gray-900 group-hover:text-gray-700' : 'text-gray-500'}`}>
                        {platform.label}
                      </h3>
                      {!isAccessEnabled && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {platform.description}
                    </p>
                  </div>
                </div>
                {isAccessEnabled ? (
                  <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                ) : (
                  <Lock className="h-5 w-5 text-amber-500" />
                )}
              </div>

              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features:</h4>
                <div className="flex flex-wrap gap-2">
                  {platform.features.map((feature, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-medium"
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                {isAccessEnabled ? (
                  renderConnectionStatus(platform.key)
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
                    <Lock className="h-4 w-4" />
                    <span>Access Restricted</span>
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIntegrationSelect(platform.key);
                  }}
                  className={`${
                    isAccessEnabled 
                      ? `bg-gradient-to-r ${platform.color} text-white hover:shadow-md` 
                      : 'bg-gray-100 text-gray-500'
                  } px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2`}
                >
                  {isAccessEnabled ? (
                    <>
                      <SettingsIcon className="h-4 w-4" />
                      <span>Configure</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" />
                      <span>Unlock</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );

  const renderIntegrationDetail = () => {
    const platform = platforms.find(p => p.key === activeIntegration);
    if (!platform) return null;

    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToIntegrations}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Integrations</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className={`bg-gradient-to-r ${platform.color} px-6 py-4`}>
            <div className="flex items-center space-x-3">
              <div className="text-white">
                {platform.icon}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{platform.label} Integration</h2>
                <p className="text-white/90 text-sm">{platform.description}</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {activeIntegration === 'facebook' && (
              <FacebookIntegration
                onConnectionStatusChange={status => handleConnectionStatusChange('facebook', status)}
              />
            )}
            {activeIntegration === 'instagram' && (
              <InstagramIntegration
                onConnectionStatusChange={status => handleConnectionStatusChange('instagram', status)}
              />
            )}
            {activeIntegration === 'instagram-ads' && (
              <InstagramAdsIntegration
                onConnectionStatusChange={status => handleConnectionStatusChange('instagram-ads', status)}
              />
            )}
            {activeIntegration === 'youtube' && (
              <YouTubeIntegration
                customerId={currentUser?._id}
                onConnectionStatusChange={status => handleConnectionStatusChange('youtube', status)}
              />
            )}
            {activeIntegration === 'linkedin' && (
              <LinkedInIntegration
                onConnectionStatusChange={status => handleConnectionStatusChange('linkedin', status)}
              />
            )}
            {activeIntegration === 'twitter' && (
              <TwitterIntegration
                onConnectionStatusChange={status => handleConnectionStatusChange('twitter', status)}
              />
            )}
            {activeIntegration === 'whatsapp' && (
              <div>
                {/* Debug info to show what data we have */}
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Customer Data Debug</h4>
                  <div className="text-xs text-blue-800 space-y-1">
                    <div><strong>Name:</strong> {customerData?.name || 'Not loaded'}</div>
                    <div><strong>Email:</strong> {customerData?.email || 'Not loaded'}</div>
                    <div><strong>Mobile:</strong> {customerData?.mobile || 'Not loaded'}</div>
                    <div><strong>Customer ID:</strong> {currentUser?._id || 'Not loaded'}</div>
                    <div><strong>Mobile Type:</strong> {typeof customerData?.mobile}</div>
                    <div><strong>Mobile Length:</strong> {customerData?.mobile?.length || 0}</div>
                    <div><strong>Raw Customer Data:</strong> {JSON.stringify(customerData, null, 2)}</div>
                  </div>
                </div>
                
                <WhatsAppIntegration 
                  contentDetails={{
                    id: 'test-content-id',
                    creatorId: currentUser?._id || '',
                    creatorName: customerData?.name || currentUser?.name || 'Test Creator',
                    title: 'Test Content Notification',
                    contentType: 'Instagram Post',
                    customerId: currentUser?._id || '',
                    customerEmail: customerData?.email || currentUser?.email || '',
                    customerPhone: customerData?.mobile || currentUser?.mobile || null
                  }}
                  onNotificationSent={(data) => {
                    console.log('WhatsApp notification sent:', data);
                    // Update connection status if successful
                    if (data.success) {
                      setConnectionStatus(prev => ({
                        ...prev,
                        whatsapp: true
                      }));
                    }
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (activeIntegration === null) {
      fetchConnectionStatus();
    }
  }, [activeIntegration]);

  // Access Denied Modal Component
  const AccessDeniedModal = () => {
    if (!showAccessDeniedModal || !deniedPlatformInfo) return null;

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setShowAccessDeniedModal(false)}
        ></div>
        
        {/* Modal */}
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto transform transition-all animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              onClick={() => setShowAccessDeniedModal(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header with Icon */}
            <div className="pt-8 pb-4 px-6 text-center">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full flex items-center justify-center mb-4">
                <Lock className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Platform Access Restricted
              </h3>
            </div>

            {/* Content */}
            <div className="px-6 pb-6">
              {/* Platform Info */}
              <div className={`${deniedPlatformInfo.bgColor} rounded-xl p-4 mb-5`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-lg bg-white/80 ${deniedPlatformInfo.textColor}`}>
                    {deniedPlatformInfo.icon}
                  </div>
                  <div>
                    <p className={`font-semibold ${deniedPlatformInfo.textColor}`}>
                      {deniedPlatformInfo.label}
                    </p>
                    <p className="text-sm text-gray-600">
                      This platform is not included in your current plan
                    </p>
                  </div>
                </div>
              </div>

              {/* Message */}
              <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
                <p className="text-gray-700 text-sm leading-relaxed">
                  To access <strong>{deniedPlatformInfo.label}</strong> integration features, 
                  please upgrade your plan or contact your administrator to enable this platform for your account.
                </p>
              </div>

              {/* Contact Info */}
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-100">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Phone className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-indigo-900 mb-1">
                      Contact Administrator
                    </p>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      Reach out to your account administrator to request access to additional platforms and unlock more features.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowAccessDeniedModal(false)}
                className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors text-sm"
              >
                Close
              </button>
              <a
                href="mailto:support@airspark.in?subject=Platform Access Request"
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-blue-700 transition-colors text-sm text-center flex items-center justify-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-blue-400 animate-ping mx-auto opacity-20"></div>
          </div>
          <p className="mt-6 text-slate-600 font-medium">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Access Denied Modal */}
      <AccessDeniedModal />
      
      <div className="sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
        {!activeIntegration ? (
          <div className="space-y-8">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 rounded-2xl shadow-xl p-4 sm:p-8 text-white relative overflow-hidden">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="relative text-center">
                <h1 className="text-4xl font-bold mb-3">Account Settings</h1>
                <p className="text-blue-50 text-lg">Manage your account information and social media integrations</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-lg sm:border sm:border-slate-200 overflow-hidden">
              <div className="sm:border-b sm:border-slate-200">
                <nav className="flex">
                  <button
                    type="button"
                    onClick={() => handleTabChange('customer')}
                    className={`flex-1 py-5 px-6 text-sm font-semibold transition-all duration-200 relative ${
                      activeTab === 'customer'
                        ? 'text-indigo-600 bg-gradient-to-r from-indigo-50 to-blue-50'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {activeTab === 'customer' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-blue-600"></div>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <User className="h-5 w-5" />
                      <span>Customer Information</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('integrations')}
                    className={`flex-1 py-5 px-6 text-sm font-semibold transition-all duration-200 relative ${
                      activeTab === 'integrations'
                        ? 'text-indigo-600 bg-gradient-to-r from-indigo-50 to-blue-50'
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    {activeTab === 'integrations' && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 to-blue-600"></div>
                    )}
                    <div className="flex items-center justify-center gap-2">
                      <SettingsIcon className="h-5 w-5" />
                      <span>Social Media Integrations</span>
                    </div>
                  </button>
                </nav>
              </div>

              <div className="p-4 sm:p-8">
                {activeTab === 'customer' && renderCustomerTab()}
                {activeTab === 'integrations' && renderIntegrationsOverview()}
              </div>
            </div>
          </div>
        ) : (
          renderIntegrationDetail()
        )}
      </div>
    </div>
  );
}

export default Settings;