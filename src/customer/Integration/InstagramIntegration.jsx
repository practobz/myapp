import React, { useState, useEffect } from 'react';
import { Instagram, TrendingUp, BarChart3, ExternalLink, CheckCircle, AlertCircle, Loader2, Users, Heart, MessageCircle, Eye, Plus, Settings, ChevronDown, ChevronRight, UserCheck, Trash2, Calendar, LayoutGrid, Edit2, X } from 'lucide-react';
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

  // State for post comments
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  
  // State for adding/editing comments
  const [addingComment, setAddingComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [processingComment, setProcessingComment] = useState(false);
  
  // State for viewing comment details
  const [viewingCommentDetails, setViewingCommentDetails] = useState(null);
  const [commentDetails, setCommentDetails] = useState(null);
  const [loadingCommentDetails, setLoadingCommentDetails] = useState(false);

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
          const instagramAccounts = data.accounts
            .filter(acc => acc.platform === 'instagram' && acc.customerId === customerId)
            .map(acc => {
              console.log('📦 Backend Instagram account data:', {
                platformUserId: acc.platformUserId,
                username: acc.username,
                instagramDataUsername: acc.instagramData?.username,
                name: acc.name,
                hasAccessToken: !!acc.accessToken,
                hasPageToken: !!acc.pages?.[0]?.accessToken
              });
              
              return {
                id: acc.platformUserId,
                pageId: acc.facebookPageId,
                pageName: acc.name,
                profile: {
                  username: acc.instagramData?.username || acc.username,
                  profile_picture_url: acc.profilePicture,
                  followers_count: acc.instagramData?.followersCount,
                  media_count: acc.instagramData?.mediaCount,
                  biography: acc.instagramData?.biography,
                  website: acc.instagramData?.website
                },
                media: [],
                userAccessToken: acc.accessToken,
                pageAccessToken: acc.pages?.[0]?.accessToken,
                connected: true,
                connectedAt: acc.connectedAt,
                tokenExpiresAt: acc.tokenExpiresAt || null
              };
            });
          
          console.log(`✅ Retrieved ${instagramAccounts.length} Instagram accounts from backend`);
          return instagramAccounts;
        }
      } catch (err) {
        console.warn('Failed to fetch Instagram accounts from backend:', err);
      }
      return null;
    };

    // Helper to hydrate backend accounts with live profile/media using direct Graph API
    const hydrateInstagramAccounts = async (accounts) => {
      if (!accounts || accounts.length === 0) {
        console.log('ℹ️ No accounts to hydrate');
        return accounts;
      }
      
      console.log(`🔄 Starting hydration of ${accounts.length} Instagram accounts...`);
      
      try {
        const hydrated = await Promise.all(accounts.map(async (acc) => {
          try {
            // Use direct Graph API calls instead of FB SDK to avoid session issues
            const pageToken = acc.pageAccessToken || acc.accessToken;
            
            console.log(`🔄 Hydrating account ${acc.id}:`, {
              hasPageToken: !!acc.pageAccessToken,
              hasUserToken: !!acc.accessToken,
              usingToken: pageToken ? pageToken.substring(0, 20) + '...' : 'none'
            });
            
            if (!pageToken) {
              console.warn(`⚠️ No access token for account ${acc.id}, using stored data`);
              return acc;
            }
            
            // Fetch profile data
            const profileUrl = `https://graph.facebook.com/v18.0/${acc.id}?fields=id,username,media_count,profile_picture_url,biography,website,followers_count&access_token=${pageToken}`;
            console.log(`📡 Fetching profile for ${acc.id}...`);
            const profileResponse = await fetch(profileUrl);
            const profileData = await profileResponse.json();
            
            // Fetch media data
            const mediaUrl = `https://graph.facebook.com/v18.0/${acc.id}/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${pageToken}`;
            console.log(`📡 Fetching media for ${acc.id}...`);
            const mediaResponse = await fetch(mediaUrl);
            const mediaData = await mediaResponse.json();
            
            // Fetch video/reel insights for views count
            let mediaWithInsights = mediaData.data || [];
            if (mediaWithInsights.length > 0) {
              console.log(`🎬 Hydration: Fetching insights for ${mediaWithInsights.length} media items for account ${acc.id}...`);
              mediaWithInsights = await Promise.all(mediaWithInsights.map(async (media) => {
                if (media.media_type === 'VIDEO') {
                  // Check if plays field is already present from the initial query
                  if (media.plays !== undefined && media.plays !== null) {
                    console.log(`✅ Hydration: Video ${media.id} already has plays: ${media.plays}`);
                    return {
                      ...media,
                      video_views: media.plays
                    };
                  }
                  
                  try {
                    console.log(`📹 Hydration: Fetching insights for video ${media.id} (product_type: ${media.media_product_type})...`);
                    
                    // Use the new 'views' metric (available for FEED, REELS, STORY)
                    const metricsToFetch = 'views,total_interactions,reach';
                    
                    // Try insights API first
                    const insightsUrl = `https://graph.facebook.com/v18.0/${media.id}/insights?metric=${metricsToFetch}&access_token=${pageToken}`;
                    const insightsResponse = await fetch(insightsUrl);
                    const insightsData = await insightsResponse.json();
                    
                    console.log(`📊 Hydration insights for ${media.id}:`, insightsData);
                    
                    let viewsCount = 0;
                    
                    if (insightsData.data && !insightsData.error) {
                      const viewsMetric = insightsData.data.find(m => 
                        m.name === 'views' ||   // New standard metric
                        m.name === 'reach'       // Fallback
                      );
                      viewsCount = viewsMetric?.values?.[0]?.value || 0;
                      console.log(`✅ Hydration: Found views for ${media.id}: ${viewsCount} (metric: ${viewsMetric?.name})`);
                    } else if (insightsData.error) {
                      const errorMsg = insightsData.error.message || '';
                      console.warn(`⚠️ Hydration insights error for ${media.id}:`, errorMsg);
                      
                      // Check if it's a permissions error
                      if (errorMsg.includes('permission') || insightsData.error.code === 10) {
                        console.error(`❌ Missing instagram_manage_insights permission`);
                        return { ...media, video_views: -1, views_error: 'Missing permissions' };
                      }
                      
                      // If deprecated metric error, try views metric
                      if (errorMsg.includes('plays metric') || errorMsg.includes('not supported') || errorMsg.includes('clips_replays_count')) {
                        console.warn(`⚠️ Hydration: Deprecated metric error, trying 'views' metric`);
                        try {
                          const altMetricsUrl = `https://graph.facebook.com/v18.0/${media.id}/insights?metric=views,reach&access_token=${pageToken}`;
                          const altResponse = await fetch(altMetricsUrl);
                          const altData = await altResponse.json();
                          
                          if (altData.data && !altData.error) {
                            const viewsMetric = altData.data.find(m => m.name === 'views' || m.name === 'reach');
                            viewsCount = viewsMetric?.values?.[0]?.value || 0;
                            console.log(`✅ Hydration: Using ${viewsMetric?.name} metric for views: ${viewsCount}`);
                          }
                        } catch (altError) {
                          console.warn(`⚠️ Hydration: Could not fetch alternative metrics`);
                        }
                      }
                    }
                    
                    return { ...media, video_views: viewsCount };
                  } catch (err) {
                    console.error(`❌ Hydration: Could not fetch insights for media ${media.id}:`, err);
                    return media;
                  }
                }
                return media;
              }));
              
              console.log(`✅ Hydration insights complete. Videos with views:`, 
                mediaWithInsights.filter(m => m.video_views > 0).length
              );
            }
            
            // Check for API errors
            if (profileData.error) {
              console.error(`❌ Profile API error for ${acc.id}:`, profileData.error);
              return acc; // Return original account with stored data
            }
            
            if (mediaData.error) {
              console.warn(`⚠️ Media API error for ${acc.id}:`, mediaData.error);
              // Continue with profile data even if media fails
            }
            
            console.log(`✅ Successfully hydrated ${acc.id}:`, {
              username: profileData.username,
              followers: profileData.followers_count,
              media: profileData.media_count
            });
            
            return {
              ...acc,
              profile: profileData,
              media: mediaWithInsights
            };
          } catch (error) {
            console.error(`❌ Failed to hydrate account ${acc.id}:`, error);
            return acc; // Return original account with stored data on error
          }
        }));
        
        console.log(`✅ Hydration complete for ${hydrated.length} Instagram accounts`);
        return hydrated;
      } catch (error) {
        console.error('❌ Error during hydration process:', error);
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

  // Helper function to fetch video/reel insights (plays/views)
  const fetchMediaInsights = async (mediaItems, accessToken) => {
    if (!mediaItems || mediaItems.length === 0) return mediaItems;
    
    console.log(`🎬 Fetching insights for ${mediaItems.length} media items...`);
    
    const mediaWithInsights = await Promise.all(mediaItems.map(async (media) => {
      // Only fetch insights for VIDEO type (includes Reels)
      if (media.media_type === 'VIDEO') {
        // Check if plays field is already present from the initial query (legacy support)
        if (media.plays !== undefined && media.plays !== null) {
          console.log(`✅ Video ${media.id} already has plays: ${media.plays}`);
          return {
            ...media,
            video_views: media.plays
          };
        }
        
        try {
          console.log(`📹 Fetching insights for video ${media.id} (product_type: ${media.media_product_type})...`);
          
          // Use the new 'views' metric (available for FEED, REELS, STORY)
          // This replaced the deprecated plays, clips_replays_count, and ig_reels_aggregated_all_plays_count
          const metricsToFetch = 'views,total_interactions,reach';
          
          // Try method 1: Fetch insights API
          const insightsUrl = `https://graph.facebook.com/v18.0/${media.id}/insights?metric=${metricsToFetch}&access_token=${accessToken}`;
          const insightsResponse = await fetch(insightsUrl);
          const insightsData = await insightsResponse.json();
          
          console.log(`📊 Insights response for ${media.id}:`, insightsData);
          
          let viewsCount = 0;
          
          if (insightsData.data && !insightsData.error) {
            // Look for the 'views' metric (new standard metric for all video types)
            const viewsMetric = insightsData.data.find(m => 
              m.name === 'views' ||       // New standard metric
              m.name === 'reach'          // Fallback
            );
            viewsCount = viewsMetric?.values?.[0]?.value || 0;
            console.log(`✅ Found views for ${media.id}: ${viewsCount} (metric: ${viewsMetric?.name})`);
          } else if (insightsData.error) {
            const errorMsg = insightsData.error.message || '';
            console.warn(`⚠️ Insights API error for ${media.id}:`, errorMsg);
            
            // Check if it's a permissions error
            if (errorMsg.includes('permission') || insightsData.error.code === 10) {
              console.error(`❌ Missing instagram_manage_insights permission.`);
              return {
                ...media,
                video_views: -1, // Use -1 to indicate permission error
                views_error: 'Missing permissions'
              };
            }
            
            // If plays metric deprecated, try reach/impressions
            if (errorMsg.includes('plays metric') || errorMsg.includes('not supported') || errorMsg.includes('clips_replays_count')) {
              console.warn(`⚠️ Deprecated metric error, trying 'views' metric`);
              // Try the new 'views' metric
              try {
                const altMetricsUrl = `https://graph.facebook.com/v18.0/${media.id}/insights?metric=views,reach&access_token=${accessToken}`;
                const altResponse = await fetch(altMetricsUrl);
                const altData = await altResponse.json();
                
                if (altData.data && !altData.error) {
                  const viewsMetric = altData.data.find(m => m.name === 'views' || m.name === 'reach');
                  viewsCount = viewsMetric?.values?.[0]?.value || 0;
                  console.log(`✅ Using ${viewsMetric?.name} metric for views: ${viewsCount}`);
                }
              } catch (altError) {
                console.warn(`⚠️ Could not fetch alternative metrics`);
              }
            }
          }
          
          return {
            ...media,
            video_views: viewsCount
          };
        } catch (error) {
          console.error(`❌ Error fetching insights for media ${media.id}:`, error);
          return media;
        }
      }
      return media;
    }));
    
    console.log(`✅ Insights fetch complete. Videos with views:`, 
      mediaWithInsights.filter(m => m.video_views > 0).length
    );
    
    return mediaWithInsights;
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
      scope: 'email,public_profile,pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish,instagram_manage_insights,instagram_manage_comments'
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
      const mediaUrl = `https://graph.facebook.com/v18.0/${accountData.id}/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${accountData.pageAccessToken}`;
      const mediaResponse = await fetch(mediaUrl);
      const mediaData = await mediaResponse.json();
      
      // Fetch video/reel insights for views count
      const mediaWithInsights = await fetchMediaInsights(mediaData.data || [], accountData.pageAccessToken);
      
      const newAccount = {
        ...accountData,
        connected: true,
        profile: profileData,
        media: mediaWithInsights,
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
        console.log('Warning: Account disconnected locally but may still exist in database.');
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
        console.log('Warning: Accounts disconnected locally but may still exist in database.');
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
        console.log('Tokens refreshed successfully');
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
        console.error('No customer ID found for Instagram, cannot store social account');
        setError('Unable to connect account. Please use the link provided to you.');
        return;
      }

      // ✅ CRITICAL: Always store user access token for refresh capabilities
      if (!userAccessToken) {
        console.error('❌ No user access token available - refresh capabilities will be limited');
        console.log('Warning: Token refresh may not work');
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
        setError('Account connected but some features may be limited. Please try reconnecting.');
      }
      
    } catch (error) {
      console.warn('Failed to store Instagram account:', error);
      setError('Account connected but some features may be limited.');
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
      const mediaUrl = `https://graph.facebook.com/v18.0/${accountId}/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=12&access_token=${account.pageAccessToken}`;
      const mediaResponse = await fetch(mediaUrl);
      const mediaData = await mediaResponse.json();
      
      // Fetch video/reel insights for views count
      const mediaWithInsights = await fetchMediaInsights(mediaData.data || [], account.pageAccessToken);
      
      const updatedAccounts = connectedAccounts.map(acc => 
        acc.id === accountId 
          ? { 
              ...acc, 
              profile: profileData, 
              media: mediaWithInsights,
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
      const media = mediaWithInsights;
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

  // Handle boost post - Opens Instagram's native boost interface
  const handleBoostPost = (post) => {
    if (!post || !post.permalink) {
      setError('Post link not available');
      return;
    }
    
    // Open Instagram post in new tab where user can click the native Boost button
    window.open(post.permalink, '_blank');
    
    // Alternatively, for mobile apps, you could use deep linking:
    // window.location.href = `instagram://media?id=${post.id}`;
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

  // --- FETCH COMMENTS FOR A POST ---
  const fetchPostComments = async (mediaId, accessToken) => {
    if (!mediaId || !accessToken) {
      console.warn('Missing mediaId or accessToken for comments fetch');
      return [];
    }

    setLoadingComments(true);
    
    try {
      console.log(`🔍 Fetching comments for post ${mediaId}...`);
      console.log(`🔑 Using access token: ${accessToken.substring(0, 20)}...`);
      
      // Try multiple approaches to fetch comments
      let allComments = [];
      
      // Fetch all available fields according to Instagram Comment API documentation
      // Fields: from, hidden, id, like_count, media, parent_id, replies, text, timestamp, user, username
      const fields = [
        'id',
        'from',  // Object with id and username
        'hidden',
        'like_count',
        'media{id,media_product_type}',
        'parent_id',
        'text',
        'timestamp',
        'user',
        'username',
        'replies{id,from,hidden,like_count,text,timestamp,username,parent_id}'
      ].join(',');
      
      // Approach 1: Try with filter=stream to get ALL comments including hidden
      console.log('🔍 Attempt 1: Fetching with filter=stream (all comments including hidden)...');
      let response = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}/comments?fields=${fields}&filter=stream&limit=100&access_token=${accessToken}`,
        { method: 'GET' }
      );
      
      let data = await response.json();
      
      if (response.ok && !data.error && data.data) {
        allComments = data.data;
        console.log(`✅ Approach 1 found ${allComments.length} comments with filter=stream`);
      } else {
        console.warn('⚠️ Approach 1 failed:', data.error?.message);
        
        // Approach 2: Try without filter parameter (shows only non-hidden)
        console.log('🔍 Attempt 2: Fetching without filter (visible comments only)...');
        response = await fetch(
          `https://graph.facebook.com/v18.0/${mediaId}/comments?fields=${fields}&limit=100&access_token=${accessToken}`,
          { method: 'GET' }
        );
        
        data = await response.json();
        
        if (response.ok && !data.error && data.data) {
          allComments = data.data;
          console.log(`✅ Approach 2 found ${allComments.length} comments without filter`);
        } else {
          console.error('❌ Approach 2 also failed:', data.error?.message);
        }
      }
      
      // If still no comments, check if there's an API error
      if (!response.ok || data.error) {
        console.error('❌ Failed to fetch comments:', {
          status: response.status,
          error: data.error,
          mediaId,
          errorMessage: data.error?.message,
          errorType: data.error?.type,
          errorCode: data.error?.code
        });
        
        let errorMsg = data.error?.message || 'Failed to load comments';
        
        // Add helpful error messages
        if (data.error?.code === 10) {
          errorMsg = 'Permission denied. You may need "instagram_manage_comments" permission to view hidden comments.';
        } else if (data.error?.code === 190) {
          errorMsg = 'Access token expired or invalid. Please reconnect your Instagram account.';
        }
        
        // Store error info for display
        setPostComments(prev => ({
          ...prev,
          [mediaId]: { error: errorMsg }
        }));
        
        return [];
      }
      
      console.log(`✅ Total comments fetched: ${allComments.length}`);
      console.log(`📊 Hidden comments: ${allComments.filter(c => c.hidden || c.is_hidden).length}`);
      console.log(`📊 Visible comments: ${allComments.filter(c => !c.hidden && !c.is_hidden).length}`);
      
      // If we got 0 comments but the post says there are comments, add a note
      if (allComments.length === 0) {
        console.warn('⚠️ API returned 0 comments. Comments may be:');
        console.warn('  - Hidden by Instagram spam filters (not accessible via API)');
        console.warn('  - Require additional permissions (instagram_manage_comments)');
        console.warn('  - Posted by users who blocked the API access');
        console.warn('  - Deleted but count not updated yet');
      }
      
      // Store comments in state (including hidden ones)
      setPostComments(prev => ({
        ...prev,
        [mediaId]: allComments
      }));
      
      return allComments;
    } catch (error) {
      console.error('❌ Error fetching comments:', error);
      setPostComments(prev => ({
        ...prev,
        [mediaId]: { error: error.message || 'Network error' }
      }));
      return [];
    } finally {
      setLoadingComments(false);
    }
  };

  // --- FETCH INDIVIDUAL COMMENT DETAILS ---
  const fetchCommentDetails = async (commentId) => {
    if (!commentId || !activeAccount || !activeAccount.pageAccessToken) {
      console.warn('Missing commentId or access token');
      return null;
    }

    setLoadingCommentDetails(true);
    
    try {
      console.log(`🔍 Fetching details for comment ${commentId}...`);
      
      // Fetch all available fields for a single comment
      const fields = [
        'id',
        'from',
        'hidden',
        'like_count',
        'legacy_instagram_comment_id',
        'media{id,media_product_type}',
        'parent_id',
        'text',
        'timestamp',
        'user',
        'username'
      ].join(',');
      
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${commentId}?fields=${fields}&access_token=${activeAccount.pageAccessToken}`,
        { method: 'GET' }
      );
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        console.error('❌ Failed to fetch comment details:', data.error);
        return null;
      }
      
      console.log('✅ Comment details fetched:', data);
      setCommentDetails(data);
      return data;
      
    } catch (error) {
      console.error('❌ Error fetching comment details:', error);
      return null;
    } finally {
      setLoadingCommentDetails(false);
    }
  };

  // --- POST REPLY TO COMMENT ---
  const postReplyToComment = async (commentId, message, mediaId) => {
    if (!message || !message.trim()) {
      setError('Please enter a reply message');
      return;
    }

    if (!activeAccount || !activeAccount.pageAccessToken) {
      setError('No active account or access token found');
      return;
    }

    setSendingReply(true);
    
    try {
      console.log(`💬 Posting reply to comment ${commentId}...`);
      
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${commentId}/replies?message=${encodeURIComponent(message)}&access_token=${activeAccount.pageAccessToken}`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        console.error('❌ Failed to post reply:', data.error);
        
        // Check for permission errors
        if (data.error?.code === 100 || data.error?.code === 10 || data.error?.message?.includes('Permission')) {
          console.error('Permission error posting reply:', data.error?.message);
          setError('Unable to post reply due to account permissions.');
        } else {
          setError('Unable to post reply. Please try again.');
        }
        return;
      }
      
      console.log('✅ Reply posted successfully:', data.id);
      
      // Clear reply state
      setReplyText('');
      setReplyingToComment(null);
      
      // Refresh comments to show the new reply
      await fetchPostComments(mediaId, activeAccount.pageAccessToken);
      
    } catch (error) {
      console.error('❌ Error posting reply:', error);
      setError('Unable to post reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  // --- NOTE: Instagram API does NOT support adding top-level comments or editing comments ---
  // Only replies, delete, and hide/unhide are supported

  // --- DELETE COMMENT ---
  const deleteComment = async (commentId, mediaId) => {
    if (!window.confirm('Are you sure you want to delete this comment? This action cannot be undone.')) {
      return;
    }

    if (!activeAccount || !activeAccount.pageAccessToken) {
      setError('No active account or access token found');
      return;
    }

    setProcessingComment(true);
    
    try {
      console.log(`🗑️ Deleting comment ${commentId}...`);
      
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${commentId}?access_token=${activeAccount.pageAccessToken}`,
        { method: 'DELETE' }
      );
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        console.error('❌ Failed to delete comment:', data.error);
        
        // Check for permission errors
        if (data.error?.code === 100 || data.error?.code === 10 || data.error?.message?.includes('Permission')) {
          console.error('Permission error deleting comment:', data.error?.message);
          setError('Unable to delete comment due to account permissions.');
        } else {
          setError('Unable to delete comment. Please try again.');
        }
        return;
      }
      
      console.log('✅ Comment deleted successfully');
      setError(null);
      
      // Refresh comments to remove the deleted comment
      await fetchPostComments(mediaId, activeAccount.pageAccessToken);
      
    } catch (error) {
      console.error('❌ Error deleting comment:', error);
      setError('Unable to delete comment. Please try again.');
    } finally {
      setProcessingComment(false);
    }
  };

  // --- HIDE/UNHIDE COMMENT ---
  const toggleCommentVisibility = async (commentId, shouldHide, mediaId) => {
    if (!activeAccount || !activeAccount.pageAccessToken) {
      setError('No active account or access token found');
      return;
    }

    setProcessingComment(true);
    
    try {
      console.log(`${shouldHide ? '🙈' : '👁️'} ${shouldHide ? 'Hiding' : 'Unhiding'} comment ${commentId}...`);
      
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${commentId}?hide=${shouldHide}&access_token=${activeAccount.pageAccessToken}`,
        { method: 'POST' }
      );
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        console.error(`❌ Failed to ${shouldHide ? 'hide' : 'unhide'} comment:`, data.error);
        
        // Check for permission errors
        if (data.error?.code === 100 || data.error?.code === 10 || data.error?.message?.includes('Permission')) {
          console.error('Permission error:', data.error?.message);
          setError(`Unable to ${shouldHide ? 'hide' : 'unhide'} comment due to account permissions.`);
        } else {
          setError(`Unable to ${shouldHide ? 'hide' : 'unhide'} comment. Please try again.`);
        }
        return;
      }
      
      console.log(`✅ Comment ${shouldHide ? 'hidden' : 'unhidden'} successfully`);
      setError(null);
      
      // Refresh comments to show the updated state
      await fetchPostComments(mediaId, activeAccount.pageAccessToken);
      
    } catch (error) {
      console.error(`❌ Error ${shouldHide ? 'hiding' : 'unhiding'} comment:`, error);
      setError(`Unable to ${shouldHide ? 'hide' : 'unhide'} comment. Please try again.`);
    } finally {
      setProcessingComment(false);
    }
  };

  // Helper function to get the correct Instagram URL for reels vs posts
  const getInstagramPostUrl = (media) => {
    if (!media || !media.permalink) return null;
    
    // If it's a reel (REELS product type), ensure we use the correct URL format
    if (media.media_product_type === 'REELS' || media.media_type === 'REELS') {
      // If permalink already contains /reel/ or /reels/, use it as is
      if (media.permalink.includes('/reel/') || media.permalink.includes('/reels/')) {
        return media.permalink;
      }
      
      // Otherwise, try to extract the shortcode from permalink and construct reel URL
      // Instagram permalink format: https://www.instagram.com/p/{shortcode}/
      // Reel URL format: https://www.instagram.com/reel/{shortcode}/
      const shortcodeMatch = media.permalink.match(/\/p\/([^\/]+)/);
      if (shortcodeMatch && shortcodeMatch[1]) {
        return `https://www.instagram.com/reel/${shortcodeMatch[1]}/`;
      }
    }
    
    // For regular posts or if we couldn't construct a reel URL, use the original permalink
    return media.permalink;
  };

  // --- SINGLE POST ANALYTICS LOGIC ---
  const fetchSinglePostAnalytics = async (post) => {
    if (!post) return;
    setSelectedPostId(post.id);
    
    // Create comprehensive analytics data similar to Facebook
    const analytics = {
      id: post.id,
      caption: post.caption || 'No caption',
      timestamp: post.timestamp,
      permalink: getInstagramPostUrl(post), // Use helper to get correct URL
      media_url: post.media_url,
      thumbnail_url: post.thumbnail_url,
      media_type: post.media_type,
      media_product_type: post.media_product_type,
      likes_count: post.like_count || 0,
      comments_count: post.comments_count || 0,
      video_views: post.video_views || 0,
      total_engagement: (post.like_count || 0) + (post.comments_count || 0),
      engagement_rate: 0 // Will be calculated if we have follower count
    };
    
    setSinglePostAnalytics(analytics);
    
    // Fetch comments for this post
    if (activeAccount && activeAccount.pageAccessToken) {
      fetchPostComments(post.id, activeAccount.pageAccessToken);
    }
  };

  const renderAnalytics = () => {
    if (!analyticsData) return null;
    
    return (
      <div className="mt-8 space-y-6">
        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl sm:p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-pink-600 rounded-lg">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
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
          <div className="flex items-center justify-between sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 bg-gradient-to-r from-pink-50 to-purple-50 flex-shrink-0">
            <h3 className="text-sm sm:text-base font-semibold text-gray-900 flex items-center">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-pink-600" />
              Post Analytics
            </h3>
            <button
              onClick={() => {
                setSelectedPostId(null);
                setSinglePostAnalytics(null);
              }}
              className="p-1.5 rounded-full hover:bg-pink-100 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal Body - Scrollable */}
          <div className="flex-1 overflow-y-auto sm:p-4">
            <div className="space-y-4">
              {/* Post Preview */}
              <div className="bg-pink-50 border border-pink-200 rounded-lg sm:p-3">
                <div className="flex items-start space-x-2 sm:space-x-3">
                  {(singlePostAnalytics.thumbnail_url || singlePostAnalytics.media_url) && (
                    <img
                      src={singlePostAnalytics.thumbnail_url || singlePostAnalytics.media_url}
                      alt="Post media"
                      className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[10px] sm:text-xs text-pink-600 bg-pink-100 py-0.5 rounded font-medium">
                        {singlePostAnalytics.media_type}
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-500">
                        {new Date(singlePostAnalytics.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-800 mb-1 line-clamp-2">
                      {singlePostAnalytics.caption || 'No caption'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {singlePostAnalytics.permalink && (
                        <>
                          <a 
                            href={singlePostAnalytics.permalink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[10px] sm:text-xs text-pink-600 hover:text-pink-700"
                          >
                            View Post →
                          </a>
                          <button
                            onClick={() => handleBoostPost(singlePostAnalytics)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium flex items-center gap-1"
                          >
                            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M13 7H7v6h6V7z"/>
                              <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd"/>
                            </svg>
                            Boost
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Engagement Metrics Grid */}
              <div className={`grid gap-2 sm:gap-3 ${(singlePostAnalytics.media_type === 'VIDEO' || singlePostAnalytics.media_type === 'REELS') ? 'grid-cols-4' : 'grid-cols-3'}`}>
                {/* Views - Only for Videos/Reels */}
                {(singlePostAnalytics.media_type === 'VIDEO' || singlePostAnalytics.media_type === 'REELS') && (
                  <div className={`${singlePostAnalytics.video_views === -1 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'} border rounded-lg sm:p-3 text-center`}>
                    <div className={`text-base sm:text-lg font-bold mb-1 ${singlePostAnalytics.video_views === -1 ? 'text-yellow-600' : 'text-blue-600'}`}>
                      {singlePostAnalytics.video_views === -1 ? 'N/A' : (singlePostAnalytics.video_views?.toLocaleString() || 0)}
                    </div>
                    <div className={`text-[10px] sm:text-xs font-medium ${singlePostAnalytics.video_views === -1 ? 'text-yellow-700' : 'text-blue-700'}`}>
                      👁️ Views
                    </div>
                    {singlePostAnalytics.video_views === -1 && (
                      <div className="text-[8px] sm:text-[10px] text-yellow-600 mt-1">
                        Missing permission
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-pink-50 border border-pink-200 rounded-lg sm:p-3 text-center">
                  <div className="text-base sm:text-lg font-bold text-pink-600 mb-1">
                    {singlePostAnalytics.likes_count?.toLocaleString() || 0}
                  </div>
                  <div className="text-[10px] sm:text-xs text-pink-700 font-medium">
                    ❤️ Likes
                  </div>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg sm:p-3 text-center">
                  <div className="text-base sm:text-lg font-bold text-purple-600 mb-1">
                    {singlePostAnalytics.comments_count?.toLocaleString() || 0}
                  </div>
                  <div className="text-[10px] sm:text-xs text-purple-700 font-medium">
                    💬 Comments
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 rounded-lg sm:p-3 text-center">
                  <div className="text-base sm:text-lg font-bold text-indigo-600 mb-1">
                    {singlePostAnalytics.total_engagement?.toLocaleString() || 0}
                  </div>
                  <div className="text-[10px] sm:text-xs text-indigo-700 font-medium">
                    📊 Total
                  </div>
                </div>
              </div>

              {/* Engagement Trend Charts */}
              <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-3 sm:p-4">
                <h4 className="font-medium text-xs sm:text-sm text-gray-900 mb-3 flex items-center">
                  <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 text-pink-600" />
                  Engagement Trends
                </h4>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4 items-stretch">
                  {/* Likes Trend */}
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-pink-100 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-700">❤️ Likes</span>
                      <span className="text-[11px] sm:text-xs font-bold text-pink-600">
                        {singlePostAnalytics.likes_count?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex-1 min-h-[80px] sm:min-h-[96px]">
                      <TrendChart
                        data={generatePostTrendData(singlePostAnalytics.likes_count, 'likes')}
                        title=""
                        color="#EC4899"
                        metric="value"
                        style={{ height: '100%' }}
                      />
                    </div>
                  </div>

                  {/* Comments Trend */}
                  <div className="bg-white rounded-lg p-2 sm:p-3 border border-purple-100 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-xs font-medium text-gray-700">💬 Comments</span>
                      <span className="text-[11px] sm:text-xs font-bold text-purple-600">
                        {singlePostAnalytics.comments_count?.toLocaleString() || 0}
                      </span>
                    </div>
                    <div className="flex-1 min-h-[80px] sm:min-h-[96px]">
                      <TrendChart
                        data={generatePostTrendData(singlePostAnalytics.comments_count, 'comments')}
                        title=""
                        color="#8B5CF6"
                        metric="value"
                        style={{ height: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Engagement Breakdown */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg sm:p-4 mt-1">
                <h4 className="font-medium text-xs sm:text-sm text-gray-900 mb-3 flex items-center">
                  <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                  Breakdown
                </h4>
                <div className="space-y-3">
                  {/* Likes Bar */}
                  <div className="pb-1">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
                      <span className="font-medium text-gray-700">❤️ Likes</span>
                      <span className="text-pink-600 font-semibold">
                        {singlePostAnalytics.likes_count?.toLocaleString() || 0}
                        {singlePostAnalytics.total_engagement > 0 && (
                          <span className="text-gray-500 ml-1">
                            ({((singlePostAnalytics.likes_count / singlePostAnalytics.total_engagement) * 100).toFixed(0)}%)
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
                  <div className="pb-1">
                    <div className="flex items-center justify-between text-[10px] sm:text-xs mb-1">
                      <span className="font-medium text-gray-700">💬 Comments</span>
                      <span className="text-purple-600 font-semibold">
                        {singlePostAnalytics.comments_count?.toLocaleString() || 0}
                        {singlePostAnalytics.total_engagement > 0 && (
                          <span className="text-gray-500 ml-1">
                            ({((singlePostAnalytics.comments_count / singlePostAnalytics.total_engagement) * 100).toFixed(0)}%)
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

                {/* Quick Insights */}
                <div className="mt-2 pt-2 border-t border-gray-200 text-[10px] sm:text-xs text-gray-600">
                  <span className="font-medium">Top:</span> {singlePostAnalytics.likes_count >= singlePostAnalytics.comments_count ? 'Likes' : 'Comments'}
                  {singlePostAnalytics.total_engagement > 50 && <span className="ml-2">🔥 High performing!</span>}
                </div>
              </div>

              {/* Comments Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg sm:p-4 mt-1">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-xs sm:text-sm text-gray-900 flex items-center">
                    <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 text-purple-600" />
                    Comments ({singlePostAnalytics.comments_count || 0})
                  </h4>
                  <div className="flex items-center gap-2">
                    {loadingComments && (
                      <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-purple-600" />
                    )}
                    <button
                      onClick={() => {
                        if (activeAccount && activeAccount.pageAccessToken) {
                          fetchPostComments(singlePostAnalytics.id, activeAccount.pageAccessToken);
                        }
                      }}
                      className="text-[10px] sm:text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 flex items-center gap-1"
                      disabled={loadingComments}
                      title="Load/Reload all comments including hidden ones"
                    >
                      🔄 Load All
                    </button>
                  </div>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {loadingComments ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-purple-600" />
                      <p className="text-xs text-gray-500 mt-2">Loading comments...</p>
                    </div>
                  ) : postComments[singlePostAnalytics.id]?.error ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                      <p className="text-xs font-semibold text-red-700 mb-1">Failed to load comments</p>
                      <p className="text-[10px] text-red-600">{postComments[singlePostAnalytics.id].error}</p>
                      <button
                        onClick={() => {
                          console.log('🔄 Retrying comment fetch...');
                          if (activeAccount && activeAccount.pageAccessToken) {
                            fetchPostComments(singlePostAnalytics.id, activeAccount.pageAccessToken);
                          }
                        }}
                        className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-[10px] hover:bg-red-700"
                      >
                        Retry
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Show warning if comment count doesn't match */}
                      {singlePostAnalytics.comments_count > 0 && 
                       (!postComments[singlePostAnalytics.id] || 
                        (Array.isArray(postComments[singlePostAnalytics.id]) && postComments[singlePostAnalytics.id].length === 0)) && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-orange-800 mb-1">Comments Hidden or Unavailable</p>
                              <p className="text-[10px] text-orange-700 mb-2">
                                This post has {singlePostAnalytics.comments_count} comment{singlePostAnalytics.comments_count !== 1 ? 's' : ''}, but Instagram API returned 0 comments. Possible reasons:
                              </p>
                              <ul className="text-[10px] text-orange-700 mb-2 space-y-1 ml-3 list-disc">
                                <li>Comments hidden by Instagram spam filters (not accessible)</li>
                                <li>Comments from users who blocked API access</li>
                                <li>Requires "instagram_manage_comments" permission</li>
                                <li>Recent comments not yet indexed</li>
                              </ul>
                              <button
                                onClick={() => {
                                  if (activeAccount && activeAccount.pageAccessToken) {
                                    fetchPostComments(singlePostAnalytics.id, activeAccount.pageAccessToken);
                                  }
                                }}
                                className="bg-orange-600 text-white px-3 py-1.5 rounded text-[10px] hover:bg-orange-700 flex items-center gap-1"
                                disabled={loadingComments}
                              >
                                {loadingComments ? (
                                  <>
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    <span>Loading...</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3" />
                                    <span>Try Loading Again</span>
                                  </>
                                )}
                              </button>
                              <div className="mt-2 pt-2 border-t border-orange-200">
                                <p className="text-[9px] text-orange-600 mb-1 font-medium">
                                  💡 To view and manage all comments:
                                </p>
                                {singlePostAnalytics.permalink && (
                                  <a
                                    href={singlePostAnalytics.permalink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-2 py-1 rounded text-[10px] hover:from-pink-600 hover:to-purple-700"
                                  >
                                    <Instagram className="h-3 w-3" />
                                    <span>Open on Instagram</span>
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {postComments[singlePostAnalytics.id] && Array.isArray(postComments[singlePostAnalytics.id]) && postComments[singlePostAnalytics.id].length > 0 ? (
                        postComments[singlePostAnalytics.id].map((comment) => (
                          <div key={comment.id} className={`rounded-lg p-2 sm:p-3 border ${
                        comment.hidden || comment.is_hidden
                          ? 'bg-gray-100 border-gray-300 opacity-60' 
                          : 'bg-white border-gray-200'
                      }`}>
                        {(comment.hidden || comment.is_hidden) && (
                          <div className="mb-2 flex items-center gap-1 text-[9px] text-gray-600">
                            <span>🙈</span>
                            <span className="font-medium">Hidden Comment (only you can see this)</span>
                          </div>
                        )}
                        {comment.parent_id && typeof comment.parent_id === 'string' && (
                          <div className="mb-2 flex items-center gap-1 text-[9px] text-blue-600">
                            <span>↩️</span>
                            <span className="font-medium">Reply to another comment</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[10px] sm:text-xs font-bold">
                              {(comment.from?.username || comment.username || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <div className="flex flex-col">
                                <span className="text-xs sm:text-sm font-semibold text-gray-900 truncate">
                                  @{String(comment.from?.username || comment.username || 'Unknown')}
                                </span>
                                {comment.from && comment.from.id && typeof comment.from.id === 'string' && (
                                  <span className="text-[8px] text-gray-400">ID: {String(comment.from.id)}</span>
                                )}
                              </div>
                              <span className="text-[9px] sm:text-[10px] text-gray-500 flex-shrink-0">
                                {comment.timestamp ? new Date(comment.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              </span>
                            </div>
                            
                            <p className="text-[10px] sm:text-xs text-gray-700 break-words">
                              {String(comment.text || '')}
                            </p>
                            
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              {comment.like_count && Number(comment.like_count) > 0 && (
                                <div className="flex items-center gap-1">
                                  <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-pink-500" fill="currentColor" />
                                  <span className="text-[9px] sm:text-[10px] text-gray-500">
                                    {Number(comment.like_count)}
                                  </span>
                                </div>
                              )}
                              {comment.media && typeof comment.media === 'object' && comment.media.media_product_type && (
                                <span className="text-[8px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {String(comment.media.media_product_type)}
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setViewingCommentDetails(comment.id);
                                  fetchCommentDetails(comment.id);
                                }}
                                className="text-[9px] sm:text-[10px] text-blue-600 hover:text-blue-700 font-medium"
                                title="View full comment details"
                              >
                                ℹ️ Details
                              </button>
                              <button
                                onClick={() => {
                                  setReplyingToComment(comment.id);
                                  setReplyText('');
                                }}
                                className="text-[9px] sm:text-[10px] text-purple-600 hover:text-purple-700 font-medium"
                                title="Add a reply (supported by Instagram API)"
                              >
                                💬 Reply
                              </button>
                              <button
                                onClick={() => deleteComment(comment.id, singlePostAnalytics.id)}
                                className="text-[9px] sm:text-[10px] text-red-600 hover:text-red-700 font-medium"
                                disabled={processingComment}
                                title="Delete this comment (supported by Instagram API)"
                              >
                                🗑️ Delete
                              </button>
                              {comment.replies && Array.isArray(comment.replies.data) && comment.replies.data.length > 0 && (
                                <span className="text-[9px] sm:text-[10px] text-gray-500">
                                  {Number(comment.replies.data.length)} {comment.replies.data.length === 1 ? 'reply' : 'replies'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reply Input */}
                        {replyingToComment === comment.id && (
                          <div className="mt-2 pl-8 sm:pl-10">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write a reply..."
                                className="w-full text-[10px] sm:text-xs bg-white border border-purple-200 rounded p-2 resize-none focus:outline-none focus:border-purple-400"
                                rows="2"
                                disabled={sendingReply}
                              />
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => postReplyToComment(comment.id, replyText, singlePostAnalytics.id)}
                                  disabled={sendingReply || !replyText.trim()}
                                  className="bg-purple-600 text-white px-3 py-1 rounded text-[10px] hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                                >
                                  {sendingReply ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin" />
                                      <span>Sending...</span>
                                    </>
                                  ) : (
                                    <span>Send Reply</span>
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingToComment(null);
                                    setReplyText('');
                                  }}
                                  disabled={sendingReply}
                                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-[10px] hover:bg-gray-300 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Display Replies */}
                        {comment.replies && Array.isArray(comment.replies.data) && comment.replies.data.length > 0 && (
                          <div className="mt-2 pl-8 sm:pl-10 space-y-2">
                            {comment.replies.data.map((reply) => (
                              <div key={reply.id} className={`border rounded-lg p-2 ${
                                reply.hidden || reply.is_hidden
                                  ? 'bg-purple-100 border-purple-200 opacity-70'
                                  : 'bg-purple-50 border-purple-100'
                              }`}>
                                {(reply.hidden || reply.is_hidden) && (
                                  <div className="mb-1 flex items-center gap-1 text-[8px] text-purple-600">
                                    <span>🙈</span>
                                    <span>Hidden Reply</span>
                                  </div>
                                )}
                                <div className="flex items-start gap-2">
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[9px] sm:text-[10px] font-bold">
                                      {(reply.from?.username || reply.username || 'U').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <span className="text-[10px] sm:text-xs font-semibold text-gray-900 truncate">
                                        @{String(reply.from?.username || reply.username || 'Unknown')}
                                      </span>
                                      <span className="text-[8px] sm:text-[9px] text-gray-500 flex-shrink-0">
                                        {reply.timestamp ? new Date(reply.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                                      </span>
                                    </div>
                                    <p className="text-[9px] sm:text-[10px] text-gray-700 break-words">
                                      {String(reply.text || '')}
                                    </p>
                                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                                      {reply.like_count && Number(reply.like_count) > 0 && (
                                        <div className="flex items-center gap-1">
                                          <Heart className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-pink-500" fill="currentColor" />
                                          <span className="text-[8px] sm:text-[9px] text-gray-500">
                                            {Number(reply.like_count)}
                                          </span>
                                        </div>
                                      )}
                                      {reply.parent_id && typeof reply.parent_id === 'string' && (
                                        <span className="text-[8px] text-blue-500 bg-blue-50 px-1 py-0.5 rounded">
                                          ↩️ Reply
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                        ))
                      ) : singlePostAnalytics.comments_count > 0 ? null : (
                        <div className="text-center py-6">
                          <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                          <p className="text-xs text-gray-500">No comments yet</p>
                          <p className="text-[10px] text-gray-400 mt-1">Be the first to comment!</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {postComments[singlePostAnalytics.id] && postComments[singlePostAnalytics.id].length >= 50 && (
                  <div className="mt-2 text-center">
                    <p className="text-[10px] text-gray-500">
                      📝 Showing first 50 comments (API limit)
                    </p>
                  </div>
                )}

                {/* Permission notice removed as requested */}
              </div>
              
              {/* Comment Details Modal */}
              {viewingCommentDetails && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                    <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-purple-600" />
                        Comment Details
                      </h3>
                      <button
                        onClick={() => {
                          setViewingCommentDetails(null);
                          setCommentDetails(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    
                    <div className="p-4">
                      {loadingCommentDetails ? (
                        <div className="text-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
                          <p className="text-sm text-gray-500 mt-2">Loading comment details...</p>
                        </div>
                      ) : commentDetails ? (
                        <div className="space-y-4">
                          {/* Comment ID */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Comment ID</label>
                            <p className="text-sm text-gray-900 font-mono mt-1">{String(commentDetails.id || '')}</p>
                          </div>
                          
                          {/* Legacy ID if available */}
                          {commentDetails.legacy_instagram_comment_id && typeof commentDetails.legacy_instagram_comment_id === 'string' && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <label className="text-xs font-semibold text-gray-600 uppercase">Legacy Instagram Comment ID</label>
                              <p className="text-sm text-gray-900 font-mono mt-1">{String(commentDetails.legacy_instagram_comment_id)}</p>
                            </div>
                          )}
                          
                          {/* Author Information */}
                          <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-3">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Author</label>
                            <div className="mt-2 space-y-2">
                              {commentDetails.from && typeof commentDetails.from === 'object' && (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">Username:</span>
                                    <span className="text-sm font-semibold text-gray-900">@{String(commentDetails.from.username || commentDetails.username || 'Unknown')}</span>
                                  </div>
                                  {commentDetails.from.id && typeof commentDetails.from.id === 'string' && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-gray-600">User ID:</span>
                                      <span className="text-sm text-gray-900 font-mono">{String(commentDetails.from.id)}</span>
                                    </div>
                                  )}
                                </>
                              )}
                              {commentDetails.user && typeof commentDetails.user === 'string' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600">App User ID:</span>
                                  <span className="text-sm text-gray-900 font-mono">{String(commentDetails.user)}</span>
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">Owner</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Comment Text */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Comment Text</label>
                            <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{String(commentDetails.text || '')}</p>
                          </div>
                          
                          {/* Status Badges */}
                          <div className="flex flex-wrap gap-2">
                            <div className={`px-3 py-2 rounded-lg border ${
                              commentDetails.hidden
                                ? 'bg-yellow-50 border-yellow-200'
                                : 'bg-green-50 border-green-200'
                            }`}>
                              <span className="text-xs font-semibold text-gray-600 uppercase block mb-1">Visibility</span>
                              <span className={`text-sm font-semibold ${
                                commentDetails.hidden ? 'text-yellow-700' : 'text-green-700'
                              }`}>
                                {commentDetails.hidden ? '🙈 Hidden' : '👁️ Visible'}
                              </span>
                            </div>
                            
                            <div className="bg-pink-50 border border-pink-200 px-3 py-2 rounded-lg">
                              <span className="text-xs font-semibold text-gray-600 uppercase block mb-1">Likes</span>
                              <span className="text-sm font-semibold text-pink-700 flex items-center gap-1">
                                <Heart className="h-4 w-4" fill="currentColor" />
                                {Number(commentDetails.like_count) || 0}
                              </span>
                            </div>
                            
                            {commentDetails.parent_id && typeof commentDetails.parent_id === 'string' && (
                              <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-lg">
                                <span className="text-xs font-semibold text-gray-600 uppercase block mb-1">Type</span>
                                <span className="text-sm font-semibold text-blue-700">↩️ Reply</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Timestamp */}
                          <div className="bg-gray-50 rounded-lg p-3">
                            <label className="text-xs font-semibold text-gray-600 uppercase">Timestamp</label>
                            <p className="text-sm text-gray-900 mt-1">
                              {commentDetails.timestamp ? new Date(commentDetails.timestamp).toLocaleString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                timeZoneName: 'short'
                              }) : 'N/A'}
                            </p>
                            {commentDetails.timestamp && typeof commentDetails.timestamp === 'string' && (
                              <p className="text-xs text-gray-500 mt-1 font-mono">{String(commentDetails.timestamp)}</p>
                            )}
                          </div>
                          
                          {/* Media Information */}
                          {commentDetails.media && typeof commentDetails.media === 'object' && commentDetails.media.id && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <label className="text-xs font-semibold text-gray-600 uppercase">Media</label>
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-600">Media ID:</span>
                                  <span className="text-sm text-gray-900 font-mono">{String(commentDetails.media.id)}</span>
                                </div>
                                {commentDetails.media.media_product_type && typeof commentDetails.media.media_product_type === 'string' && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-600">Product Type:</span>
                                    <span className="text-sm text-gray-900 bg-gray-200 px-2 py-0.5 rounded">{String(commentDetails.media.media_product_type)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Parent Comment Reference */}
                          {commentDetails.parent_id && typeof commentDetails.parent_id === 'string' && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                              <label className="text-xs font-semibold text-blue-700 uppercase">Parent Comment ID</label>
                              <p className="text-sm text-blue-900 font-mono mt-1">{String(commentDetails.parent_id)}</p>
                              <p className="text-xs text-blue-600 mt-1">This is a reply to another comment</p>
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div className="flex gap-2 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => {
                                deleteComment(commentDetails.id, singlePostAnalytics.id);
                                setViewingCommentDetails(null);
                                setCommentDetails(null);
                              }}
                              className="w-full bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center justify-center gap-2"
                              disabled={processingComment}
                            >
                              🗑️ Delete Comment
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
                          <p className="text-sm text-gray-500 mt-2">Failed to load comment details</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
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

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectedAccounts.map((account) => {
            const expired = isTokenExpired(account);
            
            return (
              <div
                key={account.id}
                className={`border rounded-lg sm:p-4 transition-all cursor-pointer ${
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
          <div className="mt-4 sm:p-3 bg-pink-50 border border-pink-200 rounded-lg">
             {/*<h6 className="font-medium text-pink-800 mb-2">🔑 Token Management</h6>*/}
            {/*<div className="text-sm text-pink-700 space-y-1">
              <p>📝 <strong>Active Account:</strong> @{activeAccount.profile?.username}</p>
              <p>🔄 <strong>Auto-Refresh:</strong> Tokens are automatically refreshed when needed</p>
              <p>⏰ <strong>Session Management:</strong> Persistent connection across browser sessions</p>
              <p>🔗 <strong>Manual Actions:</strong> Use "Refresh Tokens" if you encounter issues</p>
              <p>✅ <strong>Permissions:</strong> instagram_basic, instagram_content_publish</p>
              <p>📊 <strong>Historical Data:</strong> Automatically captured daily</p>
              {activeAccount.tokenExpiresAt && (
                <p>⏳ <strong>Token Expires:</strong> {new Date(activeAccount.tokenExpiresAt).toLocaleString()}</p>
              )}
            </div>*/}
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
      <div className="bg-red-50 border border-red-200 rounded-2xl sm:p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">
            {isTokenError ? 'Session Expired' : 'Connection Error'}
          </h3>
        </div>
        <p className="text-red-700 mb-4">{error}</p>
        
        {isTokenError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded sm:p-3 mb-3">
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
              className="border rounded-lg sm:p-4 bg-white hover:border-pink-400 transition-all cursor-pointer"
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
    <div className="space-y-4">
      {/* Show account selector if multiple accounts */}
      {connectedAccounts.length > 1 && renderAccountSelector()}

      <div className="flex flex-col gap-3 sm:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-green-100 py-1 rounded-full">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium text-green-700">
              {connectedAccounts.length} Connected
            </span>
          </div>
          {activeAccount && (
            <div className="flex items-center gap-1 bg-pink-50 py-1 rounded-full">
              {activeAccount.profile?.profile_picture_url ? (
                <img
                  src={activeAccount.profile.profile_picture_url}
                  alt="Profile"
                  className="w-4 h-4 rounded-full"
                />
              ) : (
                <Instagram className="h-3 w-3 text-pink-600" />
              )}
              <span className="text-xs font-medium text-pink-700">
                @{activeAccount.profile?.username || 'Loading...'}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSignIn}
            disabled={loading || !fbSdkLoaded}
            className="flex items-center gap-1 py-1.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg text-xs font-medium disabled:opacity-50 flex-1 sm:flex-initial justify-center"
          >
            <Plus className="h-3 w-3" />
            <span>{loading ? '...' : 'Add'}</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-1 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium flex-1 sm:flex-initial justify-center"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>

      {/* Show error if any */}
      {renderError()}

      {/* Show permission warning if video views are missing */}
      {activeAccount && activeAccount.media?.some(m => m.media_type === 'VIDEO' && m.video_views === -1) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg sm:p-4 mb-4 mx-3 sm:mx-0">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-800 text-sm mb-1">Missing Insights Permission</h4>
              <p className="text-xs text-yellow-700 mb-2">
                Your app doesn't have permission to access video views/plays data. To fix this:
              </p>
              <ol className="text-xs text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Disconnect your Instagram account (click "Disconnect" above)</li>
                <li>Reconnect and grant the "instagram_manage_insights" permission</li>
                <li>Or contact your Facebook App administrator to enable this permission</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Show available accounts */}
      {renderAvailableAccounts()}

      {/* Show active account details - Instagram-like profile header */}
      {activeAccount && (
        <div className="bg-white sm:bg-gradient-to-br sm:from-pink-50 sm:to-purple-50 sm:border sm:border-pink-200 sm:rounded-2xl">
          {/* Profile Header - Instagram Style */}
          <div className="px-3 py-4 sm:p-6">
            <div className="flex items-start gap-4 mb-4">
              {activeAccount.profile?.profile_picture_url ? (
                <img
                  src={activeAccount.profile.profile_picture_url}
                  alt="Instagram profile"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-pink-200 flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Instagram className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">@{activeAccount.profile?.username}</h2>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{activeAccount.pageName}</p>
                {activeAccount.profile?.biography && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2 hidden sm:block">{activeAccount.profile.biography}</p>
                )}
              </div>
            </div>
            
            {/* Action Buttons - Compact for mobile */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => removeAccount(activeAccount.id)}
                className="flex items-center justify-center py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs"
              >
                <ExternalLink className="h-3 w-3" />
              </button>
            </div>
          
            {/* Stats Row - Instagram Style */}
            <div className="flex justify-around text-center border-t border-b sm:border-0 border-gray-200 py-3 sm:mx-0 sm:border sm:rounded-xl sm:bg-white">
              <div>
                <div className="text-lg sm:text-xl font-bold text-gray-900">
                  {activeAccount.profile?.media_count?.toLocaleString() || activeAccount.media?.length || 0}
                </div>
                <div className="text-xs text-gray-500">Posts</div>
              </div>
              <div className="border-l border-gray-200">
                <div className="text-lg sm:text-xl font-bold text-gray-900">
                  {activeAccount.profile?.followers_count?.toLocaleString() || 'N/A'}
                </div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
              <div className="border-l border-gray-200">
                <div className="text-lg sm:text-xl font-bold text-gray-900">
                  {activeAccount.media?.reduce((sum, media) => sum + (media.like_count || 0), 0).toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">Likes</div>
              </div>
            </div>
          </div>

          {/* Historical Charts Toggle */}
          <div className="px-3 sm:px-0 mb-4">
            <button
              onClick={() => setShowHistoricalCharts(prev => ({ 
                ...prev, 
                [activeAccount.id]: !prev[activeAccount.id] 
              }))}
              className="flex items-center justify-between w-full bg-gradient-to-r from-pink-50 to-purple-50 sm:bg-white sm:border border-gray-200 rounded-lg text-left p-3"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-pink-600" />
                <span className="text-sm font-medium text-gray-900">Historical Analytics</span>
              </div>
              <span className="text-xs bg-pink-100 text-pink-700 py-1 rounded-full">
                {showHistoricalCharts[activeAccount.id] ? 'Hide' : 'Show'}
              </span>
            </button>
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

      {/* Show recent posts for active account - Instagram-like grid */}
      {activeAccount && (
        <div className="bg-white sm:rounded-2xl sm:border sm:border-gray-200 sm:shadow-sm">
          <div className="flex items-center justify-between px-3 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <LayoutGrid className="h-4 w-4 text-pink-600" />
              Posts
            </h3>
            <span className="text-xs text-gray-500">{activeAccount.media?.length || 0} posts</span>
          </div>
          
          {/* Instagram-style 3-column grid */}
          <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
            {activeAccount.media && activeAccount.media.length > 0 ? activeAccount.media.map(media => (
              <div 
                key={media.id} 
                className="aspect-square relative group cursor-pointer"
                onClick={() => {
                  setSelectedPostId(media.id);
                  fetchSinglePostAnalytics(media);
                }}
              >
                <img
                  src={media.thumbnail_url || media.media_url}
                  alt={media.caption ? media.caption.substring(0, 50) + '...' : 'Instagram post'}
                  className="w-full h-full object-cover"
                />
                {/* Media type indicator */}
                {media.media_type === 'VIDEO' && (
                  <div className="absolute top-1 right-1">
                    <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                )}
                {media.media_type === 'CAROUSEL_ALBUM' && (
                  <div className="absolute top-1 right-1">
                    <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
                    </svg>
                  </div>
                )}
                {/* Hover overlay with engagement stats and boost button */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                  <div className="flex items-center gap-4 text-sm font-semibold mb-3">
                    <span className="flex items-center gap-1">
                      <Heart className="h-4 w-4" fill="white" />
                      {media.like_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4" fill="white" />
                      {media.comments_count || 0}
                    </span>
                    {(media.media_type === 'VIDEO' || media.media_type === 'REELS') && (
                      media.video_views > 0 ? (
                        <span className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          {media.video_views?.toLocaleString()}
                        </span>
                      ) : media.video_views === -1 ? (
                        <span className="flex items-center gap-1 text-yellow-300 text-xs">
                          <Eye className="h-3 w-3" />
                          N/A
                        </span>
                      ) : null
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBoostPost(media);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M13 7H7v6h6V7z"/>
                      <path fillRule="evenodd" d="M7 2a1 1 0 012 0v1h2V2a1 1 0 112 0v1h2a2 2 0 012 2v2h1a1 1 0 110 2h-1v2h1a1 1 0 110 2h-1v2a2 2 0 01-2 2h-2v1a1 1 0 11-2 0v-1H9v1a1 1 0 11-2 0v-1H5a2 2 0 01-2-2v-2H2a1 1 0 110-2h1V9H2a1 1 0 010-2h1V5a2 2 0 012-2h2V2zM5 5h10v10H5V5z" clipRule="evenodd"/>
                    </svg>
                    Boost Post
                  </button>
                </div>
              </div>
            )) : (
              <div className="col-span-3 text-center py-12">
                <Instagram className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No posts yet</p>
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
        <header className="bg-white border-b sticky top-0 z-50">
          <div className="sm:px-4">
            <div className="flex items-center h-14 sm:h-16 sm:px-0">
              <div className="w-8 h-8 bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 rounded-lg flex items-center justify-center">
                <Instagram className="h-4 w-4 text-white" />
              </div>
              <span className="ml-2 text-base sm:text-lg font-semibold text-gray-900">Instagram</span>
            </div>
          </div>
        </header>
        <div className="sm:p-4">
          <div className="bg-white sm:rounded-lg sm:shadow-md sm:p-4">
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
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="sm:px-4">
          <div className="flex items-center justify-between h-14 sm:h-16 sm:px-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-500 via-purple-500 to-orange-400 rounded-lg flex items-center justify-center">
                <Instagram className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-semibold text-gray-900">Instagram</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Manage your accounts</p>
              </div>
            </div>
          </div>
        </div>
      </header>
      <div className="sm:p-4">
        <div className="bg-white sm:rounded-lg sm:shadow-md sm:p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
                <p className="text-gray-600">Connecting to Instagram...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 sm:border border-red-200 rounded-2xl p-4 sm:p-6 mb-6 mx-3 sm:mx-0">
              <div className="flex items-center space-x-3 mb-4">
                <AlertCircle className="h-6 w-6 text-red-600" />
                <h3 className="text-lg font-semibold text-red-800">Connection Error</h3>
              </div>
              <p className="text-red-700 mb-4">{error}</p>
              <div className="bg-blue-50 sm:border border-blue-200 rounded-xl p-3 sm:p-4 mb-6 max-w-md mx-auto">
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
              <div className="bg-blue-50 sm:border border-blue-200 rounded-xl p-3 sm:p-4 mb-6 max-w-md mx-auto">
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
                className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-3 mx-auto font-medium"
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
                className="bg-pink-600 text-white py-3 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50"
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
