import React, { useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Upload,
  Image,
  X,
  Calendar,
  Palette,
  Send
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'https://myapi-2lv7dhspca-uc.a.run.app';

function ContentUpload() {
  const navigate = useNavigate();
  const { assignmentId } = useParams();
  const fileInputRef = useRef(null);

  const assignment = {
    id: assignmentId || '1',
    customer: 'Shoppers Stop',
    title: 'New Collection Launch Post',
    description: 'Create an engaging Instagram post for the new summer collection launch',
    dueDate: '2024-03-18',
    platform: 'Instagram',
    requirements: [
      'High-resolution images (1080x1080)',
      'Brand colors: #FF6B6B, #4ECDC4',
      'Include brand logo',
      'Engaging caption with hashtags'
    ]
  };

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedFiles(prev => [
            ...prev,
            {
              id: Date.now() + Math.random(),
              file,
              preview: e.target.result,
              name: file.name,
              size: file.size
            }
          ]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const removeFile = (id) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== id));
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
      alert('Please upload at least one image');
      return;
    }

    setSubmitting(true);
    const uploadedImageUrls = [];

    try {
      for (const fileObj of uploadedFiles) {
        const safeFileName = fileObj.name.replace(/[^\w.-]/g, '_');

        const res = await fetch(
          `${API_URL}/api/gcs/generate-upload-url?filename=${encodeURIComponent(safeFileName)}&contentType=${encodeURIComponent(fileObj.file.type)}`
        );

        if (!res.ok) {
          throw new Error(`Failed to get signed URL (Status: ${res.status})`);
        }

        const { url } = await res.json();
        if (!url) {
          throw new Error('Signed URL missing in response');
        }

        const uploadRes = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': fileObj.file.type
          },
          body: fileObj.file
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload failed for ${fileObj.name} (Status: ${uploadRes.status})`);
        }

        const publicUrl = `https://storage.googleapis.com/mediaupload-adcore/${safeFileName}`;
        uploadedImageUrls.push(publicUrl);
      }

      const response = await fetch(`${API_URL}/api/content-submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          assignment_id: assignment.id,
          caption,
          hashtags,
          notes,
          images: uploadedImageUrls
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save submission to database');
      }

      alert('Content submitted successfully! The customer will review your work.');
      navigate('/content-creator/assignments');
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/content-creator/assignments')}
              className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Palette className="h-6 w-6 text-purple-600" />
              </div>
              <span className="ml-2 text-xl font-bold text-purple-900">Content Upload</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Assignment Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
                <p className="text-gray-600 mt-1">for {assignment.customer}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Calendar className="h-4 w-4 mr-1" />
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                </div>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  {assignment.platform}
                </span>
              </div>
            </div>
            <p className="text-gray-700 mb-4">{assignment.description}</p>
            <h3 className="font-semibold text-gray-900 mb-2">Requirements:</h3>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              {assignment.requirements.map((req, i) => <li key={i}>{req}</li>)}
            </ul>
          </div>

          {/* Upload Section */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Upload Content</h2>
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-300 hover:border-gray-400'
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
                accept="image/*"
                onChange={handleChange}
                className="hidden"
              />
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium">Drag & drop or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                <Image className="h-4 w-4 mr-2" />
                Browse Files
              </button>
              <p className="text-sm text-gray-400 mt-2">JPG, PNG, GIF. Max 10MB each</p>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Uploaded Images ({uploadedFiles.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                      </div>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="mt-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Content Details</h2>
            <div className="space-y-4">
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                placeholder="Caption..."
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
                placeholder="Hashtags..."
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Notes for client..."
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          {/* Submit Section */}
          <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">Ready to Submit?</h3>
              <p className="text-sm text-gray-600 mt-1">Your content will be sent to {assignment.customer} for review</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || uploadedFiles.length === 0}
              className="inline-flex items-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
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
  );
}

export default ContentUpload;
