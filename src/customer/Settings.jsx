import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, Smartphone, Mail, MapPin, FileText,
  Instagram, Facebook, Linkedin, Youtube, Twitter, MessageCircle, Target,
  ExternalLink, Settings as SettingsIcon,
  ArrowLeft, CheckCircle, AlertCircle, 
  TrendingUp, Users, BarChart3, Eye,
  Zap, Globe, Shield, Bell
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
  twitter: <Twitter className="h-6 w-6" />,
  whatsapp: <MessageCircle className="h-6 w-6" />,
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
  { 
    key: 'instagram-ads', 
    label: 'Instagram Advertising', 
    description: 'Create and manage Instagram ad campaigns',
    route: '/customer/integration/instagram-ads',
    icon: platformIcons['instagram-ads'],
    color: 'from-purple-500 to-pink-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    features: ['Campaign Management', 'Ad Analytics', 'Audience Targeting', 'Budget Optimization']
  },
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
  { 
    key: 'twitter', 
    label: 'Twitter/X', 
    description: 'Connect your Twitter/X account for tweet management and analytics',
    route: '/customer/integration/twitter',
    icon: platformIcons.twitter,
    color: 'from-blue-400 to-blue-500',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-500',
    features: ['Tweet Management', 'Real Analytics', 'Audience Insights', 'Engagement Metrics']
  },
  { 
    key: 'whatsapp', 
    label: 'WhatsApp Business', 
    description: 'Send notifications and updates to customers via WhatsApp',
    route: '/customer/integration/whatsapp',
    icon: platformIcons.whatsapp,
    color: 'from-green-500 to-emerald-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    features: ['Customer Notifications', 'Content Alerts', 'Business Templates', 'Automated Messages']
  }
];

function Settings() {
  const [activeTab, setActiveTab] = useState('customer');
  const [activeIntegration, setActiveIntegration] = useState(null);
  const { currentUser } = useAuth();
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
  const [connectionStatus, setConnectionStatus] = useState({
    facebook: false,
    instagram: false,
    youtube: false,
    linkedin: false,
    twitter: false,
    whatsapp: false
  });

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

  const handleIntegrationSelect = (platform) => {
    setActiveIntegration(platform);
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

  const renderCustomerTab = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
          <User className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Customer Information</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Your account details are securely stored and managed. For any changes, please contact our support team.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Account Details</h3>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100">
                  <span className="text-gray-900 font-medium">{customerData.name}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100">
                  <span className="text-gray-900 font-medium">{customerData.email}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Smartphone className="h-4 w-4 inline mr-2" />
                  Mobile Number
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100">
                  <span className="text-gray-900 font-medium">{customerData.mobile}</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <FileText className="h-4 w-4 inline mr-2" />
                  GST Number
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100">
                  <span className="text-gray-900 font-medium">{customerData.gstNumber}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 inline mr-2" />
                  Address
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 transition-colors hover:bg-gray-100">
                  <span className="text-gray-900 font-medium">{customerData.address}</span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Secure Account</p>
                    <p className="text-xs text-blue-700">
                      Your information is encrypted and protected. Contact support@auremsolutions.com for updates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-3">
          <Bell className="h-6 w-6 text-green-600" />
          <h4 className="font-semibold text-green-900">Need to Update Information?</h4>
        </div>
        <p className="text-sm text-green-800 mb-4">
          For security reasons, account information changes must be processed by our support team.
        </p>
        <button 
          onClick={() => window.open('mailto:support@auremsolutions.com', '_blank')}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          Contact Support
        </button>
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
        {platforms.map((platform) => (
          <div
            key={platform.key}
            className="group bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
            onClick={() => handleIntegrationSelect(platform.key)}
          >
            <div className={`h-2 bg-gradient-to-r ${platform.color}`}></div>
            
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className={`${platform.bgColor} p-3 rounded-xl ${platform.textColor}`}>
                    {platform.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                      {platform.label}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {platform.description}
                    </p>
                  </div>
                </div>
                <ExternalLink className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
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
                {renderConnectionStatus(platform.key)}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleIntegrationSelect(platform.key);
                  }}
                  className={`bg-gradient-to-r ${platform.color} text-white px-4 py-2 rounded-lg text-sm font-medium hover:shadow-md transition-all duration-200 flex items-center space-x-2`}
                >
                  <SettingsIcon className="h-4 w-4" />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          </div>
        ))}
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#e6f2fb] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#38bdf8] mx-auto mb-4"></div>
          <p className="text-[#0a2342]/70">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e6f2fb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!activeIntegration ? (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-[#0a2342] mb-2">Account Settings</h1>
              <p className="text-[#0a2342]/70">Manage your account information and social media integrations</p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-lg border border-[#0a2342]/10 overflow-hidden">
              <div className="border-b border-[#bae6fd]">
                <nav className="flex">
                  <button
                    type="button"
                    onClick={() => handleTabChange('customer')}
                    className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${
                      activeTab === 'customer'
                        ? 'border-[#38bdf8] text-[#0a2342] bg-[#bae6fd]'
                        : 'border-transparent text-[#0a2342]/60 hover:text-[#0a2342] hover:border-[#bae6fd] hover:bg-[#e6f2fb]'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <User className="h-5 w-5" />
                      <span>Customer Information</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('integrations')}
                    className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${
                      activeTab === 'integrations'
                        ? 'border-[#38bdf8] text-[#0a2342] bg-[#bae6fd]'
                        : 'border-transparent text-[#0a2342]/60 hover:text-[#0a2342] hover:border-[#bae6fd] hover:bg-[#e6f2fb]'
                    }`}
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <SettingsIcon className="h-5 w-5" />
                      <span>Social Media Integrations</span>
                    </div>
                  </button>
                </nav>
              </div>

              <div className="p-8">
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