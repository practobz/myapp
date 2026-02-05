import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Calendar, Clock, Facebook, Instagram, Send, Trash2, CheckCircle, XCircle, Loader2, Filter, User, ChevronDown, ChevronRight, Users, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AdminLayout from './components/layout/AdminLayout';

// Memoized PostCard Component
const PostCard = memo(({ post, onDelete, getStatusColor, getStatusIcon, getPostType, getPlatformIcon, isVideoUrl }) => {
  return (
    <div className="bg-white rounded-lg border p-2 sm:p-3 shadow-sm hover:shadow-md transition-shadow">
      {post.calendar_name && (
        <div className="text-[10px] text-blue-700 mb-0.5 truncate">
          <strong>Calendar:</strong> {post.calendar_name}
        </div>
      )}
      {post.item_name && (
        <div className="text-[10px] text-purple-700 mb-1 truncate">
          <strong>Item:</strong> {post.item_name}
        </div>
      )}

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1 min-w-0 flex-1">
          {getPlatformIcon(post.platform)}
          <span className="text-[10px] sm:text-xs font-medium text-gray-600 truncate">
            {post.pageName || post.channelName || 'Post'}
          </span>
        </div>
        <div className="flex items-center space-x-1 flex-shrink-0">
          {(() => {
            const postType = getPostType(post);
            return (
              <span className={`px-1.5 py-0.5 ${postType.color} text-[9px] sm:text-[10px] font-semibold rounded-full flex items-center space-x-0.5`}>
                <span>{postType.icon}</span>
                <span className="hidden sm:inline">{postType.type}</span>
                {postType.type === 'Carousel' && post.imageUrls?.length > 1 && (
                  <span>({post.imageUrls.length})</span>
                )}
              </span>
            );
          })()}
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-medium flex items-center space-x-0.5 ${getStatusColor(post.status)}`}>
            {getStatusIcon(post.status)}
            <span className="hidden sm:inline">{post.status}</span>
          </span>
        </div>
      </div>

      {/* Media Preview */}
      {post.imageUrls && post.imageUrls.length > 1 ? (
        <div className="mb-2">
          <div className="grid grid-cols-3 gap-0.5">
            {post.imageUrls.slice(0, 3).map((url, idx) => (
              isVideoUrl(url) ? (
                <div key={idx} className="relative h-12 sm:h-16 bg-gray-800 rounded flex items-center justify-center">
                  <Video className="h-4 w-4 text-white" />
                  <span className="absolute top-0.5 left-0.5 bg-purple-600 text-white text-[8px] px-0.5 rounded">{idx + 1}</span>
                </div>
              ) : (
                <div key={idx} className="relative">
                  <img src={url} alt={`${idx + 1}`} className="w-full h-12 sm:h-16 object-cover rounded" />
                  <span className="absolute top-0.5 left-0.5 bg-purple-600 text-white text-[8px] px-0.5 rounded">{idx + 1}</span>
                </div>
              )
            ))}
          </div>
        </div>
      ) : post.imageUrl && isVideoUrl(post.imageUrl) ? (
        <video src={post.imageUrl} controls className="w-full h-20 sm:h-24 object-cover rounded mb-2" />
      ) : post.imageUrl ? (
        <img src={post.imageUrl} alt="Post" className="w-full h-20 sm:h-24 object-cover rounded mb-2" />
      ) : null}

      <p className="text-gray-800 text-[10px] sm:text-xs mb-1.5 line-clamp-2">{post.caption}</p>
      
      <div className="space-y-0.5 text-[9px] sm:text-[10px] text-gray-500 mb-1.5">
        <div className="flex items-center space-x-1">
          <Calendar className="h-2.5 w-2.5" />
          <span>{new Date(post.scheduledAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="h-2.5 w-2.5" />
          <span>{new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {post.status === 'failed' && post.error && (
        <div className="bg-red-50 border border-red-200 rounded p-1 mb-1.5">
          <p className="text-[9px] text-red-600 line-clamp-2">{post.error}</p>
        </div>
      )}

      <div className="flex items-center justify-end">
        <button onClick={() => onDelete(post._id)} className="text-red-600 hover:text-red-800 p-0.5" title="Delete">
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
});

PostCard.displayName = 'PostCard';

function ScheduledPosts() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Scheduled posts state
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'published', 'failed'
  const [customers, setCustomers] = useState({}); // Store customer details by ID
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped', 'platform', or 'list'
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [expandedPlatforms, setExpandedPlatforms] = useState(new Set());

  // Fetch scheduled posts on component mount
  useEffect(() => {
    fetchScheduledPosts(true); // Show loading on initial load
    fetchCustomers();
    // Silent auto-refresh every 10 seconds
    const intervalId = setInterval(() => {
      fetchScheduledPosts(false); // Don't show loading spinner for auto-refresh
    }, 10000);
    return () => clearInterval(intervalId);
  }, [currentUser]);

  const fetchCustomers = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;

    try {
      // Use the same endpoint as CustomersList.jsx for consistency
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`);
      
      if (response.ok) {
        const customerData = await response.json();
        const customerMap = {};
        customerData.forEach(customer => {
          customerMap[customer._id] = customer;
        });
        setCustomers(customerMap);
        console.log('📋 Customer lookup map:', customerMap);
      } else {
        console.log('No assigned customers found for admin:', currentUser._id || currentUser.id);
      }
    } catch (error) {
      console.error('Failed to fetch customer details:', error);
    }
  };

  const fetchScheduledPosts = async (showLoading = true) => {
    if (!currentUser || currentUser.role !== 'admin') {
      console.error('Admin authentication required');
      setScheduledPosts([]);
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    try {
      console.log('📡 Fetching scheduled posts for admin:', currentUser._id || currentUser.id);
      
      // First, get the admin's assigned customers
      const customersResponse = await fetch(`${process.env.REACT_APP_API_URL}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`);
      
      let assignedCustomerIds = [];
      if (customersResponse.ok) {
        const assignedCustomers = await customersResponse.json();
        assignedCustomerIds = assignedCustomers.map(customer => customer._id);
        console.log('📋 Admin assigned customer IDs:', assignedCustomerIds);
      } else {
        console.log('⚠️ No customers assigned to this admin');
        setScheduledPosts([]);
        return;
      }

      // If no customers are assigned, return empty
      if (assignedCustomerIds.length === 0) {
        console.log('⚠️ Admin has no assigned customers');
        setScheduledPosts([]);
        return;
      }
      
      // Fetch all scheduled posts
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
      
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📋 Received all posts data:', data);
      
      // Handle both array and object responses
      let allPosts = [];
      if (Array.isArray(data)) {
        allPosts = data;
      } else if (data && Array.isArray(data.posts)) {
        allPosts = data.posts;
      } else if (data && data.success && Array.isArray(data.data)) {
        allPosts = data.data;
      }
      
      // Filter posts to only include those from assigned customers
      const filteredPosts = allPosts.filter(post => {
        const postCustomerId = post.customerId || post.userId;
        const isAssigned = assignedCustomerIds.includes(postCustomerId);
        if (!isAssigned) {
          console.log('🚫 Filtering out post from unassigned customer:', postCustomerId);
        }
        return isAssigned;
      });
      
      console.log('📋 Total posts:', allPosts.length);
      console.log('📋 Posts from assigned customers:', filteredPosts.length);
      setScheduledPosts(filteredPosts);
      
    } catch (error) {
      console.error('❌ Failed to fetch scheduled posts:', error);
      setScheduledPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = useCallback(async (postId) => {
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
  }, []);

  // Handle post updates from SocialActionManager
  const handlePostUpdate = useCallback((postId, updates) => {
    setScheduledPosts(prev => prev.map(post => 
      post._id === postId ? { ...post, ...updates } : post
    ));
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'published': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin" />;
      default: return <Clock className="h-4 w-4" />;
    }
  }, []);

  const isVideoUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
  }, []);

  const getPostType = useCallback((post) => {
    if (post.isStory || post.postType === 'story') {
      return { type: 'Story', color: 'bg-orange-100 text-orange-700', icon: '📖' };
    }
    if ((post.isCarousel || post.useCarouselService) && post.imageUrls?.length > 1) {
      return { type: 'Carousel', color: 'bg-purple-100 text-purple-700', icon: '🎠' };
    }
    return { type: 'Post', color: 'bg-blue-100 text-blue-700', icon: '📝' };
  }, []);

  const getPlatformIcon = useCallback((platform) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="h-4 w-4 sm:h-5 sm:w-5 text-[#0066CC]" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />;
      case 'both':
        return (
          <>
            <Facebook className="h-3 w-3 sm:h-4 sm:w-4 text-[#0066CC]" />
            <Instagram className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600" />
          </>
        );
      case 'youtube':
        return <div className="h-4 w-4 sm:h-5 sm:w-5 bg-red-600 text-white rounded text-[10px] flex items-center justify-center font-bold">YT</div>;
      case 'twitter':
        return <div className="h-4 w-4 sm:h-5 sm:w-5 bg-blue-400 text-white rounded text-[10px] flex items-center justify-center font-bold">X</div>;
      case 'linkedin':
        return <div className="h-4 w-4 sm:h-5 sm:w-5 bg-blue-700 text-white rounded text-[10px] flex items-center justify-center font-bold">In</div>;
      default:
        return <div className="h-4 w-4 sm:h-5 sm:w-5 bg-gray-400 text-white rounded text-[10px] flex items-center justify-center">?</div>;
    }
  }, []);

  const getCustomerDisplayInfo = useCallback((post) => {
    if (post.customerName) {
      return {
        name: post.customerName,
        id: post.customerId || post.userId || 'Unknown ID'
      };
    }
    const customerId = post.customerId || post.userId;
    if (customerId && customers[customerId]) {
      return {
        name: customers[customerId].name,
        id: customerId
      };
    }
    if (customerId) {
      return {
        name: `Customer ${customerId.slice(-6)}`,
        id: customerId
      };
    }
    return {
      name: 'Unknown Customer',
      id: 'Unknown ID'
    };
  }, [customers]);

  const getPlatformInfo = useCallback((platform) => {
    const platformData = {
      facebook: {
        name: 'Facebook',
        color: 'from-blue-500 to-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <Facebook className="h-6 w-6 text-[#0066CC]" />
      },
      instagram: {
        name: 'Instagram',
        color: 'from-pink-500 via-purple-500 to-orange-500',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        icon: <Instagram className="h-6 w-6 text-pink-600" />
      },
      both: {
        name: 'Facebook & Instagram',
        color: 'from-blue-500 via-purple-500 to-pink-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        icon: (
          <div className="flex space-x-1">
            <Facebook className="h-5 w-5 text-[#0066CC]" />
            <Instagram className="h-5 w-5 text-pink-600" />
          </div>
        )
      },
      youtube: {
        name: 'YouTube',
        color: 'from-red-500 to-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: <div className="h-6 w-6 bg-red-600 text-white rounded text-sm flex items-center justify-center font-bold">YT</div>
      },
      twitter: {
        name: 'X (Twitter)',
        color: 'from-blue-400 to-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <div className="h-6 w-6 bg-blue-400 text-white rounded text-sm flex items-center justify-center font-bold">𝕏</div>
      },
      linkedin: {
        name: 'LinkedIn',
        color: 'from-blue-600 to-blue-800',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        icon: <div className="h-6 w-6 bg-blue-700 text-white rounded text-sm flex items-center justify-center font-bold">in</div>
      }
    };
    return platformData[platform] || {
      name: platform || 'Unknown',
      color: 'from-gray-400 to-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: <div className="h-6 w-6 bg-gray-400 text-white rounded text-sm flex items-center justify-center">?</div>
    };
  }, []);

  const filteredPosts = useMemo(() => {
    if (!Array.isArray(scheduledPosts)) return [];
    if (filter === 'all') return scheduledPosts;
    return scheduledPosts.filter(post => post.status === filter);
  }, [scheduledPosts, filter]);

  const groupedPosts = useMemo(() => filteredPosts.reduce((groups, post) => {
    const customerId = post.customerId || post.userId || 'unknown';
    if (!groups[customerId]) {
      groups[customerId] = [];
    }
    groups[customerId].push(post);
    return groups;
  }, {}), [filteredPosts]);

  const platformGroupedPosts = useMemo(() => filteredPosts.reduce((groups, post) => {
    const platform = post.platform || 'unknown';
    if (!groups[platform]) {
      groups[platform] = [];
    }
    groups[platform].push(post);
    return groups;
  }, {}), [filteredPosts]);

  const sortedCustomerIds = useMemo(() => 
    Object.keys(groupedPosts).sort((a, b) => groupedPosts[b].length - groupedPosts[a].length),
    [groupedPosts]
  );

  const sortedPlatforms = useMemo(() => {
    const platformPriority = { facebook: 1, instagram: 2, both: 3, youtube: 4, twitter: 5, linkedin: 6 };
    return Object.keys(platformGroupedPosts).sort((a, b) => {
      const priorityA = platformPriority[a] || 999;
      const priorityB = platformPriority[b] || 999;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return platformGroupedPosts[b].length - platformGroupedPosts[a].length;
    });
  }, [platformGroupedPosts]);

  const toggleCustomerExpansion = useCallback((customerId) => {
    setExpandedCustomers(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(customerId)) {
        newExpanded.delete(customerId);
      } else {
        newExpanded.add(customerId);
      }
      return newExpanded;
    });
  }, []);

  const togglePlatformExpansion = useCallback((platform) => {
    setExpandedPlatforms(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(platform)) {
        newExpanded.delete(platform);
      } else {
        newExpanded.add(platform);
      }
      return newExpanded;
    });
  }, []);

  const expandAllCustomers = useCallback(() => {
    setExpandedCustomers(new Set(sortedCustomerIds));
  }, [sortedCustomerIds]);

  const collapseAllCustomers = useCallback(() => {
    setExpandedCustomers(new Set());
  }, []);

  const expandAllPlatforms = useCallback(() => {
    setExpandedPlatforms(new Set(sortedPlatforms));
  }, [sortedPlatforms]);

  const collapseAllPlatforms = useCallback(() => {
    setExpandedPlatforms(new Set());
  }, []);

  const getCustomerSummary = useCallback((posts) => {
    const statusCounts = posts.reduce((counts, post) => {
      counts[post.status] = (counts[post.status] || 0) + 1;
      return counts;
    }, {});

    return {
      total: posts.length,
      pending: statusCounts.pending || 0,
      published: statusCounts.published || 0,
      failed: statusCounts.failed || 0,
      processing: statusCounts.processing || 0
    };
  }, []);

  return (
    <AdminLayout title="Scheduled Posts">
      <div className="space-y-2 sm:space-y-3">
        {/* Compact Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-2 sm:p-3 border border-gray-200/50">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-2">Scheduled Posts</h2>
          
          {/* Filters */}
          <div className="flex items-center gap-1 flex-wrap mb-2">
            <Filter className="h-3 w-3 text-gray-500" />
            {['all', 'pending', 'processing', 'published', 'failed'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium transition-all ${
                  filter === status 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>

          {/* View Mode */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('grouped')}
              className={`flex-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                viewMode === 'grouped' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              <Users className="h-3 w-3 inline mr-1" />Customers
            </button>
            <button
              onClick={() => setViewMode('platform')}
              className={`flex-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                viewMode === 'platform' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              <Send className="h-3 w-3 inline mr-1" />Platforms
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
              }`}
            >
              List
            </button>
        </div>

        {/* Expand/Collapse All */}
        {viewMode === 'grouped' && sortedCustomerIds.length > 0 && (
          <div className="flex items-center space-x-2 px-2">
            <button onClick={expandAllCustomers} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
              Expand All
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={collapseAllCustomers} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
              Collapse All
            </button>
          </div>
        )}
        {viewMode === 'platform' && sortedPlatforms.length > 0 && (
          <div className="flex items-center space-x-2 px-2">
            <button onClick={expandAllPlatforms} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
              Expand All
            </button>
            <span className="text-gray-300">|</span>
            <button onClick={collapseAllPlatforms} className="text-blue-600 hover:text-blue-800 text-xs font-medium">
              Collapse All
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-blue-600" />
          </div>
        ) : viewMode === 'platform' ? (
          /* Platform View */
          <div className="space-y-2 sm:space-y-3">
            {sortedPlatforms.map(platform => {
              const platformPosts = platformGroupedPosts[platform];
              const platformInfo = getPlatformInfo(platform);
              const summary = getCustomerSummary(platformPosts);
              const isExpanded = expandedPlatforms.has(platform);

              return (
                <div key={platform} className="bg-white rounded-lg shadow-sm border">
                  <div 
                    className={`p-3 sm:p-4 border-b cursor-pointer hover:bg-opacity-50 transition-all ${platformInfo.bgColor}`}
                      onClick={() => togglePlatformExpansion(platform)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                            <div className={`p-2 rounded-lg bg-gradient-to-r ${platformInfo.color} bg-opacity-10`}>
                              {platformInfo.icon}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-[#0F172A]">
                              {platformInfo.name}
                            </h3>
                            <p className="text-sm text-[#475569]">
                              {summary.total} {summary.total === 1 ? 'post' : 'posts'} scheduled
                            </p>
                          </div>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="flex items-center space-x-6">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-[#0F172A]">{summary.total}</div>
                            <div className="text-xs text-[#475569] uppercase tracking-wide">Total</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {summary.pending > 0 && (
                              <div className="text-center px-3 py-2 bg-yellow-100 rounded-lg">
                                <div className="text-lg font-bold text-yellow-800">{summary.pending}</div>
                                <div className="text-xs text-yellow-600">Pending</div>
                              </div>
                            )}
                            {summary.processing > 0 && (
                              <div className="text-center px-3 py-2 bg-blue-100 rounded-lg">
                                <div className="text-lg font-bold text-blue-800">{summary.processing}</div>
                                <div className="text-xs text-blue-600">Processing</div>
                              </div>
                            )}
                            {summary.published > 0 && (
                              <div className="text-center px-3 py-2 bg-green-100 rounded-lg">
                                <div className="text-lg font-bold text-green-800">{summary.published}</div>
                                <div className="text-xs text-green-600">Published</div>
                              </div>
                            )}
                            {summary.failed > 0 && (
                              <div className="text-center px-3 py-2 bg-red-100 rounded-lg">
                                <div className="text-lg font-bold text-red-800">{summary.failed}</div>
                                <div className="text-xs text-red-600">Failed</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 sm:p-4 bg-gray-50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {platformPosts.map(post => (
                            <PostCard
                              key={post._id}
                              post={post}
                              onDelete={handleDeletePost}
                              getStatusColor={getStatusColor}
                              getStatusIcon={getStatusIcon}
                              getPostType={getPostType}
                              getPlatformIcon={getPlatformIcon}
                              isVideoUrl={isVideoUrl}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'grouped' ? (
            /* Grouped View - Customer Groups */
            <div className="space-y-2 sm:space-y-3">{sortedCustomerIds.map(customerId => {
                const customerPosts = groupedPosts[customerId];
                const customerInfo = getCustomerDisplayInfo(customerPosts[0]);
                const summary = getCustomerSummary(customerPosts);
                const isExpanded = expandedCustomers.has(customerId);

                return (
                  <div key={customerId} className="bg-white rounded-lg shadow-sm border">
                    <div 
                      className="p-3 sm:p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleCustomerExpansion(customerId)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0">
                          {isExpanded ? <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                          <User className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <div className="min-w-0">
                            <h3 className="text-sm font-semibold text-gray-900 truncate">{customerInfo?.name || 'Unknown'}</h3>
                            <p className="text-xs text-gray-500 truncate">ID: {customerInfo?.id || customerId}</p>
                          </div>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-base sm:text-lg font-bold text-gray-900">{summary.total}</div>
                            <div className="text-[9px] text-gray-500">Posts</div>
                          </div>
                          {summary.pending > 0 && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-medium rounded-full">{summary.pending} Pending</span>
                          )}
                          {summary.published > 0 && (
                            <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-[10px] font-medium rounded-full hidden sm:inline">{summary.published} Published</span>
                          )}
                          {summary.failed > 0 && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-medium rounded-full">{summary.failed} Failed</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-3 sm:p-4 bg-gray-50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {customerPosts.map(post => (
                            <PostCard
                              key={post._id}
                              post={post}
                              onDelete={handleDeletePost}
                              getStatusColor={getStatusColor}
                              getStatusIcon={getStatusIcon}
                              getPostType={getPostType}
                              getPlatformIcon={getPlatformIcon}
                              isVideoUrl={isVideoUrl}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View - 3 Column Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredPosts.map(post => (
                <PostCard
                  key={post._id}
                  post={post}
                  onDelete={handleDeletePost}
                  getStatusColor={getStatusColor}
                  getStatusIcon={getStatusIcon}
                  getPostType={getPostType}
                  getPlatformIcon={getPlatformIcon}
                  isVideoUrl={isVideoUrl}
                />
              ))}
            </div>
          )}

          {filteredPosts.length === 0 && !loading && (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-900">No scheduled posts found</p>
              <p className="text-xs text-gray-500 mt-1">Posts will appear here when scheduled</p>
            </div>
          )}
        </div>
        </div>
      </AdminLayout>
    );
  }
  
  export default memo(ScheduledPosts);