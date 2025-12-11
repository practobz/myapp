import React, { useState } from 'react';
import { Edit, Trash2, Loader2, ExternalLink, AlertCircle } from 'lucide-react';

const SocialActionManager = ({ post, onPostUpdate }) => {
  const [actionLoading, setActionLoading] = useState(false);

  // Delete post from Facebook
  const handleDeleteFromFacebook = async () => {
    if (!post.facebookPostId) return;
    if (!window.confirm('Are you sure you want to delete this post from Facebook?')) return;
    
    setActionLoading(true);
    try {
      const payload = {
        facebookPostId: post.facebookPostId,
        customerId: post.customerId || post.userId,
      };
      
      // Include page info if available
      if (post.pageId) payload.pageId = post.pageId;
      if (post.pageAccessToken) payload.pageAccessToken = post.pageAccessToken;
      
      console.log('🗑️ Attempting to delete Facebook post:', payload);
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/facebook/delete-post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      
      const result = await response.json();
      console.log('🗑️ Delete response:', result);
      
      if (response.ok && result.success) {
        alert('✅ Post successfully deleted from Facebook!');
        // Notify parent component of the update
        if (onPostUpdate) {
          onPostUpdate(post._id, { facebookPostId: null });
        }
      } else {
        const errorMsg = result.error || result.message || `HTTP ${response.status}`;
        console.error('❌ Delete failed:', errorMsg);
        
        if (errorMsg.toLowerCase().includes('token')) {
          alert('🔑 Facebook access token issue. Customer needs to reconnect their Facebook account.');
        } else if (errorMsg.toLowerCase().includes('not found') || errorMsg.includes('100')) {
          alert('⚠️ Post may have already been deleted from Facebook.');
          // Still update local state
          if (onPostUpdate) {
            onPostUpdate(post._id, { facebookPostId: null });
          }
        } else {
          alert(`❌ Failed to delete from Facebook: ${errorMsg}`);
        }
      }
    } catch (e) {
      console.error('❌ Delete error:', e);
      alert(`❌ Error deleting from Facebook: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit post on Facebook
  const handleEditFacebookPost = async () => {
    if (!post.facebookPostId) return;
    
    const currentContent = post.caption || '';
    const newMessage = window.prompt('Enter new Facebook post content:', currentContent);
    
    if (newMessage === null) {
      // User cancelled
      return;
    }
    
    if (newMessage.trim() === '') {
      alert('❌ Post content cannot be empty.');
      return;
    }
    
    if (newMessage.trim() === currentContent.trim()) {
      alert('ℹ️ No changes detected.');
      return;
    }
    
    setActionLoading(true);
    try {
      const payload = {
        postId: post.facebookPostId,
        facebookPostId: post.facebookPostId,
        message: newMessage.trim(),
        customerId: post.customerId || post.userId,
      };
      
      if (post.pageId) payload.pageId = post.pageId;
      if (post.pageAccessToken) payload.pageAccessToken = post.pageAccessToken;
      if (post.pageName) payload.pageName = post.pageName;
      
      console.log('✏️ Attempting to edit Facebook post:', {
        postId: post.facebookPostId,
        oldMessage: currentContent,
        newMessage: newMessage.trim(),
        customerId: payload.customerId,
        pageId: post.pageId,
        hasPageToken: !!post.pageAccessToken
      });
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/facebook/edit-post`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
        }
      );
      
      console.log('✏️ Edit response status:', response.status);
      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse response JSON:', parseError);
        const responseText = await response.text();
        console.error('❌ Raw response:', responseText);
        alert(`❌ Invalid response from server. Status: ${response.status}`);
        return;
      }
      
      console.log('✏️ Edit response:', result);
      
      if (response.ok && result.success) {
        // Verify the edit was successful by checking Facebook response
        if (result.fbData && !result.fbData.error) {
          alert('✅ Facebook post successfully updated!');
          // Update local state with new content
          if (onPostUpdate) {
            onPostUpdate(post._id, { caption: newMessage.trim() });
          }
          
          // Force a page refresh to show updated content
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else {
          console.error('❌ Facebook returned error despite 200 status:', result.fbData);
          alert(`❌ Facebook API error: ${result.fbData?.error?.message || 'Unknown Facebook error'}`);
        }
      } else {
        const errorMsg = result.error || result.message || `HTTP ${response.status}`;
        console.error('❌ Edit failed:', errorMsg);
        
        if (response.status === 401 || errorMsg.toLowerCase().includes('token')) {
          alert('🔑 Facebook access token has expired. Customer needs to reconnect their Facebook account.');
        } else if (response.status === 403) {
          alert('🚫 Permission denied. Check if the app has edit permissions for this page.');
        } else if (response.status === 404) {
          alert('⚠️ Facebook post not found. It may have been deleted.');
        } else {
          alert(`❌ Failed to edit Facebook post: ${errorMsg}`);
        }
      }
    } catch (e) {
      console.error('❌ Edit error:', e);
      if (e.name === 'TypeError' && e.message.includes('fetch')) {
        alert('❌ Network error. Please check your internet connection.');
      } else {
        alert(`❌ Error editing Facebook post: ${e.message}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Delete post from Instagram
  const handleDeleteFromInstagram = async () => {
    if (!post.instagramPostId) return;
    if (!window.confirm('Are you sure you want to delete this post from Instagram?')) return;
    
    setActionLoading(true);
    try {
      const payload = {
        instagramPostId: post.instagramPostId,
        customerId: post.customerId || post.userId,
      };
      
      console.log('🗑️ Attempting to delete Instagram post:', payload);
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/instagram/delete-post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      
      const result = await response.json();
      console.log('🗑️ Instagram delete response:', result);
      
      if (response.ok && result.success) {
        alert('✅ Post successfully deleted from Instagram!');
        if (onPostUpdate) {
          onPostUpdate(post._id, { instagramPostId: null });
        }
      } else {
        const errorMsg = result.error || result.message || `HTTP ${response.status}`;
        console.error('❌ Instagram delete failed:', errorMsg);
        
        if (errorMsg.toLowerCase().includes('token')) {
          alert('🔑 Instagram access token issue. Customer needs to reconnect their Instagram account.');
        } else if (errorMsg.toLowerCase().includes('not found')) {
          alert('⚠️ Post may have already been deleted from Instagram.');
          if (onPostUpdate) {
            onPostUpdate(post._id, { instagramPostId: null });
          }
        } else {
          alert(`❌ Failed to delete from Instagram: ${errorMsg}`);
        }
      }
    } catch (e) {
      console.error('❌ Instagram delete error:', e);
      alert(`❌ Error deleting from Instagram: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit Instagram post (caption only)
  const handleEditInstagramPost = async () => {
    if (!post.instagramPostId) return;
    
    const currentContent = post.caption || '';
    const newCaption = window.prompt('Enter new Instagram caption:', currentContent);
    
    if (newCaption === null) return;
    
    if (newCaption.trim() === '') {
      alert('❌ Instagram caption cannot be empty.');
      return;
    }
    
    if (newCaption.trim() === currentContent.trim()) {
      alert('ℹ️ No changes detected.');
      return;
    }
    
    setActionLoading(true);
    try {
      const payload = {
        instagramPostId: post.instagramPostId,
        caption: newCaption.trim(),
        customerId: post.customerId || post.userId,
      };
      
      console.log('✏️ Attempting to edit Instagram post:', {
        postId: post.instagramPostId,
        oldCaption: currentContent,
        newCaption: newCaption.trim(),
        customerId: payload.customerId
      });
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/instagram/edit-post`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
        }
      );
      
      console.log('✏️ Instagram edit response status:', response.status);
      
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse Instagram response JSON:', parseError);
        const responseText = await response.text();
        console.error('❌ Raw Instagram response:', responseText);
        alert(`❌ Invalid response from server. Status: ${response.status}`);
        return;
      }
      
      console.log('✏️ Instagram edit response:', result);
      
      if (response.ok && result.success) {
        alert('✅ Instagram post caption successfully updated!');
        if (onPostUpdate) {
          onPostUpdate(post._id, { caption: newCaption.trim() });
        }
        
        // Force a page refresh to show updated content
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        const errorMsg = result.error || result.message || `HTTP ${response.status}`;
        console.error('❌ Instagram edit failed:', errorMsg);
        
        // Handle specific Instagram API limitations
        if (errorMsg.toLowerCase().includes('cannot edit') || errorMsg.toLowerCase().includes('api can be modified')) {
          alert('⚠️ This Instagram post cannot be edited. Only posts created through the Instagram API can be modified. Posts created directly on Instagram cannot be edited via API.');
        } else if (errorMsg.toLowerCase().includes('media_type') || errorMsg.toLowerCase().includes('reels') || errorMsg.toLowerCase().includes('stories')) {
          alert('⚠️ This type of Instagram post cannot be edited. Only regular image posts and carousels support caption editing.');
        } else if (response.status === 401 || errorMsg.toLowerCase().includes('token')) {
          alert('🔑 Instagram access token has expired. Customer needs to reconnect their Instagram account.');
        } else if (response.status === 403) {
          alert('🚫 Permission denied. Check if the app has edit permissions for this Instagram account.');
        } else if (response.status === 404) {
          alert('⚠️ Instagram post not found. It may have been deleted.');
        } else {
          alert(`❌ Failed to edit Instagram post: ${errorMsg}`);
        }
      }
    } catch (e) {
      console.error('❌ Instagram edit error:', e);
      if (e.name === 'TypeError' && e.message.includes('fetch')) {
        alert('❌ Network error. Please check your internet connection.');
      } else {
        alert(`❌ Error editing Instagram post: ${e.message}`);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Delete YouTube video
  const handleDeleteFromYouTube = async () => {
    if (!post.youtubePostId) return;
    if (!window.confirm('Are you sure you want to delete this video from YouTube? This action cannot be undone!')) return;
    
    setActionLoading(true);
    try {
      const payload = {
        youtubePostId: post.youtubePostId,
        customerId: post.customerId || post.userId,
      };
      
      console.log('🗑️ Attempting to delete YouTube video:', payload);
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/youtube/delete-post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      
      const result = await response.json();
      console.log('🗑️ YouTube delete response:', result);
      
      if (response.ok && result.success) {
        alert('✅ Video successfully deleted from YouTube!');
        if (onPostUpdate) {
          onPostUpdate(post._id, { youtubePostId: null });
        }
      } else {
        const errorMsg = result.error || result.message || `HTTP ${response.status}`;
        console.error('❌ YouTube delete failed:', errorMsg);
        alert(`❌ Failed to delete from YouTube: ${errorMsg}`);
      }
    } catch (e) {
      console.error('❌ YouTube delete error:', e);
      alert(`❌ Error deleting from YouTube: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Edit YouTube video (title and description)
  const handleEditYouTubePost = async () => {
    if (!post.youtubePostId) return;
    
    const currentTitle = post.title || post.caption || '';
    const currentDescription = post.description || '';
    
    const newTitle = window.prompt('Enter new YouTube video title:', currentTitle);
    if (newTitle === null) return;
    
    const newDescription = window.prompt('Enter new YouTube video description:', currentDescription);
    if (newDescription === null) return;
    
    if (newTitle.trim() === '' && newDescription.trim() === '') {
      alert('❌ Title or description cannot both be empty.');
      return;
    }
    
    setActionLoading(true);
    try {
      const payload = {
        youtubePostId: post.youtubePostId,
        title: newTitle.trim() || undefined,
        description: newDescription.trim() || undefined,
        customerId: post.customerId || post.userId,
      };
      
      console.log('✏️ Attempting to edit YouTube video:', payload);
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/youtube/edit-post`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
        }
      );
      
      const result = await response.json();
      console.log('✏️ YouTube edit response:', result);
      
      if (response.ok && result.success) {
        alert('✅ YouTube video successfully updated!');
        if (onPostUpdate) {
          onPostUpdate(post._id, { 
            title: newTitle.trim(),
            description: newDescription.trim(),
            caption: newTitle.trim() // Update caption to reflect new title
          });
        }
      } else {
        const errorMsg = result.error || result.message || `HTTP ${response.status}`;
        console.error('❌ YouTube edit failed:', errorMsg);
        alert(`❌ Failed to edit YouTube video: ${errorMsg}`);
      }
    } catch (e) {
      console.error('❌ YouTube edit error:', e);
      alert(`❌ Error editing YouTube video: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Delete LinkedIn post
  const handleDeleteFromLinkedIn = async () => {
    if (!post.linkedinPostId) return;
    if (!window.confirm('Are you sure you want to delete this post from LinkedIn?')) return;
    
    setActionLoading(true);
    try {
      const payload = {
        linkedinPostId: post.linkedinPostId,
        customerId: post.customerId || post.userId,
      };
      
      console.log('🗑️ Attempting to delete LinkedIn post:', payload);
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/linkedin/delete-post`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      
      const result = await response.json();
      console.log('🗑️ LinkedIn delete response:', result);
      
      if (response.ok && result.success) {
        alert('✅ Post successfully deleted from LinkedIn!');
        if (onPostUpdate) {
          onPostUpdate(post._id, { linkedinPostId: null });
        }
      } else {
        const errorMsg = result.error || result.message || `HTTP ${response.status}`;
        console.error('❌ LinkedIn delete failed:', errorMsg);
        alert(`❌ Failed to delete from LinkedIn: ${errorMsg}`);
      }
    } catch (e) {
      console.error('❌ LinkedIn delete error:', e);
      alert(`❌ Error deleting from LinkedIn: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // LinkedIn edit (not supported by API)
  const handleEditLinkedInPost = async () => {
    alert('⚠️ LinkedIn does not support editing published posts. This is a LinkedIn API limitation.\n\nYou can delete the post and create a new one with updated content.');
  };

  // Open Facebook post in new tab
  const handleViewOnFacebook = () => {
    if (post.facebookPostId && post.pageId) {
      // Try to construct Facebook post URL
      const fbUrl = `https://www.facebook.com/${post.pageId}/posts/${post.facebookPostId}`;
      window.open(fbUrl, '_blank');
    } else {
      alert('ℹ️ Cannot determine Facebook post URL. Missing page or post ID.');
    }
  };

  // Get platform-specific actions
  const getPlatformActions = () => {
    const actions = [];

    // Facebook actions
    if (post.facebookPostId && (post.platform === 'facebook' || post.platform === 'both')) {
      actions.push(
        <button
          key="fb-edit"
          onClick={handleEditFacebookPost}
          className="text-blue-600 hover:text-blue-800 p-1 text-xs border border-blue-200 rounded disabled:opacity-50"
          disabled={actionLoading}
          title="Edit on Facebook"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <Edit className="h-4 w-4 inline" />}
          {actionLoading ? 'Updating...' : 'Edit FB'}
        </button>,
        <button
          key="fb-delete"
          onClick={handleDeleteFromFacebook}
          className="text-red-600 hover:text-red-800 p-1 text-xs border border-red-200 rounded disabled:opacity-50"
          disabled={actionLoading}
          title="Delete from Facebook"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <Trash2 className="h-4 w-4 inline" />}
          {actionLoading ? 'Deleting...' : 'Del FB'}
        </button>
      );
    }

    // Instagram actions
    if (post.instagramPostId && (post.platform === 'instagram' || post.platform === 'both')) {
      actions.push(
        <button
          key="ig-edit"
          onClick={handleEditInstagramPost}
          className="text-pink-600 hover:text-pink-800 p-1 text-xs border border-pink-200 rounded disabled:opacity-50"
          disabled={actionLoading}
          title="Edit Instagram caption"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <Edit className="h-4 w-4 inline" />}
          {actionLoading ? 'Updating...' : 'Edit IG'}
        </button>,
        <button
          key="ig-delete"
          onClick={handleDeleteFromInstagram}
          className="text-red-600 hover:text-red-800 p-1 text-xs border border-red-200 rounded disabled:opacity-50"
          disabled={actionLoading}
          title="Delete from Instagram"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <Trash2 className="h-4 w-4 inline" />}
          {actionLoading ? 'Deleting...' : 'Del IG'}
        </button>
      );
    }

    // YouTube actions
    if (post.youtubePostId && post.platform === 'youtube') {
      actions.push(
        <button
          key="yt-edit"
          onClick={handleEditYouTubePost}
          className="text-red-600 hover:text-red-800 p-1 text-xs border border-red-200 rounded disabled:opacity-50"
          disabled={actionLoading}
          title="Edit YouTube video"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <Edit className="h-4 w-4 inline" />}
          {actionLoading ? 'Updating...' : 'Edit YT'}
        </button>,
        <button
          key="yt-delete"
          onClick={handleDeleteFromYouTube}
          className="text-red-600 hover:text-red-800 p-1 text-xs border border-red-200 rounded disabled:opacity-50"
          disabled={actionLoading}
          title="Delete from YouTube"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <Trash2 className="h-4 w-4 inline" />}
          {actionLoading ? 'Deleting...' : 'Del YT'}
        </button>
      );
    }

    // LinkedIn actions
    if (post.linkedinPostId && post.platform === 'linkedin') {
      actions.push(
        <button
          key="li-edit"
          onClick={handleEditLinkedInPost}
          className="text-blue-700 hover:text-blue-900 p-1 text-xs border border-blue-200 rounded disabled:opacity-50"
          disabled={actionLoading}
          title="LinkedIn editing not supported"
        >
          <AlertCircle className="h-4 w-4 inline" />
          Edit LI
        </button>,
        <button
          key="li-delete"
          onClick={handleDeleteFromLinkedIn}
          className="text-red-600 hover:text-red-800 p-1 text-xs border border-red-200 rounded disabled:opacity-50"
          disabled={actionLoading}
          title="Delete from LinkedIn"
        >
          {actionLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : <Trash2 className="h-4 w-4 inline" />}
          {actionLoading ? 'Deleting...' : 'Del LI'}
        </button>
      );
    }

    return actions;
  };

  const platformActions = getPlatformActions();

  // Don't render if no social media post IDs
  if (platformActions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1 flex-wrap">
      {/* View button */}
      {(post.facebookPostId && post.pageId) && (
        <button
          onClick={handleViewOnFacebook}
          className="text-gray-600 hover:text-gray-800 p-1 text-xs border border-gray-200 rounded disabled:opacity-50"
          title="View on Facebook"
        >
          <ExternalLink className="h-4 w-4 inline" />
        </button>
      )}
      
      {/* Platform-specific actions */}
      {platformActions}
    </div>
  );
};

export default SocialActionManager;
