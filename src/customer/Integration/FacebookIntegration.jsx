import React, { useState, useEffect } from 'react';
import {
  Facebook, BarChart3, Trash2, TrendingUp, Plus, Users, UserCheck, ExternalLink, Loader2, Calendar, RefreshCw
} from 'lucide-react';
import TimePeriodChart from '../../components/TimeperiodChart';
import TrendChart from '../../components/TrendChart';
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

  // Post upload modal state - REMOVED (no longer needed)

  // Show/Hide Facebook posts state
  const [showFacebookPosts, setShowFacebookPosts] = useState({});

  // Historical charts toggle state
  const [showHistoricalCharts, setShowHistoricalCharts] = useState({});

  // Post-level analytics state (similar to Instagram)
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [singlePostAnalytics, setSinglePostAnalytics] = useState(null);

  // Analytics data state for charts
  const [analyticsData, setAnalyticsData] = useState({});

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

    // --- FIXED: Use Graph API directly instead of SDK to avoid session conflicts ---
    async function hydrateFacebookAccounts(accounts) {
      // IMPORTANT: Don't use FB SDK for validation when multiple accounts exist
      // The SDK only maintains one session at a time, causing other accounts to appear expired
      console.log('🔄 Hydrating accounts using direct Graph API calls...');
      
      return await Promise.all(accounts.map(async (acc) => {
        try {
          // Use direct Graph API fetch instead of FB.api to avoid SDK session conflicts
          const profileUrl = `https://graph.facebook.com/v18.0/me?fields=id,name,email,picture&access_token=${acc.accessToken}`;
          const profileResponse = await fetch(profileUrl);
          const profileData = await profileResponse.json();
          
          // Check for API errors
          if (profileData.error) {
            console.warn(`⚠️ Token validation failed for ${acc.name}:`, profileData.error.message);
            // Only mark as needing reconnection if error code is 190 (token expired)
            if (profileData.error.code === 190) {
              return {
                ...acc,
                needsReconnection: true,
                lastError: profileData.error
              };
            }
            // For other errors, keep the account as-is
            return acc;
          }
          
          // Fetch pages using direct API
          const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category,about,fan_count,link,picture,username,website,phone,verification_status&access_token=${acc.accessToken}`;
          const pagesResponse = await fetch(pagesUrl);
          const pagesData = await pagesResponse.json();
          
          return {
            ...acc,
            name: profileData.name || acc.name,
            email: profileData.email || acc.email,
            picture: profileData.picture || acc.picture,
            pages: pagesData.data || acc.pages,
            needsReconnection: false,
            lastTokenValidation: new Date().toISOString()
          };
        } catch (error) {
          console.warn(`⚠️ Hydration failed for ${acc.name}:`, error.message);
          // Keep account as-is if hydration fails
          return acc;
        }
      }));
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
        console.log(`📥 Loaded ${backendAccounts.length} Facebook accounts from backend`);
        
        // CRITICAL FIX: For multiple accounts, NEVER use FB SDK for validation
        // The SDK can only handle one session at a time, causing other accounts to appear invalid
        // Instead, trust the backend data and only validate when explicitly requested
        
        if (backendAccounts.length > 1) {
          console.log('✅ Multiple accounts detected - using backend data directly (no SDK validation)');
          const deduped = dedupeAccounts(backendAccounts);
          setConnectedAccounts(deduped);
          setUserData('fb_connected_accounts', deduped);
          setActiveAccountId(deduped[0].id);
          setActiveAccount(deduped[0]);
          setUserData('fb_active_account_id', deduped[0].id);
          return;
        }
        
        // For single account, validate if needed (using Graph API, not SDK)
        const account = backendAccounts[0];
        const needsValidation = !account.lastTokenValidation || 
          new Date(account.lastTokenValidation) < new Date(Date.now() - 30 * 60 * 1000); // 30 minutes
        
        if (needsValidation) {
          console.log('🔄 Single account - validating token via Graph API...');
          const validated = await hydrateFacebookAccounts(backendAccounts);
          const deduped = dedupeAccounts(validated);
          setConnectedAccounts(deduped);
          setUserData('fb_connected_accounts', deduped);
          setActiveAccountId(deduped[0].id);
          setActiveAccount(deduped[0]);
          setUserData('fb_active_account_id', deduped[0].id);
        } else {
          console.log('✅ Single account - token recently validated, using backend data');
          const deduped = dedupeAccounts(backendAccounts);
          setConnectedAccounts(deduped);
          setUserData('fb_connected_accounts', deduped);
          setActiveAccountId(deduped[0].id);
          setActiveAccount(deduped[0]);
          setUserData('fb_active_account_id', deduped[0].id);
        }
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
      // CRITICAL FIX: Load pages from backend first (customer-specific)
      loadPagesFromBackend();
    }
  }, [activeAccount, fbSdkLoaded]);
  
  // Auto-upgrade to never-expiring tokens for existing accounts
  useEffect(() => {
    const upgradeToNeverExpiringTokens = async () => {
      if (!activeAccount || !fbSdkLoaded || !isFacebookApiReady()) return;
      
      // Check if we need to upgrade (only if pages exist but don't have never-expiring tokens)
      if (fbPages.length > 0 && !fbPages.some(p => p.tokenExpiry === 'never')) {
        console.log('🔄 Auto-upgrading to never-expiring page tokens...');
        await refreshPageTokens();
      }
    };
    
    // Run upgrade after a short delay to let pages load
    const timer = setTimeout(upgradeToNeverExpiringTokens, 2000);
    return () => clearTimeout(timer);
  }, [fbPages, activeAccount, fbSdkLoaded]);

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
        
        // ✅ NEW: Immediately get never-expiring page tokens
        console.log('🔄 Requesting never-expiring page tokens...');
        try {
          const pageTokenResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/facebook/page-tokens`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userAccessToken: data.longLivedToken,
              userId: account.id
            })
          });
          
          const pageTokenData = await pageTokenResponse.json();
          
          if (pageTokenData.success && pageTokenData.pages) {
            console.log(`✅ Got never-expiring tokens for ${pageTokenData.pages.length} pages`);
            updatedAccount.pages = pageTokenData.pages;
          }
        } catch (pageTokenError) {
          console.warn('⚠️ Failed to get never-expiring page tokens:', pageTokenError);
        }
        
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

  // Check if token is expired or about to expire (FIXED - matching Instagram logic)
  const isTokenExpired = (account) => {
    // CRITICAL: If account has never-expiring page tokens, it's NEVER expired
    if (account.pages && account.pages.some(p => p.tokenExpiry === 'never' || p.tokenType === 'never_expiring' || p.tokenType === 'never_expiring_page_token')) {
      console.log(`✅ Account ${account.name} has never-expiring tokens - never expired`);
      return false; // Never-expiring page tokens mean account is always valid
    }
    
    // CRITICAL: If account has long-lived tokens, trust them for longer
    if (account.tokenType === 'long_lived' || account.tokenType === 'long_lived_page') {
      // For long-lived tokens, only mark expired if tokenExpiresAt is actually in the past
      if (account.tokenExpiresAt) {
        const expiryTime = new Date(account.tokenExpiresAt);
        const now = new Date();
        const daysUntilExpiry = Math.floor((expiryTime.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        
        // Only mark expired if less than 3 days remaining (was 30 minutes)
        if (daysUntilExpiry < 3) {
          console.log(`⚠️ Long-lived token for ${account.name} expires in ${daysUntilExpiry} days`);
          return true;
        }
        console.log(`✅ Account ${account.name} has long-lived token valid for ${daysUntilExpiry} more days`);
        return false;
      }
      console.log(`✅ Account ${account.name} has long-lived tokens with no expiry set - not expired`);
      return false;
    }
    
    // If account has pages with valid tokens, trust them
    if (account.pages && account.pages.length > 0) {
      const hasValidPageTokens = account.pages.some(p => 
        p.access_token && 
        (p.tokenType === 'never_expiring' || p.tokenType === 'never_expiring_page_token' || p.tokenType === 'long_lived_page')
      );
      if (hasValidPageTokens) {
        console.log(`✅ Account ${account.name} has valid page tokens - not expired`);
        return false;
      }
    }
    
    // If no tokenExpiresAt, check if recently validated (like Instagram)
    if (!account.tokenExpiresAt) {
      // If recently validated (within last 3 hours), assume valid
      if (account.lastTokenValidation) {
        const lastValidation = new Date(account.lastTokenValidation);
        const threeHoursAgo = new Date(Date.now() - (3 * 60 * 60 * 1000));
        if (lastValidation > threeHoursAgo) {
          return false; // Recently validated, not expired
        }
      }
      // If no expiry and never validated, assume not expired (benefit of doubt)
      console.log(`✅ Account ${account.name} has no expiry date - assuming valid`);
      return false;
    }
    
    const expiryTime = new Date(account.tokenExpiresAt);
    const now = new Date();
    
    // FIXED: Use minimal buffer time for short-lived tokens only (5 minutes instead of 30)
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    const isActuallyExpired = (expiryTime.getTime() - now.getTime()) < bufferTime;
    
    if (isActuallyExpired) {
      const minutesUntilExpiry = Math.floor((expiryTime.getTime() - now.getTime()) / (60 * 1000));
      console.log(`⚠️ Token for ${account.name} expires in ${minutesUntilExpiry} minutes`);
    }
    
    return isActuallyExpired;
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
    if (!activeAccount || !activeAccount.accessToken) {
      console.error('❌ No active account or access token available');
      return false;
    }

    try {
      console.log('🔄 Refreshing Facebook session using Graph API...');
      
      // Use the backend token exchange endpoint to get a fresh long-lived token
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/facebook/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortLivedToken: activeAccount.accessToken,
          userId: activeAccount.id
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.longLivedToken) {
        console.log('✅ Successfully refreshed session token');
        
        const updatedAccount = {
          ...activeAccount,
          accessToken: data.longLivedToken,
          tokenExpiresAt: data.expiresIn ? 
            new Date(Date.now() + (data.expiresIn * 1000)).toISOString() : null,
          tokenType: data.tokenType || 'long_lived',
          lastTokenRefresh: new Date().toISOString()
        };
        
        setActiveAccount(updatedAccount);
        
        // Update in connectedAccounts
        const updatedAccounts = connectedAccounts.map(acc =>
          acc.id === activeAccount.id ? updatedAccount : acc
        );
        
        setConnectedAccounts(updatedAccounts);
        saveAccountsToStorage(updatedAccounts);
        
        // Also update in backend if customerId exists
        const customerId = getCurrentCustomerId();
        if (customerId) {
          try {
            await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                customerId: customerId,
                platform: 'facebook',
                platformUserId: updatedAccount.id,
                name: updatedAccount.name,
                email: updatedAccount.email,
                profilePicture: updatedAccount.picture?.data?.url,
                accessToken: updatedAccount.accessToken,
                tokenExpiresAt: updatedAccount.tokenExpiresAt,
                tokenType: updatedAccount.tokenType,
                lastTokenRefresh: updatedAccount.lastTokenRefresh
              })
            });
            console.log('✅ Updated token in backend database');
          } catch (err) {
            console.warn('⚠️ Failed to update token in backend:', err);
          }
        }
        
        return true;
      } else {
        console.error('❌ Failed to refresh token:', data.error || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('❌ Error refreshing session:', error);
      return false;
    }
  };

  // CRITICAL FIX: Load pages from backend (customer-specific selected pages)
  const loadPagesFromBackend = async () => {
    if (!activeAccount) {
      console.warn('⚠️ No active account');
      return;
    }
    
    const customerId = getCurrentCustomerId();
    if (!customerId) {
      console.warn('⚠️ No customer ID found, fetching all pages from Facebook');
      fetchFbPages();
      return;
    }
    
    try {
      console.log('📥 Loading pages from backend for customer:', customerId);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
      const data = await response.json();
      
      if (data.success && data.accounts) {
        // Find the Facebook account for this customer
        const fbAccount = data.accounts.find(acc => 
          acc.platform === 'facebook' && acc.platformUserId === activeAccount.id
        );
        
        if (fbAccount && fbAccount.pages && fbAccount.pages.length > 0) {
          console.log(`✅ Loaded ${fbAccount.pages.length} customer-specific pages from backend`);
          // Map backend pages to expected format
          const pages = fbAccount.pages.map(page => ({
            id: page.id,
            name: page.name,
            access_token: page.accessToken,
            category: page.category,
            fan_count: page.fanCount,
            tokenType: page.tokenType || 'standard',
            tokenExpiry: page.tokenExpiry || 'unknown',
            ...page
          }));
          setFbPages(pages);
          setFbError(null);
          return;
        }
      }
      
      // No backend data found, fetch from Facebook API
      console.log('📋 No customer-specific pages found in backend, fetching from Facebook API');
      fetchFbPages();
      
    } catch (error) {
      console.error('❌ Error loading pages from backend:', error);
      // Fallback to fetching from Facebook API
      fetchFbPages();
    }
  };

  // Modified fetchFbPages with error handling (FIXED - don't preemptively block on expiration)
  const fetchFbPages = async () => {
    if (!activeAccount) {
      console.warn('⚠️ No active account');
      return;
    }
    
    // FIXED: Don't check token expiration before making API calls
    // The backend token might be valid even if our local check thinks it's expired
    // Only handle actual API errors (code 190) when they occur
    console.log('🔍 Fetching ALL pages from Facebook API...');
    
    try {
      // Use direct Graph API call instead of FB.api to avoid SDK session conflicts
      const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,category,about,fan_count,link,picture,username,website,phone,verification_status&access_token=${activeAccount.accessToken}`;
      const response = await fetch(pagesUrl);
      const data = await response.json();
      
      if (data.error) {
        handleApiError(data.error);
        console.error('❌ Failed to fetch pages:', data.error);
        return;
      }
      
      console.log('✅ Fetched pages successfully:', data.data.length);
      
      // ✅ Convert page tokens to never-expiring tokens
      console.log('🔄 Converting to never-expiring page tokens...');
      try {
        const pageTokenResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/facebook/page-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAccessToken: activeAccount.accessToken,
            userId: activeAccount.id
          })
        });
        
        const pageTokenData = await pageTokenResponse.json();
        
        if (pageTokenData.success && pageTokenData.pages) {
          console.log(`✅ Got never-expiring tokens for ${pageTokenData.pages.length} pages`);
          // Merge the never-expiring tokens with page data
          const pagesWithNeverExpiringTokens = data.data.map(page => {
            const neverExpiringPage = pageTokenData.pages.find(p => p.id === page.id);
            if (neverExpiringPage) {
              return {
                ...page,
                access_token: neverExpiringPage.access_token,
                tokenType: 'never_expiring',
                tokenExpiry: 'never'
              };
            }
            return page;
          });
          setFbPages(pagesWithNeverExpiringTokens);
          
          // CRITICAL FIX: Store all pages at once for this customer
          await storeAllPagesForCustomer(pagesWithNeverExpiringTokens);
        } else {
          // Fallback to regular tokens
          setFbPages(data.data);
          await storeAllPagesForCustomer(data.data);
        }
      } catch (tokenError) {
        console.warn('⚠️ Failed to get never-expiring tokens, using standard tokens:', tokenError);
        setFbPages(data.data);
        await storeAllPagesForCustomer(data.data);
      }
      
      setFbError(null); // Clear any previous errors
    } catch (error) {
      console.error('❌ Error fetching pages:', error);
      handleApiError({ message: error.message, code: 'FETCH_ERROR' });
    }
  };

  // Modified fetchPageInsights with error handling
  const fetchPageInsights = async (pageId, pageAccessToken) => {
    setLoadingInsights(prev => ({ ...prev, [pageId]: true }));
    
    try {
      // Use direct Graph API call to avoid SDK session conflicts
      const postsUrl = `https://graph.facebook.com/v18.0/${pageId}/posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares,reactions.summary(true),full_picture&limit=10&access_token=${pageAccessToken}`;
      const response = await fetch(postsUrl);
      const data = await response.json();
      
      setLoadingInsights(prev => ({ ...prev, [pageId]: false }));
      
      if (data.error) {
        console.error('Posts fetch error:', data.error);
        handleApiError(data.error, pageId);
        setPageInsights(prev => ({
          ...prev,
          [pageId]: []
        }));
        return;
      }
      
      const posts = data.data || [];
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
    } catch (error) {
      console.error('Error fetching page insights:', error);
      setLoadingInsights(prev => ({ ...prev, [pageId]: false }));
      setPageInsights(prev => ({
        ...prev,
        [pageId]: []
      }));
    }
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

  // Add UI for single post analytics (similar to Instagram)
  const renderSinglePostAnalytics = () => {
    if (!selectedPostId || !singlePostAnalytics) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setSelectedPostId(null);
            setSinglePostAnalytics(null);
          }}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-blue-600" />
              Post Analytics
            </h3>
            <button
              onClick={() => {
                setSelectedPostId(null);
                setSinglePostAnalytics(null);
              }}
              className="p-1.5 rounded-full hover:bg-blue-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            <div className="space-y-4">
              {/* Post Preview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  {singlePostAnalytics.full_picture && (
                    <img
                      src={singlePostAnalytics.full_picture}
                      alt="Post media"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] sm:text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded font-medium">
                        Facebook
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        {new Date(singlePostAnalytics.created_time).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    {singlePostAnalytics.message && (
                      <p className="text-xs sm:text-sm text-gray-800 mb-1 line-clamp-2">
                        {singlePostAnalytics.message}
                      </p>
                    )}
                    {singlePostAnalytics.story && !singlePostAnalytics.message && (
                      <p className="text-xs sm:text-sm text-gray-600 mb-1 italic line-clamp-2">
                        {singlePostAnalytics.story}
                      </p>
                    )}
                    {singlePostAnalytics.permalink_url && (
                      <a 
                        href={singlePostAnalytics.permalink_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] sm:text-xs text-blue-600 hover:text-blue-700"
                      >
                        View →
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Engagement Metrics Grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-2.5 text-center">
                  <div className="text-base sm:text-lg font-bold text-blue-600 mb-1">
                    {singlePostAnalytics.likes_count?.toLocaleString() || 0}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-blue-700 font-medium">
                    👍
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-2.5 text-center">
                  <div className="text-base sm:text-lg font-bold text-green-600 mb-1">
                    {singlePostAnalytics.comments_count?.toLocaleString() || 0}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-green-700 font-medium">
                    💬
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 sm:p-2.5 text-center">
                  <div className="text-base sm:text-lg font-bold text-purple-600 mb-1">
                    {singlePostAnalytics.shares_count?.toLocaleString() || 0}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-purple-700 font-medium">
                    🔄
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 sm:p-2.5 text-center">
                  <div className="text-base sm:text-lg font-bold text-orange-600 mb-1">
                    {singlePostAnalytics.reactions_count?.toLocaleString() || 0}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-orange-700 font-medium">
                    😍
                  </div>
                </div>
              </div>

              {/* Total Engagement */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2.5 sm:p-3 text-center">
                <div className="text-base sm:text-xl font-bold text-indigo-600 mb-1">
                  {singlePostAnalytics.total_engagement?.toLocaleString() || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-indigo-700 font-medium">
                  📊 Total Engagement
                </div>
              </div>

              {/* Engagement Trend Charts */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-xs sm:text-sm text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-blue-600" />
                  Engagement Trends
                </h4>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Likes Trend */}
                  <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-700">👍 Likes</span>
                      <span className="text-[11px] sm:text-xs font-bold text-blue-600">
                        {singlePostAnalytics.likes_count?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="h-20 sm:h-24">
                      <TrendChart
                        data={generatePostTrendData(singlePostAnalytics.likes_count, 'likes')}
                        title="Likes"
                        color="#3B82F6"
                        metric="value"
                        minimal={true}
                      />
                    </div>
                  </div>

                  {/* Comments Trend */}
                  <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-green-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-700">💬 Comments</span>
                      <span className="text-[11px] sm:text-xs font-bold text-green-600">
                        {singlePostAnalytics.comments_count?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="h-20 sm:h-24">
                      <TrendChart
                        data={generatePostTrendData(singlePostAnalytics.comments_count, 'comments')}
                        title="Comments"
                        color="#10B981"
                        metric="value"
                        minimal={true}
                      />
                    </div>
                  </div>

                  {/* Shares Trend */}
                  <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-purple-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-700">🔄 Shares</span>
                      <span className="text-[11px] sm:text-xs font-bold text-purple-600">
                        {singlePostAnalytics.shares_count?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="h-20 sm:h-24">
                      <TrendChart
                        data={generatePostTrendData(singlePostAnalytics.shares_count, 'shares')}
                        title="Shares"
                        color="#8B5CF6"
                        metric="value"
                        minimal={true}
                      />
                    </div>
                  </div>

                  {/* Reactions Trend */}
                  <div className="bg-white rounded-lg p-2.5 sm:p-3 border border-orange-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-700">😍 Reactions</span>
                      <span className="text-[11px] sm:text-xs font-bold text-orange-600">
                        {singlePostAnalytics.reactions_count?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="h-20 sm:h-24">
                      <TrendChart
                        data={generatePostTrendData(singlePostAnalytics.reactions_count, 'reactions')}
                        title="Reactions"
                        color="#F59E0B"
                        metric="value"
                        minimal={true}
                      />
                    </div>
                  </div>
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
      <div className="mt-4 bg-white sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h5 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Facebook className="h-4 w-4 text-blue-600" />
            Posts
          </h5>
          <span className="text-xs text-gray-500">{posts.length} posts</span>
        </div>
        
        {/* Instagram-style 3-column grid */}
        <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
          {posts.map((post) => (
            <div 
              key={post.id} 
              className="aspect-square relative group cursor-pointer"
              onClick={() => {
                setSelectedPostId(post.id);
                fetchSinglePostAnalytics(post);
              }}
            >
              {post.full_picture ? (
                <img
                  src={post.full_picture}
                  alt={post.message ? post.message.substring(0, 50) + '...' : 'Facebook post'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <Facebook className="h-8 w-8 text-blue-400" />
                </div>
              )}
              {/* Video indicator */}
              {post.type === 'video' && (
                <div className="absolute top-1 right-1">
                  <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              )}
              {/* Hover overlay with engagement stats */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm font-semibold">
                <span className="flex items-center gap-1">
                  <span>👍</span>
                  {post.likes?.summary?.total_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <span>💬</span>
                  {post.comments?.summary?.total_count || 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // renderPostModal - REMOVED (Create Post functionality removed)

  const renderPageDetails = (page) => (
    <div key={page.id} className="bg-white sm:bg-gradient-to-br sm:from-blue-50 sm:to-indigo-50 sm:border sm:border-blue-200 sm:rounded-2xl mb-4">
      {/* Profile Header - Instagram Style */}
      <div className="p-0 sm:p-6">
        <div className="flex items-start gap-2 sm:gap-4 mb-4">
          {page.picture ? (
            <img 
              src={page.picture.data.url} 
              alt={page.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full sm:border-2 sm:border-blue-200 flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Facebook className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{page.name}</h4>
              {page.verification_status && (
                <div className="w-4 h-4 sm:w-5 sm:h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 truncate">Page ID: {page.id}</p>
          </div>
        </div>
        
        {/* Action Button - Compact for mobile */}
        <div className="flex mb-4">
          <button
            onClick={() => fetchPagePosts(page.id, page.access_token)}
            disabled={loadingPosts[page.id] || !isFacebookApiReady()}
            className="flex items-center justify-center gap-1 flex-1 px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Facebook className="h-3 w-3" />
            <span>{loadingPosts[page.id] ? 'Loading...' : 'Load Posts'}</span>
          </button>
        </div>
      
        {/* Stats Row - Instagram Style */}
        <div className="flex justify-around text-center sm:border-t sm:border-b sm:border-gray-200 py-3 -mx-4 sm:mx-0 sm:border sm:rounded-xl sm:bg-white">
          <div>
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              {pagePosts[page.id]?.length?.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-gray-500">Posts</div>
          </div>
          <div className="sm:border-l sm:border-gray-200 pl-4">
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              {page.fan_count?.toLocaleString() || '0'}
            </div>
            <div className="text-xs text-gray-500">Followers</div>
          </div>
          <div className="sm:border-l sm:border-gray-200 pl-4">
            <div className="text-lg sm:text-xl font-bold text-gray-900">
              {pagePosts[page.id]?.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0).toLocaleString() || '0'}
            </div>
            <div className="text-xs text-gray-500">Likes</div>
          </div>
        </div>
      </div>

      {renderPageInsights(page.id)}
      {renderPagePosts(page.id)}
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
    // Show confirmation dialog
    const accountToRemove = connectedAccounts.find(acc => acc.id === accountId);
    const accountName = accountToRemove?.name || 'this account';
    
    const confirmed = window.confirm(
      `Are you sure you want to disconnect ${accountName}?\n\nThis will remove the account and delete all associated data from the database.`
    );
    
    if (!confirmed) {
      return; // User cancelled
    }
    
    try {
      // Find the account to get its backend data
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
      
      // Remove ONLY this specific account from local state
      const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
      setConnectedAccounts(updatedAccounts);
      saveAccountsToStorage(updatedAccounts);
      
      // Only update active account if we're removing the currently active one
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
    // Show confirmation dialog
    const accountCount = connectedAccounts.length;
    const confirmed = window.confirm(
      `Are you sure you want to disconnect all ${accountCount} Facebook account${accountCount > 1 ? 's' : ''}?\n\nThis will remove all accounts and delete all associated data from the database.`
    );
    
    if (!confirmed) {
      return; // User cancelled
    }
    
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

      // NOTE: Don't store customer social account here - it should be done once for all pages
      
    } catch (error) {
      console.warn('Failed to store connected page:', error);
    }
  };

  // CRITICAL FIX: Store all pages at once for this customer
  const storeAllPagesForCustomer = async (pages) => {
    try {
      const customerId = getCurrentCustomerId();
      if (!customerId) {
        console.warn('No customer ID found, cannot store social account');
        return;
      }

      if (!activeAccount?.accessToken) {
        console.error('❌ No user access token available - refresh will not work');
        alert('Warning: User access token is missing. Token refresh may not work. Please reconnect if you experience issues.');
      }

      // Map all pages to backend format
      const pagesData = pages.map(page => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        category: page.category,
        fanCount: page.fan_count,
        permissions: ['pages_read_engagement'],
        tasks: page.tasks || [],
        tokenValidatedAt: new Date().toISOString(),
        tokenType: page.tokenType || 'standard',
        tokenExpiry: page.tokenExpiry || 'unknown'
      }));

      const accountData = {
        customerId: customerId,
        platform: 'facebook',
        platformUserId: activeAccount.id,
        name: activeAccount.name,
        email: activeAccount.email,
        profilePicture: activeAccount.picture?.data?.url,
        accessToken: activeAccount.accessToken,
        userId: activeAccount.id,
        pages: pagesData, // All pages for this customer
        connectedAt: new Date().toISOString(),
        tokenExpiresAt: activeAccount.tokenExpiresAt || new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)).toISOString(),
        needsReconnection: false,
        lastTokenValidation: new Date().toISOString(),
        refreshError: null,
        lastRefreshAttempt: null,
        lastSuccessfulValidation: new Date().toISOString(),
        tokenStatus: 'active'
      };

      console.log(`📦 Storing ${pagesData.length} pages for customer ${customerId}`);

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.warn('Failed to store customer social account - server response:', response.status, errorText);
        return;
      }
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored all pages for customer social account');
      } else {
        console.warn('Failed to store customer social account:', result.error);
      }
      
    } catch (error) {
      console.warn('Failed to store all pages for customer:', error);
    }
  };

  // Enhanced token refresh with never-expiring page tokens
  const refreshPageTokens = async () => {
    if (!activeAccount) {
      alert('❌ No active account found. Please connect your Facebook account first.');
      return;
    }

    console.log('🔄 Refreshing page access tokens...');
    
    try {
      // First refresh the user session
      const sessionRefreshed = await refreshCurrentSession();
      
      if (!sessionRefreshed) {
        console.error('❌ Session refresh failed');
        alert('❌ Failed to refresh session. Please try reconnecting your Facebook account.');
        return;
      }
      
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
        console.error('❌ Failed to get page tokens:', data.error);
        // Fallback to re-fetching pages normally
        fetchFbPages();
        alert('✅ Session refreshed! Your pages have been reloaded.');
      }
    } catch (error) {
      console.error('❌ Failed to refresh tokens:', error);
      alert('❌ Failed to refresh tokens. Error: ' + error.message);
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
      <div className="mb-4 px-3 sm:px-0">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">Connected Facebook Accounts</span>
            <span className="sm:hidden">Accounts</span>
            <span className="ml-1">({connectedAccounts.length})</span>
          </h4>
          <button
            onClick={refreshPageTokens}
            disabled={!fbSdkLoaded || !isFacebookApiReady() || !activeAccount}
            className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh Tokens</span>
            <span className="sm:hidden">Refresh</span>
          </button>
        </div>
        <div className="space-y-2">
          {connectedAccounts.map((account) => {
            const expired = isTokenExpired(account);
            return (
              <div
                key={account.id}
                className={`rounded-lg p-3 transition-all cursor-pointer ${
                  activeAccountId === account.id
                    ? 'bg-blue-50 sm:ring-1 sm:ring-blue-300'
                    : 'bg-gray-50 hover:bg-gray-100'
                } ${expired ? 'bg-orange-50' : ''}`}
                onClick={() => switchAccount(account.id)}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  {account.picture && (
                    <img
                      src={account.picture.data.url}
                      alt={account.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h5 className="font-medium text-sm sm:text-base text-gray-900 truncate">{account.name}</h5>
                      {activeAccountId === account.id && (
                        <UserCheck className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 flex-shrink-0" />
                      )}
                      {expired && (
                        <span className="text-xs bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded flex-shrink-0">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{account.email}</p>
                    <p className="text-xs text-gray-500">
                      Connected {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                    {account.pages && account.pages.some(p => p.tokenExpiry === 'never' || p.tokenType === 'never_expiring' || p.tokenType === 'never_expiring_page_token') ? (
                      <p className="text-xs text-green-600 font-medium">
                        ✅ Tokens: Never expire
                      </p>
                    ) : account.tokenExpiresAt ? (
                      <p className="text-xs text-gray-500">
                        Expires: {new Date(account.tokenExpiresAt).toLocaleDateString()}
                      </p>
                    ) : (
                      <p className="text-xs text-green-600 font-medium">
                        ✅ Active
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAccount(account.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
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
          <div className="mt-4 p-3 bg-blue-50 sm:border sm:border-blue-200 rounded-lg">
              {/*
              <h6 className="font-medium text-blue-800 mb-2">🔑 Token Management</h6>
              <div className="text-sm text-blue-700 space-y-1">
                <p>📝 <strong>Active Account:</strong> {activeAccount.name}</p>
                <p>✨ <strong>Page Tokens:</strong> Never expire (permanent access)</p>
                <p>🔄 <strong>Auto-Refresh:</strong> User tokens refreshed automatically every 60 days</p>
                <p>⏰ <strong>Session Management:</strong> Continuous access with automatic token maintenance</p>
                <p>🔗 <strong>Manual Actions:</strong> Use "Refresh Tokens" to manually update all tokens</p>
                <p>✅ <strong>Permissions:</strong> pages_read_engagement, pages_manage_metadata</p>
                {activeAccount.tokenExpiresAt && (
                  <p>⏳ <strong>User Token Expires:</strong> {new Date(activeAccount.tokenExpiresAt).toLocaleDateString()}</p>
                )}
                <p className="text-green-700 font-medium">💡 Page tokens never expire - no reconnection needed!</p>
              </div>
              */}
          </div>
        )}
      </div>
    );
  };

  // --- Facebook Main UI (like Instagram) ---
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3 h-14 sm:h-16">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Facebook className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900">Facebook Integration</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Manage your Facebook pages and analytics</p>
            </div>
          </div>
        </div>
      </header>
      <div className="sm:p-4">
        <div className="bg-white sm:rounded-lg sm:shadow-sm">
          {/* Debug info (optional, can remove) */}
          {/* ...existing code... */}
          {renderError()}
          {connectedAccounts.length === 0 ? (
            <div className="text-center py-6 sm:py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-lg mb-4">
                <Facebook className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">Connect Facebook Accounts</h3>
              <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
                Connect your Facebook accounts to manage your pages and access detailed analytics.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
                <h4 className="font-semibold text-sm text-blue-900 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                    <span className="text-white text-sm">📱</span>
                  </div>
                  Multi-Account Setup Guide
                </h4>
                <div className="text-xs sm:text-sm text-gray-700 space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs">1</div>
                    <p>Log in with your Facebook account</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs">2</div>
                    <p>Grant permissions to access your pages</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs">3</div>
                    <p>Select which accounts to connect and manage</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-xs">4</div>
                    <p>Historical data will be captured automatically</p>
                  </div>
                </div>
              </div>
              <button
                onClick={fbLogin}
                disabled={!isFacebookApiReady()}
                className="bg-blue-600 text-white px-4 sm:px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto font-medium text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed w-auto"
              >
                <Facebook className="h-5 w-5" />
                <span>Connect Facebook Account</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Show account selector if multiple accounts */}
              {connectedAccounts.length > 1 && renderAccountSelector()}
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
                  <div className="flex items-center gap-2 bg-green-600 px-3 py-1.5 rounded-lg w-full sm:w-auto justify-center sm:justify-start">
                    <span className="text-white font-bold">●</span>
                    <span className="text-xs sm:text-sm font-semibold text-white">
                      {connectedAccounts.length} Account{connectedAccounts.length !== 1 ? 's' : ''} Connected
                    </span>
                  </div>
                  {activeAccount && (
                    <div className="flex items-center gap-2 bg-slate-100 px-3 sm:px-4 py-2 rounded-xl w-full sm:w-auto justify-center sm:justify-start">
                      {activeAccount.picture && (
                        <img
                          src={activeAccount.picture.data.url}
                          alt="Profile"
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full sm:border-2 sm:border-slate-300"
                        />
                      )}
                      <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate">
                        {activeAccount.name}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={refreshPageTokens}
                    disabled={!fbSdkLoaded || !isFacebookApiReady() || !activeAccount}
                    className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs sm:text-sm flex-1 sm:flex-initial justify-center"
                  >
                    <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                    <span className="hidden sm:inline">Refresh Tokens</span>
                    <span className="sm:hidden">Refresh</span>
                  </button>
                  <button
                    onClick={fbLogin}
                    disabled={!fbSdkLoaded || !isFacebookApiReady()}
                    className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium text-xs sm:text-sm flex-1 sm:flex-initial justify-center"
                  >
                    <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Add Account</span>
                    <span className="sm:hidden">Add</span>
                  </button>
                  <button
                    onClick={() => fbLogoutAll()}
                    className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 rounded-xl hover:from-slate-200 hover:to-slate-300 transition-all sm:border sm:border-slate-300 font-medium text-xs sm:text-sm w-full sm:w-auto justify-center"
                  >
                    <ExternalLink className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    <span>Disconnect All</span>
                  </button>
                </div>
              </div>
              {/* Active account details and pages */}
              {activeAccount && (
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 sm:border-2 sm:border-indigo-200 rounded-2xl sm:p-6 shadow-sm sm:shadow-lg">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                      {activeAccount.picture && (
                        <img
                          src={activeAccount.picture.data.url}
                          alt="Profile"
                          className="w-20 h-20 rounded-2xl border-4 border-white shadow-md"
                        />
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-slate-800">{activeAccount.name}</h2>
                        <p className="text-sm text-slate-600 mt-1">{activeAccount.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                      <button
                        onClick={refreshPageTokens}
                        disabled={!fbSdkLoaded || !isFacebookApiReady() || !activeAccount}
                        className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-white sm:border-2 sm:border-indigo-200 text-indigo-700 rounded-xl hover:bg-indigo-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm text-xs sm:text-sm flex-1 md:flex-initial justify-center"
                      >
                        <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={() => removeAccount(activeAccount.id)}
                        className="group flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:from-red-600 hover:to-rose-600 transition-all font-medium shadow-md hover:shadow-lg text-xs sm:text-sm flex-1 md:flex-initial justify-center"
                      >
                        <ExternalLink className="h-4 w-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-4 text-slate-800">Pages for {activeAccount.name}:</h4>
                    {fbPages.length === 0 ? (
                      <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-slate-300">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <Facebook className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-600 font-medium mb-2">No pages found or you don't manage any pages.</p>
                        <p className="text-sm text-slate-500 mb-4">Make sure you're an admin or editor of at least one Facebook page.</p>
                        <button
                          onClick={fetchFbPages}
                          disabled={!isFacebookApiReady()}
                          className="group bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg font-medium inline-flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4 group-hover:rotate-180 transition-transform duration-500" />
                          Retry Loading Pages
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
                            <div className="mb-4">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-indigo-50 rounded-lg sm:border sm:border-indigo-200 sm:p-4 gap-3">
                                <div className="flex items-center gap-2 sm:gap-3">
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                                  </div>
                                  <div>
                                    <h4 className="font-semibold text-sm sm:text-base text-gray-900">Historical Analytics</h4>
                                    <p className="text-xs text-gray-600 hidden sm:block">View long-term trends and growth patterns</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => setShowHistoricalCharts(prev => ({
                                    ...prev,
                                    [page.id]: !prev[page.id]
                                  }))}
                                  className="flex items-center gap-2 bg-indigo-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-indigo-700 text-xs sm:text-sm font-medium w-full sm:w-auto justify-center"
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
          
          {/* Render single post analytics */}
          {renderSinglePostAnalytics()}
        </div>
      </div>
    </div>
  );
}

export default FacebookIntegration;