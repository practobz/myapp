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
  const [errorMessage, setErrorMessage] = useState(null); // User-friendly error message

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
      setErrorMessage('Unable to load scheduled posts. Please check your connection and try again.');
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
        setErrorMessage(null); // Clear any previous errors
      } else {
        setErrorMessage('Could not delete the post. Please try again later.');
      }
    } catch (error) {
      console.error('Delete post error:', error);
      setErrorMessage('Could not delete the post. Please check your connection and try again.');
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
      case 'pending': return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'published': return <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'failed': return <XCircle className="h-3 w-3 sm:h-4 sm:w-4" />;
      case 'processing': return <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />;
      default: return <Clock className="h-3 w-3 sm:h-4 sm:w-4" />;
    }
  }, []);

  const filteredPosts = useMemo(() => {
    if (!Array.isArray(scheduledPosts)) return [];
    if (filter === 'all') return scheduledPosts;
    return scheduledPosts.filter(post => post.status === filter);
  }, [scheduledPosts, filter]);

  // Helper to detect video URLs
  const isVideoUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
  }, []);

  // Helper to determine post type
  const getPostType = useCallback((post) => {
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
  }, []);

  // Helper to get user-friendly error message for failed posts
  const getFailureReason = useCallback((post) => {
    if (!post.error && !post.errorMessage && !post.failureReason) {
      return 'Publishing failed. Please try again.';
    }
    
    const errorText = post.error || post.errorMessage || post.failureReason || '';
    const lowerError = errorText.toLowerCase();
    
    // Map technical errors to user-friendly messages
    
    // Token/Authentication errors - most common
    if (lowerError.includes('access token') || lowerError.includes('accesstoken') || 
        lowerError.includes('invalid token') || lowerError.includes('token expired') ||
        lowerError.includes('token invalid') || lowerError.includes('oauth') ||
        lowerError.includes('session expired') || lowerError.includes('session invalid') ||
        lowerError.includes('auth') || lowerError.includes('unauthorized') ||
        lowerError.includes('401') || lowerError.includes('not authenticated') ||
        lowerError.includes('login required') || lowerError.includes('credentials')) {
      return 'Your social account connection has expired. Please reconnect your account in Settings.';
    }
    
    // Permission/Access errors
    if (lowerError.includes('permission') || lowerError.includes('403') ||
        lowerError.includes('forbidden') || lowerError.includes('not allowed') ||
        lowerError.includes('insufficient') || lowerError.includes('denied')) {
      return 'Permission issue. Your account may need additional permissions. Please reconnect in Settings.';
    }
    
    // Rate limiting
    if (lowerError.includes('rate limit') || lowerError.includes('too many') ||
        lowerError.includes('throttle') || lowerError.includes('quota') ||
        lowerError.includes('limit exceeded') || lowerError.includes('429')) {
      return 'Posting limit reached. Please wait a few minutes and try again.';
    }
    
    // Media/File errors
    if (lowerError.includes('image') || lowerError.includes('photo') ||
        lowerError.includes('video') || lowerError.includes('media') ||
        lowerError.includes('file') || lowerError.includes('upload')) {
      if (lowerError.includes('size') || lowerError.includes('large') || lowerError.includes('big')) {
        return 'The file is too large. Please use a smaller image or video.';
      }
      if (lowerError.includes('format') || lowerError.includes('type') || lowerError.includes('unsupported')) {
        return 'File format not supported. Please use JPG, PNG, or MP4 files.';
      }
      if (lowerError.includes('corrupt') || lowerError.includes('invalid') || lowerError.includes('damaged')) {
        return 'The file appears to be damaged. Please try uploading a different file.';
      }
      return 'There was an issue with the media file. Please try a different image or video.';
    }
    
    // Network/Connection errors
    if (lowerError.includes('network') || lowerError.includes('connection') ||
        lowerError.includes('timeout') || lowerError.includes('timed out') ||
        lowerError.includes('econnrefused') || lowerError.includes('enotfound') ||
        lowerError.includes('socket') || lowerError.includes('dns')) {
      return 'Connection issue. Please check your internet and try again.';
    }
    
    // Account/Page not found
    if (lowerError.includes('page not found') || lowerError.includes('account not found') ||
        lowerError.includes('user not found') || lowerError.includes('404') ||
        lowerError.includes('does not exist') || lowerError.includes('no longer available')) {
      return 'Social account not found. The page may have been removed or disconnected.';
    }
    
    // Content policy violations
    if (lowerError.includes('policy') || lowerError.includes('violation') ||
        lowerError.includes('community') || lowerError.includes('guidelines') ||
        lowerError.includes('spam') || lowerError.includes('blocked') ||
        lowerError.includes('restricted') || lowerError.includes('banned')) {
      return 'Content not allowed. Please review your post for policy violations.';
    }
    
    // Caption/Text issues
    if (lowerError.includes('caption') || lowerError.includes('text') ||
        lowerError.includes('character') || lowerError.includes('length') ||
        lowerError.includes('hashtag') || lowerError.includes('mention')) {
      return 'Caption issue. Please check your text length and formatting.';
    }
    
    // Server errors
    if (lowerError.includes('500') || lowerError.includes('502') || lowerError.includes('503') ||
        lowerError.includes('server error') || lowerError.includes('internal error') ||
        lowerError.includes('service unavailable') || lowerError.includes('temporarily')) {
      return 'The social platform is temporarily unavailable. Please try again later.';
    }
    
    // Duplicate content
    if (lowerError.includes('duplicate') || lowerError.includes('already posted') ||
        lowerError.includes('same content')) {
      return 'This content was already posted. Please try different content.';
    }
    
    // Scheduling specific
    if (lowerError.includes('schedule') || lowerError.includes('time') ||
        lowerError.includes('past') || lowerError.includes('future')) {
      return 'Scheduling issue. Please check the scheduled date and time.';
    }
    
    // API/Integration errors
    if (lowerError.includes('api') || lowerError.includes('endpoint') ||
        lowerError.includes('request') || lowerError.includes('response') ||
        lowerError.includes('json') || lowerError.includes('parse')) {
      return 'Technical issue with the social platform. Please try again later.';
    }
    
    // If we can't map it, return a generic message
    return 'Publishing failed. Please try again or contact support.';
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
        return <div className="h-4 w-4 sm:h-5 sm:w-5 bg-red-600 text-white rounded text-xs flex items-center justify-center font-bold">YT</div>;
      case 'twitter':
        return <div className="h-4 w-4 sm:h-5 sm:w-5 bg-blue-400 text-white rounded text-xs flex items-center justify-center font-bold">X</div>;
      case 'linkedin':
        return <div className="h-4 w-4 sm:h-5 sm:w-5 bg-blue-700 text-white rounded text-xs flex items-center justify-center font-bold">In</div>;
      default:
        return <div className="h-4 w-4 sm:h-5 sm:w-5 bg-gray-400 text-white rounded text-xs flex items-center justify-center">?</div>;
    }
  }, []);

  // Helper function to get customer display name
  const getCustomerDisplayInfo = useCallback((post) => {
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
  }, [customers]);

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
  const groupedPosts = useMemo(() => {
    return filteredPosts.reduce((groups, post) => {
      const customerId = post.customerId || post.userId || 'unknown';
      if (!groups[customerId]) {
        groups[customerId] = [];
      }
      groups[customerId].push(post);
      return groups;
    }, {});
  }, [filteredPosts]);

  // Group posts by platform
  const platformGroupedPosts = useMemo(() => {
    return filteredPosts.reduce((groups, post) => {
      const platform = post.platform || 'unknown';
      if (!groups[platform]) {
        groups[platform] = [];
      }
      groups[platform].push(post);
      return groups;
    }, {});
  }, [filteredPosts]);

  // Sort customers by number of posts (descending)
  const sortedCustomerIds = useMemo(() => {
    return Object.keys(groupedPosts).sort((a, b) => {
      return groupedPosts[b].length - groupedPosts[a].length;
    });
  }, [groupedPosts]);

  // Sort platforms by priority and number of posts
  const platformPriority = useMemo(() => ({ facebook: 1, instagram: 2, both: 3, youtube: 4, twitter: 5, linkedin: 6 }), []);
  const sortedPlatforms = useMemo(() => {
    return Object.keys(platformGroupedPosts).sort((a, b) => {
      const priorityA = platformPriority[a] || 999;
      const priorityB = platformPriority[b] || 999;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return platformGroupedPosts[b].length - platformGroupedPosts[a].length;
    });
  }, [platformGroupedPosts, platformPriority]);

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

          {/* Error Message Banner */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-3 sm:mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-500 hover:text-red-700 p-1"
                title="Dismiss"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          )}

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
                      className={`p-3 sm:p-6 border-b cursor-pointer hover:bg-opacity-50 transition-all ${platformInfo.bgColor}`}
                      onClick={() => togglePlatformExpansion(platform)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                            )}
                            <div className={`p-1.5 sm:p-2 rounded-lg bg-gradient-to-r ${platformInfo.color} bg-opacity-10`}>
                              {platformInfo.icon}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-xl font-bold text-[#0F172A]">
                              {platformInfo.name}
                            </h3>
                            <p className="text-xs sm:text-sm text-[#475569] hidden sm:block">
                              {summary.total} {summary.total === 1 ? 'post' : 'posts'} scheduled
                            </p>
                          </div>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="flex items-center space-x-2 sm:space-x-6">
                          <div className="text-center">
                            <div className="text-lg sm:text-3xl font-bold text-[#0F172A]">{summary.total}</div>
                            <div className="text-xs text-[#475569] uppercase tracking-wide hidden sm:block">Total</div>
                          </div>
                          <div className="hidden sm:flex flex-wrap gap-2">
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
                      <div className="p-5 bg-gray-50/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {platformPosts.map(post => {
                            const customerInfo = getCustomerDisplayInfo(post);
                            
                            return (
                              <div key={post._id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-[420px]">
                                {/* Header with Calendar/Item info */}
                                <div className="p-3 border-b border-gray-50 bg-gray-50/50 flex-shrink-0">
                                  <div className="text-xs text-blue-600 font-medium truncate">
                                    <span className="text-gray-500">Calendar:</span> {post.calendar_name || 'N/A'}
                                  </div>
                                  <div className="text-xs text-purple-600 font-medium truncate mt-0.5">
                                    <span className="text-gray-500">Item:</span> {post.item_name || 'N/A'}
                                  </div>
                                </div>

                                {/* Platform & Page with Status */}
                                <div className="px-3 pt-2 pb-2 flex items-center justify-between flex-shrink-0">
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {getPlatformIcon(post.platform)}
                                    <span className="text-sm font-medium text-gray-700 truncate">
                                      {post.pageName || post.channelName || customerInfo.name}
                                    </span>
                                  </div>
                                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0 ${getStatusColor(post.status)}`}>
                                    {getStatusIcon(post.status)}
                                    {post.status}
                                  </span>
                                </div>

                                {/* Media Preview - Fixed height */}
                                <div className="px-3 flex-shrink-0">
                                  {post.imageUrls && post.imageUrls.length > 1 ? (
                                    <div className="grid grid-cols-3 gap-1 h-[140px]">
                                      {post.imageUrls.slice(0, 3).map((url, idx) => (
                                        isVideoUrl(url) ? (
                                          <div key={idx} className="bg-gray-800 rounded-lg flex items-center justify-center h-full">
                                            <Video className="h-6 w-6 text-white" />
                                          </div>
                                        ) : (
                                          <img key={idx} src={url} alt="" className="w-full h-full object-cover rounded-lg" loading="lazy" />
                                        )
                                      ))}
                                    </div>
                                  ) : post.imageUrl ? (
                                    isVideoUrl(post.imageUrl) ? (
                                      <div className="w-full h-[140px] bg-gray-800 rounded-lg flex items-center justify-center">
                                        <Video className="h-8 w-8 text-white" />
                                      </div>
                                    ) : (
                                      <img src={post.imageUrl} alt="" className="w-full h-[140px] object-cover rounded-lg" loading="lazy" />
                                    )
                                  ) : (
                                    <div className="w-full h-[140px] bg-gray-100 rounded-lg flex items-center justify-center">
                                      <Image className="h-8 w-8 text-gray-300" />
                                    </div>
                                  )}
                                </div>

                                {/* Caption - Fixed height with scroll */}
                                <div className="px-3 pt-2 flex-1 overflow-hidden">
                                  <p className="text-gray-700 text-sm line-clamp-4">{post.caption || 'No caption'}</p>
                                </div>

                                {/* Footer */}
                                <div className="px-3 py-2 border-t border-gray-50 flex items-center justify-between flex-shrink-0 mt-auto">
                                  <div className="flex items-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(post.scheduledAt).toLocaleDateString()}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }}
                                    className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                    title="Delete"
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
            <div className="space-y-2 sm:space-y-4">
              {sortedCustomerIds.map(customerId => {
                const customerPosts = groupedPosts[customerId];
                const customerInfo = getCustomerDisplayInfo(customerPosts[0]);
                const summary = getCustomerSummary(customerPosts);
                const isExpanded = expandedCustomers.has(customerId);

                return (
                  <div key={customerId} className="bg-white rounded-lg shadow-sm">
                    {/* Customer Header */}
                    <div 
                      className="p-3 sm:p-6 border-b cursor-pointer hover:bg-[#F4F9FF] transition-colors"
                      onClick={() => toggleCustomerExpansion(customerId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                            )}
                            <User className="h-4 w-4 sm:h-5 sm:w-5 text-[#0066CC]" />
                          </div>
                          <div>
                            <h3 className="text-sm sm:text-lg font-semibold text-[#0F172A] truncate max-w-[120px] sm:max-w-none">
                              {customerInfo?.name || 'Unknown Customer'}
                            </h3>
                            <p className="text-xs sm:text-sm text-[#475569] hidden sm:block">
                              ID: {customerInfo?.id || customerId}
                            </p>
                          </div>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="flex items-center space-x-2 sm:space-x-4">
                          <div className="text-center">
                            <div className="text-lg sm:text-2xl font-bold text-[#0F172A]">{summary.total}</div>
                            <div className="text-xs text-[#475569] hidden sm:block">Total Posts</div>
                          </div>
                          <div className="hidden sm:flex space-x-2">
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
                      <div className="p-5 bg-gray-50/50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {customerPosts.map(post => (
                            <div key={post._id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-[420px]">
                              {/* Header with Calendar/Item info */}
                              <div className="p-3 border-b border-gray-50 bg-gray-50/50 flex-shrink-0">
                                <div className="text-xs text-blue-600 font-medium truncate">
                                  <span className="text-gray-500">Calendar:</span> {post.calendar_name || 'N/A'}
                                </div>
                                <div className="text-xs text-purple-600 font-medium truncate mt-0.5">
                                  <span className="text-gray-500">Item:</span> {post.item_name || 'N/A'}
                                </div>
                              </div>

                              {/* Platform & Page with Status */}
                              <div className="px-3 pt-2 pb-2 flex items-center justify-between flex-shrink-0">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  {getPlatformIcon(post.platform)}
                                  <span className="text-sm font-medium text-gray-700 truncate">
                                    {post.pageName || post.channelName || 'Post'}
                                  </span>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0 ${getStatusColor(post.status)}`}>
                                  {getStatusIcon(post.status)}
                                  {post.status}
                                </span>
                              </div>

                              {/* Media Preview - Fixed height */}
                              <div className="px-3 flex-shrink-0">
                                {post.imageUrls && post.imageUrls.length > 1 ? (
                                  <div className="grid grid-cols-3 gap-1 h-[140px]">
                                    {post.imageUrls.slice(0, 3).map((url, idx) => (
                                      isVideoUrl(url) ? (
                                        <div key={idx} className="bg-gray-800 rounded-lg flex items-center justify-center h-full">
                                          <Video className="h-6 w-6 text-white" />
                                        </div>
                                      ) : (
                                        <img key={idx} src={url} alt="" className="w-full h-full object-cover rounded-lg" loading="lazy" />
                                      )
                                    ))}
                                  </div>
                                ) : post.imageUrl ? (
                                  isVideoUrl(post.imageUrl) ? (
                                    <div className="w-full h-[140px] bg-gray-800 rounded-lg flex items-center justify-center">
                                      <Video className="h-8 w-8 text-white" />
                                    </div>
                                  ) : (
                                    <img src={post.imageUrl} alt="" className="w-full h-[140px] object-cover rounded-lg" loading="lazy" />
                                  )
                                ) : (
                                  <div className="w-full h-[140px] bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Image className="h-8 w-8 text-gray-300" />
                                  </div>
                                )}
                              </div>

                              {/* Caption - Fixed height with scroll */}
                              <div className="px-3 pt-2 flex-1 overflow-hidden">
                                {post.status === 'failed' ? (
                                  <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                                    <p className="text-red-700 text-xs font-medium mb-1">Failed to publish</p>
                                    <p className="text-red-600 text-xs">{getFailureReason(post)}</p>
                                  </div>
                                ) : (
                                  <p className="text-gray-700 text-sm line-clamp-4">{post.caption || 'No caption'}</p>
                                )}
                              </div>

                              {/* Footer */}
                              <div className="px-3 py-2 border-t border-gray-50 flex items-center justify-between flex-shrink-0 mt-auto">
                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(post.scheduledAt).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeletePost(post._id); }}
                                  className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                                  title="Delete"
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
            /* List View */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPosts.map(post => {
                const customerInfo = getCustomerDisplayInfo(post);
                
                return (
                  <div
                    key={post._id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-[420px]"
                  >
                    {/* Header with Calendar/Item info */}
                    <div className="p-3 border-b border-gray-50 bg-gray-50/50 flex-shrink-0">
                      <div className="text-xs text-blue-600 font-medium truncate">
                        <span className="text-gray-500">Calendar:</span> {post.calendar_name || 'N/A'}
                      </div>
                      <div className="text-xs text-purple-600 font-medium truncate mt-0.5">
                        <span className="text-gray-500">Item:</span> {post.item_name || 'N/A'}
                      </div>
                    </div>

                    {/* Platform & Page with Status */}
                    <div className="px-3 pt-2 pb-2 flex items-center justify-between flex-shrink-0">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getPlatformIcon(post.platform)}
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {post.pageName || post.channelName || customerInfo?.name || 'Post'}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1 flex-shrink-0 ${getStatusColor(post.status)}`}>
                        {getStatusIcon(post.status)}
                        {post.status}
                      </span>
                    </div>

                    {/* Media Preview - Fixed height */}
                    <div className="px-3 flex-shrink-0">
                      {post.imageUrls && post.imageUrls.length > 1 ? (
                        <div className="grid grid-cols-3 gap-1 h-[140px]">
                          {post.imageUrls.slice(0, 3).map((url, idx) => (
                            isVideoUrl(url) ? (
                              <div key={idx} className="bg-gray-800 rounded-lg flex items-center justify-center h-full">
                                <Video className="h-6 w-6 text-white" />
                              </div>
                            ) : (
                              <img key={idx} src={url} alt="" className="w-full h-full object-cover rounded-lg" loading="lazy" />
                            )
                          ))}
                        </div>
                      ) : post.imageUrl ? (
                        isVideoUrl(post.imageUrl) ? (
                          <div className="w-full h-[140px] bg-gray-800 rounded-lg flex items-center justify-center">
                            <Video className="h-8 w-8 text-white" />
                          </div>
                        ) : (
                          <img src={post.imageUrl} alt="" className="w-full h-[140px] object-cover rounded-lg" loading="lazy" />
                        )
                      ) : (
                        <div className="w-full h-[140px] bg-gray-100 rounded-lg flex items-center justify-center">
                          <Image className="h-8 w-8 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Caption - Fixed height with scroll */}
                    <div className="px-3 pt-2 flex-1 overflow-hidden">
                      {post.status === 'failed' ? (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                          <p className="text-red-700 text-xs font-medium mb-1">Failed to publish</p>
                          <p className="text-red-600 text-xs">{getFailureReason(post)}</p>
                        </div>
                      ) : (
                        <p className="text-gray-700 text-sm line-clamp-4">{post.caption || 'No caption'}</p>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="px-3 py-2 border-t border-gray-50 flex items-center justify-between flex-shrink-0 mt-auto">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(post.scheduledAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(post.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeletePost(post._id)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {filteredPosts.length === 0 && !loading && (
            <div className="text-center py-6 sm:py-12">
              <Calendar className="h-10 w-10 sm:h-16 sm:w-16 mx-auto mb-2 sm:mb-3 text-gray-400" />
              <p className="text-sm sm:text-base text-[#0F172A]">No scheduled posts found</p>
              <p className="text-xs sm:text-sm text-[#475569] mt-1 sm:mt-2">
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
