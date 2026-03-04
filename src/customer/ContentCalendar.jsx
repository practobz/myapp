import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  MessageSquare, CalendarIcon, Instagram, Facebook, Linkedin, Youtube, 
  AlertCircle, Eye, CheckCircle, Video, ExternalLink, Clock, Filter,
  LayoutGrid, List, Search, X, ChevronRight, FileText, TrendingUp,
  Send, Image, Play, Calendar, User, Sparkles, BarChart3
} from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'

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

  // Calculate statistics (must be before early returns)
  const stats = useMemo(() => {
    const total = sortedItems.length;
    const published = sortedItems.filter(item => item.status === 'published').length;
    const underReview = sortedItems.filter(item => item.status === 'under_review').length;
    const scheduled = sortedItems.filter(item => item.status === 'scheduled').length;
    const pending = sortedItems.filter(item => item.status === 'pending' || !item.status).length;
    return { total, published, underReview, scheduled, pending };
  }, [sortedItems]);

  // Search filter (must be before early returns)
  const displayedItems = useMemo(() => {
    if (!searchTerm.trim()) return sortedItems;
    const term = searchTerm.toLowerCase();
    return sortedItems.filter(item => 
      item.description?.toLowerCase().includes(term) ||
      item.title?.toLowerCase().includes(term) ||
      item.creator?.toLowerCase().includes(term)
    );
  }, [sortedItems, searchTerm]);

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

  // Helper to get media from item (supports multiple storage formats)
  const getItemMedia = (item) => {
    // Try submissionMedia first
    if (item.submissionMedia) return { imageUrl: item.submissionMedia, imageUrls: [item.submissionMedia] };
    // Try imageUrl
    if (item.imageUrl) return { imageUrl: item.imageUrl, imageUrls: item.imageUrls || [item.imageUrl] };
    // Try thumbnail
    if (item.thumbnail) return { imageUrl: item.thumbnail, imageUrls: [item.thumbnail] };
    // Try aiGeneratedImage
    if (item.aiGeneratedImage) return { imageUrl: item.aiGeneratedImage, imageUrls: [item.aiGeneratedImage] };
    // Try media array
    if (item.media?.length > 0) {
      const urls = item.media.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
      return { imageUrl: urls[0], imageUrls: urls };
    }
    // Try images array
    if (item.images?.length > 0) {
      const urls = item.images.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
      return { imageUrl: urls[0], imageUrls: urls };
    }
    // Try imageUrls array
    if (item.imageUrls?.length > 0) return { imageUrl: item.imageUrls[0], imageUrls: item.imageUrls };
    
    // Try to find media from submissions
    const matchingSub = submissions.find(sub =>
      (sub.item_id && sub.item_id === item.id) ||
      (sub.assignment_id && sub.assignment_id === item.id) ||
      (sub.item_name && sub.item_name === item.title)
    );
    if (matchingSub) {
      const subMedia = matchingSub.media || matchingSub.images || [];
      if (subMedia.length > 0) {
        const urls = subMedia.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
        if (urls.length > 0) return { imageUrl: urls[0], imageUrls: urls };
      }
    }
    
    return { imageUrl: null, imageUrls: [] };
  };

  // Add this function to handle item clicks
  const handleContentClick = (item) => {
    // Get the published posts from scheduledPosts collection
    const scheduledPublishedPosts = scheduledPosts.filter(post =>
      (post.item_id && post.item_id === item.id) ||
      (post.contentId && post.contentId === item.id) ||
      (post.item_name && post.item_name === item.title)
    );
    
    // Create virtual posts from manual publish data (from PublishManager)
    const manualPublishedPosts = [];
    if (item.published === true && item.publishedPlatforms && item.publishedPlatforms.length > 0) {
      // Check which platforms are already covered by scheduledPosts
      const scheduledPlatforms = new Set(scheduledPublishedPosts.map(p => p.platform?.toLowerCase()));
      
      // Get media from the item
      const itemMedia = getItemMedia(item);
      
      item.publishedPlatforms.forEach(platform => {
        // Only add if not already in scheduledPosts
        if (!scheduledPlatforms.has(platform?.toLowerCase())) {
          manualPublishedPosts.push({
            _id: `manual-${item.id}-${platform}`,
            platform: platform,
            pageName: `${platform} Post`,
            status: 'published',
            publishedAt: item.publishedAt,
            scheduledAt: item.publishedAt || item.date,
            caption: item.description || item.title,
            imageUrl: itemMedia.imageUrl,
            imageUrls: itemMedia.imageUrls.length > 0 ? itemMedia.imageUrls : null,
            notes: item.publishedNotes,
            isManualPublish: true
          });
        }
      });
    }
    
    // Combine both sources
    const allPublishedPosts = [...scheduledPublishedPosts, ...manualPublishedPosts];
    
    setSelectedContent({
      ...item,
      publishedPosts: allPublishedPosts
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Content Calendar</h1>
                <p className="text-sm text-gray-500">Manage and track your content schedule</p>
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition-all"
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* View Toggle */}
              <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500 mt-1">Total Items</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-emerald-600">{stats.published}</p>
                <p className="text-xs text-gray-500 mt-1">Published</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-50 to-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-amber-600">{stats.underReview}</p>
                <p className="text-xs text-gray-500 mt-1">Under Review</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p>
                <p className="text-xs text-gray-500 mt-1">Scheduled</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
          
          <div className="hidden lg:block bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-600">{stats.pending}</p>
                <p className="text-xs text-gray-500 mt-1">Pending</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-gray-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Selection Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-indigo-600" />
                  Calendars
                </h3>
              </div>
              <div className="p-3 max-h-96 overflow-y-auto">
                <button
                  onClick={() => setSelectedCalendarId(null)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-all ${
                    !selectedCalendarId 
                      ? 'bg-indigo-50 border-2 border-indigo-200 text-indigo-700' 
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">All Calendars</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      !selectedCalendarId ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {allItems.length}
                    </span>
                  </div>
                </button>
                
                <div className="space-y-2">
                  {calendars.map((calendar, idx) => {
                    const isSelected = (calendar._id || calendar.id) === selectedCalendarId;
                    const itemCount = calendar.contentItems?.length || 0;
                    return (
                      <button
                        key={calendar._id || calendar.id || idx}
                        onClick={() => setSelectedCalendarId(calendar._id || calendar.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-transparent hover:border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate pr-2">{calendar.name}</span>
                          <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                          }`}>
                            {itemCount}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All', count: stats.total },
                    { key: 'published', label: 'Published', count: stats.published, color: 'emerald' },
                    { key: 'under_review', label: 'Under Review', count: stats.underReview, color: 'amber' },
                    { key: 'scheduled', label: 'Scheduled', count: stats.scheduled, color: 'blue' },
                    { key: 'pending', label: 'Pending', count: stats.pending, color: 'gray' }
                  ].map(option => (
                    <button
                      key={option.key}
                      onClick={() => setStatusFilter(option.key)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === option.key
                          ? option.color === 'emerald' ? 'bg-emerald-600 text-white'
                          : option.color === 'amber' ? 'bg-amber-500 text-white'
                          : option.color === 'blue' ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        statusFilter === option.key ? 'bg-white/20' : 'bg-gray-200'
                      }`}>
                        {option.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Items */}
            {displayedItems.length > 0 ? (
              <div className={viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' 
                : 'space-y-3'
              }>
                {displayedItems.map((item) => {
                  const itemMedia = getItemMedia(item);
                  
                  return viewMode === 'grid' ? (
                    // Grid View Card
                    <div 
                      key={item.id}
                      onClick={() => handleContentClick(item)}
                      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
                    >
                      {/* Media Preview */}
                      <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200">
                        {itemMedia.imageUrl ? (
                          isVideoUrl(itemMedia.imageUrl) ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                              <Play className="h-10 w-10 text-white/80" />
                            </div>
                          ) : (
                            <img src={itemMedia.imageUrl} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Image className="h-10 w-10 text-gray-300" />
                          </div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
                            item.status === 'published' ? 'bg-emerald-500 text-white' :
                            item.status === 'under_review' ? 'bg-amber-500 text-white' :
                            item.status === 'scheduled' ? 'bg-blue-500 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {item.status === 'published' && <CheckCircle className="h-3 w-3" />}
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                        {item.status === 'published' && (
                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                            <Eye className="h-4 w-4 text-indigo-600" />
                          </div>
                        )}
                      </div>
                      
                      {/* Card Content */}
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          <span>{format(new Date(item.date), 'MMM dd, yyyy')}</span>
                        </div>
                        <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-3">{item.description || 'No description'}</p>
                        
                        {/* Platforms */}
                        {item.publishedPlatforms && item.publishedPlatforms.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-3">
                            {item.publishedPlatforms.slice(0, 4).map((platform, i) => (
                              <span key={i} className="text-gray-400">{getPlatformIcon(platform)}</span>
                            ))}
                          </div>
                        )}
                        
                        {item.creator && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">{item.creator}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // List View Card
                    <div 
                      key={item.id}
                      onClick={() => handleContentClick(item)}
                      className={`bg-white rounded-xl border transition-all cursor-pointer group ${
                        item.status === 'published' 
                          ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-md' 
                          : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
                      }`}
                    >
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          {/* Media Thumbnail */}
                          <div className="w-full sm:w-24 h-24 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex-shrink-0">
                            {itemMedia.imageUrl ? (
                              isVideoUrl(itemMedia.imageUrl) ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900 relative">
                                  <Play className="h-8 w-8 text-white/80" />
                                </div>
                              ) : (
                                <img src={itemMedia.imageUrl} alt="" className="w-full h-full object-cover" />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Image className="h-8 w-8 text-gray-300" />
                              </div>
                            )}
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                  item.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                                  item.status === 'under_review' ? 'bg-amber-100 text-amber-700' :
                                  item.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.status === 'published' && <CheckCircle className="h-3 w-3" />}
                                  {item.status === 'scheduled' && <Clock className="h-3 w-3" />}
                                  {item.status === 'under_review' && <Eye className="h-3 w-3" />}
                                  {getStatusLabel(item.status)}
                                </span>
                                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                                  <CalendarIcon className="h-3.5 w-3.5" />
                                  {format(new Date(item.date), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              
                              {item.status === 'published' && (
                                <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  <span className="font-medium">View Details</span>
                                </div>
                              )}
                            </div>
                            
                            <p className="text-gray-800 font-medium mb-3 line-clamp-2">{item.description || 'No description available'}</p>
                            
                            <div className="flex flex-wrap items-center gap-4">
                              {/* Published Platforms */}
                              {item.publishedPlatforms && item.publishedPlatforms.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Published on:</span>
                                  <div className="flex items-center gap-1.5">
                                    {item.publishedPlatforms.map((platform, i) => (
                                      <span key={i} className="text-gray-500">{getPlatformIcon(platform)}</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Creator */}
                              {item.creator && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <User className="h-3.5 w-3.5" />
                                  <span>{item.creator}</span>
                                </div>
                              )}
                              
                              {/* Comments */}
                              {item.commentCount > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  <span className="font-medium">{item.commentCount}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Arrow */}
                          <div className="hidden sm:flex items-center">
                            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No content found</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  {searchTerm 
                    ? `No content matches "${searchTerm}". Try a different search term.`
                    : 'No content items found in this calendar. Content will appear here once added.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Details Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedContent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Content Details</h3>
                    <p className="text-xs text-gray-500">View published post information</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedContent(null)}
                  className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Content Info Card */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-5 border border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <CalendarIcon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Date</p>
                        <p className="text-sm font-semibold text-gray-900">{format(new Date(selectedContent.date), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        selectedContent.status === 'published' ? 'bg-emerald-100' : 'bg-gray-100'
                      }`}>
                        {selectedContent.status === 'published' 
                          ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                          : <Clock className="h-5 w-5 text-gray-500" />
                        }
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Status</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          selectedContent.status === 'published' ? 'bg-emerald-100 text-emerald-700' : getStatusColor(selectedContent.status)
                        }`}>
                          {getStatusLabel(selectedContent.status)}
                        </span>
                      </div>
                    </div>
                    
                    {selectedContent.creator && (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Assigned to</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedContent.creator}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedContent.description && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                      <p className="text-sm text-gray-700">{selectedContent.description}</p>
                    </div>
                  )}
                </div>

                {/* Published Posts */}
                {selectedContent.publishedPosts && selectedContent.publishedPosts.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Send className="h-4 w-4 text-indigo-600" />
                        Published Posts
                      </h4>
                      <span className="text-xs font-medium px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                        {selectedContent.publishedPosts.length} post{selectedContent.publishedPosts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="space-y-4">
                      {selectedContent.publishedPosts.map((post, idx) => (
                        <div key={post._id || idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                          {/* Post Header */}
                          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                  post.platform === 'facebook' ? 'bg-blue-100' :
                                  post.platform === 'instagram' ? 'bg-pink-100' :
                                  post.platform === 'linkedin' ? 'bg-blue-100' :
                                  post.platform === 'youtube' ? 'bg-red-100' : 'bg-gray-100'
                                }`}>
                                  {getPlatformIcon(post.platform)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{post.pageName || post.channelName || 'Social Media Post'}</p>
                                  <p className="text-xs text-gray-500 capitalize">{post.platform}</p>
                                </div>
                              </div>
                              {getDefaultPostUrl(post) && (
                                <a
                                  href={getDefaultPostUrl(post)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                                >
                                  <span>View Post</span>
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                          
                          {/* Post Content */}
                          <div className="p-4">
                            {/* Media Display */}
                            {post.imageUrls && post.imageUrls.length > 1 ? (
                              <div className="mb-4">
                                <div className="grid grid-cols-3 gap-2">
                                  {post.imageUrls.slice(0, 6).map((url, mediaIdx) => (
                                    isVideoUrl(url) ? (
                                      <div key={mediaIdx} className="relative aspect-square bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                                        <Play className="h-8 w-8 text-white/80" />
                                        <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{mediaIdx + 1}</span>
                                      </div>
                                    ) : (
                                      <div key={mediaIdx} className="relative aspect-square overflow-hidden rounded-lg">
                                        <img
                                          src={url}
                                          alt={`Item ${mediaIdx + 1}`}
                                          className="w-full h-full object-cover"
                                        />
                                        <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{mediaIdx + 1}</span>
                                      </div>
                                    )
                                  ))}
                                  {post.imageUrls.length > 6 && (
                                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                      <span className="text-gray-600 font-semibold">+{post.imageUrls.length - 6}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : post.imageUrl && isVideoUrl(post.imageUrl) ? (
                              <div className="mb-4 rounded-lg overflow-hidden bg-gray-900">
                                <video
                                  src={post.imageUrl}
                                  controls
                                  className="w-full max-h-72 object-contain"
                                />
                              </div>
                            ) : post.imageUrl ? (
                              <div className="mb-4 rounded-lg overflow-hidden">
                                <img
                                  src={post.imageUrl}
                                  alt="Post content"
                                  className="w-full max-h-72 object-cover"
                                />
                              </div>
                            ) : null}

                            {/* Caption */}
                            {post.caption && (
                              <div className="mb-4">
                                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{post.caption}</p>
                              </div>
                            )}

                            {/* Post Meta */}
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Published: {new Date(post.scheduledAt || post.publishedAt).toLocaleString()}</span>
                              </div>
                              {post.postId && (
                                <span className="font-mono text-gray-400 text-xs">ID: {post.postId.substring(0, 12)}...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 mb-1">No Published Posts</h4>
                    <p className="text-sm text-gray-500">No published posts found for this content item.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedContent(null)}
                className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentCalendar;