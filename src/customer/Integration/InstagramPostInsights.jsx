import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Eye, Heart, MessageCircle, Send, Share2, Bookmark, 
  Users, TrendingUp, ChevronRight, Play, Clock, UserPlus,
  Repeat, ArrowLeft, Info, Rocket, ChevronDown, BarChart3
} from 'lucide-react';
import TrendChart from '../../components/TrendChart';

/**
 * InstagramPostInsights Component
 * 
 * Displays comprehensive post insights similar to Instagram's native insights view.
 * Includes: Views, Reach, Retention, Audience Demographics, Interactions, etc.
 * 
 * API Reference: https://developers.facebook.com/docs/instagram-api/reference/ig-media/insights
 */

// Circular Progress Ring Component
const CircularProgress = ({ value, maxValue, size = 160, strokeWidth = 8, color = '#A855F7' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#374151"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-gray-400 uppercase tracking-wide">Views</span>
        <span className="text-3xl font-bold text-white">{value?.toLocaleString() || 0}</span>
      </div>
    </div>
  );
};

// Simple Line Chart Component for Retention
const RetentionChart = ({ data }) => {
  if (!data || data.length === 0) {
    // Generate sample retention curve if no data
    const sampleData = Array.from({ length: 10 }, (_, i) => ({
      time: i * 10,
      retention: Math.max(10, 100 - (i * 8) - Math.random() * 5)
    }));
    data = sampleData;
  }

  const maxRetention = Math.max(...data.map(d => d.retention));
  const height = 80;
  const width = 280;
  const padding = 10;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.retention / maxRetention) * (height - 2 * padding));
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
        {/* Grid lines */}
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" strokeWidth="1" />
        
        {/* Retention curve */}
        <polyline
          fill="none"
          stroke="#A855F7"
          strokeWidth="2"
          points={points}
        />
        
        {/* Area under curve */}
        <polygon
          fill="url(#retentionGradient)"
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        />
        
        <defs>
          <linearGradient id="retentionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between text-xs text-gray-500 px-2">
        <span>0s</span>
        <span>{Math.round((data.length - 1) * 10 / 2)}s</span>
        <span>{(data.length - 1) * 10}s</span>
      </div>
    </div>
  );
};

// Engagement Timeline Chart
const EngagementTimeline = ({ data, metric = 'likes' }) => {
  if (!data || data.length === 0) {
    // Generate sample timeline data
    const sampleData = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      value: Math.floor(Math.random() * 50) + 5
    }));
    data = sampleData;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const height = 60;
  const width = 300;
  const barWidth = (width - 20) / data.length - 1;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-20">
        {data.map((d, i) => {
          const barHeight = maxValue > 0 ? (d.value / maxValue) * height : 0;
          const x = 10 + i * ((width - 20) / data.length);
          const y = height - barHeight;
          
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="#EC4899"
              opacity={0.8}
              rx={1}
            />
          );
        })}
      </svg>
    </div>
  );
};

// Progress Bar Component
const ProgressBar = ({ label, value, percentage, color = 'bg-purple-500', icon }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2 flex-1">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="text-sm text-gray-300">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div 
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <span className="text-sm text-white font-medium w-12 text-right">{percentage?.toFixed(1)}%</span>
    </div>
  </div>
);

// Metric Row Component
const MetricRow = ({ icon, label, value, subValue, onClick }) => (
  <div 
    className={`flex items-center justify-between py-3 border-b border-gray-800 ${onClick ? 'cursor-pointer hover:bg-gray-800/50' : ''}`}
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="text-sm text-gray-300">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-white font-medium">{value}</span>
      {subValue && <span className="text-xs text-gray-500">{subValue}</span>}
      {onClick && <ChevronRight className="w-4 h-4 text-gray-500" />}
    </div>
  </div>
);

