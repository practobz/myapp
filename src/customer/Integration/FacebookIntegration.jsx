import React, { useState, useEffect } from 'react';
import {
  Facebook, BarChart3, Eye, Calendar, Instagram, Trash2, TrendingUp
} from 'lucide-react';
import TrendChart from '../../components/TrendChart';
import { subDays, format } from 'date-fns';

// Your Facebook App ID
const FACEBOOK_APP_ID = '1678447316162226';

function FacebookIntegration() {
  // Facebook integration state
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  const [fbLoggedIn, setFbLoggedIn] = useState(false);
  const [fbUserData, setFbUserData] = useState(null);
  const [fbPages, setFbPages] = useState([]);
  const [fbError, setFbError] = useState(null);
  const [pageInsights, setPageInsights] = useState({});
  const [pagePosts, setPagePosts] = useState({});
  const [loadingInsights, setLoadingInsights] = useState({});
  const [loadingPosts, setLoadingPosts] = useState({});
  const [analyticsData, setAnalyticsData] = useState({});
  const [loadingAnalytics, setLoadingAnalytics] = useState({});

  // Add time period state
  const [timePeriods, setTimePeriods] = useState({});

  // Add Instagram posts state
  const [instagramPosts, setInstagramPosts] = useState({});
  const [loadingInstagramPosts, setLoadingInstagramPosts] = useState({});

  // Add state for showing/hiding posts
  const [showFacebookPosts, setShowFacebookPosts] = useState({});
  const [showInstagramPosts, setShowInstagramPosts] = useState({});

  // --- New state for post upload modal ---
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTarget, setPostTarget] = useState(null); // { type: 'facebook'|'instagram', page, instagramId }
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

  // --- Facebook SDK load ---
  useEffect(() => {
    // Load Facebook SDK script
    if (document.getElementById('facebook-jssdk')) {
      setFbSdkLoaded(true);
      return;
    }
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v19.0' // Updated to latest version
      });
      setFbSdkLoaded(true);

      // Check login status on init
      window.FB.getLoginStatus(response => {
        statusChangeCallback(response);
      });
    };
    // Load SDK script
    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  // Handle status response
  const statusChangeCallback = (response) => {
    if (response.status === 'connected') {
      setFbLoggedIn(true);
      fetchFbUserData();
      fetchFbPages();
    } else {
      setFbLoggedIn(false);
      setFbUserData(null);
      setFbPages([]);
      setPageInsights({});
      setPagePosts({});
    }
  };

  // Facebook login with enhanced permissions
  const fbLogin = () => {
    window.FB.login(statusChangeCallback, {
      scope: 'pages_show_list,pages_read_engagement,pages_manage_metadata,instagram_basic,email,public_profile,pages_manage_posts,instagram_content_publish',
      return_scopes: true,
      auth_type: 'rerequest' // <-- Force re-prompt for permissions if previously declined
    });
  };

  // Facebook logout
  const fbLogout = () => {
    window.FB.logout(response => {
      setFbLoggedIn(false);
      setFbUserData(null);
      setFbPages([]);
      setPageInsights({});
      setPagePosts({});
    });
  };

  // Fetch basic user info
  const fetchFbUserData = () => {
    window.FB.api('/me', { fields: 'id,name,email,picture' }, function(response) {
      if (!response || response.error) {
        setFbError(response.error);
      } else {
        setFbUserData(response);
      }
    });
  };

  // Add function to fetch analytics from database
  const fetchStoredAnalytics = async (pageId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/analytics/${pageId}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        // Use the most recent analytics data
        const latestAnalytics = result.data[0];
        console.log('✅ Loaded analytics from database:', latestAnalytics.createdAt);
        
        setAnalyticsData(prev => ({
          ...prev,
          [pageId]: latestAnalytics.analytics
        }));
        
        // Update time period to match stored data
        setTimePeriods(prev => ({ ...prev, [pageId]: latestAnalytics.timePeriod }));
        
        return true; // Successfully loaded from DB
      }
      return false; // No data in DB
    } catch (error) {
      console.warn('Failed to fetch stored analytics:', error);
      return false; // Fallback to live API
    }
  };

  // Add function to store connected page information
  const storeConnectedPage = async (page) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/connected-pages/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page.id,
          pageName: page.name,
          accessToken: page.access_token,
          instagramId: page.instagram_details?.id || null,
          instagramUsername: page.instagram_details?.username || null,
          userId: fbUserData?.id || 'unknown'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored connected page:', page.name);
      }
    } catch (error) {
      console.warn('Failed to store connected page:', error);
    }
  };

  // Enhanced fetch pages with detailed information
  const fetchFbPages = () => {
    window.FB.api('/me/accounts', {
      fields: 'id,name,access_token,category,about,fan_count,link,picture,username,website,phone,verification_status,instagram_business_account'
    }, function(response) {
      if (!response || response.error) {
        setFbError(response.error);
      } else {
        setFbPages(response.data);
        
        // Store each connected page in database
        response.data.forEach(page => {
          storeConnectedPage(page);
          
          if (page.instagram_business_account) {
            fetchInstagramDetails(page.instagram_business_account.id, page.access_token);
          }
        });
      }
    });
  };

  // Fetch Instagram business account details with correct fields
  const fetchInstagramDetails = (instagramId, pageAccessToken) => {
    window.FB.api(
      `/${instagramId}`,
      {
        fields: 'id,username,media_count,followers_count,follows_count,profile_picture_url,biography,website',
        access_token: pageAccessToken
      },
      function(response) {
        if (!response || response.error) {
          console.error('Instagram fetch error:', response.error);
          // Don't set error state for Instagram failures as it's optional
        } else {
          // Update state with Instagram details
          setFbPages(prev => prev.map(page => 
            page.instagram_business_account?.id === instagramId 
              ? { ...page, instagram_details: response }
              : page
          ));
        }
      }
    );
  };

  // Remove insights entirely and focus on post engagement metrics
  const fetchPageInsights = (pageId, pageAccessToken, instagramId = null) => {
    setLoadingInsights(prev => ({ ...prev, [pageId]: true }));
    
    // Fetch Facebook posts
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
          setPageInsights(prev => ({
            ...prev,
            [pageId]: []
          }));
        } else {
          // Calculate Facebook engagement metrics
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
          
          // If Instagram is connected, also fetch Instagram metrics
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

  // Fetch Instagram metrics and combine with Facebook metrics
  const fetchInstagramMetrics = (instagramId, pageAccessToken, pageId, fbMetrics) => {
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
          // Use only Facebook metrics if Instagram fails
          setPageInsights(prev => ({
            ...prev,
            [pageId]: fbMetrics
          }));
        } else {
          // Calculate Instagram engagement metrics
          const instagramPosts = response.data;
          const totalInstagramLikes = instagramPosts.reduce((sum, post) => sum + (post.like_count || 0), 0);
          const totalInstagramComments = instagramPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
          
          const instagramMetrics = [
            { name: 'IG Likes', value: totalInstagramLikes, title: 'Instagram Likes (Last 10 posts)' },
            { name: 'IG Comments', value: totalInstagramComments, title: 'Instagram Comments (Last 10 posts)' }
          ];
          
          // Combine Facebook and Instagram metrics
          const combinedMetrics = [...fbMetrics, ...instagramMetrics];
          
          setPageInsights(prev => ({
            ...prev,
            [pageId]: combinedMetrics
          }));
        }
      }
    );
  };

  // Enhanced real-time analytics using post data
  const fetchPageAnalytics = (pageId, pageAccessToken, instagramId = null, days = 30) => {
    setLoadingAnalytics(prev => ({ ...prev, [pageId]: true }));
    
    // Update selected time period
    setTimePeriods(prev => ({ ...prev, [pageId]: days }));
    
    // Skip Facebook Insights API entirely and go straight to post-based analytics
    console.log('Using post-based analytics (Facebook Insights API not available for this app type)');
    fetchPostBasedAnalytics(pageId, pageAccessToken, instagramId, days);
  };

  // Add missing processAnalyticsData function (placeholder since Facebook Insights API isn't working)
  const processAnalyticsData = (insightsData, days = 30) => {
    // This is a fallback function since Facebook Insights API is not available
    // It creates empty data structure that matches what generatePostBasedAnalytics returns
    const endDate = new Date();
    const result = {
      engagement: [],
      likes: [],
      comments: [],
      shares: []
    };

    // Create empty data points for each day
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

  // Generate Instagram analytics from post data with time period
  const generateInstagramPostAnalytics = (posts, days = 30) => {
    const endDate = new Date();
    const result = {
      likes: [],
      comments: [],
      posts: []
    };

    // Group Instagram posts by day for the specified period
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Filter posts from this day
      const dayPosts = posts.filter(post => {
        const postDate = new Date(post.timestamp);
        return format(postDate, 'yyyy-MM-dd') === dateStr;
      });

      // Calculate metrics for this day
      const dayLikes = dayPosts.reduce((sum, post) => sum + (post.like_count || 0), 0);
      const dayComments = dayPosts.reduce((sum, post) => sum + (post.comments_count || 0), 0);
      const postCount = dayPosts.length;

      result.likes.push({ date: dateStr, value: dayLikes });
      result.comments.push({ date: dateStr, value: dayComments });
      result.posts.push({ date: dateStr, value: postCount });
    }

    return result;
  };

  // Fallback analytics using recent posts data with time period
  const fetchPostBasedAnalytics = (pageId, pageAccessToken, instagramId = null, days = 30) => {
    // Calculate how many posts to fetch based on days (more days = more posts needed)
    const postsLimit = Math.min(500, Math.max(50, days * 3)); // Scale posts with days
    
    // Fetch more posts for better analytics
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
          // Try to get Instagram data
          fetchInstagramPostAnalytics(instagramId, pageAccessToken, pageId, analyticsData, days);
        } else {
          setAnalyticsData(prev => ({
            ...prev,
            [pageId]: { facebook: analyticsData }
          }));
          setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
          
          // Store Facebook-only analytics data
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

  // Generate analytics from post data with custom time period
  const generatePostBasedAnalytics = (posts, days = 30) => {
    const endDate = new Date();
    const result = {
      engagement: [],
      likes: [],
      comments: [],
      shares: []
    };

    // Group posts by day for the specified period
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Filter posts from this day
      const dayPosts = posts.filter(post => {
        const postDate = new Date(post.created_time);
        return format(postDate, 'yyyy-MM-dd') === dateStr;
      });

      // Calculate metrics for this day
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

  // Fetch Instagram analytics using post data with time period
  const fetchInstagramPostAnalytics = (instagramId, pageAccessToken, pageId, fbData, days = 30) => {
    const postsLimit = Math.min(500, Math.max(50, days * 2)); // Scale Instagram posts with days
    
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
          // Use only Facebook data
          setAnalyticsData(prev => ({
            ...prev,
            [pageId]: { facebook: fbData }
          }));
          
          // Store Facebook-only analytics data
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
        
        // Store combined Facebook and Instagram analytics data
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

  // Modified analytics fetcher with database-first approach
  const fetchPageAnalyticsWithDbFirst = async (pageId, pageAccessToken, instagramId = null, days = 30) => {
    setLoadingAnalytics(prev => ({ ...prev, [pageId]: true }));
    
    // Update selected time period
    setTimePeriods(prev => ({ ...prev, [pageId]: days }));
    
    try {
      // Step 1: Try to load from database first
      const loadedFromDb = await fetchStoredAnalytics(pageId);
      
      if (loadedFromDb) {
        console.log('📊 Using stored analytics data');
        setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
        return;
      }
      
      // Step 2: Fallback to live API + store result
      console.log('🔄 No stored data found, fetching live analytics...');
      await fetchPageAnalyticsLive(pageId, pageAccessToken, instagramId, days);
      
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
    }
  };

  // Renamed original function for live API calls
  const fetchPageAnalyticsLive = async (pageId, pageAccessToken, instagramId = null, days = 30) => {
    console.log('📡 Fetching live analytics from Facebook APIs...');
    fetchPostBasedAnalytics(pageId, pageAccessToken, instagramId, days);
  };

  // Enhanced analytics rendering with data source indicator
  const renderAnalytics = (pageId) => {
    const analytics = analyticsData[pageId];
    const selectedPeriod = timePeriods[pageId] || 30;
    
    if (!analytics) return null;

    // Check if this is recent stored data (less than 24 hours old)
    const isStoredData = () => {
      // You could add a timestamp check here if you store when the data was fetched
      return true; // For now, assume it could be stored data
    };

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
          {/* Facebook Analytics */}
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

          {/* Instagram Analytics */}
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

        {/* Real-time Summary Cards */}
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

        {/* Data Source Information */}
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

  // Fetch page posts
  const fetchPagePosts = (pageId, pageAccessToken) => {
    setLoadingPosts(prev => ({ ...prev, [pageId]: true }));

    // Only request safe fields for posts, then fetch attachments/media for each post
    window.FB.api(
      `/${pageId}/posts`,
      {
        fields: 'id,message,created_time,permalink_url', // only safe fields
        limit: 10,
        access_token: pageAccessToken
      },
      async function(response) {
        setLoadingPosts(prev => ({ ...prev, [pageId]: false }));
        if (!response || response.error) {
          console.error('Posts fetch error:', response.error);
          setFbError(response.error);
        } else {
          // For each post, fetch attachments/media if needed
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

  // Enhanced fetch Instagram posts with better display
  const fetchInstagramPosts = (instagramId, pageAccessToken) => {
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
          // Auto-show posts after fetching
          setShowInstagramPosts(prev => ({ ...prev, [instagramId]: true }));
        }
      }
    );
  };

  // Render page insights
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

  // Enhanced render page posts with toggle functionality
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

  // Enhanced render Instagram posts with toggle functionality
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

  // --- Modal for creating a post ---
  const renderPostModal = () => {
    if (!showPostModal || !postTarget) return null;
    const { type, page, instagramId } = postTarget;

    // --- handle file upload and get a public URL ---
    const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      // You must upload the file to a public image host and use the resulting URL for Instagram
      // Example: Use Cloudinary, S3, or your own backend API
      // For demo, we'll just show a warning and clear the field
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
            {/* File upload field (shows warning for Instagram) */}
            <input
              className="w-full border rounded p-2"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {/* Show preview if image is selected */}
            {postImageUrl && (
              <img src={postImageUrl} alt="Preview" className="w-full h-32 object-contain rounded border" />
            )}
            {/* URL input for public image */}
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

  // --- Enhanced page details rendering ---
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
            {/* --- Add Create Post button for Facebook --- */}
            <button
              className="bg-blue-700 text-white px-4 py-2 rounded text-sm hover:bg-blue-800 flex items-center space-x-2"
              onClick={() => {
                setPostTarget({ type: 'facebook', page });
                setShowPostModal(true);
                setPostMessage('');
                setPostImageUrl('');
                setUploadResult(null);
              }}
            >
              <Facebook className="h-4 w-4" />
              <span>Create FB Post</span>
            </button>
            {/* --- Add Create Post button for Instagram if connected --- */}
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
              >
                <Instagram className="h-4 w-4" />
                <span>Create IG Post</span>
              </button>
            )}
            <button
              onClick={() => fetchPageInsights(page.id, page.access_token, page.instagram_details?.id)}
              disabled={loadingInsights[page.id]}
              className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>{loadingInsights[page.id] ? 'Loading...' : 'Get Insights'}</span>
            </button>
            
            <button
              onClick={() => fetchPageAnalyticsWithDbFirst(page.id, page.access_token, page.instagram_details?.id, timePeriods[page.id] || 30)}
              disabled={loadingAnalytics[page.id]}
              className="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <TrendingUp className="h-4 w-4" />
              <span>{loadingAnalytics[page.id] ? 'Loading...' : 'Smart Analytics'}</span>
            </button>
            
            <button
              onClick={() => fetchPageAnalyticsLive(page.id, page.access_token, page.instagram_details?.id, timePeriods[page.id] || 30)}
              disabled={loadingAnalytics[page.id]}
              className="bg-orange-500 text-white px-4 py-2 rounded text-sm hover:bg-orange-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <span>📡</span>
              <span>{loadingAnalytics[page.id] ? 'Loading...' : 'Live API Call'}</span>
            </button>

            <button
              onClick={() => fetchPagePosts(page.id, page.access_token)}
              disabled={loadingPosts[page.id]}
              className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2"
            >
              <Facebook className="h-4 w-4" />
              <span>{loadingPosts[page.id] ? 'Loading...' : 'Show FB Posts'}</span>
            </button>

            {page.instagram_details && (
              <button
                onClick={() => fetchInstagramPosts(page.instagram_details.id, page.access_token)}
                disabled={loadingInstagramPosts[page.instagram_details.id]}
                className="bg-pink-500 text-white px-4 py-2 rounded text-sm hover:bg-pink-600 disabled:opacity-50 flex items-center space-x-2"
              >
                <Instagram className="h-4 w-4" />
                <span>{loadingInstagramPosts[page.instagram_details.id] ? 'Loading...' : 'Show IG Posts'}</span>
              </button>
            )}
          </div>

          {/* Display insights and posts */}
          {renderPageInsights(page.id)}
          {renderAnalytics(page.id)}
          {renderPagePosts(page.id)}
          {page.instagram_details && renderInstagramPosts(page.instagram_details.id)}
        </div>
      </div>
    </div>
  );

  // --- Facebook post upload ---
  const uploadFacebookPost = async (page) => {
    setUploadingPost(true);
    setUploadResult(null);

    // Check for required permissions before posting
    window.FB.api(
      '/me/permissions',
      (permRes) => {
        const perms = permRes?.data || [];
        const hasManagePosts = perms.some(p => p.permission === 'pages_manage_posts' && p.status === 'granted');
        const hasReadEngagement = perms.some(p => p.permission === 'pages_read_engagement' && p.status === 'granted');
        if (!hasManagePosts || !hasReadEngagement) {
          setUploadingPost(false);
          setUploadResult({ success: false, error: 'Missing required permissions: pages_manage_posts and pages_read_engagement. Please log out and log in again, granting all permissions.' });
          return;
        }

        // Proceed with posting
        window.FB.api(
          `/${page.id}/feed`,
          'POST',
          {
            message: postMessage,
            picture: postImageUrl || undefined,
            access_token: page.access_token
          },
          function(response) {
            setUploadingPost(false);
            if (!response || response.error) {
              setUploadResult({ success: false, error: response?.error?.message || 'Unknown error' });
            } else {
              setUploadResult({ success: true, id: response.id });
            }
          }
        );
      }
    );
  };

  // --- Instagram post upload (photo only) ---
  const uploadInstagramPost = async (page, instagramId) => {
    setUploadingPost(true);
    setUploadResult(null);
    // Step 1: Create media container
    window.FB.api(
      `/${instagramId}/media`,
      'POST',
      {
        image_url: postImageUrl,
        caption: postMessage,
        access_token: page.access_token
      },
      function(response) {
        if (response && response.id) {
          // Step 2: Publish container
          window.FB.api(
            `/${instagramId}/media_publish`,
            'POST',
            {
              creation_id: response.id,
              access_token: page.access_token
            },
            function(pubRes) {
              setUploadingPost(false);
              if (!pubRes || pubRes.error) {
                setUploadResult({ success: false, error: pubRes?.error?.message || 'Unknown error' });
              } else {
                setUploadResult({ success: true, id: pubRes.id });
              }
            }
          );
        } else {
          setUploadingPost(false);
          setUploadResult({ success: false, error: response?.error?.message || 'Container creation failed' });
        }
      }
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
          {!fbLoggedIn ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Connect your Facebook account to manage your pages and access detailed analytics.
              </p>
              <button
                onClick={fbLogin}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
              >
                <Facebook className="h-5 w-5" />
                <span>Connect Facebook Account</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {fbUserData?.picture && (
                    <img 
                      src={fbUserData.picture.data.url} 
                      alt="Profile"
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium">Connected as: {fbUserData?.name}</p>
                    <p className="text-sm text-gray-600">{fbUserData?.email}</p>
                  </div>
                </div>
                <button
                  onClick={fbLogout}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors"
                >
                  Disconnect
                </button>
              </div>

              <div>
                <h4 className="font-medium mb-3">Your Facebook Pages:</h4>
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
            </div>
          )}
          {fbError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600 text-sm">
                <strong>Error:</strong> {fbError.message || JSON.stringify(fbError)}
              </p>
            </div>
          )}
        </>
      )}
      {renderPostModal()}
    </div>
  );
}

export default FacebookIntegration;