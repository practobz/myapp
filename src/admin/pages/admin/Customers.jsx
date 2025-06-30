import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Eye, AlertCircle, ArrowLeft } from 'lucide-react';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleViewCustomer = (id) => {
    navigate(`/admin/customers/${id}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString(undefined, { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const getDaysUntilDue = (dateString) => {
    if (!dateString) return null;
    const dueDate = new Date(dateString);
    const today = new Date();
    const diffTime = dueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getDueDateStatus = (dateString) => {
    const days = getDaysUntilDue(dateString);
    if (days === null) return { color: 'gray', text: 'No date' };
    if (days < 0) return { color: 'red', text: 'Overdue' };
    if (days === 0) return { color: 'orange', text: 'Due today' };
    if (days <= 3) return { color: 'yellow', text: `${days} days left` };
    return { color: 'green', text: `${days} days left` };
  };

  useEffect(() => {
    const fetchCustomersAndCalendars = async () => {
      try {
        const customersRes = await fetch(`${process.env.REACT_APP_API_URL}/api/customers`);
        const calendarsRes = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);

        const customersData = await customersRes.json();
        const calendarsData = await calendarsRes.json();

        // ✅ Group calendars by customerId
        const calendarMap = new Map();
        for (const calendar of calendarsData) {
          const { customerId } = calendar;
          if (!calendarMap.has(customerId)) calendarMap.set(customerId, []);
          calendarMap.get(customerId).push(calendar);
        }

        // ✅ Map customers with calendar data, but only include those with at least one calendar
        const enrichedCustomers = customersData.customers
          .filter((customer) => {
            const id = customer.id || customer._id;
            return calendarMap.has(id) && calendarMap.get(id).length > 0;
          })
          .map((customer) => {
            const id = customer.id || customer._id;
            const customerCalendars = calendarMap.get(id) || [];
            
            // Get all content items from all calendars
            const allContentItems = customerCalendars.flatMap(cal => cal.contentItems || []);
            const itemsWithDates = allContentItems.filter(item => item.date);
            
            // Sort to get next content item
            itemsWithDates.sort((a, b) => new Date(a.date) - new Date(b.date));
            const nextItem = itemsWithDates[0];

            return {
              ...customer,
              nextDueDate: nextItem?.date || null,
              nextDueContent: nextItem?.description || '—',
              totalCalendars: customerCalendars.length,
              totalItems: allContentItems.length,
            };
          });

        setCustomers(enrichedCustomers);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching data:', err);
        setLoading(false);
      }
    };

    fetchCustomersAndCalendars();
  }, []);

  const getStatusBadgeColor = (status) => {
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
  };

  return (
    <AdminLayout title="Customers">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="space-y-8">
          {/* Header Section with Navigation */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/admin')}
                  className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Customers
                  </h1>
                  <p className="text-gray-600 mt-2">Manage customer content calendars and schedules</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/50">
              <h2 className="text-xl font-bold text-gray-900">Customer Overview</h2>
              <p className="text-sm text-gray-600 mt-1">Track content schedules and deadlines</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/50">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Customer Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Next Content Due Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Number of Content Calendars
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      View Details
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200/30">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                          <p className="text-gray-500 font-medium">Loading customers...</p>
                        </div>
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                            <AlertCircle className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
                          <p className="text-gray-500">No customers with content calendars found.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => {
                      const status = getDueDateStatus(customer.nextDueDate);
                      return (
                        <tr key={customer.id || customer._id} className="hover:bg-white/70 transition-all duration-200 group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                                  <span className="text-white font-semibold text-sm">
                                    {customer.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-semibold text-gray-900">{customer.name}</div>
                                <div className="text-sm text-gray-500">{customer.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{formatDate(customer.nextDueDate)}</div>
                            <div className="text-xs text-gray-500">
                              {getDaysUntilDue(customer.nextDueDate) !== null && (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadgeColor(status)}`}>
                                  {status.text}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 font-medium">{customer.totalCalendars || 0}</div>
                            <div className="text-xs text-gray-500">{customer.totalItems || 0} total items</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <button
                              onClick={() => handleViewCustomer(customer.id || customer._id)}
                              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md group-hover:shadow-lg"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Customers;