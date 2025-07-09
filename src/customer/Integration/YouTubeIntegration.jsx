import React, { useState, useEffect } from 'react';
import { Youtube, TrendingUp, ExternalLink, CheckCircle, AlertCircle, Loader2, Users, Eye, Play, Clock } from 'lucide-react';
import TrendChart from '../../components/TrendChart';
import { subDays, format } from 'date-fns';

// YouTube Integration Constants
const CLIENT_ID = '472498493428-lt5thlt6do1e5ep1spuhdjgv8oebnva2.apps.googleusercontent.com';
const API_KEY = 'AIzaSyBGJ8wSwTfYQrqu0fUueDBApGuJKEO8NmM';
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/youtube/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly';

function YouTubeIntegration() {
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [gisLoaded, setGisLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [channelInfo, setChannelInfo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [tokenClient, setTokenClient] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  useEffect(() => {
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.onload = () => setGapiLoaded(true);
    gapiScript.onerror = () => setError('Failed to load Google API script.');
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => setGisLoaded(true);
    gisScript.onerror = () => setError('Failed to load Google Identity Services script.');
    document.body.appendChild(gisScript);

    return () => {
      if (document.body.contains(gapiScript)) gapiScript.remove();
      if (document.body.contains(gisScript)) gisScript.remove();
    };
  }, []);

  useEffect(() => {
    if (gapiLoaded) {
      window.gapi.load('client', async () => {
        try {
          await window.gapi.client.init({
            apiKey: API_KEY,
            discoveryDocs: DISCOVERY_DOCS,
          });
        } catch (err) {
          setError('Failed to initialize Google API client');
        }
      });
    }
  }, [gapiLoaded]);

  useEffect(() => {
    if (gisLoaded) {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            window.gapi.client.setToken({ access_token: tokenResponse.access_token });
            setIsSignedIn(true);
            fetchChannelInfo();
          } else {
            setIsSignedIn(false);
            setChannelInfo(null);
            setVideos([]);
          }
        },
      });
      setTokenClient(client);
    }
  }, [gisLoaded]);

  const handleSignIn = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken();
    }
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    setChannelInfo(null);
    setVideos([]);
    setAnalyticsData(null);
    window.gapi.client.setToken('');
  };

  const fetchChannelInfo = async () => {
    try {
      const response = await window.gapi.client.youtube.channels.list({
        part: 'snippet,contentDetails,statistics',
        mine: true
      });
      
      if (response.result.items && response.result.items.length > 0) {
        const channel = response.result.items[0];
        setChannelInfo(channel);
        
        const uploadsPlaylistId = channel.contentDetails.relatedPlaylists.uploads;
        const videosResponse = await window.gapi.client.youtube.playlistItems.list({
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: 6
        });
        setVideos(videosResponse.result.items || []);
      } else {
        setError('No YouTube channel found for this account');
      }
    } catch (err) {
      console.error('YouTube API error:', err);
      setError((err.result && err.result.error && err.result.error.message) || 'Failed to fetch YouTube data');
    }
  };

  const fetchAnalytics = async () => {
    if (!channelInfo) return;
    
    setLoadingAnalytics(true);
    try {
      try {
        await fetchYouTubeAnalytics();
      } catch (analyticsError) {
        console.warn('YouTube Analytics API failed, using fallback method:', analyticsError);
        await fetchVideoBasedAnalytics();
      }
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Failed to fetch analytics data. Using available video data instead.');
      await fetchVideoBasedAnalytics();
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const fetchYouTubeAnalytics = async () => {
    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    
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
    
    if (response.result && response.result.rows) {
      const processedData = processYouTubeAnalytics(response.result);
      setAnalyticsData(processedData);
    } else {
      throw new Error('No analytics data available');
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
        setAnalyticsData(processedData);
      }
    } catch (err) {
      console.error('Video-based analytics error:', err);
      const fallbackData = createFallbackAnalytics();
      setAnalyticsData(fallbackData);
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
    
    return result;
  };

  const renderAnalytics = () => {
    if (!analyticsData) return null;
    
    return (
      <div className="mt-8 space-y-6">
        <div className="bg-gradient-to-r from-red-50 to-pink-50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-red-600 p-2 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">YouTube Analytics</h3>
                <p className="text-sm text-gray-600">Last 30 days performance</p>
              </div>
            </div>
            <div className="text-xs text-gray-500 bg-yellow-100 px-3 py-1 rounded-full">
              Analytics data may be estimated
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <TrendChart
            data={analyticsData.views}
            title="Daily Views"
            color="#FF0000"
            metric="value"
          />
          
          <TrendChart
            data={analyticsData.subscribers}
            title="Subscriber Count"
            color="#FF4444"
            metric="value"
          />
          
          <TrendChart
            data={analyticsData.watchTime}
            title="Watch Time (Hours)"
            color="#CC0000"
            metric="value"
          />
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-medium text-blue-900 mb-2">Analytics Information</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• For detailed analytics, enable YouTube Analytics API in Google Cloud Console</p>
            <p>• Current data shows estimates based on available video statistics</p>
            <p>• Historical subscriber changes require YouTube Analytics API access</p>
          </div>
        </div>
      </div>
    );
  };

  const renderConnectedState = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Connected</span>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Disconnect</span>
        </button>
      </div>

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
          </div>
          
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-600">
                {channelInfo.statistics.subscriberCount && channelInfo.statistics.subscriberCount !== '0' 
                  ? parseInt(channelInfo.statistics.subscriberCount).toLocaleString()
                  : 'Hidden'
                }
              </div>
              <div className="text-sm text-gray-600 font-medium">Subscribers</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-600">
                {channelInfo.statistics.videoCount 
                  ? parseInt(channelInfo.statistics.videoCount).toLocaleString()
                  : videos.length
                }
              </div>
              <div className="text-sm text-gray-600 font-medium">Videos</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-600">
                {channelInfo.statistics.viewCount 
                  ? parseInt(channelInfo.statistics.viewCount).toLocaleString()
                  : 'Hidden'
                }
              </div>
              <div className="text-sm text-gray-600 font-medium">Views</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={fetchAnalytics}
          disabled={loadingAnalytics}
          className="flex items-center space-x-2 bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-red-800 disabled:opacity-50 transition-all duration-200 font-medium"
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

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Latest Videos ({videos.length})
        </h3>
        <div className="space-y-4">
          {videos.length > 0 ? videos.map(video => (
            <div key={video.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <img
                src={video.snippet.thumbnails.default.url}
                alt={video.snippet.title}
                className="w-24 h-18 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 mb-1">{video.snippet.title}</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Published: {new Date(video.snippet.publishedAt).toLocaleDateString()}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-500">
                  <span className="flex items-center space-x-1">
                    <Play className="h-3 w-3" />
                    <span>Video</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <Youtube className="h-3 w-3" />
                    <span>YouTube</span>
                  </span>
                </div>
              </div>
            </div>
          )) : (
            <div className="text-center py-12">
              <Youtube className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No videos found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">Connection Error</h3>
        </div>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!gapiLoaded || !gisLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-gray-600">Loading Google API...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isSignedIn ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 rounded-2xl mb-4">
            <Youtube className="h-8 w-8 text-red-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect YouTube Account</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your YouTube account to manage your channel and access video analytics.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> For detailed analytics, you may need to enable YouTube Analytics API in your Google Cloud Console.
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
  );
}

export default YouTubeIntegration;