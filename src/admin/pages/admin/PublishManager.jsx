import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, Clock, CheckCircle, XCircle, Loader2, Filter, 
  Search, ChevronDown, ChevronRight, ExternalLink, Image,
  Facebook, Instagram, Youtube, Linkedin, Twitter, Globe,
  Check, X, AlertCircle, RefreshCw, Users, User, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';

// Platform icons mapping
const PlatformIcon = ({ platform, size = 16 }) => {
  const iconProps = { size, className: 'inline-block' };
  switch (platform?.toLowerCase()) {
    case 'facebook': return <Facebook {...iconProps} className="text-blue-600" />;
    case 'instagram': return <Instagram {...iconProps} className="text-pink-500" />;
    case 'youtube': return <Youtube {...iconProps} className="text-red-600" />;
    case 'linkedin': return <Linkedin {...iconProps} className="text-blue-700" />;
    case 'twitter': return <Twitter {...iconProps} className="text-sky-500" />;
    default: return <Globe {...iconProps} className="text-gray-500" />;
  }
};

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { id: 'instagram', name: 'Instagram', color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { id: 'youtube', name: 'YouTube', color: 'bg-red-100 text-red-700 border-red-200' },
  { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'twitter', name: 'Twitter/X', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { id: 'other', name: 'Other', color: 'bg-gray-100 text-gray-700 border-gray-200' },
];

function PublishManager() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State
  const [calendars, setCalendars] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unpublished', 'published'
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCalendars, setExpandedCalendars] = useState(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [publishModal, setPublishModal] = useState(null); // { calendarId, item }
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [publishNotes, setPublishNotes] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, [currentUser, refreshKey]);

  const fetchData = async () => {
    if (!currentUser) return;
    setLoading(true);
    
    try {
      // Fetch calendars
      let calendarsUrl = `${process.env.REACT_APP_API_URL}/calendars`;
      
      // If admin, fetch only assigned customers' calendars
      if (currentUser.role === 'admin') {
        const customersRes = await fetch(
          `${process.env.REACT_APP_API_URL}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`
        );
        
        if (customersRes.ok) {
          const assignedCustomers = await customersRes.json();
          const customerIds = assignedCustomers.map(c => c._id);
          
          // Fetch all calendars and filter by customer
          const calendarsRes = await fetch(calendarsUrl);
          const allCalendars = await calendarsRes.json();
          const filteredCalendars = allCalendars.filter(cal => 
            customerIds.includes(cal.customerId)
          );
          
          // Add customer name to each calendar
          const calendarsWithCustomer = filteredCalendars.map(cal => ({
            ...cal,
            customerName: assignedCustomers.find(c => c._id === cal.customerId)?.name || 'Unknown Customer'
          }));
          
          setCalendars(calendarsWithCustomer);
        }
      } else {
        const calendarsRes = await fetch(calendarsUrl);
        const allCalendars = await calendarsRes.json();
        setCalendars(allCalendars);
      }

      // Fetch scheduled posts to check which items are published via the platform
      const postsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
      const posts = await postsRes.json();
      setScheduledPosts(Array.isArray(posts) ? posts : []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if item is published (either manually or via scheduled post)
  const isItemPublished = useCallback((item) => {
    // Check manual publish flag
    if (item.published === true) return true;
    
    // Check scheduled posts
    return scheduledPosts.some(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.item_name && post.item_name === item.title)) &&
      (post.status === 'published' || post.publishedAt)
    );
  }, [scheduledPosts]);

  // Get published platforms for an item
  const getPublishedPlatforms = useCallback((item) => {
    const platforms = new Set();
    
    // From manual publish
    if (item.publishedPlatforms && Array.isArray(item.publishedPlatforms)) {
      item.publishedPlatforms.forEach(p => platforms.add(p));
    }
    
    // From scheduled posts
    scheduledPosts
      .filter(post =>
        ((post.item_id && post.item_id === item.id) ||
         (post.contentId && post.contentId === item.id) ||
         (post.item_name && post.item_name === item.title)) &&
        (post.status === 'published' || post.publishedAt)
      )
      .forEach(post => {
        if (post.platform) platforms.add(post.platform);
      });
    
    return Array.from(platforms);
  }, [scheduledPosts]);

  // Process calendars with items
  const processedCalendars = useMemo(() => {
    return calendars.map(calendar => {
      const items = (calendar.contentItems || []).map(item => ({
        ...item,
        calendarId: calendar._id,
        calendarName: calendar.name,
        customerName: calendar.customerName || '',
        isPublished: isItemPublished(item),
        publishedPlatforms: getPublishedPlatforms(item)
      }));
      
      return {
        ...calendar,
        processedItems: items,
        publishedCount: items.filter(i => i.isPublished).length,
        totalCount: items.length
      };
    });
  }, [calendars, isItemPublished, getPublishedPlatforms]);

  // Group calendars by customer
  const customerGroups = useMemo(() => {
    const groups = {};
    
    processedCalendars.forEach(calendar => {
      const customerName = calendar.customerName || 'Unknown Customer';
      const customerId = calendar.customerId || 'unknown';
      
      if (!groups[customerId]) {
        groups[customerId] = {
          id: customerId,
          name: customerName,
          calendars: [],
          totalItems: 0,
          publishedItems: 0
        };
      }
      
      groups[customerId].calendars.push(calendar);
      groups[customerId].totalItems += calendar.totalCount;
      groups[customerId].publishedItems += calendar.publishedCount;
    });
    
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [processedCalendars]);

  // Filtered customer groups
  const filteredCustomerGroups = useMemo(() => {
    return customerGroups.map(customerGroup => {
      const filteredCalendars = customerGroup.calendars.map(calendar => {
        let items = calendar.processedItems;
        
        // Filter by publish status
        if (filter === 'published') {
          items = items.filter(i => i.isPublished);
        } else if (filter === 'unpublished') {
          items = items.filter(i => !i.isPublished);
        }
        
        // Search filter
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          items = items.filter(i => 
            (i.title && i.title.toLowerCase().includes(query)) ||
            (i.description && i.description.toLowerCase().includes(query)) ||
            (i.calendarName && i.calendarName.toLowerCase().includes(query)) ||
            (i.customerName && i.customerName.toLowerCase().includes(query))
          );
        }
        
        return { ...calendar, filteredItems: items };
      }).filter(cal => cal.filteredItems.length > 0);
      
      return {
        ...customerGroup,
        calendars: filteredCalendars,
        filteredTotalItems: filteredCalendars.reduce((sum, cal) => sum + cal.filteredItems.length, 0),
        filteredPublishedItems: filteredCalendars.reduce((sum, cal) => 
          sum + cal.filteredItems.filter(item => item.isPublished).length, 0
        )
      };
    }).filter(group => 
      (selectedCustomer === 'all' || group.id === selectedCustomer) && 
      group.calendars.length > 0
    );
  }, [customerGroups, filter, searchQuery, selectedCustomer]);

  // Toggle calendar expansion
  const toggleCalendar = (calendarId) => {
    setExpandedCalendars(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId);
      } else {
        newSet.add(calendarId);
      }
      return newSet;
    });
  };

  // Toggle customer expansion
  const toggleCustomer = (customerId) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // Generate customer initials
  const getCustomerInitials = (name) => {
    if (!name || name === 'Unknown Customer') return 'UK';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Generate customer color
  const getCustomerColor = (name) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Open publish modal for a single item
  const openPublishModal = (calendar, item) => {
    setPublishModal({ calendarId: calendar._id, item });
    setSelectedPlatforms(item.publishedPlatforms || []);
    setPublishNotes(item.publishedNotes || '');
  };

  // Close publish modal
  const closePublishModal = () => {
    setPublishModal(null);
    setSelectedPlatforms([]);
    setPublishNotes('');
  };

  // Toggle platform selection
  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(p => p !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  // Mark item as published
  const markAsPublished = async (calendarId, itemId, platforms, notes, published = true) => {
    setSaving(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/calendars/item/${calendarId}/mark-published`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            published,
            publishedPlatforms: platforms,
            publishedNotes: notes,
            publishedAt: new Date().toISOString()
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update publish status');
      }
      
      // Refresh data
      setRefreshKey(prev => prev + 1);
      closePublishModal();
      
    } catch (error) {
      console.error('Error marking item as published:', error);
      alert('Failed to update publish status. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Bulk mark as published
  const bulkMarkAsPublished = async (calendarId, itemIds, platforms) => {
    setSaving(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/calendars/item/${calendarId}/bulk-publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemIds,
            published: true,
            publishedPlatforms: platforms,
            publishedAt: new Date().toISOString()
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to bulk update publish status');
      }
      
      // Refresh data and clear selection
      setSelectedItems(new Set());
      setRefreshKey(prev => prev + 1);
      
    } catch (error) {
      console.error('Error bulk marking items as published:', error);
      alert('Failed to update publish status. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    let total = 0;
    let published = 0;
    let customers = customerGroups.length;
    let activeCustomers = 0;
    
    customerGroups.forEach(group => {
      total += group.totalItems;
      published += group.publishedItems;
      if (group.totalItems > 0) activeCustomers++;
    });
    
    return { 
      total, 
      published, 
      unpublished: total - published,
      customers,
      activeCustomers,
      publishRate: total > 0 ? Math.round((published / total) * 100) : 0
    };
  }, [customerGroups]);

  // Unique customers for filter dropdown
  const uniqueCustomers = useMemo(() => {
    return customerGroups.map(group => ({
      id: group.id,
      name: group.name,
      count: group.totalItems
    }));
  }, [customerGroups]);

  if (loading) {
    return (
      <AdminLayout title="Publish Manager">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading content calendars...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Publish Manager">
      <div className="space-y-6">
        {/* Header & Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Header Info */}
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Publish Manager</h1>
                <p className="text-sm text-gray-600 mt-0.5">
                  Track and manage content publishing across all customer accounts
                </p>
              </div>
            </div>
            
            {/* Action Button */}
            <button
              onClick={() => setRefreshKey(prev => prev + 1)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg text-sm font-medium transition-all shadow-sm hover:shadow-md"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mt-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
                  <div className="text-sm text-blue-600 font-medium">Total Content</div>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-700">{stats.published}</div>
                  <div className="text-sm text-green-600 font-medium">Published</div>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-700">{stats.unpublished}</div>
                  <div className="text-sm text-amber-600 font-medium">Pending</div>
                </div>
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-700">{stats.activeCustomers}</div>
                  <div className="text-sm text-purple-600 font-medium">Active Clients</div>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-teal-700">{stats.publishRate}%</div>
                  <div className="text-sm text-teal-600 font-medium">Publish Rate</div>
                </div>
                <BarChart3 className="h-8 w-8 text-teal-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search content, calendars, or customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Customer Filter */}
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-w-[140px]"
                >
                  <option value="all">All Customers</option>
                  {uniqueCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} ({customer.count})
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 min-w-[120px]"
                >
                  <option value="all">All Status</option>
                  <option value="unpublished">Pending</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Customer Groups & Content */}
        <div className="space-y-6">
          {filteredCustomerGroups.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <AlertCircle className="h-16 w-16 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No content found</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {searchQuery || filter !== 'all' || selectedCustomer !== 'all'
                  ? 'Try adjusting your filters or search criteria to find content'
                  : 'No customers or content calendars have been created yet'}
              </p>
            </div>
          ) : (
            filteredCustomerGroups.map(customerGroup => (
              <div key={customerGroup.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Customer Header */}
                <div className="border-b border-gray-100">
                  <button
                    onClick={() => toggleCustomer(customerGroup.id)}
                    className="w-full flex items-center justify-between p-6 hover:bg-gray-50/50 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Customer Avatar */}
                      <div className={`h-12 w-12 ${getCustomerColor(customerGroup.name)} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm`}>
                        {getCustomerInitials(customerGroup.name)}
                      </div>
                      
                      {/* Customer Info */}
                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-gray-900">{customerGroup.name}</h3>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                            {customerGroup.calendars.length} calendar{customerGroup.calendars.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            {customerGroup.filteredPublishedItems} published
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-amber-500" />
                            {customerGroup.filteredTotalItems - customerGroup.filteredPublishedItems} pending
                          </span>
                          <span className="text-gray-400">•</span>
                          <span>{customerGroup.filteredTotalItems} total items</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Expand/Collapse & Progress */}
                    <div className="flex items-center gap-4">
                      {/* Progress Bar */}
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-700 min-w-[60px]">
                          {customerGroup.filteredTotalItems > 0 
                            ? Math.round((customerGroup.filteredPublishedItems / customerGroup.filteredTotalItems) * 100)
                            : 0}%
                        </span>
                        <div className="w-32 h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-400 to-green-500 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${customerGroup.filteredTotalItems > 0 
                                ? (customerGroup.filteredPublishedItems / customerGroup.filteredTotalItems) * 100 
                                : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                      
                      {/* Chevron */}
                      {expandedCustomers.has(customerGroup.id) ? (
                        <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      )}
                    </div>
                  </button>
                </div>
                
                {/* Customer Content */}
                {expandedCustomers.has(customerGroup.id) && (
                  <div className="bg-gray-50/30">
                    {customerGroup.calendars.map(calendar => (
                      <div key={calendar._id} className="border-b border-gray-100 last:border-b-0">
                        {/* Calendar Header */}
                        <button
                          onClick={() => toggleCalendar(calendar._id)}
                          className="w-full flex items-center justify-between p-4 hover:bg-white/50 transition-colors group"
                        >
                          <div className="flex items-center gap-3">
                            {expandedCalendars.has(calendar._id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                            )}
                            <Calendar className="h-5 w-5 text-blue-500" />
                            <div className="text-left">
                              <div className="font-semibold text-gray-900">{calendar.name || 'Untitled Calendar'}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {calendar.filteredItems.length} item{calendar.filteredItems.length !== 1 ? 's' : ''} 
                                {(searchQuery || filter !== 'all') && (
                                  <span> (filtered from {calendar.totalCount})</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-sm font-medium text-gray-700">
                                {calendar.filteredItems.filter(i => i.isPublished).length}/{calendar.filteredItems.length}
                              </div>
                              <div className="text-xs text-gray-500">published</div>
                            </div>
                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ 
                                  width: `${calendar.filteredItems.length > 0 
                                    ? (calendar.filteredItems.filter(i => i.isPublished).length / calendar.filteredItems.length) * 100 
                                    : 0}%` 
                                }}
                              />
                            </div>
                          </div>
                        </button>
                        
                        {/* Calendar Items */}
                        {expandedCalendars.has(calendar._id) && (
                          <div className="bg-white border-t border-gray-200">
                            {calendar.filteredItems.map((item, index) => (
                              <div 
                                key={item.id || index}
                                className={`flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 hover:bg-blue-50/30 transition-all ${
                                  item.isPublished ? 'bg-green-50/40 border-green-100' : 'hover:shadow-sm'
                                }`}
                              >
                                <div className="flex items-center gap-4 flex-1 min-w-0">
                                  {/* Thumbnail */}
                                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                                    {item.imageUrl || item.thumbnail ? (
                                      <img 
                                        src={item.imageUrl || item.thumbnail} 
                                        alt="" 
                                        className="h-full w-full object-cover rounded-xl"
                                      />
                                    ) : (
                                      <Image className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                  
                                  {/* Content Info */}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-900 truncate">
                                        {item.title || item.description || 'Untitled Item'}
                                      </span>
                                      {item.isPublished && (
                                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-600 mt-1.5">
                                      {item.date && (
                                        <span className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md">
                                          <Clock className="h-3 w-3" />
                                          {new Date(item.date).toLocaleDateString()}
                                        </span>
                                      )}
                                      {item.publishedPlatforms.length > 0 && (
                                        <div className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md">
                                          {item.publishedPlatforms.slice(0, 3).map((platform, i) => (
                                            <PlatformIcon key={i} platform={platform} size={12} />
                                          ))}
                                          {item.publishedPlatforms.length > 3 && (
                                            <span className="text-gray-500 font-medium">+{item.publishedPlatforms.length - 3}</span>
                                          )}
                                        </div>
                                      )}
                                      {item.manuallyPublished && (
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md font-medium">
                                          Manual
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Action Button */}
                                <div className="flex items-center gap-2 ml-4">
                                  {item.isPublished ? (
                                    <button
                                      onClick={() => openPublishModal(calendar, item)}
                                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                      Published
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => openPublishModal(calendar, item)}
                                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm hover:shadow-md"
                                    >
                                      <Check className="h-4 w-4" />
                                      Mark Published
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Publish Modal */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {publishModal.item.isPublished ? 'Update Publish Status' : 'Mark as Published'}
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {publishModal.item.title || publishModal.item.description || 'Untitled Item'}
              </p>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 space-y-5">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Published On Platforms
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(platform => (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        selectedPlatforms.includes(platform.id)
                          ? `${platform.color} border-current`
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <PlatformIcon platform={platform.id} size={18} />
                      <span className="text-sm font-medium">{platform.name}</span>
                      {selectedPlatforms.includes(platform.id) && (
                        <Check className="h-4 w-4 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={publishNotes}
                  onChange={(e) => setPublishNotes(e.target.value)}
                  placeholder="Add any notes about this publish..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              {publishModal.item.isPublished && (
                <button
                  onClick={() => markAsPublished(
                    publishModal.calendarId, 
                    publishModal.item.id, 
                    [], 
                    '', 
                    false
                  )}
                  disabled={saving}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Mark Unpublished
                </button>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <button
                  onClick={closePublishModal}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => markAsPublished(
                    publishModal.calendarId, 
                    publishModal.item.id, 
                    selectedPlatforms, 
                    publishNotes
                  )}
                  disabled={saving || selectedPlatforms.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {publishModal.item.isPublished ? 'Update' : 'Mark Published'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default PublishManager;
