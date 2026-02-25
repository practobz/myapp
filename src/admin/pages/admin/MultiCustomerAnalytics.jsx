import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import TimePeriodChart from '../../../components/TimeperiodChart';
import {
  Users, Search, ChevronDown, ChevronRight, BarChart3, TrendingUp,
  Facebook, Instagram, Linkedin, Youtube, Twitter, RefreshCw, AlertCircle,
  Building2, Globe, CheckCircle2, XCircle, Clock, Filter, LayoutGrid, List
} from 'lucide-react';

// Platform icon mapping
const PLATFORM_ICONS = {
  facebook: { icon: Facebook, color: '#1877F2', bgColor: 'bg-blue-100', textColor: 'text-blue-600' },
  instagram: { icon: Instagram, color: '#E4405F', bgColor: 'bg-pink-100', textColor: 'text-pink-600' },
  linkedin: { icon: Linkedin, color: '#0A66C2', bgColor: 'bg-sky-100', textColor: 'text-sky-600' },
  youtube: { icon: Youtube, color: '#FF0000', bgColor: 'bg-red-100', textColor: 'text-red-600' },
  twitter: { icon: Twitter, color: '#1DA1F2', bgColor: 'bg-cyan-100', textColor: 'text-cyan-600' }
};

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

// Stat card component
const StatCard = memo(({ icon: Icon, iconBgClass, title, value, subtitle }) => (
  <div className="bg-white rounded-xl border border-gray-200/50 shadow-sm p-4 sm:p-5">
    <div className="flex items-center gap-3">
      <div className={`p-2.5 sm:p-3 ${iconBgClass} rounded-xl flex-shrink-0`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">{title}</p>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{value}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  </div>
));

// Customer selector card
const CustomerCard = memo(({ customer, isSelected, onSelect, socialAccounts }) => {
  const accountCount = socialAccounts?.length || 0;
  const platforms = [...new Set(socialAccounts?.map(acc => acc.platform) || [])];

  return (
    <button
      onClick={() => onSelect(customer)}
      className={`w-full text-left p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 bg-blue-50/50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isSelected ? 'bg-gradient-to-br from-blue-500 to-indigo-600' : 'bg-gradient-to-br from-gray-400 to-gray-500'
        }`}>
          <span className="text-white font-bold text-base sm:text-lg">
            {customer.name?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-semibold truncate text-sm sm:text-base ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
            {customer.name}
          </h4>
          <p className="text-xs text-gray-500 truncate">{customer.email}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            accountCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {accountCount} {accountCount === 1 ? 'account' : 'accounts'}
          </span>
          <div className="flex -space-x-1">
            {platforms.slice(0, 4).map(platform => {
              const config = PLATFORM_ICONS[platform?.toLowerCase()] || {};
              const IconComp = config.icon || Globe;
              return (
                <div 
                  key={platform} 
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${config.bgColor || 'bg-gray-100'}`}
                >
                  <IconComp className={`w-3 h-3 ${config.textColor || 'text-gray-500'}`} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </button>
  );
});

// Social Account Card
const SocialAccountCard = memo(({ account, isSelected, onSelect }) => {
  const config = PLATFORM_ICONS[account.platform?.toLowerCase()] || {};
  const IconComp = config.icon || Globe;
  
  // Get page/channel name from various fields
  const accountName = account.name || account.pageName || account.channelName || account.platformUserId;
  const pageCount = account.pages?.length || account.channels?.length || 0;

  return (
    <button
      onClick={() => onSelect(account)}
      className={`w-full text-left p-3 rounded-xl border-2 transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3">
        <div 
          className={`p-2 sm:p-2.5 rounded-xl flex-shrink-0 ${config.bgColor || 'bg-gray-100'}`}
          style={{ backgroundColor: isSelected ? `${config.color}15` : undefined }}
        >
          <IconComp 
            className="h-5 w-5 sm:h-6 sm:w-6"
            style={{ color: config.color || '#6B7280' }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`font-semibold truncate text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
              {formatPlatformName(account.platform)}
            </h4>
            {account.tokenStatus === 'active' || !account.needsReconnection ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500 truncate">{accountName}</p>
          {pageCount > 0 && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {pageCount} {pageCount === 1 ? 'page' : 'pages'} connected
            </p>
          )}
        </div>
        <ChevronRight className={`h-5 w-5 flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
      </div>
    </button>
  );
});

// Page/Channel selector for accounts with multiple pages
const PageSelector = memo(({ pages, selectedPageId, onSelectPage, platform }) => {
  const config = PLATFORM_ICONS[platform?.toLowerCase()] || {};
  
  return (
    <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-3 sm:p-4 border border-gray-200">
      <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
        <Building2 className="h-4 w-4" />
        Select Page/Channel
      </h4>
      <div className="grid gap-2">
        {pages.map(page => {
          const pageId = page.id || page.platformUserId || page.channelId;
          const pageName = page.name || page.pageName || page.channelName || pageId;
          const isActive = selectedPageId === pageId;
          
          return (
            <button
              key={pageId}
              onClick={() => onSelectPage(page)}
              className={`w-full text-left p-2.5 rounded-lg border transition-all duration-150 ${
                isActive
                  ? 'border-blue-400 bg-white shadow-sm'
                  : 'border-transparent bg-white/50 hover:bg-white hover:border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {page.picture?.data?.url || page.profilePicture ? (
                  <img 
                    src={page.picture?.data?.url || page.profilePicture}
                    alt={pageName}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${config.color}15` }}
                  >
                    <span className="text-xs font-bold" style={{ color: config.color }}>
                      {pageName?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                    {pageName}
                  </p>
                  {page.fan_count && (
                    <p className="text-[10px] text-gray-400">{page.fan_count.toLocaleString()} followers</p>
                  )}
                </div>
                {isActive && <CheckCircle2 className="h-4 w-4 text-blue-500 flex-shrink-0" />}
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

  // Fetch assigned customers
  const fetchCustomers = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
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
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-4 sm:p-6 lg:p-8 text-white shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                  <BarChart3 className="h-7 w-7 sm:h-8 sm:w-8" />
                  Multi-Customer Analytics
                </h1>
                <p className="text-blue-100 mt-1 text-sm sm:text-base">
                  View and analyze social media performance across all your customers
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                  <p className="text-white/70 text-xs">Customers</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalCustomers}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                  <p className="text-white/70 text-xs">Connected</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.customersWithAccounts}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                  <p className="text-white/70 text-xs">Accounts</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalAccounts}</p>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/20">
                  <p className="text-white/70 text-xs">Platforms</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.uniquePlatforms}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
              <p className="text-red-700 text-sm flex-1">{error}</p>
              <button
                onClick={fetchCustomers}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-gray-600">Loading customers...</p>
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
                    <div className="max-h-[400px] overflow-y-auto p-3 space-y-2">
                      {filteredCustomers.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No customers found</p>
                        </div>
                      ) : (
                        filteredCustomers.map(customer => (
                          <CustomerCard
                            key={customer._id || customer.id}
                            customer={customer}
                            isSelected={selectedCustomer?._id === customer._id || selectedCustomer?.id === customer.id}
                            onSelect={handleSelectCustomer}
                            socialAccounts={socialAccountsMap[customer._id || customer.id]}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Social Accounts for Selected Customer */}
                {selectedCustomer && !customersPanelCollapsed && (
                  <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
                    <div className="p-3 sm:p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                          <Globe className="h-4 w-4 text-blue-500" />
                          Social Accounts
                        </h3>
                        <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full">
                          {customerAccounts.length} total
                        </span>
                      </div>
                      
                      {/* Platform Filter */}
                      {availablePlatforms.length > 1 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <button
                            onClick={() => setPlatformFilter('all')}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              platformFilter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            All
                          </button>
                          {availablePlatforms.map(platform => {
                            const config = PLATFORM_ICONS[platform] || {};
                            const IconComp = config.icon || Globe;
                            return (
                              <button
                                key={platform}
                                onClick={() => setPlatformFilter(platform)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                                  platformFilter === platform
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <IconComp className="h-3 w-3" />
                                {formatPlatformName(platform)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    
                    <div className="max-h-[350px] overflow-y-auto p-3 space-y-2">
                      {customerAccounts.length === 0 ? (
                        <div className="text-center py-6 text-gray-500">
                          <Globe className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No social accounts connected</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Customer needs to connect their social media
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
                
                {/* Selection Summary */}
                {selectedCustomer && (
                  <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                          <span className="text-white font-bold text-lg">
                            {selectedCustomer.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900">{selectedCustomer.name}</h2>
                          <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                        </div>
                      </div>
                      
                      {selectedAccount && (
                        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2">
                          {(() => {
                            const config = PLATFORM_ICONS[selectedAccount.platform?.toLowerCase()] || {};
                            const IconComp = config.icon || Globe;
                            return (
                              <>
                                <div className={`p-1.5 rounded-lg ${config.bgColor || 'bg-gray-100'}`}>
                                  <IconComp className="h-4 w-4" style={{ color: config.color }} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
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
                    <TimePeriodChart
                      platform={selectedAccount.platform?.toLowerCase()}
                      accountId={chartAccountId}
                      title={`${formatPlatformName(selectedAccount.platform)} Analytics - ${selectedPage?.name || selectedAccount.name || 'Account'}`}
                      defaultMetric="followers"
                    />
                  </div>
                ) : (
                  /* Empty State - No Selection */
                  <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm">
                    <div className="flex flex-col items-center justify-center py-16 sm:py-24 px-6 text-center">
                      {!selectedCustomer ? (
                        <>
                          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                            <Users className="h-10 w-10 text-blue-500" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Customer</h3>
                          <p className="text-gray-500 max-w-md">
                            Choose a customer from the list to view their connected social media accounts and analytics data.
                          </p>
                        </>
                      ) : !selectedAccount ? (
                        <>
                          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex items-center justify-center mb-4">
                            <Globe className="h-10 w-10 text-purple-500" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Social Account</h3>
                          <p className="text-gray-500 max-w-md">
                            {customerAccounts.length > 0 
                              ? 'Choose a connected social media account to view its analytics and performance metrics.'
                              : 'This customer has no connected social media accounts yet. They need to connect their accounts first.'}
                          </p>
                        </>
                      ) : (
                        <>
                          <div className="w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center mb-4">
                            <TrendingUp className="h-10 w-10 text-amber-500" />
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Analytics</h3>
                          <p className="text-gray-500 max-w-md">
                            Preparing analytics data for the selected account...
                          </p>
                        </>
                      )}
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
