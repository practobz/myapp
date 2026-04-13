import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, CheckCircle, Edit3, Trash2, Move, ChevronLeft, ChevronRight, Image, Video, AlertCircle, ThumbsUp, Calendar, ChevronDown, ChevronUp, Send, RotateCcw, Search, FileText, Bell } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

function ContentReview() {
  const [searchParams] = useSearchParams();
  const targetItemId = searchParams.get('itemId');
  const filterStatus = searchParams.get('filter');

    // Scheduled posts state
    const [scheduledPosts, setScheduledPosts] = useState([]);
    const [scheduledPostsLoading, setScheduledPostsLoading] = useState(false);
    const [scheduledPostsError, setScheduledPostsError] = useState(null);
    // Calendars state for checking manual publish status
    const [calendars, setCalendars] = useState([]);
    
    // Fetch scheduled posts and calendars on mount
    useEffect(() => {
      const fetchScheduledPosts = async () => {
        setScheduledPostsLoading(true);
        setScheduledPostsError(null);
        try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
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
      
      const fetchCalendars = async () => {
        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
          if (res.ok) {
            const data = await res.json();
            setCalendars(Array.isArray(data) ? data : []);
          }
        } catch (err) {
          console.error('Failed to fetch calendars:', err);
          setCalendars([]);
        }
      };
      
      fetchScheduledPosts();
      fetchCalendars();
    }, []);
  const navigate = useNavigate();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedContentIndex, setSelectedContentIndex] = useState(0);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const [contentItems, setContentItems] = useState([]);
  const [groupedContentItems, setGroupedContentItems] = useState({});
  const [collapsedCalendars, setCollapsedCalendars] = useState({});
  const [selectedContent, setSelectedContent] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Ref for image container to properly position comments
  const imageContainerRef = useRef(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0, offsetLeft: 0, offsetTop: 0 });

  // Get logged-in customer info from localStorage (like in ContentCalendar)
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }

  const customerId = user?.id || user?._id;
  const customerEmail = user?.email;

  useEffect(() => {
    if (customerId || customerEmail) {
      fetchContentSubmissions();
    } else {
      setError('User not authenticated');
      setLoading(false);
    }
  }, [customerId, customerEmail, targetItemId, filterStatus]);

  // Fetch comments for the selected version when content or version changes
  useEffect(() => {
    if (selectedContent && selectedContent.versions && selectedContent.versions[selectedVersionIndex]) {
      const version = selectedContent.versions[selectedVersionIndex];
      // Load comments from the version data and normalize them
      const normalizedComments = (version.comments || []).map(comment => ({
        ...comment,
        // Ensure x and y are at the top level for positioning
        x: comment.x ?? comment.position?.x ?? 0,
        y: comment.y ?? comment.position?.y ?? 0,
        editing: false,
        repositioning: false,
        isNew: false, // Mark as existing comment (already saved)
        done: comment.done || comment.status === 'completed' || false
      }));
      
      // Remove duplicate comments by ID (in case backend has duplicates)
      const uniqueComments = normalizedComments.filter((comment, index, self) =>
        index === self.findIndex((c) => c.id === comment.id)
      );
      
      setComments(uniqueComments);
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

      // Filter submissions to only those belonging to the logged-in customer
      const filteredSubmissions = submissions.filter(sub => {
        // Check multiple possible fields for customer identification
        let matches = false;
        // Match by customer_id (user._id or user.id)
        if (user && (user._id || user.id) && sub.customer_id && (sub.customer_id === user._id || sub.customer_id === user.id)) {
          matches = true;
        }
        // Match by customer_email
        else if (user && user.email && sub.customer_email && sub.customer_email === user.email) {
          matches = true;
        }
        // Match by created_by (fallback)
        else if (user && user.email && sub.created_by && sub.created_by === user.email && !sub.customer_id && !sub.customer_email) {
          matches = true;
        }
        return matches;
      });

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
      // Create content items with versions
const contentData = [];
Object.keys(groupedSubmissions).forEach(assignmentId => {
  const versions = groupedSubmissions[assignmentId].sort((a, b) =>
    new Date(a.created_at) - new Date(b.created_at)
  );
  const baseItem = versions[0];
  const latestVersion = versions[versions.length - 1];
  
  // Use latest version's status for the overall content status
  const currentStatus = latestVersion.status || baseItem.status || 'under_review';
  
  contentData.push({
    id: assignmentId,
    title: baseItem.caption || 'Untitled Post',
    description: baseItem.notes || '',
    createdBy: baseItem.created_by || 'Unknown',
    createdAt: baseItem.created_at || '',
    status: currentStatus,  // Now uses latest version status
    platform: baseItem.platform || 'Instagram',
    type: baseItem.type || 'Post',
    customer_id: baseItem.customer_id,
    customer_name: baseItem.customer_name,
    customer_email: baseItem.customer_email,
    // Add calendar and item info for publish status checking
    calendar_id: baseItem.calendar_id || '',
    calendar_name: baseItem.calendar_name || '',
    item_id: baseItem.item_id || '',
    item_name: baseItem.item_name || '',
    assignment_id: assignmentId,
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

      // Filter to specific item if itemId is in the URL
      // Submissions can reference calendar items via item_id, assignment_id, or id
      if (targetItemId) {
        console.log('[ContentReview] Filtering for itemId:', targetItemId);
        console.log('[ContentReview] Available items:', contentData.map(i => ({
          id: i.id, item_id: i.item_id, assignment_id: i.assignment_id, item_name: i.item_name
        })));
      }
      const displayData = targetItemId
        ? contentData.filter(item =>
            (item.item_id && item.item_id === targetItemId) ||
            (item.id && item.id === targetItemId) ||
            (item.assignment_id && item.assignment_id === targetItemId)
          )
        : filterStatus
        ? contentData.filter(item => item.status === filterStatus)
        : contentData;

      setContentItems(displayData);
      
      // Group content by calendar
      const grouped = {};
      displayData.forEach(item => {
        const calendarKey = item.calendar_name || item.calendar_id || 'Uncategorized';
        if (!grouped[calendarKey]) {
          grouped[calendarKey] = [];
        }
        grouped[calendarKey].push(item);
      });
      setGroupedContentItems(grouped);
      
      // Auto-select: always select when filtered by itemId, otherwise only if nothing selected
      if (displayData.length > 0 && (targetItemId || !selectedContent)) {
        setSelectedContent(displayData[0]);
        setSelectedVersionIndex(displayData[0].versions.length - 1); // Show latest version by default
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

  const toggleCalendarCollapse = (calendarName) => {
    setCollapsedCalendars(prev => ({
      ...prev,
      [calendarName]: !prev[calendarName]
    }));
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
      isNew: true, // Mark as new comment (not yet saved)
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
        // Use the assignment ID directly from selectedContent
        const assignmentId = selectedContent.id;
        const versionId = selectedContent.versions[selectedVersionIndex]?.id;

        // Check if this is a new comment or an edit (use isNew flag)
        const isNewComment = comment.isNew === true;
        
        let response;
        
        if (!isNewComment) {
          // Update existing comment using PUT
          response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(assignmentId)}/comments/${comment.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              comment: comment.comment,
              position: { x: comment.x, y: comment.y },
              x: comment.x,
              y: comment.y,
              mediaIndex: selectedMediaIndex,
              status: comment.status || 'active'
            })
          });
        } else {
          // Create new comment using PATCH
          const newCommentObj = {
            id: comment.id,
            comment: comment.comment,
            position: { x: comment.x, y: comment.y },
            x: comment.x,
            y: comment.y,
            mediaIndex: selectedMediaIndex,
            timestamp: comment.timestamp || new Date().toISOString(),
            status: 'active'
          };
          
          response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(assignmentId)}/comment`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              versionId: versionId,
              comment: newCommentObj
            })
          });
        }

        if (response.ok) {
          const result = await response.json();
          
          // Update the local state to reflect the saved comment
          setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setActiveComment(null);
          
          // Store current selection before refresh (use assignment ID, not index)
          const currentAssignmentId = selectedContent.id;
          const currentVersionIndex = selectedVersionIndex;
          const currentMediaIndex = selectedMediaIndex;
          
          // Refresh the content submissions to get updated data
          await fetchContentSubmissions();
          
          // Restore the selection after refresh by finding the item with the same assignment ID
          setContentItems(prevItems => {
            const itemIndex = prevItems.findIndex(item => item.id === currentAssignmentId);
            if (itemIndex !== -1) {
              setSelectedContent(prevItems[itemIndex]);
              setSelectedContentIndex(itemIndex);
              setSelectedVersionIndex(currentVersionIndex);
              setSelectedMediaIndex(currentMediaIndex);
            }
            return prevItems;
          });
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
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    // If this is a new comment (no saved comment text), remove it
    // If it's an existing comment being edited, just stop editing
    if (comment && comment.comment && comment.comment.trim() !== '') {
      // Existing comment - just cancel editing mode
      setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
      setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, editing: false } : c)));
    } else {
      // New comment - remove it
      setComments(comments.filter((c) => c.id !== id));
      setCommentsForCurrentMedia(commentsForCurrentMedia.filter((c) => c.id !== id));
    }
    setActiveComment(null);
  };

  // Handle delete comment - removes from backend and local state
  const handleDeleteComment = async (id) => {
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment) {
      try {
        // Delete comment from backend
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${comment.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          
          // Store current selection before refresh (use assignment ID, not index)
          const currentAssignmentId = selectedContent.id;
          const currentVersionIndex = selectedVersionIndex;
          const currentMediaIndex = selectedMediaIndex;
          
          // Refresh the content submissions to get updated data
          await fetchContentSubmissions();
          
          // Restore the selection after refresh by finding the item with the same assignment ID
          setContentItems(prevItems => {
            const itemIndex = prevItems.findIndex(item => item.id === currentAssignmentId);
            if (itemIndex !== -1) {
              setSelectedContent(prevItems[itemIndex]);
              setSelectedContentIndex(itemIndex);
              setSelectedVersionIndex(currentVersionIndex);
              setSelectedMediaIndex(currentMediaIndex);
            }
            return prevItems;
          });
        } else {
          console.error('Failed to delete comment from backend');
          // Still update local state
          setComments(comments.filter((c) => c.id !== id));
          setCommentsForCurrentMedia(commentsForCurrentMedia.filter((c) => c.id !== id));
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        // Update local state on error
        setComments(comments.filter((c) => c.id !== id));
        setCommentsForCurrentMedia(commentsForCurrentMedia.filter((c) => c.id !== id));
      }
      
      setActiveComment(null);
    }
  };

  // Handle image load to get dimensions for proper comment positioning
  const handleImageLoad = (e) => {
    const img = e.target;
    const container = imageContainerRef.current;
    if (img && container) {
      const containerRect = container.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      setImageDimensions({
        width: img.offsetWidth,
        height: img.offsetHeight,
        offsetLeft: imgRect.left - containerRect.left,
        offsetTop: imgRect.top - containerRect.top
      });
    }
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
    setActiveComment(null); // Close the popup when starting repositioning
  };

  const handleImageClickWithReposition = async (e) => {
    const repositioningComment = commentsForCurrentMedia.find((c) => c.repositioning);
    if (repositioningComment) {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Update local state first for immediate UI feedback
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
      
      // Save new position to backend
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${repositioningComment.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            position: { x, y },
            x,
            y
          })
        });
        
        if (response.ok) {
          
          // Store current selection before refresh (use assignment ID, not index)
          const currentAssignmentId = selectedContent.id;
          const currentVersionIndex = selectedVersionIndex;
          const currentMediaIndex = selectedMediaIndex;
          
          // Refresh the content submissions to get updated data
          await fetchContentSubmissions();
          
          // Restore the selection after refresh by finding the item with the same assignment ID
          setContentItems(prevItems => {
            const itemIndex = prevItems.findIndex(item => item.id === currentAssignmentId);
            if (itemIndex !== -1) {
              setSelectedContent(prevItems[itemIndex]);
              setSelectedContentIndex(itemIndex);
              setSelectedVersionIndex(currentVersionIndex);
              setSelectedMediaIndex(currentMediaIndex);
            }
            return prevItems;
          });
        } else {
          console.error('Failed to update comment position');
        }
      } catch (error) {
        console.error('Error updating comment position:', error);
      }
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
    // Normalize comments when selecting
    const version = item.versions[item.versions.length - 1];
    const normalizedComments = (version.comments || []).map(comment => ({
      ...comment,
      x: comment.x ?? comment.position?.x ?? 0,
      y: comment.y ?? comment.position?.y ?? 0,
      editing: false,
      repositioning: false,
      isNew: false, // Mark as existing comment
      done: comment.done || comment.status === 'completed' || false
    }));
    
    // Remove duplicate comments by ID
    const uniqueComments = normalizedComments.filter((comment, index, self) =>
      index === self.findIndex((c) => c.id === comment.id)
    );
    
    setComments(uniqueComments);
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
    // Normalize comments when changing version
    const version = selectedContent.versions[newIndex];
    const normalizedComments = (version.comments || []).map(comment => ({
      ...comment,
      x: comment.x ?? comment.position?.x ?? 0,
      y: comment.y ?? comment.position?.y ?? 0,
      editing: false,
      repositioning: false,
      isNew: false, // Mark as existing comment
      done: comment.done || comment.status === 'completed' || false
    }));
    
    // Remove duplicate comments by ID
    const uniqueComments = normalizedComments.filter((comment, index, self) =>
      index === self.findIndex((c) => c.id === comment.id)
    );
    
    setComments(uniqueComments);
    setActiveComment(null);
  };

  const handleVersionSelect = (index) => {
    if (index < 0 || index >= selectedContent.versions.length) return;
    setSelectedVersionIndex(index);
    setSelectedMediaIndex(0);
    const version = selectedContent.versions[index];
    const normalizedComments = (version.comments || []).map(comment => ({
      ...comment,
      x: comment.x ?? comment.position?.x ?? 0,
      y: comment.y ?? comment.position?.y ?? 0,
      editing: false,
      repositioning: false,
      isNew: false,
      done: comment.done || comment.status === 'completed' || false
    }));
    const uniqueComments = normalizedComments.filter((comment, idx, self) =>
      idx === self.findIndex((c) => c.id === comment.id)
    );
    setComments(uniqueComments);
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

  // State for approve loading
  const [approvingContent, setApprovingContent] = useState(false);
  const [sendingToCreator, setSendingToCreator] = useState(false);
  const [undoingApprove, setUndoingApprove] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('content'); // 'content' | 'calendars' | 'comments'
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [expandedCalendars, setExpandedCalendars] = useState({});

  // Handle send to creator - updates status to 'sent_to_creator'
  const handleSendToCreator = async () => {
    if (!selectedContent) return;
    setSendingToCreator(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'sent_to_creator',
            sentToCreatorAt: new Date().toISOString(),
            approvalNotes: 'Feedback sent to creator by customer'
          })
        }
      );
      if (response.ok) {
        const currentAssignmentId = selectedContent.id;
        const currentVersionIndex = selectedVersionIndex;
        const currentMediaIndex = selectedMediaIndex;
        await fetchContentSubmissions();
        setContentItems(prevItems => {
          const itemIndex = prevItems.findIndex(item => item.id === currentAssignmentId);
          if (itemIndex !== -1) {
            setSelectedContent(prevItems[itemIndex]);
            setSelectedContentIndex(itemIndex);
            setSelectedVersionIndex(currentVersionIndex);
            setSelectedMediaIndex(currentMediaIndex);
          }
          return prevItems;
        });
      } else {
        alert('Failed to send feedback to creator. Please try again.');
      }
    } catch (error) {
      console.error('Error sending to creator:', error);
      alert('Error sending feedback. Please try again.');
    } finally {
      setSendingToCreator(false);
    }
  };

  // Handle undo approve - reverts status back to 'under_review'
  const handleUndoApprove = async () => {
    if (!selectedContent) return;
    setUndoingApprove(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'under_review',
            approvalNotes: 'Approval reverted by customer'
          })
        }
      );
      if (response.ok) {
        const currentAssignmentId = selectedContent.id;
        const currentVersionIndex = selectedVersionIndex;
        const currentMediaIndex = selectedMediaIndex;
        await fetchContentSubmissions();
        setContentItems(prevItems => {
          const itemIndex = prevItems.findIndex(item => item.id === currentAssignmentId);
          if (itemIndex !== -1) {
            setSelectedContent(prevItems[itemIndex]);
            setSelectedContentIndex(itemIndex);
            setSelectedVersionIndex(currentVersionIndex);
            setSelectedMediaIndex(currentMediaIndex);
          }
          return prevItems;
        });
      } else {
        alert('Failed to undo approval. Please try again.');
      }
    } catch (error) {
      console.error('Error undoing approval:', error);
      alert('Error undoing approval. Please try again.');
    } finally {
      setUndoingApprove(false);
    }
  };

  // Handle approve content - updates status to 'approved' on backend
  const handleApproveContent = async () => {
    if (!selectedContent) return;
    
    setApprovingContent(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'approved',
            approvedAt: new Date().toISOString(),
            approvalNotes: 'Approved by customer'
          })
        }
      );

      if (response.ok) {
        alert('Content approved successfully!');
        
        // Store current selection before refreshing data
        const currentAssignmentId = selectedContent.id;
        const currentVersionIndex = selectedVersionIndex;
        const currentMediaIndex = selectedMediaIndex;
        
        // Refetch all data from backend to ensure consistency
        await fetchContentSubmissions();
        
        // Restore selection after data refresh
        setContentItems(prevItems => {
          const itemIndex = prevItems.findIndex(item => item.id === currentAssignmentId);
          if (itemIndex !== -1) {
            setSelectedContent(prevItems[itemIndex]);
            setSelectedContentIndex(itemIndex);
            setSelectedVersionIndex(currentVersionIndex);
            setSelectedMediaIndex(currentMediaIndex);
          }
          return prevItems;
        });
      } else {
        const errorData = await response.json();
        console.error('Failed to approve content:', errorData);
        alert('Failed to approve content. Please try again.');
      }
    } catch (error) {
      console.error('Error approving content:', error);
      alert('Error approving content. Please try again.');
    } finally {
      setApprovingContent(false);
    }
  };

  // Get the content creator assigned to this content item
  const getAssignedCreator = (item) => {
    // Try to look up assignedTo from the calendar item
    if (calendars && calendars.length > 0 && item.calendar_id) {
      const calendar = calendars.find(cal =>
        cal._id === item.calendar_id || cal.id === item.calendar_id
      );
      if (calendar && Array.isArray(calendar.contentItems)) {
        const calItem = calendar.contentItems.find(ci =>
          (item.item_id && ci.id === item.item_id) ||
          (item.item_name && (ci.title === item.item_name || ci.description === item.item_name))
        );
        if (calItem && calItem.assignedTo) {
          return calItem.assignedTo;
        }
      }
    }
    // Fall back to created_by (content creator's email)
    return item.createdBy || 'Unknown';
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

  // Published status detection logic (checks manual publish flag, scheduled posts, and calendar items)
  const isContentPublished = (contentOrId) => {
    const content = typeof contentOrId === 'object' ? contentOrId : selectedContent;
    if (!content) return false;
    
    // Check manual publish flag first
    if (content.published === true) return true;
    
    // Check if the associated calendar item is marked as published
    if (calendars && calendars.length > 0 && (content.calendar_id || content.item_id)) {
      // Find the calendar by calendar_id
      const calendar = calendars.find(cal => 
        cal._id === content.calendar_id || cal.id === content.calendar_id
      );
      
      if (calendar && Array.isArray(calendar.contentItems)) {
        // Find the item in the calendar by item_id or item_name
        const calendarItem = calendar.contentItems.find(item => 
          (content.item_id && item.id === content.item_id) ||
          (content.item_name && (item.title === content.item_name || item.description === content.item_name))
        );
        
        // Check if the calendar item is marked as published
        if (calendarItem && calendarItem.published === true) {
          return true;
        }
      }
    }
    
    // Check scheduledPosts for published status
    if (scheduledPosts && scheduledPosts.length > 0) {
      // Try to match by assignmentId, item_id, or contentId
      const match = scheduledPosts.find(post => {
        return (
          (post.assignmentId && (post.assignmentId === content.id || post.assignmentId === content.assignment_id)) ||
          (post.assignmentId && post.assignmentId === content.assignment_id) ||
          (post.item_id && post.item_id === content.id) ||
          (post.item_id && post.item_id === content.item_id) ||
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
      case 'sent_to_creator':
        return 'bg-violet-100 text-violet-800 border-violet-300';
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
      case 'sent_to_creator':
        return 'Sent to Creator';
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

  // Filtered content items for sidebar search
  const filteredContentItems = contentItems.filter(item =>
    item.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
    (item.platform || '').toLowerCase().includes(sidebarSearch.toLowerCase())
  );
  const filteredGrouped = {};
  filteredContentItems.forEach(item => {
    const k = item.calendar_name || item.calendar_id || 'Uncategorized';
    if (!filteredGrouped[k]) filteredGrouped[k] = [];
    filteredGrouped[k].push(item);
  });

  const totalComments = comments.length;

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
      `}</style>

      {/* Main Layout */}
      <div className="flex h-screen overflow-hidden">

        {/* ── LEFT SIDEBAR ── */}
        {!targetItemId && (
          <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">

            {/* Sidebar Header */}
            <div className="px-4 pt-4 pb-3 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-800 mb-3">Content Review</h2>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={sidebarSearch}
                  onChange={e => setSidebarSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition"
                />
              </div>
            </div>

            {/* Tab Bar */}
            <div className="flex border-b border-slate-100 px-2 pt-2 gap-0.5">
              {[
                { key: 'content', label: 'Items', icon: FileText, count: contentItems.length },
                { key: 'calendars', label: 'Calendars', icon: Calendar, count: Object.keys(groupedContentItems).length },
                { key: 'comments', label: 'Comments', icon: MessageSquare, count: totalComments },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSidebarTab(tab.key)}
                  className={`flex-1 flex flex-col items-center gap-0.5 pb-2 pt-1.5 text-[10px] font-semibold rounded-t transition-all relative ${
                    sidebarTab === tab.key
                      ? 'text-indigo-700 border-b-2 border-indigo-600'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span className={`absolute -top-0.5 right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center ${
                      sidebarTab === tab.key ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">

              {/* ── CONTENT ITEMS TAB ── */}
              {sidebarTab === 'content' && (
                <div className="py-2">
                  {filteredContentItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">No items found</div>
                  ) : (
                    filteredContentItems.map((item) => {
                      const itemIndex = contentItems.findIndex(ci => ci.id === item.id);
                      const isActive = selectedContentIndex === itemIndex;
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleContentSelect(item, itemIndex)}
                          className={`mx-2 mb-1.5 rounded-xl cursor-pointer transition-all border ${
                            isActive
                              ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                              : 'bg-white border-slate-100 hover:border-indigo-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="p-3 flex items-start gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {itemIndex + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate leading-snug">{item.title}</p>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${getStatusColor(getDisplayStatus(item))}`}>
                                  {getStatusLabel(getDisplayStatus(item))}
                                </span>
                                <span className="text-[10px] text-slate-500">{item.platform}</span>
                                <span className="text-[10px] text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded-full">
                                  v{item.totalVersions}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── CALENDARS TAB ── */}
              {sidebarTab === 'calendars' && (
                <div className="py-2">
                  {Object.keys(filteredGrouped).length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">No calendars</div>
                  ) : (
                    Object.keys(filteredGrouped).sort().map(calendarName => {
                      const isOpen = expandedCalendars[calendarName] !== false; // default open
                      return (
                        <div key={calendarName} className="mb-1">
                          {/* Calendar Accordion Header */}
                          <button
                            onClick={() => setExpandedCalendars(prev => ({ ...prev, [calendarName]: !isOpen }))}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition"
                          >
                            <Calendar className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
                            <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{calendarName}</span>
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.5 rounded-full">
                              {filteredGrouped[calendarName].length}
                            </span>
                            {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
                          </button>
                          {/* Calendar Items */}
                          {isOpen && (
                            <div className="pb-1">
                              {filteredGrouped[calendarName].map(item => {
                                const itemIndex = contentItems.findIndex(ci => ci.id === item.id);
                                const isActive = selectedContentIndex === itemIndex;
                                return (
                                  <div
                                    key={item.id}
                                    onClick={() => handleContentSelect(item, itemIndex)}
                                    className={`mx-2 mb-1 rounded-lg cursor-pointer transition-all border px-3 py-2 flex items-center gap-2 ${
                                      isActive
                                        ? 'bg-indigo-50 border-indigo-200'
                                        : 'bg-white border-slate-100 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                      isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {itemIndex + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-800 truncate">{item.title}</p>
                                      <p className="text-[10px] text-slate-400 truncate">{item.platform}</p>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${getStatusColor(getDisplayStatus(item))}`}>
                                      {getStatusLabel(getDisplayStatus(item))}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* ── COMMENTS TAB ── */}
              {sidebarTab === 'comments' && (
                <div className="py-2">
                  {comments.length === 0 ? (
                    <div className="text-center py-10">
                      <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">No comments yet</p>
                      <p className="text-[10px] text-slate-300 mt-0.5">Click on the media to add one</p>
                    </div>
                  ) : (
                    <div className="px-2 space-y-1.5">
                      {commentsForCurrentMedia.map((comment, index) => (
                        <div
                          key={`list-${comment.id}`}
                          onClick={() => handleCommentListClick(comment.id)}
                          className={`rounded-xl cursor-pointer transition-all border overflow-hidden ${
                            activeComment === comment.id
                              ? 'bg-blue-50 border-blue-200 shadow-sm'
                              : 'bg-white border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <div className="p-2.5 flex items-start gap-2">
                            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-800 break-words line-clamp-2">
                                {comment.comment}
                                {comment.done && <span className="ml-1 text-green-600 text-[10px]">✓</span>}
                              </p>
                              {comment.reply && (
                                <div className="mt-1.5 p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                                  <p className="text-[10px] font-bold text-indigo-700">↩ {comment.reply.creatorName || 'Creator'}</p>
                                  <p className="text-[10px] text-slate-600 line-clamp-1">{comment.reply.text}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {comments.length > commentsForCurrentMedia.length && (
                        <p className="text-center text-[10px] text-slate-400 py-2">
                          {comments.length - commentsForCurrentMedia.length} comment(s) on other media items
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ── MAIN CONTENT ── */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          <div className="px-4 py-4 max-w-full">
            {targetItemId && (
              <div className="mb-4">
                <button
                  onClick={() => navigate('/customer/calendar')}
                  className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to Calendar
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Content Header */}
              <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-[#e6f2fb] to-[#bae6fd]">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight truncate">{selectedContent.title}</h2>
                    <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                      <span className="truncate">{getAssignedCreator(selectedContent)}</span>
                      <span>•</span>
                      <span>{selectedContent.platform}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(getDisplayStatus(selectedContent))}`}>
                      {getStatusLabel(getDisplayStatus(selectedContent))}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      <Image className="h-3.5 w-3.5 mr-1" />
                      {selectedContent.totalVersions} Ver.
                    </span>
                    {/* Comment count badge in header */}
                    {totalComments > 0 && (
                      <button
                        onClick={() => { setSidebarTab('comments'); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200 hover:bg-violet-200 transition"
                      >
                        <Bell className="h-3.5 w-3.5" />
                        {totalComments} Comment{totalComments !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Version Controls — Pills */}
              {selectedContent.totalVersions > 1 && (
                <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-3 flex-wrap">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Version</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedContent.versions.map((version, index) => (
                      <button
                        key={version.id || index}
                        onClick={() => handleVersionSelect(index)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                          selectedVersionIndex === index
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        V{version.versionNumber}
                      </button>
                    ))}
                  </div>
                  {currentVersion && (
                    <span className="text-xs text-slate-400 ml-auto">{formatDate(currentVersion.createdAt)}</span>
                  )}
                </div>
              )}

              {/* Media + Comments */}
              <div className="p-6">
                {/* Multi-media navigation */}
                {currentVersion?.media && currentVersion.media.length > 1 && (
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <button
                      onClick={() => handleMediaChange('prev')}
                      disabled={selectedMediaIndex === 0}
                      className="p-2 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 transition"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </button>
                    <span className="text-xs font-semibold text-slate-600">
                      {selectedMediaIndex + 1} / {currentVersion.media.length}
                    </span>
                    <button
                      onClick={() => handleMediaChange('next')}
                      disabled={selectedMediaIndex === currentVersion.media.length - 1}
                      className="p-2 rounded-lg bg-white hover:bg-slate-100 disabled:opacity-40 border border-slate-200 transition"
                    >
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                )}

                {/* Media Display */}
                <div className="flex justify-center mb-6">
                  <div
                    ref={imageContainerRef}
                    className="relative inline-block"
                    style={{ position: 'relative' }}
                  >
                    {currentMedia ? (
                      currentMedia.url && typeof currentMedia.url === 'string' ? (
                        currentMedia.type === 'image' ? (
                          <img
                            src={currentMedia.url}
                            alt={`${selectedContent.title} - Version ${currentVersion?.versionNumber} - Media ${selectedMediaIndex + 1}`}
                            className="max-w-full h-auto max-h-[65vh] rounded-xl shadow-lg border border-slate-200 object-contain cursor-crosshair"
                            onClick={handleImageClickWithReposition}
                            onLoad={handleImageLoad}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : (
                          <video
                            src={currentMedia.url}
                            controls
                            className="max-w-full h-auto max-h-[65vh] rounded-xl shadow-lg border border-slate-200 object-contain cursor-crosshair"
                            onClick={handleImageClickWithReposition}
                            onLoadedMetadata={handleImageLoad}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        )
                      ) : (
                        <div className="w-96 h-72 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                          <div className="text-center">
                            <Image className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                            <p className="text-slate-500 text-sm">No media available</p>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="w-96 h-72 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                        <div className="text-center">
                          <Image className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                          <p className="text-slate-500 text-sm">No media available</p>
                        </div>
                      </div>
                    )}

                    {/* Comment Markers */}
                    {currentMedia && currentMedia.url && (
                      commentsForCurrentMedia.map((comment, index) => {
                        const commentX = comment.x || comment.position?.x || 0;
                        const commentY = comment.y || comment.position?.y || 0;
                        let boxLeft = 30;
                        let boxRight = "auto";
                        if (commentX > 150) {
                          boxLeft = "auto";
                          boxRight = 30;
                        }
                        return (
                          <div
                            key={`marker-${comment.id}`}
                            style={{
                              position: "absolute",
                              top: commentY - 12,
                              left: commentX - 12,
                              width: 24,
                              height: 24,
                              background: comment.done ? "#10b981" : comment.repositioning ? "#8b5cf6" : comment.editing ? "#3b82f6" : "#ef4444",
                              color: "#fff",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: "bold",
                              fontSize: "11px",
                              boxShadow: comment.repositioning ? "0 0 0 3px rgba(139, 92, 246, 0.3), 0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.2)",
                              cursor: comment.repositioning ? "move" : "pointer",
                              zIndex: 10,
                              border: "2px solid #fff",
                              transition: "all 0.2s",
                              animation: comment.repositioning ? "pulse 1.5s ease-in-out infinite" : "none",
                            }}
                            onMouseEnter={() => setHoveredComment(comment.id)}
                            onMouseLeave={() => setHoveredComment(null)}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!comment.repositioning) {
                                handleCommentListClick(comment.id);
                              }
                            }}
                          >
                            {index + 1}
                            {(comment.editing || activeComment === comment.id || hoveredComment === comment.id) && !comment.repositioning && (
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
                                  zIndex: 20,
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
                                      <Button onClick={() => handleCommentSubmit(comment.id)} variant="success" size="sm">Save</Button>
                                      <Button onClick={() => handleCommentCancel(comment.id)} variant="danger" size="sm">Cancel</Button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="mb-2">
                                      <p className="font-medium text-gray-900 text-xs leading-relaxed break-words">
                                        {comment.comment}
                                        {comment.done && <span className="text-green-600 ml-1 text-[10px]">✓</span>}
                                      </p>
                                    </div>
                                    {comment.reply && (
                                      <div className="mb-2 p-1.5 bg-indigo-50 border border-indigo-200 rounded-md">
                                        <p className="text-[10px] font-bold text-indigo-700 mb-0.5">↩ {comment.reply.creatorName || 'Creator'}</p>
                                        <p className="text-[10px] text-gray-700 break-words">{comment.reply.text}</p>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-1">
                                      {!comment.done && (
                                        <Button onClick={(e) => { e.stopPropagation(); handleMarkDone(comment.id); }} variant="success" size="sm">
                                          <CheckCircle className="h-2.5 w-2.5 mr-0.5" />Done
                                        </Button>
                                      )}
                                      <Button onClick={(e) => { e.stopPropagation(); handleEditComment(comment.id); }} variant="warning" size="sm">
                                        <Edit3 className="h-2.5 w-2.5 mr-0.5" />Edit
                                      </Button>
                                      <Button onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }} variant="danger" size="sm">
                                        <Trash2 className="h-2.5 w-2.5 mr-0.5" />Del
                                      </Button>
                                      <Button onClick={(e) => { e.stopPropagation(); handleRepositionStart(comment.id); }} variant="info" size="sm">
                                        <Move className="h-2.5 w-2.5 mr-0.5" />Move
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                            {comment.repositioning && (
                              <div style={{
                                position: "absolute", left: 30, top: "50%", transform: "translateY(-50%)",
                                background: "#8b5cf6", color: "#fff", borderRadius: "6px", padding: "6px 10px",
                                fontSize: "10px", fontWeight: "600", whiteSpace: "nowrap", zIndex: 20,
                                boxShadow: "0 2px 10px rgba(139, 92, 246, 0.3)",
                              }}>
                                Click image to move
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Media Thumbnails */}
                {currentVersion?.media && currentVersion.media.length > 1 && (
                  <div className="flex justify-center gap-2 mt-3 mb-5 flex-wrap">
                    {currentVersion.media.map((media, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedMediaIndex(index)}
                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                          selectedMediaIndex === index
                            ? 'border-indigo-500 ring-2 ring-indigo-200'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {media.type === 'image' && media.url && typeof media.url === 'string' ? (
                          <img src={media.url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />
                        ) : (
                          <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                            <Video className="h-5 w-5 text-slate-400" />
                          </div>
                        )}
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center" style={{ display: 'none' }}>
                          <Video className="h-5 w-5 text-slate-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Caption & Notes */}
                {currentVersion && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Caption</label>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <p className="text-slate-800 text-sm leading-relaxed">{currentVersion.caption || 'No caption'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">Notes</label>
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                        <p className="text-slate-800 text-sm leading-relaxed">{currentVersion.notes || 'No notes'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {getDisplayStatus(selectedContent) !== 'approved' && getDisplayStatus(selectedContent) !== 'published' && (
                  <div className="flex flex-col sm:flex-row justify-center gap-3 mt-4">
                    {commentsForCurrentMedia.length > 0 && (
                      <button
                        onClick={handleSendToCreator}
                        disabled={sendingToCreator}
                        className={`inline-flex items-center justify-center px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg ${
                          sendingToCreator ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white'
                        }`}
                      >
                        {sendingToCreator ? (
                          <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Sending...</>
                        ) : (
                          <><Send className="h-4 w-4 mr-2" />Send to Creator</>
                        )}
                      </button>
                    )}
                    <button
                      onClick={handleApproveContent}
                      disabled={approvingContent}
                      className={`inline-flex items-center justify-center px-8 py-3 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg ${
                        approvingContent ? 'bg-slate-300 cursor-not-allowed text-slate-500' : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white'
                      }`}
                    >
                      {approvingContent ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>Approving...</>
                      ) : (
                        <><ThumbsUp className="h-4 w-4 mr-2" />Approve Content</>
                      )}
                    </button>
                  </div>
                )}

                {/* Approved state */}
                {getDisplayStatus(selectedContent) === 'approved' && (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                    <div className="inline-flex items-center px-6 py-3 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
                      <CheckCircle className="h-5 w-5 text-emerald-600 mr-2" />
                      <span className="text-emerald-800 font-bold text-sm">Content Approved</span>
                    </div>
                    <button
                      onClick={handleUndoApprove}
                      disabled={undoingApprove}
                      className={`inline-flex items-center justify-center px-5 py-3 rounded-xl font-semibold text-sm transition-all border-2 ${
                        undoingApprove ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-amber-400 text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      {undoingApprove ? (
                        <><div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-400 border-t-transparent mr-2"></div>Undoing...</>
                      ) : (
                        <><RotateCcw className="h-4 w-4 mr-2" />Undo Approve</>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {isUserMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
      )}
    </div>
  );
}

export default ContentReview;