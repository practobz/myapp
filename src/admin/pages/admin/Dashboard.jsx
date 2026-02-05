import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Users, Calendar, TrendingUp, BarChart3, Activity, Zap, Award, UserCheck, Send, Palette } from 'lucide-react';

// Memoized stat card component to prevent unnecessary re-renders
const StatCard = React.memo(({ icon: Icon, iconBgClass, title, value, trend, onClick }) => (
  <div 
    onClick={onClick}
    className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group cursor-pointer"
  >
    <div className="flex items-center">
      <div className={`p-3 sm:p-4 ${iconBgClass} rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 flex-shrink-0`}>
        <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
      </div>
      <div className="ml-4 sm:ml-6 min-w-0">
        <p className="text-xs sm:text-sm font-semibold text-gray-600 uppercase tracking-wider truncate">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{value}</h3>
        <p className="text-xs sm:text-sm text-green-600 font-medium mt-1">{trend}</p>
      </div>
    </div>
  </div>
));

// Memoized quick action button
const QuickActionButton = React.memo(({ icon: Icon, label, gradientClass, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 sm:p-4 ${gradientClass} text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl min-h-[80px] sm:min-h-[100px]`}
  >
    <Icon className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2" />
    <span className="font-semibold text-xs sm:text-sm text-center leading-tight">{label}</span>
  </button>
));

// Memoized banner stat
const BannerStat = React.memo(({ icon: Icon, iconColor, label, value }) => (
  <div className="bg-white/10 rounded-xl p-3 sm:p-4 border border-white/20">
    <div className="flex items-center">
      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor} mr-2 sm:mr-3 flex-shrink-0`} />
      <div className="min-w-0">
        <p className="text-white/80 text-xs sm:text-sm truncate">{label}</p>
        <p className="text-white text-lg sm:text-xl font-bold">{value}</p>
      </div>
    </div>
  </div>
));

