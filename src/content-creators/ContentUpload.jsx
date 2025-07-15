import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Image, X, Check, FileText, Calendar, Clock, Palette, Send, MapPin, Tag, MessageSquare, Play, Video } from 'lucide-react';

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

function ContentUpload() {
  const navigate = useNavigate();
  const { assignmentId } = useParams();
  const fileInputRef = useRef(null);

  // State for assignment details
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const creatorEmail = getCreatorEmail();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail) {
      navigate('/content-creator/login');
    }
  }, [creatorEmail, navigate]);

  // Fetch real assignment data based on assignmentId
  useEffect(() => {
    const fetchAssignment = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await res.json();
        let found = null;
        calendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            calendar.contentItems.forEach(item => {
              const id = item.id || item._id || item.title;
              if (id === assignmentId) {
                found = {
                  ...item,
                  calendarName: calendar.name || calendar.customerName || calendar.customer || '',
                  customerId: calendar.customerId || calendar.customer_id || calendar.customer?._id || '',
                  customerName: calendar.customerName || calendar.customer || '',
                  id,
                  dueDate: item.dueDate || item.due_date,
                  platform: item.platform || 'Instagram',
                  requirements: item.requirements || [],
                };
              }
            });
          }
        });
        setAssignment(found);
      } catch (err) {
        setAssignment(null);
      } finally {
        setLoading(false);
      }
    };
    if (assignmentId) {
      fetchAssignment();
    }
  }, [assignmentId]);

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

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const newFile = {
            id: Date.now() + Math.random(),
            file: file,
            preview: e.target.result,
            name: file.name,
            size: file.size,
            type: file.type.startsWith('image/') ? 'image' : 'video'
          };
          setUploadedFiles(prev => [...prev, newFile]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one image or video');
      return;
    }

    setSubmitting(true);
    const uploadedMediaUrls = [];

    try {
      // Upload each media file through backend proxy
      for (const fileObj of uploadedFiles) {
        const safeFileName = fileObj.name.replace(/[^\w.-]/g, '_');
        
        // Convert file to base64
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = reader.result.split(',')[1]; // Remove data:image/png;base64, prefix
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(fileObj.file);
        });

        console.log('Uploading file via backend proxy:', {
          name: fileObj.name,
          safeFileName,
          type: fileObj.file.type,
          size: fileObj.file.size
        });

        // Upload via backend proxy
        const uploadRes = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/upload-base64`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: safeFileName,
            contentType: fileObj.file.type,
            base64Data: base64Data
          }),
        });

        if (!uploadRes.ok) {
          const errorData = await uploadRes.json();
          console.error('Backend upload failed:', errorData);
          throw new Error(`Upload failed for ${fileObj.name}: ${errorData.error || 'Unknown error'}`);
        }

        const uploadResult = await uploadRes.json();
        
        if (!uploadResult.success || !uploadResult.publicUrl) {
          throw new Error(`Invalid response for ${fileObj.name}`);
        }

        uploadedMediaUrls.push({
          url: uploadResult.publicUrl,
          type: fileObj.type,
          name: fileObj.name
        });
        
        console.log('Successfully uploaded via backend:', uploadResult.filename);
      }

      // Send metadata to backend
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignment_id: assignment.id,
          caption,
          hashtags,
          notes,
          images: uploadedMediaUrls, // Keep as 'images' for backend compatibility
          created_by: creatorEmail
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to save submission:', errorData);
        throw new Error('Failed to save submission to database');
      }

      alert('Content submitted successfully! The customer will review your work.');
      navigate('/content-creator/assignments');
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Upload failed: ${err.message}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <span className="text-lg text-gray-700">Loading assignment...</span>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <span className="text-lg text-red-600">Assignment not found.</span>
          <button
            onClick={() => navigate('/content-creator/assignments')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/content-creator/assignments')}
                className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Palette className="h-5 w-5 text-purple-600" />
                </div>
                <span className="ml-3 text-xl font-bold text-gray-900">Content Upload</span>
              </div>
            </div>
            
            {/* Assignment Info in Header */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
                <p className="text-xs text-gray-500">for {assignment.customerName}</p>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                {assignment.platform}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Assignment Details - Compact */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 md:hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{assignment.title}</h1>
              <p className="text-sm text-gray-600">for {assignment.customerName}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center text-xs text-gray-500 mb-1">
                <Calendar className="h-3 w-3 mr-1" />
                {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                {assignment.platform}
              </span>
            </div>
          </div>
          {assignment.description && (
            <p className="text-sm text-gray-600 mt-2">{assignment.description}</p>
          )}
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-purple-600" />
                Upload Media
              </h2>
              
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                  dragActive 
                    ? 'border-purple-400 bg-purple-50 scale-105' 
                    : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
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
                  accept="image/*,video/*"
                  onChange={handleChange}
                  className="hidden"
                />
                
                <div className="space-y-3">
                  <div className="flex justify-center space-x-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">
                      Drag and drop your images and videos here
                    </p>
                    <p className="text-sm text-gray-500">or</p>
                    <button
                      onClick={onButtonClick}
                      className="mt-2 inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                      <Image className="h-4 w-4 mr-2" />
                      Browse Files
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supports: JPG, PNG, GIF, MP4, MOV, AVI (Max 100MB per file)
                  </p>
                </div>
              </div>
            </div>

            {/* Media Preview Grid */}
            {uploadedFiles.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Image className="h-5 w-5 mr-2 text-purple-600" />
                  Uploaded Media ({uploadedFiles.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 ring-2 ring-transparent group-hover:ring-purple-200 transition-all relative">
                        {file.type === 'image' ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="relative w-full h-full">
                            <video
                              src={file.preview}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                              <Play className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              VIDEO
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      <div className="mt-2">
                        <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            file.type === 'image' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {file.type.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Content Details & Assignment Info */}
          <div className="space-y-6">
            {/* Assignment Details - Desktop */}
            <div className="bg-white rounded-lg shadow-sm p-6 hidden md:block">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-purple-600" />
                Assignment Details
              </h2>
              
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-4 w-4 mr-1" />
                  {assignment.customerName}
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
                </div>

                {assignment.requirements && assignment.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm mb-2">Requirements:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {assignment.requirements.map((req, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-3 w-3 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Content Details Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
                Content Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Write an engaging caption..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="h-4 w-4 inline mr-1" />
                    Hashtags
                  </label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="#fashion #summer #style"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes for Client
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-2">Ready to Submit?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Your content will be sent to {assignment.customerName} for review
                </p>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || uploadedFiles.length === 0}
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Content
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentUpload;