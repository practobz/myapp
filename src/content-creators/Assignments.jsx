import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Filter, Search, Upload, MessageSquare, CheckCircle, Clock, AlertCircle, Palette, Play, Eye, Calendar, User, FileText, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
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
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [customerMap, setCustomerMap] = useState({});
  const [expandedCustomers, setExpandedCustomers] = useState({});
  
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'waiting_input':
        return <MessageSquare className="h-4 w-4" />;
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
    const actualStatus = getActualStatus(assignment);
    const matchesFilter = selectedFilter === 'all' || actualStatus === selectedFilter;
    const matchesSearch = (assignment.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (assignment.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (assignment.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Group assignments by customer
  const groupedAssignments = filteredAssignments.reduce((acc, assignment) => {
    const customerKey = assignment.customerId || 'unknown';
    const customerName = assignment.customerName || assignment.customer || 'Unknown Customer';
    
    if (!acc[customerKey]) {
      acc[customerKey] = {
        customerName,
        customerId: customerKey,
        assignments: []
      };
    }
    acc[customerKey].assignments.push(assignment);
    return acc;
  }, {});

  // Sort customers alphabetically and expand all by default if not already set
  const sortedCustomers = Object.values(groupedAssignments).sort((a, b) => 
    a.customerName.localeCompare(b.customerName)
  );

  // Initialize expanded state for all customers
  useEffect(() => {
    const initialExpandedState = {};
    sortedCustomers.forEach(customer => {
      if (expandedCustomers[customer.customerId] === undefined) {
        initialExpandedState[customer.customerId] = true; // Expand all by default
      }
    });
    if (Object.keys(initialExpandedState).length > 0) {
      setExpandedCustomers(prev => ({ ...prev, ...initialExpandedState }));
    }
  }, [filteredAssignments.length]);

  const toggleCustomer = (customerId) => {
    setExpandedCustomers(prev => ({
      ...prev,
      [customerId]: !prev[customerId]
    }));
  };

  const handleAssignmentClick = (assignment) => {
    // Navigate to detailed view or portfolio for this specific assignment
    navigate(`/content-creator/portfolio`, { state: { assignmentId: assignment.id } });
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
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-8">
            {/* Page Header */}
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                My Assignments
              </h1>
              <p className="text-gray-600 mt-3 text-lg">Manage and track your content creation tasks</p>
            </div>

            {/* Filters and Search */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
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
                      <option value="assigned">New Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_input">Waiting Input</option>
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

            {/* Assignments List - Grouped by Customer */}
            <div className="space-y-6">
              {sortedCustomers.length > 0 ? (
                sortedCustomers.map((customerGroup) => {
                  const isExpanded = expandedCustomers[customerGroup.customerId] !== false;
                  return (
                    <div
                      key={customerGroup.customerId}
                      className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden"
                    >
                      {/* Customer Header */}
                      <div
                        onClick={() => toggleCustomer(customerGroup.customerId)}
                        className="flex items-center justify-between p-6 bg-gradient-to-r from-purple-50 to-indigo-50 cursor-pointer hover:from-purple-100 hover:to-indigo-100 transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                            <Building2 className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-gray-900">
                              {customerGroup.customerName}
                            </h2>
                            <p className="text-sm text-gray-600 mt-1">
                              {customerGroup.assignments.length} {customerGroup.assignments.length === 1 ? 'Assignment' : 'Assignments'}
                            </p>
                          </div>
                        </div>
                        <button className="p-2 hover:bg-white/50 rounded-lg transition-colors duration-200">
                          {isExpanded ? (
                            <ChevronUp className="h-6 w-6 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-6 w-6 text-gray-600" />
                          )}
                        </button>
                      </div>

                      {/* Assignments for this customer */}
                      {isExpanded && (
                        <div className="p-6 space-y-4">
                          {customerGroup.assignments.map((assignment, idx) => (
                            <div
                              key={assignment.id || assignment._id || idx}
                              className="bg-white rounded-xl border border-gray-200/50 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                            >
                              <div className="p-6">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                                  {/* Left: Title, Calendar, Status, Priority */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-xl font-bold text-gray-900">{assignment.title}</h3>
                                        <span className="px-2 py-1 rounded bg-gray-100 text-xs text-gray-700 font-medium">
                                          {assignment.calendarName}
                                        </span>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0">
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(getActualStatus(assignment))}`}>
                                          {getStatusIcon(getActualStatus(assignment))}
                                          <span className="ml-1 capitalize">{getActualStatus(assignment).replace('_', ' ')}</span>
                                        </span>
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(assignment.priority)}`}>
                                          {(assignment.priority || 'Medium').toUpperCase()} PRIORITY
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex flex-wrap gap-8 mt-4">
                                      <div>
                                        <span className="text-xs font-medium text-gray-500">Content Type</span>
                                        <p className="text-sm text-gray-900">{assignment.type}</p>
                                      </div>
                                      <div>
                                        <span className="text-xs font-medium text-gray-500">Due Date</span>
                                        <p className="text-sm text-gray-900">{format(new Date(assignment.dueDate), 'MMM dd, yyyy')}</p>
                                      </div>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-4 mt-4">
                                      <p className="text-gray-700 text-sm leading-relaxed">{assignment.description}</p>
                                    </div>
                                  </div>
                                  {/* Right: Action Buttons */}
                                  <div className="flex flex-col gap-3 min-w-[180px]">
                                    <button
                                      onClick={() => handleStartWork(assignment)}
                                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                      <Play className="h-5 w-5 mr-2" />
                                      Start Work
                                    </button>
                                    <button
                                      onClick={() => handleViewPortfolio(assignment)}
                                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                      <Eye className="h-5 w-5 mr-2" />
                                      View Portfolio
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
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
      <Footer />
    </div>
  );
}

export default Assignments;