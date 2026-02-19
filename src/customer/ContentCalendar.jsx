import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MessageSquare,CalendarIcon, Instagram, Facebook, Linkedin, Youtube, AlertCircle, Eye, CheckCircle, Video, ExternalLink } from 'lucide-react';
// Helper to get default post URL if missing
const getDefaultPostUrl = (post) => {
  if (post.postUrl) return post.postUrl;
  if (!post.platform || !post.postId) return null;
  switch (post.platform) {
    case 'instagram':
      return `https://www.instagram.com/p/${post.postId}`;
    case 'facebook':
      return `https://www.facebook.com/${post.postId}`;
    case 'linkedin':
      return `https://www.linkedin.com/feed/update/${post.postId}`;
    case 'youtube':
      return `https://www.youtube.com/watch?v=${post.postId}`;
    default:
      return null;
  }
};

// Move these helper functions to the top, before ContentCalendar function
const getPlatformIcon = (platform) => {
  switch (platform) {
    case 'instagram':
      return <Instagram className="h-5 w-5 text-pink-600" />;
    case 'facebook':
      return <Facebook className="h-5 w-5 text-blue-600" />;
    case 'linkedin':
      return <Linkedin className="h-5 w-5 text-blue-700" />;
    case 'youtube':
      return <Youtube className="h-5 w-5 text-red-600" />;
    default:
      return null;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-800';
    case 'published':
      return 'bg-green-100 text-green-800';
    case 'under_review':
      return 'bg-yellow-100 text-yellow-800';
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'scheduled':
      return 'bg-blue-100 text-blue-800';
    case 'waiting_input':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status) => {
  if (!status) return 'Pending';
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'published':
      return 'Published';
    case 'under_review':
      return 'Under Review';
    case 'scheduled':
      return 'Scheduled';
    case 'waiting_input':
      return 'Waiting Input';
    default:
      return status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1);
  }
};

const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const ext = url.split('.').pop().toLowerCase();
  return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
};

