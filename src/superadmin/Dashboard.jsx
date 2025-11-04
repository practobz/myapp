import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Settings, UserPlus, BarChart3, RefreshCw, CheckCircle, AlertCircle, X, Crown, Mail, User, AlertTriangle, Search, UserMinus } from 'lucide-react';

// API Service
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('superadminToken')}`
});

const handleResponse = async (response) => {
  const responseText = await response.text();
  
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error('Invalid response from server');
  }

  if (!response.ok) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data;
};

const apiService = {
  async getCustomers() {
    const response = await fetch(`${API_BASE_URL}/customers`);
    return handleResponse(response);
  },

  async getAdmins() {
    const response = await fetch(`${API_BASE_URL}/users?role=admin`);
    return handleResponse(response);
  },

  async assignCustomers(adminId, customerIds) {
    const response = await fetch(`${API_BASE_URL}/superadmin/assign-customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        adminId,
        customerIds
      })
    });
    return handleResponse(response);
  }
};

// Admin Selector Component
const AdminSelector = ({ admins, selectedAdmin, onAdminSelect }) => {
  const selectedAdminData = admins.find(admin => admin._id === selectedAdmin);

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
          <Crown className="text-yellow-500" size={20} />
          <span>Select Admin</span>
        </h2>
        <p className="text-gray-600 mt-1">Choose an admin to assign customers to</p>
      </div>
      
      <div className="p-6">
        <select
          value={selectedAdmin}
          onChange={(e) => onAdminSelect(e.target.value)}
          className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
        >
          <option value="">Choose an admin...</option>
          {admins.map(admin => (
            <option key={admin._id} value={admin._id}>
              {admin.name || admin.email?.split('@')[0] || admin.email} ({admin.email})
            </option>
          ))}
        </select>

        {selectedAdminData && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                <Crown className="text-white" size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {admins.find(a => a._id === selectedAdmin)?.name || 
                   admins.find(a => a._id === selectedAdmin)?.email?.split('@')[0] || 
                   admins.find(a => a._id === selectedAdmin)?.email}
                </h3>
                <div className="flex items-center space-x-1 text-gray-600">
                  <Mail size={14} />
                  <span className="text-sm">{admins.find(a => a._id === selectedAdmin).email}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Customer List Component
const CustomerList = ({ customers, selectedCustomers, onCustomerSelect }) => {
  if (customers.length === 0) {
    return (
      <div className="p-8 text-center">
        <User className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-500">No customers found</p>
      </div>
    );
  }

  return (
    <div className="max-h-96 overflow-y-auto">
      <div className="p-4 space-y-2">
        {customers.map(customer => (
          <div
            key={customer._id}
            className={`flex items-center p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
              selectedCustomers.includes(customer._id)
                ? 'bg-blue-50 border-blue-300 shadow-sm'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => onCustomerSelect(customer._id)}
          >
            <input
              type="checkbox"
              checked={selectedCustomers.includes(customer._id)}
              onChange={() => onCustomerSelect(customer._id)}
              className="mr-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="text-white" size={16} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{customer.name}</h3>
                <div className="flex items-center space-x-1 text-gray-500">
                  <Mail size={12} />
                  <span className="text-sm truncate">{customer.email}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Assignment View Component
const AssignmentView = ({ assignments, admins, customers, onRemoveAssignment, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [removeConfirm, setRemoveConfirm] = useState(null);

  const getAdminName = (adminId) => {
    const admin = admins.find(a => a._id === adminId);
    return admin ? admin.name : 'Unknown Admin';
  };

  const getAdminEmail = (adminId) => {
    const admin = admins.find(a => a._id === adminId);
    return admin ? admin.email : '';
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    return customer ? customer.name : 'Unknown Customer';
  };

  const getCustomerEmail = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    return customer ? customer.email : '';
  };

  const filteredAssignments = assignments.filter(assignment => {
    const adminName = getAdminName(assignment.adminId).toLowerCase();
    const customerNames = assignment.customerIds.map(id => getCustomerName(id).toLowerCase()).join(' ');
    const search = searchTerm.toLowerCase();
    return adminName.includes(search) || customerNames.includes(search);
  });

  const handleRemoveClick = (adminId, customerId) => {
    setRemoveConfirm({ adminId, customerId });
  };

  const confirmRemove = async () => {
    if (removeConfirm) {
      await onRemoveAssignment(removeConfirm.adminId, removeConfirm.customerId);
      setRemoveConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Remove Confirmation Modal */}
      {removeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="text-red-500" size={24} />
              <h3 className="text-lg font-semibold text-gray-900">Confirm Removal</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove this customer assignment? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={confirmRemove}
                disabled={loading}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Removing...' : 'Remove'}
              </button>
              <button
                onClick={() => setRemoveConfirm(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Stats */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Current Assignments</h2>
            <p className="text-gray-600">View and manage admin-customer relationships</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Users size={16} />
              <span>{assignments.length} admin{assignments.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Assignments List */}
      <div className="space-y-6">
        {filteredAssignments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <Users className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No assignments found</h3>
            <p className="text-gray-600">
              {assignments.length === 0 
                ? 'No customers have been assigned to admins yet.'
                : 'No assignments match your search criteria.'
              }
            </p>
          </div>
        ) : (
          filteredAssignments.map(assignment => (
            <div key={assignment.adminId} className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Crown className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{getAdminName(assignment.adminId)}</h3>
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Mail size={14} />
                      <span className="text-sm">{getAdminEmail(assignment.adminId)}</span>
                    </div>
                  </div>
                  <div className="ml-auto">
                    <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                      {assignment.customerIds.length} customer{assignment.customerIds.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h4 className="text-md font-medium text-gray-900 mb-4">Assigned Customers</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {assignment.customerIds.map(customerId => (
                    <div
                      key={customerId}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                          <User className="text-white" size={14} />
                        </div>
                        <div>
                          <h5 className="font-medium text-gray-900">{getCustomerName(customerId)}</h5>
                          <p className="text-sm text-gray-600">{getCustomerEmail(customerId)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveClick(assignment.adminId, customerId)}
                        disabled={loading}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Remove customer from admin"
                      >
                        <UserMinus size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
const SuperAdminDashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('assign');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchCustomers(),
        fetchAdmins()
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await apiService.getCustomers();
      setCustomers(data);
    } catch (error) {
      showNotification('Failed to fetch customers', 'error');
    }
  };

  const fetchAdmins = async () => {
    try {
      const data = await apiService.getAdmins();
      setAdmins(data);
    } catch (error) {
      showNotification('Failed to fetch admins', 'error');
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCustomerSelect = (customerId) => {
    const assignedAdmin = getAdminForCustomer(customerId);
    // If assigned to another admin and not the currently selected admin, ignore
    if (assignedAdmin && assignedAdmin._id !== selectedAdmin) {
      // optionally show notification
      showNotification(`Customer already assigned to ${assignedAdmin.name || assignedAdmin.email}`, 'error');
      return;
    }

    setSelectedCustomers(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  // Helper: find admin who currently has a customer
  const getAdminForCustomer = (customerId) => {
    const admin = admins.find(a => (a.assignedCustomers || []).includes(customerId));
    return admin || null;
  };

  const handleSelectAll = () => {
    const filteredCustomers = customers.filter(customer =>
      (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectable = filteredCustomers.filter(c => {
      const assignedAdmin = getAdminForCustomer(c._id);
      return !(assignedAdmin && assignedAdmin._id !== selectedAdmin);
    });

    if (selectedCustomers.length === selectable.length && selectable.length > 0) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(selectable.map(c => c._id));
    }
  };

  const handleAssignment = async () => {
    if (!selectedAdmin || selectedCustomers.length === 0) {
      showNotification('Please select an admin and at least one customer', 'error');
      return;
    }

    setLoading(true);
    
    try {
      const result = await apiService.assignCustomers(selectedAdmin, selectedCustomers);
      showNotification(`Successfully assigned ${result.assignedCount || selectedCustomers.length} customers`, 'success');

      // Refresh both customers and admins immediately so UI updates reflect removal from other admins
      await Promise.all([ fetchCustomers(), fetchAdmins() ]);

      // Clear selection after refresh
      setSelectedCustomers([]);
      setSelectedAdmin('');
    } catch (error) {
      showNotification(error.message || 'Assignment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getNotificationStyles = (type) => {
    const baseStyles = "fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 flex items-center space-x-2 max-w-md";
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 border border-green-200 text-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border border-red-200 text-red-800`;
      default:
        return `${baseStyles} bg-blue-50 border border-blue-200 text-blue-800`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={getNotificationStyles(notification.type)}>
          {notification.type === 'success' && <CheckCircle size={20} />}
          {notification.type === 'error' && <AlertCircle size={20} />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
              <p className="mt-1 text-gray-600">Manage customer assignments and admin relationships</p>
            </div>
            <button
              onClick={loadInitialData}
              disabled={refreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-purple-600 text-white p-6 rounded-xl shadow-lg">
            <Users className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Total Customers</h3>
            <p className="text-2xl font-bold">{customers.length}</p>
          </div>

          <div className="bg-orange-600 text-white p-6 rounded-xl shadow-lg">
            <BarChart3 className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Total Admins</h3>
            <p className="text-2xl font-bold">{admins.length}</p>
          </div>

          <button
            onClick={() => navigate('/superadmin/analytics')}
            className="bg-blue-600 text-white p-6 rounded-xl hover:bg-blue-700 transition-all duration-200 text-left shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <UserPlus className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Anaytics</h3>
            <p className="text-blue-100 text-sm">Track the progress</p>
          </button>

          <button
            onClick={() => navigate('/superadmin/view-assignments')}
            className="bg-green-600 text-white p-6 rounded-xl hover:bg-green-700 transition-all duration-200 text-left shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Users className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-2">View Assignments</h3>
            <p className="text-green-100 text-sm">See all customer assignments</p>
          </button>
        </div>

        {/* Quick Assignment Section */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Admin Selection - Using AdminSelector style */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <Crown className="text-yellow-500" size={20} />
                  <span>Select Admin</span>
                </h2>
                <p className="text-gray-600 mt-1">Choose an admin to assign customers to</p>
              </div>
              
              <div className="p-6">
                <select
                  value={selectedAdmin}
                  onChange={(e) => setSelectedAdmin(e.target.value)}
                  className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 transition-colors"
                >
                  <option value="">Choose an admin...</option>
                  {admins.map(admin => (
                    <option key={admin._id} value={admin._id}>
                      {admin.name || admin.email?.split('@')[0] || admin.email} ({admin.email})
                    </option>
                  ))}
                </select>

                {selectedAdmin && admins.find(a => a._id === selectedAdmin) && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                        <Crown className="text-white" size={16} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {admins.find(a => a._id === selectedAdmin)?.name || 
                           admins.find(a => a._id === selectedAdmin)?.email?.split('@')[0] || 
                           admins.find(a => a._id === selectedAdmin)?.email}
                        </h3>
                        <div className="flex items-center space-x-1 text-gray-600">
                          <Mail size={14} />
                          <span className="text-sm">{admins.find(a => a._id === selectedAdmin).email}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Selection */}
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Select Customers</h2>
                  <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {selectedCustomers.length} selected
                  </span>
                </div>
                
                {/* Search Bar */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <button
                  onClick={handleSelectAll}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                >
                  {selectedCustomers.length === filteredCustomers.filter(c => {
                      const assignedAdmin = getAdminForCustomer(c._id);
                      return !(assignedAdmin && assignedAdmin._id !== selectedAdmin);
                    }).length
                      ? 'Deselect All'
                      : 'Select All'}
                </button>
              </div>

              {/* Customer List */}
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 space-y-2">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => {
                      const assignedAdmin = getAdminForCustomer(customer._id);
                      const disabled = assignedAdmin && assignedAdmin._id !== selectedAdmin;
                      return (
                        <div
                          key={customer._id}
                          className={`flex items-center p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                            selectedCustomers.includes(customer._id)
                              ? 'bg-blue-50 border-blue-300 shadow-sm'
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                          onClick={() => handleCustomerSelect(customer._id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCustomers.includes(customer._id)}
                            onChange={() => handleCustomerSelect(customer._id)}
                            disabled={disabled}
                            className="mr-4 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                          />
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                              <User className="text-white" size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 truncate">{customer.name}</h3>
                              <div className="flex items-center space-x-1 text-gray-500">
                                <Mail size={12} />
                                <span className="text-sm truncate">{customer.email}</span>
                              </div>
                            </div>
                          </div>

                          {assignedAdmin ? (
                            <div className="ml-4 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs ${assignedAdmin._id === selectedAdmin ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {assignedAdmin._id === selectedAdmin ? 'Assigned to selected admin' : `Assigned to ${assignedAdmin.name || assignedAdmin.email?.split('@')[0] || assignedAdmin.email}`}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      )
                    })
                  ) : (
                    <div className="p-8 text-center">
                      <User className="mx-auto text-gray-400 mb-4" size={48} />
                      <p className="text-gray-500">No customers found</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Assignment Action */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Assignment Summary</h3>
                <p className="text-gray-600 mt-1">
                  {selectedAdmin && selectedCustomers.length > 0
                    ? `Ready to assign ${selectedCustomers.length} customer${selectedCustomers.length > 1 ? 's' : ''} to ${
                        admins.find(a => a._id === selectedAdmin)?.name || 
                        admins.find(a => a._id === selectedAdmin)?.email?.split('@')[0] ||
                        admins.find(a => a._id === selectedAdmin)?.email
                      }`
                    : 'Select an admin and customers to proceed'
                  }
                </p>
              </div>
              <button
                onClick={handleAssignment}
                disabled={loading || !selectedAdmin || selectedCustomers.length === 0}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Assigning...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Assign Customers</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;