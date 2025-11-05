import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { 
  Facebook, 
  Instagram, 
  Youtube, 
  Twitter, 
  Linkedin,
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  X, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';

// Facebook App ID (already correct)
const FACEBOOK_APP_ID = '4416243821942660';

const SocialIntegrations = ({ platform, customer, onConnectionSuccess, onClose, compact = false }, ref) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState([]);

  useEffect(() => {
    // Load Facebook SDK when component mounts
    if (platform === 'facebook' || platform === 'instagram') {
      loadFacebookSDK();
    }
    
    // Fetch existing connections for this customer
    fetchExistingConnections();
  }, [platform, customer]);

  const loadFacebookSDK = () => {
    return new Promise((resolve) => {
      // Check if SDK is already loaded
      if (window.FB) {
        resolve();
        return;
      }

      // Load Facebook SDK
      window.fbAsyncInit = function() {
        window.FB.init({
          appId: FACEBOOK_APP_ID, // updated variable
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
        resolve();
      };

      // Load SDK script
      const script = document.createElement('script');
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      document.head.appendChild(script);
    });
  };

  // Helper to get a stable customerId (handles customer._id or customer.id)
  const getCustomerId = (cust) => {
    if (!cust) return '';
    return cust.id || cust._id || cust.customerId || '';
  };

  // ✅ Fix API URL handling for production
  const fetchExistingConnections = async () => {
    try {
      const customerId = getCustomerId(customer);
      if (!customerId) {
        console.warn('fetchExistingConnections: missing customer id');
        return;
      }

      // ✅ Use production-aware API endpoints
      const endpoints = [];
      
      // For production, use the hardcoded backend URL
      if (process.env.NODE_ENV === 'production') {
        endpoints.push(`https://my-backend-593529385135.asia-south1.run.app/api/customer-social-links/${customerId}`);
      } else if (process.env.REACT_APP_API_URL) {
        endpoints.push(`${process.env.REACT_APP_API_URL.replace(/\/$/, '')}/api/customer-social-links/${customerId}`);
      }
      
      // Always try relative path as fallback
      endpoints.push(`/api/customer-social-links/${customerId}`);

      let data = null;
      for (const url of endpoints) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            const text = await response.text().catch(() => '');
            console.warn('fetchExistingConnections: non-ok response', url, response.status, text);
            continue;
          }
          const json = await response.json();
          data = json;
          break;
        } catch (err) {
          console.warn('fetchExistingConnections: fetch error for', url, err.message);
          continue;
        }
      }

      if (data && data.success && data.data) {
        setConnectedAccounts(data.data.socialAccounts || []);
      } else if (data && !data.success) {
        console.warn('fetchExistingConnections: API returned error payload', data);
      }
    } catch (error) {
      console.error('Error fetching existing connections:', error);
    }
  };

  const handleFacebookConnect = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await loadFacebookSDK();

      // Open Facebook login popup (like FacebookIntegration.jsx)
      window.FB.login((response) => {
        if (response.status === 'connected') {
          const accessToken = response.authResponse.accessToken;
          const userId = response.authResponse.userID;

          // Fetch user info
          window.FB.api('/me', { fields: 'id,name,email', access_token: accessToken }, function(userResponse) {
            if (!userResponse || userResponse.error) {
              setError('Failed to fetch Facebook user info');
              setLoading(false);
              return;
            }

            // Fetch pages
            window.FB.api(`/${userId}/accounts`, {
              fields: 'id,name,access_token,category,instagram_business_account{id,name,username,profile_picture_url}',
              access_token: accessToken
            }, function(pagesResponse) {
              if (!pagesResponse || pagesResponse.error) {
                setError('Failed to fetch Facebook pages: ' + (pagesResponse.error?.message || 'Unknown error'));
                setLoading(false);
                return;
              }

              // Prepare account data for saving
              const accountData = {
                customerId: customer.id,
                platform: 'facebook',
                platformUserId: userId,
                name: userResponse.name,
                email: userResponse.email,
                profilePicture: userResponse.picture?.data?.url,
                accessToken: accessToken,
                pages: pagesResponse.data.map(page => ({
                  id: page.id,
                  name: page.name,
                  category: page.category,
                  accessToken: page.access_token,
                  instagramBusinessAccount: page.instagram_business_account || null
                })),
                connectedAt: new Date().toISOString()
              };

              // Save to backend using correct endpoint
              saveAccountToDatabase(accountData);

              // If Instagram, also save Instagram-specific data
              if (platform === 'instagram') {
                const instagramPages = pagesResponse.data.filter(page => page.instagram_business_account);
                if (instagramPages.length > 0) {
                  const instagramAccountData = {
                    customerId: customer.id,
                    platform: 'instagram',
                    platformUserId: userId,
                    name: userResponse.name,
                    email: userResponse.email,
                    profilePicture: userResponse.picture?.data?.url,
                    accessToken: accessToken,
                    pages: instagramPages.map(page => ({
                      id: page.id,
                      name: page.name,
                      category: page.category,
                      accessToken: page.access_token,
                      instagramBusinessAccount: page.instagram_business_account
                    })),
                    connectedAt: new Date().toISOString()
                  };
                  saveAccountToDatabase(instagramAccountData);
                } else {
                  setError('No Instagram Business accounts found. Please connect an Instagram Business account to your Facebook pages first.');
                  setLoading(false);
                  return;
                }
              }
            });
          });
        } else {
          setError('Facebook login was cancelled');
          setLoading(false);
        }
      }, {
        scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management',
        return_scopes: true,
        auth_type: 'rerequest'
      });
    } catch (err) {
      setError('Failed to connect to Facebook: ' + err.message);
      setLoading(false);
    }
  };

  const fetchFacebookPages = async (accessToken, userId) => {
    try {
      // Get user info
      const userResponse = await fetch(
        `https://graph.facebook.com/me?access_token=${accessToken}&fields=id,name,email`
      );
      const userData = await userResponse.json();

      // Get user pages with long-lived tokens
      const pagesResponse = await fetch(
        `https://graph.facebook.com/${userId}/accounts?access_token=${accessToken}&fields=id,name,access_token,category,instagram_business_account{id,name,username,profile_picture_url}`
      );
      const pagesData = await pagesResponse.json();

      if (pagesData.error) {
        throw new Error(pagesData.error.message);
      }

      // Prepare account data for saving
      const accountData = {
        platform: 'facebook',
        platformUserId: userId,
        name: userData.name,
        email: userData.email,
        accessToken: accessToken,
        tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        pages: pagesData.data.map(page => ({
          id: page.id,
          name: page.name,
          category: page.category,
          accessToken: page.access_token,
          instagramBusinessAccount: page.instagram_business_account || null
        }))
      };

      // Save to database
      await saveAccountToDatabase(accountData);

      // If this is for Instagram, also save Instagram-specific data
      if (platform === 'instagram') {
        const instagramPages = pagesData.data.filter(page => page.instagram_business_account);
        if (instagramPages.length > 0) {
          const instagramAccountData = {
            platform: 'instagram',
            platformUserId: userId,
            name: userData.name,
            email: userData.email,
            accessToken: accessToken,
            tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            pages: instagramPages.map(page => ({
              id: page.id,
              name: page.name,
              category: page.category,
              accessToken: page.access_token,
              instagramBusinessAccount: page.instagram_business_account
            }))
          };
          await saveAccountToDatabase(instagramAccountData);
        } else {
          setError('No Instagram Business accounts found. Please connect an Instagram Business account to your Facebook pages first.');
          setLoading(false);
          return;
        }
      }

      setSuccess(`Successfully connected ${platform === 'instagram' ? 'Instagram' : 'Facebook'} account with ${pagesData.data.length} page(s)`);
      
      // Refresh the connections list
      await fetchExistingConnections();
      
      // Call success callback to refresh parent component
      if (onConnectionSuccess) {
        onConnectionSuccess();
      }

    } catch (err) {
      setError('Failed to fetch Facebook pages: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeConnect = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const clientId = process.env.REACT_APP_SOCIAL_GOOGLE_CLIENT_ID;
      const redirectUri = `${window.location.origin}/integration/youtube/callback`;
      const scope = 'https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.upload';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}&response_type=code&access_type=offline&prompt=consent`;
      const popup = window.open(authUrl, 'youtube-auth', 'width=500,height=600');
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setError('YouTube authentication was cancelled');
          setLoading(false);
        }
      }, 1000);
      const handleMessage = async (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === 'YOUTUBE_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', handleMessage);
          try {
            // Fix: Use correct API base URL
            const tokenResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/integration/youtube/token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code: event.data.code, customerId: customer.id })
            });
            const tokenData = await tokenResponse.json();
            if (tokenData.success) {
              setSuccess('Successfully connected YouTube account');
              await fetchExistingConnections();
              if (onConnectionSuccess) onConnectionSuccess();
            } else {
              setError(tokenData.error || 'Failed to complete YouTube authentication');
            }
          } catch (err) {
            setError('Failed to complete YouTube authentication: ' + err.message);
          } finally {
            setLoading(false);
          }
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      setError('Failed to start YouTube authentication: ' + err.message);
      setLoading(false);
    }
  };

  const handleLinkedInConnect = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const LINKEDIN_CLIENT_ID = process.env.REACT_APP_LINKEDIN_CLIENT_ID;
      const LINKEDIN_REDIRECT_URI = process.env.REACT_APP_LINKEDIN_REDIRECT_URI;
      const LINKEDIN_SCOPE = 'openid profile email w_member_social';

      if (!LINKEDIN_CLIENT_ID || !LINKEDIN_REDIRECT_URI) {
        throw new Error('LinkedIn OAuth configuration is missing');
      }

      const state = Math.random().toString(36).substring(2);
      localStorage.setItem('linkedin_oauth_state', state);

      const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&scope=${encodeURIComponent(LINKEDIN_SCOPE)}&state=${state}`;
      
      const width = 600, height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(
        authUrl,
        'linkedin-login',
        `width=${width},height=${height},left=${left},top=${top}`
      );
      
      // Listen for messages from popup
      const handleMessage = (event) => {
        if (event.data?.source === 'linkedin-callback') {
          window.removeEventListener('message', handleMessage);
          if (event.data.success) {
            handleLinkedInSuccess(event.data.access_token, event.data.userinfo);
          } else {
            setError(event.data.error || 'LinkedIn authentication failed');
            setLoading(false);
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Check if popup was closed manually
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
          if (!success) {
            setError('Popup closed before authentication completed');
          }
        }
      }, 1000);

    } catch (err) {
      setError('Failed to connect to LinkedIn: ' + err.message);
      setLoading(false);
    }
  };

  const handleLinkedInSuccess = async (token, userinfo) => {
    try {
      if (userinfo && userinfo.sub) {
        // Prepare LinkedIn account data for saving
        const accountData = {
          customerId: customer.id,
          platform: 'linkedin',
          platformUserId: userinfo.sub,
          name: userinfo.name || '',
          email: userinfo.email || '',
          profilePicture: userinfo.picture || '',
          accessToken: token,
          pages: [], // LinkedIn doesn't have pages like Facebook
          connectedAt: new Date().toISOString()
        };

        console.log('📤 Saving LinkedIn account data:', { 
          customerId: customer.id, 
          platform: 'linkedin', 
          platformUserId: userinfo.sub 
        });

        // Save to database
        await saveAccountToDatabase(accountData);
        
      } else {
        setError('Failed to get user information from LinkedIn');
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to process LinkedIn authentication');
      setLoading(false);
    }
  };

  const handleTwitterConnect = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Fix: Use correct API base URL
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/integration/twitter/request-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: customer.id })
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error);
      }
      const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${data.oauthToken}`;
      const popup = window.open(authUrl, 'twitter-auth', 'width=500,height=600');
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          setError('Twitter authentication was cancelled');
          setLoading(false);
        }
      }, 1000);
      const handleMessage = async (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data.type === 'TWITTER_AUTH_SUCCESS') {
          clearInterval(checkClosed);
          popup.close();
          window.removeEventListener('message', handleMessage);
          try {
            // Fix: Use correct API base URL
            const tokenResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/integration/twitter/callback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                oauthToken: event.data.oauth_token,
                oauthVerifier: event.data.oauth_verifier,
                customerId: customer.id 
              })
            });
            const tokenData = await tokenResponse.json();
            if (tokenData.success) {
              setSuccess('Successfully connected Twitter account');
              await fetchExistingConnections();
              if (onConnectionSuccess) onConnectionSuccess();
            } else {
              setError(tokenData.error || 'Failed to complete Twitter authentication');
            }
          } catch (err) {
            setError('Failed to complete Twitter authentication: ' + err.message);
          } finally {
            setLoading(false);
          }
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (err) {
      setError('Failed to start Twitter authentication: ' + err.message);
      setLoading(false);
    }
  };

  // Update saveAccountToDatabase to use correct endpoint and log detailed errors
  const saveAccountToDatabase = async (accountData) => {
    try {
      const customerId = getCustomerId(customer) || accountData.customerId || '';
      if (!customerId) {
        throw new Error('Missing customerId for saving account');
      }

      const endpoints = [];
      
      // For production, use the hardcoded backend URL
      if (process.env.NODE_ENV === 'production') {
        endpoints.push(`https://my-backend-593529385135.asia-south1.run.app/api/customer-social-links`);
      } else if (process.env.REACT_APP_API_URL) {
        endpoints.push(`${process.env.REACT_APP_API_URL.replace(/\/$/, '')}/api/customer-social-links`);
      }
      
      // Always try relative path as fallback
      endpoints.push('/api/customer-social-links');

      let result = null;
      for (const url of endpoints) {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...accountData, customerId })
          });

          const text = await response.text().catch(() => '');
          let parsed;
          try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = null; }

          if (!response.ok) {
            console.error('saveAccountToDatabase: server returned non-ok', url, response.status, parsed || text);
            continue;
          }

          result = parsed || {};
          break;
        } catch (err) {
          console.warn('saveAccountToDatabase: request failed for', url, err.message);
          continue;
        }
      }

      if (!result) {
        throw new Error('Failed to save account: no successful response from API endpoints');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to save account');
      }

      setSuccess('Successfully connected account');
      await fetchExistingConnections();
      if (onConnectionSuccess) onConnectionSuccess();
    } catch (err) {
      setError('Failed to save account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Remove duplicate useImperativeHandle - keep only this one
  useImperativeHandle(ref, () => ({
    triggerConnect: () => {
      console.log('🔗 triggerConnect called for platform:', platform);
      
      if (!platform) {
        console.warn('triggerConnect: no platform specified');
        return false;
      }

      try {
        switch (platform) {
          case 'facebook':
            console.log('🔗 Triggering Facebook connect');
            handleFacebookConnect();
            return true;
          case 'instagram':
            console.log('🔗 Triggering Instagram connect');
            handleFacebookConnect(); // Instagram uses FB flow in this component
            return true;
          case 'youtube':
            console.log('🔗 Triggering YouTube connect');
            handleYouTubeConnect();
            return true;
          case 'linkedin':
            console.log('🔗 Triggering LinkedIn connect');
            handleLinkedInConnect();
            return true;
          case 'twitter':
            console.log('🔗 Triggering Twitter connect');
            handleTwitterConnect();
            return true;
          default:
            console.warn('triggerConnect: unsupported platform:', platform);
            return false;
        }
      } catch (e) {
        console.error('triggerConnect error for platform', platform, e);
        return false;
      }
    }
  }), [platform, loading, handleFacebookConnect, handleYouTubeConnect, handleLinkedInConnect, handleTwitterConnect]);

  const getConnectionButton = () => {
    const baseClasses = "flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    switch (platform) {
      case 'facebook':
        return (
          <button
            onClick={handleFacebookConnect}
            disabled={loading}
            className={`${baseClasses} bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl`}
            data-platform="facebook"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Facebook className="h-5 w-5 mr-2" />
            )}
            {loading ? 'Connecting...' : 'Connect Facebook'}
          </button>
        );
      
      case 'instagram':
        return (
          <button
            onClick={handleFacebookConnect}
            disabled={loading}
            className={`${baseClasses} bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 shadow-lg hover:shadow-xl`}
            data-platform="instagram"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Instagram className="h-5 w-5 mr-2" />
            )}
            {loading ? 'Connecting...' : 'Connect Instagram'}
          </button>
        );
      
      case 'youtube':
        return (
          <button
            onClick={handleYouTubeConnect}
            disabled={loading}
            className={`${baseClasses} bg-red-600 text-white hover:bg-red-700 shadow-lg hover:shadow-xl`}
            data-platform="youtube"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Youtube className="h-5 w-5 mr-2" />
            )}
            {loading ? 'Connecting...' : 'Connect YouTube'}
          </button>
        );
      
      case 'linkedin':
        return (
          <button
            onClick={handleLinkedInConnect}
            disabled={loading}
            className={`${baseClasses} bg-blue-700 text-white hover:bg-blue-800 shadow-lg hover:shadow-xl`}
            data-platform="linkedin"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Linkedin className="h-5 w-5 mr-2" />
            )}
            {loading ? 'Connecting...' : 'Connect LinkedIn'}
          </button>
        );
      
      case 'twitter':
        return (
          <button
            onClick={handleTwitterConnect}
            disabled={loading}
            className={`${baseClasses} bg-blue-400 text-white hover:bg-blue-500 shadow-lg hover:shadow-xl`}
            data-platform="twitter"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Twitter className="h-5 w-5 mr-2" />
            )}
            {loading ? 'Connecting...' : 'Connect Twitter'}
          </button>
        );
      
      default:
        return null;
    }
  };

  const getPlatformIcon = () => {
    switch (platform) {
      case 'facebook': return <Facebook className="h-6 w-6 text-blue-600" />;
      case 'instagram': return <Instagram className="h-6 w-6 text-pink-600" />;
      case 'youtube': return <Youtube className="h-6 w-6 text-red-600" />;
      case 'linkedin': return <Linkedin className="h-6 w-6 text-blue-700" />;
      case 'twitter': return <Twitter className="h-6 w-6 text-blue-400" />;
      default: return null;
    }
  };

  const getPlatformName = () => {
    return platform?.charAt(0).toUpperCase() + platform?.slice(1) || 'Social Media';
  };

  const getCurrentPlatformAccounts = () => {
    return connectedAccounts.filter(account => account.platform === platform);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-4">
          {getPlatformIcon()}
          <h3 className="text-2xl font-bold text-gray-900">
            Connect {getPlatformName()}
          </h3>
        </div>
        <p className="text-gray-600">
          Connect your {getPlatformName()} account for {customer.name}
        </p>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Connection Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Success Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <div className="flex items-start space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-800 font-medium">Success!</p>
              <p className="text-green-700 text-sm mt-1">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Existing Connections */}
      {getCurrentPlatformAccounts().length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-semibold text-blue-900 mb-3">Connected Accounts ({getCurrentPlatformAccounts().length})</h4>
          <div className="space-y-2">
            {getCurrentPlatformAccounts().map((account, index) => (
              <div key={account._id || index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3">
                  {getPlatformIcon()}
                  <div>
                    <p className="font-medium text-gray-900">{account.name}</p>
                    <p className="text-sm text-gray-600">{account.email}</p>
                    {account.pages && (
                      <p className="text-xs text-gray-500">{account.pages.length} page(s) connected</p>
                    )}
                    {/* Token expired warning (basic checking) */}
                    {account.accessToken && account.accessToken.length < 40 && (
                      <span className="text-xs text-orange-600 font-medium">
                        Token expired or invalid. Please disconnect and reconnect.
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => disconnectAccount(account._id)}
                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-all duration-200"
                  title="Disconnect account (enables re-connect)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="text-xs text-gray-600 mt-2">
            If your access token has expired or posting fails, please <b>Disconnect</b> and then <b>Reconnect</b> your account.
          </div>
        </div>
      )}

      {/* Connection Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h4 className="font-semibold text-gray-900 mb-3">What you'll get:</h4>
        <ul className="space-y-2 text-sm text-gray-700">
          {platform === 'facebook' && (
            <>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Access to all your Facebook pages</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Ability to post and schedule content</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Long-lived access tokens for reliable posting</span>
              </li>
            </>
          )}
          {platform === 'instagram' && (
            <>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Access to Instagram Business accounts</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Post photos, videos, and carousel content</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Schedule posts for optimal engagement</span>
              </li>
            </>
          )}
          {platform === 'youtube' && (
            <>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Upload videos to your YouTube channels</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Set video titles, descriptions, and thumbnails</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Schedule video publishing</span>
              </li>
            </>
          )}
          {platform === 'linkedin' && (
            <>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Access to your LinkedIn professional profile</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Post text and image content to your network</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Schedule professional content publishing</span>
              </li>
            </>
          )}
          {platform === 'twitter' && (
            <>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Post tweets with images and videos</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Schedule tweets for optimal timing</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span>Thread support for longer content</span>
              </li>
            </>
          )}
        </ul>
      </div>

      {/* Connection Button */}
      <div className="text-center">
        {getConnectionButton()}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={fetchExistingConnections}
          disabled={loading}
          className="text-gray-600 hover:text-gray-800 text-sm flex items-center justify-center space-x-1 mx-auto"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh connections</span>
        </button>
      </div>

      {/* Close Button (if compact mode) */}
      {compact && onClose && (
        <div className="text-center pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 font-medium"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default forwardRef(SocialIntegrations);