function ContentCalendar() {
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // Get logged-in customer info (assume it's stored in localStorage as 'user')
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }
  const customerId = user?.id || user?._id;
  const customerName = user?.name;

  useEffect(() => {
    const fetchCustomerAndCalendars = async () => {
      setLoading(true);
      try {
        // Fetch customer details
        const customerRes = await fetch(`${process.env.REACT_APP_API_URL}/customer/${customerId}`);
        const customerData = await customerRes.json();
        setCustomer(customerData);

        // Fetch all calendars, then filter by customerId
        const calendarsRes = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const allCalendars = await calendarsRes.json();
        const customerCalendars = allCalendars
          .filter(c => c.customerId === customerId)
          .sort((a, b) => {
            // Sort by createdAt date (most recent first)
            const dateA = new Date(a.createdAt || a._id || 0);
            const dateB = new Date(b.createdAt || b._id || 0);
            return dateB - dateA;
          });
        setCalendars(customerCalendars);

        // --- Fetch scheduled posts for this customer ---
        const postsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
        let postsData = await postsRes.json();
        if (!Array.isArray(postsData)) postsData = [];
        // Filter posts for this customer
        const customerPosts = postsData.filter(p => p.customerId === customerId);
        setScheduledPosts(customerPosts);
        
        // --- Fetch content submissions for this customer ---
        const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
        let submissionsData = await submissionsRes.json();
        if (!Array.isArray(submissionsData)) submissionsData = [];
        // Filter submissions for this customer
        const customerSubmissions = submissionsData.filter(s => 
          s.customer_id === customerId || 
          s.customer_email === user?.email
        );
        setSubmissions(customerSubmissions);
        // --- End ---
      } catch (err) {
        setCustomer(null);
        setCalendars([]);
        setScheduledPosts([]);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomerAndCalendars();
    }
  }, [customerId]);

  // Helper: check if content has been submitted for an item
  const hasContentSubmitted = (item) => {
    return submissions.some(sub =>
      (sub.item_id && sub.item_id === item.id) ||
      (sub.assignment_id && sub.assignment_id === item.id) ||
      (sub.item_name && sub.item_name === item.title)
    );
  };

  // Helper: check if item is scheduled (in scheduledPosts but not published)
  const isItemScheduled = (item) => {
    return scheduledPosts.some(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.assignmentId && post.assignmentId === item.id) ||
       (post.item_name && post.item_name === item.title)) &&
      (post.status === 'scheduled' || post.status === 'pending' || (post.scheduledDate && !post.publishedAt))
    );
  };

  // Helper: get published platforms for an item
  const getPublishedPlatformsForItem = (item) => {
    // Try to match by item_id, item_name, or contentId
    return scheduledPosts
      .filter(post =>
        ((post.item_id && post.item_id === item.id) ||
         (post.contentId && post.contentId === item.id) ||
         (post.item_name && post.item_name === item.title)) &&
        (post.status === 'published' || post.publishedAt)
      )
      .map(post => post.platform);
  };

  // Helper: check if item is published
  const isItemPublished = (item) => {
    return scheduledPosts.some(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.item_name && post.item_name === item.title)) &&
      (post.status === 'published' || post.publishedAt)
    );
  };

  // Helper: determine the correct status for an item
  const getItemStatus = (item) => {
    // Priority: check item.published field first, then published > scheduled > under_review > pending
    if (item.published === true) return 'published';
    if (isItemPublished(item)) return 'published';
    if (isItemScheduled(item)) return 'scheduled';
    if (hasContentSubmitted(item)) return 'under_review';
    return item.status || 'pending';
  };

  // Flatten all content items from all calendars for this customer
  let allItems = [];
  calendars.forEach(calendar => {
    if (Array.isArray(calendar.contentItems)) {
      // Only add items from selected calendar (or all if none selected)
      if (!selectedCalendarId || calendar._id === selectedCalendarId || calendar.id === selectedCalendarId) {
        calendar.contentItems.forEach(item => {
          // Determine the correct status based on item.published field, submissions and scheduled posts
          const itemStatus = getItemStatus(item);
          const published = item.published === true || isItemPublished(item);
          
          allItems.push({
            ...item,
            calendarName: calendar.name || '',
            id: item.id || item._id || Math.random().toString(36).slice(2),
            creator: item.assignedToName || item.assignedTo || calendar.assignedToName || calendar.assignedTo || '',
            status: itemStatus,
            publishedPlatforms: published ? (item.publishedPlatforms || getPublishedPlatformsForItem(item)) : []
          });
        });
      }
    }
  });

  // Only show content for this customer, filter and sort as before
  const filteredItems = statusFilter === 'all'
    ? allItems
    : allItems.filter(item => item.status === statusFilter);

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (statusFilter === 'all') return 0;
    if (a.status === statusFilter && b.status !== statusFilter) return -1;
    if (a.status !== statusFilter && b.status === statusFilter) return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Customer not found.
      </div>
    );
  }

  // Add this function to handle item clicks
  const handleContentClick = (item) => {
    // Get the published posts for this item
    const publishedPosts = scheduledPosts.filter(post =>
      (post.item_id && post.item_id === item.id) ||
      (post.contentId && post.contentId === item.id) ||
      (post.item_name && post.item_name === item.title)
    );
    
    setSelectedContent({
      ...item,
      publishedPosts: publishedPosts
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Content */}
      <div className="sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Selection Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-xl shadow-md p-6 sm:border sm:border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-indigo-600" />
                Content Calendars
              </h3>
              <div className="space-y-2">
                {calendars.map((calendar, idx) => {
                  const isSelected = (calendar._id || calendar.id) === selectedCalendarId;
                  return (
                    <button
                      key={calendar._id || calendar.id || idx}
                      onClick={() => setSelectedCalendarId(calendar._id || calendar.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all shadow-md hover:shadow-lg ${isSelected ? 'bg-gradient-to-r from-indigo-700 to-blue-700 text-white' : 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-700 hover:to-blue-700'}`}
                    >
                      <div className="font-semibold">{calendar.name}</div>
                      <div className="text-sm opacity-90 mt-1">{calendar.contentItems?.length || 0} items</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-xl shadow-md p-6 sm:border sm:border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">{customer.name}'s Content Calendar</h2>
                  <p className="text-slate-600 text-sm mt-1">Manage your content schedule</p>
                </div>
                {/* Status Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'All', color: 'from-slate-100 to-blue-100', textColor: 'text-slate-700', activeColor: 'from-indigo-600 to-blue-600', activeText: 'text-white' },
                      { key: 'published', label: 'Published', color: 'from-emerald-100 to-green-100', textColor: 'text-emerald-700', activeColor: 'from-emerald-600 to-green-600', activeText: 'text-white' },
                      { key: 'under_review', label: 'Under Review', color: 'from-amber-100 to-yellow-100', textColor: 'text-amber-700', activeColor: 'from-amber-600 to-yellow-600', activeText: 'text-white' },
                      { key: 'scheduled', label: 'Scheduled', color: 'from-blue-100 to-cyan-100', textColor: 'text-blue-700', activeColor: 'from-blue-600 to-cyan-600', activeText: 'text-white' }
                    ].map(option => (
                      <button
                        key={option.key}
                        onClick={() => setStatusFilter(option.key)}
                        className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md
                          ${statusFilter === option.key
                            ? `bg-gradient-to-r ${option.activeColor} ${option.activeText} border border-transparent`
                            : `bg-gradient-to-r ${option.color} ${option.textColor} border border-transparent hover:scale-105`
                          }`}
                      >
                        {option.label}
                      </button>
                    ))}
                </div>
              </div>
              
              <div className="space-y-4">
                {sortedItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`sm:border-2 rounded-xl p-5 transition-all duration-200 ${
                      item.status === 'published' ? 'cursor-pointer hover:shadow-lg sm:hover:border-indigo-300 bg-gradient-to-r from-white to-blue-50/30' : 'bg-white'
                    } sm:border-slate-200 sm:hover:border-indigo-200`}
                    onClick={() => handleContentClick(item)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-600 font-medium">{format(new Date(item.date), 'MMM dd, yyyy')}</span>
                        {/* Published status with icon */}
                        {item.status === 'published' ? (
                          <span className="px-4 py-1.5 rounded-full text-sm font-semibold flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md">
                            <CheckCircle className="h-4 w-4" />
                            Published
                            {/* --- Show published platforms --- */}
                            {item.publishedPlatforms && item.publishedPlatforms.length > 0 && (
                              <span className="ml-1 text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                {item.publishedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
                            <MessageSquare className="h-4 w-4" />
                            <span className="font-semibold">{item.commentCount || 0}</span>
                          </div>
                      </div>
                    </div>
                    <p className="text-slate-700 mb-3 font-medium break-words line-clamp-2">{item.description}</p>
                    
                    {/* Assigned Creator */}
                    {item.creator && (
                      <div className="text-xs text-[#38bdf8] mb-2">
                        Assigned to: <span className="font-semibold">{item.creator}</span>
                      </div>
                    )}

                    {/* Platform Icons */}
                    <div className="flex items-center space-x-2">
                      {(item.platforms || []).map((platform) => (
                        <div key={platform} className="text-[#0a2342]/60">
                          {getPlatformIcon(platform)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {sortedItems.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-[#38bdf8] mx-auto mb-3" />
                    <p className="text-[#0a2342]/70">No content items found in this calendar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Details Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-[#0a2342]/70 flex items-center justify-center p-4 z-50" onClick={() => setSelectedContent(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-[#0a2342]">Published Content Details</h3>
                <button
                  onClick={() => setSelectedContent(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-[#38bdf8] font-semibold">Date</p>
                      <p className="font-medium text-[#0a2342]">{format(new Date(selectedContent.date), 'MMMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-sm text-[#38bdf8] font-semibold">Status</p>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedContent.status)}`}>
                        {getStatusLabel(selectedContent.status)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-[#38bdf8] font-semibold mb-1">Description</p>
                    <p className="font-medium text-[#0a2342]">{selectedContent.description}</p>
                  </div>
                  {selectedContent.creator && (
                    <div className="mt-3">
                      <p className="text-sm text-[#38bdf8] font-semibold">Assigned to</p>
                      <p className="font-medium text-[#0a2342]">{selectedContent.creator}</p>
                    </div>
                  )}
                </div>

                {selectedContent.publishedPosts && selectedContent.publishedPosts.length > 0 ? (
                  <div>
                    <h4 className="text-lg font-semibold text-[#0a2342] mb-4">Published Posts ({selectedContent.publishedPosts.length})</h4>
                    <div className="space-y-4">
                      {selectedContent.publishedPosts.map((post, idx) => (
                        <div key={post._id || idx} className="sm:border-2 sm:border-slate-200 rounded-lg p-4 bg-white sm:hover:border-indigo-300 transition-all">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              {getPlatformIcon(post.platform)}
                              <div>
                                <p className="font-semibold text-[#0a2342]">{post.pageName || post.channelName || 'Social Media Post'}</p>
                                <p className="text-sm text-gray-600 capitalize">{post.platform}</p>
                              </div>
                            </div>
                            {getDefaultPostUrl(post) && (
                              <a
                                href={getDefaultPostUrl(post)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
                              >
                                <span className="text-sm font-semibold">View on {post.platform}</span>
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                          </div>

                          {/* Media Display */}
                          {post.imageUrls && post.imageUrls.length > 1 ? (
                            <div className="mb-3">
                              <div className="grid grid-cols-3 gap-2">
                                {post.imageUrls.slice(0, 6).map((url, mediaIdx) => (
                                  isVideoUrl(url) ? (
                                    <div key={mediaIdx} className="relative h-32 bg-gray-800 rounded-lg flex items-center justify-center">
                                      <Video className="h-8 w-8 text-white" />
                                      <span className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">{mediaIdx + 1}</span>
                                    </div>
                                  ) : (
                                    <div key={mediaIdx} className="relative">
                                      <img
                                        src={url}
                                        alt={`Item ${mediaIdx + 1}`}
                                        className="w-full h-32 object-cover rounded-lg"
                                      />
                                      <span className="absolute top-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">{mediaIdx + 1}</span>
                                    </div>
                                  )
                                ))}
                                {post.imageUrls.length > 6 && (
                                  <div className="h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                                    <span className="text-gray-600 text-lg font-semibold">+{post.imageUrls.length - 6}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : post.imageUrl && isVideoUrl(post.imageUrl) ? (
                            <video
                              src={post.imageUrl}
                              controls
                              className="w-full h-64 object-cover rounded-lg mb-3"
                              style={{ background: '#f3f4f6' }}
                            />
                          ) : post.imageUrl ? (
                            <img
                              src={post.imageUrl}
                              alt="Post content"
                              className="w-full h-64 object-cover rounded-lg mb-3"
                            />
                          ) : null}

                          {/* Caption */}
                          {post.caption && (
                            <div className="mb-3">
                              <p className="text-sm text-gray-700 bg-slate-50 p-3 rounded-lg">{post.caption}</p>
                            </div>
                          )}

                          {/* Post Stats */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-2">
                              <CalendarIcon className="h-3 w-3" />
                              <span>Published: {new Date(post.scheduledAt).toLocaleString()}</span>
                            </div>
                            {post.postId && (
                              <span className="text-gray-400">Post ID: {post.postId.substring(0, 15)}...</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50 rounded-lg">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No published posts found for this content item.</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedContent(null)}
                  className="px-6 py-2 bg-gradient-to-r from-slate-600 to-gray-600 text-white rounded-lg hover:from-slate-700 hover:to-gray-700 transition-all shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentCalendar;