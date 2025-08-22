import React, { useState, useEffect } from 'react';
import { Instagram, TrendingUp, ExternalLink, CheckCircle, AlertCircle, Loader2, Users, Heart, MessageCircle, Eye, Plus, Settings, ChevronDown, ChevronRight, UserCheck, Trash2 } from 'lucide-react';
import TrendChart from '../../components/TrendChart';
import { subDays, format } from 'date-fns';
import { getUserData, setUserData, removeUserData, migrateToUserSpecificStorage } from '../../utils/sessionUtils';

// Your Facebook App ID (Instagram uses Facebook's Graph API)
const FACEBOOK_APP_ID = '4416243821942660'; // Updated to your new AirSpark app

function InstagramIntegration() {
  // Multi-account state management (similar to Facebook integration)
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]); // Array of connected Instagram accounts
  const [activeAccountId, setActiveAccountId] = useState(null); // Currently active account
  const [activeAccount, setActiveAccount] = useState(null); // Active account object
  const [availableAccounts, setAvailableAccounts] = useState([]); // Available accounts to connect
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [userAccessToken, setUserAccessToken] = useState(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  
  // Legacy state for backward compatibility
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // Helper function to check if Facebook API is ready
  const isFacebookApiReady = () => {
    return window.FB && window.FB.api && typeof window.FB.api === 'function';
  };

  // Load connected accounts from localStorage on component mount
  useEffect(() => {
    console.log('🔍 Instagram component mounted, loading accounts from storage...');
    
    // First, migrate any existing data to user-specific storage
    migrateToUserSpecificStorage([
      'connected_instagram_accounts',
      'selected_instagram_account',
      'instagram_connected_accounts',
      'instagram_active_account_id'
    ]);

    const savedAccounts = getUserData('instagram_connected_accounts') || getUserData('connected_instagram_accounts');
    const savedActiveId = getUserData('instagram_active_account_id') || getUserData('selected_instagram_account');
    
    console.log('📦 Instagram storage check on mount:', {
      savedAccounts: savedAccounts ? savedAccounts.length : 0,
      savedActiveId,
      accountsData: savedAccounts
    });
    
    if (savedAccounts && Array.isArray(savedAccounts) && savedAccounts.length > 0) {
      console.log('✅ Setting Instagram accounts from storage:', savedAccounts);
      setConnectedAccounts(savedAccounts);
      setIsSignedIn(true); // Set signed in state
      
      if (savedActiveId && savedAccounts.some(acc => acc.id === savedActiveId)) {
        setActiveAccountId(savedActiveId);
        setSelectedAccountId(savedActiveId); // Backward compatibility
        const activeAcc = savedAccounts.find(acc => acc.id === savedActiveId);
        setActiveAccount(activeAcc);
        setUserAccessToken(activeAcc.userAccessToken || activeAcc.accessToken);
        console.log('✅ Set active Instagram account:', activeAcc?.profile?.username);
      } else if (savedAccounts.length > 0) {
        // Set first account as active if no valid active account
        setActiveAccountId(savedAccounts[0].id);
        setSelectedAccountId(savedAccounts[0].id); // Backward compatibility
        setActiveAccount(savedAccounts[0]);
        setUserAccessToken(savedAccounts[0].userAccessToken || savedAccounts[0].accessToken);
        setUserData('instagram_active_account_id', savedAccounts[0].id);
        console.log('✅ Set first Instagram account as active:', savedAccounts[0].profile?.username);
      }
    } else {
      console.log('ℹ️ No connected Instagram accounts found in storage');
    }
  }, []);

  useEffect(() => {
    if (window.FB) {
      setFbSdkLoaded(true);
      // Check existing login status
      window.FB.getLoginStatus(response => {
        if (response.status === 'connected') {
          setUserAccessToken(response.authResponse.accessToken);
          if (connectedAccounts.length === 0) {
            loadAvailableAccounts(response.authResponse.accessToken);
          }
        }
      });
    } else {
      loadFacebookSDK();
    }
  }, []);

  // Save accounts to localStorage with better error handling
  const saveAccountsToStorage = (accounts) => {
    console.log('💾 Saving Instagram accounts to storage:', accounts.length, 'accounts');
    try {
      setUserData('instagram_connected_accounts', accounts);
      // Also save to legacy key for backward compatibility
      setUserData('connected_instagram_accounts', accounts);
      console.log('✅ Instagram accounts saved successfully');
      
      // Verify the save worked
      const verification = getUserData('instagram_connected_accounts');
      console.log('🔍 Instagram storage verification:', verification ? verification.length : 0, 'accounts');
    } catch (error) {
      console.error('❌ Failed to save Instagram accounts:', error);
    }
  };

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
      
      // Wait for FB to be fully ready
      const checkReady = () => {
        if (isFacebookApiReady()) {
          setFbSdkLoaded(true);
          
          window.FB.getLoginStatus(response => {
            if (response.status === 'connected') {
              setUserAccessToken(response.authResponse.accessToken);
              if (connectedAccounts.length === 0) {
                loadAvailableAccounts(response.authResponse.accessToken);
              }
            }
          });
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    };

    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  };

  // Check if token is expired or about to expire
  const isTokenExpired = (account) => {
    if (!account.tokenExpiresAt) return false;
    
    const expiryTime = new Date(account.tokenExpiresAt);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    return (expiryTime.getTime() - now.getTime()) < bufferTime;
  };

  // Handle API errors and token refresh
  const handleApiError = async (error, accountId = null) => {
    console.error('Instagram/Facebook API Error:', error);
    
    if (error.code === 190 || error.message?.includes('expired') || error.message?.includes('Session has expired')) {
      console.log('🔄 Token expired, attempting refresh...');
      
      // Try to refresh the current session
      const refreshSuccess = await refreshCurrentSession();
      
      if (refreshSuccess) {
        console.log('✅ Session refreshed successfully');
        setError(null);
        
        // Retry loading available accounts if we have a token
        if (userAccessToken && connectedAccounts.length === 0) {
          setTimeout(() => {
            loadAvailableAccounts(userAccessToken);
          }, 1000);
        }
      } else {
        console.log('❌ Session refresh failed');
        setError('Your Facebook session has expired. Please reconnect your account to continue using Instagram features.');
      }
    } else {
      setError(error.message || 'An error occurred while accessing Instagram data.');
    }
  };

  // Refresh current session
  const refreshCurrentSession = async () => {
    return new Promise((resolve) => {
      if (!isFacebookApiReady()) {
        resolve(false);
        return;
      }

      window.FB.getLoginStatus((response) => {
        if (response.status === 'connected') {
          // Update token in our storage
          const newToken = response.authResponse.accessToken;
          const userId = response.authResponse.userID;
          
          setUserAccessToken(newToken);
          
          // Update all connected accounts with new token
          if (connectedAccounts.length > 0) {
            const updatedAccounts = connectedAccounts.map(acc => ({
              ...acc,
              userAccessToken: newToken,
              tokenExpiresAt: response.authResponse.expiresIn ? 
                new Date(Date.now() + (response.authResponse.expiresIn * 1000)).toISOString() : null
            }));
            
            setConnectedAccounts(updatedAccounts);
            saveAccountsToStorage(updatedAccounts);
            
            // Update active account
            if (activeAccount) {
              const updatedActiveAccount = { ...activeAccount, userAccessToken: newToken };
              setActiveAccount(updatedActiveAccount);
            }
          }
          
          resolve(true);
        } else {
          resolve(false);
        }
      }, true); // Force fresh status check
    });
  };

  // Enhanced handleSignIn with better persistence
  const handleSignIn = () => {
    if (!fbSdkLoaded) {
      setError('Facebook SDK not loaded yet. Please try again.');
      return;
    }

    setLoading(true);
    console.log('🔐 Starting Facebook login for Instagram...');

    window.FB.login(response => {
      setLoading(false);
      console.log('📨 Facebook login response:', response.status);
      
      if (response.status === 'connected') {
        setIsSignedIn(true);
        setError(null);
        const accessToken = response.authResponse.accessToken;
        setUserAccessToken(accessToken);
        
        // Request long-lived token
        requestLongLivedToken(accessToken).then((longLivedToken) => {
          const finalToken = longLivedToken || accessToken;
          setUserAccessToken(finalToken);
          loadAvailableAccounts(finalToken);
        });
      } else {
        setError('Please log in to Facebook to access Instagram features. Regular Facebook accounts can connect Instagram Business accounts.');
      }
    }, {
      scope: 'email,public_profile,pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish'
    });
  };

  // Enhanced requestLongLivedToken
  const requestLongLivedToken = async (shortLivedToken) => {
    try {
      console.log('🔄 Requesting long-lived token for Instagram...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/facebook/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortLivedToken: shortLivedToken
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.longLivedToken) {
        console.log('✅ Received long-lived token for Instagram');
        return data.longLivedToken;
      } else {
        console.warn('⚠️ Failed to get long-lived token for Instagram:', data.error);
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Error requesting long-lived token for Instagram:', error);
      return null;
    }
  };

  const loadAvailableAccounts = (accessToken) => {
    setLoadingAccounts(true);
    
    window.FB.api('/me/accounts', {
      fields: 'id,name,instagram_business_account,access_token',
      access_token: accessToken
    }, function(response) {
      setLoadingAccounts(false);
      
      if (!response || response.error) {
        handleApiError(response.error);
        return;
      }

      const pagesWithInstagram = response.data.filter(page => page.instagram_business_account);
      
      if (pagesWithInstagram.length === 0) {
        setError('No Instagram Business accounts found. To connect Instagram: 1) Convert to Business account in Instagram app, 2) Connect it to a Facebook page you manage.');
        return;
      }

      const accounts = pagesWithInstagram.map(page => {
        const hasValidPageToken = !!(page.access_token && page.access_token !== accessToken);
        
        return {
          id: page.instagram_business_account.id,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: hasValidPageToken ? page.access_token : null,
          userAccessToken: accessToken,
          connected: false,
          profile: null,
          media: [],
          hasValidPageToken,
          tokenWarning: !hasValidPageToken ? 'Page token is same as user token - refresh may not work' : null
        };
      });

      // Filter out accounts that are already connected
      const availableAccountsFiltered = accounts.filter(acc => 
        !connectedAccounts.some(connected => connected.id === acc.id)
      );

      setAvailableAccounts(availableAccountsFiltered);
    });
  };

  // Enhanced connectInstagramAccount with better persistence
  const connectInstagramAccount = async (accountData) => {
    setLoading(true);
    
    try {
      if (!accountData.pageAccessToken) {
        setError('This Instagram account cannot be connected because the Facebook page does not have a proper page access token. Please ensure you have admin access to the Facebook page and try reconnecting your Facebook account.');
        setLoading(false);
        return;
      }

      console.log('✅ Valid page access token found, proceeding with Instagram connection...');
      
      // Fetch Instagram profile info
      window.FB.api(`/${accountData.id}`, {
        fields: 'id,username,media_count,profile_picture_url,biography,website,followers_count',
        access_token: accountData.pageAccessToken
      }, function(profileResponse) {
        if (!profileResponse || profileResponse.error) {
          handleApiError(profileResponse.error);
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
            connectedAt: new Date().toISOString(),
            userAccessToken: userAccessToken,
            pageAccessToken: accountData.pageAccessToken,
            tokenExpiresAt: null // Long-lived tokens don't typically expire
          };

          const updatedAccounts = [...connectedAccounts, newAccount];
          setConnectedAccounts(updatedAccounts);
          
          // Set as active if it's the first account
          if (!activeAccountId) {
            setActiveAccountId(newAccount.id);
            setSelectedAccountId(newAccount.id); // Backward compatibility
            setActiveAccount(newAccount);
            setUserData('instagram_active_account_id', newAccount.id);
            setUserData('selected_instagram_account', newAccount.id); // Backward compatibility
          }

          // Save to localStorage with user-specific keys
          saveAccountsToStorage(updatedAccounts);

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

  // Switch active account
  const switchAccount = (accountId) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (account) {
      setActiveAccountId(accountId);
      setSelectedAccountId(accountId); // Backward compatibility
      setActiveAccount(account);
      setUserData('instagram_active_account_id', accountId);
      setUserData('selected_instagram_account', accountId); // Backward compatibility
      setShowAccountSelector(false);
      setAnalyticsData(null); // Clear analytics when switching accounts
    }
  };

  // Remove account
  const removeAccount = (accountId) => {
    const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
    setConnectedAccounts(updatedAccounts);
    saveAccountsToStorage(updatedAccounts);
    
    if (activeAccountId === accountId) {
      if (updatedAccounts.length > 0) {
        // Switch to first remaining account
        switchAccount(updatedAccounts[0].id);
      } else {
        // No accounts left
        setActiveAccountId(null);
        setSelectedAccountId(null); // Backward compatibility
        setActiveAccount(null);
        setAnalyticsData(null);
        removeUserData('instagram_active_account_id');
        removeUserData('selected_instagram_account'); // Backward compatibility
        setIsSignedIn(false);
      }
    }
  };

  // Enhanced handleSignOut
  const handleSignOut = () => {
    console.log('🔄 Signing out from Instagram integration...');
    
    // Clear all state
    setIsSignedIn(false);
    setConnectedAccounts([]);
    setAvailableAccounts([]);
    setActiveAccountId(null);
    setSelectedAccountId(null); // Backward compatibility
    setActiveAccount(null);
    setError(null);
    setAnalyticsData(null);
    setUserAccessToken(null);
    
    // Clear localStorage with user-specific keys
    removeUserData('instagram_connected_accounts');
    removeUserData('instagram_active_account_id');
    removeUserData('connected_instagram_accounts'); // Backward compatibility
    removeUserData('selected_instagram_account'); // Backward compatibility
    
    if (window.FB && isFacebookApiReady()) {
      window.FB.logout();
    }
  };

  // Enhanced token refresh
  const refreshAccountTokens = async () => {
    if (!activeAccount || !isFacebookApiReady()) {
      console.warn('Cannot refresh tokens: no active account or FB API not ready');
      return;
    }

    console.log('🔄 Refreshing Instagram account tokens...');
    setLoading(true);
    
    try {
      // First refresh the user session
      const sessionRefreshed = await refreshCurrentSession();
      
      if (sessionRefreshed) {
        // Reload available accounts to get fresh page tokens
        if (userAccessToken) {
          loadAvailableAccounts(userAccessToken);
        }
        setError(null);
        alert('✅ Tokens refreshed successfully!');
      } else {
        setError('Failed to refresh session. Please try reconnecting your Facebook account.');
      }
    } catch (error) {
      console.error('❌ Failed to refresh tokens:', error);
      setError('Failed to refresh tokens. Please try reconnecting your Facebook account.');
    } finally {
      setLoading(false);
    }
  };

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

      // ✅ CRITICAL: Always store user access token for refresh capabilities
      if (!userAccessToken) {
        console.error('❌ No user access token available - refresh capabilities will be limited');
        alert('Warning: User access token is missing. Token refresh may not work. Please reconnect if you experience issues.');
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
        platform: 'instagram',
        platformUserId: account.id,
        facebookUserId: userId,
        facebookPageId: account.pageId,
        name: userInfo?.name || account.profile?.username || account.pageName,
        email: userInfo?.email || '',
        profilePicture: account.profile?.profile_picture_url,
        username: account.profile?.username,
        accessToken: account.userAccessToken || userAccessToken, // ✅ CRITICAL: Store actual user access token
        userId: userId, // ✅ CRITICAL: Store user ID for refresh operations
        pages: [{
          id: account.pageId,
          name: account.pageName,
          accessToken: account.pageAccessToken, // ✅ Store actual page access token (different from user token)
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
        // ✅ FORCE RESET - Explicitly set these to false/null
        needsReconnection: false,
        lastTokenValidation: new Date().toISOString(),
        refreshError: null,
        lastRefreshAttempt: null,
        // ✅ Add validation timestamp to track when tokens were confirmed working
        lastSuccessfulValidation: new Date().toISOString(),
        tokenStatus: 'active',
        type: 'customer_social_link'
      };

      // ✅ ENHANCED VALIDATION: Check tokens, user ID, and token difference
      const hasUserToken = !!accountData.accessToken;
      const hasPageToken = !!accountData.pages[0].accessToken;
      const hasUserId = !!accountData.userId;
      const tokensAreDifferent = accountData.accessToken !== accountData.pages[0].accessToken;

      // ✅ CRITICAL VALIDATION: Check if user and page tokens are the same (this is BAD)
      if (hasUserToken && hasPageToken && !tokensAreDifferent) {
        console.warn('⚠️ WARNING: User and page tokens are identical - this will cause refresh issues');
        accountData.tokenWarning = 'User and page tokens are identical - refresh may not work properly';
      }

      if (!hasUserToken) {
        console.warn('⚠️ Missing user access token - refresh will not work');
        accountData.needsReconnection = true;
        accountData.refreshError = 'User access token not available during connection';
        accountData.tokenStatus = 'invalid_user_token';
      }

      if (!hasPageToken) {
        console.warn('⚠️ Missing page access token - posting will not work');
        accountData.needsReconnection = true;
        accountData.refreshError = 'Page access token not available during connection';
        accountData.tokenStatus = 'invalid_page_token';
        throw new Error('Page access token is required for Instagram posting. Please ensure you have admin access to the Facebook page connected to this Instagram account.');
      }

      if (!hasUserId) {
        console.warn('⚠️ Missing user ID - token refresh will not work');
        accountData.needsReconnection = true;
        accountData.refreshError = 'User ID not available - required for token refresh';
        accountData.tokenStatus = 'missing_user_id';
      }

      // ✅ Log comprehensive token validation status
      console.log('🔑 Instagram Token Validation Summary:', {
        hasUserToken,
        hasPageToken,
        hasUserId,
        tokensAreDifferent,
        userTokenLength: accountData.accessToken?.length || 0,
        pageTokenLength: accountData.pages[0].accessToken?.length || 0,
        userTokenPrefix: accountData.accessToken?.substring(0, 20) + '...',
        pageTokenPrefix: accountData.pages[0].accessToken?.substring(0, 20) + '...',
        userId: accountData.userId,
        needsReconnection: accountData.needsReconnection,
        tokenStatus: accountData.tokenStatus
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
    if (activeAccountId === accountId) {
      const newSelectedId = updatedAccounts.length > 0 ? updatedAccounts[0].id : null;
      setActiveAccountId(newSelectedId);
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
    switchAccount(accountId);
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
          saveAccountsToStorage(updatedAccounts);
          
          // Update active account if it's the one being refreshed
          if (activeAccountId === accountId) {
            const updatedActiveAccount = updatedAccounts.find(acc => acc.id === accountId);
            setActiveAccount(updatedActiveAccount);
          }
          
          setLoading(false);
        });
      } else {
        handleApiError(profileResponse.error);
        setLoading(false);
      }
    });
  };

  const fetchAnalytics = () => {
    const account = activeAccount;
    if (!account) return;
    
    setLoadingAnalytics(true);
    generateMediaBasedAnalytics(account);
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

  // Enhanced renderAccountSelector with multi-account support
  const renderAccountSelector = () => {
    if (connectedAccounts.length <= 1) return null;

    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-700 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Connected Instagram Accounts ({connectedAccounts.length})
          </h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshAccountTokens}
              disabled={loading || !activeAccount}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2 text-sm"
            >
              <span>🔄</span>
              <span>Refresh Tokens</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectedAccounts.map((account) => {
            const expired = isTokenExpired(account);
            
            return (
              <div
                key={account.id}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  activeAccountId === account.id
                    ? 'border-pink-500 bg-pink-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${expired ? 'border-orange-300 bg-orange-50' : ''}`}
                onClick={() => switchAccount(account.id)}
              >
                <div className="flex items-center space-x-3">
                  {account.profile?.profile_picture_url ? (
                    <img
                      src={account.profile.profile_picture_url}
                      alt="Profile"
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                      <Instagram className="h-6 w-6 text-pink-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900 truncate">
                        @{account.profile?.username || 'Loading...'}
                      </h5>
                      {activeAccountId === account.id && (
                        <UserCheck className="h-4 w-4 text-pink-600" />
                      )}
                      {expired && (
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{account.pageName}</p>
                    <p className="text-xs text-gray-500">
                      Connected {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAccount(account.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Token Status Information */}
        {activeAccount && (
          <div className="mt-4 p-3 bg-pink-50 border border-pink-200 rounded-lg">
            <h6 className="font-medium text-pink-800 mb-2">🔑 Token Management</h6>
            <div className="text-sm text-pink-700 space-y-1">
              <p>📝 <strong>Active Account:</strong> @{activeAccount.profile?.username}</p>
              <p>🔄 <strong>Auto-Refresh:</strong> Tokens are automatically refreshed when needed</p>
              <p>⏰ <strong>Session Management:</strong> Persistent connection across browser sessions</p>
              <p>🔗 <strong>Manual Actions:</strong> Use "Refresh Tokens" if you encounter issues</p>
              <p>✅ <strong>Permissions:</strong> instagram_basic, instagram_content_publish</p>
              {activeAccount.tokenExpiresAt && (
                <p>⏳ <strong>Token Expires:</strong> {new Date(activeAccount.tokenExpiresAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Enhanced error rendering
  const renderError = () => {
    if (!error) return null;

    const isTokenError = error.includes('expired') || error.includes('refresh') || error.includes('reconnect');

    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">
            {isTokenError ? 'Session Expired' : 'Connection Error'}
          </h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        
        {isTokenError && (
          <div className="space-y-2">
            <p className="text-sm text-red-700">
              Your Facebook session has expired. You can try refreshing the tokens or reconnect your account.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={refreshAccountTokens}
                disabled={loading}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                🔄 Refresh Tokens
              </button>
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                🔗 Reconnect Account
              </button>
            </div>
          </div>
        )}
        
        <div className="flex space-x-3 mt-4">
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Dismiss
          </button>
          {!isTokenError && (
            <button
              onClick={handleSignIn}
              disabled={loading}
              className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render available accounts for connection
  const renderAvailableAccounts = () => {
    if (!availableAccounts || availableAccounts.length === 0) return null;

    return (
      <div className="mb-8">
        <h4 className="font-medium text-gray-700 flex items-center mb-2">
          <Plus className="h-5 w-5 mr-2" />
          Available Instagram Accounts ({availableAccounts.length})
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableAccounts.map((account) => (
            <div
              key={account.id}
              className="border rounded-lg p-4 bg-white hover:border-pink-400 transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center">
                  <Instagram className="h-6 w-6 text-pink-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-medium text-gray-900 truncate">
                    {account.pageName}
                  </h5>
                  <p className="text-xs text-gray-500">
                    Page ID: {account.pageId}
                  </p>
                  {account.tokenWarning && (
                    <p className="text-xs text-orange-600 mt-1">{account.tokenWarning}</p>
                  )}
                </div>
                <button
                  onClick={() => connectInstagramAccount(account)}
                  className="bg-pink-600 text-white px-3 py-1 rounded-lg hover:bg-pink-700 text-sm font-medium"
                  disabled={loading}
                >
                  Connect
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConnectedState = () => (
    <div className="space-y-6">
      {/* Show account selector if multiple accounts */}
      {connectedAccounts.length > 1 && renderAccountSelector()}

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
          {/* Show active account info */}
          {activeAccount && (
            <div className="flex items-center space-x-2">
              {activeAccount.profile?.profile_picture_url ? (
                <img
                  src={activeAccount.profile.profile_picture_url}
                  alt="Profile"
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <Instagram className="h-4 w-4 text-pink-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                @{activeAccount.profile?.username || 'Loading...'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              if (userAccessToken) {
                loadAvailableAccounts(userAccessToken);
              }
            }}
            disabled={loadingAccounts || !userAccessToken}
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

      {/* Show error if any */}
      {renderError()}

      {/* Show available accounts */}
      {renderAvailableAccounts()}

      {/* Show active account details */}
      {activeAccount && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {activeAccount.profile?.profile_picture_url ? (
                <img
                  src={activeAccount.profile.profile_picture_url}
                  alt="Instagram profile"
                  className="w-20 h-20 rounded-full border-4 border-pink-200"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center">
                  <Instagram className="h-10 w-10 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">@{activeAccount.profile?.username}</h2>
                <p className="text-sm text-gray-600">{activeAccount.pageName}</p>
                {activeAccount.profile?.biography && (
                  <p className="text-gray-700 text-sm mt-1">{activeAccount.profile.biography}</p>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => refreshAccountData(activeAccount.id)}
                disabled={loading}
                className="flex items-center space-x-2 px-3 py-2 bg-white border border-pink-200 text-pink-700 rounded-lg hover:bg-pink-50 transition-colors disabled:opacity-50 text-sm"
              >
                <Settings className="h-4 w-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => removeAccount(activeAccount.id)}
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
                {activeAccount.profile?.media_count?.toLocaleString() || activeAccount.media?.length || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium">Posts</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-pink-600">
                {activeAccount.profile?.followers_count?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-sm text-gray-600 font-medium">Followers</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-pink-600">
                {activeAccount.media?.reduce((sum, media) => sum + (media.like_count || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">Total Likes</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={fetchAnalytics}
          disabled={loadingAnalytics || !activeAccount}
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

      {/* Show recent posts for active account */}
      {activeAccount && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Posts ({activeAccount.media?.length || 0})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeAccount.media && activeAccount.media.length > 0 ? activeAccount.media.map(media => (
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