import React, { useState, useEffect } from 'react';
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
  Clock,
  Activity,
  Target,
  Building,
  Hash,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Edit,
  Trash2
} from 'lucide-react';

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

  useEffect(() => {
    fetchCustomer();
    fetchCalendars();
    fetchCreators(); // <-- fetch creators on mount
  }, [id]);

  const API_URL = process.env.REACT_APP_API_URL;

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

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      return format(date, "MMMM dd, yyyy 'at' HH:mm");
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatSimpleDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      return 'Invalid date';
    }
  };

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
        title
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
      fetchCalendars();
    } catch (err) {
      // handle error
    } finally {
      setIsEditModalOpen(false);
    }
  };

  // Delete content item handler
  const handleDeleteItem = async (calendarId, item) => {
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
  };

  if (loading) {
    return (
      <AdminLayout title="Customer Details">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500 font-medium">Loading customer details...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <AdminLayout title="Customer Details">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200/50 max-w-md mx-auto mt-20">
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Customer not found</h3>
              <p className="text-gray-600 mb-6">{error || "The customer you're looking for doesn't exist."}</p>
              <button
                onClick={() => navigate('/admin/customers-list')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Customers List
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${customer.name || 'Customer'} - Details`}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="space-y-8">
          {/* Header Section with Navigation */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/admin/customers-list')}
                  className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">
                      {(customer.name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-900">{customer.name || 'Unnamed Customer'} - Details</h2>
                    <p className="text-gray-600">Customer Profile & Content Management</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Information (moved from CustomerDetails.jsx) */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200/50">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Customer Information</h3>
              <p className="text-gray-600">Complete profile and contact details</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Personal Details</h4>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Full Name</p>
                      <p className="text-gray-900 font-medium">{customer.name || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Email Address</p>
                      <p className="text-gray-900 font-medium">{customer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Phone className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Mobile Number</p>
                      <p className="text-gray-900 font-medium">{customer.mobile || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-gray-900 font-medium">{customer.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Business Details</h4>
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">GST Number</p>
                      <p className="text-gray-900 font-medium">{customer.gstNumber || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Building className="h-5 w-5 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Role</p>
                      <p className="text-gray-900 font-medium capitalize">{customer.role}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Hash className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Customer ID</p>
                      <p className="text-gray-900 font-mono text-sm">{customer._id}</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Registration Date</p>
                      <p className="text-gray-900 font-medium">{formatDate(customer.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Calendars Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Content Calendars</h3>
                  <p className="text-gray-600 mt-1">Manage content calendars and items</p>
                </div>
                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Add Content Calendar
                </button>
              </div>
            </div>

            <div className="p-8">
              {calendars.length > 0 ? (
                <div className="space-y-4">
                  {calendars.map((calendar) => (
                    <div key={calendar._id} className="bg-white rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
                      <div 
                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleCalendarExpansion(calendar._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{calendar.name}</h4>
                              <p className="text-sm text-gray-600">{calendar.description}</p>
                              <div className="flex items-center space-x-4 mt-2">
                                <span className="text-xs text-gray-500">{calendar.contentItems?.length || 0} content items</span>
                                {calendar.assignedTo && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Navigate to content creator details
                                      // You'll need to implement this based on your routing
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                  >
                                    Assigned to - {calendar.assignedToName || calendar.assignedTo}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {/* Remove Assign button */}
                            {/* 
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCalendar(calendar);
                                setIsAssignModalOpen(true);
                              }}
                              className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Assign
                            </button>
                            */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCalendar(calendar);
                                setIsContentModalOpen(true);
                              }}
                              className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Item
                            </button>
                            {/* Edit Calendar button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditCalendar(calendar);
                              }}
                              className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit Calendar
                            </button>
                            {/* Delete Calendar button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCalendar(calendar._id);
                              }}
                              className="inline-flex items-center px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete Calendar
                            </button>
                            {expandedCalendars.has(calendar._id) ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedCalendars.has(calendar._id) && (
                        <div className="border-t border-gray-200/50 bg-gray-50/50">
                          <div className="p-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-4">Content Items</h5>
                            {calendar.contentItems && calendar.contentItems.length > 0 ? (
                              <div className="space-y-3">
                                {calendar.contentItems.map((item, index) => (
                                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200/50">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        {/* Content Title */}
                                        {item.title && (
                                          <p className="font-semibold text-blue-800 mb-1">{item.title}</p>
                                        )}
                                        <p className="font-medium text-gray-900">{item.description}</p>
                                        <p className="text-sm text-gray-600 mt-1">Due: {formatSimpleDate(item.date)}</p>
                                        {item.type && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 mt-2">
                                            {item.type}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {item.status && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                            {item.status.replace('_', ' ').toUpperCase()}
                                          </span>
                                        )}
                                        <button
                                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                          onClick={() => handleEditItem(item, calendar._id)}
                                        >
                                          <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                          onClick={() => handleDeleteItem(calendar._id, item)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
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
                  <p className="text-gray-500 mb-6">
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

          {/* Modals */}
          <ContentCalendarModal
            isOpen={isCalendarModalOpen}
            onClose={() => setIsCalendarModalOpen(false)}
            onSave={handleCreateCalendar}
            title="Create Content Calendar"
            creators={creators} // <-- pass creators to modal
          />

          <ContentItemModal
            isOpen={isContentModalOpen}
            onClose={() => {
              setIsContentModalOpen(false);
              setSelectedCalendar(null);
            }}
            onSave={handleAddContentItem}
            title="Add Content Item"
            creators={creators} // <-- ensure creators is passed here for dropdown
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
        </div>
      </div>
    </AdminLayout>
  );
}

export default CustomerDetailsView;