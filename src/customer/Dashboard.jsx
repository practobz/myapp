import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Calendar as CalendarIcon, TrendingUp, FileText, MessageSquare, Image as ImageIcon, Send, BarChart3, Activity, ArrowUpRight, Clock } from 'lucide-react';
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

        // --- Fetch scheduled posts for this customer ---
        const postsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
        let postsData = await postsRes.json();
        if (!Array.isArray(postsData)) postsData = [];
        // Only posts for this customer
        const customerPosts = postsData.filter(p =>
          (p.customerId === currentUser._id || p.customerId === currentUser.id) &&
          p.status === 'published'
        );
        // Helper: check if item is published (via scheduled posts OR manual publish)
        const isItemPublished = (item) => {
          // Check manual publish flag first
          if (item.published === true) return true;
          // Check scheduled posts
          return customerPosts.some(post =>
            (post.item_id && post.item_id === item.id) ||
            (post.contentId && post.contentId === item.id) ||
            (post.item_name && post.item_name === item.title)
          );
        };
        // --- End ---

        // Stats calculation
        const totalPosts = allItems.length;
        const contentCalendars = customerCalendars.length;
        // Use scheduled posts logic for publishedContent
        const publishedContent = allItems.filter(i => isItemPublished(i)).length;

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
            status: isItemPublished(item)
              ? 'Published'
              : (item.status ? item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Unknown')
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-blue-400 animate-ping mx-auto opacity-20"></div>
          </div>
          <p className="mt-6 text-slate-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Content */}
      <div className="min-h-screen sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
        <div className="w-full mx-auto py-0">
          <div className="space-y-8">
            {/* Welcome Section - Professional Header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 rounded-2xl shadow-xl">
              <div className="absolute inset-0 bg-black/10"></div>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjYSkiLz48L3N2Zz4=')] opacity-30"></div>
              <div className="relative px-8 py-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">
                      Welcome back{currentUser?.name ? `, ${currentUser.name}` : ''}!
                    </h1>
                    <p className="text-blue-50 text-lg font-medium flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Track and manage your social media content effectively
                    </p>
                    <p className="text-blue-100/80 text-sm mt-2">
                      {format(new Date(), 'EEEE, MMMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="hidden lg:block">
                    <div className="w-32 h-32 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border-4 border-white/20">
                      <TrendingUp className="h-16 w-16 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid - Modern Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {/* Total Posts */}
              <div 
                className="group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200"
                onClick={() => navigate('')}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <LayoutGrid className="h-7 w-7 text-white" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Posts</p>
                  <p className="text-4xl font-bold text-slate-800 mb-1">{stats.totalPosts}</p>
                  <p className="text-xs text-slate-500">All content items</p>
                </div>
              </div>

              {/* Content Calendars */}
              <div 
                className="group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200"
                onClick={() => navigate('/customer/calendar')}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <CalendarIcon className="h-7 w-7 text-white" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Content Calendars</p>
                  <p className="text-4xl font-bold text-slate-800 mb-1">{stats.contentCalendars}</p>
                  <p className="text-xs text-slate-500">Active calendars</p>
                </div>
              </div>

              {/* Published Content */}
              <div 
                className="group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200"
                onClick={() => navigate('')}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Send className="h-7 w-7 text-white" />
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Published Content</p>
                  <p className="text-4xl font-bold text-slate-800 mb-1">{stats.publishedContent}</p>
                  <p className="text-xs text-slate-500">Live posts</p>
                </div>
              </div>
            </div>

            {/* Bottom Section - Enhanced Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Recent Activity</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {recentActivity.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Activity className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-slate-500 font-medium">No recent activity</p>
                        <p className="text-sm text-slate-400 mt-1">Your content activity will appear here</p>
                      </div>
                    ) : (
                      recentActivity.map((activity) => (
                        <div key={activity.id} className="group flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50/50 hover:from-blue-50 hover:to-indigo-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all duration-200">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-indigo-100 group-hover:bg-indigo-200 rounded-lg flex items-center justify-center transition-colors duration-200">
                              <FileText className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-800 text-sm group-hover:text-indigo-700 transition-colors">{activity.platform}</p>
                              <p className="text-xs text-slate-500 flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {activity.date ? format(new Date(activity.date), 'MMM dd, yyyy') : 'N/A'}
                              </p>
                            </div>
                          </div>
                          {/* Status badge removed as per user request */}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Quick Actions</h2>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    <button 
                      onClick={() => navigate('/customer/calendar')}
                      className="group w-full flex items-center p-4 text-left bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 rounded-xl transition-all duration-200 border border-indigo-100 hover:border-indigo-200 hover:shadow-md"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                        <CalendarIcon className="h-6 w-6 text-white" />
                      </div>
                      <span className="ml-4 font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">View Content Calendar</span>
                      <ArrowUpRight className="ml-auto h-5 w-5 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-200" />
                    </button>
                    
                    <button 
                      onClick={() => navigate('/customer/content-review')}
                      className="group w-full flex items-center p-4 text-left bg-gradient-to-r from-blue-50 to-cyan-50 hover:from-blue-100 hover:to-cyan-100 rounded-xl transition-all duration-200 border border-blue-100 hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                        <MessageSquare className="h-6 w-6 text-white" />
                      </div>
                      <span className="ml-4 font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">Review Content</span>
                      <ArrowUpRight className="ml-auto h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-200" />
                    </button>
                    
                    <button 
                      onClick={() => navigate('/customer/media-library')}
                      className="group w-full flex items-center p-4 text-left bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 rounded-xl transition-all duration-200 border border-violet-100 hover:border-violet-200 hover:shadow-md"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                        <ImageIcon className="h-6 w-6 text-white" />
                      </div>
                      <span className="ml-4 font-semibold text-slate-800 group-hover:text-violet-700 transition-colors">Manage Media Library</span>
                      <ArrowUpRight className="ml-auto h-5 w-5 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-200" />
                    </button>

                    <button 
                      onClick={() => navigate('/customer/roi-dashboard')}
                      className="group w-full flex items-center p-4 text-left bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 rounded-xl transition-all duration-200 border border-emerald-100 hover:border-emerald-200 hover:shadow-md"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-200">
                        <BarChart3 className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-4 flex flex-col flex-1">
                        <span className="font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">ROI Analytics Dashboard</span>
                        <span className="text-xs text-slate-500 mt-0.5">Comprehensive social media ROI tracking</span>
                      </div>
                      <ArrowUpRight className="ml-2 h-5 w-5 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-200" />
                    </button>
                  </div>
                </div>
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