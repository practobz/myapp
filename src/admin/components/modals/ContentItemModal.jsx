import React, { useState, useEffect, useRef } from 'react';
import Modal from './Modal';
import { v4 as uuidv4 } from 'uuid';
import { ChevronDown } from 'lucide-react';

function ContentItemModal({
  isOpen,
  onClose,
  onSave,
  title,
  creators = [],
  contentItem,
  platformOptions = ['facebook', 'instagram', 'youtube', 'linkedin'],
  multiPlatform = false
}) {
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [contentTitle, setContentTitle] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState(
    Array.isArray(contentItem?.type)
      ? contentItem.type
      : contentItem?.type
        ? [contentItem.type]
        : []
  );
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('High');
  const [assignedTo, setAssignedTo] = useState('');
  const [errors, setErrors] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef();

  useEffect(() => {
    if (contentItem) {
      setDate(contentItem.date || '');
      setDescription(contentItem.description || '');
      setContentTitle(contentItem.title || '');
      setSelectedPlatforms(
        Array.isArray(contentItem.type)
          ? contentItem.type
          : contentItem.type
            ? [contentItem.type]
            : []
      );
      setDueDate(contentItem.dueDate || '');
      setPriority(contentItem.priority || 'High');
      setAssignedTo(contentItem.assignedTo || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setDate(today);
      setDueDate(today);
      setDescription('');
      setContentTitle('');
      setSelectedPlatforms([]);
      setPriority('High');
      setAssignedTo('');
    }
  }, [contentItem, isOpen]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

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
        id: contentItem?.id || uuidv4(),
        date,
        description,
        title: contentTitle,
        type: multiPlatform ? selectedPlatforms : selectedPlatforms[0],
        dueDate,
        priority,
        assignedTo,
        status: contentItem?.status || 'pending', // Set initial status to 'pending'
        originalDate: contentItem?.originalDate || contentItem?.date,
        originalDescription: contentItem?.originalDescription || contentItem?.description
      });
      onClose();
    }
  };

  const handleCheckboxChange = (platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
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

          <div className="mb-4" ref={dropdownRef}>
            <label className="block text-sm font-medium mb-1">Type</label>
            <div className="relative">
              <button
                type="button"
                className={`form-select w-full text-left flex items-center justify-between bg-white border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-blue-400 transition`}
                onClick={() => setDropdownOpen((open) => !open)}
                tabIndex={0}
              >
                <div className="flex flex-wrap gap-1">
                  {selectedPlatforms.length === 0
                    ? <span className="text-gray-400">Select platforms</span>
                    : selectedPlatforms.map(p => (
                        <span
                          key={p}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 mr-1`}
                        >
                          {p.charAt(0).toUpperCase() + p.slice(1)}
                        </span>
                      ))
                  }
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500 ml-2" />
              </button>
              {dropdownOpen && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto animate-fade-in">
                  {platformOptions.map(opt => (
                    <label key={opt} className="flex items-center px-3 py-2 hover:bg-blue-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(opt)}
                        onChange={() => handleCheckboxChange(opt)}
                        className="mr-2 accent-blue-600"
                      />
                      <span className="text-gray-700">{opt.charAt(0).toUpperCase() + opt.slice(1)}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500">Select one or more platforms.</span>
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
