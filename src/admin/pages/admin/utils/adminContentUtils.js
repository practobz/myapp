export const formatDate = (dateString, options = {}) => {
  try {
    if (!dateString) return 'No date set';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    const defaultOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };
    
    return date.toLocaleDateString('en-US', defaultOptions);
  } catch {
    return 'Invalid Date';
  }
};

// Format date for content calendar display
export const formatCalendarDate = (dateString) => {
  if (!dateString) return 'No due date';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid due date';
    
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    if (diffDays < 0) {
      return `${formattedDate} (Overdue)`;
    } else if (diffDays === 0) {
      return `${formattedDate} (Due Today)`;
    } else if (diffDays === 1) {
      return `${formattedDate} (Due Tomorrow)`;
    } else if (diffDays <= 7) {
      return `${formattedDate} (Due in ${diffDays} days)`;
    }
    
    return formattedDate;
  } catch {
    return 'Invalid due date';
  }
};

// Format content calendar number/count
export const formatContentNumber = (content, index) => {
  if (!content) return 'N/A';
  
  // If content has an ID or number field, use that
  if (content.contentNumber) return `#${content.contentNumber}`;
  if (content.id) return `#${content.id}`;
  
  // Otherwise use the index
  return `#${index + 1}`;
};

// Get content calendar status with proper formatting
export const getContentCalendarStatus = (content) => {
  if (!content) return { status: 'unknown', display: 'Unknown Status' };
  
  const status = content.status || 'draft';
  const dueDate = content.dueDate || content.deadline || content.scheduledDate;
  
  let display = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
  if (dueDate) {
    const date = new Date(dueDate);
    const now = new Date();
    const isOverdue = date < now && !['published', 'completed'].includes(status);
    
    if (isOverdue) {
      display += ' (Overdue)';
    }
  }
  
  return { status, display };
};

export const getStatusColor = (status) => {
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

export const getStatusIcon = (status) => {
  const { CheckCircle, AlertCircle, Clock } = require('lucide-react');
  
  switch (status) {
    case 'approved':
    case 'published':
      return CheckCircle({ className: "h-4 w-4" });
    case 'revision_requested':
      return AlertCircle({ className: "h-4 w-4" });
    default:
      return Clock({ className: "h-4 w-4" });
  }
};

export const extractHashtags = (text) => {
  const hashtagRegex = /#[a-zA-Z0-9_]+/g;
  const hashtags = text.match(hashtagRegex);
  return hashtags ? hashtags.join(' ') : '';
};

export const normalizeMedia = (media) => {
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

export const getMediaType = (url) => {
  if (!url || typeof url !== 'string') return 'image';
  
  const extension = url.toLowerCase().split('.').pop();
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  
  return videoExtensions.includes(extension) ? 'video' : 'image';
};

export const getLatestStatus = (versions) => {
  const latestVersion = versions[versions.length - 1];
  return latestVersion.status || 'under_review';
};

export const getAllFeedback = (versions) => {
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

export const isVideoUrl = (url) => {
  if (!url) return false;
  const ext = url.split('.').pop().toLowerCase();
  return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
};

// Validation function for post data
export const validatePostData = (scheduleFormData, isScheduled = true) => {
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

  // Only validate date/time for scheduled posts
  if (isScheduled) {
    if (!scheduleFormData.scheduledDate || !scheduleFormData.scheduledTime) {
      alert('Please select a date and time for scheduling');
      return false;
    }
    
    // Validate that the scheduled date is not in the past
    const scheduledDateTime = new Date(`${scheduleFormData.scheduledDate}T${scheduleFormData.scheduledTime}`);
    if (scheduledDateTime < new Date()) {
      alert('Scheduled date and time cannot be in the past');
      return false;
    }
  }

  return true;
};

// Create post data object for multiple platforms
export const createPostsData = (scheduleFormData, selectedContentForSchedule, customerSocialAccounts, isScheduled = true) => {
  const fullCaption = scheduleFormData.hashtags 
    ? `${scheduleFormData.caption}\n\n${scheduleFormData.hashtags}`
    : scheduleFormData.caption;

  const postsData = [];

  for (const platform of scheduleFormData.platforms) {
    const settings = scheduleFormData.platformSettings[platform];
    
    // Get the selected account details
    const customerData = customerSocialAccounts.find(c => c.customerId === selectedContentForSchedule.customerId);
    const selectedAccount = customerData?.socialAccounts?.find(acc => acc._id === settings.accountId);

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
