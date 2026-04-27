import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../admin/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../admin/components/layout/AdminLayout';
import { Users, Calendar, TrendingUp, BarChart3, Activity, Zap, Award, UserCheck, Send, Palette, CheckCircle2, RefreshCw } from 'lucide-react';

// Skeleton loader for stat cards
const StatCardSkeleton = () => (
  <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200/50 animate-pulse">
    <div className="flex items-center">
      <div className="p-3 sm:p-4 bg-gray-200 rounded-xl w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0" />
      <div className="ml-4 sm:ml-6 flex-1 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="h-8 bg-gray-200 rounded w-16" />
        <div className="h-3 bg-gray-200 rounded w-32" />
      </div>
    </div>
  </div>
);

// Skeleton loader for banner stats
const BannerStatSkeleton = () => (
  <div className="bg-white/10 rounded-xl p-3 sm:p-4 border border-white/20 animate-pulse">
    <div className="flex items-center">
      <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/20 rounded mr-2 sm:mr-3 flex-shrink-0" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3 bg-white/20 rounded w-20" />
        <div className="h-5 bg-white/20 rounded w-12" />
      </div>
    </div>
  </div>
);

// Memoized stat card with professional styling and smooth animations
const StatCard = React.memo(({ icon: Icon, iconBgClass, title, value, trend, onClick, delay = 0 }) => (
  <div 
    onClick={onClick}
    style={{ animationDelay: `${delay}ms` }}
    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-4 sm:p-6 border border-gray-100 
               hover:shadow-2xl hover:border-gray-200 hover:-translate-y-1
               transition-all duration-300 ease-out group cursor-pointer
               animate-fadeIn"
  >
    <div className="flex items-center">
      <div className={`p-3 sm:p-4 ${iconBgClass} rounded-xl shadow-lg 
                      group-hover:shadow-xl group-hover:scale-105 
                      transition-all duration-300 flex-shrink-0`}>
        <Icon className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
      </div>
      <div className="ml-4 sm:ml-6 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider truncate">{title}</p>
        <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 tabular-nums">{value}</h3>
        <p className="text-xs sm:text-sm text-emerald-600 font-medium mt-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          {trend}
        </p>
      </div>
    </div>
  </div>
));
StatCard.displayName = 'StatCard';

// Memoized quick action button with improved hover states
const QuickActionButton = React.memo(({ icon: Icon, label, gradientClass, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center p-3 sm:p-4 ${gradientClass} 
               text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 
               transform hover:scale-105 active:scale-95
               transition-all duration-200 ease-out
               shadow-lg hover:shadow-xl min-h-[80px] sm:min-h-[100px]
               group`}
  >
    <Icon className="h-5 w-5 sm:h-6 sm:w-6 mb-1 sm:mb-2 group-hover:scale-110 transition-transform duration-200" />
    <span className="font-semibold text-xs sm:text-sm text-center leading-tight">{label}</span>
  </button>
));
QuickActionButton.displayName = 'QuickActionButton';

// Memoized banner stat with subtle animations
const BannerStat = React.memo(({ icon: Icon, iconColor, label, value }) => (
  <div className="bg-white/10 rounded-xl p-3 sm:p-4 border border-white/20 
                  hover:bg-white/15 transition-colors duration-200">
    <div className="flex items-center">
      <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${iconColor} mr-2 sm:mr-3 flex-shrink-0`} />
      <div className="min-w-0">
        <p className="text-blue-100 text-xs sm:text-sm truncate">{label}</p>
        <p className="text-white text-lg sm:text-xl font-bold tabular-nums">{value}</p>
      </div>
    </div>
  </div>
));
BannerStat.displayName = 'BannerStat';

