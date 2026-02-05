import React, { useState, useRef, useEffect, memo, useMemo, useCallback } from 'react';
import { 
  Send, XCircle, Video, Facebook, Instagram, Youtube, Linkedin, 
  Check, Hash, Loader2, Zap, AlertCircle, Upload, Trash2, MoveVertical, X
} from 'lucide-react';

// ========================================
// MEMOIZED COMPONENTS FOR PERFORMANCE
// ========================================

// Memoized Platform Card Component
const PlatformCard = memo(({ platform, icon: Icon, iconColor, borderColor, bgColor, isSelected, isConnected, onToggle, onConnect, onDisconnect, accountName }) => (
  <label className={`flex flex-col sm:flex-row items-start sm:items-center p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-all ${
    isSelected 
      ? `${borderColor} ${bgColor} shadow-sm` 
      : isConnected
      ? 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      : 'border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60'
  }`}>
    <input
      type="checkbox"
      checked={isSelected}
      onChange={onToggle}
      disabled={!isConnected}
      className="sr-only"
    />
    <div className="flex items-center w-full sm:w-auto">
      <Icon className={`h-5 w-5 ${iconColor} mr-2 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-gray-900 text-sm capitalize">{platform}</span>
        {!isConnected && <div className="text-[10px] text-orange-600">Not connected</div>}
        {isConnected && (
          <div className="flex items-center">
            <span className="text-[10px] text-green-700 font-medium flex items-center">
              <Check className="h-3 w-3 text-green-600 mr-0.5" />
              Connected
            </span>
          </div>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1 mt-1 sm:mt-0 sm:ml-auto">
      {isSelected && <Check className={`h-4 w-4 ${iconColor}`} />}
      {!isConnected ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onConnect(); }}
          className={`${bgColor.replace('bg-', 'bg-').replace('-50', '-600')} text-white px-2 py-0.5 rounded text-[10px] hover:opacity-90`}
        >
          Connect
        </button>
      ) : (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDisconnect(); }}
          className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-red-600"
        >
          Disconnect
        </button>
      )}
    </div>
  </label>
));

// Memoized Media Card Component
const MediaCard = memo(({ media, index, isSelected, selectionOrder, onToggle, isVideoUrl }) => (
  <div 
    className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
      isSelected 
        ? 'border-blue-500 shadow-md ring-1 ring-blue-200 scale-[1.02]' 
        : 'border-gray-300 hover:border-blue-400 hover:shadow-sm'
    }`}
    onClick={onToggle}
  >
    {media.type === 'video' || isVideoUrl(media.url) ? (
      <div className="w-full h-16 sm:h-20 bg-gray-200 flex items-center justify-center">
        <Video className="h-5 w-5 text-gray-500" />
        <span className="ml-1 text-[10px] text-gray-600">Video</span>
      </div>
    ) : (
      <img 
        src={media.url} 
        alt={`Media ${index + 1}`}
        className="w-full h-16 sm:h-20 object-cover"
        loading="lazy"
      />
    )}
    
    {/* Selection Indicator */}
    <div className={`absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
      isSelected 
        ? 'bg-blue-500 text-white shadow' 
        : 'bg-white/80 text-gray-600 border border-gray-300'
    }`}>
      {isSelected ? <Check className="h-3 w-3" /> : <span>{index + 1}</span>}
    </div>
    
    {/* Selection Order */}
    {isSelected && selectionOrder !== null && (
      <div className="absolute top-1 left-1 bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow">
        {selectionOrder + 1}
      </div>
    )}
  </div>
));

// Memoized Carousel Item Component
const CarouselItem = memo(({ media, index, isDragging, onDragStart, onDragOver, onDragEnd, onRemove, isVideoUrl }) => (
  <div
    draggable
    onDragStart={(e) => onDragStart(e, index)}
    onDragOver={(e) => onDragOver(e, index)}
    onDragEnd={onDragEnd}
    className={`relative border-2 rounded-lg overflow-hidden cursor-move transition-all ${
      isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'
    } border-blue-400 bg-white`}
  >
    {isVideoUrl(media.url) ? (
      <div className="w-full h-14 sm:h-16 bg-gray-800 flex items-center justify-center">
        <Video className="h-4 w-4 text-white" />
      </div>
    ) : (
      <img 
        src={media.url} 
        alt={`Carousel item ${index + 1}`}
        className="w-full h-14 sm:h-16 object-cover"
        loading="lazy"
      />
    )}
    
    {/* Order number */}
    <div className="absolute top-0.5 left-0.5 bg-blue-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold">
      {index + 1}
    </div>
    
    {/* Remove button */}
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
    >
      <X className="h-2.5 w-2.5" />
    </button>
  </div>
));

// ========================================
// CAROUSEL FUNCTIONS (Instagram & Facebook)
// ========================================

/**
 * Helper function to detect video URLs
 */
function isVideoUrl(url) {
  if (!url) return false;
  const ext = url.split('.').pop().toLowerCase().split('?')[0];
  return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'].includes(ext);
}

/**
 * Create individual media containers for Instagram carousel
 */
async function createInstagramMediaContainers(mediaUrls, instagramId, pageAccessToken) {
  const containerIds = [];
  
  for (const url of mediaUrls) {
    try {
      const isVideo = isVideoUrl(url);
      
      const params = new URLSearchParams({
        access_token: pageAccessToken,
        is_carousel_item: 'true',
        ...(isVideo ? {
          media_type: 'VIDEO',
          video_url: url
        } : {
          image_url: url
        })
      });

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${instagramId}/media?${params.toString()}`,
        { method: 'POST' }
      );

      const data = await response.json();

      if (data.id) {
        containerIds.push(data.id);
        console.log(`✅ Created ${isVideo ? 'video' : 'image'} container:`, data.id);
      } else {
        throw new Error('Failed to create media container');
      }
    } catch (error) {
      console.error('Error creating media container:', error);
      throw new Error(`Failed to create container for ${url}: ${error.message}`);
    }
  }
  
  return containerIds;
}

/**
 * Create Instagram carousel container
 */
async function createInstagramCarouselContainer(containerIds, caption, instagramId, pageAccessToken, locationId = null) {
  try {
    const params = new URLSearchParams({
      access_token: pageAccessToken,
      media_type: 'CAROUSEL',
      children: containerIds.join(','),
      caption: caption || ''
    });
    
    // Add location if provided
    if (locationId) {
      params.append('location_id', locationId);
    }

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${instagramId}/media?${params.toString()}`,
      { method: 'POST' }
    );

    const data = await response.json();

    if (data.id) {
      console.log('✅ Created carousel container:', data.id);
      return data.id;
    } else {
      throw new Error('Failed to create carousel container');
    }
  } catch (error) {
    console.error('Error creating carousel container:', error);
    throw new Error(`Failed to create carousel container: ${error.message}`);
  }
}

/**
 * Publish Instagram carousel
 */
