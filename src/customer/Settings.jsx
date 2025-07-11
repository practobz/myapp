import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  User, Smartphone, Mail, MapPin, FileText,
  Instagram, Facebook, Linkedin, Youtube,
  ExternalLink, Settings as SettingsIcon,
  ArrowLeft, CheckCircle, AlertCircle, 
  TrendingUp, Users, BarChart3, Eye,
  Zap, Globe, Shield, Bell
} from 'lucide-react';
import { useAuth } from '../admin/contexts/AuthContext';
import FacebookIntegration from './Integration/FacebookIntegration';
import InstagramIntegration from './Integration/InstagramIntegration';
import YouTubeIntegration from './Integration/YouTubeIntegration';

// Enhanced platform configuration with better styling
const platformIcons = {
  instagram: <Instagram className="h-6 w-6" />,
  facebook: <Facebook className="h-6 w-6" />,
  linkedin: <Linkedin className="h-6 w-6" />,
  youtube: <Youtube className="h-6 w-6" />
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
    linkedin: false
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
  }, [currentUser]);

  const fetchCustomerData = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/customer/${currentUser._id}`);
      const data = await res.json();
      if (!res.ok || !data.email) throw new Error('Failed to fetch customer data');
      setCustomerData(data);
    } catch (err) {
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

      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Zap className="h-6 w-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-indigo-900">Quick Setup Guide</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-indigo-800 mb-3">Recommended Setup Order:</h4>
            <ol className="space-y-2 text-sm text-indigo-700">
              <li className="flex items-center space-x-2">
                <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                <span>Start with <strong>Facebook Integration</strong> for comprehensive management</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                <span>Connect <strong>Instagram</strong> through Facebook for best results</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                <span>Add <strong>YouTube</strong> for video content analytics</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">4</span>
                <span>Complete with <strong>LinkedIn</strong> for professional content</span>
              </li>
            </ol>
          </div>
          <div>
            <h4 className="font-medium text-indigo-800 mb-3">Pro Tips:</h4>
            <ul className="space-y-2 text-sm text-indigo-700">
              <li>• Use business accounts for better analytics access</li>
              <li>• Enable all permissions for comprehensive data</li>
              <li>• Regular reconnection may be needed for some platforms</li>
              <li>• Check our media library for content management</li>
            </ul>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={() => handleIntegrationSelect('facebook')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start with Facebook
          </button>
          <button
            onClick={() => {
              // Navigate to integrations tab instead of non-existent route
              setActiveTab('integrations');
            }}
            className="bg-white text-blue-600 border border-blue-600 px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            View All Integrations
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Integration Status Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {platforms.map((platform) => (
            <div key={platform.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className={`${platform.textColor}`}>
                  {platform.icon}
                </div>
                <span className="font-medium text-gray-900">{platform.label}</span>
              </div>
              <div className="flex items-center space-x-3">
                {renderConnectionStatus(platform.key)}
                <button
                  onClick={() => handleIntegrationSelect(platform.key)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                >
                  Configure →
                </button>
              </div>
            </div>
          ))}
        </div>
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
            {activeIntegration === 'facebook' && <FacebookIntegration />}
            {activeIntegration === 'instagram' && <InstagramIntegration />}
            {activeIntegration === 'youtube' && <YouTubeIntegration />}
            {activeIntegration === 'linkedin' && (
              <div className="text-center py-12">
                <Linkedin className="h-16 w-16 mx-auto text-blue-600 mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">LinkedIn Integration</h3>
                <p className="text-gray-600 mb-4">LinkedIn integration is coming soon!</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
                  <p className="text-sm text-blue-800">
                    We're working on LinkedIn integration. Stay tuned for updates!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!activeIntegration ? (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
              <p className="text-gray-600">Manage your account information and social media integrations</p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="border-b border-gray-200">
                <nav className="flex">
                  <button
                    type="button"
                    onClick={() => handleTabChange('customer')}
                    className={`flex-1 py-4 px-6 text-sm font-medium border-b-2 transition-all duration-200 ${
                      activeTab === 'customer'
                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
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
                        ? 'border-blue-600 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
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