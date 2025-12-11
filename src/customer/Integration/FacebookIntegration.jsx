import React, { useState, useEffect } from 'react';
import {
  Facebook, BarChart3, Trash2, TrendingUp, Plus, Users, UserCheck, ExternalLink, Loader2, Calendar, RefreshCw
} from 'lucide-react';
import TimePeriodChart from '../../components/TimeperiodChart';
import { getUserData, setUserData, removeUserData, migrateToUserSpecificStorage } from '../../utils/sessionUtils';

// Your Facebook App ID
const FACEBOOK_APP_ID = '4416243821942660';

function FacebookIntegration() {
  // Multi-account state
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [fbError, setFbError] = useState(null);
  
  // Current active account data
  const [activeAccount, setActiveAccount] = useState(null);
  const [fbPages, setFbPages] = useState([]);
  const [pageInsights, setPageInsights] = useState({});
  const [pagePosts, setPagePosts] = useState({});
  const [loadingInsights, setLoadingInsights] = useState({});
  const [loadingPosts, setLoadingPosts] = useState({});

  // Post upload modal state
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTarget, setPostTarget] = useState(null);
  const [postMessage, setPostMessage] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [uploadingPost, setUploadingPost] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // Show/Hide Facebook posts state
  const [showFacebookPosts, setShowFacebookPosts] = useState({});

  // Historical charts toggle state
  const [showHistoricalCharts, setShowHistoricalCharts] = useState({});

  // Post-level analytics state (similar to Instagram)
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [singlePostAnalytics, setSinglePostAnalytics] = useState(null);

  // Helper function to check if Facebook API is ready
  const isFacebookApiReady = () => {
    return window.FB && window.FB.api && typeof window.FB.api === 'function';
  };

  // --- ADD: Helper to get current customer ID (copied from InstagramIntegration.jsx) ---
  function getCurrentCustomerId() {
    let customerId = null;
    // Check URL params first
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    customerId = urlParams.get('customerId') || hashParams.get('customerId');
    if (customerId) return customerId;
    // Fallback to localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    customerId = currentUser.userId || currentUser.id || currentUser._id || currentUser.customer_id;
    if (!customerId) {
      const authUser = JSON.parse(localStorage.getItem('user') || '{}');
      customerId = authUser.userId || authUser.id || authUser._id || authUser.customer_id;
    }
    return customerId;
  }

  // Load connected accounts from localStorage on component mount
  useEffect(() => {
    console.log('🔍 Component mounted, loading accounts from storage...');
    
    // First, migrate any existing data to user-specific storage
    migrateToUserSpecificStorage([
      'fb_connected_accounts',
      'fb_active_account_id'
    ]);

    // --- NEW: Try to fetch connected accounts from backend using customerId ---
    const customerId = getCurrentCustomerId();

    async function fetchConnectedAccountsFromBackend() {
      if (!customerId) return null;
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          // Only Facebook accounts for this customer
          return data.accounts
            .filter(acc => acc.platform === 'facebook' && acc.customerId === customerId)
            .map(acc => ({
              id: acc.platformUserId,
              name: acc.name,
              email: acc.email,
              picture: { data: { url: acc.profilePicture } },
              accessToken: acc.accessToken,
              connectedAt: acc.connectedAt,
              tokenExpiresAt: acc.tokenExpiresAt || null,
              tokenType: acc.tokenType,
              pages: acc.pages || []
            }));
        }
      } catch (err) {
        // ignore
      }
      return null;
    }

    // --- NEW: Hydrate backend accounts with live data (profile/pages) ---
    async function hydrateFacebookAccounts(accounts) {
      if (!window.FB || !window.FB.api) return accounts;
      return await Promise.all(accounts.map(acc =>
        new Promise(resolve => {
          // Fetch live profile
          window.FB.api('/me', {
            fields: 'id,name,email,picture',
            access_token: acc.accessToken
          }, function(profileResponse) {
            // Fetch pages
            window.FB.api('/me/accounts', {
              fields: 'id,name,access_token,category,about,fan_count,link,picture,username,website,phone,verification_status',
              access_token: acc.accessToken
            }, function(pagesResponse) {
              resolve({
                ...acc,
                name: profileResponse?.name || acc.name,
                email: profileResponse?.email || acc.email,
                picture: profileResponse?.picture || acc.picture,
                pages: pagesResponse?.data || acc.pages
              });
            });
          });
        })
      ));
    }

    // Helper: Deduplicate accounts by id
    function dedupeAccounts(accounts) {
      const seen = new Set();
      return accounts.filter(acc => {
        if (seen.has(acc.id)) return false;
        seen.add(acc.id);
        return true;
      });
    }

    (async () => {
      const backendAccounts = await fetchConnectedAccountsFromBackend();
      if (backendAccounts && backendAccounts.length > 0) {
        // Hydrate with live profile/pages
        const hydratedAccounts = await hydrateFacebookAccounts(backendAccounts);
        const deduped = dedupeAccounts(hydratedAccounts);
        setConnectedAccounts(deduped);
        setUserData('fb_connected_accounts', deduped);
        setActiveAccountId(deduped[0].id);
        setActiveAccount(deduped[0]);
        setUserData('fb_active_account_id', deduped[0].id);
        return;
      }

      // --- FALLBACK: Use localStorage if backend empty (legacy) ---
      const savedAccounts = getUserData('fb_connected_accounts');
      const savedActiveId = getUserData('fb_active_account_id');
      if (savedAccounts && Array.isArray(savedAccounts) && savedAccounts.length > 0) {
        const deduped = dedupeAccounts(savedAccounts);
        setConnectedAccounts(deduped);
        if (savedActiveId && deduped.some(acc => acc.id === savedActiveId)) {
          setActiveAccountId(savedActiveId);
          const activeAcc = deduped.find(acc => acc.id === savedActiveId);
          setActiveAccount(activeAcc);
        } else if (deduped.length > 0) {
          setActiveAccountId(deduped[0].id);
          setActiveAccount(deduped[0]);
          setUserData('fb_active_account_id', deduped[0].id);
        }
      }
    })();
  }, []);

  // Load Facebook SDK
  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      // SDK already loaded, check if it's ready
      const checkReady = () => {
        if (isFacebookApiReady()) {
          setFbSdkLoaded(true);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
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
  }, []);

  // Fetch pages for active account (only when SDK is ready and we have an active account)
  useEffect(() => {
    if (activeAccount && fbSdkLoaded && isFacebookApiReady()) {
      fetchFbPages();
    }
  }, [activeAccount, fbSdkLoaded]);

  // Save accounts to localStorage with better error handling
  const saveAccountsToStorage = (accounts) => {
    console.log('💾 Saving accounts to storage:', accounts.length, 'accounts');
    try {
      setUserData('fb_connected_accounts', accounts);
      console.log('✅ Accounts saved successfully');
      
      // Verify the save worked
      const verification = getUserData('fb_connected_accounts');
      console.log('🔍 Storage verification:', verification ? verification.length : 0, 'accounts');
    } catch (error) {
      console.error('❌ Failed to save accounts:', error);
    }
  };

  // Handle Facebook login for new account with improved persistence
  const fbLogin = () => {
    if (!isFacebookApiReady()) {
      setFbError({ message: 'Facebook SDK is not ready. Please wait and try again.' });
      return;
    }

    console.log('🔐 Starting Facebook login...');

    window.FB.login((response) => {
      console.log('📨 Facebook login response:', response.status);
      
      if (response.status === 'connected') {
        const accessToken = response.authResponse.accessToken;
        const userId = response.authResponse.userID;
        
        console.log('✅ Facebook login successful, fetching user data...');
        
        // Fetch user data for the new account
        window.FB.api('/me', { 
          fields: 'id,name,email,picture',
          access_token: accessToken 
        }, function(userResponse) {
          if (!userResponse || userResponse.error) {
            console.error('❌ Failed to fetch user data:', userResponse.error);
            setFbError(userResponse.error);
            return;
          }
          
          console.log('👤 User data received:', userResponse.name);
          
          const newAccount = {
            id: userId,
            name: userResponse.name,
            email: userResponse.email,
            picture: userResponse.picture,
            accessToken: accessToken,
            connectedAt: new Date().toISOString(),
            tokenExpiresAt: response.authResponse.expiresIn ? 
              new Date(Date.now() + (response.authResponse.expiresIn * 1000)).toISOString() : null
          };
          
          console.log('🆕 Created new account object:', {
            id: newAccount.id,
            name: newAccount.name,
            email: newAccount.email
          });
          
          // Check if account already exists
          const existingAccountIndex = connectedAccounts.findIndex(acc => acc.id === userId);
          let updatedAccounts;
          
          if (existingAccountIndex >= 0) {
            console.log('🔄 Updating existing account');
            // Update existing account
            updatedAccounts = [...connectedAccounts];
            updatedAccounts[existingAccountIndex] = { ...updatedAccounts[existingAccountIndex], ...newAccount };
          } else {
            console.log('➕ Adding new account');
            // Add new account
            updatedAccounts = [...connectedAccounts, newAccount];
          }
          
          console.log('📊 Total accounts after update:', updatedAccounts.length);
          
          // Update state first
          setConnectedAccounts(updatedAccounts);
          setActiveAccountId(userId);
          setActiveAccount(newAccount);
          
          // Then save to storage
          saveAccountsToStorage(updatedAccounts);
          setUserData('fb_active_account_id', userId);
          
          // Clear any existing error
          setFbError(null);

          console.log('✅ Account setup complete, requesting long-lived token...');
          
          // Request long-lived token
          requestLongLivedToken(accessToken, newAccount).then(() => {
            // After token exchange, save again to ensure persistence
            const finalAccounts = [...updatedAccounts];
            saveAccountsToStorage(finalAccounts);
            console.log('💾 Final save after token exchange complete');
          });
        });
      } else {
        console.error('❌ Facebook login failed:', response);
        setFbError({ message: 'Facebook login failed or was cancelled' });
      }
    }, {
      scope: 'pages_show_list,pages_read_engagement,pages_read_user_content,pages_manage_metadata,instagram_basic,email,public_profile',
      return_scopes: true,
      auth_type: 'rerequest'
    });
  };

  // Enhanced requestLongLivedToken with better state persistence
  const requestLongLivedToken = async (shortLivedToken, account) => {
    try {
      console.log('🔄 Requesting long-lived token via backend...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/facebook/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortLivedToken: shortLivedToken,
          userId: account.id
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.longLivedToken) {
        console.log('✅ Received long-lived token (expires in', data.expiresIn, 'seconds)');
        
        // Calculate expiration date (usually 60 days)
        const expirationDate = data.expiresIn ? 
          new Date(Date.now() + (data.expiresIn * 1000)).toISOString() : 
          new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)).toISOString(); // Default 60 days
        
        // Update account with long-lived token
        const updatedAccount = {
          ...account,
          accessToken: data.longLivedToken, // ✅ Store the long-lived USER token
          tokenType: 'long_lived',
          tokenExpiresAt: expirationDate
        };
        
        console.log('🔄 Updating account with long-lived token...');
        
        // Update in state and storage
        setConnectedAccounts(prevAccounts => {
          const updatedAccounts = prevAccounts.map(acc => 
            acc.id === account.id ? updatedAccount : acc
          );
          
          // Immediately save to storage
          saveAccountsToStorage(updatedAccounts);
          console.log('💾 Saved updated accounts with long-lived token');
          
          return updatedAccounts;
        });
        
        if (activeAccountId === account.id) {
          setActiveAccount(updatedAccount);
        }

        console.log('💾 Stored long-lived token, expires:', new Date(expirationDate).toLocaleDateString());
        
        return updatedAccount;
      } else {
        console.warn('⚠️ Failed to get long-lived token:', data.error || 'Unknown error');
        // Continue with short-lived token
        return account;
      }
    } catch (error) {
      console.warn('⚠️ Error requesting long-lived token:', error);
      // Continue with short-lived token - this is not critical for basic functionality
      return account;
    }
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
  const handleApiError = async (error, pageId = null) => {
    console.error('Facebook API Error:', error);
    
    if (error.code === 190 || error.message?.includes('expired') || error.message?.includes('Session has expired')) {
      console.log('🔄 Token expired, attempting refresh...');
      
      // Try to refresh the current session
      const refreshSuccess = await refreshCurrentSession();
      
      if (refreshSuccess) {
        console.log('✅ Session refreshed successfully');
        setFbError(null);
        
        // Retry the failed operation if we have a pageId
        if (pageId && activeAccount) {
          setTimeout(() => {
            fetchFbPages();
          }, 1000);
        }
      } else {
        console.log('❌ Session refresh failed');
        setFbError({ 
          message: 'Your Facebook session has expired. Please reconnect your account.',
          code: 'SESSION_EXPIRED',
          action: 'reconnect'
        });
      }
    } else {
      setFbError(error);
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
          
          if (activeAccount && activeAccount.id === userId) {
            const updatedAccount = {
              ...activeAccount,
              accessToken: newToken,
              tokenExpiresAt: response.authResponse.expiresIn ? 
                new Date(Date.now() + (response.authResponse.expiresIn * 1000)).toISOString() : null
            };
            
            setActiveAccount(updatedAccount);
            
            // Update in connectedAccounts
            const updatedAccounts = connectedAccounts.map(acc =>
              acc.id === userId ? updatedAccount : acc
            );
            
            setConnectedAccounts(updatedAccounts);
            saveAccountsToStorage(updatedAccounts);
            
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      }, true); // Force fresh status check
    });
  };

  // Modified fetchFbPages with error handling
  const fetchFbPages = () => {
    if (!activeAccount || !isFacebookApiReady()) {
      setFbError({ message: 'Facebook API is not ready or no active account' });
      return;
    }
    
    // Check if token is expired before making API call
    if (isTokenExpired(activeAccount)) {
      console.log('⚠️ Token appears to be expired, refreshing...');
      refreshCurrentSession().then(success => {
        if (success) {
          // Retry after refresh
          setTimeout(() => fetchFbPages(), 1000);
        } else {
          handleApiError({ 
            message: 'Session expired', 
            code: 190 
          });
        }
      });
      return;
    }
    
    console.log('🔍 Fetching pages...');
    
    window.FB.api('/me/accounts', {
      fields: 'id,name,access_token,category,about,fan_count,link,picture,username,website,phone,verification_status',
      access_token: activeAccount.accessToken
    }, function(response) {
      if (!response || response.error) {
        handleApiError(response.error);
        console.error('❌ Failed to fetch pages:', response.error);
      } else {
        console.log('✅ Fetched pages successfully:', response.data.length);
        setFbPages(response.data);
        setFbError(null); // Clear any previous errors
        
        // Store each page
        response.data.forEach(async (page) => {
          console.log(`📄 Processing page: ${page.name} (${page.id})`);
          
          await storeConnectedPage(page);
        });
      }
    });
  };

  // Modified fetchPageInsights with error handling
  const fetchPageInsights = (pageId, pageAccessToken) => {
    if (!isFacebookApiReady()) {
      setFbError({ message: 'Facebook API is not ready' });
      return;
    }

    setLoadingInsights(prev => ({ ...prev, [pageId]: true }));
    
    window.FB.api(
      `/${pageId}/posts`,
      {
        fields: 'id,message,created_time,likes.summary(true),comments.summary(true),shares,reactions.summary(true),full_picture',
        limit: 10,
        access_token: pageAccessToken
      },
      function(response) {
        setLoadingInsights(prev => ({ ...prev, [pageId]: false }));
        if (!response || response.error) {
          console.error('Posts fetch error:', response.error);
          handleApiError(response.error, pageId);
          setPageInsights(prev => ({
            ...prev,
            [pageId]: []
          }));
        } else {
          const posts = response.data;
          const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0);
          const totalComments = posts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0);
          const totalShares = posts.reduce((sum, post) => sum + (post.shares?.count || 0), 0);
          const totalReactions = posts.reduce((sum, post) => sum + (post.reactions?.summary?.total_count || 0), 0);
          
          let engagementMetrics = [
            { name: 'FB Likes', value: totalLikes, title: 'Facebook Likes (Last 10 posts)' },
            { name: 'FB Comments', value: totalComments, title: 'Facebook Comments (Last 10 posts)' },
            { name: 'FB Shares', value: totalShares, title: 'Facebook Shares (Last 10 posts)' },
            { name: 'FB Reactions', value: totalReactions, title: 'Facebook Reactions (Last 10 posts)' }
          ];
          
          setPageInsights(prev => ({
            ...prev,
            [pageId]: engagementMetrics
          }));
        }
      }
    );
  };

  // --- SINGLE POST ANALYTICS LOGIC (similar to Instagram) ---
  const fetchSinglePostAnalytics = (post) => {
    if (!post) return;
    setSelectedPostId(post.id);
    
    // Create comprehensive analytics data for Facebook post
    const analytics = {
      id: post.id,
      message: post.message || 'No message',
      story: post.story || null,
      created_time: post.created_time,
      permalink_url: post.permalink_url,
      full_picture: post.full_picture,
      likes_count: post.likes?.summary?.total_count || 0,
      comments_count: post.comments?.summary?.total_count || 0,
      shares_count: post.shares?.count || 0,
      reactions_count: post.reactions?.summary?.total_count || 0,
      total_engagement: (post.likes?.summary?.total_count || 0) + 
                       (post.comments?.summary?.total_count || 0) + 
                       (post.shares?.count || 0) + 
                       (post.reactions?.summary?.total_count || 0),
      engagement_rate: 0 // Will be calculated if we have follower count
    };
    
    setSinglePostAnalytics(analytics);
  };

  // Add UI for single post analytics (similar to Instagram)
  const renderSinglePostAnalytics = () => {
    if (!selectedPostId || !singlePostAnalytics) return null;

    return (
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Facebook Post Analytics
          </h3>
          <button
            onClick={() => {
              setSelectedPostId(null);
              setSinglePostAnalytics(null);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Post Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              {singlePostAnalytics.full_picture && (
                <img
                  src={singlePostAnalytics.full_picture}
                  alt="Post media"
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded font-medium">
                    Facebook Post
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(singlePostAnalytics.created_time).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {singlePostAnalytics.message && (
                  <p className="text-sm text-gray-800 mb-2">
                    {singlePostAnalytics.message.length > 150 
                      ? `${singlePostAnalytics.message.substring(0, 150)}...` 
                      : singlePostAnalytics.message
                    }
                  </p>
                )}
                {singlePostAnalytics.story && !singlePostAnalytics.message && (
                  <p className="text-sm text-gray-600 mb-2 italic">
                    {singlePostAnalytics.story}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Facebook Post</span>
                  {singlePostAnalytics.permalink_url && (
                    <a 
                      href={singlePostAnalytics.permalink_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      View on Facebook →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {singlePostAnalytics.likes_count?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-blue-700 font-medium flex items-center justify-center mt-1">
                <span className="mr-1">👍</span>
                Likes
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {singlePostAnalytics.comments_count?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-green-700 font-medium flex items-center justify-center mt-1">
                <span className="mr-1">💬</span>
                Comments
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {singlePostAnalytics.shares_count?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-purple-700 font-medium flex items-center justify-center mt-1">
                <span className="mr-1">🔄</span>
                Shares
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {singlePostAnalytics.reactions_count?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-orange-700 font-medium flex items-center justify-center mt-1">
                <span className="mr-1">😍</span>
                Reactions
              </div>
            </div>
          </div>

          {/* Total Engagement */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600 mb-2">
              {singlePostAnalytics.total_engagement?.toLocaleString() || 0}
            </div>
            <div className="text-lg text-indigo-700 font-medium flex items-center justify-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              Total Engagement
            </div>
            <div className="text-sm text-indigo-600 mt-2">
              Likes + Comments + Shares + Reactions
            </div>
          </div>

          {/* Engagement Breakdown Visual */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Engagement Breakdown
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  Likes
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ 
                        width: `${singlePostAnalytics.total_engagement > 0 
                          ? (singlePostAnalytics.likes_count / singlePostAnalytics.total_engagement) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
                    {((singlePostAnalytics.likes_count / Math.max(singlePostAnalytics.total_engagement, 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Comments
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full" 
                      style={{ 
                        width: `${singlePostAnalytics.total_engagement > 0 
                          ? (singlePostAnalytics.comments_count / singlePostAnalytics.total_engagement) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
                    {((singlePostAnalytics.comments_count / Math.max(singlePostAnalytics.total_engagement, 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  Shares
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full" 
                      style={{ 
                        width: `${singlePostAnalytics.total_engagement > 0 
                          ? (singlePostAnalytics.shares_count / singlePostAnalytics.total_engagement) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
                    {((singlePostAnalytics.shares_count / Math.max(singlePostAnalytics.total_engagement, 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  Reactions
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full" 
                      style={{ 
                        width: `${singlePostAnalytics.total_engagement > 0 
                          ? (singlePostAnalytics.reactions_count / singlePostAnalytics.total_engagement) * 100 
                          : 0}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 min-w-[3rem] text-right">
                    {((singlePostAnalytics.reactions_count / Math.max(singlePostAnalytics.total_engagement, 1)) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const fetchPagePosts = (pageId, pageAccessToken) => {
    if (!isFacebookApiReady()) {
      setFbError({ message: 'Facebook API is not ready' });
      return;
    }

    setLoadingPosts(prev => ({ ...prev, [pageId]: true }));

    window.FB.api(
      `/${pageId}/posts`,
      {
        fields: 'id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true),shares,reactions.summary(true)',
        limit: 10,
        access_token: pageAccessToken
      },
      function(response) {
        setLoadingPosts(prev => ({ ...prev, [pageId]: false }));
        if (!response || response.error) {
          console.error('Facebook posts fetch error:', response.error);
        } else {
          setPagePosts(prev => ({
            ...prev,
            [pageId]: response.data
          }));
          setShowFacebookPosts(prev => ({ ...prev, [pageId]: true }));
        }
      }
    );
  };

  const renderPageInsights = (pageId) => {
    const insights = pageInsights[pageId];
    if (!insights || insights.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
        <h5 className="font-medium text-blue-700 mb-3 flex items-center">
          <BarChart3 className="h-4 w-4 mr-2" />
          Engagement Metrics (Last 10 posts)
        </h5>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {insights.map((metric, index) => (
            <div key={index} className="text-center bg-white p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">
                {metric.value?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600">
                {metric.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPagePosts = (pageId) => {
    const posts = pagePosts[pageId];
    const isVisible = showFacebookPosts[pageId];
    
    if (!posts || posts.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-green-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-medium text-green-700 flex items-center">
            <Facebook className="h-4 w-4 mr-2" />
            Facebook Posts ({posts.length})
          </h5>
          <button
            onClick={() => setShowFacebookPosts(prev => ({ ...prev, [pageId]: !prev[pageId] }))
            }
            className="text-sm text-green-600 hover:text-green-800 font-medium"
          >
            {isVisible ? 'Hide Posts' : 'Show Posts'}
          </button>
        </div>
        
        {isVisible && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {posts.map((post) => (
              <div key={post.id} className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-start space-x-3">
                  {post.full_picture && (
                    <img 
                      src={post.full_picture} 
                      alt="Post media" 
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {post.type || 'post'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(post.created_time).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    {post.message && (
                      <p className="text-sm text-gray-800 mb-3 leading-relaxed">
                        {post.message.length > 200 ? (
                          <>
                            {post.message.substring(0, 200)}...
                            <span className="text-blue-600 text-xs ml-1 cursor-pointer">read more</span>
                          </>
                        ) : post.message}
                      </p>
                    )}
                    
                    {post.story && !post.message && (
                      <p className="text-sm text-gray-600 mb-3 italic">
                        {post.story}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <span className="flex items-center space-x-1">
                          <span>👍</span>
                          <span>{post.likes?.summary?.total_count || 0}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>💬</span>
                          <span>{post.comments?.summary?.total_count || 0}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>🔄</span>
                          <span>{post.shares?.count || 0}</span>
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          className="text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1 bg-purple-50 rounded"
                          onClick={() => {
                            setSelectedPostId(post.id);
                            fetchSinglePostAnalytics(post);
                          }}
                        >
                          📊 Analytics
                        </button>
                        {post.permalink_url && (
                          <a 
                            href={post.permalink_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            View on Facebook →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderPostModal = () => {
    if (!showPostModal || !postTarget) return null;
    const { type, page } = postTarget;

    const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploadResult({
        success: false,
        error: 'Instagram requires a public image URL. Please upload your image to a public host (e.g. imgur, Cloudinary, S3) and paste the URL below.'
      });
      setPostImageUrl('');
    };

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
            onClick={() => {
              setShowPostModal(false);
              setPostMessage('');
              setPostImageUrl('');
              setUploadResult(null);
            }}
          >✕</button>
          <h4 className="font-bold mb-4">
            {type === 'facebook' ? 'Create Facebook Post' : 'Create Instagram Post'}
          </h4>
          <div className="space-y-3">
            <textarea
              className="w-full border rounded p-2"
              rows={3}
              placeholder="Write your post message..."
              value={postMessage}
              onChange={e => setPostMessage(e.target.value)}
            />
            <input
              className="w-full border rounded p-2"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {postImageUrl && (
              <img src={postImageUrl} alt="Preview" className="w-full h-32 object-contain rounded border" />
            )}
            <input
              className="w-full border rounded p-2"
              type="text"
              placeholder="Image URL (publicly accessible, optional for FB, required for IG)"
              value={postImageUrl}
              onChange={e => setPostImageUrl(e.target.value)}
            />
            <div className="text-xs text-gray-500">
              {type === 'instagram'
                ? 'Instagram requires a public image URL. Upload your image to a public host (e.g. imgur, Cloudinary, S3) and paste the URL above.'
                : 'Image is optional for Facebook posts.'}
            </div>
            <button
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 mt-2"
              disabled={uploadingPost || (!postMessage && !postImageUrl)}
              onClick={() => {
                if (type === 'facebook') uploadFacebookPost(page);
                else if (type === 'instagram') uploadInstagramPost(page, instagramId);
              }}
            >
              {uploadingPost ? 'Posting...' : 'Post'}
            </button>
            {uploadResult && (
              <div className={`mt-2 text-sm ${uploadResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {uploadResult.success
                  ? `✅ Post uploaded! ID: ${uploadResult.id}`
                  : `❌ Error: ${uploadResult.error}`}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPageDetails = (page) => (
    <div key={page.id} className="border rounded-lg p-6 mb-4 bg-white shadow-sm">
      <div className="flex items-start space-x-4">
        {page.picture && (
          <img 
            src={page.picture.data.url} 
            alt={page.name}
            className="w-20 h-20 rounded-full border-2 border-gray-200"
          />
        )}
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h4 className="font-bold text-xl text-gray-800">{page.name}</h4>
            {page.verification_status && (
              <span className="text-blue-500">✓</span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mb-3">
            <span className="font-medium">Category:</span> {page.category}
          </p>
          
          {page.about && (
            <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded">
              {page.about}
            </p>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
            <div className="space-y-2">
              <div><strong>Page ID:</strong> {page.id}</div>
              <div><strong>Followers:</strong> {page.fan_count?.toLocaleString() || 'N/A'}</div>
              <div><strong>Username:</strong> @{page.username || 'N/A'}</div>
            </div>
            <div className="space-y-2">
              <div><strong>Website:</strong> 
                {page.website ? (
                  <a href={page.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    {page.website}
                  </a>
                ) : 'N/A'}
              </div>
              <div><strong>Phone:</strong> {page.phone || 'N/A'}</div>
              <div><strong>Link:</strong> 
                {page.link ? (
                  <a href={page.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    View Page
                  </a>
                ) : 'N/A'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="bg-blue-700 text-white px-4 py-2 rounded text-sm hover:bg-blue-800 flex items-center space-x-2"
              onClick={() => {
                setPostTarget({ type: 'facebook', page });
                setShowPostModal(true);
                setPostMessage('');
                setPostImageUrl('');
                setUploadResult(null);
              }}
              disabled={!isFacebookApiReady()}
            >
              <Facebook className="h-4 w-4" />
              <span>Create FB Post</span>
            </button>
            <button
              onClick={() => fetchPageInsights(page.id, page.access_token)}
              disabled={loadingInsights[page.id] || !isFacebookApiReady()}
              className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>{loadingInsights[page.id] ? 'Loading...' : 'Get Insights'}</span>
            </button>

            <button
              onClick={() => fetchPagePosts(page.id, page.access_token)}
              disabled={loadingPosts[page.id] || !isFacebookApiReady()}
              className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <Facebook className="h-4 w-4" />
              <span>{loadingPosts[page.id] ? 'Loading...' : 'Show FB Posts'}</span>
            </button>
          </div>

          {renderPageInsights(page.id)}
          {renderPagePosts(page.id)}
        </div>
      </div>
    </div>
  );

  // Switch active account
  const switchAccount = (accountId) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (account) {
      setActiveAccountId(accountId);
      setActiveAccount(account);
      setUserData('fb_active_account_id', accountId);
      
      // Clear current data
      setFbPages([]);
      setPageInsights({});
      setPagePosts({});
      setAnalyticsData({});
    }
  };

  // Remove account
  const removeAccount = async (accountId) => {
    try {
      // Find the account to get its backend data
      const accountToRemove = connectedAccounts.find(acc => acc.id === accountId);
      
      if (accountToRemove) {
        // Delete from backend database
        const customerId = getCurrentCustomerId();
        if (customerId) {
          console.log('🗑️ Deleting account from backend:', {
            accountId,
            customerId,
            platform: 'facebook'
          });
          
          try {
            // Find the backend document for this social account
            const getResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
            const getData = await getResponse.json();
            
            if (getData.success && getData.accounts) {
              const backendAccount = getData.accounts.find(acc => 
                acc.platform === 'facebook' && acc.platformUserId === accountId
              );
              
              if (backendAccount && backendAccount._id) {
                const deleteResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${backendAccount._id}`, {
                  method: 'DELETE'
                });
                
                const deleteResult = await deleteResponse.json();
                if (deleteResult.success) {
                  console.log('✅ Account deleted from backend successfully');
                } else {
                  console.warn('⚠️ Failed to delete account from backend:', deleteResult.error);
                }
              }
            }
          } catch (backendError) {
            console.warn('⚠️ Error deleting from backend (continuing with local removal):', backendError);
          }
        }
      }
      
      // Remove from local state
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
          setActiveAccount(null);
          setFbPages([]);
          setPageInsights({});
          setPagePosts({});
          setAnalyticsData({});
          removeUserData('fb_active_account_id');
        }
      }
      
      // Show success message
      alert('✅ Facebook account disconnected successfully!');
      
    } catch (error) {
      console.error('❌ Error removing account:', error);
      alert('❌ Failed to disconnect account. Please try again.');
    }
  };

  // Logout all accounts
  const fbLogoutAll = async () => {
    if (!isFacebookApiReady()) {
      // Just clear local state if FB API is not available
      await clearAllAccountData();
      return;
    }

    // Check if we have a valid Facebook session before calling logout
    window.FB.getLoginStatus((response) => {
      if (response.status === 'connected') {
        // Only call logout if user is actually logged in
        window.FB.logout(() => {
          clearAllAccountData().catch(error => {
            console.error('Error clearing account data after logout:', error);
          });
        });
      } else {
        // User is not logged in to Facebook, just clear local data
        clearAllAccountData().catch(error => {
          console.error('Error clearing account data:', error);
        });
      }
    });
  };

  // Helper function to clear all account data
  const clearAllAccountData = async () => {
    try {
      // Delete all Facebook accounts from backend
      const customerId = getCurrentCustomerId();
      if (customerId && connectedAccounts.length > 0) {
        console.log('🗑️ Deleting all Facebook accounts from backend for customer:', customerId);
        
        try {
          // Get all backend accounts for this customer
          const getResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
          const getData = await getResponse.json();
          
          if (getData.success && getData.accounts) {
            // Delete all Facebook accounts
            const facebookAccounts = getData.accounts.filter(acc => acc.platform === 'facebook');
            
            for (const account of facebookAccounts) {
              if (account._id) {
                try {
                  const deleteResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${account._id}`, {
                    method: 'DELETE'
                  });
                  
                  const deleteResult = await deleteResponse.json();
                  if (deleteResult.success) {
                    console.log('✅ Deleted Facebook account from backend:', account.name);
                  } else {
                    console.warn('⚠️ Failed to delete account from backend:', deleteResult.error);
                  }
                } catch (deleteError) {
                  console.warn('⚠️ Error deleting individual account:', deleteError);
                }
              }
            }
          }
        } catch (backendError) {
          console.warn('⚠️ Error deleting from backend (continuing with local removal):', backendError);
        }
      }
    } catch (error) {
      console.error('❌ Error in clearAllAccountData:', error);
    }
    
    // Clear local state regardless of backend success/failure
    setConnectedAccounts([]);
    setActiveAccountId(null);
    setActiveAccount(null);
    setFbPages([]);
    setPageInsights({});
    setPagePosts({});
    setAnalyticsData({});
    removeUserData('fb_connected_accounts');
    removeUserData('fb_active_account_id');
    
    console.log('✅ All Facebook account data cleared');
  };

  // Store connected page information
  const storeConnectedPage = async (page) => {
    try {
      // First store the page data
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/connected-pages/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page.id,
          pageName: page.name,
          accessToken: page.access_token,
          userId: activeAccount?.id || 'unknown',
          accountName: activeAccount?.name || 'unknown'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored connected page:', page.name);
      }

      // Store customer social account for admin access
      await storeCustomerSocialAccount(page);
      
    } catch (error) {
      console.warn('Failed to store connected page:', error);
    }
  };

  // Store customer social account for admin access
  const storeCustomerSocialAccount = async (page) => {
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
      console.log('🔍 Customer ID search:', {
        currentUser,
        customerId,
        found: !!customerId
      });
      
      if (!customerId) {
        console.warn('No customer ID found, cannot store social account');
        return;
      }

      // ✅ CRITICAL FIX: Always store the current user access token
      if (!activeAccount?.accessToken) {
        console.error('❌ No user access token available - refresh will not work');
        alert('Warning: User access token is missing. Token refresh may not work. Please reconnect if you experience issues.');
      }

      const accountData = {
        customerId: customerId,
        platform: 'facebook',
        platformUserId: activeAccount.id,
        name: activeAccount.name,
        email: activeAccount.email,
        profilePicture: activeAccount.picture?.data?.url,
        accessToken: activeAccount.accessToken, // ✅ Store user access token for refresh
        userId: activeAccount.id, // ✅ Store user ID for refresh operations
        pages: [
          {
            id: page.id,
            name: page.name,
            accessToken: page.access_token, // ✅ Store page access token for posting
            category: page.category,
            fanCount: page.fan_count,
            permissions: ['pages_read_engagement'],
            tasks: page.tasks || [],
            tokenValidatedAt: new Date().toISOString()
          }
        ],
        connectedAt: new Date().toISOString(),
        // ✅ FORCE RESET - Explicitly set these to false/null
        needsReconnection: false,
        lastTokenValidation: new Date().toISOString(),
        refreshError: null,
        lastRefreshAttempt: null,
        // ✅ Add validation timestamp to track when tokens were confirmed working
        lastSuccessfulValidation: new Date().toISOString(),
        tokenStatus: 'active'
      };

      // ✅ VALIDATION: Only set error flags if tokens are actually missing
      const hasUserToken = !!accountData.accessToken;
      const hasPageToken = !!accountData.pages[0].accessToken;

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
      }

      // ✅ Log token validation status
      console.log('🔑 Token Validation Summary:', {
        hasUserToken,
        hasPageToken,
        userTokenLength: accountData.accessToken?.length || 0,
        pageTokenLength: accountData.pages[0].accessToken?.length || 0,
        needsReconnection: accountData.needsReconnection,
        tokenStatus: accountData.tokenStatus
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Failed to store customer social account - server response:', response.status, errorText);
        
        // Don't throw error for social account storage failures - it's not critical
        if (response.status === 409) {
          console.log('📝 Document conflict detected - this is normal for concurrent updates');
        }
        return;
      }
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored customer social account for admin access');
      } else {
        console.warn('Failed to store customer social account:', result.error);
      }
      
    } catch (error) {
      console.warn('Failed to store customer social account:', error);
    }
  };

  // Enhanced token refresh with never-expiring page tokens
  const refreshPageTokens = async () => {
    if (!activeAccount || !isFacebookApiReady()) {
      console.warn('Cannot refresh tokens: no active account or FB API not ready');
      return;
    }

    console.log('🔄 Refreshing page access tokens...');
    
    try {
      // First refresh the user session
      const sessionRefreshed = await refreshCurrentSession();
      
      if (sessionRefreshed) {
        // Get never-expiring page tokens via backend
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/facebook/page-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAccessToken: activeAccount.accessToken,
            userId: activeAccount.id
          })
        });
        
        const data = await response.json();
        
        if (data.success && data.pages) {
          console.log(`✅ Got never-expiring tokens for ${data.pages.length} pages`);
          
          // Update pages with never-expiring tokens
          setFbPages(prevPages => {
            return prevPages.map(page => {
              const updatedPage = data.pages.find(p => p.id === page.id);
              if (updatedPage) {
                return {
                  ...page,
                  access_token: updatedPage.access_token,
                  tokenType: 'never_expiring_page_token'
                };
              }
              return page;
            });
          });
          
          alert('✅ Tokens refreshed successfully! Page tokens are now never-expiring.');
        } else {
          // Fallback to re-fetching pages normally
          fetchFbPages();
          alert('✅ Tokens refreshed successfully!');
        }
      } else {
        alert('❌ Failed to refresh session. Please try reconnecting your Facebook account.');
      }
    } catch (error) {
      console.error('❌ Failed to refresh tokens:', error);
      alert('❌ Failed to refresh tokens. Please try reconnecting your Facebook account.');
    }
  };

  // Enhanced error display
  const renderError = () => {
    if (!fbError) return null;

    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-red-800 mb-2">
              {fbError.code === 'SESSION_EXPIRED' ? 'Session Expired' : 'Facebook API Error'}
            </h4>
            <p className="text-red-600 text-sm mb-3">
              <strong>Error:</strong> {fbError.message || JSON.stringify(fbError)}
            </p>
            
            {fbError.code === 'SESSION_EXPIRED' && (
              <div className="space-y-2">
                <p className="text-sm text-red-700">
                  Your Facebook session has expired. You can try refreshing the tokens or reconnect your account.
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={refreshPageTokens}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    🔄 Refresh Tokens
                  </button>
                  <button
                    onClick={fbLogin}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    🔗 Reconnect Account
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setFbError(null)}
            className="flex-shrink-0 text-red-400 hover:text-red-600"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  // --- Facebook Account Selector UI (like Instagram) ---
  const renderAccountSelector = () => {
    if (connectedAccounts.length <= 1) return null;
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium text-gray-700 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Connected Facebook Accounts ({connectedAccounts.length})
          </h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshPageTokens}
              disabled={!fbSdkLoaded || !isFacebookApiReady() || !activeAccount}
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
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${expired ? 'border-orange-300 bg-orange-50' : ''}`}
                onClick={() => switchAccount(account.id)}
              >
                <div className="flex items-center space-x-3">
                  {account.picture && (
                    <img
                      src={account.picture.data.url}
                      alt={account.name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900 truncate">{account.name}</h5>
                      {activeAccountId === account.id && (
                        <UserCheck className="h-4 w-4 text-blue-600" />
                      )}
                      {expired && (
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{account.email}</p>
                    <p className="text-xs text-gray-500">
                      Connected {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                    {account.tokenExpiresAt && (
                      <p className="text-xs text-gray-500">
                        Token expires: {new Date(account.tokenExpiresAt).toLocaleDateString()}
                      </p>
                    )}
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
        {activeAccount && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h6 className="font-medium text-blue-800 mb-2">🔑 Token Management</h6>
            <div className="text-sm text-blue-700 space-y-1">
              <p>📝 <strong>Active Account:</strong> {activeAccount.name}</p>
              <p>🔄 <strong>Auto-Refresh:</strong> Tokens are automatically refreshed when needed</p>
              <p>⏰ <strong>Session Management:</strong> Only expires when you manually disconnect</p>
              <p>🔗 <strong>Manual Actions:</strong> Use "Refresh Tokens" if you encounter issues</p>
              <p>✅ <strong>Permissions:</strong> pages_read_engagement, pages_manage_metadata</p>
              {activeAccount.tokenExpiresAt && (
                <p>⏳ <strong>Token Expires:</strong> {new Date(activeAccount.tokenExpiresAt).toLocaleString()}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- Facebook Main UI (like Instagram) ---
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Facebook className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Facebook Integration</span>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow-md p-2 sm:p-4 md:p-6">
          {/* Debug info (optional, can remove) */}
          {/* ...existing code... */}
          {renderError()}
          {connectedAccounts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
                <Facebook className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Facebook Accounts</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your Facebook accounts to manage your pages and access detailed analytics.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md mx-auto text-left">
                <h4 className="font-medium text-blue-800 mb-2">📱 Multi-Account Setup Guide</h4>
                <div className="text-sm text-blue-700 text-left space-y-1">
                  <p>1. Log in with your Facebook account</p>
                  <p>2. Grant permissions to access your pages</p>
                  <p>3. Select which accounts to connect and manage</p>
                  <p>4. Historical data will be captured automatically</p>
                </div>
              </div>
              <button
                onClick={fbLogin}
                disabled={!isFacebookApiReady()}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-3 mx-auto font-medium"
              >
                <Facebook className="h-5 w-5" />
                <span>Connect Facebook Account</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Show account selector if multiple accounts */}
              {connectedAccounts.length > 1 && renderAccountSelector()}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full">
                  <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
                    <span className="text-green-600 font-bold">●</span>
                    <span className="text-sm font-medium text-green-700">
                      {connectedAccounts.length} Account{connectedAccounts.length !== 1 ? 's' : ''} Connected
                    </span>
                  </div>
                  {activeAccount && (
                    <div className="flex items-center space-x-2">
                      {activeAccount.picture && (
                        <img
                          src={activeAccount.picture.data.url}
                          alt="Profile"
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {activeAccount.name}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center space-x-2 mt-2 sm:mt-0">
                  <button
                    onClick={refreshPageTokens}
                    disabled={!fbSdkLoaded || !isFacebookApiReady() || !activeAccount}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh Tokens</span>
                  </button>
                  <button
                    onClick={fbLogin}
                    disabled={!fbSdkLoaded || !isFacebookApiReady()}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Account</span>
                  </button>
                  <button
                    onClick={() => fbLogoutAll()}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Disconnect All</span>
                  </button>
                </div>
              </div>
              {/* Active account details and pages */}
              {activeAccount && (
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-2 sm:p-6">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center space-x-4">
                      {activeAccount.picture && (
                        <img
                          src={activeAccount.picture.data.url}
                          alt="Profile"
                          className="w-20 h-20 rounded-full border-4 border-blue-200"
                        />
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{activeAccount.name}</h2>
                        <p className="text-sm text-gray-600">{activeAccount.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap space-x-2">
                      <button
                        onClick={refreshPageTokens}
                        disabled={!fbSdkLoaded || !isFacebookApiReady() || !activeAccount}
                        className="flex items-center space-x-2 px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={() => fbLogoutAll()}
                        className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Pages for {activeAccount.name}:</h4>
                    {fbPages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Facebook className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No pages found or you don't manage any pages.</p>
                        <p className="text-sm">Make sure you're an admin or editor of at least one Facebook page.</p>
                        <button
                          onClick={fetchFbPages}
                          disabled={!isFacebookApiReady()}
                          className="mt-3 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                        >
                          🔄 Retry Loading Pages
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {fbPages.map(page => (
                          <div key={page.id}>
                            <div className="overflow-x-auto">
                              {renderPageDetails(page)}
                            </div>
                            {/* --- Historical Analytics Toggle and Chart --- */}
                            <div className="mb-6">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-lg border border-gray-200 p-4 gap-2">
                                <div className="flex items-center space-x-3">
                                  <Calendar className="h-5 w-5 text-blue-600" />
                                  <div>
                                    <h4 className="font-medium text-gray-900">Historical Analytics</h4>
                                    <p className="text-sm text-gray-600">View long-term trends and growth patterns</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setShowHistoricalCharts(prev => ({
                                    ...prev,
                                    [page.id]: !prev[page.id]
                                  }))}
                                  className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                >
                                  <Calendar className="h-4 w-4" />
                                  <span>
                                    {showHistoricalCharts[page.id] ? 'Hide' : 'Show'} Historical Data
                                  </span>
                                </button>
                              </div>
                            </div>
                            {showHistoricalCharts[page.id] && (
                              <div className="overflow-x-auto">
                                <TimePeriodChart
                                  platform="facebook"
                                  accountId={page.id}
                                  title="Facebook Historical Analytics"
                                  defaultMetric="followers"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          {renderPostModal()}
          
          {/* Render single post analytics */}
          {renderSinglePostAnalytics()}
        </div>
      </div>
    </div>
  );
}

export default FacebookIntegration;