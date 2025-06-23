import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useCustomers } from '../../contexts/CustomerContext';
import AdminLayout from '../../components/layout/AdminLayout';
import ContentItemModal from '../../components/modals/ContentItemModal';
import { ChevronLeft, Pencil, Trash2, Plus, AlertCircle } from 'lucide-react';

const CustomerDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getCustomer, addContentItem, updateContentItem, deleteContentItem } = useCustomers();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(undefined);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);

  const customer = getCustomer(id);

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

  // Format date for display (e.g., "10th June")
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "do MMMM");
    } catch (error) {
      return dateString;
    }
  };

  const handleAddItem = (contentItem) => {
    addContentItem(customer.id, contentItem);
  };

  const handleEditItem = (contentItem) => {
    setSelectedItem(contentItem);
    setIsEditModalOpen(true);
  };

  const handleUpdateItem = (contentItem) => {
    updateContentItem(customer.id, contentItem);
  };

  const handleDeleteConfirm = (itemId) => {
    setDeleteConfirmation(itemId);
  };

  const handleDeleteItem = (itemId) => {
    deleteContentItem(customer.id, itemId);
    setDeleteConfirmation(null);
  };

  const handleCancelDelete = () => {
    setDeleteConfirmation(null);
  };

  const navigateToComment = () => {
    navigate('/admin/comment');
  };

  return (
    <AdminLayout title={`${customer.name} - Content Calendar`}>
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center">
          <button
            onClick={() => navigate('/admin')}
            className="mb-2 sm:mb-0 sm:mr-4 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{customer.name}</h2>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 animate-fade-in">
          <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-4">Content Calendar</h3>

          <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4 sm:mb-6">
            {customer.contentItems.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {customer.contentItems.map((item) => (
                  <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                    {deleteConfirmation === item.id ? (
                      <div className="bg-red-50 p-3 rounded-md">
                        <p className="text-sm text-red-700 mb-3">
                          Are you sure you want to delete this content item? This action cannot be undone.
                        </p>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleCancelDelete}
                            className="btn-secondary text-sm py-1 px-3"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="btn-danger text-sm py-1 px-3"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-500">{formatDate(item.date)}</p>
                          <p
                            className="text-base mt-1 text-primary-700 cursor-pointer hover:underline"
                            onClick={navigateToComment}
                            title="View Comments"
                          >
                            {item.description}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-gray-500 hover:text-primary-600 transition-colors"
                            aria-label="Edit"
                          >
                            <Pencil className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteConfirm(item.id)}
                            className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <p>No content items found for this customer.</p>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Add Content</span>
              <span className="inline xs:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add Content Modal */}
      <ContentItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddItem}
        title="Add New Content"
      />

      {/* Edit Content Modal */}
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