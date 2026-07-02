import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, CheckCircle, Edit3, Trash2, Move, ChevronLeft, ChevronRight, Image, Video, AlertCircle, ThumbsUp, Calendar, ChevronDown, ChevronUp, Send, RotateCcw, Search, FileText, Bell, UserCog, User, X, Play, Edit } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Helper functions declared outside ContentReview to avoid closures/state duplication issues
const getMediaType = (url) => {
  if (!url || typeof url !== 'string') return 'image';
  const cleanUrl = url.split('?')[0].split('#')[0];
  const extension = cleanUrl.toLowerCase().split('.').pop();
  const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
  return videoExtensions.includes(extension) ? 'video' : 'image';
};

const normalizeMedia = (media) => {
  if (!media || !Array.isArray(media)) return [];
  return media.map(item => {
    if (typeof item === 'string') {
      return { url: item, type: getMediaType(item) };
    }
    if (item && typeof item === 'object') {
      const url = item.url || item.src || item.href || String(item);
      if (typeof url === 'string' && url.trim()) {
        return { url: url, type: item.type || getMediaType(url) };
      }
    }
    return null;
  }).filter(Boolean);
};

const isVisibleToCustomerSubmission = (submission) => {
  if (!submission) return false;
  const stage = submission.submission_stage || submission.submissionStage || '';
  const status = submission.status || '';
  const sentToCustomerAt = submission.sent_to_customer_at || submission.sentToCustomerAt;
  const approvedByAdmin =
    submission.approved_by_admin === true ||
    status === 'approved_admin' ||
    status === 'approved_both' ||
    (status === 'approved' && !submission.approved_by_customer);
  const approvedByCustomer =
    submission.approved_by_customer === true ||
    status === 'approved_customer' ||
    status === 'approved_both';

  if (status === 'published' || submission.published === true) return true;
  if (approvedByCustomer) return true;

  // Support legacy direct customer submissions as in ContentReview.jsx
  const isLegacyDirectCustomerSubmission = stage === 'customer' && !sentToCustomerAt && !approvedByAdmin;
  if (isLegacyDirectCustomerSubmission) return true;

  // Support customer upload stage
  if (stage === 'customer_upload') return true;

  return (stage === 'customer' || stage === 'approved') && (!!sentToCustomerAt || approvedByAdmin);
};

const processSubmissionsData = (submissions, user, targetItemId, filterStatus) => {
  if (!Array.isArray(submissions)) return { displayData: [], grouped: {} };

  const filteredSubmissions = submissions.filter(sub => {
    let matches = false;
    if (user && (user._id || user.id) && sub.customer_id && (sub.customer_id === user._id || sub.customer_id === user.id)) {
      matches = true;
    } else if (user && user.email && sub.customer_email && sub.customer_email === user.email) {
      matches = true;
    } else if (user && user.email && sub.created_by && sub.created_by === user.email && !sub.customer_id && !sub.customer_email) {
      matches = true;
    }

    // Also match if this submission is specifically for the target item that we are reviewing
    if (targetItemId && (
      (sub.item_id && String(sub.item_id) === String(targetItemId)) ||
      (sub.assignment_id && String(sub.assignment_id) === String(targetItemId))
    )) {
      matches = true;
    }

    // Also match if the submission is published
    if (sub.status === 'published' || sub.submission_stage === 'published' || sub.published === true) {
      matches = true;
    }

    return matches && isVisibleToCustomerSubmission(sub);
  });

  if (filteredSubmissions.length === 0) {
    return { displayData: [], grouped: {} };
  }

  const groupedSubmissions = {};
  filteredSubmissions.forEach(submission => {
    const assignmentId = submission.assignment_id || submission.assignmentId || 'unknown';
    if (!groupedSubmissions[assignmentId]) {
      groupedSubmissions[assignmentId] = [];
    }
    groupedSubmissions[assignmentId].push(submission);
  });

  const contentData = [];
  Object.keys(groupedSubmissions).forEach(assignmentId => {
    const versions = groupedSubmissions[assignmentId].sort((a, b) =>
      new Date(a.created_at) - new Date(b.created_at)
    );
    const baseItem = versions[0];
    const latestVersion = versions[versions.length - 1];
    const currentStatus = latestVersion.status || baseItem.status || 'under_review';

    contentData.push({
      id: assignmentId,
      title: baseItem.caption || 'Untitled Post',
      description: baseItem.notes || '',
      createdBy: baseItem.created_by || 'Unknown',
      createdAt: baseItem.created_at || '',
      status: currentStatus,
      approvalNotes: latestVersion.approvalNotes || baseItem.approvalNotes || '',
      platform: baseItem.platform || 'Instagram',
      type: baseItem.type || 'Post',
      customer_id: baseItem.customer_id,
      customer_name: baseItem.customer_name,
      customer_email: baseItem.customer_email,
      calendar_id: baseItem.calendar_id || '',
      calendar_name: baseItem.calendar_name || '',
      item_id: baseItem.item_id || '',
      item_name: baseItem.item_name || '',
      assignment_id: assignmentId,
      versions: versions.map((version, index) => ({
        id: version._id,
        versionNumber: index + 1,
        media: [
          ...normalizeMedia(version.media || version.images || []),
          ...(version.thumbnailUrl ? [{ url: version.thumbnailUrl, type: 'image', isThumbnail: true }] : [])
        ],
        caption: version.caption || '',
        notes: version.notes || '',
        hashtags: version.hashtags || '',
        createdAt: version.created_at,
        status: version.status || 'under_review',
        approvalNotes: version.approvalNotes || '',
        comments: version.comments || [],
        thumbnailUrl: version.thumbnailUrl || null
      })),
      totalVersions: versions.length
    });
  });

  const displayData = targetItemId
    ? contentData.filter(item =>
      (item.item_id && item.item_id === targetItemId) ||
      (item.id && item.id === targetItemId) ||
      (item.assignment_id && item.assignment_id === targetItemId)
    )
    : filterStatus
      ? contentData.filter(item => item.status === filterStatus)
      : contentData;

  const grouped = {};
  displayData.forEach(item => {
    const calendarKey = item.calendar_name || item.calendar_id || 'Uncategorized';
    if (!grouped[calendarKey]) {
      grouped[calendarKey] = [];
    }
    grouped[calendarKey].push(item);
  });

  return { displayData, grouped };
};

