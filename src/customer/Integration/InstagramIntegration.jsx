import React, { useState, useEffect } from 'react';
import { Instagram, TrendingUp, ExternalLink, CheckCircle, AlertCircle, Loader2, Users, Heart, MessageCircle, Eye } from 'lucide-react';
import TrendChart from '../../components/TrendChart';
import { subDays, format } from 'date-fns';

// Your Facebook App ID (Instagram uses Facebook's Graph API)
const FACEBOOK_APP_ID = '1678447316162226';

function InstagramIntegration() {
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [userMedia, setUserMedia] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [instagramAccountId, setInstagramAccountId] = useState(null);
  const [pageAccessToken, setPageAccessToken] = useState(null);

  useEffect(() => {
    if (window.FB) {
      setFbSdkLoaded(true);
      window.FB.getLoginStatus(response => {
        if (response.status === 'connected') {
          setIsSignedIn(true);
          fetchInstagramData(response.authResponse.accessToken);
        }
      });
    } else {
      loadFacebookSDK();
    }
  }, []);

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
      setFbSdkLoaded(true);

      window.FB.getLoginStatus(response => {
        if (response.status === 'connected') {
          setIsSignedIn(true);
          fetchInstagramData(response.authResponse.accessToken);
        }
      });
    };

    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  };

  const handleSignIn = () => {
    if (!fbSdkLoaded) {
      setError('Facebook SDK not loaded yet. Please try again.');
      return;
    }

    setLoading(true);
    window.FB.login(response => {
      setLoading(false);
      if (response.status === 'connected') {
        setIsSignedIn(true);
        setError(null);
        fetchInstagramData(response.authResponse.accessToken);
      } else {
        setError('Failed to connect to Facebook. Instagram access requires Facebook login.');
      }
    }, {
      scope: 'instagram_basic,pages_show_list,pages_read_engagement'
    });
  };

  const fetchInstagramData = (accessToken) => {
    setLoading(true);
    
    window.FB.api('/me/accounts', {
      fields: 'id,name,instagram_business_account',
      access_token: accessToken
    }, function(response) {
      if (!response || response.error) {
        setError('Failed to fetch Facebook pages. Make sure you have Instagram Business account connected to a Facebook page.');
        setLoading(false);
        return;
      }

      const pagesWithInstagram = response.data.filter(page => page.instagram_business_account);
      
      if (pagesWithInstagram.length === 0) {
        setError('No Instagram Business accounts found. Please connect your Instagram account to a Facebook page first.');
        setLoading(false);
        return;
      }

      const instagramAccount = pagesWithInstagram[0].instagram_business_account;
      const pageAccessToken = pagesWithInstagram[0].access_token || accessToken;

      window.FB.api(`/${instagramAccount.id}`, {
        fields: 'id,username,media_count,followers_count,follows_count,profile_picture_url,biography,website',
        access_token: pageAccessToken
      }, function(profileResponse) {
        if (!profileResponse || profileResponse.error) {
          setError('Failed to fetch Instagram profile data.');
          setLoading(false);
          return;
        }

        setUserProfile(profileResponse);
        setInstagramAccountId(instagramAccount.id);
        setPageAccessToken(pageAccessToken);

        window.FB.api(`/${instagramAccount.id}/media`, {
          fields: 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count',
          limit: 6,
          access_token: pageAccessToken
        }, function(mediaResponse) {
          setLoading(false);
          if (!mediaResponse || mediaResponse.error) {
            setError('Failed to fetch Instagram media.');
            return;
          }

          setUserMedia(mediaResponse.data || []);
        });
      });
    });
  };

  const handleSignOut = () => {
    setIsSignedIn(false);
    setUserProfile(null);
    setUserMedia([]);
    setError(null);
    setAnalyticsData(null);
    
    if (window.FB) {
      window.FB.logout();
    }
  };

  const fetchAnalytics = () => {
    if (!instagramAccountId || !pageAccessToken) return;
    
    setLoadingAnalytics(true);
    
    const endDate = new Date();
    const startDate = subDays(endDate, 30);
    
    window.FB.api(
      `/${instagramAccountId}/insights`,
      {
        metric: 'follower_count,impressions,reach,profile_views',
        since: Math.floor(startDate.getTime() / 1000),
        until: Math.floor(endDate.getTime() / 1000),
        period: 'day',
        access_token: pageAccessToken
      },
      function(response) {
        setLoadingAnalytics(false);
        
        if (!response || response.error) {
          console.error('Instagram analytics fetch error:', response.error);
          setError('Failed to fetch Instagram analytics. This feature requires Instagram Business account.');
          return;
        }

        const processedData = processInstagramAnalytics(response.data);
        setAnalyticsData(processedData);
      }
    );
  };

  const processInstagramAnalytics = (data) => {
    const result = {
      followers: [],
      impressions: [],
      reach: [],
      profileViews: []
    };

    data.forEach(metric => {
      if (metric.name === 'follower_count' && metric.values) {
        result.followers = metric.values.map(value => ({
          date: value.end_time,
          value: value.value || 0
        }));
      } else if (metric.name === 'impressions' && metric.values) {
        result.impressions = metric.values.map(value => ({
          date: value.end_time,
          value: value.value || 0
        }));
      } else if (metric.name === 'reach' && metric.values) {
        result.reach = metric.values.map(value => ({
          date: value.end_time,
          value: value.value || 0
        }));
      } else if (metric.name === 'profile_views' && metric.values) {
        result.profileViews = metric.values.map(value => ({
          date: value.end_time,
          value: value.value || 0
        }));
      }
    });

    return result;
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
              <p className="text-sm text-gray-600">Last 30 days performance</p>
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
          
          {analyticsData.profileViews.length > 0 && (
            <TrendChart
              data={analyticsData.profileViews}
              title="Profile Views"
              color="#FF6B9D"
              metric="value"
            />
          )}
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

      {userProfile && (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200 rounded-2xl p-6">
          <div className="flex items-center space-x-4 mb-6">
            {userProfile.profile_picture_url ? (
              <img
                src={userProfile.profile_picture_url}
                alt="Instagram profile"
                className="w-20 h-20 rounded-full border-4 border-pink-200"
              />
            ) : (
              <div className="w-20 h-20 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center">
                <Instagram className="h-10 w-10 text-white" />
              </div>
            )}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">@{userProfile.username}</h2>
              {userProfile.biography && (
                <p className="text-gray-700 text-sm mt-1">{userProfile.biography}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-pink-600">
                {userProfile.media_count?.toLocaleString() || userMedia.length}
              </div>
              <div className="text-sm text-gray-600 font-medium">Posts</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-pink-600">
                {userProfile.followers_count?.toLocaleString() || 'N/A'}
              </div>
              <div className="text-sm text-gray-600 font-medium">Followers</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <div className="text-2xl font-bold text-pink-600">
                {userMedia.reduce((sum, media) => sum + (media.like_count || 0), 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 font-medium">Total Likes</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={fetchAnalytics}
          disabled={loadingAnalytics || !instagramAccountId}
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

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Posts ({userMedia.length})
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {userMedia.length > 0 ? userMedia.map(media => (
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
    </div>
  );

  if (!fbSdkLoaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
          <p className="text-gray-600">Loading Facebook SDK...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-pink-600" />
          <p className="text-gray-600">Connecting to Instagram...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
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
    );
  }

  return (
    <div className="space-y-6">
      {!isSignedIn ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl mb-4">
            <Instagram className="h-8 w-8 text-pink-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Instagram Business Account</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Connect your Instagram Business account through Facebook to access your profile and media analytics.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This requires an Instagram Business account connected to a Facebook page that you manage.
            </p>
          </div>
          <button
            onClick={handleSignIn}
            className="bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-3 rounded-xl hover:from-pink-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-3 mx-auto font-medium"
            disabled={loading}
          >
            <Instagram className="h-5 w-5" />
            <span>{loading ? 'Connecting...' : 'Connect Instagram Business Account'}</span>
          </button>
        </div>
      ) : (
        renderConnectedState()
      )}
    </div>
  );
}

export default InstagramIntegration;