import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Calendar as CalendarIcon, Clock, FileText, TrendingUp, User, Bell, ChevronDown, MessageSquare, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useAuth } from '../admin/contexts/AuthContext';

function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Mock data for demonstration
  const stats = {
    totalPosts: 24,
    contentCalendars: 3,
    scheduledContent: 8,
    contentWaitingInputs: 5,
    pendingReviews: 3,
    approvedContent: 12
  };

  const recentActivity = [
    { id: 1, type: 'post', platform: 'Instagram', status: 'Published', date: '2024-03-15' },
    { id: 2, type: 'post', platform: 'LinkedIn', status: 'Under Review', date: '2024-03-16' },
    { id: 3, type: 'post', platform: 'Facebook', status: 'Draft', date: '2024-03-17' }
  ];

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/customer/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsUserMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
 

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-[#1a1f2e] to-[#2d3546] rounded-lg shadow-lg p-6 text-white">
            <h1 className="text-3xl font-bold mb-2 text-blue-300">Welcome to Aureum Solutions</h1>
            <p className="text-gray-300">Track and manage your social media content</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-full">
                  <LayoutGrid className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Posts</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalPosts}</h3>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/customer/calendar')}
            >
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-full">
                  <CalendarIcon className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Content Calendars</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.contentCalendars}</h3>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/customer/calendar')}
            >
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <Clock className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Scheduled Content</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.scheduledContent}</h3>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/customer/content-review')}
            >
              <div className="flex items-center">
                <div className="p-3 bg-orange-100 rounded-full">
                  <MessageSquare className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Pending Reviews</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</h3>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/customer/content-review')}
            >
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Approved Content</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.approvedContent}</h3>
                </div>
              </div>
            </div>

            <div 
              className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => navigate('/customer/calendar')}
            >
              <div className="flex items-center">
                <div className="p-3 bg-red-100 rounded-full">
                  <FileText className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Content Waiting Inputs</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.contentWaitingInputs}</h3>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between border-b pb-4">
                    <div>
                      <p className="font-medium">{activity.platform}</p>
                      <p className="text-sm text-gray-500">{format(new Date(activity.date), 'MMM dd, yyyy')}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      activity.status === 'Published' ? 'bg-green-100 text-green-800' :
                      activity.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {activity.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/customer/calendar')}
                  className="w-full text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <CalendarIcon className="h-5 w-5 text-gray-600 mr-3" />
                    <span>View Content Calendar</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/customer/content-review')}
                  className="w-full text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <MessageSquare className="h-5 w-5 text-gray-600 mr-3" />
                    <span>Review Content</span>
                  </div>
                </button>
                <button 
                  onClick={() => navigate('/customer/settings')}
                  className="w-full text-left p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-600 mr-3" />
                    <span>Manage Settings</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

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