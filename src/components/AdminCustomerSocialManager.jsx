import React, { useState, useEffect } from 'react';
import { 
  Users, Facebook, Instagram, Settings, 
  CheckCircle, RefreshCw, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function AdminCustomerSocialManager({ selectedCustomerId = null }) {
  const navigate = useNavigate();
  
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(selectedCustomerId);
  const [customerAccounts, setCustomerAccounts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomersWithSocialAccounts();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerAccounts(selectedCustomer);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedCustomerId) {
      setSelectedCustomer(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const fetchCustomersWithSocialAccounts = async () => {
    try {
      setLoading(true);
      console.log('📥 Fetching customers with social accounts...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/customer-social-links`);
      console.log('📡 Response status:', response.status);
      
      const data = await response.json();
      console.log('📊 Response data:', data);
      
      if (data.success) {
        console.log('✅ Found customers:', data.data?.length || 0);
        setCustomers(data.data || []);
        
        // Show debug information if available
        if (data.debug) {
          console.log('🔍 Debug info:', data.debug);
        }
        
        // If we have customers but the component was showing "no customers found",
        // this will help debug the issue
        if (data.data && data.data.length > 0) {
          console.log('🎉 Customers with social accounts:', data.data);
        } else {
          console.log('⚠️ No customers found in response');
          
          // If debug info shows social links exist but no customers, there's a processing issue
          if (data.debug && data.debug.totalSocialLinks > 0) {
            console.warn('🚨 ISSUE: Social links exist but no customers found!', {
              socialLinks: data.debug.totalSocialLinks,
              customers: data.debug.totalCustomers,
              docTypes: data.debug.docTypes
            });
          }
        }
      } else {
        console.error('❌ API returned error:', data.error);
        setCustomers([]);
      }
    } catch (error) {
      console.error('❌ Error fetching customers:', error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerAccounts = async (customerId) => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/customer-posting-accounts/${customerId}`);
      const data = await response.json();
      
      if (data.success) {
        setCustomerAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Error fetching customer accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'facebook': return <Facebook className="h-5 w-5 text-blue-600" />;
      case 'instagram': return <Instagram className="h-5 w-5 text-pink-600" />;
      default: return <Settings className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && !selectedCustomer) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-gray-600">Loading customers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back to Dashboard Navigation */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center text-gray-600 hover:text-blue-600 transition-colors group"
        >
          <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Dashboard</span>
        </button>
      </div>

      {/* Customer Selection */}
      {!selectedCustomerId && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <Users className="h-6 w-6 mr-2 text-blue-600" />
            Select Customer
          </h2>
          
          {customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No customers with connected social accounts found.</p>
              <p className="text-sm text-gray-400 mt-2">
                Customers can connect their social media accounts through the customer portal.
              </p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => {
                    console.log('🔄 Manually refreshing customers...');
                    fetchCustomersWithSocialAccounts();
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mr-2"
                >
                  Refresh
                </button>
                <button
                  onClick={() => {
                    console.log('🔍 Opening browser developer tools for debugging...');
                    alert('Check the browser console (F12) for detailed debug information about the database queries.');
                  }}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Debug Info
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {customers.map((customer) => (
                <div
                  key={customer.customerId}
                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                    selectedCustomer === customer.customerId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedCustomer(customer.customerId)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">{customer.customerName}</h3>
                    {selectedCustomer === customer.customerId && (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{customer.customerEmail}</p>
                  
                  <div className="flex items-center space-x-2">
                    {customer.socialAccounts.map((account) => (
                      <div key={account._id} className="flex items-center">
                        {getPlatformIcon(account.platform)}
                      </div>
                    ))}
                    <span className="text-xs text-gray-500 ml-2">
                      {customer.socialAccounts.length} account{customer.socialAccounts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Customer Social Accounts */}
      {selectedCustomer && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Settings className="h-6 w-6 mr-2 text-blue-600" />
              {customers.find(c => c.customerId === selectedCustomer)?.customerName}'s Social Accounts
            </h2>
            {!selectedCustomerId && (
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                ← Back to customers
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
              <span className="text-gray-600">Loading accounts...</span>
            </div>
          ) : customerAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active social media accounts found for this customer.</p>
              <p className="text-sm text-gray-400 mt-2">
                Customer can connect accounts through their portal.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {customerAccounts.map((account) => (
                <div key={account._id} className="border rounded-lg p-6 bg-gray-50">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getPlatformIcon(account.platform)}
                      <div>
                        <h3 className="font-semibold text-gray-900">{account.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{account.platform}</p>
                      </div>
                    </div>
                    
                    {account.profilePicture && (
                      <img 
                        src={account.profilePicture}
                        alt="Profile"
                        className="w-12 h-12 rounded-full border-2 border-gray-200"
                      />
                    )}
                  </div>

                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div>
                      <span className="font-medium">Connected:</span>
                      <span className="ml-2">{formatDate(account.connectedAt)}</span>
                    </div>
                    <div>
                      <span className="font-medium">Platform ID:</span>
                      <span className="ml-2 font-mono text-xs">{account.platformUserId}</span>
                    </div>
                    <div>
                      <span className="font-medium">Status:</span>
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Pages for Facebook/Instagram */}
                  {account.pages && account.pages.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2 text-sm">Connected Pages:</h4>
                      <div className="space-y-2">
                        {account.pages.map((page) => (
                          <div key={page.id} className="bg-white rounded p-3 text-sm border">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{page.name}</span>
                                <p className="text-xs text-gray-500 mt-1">{page.category}</p>
                              </div>
                              <span className="text-xs text-gray-500">
                                {page.fanCount?.toLocaleString()} followers
                              </span>
                            </div>
                            {page.instagramBusinessAccount && (
                              <div className="mt-2 flex items-center text-xs text-pink-600">
                                <Instagram className="h-3 w-3 mr-1" />
                                Instagram Connected
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Channels for YouTube */}
                  {account.channels && account.channels.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2 text-sm">Connected Channels:</h4>
                      <div className="space-y-2">
                        {account.channels.map((channel) => (
                          <div key={channel.id} className="bg-white rounded p-3 text-sm border">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">{channel.name}</span>
                                {channel.customUrl && (
                                  <p className="text-xs text-gray-500 mt-1">@{channel.customUrl}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-gray-500">
                                  {parseInt(channel.subscriberCount || 0).toLocaleString()} subscribers
                                </div>
                                <div className="text-xs text-gray-400">
                                  {parseInt(channel.videoCount || 0).toLocaleString()} videos
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Account Management Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Account Management
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          // Navigate to detailed account view or refresh
                          console.log('Account details for:', account.name);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
                        title="View details"
                      >
                        <Settings className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          // Refresh account data
                          fetchCustomerAccounts(selectedCustomer);
                        }}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-full transition-all"
                        title="Refresh account"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

     
    </div>
  );
}

export default AdminCustomerSocialManager;