function ContentReview({ itemId: propItemId, onClose: propOnClose, initialSubmissions }) {
  const [searchParams] = useSearchParams();
  const targetItemId = propItemId || searchParams.get('itemId');
  const filterStatus = searchParams.get('filter');

  // Get logged-in customer info from localStorage (like in ContentCalendar)
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }

  const customerId = user?.id || user?._id;
  const customerEmail = user?.email;

  // Process initial submissions if provided
  const initialProcessed = useMemo(() => {
    if (initialSubmissions && Array.isArray(initialSubmissions)) {
      return processSubmissionsData(initialSubmissions, user, targetItemId, filterStatus);
    }
    return null;
  }, [initialSubmissions, user, targetItemId, filterStatus]);

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

  const [contentItems, setContentItems] = useState(() => {
    return initialProcessed ? initialProcessed.displayData : [];
  });
  const [groupedContentItems, setGroupedContentItems] = useState(() => {
    return initialProcessed ? initialProcessed.grouped : {};
  });
  const [collapsedCalendars, setCollapsedCalendars] = useState({});
  const [selectedContent, setSelectedContent] = useState(() => {
    if (initialProcessed && initialProcessed.displayData.length > 0 && targetItemId) {
      return initialProcessed.displayData[0];
    }
    return null;
  });
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(() => {
    if (initialProcessed && initialProcessed.displayData.length > 0 && targetItemId) {
      return initialProcessed.displayData[0].versions.length - 1;
    }
    return 0;
  });
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  const [comments, setComments] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);
  const [loading, setLoading] = useState(() => {
    return !(initialSubmissions && Array.isArray(initialSubmissions) && initialSubmissions.length > 0);
  });
  const [error, setError] = useState(null);

  // Ref for image container to properly position comments
  const imageContainerRef = useRef(null);
  const videoRef = useRef(null);
  const touchFiredRef = useRef(false);
  const videoPausedAtRef = useRef(null); // stores currentTime when video is paused for commenting
  const [imageDimensions, setImageDimensions] = useState({ contentW: 0, contentH: 0, offsetX: 0, offsetY: 0 });

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

  // Reset video comment mode and loading state when media, version, or content changes
  useEffect(() => {
    setIsVideoCommentMode(false);
    setVideoLoading(false);
    setVideoCompatibleUrl(null);
    setVideoTranscoding(false);
  }, [selectedMediaIndex, selectedVersionIndex, selectedContent]);

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
    if (contentItems.length === 0) {
      setLoading(true);
    }
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

      const { displayData, grouped } = processSubmissionsData(submissions, user, targetItemId, filterStatus);

      setContentItems(displayData);
      setGroupedContentItems(grouped);

      if (displayData.length > 0 && targetItemId) {
        setSelectedContent(prev => {
          if (prev) {
            const match = displayData.find(item => item.id === prev.id);
            return match || displayData[0];
          }
          return displayData[0];
        });
        setSelectedVersionIndex(prev => {
          if (selectedContent) {
            const match = displayData.find(item => item.id === selectedContent.id);
            if (match) {
              return Math.min(prev, match.versions.length - 1);
            }
          }
          return displayData[0].versions.length - 1;
        });
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
    e.preventDefault();
    e.stopPropagation();
    const rect = e.target.getBoundingClientRect();
    const nw = e.target.naturalWidth || e.target.videoWidth || rect.width;
    const nh = e.target.naturalHeight || e.target.videoHeight || rect.height;
    const scale = Math.min(rect.width / nw, rect.height / nh);
    const contentW = nw * scale, contentH = nh * scale;
    const ox = (rect.width - contentW) / 2, oy = (rect.height - contentH) / 2;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left - ox) / contentW));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top - oy) / contentH));
    if (commentsForCurrentMedia.some((c) => c.editing)) return;

    const mediaType = selectedContent?.versions?.[selectedVersionIndex]?.media?.[selectedMediaIndex]?.type;
    const videoTimestamp = (mediaType === 'video' && videoRef.current && !isNaN(videoRef.current.currentTime))
      ? videoRef.current.currentTime
      : null;
    if (mediaType === 'video' && videoRef.current) {
      videoPausedAtRef.current = videoRef.current.currentTime;
      videoRef.current.pause();
    }

    const newComment = {
      id: uuidv4(),
      x,
      y,
      comment: "",
      editing: true,
      done: false,
      repositioning: false,
      isNew: true,
      versionId: selectedContent.versions[selectedVersionIndex]?.id,
      versionNumber: selectedContent.versions[selectedVersionIndex]?.versionNumber || 1,
      mediaIndex: selectedMediaIndex,
      reviewType: 'external',
      timestamp: new Date().toISOString(),
      ...(videoTimestamp != null && { videoTimestamp })
    };
    setComments([...comments, newComment]);
    setCommentsForCurrentMedia([...commentsForCurrentMedia, newComment]);
    setActiveComment(newComment.id);
    setActiveMarkerRect({ top: e.clientY - 12, left: e.clientX - 12, right: e.clientX + 12, bottom: e.clientY + 12 });
  };

  const handleCommentChange = (id, text) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, comment: text } : c)));
    setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, comment: text } : c)));
  };

  const handleCommentSubmit = async (id) => {
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment && comment.comment.trim()) {
      try {
        const assignmentId = selectedContent.id;
        const versionId = selectedContent.versions[selectedVersionIndex]?.id;

        const isNewComment = comment.isNew === true;

        let response;

        if (!isNewComment) {
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
          const newCommentObj = {
            id: comment.id,
            comment: comment.comment,
            position: { x: comment.x, y: comment.y },
            x: comment.x,
            y: comment.y,
            mediaIndex: selectedMediaIndex,
            reviewType: 'external',
            timestamp: comment.timestamp || new Date().toISOString(),
            status: 'active',
            ...(comment.videoTimestamp != null && { videoTimestamp: comment.videoTimestamp })
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
          if (videoRef.current && videoRef.current.paused) {
            if (videoPausedAtRef.current != null) {
              videoRef.current.currentTime = videoPausedAtRef.current;
              videoPausedAtRef.current = null;
            }
            videoRef.current.play().catch(() => { });
          }

          setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setActiveComment(null);

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
          const errorData = await response.json();
          console.error('Failed to save comment:', errorData);
          setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setActiveComment(null);
        }
      } catch (error) {
        console.error('Error saving comment:', error);
        setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
        setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, editing: false } : c)));
        setActiveComment(null);
      }
    }
  };

  const handleCommentCancel = (id) => {
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment && comment.comment && comment.comment.trim() !== '') {
      setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
      setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, editing: false } : c)));
    } else {
      setComments(comments.filter((c) => c.id !== id));
      setCommentsForCurrentMedia(commentsForCurrentMedia.filter((c) => c.id !== id));
    }
    setActiveComment(null);
    if (videoRef.current && videoRef.current.paused) {
      if (videoPausedAtRef.current != null) {
        videoRef.current.currentTime = videoPausedAtRef.current;
        videoPausedAtRef.current = null;
      }
      videoRef.current.play().catch(() => { });
    }
  };

  const handleDeleteComment = async (id) => {
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment) {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${comment.id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });

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
          console.error('Failed to delete comment from backend');
          setComments(comments.filter((c) => c.id !== id));
          setCommentsForCurrentMedia(commentsForCurrentMedia.filter((c) => c.id !== id));
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        setComments(comments.filter((c) => c.id !== id));
        setCommentsForCurrentMedia(commentsForCurrentMedia.filter((c) => c.id !== id));
      }

      setActiveComment(null);
    }
  };

  const handleImageLoad = (e) => {
    const el = e.target;
    const ew = el.clientWidth, eh = el.clientHeight;
    const nw = el.naturalWidth || el.videoWidth || ew;
    const nh = el.naturalHeight || el.videoHeight || eh;
    const scale = Math.min(ew / nw, eh / nh);
    const contentW = nw * scale, contentH = nh * scale;
    setImageDimensions({ contentW, contentH, offsetX: (ew - contentW) / 2, offsetY: (eh - contentH) / 2 });
  };

  const handleMarkDone = async (id) => {
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment) {
      try {
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
    setActiveComment(null);
  };

  const handleImageClickWithReposition = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const repositioningComment = commentsForCurrentMedia.find((c) => c.repositioning);
    if (repositioningComment) {
      const rect = e.target.getBoundingClientRect();
      const nw = e.target.naturalWidth || e.target.videoWidth || rect.width;
      const nh = e.target.naturalHeight || e.target.videoHeight || rect.height;
      const scale = Math.min(rect.width / nw, rect.height / nh);
      const contentW = nw * scale, contentH = nh * scale;
      const ox = (rect.width - contentW) / 2, oy = (rect.height - contentH) / 2;
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left - ox) / contentW));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top - oy) / contentH));

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

    // If the clicked comment has a video timestamp, seek the video to that point
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment && comment.videoTimestamp != null && videoRef.current) {
      videoRef.current.currentTime = comment.videoTimestamp;
      videoRef.current.pause();
      videoPausedAtRef.current = comment.videoTimestamp;
      // Scroll the video into view smoothly
      videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };


  const handleContentSelect = (item, index) => {
    setSelectedContent(item);
    setSelectedContentIndex(index);
    setSelectedVersionIndex(item.versions.length - 1);
    setSelectedMediaIndex(0);
    const version = item.versions[item.versions.length - 1];
    const normalizedComments = (version.comments || []).map(comment => ({
      ...comment,
      x: comment.x ?? comment.position?.x ?? 0,
      y: comment.y ?? comment.position?.y ?? 0,
      editing: false,
      repositioning: false,
      isNew: false,
      done: comment.done || comment.status === 'completed' || false
    }));

    const uniqueComments = normalizedComments.filter((comment, index, self) =>
      index === self.findIndex((c) => c.id === comment.id)
    );

    setComments(uniqueComments);
    setActiveComment(null);
  };

  const handleVersionChange = (direction) => {
    let newIndex = selectedVersionIndex;
    if (direction === 'prev' && selectedVersionIndex > 0) {
      newIndex = selectedVersionIndex - 1;
    } else if (direction === 'next' && selectedVersionIndex < selectedContent.versions.length - 1) {
      newIndex = selectedVersionIndex + 1;
    }
    setSelectedVersionIndex(newIndex);
    setSelectedMediaIndex(0);
    const version = selectedContent.versions[newIndex];
    const normalizedComments = (version.comments || []).map(comment => ({
      ...comment,
      x: comment.x ?? comment.position?.x ?? 0,
      y: comment.y ?? comment.position?.y ?? 0,
      editing: false,
      repositioning: false,
      isNew: false,
      done: comment.done || comment.status === 'completed' || false
    }));

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

  const [approvingContent, setApprovingContent] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);
  const [sendingToCreator, setSendingToCreator] = useState(false);
  const [undoingApprove, setUndoingApprove] = useState(false);
  const [isVideoCommentMode, setIsVideoCommentMode] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoCompatibleUrl, setVideoCompatibleUrl] = useState(null);
  const [videoTranscoding, setVideoTranscoding] = useState(false);
  const [activeMarkerRect, setActiveMarkerRect] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('content');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [expandedCalendars, setExpandedCalendars] = useState({});
  const [sortOrder, setSortOrder] = useState('latest');
  const [panelActiveComment, setPanelActiveComment] = useState(null);
  const [mobileView, setMobileView] = useState('content');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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
            approvalNotes: 'Approved by customer',
            approved_by_customer: true
          })
        }
      );

      if (response.ok) {
        alert('Content approved successfully!');

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

  const handleStartReply = (commentId) => {
    setReplyingTo(commentId);
    setReplyText('');
    setActiveComment(commentId);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
    setReplyText('');
  };

  const handleReplySubmit = async (commentId) => {
    if (!replyText.trim()) return;
    setSavingReply(true);
    const targetComment = comments.find(c => c.id === commentId);
    if (!targetComment) {
      setSavingReply(false);
      return;
    }
    const newReply = {
      id: uuidv4(),
      authorRole: 'customer',
      authorName: user?.name || 'Customer',
      authorEmail: user?.email || '',
      message: replyText.trim(),
      timestamp: new Date().toISOString(),
    };
    const existingReplies = targetComment.replies || (targetComment.adminReply ? [{
      id: 'legacy-reply',
      authorRole: 'admin',
      authorName: targetComment.adminReply.adminName || 'Admin',
      authorEmail: targetComment.adminReply.adminEmail || '',
      message: targetComment.adminReply.text,
      timestamp: targetComment.adminReply.timestamp
    }] : []);
    const updatedReplies = [...existingReplies, newReply];

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          replies: updatedReplies,
          status: 'customer_feedback_pending_admin'
        })
      });

      if (response.ok) {
        setComments(comments.map((c) => (c.id === commentId ? { ...c, replies: updatedReplies } : c)));
        setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === commentId ? { ...c, replies: updatedReplies } : c)));
        setReplyingTo(null);
        setReplyText('');
        // Update submission status as well
        await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            versionId: selectedContent.versions[selectedVersionIndex]?.id,
            status: 'customer_feedback_pending_admin'
          })
        });
        await fetchContentSubmissions();
      }
    } catch (error) {
      console.error('Error saving customer reply:', error);
    } finally {
      setSavingReply(false);
    }
  };

  const getAssignedCreator = (item) => {
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
    return item.createdBy || 'Unknown';
  };

  const formatVideoTime = (seconds) => {
    if (seconds == null || isNaN(seconds)) return null;
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
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

  const isContentPublished = (contentOrId) => {
    const content = typeof contentOrId === 'object' ? contentOrId : selectedContent;
    if (!content) return false;

    if (content.published === true) return true;

    if (calendars && calendars.length > 0 && (content.calendar_id || content.item_id)) {
      const calendar = calendars.find(cal =>
        cal._id === content.calendar_id || cal.id === content.calendar_id
      );

      if (calendar && Array.isArray(calendar.contentItems)) {
        const calendarItem = calendar.contentItems.find(item =>
          (content.item_id && item.id === content.item_id) ||
          (content.item_name && (item.title === content.item_name || item.description === content.item_name))
        );

        if (calendarItem && calendarItem.published === true) {
          return true;
        }
      }
    }

    if (scheduledPosts && scheduledPosts.length > 0) {
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

  const getDisplayStatus = (content) => {
    if (!content) return 'under_review';
    if (isContentPublished(content)) return 'published';
    if (Array.isArray(content.versions) && content.versions.length > 0) {
      const latestVersion = content.versions[content.versions.length - 1];
      const status = latestVersion.status || content.status || 'under_review';
      if (status === 'approved') {
        const notes = (latestVersion.approvalNotes || content.approvalNotes || '').toLowerCase();
        return notes.includes('customer') ? 'approved_by_customer' : 'approved_by_admin';
      }
      return status;
    }
    const status = content.status || 'under_review';
    if (status === 'approved') {
      const notes = (content.approvalNotes || '').toLowerCase();
      return notes.includes('customer') ? 'approved_by_customer' : 'approved_by_admin';
    }
    return status;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'under_review':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'approved':
      case 'approved_by_customer':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'approved_by_admin':
        return 'bg-orange-100 text-orange-850 border-orange-300';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'published':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'sent_to_creator':
      case 'revision_requested':
      case 'changes_requested':
        return 'bg-violet-100 text-violet-800 border-violet-300';
      case 'pending_customer_review':
        return 'bg-cyan-100 text-cyan-800 border-cyan-305';
      case 'changes_requested_admin':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'customer_feedback_pending_admin':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'changes_requested_customer_approved_admin':
        return 'bg-rose-100 text-rose-800 border-rose-305';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'under_review':
        return 'Under Review';
      case 'approved':
      case 'approved_by_customer':
        return 'Approved by Customer';
      case 'approved_by_admin':
        return 'Approved by Admin';
      case 'rejected':
        return 'Rejected';
      case 'published':
        return 'Published';
      case 'sent_to_creator':
        return 'Sent to Creator';
      case 'pending_customer_review':
        return 'Pending Customer Review';
      case 'changes_requested_admin':
        return 'Changes Requested by Admin';
      case 'customer_feedback_pending_admin':
        return 'Customer Feedback Pending Admin Review';
      case 'changes_requested_customer_approved_admin':
        return 'Changes Requested by Customer (Approved by Admin)';
      case 'changes_requested':
      case 'revision_requested':
        return 'Changes Requested';
      default: return 'Pending';
    }
  };
  const handleClose = propOnClose || (() => navigate('/customer/calendar'));

  if (loading) {
    if (targetItemId) {
      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-3 shadow-2xl">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-indigo-200 border-t-indigo-600 mx-auto" />
            <p className="text-slate-800 font-semibold text-sm">Loading content details...</p>
            <p className="text-slate-500 text-xs">Please wait</p>
          </div>
        </div>
      );
    }
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

  if (error) {
    if (targetItemId) {
      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-auto flex flex-col items-center text-center shadow-2xl">
            <div className="bg-rose-100 rounded-full w-12 h-12 flex items-center justify-center mb-3">
              <AlertCircle className="h-6 w-6 text-rose-600" />
            </div>
            <h3 className="text-rose-700 font-bold text-base mb-1">Error Loading</h3>
            <p className="text-slate-600 text-xs mb-4 leading-relaxed">{error}</p>
            <div className="flex gap-2">
              <button onClick={fetchContentSubmissions} className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700 transition">Retry</button>
              <button onClick={handleClose} className="px-3 py-1.5 bg-red-650 text-white rounded text-xs font-semibold hover:bg-red-700 transition">Close</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm mx-auto p-4 sm:p-6">
          <div className="bg-rose-100 rounded-full w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-7 w-7 sm:h-8 sm:w-8 text-rose-600" />
          </div>
          <h2 className="text-rose-700 font-bold text-base sm:text-lg mb-2">Error Loading</h2>
          <p className="text-slate-600 text-xs sm:text-sm mb-4 leading-relaxed">{error}</p>
          <button onClick={fetchContentSubmissions} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (contentItems.length === 0) {
    if (targetItemId) {
      return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-auto flex flex-col items-center text-center shadow-2xl">
            <div className="bg-indigo-100 rounded-full w-12 h-12 flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-slate-800 font-bold text-base mb-1">No Submission</h3>
            <p className="text-slate-600 text-xs mb-4 leading-relaxed">No content submission found for this item.</p>
            <button onClick={handleClose} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">Close</button>
          </div>
        </div>
      );
    }
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
            <button onClick={() => navigate('/customer/login')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
              Login
            </button>
          )}
        </div>
      </div>
    );
  }

  const filteredContentItems = contentItems
    .filter(item =>
      item.title.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      (item.platform || '').toLowerCase().includes(sidebarSearch.toLowerCase())
    )
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return sortOrder === 'latest' ? dateB - dateA : dateA - dateB;
    });

  if (selectedContent) {
    const currentVersion = selectedContent.versions[selectedVersionIndex];
    const currentMedia = currentVersion?.media?.[selectedMediaIndex];

    return (
      <div
        className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-4 px-2"
        onClick={handleClose}
      >
        <style>{`
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
        `}</style>
        <div
          className="w-full max-w-5xl bg-gray-50 rounded-2xl p-4 my-auto relative shadow-2xl flex flex-col max-h-[92vh]"
          onClick={e => e.stopPropagation()}
          style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-250/50 flex-shrink-0">
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-gray-900 truncate flex items-center gap-2 flex-wrap">
                <span>{selectedContent.title}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusColor(getDisplayStatus(selectedContent))}`}>
                  {getStatusLabel(getDisplayStatus(selectedContent))}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {selectedContent.totalVersions} Ver.
                </span>
              </h2>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                <span className="truncate">Creator: {getAssignedCreator(selectedContent)}</span>
                <span>•</span>
                <span className="capitalize">{selectedContent.platform}</span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-150 transition-colors ml-2"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 overflow-y-auto pr-1 min-h-0 flex-1">
            <div className="lg:col-span-2 space-y-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
                <div className="px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-200/50 bg-blue-50/50 flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center">
                    <Image className="h-4 w-4 text-blue-600 mr-1.5" />
                    Version {currentVersion?.versionNumber}
                    <span className="ml-1.5 text-xs font-normal text-gray-600">/ {selectedContent.totalVersions}</span>
                  </h3>
                  {currentVersion && (
                    <span className="text-xs text-gray-400">{formatDate(currentVersion.createdAt)}</span>
                  )}
                </div>

                <div className="p-3 sm:p-4">
                  {currentVersion ? (
                    currentVersion.media?.length > 0 ? (
                      <>
                        {currentMedia?.type === 'video' && (
                          <div className="flex justify-center mb-3">
                            <button
                              onClick={() => setIsVideoCommentMode(v => !v)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${isVideoCommentMode
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                }`}
                            >
                              <MessageSquare className="h-3 w-3" />
                              {isVideoCommentMode ? '✓ Comment Mode ON — click video to pin comment' : 'Add Comment at Timestamp'}
                            </button>
                          </div>
                        )}

                        {currentVersion.media.length > 1 && (
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs text-gray-500 font-semibold">{selectedMediaIndex + 1} / {currentVersion.media.length}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleMediaChange('prev')}
                                disabled={selectedMediaIndex === 0}
                                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
                              >
                                <ChevronLeft className="h-3.5 w-3.5 text-slate-600" />
                              </button>
                              <button
                                onClick={() => handleMediaChange('next')}
                                disabled={selectedMediaIndex === currentVersion.media.length - 1}
                                className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-white disabled:opacity-40 transition-colors"
                              >
                                <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex justify-center mb-4">
                          <div
                            ref={imageContainerRef}
                            className="relative inline-block"
                            style={{ maxWidth: '100%', position: 'relative' }}
                          >
                            {currentMedia.type === 'image' && currentMedia.url ? (
                              <img
                                src={currentMedia.url}
                                alt=""
                                className="max-w-full h-auto max-h-[60vh] rounded-lg shadow border border-gray-200 object-contain cursor-crosshair"
                                onClick={handleImageClickWithReposition}
                                onLoad={handleImageLoad}
                              />
                            ) : currentMedia.type === 'video' && currentMedia.url ? (
                              <>
                                {videoTranscoding && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg z-25">
                                    <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-2" />
                                    <p className="text-white text-xs font-semibold">Converting video for browser...</p>
                                  </div>
                                )}
                                {videoLoading && !videoTranscoding && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg z-10">
                                    <div className="w-8 h-8 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-2" />
                                    <p className="text-white text-xs font-semibold">Loading video...</p>
                                  </div>
                                )}
                                <video
                                  ref={videoRef}
                                  src={videoCompatibleUrl || currentMedia.url}
                                  poster={currentVersion?.thumbnailUrl || undefined}
                                  controls
                                  playsInline
                                  className="rounded-lg shadow border border-gray-200 bg-black max-w-full h-auto max-h-[60vh] object-contain"
                                  style={{ display: 'block', width: '100%' }}
                                  onLoadStart={() => setVideoLoading(true)}
                                  onLoadedMetadata={(e) => {
                                    handleImageLoad(e);
                                    setVideoLoading(false);
                                    const vid = e.target;
                                    if (vid && vid.duration > 0 && vid.currentTime === 0) vid.currentTime = 0.001;
                                  }}
                                  onError={(e) => {
                                    const vid = e.target;
                                    if (!videoCompatibleUrl && vid.error) {
                                      console.log('Video error detected, requesting H.264 transcode:', vid.error);
                                      setVideoTranscoding(true);
                                      fetch(`${process.env.REACT_APP_API_URL}/api/video/transcode`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ videoUrl: currentMedia.url }),
                                      })
                                        .then(r => r.json())
                                        .then(data => {
                                          setVideoTranscoding(false);
                                          if (data.url && data.url !== currentMedia.url) setVideoCompatibleUrl(data.url);
                                        })
                                        .catch(() => setVideoTranscoding(false));
                                    }
                                    setVideoLoading(false);
                                  }}
                                  onCanPlay={() => setVideoLoading(false)}
                                  onWaiting={() => setVideoLoading(true)}
                                  onPlaying={() => setVideoLoading(false)}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    top: 0, left: 0, right: 0, bottom: 44,
                                    cursor: isVideoCommentMode ? 'crosshair' : 'default',
                                    zIndex: isVideoCommentMode ? 5 : -1,
                                    pointerEvents: isVideoCommentMode ? 'auto' : 'none',
                                    background: isVideoCommentMode ? 'rgba(59,130,246,0.04)' : 'transparent',
                                  }}
                                  onClick={(e) => {
                                    if (!isVideoCommentMode) return;
                                    if (touchFiredRef.current) { touchFiredRef.current = false; return; }
                                    handleImageClickWithReposition(e);
                                  }}
                                />
                              </>
                            ) : (
                              <div className="w-96 h-64 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                                <div className="text-center">
                                  <Image className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                                  <p className="text-slate-500 text-xs">No media available</p>
                                </div>
                              </div>
                            )}

                            {/* Render Comment Markers */}
                            {currentMedia && currentMedia.url && commentsForCurrentMedia.map((comment, index) => {
                              if (activeComment && comment.id !== activeComment && !comment.repositioning && !comment.editing) {
                                return null;
                              }
                              const commentX = comment.x ?? comment.position?.x ?? 0;
                              const commentY = comment.y ?? comment.position?.y ?? 0;
                              const isFrac = commentX <= 1 && commentY <= 1;
                              const { contentW = 0, contentH = 0, offsetX = 0, offsetY = 0 } = imageDimensions;
                              const px = isFrac && contentW > 0 ? commentX * contentW + offsetX : commentX;
                              const py = isFrac && contentH > 0 ? commentY * contentH + offsetY : commentY;
                              return (
                                <div
                                  key={`marker-${comment.id}`}
                                  ref={(el) => {
                                    if (el && activeComment === comment.id) {
                                      const r = el.getBoundingClientRect();
                                      if (!activeMarkerRect || activeMarkerRect.top !== r.top || activeMarkerRect.left !== r.left) {
                                        setActiveMarkerRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom });
                                      }
                                    }
                                  }}
                                  style={{
                                    position: "absolute",
                                    top: py - 12,
                                    left: px - 12,
                                    width: 24, height: 24,
                                    background: comment.discarded ? "#94a3b8" : (comment.done ? "#10b981" : comment.repositioning ? "#8b5cf6" : comment.editing ? "#3b82f6" : "#ef4444"),
                                    color: "#fff",
                                    borderRadius: "50%",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontWeight: "bold", fontSize: "11px",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                    cursor: comment.repositioning ? "move" : "pointer",
                                    zIndex: 10,
                                    border: "2px solid #fff",
                                    transition: "all 0.2s",
                                    animation: comment.repositioning ? "pulse 1.5s ease-in-out infinite" : "none",
                                  }}
                                  onMouseEnter={(e) => {
                                    const r = e.currentTarget.getBoundingClientRect();
                                    setActiveMarkerRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom });
                                    setHoveredComment(comment.id);
                                  }}
                                  onMouseLeave={() => setHoveredComment(null)}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (!comment.repositioning) {
                                      const r = e.currentTarget.getBoundingClientRect();
                                      setActiveMarkerRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom });
                                      handleCommentListClick(comment.id);
                                    }
                                  }}
                                >
                                  {index + 1}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Multi-media thumbnails */}
                        {currentVersion.media.length > 1 && (
                          <div className="flex justify-center gap-1.5 mb-3 flex-wrap">
                            {currentVersion.media.map((media, mIdx) => (
                              <button
                                key={mIdx}
                                onClick={() => setSelectedMediaIndex(mIdx)}
                                className={`relative w-10 h-10 rounded overflow-hidden border-2 transition-all ${selectedMediaIndex === mIdx
                                    ? 'border-indigo-500 ring-2 ring-indigo-100'
                                    : 'border-slate-200 hover:border-slate-350'
                                  }`}
                              >
                                {media.type === 'image' && media.url ? (
                                  <img src={media.url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                                    <Video className="h-4 w-4 text-slate-400" />
                                  </div>
                                )}
                                {media.isThumbnail && (
                                  <div className="absolute inset-0 bg-black/55 flex items-center justify-center text-[7px] text-white font-black uppercase tracking-wider">
                                    Cover
                                  </div>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 text-gray-500 text-sm">No media available</div>
                    )
                  ) : null}
                </div>
              </div>

              {/* Caption, Hashtags & Notes card */}
              {currentVersion && (
                <div className="flex flex-col gap-3">
                  <div className="bg-white rounded-xl p-3 border border-gray-200/50 shadow-sm">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Caption</label>
                    <p className="text-gray-855 text-xs leading-relaxed whitespace-pre-wrap">{currentVersion.caption || 'No caption'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-200/50 shadow-sm">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Hashtags</label>
                    <p className="text-blue-600 text-xs font-semibold leading-relaxed whitespace-pre-wrap">{currentVersion.hashtags || 'No hashtags'}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-gray-200/50 shadow-sm">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</label>
                    <p className="text-gray-855 text-xs leading-relaxed whitespace-pre-wrap">{currentVersion.notes || 'No notes'}</p>
                  </div>
                  {currentVersion?.thumbnailUrl && (
                    <div className="bg-white rounded-xl p-3 border border-gray-200/50 shadow-sm inline-block self-start">
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Video Thumbnail</label>
                      <img
                        src={currentVersion.thumbnailUrl}
                        alt="Video thumbnail"
                        className="w-20 h-20 object-cover rounded border border-gray-250 mt-1"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Customer Actions */}
              <div className="flex justify-center pt-2">
                {!['approved', 'approved_by_customer', 'published'].includes(getDisplayStatus(selectedContent)) ? (
                  <div className="flex gap-2 w-full max-w-md justify-center">
                    <button
                      onClick={handleApproveContent}
                      disabled={approvingContent}
                      className="flex-1 max-w-[200px] inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl font-bold text-xs shadow-md transition-all disabled:opacity-50"
                    >
                      {approvingContent ? 'Approving...' : 'Approve Content'}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {['approved', 'approved_by_customer'].includes(getDisplayStatus(selectedContent)) && (
                      <>
                        <div className="inline-flex items-center px-4 py-1.5 bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-800 font-bold text-xs">
                          <CheckCircle className="h-4 w-4 text-emerald-600 mr-1.5" />
                          Approved by Customer
                        </div>
                        <button
                          onClick={handleUndoApprove}
                          disabled={undoingApprove}
                          className="inline-flex items-center justify-center px-3 py-1.5 bg-white border border-amber-300 text-amber-705 hover:bg-amber-50 rounded-xl font-semibold text-xs transition-colors"
                        >
                          Undo Approve
                        </button>
                      </>
                    )}
                    {getDisplayStatus(selectedContent) === 'published' && (
                      <div className="inline-flex items-center px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 font-bold text-xs">
                        <CheckCircle className="h-4 w-4 text-blue-600 mr-1.5" />
                        Published
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column (space-y-3) */}
            <div className="space-y-3">
              {/* Version History panel */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200/50 bg-green-50/50">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center">
                    <FileText className="h-4 w-4 text-green-600 mr-1.5" />
                    Version History
                  </h3>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {selectedContent.versions.map((version, index) => {
                    const fd = formatDate(version.createdAt);
                    return (
                      <div className="relative border-b border-gray-105 last:border-0" key={version.id}>
                        <button
                          onClick={() => handleVersionSelect(index)}
                          className={`w-full text-left px-3 py-2 flex flex-col border-l-2 transition-colors ${selectedVersionIndex === index
                              ? 'bg-purple-50 border-l-purple-600'
                              : 'bg-white border-l-transparent hover:bg-gray-50'
                            }`}
                        >
                          <span className="font-semibold text-gray-900 text-xs">V{version.versionNumber}</span>
                          <div className="flex items-center text-[10px] text-gray-500 gap-2 mt-0.5">
                            <span className="flex items-center"><Calendar className="h-2.5 w-2.5 mr-0.5" />{fd}</span>
                            {version.media?.length > 0 && (
                              <span className="flex items-center"><Image className="h-2.5 w-2.5 mr-0.5" />{version.media.length}</span>
                            )}
                            {version.comments?.length > 0 && (
                              <span className="flex items-center"><MessageSquare className="h-2.5 w-2.5 mr-0.5" />{version.comments.length}</span>
                            )}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Comments Panel */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden flex flex-col">
                <div className="px-3 py-2 border-b border-gray-200/50 bg-blue-50/50 flex items-center justify-between flex-shrink-0">
                  <h3 className="text-xs font-bold text-gray-900 flex items-center">
                    <MessageSquare className="h-4 w-4 text-blue-600 mr-1.5" />
                    Comments ({commentsForCurrentMedia.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                      <span className="text-[9px] text-gray-500">Internal</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-[9px] text-gray-500">External</span>
                    </div>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto p-2.5 space-y-2 flex-1">
                  {commentsForCurrentMedia.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="bg-gray-50 rounded-full w-8 h-8 flex items-center justify-center mx-auto mb-1.5">
                        <MessageSquare className="h-4 w-4 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-xs font-medium">No comments yet</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Click on the media to place a comment pin</p>
                    </div>
                  ) : (
                    commentsForCurrentMedia.map((comment, idx) => {
                      const isAdminComment = comment.authorRole === 'admin' || comment.author === 'Admin';
                      const isInternal = isAdminComment || comment.reviewType === 'internal';
                      const isDone = comment.done || comment.status === 'completed';
                      const isActive = activeComment === comment.id;
                      const isReplying = replyingTo === comment.id;
                      return (
                        <div
                          key={comment.id || idx}
                          className={`rounded-lg border transition-colors overflow-hidden cursor-pointer ${isActive
                              ? isAdminComment ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
                              : isAdminComment ? 'bg-white border-purple-100 hover:bg-purple-50/40' : 'bg-gray-50 border-gray-200 hover:bg-blue-50/40'
                            }`}
                          onClick={() => handleCommentListClick(comment.id)}
                        >
                          <div className="p-2 flex items-start gap-2">
                            <span className={`font-bold rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0 border ${isAdminComment ? 'text-purple-700 bg-purple-100 border-purple-200' : 'text-blue-700 bg-blue-100 border-blue-200'
                              }`}>{idx + 1}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${isAdminComment ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                  {isAdminComment ? <UserCog className="h-2 w-2" /> : <User className="h-2 w-2" />}
                                  {isAdminComment ? 'Admin' : 'Customer'}
                                </span>
                                {(comment.authorEmail || comment.authorName || comment.author) && (
                                  <span className="text-[9px] text-gray-400 truncate max-w-[90px]">
                                    {comment.authorEmail || comment.authorName || comment.author}
                                  </span>
                                )}
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${isInternal ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                  {isInternal ? 'Internal' : 'External'}
                                </span>
                              </div>
                              <p className={`text-xs font-medium break-words ${comment.discarded ? 'text-gray-400 line-through' : 'text-gray-955'}`}>
                                {comment.message || comment.comment}
                                {isDone && <span className="ml-1.5 text-green-600 text-[10px]">✓</span>}
                                {comment.discarded && <span className="ml-1.5 text-orange-600 text-[10px] font-bold">(Discarded)</span>}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[9px] text-gray-400">
                                  {comment.timestamp ? formatDate(comment.timestamp) : ''}
                                </span>
                                {comment.videoTimestamp != null && (
                                  <button
                                    title="Jump to this moment in the video"
                                    className="inline-flex items-center gap-1 bg-orange-500 text-white px-2 py-0.5 rounded-full text-[9px] font-bold hover:bg-orange-600 active:scale-95 transition-all shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (videoRef.current) {
                                        videoRef.current.currentTime = comment.videoTimestamp;
                                        videoRef.current.pause();
                                        videoPausedAtRef.current = comment.videoTimestamp;
                                        videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                      }
                                    }}
                                  >
                                    <span className="relative flex h-1.5 w-1.5">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                                    </span>
                                    ⏱ {formatVideoTime(comment.videoTimestamp)}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Threaded Discussion replies */}
                          <div className="mx-2 mb-2 pl-4 border-l-2 border-indigo-100 space-y-1.5">
                            {(() => {
                              const replies = comment.replies || (comment.adminReply ? [{
                                id: 'legacy-reply',
                                authorRole: 'admin',
                                authorName: comment.adminReply.adminName || 'Admin',
                                authorEmail: comment.adminReply.adminEmail || '',
                                message: comment.adminReply.text,
                                timestamp: comment.adminReply.timestamp
                              }] : []);
                              return replies.map((rep, rIdx) => {
                                return (
                                  <div key={rep.id || rIdx} className={`p-1.5 rounded text-[10px] border ${rep.authorRole === 'admin' ? 'bg-purple-50/50 border-purple-100' : rep.authorRole === 'creator' ? 'bg-green-50/50 border-green-100' : 'bg-blue-50/50 border-blue-100'}`}>
                                    <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                                      <span className={`font-semibold ${rep.authorRole === 'admin' ? 'text-purple-750 font-bold' : rep.authorRole === 'creator' ? 'text-green-750 font-bold' : 'text-blue-750 font-bold'}`}>
                                        {rep.authorRole === 'admin' ? 'Admin' : rep.authorRole === 'creator' ? 'Creator' : 'Customer'}
                                      </span>
                                      <span className="text-[8px] text-gray-400 ml-auto">
                                        {rep.timestamp ? new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-gray-700 break-words font-medium">{rep.message || rep.text}</p>
                                  </div>
                                );
                              });
                            })()}
                          </div>

                          {/* Inline reply textarea for Customer */}
                          {isReplying && isActive && (
                            <div className="mx-2 mb-2" onClick={(e) => e.stopPropagation()}>
                              <textarea
                                autoFocus
                                className="w-full rounded-lg border border-blue-200 bg-blue-50 text-xs text-gray-900 placeholder-gray-400 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
                                rows={2}
                                placeholder="Type reply to Admin… (Ctrl+Enter to send)"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReplySubmit(comment.id); }}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <div className="flex gap-1.5 mt-1">
                                <button
                                  className="flex-1 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold disabled:opacity-50"
                                  disabled={savingReply}
                                  onClick={(e) => { e.stopPropagation(); handleReplySubmit(comment.id); }}
                                >
                                  {savingReply ? 'Sending…' : 'Send Reply'}
                                </button>
                                <button
                                  className="flex-1 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-semibold"
                                  onClick={(e) => { e.stopPropagation(); handleCancelReply(); }}
                                >Cancel</button>
                              </div>
                            </div>
                          )}

                          {/* Action buttons (when active) */}
                          {isActive && (
                            <div className="flex items-center gap-1 px-2 pb-2" onClick={(e) => e.stopPropagation()}>
                              {!isAdminComment && !comment.done && (
                                <button
                                  className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                                  onClick={(e) => { e.stopPropagation(); handleMarkDone(comment.id); }}
                                >
                                  Done
                                </button>
                              )}
                              {!isAdminComment && (
                                <>
                                  <button
                                    className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded-md font-medium hover:bg-purple-100 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); handleStartReply(comment.id); }}
                                  >
                                    Reply
                                  </button>
                                  <button
                                    className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-blue-50 text-blue-700 border border-blue-200 rounded-md hover:bg-blue-105 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); handleEditComment(comment.id); }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-purple-50 text-purple-750 border border-purple-200 rounded-md hover:bg-purple-100 transition-colors"
                                    onClick={(e) => { e.stopPropagation(); handleRepositionStart(comment.id); }}
                                  >
                                    Move
                                  </button>
                                </>
                              )}
                              {!isAdminComment && (
                                <button
                                  className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-red-50 text-red-500 border border-red-200 rounded-md hover:bg-red-100 transition-colors ml-auto"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Viewport-safe comment popup */}
        {(() => {
          const popupCommentId = activeComment || hoveredComment;
          if (!popupCommentId || !activeMarkerRect) return null;
          const comment = commentsForCurrentMedia.find(c => c.id === popupCommentId);
          if (!comment || comment.repositioning) return null;
          const isReplying = replyingTo === comment.id;
          const isActive = activeComment === comment.id;
          const isAdminComment = comment.authorRole === 'admin';
          const borderColor = isAdminComment ? '#7c3aed' : '#3b82f6';
          const boxShadow = isAdminComment ? '0 6px 24px rgba(124,58,237,0.18)' : '0 4px 20px rgba(59,130,246,0.15)';
          const POPUP_W = Math.min(270, window.innerWidth - 16);
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          let left = activeMarkerRect.right + 12;
          if (left + POPUP_W > vw - 8) left = activeMarkerRect.left - POPUP_W - 12;
          left = Math.max(8, Math.min(vw - POPUP_W - 8, left));
          let top = (activeMarkerRect.top + activeMarkerRect.bottom) / 2 - 100;
          top = Math.max(8, Math.min(vh - 340, top));
          return (
            <div
              style={{
                position: 'fixed', top, left, width: POPUP_W,
                background: '#fff', border: `2px solid ${borderColor}`,
                borderRadius: '10px', padding: '12px', zIndex: 9999, boxShadow,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {comment.editing ? (
                <>
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                      <User className="h-2.5 w-2.5 text-white" />
                    </div>
                    <span className="text-[10px] font-semibold text-blue-700">Customer</span>
                  </div>
                  <textarea
                    value={comment.comment}
                    onChange={(e) => handleCommentChange(comment.id, e.target.value)}
                    placeholder="Add comment… (Ctrl+Enter to save)"
                    className="w-full p-2 border border-blue-200 bg-blue-50 rounded-lg resize-none text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    rows={3}
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleCommentSubmit(comment.id); }}
                  />
                  <div className="flex gap-1.5 mt-2">
                    <button
                      className="flex-1 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold"
                      onClick={(e) => { e.stopPropagation(); handleCommentSubmit(comment.id); }}
                    >
                      Save
                    </button>
                    <button
                      className="flex-1 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-semibold"
                      onClick={(e) => { e.stopPropagation(); handleCommentCancel(comment.id); }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${isAdminComment ? 'bg-purple-600' : 'bg-blue-500'}`}>
                      {isAdminComment ? <UserCog className="h-2 w-2 text-white" /> : <User className="h-2 w-2 text-white" />}
                    </div>
                    <span className={`text-[10px] font-semibold ${isAdminComment ? 'text-purple-700' : 'text-blue-700'}`}>
                      {isAdminComment ? 'Admin' : 'Customer'}
                    </span>
                    {(comment.authorEmail || comment.authorName) && (
                      <span className="text-[9px] text-gray-400 truncate max-w-[100px]">
                        {comment.authorEmail || comment.authorName}
                      </span>
                    )}
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${(isAdminComment || comment.reviewType === 'internal') ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                      {(isAdminComment || comment.reviewType === 'internal') ? 'Internal' : 'External'}
                    </span>
                  </div>
                  <p className={`text-xs font-medium break-words ${comment.discarded ? 'text-gray-400 line-through' : 'text-gray-905'}`}>
                    {comment.comment}
                    {comment.done && <span className="ml-1.5 text-green-600 text-[10px]">✓</span>}
                    {comment.discarded && <span className="ml-1.5 text-orange-600 text-[10px] font-bold">(Discarded)</span>}
                  </p>
                  {/* Threaded replies */}
                  <div className="mt-1.5 max-h-32 overflow-y-auto pl-2 border-l border-gray-200 space-y-1">
                    {(() => {
                      const replies = comment.replies || (comment.adminReply ? [{
                        id: 'legacy-reply',
                        authorRole: 'admin',
                        authorName: comment.adminReply.adminName || 'Admin',
                        authorEmail: comment.adminReply.adminEmail || '',
                        message: comment.adminReply.text,
                        timestamp: comment.adminReply.timestamp
                      }] : []);
                      return replies.map((rep, rIdx) => {
                        return (
                          <div key={rep.id || rIdx} className={`p-1 rounded text-[9px] border ${rep.authorRole === 'admin' ? 'bg-purple-50 border-purple-100' : rep.authorRole === 'creator' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
                            <span className="font-semibold">{rep.authorRole === 'admin' ? 'Admin' : rep.authorRole === 'creator' ? 'Creator' : 'Customer'}: </span>
                            <span className="text-gray-700">{rep.message || rep.text}</span>
                          </div>
                        );
                      });
                    })()}
                  </div>

                  {/* Viewport popup reply input */}
                  {isReplying && isActive && (
                    <div className="mt-1.5" onClick={(e) => e.stopPropagation()}>
                      <textarea
                        autoFocus
                        className="w-full rounded border border-blue-200 bg-blue-50 text-[11px] text-gray-900 p-1 resize-none focus:outline-none"
                        rows={2}
                        placeholder="Reply…"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReplySubmit(comment.id); }}
                      />
                      <div className="flex gap-1 mt-0.5">
                        <button
                          className="flex-1 py-0.5 rounded bg-blue-600 text-white text-[9px] font-semibold"
                          onClick={(e) => { e.stopPropagation(); handleReplySubmit(comment.id); }}
                        >Send</button>
                        <button
                          className="flex-1 py-0.5 rounded bg-gray-100 text-gray-650 text-[9px]"
                          onClick={(e) => { e.stopPropagation(); handleCancelReply(); }}
                        >Cancel</button>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-gray-100 flex-wrap">
                    {comment.videoTimestamp != null && (
                      <button
                        className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-orange-50 text-orange-700 rounded-md hover:bg-orange-100 font-semibold"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (videoRef.current) { videoRef.current.currentTime = comment.videoTimestamp; videoRef.current.pause(); }
                        }}
                      >
                        ▶ {formatVideoTime(comment.videoTimestamp)}
                      </button>
                    )}
                    {!comment.done && (
                      <button
                        className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-green-50 text-green-700 rounded-md hover:bg-green-100"
                        onClick={(e) => { e.stopPropagation(); handleMarkDone(comment.id); }}
                      >
                        <CheckCircle className="h-2.5 w-2.5" />Done
                      </button>
                    )}
                    <button
                      className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100"
                      onClick={(e) => { e.stopPropagation(); handleStartReply(comment.id); }}
                    >
                      Reply
                    </button>
                    <button
                      className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-amber-50 text-amber-700 rounded-md hover:bg-amber-100"
                      onClick={(e) => { e.stopPropagation(); handleEditComment(comment.id); }}
                    >
                      <Edit3 className="h-2.5 w-2.5" />Edit
                    </button>
                    <button
                      className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-cyan-50 text-cyan-700 rounded-md hover:bg-cyan-100"
                      onClick={(e) => { e.stopPropagation(); handleRepositionStart(comment.id); }}
                    >
                      <Move className="h-2.5 w-2.5" />Move
                    </button>
                    <button
                      className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-red-50 text-red-500 rounded-md hover:bg-red-100 ml-auto"
                      onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                    >
                      <Trash2 className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  // Standalone list view fallback (direct access route without selectedContent/targetItemId)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top navbar */}
      <header className="bg-white border-b border-slate-200 py-3 px-6 flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Airspark Customer Portal</h1>
        <button
          onClick={() => navigate('/customer/calendar')}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
        >
          View Calendar
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar list */}
        <aside className="w-72 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
          <div className="px-4 pt-4 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Content Review Items</h2>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={sidebarSearch}
                onChange={e => setSidebarSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {filteredContentItems.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">No items found</div>
            ) : (
              filteredContentItems.map((item) => {
                const itemIndex = contentItems.findIndex(ci => ci.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleContentSelect(item, itemIndex)}
                    className="mx-2 mb-1.5 rounded-xl cursor-pointer border p-3 flex items-start gap-2 bg-white border-slate-100 hover:border-indigo-150 hover:bg-slate-50 transition"
                  >
                    <div className="w-6 h-6 rounded bg-slate-150 flex items-center justify-center text-[10px] font-bold text-slate-600">
                      {itemIndex + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[9px] font-bold px-1 rounded border ${getStatusColor(getDisplayStatus(item))}`}>
                          {getStatusLabel(getDisplayStatus(item))}
                        </span>
                        <span className="text-[9px] text-slate-500">{item.platform}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>
        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center max-w-sm mx-auto">
            <div className="bg-indigo-50 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-indigo-500" />
            </div>
            <h3 className="text-slate-700 font-semibold text-base mb-1">No post selected</h3>
            <p className="text-slate-400 text-sm">Select an item from the sidebar to review its content</p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default ContentReview;