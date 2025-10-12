import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ExternalLink, CheckCircle, User, Plus, RefreshCw, Users, FileText, Heart } from 'lucide-react';

export default function Configure() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Processing...');
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [checkingAccounts, setCheckingAccounts] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [hasCheckedAccounts, setHasCheckedAccounts] = useState(false);
  const [accountDetails, setAccountDetails] = useState({});

  const customerId = searchParams.get('customerId');
  const platform = searchParams.get('platform');
  const autoConnect = searchParams.get('autoConnect');

  // Environment detection and API base URL configuration
  const getApiBaseUrl = () => {
    // Check if we're in development
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:8080'; // Your local backend
    }
    
    // Production - replace with your Cloud Run backend URL
    return process.env.REACT_APP_API_URL || 'https://your-backend-service.run.app';
  };

  const getCurrentFrontendUrl = () => {
    // Get the current frontend URL (works for both localhost and production bucket)
    return `${window.location.protocol}//${window.location.host}`;
  };

  // Enhanced function to check for existing connected accounts with detailed info
  const checkConnectedAccounts = async (customerId, platform) => {
    try {
      setCheckingAccounts(true);
      setStatus('Checking for existing accounts...');
      
      // Validate customerId before making requests
      if (!customerId || customerId.trim() === '') {
        console.error('Invalid customerId provided:', customerId);
        throw new Error('Invalid customer ID');
      }

      console.log('Making API requests with customerId:', customerId);
      
      const apiBaseUrl = getApiBaseUrl();
      
      // Check multiple endpoints for account data
      const endpoints = [
        `${apiBaseUrl}/api/customer/${customerId}/accounts/${platform}`,
        `${apiBaseUrl}/api/customer/${customerId}/${platform}/profile`,
        `${apiBaseUrl}/api/${platform}/accounts/${customerId}`,
        `${apiBaseUrl}/api/integrations/${platform}/${customerId}`
      ];

      let accounts = [];
      let accountData = {};

      // Try each endpoint until we find account data
      for (const endpoint of endpoints) {
        try {
          console.log(`Attempting to fetch from: ${endpoint}`);
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Customer-Id': customerId, // Explicitly send customerId in header
              // Add any auth headers if needed
            },
            credentials: 'include' // Include cookies for authentication
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`Account data from ${endpoint}:`, data);
            console.log(`Response includes customerId check:`, data.customerId === customerId);
            
            // Validate that the returned data is for the correct customer
            if (data.customerId && data.customerId !== customerId) {
              console.warn(`Data returned for different customer. Expected: ${customerId}, Got: ${data.customerId}`);
              continue;
            }
            
            // Handle different response formats
            if (Array.isArray(data)) {
              accounts = data;
            } else if (data.accounts) {
              accounts = data.accounts;
            } else if (data.profile || data.username || data.id) {
              accounts = [data];
            }

            // If we found accounts, try to get detailed info
            if (accounts.length > 0) {
              accountData = await fetchAccountDetails(accounts, platform, customerId);
              break;
            }
          } else {
            console.log(`HTTP ${response.status} from ${endpoint}:`, await response.text());
          }
        } catch (error) {
          console.log(`Failed to fetch from ${endpoint}:`, error);
          continue;
        }
      }

      if (accounts.length > 0) {
        setConnectedAccounts(accounts);
        setAccountDetails(accountData);
        setHasCheckedAccounts(true);
        console.log('Connected accounts found:', accounts);
        console.log('Account details:', accountData);
        return accounts;
      } else {
        console.log('No existing accounts found for customerId:', customerId);
        setHasCheckedAccounts(true);
        return [];
      }
    } catch (error) {
      console.error('Error checking connected accounts:', error);
      setHasCheckedAccounts(true);
      return [];
    } finally {
      setCheckingAccounts(false);
    }
  };

  // Fetch detailed account information for display
  const fetchAccountDetails = async (accounts, platform, customerId) => {
    const details = {};
    const apiBaseUrl = getApiBaseUrl();
    
    for (const account of accounts) {
      try {
        const accountId = account.id || account.username || account.handle;
        
        // Try different endpoints for account details
        const detailEndpoints = [
          `${apiBaseUrl}/api/${platform}/profile/${accountId}?customerId=${customerId}`,
          `${apiBaseUrl}/api/${platform}/stats/${accountId}?customerId=${customerId}`,
          `${apiBaseUrl}/api/customer/${customerId}/${platform}/${accountId}/details`,
          `${apiBaseUrl}/api/integrations/${platform}/${customerId}/${accountId}`
        ];

        for (const endpoint of detailEndpoints) {
          try {
            console.log(`Fetching account details from: ${endpoint}`);
            const response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'X-Customer-Id': customerId, // Explicitly send customerId in header
              },
              credentials: 'include'
            });
            
            if (response.ok) {
              const data = await response.json();
              
              // Validate customer ID in response
              if (data.customerId && data.customerId !== customerId) {
                console.warn(`Account details for wrong customer. Expected: ${customerId}, Got: ${data.customerId}`);
                continue;
              }
              
              details[accountId] = {
                ...account,
                ...data,
                customerId: customerId, // Ensure customerId is set
                followers: data.followers_count || data.followers || account.followers || 0,
                following: data.following_count || data.following || account.following || 0,
                posts: data.posts_count || data.posts || data.media_count || account.posts || 0,
                likes: data.likes_count || data.likes || account.likes || 0,
                profilePicture: data.profile_picture_url || data.avatar || data.picture || account.profilePicture,
                bio: data.biography || data.bio || data.description || account.bio,
                verified: data.is_verified || data.verified || account.verified || false,
                businessAccount: data.is_business_account || data.business || account.business || false
              };
              break;
            }
          } catch (error) {
            console.log(`Failed to fetch details from ${endpoint}:`, error);
            continue;
          }
        }

        // If no detailed info found, use basic account info
        if (!details[accountId]) {
          details[accountId] = {
            ...account,
            customerId: customerId, // Ensure customerId is set
            followers: account.followers || 0,
            following: account.following || 0,
            posts: account.posts || 0,
            likes: account.likes || 0
          };
        }
      } catch (error) {
        console.error(`Error fetching details for account ${account.id}:`, error);
      }
    }

    return details;
  };

  useEffect(() => {
    console.log('Configure component loaded with:', { customerId, platform, autoConnect });
    console.log('Current environment:', {
      hostname: window.location.hostname,
      isLocalhost: window.location.hostname === 'localhost',
      apiBaseUrl: getApiBaseUrl(),
      frontendUrl: getCurrentFrontendUrl()
    });
    console.log('Full URL search params:', window.location.search);
    console.log('All search params:', Object.fromEntries(searchParams.entries()));
    
    // Enhanced validation with better error messages
    if (!customerId || customerId.trim() === '') {
      console.error('Missing or empty customer ID:', customerId);
      setError('Missing or invalid customer ID parameter. Please check your QR code or link.');
      setLoading(false);
      return;
    }

    if (!platform || platform.trim() === '') {
      console.error('Missing or empty platform:', platform);
      setError('Missing or invalid platform parameter. Please check your QR code or link.');
      setLoading(false);
      return;
    }

    // Log the exact customerId being used
    console.log('Using customerId for API calls:', customerId);
    console.log('CustomerId type:', typeof customerId);
    console.log('CustomerId length:', customerId.length);

    setStatus('Validating parameters...');
    
    // Validate platform
    const validPlatforms = ['fb', 'insta', 'linkedin', 'yt'];
    if (!validPlatforms.includes(platform)) {
      setError(`Unsupported platform: ${platform}`);
      setLoading(false);
      return;
    }

    // Check for existing connected accounts
    const checkAndProceed = async () => {
      const accounts = await checkConnectedAccounts(customerId, platform);
      
      if (accounts.length > 0) {
        setStatus('Found existing accounts');
        setLoading(false);
        return;
      }

      setStatus('Preparing integration redirect...');

      // Redirect to appropriate integration page
      const platformRoutes = {
        'fb': '/customer/integration/facebook',
        'insta': '/customer/integration/instagram',
        'linkedin': '/customer/integration/linkedin',
        'yt': '/customer/integration/youtube'
      };

      const route = platformRoutes[platform];
      if (route) {
        // Build redirect URL with all parameters
        const params = new URLSearchParams();
        params.set('customerId', customerId);
        params.set('fromQr', 'true');
        if (autoConnect) {
          params.set('autoConnect', autoConnect);
        }
        
        const redirectUrl = `${route}?${params.toString()}`;
        setStatus(`Redirecting to ${getPlatformName(platform)} integration...`);
        
        console.log('Redirecting to:', redirectUrl);
        console.log('Redirect URL includes customerId:', redirectUrl.includes(customerId));
        console.log('QR customerId being passed:', customerId);
        
        // Shorter delay for better UX, but still visible
        setTimeout(() => {
          console.log('Executing navigation to:', redirectUrl);
          navigate(redirectUrl, { 
            replace: true,
            state: { 
              qrCustomerId: customerId,
              fromQrCode: true,
              platform: platform
            }
          });
        }, 2000);
      } else {
        setError('Unsupported platform');
        setLoading(false);
      }
    };

    checkAndProceed();
  }, [customerId, platform, autoConnect, navigate, searchParams]);

  const getPlatformName = (platform) => {
    const names = {
      'fb': 'Facebook',
      'insta': 'Instagram',
      'linkedin': 'LinkedIn',
      'yt': 'YouTube'
    };
    return names[platform] || platform;
  };

  const handleManualRedirect = () => {
    const platformRoutes = {
      'fb': '/customer/integration/facebook',
      'insta': '/customer/integration/instagram',
      'linkedin': '/customer/integration/linkedin',
      'yt': '/customer/integration/youtube'
    };
    
    const route = platformRoutes[platform];
    if (route) {
      const params = new URLSearchParams();
      params.set('customerId', customerId);
      params.set('fromQr', 'true');
      if (autoConnect) {
        params.set('autoConnect', autoConnect);
      }
      
      const redirectUrl = `${route}?${params.toString()}`;
      console.log('Manual redirect to:', redirectUrl);
      console.log('Passing customerId to integration:', customerId);
      
      // Pass customerId in navigation state as well
      navigate(redirectUrl, { 
        replace: true,
        state: { 
          qrCustomerId: customerId,
          fromQrCode: true,
          platform: platform
        }
      });
    }
  };

  const handleUseExistingAccount = (account) => {
    setStatus(`Using existing ${getPlatformName(platform)} account...`);
    setLoading(true);
    
    // Make sure we pass the customerId when using existing account
    console.log('Using existing account with customerId:', customerId);
    console.log('Account details:', account);
    
    // Here you would typically make an API call to use the existing account
    // For now, we'll simulate it and redirect to dashboard
    setTimeout(() => {
      navigate('/customer/dashboard', { 
        state: { 
          message: `Successfully connected using existing ${getPlatformName(platform)} account: ${account.name}`,
          customerId: customerId
        }
      });
    }, 1500);
  };

  const handleConnectNewAccount = () => {
    const platformRoutes = {
      'fb': '/customer/integration/facebook',
      'insta': '/customer/integration/instagram',
      'linkedin': '/customer/integration/linkedin',
      'yt': '/customer/integration/youtube'
    };
    
    const route = platformRoutes[platform];
    if (route) {
      const params = new URLSearchParams();
      params.set('customerId', customerId);
      params.set('fromQr', 'true');
      if (autoConnect) {
        params.set('autoConnect', autoConnect);
      }
      
      const redirectUrl = `${route}?${params.toString()}`;
      console.log('Connect new account redirect to:', redirectUrl);
      console.log('Passing customerId to integration:', customerId);
      
      // Pass customerId in navigation state as well
      navigate(redirectUrl, { 
        replace: true,
        state: { 
          qrCustomerId: customerId,
          fromQrCode: true,
          platform: platform
        }
      });
    }
  };

  const handleLoginToPlatform = () => {
    const platformUrls = {
      'fb': 'https://www.facebook.com/login',
      'insta': 'https://www.instagram.com/accounts/login/',
      'linkedin': 'https://www.linkedin.com/login',
      'yt': 'https://accounts.google.com/signin'
    };

    const loginUrl = platformUrls[platform];
    if (loginUrl) {
      // Open login in new tab and provide instructions
      window.open(loginUrl, '_blank');
      setStatus(`Please login to ${getPlatformName(platform)} in the new tab, then return here and refresh.`);
    }
  };

  const handleRefreshAccounts = async () => {
    setLoading(true);
    setShowLoginPrompt(false);
    setConnectedAccounts([]);
    const accounts = await checkConnectedAccounts(customerId, platform);
    
    if (accounts.length === 0) {
      setShowLoginPrompt(true);
    }
    setLoading(false);
  };

  // Show login prompt when accounts exist but user not logged in current browser
  if (!loading && hasCheckedAccounts && (showLoginPrompt || (connectedAccounts.length > 0 && showLoginPrompt))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <User className="w-16 h-16 text-blue-500 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {getPlatformName(platform)} Login Required
            </h1>
            <p className="text-gray-600">
              {connectedAccounts.length > 0 
                ? `You have ${connectedAccounts.length} connected account(s), but you need to login to ${getPlatformName(platform)} in this browser to access them.`
                : `Please login to your ${getPlatformName(platform)} account to see existing connections or connect a new account.`
              }
            </p>
          </div>

          {connectedAccounts.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-blue-900 mb-2">Connected Accounts Found:</h3>
              <div className="space-y-2">
                {connectedAccounts.map((account, index) => (
                  <div key={account.id || index} className="flex items-center gap-2 text-sm text-blue-800">
                    <User className="w-4 h-4" />
                    <span>{account.name || account.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3 mb-6">
            <button
              onClick={handleLoginToPlatform}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Login to {getPlatformName(platform)}
            </button>
            
            <button
              onClick={handleRefreshAccounts}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Loader2 className="w-4 h-4" />
              Check Again After Login
            </button>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 mb-3">Or skip login and:</p>
            <button
              onClick={handleConnectNewAccount}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mb-3"
            >
              <Plus className="w-4 h-4" />
              Connect New Account
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/customer')}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded text-sm transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/customer/login')}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded text-sm transition-colors"
            >
              Login
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800">
            <p><strong>Instructions:</strong></p>
            <ol className="list-decimal list-inside mt-1 space-y-1">
              <li>Click "Login to {getPlatformName(platform)}" above</li>
              <li>Login in the new tab that opens</li>
              <li>Return to this tab</li>
              <li>Click "Check Again After Login"</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  // Enhanced account display component
  const AccountCard = ({ account, index }) => {
    const accountId = account.id || account.username || account.handle;
    const details = accountDetails[accountId] || account;
    
    return (
      <div className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="flex items-start gap-4">
          {/* Profile Picture */}
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
            {details.profilePicture ? (
              <img
                src={details.profilePicture}
                alt={details.name || details.username}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <User className="w-8 h-8 text-gray-400" style={{ display: details.profilePicture ? 'none' : 'flex' }} />
          </div>

          {/* Account Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {details.name || details.username || details.handle || 'Unknown Account'}
              </h3>
              {details.verified && (
                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
              )}
              {details.businessAccount && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full flex-shrink-0">
                  Business
                </span>
              )}
            </div>
            
            {(details.username || details.handle) && (
              <p className="text-sm text-gray-600 mb-2">
                @{details.username || details.handle}
              </p>
            )}

            {details.bio && (
              <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                {details.bio}
              </p>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-bold text-purple-600">
                  <FileText className="w-4 h-4" />
                  {details.posts || 0}
                </div>
                <div className="text-xs text-gray-500">Posts</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-bold text-red-600">
                  <Users className="w-4 h-4" />
                  {details.followers || 0}
                </div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-lg font-bold text-pink-600">
                  <Heart className="w-4 h-4" />
                  {details.likes || 0}
                </div>
                <div className="text-xs text-gray-500">Total Likes</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => handleUseExistingAccount(account)}
                className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
              >
                Use Account
              </button>
              <button
                onClick={() => handleRefreshAccount(account)}
                className="px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleRefreshAccount = async (account) => {
    const accountId = account.id || account.username || account.handle;
    setStatus(`Refreshing ${accountId} data...`);
    
    try {
      const updatedDetails = await fetchAccountDetails([account], platform, customerId);
      setAccountDetails(prev => ({ ...prev, ...updatedDetails }));
      setStatus('Account data refreshed');
    } catch (error) {
      console.error('Error refreshing account:', error);
      setStatus('Failed to refresh account data');
    }
  };

  // Show connected accounts if any exist and user is logged in
  if (!loading && connectedAccounts.length > 0 && !showLoginPrompt) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              {getPlatformName(platform)} Integration
            </h1>
            <p className="text-gray-600">
              {connectedAccounts.length} Account{connectedAccounts.length > 1 ? 's' : ''} Connected
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {connectedAccounts.map((account, index) => (
              <AccountCard 
                key={account.id || account.username || index} 
                account={account} 
                index={index} 
              />
            ))}
          </div>

          <div className="flex gap-3 mb-4">
            <button
              onClick={handleConnectNewAccount}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Another Account
            </button>
            <button
              onClick={handleRefreshAccounts}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => navigate('/customer')}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded text-sm transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/customer/login')}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded text-sm transition-colors"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <h1 className="text-xl font-semibold text-gray-900">Configuration Error</h1>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          
          {/* Debug information */}
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 mb-4">
            <p><strong>Customer ID:</strong> {customerId || 'Not provided'}</p>
            <p><strong>Platform:</strong> {platform || 'Not provided'}</p>
            <p><strong>Auto Connect:</strong> {autoConnect || 'No'}</p>
            <p><strong>Customer ID Type:</strong> {typeof customerId}</p>
            <p><strong>Customer ID Length:</strong> {customerId ? customerId.length : 'N/A'}</p>
            <p><strong>Current URL:</strong> {window.location.href}</p>
            <p><strong>Environment:</strong> {window.location.hostname === 'localhost' ? 'Development' : 'Production'}</p>
            <p><strong>API Base:</strong> {getApiBaseUrl()}</p>
            <p><strong>Frontend:</strong> {getCurrentFrontendUrl()}</p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/customer/login')}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Go to Login
            </button>
            {customerId && platform && (
              <button
                onClick={handleManualRedirect}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6 text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-gray-900 mb-2">QR Code Scanned Successfully!</h1>
        </div>
        
        <div className="mb-6">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-gray-600 font-medium">{status}</p>
          {checkingAccounts && (
            <p className="text-sm text-gray-500 mt-2">This may take a moment...</p>
          )}
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 mb-6">
          <div className="grid grid-cols-2 gap-2 text-left">
            <p><strong>Customer:</strong></p>
            <p className="truncate">{customerId}</p>
            <p><strong>Platform:</strong></p>
            <p>{getPlatformName(platform)}</p>
            <p><strong>Environment:</strong></p>
            <p>{window.location.hostname === 'localhost' ? 'Dev' : 'Prod'}</p>
            {autoConnect && (
              <>
                <p><strong>Auto Connect:</strong></p>
                <p>Yes</p>
              </>
            )}
          </div>
        </div>
        
        {/* Manual redirect button */}
        <button
          onClick={handleManualRedirect}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mb-4"
        >
          <ExternalLink className="w-4 h-4" />
          Continue to {getPlatformName(platform)} Integration
        </button>
        
        {/* Alternative actions */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/customer')}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => navigate('/customer/login')}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm transition-colors"
          >
            Login
          </button>
        </div>
        
        {/* Debug info for development */}
        <div className="mt-4 p-2 bg-yellow-50 rounded text-xs text-left">
          <p><strong>Debug Info:</strong></p>
          <p>Customer ID: {customerId} (Type: {typeof customerId}, Length: {customerId ? customerId.length : 'N/A'})</p>
          <p>Platform: {platform}</p>
          <p>Current URL: {window.location.href}</p>
          <p>Frontend Base: {getCurrentFrontendUrl()}</p>
          <p>API Base: {getApiBaseUrl()}</p>
          <p>Params: {JSON.stringify(Object.fromEntries(searchParams.entries()))}</p>
        </div>
      </div>
    </div>
  );
}
