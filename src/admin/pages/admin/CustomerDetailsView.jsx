import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AdminLayout from '../../components/layout/AdminLayout';
import ContentItemModal from '../../components/modals/ContentItemModal';
import ContentCalendarModal from '../../components/modals/ContentCalendarModal';
import AssignCreatorModal from '../../components/modals/AssignCreatorModal';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Plus,
  AlertCircle,
  Building,
  Hash,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  MoreVertical,
  Upload,
  CheckCircle,
  X,
  Clock
} from 'lucide-react';

// Status configuration helper
const getStatusConfig = (status) => {
  const configs = {
    published: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    approved: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    under_review: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    pending: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  };
  return configs[status] || configs.pending;
};

// Memoized info item component for performance
const InfoItem = memo(({ icon: Icon, iconBg, iconColor, label, value, mono }) => (
  <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
    <div className={`p-1.5 ${iconBg} rounded-md flex-shrink-0`}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-400 uppercase">{label}</p>
      <p className={`text-sm text-gray-900 font-medium truncate ${mono ? 'font-mono' : ''}`}>
        {value || 'N/A'}
      </p>
    </div>
  </div>
));

InfoItem.displayName = 'InfoItem';

// Memoized content item component
const ContentItemCard = memo(({ item, status, statusConfig, formatDate, onTogglePublished, onEdit, onDelete, onUpload, isPublished, calendarId, index }) => (
  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="h-9 w-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        {item.title && <p className="text-sm font-medium text-blue-800 truncate">{item.title}</p>}
        <p className="text-sm text-gray-900 truncate">{item.description || 'Untitled'}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Due: {formatDate(item.date)}
          </p>
          {item.type && (
            <>
              {(Array.isArray(item.type) ? item.type : 
                (typeof item.type === 'string' ? item.type.split(',').map(p => p.trim()) : [item.type])
              ).map((platform, idx) => (
                <span 
                  key={idx}
                  className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize"
                >
                  {platform}
                </span>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-1 ml-2">
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} hidden sm:inline-flex`}>
        {status.replace('_', ' ')}
      </span>
      <button
        className={`p-1.5 rounded transition-colors touch-manipulation ${isPublished ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
        onClick={(e) => { e.stopPropagation(); onTogglePublished(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePublished(); }}
        title={isPublished ? 'Mark as unpublished' : 'Mark as published'}
      >
        <CheckCircle className="h-3.5 w-3.5" />
      </button>
      <button
        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors touch-manipulation"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
        title="Edit"
      >
        <Edit className="h-3.5 w-3.5" />
      </button>
      <button
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors touch-manipulation"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button
        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors touch-manipulation"
        onClick={(e) => { e.stopPropagation(); onUpload(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onUpload(); }}
        title="Upload"
      >
        <Upload className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
));
ContentItemCard.displayName = 'ContentItemCard';

function CustomerDetailsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditCalendarModalOpen, setIsEditCalendarModalOpen] = useState(false);
  const [calendarToEdit, setCalendarToEdit] = useState(null);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedCalendars, setExpandedCalendars] = useState(new Set());
  const [mobileMenuCalendar, setMobileMenuCalendar] = useState(null);
  const [scheduledPosts, setScheduledPosts] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL;

  // Memoize format functions
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' HH:mm");
    } catch {
      return 'Invalid';
    }
  }, []);

  const formatSimpleDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return 'Invalid';
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchCustomer();
      fetchCalendars();
      fetchCreators();
      fetchScheduledPosts();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/customer/${id}`);
      if (!response.ok) throw new Error('Failed to fetch customer');
      const data = await response.json();
      setCustomer(data);
    } catch (err) {
      setError('Failed to load customer details');
      console.error('Error fetching customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendars = async () => {
    try {
      const response = await fetch(`${API_URL}/calendars`);
      if (!response.ok) throw new Error('Failed to fetch calendars');
      const allCalendars = await response.json();
      
      // Filter calendars for this customer
      const customerCalendars = allCalendars.filter(calendar => calendar.customerId === id);
      setCalendars(customerCalendars);
    } catch (err) {
      console.error('Error fetching calendars:', err);
      setCalendars([]);
    }
  };

  // Fetch content creators for dropdown
  const fetchCreators = async () => {
    try {
      const response = await fetch(`${API_URL}/users?role=content_creator`);
      if (!response.ok) throw new Error('Failed to fetch content creators');
      const data = await response.json();
      setCreators(Array.isArray(data) ? data : (data.creators || []));
    } catch (err) {
      setCreators([]);
    }
  };

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scheduled-posts`);
      if (response.ok) {
        const data = await response.json();
        setScheduledPosts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      setScheduledPosts([]);
    }
  };

  // Check if item is published (manual or via scheduled post)
  const isItemPublished = useCallback((item) => {
    // Check manual publish flag
    if (item.published === true) return true;
    // Check scheduled posts
    return scheduledPosts.some(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.item_name && post.item_name === (item.title || item.description))) &&
      (post.status === 'published' || post.publishedAt)
    );
  }, [scheduledPosts]);

  // Check if all items in a calendar are published
  const isCalendarPublished = useCallback((calendar) => {
    if (!calendar.contentItems || calendar.contentItems.length === 0) return false;
    return calendar.contentItems.every(item => isItemPublished(item));
  }, [isItemPublished]);

  // Get item status with published check
  const getItemStatus = useCallback((item) => {
    if (isItemPublished(item)) return 'published';
    return item.status || 'pending';
  }, [isItemPublished]);

  // Get published count for a calendar
  const getCalendarStats = useCallback((calendar) => {
    const total = calendar.contentItems?.length || 0;
    const published = calendar.contentItems?.filter(item => isItemPublished(item)).length || 0;
    const progressPercent = total > 0 ? Math.round((published / total) * 100) : 0;
    return { total, published, progressPercent };
  }, [isItemPublished]);

  // Overall stats for all calendars
  const overallStats = useMemo(() => {
    let totalItems = 0, publishedItems = 0;
    calendars.forEach(cal => {
      cal.contentItems?.forEach(item => {
        totalItems++;
        if (isItemPublished(item)) publishedItems++;
      });
    });
    return { 
      totalCalendars: calendars.length,
      totalItems, 
      publishedItems, 
      pendingItems: totalItems - publishedItems,
      completionRate: totalItems > 0 ? Math.round((publishedItems / totalItems) * 100) : 0
    };
  }, [calendars, isItemPublished]);

  const handleCreateCalendar = async (calendarData) => {
    try {
      const response = await fetch(`${API_URL}/calendars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: id,
          name: calendarData.name,
          description: calendarData.description,
          assignedTo: calendarData.assignedTo,
          contentItems: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to create calendar');
      fetchCalendars();
    } catch (err) {
      console.error('Error creating calendar:', err);
    }
  };

  const handleAddContentItem = async (item) => {
    if (!selectedCalendar) return;

    try {
      // Try to fetch by _id, fallback to customerId if not found
      let calendar = null;
      let calendarRes = await fetch(`${API_URL}/calendars/${selectedCalendar._id}`);
      if (calendarRes.ok) {
        calendar = await calendarRes.json();
      } else {
        // fallback: try to fetch all calendars for this customer and find by _id
        const allRes = await fetch(`${API_URL}/calendars`);
        if (allRes.ok) {
          const allCalendars = await allRes.json();
          calendar = allCalendars.find(c => c._id === selectedCalendar._id);
        }
      }
      if (!calendar || !calendar._id) {
        throw new Error('Calendar not found');
      }

      const updatedContentItems = [...(calendar.contentItems || []), item];

      const response = await fetch(`${API_URL}/calendars/${calendar._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calendar,
          contentItems: updatedContentItems,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to add content item');
      fetchCalendars();
    } catch (err) {
      console.error('Error adding content item:', err);
    }
  };

  const handleAssignCreator = async (creator) => {
    if (!selectedCalendar) return;

    try {
      const calendar = calendars.find(c => c._id === selectedCalendar._id);
      
      const response = await fetch(`${API_URL}/calendars/${selectedCalendar._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calendar,
          assignedTo: creator.email,
          assignedToName: creator.name,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to assign creator');
      fetchCalendars();
    } catch (err) {
      console.error('Error assigning creator:', err);
    }
  };

  const toggleCalendarExpansion = (calendarId) => {
    const newExpanded = new Set(expandedCalendars);
    if (newExpanded.has(calendarId)) {
      newExpanded.delete(calendarId);
    } else {
      newExpanded.add(calendarId);
    }
    setExpandedCalendars(newExpanded);
  };

  // Mobile menu handlers
  const openMobileMenu = useCallback((calendar) => {
    setMobileMenuCalendar(calendar);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuCalendar(null);
  }, []);

  // Edit content item handler
  const handleEditItem = (item, calendarId) => {
    setSelectedItem({
      ...item,
      _calendarId: calendarId,
      originalDate: item.date,
      originalDescription: item.description
    });
    setIsEditModalOpen(true);
  };

  // Update content item handler
  const handleUpdateItem = async (updatedItem) => {
    try {
      const {
        _calendarId,
        date,
        description,
        originalDate,
        originalDescription,
        type,
        status,
        title,
        assignedTo,
        assignedToName
      } = updatedItem;

      if (!_calendarId || !originalDate || !originalDescription) return;

      // Fetch the latest calendar to get all items
      const calendarRes = await fetch(`${API_URL}/calendars/${_calendarId}`);
      let calendar = null;
      if (calendarRes.ok) {
        calendar = await calendarRes.json();
      } else {
        // fallback: try to fetch all calendars and find by _id
        const allRes = await fetch(`${API_URL}/calendars`);
        if (allRes.ok) {
          const allCalendars = await allRes.json();
          calendar = allCalendars.find(c => c._id === _calendarId);
        }
      }
      if (!calendar || !calendar._id) {
        throw new Error('Calendar not found');
      }

      // Find and update the content item in the array
      const updatedContentItems = (calendar.contentItems || []).map(item => {
        if (
          item.date === originalDate &&
          item.description === originalDescription
        ) {
          return {
            ...item,
            date,
            description,
            type: type !== undefined ? type : item.type,
            status: status !== undefined ? status : item.status,
            title: title !== undefined ? title : item.title,
            assignedTo: assignedTo !== undefined ? assignedTo : item.assignedTo,
            assignedToName: assignedToName !== undefined ? assignedToName : item.assignedToName
          };
        }
        return item;
      });

      const response = await fetch(`${API_URL}/calendars/${calendar._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calendar,
          contentItems: updatedContentItems,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to update item');
      fetchCalendars();
    } catch (err) {
      // handle error
    } finally {
      setIsEditModalOpen(false);
    }
  };

  // Delete content item handler
  const handleDeleteItem = async (calendarId, item) => {
    if (!window.confirm('Are you sure you want to delete this content item?')) return;
    try {
      const description = item.description;
      const date = item.date;
      const url = `${API_URL}/calendars/item/${calendarId}/${date}/${encodeURIComponent(description)}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete item');
      fetchCalendars();
    } catch (err) {
      // handle error
    }
  };

  // Edit calendar handler (prefill values)
  const handleEditCalendar = (calendar) => {
    setCalendarToEdit(calendar);
    setIsEditCalendarModalOpen(true);
    setMobileMenuCalendar(null);
  };

  // Update calendar handler
  const handleUpdateCalendar = async (updatedCalendarData) => {
    try {
      const response = await fetch(`${API_URL}/calendars/${calendarToEdit._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calendarToEdit,
          ...updatedCalendarData,
          updatedAt: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Failed to update calendar');
      fetchCalendars();
    } catch (err) {
      // handle error
    } finally {
      setIsEditCalendarModalOpen(false);
      setCalendarToEdit(null);
    }
  };

  // Delete calendar handler (fix: use DELETE method and refresh)
  const handleDeleteCalendar = async (calendarId) => {
    if (!window.confirm('Are you sure you want to delete this content calendar?')) return;
    try {
      const response = await fetch(`${API_URL}/calendars/${calendarId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete calendar');
      fetchCalendars();
    } catch (err) {
      // handle error
    }
    setMobileMenuCalendar(null);
  };

  // Toggle published status of a content item
  const handleTogglePublished = async (calendarId, item) => {
    const newPublishedState = !item.published;
    try {
      const response = await fetch(`${API_URL}/calendars/item/${calendarId}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          published: newPublishedState,
          publishedAt: newPublishedState ? new Date().toISOString() : null,
          publishedPlatforms: item.platforms || item.type || []
        })
      });
      if (!response.ok) throw new Error('Failed to update publish status');
      fetchCalendars();
    } catch (err) {
      console.error('Error toggling publish status:', err);
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Customer Details">
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-500 text-base">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <AdminLayout title="Customer Details">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 max-w-sm mx-auto mt-10">
          <div className="text-center">
            <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Not Found</h3>
            <p className="text-base text-gray-600 mb-4">{error || "Customer doesn't exist."}</p>
            <button
              onClick={() => navigate('/admin/customers-list')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${customer.name || 'Customer'} - Details`}>
      <div className="space-y-3 sm:space-y-4">
        {/* Header - Compact */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/admin/customers-list')}
              className="mr-2 p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {(customer.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{customer.name || 'Customer'}</h2>
              <p className="text-sm text-gray-500 truncate">{customer.email}</p>
            </div>
          </div>
        </div>

        {/* Customer Info - Side by Side Grid on Mobile */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Customer Information</h3>
          
          {/* 2-Column Grid for Mobile */}
          <div className="grid grid-cols-2 gap-2">
            {/* Personal Details */}
            <InfoItem icon={User} iconBg="bg-blue-100" iconColor="text-blue-600" label="Name" value={customer.name} />
            <InfoItem icon={Mail} iconBg="bg-green-100" iconColor="text-green-600" label="Email" value={customer.email} />
            <InfoItem icon={Phone} iconBg="bg-purple-100" iconColor="text-purple-600" label="Mobile" value={customer.mobile} />
            <InfoItem icon={MapPin} iconBg="bg-orange-100" iconColor="text-orange-600" label="Address" value={customer.address} />
            
            {/* Business Details */}
            <InfoItem icon={FileText} iconBg="bg-indigo-100" iconColor="text-indigo-600" label="GST" value={customer.gstNumber} />
            <InfoItem icon={Building} iconBg="bg-pink-100" iconColor="text-pink-600" label="Role" value={customer.role} />
            <InfoItem icon={Hash} iconBg="bg-yellow-100" iconColor="text-yellow-600" label="ID" value={customer._id} mono />
            <InfoItem icon={Calendar} iconBg="bg-teal-100" iconColor="text-teal-600" label="Registered" value={formatDate(customer.createdAt)} />
          </div>
        </div>

        {/* Content Calendars Section */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Header with Stats */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Content Calendars</h2>
                <p className="text-sm text-gray-500 mt-0.5">Manage content schedule and items</p>
              </div>
              <button
                onClick={() => setIsCalendarModalOpen(true)}
                className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Add Calendar
              </button>
            </div>
            
            {/* Stats Grid */}
            {calendars.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-semibold text-gray-900 tabular-nums">{overallStats.totalCalendars}</div>
                      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Calendars</div>
                    </div>
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-semibold text-blue-700 tabular-nums">{overallStats.totalItems}</div>
                      <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Items</div>
                    </div>
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-semibold text-emerald-700 tabular-nums">{overallStats.publishedItems}</div>
                      <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Published</div>
                    </div>
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-semibold text-amber-700 tabular-nums">{overallStats.pendingItems}</div>
                      <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Pending</div>
                    </div>
                    <Clock className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 sm:p-5">
            {calendars.length > 0 ? (
              <div className="space-y-3">
                {calendars.map((calendar) => {
                  const calStats = getCalendarStats(calendar);
                  return (
                    <div key={calendar._id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                      {/* Calendar Header */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => toggleCalendarExpansion(calendar._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-gray-900 truncate">{calendar.name}</h4>
                                {isCalendarPublished(calendar) && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Complete
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-500">{calStats.total} items</span>
                                {calendar.assignedTo && (
                                  <span className="text-xs text-gray-500 truncate">
                                    Assigned: {calendar.assignedToName || calendar.assignedTo}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress & Actions */}
                          <div className="flex items-center gap-3 ml-3">
                            {/* Progress Bar - Desktop */}
                            <div className="hidden sm:flex items-center gap-2">
                              <span className="text-xs text-gray-600 tabular-nums min-w-[40px] text-right">
                                {calStats.published}/{calStats.total}
                              </span>
                              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${calStats.progressPercent}%` }}
                                />
                              </div>
                            </div>
                            
                            {/* Desktop Actions */}
                            <div className="hidden sm:flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedCalendar(calendar); setIsContentModalOpen(true); }}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Add Item"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditCalendar(calendar); }}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCalendar(calendar._id); }}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Mobile Menu Button */}
                            <div className="sm:hidden">
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); openMobileMenu(calendar); }}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>

                            {expandedCalendars.has(calendar._id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        {/* Progress Bar - Mobile */}
                        <div className="sm:hidden mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${calStats.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums">{calStats.progressPercent}%</span>
                        </div>
                      </div>

                      {/* Expanded Content Items */}
                      {expandedCalendars.has(calendar._id) && (
                        <div className="border-t border-gray-200/50 p-3 space-y-2">
                          {calendar.contentItems && calendar.contentItems.length > 0 ? (
                            calendar.contentItems.map((item, index) => {
                              const itemStatus = getItemStatus(item);
                              const statusConfig = getStatusConfig(itemStatus);
                              return (
                                <ContentItemCard
                                  key={item.id || index}
                                  item={item}
                                  status={itemStatus}
                                  statusConfig={statusConfig}
                                  formatDate={formatSimpleDate}
                                  isPublished={isItemPublished(item)}
                                  calendarId={calendar._id}
                                  index={index}
                                  onTogglePublished={() => handleTogglePublished(calendar._id, item)}
                                  onEdit={() => handleEditItem(item, calendar._id)}
                                  onDelete={() => handleDeleteItem(calendar._id, item)}
                                  onUpload={() => navigate(`/admin/content-upload/${calendar._id}/${index}`)}
                                />
                              );
                            })
                          ) : (
                            <div className="text-center py-6 text-sm text-gray-500">
                              No content items in this calendar
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-1">No calendars yet</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">
                  Create a content calendar to start managing this customer's content schedule.
                </p>
                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create First Calendar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet Menu */}
      {mobileMenuCalendar && (
        <div className="fixed inset-0 z-[9999] sm:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={closeMobileMenu}
          />
          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-slide-up">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{mobileMenuCalendar.name}</h3>
              <button
                onClick={closeMobileMenu}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Actions */}
            <div className="p-2">
              <button
                onClick={() => {
                  const cal = mobileMenuCalendar;
                  closeMobileMenu();
                  setSelectedCalendar(cal);
                  setIsContentModalOpen(true);
                }}
                className="w-full flex items-center px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <Plus className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-medium">Add Item</span>
              </button>
              <button
                onClick={() => {
                  handleEditCalendar(mobileMenuCalendar);
                }}
                className="w-full flex items-center px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <Edit className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium">Edit Calendar</span>
              </button>
              <button
                onClick={() => {
                  const calId = mobileMenuCalendar._id;
                  closeMobileMenu();
                  handleDeleteCalendar(calId);
                }}
                className="w-full flex items-center px-4 py-4 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <span className="font-medium">Delete Calendar</span>
              </button>
            </div>
            {/* Safe area padding for phones with home indicator */}
            <div className="h-6" />
          </div>
        </div>
      )}

      {/* Modals */}
      <ContentCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        onSave={handleCreateCalendar}
        title="Create Content Calendar"
        creators={creators}
      />

      <ContentItemModal
        isOpen={isContentModalOpen}
        onClose={() => {
          setIsContentModalOpen(false);
          setSelectedCalendar(null);
        }}
        onSave={handleAddContentItem}
        title="Add Content Item"
        creators={creators}
        platformOptions={['facebook', 'instagram', 'youtube', 'linkedin']}
        multiPlatform={true}
      />

      <AssignCreatorModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedCalendar(null);
        }}
        onAssign={handleAssignCreator}
        calendarName={selectedCalendar?.name || ''}
      />

      <ContentItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateItem}
        contentItem={selectedItem}
        title="Edit Content"
        creators={creators}
        platformOptions={['facebook', 'instagram', 'youtube', 'linkedin']}
        multiPlatform={true}
      />

      {/* Edit Calendar Modal with prefilled values */}
      <ContentCalendarModal
        isOpen={isEditCalendarModalOpen}
        onClose={() => {
          setIsEditCalendarModalOpen(false);
          setCalendarToEdit(null);
        }}
        onSave={handleUpdateCalendar}
        title="Edit Content Calendar"
        initialData={calendarToEdit}
      />
    </AdminLayout>
  );
}

export default memo(CustomerDetailsView);