import React, { useState, useEffect } from 'react';
import { Youtube, TrendingUp, ExternalLink, CheckCircle, AlertCircle, Loader2, Users, Eye, Play, Clock, Plus, UserCheck, Trash2, RefreshCw, BarChart3, ThumbsUp, MessageSquare, ChevronUp } from 'lucide-react';
import YouTubePostAnalytics from './components/YouTubePostAnalytics';
import { getUserData, setUserData, removeUserData, migrateToUserSpecificStorage } from '../../utils/sessionUtils';

// YouTube Integration Constants
const CLIENT_ID = '593529385135-snp35l6s9dtje8g8f1l1b3ajtp375cjr.apps.googleusercontent.com';
const API_KEY = 'AIzaSyD2fYMvhlDJwk6cMEJSBRQmJnsidFjCFtc';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly https://www.googleapis.com/auth/youtube.upload';

// Helper to parse ISO 8601 duration (e.g. PT1M30S => 90 seconds)
function parseISO8601Duration(iso) {
  let total = 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  if (match[1]) total += parseInt(match[1], 10) * 3600;
  if (match[2]) total += parseInt(match[2], 10) * 60;
  if (match[3]) total += parseInt(match[3], 10);
  return total;
}

// Utility function to safely convert errors to readable strings
function getErrorMessage(error) {
  if (!error) return 'Unknown error occurred';
  
  // If it's already a string, return it
  if (typeof error === 'string') return error;
  
  // Handle Google API errors
  if (error.result && error.result.error) {
    if (error.result.error.message) return error.result.error.message;
    if (error.result.error.code) return `API Error ${error.result.error.code}`;
  }
  
  // Handle standard Error objects
  if (error.message) return error.message;
  
  // Handle objects with error properties
  if (error.error) {
    if (typeof error.error === 'string') return error.error;
    if (error.error.message) return error.error.message;
  }
  
  // Handle YouTube API specific errors
  if (error.code === 401 || error.status === 401) {
    return 'YouTube access token expired. Please reconnect your account.';
  }
  
  if (error.code === 403 || error.status === 403) {
    return 'YouTube API access denied. Please check your permissions.';
  }
  
  if (error.code === 400 || error.status === 400) {
    return 'Invalid request to YouTube API. Please try again.';
  }
  
  // Last resort: try to JSON stringify but safely
  try {
    const str = JSON.stringify(error);
    if (str !== '{}') return `Error: ${str}`;
  } catch (e) {
    // JSON stringify failed, return generic message
  }
  
  return 'An unexpected error occurred. Please try again.';
}

// Safe error setter that always converts to string
function setSafeError(setErrorFn, error) {
  const errorMessage = getErrorMessage(error);
  console.error('YouTube Integration Error:', error);
  setErrorFn(errorMessage);
}

