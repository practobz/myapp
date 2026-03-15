import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ExternalLink, Heart, MessageCircle, Share2, Eye,
  Image, Film, Layers, Clock, TrendingUp, BarChart3, ChevronDown,
  ChevronUp, Search, SortAsc, SortDesc
} from 'lucide-react';
import {
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const PLATFORM_COLORS = {
  instagram: { primary: '#E1306C', gradient: 'from-pink-500 to-purple-600', bg: 'bg-pink-50', text: 'text-pink-700' },
  facebook: { primary: '#1877F2', gradient: 'from-blue-500 to-blue-700', bg: 'bg-blue-50', text: 'text-blue-700' },
  youtube: { primary: '#FF0000', gradient: 'from-red-500 to-red-700', bg: 'bg-red-50', text: 'text-red-700' },
  linkedin: { primary: '#0A66C2', gradient: 'from-blue-600 to-blue-800', bg: 'bg-blue-50', text: 'text-blue-700' }
};

const MEDIA_TYPE_ICONS = {
  IMAGE: Image,
  VIDEO: Film,
  CAROUSEL_ALBUM: Layers,
  REEL: Film
};

/**
 * PostDetailsPage can be used two ways:
 * 1. As a route page — reads platform/accountId/date/metric from URL search params.
 * 2. As a modal — pass those values as props plus an `onBack` callback to close.
 */
function PostDetailsPage({ platform: propPlatform, accountId: propAccountId, date: propDate, metric: propMetric, onBack } = {}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Props take priority (modal mode); fall back to URL params (route mode)
  const platform = propPlatform || searchParams.get('platform') || '';
  const accountId = propAccountId || searchParams.get('accountId') || '';
  const date = propDate || searchParams.get('date') || '';
  const metric = propMetric || searchParams.get('metric') || '';

  const handleBack = onBack || (() => navigate(-1));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'chart'
  const [sortField, setSortField] = useState('likes');
  const [sortDir, setSortDir] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (platform && accountId && date) {
      fetchPostDetails();
    }
  }, [platform, accountId, date]);

  // Set default sort based on the metric being viewed
  useEffect(() => {
    if (metric) {
      const metricSortMap = {
        likes: 'likes',
        comments: 'comments',
        shares: 'shares',
        engagement: 'likes',
        followers: 'likes',
        views: 'views'
      };
      setSortField(metricSortMap[metric] || 'likes');
    }
  }, [metric]);

  const fetchPostDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/analytics-data/post-details?platform=${encodeURIComponent(platform)}&accountId=${encodeURIComponent(accountId)}&date=${encodeURIComponent(date)}`
      );
      const result = await response.json();
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch post details');
      }
    } catch (err) {
      console.error('Error fetching post details:', err);
      setError('Failed to fetch post details');
    } finally {
      setLoading(false);
    }
  };

  const formattedDate = date
    ? new Date(date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const platformStyle = PLATFORM_COLORS[platform] || PLATFORM_COLORS.instagram;

  const filteredAndSortedPosts = useMemo(() => {
    if (!data?.posts) return [];
    let posts = [...data.posts];

    // Filter by search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      posts = posts.filter(p => {
        const text = (p.caption || p.text || p.message || p.title || '').toLowerCase();
        return text.includes(term);
      });
    }

    // Sort
    posts.sort((a, b) => {
      let aVal = 0, bVal = 0;
      switch (sortField) {
        case 'likes': aVal = a.likes || a.like_count || 0; bVal = b.likes || b.like_count || 0; break;
        case 'comments': aVal = a.comments || a.comments_count || 0; bVal = b.comments || b.comments_count || 0; break;
        case 'shares': aVal = a.shares || 0; bVal = b.shares || 0; break;
        case 'views': aVal = a.views || a.viewCount || 0; bVal = b.views || b.viewCount || 0; break;
        case 'date':
          aVal = new Date(a.timestamp || a.created_time || a.createdAt || a.publishedAt || 0).getTime();
          bVal = new Date(b.timestamp || b.created_time || b.createdAt || b.publishedAt || 0).getTime();
          break;
        default: aVal = a.likes || 0; bVal = b.likes || 0;
      }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return posts;
  }, [data, searchTerm, sortField, sortDir]);

  // Chart data for bar chart view
  const chartData = useMemo(() => {
    return filteredAndSortedPosts.map((post, index) => {
      const caption = post.caption || post.text || post.message || post.title || '';
      return {
        name: `#${index + 1}`,
        fullCaption: caption.substring(0, 80) + (caption.length > 80 ? '...' : ''),
        likes: post.likes || post.like_count || 0,
        comments: post.comments || post.comments_count || 0,
        shares: post.shares || 0,
        views: post.views || post.viewCount || 0
      };
    });
  }, [filteredAndSortedPosts]);

  const totalStats = useMemo(() => {
    if (!data?.posts) return { likes: 0, comments: 0, shares: 0 };
    return data.posts.reduce((acc, p) => ({
      likes: acc.likes + (p.likes || p.like_count || 0),
      comments: acc.comments + (p.comments || p.comments_count || 0),
      shares: acc.shares + (p.shares || 0)
    }), { likes: 0, comments: 0, shares: 0 });
  }, [data]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'desc'
      ? <SortDesc className="w-3 h-3 text-blue-600" />
      : <SortAsc className="w-3 h-3 text-blue-600" />;
  };

  const getPostText = (post) => post.caption || post.text || post.message || post.title || 'No caption';
  const getPostDate = (post) => post.timestamp || post.created_time || post.createdAt || post.publishedAt;
  const getPostLink = (post) => post.permalink || null;

  const CustomBarTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 max-w-[250px]">
        <p className="text-xs text-gray-500 mb-1 line-clamp-2">{d?.fullCaption}</p>
        <div className="space-y-1">
          {d?.likes > 0 && <div className="flex items-center gap-1.5 text-xs"><Heart className="w-3 h-3 text-red-500" /><span className="font-medium">{d.likes.toLocaleString()}</span> likes</div>}
          {d?.comments > 0 && <div className="flex items-center gap-1.5 text-xs"><MessageCircle className="w-3 h-3 text-purple-500" /><span className="font-medium">{d.comments.toLocaleString()}</span> comments</div>}
          {d?.shares > 0 && <div className="flex items-center gap-1.5 text-xs"><Share2 className="w-3 h-3 text-amber-500" /><span className="font-medium">{d.shares.toLocaleString()}</span> shares</div>}
        </div>
      </div>
    );
  };

  // Determine which metric to highlight in the bar chart
  const barMetric = metric === 'comments' ? 'comments' : metric === 'shares' ? 'shares' : metric === 'views' ? 'views' : 'likes';
  const barColor = metric === 'comments' ? '#8B5CF6' : metric === 'shares' ? '#F59E0B' : metric === 'views' ? '#06B6D4' : '#10B981';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64" />
            <div className="h-4 bg-gray-200 rounded w-96" />
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
            </div>
            <div className="h-96 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <button onClick={handleBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Analytics
          </button>
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={fetchPostDetails} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <button onClick={handleBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 text-sm font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Analytics
          </button>

          <div className={`bg-gradient-to-r ${platformStyle.gradient} rounded-2xl p-6 text-white relative overflow-hidden`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
            <div className="relative">
              <h1 className="text-xl sm:text-2xl font-bold mb-1">
                Post Details — {formattedDate}
              </h1>
              <p className="text-white/80 text-sm">
                {data?.accountName || accountId} • {platform.charAt(0).toUpperCase() + platform.slice(1)} • {data?.postCount || 0} posts considered
                {metric && <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">{metric.charAt(0).toUpperCase() + metric.slice(1)}</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-green-100 rounded-lg"><Heart className="w-4 h-4 text-green-600" /></div>
              <span className="text-xs text-gray-500">Total Likes</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{totalStats.likes.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-purple-100 rounded-lg"><MessageCircle className="w-4 h-4 text-purple-600" /></div>
              <span className="text-xs text-gray-500">Total Comments</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{totalStats.comments.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-amber-100 rounded-lg"><Share2 className="w-4 h-4 text-amber-600" /></div>
              <span className="text-xs text-gray-500">Total Shares</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{totalStats.shares.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-blue-100 rounded-lg"><Layers className="w-4 h-4 text-blue-600" /></div>
              <span className="text-xs text-gray-500">Posts Counted</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{data?.postCount || 0}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* View Toggle */}
            <div className="inline-flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <BarChart3 className="w-4 h-4" /> Table
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'chart' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-4 h-4" /> Chart
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search posts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <span className="text-xs text-gray-500">
              Showing {filteredAndSortedPosts.length} of {data?.postCount || 0} posts
            </span>
          </div>
        </div>

        {/* Chart View */}
        {viewMode === 'chart' && chartData.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              {barMetric.charAt(0).toUpperCase() + barMetric.slice(1)} per Post
            </h3>
            <div className="h-72 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    interval={chartData.length > 30 ? Math.floor(chartData.length / 15) : 0}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#9CA3AF' }}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v}
                    width={45}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey={barMetric} radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {chartData.map((_, index) => (
                      <Cell key={index} fill={barColor} fillOpacity={0.8 + (0.2 * (index % 2))} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table View */}
        {viewMode === 'table' && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-12">#</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 min-w-[200px]">Post</th>
                    {platform !== 'youtube' && (
                      <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 w-20">Type</th>
                    )}
                    <th className="text-xs font-medium text-gray-500 px-4 py-3 w-24 cursor-pointer select-none" onClick={() => handleSort('date')}>
                      <div className="flex items-center gap-1 justify-end">Date <SortIcon field="date" /></div>
                    </th>
                    <th className="text-xs font-medium text-gray-500 px-4 py-3 w-20 cursor-pointer select-none" onClick={() => handleSort('likes')}>
                      <div className="flex items-center gap-1 justify-end"><Heart className="w-3 h-3" /> Likes <SortIcon field="likes" /></div>
                    </th>
                    <th className="text-xs font-medium text-gray-500 px-4 py-3 w-24 cursor-pointer select-none" onClick={() => handleSort('comments')}>
                      <div className="flex items-center gap-1 justify-end"><MessageCircle className="w-3 h-3" /> Comments <SortIcon field="comments" /></div>
                    </th>
                    {(platform === 'facebook' || platform === 'linkedin') && (
                      <th className="text-xs font-medium text-gray-500 px-4 py-3 w-20 cursor-pointer select-none" onClick={() => handleSort('shares')}>
                        <div className="flex items-center gap-1 justify-end"><Share2 className="w-3 h-3" /> Shares <SortIcon field="shares" /></div>
                      </th>
                    )}
                    {platform === 'youtube' && (
                      <th className="text-xs font-medium text-gray-500 px-4 py-3 w-20 cursor-pointer select-none" onClick={() => handleSort('views')}>
                        <div className="flex items-center gap-1 justify-end"><Eye className="w-3 h-3" /> Views <SortIcon field="views" /></div>
                      </th>
                    )}
                    <th className="text-xs font-medium text-gray-500 px-4 py-3 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAndSortedPosts.map((post, index) => {
                    const postText = getPostText(post);
                    const postDate = getPostDate(post);
                    const link = getPostLink(post);
                    const MediaIcon = MEDIA_TYPE_ICONS[post.media_type] || Image;
                    const likes = post.likes || post.like_count || 0;
                    const comments = post.comments || post.comments_count || 0;

                    return (
                      <tr key={post.id || index} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-xs text-gray-400 font-medium">{index + 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-900 line-clamp-2 max-w-md">{postText}</p>
                        </td>
                        {platform !== 'youtube' && (
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium ${platformStyle.bg} ${platformStyle.text}`}>
                              <MediaIcon className="w-3 h-3" />
                              {post.media_type || 'Post'}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs text-gray-500">
                            {postDate ? new Date(postDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">{likes.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">{comments.toLocaleString()}</span>
                        </td>
                        {(platform === 'facebook' || platform === 'linkedin') && (
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-semibold text-gray-900">{(post.shares || 0).toLocaleString()}</span>
                          </td>
                        )}
                        {platform === 'youtube' && (
                          <td className="px-4 py-3 text-right">
                            <span className="text-sm font-semibold text-gray-900">{(post.views || post.viewCount || 0).toLocaleString()}</span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-blue-600 transition-colors inline-flex"
                              title="View post"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredAndSortedPosts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-sm">No posts found{searchTerm ? ' matching your search' : ''}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PostDetailsPage;
