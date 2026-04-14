import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Clock, MessageSquare, CheckCircle, Globe, User, ChevronDown, Palette, Eye, Image, FolderOpen, Users, ClipboardList, Send, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from "../admin/contexts/AuthContext";
import Logo from '../admin/components/layout/Logo';
import Footer from '../admin/components/layout/Footer';

const parsePlatforms = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  const s = String(val);
  if (s.includes(',')) return s.split(',').map(v => v.trim()).filter(Boolean);
  if (s.includes(' ')) return s.split(/\s+/).map(v => v.trim()).filter(Boolean);
  return [s];
};

const platformColor = (p) => {
  switch ((p || '').toLowerCase()) {
    case 'facebook': return 'bg-blue-100 text-blue-800';
    case 'instagram': return 'bg-pink-100 text-pink-800';
    case 'youtube': return 'bg-red-100 text-red-800';
    case 'linkedin': return 'bg-blue-50 text-blue-700';
    case 'twitter': return 'bg-sky-100 text-sky-800';
    case 'tiktok': return 'bg-gray-900 text-white';
    default: return 'bg-gray-100 text-gray-700';
  }
};

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

function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Real assignments data
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Scheduled posts to check published status
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);

  const creatorEmail = getCreatorEmail();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail) {
      navigate('/content-creator/login');
    }
  }, [creatorEmail, navigate]);

  useEffect(() => {
    if (!creatorEmail) return;
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const [calRes, custRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/calendars`),
          fetch(`${process.env.REACT_APP_API_URL}/api/customers`)
        ]);
        const calendars = await calRes.json();
        const custData = custRes.ok ? await custRes.json() : { customers: [] };
        const customerMap = {};
        (custData.customers || []).forEach(c => {
          customerMap[c._id || c.id] = c.name || '';
        });
        let allAssignments = [];
        calendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            const resolvedCustomerName =
              customerMap[calendar.customerId] ||
              calendar.customerName ||
              '';
            calendar.contentItems.forEach((item, index) => {
              allAssignments.push({
                ...item,
                customerName: resolvedCustomerName,
                customerId: calendar.customerId || calendar.customer_id || calendar.customer?._id || '',
                customer: resolvedCustomerName,
                calendarId: calendar._id || calendar.id,
                itemIndex: index,
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
      } finally {
        setLoading(false);
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
    
    const fetchReviewCount = async () => {
      try {
        const [submissionsRes, calendarsRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`),
          fetch(`${process.env.REACT_APP_API_URL}/calendars`)
        ]);
        const submissions = submissionsRes.ok ? await submissionsRes.json() : [];
        const calendars = calendarsRes.ok ? await calendarsRes.json() : [];
        const calendarMap = {};
        if (Array.isArray(calendars)) {
          calendars.forEach(cal => { calendarMap[cal._id || cal.id] = cal; });
        }
        const count = Array.isArray(submissions)
          ? submissions.filter(sub => {
              const byThisCreator = (sub.created_by || '').toLowerCase() === creatorEmail;
              let assignedToCreator = false;
              if (!byThisCreator && sub.calendar_id) {
                const cal = calendarMap[sub.calendar_id];
                if (cal && Array.isArray(cal.contentItems)) {
                  const item = cal.contentItems.find(
                    ci => (sub.item_id && ci.id === sub.item_id) ||
                          (sub.item_name && (ci.title === sub.item_name || ci.description === sub.item_name))
                  );
                  if (item && (item.assignedTo || '').toLowerCase() === creatorEmail) {
                    assignedToCreator = true;
                  }
                }
              }
              return (byThisCreator || assignedToCreator) && Array.isArray(sub.comments) && sub.comments.length > 0;
            }).length
          : 0;
        setReviewCount(count);
      } catch (err) {
        setReviewCount(0);
      }
    };

    fetchAssignments();
    fetchScheduledPosts();
    fetchReviewCount();
  }, [creatorEmail]);

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

  // Calculate stats from assignments
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const stats = {
    // New Assigned this week: use assignedAt/createdAt if available, else count all pending (initial state)
    newContentAssigned: assignments.filter(a => {
      const refDate = a.assignedAt || a.createdAt;
      if (refDate) return new Date(refDate) >= oneWeekAgo;
      return getActualStatus(a) === 'pending';
    }).length,
    contentWaitingInputs: assignments.filter(a => getActualStatus(a) === 'pending').length,
    contentApproved: assignments.filter(a => getActualStatus(a) === 'approved').length,
    contentPublished: assignments.filter(a => getActualStatus(a) === 'published').length,
    totalAssigned: assignments.length
  };

  // Recent assignments: show pending (newly assigned) items sorted by soonest due date
  const pendingRecentAssignments = assignments.filter(a => getActualStatus(a) === 'pending');
  const recentAssignments = (pendingRecentAssignments.length > 0 ? pendingRecentAssignments : assignments)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 3);

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('userEmail');
    navigate('/content-creator/login');
  };

  // Navigate to assignments with filter
  const goToAssignments = (filter) => {
    if (filter && filter !== 'all') {
      navigate(`/content-creator/assignments?filter=${filter}`);
    } else {
      navigate('/content-creator/assignments');
    }
  };

  const handleNavigation = (path) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0">
              <button
                className="mr-3 focus:outline-none flex-shrink-0"
                onClick={() => navigate('/content-creator')}
                aria-label="Go to Dashboard"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <Logo size="small" />
              </button>
              <span className="text-lg sm:text-xl font-bold text-gray-900 truncate">Content Creator Portal</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={handleUserMenuToggle}
                  className="flex items-center gap-1 p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <User className="h-5 w-5" />
                  <ChevronDown className="h-4 w-4" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg py-2 z-50 border border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
          <div className="space-y-6">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 sm:p-8 text-white">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome, Content Creator!</h1>
              <p className="text-purple-100 text-sm sm:text-base max-w-xl">Manage your content assignments and track your progress</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Total Assigned */}
              <div 
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all"
                onClick={() => goToAssignments('all')}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-indigo-50 rounded-xl flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Assigned</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.totalAssigned}</h3>
                  </div>
                </div>
              </div>

              {/* New Assigned This Week */}
              <div 
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all"
                onClick={() => goToAssignments('assigned')}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-blue-50 rounded-xl flex-shrink-0">
                    <PlusCircle className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">New This Week</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.newContentAssigned}</h3>
                  </div>
                </div>
              </div>

              {/* Pending */}
              <div 
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all"
                onClick={() => goToAssignments('pending')}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-orange-50 rounded-xl flex-shrink-0">
                    <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Pending</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.contentWaitingInputs}</h3>
                  </div>
                </div>
              </div>

              {/* Approved */}
              <div 
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-green-200 transition-all"
                onClick={() => goToAssignments('approved')}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-green-50 rounded-xl flex-shrink-0">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Approved</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.contentApproved}</h3>
                  </div>
                </div>
              </div>

              {/* Published */}
              <div 
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-purple-200 transition-all"
                onClick={() => goToAssignments('published')}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-purple-50 rounded-xl flex-shrink-0">
                    <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Published</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{stats.contentPublished}</h3>
                  </div>
                </div>
              </div>

              {/* Review Updates */}
              <div 
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 cursor-pointer hover:shadow-md hover:border-rose-200 transition-all"
                onClick={() => navigate('/content-creator/customer-feedback')}
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2.5 sm:p-3 bg-rose-50 rounded-xl flex-shrink-0">
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-rose-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Review Updates</p>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{reviewCount}</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Grid - 50/50 Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Assignments */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Clock className="h-5 w-5 text-purple-600" />
                      </div>
                      <h2 className="text-lg font-bold text-gray-900">Recent Assignments</h2>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      {recentAssignments.length} items
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-10 w-10 border-3 border-purple-200 border-t-purple-600"></div>
                    </div>
                  ) : recentAssignments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Palette className="h-8 w-8 text-purple-500" />
                      </div>
                      <p className="text-gray-600 font-medium">No assignments yet</p>
                      <p className="text-gray-400 text-sm mt-1">Your assignments will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentAssignments.map((assignment) => {
                        const status = getActualStatus(assignment);
                        const platforms = parsePlatforms(assignment.platform || assignment.type);
                        return (
                          <div 
                            key={assignment.id} 
                            className="group p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl hover:from-purple-50 hover:to-indigo-50 border border-gray-100 hover:border-purple-200 transition-all duration-300 cursor-pointer"
                            onClick={() => navigate(`/content-creator/content-details/${assignment.calendarId}/${assignment.itemIndex}`)}
                          >
                            {/* Title + Status Badge */}
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-gray-900 truncate group-hover:text-purple-900 flex-1">
                                {assignment.title || assignment.description || 'Untitled'}
                              </p>
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex-shrink-0 shadow-sm ${
                                status === 'assigned' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                                status === 'in_progress' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
                                status === 'pending' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' :
                                status === 'approved' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                                status === 'published' ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white' :
                                'bg-gray-500 text-white'
                              }`}>
                                {typeof status === 'string'
                                  ? (status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1))
                                  : 'Pending'}
                              </span>
                            </div>
                            {/* Customer Name */}
                            <div className="flex items-center gap-1 mt-1">
                              <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                              <p className="text-xs text-gray-500 truncate">{assignment.customerName || assignment.customer || 'Unknown Customer'}</p>
                            </div>
                            {/* Platform Pills */}
                            {platforms.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {platforms.map((p, i) => (
                                  <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-medium ${platformColor(p)}`}>
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* Due Date */}
                            <div className="flex items-center gap-1.5 mt-2">
                              <Clock className="h-3 w-3 text-gray-400" />
                              <p className="text-xs text-gray-500">
                                Due: {assignment.dueDate ? format(new Date(assignment.dueDate), 'MMM dd, yyyy') : 'N/A'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* View All Button */}
                      <button 
                        onClick={() => goToAssignments('all')}
                        className="w-full mt-2 py-3 text-sm font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
                      >
                        View All Assignments →
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <PlusCircle className="h-5 w-5 text-purple-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
                  </div>
                </div>
                <div className="p-5">
                  <div className="space-y-3">
                    <button 
                      onClick={() => goToAssignments('all')}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-100 hover:border-purple-200 transition-all duration-300 group"
                    >
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg group-hover:shadow-purple-200 transition-shadow">
                        <PlusCircle className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-purple-900">View All Assignments</span>
                        <p className="text-xs text-gray-500 mt-0.5">Browse and manage your tasks</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => navigate('/content-creator/portfolio')}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 border border-blue-100 hover:border-blue-200 transition-all duration-300 group"
                    >
                      <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg group-hover:shadow-blue-200 transition-shadow">
                        <Eye className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-blue-900">View My Portfolio</span>
                        <p className="text-xs text-gray-500 mt-0.5">See your completed work</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => navigate('/content-creator/profile')}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-100 hover:border-green-200 transition-all duration-300 group"
                    >
                      <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg group-hover:shadow-green-200 transition-shadow">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-green-900">Manage Profile</span>
                        <p className="text-xs text-gray-500 mt-0.5">Update your information</p>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => navigate('/content-creator/media-library')}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-100 hover:border-amber-200 transition-all duration-300 group"
                    >
                      <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg group-hover:shadow-amber-200 transition-shadow">
                        <FolderOpen className="h-5 w-5 text-white" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-bold text-gray-900 group-hover:text-amber-900">Media Library</span>
                        <p className="text-xs text-gray-500 mt-0.5">Upload and manage your files</p>
                      </div>
                    </button>


                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Click outside to close menu */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-[9]" 
          onClick={() => setIsUserMenuOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default Dashboard;