async function publishInstagramCarousel(carouselContainerId, instagramId, pageAccessToken) {
  try {
    const params = new URLSearchParams({
      access_token: pageAccessToken,
      creation_id: carouselContainerId
    });

    const response = await fetch(
      `https://graph.facebook.com/v21.0/${instagramId}/media_publish?${params.toString()}`,
      { method: 'POST' }
    );

    const data = await response.json();

    if (data.id) {
      console.log('✅ Published carousel post:', data.id);
      return {
        success: true,
        postId: data.id
      };
    } else {
      throw new Error('Failed to publish carousel');
    }
  } catch (error) {
    console.error('Error publishing carousel:', error);
    throw new Error(`Failed to publish carousel: ${error.message}`);
  }
}

/**
 * Complete Instagram carousel flow
 */
async function createAndPublishInstagramCarousel(mediaUrls, caption, instagramId, pageAccessToken, locationId = null) {
  try {
    // Validate media count
    if (mediaUrls.length < 2 || mediaUrls.length > 10) {
      throw new Error('Carousel must contain 2-10 media items');
    }

    console.log(`📸 Creating Instagram carousel with ${mediaUrls.length} items...`);

    // Step 1: Create individual media containers
    const containerIds = await createInstagramMediaContainers(mediaUrls, instagramId, pageAccessToken);
    
    if (containerIds.length !== mediaUrls.length) {
      throw new Error(`Only ${containerIds.length} out of ${mediaUrls.length} containers were created`);
    }

    // Step 2: Create carousel container
    const carouselContainerId = await createInstagramCarouselContainer(
      containerIds, 
      caption, 
      instagramId, 
      pageAccessToken,
      locationId
    );

    // Step 3: Publish carousel
    const publishResult = await publishInstagramCarousel(
      carouselContainerId, 
      instagramId, 
      pageAccessToken
    );

    return {
      success: true,
      postId: publishResult.postId,
      containerIds,
      carouselContainerId
    };
  } catch (error) {
    console.error('❌ Instagram carousel creation failed:', error.message);
    throw error;
  }
}

/**
 * Create Facebook carousel post using attached_media
 */
async function createFacebookCarousel(mediaUrls, caption, pageId, pageAccessToken) {
  try {
    // Validate media count
    if (mediaUrls.length < 2 || mediaUrls.length > 10) {
      throw new Error('Carousel must contain 2-10 media items');
    }

    console.log(`📘 Creating Facebook carousel with ${mediaUrls.length} items...`);

    // Step 1: Upload each media item and get media IDs
    const mediaIds = [];
    
    for (const url of mediaUrls) {
      try {
        const isVideo = isVideoUrl(url);
        
        const params = new URLSearchParams({
          access_token: pageAccessToken,
          url: url,
          published: 'false'
        });

        const response = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/${isVideo ? 'videos' : 'photos'}?${params.toString()}`,
          { method: 'POST' }
        );

        const data = await response.json();

        if (data.id) {
          mediaIds.push(data.id);
          console.log(`✅ Uploaded ${isVideo ? 'video' : 'photo'} to Facebook:`, data.id);
        } else {
          throw new Error('Failed to upload media');
        }
      } catch (error) {
        console.error('Error uploading media to Facebook:', error);
        throw new Error(`Failed to upload ${url}: ${error.message}`);
      }
    }

    // Step 2: Create carousel post with attached_media
    const attachedMedia = mediaIds.map(id => ({ media_fbid: id }));
    
    const postParams = new URLSearchParams({
      access_token: pageAccessToken,
      message: caption || '',
      attached_media: JSON.stringify(attachedMedia)
    });

    const postResponse = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}/feed?${postParams.toString()}`,
      { method: 'POST' }
    );

    const postData = await postResponse.json();

    if (postData.id) {
      console.log('✅ Published Facebook carousel:', postData.id);
      return {
        success: true,
        postId: postData.id,
        mediaIds
      };
    } else {
      throw new Error('Failed to create carousel post');
    }
  } catch (error) {
    console.error('❌ Facebook carousel creation failed:', error.message);
    throw error;
  }
}

/**
 * Validate LinkedIn access token before posting
 * @param {string} accessToken - The LinkedIn access token to validate
 * @returns {Promise<{valid: boolean, error?: string, requiresReconnect?: boolean}>}
 */
async function validateLinkedInToken(accessToken) {
  try {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/token-refresh/linkedin/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken })
    });
    
    const result = await response.json();
    
    if (result.success && result.valid) {
      return { valid: true };
    } else {
      return { 
        valid: false, 
        error: result.error || 'LinkedIn token is invalid or expired',
        requiresReconnect: result.requiresReconnect || true
      };
    }
  } catch (error) {
    console.error('Error validating LinkedIn token:', error);
    return { 
      valid: false, 
      error: 'Failed to validate LinkedIn token',
      requiresReconnect: true
    };
  }
}

/**
 * Check if LinkedIn token is expiring soon (within 7 days)
 * @param {object} account - The LinkedIn account object with tokenExpiresAt
 * @returns {{isExpiring: boolean, daysLeft: number|null}}
 */
