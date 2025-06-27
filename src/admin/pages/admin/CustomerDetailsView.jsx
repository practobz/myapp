import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AdminLayout from '../../components/layout/AdminLayout';
import ContentItemModal from '../../components/modals/ContentItemModal';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Plus,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || '';

function CustomerDetailsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    console.log('📦 useParams ID:', id); // ✅ log
    fetchCustomer();
    fetchCalendarItems();
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/customer/${id}`);
      if (!response.ok) throw new Error('Failed to fetch customer');
      const data = await response.json();
      setCustomer(data);
    } catch (err) {
      setError('Failed to load customer details');
      console.error('Error fetching customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarItems = async () => {
    try {
      const response = await fetch(`${API_URL}/calendars/${id}`);
      if (response.status === 404) {
        console.log('No calendar found for this customer yet.');
        setContentItems([]);
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch calendar');
      const calendar = await response.json();
      setContentItems(calendar[0]?.contentItems || []);
    } catch (err) {
      console.error('Error fetching calendar items:', err);
    }
  };

const handleAddItem = async (item) => {
  if (!customer || !customer._id) {
    console.error('Customer data not loaded yet');
    return;
  }

  try {
    const payload = {
      customerId: customer._id,
      name: 'Untitled Calendar',
      description: item.description || '',
      contentItems: [
        {
          date: item.date,
          description: item.description
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('📝 POST calendar payload:', payload);

    const response = await fetch(`${API_URL}/calendars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errMsg = await response.text();
      throw new Error('Failed to add item: ' + errMsg);
    }

    fetchCalendarItems();
  } catch (err) {
    console.error('Error adding content item:', err);
  }
};



  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      return format(date, "MMMM dd, yyyy 'at' HH:mm");
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (loading) {
    return (
      <AdminLayout title="Customer Details">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <AdminLayout title="Customer Details">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-semibold">Customer not found</h3>
          </div>
          <p className="mb-4">{error || "The customer you're looking for doesn't exist."}</p>
          <button
            onClick={() => navigate('/admin/customers-list')}
            className="btn-primary flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Customers List
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Customer Details">
      <div className="space-y-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/admin/customers-list')}
            className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Customer Details</h2>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full mr-4">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{customer.name || 'N/A'}</h3>
              <p className="text-gray-600">Customer ID: {customer._id}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <Mail className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-gray-900">{customer.email}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Mobile</p>
                  <p className="text-gray-900">{customer.mobile || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-start">
                <MapPin className="h-5 w-5 text-gray-400 mr-3 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Address</p>
                  <p className="text-gray-900">{customer.address || 'Not provided'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <FileText className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">GST Number</p>
                  <p className="text-gray-900">{customer.gstNumber || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center">
                <User className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="text-gray-900 capitalize">{customer.role}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Created At</p>
                  <p className="text-gray-900">{formatDate(customer.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Content Calendar</h3>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Content Calendar
            </button>
          </div>

          {contentItems.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {contentItems.map((item, idx) => (
                <li key={idx} className="py-4">
                  <div className="text-sm text-gray-500">{formatDate(item.date)}</div>
                  <div className="text-base text-gray-900">{item.description}</div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No content calendar created yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Create a content calendar to start managing this customer's content.
              </p>
            </div>
          )}
        </div>

        <ContentItemModal
  isOpen={isAddModalOpen}
  onClose={() => setIsAddModalOpen(false)}
  onSave={handleAddItem}
  title="Create Content Calendar"
  disabled={!customer}
/>

      </div>
    </AdminLayout>
  );
}

export default CustomerDetailsView;
