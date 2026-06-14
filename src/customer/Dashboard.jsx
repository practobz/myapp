import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Calendar as CalendarIcon, TrendingUp, FileText, MessageSquare, Image as ImageIcon, Send, BarChart3, Activity, ArrowUpRight, Clock, AlertCircle, Eye } from 'lucide-react';
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
    publishedContent: 0,
    pendingContent: 0,
    underReviewContent: 0
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

        // --- Fetch scheduled posts and submissions for this customer ---
        const [postsRes, submissionsRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`),
          fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`),
        ]);
        let postsData = await postsRes.json();
        if (!Array.isArray(postsData)) postsData = [];
        let submissionsData = await submissionsRes.json();
        if (!Array.isArray(submissionsData)) submissionsData = [];

        // Only posts for this customer (published)
        const customerPosts = postsData.filter(p =>
          (p.customerId === currentUser._id || p.customerId === currentUser.id) &&
          p.status === 'published'
        );
        // Submissions for this customer (only admin-approved content visible to customer)
        const customerSubmissions = submissionsData.filter(s =>
          s.submission_stage === 'customer' &&
          (s.customer_id === (currentUser._id || currentUser.id) ||
            s.customer_email === currentUser.email)
        );

        // Helper: check if item is published (via scheduled posts OR manual publish)
        const isItemPublished = (item) => {
          if (item.published === true) return true;
          return customerPosts.some(post =>
            (post.item_id && post.item_id === item.id) ||
            (post.contentId && post.contentId === item.id) ||
            (post.item_name && post.item_name === item.title)
          );
        };
        // Helper: check if item has a submission (content uploaded for review)
        const hasContentSubmitted = (item) =>
          customerSubmissions.some(sub =>
            (sub.item_id && sub.item_id === item.id) ||
            (sub.assignment_id && sub.assignment_id === item.id) ||
            (sub.item_name && sub.item_name === item.title)
          );
        // --- End ---

        // Stats calculation
        const totalPosts = allItems.length;
        const contentCalendars = customerCalendars.length;
        const publishedContent = allItems.filter(i => isItemPublished(i)).length;
        const underReviewContent = allItems.filter(i => !isItemPublished(i) && (i.status === 'under_review' || hasContentSubmitted(i))).length;
        const pendingContent = allItems.filter(i => !isItemPublished(i) && !hasContentSubmitted(i) && (!i.status || i.status === 'pending')).length;

        setStats({
          totalPosts,
          contentCalendars,
          publishedContent,
          pendingContent,
          underReviewContent
        });

        // Recent activity: last 6 items, sorted by date descending
        const recent = [...allItems]
          .filter(i => i.date)
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .slice(0, 6)
          .map(item => {
            let statusStr = 'Pending';
            if (isItemPublished(item)) {
              statusStr = 'Published';
            } else if (item.status === 'approved') {
              statusStr = 'Approved';
            } else if (item.status === 'under_review' || hasContentSubmitted(item)) {
              statusStr = 'Under Review';
            } else if (item.status) {
              statusStr = item.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            }

            return {
              id: item.id,
              itemName: item.title || item.description || 'Untitled Content',
              calendarName: item.calendarName || 'General Calendar',
              date: item.date,
              status: statusStr
            };
          });
        setRecentActivity(recent);

      } catch (err) {
        setStats({
          totalPosts: 0,
          contentCalendars: 0,
          publishedContent: 0,
          pendingContent: 0,
          underReviewContent: 0
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
      <div className="min-h-screen">
        <div className="w-full mx-auto py-0">
          <div className="space-y-5">
            {/* Welcome Section - Professional Header */}
            <div
              className="relative overflow-hidden bg-indigo-900 rounded-2xl shadow-xl bg-cover bg-center"
              style={{ backgroundImage: "url('/banner.png')" }}
            >
              <div className="absolute inset-0 bg-slate-900/40"></div>
              <div className="relative px-6 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
                      Welcome back{currentUser?.name ? `, ${currentUser.name}` : ''}!
                    </h1>
                    <p className="text-blue-50 text-base font-medium flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Track and manage your social media content effectively
                    </p>
                    <p className="text-blue-100/80 text-xs sm:text-sm mt-1.5">
                      {format(new Date(), 'EEEE, MMMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="hidden lg:block">
                    <button
                      onClick={() => navigate('/customer/roi-dashboard')}
                      title="View ROI Analytics Dashboard"
                      className="w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/20 transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    >
                      <ArrowUpRight className="h-8 w-8 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid - Modern Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Content Calendars */}
              <div
                className="group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200"
                onClick={() => navigate('/customer/calendar')}
              >
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative p-3 sm:p-5">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <CalendarIcon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate">Calendars</p>
                  <p className="text-2xl sm:text-4xl font-extrabold text-slate-800 leading-none mb-0.5">{stats.contentCalendars}</p>
                  <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Active calendars</p>
                </div>
              </div>

              {/* Published Content */}
              <div
                className="group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200"
                onClick={() => navigate('/customer/calendar?filter=published')}
              >
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative p-3 sm:p-5">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <Send className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate">Published</p>
                  <p className="text-2xl sm:text-4xl font-extrabold text-slate-800 leading-none mb-0.5">{stats.publishedContent}</p>
                  <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Live posts</p>
                </div>
              </div>

              {/* Pending Content */}
              <div
                className="group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200"
                onClick={() => navigate('/customer/calendar?filter=pending')}
              >
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative p-3 sm:p-5">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <AlertCircle className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate">Pending</p>
                  <p className="text-2xl sm:text-4xl font-extrabold text-slate-800 leading-none mb-0.5">{stats.pendingContent}</p>
                  <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Awaiting submission</p>
                </div>
              </div>

              {/* Under Review Content */}
              <div
                className="group relative bg-white rounded-xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-slate-200"
                onClick={() => navigate('/customer/content-review?filter=under_review')}
              >
                <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full -mr-12 -mt-12 sm:-mr-16 sm:-mt-16 group-hover:scale-150 transition-transform duration-500"></div>
                <div className="relative p-3 sm:p-5">
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="w-9 h-9 sm:w-12 sm:h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                      <Eye className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-violet-600 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-300" />
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider mb-0.5 truncate">Under Review</p>
                  <p className="text-2xl sm:text-4xl font-extrabold text-slate-800 leading-none mb-0.5">{stats.underReviewContent}</p>
                  <p className="text-xs sm:text-sm text-slate-500 hidden sm:block">Being reviewed</p>
                </div>
              </div>
            </div>

            {/* Bottom Section - Enhanced Layout */}
            <div className="w-full">
              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-5 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Clock className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Recent Activity</h2>
                  </div>
                  <div className="text-xs text-slate-500 font-medium">
                    Showing latest content updates
                  </div>
                </div>
                <div className="p-6">
                  {recentActivity.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Activity className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium">No recent activity</p>
                      <p className="text-sm text-slate-400 mt-1">Your content activity will appear here</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead>
                          <tr className="text-left text-sm font-bold text-slate-700 uppercase tracking-wider">
                            <th className="pb-4 pt-2">Content Item</th>
                            <th className="pb-4 pt-2">Calendar Name</th>
                            <th className="pb-4 pt-2">Scheduled Date</th>
                            <th className="pb-4 pt-2 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {recentActivity.map((activity) => (
                            <tr
                              key={activity.id}
                              onClick={() => navigate(`/customer/content-review?itemId=${activity.id}`)}
                              className="group hover:bg-slate-50/80 cursor-pointer transition-colors duration-150"
                            >
                              <td className="py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-indigo-50 group-hover:bg-indigo-100 rounded-lg flex items-center justify-center transition-colors duration-150 flex-shrink-0">
                                    <FileText className="h-5 w-5 text-indigo-600" />
                                  </div>
                                  <div className="font-bold text-slate-800 text-base group-hover:text-indigo-700 transition-colors truncate max-w-[240px] sm:max-w-xs md:max-w-md" title={activity.itemName}>
                                    {activity.itemName}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-slate-100 text-slate-800">
                                  {activity.calendarName}
                                </span>
                              </td>
                              <td className="py-4 whitespace-nowrap text-base text-slate-600">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-5 w-5 text-slate-400" />
                                  {activity.date ? format(new Date(activity.date), 'MMM dd, yyyy') : 'N/A'}
                                </div>
                              </td>
                              <td className="py-4 whitespace-nowrap text-right">
                                <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-bold ${activity.status === 'Published'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : activity.status === 'Approved'
                                      ? 'bg-teal-100 text-teal-800'
                                      : activity.status === 'Under Review'
                                        ? 'bg-indigo-100 text-indigo-800'
                                        : 'bg-amber-100 text-amber-800'
                                  }`}>
                                  <span className={`w-2 h-2 mr-2 rounded-full ${activity.status === 'Published'
                                      ? 'bg-emerald-500'
                                      : activity.status === 'Approved'
                                        ? 'bg-teal-500'
                                        : activity.status === 'Under Review'
                                          ? 'bg-indigo-500'
                                          : 'bg-amber-500'
                                    }`}></span>
                                  {activity.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
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