import React, { useState, useEffect } from 'react';
import { Instagram, TrendingUp,BarChart3, ExternalLink, CheckCircle, AlertCircle, Loader2, Users, Heart, MessageCircle, Eye, Plus, Settings, ChevronDown, ChevronRight, UserCheck, Trash2, Calendar, RefreshCw } from 'lucide-react';
import TrendChart from '../../components/TrendChart';
import TimePeriodChart from '../../components/TimeperiodChart';
import { subDays, format } from 'date-fns';
import { getUserData, setUserData, removeUserData, migrateToUserSpecificStorage } from '../../utils/sessionUtils';

// Your Facebook App ID (Instagram uses Facebook's Graph API)
const FACEBOOK_APP_ID = '4416243821942660';

// Time period options for historical data
const TIME_PERIOD_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 15, label: 'Last 15 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 2 months' },
  { value: 90, label: 'Last 3 months' },
  { value: 180, label: 'Last 6 months' },
  { value: 365, label: 'Last 1 year' }
];

function InstagramIntegration({ onData, onConnectionStatusChange }) {
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

  // Add state for selected post analytics
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [singlePostAnalytics, setSinglePostAnalytics] = useState(null);

  // State for followers timeline
  const [followersTimeline, setFollowersTimeline] = useState({});

  // Chart view state
  const [showHistoricalCharts, setShowHistoricalCharts] = useState({});

  // Helper function to check if Facebook API is ready
  const isFacebookApiReady = () => {
    return window.FB && window.FB.api && typeof window.FB.api === 'function';
  };

  // Function to store current metrics as historical snapshot
  // (Removed duplicate declaration of storeHistoricalSnapshot)

  function getCurrentCustomerId() {
    let customerId = null;
    
    // 🔥 PRIORITY 1: Check URL parameters first (for QR code links)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    
    // Check both regular URL params and hash params (for React Router)
    customerId = urlParams.get('customerId') || hashParams.get('customerId');
    
    if (customerId) {
      console.log('✅ Found customer ID in URL for Instagram:', customerId);
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
      console.log('✅ Found customer ID in localStorage for Instagram:', customerId);
    } else {
      console.warn('❌ No customer ID found in URL or localStorage for Instagram');
    }
    
    return customerId;
  }

  // Load connected accounts from localStorage on component mount
  useEffect(() => {
    console.log('🔍 Instagram component mounted, loading accounts from backend...');
    
    // First, migrate any existing data to user-specific storage
    migrateToUserSpecificStorage([
      'connected_instagram_accounts',
      'selected_instagram_account',
      'instagram_connected_accounts',
      'instagram_active_account_id'
    ]);

    const customerId = getCurrentCustomerId();
    
    // 🔥 NEW: Log the customer ID detection for debugging
    console.log('🆔 Detected Customer ID for Instagram:', {
      customerId,
      urlParams: new URLSearchParams(window.location.search).get('customerId'),
      hashParams: new URLSearchParams(window.location.hash.split('?')[1] || '').get('customerId'),
      localStorage: JSON.parse(localStorage.getItem('currentUser') || '{}'),
      fullUrl: window.location.href
    });

    // NEW: Fetch from backend first
    const fetchConnectedAccountsFromBackend = async () => {
      if (!customerId) {
        console.warn('❌ No customer ID available for Instagram backend fetch');
        return null;
      }
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          // Only Instagram accounts for this customer
          return data.accounts
            .filter(acc => acc.platform === 'instagram' && acc.customerId === customerId)
            .map(acc => ({
              id: acc.platformUserId,
              pageId: acc.facebookPageId,
              pageName: acc.name,
              profile: {
                username: acc.username,
                profile_picture_url: acc.profilePicture,
                followers_count: acc.instagramData?.followersCount,
                media_count: acc.instagramData?.mediaCount,
                biography: acc.instagramData?.biography,
                website: acc.instagramData?.website
              },
              media: [], // Optionally fetch media if needed
              userAccessToken: acc.accessToken,
              pageAccessToken: acc.pages?.[0]?.accessToken,
              connected: true,
              connectedAt: acc.connectedAt,
              tokenExpiresAt: acc.tokenExpiresAt || null
            }));
        }
      } catch (err) {
        console.warn('Failed to fetch Instagram accounts from backend:', err);
      }
      return null;
    };

    // Helper to hydrate backend accounts with live profile/media using direct Graph API
    const hydrateInstagramAccounts = async (accounts) => {
      if (!accounts || accounts.length === 0) return accounts;
      
      try {
        const hydrated = await Promise.all(accounts.map(async (acc) => {
          try {
            // Use direct Graph API calls instead of FB SDK to avoid session issues
            const pageToken = acc.pageAccessToken || acc.accessToken;
            
            if (!pageToken) {
              console.warn(`⚠️ No access token for account ${acc.id}, using stored data`);
              return acc;
            }
            
            // Fetch profile data
            const profileUrl = `https://graph.facebook.com/v18.0/${acc.id}?fields=id,username,media_count,profile_picture_url,biography,website,followers_count&access_token=${pageToken}`;
            const profileResponse = await fetch(profileUrl);
            const profileData = await profileResponse.json();
            
            // Fetch media data
            const mediaUrl = `https://graph.facebook.com/v18.0/${acc.id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${pageToken}`;
            const mediaResponse = await fetch(mediaUrl);
            const mediaData = await mediaResponse.json();
            
            // Check for API errors
            if (profileData.error || mediaData.error) {
              console.warn(`⚠️ API error for account ${acc.id}:`, profileData.error || mediaData.error);
              return acc; // Return original account with stored data
            }
            
            return {
              ...acc,
              profile: profileData,
              media: mediaData.data || []
            };
          } catch (error) {
            console.warn(`⚠️ Failed to hydrate account ${acc.id}:`, error);
            return acc; // Return original account with stored data on error
          }
        }));
        
        console.log(`✅ Hydrated ${hydrated.length} Instagram accounts`);
        return hydrated;
      } catch (error) {
        console.error('❌ Error hydrating Instagram accounts:', error);
        return accounts; // Return original accounts on error
      }
    };

    (async () => {
      const backendAccounts = await fetchConnectedAccountsFromBackend();
      if (backendAccounts && backendAccounts.length > 0) {
        // Hydrate with live profile/media
        const hydratedAccounts = await hydrateInstagramAccounts(backendAccounts);
        setConnectedAccounts(hydratedAccounts);
        setIsSignedIn(true);
        setUserData('instagram_connected_accounts', hydratedAccounts);
        setUserData('connected_instagram_accounts', hydratedAccounts);
        setActiveAccountId(hydratedAccounts[0].id);
        setSelectedAccountId(hydratedAccounts[0].id);
        setActiveAccount(hydratedAccounts[0]);
        setUserAccessToken(hydratedAccounts[0].userAccessToken || hydratedAccounts[0].accessToken);
        setUserData('instagram_active_account_id', hydratedAccounts[0].id);
        setUserData('selected_instagram_account', hydratedAccounts[0].id);
        return;
      }

      // Fallback to localStorage if backend empty
      const savedAccounts = getUserData('instagram_connected_accounts') || getUserData('connected_instagram_accounts');
      const savedActiveId = getUserData('instagram_active_account_id') || getUserData('selected_instagram_account');
      
      // Only keep Instagram accounts for this customer
      const instagramAccounts = Array.isArray(savedAccounts)
        ? savedAccounts.filter(
            acc => acc.platform === 'instagram' && acc.customerId === customerId
          )
        : savedAccounts; // Keep all if no customer filter available in legacy format
    
      console.log('📦 Instagram storage check on mount:', {
        savedAccounts: savedAccounts ? savedAccounts.length : 0,
        savedActiveId,
        accountsData: savedAccounts
      });
      
      if (instagramAccounts && Array.isArray(instagramAccounts) && instagramAccounts.length > 0) {
        console.log('✅ Setting Instagram accounts from storage:', instagramAccounts);
        setConnectedAccounts(instagramAccounts);
        setIsSignedIn(true); // Set signed in state
        
        if (savedActiveId && instagramAccounts.some(acc => acc.id === savedActiveId)) {
          setActiveAccountId(savedActiveId);
          setSelectedAccountId(savedActiveId); // Backward compatibility
          const activeAcc = instagramAccounts.find(acc => acc.id === savedActiveId);
          setActiveAccount(activeAcc);
          setUserAccessToken(activeAcc.userAccessToken || activeAcc.accessToken);
          console.log('✅ Set active Instagram account:', activeAcc?.profile?.username);
        } else if (instagramAccounts.length > 0) {
          // Set first account as active if no valid active account
          setActiveAccountId(instagramAccounts[0].id);
          setSelectedAccountId(instagramAccounts[0].id); // Backward compatibility
          setActiveAccount(instagramAccounts[0]);
          setUserAccessToken(instagramAccounts[0].userAccessToken || instagramAccounts[0].accessToken);
          setUserData('instagram_active_account_id', instagramAccounts[0].id);
          console.log('✅ Set first Instagram account as active:', instagramAccounts[0].profile?.username);
        }
      } else {
        console.log('ℹ️ No connected Instagram accounts found in storage');
      }
    })();
  }, []); // 🔥 IMPORTANT: Keep dependency array empty to run only on mount

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
  // (Removed duplicate declaration of saveAccountsToStorage)

  // Check if token is expired or about to expire (ENHANCED)
  // (Duplicate declaration removed)

  // Function to store current metrics as historical snapshot
  const storeHistoricalSnapshot = async (accountId, accountName, metrics) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/historical-data/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'instagram',
          accountId: accountId,
          pageId: accountId,
          accountName: accountName,
          metrics: {
            followersCount: metrics.followersCount || 0,
            mediaCount: metrics.mediaCount || 0,
            likesCount: metrics.totalLikes || 0,
            totalLikes: metrics.totalLikes || 0,
            commentsCount: metrics.totalComments || 0,
            totalComments: metrics.totalComments || 0,
            engagementCount: (metrics.totalLikes || 0) + (metrics.totalComments || 0),
            totalEngagement: (metrics.totalLikes || 0) + (metrics.totalComments || 0),
            postsCount: metrics.postsCount || 0,
            photosCount: metrics.photosCount || 0,
            videosCount: metrics.videosCount || 0
          },
          dataSource: 'api'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`✅ Stored historical snapshot for Instagram account: ${accountName}`);
      }
    } catch (error) {
      console.warn('Failed to store historical snapshot:', error);
    }
  };

  function getCurrentCustomerId() {
    let customerId = null;
    
    // 🔥 PRIORITY 1: Check URL parameters first (for QR code links)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    
    // Check both regular URL params and hash params (for React Router)
    customerId = urlParams.get('customerId') || hashParams.get('customerId');
    
    if (customerId) {
      console.log('✅ Found customer ID in URL for Instagram:', customerId);
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
      console.log('✅ Found customer ID in localStorage for Instagram:', customerId);
    } else {
      console.warn('❌ No customer ID found in URL or localStorage for Instagram');
    }
    
    return customerId;
  }

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
        version: 'v18.0'
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

  // Check if token is expired or about to expire (ENHANCED)
  const isTokenExpired = (account) => {
    // Backend handles token expiration
    return false;
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
      console.log('📨 Facebook login response for Instagram:', response.status);
      
      if (response.status === 'connected') {
        setIsSignedIn(true);
        setError(null);
        const accessToken = response.authResponse.accessToken;
        const expiresIn = response.authResponse.expiresIn || (2 * 60 * 60); // Default 2 hours
        
        console.log('✅ Instagram Facebook login successful, token expires in:', Math.round(expiresIn / 60), 'minutes');
        console.log('🔄 CRITICAL: Exchanging for long-lived token (60 days)...');
        
        // 🔥 CRITICAL: Exchange for long-lived user token IMMEDIATELY
        requestLongLivedToken(accessToken).then((longLivedData) => {
          const finalToken = longLivedData?.token || accessToken;
          const finalExpiresIn = longLivedData?.expiresIn || expiresIn;
          
          setUserAccessToken(finalToken);
          
          if (longLivedData?.token) {
            console.log('✅ Using long-lived user token for Instagram (expires in', Math.floor(finalExpiresIn / 86400), 'days)');
          } else {
            console.warn('⚠️ Using short-lived token for Instagram - will expire in', Math.round(finalExpiresIn / 60), 'minutes');
            setError('Warning: Using short-lived token (expires in 1-2 hours). Long-lived token exchange failed.');
          }
          
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
      console.log('🔄 Requesting long-lived user token for Instagram...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/facebook/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortLivedToken: shortLivedToken,
          clientId: FACEBOOK_APP_ID
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.longLivedToken) {
        console.log('✅ Received long-lived user token for Instagram');
        console.log('🕐 User token expires in:', Math.round(data.expiresIn / (24 * 60 * 60)), 'days');
        return {
          token: data.longLivedToken,
          expiresIn: data.expiresIn || 5183999, // ~60 days
          tokenType: 'long_lived_user'
        };
      } else {
        console.error('❌ Failed to get long-lived user token for Instagram:', data.error);
        setError('Warning: Using short-lived token (expires in 1-2 hours). Long-lived token exchange failed.');
        return null;
      }
    } catch (error) {
      console.error('❌ Error requesting long-lived user token for Instagram:', error);
      setError('Warning: Using short-lived token. Network error during token exchange.');
      return null;
    }
  };

  const loadAvailableAccounts = async (accessToken) => {
    setLoadingAccounts(true);
    
    try {
      // FIXED: Use direct Graph API to avoid SDK session conflicts
      const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,instagram_business_account,access_token&access_token=${accessToken}`;
      const response = await fetch(pagesUrl);
      const data = await response.json();
      
      if (data.error) {
        setLoadingAccounts(false);
        handleApiError(data.error);
        return;
      }

      const pagesWithInstagram = (data.data || []).filter(page => page.instagram_business_account);
      
      if (pagesWithInstagram.length === 0) {
        setLoadingAccounts(false);
        setError('No Instagram Business accounts found. To connect Instagram: 1) Convert to Business account in Instagram app, 2) Connect it to a Facebook page you manage.');
        return;
      }

      // 🔥 CRITICAL: Exchange each page token for long-lived version (60 days)
      console.log('🔄 Exchanging page tokens for long-lived versions...');
      const accountsWithLongLivedTokens = await Promise.all(pagesWithInstagram.map(async (page) => {
        let finalPageToken = page.access_token;
        let tokenExpiresIn = 3600; // Default 1 hour
        const hasValidPageToken = !!(page.access_token && page.access_token !== accessToken);
        
        // Exchange page token for long-lived version
        if (hasValidPageToken) {
          try {
            const exchangeResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/facebook/exchange-token`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                shortLivedToken: page.access_token,
                clientId: FACEBOOK_APP_ID
              })
            });
            
            const exchangeData = await exchangeResponse.json();
            
            if (exchangeData.success && exchangeData.longLivedToken) {
              finalPageToken = exchangeData.longLivedToken;
              tokenExpiresIn = exchangeData.expiresIn || 5183999; // ~60 days
              console.log(`✅ Long-lived page token obtained for ${page.name} (expires in ${Math.floor(tokenExpiresIn / 86400)} days)`);
            } else {
              console.warn(`⚠️ Could not exchange page token for ${page.name}, using original token`);
            }
          } catch (exchangeError) {
            console.warn(`⚠️ Failed to exchange page token for ${page.name}:`, exchangeError.message);
          }
        }
        
        return {
          id: page.instagram_business_account.id,
          pageId: page.id,
          pageName: page.name,
          pageAccessToken: finalPageToken, // ✅ Now using long-lived page token
          userAccessToken: accessToken,
          connected: false,
          profile: null,
          media: [],
          hasValidPageToken,
          tokenType: 'long_lived_page',
          tokenExpiresIn: tokenExpiresIn,
          tokenExpiresAt: new Date(Date.now() + (tokenExpiresIn * 1000)).toISOString(),
          tokenValidatedAt: new Date().toISOString(),
          tokenWarning: !hasValidPageToken ? 'Page token is same as user token - refresh may not work' : null
        };
      }));

      // Filter out accounts that are already connected
      const availableAccountsFiltered = accountsWithLongLivedTokens.filter(acc => 
        !connectedAccounts.some(connected => connected.id === acc.id)
      );

      console.log(`✅ Found ${availableAccountsFiltered.length} available Instagram accounts with long-lived tokens`);
      setAvailableAccounts(availableAccountsFiltered);
      setLoadingAccounts(false);
    } catch (error) {
      console.error('❌ Error loading Instagram accounts:', error);
      setLoadingAccounts(false);
      setError('Failed to load Instagram accounts. Please try again.');
    }
  };

  // Enhanced connectInstagramAccount with better persistence and snapshot storage
  // FIXED: Use direct Graph API to avoid SDK session conflicts
  const connectInstagramAccount = async (accountData) => {
    setLoading(true);
    
    try {
      if (!accountData.pageAccessToken) {
        setError('This Instagram account cannot be connected because the Facebook page does not have a proper page access token. Please ensure you have admin access to the Facebook page and try reconnecting your Facebook account.');
        setLoading(false);
        return;
      }

      console.log('✅ Valid page access token found, proceeding with Instagram connection...');
      
      // FIXED: Fetch Instagram profile info using direct Graph API
      const profileUrl = `https://graph.facebook.com/v18.0/${accountData.id}?fields=id,username,media_count,profile_picture_url,biography,website,followers_count&access_token=${accountData.pageAccessToken}`;
      const profileResponse = await fetch(profileUrl);
      const profileData = await profileResponse.json();
      
      if (profileData.error) {
        handleApiError(profileData.error);
        setLoading(false);
        return;
      }

      // FIXED: Fetch recent media using direct Graph API
      const mediaUrl = `https://graph.facebook.com/v18.0/${accountData.id}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${accountData.pageAccessToken}`;
      const mediaResponse = await fetch(mediaUrl);
      const mediaData = await mediaResponse.json();
      
      const newAccount = {
        ...accountData,
        connected: true,
        profile: profileData,
        media: mediaData.data || [],
        connectedAt: new Date().toISOString(),
        userAccessToken: userAccessToken,
        pageAccessToken: accountData.pageAccessToken,
        tokenType: accountData.tokenType || 'long_lived_page',
        tokenExpiresIn: accountData.tokenExpiresIn || 5183999, // ~60 days
        tokenExpiresAt: accountData.tokenExpiresAt || new Date(Date.now() + (5183999 * 1000)).toISOString(),
        tokenValidatedAt: accountData.tokenValidatedAt || new Date().toISOString(),
        lastTokenValidation: new Date().toISOString()
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
      await storeCustomerSocialAccount(newAccount);

      // Store initial historical snapshot
      const media = mediaData.data || [];
      const totalLikes = media.reduce((sum, m) => sum + (m.like_count || 0), 0);
      const totalComments = media.reduce((sum, m) => sum + (m.comments_count || 0), 0);
      const photosCount = media.filter(m => m.media_type === 'IMAGE').length;
      const videosCount = media.filter(m => m.media_type === 'VIDEO').length;

      await storeHistoricalSnapshot(newAccount.id, profileData.username, {
        followersCount: profileData.followers_count,
        mediaCount: profileData.media_count,
        totalLikes,
        totalComments,
        postsCount: media.length,
        photosCount,
        videosCount
      });

      // Remove from available accounts
      setAvailableAccounts(prev => prev.filter(acc => acc.id !== accountData.id));
      setLoading(false);
      setError(null);
      
      console.log('✅ Instagram account connected successfully:', profileData.username);
    } catch (err) {
      console.error('❌ Failed to connect Instagram account:', err);
      setError(`Failed to connect Instagram account: ${err.message}`);
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

  // Remove account: FIXED - Add confirmation and ensure backend deletion
  const removeAccount = async (accountId) => {
    // FIXED: Ask for confirmation before disconnecting
    const account = connectedAccounts.find(acc => acc.id === accountId);
    const accountName = account?.profile?.username || account?.username || 'this account';
    
    if (!window.confirm(`Are you sure you want to disconnect @${accountName}? This will remove all stored data for this account.`)) {
      return; // User cancelled
    }
    
    const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
    setConnectedAccounts(updatedAccounts);
    saveAccountsToStorage(updatedAccounts);

    // FIXED: Remove from backend using correct endpoint
    const customerId = getCurrentCustomerId();
    if (customerId) {
      try {
        // Find backend account _id by platformUserId
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          const backendAcc = data.accounts.find(acc => acc.platformUserId === accountId && acc.platform === 'instagram');
          if (backendAcc && backendAcc._id) {
            const deleteRes = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${backendAcc._id}`, {
              method: 'DELETE'
            });
            const deleteData = await deleteRes.json();
            console.log('✅ Instagram account deleted from backend:', deleteData);
          }
        }
      } catch (err) {
        console.error('❌ Failed to remove Instagram account from backend:', err);
        alert('Warning: Account disconnected locally but may still exist in database. Please contact support if issues persist.');
      }
    }

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

  // Enhanced handleSignOut - FIXED: Add confirmation
  const handleSignOut = async () => {
    // FIXED: Ask for confirmation before disconnecting all accounts
    if (connectedAccounts.length > 0) {
      const accountNames = connectedAccounts.map(acc => `@${acc.profile?.username || acc.username || 'Unknown'}`).join(', ');
      if (!window.confirm(`Are you sure you want to disconnect ALL Instagram accounts (${connectedAccounts.length} accounts: ${accountNames})? This will remove all stored data.`)) {
        return; // User cancelled
      }
    }
    
    console.log('🔄 Signing out from Instagram integration...');
    
    // FIXED: Delete all accounts from backend
    const customerId = getCurrentCustomerId();
    if (customerId) {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          const instagramAccounts = data.accounts.filter(acc => acc.platform === 'instagram');
          // Delete each Instagram account
          for (const acc of instagramAccounts) {
            try {
              await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${acc._id}`, {
                method: 'DELETE'
              });
              console.log('✅ Deleted Instagram account from backend:', acc.platformUserId);
            } catch (err) {
              console.error('❌ Failed to delete account:', acc.platformUserId, err);
            }
          }
        }
      } catch (err) {
        console.error('❌ Failed to remove Instagram accounts from backend:', err);
        alert('Warning: Accounts disconnected locally but may still exist in database. Please contact support if issues persist.');
      }
    }
    
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
      // 🔥 CRITICAL FIX: Use the correct customer ID detection
      const customerId = getCurrentCustomerId();
      
      // Log what we found for debugging
      console.log('🔍 Instagram Customer ID search for social account storage:', {
        customerId,
        found: !!customerId,
        urlCustomerId: new URLSearchParams(window.location.search).get('customerId') || 
                       new URLSearchParams(window.location.hash.split('?')[1] || '').get('customerId'),
        localStorageUser: JSON.parse(localStorage.getItem('currentUser') || '{}')
      });
      
      if (!customerId) {
        console.error('❌ No customer ID found for Instagram, cannot store social account');
        alert('Error: No customer ID found. Please make sure you accessed this page through the proper configuration link.');
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
        customerId: customerId, // 🔥 Use the correctly detected customer ID
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
          tokenType: account.tokenType || 'long_lived_page',
          tokenExpiresIn: account.tokenExpiresIn || 5183999,
          tokenExpiresAt: account.tokenExpiresAt || new Date(Date.now() + (5183999 * 1000)).toISOString(),
          tokenValidatedAt: account.tokenValidatedAt || new Date().toISOString(),
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

      // ✅ Log comprehensive token validation status with customer ID
      console.log('🔑 Instagram Token Validation Summary:', {
        customerId,
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
        console.log('✅ Stored Instagram account for scheduling with customer ID:', customerId);
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

  // FIXED: Use direct Graph API for refresh
  const refreshAccountData = async (accountId) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (!account) return;

    setLoading(true);

    try {
      // Refresh profile using direct Graph API
      const profileUrl = `https://graph.facebook.com/v18.0/${accountId}?fields=id,username,media_count,profile_picture_url,biography,website,followers_count&access_token=${account.pageAccessToken}`;
      const profileResponse = await fetch(profileUrl);
      const profileData = await profileResponse.json();
      
      if (profileData.error) {
        handleApiError(profileData.error);
        setLoading(false);
        return;
      }

      // Refresh media using direct Graph API
      const mediaUrl = `https://graph.facebook.com/v18.0/${accountId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${account.pageAccessToken}`;
      const mediaResponse = await fetch(mediaUrl);
      const mediaData = await mediaResponse.json();
      
      const updatedAccounts = connectedAccounts.map(acc => 
        acc.id === accountId 
          ? { 
              ...acc, 
              profile: profileData, 
              media: mediaData.data || [],
              lastRefreshed: new Date().toISOString(),
              lastTokenValidation: new Date().toISOString()
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

      // Store updated historical snapshot
      const media = mediaData.data || [];
      const totalLikes = media.reduce((sum, m) => sum + (m.like_count || 0), 0);
      const totalComments = media.reduce((sum, m) => sum + (m.comments_count || 0), 0);
      const photosCount = media.filter(m => m.media_type === 'IMAGE').length;
      const videosCount = media.filter(m => m.media_type === 'VIDEO').length;

      await storeHistoricalSnapshot(accountId, profileData.username, {
        followersCount: profileData.followers_count,
        mediaCount: profileData.media_count,
        totalLikes,
        totalComments,
        postsCount: media.length,
        photosCount,
        videosCount
      });
      
      setLoading(false);
      console.log('✅ Instagram account refreshed:', profileData.username);
    } catch (error) {
      console.error('❌ Failed to refresh account:', error);
      setError(`Failed to refresh account: ${error.message}`);
      setLoading(false);
    }
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

  // --- AUTO-FETCH ANALYTICS LOGIC ---
  useEffect(() => {
    const lastFetch = localStorage.getItem('ig_analytics_last_fetch');
    const now = Date.now();
    if (!lastFetch || now - parseInt(lastFetch, 10) > 24 * 60 * 60 * 1000) {
      // Fetch analytics for all connected accounts
      connectedAccounts.forEach(acc => {
        if (acc.media && acc.media.length > 0) {
          generateMediaBasedAnalytics(acc);
        }
      });
      localStorage.setItem('ig_analytics_last_fetch', now.toString());
    }
  }, [connectedAccounts]);

  // Generate trend data for post analytics
  const generatePostTrendData = (metricValue, metricType) => {
    // Generate simulated trend data showing engagement growth over time
    // In production, this would fetch actual historical data from the API
    const dataPoints = 10;
    const trendData = [];
    
    for (let i = 0; i < dataPoints; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (dataPoints - 1 - i));
      
      // Simulate realistic growth curve (most engagement in first few days)
      let progressFactor;
      if (i <= 3) {
        progressFactor = (i / 3) * 0.7; // 0-70% in first 3 days
      } else if (i <= 7) {
        progressFactor = 0.7 + ((i - 3) / 4) * 0.25; // 70-95% in next 4 days
      } else {
        progressFactor = 0.95 + ((i - 7) / 3) * 0.05; // 95-100% in remaining days
      }
      
      // Add slight random variation
      const variation = (Math.random() - 0.5) * 0.03;
      progressFactor = Math.max(0, Math.min(1, progressFactor + variation));
      
      trendData.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(metricValue * progressFactor)
      });
    }
    
    return trendData;
  };

  // --- SINGLE POST ANALYTICS LOGIC ---
  const fetchSinglePostAnalytics = (post) => {
    if (!post) return;
    setSelectedPostId(post.id);
    
    // Create comprehensive analytics data similar to Facebook
    const analytics = {
      id: post.id,
      caption: post.caption || 'No caption',
      timestamp: post.timestamp,
      permalink: post.permalink,
      media_url: post.media_url,
      thumbnail_url: post.thumbnail_url,
      media_type: post.media_type,
      likes_count: post.like_count || 0,
      comments_count: post.comments_count || 0,
      total_engagement: (post.like_count || 0) + (post.comments_count || 0),
      engagement_rate: 0 // Will be calculated if we have follower count
    };
    
    setSinglePostAnalytics(analytics);
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
        
        <div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          style={{ minWidth: 300, minHeight: 250 }} // <-- Ensure chart container has size
        >
          {analyticsData.followers.length > 0 && (
            <TrendChart
              data={analyticsData.followers}
              title="Follower Growth"
              color="#E4405F"
              metric="value"
              style={{ minHeight: 250 }} // <-- Chart minHeight
            />
          )}
          
          {analyticsData.impressions.length > 0 && (
            <TrendChart
              data={analyticsData.impressions}
              title="Daily Impressions"
              color="#C13584"
              metric="value"
              style={{ minHeight: 250 }}
            />
          )}
          
          {analyticsData.reach.length > 0 && (
            <TrendChart
              data={analyticsData.reach}
              title="Daily Reach"
              color="#F56040"
              metric="value"
              style={{ minHeight: 250 }}
            />
          )}
          
          {analyticsData.posts.length > 0 && (
            <TrendChart
              data={analyticsData.posts}
              title="Posts per Day"
              color="#FF6B9D"
              metric="value"
              style={{ minHeight: 250 }}
            />
          )}
        </div>
      </div>
    );
  };

  // Add UI for single post analytics
  const renderSinglePostAnalytics = () => {
    if (!selectedPostId || !singlePostAnalytics) return null;

    return (
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-pink-600" />
            Post Analytics
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
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              {(singlePostAnalytics.thumbnail_url || singlePostAnalytics.media_url) && (
                <img
                  src={singlePostAnalytics.thumbnail_url || singlePostAnalytics.media_url}
                  alt="Post media"
                  className="w-20 h-20 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-pink-600 bg-pink-100 px-2 py-1 rounded font-medium">
                    {singlePostAnalytics.media_type}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(singlePostAnalytics.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-800 mb-2">
                  {singlePostAnalytics.caption?.length > 150 
                    ? `${singlePostAnalytics.caption.substring(0, 150)}...` 
                    : singlePostAnalytics.caption
                  }
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Instagram Post</span>
                  {singlePostAnalytics.permalink && (
                    <a 
                      href={singlePostAnalytics.permalink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-pink-600 hover:text-pink-700"
                    >
                      View Post →
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Engagement Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-pink-600">
                {singlePostAnalytics.likes_count?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-pink-700 font-medium flex items-center justify-center mt-1">
                <span className="mr-1">❤️</span>
                Likes
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {singlePostAnalytics.comments_count?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-purple-700 font-medium flex items-center justify-center mt-1">
                <span className="mr-1">💬</span>
                Comments
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center col-span-2 lg:col-span-1">
              <div className="text-2xl font-bold text-indigo-600">
                {singlePostAnalytics.total_engagement?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-indigo-700 font-medium flex items-center justify-center mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                Total Engagement
              </div>
              <div className="text-xs text-indigo-600 mt-1">
                Likes + Comments
              </div>
            </div>
          </div>

          {/* Engagement Trend Charts */}
          <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-xl p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-pink-600" />
              Engagement Over Time
            </h4>
            <p className="text-xs text-gray-600 mb-4">Estimated engagement growth pattern since posting</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Likes Trend */}
              <div className="bg-white rounded-lg p-4 border border-pink-100">
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
                      Likes Trend
                    </span>
                    <span className="text-lg font-bold text-pink-600">
                      {singlePostAnalytics.likes_count?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Avg: {Math.round(singlePostAnalytics.likes_count / 10)}</div>
                </div>
                <TrendChart
                  data={generatePostTrendData(singlePostAnalytics.likes_count, 'likes')}
                  title=""
                  color="#EC4899"
                  metric="value"
                  style={{ minHeight: 150 }}
                />
              </div>

              {/* Comments Trend */}
              <div className="bg-white rounded-lg p-4 border border-purple-100">
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 flex items-center">
                      <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
                      Comments Trend
                    </span>
                    <span className="text-lg font-bold text-purple-600">
                      {singlePostAnalytics.comments_count?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Avg: {Math.round(singlePostAnalytics.comments_count / 10)}</div>
                </div>
                <TrendChart
                  data={generatePostTrendData(singlePostAnalytics.comments_count, 'comments')}
                  title=""
                  color="#8B5CF6"
                  metric="value"
                  style={{ minHeight: 150 }}
                />
              </div>
            </div>
          </div>

          {/* Engagement Breakdown Chart */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h4 className="font-medium text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Engagement Breakdown
            </h4>
            <div className="space-y-3">
              {/* Likes Bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">❤️ Likes</span>
                  <span className="text-pink-600 font-semibold">
                    {singlePostAnalytics.likes_count?.toLocaleString() || 0}
                    {singlePostAnalytics.total_engagement > 0 && (
                      <span className="text-gray-500 ml-1">
                        ({((singlePostAnalytics.likes_count / singlePostAnalytics.total_engagement) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-pink-500 h-2 rounded-full" 
                    style={{ 
                      width: singlePostAnalytics.total_engagement > 0 
                        ? `${(singlePostAnalytics.likes_count / singlePostAnalytics.total_engagement) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>

              {/* Comments Bar */}
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">💬 Comments</span>
                  <span className="text-purple-600 font-semibold">
                    {singlePostAnalytics.comments_count?.toLocaleString() || 0}
                    {singlePostAnalytics.total_engagement > 0 && (
                      <span className="text-gray-500 ml-1">
                        ({((singlePostAnalytics.comments_count / singlePostAnalytics.total_engagement) * 100).toFixed(1)}%)
                      </span>
                    )}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-500 h-2 rounded-full" 
                    style={{ 
                      width: singlePostAnalytics.total_engagement > 0 
                        ? `${(singlePostAnalytics.comments_count / singlePostAnalytics.total_engagement) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div className="mt-6 p-4 bg-pink-50 border border-pink-200 rounded-lg">
              <h5 className="font-medium text-pink-800 mb-2">📊 Performance Insights</h5>
              <div className="text-sm text-pink-700 space-y-1">
                <p>
                  <strong>Engagement Rate:</strong> {singlePostAnalytics.total_engagement > 0 ? 'Good engagement' : 'Low engagement'} 
                  {singlePostAnalytics.total_engagement > 50 && ' - High performing post! 🔥'}
                </p>
                <p>
                  <strong>Most Popular:</strong> {
                    singlePostAnalytics.likes_count >= singlePostAnalytics.comments_count ? 'Likes' : 'Comments'
                  }
                </p>
                <p>
                  <strong>Content Type:</strong> {
                    singlePostAnalytics.media_type === 'VIDEO' ? 'Video content' :
                    singlePostAnalytics.media_type === 'IMAGE' ? 'Image content' :
                    singlePostAnalytics.media_type === 'CAROUSEL_ALBUM' ? 'Carousel content' :
                    'Mixed content'
                  } - {
                    singlePostAnalytics.media_type === 'VIDEO' ? 'Video posts typically get higher engagement!' :
                    singlePostAnalytics.media_type === 'CAROUSEL_ALBUM' ? 'Carousel posts often perform well!' :
                    'Great visual content!'
                  }
                </p>
                <p>
                  <strong>Engagement Quality:</strong> {
                    singlePostAnalytics.total_engagement > 0 ?
                      (singlePostAnalytics.comments_count / singlePostAnalytics.total_engagement > 0.3 ? 
                        'High-quality engagement (lots of comments)' : 
                        'Standard engagement pattern') :
                      'Consider using more engaging content'
                  }
                </p>
              </div>
            </div>
          </div>
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
              <p>📊 <strong>Historical Data:</strong> Automatically captured daily</p>
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
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-3">
            <h5 className="font-medium text-yellow-800 text-sm mb-1">Why does this happen?</h5>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Facebook tokens expire after 1-2 hours by default</li>
              <li>• Long-lived tokens last 60 days but need proper exchange</li>
              <li>• App permissions may have been revoked</li>
              <li>• Network issues during token refresh</li>
            </ul>
          </div>
        )}
        
        <div className="space-y-2">
          {isTokenError && (
            <div className="flex space-x-2">
              <button
                onClick={refreshAccountTokens}
                disabled={loading}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                🔄 Refresh Tokens
              </button>
              <button
                onClick={() => {
                  setError(null);
                  handleSignIn(); // Re-login to get fresh tokens
                }}
                disabled={loading}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 flex items-center space-x-2"
              >
                <Instagram className="h-4 w-4" />
                <span>Reconnect Instagram</span>
              </button>
            </div>
          )}
        </div>
        
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
            onClick={handleSignIn}
            disabled={loading || !fbSdkLoaded}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{loading ? 'Connecting...' : 'Add Account'}</span>
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
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-2 sm:p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
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
            <div className="flex flex-wrap space-x-2">
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
              <button
                onClick={() => storeHistoricalSnapshot(activeAccount.id, activeAccount.profile?.username || 'Unknown', {
                  followersCount: activeAccount.profile?.followers_count,
                  mediaCount: activeAccount.profile?.media_count,
                  totalLikes: activeAccount.media?.reduce((sum, m) => sum + (m.like_count || 0), 0) || 0,
                  totalComments: activeAccount.media?.reduce((sum, m) => sum + (m.comments_count || 0), 0) || 0,
                  postsCount: activeAccount.media?.length || 0
                })}
                className="flex items-center space-x-2 px-3 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Capture</span>
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 text-center mb-6">
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

          {/* Historical Charts Toggle */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-lg border border-gray-200 p-4 gap-2">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-pink-600" />
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
                className="flex items-center space-x-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors text-sm"
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
            <div className="overflow-x-auto">
              <TimePeriodChart
                platform="instagram"
                accountId={activeAccount.id}
                title="Instagram Historical Analytics"
                defaultMetric="followers"
              />
            </div>
          )}
        </div>
      )}

      {/* Show recent posts for active account */}
      {activeAccount && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-2 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Posts ({activeAccount.media?.length || 0})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
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
                  <button
                    className="text-xs text-purple-600 mt-2"
                    onClick={() => {
                      setSelectedPostId(media.id);
                      fetchSinglePostAnalytics(media);
                    }}
                  >
                    Show Analytics
                  </button>
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

      {renderSinglePostAnalytics()}
    </div>
  );

  // Helper to fetch and store followers count for each IG account
  const fetchAndStoreFollowersTimeline = async () => {
    if (!connectedAccounts || connectedAccounts.length === 0) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const updatedTimeline = { ...followersTimeline };

    for (const acc of connectedAccounts) {
      const timeline = updatedTimeline[acc.id] || [];
      const lastEntry = timeline.length > 0 ? timeline[timeline.length - 1] : null;
      const lastDate = lastEntry ? lastEntry.date : null;
      const daysSinceLast = lastDate ? (new Date(today) - new Date(lastDate)) / (1000 * 60 * 60 * 24) : 999;

      if (daysSinceLast >= 1 && acc.pageAccessToken) {
        window.FB.api(
          `/${acc.id}`,
          { fields: 'followers_count', access_token: acc.pageAccessToken },
          function(response) {
            if (response && response.followers_count !== undefined) {
              const newTimeline = [...timeline, { date: today, value: response.followers_count }];
              updatedTimeline[acc.id] = newTimeline;
              setFollowersTimeline({ ...updatedTimeline });
              setUserData(`ig_followers_timeline_${acc.id}`, newTimeline);
            }
          }
        );
      }
    }
  };

  // Load timeline series on mount
  useEffect(() => {
    if (connectedAccounts && connectedAccounts.length > 0) {
      const loaded = {};
      connectedAccounts.forEach(acc => {
        loaded[acc.id] = getUserData(`ig_followers_timeline_${acc.id}`) || [];
      });
      setFollowersTimeline(loaded);
      fetchAndStoreFollowersTimeline();
    }
  }, [connectedAccounts]);

  // Render followers timeline chart for each account
  const renderFollowersTrendChart = (accountId) => {
    const timeline = followersTimeline[accountId] || [];
    if (timeline.length === 0) return null;
    return (
      <div style={{ minWidth: 300, minHeight: 200 }}>
        <TrendChart
          data={timeline}
          title="Followers Timeline"
          color="#E4405F"
          metric="value"
          style={{ minHeight: 200 }}
        />
      </div>
    );
  };

  useEffect(() => {
    if (onData && activeAccount) {
      // Pass the active account object to parent
      onData(activeAccount);
    }
  }, [activeAccount, onData]);

  // Notify parent about connection status
  useEffect(() => {
    if (onConnectionStatusChange) {
      // Connected if at least one account and not expired
      const isConnected = connectedAccounts.length > 0 && !connectedAccounts.some(isTokenExpired);
      onConnectionStatusChange(isConnected);
    }
  }, [connectedAccounts, activeAccount, fbSdkLoaded]);

  if (!fbSdkLoaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Instagram className="h-8 w-8 text-pink-600" />
              <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Instagram Integration</span>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
          <div className="bg-white rounded-lg shadow-md p-2 sm:p-4 md:p-6">
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
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Instagram className="h-8 w-8 text-pink-600" />
            <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Instagram Integration</span>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-lg shadow-md p-2 sm:p-4 md:p-6">
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
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
                <h4 className="font-medium text-blue-800 mb-2">📱 Multi-Account Setup Guide</h4>
                <div className="text-sm text-blue-700 text-left space-y-1">
                  <p>1. Convert Instagram accounts to Business/Creator accounts</p>
                  <p>2. Connect each account to a Facebook page you manage</p>
                  <p>3. Click "Connect" below and log in to Facebook</p>
                  <p>4. Grant permissions to access all your connected accounts</p>
                  <p>5. Select which accounts to connect and manage</p>
                  <p>6. Historical data will be captured automatically</p>
                </div>
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
                Connect multiple Instagram Business accounts through Facebook. Manage all your accounts from one dashboard with historical data tracking!
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
                <h4 className="font-medium text-blue-800 mb-2">📱 Multi-Account Setup Guide</h4>
                <div className="text-sm text-blue-700 text-left space-y-1">
                  <p>1. Convert Instagram accounts to Business/Creator accounts</p>
                  <p>2. Connect each account to a Facebook page you manage</p>
                  <p>3. Click "Connect" below and log in to Facebook</p>
                  <p>4. Grant permissions to access all your connected accounts</p>
                  <p>5. Select which accounts to connect and manage</p>
                  <p>6. Historical data will be captured automatically</p>
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
