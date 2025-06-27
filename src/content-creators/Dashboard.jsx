import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Clock, MessageSquare, CheckCircle, Globe, User, Bell, ChevronDown, Palette, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from "../admin/contexts/AuthContext";
import Logo from '../admin/components/layout/Logo';
import Footer from '../admin/components/layout/Footer';

function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Mock data for content creator dashboard
  const stats = {
    newContentAssigned: 8,
    contentWaitingInputs: 3,
    contentApproved: 12,
    contentPublished: 45
  };

  const recentAssignments = [
    { id: 1, customer: 'Shoppers Stop', type: 'Instagram Post', dueDate: '2024-03-18', status: 'assigned' },
    { id: 2, customer: 'Pantaloons', type: 'Facebook Campaign', dueDate: '2024-03-19', status: 'in_progress' },
    { id: 3, customer: 'Fashion Hub', type: 'LinkedIn Article', dueDate: '2024-03-20', status: 'waiting_input' }
  ];

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/content-creator/login');
  };

  const handleNavigation = (path) => {
    // Only navigate if the page exists
    // For not-yet-created pages, do nothing
    // Example: if (path === '/content-creator/profile') return;
    // For now, disable all navigation for not-yet-created pages
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
                      // onClick={() => handleNavigation('/content-creator/profile')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Profile
                    </button>
                    <button
                      // onClick={() => handleNavigation('/content-creator/settings')}
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
                onClick={() => navigate('/content-creator/assignments')}
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
                // onClick={() => navigate('/content-creator/assignments')}
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
                // onClick={() => navigate('/content-creator/assignments')}
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
                // onClick={() => navigate('/content-creator/assignments')}
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
                  {recentAssignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between border-b pb-4">
                      <div>
                        <p className="font-medium">{assignment.customer}</p>
                        <p className="text-sm text-gray-500">{assignment.type}</p>
                        <p className="text-xs text-gray-400">Due: {format(new Date(assignment.dueDate), 'MMM dd, yyyy')}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        assignment.status === 'assigned' ? 'bg-blue-100 text-blue-800' :
                        assignment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        assignment.status === 'waiting_input' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {assignment.status.replace('_', ' ').charAt(0).toUpperCase() + assignment.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6 w-full min-w-0">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button 
                    onClick={() => navigate('/content-creator/assignments')}
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
                    // onClick={() => navigate('/content-creator/upload')}
                    className="w-full text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-600 mr-3" />
                      <span>Upload Content</span>
                    </div>
                  </button>
                  <button 
                    // onClick={() => navigate('/content-creator/profile')}
                    className="w-full text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-600 mr-3" />
                      <span>Manage Profile</span>
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