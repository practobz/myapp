import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Eye, Heart, Share, MessageCircle, Calendar, Filter } from 'lucide-react';

function Analytics() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [selectedPlatform, setSelectedPlatform] = useState('all');

  // Mock analytics data
  const overallStats = {
    totalPosts: 45,
    totalViews: 125420,
    totalEngagement: 8934,
    avgEngagementRate: 7.1
  };

  const platformStats = [
    { platform: 'Instagram', posts: 18, views: 65420, engagement: 4521, rate: 6.9 },
    { platform: 'Facebook', posts: 15, views: 38200, engagement: 2890, rate: 7.6 },
    { platform: 'LinkedIn', posts: 8, views: 15600, engagement: 1234, rate: 7.9 },
    { platform: 'YouTube', posts: 4, views: 6200, engagement: 289, rate: 4.7 }
  ];

  const recentPosts = [
    {
      id: 1,
      title: 'Summer Collection Launch',
      platform: 'Instagram',
      date: '2024-03-15',
      views: 8420,
      likes: 342,
      shares: 89,
      comments: 67,
      engagementRate: 5.9
    },
    {
      id: 2,
      title: 'Customer Testimonial Video',
      platform: 'Facebook',
      date: '2024-03-14',
      views: 5630,
      likes: 298,
      shares: 156,
      comments: 43,
      engagementRate: 8.8
    },
    {
      id: 3,
      title: 'Industry Insights Article',
      platform: 'LinkedIn',
      date: '2024-03-13',
      views: 3240,
      likes: 187,
      shares: 92,
      comments: 28,
      engagementRate: 9.5
    },
    {
      id: 4,
      title: 'Behind the Scenes',
      platform: 'YouTube',
      date: '2024-03-12',
      views: 2180,
      likes: 134,
      shares: 45,
      comments: 23,
      engagementRate: 9.3
    }
  ];

  const getPlatformColor = (platform) => {
    switch (platform.toLowerCase()) {
      case 'instagram':
        return 'bg-pink-100 text-pink-800';
      case 'facebook':
        return 'bg-blue-100 text-blue-800';
      case 'linkedin':
        return 'bg-indigo-100 text-indigo-800';
      case 'youtube':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/customer')}
              className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <img src="/aureum-logo.png" alt="Aureum Solutions" className="h-8 w-8" />
              <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Analytics Dashboard</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Content Analytics</h1>
                <p className="text-gray-600 mt-1">Track your social media performance</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1f2e]"
                  >
                    <option value="7days">Last 7 days</option>
                    <option value="30days">Last 30 days</option>
                    <option value="90days">Last 90 days</option>
                    <option value="1year">Last year</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <Filter className="h-5 w-5 text-gray-400 mr-2" />
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a1f2e]"
                  >
                    <option value="all">All Platforms</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Posts</p>
                  <h3 className="text-2xl font-bold text-gray-900">{overallStats.totalPosts}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <Eye className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Views</p>
                  <h3 className="text-2xl font-bold text-gray-900">{formatNumber(overallStats.totalViews)}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Heart className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Engagement</p>
                  <h3 className="text-2xl font-bold text-gray-900">{formatNumber(overallStats.totalEngagement)}</h3>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg. Engagement Rate</p>
                  <h3 className="text-2xl font-bold text-gray-900">{overallStats.avgEngagementRate}%</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Performance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Platform Performance</h3>
            <div className="space-y-4">
              {platformStats.map((platform) => (
                <div key={platform.platform} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPlatformColor(platform.platform)}`}>
                        {platform.platform}
                      </span>
                      <span className="text-sm text-gray-500">{platform.posts} posts</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-semibold text-gray-900">{platform.rate}%</span>
                      <p className="text-sm text-gray-500">engagement rate</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Eye className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="font-medium">{formatNumber(platform.views)}</span>
                      </div>
                      <p className="text-gray-500">Views</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <Heart className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="font-medium">{formatNumber(platform.engagement)}</span>
                      </div>
                      <p className="text-gray-500">Engagement</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center mb-1">
                        <TrendingUp className="h-4 w-4 text-gray-400 mr-1" />
                        <span className="font-medium">{platform.rate}%</span>
                      </div>
                      <p className="text-gray-500">Rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Posts Performance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Posts Performance</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Post</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Platform</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Views</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Likes</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Shares</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Comments</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-500">Engagement Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPosts.map((post) => (
                    <tr key={post.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{post.title}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlatformColor(post.platform)}`}>
                          {post.platform}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{post.date}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <Eye className="h-4 w-4 text-gray-400 mr-1" />
                          {formatNumber(post.views)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <Heart className="h-4 w-4 text-gray-400 mr-1" />
                          {post.likes}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <Share className="h-4 w-4 text-gray-400 mr-1" />
                          {post.shares}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center">
                          <MessageCircle className="h-4 w-4 text-gray-400 mr-1" />
                          {post.comments}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          post.engagementRate >= 8 ? 'bg-green-100 text-green-800' :
                          post.engagementRate >= 6 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {post.engagementRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Analytics;