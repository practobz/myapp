import React, { useState, useEffect } from 'react';
import { Instagram, TrendingUp, ExternalLink, CheckCircle, AlertCircle, Loader2, Users, Heart, MessageCircle, Eye, Plus, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import TrendChart from '../../components/TrendChart';
import { subDays, format } from 'date-fns';
import { getUserData, setUserData, removeUserData, migrateToUserSpecificStorage } from '../../utils/sessionUtils';

// Your Facebook App ID (Instagram uses Facebook's Graph API)
const FACEBOOK_APP_ID = '4416243821942660'; // Updated to your new AirSpark app

function InstagramIntegration() {
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]); // Array of connected accounts
  const [selectedAccountId, setSelectedAccountId] = useState(null); // Currently selected account
  const [availableAccounts, setAvailableAccounts] = useState([]); // Available accounts to connect
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [userAccessToken, setUserAccessToken] = useState(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  useEffect(() => {
    if (window.FB) {
      setFbSdkLoaded(true);
      window.FB.getLoginStatus(response => {
        if (response.status === 'connected') {
          setIsSignedIn(true);
          setUserAccessToken(response.authResponse.accessToken);
          loadAvailableAccounts(response.authResponse.accessToken);
        }
      });
    } else {
      loadFacebookSDK();
    }
  }, []);

  useEffect(() => {
    // First, migrate any existing data to user-specific storage
    migrateToUserSpecificStorage([
      'connected_instagram_accounts',
      'selected_instagram_account'
    ]);

    // Load saved accounts from localStorage on mount
    const savedAccounts = getUserData('connected_instagram_accounts');
    const savedSelectedId = getUserData('selected_instagram_account');
    
    if (savedAccounts) {
      setConnectedAccounts(savedAccounts);
      
      if (savedSelectedId && savedAccounts.find(acc => acc.id === savedSelectedId)) {
        setSelectedAccountId(savedSelectedId);
      } else if (savedAccounts.length > 0) {
        setSelectedAccountId(savedAccounts[0].id);
      }
    }
  }, []);

  const loadFacebookSDK = () => {
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

      window.FB.getLoginStatus(response => {
        if (response.status === 'connected') {
          setIsSignedIn(true);
          setUserAccessToken(response.authResponse.accessToken);
          loadAvailableAccounts(response.authResponse.accessToken);
        }
      });
    };

    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  };

  const handleSignIn = () => {
    if (!fbSdkLoaded) {
      setError('Facebook SDK not loaded yet. Please try again.');
      return;
    }

    setLoading(true);
    window.FB.login(response => {
      setLoading(false);
      if (response.status === 'connected') {
        setIsSignedIn(true);
        setError(null);
        setUserAccessToken(response.authResponse.accessToken);
        loadAvailableAccounts(response.authResponse.accessToken);
      } else {
        setError('Please log in to Facebook to access Instagram features. Regular Facebook accounts can connect Instagram Business accounts.');
      }
    }, {
      scope: 'email,public_profile,pages_show_list,pages_read_engagement'
    });
  };

  const loadAvailableAccounts = (accessToken) => {
    setLoadingAccounts(true);
    
    window.FB.api('/me/accounts', {
      fields: 'id,name,instagram_business_account',
      access_token: accessToken
    }, function(response) {
      setLoadingAccounts(false);
      
      if (!response || response.error) {
        setError('Unable to fetch Facebook pages. Make sure you have an Instagram Business account connected to a Facebook page you manage.');
        return;
      }

      const pagesWithInstagram = response.data.filter(page => page.instagram_business_account);
      
      if (pagesWithInstagram.length === 0) {
        setError('No Instagram Business accounts found. To connect Instagram: 1) Convert to Business account in Instagram app, 2) Connect it to a Facebook page you manage.');
        return;
      }

      // Transform the data to include page info
      const accounts = pagesWithInstagram.map(page => ({
        id: page.instagram_business_account.id,
        pageId: page.id,
        pageName: page.name,
        pageAccessToken: page.access_token || accessToken,
        connected: false,
        profile: null,
        media: []
      }));

      setAvailableAccounts(accounts);
    });
  };

  const connectInstagramAccount = async (accountData) => {
    setLoading(true);
    
    try {
      // Fetch Instagram profile info
      window.FB.api(`/${accountData.id}`, {
        fields: 'id,username,media_count,profile_picture_url,biography,website,followers_count',
        access_token: accountData.pageAccessToken
      }, function(profileResponse) {
        if (!profileResponse || profileResponse.error) {
          setError(`Unable to fetch Instagram profile for ${accountData.pageName}. Please ensure it's properly connected.`);
          setLoading(false);
          return;
        }

        // Fetch recent media
        window.FB.api(`/${accountData.id}/media`, {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          limit: 12,
          access_token: accountData.pageAccessToken
        }, function(mediaResponse) {
          const newAccount = {
            ...accountData,
            connected: true,
            profile: profileResponse,
            media: mediaResponse.data || [],
            connectedAt: new Date().toISOString()
          };

          const updatedAccounts = [...connectedAccounts, newAccount];
          setConnectedAccounts(updatedAccounts);
          
          // Set as selected if it's the first account
          if (!selectedAccountId) {
            setSelectedAccountId(newAccount.id);
          }

          // Save to localStorage with user-specific keys
          setUserData('connected_instagram_accounts', updatedAccounts);
          if (!selectedAccountId) {
            setUserData('selected_instagram_account', newAccount.id);
          }

          // Store customer social account for admin access
          storeCustomerSocialAccount(newAccount);

          // Remove from available accounts
          setAvailableAccounts(prev => prev.filter(acc => acc.id !== accountData.id));
          setLoading(false);
          setError(null);
        });
      });
    } catch (err) {
      setError('Failed to connect Instagram account');
      setLoading(false);
    }
  };

  // Store customer social account for admin access
  const storeCustomerSocialAccount = async (account) => {
    try {
      // Get current user/customer ID from auth context or localStorage
      let customerId = null;
      
      // Try multiple ways to get customer ID (similar to contentRoutes.js pattern)
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      customerId = currentUser.userId || currentUser.id || currentUser._id || currentUser.customer_id;
      
      // If still no customer ID, try getting from other possible sources
      if (!customerId) {
        const authUser = JSON.parse(localStorage.getItem('user') || '{}');
        customerId = authUser.userId || authUser.id || authUser._id || authUser.customer_id;
      }
      
      // Log what we found for debugging
      console.log('🔍 Instagram Customer ID search:', {
        currentUser,
        customerId,
        found: !!customerId
      });
      
      if (!customerId) {
        console.warn('No customer ID found, cannot store Instagram social account');
        return;
      }

      // CRITICAL: Always store user access token for refresh capabilities
      if (!userAccessToken) {
        console.warn('⚠️ No user access token available - refresh capabilities will be limited');
      }

      // Get user information for storing user access token
      let userInfo = null;
      let userId = null;
      
      if (userAccessToken) {
        try {
          // Fetch user info to get user ID for token refresh
          const userResponse = await new Promise((resolve, reject) => {
            window.FB.api('/me', {
              fields: 'id,name,email',
              access_token: userAccessToken
            }, function(response) {
              if (response && !response.error) {
                resolve(response);
              } else {
                reject(new Error(response?.error?.message || 'Failed to fetch user info'));
              }
            });
          });
          
          userInfo = userResponse;
          userId = userResponse.id;
          
          console.log('✅ Retrieved user info for token storage:', {
            userId: userId,
            name: userInfo.name,
            hasUserToken: !!userAccessToken,
            userTokenLength: userAccessToken.length
          });
          
        } catch (userError) {
          console.warn('Failed to fetch user info for token storage:', userError);
          // Continue without user info but log the issue
        }
      }

      // Store the account data with INSTAGRAM platform for scheduling
      const accountData = {
        customerId: customerId,
        platform: 'instagram', // ✅ Changed to 'instagram' for scheduling purposes
        platformUserId: account.id, // Use Instagram Business Account ID as primary ID
        facebookUserId: userId, // Store Facebook user ID separately for token refresh
        facebookPageId: account.pageId, // Store Facebook page ID for API calls
        name: userInfo?.name || account.profile?.username || account.pageName,
        email: userInfo?.email || '',
        profilePicture: account.profile?.profile_picture_url,
        username: account.profile?.username, // Instagram username for display
        accessToken: userAccessToken, // CRITICAL: Store user access token for refresh
        userId: userId, // Store user ID for refresh operations
        pages: [{
          id: account.pageId,
          name: account.pageName,
          accessToken: account.pageAccessToken, // Store page access token for posting
          category: 'Instagram Business',
          fanCount: account.profile?.followers_count || 0,
          instagramBusinessAccount: {
            id: account.id,
            username: account.profile?.username
          },
          tokenValidatedAt: new Date().toISOString(),
          permissions: ['pages_read_engagement', 'pages_manage_posts', 'instagram_basic', 'instagram_content_publish']
        }],
        // Instagram-specific metadata
        instagramData: {
          businessAccountId: account.id,
          username: account.profile?.username,
          mediaCount: account.profile?.media_count,
          followersCount: account.profile?.followers_count,
          biography: account.profile?.biography,
          website: account.profile?.website
        },
        connectedAt: account.connectedAt,
        needsReconnection: false,
        lastTokenValidation: new Date().toISOString(),
        type: 'customer_social_link'
      };

      // VALIDATION: Ensure we have both tokens
      if (!accountData.accessToken) {
        console.warn('⚠️ Missing user access token - refresh will not work');
        accountData.needsReconnection = true;
        accountData.refreshError = 'User access token not available during connection';
      }

      if (!accountData.pages[0].accessToken) {
        console.warn('⚠️ Missing page access token - posting will not work');
        throw new Error('Page access token is required for Instagram posting. Please ensure you have admin access to the Facebook page connected to this Instagram account.');
      }

      console.log('📤 Storing Instagram account data for scheduling:', { 
        customerId, 
        platform: 'instagram', // ✅ Now correctly shows as Instagram
        instagramBusinessAccountId: account.id,
        username: account.profile?.username,
        hasUserToken: !!accountData.accessToken,
        hasPageToken: !!accountData.pages[0].accessToken,
        userTokenLength: accountData.accessToken?.length || 0,
        pageTokenLength: accountData.pages[0].accessToken?.length || 0
      });

      // Send to server
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });

      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored Instagram account for scheduling with platform: instagram');
      } else {
        console.warn('Failed to store Instagram account:', result.error);
        alert(`Warning: Failed to store account data - ${result.error}. You may need to reconnect later.`);
      }
      
    } catch (error) {
      console.warn('Failed to store Instagram account:', error);
      alert(`Warning: ${error.message}. You may need to reconnect your Instagram account later.`);
    }
  };

  const disconnectAccount = (accountId) => {
    const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
    setConnectedAccounts(updatedAccounts);
    
    // If disconnecting the selected account, select another one
    if (selectedAccountId === accountId) {
      const newSelectedId = updatedAccounts.length > 0 ? updatedAccounts[0].id : null;
      setSelectedAccountId(newSelectedId);
      setUserData('selected_instagram_account', newSelectedId || '');
    }

    setUserData('connected_instagram_accounts', updatedAccounts);
    
    // Add back to available accounts if still in Facebook pages
    const availableAccount = availableAccounts.find(acc => acc.id === accountId);
    if (availableAccount) {
      setAvailableAccounts(prev => [...prev, { ...availableAccount, connected: false }]);
    } else {
      // Refresh available accounts
      if (userAccessToken) {
        loadAvailableAccounts(userAccessToken);
      }
    }
  };

  const selectAccount = (accountId) => {
    setSelectedAccountId(accountId);
    setUserData('selected_instagram_account', accountId);
    setShowAccountSelector(false);
    setAnalyticsData(null); // Clear analytics when switching accounts
  };

  const refreshAccountData = (accountId) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (!account) return;

    setLoading(true);

    // Refresh profile and media data
    window.FB.api(`/${accountId}`, {
      fields: 'id,username,media_count,profile_picture_url,biography,website,followers_count',
      access_token: account.pageAccessToken
    }, function(profileResponse) {
      if (profileResponse && !profileResponse.error) {
        window.FB.api(`/${accountId}/media`, {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          limit: 12,
          access_token: account.pageAccessToken
        }, function(mediaResponse) {
          const updatedAccounts = connectedAccounts.map(acc => 
            acc.id === accountId 
              ? { 
                  ...acc, 
                  profile: profileResponse, 
                  media: mediaResponse.data || [],
                  lastRefreshed: new Date().toISOString()
                }
              : acc
          );
          
          setConnectedAccounts(updatedAccounts);
          setUserData('connected_instagram_accounts', updatedAccounts);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    setConnectedAccounts([]);
    setAvailableAccounts([]);
    setSelectedAccountId(null);
    setError(null);
    setAnalyticsData(null);
    setUserAccessToken(null);
    
    // Clear localStorage with user-specific keys
    removeUserData('connected_instagram_accounts');
    removeUserData('selected_instagram_account');
    
    if (window.FB) {
      window.FB.logout();
    }
  };

  const fetchAnalytics = () => {
    const selectedAccount = connectedAccounts.find(acc => acc.id === selectedAccountId);
    if (!selectedAccount) return;
    
    setLoadingAnalytics(true);
    generateMediaBasedAnalytics(selectedAccount);
  };

  const generateMediaBasedAnalytics = (account) => {
    if (!account.media || account.media.length === 0) {
      setLoadingAnalytics(false);
      setError('No media data available for analytics. Upload some posts to Instagram first!');
      return;
    }

    const endDate = new Date();
    const result = {
      followers: [],
      impressions: [],
      reach: [],
      posts: []
    };

    for (let i = 29; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const mediaUpToDate = account.media.filter(media => {
        const mediaDate = new Date(media.timestamp);
        return mediaDate <= date;
      });

      const postsCount = mediaUpToDate.length;
      const estimatedFollowers = account.profile.followers_count || Math.max(100, postsCount * 10);
      const estimatedReach = Math.floor(postsCount * Math.random() * 50 + 10);
      const estimatedImpressions = Math.floor(estimatedReach * 1.5);

      result.followers.push({ date: dateStr, value: estimatedFollowers });
      result.impressions.push({ date: dateStr, value: estimatedImpressions });
      result.reach.push({ date: dateStr, value: estimatedReach });
      result.posts.push({ date: dateStr, value: postsCount });
    }

    setAnalyticsData(result);
    setLoadingAnalytics(false);
  };

  const renderAnalytics = () => {
    if (!analyticsData) return null;
    
    return (
      <div className="mt-8 space-y-6">
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-pink-600 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Instagram Analytics</h3>
              <p className="text-sm text-gray-600">Last 30 days performance for selected account</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analyticsData.followers.length > 0 && (
            <TrendChart
              data={analyticsData.followers}
              title="Follower Growth"
              color="#E4405F"
              metric="value"
            />
          )}
          
          {analyticsData.impressions.length > 0 && (
            <TrendChart
              data={analyticsData.impressions}
              title="Daily Impressions"
              color="#C13584"
              metric="value"
            />
          )}
          
          {analyticsData.reach.length > 0 && (
            <TrendChart
              data={analyticsData.reach}
              title="Daily Reach"
              color="#F56040"
              metric="value"
            />
          )}
          
          {analyticsData.posts.length > 0 && (
            <TrendChart
              data={analyticsData.posts}
              title="Posts per Day"
              color="#FF6B9D"
              metric="value"
            />
          )}
        </div>
      </div>
    );
  };

  const selectedAccount = connectedAccounts.find(acc => acc.id === selectedAccountId);

  const renderAccountSelector = () => {
    if (connectedAccounts.length <= 1) return null;

    return (
      <div className="relative">
        <button
          onClick={() => setShowAccountSelector(!showAccountSelector)}
          className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            {selectedAccount?.profile?.profile_picture_url ? (
              <img
                src={selectedAccount.profile.profile_picture_url}
                alt="Profile"
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <Instagram className="h-4 w-4 text-pink-600" />
            )}
            <span>@{selectedAccount?.profile?.username || 'Select Account'}</span>
          </div>
          {showAccountSelector ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {showAccountSelector && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
                Connected Accounts ({connectedAccounts.length})
              </div>
              {connectedAccounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => selectAccount(account.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors ${
                    selectedAccountId === account.id ? 'bg-pink-50 border border-pink-200' : ''
                  }`}
                >
                  {account.profile?.profile_picture_url ? (
                    <img
                      src={account.profile.profile_picture_url}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                      <Instagram className="h-4 w-4 text-pink-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      @{account.profile?.username}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {account.pageName}
                    </div>
                  </div>
                  {selectedAccountId === account.id && (
                    <CheckCircle className="h-4 w-4 text-pink-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderAvailableAccounts = () => {
    if (availableAccounts.length === 0) return null;

    return (
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Plus className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-900">Available Instagram Accounts</h3>
        </div>
        <p className="text-blue-700 text-sm mb-4">
          Found {availableAccounts.length} additional Instagram Business account(s) you can connect:
        </p>
        <div className="space-y-3">
          {availableAccounts.map(account => (
            <div key={account.id} className="flex items-center justify-between bg-white rounded-lg p-4 border border-blue-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <Instagram className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{account.pageName}</div>
                  <div className="text-sm text-gray-500">Instagram Business Account</div>
                </div>
              </div>
              <button
                onClick={() => connectInstagramAccount(account)}
                disabled={loading}
                className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConnectedState = () => (
    <div className="space-y-6">
      {/* Enhanced token status notification with more specific guidance */}
     

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {connectedAccounts.length} Account{connectedAccounts.length !== 1 ? 's' : ''} Connected
              </span>
            </div>
          </div>
          {renderAccountSelector()}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (userAccessToken) {
                loadAvailableAccounts(userAccessToken);
              }
            }}
            disabled={loadingAccounts}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{loadingAccounts ? 'Searching...' : 'Add Account'}</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Disconnect All</span>
          </button>
        </div>
      </div>

      {/* Enhanced connection troubleshooting */}
      {error && (error.includes('invalidated') || error.includes('refresh') || error.includes('reconnect')) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-800">Token Refresh Issue Detected</h3>
          </div>
          <p className="text-blue-700 mb-4">
            Your Facebook access tokens are invalid and cannot be refreshed automatically. This happens when:
          </p>
          <ul className="text-sm text-blue-700 list-disc list-inside space-y-1 mb-4">
            <li>You changed your Facebook password</li>
            <li>Facebook detected suspicious activity and invalidated tokens</li>
            <li>You logged out of Facebook in another browser/device</li>
            <li>The user access token needed for refresh is missing or expired</li>
            <li>Facebook performed a security check and revoked access</li>
          </ul>
          <div className="bg-white border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-blue-800 mb-1">🔄 How Token Refresh Works:</p>
            <p className="text-xs text-blue-700">
              Instagram posting requires page access tokens, which can be refreshed using your Facebook user access token. 
              When both tokens become invalid, you need to reconnect to restore posting capabilities.
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleSignOut}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Reconnect Facebook Account
            </button>
            <button
              onClick={() => setError(null)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {renderAvailableAccounts()}

      {selectedAccount && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {selectedAccount.profile?.profile_picture_url ? (
                <img
                  src={selectedAccount.profile.profile_picture_url}
                  alt="Instagram profile"
                  className="w-20 h-20 rounded-full border-4 border-pink-200"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center">
                  <Instagram className="h-10 w-10 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">@{selectedAccount.profile?.username}</h2>
                <p className="text-sm text-gray-600">{selectedAccount.pageName}</p>
                {selectedAccount.profile?.biography && (
                  <p className="text-gray-700 text-sm mt-1">{selectedAccount.profile.biography}</p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => refreshAccountData(selectedAccount.id)}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 bg-white border border-pink-200 text-pink-700 rounded-lg hover:bg-pink-50 transition-colors disabled:opacity-50 text-sm"
              >
                <Settings className="h-4 w-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => disconnectAccount(selectedAccount.id)}
                className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                <ExternalLink className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-pink-600">
                {selectedAccount.profile?.media_count?.toLocaleString() || selectedAccount.media?.length || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium">Posts</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-pink-600">
                {selectedAccount.profile?.followers_count?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-sm text-gray-600 font-medium">Followers</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-pink-600">
                {selectedAccount.media?.reduce((sum, media) => sum + (media.like_count || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">Total Likes</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={fetchAnalytics}
          disabled={loadingAnalytics || !selectedAccount}
          className="flex items-center space-x-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 transition-all duration-200 font-medium"
        >
          {loadingAnalytics ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          <span>View Analytics</span>
        </button>
      </div>

      {renderAnalytics()}

      {selectedAccount && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Posts ({selectedAccount.media?.length || 0})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {selectedAccount.media && selectedAccount.media.length > 0 ? selectedAccount.media.map(media => (
              <div key={media.id} className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square relative">
                  <img
                    src={media.thumbnail_url || media.media_url}
                    alt={media.caption ? media.caption.substring(0, 50) + '...' : 'Instagram post'}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs font-medium">
                    {media.media_type}
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-800 mb-3 line-clamp-2">
                    {media.caption ? 
                      (media.caption.length > 100 ? media.caption.substring(0, 100) + '...' : media.caption)
                      : 'No caption'
                    }
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <span>{new Date(media.timestamp).toLocaleDateString()}</span>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span>{media.like_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3 text-blue-500" />
                        <span>{media.comments_count || 0}</span>
                      </div>
                    </div>
                  </div>
                  {media.permalink && (
                    <a 
                      href={media.permalink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700 text-xs font-medium inline-flex items-center space-x-1"
                    >
                      <span>View on Instagram</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            )) : (
              <div className="col-span-full text-center py-12">
                <Instagram className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No posts found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!fbSdkLoaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Instagram className="h-8 w-8 text-pink-600" />
              <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Instagram Integration</span>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
                <p className="text-gray-600">Loading Facebook SDK...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Instagram className="h-8 w-8 text-pink-600" />
            <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Instagram Integration</span>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
                <p className="text-gray-600">Connecting to Instagram...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">Connection Error</h3>
              </div>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  Requirements for Instagram integration:
                </p>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                  <li>Instagram Business or Creator account</li>
                  <li>Instagram account connected to a Facebook page</li>
                  <li>Admin access to the Facebook page</li>
                  <li>Proper permissions granted during Facebook login</li>
                </ul>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Dismiss
                </button>
                <button
                  onClick={handleSignIn}
                  className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {!isSignedIn ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl mb-4">
                <Instagram className="h-8 w-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Instagram Business Accounts</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect multiple Instagram Business accounts through Facebook. Manage all your accounts from one dashboard!
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
                <h4 className="font-medium text-blue-800 mb-2">📱 Multi-Account Setup Guide</h4>
                <div className="text-sm text-blue-700 text-left space-y-1">
                  <p>1. Convert Instagram accounts to Business/Creator accounts</p>
                  <p>2. Connect each account to a Facebook page you manage</p>
                  <p>3. Click "Connect" below and log in to Facebook</p>
                  <p>4. Grant permissions to access all your connected accounts</p>
                  <p>5. Select which accounts to connect and manage</p>
                </div>
              </div>
              <button
                onClick={handleSignIn}
                className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-3 mx-auto font-medium"
                disabled={loading}
              >
                <Instagram className="h-5 w-5" />
                <span>{loading ? 'Connecting...' : 'Connect Instagram Accounts'}</span>
              </button>
            </div>
          ) : connectedAccounts.length === 0 && availableAccounts.length === 0 && !loadingAccounts ? (
            <div className="text-center py-12">
              <Instagram className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Instagram Business Accounts Found</h3>
              <p className="text-gray-600 mb-4">
                We couldn't find any Instagram Business accounts connected to your Facebook pages.
              </p>
              <button
                onClick={() => userAccessToken && loadAvailableAccounts(userAccessToken)}
                disabled={loadingAccounts}
                className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
              >
                {loadingAccounts ? 'Searching...' : 'Search Again'}
              </button>
            </div>
          ) : (
            renderConnectedState()
          )}
        </div>
      </div>
    </div>
  );
}

export default InstagramIntegration;