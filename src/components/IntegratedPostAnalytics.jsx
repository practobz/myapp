import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, MessageCircle, Heart, Share, 
  Eye, Calendar, Filter, ArrowUp, ArrowDown, Award, Target,
  RefreshCw, Download, ExternalLink, Star, Zap
} from 'lucide-react';
import PostAnalytics from './PostAnalytics';
import CustomerValueDashboard from './CustomerValueDashboard';

const IntegratedPostAnalytics = ({ 
  instagramAccount, 
  facebookPages, 
  youtubeChannels,
  customerInfo 
}) => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [platformData, setPlatformData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    aggregateAllPlatformData();
  }, [instagramAccount, facebookPages, youtubeChannels, timeRange]);

  const aggregateAllPlatformData = async () => {
    setLoading(true);
    const allPlatformData = [];

    try {
      // Process Instagram data
      if (instagramAccount && instagramAccount.media) {
        allPlatformData.push({
          platform: 'instagram',
          accountInfo: instagramAccount.profile,
          posts: instagramAccount.media,
          accountName: instagramAccount.profile?.username || 'Instagram Account'
        });
      }

      // Process Facebook data
      if (facebookPages && facebookPages.length > 0) {
        facebookPages.forEach(page => {
          if (page.posts && page.posts.length > 0) {
            allPlatformData.push({
              platform: 'facebook',
              accountInfo: {
                followers_count: page.fan_count || 0,
                name: page.name
              },
              posts: page.posts,
              accountName: page.name
            });
          }
        });
      }

      // Process YouTube data
      if (youtubeChannels && youtubeChannels.length > 0) {
        youtubeChannels.forEach(channel => {
          if (channel.videos && channel.videos.length > 0) {
            allPlatformData.push({
              platform: 'youtube',
              accountInfo: {
                followers_count: parseInt(channel.channelInfo?.statistics?.subscriberCount || 0),
                name: channel.channelInfo?.snippet?.title
              },
              posts: channel.videos.map(video => ({
                id: video.id,
                timestamp: video.snippet?.publishedAt,
                caption: video.snippet?.title,
                like_count: parseInt(video.statistics?.likeCount || 0),
                comments_count: parseInt(video.statistics?.commentCount || 0),
                views_count: parseInt(video.statistics?.viewCount || 0),
                thumbnail_url: video.snippet?.thumbnails?.default?.url,
                media_type: 'VIDEO',
                permalink: `https://youtube.com/watch?v=${video.snippet?.resourceId?.videoId || video.id}`
              })),
              accountName: channel.channelInfo?.snippet?.title || 'YouTube Channel'
            });
          }
        });
      }

      setPlatformData(allPlatformData);
    } catch (error) {
      console.error('Error aggregating platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateCrossPlartformMetrics = () => {
    if (!platformData.length) return null;

    let totalFollowers = 0;
    let totalPosts = 0;
    let totalEngagement = 0;
    let totalViews = 0;

    const platformBreakdown = {};

    platformData.forEach(platform => {
      const followers = platform.accountInfo?.followers_count || 0;
      const posts = platform.posts?.length || 0;
      
      totalFollowers += followers;
      totalPosts += posts;

      let platformEngagement = 0;
      let platformViews = 0;

      platform.posts?.forEach(post => {
        const likes = post.like_count || post.likes?.summary?.total_count || 0;
        const comments = post.comments_count || post.comments?.summary?.total_count || 0;
        const shares = post.shares?.count || 0;
        const views = post.views_count || 0;
        
        platformEngagement += likes + comments + shares;
        platformViews += views;
      });

      totalEngagement += platformEngagement;
      totalViews += platformViews;

      // Engagement rate logic: cap at 100% if followers <= 10
      let engagementRateRaw = followers > 0 ? ((platformEngagement / followers) * 100) : 0;
      let engagementRate = followers <= 10 ? Math.min(engagementRateRaw, 100).toFixed(2) : engagementRateRaw.toFixed(2);

      platformBreakdown[platform.platform] = {
        followers,
        posts,
        engagement: platformEngagement,
        views: platformViews,
        avgEngagementPerPost: posts > 0 ? Math.round(platformEngagement / posts) : 0,
        engagementRate,
        engagementRateRaw, // for UI warning
      };
    });

    // Cross-platform engagement rate: cap at 100% if totalFollowers <= 10
    let avgEngagementRateRaw = totalFollowers > 0 ? ((totalEngagement / totalFollowers) * 100) : 0;
    let avgEngagementRate = totalFollowers <= 10 ? Math.min(avgEngagementRateRaw, 100).toFixed(2) : avgEngagementRateRaw.toFixed(2);

    return {
      totalFollowers,
      totalPosts,
      totalEngagement,
      totalViews,
      avgEngagementRate,
      avgEngagementRateRaw,
      avgEngagementPerPost: totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0,
      platformBreakdown
    };
  };

  const renderOverview = () => {
    // Check if there is any post data across all platforms
    const hasAnyPosts = platformData.some(platform => Array.isArray(platform.posts) && platform.posts.length > 0);
    const metrics = calculateCrossPlartformMetrics();

    if (!hasAnyPosts || !metrics) {
      return (
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No data available across platforms.</p>
          <p className="text-gray-400 text-sm mt-2">
            You are logged in and your accounts are connected.<br />
            No analytics data is available yet. This may be due to privacy settings, lack of recent posts, or data sync delays.<br />
            Please check your account permissions or try refreshing.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {/* Cross-Platform Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-600 p-3 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center text-green-600 text-sm font-medium">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Growing</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-900">{metrics.totalFollowers.toLocaleString()}</p>
              <p className="text-sm text-blue-700 font-medium">Total Reach</p>
              <p className="text-xs text-blue-600 mt-1">Across all platforms</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-purple-600 p-3 rounded-xl">
                <Heart className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center text-purple-600 text-sm font-medium">
                <Star className="h-4 w-4 mr-1" />
                <span>{metrics.avgEngagementRate}%</span>
                {metrics.totalFollowers <= 10 && (
                  <span className="ml-2 text-xs text-yellow-600" title="Engagement rate capped for low follower count">
                    (Capped)
                  </span>
                )}
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-900">{metrics.totalEngagement.toLocaleString()}</p>
              <p className="text-sm text-purple-700 font-medium">Total Engagement</p>
              <p className="text-xs text-purple-600 mt-1">All interactions</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-green-600 p-3 rounded-xl">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center text-green-600 text-sm font-medium">
                <Award className="h-4 w-4 mr-1" />
                <span>Quality</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-900">{metrics.totalPosts}</p>
              <p className="text-sm text-green-700 font-medium">Content Created</p>
              <p className="text-xs text-green-600 mt-1">Avg: {metrics.avgEngagementPerPost}/post</p>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-600 p-3 rounded-xl">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div className="flex items-center text-orange-600 text-sm font-medium">
                <Zap className="h-4 w-4 mr-1" />
                <span>Views</span>
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-orange-900">{metrics.totalViews.toLocaleString()}</p>
              <p className="text-sm text-orange-700 font-medium">Total Views</p>
              <p className="text-xs text-orange-600 mt-1">Video content</p>
            </div>
          </div>
        </div>

        {/* Platform Breakdown */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Platform Performance Breakdown</h3>
          
          <div className="space-y-6">
            {Object.entries(metrics.platformBreakdown).map(([platform, data]) => (
              <div key={platform} className="border border-gray-100 rounded-xl p-6 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      platform === 'facebook' ? 'bg-blue-600' :
                      platform === 'instagram' ? 'bg-pink-600' :
                      platform === 'youtube' ? 'bg-red-600' :
                      'bg-gray-600'
                    }`}>
                      {platform === 'facebook' && <Users className="h-6 w-6 text-white" />}
                      {platform === 'instagram' && <Heart className="h-6 w-6 text-white" />}
                      {platform === 'youtube' && <Eye className="h-6 w-6 text-white" />}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 capitalize">{platform}</h4>
                      <p className="text-sm text-gray-600">
                        {data.followers.toLocaleString()} followers • {data.posts} posts
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      {data.engagementRate}%
                      {data.followers <= 10 && (
                        <span className="ml-2 text-xs text-yellow-600" title="Engagement rate capped for low follower count">
                          (Capped)
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-600">Engagement Rate</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{data.engagement.toLocaleString()}</p>
                    <p className="text-xs text-gray-600">Total Engagement</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{data.avgEngagementPerPost}</p>
                    <p className="text-xs text-gray-600">Avg per Post</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{data.posts}</p>
                    <p className="text-xs text-gray-600">Posts Created</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">
                      {data.views ? data.views.toLocaleString() : '-'}
                    </p>
                    <p className="text-xs text-gray-600">Views</p>
                  </div>
                </div>

                {/* Performance indicator */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      parseFloat(data.engagementRate) > 2 ? 'bg-green-500' :
                      parseFloat(data.engagementRate) > 1 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`text-sm font-medium ${
                      parseFloat(data.engagementRate) > 2 ? 'text-green-600' :
                      parseFloat(data.engagementRate) > 1 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {parseFloat(data.engagementRate) > 2 ? 'Excellent Performance' :
                       parseFloat(data.engagementRate) > 1 ? 'Good Performance' : 'Room for Improvement'}
                    </span>
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Success Stories */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-indigo-900 mb-6">Content Success Highlights</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white bg-opacity-70 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-green-600 p-2 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Engagement Growth</h4>
              </div>
              <p className="text-2xl font-bold text-green-600 mb-2">{metrics.avgEngagementRate}%</p>
              <p className="text-sm text-gray-600">
                Average engagement rate across all platforms, significantly above industry average
              </p>
            </div>

            <div className="bg-white bg-opacity-70 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Audience Reach</h4>
              </div>
              <p className="text-2xl font-bold text-blue-600 mb-2">{metrics.totalFollowers.toLocaleString()}</p>
              <p className="text-sm text-gray-600">
                Total potential reach across all connected social media platforms
              </p>
            </div>

            <div className="bg-white bg-opacity-70 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-purple-600 p-2 rounded-lg">
                  <Award className="h-5 w-5 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900">Content Quality</h4>
              </div>
              <p className="text-2xl font-bold text-purple-600 mb-2">{metrics.avgEngagementPerPost}</p>
              <p className="text-sm text-gray-600">
                Average engagement per post, showing consistent content quality
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPlatformAnalytics = (platform) => {
    const platformInfo = platformData.find(p => p.platform === platform);
    
    if (!platformInfo) {
      return (
        <div className="text-center py-12">
          <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No {platform} data available.</p>
        </div>
      );
    }

    return (
      <PostAnalytics
        posts={platformInfo.posts}
        platform={platform}
        accountInfo={platformInfo.accountInfo}
        timeRange={timeRange}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading comprehensive analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Debug: Show incoming props */}
      <pre className="bg-green-50 border border-green-200 rounded p-2 text-xs mb-4">
        {JSON.stringify({
          instagramAccount,
          facebookPages,
          youtubeChannels
        }, null, 2)}
      </pre>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Social Media Analytics Dashboard</h1>
                <p className="text-gray-600 mt-1">
                  Comprehensive per-post analytics and customer value insights
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-600" />
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(parseInt(e.target.value))}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={7}>Last 7 days</option>
                    <option value={30}>Last 30 days</option>
                    <option value={60}>Last 60 days</option>
                    <option value={90}>Last 90 days</option>
                  </select>
                </div>
                
                <button
                  onClick={aggregateAllPlatformData}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'customer-value', label: 'Customer Value', icon: Award },
              { id: 'instagram', label: 'Instagram', icon: Heart },
              { id: 'facebook', label: 'Facebook', icon: Users },
              { id: 'youtube', label: 'YouTube', icon: Eye }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug: Show platformData summary */}
        {platformData.length > 0 && (
          <pre className="bg-yellow-50 border border-yellow-200 rounded p-2 text-xs mb-4">
            {JSON.stringify(platformData, null, 2)}
          </pre>
        )}
        {selectedTab === 'overview' && renderOverview()}
        {selectedTab === 'customer-value' && (
          <CustomerValueDashboard
            platformData={platformData}
            customerInfo={customerInfo}
            serviceMetrics={{ monthlyFee: 1500 }} // You can make this dynamic
            timeRange={timeRange}
          />
        )}
        {selectedTab === 'instagram' && renderPlatformAnalytics('instagram')}
        {selectedTab === 'facebook' && renderPlatformAnalytics('facebook')}
        {selectedTab === 'youtube' && renderPlatformAnalytics('youtube')}
      </div>
    </div>
  );
};

export default IntegratedPostAnalytics;