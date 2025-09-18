import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, Search, AlertCircle, User, Users, Plus, Mail, Phone, Calendar, TrendingUp, ArrowLeft } from 'lucide-react';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function CustomersList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAssignedCustomers();
  }, [currentUser]);

  const fetchAssignedCustomers = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Admin authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Fetch only customers assigned to current admin
      const response = await fetch(`${API_URL}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          // Admin not found or no assignments
          setCustomers([]);
          return;
        }
        throw new Error(`Failed to fetch assigned customers: ${response.status}`);
      }
      
      const data = await response.json();
      setCustomers(data || []);
    } catch (err) {
      console.error('Error fetching assigned customers:', err);
      setError('Failed to load your assigned customers. Please contact the Super Admin if you need customers assigned.');
      
      // Fallback: try to fetch all customers if assignment system is not working
      try {
        console.log('Attempting fallback to all customers...');
        const fallbackResponse = await fetch(`${API_URL}/customers`);
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setCustomers(fallbackData || []);
          setError('Showing all customers (assignment system unavailable)');
        }
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewCustomer = (id) => {
    navigate(`/admin/customer-details/${id}`);
  };

  const filteredCustomers = customers.filter(customer => 
    customer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        day: 'numeric', 
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Your Assigned Customers">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500 font-medium">Loading your assigned customers...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Your Assigned Customers">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="space-y-6 sm:space-y-8">
          {/* Header Section with Navigation */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200/50">
            <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/admin')}
                  className="mr-3 sm:mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Your Assigned Customers
                  </h1>
                  <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
                    Customers assigned to you by the Super Admin
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200/50">
            <div className="flex items-center">
              <div className="relative flex-1">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search your assigned customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className={`backdrop-blur-sm border px-4 sm:px-6 py-4 rounded-2xl flex items-start shadow-lg ${
              error.includes('unavailable') 
                ? 'bg-yellow-50/80 border-yellow-200 text-yellow-700'
                : 'bg-red-50/80 border-red-200 text-red-700'
            }`}>
              <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
              <span className="font-medium text-sm sm:text-base">{error}</span>
            </div>
          )}

          {/* Customers List */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200/50">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Your Assigned Customers ({filteredCustomers.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {customers.length === 0 
                  ? 'No customers have been assigned to you yet'
                  : 'Manage customers assigned to you by the Super Admin'
                }
              </p>
            </div>
            
            <div className="p-4 sm:p-6">
              {filteredCustomers.length > 0 ? (
                <div className="space-y-4">
                  {filteredCustomers.map((customer) => (
                    <div 
                      key={customer._id}
                      className="bg-white rounded-xl border border-gray-200/50 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
                    >
                      <div className="p-4 sm:p-6">
                        <div className="flex items-start justify-between">
                          {/* Customer Info */}
                          <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-sm sm:text-lg">
                                  {(customer.name || 'U').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              {/* Name and Action Button Row */}
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-base sm:text-lg font-semibold text-gray-900 truncate pr-2">
                                  {customer.name || 'Unnamed Customer'}
                                </h4>
                                <button
                                  onClick={() => handleViewCustomer(customer._id)}
                                  className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  <span className="hidden xs:inline">View</span>
                                  <span className="xs:hidden">View Details</span>
                                </button>
                              </div>
                              
                              {/* Contact Info */}
                              <div className="space-y-1">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Mail className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0" />
                                  <span className="truncate">{customer.email}</span>
                                </div>
                                {customer.mobile && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Phone className="h-3 w-3 mr-2 text-gray-400 flex-shrink-0" />
                                    <span>{customer.mobile}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Meta Info */}
                              <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-3 space-y-2 sm:space-y-0">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 w-fit">
                                  ASSIGNED TO YOU
                                </span>
                                <span className="text-xs text-gray-500">
                                  Joined {formatDate(customer.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {searchTerm ? 'No matching customers found' : 'No customers assigned'}
                  </h3>
                  <p className="text-gray-500 mb-6 text-sm sm:text-base">
                    {searchTerm 
                      ? 'No customers match your search criteria.' 
                      : 'You don\'t have any customers assigned to you yet. Please contact the Super Admin to get customers assigned.'
                    }
                  </p>
                  {!searchTerm && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-4">
                        Need customers assigned? Contact your Super Admin.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default CustomersList;