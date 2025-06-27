import React, { useState, useEffect } from 'react';
import Modal from './Modal';

function ContentItemModal({ isOpen, onClose, onSave, contentItem, title }) {
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({ date: '', description: '' });

  useEffect(() => {
    if (contentItem) {
      setDate(contentItem.date);
      setDescription(contentItem.description);
    } else {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setDescription('');
    }
  }, [contentItem, isOpen]);

  const validate = () => {
    const newErrors = { date: '', description: '' };
    let isValid = true;

    if (!date) {
      newErrors.date = 'Date is required';
      isValid = false;
    }

    if (!description.trim()) {
      newErrors.description = 'Content description is required';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validate()) {
   onSave({
  ...(contentItem || {}),
  date,
  description,
  originalDate: contentItem?.originalDate || contentItem?.date,
  originalDescription: contentItem?.originalDescription || contentItem?.description
});

      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            id="date"
            className="input-field"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {errors.date && <p className="mt-1 text-sm text-red-600">{errors.date}</p>}
        </div>

        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Content Description
          </label>
          <textarea
            id="description"
            rows={3}
            className="input-field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter content description"
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            {contentItem ? 'Update' : 'Add'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ContentItemModal;