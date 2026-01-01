import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Search, Filter, Grid, List, Eye, Download, Edit3, Trash2, Tag, Image, Video, FileText, Plus, X } from 'lucide-react';
import Logo from '../admin/components/layout/Logo';

function MediaLibrary() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // TODO: Replace with actual customer info from context/auth/session
  const customer_id = "customer123";
  const customer_name = "John Doe";
  const customer_email = "john@example.com";

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
    setLoading(true);
    fetch(`/api/media-library?customer_id=${encodeURIComponent(customer_id)}`)
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
          const resp = await fetch('/api/media-library/upload', {
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
        const resp = await fetch(`/api/media-library/${editingItem._id}/tags`, {
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
      const resp = await fetch(`/api/media-library/${itemId}/tags`, {
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
      const resp = await fetch(`/api/media-library/${itemId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error();
      setMediaItems(prev => prev.filter(item => item._id !== itemId));
      setSelectedMedia(null);
    } catch {
      setError('Failed to delete');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-md border-b border-slate-200 sticky top-0 z-50">
        <div className="px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/customer')}
                className="group flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors"
              >
                <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                  <ArrowLeft className="h-5 w-5" />
                </div>
                <span className="font-medium">Back</span>
              </button>
              <div className="flex items-center gap-3">
                <Logo size="medium" />
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Media Library</h1>
                  <p className="text-xs text-slate-500">Manage your media assets</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8">
        <div className="space-y-6">
          {/* Controls */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="group inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  <Upload className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
                  Upload Media
                </button>
                
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
                  <Filter className="h-5 w-5 text-indigo-600" />
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border-none bg-transparent text-sm focus:outline-none focus:ring-0 text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="image">Images</option>
                    <option value="video">Videos</option>
                    <option value="icon">Icons</option>
                    <option value="document">Documents</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="h-5 w-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-slate-700 w-64"
                  />
                </div>

                <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-200'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Media Grid/List */}
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Image className="h-5 w-5 text-white" />
                </div>
                Media Files
                <span className="ml-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
                  {filteredItems.length}
                </span>
              </h3>
            </div>
            {loading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                <p className="mt-4 text-slate-600 font-medium">Loading media...</p>
              </div>
            )}
            {error && (
              <div className="text-center py-8 px-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            )}
            {!loading && !error && (
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {filteredItems.map((item) => (
                      <div
                        key={item._id}
                        className="group relative bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-3 hover:shadow-lg transition-all duration-200 cursor-pointer border border-slate-200 hover:border-indigo-300"
                        onClick={() => setSelectedMedia(item)}
                      >
                        {/* Thumbnail */}
                        <div className="aspect-square bg-white rounded-lg mb-3 flex items-center justify-center overflow-hidden shadow-inner">
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
                          <p className="text-sm font-medium text-[#0a2342] truncate">{item.name}</p>
                          <p className="text-xs text-[#38bdf8]">{item.size ? formatFileSize(item.size) : ''}</p>
                          
                          {/* Tags */}
                          {(item.tags && item.tags.length > 0) && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#38bdf8]/20 text-[#0a2342]"
                                >
                                  {tag}
                                </span>
                              ))}
                              {item.tags.length > 2 && (
                                <span className="text-xs text-[#38bdf8]">+{item.tags.length - 2}</span>
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
                            className="p-1 bg-white rounded-full shadow-md hover:bg-[#bae6fd]"
                          >
                            <Tag className="h-3 w-3 text-[#0a2342]" />
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
                        className="flex items-center justify-between p-4 bg-[#e6f2fb] rounded-lg hover:bg-[#bae6fd] transition-colors cursor-pointer border border-[#bae6fd]"
                        onClick={() => setSelectedMedia(item)}
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {getTypeIcon(item.type)}
                          </div>
                          <div>
                            <p className="font-medium text-[#0a2342]">{item.name}</p>
                            <p className="text-sm text-[#38bdf8]">{item.size ? formatFileSize(item.size) : ''} • {item.uploadDate}</p>
                          </div>
                          {(item.tags && item.tags.length > 0) && (
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-[#38bdf8]/20 text-[#0a2342]"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingItem(item);
                              setShowTagModal(true);
                            }}
                            className="p-2 text-[#38bdf8] hover:text-[#0a2342]"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMedia(item);
                            }}
                            className="p-2 text-[#38bdf8] hover:text-[#0a2342]"
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
                    <Upload className="h-12 w-12 text-[#38bdf8] mx-auto mb-3" />
                    <p className="text-[#0a2342]/70">No media files found.</p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="mt-2 text-[#0a2342] hover:text-[#38bdf8]"
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
        <div className="fixed inset-0 bg-[#0a2342]/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0a2342]">Upload Media Files</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-[#38bdf8] hover:text-[#0a2342]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive ? 'border-[#0a2342] bg-[#bae6fd]' : 'border-[#bae6fd]'
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
                
                <Upload className="h-12 w-12 text-[#38bdf8] mx-auto mb-4" />
                <p className="text-lg font-medium text-[#0a2342] mb-2">
                  Drag and drop files here
                </p>
                <p className="text-[#38bdf8] mb-4">or</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-4 py-2 bg-[#0a2342] text-white rounded-md hover:bg-[#38bdf8] transition-colors"
                >
                  Browse Files
                </button>
                <p className="text-sm text-[#0a2342]/60 mt-4">
                  Supports: Images, Videos, SVG, PDF, Documents (Max 50MB per file)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && editingItem && (
        <div className="fixed inset-0 bg-[#0a2342]/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#0a2342]">Manage Tags</h3>
                <button
                  onClick={() => {
                    setShowTagModal(false);
                    setEditingItem(null);
                    setNewTags('');
                  }}
                  className="text-[#38bdf8] hover:text-[#0a2342]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-[#0a2342] mb-2">File: {editingItem.name}</p>
                  
                  {/* Existing Tags */}
                  {editingItem.tags.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm text-[#38bdf8] mb-2">Current Tags:</p>
                      <div className="flex flex-wrap gap-2">
                        {editingItem.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#38bdf8]/20 text-[#0a2342]"
                          >
                            {tag}
                            <button
                              onClick={() => handleRemoveTag(editingItem._id, tag)}
                              className="ml-2 text-[#38bdf8] hover:text-[#0a2342]"
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
                    <label className="block text-sm font-medium text-[#0a2342] mb-2">
                      Add Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="e.g., summer, campaign, hero"
                      className="w-full border border-[#bae6fd] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0a2342] bg-[#e6f2fb] text-[#0a2342]"
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
                    className="px-4 py-2 text-[#0a2342] bg-[#bae6fd] rounded-md hover:bg-[#38bdf8]/20"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddTags}
                    className="px-4 py-2 bg-[#0a2342] text-white rounded-md hover:bg-[#38bdf8]"
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
        <div className="fixed inset-0 bg-[#0a2342]/90 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#bae6fd]">
              <div>
                <h3 className="text-lg font-semibold text-[#0a2342]">{selectedMedia.name}</h3>
                <p className="text-sm text-[#38bdf8]">{selectedMedia.size} • {selectedMedia.uploadDate}</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setEditingItem(selectedMedia);
                    setShowTagModal(true);
                  }}
                  className="p-2 text-[#38bdf8] hover:text-[#0a2342]"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteItem(selectedMedia._id)}
                  className="p-2 text-[#38bdf8] hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedMedia(null)}
                  className="p-2 text-[#38bdf8] hover:text-[#0a2342]"
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
                      className="w-full h-auto max-h-96 object-contain rounded-lg bg-[#e6f2fb]"
                    />
                  )}
                  {selectedMedia.type === 'video' && (
                    <video
                      src={selectedMedia.url}
                      controls
                      className="w-full h-auto max-h-96 rounded-lg bg-[#e6f2fb]"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                  {selectedMedia.type === 'icon' && (
                    <div className="flex items-center justify-center h-96 bg-[#e6f2fb] rounded-lg">
                      <img
                        src={selectedMedia.url}
                        alt={selectedMedia.name}
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  )}
                  {selectedMedia.type === 'document' && (
                    <div className="flex items-center justify-center h-96 bg-[#e6f2fb] rounded-lg">
                      <div className="text-center">
                        <FileText className="h-16 w-16 text-[#38bdf8] mx-auto mb-4" />
                        <p className="text-[#0a2342]/70">Document preview not available</p>
                        <button className="mt-2 inline-flex items-center px-4 py-2 bg-[#0a2342] text-white rounded-md hover:bg-[#38bdf8]">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Media Info */}
                <div className="lg:w-80">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-[#0a2342] mb-2">File Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-[#38bdf8]">Type:</span>
                          <span className="capitalize text-[#0a2342]">{selectedMedia.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#38bdf8]">Size:</span>
                          <span className="text-[#0a2342]">{selectedMedia.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-[#38bdf8]">Uploaded:</span>
                          <span className="text-[#0a2342]">{selectedMedia.uploadDate}</span>
                        </div>
                      </div>
                    </div>

                    {selectedMedia.tags.length > 0 && (
                      <div>
                        <h4 className="font-medium text-[#0a2342] mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedMedia.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-[#38bdf8]/20 text-[#0a2342]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-[#bae6fd]">
                      <button
                        onClick={() => {
                          // Handle download
                          const link = document.createElement('a');
                          link.href = selectedMedia.url;
                          link.download = selectedMedia.name;
                          link.click();
                        }}
                        className="w-full inline-flex items-center justify-center px-4 py-2 bg-[#0a2342] text-white rounded-md hover:bg-[#38bdf8]"
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
    </div>
  );
}

export default MediaLibrary;