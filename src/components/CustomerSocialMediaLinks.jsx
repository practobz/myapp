import React, { useState, useEffect } from 'react';
import { 
  Facebook, Instagram, Plus, Trash2, CheckCircle, AlertCircle, Settings, 
  RefreshCw, Eye, EyeOff, Youtube, User, ChevronDown, ChevronUp, Search, ArrowLeft
} from 'lucide-react';
import { useAuth } from '../admin/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const FACEBOOK_APP_ID = '4416243821942660';

// YouTube Integration Constants (same as YouTubeIntegration.jsx)
const YOUTUBE_CLIENT_ID = '472498493428-lt5thlt6do1e5ep1spuhdjgv8oebnva2.apps.googleusercontent.com';
const YOUTUBE_API_KEY = 'AIzaSyBGJ8wSwTfYQrqu0fUueDBApGuJKEO8NmM';
const YOUTUBE_DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'];
const YOUTUBE_SCOPES = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.upload';

function CustomerSocialMediaLinks({ customerId: propCustomerId }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  
  // YouTube state
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [gapiClientReady, setGapiClientReady] = useState(false);
  const [youtubeTokenClient, setYoutubeTokenClient] = useState(null);
  
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(null);
  const [showTokens, setShowTokens] = useState({});

  // New state for customer grouping
  const [customerAccounts, setCustomerAccounts] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [searchTerm, setSearchTerm] = useState('');

  // Use customer ID from props or try multiple sources
  let customerId = propCustomerId;
  if (!customerId && currentUser) {
    customerId = currentUser.userId || currentUser.id || currentUser._id || currentUser.customer_id;
  }
  if (!customerId) {
    // Try localStorage as fallback
    const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    customerId = storedUser.userId || storedUser.id || storedUser._id || storedUser.customer_id;
  }
  if (!customerId) {
    // Try alternative localStorage key
    const authUser = JSON.parse(localStorage.getItem('user') || '{}');
    customerId = authUser.userId || authUser.id || authUser._id || authUser.customer_id;
  }

  // Log for debugging
  console.log('🔍 CustomerSocialMediaLinks Customer ID search:', {
    propCustomerId,
    currentUser,
    finalCustomerId: customerId,
    found: !!customerId
  });

  // Load Facebook SDK
  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      setFbSdkLoaded(true);
      return;
    }
    
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v19.0'
      });
      setFbSdkLoaded(true);
    };
    
    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) return;
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  // Load Google API scripts for YouTube
  useEffect(() => {
    // Only load if not already loaded
    if (!document.querySelector('script[src="https://apis.google.com/js/api.js"]')) {
      const gapiScript = document.createElement('script');
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => setGapiLoaded(true);
      gapiScript.onerror = () => console.error('Failed to load Google API script.');
      document.head.appendChild(gapiScript);
    } else {
      setGapiLoaded(true);
    }

    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const gisScript = document.createElement('script');
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = () => setGisLoaded(true);
      gisScript.onerror = () => console.error('Failed to load Google Identity Services script.');
      document.head.appendChild(gisScript);
    } else {
      setGisLoaded(true);
    }
  }, []);

  // Initialize GAPI client for YouTube
  useEffect(() => {
    if (gapiLoaded && window.gapi) {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: YOUTUBE_API_KEY,
            discoveryDocs: YOUTUBE_DISCOVERY_DOCS,
          });
          setGapiClientReady(true);
        } catch (err) {
          console.error('Failed to initialize Google API client:', err);
        }
      });
    }
  }, [gapiLoaded]);

  // Initialize YouTube token client
  useEffect(() => {
    if (gisLoaded && window.google && window.google.accounts) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: YOUTUBE_CLIENT_ID,
          scope: YOUTUBE_SCOPES,
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              handleYouTubeToken(tokenResponse);
            }
          },
        });
        setYoutubeTokenClient(client);
      } catch (err) {
        console.error('Failed to initialize YouTube token client:', err);
      }
    }
  }, [gisLoaded]);

  useEffect(() => {
    // Fetch all customer accounts instead of just current customer
    if (propCustomerId) {
      // If specific customer ID is provided, fetch only that customer
      fetchConnectedAccounts();
    } else {
      // If no specific customer, fetch all customers with their accounts
      fetchAllCustomerAccounts();
    }
  }, [propCustomerId]);

  const fetchAllCustomerAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/all-customers`);
      const data = await response.json();
      
      if (data.success) {
        // Group accounts by customer ID to ensure unique grouping
        const grouped = {};
        data.accounts.forEach(account => {
          // Use customer ID as the primary key for grouping
          const customerKey = account.customerId;
          
          if (!grouped[customerKey]) {
            grouped[customerKey] = {
              customerId: account.customerId,
              customerName: account.customer?.businessName || 
                          account.customer?.name || 
                          account.customerName || 
                          `Customer ${account.customerId}`,
              customerEmail: account.customer?.email,
              customerBusinessName: account.customer?.businessName,
              accounts: []
            };
          }
          grouped[customerKey].accounts.push(account);
        });
        setCustomerAccounts(grouped);
        
        // Auto-expand if only one customer
        if (Object.keys(grouped).length === 1) {
          const customerKey = Object.keys(grouped)[0];
          setExpandedCustomers({ [customerKey]: true });
        }
      }
    } catch (error) {
      console.error('Error fetching all customer accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectedAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
      const data = await response.json();
      
      if (data.success) {
        setConnectedAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // YouTube handlers
  const connectYouTubeAccount = () => {
    if (!gapiClientReady || !youtubeTokenClient) {
      alert('YouTube API is not ready yet. Please wait and try again.');
      return;
    }

    setConnecting('youtube');
    
    try {
      youtubeTokenClient.requestAccessToken();
    } catch (err) {
      console.error('Error requesting YouTube access token:', err);
      setConnecting(null);
      alert('Failed to connect YouTube account. Please try again.');
    }
  };

  const handleYouTubeToken = async (tokenResponse) => {
    try {
      // Validate we have the required APIs available
      if (!window.gapi || !window.gapi.client || !window.gapi.client.youtube) {
        throw new Error('YouTube API not properly initialized');
      }

      // Set token temporarily to fetch user info
      window.gapi.client.setToken({ access_token: tokenResponse.access_token });
      
      // Fetch channel info to get user details
      const response = await window.gapi.client.youtube.channels.list({
        part: 'snippet,contentDetails,statistics',
        mine: true
      });
      
      if (response.result.items && response.result.items.length > 0) {
        const channel = response.result.items[0];
        
        const accountData = {
          platform: 'youtube',
          platformUserId: channel.id,
          name: channel.snippet.title,
          email: channel.snippet.customUrl || `${channel.snippet.title}@youtube`,
          profilePicture: channel.snippet.thumbnails.default?.url,
          accessToken: tokenResponse.access_token,
          pages: [], // YouTube doesn't have pages
          channels: [
            {
              id: channel.id,
              name: channel.snippet.title,
              description: channel.snippet.description,
              subscriberCount: channel.statistics.subscriberCount,
              videoCount: channel.statistics.videoCount,
              viewCount: channel.statistics.viewCount,
              thumbnails: channel.snippet.thumbnails,
              customUrl: channel.snippet.customUrl,
              publishedAt: channel.snippet.publishedAt
            }
          ],
          connectedAt: new Date().toISOString()
        };
        
        console.log('📤 Saving YouTube account data:', {
          channelCount: accountData.channels.length,
          hasValidToken: !!accountData.accessToken
        });
        
        saveAccountConnection(accountData);
      } else {
        setConnecting(null);
        alert('No YouTube channel found for this account');
      }
    } catch (err) {
      console.error('Error handling YouTube token:', err);
      setConnecting(null);
      alert('Failed to connect YouTube account: ' + err.message);
    }
  };

  // Facebook handlers
  const connectFacebookAccount = () => {
    if (!fbSdkLoaded || !window.FB) {
      alert('Facebook SDK is not loaded yet. Please try again in a moment.');
      return;
    }

    setConnecting('facebook');

    window.FB.login(response => {
      if (response.status === 'connected') {
        const accessToken = response.authResponse.accessToken;
        const userId = response.authResponse.userID;
        
        // First, check what permissions were actually granted
        window.FB.api('/me/permissions', { access_token: accessToken }, function(permResponse) {
          console.log('🔍 Granted permissions:', permResponse.data);
          
          const grantedPerms = permResponse.data || [];
          const requiredPerms = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'];
          const missingPerms = requiredPerms.filter(perm => 
            !grantedPerms.some(p => p.permission === perm && p.status === 'granted')
          );
          
          if (missingPerms.length > 0) {
            setConnecting(null);
            alert(`Missing required permissions: ${missingPerms.join(', ')}. Please try connecting again and grant all permissions.`);
            return;
          }
          
          // Get user data
          window.FB.api('/me', { 
            fields: 'id,name,email,picture',
            access_token: accessToken 
          }, function(userResponse) {
            if (!userResponse || userResponse.error) {
              setConnecting(null);
              alert('Failed to get user data from Facebook');
              return;
            }
            
            // Get pages with detailed information
            window.FB.api('/me/accounts', {
              fields: 'id,name,access_token,category,fan_count,instagram_business_account,perms,tasks',
              access_token: accessToken
            }, function(pagesResponse) {
              if (!pagesResponse || pagesResponse.error) {
                setConnecting(null);
                alert('Failed to get pages from Facebook. Make sure you are an admin of at least one Facebook page.');
                return;
              }
              
              console.log('📄 Raw pages response:', pagesResponse.data);
              
              // Filter pages where user has admin permissions and required tasks
              const adminPages = pagesResponse.data.filter(page => {
                console.log(`🔍 Checking page ${page.name}:`, {
                  perms: page.perms,
                  tasks: page.tasks,
                  hasAccessToken: !!page.access_token
                });
                
                // Check if user has the required permissions for this page
                const hasManagePosts = page.perms && (
                  page.perms.includes('MANAGE') || 
                  page.perms.includes('CREATE_CONTENT') ||
                  page.perms.includes('MODERATE')
                );
                
                // Check if user has required tasks
                const hasPostingTasks = page.tasks && (
                  page.tasks.includes('MANAGE') ||
                  page.tasks.includes('CREATE_CONTENT') ||
                  page.tasks.includes('ADVERTISE')
                );
                
                // Must have access token (page token)
                const hasPageToken = !!page.access_token;
                
                const isValidPage = hasManagePosts && hasPageToken;
                
                console.log(`✅ Page ${page.name} validation:`, {
                  hasManagePosts,
                  hasPostingTasks,
                  hasPageToken,
                  isValidPage
                });
                
                return isValidPage;
              });

              console.log(`📊 Page filtering results:`, {
                totalPages: pagesResponse.data.length,
                adminPages: adminPages.length,
                pageNames: adminPages.map(p => p.name)
              });

              if (adminPages.length === 0) {
                setConnecting(null);
                alert('No suitable pages found. You need to be an admin of at least one Facebook page with posting permissions. Please check your page roles and try again.');
                return;
              }

              console.log(`✅ Found ${adminPages.length} pages where user has admin permissions`);
              
              const accountData = {
                platform: 'facebook',
                platformUserId: userId,
                name: userResponse.name,
                email: userResponse.email,
                profilePicture: userResponse.picture?.data?.url,
                accessToken: accessToken, // Keep user token for reference
                pages: adminPages.map(page => ({
                  id: page.id,
                  name: page.name,
                  accessToken: page.access_token, // This is the crucial page access token
                  category: page.category,
                  fanCount: page.fan_count,
                  permissions: page.perms || [],
                  tasks: page.tasks || [],
                  instagramBusinessAccount: page.instagram_business_account
                })),
                connectedAt: new Date().toISOString()
              };
              
              console.log('📤 Saving account data with page tokens:', {
                pagesCount: accountData.pages.length,
                pagesWithTokens: accountData.pages.filter(p => p.accessToken).length
              });
              
              saveAccountConnection(accountData);
            });
          });
        });
      } else {
        setConnecting(null);
        alert('Facebook login failed or was cancelled');
      }
    }, {
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata,instagram_basic,instagram_content_publish,email,public_profile',
      return_scopes: true,
      auth_type: 'rerequest'
    });
  };

  const saveAccountConnection = async (accountData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId,
          ...accountData
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setConnecting(null);
        fetchConnectedAccounts();
        alert(`${accountData.platform} account connected successfully!`);
      } else {
        throw new Error(result.error || 'Failed to save connection');
      }
    } catch (error) {
      console.error('Error saving account connection:', error);
      setConnecting(null);
      alert('Failed to save account connection');
    }
  };

  const disconnectAccount = async (accountId) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${accountId}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchConnectedAccounts();
        alert('Account disconnected successfully');
      } else {
        throw new Error(result.error || 'Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      alert('Failed to disconnect account');
    }
  };

  const refreshAccountToken = async (accountId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${accountId}/refresh`, {
        method: 'POST'
      });
      
      const result = await response.json();
      
      if (result.success) {
        fetchConnectedAccounts();
        alert('Account token refreshed successfully');
      } else {
        throw new Error(result.error || 'Failed to refresh token');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      alert('Failed to refresh account token');
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'facebook': return <Facebook className="h-5 w-5 text-blue-600" />;
      case 'instagram': return <Instagram className="h-5 w-5 text-pink-600" />;
      case 'youtube': return <Youtube className="h-5 w-5 text-red-600" />;
      default: return null;
    }
  };

  const toggleTokenVisibility = (accountId) => {
    setShowTokens(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }));
  };

  const toggleCustomerExpansion = (customerKey) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerKey]: !prev[customerKey]
    }));
  };

  const filteredCustomers = Object.entries(customerAccounts)
    .filter(([customerKey, customerData]) => {
      if (selectedCustomer !== 'all' && customerKey !== selectedCustomer) return false;
      if (searchTerm && (
        !customerData.customerName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !customerKey.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !customerData.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      )) return false;
      return true;
    })
    .sort(([, customerDataA], [, customerDataB]) => {
      // Sort by customer ID in ascending order
      const idA = customerDataA.customerId || '';
      const idB = customerDataB.customerId || '';
      return idA.localeCompare(idB);
    });

  const totalAccounts = Object.values(customerAccounts).reduce((sum, customer) => sum + customer.accounts.length, 0);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading connected accounts...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Back to Dashboard Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Dashboard</span>
        </button>
        
        {!propCustomerId && (
          <div className="text-sm text-gray-500">
            Admin Management Panel
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center">
          <Settings className="h-6 w-6 mr-2 text-blue-600" />
          {propCustomerId ? 'Connected Social Media Accounts' : 'All Customer Social Media Accounts'}
        </h2>
        <span className="text-sm text-gray-500">
          {totalAccounts} account{totalAccounts !== 1 ? 's' : ''} across {Object.keys(customerAccounts).length} customer{Object.keys(customerAccounts).length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Search and Filter Controls - only show when not viewing specific customer */}
      {!propCustomerId && (
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Customers</option>
              {Object.entries(customerAccounts).map(([customerKey, customerData]) => (
                <option key={customerKey} value={customerKey}>
                  ID: {customerKey} - {customerData.customerName} ({customerData.accounts.length})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Customer Groups Display */}
      <div className="space-y-6">
        {propCustomerId ? (
          // Single customer view (existing behavior)
          <div className="space-y-4">
            {connectedAccounts.map((account) => (
              <div key={account._id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      {getPlatformIcon(account.platform)}
                      <div>
                        <h4 className="font-medium text-gray-900">{account.name}</h4>
                        <p className="text-sm text-gray-600 capitalize">{account.platform}</p>
                        {account.email && (
                          <p className="text-xs text-gray-500">{account.email}</p>
                        )}
                      </div>
                    </div>
                    
                    {account.profilePicture && (
                      <img 
                        src={account.profilePicture} 
                        alt="Profile"
                        className="w-10 h-10 rounded-full border-2 border-gray-200"
                      />
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </span>
                    
                    <button
                      onClick={() => refreshAccountToken(account._id)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Refresh token"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => disconnectAccount(account._id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Disconnect account"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Account Details */}
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Connected:</span>
                    <span className="ml-2 text-gray-600">
                      {new Date(account.connectedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Platform ID:</span>
                    <span className="ml-2 text-gray-600 font-mono text-xs">
                      {account.platformUserId}
                    </span>
                  </div>
                </div>

                {/* Platform-specific details (Pages/Channels) */}
                {account.platform === 'facebook' && account.pages && account.pages.length > 0 && (
                  <div className="mt-3">
                    <h5 className="font-medium text-gray-700 mb-2 text-sm">Connected Pages:</h5>
                    <div className="space-y-2">
                      {account.pages.map((page) => (
                        <div key={page.id} className="bg-gray-50 rounded p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{page.name}</span>
                            <span className="text-gray-500">{page.fanCount?.toLocaleString()} followers</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {account.platform === 'youtube' && account.channels && account.channels.length > 0 && (
                  <div className="mt-3">
                    <h5 className="font-medium text-gray-700 mb-2 text-sm">Connected Channels:</h5>
                    <div className="space-y-2">
                      {account.channels.map((channel) => (
                        <div key={channel.id} className="bg-gray-50 rounded p-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{channel.name}</span>
                            <span className="text-gray-500">{parseInt(channel.subscriberCount || 0).toLocaleString()} subscribers</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Token Info (for debugging) */}
                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Access Token:</span>
                    <button
                      onClick={() => toggleTokenVisibility(account._id)}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      {showTokens[account._id] ? (
                        <>
                          <EyeOff className="h-4 w-4 mr-1" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="h-4 w-4 mr-1" />
                          Show
                        </>
                      )}
                    </button>
                  </div>
                  <div className="mt-2 text-xs font-mono text-gray-600 break-all">
                    {showTokens[account._id] ? (
                      account.accessToken
                    ) : (
                      '•'.repeat(20) + account.accessToken?.slice(-4)
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {connectedAccounts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No social media accounts connected yet.</p>
                <p className="text-sm">Connect your accounts below to get started.</p>
              </div>
            )}
          </div>
        ) : (
          // Multi-customer view
          filteredCustomers.map(([customerKey, customerData]) => (
            <div key={customerKey} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Customer Header - showing customer ID prominently */}
              <div 
                className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all"
                onClick={() => toggleCustomerExpansion(customerKey)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="bg-white p-2 rounded-full shadow-sm">
                      <User className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      {/* Primary heading with Customer ID and Name */
                      }
                      <h3 className="text-lg font-bold text-gray-900">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm font-mono mr-3">
                          ID: {customerData.customerId}
                        </span>
                        {customerData.customerName}
                      </h3>
                      <div className="space-y-1">
                        {customerData.customerEmail && (
                          <p className="text-sm text-gray-600">📧 {customerData.customerEmail}</p>
                        )}
                        {customerData.customerBusinessName && customerData.customerBusinessName !== customerData.customerName && (
                          <p className="text-sm text-gray-500">🏢 Business: {customerData.customerBusinessName}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Connected: {new Date(customerData.accounts[0]?.connectedAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {customerData.accounts.length} social account{customerData.accounts.length !== 1 ? 's' : ''}
                      </span>
                      <div className="mt-1 flex space-x-1">
                        {customerData.accounts.map((account) => (
                          <span key={account._id} className="inline-block">
                            {getPlatformIcon(account.platform)}
                          </span>
                        ))}
                      </div>
                    </div>
                    {expandedCustomers[customerKey] ? (
                      <ChevronUp className="h-6 w-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Customer's Social Media Accounts */}
              {expandedCustomers[customerKey] && (
                <div className="p-6 bg-gray-50">
                  <div className="mb-4">
                    <h4 className="text-md font-semibold text-gray-800 mb-2 flex items-center">
                      <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-mono mr-2">
                        Customer ID: {customerData.customerId}
                      </span>
                      Connected Social Media Accounts
                    </h4>
                    <div className="w-full h-0.5 bg-gradient-to-r from-blue-300 to-indigo-300"></div>
                  </div>
                  
                  <div className="space-y-4">
                    {customerData.accounts.map((account) => (
                      <div key={account._id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-lg bg-gray-50">
                                {getPlatformIcon(account.platform)}
                              </div>
                              <div>
                                <h5 className="font-semibold text-gray-900">{account.name}</h5>
                                <p className="text-sm text-gray-600 capitalize font-medium">{account.platform} Account</p>
                                {account.email && (
                                  <p className="text-xs text-gray-500 mt-1">🔗 {account.email}</p>
                                )}
                              </div>
                            </div>
                            
                            {account.profilePicture && (
                              <img 
                                src={account.profilePicture} 
                                alt="Profile"
                                className="w-12 h-12 rounded-full border-2 border-gray-200 shadow-sm"
                              />
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </span>
                            
                            <button
                              onClick={() => refreshAccountToken(account._id)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                              title="Refresh token"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                            
                            <button
                              onClick={() => disconnectAccount(account._id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                              title="Disconnect account"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Account Details */}
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-20">Connected:</span>
                            <span className="text-gray-600">
                              {new Date(account.connectedAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium text-gray-700 w-20">Platform ID:</span>
                            <span className="text-gray-600 font-mono text-xs truncate">
                              {account.platformUserId}
                            </span>
                          </div>
                        </div>

                        {/* Platform-specific details with enhanced styling */}
                        {account.platform === 'facebook' && account.pages && account.pages.length > 0 && (
                          <div className="mt-4">
                            <h6 className="font-medium text-gray-700 mb-3 flex items-center">
                              <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                              Facebook Pages ({account.pages.length})
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {account.pages.map((page) => (
                                <div key={page.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="font-medium text-blue-900">{page.name}</span>
                                      <p className="text-xs text-blue-700 mt-1">{page.category}</p>
                                    </div>
                                    <span className="text-sm text-blue-600 font-medium">
                                      {page.fanCount?.toLocaleString()} followers
                                    </span>
                                  </div>
                                  {page.instagramBusinessAccount && (
                                    <div className="mt-2 flex items-center text-xs text-pink-600">
                                      <Instagram className="h-3 w-3 mr-1" />
                                      Instagram Connected
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {account.platform === 'youtube' && account.channels && account.channels.length > 0 && (
                          <div className="mt-4">
                            <h6 className="font-medium text-gray-700 mb-3 flex items-center">
                              <Youtube className="h-4 w-4 mr-2 text-red-600" />
                              YouTube Channels ({account.channels.length})
                            </h6>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {account.channels.map((channel) => (
                                <div key={channel.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="font-medium text-red-900">{channel.name}</span>
                                      {channel.customUrl && (
                                        <p className="text-xs text-red-700 mt-1">@{channel.customUrl}</p>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm text-red-600 font-medium">
                                        {parseInt(channel.subscriberCount || 0).toLocaleString()}
                                      </div>
                                      <div className="text-xs text-red-500">subscribers</div>
                                    </div>
                                  </div>
                                  <div className="mt-2 text-xs text-red-600">
                                    {parseInt(channel.videoCount || 0).toLocaleString()} videos • {parseInt(channel.viewCount || 0).toLocaleString()} views
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {customerData.accounts.length === 0 && (
                    <div className="text-center py-8 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-200">
                      <Settings className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium mb-1">No Social Media Accounts</p>
                      <p className="text-sm">This customer hasn't connected any social media accounts yet.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {!propCustomerId && filteredCustomers.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <User className="h-20 w-20 mx-auto mb-4 opacity-30" />
            <p className="text-xl font-medium mb-2">No Customers Found</p>
            <p className="text-sm">Try adjusting your search terms or check if customers have connected social media accounts.</p>
          </div>
        )}
      </div>

      {/* Enhanced Important Notes */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-2">Social Media Account Management:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Account Connection:</strong> Customers connect their accounts through the customer portal.</li>
              <li><strong>Token Management:</strong> Access tokens are automatically managed and refreshed when needed.</li>
              <li><strong>Platform Requirements:</strong> Each platform has specific permission requirements for posting.</li>
              <li><strong>Admin Access:</strong> Admins can view, manage, and disconnect customer accounts as needed.</li>
            </ul>
            <div className="mt-3 p-2 bg-yellow-100 rounded">
              <p className="font-medium text-yellow-900">Note:</p>
              <p className="text-yellow-800">New social media accounts must be connected by customers through their portal for security and authorization purposes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerSocialMediaLinks;