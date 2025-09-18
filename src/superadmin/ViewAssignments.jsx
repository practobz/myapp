import React, { useState, useEffect } from 'react';
import { Users, Crown, Mail, User, Search, ArrowLeft, RefreshCw, UserMinus, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ViewAssignments = () => {
  const [customers, setCustomers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchCustomers(),
        fetchAdmins()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/customers`);
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchAdmins = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/users?role=admin`);
      const data = await response.json();
      setAdmins(data);
      
      // Process assignments from admin data
      const assignmentData = data
        .filter(admin => admin.assignedCustomers && admin.assignedCustomers.length > 0)
        .map(admin => ({
          adminId: admin._id,
          customerIds: admin.assignedCustomers
        }));
      setAssignments(assignmentData);
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRemoveAssignment = async (adminId, customerId) => {
    try {
      setRemoving(true);
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      
      const response = await fetch(`${apiUrl}/superadmin/remove-assignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('superadminToken')}`
        },
        body: JSON.stringify({
          adminId,
          customerId
        })
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        data = { error: 'Invalid response from server' };
      }

      if (response.ok) {
        showNotification('Customer assignment removed successfully', 'success');
        // Refresh the assignments data
        await fetchAdmins();
      } else {
        showNotification(data.error || 'Failed to remove assignment', 'error');
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      showNotification('Network error: ' + error.message, 'error');
    } finally {
      setRemoving(false);
    }
  };

  const handleRemoveClick = (adminId, customerId) => {
    const admin = admins.find(a => a._id === adminId);
    const customer = customers.find(c => c._id === customerId);
    setRemoveConfirm({ 
      adminId, 
      customerId,
      adminName: admin?.name || 'Unknown Admin',
      customerName: customer?.name || 'Unknown Customer'
    });
  };

  const confirmRemove = async () => {
    if (removeConfirm) {
      await handleRemoveAssignment(removeConfirm.adminId, removeConfirm.customerId);
      setRemoveConfirm(null);
    }
  };

  const getAdminName = (adminId) => {
    const admin = admins.find(a => a._id === adminId);
    if (!admin) return 'Unknown Admin';
    // If no name field exists, use the email part before @
    if (!admin.name) {
      return admin.email ? admin.email.split('@')[0] : 'Unknown Admin';
    }
    return admin.name;
  };

  const getAdminEmail = (adminId) => {
    const admin = admins.find(a => a._id === adminId);
    return admin ? (admin.email || '') : '';
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    return customer ? (customer.name || 'Unknown Customer') : 'Unknown Customer';
  };

  const getCustomerEmail = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    return customer ? (customer.email || '') : '';
  };

  const filteredAssignments = assignments.filter(assignment => {
    const adminName = (getAdminName(assignment.adminId) || '').toLowerCase();
    const customerNames = assignment.customerIds.map(id => (getCustomerName(id) || '').toLowerCase()).join(' ');
    const search = (searchTerm || '').toLowerCase();
    return adminName.includes(search) || customerNames.includes(search);
  });

  const totalAssignedCustomers = assignments.reduce((total, assignment) => total + assignment.customerIds.length, 0);
  const unassignedCustomers = customers.filter(customer => 
    !assignments.some(assignment => assignment.customerIds.includes(customer._id))
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500 font-medium">Loading assignments...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={getNotificationStyles(notification.type)}>
          {notification.type === 'success' && <CheckCircle size={20} />}
          {notification.type === 'error' && <AlertTriangle size={20} />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="ml-2 hover:opacity-70"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Remove Confirmation Modal */}
      {removeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Confirm Removal</h3>
                <p className="text-gray-600 text-sm">This action cannot be undone</p>
              </div>
            </div>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Customer:</strong> {removeConfirm.customerName}
              </p>
              <p className="text-sm text-gray-700">
                <strong>Admin:</strong> {removeConfirm.adminName}
              </p>
            </div>
            
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove this customer assignment? The customer will no longer be managed by this admin.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={confirmRemove}
                disabled={removing}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
              >
                {removing ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Removing...
                  </div>
                ) : (
                  'Remove Assignment'
                )}
              </button>
              <button
                onClick={() => setRemoveConfirm(null)}
                disabled={removing}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/superadmin/dashboard')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">View Assignments</h1>
                <p className="mt-1 text-gray-600">Overview of all customer-admin assignments</p>
              </div>
            </div>
            <button
              onClick={loadData}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg">
            <Users className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Total Customers</h3>
            <p className="text-2xl font-bold">{customers.length}</p>
          </div>

          <div className="bg-purple-600 text-white p-6 rounded-xl shadow-lg">
            <Crown className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Total Admins</h3>
            <p className="text-2xl font-bold">{admins.length}</p>
          </div>

          <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg">
            <User className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Assigned Customers</h3>
            <p className="text-2xl font-bold">{totalAssignedCustomers}</p>
          </div>

          <div className="bg-orange-600 text-white p-6 rounded-xl shadow-lg">
            <Users className="w-8 h-8 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unassigned</h3>
            <p className="text-2xl font-bold">{unassignedCustomers.length}</p>
          </div>
        </div>

        {/* Search Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Assignment Overview</h2>
              <p className="text-gray-600">Search and view all customer-admin relationships</p>
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
              <button
                onClick={() => navigate('/superadmin/assignments')}
                className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Assignment
              </button>
            </div>
          ) : (
            filteredAssignments.map(assignment => (
              <div key={assignment.adminId} className="bg-white rounded-xl shadow-sm border">
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
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
                    </div>
                    <div className="text-right">
                      <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full">
                        {assignment.customerIds.length} customer{assignment.customerIds.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Assigned Customers</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {assignment.customerIds.map(customerId => (
                      <div
                        key={customerId}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 group hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-full flex items-center justify-center">
                            <User className="text-white" size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-medium text-gray-900 truncate">{getCustomerName(customerId)}</h5>
                            <p className="text-sm text-gray-600 truncate">{getCustomerEmail(customerId)}</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveClick(assignment.adminId, customerId)}
                          disabled={removing}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100 ml-2"
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

        {/* Unassigned Customers Section */}
        {unassignedCustomers.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Unassigned Customers</h3>
                  <p className="text-gray-600">These customers are not assigned to any admin</p>
                </div>
                <span className="bg-orange-100 text-orange-800 text-sm font-medium px-3 py-1 rounded-full">
                  {unassignedCustomers.length} unassigned
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unassignedCustomers.map(customer => (
                  <div
                    key={customer._id}
                    className="flex items-center space-x-3 p-4 bg-orange-50 rounded-lg border border-orange-200"
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                      <User className="text-white" size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-gray-900 truncate">{customer.name}</h5>
                      <p className="text-sm text-gray-600 truncate">{customer.email}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <button
                  onClick={() => navigate('/superadmin/dashboard')}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Assign These Customers
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewAssignments;
