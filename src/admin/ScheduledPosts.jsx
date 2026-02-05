import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
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
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'published': return <CheckCircle className="h-3 w-3" />;
      case 'failed': return <XCircle className="h-3 w-3" />;
      case 'processing': return <Loader2 className="h-3 w-3 animate-spin" />;
      default: return <Clock className="h-3 w-3" />;
    }
  }, []);

  const filteredPosts = Array.isArray(scheduledPosts) ? scheduledPosts.filter(post => {
    if (filter === 'all') return true;
    return post.status === filter;
  }) : [];

  // Helper to detect video URLs
  const isVideoUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
  }, []);

  // Helper to determine post type
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
        return <Facebook className="h-4 w-4 text-[#0066CC]" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'both':
        return (
          <>
            <Facebook className="h-3 w-3 text-[#0066CC]" />
            <Instagram className="h-3 w-3 text-pink-600" />
          </>
        );
      case 'youtube':
        return <div className="h-4 w-4 bg-red-600 text-white rounded text-xs flex items-center justify-center font-bold">YT</div>;
      case 'twitter':
        return <div className="h-4 w-4 bg-blue-400 text-white rounded text-xs flex items-center justify-center font-bold">X</div>;
      case 'linkedin':
        return <div className="h-4 w-4 bg-blue-700 text-white rounded text-xs flex items-center justify-center font-bold">In</div>;
      default:
        return <div className="h-4 w-4 bg-gray-400 text-white rounded text-xs flex items-center justify-center">?</div>;
    }
  }, []);

  // Helper function to get customer display name
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

  // Helper to get platform display information
  const getPlatformInfo = useCallback((platform) => {
    const platformData = {
      facebook: {
        name: 'Facebook',
        color: 'from-blue-500 to-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <Facebook className="h-5 w-5 text-[#0066CC]" />
      },
      instagram: {
        name: 'Instagram',
        color: 'from-pink-500 via-purple-500 to-orange-500',
        bgColor: 'bg-pink-50',
        borderColor: 'border-pink-200',
        icon: <Instagram className="h-5 w-5 text-pink-600" />
      },
      both: {
        name: 'FB & IG',
        color: 'from-blue-500 via-purple-500 to-pink-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        icon: (
          <div className="flex space-x-1">
            <Facebook className="h-4 w-4 text-[#0066CC]" />
            <Instagram className="h-4 w-4 text-pink-600" />
          </div>
        )
      },
      youtube: {
        name: 'YouTube',
        color: 'from-red-500 to-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: <div className="h-5 w-5 bg-red-600 text-white rounded text-xs flex items-center justify-center font-bold">YT</div>
      },
      twitter: {
        name: 'X',
        color: 'from-blue-400 to-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        icon: <div className="h-5 w-5 bg-blue-400 text-white rounded text-xs flex items-center justify-center font-bold">𝕏</div>
      },
      linkedin: {
        name: 'LinkedIn',
        color: 'from-blue-600 to-blue-800',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-300',
        icon: <div className="h-5 w-5 bg-blue-700 text-white rounded text-xs flex items-center justify-center font-bold">in</div>
      }
    };
    return platformData[platform] || {
      name: platform || 'Unknown',
      color: 'from-gray-400 to-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: <div className="h-5 w-5 bg-gray-400 text-white rounded text-xs flex items-center justify-center">?</div>
    };
  }, []);

  // Group posts by customer - memoized
  const groupedPosts = useMemo(() => filteredPosts.reduce((groups, post) => {
    const customerId = post.customerId || post.userId || 'unknown';
    if (!groups[customerId]) {
      groups[customerId] = [];
    }
    groups[customerId].push(post);
    return groups;
  }, {}), [filteredPosts]);

  // Group posts by platform - memoized
  const platformGroupedPosts = useMemo(() => filteredPosts.reduce((groups, post) => {
    const platform = post.platform || 'unknown';
    if (!groups[platform]) {
      groups[platform] = [];
    }
    groups[platform].push(post);
    return groups;
  }, {}), [filteredPosts]);

  // Sort customers by number of posts (descending) - memoized
  const sortedCustomerIds = useMemo(() => Object.keys(groupedPosts).sort((a, b) => {
    return groupedPosts[b].length - groupedPosts[a].length;
  }), [groupedPosts]);

  // Sort platforms by priority and number of posts - memoized
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
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-1 sm:px-2 py-2 sm:py-3">
          {/* Filters and View Mode Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 mb-2 sm:mb-3">
            {/* Status Filters */}
            <div className="flex items-center flex-wrap gap-1">
              <Filter className="h-3 w-3 text-[#475569]" />
              {['all', 'pending', 'processing', 'published', 'failed'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-2 py-0.5 rounded-full text-xs font-medium transition-all ${
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
            <div className="flex items-center space-x-1">
              <span className="text-xs font-medium text-[#0F172A]">View:</span>
              <div className="flex bg-[#F4F9FF] rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    viewMode === 'grouped'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <Users className="h-3 w-3 inline" />
                </button>
                <button
                  onClick={() => setViewMode('platform')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    viewMode === 'platform'
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  <Send className="h-3 w-3 inline" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
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

          {/* Customer Overview Header - Compact */}
          <div className="bg-[#F4F9FF] rounded-lg shadow-sm border border-gray-100 mb-2">
            <div className="px-2 sm:px-3 py-1.5">
              <h2 className="text-sm sm:text-base font-bold text-[#0F172A]">Overview</h2>
              <p className="text-xs text-[#475569]">Track schedules & deadlines</p>
            </div>
          </div>

          {/* Expand/Collapse All - Compact */}
          {viewMode === 'grouped' && sortedCustomerIds.length > 0 && (
            <div className="flex items-center space-x-2 mb-2">
              <button onClick={expandAllCustomers} className="text-[#0066CC] text-xs font-medium">Expand All</button>
              <span className="text-gray-300">|</span>
              <button onClick={collapseAllCustomers} className="text-[#0066CC] text-xs font-medium">Collapse All</button>
            </div>
          )}
          {viewMode === 'platform' && sortedPlatforms.length > 0 && (
            <div className="flex items-center space-x-2 mb-2">
              <button onClick={expandAllPlatforms} className="text-[#0066CC] text-xs font-medium">Expand All</button>
              <span className="text-gray-300">|</span>
              <button onClick={collapseAllPlatforms} className="text-[#0066CC] text-xs font-medium">Collapse All</button>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[#0066CC]" />
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
                    {/* Platform Header - Compact */}
                    <div 
                      className={`p-2 sm:p-3 border-b cursor-pointer hover:bg-opacity-50 transition-all ${platformInfo.bgColor}`}
                      onClick={() => togglePlatformExpansion(platform)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          <div className={`p-1.5 rounded-lg bg-gradient-to-r ${platformInfo.color} bg-opacity-10`}>
                            {platformInfo.icon}
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-base font-bold text-[#0F172A]">
                              {platformInfo.name}
                            </h3>
                            <p className="text-xs text-[#475569]">
                              {summary.total} posts
                            </p>
                          </div>
                        </div>
                        
                        {/* Summary Stats - Compact */}
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <div className="text-center">
                            <div className="text-lg sm:text-xl font-bold text-[#0F172A]">{summary.total}</div>
                          </div>
                          <div className="hidden sm:flex flex-wrap gap-1">
                            {summary.pending > 0 && (
                              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">{summary.pending}P</span>
                            )}
                            {summary.published > 0 && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded">{summary.published}✓</span>
                            )}
                            {summary.failed > 0 && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded">{summary.failed}✗</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-2 sm:p-3 bg-gray-50">
                        <div className="grid grid-cols-3 gap-1 sm:gap-2">
                          {platformPosts.map(post => {
                            const customerInfo = getCustomerDisplayInfo(post);
                            
                            return (
                              <div key={post._id} className="bg-white rounded border p-1.5 sm:p-2 shadow-sm">
                                {/* Status Badge */}
                                <div className="flex items-center justify-between mb-1">
                                  <span className={`px-1 py-0.5 rounded text-xs font-medium flex items-center space-x-0.5 ${getStatusColor(post.status)}`}>
                                    {getStatusIcon(post.status)}
                                  </span>
                                  {(() => {
                                    const postType = getPostType(post);
                                    return (
                                      <span className={`text-xs ${postType.color} px-1 rounded`}>
                                        {postType.icon}
                                      </span>
                                    );
                                  })()}
                                </div>

                                {/* Media Preview - Small */}
                                {post.imageUrls && post.imageUrls.length > 1 ? (
                                  <div className="mb-1">
                                    <div className="grid grid-cols-2 gap-0.5">
                                      {post.imageUrls.slice(0, 4).map((url, idx) => (
                                        isVideoUrl(url) ? (
                                          <div key={idx} className="h-8 sm:h-12 bg-gray-800 rounded flex items-center justify-center">
                                            <Video className="h-3 w-3 text-white" />
                                          </div>
                                        ) : (
                                          <img key={idx} src={url} alt="" className="w-full h-8 sm:h-12 object-cover rounded" />
                                        )
                                      ))}
                                    </div>
                                  </div>
                                ) : post.imageUrl ? (
                                  isVideoUrl(post.imageUrl) ? (
                                    <div className="h-16 sm:h-20 bg-gray-800 rounded flex items-center justify-center mb-1">
                                      <Video className="h-4 w-4 text-white" />
                                    </div>
                                  ) : (
                                    <img src={post.imageUrl} alt="" className="w-full h-16 sm:h-20 object-cover rounded mb-1" />
                                  )
                                ) : null}

                                {/* Caption - Truncated */}
                                <p className="text-xs text-gray-700 line-clamp-1 mb-1">{post.caption}</p>
                                
                                {/* Date/Time - Compact */}
                                <div className="flex items-center text-xs text-gray-400 space-x-1">
                                  <Calendar className="h-2.5 w-2.5" />
                                  <span>{new Date(post.scheduledAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                                </div>

                                {/* Delete */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }}
                                  className="text-red-500 hover:text-red-700 mt-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
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
            <div className="space-y-2">
              {sortedCustomerIds.map(customerId => {
                const customerPosts = groupedPosts[customerId];
                const customerInfo = getCustomerDisplayInfo(customerPosts[0]);
                const summary = getCustomerSummary(customerPosts);
                const isExpanded = expandedCustomers.has(customerId);

                return (
                  <div key={customerId} className="bg-white rounded-lg shadow-sm">
                    {/* Customer Header - Compact */}
                    <div 
                      className="p-2 sm:p-3 border-b cursor-pointer hover:bg-[#F4F9FF] transition-colors"
                      onClick={() => toggleCustomerExpansion(customerId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                          <User className="h-4 w-4 text-[#0066CC]" />
                          <div>
                            <h3 className="text-sm font-semibold text-[#0F172A] truncate max-w-[120px] sm:max-w-none">
                              {customerInfo?.name || 'Unknown'}
                            </h3>
                          </div>
                        </div>
                        
                        {/* Summary Stats - Compact */}
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <div className="text-center">
                            <div className="text-lg sm:text-xl font-bold text-[#0F172A]">{summary.total}</div>
                          </div>
                          <div className="hidden sm:flex space-x-1">
                            {summary.pending > 0 && (
                              <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded">{summary.pending}P</span>
                            )}
                            {summary.published > 0 && (
                              <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded">{summary.published}✓</span>
                            )}
                            {summary.failed > 0 && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs rounded">{summary.failed}✗</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content - 3 Column Grid */}
                    {isExpanded && (
                      <div className="p-2 sm:p-3">
                        <div className="grid grid-cols-3 gap-1 sm:gap-2">
                          {customerPosts.map(post => (
                            <div key={post._id} className="bg-gray-50 rounded border p-1.5 sm:p-2">
                              {/* Header with platform and status */}
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-1">
                                  {getPlatformIcon(post.platform)}
                                </div>
                                <span className={`px-1 py-0.5 rounded text-xs font-medium flex items-center ${getStatusColor(post.status)}`}>
                                  {getStatusIcon(post.status)}
                                </span>
                              </div>

                              {/* Media Preview - Small */}
                              {post.imageUrls && post.imageUrls.length > 1 ? (
                                <div className="mb-1">
                                  <div className="grid grid-cols-2 gap-0.5">
                                    {post.imageUrls.slice(0, 4).map((url, idx) => (
                                      isVideoUrl(url) ? (
                                        <div key={idx} className="h-8 sm:h-12 bg-gray-800 rounded flex items-center justify-center">
                                          <Video className="h-3 w-3 text-white" />
                                        </div>
                                      ) : (
                                        <img key={idx} src={url} alt="" className="w-full h-8 sm:h-12 object-cover rounded" />
                                      )
                                    ))}
                                  </div>
                                </div>
                              ) : post.imageUrl ? (
                                isVideoUrl(post.imageUrl) ? (
                                  <div className="h-16 sm:h-20 bg-gray-800 rounded flex items-center justify-center mb-1">
                                    <Video className="h-4 w-4 text-white" />
                                  </div>
                                ) : (
                                  <img src={post.imageUrl} alt="" className="w-full h-16 sm:h-20 object-cover rounded mb-1" />
                                )
                              ) : null}

                              {/* Caption - Truncated */}
                              <p className="text-xs text-gray-700 line-clamp-1 mb-1">{post.caption}</p>
                              
                              {/* Date/Time - Compact */}
                              <div className="flex items-center text-xs text-gray-400 space-x-1">
                                <Calendar className="h-2.5 w-2.5" />
                                <span>{new Date(post.scheduledAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                              </div>

                              {/* Delete */}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }}
                                className="text-red-500 hover:text-red-700 mt-1"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
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
            /* List View - 3 Column Grid for Mobile */
            <div className="grid grid-cols-3 gap-1 sm:gap-2">
              {filteredPosts.map(post => {
                const customerInfo = getCustomerDisplayInfo(post);
                
                return (
                  <div
                    key={post._id}
                    className="bg-white rounded border shadow-sm p-1.5 sm:p-2"
                  >
                    {/* Header with platform and status */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1">
                        {getPlatformIcon(post.platform)}
                      </div>
                      <span className={`px-1 py-0.5 rounded text-xs font-medium flex items-center ${getStatusColor(post.status)}`}>
                        {getStatusIcon(post.status)}
                      </span>
                    </div>

                    {/* Customer - Compact */}
                    {customerInfo && (
                      <div className="flex items-center space-x-1 mb-1">
                        <User className="h-2.5 w-2.5 text-[#0066CC]" />
                        <span className="text-xs text-gray-600 truncate">{customerInfo.name}</span>
                      </div>
                    )}

                    {/* Media Preview - Small */}
                    {post.imageUrls && post.imageUrls.length > 1 ? (
                      <div className="mb-1">
                        <div className="grid grid-cols-2 gap-0.5">
                          {post.imageUrls.slice(0, 4).map((url, idx) => (
                            isVideoUrl(url) ? (
                              <div key={idx} className="h-8 sm:h-12 bg-gray-800 rounded flex items-center justify-center">
                                <Video className="h-3 w-3 text-white" />
                              </div>
                            ) : (
                              <img key={idx} src={url} alt="" className="w-full h-8 sm:h-12 object-cover rounded" />
                            )
                          ))}
                        </div>
                      </div>
                    ) : post.imageUrl ? (
                      isVideoUrl(post.imageUrl) ? (
                        <div className="h-16 sm:h-20 bg-gray-800 rounded flex items-center justify-center mb-1">
                          <Video className="h-4 w-4 text-white" />
                        </div>
                      ) : (
                        <img src={post.imageUrl} alt="" className="w-full h-16 sm:h-20 object-cover rounded mb-1" />
                      )
                    ) : null}

                    {/* Caption - Truncated */}
                    <p className="text-xs text-gray-700 line-clamp-1 mb-1">{post.caption}</p>
                    
                    {/* Date/Time - Compact */}
                    <div className="flex items-center text-xs text-gray-400 space-x-1">
                      <Calendar className="h-2.5 w-2.5" />
                      <span>{new Date(post.scheduledAt).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeletePost(post._id)}
                      className="text-red-500 hover:text-red-700 mt-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {filteredPosts.length === 0 && !loading && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-[#0F172A]">No scheduled posts found</p>
              <p className="text-xs text-[#475569] mt-1">
                Posts will appear here when scheduled
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default memo(ScheduledPosts);
