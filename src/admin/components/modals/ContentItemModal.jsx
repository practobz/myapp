import React, { useState, useEffect } from 'react';
import Modal from './Modal';

function ContentItemModal({ isOpen, onClose, onSave, contentItem, title, creators = [] }) {
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [contentTitle, setContentTitle] = useState('');
  const [type, setType] = useState('Instagram Post');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('High');
  const [assignedTo, setAssignedTo] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (contentItem) {
      setDate(contentItem.date || '');
      setDescription(contentItem.description || '');
      setContentTitle(contentItem.title || '');
      setType(contentItem.type || 'Instagram Post');
      setDueDate(contentItem.dueDate || '');
      setPriority(contentItem.priority || 'High');
      setAssignedTo(contentItem.assignedTo || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setDueDate(today);
      setDescription('');
      setContentTitle('');
      setType('Instagram Post');
      setPriority('High');
      setAssignedTo('');
    }
  }, [contentItem, isOpen]);

  const validate = () => {
    const newErrors = {};
    if (!date) newErrors.date = 'Date is required';
    if (!description.trim()) newErrors.description = 'Content description is required';
    if (!contentTitle.trim()) newErrors.contentTitle = 'Title is required';
    if (!dueDate) newErrors.dueDate = 'Due date is required';
    if (!assignedTo) newErrors.assignedTo = 'Please select a content creator';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        ...(contentItem || {}),
        date,
        description,
        title: contentTitle,
        type,
        dueDate,
        priority,
        assignedTo,
        originalDate: contentItem?.originalDate || contentItem?.date,
        originalDescription: contentItem?.originalDescription || contentItem?.description
      });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="max-h-[80vh] overflow-y-auto px-4 py-6" style={{ minHeight: '0' }}>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              type="text"
              className="input-field"
              value={contentTitle}
              onChange={(e) => setContentTitle(e.target.value)}
            />
            {errors.contentTitle && <p className="text-sm text-red-600">{errors.contentTitle}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Type</label>
            <select className="input-field" value={type} onChange={(e) => setType(e.target.value)}>
              <option>Instagram Post</option>
              <option>Facebook Post</option>
              <option>LinkedIn Post</option>
              <option>Story</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Due Date</label>
            <input
              type="date"
              className="input-field"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
            {errors.dueDate && <p className="text-sm text-red-600">{errors.dueDate}</p>}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Priority</label>
            <select className="input-field" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option>High</option>
              <option>Normal</option>
              <option>Low</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Assign To (Content Creator)</label>
            <select
              className="input-field"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
            >
              <option value="">-- Select Creator --</option>
              {creators.map(creator => (
                <option key={creator._id} value={creator.email}>
                  {creator.email}
                </option>
              ))}
            </select>
            {errors.assignedTo && <p className="text-sm text-red-600">{errors.assignedTo}</p>}
          </div>

          <div className="mb-4">
            <label htmlFor="date" className="block text-sm font-medium mb-1">
              Publish Date
            </label>
            <input
              type="date"
              id="date"
              className="input-field"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {errors.date && <p className="text-sm text-red-600">{errors.date}</p>}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Content Description</label>
            <textarea
              rows={3}
              className="input-field"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter content description"
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
          </div>

          <div className="flex justify-end space-x-3">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">{contentItem ? 'Update' : 'Add'}</button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

export default ContentItemModal;
