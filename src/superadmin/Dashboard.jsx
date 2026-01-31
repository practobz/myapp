import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Settings, UserPlus, BarChart3, RefreshCw, CheckCircle, AlertCircle, X, Crown, Mail, User, AlertTriangle, Search, UserMinus, Shield, UserCheck, ArrowRight, Filter } from 'lucide-react';

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
    // Allow selection - multi-admin support means customers can be assigned to multiple admins
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  // Helper: find admin who currently has a customer
  const getAdminsForCustomer = (customerId) => {
    return admins.filter(a => (a.assignedCustomers || []).includes(customerId));
  };

  const handleSelectAll = () => {
    const filteredCustomers = customers.filter(customer =>
      (customer.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c._id));
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
      
      // Count how many customers were newly assigned vs already assigned
      const alreadyAssignedCount = selectedCustomers.filter(cId => {
        const customer = customers.find(c => c._id === cId);
        const admins = getAdminsForCustomer(cId);
        return admins.some(a => a._id === selectedAdmin);
      }).length;
      
      const newlyAssignedCount = selectedCustomers.length - alreadyAssignedCount;
      
      let message = '';
      if (newlyAssignedCount > 0 && alreadyAssignedCount > 0) {
        message = `Successfully assigned ${newlyAssignedCount} new customer${newlyAssignedCount !== 1 ? 's' : ''}. ${alreadyAssignedCount} already assigned.`;
      } else if (alreadyAssignedCount === selectedCustomers.length) {
        message = `All ${alreadyAssignedCount} customer${alreadyAssignedCount !== 1 ? 's are' : ' is'} already assigned to this admin.`;
      } else {
        message = `Successfully assigned ${newlyAssignedCount} customer${newlyAssignedCount !== 1 ? 's' : ''} to admin`;
      }
      
      showNotification(message, 'success');

      // Refresh data to reflect the multi-admin assignments
      await Promise.all([ fetchCustomers(), fetchAdmins() ]);

      // Clear customer selection but keep admin selected for multiple assignments
      setSelectedCustomers([]);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Notification */}
      {notification && (
        <div className={getNotificationStyles(notification.type)}>
          {notification.type === 'success' && <CheckCircle size={20} />}
          {notification.type === 'error' && <AlertCircle size={20} />}
          <span className="font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-70 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-8">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <Crown className="text-white" size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Super Admin Dashboard</h1>
                <p className="mt-1 text-indigo-100">Manage customer assignments across multiple admins</p>
              </div>
            </div>
            <button
              onClick={loadInitialData}
              disabled={refreshing}
              className="flex items-center space-x-2 px-5 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 disabled:opacity-50 transition-all shadow-lg hover:shadow-xl border border-white/30"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              <span className="font-medium">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Users className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <p className="text-purple-100 text-sm font-medium">Total Customers</p>
                  <p className="text-4xl font-bold text-white mt-1">{customers.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-br from-orange-500 to-pink-600 p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Crown className="text-white" size={24} />
                </div>
                <div className="text-right">
                  <p className="text-orange-100 text-sm font-medium">Total Admins</p>
                  <p className="text-4xl font-bold text-white mt-1">{admins.length}</p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/superadmin/analytics')}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 overflow-hidden group hover:scale-105 transform duration-200"
          >
            <div className="bg-gradient-to-br from-blue-500 to-cyan-600 p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BarChart3 className="text-white" size={24} />
                </div>
                <ArrowRight className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
              </div>
              <div className="mt-4">
                <p className="text-white font-bold text-lg">Analytics</p>
                <p className="text-blue-100 text-sm mt-1">Track performance metrics</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => navigate('/superadmin/view-assignments')}
            className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-gray-100 overflow-hidden group hover:scale-105 transform duration-200"
          >
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <UserCheck className="text-white" size={24} />
                </div>
                <ArrowRight className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={20} />
              </div>
              <div className="mt-4">
                <p className="text-white font-bold text-lg">View Assignments</p>
                <p className="text-green-100 text-sm mt-1">See all relationships</p>
              </div>
            </div>
          </button>
        </div>

        {/* Modern Assignment Section */}
        <div className="space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Enhanced Admin Selection */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Crown className="text-white" size={16} />
                  </div>
                  <span>Select Admin</span>
                </h2>
                <p className="text-gray-600 mt-2 ml-10">Choose an admin to assign customers to</p>
              </div>
              
              <div className="p-6">
                <select
                  value={selectedAdmin}
                  onChange={(e) => setSelectedAdmin(e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-900 transition-all font-medium hover:border-gray-300"
                >
                  <option value="">Choose an admin...</option>
                  {admins.map(admin => (
                    <option key={admin._id} value={admin._id}>
                      {admin.name || admin.email?.split('@')[0] || admin.email} • {admin.email}
                    </option>
                  ))}
                </select>

                {selectedAdmin && admins.find(a => a._id === selectedAdmin) && (
                  <div className="mt-4 p-5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <Crown className="text-white" size={20} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {admins.find(a => a._id === selectedAdmin)?.name || 
                           admins.find(a => a._id === selectedAdmin)?.email?.split('@')[0] || 
                           admins.find(a => a._id === selectedAdmin)?.email}
                        </h3>
                        <div className="flex items-center space-x-2 text-gray-600 mt-1">
                          <Mail size={14} />
                          <span className="text-sm">{admins.find(a => a._id === selectedAdmin).email}</span>
                        </div>
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-xs font-medium text-purple-700 border border-purple-200">
                          <Users size={12} />
                          <span>{(admins.find(a => a._id === selectedAdmin).assignedCustomers || []).length} customers assigned</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Enhanced Customer Selection */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100">
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                      <Users className="text-white" size={16} />
                    </div>
                    <span>Select Customers</span>
                  </h2>
                  <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full font-bold text-sm shadow-md">
                    <UserCheck size={16} />
                    <span>{selectedCustomers.length} selected</span>
                  </div>
                </div>
                
                {/* Enhanced Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search customers by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                  />
                </div>

                <button
                  onClick={handleSelectAll}
                  className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-semibold transition-colors flex items-center gap-2 hover:gap-3"
                >
                  <Filter size={14} />
                  {selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>

              {/* Customer List */}
              <div className="max-h-96 overflow-y-auto">
                <div className="p-4 space-y-3">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => {
                      const assignedAdmins = getAdminsForCustomer(customer._id);
                      const isAlreadyAssignedToSelected = assignedAdmins.some(a => a._id === selectedAdmin);
                      
                      return (
                        <div
                          key={customer._id}
                          className={`relative rounded-xl border transition-all ${
                            selectedCustomers.includes(customer._id)
                              ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div 
                            className="flex items-start p-4 cursor-pointer"
                            onClick={() => handleCustomerSelect(customer._id)}
                          >
                            <input
                              type="checkbox"
                              checked={selectedCustomers.includes(customer._id)}
                              onChange={() => handleCustomerSelect(customer._id)}
                              className="mt-1 mr-4 h-5 w-5 text-blue-600 focus:ring-2 focus:ring-blue-500 border-gray-300 rounded transition-all"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3 flex-1">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                                    <User className="text-white" size={18} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 text-base truncate">{customer.name}</h3>
                                    <div className="flex items-center space-x-1 text-gray-600 mt-0.5">
                                      <Mail size={14} />
                                      <span className="text-sm truncate">{customer.email}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Assigned Admins Display */}
                              {assignedAdmins.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Shield size={14} className="text-purple-600" />
                                    <span className="text-xs font-medium text-gray-700">Assigned to:</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {assignedAdmins.map(admin => (
                                      <div
                                        key={admin._id}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                                          admin._id === selectedAdmin
                                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border border-green-300'
                                            : 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 border border-purple-300'
                                        }`}
                                      >
                                        <Crown size={12} />
                                        <span>{admin.name || admin.email?.split('@')[0] || admin.email}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Status Badge */}
                              {isAlreadyAssignedToSelected && selectedAdmin && (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-medium border border-green-200">
                                    <UserCheck size={12} />
                                    <span>Already assigned to selected admin</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
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

          {/* Enhanced Assignment Action */}
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="text-white">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <UserPlus size={24} />
                    Assignment Summary
                  </h3>
                  <p className="mt-2 text-emerald-50">
                    {selectedAdmin && selectedCustomers.length > 0
                      ? `Ready to assign ${selectedCustomers.length} customer${selectedCustomers.length > 1 ? 's' : ''} to ${
                          admins.find(a => a._id === selectedAdmin)?.name || 
                          admins.find(a => a._id === selectedAdmin)?.email?.split('@')[0] ||
                          admins.find(a => a._id === selectedAdmin)?.email
                        }`
                      : 'Select an admin and customers to proceed with assignment'
                    }
                  </p>
                </div>
                <button
                  onClick={handleAssignment}
                  disabled={loading || !selectedAdmin || selectedCustomers.length === 0}
                  className="flex items-center justify-center space-x-3 px-8 py-4 bg-white text-emerald-600 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold shadow-lg hover:shadow-xl disabled:hover:bg-white transform hover:scale-105 disabled:hover:scale-100 border-2 border-white/50"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={20} className="animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={20} />
                      <span>Assign Now</span>
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </div>
            
            {/* Info Banner */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-t border-gray-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="text-blue-600" size={20} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Multi-Admin Support</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Customers can now be assigned to multiple admins simultaneously. Assignments are additive and won't remove existing admin relationships.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuperAdminDashboard;