import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AdminLayout from '../../components/layout/AdminLayout';
import ContentItemModal from '../../components/modals/ContentItemModal';
import AssignCreatorModal from '../../components/modals/AssignCreatorModal';
import ContentCalendarModal from '../../components/modals/ContentCalendarModal';
import {
  ChevronLeft, Pencil, Trash2, Plus, AlertCircle, Calendar, Clock, User, FileText, Activity, Target, UserCheck,
  ChevronRight, ChevronDown, MoreVertical, Upload
} from 'lucide-react';

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
  const [openDropdowns, setOpenDropdowns] = useState(new Set());

  useEffect(() => {
    fetchCustomer();
    fetchCalendarItems();
    fetchCreators();
  }, [id]);

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
    setOpenDropdowns(new Set());
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
    setOpenDropdowns(new Set());
  };

  const handleCancelDelete = () => setDeleteConfirmation(null);

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

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "do MMMM");
    } catch (error) {
      return dateString;
    }
  };

  const getStatusColor = (status) => {
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
  };

  const getPriorityColor = (priority) => {
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

  const toggleDropdown = (calendarId) => {
    const newDropdowns = new Set(openDropdowns);
    if (newDropdowns.has(calendarId)) {
      newDropdowns.delete(calendarId);
    } else {
      newDropdowns.add(calendarId);
    }
    setOpenDropdowns(newDropdowns);
  };

  if (!customer) {
    return (
      <AdminLayout title="Customer Not Found">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200/50 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Customer not found</h3>
              <p className="text-gray-600 mb-6">The customer you're looking for doesn't exist or has been removed.</p>
              <button
                onClick={() => navigate('/admin')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${customer.name} - Details`}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="space-y-6 md:space-y-8">
          {/* Header Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-4 md:p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 flex-1">
                <button
                  onClick={() => navigate('/admin/customers')}
                  className="mr-3 md:mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex-shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center min-w-0 flex-1">
                  <div className="h-10 w-10 md:h-12 md:w-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                    <span className="text-white font-bold text-sm md:text-lg">
                      {customer.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-3 md:ml-4 min-w-0 flex-1">
                    <h2 className="text-lg md:text-2xl font-bold text-gray-900 truncate">{customer.name}</h2>
                    <p className="text-sm md:text-base text-gray-600 truncate">Content Management Dashboard</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Calendars */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="px-4 md:px-8 py-4 md:py-6 border-b border-gray-200/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900">Content Calendars</h3>
                  <p className="text-gray-600 mt-1 text-sm md:text-base">Manage content calendars and items</p>
                </div>
                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="inline-flex items-center px-4 md:px-6 py-2 md:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl text-sm md:text-base"
                >
                  <Plus className="h-4 md:h-5 w-4 md:w-5 mr-2" />
                  Add Calendar
                </button>
              </div>
            </div>

            <div className="p-4 md:p-8">
              {calendars.length > 0 ? (
                <div className="space-y-4">
                  {calendars.map((calendar) => (
                    <div key={calendar._id} className="bg-white rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
                      <div
                        className="p-4 md:p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleCalendarExpansion(calendar._id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 md:space-x-4 min-w-0 flex-1">
                            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                              <Calendar className="h-4 md:h-5 w-4 md:w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-base md:text-lg font-semibold text-gray-900 truncate">{calendar.name}</h4>
                              <p className="text-sm text-gray-600 truncate">{calendar.description}</p>
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 space-y-1 sm:space-y-0">
                                <span className="text-xs text-gray-500">{calendar.contentItems?.length || 0} content items</span>
                                {calendar.assignedTo && (
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      navigate(`/admin/content-creator-details/${calendar.assignedTo}`);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium text-left"
                                  >
                                    Assigned to - {calendar.assignedToName || calendar.assignedTo}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Desktop Actions */}
                          <div className="hidden md:flex items-center space-x-2 ml-4">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedCalendar(calendar);
                                setIsAddModalOpen(true);
                              }}
                              className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Item
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleEditCalendar(calendar);
                              }}
                              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteCalendar(calendar._id);
                              }}
                              className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </button>
                            {expandedCalendars.has(calendar._id) ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                          </div>

                          {/* Mobile Actions */}
                          <div className="md:hidden flex items-center space-x-2 ml-2 relative">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                toggleDropdown(calendar._id);
                              }}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical className="h-5 w-5" />
                            </button>
                            {expandedCalendars.has(calendar._id) ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}

                            {/* Mobile Dropdown Menu */}
                            {openDropdowns.has(calendar._id) && (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                                <div className="py-1">
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      setSelectedCalendar(calendar);
                                      setIsAddModalOpen(true);
                                      setOpenDropdowns(new Set());
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                  >
                                    <Plus className="h-4 w-4 mr-2 text-green-600" />
                                    Add Item
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleEditCalendar(calendar);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                  >
                                    <Pencil className="h-4 w-4 mr-2 text-blue-600" />
                                    Edit Calendar
                                  </button>
                                  <button
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleDeleteCalendar(calendar._id);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                                    Delete Calendar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedCalendars.has(calendar._id) && (
                        <div className="border-t border-gray-200/50 bg-gray-50/50">
                          <div className="p-4 md:p-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-4">Content Items</h5>
                            {calendar.contentItems && calendar.contentItems.length > 0 ? (
                              <div className="space-y-3">
                                {calendar.contentItems.map((item, index) => (
                                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200/50">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between space-y-3 sm:space-y-0">
                                      <div className="min-w-0 flex-1">
                                        {item.title && (
                                          <p className="font-semibold text-blue-800 mb-1 text-sm md:text-base">{item.title}</p>
                                        )}
                                        <p className="font-medium text-gray-900 text-sm md:text-base">{item.description}</p>
                                        <p className="text-xs md:text-sm text-gray-600 mt-1">Due: {formatDate(item.date)}</p>
                                        {item.type && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 mt-2">
                                            {item.type}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center justify-between sm:justify-end space-x-2">
                                        {item.status && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-gray-100 text-gray-800 border-gray-200">
                                            {item.status.replace('_', ' ').toUpperCase()}
                                          </span>
                                        )}
                                        <div className="flex items-center space-x-1">
                                          <button
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                                            onClick={e => {
                                              e.stopPropagation();
                                              handleEditItem(item, calendar._id);
                                            }}
                                            title="Edit item"
                                          >
                                            <Pencil className="h-4 w-4" />
                                          </button>
                                          <button
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                                            onClick={e => {
                                              e.stopPropagation();
                                              handleDeleteItem(calendar._id, item);
                                            }}
                                            title="Delete item"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                          <button
                                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-indigo-50"
                                            onClick={e => {
                                              e.stopPropagation();
                                              // Pass calendarId, item index, calendar name, item name, and item id
                                              navigate(`/admin/content-upload/${calendar._id}/${index}`, {
                                                state: {
                                                  calendarId: calendar._id,
                                                  calendarName: calendar.name,
                                                  itemId: item._id || `${calendar._id}_${item.date}_${item.description}`,
                                                  itemName: item.title || item.description
                                                }
                                              });
                                            }}
                                            title="Upload Content"
                                          >
                                            <Upload className="h-4 w-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No content items in this calendar.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No content calendars created yet</h3>
                  <p className="text-gray-500 mb-6 text-sm md:text-base px-4">
                    Create a content calendar to start managing this customer's content schedule.
                  </p>
                  <button
                    onClick={() => setIsCalendarModalOpen(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Plus className="h-5 w-5 mr-2" />
                    Create First Calendar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {openDropdowns.size > 0 && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setOpenDropdowns(new Set())}
        />
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

export default CustomerDetails;