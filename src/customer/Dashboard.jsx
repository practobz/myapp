import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Calendar as CalendarIcon, TrendingUp, FileText, MessageSquare, Image as ImageIcon, Send } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../admin/contexts/AuthContext';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Stats and activity state
  const [stats, setStats] = useState({
    totalPosts: 0,
    contentCalendars: 0,
    publishedContent: 0
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !currentUser._id) {
      setLoading(false);
      return;
    }
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch all calendars
        const calendarsRes = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await calendarsRes.json();

        // Only calendars for this customer
        const customerCalendars = calendars.filter(c =>
          c.customerId === currentUser._id || c.customerId === currentUser.id
        );

        // Flatten all content items
        let allItems = [];
        customerCalendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            calendar.contentItems.forEach(item => {
              allItems.push({
                ...item,
                calendarName: calendar.name || '',
                id: item.id || item._id || Math.random().toString(36).slice(2),
                creator: item.assignedToName || item.assignedTo || calendar.assignedToName || calendar.assignedTo || '',
              });
            });
          }
        });

        // Stats calculation
        const totalPosts = allItems.length;
        const contentCalendars = customerCalendars.length;
        const publishedContent = allItems.filter(i => i.status === 'published').length;

        setStats({
          totalPosts,
          contentCalendars,
          publishedContent
        });

        // Recent activity: last 4 items, sorted by date descending
        const recent = [...allItems]
          .filter(i => i.date)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 4)
          .map(item => ({
            id: item.id,
            platform: item.title || item.description || item.creator || 'Content',
            date: item.date,
            status: item.status ? item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown'
          }));
        setRecentActivity(recent);

      } catch (err) {
        setStats({
          totalPosts: 0,
          contentCalendars: 0,
          publishedContent: 0
        });
        setRecentActivity([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [currentUser]);

  const handleUserMenuToggle = () => setIsUserMenuOpen(!isUserMenuOpen);
  const handleLogout = () => { logout(); navigate('/customer/login'); };
  const handleNavigation = (path) => { navigate(path); setIsUserMenuOpen(false); };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
    

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-lg shadow-lg p-8 text-white">
            <h1 className="text-3xl font-bold mb-2">
              Welcome{currentUser?.name ? `, ${currentUser.name}` : ''} to Aureum Solutions
            </h1>
            <p className="text-blue-100 text-lg">Track and manage your social media content effectively</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Posts */}
            <div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/customer/posts')}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <LayoutGrid className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Posts</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalPosts}</p>
                </div>
              </div>
            </div>

            {/* Content Calendars */}
            <div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/customer/calendar')}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <CalendarIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Content Calendars</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.contentCalendars}</p>
                </div>
              </div>
            </div>

            {/* Published Content */}
            <div 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate('/customer/posts')}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Send className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Published Content</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.publishedContent}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {recentActivity.length === 0 ? (
                  <div className="text-gray-500 text-center py-8 text-sm">No recent activity found.</div>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{activity.platform}</p>
                        <p className="text-xs text-gray-500">
                          {activity.date ? format(new Date(activity.date), 'MMM dd, yyyy') : ''}
                        </p>
                      </div>
                     
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <button 
                  onClick={() => navigate('/customer/calendar')}
                  className="w-full flex items-center p-3 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <CalendarIcon className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900">View Content Calendar</span>
                </button>
                
                <button 
                  onClick={() => navigate('/customer/content-review')}
                  className="w-full flex items-center p-3 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mr-3">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900">Review Content</span>
                </button>
                
                <button 
                  onClick={() => navigate('/customer/media-library')}
                  className="w-full flex items-center p-3 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                    <ImageIcon className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900">Manage Media Library</span>
                </button>

                <button 
                  onClick={() => navigate('/customer/social-analytics-dashboard')}
                  className="w-full flex items-center p-3 text-left bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-medium text-gray-900">Social ROI & Analytics Dashboard</span>
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