function InstagramPostInsights({ 
  isOpen, 
  onClose, 
  post, 
  accessToken,
  accountProfile,
  onBoostPost 
}) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('gender'); // gender, country, age
  const [profileActivityBreakdown, setProfileActivityBreakdown] = useState(null);

  // Determine media type
  const isReel = post?.media_product_type === 'REELS' || post?.media_type === 'REELS';
  const isVideo = post?.media_type === 'VIDEO';
  const isCarousel = post?.media_type === 'CAROUSEL_ALBUM';

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

  // Fetch detailed insights when component opens
  useEffect(() => {
    if (isOpen && post && accessToken) {
      fetchDetailedInsights();
    }
  }, [isOpen, post?.id, accessToken]);

  const fetchDetailedInsights = async () => {
    if (!post || !accessToken) return;

    setLoading(true);
    setError(null);
    setProfileActivityBreakdown(null);

    try {
      console.log(`📊 Fetching detailed insights for post ${post.id} (v25.0)...`);

      /**
       * Official metric availability per media type (v25.0, deprecated removed):
       * REELS  : comments, likes, reach, saved, shares, total_interactions, views,
       *          ig_reels_avg_watch_time, ig_reels_video_view_total_time
       * FEED VIDEO : comments, likes, reach, saved, shares, total_interactions, views,
       *              profile_visits, follows
       * CAROUSEL   : comments, likes, reach, saved, shares, total_interactions, views,
       *              profile_visits, follows
       * IMAGE      : comments, likes, follows, reach, saved, shares, total_interactions,
       *              views, profile_visits
       *
       * NOTE: profile_activity requires a separate request with breakdown=action_type
       *       because mixing breakdown + non-breakdown metrics in one call returns an error.
       *
       * Deprecated (DO NOT REQUEST):
       *   plays, clips_replays_count, ig_reels_aggregated_all_plays_count,
       *   impressions (for media after July 1 2024), video_views
       */

      // ── Request 1: main metrics (no breakdown) ─────────────────────────────
      let mainMetrics = [];
      if (isReel) {
        mainMetrics = [
          'reach', 'saved', 'shares', 'views', 'total_interactions',
          'ig_reels_avg_watch_time', 'ig_reels_video_view_total_time'
        ];
      } else if (isVideo) {
        mainMetrics = ['reach', 'saved', 'shares', 'views', 'total_interactions', 'profile_visits', 'follows'];
      } else if (isCarousel) {
        mainMetrics = ['reach', 'saved', 'shares', 'views', 'total_interactions', 'profile_visits', 'follows'];
      } else {
        // IMAGE
        mainMetrics = ['reach', 'saved', 'shares', 'views', 'total_interactions', 'profile_visits', 'follows'];
      }

      const mainUrl = `https://graph.facebook.com/v25.0/${post.id}/insights?metric=${mainMetrics.join(',')}&access_token=${accessToken}`;
      const mainResponse = await fetch(mainUrl);
      const mainData = await mainResponse.json();

      console.log('📊 Main insights response:', mainData);

      if (mainData.error) {
        throw new Error(mainData.error.message || 'Failed to fetch insights');
      }

      // Helper: reads values[0].value from the response array
      const getMetricValue = (metricName) => {
        const metric = mainData.data?.find(m => m.name === metricName);
        return metric?.values?.[0]?.value ?? metric?.total_value?.value ?? 0;
      };

      // ── Request 2: profile_activity with action_type breakdown (FEED only) ──
      // Must be a separate request — mixing breakdown + non-breakdown causes an API error
      if (!isReel) {
        try {
          const paUrl = `https://graph.facebook.com/v25.0/${post.id}/insights?metric=profile_activity&breakdown=action_type&access_token=${accessToken}`;
          const paResponse = await fetch(paUrl);
          const paData = await paResponse.json();

          console.log('📊 profile_activity breakdown response:', paData);

          if (!paData.error && paData.data?.length > 0) {
            const paMetric = paData.data[0];
            const totalProfileActivity = paMetric.total_value?.value || 0;
            const breakdown = paMetric.total_value?.breakdowns?.[0]?.results || [];

            // Label mapping for action_type values
            const actionLabels = {
              bio_link_clicked: 'Bio Link Clicked',
              call: 'Call',
              direction: 'Get Directions',
              email: 'Email',
              text: 'Text / DM',
              other: 'Other'
            };

            setProfileActivityBreakdown({
              total: totalProfileActivity,
              actions: breakdown.map(r => ({
                label: actionLabels[r.dimension_values?.[0]?.toLowerCase()] || r.dimension_values?.[0] || 'Unknown',
                value: r.value,
                pct: totalProfileActivity > 0 ? (r.value / totalProfileActivity) * 100 : 0
              })).filter(a => a.value > 0)
            });
          }
        } catch (paErr) {
          console.warn('⚠️ profile_activity breakdown fetch failed:', paErr.message);
        }
      }

      // ── Build final insights object ────────────────────────────────────────
      const rawViews = getMetricValue('views') || post.video_views || 0;

      const insightsData = {
        // Basic metrics from post object (always available)
        likes: post.like_count || 0,
        comments: post.comments_count || 0,

        // API metrics
        views: rawViews,
        reach: getMetricValue('reach'),
        saved: getMetricValue('saved'),
        shares: getMetricValue('shares'),
        totalInteractions: getMetricValue('total_interactions'),

        // Reels-specific (ig_reels_avg_watch_time / ig_reels_video_view_total_time)
        avgWatchTime: getMetricValue('ig_reels_avg_watch_time'),   // milliseconds
        totalWatchTime: getMetricValue('ig_reels_video_view_total_time'), // milliseconds

        // Profile activity (non-reels)
        profileVisits: getMetricValue('profile_visits'),
        follows: getMetricValue('follows'),

        // Calculated
        engagementRate: 0,

        // ── Simulated data (Instagram API doesn't expose these at post level) ──
        // Views by audience type
        viewsFromFollowers: Math.round(rawViews * 0.08),
        viewsFromNonFollowers: Math.round(rawViews * 0.92),

        // Top traffic sources
        topSources: isReel
          ? [
              { name: 'Reels tab', percentage: 68.7 },
              { name: 'Explore',   percentage: 15.6 },
              { name: 'Profile',   percentage: 2.3  },
              { name: 'Hashtags',  percentage: 1.2  }
            ]
          : [
              { name: 'Home Feed', percentage: 55.2 },
              { name: 'Profile',   percentage: 22.4 },
              { name: 'Explore',   percentage: 14.8 },
              { name: 'Hashtags',  percentage: 5.1  }
            ],

        // Audience demographics (only available at account level via the Insights API)
        audienceGender: { male: 38.5, female: 60.5, other: 1.0 },

        // Reel retention curve (simulated — API doesn't expose per-post retention)
        retentionData: Array.from({ length: 10 }, (_, i) => ({
          time: i * 10,
          retention: Math.max(15, 100 - (i * 9) - Math.random() * 3)
        })),

        // Skip rate (simulated)
        skipRate: 70 + Math.random() * 10,
        typicalSkipRate: 80 + Math.random() * 5,

        accountsReached: getMetricValue('reach') || Math.floor(rawViews * 0.85)
      };

      // Engagement rate
      if (insightsData.reach > 0) {
        const eng = insightsData.totalInteractions ||
          (insightsData.likes + insightsData.comments + insightsData.saved + insightsData.shares);
        insightsData.engagementRate = (eng / insightsData.reach) * 100;
      }

      setInsights(insightsData);
      console.log('✅ Insights parsed:', insightsData);

    } catch (err) {
      console.error('❌ Error fetching insights:', err);
      setError(err.message);

      // Fallback to post-level data
      setInsights({
        likes: post.like_count || 0,
        comments: post.comments_count || 0,
        views: post.video_views || 0,
        reach: null, saved: null, shares: null,
        error: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  // Format watch time
  // ig_reels_avg_watch_time and ig_reels_video_view_total_time are returned in milliseconds
  const formatWatchTime = (ms) => {
    if (!ms) return 'N/A';
    const totalSecs = Math.round(ms / 1000);
    if (totalSecs < 60) return `${totalSecs}s`;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Format large numbers
  const formatNumber = (num) => {
    if (!num && num !== 0) return 'N/A';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal - Full screen on mobile, centered on desktop */}
      <div className="relative bg-[#121212] w-full sm:max-w-md sm:max-h-[90vh] h-full sm:h-auto sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <button 
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-white font-semibold">
            {isReel ? 'Reel insights' : isVideo ? 'Video insights' : 'Post insights'}
          </h2>
          <div className="w-7" /> {/* Spacer for centering */}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : (
            <div className="pb-20">
              {/* Post Preview */}
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {(post.thumbnail_url || post.media_url) && (
                    <div className="relative">
                      <img
                        src={post.thumbnail_url || post.media_url}
                        alt="Post"
                        className="w-16 h-20 object-cover rounded-lg"
                      />
                      {(isReel || isVideo) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white drop-shadow-lg" fill="white" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 line-clamp-2">
                      {post.caption || 'No caption'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(post.timestamp).toLocaleDateString('en-US', { 
                        day: 'numeric', 
                        month: 'short', 
                        year: 'numeric' 
                      })} · {accountProfile?.username || 'Business Account'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Overview Section */}
              <div className="px-4 py-4">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Overview
                  <button className="p-0.5 hover:bg-gray-800 rounded-full">
                    <Info className="w-4 h-4 text-gray-500" />
                  </button>
                </h3>
                <p className="text-xs text-gray-500 mb-4">These are the metrics for this {isReel ? 'reel' : 'post'}.</p>

                {/* Main Metrics Grid */}
                <div className="space-y-3">
                  <MetricRow 
                    icon={<Eye className="w-4 h-4" />}
                    label="Views"
                    value={formatNumber(insights?.views)}
                  />
                  <MetricRow 
                    icon={<Clock className="w-4 h-4" />}
                    label="Watch time"
                    value={formatWatchTime(insights?.totalWatchTime)}
                  />
                  <MetricRow 
                    icon={<Heart className="w-4 h-4" />}
                    label="Interactions"
                    value={formatNumber(insights?.totalInteractions || (insights?.likes + insights?.comments + (insights?.saved || 0) + (insights?.shares || 0)))}
                  />
                  <MetricRow 
                    icon={<UserPlus className="w-4 h-4" />}
                    label="Profile activity"
                    value={formatNumber(insights?.follows || 0)}
                  />
                </div>
              </div>

              {/* Views Section */}
              {(isReel || isVideo) && (
                <div className="px-4 py-4 border-t border-gray-800">
                  <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                    Views
                    <button className="p-0.5 hover:bg-gray-800 rounded-full">
                      <Info className="w-4 h-4 text-gray-500" />
                    </button>
                  </h3>
                  <p className="text-xs text-gray-500 mb-6">Performance of this {isReel ? 'reel' : 'video'}.</p>

                  {/* Circular Views Display */}
                  <div className="flex justify-center mb-6">
                    <CircularProgress 
                      value={insights?.views || 0} 
                      maxValue={insights?.views || 1}
                      size={180}
                      strokeWidth={10}
                      color="#A855F7"
                    />
                  </div>

                  {/* Follower/Non-follower breakdown */}
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span className="text-sm text-gray-300">Followers</span>
                      </div>
                      <span className="text-sm text-white">
                        {insights?.views > 0
                          ? `${((insights.viewsFromFollowers / insights.views) * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-600" />
                        <span className="text-sm text-gray-300">Non-followers</span>
                      </div>
                      <span className="text-sm text-white">
                        {insights?.views > 0
                          ? `${((insights.viewsFromNonFollowers / insights.views) * 100).toFixed(1)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* Top sources of views */}
                  <div className="mb-6">
                    <h4 className="text-sm text-gray-400 mb-3">Top sources of views</h4>
                    {insights?.topSources?.map((source, index) => (
                      <ProgressBar 
                        key={index}
                        label={source.name}
                        percentage={source.percentage}
                        color={index === 0 ? 'bg-purple-500' : index === 1 ? 'bg-purple-400' : 'bg-gray-500'}
                      />
                    ))}
                  </div>

                  {/* Accounts reached */}
                  <MetricRow 
                    icon={<Users className="w-4 h-4" />}
                    label="Accounts reached"
                    value={formatNumber(insights?.accountsReached)}
                  />
                </div>
              )}

              {/* Retention Section (for Reels/Videos) */}
              {(isReel || isVideo) && (
                <div className="px-4 py-4 border-t border-gray-800">
                  <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                    Retention
                    <button className="p-0.5 hover:bg-gray-800 rounded-full">
                      <Info className="w-4 h-4 text-gray-500" />
                    </button>
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">How much of your {isReel ? 'reel' : 'video'} people watched.</p>

                  <RetentionChart data={insights?.retentionData} />

                  {/* Skip Rate */}
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm text-gray-400">Skip rate</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">This {isReel ? 'reel' : 'video'}'s skip rate</span>
                      <span className="text-sm text-white">{insights?.skipRate?.toFixed(0) || 75}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Your typical skip rate</span>
                      <span className="text-sm text-white">{insights?.typicalSkipRate?.toFixed(0) || 82}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Watch time</span>
                      <span className="text-sm text-white">{formatWatchTime(insights?.totalWatchTime)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Average watch time</span>
                      <span className="text-sm text-white">{formatWatchTime(insights?.avgWatchTime)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Activity */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Profile activity
                  <button className="p-0.5 hover:bg-gray-800 rounded-full">
                    <Info className="w-4 h-4 text-gray-500" />
                  </button>
                </h3>
                <p className="text-xs text-gray-500 mb-4">Actions people took after viewing this {isReel ? 'reel' : 'post'}.</p>

                {/* Follows — available for FEED + STORY */}
                <MetricRow
                  icon={<UserPlus className="w-4 h-4" />}
                  label="Follows"
                  value={formatNumber(insights?.follows || 0)}
                />
                <MetricRow
                  icon={<Eye className="w-4 h-4" />}
                  label="Profile visits"
                  value={formatNumber(insights?.profileVisits || 0)}
                />

                {/* profile_activity action_type breakdown (FEED only, separate API call) */}
                {!isReel && profileActivityBreakdown && profileActivityBreakdown.actions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Profile actions breakdown</h4>
                    <div className="space-y-1">
                      {profileActivityBreakdown.actions.map((action, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-gray-300">{action.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded-full"
                                style={{ width: `${Math.min(action.pct, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-white w-8 text-right">{action.value}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                        <span className="text-sm text-gray-400 font-medium">Total</span>
                        <span className="text-sm text-white font-semibold">{formatNumber(profileActivityBreakdown.total)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {!isReel && !profileActivityBreakdown && (
                  <p className="text-xs text-gray-600 mt-3">Profile action breakdown unavailable for this post.</p>
                )}
              </div>

              {/* Audience Section */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Audience
                  <button className="p-0.5 hover:bg-gray-800 rounded-full">
                    <Info className="w-4 h-4 text-gray-500" />
                  </button>
                </h3>
                <p className="text-xs text-gray-500 mb-4">People who viewed this {isReel ? 'reel' : 'post'}.</p>

                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                  {['Gender', 'Country', 'Age'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab.toLowerCase())}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        activeTab === tab.toLowerCase() 
                          ? 'bg-white text-black' 
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'gender' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-300">Men</span>
                      <span className="text-sm text-white">{insights?.audienceGender?.male?.toFixed(1) || 38.5}%</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-300">Women</span>
                      <span className="text-sm text-white">{insights?.audienceGender?.female?.toFixed(1) || 60.5}%</span>
                    </div>
                  </div>
                )}
                {activeTab === 'country' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-300">🇮🇳 India</span>
                      <span className="text-sm text-white">45.2%</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-300">🇺🇸 United States</span>
                      <span className="text-sm text-white">18.3%</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-300">🇬🇧 United Kingdom</span>
                      <span className="text-sm text-white">8.7%</span>
                    </div>
                  </div>
                )}
                {activeTab === 'age' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-300">18-24</span>
                      <span className="text-sm text-white">35.2%</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-300">25-34</span>
                      <span className="text-sm text-white">42.8%</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-300">35-44</span>
                      <span className="text-sm text-white">15.3%</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-300">45+</span>
                      <span className="text-sm text-white">6.7%</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Interactions Section */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Interactions
                  <button className="p-0.5 hover:bg-gray-800 rounded-full">
                    <Info className="w-4 h-4 text-gray-500" />
                  </button>
                </h3>
                <p className="text-xs text-gray-500 mb-6">Activity on this {isReel ? 'reel' : 'post'}.</p>

                {/* Circular Interactions Display */}
                <div className="flex justify-center mb-6">
                  <div className="relative w-40 h-40">
                    <svg width="160" height="160" className="transform -rotate-90">
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#374151" strokeWidth="8" />
                      <circle 
                        cx="80" cy="80" r="70" fill="none" stroke="#EC4899" strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 70}`}
                        strokeDashoffset={`${2 * Math.PI * 70 * 0.08}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-gray-400">Total interactions</span>
                      <span className="text-2xl font-bold text-white">
                        {formatNumber(insights?.totalInteractions || (insights?.likes + insights?.comments + (insights?.saved || 0) + (insights?.shares || 0)))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Follower breakdown */}
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-pink-500" />
                      <span className="text-sm text-gray-300">Followers</span>
                    </div>
                    <span className="text-sm text-white">0.6%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-gray-600" />
                      <span className="text-sm text-gray-300">Non-followers</span>
                    </div>
                    <span className="text-sm text-white">100.0%</span>
                  </div>
                </div>
              </div>

              {/* When people engaged */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h4 className="text-sm text-white font-medium mb-4">When people liked your {isReel ? 'reel' : 'post'}</h4>
                <EngagementTimeline metric="likes" />
              </div>

              {/* Detailed Metrics */}
              <div className="px-4 py-4 border-t border-gray-800">
                <div className="space-y-0">
                  <MetricRow 
                    icon={<Heart className="w-4 h-4" />}
                    label="Likes"
                    value={formatNumber(insights?.likes)}
                  />
                  <MetricRow 
                    icon={<Repeat className="w-4 h-4" />}
                    label="Reposts"
                    value="0"
                  />
                  <MetricRow 
                    icon={<Send className="w-4 h-4" />}
                    label="Sends"
                    value={formatNumber(insights?.shares || 0)}
                  />
                  <MetricRow 
                    icon={<Share2 className="w-4 h-4" />}
                    label="Shares"
                    value={formatNumber(insights?.shares || 0)}
                  />
                  <MetricRow 
                    icon={<MessageCircle className="w-4 h-4" />}
                    label="Comments"
                    value={formatNumber(insights?.comments)}
                  />
                  <MetricRow 
                    icon={<Bookmark className="w-4 h-4" />}
                    label="Saved"
                    value={formatNumber(insights?.saved || 0)}
                  />
                </div>
              </div>

              {/* Engagement Trend Charts */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pink-500" />
                  Engagement Trends
                  <button className="p-0.5 hover:bg-gray-800 rounded-full">
                    <Info className="w-4 h-4 text-gray-500" />
                  </button>
                </h3>
                <p className="text-xs text-gray-500 mb-4">Growth over time since posting.</p>

                <div className="grid grid-cols-2 gap-3">
                  {/* Likes Trend */}
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-3 pt-3 pb-1">
                      <span className="text-xs font-medium text-gray-300">❤️ Likes</span>
                      <span className="text-xs font-bold text-pink-500">{formatNumber(insights?.likes)}</span>
                    </div>
                    <div className="flex-1" style={{ height: 130, overflow: 'hidden' }}>
                      <TrendChart
                        data={generatePostTrendData(insights?.likes || 0, 'likes')}
                        title=""
                        color="#EC4899"
                        metric="value"
                      />
                    </div>
                  </div>

                  {/* Comments Trend */}
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-3 pt-3 pb-1">
                      <span className="text-xs font-medium text-gray-300">💬 Comments</span>
                      <span className="text-xs font-bold text-purple-500">{formatNumber(insights?.comments)}</span>
                    </div>
                    <div className="flex-1" style={{ height: 130, overflow: 'hidden' }}>
                      <TrendChart
                        data={generatePostTrendData(insights?.comments || 0, 'comments')}
                        title=""
                        color="#8B5CF6"
                        metric="value"
                      />
                    </div>
                  </div>

                  {/* Saved Trend */}
                  {insights?.saved > 0 && (
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-3 pt-3 pb-1">
                        <span className="text-xs font-medium text-gray-300">🔖 Saved</span>
                        <span className="text-xs font-bold text-amber-500">{formatNumber(insights?.saved)}</span>
                      </div>
                      <div className="flex-1" style={{ height: 130, overflow: 'hidden' }}>
                        <TrendChart
                          data={generatePostTrendData(insights?.saved || 0, 'saved')}
                          title=""
                          color="#F59E0B"
                          metric="value"
                        />
                      </div>
                    </div>
                  )}

                  {/* Shares Trend */}
                  {insights?.shares > 0 && (
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-3 pt-3 pb-1">
                        <span className="text-xs font-medium text-gray-300">🔗 Shares</span>
                        <span className="text-xs font-bold text-teal-500">{formatNumber(insights?.shares)}</span>
                      </div>
                      <div className="flex-1" style={{ height: 130, overflow: 'hidden' }}>
                        <TrendChart
                          data={generatePostTrendData(insights?.shares || 0, 'shares')}
                          title=""
                          color="#14B8A6"
                          metric="value"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Ad Section */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-2">Ad</h3>
                <button
                  onClick={() => onBoostPost && onBoostPost(post)}
                  className="flex items-center gap-2 w-full py-3 text-left hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Rocket className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-white">Boost this {isReel ? 'Reel' : 'Post'}</span>
                  <ChevronRight className="w-4 h-4 text-gray-500 ml-auto" />
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="px-4 py-4">
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                    <p className="text-xs text-yellow-300">
                      Some insights may be unavailable: {error}
                    </p>
                  </div>
                </div>
              )}

              {/* API Note */}
              <div className="px-4 py-4 border-t border-gray-800">
                <p className="text-xs text-gray-600 text-center">
                  Note: Some metrics like audience demographics and retention are simulated. 
                  Instagram API provides limited per-post insights.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InstagramPostInsights;
