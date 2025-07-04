import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Calendar as CalendarIcon, Clock, FileText, TrendingUp, User, MessageSquare, CheckCircle } from 'lucide-react';
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
    scheduledContent: 0,
    contentWaitingInputs: 0,
    pendingReviews: 0,
    approvedContent: 0
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
        const scheduledContent = allItems.filter(i => i.status === 'scheduled').length;
        const contentWaitingInputs = allItems.filter(i => i.status === 'waiting_input').length;
        const pendingReviews = allItems.filter(i => i.status === 'under_review').length;
        const approvedContent = allItems.filter(i => i.status === 'approved' || i.status === 'published').length;

        setStats({
          totalPosts,
          contentCalendars,
          scheduledContent,
          contentWaitingInputs,
          pendingReviews,
          approvedContent
        });

        // Recent activity: last 4 items, sorted by date descending
        const recent = [...allItems]
          .filter(i => i.date)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 4) // Only 4 items
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
          scheduledContent: 0,
          contentWaitingInputs: 0,
          pendingReviews: 0,
          approvedContent: 0
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
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
            <div className="relative z-10">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent mb-2">
                Welcome{currentUser?.name ? `, ${currentUser.name}` : ''} to Aureum Solutions
              </h1>
              <p className="text-blue-100 text-lg">Track and manage your social media content effectively</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => navigate('/customer/posts')}>
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <LayoutGrid className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total Posts</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.totalPosts}</h3>
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => navigate('/customer/calendar')}>
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Content Calendars</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.contentCalendars}</h3>
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => navigate('/customer/calendar')}>
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Scheduled Content</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.scheduledContent}</h3>
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => navigate('/customer/content-review')}>
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Pending Reviews</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.pendingReviews}</h3>
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => navigate('/customer/content-review')}>
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Approved Content</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.approvedContent}</h3>
                </div>
              </div>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group cursor-pointer"
              onClick={() => navigate('/customer/calendar')}>
              <div className="flex items-center">
                <div className="p-3 bg-gradient-to-r from-red-500 to-red-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Waiting Inputs</p>
                  <h3 className="text-2xl font-bold text-gray-900">{stats.contentWaitingInputs}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Activity</h2>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">No recent activity found.</div>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                      <div>
                        <p className="font-semibold text-gray-900">{activity.platform}</p>
                        <p className="text-sm text-gray-600">{activity.date ? format(new Date(activity.date), 'MMM dd, yyyy') : ''}</p>
                      </div>
                    
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200/50">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
              <div className="space-y-4">
                <button 
                  onClick={() => navigate('/customer/calendar')}
                  className="w-full flex items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-200/50 group"
                >
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="ml-3 font-semibold text-gray-900">View Content Calendar</span>
                </button>
                
                <button 
                  onClick={() => navigate('/customer/content-review')}
                  className="w-full flex items-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl hover:from-purple-100 hover:to-pink-100 transition-all duration-200 border border-purple-200/50 group"
                >
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <MessageSquare className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="ml-3 font-semibold text-gray-900">Review Content</span>
                </button>
                
                <button 
                  onClick={() => navigate('/customer/settings')}
                  className="w-full flex items-center p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl hover:from-emerald-100 hover:to-green-100 transition-all duration-200 border border-emerald-200/50 group"
                >
                  <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                    <User className="h-5 w-5 text-emerald-600" />
                  </div>
                  <span className="ml-3 font-semibold text-gray-900">Manage Settings</span>
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