import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, Calendar as CalendarIcon, TrendingUp, FileText, MessageSquare, Image as ImageIcon, Send, BarChart3 } from 'lucide-react';
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
        // Helper: check if item is published
        const isItemPublished = (item) => {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#e6f2fb]">
      {/* Header */}
    

      {/* Main Content */}
      <div className="flex justify-center min-h-screen">
        <div className="w-full max-w-5xl px-2 sm:px-4 py-8">
          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gradient-to-r from-[#0a2342] to-[#38bdf8] rounded-lg shadow-lg p-8 text-white">
              <h1 className="text-3xl font-bold mb-2">
                Welcome{currentUser?.name ? `, ${currentUser.name}` : ''} to Aureum Solutions
              </h1>
              <p className="text-blue-100 text-lg">Track and manage your social media content effectively</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Posts */}
              <div 
                className="bg-white rounded-lg shadow-sm border border-[#0a2342]/10 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('')}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[#bae6fd] rounded-lg flex items-center justify-center">
                      <LayoutGrid className="h-6 w-6 text-[#0a2342]" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#0a2342] uppercase tracking-wide">Total Posts</p>
                    <p className="text-3xl font-bold text-[#0a2342]">{stats.totalPosts}</p>
                  </div>
                </div>
              </div>

              {/* Content Calendars */}
              <div 
                className="bg-white rounded-lg shadow-sm border border-[#0a2342]/10 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('/customer/calendar')}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[#7dd3fc] rounded-lg flex items-center justify-center">
                      <CalendarIcon className="h-6 w-6 text-[#0a2342]" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#0a2342] uppercase tracking-wide">Content Calendars</p>
                    <p className="text-3xl font-bold text-[#0a2342]">{stats.contentCalendars}</p>
                  </div>
                </div>
              </div>

              {/* Published Content */}
              <div 
                className="bg-white rounded-lg shadow-sm border border-[#0a2342]/10 p-6 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate('')}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-[#38bdf8] rounded-lg flex items-center justify-center">
                      <Send className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-[#0a2342] uppercase tracking-wide">Published Content</p>
                    <p className="text-3xl font-bold text-[#0a2342]">{stats.publishedContent}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow-sm border border-[#0a2342]/10 p-6">
                <h2 className="text-lg font-semibold text-[#0a2342] mb-4">Recent Activity</h2>
                <div className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <div className="text-[#0a2342]/60 text-center py-8 text-sm">No recent activity found.</div>
                  ) : (
                    recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between p-3 bg-[#e6f2fb] rounded-lg">
                        <div>
                          <p className="font-medium text-[#0a2342] text-sm">{activity.platform}</p>
                          <p className="text-xs text-[#0a2342]/60">
                            {activity.date ? format(new Date(activity.date), 'MMM dd, yyyy') : ''}
                          </p>
                        </div>
                       
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow-sm border border-[#0a2342]/10 p-6">
                <h2 className="text-lg font-semibold text-[#0a2342] mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <button 
                    onClick={() => navigate('/customer/calendar')}
                    className="w-full flex items-center p-3 text-left bg-[#bae6fd] hover:bg-[#7dd3fc] rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-[#0a2342] rounded-lg flex items-center justify-center mr-3">
                      <CalendarIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-[#0a2342]">View Content Calendar</span>
                  </button>
                  
                  <button 
                    onClick={() => navigate('/customer/content-review')}
                    className="w-full flex items-center p-3 text-left bg-[#7dd3fc] hover:bg-[#38bdf8] rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-[#0a2342] rounded-lg flex items-center justify-center mr-3">
                      <MessageSquare className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-[#0a2342]">Review Content</span>
                  </button>
                  
                  <button 
                    onClick={() => navigate('/customer/media-library')}
                    className="w-full flex items-center p-3 text-left bg-[#e0f2fe] hover:bg-[#bae6fd] rounded-lg transition-colors"
                  >
                    <div className="w-8 h-8 bg-[#0a2342] rounded-lg flex items-center justify-center mr-3">
                      <ImageIcon className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-medium text-[#0a2342]">Manage Media Library</span>
                  </button>

                  

                  <button 
                    onClick={() => navigate('/customer/roi-dashboard')}
                    className="w-full flex items-center p-3 text-left bg-gradient-to-r from-[#38bdf8]/20 to-[#0ea5e9]/20 hover:from-[#38bdf8]/30 hover:to-[#0ea5e9]/30 rounded-lg transition-all border border-[#38bdf8]/20"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-[#38bdf8] to-[#0ea5e9] rounded-lg flex items-center justify-center mr-3">
                      <BarChart3 className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-[#0a2342]">ROI Analytics Dashboard</span>
                      <span className="text-xs text-[#0a2342]/70">Comprehensive social media ROI tracking</span>
                    </div>
                  </button>
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