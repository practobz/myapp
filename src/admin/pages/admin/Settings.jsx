import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, Mail, Shield, Lock, Eye, EyeOff, CheckCircle, AlertCircle, 
  Save, Search, Facebook, Instagram, Linkedin, Youtube, 
  ChevronDown, ChevronUp, ToggleLeft, ToggleRight, Loader2, Users
} from 'lucide-react';

const PLATFORMS = [
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-blue-600', textColor: 'text-blue-600', bgLight: 'bg-blue-50' },
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-pink-600', textColor: 'text-pink-600', bgLight: 'bg-pink-50' },
  { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  { key: 'youtube', label: 'YouTube', icon: Youtube, color: 'bg-red-600', textColor: 'text-red-600', bgLight: 'bg-red-50' }
];

const getApiBaseUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'https://my-backend-593529385135.asia-south1.run.app';
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:3001';
};

// Memoized Platform Toggle Component
const PlatformToggle = memo(({ platform, enabled, onToggle, loading }) => {
  const Icon = platform.icon;
  return (
    <button
      onClick={() => onToggle(platform.key, !enabled)}
      disabled={loading}
      className={`flex items-center justify-between w-full p-2 sm:p-2.5 rounded-lg border transition-all touch-manipulation ${
        enabled 
          ? 'bg-white border-gray-200 active:bg-gray-50' 
          : 'bg-gray-100 border-gray-200 opacity-60'
      } ${loading ? 'cursor-wait' : 'cursor-pointer'}`}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className={`p-1 sm:p-1.5 rounded-lg ${enabled ? platform.bgLight : 'bg-gray-200'}`}>
          <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${enabled ? platform.textColor : 'text-gray-400'}`} />
        </div>
        <span className={`text-xs font-medium ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>
          {platform.label}
        </span>
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 animate-spin" />
      ) : enabled ? (
        <ToggleRight className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
      ) : (
        <ToggleLeft className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
      )}
    </button>
  );
});

