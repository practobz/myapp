import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Eye, AlertCircle, Calendar, Clock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

// Memoized customer card component for performance
const CustomerCard = memo(({ customer, calendars, publishedDates, onView, formatDate, getDueDateStatus, getStatusBadgeColor }) => {
  const totalCalendars = calendars.length;
  const totalItems = calendars.reduce(
    (acc, cal) => acc + (Array.isArray(cal.contentItems) ? cal.contentItems.length : 0),
    0
  );
  
  const allDueDates = calendars
    .flatMap(cal => Array.isArray(cal.contentItems) ? cal.contentItems.map(item => item.date).filter(Boolean) : [])
    .filter(date => {
      const isoDate = new Date(date).toISOString().slice(0, 10);
      return !publishedDates.has(isoDate) && !isNaN(new Date(date));
    });
  
  const nextDueDate = allDueDates.length > 0
    ? allDueDates.sort((a, b) => new Date(a) - new Date(b))[0]
    : null;
  const status = getDueDateStatus(nextDueDate);

  return (
    <div 
      onClick={() => onView(customer.id || customer._id)}
      className="bg-white rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md active:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.99]"
    >
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm sm:text-base">
              {customer.name.charAt(0).toUpperCase()}
            </span>
          </div>
          
          {/* Info */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
              {customer.name}
            </h4>
            <p className="text-xs sm:text-sm text-gray-500 truncate">{customer.email}</p>
          </div>
          
          {/* Right side */}
          <div className="flex-shrink-0">
            <Eye className="h-4 w-4 text-gray-400" />
          </div>
        </div>
        
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs text-gray-600 truncate">
              {totalCalendars} calendar{totalCalendars !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-[10px] sm:text-xs text-gray-600 truncate">
              {totalItems} item{totalItems !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {/* Due date status */}
        {nextDueDate && (
          <div className="mt-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs text-gray-500">Next due:</span>
              <span className="text-[10px] sm:text-xs font-medium text-gray-900">{formatDate(nextDueDate)}</span>
            </div>
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border mt-1 ${getStatusBadgeColor(status)}`}>
              {status.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

CustomerCard.displayName = 'CustomerCard';

function Customers() {
  const { currentUser } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [calendarsByCustomer, setCalendarsByCustomer] = useState({});
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleViewCustomer = useCallback((id) => {
    navigate(`/admin/customers/${id}`);
  }, [navigate]);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString(undefined, { 
      day: 'numeric', 
      month: 'short'
    });
  }, []);

  const getDaysUntilDue = useCallback((dateString) => {
    if (!dateString) return null;
    const dueDate = new Date(dateString);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, []);

  const getDueDateStatus = useCallback((dateString) => {
    const dueDate = new Date(dateString);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (!dateString || isNaN(diffDays)) return { color: 'gray', text: 'No date' };
    if (diffDays < 0) return { color: 'red', text: 'Overdue' };
    if (diffDays === 0) return { color: 'orange', text: 'Due today' };
    if (diffDays <= 3) return { color: 'yellow', text: `${diffDays} day${diffDays !== 1 ? 's' : ''}` };
    return { color: 'green', text: `${diffDays} day${diffDays !== 1 ? 's' : ''}` };
  }, []);

  const getStatusBadgeColor = useCallback((status) => {
    switch (status.color) {
      case 'red':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'orange':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'yellow':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'green':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  }, []);

  // Fetch only assigned customers for current admin
  const fetchAssignedCustomers = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setLoading(false);
      return;
    }

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch assigned customers`);
      }
      
      const data = await response.json();
      setCustomers(data);
    } catch (err) {
      console.error('Error fetching assigned customers:', err);
      setError('Failed to fetch your assigned customers');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all calendars and group by customerId
  const fetchCalendars = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/calendars`);
      if (!response.ok) return {};
      const allCalendars = await response.json();
      // Group calendars by customerId
      const grouped = {};
      allCalendars.forEach(cal => {
        if (!grouped[cal.customerId]) grouped[cal.customerId] = [];
        grouped[cal.customerId].push(cal);
      });
      setCalendarsByCustomer(grouped);
    } catch {
      setCalendarsByCustomer({});
    }
  };

  // Fetch published scheduled posts for assigned customers
  const fetchPublishedPosts = async (customerIds) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/scheduled-posts`);
      if (!response.ok) return [];
      const allPosts = await response.json();
      // Only published posts for assigned customers
      return allPosts.filter(
        post =>
          post.status === 'published' &&
          customerIds.includes(post.customerId || post.userId)
      );
    } catch {
      return [];
    }
  };

  useEffect(() => {
    fetchAssignedCustomers();
    fetchCalendars();
  }, [currentUser]);

  useEffect(() => {
    // After customers are loaded, fetch published posts
    if (customers.length > 0) {
      const customerIds = customers.map(c => c._id || c.id);
      fetchPublishedPosts(customerIds).then(setScheduledPosts);
    }
  }, [customers]);

  // Memoize published dates by customerId for fast lookup
  const publishedDatesByCustomer = useMemo(() => {
    const map = {};
    scheduledPosts.forEach(post => {
      if (post.status === 'published') {
        const cid = post.customerId || post.userId;
        if (!map[cid]) map[cid] = new Set();
        // Match only the date part (YYYY-MM-DD)
        const postDate = new Date(post.scheduledAt).toISOString().slice(0, 10);
        map[cid].add(postDate);
      }
    });
    return map;
  }, [scheduledPosts]);

  if (loading) {
    return (
      <AdminLayout title="Customers">
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
    <AdminLayout title="Customers">
      <div className="space-y-3 sm:space-y-4">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                Customer Overview
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                Track content schedules and deadlines
              </p>
            </div>
            <span className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
              {customers.length}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="border px-3 py-2 rounded-lg flex items-center text-sm bg-red-50 border-red-200 text-red-700">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Customers Grid */}
        {customers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {customers.map((customer) => {
              const calendars = calendarsByCustomer[customer._id || customer.id] || [];
              const publishedDates = publishedDatesByCustomer[customer._id || customer.id] || new Set();
              
              return (
                <CustomerCard
                  key={customer.id || customer._id}
                  customer={customer}
                  calendars={calendars}
                  publishedDates={publishedDates}
                  onView={handleViewCustomer}
                  formatDate={formatDate}
                  getDueDateStatus={getDueDateStatus}
                  getStatusBadgeColor={getStatusBadgeColor}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-white/80 rounded-xl p-6 text-center border border-gray-200/50">
            <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              No customers found
            </h3>
            <p className="text-xs text-gray-500">
              No customers with content calendars found.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default memo(Customers);