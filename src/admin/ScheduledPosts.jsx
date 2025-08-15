import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Facebook, Instagram, Image, Send, Eye, Edit, Trash2, CheckCircle, XCircle, Loader2, Plus, Filter, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function ScheduledPosts() {
  const navigate = useNavigate();

  // Scheduled posts state
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'published', 'failed'

  // Fetch scheduled posts on component mount
  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const fetchScheduledPosts = async () => {
    setLoading(true);
    try {
      console.log('📡 Fetching scheduled posts from:', `${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Received data:', data);
      
      // Handle both array and object responses
      let posts = [];
      if (Array.isArray(data)) {
        posts = data;
      } else if (data && Array.isArray(data.posts)) {
        posts = data.posts;
      } else if (data && data.success && Array.isArray(data.data)) {
        posts = data.data;
      }
      
      console.log('📋 Processed posts:', posts.length);
      setScheduledPosts(posts);
      
    } catch (error) {
      console.error('❌ Failed to fetch scheduled posts:', error);
      // Set empty array on error
      setScheduledPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts/${postId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setScheduledPosts(prev => prev.filter(post => post._id !== postId));
      }
    } catch (error) {
      console.error('Delete post error:', error);
      alert('Failed to delete post');
    }
  };

  // Add manual trigger function for testing
  const handleManualTrigger = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts/trigger`, {
        method: 'POST'
      });
      
      if (response.ok) {
        alert('Scheduler triggered manually! Check console for results.');
        fetchScheduledPosts(); // Refresh the list
      } else {
        alert('Failed to trigger scheduler');
      }
    } catch (error) {
      console.error('Manual trigger error:', error);
      alert('Failed to trigger scheduler');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'published': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredPosts = Array.isArray(scheduledPosts) ? scheduledPosts.filter(post => {
    if (filter === 'all') return true;
    return post.status === filter;
  }) : [];

  // Helper to detect video URLs
  const isVideoUrl = (url) => {
    if (!url) return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="h-5 w-5 text-blue-600" />;
      case 'instagram':
        return <Instagram className="h-5 w-5 text-pink-600" />;
      case 'both':
        return (
          <>
            <Facebook className="h-4 w-4 text-blue-600" />
            <Instagram className="h-4 w-4 text-pink-600" />
          </>
        );
      case 'youtube':
        return <div className="h-5 w-5 bg-red-600 text-white rounded text-xs flex items-center justify-center font-bold">YT</div>;
      case 'twitter':
        return <div className="h-5 w-5 bg-blue-400 text-white rounded text-xs flex items-center justify-center font-bold">X</div>;
      default:
        return <div className="h-5 w-5 bg-gray-400 text-white rounded text-xs flex items-center justify-center">?</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Scheduled Posts</h1>
                <p className="text-gray-600 mt-1">View and manage your scheduled social media posts</p>
              </div>
            </div>
            
            {/* Manual trigger button for testing */}
            <button
              onClick={handleManualTrigger}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Test Scheduler</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          {['all', 'pending', 'processing', 'published', 'failed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === status 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Scheduled Posts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map(post => (
              <div key={post._id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {getPlatformIcon(post.platform)}
                    <span className="text-sm font-medium text-gray-600">
                      {post.pageName || post.channelName || 'Social Media Post'}
                    </span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(post.status)}`}>
                    {getStatusIcon(post.status)}
                    <span>{post.status}</span>
                  </span>
                </div>

                {/* Show video or image */}
                {post.imageUrl && isVideoUrl(post.imageUrl) ? (
                  <video
                    src={post.imageUrl}
                    controls
                    className="w-full h-40 object-cover rounded-lg mb-4"
                    style={{ background: '#eee' }}
                  />
                ) : post.imageUrl ? (
                  <img
                    src={post.imageUrl}
                    alt="Post content"
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                ) : null}

                {post.imageUrl && isVideoUrl(post.imageUrl) && post.platform === 'instagram' && (
                  <div className="text-xs text-blue-600 mb-2">
                    This video will be posted as an Instagram Reel.
                  </div>
                )}

                {post.imageUrl && isVideoUrl(post.imageUrl) && post.platform === 'youtube' && (
                  <div className="text-xs text-red-600 mb-2">
                    YouTube video upload scheduled.
                  </div>
                )}

                <p className="text-gray-800 text-sm mb-4 line-clamp-3">
                  {post.caption}
                </p>

                <div className="space-y-2 text-xs text-gray-500 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(post.scheduledAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(post.scheduledAt).toLocaleTimeString()}</span>
                  </div>
                  {post.publishedAt && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      <span>Published: {new Date(post.publishedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {post.status === 'failed' && post.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 mb-4">
                    <p className="text-xs text-red-600 font-medium">Error Details:</p>
                    <p className="text-xs text-red-600">{post.error}</p>
                    {post.error.includes('access token') && (
                      <p className="text-xs text-blue-600 mt-1">
                        💡 Customer needs to reconnect their social media account
                      </p>
                    )}
                  </div>
                )}

                {/* Show partial success for posts with multiple platforms */}
                {post.status === 'published' && post.error && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4">
                    <p className="text-xs text-yellow-700 font-medium">Partial Success:</p>
                    <div className="flex items-center space-x-2 text-xs text-yellow-600 mt-1">
                      {post.facebookPostId ? (
                        <span className="flex items-center space-x-1 text-green-600">
                          <Facebook className="h-3 w-3" />
                          <span>✅ FB: {post.facebookPostId}</span>
                        </span>
                      ) : post.platform === 'facebook' || post.platform === 'both' ? (
                        <span className="flex items-center space-x-1 text-red-600">
                          <Facebook className="h-3 w-3" />
                          <span>❌ FB Failed</span>
                        </span>
                      ) : null}
                      
                      {post.instagramPostId ? (
                        <span className="flex items-center space-x-1 text-green-600">
                          <Instagram className="h-3 w-3" />
                          <span>✅ IG: {post.instagramPostId}</span>
                        </span>
                      ) : post.platform === 'instagram' || post.platform === 'both' ? (
                        <span className="flex items-center space-x-1 text-red-600">
                          <Instagram className="h-3 w-3" />
                          <span>❌ IG Failed</span>
                        </span>
                      ) : null}

                      {post.youtubePostId ? (
                        <span className="flex items-center space-x-1 text-green-600">
                          <div className="h-3 w-3 bg-red-600 text-white rounded text-xs flex items-center justify-center">Y</div>
                          <span>✅ YT: {post.youtubePostId}</span>
                        </span>
                      ) : post.platform === 'youtube' ? (
                        <span className="flex items-center space-x-1 text-red-600">
                          <div className="h-3 w-3 bg-red-600 text-white rounded text-xs flex items-center justify-center">Y</div>
                          <span>❌ YT Failed</span>
                        </span>
                      ) : null}

                      {post.twitterPostId ? (
                        <span className="flex items-center space-x-1 text-green-600">
                          <div className="h-3 w-3 bg-blue-400 text-white rounded text-xs flex items-center justify-center">X</div>
                          <span>✅ X: {post.twitterPostId}</span>
                        </span>
                      ) : post.platform === 'twitter' ? (
                        <span className="flex items-center space-x-1 text-red-600">
                          <div className="h-3 w-3 bg-blue-400 text-white rounded text-xs flex items-center justify-center">X</div>
                          <span>❌ X Failed</span>
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-yellow-600 mt-1 font-mono bg-yellow-100 p-1 rounded">
                      {post.error}
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeletePost(post._id)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredPosts.length === 0 && !loading && (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No scheduled posts found</p>
            <p className="text-sm text-gray-400 mt-2">
              Posts will appear here when they are scheduled through the system
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScheduledPosts;
