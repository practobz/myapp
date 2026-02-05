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
  Upload
} from 'lucide-react';

// Memoized info item component for performance
const InfoItem = memo(({ icon: Icon, iconBg, iconColor, label, value, mono }) => (
  <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
    <div className={`p-1.5 ${iconBg} rounded-md flex-shrink-0`}>
      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-medium text-gray-400 uppercase">{label}</p>
      <p className={`text-xs text-gray-900 font-medium truncate ${mono ? 'font-mono' : ''}`}>
        {value || 'N/A'}
      </p>
    </div>
  </div>
));

InfoItem.displayName = 'InfoItem';

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
  const [openDropdowns, setOpenDropdowns] = useState(new Set());

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

  const toggleDropdown = (calendarId) => {
    const newDropdowns = new Set(openDropdowns);
    if (newDropdowns.has(calendarId)) {
      newDropdowns.delete(calendarId);
    } else {
      newDropdowns.add(calendarId);
    }
    setOpenDropdowns(newDropdowns);
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
    setOpenDropdowns(new Set());
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
    setOpenDropdowns(new Set());
  };

  if (loading) {
    return (
      <AdminLayout title="Customer Details">
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-500 text-sm">Loading...</p>
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
            <p className="text-sm text-gray-600 mb-4">{error || "Customer doesn't exist."}</p>
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
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">{customer.name || 'Customer'}</h2>
              <p className="text-xs text-gray-500 truncate">{customer.email}</p>
            </div>
          </div>
        </div>

        {/* Customer Info - Side by Side Grid on Mobile */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Information</h3>
          
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
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
          <div className="px-3 sm:px-4 py-3 border-b border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-gray-900">Content Calendars</h3>
                <p className="text-xs text-gray-500 hidden sm:block">Manage calendars & items</p>
              </div>
              <button
                onClick={() => setIsCalendarModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {calendars.length > 0 ? (
                <div className="space-y-2 sm:space-y-3">
                  {calendars.map((calendar) => (
                    <div key={calendar._id} className="bg-white rounded-lg border border-gray-200/50 shadow-sm overflow-hidden">
                      <div 
                        className="p-3 cursor-pointer hover:bg-gray-50 transition-colors active:bg-gray-100"
                        onClick={() => toggleCalendarExpansion(calendar._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <div className="p-1.5 bg-blue-100 rounded-md flex-shrink-0">
                              <Calendar className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">{calendar.name}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500">
                                <span>{calendar.contentItems?.length || 0} items</span>
                                {calendar.assignedTo && (
                                  <span className="truncate">• {calendar.assignedToName || calendar.assignedTo}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Actions */}
                          <div className="flex items-center gap-1 ml-2">
                            {/* Desktop Actions */}
                            <div className="hidden sm:flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedCalendar(calendar); setIsContentModalOpen(true); }}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                                title="Add Item"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditCalendar(calendar); }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCalendar(calendar._id); }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Mobile Menu */}
                            <div className="sm:hidden relative">
                              <button
                                onClick={e => { e.stopPropagation(); toggleDropdown(calendar._id); }}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded transition-colors"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                              {openDropdowns.has(calendar._id) && (
                                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                                  <button
                                    onClick={e => { e.stopPropagation(); setSelectedCalendar(calendar); setIsContentModalOpen(true); setOpenDropdowns(new Set()); }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                                  >
                                    <Plus className="h-3.5 w-3.5 mr-2 text-green-600" />Add Item
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleEditCalendar(calendar); }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-2 text-blue-600" />Edit
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); handleDeleteCalendar(calendar._id); }}
                                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mr-2 text-red-600" />Delete
                                  </button>
                                </div>
                              )}
                            </div>

                            {expandedCalendars.has(calendar._id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedCalendars.has(calendar._id) && (
                        <div className="border-t border-gray-200/50 bg-gray-50/50 p-3">
                          <h5 className="text-xs font-semibold text-gray-600 mb-2">Content Items</h5>
                          {calendar.contentItems && calendar.contentItems.length > 0 ? (
                            <div className="space-y-2">
                              {calendar.contentItems.map((item, index) => (
                                <div key={index} className="bg-white rounded-lg p-2.5 border border-gray-200/50">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      {item.title && <p className="font-medium text-blue-800 text-xs truncate">{item.title}</p>}
                                      <p className="text-xs text-gray-900 truncate">{item.description}</p>
                                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                                        <span className="text-[10px] text-gray-500">Due: {formatSimpleDate(item.date)}</span>
                                        {item.type && (
                                          <>
                                            {(Array.isArray(item.type) ? item.type : 
                                              (typeof item.type === 'string' ? item.type.split(',').map(p => p.trim()) : [item.type])
                                            ).map((platform, idx) => (
                                              <span 
                                                key={idx}
                                                className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 capitalize"
                                              >
                                                {platform}
                                              </span>
                                            ))}
                                          </>
                                        )}
                                        {item.status && (
                                          <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">
                                            {item.status.replace('_', ' ')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      <button
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                        onClick={() => handleEditItem(item, calendar._id)}
                                        title="Edit"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                        onClick={() => handleDeleteItem(calendar._id, item)}
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                        onClick={e => { e.stopPropagation(); navigate(`/admin/content-upload/${calendar._id}/${index}`); }}
                                        title="Upload"
                                      >
                                        <Upload className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-gray-500 text-xs">No content items.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No calendars yet</h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Create a calendar to manage content.
                  </p>
                  <button
                    onClick={() => setIsCalendarModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Create Calendar
                  </button>
                </div>
              )}
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