function Dashboard() {
  const { currentUser } = useAuth();
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [contentCreators, setContentCreators] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  const abortControllerRef = useRef(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;

    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const fetchOptions = { signal };
    
    try {
      // Parallel fetch with abort signal for better performance and cleanup
      const fetchPromises = [];
      
      // Fetch assigned customers for current admin
      if (currentUser && currentUser.role === 'admin') {
        fetchPromises.push(
          fetch(`${apiUrl}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`, fetchOptions)
            .then(res => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
            .then(data => ({ type: 'customers', data }))
            .catch(err => {
              if (err.name === 'AbortError') throw err;
              return { type: 'customers', data: [] };
            })
        );
      } else {
        fetchPromises.push(Promise.resolve({ type: 'customers', data: [] }));
      }

      // Fetch content creators
      fetchPromises.push(
        fetch(`${apiUrl}/users?role=content_creator`, fetchOptions)
          .then(res => res.json())
          .then(data => ({ type: 'creators', data: Array.isArray(data) ? data : (data.creators || []) }))
          .catch(err => {
            if (err.name === 'AbortError') throw err;
            return { type: 'creators', data: [] };
          })
      );

      // Fetch calendars
      fetchPromises.push(
        fetch(`${apiUrl}/calendars`, fetchOptions)
          .then(res => res.json())
          .then(data => {
            const items = Array.isArray(data)
              ? data.flatMap(cal => Array.isArray(cal.contentItems) ? cal.contentItems : [])
              : [];
            return { type: 'content', data: items };
          })
          .catch(err => {
            if (err.name === 'AbortError') throw err;
            return { type: 'content', data: [] };
          })
      );

      const results = await Promise.all(fetchPromises);
      
      // Batch state updates for better performance
      const updates = {};
      results.forEach(result => {
        updates[result.type] = result.data;
      });
      
      if (updates.customers !== undefined) setAssignedCustomers(updates.customers);
      if (updates.creators !== undefined) setContentCreators(updates.creators);
      if (updates.content !== undefined) setContentItems(updates.content);

    } catch (error) {
      // Ignore abort errors
      if (error.name === 'AbortError') return;
      setError('Unable to load dashboard data. Please try again.');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    if (!isRefreshing) {
      fetchDashboardData(true);
    }
  }, [fetchDashboardData, isRefreshing]);

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
    qrGenerator: () => navigate('/admin/qr-generator'),
    publishManager: () => navigate('/admin/publish-manager'),
    customerAnalytics: () => navigate('/admin/customer-analytics'),
    socialAccounts: () => navigate('/admin/social-accounts'),
    creatorSubmissions: () => navigate('/admin/creator-submissions')
  }), [navigate]);

  // Loading state with skeleton UI
  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0">
          {/* Welcome Section Skeleton */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-4 sm:p-6 lg:p-8 relative overflow-hidden animate-pulse">
            <div className="relative z-10">
              <div className="flex flex-row items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="p-2 sm:p-3 bg-white/10 rounded-lg sm:rounded-xl w-12 h-12 sm:w-14 sm:h-14" />
                <div className="flex-1 space-y-2">
                  <div className="h-6 sm:h-8 bg-white/20 rounded w-3/4" />
                  <div className="h-4 bg-white/10 rounded w-1/2" />
                </div>
              </div>
              <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
                <BannerStatSkeleton />
                <BannerStatSkeleton />
                <BannerStatSkeleton />
              </div>
            </div>
          </div>
          
          {/* Stat Cards Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
          
          {/* Quick Actions Skeleton */}
          <div className="bg-white/70 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-gray-200/50 p-4 sm:p-6 lg:p-8 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-4 sm:mb-6" />
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3 lg:gap-4">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="bg-gray-200 rounded-xl min-h-[80px] sm:min-h-[100px]" />
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex flex-col justify-center items-center h-96 space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <Activity className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-lg text-gray-700 font-medium mb-2">Something went wrong</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 
                       text-white rounded-xl font-medium shadow-md hover:shadow-lg 
                       hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      {/* Add custom animation styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
      
      <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0">
        {/* Welcome Section - Professional gradient with subtle animation */}
        <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10">
            {/* Header with refresh button */}
            <div className="flex flex-row items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="p-2 sm:p-3 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl flex-shrink-0">
                  <Activity className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-2xl lg:text-4xl font-bold bg-gradient-to-r from-white via-blue-100 to-blue-200 bg-clip-text text-transparent leading-tight">
                    Welcome to Aureum Solutions
                  </h1>
                  <p className="text-blue-200/80 text-xs sm:text-sm lg:text-lg mt-1 sm:mt-2 line-clamp-2 sm:line-clamp-none">
                    Manage your social media content effectively
                  </p>
                </div>
              </div>
              
              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 sm:p-3 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl 
                           transition-all duration-200 flex-shrink-0 disabled:opacity-50"
                title="Refresh data"
              >
                <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            {/* Banner Stats */}
            <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
              <BannerStat 
                icon={Zap} 
                iconColor="text-amber-400" 
                label="Active Campaigns" 
                value={stats.totalCustomers} 
              />
              <BannerStat 
                icon={Award} 
                iconColor="text-emerald-400" 
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

        {/* Main Statistics with staggered animation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
          <StatCard 
            icon={Users}
            iconBgClass="bg-gradient-to-br from-blue-500 to-blue-600"
            title="Total Customers"
            value={stats.totalCustomers}
            trend="+5% from last month"
            onClick={navigationHandlers.customersList}
            delay={0}
          />
          <StatCard 
            icon={UserCheck}
            iconBgClass="bg-gradient-to-br from-purple-500 to-purple-600"
            title="Content Creators"
            value={stats.totalContentCreators}
            trend="+8% from last month"
            onClick={navigationHandlers.contentCreators}
            delay={100}
          />
          <StatCard 
            icon={Calendar}
            iconBgClass="bg-gradient-to-br from-emerald-500 to-emerald-600"
            title="Content Items"
            value={stats.totalContentItems}
            trend="+12% from last week"
            onClick={navigationHandlers.customers}
            delay={200}
          />
        </div>

        {/* Quick Actions - Professional card design */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-md border border-gray-100 p-4 sm:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Quick Actions</h2>
            <span className="text-xs sm:text-sm text-gray-500">Click to navigate</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 sm:gap-3 lg:gap-4">
            <QuickActionButton 
              icon={Users}
              label="Customers"
              gradientClass="bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:ring-blue-500"
              onClick={navigationHandlers.customersList}
            />
            <QuickActionButton 
              icon={UserCheck}
              label="Creators"
              gradientClass="bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 focus:ring-purple-500"
              onClick={navigationHandlers.contentCreators}
            />
            <QuickActionButton 
              icon={Calendar}
              label="Calendar"
              gradientClass="bg-gradient-to-br from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 focus:ring-emerald-500"
              onClick={navigationHandlers.customers}
            />
            <QuickActionButton 
              icon={Palette}
              label="Portfolio"
              gradientClass="bg-gradient-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:ring-indigo-500"
              onClick={navigationHandlers.contentPortfolio}
            />
            <QuickActionButton 
              icon={Send}
              label="Scheduled"
              gradientClass="bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 focus:ring-orange-500"
              onClick={navigationHandlers.scheduledPosts}
            />
            <QuickActionButton 
              icon={BarChart3}
              label="QR Codes"
              gradientClass="bg-gradient-to-br from-cyan-600 to-blue-500 hover:from-cyan-700 hover:to-blue-600 focus:ring-cyan-500"
              onClick={navigationHandlers.qrGenerator}
            />
            <QuickActionButton 
              icon={CheckCircle2}
              label="Publish"
              gradientClass="bg-gradient-to-br from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 focus:ring-green-500"
              onClick={navigationHandlers.publishManager}
            />
            <QuickActionButton 
              icon={TrendingUp}
              label="Analytics"
              gradientClass="bg-gradient-to-br from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 focus:ring-violet-500"
              onClick={navigationHandlers.customerAnalytics}
            />
            <QuickActionButton 
              icon={Activity}
              label="Social Accounts"
              gradientClass="bg-gradient-to-br from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 focus:ring-teal-500"
              onClick={navigationHandlers.socialAccounts}
            />
            <QuickActionButton 
              icon={Send}
              label="Creator Inbox"
              gradientClass="bg-gradient-to-br from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 focus:ring-purple-500"
              onClick={navigationHandlers.creatorSubmissions}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;