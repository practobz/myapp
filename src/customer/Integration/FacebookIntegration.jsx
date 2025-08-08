import React, { useState, useEffect } from 'react';
import {
  Facebook, BarChart3, Eye, Calendar, Instagram, Trash2, TrendingUp, Plus, Users, UserCheck
} from 'lucide-react';
import TrendChart from '../../components/TrendChart';
import { subDays, format } from 'date-fns';
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
  const [analyticsData, setAnalyticsData] = useState({});
  const [loadingAnalytics, setLoadingAnalytics] = useState({});
  const [timePeriods, setTimePeriods] = useState({});
  const [instagramPosts, setInstagramPosts] = useState({});
  const [loadingInstagramPosts, setLoadingInstagramPosts] = useState({});
  const [showFacebookPosts, setShowFacebookPosts] = useState({});
  const [showInstagramPosts, setShowInstagramPosts] = useState({});

  // Post upload modal state
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTarget, setPostTarget] = useState(null);
  const [postMessage, setPostMessage] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [uploadingPost, setUploadingPost] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

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
    // First, migrate any existing data to user-specific storage
    migrateToUserSpecificStorage([
      'fb_connected_accounts',
      'fb_active_account_id'
    ]);

    const savedAccounts = getUserData('fb_connected_accounts');
    const savedActiveId = getUserData('fb_active_account_id');
    
    if (savedAccounts) {
      setConnectedAccounts(savedAccounts);
      
      if (savedActiveId && savedAccounts.some(acc => acc.id === savedActiveId)) {
        setActiveAccountId(savedActiveId);
        const activeAcc = savedAccounts.find(acc => acc.id === savedActiveId);
        setActiveAccount(activeAcc);
      } else if (savedAccounts.length > 0) {
        // Set first account as active if no valid active account
        setActiveAccountId(savedAccounts[0].id);
        setActiveAccount(savedAccounts[0]);
        setUserData('fb_active_account_id', savedAccounts[0].id);
      }
    }
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

  // Save accounts to localStorage
  const saveAccountsToStorage = (accounts) => {
    setUserData('fb_connected_accounts', accounts);
  };

  // Handle Facebook login for new account
  const fbLogin = () => {
    if (!isFacebookApiReady()) {
      setFbError({ message: 'Facebook SDK is not ready. Please wait and try again.' });
      return;
    }

    window.FB.login((response) => {
      if (response.status === 'connected') {
        const accessToken = response.authResponse.accessToken;
        const userId = response.authResponse.userID;
        
        // Fetch user data for the new account
        window.FB.api('/me', { 
          fields: 'id,name,email,picture',
          access_token: accessToken 
        }, function(userResponse) {
          if (!userResponse || userResponse.error) {
            setFbError(userResponse.error);
            return;
          }
          
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
          
          // Check if account already exists
          const existingAccountIndex = connectedAccounts.findIndex(acc => acc.id === userId);
          let updatedAccounts;
          
          if (existingAccountIndex >= 0) {
            // Update existing account
            updatedAccounts = [...connectedAccounts];
            updatedAccounts[existingAccountIndex] = { ...updatedAccounts[existingAccountIndex], ...newAccount };
          } else {
            // Add new account
            updatedAccounts = [...connectedAccounts, newAccount];
          }
          
          setConnectedAccounts(updatedAccounts);
          saveAccountsToStorage(updatedAccounts);
          
          // Set as active account
          setActiveAccountId(userId);
          setActiveAccount(newAccount);
          setUserData('fb_active_account_id', userId);
          
          // Clear any existing error
          setFbError(null);

          // Request long-lived token
          requestLongLivedToken(accessToken, newAccount);
        });
      } else {
        setFbError({ message: 'Facebook login failed or was cancelled' });
      }
    }, {
      scope: 'pages_show_list,pages_read_engagement,pages_manage_metadata,instagram_basic,email,public_profile',
      return_scopes: true,
      auth_type: 'rerequest'
    });
  };

  // Request long-lived token
  const requestLongLivedToken = async (shortLivedToken, account) => {
    try {
      console.log('🔄 Requesting long-lived token...');
      
      const response = await fetch(
        `https://graph.facebook.com/oauth/access_token?` +
        `grant_type=fb_exchange_token&` +
        `client_id=${FACEBOOK_APP_ID}&` +
        `client_secret=${process.env.REACT_APP_FACEBOOK_APP_SECRET}&` +
        `fb_exchange_token=${shortLivedToken}`
      );
      
      const data = await response.json();
      
      if (data.access_token) {
        console.log('✅ Received long-lived token');
        
        // Update account with long-lived token
        const updatedAccount = {
          ...account,
          accessToken: data.access_token,
          tokenType: 'long_lived',
          tokenExpiresAt: data.expires_in ? 
            new Date(Date.now() + (data.expires_in * 1000)).toISOString() : null
        };
        
        // Update in state and storage
        const updatedAccounts = connectedAccounts.map(acc => 
          acc.id === account.id ? updatedAccount : acc
        );
        
        setConnectedAccounts(updatedAccounts);
        saveAccountsToStorage(updatedAccounts);
        
        if (activeAccountId === account.id) {
          setActiveAccount(updatedAccount);
        }
      } else {
        console.warn('⚠️ Failed to get long-lived token:', data);
      }
    } catch (error) {
      console.warn('⚠️ Error requesting long-lived token:', error);
      // Continue with short-lived token
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
      fields: 'id,name,access_token,category,about,fan_count,link,picture,username,website,phone,verification_status,instagram_business_account,tasks',
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
          
          if (page.instagram_business_account) {
            fetchInstagramDetails(page.instagram_business_account.id, page.access_token);
          }
        });
      }
    });
  };

  // Modified fetchPageInsights with error handling
  const fetchPageInsights = (pageId, pageAccessToken, instagramId = null) => {
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
          
          if (instagramId) {
            fetchInstagramMetrics(instagramId, pageAccessToken, pageId, engagementMetrics);
          } else {
            setPageInsights(prev => ({
              ...prev,
              [pageId]: engagementMetrics
            }));
          }
        }
      }
    );
  };

  const fetchInstagramMetrics = (instagramId, pageAccessToken, pageId, fbMetrics) => {
    if (!isFacebookApiReady()) return;

    window.FB.api(
      `/${instagramId}/media`,
      {
        fields: 'like_count,comments_count',
        limit: 10,
        access_token: pageAccessToken
      },
      function(response) {
        if (!response || response.error) {
          console.error('Instagram metrics fetch error:', response.error);
          setPageInsights(prev => ({
            ...prev,
            [pageId]: fbMetrics
          }));
        } else {
          const instagramPosts = response.data;
          const totalInstagramLikes = instagramPosts.reduce((sum, post) => sum + (post.like_count || 0), 0);
          const totalInstagramComments = instagramPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
          
          const instagramMetrics = [
            { name: 'IG Likes', value: totalInstagramLikes, title: 'Instagram Likes (Last 10 posts)' },
            { name: 'IG Comments', value: totalInstagramComments, title: 'Instagram Comments (Last 10 posts)' }
          ];
          
          const combinedMetrics = [...fbMetrics, ...instagramMetrics];
          
          setPageInsights(prev => ({
            ...prev,
            [pageId]: combinedMetrics
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

  const fetchPageAnalytics = (pageId, pageAccessToken, instagramId = null, days = 30) => {
    setLoadingAnalytics(prev => ({ ...prev, [pageId]: true }));
    
    setTimePeriods(prev => ({ ...prev, [pageId]: days }));
    
    console.log('Using post-based analytics (Facebook Insights API not available for this app type)');
    fetchPostBasedAnalytics(pageId, pageAccessToken, instagramId, days);
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

  const generateInstagramPostAnalytics = (posts, days = 30) => {
    const endDate = new Date();
    const result = {
      likes: [],
      comments: [],
      posts: []
    };

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayPosts = posts.filter(post => {
        const postDate = new Date(post.timestamp);
        return format(postDate, 'yyyy-MM-dd') === dateStr;
      });

      const dayLikes = dayPosts.reduce((sum, post) => sum + (post.like_count || 0), 0);
      const dayComments = dayPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
      const postCount = dayPosts.length;

      result.likes.push({ date: dateStr, value: dayLikes });
      result.comments.push({ date: dateStr, value: dayComments });
      result.posts.push({ date: dateStr, value: postCount });
    }

    return result;
  };

  const fetchPostBasedAnalytics = (pageId, pageAccessToken, instagramId = null, days = 30) => {
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
        
        if (instagramId) {
          fetchInstagramPostAnalytics(instagramId, pageAccessToken, pageId, analyticsData, days);
        } else {
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

  const fetchInstagramPostAnalytics = (instagramId, pageAccessToken, pageId, fbData, days = 30) => {
    if (!isFacebookApiReady()) {
      setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
      return;
    }

    const postsLimit = Math.min(500, Math.max(50, days * 2));
    
    window.FB.api(
      `/${instagramId}/media`,
      {
        fields: 'id,caption,timestamp,like_count,comments_count,media_type',
        limit: postsLimit,
        access_token: pageAccessToken
      },
      function(response) {
        setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
        
        if (!response || response.error) {
          console.warn('Instagram posts fetch error:', response.error);
          setAnalyticsData(prev => ({
            ...prev,
            [pageId]: { facebook: fbData }
          }));
          
          fetch(`${process.env.REACT_APP_API_URL}/api/analytics/store`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pageId,
              platform: 'facebook',
              analytics: fbData,
              timePeriod: days
            })
          }).catch(err => console.warn('Failed to store analytics:', err));
          return;
        }

        const instagramPosts = response.data;
        const igAnalytics = generateInstagramPostAnalytics(instagramPosts, days);
        
        setAnalyticsData(prev => ({
          ...prev,
          [pageId]: {
            facebook: fbData,
            instagram: igAnalytics
          }
        }));
        
        fetch(`${process.env.REACT_APP_API_URL}/api/analytics/store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId,
            platform: 'facebook_instagram',
            analytics: {
              facebook: fbData,
              instagram: igAnalytics
            },
            timePeriod: days
          })
        }).catch(err => console.warn('Failed to store analytics:', err));
      }
    );
  };

  const fetchPageAnalyticsWithDbFirst = async (pageId, pageAccessToken, instagramId = null, days = 30) => {
    setLoadingAnalytics(prev => ({ ...prev, [pageId]: true }));
    
    setTimePeriods(prev => ({ ...prev, [pageId]: days }));
    
    try {
      const loadedFromDb = await fetchStoredAnalytics(pageId);
      
      if (loadedFromDb) {
        console.log('📊 Using stored analytics data');
        setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
        return;
      }
      
      console.log('🔄 No stored data found, fetching live analytics...');
      await fetchPageAnalyticsLive(pageId, pageAccessToken, instagramId, days);
      
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
    }
  };

  const fetchPageAnalyticsLive = async (pageId, pageAccessToken, instagramId = null, days = 30) => {
    console.log('📡 Fetching live analytics from Facebook APIs...');
    fetchPostBasedAnalytics(pageId, pageAccessToken, instagramId, days);
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
                  fetchPageAnalyticsWithDbFirst(pageId, page.access_token, page.instagram_details?.id, days);
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

          {analytics.instagram?.likes && (
            <TrendChart
              data={analytics.instagram.likes}
              title="Instagram Daily Likes"
              color="#E4405F"
              metric="value"
            />
          )}
          
          {analytics.instagram?.comments && (
            <TrendChart
              data={analytics.instagram.comments}
              title="Instagram Daily Comments"
              color="#C13584"
              metric="value"
            />
          )}
          
          {analytics.instagram?.posts && (
            <TrendChart
              data={analytics.instagram.posts}
              title="Instagram Daily Posts"
              color="#F56040"
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

          {analytics.instagram && (
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pink-600 font-medium">Instagram Likes</p>
                  <p className="text-2xl font-bold text-pink-800">
                    {analytics.instagram.likes?.reduce((sum, item) => sum + item.value, 0)?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs text-pink-500">Last {selectedPeriod} days total</p>
                </div>
                <Instagram className="h-8 w-8 text-pink-600" />
              </div>
            </div>
          )}

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Comments</p>
                <p className="text-2xl font-bold text-green-800">
                  {[
                    ...(analytics.facebook?.comments || []),
                    ...(analytics.instagram?.comments || [])
                  ].reduce((sum, item) => sum + item.value, 0)?.toLocaleString() || 0}
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
                  {Math.round([
                    ...(analytics.facebook?.engagement || []),
                    ...(analytics.instagram?.likes || [])
                  ].reduce((sum, item) => sum + item.value, 0) / selectedPeriod)?.toLocaleString() || 0}
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
            <p>📡 <strong>Live Fallback:</strong> Fetches from Facebook/Instagram APIs only when needed</p>
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
      async function(response) {
        setLoadingPosts(prev => ({ ...prev, [pageId]: false }));
        if (!response || response.error) {
          console.error('Posts fetch error:', response.error);
          setFbError(response.error);
        } else {
          const postsWithImages = await Promise.all(
            response.data.map(async post => {
              let imageUrl = null;
              try {
                const attachRes = await new Promise(resolve =>
                  window.FB.api(
                    `/${post.id}?fields=attachments{media_type,media,url}`,
                    { access_token: pageAccessToken },
                    resolve
                  )
                );
                if (
                  attachRes &&
                  attachRes.attachments &&
                  attachRes.attachments.data &&
                  attachRes.attachments.data[0] &&
                  attachRes.attachments.data[0].media &&
                  attachRes.attachments.data[0].media.image &&
                  attachRes.attachments.data[0].media.image.src
                ) {
                  imageUrl = attachRes.attachments.data[0].media.image.src;
                } else if (
                  attachRes &&
                  attachRes.attachments &&
                  attachRes.attachments.data &&
                  attachRes.attachments.data[0] &&
                  attachRes.attachments.data[0].media &&
                  attachRes.attachments.data[0].media.image_url
                ) {
                  imageUrl = attachRes.attachments.data[0].media.image_url;
                }
              } catch (e) {
                // ignore
              }
              return { ...post, full_picture: imageUrl };
            })
          );
          setPagePosts(prev => ({
            ...prev,
            [pageId]: postsWithImages
          }));
          setShowFacebookPosts(prev => ({ ...prev, [pageId]: true }));
        }
      }
    );
  };

  const fetchInstagramPosts = (instagramId, pageAccessToken) => {
    if (!isFacebookApiReady()) {
      setFbError({ message: 'Facebook API is not ready' });
      return;
    }

    setLoadingInstagramPosts(prev => ({ ...prev, [instagramId]: true }));
    
    window.FB.api(
      `/${instagramId}/media`,
      {
        fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count,thumbnail_url,children{media_url,media_type}',
        limit: 10,
        access_token: pageAccessToken
      },
      function(response) {
        setLoadingInstagramPosts(prev => ({ ...prev, [instagramId]: false }));
        if (!response || response.error) {
          console.error('Instagram posts fetch error:', response.error);
        } else {
          setInstagramPosts(prev => ({
            ...prev,
            [instagramId]: response.data
          }));
          setShowInstagramPosts(prev => ({ ...prev, [instagramId]: true }));
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

  const renderInstagramPosts = (instagramId) => {
    const posts = instagramPosts[instagramId];
    const isVisible = showInstagramPosts[instagramId];
    
    if (!posts || posts.length === 0) return null;

    return (
      <div className="mt-4 p-4 bg-pink-50 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <h5 className="font-medium text-pink-700 flex items-center">
            <Instagram className="h-4 w-4 mr-2" />
            Instagram Posts ({posts.length})
          </h5>
          <button
            onClick={() => setShowInstagramPosts(prev => ({ ...prev, [instagramId]: !prev[instagramId] }))
            }
            className="text-sm text-pink-600 hover:text-pink-800 font-medium"
          >
            {isVisible ? 'Hide Posts' : 'Show Posts'}
          </button>
        </div>
        
        {isVisible && (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {posts.map((post) => (
              <div key={post.id} className="bg-white p-4 rounded-lg border shadow-sm">
                <div className="flex items-start space-x-3">
                  {(post.media_url || post.thumbnail_url) && (
                    <div className="flex-shrink-0">
                      <img 
                        src={post.thumbnail_url || post.media_url} 
                        alt="Instagram media" 
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      {post.media_type && (
                        <div className="text-xs text-center mt-1">
                          <span className={`px-2 py-1 rounded text-white text-xs ${
                            post.media_type === 'VIDEO' ? 'bg-red-500' : 
                            post.media_type === 'CAROUSEL_ALBUM' ? 'bg-purple-500' : 'bg-blue-500'
                          }`}>
                            {post.media_type === 'IMAGE' ? '📷' : 
                             post.media_type === 'VIDEO' ? '🎥' : 
                             post.media_type === 'CAROUSEL_ALBUM' ? '🎠' : '📱'}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-1 rounded text-white ${
                        post.media_type === 'VIDEO' ? 'bg-red-500' : 
                        post.media_type === 'CAROUSEL_ALBUM' ? 'bg-purple-500' : 'bg-pink-500'
                      }`}>
                        {post.media_type === 'IMAGE' ? 'Photo' : 
                         post.media_type === 'VIDEO' ? 'Video' : 
                         post.media_type === 'CAROUSEL_ALBUM' ? 'Album' : 'Post'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(post.timestamp).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    
                    {post.caption && (
                      <p className="text-sm text-gray-800 mb-3 leading-relaxed">
                        {post.caption.length > 200 ? (
                          <>
                            {post.caption.substring(0, 200)}...
                            <span className="text-pink-600 text-xs ml-1 cursor-pointer">read more</span>
                          </>
                        ) : post.caption}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <span className="flex items-center space-x-1">
                          <span>❤️</span>
                          <span>{post.like_count || 0}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>💬</span>
                          <span>{post.comments_count || 0}</span>
                        </span>
                      </div>
                      
                      {post.permalink && (
                        <a 
                          href={post.permalink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-pink-600 hover:text-pink-800 font-medium"
                        >
                          View on Instagram →
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

  const renderPostModal = () => {
    if (!showPostModal || !postTarget) return null;
    const { type, page, instagramId } = postTarget;

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

          {page.instagram_details && (
            <div className="mb-4 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
              <h5 className="font-medium text-pink-700 mb-2 flex items-center">
                <Instagram className="h-4 w-4 mr-2" />
                Connected Instagram Account
              </h5>
              <div className="flex items-center space-x-4">
                {page.instagram_details.profile_picture_url && (
                  <img 
                    src={page.instagram_details.profile_picture_url} 
                    alt="Instagram profile"
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium">@{page.instagram_details.username}</p>
                  <div className="flex space-x-4 text-sm text-gray-600">
                    <span>Followers: {page.instagram_details.followers_count?.toLocaleString()}</span>
                    <span>Following: {page.instagram_details.follows_count?.toLocaleString()}</span>
                    <span>Posts: {page.instagram_details.media_count}</span>
                  </div>
                </div>
              </div>
              {page.instagram_details.biography && (
                <p className="text-sm text-gray-700 mt-2">{page.instagram_details.biography}</p>
              )}
            </div>
          )}

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
            {page.instagram_details && (
              <button
                className="bg-pink-600 text-white px-4 py-2 rounded text-sm hover:bg-pink-700 flex items-center space-x-2"
                onClick={() => {
                  setPostTarget({ type: 'instagram', page, instagramId: page.instagram_details.id });
                  setShowPostModal(true);
                  setPostMessage('');
                  setPostImageUrl('');
                  setUploadResult(null);
                }}
                disabled={!isFacebookApiReady()}
              >
                <Instagram className="h-4 w-4" />
                <span>Create IG Post</span>
              </button>
            )}
            <button
              onClick={() => fetchPageInsights(page.id, page.access_token, page.instagram_details?.id)}
              disabled={loadingInsights[page.id] || !isFacebookApiReady()}
              className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>{loadingInsights[page.id] ? 'Loading...' : 'Get Insights'}</span>
            </button>
            
            <button
              onClick={() => fetchPageAnalyticsWithDbFirst(page.id, page.access_token, page.instagram_details?.id, timePeriods[page.id] || 30)}
              disabled={loadingAnalytics[page.id] || !isFacebookApiReady()}
              className="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>{loadingAnalytics[page.id] ? 'Loading...' : 'Smart Analytics'}</span>
            </button>
            
            <button
              onClick={() => fetchPageAnalyticsLive(page.id, page.access_token, page.instagram_details?.id, timePeriods[page.id] || 30)}
              disabled={loadingAnalytics[page.id] || !isFacebookApiReady()}
              className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <span>📡</span>
              <span>{loadingAnalytics[page.id] ? 'Loading...' : 'Live API Call'}</span>
            </button>

            <button
              onClick={() => fetchPagePosts(page.id, page.access_token)}
              disabled={loadingPosts[page.id] || !isFacebookApiReady()}
              className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <Facebook className="h-4 w-4" />
              <span>{loadingPosts[page.id] ? 'Loading...' : 'Show FB Posts'}</span>
            </button>

            {page.instagram_details && (
              <button
                onClick={() => fetchInstagramPosts(page.instagram_details.id, page.access_token)}
                disabled={loadingInstagramPosts[page.instagram_details.id] || !isFacebookApiReady()}
                className="bg-pink-500 text-white px-4 py-2 rounded text-sm hover:bg-pink-600 disabled:opacity-50 flex items-center space-x-2"
              >
                <Instagram className="h-4 w-4" />
                <span>{loadingInstagramPosts[page.instagram_details.id] ? 'Loading...' : 'Show IG Posts'}</span>
              </button>
            )}
          </div>

          {renderPageInsights(page.id)}
          {renderAnalytics(page.id)}
          {renderPagePosts(page.id)}
          {page.instagram_details && renderInstagramPosts(page.instagram_details.id)}
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
      setInstagramPosts({});
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
        setActiveAccount(null);
        setFbPages([]);
        setPageInsights({});
        setPagePosts({});
        setAnalyticsData({});
        setInstagramPosts({});
        removeUserData('fb_active_account_id');
      }
    }
  };

  // Logout all accounts
  const fbLogoutAll = () => {
    if (!isFacebookApiReady()) {
      // Just clear local state if FB API is not available
      clearAllAccountData();
      return;
    }

    // Check if we have a valid Facebook session before calling logout
    window.FB.getLoginStatus((response) => {
      if (response.status === 'connected') {
        // Only call logout if user is actually logged in
        window.FB.logout(() => {
          clearAllAccountData();
        });
      } else {
        // User is not logged in to Facebook, just clear local data
        clearAllAccountData();
      }
    });
  };

  // Helper function to clear all account data
  const clearAllAccountData = () => {
    setConnectedAccounts([]);
    setActiveAccountId(null);
    setActiveAccount(null);
    setFbPages([]);
    setPageInsights({});
    setPagePosts({});
    setAnalyticsData({});
    setInstagramPosts({});
    removeUserData('fb_connected_accounts');
    removeUserData('fb_active_account_id');
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
          instagramId: page.instagram_details?.id || null,
          instagramUsername: page.instagram_details?.username || null,
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

      const accountData = {
        customerId: customerId,
        platform: 'facebook',
        platformUserId: activeAccount.id,
        name: activeAccount.name,
        email: activeAccount.email,
        profilePicture: activeAccount.picture?.data?.url,
        accessToken: activeAccount.accessToken,
        pages: [
          {
            id: page.id,
            name: page.name,
            accessToken: page.access_token,
            category: page.category,
            fanCount: page.fan_count,
            permissions: ['pages_read_engagement'],
            tasks: page.tasks || [],
            instagramBusinessAccount: page.instagram_business_account ? {
              id: page.instagram_business_account.id
            } : null,
            tokenValidatedAt: new Date().toISOString()
          }
        ],
        connectedAt: new Date().toISOString()
      };

      console.log('📤 Sending account data:', { 
        customerId, 
        platform: 'facebook', 
        platformUserId: activeAccount.id,
        pageTokenLength: accountData.pages[0].accessToken.length,
        userTokenLength: accountData.accessToken.length
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      
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

  // Fetch Instagram details
  const fetchInstagramDetails = (instagramId, pageAccessToken) => {
    if (!isFacebookApiReady()) return;

    window.FB.api(
      `/${instagramId}`,
      {
        fields: 'id,username,media_count,followers_count,follows_count,profile_picture_url,biography,website',
        access_token: pageAccessToken
      },
      function(response) {
        if (!response || response.error) {
          console.error('Instagram fetch error:', response.error);
        } else {
          setFbPages(prev => prev.map(page => 
            page.instagram_business_account?.id === instagramId 
              ? { ...page, instagram_details: response }
              : page
          ));
        }
      }
    );
  };

  // Add token refresh functionality
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
        // Then re-fetch pages to get fresh page tokens
        fetchFbPages();
        alert('✅ Tokens refreshed successfully!');
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
        )}

        {/* Enhanced Token Status Information */}
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

  return (
    <div className="border rounded-lg p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div className="flex items-center space-x-3 mb-4">
        <Facebook className="h-6 w-6 text-blue-600" />
        <h3 className="font-medium text-lg">Facebook/Meta Integration</h3>
      </div>

      {!fbSdkLoaded ? (
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p>Loading Facebook SDK...</p>
        </div>
      ) : (
        <>
          {connectedAccounts.length === 0 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connect your Facebook accounts to manage your pages and access detailed analytics.
              </p>
              <button
                onClick={fbLogin}
                disabled={!isFacebookApiReady()}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
              >
                <Facebook className="h-5 w-5" />
                <span>Connect Facebook Account</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {renderAccountSelector()}
              
              {activeAccount && (
                <>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                    <div className="flex items-center space-x-3">
                      {activeAccount.picture && (
                        <img 
                          src={activeAccount.picture.data.url} 
                          alt="Profile"
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <p className="font-medium">Active Account: {activeAccount.name}</p>
                        <p className="text-sm text-gray-600">{activeAccount.email}</p>
                        {isTokenExpired(activeAccount) && (
                          <p className="text-xs text-orange-600 font-medium">⚠️ Token expired - refresh recommended</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={fbLogoutAll}
                      className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors text-sm"
                    >
                      Disconnect All
                    </button>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Pages for {activeAccount.name}:</h4>
                    {fbPages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Facebook className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No pages found or you don't manage any pages.</p>
                        <p className="text-sm">Make sure you're an admin or editor of at least one Facebook page.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {fbPages.map(page => renderPageDetails(page))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          {renderError()}
        </>
      )}
      {renderPostModal()}
    </div>
  );
}

export default FacebookIntegration;