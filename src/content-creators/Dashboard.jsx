import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Clock, MessageSquare, CheckCircle, Globe, User, Bell, ChevronDown, Palette, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from "../admin/contexts/AuthContext";
import Logo from '../admin/components/layout/Logo';
import Footer from '../admin/components/layout/Footer';

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
        const res = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await res.json();
        let allAssignments = [];
        calendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            calendar.contentItems.forEach(item => {
              allAssignments.push({
                ...item,
                customerName: calendar.customerName || calendar.name || calendar.customer || '',
                customerId: calendar.customerId || calendar.customer_id || calendar.customer?._id || '',
                customer: calendar.customer || calendar.customerName || calendar.name || '',
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
    fetchAssignments();
  }, [creatorEmail]);

  // Calculate stats from assignments
  const stats = {
    newContentAssigned: assignments.filter(a => (a.status || 'assigned') === 'assigned').length,
    contentWaitingInputs: assignments.filter(a => (a.status || 'assigned') === 'waiting_input').length,
    contentApproved: assignments.filter(a => (a.status || 'assigned') === 'approved').length,
    contentPublished: assignments.filter(a => (a.status || 'assigned') === 'published').length
  };

  // Recent assignments (show last 3 by due date)
  const recentAssignments = [...assignments]
    .sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate))
    .slice(0, 3);

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    logout();
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center min-w-0">
              {/* Logo in the top left corner */}
              <button
                className="mr-2 focus:outline-none"
                onClick={() => navigate('/content-creator')}
                aria-label="Go to Dashboard"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <Logo size="small" />
              </button>
              <span className="ml-2 text-base sm:text-xl font-bold text-purple-900 truncate">Content Creator Portal</span>
            </div>

            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {/* Notifications */}
              <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={handleUserMenuToggle}
                  className="flex items-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <User className="h-4 w-4" />
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                    <button
                      onClick={() => handleNavigation('/content-creator/profile')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Profile
                    </button>
                    <button
                      onClick={() => handleNavigation('/content-creator/settings')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Settings
                    </button>
                    <hr className="my-1" />
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
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
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="space-y-3 sm:space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-3 sm:p-4 md:p-6 text-white">
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome, Content Creator!</h1>
              <p className="text-purple-100 text-sm sm:text-base">Manage your content assignments and track your progress</p>
            </div>

            <div className="flex flex-col gap-3 md:grid md:grid-cols-4 md:gap-6">
              <div 
                className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 cursor-pointer hover:shadow-lg transition-shadow w-full min-w-0"
                onClick={() => goToAssignments('assigned')}
              >
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-full">
                    <PlusCircle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">New Content Assigned</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.newContentAssigned}</h3>
                  </div>
                </div>
              </div>

              <div 
                className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 cursor-pointer hover:shadow-lg transition-shadow w-full min-w-0"
                onClick={() => goToAssignments('waiting_input')}
              >
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-full">
                    <MessageSquare className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Content Waiting Inputs</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.contentWaitingInputs}</h3>
                  </div>
                </div>
              </div>

              <div 
                className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 cursor-pointer hover:shadow-lg transition-shadow w-full min-w-0"
                onClick={() => goToAssignments('approved')}
              >
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Content Approved</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.contentApproved}</h3>
                  </div>
                </div>
              </div>

              <div 
                className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 cursor-pointer hover:shadow-lg transition-shadow w-full min-w-0"
                onClick={() => goToAssignments('published')}
              >
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-full">
                    <Globe className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Content Published</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.contentPublished}</h3>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 w-full min-w-0">
                <h2 className="text-xl font-semibold mb-4">Recent Assignments</h2>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-gray-400 text-sm">Loading...</div>
                  ) : recentAssignments.length === 0 ? (
                    <div className="text-gray-400 text-sm">No recent assignments.</div>
                  ) : (
                    recentAssignments.map((assignment) => {
                      // Defensive: fallback for status
                      const status = assignment.status || 'assigned';
                      return (
                        <div key={assignment.id} className="flex items-center justify-between border-b pb-4">
                          <div>
                            <p className="font-medium">{assignment.customerName || assignment.customer || ''}</p>
                            <p className="text-sm text-gray-500">{assignment.type}</p>
                            <p className="text-xs text-gray-400">Due: {format(new Date(assignment.dueDate), 'MMM dd, yyyy')}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm ${
                            status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                            status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            status === 'waiting_input' ? 'bg-orange-100 text-orange-800' :
                            status === 'approved' ? 'bg-green-100 text-green-800' :
                            status === 'published' ? 'bg-purple-100 text-purple-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {typeof status === 'string'
                              ? (status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1))
                              : 'Assigned'}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 w-full min-w-0">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button 
                    onClick={() => goToAssignments('all')}
                    className="w-full text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <PlusCircle className="h-5 w-5 text-gray-600 mr-3" />
                      <span>View All Assignments</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => navigate('/content-creator/portfolio')}
                    className="w-full text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <Eye className="h-5 w-5 text-gray-600 mr-3" />
                      <span>View My Portfolio</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => navigate('/content-creator/profile')}
                    className="w-full text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-600 mr-3" />
                      <span>Manage Profile</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => navigate('/content-creator/settings')}
                    className="w-full text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-600 mr-3" />
                      <span>Settings</span>
                    </div>
                  </button>
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
          className="fixed inset-0 z-40" 
          onClick={() => setIsUserMenuOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default Dashboard;