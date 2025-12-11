import React from 'react';
import { BarChart3, TrendingUp, Eye, ThumbsUp, MessageCircle, Share2, Calendar, ExternalLink } from 'lucide-react';

const YouTubePostAnalytics = ({ selectedPost, onClose }) => {
  if (!selectedPost) return null;

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-red-600" />
          YouTube Video Analytics
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      <div className="space-y-6">
        {/* Video Preview */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            {selectedPost.snippet?.thumbnails?.medium?.url && (
              <div className="relative">
                <img
                  src={selectedPost.snippet.thumbnails.medium.url}
                  alt="Video thumbnail"
                  className="w-32 h-24 object-cover rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="bg-red-600 text-white rounded-full p-2">
                    <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                </div>
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded font-medium">
                  YouTube Video
                </span>
                <span className="text-xs text-gray-500">
                  {formatDate(selectedPost.snippet?.publishedAt)}
                </span>
              </div>
              <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                {selectedPost.snippet?.title}
              </h4>
              {selectedPost.snippet?.description && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-3">
                  {selectedPost.snippet.description.length > 150 
                    ? `${selectedPost.snippet.description.substring(0, 150)}...` 
                    : selectedPost.snippet.description
                  }
                </p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Duration: {selectedPost.contentDetails?.duration || 'N/A'}</span>
                <a 
                  href={`https://www.youtube.com/watch?v=${selectedPost.id}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-red-600 hover:text-red-700 flex items-center space-x-1"
                >
                  <span>Watch on YouTube</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(selectedPost.statistics?.viewCount)}
            </div>
            <div className="text-sm text-blue-700 font-medium flex items-center justify-center mt-1">
              <Eye className="h-3 w-3 mr-1" />
              Views
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {formatNumber(selectedPost.statistics?.likeCount)}
            </div>
            <div className="text-sm text-green-700 font-medium flex items-center justify-center mt-1">
              <ThumbsUp className="h-3 w-3 mr-1" />
              Likes
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatNumber(selectedPost.statistics?.commentCount)}
            </div>
            <div className="text-sm text-purple-700 font-medium flex items-center justify-center mt-1">
              <MessageCircle className="h-3 w-3 mr-1" />
              Comments
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(selectedPost.statistics?.favoriteCount || 0)}
            </div>
            <div className="text-sm text-orange-700 font-medium flex items-center justify-center mt-1">
              <Share2 className="h-3 w-3 mr-1" />
              Favorites
            </div>
          </div>
        </div>

        {/* Total Engagement */}
        <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-xl p-6 text-center">
          <div className="text-3xl font-bold text-red-600 mb-2">
            {formatNumber(
              parseInt(selectedPost.statistics?.likeCount || 0) + 
              parseInt(selectedPost.statistics?.commentCount || 0) + 
              parseInt(selectedPost.statistics?.favoriteCount || 0)
            )}
          </div>
          <div className="text-lg text-red-700 font-medium flex items-center justify-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Total Engagement
          </div>
          <div className="text-sm text-red-600 mt-2">
            Likes + Comments + Favorites
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Performance Breakdown
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Engagement Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedPost.statistics?.viewCount ? 
                    (((parseInt(selectedPost.statistics?.likeCount || 0) + parseInt(selectedPost.statistics?.commentCount || 0)) / parseInt(selectedPost.statistics?.viewCount) * 100)).toFixed(2) + '%'
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Like Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedPost.statistics?.viewCount ? 
                    ((parseInt(selectedPost.statistics?.likeCount || 0) / parseInt(selectedPost.statistics?.viewCount) * 100)).toFixed(2) + '%'
                    : 'N/A'
                  }
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Comment Rate</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedPost.statistics?.viewCount ? 
                    ((parseInt(selectedPost.statistics?.commentCount || 0) / parseInt(selectedPost.statistics?.viewCount) * 100)).toFixed(2) + '%'
                    : 'N/A'
                  }
                </span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Video Category</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedPost.snippet?.categoryId || 'General'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Privacy Status</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedPost.status?.privacyStatus || 'Public'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Upload Status</span>
                <span className="text-sm font-medium text-gray-900">
                  {selectedPost.status?.uploadStatus || 'Processed'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Visual Breakdown */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Engagement Distribution
          </h4>
          <div className="space-y-3">
            {['Views', 'Likes', 'Comments'].map((metric, index) => {
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500'];
              const values = [
                selectedPost.statistics?.viewCount || 0,
                selectedPost.statistics?.likeCount || 0,
                selectedPost.statistics?.commentCount || 0
              ];
              const maxValue = Math.max(...values);
              const percentage = maxValue > 0 ? (values[index] / maxValue) * 100 : 0;
              
              return (
                <div key={metric} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center min-w-[80px]">
                    <span className={`w-3 h-3 ${colors[index]} rounded-full mr-2`}></span>
                    {metric}
                  </span>
                  <div className="flex items-center space-x-2 flex-1 mx-4">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${colors[index]} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 min-w-[60px] text-right">
                    {formatNumber(values[index])}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Video Tags */}
        {selectedPost.snippet?.tags && selectedPost.snippet.tags.length > 0 && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
            <h4 className="font-medium text-gray-900 mb-3">Video Tags</h4>
            <div className="flex flex-wrap gap-2">
              {selectedPost.snippet.tags.slice(0, 10).map((tag, index) => (
                <span 
                  key={index}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {selectedPost.snippet.tags.length > 10 && (
                <span className="text-xs text-gray-500 px-2 py-1">
                  +{selectedPost.snippet.tags.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubePostAnalytics;