import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Eye, Search, AlertCircle, Users, Mail, Phone, ArrowLeft } from 'lucide-react';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Memoized customer card component for performance
const CustomerCard = memo(({ customer, onView, formatDate }) => (
  <div 
    onClick={() => onView(customer._id)}
    className="bg-white rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md active:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.99]"
  >
    <div className="p-3 sm:p-4">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm sm:text-base">
            {(customer.name || 'U').charAt(0).toUpperCase()}
          </span>
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
            {customer.name || 'Unnamed Customer'}
          </h4>
          <div className="flex items-center text-xs sm:text-sm text-gray-500 truncate">
            <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{customer.email}</span>
          </div>
        </div>
        
        {/* Right side - mobile compact */}
        <div className="flex flex-col items-end gap-1">
          <Eye className="h-4 w-4 text-gray-400" />
          {customer.mobile && (
            <div className="hidden sm:flex items-center text-xs text-gray-400">
              <Phone className="h-3 w-3 mr-1" />
              <span>{customer.mobile}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom row - compact */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium bg-green-50 text-green-700">
          ASSIGNED
        </span>
        <span className="text-[10px] sm:text-xs text-gray-400">
          {formatDate(customer.createdAt)}
        </span>
      </div>
    </div>
  </div>
));

CustomerCard.displayName = 'CustomerCard';

function CustomersList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      fetchAssignedCustomers();
    }
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

  const handleViewCustomer = useCallback((id) => {
    navigate(`/admin/customer-details/${id}`);
  }, [navigate]);

  // Memoize filtered customers for performance
  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return customers;
    return customers.filter(customer => 
      customer.name?.toLowerCase().includes(term) ||
      customer.email?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  // Memoize formatDate to prevent re-creation
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        day: 'numeric', 
        month: 'short'
      });
    } catch (error) {
      return 'N/A';
    }
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Assigned Customers">
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Assigned Customers">
      <div className="space-y-3 sm:space-y-4">
        {/* Header + Search Combined for Mobile */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          {/* Header Row */}
          <div className="flex items-center mb-3">
            <button
              onClick={() => navigate('/admin')}
              className="mr-2 p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                Assigned Customers
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                Customers assigned by Super Admin
              </p>
            </div>
            <span className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
              {filteredCustomers.length}
            </span>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 w-full bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`border px-3 py-2 rounded-lg flex items-center text-sm ${
            error.includes('unavailable') 
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Customers List - Compact Grid */}
        {filteredCustomers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer._id}
                customer={customer}
                onView={handleViewCustomer}
                formatDate={formatDate}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white/80 rounded-xl p-6 text-center border border-gray-200/50">
            <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {searchTerm ? 'No matches found' : 'No customers assigned'}
            </h3>
            <p className="text-xs text-gray-500">
              {searchTerm 
                ? 'Try a different search term' 
                : 'Contact Super Admin for assignments'
              }
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default memo(CustomersList);