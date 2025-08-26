import React, { useState, useEffect } from 'react';
import { 
  Facebook, 
  Instagram, 
  Youtube, 
  Twitter, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  X, 
  ExternalLink,
  RefreshCw
} from 'lucide-react';

// Facebook App ID (already correct)
const FACEBOOK_APP_ID = '4416243821942660';

const SocialIntegrations = ({ platform, customer, onConnectionSuccess, onClose, compact = false }) => {
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

  const fetchExistingConnections = async () => {
    try {
      // Fix: Use correct API base URL
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/customer-social-links/${customer.id}`
      );
      const data = await response.json();
      if (data.success && data.data) {
        setConnectedAccounts(data.data.socialAccounts || []);
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

  // Update saveAccountToDatabase to use correct endpoint
  const saveAccountToDatabase = async (accountData) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });

      const result = await response.json();
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

  const disconnectAccount = async (accountId) => {
    setLoading(true);
    try {
      // Fix: Use correct API base URL
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-accounts/${accountId}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (result.success) {
        setSuccess('Account disconnected successfully');
        await fetchExistingConnections();
        if (onConnectionSuccess) onConnectionSuccess();
      } else {
        setError(result.error || 'Failed to disconnect account');
      }
    } catch (err) {
      setError('Failed to disconnect account: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const getConnectionButton = () => {
    const baseClasses = "flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
    
    switch (platform) {
      case 'facebook':
        return (
          <button
            onClick={handleFacebookConnect}
            disabled={loading}
            className={`${baseClasses} bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl`}
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
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Youtube className="h-5 w-5 mr-2" />
            )}
            {loading ? 'Connecting...' : 'Connect YouTube'}
          </button>
        );
      
      case 'twitter':
        return (
          <button
            onClick={handleTwitterConnect}
            disabled={loading}
            className={`${baseClasses} bg-blue-400 text-white hover:bg-blue-500 shadow-lg hover:shadow-xl`}
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
                  </div>
                </div>
                <button
                  onClick={() => disconnectAccount(account._id)}
                  className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-all duration-200"
                  title="Disconnect account"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
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

export default SocialIntegrations;