import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AdminLayout from '../../components/layout/AdminLayout';
import ContentItemModal from '../../components/modals/ContentItemModal';
import { ChevronLeft, Pencil, Trash2, Plus, AlertCircle } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(undefined);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) return navigate('/admin');

    setCustomer({
      id,
      name: 'Test Customer',
    });
  }, [id, navigate]);

  useEffect(() => {
    fetchCalendarItems();
  }, [id]);

  const fetchCalendarItems = async () => {
    try {
      const response = await fetch(`${API_URL}/calendars/${id}`);
      if (!response.ok) {
        setContentItems([]);
        return;
      }

      const raw = await response.json();
      const calendarArray = Array.isArray(raw) ? raw : [raw];
      setCalendars(calendarArray);

      const allItems = calendarArray
        .filter(c => Array.isArray(c.contentItems) && c.contentItems.length > 0)
        .flatMap(c => c.contentItems.map(item => ({
          ...item,
          _calendarId: c._id,
          _id: `${c._id}_${item.date}_${item.description}`
        })))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setContentItems(allItems);
    } catch (err) {
      console.error("❌ Error fetching calendar items:", err);
    }
  };

  const handleAddItem = async (item) => {
    try {
      const response = await fetch(`${API_URL}/calendars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: id,
          name: 'Untitled Calendar',
          description: item.description || '',
          contentItems: [item],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to add item');
      fetchCalendarItems();
    } catch (err) {
      console.error('❌ Error adding content item:', err);
    }
  };
const handleEditItem = (item) => {
  setSelectedItem({
    ...item,
    _calendarId: item._calendarId || item._id?.split('_')[0],
    originalDate: item.date,
    originalDescription: item.description
  });
  setIsEditModalOpen(true);
};




 const handleUpdateItem = async (updatedItem) => {
  try {
    const {
      _calendarId,
      date,
      description,
      originalDate,
      originalDescription
    } = updatedItem;

    if (!_calendarId || !originalDate || !originalDescription) {
      console.error("❌ Missing required fields for update:", updatedItem);
      return;
    }

    const url = `${API_URL}/calendars/item/${_calendarId}/${originalDate}/${encodeURIComponent(originalDescription)}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, description })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('🛑 PUT failed:', response.status, errText);
      throw new Error(`Failed to update item (status ${response.status})`);
    }

    fetchCalendarItems();
  } catch (err) {
    console.error('❌ Error updating item:', err);
  } finally {
    setIsEditModalOpen(false);
  }
};



  const handleDeleteConfirm = (id) => setDeleteConfirmation(id);

  const handleDeleteItem = async (id) => {
    try {
      const [calendarId, date, ...descParts] = id.split('_');
      const description = descParts.join('_');
      const response = await fetch(
        `${API_URL}/calendars/item/${calendarId}/${date}/${encodeURIComponent(description)}`,
        {
          method: 'DELETE'
        }
      );
      if (!response.ok) throw new Error('Failed to delete item');
      fetchCalendarItems();
    } catch (err) {
      console.error('❌ Error deleting item:', err);
    }
    setDeleteConfirmation(null);
  };

  const handleCancelDelete = () => setDeleteConfirmation(null);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "do MMMM");
    } catch (error) {
      return dateString;
    }
  };

  if (!customer) {
    return (
      <AdminLayout title="Customer Not Found">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-semibold">Customer not found</h3>
          </div>
          <p className="mb-4">The customer you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => navigate('/admin')}
            className="btn-primary flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${customer.name} - Content Calendar`}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/admin')}
            className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{customer.name}</h2>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Content Calendar</h3>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" /> Add Content
            </button>
          </div>

          {contentItems.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {contentItems.map(item => (
                <li key={item._id} className="p-4">
                  {deleteConfirmation === item._id ? (
                    <div className="bg-red-50 p-3 rounded-md">
                      <p className="text-sm text-red-700 mb-3">
                        Are you sure you want to delete this content item?
                      </p>
                      <div className="flex space-x-3">
                        <button onClick={handleCancelDelete} className="btn-secondary text-sm py-1 px-3">Cancel</button>
                        <button onClick={() => handleDeleteItem(item._id)} className="btn-danger text-sm py-1 px-3">Delete</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-500">{formatDate(item.date)}</p>
                        <p className="text-base mt-1 text-primary-700">{item.description}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={() => handleEditItem(item)} className="text-gray-500 hover:text-primary-600">
                          <Pencil className="h-5 w-5" />
                        </button>
                        <button onClick={() => handleDeleteConfirm(item._id)} className="text-gray-500 hover:text-red-600">
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-500">No content items found.</div>
          )}
        </div>
      </div>

      <ContentItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddItem}
        title="Add New Content"
      />

      <ContentItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateItem}
        contentItem={selectedItem}
        title="Edit Content"
      />
    </AdminLayout>
  );
};

export default CustomerDetails;
