import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { Upload, Search, Filter, Grid, List, Eye, Download, Edit3, Trash2, Tag, Image, Video, FileText, Plus, X } from 'lucide-react';

function MediaLibrary() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // Get logged-in customer info from localStorage (same pattern as ContentCalendar)
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }
  const customer_id = user?.id || user?._id;
  const customer_name = user?.name || '';
  const customer_email = user?.email || '';

  // Dynamic state
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newTags, setNewTags] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Fetch media items from backend (filtered by customer)
  useEffect(() => {
    if (!customer_id) {
      setLoading(false);
      setError('No customer logged in');
      return;
    }
    setLoading(true);
    fetch(`${process.env.REACT_APP_API_URL}/api/media-library?customer_id=${encodeURIComponent(customer_id)}`)
      .then(res => res.json())
      .then(data => {
        setMediaItems(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        setError('Failed to load media');
        setLoading(false);
      });
  }, [customer_id]);

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

  // Upload files to backend (base64)
  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result.split(',')[1];
        const payload = {
          filename: file.name,
          contentType: file.type,
          base64Data,
          tags: [],
          customer_id,
          customer_name,
          customer_email
        };
        try {
          const resp = await fetch(`${process.env.REACT_APP_API_URL}/api/media-library/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!resp.ok) throw new Error('Upload failed');
          const saved = await resp.json();
          setMediaItems(prev => [saved, ...prev]);
        } catch (err) {
          setError('Upload failed');
        }
      };
      reader.readAsDataURL(file);
    });
    setShowUploadModal(false);
  };

  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.includes('svg')) return 'icon';
    return 'document';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'image':
        return <Image className="h-5 w-5 text-blue-600" />;
      case 'video':
        return <Video className="h-5 w-5 text-purple-600" />;
      case 'icon':
        return <Tag className="h-5 w-5 text-green-600" />;
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
      try {
        const resp = await fetch(`${process.env.REACT_APP_API_URL}/api/media-library/${editingItem._id}/tags`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tags: [...new Set([...(editingItem.tags || []), ...tagsArray])] })
        });
        if (!resp.ok) throw new Error();
        const updated = await resp.json();
        setMediaItems(prev => prev.map(item =>
          item._id === updated._id ? updated : item
        ));
      } catch {
        setError('Failed to update tags');
      }
      setNewTags('');
      setEditingItem(null);
      setShowTagModal(false);
    }
  };

  // Remove tag (update backend)
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
      if (!resp.ok) throw new Error();
      const updated = await resp.json();
      setMediaItems(prev => prev.map(i => i._id === updated._id ? updated : i));
    } catch {
      setError('Failed to remove tag');
    }
  };

  // Delete media from backend with confirmation
  const handleDeleteItem = async (itemId) => {
    const confirmed = window.confirm('Are you sure you want to delete this media file?');
    if (!confirmed) return;
    try {
      const resp = await fetch(`${process.env.REACT_APP_API_URL}/api/media-library/${itemId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error();
      setMediaItems(prev => prev.filter(item => item._id !== itemId));
      setSelectedMedia(null);
    } catch {
      setError('Failed to delete');
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200/50">
            <div className="space-y-4">
              {/* Top row: Upload button and view mode - mobile friendly */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Media
                </button>
                
                <div className="flex items-center justify-between sm:justify-end space-x-2">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'grid' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-lg transition-all duration-200 ${viewMode === 'list' ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Bottom row: Search and filter */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5 text-gray-600 flex-shrink-0" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full sm:w-auto border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="image">Images</option>
                    <option value="video">Videos</option>
                    <option value="icon">Icons</option>
                    <option value="document">Documents</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Media Grid/List */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-200/50">
            <h3 className="text-lg sm:text-xl font-bold mb-4 sm:mb-6 text-gray-900">
              Media Files ({filteredItems.length})
            </h3>
            {loading && (
              <div className="text-center py-12">
                <div className="relative">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                  <div className="absolute inset-0 rounded-full h-12 w-12 border-4 border-transparent border-r-blue-400 animate-ping mx-auto opacity-20"></div>
                </div>
                <p className="mt-4 text-slate-600 font-medium">Loading media...</p>
              </div>
            )}
            {error && (
              <div className="text-center py-2 text-red-500">{error}</div>
            )}
            {!loading && !error && (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                    {filteredItems.map((item) => (
                      <div
                        key={item._id}
                        className="group relative bg-white rounded-xl p-3 hover:shadow-xl transition-all duration-200 cursor-pointer border border-gray-200/50 hover:border-indigo-200"
                        onClick={() => setSelectedMedia(item)}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-square bg-gradient-to-br from-slate-100 to-blue-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                          {item.type === 'image' && item.url ? (
                            <img
                              src={item.url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                              onError={e => { e.target.style.opacity = 0.3; e.target.src = ""; }}
                            />
                          ) : (
                            <div className="text-gray-400">
                              {getTypeIcon(item.type)}
                            </div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">{item.size ? formatFileSize(item.size) : ''}</p>
                          
                          {/* Tags */}
                          {(item.tags && item.tags.length > 0) && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                                >
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 2 && (
                                <span className="text-xs text-gray-500">+{item.tags.length - 2}</span>
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
                            className="p-1 bg-white rounded-full shadow-md hover:bg-indigo-50 border border-gray-200"
                          >
                            <Tag className="h-3 w-3 text-indigo-600" />
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
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-white rounded-xl hover:shadow-lg transition-all duration-200 cursor-pointer border border-gray-200/50 hover:border-indigo-200 gap-3"
                        onClick={() => setSelectedMedia(item)}
                      >
                        <div className="flex items-start sm:items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                          <div className="flex-shrink-0">
                            {getTypeIcon(item.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs sm:text-sm text-gray-500 truncate">{item.size ? formatFileSize(item.size) : ''} • {item.uploadDate}</p>
                            {(item.tags && item.tags.length > 0) && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {item.tags.slice(0, 3).map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800"
                                  >
                                    {tag}
                                  </span>
                                ))}
                                {item.tags.length > 3 && (
                                  <span className="text-xs text-gray-500">+{item.tags.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-end space-x-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                              setShowTagModal(true);
                            }}
                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMedia(item);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredItems.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium">No media files found</p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
                    >
                      Upload your first file
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 mx-2">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Upload Media Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all duration-200 ${
                  dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
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
                />
                
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-indigo-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">
                  Drag and drop files here
                </p>
                <p className="text-gray-500 mb-4">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-6 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
                >
                  Browse Files
                </button>
                <p className="text-sm text-gray-400 mt-4">
                  Supports: Images, Videos, SVG, PDF, Documents (Max 50MB per file)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 mx-2">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">Manage Tags</h3>
                <button
                  onClick={() => {
                    setShowTagModal(false);
                    setEditingItem(null);
                    setNewTags('');
                  }}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 mb-2">File: {editingItem.name}</p>
                  
                  {/* Existing Tags */}
                  {editingItem.tags.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Current Tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {editingItem.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700 border border-indigo-200"
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(editingItem._id, tag)}
                              className="ml-2 text-indigo-600 hover:text-indigo-800 transition-colors"
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
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Add Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="e.g., summer, campaign, hero"
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowTagModal(false);
                      setEditingItem(null);
                      setNewTags('');
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTags}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
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
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-gray-200">
            <div className="flex items-start sm:items-center justify-between p-4 sm:p-6 border-b border-gray-200 gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{selectedMedia.name}</h3>
                <p className="text-xs sm:text-sm text-gray-600 truncate">{selectedMedia.size} • {selectedMedia.uploadDate}</p>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditingItem(selectedMedia);
                    setShowTagModal(true);
                  }}
                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(selectedMedia._id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-120px)] sm:max-h-[calc(90vh-120px)]">
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                {/* Media Preview */}
                <div className="flex-1 min-w-0">
                  {selectedMedia.type === 'image' && (
                    <img
                      src={selectedMedia.url}
                      alt={selectedMedia.name}
                      className="w-full h-auto max-h-64 sm:max-h-96 object-contain rounded-lg"
                    />
                  )}
                  {selectedMedia.type === 'video' && (
                    <video
                      src={selectedMedia.url}
                      controls
                      className="w-full h-auto max-h-64 sm:max-h-96 rounded-lg"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                  {selectedMedia.type === 'icon' && (
                    <div className="flex items-center justify-center h-64 sm:h-96 bg-gradient-to-br from-slate-100 to-blue-100 rounded-xl">
                      <img
                        src={selectedMedia.url}
                        alt={selectedMedia.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  {selectedMedia.type === 'document' && (
                    <div className="flex items-center justify-center h-64 sm:h-96 bg-gradient-to-br from-slate-100 to-blue-100 rounded-xl">
                      <div className="text-center px-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                        </div>
                        <p className="text-sm sm:text-base text-gray-600 font-medium">Document preview not available</p>
                        <button className="mt-4 inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-lg text-sm sm:text-base">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Info */}
                <div className="lg:w-80 w-full">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">File Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Type:</span>
                          <span className="capitalize text-gray-900 font-medium">{selectedMedia.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Size:</span>
                          <span className="text-gray-900 font-medium">{selectedMedia.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Uploaded:</span>
                          <span className="text-gray-900 font-medium">{selectedMedia.uploadDate}</span>
                        </div>
                      </div>
                    </div>

                    {selectedMedia.tags.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedMedia.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-700 border border-indigo-200"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200">
                      <button
                        onClick={() => {
                          // Handle download
                          const link = document.createElement('a');
                          link.href = selectedMedia.url;
                          link.download = selectedMedia.name;
                          link.click();
                        }}
                        className="w-full inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all duration-200 shadow-lg"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default MediaLibrary;