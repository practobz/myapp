import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, MessageCircle, Heart, Share, 
  Eye, Calendar, Filter, ArrowUp, ArrowDown, Award, Target,
  RefreshCw, Download, ExternalLink, Star, Zap,
  Clock, ThumbsUp, TrendingDown, Activity
} from 'lucide-react';
import { format, parseISO, differenceInDays, subDays } from 'date-fns';
import TrendChart from './TrendChart';
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

const PostAnalytics = ({ posts = [], platform, accountInfo, timeRange = 30 }) => {
  const [selectedPost, setSelectedPost] = useState(null);
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterType, setFilterType] = useState('all');
  const [showComparison, setShowComparison] = useState(false);
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Process posts data for analytics
  useEffect(() => {
    if (posts && posts.length > 0) {
      generateAnalyticsData();
    }
  }, [posts, timeRange]);

  const generateAnalyticsData = () => {
    setLoading(true);
    
    // Calculate performance metrics
    const processedPosts = posts.map(post => {
      const likes = post.like_count || post.likes?.summary?.total_count || 0;
      const comments = post.comments_count || post.comments?.summary?.total_count || 0;
      const shares = post.shares?.count || 0;
      const views = post.views_count || 0;
      
      const totalEngagement = likes + comments + shares;
      const engagementRate = accountInfo?.followers_count ? 
        ((totalEngagement / accountInfo.followers_count) * 100).toFixed(2) : 0;
      
      return {
        ...post,
        processed: {
          likes,
          comments,
          shares,
          views,
          totalEngagement,
          engagementRate: parseFloat(engagementRate),
          postDate: new Date(post.timestamp || post.created_time),
          performance: calculatePerformanceScore(likes, comments, shares, views)
        }
      };
    });

    // Calculate growth metrics
    const growthMetrics = calculateGrowthMetrics(processedPosts);
    
    // Generate trend data
    const trendData = generateTrendData(processedPosts);
    
    setAnalyticsData({
      posts: processedPosts,
      growthMetrics,
      trendData,
      summary: generateSummaryStats(processedPosts)
    });
    
    setLoading(false);
  };

  const calculatePerformanceScore = (likes, comments, shares, views) => {
    // Weight different engagement types
    const score = (likes * 1) + (comments * 3) + (shares * 5) + (views * 0.1);
    return Math.round(score);
  };

  const calculateGrowthMetrics = (posts) => {
    const sortedPosts = posts.sort((a, b) => a.processed.postDate - b.processed.postDate);
    const midPoint = Math.floor(sortedPosts.length / 2);
    
    const firstHalf = sortedPosts.slice(0, midPoint);
    const secondHalf = sortedPosts.slice(midPoint);
    
    const firstHalfAvg = firstHalf.reduce((sum, p) => sum + p.processed.totalEngagement, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, p) => sum + p.processed.totalEngagement, 0) / secondHalf.length;
    
    const growthPercent = firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg * 100) : 0;
    
    return {
      engagementGrowth: growthPercent,
      avgEngagementFirst: firstHalfAvg,
      avgEngagementSecond: secondHalfAvg,
      improvement: secondHalfAvg > firstHalfAvg
    };
  };

  const generateTrendData = (posts) => {
    const endDate = new Date();
    const trends = {
      daily: [],
      weekly: [],
      engagement: [],
      performance: []
    };

    // Generate daily data for the last 30 days
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayPosts = posts.filter(post => 
        format(post.processed.postDate, 'yyyy-MM-dd') === dateStr
      );

      const dayMetrics = {
        date: dateStr,
        posts: dayPosts.length,
        totalLikes: dayPosts.reduce((sum, p) => sum + p.processed.likes, 0),
        totalComments: dayPosts.reduce((sum, p) => sum + p.processed.comments, 0),
        totalShares: dayPosts.reduce((sum, p) => sum + p.processed.shares, 0),
        avgEngagement: dayPosts.length > 0 ? 
          dayPosts.reduce((sum, p) => sum + p.processed.totalEngagement, 0) / dayPosts.length : 0,
        avgPerformance: dayPosts.length > 0 ?
          dayPosts.reduce((sum, p) => sum + p.processed.performance, 0) / dayPosts.length : 0
      };

      trends.daily.push(dayMetrics);
      trends.engagement.push({ date: dateStr, value: dayMetrics.avgEngagement });
      trends.performance.push({ date: dateStr, value: dayMetrics.avgPerformance });
    }

    return trends;
  };

  const generateSummaryStats = (posts) => {
    const totalPosts = posts.length;
    const totalLikes = posts.reduce((sum, p) => sum + p.processed.likes, 0);
    const totalComments = posts.reduce((sum, p) => sum + p.processed.comments, 0);
    const totalShares = posts.reduce((sum, p) => sum + p.processed.shares, 0);
    const totalEngagement = totalLikes + totalComments + totalShares;
    
    const avgLikes = totalPosts > 0 ? Math.round(totalLikes / totalPosts) : 0;
    const avgComments = totalPosts > 0 ? Math.round(totalComments / totalPosts) : 0;
    const avgShares = totalPosts > 0 ? Math.round(totalShares / totalPosts) : 0;
    const avgEngagement = totalPosts > 0 ? Math.round(totalEngagement / totalPosts) : 0;
    
    // Find best performing post
    const bestPost = posts.reduce((best, current) => 
      current.processed.performance > (best?.processed.performance || 0) ? current : best, null
    );

    // Calculate engagement rate trends
    const avgEngagementRate = posts.length > 0 ? 
      posts.reduce((sum, p) => sum + p.processed.engagementRate, 0) / posts.length : 0;

    return {
      totalPosts,
      totalLikes,
      totalComments,
      totalShares,
      totalEngagement,
      avgLikes,
      avgComments,
      avgShares,
      avgEngagement,
      avgEngagementRate: parseFloat(avgEngagementRate.toFixed(2)),
      bestPost
    };
  };

  const getSortedAndFilteredPosts = () => {
    if (!analyticsData) return [];
    
    let filtered = analyticsData.posts;
    
    // Apply filters
    if (filterType !== 'all') {
      filtered = filtered.filter(post => {
        switch (filterType) {
          case 'high-engagement':
            return post.processed.engagementRate > analyticsData.summary.avgEngagementRate;
          case 'low-engagement':
            return post.processed.engagementRate < analyticsData.summary.avgEngagementRate;
          case 'recent':
            return differenceInDays(new Date(), post.processed.postDate) <= 7;
          case 'images':
            return post.media_type === 'IMAGE' || post.media_type === 'PHOTO';
          case 'videos':
            return post.media_type === 'VIDEO';
          default:
            return true;
        }
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'engagement':
          aVal = a.processed.totalEngagement;
          bVal = b.processed.totalEngagement;
          break;
        case 'likes':
          aVal = a.processed.likes;
          bVal = b.processed.likes;
          break;
        case 'comments':
          aVal = a.processed.comments;
          bVal = b.processed.comments;
          break;
        case 'shares':
          aVal = a.processed.shares;
          bVal = b.processed.shares;
          break;
        case 'performance':
          aVal = a.processed.performance;
          bVal = b.processed.performance;
          break;
        case 'timestamp':
        default:
          aVal = a.processed.postDate;
          bVal = b.processed.postDate;
          break;
      }
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return filtered;
  };

  const exportAnalyticsReport = () => {
    if (!analyticsData) return;
    
    const reportData = {
      summary: analyticsData.summary,
      growthMetrics: analyticsData.growthMetrics,
      posts: analyticsData.posts.map(post => ({
        id: post.id,
        caption: post.caption?.substring(0, 100) + '...' || 'No caption',
        date: format(post.processed.postDate, 'yyyy-MM-dd'),
        likes: post.processed.likes,
        comments: post.processed.comments,
        shares: post.processed.shares,
        engagement: post.processed.totalEngagement,
        engagementRate: post.processed.engagementRate,
        performance: post.processed.performance
      })),
      platform,
      accountInfo,
      generatedAt: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${platform}-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderSummaryCards = () => {
    if (!analyticsData) return null;

    const { summary, growthMetrics } = analyticsData;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Engagement Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Heart className="h-6 w-6 text-white" />
            </div>
            {growthMetrics.improvement && (
              <div className="flex items-center text-green-600 text-sm font-medium">
                <ArrowUp className="h-4 w-4 mr-1" />
                <span>{Math.abs(growthMetrics.engagementGrowth).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-900">{summary.totalEngagement.toLocaleString()}</p>
            <p className="text-sm text-blue-700 font-medium">Total Engagement</p>
            <p className="text-xs text-blue-600 mt-1">Avg: {summary.avgEngagement}/post</p>
          </div>
        </div>

        {/* Engagement Rate Card */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-600 p-3 rounded-xl">
              <Target className="h-6 w-6 text-white" />
            </div>
            <div className="text-green-600 text-sm font-medium">
              <Star className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-900">{summary.avgEngagementRate}%</p>
            <p className="text-sm text-green-700 font-medium">Avg Engagement Rate</p>
            <p className="text-xs text-green-600 mt-1">Industry avg: 1-3%</p>
          </div>
        </div>

        {/* Content Performance Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-600 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="text-purple-600 text-sm font-medium">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-purple-900">{summary.totalPosts}</p>
            <p className="text-sm text-purple-700 font-medium">Content Pieces</p>
            <p className="text-xs text-purple-600 mt-1">
              {summary.bestPost ? `Best: ${summary.bestPost.processed.performance} score` : 'No data'}
            </p>
          </div>
        </div>

        {/* Growth Impact Card */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-600 p-3 rounded-xl">
              <Zap className="h-6 w-6 text-white" />
            </div>
            {growthMetrics.improvement ? (
              <div className="flex items-center text-green-600 text-sm font-medium">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Growing</span>
              </div>
            ) : (
              <div className="flex items-center text-orange-600 text-sm font-medium">
                <TrendingDown className="h-4 w-4 mr-1" />
                <span>Stable</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-3xl font-bold text-orange-900">
              {Math.abs(growthMetrics.engagementGrowth).toFixed(1)}%
            </p>
            <p className="text-sm text-orange-700 font-medium">
              {growthMetrics.improvement ? 'Growth' : 'Change'}
            </p>
            <p className="text-xs text-orange-600 mt-1">Content impact</p>
          </div>
        </div>
      </div>
    );
  };

  const renderTrendCharts = () => {
    if (!analyticsData?.trendData) return null;

    return (
      <div className="mb-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Performance Trends</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendChart
            data={analyticsData.trendData.engagement}
            title="Daily Average Engagement"
            color="#3B82F6"
            metric="value"
          />
          <TrendChart
            data={analyticsData.trendData.performance}
            title="Content Performance Score"
            color="#8B5CF6"
            metric="value"
          />
        </div>
      </div>
    );
  };

  const renderContentValueReport = () => {
    if (!analyticsData) return null;

    const { summary, growthMetrics } = analyticsData;

    return (
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-8 mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-indigo-600 p-3 rounded-xl">
            <Activity className="h-8 w-8 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-indigo-900">Content Value Report</h3>
            <p className="text-indigo-700">Demonstrating the impact of our content strategy</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-indigo-800">📈 Growth Metrics</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-indigo-700">Engagement Growth:</span>
                <span className={`font-bold ${growthMetrics.improvement ? 'text-green-600' : 'text-orange-600'}`}>
                  {growthMetrics.improvement ? '+' : ''}{growthMetrics.engagementGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-700">Average Engagement Rate:</span>
                <span className="font-bold text-indigo-900">{summary.avgEngagementRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-700">Content Pieces Delivered:</span>
                <span className="font-bold text-indigo-900">{summary.totalPosts}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-indigo-700">Total Reach Generated:</span>
                <span className="font-bold text-indigo-900">{summary.totalEngagement.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-indigo-800">🎯 Performance Insights</h4>
            <div className="space-y-3">
              <div className="bg-white bg-opacity-60 rounded-lg p-3">
                <p className="text-sm text-indigo-700 mb-1">Engagement Performance</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-indigo-200 rounded-full h-2">
                    <div 
                      className="bg-indigo-600 h-2 rounded-full" 
                      style={{ width: `${Math.min(summary.avgEngagementRate * 20, 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-indigo-600 font-medium">
                    {summary.avgEngagementRate > 3 ? 'Excellent' : summary.avgEngagementRate > 1 ? 'Good' : 'Growing'}
                  </span>
                </div>
              </div>

              <div className="bg-white bg-opacity-60 rounded-lg p-3">
                <p className="text-sm text-indigo-700 mb-1">Content Consistency</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-indigo-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-full"></div>
                  </div>
                  <span className="text-xs text-green-600 font-medium">Consistent</span>
                </div>
              </div>

              <div className="bg-white bg-opacity-60 rounded-lg p-3">
                <p className="text-sm text-indigo-700 mb-1">Growth Trajectory</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-indigo-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${growthMetrics.improvement ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: '85%' }}
                    ></div>
                  </div>
                  <span className={`text-xs font-medium ${growthMetrics.improvement ? 'text-green-600' : 'text-yellow-600'}`}>
                    {growthMetrics.improvement ? 'Improving' : 'Stable'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-indigo-200">
          <p className="text-sm text-indigo-700 italic text-center">
            💡 Our content strategy has generated <strong>{summary.totalEngagement.toLocaleString()}</strong> total engagements 
            with an average engagement rate of <strong>{summary.avgEngagementRate}%</strong>
            {growthMetrics.improvement && (
              <span>, showing <strong>{growthMetrics.engagementGrowth.toFixed(1)}%</strong> growth in performance!</span>
            )}
          </p>
        </div>
      </div>
    );
  };

  const renderPostsList = () => {
    const sortedPosts = getSortedAndFilteredPosts();

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-600" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Posts</option>
                <option value="high-engagement">High Engagement</option>
                <option value="low-engagement">Low Engagement</option>
                <option value="recent">Recent (7 days)</option>
                <option value="images">Images Only</option>
                <option value="videos">Videos Only</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="timestamp">Date</option>
                <option value="engagement">Total Engagement</option>
                <option value="likes">Likes</option>
                <option value="comments">Comments</option>
                <option value="shares">Shares</option>
                <option value="performance">Performance Score</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="p-1 text-gray-600 hover:text-gray-800"
              >
                {sortOrder === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportAnalyticsReport}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export Report</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {sortedPosts.map((post) => (
            <div
              key={post.id}
              className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start space-x-4">
                {/* Post Media Preview */}
                <div className="flex-shrink-0">
                  {(post.media_url || post.thumbnail_url || post.full_picture) && (
                    <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={post.thumbnail_url || post.media_url || post.full_picture}
                        alt="Post media"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 right-1">
                        <span className={`px-1 py-0.5 text-xs rounded text-white ${
                          post.media_type === 'VIDEO' ? 'bg-red-500' : 
                          post.media_type === 'CAROUSEL_ALBUM' ? 'bg-purple-500' : 'bg-blue-500'
                        }`}>
                          {post.media_type === 'VIDEO' ? '📹' : 
                           post.media_type === 'CAROUSEL_ALBUM' ? '🎠' : '📷'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Post Content and Metrics */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-sm text-gray-500">
                          {format(post.processed.postDate, 'MMM dd, yyyy')}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          post.processed.engagementRate > analyticsData.summary.avgEngagementRate
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {post.processed.engagementRate}% engagement
                        </span>
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
                          {post.processed.performance} score
                        </span>
                      </div>
                      
                      {post.caption && (
                        <p className="text-gray-800 text-sm leading-relaxed line-clamp-2 mb-3">
                          {post.caption.length > 150 
                            ? post.caption.substring(0, 150) + '...'
                            : post.caption
                          }
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setSelectedPost(selectedPost?.id === post.id ? null : post)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View detailed analytics"
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                      {(post.permalink || post.permalink_url) && (
                        <a
                          href={post.permalink || post.permalink_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="View original post"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Engagement Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Heart className="h-4 w-4 text-red-500" />
                      <div>
                        <p className="font-semibold text-gray-900">{post.processed.likes.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">Likes</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MessageCircle className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="font-semibold text-gray-900">{post.processed.comments.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">Comments</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Share className="h-4 w-4 text-green-500" />
                      <div>
                        <p className="font-semibold text-gray-900">{post.processed.shares.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">Shares</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="font-semibold text-gray-900">{post.processed.totalEngagement.toLocaleString()}</p>
                        <p className="text-xs text-gray-600">Total Engagement</p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Analytics Expansion */}
                  {selectedPost?.id === post.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Performance Breakdown</h4>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Engagement Rate:</span>
                              <span className="font-medium">{post.processed.engagementRate}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Performance Score:</span>
                              <span className="font-medium">{post.processed.performance}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-gray-600">Days Since Posted:</span>
                              <span className="font-medium">
                                {differenceInDays(new Date(), post.processed.postDate)} days
                              </span>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Content Impact</h4>
                          <div className="space-y-2">
                            <div className="text-sm text-gray-600">
                              This post performed 
                              <span className={`font-medium ${
                                post.processed.engagementRate > analyticsData.summary.avgEngagementRate
                                  ? 'text-green-600' : 'text-orange-600'
                              }`}>
                                {' '}{post.processed.engagementRate > analyticsData.summary.avgEngagementRate ? 'above' : 'below'} average
                              </span>
                              {' '}with {post.processed.totalEngagement} total engagements.
                            </div>
                            
                            {post.processed.engagementRate > analyticsData.summary.avgEngagementRate && (
                              <div className="text-sm text-green-700 bg-green-50 rounded-lg p-3">
                                🎉 High-performing content! This type of post resonates well with your audience.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedPosts.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No posts match your current filters.</p>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Analyzing your content performance...</p>
        </div>
      </div>
    );
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-500">No posts available for analytics.</p>
        <p className="text-gray-400 text-sm mt-2">
          You have connected your account, but no posts were found.<br />
          This may be due to privacy settings, lack of recent posts, or data sync delays.<br />
          Please check your account permissions or try refreshing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Content Performance Analytics</h2>
          <p className="text-gray-600 mt-1">
            Detailed insights into your {platform} content performance and growth metrics
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Last {timeRange} days</span>
        </div>
      </div>

      {/* Summary Cards */}
      {renderSummaryCards()}

      {/* Content Value Report */}
      {renderContentValueReport()}

      {/* Trend Charts */}
      {renderTrendCharts()}

      {/* Posts List with Analytics */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-6">Individual Post Performance</h3>
        {renderPostsList()}
      </div>
    </div>
  );
};

export { PostAnalytics };
export default IntegratedPostAnalytics;