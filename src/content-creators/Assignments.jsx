import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Filter, Search, Upload, MessageSquare, CheckCircle, Clock, AlertCircle, Palette, Play } from 'lucide-react';
import Footer from '../admin/components/layout/Footer';

function Assignments() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState([]);

  // Get current creator's email or id
  let creatorEmail = (localStorage.getItem('userEmail') || '').toLowerCase();
  if (!creatorEmail) {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.email) {
          creatorEmail = userObj.email.toLowerCase();
        }
      }
    } catch (e) {
      // ignore
    }
  }

  useEffect(() => {
    // Fetch all content calendar items assigned to this creator
    const fetchAssignments = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await res.json();
        let allAssignments = [];
        calendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            calendar.contentItems.forEach(item => {
              allAssignments.push({
                ...item,
                customer: calendar.customerName || calendar.customer || '',
                id: item.id || item._id || item.title || Math.random().toString(36).slice(2)
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
    if (creatorEmail && creatorEmail.length > 0) {
      fetchAssignments();
    }
  }, [creatorEmail]);

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
    const matchesFilter = selectedFilter === 'all' || assignment.status === selectedFilter;
    const matchesSearch = (assignment.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (assignment.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (assignment.type || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAssignmentClick = (assignment) => {
    // navigate(`/content-creator/assignments/${assignment.id}`);
  };

  const handleStartWork = (assignment) => {
    navigate(`/content-creator/upload/${assignment.id || assignment._id}`);
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

            {/* Assignments List */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  Assignments ({filteredAssignments.length})
                </h2>
              </div>
              
              <div className="space-y-4">
                {filteredAssignments.map((assignment, idx) => (
                  <div
                    key={assignment.id || assignment._id || idx}
                    className="bg-white rounded-xl border border-gray-200/50 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                  >
                    <div className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          {/* Header */}
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-bold text-gray-900 mb-2">{assignment.title}</h3>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(assignment.status)}`}>
                                  {getStatusIcon(assignment.status)}
                                  <span className="ml-1 capitalize">{(assignment.status || 'assigned').replace('_', ' ')}</span>
                                </span>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(assignment.priority)}`}>
                                  {(assignment.priority || 'Medium').toUpperCase()} PRIORITY
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <div>
                                <span className="text-sm font-medium text-gray-500">Customer</span>
                                <p className="text-sm text-gray-900">{assignment.customer}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <div>
                                <span className="text-sm font-medium text-gray-500">Content Type</span>
                                <p className="text-sm text-gray-900">{assignment.type}</p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                              <div>
                                <span className="text-sm font-medium text-gray-500">Due Date</span>
                                <p className="text-sm text-gray-900">{format(new Date(assignment.dueDate), 'MMM dd, yyyy')}</p>
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-gray-700 text-sm leading-relaxed">{assignment.description}</p>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleStartWork(assignment)}
                            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                          >
                            <Play className="h-5 w-5 mr-2" />
                            Start Work
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredAssignments.length === 0 && (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
                    <p className="text-gray-500">No assignments match your current search criteria.</p>
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