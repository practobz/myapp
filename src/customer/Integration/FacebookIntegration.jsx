import React, { useState, useEffect } from 'react';
import {
  Facebook, BarChart3, Eye, Calendar, Trash2, TrendingUp, Plus, Users, UserCheck, 
  ExternalLink, CheckCircle, AlertCircle, Loader2, Settings, Heart, MessageCircle, Share,
  PieChart as PieChartIcon, RefreshCw
} from 'lucide-react';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import { subDays, format } from 'date-fns';
import { getUserData, setUserData, removeUserData, migrateToUserSpecificStorage } from '../../utils/sessionUtils';
import TimePeriodChart from '../../components/TimeperiodChart';


// Your Facebook App ID
const FACEBOOK_APP_ID = '4416243821942660';

// Time period options for historical data
const TIME_PERIOD_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 15, label: 'Last 15 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 2 months' },
  { value: 90, label: 'Last 3 months' },
  { value: 180, label: 'Last 6 months' },
  { value: 365, label: 'Last 1 year' }
];

// Embedded Chart Components
const TrendChart = ({ data, title, color = "#3B82F6", metric = "value" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    [metric]: Number(item[metric]) || 0
  }));

  const maxValue = Math.max(...chartData.map(item => item[metric]));
  const total = chartData.reduce((sum, item) => sum + item[metric], 0);
  const average = total / chartData.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">Trend over time</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color }}>
            {total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${title})`}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500 mt-4 pt-4 border-t border-gray-100">
        <div>Peak: {maxValue.toLocaleString()}</div>
        <div>Avg: {Math.round(average).toLocaleString()}</div>
      </div>
    </div>
  );
};

const CustomBarChart = ({ data, title, color = "#3B82F6", metric = "value" }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  const chartData = data.slice(-7).map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    }),
    [metric]: Number(item[metric]) || 0
  }));

  const total = chartData.reduce((sum, item) => sum + item[metric], 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">Last 7 days</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color }}>
            {total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6B7280' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
            <Bar 
              dataKey={metric} 
              fill={color}
              radius={[4, 4, 0, 0]}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const CustomPieChart = ({ data, title, colors = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"] }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
        <div className="h-64 flex items-center justify-center text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  // Calculate total values for each metric from the analytics data
  const pieData = [
    { 
      name: 'Likes', 
      value: data.reduce((sum, item) => sum + (item.value || 0), 0),
      color: colors[0] || "#3B82F6"
    },
    { 
      name: 'Comments', 
      value: data.reduce((sum, item) => sum + (item.value || 0), 0),
      color: colors[1] || "#10B981"
    },
    { 
      name: 'Shares', 
      value: data.reduce((sum, item) => sum + (item.value || 0), 0),
      color: colors[2] || "#8B5CF6"
    },
    { 
      name: 'Reactions', 
      value: data.reduce((sum, item) => sum + (item.value || 0), 0),
      color: colors[3] || "#F59E0B"
    }
  ].filter(item => item.value > 0);

  const total = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">Distribution breakdown</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-700">
            {total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
      </div>
      
      <div className="h-64 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value, name) => [value.toLocaleString(), name]}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
        {pieData.map((entry, index) => (
          <div key={entry.name} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            ></div>
            <div className="text-xs text-gray-600">
              <span className="font-medium">{entry.name}:</span> {entry.value.toLocaleString()}
              <span className="text-gray-400 ml-1">
                ({total > 0 ? Math.round((entry.value / total) * 100) : 0}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

function FacebookIntegration({ onData, onConnectionStatusChange }) {
  // Multi-account state
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [fbError, setFbError] = useState(null);
  
  // Current active account data
  const [activeAccount, setActiveAccount] = useState(null);
  const [fbPages, setFbPages] = useState([]);
  const [pageInsights, setPageInsights] = useState({});
  const [pagePosts, setPagePosts] = useState({});
  const [loadingInsights, setLoadingInsights] = useState({});
  const [loadingPosts, setLoadingPosts] = useState({});
  const [analyticsData, setAnalyticsData] = useState({});
  const [loadingAnalytics, setLoadingAnalytics] = useState({});
  const [timePeriods, setTimePeriods] = useState({});
  const [showFacebookPosts, setShowFacebookPosts] = useState({});

  // Chart visualization state
  const [chartTypes, setChartTypes] = useState({}); // Per page chart type selection

  // Per-post analytics state
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [singlePostAnalytics, setSinglePostAnalytics] = useState(null);
  const [loadingSinglePost, setLoadingSinglePost] = useState(false);

  // Post upload modal state
  const [showPostModal, setShowPostModal] = useState(false);
  const [postTarget, setPostTarget] = useState(null);
  const [postMessage, setPostMessage] = useState('');
  const [postImageUrl, setPostImageUrl] = useState('');
  const [uploadingPost, setUploadingPost] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [growthData, setGrowthData] = useState({});

  // Scheduled data collection status
  const [scheduledJobStatus, setScheduledJobStatus] = useState(null);

  // Chart type options
  const CHART_TYPE_OPTIONS = [
    { value: 'trend', label: 'Trend Chart', icon: TrendingUp },
    { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
    { value: 'pie', label: 'Pie Chart', icon: PieChartIcon },
    { value: 'historical', label: 'Historical Data', icon: Calendar }
  ];

  // Helper function to check if Facebook API is ready
  const isFacebookApiReady = () => {
    return window.FB && window.FB.api && typeof window.FB.api === 'function';
  };

  // Load connected accounts from localStorage on component mount
  useEffect(() => {
    console.log('🔍 Component mounted, loading accounts from storage...');
    
    // First, migrate any existing data to user-specific storage
    migrateToUserSpecificStorage([
      'fb_connected_accounts',
      'fb_active_account_id'
    ]);

    const savedAccounts = getUserData('fb_connected_accounts');
    const savedActiveId = getUserData('fb_active_account_id');
    
    console.log('📦 Storage check on mount:', {
      savedAccounts: savedAccounts ? savedAccounts.length : 0,
      savedActiveId,
      accountsData: savedAccounts
    });
    
    if (savedAccounts && Array.isArray(savedAccounts) && savedAccounts.length > 0) {
      console.log('✅ Setting accounts from storage:', savedAccounts);
      setConnectedAccounts(savedAccounts);
      
      if (savedActiveId && savedAccounts.some(acc => acc.id === savedActiveId)) {
        setActiveAccountId(savedActiveId);
        const activeAcc = savedAccounts.find(acc => acc.id === savedActiveId);
        setActiveAccount(activeAcc);
        console.log('✅ Set active account:', activeAcc?.name);
      } else if (savedAccounts.length > 0) {
        // Set first account as active if no valid active account
        setActiveAccountId(savedAccounts[0].id);
        setActiveAccount(savedAccounts[0]);
        setUserData('fb_active_account_id', savedAccounts[0].id);
        console.log('✅ Set first account as active:', savedAccounts[0].name);
      }
    } else {
      console.log('ℹ️ No connected accounts found in storage');
    }
  }, []);

  // Load Facebook SDK
  useEffect(() => {
    if (document.getElementById('facebook-jssdk')) {
      // SDK already loaded, check if it's ready
      const checkReady = () => {
        if (isFacebookApiReady()) {
          setFbSdkLoaded(true);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
      return;
    }
    
    window.fbAsyncInit = function() {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v19.0'
      });
      
      // Wait for FB to be fully ready
      const checkReady = () => {
        if (isFacebookApiReady()) {
          setFbSdkLoaded(true);
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    };
    
    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  }, []);

  // Fetch pages for active account (only when SDK is ready and we have an active account)
  useEffect(() => {
    if (activeAccount && fbSdkLoaded && isFacebookApiReady()) {
      fetchFbPages();
    }
  }, [activeAccount, fbSdkLoaded]);

  // Function to store current metrics as historical snapshot
  const storeHistoricalSnapshot = async (pageId, pageName, metrics) => {
    try {
      // Calculate total engagement
      const totalEngagement = (metrics.totalLikes || 0) + (metrics.totalComments || 0) + (metrics.totalShares || 0) + (metrics.totalReactions || 0);
      
      console.log('📊 Storing historical snapshot:', {
        pageName,
        fanCount: metrics.fanCount || 0,
        totalLikes: metrics.totalLikes || 0,
        totalComments: metrics.totalComments || 0,
        totalShares: metrics.totalShares || 0,
        totalReactions: metrics.totalReactions || 0,
        totalEngagement,
        postsCount: metrics.postsCount || 0
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/historical-data/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'facebook',
          accountId: pageId,
          pageId: pageId,
          accountName: pageName,
          metrics: {
            // Primary metrics (standardized names)
            followersCount: metrics.fanCount || 0,
            likesCount: metrics.totalLikes || 0,
            commentsCount: metrics.totalComments || 0,
            sharesCount: metrics.totalShares || 0,
            reactionsCount: metrics.totalReactions || 0,
            engagementCount: totalEngagement,
            postsCount: metrics.postsCount || 0
          },
          dataSource: 'api'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`✅ Stored historical snapshot for Facebook page: ${pageName}`, {
          likes: metrics.totalLikes || 0,
          comments: metrics.totalComments || 0,
          fanCount: metrics.fanCount || 0,
          engagement: totalEngagement
        });
      } else {
        console.error('❌ Failed to store snapshot:', result.error);
      }
    } catch (error) {
      console.warn('Failed to store historical snapshot:', error);
    }
  };

  // Save accounts to localStorage with better error handling
  const saveAccountsToStorage = (accounts) => {
    console.log('💾 Saving accounts to storage:', accounts.length, 'accounts');
    try {
      setUserData('fb_connected_accounts', accounts);
      console.log('✅ Accounts saved successfully');
      
      // Verify the save worked
      const verification = getUserData('fb_connected_accounts');
      console.log('🔍 Storage verification:', verification ? verification.length : 0, 'accounts');
    } catch (error) {
      console.error('❌ Failed to save accounts:', error);
    }
  };

  // Handle Facebook login for new account with improved persistence
  const fbLogin = () => {
    if (!isFacebookApiReady()) {
      setFbError({ message: 'Facebook SDK is not ready. Please wait and try again.' });
      return;
    }

    setLoading(true);
    console.log('🔐 Starting Facebook login...');

    window.FB.login((response) => {
      setLoading(false);
      console.log('📨 Facebook login response:', response.status);
      
      if (response.status === 'connected') {
        const accessToken = response.authResponse.accessToken;
        const userId = response.authResponse.userID;
        
        console.log('✅ Facebook login successful, fetching user data...');
        
        // Fetch user data for the new account
        window.FB.api('/me', { 
          fields: 'id,name,email,picture',
          access_token: accessToken 
        }, function(userResponse) {
          if (!userResponse || userResponse.error) {
            console.error('❌ Failed to fetch user data:', userResponse.error);
            setFbError(userResponse.error);
            return;
          }
          
          console.log('👤 User data received:', userResponse.name);
          
          const newAccount = {
            id: userId,
            name: userResponse.name,
            email: userResponse.email,
            picture: userResponse.picture,
            accessToken: accessToken,
            connectedAt: new Date().toISOString(),
            tokenExpiresAt: response.authResponse.expiresIn ? 
              new Date(Date.now() + (response.authResponse.expiresIn * 1000)).toISOString() : null
          };
          
          console.log('🆕 Created new account object:', {
            id: newAccount.id,
            name: newAccount.name,
            email: newAccount.email
          });
          
          // Check if account already exists
          const existingAccountIndex = connectedAccounts.findIndex(acc => acc.id === userId);
          let updatedAccounts;
          
          if (existingAccountIndex >= 0) {
            console.log('🔄 Updating existing account');
            // Update existing account
            updatedAccounts = [...connectedAccounts];
            updatedAccounts[existingAccountIndex] = { ...updatedAccounts[existingAccountIndex], ...newAccount };
          } else {
            console.log('➕ Adding new account');
            // Add new account
            updatedAccounts = [...connectedAccounts, newAccount];
          }
          
          console.log('📊 Total accounts after update:', updatedAccounts.length);
          
          // Update state first
          setConnectedAccounts(updatedAccounts);
          setActiveAccountId(userId);
          setActiveAccount(newAccount);
          
          // Then save to storage
          saveAccountsToStorage(updatedAccounts);
          setUserData('fb_active_account_id', userId);
          
          // Clear any existing error
          setFbError(null);

          console.log('✅ Account setup complete, requesting long-lived token...');
          
          // Request long-lived token
          requestLongLivedToken(accessToken, newAccount).then(() => {
            // After token exchange, save again to ensure persistence
            const finalAccounts = [...updatedAccounts];
            saveAccountsToStorage(finalAccounts);
            console.log('💾 Final save after token exchange complete');
          });
        });
      } else {
        console.error('❌ Facebook login failed:', response);
        setFbError({ message: 'Facebook login failed or was cancelled' });
      }
    }, {
      scope: 'pages_show_list,pages_read_engagement,pages_manage_metadata,email,public_profile,business_management',
      return_scopes: true,
      auth_type: 'rerequest'
    });
  };

  // Enhanced requestLongLivedToken with better state persistence
  const requestLongLivedToken = async (shortLivedToken, account) => {
    try {
      console.log('🔄 Requesting long-lived token via backend...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/facebook/exchange-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shortLivedToken: shortLivedToken,
          userId: account.id
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.longLivedToken) {
        console.log('✅ Received long-lived token (expires in', data.expiresIn, 'seconds)');
        
        // Calculate expiration date (usually 60 days)
        const expirationDate = data.expiresIn ? 
          new Date(Date.now() + (data.expiresIn * 1000)).toISOString() : 
          new Date(Date.now() + (60 * 24 * 60 * 60 * 1000)).toISOString(); // Default 60 days
        
        // Update account with long-lived token
        const updatedAccount = {
          ...account,
          accessToken: data.longLivedToken,
          tokenType: 'long_lived',
          tokenExpiresAt: expirationDate
        };
        
        console.log('🔄 Updating account with long-lived token...');
        
        // Update in state and storage
        setConnectedAccounts(prevAccounts => {
          const updatedAccounts = prevAccounts.map(acc => 
            acc.id === account.id ? updatedAccount : acc
          );
          
          // Immediately save to storage
          saveAccountsToStorage(updatedAccounts);
          console.log('💾 Saved updated accounts with long-lived token');
          
          return updatedAccounts;
        });
        
        if (activeAccountId === account.id) {
          setActiveAccount(updatedAccount);
        }

        console.log('💾 Stored long-lived token, expires:', new Date(expirationDate).toLocaleDateString());
        
        return updatedAccount;
      } else {
        console.warn('⚠️ Failed to get long-lived token:', data.error || 'Unknown error');
        // Continue with short-lived token
        return account;
      }
    } catch (error) {
      console.warn('⚠️ Error requesting long-lived token:', error);
      // Continue with short-lived token - this is not critical for basic functionality
      return account;
    }
  };

  // Check if token is expired or about to expire
  const isTokenExpired = (account) => {
    if (!account.tokenExpiresAt) return false;
    
    const expiryTime = new Date(account.tokenExpiresAt);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    
    return (expiryTime.getTime() - now.getTime()) < bufferTime;
  };

  // Handle API errors and token refresh
  const handleApiError = async (error, pageId = null) => {
    console.error('Facebook API Error:', error);
    
    if (error.code === 190 || error.message?.includes('expired') || error.message?.includes('Session has expired')) {
      console.log('🔄 Token expired, attempting refresh...');
      
      // Try to refresh the current session
      const refreshSuccess = await refreshCurrentSession();
      
      if (refreshSuccess) {
        console.log('✅ Session refreshed successfully');
        setFbError(null);
        
        // Retry the failed operation if we have a pageId
        if (pageId && activeAccount) {
          setTimeout(() => {
            fetchFbPages();
          }, 1000);
        }
      } else {
        console.log('❌ Session refresh failed');
        setFbError({ 
          message: 'Your Facebook session has expired. Please reconnect your account.',
          code: 'SESSION_EXPIRED',
          action: 'reconnect'
        });
      }
    } else {
      setFbError(error);
    }
  };

  // Refresh current session
  const refreshCurrentSession = async () => {
    return new Promise((resolve) => {
      if (!isFacebookApiReady()) {
        resolve(false);
        return;
      }

      window.FB.getLoginStatus((response) => {
        if (response.status === 'connected') {
          // Update token in our storage
          const newToken = response.authResponse.accessToken;
          const userId = response.authResponse.userID;
          
          if (activeAccount && activeAccount.id === userId) {
            const updatedAccount = {
              ...activeAccount,
              accessToken: newToken,
              tokenExpiresAt: response.authResponse.expiresIn ? 
                new Date(Date.now() + (response.authResponse.expiresIn * 1000)).toISOString() : null
            };
            
            setActiveAccount(updatedAccount);
            
            // Update in connectedAccounts
            const updatedAccounts = connectedAccounts.map(acc =>
              acc.id === userId ? updatedAccount : acc
            );
            
            setConnectedAccounts(updatedAccounts);
            saveAccountsToStorage(updatedAccounts);
            
            resolve(true);
          } else {
            resolve(false);
          }
        } else {
          resolve(false);
        }
      }, true); // Force fresh status check
    });
  };

  // Modified fetchFbPages to automatically fetch posts after pages are loaded
  const fetchFbPages = () => {
    if (!activeAccount || !isFacebookApiReady()) {
      setFbError({ message: 'Facebook API is not ready or no active account' });
      return;
    }
    
    // Check if token is expired before making API call
    if (isTokenExpired(activeAccount)) {
      console.log('⚠️ Token appears to be expired, refreshing...');
      refreshCurrentSession().then(success => {
        if (success) {
          // Retry after refresh
          setTimeout(() => fetchFbPages(), 1000);
        } else {
          handleApiError({ 
            message: 'Session expired', 
            code: 190 
          });
        }
      });
      return;
    }
    
    console.log('🔍 Fetching pages...');
    
    window.FB.api('/me/accounts', {
      fields: 'id,name,access_token,category,about,fan_count,link,picture,username,website,phone,verification_status,tasks',
      access_token: activeAccount.accessToken
    }, function(response) {
      if (!response || response.error) {
        handleApiError(response.error);
        console.error('❌ Failed to fetch pages:', response.error);
      } else {
        console.log('✅ Fetched pages successfully:', response.data.length);
        setFbPages(response.data);
        setFbError(null); // Clear any previous errors
        
        // Initialize chart types for each page (default to historical)
        const defaultChartTypes = {};
        const defaultShowPosts = {};
        response.data.forEach(page => {
          defaultChartTypes[page.id] = 'historical'; // Changed default to historical
          defaultShowPosts[page.id] = true; // Auto-show posts
        });
        setChartTypes(defaultChartTypes);
        setShowFacebookPosts(defaultShowPosts);
        
        // AUTO-FETCH POSTS AND STORE SNAPSHOTS FOR ALL PAGES
        console.log('🚀 Auto-fetching posts and storing snapshots for all pages...');
        response.data.forEach(async (page) => {
          console.log(`📄 Processing page: ${page.name} (${page.id})`);
          await storeConnectedPage(page);
          
          // Store initial snapshot with basic page data
          const initialMetrics = {
            fanCount: page.fan_count || 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
            totalReactions: 0,
            postsCount: 0
          };
          
          await storeHistoricalSnapshot(page.id, page.name, initialMetrics);
          
          // Automatically fetch posts for this page (which will update the snapshot)
          setTimeout(() => {
            fetchPagePosts(page.id, page.access_token, true); // true = silent fetch
          }, 1000); // Increased delay to avoid rate limiting
        });
      }
    });
  };

  // Modified fetchPageInsights with error handling
  const fetchPageInsights = (pageId, pageAccessToken) => {
    if (!isFacebookApiReady()) {
      setFbError({ message: 'Facebook API is not ready' });
      return;
    }

    setLoadingInsights(prev => ({ ...prev, [pageId]: true }));
    
    window.FB.api(
      `/${pageId}/posts`,
      {
        fields: 'id,message,created_time,likes.summary(true),comments.summary(true),shares,reactions.summary(true),full_picture',
        limit: 10,
        access_token: pageAccessToken
      },
      function(response) {
        setLoadingInsights(prev => ({ ...prev, [pageId]: false }));
        if (!response || response.error) {
          console.error('Posts fetch error:', response.error);
          handleApiError(response.error, pageId);
          setPageInsights(prev => ({
            ...prev,
            [pageId]: []
          }));
        } else {
          const posts = response.data;
          const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0);
          const totalComments = posts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0);
          const totalShares = posts.reduce((sum, post) => sum + (post.shares?.count || 0), 0);
          const totalReactions = posts.reduce((sum, post) => sum + (post.reactions?.summary?.total_count || 0), 0);
          
          const engagementMetrics = [
            { name: 'Likes', value: totalLikes, title: 'Facebook Likes (Last 10 posts)' },
            { name: 'Comments', value: totalComments, title: 'Facebook Comments (Last 10 posts)' },
            { name: 'Shares', value: totalShares, title: 'Facebook Shares (Last 10 posts)' },
            { name: 'Reactions', value: totalReactions, title: 'Facebook Reactions (Last 10 posts)' }
          ];
          
          setPageInsights(prev => ({
            ...prev,
            [pageId]: engagementMetrics
          }));

          // Update historical snapshot with post data
          const page = fbPages.find(p => p.id === pageId);
          if (page) {
            storeHistoricalSnapshot(pageId, page.name, {
              fanCount: page.fan_count,
              totalLikes,
              totalComments,
              totalShares,
              totalReactions,
              postsCount: posts.length
            });
          }
        }
      }
    );
  };

  // Fetch single post analytics
  const fetchSinglePostAnalytics = (post) => {
    if (!post || !isFacebookApiReady()) return;
    
    setLoadingSinglePost(true);
    setSelectedPostId(post.id);
    
    // For Facebook posts, we already have the engagement data
    const analytics = {
      likes: [{ date: post.created_time, value: post.likes?.summary?.total_count || 0 }],
      comments: [{ date: post.created_time, value: post.comments?.summary?.total_count || 0 }],
      shares: [{ date: post.created_time, value: post.shares?.count || 0 }],
      reactions: [{ date: post.created_time, value: post.reactions?.summary?.total_count || 0 }]
    };
    
    setSinglePostAnalytics(analytics);
    setLoadingSinglePost(false);
  };

  const fetchStoredAnalytics = async (pageId) => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/analytics/${pageId}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        const latestAnalytics = result.data[0];
        console.log('✅ Loaded analytics from database:', latestAnalytics.createdAt);
        
        setAnalyticsData(prev => ({
          ...prev,
          [pageId]: latestAnalytics.analytics
        }));
        
        setTimePeriods(prev => ({ ...prev, [pageId]: latestAnalytics.timePeriod }));
        
        return true;
      }
      return false;
    } catch (error) {
      console.warn('Failed to fetch stored analytics:', error);
      return false;
    }
  };

  const fetchPageAnalytics = (pageId, pageAccessToken, days = 30) => {
    setLoadingAnalytics(prev => ({ ...prev, [pageId]: true }));
    
    setTimePeriods(prev => ({ ...prev, [pageId]: days }));
    
    console.log('Using post-based analytics (Facebook Insights API not available for this app type)');
    fetchPostBasedAnalytics(pageId, pageAccessToken, days);
  };

  const fetchPostBasedAnalytics = (pageId, pageAccessToken, days = 30) => {
    if (!isFacebookApiReady()) {
      setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
      setFbError({ message: 'Facebook API is not ready' });
      return;
    }

    const postsLimit = Math.min(500, Math.max(50, days * 3));
    
    window.FB.api(
      `/${pageId}/posts`,
      {
        fields: 'id,message,created_time,likes.summary(true),comments.summary(true),shares,reactions.summary(true),full_picture',
        limit: postsLimit,
        access_token: pageAccessToken
      },
      function(response) {
        setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
        
        if (!response || response.error) {
          console.error('Posts fetch error for analytics:', response.error);
          return;
        }

        const posts = response.data;
        const analyticsData = generatePostBasedAnalytics(posts, days);
        
        setAnalyticsData(prev => ({
          ...prev,
          [pageId]: { facebook: analyticsData }
        }));
        
        fetch(`${process.env.REACT_APP_API_URL}/api/analytics/store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageId,
            platform: 'facebook',
            analytics: analyticsData,
            timePeriod: days
          })
        }).catch(err => console.warn('Failed to store analytics:', err));
      }
    );
  };

  const generatePostBasedAnalytics = (posts, days = 30) => {
    const endDate = new Date();
    const result = {
      engagement: [],
      likes: [],
      comments: [],
      shares: [],
      reactions: []
    };

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayPosts = posts.filter(post => {
        const postDate = new Date(post.created_time);
        return format(postDate, 'yyyy-MM-dd') === dateStr;
      });

      const dayLikes = dayPosts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0);
      const dayComments = dayPosts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0);
      const dayShares = dayPosts.reduce((sum, post) => sum + (post.shares?.count || 0), 0);
      const dayReactions = dayPosts.reduce((sum, post) => sum + (post.reactions?.summary?.total_count || 0), 0);
      const dayEngagement = dayLikes + dayComments + dayShares + dayReactions;

      result.engagement.push({ date: dateStr, value: dayEngagement });
      result.likes.push({ date: dateStr, value: dayLikes });
      result.comments.push({ date: dateStr, value: dayComments });
      result.shares.push({ date: dateStr, value: dayShares });
      result.reactions.push({ date: dateStr, value: dayReactions });
    }

    return result;
  };

  const fetchPageAnalyticsWithDbFirst = async (pageId, pageAccessToken, days = 30) => {
    setLoadingAnalytics(prev => ({ ...prev, [pageId]: true }));
    
    setTimePeriods(prev => ({ ...prev, [pageId]: days }));
    
    try {
      const loadedFromDb = await fetchStoredAnalytics(pageId);
      
      if (loadedFromDb) {
        console.log('📊 Using stored analytics data');
        setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
        return;
      }
      
      console.log('🔄 No stored data found, fetching live analytics...');
      await fetchPageAnalyticsLive(pageId, pageAccessToken, days);
      
    } catch (error) {
      console.error('Analytics fetch error:', error);
      setLoadingAnalytics(prev => ({ ...prev, [pageId]: false }));
    }
  };

  const fetchPageAnalyticsLive = async (pageId, pageAccessToken, days = 30) => {
    console.log('📡 Fetching live analytics from Facebook APIs...');
    fetchPostBasedAnalytics(pageId, pageAccessToken, days);
  };

  // Enhanced analytics rendering with chart type selector including historical data
  const renderAnalytics = (pageId) => {
    const analytics = analyticsData[pageId];
    const selectedPeriod = timePeriods[pageId] || 30;
    const chartType = chartTypes[pageId] || 'historical';
    
    if (chartType === 'historical') {
      return (
        <div className="mt-8">
          <TimePeriodChart
            platform="facebook"
            accountId={pageId}
            title="Facebook Page Analytics"
            defaultMetric="followers"
          />
        </div>
      );
    }

    if (!analytics) return null;

    // Prepare data for pie chart (total engagement breakdown)
    const pieChartData = [
      { 
        name: 'Likes', 
        value: analytics.facebook?.likes?.reduce((sum, item) => sum + item.value, 0) || 0,
        color: '#10B981'
      },
      { 
        name: 'Comments', 
        value: analytics.facebook?.comments?.reduce((sum, item) => sum + item.value, 0) || 0,
        color: '#8B5CF6'
      },
      { 
        name: 'Shares', 
        value: analytics.facebook?.shares?.reduce((sum, item) => sum + item.value, 0) || 0,
        color: '#F59E0B'
      },
      { 
        name: 'Reactions', 
        value: analytics.facebook?.reactions?.reduce((sum, item) => sum + item.value, 0) || 0,
        color: '#EF4444'
      }
    ].filter(item => item.value > 0);

    const renderChartsForType = () => {
      if (chartType === 'trend') {
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {analytics.facebook?.engagement && (
              <TrendChart
                data={analytics.facebook.engagement}
                title="Daily Engagement"
                color="#1877F2"
                metric="value"
              />
            )}
            
            {analytics.facebook?.likes && (
              <TrendChart
                data={analytics.facebook.likes}
                title="Daily Likes"
                color="#10B981"
                metric="value"
              />
            )}
            
            {analytics.facebook?.comments && (
              <TrendChart
                data={analytics.facebook.comments}
                title="Daily Comments"
                color="#8B5CF6"
                metric="value"
              />
            )}
            
            {analytics.facebook?.shares && (
              <TrendChart
                data={analytics.facebook.shares}
                title="Daily Shares"
                color="#F59E0B"
                metric="value"
              />
            )}
          </div>
        );
      } else if (chartType === 'bar') {
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
            {analytics.facebook?.engagement && (
              <CustomBarChart
                data={analytics.facebook.engagement}
                title="Daily Engagement"
                color="#1877F2"
                metric="value"
              />
            )}
            
            {analytics.facebook?.likes && (
              <CustomBarChart
                data={analytics.facebook.likes}
                title="Daily Likes"
                color="#10B981"
                metric="value"
              />
            )}
            
            {analytics.facebook?.comments && (
              <CustomBarChart
                data={analytics.facebook.comments}
                title="Daily Comments"
                color="#8B5CF6"
                metric="value"
              />
            )}
            
            {analytics.facebook?.shares && (
              <CustomBarChart
                data={analytics.facebook.shares}
                title="Daily Shares"
                color="#F59E0B"
                metric="value"
              />
            )}
          </div>
        );
      } else if (chartType === 'pie') {
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CustomPieChart
              data={pieChartData}
              title="Total Engagement Distribution"
              colors={["#10B981", "#8B5CF6", "#F59E0B", "#EF4444"]}
            />
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Engagement Summary</h3>
              <div className="space-y-4">
                {pieChartData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      ></div>
                      <span className="font-medium text-gray-700">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {item.value.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {((item.value / pieChartData.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }
    };

    return (
      <div className="mt-8 space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Facebook Analytics</h3>
              <p className="text-sm text-gray-600">Last {selectedPeriod} days performance</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <label htmlFor={`time-period-${pageId}`} className="text-sm font-medium text-gray-600">
                  Time Period:
                </label>
                <select
                  id={`time-period-${pageId}`}
                  value={selectedPeriod}
                  onChange={(e) => {
                    const days = parseInt(e.target.value);
                    const page = fbPages.find(p => p.id === pageId);
                    if (page) {
                      fetchPageAnalyticsWithDbFirst(pageId, page.access_token, days);
                    }
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {TIME_PERIOD_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <label htmlFor={`chart-type-${pageId}`} className="text-sm font-medium text-gray-600">
                  Chart Type:
                </label>
                <select
                  id={`chart-type-${pageId}`}
                  value={chartType}
                  onChange={(e) => {
                    setChartTypes(prev => ({ 
                      ...prev, 
                      [pageId]: e.target.value 
                    }));
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {CHART_TYPE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
                🗄️ DB + Live Data
              </div>
              <div className="text-xs text-gray-500 bg-green-50 px-2 py-1 rounded border border-green-200">
                📊 {chartType === 'historical' ? 'Historical View' : chartType === 'trend' ? 'Trend View' : chartType === 'bar' ? 'Bar View' : 'Pie View'}
              </div>
            </div>
          </div>
        </div>
        
        {renderChartsForType()}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Engagement</p>
                <p className="text-2xl font-bold text-blue-800">
                  {analytics.facebook.engagement?.reduce((sum, item) => sum + item.value, 0)?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-blue-500">Last {selectedPeriod} days</p>
              </div>
              <Facebook className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Likes</p>
                <p className="text-2xl font-bold text-green-800">
                  {analytics.facebook.likes?.reduce((sum, item) => sum + item.value, 0)?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-green-500">Last {selectedPeriod} days</p>
              </div>
              <Heart className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Total Comments</p>
                <p className="text-2xl font-bold text-purple-800">
                  {analytics.facebook.comments?.reduce((sum, item) => sum + item.value, 0)?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-purple-500">Last {selectedPeriod} days</p>
              </div>
              <MessageCircle className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Avg Daily Activity</p>
                <p className="text-2xl font-bold text-orange-800">
                  {Math.round(analytics.facebook.engagement?.reduce((sum, item) => sum + item.value, 0) / selectedPeriod)?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-orange-500">Per day average</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper to generate growth data for likes/comments/followers
  const generateGrowthData = (pageId) => {
    const posts = pagePosts[pageId] || [];
    // Followers: Only one value, but show as a flat line
    const followersArr = [];
    if (fbPages.length > 0) {
      const page = fbPages.find(p => p.id === pageId);
      if (page && page.fan_count) {
        // Show last 30 days as a flat line
        for (let i = 29; i >= 0; i--) {
          const date = subDays(new Date(), i);
          followersArr.push({ date: format(date, 'yyyy-MM-dd'), value: page.fan_count });
        }
      }
    }
    // Likes/comments: Sum per day
    const likesArr = [];
    const commentsArr = [];
    const sharesArr = [];
    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayPosts = posts.filter(post => format(new Date(post.created_time), 'yyyy-MM-dd') === dateStr);
      likesArr.push({
        date: dateStr,
        value: dayPosts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0)
      });
      commentsArr.push({
        date: dateStr,
        value: dayPosts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0)
      });
      sharesArr.push({
        date: dateStr,
        value: dayPosts.reduce((sum, post) => sum + (post.shares?.count || 0), 0)
      });
    }
    return { followers: followersArr, likes: likesArr, comments: commentsArr, shares: sharesArr };
  };

  // Whenever posts or pages change, update growthData
  useEffect(() => {
    if (fbPages.length > 0) {
      const newGrowthData = {};
      fbPages.forEach(page => {
        newGrowthData[page.id] = generateGrowthData(page.id);
      });
      setGrowthData(newGrowthData);
    }
  }, [fbPages, pagePosts]);

  // Enhanced growth charts with multiple chart types
  const renderGrowthCharts = (pageId) => {
    const data = growthData[pageId];
    const chartType = chartTypes[pageId] || 'historical';
    
    if (!data) return null;

    const renderGrowthChartsForType = () => {
      if (chartType === 'trend') {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <TrendChart
              data={data.followers}
              title="Followers"
              color="#1877F2"
              metric="value"
            />
            <TrendChart
              data={data.likes}
              title="Likes Growth"
              color="#10B981"
              metric="value"
            />
            <TrendChart
              data={data.comments}
              title="Comments Growth"
              color="#8B5CF6"
              metric="value"
            />
            <TrendChart
              data={data.shares}
              title="Shares Growth"
              color="#F59E0B"
              metric="value"
            />
          </div>
        );
      } else if (chartType === 'bar') {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <CustomBarChart
              data={data.followers}
              title="Followers"
              color="#1877F2"
              metric="value"
            />
            <CustomBarChart
              data={data.likes}
              title="Likes Growth"
              color="#10B981"
              metric="value"
            />
            <CustomBarChart
              data={data.comments}
              title="Comments Growth"
              color="#8B5CF6"
              metric="value"
            />
            <CustomBarChart
              data={data.shares}
              title="Shares Growth"
              color="#F59E0B"
              metric="value"
            />
          </div>
        );
      } else if (chartType === 'pie') {
        // For pie chart, show distribution of total growth metrics
        const totalLikes = data.likes.reduce((sum, item) => sum + item.value, 0);
        const totalComments = data.comments.reduce((sum, item) => sum + item.value, 0);
        const totalShares = data.shares.reduce((sum, item) => sum + item.value, 0);
        const followers = data.followers[0]?.value || 0;

        const growthPieData = [
          { name: 'Total Likes', value: totalLikes, color: '#10B981' },
          { name: 'Total Comments', value: totalComments, color: '#8B5CF6' },
          { name: 'Total Shares', value: totalShares, color: '#F59E0B' },
          { name: 'Current Followers', value: followers, color: '#1877F2' }
        ].filter(item => item.value > 0);

        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <CustomPieChart
              data={growthPieData}
              title="Growth Metrics Distribution"
              colors={["#10B981", "#8B5CF6", "#F59E0B", "#1877F2"]}
            />
            
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Growth Statistics</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {followers.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Current Followers</div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {totalLikes.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Total Likes (30d)</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {totalComments.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Total Comments (30d)</div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-600">
                      {totalShares.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">Total Shares (30d)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      } else if (chartType === 'historical') {
        return (
          <TimePeriodChart
            platform="facebook"
            accountId={pageId}
            title="Facebook Page Historical Analytics"
            defaultMetric="likesCount"
            showScheduledDataOnly={true}
            dataSource="scheduled_job"
          />
        );
      }
    };

    return (
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h4 className="font-semibold text-blue-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Growth Trends (Last 30 days)
          </h4>
          
          <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-200 p-1">
            {CHART_TYPE_OPTIONS.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setChartTypes(prev => ({ ...prev, [pageId]: option.value }))}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                    chartType === option.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        
        {renderGrowthChartsForType()}
      </div>
    );
  };

  // Modified fetchPagePosts to support silent fetching and store snapshots with better metrics
  const fetchPagePosts = (pageId, pageAccessToken, silent = false) => {
    if (!isFacebookApiReady()) {
      setFbError({ message: 'Facebook API is not ready' });
      return;
    }

    if (!silent) {
      setLoadingPosts(prev => ({ ...prev, [pageId]: true }));
    }

    console.log(`🔍 Fetching posts for page ${pageId} (silent: ${silent})`);

    window.FB.api(
      `/${pageId}/posts`,
      {
        fields: 'id,message,created_time,permalink_url,likes.summary(true),comments.summary(true),shares,reactions.summary(true),full_picture',
        limit: 25, // Increased limit to get more accurate totals
        access_token: pageAccessToken
      },
      function(response) {
        if (!silent) {
          setLoadingPosts(prev => ({ ...prev, [pageId]: false }));
        }
        
        if (!response || response.error) {
          console.error('Facebook posts fetch error:', response.error);
          if (!silent) {
            handleApiError(response.error, pageId);
          }
        } else {
          console.log(`✅ Fetched ${response.data.length} posts for page ${pageId}`);
          
          // Calculate metrics from posts
          const posts = response.data;
          const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0);
          const totalComments = posts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0);
          const totalShares = posts.reduce((sum, post) => sum + (post.shares?.count || 0), 0);
          const totalReactions = posts.reduce((sum, post) => sum + (post.reactions?.summary?.total_count || 0), 0);
          
          console.log('📊 Calculated metrics from posts:', {
            pageId,
            totalLikes,
            totalComments,
            totalShares,
            totalReactions,
            postsCount: posts.length
          });
          
          setPagePosts(prev => ({
            ...prev,
            [pageId]: posts
          }));
          
          // Store historical snapshot with calculated metrics
          const page = fbPages.find(p => p.id === pageId);
          if (page) {
            storeHistoricalSnapshot(pageId, page.name, {
              fanCount: page.fan_count,
              totalLikes,
              totalComments,
              totalShares,
              totalReactions,
              postsCount: posts.length
            });
          }
          
          // Don't auto-show posts visually unless user requests it
          if (!silent) {
            setShowFacebookPosts(prev => ({ ...prev, [pageId]: true }));
          }
        }
      }
    );
  };

  const renderPageInsights = (pageId) => {
    const insights = pageInsights[pageId];
    if (!insights || insights.length === 0) return null;

    return (
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h5 className="font-medium text-blue-700 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Engagement Metrics (Last 10 posts)
        </h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {insights.map((metric, index) => (
            <div key={index} className="bg-white rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {metric.value?.toLocaleString() || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium">
                {metric.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPagePosts = (pageId) => {
    const posts = pagePosts[pageId];
    const isVisible = showFacebookPosts[pageId];
    
    if (!posts || posts.length === 0) return null;

    return (
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h5 className="font-medium text-gray-700 flex items-center">
            <Facebook className="h-5 w-5 mr-2" />
            Recent Posts ({posts.length})
          </h5>
          <button
            onClick={() => setShowFacebookPosts(prev => ({ ...prev, [pageId]: !prev[pageId] }))
            }
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isVisible ? 'Hide Posts' : 'Show Posts'}
          </button>
        </div>
        
        {isVisible && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                {post.full_picture && (
                  <div className="aspect-video relative">
                    <img 
                      src={post.full_picture} 
                      alt="Post media" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                      Facebook Post
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(post.created_time).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  
                  {post.message && (
                    <p className="text-sm text-gray-800 mb-3 line-clamp-3">
                      {post.message.length > 100 ? 
                        post.message.substring(0, 100) + '...' : 
                        post.message
                      }
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span>{post.likes?.summary?.total_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageCircle className="h-3 w-3 text-blue-500" />
                        <span>{post.comments?.summary?.total_count || 0}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Share className="h-3 w-3 text-green-500" />
                        <span>{post.shares?.count || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {post.permalink_url && (
                      <a 
                        href={post.permalink_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-xs font-medium inline-flex items-center space-x-1"
                      >
                        <span>View on Facebook</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    <button
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                      onClick={() => fetchSinglePostAnalytics(post)}
                    >
                      Show Analytics
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render single post analytics
  const renderSinglePostAnalytics = () => {
    if (!singlePostAnalytics || !selectedPostId) return null;
    
    return (
      <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-6">
        <h5 className="font-medium text-purple-700 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Single Post Analytics
        </h5>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {singlePostAnalytics.likes && (
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-red-600">
                {singlePostAnalytics.likes[0]?.value || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium flex items-center justify-center">
                <Heart className="h-4 w-4 mr-1 text-red-500" />
                Likes
              </div>
            </div>
          )}
          {singlePostAnalytics.comments && (
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {singlePostAnalytics.comments[0]?.value || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium flex items-center justify-center">
                <MessageCircle className="h-4 w-4 mr-1 text-blue-500" />
                Comments
              </div>
            </div>
          )}
          {singlePostAnalytics.shares && (
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {singlePostAnalytics.shares[0]?.value || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium flex items-center justify-center">
                <Share className="h-4 w-4 mr-1 text-green-500" />
                Shares
              </div>
            </div>
          )}
          {singlePostAnalytics.reactions && (
            <div className="bg-white rounded-lg p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                {singlePostAnalytics.reactions[0]?.value || 0}
              </div>
              <div className="text-sm text-gray-600 font-medium flex items-center justify-center">
                <span className="mr-1">😍</span>
                Reactions
              </div>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            setSelectedPostId(null);
            setSinglePostAnalytics(null);
          }}
          className="mt-4 text-sm text-purple-600 hover:text-purple-700 font-medium"
        >
          Close Analytics
        </button>
      </div>
    );
  };

  const renderPostModal = () => {
    if (!showPostModal || !postTarget) return null;
    const { type, page } = postTarget;

    const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploadResult({
        success: false,
        error: 'Please upload your image to a public host (e.g. imgur, Cloudinary, S3) and paste the URL below.'
      });
      setPostImageUrl('');
    };

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
            onClick={() => {
              setShowPostModal(false);
              setPostMessage('');
              setPostImageUrl('');
              setUploadResult(null);
            }}
          >✕</button>
          <h4 className="font-bold mb-4">Create Facebook Post</h4>
          <div className="space-y-3">
                                                                                         <textarea
              className="w-full border rounded p-2"
              rows={3}
              placeholder="Write your post message..."
              value={postMessage}
              onChange={e => setPostMessage(e.target.value)}
            />
            <input
              className="w-full border rounded p-2"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            {postImageUrl && (
              <img src={postImageUrl} alt="Preview" className="w-full h-32 object-contain rounded border" />
            )}
            <input
              className="w-full border rounded p-2"
              type="text"
              placeholder="Image URL (publicly accessible, optional)"
              value={postImageUrl}
              onChange={e => setPostImageUrl(e.target.value)}
            />
            <div className="text-xs text-gray-500">
              Image is optional for Facebook posts.
            </div>
            <button
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 mt-2"
              disabled={uploadingPost || (!postMessage && !postImageUrl)}
              onClick={() => uploadFacebookPost(page)}
            >
              {uploadingPost ? 'Posting...' : 'Post'}
            </button>
            {uploadResult && (
              <div className={`mt-2 text-sm ${uploadResult.success ? 'text-green-600' : 'text-red-600'}`}>
                {uploadResult.success
                  ? `✅ Post uploaded! ID: ${uploadResult.id}`
                  : `❌ Error: ${uploadResult.error}`}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderPageDetails = (page) => (
    <div key={page.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {page.picture ? (
            <img 
              src={page.picture.data.url} 
              alt={page.name}
              className="w-20 h-20 rounded-full border-4 border-blue-200"
            />
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center">
              <Facebook className="h-10 w-10 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">{page.name}</h2>
              {page.verification_status && (
                <CheckCircle className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium">Category:</span> {page.category}
            </p>
            {page.about && (
              <p className="text-sm text-gray-700 bg-white bg-opacity-50 p-2 rounded">
                {page.about}
              </p>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-6 text-center mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {page.fan_count?.toLocaleString() || 'N/A'}
          </div>
          <div className="text-sm text-gray-600 font-medium">Followers</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {pagePosts[page.id]?.length || 0}
          </div>
          <div className="text-sm text-gray-600 font-medium">Recent Posts</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {pagePosts[page.id]?.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0) || 0}
          </div>
          <div className="text-sm text-gray-600 font-medium">Total Likes</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-sm">
        <div className="bg-white rounded-lg p-4 space-y-2">
          <div><strong>Page ID:</strong> {page.id}</div>
          <div><strong>Username:</strong> @{page.username || 'N/A'}</div>
          <div><strong>Phone:</strong> {page.phone || 'N/A'}</div>
        </div>
        <div className="bg-white rounded-lg p-4 space-y-2">
          <div><strong>Website:</strong> 
            {page.website ? (
              <a href={page.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                {page.website}
              </a>
            ) : 'N/A'}
          </div>
          <div><strong>Link:</strong> 
            {page.link ? (
              <a href={page.link} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                View Page
              </a>
            ) : 'N/A'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 flex items-center space-x-2 font-medium"
          onClick={() => {
            setPostTarget({ type: 'facebook', page });
            setShowPostModal(true);
            setPostMessage('');
            setPostImageUrl('');
            setUploadResult(null);
          }}
          disabled={!isFacebookApiReady()}
        >
          <Facebook className="h-4 w-4" />
          <span>Create Post</span>
        </button>
        
        <button
          onClick={() => fetchPageInsights(page.id, page.access_token)}
          disabled={loadingInsights[page.id] || !isFacebookApiReady()}
          className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-600 disabled:opacity-50 flex items-center space-x-2 font-medium"
        >
          <BarChart3 className="h-4 w-4" />
          <span>{loadingInsights[page.id] ? 'Loading...' : 'Get Insights'}</span>
        </button>
        
        <button
          onClick={() => fetchPagePosts(page.id, page.access_token)}
          disabled={loadingPosts[page.id] || !isFacebookApiReady()}
          className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 disabled:opacity-50 flex items-center space-x-2 font-medium"
        >
          <Facebook className="h-4 w-4" />
          <span>{loadingPosts[page.id] ? 'Loading...' : 'Refresh Posts'}</span>
        </button>

        <button
          onClick={() => {
            // Manual snapshot with current data
            const posts = pagePosts[page.id] || [];
            const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0);
            const totalComments = posts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0);
            const totalShares = posts.reduce((sum, post) => sum + (post.shares?.count || 0), 0);
            const totalReactions = posts.reduce((sum, post) => sum + (post.reactions?.summary?.total_count || 0), 0);
            
            console.log('📸 Manual snapshot trigger - Current metrics:', {
              totalLikes,
              totalComments,
              totalShares,
              totalReactions,
              postsCount: posts.length,
              fanCount: page.fan_count
            });
            
            storeHistoricalSnapshot(page.id, page.name, {
              fanCount: page.fan_count,
              totalLikes,
              totalComments,
              totalShares,
              totalReactions,
              postsCount: posts.length
            });
          }}
          className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-cyan-600 flex items-center space-x-2 font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Capture Snapshot</span>
        </button>
      </div>

      <div className="mt-8">
        <TimePeriodChart
          platform="facebook"
          accountId={page.id}
          title="Facebook Page Historical Analytics"
          defaultMetric="likesCount"
          showScheduledDataOnly={true}
          dataSource="scheduled_job"
        />
      </div>

      {renderPageInsights(page.id)}
      {renderPagePosts(page.id)}
      {renderSinglePostAnalytics()}
    </div>
  );

  // Switch active account
  const switchAccount = (accountId) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (account) {
      setActiveAccountId(accountId);
      setActiveAccount(account);
      setUserData('fb_active_account_id', accountId);
      
      // Clear current data
      setFbPages([]);
      setPageInsights({});
      setPagePosts({});
      setAnalyticsData({});
      setSinglePostAnalytics(null);
      setSelectedPostId(null);
    }
  };

  // Remove account
  const removeAccount = (accountId) => {
    const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
    setConnectedAccounts(updatedAccounts);
    saveAccountsToStorage(updatedAccounts);
    
    if (activeAccountId === accountId) {
      if (updatedAccounts.length > 0) {
        // Switch to first remaining account
        switchAccount(updatedAccounts[0].id);
      } else {
        // No accounts left
        setActiveAccountId(null);
        setActiveAccount(null);
        setFbPages([]);
        setPageInsights({});
        setPagePosts({});
        setAnalyticsData({});
        setSinglePostAnalytics(null);
        setSelectedPostId(null);
        removeUserData('fb_active_account_id');
      }
    }
  };

  // Logout all accounts
  const fbLogoutAll = () => {
    if (!isFacebookApiReady()) {
      // Just clear local state if FB API is not available
      clearAllAccountData();
      return;
    }

    // Check if we have a valid Facebook session before calling logout
    window.FB.getLoginStatus((response) => {
      if (response.status === 'connected') {
        // Only call logout if user is actually logged in
        window.FB.logout(() => {
          clearAllAccountData();
        });
      } else {
        // User is not logged in to Facebook, just clear local data
        clearAllAccountData();
      }
    });
  };

  // Helper function to clear all account data
  const clearAllAccountData = () => {
    setConnectedAccounts([]);
    setActiveAccountId(null);
    setActiveAccount(null);
    setFbPages([]);
    setPageInsights({});
    setPagePosts({});
    setAnalyticsData({});
    setSinglePostAnalytics(null);
    setSelectedPostId(null);
    setChartTypes({});
    removeUserData('fb_connected_accounts');
    removeUserData('fb_active_account_id');
  };

  // Store connected page information
  const storeConnectedPage = async (page) => {
    try {
      // First store the page data
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/connected-pages/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page.id,
          pageName: page.name,
          accessToken: page.access_token,
          userId: activeAccount?.id || 'unknown',
          accountName: activeAccount?.name || 'unknown'
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored connected page:', page.name);
      }

      // Store customer social account for admin access
      await storeCustomerSocialAccount(page);
      
    } catch (error) {
      console.warn('Failed to store connected page:', error);
    }
  };

  // Store customer social account for admin access
  const storeCustomerSocialAccount = async (page) => {
    try {
      // Get current user/customer ID from auth context or localStorage
      let customerId = null;
      
      // Try multiple ways to get customer ID
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      customerId = currentUser.userId || currentUser.id || currentUser._id || currentUser.customer_id;
      
      // If still no customer ID, try getting from other possible sources
      if (!customerId) {
        const authUser = JSON.parse(localStorage.getItem('user') || '{}');
        customerId = authUser.userId || authUser.id || authUser._id || authUser.customer_id;
      }
      
      console.log('🔍 Customer ID search:', {
        currentUser,
        customerId,
        found: !!customerId
      });
      
      if (!customerId) {
        console.warn('No customer ID found, cannot store social account');
        return;
      }

      if (!activeAccount?.accessToken) {
        console.error('❌ No user access token available - refresh will not work');
        alert('Warning: User access token is missing. Token refresh may not work. Please reconnect if you experience issues.');
      }

      const accountData = {
        customerId: customerId,
        platform: 'facebook',
        platformUserId: activeAccount.id,
        name: activeAccount.name,
        email: activeAccount.email,
        profilePicture: activeAccount.picture?.data?.url,
        accessToken: activeAccount.accessToken,
        userId: activeAccount.id,
        pages: [
          {
            id: page.id,
            name: page.name,
            accessToken: page.access_token,
            category: page.category,
            fanCount: page.fan_count,
            permissions: ['pages_read_engagement'],
            tasks: page.tasks || [],
            tokenValidatedAt: new Date().toISOString()
          }
        ],
        connectedAt: new Date().toISOString(),
        needsReconnection: false,
        lastTokenValidation: new Date().toISOString(),
        refreshError: null,
        lastRefreshAttempt: null,
        lastSuccessfulValidation: new Date().toISOString(),
        tokenStatus: 'active'
      };

      const hasUserToken = !!accountData.accessToken;
      const hasPageToken = !!accountData.pages[0].accessToken;

      if (!hasUserToken) {
        console.warn('⚠️ Missing user access token - refresh will not work');
        accountData.needsReconnection = true;
        accountData.refreshError = 'User access token not available during connection';
        accountData.tokenStatus = 'invalid_user_token';
      }

      if (!hasPageToken) {
        console.warn('⚠️ Missing page access token - posting will not work');
        accountData.needsReconnection = true;
        accountData.refreshError = 'Page access token not available during connection';
        accountData.tokenStatus = 'invalid_page_token';
      }

      console.log('🔑 Token Validation Summary:', {
        hasUserToken,
        hasPageToken,
        userTokenLength: accountData.accessToken?.length || 0,
        pageTokenLength: accountData.pages[0].accessToken?.length || 0,
        needsReconnection: accountData.needsReconnection,
        tokenStatus: accountData.tokenStatus
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored customer social account for admin access');
      } else {
        console.warn('Failed to store customer social account:', result.error);
      }
      
    } catch (error) {
      console.warn('Failed to store customer social account:', error);
    }
  };

  // Enhanced token refresh with never-expiring page tokens
  const refreshPageTokens = async () => {
    if (!activeAccount || !isFacebookApiReady()) {
      console.warn('Cannot refresh tokens: no active account or FB API not ready');
      return;
    }

    console.log('🔄 Refreshing page access tokens...');
    setLoading(true);
    
    try {
      // First refresh the user session
      const sessionRefreshed = await refreshCurrentSession();
      
      if (sessionRefreshed) {
        // Get never-expiring page tokens via backend
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/facebook/page-tokens`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userAccessToken: activeAccount.accessToken,
            userId: activeAccount.id
          })
        });
        
        const data = await response.json();
        
        if (data.success && data.pages) {
          console.log(`✅ Got never-expiring tokens for ${data.pages.length} pages`);
          
          // Update pages with never-expiring tokens
          setFbPages(prevPages => {
            return prevPages.map(page => {
              const updatedPage = data.pages.find(p => p.id === page.id);
              if (updatedPage) {
                return {
                  ...page,
                  access_token: updatedPage.access_token,
                  tokenType: 'never_expiring_page_token'
                };
              }
              return page;
            });
          });
          
          alert('✅ Tokens refreshed successfully! Page tokens are now never-expiring.');
        } else {
          // Fallback to re-fetching pages normally
          fetchFbPages();
          alert('✅ Tokens refreshed successfully!');
        }
        setFbError(null);
      } else {
        setFbError('Failed to refresh session. Please try reconnecting your Facebook account.');
      }
    } catch (error) {
      console.error('❌ Failed to refresh tokens:', error);
      setFbError('Failed to refresh tokens. Please try reconnecting your Facebook account.');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced error display
  const renderError = () => {
    if (!fbError) return null;

    const isTokenError = fbError.code === 'SESSION_EXPIRED' || 
                        (typeof fbError === 'string' && (fbError.includes('expired') || fbError.includes('refresh')));

    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <h3 className="text-lg font-semibold text-red-800">
            {isTokenError ? 'Session Expired' : 'Facebook API Error'}
          </h3>
        </div>
        <p className="text-red-700 mb-4">
          {typeof fbError === 'string' ? fbError : fbError.message || JSON.stringify(fbError)}
        </p>
        
        {isTokenError && (
          <div className="space-y-2">
            <p className="text-sm text-red-700">
              Your Facebook session has expired. You can try refreshing the tokens or reconnect your account.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={refreshPageTokens}
                disabled={loading}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                🔄 Refresh Tokens
              </button>
              <button
                onClick={fbLogin}
                disabled={loading}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
              >
                🔗 Reconnect Account
              </button>
            </div>
          </div>
        )}
        
        <div className="flex space-x-3 mt-4">
          <button
            onClick={() => setFbError(null)}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Dismiss
          </button>
          {!isTokenError && (
            <button
              onClick={fbLogin}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  };

  // Render account selector with token status
  const renderAccountSelector = () => {
    if (connectedAccounts.length <= 1) return null;

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-700 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Connected Facebook Accounts ({connectedAccounts.length})
          </h4>
          <div className="flex items-center space-x-2">
            <button
              onClick={refreshPageTokens}
              disabled={!fbSdkLoaded || !isFacebookApiReady() || !activeAccount || loading}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
            >
              <span>🔄</span>
              <span>Refresh Tokens</span>
            </button>
            <button
              onClick={fbLogin}
              disabled={!fbSdkLoaded || !isFacebookApiReady() || loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Add Account</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectedAccounts.map((account) => {
            const expired = isTokenExpired(account);
            
            return (
              <div
                key={account.id}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  activeAccountId === account.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                } ${expired ? 'border-orange-300 bg-orange-50' : ''}`}
                onClick={() => switchAccount(account.id)}
              >
                <div className="flex items-center space-x-3">
                  {account.picture ? (
                    <img
                      src={account.picture.data.url}
                      alt={account.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Facebook className="h-6 w-6 text-blue-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900 truncate">{account.name}</h5>
                      {activeAccountId === account.id && (
                        <UserCheck className="h-4 w-4 text-blue-600" />
                      )}
                      {expired && (
                        <span className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{account.email}</p>
                    <p className="text-xs text-gray-500">
                      Connected {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                    {account.tokenExpiresAt && (
                      <p className="text-xs text-gray-500">
                        Token expires: {new Date(account.tokenExpiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAccount(account.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Token Status Information */}
        {activeAccount && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h6 className="font-medium text-blue-800 mb-2">🔑 Token Management</h6>
            <div className="text-sm text-blue-700 text-left space-y-1">
              <p>📝 <strong>Active Account:</strong> {activeAccount.name}</p>
              <p>🔄 <strong>Auto-Refresh:</strong> Tokens are automatically refreshed when needed</p>
              <p>⏰ <strong>Session Management:</strong> Only expires when you manually disconnect</p>
              <p>🔗 <strong>Manual Actions:</strong> Use "Refresh Tokens" if you encounter issues</p>
              <p>✅ <strong>Permissions:</strong> pages_read_engagement, pages_manage_metadata</p>
              {activeAccount.tokenExpiresAt && (
                <p>⏳ <strong>Token Expires:</strong> {new Date(activeAccount.tokenExpiresAt).toLocaleString()}</p>
              )}
              <p>📊 <strong>Historical Data:</strong> Automatically captured daily</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Upload Facebook Post
  const uploadFacebookPost = async (page) => {
    if (!isFacebookApiReady()) {
      setUploadResult({ success: false, error: 'Facebook API is not ready' });
      return;
    }

    setUploadingPost(true);
    setUploadResult(null);

    try {
      console.log('📤 Uploading Facebook post...');
      
      const postData = {
        message: postMessage,
        access_token: page.access_token
      };

      // Add image URL if provided
      if (postImageUrl) {
        postData.link = postImageUrl;
      }

      window.FB.api(
        `/${page.id}/feed`,
        'POST',
        postData,
        function(response) {
          setUploadingPost(false);
          
          if (response && !response.error) {
            console.log('✅ Facebook post uploaded successfully:', response.id);
            setUploadResult({
              success: true,
              id: response.id,
              message: 'Facebook post uploaded successfully!'
            });
            
            // Clear form after successful upload
            setTimeout(() => {
              setPostMessage('');
              setPostImageUrl('');
              setShowPostModal(false);
              setUploadResult(null);
            }, 3000);
          } else {
            console.error('❌ Facebook post upload failed:', response.error);
            setUploadResult({
              success: false,
              error: response.error?.message || 'Failed to upload Facebook post'
            });
          }
        }
      );
    } catch (error) {
      console.error('❌ Facebook post upload error:', error);
      setUploadingPost(false);
      setUploadResult({
        success: false,
        error: error.message || 'Failed to upload Facebook post'
      });
    }
  };

  // CRITICAL FIX: Enhanced useEffect to send data to parent with better timing
  useEffect(() => {
    if (onData) {
      // Create enhanced data structure with all metrics calculated
      const enhancedData = fbPages.map(page => {
        const posts = pagePosts[page.id] || [];
        const analytics = analyticsData[page.id] || null;
        
        // Calculate totals from posts for immediate display
        const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.summary?.total_count || 0), 0);
        const totalComments = posts.reduce((sum, post) => sum + (post.comments?.summary?.total_count || 0), 0);
        const totalShares = posts.reduce((sum, post) => sum + (post.shares?.count || 0), 0);
        const totalEngagement = totalLikes + totalComments + totalShares;
        
        return {
          ...page,
          posts,
          analytics,
          // Add calculated metrics for dashboard
          calculatedMetrics: {
            totalLikes,
            totalComments,
            totalShares,
            totalEngagement,
            engagementRate: page.fan_count > 0 ? ((totalEngagement / page.fan_count) * 100).toFixed(2) : 0
          }
        };
      });
      
      console.log('📤 Sending data to dashboard:', {
        pages: enhancedData.length,
        totalPosts: enhancedData.reduce((sum, page) => sum + page.posts.length, 0),
        totalLikes: enhancedData.reduce((sum, page) => sum + (page.calculatedMetrics?.totalLikes || 0), 0),
        pagesWithAnalytics: enhancedData.filter(page => page.analytics).length
      });
      
      onData(enhancedData);
    }
  }, [fbPages, pagePosts, analyticsData, onData]);

  // Notify parent about connection status
  useEffect(() => {
    if (onConnectionStatusChange) {
      // Connected if there is at least one account and token is not expired
      const isConnected = connectedAccounts.length > 0 && !connectedAccounts.some(isTokenExpired);
      onConnectionStatusChange(isConnected);
    }
  }, [connectedAccounts, activeAccount, fbSdkLoaded]);

  if (!fbSdkLoaded) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <Facebook className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Facebook Integration</span>
            </div>
          </div>
        </header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Loading Facebook SDK...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Facebook className="h-8 w-8 text-blue-600" />
            <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Facebook Integration</span>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600">Connecting to Facebook...</p>
              </div>
            </div>
          )}

          {fbError && renderError()}

          {connectedAccounts.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
                <Facebook className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Facebook Pages</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Connect your Facebook pages to manage posts and access detailed analytics with historical data tracking from one dashboard!
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
                <h4 className="font-medium text-blue-800 mb-2">📱 Setup Requirements</h4>
                <div className="text-sm text-blue-700 text-left space-y-1">
                  <p>1. Admin or Editor access to Facebook pages</p>
                  <p>2. Business Manager permissions (if applicable)</p>
                  <p>3. Grant required permissions during login</p>
                  <p>4. Pages will be automatically detected</p>
                  <p>5. Historical data will be captured automatically</p>
                </div>
              </div>
              <button
                onClick={fbLogin}
                disabled={!isFacebookApiReady() || loading}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-3 mx-auto font-medium disabled:opacity-50"
              >
                <Facebook className="h-5 w-5" />
                <span>{loading ? 'Connecting...' : 'Connect Facebook Account'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {renderAccountSelector()}
              
              {activeAccount && (
                <>
                  <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center space-x-3">
                      {activeAccount.picture ? (
                        <img 
                          src={activeAccount.picture.data.url} 
                          alt="Profile"
                          className="w-12 h-12 rounded-full border-2 border-blue-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Facebook className="h-6 w-6 text-blue-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">Active Account: {activeAccount.name}</p>
                        <p className="text-sm text-gray-600">{activeAccount.email}</p>
                        {isTokenExpired(activeAccount) && (
                          <p className="text-xs text-orange-600 font-medium">⚠️ Token expired - refresh recommended</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 bg-green-100 px-3 py-1 rounded-full">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Connected</span>
                      </div>
                      <button
                        onClick={fbLogoutAll}
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Disconnect All</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-4 text-lg">Pages for {activeAccount.name}:</h4>
                    {fbPages.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <Facebook className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-500 mb-2">No pages found or you don't manage any pages.</p>
                        <p className="text-sm text-gray-400 mb-4">Make sure you're an admin or editor of at least one Facebook page.</p>
                        <button
                          onClick={fetchFbPages}
                          disabled={!isFacebookApiReady() || loading}
                          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                        >
                          🔄 Retry Loading Pages
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {fbPages.map(page => renderPageDetails(page))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      {renderPostModal()}
    </div>
  );
}

export default FacebookIntegration;