import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MessageSquare, Instagram, Facebook, Linkedin, Youtube, AlertCircle, Eye, CheckCircle } from 'lucide-react';

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
  if (!status) return '';
  switch (status) {
    case 'published':
      return 'Published';
    case 'waiting_input':
      return 'Waiting Input';
    default:
      return status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1);
  }
};

function ContentCalendar() {
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [calendars, setCalendars] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduledPosts, setScheduledPosts] = useState([]);

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
        const customerCalendars = allCalendars.filter(c => c.customerId === customerId);
        setCalendars(customerCalendars);

        // --- Fetch scheduled posts for this customer ---
        const postsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
        let postsData = await postsRes.json();
        if (!Array.isArray(postsData)) postsData = [];
        // Only posts for this customer
        const customerPosts = postsData.filter(p => p.customerId === customerId && p.status === 'published');
        setScheduledPosts(customerPosts);
        // --- End ---
      } catch (err) {
        setCustomer(null);
        setCalendars([]);
        setScheduledPosts([]);
      } finally {
        setLoading(false);
      }
    };

    if (customerId) {
      fetchCustomerAndCalendars();
    }
  }, [customerId]);

  // Helper: get published platforms for an item
  const getPublishedPlatformsForItem = (item) => {
    // Try to match by item_id, item_name, or contentId
    return scheduledPosts
      .filter(post =>
        (post.item_id && post.item_id === item.id) ||
        (post.contentId && post.contentId === item.id) ||
        (post.item_name && post.item_name === item.title)
      )
      .map(post => post.platform);
  };

  // Helper: check if item is published
  const isItemPublished = (item) => {
    return scheduledPosts.some(post =>
      (post.item_id && post.item_id === item.id) ||
      (post.contentId && post.contentId === item.id) ||
      (post.item_name && post.item_name === item.title)
    );
  };

  // Flatten all content items from all calendars for this customer
  let allItems = [];
  calendars.forEach(calendar => {
    if (Array.isArray(calendar.contentItems)) {
      calendar.contentItems.forEach(item => {
        // --- Override status if published in scheduledPosts ---
        const published = isItemPublished(item);
        allItems.push({
          ...item,
          calendarName: calendar.name || '',
          id: item.id || item._id || Math.random().toString(36).slice(2),
          creator: item.assignedToName || item.assignedTo || calendar.assignedToName || calendar.assignedTo || '',
          status: published ? 'published' : item.status,
          publishedPlatforms: published ? getPublishedPlatformsForItem(item) : []
        });
      });
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
    setSelectedContent(item);
  };

  return (
    <div className="min-h-screen bg-[#e6f2fb]">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Selection Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-md p-6 border border-[#0a2342]/10">
              <h3 className="text-lg font-semibold mb-4 text-[#0a2342]">Content Calendars</h3>
              <div className="space-y-2">
                {calendars.map((calendar, idx) => (
                  <button
                    key={calendar._id || idx}
                    onClick={() => {/* no-op, only one customer calendar is shown */}}
                    className="w-full text-left p-3 rounded-md bg-[#0a2342] text-white"
                  >
                    <div className="font-medium">{calendar.name}</div>
                    <div className="text-sm opacity-75">{calendar.contentItems?.length || 0} items</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-lg shadow-md p-6 border border-[#0a2342]/10">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#0a2342]">{customer.name}'s Content Calendar</h2>
                  <p className="text-[#0a2342]/70 text-sm mt-1">Manage your content schedule</p>
                </div>
                {/* Status Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all', label: 'All', color: 'bg-[#bae6fd] text-[#0a2342]' },
                    { key: 'published', label: 'Published', color: 'bg-green-100 text-green-800' },
                    { key: 'under_review', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
                    { key: 'scheduled', label: 'Scheduled', color: 'bg-[#7dd3fc] text-[#0a2342]' },
                    { key: 'waiting_input', label: 'Waiting Input', color: 'bg-orange-100 text-orange-800' },
                    { key: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' }
                  ].map(option => (
                    <button
                      key={option.key}
                      onClick={() => setStatusFilter(option.key)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors
                        ${statusFilter === option.key
                          ? `${option.color} border-[#0a2342]`
                          : `${option.color.replace('bg-', 'bg-opacity-50 bg-')} border-transparent hover:border-[#bae6fd]`
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
                    className={`border rounded-lg p-4 ${
                      item.status === 'published' ? 'cursor-pointer hover:bg-[#e6f2fb]' : ''
                    } transition-colors border-[#bae6fd]`}
                    onClick={() => handleContentClick(item)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-[#0a2342]/70">{format(new Date(item.date), 'MMM dd, yyyy')}</span>
                        {/* Published status with icon */}
                        {item.status === 'published' ? (
                          <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 bg-green-100 text-green-800">
                            <CheckCircle className="h-4 w-4" />
                            Published
                            {/* --- Show published platforms --- */}
                            {item.publishedPlatforms && item.publishedPlatforms.length > 0 && (
                              <span className="ml-2 text-xs text-[#38bdf8]">
                                on: {item.publishedPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center text-[#38bdf8]">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          <span>{item.commentCount || 0}</span>
                        </div>
                        {item.status === 'published' && (
                          <Eye className="h-4 w-4 text-[#0a2342]/40" />
                        )}
                      </div>
                    </div>
                    <p className="text-[#0a2342] mb-3">{item.description}</p>
                    
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
        <div className="fixed inset-0 bg-[#0a2342]/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-[#0a2342]">Content Details</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#38bdf8]">Date</p>
                  <p className="font-medium text-[#0a2342]">{format(new Date(selectedContent.date), 'MMMM dd, yyyy')}</p>
                </div>
                
                <div>
                  <p className="text-sm text-[#38bdf8]">Description</p>
                  <p className="font-medium text-[#0a2342]">{selectedContent.description}</p>
                </div>

                <div>
                  <p className="text-sm text-[#38bdf8]">Published On</p>
                  <div className="flex items-center space-x-3 mt-2">
                    {(selectedContent.publishedPlatforms || selectedContent.platforms || []).map((platform) => (
                      <div key={platform} className="flex items-center space-x-2 bg-[#bae6fd] px-3 py-2 rounded-md">
                        {getPlatformIcon(platform)}
                        <span className="capitalize text-[#0a2342]">{platform}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedContent(null)}
                  className="px-4 py-2 bg-[#bae6fd] text-[#0a2342] rounded-md hover:bg-[#38bdf8]/20"
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