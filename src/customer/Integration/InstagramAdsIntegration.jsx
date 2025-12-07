import React, { useState, useEffect } from 'react';
import { 
  Instagram, TrendingUp, DollarSign, Target, Users, Eye, 
  BarChart3, Settings, Plus, Play, Pause, Edit, Trash2,
  AlertCircle, CheckCircle, Loader2, ExternalLink,
  Calendar, Globe, MapPin, Camera, Video, FileText,
  ArrowUp, ArrowDown, RefreshCw, Download, Upload,
  Zap, Shield, Award, Bell, MessageSquare, Info,
  Lock, UserCheck, BookOpen, HelpCircle, ChevronRight,
  Building, Briefcase, Star, ThumbsUp, Clock, CheckCircle2
} from 'lucide-react';
import TrendChart from '../../components/TrendChart';
import InstagramCampaignCreator from '../../components/InstagramCampaignCreator';
import { getUserData, setUserData, removeUserData } from '../../utils/sessionUtils';
import { MetaAdvertisingAPI } from '../../utils/metaAdvertisingApi';

// Meta Marketing API Configuration
const FACEBOOK_APP_ID = '4416243821942660';

// Required permissions for Instagram advertising
const REQUIRED_PERMISSIONS = [
  {
    name: 'ads_management',
    purpose: 'Create and manage advertising campaigns for your business',
    description: 'Allows AirSpark to help you create, edit, and manage Instagram advertising campaigns on your behalf.',
    required: true,
    businessUse: 'Campaign creation, budget management, targeting setup'
  },
  {
    name: 'ads_read', 
    purpose: 'Read advertising performance data and insights',
    description: 'Enables AirSpark to fetch and display your campaign performance metrics, helping you optimize your advertising strategy.',
    required: true,
    businessUse: 'Performance analytics, ROI tracking, campaign optimization'
  },
  {
    name: 'business_management',
    purpose: 'Access your business assets and accounts',
    description: 'Allows AirSpark to access your Facebook Business Manager and associated ad accounts.',
    required: true,
    businessUse: 'Account management, asset access'
  },
  {
    name: 'pages_read_engagement',
    purpose: 'Read engagement data from your Facebook pages',
    description: 'Helps analyze page performance to inform advertising strategies.',
    required: false,
    businessUse: 'Content performance analysis'
  },
  {
    name: 'instagram_basic',
    purpose: 'Access basic Instagram account information',
    description: 'Retrieves basic information about your Instagram business account.',
    required: true,
    businessUse: 'Account verification, profile information'
  }
];