function checkLinkedInTokenExpiry(account) {
  if (!account.tokenExpiresAt) {
    return { isExpiring: false, daysLeft: null };
  }
  
  const expiryTime = new Date(account.tokenExpiresAt);
  const now = new Date();
  const daysLeft = Math.ceil((expiryTime.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  
  return {
    isExpiring: daysLeft <= 7,
    isExpired: daysLeft <= 0,
    daysLeft
  };
}

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
  getCustomer,
  showIntegration,
  updatePortfolioStatus,
  onRefreshScheduledPosts
}) {
  const fileInputRef = useRef(null);
  const isPostingRef = useRef(false); // Prevent duplicate posts immediately
  const isSchedulingRef = useRef(false); // Prevent duplicate scheduling
  const lastSubmissionIdRef = useRef(null); // Track last submission to prevent duplicates
  const submissionLockTimeRef = useRef(0); // Timestamp-based lock

  // Generate unique submission ID to prevent duplicate posts
  const generateSubmissionId = () => {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Check if a submission was recently made (within 5 minutes - increased for slow uploads)
  const isRecentSubmission = (contentId, platforms) => {
    try {
      const recentSubmissions = JSON.parse(localStorage.getItem('recentPostSubmissions') || '{}');
      const key = `${contentId}_${platforms.sort().join('_')}`;
      const lastSubmission = recentSubmissions[key];
      if (lastSubmission && Date.now() - lastSubmission.timestamp < 300000) { // 5 minutes
        console.warn(`⚠️ Blocking duplicate submission - last submission was ${Math.floor((Date.now() - lastSubmission.timestamp) / 1000)}s ago`);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // Mark a submission as completed
  const markSubmissionComplete = (contentId, platforms) => {
    try {
      const recentSubmissions = JSON.parse(localStorage.getItem('recentPostSubmissions') || '{}');
      const key = `${contentId}_${platforms.sort().join('_')}`;
      recentSubmissions[key] = { timestamp: Date.now(), platforms };
      // Clean up old entries (older than 5 minutes)
      Object.keys(recentSubmissions).forEach(k => {
        if (Date.now() - recentSubmissions[k].timestamp > 300000) {
          delete recentSubmissions[k];
        }
      });
      localStorage.setItem('recentPostSubmissions', JSON.stringify(recentSubmissions));
    } catch (e) {
      console.warn('Failed to track submission:', e);
    }
  };

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
    postType: 'feed', // added: 'feed' | 'story' | 'reel'
    location: null // { id, name, location: { city, country, latitude, longitude } }
  });
  const [submitting, setSubmitting] = useState(false);
  const [isPostingNow, setIsPostingNow] = useState(false);
  
  // Location search state
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [locationSearchResults, setLocationSearchResults] = useState([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [showLocationSearch, setShowLocationSearch] = useState(false);

  // Local state for connected accounts
  const [localAccounts, setLocalAccounts] = useState([]);
  
  // Drag and drop state for carousel reordering
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [uploadingCarousel, setUploadingCarousel] = useState(false);

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

  // Check if platform is enabled in customer's settings
  const isPlatformEnabled = useCallback((customerId, platform) => {
    if (!getCustomer) return true; // If no getCustomer function, allow all platforms
    const customer = getCustomer(customerId);
    if (!customer || !customer.platformAccess) return true; // If no platformAccess, allow all
    
    // Map platform names to platformAccess keys
    const platformMap = {
      'facebook': 'facebook',
      'instagram': 'instagram',
      'linkedin': 'linkedin',
      'youtube': 'youtube'
    };
    
    const accessKey = platformMap[platform];
    return customer.platformAccess[accessKey] !== false;
  }, [getCustomer]);

  // Check if customer has any accounts for a platform AND platform is enabled
  const hasAccountsForPlatform = (customerId, platform) => {
    const accounts = getAvailableAccountsForPlatform(customerId, platform);
    const platformEnabled = isPlatformEnabled(customerId, platform);
    return accounts.length > 0 && platformEnabled;
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

  // Drag and drop handlers for reordering carousel items
  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newImages = [...scheduleFormData.selectedImages];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    
    setScheduleFormData(prev => ({
      ...prev,
      selectedImages: newImages
    }));
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Remove specific image from carousel
  const removeImageFromCarousel = (index) => {
    setScheduleFormData(prev => ({
      ...prev,
      selectedImages: prev.selectedImages.filter((_, i) => i !== index)
    }));
  };

  // Upload multiple files for carousel
  const handleMultipleFileUpload = async (files) => {
    if (files.length === 0) return;
    
    const hasYoutube = scheduleFormData.platforms.includes('youtube');
    const maxItems = hasYoutube ? 1 : 10;
    const currentCount = scheduleFormData.selectedImages.length;
    const availableSlots = maxItems - currentCount;
    
    if (availableSlots <= 0) {
      alert(`Maximum ${maxItems} items allowed for carousel`);
      return;
    }
    
    const filesToUpload = Array.from(files).slice(0, availableSlots);
    setUploadingCarousel(true);
    
    try {
      const uploadedMedia = [];
      
      for (const file of filesToUpload) {
        if (file.size > 100 * 1024 * 1024) { // 100MB limit
          console.warn(`File ${file.name} is too large, skipping...`);
          continue;
        }
        
        try {
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/upload-base64`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
          uploadedMedia.push({ 
            url: result.publicUrl, 
            type: file.type.startsWith('video/') ? 'video' : 'image'
          });
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }
      
      if (uploadedMedia.length > 0) {
        setScheduleFormData(prev => ({
          ...prev,
          availableImages: [...prev.availableImages, ...uploadedMedia],
          selectedImages: [...prev.selectedImages, ...uploadedMedia]
        }));
      }
    } catch (error) {
      console.error('Carousel upload failed:', error);
      alert('Some files failed to upload. Please try again.');
    } finally {
      setUploadingCarousel(false);
    }
  };

  // Helper to detect video URLs
  const isVideoUrl = (url) => {
    if (!url) return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv', 'flv', 'wmv'].includes(ext);
  };

  // Search locations using Facebook Places API
  const searchLocations = async (query) => {
    if (!query || query.trim().length < 2) {
      setLocationSearchResults([]);
      return;
    }

    setSearchingLocation(true);
    
    try {
      // Get access token and available pages from Facebook/Instagram account
      let accessToken = null;
      let availablePages = [];
      let tokenSource = '';
      
      // Get from selected accounts
      for (const platform of scheduleFormData.platforms) {
        if (platform === 'facebook' || platform === 'instagram') {
          const settings = scheduleFormData.platformSettings[platform];
          if (settings?.accountId) {
            const account = getCustomerSocialAccounts(selectedContent.customerId)
              .find(acc => acc._id === settings.accountId);
            if (account?.accessToken) {
              accessToken = account.accessToken;
              availablePages = account.pages || [];
              tokenSource = `${platform} account`;
              break;
            }
          }
        }
      }
      
      // If no token from selected account, try any FB/IG account
      if (!accessToken) {
        const allAccounts = getCustomerSocialAccounts(selectedContent.customerId);
        const fbOrIgAccount = allAccounts.find(acc => 
          (acc.platform === 'facebook' || acc.platform === 'instagram') && acc.accessToken
        );
        if (fbOrIgAccount) {
          accessToken = fbOrIgAccount.accessToken;
          availablePages = fbOrIgAccount.pages || [];
          tokenSource = `${fbOrIgAccount.platform} account (fallback)`;
        }
      }

      if (!accessToken) {
        console.error('❌ No access token available for location search');
        alert('Please connect and select a Facebook or Instagram account first');
        setLocationSearchResults([]);
        setSearchingLocation(false);
        return;
      }

      console.log(`🔍 Searching in your managed pages for "${query}"...`);
      
      // Filter user's own pages by query (case-insensitive)
      const matchingPages = availablePages.filter(page => 
        page.name && page.name.toLowerCase().includes(query.toLowerCase())
      );
      
      // Get full page details with location for matching pages
      const pagesWithLocation = [];
      
      for (const page of matchingPages) {
        try {
          const response = await fetch(
            `https://graph.facebook.com/v18.0/${page.id}?fields=id,name,location,category,is_verified&access_token=${accessToken}`,
            { method: 'GET' }
          );
          
          const pageData = await response.json();
          
          if (!pageData.error && pageData.location) {
            pagesWithLocation.push(pageData);
          }
        } catch (err) {
          console.warn(`Failed to get location for page ${page.id}:`, err);
        }
      }
      
      setLocationSearchResults(pagesWithLocation);
      console.log(`✅ Found ${pagesWithLocation.length} pages with locations matching "${query}"`);
      
      if (pagesWithLocation.length === 0) {
        console.log('💡 Tip: Only your managed Facebook Pages with location data can be used');
      }
      
    } catch (error) {
      console.error('❌ Location search error:', error);
      setLocationSearchResults([]);
    } finally {
      setSearchingLocation(false);
    }
  };

  // Handle location selection
  const selectLocation = (location) => {
    setScheduleFormData(prev => ({ ...prev, location }));
    setShowLocationSearch(false);
    setLocationSearchQuery('');
    setLocationSearchResults([]);
    console.log('📍 Selected location:', location);
  };

  // Clear selected location
  const clearLocation = () => {
    setScheduleFormData(prev => ({ ...prev, location: null }));
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
        
        // Facebook Stories validation
        if (platform === 'facebook' && scheduleFormData.postType === 'story') {
          if (scheduleFormData.selectedImages.length === 0) {
            alert('Facebook Stories require at least one image or video');
            return false;
          }
          if (isScheduled) {
            alert('Facebook Stories cannot be scheduled far in advance. Please use "Post Now" for Stories.');
            return false;
          }
          // Add format validation for Stories
          const firstImage = scheduleFormData.selectedImages[0];
          if (firstImage && firstImage.url) {
            const isVideo = isVideoUrl(firstImage.url);
            if (!isVideo) {
              // Check image format for Stories
              const imageExt = firstImage.url.split('.').pop().toLowerCase();
              if (!['jpg', 'jpeg', 'png'].includes(imageExt)) {
                alert('Facebook Stories only support JPG and PNG images. Please select a different image or convert the format.');
                return false;
              }
            }
          }
          // Warning about Stories availability
          const confirmStory = window.confirm(
            'Facebook Stories may not be available for all page types. If Stories posting fails, the system will automatically fallback to a regular Facebook post. Continue?'
          );
          if (!confirmStory) {
            return false;
          }
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

    // Prevent scheduling for video posts on Facebook/Instagram (except Stories)
    if (isScheduled) {
      for (const platform of scheduleFormData.platforms) {
        if ((platform === 'facebook' || platform === 'instagram') && scheduleFormData.selectedImages.length > 0) {
          const isVideo = isVideoUrl(scheduleFormData.selectedImages[0]?.url);
          const isStory = scheduleFormData.postType === 'story';
          if (isVideo && !isStory) {
            alert('Scheduled video posts are not supported for Facebook or Instagram Feed. Please use "Post Now" for video content or post as Stories.');
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
        postType: scheduleFormData.postType,
        location: scheduleFormData.location // Add location data
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
        
        // Mark as carousel if multiple images
        if (scheduleFormData.selectedImages.length > 1) {
          postData.useCarouselService = true;
        }
        
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

    // Prevent duplicate submissions
    if (isSchedulingRef.current) {
      console.warn('⚠️ Schedule already in progress, ignoring duplicate click');
      return;
    }
    isSchedulingRef.current = true;

    setSubmitting(true);
    try {
      // 🔥 VALIDATE LINKEDIN TOKEN BEFORE SCHEDULING
      if (scheduleFormData.platforms.includes('linkedin')) {
        const linkedinSettings = scheduleFormData.platformSettings['linkedin'];
        const linkedinAccount = getCustomerSocialAccounts(selectedContent.customerId)
          .find(acc => acc._id === linkedinSettings.accountId);
        
        if (linkedinAccount) {
          console.log('🔍 Validating LinkedIn token before scheduling...');
          
          // Check token expiry first
          const expiryCheck = checkLinkedInTokenExpiry(linkedinAccount);
          if (expiryCheck.isExpired) {
            alert(`❌ Your LinkedIn access token has expired. Please ask the customer to reconnect their LinkedIn account in their integration settings.`);
            setSubmitting(false);
            isSchedulingRef.current = false;
            return;
          }
          
          if (expiryCheck.isExpiring) {
            const proceed = window.confirm(
              `⚠️ LinkedIn token expires in ${expiryCheck.daysLeft} days. The scheduled post may fail if the token expires before the scheduled time. Would you like to continue anyway?\n\nRecommendation: Ask the customer to reconnect their LinkedIn account to refresh the token.`
            );
            if (!proceed) {
              setSubmitting(false);
              isSchedulingRef.current = false;
              return;
            }
          }
          
          // Validate token is actually working
          const validation = await validateLinkedInToken(linkedinAccount.accessToken);
          if (!validation.valid) {
            alert(`❌ LinkedIn token validation failed: ${validation.error}\n\nPlease ask the customer to reconnect their LinkedIn account in their integration settings.`);
            setSubmitting(false);
            isSchedulingRef.current = false;
            return;
          }
          console.log('✅ LinkedIn token validated successfully');
        }
      }

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
      isSchedulingRef.current = false;
    }
  };

  const handlePostNow = async () => {
    if (!validatePostData(false)) return;

    // LAYER 1: Ref-based lock (fastest)
    if (isPostingRef.current) {
      console.warn('⚠️ Post already in progress (ref lock), ignoring duplicate click');
      return;
    }

    // LAYER 2: Timestamp-based lock (prevents rapid clicks even if ref resets)
    const now = Date.now();
    if (now - submissionLockTimeRef.current < 5000) {
      console.warn('⚠️ Post submission too recent (time lock), ignoring duplicate click');
      return;
    }

    // LAYER 3: Check localStorage for recent identical submissions
    if (isRecentSubmission(selectedContent?.id, scheduleFormData.platforms)) {
      alert('This content was recently posted. Please wait before posting again.');
      return;
    }

    // Set all locks
    isPostingRef.current = true;
    submissionLockTimeRef.current = now;

    // Generate unique request ID to prevent duplicate processing
    const submissionId = generateSubmissionId();
    lastSubmissionIdRef.current = submissionId;
    const requestId = `post_${submissionId}`;
    console.log('🆔 Generated request ID:', requestId);

    setIsPostingNow(true);
    try {
      // 🔥 VALIDATE LINKEDIN TOKEN BEFORE POSTING
      if (scheduleFormData.platforms.includes('linkedin')) {
        const linkedinSettings = scheduleFormData.platformSettings['linkedin'];
        const linkedinAccount = getCustomerSocialAccounts(selectedContent.customerId)
          .find(acc => acc._id === linkedinSettings.accountId);
        
        if (linkedinAccount) {
          console.log('🔍 Validating LinkedIn token before posting...');
          
          // Check token expiry first
          const expiryCheck = checkLinkedInTokenExpiry(linkedinAccount);
          if (expiryCheck.isExpired) {
            alert(`❌ Your LinkedIn access token has expired. Please ask the customer to reconnect their LinkedIn account in their integration settings.`);
            setIsPostingNow(false);
            isPostingRef.current = false;
            return;
          }
          
          // Validate token is actually working
          const validation = await validateLinkedInToken(linkedinAccount.accessToken);
          if (!validation.valid) {
            alert(`❌ LinkedIn token validation failed: ${validation.error}\n\nPlease ask the customer to reconnect their LinkedIn account in their integration settings.`);
            setIsPostingNow(false);
            isPostingRef.current = false;
            return;
          }
          console.log('✅ LinkedIn token validated successfully');
        }
      }

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

          // Add unique request ID to prevent duplicate processing
          postData.requestId = `${requestId}_${postData.platform}`;

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
        // Mark submission as complete to prevent re-submission
        markSubmissionComplete(selectedContent?.id, scheduleFormData.platforms);
        onRefreshScheduledPosts();
        onClose();
      }
    } catch (error) {
      console.error('Post now error:', error);
      alert(`Failed to publish posts: ${error.message}`);
    } finally {
      setIsPostingNow(false); // Ensure loader always stops
      isPostingRef.current = false; // Reset the ref
      // Note: submissionLockTimeRef is intentionally NOT reset - keeps 5 second cooldown
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
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="p-3 sm:p-4">
          {/* Modal Header - Compact */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <div className="p-1.5 sm:p-2 bg-gradient-to-r from-[#00E5FF] to-[#0066CC] rounded-lg shadow">
                <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">Post to Platforms</h2>
                <p className="text-[10px] sm:text-xs text-gray-500 hidden sm:block">Schedule or publish immediately</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-900 p-1.5 rounded-lg hover:bg-gray-100 transition-all"
            >
              <XCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          <div className="space-y-3">
            {/* Platform Selection - Compact */}
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-3 sm:p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Select Platforms</label>
              <div className="grid grid-cols-2 gap-2">
                {/* Facebook */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center p-2 sm:p-3 border-2 rounded-lg transition-all ${
                  scheduleFormData.platforms.includes('facebook') 
                    ? 'border-blue-500 bg-blue-50 shadow-sm cursor-pointer' 
                    : hasAccountsForPlatform(selectedContent?.customerId, 'facebook')
                    ? 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                    : 'border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60'
                }`} title={!isPlatformEnabled(selectedContent?.customerId, 'facebook') ? 'Platform disabled by admin' : ''}>
                  <input
                    type="checkbox"
                    name="platforms"
                    value="facebook"
                    checked={scheduleFormData.platforms.includes('facebook')}
                    onChange={() => hasAccountsForPlatform(selectedContent?.customerId, 'facebook') && handlePlatformToggle('facebook')}
                    disabled={!hasAccountsForPlatform(selectedContent?.customerId, 'facebook')}
                    className="sr-only"
                  />
                  <div className="flex items-center w-full">
                    <Facebook className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-xs sm:text-sm">Facebook</span>
                      {!isPlatformEnabled(selectedContent?.customerId, 'facebook') && (
                        <div className="text-[10px] text-red-600">Disabled by admin</div>
                      )}
                      {isPlatformEnabled(selectedContent?.customerId, 'facebook') && !hasAccountsForPlatform(selectedContent?.customerId, 'facebook') && (
                        <div className="text-[10px] text-orange-600">Not connected</div>
                      )}
                      {hasAccountsForPlatform(selectedContent?.customerId, 'facebook') && (
                        <div className="flex items-center">
                          <span className="text-[10px] text-green-700 font-medium flex items-center">
                            <Check className="h-3 w-3 text-green-600 mr-0.5" />Connected
                          </span>
                        </div>
                      )}
                    </div>
                    {scheduleFormData.platforms.includes('facebook') && (
                      <Check className="h-4 w-4 text-blue-600 ml-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 sm:mt-0">
                    {!hasAccountsForPlatform(selectedContent?.customerId, 'facebook') ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); showIntegration('facebook', selectedContent?.customerId, getCustomerName(selectedContent?.customerId)); }}
                        className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] hover:bg-blue-700"
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
                              if (window.confirm(`Disconnect Facebook (${connected[0].name})?`)) {
                                await disconnectSocialAccount(connected[0]._id, null, handleLocalDisconnect);
                              }
                            }}
                            className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-red-600"
                          >
                            Disconnect
                          </button>
                        ) : null;
                      })()
                    )}
                  </div>
                </label>

                {/* Instagram */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center p-2 sm:p-3 border-2 rounded-lg transition-all ${
                  scheduleFormData.platforms.includes('instagram') 
                    ? 'border-pink-500 bg-pink-50 shadow-sm cursor-pointer' 
                    : getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length > 0 && isPlatformEnabled(selectedContent?.customerId, 'instagram')
                    ? 'border-gray-200 hover:border-pink-400 hover:bg-pink-50/50 cursor-pointer'
                    : 'border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60'
                }`} title={!isPlatformEnabled(selectedContent?.customerId, 'instagram') ? 'Platform disabled by admin' : ''}>
                  <input
                    type="checkbox"
                    name="platforms"
                    value="instagram"
                    checked={scheduleFormData.platforms.includes('instagram')}
                    onChange={() => getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length > 0 && isPlatformEnabled(selectedContent?.customerId, 'instagram') && handlePlatformToggle('instagram')}
                    disabled={getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length === 0 || !isPlatformEnabled(selectedContent?.customerId, 'instagram')}
                    className="sr-only"
                  />
                  <div className="flex items-center w-full">
                    <Instagram className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-xs sm:text-sm">Instagram</span>
                      {!isPlatformEnabled(selectedContent?.customerId, 'instagram') && (
                        <div className="text-[10px] text-red-600">Disabled by admin</div>
                      )}
                      {isPlatformEnabled(selectedContent?.customerId, 'instagram') && getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length === 0 && (
                        <div className="text-[10px] text-orange-600">Not connected</div>
                      )}
                      {getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length > 0 && isPlatformEnabled(selectedContent?.customerId, 'instagram') && (
                        <div className="flex items-center">
                          <span className="text-[10px] text-green-700 font-medium flex items-center">
                            <Check className="h-3 w-3 text-green-600 mr-0.5" />Connected
                          </span>
                        </div>
                      )}
                    </div>
                    {scheduleFormData.platforms.includes('instagram') && (
                      <Check className="h-4 w-4 text-pink-600 ml-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 sm:mt-0">
                    {getAvailableAccountsForPlatform(selectedContent?.customerId, 'instagram').length === 0 ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); showIntegration('instagram', selectedContent?.customerId, getCustomerName(selectedContent?.customerId)); }}
                        className="bg-pink-600 text-white px-2 py-0.5 rounded text-[10px] hover:bg-pink-700"
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
                              if (window.confirm(`Disconnect Instagram (${connected[0].name})?`)) {
                                await disconnectSocialAccount(connected[0]._id, null, handleLocalDisconnect);
                              }
                            }}
                            className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-red-600"
                          >
                            Disconnect
                          </button>
                        ) : null;
                      })()
                    )}
                  </div>
                </label>

                {/* YouTube */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center p-2 sm:p-3 border-2 rounded-lg transition-all ${
                  scheduleFormData.platforms.includes('youtube') 
                    ? 'border-red-500 bg-red-50 shadow-sm cursor-pointer' 
                    : hasAccountsForPlatform(selectedContent?.customerId, 'youtube')
                    ? 'border-gray-200 hover:border-red-400 hover:bg-red-50/50 cursor-pointer'
                    : 'border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60'
                }`} title={!isPlatformEnabled(selectedContent?.customerId, 'youtube') ? 'Platform disabled by admin' : ''}>
                  <input
                    type="checkbox"
                    name="platforms"
                    value="youtube"
                    checked={scheduleFormData.platforms.includes('youtube')}
                    onChange={() => hasAccountsForPlatform(selectedContent?.customerId, 'youtube') && handlePlatformToggle('youtube')}
                    disabled={!hasAccountsForPlatform(selectedContent?.customerId, 'youtube')}
                    className="sr-only"
                  />
                  <div className="flex items-center w-full">
                    <Youtube className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-xs sm:text-sm">YouTube</span>
                      {!isPlatformEnabled(selectedContent?.customerId, 'youtube') && (
                        <div className="text-[10px] text-red-600">Disabled by admin</div>
                      )}
                      {isPlatformEnabled(selectedContent?.customerId, 'youtube') && !hasAccountsForPlatform(selectedContent?.customerId, 'youtube') && (
                        <div className="text-[10px] text-orange-600">Not available</div>
                      )}
                      {hasAccountsForPlatform(selectedContent?.customerId, 'youtube') && (
                        <div className="flex items-center">
                          <span className="text-[10px] text-green-700 font-medium flex items-center">
                            <Check className="h-3 w-3 text-green-600 mr-0.5" />Connected
                          </span>
                        </div>
                      )}
                    </div>
                    {scheduleFormData.platforms.includes('youtube') && (
                      <Check className="h-4 w-4 text-red-600 ml-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 sm:mt-0">
                    {!hasAccountsForPlatform(selectedContent?.customerId, 'youtube') ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); showIntegration('youtube', selectedContent?.customerId, getCustomerName(selectedContent?.customerId)); }}
                        className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] hover:bg-red-700"
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
                              if (window.confirm(`Disconnect YouTube (${connected[0].name})?`)) {
                                await disconnectSocialAccount(connected[0]._id, null, handleLocalDisconnect);
                              }
                            }}
                            className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-red-600"
                          >
                            Disconnect
                          </button>
                        ) : null;
                      })()
                    )}
                  </div>
                </label>

                {/* LinkedIn */}
                <label className={`flex flex-col sm:flex-row items-start sm:items-center p-2 sm:p-3 border-2 rounded-lg transition-all ${
                  scheduleFormData.platforms.includes('linkedin') 
                    ? 'border-blue-500 bg-blue-50 shadow-sm cursor-pointer' 
                    : hasAccountsForPlatform(selectedContent?.customerId, 'linkedin')
                    ? 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50 cursor-pointer'
                    : 'border-gray-200 bg-gray-50/50 cursor-not-allowed opacity-60'
                }`} title={!isPlatformEnabled(selectedContent?.customerId, 'linkedin') ? 'Platform disabled by admin' : ''}>
                  <input
                    type="checkbox"
                    name="platforms"
                    value="linkedin"
                    checked={scheduleFormData.platforms.includes('linkedin')}
                    onChange={() => hasAccountsForPlatform(selectedContent?.customerId, 'linkedin') && handlePlatformToggle('linkedin')}
                    disabled={!hasAccountsForPlatform(selectedContent?.customerId, 'linkedin')}
                    className="sr-only"
                  />
                  <div className="flex items-center w-full">
                    <Linkedin className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium text-gray-900 text-xs sm:text-sm">LinkedIn</span>
                      {!isPlatformEnabled(selectedContent?.customerId, 'linkedin') && (
                        <div className="text-[10px] text-red-600">Disabled by admin</div>
                      )}
                      {isPlatformEnabled(selectedContent?.customerId, 'linkedin') && !hasAccountsForPlatform(selectedContent?.customerId, 'linkedin') && (
                        <div className="text-[10px] text-orange-600">Not connected</div>
                      )}
                      {hasAccountsForPlatform(selectedContent?.customerId, 'linkedin') && (
                        <div className="flex items-center">
                          <span className="text-[10px] text-green-700 font-medium flex items-center">
                            <Check className="h-3 w-3 text-green-600 mr-0.5" />Connected
                          </span>
                        </div>
                      )}
                    </div>
                    {scheduleFormData.platforms.includes('linkedin') && (
                      <Check className="h-4 w-4 text-blue-600 ml-1" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-1 sm:mt-0">
                    {!hasAccountsForPlatform(selectedContent?.customerId, 'linkedin') ? (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); showIntegration('linkedin', selectedContent?.customerId, getCustomerName(selectedContent?.customerId)); }}
                        className="bg-blue-600 text-white px-2 py-0.5 rounded text-[10px] hover:bg-blue-700"
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
                              if (window.confirm(`Disconnect LinkedIn (${connected[0].name})?`)) {
                                await disconnectSocialAccount(connected[0]._id, null, handleLocalDisconnect);
                              }
                            }}
                            className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] hover:bg-red-600"
                          >
                            Disconnect
                          </button>
                        ) : null;
                      })()
                    )}
                  </div>
                </label>
              </div>
              
              {scheduleFormData.platforms.length > 0 && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs text-green-800 font-medium">
                    Selected: {scheduleFormData.platforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                  </p>
                  {scheduleFormData.platforms.includes('youtube') && scheduleFormData.platforms.length > 1 && (
                    <p className="text-[10px] text-orange-600 mt-0.5">
                      ⚠️ YouTube only supports single video
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Platform-specific Account Selection - Compact */}
            {scheduleFormData.platforms.length > 0 && (
              <div className="space-y-2">
                {scheduleFormData.platforms.map(platform => (
                  <div key={platform} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2 capitalize flex items-center">
                      {platform === 'facebook' && <Facebook className="h-4 w-4 text-blue-600 mr-1.5" />}
                      {platform === 'instagram' && <Instagram className="h-4 w-4 text-pink-600 mr-1.5" />}
                      {platform === 'youtube' && <Youtube className="h-4 w-4 text-red-600 mr-1.5" />}
                      {platform === 'linkedin' && <Linkedin className="h-4 w-4 text-blue-600 mr-1.5" />}
                      {platform} Settings
                    </h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Account
                        </label>
                        <select
                          value={scheduleFormData.platformSettings[platform]?.accountId || ''}
                          onChange={(e) => updatePlatformSetting(platform, 'accountId', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="">Choose account</option>
                          {getAvailableAccountsForPlatform(selectedContent?.customerId, platform).map(account => (
                            <option key={account._id} value={account._id}>
                              {account.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Page Selection for Facebook/Instagram */}
                      {(platform === 'facebook' || platform === 'instagram') && scheduleFormData.platformSettings[platform]?.accountId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Page</label>
                          <select
                            value={scheduleFormData.platformSettings[platform]?.pageId || ''}
                            onChange={(e) => updatePlatformSetting(platform, 'pageId', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Choose page</option>
                            {(() => {
                              const selectedAccount = getCustomerSocialAccounts(selectedContent?.customerId)
                                .find(acc => acc._id === scheduleFormData.platformSettings[platform]?.accountId);
                              return selectedAccount?.pages?.map(page => (
                                <option key={page.id} value={page.id}>
                                  {page.name}
                                  {!page.accessToken && ' ⚠️'}
                                  {platform === 'instagram' && !page.instagramBusinessAccount && ' (No IG)'}
                                </option>
                              )) || [];
                            })()}
                          </select>
                        </div>
                      )}

                      {/* Channel Selection for YouTube */}
                      {platform === 'youtube' && scheduleFormData.platformSettings[platform]?.accountId && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Channel</label>
                          <select
                            value={scheduleFormData.platformSettings[platform]?.channelId || ''}
                            onChange={(e) => updatePlatformSetting(platform, 'channelId', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            required
                          >
                            <option value="">Choose channel</option>
                            {(() => {
                              const selectedAccount = getCustomerSocialAccounts(selectedContent?.customerId)
                                .find(acc => acc._id === scheduleFormData.platformSettings[platform]?.accountId);
                              return selectedAccount?.channels?.map(channel => (
                                <option key={channel.id} value={channel.id}>
                                  {channel.name}
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

            {/* Content Section - Compact */}
            <div className="space-y-3">
              {/* Caption */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Caption</label>
                <textarea
                  value={scheduleFormData.caption}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, caption: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Write your post caption..."
                />
              </div>

              {/* Hashtags */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1 flex items-center">
                  <Hash className="h-4 w-4 mr-1" />
                  Hashtags
                </label>
                <textarea
                  value={scheduleFormData.hashtags}
                  onChange={(e) => setScheduleFormData(prev => ({ ...prev, hashtags: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="#example #hashtags"
                />
              </div>

              {/* Location Selection (Facebook & Instagram only) - Compact */}
              {(scheduleFormData.platforms.includes('facebook') || scheduleFormData.platforms.includes('instagram')) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1 flex items-center">
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Location (Optional)
                  </label>

                  {/* Selected Location Display */}
                  {scheduleFormData.location ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <svg className="h-4 w-4 text-blue-600 mr-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          <div className="min-w-0">
                            <span className="font-medium text-gray-900 text-sm truncate block">{scheduleFormData.location.name}</span>
                            {scheduleFormData.location.location && (
                              <span className="text-xs text-gray-600">
                                {scheduleFormData.location.location.city && `${scheduleFormData.location.location.city}, `}
                                {scheduleFormData.location.location.country}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearLocation}
                          className="ml-2 text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowLocationSearch(!showLocationSearch)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-left text-sm text-gray-500 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center"
                    >
                      <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Search location
                    </button>
                  )}

                  {/* Location Search Interface - Compact */}
                  {showLocationSearch && !scheduleFormData.location && (
                    <div className="mt-2 bg-gray-50 border border-gray-300 rounded-lg p-3">
                      <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded text-[10px] text-blue-800">
                        💡 Only your managed Facebook Pages with location data can be used
                      </div>
                      
                      <div className="relative mb-2">
                        <input
                          type="text"
                          value={locationSearchQuery}
                          onChange={(e) => {
                            setLocationSearchQuery(e.target.value);
                            searchLocations(e.target.value);
                          }}
                          placeholder="Search pages..."
                          className="w-full border border-gray-300 rounded-lg px-3 py-1.5 pr-8 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {searchingLocation && (
                          <div className="absolute right-2 top-2">
                            <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Search Results */}
                      {locationSearchResults.length > 0 && (
                        <div className="max-h-40 overflow-y-auto space-y-1 mb-2">
                          {locationSearchResults.map((location) => (
                            <button
                              key={location.id}
                              type="button"
                              onClick={() => selectLocation(location)}
                              className="w-full text-left p-2 bg-white border border-gray-200 rounded hover:border-blue-400 hover:bg-blue-50 transition-all"
                            >
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-gray-900 text-sm">{location.name}</span>
                                {location.is_verified && (
                                  <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                              {location.location && (
                                <div className="text-xs text-gray-600">
                                  {location.location.city && `${location.location.city}, `}
                                  {location.location.country}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}

                      {locationSearchQuery.length >= 2 && !searchingLocation && locationSearchResults.length === 0 && (
                        <div className="text-center py-2 text-gray-500">
                          <p className="text-xs">No matching pages found</p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setShowLocationSearch(false);
                          setLocationSearchQuery('');
                          setLocationSearchResults([]);
                        }}
                        className="w-full text-xs text-gray-600 hover:text-gray-800 py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Media Selection - Compact */}
            {scheduleFormData.platforms.some(p => ['facebook', 'instagram', 'youtube', 'linkedin'].includes(p)) && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block text-sm font-semibold text-gray-900 mb-2 flex items-center flex-wrap gap-1">
                  Media
                  {(scheduleFormData.platforms.includes('youtube') || scheduleFormData.platforms.includes('instagram')) && 
                    <span className="text-red-500">*</span>}
                  {scheduleFormData.platforms.includes('youtube') && (
                    <span className="text-[10px] text-orange-600 font-normal">(Single video)</span>
                  )}
                  {scheduleFormData.platforms.some(p => ['facebook', 'instagram', 'linkedin'].includes(p)) && 
                    scheduleFormData.availableImages.length > 1 && (
                    <span className="text-[10px] text-gray-500 font-normal">(Carousel: 2-10)</span>
                  )}
                </label>
                
                {/* Available Media from Version */}
                {scheduleFormData.availableImages.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">
                        Available ({scheduleFormData.availableImages.length})
                      </span>
                      <div className="flex gap-1">
                        {scheduleFormData.availableImages.length > 1 && !scheduleFormData.platforms.includes('youtube') && (
                          <button
                            type="button"
                            onClick={selectAllImages}
                            className="text-[10px] px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Select All
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={clearAllImages}
                          className="text-[10px] px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
                      {scheduleFormData.availableImages.map((media, index) => {
                        const isSelected = scheduleFormData.selectedImages.some(item => item.url === media.url);
                        const selectionOrder = scheduleFormData.selectedImages.findIndex(item => item.url === media.url);
                        
                        return (
                          <div 
                            key={`${media.url}-${index}`}
                            className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-blue-500 shadow-md ring-1 ring-blue-200' 
                                : 'border-gray-300 hover:border-blue-400'
                            }`}
                            onClick={() => toggleImageSelection(media)}
                          >
                            {media.type === 'video' || isVideoUrl(media.url) ? (
                              <div className="w-full h-14 sm:h-16 bg-gray-200 flex items-center justify-center">
                                <Video className="h-4 w-4 text-gray-500" />
                              </div>
                            ) : (
                              <img 
                                src={media.url} 
                                alt={`Media ${index + 1}`}
                                className="w-full h-14 sm:h-16 object-cover"
                                loading="lazy"
                              />
                            )}
                            
                            {/* Selection Indicator */}
                            <div className={`absolute top-0.5 right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold transition-all ${
                              isSelected 
                                ? 'bg-blue-500 text-white shadow' 
                                : 'bg-white/80 text-gray-600 border border-gray-300'
                            }`}>
                              {isSelected ? <Check className="h-2.5 w-2.5" /> : <span>{index + 1}</span>}
                            </div>
                            
                            {/* Selection Order */}
                            {isSelected && (
                              <div className="absolute top-0.5 left-0.5 bg-blue-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shadow">
                                {selectionOrder + 1}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    
                    {scheduleFormData.selectedImages.length > 0 && (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                        <span className="text-xs font-medium text-blue-800">
                          {scheduleFormData.selectedImages.length} selected
                          {scheduleFormData.selectedImages.length > 1 && !scheduleFormData.platforms.includes('youtube') && ' (Carousel)'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {scheduleFormData.availableImages.length === 0 && (
                  <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mr-1.5 flex-shrink-0" />
                      <span className="text-xs text-yellow-800">No media available</span>
                    </div>
                  </div>
                )}

                {/* Carousel Builder - Selected Media with Drag & Drop - Compact */}
                {scheduleFormData.selectedImages.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-xs font-medium text-gray-700 flex items-center">
                        <MoveVertical className="h-3 w-3 mr-1" />
                        Carousel (Drag to reorder)
                      </h4>
                      <span className="text-[10px] text-gray-500">
                        {scheduleFormData.selectedImages.length}/{scheduleFormData.platforms.includes('youtube') ? '1' : '10'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-6 gap-1.5">
                      {scheduleFormData.selectedImages.map((media, index) => (
                        <div
                          key={`selected-${index}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragOver={(e) => handleDragOver(e, index)}
                          onDragEnd={handleDragEnd}
                          className={`relative border-2 rounded overflow-hidden cursor-move transition-all ${
                            draggedIndex === index ? 'opacity-50 scale-95' : 'hover:shadow-md'
                          } border-blue-400 bg-white`}
                        >
                          {isVideoUrl(media.url) ? (
                            <div className="w-full h-12 sm:h-14 bg-gray-800 flex items-center justify-center">
                              <Video className="h-3 w-3 text-white" />
                            </div>
                          ) : (
                            <img 
                              src={media.url} 
                              alt={`Carousel ${index + 1}`}
                              className="w-full h-12 sm:h-14 object-cover"
                              loading="lazy"
                            />
                          )}
                          
                          <div className="absolute top-0 left-0 bg-blue-600 text-white w-4 h-4 rounded-br flex items-center justify-center text-[8px] font-bold">
                            {index + 1}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => removeImageFromCarousel(index)}
                            className="absolute top-0 right-0 bg-red-500 text-white w-4 h-4 rounded-bl flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Additional Media Upload - Compact */}
                <div className="border border-dashed border-gray-300 rounded-lg p-3 text-center hover:border-blue-400 transition-all">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={scheduleFormData.platforms.includes('youtube') ? "video/*" : "image/*,video/*"}
                    multiple={!scheduleFormData.platforms.includes('youtube')}
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        if (files.length === 1) {
                          handleImageUpload(files[0]);
                        } else {
                          handleMultipleFileUpload(files);
                        }
                      }
                    }}
                    className="hidden"
                  />
                  {uploadingCarousel ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin mb-1" />
                      <span className="text-xs text-gray-600">Uploading...</span>
                    </div>
                  ) : (
                    <>
                      {/* Post type selector for Instagram and Facebook - Compact */}
                      {(scheduleFormData.platforms.includes('instagram') || scheduleFormData.platforms.includes('facebook')) && (
                        <div className="flex items-center justify-center gap-3 mb-2 flex-wrap">
                          <label className="text-xs flex items-center gap-1">
                            <input
                              type="radio"
                              name="postType"
                              value="feed"
                              checked={scheduleFormData.postType === 'feed'}
                              onChange={() => setScheduleFormData(prev => ({ ...prev, postType: 'feed' }))}
                              className="form-radio h-3 w-3"
                            />
                            Feed
                          </label>
                          {scheduleFormData.platforms.includes('instagram') && (
                            <>
                              <label className="text-xs flex items-center gap-1">
                                <input
                                  type="radio"
                                  name="postType"
                                  value="story"
                                  checked={scheduleFormData.postType === 'story'}
                                  onChange={() => setScheduleFormData(prev => ({ ...prev, postType: 'story' }))}
                                  className="form-radio h-3 w-3"
                                />
                                Story
                              </label>
                              <label className="text-xs flex items-center gap-1">
                                <input
                                  type="radio"
                                  name="postType"
                                  value="reel"
                                  checked={scheduleFormData.postType === 'reel'}
                                  onChange={() => setScheduleFormData(prev => ({ ...prev, postType: 'reel' }))}
                                  className="form-radio h-3 w-3"
                                />
                                Reel
                              </label>
                            </>
                          )}
                          {scheduleFormData.platforms.includes('facebook') && (
                            <label className="text-xs flex items-center gap-1">
                              <input
                                type="radio"
                                name="postType"
                                value="story"
                                checked={scheduleFormData.postType === 'story'}
                                onChange={() => setScheduleFormData(prev => ({ ...prev, postType: 'story' }))}
                                className="form-radio h-3 w-3"
                              />
                              FB Story
                            </label>
                          )}
                        </div>
                      )}
                      <Upload className="h-5 w-5 mx-auto mb-1 text-gray-400" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                      >
                        {scheduleFormData.platforms.includes('youtube') ? 'Upload Video' : 'Upload Files'}
                      </button>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {scheduleFormData.platforms.includes('youtube') ? 'Max 100MB' : '2-10 items, Max 100MB each'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Date and Time for Scheduling - Compact */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
              <label className="block text-sm font-semibold text-gray-900 mb-2">Schedule Time (Optional)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={scheduleFormData.scheduledDate}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={scheduleFormData.scheduledTime}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons - Mobile Optimized */}
            <div className="flex flex-col gap-2 pt-3 border-t border-gray-200 sticky bottom-0 bg-white pb-1">
              <div className="flex gap-2">
                <button
                  onClick={handlePostNow}
                  disabled={isPostingNow || submitting || scheduleFormData.platforms.length === 0}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2.5 px-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 text-sm"
                >
                  {isPostingNow ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Publishing...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      <span>Post Now</span>
                      {scheduleFormData.platforms.length > 0 && (
                        <span className="text-[10px] opacity-80">({scheduleFormData.platforms.length})</span>
                      )}
                    </>
                  )}
                </button>
                <button
                  onClick={handleSchedulePost}
                  disabled={submitting || isPostingNow || scheduleFormData.platforms.length === 0}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2.5 px-3 rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="hidden sm:inline">Scheduling...</span>
                      <span className="sm:hidden">...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Schedule</span>
                      {scheduleFormData.platforms.length > 0 && (
                        <span className="text-[10px] opacity-80">({scheduleFormData.platforms.length})</span>
                      )}
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-all text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(SchedulePostModal);