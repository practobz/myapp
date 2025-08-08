import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Eye, MessageSquare, Calendar, User, Palette, Clock, 
  CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Image, FileText, 
  Play, Video, Filter, Search, Facebook, Instagram, Send, Plus, 
  MoreVertical, Edit, Trash2, Users, Grid, List, XCircle, Loader2, Hash,
  Youtube, Twitter, Check, X
} from 'lucide-react';

function AdminContentPortfolio() {
  const navigate = useNavigate();
  
  // Main state
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [allPortfolioItems, setAllPortfolioItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  
  // Comments state
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);
  
  // Customer social accounts from database
  const [customerSocialAccounts, setCustomerSocialAccounts] = useState([]);
  const [loadingSocialAccounts, setLoadingSocialAccounts] = useState(false);
  
  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedContentForSchedule, setSelectedContentForSchedule] = useState(null);
  const [scheduleFormData, setScheduleFormData] = useState({
    caption: '',
    hashtags: '',
    selectedImages: [], // Changed from imageUrl to selectedImages array
    availableImages: [], // All available images from the version
    platform: 'facebook',
    accountId: '',
    pageId: '',
    channelId: '',
    twitterAccountId: '',
    scheduledDate: '',
    scheduledTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [submitting, setSubmitting] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchCustomers();
    fetchAllPortfolioItems();
    fetchAllCustomerSocialAccounts();
  }, []);

  useEffect(() => {
    if (selectedContent && selectedContent.versions && selectedContent.versions[selectedVersionIndex]) {
      setCommentsForVersion(selectedContent.versions[selectedVersionIndex].comments || []);
    } else {
      setCommentsForVersion([]);
    }
  }, [selectedContent, selectedVersionIndex]);

  useEffect(() => {
    const filteredComments = commentsForVersion.filter(comment => {
      const commentMediaIndex = comment.mediaIndex !== undefined ? comment.mediaIndex : 0;
      return commentMediaIndex === selectedMediaIndex;
    });
    setCommentsForCurrentMedia(filteredComments);
  }, [commentsForVersion, selectedMediaIndex]);

  // Fetch all customer social accounts from database
  const fetchAllCustomerSocialAccounts = async () => {
    try {
      setLoadingSocialAccounts(true);
      console.log('📱 Fetching all customer social accounts from database...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/customer-social-links`);
      const data = await response.json();
      
      if (data.success) {
        setCustomerSocialAccounts(data.data || []);
        console.log('✅ Loaded customer social accounts:', data.data?.length || 0);
      } else {
        console.error('❌ Failed to fetch customer social accounts:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching customer social accounts:', error);
    } finally {
      setLoadingSocialAccounts(false);
    }
  };

  // Get available social accounts for a customer
  const getCustomerSocialAccounts = (customerId) => {
    const customerData = customerSocialAccounts.find(c => c.customerId === customerId);
    return customerData ? customerData.socialAccounts : [];
  };

  // Get available pages/accounts for scheduling
  const getAvailableAccountsForPlatform = (customerId, platform) => {
    const accounts = getCustomerSocialAccounts(customerId);
    return accounts.filter(account => account.platform === platform);
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/customers`);
      const data = await response.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchAllPortfolioItems = async () => {
    try {
      setLoading(true);
      const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      const submissions = await submissionsRes.json();

      if (!Array.isArray(submissions)) {
        throw new Error('Invalid data received');
      }

      // Group submissions by customer and assignment ID
      const customerGroups = {};
      submissions.forEach(submission => {
        const customerId = submission.customer_id || submission.customerId || 'unknown';
        const assignmentId = submission.assignment_id || submission.assignmentId || 'unknown';
        
        if (!customerGroups[customerId]) {
          customerGroups[customerId] = {};
        }
        
        if (!customerGroups[customerId][assignmentId]) {
          customerGroups[customerId][assignmentId] = [];
        }
        
        customerGroups[customerId][assignmentId].push(submission);
      });

      // Process each customer's portfolios
      const portfolioData = [];
      Object.keys(customerGroups).forEach(customerId => {
        const customerSubmissions = customerGroups[customerId];
        const customerPortfolios = [];
        
        Object.keys(customerSubmissions).forEach(assignmentId => {
          const versions = customerSubmissions[assignmentId].sort((a, b) =>
            new Date(a.created_at) - new Date(b.created_at)
          );
          const baseItem = versions[0];
          
          customerPortfolios.push({
            id: assignmentId,
            customerId: customerId,
            title: baseItem.caption || 'Untitled Post',
            platform: baseItem.platform || 'Instagram',
            status: getLatestStatus(versions),
            createdDate: baseItem.created_at,
            lastUpdated: versions[versions.length - 1].created_at,
            description: baseItem.notes || '',
            versions: versions.map((version, index) => ({
              id: version._id,
              assignment_id: version.assignment_id,
              versionNumber: index + 1,
              media: normalizeMedia(version.media || version.images || []),
              caption: version.caption || '',
              hashtags: version.hashtags || extractHashtags(version.caption || ''),
              notes: version.notes || '',
              createdAt: version.created_at,
              status: version.status || 'submitted',
              comments: version.comments || []
            })),
            totalVersions: versions.length,
            customerFeedback: getAllFeedback(versions)
          });
        });
        
        portfolioData.push({
          customerId: customerId,
          portfolios: customerPortfolios
        });
      });

      setAllPortfolioItems(portfolioData);
    } catch (error) {
      console.error('Error fetching portfolio items:', error);
      setAllPortfolioItems([]);
    } finally {
      setLoading(false);
    }
  };

  const extractHashtags = (text) => {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const hashtags = text.match(hashtagRegex);
    return hashtags ? hashtags.join(' ') : '';
  };

  const normalizeMedia = (media) => {
    if (!media || !Array.isArray(media)) return [];
    
    return media.map(item => {
      if (typeof item === 'string') {
        return {
          url: item,
          type: getMediaType(item)
        };
      }
      
      if (item && typeof item === 'object') {
        const url = item.url || item.src || item.href || String(item);
        
        if (typeof url === 'string' && url.trim()) {
          return {
            url: url,
            type: item.type || getMediaType(url)
          };
        }
      }
      
      return null;
    }).filter(Boolean);
  };

  const getMediaType = (url) => {
    if (!url || typeof url !== 'string') return 'image';
    
    const extension = url.toLowerCase().split('.').pop();
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
    
    return videoExtensions.includes(extension) ? 'video' : 'image';
  };

  const getLatestStatus = (versions) => {
    const latestVersion = versions[versions.length - 1];
    return latestVersion.status || 'under_review';
  };

  const getAllFeedback = (versions) => {
    const allFeedback = [];
    versions.forEach((version, versionIndex) => {
      if (version.comments && Array.isArray(version.comments)) {
        version.comments.forEach(comment => {
          allFeedback.push({
            ...comment,
            versionNumber: versionIndex + 1,
            timestamp: comment.timestamp || version.created_at
          });
        });
      }
    });
    return allFeedback.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'published':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'revision_requested':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      case 'revision_requested':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    return customer ? customer.name : `Customer ${customerId}`;
  };

  const handleViewContent = (item) => {
    setSelectedContent(item);
    setSelectedVersionIndex(item.versions.length - 1);
    setSelectedMediaIndex(0);
  };

  const handleScheduleContent = (item) => {
    const latestVersion = item.versions[item.versions.length - 1];
    
    // Get all images from the latest version (filter out videos for carousel)
    const availableImages = latestVersion?.media?.filter(media => 
      media.type === 'image' && media.url
    ) || [];
    
    // Extract caption without hashtags
    const captionText = latestVersion.caption || '';
    const hashtagsText = latestVersion.hashtags || extractHashtags(captionText);
    const captionWithoutHashtags = captionText.replace(/#[a-zA-Z0-9_]+/g, '').trim();
    
    setSelectedContentForSchedule(item);
    setScheduleFormData({
      caption: captionWithoutHashtags,
      hashtags: hashtagsText,
      selectedImages: availableImages.length > 0 ? [availableImages[0]] : [], // Select first image by default
      availableImages: availableImages,
      platform: 'facebook',
      accountId: '',
      pageId: '',
      channelId: '',
      twitterAccountId: '',
      scheduledDate: '',
      scheduledTime: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    setShowScheduleModal(true);
  };

  // Toggle image selection for carousel
  const toggleImageSelection = (image) => {
    setScheduleFormData(prev => {
      const isSelected = prev.selectedImages.some(img => img.url === image.url);
      
      if (isSelected) {
        // Remove from selection
        return {
          ...prev,
          selectedImages: prev.selectedImages.filter(img => img.url !== image.url)
        };
      } else {
        // Add to selection (limit to 10 for Instagram/Facebook)
        if (prev.selectedImages.length < 10) {
          return {
            ...prev,
            selectedImages: [...prev.selectedImages, image]
          };
        }
      }
      
      return prev;
    });
  };

  // Select all images for carousel
  const selectAllImages = () => {
    const maxImages = (scheduleFormData.platform === 'instagram' || scheduleFormData.platform === 'facebook') ? 10 : 1;
    const imagesToSelect = scheduleFormData.availableImages.slice(0, maxImages);
    
    setScheduleFormData(prev => ({
      ...prev,
      selectedImages: imagesToSelect
    }));
  };

  // Clear all selected images
  const clearAllImages = () => {
    setScheduleFormData(prev => ({
      ...prev,
      selectedImages: []
    }));
  };

  const handleSchedulePost = async () => {
    if (!scheduleFormData.caption || !scheduleFormData.scheduledDate || !scheduleFormData.scheduledTime) {
      alert('Please fill in all required fields');
      return;
    }

    if (!scheduleFormData.accountId) {
      alert('Please select a social media account');
      return;
    }

    // Platform-specific validation
    if (scheduleFormData.platform === 'facebook' || scheduleFormData.platform === 'instagram') {
      if (!scheduleFormData.pageId) {
        alert('Please select a Facebook page');
        return;
      }
      if (scheduleFormData.platform === 'instagram' && scheduleFormData.selectedImages.length === 0) {
        alert('Instagram requires at least one image');
        return;
      }
    } else if (scheduleFormData.platform === 'youtube') {
      if (!scheduleFormData.channelId) {
        alert('Please select a YouTube channel');
        return;
      }
      if (scheduleFormData.selectedImages.length === 0) {
        alert('Please upload a video for YouTube post');
        return;
      }
    }

    setSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${scheduleFormData.scheduledDate}T${scheduleFormData.scheduledTime}`);
      const fullCaption = scheduleFormData.hashtags 
        ? `${scheduleFormData.caption}\n\n${scheduleFormData.hashtags}`
        : scheduleFormData.caption;

      // Get the selected account details
      const selectedAccount = getCustomerSocialAccounts(selectedContentForSchedule.customerId)
        .find(acc => acc._id === scheduleFormData.accountId);

      if (!selectedAccount) {
        throw new Error('Selected social media account not found');
      }

      // Get page details if needed
      let selectedPage = null;
      if (scheduleFormData.pageId && selectedAccount.pages) {
        selectedPage = selectedAccount.pages.find(page => page.id === scheduleFormData.pageId);
        
        // CRITICAL: Validate page has access token
        if (!selectedPage) {
          throw new Error('Selected page not found in account data.');
        }
        
        if (!selectedPage.accessToken || selectedPage.accessToken.length < 50) {
          throw new Error('Selected page does not have a valid access token. Please reconnect the Facebook account to obtain page access tokens.');
        }
        
        console.log('✅ Using page access token for posting:', {
          pageName: selectedPage.name,
          pageId: selectedPage.id,
          hasToken: !!selectedPage.accessToken,
          tokenLength: selectedPage.accessToken.length,
          tokenType: selectedPage.accessToken.length > 200 ? 'likely-page-token' : 'likely-user-token'
        });
      }

      // Get YouTube channel details if needed
      let selectedChannel = null;
      if (scheduleFormData.channelId && selectedAccount.channels) {
        selectedChannel = selectedAccount.channels.find(channel => channel.id === scheduleFormData.channelId);
        
        if (!selectedChannel) {
          throw new Error('Selected YouTube channel not found in account data.');
        }
        
        if (!selectedAccount.accessToken || selectedAccount.accessToken.length < 50) {
          throw new Error('Selected YouTube account does not have a valid access token. Please reconnect the YouTube account.');
        }
        
        console.log('✅ Using YouTube access token for posting:', {
          channelName: selectedChannel.name,
          channelId: selectedChannel.id,
          hasToken: !!selectedAccount.accessToken,
          tokenLength: selectedAccount.accessToken.length
        });
      }

      const endpoint = `${process.env.REACT_APP_API_URL}/api/scheduled-posts`;
      let postData = {
        caption: fullCaption,
        scheduledAt: scheduledDateTime.toISOString(),
        timezone: scheduleFormData.timezone,
        status: 'pending',
        contentId: selectedContentForSchedule.id,
        customerId: selectedContentForSchedule.customerId,
        platform: scheduleFormData.platform,
        // Account details from database
        accountId: selectedAccount._id,
        platformUserId: selectedAccount.platformUserId,
        accessToken: selectedAccount.accessToken, // User token for reference
        // Multiple images for carousel
        imageUrls: scheduleFormData.selectedImages.map(img => img.url),
        isCarousel: scheduleFormData.selectedImages.length > 1
      };

      if (scheduleFormData.platform === 'facebook' || scheduleFormData.platform === 'instagram') {
        // CRITICAL: Ensure page access token is included
        if (!selectedPage.accessToken) {
          throw new Error('Page access token is required for Facebook/Instagram posting');
        }
        
        Object.assign(postData, {
          imageUrl: scheduleFormData.selectedImages[0]?.url || '', // Keep backward compatibility
          imageUrls: scheduleFormData.selectedImages.map(img => img.url), // Multiple images
          pageId: scheduleFormData.pageId,
          pageName: selectedPage?.name,
          pageAccessToken: selectedPage.accessToken, // This is the critical page token
          instagramId: scheduleFormData.platform === 'instagram' 
            ? selectedPage?.instagramBusinessAccount?.id
            : null,
          isCarousel: scheduleFormData.selectedImages.length > 1
        });
        
        // Extra validation for Instagram
        if (scheduleFormData.platform === 'instagram') {
          if (!selectedPage?.instagramBusinessAccount?.id) {
            throw new Error('Selected page does not have an Instagram Business Account connected.');
          }
        }
        
        // Final validation log
        console.log('📋 Final post data validation:', {
          hasPageAccessToken: !!postData.pageAccessToken,
          pageAccessTokenLength: postData.pageAccessToken?.length,
          pageId: postData.pageId,
          platform: postData.platform,
          imageCount: postData.imageUrls?.length || 0,
          isCarousel: postData.isCarousel
        });
        
      } else if (scheduleFormData.platform === 'youtube') {
        // CRITICAL: Include all required YouTube fields
        Object.assign(postData, {
          videoUrl: scheduleFormData.selectedImages[0]?.url || '', // Keep backward compatibility
          imageUrls: scheduleFormData.selectedImages.map(img => img.url), // For multiple videos (if supported)
          channelId: scheduleFormData.channelId,
          channelName: selectedChannel.name,
          youtubeAccessToken: selectedAccount.accessToken // Use the user access token
        });
        
        // Final validation log for YouTube
        console.log('📋 Final YouTube post data validation:', {
          hasAccessToken: !!postData.youtubeAccessToken,
          accessTokenLength: postData.youtubeAccessToken?.length,
          channelId: postData.channelId,
          channelName: postData.channelName,
          hasVideoUrl: !!postData.videoUrl,
          mediaCount: postData.imageUrls?.length || 0
        });
        
      } else if (scheduleFormData.platform === 'twitter') {
        Object.assign(postData, {
          twitterAccountId: selectedAccount.platformUserId,
          sessionId: selectedAccount.sessionId, // If you store this
          imageUrls: scheduleFormData.selectedImages.map(img => img.url), // Twitter supports up to 4 images
        });
      }

      console.log('📤 Scheduling post with validated data:', {
        platform: postData.platform,
        pageId: postData.pageId,
        channelId: postData.channelId,
        hasPageToken: !!postData.pageAccessToken,
        hasYouTubeToken: !!postData.youtubeAccessToken,
        hasUserToken: !!postData.accessToken,
        scheduledAt: postData.scheduledAt,
        imageCount: postData.imageUrls?.length || 0,
        isCarousel: postData.isCarousel
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        alert(`Post with ${scheduleFormData.selectedImages.length} ${scheduleFormData.selectedImages.length === 1 ? 'image' : 'images'} scheduled successfully!`);
        setShowScheduleModal(false);
        setSelectedContentForSchedule(null);
        setScheduleFormData({
          caption: '',
          hashtags: '',
          selectedImages: [],
          availableImages: [],
          platform: 'facebook',
          accountId: '',
          pageId: '',
          channelId: '',
          twitterAccountId: '',
          scheduledDate: '',
          scheduledTime: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule post');
      }
    } catch (error) {
      console.error('Schedule post error:', error);
      alert(`Failed to schedule post: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Please choose an image smaller than 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result.split(',')[1];
          
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/upload-base64`, {
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

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
          }

          const result = await response.json();
          const newImage = { url: result.publicUrl, type: 'image' };
          
          // Add to available images and select it
          setScheduleFormData(prev => ({
            ...prev,
            availableImages: [...prev.availableImages, newImage],
            selectedImages: [...prev.selectedImages, newImage]
          }));
          
        } catch (error) {
          console.error('Base64 upload failed:', error);
          alert('Image upload failed. Please try again.');
        }
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Image upload failed. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const filteredCustomerPortfolios = allPortfolioItems.filter(customerData => {
    const customer = customers.find(c => c._id === customerData.customerId);
    const customerName = customer ? customer.name : `Customer ${customerData.customerId}`;
    
    if (searchTerm && !customerName.includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (customerFilter !== 'all' && customerData.customerId !== customerFilter) {
      return false;
    }
    
    return true;
  });

  // Helper to detect video URLs
  const isVideoUrl = (url) => {
    if (!url) return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading portfolios...</p>
        </div>
      </div>
    );
  }

   return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => selectedContent ? setSelectedContent(null) : (selectedCustomer ? setSelectedCustomer(null) : navigate('/admin'))}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Admin Content Portfolio
                </span>
                <p className="text-sm text-gray-500">
                  {selectedContent ? 'Content Details' : selectedCustomer ? 'Customer Portfolio' : 'All Customer Portfolios'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Platform Connection Status */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Social Media Accounts</span>
              </div>
              <span className="text-sm text-gray-600">
                Connected via database ({customerSocialAccounts.reduce((total, customer) => total + customer.socialAccounts.length, 0)} total accounts)
              </span>
            </div>
            <button
              onClick={fetchAllCustomerSocialAccounts}
              disabled={loadingSocialAccounts}
              className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {loadingSocialAccounts ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedContent && !selectedCustomer ? (
          // Customer Portfolio Overview
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Customer Content Portfolios
              </h1>
              <p className="text-gray-600 mt-3 text-lg">View and manage all customer content portfolios</p>
            </div>

            {/* Search and Filters */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="under_review">Under Review</option>
                  <option value="revision_requested">Revision Requested</option>
                </select>
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Customers</option>
                  {customers.map(customer => (
                    <option key={customer._id} value={customer._id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Customer Cards */}
            {filteredCustomerPortfolios.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No portfolios found</h3>
                <p className="text-gray-500">No customer portfolios match your current filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCustomerPortfolios.map((customerData) => {
                  const customer = customers.find(c => c._id === customerData.customerId);
                  const customerName = customer ? customer.name : `Customer ${customerData.customerId}`;
                  const totalPortfolios = customerData.portfolios.length;
                  const approvedCount = customerData.portfolios.filter(p => p.status === 'approved').length;
                  const pendingCount = customerData.portfolios.filter(p => p.status === 'under_review').length;
                  
                  return (
                    <div key={customerData.customerId} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group h-[420px] flex flex-col">
                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-white font-bold text-lg">
                                {customerName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{customerName}</h3>
                              <p className="text-sm text-gray-600 truncate">{customer?.email}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{totalPortfolios}</div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
                            <div className="text-xs text-gray-500">Approved</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                            <div className="text-xs text-gray-500">Pending</div>
                          </div>
                        </div>

                        <div className="space-y-2 flex-1 overflow-y-auto">
                          {customerData.portfolios.slice(0, 3).map((portfolio, index) => (
                            <div key={portfolio.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                <span className="text-sm font-medium truncate">{portfolio.title}</span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(portfolio.status)} flex-shrink-0`}>
                                {portfolio.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                          {customerData.portfolios.length > 3 && (
                            <div className="text-center text-sm text-gray-500">
                              +{customerData.portfolios.length - 3} more items
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedCustomer(customerData)}
                          className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-medium transition-all duration-200"
                        >
                          View Portfolio
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : selectedCustomer && !selectedContent ? (
          // Individual Customer Portfolio View
          <div className="space-y-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-2xl">
                      {getCustomerName(selectedCustomer.customerId).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{getCustomerName(selectedCustomer.customerId)}</h1>
                    <p className="text-gray-600">Content Portfolio ({selectedCustomer.portfolios.length} items)</p>
                  </div>
                </div>
              </div>
            </div>

            {selectedCustomer.portfolios.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No content created yet</h3>
                <p className="text-gray-500">This customer doesn't have any content in their portfolio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {selectedCustomer.portfolios.map((item) => {
                  const latestVersion = item.versions[item.versions.length - 1];
                  const firstMedia = latestVersion?.media?.[0];
                  
                  return (
                    <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group h-[500px] flex flex-col">
                      {/* Content Preview */}
                      <div className="relative h-48 flex-shrink-0">
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          isVideoUrl(firstMedia.url) ? (
                            <div className="relative w-full h-full">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                controls
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          ) : (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          )
                        ) : null}
                        
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
                          </span>
                        </div>
                        
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                            <Image className="h-3 w-3 mr-1" />
                            {item.totalVersions} Version{item.totalVersions !== 1 ? 's' : ''}
                          </span>
                          {latestVersion?.media && latestVersion.media.length > 1 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                              {latestVersion.media.length} Media
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content Details */}
                      <div className="p-6 flex-1 flex flex-col">
                        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">{item.description}</p>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Platform: {item.platform}</span>
                            <span className="text-gray-500">
                              Updated: {formatDate(item.lastUpdated)}
                            </span>
                          </div>

                          {item.customerFeedback.length > 0 && (
                            <div className="flex items-center text-sm text-blue-600">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              {item.customerFeedback.length} Comment{item.customerFeedback.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-auto">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleScheduleContent(item)}
                            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Schedule
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // Individual Content Detail View
          <div className="space-y-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedContent.title}</h1>
                  <p className="text-gray-600 mb-4">{selectedContent.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Customer</span>
                        <p className="text-sm text-gray-900 font-semibold">{getCustomerName(selectedContent.customerId)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Platform</span>
                        <p className="text-sm text-gray-900">{selectedContent.platform}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Total Versions</span>
                        <p className="text-sm text-gray-900">{selectedContent.totalVersions}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(selectedContent.status)}`}>
                    {getStatusIcon(selectedContent.status)}
                    <span className="ml-2">{selectedContent.status.replace('_', ' ').toUpperCase()}</span>
                  </span>
                  
                  <button
                    onClick={() => handleScheduleContent(selectedContent)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Schedule Post
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Version Display */}
              <div className="xl:col-span-2">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        <Image className="h-5 w-5 text-purple-600 mr-2" />
                        Version {selectedContent.versions[selectedVersionIndex]?.versionNumber}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          of {selectedContent.totalVersions}
                        </span>
                      </h3>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            if (selectedVersionIndex > 0) {
                              setSelectedVersionIndex(selectedVersionIndex - 1);
                              setSelectedMediaIndex(0);
                            }
                          }}
                          disabled={selectedVersionIndex === 0}
                          className="p-2 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (selectedVersionIndex < selectedContent.versions.length - 1) {
                              setSelectedVersionIndex(selectedVersionIndex + 1);
                              setSelectedMediaIndex(0);
                            }
                          }}
                          disabled={selectedVersionIndex === selectedContent.versions.length - 1}
                          className="p-2 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {selectedContent.versions[selectedVersionIndex] && (
                      <div className="space-y-6">
                        {/* Media Display */}
                        <div className="text-center">
                          {selectedContent.versions[selectedVersionIndex].media && selectedContent.versions[selectedVersionIndex].media.length > 0 ? (
                            <div className="relative">
                              {/* Media Navigation for multiple items */}
                              {selectedContent.versions[selectedVersionIndex].media.length > 1 && (
                                <div className="flex items-center justify-between mb-4">
                                  <span className="text-sm text-gray-500">
                                    {selectedMediaIndex + 1} of {selectedContent.versions[selectedVersionIndex].media.length}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        if (selectedMediaIndex > 0) {
                                          setSelectedMediaIndex(selectedMediaIndex - 1);
                                        }
                                      }}
                                      disabled={selectedMediaIndex === 0}
                                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (selectedMediaIndex < selectedContent.versions[selectedVersionIndex].media.length - 1) {
                                          setSelectedMediaIndex(selectedMediaIndex + 1);
                                        }
                                      }}
                                      disabled={selectedMediaIndex === selectedContent.versions[selectedVersionIndex].media.length - 1}
                                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Current Media Item */}
                              {selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex] && 
                               selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url &&
                               typeof selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url === 'string' ? (
                                isVideoUrl(selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url) ? (
                                  <video
                                    src={selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url}
                                    controls
                                    className="max-w-full h-auto max-h-96 mx-auto rounded-xl shadow-lg border border-gray-200"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url}
                                    alt={`Version ${selectedContent.versions[selectedVersionIndex].versionNumber} - Media ${selectedMediaIndex + 1}`}
                                    className="max-w-full h-auto max-h-96 mx-auto rounded-xl shadow-lg border border-gray-200"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                )
                              ) : null}
                              
                              {/* Fallback for invalid/missing media */}
                              <div 
                                className="max-w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center"
                                style={{ 
                                  display: (selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex]?.url && 
                                           typeof selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url === 'string') 
                                    ? 'none' : 'flex' 
                                }}
                              >
                                <div className="text-center">
                                  <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                  <p className="text-gray-500">Media unavailable</p>
                                </div>
                              </div>

                              {/* Comment Markers */}
                              {commentsForCurrentMedia.map((comment, index) => {
                                let boxLeft = 40;
                                let boxRight = "auto";
                                const mediaElement = document.querySelector(`img[alt*="Version ${selectedContent.versions[selectedVersionIndex].versionNumber}"], video`);
                                if (mediaElement && mediaElement.width && (comment.x || comment.position?.x) > mediaElement.width / 2) {
                                  boxLeft = "auto";
                                  boxRight = 40;
                                }

                                const commentX = comment.x || comment.position?.x || 0;
                                const commentY = comment.y || comment.position?.y || 0;

                                return (
                                  <div
                                    key={comment.id}
                                    style={{
                                      position: "absolute",
                                      top: commentY - 16,
                                      left: commentX - 16,
                                      width: 32,
                                      height: 32,
                                      background: comment.done ? "#10b981" : "#ef4444",
                                      color: "#fff",
                                      borderRadius: "50%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: "bold",
                                      fontSize: "14px",
                                      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                                      cursor: "pointer",
                                      zIndex: 2,
                                      border: "3px solid #fff",
                                      transition: "all 0.3s",
                                    }}
                                    onMouseEnter={() => setHoveredComment(comment.id)}
                                    onMouseLeave={() => setHoveredComment(null)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveComment(activeComment === comment.id ? null : comment.id);
                                    }}
                                  >
                                    {index + 1}
                                    
                                    {/* Floating Comment Box */}
                                    {(activeComment === comment.id || hoveredComment === comment.id) && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          left: boxLeft,
                                          right: boxRight,
                                          top: "50%",
                                          transform: "translateY(-50%)",
                                          background: "#fff",
                                          border: "2px solid #3b82f6",
                                          borderRadius: "12px",
                                          padding: "16px",
                                          minWidth: "280px",
                                          maxWidth: "320px",
                                          zIndex: 10,
                                          boxShadow: "0 8px 32px rgba(59,130,246,0.2)",
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="mb-3">
                                          <p className="font-semibold text-gray-900 text-sm leading-relaxed break-words">
                                            {comment.message || comment.comment}
                                            {comment.done && <span className="text-green-600 ml-2">✓ Done</span>}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="max-w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center">
                              <div className="text-center">
                                <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-500">No media available</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-gray-900">{selectedContent.versions[selectedVersionIndex].caption || 'No caption'}</p>
                            </div>
                          </div>

                          {selectedContent.versions[selectedVersionIndex].hashtags && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                              <div className="bg-gray-50 rounded-lg p-4">
                                <p className="text-gray-900">{selectedContent.versions[selectedVersionIndex].hashtags}</p>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-gray-900">{selectedContent.versions[selectedVersionIndex].notes || 'No notes'}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>Created: {formatDate(selectedContent.versions[selectedVersionIndex].createdAt)}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedContent.versions[selectedVersionIndex].status)}`}>
                              {selectedContent.versions[selectedVersionIndex].status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Version History and Comments */}
              <div className="space-y-6">
                {/* Version History Panel */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-green-50 to-emerald-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <FileText className="h-5 w-5 text-green-600 mr-2" />
                      Version History
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-0">
                    <div className="divide-y divide-gray-100">
                      {selectedContent.versions.map((version, index) => {
                        const versionDate = new Date(version.createdAt);
                        const formattedDate = versionDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        return (
                          <button
                            key={version.id}
                            onClick={() => {
                              setSelectedVersionIndex(index);
                              setSelectedMediaIndex(0);
                            }}
                            className={`w-full text-left px-6 py-4 flex flex-col border-l-4 transition-all duration-200 hover:bg-gray-50 ${
                              selectedVersionIndex === index
                                ? "bg-purple-50 border-l-purple-600"
                                : "bg-white border-l-transparent"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900 text-base">
                                Version {version.versionNumber}
                              </span>
                              {selectedVersionIndex === index && (
                                <span className="ml-2 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex items-center mt-1 text-xs text-gray-500 gap-2">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formattedDate}
                              </span>
                              {version.media && version.media.length > 0 && (
                                <span className="flex items-center ml-2">
                                  <Image className="h-3 w-3 mr-1" />
                                  {version.media.length} media
                                </span>
                              )}
                              {version.comments && version.comments.length > 0 && (
                                <span className="flex items-center ml-2">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  {version.comments.length} comments
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Comments for selected version */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-purple-50 to-pink-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <MessageSquare className="h-5 w-5 text-purple-600 mr-2" />
                      Comments for Version {selectedContent.versions[selectedVersionIndex]?.versionNumber} - Media {selectedMediaIndex + 1} ({commentsForCurrentMedia.length})
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-4">
                    {commentsForCurrentMedia.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <MessageSquare className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm">No comments for this media item</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {commentsForCurrentMedia.map((comment, idx) => (
                          <div key={comment.id || idx} className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                            activeComment === comment.id
                              ? 'bg-blue-50 border-blue-200 shadow-md'
                              : 'bg-gray-50 hover:bg-gray-100/50 border-gray-200 hover:border-gray-300/50'
                          }`} onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}>
                            <div className="flex items-start space-x-3">
                              <span className="font-bold text-purple-600 bg-purple-100 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 break-words">
                                  {comment.message || comment.comment}
                                  {comment.done && (
                                    <span className="ml-2 text-green-600 text-xs font-semibold">✓ Done</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Position: ({Math.round(comment.x || comment.position?.x || 0)}, {Math.round(comment.y || comment.position?.y || 0)})
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Post Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Schedule Post</h2>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="platform"
                        value="facebook"
                        checked={scheduleFormData.platform === 'facebook'}
                        onChange={(e) => setScheduleFormData(prev => ({ 
                          ...prev, 
                          platform: e.target.value,
                          accountId: '',
                          pageId: ''
                        }))}
                        className="mr-2"
                      />
                      <Facebook className="h-4 w-4 text-blue-600 mr-2" />
                      <span className="text-sm">Facebook</span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="platform"
                        value="instagram"
                        checked={scheduleFormData.platform === 'instagram'}
                        onChange={(e) => setScheduleFormData(prev => ({ 
                          ...prev, 
                          platform: e.target.value,
                          accountId: '',
                          pageId: ''
                        }))}
                        className="mr-2"
                      />
                      <Instagram className="h-4 w-4 text-pink-600 mr-2" />
                      <span className="text-sm">Instagram</span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="platform"
                        value="youtube"
                        checked={scheduleFormData.platform === 'youtube'}
                        onChange={(e) => setScheduleFormData(prev => ({ 
                          ...prev, 
                          platform: e.target.value,
                          accountId: '',
                          channelId: ''
                        }))}
                        className="mr-2"
                      />
                      <Youtube className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-sm">YouTube</span>
                    </label>
                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="platform"
                        value="twitter"
                        checked={scheduleFormData.platform === 'twitter'}
                        onChange={(e) => setScheduleFormData(prev => ({ 
                          ...prev, 
                          platform: e.target.value,
                          accountId: ''
                        }))}
                        className="mr-2"
                      />
                      <Twitter className="h-4 w-4 text-blue-400 mr-2" />
                      <span className="text-sm">Twitter</span>
                    </label>
                  </div>
                </div>

                {/* Account Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select {scheduleFormData.platform} Account
                  </label>
                  <select
                    value={scheduleFormData.accountId}
                    onChange={(e) => setScheduleFormData(prev => ({ 
                      ...prev, 
                      accountId: e.target.value,
                      pageId: '' // Reset page selection when account changes
                    }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value="">Select an account</option>
                    {getAvailableAccountsForPlatform(selectedContentForSchedule?.customerId, scheduleFormData.platform).map(account => (
                      <option key={account._id} value={account._id}>
                        {account.name} ({account.platform})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Page Selection for Facebook/Instagram */}
                {(scheduleFormData.platform === 'facebook' || scheduleFormData.platform === 'instagram') && scheduleFormData.accountId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Page
                    </label>
                    <select
                      value={scheduleFormData.pageId}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, pageId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">Select a page</option>
                      {(() => {
                        const selectedAccount = getCustomerSocialAccounts(selectedContentForSchedule?.customerId)
                          .find(acc => acc._id === scheduleFormData.accountId);
                        return selectedAccount?.pages?.map(page => (
                          <option key={page.id} value={page.id}>
                            {page.name}
                            {!page.accessToken && ' (⚠️ No token)'}
                            {scheduleFormData.platform === 'instagram' && !page.instagramBusinessAccount && ' (No Instagram)'}
                          </option>
                        )) || [];
                      })()}
                    </select>
                  </div>
                )}

                {/* Channel Selection for YouTube */}
                {scheduleFormData.platform === 'youtube' && scheduleFormData.accountId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Channel
                    </label>
                    <select
                      value={scheduleFormData.channelId}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, channelId: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="">Select a channel</option>
                      {(() => {
                        const selectedAccount = getCustomerSocialAccounts(selectedContentForSchedule?.customerId)
                          .find(acc => acc._id === scheduleFormData.accountId);
                        return selectedAccount?.channels?.map(channel => (
                          <option key={channel.id} value={channel.id}>
                            {channel.name}
                            {!selectedAccount.accessToken && ' (⚠️ No token)'}
                          </option>
                        )) || [];
                      })()}
                    </select>
                  </div>
                )}

                {/* Caption */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                  <textarea
                    value={scheduleFormData.caption}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, caption: e.target.value }))}
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Write your post caption..."
                  />
                </div>

                {/* Hashtags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <Hash className="h-4 w-4 mr-1" />
                    Hashtags
                  </label>
                  <textarea
                    value={scheduleFormData.hashtags}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, hashtags: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="#example #hashtags #social"
                  />
                </div>

                {/* Media Selection for Carousel (for platforms that support it) */}
                {(scheduleFormData.platform === 'facebook' || 
                  scheduleFormData.platform === 'instagram' || 
                  scheduleFormData.platform === 'youtube') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {scheduleFormData.platform === 'youtube' ? 'Video' : 'Images'}
                      {(scheduleFormData.platform === 'youtube' || scheduleFormData.platform === 'instagram') && <span className="text-red-500">*</span>}
                      {(scheduleFormData.platform === 'facebook' || scheduleFormData.platform === 'instagram') && 
                        scheduleFormData.availableImages.length > 1 && (
                        <span className="text-sm text-gray-500 ml-2">
                          (Carousel supported - up to 10 images)
                        </span>
                      )}
                    </label>
                    
                    {/* Available Images from Version */}
                    {scheduleFormData.availableImages.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">
                            Available Images from Content ({scheduleFormData.availableImages.length})
                          </span>
                          <div className="flex gap-2">
                            {scheduleFormData.availableImages.length > 1 && (
                              <button
                                type="button"
                                onClick={selectAllImages}
                                className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                Select All
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={clearAllImages}
                              className="text-xs px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {scheduleFormData.availableImages.map((image, index) => {
                            const isSelected = scheduleFormData.selectedImages.some(img => img.url === image.url);
                            
                            return (
                              <div 
                                key={`${image.url}-${index}`}
                                className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? 'border-blue-500 shadow-lg ring-2 ring-blue-200' 
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                                onClick={() => toggleImageSelection(image)}
                              >
                                <img 
                                  src={image.url} 
                                  alt={`Available image ${index + 1}`}
                                  className="w-full h-24 object-cover"
                                />
                                
                                {/* Selection Indicator */}
                                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${
                                  isSelected 
                                    ? 'bg-blue-500 text-white' 
                                    : 'bg-white border-2 border-gray-300'
                                }`}>
                                  {isSelected ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <span className="text-xs">{index + 1}</span>
                                  )}
                                </div>
                                
                                {/* Selection Order */}
                                {isSelected && (
                                  <div className="absolute top-2 left-2 bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                                    {scheduleFormData.selectedImages.findIndex(img => img.url === image.url) + 1}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {scheduleFormData.selectedImages.length > 0 && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-blue-800">
                                {scheduleFormData.selectedImages.length} image{scheduleFormData.selectedImages.length !== 1 ? 's' : ''} selected
                                {scheduleFormData.selectedImages.length > 1 && ' (Carousel post)'}
                              </span>
                              {scheduleFormData.platform === 'instagram' && scheduleFormData.selectedImages.length > 10 && (
                                <span className="text-xs text-red-600">
                                  Instagram allows max 10 images
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Additional Image Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={scheduleFormData.platform === 'youtube' ? "video/*" : "image/*"}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleImageUpload(file);
                        }}
                        className="hidden"
                      />
                      {scheduleFormData.platform === 'youtube' ? (
                        <Video className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                      ) : (
                        <Image className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Upload Additional {scheduleFormData.platform === 'youtube' ? 'Video' : 'Image'}
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                    </div>
                  </div>
                )}

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={scheduleFormData.scheduledDate}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={scheduleFormData.scheduledTime}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedulePost}
                    disabled={submitting}
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
    </div>
  );
}

export default AdminContentPortfolio;