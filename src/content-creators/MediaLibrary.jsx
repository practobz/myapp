import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Search, Filter, Grid, List, Image, Video, FileText, 
  Tag, X, Eye, Edit3, Trash2, Download, FolderOpen, Users, ChevronRight, Folder
} from 'lucide-react';
import Footer from '../admin/components/layout/Footer';

// Helper to get creator email from localStorage
function getCreatorEmail() {
  let email = '';
  try {
    email = (localStorage.getItem('userEmail') || '').toLowerCase();
    if (!email) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.email) {
          email = userObj.email.toLowerCase();
        }
      }
    }
  } catch (e) {
    email = '';
  }
  return email;
}

function MediaLibrary() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const creatorEmail = getCreatorEmail();

  // Customer folder state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Media state
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newTags, setNewTags] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail) {
      navigate('/content-creator/login');
    }
  }, [creatorEmail, navigate]);

  // Fetch customers assigned to this content creator
  useEffect(() => {
    if (!creatorEmail) return;
    
    const fetchAssignedCustomers = async () => {
      setLoadingCustomers(true);
      try {
        // First fetch all customers
        const customersRes = await fetch(`${process.env.REACT_APP_API_URL}/api/customers`);
        const customersData = await customersRes.json();
        const customerMap = {};
        if (Array.isArray(customersData.customers)) {
          customersData.customers.forEach(c => {
            customerMap[c._id || c.id] = {
              id: c._id || c.id,
              name: c.name || c.customerName || c.email || 'Unknown Customer',
              email: c.email || '',
              company: c.company || ''
            };
          });
        }

        // Fetch calendars to find which customers this creator is assigned to
        const calendarsRes = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await calendarsRes.json();
        
        const assignedCustomerIds = new Set();
        calendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            calendar.contentItems.forEach(item => {
              if ((item.assignedTo || '').toLowerCase() === creatorEmail) {
                const custId = calendar.customerId || calendar.customer_id || (calendar.customer && calendar.customer._id);
                if (custId) {
                  assignedCustomerIds.add(custId);
                }
              }
            });
          }
        });

        // Build customer list with only assigned customers
        const assignedCustomers = [];
        assignedCustomerIds.forEach(custId => {
          if (customerMap[custId]) {
            assignedCustomers.push(customerMap[custId]);
          }
        });

        setCustomers(assignedCustomers);
      } catch (err) {
        console.error('Failed to load customers:', err);
        setCustomers([]);
      } finally {
        setLoadingCustomers(false);
      }
    };

    fetchAssignedCustomers();
  }, [creatorEmail]);

  // Fetch media items for selected customer
  useEffect(() => {
    if (!creatorEmail || !selectedCustomer) {
      setMediaItems([]);
      return;
    }
    
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/api/media-library?creator_email=${encodeURIComponent(creatorEmail)}&customer_id=${encodeURIComponent(selectedCustomer.id)}`)
      .then(res => res.json())
      .then(data => {
        setMediaItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load media:', err);
        setMediaItems([]);
        setLoading(false);
      });
  }, [creatorEmail, selectedCustomer]);

  // Upload handling
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Upload files to backend (base64) - now includes customer_id
  const handleFiles = (files) => {
    if (!selectedCustomer) {
      setError('Please select a customer folder first');
      return;
    }
    
    setUploading(true);
    const uploadPromises = Array.from(files).map(file => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64Data = e.target.result.split(',')[1];
          const payload = {
            filename: file.name,
            contentType: file.type,
            base64Data,
            tags: [],
            creator_email: creatorEmail,
            creator_name: creatorEmail.split('@')[0],
            customer_id: selectedCustomer.id,
            customer_name: selectedCustomer.name
          };
          try {
            const resp = await fetch(`${process.env.REACT_APP_API_URL}/api/media-library/upload`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!resp.ok) throw new Error('Upload failed');
            const newItem = await resp.json();
            resolve(newItem);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    });

    Promise.all(uploadPromises)
      .then(newItems => {
        setMediaItems(prev => [...newItems, ...prev]);
        setShowUploadModal(false);
      })
      .catch(err => {
        setError('Failed to upload one or more files');
      })
      .finally(() => {
        setUploading(false);
      });
  };

  const getFileType = (mimeType) => {
    if (!mimeType) return 'document';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('svg')) return 'icon';
    return 'document';
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'image':
        return <Image className="h-5 w-5 text-purple-600" />;
      case 'video':
        return <Video className="h-5 w-5 text-blue-600" />;
      case 'icon':
        return <Image className="h-5 w-5 text-green-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const filteredItems = mediaItems.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (item.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Update tags in backend
  const handleAddTags = async () => {
    if (editingItem && newTags.trim()) {
      const tagsArray = newTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      const updatedTags = [...(editingItem.tags || []), ...tagsArray];
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/api/media-library/${editingItem._id}/tags`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: updatedTags })
        });
        if (!resp.ok) throw new Error('Failed to update tags');
        const updated = await resp.json();
        setMediaItems(prev => prev.map(i => i._id === updated._id ? updated : i));
      } catch {
        setError('Failed to add tags');
      }
      setNewTags('');
      setEditingItem(null);
      setShowTagModal(false);
    }
  };

  // Remove tag
  const handleRemoveTag = async (itemId, tagToRemove) => {
    const item = mediaItems.find(i => i._id === itemId);
    if (!item) return;
    const tags = (item.tags || []).filter(tag => tag !== tagToRemove);
    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/api/media-library/${itemId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags })
      });
      if (!resp.ok) throw new Error('Failed to remove tag');
      const updated = await resp.json();
      setMediaItems(prev => prev.map(i => i._id === updated._id ? updated : i));
      if (editingItem && editingItem._id === itemId) {
        setEditingItem(updated);
      }
    } catch {
      setError('Failed to remove tag');
    }
  };

  // Delete media
  const handleDeleteItem = async (itemId) => {
    const confirmed = window.confirm('Are you sure you want to delete this media file?');
    if (!confirmed) return;
    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/api/media-library/${itemId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Failed to delete');
      setMediaItems(prev => prev.filter(item => item._id !== itemId));
      setSelectedMedia(null);
    } catch {
      setError('Failed to delete');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  // Go back to customer folders
  const handleBackToFolders = () => {
    setSelectedCustomer(null);
    setMediaItems([]);
    setSearchTerm('');
    setFilterType('all');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      {/* Header with Navigation */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => selectedCustomer ? handleBackToFolders() : navigate('/content-creator')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                  <FolderOpen className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    Content Creator Portal
                  </span>
                  <p className="text-sm text-gray-500">Media Library</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Page Title Banner */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">My Media Library</h1>
            <p className="text-gray-600">
              {selectedCustomer 
                ? `Manage files for ${selectedCustomer.name}`
                : 'Select a customer folder to manage their media assets'
              }
            </p>
          </div>

          {/* Breadcrumb */}
          {selectedCustomer && (
            <div className="mb-6 flex items-center gap-2 text-sm">
              <button 
                onClick={handleBackToFolders}
                className="text-purple-600 hover:text-purple-800 font-medium flex items-center gap-1"
              >
                <Folder className="h-4 w-4" />
                Customer Folders
              </button>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-700 font-medium">{selectedCustomer.name}</span>
            </div>
          )}

          {/* Customer Folders View */}
          {!selectedCustomer && (
            <div className="space-y-6">
              {/* Folders Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <h2 className="text-lg font-bold text-gray-900">Customer Folders</h2>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      {customers.length} customers
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {loadingCustomers ? (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600 font-medium">Loading customer folders...</p>
                    </div>
                  ) : customers.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-4">
                        <Folder className="h-10 w-10 text-purple-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">No customers assigned</h3>
                      <p className="text-gray-500">You don't have any customer assignments yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {customers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => setSelectedCustomer(customer)}
                          className="group bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-5 hover:shadow-lg transition-all duration-300 cursor-pointer border-2 border-gray-100 hover:border-purple-300 hover:from-purple-50 hover:to-indigo-50"
                        >
                          <div className="flex items-start gap-4">
                            <div className="p-3 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg group-hover:shadow-amber-200 transition-shadow">
                              <Folder className="h-8 w-8 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 truncate group-hover:text-purple-900">
                                {customer.name}
                              </h3>
                              {customer.email && (
                                <p className="text-xs text-gray-500 truncate mt-1">{customer.email}</p>
                              )}
                              {customer.company && (
                                <p className="text-xs text-gray-400 truncate">{customer.company}</p>
                              )}
                            </div>
                            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Media Files View (when customer is selected) */}
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div 
                  className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer transition-all ${filterType === 'all' ? 'border-purple-500 ring-2 ring-purple-200' : 'border-gray-100 hover:border-purple-200'}`}
                  onClick={() => setFilterType('all')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <FolderOpen className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">All Files</p>
                      <p className="text-xl font-bold text-gray-900">{mediaItems.length}</p>
                    </div>
                  </div>
                </div>
                <div 
                  className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer transition-all ${filterType === 'image' ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-100 hover:border-blue-200'}`}
                  onClick={() => setFilterType('image')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Image className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Images</p>
                      <p className="text-xl font-bold text-gray-900">{mediaItems.filter(i => i.type === 'image').length}</p>
                    </div>
                  </div>
                </div>
                <div 
                  className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer transition-all ${filterType === 'video' ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-100 hover:border-green-200'}`}
                  onClick={() => setFilterType('video')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <Video className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Videos</p>
                      <p className="text-xl font-bold text-gray-900">{mediaItems.filter(i => i.type === 'video').length}</p>
                    </div>
                  </div>
                </div>
                <div 
                  className={`bg-white rounded-xl shadow-sm border-2 p-4 cursor-pointer transition-all ${filterType === 'document' ? 'border-amber-500 ring-2 ring-amber-200' : 'border-gray-100 hover:border-amber-200'}`}
                  onClick={() => setFilterType('document')}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-lg">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Documents</p>
                      <p className="text-xl font-bold text-gray-900">{mediaItems.filter(i => i.type === 'document').length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Filter className="h-5 w-5 text-purple-600" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">Controls</h2>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Upload Button */}
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
                    >
                      <Upload className="h-5 w-5" />
                      Upload Files
                    </button>

                    {/* Search */}
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search by name or tag..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
                      >
                        <Grid className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-200'}`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Grid/List */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Image className="h-5 w-5 text-purple-600" />
                      </div>
                      <h2 className="text-lg font-bold text-gray-900">Media Files</h2>
                    </div>
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                      {filteredItems.length} items
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  {loading && (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto"></div>
                      <p className="mt-4 text-gray-600 font-medium">Loading media...</p>
                    </div>
                  )}

                  {error && (
                    <div className="text-center py-8 px-4 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-red-600 font-medium">{error}</p>
                      <button onClick={() => setError('')} className="mt-2 text-sm text-red-500 hover:underline">Dismiss</button>
                    </div>
                  )}

                  {!loading && !error && (
                    <>
                      {viewMode === 'grid' ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          {filteredItems.map((item) => (
                            <div
                              key={item._id}
                              className="group relative bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-3 hover:shadow-lg transition-all duration-300 cursor-pointer border border-gray-100 hover:border-purple-200"
                              onClick={() => setSelectedMedia(item)}
                            >
                              {/* Thumbnail */}
                              <div className="aspect-square bg-white rounded-lg mb-3 flex items-center justify-center overflow-hidden shadow-inner border border-gray-100">
                                {item.type === 'image' && item.url ? (
                                  <img
                                    src={item.url}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                    onError={e => { e.target.style.opacity = 0.3; }}
                                  />
                                ) : item.type === 'video' && item.url ? (
                                  <div className="relative w-full h-full bg-gray-100 flex items-center justify-center">
                                    <Video className="h-10 w-10 text-purple-400" />
                                  </div>
                                ) : (
                                  <div className="text-gray-400">
                                    {getTypeIcon(item.type)}
                                  </div>
                                )}
                              </div>

                              {/* File Info */}
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(item.size)}</p>
                                
                                {/* Tags */}
                                {item.tags && item.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.tags.slice(0, 2).map((tag) => (
                                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                                        {tag}
                                      </span>
                                    ))}
                                    {item.tags.length > 2 && (
                                      <span className="text-xs text-purple-500">+{item.tags.length - 2}</span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Actions */}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(item);
                                    setShowTagModal(true);
                                  }}
                                  className="p-1.5 bg-white rounded-full shadow-md hover:bg-purple-50 border border-gray-200"
                                >
                                  <Tag className="h-3.5 w-3.5 text-purple-600" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {filteredItems.map((item) => (
                            <div
                              key={item._id}
                              className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl hover:from-purple-50 hover:to-indigo-50 transition-all cursor-pointer border border-gray-100 hover:border-purple-200"
                              onClick={() => setSelectedMedia(item)}
                            >
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div className="p-2 bg-white rounded-lg border border-gray-200">
                                  {getTypeIcon(item.type)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                                  <p className="text-xs text-gray-500">{formatFileSize(item.size)} • {formatDate(item.uploadDate || item.createdAt)}</p>
                                </div>
                                {item.tags && item.tags.length > 0 && (
                                  <div className="hidden md:flex flex-wrap gap-1">
                                    {item.tags.map((tag) => (
                                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-700">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(item);
                                    setShowTagModal(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMedia(item);
                                  }}
                                  className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {filteredItems.length === 0 && (
                        <div className="text-center py-16">
                          <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl w-20 h-20 flex items-center justify-center mx-auto mb-4">
                            <Upload className="h-10 w-10 text-purple-500" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-2">No files uploaded yet</h3>
                          <p className="text-gray-500 mb-4">Upload files for {selectedCustomer.name}</p>
                          <button
                            onClick={() => setShowUploadModal(true)}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-all"
                          >
                            <Upload className="h-4 w-4" />
                            Upload Files
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => !uploading && setShowUploadModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Upload className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Upload Media Files</h3>
                    {selectedCustomer && (
                      <p className="text-sm text-gray-500">For: {selectedCustomer.name}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => !uploading && setShowUploadModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={uploading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                  dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*,.svg,.pdf,.doc,.docx,.zip"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={uploading}
                />
                
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600 mx-auto mb-4"></div>
                    <p className="text-lg font-semibold text-gray-900">Uploading...</p>
                  </>
                ) : (
                  <>
                    <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-8 w-8 text-purple-600" />
                    </div>
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      Drag and drop files here
                    </p>
                    <p className="text-gray-500 mb-4">or</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                    >
                      Browse Files
                    </button>
                    <p className="text-xs text-gray-400 mt-4">
                      Supports: Images, Videos, SVG, PDF, Documents (Max 50MB)
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => { setShowTagModal(false); setEditingItem(null); setNewTags(''); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Tag className="h-5 w-5 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Manage Tags</h3>
                </div>
                <button
                  onClick={() => { setShowTagModal(false); setEditingItem(null); setNewTags(''); }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">File:</p>
                  <p className="text-sm text-gray-900 truncate bg-gray-50 px-3 py-2 rounded-lg">{editingItem.name}</p>
                </div>
                
                {/* Existing Tags */}
                {editingItem.tags && editingItem.tags.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Current Tags:</p>
                    <div className="flex flex-wrap gap-2">
                      {editingItem.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700"
                        >
                          {tag}
                          <button
                            onClick={() => handleRemoveTag(editingItem._id, tag)}
                            className="ml-2 text-purple-400 hover:text-purple-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add New Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                    placeholder="e.g., summer, campaign, hero"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 text-gray-900"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => { setShowTagModal(false); setEditingItem(null); setNewTags(''); }}
                    className="px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTags}
                    className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 font-medium transition-all"
                  >
                    Save Tags
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Viewer Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50" onClick={() => setSelectedMedia(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="min-w-0 flex-1 mr-4">
                <h3 className="text-lg font-bold text-gray-900 truncate">{selectedMedia.name}</h3>
                <p className="text-sm text-gray-500">{formatFileSize(selectedMedia.size)} • {formatDate(selectedMedia.uploadDate || selectedMedia.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingItem(selectedMedia);
                    setShowTagModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <Edit3 className="h-5 w-5" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteItem(selectedMedia._id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Media Preview */}
                <div className="flex-1">
                  {selectedMedia.type === 'image' && (
                    <img
                      src={selectedMedia.url}
                      alt={selectedMedia.name}
                      className="w-full h-auto max-h-96 object-contain rounded-xl bg-gray-100"
                    />
                  )}
                  {selectedMedia.type === 'video' && (
                    <video
                      src={selectedMedia.url}
                      controls
                      className="w-full h-auto max-h-96 rounded-xl bg-gray-100"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                  {(selectedMedia.type === 'document' || selectedMedia.type === 'icon') && (
                    <div className="flex items-center justify-center h-96 bg-gray-100 rounded-xl">
                      <div className="text-center">
                        <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">Preview not available</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Info */}
                <div className="lg:w-72">
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">File Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Type:</span>
                          <span className="capitalize text-gray-900 font-medium">{selectedMedia.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Size:</span>
                          <span className="text-gray-900 font-medium">{formatFileSize(selectedMedia.size)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Uploaded:</span>
                          <span className="text-gray-900 font-medium">{formatDate(selectedMedia.uploadDate || selectedMedia.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {selectedMedia.tags && selectedMedia.tags.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h4 className="font-semibold text-gray-900 mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedMedia.tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = selectedMedia.url;
                        link.download = selectedMedia.name;
                        link.click();
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg"
                    >
                      <Download className="h-5 w-5" />
                      Download
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaLibrary;
