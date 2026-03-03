import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import TimePeriodChart from '../../../components/TimeperiodChart';
import {
  Users, Search, ChevronDown, ChevronRight, BarChart3, TrendingUp,
  Facebook, Instagram, Linkedin, Youtube, Twitter, RefreshCw, AlertCircle,
  Building2, Globe, CheckCircle2, XCircle, Clock, Filter, LayoutGrid, List,
  ArrowRight, Sparkles, Activity, Eye, MousePointerClick
} from 'lucide-react';

// Platform icon mapping
const PLATFORM_ICONS = {
  facebook: { icon: Facebook, color: '#1877F2', bgColor: 'bg-blue-100', textColor: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
  instagram: { icon: Instagram, color: '#E4405F', bgColor: 'bg-pink-100', textColor: 'text-pink-600', gradient: 'from-pink-500 to-rose-500' },
  linkedin: { icon: Linkedin, color: '#0A66C2', bgColor: 'bg-sky-100', textColor: 'text-sky-600', gradient: 'from-sky-500 to-blue-600' },
  youtube: { icon: Youtube, color: '#FF0000', bgColor: 'bg-red-100', textColor: 'text-red-600', gradient: 'from-red-500 to-red-600' },
  twitter: { icon: Twitter, color: '#1DA1F2', bgColor: 'bg-cyan-100', textColor: 'text-cyan-600', gradient: 'from-cyan-400 to-blue-500' }
};

// Skeleton loader component
const Skeleton = memo(({ className = '' }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`} />
));

// Customer card skeleton
const CustomerCardSkeleton = memo(() => (
  <div className="p-4 rounded-xl border-2 border-gray-100 bg-white">
    <div className="flex items-center gap-3">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 rounded" />
        <Skeleton className="h-3 w-1/2 rounded" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-5 w-16 rounded-full" />
        <div className="flex gap-1 justify-end">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      </div>
    </div>
  </div>
));

// Step indicator component for selection flow
const SelectionSteps = memo(({ currentStep }) => {
  const steps = [
    { id: 1, label: 'Select Customer', icon: Users },
    { id: 2, label: 'Choose Account', icon: Globe },
    { id: 3, label: 'View Analytics', icon: BarChart3 }
  ];
  
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 py-3">
      {steps.map((step, index) => {
        const isCompleted = currentStep > step.id;
        const isActive = currentStep === step.id;
        const Icon = step.icon;
        
        return (
          <React.Fragment key={step.id}>
            {index > 0 && (
              <div className={`hidden sm:block w-8 lg:w-12 h-0.5 transition-colors duration-300 ${
                isCompleted ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
            <div className="flex items-center gap-2">
              <div className={`
                relative flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-300
                ${isCompleted ? 'bg-green-500 text-white' : isActive ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'}
              `}>
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                {isActive && (
                  <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500" />
                  </span>
                )}
              </div>
              <span className={`hidden lg:block text-sm font-medium transition-colors ${
                isActive ? 'text-blue-700' : isCompleted ? 'text-green-600' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
});

// Platform label formatting
const formatPlatformName = (platform) => {
  const names = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    twitter: 'Twitter/X'
  };
  return names[platform?.toLowerCase()] || platform || 'Unknown';
};

// Quick stat badge component
const QuickStatBadge = memo(({ icon: Icon, value, label, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    green: 'bg-green-50 text-green-700 border-green-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100'
  };
  
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${colorClasses[color]}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="text-sm font-semibold">{value}</span>
      <span className="text-xs opacity-70">{label}</span>
    </div>
  );
});

// Stat card component with hover effects
const StatCard = memo(({ icon: Icon, iconBgClass, title, value, subtitle, trend }) => (
  <div className="bg-white rounded-xl border border-gray-200/50 shadow-sm p-4 sm:p-5 hover:shadow-md hover:border-gray-300/50 transition-all duration-200 group">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 sm:p-3 ${iconBgClass} rounded-xl flex-shrink-0 group-hover:scale-105 transition-transform duration-200`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{value}</h3>
          {trend && (
            <span className={`text-xs font-medium ${trend > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  </div>
));

// Customer selector card with improved interactivity
const CustomerCard = memo(({ customer, isSelected, onSelect, socialAccounts, index }) => {
  const accountCount = socialAccounts?.length || 0;
  const platforms = [...new Set(socialAccounts?.map(acc => acc.platform) || [])];

  return (
    <button
      onClick={() => onSelect(customer)}
      className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.02] ${
        isSelected
          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-lg shadow-blue-100/50'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
          isSelected ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md' : 'bg-gradient-to-br from-gray-400 to-gray-500'
        }`}>
          <span className="text-white font-bold text-base sm:text-lg">
            {customer.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold truncate text-sm sm:text-base transition-colors ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
            {customer.name}
          </h4>
          <p className="text-xs text-gray-500 truncate">{customer.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full transition-all ${
            accountCount > 0 
              ? isSelected ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700' 
              : 'bg-gray-100 text-gray-500'
          }`}>
            {accountCount} {accountCount === 1 ? 'account' : 'accounts'}
          </span>
          <div className="flex -space-x-1.5">
            {platforms.slice(0, 4).map(platform => {
              const config = PLATFORM_ICONS[platform?.toLowerCase()] || {};
              const IconComp = config.icon || Globe;
              return (
                <div 
                  key={platform} 
                  className={`w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white ${config.bgColor || 'bg-gray-100'}`}
                  title={formatPlatformName(platform)}
                >
                  <IconComp className={`w-3 h-3 ${config.textColor || 'text-gray-500'}`} />
                </div>
              );
            })}
            {platforms.length > 4 && (
              <div className="w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white bg-gray-600 text-white text-[10px] font-medium">
                +{platforms.length - 4}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
});

// Social Account Card with enhanced design
const SocialAccountCard = memo(({ account, isSelected, onSelect }) => {
  const config = PLATFORM_ICONS[account.platform?.toLowerCase()] || {};
  const IconComp = config.icon || Globe;
  
  // Get page/channel name from various fields
  const accountName = account.name || account.pageName || account.channelName || account.platformUserId;
  const pageCount = account.pages?.length || account.channels?.length || 0;
  const isConnected = account.tokenStatus === 'active' || !account.needsReconnection;

  return (
    <button
      onClick={() => onSelect(account)}
      className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-300 transform hover:scale-[1.01] ${
        isSelected
          ? 'border-blue-500 bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 shadow-lg shadow-blue-100/50'
          : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md'
      }`}
    >
      <div className="flex items-center gap-3">
        <div 
          className={`p-2.5 sm:p-3 rounded-xl flex-shrink-0 transition-all duration-300 ${
            isSelected ? 'shadow-md' : ''
          }`}
          style={{ 
            backgroundColor: isSelected ? `${config.color}20` : `${config.color}10`,
            border: isSelected ? `2px solid ${config.color}40` : 'none'
          }}
        >
          <IconComp 
            className="h-5 w-5 sm:h-6 sm:w-6"
            style={{ color: config.color || '#6B7280' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-semibold truncate text-sm sm:text-base ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
              {formatPlatformName(account.platform)}
            </h4>
            <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              isConnected 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-600'
            }`}>
              {isConnected ? (
                <>
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Active
                </>
              ) : (
                <>
                  <XCircle className="h-2.5 w-2.5" />
                  Disconnected
                </>
              )}
            </span>
          </div>
          <p className="text-xs text-gray-500 truncate mt-0.5">{accountName}</p>
          {pageCount > 0 && (
            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {pageCount} {pageCount === 1 ? 'page' : 'pages'} connected
            </p>
          )}
        </div>
        <div className={`p-2 rounded-lg transition-all duration-300 ${
          isSelected ? 'bg-blue-100' : 'bg-gray-50 group-hover:bg-gray-100'
        }`}>
          <ChevronRight className={`h-5 w-5 transition-transform duration-300 ${
            isSelected ? 'text-blue-600 translate-x-0.5' : 'text-gray-400'
          }`} />
        </div>
      </div>
    </button>
  );
});

// Page/Channel selector with improved design
const PageSelector = memo(({ pages, selectedPageId, onSelectPage, platform }) => {
  const config = PLATFORM_ICONS[platform?.toLowerCase()] || {};
  
  return (
    <div className="bg-gradient-to-br from-gray-50 via-white to-slate-50 rounded-2xl p-4 sm:p-5 border border-gray-200/80 shadow-sm">
      <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
        <div className="p-1.5 bg-white rounded-lg shadow-sm border border-gray-100">
          <Building2 className="h-4 w-4 text-blue-600" />
        </div>
        Select Page/Channel
        <span className="ml-auto text-xs text-gray-400 font-normal">{pages.length} available</span>
      </h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {pages.map(page => {
          const pageId = page.id || page.platformUserId || page.channelId;
          const pageName = page.name || page.pageName || page.channelName || pageId;
          const isActive = selectedPageId === pageId;
          
          return (
            <button
              key={pageId}
              onClick={() => onSelectPage(page)}
              className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
                isActive
                  ? 'border-blue-400 bg-white shadow-md shadow-blue-50'
                  : 'border-gray-100 bg-white/80 hover:bg-white hover:border-gray-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                {page.picture?.data?.url || page.profilePicture ? (
                  <img 
                    src={page.picture?.data?.url || page.profilePicture}
                    alt={pageName}
                    className="w-10 h-10 rounded-xl object-cover ring-2 ring-white shadow-sm"
                  />
                ) : (
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
                    style={{ backgroundColor: `${config.color}15` }}
                  >
                    <span className="text-sm font-bold" style={{ color: config.color }}>
                      {pageName?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                    {pageName}
                  </p>
                  {page.fan_count && (
                    <p className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {page.fan_count.toLocaleString()} followers
                    </p>
                  )}
                </div>
                {isActive && (
                  <div className="p-1 bg-blue-100 rounded-full">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

function MultiCustomerAnalytics() {
  const { currentUser } = useAuth();
  
  // Data states
  const [customers, setCustomers] = useState([]);
  const [socialAccountsMap, setSocialAccountsMap] = useState({}); // customerId -> accounts[]
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  
  // Selection states
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [customersPanelCollapsed, setCustomersPanelCollapsed] = useState(false);

  // Calculate current step for step indicator
  const currentStep = useMemo(() => {
    if (!selectedCustomer) return 1;
    if (!selectedAccount) return 2;
    return 3;
  }, [selectedCustomer, selectedAccount]);

  // Fetch assigned customers
  const fetchCustomers = useCallback(async (isRefresh = false) => {
    if (!currentUser) return;
    
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(
        `${apiUrl}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`
      );
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const data = await response.json();
      const customerList = Array.isArray(data) ? data : (data.customers || []);
      
      setCustomers(customerList);
      
      // Fetch social accounts for all customers in parallel
      if (customerList.length > 0) {
        const accountsPromises = customerList.map(async (customer) => {
          const customerId = customer._id || customer.id;
          try {
            const accountsRes = await fetch(`${apiUrl}/api/customer-social-links/${customerId}`);
            const accountsData = await accountsRes.json();
            return {
              customerId,
              accounts: accountsData.success && Array.isArray(accountsData.accounts) 
                ? accountsData.accounts 
                : []
            };
          } catch (err) {
            console.warn(`Failed to fetch social accounts for ${customerId}:`, err);
            return { customerId, accounts: [] };
          }
        });
        
        const accountsResults = await Promise.all(accountsPromises);
        const accountsMap = {};
        accountsResults.forEach(({ customerId, accounts }) => {
          accountsMap[customerId] = accounts;
        });
        setSocialAccountsMap(accountsMap);
      }
      
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(customer => 
      customer.name?.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  // Get social accounts for selected customer
  const customerAccounts = useMemo(() => {
    if (!selectedCustomer) return [];
    const customerId = selectedCustomer._id || selectedCustomer.id;
    const accounts = socialAccountsMap[customerId] || [];
    
    if (platformFilter === 'all') return accounts;
    return accounts.filter(acc => acc.platform?.toLowerCase() === platformFilter);
  }, [selectedCustomer, socialAccountsMap, platformFilter]);

  // Get available platforms for filter
  const availablePlatforms = useMemo(() => {
    if (!selectedCustomer) return [];
    const customerId = selectedCustomer._id || selectedCustomer.id;
    const accounts = socialAccountsMap[customerId] || [];
    return [...new Set(accounts.map(acc => acc.platform?.toLowerCase()).filter(Boolean))];
  }, [selectedCustomer, socialAccountsMap]);

  // Handle customer selection
  const handleSelectCustomer = useCallback((customer) => {
    setSelectedCustomer(customer);
    setSelectedAccount(null);
    setSelectedPage(null);
    setPlatformFilter('all');
  }, []);

  // Handle account selection
  const handleSelectAccount = useCallback((account) => {
    setSelectedAccount(account);
    
    // Auto-select first page if available
    const pages = account.pages || account.channels || [];
    if (pages.length > 0) {
      setSelectedPage(pages[0]);
    } else {
      setSelectedPage(null);
    }
  }, []);

  // Handle page selection
  const handleSelectPage = useCallback((page) => {
    setSelectedPage(page);
  }, []);

  // Get the account ID for TimePeriodChart
  const chartAccountId = useMemo(() => {
    if (selectedPage) {
      return selectedPage.id || selectedPage.platformUserId || selectedPage.channelId;
    }
    if (selectedAccount) {
      return selectedAccount.platformUserId || selectedAccount.pages?.[0]?.id || selectedAccount.id;
    }
    return null;
  }, [selectedAccount, selectedPage]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalAccounts = Object.values(socialAccountsMap).flat().length;
    const uniquePlatforms = new Set(Object.values(socialAccountsMap).flat().map(a => a.platform?.toLowerCase())).size;
    const customersWithAccounts = Object.values(socialAccountsMap).filter(accounts => accounts.length > 0).length;
    
    return {
      totalCustomers: customers.length,
      totalAccounts,
      uniquePlatforms,
      customersWithAccounts
    };
  }, [customers, socialAccountsMap]);

  return (
    <AdminLayout title="Customer Analytics">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="max-w-[1920px] mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
          
          {/* Header Section */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-24 -translate-x-24" />
            
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                    <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold">
                    Multi-Customer Analytics
                  </h1>
                </div>
                <p className="text-blue-100 text-sm sm:text-base max-w-lg">
                  View and analyze social media performance across all your customers in one unified dashboard
                </p>
                <button
                  onClick={() => fetchCustomers(true)}
                  disabled={refreshing}
                  className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh Data'}
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-white/70" />
                    <p className="text-white/70 text-xs">Customers</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{stats.totalCustomers}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-green-300" />
                    <p className="text-white/70 text-xs">Connected</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{stats.customersWithAccounts}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="h-4 w-4 text-white/70" />
                    <p className="text-white/70 text-xs">Accounts</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{stats.totalAccounts}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20 hover:bg-white/15 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="h-4 w-4 text-white/70" />
                    <p className="text-white/70 text-xs">Platforms</p>
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold">{stats.uniquePlatforms}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Selection Progress Indicator */}
          <div className="bg-white rounded-xl border border-gray-200/50 shadow-sm">
            <SelectionSteps currentStep={currentStep} />
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-red-800 font-medium text-sm">Error Loading Data</p>
                <p className="text-red-600 text-xs mt-0.5">{error}</p>
              </div>
              <button
                onClick={() => fetchCustomers(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            </div>
          )}

          {/* Loading State with Skeleton */}
          {loading ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
              {/* Skeleton for customer panel */}
              <div className="xl:col-span-3 space-y-4">
                <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden p-4">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <Skeleton className="h-10 w-full mb-4" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <CustomerCardSkeleton key={i} />)}
                  </div>
                </div>
              </div>
              {/* Skeleton for analytics panel */}
              <div className="xl:col-span-9">
                <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-8">
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="relative">
                      <Skeleton className="h-20 w-20 rounded-2xl" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-48 mt-4" />
                    <Skeleton className="h-4 w-64 mt-2" />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 sm:gap-6">
              
              {/* Left Panel - Customer Selection */}
              <div className={`${customersPanelCollapsed ? 'xl:col-span-1' : 'xl:col-span-3'} space-y-4 transition-all duration-300`}>
                {/* Customer List */}
                <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                  <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span className={customersPanelCollapsed ? 'hidden' : ''}>Customers</span>
                      </h2>
                      <button
                        onClick={() => setCustomersPanelCollapsed(!customersPanelCollapsed)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors hidden xl:flex"
                      >
                        {customersPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                    
                    {!customersPanelCollapsed && (
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search customers..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    )}
                  </div>
                  
                  {!customersPanelCollapsed && (
                    <div className="max-h-[400px] overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                      {filteredCustomers.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                          <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-2xl flex items-center justify-center">
                            <Users className="h-8 w-8 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-600">No customers found</p>
                          <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
                        </div>
                      ) : (
                        filteredCustomers.map((customer, index) => (
                          <CustomerCard
                            key={customer._id || customer.id}
                            customer={customer}
                            isSelected={selectedCustomer?._id === customer._id || selectedCustomer?.id === customer.id}
                            onSelect={handleSelectCustomer}
                            socialAccounts={socialAccountsMap[customer._id || customer.id]}
                            index={index}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Social Accounts for Selected Customer */}
                {selectedCustomer && !customersPanelCollapsed && (
                  <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                    <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                          <div className="p-1.5 bg-white rounded-lg shadow-sm">
                            <Globe className="h-3.5 w-3.5 text-blue-600" />
                          </div>
                          Social Accounts
                        </h3>
                        <span className="text-xs text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full font-medium">
                          {customerAccounts.length} total
                        </span>
                      </div>
                      
                      {/* Platform Filter */}
                      {availablePlatforms.length > 1 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          <button
                            onClick={() => setPlatformFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                              platformFilter === 'all'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                          >
                            All Platforms
                          </button>
                          {availablePlatforms.map(platform => {
                            const config = PLATFORM_ICONS[platform] || {};
                            const IconComp = config.icon || Globe;
                            return (
                              <button
                                key={platform}
                                onClick={() => setPlatformFilter(platform)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                                  platformFilter === platform
                                    ? 'text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                                style={platformFilter === platform ? { backgroundColor: config.color } : {}}
                              >
                                <IconComp className="h-3.5 w-3.5" />
                                {formatPlatformName(platform)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="max-h-[350px] overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
                      {customerAccounts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <div className="w-14 h-14 mx-auto mb-3 bg-gray-100 rounded-2xl flex items-center justify-center">
                            <Globe className="h-7 w-7 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-600">No accounts connected</p>
                          <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto">
                            This customer needs to connect their social media accounts first
                          </p>
                        </div>
                      ) : (
                        customerAccounts.map((account, idx) => (
                          <SocialAccountCard
                            key={account._id || account.id || `${account.platform}-${idx}`}
                            account={account}
                            isSelected={selectedAccount?.platformUserId === account.platformUserId}
                            onSelect={handleSelectAccount}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Panel - Analytics */}
              <div className={`${customersPanelCollapsed ? 'xl:col-span-11' : 'xl:col-span-9'} space-y-4 transition-all duration-300`}>
                
                {/* Selection Summary / Breadcrumb */}
                {selectedCustomer && (
                  <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="h-14 w-14 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200/50">
                            <span className="text-white font-bold text-xl">
                              {selectedCustomer.name?.charAt(0)?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 font-medium uppercase tracking-wide mb-0.5">Viewing Analytics For</p>
                          <h2 className="text-lg sm:text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                          <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                        </div>
                      </div>
                      
                      {selectedAccount && (
                        <div className="flex items-center gap-3">
                          <ArrowRight className="h-5 w-5 text-gray-300 hidden sm:block" />
                          <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl px-4 py-3 border border-gray-100">
                            {(() => {
                              const config = PLATFORM_ICONS[selectedAccount.platform?.toLowerCase()] || {};
                              const IconComp = config.icon || Globe;
                              return (
                                <>
                                  <div 
                                    className="p-2 rounded-xl shadow-sm"
                                    style={{ backgroundColor: `${config.color}15` }}
                                  >
                                    <IconComp className="h-5 w-5" style={{ color: config.color }} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                      {formatPlatformName(selectedAccount.platform)}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                      {selectedPage?.name || selectedAccount.name || chartAccountId}
                                    </p>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Page Selector (if account has multiple pages) */}
                {selectedAccount && (selectedAccount.pages?.length > 1 || selectedAccount.channels?.length > 1) && (
                  <PageSelector
                    pages={selectedAccount.pages || selectedAccount.channels || []}
                    selectedPageId={selectedPage?.id || selectedPage?.platformUserId || selectedPage?.channelId}
                    onSelectPage={handleSelectPage}
                    platform={selectedAccount.platform}
                  />
                )}

                {/* Analytics Charts */}
                {selectedCustomer && selectedAccount && chartAccountId ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl px-4 py-3 border border-green-100 flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Activity className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">Analytics Ready</p>
                        <p className="text-xs text-green-600">Displaying real-time performance metrics</p>
                      </div>
                      <Sparkles className="h-5 w-5 text-green-500" />
                    </div>
                    <TimePeriodChart
                      platform={selectedAccount.platform?.toLowerCase()}
                      accountId={chartAccountId}
                      title={`${formatPlatformName(selectedAccount.platform)} Analytics - ${selectedPage?.name || selectedAccount.name || 'Account'}`}
                      defaultMetric="followers"
                    />
                  </div>
                ) : (
                  /* Empty State - No Selection */
                  <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                    <div className="relative flex flex-col items-center justify-center py-16 sm:py-20 px-6 text-center">
                      {/* Background decoration */}
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-blue-50/30" />
                      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/30 rounded-full -translate-y-32 translate-x-32 blur-3xl" />
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-100/30 rounded-full translate-y-24 -translate-x-24 blur-3xl" />
                      
                      <div className="relative z-10">
                        {!selectedCustomer ? (
                          <>
                            <div className="relative mb-6">
                              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl shadow-blue-200/50 mx-auto">
                                <Users className="h-12 w-12 text-white" />
                              </div>
                              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
                                <MousePointerClick className="h-5 w-5 text-blue-600" />
                              </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Select a Customer</h3>
                            <p className="text-gray-500 max-w-md mb-6 leading-relaxed">
                              Choose a customer from the list on the left to view their connected social media accounts and detailed analytics data.
                            </p>
                            <div className="flex items-center justify-center gap-4 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {stats.totalCustomers} customers available
                              </span>
                              <span className="flex items-center gap-1">
                                <Globe className="h-4 w-4" />
                                {stats.totalAccounts} accounts total
                              </span>
                            </div>
                          </>
                        ) : !selectedAccount ? (
                          <>
                            <div className="relative mb-6">
                              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl flex items-center justify-center shadow-xl shadow-purple-200/50 mx-auto">
                                <Globe className="h-12 w-12 text-white" />
                              </div>
                              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
                                <ArrowRight className="h-5 w-5 text-purple-600" />
                              </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">
                              {customerAccounts.length > 0 ? 'Choose a Social Account' : 'No Accounts Connected'}
                            </h3>
                            <p className="text-gray-500 max-w-md mb-6 leading-relaxed">
                              {customerAccounts.length > 0 
                                ? `Select one of ${customerAccounts.length} connected account${customerAccounts.length > 1 ? 's' : ''} to view detailed analytics and performance metrics.`
                                : 'This customer hasn\'t connected any social media accounts yet. Once they connect their accounts, you\'ll be able to view their analytics here.'}
                            </p>
                            {customerAccounts.length > 0 && (
                              <div className="flex items-center justify-center gap-2 flex-wrap">
                                {[...new Set(customerAccounts.map(a => a.platform?.toLowerCase()))].map(platform => {
                                  const config = PLATFORM_ICONS[platform] || {};
                                  const IconComp = config.icon || Globe;
                                  return (
                                    <span 
                                      key={platform}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                                      style={{ backgroundColor: `${config.color}15`, color: config.color }}
                                    >
                                      <IconComp className="h-3.5 w-3.5" />
                                      {formatPlatformName(platform)}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            <div className="relative mb-6">
                              <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-xl shadow-amber-200/50 mx-auto animate-pulse">
                                <TrendingUp className="h-12 w-12 text-white" />
                              </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">Preparing Analytics</h3>
                            <p className="text-gray-500 max-w-md leading-relaxed">
                              Loading performance data for the selected account. This will only take a moment...
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

export default MultiCustomerAnalytics;
