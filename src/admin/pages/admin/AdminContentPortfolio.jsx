import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Eye, MessageSquare, Calendar, User, Palette, Clock, 
  CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Image, FileText, 
  Play, Video, Filter, Search, Facebook, Instagram, Send, Plus, 
  MoreVertical, Edit, Trash2, Users, Grid, List, XCircle, Loader2, Hash,
  Youtube, Linkedin, Check, X, Zap, Settings, RefreshCw
} from 'lucide-react';

import SocialIntegrations from '../../../customer/Integration/SocialIntegrations';

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
    selectedImages: [],
    availableImages: [],
    platforms: [], // Changed from platform to platforms (array)
    platformSettings: {}, // Store platform-specific settings
    scheduledDate: '',
    scheduledTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [submitting, setSubmitting] = useState(false);
  const [isPostingNow, setIsPostingNow] = useState(false);
  
  // Integration modal state
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [integrationPlatform, setIntegrationPlatform] = useState(null);
  const [integrationCustomer, setIntegrationCustomer] = useState(null);
  
  const fileInputRef = useRef(null);

  // New state for scheduled posts
  const [scheduledPosts, setScheduledPosts] = useState([]);

  useEffect(() => {
    fetchCustomers();
    fetchAllPortfolioItems();
    fetchAllCustomerSocialAccounts();
    fetchScheduledPosts(); // fetch scheduled posts on mount
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

  // Fetch scheduled posts from backend
  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
      if (!response.ok) return setScheduledPosts([]);
      const data = await response.json();
      setScheduledPosts(Array.isArray(data) ? data : []);
    } catch {
      setScheduledPosts([]);
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

  // Check if customer has any accounts for a platform
  const hasAccountsForPlatform = (customerId, platform) => {
    const accounts = getAvailableAccountsForPlatform(customerId, platform);
    return accounts.length > 0;
  };

  // Handle integration success
  const handleIntegrationSuccess = () => {
    console.log('🎉 Integration successful, refreshing social accounts...');
    // Refresh social accounts data
    fetchAllCustomerSocialAccounts();
    // Close integration modal after a short delay
    setTimeout(() => {
      setShowIntegrationModal(false);
      setIntegrationPlatform(null);
      setIntegrationCustomer(null);
    }, 3000);
  };

  // Show integration modal for a specific platform and customer
  const showIntegration = (platform, customerId, customerName) => {
    setIntegrationPlatform(platform);
    setIntegrationCustomer({ id: customerId, name: customerName });
    setShowIntegrationModal(true);
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
    
    // Get all media from the latest version
    const availableMedia = latestVersion?.media?.filter(media => 
      media.url && typeof media.url === 'string'
    ) || [];
    
    // Extract caption without hashtags
    const captionText = latestVersion.caption || '';
    const hashtagsText = latestVersion.hashtags || extractHashtags(captionText);
    const captionWithoutHashtags = captionText.replace(/#[a-zA-Z0-9_]+/g, '').trim();
    
    setSelectedContentForSchedule(item);
    setScheduleFormData({
      caption: captionWithoutHashtags,
      hashtags: hashtagsText,
      selectedImages: availableMedia.length > 0 ? [availableMedia[0]] : [],
      availableImages: availableMedia,
      platforms: [], // Initialize as empty array
      platformSettings: {}, // Initialize platform-specific settings
      scheduledDate: '',
      scheduledTime: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    setShowScheduleModal(true);
  };

  // Handle platform selection (checkbox)
  const handlePlatformToggle = (platform) => {
    if (!selectedContentForSchedule) return;
    
    setScheduleFormData(prev => {
      const currentPlatforms = [...prev.platforms];
      const platformIndex = currentPlatforms.indexOf(platform);
      
      if (platformIndex > -1) {
        // Remove platform
        currentPlatforms.splice(platformIndex, 1);
        const newPlatformSettings = { ...prev.platformSettings };
        delete newPlatformSettings[platform];
        
        return {
          ...prev,
          platforms: currentPlatforms,
          platformSettings: newPlatformSettings
        };
      } else {
        // Add platform
        currentPlatforms.push(platform);
        const newPlatformSettings = {
          ...prev.platformSettings,
          [platform]: {
            accountId: '',
            pageId: '',
            channelId: '',
            linkedinAccountId: ''
          }
        };
        
        return {
          ...prev,
          platforms: currentPlatforms,
          platformSettings: newPlatformSettings
        };
      }
    });
  };

  // Update platform-specific settings
  const updatePlatformSetting = (platform, key, value) => {
    setScheduleFormData(prev => ({
      ...prev,
      platformSettings: {
        ...prev.platformSettings,
        [platform]: {
          ...prev.platformSettings[platform],
          [key]: value
        }
      }
    }));
  };

  // Toggle image/video selection for carousel
  const toggleImageSelection = (media) => {
    setScheduleFormData(prev => {
      const isSelected = prev.selectedImages.some(item => item.url === media.url);
      
      if (isSelected) {
        // Remove from selection
        return {
          ...prev,
          selectedImages: prev.selectedImages.filter(item => item.url !== media.url)
        };
      } else {
        // Add to selection (limit to 10 for Instagram/Facebook, 1 for YouTube)
        const hasYoutube = prev.platforms.includes('youtube');
        const maxItems = hasYoutube ? 1 : 10;
        if (prev.selectedImages.length < maxItems) {
          return {
            ...prev,
            selectedImages: [...prev.selectedImages, media]
          };
        }
      }
      
      return prev;
    });
  };

  // Select all media for carousel
  const selectAllImages = () => {
    const hasYoutube = scheduleFormData.platforms.includes('youtube');
    const maxImages = hasYoutube ? 1 : 10;
    const mediaToSelect = scheduleFormData.availableImages.slice(0, maxImages);
    
    setScheduleFormData(prev => ({
      ...prev,
      selectedImages: mediaToSelect
    }));
  };

  // Clear all selected media
  const clearAllImages = () => {
    setScheduleFormData(prev => ({
      ...prev,
      selectedImages: []
    }));
  };

  // Common validation function for both schedule and post now
  const validatePostData = (isScheduled = true) => {
    if (!scheduleFormData.caption) {
      alert('Please enter a caption');
      return false;
    }

    if (scheduleFormData.platforms.length === 0) {
      alert('Please select at least one platform');
      return false;
    }

    // Validate each selected platform
    for (const platform of scheduleFormData.platforms) {
      const settings = scheduleFormData.platformSettings[platform];
      
      if (!settings?.accountId) {
        alert(`Please select a ${platform} account`);
        return false;
      }

      // Platform-specific validation
      if (platform === 'facebook' || platform === 'instagram') {
        if (!settings.pageId) {
          alert(`Please select a ${platform} page`);
          return false;
        }
        if (platform === 'instagram' && scheduleFormData.selectedImages.length === 0) {
          alert('Instagram requires at least one image');
          return false;
        }
      } else if (platform === 'youtube') {
        if (!settings.channelId) {
          alert('Please select a YouTube channel');
          return false;
        }
        if (scheduleFormData.selectedImages.length === 0) {
          alert('Please upload a video for YouTube post');
          return false;
        }
      }
    }

    // YouTube restriction for multiple images
    if (scheduleFormData.platforms.includes('youtube') && scheduleFormData.selectedImages.length > 1) {
      alert('YouTube only supports single video posts');
      return false;
    }

    // LinkedIn supports both text and images
    if (scheduleFormData.platforms.includes('linkedin') && !scheduleFormData.caption && scheduleFormData.selectedImages.length === 0) {
      alert('LinkedIn requires either text content or images');
      return false;
    }

    // Only validate date/time for scheduled posts
    if (isScheduled && (!scheduleFormData.scheduledDate || !scheduleFormData.scheduledTime)) {
      alert('Please select a date and time for scheduling');
      return false;
    }

    return true;
  };

  // Create post data object for multiple platforms
  const createPostsData = (isScheduled = true) => {
    const fullCaption = scheduleFormData.hashtags 
      ? `${scheduleFormData.caption}\n\n${scheduleFormData.hashtags}`
      : scheduleFormData.caption;

    const postsData = [];

    for (const platform of scheduleFormData.platforms) {
      const settings = scheduleFormData.platformSettings[platform];
      
      // Get the selected account details
      const selectedAccount = getCustomerSocialAccounts(selectedContentForSchedule.customerId)
        .find(acc => acc._id === settings.accountId);

      if (!selectedAccount) {
        throw new Error(`Selected ${platform} account not found`);
      }

      let postData = {
        caption: fullCaption,
        status: isScheduled ? 'pending' : 'publishing',
        contentId: selectedContentForSchedule.id,
        customerId: selectedContentForSchedule.customerId,
        platform: platform,
        accountId: selectedAccount._id,
        platformUserId: selectedAccount.platformUserId,
        accessToken: selectedAccount.accessToken,
        imageUrls: scheduleFormData.selectedImages.map(item => item.url),
        isCarousel: scheduleFormData.selectedImages.length > 1 && platform !== 'youtube',
        timezone: scheduleFormData.timezone
      };

      // Add scheduled time
      if (isScheduled) {
        const scheduledDateTime = new Date(`${scheduleFormData.scheduledDate}T${scheduleFormData.scheduledTime}`);
        postData.scheduledAt = scheduledDateTime.toISOString();
      } else {
        postData.scheduledAt = new Date().toISOString();
        postData.publishImmediately = true;
      }

      // Platform-specific settings
      if (platform === 'facebook' || platform === 'instagram') {
        const selectedPage = selectedAccount.pages?.find(page => page.id === settings.pageId);
        
        if (!selectedPage) {
          throw new Error(`Selected ${platform} page not found`);
        }
        
        if (!selectedPage.accessToken || selectedPage.accessToken.length < 50) {
          throw new Error(`Selected ${platform} page does not have a valid access token`);
        }

        Object.assign(postData, {
          imageUrl: scheduleFormData.selectedImages[0]?.url || '',
          pageId: settings.pageId,
          pageName: selectedPage.name,
          pageAccessToken: selectedPage.accessToken,
          instagramId: platform === 'instagram' 
            ? selectedPage.instagramBusinessAccount?.id
            : null,
        });
        
        if (platform === 'instagram') {
          if (!selectedPage.instagramBusinessAccount?.id) {
            throw new Error('Selected page does not have an Instagram Business Account connected');
          }
        }
      } else if (platform === 'youtube') {
        const selectedChannel = selectedAccount.channels?.find(channel => channel.id === settings.channelId);
        
        if (!selectedChannel) {
          throw new Error('Selected YouTube channel not found');
        }

        Object.assign(postData, {
          videoUrl: scheduleFormData.selectedImages[0]?.url || '',
          channelId: settings.channelId,
          channelName: selectedChannel.name,
          youtubeAccessToken: selectedAccount.accessToken
        });
      } else if (platform === 'linkedin') {
        Object.assign(postData, {
          linkedinAccountId: selectedAccount.platformUserId,
          linkedinAccessToken: selectedAccount.accessToken,
        });
      }

      postsData.push(postData);
    }

    return postsData;
  };

  const handleSchedulePost = async () => {
    if (!validatePostData(true)) return;

    setSubmitting(true);
    try {
      const postsData = createPostsData(true);
      const results = [];
      const errors = [];

      // Schedule posts for each platform
      for (const postData of postsData) {
        try {
          const endpoint = `${process.env.REACT_APP_API_URL}/api/scheduled-posts`;

          console.log(`📤 Scheduling ${postData.platform} post:`, {
            platform: postData.platform,
            scheduledAt: postData.scheduledAt,
            mediaCount: postData.imageUrls?.length || 0,
            isCarousel: postData.isCarousel
          });

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
          });

          if (response.ok) {
            results.push(`✅ ${postData.platform}: Scheduled successfully`);
          } else {
            const errorData = await response.json();
            errors.push(`❌ ${postData.platform}: ${errorData.error || 'Failed to schedule'}`);
          }
        } catch (error) {
          errors.push(`❌ ${postData.platform}: ${error.message}`);
        }
      }

      // Show combined results
      let message = '';
      if (results.length > 0) {
        message += results.join('\n') + '\n';
      }
      if (errors.length > 0) {
        message += '\nErrors:\n' + errors.join('\n');
      }

      alert(message || 'All posts scheduled successfully!');
      
      if (results.length > 0) {
        closeModal();
      }
    } catch (error) {
      console.error('Schedule posts error:', error);
      alert(`Failed to schedule posts: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostNow = async () => {
    if (!validatePostData(false)) return;

    setIsPostingNow(true);
    try {
      const postsData = createPostsData(false);
      const results = [];
      const errors = [];

      // Post to each platform immediately
      for (const postData of postsData) {
        try {
          const endpoint = `${process.env.REACT_APP_API_URL}/api/immediate-posts`;

          console.log(`⚡ Posting to ${postData.platform} immediately:`, {
            platform: postData.platform,
            mediaCount: postData.imageUrls?.length || 0,
            isCarousel: postData.isCarousel
          });

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
          });

          const result = await response.json();
          
          if (response.ok) {
            let successMsg = `✅ ${postData.platform}: Posted successfully`;
            if (result.facebookPostId) successMsg += ` (ID: ${result.facebookPostId})`;
            if (result.instagramPostId) successMsg += ` (ID: ${result.instagramPostId})`;
            if (result.youtubePostId) successMsg += ` (ID: ${result.youtubePostId})`;
            if (result.linkedinPostId) successMsg += ` (ID: ${result.linkedinPostId})`;
            
            results.push(successMsg);

            // --- Update status to 'published' in local state ---
            setAllPortfolioItems(prevItems => {
              return prevItems.map(customerData => {
                if (customerData.customerId !== selectedContentForSchedule.customerId) return customerData;
                return {
                  ...customerData,
                  portfolios: customerData.portfolios.map(portfolio => {
                    if (portfolio.id !== selectedContentForSchedule.id) return portfolio;
                    // Update status for portfolio and latest version
                    const updatedVersions = portfolio.versions.map((v, idx) =>
                      idx === portfolio.versions.length - 1
                        ? { ...v, status: 'published' }
                        : v
                    );
                    return {
                      ...portfolio,
                      status: 'published',
                      versions: updatedVersions
                    };
                  })
                };
              });
            });

            // If viewing a specific content, update its status too
            if (selectedContent && selectedContent.id === selectedContentForSchedule.id) {
              setSelectedContent(prev => {
                if (!prev) return prev;
                const updatedVersions = prev.versions.map((v, idx) =>
                  idx === prev.versions.length - 1
                    ? { ...v, status: 'published' }
                    : v
                );
                return {
                  ...prev,
                  status: 'published',
                  versions: updatedVersions
                };
              });
            }

            // If viewing a customer, update their portfolio status
            if (selectedCustomer && selectedCustomer.customerId === selectedContentForSchedule.customerId) {
              setSelectedCustomer(prev => ({
                ...prev,
                portfolios: prev.portfolios.map(portfolio =>
                  portfolio.id === selectedContentForSchedule.id
                    ? { ...portfolio, status: 'published', versions: portfolio.versions.map((v, idx) =>
                        idx === portfolio.versions.length - 1
                          ? { ...v, status: 'published' }
                          : v
                      ) }
                    : portfolio
                )
              }));
            }
            // --- end status update ---
          } else {
            errors.push(`❌ ${postData.platform}: ${result.error || 'Failed to post'}`);
          }
        } catch (error) {
          errors.push(`❌ ${postData.platform}: ${error.message}`);
        }
      }

      // Show combined results
      let message = '';
      if (results.length > 0) {
        message += 'Successfully posted:\n' + results.join('\n') + '\n';
      }
      if (errors.length > 0) {
        message += '\nErrors:\n' + errors.join('\n');
      }

      alert(message || 'All posts published successfully!');
      
      if (results.length > 0) {
        closeModal();
      }
    } catch (error) {
      console.error('Post now error:', error);
      alert(`Failed to publish posts: ${error.message}`);
    } finally {
      setIsPostingNow(false);
    }
  };

  const closeModal = () => {
    setShowScheduleModal(false);
    setSelectedContentForSchedule(null);
    setScheduleFormData({
      caption: '',
      hashtags: '',
      selectedImages: [],
      availableImages: [],
      platforms: [],
      platformSettings: {},
      scheduledDate: '',
      scheduledTime: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

  const handleImageUpload = async (file) => {
    try {
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Please choose a file smaller than 5MB.');
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
          const newMedia = { 
            url: result.publicUrl, 
            type: file.type.startsWith('video/') ? 'video' : 'image'
          };
          
          // Add to available images and select it
          setScheduleFormData(prev => ({
            ...prev,
            availableImages: [...prev.availableImages, newMedia],
            selectedImages: [...prev.selectedImages, newMedia]
          }));
          
        } catch (error) {
          console.error('Base64 upload failed:', error);
          alert('File upload failed. Please try again.');
        }
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('File upload failed:', error);
      alert('File upload failed. Please try again.');
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

  // Helper: get published platforms for a contentId
  const getPublishedPlatformsForContent = (contentId) => {
    return scheduledPosts
      .filter(post => post.contentId === contentId && post.status === 'published')
      .map(post => post.platform);
  };

  // Helper: check if content is published on any platform
  const isContentPublished = (contentId) => {
    return scheduledPosts.some(post => post.contentId === contentId && post.status === 'published');
  };

  // When displaying portfolios, override status if published
  const publishedStatus = (item) => {
    if (isContentPublished(item.id)) {
      return 'published';
    }
    return item.status;
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
                  const publishedCount = customerData.portfolios.filter(p => isContentPublished(p.id)).length;
                  const approvedCount = customerData.portfolios.filter(p => p.status === 'approved' && !isContentPublished(p.id)).length;
                  const pendingCount = customerData.portfolios.filter(p => p.status === 'under_review' && !isContentPublished(p.id)).length;
                  
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
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(isContentPublished(portfolio.id) ? 'published' : portfolio.status)} flex-shrink-0`}>
                                {isContentPublished(portfolio.id) ? 'published' : portfolio.status.replace('_', ' ')}
                                {isContentPublished(portfolio.id) && (
                                  <span className="ml-2 text-xs text-blue-600">
                                    Published on: {getPublishedPlatformsForContent(portfolio.id).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                                  </span>
                                )}
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
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(isContentPublished(item.id) ? 'published' : item.status)}`}>
                            {getStatusIcon(isContentPublished(item.id) ? 'published' : item.status)}
                            <span className="ml-1">{isContentPublished(item.id) ? 'PUBLISHED' : item.status.replace('_', ' ').toUpperCase()}</span>
                            {isContentPublished(item.id) && (
                              <span className="ml-2 text-xs text-blue-600">
                                {getPublishedPlatformsForContent(item.id).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                              </span>
                            )}
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
                            Post
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
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(isContentPublished(selectedContent.id) ? 'published' : selectedContent.status)}`}>
                    {getStatusIcon(isContentPublished(selectedContent.id) ? 'published' : selectedContent.status)}
                    <span className="ml-2">{isContentPublished(selectedContent.id) ? 'PUBLISHED' : selectedContent.status.replace('_', ' ').toUpperCase()}</span>
                    {isContentPublished(selectedContent.id) && (
                      <span className="ml-2 text-xs text-blue-600">
                        {getPublishedPlatformsForContent(selectedContent.id).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                      </span>
                    )}
                  </span>
                  
                  <button
                    onClick={() => handleScheduleContent(selectedContent)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200"
                  >
                    <Send className="h-5 w-5 mr-2" />
                    Post Content
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
                      </h3
                      >
                      
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

      {/* Enhanced Multi-Platform Schedule Post Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                    <Send className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Post to Multiple Platforms</h2>
                    <p className="text-sm text-gray-500">Select platforms, schedule for later or publish immediately</p>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-8">
                {/* Platform Selection - Changed to Checkboxes with Connection Status */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">Select Platforms (Multi-Select)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      scheduleFormData.platforms.includes('facebook') 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'facebook')
                        ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}>
                      <input
                        type="checkbox"
                        name="platforms"
                        value="facebook"
                        checked={scheduleFormData.platforms.includes('facebook')}
                        onChange={() => hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'facebook') && handlePlatformToggle('facebook')}
                        disabled={!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'facebook')}
                        className="sr-only"
                      />
                      <Facebook className="h-6 w-6 text-blue-600 mr-3" />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">Facebook</span>
                        {!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'facebook') && (
                          <div className="text-xs text-orange-600 mt-1">No account connected</div>
                        )}
                      </div>
                      {scheduleFormData.platforms.includes('facebook') && (
                        <Check className="h-5 w-5 text-blue-600 ml-auto" />
                      )}
                      {!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'facebook') && (
                        <button
                          type="button"
                          onClick={() => showIntegration('facebook', selectedContentForSchedule?.customerId, getCustomerName(selectedContentForSchedule?.customerId))}
                          className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >
                          Connect
                        </button>
                      )}
                    </label>
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      scheduleFormData.platforms.includes('instagram') 
                        ? 'border-pink-500 bg-pink-50 shadow-md' 
                        : hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'instagram')
                        ? 'border-gray-300 hover:border-pink-400 hover:bg-pink-50'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}>
                      <input
                        type="checkbox"
                        name="platforms"
                        value="instagram"
                        checked={scheduleFormData.platforms.includes('instagram')}
                        onChange={() => hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'instagram') && handlePlatformToggle('instagram')}
                        disabled={!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'instagram')}
                        className="sr-only"
                      />
                      <Instagram className="h-6 w-6 text-pink-600 mr-3" />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">Instagram</span>
                        {!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'instagram') && (
                          <div className="text-xs text-orange-600 mt-1">No account connected</div>
                        )}
                      </div>
                      {scheduleFormData.platforms.includes('instagram') && (
                        <Check className="h-5 w-5 text-pink-600 ml-auto" />
                      )}
                      {!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'instagram') && (
                        <button
                          type="button"
                          onClick={() => showIntegration('instagram', selectedContentForSchedule?.customerId, getCustomerName(selectedContentForSchedule?.customerId))}
                          className="ml-2 bg-pink-600 text-white px-2 py-1 rounded text-xs hover:bg-pink-700"
                        >
                          Connect
                        </button>
                      )}
                    </label>
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      scheduleFormData.platforms.includes('youtube') 
                        ? 'border-red-500 bg-red-50 shadow-md' 
                        : hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'youtube')
                        ? 'border-gray-300 hover:border-red-400 hover:bg-red-50'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}>
                      <input
                        type="checkbox"
                        name="platforms"
                        value="youtube"
                        checked={scheduleFormData.platforms.includes('youtube')}
                        onChange={() => hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'youtube') && handlePlatformToggle('youtube')}
                        disabled={!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'youtube')}
                        className="sr-only"
                      />
                      <Youtube className="h-6 w-6 text-red-600 mr-3" />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">YouTube</span>
                        {!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'youtube') && (
                          <div className="text-xs text-orange-600 mt-1">Not available</div>
                        )}
                      </div>
                      {scheduleFormData.platforms.includes('youtube') && (
                        <Check className="h-5 w-5 text-red-600 ml-auto" />
                      )}
                    </label>
                    <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      scheduleFormData.platforms.includes('linkedin') 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'linkedin')
                        ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                    }`}>
                      <input
                        type="checkbox"
                        name="platforms"
                        value="linkedin"
                        checked={scheduleFormData.platforms.includes('linkedin')}
                        onChange={() => hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'linkedin') && handlePlatformToggle('linkedin')}
                        disabled={!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'linkedin')}
                        className="sr-only"
                      />
                      <Linkedin className="h-6 w-6 text-blue-600 mr-3" />
                      <div className="flex-1">
                        <span className="font-medium text-gray-900">LinkedIn</span>
                        {!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'linkedin') && (
                          <div className="text-xs text-orange-600 mt-1">No account connected</div>
                        )}
                      </div>
                      {scheduleFormData.platforms.includes('linkedin') && (
                        <Check className="h-5 w-5 text-blue-600 ml-auto" />
                      )}
                      {!hasAccountsForPlatform(selectedContentForSchedule?.customerId, 'linkedin') && (
                        <button
                          type="button"
                          onClick={() => showIntegration('linkedin', selectedContentForSchedule?.customerId, getCustomerName(selectedContentForSchedule?.customerId))}
                          className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                        >
                          Connect
                        </button>
                      )}
                    </label>
                  </div>
                  
                  {scheduleFormData.platforms.length > 0 && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm text-green-800 font-medium">
                        Selected platforms: {scheduleFormData.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                      </p>
                      {scheduleFormData.platforms.includes('youtube') && scheduleFormData.platforms.length > 1 && (
                        <p className="text-xs text-orange-600 mt-1">
                          ⚠️ Note: YouTube only supports single video posts, while other platforms support multiple images/carousel posts.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Platform-specific Account Selection */}
                {scheduleFormData.platforms.length > 0 && (
                  <div className="space-y-6">
                    {scheduleFormData.platforms.map(platform => (
                      <div key={platform} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 capitalize flex items-center">
                          {platform === 'facebook' && <Facebook className="h-5 w-5 text-blue-600 mr-2" />}
                          {platform === 'instagram' && <Instagram className="h-5 w-5 text-pink-600 mr-2" />}
                          {platform === 'youtube' && <Youtube className="h-5 w-5 text-red-600 mr-2" />}
                          {platform === 'linkedin' && <Linkedin className="h-5 w-5 text-blue-600 mr-2" />}
                          {platform} Settings
                        </h3>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select {platform} Account
                            </label>
                            <select
                              value={scheduleFormData.platformSettings[platform]?.accountId || ''}
                              onChange={(e) => updatePlatformSetting(platform, 'accountId', e.target.value)}
                              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                              required
                            >
                              <option value="">Choose an account</option>
                              {getAvailableAccountsForPlatform(selectedContentForSchedule?.customerId, platform).map(account => (
                                <option key={account._id} value={account._id}>
                                  {account.name} ({account.platform})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Page Selection for Facebook/Instagram */}
                          {(platform === 'facebook' || platform === 'instagram') && scheduleFormData.platformSettings[platform]?.accountId && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Page
                              </label>
                              <select
                                value={scheduleFormData.platformSettings[platform]?.pageId || ''}
                                onChange={(e) => updatePlatformSetting(platform, 'pageId', e.target.value)}
                                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                required
                              >
                                <option value="">Choose a page</option>
                                {(() => {
                                  const selectedAccount = getCustomerSocialAccounts(selectedContentForSchedule?.customerId)
                                    .find(acc => acc._id === scheduleFormData.platformSettings[platform]?.accountId);
                                  return selectedAccount?.pages?.map(page => (
                                    <option key={page.id} value={page.id}>
                                      {page.name}
                                      {!page.accessToken && ' (⚠️ No token)'}
                                      {platform === 'instagram' && !page.instagramBusinessAccount && ' (No Instagram)'}
                                    </option>
                                  )) || [];
                                })()}
                              </select>
                            </div>
                          )}

                          {/* Channel Selection for YouTube */}
                          {platform === 'youtube' && scheduleFormData.platformSettings[platform]?.accountId && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select Channel
                              </label>
                              <select
                                value={scheduleFormData.platformSettings[platform]?.channelId || ''}
                                onChange={(e) => updatePlatformSetting(platform, 'channelId', e.target.value)}
                                className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                                required
                              >
                                <option value="">Choose a channel</option>
                                {(() => {
                                  const selectedAccount = getCustomerSocialAccounts(selectedContentForSchedule?.customerId)
                                    .find(acc => acc._id === scheduleFormData.platformSettings[platform]?.accountId);
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Content Section */}
                <div className="space-y-6">
                  {/* Caption */}
                  <div>
                    <label className="block text-lg font-semibold text-gray-900 mb-3">Caption</label>
                    <textarea
                      value={scheduleFormData.caption}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, caption: e.target.value }))}
                      rows={4}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      placeholder="Write your post caption..."
                    />
                  </div>

                  {/* Hashtags */}
                  <div>
                    <label className="block text-lg font-semibold text-gray-900 mb-3 flex items-center">
                      <Hash className="h-5 w-5 mr-2" />
                      Hashtags
                    </label>
                    <textarea
                      value={scheduleFormData.hashtags}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, hashtags: e.target.value }))}
                      rows={3}
                      className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 resize-none"
                      placeholder="#example #hashtags #social"
                    />
                  </div>
                </div>

                {/* Media Selection */}
                {scheduleFormData.platforms.some(p => ['facebook', 'instagram', 'youtube', 'linkedin'].includes(p)) && (
                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <label className="block text-lg font-semibold text-gray-900 mb-4">
                      Media Selection
                      {(scheduleFormData.platforms.includes('youtube') || scheduleFormData.platforms.includes('instagram')) && 
                        <span className="text-red-500">*</span>}
                      {scheduleFormData.platforms.includes('youtube') && (
                        <span className="text-sm text-orange-600 ml-2">
                          (YouTube: Single video only)
                        </span>
                      )}
                      {scheduleFormData.platforms.some(p => ['facebook', 'instagram', 'linkedin'].includes(p)) && 
                        scheduleFormData.availableImages.length > 1 && (
                        <span className="text-sm text-gray-500 ml-2">
                          (Carousel supported - up to 10 media)
                        </span>
                      )}
                    </label>
                    
                    {/* Available Media from Version */}
                    {scheduleFormData.availableImages.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-sm font-medium text-gray-700">
                            Available Media from Content ({scheduleFormData.availableImages.length})
                          </span>
                          <div className="flex gap-2">
                            {scheduleFormData.availableImages.length > 1 && !scheduleFormData.platforms.includes('youtube') && (
                              <button
                                type="button"
                                onClick={selectAllImages}
                                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
                              >
                                Select All
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={clearAllImages}
                              className="text-xs px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
                            >
                              Clear All
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                          {scheduleFormData.availableImages.map((media, index) => {
                            const isSelected = scheduleFormData.selectedImages.some(item => item.url === media.url);
                            
                            return (
                              <div 
                                key={`${media.url}-${index}`}
                                className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                                  isSelected 
                                    ? 'border-blue-500 shadow-lg ring-2 ring-blue-200 transform scale-105' 
                                    : 'border-gray-300 hover:border-blue-400 hover:shadow-md'
                                }`}
                                onClick={() => toggleImageSelection(media)}
                              >
                                {media.type === 'video' ? (
                                  <div className="w-full h-24 bg-gray-200 flex items-center justify-center">
                                    <Video className="h-8 w-8 text-gray-500" />
                                    <span className="ml-2 text-xs text-gray-600">Video</span>
                                  </div>
                                ) : (
                                  <img 
                                    src={media.url} 
                                    alt={`Available ${media.type} ${index + 1}`}
                                    className="w-full h-24 object-cover"
                                  />
                                )}
                                
                                {/* Selection Indicator */}
                                <div className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                                  isSelected 
                                    ? 'bg-blue-500 text-white shadow-lg' 
                                    : 'bg-white/80 text-gray-600 border-2 border-gray-300'
                                }`}>
                                  {isSelected ? (
                                    <Check className="h-4 w-4" />
                                  ) : (
                                    <span>{index + 1}</span>
                                  )}
                                </div>
                                
                                {/* Selection Order */}
                                {isSelected && (
                                  <div className="absolute top-2 left-2 bg-blue-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-lg">
                                    {scheduleFormData.selectedImages.findIndex(item => item.url === media.url) + 1}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {scheduleFormData.selectedImages.length > 0 && (
                          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold text-blue-800">
                                {scheduleFormData.selectedImages.length} media selected
                                {scheduleFormData.selectedImages.length > 1 && !scheduleFormData.platforms.includes('youtube') && ' (Multi-platform carousel post)'}
                              </span>
                              {scheduleFormData.platforms.includes('instagram') && scheduleFormData.selectedImages.length > 10 && (
                                <span className="text-xs text-red-600 font-semibold">
                                  Instagram allows max 10 media
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {scheduleFormData.availableImages.length === 0 && (
                      <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                        <div className="flex items-center">
                          <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                          <span className="text-sm text-yellow-800">
                            No media available from the selected content for the selected platforms.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Additional Media Upload */}
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-all duration-200">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={scheduleFormData.platforms.includes('youtube') ? "video/*" : "image/*,video/*"}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleImageUpload(file);
                        }}
                        className="hidden"
                      />
                      <Image className="h-8 w-8 mx-auto mb-3 text-gray-400" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-800 font-semibold text-sm transition-colors duration-200"
                      >
                        Upload Additional Media
                      </button>
                      <p className="text-xs text-gray-500 mt-2">Max 5MB</p>
                    </div>
                  </div>
                )}

                {/* Date and Time for Scheduling */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-200">
                  <label className="block text-lg font-semibold text-gray-900 mb-4">Schedule Time (Optional for Post Now)</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                      <input
                        type="date"
                        value={scheduleFormData.scheduledDate}
                        onChange={(e) => setScheduleFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                      <input
                        type="time"
                        value={scheduleFormData.scheduledTime}
                        onChange={(e) => setScheduleFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                        className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
                  <button
                    onClick={closeModal}
                    className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-300 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePostNow}
                    disabled={isPostingNow || submitting || scheduleFormData.platforms.length === 0}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {isPostingNow ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Publishing to {scheduleFormData.platforms.length} platform{scheduleFormData.platforms.length !== 1 ? 's' : ''}...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-5 w-5" />
                        <span>Post Now to {scheduleFormData.platforms.length} Platform{scheduleFormData.platforms.length !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleSchedulePost}
                    disabled={submitting || isPostingNow || scheduleFormData.platforms.length === 0}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Scheduling...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        <span>Schedule for {scheduleFormData.platforms.length} Platform{scheduleFormData.platforms.length !== 1 ? 's' : ''}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Modal */}
      {showIntegrationModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                    <Settings className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Connect Social Media Account</h2>
                    <p className="text-sm text-gray-500">Connect {integrationPlatform} for {integrationCustomer?.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIntegrationModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Show the appropriate integration component */}
              <SocialIntegrations
                platform={integrationPlatform}
                customer={integrationCustomer}
                onConnectionSuccess={handleIntegrationSuccess}
                onClose={() => setShowIntegrationModal(false)}
                compact={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminContentPortfolio;