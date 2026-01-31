import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Facebook, Instagram, Image, Send, Eye, Edit, Trash2, CheckCircle, XCircle, Loader2, Plus, Filter, ArrowLeft, User, ChevronDown, ChevronRight, Users, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AdminLayout from './components/layout/AdminLayout';

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

  // Handle post updates from SocialActionManager
  const handlePostUpdate = (postId, updates) => {
    setScheduledPosts(prev => prev.map(post => 
      post._id === postId ? { ...post, ...updates } : post
    ));
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
    if (!url || typeof url !== 'string') return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
  };

  // Helper to determine post type
  const getPostType = (post) => {
    // Check if it's a story
    if (post.isStory || post.postType === 'story') {
      return { type: 'Story', color: 'bg-orange-100 text-orange-700', icon: '📖' };
    }
    // Check if it's a carousel
    if ((post.isCarousel || post.useCarouselService) && post.imageUrls?.length > 1) {
      return { type: 'Carousel', color: 'bg-purple-100 text-purple-700', icon: '🎠' };
    }
    // Default to regular post
    return { type: 'Post', color: 'bg-blue-100 text-blue-700', icon: '📝' };
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="h-5 w-5 text-[#0066CC]" />;
      case 'instagram':
        return <Instagram className="h-5 w-5 text-pink-600" />;
      case 'both':
        return (
          <>
            <Facebook className="h-4 w-4 text-[#0066CC]" />
            <Instagram className="h-4 w-4 text-pink-600" />
          </>
        );
      case 'youtube':
        return <div className="h-5 w-5 bg-red-600 text-white rounded text-xs flex items-center justify-center font-bold">YT</div>;
      case 'twitter':
        return <div className="h-5 w-5 bg-blue-400 text-white rounded text-xs flex items-center justify-center font-bold">X</div>;
      case 'linkedin':
        return <div className="h-5 w-5 bg-blue-700 text-white rounded text-xs flex items-center justify-center font-bold">In</div>;
      default:
        return <div className="h-5 w-5 bg-gray-400 text-white rounded text-xs flex items-center justify-center">?</div>;
    }
  };

  // Helper function to get customer display name
  const getCustomerDisplayInfo = (post) => {
    // First try the post's embedded customer info
    if (post.customerName) {
      return {
        name: post.customerName,
        id: post.customerId || post.userId || 'Unknown ID'
      };
    }

    // Then try looking up from our customer cache
    const customerId = post.customerId || post.userId;
    if (customerId && customers[customerId]) {
      return {
        name: customers[customerId].name,
        id: customerId
      };
    }

    // Fallback to showing just the ID
    if (customerId) {
      return {
        name: `Customer ${customerId.slice(-6)}`, // Show last 6 chars of ID
        id: customerId
      };
    }

    return {
      name: 'Unknown Customer',
      id: 'Unknown ID'
    };
  };

  // Helper to get platform display information
  const getPlatformInfo = (platform) => {
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
  };

  // Group posts by customer
  const groupedPosts = filteredPosts.reduce((groups, post) => {
    const customerId = post.customerId || post.userId || 'unknown';
    if (!groups[customerId]) {
      groups[customerId] = [];
    }
    groups[customerId].push(post);
    return groups;
  }, {});

  // Group posts by platform
  const platformGroupedPosts = filteredPosts.reduce((groups, post) => {
    const platform = post.platform || 'unknown';
    if (!groups[platform]) {
      groups[platform] = [];
    }
    groups[platform].push(post);
    return groups;
  }, {});

  // Sort customers by number of posts (descending)
  const sortedCustomerIds = Object.keys(groupedPosts).sort((a, b) => {
    return groupedPosts[b].length - groupedPosts[a].length;
  });

  // Sort platforms by priority and number of posts
  const platformPriority = { facebook: 1, instagram: 2, both: 3, youtube: 4, twitter: 5, linkedin: 6 };
  const sortedPlatforms = Object.keys(platformGroupedPosts).sort((a, b) => {
    const priorityA = platformPriority[a] || 999;
    const priorityB = platformPriority[b] || 999;
    if (priorityA !== priorityB) return priorityA - priorityB;
    return platformGroupedPosts[b].length - platformGroupedPosts[a].length;
  });

  const toggleCustomerExpansion = (customerId) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
  };

  const togglePlatformExpansion = (platform) => {
    const newExpanded = new Set(expandedPlatforms);
    if (newExpanded.has(platform)) {
      newExpanded.delete(platform);
    } else {
      newExpanded.add(platform);
    }
    setExpandedPlatforms(newExpanded);
  };

  const expandAllCustomers = () => {
    setExpandedCustomers(new Set(sortedCustomerIds));
  };

  const collapseAllCustomers = () => {
    setExpandedCustomers(new Set());
  };

  const expandAllPlatforms = () => {
    setExpandedPlatforms(new Set(sortedPlatforms));
  };

  const collapseAllPlatforms = () => {
    setExpandedPlatforms(new Set());
  };

  const getCustomerSummary = (posts) => {
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
  };

  return (
    <AdminLayout title="Scheduled Posts">
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-2 sm:px-3 py-3 sm:py-4">
          {/* Filters and View Mode Toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-3 lg:space-y-0 mb-3 sm:mb-4">
            {/* Status Filters */}
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap gap-1">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-[#475569]" />
                <span className="text-xs sm:text-sm font-medium text-[#0F172A]">Filter:</span>
              </div>
              {['all', 'pending', 'processing', 'published', 'failed'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    filter === status 
                      ? 'bg-gradient-to-r from-[#00E5FF] to-[#0066CC] text-white shadow-sm' 
                      : 'bg-[#F4F9FF] text-[#475569] hover:bg-[#0066CC] hover:text-white'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-xs sm:text-sm font-medium text-[#0F172A]">View:</span>
              <div className="flex bg-[#F4F9FF] rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    viewMode === 'grouped'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <Users className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                  Customers
                </button>
                <button
                  onClick={() => setViewMode('platform')}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    viewMode === 'platform'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <Send className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                  Platforms
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Add Customer Overview Header */}
          <div className="bg-[#F4F9FF] backdrop-blur-sm rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-3 sm:mb-4">
            <div className="px-4 sm:px-6 py-2 sm:py-3 border-b border-gray-100">
              <h2 className="text-lg sm:text-xl font-bold text-[#0F172A]">Customer Overview</h2>
              <p className="text-xs sm:text-sm text-[#475569] mt-1">Track content schedules and deadlines</p>
            </div>
          </div>

          {/* Expand/Collapse All (for grouped and platform modes) */}
          {viewMode === 'grouped' && sortedCustomerIds.length > 0 && (
            <div className="flex items-center space-x-2 mb-3">
              <button
                onClick={expandAllCustomers}
                className="text-[#0066CC] hover:text-[#0052A3] text-sm font-medium"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAllCustomers}
                className="text-[#0066CC] hover:text-[#0052A3] text-sm font-medium"
              >
                Collapse All
              </button>
            </div>
          )}
          {viewMode === 'platform' && sortedPlatforms.length > 0 && (
            <div className="flex items-center space-x-2 mb-3">
              <button
                onClick={expandAllPlatforms}
                className="text-[#0066CC] hover:text-[#0052A3] text-sm font-medium"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAllPlatforms}
                className="text-[#0066CC] hover:text-[#0052A3] text-sm font-medium"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#0066CC]" />
            </div>
          ) : viewMode === 'platform' ? (
            /* Platform View */
            <div className="space-y-4">
              {sortedPlatforms.map(platform => {
                const platformPosts = platformGroupedPosts[platform];
                const platformInfo = getPlatformInfo(platform);
                const summary = getCustomerSummary(platformPosts);
                const isExpanded = expandedPlatforms.has(platform);

                return (
                  <div key={platform} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    {/* Platform Header */}
                    <div 
                      className={`p-6 border-b cursor-pointer hover:bg-opacity-50 transition-all ${platformInfo.bgColor}`}
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

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-6 bg-gray-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {platformPosts.map(post => {
                            const customerInfo = getCustomerDisplayInfo(post);
                            
                            return (
                              <div key={post._id} className="bg-white rounded-lg border p-4 shadow-sm hover:shadow-md transition-shadow">
                                {/* Calendar and Item Name */}
                                {post.calendar_name && (
                                  <div className="text-xs text-blue-700 mb-1">
                                    <strong>Calendar:</strong> {post.calendar_name}
                                  </div>
                                )}
                                {post.item_name && (
                                  <div className="text-xs text-purple-700 mb-2">
                                    <strong>Item:</strong> {post.item_name}
                                  </div>
                                )}

                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center space-x-2">
                                    <User className="h-4 w-4 text-gray-500" />
                                    <span className="text-xs font-medium text-gray-600 truncate">
                                      {customerInfo.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {(() => {
                                      const postType = getPostType(post);
                                      return (
                                        <span className={`px-2 py-0.5 ${postType.color} text-xs font-semibold rounded-full flex items-center space-x-1`}>
                                          <span>{postType.icon}</span>
                                          <span>{postType.type}</span>
                                          {postType.type === 'Carousel' && post.imageUrls?.length > 1 && (
                                            <span>({post.imageUrls.length})</span>
                                          )}
                                        </span>
                                      );
                                    })()}
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(post.status)}`}>
                                      {getStatusIcon(post.status)}
                                      <span>{post.status}</span>
                                    </span>
                                  </div>
                                </div>

                                {/* Media Preview */}
                                {post.imageUrls && post.imageUrls.length > 1 ? (
                                  <div className="mb-3">
                                    <div className="grid grid-cols-3 gap-1">
                                      {post.imageUrls.slice(0, 6).map((url, idx) => (
                                        isVideoUrl(url) ? (
                                          <div key={idx} className="relative h-20 bg-gray-800 rounded flex items-center justify-center">
                                            <Video className="h-6 w-6 text-white" />
                                            <span className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-1 rounded">{idx + 1}</span>
                                          </div>
                                        ) : (
                                          <div key={idx} className="relative">
                                            <img
                                              src={url}
                                              alt={`Item ${idx + 1}`}
                                              className="w-full h-20 object-cover rounded"
                                            />
                                            <span className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-1 rounded">{idx + 1}</span>
                                          </div>
                                        )
                                      ))}
                                      {post.imageUrls.length > 6 && (
                                        <div className="h-20 bg-gray-200 rounded flex items-center justify-center">
                                          <span className="text-gray-600 text-sm font-semibold">+{post.imageUrls.length - 6}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : post.imageUrl && isVideoUrl(post.imageUrl) ? (
                                  <video
                                    src={post.imageUrl}
                                    controls
                                    className="w-full h-32 object-cover rounded-lg mb-3"
                                    style={{ background: '#eee' }}
                                  />
                                ) : post.imageUrl ? (
                                  <img
                                    src={post.imageUrl}
                                    alt="Post content"
                                    className="w-full h-32 object-cover rounded-lg mb-3"
                                  />
                                ) : null}

                                <p className="text-gray-800 text-sm mb-3 line-clamp-2">
                                  {post.caption}
                                </p>
                                
                                <div className="space-y-1 text-xs text-gray-500 mb-3">
                                  <div className="flex items-center space-x-2">
                                    <Calendar className="h-3 w-3" />
                                    <span>{new Date(post.scheduledAt).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-3 w-3" />
                                    <span>{new Date(post.scheduledAt).toLocaleTimeString()}</span>
                                  </div>
                                </div>

                                {/* Error handling */}
                                {post.status === 'failed' && post.error && (
                                  <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                                    <p className="text-xs text-red-600">{post.error}</p>
                                  </div>
                                )}

                                <div className="flex items-center justify-end space-x-2">
                                  <button
                                    onClick={() => handleDeletePost(post._id)}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Delete from scheduler"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : viewMode === 'grouped' ? (
            /* Grouped View */
            <div className="space-y-4">
              {sortedCustomerIds.map(customerId => {
                const customerPosts = groupedPosts[customerId];
                const customerInfo = getCustomerDisplayInfo(customerPosts[0]);
                const summary = getCustomerSummary(customerPosts);
                const isExpanded = expandedCustomers.has(customerId);

                return (
                  <div key={customerId} className="bg-white rounded-lg shadow-sm">
                    {/* Customer Header */}
                    <div 
                      className="p-6 border-b cursor-pointer hover:bg-[#F4F9FF] transition-colors"
                      onClick={() => toggleCustomerExpansion(customerId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {isExpanded ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                            <User className="h-5 w-5 text-[#0066CC]" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#0F172A]">
                              {customerInfo?.name || 'Unknown Customer'}
                            </h3>
                            <p className="text-sm text-[#475569]">
                              ID: {customerInfo?.id || customerId}
                            </p>
                          </div>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-[#0F172A]">{summary.total}</div>
                            <div className="text-xs text-[#475569]">Total Posts</div>
                          </div>
                          <div className="flex space-x-2">
                            {summary.pending > 0 && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                                {summary.pending} Pending
                              </span>
                            )}
                            {summary.published > 0 && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                {summary.published} Published
                              </span>
                            )}
                            {summary.failed > 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                                {summary.failed} Failed
                              </span>
                            )}
                            {summary.processing > 0 && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                {summary.processing} Processing
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {customerPosts.map(post => (
                            <div key={post._id} className="bg-gray-50 rounded-lg border p-4">
                              {/* --- Display calendar and item name at the top --- */}
                              {post.calendar_name && (
                                <div className="text-xs text-blue-700 mb-1">
                                  <strong>Calendar:</strong> {post.calendar_name}
                                </div>
                              )}
                              {post.item_name && (
                                <div className="text-xs text-purple-700 mb-2">
                                  <strong>Item:</strong> {post.item_name}
                                </div>
                              )}
                              {/* --- End --- */}

                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                  {getPlatformIcon(post.platform)}
                                  <span className="text-sm font-medium text-gray-600">
                                    {post.pageName || post.channelName || 'Social Media Post'}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {/* Post Type indicator */}
                                  {(() => {
                                    const postType = getPostType(post);
                                    return (
                                      <span className={`px-2 py-0.5 ${postType.color} text-xs font-semibold rounded-full flex items-center space-x-1`}>
                                        <span>{postType.icon}</span>
                                        <span>{postType.type}</span>
                                        {postType.type === 'Carousel' && post.imageUrls?.length > 1 && (
                                          <span>({post.imageUrls.length})</span>
                                        )}
                                      </span>
                                    );
                                  })()}
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(post.status)}`}>
                                    {getStatusIcon(post.status)}
                                    <span>{post.status}</span>
                                  </span>
                                </div>
                              </div>

                              {/* Media Preview - Show carousel if multiple images */}
                              {post.imageUrls && post.imageUrls.length > 1 ? (
                                <div className="mb-3">
                                  <div className="grid grid-cols-3 gap-1">
                                    {post.imageUrls.slice(0, 6).map((url, idx) => (
                                      isVideoUrl(url) ? (
                                        <div key={idx} className="relative h-20 bg-gray-800 rounded flex items-center justify-center">
                                          <Video className="h-6 w-6 text-white" />
                                          <span className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-1 rounded">{idx + 1}</span>
                                        </div>
                                      ) : (
                                        <div key={idx} className="relative">
                                          <img
                                            src={url}
                                            alt={`Item ${idx + 1}`}
                                            className="w-full h-20 object-cover rounded"
                                          />
                                          <span className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-1 rounded">{idx + 1}</span>
                                        </div>
                                      )
                                    ))}
                                    {post.imageUrls.length > 6 && (
                                      <div className="h-20 bg-gray-200 rounded flex items-center justify-center">
                                        <span className="text-gray-600 text-sm font-semibold">+{post.imageUrls.length - 6}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : post.imageUrl && isVideoUrl(post.imageUrl) ? (
                                <video
                                  src={post.imageUrl}
                                  controls
                                  className="w-full h-32 object-cover rounded-lg mb-3"
                                  style={{ background: '#eee' }}
                                />
                              ) : post.imageUrl ? (
                                <img
                                  src={post.imageUrl}
                                  alt="Post content"
                                  className="w-full h-32 object-cover rounded-lg mb-3"
                                />
                              ) : null}

                              <p className="text-gray-800 text-sm mb-3 line-clamp-2">
                                {post.caption}
                              </p>
                              
                              <div className="space-y-1 text-xs text-gray-500 mb-3">
                                <div className="flex items-center space-x-2">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(post.scheduledAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-3 w-3" />
                                  <span>{new Date(post.scheduledAt).toLocaleTimeString()}</span>
                                </div>
                              </div>

                              {/* Error handling */}
                              {post.status === 'failed' && post.error && (
                                <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                                  <p className="text-xs text-red-600">{post.error}</p>
                                </div>
                              )}

                              <div className="flex items-center justify-end space-x-2">
                                {/* Delete from system */}
                                <button
                                  onClick={() => handleDeletePost(post._id)}
                                  className="text-red-600 hover:text-red-800 p-1"
                                  title="Delete from scheduler"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View - Original Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPosts.map(post => {
                const customerInfo = getCustomerDisplayInfo(post);
                
                return (
                  <div
                    key={post._id}
                    className="bg-white rounded-lg shadow-sm border p-4 flex flex-col"
                    style={{ height: '320px', minHeight: 320 }}
                  >
                    <div className="flex-1 flex flex-col overflow-y-auto" style={{ minHeight: 0 }}>
                      {/* --- Display calendar and item name at the top --- */}
                      {post.calendar_name && (
                        <div className="text-xs text-blue-700 mb-1">
                          <strong>Calendar:</strong> {post.calendar_name}
                        </div>
                      )}
                      {post.item_name && (
                        <div className="text-xs text-purple-700 mb-2">
                          <strong>Item:</strong> {post.item_name}
                        </div>
                      )}
                      {/* --- End --- */}

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getPlatformIcon(post.platform)}
                          <span className="text-sm font-medium text-gray-600">
                            {post.pageName || post.channelName || 'Social Media Post'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Post Type indicator */}
                          {(() => {
                            const postType = getPostType(post);
                            return (
                              <span className={`px-2 py-0.5 ${postType.color} text-xs font-semibold rounded-full flex items-center space-x-1`}>
                                <span>{postType.icon}</span>
                                <span>{postType.type}</span>
                                {postType.type === 'Carousel' && post.imageUrls?.length > 1 && (
                                  <span>({post.imageUrls.length})</span>
                                )}
                              </span>
                            );
                          })()}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(post.status)}`}>
                            {getStatusIcon(post.status)}
                            <span>{post.status}</span>
                          </span>
                        </div>
                      </div>

                      {/* Customer Information */}
                      {customerInfo && (
                        <div className="bg-[#F4F9FF] border border-[#0066CC]/20 rounded-lg p-2 mb-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-[#0066CC]" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-[#0F172A] truncate">
                                {customerInfo.name}
                              </p>
                              <p className="text-xs text-[#475569] truncate">
                                ID: {customerInfo.id}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show a fallback if no customer info is available */}
                      {!customerInfo && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-700">
                                Unknown Customer
                              </p>
                              <p className="text-xs text-gray-500">
                                Customer info not available
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Media Preview - Show carousel if multiple images */}
                      {post.imageUrls && post.imageUrls.length > 1 ? (
                        <div className="mb-3">
                          <div className="grid grid-cols-3 gap-1">
                            {post.imageUrls.slice(0, 6).map((url, idx) => (
                              isVideoUrl(url) ? (
                                <div key={idx} className="relative h-20 bg-gray-800 rounded flex items-center justify-center">
                                  <Video className="h-6 w-6 text-white" />
                                  <span className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-1 rounded">{idx + 1}</span>
                                </div>
                              ) : (
                                <div key={idx} className="relative">
                                  <img
                                    src={url}
                                    alt={`Item ${idx + 1}`}
                                    className="w-full h-20 object-cover rounded"
                                  />
                                  <span className="absolute top-1 left-1 bg-purple-600 text-white text-xs px-1 rounded">{idx + 1}</span>
                                </div>
                              )
                            ))}
                            {post.imageUrls.length > 6 && (
                              <div className="h-20 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-gray-600 text-sm font-semibold">+{post.imageUrls.length - 6}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : post.imageUrl && isVideoUrl(post.imageUrl) ? (
                        <video
                          src={post.imageUrl}
                          controls
                          className="w-full h-28 object-cover rounded-lg mb-2"
                          style={{ background: '#eee' }}
                        />
                      ) : post.imageUrl ? (
                        <img
                          src={post.imageUrl}
                          alt="Post content"
                          className="w-full h-28 object-cover rounded-lg mb-2"
                        />
                      ) : null}

                      {post.imageUrl && isVideoUrl(post.imageUrl) && post.platform === 'instagram' && (
                        <div className="text-xs text-[#0066CC] mb-1">
                          This video will be posted as an Instagram Reel.
                        </div>
                      )}

                      {post.imageUrl && isVideoUrl(post.imageUrl) && post.platform === 'youtube' && (
                        <div className="text-xs text-red-600 mb-1">
                          YouTube video upload scheduled.
                        </div>
                      )}

                      <p className="text-gray-800 text-sm mb-2 line-clamp-2">
                        {post.caption}
                      </p>
                      
                      <div className="space-y-1.5 text-xs text-gray-500 mb-2">
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
                        <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                          <p className="text-xs text-red-600 font-medium">Error Details:</p>
                          <p className="text-xs text-red-600">{post.error}</p>
                          {post.error.includes('access token') && (
                            <p className="text-xs text-[#0066CC] mt-1">
                              💡 Customer needs to reconnect their social media account
                            </p>
                          )}
                        </div>
                      )}

                      {/* Show partial success for posts with multiple platforms */}
                      {post.status === 'published' && post.error && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
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

                            {post.linkedinPostId ? (
                              <span className="flex items-center space-x-1 text-green-600">
                                <div className="h-3 w-3 bg-blue-700 text-white rounded text-xs flex items-center justify-center">In</div>
                                <span>✅ LinkedIn: {post.linkedinPostId}</span>
                              </span>
                            ) : post.platform === 'linkedin' ? (
                              <span className="flex items-center space-x-1 text-red-600">
                                <div className="h-3 w-3 bg-blue-700 text-white rounded text-xs flex items-center justify-center">In</div>
                                <span>❌ LinkedIn Failed</span>
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-yellow-600 mt-1 font-mono bg-yellow-100 p-1 rounded">
                            {post.error}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center space-x-2 mt-2">
                        {/* Delete from system */}
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Delete from scheduler"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredPosts.length === 0 && !loading && (
            <div className="text-center py-12">
              <Calendar className="h-16 w-16 mx-auto mb-3 text-gray-400" />
              <p className="text-[#0F172A]">No scheduled posts found for your assigned customers</p>
              <p className="text-sm text-[#475569] mt-2">
                Posts from your assigned customers will appear here when they are scheduled
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default ScheduledPosts;
