import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Eye, Plus, Calendar, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

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
      month: 'long',
    });
  };

  useEffect(() => {
    const fetchCustomersAndCalendars = async () => {
      try {
        console.log("✅ API_URL from env:", API_URL);

        const customersRes = await fetch(`${API_URL}/api/customers`);
        const calendarsRes = await fetch(`${API_URL}/calendars`);

        const customersData = await customersRes.json();
        const calendarsData = await calendarsRes.json();

        if (!Array.isArray(customersData.customers) || !Array.isArray(calendarsData)) {
          console.error('Invalid data from backend');
          return;
        }

        const calendarMap = new Map();
        for (const calendar of calendarsData) {
          const { customerId, contentItems = [] } = calendar;
          if (!calendarMap.has(customerId)) calendarMap.set(customerId, []);
          calendarMap.get(customerId).push(...contentItems);
        }

        const filteredCustomers = customersData.customers
          .map((customer) => {
            const id = customer.id || customer._id;
            const items = (calendarMap.get(id) || []).filter(item => item.date);
            if (items.length === 0) return null;

            items.sort((a, b) => new Date(a.date) - new Date(b.date));
            const nextItem = items[0];

            return {
              ...customer,
              nextDueDate: nextItem?.date || null,
              nextDueContent: nextItem?.description || '—',
            };
          })
          .filter(Boolean);

        setCustomers(filteredCustomers);
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomersAndCalendars();
  }, []);

  return (
    <AdminLayout title="Customers">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 space-y-2 sm:space-y-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Content Management</h2>
          <div className="flex space-x-2 sm:space-x-4">
            <button className="btn-secondary flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              View Calendar
            </button>
            <button className="btn-primary flex items-center text-base font-bold">
              <Plus className="h-4 w-4 mr-2" />
              <span className="bg-gradient-to-r from-white via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
                Add Customer
              </span>
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white shadow-md">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Next Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Content Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center">
                      <div className="flex flex-col items-center">
                        <AlertCircle className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-500">
                          No customers with content calendars found.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.id || customer._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{customer.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{formatDate(customer.nextDueDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-gray-900">{customer.nextDueContent}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => handleViewCustomer(customer.id || customer._id)}
                          className="inline-flex items-center text-primary-600 hover:text-primary-800 transition-colors"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Customers;
