import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Filter, Search, MessageSquare, CheckCircle, Clock, AlertCircle, Palette, Calendar, User, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import Footer from '../admin/components/layout/Footer';
import Logo from '../admin/components/layout/Logo';

// Helper to get creator email from localStorage
function getCreatorEmail() {
  let email = '';
  try {
    email = (localStorage.getItem('userEmail') || '').toLowerCase();
    if (!email) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.email) {
          email = userObj.email.toLowerCase();
        }
      }
    }
  } catch (e) {
    email = '';
  }
  return email;
}

function Assignments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedFilter, setSelectedFilter] = useState(() => {
    const param = searchParams.get('filter') || 'all';
    // 'assigned' from Dashboard maps to 'pending' in this view (initial state)
    return param === 'assigned' ? 'pending' : param;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [customerMap, setCustomerMap] = useState({});
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [expandedCalendars, setExpandedCalendars] = useState({});
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  
  // Scheduled posts to check published status
  const [scheduledPosts, setScheduledPosts] = useState([]);

  // Get current creator's email or id
  const creatorEmail = getCreatorEmail();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail) {
      navigate('/content-creator/login');
    }
  }, [creatorEmail, navigate]);

  useEffect(() => {
    // Fetch all customers and build a map of customerId -> customerName
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/customers`);
        const data = await res.json();
        if (Array.isArray(data.customers)) {
          const map = {};
          data.customers.forEach(c => {
            map[c._id || c.id] = c.name || c.customerName || c.email || '';
          });
          setCustomerMap(map);
        }
      } catch (err) {
        setCustomerMap({});
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Fetch all content calendar items assigned to this creator
    const fetchAssignments = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await res.json();
        let allAssignments = [];
        calendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            calendar.contentItems.forEach((item, index) => {
              allAssignments.push({
                ...item,
                calendarName: calendar.name || calendar.customerName || calendar.customer || '',
                calendarId: calendar._id || calendar.id,
                customerId: calendar.customerId || calendar.customer_id || calendar.customer?._id || '',
                customerName: customerMap[calendar.customerId || calendar.customer_id || (calendar.customer && calendar.customer._id)] || '',
                id: item.id || item._id || item.title || Math.random().toString(36).slice(2),
                itemIndex: index
              });
            });
          }
        });
        const filtered = allAssignments.filter(item =>
          (item.assignedTo || '').toLowerCase() === creatorEmail
        );
        setAssignments(filtered);
      } catch (err) {
        setAssignments([]);
      }
    };
    
    const fetchScheduledPosts = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
        if (!res.ok) {
          throw new Error(`Failed to fetch scheduled posts: ${res.statusText}`);
        }
        const data = await res.json();
        setScheduledPosts(data);
      } catch (err) {
        console.error('Failed to fetch scheduled posts:', err);
        setScheduledPosts([]); // Ensure scheduledPosts is an empty array on error
      }
    };
    
    if (creatorEmail && creatorEmail.length > 0 && Object.keys(customerMap).length > 0) {
      fetchAssignments();
      fetchScheduledPosts();
    }
  }, [creatorEmail, customerMap]);

  // Helper: check if content is published on any platform
  const isContentPublished = (assignmentId) => {
    return scheduledPosts.some(post => post.contentId === assignmentId && post.status === 'published');
  };
  
  // Helper: get actual status considering published posts and item.published field
  const getActualStatus = (assignment) => {
    // Check if the item itself is marked as published
    if (assignment.published === true) {
      return 'published';
    }
    if (isContentPublished(assignment.id || assignment._id)) {
      return 'published';
    }
    return assignment.status || 'assigned';
  };

  const getFilterStatus = (assignment) => {
    const actual = getActualStatus(assignment);
    if (actual === 'approved' || actual === 'published') return actual;
    return 'pending';
  };

  const parsePlatforms = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    const s = String(val || '');
    if (s.includes(',')) return s.split(',').map(v => v.trim()).filter(Boolean);
    if (s.includes(' ')) return s.split(/\s+/).map(v => v.trim()).filter(Boolean);
    const matches = s.match(/facebook|instagram|youtube|linkedin|twitter|tiktok|pinterest/ig);
    if (matches) return matches.map(m => m.toLowerCase());
    return [s];
  };

  const platformColor = (p) => {
    switch ((p || '').toLowerCase()) {
      case 'facebook': return 'bg-blue-100 text-blue-800';
      case 'instagram': return 'bg-pink-100 text-pink-800';
      case 'youtube': return 'bg-red-100 text-red-800';
      case 'linkedin': return 'bg-blue-50 text-blue-800';
      case 'twitter': return 'bg-sky-100 text-sky-800';
      case 'tiktok': return 'bg-black text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'published':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
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

  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = selectedFilter === 'all' || getFilterStatus(assignment) === selectedFilter;
    const matchesSearch = (assignment.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (assignment.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (assignment.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = !selectedCustomerId || assignment.customerId === selectedCustomerId;
    return matchesFilter && matchesSearch && matchesCustomer;
  });

  // Group: Customer -> Calendar -> Items
  const groupedByCustomer = filteredAssignments.reduce((acc, assignment) => {
    const custKey = assignment.customerId || 'unknown';
    const custName = assignment.customerName || 'Unknown Customer';
    if (!acc[custKey]) {
      acc[custKey] = { customerName: custName, customerId: custKey, calendars: {} };
    }
    const calKey = assignment.calendarId || 'unknown';
    const calName = assignment.calendarName || 'Unnamed Calendar';
    if (!acc[custKey].calendars[calKey]) {
      acc[custKey].calendars[calKey] = { calendarName: calName, calendarId: calKey, assignments: [] };
    }
    acc[custKey].calendars[calKey].assignments.push(assignment);
    return acc;
  }, {});

  const sortedCustomers = Object.values(groupedByCustomer).sort((a, b) =>
    a.customerName.localeCompare(b.customerName)
  );

  // All customers from unfiltered assignments (for sidebar)
  const allCustomersSorted = Object.values(
    assignments.reduce((acc, assignment) => {
      const custKey = assignment.customerId || 'unknown';
      const custName = assignment.customerName || 'Unknown Customer';
      if (!acc[custKey]) acc[custKey] = { customerName: custName, customerId: custKey };
      return acc;
    }, {})
  ).sort((a, b) => a.customerName.localeCompare(b.customerName));

  // Auto-expand the customer passed via ?expand=customerId (from Dashboard recent assignment click)
  const expandCustomerId = searchParams.get('expand');
  useEffect(() => {
    if (!expandCustomerId || assignments.length === 0) return;
    setExpandedCustomers(prev => ({ ...prev, [expandCustomerId]: true }));
    const calendarIds = [...new Set(
      assignments
        .filter(a => a.customerId === expandCustomerId)
        .map(a => a.calendarId)
        .filter(Boolean)
    )];
    setExpandedCalendars(prev => {
      const next = { ...prev };
      calendarIds.forEach(id => { next[id] = true; });
      return next;
    });
  }, [assignments, expandCustomerId]);

  const toggleCustomer = (id) => setExpandedCustomers(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCalendar = (id) => setExpandedCalendars(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAssignmentClick = (assignment) => {
    const itemIndex = assignment.itemIndex !== undefined ? assignment.itemIndex : 0;
    navigate(`/content-creator/content-details/${assignment.calendarId}/${itemIndex}`);
  };

  const handleStartWork = (assignment) => {
    // Find the index of this item in the calendar's contentItems array
    const itemIndex = assignment.itemIndex !== undefined ? assignment.itemIndex : 0;
    navigate(`/content-creator/upload/${assignment.calendarId}/${itemIndex}`);
  };

  const handleViewPortfolio = (assignment) => {
    navigate(`/content-creator/portfolio`, { state: { assignmentId: assignment.id } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header with Navigation */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/content-creator')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                  <Palette className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Content Creator Portal
                  </span>
                  <p className="text-sm text-gray-500">Assignment Dashboard</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Customer Sidebar */}
        <aside className="w-52 bg-white border-r border-gray-200/70 flex-shrink-0 sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto">
          <div className="p-4">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Customers</h3>
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${!selectedCustomerId ? 'bg-purple-100 text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  All Customers
                </button>
              </li>
              {allCustomersSorted.map(cust => (
                <li key={cust.customerId}>
                  <button
                    onClick={() => setSelectedCustomerId(cust.customerId)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors duration-150 truncate ${selectedCustomerId === cust.customerId ? 'bg-purple-100 font-semibold text-purple-700' : 'text-gray-700 hover:bg-gray-100'}`}
                    title={cust.customerName}
                  >
                    {cust.customerName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        {/* Content Area */}
        <div className="flex-1 min-w-0">
        <div className="px-6 py-6">
          <div className="space-y-5">
            {/* Filters and Search */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-4 border border-gray-200/50">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center">
                    <Filter className="h-5 w-5 text-gray-400 mr-2" />
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      className="bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                    >
                      <option value="all">All Assignments</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="relative">
                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search assignments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm w-64"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Assignments List - Customer > Calendar > Items */}
            <div className="space-y-4">
              {sortedCustomers.length > 0 ? (
                sortedCustomers.map((custGroup) => {
                  const isCustExpanded = expandedCustomers[custGroup.customerId] === true;
                  const totalItems = Object.values(custGroup.calendars).reduce((sum, cal) => sum + cal.assignments.length, 0);
                  return (
                    <div key={custGroup.customerId} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                      {/* Customer Header */}
                      <div
                        onClick={() => toggleCustomer(custGroup.customerId)}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 cursor-pointer hover:from-purple-100 hover:to-indigo-100 transition-all duration-150"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow">
                            <Building2 className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <h2 className="text-base font-bold text-gray-900">{custGroup.customerName}</h2>
                            <p className="text-xs text-gray-500">
                              {Object.keys(custGroup.calendars).length} {Object.keys(custGroup.calendars).length === 1 ? 'Calendar' : 'Calendars'} &middot; {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                            </p>
                          </div>
                        </div>
                        <div className="p-2 text-gray-400">
                          {isCustExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </div>

                      {/* Calendars under this customer */}
                      {isCustExpanded && (
                        <div className="p-4 space-y-4">
                          {Object.values(custGroup.calendars).sort((a, b) => a.calendarName.localeCompare(b.calendarName)).map((calGroup) => {
                            const isCalExpanded = expandedCalendars[calGroup.calendarId] === true;
                            return (
                              <div key={calGroup.calendarId} className="border border-gray-200 rounded-xl overflow-hidden">
                                {/* Calendar sub-header */}
                                <div
                                  onClick={() => toggleCalendar(calGroup.calendarId)}
                                  className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/60 cursor-pointer hover:bg-indigo-100/60 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 bg-indigo-100 rounded">
                                      <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                                    </div>
                                    <span className="font-semibold text-gray-800 text-sm">{calGroup.calendarName}</span>
                                    <span className="text-xs text-gray-400">{calGroup.assignments.length} {calGroup.assignments.length === 1 ? 'item' : 'items'}</span>
                                  </div>
                                  <div className="p-1 text-gray-400">
                                    {isCalExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                  </div>
                                </div>

                                {/* Assignment rows under this calendar */}
                                {isCalExpanded && (
                                  <div className="divide-y divide-gray-100">
                                    {calGroup.assignments.map((assignment, idx) => (
                                      <div
                                        key={assignment.id || assignment._id || idx}
                                        onClick={() => handleAssignmentClick(assignment)}
                                        className="px-4 py-3 hover:bg-purple-50/50 cursor-pointer transition-colors"
                                      >
                                        {/* Line 1: Item label + title */}
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-xs font-semibold text-gray-400 uppercase shrink-0">Item:</span>
                                            <span className="text-sm font-semibold text-gray-800 truncate">{assignment.title}</span>
                                          </div>
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getStatusColor(getFilterStatus(assignment))}`}>
                                            {getStatusIcon(getFilterStatus(assignment))}
                                            <span className="capitalize">{getFilterStatus(assignment)}</span>
                                          </span>
                                        </div>
                                        {/* Line 2: Platform, Due Date, Priority */}
                                        <div className="flex items-center gap-4 flex-wrap">
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">Platform:</span>
                                            <div className="flex gap-1">
                                              {parsePlatforms(assignment.platform || assignment.type).map((p, i) => (
                                                <span key={i} className={`px-1.5 py-0.5 rounded text-xs font-medium ${platformColor(p)}`}>
                                                  {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">Due:</span>
                                            <span className="text-xs text-gray-600">{assignment.dueDate ? format(new Date(assignment.dueDate), 'MMM dd, yyyy') : 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">Priority:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(assignment.priority)}`}>
                                              {(assignment.priority || 'Medium').charAt(0).toUpperCase() + (assignment.priority || 'Medium').slice(1).toLowerCase()}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
                    <p className="text-gray-500">No assignments match your current search criteria.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Assignments;