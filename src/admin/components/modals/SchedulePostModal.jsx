import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, XCircle, Image, Video, Facebook, Instagram, Youtube, Linkedin, 
  Check, Hash, Loader2, Zap, AlertCircle
} from 'lucide-react';

// Accept a callback to update local accounts state
async function disconnectSocialAccount(accountId, onRefresh, onLocalDisconnect) {
  try {
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/customer-social-links/${accountId}`,
      { method: 'DELETE' }
    );
    const result = await response.json();
    if (result.success || result.error === 'not_found' || result.reason === 'deleted') {
      alert('Account disconnected. You can now reconnect.');
      if (onLocalDisconnect) onLocalDisconnect(accountId); // update local state
      if (onRefresh) onRefresh();
    } else {
      alert('Failed to disconnect: ' + (result.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Error disconnecting account');
  }
}

function SchedulePostModal({ 
  selectedContent, 
  onClose, 
  extractHashtags, 
  getCustomerSocialAccounts, 
  getCustomerName, 
  showIntegration,
  updatePortfolioStatus,
  onRefreshScheduledPosts
}) {
  const fileInputRef = useRef(null);

  // Schedule modal state
  const [scheduleFormData, setScheduleFormData] = useState({
    caption: '',
    hashtags: '',
    selectedImages: [],
    availableImages: [],
    platforms: [],
    platformSettings: {},
    scheduledDate: '',
    scheduledTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    postType: 'feed' // added: 'feed' | 'story' | 'reel'
  });
  const [submitting, setSubmitting] = useState(false);
  const [isPostingNow, setIsPostingNow] = useState(false);

  // Local state for connected accounts
  const [localAccounts, setLocalAccounts] = useState([]);

  useEffect(() => {
    if (selectedContent) {
      // Initialize localAccounts from props
      setLocalAccounts(getCustomerSocialAccounts(selectedContent.customerId));
      
      const latestVersion = selectedContent.versions[selectedContent.versions.length - 1];
      
      // Get all media from the latest version
      const availableMedia = latestVersion?.media?.filter(media => 
        media.url && typeof media.url === 'string'
      ) || [];
      
      // Extract caption without hashtags
      const captionText = latestVersion.caption || '';
      const hashtagsText = latestVersion.hashtags || extractHashtags(captionText);
      const captionWithoutHashtags = captionText.replace(/#[a-zA-Z0-9_]+/g, '').trim();
      
      setScheduleFormData({
        caption: captionWithoutHashtags,
        hashtags: hashtagsText,
        selectedImages: availableMedia.length > 0 ? [availableMedia[0]] : [],
        availableImages: availableMedia,
        platforms: [],
        platformSettings: {},
        scheduledDate: '',
        scheduledTime: '',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        postType: 'feed' // initialize
      });
    }
  }, [selectedContent, getCustomerSocialAccounts]);

  // Listen for integration success messages (from Configure popup)
  useEffect(() => {
    const handler = (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data || {};
      if (data.type === 'SOCIAL_INTEGRATION_SUCCESS' && data.customerId === selectedContent?.customerId) {
        // refresh local accounts when a new social integration completes
        const refreshed = getCustomerSocialAccounts(selectedContent.customerId);
        setLocalAccounts(refreshed);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [selectedContent, getCustomerSocialAccounts]);
  
  // Use localAccounts instead of getCustomerSocialAccounts for UI
  const getAvailableAccountsForPlatform = (customerId, platform) => {
    return localAccounts.filter(account => account.platform === platform);
  };

  // Check if customer has any accounts for a platform
  const hasAccountsForPlatform = (customerId, platform) => {
    const accounts = getAvailableAccountsForPlatform(customerId, platform);
    return accounts.length > 0;
  };

  // Handle platform selection (checkbox)
  const handlePlatformToggle = (platform) => {
    if (!selectedContent) return;
    
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

  // Helper to detect video URLs
  const isVideoUrl = (url) => {
    if (!url) return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'].includes(ext);
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

    // Prevent scheduling for video posts on Facebook/Instagram
    if (isScheduled) {
      for (const platform of scheduleFormData.platforms) {
        if ((platform === 'facebook' || platform === 'instagram') && scheduleFormData.selectedImages.length > 0) {
          const isVideo = isVideoUrl(scheduleFormData.selectedImages[0]?.url);
          if (isVideo) {
            alert('Scheduled video posts are not supported for Facebook or Instagram. Please use "Post Now" for video content.');
            return false;
          }
        }
      }
    }

    return true;
  };

  // Create posts data object for multiple platforms
  const createPostsData = (isScheduled = true) => {
    const fullCaption = scheduleFormData.hashtags 
      ? `${scheduleFormData.caption}\n\n${scheduleFormData.hashtags}`
      : scheduleFormData.caption;

    const postsData = [];

    for (const platform of scheduleFormData.platforms) {
      const settings = scheduleFormData.platformSettings[platform];
      
      // Get the selected account details
      const selectedAccount = getCustomerSocialAccounts(selectedContent.customerId)
        .find(acc => acc._id === settings.accountId);

      if (!selectedAccount) {
        throw new Error(`Selected ${platform} account not found`);
      }

      let postData = {
        caption: fullCaption,
        status: isScheduled ? 'pending' : 'publishing',
        contentId: selectedContent.id,
        customerId: selectedContent.customerId,
        platform: platform,
        accountId: selectedAccount._id,
        platformUserId: selectedAccount.platformUserId,
        accessToken: selectedAccount.accessToken,
        imageUrls: scheduleFormData.selectedImages.map(item => item.url),
        isCarousel: scheduleFormData.selectedImages.length > 1 && platform !== 'youtube',
        timezone: scheduleFormData.timezone,
        calendar_id: selectedContent.calendar_id || selectedContent.calendarId || '',
        calendar_name: selectedContent.calendar_name || selectedContent.calendarName || '',
        item_id: selectedContent.item_id || selectedContent.itemId || selectedContent.id || '',
        item_name: selectedContent.item_name || selectedContent.itemName || selectedContent.title || '',
        postType: scheduleFormData.postType // added: include chosen post type
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
          // Add media URLs for LinkedIn
          mediaUrls: scheduleFormData.selectedImages.map(item => item.url)
        });
      }

      // Include calendar and item details for scheduled posts
      if (isScheduled) {
        postData.calendarId = selectedContent.calendar_id || selectedContent.calendarId;
        postData.calendarName = selectedContent.calendar_name || selectedContent.calendarName;
        postData.itemId = selectedContent.item_id || selectedContent.itemId;
        postData.itemName = selectedContent.item_name || selectedContent.itemName;
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
        onRefreshScheduledPosts();
        onClose();
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

      for (const postData of postsData) {
        try {
          // Remove LinkedIn media upload logic
          // if (postData.platform === 'linkedin' && postData.imageUrls && postData.imageUrls.length > 0) {
          //   const selectedAccount = getCustomerSocialAccounts(selectedContent.customerId)
          //     .find(acc => acc._id === postData.accountId);
          //   const linkedinToken = selectedAccount?.accessToken;
          //   try {
          //     const assetObj = await uploadLinkedInMedia(postData.imageUrls[0], linkedinToken);
          //     if (assetObj && assetObj.asset) {
          //       postData.mediaAsset = assetObj.asset;
          //       postData.mediaType = assetObj.type === 'video' ? 'VIDEO' : 'IMAGE';
          //     }
          //   } catch (mediaError) {
          //     console.error('❌ LinkedIn media upload failed:', mediaError.message);
          //   }
          // }

          // Use /api/immediate-posts for all platforms
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/immediate-posts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postData)
          });
          const result = await response.json();
          if (response.ok) {
            results.push(`✅ ${postData.platform}: Posted successfully`);
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
        // Update portfolio status
        updatePortfolioStatus(selectedContent.id, selectedContent.customerId);
      }
      if (errors.length > 0) {
        message += '\nErrors:\n' + errors.join('\n');
      }

      alert(message || 'All posts published successfully!');
      
      if (results.length > 0) {
        onRefreshScheduledPosts();
        onClose();
      }
    } catch (error) {
      console.error('Post now error:', error);
      alert(`Failed to publish posts: ${error.message}`);
    } finally {
      setIsPostingNow(false); // Ensure loader always stops
    }
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

  // Add this function to fix the error
  const handleLocalDisconnect = (accountId) => {
    setLocalAccounts(prev => prev.filter(acc => acc._id !== accountId));
    setScheduleFormData(prev => {
      // Find which platform this account belonged to
      const disconnectedAccount = prev.platforms
        .map(platform => ({ platform, account: localAccounts.find(acc => acc._id === accountId && acc.platform === platform) }))
        .find(item => item.account);
      if (!disconnectedAccount) return prev;
      const platform = disconnectedAccount.platform;
      // Clear selected account for this platform
      return {
        ...prev,
        platformSettings: {
          ...prev.platformSettings,
          [platform]: {
            ...prev.platformSettings[platform],
            accountId: '',
            pageId: '',
            channelId: '',
            linkedinAccountId: ''
          }
        }
      };
    });
  };

  if (!selectedContent) return null;

  return (
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
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          <div className="space-y-8">
            {/* Platform Selection */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
              <label className="block text-lg font-semibold text-gray-900 mb-4">Select Platforms (Multi-Select)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Facebook */}
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  scheduleFormData.platforms.includes('facebook') 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : hasAccountsForPlatform(selectedContent?.customerId, 'facebook')
                    ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                }`}>
                  <input
                    type="checkbox"
                    name="platforms"
                    value="facebook"
                    checked={scheduleFormData.platforms.includes('facebook')}
                    onChange={() => hasAccountsForPlatform(selectedContent?.customerId, 'facebook') && handlePlatformToggle('facebook')}
                    disabled={!hasAccountsForPlatform(selectedContent?.customerId, 'facebook')}
                    className="sr-only"
                  />
                  <Facebook className="h-6 w-6 text-blue-600 mr-3" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Facebook</span>
                    {!hasAccountsForPlatform(selectedContent?.customerId, 'facebook') && (
                      <div className="text-xs text-orange-600 mt-1">No account connected</div>
                    )}
                    {hasAccountsForPlatform(selectedContent?.customerId, 'facebook') && (
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-green-700 font-semibold flex items-center">
                          <Check className="h-4 w-4 text-green-600 mr-1" />
                          Connected
                        </span>
                      </div>
                    )}
                  </div>
                  {scheduleFormData.platforms.includes('facebook') && (
                    <Check className="h-5 w-5 text-blue-600 ml-auto" />
                  )}
                  {!hasAccountsForPlatform(selectedContent?.customerId, 'facebook') ? (
                    <button
                      type="button"
                      onClick={() => showIntegration('facebook', selectedContent?.customerId, getCustomerName(selectedContent?.customerId))}
                      className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                    >
                      Connect
                    </button>
                  ) : (
                    (() => {
                      const connected = getAvailableAccountsForPlatform(selectedContent?.customerId, 'facebook');
                      return connected.length > 0 ? (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await disconnectSocialAccount(connected[0]._id, null, handleLocalDisconnect);
                          }}
                          className="ml-2 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Disconnect
                        </button>
                      ) : null;
                    })()
                  )}
                </label>

                {/* Instagram */}
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  scheduleFormData.platforms.includes('instagram') 
                    ? 'border-pink-500 bg-pink-50 shadow-md' 
                    : getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length > 0
                    ? 'border-gray-300 hover:border-pink-400 hover:bg-pink-50'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                }`}>
                  <input
                    type="checkbox"
                    name="platforms"
                    value="instagram"
                    checked={scheduleFormData.platforms.includes('instagram')}
                    onChange={() => getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length > 0 && handlePlatformToggle('instagram')}
                    disabled={getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length === 0}
                    className="sr-only"
                  />
                  <Instagram className="h-6 w-6 text-pink-600 mr-3" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">Instagram</span>
                    {getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length === 0 && (
                      <div className="text-xs text-orange-600 mt-1">No account connected</div>
                    )}
                    {getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length > 0 && (
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-green-700 font-semibold flex items-center">
                          <Check className="h-4 w-4 text-green-600 mr-1" />
                          Connected
                        </span>
                      </div>
                    )}
                  </div>
                  {scheduleFormData.platforms.includes('instagram') && (
                    <Check className="h-5 w-5 text-pink-600 ml-auto" />
                  )}
                  {getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length === 0 ? (
                    <button
                      type="button"
                      onClick={() => showIntegration('instagram', selectedContent?.customerId, getCustomerName(selectedContent?.customerId))}
                      className="ml-2 bg-pink-600 text-white px-2 py-1 rounded text-xs hover:bg-pink-700"
                    >
                      Connect
                    </button>
                  ) : (
                    (() => {
                      const connected = getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram');
                      return connected.length > 0 ? (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await disconnectSocialAccount(connected[0]._id, null, handleLocalDisconnect);
                          }}
                          className="ml-2 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Disconnect
                        </button>
                      ) : null;
                    })()
                  )}
                </label>

                {/* YouTube */}
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  scheduleFormData.platforms.includes('youtube') 
                    ? 'border-red-500 bg-red-50 shadow-md' 
                    : hasAccountsForPlatform(selectedContent?.customerId, 'youtube')
                    ? 'border-gray-300 hover:border-red-400 hover:bg-red-50'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                }`}>
                  <input
                    type="checkbox"
                    name="platforms"
                    value="youtube"
                    checked={scheduleFormData.platforms.includes('youtube')}
                    onChange={() => hasAccountsForPlatform(selectedContent?.customerId, 'youtube') && handlePlatformToggle('youtube')}
                    disabled={!hasAccountsForPlatform(selectedContent?.customerId, 'youtube')}
                    className="sr-only"
                  />
                  <Youtube className="h-6 w-6 text-red-600 mr-3" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">YouTube</span>
                    {!hasAccountsForPlatform(selectedContent?.customerId, 'youtube') && (
                      <div className="text-xs text-orange-600 mt-1">Not available</div>
                    )}
                    {hasAccountsForPlatform(selectedContent?.customerId, 'youtube') && (
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-green-700 font-semibold flex items-center">
                          <Check className="h-4 w-4 text-green-600 mr-1" />
                          Connected
                        </span>
                      </div>
                    )}
                  </div>
                  {scheduleFormData.platforms.includes('youtube') && (
                    <Check className="h-5 w-5 text-red-600 ml-auto" />
                  )}
                  {!hasAccountsForPlatform(selectedContent?.customerId, 'youtube') ? (
                    <button
                      type="button"
                      onClick={() => showIntegration('youtube', selectedContent?.customerId, getCustomerName(selectedContent?.customerId))}
                      className="ml-2 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                    >
                      Connect
                    </button>
                  ) : (
                    (() => {
                      const connected = getAvailableAccountsForPlatform(selectedContent?.customerId, 'youtube');
                      return connected.length > 0 ? (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await disconnectSocialAccount(connected[0]._id, null, handleLocalDisconnect);
                          }}
                          className="ml-2 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Disconnect
                        </button>
                      ) : null;
                    })()
                  )}
                </label>

                {/* LinkedIn */}
                <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                  scheduleFormData.platforms.includes('linkedin') 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : hasAccountsForPlatform(selectedContent?.customerId, 'linkedin')
                    ? 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                    : 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                }`}>
                  <input
                    type="checkbox"
                    name="platforms"
                    value="linkedin"
                    checked={scheduleFormData.platforms.includes('linkedin')}
                    onChange={() => hasAccountsForPlatform(selectedContent?.customerId, 'linkedin') && handlePlatformToggle('linkedin')}
                    disabled={!hasAccountsForPlatform(selectedContent?.customerId, 'linkedin')}
                    className="sr-only"
                  />
                  <Linkedin className="h-6 w-6 text-blue-600 mr-3" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">LinkedIn</span>
                    {!hasAccountsForPlatform(selectedContent?.customerId, 'linkedin') && (
                      <div className="text-xs text-orange-600 mt-1">No account connected</div>
                    )}
                    {/* Add Connected indicator for LinkedIn */}
                    {hasAccountsForPlatform(selectedContent?.customerId, 'linkedin') && (
                      <div className="flex items-center mt-1">
                        <span className="text-xs text-green-700 font-semibold flex items-center">
                          <Check className="h-4 w-4 text-green-600 mr-1" />
                          Connected
                        </span>
                      </div>
                    )}
                  </div>
                  {scheduleFormData.platforms.includes('linkedin') && (
                    <Check className="h-5 w-5 text-blue-600 ml-auto" />
                  )}
                  {!hasAccountsForPlatform(selectedContent?.customerId, 'linkedin') ? (
                    <button
                      type="button"
                      onClick={() => showIntegration('linkedin', selectedContent?.customerId, getCustomerName(selectedContent?.customerId))}
                      className="ml-2 bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700"
                    >
                      Connect
                    </button>
                  ) : (
                    (() => {
                      const connected = getAvailableAccountsForPlatform(selectedContent?.customerId, 'linkedin');
                      return connected.length > 0 ? (
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.stopPropagation();
                            await disconnectSocialAccount(connected[0]._id, null, handleLocalDisconnect);
                          }}
                          className="ml-2 bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700"
                        >
                          Disconnect
                        </button>
                      ) : null;
                    })()
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
                          {getAvailableAccountsForPlatform(selectedContent?.customerId, platform).map(account => (
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
                              const selectedAccount = getCustomerSocialAccounts(selectedContent?.customerId)
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
                              const selectedAccount = getCustomerSocialAccounts(selectedContent?.customerId)
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
                  {/* Post type selector for Instagram (Feed / Story / Reel) */}
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="radio"
                        name="postType"
                        value="feed"
                        checked={scheduleFormData.postType === 'feed'}
                        onChange={() => setScheduleFormData(prev => ({ ...prev, postType: 'feed' }))}
                        className="form-radio"
                      />
                      Feed
                    </label>
                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="radio"
                        name="postType"
                        value="story"
                        checked={scheduleFormData.postType === 'story'}
                        onChange={() => setScheduleFormData(prev => ({ ...prev, postType: 'story' }))}
                        className="form-radio"
                      />
                      Story
                    </label>
                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="radio"
                        name="postType"
                        value="reel"
                        checked={scheduleFormData.postType === 'reel'}
                        onChange={() => setScheduleFormData(prev => ({ ...prev, postType: 'reel' }))}
                        className="form-radio"
                      />
                      Reel
                    </label>
                  </div>
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
                onClick={onClose}
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
  );
}

export default SchedulePostModal;