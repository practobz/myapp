import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AdminLayout from '../../components/layout/AdminLayout';
import ContentItemModal from '../../components/modals/ContentItemModal';
import AssignCreatorModal from '../../components/modals/AssignCreatorModal';
import ContentCalendarModal from '../../components/modals/ContentCalendarModal';
import {
  ChevronLeft, Pencil, Trash2, Plus, AlertCircle, Calendar, Clock,
  ChevronRight, ChevronDown, MoreVertical, Upload, X, FileText, CheckCircle, Edit
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

const API_URL = process.env.REACT_APP_API_URL;

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(undefined);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [creators, setCreators] = useState([]);
  const [expandedCalendars, setExpandedCalendars] = useState(new Set());
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isEditCalendarModalOpen, setIsEditCalendarModalOpen] = useState(false);
  const [calendarToEdit, setCalendarToEdit] = useState(null);
  const [mobileMenuCalendar, setMobileMenuCalendar] = useState(null);
  const [scheduledPosts, setScheduledPosts] = useState([]);

  useEffect(() => {
    fetchCustomer();
    fetchCalendarItems();
    fetchCreators();
    fetchScheduledPosts();
  }, [id]);

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scheduled-posts`);
      if (response.ok) {
        const posts = await response.json();
        setScheduledPosts(Array.isArray(posts) ? posts : []);
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      setScheduledPosts([]);
    }
  };

  // Check if item is published (manual or via scheduled post)
  const isItemPublished = (item) => {
    // Check manual publish flag
    if (item.published === true) return true;
    // Check scheduled posts
    return scheduledPosts.some(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.item_name && post.item_name === (item.title || item.description))) &&
      (post.status === 'published' || post.publishedAt)
    );
  };

  // Get item status with published check
  const getItemStatus = (item) => {
    if (isItemPublished(item)) return 'published';
    return item.status || 'pending';
  };

  // Check if all items in a calendar are published
  const isCalendarPublished = (calendar) => {
    if (!calendar.contentItems || calendar.contentItems.length === 0) return false;
    return calendar.contentItems.every(item => isItemPublished(item));
  };

  // Get published count for a calendar
  const getCalendarStats = useCallback((calendar) => {
    const total = calendar.contentItems?.length || 0;
    const published = calendar.contentItems?.filter(item => isItemPublished(item)).length || 0;
    const progressPercent = total > 0 ? Math.round((published / total) * 100) : 0;
    return { total, published, progressPercent };
  }, [scheduledPosts]);

  // Overall stats for all calendars
  const overallStats = useMemo(() => {
    let totalItems = 0, publishedItems = 0;
    calendars.forEach(cal => {
      const items = cal.contentItems || [];
      totalItems += items.length;
      publishedItems += items.filter(item => isItemPublished(item)).length;
    });
    return { 
      totalCalendars: calendars.length,
      totalItems, 
      publishedItems, 
      pendingItems: totalItems - publishedItems,
      completionRate: totalItems > 0 ? Math.round((publishedItems / totalItems) * 100) : 0
    };
  }, [calendars, scheduledPosts]);

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`${API_URL}/customer/${id}`);
      if (!response.ok) return setCustomer(null);
      const data = await response.json();
      setCustomer(data);
    } catch {
      setCustomer(null);
    }
  };

  const fetchCalendarItems = async () => {
    try {
      const response = await fetch(`${API_URL}/calendars`);
      if (!response.ok) {
        setCalendars([]);
        setContentItems([]);
        return;
      }
      const allCalendars = await response.json();
      const customerCalendars = allCalendars.filter(c => c.customerId === id);
      setCalendars(customerCalendars);

      // Flatten all content items for stats
      const allItems = customerCalendars
        .filter(c => Array.isArray(c.contentItems) && c.contentItems.length > 0)
        .flatMap(c => c.contentItems.map(item => ({
          ...item,
          _calendarId: c._id,
          _id: `${c._id}_${item.date}_${item.description}`
        })))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setContentItems(allItems);
    } catch (err) {
      setCalendars([]);
      setContentItems([]);
    }
  };

  const fetchCreators = async () => {
    try {
      const response = await fetch(`${API_URL}/users?role=content_creator`);
      if (!response.ok) throw new Error('Failed to fetch content creators');
      const raw = await response.clone().json();
      const data = Array.isArray(raw) ? raw : (Array.isArray(raw.creators) ? raw.creators : []);
      setCreators(data);
    } catch {
      setCreators([]);
    }
  };

  const handleAddCalendar = async (calendarData) => {
    try {
      const response = await fetch(`${API_URL}/calendars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: id,
          name: calendarData.name,
          description: calendarData.description,
          assignedTo: '',
          assignedToName: '',
          contentItems: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Failed to add calendar');
      fetchCalendarItems();
    } catch (err) {
      // handle error
    }
  };

  const handleCreateCalendar = async (calendarData) => {
    try {
      const response = await fetch(`${API_URL}/calendars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: id,
          name: calendarData.name,
          description: calendarData.description,
          assignedTo: calendarData.assignedTo || '',
          assignedToName: calendarData.assignedToName || '',
          contentItems: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Failed to add calendar');
      fetchCalendarItems();
    } catch (err) {
      // handle error
    } finally {
      setIsCalendarModalOpen(false);
    }
  };

  const handleAddItem = async (item, calendarId) => {
  if (!calendarId) {
    alert("Please select a calendar before adding content.");
    return;
  }

  try {
    const calendar = calendars.find(c => c._id === calendarId);
    if (!calendar) {
      alert("Calendar not found.");
      return;
    }

    const updatedContentItems = [...(calendar.contentItems || []), item];
    const response = await fetch(`${API_URL}/calendars/${calendarId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...calendar,
        contentItems: updatedContentItems,
        updatedAt: new Date().toISOString()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to add item');
    }

    fetchCalendarItems();
  } catch (err) {
    console.error('❌ Error adding content item:', err);
    alert("Failed to add content item.");
  }
};


  // Edit content item handler (match CustomerDetailsView.jsx)
  const handleEditItem = (item, calendarId) => {
    setSelectedItem({
      ...item,
      _calendarId: calendarId,
      originalDate: item.date,
      originalDescription: item.description
    });
    setIsEditModalOpen(true);
  };

  // Update content item handler (match CustomerDetailsView.jsx)
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
        title
      } = updatedItem;

      if (!_calendarId || !originalDate || !originalDescription) return;

      // Fetch the latest calendar to get all items
      let calendar = null;
      let calendarRes = await fetch(`${API_URL}/calendars/${_calendarId}`);
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
            title: title !== undefined ? title : item.title
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
      fetchCalendarItems();
    } catch (err) {
      // handle error
    } finally {
      setIsEditModalOpen(false);
    }
  };

  const handleEditCalendar = (calendar) => {
    setCalendarToEdit(calendar);
    setIsEditCalendarModalOpen(true);
    setMobileMenuCalendar(null);
  };

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
      fetchCalendarItems();
    } catch (err) {
      // handle error
    } finally {
      setIsEditCalendarModalOpen(false);
      setCalendarToEdit(null);
    }
  };

  const handleDeleteConfirm = (id) => setDeleteConfirmation(id);

  const handleDeleteItem = async (calendarId, item) => {
    if (!window.confirm('Are you sure you want to delete this content item?')) return;
    try {
      const description = item.description;
      const date = item.date;
      const url = `${API_URL}/calendars/item/${calendarId}/${date}/${encodeURIComponent(description)}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete item');
      fetchCalendarItems();
    } catch (err) {
      // handle error
    }
  };

  const handleDeleteCalendar = async (calendarId) => {
    if (!window.confirm('Are you sure you want to delete this content calendar?')) return;
    try {
      const response = await fetch(`${API_URL}/calendars/${calendarId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete calendar');
      fetchCalendarItems();
    } catch (err) {
      // handle error
    }
    setMobileMenuCalendar(null);
  };

  const handleCancelDelete = () => setDeleteConfirmation(null);

  const toggleCalendarExpansion = useCallback((calendarId) => {
    setExpandedCalendars(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(calendarId)) {
        newExpanded.delete(calendarId);
      } else {
        newExpanded.add(calendarId);
      }
      return newExpanded;
    });
  }, []);

  // Mobile menu handlers
  const openMobileMenu = useCallback((calendar) => {
    setMobileMenuCalendar(calendar);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuCalendar(null);
  }, []);

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
      fetchCalendarItems();
    } catch (err) {
      // handle error
    }
    setIsAssignModalOpen(false);
    setSelectedCalendar(null);
  };

  const formatDate = useCallback((dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "do MMMM");
    } catch (error) {
      return dateString;
    }
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'waiting_input':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'published':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }, []);

  const getPriorityColor = useCallback((priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  if (!customer) {
    return (
      <AdminLayout title="Not Found">
        <div className="p-4">
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200/50 max-w-sm mx-auto">
            <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Customer not found</h3>
            <p className="text-xs text-gray-500 mb-4">This customer doesn't exist.</p>
            <button
              onClick={() => navigate('/admin')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${customer.name}`}>
      <div className="space-y-3 sm:space-y-4">
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
                                onClick={(e) => { e.stopPropagation(); setSelectedCalendar(calendar); setIsAddModalOpen(true); }}
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
                                <div key={item.id || index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
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
                                      {itemStatus.replace('_', ' ')}
                                    </span>
                                    <button
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors touch-manipulation"
                                      onClick={(e) => { e.stopPropagation(); handleEditItem(item, calendar._id); }}
                                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleEditItem(item, calendar._id); }}
                                      title="Edit"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors touch-manipulation"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteItem(calendar._id, item); }}
                                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteItem(calendar._id, item); }}
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors touch-manipulation"
                                      onClick={(e) => { e.stopPropagation(); navigate(`/admin/content-upload/${calendar._id}/${index}`); }}
                                      onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/admin/content-upload/${calendar._id}/${index}`); }}
                                      title="Upload"
                                    >
                                      <Upload className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
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
                  setIsAddModalOpen(true);
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
                  <Pencil className="h-5 w-5 text-blue-600" />
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
      <ContentCalendarModal
        isOpen={isEditCalendarModalOpen}
        onClose={() => {
          setIsEditCalendarModalOpen(false);
          setCalendarToEdit(null);
        }}
        onSave={handleUpdateCalendar}
        title="Edit Content Calendar"
        initialData={calendarToEdit}
        creators={creators}
      />
      <ContentItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setSelectedCalendar(null);
        }}
        onSave={(item) => {
          if (!selectedCalendar?._id) {
            alert("No calendar selected. Please choose a calendar first.");
            return;
          }
          handleAddItem(item, selectedCalendar._id);
        }}
        title={selectedCalendar ? `Add Content to ${selectedCalendar.name}` : "Add New Content"}
        creators={Array.isArray(creators) ? creators : []}
        platformOptions={['facebook', 'instagram', 'youtube', 'linkedin']}
        multiPlatform={true} // <-- enable multi-select for type/platform
      />
      <ContentItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateItem}
        contentItem={selectedItem}
        title="Edit Content"
        creators={Array.isArray(creators) ? creators : []}
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
        creators={creators}
      />
    </AdminLayout>
  );
};

export default memo(CustomerDetails);