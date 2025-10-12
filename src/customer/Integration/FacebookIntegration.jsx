import React, { useState, useEffect } from 'react';
import {
  Facebook, BarChart3,Settings, Eye, Calendar, Trash2, TrendingUp, Plus, Users, UserCheck
} from 'lucide-react';
import TrendChart from '../../components/TrendChart';
import TimePeriodChart from '../../components/TimeperiodChart';
import { subDays, format } from 'date-fns';
import { getUserData, setUserData, removeUserData, migrateToUserSpecificStorage } from '../../utils/sessionUtils';

// Your Facebook App ID
const FACEBOOK_APP_ID = '4416243821942660';

function getCurrentCustomerId() {
  let customerId = null;
  
  // 🔥 PRIORITY 1: Check URL parameters first (for QR code links)
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  
  // Check both regular URL params and hash params (for React Router)
  customerId = urlParams.get('customerId') || hashParams.get('customerId');
  
  if (customerId) {
    console.log('✅ Found customer ID in URL:', customerId);
    return customerId;
  }
  
  // 🔥 PRIORITY 2: Check localStorage as fallback
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  customerId = currentUser.userId || currentUser.id || currentUser._id || currentUser.customer_id;
  
  if (!customerId) {
    const authUser = JSON.parse(localStorage.getItem('user') || '{}');
    customerId = authUser.userId || authUser.id || authUser._id || authUser.customer_id;
  }
  
  if (customerId) {
    console.log('✅ Found customer ID in localStorage:', customerId);
  } else {
    console.warn('❌ No customer ID found in URL or localStorage');
  }
  
  return customerId;
}

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
  const [analyticsData, setAnalyticsData] = useState({});
  const [loadingAnalytics, setLoadingAnalytics] = useState({});
  const [timePeriods, setTimePeriods] = useState({});
  const [showFacebookPosts, setShowFacebookPosts] = useState({});
  const [showHistoricalCharts, setShowHistoricalCharts] = useState({});

  // Confirmation states
  const [confirmDisconnectId, setConfirmDisconnectId] = useState(null);
  const [confirmDisconnectAll, setConfirmDisconnectAll] = useState(false);

  // Time period options
  const TIME_PERIOD_OPTIONS = [
    { value: 7, label: 'Last 7 days' },
    { value: 15, label: 'Last 15 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 60, label: 'Last 60 days' },
    { value: 90, label: 'Last 3 months' },
    { value: 180, label: 'Last 6 months' },
    { value: 365, label: 'Last 1 year' }
  ];

  // Helper function to check if Facebook API is ready
  const isFacebookApiReady = () => {
    return window.FB && window.FB.api && typeof window.FB.api === 'function';
  };

  // Load connected accounts from localStorage on component mount
  useEffect(() => {
    console.log('🔍 Component mounted, loading accounts from storage...');
    migrateToUserSpecificStorage([
      'fb_connected_accounts',
      'fb_active_account_id'
    ]);

    const customerId = getCurrentCustomerId();
    
    // 🔥 NEW: Log the customer ID detection for debugging
    console.log('🆔 Detected Customer ID:', {
      customerId,
      urlParams: new URLSearchParams(window.location.search).get('customerId'),
      hashParams: new URLSearchParams(window.location.hash.split('?')[1] || '').get('customerId'),
      localStorage: JSON.parse(localStorage.getItem('currentUser') || '{}'),
      fullUrl: window.location.href
    });

    // NEW: Try to fetch from backend first
    const fetchConnectedAccountsFromBackend = async () => {
      if (!customerId) {
        console.warn('❌ No customer ID available for backend fetch');
        return null;
      }
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          // Only keep Facebook accounts for this customer
          const facebookAccounts = data.accounts.filter(
            acc => acc.platform === 'facebook' && acc.customerId === customerId
          );
          return facebookAccounts.map(acc => ({
            id: acc.platformUserId,
            name: acc.name,
            email: acc.email,
            picture: acc.profilePicture ? { data: { url: acc.profilePicture } } : null,
            accessToken: acc.accessToken,
            connectedAt: acc.connectedAt,
            tokenExpiresAt: acc.tokenExpiresAt,
            // Add any other fields as needed
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch accounts from backend:', err);
      }
      return null;
    };

    (async () => {
      // NEW: Try to fetch from backend first
      const backendAccounts = await fetchConnectedAccountsFromBackend();
      if (backendAccounts && backendAccounts.length > 0) {
        setConnectedAccounts(backendAccounts);
        setUserData('fb_connected_accounts', backendAccounts); // Sync to localStorage
        setActiveAccountId(backendAccounts[0].id);
        setActiveAccount(backendAccounts[0]);
        setUserData('fb_active_account_id', backendAccounts[0].id);
        return;
      }

      // Fallback to localStorage if backend empty
      const savedAccounts = getUserData('fb_connected_accounts');
      const savedActiveId = getUserData('fb_active_account_id');
      // Only keep Facebook accounts for this customer
      const facebookAccounts = Array.isArray(savedAccounts)
        ? savedAccounts.filter(
            acc => acc.platform === 'facebook' && acc.customerId === customerId
          )
        : [];

      console.log('📦 Storage check on mount:', {
        savedAccounts: savedAccounts ? savedAccounts.length : 0,
        savedActiveId,
        accountsData: savedAccounts
      });

      if (facebookAccounts.length > 0) {
        setConnectedAccounts(facebookAccounts);
        if (savedActiveId && facebookAccounts.some(acc => acc.id === savedActiveId)) {
          setActiveAccountId(savedActiveId);
          const activeAcc = facebookAccounts.find(acc => acc.id === savedActiveId);
          setActiveAccount(activeAcc);
          console.log('✅ Set active account:', activeAcc?.name);
        } else if (facebookAccounts.length > 0) {
          setActiveAccountId(facebookAccounts[0].id);
          setActiveAccount(facebookAccounts[0]);
          setUserData('fb_active_account_id', facebookAccounts[0].id);
          console.log('✅ Set first account as active:', facebookAccounts[0].name);
        }
      } else {
        console.log('ℹ️ No connected accounts found in storage');
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
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_metadata,email,public_profile', // <-- ADDED pages_manage_posts
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
      fields: 'id,name,access_token,category,about,fan_count,link,picture,username,website,phone,verification_status,tasks',
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

  const fetchStoredAnalytics = async (pageId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/analytics/${pageId}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const latestAnalytics = result.data[0];
        console.log('✅ Loaded analytics from database:', latestAnalytics.createdAt);
        
        setAnalyticsData(prev => ({
          ...prev,
          [pageId]: latestAnalytics.analytics
        }));
        
        setTimePeriods(prev => ({ ...prev, [pageId]: latestAnalytics.timePeriod }));
        
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Failed to fetch stored analytics:', error);
      return false;
    }
  };

  const fetchPageAnalytics = (pageId, pageAccessToken, days = 30) => {
    setLoadingAnalytics(prev => ({ ...prev, [pageId]: true }));
    
    setTimePeriods(prev => ({ ...prev, [pageId]: days }));
    
    console.log('Using post-based analytics (Facebook Insights API not available for this app type)');
    fetchPostBasedAnalytics(pageId, pageAccessToken, days);
  };

  const processAnalyticsData = (insightsData, days = 30) => {
    const endDate = new Date();
    const result = {
      engagement: [],
      likes: [],
      comments: [],
      shares: []
    };

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      result.engagement.push({ date: dateStr, value: 0 });
      result.likes.push({ date: dateStr, value: 0 });
      result.comments.push({ date: dateStr, value: 0 });
      result.shares.push({ date: dateStr, value: 0 });
    }

    return result;
  };

  const fetchPostBasedAnalytics = (pageId, pageAccessToken, days = 30) => {
    if (!isFacebookApiReady()) {
      setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
      setFbError({ message: 'Facebook API is not ready' });
      return;
    }

    const postsLimit = Math.min(500, Math.max(50, days * 3));
    
    window.FB.api(
      `/${pageId}/posts`,
      {
        fields: 'id,message,created_time,likes.summary(true),comments.summary(true),shares,reactions.summary(true),full_picture',
        limit: postsLimit,
        access_token: pageAccessToken
      },
      function(response) {
        if (!response || response.error) {
          console.error('Posts fetch error for analytics:', response.error);
          setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
          return;
        }

        const posts = response.data;
        const analyticsData = generatePostBasedAnalytics(posts, days);
        
        setAnalyticsData(prev => ({
          ...prev,
          [pageId]: { facebook: analyticsData }
        }));
        setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
        
        fetch(`${process.env.REACT_APP_API_URL}/api/analytics/store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId,
            platform: 'facebook',
            analytics: analyticsData,
            timePeriod: days
          })
        }).catch(err => console.warn('Failed to store analytics:', err));
      }
    );
  };

  const generatePostBasedAnalytics = (posts, days = 30) => {
    const endDate = new Date();
    const result = {
      engagement: [],
      likes: [],
      comments: [],
      shares: []
    };

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayPosts = posts.filter(post => {
        const postDate = new Date(post.created_time);
        return format(postDate, 'yyyy-MM-dd') === dateStr;
      });

      const dayLikes = dayPosts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0);
      const dayComments = dayPosts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0);
      const dayShares = dayPosts.reduce((sum, post) => sum + (post.shares?.count || 0), 0);
      const dayReactions = dayPosts.reduce((sum, post) => sum + (post.reactions?.summary?.total_count || 0), 0);
      const dayEngagement = dayLikes + dayComments + dayShares + dayReactions;

      result.engagement.push({ date: dateStr, value: dayEngagement });
      result.likes.push({ date: dateStr, value: dayLikes });
      result.comments.push({ date: dateStr, value: dayComments });
      result.shares.push({ date: dateStr, value: dayShares });
    }

    return result;
  };

  const renderAnalytics = (pageId) => {
    const analytics = analyticsData[pageId];
    const selectedPeriod = timePeriods[pageId] || 30;
    
    if (!analytics) return null;

    return (
      <div className="mt-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <h5 className="font-medium text-gray-700 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Real-Time Analytics & Trends
          </h5>
          
          <div className="flex items-center space-x-3">
            <label htmlFor={`time-period-${pageId}`} className="text-sm font-medium text-gray-600">
              Time Period:
            </label>
            <select
              id={`time-period-${pageId}`}
              value={selectedPeriod}
              onChange={(e) => {
                const days = parseInt(e.target.value);
                const page = fbPages.find(p => p.id === pageId);
                if (page) {
                  fetchPageAnalyticsWithDbFirst(pageId, page.access_token, days);
                }
              }}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {TIME_PERIOD_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            
            <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
              🗄️ DB + Live Data
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {analytics.facebook?.engagement && (
            <TrendChart
              data={analytics.facebook.engagement}
              title="Facebook Daily Engagement"
              color="#1877F2"
              metric="value"
            />
          )}
          
          {analytics.facebook?.likes && (
            <TrendChart
              data={analytics.facebook.likes}
              title="Facebook Daily Likes"
              color="#42A5F5"
              metric="value"
            />
          )}
          
          {analytics.facebook?.comments && (
            <TrendChart
              data={analytics.facebook.comments}
              title="Facebook Daily Comments"
              color="#1565C0"
              metric="value"
            />
          )}
          
          {analytics.facebook?.shares && (
            <TrendChart
              data={analytics.facebook.shares}
              title="Facebook Daily Shares"
              color="#0D47A1"
              metric="value"
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          {analytics.facebook && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Facebook Engagement</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {analytics.facebook.engagement?.reduce((sum, item) => sum + item.value, 0)?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-blue-500">Last {selectedPeriod} days total</p>
                </div>
                <Facebook className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Comments</p>
                <p className="text-2xl font-bold text-green-800">
                  {(analytics.facebook?.comments || []).reduce((sum, item) => sum + item.value, 0)?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-green-500">All platforms</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Avg Daily Activity</p>
                <p className="text-2xl font-bold text-purple-800">
                  {Math.round((analytics.facebook?.engagement || []).reduce((sum, item) => sum + item.value, 0) / selectedPeriod)?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-purple-500">Per day average</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h6 className="font-medium text-blue-800 mb-2">📊 Smart Analytics Loading</h6>
          <div className="text-sm text-blue-700 space-y-1">
            <p>🗄️ <strong>Database First:</strong> Loads stored analytics instantly when available</p>
            <p>📡 <strong>Live Fallback:</strong> Fetches from Facebook APIs only when needed</p>
            <p>⚡ <strong>Fast Loading:</strong> Stored data loads immediately, no API delays</p>
            <p>🔄 <strong>Auto-Store:</strong> New data is automatically saved for future quick access</p>
            <p>📈 <strong>Period:</strong> Showing data for the last {selectedPeriod} days</p>
            <p>💡 <strong>Tip:</strong> Background scripts can collect analytics daily for instant loading</p>
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
        fields: 'id,message,created_time,permalink_url',
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
            ))}
          </div>
        )}
      </div>
    );
  };

  // Remove post upload modal state and logic
  // const [showPostModal, setShowPostModal] = useState(false);
  // const [postTarget, setPostTarget] = useState(null);
  // const [postMessage, setPostMessage] = useState('');
  // const [postImageUrl, setPostImageUrl] = useState('');
  // const [uploadingPost, setUploadingPost] = useState(false);
  // const [uploadResult, setUploadResult] = useState(null);

  // Remove renderPostModal function
  // const renderPostModal = () => { ... }

  // Remove "Create FB Post", "Smart Analytics", "Live API Call" buttons from renderPageDetails
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
          {renderAnalytics(page.id)}
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
      // 🔥 CRITICAL FIX: Use the correct customer ID detection
      const customerId = getCurrentCustomerId();
      
      // Log what we found for debugging
      console.log('🔍 Customer ID search for social account storage:', {
        customerId,
        found: !!customerId,
        urlCustomerId: new URLSearchParams(window.location.search).get('customerId') || 
                       new URLSearchParams(window.location.hash.split('?')[1] || '').get('customerId'),
        localStorageUser: JSON.parse(localStorage.getItem('currentUser') || '{}')
      });
      
      if (!customerId) {
        console.error('❌ No customer ID found, cannot store social account');
        alert('Error: No customer ID found. Please make sure you accessed this page through the proper configuration link.');
        return;
      }

      // ✅ CRITICAL FIX: Always store the current user access token
      if (!activeAccount?.accessToken) {
        console.error('❌ No user access token available - refresh will not work');
        alert('Warning: User access token is missing. Token refresh may not work. Please reconnect if you experience issues.');
      }

      const accountData = {
        customerId: customerId, // 🔥 Use the correctly detected customer ID
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

      // ✅ Log token validation status with customer ID
      console.log('🔑 Token Validation Summary:', {
        customerId,
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
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored customer social account for admin access with customer ID:', customerId);
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

  // Render account selector with token status
  const renderAccountSelector = () => {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-700 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Connected Facebook Accounts ({connectedAccounts.length})
          </h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshPageTokens}
              disabled={!fbSdkLoaded || !isFacebookApiReady() || !activeAccount}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
            >
              <span>🔄</span>
              <span>Refresh Tokens</span>
            </button>
            <button
              onClick={fbLogin}
              disabled={!fbSdkLoaded || !isFacebookApiReady()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Account</span>
            </button>
          </div>
        </div>
        
        {connectedAccounts.length > 0 && (
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
                    {account.picture?.data?.url ? (
                      <img
                        src={account.picture.data.url}
                        alt={account.name}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Facebook className="h-6 w-6 text-blue-600" />
                      </div>
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
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDisconnectId(account.id);
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
        )}
      </div>
    );
  };

  // Render followers timeline chart (optional, similar to Instagram)
  const renderFollowersTrendChart = (pageId) => {
    // Placeholder for future follower timeline data
    return null;
  };

  // Main connected state UI (similar to Instagram)
  const renderConnectedState = () => (
    <div className="space-y-6">
      {/* Show account selector if multiple accounts */}
      {connectedAccounts.length > 1 && renderAccountSelector()}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
            <span className="text-sm font-medium text-green-700">
              {connectedAccounts.length} Account{connectedAccounts.length !== 1 ? 's' : ''} Connected
            </span>
          </div>
          {activeAccount && (
            <div className="flex items-center space-x-2">
              {activeAccount.picture?.data?.url ? (
                <img
                  src={activeAccount.picture.data.url}
                  alt="Profile"
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <Facebook className="h-4 w-4 text-blue-600" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {activeAccount.name}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fbLogin}
            disabled={!fbSdkLoaded || !isFacebookApiReady()}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
          <button
            onClick={() => setConfirmDisconnectAll(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            <span>Disconnect All</span>
          </button>
        </div>
      </div>

      {/* Show error if any */}
      {fbError && renderError()}

      {/* Show active account details */}
      {activeAccount && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              {activeAccount.picture?.data?.url ? (
                <img
                  src={activeAccount.picture.data.url}
                  alt="Facebook profile"
                  className="w-20 h-20 rounded-full border-4 border-blue-200"
                />
              ) : (
                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center">
                  <Facebook className="h-10 w-10 text-white" />
                </div>
              )}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{activeAccount.name}</h2>
                <p className="text-sm text-gray-600">{activeAccount.email}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={refreshPageTokens}
                disabled={!fbSdkLoaded || !isFacebookApiReady() || !activeAccount}
                className="flex items-center space-x-2 px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm"
              >
                <Settings className="h-4 w-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={() => setConfirmDisconnectId(activeAccount.id)}
                className="flex items-center space-x-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
              >
                <Trash2 className="h-4 w-4" />
                <span>Disconnect</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 text-center mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {fbPages.length}
              </div>
              <div className="text-sm text-gray-600 font-medium">Pages</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {activeAccount.email || 'N/A'}
              </div>
              <div className="text-sm text-gray-600 font-medium">Email</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {activeAccount.connectedAt ? new Date(activeAccount.connectedAt).toLocaleDateString() : 'N/A'}
              </div>
              <div className="text-sm text-gray-600 font-medium">Connected</div>
            </div>
          </div>

          {/* Historical Charts Toggle */}
          <div className="mb-6">
            <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4">
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
                  [activeAccount.id]: !prev[activeAccount.id]
                }))}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <Calendar className="h-4 w-4" />
                <span>
                  {showHistoricalCharts[activeAccount.id] ? 'Hide' : 'Show'} Historical Data
                </span>
              </button>
            </div>
          </div>

          {/* Show Historical Charts */}
          {showHistoricalCharts[activeAccount.id] && (
            <TimePeriodChart
              platform="facebook"
              accountId={activeAccount.id}
              title="Facebook Historical Analytics"
              defaultMetric="engagement"
            />
          )}

          {/* Render followers timeline chart if available */}
          {renderFollowersTrendChart(activeAccount.id)}
        </div>
      )}

      {/* Show pages for active account */}
      {activeAccount && (
        <div>
          <h4 className="font-medium mb-3">Pages for {activeAccount.name}:</h4>
          {fbPages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
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
              {fbPages.map(page => renderPageDetails(page))}
            </div>
          )}
        </div>
      )}
    </div>
  );


  // Remove account (with confirmation)
  const removeAccount = async (accountId, skipConfirm = false) => {
    if (!skipConfirm) {
      setConfirmDisconnectId(accountId);
      return;
    }
    const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
    setConnectedAccounts(updatedAccounts);
    saveAccountsToStorage(updatedAccounts);

    setFbError(null);

    const customerId = getCurrentCustomerId();
    if (customerId) {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          const backendAcc = data.accounts.find(acc => acc.platformUserId === accountId);
          if (backendAcc && backendAcc._id) {
            await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${backendAcc._id}`, {
              method: 'DELETE'
            });
          }
        }
      } catch (err) {
        console.warn('Failed to remove account from backend:', err);
      }
    }

    if (activeAccountId === accountId) {
      if (updatedAccounts.length > 0) {
        switchAccount(updatedAccounts[0].id);
      } else {
        setActiveAccountId(null);
        setActiveAccount(null);
        setFbPages([]);
        setPageInsights({});
        setPagePosts({});
        setAnalyticsData({});
        removeUserData('fb_active_account_id');
        setFbError(null);
      }
    }
    setConfirmDisconnectId(null); // Close modal after action
  };

  // Logout all accounts (with confirmation)
  const fbLogoutAll = (skipConfirm = false) => {
    if (!skipConfirm) {
      setConfirmDisconnectAll(true);
      return;
    }
    if (!isFacebookApiReady()) {
      clearAllAccountData();
      setConfirmDisconnectAll(false);
      return;
    }
    window.FB.getLoginStatus((response) => {
      if (response.status === 'connected') {
        window.FB.logout(() => {
          clearAllAccountData();
          setConfirmDisconnectAll(false);
        });
      } else {
        clearAllAccountData();
        setConfirmDisconnectAll(false);
      }
    });
  };

  // Add this helper function inside the component
  const clearAllAccountData = () => {
    setConnectedAccounts([]);
    setActiveAccountId(null);
    setActiveAccount(null);
    setFbPages([]);
    setPageInsights({});
    setPagePosts({});
    setAnalyticsData({});
    removeUserData('fb_connected_accounts');
    removeUserData('fb_active_account_id');
    setFbError(null);
  };

  // Confirmation Modal Component
  const renderConfirmModal = () => {
    if (confirmDisconnectId) {
      const account = connectedAccounts.find(acc => acc.id === confirmDisconnectId);
      return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Disconnect Account</h3>
            <p className="mb-4">
              Are you sure you want to disconnect <span className="font-semibold">{account?.name}</span>?
              This will remove the account completely.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmDisconnectId(null)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => removeAccount(confirmDisconnectId, true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      );
    }
    if (confirmDisconnectAll) {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">Disconnect All Accounts</h3>
            <p className="mb-4">
              Are you sure you want to disconnect <span className="font-semibold">{connectedAccounts.length}</span> account(s)? This will remove all Facebook accounts completely.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setConfirmDisconnectAll(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => fbLogoutAll(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Disconnect All
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Add Facebook onboarding UI
  const renderFacebookOnboarding = () => (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="flex justify-center mb-4">
          <Facebook className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Connect Facebook Business Accounts</h2>
        <p className="text-gray-600 mb-6">
          Connect multiple Facebook accounts and manage all your pages from one dashboard with historical data tracking!
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
          <div className="font-semibold mb-2 flex items-center">
            <Settings className="h-4 w-4 mr-2 text-blue-600" />
            Multi-Account Setup Guide
          </div>
          <ol className="list-decimal ml-5 text-sm text-blue-900 space-y-1">
            <li>Convert your Facebook profile to a Business account (if needed)</li>
            <li>Make sure you manage at least one Facebook Page</li>
            <li>Click "Connect" below and log in to Facebook</li>
            <li>Grant permissions to access your managed pages</li>
            <li>Select which accounts/pages to connect and manage</li>
            <li>Historical data will be captured automatically</li>
          </ol>
        </div>
        <button
          onClick={fbLogin}
          disabled={!fbSdkLoaded || !isFacebookApiReady()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center"
        >
          <Facebook className="h-5 w-5 mr-2" />
          Connect Facebook Account
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Facebook className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Facebook Integration</span>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {!fbSdkLoaded ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading Facebook SDK...</p>
              </div>
            </div>
          ) : (
            <>
              {connectedAccounts.length === 0
                ? renderFacebookOnboarding()
                : (
                  <>
                    {renderConnectedState()}
                    {renderConfirmModal()}
                  </>
                )
              }
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default FacebookIntegration;