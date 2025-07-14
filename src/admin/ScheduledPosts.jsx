import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Facebook, Instagram, Image, Send, Eye, Edit, Trash2, CheckCircle, XCircle, Loader2, Plus, Filter, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const FACEBOOK_APP_ID = '1678447316162226';
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://my-backend-593529385135.asia-south1.run.app';

function ScheduledPosts() {
  const navigate = useNavigate();

  // Facebook SDK state
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  const [fbLoggedIn, setFbLoggedIn] = useState(false);
  const [fbPages, setFbPages] = useState([]);
  const [fbUserData, setFbUserData] = useState(null);

  // Scheduling form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    caption: '',
    imageUrl: '',
    platform: 'facebook', // 'facebook', 'instagram', 'both'
    pageId: '',
    instagramId: '',
    scheduledDate: '',
    scheduledTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });

  // Scheduled posts state
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'published', 'failed'

  // Add state for image browser
  const [showImageBrowser, setShowImageBrowser] = useState(false);
  const [bucketImages, setBucketImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  const fileInputRef = useRef(null);

  // Load Facebook SDK
  useEffect(() => {
    loadFacebookSDK();
  }, []);

  // Fetch scheduled posts on component mount
  useEffect(() => {
    fetchScheduledPosts();
  }, []);

  const loadFacebookSDK = () => {
    if (document.getElementById('facebook-jssdk')) {
      setFbSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = function() {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v19.0'
      });
      setFbSdkLoaded(true);

      window.FB.getLoginStatus(response => {
        if (response.status === 'connected') {
          setFbLoggedIn(true);
          fetchFbUserData();
          fetchFbPages();
        }
      });
    };

    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  };

  const handleFbLogin = () => {
    window.FB.login(response => {
      if (response.status === 'connected') {
        setFbLoggedIn(true);
        fetchFbUserData();
        fetchFbPages();
      }
    }, {
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_content_publish,instagram_basic'
    });
  };

  const fetchFbUserData = () => {
    window.FB.api('/me', { fields: 'id,name,email,picture' }, function(response) {
      setFbUserData(response);
    });
  };

  const fetchFbPages = () => {
    window.FB.api('/me/accounts', {
      fields: 'id,name,access_token,instagram_business_account'
    }, function(response) {
      if (response && response.data) {
        const pagesWithDetails = response.data.map(page => {
          if (page.instagram_business_account) {
            // Fetch Instagram details with explicit access token
            window.FB.api(`/${page.instagram_business_account.id}`, {
              fields: 'id,username',
              access_token: page.access_token // Pass token explicitly
            }, function(igResponse) {
              if (igResponse) {
                page.instagram_details = igResponse;
                setFbPages(prev => [...prev.filter(p => p.id !== page.id), page]);
              }
            });
          }
          return page;
        });
        setFbPages(pagesWithDetails);
      }
    });
  };

  const fetchScheduledPosts = async () => {
    setLoading(true);
    try {
      console.log('🔍 Fetching scheduled posts from:', `${API_BASE_URL}/api/scheduled-posts`);
      
      const response = await fetch(`${API_BASE_URL}/api/scheduled-posts`);
      console.log('📡 Response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Scheduled posts endpoint not found, using empty array');
          setScheduledPosts([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('📊 Fetched scheduled posts:', data);
      
      // Ensure data is always an array
      setScheduledPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch scheduled posts:', error);
      // Set empty array on error
      setScheduledPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing images from bucket
  const fetchBucketImages = async () => {
    setLoadingImages(true);
    try {
      console.log('🔍 Fetching images from:', `${API_BASE_URL}/api/gcs/list-images?limit=100`);
      
      const response = await fetch(`${API_BASE_URL}/api/gcs/list-images?limit=100`);
      console.log('📡 Image response status:', response.status);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.warn('Image listing endpoint not found');
          setBucketImages([]);
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📊 Fetched images:', result);
      
      if (result.success) {
        setBucketImages(result.images);
      } else {
        setBucketImages([]);
      }
    } catch (error) {
      console.error('Failed to fetch bucket images:', error);
      setBucketImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      // Check file size (limit to 5MB for base64)
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Please choose an image smaller than 5MB.');
        return;
      }

      // Convert to base64 and upload via backend
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result.split(',')[1]; // Remove data:image/...;base64, prefix
          
          console.log('📤 Uploading image to:', `${API_BASE_URL}/api/gcs/upload-base64`);
          
          const response = await fetch(`${API_BASE_URL}/api/gcs/upload-base64`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filename: `${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`,
              contentType: file.type,
              base64Data: base64Data
            })
          });

          console.log('📡 Upload response status:', response.status);

          if (!response.ok) {
            if (response.status === 404) {
              throw new Error('Upload endpoint not found. Please check your backend configuration.');
            }
            throw new Error(`Upload failed: ${response.status}`);
          }

          const result = await response.json();
          console.log('✅ Upload result:', result);
          setFormData(prev => ({ ...prev, imageUrl: result.publicUrl }));
          
        } catch (error) {
          console.error('Base64 upload failed:', error);
          alert(`Image upload failed: ${error.message}`);
        }
      };
      
      reader.onerror = () => {
        alert('Failed to read file. Please try again.');
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Image upload failed. Please try again.');
    }
  };

  // Handle selecting existing image
  const handleSelectExistingImage = (imageUrl) => {
    setFormData(prev => ({ ...prev, imageUrl }));
    setShowImageBrowser(false);
  };

  const handleSchedulePost = async () => {
    if (!formData.caption || !formData.scheduledDate || !formData.scheduledTime) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.platform === 'instagram' && !formData.imageUrl) {
      alert('Instagram posts require an image');
      return;
    }

    if (!formData.pageId) {
      alert('Please select a Facebook page');
      return;
    }

    const selectedPage = fbPages.find(page => page.id === formData.pageId);
    if (!selectedPage) {
      alert('Selected page not found. Please refresh and try again.');
      return;
    }

    // Validate Instagram requirements
    if ((formData.platform === 'instagram' || formData.platform === 'both') && 
        !selectedPage.instagram_business_account?.id) {
      alert('Selected page does not have Instagram connected. Please connect Instagram or select Facebook only.');
      return;
    }

    setSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`);
      
      const postData = {
        caption: formData.caption,
        imageUrl: formData.imageUrl,
        platform: formData.platform,
        pageId: formData.pageId,
        pageName: selectedPage.name,
        accessToken: selectedPage.access_token,
        instagramId: formData.platform === 'instagram' || formData.platform === 'both' 
          ? selectedPage.instagram_business_account?.id
          : null,
        scheduledAt: scheduledDateTime.toISOString(),
        timezone: formData.timezone,
        status: 'pending'
      };

      console.log('📝 Scheduling post to:', `${API_BASE_URL}/api/scheduled-posts`);
      console.log('📝 Post data:', {
        ...postData,
        accessToken: '[HIDDEN]'
      });

      const response = await fetch(`${API_BASE_URL}/api/scheduled-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      console.log('📡 Schedule response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Post scheduled successfully:', result);
        alert('Post scheduled successfully!');
        setShowCreateModal(false);
        setFormData({
          caption: '',
          imageUrl: '',
          platform: 'facebook',
          pageId: '',
          instagramId: '',
          scheduledDate: '',
          scheduledTime: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
        fetchScheduledPosts();
      } else {
        if (response.status === 404) {
          throw new Error('Scheduling endpoint not found. Please check your backend configuration.');
        }
        const errorData = await response.json();
        console.error('❌ Failed to schedule post:', errorData);
        throw new Error(errorData.error || 'Failed to schedule post');
      }
    } catch (error) {
      console.error('Schedule post error:', error);
      alert(`Failed to schedule post: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this scheduled post?')) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/scheduled-posts/${postId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setScheduledPosts(prev => prev.filter(post => post._id !== postId));
      } else if (response.status === 404) {
        alert('Post not found or already deleted');
        fetchScheduledPosts(); // Refresh the list
      } else {
        throw new Error(`Delete failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Delete post error:', error);
      alert(`Failed to delete post: ${error.message}`);
    }
  };

  // Add manual trigger function for testing
  const handleManualTrigger = async () => {
    try {
      console.log('🔧 Triggering scheduler at:', `${API_BASE_URL}/api/scheduled-posts/trigger`);
      
      const response = await fetch(`${API_BASE_URL}/api/scheduled-posts/trigger`, {
        method: 'POST'
      });
      
      console.log('📡 Trigger response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Trigger result:', result);
        alert('Scheduler triggered manually! Check console for results.');
        fetchScheduledPosts(); // Refresh the list
      } else if (response.status === 404) {
        alert('Manual trigger endpoint not found. Please check your backend configuration.');
      } else {
        const errorData = await response.json();
        console.error('❌ Trigger failed:', errorData);
        alert(`Failed to trigger scheduler: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Manual trigger error:', error);
      alert(`Failed to trigger scheduler: ${error.message}`);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'published': return 'bg-green-100 text-green-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'published': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const filteredPosts = Array.isArray(scheduledPosts) ? scheduledPosts.filter(post => {
    if (filter === 'all') return true;
    return post.status === filter;
  }) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Scheduled Posts</h1>
                <p className="text-gray-600 mt-1">Schedule and manage your social media posts</p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Schedule Post</span>
            </button>
            
            {/* Add manual trigger button for testing */}
            <button
              onClick={handleManualTrigger}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center space-x-2"
            >
              <Send className="h-4 w-4" />
              <span>Test Scheduler</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Facebook Connection Status */}
        {!fbLoggedIn && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Facebook className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Connect Facebook Account</h3>
                  <p className="text-sm text-gray-600">Connect your Facebook account to schedule posts</p>
                </div>
              </div>
              <button
                onClick={handleFbLogin}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Connect
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter:</span>
          </div>
          {['all', 'pending', 'published', 'failed'].map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                filter === status 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Scheduled Posts Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map(post => (
              <div key={post._id} className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {post.platform === 'facebook' && <Facebook className="h-5 w-5 text-blue-600" />}
                    {post.platform === 'instagram' && <Instagram className="h-5 w-5 text-pink-600" />}
                    {post.platform === 'both' && (
                      <>
                        <Facebook className="h-4 w-4 text-blue-600" />
                        <Instagram className="h-4 w-4 text-pink-600" />
                      </>
                    )}
                    <span className="text-sm font-medium text-gray-600">{post.pageName}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(post.status)}`}>
                    {getStatusIcon(post.status)}
                    <span>{post.status}</span>
                  </span>
                </div>

                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt="Post content"
                    className="w-full h-40 object-cover rounded-lg mb-4"
                  />
                )}

                <p className="text-gray-800 text-sm mb-4 line-clamp-3">
                  {post.caption}
                </p>

                <div className="space-y-2 text-xs text-gray-500 mb-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(post.scheduledAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(post.scheduledAt).toLocaleTimeString()}</span>
                  </div>
                </div>

                {post.status === 'failed' && post.error && (
                  <div className="bg-red-50 border border-red-200 rounded p-2 mb-4">
                    <p className="text-xs text-red-600 font-medium">Error Details:</p>
                    <p className="text-xs text-red-600">{post.error}</p>
                    {post.error.includes('access token') && (
                      <p className="text-xs text-blue-600 mt-1">
                        💡 Try disconnecting and reconnecting your Facebook account
                      </p>
                    )}
                  </div>
                )}

                {/* Show partial success for both platforms */}
                {post.status === 'published' && post.error && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-4">
                    <p className="text-xs text-yellow-700 font-medium">Partial Success:</p>
                    <div className="flex items-center space-x-2 text-xs text-yellow-600 mt-1">
                      {post.facebookPostId ? (
                        <span className="flex items-center space-x-1 text-green-600">
                          <Facebook className="h-3 w-3" />
                          <span>✅ FB: {post.facebookPostId}</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-red-600">
                          <Facebook className="h-3 w-3" />
                          <span>❌ FB Failed</span>
                        </span>
                      )}
                      {post.instagramPostId ? (
                        <span className="flex items-center space-x-1 text-green-600">
                          <Instagram className="h-3 w-3" />
                          <span>✅ IG: {post.instagramPostId}</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-red-600">
                          <Instagram className="h-3 w-3" />
                          <span>❌ IG Failed</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-yellow-600 mt-1 font-mono bg-yellow-100 p-1 rounded">
                      {post.error}
                    </p>
                    {post.error.includes('parameter error') && (
                      <div className="text-xs text-blue-600 mt-2 space-y-1">
                        <p>💡 <strong>Possible fixes:</strong></p>
                        <p>• Check if the Facebook page access token is valid</p>
                        <p>• Verify the image URL is publicly accessible</p>
                        <p>• Try reconnecting your Facebook account</p>
                        <p>• Test posting without an image first</p>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDeletePost(post._id)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredPosts.length === 0 && !loading && (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">No scheduled posts found</p>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Schedule New Post</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <div className="flex space-x-4">
                    {['facebook', 'instagram', 'both'].map(platform => (
                      <label key={platform} className="flex items-center">
                        <input
                          type="radio"
                          name="platform"
                          value={platform}
                          checked={formData.platform === platform}
                          onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {platform === 'facebook' && 'Facebook'}
                          {platform === 'instagram' && 'Instagram'}
                          {platform === 'both' && 'Both'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Page Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Facebook Page</label>
                  <select
                    value={formData.pageId}
                    onChange={(e) => setFormData(prev => ({ ...prev, pageId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select a page</option>
                    {fbPages.map(page => (
                      <option key={page.id} value={page.id}>
                        {page.name}
                        {page.instagram_business_account && ' (Instagram connected)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                  <textarea
                    value={formData.caption}
                    onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Write your post caption..."
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                  <div className="space-y-3">
                    {/* Current image preview */}
                    {formData.imageUrl && (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <img src={formData.imageUrl} alt="Selected" className="max-h-32 mx-auto mb-2" />
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove Image
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Upload options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Upload new image */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) handleImageUpload(file);
                          }}
                          className="hidden"
                        />
                        <Image className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Upload New Image
                        </button>
                        <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                      </div>

                      {/* Browse existing images */}
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                        <Calendar className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                        <button
                          type="button"
                          onClick={() => {
                            setShowImageBrowser(true);
                            fetchBucketImages();
                          }}
                          className="text-green-600 hover:text-green-800 text-sm font-medium"
                        >
                          Browse Existing
                        </button>
                        <p className="text-xs text-gray-500 mt-1">From your library</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={formData.scheduledDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                {/* Timezone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                  <input
                    type="text"
                    value={formData.timezone}
                    readOnly
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedulePost}
                    disabled={submitting || !fbLoggedIn}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>{submitting ? 'Scheduling...' : 'Schedule Post'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Browser Modal */}
      {showImageBrowser && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Select Image from Library</h2>
                <button
                  onClick={() => setShowImageBrowser(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {loadingImages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-2">Loading images...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {bucketImages.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
                      <p>No images found in your library</p>
                      <p className="text-sm">Upload some images first to see them here</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-gray-600 mb-4">
                        Found {bucketImages.length} images in your library
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                        {bucketImages.map((image, index) => (
                          <div
                            key={index}
                            className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => handleSelectExistingImage(image.publicUrl)}
                          >
                            <img
                              src={image.publicUrl}
                              alt={image.name}
                              className="w-full h-32 object-cover"
                            />
                            <div className="p-2 bg-gray-50">
                              <p className="text-xs text-gray-600 truncate" title={image.name}>
                                {image.name.split('/').pop()}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(image.updated).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ScheduledPosts;