function InstagramAdsIntegration({ onData, onConnectionStatusChange }) {
  // Connection state
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentStep, setCurrentStep] = useState('overview');
  const [showPermissionsHelp, setShowPermissionsHelp] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  // Ads management state
  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [campaignInsights, setCampaignInsights] = useState({});
  const [adAccountsData, setAdAccountsData] = useState([]);

  // Analytics state
  const [selectedDateRange, setSelectedDateRange] = useState('last_7_days');
  const [performanceData, setPerformanceData] = useState(null);

  // Add demo/sandbox state
  const [isInSandboxMode, setIsInSandboxMode] = useState(false);
  const [showDemoFlow, setShowDemoFlow] = useState(false);
  const [demoStep, setDemoStep] = useState(1);
  const [sandboxAccounts, setSandboxAccounts] = useState([]);

  // Add dashboard state
  const [activeTab, setActiveTab] = useState('overview');
  const [userAccessToken, setUserAccessToken] = useState(null);
  const [adAccount, setAdAccount] = useState(null);
  const [instagramAccounts, setInstagramAccounts] = useState([]);
  const [selectedInstagramAccount, setSelectedInstagramAccount] = useState(null);

  // Load Facebook SDK and check connection
  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      checkConnection();
      return;
    }
    
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v19.0'
      });
      
      checkConnection();
    };
    
    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  const checkConnection = () => {
    try {
      const savedToken = getUserData('instagram_ads_token');
      const savedAdAccount = getUserData('instagram_ads_account');
      const savedInstagramAccounts = getUserData('instagram_ads_connected_accounts');
      
      if (savedToken) {
        // Validate token before using it
        validateAccessToken(savedToken).then(isValid => {
          if (isValid) {
            setUserAccessToken(savedToken);
            setIsConnected(true);
            
            // Load account data if available
            if (savedAdAccount) setAdAccount(savedAdAccount);
            if (savedInstagramAccounts) {
              setInstagramAccounts(savedInstagramAccounts);
              setSelectedInstagramAccount(savedInstagramAccounts[0]);
            }
            
            // Load campaigns and account data
            loadAccountData(savedToken);
          } else {
            // Token is invalid, clear stored data and show reconnection message
            handleTokenExpiration();
          }
        }).catch(() => {
          handleTokenExpiration();
        });
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      handleTokenExpiration();
    } finally {
      setLoading(false);
    }
  };

  // Add token validation function
  const validateAccessToken = (accessToken) => {
    return new Promise((resolve) => {
      if (!window.FB) {
        resolve(false);
        return;
      }

      window.FB.api('/me', {
        access_token: accessToken,
        fields: 'id'
      }, function(response) {
        if (response.error) {
          console.error('Token validation failed:', response.error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  };

  // Add token expiration handler
  const handleTokenExpiration = () => {
    // Clear all stored authentication data
    removeUserData('instagram_ads_token');
    removeUserData('instagram_ads_account');
    removeUserData('instagram_ads_connected_accounts');
    
    // Reset state
    setUserAccessToken(null);
    setIsConnected(false);
    setAdAccount(null);
    setInstagramAccounts([]);
    setSelectedInstagramAccount(null);
    setCampaigns([]);
    
    // Show appropriate error message
    setError('Your Instagram advertising session has expired. Please reconnect your account to continue.');
    setCurrentStep('connect');
    
    // Notify parent component of disconnection
    if (onConnectionStatusChange) {
      onConnectionStatusChange(false);
    }
  };

  // Add comprehensive error handler for API calls
  const handleApiError = (error, operation = 'API call') => {
    console.error(`${operation} error:`, error);
    
    // Handle OAuth exceptions (expired tokens)
    if (error.code === 190) {
      handleTokenExpiration();
      return;
    }
    
    // Handle payment method required error
    if (error.code === 100 && error.error_subcode === 1359188) {
      setError(`Payment method required: Your Facebook Ad Account needs a valid payment method to create ads. Please visit Facebook Ads Manager to add a payment method, then try again.`);
      return;
    }
    
    // Handle other specific error codes
    const errorMessages = {
      1: 'API request limit reached. Please try again later.',
      2: 'Temporary API error. Please try again in a few moments.',
      10: 'Permission denied. Please ensure you have the required permissions.',
      17: 'Too many requests. Please wait before trying again.',
      100: 'Invalid parameter provided.',
      200: 'Permission denied for this action.',
      613: 'Rate limit exceeded. Please try again later.'
    };
    
    const message = errorMessages[error.code] || error.message || 'An unexpected error occurred';
    setError(`${operation} failed: ${message}`);
  };

  // Enhanced loadAccountData function
  const loadAccountData = (accessToken) => {
    if (!window.FB) return;
    
    setLoadingCampaigns(true);
    
    // Load ad accounts first
    window.FB.api('/me/adaccounts', {
      fields: 'id,name,account_status,currency,business,timezone_name,spend_cap',
      access_token: accessToken
    }, function(adAccountsResponse) {
      if (adAccountsResponse.error) {
        handleApiError(adAccountsResponse.error, 'Loading ad accounts');
        setLoadingCampaigns(false);
        return;
      }

      if (adAccountsResponse.data && adAccountsResponse.data.length > 0) {
        const firstAdAccount = adAccountsResponse.data[0];
        setAdAccount(firstAdAccount);
        setAdAccountsData(adAccountsResponse.data);
        setUserData('instagram_ads_account', firstAdAccount);

        // Load Instagram accounts
        loadInstagramAccounts(accessToken);
        
        // Load campaigns for this ad account
        loadCampaigns(firstAdAccount.id, accessToken);

        // Remove the loadDynamicFields call - now handled in InstagramCampaignCreator
      } else {
        setLoadingCampaigns(false);
        setError('No ad accounts found. Please create a Facebook Ad Account first.');
      }
    });
  };

  const loadInstagramAccounts = (accessToken) => {
    window.FB.api('/me/accounts', {
      fields: 'id,name,access_token,instagram_business_account{id,username,profile_picture_url,followers_count,media_count,biography}',
      access_token: accessToken
    }, function(pagesResponse) {
      if (pagesResponse.error) {
        handleApiError(pagesResponse.error, 'Loading Instagram accounts');
        return;
      }

      const instagramPages = pagesResponse.data?.filter(page => page.instagram_business_account) || [];
      
      if (instagramPages.length > 0) {
        const igAccounts = instagramPages.map(page => ({
          ...page.instagram_business_account,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: page.access_token
        }));

        // Enhanced validation for Instagram account IDs
        const validAccounts = igAccounts.filter(account => {
          if (!account.id || !account.pageId) {
            console.warn('Invalid Instagram account found:', account);
            return false;
          }
          
          // Validate that Instagram ID is numeric and properly formatted
          const instagramId = account.id.toString();
          if (!/^\d+$/.test(instagramId)) {
            console.warn('Invalid Instagram ID format:', instagramId);
            return false;
          }
          
          return true;
        });

        console.log('Valid Instagram accounts loaded:', validAccounts);

        if (validAccounts.length > 0) {
          // Validate each Instagram account with additional API call
          validateInstagramAccounts(validAccounts, accessToken);
        } else {
          console.warn('No valid Instagram business accounts found');
          setError('No valid Instagram business accounts found. Please ensure your Instagram account is properly connected to a Facebook Page and has business account status.');
        }
      } else {
        setError('No Instagram business accounts found. Please connect an Instagram business account to your Facebook Page first.');
      }
    });
  };

  // Add Instagram account validation function
  const validateInstagramAccounts = async (accounts, accessToken) => {
    const validatedAccounts = [];
    
    for (const account of accounts) {
      try {
        // Test if we can access the Instagram account with correct fields
        await new Promise((resolve, reject) => {
          window.FB.api(`/${account.id}`, {
            fields: 'id,username,biography,followers_count,media_count,profile_picture_url',
            access_token: accessToken
          }, function(response) {
            if (response.error) {
              console.warn(`Instagram account ${account.id} validation failed:`, response.error);
              // Don't add to validated accounts
              resolve();
            } else {
              console.log(`✅ Instagram account ${account.id} validated successfully`);
              validatedAccounts.push({
                ...account,
                validated: true,
                validationResponse: response
              });
              resolve();
            }
          });
        });
      } catch (error) {
        console.warn(`Error validating Instagram account ${account.id}:`, error);
      }
    }
    
    if (validatedAccounts.length > 0) {
      setInstagramAccounts(validatedAccounts);
      setSelectedInstagramAccount(validatedAccounts[0]);
      setUserData('instagram_ads_connected_accounts', validatedAccounts);
    } else {
      setError('No valid Instagram business accounts could be verified. Please ensure your Instagram account is properly connected and has the correct permissions.');
    }
  };

  // Add Instagram actor ID validation function
  const validateInstagramActorId = async (instagramActorId, accessToken) => {
    return new Promise((resolve) => {
      if (!window.FB || !instagramActorId) {
        resolve(false);
        return;
      }

      // Check if the Instagram actor ID is valid and accessible with correct fields
      window.FB.api(`/${instagramActorId}`, {
        fields: 'id,username,biography,followers_count,media_count',
        access_token: accessToken
      }, function(response) {
        if (response.error) {
          console.warn('Instagram actor validation failed:', response.error);
          
          // Check if it's a field access error
          if (response.error.code === 100 && response.error.message.includes('nonexisting field')) {
            console.warn('Field access error - trying basic validation');
            // Try with minimal fields
            window.FB.api(`/${instagramActorId}`, {
              fields: 'id,username',
              access_token: accessToken
            }, function(basicResponse) {
              if (basicResponse.error) {
                console.warn('Basic Instagram validation also failed:', basicResponse.error);
                resolve(false);
              } else {
                console.log('✅ Instagram actor ID validated with basic fields:', basicResponse);
                resolve(true);
              }
            });
          } else {
            resolve(false);
          }
        } else {
          // Verify the ID matches and account is accessible
          const isValid = response.id === instagramActorId.toString();
          
          console.log('Instagram actor validation result:', {
            id: response.id,
            username: response.username,
            isValid
          });
          
          resolve(isValid);
        }
      });
    });
  };

  // Load campaigns for the selected ad account
  const loadCampaigns = (adAccountId, accessToken) => {
    window.FB.api(`/${adAccountId}/campaigns`, {
      fields: 'id,name,objective,status,created_time,updated_time,daily_budget,lifetime_budget,start_time,stop_time',
      access_token: accessToken
    }, function(response) {
      setLoadingCampaigns(false);
      
      if (response.error) {
        handleApiError(response.error, 'Loading campaigns');
        return;
      }

      setCampaigns(response.data || []);
    });
  };

  const renderOverviewStep = () => (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 rounded-2xl p-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
          <Instagram className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Professional Instagram Advertising Management
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
          AirSpark's Instagram Advertising Integration empowers businesses to create, manage, and optimize 
          high-performing Instagram advertising campaigns with advanced analytics and automated optimization.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <Star className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-gray-900">Campaign Creation</div>
            <div className="text-xs text-gray-600">Professional campaign setup</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <BarChart3 className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-gray-900">Advanced Analytics</div>
            <div className="text-xs text-gray-600">Detailed performance insights</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <Target className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-gray-900">Audience Targeting</div>
            <div className="text-xs text-gray-600">Precise targeting tools</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
            <DollarSign className="h-6 w-6 text-purple-500 mx-auto mb-2" />
            <div className="text-sm font-semibold text-gray-900">Budget Optimization</div>
            <div className="text-xs text-gray-600">Smart budget management</div>
          </div>
        </div>

        <button
          onClick={() => setCurrentStep('requirements')}
          className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-3 mx-auto font-medium text-lg shadow-lg"
        >
          <span>Get Started with Instagram Advertising</span>
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Business Use Cases */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Designed for Business Success
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Enterprise Brands</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Scale your Instagram advertising across multiple campaigns, markets, and objectives with 
              centralized management and advanced reporting capabilities.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Briefcase className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Growing Businesses</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Leverage professional-grade advertising tools to reach new customers, drive website traffic, 
              and increase sales with optimized budget allocation.
            </p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Marketing Agencies</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              Manage Instagram advertising campaigns for multiple clients with white-label reporting, 
              automated optimization, and detailed performance analytics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRequirementsStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Setup Requirements</h2>
        <p className="text-gray-600 mb-8">
          Please ensure you meet these requirements before connecting your Instagram advertising account
        </p>
      </div>

      {/* Requirements Checklist */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <CheckCircle2 className="h-6 w-6 text-green-600 mr-3" />
          Prerequisites Checklist
        </h3>
        
        <div className="space-y-4">
          {[
            {
              title: 'Facebook Business Manager Account',
              description: 'You need an active Facebook Business Manager account to manage Instagram advertising.',
              link: 'https://business.facebook.com',
              linkText: 'Create Business Manager'
            },
            {
              title: 'Facebook Ad Account with Active Billing',
              description: 'A Facebook Ad Account with valid payment method is required to run Instagram campaigns.',
              link: 'https://adsmanager.facebook.com/billing_hub/payment_methods',
              linkText: 'Setup Payment Method',
              critical: true
            },
            {
              title: 'Instagram Business Account',
              description: 'Your Instagram account must be converted to a Business or Creator account.',
              link: 'https://help.instagram.com/502981923235522',
              linkText: 'Convert to Business'
            },
            {
              title: 'Instagram Connected to Facebook Page',
              description: 'Your Instagram business account must be connected to a Facebook Page you manage.',
              link: 'https://help.instagram.com/570895513091465',
              linkText: 'Connect Accounts'
            },
            {
              title: 'Admin Access to Facebook Page',
              description: 'You need Admin-level access to the Facebook Page connected to your Instagram account.',
              link: 'https://www.facebook.com/help/289207354498410',
              linkText: 'Check Page Roles'
            }
          ].map((item, index) => (
            <div key={index} className={`flex items-start space-x-4 p-4 border rounded-xl ${
              item.critical ? 'border-red-200 bg-red-50' : 'border-gray-200'
            }`}>
              <div className="flex-shrink-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  item.critical ? 'bg-red-100' : 'bg-green-100'
                }`}>
                  <CheckCircle className={`h-4 w-4 ${item.critical ? 'text-red-600' : 'text-green-600'}`} />
                </div>
              </div>
              <div className="flex-grow">
                <h4 className="font-semibold text-gray-900">{item.title}</h4>
                {item.critical && (
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800 mb-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    CRITICAL REQUIREMENT
                  </div>
                )}
                <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                <a 
                  href={item.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm mt-2"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  {item.linkText}
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Payment Method Setup Guide */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-yellow-900 mb-3">💳 Payment Method Setup Guide</h4>
              <div className="text-yellow-800 text-sm space-y-3">
                <p>
                  <strong>Why is this required?</strong> Facebook requires a valid payment method before any ads can run. 
                  Even if you create campaigns in "paused" state, the payment method must be active.
                </p>
                <div>
                  <strong>Supported Payment Methods:</strong>
                  <ul className="list-disc list-inside mt-1 ml-4">
                    <li>Credit Cards (Visa, Mastercard, American Express)</li>
                    <li>Debit Cards (where supported)</li>
                    <li>PayPal (in select regions)</li>
                    <li>Bank transfers (for large accounts)</li>
                  </ul>
                </div>
                <div>
                  <strong>Setup Steps:</strong>
                  <ol className="list-decimal list-inside mt-1 ml-4">
                    <li>Go to Facebook Ads Manager</li>
                    <li>Click "Billing" in the menu</li>
                    <li>Select "Payment Methods"</li>
                    <li>Click "Add Payment Method"</li>
                    <li>Enter your card details and save</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <button
            onClick={() => setCurrentStep('permissions')}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
          >
            <span>Continue to Permissions</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderPermissionsStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Data Access & Permissions</h2>
        <p className="text-gray-600 mb-8">
          AirSpark requires specific permissions to provide professional Instagram advertising management services
        </p>
      </div>

      {/* Data Privacy & Security */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8">
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-blue-900 mb-4">Enterprise-Grade Security & Privacy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
              <div>
                <h4 className="font-semibold mb-2">🔒 Data Protection</h4>
                <ul className="space-y-1">
                  <li>• All data encrypted in transit and at rest</li>
                  <li>• SOC 2 Type II compliant infrastructure</li>
                  <li>• GDPR and CCPA compliance</li>
                  <li>• Regular security audits and monitoring</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">🛡️ Access Control</h4>
                <ul className="space-y-1">
                  <li>• Role-based access controls</li>
                  <li>• Two-factor authentication required</li>
                  <li>• Activity logging and audit trails</li>
                  <li>• Automatic session management</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Permissions */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <UserCheck className="h-6 w-6 text-green-600 mr-3" />
          Required Permissions & Business Justification
        </h3>
        
        <div className="space-y-6">
          {REQUIRED_PERMISSIONS.map((permission, index) => (
            <div key={index} className="border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${permission.required ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{permission.name}</code>
                  <span className={`text-xs px-2 py-1 rounded-full ${permission.required ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {permission.required ? 'Required' : 'Optional'}
                  </span>
                </div>
              </div>
              
              <h4 className="font-semibold text-gray-900 mb-2">{permission.purpose}</h4>
              <p className="text-gray-600 mb-3">{permission.description}</p>
              
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm">
                  <span className="font-medium text-gray-700">Business Use Case: </span>
                  <span className="text-gray-600">{permission.businessUse}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-green-900 mb-2">Your Data Rights</h4>
              <div className="text-sm text-green-800 space-y-2">
                <p>• You maintain full ownership of your advertising data and can revoke access at any time</p>
                <p>• AirSpark only accesses data necessary to provide advertising management services</p>
                <p>• All data processing complies with Meta's Platform Policies and applicable privacy laws</p>
                <p>• You can request data deletion or export your data at any time through our support team</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center space-y-4">
          <button
            onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
            className="text-blue-600 hover:text-blue-700 flex items-center space-x-2 mx-auto"
          >
            <BookOpen className="h-5 w-5" />
            <span>View Complete Privacy Policy & Terms</span>
          </button>
          
          {showPrivacyInfo && (
            <div className="bg-gray-50 rounded-xl p-6 text-left">
              <h4 className="font-semibold text-gray-900 mb-3">Privacy Policy & Data Usage</h4>
              <div className="text-sm text-gray-700 space-y-3">
                <p>
                  <strong>Data Collection:</strong> AirSpark collects only the minimum data necessary to provide Instagram 
                  advertising management services, including campaign performance metrics, audience insights, and account information.
                </p>
                <p>
                  <strong>Data Usage:</strong> Your data is used exclusively to create, manage, and optimize your Instagram 
                  advertising campaigns. We do not share your data with third parties or use it for any purpose other than 
                  providing our services.
                </p>
                <p>
                  <strong>Data Retention:</strong> We retain your data only as long as necessary to provide our services 
                  or as required by law. You can request data deletion at any time.
                </p>
                <p>
                  <strong>Security:</strong> All data is encrypted, stored securely, and accessed only by authorized 
                  personnel for legitimate business purposes.
                </p>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setCurrentStep('connect')}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
          >
            <span>I Understand - Connect Account</span>
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderConnectStep = () => (
    <div className="space-y-8">
      {renderDemoModeToggle()}
      {isInSandboxMode && renderSandboxManagement()}
      
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Instagram Advertising Account</h2>
        <p className="text-gray-600 mb-8">
          Complete the connection process to start managing your Instagram advertising campaigns with AirSpark
        </p>
      </div>

      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-pink-600 to-purple-600 rounded-2xl mb-6 shadow-lg">
            <Instagram className="h-10 w-10 text-white" />
          </div>
          
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Secure OAuth Connection</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Click the button below to securely connect your Instagram advertising account through Meta's official OAuth system. 
            This ensures your credentials remain secure and are never stored by AirSpark.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-3">
              <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <h4 className="font-semibold text-blue-900 mb-2">What happens next?</h4>
                <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                  <li>You'll be redirected to Meta's secure login page</li>
                  <li>Log in with your Facebook account credentials</li>
                  <li>Review and approve the requested permissions</li>
                  <li>You'll be redirected back to AirSpark with a secure connection</li>
                  <li>Start creating and managing your Instagram advertising campaigns</li>
                </ol>
              </div>
            </div>
          </div>

          <button
            onClick={handleConnect}
            disabled={loading}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-3 mx-auto font-medium text-lg shadow-lg disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Instagram className="h-6 w-6" />
            )}
            <span>{loading ? 'Connecting...' : 'Connect Instagram Advertising Account'}</span>
          </button>

          <p className="text-xs text-gray-500 mt-4">
            By connecting your account, you agree to AirSpark's Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );

  const handleConnect = () => {
    if (!window.FB) {
      setError('Facebook SDK not loaded. Please refresh the page and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    // Clear any existing session data first
    removeUserData('instagram_ads_token');
    removeUserData('instagram_ads_account');
    removeUserData('instagram_ads_connected_accounts');

    window.FB.login((response) => {
      if (response.status === 'connected') {
        const accessToken = response.authResponse.accessToken;
        
        // Validate the new token before proceeding
        validateAccessToken(accessToken).then(isValid => {
          if (isValid) {
            setUserAccessToken(accessToken);
            setUserData('instagram_ads_token', accessToken);
            setIsConnected(true);
            setCurrentStep('success');
            
            // Load account data
            loadAccountData(accessToken);
          } else {
            setError('Failed to validate access token. Please try connecting again.');
          }
          setLoading(false);
        }).catch(err => {
          console.error('Token validation error:', err);
          setError('Failed to validate connection. Please try again.');
          setLoading(false);
        });
      } else if (response.status === 'not_authorized') {
        setError('You need to authorize AirSpark to access your Instagram advertising account.');
        setLoading(false);
      } else {
        setError('Failed to connect to Facebook. Please check your internet connection and try again.');
        setLoading(false);
      }
    }, {
      scope: REQUIRED_PERMISSIONS.map(p => p.name).join(','),
      return_scopes: true,
      auth_type: 'rerequest' // Force re-authentication for fresh token
    });
  };

  const renderSuccessStep = () => (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-2xl mb-6">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Successfully Connected!</h2>
      <p className="text-gray-600 mb-8">
        Your Instagram advertising account is now connected to AirSpark. You can start creating and managing campaigns.
      </p>
      <button
        onClick={() => setCurrentStep('dashboard')}
        className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200"
      >
        Go to Campaign Dashboard
      </button>
    </div>
  );

  // Demo campaigns constant removed - using real campaign data only

  const renderDemoModeToggle = () => (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 mb-8">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
            <Star className="h-6 w-6 text-purple-600" />
          </div>
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-purple-900 mb-2">
            📺 Interactive Demo Available
          </h3>
          <p className="text-purple-800 text-sm mb-4">
            Experience the full Instagram advertising workflow with our interactive demo. Perfect for app reviewers 
            and potential users to see all features in action.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowDemoFlow(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <Play className="h-4 w-4" />
              <span>Start Interactive Demo</span>
            </button>
            <button
              onClick={() => setIsInSandboxMode(!isInSandboxMode)}
              className="bg-white border border-purple-300 text-purple-700 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-sm font-medium"
            >
              {isInSandboxMode ? 'Exit' : 'Enter'} Sandbox Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInteractiveDemo = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              🎬 Instagram Advertising Demo - Step {demoStep} of 5
            </h2>
            <button
              onClick={() => setShowDemoFlow(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Demo Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div
                  key={step}
                  className={`flex-1 h-2 rounded-full ${
                    step <= demoStep ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Account Setup</span>
              <span>Campaign Creation</span>
              <span>Audience Targeting</span>
              <span>Budget & Bidding</span>
              <span>Analytics & Optimization</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {demoStep === 1 && renderDemoStep1()}
          {demoStep === 2 && renderDemoStep2()}
          {demoStep === 3 && renderDemoStep3()}
          {demoStep === 4 && renderDemoStep4()}
          {demoStep === 5 && renderDemoStep5()}
          
          <div className="flex justify-between mt-8">
            <button
              onClick={() => setDemoStep(Math.max(1, demoStep - 1))}
              disabled={demoStep === 1}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setDemoStep(Math.min(5, demoStep + 1))}
              disabled={demoStep === 5}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {demoStep === 5 ? 'Complete Demo' : 'Next Step'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDemoStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Step 1: Account Setup & Connection</h3>
      
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="font-semibold text-blue-900 mb-3">🔗 OAuth Connection Process</h4>
        <div className="space-y-4">
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900">Facebook OAuth Integration</span>
            </div>
            <p className="text-sm text-gray-600 ml-11">
              Secure connection using Facebook's OAuth 2.0 with explicit permission scopes
            </p>
          </div>
          
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900">Permissions Requested</span>
            </div>
            <div className="text-sm text-gray-600 ml-11 space-y-1">
              <div>• <code>ads_management</code> - Create and manage advertising campaigns</div>
              <div>• <code>ads_read</code> - Read campaign performance and insights</div>
              <div>• <code>business_management</code> - Access Business Manager accounts</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <h4 className="font-semibold text-green-900 mb-3">✅ Connected Accounts</h4>
        <div className="space-y-2">
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-3">
              <Instagram className="h-6 w-6 text-pink-600" />
              <div>
                <div className="font-medium text-gray-900">@airspark_demo</div>
                <div className="text-sm text-gray-600">Instagram Business Account • 15.2K followers</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-3">
              <Building className="h-6 w-6 text-blue-600" />
              <div>
                <div className="font-medium text-gray-900">AirSpark Marketing Demo</div>
                <div className="text-sm text-gray-600">Ad Account ID: act_123456789 • $5,000 spend limit</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDemoStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Step 2: Campaign Creation</h3>
      
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-4">📝 Campaign Setup Form</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Name</label>
            <input
              type="text"
              value="Holiday Gift Guide 2024"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Objective</label>
            <select value="CONVERSIONS" readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
              <option value="CONVERSIONS">Conversions</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Daily Budget</label>
            <input
              type="number"
              value="50"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Duration</label>
            <input
              type="number"
              value="14"
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
            <span className="text-xs text-gray-500">days</span>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
        <h4 className="font-semibold text-purple-900 mb-3">🎯 Campaign Objectives Available</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Brand Awareness', desc: 'Reach people likely to remember your ads' },
            { name: 'Reach', desc: 'Show ads to maximum number of people' },
            { name: 'Traffic', desc: 'Drive traffic to your website or app' },
            { name: 'Engagement', desc: 'Get more likes, shares, and comments' },
            { name: 'App Installs', desc: 'Get people to install your app' },
            { name: 'Video Views', desc: 'Get more people to watch your videos' },
            { name: 'Lead Generation', desc: 'Collect leads for your business' },
            { name: 'Conversions', desc: 'Get people to take action on your site' }
          ].map((objective, index) => (
            <div key={index} className="bg-white border border-purple-200 rounded-lg p-3">
              <div className="font-medium text-gray-900">{objective.name}</div>
              <div className="text-sm text-gray-600">{objective.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDemoStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Step 3: Advanced Audience Targeting</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">👥 Demographics</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Age Range</label>
              <div className="flex items-center space-x-4">
                <input type="number" value="25" readOnly className="w-20 px-3 py-2 border rounded bg-gray-50" />
                <span>to</span>
                <input type="number" value="45" readOnly className="w-20 px-3 py-2 border rounded bg-gray-50" />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" checked readOnly className="mr-2" />
                  <span>All genders</span>
                </label>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Locations</label>
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <Globe className="h-4 w-4 text-gray-600" />
                  <span className="text-sm">United States, Canada, United Kingdom</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">🎯 Interests & Behaviors</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Interests</label>
              <div className="space-y-2">
                {['Fashion', 'Shopping', 'Lifestyle', 'Beauty'].map((interest) => (
                  <div key={interest} className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                    <span className="text-sm text-blue-800">{interest}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Behaviors</label>
              <div className="space-y-2">
                {['Online shoppers', 'Mobile device users', 'Frequent travelers'].map((behavior) => (
                  <div key={behavior} className="bg-green-50 border border-green-200 rounded-lg p-2">
                    <span className="text-sm text-green-800">{behavior}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
        <h4 className="font-semibold text-yellow-900 mb-3">📊 Estimated Audience Size</h4>
        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-900">2.1M</div>
            <div className="text-sm text-yellow-700">Potential Reach</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-900">✅</div>
            <div className="text-sm text-yellow-700">Estimate Status</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDemoStep4 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Step 4: Budget Management & Bidding</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">💰 Budget Settings</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Budget Type</label>
              <div className="flex items-center space-x-4">
                <div className="flex-1 px-4 py-2 rounded-lg font-medium text-sm bg-pink-600 text-white shadow-md flex items-center justify-center space-x-2">
                  <span>Daily Budget</span>
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div className="flex-1 px-4 py-2 rounded-lg font-medium text-sm bg-gray-100 text-gray-700">
                  <span>Lifetime Budget</span>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Budget ($) *
              </label>
              <input
                type="number"
                value="50"
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum: $5.00 per day
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={new Date().toISOString().split('T')[0]}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h4 className="font-semibold text-gray-900 mb-4">🎯 Bidding Strategy</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bid Strategy</label>
              <select value="LOWEST_COST_WITHOUT_CAP" readOnly className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                <option value="LOWEST_COST_WITHOUT_CAP">Lowest cost</option>
                <option value="LOWEST_COST_WITH_BID_CAP">Lowest cost with bid cap</option>
                <option value="TARGET_COST">Target cost</option>
              </select>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-900 mb-2">📈 Optimization Goal</h5>
              <div className="text-sm text-blue-800">
                <div className="font-medium">Conversions</div>
                <div>Optimize for people most likely to complete purchases on your website</div>
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h5 className="font-medium text-green-900 mb-2">💡 Budget Recommendation</h5>
              <div className="text-sm text-green-800">
                Based on your targeting and objectives, we recommend a daily budget of $45-$75 for optimal performance.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDemoStep5 = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Step 5: Analytics & Performance Monitoring</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { label: 'Impressions', value: '0', change: 'N/A', icon: Eye, color: 'blue' },
          { label: 'Clicks', value: '0', change: 'N/A', icon: Target, color: 'green' },
          { label: 'Conversions', value: '0', change: 'N/A', icon: TrendingUp, color: 'purple' }
        ].map((metric, index) => (
          <div key={index} className={`bg-${metric.color}-50 border border-${metric.color}-200 rounded-xl p-6`}>
            <div className="flex items-center justify-between mb-4">
              <metric.icon className={`h-8 w-8 text-${metric.color}-600`} />
              <span className={`text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full`}>
                {metric.change}
              </span>
            </div>
            <div className={`text-2xl font-bold text-${metric.color}-900`}>{metric.value}</div>
            <div className={`text-sm text-${metric.color}-700`}>{metric.label}</div>
            <div className="text-xs text-gray-500 mt-1">Start campaigns to see data</div>
          </div>
        ))}
      </div>
      
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-4">📊 Campaign Performance Table</h4>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <div className="text-gray-500 mb-2">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Campaign Performance Data</h3>
          <p className="text-gray-600 mb-4">Create and run campaigns to see detailed performance metrics here</p>
          <div className="text-sm text-gray-500">
            Real campaign data will show:
            <ul className="mt-2 space-y-1">
              <li>• Campaign names and status</li>
              <li>• Budget allocation and spend</li>
              <li>• Impressions, clicks, and conversions</li>
              <li>• Click-through rates (CTR) and ROAS</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-6">
        <h4 className="font-semibold text-green-900 mb-3">🎉 Demo Complete!</h4>
        <div className="text-green-800 space-y-2">
          <p>You've experienced the complete Instagram advertising workflow in AirSpark:</p>
          <ul className="list-disc list-inside text-sm space-y-1 ml-4">
            <li>Secure account connection with proper OAuth flow</li>
            <li>Professional campaign creation with advanced options</li>
            <li>Sophisticated audience targeting and segmentation</li>
            <li>Intelligent budget management and bidding strategies</li>
            <li>Comprehensive analytics and performance monitoring</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderSandboxManagement = () => (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 mb-8">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Settings className="h-6 w-6 text-orange-600" />
          </div>
        </div>
        <div className="flex-grow">
          <h3 className="text-lg font-semibold text-orange-900 mb-2">
            🧪 Sandbox Mode Active
          </h3>
          <p className="text-orange-800 text-sm mb-4">
            You're currently in sandbox mode. This allows you to test all advertising features without spending real money. 
            Perfect for development and app review purposes.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">📊 Sandbox Features</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Create test campaigns with sample data</li>
                <li>• Simulate audience targeting</li>
                <li>• Test budget and bidding features</li>
                <li>• View simulated performance metrics</li>
              </ul>
            </div>
            
            <div className="bg-white border border-orange-200 rounded-lg p-4">
              <h4 className="font-semibold text-orange-900 mb-2">🔒 Sandbox Limitations</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• No real ad spend or delivery</li>
                <li>• Limited to 1 sandbox ad account</li>
                <li>• Simulated performance data only</li>
                <li>• Cannot reach real audience</li>
              </ul>
            </div>
          </div>
          
          <button
            onClick={() => setIsInSandboxMode(false)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            Exit Sandbox Mode
          </button>
        </div>
      </div>
    </div>
   );

  const renderUseCaseDocumentation = () => (
    <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 mb-8">
      <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
        <BookOpen className="h-6 w-6 text-blue-600 mr-3" />
        Comprehensive Use Case Documentation
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          {
            title: '🏢 Enterprise Marketing Teams',
            description: 'Large organizations managing multiple Instagram advertising campaigns across different markets and product lines.',
            features: ['Multi-account management', 'Advanced reporting', 'Team collaboration', 'Budget approval workflows'],
            example: 'A global fashion retailer running seasonal campaigns across 15 countries with centralized oversight.'
          },
          {
            title: '📈 Marketing Agencies',
            description: 'Digital marketing agencies managing Instagram advertising for multiple clients with white-label solutions.',
            features: ['Client management', 'White-label reporting', 'Permission-based access', 'Automated optimization'],
            example: 'A digital agency managing 50+ client accounts with automated reporting and campaign optimization.'
          },
          {
            title: '🛍️ E-commerce Businesses',
            description: 'Online retailers using Instagram advertising to drive product discovery and sales conversions.',
            features: ['Product catalog sync', 'Dynamic ads', 'Conversion tracking', 'ROI optimization'],
            example: 'An online jewelry store using dynamic product ads to retarget website visitors with personalized recommendations.'
          },
          {
            title: '📱 Mobile App Developers',
            description: 'App developers promoting mobile applications through Instagram advertising to drive installs and engagement.',
            features: ['App install campaigns', 'Deep linking', 'Event tracking', 'Lookalike audiences'],
            example: 'A gaming company promoting their new mobile game with video ads targeting similar app users.'
          },
          {
            title: '🎓 Educational Institutions',
            description: 'Schools and universities using Instagram advertising for student recruitment and program promotion.',
            features: ['Lead generation forms', 'Demographic targeting', 'Event promotion', 'Campus tour bookings'],
            example: 'A university targeting high school students with program information and virtual campus tour sign-ups.'
          },
          {
            title: '🏥 Healthcare & Wellness',
            description: 'Healthcare providers and wellness brands promoting services while maintaining compliance.',
            features: ['Compliant targeting', 'Service promotion', 'Appointment booking', 'Educational content'],
            example: 'A dental practice promoting preventive care services to local residents with appointment booking integration.'
          }
        ].map((useCase, index) => (
          <div key={index} className="border border-gray-200 rounded-xl p-6">
            <h4 className="font-semibold text-gray-900 mb-3">{useCase.title}</h4>
            <p className="text-gray-600 text-sm mb-4">{useCase.description}</p>
            
            <div className="mb-4">
              <h5 className="font-medium text-gray-800 mb-2">Key Features:</h5>
              <ul className="text-xs text-gray-600 space-y-1">
                {useCase.features.map((feature, idx) => (
                  <li key={idx}>• {feature}</li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-3">
              <h5 className="font-medium text-gray-800 mb-1 text-xs">Real-World Example:</h5>
              <p className="text-xs text-gray-600">{useCase.example}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderConnectedDashboard = () => (
    <div className="space-y-6">
      {/* Header with Account Info */}
      <div className="bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 rounded-2xl p-6">
        <div className="flex itemscenter justify-between mb-4">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Instagram className="h-8 w-8 text-white" />
            </div>
            <div className="ml-4">
              <h2 className="text-2xl font-bold text-gray-900">Instagram Advertising Dashboard</h2>
              <p className="text-gray-600">Manage your Instagram advertising campaigns</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Connected Account</div>
            <div className="font-semibold text-gray-900">
              {selectedInstagramAccount?.username || 'Instagram Business Account'}
            </div>
          </div>
               </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">{campaigns.length}</div>
            <div className="text-sm text-gray-600">Active Campaigns</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-green-600">
              {selectedInstagramAccount?.followers_count ? 
                `${(selectedInstagramAccount.followers_count / 1000).toFixed(1)}K` : '0'}
            </div>
            <div className="text-sm text-gray-600">Followers</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">
              {adAccount?.currency || 'USD'}
            </div>
            <div className="text-sm text-gray-600">Currency</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-2xl font-bold text-orange-600">Live</div>
            <div className="text-sm text-gray-600">Status</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              {
                id: 'overview',
                label: 'Overview',
                icon: Instagram
              },
              {
                id: 'campaigns',
                label: 'Campaigns',
                icon: Target
              },
              {
                id: 'create',
                label: 'Create Campaign',
                icon: Plus
              },
              {
                id: 'analytics',
                label: 'Analytics',
                icon: TrendingUp
              },
              {
                id: 'settings',
                label: 'Settings',
                icon: Settings
              }
            ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-pink-600 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </button>
          ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'campaigns' && renderCampaignsTab()}
          {activeTab === 'create' && renderCreateCampaignTab()}
          {activeTab === 'analytics' && renderAnalyticsTab()}
          {activeTab === 'settings' && renderSettingsTab()}
        </div>
      </div>
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Campaign Overview</h3>
      
      {campaigns.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No campaigns yet</h4>
          <p className="text-gray-600 mb-6">Get started by creating your first Instagram advertising campaign.</p>
          <button
            onClick={() => setActiveTab('create')}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2 mx-auto"
          >
            <Plus className="h-5 w-5" />
            <span>Create Your First Campaign</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.slice(0, 6).map((campaign) => (
            <div key={campaign.id} className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-gray-900 truncate">{campaign.name}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  campaign.status === 'ACTIVE' 
                    ? 'bg-green-100 text-green-700' 
                    : campaign.status === 'PAUSED'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {campaign.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <div>Objective: {campaign.objective}</div>
                <div>Budget: {campaign.daily_budget ? `$${(campaign.daily_budget / 100).toFixed(2)}/day` : 'Lifetime'}</div>
                <div>Created: {new Date(campaign.created_time).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderCampaignsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900">All Campaigns</h3>
        <button
          onClick={() => setActiveTab('create')}
          className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-pink-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>New Campaign</span>
        </button>
      </div>

      {loadingCampaigns ? (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
          <p className="text-gray-600">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-12">
          <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No campaigns found</h4>
          <p className="text-gray-600">Create your first Instagram advertising campaign to get started.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Campaign</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Objective</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Budget</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Created</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{campaign.name}</div>
                      <div className="text-sm text-gray-500">ID: {campaign.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        campaign.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-700' 
                          : campaign.status === 'PAUSED'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {campaign.status}

                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-900">{campaign.objective}</td>
                    <td className="py-3 px-4 text-gray-900">
                      {campaign.daily_budget 
                        ? `$${(campaign.daily_budget / 100).toFixed(2)}/day`
                        : campaign.lifetime_budget 
                        ? `$${(campaign.lifetime_budget / 100).toFixed(2)} lifetime`
                        : 'Not set'
                      }
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(campaign.created_time).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleCampaignStatus(campaign.id, campaign.status)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title={campaign.status === 'ACTIVE' ? 'Pause' : 'Resume'}
                        >
                          {campaign.status === 'ACTIVE' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </button>
                        <button className="p-1 text-gray-400 hover:text-gray-600" title="Edit">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:red-600" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const toggleCampaignStatus = (campaignId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    
    if (!userAccessToken) {
      setError('Access token not available. Please reconnect your account.');
      return;
    }
    
    window.FB.api(`/${campaignId}`, 'POST', {
      status: newStatus,
      access_token: userAccessToken
    }, function(response) {
      if (response.error) {
        handleApiError(response.error, 'Updating campaign status');
        return;
      }
      
      // Reload campaigns on success
      if (adAccount) {
        loadCampaigns(adAccount.id, userAccessToken);
      }
    });
  };

  const renderCreateCampaignTab = () => (
    <InstagramCampaignCreator
      userAccessToken={userAccessToken}
      adAccount={adAccount}
      selectedInstagramAccount={selectedInstagramAccount}
      onCampaignCreated={() => {
        setActiveTab('campaigns');
        if (adAccount) {
          loadCampaigns(adAccount.id, userAccessToken);
        }
      }}
      onError={setError}
      onCancel={() => setActiveTab('campaigns')}
    />
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Campaign Analytics</h3>
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h4 className="text-lg font-semibold text-gray-900 mb-2">Analytics Dashboard</h4>
        <p className="text-gray-600">Advanced campaign analytics and performance insights coming soon.</p>
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-gray-900">Account Settings</h3>
      
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Connected Accounts</h4>
        
        {selectedInstagramAccount && (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
              <Instagram className="h-8 w-8 text-pink-600" />
              <div className="flex-grow">
                <div className="font-medium text-gray-900">
                  @{selectedInstagramAccount.username}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedInstagramAccount.followers_count?.toLocaleString()} followers
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Connected
              </span>
            </div>
          </div>
        )}
        
        {adAccount && (
          <div className="mt-4">
            <div className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg">
              <Building className="h-8 w-8 text-blue-600" />
              <div className="flex-grow">
                <div className="font-medium text-gray-900">{adAccount.name}</div>
                <div className="text-sm text-gray-600">
                  Ad Account • {adAccount.currency} • {adAccount.account_status}
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                Active
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Instagram className="h-8 w-8 text-pink-600" />
              <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Instagram Advertising</span>
            </div>
            {isConnected && (
              <button
                onClick={() => {
                  removeUserData('instagram_ads_token');
                  setIsConnected(false);
                  setCurrentStep('overview');
                }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </header>
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">Error</h3>
              </div>
              <div className="text-red-700 mb-4">
                {typeof error === 'string' ? error : (
                  typeof error === 'object' && error !== null ? (
                    React.isValidElement(error) ? error : JSON.stringify(error)
                  ) : String(error)
                )}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Dismiss
                </button>
                {(typeof error === 'string' && (error.includes('expired') || error.includes('token'))) ? (
                  <button
                    onClick={() => {
                      setError(null);
                      setCurrentStep('connect');
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm font-medium"
                  >
                    Reconnect Account
                  </button>
                ) : null}
              </div>
            </div>
          )}

          {showDemoFlow && renderInteractiveDemo()}

          {!isConnected ? (
            <>
              {/* Step Progress Indicator */}
              <div className="flex items-center justify-between max-w-2xl mx-auto mb-8">
                {[{
                  key: 'overview', label: 'Overview', icon: Instagram
                },
                {
                  key: 'requirements', label: 'Requirements', icon: CheckCircle
                },
                {
                  key: 'permissions', label: 'Permissions', icon: Shield
                },
                {
                  key: 'connect', label: 'Connect', icon: ExternalLink
                },
                {
                  key: 'success', label: 'Success', icon: CheckCircle
                }
                ].map((step, index) => (
                  <div key={step.key} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      currentStep === step.key ? 'border-pink-600 bg-pink-600 text-white' :
                      ['overview', 'requirements', 'permissions', 'connect'].indexOf(currentStep) > index ? 'border-green-600 bg-green-600 text-white' :
                      'border-gray-300 bg-white text-gray-400'
                    }`}>
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div className="ml-2 text-sm font-medium text-gray-700">{step.label}</div>
                    {index < 4 && <div className={`w-8 h-0.5 ml-4 ${
                      ['overview', 'requirements', 'permissions', 'connect'].indexOf(currentStep) > index ? 'bg-green-600' : 'bg-gray-300'
                    }`} />}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              {currentStep === 'overview' && (
                <div className="space-y-8">
                  {renderOverviewStep()}
                  {renderUseCaseDocumentation()}
                </div>
              )}
              {currentStep === 'requirements' && renderRequirementsStep()}
              {currentStep === 'permissions' && renderPermissionsStep()}
              {currentStep === 'connect' && renderConnectStep()}
              {currentStep === 'success' && renderSuccessStep()}
            </>
          ) : (
            renderConnectedDashboard()
          )}
        </div>
      </div>
    </div>
  );
}

export default InstagramAdsIntegration;