function YouTubeIntegration(props) {
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [gapiClientReady, setGapiClientReady] = useState(false);
  
  // Multi-account state
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [activeAccount, setActiveAccount] = useState(null);
  
  // Current active account data
  const [channelInfo, setChannelInfo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [shortsCount, setShortsCount] = useState(0);
  const [videosCount, setVideosCount] = useState(0);
  
  const [error, setError] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);

  // Chart view state
  const [showHistoricalCharts, setShowHistoricalCharts] = useState({});

  // Post-level analytics state
  const [videoAnalytics, setVideoAnalytics] = useState({});
  const [loadingVideoAnalytics, setLoadingVideoAnalytics] = useState({});
  const [showAnalyticsFor, setShowAnalyticsFor] = useState(null);

  // Token refresh timer
  const [tokenRefreshTimer, setTokenRefreshTimer] = useState(null);

  // Safe error setter wrapper
  const setSafeErrorState = (error) => setSafeError(setError, error);

  // Function to store current metrics as historical snapshot
  const storeHistoricalSnapshot = async (channelId, channelName, metrics) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/historical-data/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'youtube',
          accountId: channelId,
          pageId: channelId,
          accountName: channelName,
          metrics: {
            subscriberCount: metrics.subscriberCount || 0,
            videoCount: metrics.videoCount || 0,
            viewCount: metrics.viewCount || 0,
            totalViews: metrics.totalViews || metrics.viewCount || 0,
            totalSubscribers: metrics.totalSubscribers || metrics.subscriberCount || 0,
            shortsCount: metrics.shortsCount || 0,
            videosCount: metrics.videosCount || 0,
            estimatedWatchTime: metrics.estimatedWatchTime || 0
          },
          dataSource: 'api'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`✅ Stored historical snapshot for YouTube channel: ${channelName}`);
      }
    } catch (error) {
      console.warn('Failed to store historical snapshot:', error);
    }
  };

  // Load connected accounts from localStorage on component mount
  useEffect(() => {
    try {
      // First, migrate any existing data to user-specific storage
      migrateToUserSpecificStorage([
        'yt_connected_accounts',
        'yt_active_account_id'
      ]);

      const savedAccounts = getUserData('yt_connected_accounts');
      const savedActiveId = getUserData('yt_active_account_id');
      
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
          setUserData('yt_active_account_id', savedAccounts[0].id);
        }
      }
    } catch (error) {
      console.warn('Failed to load saved accounts:', error);
    }
  }, []);

  // Load Google API scripts with improved error handling
  useEffect(() => {
    const loadScript = (src, onLoad, onError) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = onLoad;
      script.onerror = onError;
      document.body.appendChild(script);
      return script;
    };

    const gapiScript = loadScript(
      'https://apis.google.com/js/api.js',
      () => setGapiLoaded(true),
      (error) => {
        console.error('Failed to load Google API script:', error);
        setSafeErrorState('Failed to load Google API script. Please check your internet connection.');
      }
    );

    const gisScript = loadScript(
      'https://accounts.google.com/gsi/client',
      () => setGisLoaded(true),
      (error) => {
        console.error('Failed to load Google Identity Services script:', error);
        setSafeErrorState('Failed to load Google Identity Services script. Please check your internet connection.');
      }
    );

    return () => {
      if (document.body.contains(gapiScript)) gapiScript.remove();
      if (document.body.contains(gisScript)) gisScript.remove();
    };
  }, []);

  // Initialize GAPI client with improved error handling
  useEffect(() => {
    if (gapiLoaded) {
      try {
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: API_KEY,
              discoveryDocs: DISCOVERY_DOCS,
            });
            setGapiClientReady(true);
          } catch (err) {
            console.error('GAPI client initialization error:', err);
            setSafeErrorState('Failed to initialize Google API client. Please refresh the page and try again.');
          }
        });
      } catch (err) {
        console.error('GAPI load error:', err);
        setSafeErrorState('Failed to load Google API client. Please refresh the page and try again.');
      }
    }
  }, [gapiLoaded]);

  // Save accounts to localStorage
  const saveAccountsToStorage = (accounts) => {
    try {
      setUserData('yt_connected_accounts', accounts);
    } catch (error) {
      console.warn('Failed to save accounts to storage:', error);
    }
  };

  // Add the missing publishToYouTube function
  const publishToYouTube = async (postData) => {
    if (!activeAccount) {
      throw new Error('No active YouTube account');
    }

    try {
      // Ensure valid token
      const tokenValid = await ensureValidToken(activeAccount.id);
      if (!tokenValid) {
        throw new Error('YouTube token expired. Please reconnect your account.');
      }

      const { caption, mediaFiles } = postData;
      if (!mediaFiles || mediaFiles.length === 0) {
        throw new Error('No media files provided');
      }

      const file = mediaFiles[0];
      let fileToUpload = file;
      let mimeType = file.type;

      if (file.type.startsWith('image/')) {
        fileToUpload = await imageToVideo(file);
        mimeType = 'video/webm';
      }

      const metadata = {
        snippet: {
          title: caption || 'Untitled Video',
          description: caption || '',
        },
        status: {
          privacyStatus: 'public'
        }
      };

      return new Promise((resolve, reject) => {
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const base64Data = e.target.result.split(',')[1];
            const multipartRequestBody =
              delimiter +
              'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
              JSON.stringify(metadata) +
              delimiter +
              'Content-Type: ' + mimeType + '\r\n' +
              'Content-Transfer-Encoding: base64\r\n' +
              '\r\n' +
              base64Data +
              close_delim;

            let response = await fetch(
              'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${activeAccount.accessToken}`,
                  'Content-Type': `multipart/related; boundary="${boundary}"`
                },
                body: multipartRequestBody
              }
            );

            // If 401, try to refresh token and retry once
            if (response.status === 401 && activeAccount.refreshToken) {
              const refreshed = await refreshYouTubeToken(activeAccount.id);
              if (refreshed) {
                // Get updated token
                const refreshedAccount = connectedAccounts.find(acc => acc.id === activeAccount.id);
                response = await fetch(
                  'https://www.googleapis.com/upload/youtube/v3/videos?part=snippet,status&uploadType=multipart',
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${refreshedAccount.accessToken}`,
                      'Content-Type': `multipart/related; boundary="${boundary}"`
                    },
                    body: multipartRequestBody
                  }
                );
              }
            }

            if (!response.ok) {
              const errorData = await response.json();
              reject(new Error(errorData.error?.message || `YouTube upload failed with status ${response.status}`));
              return;
            }

            const data = await response.json();
            resolve({
              success: true,
              videoId: data.id,
              url: `https://www.youtube.com/watch?v=${data.id}`
            });
          } catch (error) {
            reject(new Error(`YouTube upload failed: ${getErrorMessage(error)}`));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(fileToUpload);
      });
    } catch (error) {
      throw new Error(`YouTube publish error: ${getErrorMessage(error)}`);
    }
  };

  // Export the function for use by other components with better error handling
  React.useEffect(() => {
    try {
      // Validate the function before exporting
      if (typeof publishToYouTube === 'function') {
        window.publishToYouTube = publishToYouTube;
        console.log('✅ YouTube publish function exported successfully');
      } else {
        console.error('❌ Failed to export YouTube publish function - not a function');
      }
      
      return () => {
        delete window.publishToYouTube;
      };
    } catch (error) {
      console.warn('Error exporting YouTube publish function:', error);
    }
  }, [publishToYouTube, activeAccount]);

  // Handle new token from Google OAuth with improved error handling
  const handleNewToken = async (tokenResponse) => {
    console.log('🔍 Token response:', {
      hasAccessToken: !!tokenResponse.access_token,
      hasRefreshToken: !!tokenResponse.refresh_token,
      expiresIn: tokenResponse.expires_in
    });

    try {
      // Set token temporarily to fetch user info
      window.gapi.client.setToken({ access_token: tokenResponse.access_token });
      
      // Fetch channel info to get user details
      const response = await window.gapi.client.youtube.channels.list({
        part: 'snippet,contentDetails,statistics',
        mine: true
      });
      
      if (response.result.items && response.result.items.length > 0) {
        const channel = response.result.items[0];
        const userId = channel.id;
        
        const newAccount = {
          id: userId,
          name: channel.snippet.title,
          email: channel.snippet.customUrl || `${channel.snippet.title}@youtube`,
          picture: channel.snippet.thumbnails.default,
          accessToken: tokenResponse.access_token,
          connectedAt: new Date().toISOString(),
          channelInfo: channel
        };

        // Store refresh token if available
        if (tokenResponse.refresh_token) {
          newAccount.refreshToken = tokenResponse.refresh_token;
          console.log('✅ Refresh token captured and stored');
        } else {
          console.warn('⚠️ No refresh token received - auto-refresh will not work');
        }
        
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
        
        // Set as active account FIRST
        setActiveAccountId(userId);
        setActiveAccount(newAccount);
        setChannelInfo(channel);
        setUserData('yt_active_account_id', userId);
        
        // Store token and expiry with user-specific keys
        const expiryTime = Date.now() + (tokenResponse.expires_in || 3600) * 1000;
        setUserData(`yt_access_token_${userId}`, tokenResponse.access_token);
        setUserData(`yt_token_expiry_${userId}`, expiryTime.toString());
        
        // Schedule automatic token refresh (5 minutes before expiry)
        scheduleTokenRefresh(userId, expiryTime);
        console.log('✅ Automatic token refresh scheduled');
        
        // Fetch additional data - pass the newAccount instead of relying on state
        await fetchChannelData(channel, newAccount);
        
        // Store initial historical snapshot
        storeHistoricalSnapshot(channel.id, channel.snippet.title, {
          subscriberCount: channel.statistics?.subscriberCount,
          videoCount: channel.statistics?.videoCount,
          viewCount: channel.statistics?.viewCount,
          totalViews: channel.statistics?.viewCount,
          totalSubscribers: channel.statistics?.subscriberCount
        });
        
        // Call onData with correct structure
        if (typeof props?.onData === 'function') {
          try {
            props.onData({
              channelInfo: {
                statistics: {
                  subscriberCount: channel.statistics?.subscriberCount,
                  viewCount: channel.statistics?.viewCount,
                  videoCount: channel.statistics?.videoCount
                }
              }
            });
          } catch (error) {
            console.warn('Error calling onData callback:', error);
          }
        }
        
        // Clear any existing error
        setError(null);
      } else {
        setSafeErrorState('No YouTube channel found for this account');
      }
    } catch (err) {
      console.error('Error handling new token:', err);
      setSafeErrorState(err);
    }
  };

  // Store connected channel information with error handling
  const storeConnectedChannel = async (channel, account = null) => {
    try {
      // Use passed account or fallback to activeAccount
      const accountToUse = account || activeAccount;
      
      if (!accountToUse) {
        console.warn('No account available for storing connected channel');
        return;
      }

      // First store the channel data
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/connected-pages/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: channel.id,
          pageName: channel.snippet.title,
          accessToken: accountToUse.accessToken,
          instagramId: null,
          instagramUsername: null,
          userId: accountToUse?.id || 'unknown',
          accountName: accountToUse?.name || 'unknown',
          platform: 'youtube'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored connected YouTube channel:', channel.snippet.title);
      }

      // Store customer social account for admin access
      await storeCustomerSocialAccount(channel, accountToUse);
      
    } catch (error) {
      console.warn('Failed to store connected YouTube channel:', error);
    }
  };

  // Store customer social account for admin access with improved error handling
  const storeCustomerSocialAccount = async (channel, account = null) => {
    try {
      // Use passed account or fallback to activeAccount
      const accountToUse = account || activeAccount;
      
      if (!accountToUse) {
        console.warn('No account available for storing customer social account');
        return;
      }

      // Get current user/customer ID from auth context or localStorage
      let customerId = null;
      
      try {
        // Try multiple ways to get customer ID
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        customerId = currentUser.userId || currentUser.id || currentUser._id || currentUser.customer_id;
        
        // If still no customer ID, try getting from other possible sources
        if (!customerId) {
          const authUser = JSON.parse(localStorage.getItem('user') || '{}');
          customerId = authUser.userId || authUser.id || authUser._id || authUser.customer_id;
        }
      } catch (parseError) {
        console.warn('Error parsing user data from localStorage:', parseError);
      }
      
      if (!customerId) {
        console.warn('No customer ID found, cannot store social account');
        return;
      }

      // CRITICAL: Validate access token before storing
      if (!accountToUse.accessToken || accountToUse.accessToken.length < 50) {
        const errorMsg = 'YouTube access token is invalid or missing. Please try reconnecting your YouTube account.';
        console.error('🚨 Invalid YouTube access token:', {
          channelId: channel.id,
          channelName: channel.snippet.title,
          hasToken: !!accountToUse.accessToken,
          tokenLength: accountToUse.accessToken?.length || 0
        });
        setSafeErrorState(errorMsg);
        return;
      }

      console.log('✅ Valid YouTube access token found:', {
        channelId: channel.id,
        channelName: channel.snippet.title,
        tokenLength: accountToUse.accessToken.length,
        tokenPrefix: accountToUse.accessToken.substring(0, 15) + '...'
      });

      // Add token expiry information
      const tokenExpiresAt = Date.now() + (3600 * 1000); // Default 1 hour from now
      const storedExpiry = getUserData(`yt_token_expiry_${accountToUse.id}`);
      const actualExpiry = storedExpiry ? parseInt(storedExpiry, 10) : tokenExpiresAt;

      const accountData = {
        customerId: customerId,
        platform: 'youtube',
        platformUserId: accountToUse.id,
        name: accountToUse.name,
        email: accountToUse.email,
        profilePicture: accountToUse.picture?.data?.url,
        accessToken: accountToUse.accessToken, // Store the user access token
        refreshToken: accountToUse.refreshToken, // Store refresh token if available
        tokenExpiresAt: new Date(actualExpiry).toISOString(),
        tokenCreatedAt: new Date().toISOString(),
        channels: [
          {
            id: channel.id,
            name: channel.snippet.title,
            description: channel.snippet.description,
            thumbnail: channel.snippet.thumbnails?.default?.url,
            subscriberCount: channel.statistics?.subscriberCount,
            videoCount: channel.statistics?.videoCount,
            viewCount: channel.statistics?.viewCount,
            customUrl: channel.snippet?.customUrl,
            country: channel.snippet?.country
          }
        ],
        connectedAt: new Date().toISOString(),
        lastTokenRefresh: new Date().toISOString()
      };

      // Validate the complete account data before sending
      if (!accountData.accessToken) {
        throw new Error('YouTube access token validation failed before storage');
      }

      console.log('📤 Sending YouTube account data with validated tokens:', { 
        customerId, 
        platform: 'youtube', 
        platformUserId: accountToUse.id,
        tokenLength: accountData.accessToken.length,
        channelsCount: accountData.channels.length,
        tokenExpiresAt: accountData.tokenExpiresAt
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored customer YouTube account for admin access');
        
        // Verify the stored data by fetching it back
        try {
          const verifyResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
          const verifyData = await verifyResponse.json();
          if (verifyData.success && verifyData.accounts.length > 0) {
            const storedAccount = verifyData.accounts.find(acc => acc.platform === 'youtube');
            if (storedAccount && storedAccount.channels && storedAccount.channels.length > 0) {
              const storedChannel = storedAccount.channels.find(c => c.id === channel.id);
              if (storedChannel) {
                console.log('✅ Verified YouTube channel was stored correctly:', {
                  channelId: storedChannel.id,
                  channelName: storedChannel.name,
                  hasToken: !!storedAccount.accessToken,
                  tokenExpiresAt: storedAccount.tokenExpiresAt
                });
              } else {
                console.error('❌ YouTube channel was not stored correctly');
              }
            }
          }
        } catch (verifyError) {
          console.warn('Could not verify stored YouTube data:', verifyError.message);
        }
      } else {
        console.warn('Failed to store customer YouTube account:', result.error);
      }
      
    } catch (error) {
      console.warn('Failed to store customer YouTube account:', error);
      // Show user-friendly error without breaking the flow
      setSafeErrorState(`Warning: ${getErrorMessage(error)}. You may need to reconnect your YouTube account.`);
    }
  };

  // Fetch channel data with improved error handling
  const fetchChannelData = async (channel, account = null) => {
    try {
      const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
      
      // Store the connected channel - pass the account parameter
      await storeConnectedChannel(channel, account);
      
      // Fetch videos
      const videosResponse = await window.gapi.client.youtube.playlistItems.list({
        part: 'snippet,contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: 50
      });
      const items = videosResponse.result.items || [];
      setVideos(items);

      // Get video details for shorts/videos count
      const videoIds = items.map(item => item.snippet.resourceId.videoId).join(',');
      if (videoIds) {
        const detailsResp = await window.gapi.client.youtube.videos.list({
          part: 'contentDetails,snippet',
          id: videoIds
        });
        const details = detailsResp.result.items || [];
        let shorts = 0, normalVideos = 0;
        details.forEach(video => {
          const duration = parseISO8601Duration(video.contentDetails.duration);
          const isVertical = (video.snippet.thumbnails && video.snippet.thumbnails.default && video.snippet.thumbnails.default.height > video.snippet.thumbnails.default.width);
          const isShort = (duration <= 60) && isVertical;
          if (isShort) shorts++;
          else normalVideos++;
        });
        setShortsCount(shorts);
        setVideosCount(normalVideos);

        // Store updated historical snapshot with video counts
        storeHistoricalSnapshot(channel.id, channel.snippet.title, {
          subscriberCount: channel.statistics?.subscriberCount,
          videoCount: channel.statistics?.videoCount,
          viewCount: channel.statistics?.viewCount,
          totalViews: channel.statistics?.viewCount,
          totalSubscribers: channel.statistics?.subscriberCount,
          shortsCount: shorts,
          videosCount: normalVideos
        });
      } else {
        setShortsCount(0);
        setVideosCount(0);
      }
    } catch (err) {
      console.error('Error fetching channel data:', err);
      // Don't set a blocking error for this, just log it
      console.warn('Failed to fetch some channel data, continuing with available information');
    }
  };

  // Handle sign in (add new account)
  const handleSignIn = () => {
    try {
      if (tokenClient) {
        tokenClient.requestAccessToken();
      } else {
        setSafeErrorState('Authentication service not ready. Please refresh the page and try again.');
      }
    } catch (error) {
      console.error('Error during sign in:', error);
      setSafeErrorState('Failed to start authentication process. Please refresh the page and try again.');
    }
  };

  // Switch active account with error handling
  const switchAccount = (accountId) => {
    try {
      const account = connectedAccounts.find(acc => acc.id === accountId);
      if (account) {
        setActiveAccountId(accountId);
        setActiveAccount(account);
        setUserData('yt_active_account_id', accountId);
        
        // Clear current data
        setChannelInfo(null);
        setVideos([]);
        setShortsCount(0);
        setVideosCount(0);
        
        // Set access token and fetch new data
        const storedExpiry = getUserData(`yt_token_expiry_${accountId}`);
        if (account.accessToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
          window.gapi.client.setToken({ access_token: account.accessToken });
          setChannelInfo(account.channelInfo);
          fetchChannelData(account.channelInfo);
        }
      }
    } catch (error) {
      console.error('Error switching account:', error);
      setSafeErrorState('Failed to switch YouTube account. Please try again.');
    }
  };

  // Remove account with error handling
  const removeAccount = (accountId) => {
    try {
      const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
      setConnectedAccounts(updatedAccounts);
      saveAccountsToStorage(updatedAccounts);
      
      // Clean up stored tokens with user-specific keys
      removeUserData(`yt_access_token_${accountId}`);
      removeUserData(`yt_token_expiry_${accountId}`);
      
      if (activeAccountId === accountId) {
        if (updatedAccounts.length > 0) {
          // Switch to first remaining account
          switchAccount(updatedAccounts[0].id);
        } else {
          // No accounts left
          setActiveAccountId(null);
          setActiveAccount(null);
          setChannelInfo(null);
          setVideos([]);
          setShortsCount(0);
          setVideosCount(0);
          removeUserData('yt_active_account_id');
        }
      }
    } catch (error) {
      console.error('Error removing account:', error);
      setSafeErrorState('Failed to remove YouTube account. Please try again.');
    }
  };

  // Sign out all accounts with error handling
  const handleSignOutAll = () => {
    try {
      // Revoke all tokens
      connectedAccounts.forEach(account => {
        if (account.accessToken) {
          try {
            fetch(`https://oauth2.googleapis.com/revoke?token=${account.accessToken}`, {
              method: 'POST',
              headers: { 'Content-type': 'application/x-www-form-urlencoded' }
            }).catch(err => console.warn('Failed to revoke token:', err));
          } catch (err) {
            console.warn('Error revoking token:', err);
          }
        }
        removeUserData(`yt_access_token_${account.id}`);
        removeUserData(`yt_token_expiry_${account.id}`);
      });
      
      // Clear all state
      setConnectedAccounts([]);
      setActiveAccountId(null);
      setActiveAccount(null);
      setChannelInfo(null);
      setVideos([]);
      setShortsCount(0);
      setVideosCount(0);
      window.gapi.client.setToken('');
      removeUserData('yt_connected_accounts');
      removeUserData('yt_active_account_id');
    } catch (error) {
      console.error('Error signing out:', error);
      setSafeErrorState('Failed to sign out completely. Some data may remain cached.');
    }
  };

  // Fetch single video analytics
  const fetchSingleVideoAnalytics = async (videoId) => {
    if (loadingVideoAnalytics[videoId]) return;

    setLoadingVideoAnalytics(prev => ({ ...prev, [videoId]: true }));

    try {
      // Fetch detailed video statistics
      const response = await window.gapi.client.youtube.videos.list({
        part: 'statistics,snippet,contentDetails',
        id: videoId
      });

      if (response.result.items && response.result.items.length > 0) {
        const video = response.result.items[0];
        const stats = video.statistics || {};
        const snippet = video.snippet || {};
        const contentDetails = video.contentDetails || {};

        // Calculate engagement rate
        const views = parseInt(stats.viewCount) || 0;
        const likes = parseInt(stats.likeCount) || 0;
        const comments = parseInt(stats.commentCount) || 0;
        const totalEngagement = likes + comments;
        const engagementRate = views > 0 ? ((totalEngagement / views) * 100).toFixed(2) : '0.00';

        // Parse duration
        const durationSeconds = parseISO8601Duration(contentDetails.duration);
        const isShort = durationSeconds <= 60;

        // Calculate estimated revenue (rough estimation)
        const estimatedRevenue = views > 0 ? (views * 0.003).toFixed(2) : '0.00';

        const analytics = {
          videoId,
          title: snippet.title || 'Untitled Video',
          publishedAt: snippet.publishedAt,
          duration: contentDetails.duration,
          durationSeconds,
          isShort,
          views,
          likes,
          comments,
          engagementRate: parseFloat(engagementRate),
          estimatedRevenue: parseFloat(estimatedRevenue),
          thumbnailUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
          description: snippet.description || '',
          tags: snippet.tags || [],
          categoryId: snippet.categoryId,
          rawStats: stats,
          performance: {
            excellent: engagementRate >= 3,
            good: engagementRate >= 1.5 && engagementRate < 3,
            average: engagementRate >= 0.5 && engagementRate < 1.5,
            poor: engagementRate < 0.5
          }
        };

        setVideoAnalytics(prev => ({
          ...prev,
          [videoId]: analytics
        }));

        return analytics;
      }
    } catch (error) {
      console.error('Error fetching video analytics:', error);
      setSafeErrorState(`Failed to fetch analytics for video: ${getErrorMessage(error)}`);
    } finally {
      setLoadingVideoAnalytics(prev => ({ ...prev, [videoId]: false }));
    }
  };

  // Add token refresh functionality with improved error handling
  const refreshYouTubeToken = async (accountId) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (!account || !account.refreshToken) {
      console.warn('No refresh token available for account:', accountId);
      return false;
    }

    try {
      console.log('🔄 Refreshing YouTube access token...');
      
      // Use Google's token refresh endpoint
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          refresh_token: account.refreshToken,
          grant_type: 'refresh_token'
        })
      });

      const tokenData = await response.json();
      
      if (response.ok && tokenData.access_token) {
        console.log('✅ Successfully refreshed YouTube token');
        
        // Update the account with new token
        const updatedAccount = {
          ...account,
          accessToken: tokenData.access_token,
          connectedAt: new Date().toISOString()
        };

        const updatedAccounts = connectedAccounts.map(acc =>
          acc.id === accountId ? updatedAccount : acc
        );

        setConnectedAccounts(updatedAccounts);
        saveAccountsToStorage(updatedAccounts);

        if (activeAccountId === accountId) {
          setActiveAccount(updatedAccount);
        }

        // Store new token with expiry
        const expiresIn = tokenData.expires_in || 3600;
        const newExpiry = Date.now() + expiresIn * 1000;
        setUserData(`yt_access_token_${accountId}`, tokenData.access_token);
        setUserData(`yt_token_expiry_${accountId}`, newExpiry.toString());

        // Update the stored customer social account with new token
        await updateStoredToken(accountId, tokenData.access_token, expiresIn);

        // Schedule next automatic refresh (5 minutes before expiry)
        scheduleTokenRefresh(accountId, newExpiry);
        console.log(`⏰ Next auto-refresh scheduled at: ${new Date(newExpiry - 5 * 60 * 1000).toLocaleString()}`);

        return true;
      } else {
        console.error('❌ Failed to refresh YouTube token:', tokenData);
        return false;
      }
    } catch (error) {
      console.error('❌ Error refreshing YouTube token:', error);
      return false;
    }
  };

  // Schedule automatic token refresh before expiry
  const scheduleTokenRefresh = (accountId, expiryTime) => {
    // Clear existing timer
    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
    }

    // Calculate when to refresh (5 minutes before expiry)
    const refreshTime = expiryTime - Date.now() - (5 * 60 * 1000);
    
    // Don't schedule if already expired or too soon
    if (refreshTime <= 0) {
      console.log('⚠️ Token expires too soon, refreshing immediately...');
      refreshYouTubeToken(accountId);
      return;
    }

    console.log(`⏰ Scheduled token refresh in ${Math.round(refreshTime / 1000 / 60)} minutes`);
    
    const timer = setTimeout(() => {
      console.log('⏰ Auto-refreshing YouTube token...');
      refreshYouTubeToken(accountId);
    }, refreshTime);

    setTokenRefreshTimer(timer);
  };

  // Update stored token in database with error handling
  const updateStoredToken = async (accountId, newToken, expiresIn) => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      const customerId = currentUser.userId || currentUser.id || currentUser._id || currentUser.customer_id;
      
      if (!customerId) {
        console.warn('No customer ID found for token update');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'youtube',
          platformUserId: accountId,
          accessToken: newToken,
          tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
          lastTokenRefresh: new Date().toISOString()
        })
      });

      const result = await response.json();
      if (result.success) {
        console.log('✅ Updated stored YouTube token in database');
      } else {
        console.warn('Failed to update stored token:', result.error);
      }
    } catch (error) {
      console.warn('Error updating stored token:', error);
    }
  };

  // Check and refresh token if needed before operations
  const ensureValidToken = async (accountId) => {
    try {
      const account = connectedAccounts.find(acc => acc.id === accountId);
      if (!account) return false;

      const storedExpiry = getUserData(`yt_token_expiry_${accountId}`);
      const tokenExpired = !storedExpiry || Date.now() >= parseInt(storedExpiry, 10) - 300000; // Refresh 5 minutes before expiry

      if (tokenExpired && account.refreshToken) {
        console.log('🔄 Token expired or expiring soon, attempting refresh...');
        const refreshed = await refreshYouTubeToken(accountId);
        if (!refreshed) {
          setSafeErrorState('Failed to refresh YouTube token. Please reconnect your YouTube account.');
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking token validity:', error);
      return false;
    }
  };

  // Update fetchChannelInfo to check token validity with improved error handling
  const fetchChannelInfo = async () => {
    if (!activeAccount) return;
    
    try {
      // Ensure we have a valid token before making API calls
      const tokenValid = await ensureValidToken(activeAccount.id);
      if (!tokenValid) {
        return;
      }
      
      const response = await window.gapi.client.youtube.channels.list({
        part: 'snippet,contentDetails,statistics',
        mine: true
      });
      
      if (response.result.items && response.result.items.length > 0) {
        const channel = response.result.items[0];
        setChannelInfo(channel);
        // Call onData with correct structure
        if (typeof props?.onData === 'function') {
          try {
            props.onData({
              channelInfo: {
                statistics: {
                  subscriberCount: channel.statistics?.subscriberCount,
                  viewCount: channel.statistics?.viewCount,
                  videoCount: channel.statistics?.videoCount
                }
              }
            });
          } catch (callbackError) {
            console.warn('Error calling onData callback:', callbackError);
          }
        }
        await fetchChannelData(channel);
      } else {
        setSafeErrorState('No YouTube channel found for this account');
      }
    } catch (err) {
      console.error('YouTube API error:', err);
      
      // If it's an auth error, try to refresh token
      if (err.status === 401 || err.result?.error?.code === 401) {
        console.log('🔄 Authentication error, attempting token refresh...');
        const refreshed = await refreshYouTubeToken(activeAccount.id);
        if (refreshed) {
          // Retry the request with new token
          try {
            const response = await window.gapi.client.youtube.channels.list({
              part: 'snippet,contentDetails,statistics',
              mine: true
            });
            
            if (response.result.items && response.result.items.length > 0) {
              const channel = response.result.items[0];
              setChannelInfo(channel);
              await fetchChannelData(channel);
              return;
            }
          } catch (retryErr) {
            console.error('Retry failed:', retryErr);
          }
        }
        setSafeErrorState('YouTube access token expired. Please reconnect your YouTube account.');
      } else {
        setSafeErrorState(err);
      }
    }
  };

  // Update handleUpload to check token validity with improved error handling
  const handleUpload = async () => {
    setUploadError(null);
    setUploadSuccess(null);

    if (!uploadFile) {
      setSafeUploadError('Please select a video or photo file.');
      return;
    }
    if (!uploadCaption.trim()) {
      setSafeUploadError('Please enter a caption.');
      return;
    }

    try {
      // Ensure we have a valid token before uploading
      const tokenValid = await ensureValidToken(activeAccount.id);
      if (!tokenValid) {
        setSafeUploadError('YouTube token expired. Please reconnect your account.');
        return;
      }

      const allowedTypes = [
        'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv', 'video/webm', 'video/mpeg',
        'image/jpeg', 'image/png', 'image/gif'
      ];
      if (!allowedTypes.includes(uploadFile.type)) {
        setSafeUploadError('Unsupported file type. Please select a supported video (mp4, mov, avi, wmv, flv, webm, mpeg) or image (jpg, png, gif). MKV is not supported by YouTube.');
        return;
      }

      setUploading(true);
      setUploadProgress(0);

      let fileToUpload = uploadFile;
      let mimeType = uploadFile.type;

      if (uploadFile.type.startsWith('image/')) {
        setUploadProgress(5);
        fileToUpload = await imageToVideo(uploadFile);
        mimeType = 'video/webm';
        setUploadProgress(15);
      }

      const metadata = {
        snippet: {
          title: uploadCaption,
          description: uploadCaption,
        },
        status: {
          privacyStatus: 'public'
        }
      };

      const boundary = '-------314159265358979323846';
      const delimiter = "\r\n--" + boundary + "\r\n";
      const close_delim = "\r\n--" + boundary + "--";

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const fileData = e.target.result;
          const base64Data = btoa(
            new Uint8Array(fileData)
              .reduce((data, byte) => data + String.fromCharCode(byte), '')
          );

          const multipartRequestBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + mimeType + '\r\n' +
            'Content-Transfer-Encoding: base64\r\n' +
            '\r\n' +
            base64Data +
            close_delim;

          const request = window.gapi.client.request({
            path: '/upload/youtube/v3/videos',
            method: 'POST',
            params: {
              part: 'snippet,status'
            },
            headers: {
              'Content-Type': 'multipart/related; boundary="' + boundary + '"'
            },
            body: multipartRequestBody
          });

          request.execute(async (response) => {
            try {
              if (response && response.id) {
                // setUploadSuccess('Upload successful! Your video is being processed by YouTube.'); // Removed upload
                // setUploadFile(null); // Removed upload
                // setUploadCaption(''); // Removed upload
                setUploadProgress(0);
                await fetchChannelInfo();
              } else {
                setSafeUploadError(response && response.error ? response.error : 'Upload failed with unknown error');
              }
            } catch (executeError) {
              setSafeUploadError(executeError);
            } finally {
              setUploading(false);
            }
          });
        } catch (readerError) {
          setSafeUploadError(readerError);
          setUploading(false);
        }
      };
      reader.onerror = () => {
        setSafeUploadError('Failed to read file for upload.');
        setUploading(false);
      };
      reader.readAsArrayBuffer(fileToUpload);
    } catch (err) {
      console.error('Upload error:', err);
      // Handle auth errors during upload
      if (err.status === 401 || (err.result && err.result.error && err.result.error.code === 401)) {
        const refreshed = await refreshYouTubeToken(activeAccount.id);
        if (refreshed) {
          setSafeUploadError('Token was refreshed. Please try uploading again.');
        } else {
          setSafeUploadError('Upload failed due to expired token. Please reconnect your YouTube account.');
        }
      } else {
        setSafeUploadError(err);
      }
      setUploading(false);
    }
  };

  // Add token refresh button to the UI
  const renderTokenStatus = () => {
    if (!activeAccount) return null;

    const storedExpiry = getUserData(`yt_token_expiry_${activeAccount.id}`);
    const tokenExpired = !storedExpiry || Date.now() >= parseInt(storedExpiry, 10);
    const tokenExpiringSoon = storedExpiry && Date.now() >= parseInt(storedExpiry, 10) - 600000; // 10 minutes
    const hasRefreshToken = !!activeAccount.refreshToken;

    return (
      <div className="mt-4 p-3 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
        <h6 className="font-medium text-green-800 mb-2">🔑 Token Status</h6>
        <div className="text-sm text-green-700 space-y-1">
          <p>📅 <strong>Token Status:</strong> {tokenExpired ? '❌ Expired' : tokenExpiringSoon ? '⚠️ Expiring Soon' : '✅ Valid'}</p>
          {storedExpiry && (
            <p>⏰ <strong>Expires:</strong> {new Date(parseInt(storedExpiry, 10)).toLocaleString()}</p>
          )}
          {hasRefreshToken && (
            <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded text-xs">
              <p className="flex items-center">
                <RefreshCw className="h-3 w-3 mr-1 text-green-600" />
                <strong className="text-green-800">✅ Auto-Refresh Enabled:</strong>
                <span className="ml-1 text-green-700">Token will refresh automatically before expiry</span>
              </p>
            </div>
          )}
          <div className="mt-2 space-x-2">
            {(tokenExpired || tokenExpiringSoon) && (
              <button
                onClick={() => refreshYouTubeToken(activeAccount.id)}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                🔄 Refresh Now
              </button>
            )}
            {!hasRefreshToken && (
              <button
                onClick={() => {
                  if (tokenClient) {
                    tokenClient.requestAccessToken({ prompt: 'consent' });
                  }
                }}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                🔑 Enable Auto-Refresh
              </button>
            )}
          </div>
          {!hasRefreshToken && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <strong>⚠️ Auto-refresh disabled:</strong> Click "Enable Auto-Refresh" to allow automatic token renewal. This will keep your session active indefinitely.
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render account selector with improved error handling
  const renderAccountSelector = () => {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-700 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Connected YouTube Accounts ({connectedAccounts.length})
          </h4>
          <button
            onClick={handleSignIn}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
        </div>
        
        {connectedAccounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedAccounts.map((account) => (
              <div
                key={account.id}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  activeAccountId === account.id
                    ? 'border-red-500 bg-red-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => switchAccount(account.id)}
              >
                <div className="flex items-center space-x-3">
                  {account.picture && (
                    <img
                      src={account.picture.url}
                      alt={account.name}
                      className="w-12 h-12 rounded-full"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900 truncate">{account.name}</h5>
                      {activeAccountId === account.id && (
                        <UserCheck className="h-4 w-4 text-red-600" />
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
                      removeAccount(account.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Helper: Convert image file to a short MP4 video Blob using canvas and MediaRecorder
  const imageToVideo = async (imageFile) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const stream = canvas.captureStream(30);
        const recordedChunks = [];
        const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };
        recorder.onstop = () => {
          const videoBlob = new Blob(recordedChunks, { type: 'video/webm' });
          resolve(videoBlob);
        };

        recorder.start();
        setTimeout(() => {
          recorder.stop();
        }, 2000);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(imageFile);
    });
  };

  // Removed upload handlers
  /*
  const handleFileChange = (e) => {
    setUploadFile(e.target.files[0]);
    setUploadError(null);
    setUploadSuccess(null);
  };

  const handleCaptionChange = (e) => {
    setUploadCaption(e.target.value);
  };
  */

  // Fetch analytics with improved error handling
  const fetchAnalytics = async () => {
    if (!channelInfo || !activeAccount) return;

    // setLoadingAnalytics(true); // Removed analytics
    try {
      try {
        await fetchYouTubeAnalytics();
      } catch (analyticsError) {
        console.warn('YouTube Analytics API failed, using fallback method:', analyticsError);
        await fetchVideoBasedAnalytics();
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setSafeErrorState('Failed to fetch analytics data. Using available video data instead.');
      await fetchVideoBasedAnalytics();
    } finally {
      // setLoadingAnalytics(false); // Removed analytics
    }
  };

  const fetchYouTubeAnalytics = async () => {
    const endDate = new Date();
    const startDate = subDays(endDate, 30);

    try {
      const response = await window.gapi.client.request({
        path: 'https://youtubeanalytics.googleapis.com/v2/reports',
        params: {
          ids: `channel==${channelInfo.id}`,
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd'),
          metrics: 'views,subscribersGained,subscribersLost,estimatedMinutesWatched',
          dimensions: 'day'
        }
      });

      // Check for error response
      if (response.result && response.result.error) {
        throw new Error(response.result.error.message || 'YouTube Analytics API error');
      }

      if (response.result && response.result.rows) {
        const processedData = processYouTubeAnalytics(response.result);
        // setAnalyticsData(processedData); // Removed analytics
      } else {
        throw new Error('No analytics data available');
      }
    } catch (err) {
      console.error('YouTube Analytics API error:', err);
      throw err; // Let parent handler fallback to video-based analytics
    }
  };

  const fetchVideoBasedAnalytics = async () => {
    try {
      const uploadsPlaylistId = channelInfo.contentDetails.relatedPlaylists.uploads;
      const videosResponse = await window.gapi.client.youtube.playlistItems.list({
        part: 'snippet',
        playlistId: uploadsPlaylistId,
        maxResults: 50
      });

      if (!videosResponse.result.items || videosResponse.result.items.length === 0) {
        throw new Error('No videos found');
      }

      const videoIds = videosResponse.result.items.map(item => item.snippet.resourceId.videoId);
      
      const statsResponse = await window.gapi.client.youtube.videos.list({
        part: 'statistics,snippet',
        id: videoIds.join(',')
      });

      if (statsResponse.result.items) {
        const processedData = processVideoBasedAnalytics(statsResponse.result.items);
        console.log('Processed fallback video-based analytics data:', processedData);
        // setAnalyticsData(processedData); // Removed analytics
      }
    } catch (err) {
      console.error('Video-based analytics error:', err);
      const fallbackData = createFallbackAnalytics();
      // setAnalyticsData(fallbackData); // Removed analytics
    }
  };

  const processVideoBasedAnalytics = (videos) => {
    const endDate = new Date();
    const result = {
      views: [],
      subscribers: [],
      watchTime: []
    };

    for (let i = 29; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const videosUpToDate = videos.filter(video => {
        const publishDate = new Date(video.snippet.publishedAt);
        return publishDate <= date;
      });

      const totalViews = videosUpToDate.reduce((sum, video) => {
        return sum + parseInt(video.statistics.viewCount || 0);
      }, 0);

      const dailyViews = i === 29 ? totalViews : Math.max(0, totalViews - (result.views[result.views.length - 1]?.value || 0));

      result.views.push({
        date: dateStr,
        value: dailyViews
      });

      const currentSubscribers = parseInt(channelInfo.statistics.subscriberCount || 0);
      result.subscribers.push({
        date: dateStr,
        value: currentSubscribers
      });

      const estimatedWatchTime = Math.round(dailyViews * 2 / 60);
      result.watchTime.push({
        date: dateStr,
        value: estimatedWatchTime
      });
    }

    return result;
  };

  const createFallbackAnalytics = () => {
    const endDate = new Date();
    const result = {
      views: [],
      subscribers: [],
      watchTime: []
    };

    const currentViews = parseInt(channelInfo.statistics.viewCount || 0);
    const currentSubscribers = parseInt(channelInfo.statistics.subscriberCount || 0);

    for (let i = 29; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayProgress = (29 - i) / 29;
      const estimatedDailyViews = Math.round(currentViews * 0.001 * (0.5 + dayProgress * 0.5));
      const estimatedSubscribers = Math.round(currentSubscribers * (0.98 + dayProgress * 0.02));
      const estimatedWatchTime = Math.round(estimatedDailyViews * 2 / 60);

      result.views.push({
        date: dateStr,
        value: estimatedDailyViews
      });

      result.subscribers.push({
        date: dateStr,
        value: estimatedSubscribers
      });

      result.watchTime.push({
        date: dateStr,
        value: estimatedWatchTime
      });
    }

    return result;
  };

  const processYouTubeAnalytics = (data) => {
    const { columnHeaders, rows } = data;
    
    const dayIndex = columnHeaders.findIndex(col => col.name === 'day');
    const viewsIndex = columnHeaders.findIndex(col => col.name === 'views');
    const subscribersGainedIndex = columnHeaders.findIndex(col => col.name === 'subscribersGained');
    const subscribersLostIndex = columnHeaders.findIndex(col => col.name === 'subscribersLost');
    const watchTimeIndex = columnHeaders.findIndex(col => col.name === 'estimatedMinutesWatched');
    
    const result = {
      views: [],
      subscribers: [],
      watchTime: []
    };
    
    let cumulativeSubscribers = parseInt(channelInfo.statistics.subscriberCount) || 0;
    
    rows.forEach(row => {
      const date = row[dayIndex];
      const views = row[viewsIndex] || 0;
      const gained = row[subscribersGainedIndex] || 0;
      const lost = row[subscribersLostIndex] || 0;
      const watchTime = row[watchTimeIndex] || 0;
      
      const netChange = gained - lost;
      cumulativeSubscribers += netChange;
      
      result.views.push({
        date: date,
        value: views
      });
      
      result.subscribers.push({
        date: date,
        value: cumulativeSubscribers
      });
      
      result.watchTime.push({
        date: date,
        value: Math.round(watchTime / 60)
      });
    });
    
    console.log('Analytics columns:', columnHeaders);
    console.log('Analytics rows:', rows);

    return result;
  };



  // Load connected accounts from server (for development)
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`);
        const data = await response.json();
        
        if (data.success && data.accounts) {
          const accounts = data.accounts.filter(acc => acc.platform === 'youtube');
          setConnectedAccounts(accounts);
          setUserData('yt_connected_accounts', accounts);
          
          if (accounts.length > 0) {
            setActiveAccountId(accounts[0].id);
            setActiveAccount(accounts[0]);
            setUserData('yt_active_account_id', accounts[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load accounts from server:', err);
      }
    };

    // Uncomment to enable loading accounts from server
    // loadAccounts();
  }, []);

  // Restore active account token if available with error handling
  useEffect(() => {
    if (gapiClientReady && gisLoaded && activeAccount) {
      try {
        const storedExpiry = getUserData(`yt_token_expiry_${activeAccount.id}`);
        if (activeAccount.accessToken && storedExpiry && Date.now() < parseInt(storedExpiry, 10)) {
          window.gapi.client.setToken({ access_token: activeAccount.accessToken });
          // Only fetch channel info if not already loaded
          if (!channelInfo) fetchChannelInfo();
          
          // Schedule automatic token refresh for this account
          const expiryTime = parseInt(storedExpiry, 10);
          scheduleTokenRefresh(activeAccount.id, expiryTime);
        }
      } catch (error) {
        console.warn('Error restoring active account token:', error);
      }
    }

    // Cleanup timer on unmount or account change
    return () => {
      if (tokenRefreshTimer) {
        clearTimeout(tokenRefreshTimer);
      }
    };
  }, [gapiClientReady, gisLoaded, activeAccount]);

  // Initialize token client with error handling
  useEffect(() => {
    if (gisLoaded) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: SCOPES,
          // Add these parameters for offline access and refresh tokens
          access_type: 'offline',
          prompt: 'consent', // Force consent to get refresh token
          callback: (tokenResponse) => {
            try {
              if (tokenResponse && tokenResponse.access_token) {
                handleNewToken(tokenResponse);
              }
            } catch (callbackError) {
              console.error('Error in token callback:', callbackError);
              setSafeErrorState('Failed to process authentication response. Please try again.');
            }
          },
        });
        setTokenClient(client);
      } catch (error) {
        console.error('Error initializing token client:', error);
        setSafeErrorState('Failed to initialize authentication. Please refresh the page and try again.');
      }
    }
  }, [gisLoaded]);

  // Helper to fetch and store subscriber count for each YT account with error handling



  // Update renderConnectedState to include token status and historical charts
  const renderConnectedState = () => (
    <div className="space-y-6">
      {renderAccountSelector()}
      
      {activeAccount && (
        <>
          <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
            <div className="flex items-center space-x-3">
              {activeAccount.picture && (
                <img 
                  src={activeAccount.picture.url} 
                  alt="Profile"
                  className="w-10 h-10 rounded-full"
                />
              )}
              <div>
                <p className="font-medium">Active Account: {activeAccount.name}</p>
                <p className="text-sm text-gray-600">{activeAccount.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOutAll}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors text-sm"
            >
              Disconnect All
            </button>
          </div>

          {renderTokenStatus()}

          {channelInfo && (
            <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-2xl p-6">
              <div className="flex items-center space-x-4 mb-6">
                <img
                  src={channelInfo.snippet.thumbnails.default.url}
                  alt="Channel thumbnail"
                  className="w-20 h-20 rounded-full border-4 border-red-200"
                />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{channelInfo.snippet.title}</h2>
                  <p className="text-gray-700 text-sm">{channelInfo.snippet.description}</p>
                </div>
                <div className="ml-auto">
                  <button
                    onClick={() => storeHistoricalSnapshot(channelInfo.id, channelInfo.snippet.title, {
                      subscriberCount: channelInfo.statistics?.subscriberCount,
                      videoCount: channelInfo.statistics?.videoCount,
                      viewCount: channelInfo.statistics?.viewCount,
                      totalViews: channelInfo.statistics?.viewCount,
                      totalSubscribers: channelInfo.statistics?.subscriberCount,
                      shortsCount,
                      videosCount
                    })}
                    className="flex items-center space-x-2 px-3 py-2 bg-cyan-100 text-cyan-700 rounded-lg hover:bg-cyan-200 transition-colors text-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Capture Snapshot</span>
                  </button>
                </div>
              </div>
              
              {/* Enhanced Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Subscribers */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <Users className="h-5 w-5 text-red-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Subscribers</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {channelInfo.statistics.subscriberCount && channelInfo.statistics.subscriberCount !== '0' 
                      ? parseInt(channelInfo.statistics.subscriberCount).toLocaleString()
                      : 'Hidden'
                    }
                  </div>
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>Growing</span>
                  </div>
                </div>

                {/* Total Views */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Eye className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Total Views</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {channelInfo.statistics.viewCount 
                      ? parseInt(channelInfo.statistics.viewCount).toLocaleString()
                      : '0'
                    }
                  </div>
                  <div className="flex items-center text-sm text-blue-600">
                    <Eye className="h-4 w-4 mr-1" />
                    <span>All time</span>
                  </div>
                </div>

                {/* Videos */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Play className="h-5 w-5 text-purple-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Videos</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {videosCount.toLocaleString()}
                  </div>
                  <div className="flex items-center text-sm text-purple-600">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Long form</span>
                  </div>
                </div>

                {/* Shorts */}
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Youtube className="h-5 w-5 text-orange-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-600">Shorts</span>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {shortsCount.toLocaleString()}
                  </div>
                  <div className="flex items-center text-sm text-orange-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>Short form</span>
                  </div>
                </div>
              </div>

            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Youtube className="h-6 w-6 text-red-600" />
                <span>Latest Videos</span>
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-sm font-medium">
                  {channelInfo && channelInfo.statistics.videoCount 
                    ? parseInt(channelInfo.statistics.videoCount).toLocaleString()
                    : videos.length
                  }
                </span>
              </h3>
            </div>
            
            <div className="grid gap-6">
              {videos.length > 0 ? videos.map(video => {
                const videoId = video.snippet.resourceId.videoId;
                const analytics = videoAnalytics[videoId];
                const isLoadingAnalytics = loadingVideoAnalytics[videoId];
                const showingAnalytics = showAnalyticsFor === videoId;
                
                return (
                  <div key={video.id} className="bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200">
                    {/* Video Header */}
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        <div className="relative">
                          <img
                            src={video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default.url}
                            alt={video.snippet.title}
                            className="w-40 h-28 object-cover rounded-lg shadow-sm"
                            onError={e => {
                              e.target.onerror = null;
                              e.target.src = "https://via.placeholder.com/160x90?text=No+Image";
                            }}
                          />
                          <div className="absolute top-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                            <Youtube className="h-3 w-3 inline mr-1" />
                            Video
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2 leading-tight">
                            {video.snippet.title}
                          </h4>
                          <p className="text-sm text-gray-600 mb-3">
                            Published {new Date(video.snippet.publishedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </p>
                          
                          {/* Quick Stats Preview */}
                          {analytics && (
                            <div className="flex items-center space-x-6 mb-3">
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <Eye className="h-4 w-4" />
                                <span className="font-medium">{analytics.views.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <ThumbsUp className="h-4 w-4" />
                                <span className="font-medium">{analytics.likes.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-sm text-gray-600">
                                <MessageSquare className="h-4 w-4" />
                                <span className="font-medium">{analytics.comments.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-1 text-sm">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="font-medium text-green-600">{analytics.engagementRate}%</span>
                              </div>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                if (!analytics) {
                                  fetchSingleVideoAnalytics(videoId);
                                }
                                setShowAnalyticsFor(showingAnalytics ? null : videoId);
                              }}
                              disabled={isLoadingAnalytics}
                              className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                            >
                              {isLoadingAnalytics ? (
                                <>
                                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                  Loading...
                                </>
                              ) : showingAnalytics ? (
                                <>
                                  <ChevronUp className="h-4 w-4 mr-2" />
                                  Hide Analytics
                                </>
                              ) : (
                                <>
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  View Analytics
                                </>
                              )}
                            </button>
                            
                            <button
                              onClick={() => window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank')}
                              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View on YouTube
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Analytics Panel */}
                    {showingAnalytics && analytics && (
                      <div className="border-t border-gray-200 bg-gray-50">
                        <YouTubePostAnalytics analytics={analytics} />
                      </div>
                    )}
                  </div>
                );
              }) : (
                <div className="text-center py-16">
                  <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                    <Youtube className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No videos found</h3>
                  <p className="text-gray-500">Upload your first video to YouTube to see it here.</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Notify parent about connection status with error handling
  useEffect(() => {
    if (props.onConnectionStatusChange) {
      try {
        // Connected if at least one account and token not expired
        const isConnected =
          connectedAccounts.length > 0 &&
          connectedAccounts.some(acc => {
            const expiry = getUserData(`yt_token_expiry_${acc.id}`);
            return acc.accessToken && expiry && Date.now() < parseInt(expiry, 10);
          });
        props.onConnectionStatusChange(isConnected);
      } catch (error) {
        console.warn('Error notifying parent about connection status:', error);
      }
    }
  }, [connectedAccounts, activeAccount]);

  // Add a helper to detect token expiration errors
  const isTokenExpiredError = (err) => {
    if (!err) return false;
    const errorMsg = getErrorMessage(err).toLowerCase();
    // Google API error codes for expired/invalid tokens
    if (
      errorMsg.includes('invalid_grant') ||
      errorMsg.includes('invalid_token') ||
      errorMsg.includes('token_expired') ||
      errorMsg.includes('token') ||
      errorMsg.includes('expired') ||
      errorMsg.includes('invalid') ||
      errorMsg.includes('unauthorized') ||
      errorMsg.includes('401')
    ) {
      return true;
    }
    return false;
  };

  // Add a user-friendly error renderer
  const renderError = () => {
    if (!error) return null;
    const expired = isTokenExpiredError(error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <span className="text-lg font-semibold text-red-800">
            {expired ? 'YouTube Session Expired' : 'YouTube Integration Error'}
          </span>
        </div>
        <p className="text-red-700 mb-4">
          {expired
            ? 'Your YouTube session has expired. Please refresh your token or reconnect your account to continue.'
            : error}
        </p>
        <div className="flex space-x-3">
          {expired && (
            <button
              onClick={() => {
                setError(null);
                handleSignIn();
              }}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Reconnect YouTube Account
            </button>
          )}
          <button
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700 text-sm font-medium border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
          >
            Dismiss Error
          </button>
        </div>
      </div>
    );
  };

  // Enhanced error boundary wrapper for the entire component
  const renderWithErrorBoundary = (content) => {
    try {
      return content();
    } catch (renderError) {
      console.error('YouTube Integration render error:', renderError);
      setSafeErrorState('Component rendering failed. Please refresh the page and try again.');
      return (
        <div className="border rounded-lg p-6 mb-6 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="text-center py-12">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900 mb-2">YouTube Integration Error</h3>
            <p className="text-red-700 mb-4">Something went wrong with the YouTube integration.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }
  };

  return renderWithErrorBoundary(() => {
    // Handle different error states gracefully
    if (error) {
      return (
        <div className="border rounded-lg p-6 mb-6 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center space-x-3 mb-4">
            <Youtube className="h-6 w-6 text-red-600" />
            <h3 className="font-medium text-lg">YouTube Integration</h3>
          </div>
          {renderError()}
        </div>
      );
    }

    if (!gapiLoaded || !gisLoaded) {
      return (
        <div className="border rounded-lg p-6 mb-6 bg-gradient-to-r from-red-50 to-pink-50">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
              <p className="text-gray-600">Loading YouTube integration...</p>
              <p className="text-sm text-gray-500 mt-2">
                If this takes too long, please refresh the page
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="border rounded-lg p-6 mb-6 bg-gradient-to-r from-red-50 to-pink-50">
        <div className="flex items-center space-x-3 mb-4">
          <Youtube className="h-6 w-6 text-red-600" />
          <h3 className="font-medium text-lg">YouTube Integration</h3>
        </div>

        <div className="space-y-6">
          {connectedAccounts.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 rounded-2xl mb-4">
                <Youtube className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect YouTube Account</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your YouTube accounts to manage your channels and access video analytics with historical data tracking.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> For detailed analytics, you may need to enable YouTube Analytics API in your Google Cloud Console. Historical data will be captured automatically.
                </p>
              </div>
              <button
                onClick={handleSignIn}
                className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 flex items-center space-x-3 mx-auto font-medium"
              >
                <Youtube className="h-5 w-5" />
                <span>Connect YouTube Account</span>
              </button>
            </div>
          ) : (
            renderConnectedState()
          )}
        </div>
      </div>
    );
  });
}

export default YouTubeIntegration;