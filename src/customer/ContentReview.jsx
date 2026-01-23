import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, CheckCircle, Edit3, Trash2, Move, ChevronLeft, ChevronRight, Image, Video, AlertCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

function ContentReview() {
    // Scheduled posts state
    const [scheduledPosts, setScheduledPosts] = useState([]);
    const [scheduledPostsLoading, setScheduledPostsLoading] = useState(false);
    const [scheduledPostsError, setScheduledPostsError] = useState(null);
    // Fetch scheduled posts on mount
    useEffect(() => {
      const fetchScheduledPosts = async () => {
        setScheduledPostsLoading(true);
        setScheduledPostsError(null);
        try {
          const res = await fetch('/api/scheduled-posts');
          if (!res.ok) throw new Error('Failed to fetch scheduled posts');
          const data = await res.json();
          setScheduledPosts(Array.isArray(data) ? data : []);
        } catch (err) {
          setScheduledPostsError(err.message);
          setScheduledPosts([]);
        } finally {
          setScheduledPostsLoading(false);
        }
      };
      fetchScheduledPosts();
    }, []);
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedContentIndex, setSelectedContentIndex] = useState(0);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const [contentItems, setContentItems] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get logged-in customer info from localStorage (like in ContentCalendar)
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }

  const customerId = user?.id || user?._id;
  const customerEmail = user?.email;

  console.log('Current user:', user);
  console.log('Customer ID:', customerId);
  console.log('Customer Email:', customerEmail);

  useEffect(() => {
    if (customerId || customerEmail) {
      fetchContentSubmissions();
    } else {
      setError('User not authenticated');
      setLoading(false);
    }
  }, [customerId, customerEmail]);

  // Fetch comments for the selected version when content or version changes
  useEffect(() => {
    if (selectedContent && selectedContent.versions && selectedContent.versions[selectedVersionIndex]) {
      const version = selectedContent.versions[selectedVersionIndex];
      // Load comments from the version data
      setComments(version.comments || []);
    } else {
      setComments([]);
    }
    setActiveComment(null);
    setSelectedMediaIndex(0); // Reset media index when version changes
  }, [selectedContent, selectedVersionIndex]);

  // Add new useEffect to filter comments by media index
  useEffect(() => {
    // Filter comments for the currently selected media item
    const filteredComments = comments.filter(comment => {
      // If comment has mediaIndex, use it; otherwise assume it's for media index 0 (backward compatibility)
      const commentMediaIndex = comment.mediaIndex !== undefined ? comment.mediaIndex : 0;
      return commentMediaIndex === selectedMediaIndex;
    });
    setCommentsForCurrentMedia(filteredComments);
  }, [comments, selectedMediaIndex]);

  const fetchContentSubmissions = async () => {
    setLoading(true);
    setError(null);
    try {
      const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      if (!submissionsRes.ok) {
        throw new Error(`HTTP error! status: ${submissionsRes.status}`);
      }
      let submissions = await submissionsRes.json();
      if (!Array.isArray(submissions)) {
        throw new Error('Invalid data received');
      }
      console.log('All submissions:', submissions);

      // Filter submissions to only those belonging to the logged-in customer
      const filteredSubmissions = submissions.filter(sub => {
        // Check multiple possible fields for customer identification
        let matches = false;
        // Match by customer_id (user._id or user.id)
        if (user && (user._id || user.id) && sub.customer_id && (sub.customer_id === user._id || sub.customer_id === user.id)) {
          matches = true;
          console.log('✅ Match by customer_id');
        }
        // Match by customer_email
        else if (user && user.email && sub.customer_email && sub.customer_email === user.email) {
          matches = true;
          console.log('✅ Match by customer_email');
        }
        // Match by created_by (fallback)
        else if (user && user.email && sub.created_by && sub.created_by === user.email && !sub.customer_id && !sub.customer_email) {
          matches = true;
          console.log('✅ Match by created_by (fallback)');
        } else {
          console.log('❌ No match found', { subId: sub._id, sub });
        }
        return matches;
      });

      console.log('Filtered submissions:', filteredSubmissions);

      if (filteredSubmissions.length === 0) {
        setContentItems([]);
        setSelectedContent(null);
        setLoading(false);
        return;
      }

      // Group submissions by assignment ID to handle versions
      const groupedSubmissions = {};
      filteredSubmissions.forEach(submission => {
        const assignmentId = submission.assignment_id || submission.assignmentId || 'unknown';
        if (!groupedSubmissions[assignmentId]) {
          groupedSubmissions[assignmentId] = [];
        }
        groupedSubmissions[assignmentId].push(submission);
      });

      // Create content items with versions
      const contentData = [];
      Object.keys(groupedSubmissions).forEach(assignmentId => {
        const versions = groupedSubmissions[assignmentId].sort((a, b) =>
          new Date(a.created_at) - new Date(b.created_at)
        );
        const baseItem = versions[0];
        contentData.push({
          id: assignmentId,
          title: baseItem.caption || 'Untitled Post',
          description: baseItem.notes || '',
          createdBy: baseItem.created_by || 'Unknown',
          createdAt: baseItem.created_at || '',
          status: baseItem.status || 'under_review',
          platform: baseItem.platform || 'Instagram',
          type: baseItem.type || 'Post',
          customer_id: baseItem.customer_id,
          customer_name: baseItem.customer_name,
          customer_email: baseItem.customer_email,
          versions: versions.map((version, index) => ({
            id: version._id,
            versionNumber: index + 1,
            media: normalizeMedia(version.media || version.images || []),
            caption: version.caption || '',
            notes: version.notes || '',
            createdAt: version.created_at,
            comments: version.comments || []
          })),
          totalVersions: versions.length
        });
      });

      console.log('Final content data:', contentData);

      setContentItems(contentData);
      if (contentData.length > 0) {
        setSelectedContent(contentData[0]);
        setSelectedVersionIndex(contentData[0].versions.length - 1); // Show latest version by default
      }
    } catch (err) {
      console.error('Failed to fetch content submissions:', err);
      setError(err.message);
      setContentItems([]);
      setSelectedContent(null);
    } finally {
      setLoading(false);
    }
  };

  // Add helper function to normalize media URLs
  const normalizeMedia = (media) => {
    if (!media || !Array.isArray(media)) return [];
    
    return media.map(item => {
      // If item is already a string (URL), convert to object
      if (typeof item === 'string') {
        return {
          url: item,
          type: getMediaType(item)
        };
      }
      
      // If item is an object with url property
      if (item && typeof item === 'object') {
        const url = item.url || item.src || item.href || String(item);
        
        // Validate URL is actually a string
        if (typeof url === 'string' && url.trim()) {
          return {
            url: url,
            type: item.type || getMediaType(url)
          };
        }
      }
      
      return null;
    }).filter(Boolean); // Remove any null/invalid entries
  };

  // Add helper function to determine media type
  const getMediaType = (url) => {
    if (!url || typeof url !== 'string') return 'image';
    
    const extension = url.toLowerCase().split('.').pop();
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
    
    return videoExtensions.includes(extension) ? 'video' : 'image';
  };

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/customer/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsUserMenuOpen(false);
  };

  const Button = ({ onClick, children, style, variant = 'primary', size = 'md' }) => {
    const variants = {
      primary: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white',
      success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white',
      warning: 'bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white',
      danger: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white',
      info: 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white'
    };

    const sizes = {
      sm: 'px-2 py-1 text-[10px]',
      md: 'px-2.5 py-1.5 text-xs',
      lg: 'px-4 py-2 text-sm'
    };

    return (
      <button
        onClick={onClick}
        className={`${variants[variant]} ${sizes[size]} rounded-md font-medium transition-all duration-150 shadow-sm hover:shadow focus:outline-none focus:ring-1 focus:ring-offset-1 inline-flex items-center justify-center`}
        style={style}
      >
        {children}
      </button>
    );
  };

  const handleImageClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (commentsForCurrentMedia.some((c) => c.editing)) return;
    
    const newComment = {
      id: uuidv4(),
      x,
      y,
      comment: "",
      editing: true,
      done: false,
      repositioning: false,
      versionId: selectedContent.versions[selectedVersionIndex]?.id,
      versionNumber: selectedContent.versions[selectedVersionIndex]?.versionNumber || 1,
      mediaIndex: selectedMediaIndex, // Associate comment with current media item
      timestamp: new Date().toISOString()
    };
    setComments([...comments, newComment]);
    setCommentsForCurrentMedia([...commentsForCurrentMedia, newComment]);
    setActiveComment(newComment.id);
  };

  const handleCommentChange = (id, text) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, comment: text } : c)));
    setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, comment: text } : c)));
  };

  const handleCommentSubmit = async (id) => {
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment && comment.comment.trim()) {
      try {
        // Prepare comment object to save
        const newCommentObj = {
          id: comment.id,
          comment: comment.comment,
          position: { x: comment.x, y: comment.y },
          mediaIndex: selectedMediaIndex, // Include media index
          timestamp: comment.timestamp,
          status: 'active'
        };

        // Use the assignment ID directly from selectedContent
        const assignmentId = selectedContent.id;
        const versionId = selectedContent.versions[selectedVersionIndex]?.id;

        console.log('Submitting comment:', { assignmentId, versionId, comment: newCommentObj });

        // Save comment to backend: PATCH the submission to add comment to the correct version
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(assignmentId)}/comment`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            versionId: versionId,
            comment: newCommentObj
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Comment saved successfully:', result);
          
          // Update the local state to reflect the saved comment
          setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setActiveComment(null);
          
          // Store current selection before refresh
          const currentIndex = selectedContentIndex;
          const currentVersionIndex = selectedVersionIndex;
          const currentMediaIndex = selectedMediaIndex;
          
          // Refresh the content submissions to get updated data
          await fetchContentSubmissions();
          
          // Restore the selection after refresh
          setSelectedContentIndex(currentIndex);
          setSelectedVersionIndex(currentVersionIndex);
          setSelectedMediaIndex(currentMediaIndex);
        } else {
          const errorData = await response.json();
          console.error('Failed to save comment:', errorData);
          // Still update UI even if save fails
          setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setActiveComment(null);
        }
      } catch (error) {
        console.error('Error saving comment:', error);
        // Update UI state
        setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
        setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, editing: false } : c)));
        setActiveComment(null);
      }
    }
  };

  const handleCommentCancel = (id) => {
    setComments(comments.filter((c) => c.id !== id));
    setCommentsForCurrentMedia(commentsForCurrentMedia.filter((c) => c.id !== id));
    setActiveComment(null);
  };

  const handleMarkDone = async (id) => {
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment) {
      try {
        // Update comment status on backend
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${comment.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            done: true,
            status: 'completed'
          })
        });

        if (response.ok) {
          setComments(comments.map((c) => (c.id === id ? { ...c, done: true } : c)));
          setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, done: true } : c)));
          setActiveComment(null);
        } else {
          console.error('Failed to update comment status');
          // Still update UI
          setComments(comments.map((c) => (c.id === id ? { ...c, done: true } : c)));
          setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, done: true } : c)));
          setActiveComment(null);
        }
      } catch (error) {
        console.error('Error updating comment:', error);
        setComments(comments.map((c) => (c.id === id ? { ...c, done: true } : c)));
        setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, done: true } : c)));
        setActiveComment(null);
      }
    }
  };

  const handleEditComment = (id) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, editing: true, done: false } : c)));
    setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, editing: true, done: false } : c)));
    setActiveComment(id);
  };

  const handleRepositionStart = (id) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, repositioning: true } : c)));
    setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, repositioning: true } : c)));
    setActiveComment(id);
  };

  const handleImageClickWithReposition = (e) => {
    const repositioningComment = commentsForCurrentMedia.find((c) => c.repositioning);
    if (repositioningComment) {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setComments(
        comments.map((c) =>
          c.id === repositioningComment.id ? { ...c, x, y, repositioning: false } : c
        )
      );
      setCommentsForCurrentMedia(
        commentsForCurrentMedia.map((c) =>
          c.id === repositioningComment.id ? { ...c, x, y, repositioning: false } : c
        )
      );
      setActiveComment(null);
      return;
    }
    handleImageClick(e);
  };

  const handleCommentListClick = (id) => {
    setActiveComment(activeComment === id ? null : id);
  };

  // When selecting a new content item, reset comments to those from the latest version
  const handleContentSelect = (item, index) => {
    setSelectedContent(item);
    setSelectedContentIndex(index);
    setSelectedVersionIndex(item.versions.length - 1); // Show latest version
    setSelectedMediaIndex(0); // Reset media index
    setComments(item.versions[item.versions.length - 1].comments || []);
    setActiveComment(null);
  };

  // When changing version, update comments to those for that version
  const handleVersionChange = (direction) => {
    let newIndex = selectedVersionIndex;
    if (direction === 'prev' && selectedVersionIndex > 0) {
      newIndex = selectedVersionIndex - 1;
    } else if (direction === 'next' && selectedVersionIndex < selectedContent.versions.length - 1) {
      newIndex = selectedVersionIndex + 1;
    }
    setSelectedVersionIndex(newIndex);
    setSelectedMediaIndex(0); // Reset media index
    setComments(selectedContent.versions[newIndex].comments || []);
    setActiveComment(null);
  };

  const handleMediaChange = (direction) => {
    const currentVersion = selectedContent.versions[selectedVersionIndex];
    const mediaLength = currentVersion.media.length;
    
    if (direction === 'prev' && selectedMediaIndex > 0) {
      setSelectedMediaIndex(selectedMediaIndex - 1);
    } else if (direction === 'next' && selectedMediaIndex < mediaLength - 1) {
      setSelectedMediaIndex(selectedMediaIndex + 1);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Published status detection logic (now also checks scheduled_posts DB)
  const isContentPublished = (contentOrId) => {
    const content = typeof contentOrId === 'object' ? contentOrId : selectedContent;
    if (!content) return false;
    // Check scheduledPosts for published status
    if (scheduledPosts && scheduledPosts.length > 0) {
      // Try to match by assignmentId, item_id, or contentId
      const match = scheduledPosts.find(post => {
        return (
          (post.assignmentId && (post.assignmentId === content.id || post.assignmentId === content.assignment_id)) ||
          (post.assignmentId && post.assignmentId === content.assignment_id) ||
          (post.item_id && post.item_id === content.id) ||
          (post.contentId && post.contentId === content.id) ||
          (post.assignmentId && post.assignmentId === content.id)
        );
      });
      if (match && (match.status === 'published' || !!match.publishedAt)) {
        return true;
      }
    }
    // Fallback to local logic
    if (
      content.status === 'published' ||
      content.published === true ||
      !!content.publishedAt
    ) return true;
    if (Array.isArray(content.versions) && content.versions.length > 0) {
      const latestVersion = content.versions[content.versions.length - 1];
      if (
        latestVersion.status === 'published' ||
        latestVersion.published === true ||
        !!latestVersion.publishedAt
      ) return true;
      return content.versions.some(
        v =>
          v.status === 'published' ||
          v.published === true ||
          !!v.publishedAt
      );
    }
    return false;
  };

  // Get the appropriate status to display (checks latest version first)
  const getDisplayStatus = (content) => {
    if (!content) return 'under_review';
    if (isContentPublished(content)) return 'published';
    // If not published, show latest version's status if available
    if (Array.isArray(content.versions) && content.versions.length > 0) {
      const latestVersion = content.versions[content.versions.length - 1];
      return latestVersion.status || content.status || 'under_review';
    }
    return content.status || 'under_review';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'under_review':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'published':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'under_review':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'published':
        return 'Published';
      default:
        return 'Pending';
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-3 border-indigo-200 border-t-indigo-600 mx-auto mb-3"></div>
          <p className="text-slate-800 font-semibold text-sm sm:text-base">Loading content...</p>
          <p className="text-slate-500 text-xs mt-1">Please wait</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto p-4 sm:p-6">
          <div className="bg-rose-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600" />
          </div>
          <h2 className="text-rose-700 font-bold text-base sm:text-lg mb-2">Error Loading</h2>
          <p className="text-slate-600 text-xs sm:text-sm mb-4 leading-relaxed">{error}</p>
          <Button onClick={fetchContentSubmissions} variant="primary">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Handle no content state
  if (contentItems.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto p-4 sm:p-6">
          <div className="bg-gradient-to-br from-indigo-100 to-blue-100 rounded-xl w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-indigo-600" />
          </div>
          <h2 className="text-slate-800 font-bold text-lg sm:text-xl mb-2">No Submissions</h2>
          <p className="text-slate-600 text-xs sm:text-sm mb-4 leading-relaxed">
            {user ? `No content for ${user.name || user.email}` : 'Please log in'}
          </p>
          {!user && (
            <Button onClick={() => navigate('/customer/login')} variant="primary">
              Login
            </Button>
          )}
        </div>
      </div>
    );
  }

  const currentVersion = selectedContent.versions[selectedVersionIndex];
  const currentMedia = currentVersion?.media?.[selectedMediaIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Content */}
      <div className="px-2 sm:px-4 lg:px-8 xl:px-16 py-3 sm:py-6 lg:py-10">
        <div className="flex flex-col xl:flex-row gap-3 sm:gap-6 lg:gap-8 font-sans">
          {/* Left Sidebar - Content List */}
          <div className="w-full xl:w-80 flex-shrink-0">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-3 sm:px-4 py-3 sm:py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 sticky top-0 z-10">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <span className="hidden sm:inline">Content Items</span>
                  <span className="sm:hidden">Items</span>
                  <span className="ml-auto px-2 py-0.5 sm:px-2.5 sm:py-1 bg-indigo-600 text-white rounded-full text-xs font-semibold">
                    {contentItems.length}
                  </span>
                </h3>
                {user && (
                  <p className="text-xs text-slate-600 mt-1 truncate">
                    {user.name || user.email}
                  </p>
                )}
              </div>
              
              <div className="max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
                {contentItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-2.5 sm:p-3 cursor-pointer transition-all duration-200 border-b border-slate-100 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 ${
                      selectedContentIndex === index
                        ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-l-4 border-l-indigo-600'
                        : ''
                    }`}
                    onClick={() => handleContentSelect(item, index)}
                  >
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate leading-tight">{item.title}</h4>
                        <p className="text-xs text-slate-600 mt-1 line-clamp-1 sm:line-clamp-2 leading-relaxed hidden sm:block">{item.description}</p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-1.5 sm:mt-2">
                          <span className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full text-[10px] sm:text-xs font-semibold border ${getStatusColor(getDisplayStatus(item))}`}>
                            {getStatusLabel(getDisplayStatus(item))}
                          </span>
                          <span className="text-[10px] sm:text-xs text-slate-600 font-medium">{item.platform}</span>
                          <span className="text-[10px] sm:text-xs text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded-full">
                            v{item.totalVersions}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px] sm:text-xs text-slate-400">
                          <span className="truncate">{item.createdBy}</span>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Panel */}
            <div className="mt-3 sm:mt-4 lg:mt-6 bg-white rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-slate-200 overflow-hidden">
              <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-blue-50 sticky top-0 z-10">
                <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
                  <div className="w-6 h-6 sm:w-7 sm:h-7 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white" />
                  </div>
                  Comments
                  <span className="text-[10px] sm:text-xs font-medium text-slate-500 ml-auto">M{selectedMediaIndex + 1}</span>
                  <span className="px-1.5 py-0.5 sm:px-2 sm:py-0.5 bg-indigo-600 text-white rounded-full text-[10px] sm:text-xs font-semibold">
                    {commentsForCurrentMedia.length}
                  </span>
                </h3>
              </div>
              
              <div className="max-h-48 sm:max-h-64 lg:max-h-80 overflow-y-auto p-2 sm:p-3">
                {commentsForCurrentMedia.length === 0 ? (
                  <div className="text-center py-4 sm:py-6">
                    <div className="bg-gradient-to-br from-slate-100 to-blue-100 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center mx-auto mb-2">
                      <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium text-xs sm:text-sm">No comments yet</p>
                    <p className="text-slate-400 text-[10px] sm:text-xs mt-0.5">Tap media to add</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {commentsForCurrentMedia.map((comment, index) => (
                      <div
                        key={comment.id}
                        className={`p-2 sm:p-2.5 rounded-lg cursor-pointer transition-all duration-200 border ${
                          activeComment === comment.id
                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                            : 'bg-gray-50/50 hover:bg-gray-100/50 border-gray-200/50'
                        }`}
                        onClick={() => handleCommentListClick(comment.id)}
                      >
                        <div className="flex items-start space-x-2">
                          <span className="font-bold text-blue-600 bg-blue-100 rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 break-words line-clamp-2">
                              {comment.comment}
                              {comment.done && (
                                <span className="ml-1 text-green-600 text-[10px] font-semibold">✓</span>
                              )}
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

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-md sm:shadow-lg border border-[#0a2342]/10 overflow-hidden">
              {/* Content Header */}
              <div className="px-3 sm:px-5 lg:px-8 py-3 sm:py-4 lg:py-6 border-b border-[#bae6fd] bg-gradient-to-r from-[#e6f2fb] to-[#bae6fd]">
                <div className="flex flex-col gap-2 sm:gap-3">
                  <div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 tracking-tight line-clamp-2">{selectedContent.title}</h2>
                    <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-1 line-clamp-2 hidden sm:block">{selectedContent.description}</p>
                    <div className="flex items-center mt-1.5 sm:mt-2 space-x-2 sm:space-x-3 text-[10px] sm:text-xs">
                      <span className="text-slate-700 font-medium truncate max-w-[100px] sm:max-w-none">{selectedContent.createdBy}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-700 font-medium">{selectedContent.platform}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold border ${getStatusColor(getDisplayStatus(selectedContent))}`}>
                      {getStatusLabel(getDisplayStatus(selectedContent))}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
                      <Image className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />
                      {selectedContent.totalVersions} Ver.
                    </span>
                  </div>
                </div>
              </div>

              {/* Version Controls */}
              {selectedContent.totalVersions > 1 && (
                <div className="px-3 sm:px-5 lg:px-8 py-2.5 sm:py-3 lg:py-4 border-b border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800">
                        V{currentVersion?.versionNumber}/{selectedContent.totalVersions}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">{formatDate(currentVersion?.createdAt)}</p>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => handleVersionChange('prev')}
                        disabled={selectedVersionIndex === 0}
                        className="p-1.5 sm:p-2 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-slate-200"
                      >
                        <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700" />
                      </button>
                      <span className="px-2 py-1 sm:px-3 sm:py-1.5 bg-white rounded-lg border border-slate-200 text-[10px] sm:text-xs font-semibold text-slate-800">
                        {selectedVersionIndex + 1}/{selectedContent.totalVersions}
                      </span>
                      <button
                        onClick={() => handleVersionChange('next')}
                        disabled={selectedVersionIndex === selectedContent.totalVersions - 1}
                        className="p-1.5 sm:p-2 rounded-lg bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-slate-200"
                      >
                        <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Media with Comments */}
              <div className="p-2 sm:p-4 lg:p-6">
                <div className="flex justify-center mb-3 sm:mb-6">
                  <div className="relative inline-block max-w-full w-full">
                    {/* Media Navigation for multiple items */}
                    {currentVersion?.media && currentVersion.media.length > 1 && (
                      <div className="flex items-center justify-between mb-3 sm:mb-4 bg-slate-50 rounded-lg p-2 sm:p-3 border border-slate-200">
                        <span className="text-[10px] sm:text-xs font-semibold text-slate-700">
                          {selectedMediaIndex + 1}/{currentVersion.media.length}
                        </span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleMediaChange('prev')}
                            disabled={selectedMediaIndex === 0}
                            className="p-1.5 sm:p-2 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-slate-300"
                          >
                            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700" />
                          </button>
                          <button
                            onClick={() => handleMediaChange('next')}
                            disabled={selectedMediaIndex === currentVersion.media.length - 1}
                            className="p-1.5 sm:p-2 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all border border-slate-300"
                          >
                            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-700" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Current Media Display */}
                    {currentMedia ? (
                      currentMedia.url && typeof currentMedia.url === 'string' ? (
                        currentMedia.type === 'image' ? (
                          <img
                            src={currentMedia.url}
                            alt={`${selectedContent.title} - Version ${currentVersion?.versionNumber} - Media ${selectedMediaIndex + 1}`}
                            className="max-w-full w-full sm:w-auto h-auto max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-2xl border border-gray-200/50 object-contain cursor-crosshair mx-auto"
                            onClick={handleImageClickWithReposition}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <video
                            src={currentMedia.url}
                            controls
                            className="max-w-full w-full sm:w-auto h-auto max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] rounded-lg sm:rounded-xl lg:rounded-2xl shadow-lg sm:shadow-2xl border border-gray-200/50 object-contain cursor-crosshair mx-auto"
                            onClick={handleImageClickWithReposition}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        )
                      ) : null
                    ) : null}
                    
                    {/* Fallback for invalid/missing media */}
                    <div 
                      className="max-w-full h-48 sm:h-64 lg:h-96 bg-gray-200 rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center border border-gray-200/50"
                      style={{ 
                        display: (currentMedia?.url && typeof currentMedia.url === 'string') ? 'none' : 'flex' 
                      }}
                    >
                      <div className="text-center">
                        <Image className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-xs sm:text-sm">No media available</p>
                      </div>
                    </div>

                    {/* Media Thumbnails */}
                    {currentVersion?.media && currentVersion.media.length > 1 && (
                      <div className="flex justify-center gap-1 sm:gap-2 mt-2 sm:mt-3 flex-wrap">
                        {currentVersion.media.map((media, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedMediaIndex(index)}
                            className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-md sm:rounded-lg overflow-hidden border-2 transition-all ${
                              selectedMediaIndex === index 
                                ? 'border-purple-500 ring-1 sm:ring-2 ring-purple-200' 
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            {media.type === 'image' && media.url && typeof media.url === 'string' ? (
                              <img
                                src={media.url}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                <Video className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                              </div>
                            )}
                            {/* Fallback for failed thumbnails */}
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center" style={{ display: 'none' }}>
                              <Video className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Comment Markers - Only show on images or videos when they support it */}
                    {currentMedia && (
                      commentsForCurrentMedia.map((comment, index) => {
                        // Calculate floating box position - use a safer approach without querySelector
                        let boxLeft = 30;
                        let boxRight = "auto";
                        
                        // Use a more reliable method to determine position
                        // Instead of querySelector with potentially invalid selectors, use a default calculation
                        const commentX = comment.x || comment.position?.x || 0;
                        const commentY = comment.y || comment.position?.y || 0;
                        
                        // Simple heuristic: if comment is more than halfway across, show box on left
                        if (commentX > 200) { // Adjusted for mobile
                          boxLeft = "auto";
                          boxRight = 30;
                        }

                        return (
                          <div
                            key={comment.id}
                            style={{
                              position: "absolute",
                              top: commentY - 12,
                              left: commentX - 12,
                              width: 24,
                              height: 24,
                              background: comment.done ? "#10b981" : comment.editing ? "#3b82f6" : "#ef4444",
                              color: "#fff",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "bold",
                              fontSize: "11px",
                              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                              cursor: "pointer",
                              zIndex: 2,
                              border: "2px solid #fff",
                              transition: "all 0.2s",
                            }}
                            onMouseEnter={() => setHoveredComment(comment.id)}
                            onMouseLeave={() => setHoveredComment(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCommentListClick(comment.id);
                            }}
                          >
                            {index + 1}
                            
                            {/* Floating Comment Box */}
                            {(comment.editing || activeComment === comment.id || hoveredComment === comment.id) && (
                              <div
                                style={{
                                  position: "absolute",
                                  left: boxLeft,
                                  right: boxRight,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  background: "#fff",
                                  border: "1px solid #3b82f6",
                                  borderRadius: "8px",
                                  padding: "10px",
                                  minWidth: "180px",
                                  maxWidth: "220px",
                                  zIndex: 10,
                                  boxShadow: "0 4px 20px rgba(59,130,246,0.15)",
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {comment.editing ? (
                                  <>
                                    <textarea
                                      value={comment.comment}
                                      onChange={(e) => handleCommentChange(comment.id, e.target.value)}
                                      placeholder="Add comment..."
                                      className="w-full p-2 border border-gray-200 rounded-md resize-none text-xs text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                                      rows={2}
                                      autoFocus
                                    />
                                    <div className="flex gap-1.5 mt-2">
                                      <Button
                                        onClick={() => handleCommentSubmit(comment.id)}
                                        variant="success"
                                        size="sm"
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        onClick={() => handleCommentCancel(comment.id)}
                                        variant="danger"
                                        size="sm"
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="mb-2">
                                      <p className="font-medium text-gray-900 text-xs leading-relaxed break-words">
                                        {comment.comment}
                                        {comment.done && <span className="text-green-600 ml-1 text-[10px]">✓</span>}
                                        {comment.repositioning && (
                                          <span className="text-blue-600 italic ml-1 text-[10px]">(Moving...)</span>
                                        )}
                                      </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-1">
                                      {!comment.done && (
                                        <Button
                                          onClick={() => handleMarkDone(comment.id)}
                                          variant="success"
                                          size="sm"
                                        >
                                          <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                                          Done
                                        </Button>
                                      )}
                                      <Button
                                        onClick={() => handleEditComment(comment.id)}
                                        variant="warning"
                                        size="sm"
                                      >
                                        <Edit3 className="h-2.5 w-2.5 mr-0.5" />
                                        Edit
                                      </Button>
                                      <Button
                                        onClick={() => handleCommentCancel(comment.id)}
                                        variant="danger"
                                        size="sm"
                                      >
                                        <Trash2 className="h-2.5 w-2.5 mr-0.5" />
                                        Del
                                      </Button>
                                      <Button
                                        onClick={() => handleRepositionStart(comment.id)}
                                        variant="info"
                                        size="sm"
                                      >
                                        <Move className="h-2.5 w-2.5 mr-0.5" />
                                        Move
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Version Details */}
                {currentVersion && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-700 mb-1.5 tracking-wide">Caption</label>
                      <div className="bg-slate-50 rounded-lg p-2.5 sm:p-3 lg:p-4 border border-slate-200">
                        <p className="text-slate-900 text-xs sm:text-sm leading-relaxed line-clamp-3 sm:line-clamp-none">{currentVersion.caption || 'No caption'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] sm:text-xs font-bold text-slate-700 mb-1.5 tracking-wide">Notes</label>
                      <div className="bg-slate-50 rounded-lg p-2.5 sm:p-3 lg:p-4 border border-slate-200">
                        <p className="text-slate-900 text-xs sm:text-sm leading-relaxed line-clamp-3 sm:line-clamp-none">{currentVersion.notes || 'No notes'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {/* Removed Approve Content and Request Changes buttons */}
                {/*
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button
                    onClick={() => navigate(`/customer/approve/${selectedContent.id}`)}
                    variant="success"
                    size="lg"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Approve Content
                  </Button>
                  <Button
                    onClick={() => {
                      console.log('Request changes for:', selectedContent.id);
                    }}
                    variant="warning"
                    size="lg"
                  >
                    <Edit3 className="h-5 w-5 mr-2" />
                    Request Changes
                  </Button>
                </div>
                */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {isUserMenuOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsUserMenuOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default ContentReview;