import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Facebook, Instagram, Image, Send, Eye, Edit, Trash2, CheckCircle, XCircle, Loader2, Plus, Filter, ArrowLeft, User, ChevronDown, ChevronRight, Users } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' or 'list'
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());

  // Fetch scheduled posts on component mount
  useEffect(() => {
    fetchScheduledPosts();
    fetchCustomers(); // Fetch customer details for name lookup
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

  const fetchScheduledPosts = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      console.error('Admin authentication required');
      setScheduledPosts([]);
      return;
    }

    setLoading(true);
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

  // Group posts by customer
  const groupedPosts = filteredPosts.reduce((groups, post) => {
    const customerId = post.customerId || post.userId || 'unknown';
    if (!groups[customerId]) {
      groups[customerId] = [];
    }
    groups[customerId].push(post);
    return groups;
  }, {});

  // Sort customers by number of posts (descending)
  const sortedCustomerIds = Object.keys(groupedPosts).sort((a, b) => {
    return groupedPosts[b].length - groupedPosts[a].length;
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

  const expandAllCustomers = () => {
    setExpandedCustomers(new Set(sortedCustomerIds));
  };

  const collapseAllCustomers = () => {
    setExpandedCustomers(new Set());
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
    <AdminLayout>
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
                  <p className="text-gray-600 mt-1">View and manage scheduled posts for your assigned customers</p>
                </div>
              </div>
              
              {/* Remove Test Scheduler button */}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Filters and View Mode Toggle */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 mb-6">
            {/* Status Filters */}
            <div className="flex items-center space-x-4">
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

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-gray-700">View:</span>
              <div className="flex bg-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grouped')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'grouped'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Users className="h-4 w-4 inline mr-1" />
                  Grouped
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  List
                </button>
              </div>
            </div>
          </div>

          {/* Add Customer Overview Header */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200/50">
              <h2 className="text-xl font-bold text-gray-900">Customer Overview</h2>
              <p className="text-sm text-gray-600 mt-1">Track content schedules and deadlines</p>
            </div>
          </div>

          {/* Expand/Collapse All (only in grouped mode) */}
          {viewMode === 'grouped' && sortedCustomerIds.length > 0 && (
            <div className="flex items-center space-x-2 mb-4">
              <button
                onClick={expandAllCustomers}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAllCustomers}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Collapse All
              </button>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : viewMode === 'grouped' ? (
            /* Grouped View */
            <div className="space-y-6">
              {sortedCustomerIds.map(customerId => {
                const customerPosts = groupedPosts[customerId];
                const customerInfo = getCustomerDisplayInfo(customerPosts[0]);
                const summary = getCustomerSummary(customerPosts);
                const isExpanded = expandedCustomers.has(customerId);

                return (
                  <div key={customerId} className="bg-white rounded-lg shadow-sm border">
                    {/* Customer Header */}
                    <div 
                      className="p-6 border-b cursor-pointer hover:bg-gray-50 transition-colors"
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
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {customerInfo?.name || 'Unknown Customer'}
                            </h3>
                            <p className="text-sm text-gray-600">
                              ID: {customerInfo?.id || customerId}
                            </p>
                          </div>
                        </div>
                        
                        {/* Summary Stats */}
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
                            <div className="text-xs text-gray-500">Total Posts</div>
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

                              <div className="flex items-center justify-end">
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
                    className="bg-white rounded-lg shadow-sm border p-6 flex flex-col"
                    style={{ height: '400px' }} // <-- static height for card
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

                      {/* Customer Information */}
                      {customerInfo && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-blue-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-blue-900 truncate">
                                {customerInfo.name}
                              </p>
                              <p className="text-xs text-blue-600 truncate">
                                ID: {customerInfo.id}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Show a fallback if no customer info is available */}
                      {!customerInfo && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
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
                        <button
                          onClick={() => handleDeletePost(post._id)}
                          className="text-red-600 hover:text-red-800 p-1"
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
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No scheduled posts found for your assigned customers</p>
              <p className="text-sm text-gray-400 mt-2">
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