// Memoized Customer Card Component
const CustomerCard = memo(({ customer, onTogglePlatform, loadingPlatforms, expandedCustomer, onExpand }) => {
  const isExpanded = expandedCustomer === customer._id;
  const platformAccess = customer.platformAccess || {
    facebook: true,
    instagram: true,
    linkedin: true,
    youtube: true
  };

  const handleExpand = useCallback(() => {
    onExpand(isExpanded ? null : customer._id);
  }, [isExpanded, customer._id, onExpand]);

  return (
    <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full px-2.5 sm:px-3 py-2 sm:py-3 flex items-center justify-between active:bg-gray-50 transition-colors touch-manipulation"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs sm:text-sm font-semibold">
              {customer.name?.[0]?.toUpperCase() || 'C'}
            </span>
          </div>
          <div className="text-left min-w-0">
            <h4 className="font-medium text-gray-900 text-xs sm:text-sm truncate">{customer.name}</h4>
            <p className="text-[10px] sm:text-xs text-gray-500 truncate">{customer.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <div className="hidden xs:flex items-center gap-0.5">
            {PLATFORMS.map(p => {
              const Icon = p.icon;
              const enabled = platformAccess[p.key] !== false;
              return (
                <div key={p.key} className={`p-0.5 rounded ${enabled ? p.bgLight : 'bg-gray-100'}`}>
                  <Icon className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${enabled ? p.textColor : 'text-gray-300'}`} />
                </div>
              );
            })}
          </div>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] sm:text-xs text-gray-600 py-1.5 sm:py-2">
            Toggle platform access:
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
            {PLATFORMS.map(platform => (
              <PlatformToggle
                key={platform.key}
                platform={platform}
                enabled={platformAccess[platform.key] !== false}
                onToggle={(key, value) => onTogglePlatform(customer._id, key, value)}
                loading={loadingPlatforms[`${customer._id}-${platform.key}`]}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Memoized Tab Button
const TabButton = memo(({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={`flex-1 flex items-center justify-center gap-1 sm:gap-1.5 px-2 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all touch-manipulation ${
      active
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
        : 'text-gray-600 active:bg-gray-100'
    }`}
  >
    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
    <span className="hidden xs:inline">{label}</span>
  </button>
));

function Settings() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile state
  const [adminData, setAdminData] = useState({ name: '', email: '', role: '' });
  
  // Password state
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false });
  const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });
  
  // Customer platform management state
  const [customers, setCustomers] = useState([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCustomer, setExpandedCustomer] = useState(null);
  const [loadingPlatforms, setLoadingPlatforms] = useState({});
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });

  // Load admin data
  useEffect(() => {
    if (currentUser) {
      setAdminData({
        name: currentUser.name || currentUser.email?.split('@')[0] || 'Admin',
        email: currentUser.email || '',
        role: currentUser.role || 'admin'
      });
    }
  }, [currentUser]);

  // Fetch customers - memoized
  const fetchCustomers = useCallback(async () => {
    if (!currentUser) return;
    try {
      setCustomersLoading(true);
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/admin/assigned-customers?adminId=${currentUser?._id || currentUser?.id}`);
      if (response.ok) {
        const data = await response.json();
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setCustomersLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && activeTab === 'customers') {
      fetchCustomers();
    }
  }, [currentUser, activeTab, fetchCustomers]);

  // Filtered customers - memoized
  const filteredCustomers = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const term = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.name?.toLowerCase().includes(term) || 
      c.email?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  // Tab change handler - memoized
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  // Password input handler - memoized
  const handlePasswordInput = useCallback((field, value) => {
    setPasswordData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Toggle password visibility - memoized
  const togglePasswordVisibility = useCallback((field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }));
  }, []);

  // Handle password change - memoized
  const handlePasswordChange = useCallback(async () => {
    setPasswordMessage({ type: '', text: '' });
    
    if (!passwordData.currentPassword) {
      setPasswordMessage({ type: 'error', text: 'Please enter current password' });
      return;
    }
    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    try {
      setPasswordLoading(true);
      const apiUrl = getApiBaseUrl();
      const userId = currentUser?._id || currentUser?.id;
      const response = await fetch(`${apiUrl}/admin/${userId}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setPasswordMessage({ type: 'success', text: 'Password changed!' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to change password' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Network error' });
    } finally {
      setPasswordLoading(false);
    }
  }, [passwordData, currentUser]);

  // Handle platform toggle - memoized
  const handleTogglePlatform = useCallback(async (customerId, platformKey, enabled) => {
    const loadingKey = `${customerId}-${platformKey}`;
    setLoadingPlatforms(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const apiUrl = getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/customers/${customerId}/platform-access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform: platformKey, enabled })
      });

      if (response.ok) {
        setCustomers(prev => prev.map(c => {
          if (c._id === customerId) {
            return { ...c, platformAccess: { ...c.platformAccess, [platformKey]: enabled } };
          }
          return c;
        }));
        setSaveMessage({ type: 'success', text: `${platformKey} ${enabled ? 'enabled' : 'disabled'}` });
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 2000);
      } else {
        setSaveMessage({ type: 'error', text: 'Update failed' });
      }
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Network error' });
    } finally {
      setLoadingPlatforms(prev => ({ ...prev, [loadingKey]: false }));
    }
  }, []);

  // Expand handler - memoized
  const handleExpand = useCallback((id) => {
    setExpandedCustomer(id);
  }, []);

  // Search handler - memoized
  const handleSearchChange = useCallback((e) => {
    setSearchTerm(e.target.value);
  }, []);

  return (
    <AdminLayout title="Settings">
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-4">
        {/* Tab Navigation - Compact */}
        <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 p-1">
          <div className="flex gap-1">
            <TabButton active={activeTab === 'profile'} onClick={() => handleTabChange('profile')} icon={User} label="Profile" />
            <TabButton active={activeTab === 'security'} onClick={() => handleTabChange('security')} icon={Lock} label="Security" />
            <TabButton active={activeTab === 'customers'} onClick={() => handleTabChange('customers')} icon={Users} label="Customers" />
          </div>
        </div>

        {/* Profile Tab - Compact */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-3 sm:px-4 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <span className="text-white text-base sm:text-lg font-bold">
                    {adminData.name?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate">{adminData.name}</h2>
                  <p className="text-blue-100 text-xs capitalize">{adminData.role}</p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                    <User className="w-3 h-3" />
                    Full Name
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900">
                    {adminData.name || '-'}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700 mb-1">
                    <Mail className="w-3 h-3" />
                    Email
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 truncate">
                    {adminData.email || '-'}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 sm:p-3">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-blue-900">Admin Account</p>
                    <p className="text-[10px] sm:text-xs text-blue-700 mt-0.5">
                      Full access to manage customers and settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Security Tab - Compact */}
        {activeTab === 'security' && (
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 px-3 sm:px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">Change Password</h2>
                  <p className="text-orange-100 text-[10px] sm:text-xs">Update account security</p>
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4 space-y-3">
              {passwordMessage.text && (
                <div className={`p-2 sm:p-2.5 rounded-lg flex items-center gap-2 text-xs sm:text-sm ${
                  passwordMessage.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className="font-medium">{passwordMessage.text}</span>
                </div>
              )}

              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.current ? 'text' : 'password'}
                      value={passwordData.currentPassword}
                      onChange={(e) => handlePasswordInput('currentPassword', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Current password"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('current')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600 p-0.5 touch-manipulation"
                    >
                      {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.new ? 'text' : 'password'}
                      value={passwordData.newPassword}
                      onChange={(e) => handlePasswordInput('newPassword', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="New password (min 6 chars)"
                      disabled={!passwordData.currentPassword}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('new')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600 p-0.5 touch-manipulation"
                    >
                      {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordData.confirmPassword}
                      onChange={(e) => handlePasswordInput('confirmPassword', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Confirm new password"
                      disabled={!passwordData.currentPassword}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirm')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 active:text-gray-600 p-0.5 touch-manipulation"
                    >
                      {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={passwordLoading || !passwordData.currentPassword}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-sm font-semibold active:from-orange-600 active:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-manipulation"
              >
                {passwordLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Changing...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Change Password</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Customers Tab - Compact */}
        {activeTab === 'customers' && (
          <div className="space-y-3">
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-3 sm:px-4 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-white">Platform Access</h2>
                      <p className="text-purple-100 text-[10px] sm:text-xs">Manage customer platforms</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-white/60 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full sm:w-44 pl-8 pr-3 py-1.5 bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 text-xs"
                    />
                  </div>
                </div>
              </div>

              {saveMessage.text && (
                <div className={`mx-3 mt-3 p-2 rounded-lg flex items-center gap-2 text-xs ${
                  saveMessage.type === 'success' 
                    ? 'bg-green-50 border border-green-200 text-green-800'
                    : 'bg-red-50 border border-red-200 text-red-800'
                }`}>
                  {saveMessage.type === 'success' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                  )}
                  <span>{saveMessage.text}</span>
                </div>
              )}

              <div className="p-3">
                {customersLoading ? (
                  <div className="py-8 text-center">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-2" />
                    <p className="text-gray-600 text-xs">Loading...</p>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="py-8 text-center">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-600 text-xs font-medium">
                      {searchTerm ? 'No customers found' : 'No customers assigned'}
                    </p>
                    {searchTerm && (
                      <button 
                        onClick={() => setSearchTerm('')}
                        className="mt-1 text-purple-600 text-xs font-medium active:underline touch-manipulation"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[10px] sm:text-xs text-gray-500 mb-2">
                      {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? 's' : ''} • Tap to expand
                    </p>
                    {filteredCustomers.map(customer => (
                      <CustomerCard
                        key={customer._id}
                        customer={customer}
                        onTogglePlatform={handleTogglePlatform}
                        loadingPlatforms={loadingPlatforms}
                        expandedCustomer={expandedCustomer}
                        onExpand={handleExpand}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 sm:p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-[10px] sm:text-xs text-amber-700">
                  <span className="font-medium text-amber-900">Note:</span> Disabled platforms show a contact admin message to customers.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default Settings;