function Dashboard() {
  const { currentUser } = useAuth();
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [contentCreators, setContentCreators] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    
    try {
      // Parallel fetch for better performance
      const fetchPromises = [];
      
      // Fetch assigned customers for current admin
      if (currentUser && currentUser.role === 'admin') {
        fetchPromises.push(
          fetch(`${apiUrl}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`)
            .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
            .then(data => ({ type: 'customers', data }))
            .catch(() => ({ type: 'customers', data: [] }))
        );
      } else {
        fetchPromises.push(Promise.resolve({ type: 'customers', data: [] }));
      }

      // Fetch content creators
      fetchPromises.push(
        fetch(`${apiUrl}/users?role=content_creator`)
          .then(res => res.json())
          .then(data => ({ type: 'creators', data: Array.isArray(data) ? data : (data.creators || []) }))
          .catch(() => ({ type: 'creators', data: [] }))
      );

      // Fetch calendars
      fetchPromises.push(
        fetch(`${apiUrl}/calendars`)
          .then(res => res.json())
          .then(data => {
            const items = Array.isArray(data)
              ? data.flatMap(cal => Array.isArray(cal.contentItems) ? cal.contentItems : [])
              : [];
            return { type: 'content', data: items };
          })
          .catch(() => ({ type: 'content', data: [] }))
      );

      const results = await Promise.all(fetchPromises);
      
      results.forEach(result => {
        switch (result.type) {
          case 'customers':
            setAssignedCustomers(result.data);
            break;
          case 'creators':
            setContentCreators(result.data);
            break;
          case 'content':
            setContentItems(result.data);
            break;
        }
      });

    } catch (error) {
      setError('Error fetching dashboard data');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Memoized statistics to prevent recalculation on every render
  const stats = useMemo(() => ({
    totalCustomers: assignedCustomers.length,
    totalContentCreators: contentCreators.length,
    totalContentItems: contentItems.length,
    monthlyGrowth: "12.5%"
  }), [assignedCustomers.length, contentCreators.length, contentItems.length]);

  // Memoized navigation handlers
  const navigationHandlers = useMemo(() => ({
    customersList: () => navigate('/admin/customers-list'),
    contentCreators: () => navigate('/admin/content-creators'),
    customers: () => navigate('/admin/customers'),
    contentPortfolio: () => navigate('/admin/content-portfolio'),
    scheduledPosts: () => navigate('/admin/scheduled-posts'),
    qrGenerator: () => navigate('/admin/qr-generator')
  }), [navigate]);

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex justify-center items-center h-96">
          <span className="text-lg text-gray-600">Loading dashboard...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex justify-center items-center h-96">
          <span className="text-lg text-red-600">{error}</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0">
        {/* Welcome Section - Horizontal on mobile, expanded on desktop */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            {/* Header - Horizontal layout on mobile */}
            <div className="flex flex-row items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="p-2 sm:p-3 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl flex-shrink-0">
                <Activity className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl lg:text-4xl font-bold bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent leading-tight">
                  Welcome to Aureum Solutions
                </h1>
                <p className="text-blue-100 text-xs sm:text-sm lg:text-lg mt-1 sm:mt-2 line-clamp-2 sm:line-clamp-none">
                  Manage your social media content effectively
                </p>
              </div>
            </div>
            
            {/* Banner Stats - Vertical stack on mobile, horizontal on tablet+ */}
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              <BannerStat 
                icon={Zap} 
                iconColor="text-yellow-400" 
                label="Active Campaigns" 
                value={stats.totalCustomers} 
              />
              <BannerStat 
                icon={Award} 
                iconColor="text-green-400" 
                label="Success Rate" 
                value="94%" 
              />
              <BannerStat 
                icon={TrendingUp} 
                iconColor="text-blue-400" 
                label="Growth Rate" 
                value={stats.monthlyGrowth} 
              />
            </div>
          </div>
        </div>

        {/* Main Statistics - Stack vertically on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <StatCard 
            icon={Users}
            iconBgClass="bg-gradient-to-r from-blue-500 to-blue-600"
            title="Total Customers"
            value={stats.totalCustomers}
            trend="+5% from last month"
            onClick={navigationHandlers.customersList}
          />
          <StatCard 
            icon={UserCheck}
            iconBgClass="bg-gradient-to-r from-purple-500 to-purple-600"
            title="Content Creators"
            value={stats.totalContentCreators}
            trend="+8% from last month"
            onClick={navigationHandlers.contentCreators}
          />
          <StatCard 
            icon={Calendar}
            iconBgClass="bg-gradient-to-r from-emerald-500 to-emerald-600"
            title="Content Items"
            value={stats.totalContentItems}
            trend="+12% from last week"
            onClick={navigationHandlers.customers}
          />
        </div>

        {/* Quick Actions - Optimized grid for mobile */}
        <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-gray-200/50 p-4 sm:p-6 lg:p-8">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Quick Actions</h2>
          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
            <QuickActionButton 
              icon={Users}
              label="Customers"
              gradientClass="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500"
              onClick={navigationHandlers.customersList}
            />
            <QuickActionButton 
              icon={UserCheck}
              label="Creators"
              gradientClass="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:ring-purple-500"
              onClick={navigationHandlers.contentCreators}
            />
            <QuickActionButton 
              icon={Calendar}
              label="Calendar"
              gradientClass="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 focus:ring-emerald-500"
              onClick={navigationHandlers.customers}
            />
            <QuickActionButton 
              icon={Palette}
              label="Portfolio"
              gradientClass="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500"
              onClick={navigationHandlers.contentPortfolio}
            />
            <QuickActionButton 
              icon={Send}
              label="Scheduled"
              gradientClass="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 focus:ring-orange-500"
              onClick={navigationHandlers.scheduledPosts}
            />
            <QuickActionButton 
              icon={BarChart3}
              label="QR Codes"
              gradientClass="bg-gradient-to-r from-cyan-600 to-blue-400 hover:from-cyan-700 hover:to-blue-500 focus:ring-cyan-500"
              onClick={navigationHandlers.qrGenerator}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;