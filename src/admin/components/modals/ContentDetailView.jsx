import React, { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  Send, Image, MessageSquare, ChevronLeft, ChevronRight,
  Trash2, Check, X, CornerDownRight, UserCog, User, MessageCircle,
  Clock, CheckCircle, XCircle, Loader2, Facebook, Instagram, Video, RotateCcw,
  Edit3, Move, AlertCircle, Upload, CheckCheck
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

// Helper: human-readable status label
const getStatusLabel = (status) => {
  switch (status) {
    case 'approved_admin': return 'Approved by Admin';
    case 'approved_customer': return 'Approved by Customer';
    case 'approved_both': return 'Approved by Admin & Customer';
    case 'under_review': return 'Under Review';
    case 'revision_requested': return 'Revision Requested';
    case 'published': return 'Published';
    case 'submitted': return 'Submitted';
    case 'rejected': return 'Rejected';
    case 'pending_customer_review': return 'Pending Customer Review';
    case 'changes_requested_admin': return 'Changes Requested by Admin';
    case 'customer_feedback_pending_admin': return 'Customer Feedback Pending Admin Review';
    case 'changes_requested_customer_approved_admin': return 'Changes Requested by Customer (Approved by Admin)';
    case 'changes_requested': return 'Changes Requested';
    default: return (status || '').replace(/_/g, ' ');
  }
};

const getStatusColorLocal = (status) => {
  switch (status) {
    case 'under_review':
    case 'submitted':
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
      return 'bg-violet-100 text-violet-850 border-violet-350';
    case 'pending_customer_review':
      return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    case 'changes_requested_admin':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'customer_feedback_pending_admin':
      return 'bg-purple-100 text-purple-800 border-purple-300';
    case 'changes_requested_customer_approved_admin':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
};

// ── Author badge ──────────────────────────────────────────────────────────────
const AuthorBadge = ({ comment }) => {
  const isAdmin = comment.authorRole === 'admin';
  const isInternal = isAdmin || comment.reviewType === 'internal';
  return (
    <div className="flex items-center gap-1 mb-1 flex-wrap">
      <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 ${isAdmin ? 'bg-purple-600' : 'bg-blue-500'}`}>
        {isAdmin ? <UserCog className="h-2 w-2 text-white" /> : <User className="h-2 w-2 text-white" />}
      </div>
      <span className={`text-[10px] font-semibold ${isAdmin ? 'text-purple-700' : 'text-blue-700'}`}>
        {isAdmin ? 'Admin' : 'Customer'}
      </span>
      {(comment.authorEmail || comment.authorName) && (
        <span className="text-[9px] text-gray-400 truncate max-w-[120px]">
          {comment.authorEmail || comment.authorName}
        </span>
      )}
      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${isInternal ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
        {isInternal ? 'Internal' : 'External'}
      </span>
    </div>
  );
};


const formatVideoTime = (seconds) => {
  if (seconds == null || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// ── Comment Marker (pin on media) ─────────────────────────────────────────────
const CommentMarker = memo(({
  comment, index, active, hovered,
  onToggle, onHover, onLeave,
  onChange, onSubmit, onCancel,
  onDelete, onMarkDone, onToggleDiscard,
  replyingTo, replyText, onStartReply, onReplyTextChange, onReplySubmit, onCancelReply,
  adminUser,
}) => {
  const isAdmin = comment.authorRole === 'admin';
  const isInternal = isAdmin || comment.reviewType === 'internal';
  const dotBg = comment.discarded ? '#94a3b8' : (isAdmin ? '#7c3aed' : (comment.done ? '#10b981' : '#ef4444'));
  const dotBorder = isAdmin ? '#a78bfa' : '#fff';
  const isReplying = replyingTo === comment.id;

  const x = comment.x ?? comment.position?.x ?? 0;
  const y = comment.y ?? comment.position?.y ?? 0;
  const isNormalized = (x >= 0 && x <= 1 && y >= 0 && y <= 1) || comment.reviewType === 'external';

  const pinTop = isNormalized ? `calc(${y * 100}% - 12px)` : `${y - 12}px`;
  const pinLeft = isNormalized ? `calc(${x * 100}% - 12px)` : `${x - 12}px`;

  // Popup left/right: flip when pin is in right half of image
  const isRightHalf = isNormalized ? x > 0.5 : x > 200;
  const popupLeft = isRightHalf ? 'auto' : 40;
  const popupRight = isRightHalf ? 40 : 'auto';

  const popupStyle = {
    position: 'absolute', left: popupLeft, right: popupRight,
    top: '50%', transform: 'translateY(-50%)',
    background: '#fff', borderRadius: '10px', padding: '12px',
    minWidth: '240px', maxWidth: '290px', zIndex: 40,
  };

  return (
    <div
      data-cdv-marker="true"
      style={{
        position: 'absolute',
        top: pinTop,
        left: pinLeft,
        width: 24, height: 24,
        background: dotBg, color: '#fff',
        borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', fontSize: '11px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        cursor: 'pointer', zIndex: 10,
        border: `2px solid ${dotBorder}`,
        transform: (active || hovered) ? 'scale(1.15)' : 'scale(1)',
        transition: 'transform 0.15s',
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
    >
      {index + 1}

      {/* ── NEW COMMENT editing popup ── */}
      {comment.editing && (
        <div style={{ ...popupStyle, border: '2px solid #7c3aed', boxShadow: '0 6px 24px rgba(124,58,237,0.18)' }}
          onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 mb-2">
            <div className="w-4 h-4 rounded-full bg-purple-600 flex items-center justify-center">
              <UserCog className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-purple-700">Admin</span>
            <span className="text-[9px] text-gray-400 truncate max-w-[110px]">{adminUser?.email || ''}</span>
          </div>
          <textarea
            autoFocus
            className="w-full rounded-lg border border-purple-200 bg-purple-50 text-xs text-gray-900 placeholder-gray-400 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
            rows={3}
            placeholder="Add your comment… (Ctrl+Enter to save)"
            value={comment.comment}
            onChange={(e) => onChange(comment.id, e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSubmit(comment.id); }}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-1.5 mt-2">
            <button className="flex-1 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-semibold"
              onClick={(e) => { e.stopPropagation(); onSubmit(comment.id); }}>
              <Check className="h-2.5 w-2.5 inline mr-0.5" />Save
            </button>
            <button className="flex-1 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-semibold"
              onClick={(e) => { e.stopPropagation(); onCancel(comment.id); }}>
              <X className="h-2.5 w-2.5 inline mr-0.5" />Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW popup ── */}
      {!comment.editing && (active || hovered) && (
        <div style={{ ...popupStyle, border: `2px solid ${isAdmin ? '#7c3aed' : '#3b82f6'}`, boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
          onClick={(e) => e.stopPropagation()}>
          <AuthorBadge comment={comment} />
          <p className={`text-xs font-medium leading-relaxed break-words ${comment.discarded ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {comment.message || comment.comment}
            {comment.done && <span className="ml-1.5 text-green-600 text-[10px]">✓</span>}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">
            {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
          </p>
          {comment.videoTimestamp != null && (
            <div className="mt-1.5">
              <span className="inline-flex items-center gap-1 bg-orange-500 text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">
                ⏱ {formatVideoTime(comment.videoTimestamp)}
              </span>
            </div>
          )}

          {/* Threaded Discussion replies */}
          <div className="mt-2 pl-3 border-l border-gray-200 space-y-1.5 max-h-36 overflow-y-auto">
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
                const isRepAdmin = rep.authorRole === 'admin';
                return (
                  <div key={rep.id || rIdx} className={`p-1 text-[10px] rounded-md border ${rep.authorRole === 'admin' ? 'bg-purple-50 border-purple-100' : rep.authorRole === 'creator' ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100'}`}>
                    <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                      <span className={`font-semibold ${rep.authorRole === 'admin' ? 'text-purple-700' : rep.authorRole === 'creator' ? 'text-green-700' : 'text-blue-700'}`}>
                        {rep.authorRole === 'admin' ? 'Admin' : rep.authorRole === 'creator' ? 'Creator' : 'Customer'}
                      </span>
                      {rep.authorEmail && (
                        <span className="text-[8px] text-gray-400 truncate max-w-[80px]">{rep.authorEmail}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-800 break-words">{rep.message || rep.text}</p>
                  </div>
                );
              });
            })()}
          </div>

          {/* Reply input */}
          {!isAdmin && isReplying ? (
            <div className="mt-2" onClick={(e) => e.stopPropagation()}>
              <textarea autoFocus
                className="w-full rounded-lg border border-purple-200 bg-purple-50 text-xs text-gray-900 placeholder-gray-400 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                rows={2} placeholder="Type admin reply…"
                value={replyText}
                onChange={(e) => onReplyTextChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onReplySubmit(comment.id); }}
              />
              <div className="flex gap-1 mt-1">
                <button className="flex-1 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-semibold"
                  onClick={(e) => { e.stopPropagation(); onReplySubmit(comment.id); }}>Send Reply</button>
                <button className="flex-1 py-1 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-semibold"
                  onClick={(e) => { e.stopPropagation(); onCancelReply(); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 mt-2 pt-1.5 border-t border-gray-100">
              {!isAdmin && (
                <button className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-purple-50 text-purple-700 rounded-md font-medium hover:bg-purple-100"
                  onClick={(e) => { e.stopPropagation(); onStartReply(comment.id); }}>
                  <CornerDownRight className="h-2.5 w-2.5" />Reply
                </button>
              )}

              {!isInternal && (
                <button className={`flex items-center gap-0.5 px-2 py-0.5 text-[10px] rounded-md font-semibold ${comment.discarded ? 'bg-orange-100 text-orange-700' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                  onClick={(e) => { e.stopPropagation(); onToggleDiscard(comment.id); }}>
                  <XCircle className="h-2.5 w-2.5" />{comment.discarded ? 'Discarded' : 'Discard'}
                </button>
              )}
              {isAdmin && (
                <button className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-red-50 text-red-500 rounded-md hover:bg-red-100 ml-auto"
                  onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}>
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

CommentMarker.displayName = 'CommentMarker';

function ContentDetailView({
  selectedContent,
  getCustomerName,
  formatDate,
  getStatusColor,
  getStatusIcon,
  isContentPublished,
  getPublishedPlatformsForContent,
  handleScheduleContent,
  isVideoUrl,
  calendarName,
  itemName,
  onDeleteVersion,
  onRefresh,
  scheduledPosts,
  onDeleteScheduledPost,
}) {
  const navigate = useNavigate();
  // ── Admin user from localStorage ─────────────────────────────────────────
  const adminUser = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u || { name: 'Admin', email: '' };
    } catch { return { name: 'Admin', email: '' }; }
  }, []);

  const itemScheduledPosts = useMemo(() => {
    if (!scheduledPosts || !selectedContent) return [];
    return scheduledPosts.filter(post => {
      const postId = post.item_id || post.contentId;
      if (postId) {
        return String(postId) === String(selectedContent.id);
      }
      const itemTitle = selectedContent.title || selectedContent.description || selectedContent.itemName;
      return Boolean(post.item_name && itemTitle && String(post.item_name).trim().toLowerCase() === String(itemTitle).trim().toLowerCase());
    });
  }, [scheduledPosts, selectedContent]);

  const getPlatformIcon = useCallback((platform) => {
    switch ((platform || '').toLowerCase()) {
      case 'facebook':
        return <Facebook className="h-4 w-4 text-[#0066CC]" />;
      case 'instagram':
        return <Instagram className="h-4 w-4 text-pink-600" />;
      case 'both':
        return (
          <div className="flex space-x-0.5">
            <Facebook className="h-3.5 w-3.5 text-[#0066CC]" />
            <Instagram className="h-3.5 w-3.5 text-pink-600" />
          </div>
        );
      case 'youtube':
        return <div className="h-4 w-4 bg-red-600 text-white rounded text-[9px] flex items-center justify-center font-bold">YT</div>;
      case 'twitter':
      case 'x':
        return <div className="h-4 w-4 bg-black text-white rounded text-[9px] flex items-center justify-center font-bold">X</div>;
      case 'linkedin':
        return <div className="h-4 w-4 bg-blue-700 text-white rounded text-[9px] flex items-center justify-center font-bold">In</div>;
      default:
        return <div className="h-4 w-4 bg-gray-400 text-white rounded text-[9px] flex items-center justify-center">?</div>;
    }
  }, []);

  const getScheduledStatusColor = useCallback((status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-800 border-yellow-250';
      case 'published': return 'bg-green-50 text-green-800 border-green-250';
      case 'failed': return 'bg-red-50 text-red-800 border-red-250';
      case 'processing': return 'bg-blue-50 text-blue-800 border-blue-250';
      default: return 'bg-gray-50 text-gray-800 border-gray-250';
    }
  }, []);

  const getScheduledStatusIcon = useCallback((status) => {
    switch (status) {
      case 'pending': return <Clock className="h-3 w-3" />;
      case 'published': return <CheckCircle className="h-3 w-3" />;
      case 'failed': return <XCircle className="h-3 w-3 text-red-500" />;
      case 'processing': return <Loader2 className="h-3 w-3 animate-spin text-blue-500" />;
      default: return <Clock className="h-3 w-3" />;
    }
  }, []);

  const getFailureReason = useCallback((post) => {
    if (!post.error && !post.errorMessage && !post.failureReason) {
      return 'Publishing failed. Please try again.';
    }
    const errorText = post.error || post.errorMessage || post.failureReason || '';
    const lowerError = errorText.toLowerCase();

    // Check specific media issues first
    if (lowerError.includes('aspect ratio')) {
      return 'The image aspect ratio is not supported by the platform. Please use a valid aspect ratio (e.g., 4:5 for Instagram).';
    }
    if (lowerError.includes('size') || lowerError.includes('large')) {
      return 'The file is too large. Please use a smaller file.';
    }
    if (lowerError.includes('rate limit') || lowerError.includes('too many') ||
      lowerError.includes('limit exceeded') || lowerError.includes('429')) {
      return 'Posting limit reached. Please wait a few minutes and try again.';
    }

    // Then connection/permission issues
    if (lowerError.includes('access token') || lowerError.includes('accesstoken') ||
      lowerError.includes('invalid token') || lowerError.includes('token expired') ||
      lowerError.includes('unauthorized') || lowerError.includes('401') ||
      lowerError.includes('login required')) {
      return 'Your social account connection has expired. Please reconnect in Settings.';
    }
    if (lowerError.includes('permission') || lowerError.includes('403') ||
      lowerError.includes('forbidden') || lowerError.includes('not allowed')) {
      return 'Permission issue. Please reconnect your account in Settings.';
    }

    // Generic media check
    if (lowerError.includes('image') || lowerError.includes('photo') ||
      lowerError.includes('video') || lowerError.includes('media') ||
      lowerError.includes('file')) {
      return 'There was an issue with the media file.';
    }

    return errorText || 'Publishing failed. Please try again.';
  }, []);

  // ── Core UI state ────────────────────────────────────────────────────────
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);
  const [addingComment, setAddingComment] = useState(false);
  const videoRef = useRef(null);
  const videoPausedAtRef = useRef(null);
  const prevAdminContentIdRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!activeComment) return;
      const isInsideMarker = e.target.closest('[data-cdv-marker]');
      const isInsideSidebarComment = e.target.closest('[data-cdv-sidebar-comment]');
      if (!isInsideMarker && !isInsideSidebarComment) {
        setActiveComment(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeComment]);

  // ── Reply state ──────────────────────────────────────────────────────────
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

  // ── Internal Review state & actions ──────────────────────────────────────
  const [, setTick] = useState(0);
  const [approvingAdmin, setApprovingAdmin] = useState(false);
  const [sendingCustomer, setSendingCustomer] = useState(false);
  const [undoingAdmin, setUndoingAdmin] = useState(false);
  const [finalizingFeedback, setFinalizingFeedback] = useState(false);

  const hasPendingCommentsToSend = useMemo(() => {
    return commentsForVersion.some(c =>
      !c.finalized &&
      !c.discarded &&
      !c.isNew &&
      !c.editing
    );
  }, [commentsForVersion]);

  const hasUnresolvedComments = useMemo(() => {
    return commentsForVersion.some(c => {
      const isExternal = c.reviewType === 'external' || c.authorRole === 'customer' || (c.authorRole !== 'admin' && c.reviewType !== 'internal');
      return isExternal && !c.done && c.status !== 'completed' && !c.discarded;
    });
  }, [commentsForVersion]);


  const handleFinalizeFeedback = useCallback(async (option) => {
    const vId = selectedContent?.versions?.[selectedVersionIndex]?.id;
    if (!vId) return;
    const isCustomerFeedbackPending = selectedContent?.versions?.[selectedVersionIndex]?.status === 'customer_feedback_pending_admin';
    if (!hasPendingCommentsToSend && !isCustomerFeedbackPending) return;
    setFinalizingFeedback(true);
    const targetStatus = option === 'direct' ? 'changes_requested_customer_approved_admin' : 'revision_requested';
    try {
      const res = await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(vId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: vId,
          status: targetStatus,
          finalize_comments: true,
        }),
      });
      if (res.ok) {
        if (selectedContent?.versions?.[selectedVersionIndex]) {
          selectedContent.versions[selectedVersionIndex].status = targetStatus;
          selectedContent.versions[selectedVersionIndex].comments = (selectedContent.versions[selectedVersionIndex].comments || []).map(c => ({
            ...c,
            finalized: true
          }));
        }
        setCommentsForVersion(prev => prev.map(c => ({ ...c, finalized: true })));
        setTick(t => t + 1);
        onRefresh?.();
        alert('Feedback sent to Content Creator successfully!');
      }
    } catch (err) {
      console.error('Failed to finalize feedback', err);
    } finally {
      setFinalizingFeedback(false);
    }
  }, [selectedContent, selectedVersionIndex, onRefresh, hasPendingCommentsToSend, API_URL]);

  const handleApproveAdmin = useCallback(async () => {
    const vId = selectedContent?.versions?.[selectedVersionIndex]?.id;
    if (!vId) return;
    setApprovingAdmin(true);
    try {
      const res = await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(vId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: vId,
          status: 'pending_customer_review',
          approvalNotes: 'Approved by admin',
          approved_by_admin: true,
          approved_by_admin_name: adminUser?.name || 'Admin',
          approved_by_admin_email: adminUser?.email || '',
        }),
      });
      if (res.ok) {
        // Automatically send to customer
        await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(vId)}/send-to-customer`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        });

        if (selectedContent?.versions?.[selectedVersionIndex]) {
          selectedContent.versions[selectedVersionIndex].approved_by_admin = true;
          selectedContent.versions[selectedVersionIndex].status = 'pending_customer_review';
          selectedContent.versions[selectedVersionIndex].submission_stage = 'customer';
        }
        setTick(t => t + 1);
        onRefresh?.();
      }
    } catch (err) {
      console.error('Failed to approve admin', err);
    } finally {
      setApprovingAdmin(false);
    }
  }, [selectedContent, selectedVersionIndex, adminUser, onRefresh]);

  const handleSendToCustomerStage = useCallback(async () => {
    const vId = selectedContent?.versions?.[selectedVersionIndex]?.id;
    if (!vId) return;
    setSendingCustomer(true);
    try {
      const res = await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(vId)}/send-to-customer`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        if (selectedContent?.versions?.[selectedVersionIndex]) {
          selectedContent.versions[selectedVersionIndex].submission_stage = 'customer';
        }
        setTick(t => t + 1);
        onRefresh?.();
      }
    } catch (err) {
      console.error('Failed to send to customer', err);
    } finally {
      setSendingCustomer(false);
    }
  }, [selectedContent, selectedVersionIndex, onRefresh]);

  const handleUndoAdminApproval = useCallback(async () => {
    const vId = selectedContent?.versions?.[selectedVersionIndex]?.id;
    if (!vId) return;
    setUndoingAdmin(true);
    try {
      const res = await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(vId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          versionId: vId,
          status: 'submitted',
          approvalNotes: '',
          undo_admin_approval: true,
        }),
      });
      if (res.ok) {
        if (selectedContent?.versions?.[selectedVersionIndex]) {
          selectedContent.versions[selectedVersionIndex].approved_by_admin = false;
          selectedContent.versions[selectedVersionIndex].status = 'submitted';
          selectedContent.versions[selectedVersionIndex].submission_stage = 'admin_review';
        }
        setTick(t => t + 1);
        onRefresh?.();
      }
    } catch (err) {
      console.error('Failed to undo approval', err);
    } finally {
      setUndoingAdmin(false);
    }
  }, [selectedContent, selectedVersionIndex, onRefresh]);

  // ── Caption / Hashtags draft state ───────────────────────────────────────
  const [captionDraft, setCaptionDraft] = useState('');
  const [hashtagsDraft, setHashtagsDraft] = useState('');
  const [savingCaption, setSavingCaption] = useState(false);

  useEffect(() => {
    const v = selectedContent?.versions?.[selectedVersionIndex];
    if (v) {
      setCaptionDraft(v.caption || '');
      setHashtagsDraft(v.hashtags || '');
    }
  }, [selectedContent, selectedVersionIndex]);

  const handleSaveCaptionHashtags = useCallback(async () => {
    const vId = selectedContent?.versions?.[selectedVersionIndex]?.id;
    if (!vId) return;
    setSavingCaption(true);
    try {
      const res = await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(vId)}/caption-hashtags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption: captionDraft.trim(), hashtags: hashtagsDraft.trim() }),
      });
      if (res.ok) {
        onRefresh?.();
      }
    } catch (err) {
      console.error('Failed to save caption/hashtags', err);
    } finally {
      setSavingCaption(false);
    }
  }, [selectedContent, selectedVersionIndex, captionDraft, hashtagsDraft, onRefresh]);

  // ── Delete states & actions ──────────────────────────────────────────────
  const [deleteConfirm, setDeleteConfirm] = useState(null); // null | 'version' | 'all'
  const [deleting, setDeleting] = useState(false);

  const handleDeleteVersionConfirm = useCallback(async () => {
    const vId = selectedContent?.versions?.[selectedVersionIndex]?.id;
    if (!vId) return;
    setDeleting(true);
    try {
      await onDeleteVersion(vId, selectedContent.id, selectedContent.customerId);
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete version', err);
    } finally {
      setDeleting(false);
    }
  }, [selectedContent, selectedVersionIndex, onDeleteVersion]);

  const handleDeleteEntireSubmission = useCallback(async () => {
    if (!selectedContent?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API_URL}/api/content-submissions/assignment/${encodeURIComponent(selectedContent.id)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        onRefresh?.();
      }
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete submission', err);
    } finally {
      setDeleting(false);
    }
  }, [selectedContent, onRefresh]);

  // ── Platform helpers ─────────────────────────────────────────────────────
  const parsePlatforms = useCallback((val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
    const s = String(val || '');
    if (s.includes(',')) return s.split(',').map(v => v.trim()).filter(Boolean);
    if (s.includes(' ')) return s.split(/\s+/).map(v => v.trim()).filter(Boolean);
    const matches = s.match(/facebook|instagram|youtube|linkedin|twitter|tiktok|pinterest/ig);
    if (matches) return matches.map(m => m.toLowerCase());
    return [s];
  }, []);

  const platformColor = useCallback((p) => {
    switch ((p || '').toLowerCase()) {
      case 'facebook': return 'bg-blue-100 text-blue-800';
      case 'instagram': return 'bg-pink-100 text-pink-800';
      case 'youtube': return 'bg-red-100 text-red-800';
      case 'linkedin': return 'bg-blue-50 text-blue-800';
      case 'twitter': return 'bg-sky-100 text-sky-800';
      case 'tiktok': return 'bg-black text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // ── Sync comments when content/version changes ───────────────────────────
  useEffect(() => {
    if (selectedContent?.versions?.length) {
      setSelectedVersionIndex(selectedContent.versions.length - 1);

      const currentId = selectedContent.id;
      if (prevAdminContentIdRef.current !== currentId) {
        setSelectedMediaIndex(0);
        prevAdminContentIdRef.current = currentId;
      }
      setAddingComment(false);
    }
  }, [selectedContent]);

  useEffect(() => {
    const raw = selectedContent?.versions?.[selectedVersionIndex]?.comments || [];
    const normalized = raw.map(c => ({
      ...c,
      x: c.x ?? c.position?.x ?? 0,
      y: c.y ?? c.position?.y ?? 0,
      editing: false,
      done: c.done || c.status === 'completed' || false,
    }));
    const unique = normalized.filter((c, i, arr) => i === arr.findIndex(x => x.id === c.id));
    setCommentsForVersion(unique);

    // Auto mark unread replies as read for admin
    if (selectedContent?.id) {
      unique.forEach(comment => {
        let commentUpdated = false;
        const updatedReplies = (comment.replies || []).map(rep => {
          const isIncoming = rep.authorRole === 'customer' || rep.authorRole === 'creator';
          if (isIncoming && !rep.readByAdmin) {
            commentUpdated = true;
            return { ...rep, readByAdmin: true };
          }
          return rep;
        });

        if (commentUpdated) {
          fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${comment.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replies: updatedReplies }),
          }).catch(err => console.error('Auto mark read failed:', err));
        }
      });
    }
  }, [selectedContent, selectedVersionIndex]);

  useEffect(() => {
    setCommentsForCurrentMedia(
      commentsForVersion.filter(c =>
        (c.mediaIndex !== undefined ? c.mediaIndex : 0) === selectedMediaIndex
      )
    );
  }, [commentsForVersion, selectedMediaIndex]);

  const currentVersion = useMemo(() =>
    selectedContent?.versions?.[selectedVersionIndex],
    [selectedContent, selectedVersionIndex]
  );

  const isRevisionPending = useMemo(() => {
    const status = currentVersion?.status || '';
    return status === 'revision_requested' || status === 'changes_requested' || status === 'changes_requested_admin' || status === 'sent_to_creator';
  }, [currentVersion]);

  const isOutdatedVersion = useMemo(() =>
    selectedVersionIndex < ((selectedContent?.versions?.length || 0) - 1),
    [selectedContent, selectedVersionIndex]
  );

  const isCustomerApprovedForPosting = useMemo(() => {
    const approvedStatuses = ['approved_customer', 'approved_both', 'published'];
    const topLevelStatus = (selectedContent?.status || '').toLowerCase();
    if (selectedContent?.approved_by_customer === true || approvedStatuses.includes(topLevelStatus)) {
      return true;
    }

    const latestVersion = selectedContent?.versions?.[selectedContent?.versions?.length - 1];
    if (!latestVersion) return false;
    const latestStatus = (latestVersion.status || '').toLowerCase();
    return latestVersion.approved_by_customer === true || approvedStatuses.includes(latestStatus);
  }, [selectedContent]);

  const isCommentingLocked = isCustomerApprovedForPosting;

  const hasInternalReviewHistory = useMemo(() => {
    const versions = selectedContent?.versions || [];
    return versions.some(version => (version.submission_stage || version.submissionStage || 'internal') !== 'customer');
  }, [selectedContent]);

  const handleDeleteCarouselMedia = useCallback(async (mediaIdx) => {
    if (!window.confirm("Are you sure you want to remove this media item from the carousel?")) return;
    const vId = currentVersion?.id;
    if (!vId) return;

    try {
      const response = await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(vId)}/media/${mediaIdx}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error('Failed to delete media item');
      }

      if (onRefresh) {
        await onRefresh();
      }

      setSelectedMediaIndex(prev => {
        const newLength = (currentVersion?.media?.length || 1) - 1;
        if (prev >= newLength) {
          return Math.max(0, newLength - 1);
        }
        return prev;
      });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to remove media item');
    }
  }, [currentVersion, onRefresh]);

  const currentMedia = useMemo(() =>
    currentVersion?.media?.[selectedMediaIndex],
    [currentVersion, selectedMediaIndex]
  );

  // ── Local comment helpers ────────────────────────────────────────────────
  const patchCommentLocally = useCallback((id, patch) => {
    setCommentsForVersion(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }, []);

  const removeCommentLocally = useCallback((id) => {
    setCommentsForVersion(prev => prev.filter(c => c.id !== id));
  }, []);

  // ── Tracked image size (for converting normalized 0-1 coords → pixels) ──
  const imgRef = useRef(null);
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 0, h: 0 });

  const handleImgLoad = useCallback((e) => {
    setImgDisplaySize({ w: e.target.offsetWidth, h: e.target.offsetHeight });
  }, []);

  // Customer (ContentReview.jsx) saves coords as normalized 0-1 fractions.
  // Admin (ContentDetailView.jsx) saves coords as absolute pixels.
  // Detect which and convert to pixels for display.
  const resolveCoords = useCallback((comment) => {
    const cx = comment.x ?? comment.position?.x ?? 0;
    const cy = comment.y ?? comment.position?.y ?? 0;
    const isNormalized =
      comment.reviewType === 'external' ||
      (cx >= 0 && cx <= 1 && cy >= 0 && cy <= 1 && comment.authorRole !== 'admin');
    if (isNormalized && imgDisplaySize.w > 0 && imgDisplaySize.h > 0) {
      return { ...comment, x: cx * imgDisplaySize.w, y: cy * imgDisplaySize.h };
    }
    return comment;
  }, [imgDisplaySize]);

  // ── Image click → place new marker or reposition ───────────────────────
  const handleImageClick = useCallback(async (e) => {
    if (isCommentingLocked) return;
    e.preventDefault();
    e.stopPropagation();
    const repositioning = commentsForCurrentMedia.find(c => c.repositioning);
    if (repositioning) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
      const y = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0;
      patchCommentLocally(repositioning.id, { x, y, repositioning: false });
      try {
        await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${repositioning.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x, y, position: { x, y } })
        });
      } catch { }
      return;
    }
    if (commentsForCurrentMedia.some(c => c.editing)) return;
    const isVideo = currentMedia && isVideoUrl(currentMedia.url);
    const videoTimestamp = (isVideo && videoRef.current && !isNaN(videoRef.current.currentTime))
      ? videoRef.current.currentTime
      : null;
    if (isVideo && videoRef.current) {
      videoPausedAtRef.current = videoRef.current.currentTime;
      videoRef.current.pause();
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = rect.width > 0 ? (e.clientX - rect.left) / rect.width : 0;
    const y = rect.height > 0 ? (e.clientY - rect.top) / rect.height : 0;
    const newComment = {
      id: uuidv4(),
      x,
      y,
      comment: '',
      editing: true,
      done: false,
      isNew: true,
      authorRole: 'admin',
      authorName: adminUser?.name || 'Admin',
      authorEmail: adminUser?.email || '',
      versionId: currentVersion?.id,
      versionNumber: currentVersion?.versionNumber || 1,
      mediaIndex: selectedMediaIndex,
      timestamp: new Date().toISOString(),
      ...(videoTimestamp != null && { videoTimestamp }),
    };
    setCommentsForVersion(prev => [...prev, newComment]);
    setActiveComment(newComment.id);
  }, [commentsForCurrentMedia, adminUser, currentVersion, selectedMediaIndex, currentMedia, isVideoUrl, isCommentingLocked]);

  const handleCommentChange = useCallback((id, text) => {
    patchCommentLocally(id, { comment: text });
  }, [patchCommentLocally]);

  const handleCommentSubmit = useCallback(async (id) => {
    const comment = commentsForVersion.find(c => c.id === id);
    if (!comment || comment.isSubmitting) return;
    if (!comment.comment?.trim()) {
      removeCommentLocally(id);
      setActiveComment(null);
      return;
    }
    patchCommentLocally(id, { isSubmitting: true });
    try {
      if (comment.isNew) {
        await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comment`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            versionId: currentVersion?.id,
            comment: {
              id: comment.id,
              comment: comment.comment,
              position: { x: comment.x, y: comment.y },
              x: comment.x,
              y: comment.y,
              mediaIndex: comment.mediaIndex,
              timestamp: comment.timestamp,
              status: 'active',
              authorRole: comment.authorRole,
              authorName: comment.authorName,
              authorEmail: comment.authorEmail,
              ...(comment.videoTimestamp != null && { videoTimestamp: comment.videoTimestamp }),
            },
          }),
        });
      } else {
        await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comment: comment.comment,
            position: { x: comment.x, y: comment.y },
            x: comment.x, y: comment.y,
            mediaIndex: comment.mediaIndex,
            status: comment.status || 'active',
          }),
        });
      }
      patchCommentLocally(id, { editing: false, isNew: false, isSubmitting: false });
      setActiveComment(null);
      onRefresh?.();
    } catch (err) {
      console.error('Error saving admin comment:', err);
      patchCommentLocally(id, { editing: false, isNew: false, isSubmitting: false });
      setActiveComment(null);
    }
  }, [commentsForVersion, selectedContent, currentVersion, patchCommentLocally, removeCommentLocally, onRefresh]);

  const handleCommentCancel = useCallback((id) => {
    const c = commentsForVersion.find(x => x.id === id);
    if (c?.isNew) removeCommentLocally(id);
    else patchCommentLocally(id, { editing: false });
    setActiveComment(null);
  }, [commentsForVersion, removeCommentLocally, patchCommentLocally]);

  const handleMarkDone = useCallback(async (id) => {
    patchCommentLocally(id, { done: true });
    setActiveComment(null);
    try {
      await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ done: true, status: 'completed' }),
      });
      onRefresh?.();
    } catch (err) { console.error('Error marking done:', err); }
  }, [selectedContent, patchCommentLocally, onRefresh]);

  const handleToggleDiscard = useCallback(async (id) => {
    const targetComment = commentsForVersion.find(c => c.id === id);
    if (!targetComment) return;
    const newDiscarded = !targetComment.discarded;
    patchCommentLocally(id, { discarded: newDiscarded });
    setActiveComment(null);
    try {
      await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discarded: newDiscarded }),
      });
      onRefresh?.();
    } catch (err) { console.error('Error toggling discard:', err); }
  }, [selectedContent, commentsForVersion, patchCommentLocally, onRefresh]);

  const handleDeleteComment = useCallback(async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    removeCommentLocally(id);
    setActiveComment(null);
    try {
      const res = await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const nextStatus = data?.status;
        if (nextStatus && selectedContent?.versions?.[selectedVersionIndex]) {
          selectedContent.versions[selectedVersionIndex].status = nextStatus;
        }
      }
      onRefresh?.();
    } catch (err) { console.error('Error deleting comment:', err); }
  }, [selectedContent, selectedVersionIndex, removeCommentLocally, onRefresh]);

  const isSameAdminAuthor = useCallback((entry) => {
    if (!entry) return false;

    const entryEmail = String(entry.authorEmail || entry.adminEmail || '').toLowerCase();
    const adminEmail = String(adminUser?.email || '').toLowerCase();
    if (entryEmail && adminEmail) return entryEmail === adminEmail;

    const entryName = String(entry.authorName || '').toLowerCase();
    const adminName = String(adminUser?.name || '').toLowerCase();
    if (entryName && adminName) return entryName === adminName;

    return false;
  }, [adminUser]);

  const canAdminReplyToEntry = useCallback((entry) => {
    if (!entry) return false;
    const role = String(entry.authorRole || '').toLowerCase();
    if (role !== 'admin') return true;
    return !isSameAdminAuthor(entry);
  }, [isSameAdminAuthor]);

  // ── Admin reply ──────────────────────────────────────────────────────────
  const handleStartReply = useCallback((commentId) => {
    const targetComment = commentsForCurrentMedia.find(c => c.id === commentId);
    if (!targetComment) {
      return;
    }
    setReplyingTo(commentId);
    setReplyText('');
    setActiveComment(commentId);
  }, [commentsForCurrentMedia]);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyText('');
  }, []);

  const handleReplySubmit = useCallback(async (commentId) => {
    if (!replyText.trim()) return;
    setSavingReply(true);
    const targetComment = commentsForVersion.find(c => c.id === commentId);
    if (!targetComment) {
      setSavingReply(false);
      return;
    }
    if (!canAdminReplyToEntry(targetComment)) {
      const hasOtherReplies = (targetComment.replies || []).some(r => r.authorRole !== 'admin');
      if (!hasOtherReplies) {
        setSavingReply(false);
        alert('You cannot reply to your own admin comment.');
        return;
      }
    }
    const newReply = {
      id: uuidv4(),
      authorRole: 'admin',
      authorName: adminUser?.name || 'Admin',
      authorEmail: adminUser?.email || '',
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
    patchCommentLocally(commentId, { replies: updatedReplies, adminReply: { text: newReply.message, adminName: newReply.authorName, adminEmail: newReply.authorEmail, timestamp: newReply.timestamp } });
    setReplyingTo(null);
    setReplyText('');
    setActiveComment(null);
    try {
      await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replies: updatedReplies, adminReply: { text: newReply.message, adminName: newReply.authorName, adminEmail: newReply.authorEmail, timestamp: newReply.timestamp } }),
      });
      onRefresh?.();
    } catch (err) {
      console.error('Error saving admin reply:', err);
    } finally {
      setSavingReply(false);
    }
  }, [replyText, adminUser, selectedContent, commentsForVersion, patchCommentLocally, onRefresh, canAdminReplyToEntry]);

  const handleMarkReplyRead = useCallback(async (commentId, replyId) => {
    const targetComment = commentsForVersion.find(c => c.id === commentId);
    if (!targetComment) return;

    const updatedReplies = (targetComment.replies || []).map(rep => {
      if (rep.id === replyId) {
        return { ...rep, readByAdmin: true };
      }
      return rep;
    });

    patchCommentLocally(commentId, { replies: updatedReplies });

    try {
      await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replies: updatedReplies }),
      });
      onRefresh?.();
    } catch (err) {
      console.error('Error marking reply read:', err);
    }
  }, [commentsForVersion, selectedContent, patchCommentLocally, onRefresh]);

  const handleMarkCommentRead = useCallback(async (commentId) => {
    const targetComment = commentsForVersion.find(c => c.id === commentId);
    if (!targetComment) return;

    patchCommentLocally(commentId, { readByAdmin: true });

    try {
      await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readByAdmin: true }),
      });
      onRefresh?.();
    } catch (err) {
      console.error('Error marking comment read:', err);
    }
  }, [commentsForVersion, selectedContent, patchCommentLocally, onRefresh]);

  const handleDeleteReply = useCallback(async (commentId, replyId) => {
    if (!window.confirm('Delete this reply?')) return;
    const parentComment = commentsForVersion.find(c => c.id === commentId);
    if (!parentComment) return;

    const existingReplies = parentComment.replies || [];
    const updatedReplies = existingReplies.filter(r => r.id !== replyId);

    const updatePayload = {
      replies: updatedReplies,
    };

    patchCommentLocally(commentId, updatePayload);

    try {
      const res = await fetch(
        `${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${commentId}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatePayload) }
      );
      if (!res.ok) throw new Error('Failed to delete reply');
      onRefresh?.();
    } catch (err) {
      console.error('Failed to delete reply:', err);
      alert('Failed to delete reply.');
    }
  }, [commentsForVersion, selectedContent, patchCommentLocally, onRefresh]);

  if (!selectedContent) return null;

  const isPublished = selectedContent.published === true || isContentPublished(selectedContent.id, selectedContent);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ── HEADER ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">

          {/* ── LEFT: Meta ── */}
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            {/* ── TOP LINE: Breadcrumb + Meta + Status/Action ── */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
              {/* Breadcrumb */}
              {(calendarName || itemName) && (
                <div className="flex flex-wrap items-center gap-3">
                  {calendarName && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-blue-600">📅</span>
                      <span className="text-gray-600">{calendarName}</span>
                    </div>
                  )}
                  {itemName && (
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-cyan-600">📝</span>
                      <span className="text-gray-600">{itemName}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Meta chips row */}
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full flex-shrink-0" />
                <span className="text-gray-500">Platform:</span>
                <div className="flex flex-wrap gap-1">
                  {parsePlatforms(selectedContent.platform).map((p, i) => (
                    <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${platformColor(p)}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full flex-shrink-0" />
                <span className="text-gray-500">Versions:</span>
                <span className="font-medium text-gray-900">{selectedContent.totalVersions}</span>
              </div>

              {/* Status + Action */}
              <div className="flex flex-wrap items-center gap-2">

                <button
                  onClick={() => handleScheduleContent(selectedContent)}
                  disabled={!isCustomerApprovedForPosting}
                  title={!isCustomerApprovedForPosting ? 'Content can be posted only after customer approval' : ''}
                  className="inline-flex items-center justify-center px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Post Content
                </button>
              </div>
            </div>

            {/* Scheduled / Published Platform Tiles (Horizontal) */}
            <div className="flex flex-wrap items-center gap-2">
              {parsePlatforms(selectedContent.platform).map(platform => {
                const posts = itemScheduledPosts.filter(p => (p.platform || '').toLowerCase() === platform.toLowerCase());

                if (posts.length === 0) {
                  return (
                    <div key={`unpub-${platform}`} className="flex items-center gap-2 p-1.5 rounded-lg bg-gray-50 border border-gray-100 min-w-[150px]">
                      <div className="w-7 h-7 flex-shrink-0 rounded-md bg-white border border-gray-100 flex items-center justify-center">
                        {getPlatformIcon(platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-gray-500 capitalize block truncate">
                          {platform}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-gray-100 text-gray-600 border-gray-200">
                          Not Published
                        </span>
                      </div>
                    </div>
                  );
                }

                return posts.map(post => {
                  const isPostPublished = post.status === 'published';
                  return (
                    <div key={post._id} className="flex items-center gap-2 p-1.5 rounded-lg bg-gray-50 border border-gray-100 min-w-[150px]">
                      <div className="w-7 h-7 flex-shrink-0 rounded-md bg-white border border-gray-100 flex items-center justify-center">
                        {getPlatformIcon(post.platform)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-gray-800 truncate">
                          {post.pageName || post.channelName || post.platform || 'Post'}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {post.scheduledAt ? `${new Date(post.scheduledAt).toLocaleDateString()}` : 'No Date'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getScheduledStatusColor(post.status)} capitalize`}>
                          {post.status || 'pending'}
                        </span>
                        {onDeleteScheduledPost && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteScheduledPost(post._id); }}
                            className="text-gray-300 hover:text-red-500 transition-colors mt-0.5"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })}
            </div>

            {/* FAILED NOTES SECTION */}
            {itemScheduledPosts.some(p => p.status === 'failed') && (
              <div className="flex flex-col gap-2 w-full mt-2">
                {itemScheduledPosts.filter(p => p.status === 'failed').map(failedPost => (
                  <div key={`failed-${failedPost._id}`} className="flex items-start gap-2 p-2 bg-red-50 border border-red-100 rounded-lg">
                    <div className="mt-0.5 w-6 h-6 flex-shrink-0 bg-white rounded border border-red-100 flex items-center justify-center">
                      {getPlatformIcon(failedPost.platform)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-red-900 capitalize block truncate">
                        {failedPost.platform} - Publishing Failed
                      </div>
                      <div className="text-xs text-red-700 mt-0.5 leading-snug">
                        {getFailureReason(failedPost)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* ── LEFT: Media pane ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
            {/* Version selector bar */}
            <div className="px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-200/50 bg-blue-50/50">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center">
                  <Image className="h-4 w-4 text-blue-600 mr-1.5" />
                  Version {currentVersion?.versionNumber}
                  <span className="ml-1.5 text-xs font-normal text-gray-600">/ {selectedContent.totalVersions}</span>
                </h3>
                <div className="flex items-center gap-1 flex-wrap">
                  {selectedContent.versions.map((v, idx) => (
                    <button
                      key={v.id || idx}
                      onClick={() => { setSelectedVersionIndex(idx); setSelectedMediaIndex(0); }}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${selectedVersionIndex === idx
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                        }`}
                    >
                      V{v.versionNumber}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {currentVersion && (
                <div className="space-y-3">
                  {currentVersion.media?.length > 0 ? (
                    <>
                      {/* Multi-media navigation */}
                      {currentVersion.media.length > 1 && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">{selectedMediaIndex + 1} / {currentVersion.media.length}</span>
                          <div className="flex gap-1.5 items-center">
                            <button onClick={() => selectedMediaIndex > 0 && setSelectedMediaIndex(selectedMediaIndex - 1)}
                              disabled={selectedMediaIndex === 0}
                              className="p-1.5 rounded-lg bg-blue-50 border border-gray-200 hover:bg-white disabled:opacity-50 transition-colors">
                              <ChevronLeft className="h-3.5 w-3.5 text-blue-600" />
                            </button>
                            <button onClick={() => selectedMediaIndex < currentVersion.media.length - 1 && setSelectedMediaIndex(selectedMediaIndex + 1)}
                              disabled={selectedMediaIndex === currentVersion.media.length - 1}
                              className="p-1.5 rounded-lg bg-blue-50 border border-gray-200 hover:bg-white disabled:opacity-50 transition-colors">
                              <ChevronRight className="h-3.5 w-3.5 text-blue-600" />
                            </button>
                            {!(currentVersion?.status === 'published' || currentVersion?.status === 'scheduled') && (
                              <button
                                onClick={() => handleDeleteCarouselMedia(selectedMediaIndex)}
                                className="p-1.5 ml-1.5 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                                title="Remove this item from carousel"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Comment Info */}
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-gray-400">
                          {commentsForCurrentMedia.length} comment{commentsForCurrentMedia.length !== 1 ? 's' : ''} on this media
                        </p>
                        {isCommentingLocked && (
                          <span className="text-[10px] text-amber-600 font-medium">Commenting locked after customer approval</span>
                        )}
                      </div>

                      {/* Media + markers */}
                      <div className="flex justify-center">
                        <div className="relative inline-block">
                          {currentMedia?.url && typeof currentMedia.url === 'string' ? (
                            isVideoUrl(currentMedia.url) ? (
                              <video
                                ref={videoRef}
                                data-cdv-media
                                src={currentMedia.url}
                                controls
                                className={`max-w-full h-auto max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] rounded-lg shadow border border-gray-200 object-contain transition-all ${isCommentingLocked ? 'cursor-default' : 'cursor-crosshair hover:ring-2 hover:ring-purple-400 hover:ring-offset-1'}`}
                                loading="lazy"
                                onClick={!isCommentingLocked ? handleImageClick : undefined}
                              />
                            ) : (
                              <img
                                data-cdv-media
                                ref={imgRef}
                                src={currentMedia.url}
                                alt={`V${currentVersion.versionNumber} M${selectedMediaIndex + 1}`}
                                className={`max-w-full h-auto max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] rounded-lg shadow border border-gray-200 object-contain transition-all ${isCommentingLocked ? 'cursor-default' : 'cursor-crosshair hover:ring-2 hover:ring-purple-400 hover:ring-offset-1'}`}
                                loading="lazy"
                                onLoad={handleImgLoad}
                                onClick={!isCommentingLocked ? handleImageClick : undefined}
                              />
                            )
                          ) : (
                            <div className="w-full h-48 sm:h-64 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                              <div className="text-center">
                                <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-xs text-gray-500">Media unavailable</p>
                              </div>
                            </div>
                          )}

                          {/* Comment Markers */}
                          {commentsForCurrentMedia.map((comment, index) => {
                            if (activeComment && comment.id !== activeComment && !comment.editing) {
                              return null;
                            }
                            return (
                              <CommentMarker
                                key={comment.id || index}
                                comment={comment}
                                index={index}
                                active={activeComment === comment.id}
                                hovered={hoveredComment === comment.id}
                                onToggle={() => setActiveComment(activeComment === comment.id ? null : comment.id)}
                                onHover={() => setHoveredComment(comment.id)}
                                onLeave={() => setHoveredComment(null)}
                                onChange={handleCommentChange}
                                onSubmit={handleCommentSubmit}
                                onCancel={handleCommentCancel}
                                onDelete={handleDeleteComment}
                                onMarkDone={handleMarkDone}
                                onToggleDiscard={handleToggleDiscard}
                                onReposition={(id) => patchCommentLocally(id, { repositioning: true })}
                                replyingTo={replyingTo}
                                replyText={replyText}
                                onStartReply={handleStartReply}
                                onReplyTextChange={setReplyText}
                                onReplySubmit={handleReplySubmit}
                                onCancelReply={handleCancelReply}
                                adminUser={adminUser}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-48 sm:h-64 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                      <div className="text-center">
                        <Image className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No media available</p>
                      </div>
                    </div>
                  )}

                  {/* Caption / Hashtags / Notes */}
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                        <Edit3 className="h-3.5 w-3.5 text-blue-600" /> Caption
                      </label>
                      <textarea
                        className="w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none resize-none"
                        rows={3}
                        placeholder="Enter caption for this post..."
                        value={captionDraft}
                        onChange={(e) => setCaptionDraft(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Hashtags</label>
                      <input
                        type="text"
                        className="w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                        placeholder="#hashtag1 #hashtag2"
                        value={hashtagsDraft}
                        onChange={(e) => setHashtagsDraft(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={handleSaveCaptionHashtags}
                      disabled={savingCaption}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-1"
                    >
                      {savingCaption ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Save Caption & Hashtags
                    </button>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes from Creator</label>
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <p className="text-xs text-gray-900">{currentVersion.notes || 'No notes'}</p>
                      </div>
                    </div>
                    {currentVersion?.thumbnailUrl && (
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Video Thumbnail</label>
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200 inline-block">
                          <img
                            src={currentVersion.thumbnailUrl}
                            alt="Video thumbnail"
                            className="w-20 h-20 object-cover rounded border border-gray-300"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>Created: {formatDate(currentVersion.createdAt)}</span>
                    <span className={`border px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider shadow-sm ${getStatusColorLocal(currentVersion.status)}`}>
                      {getStatusLabel(currentVersion.status)}
                    </span>
                  </div>
                </div>

              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Version History + Comments ── */}
        <div className="space-y-3">

          {/* Internal Review Card */}
          {selectedContent && (
            <div className="bg-white rounded-xl shadow-sm border border-purple-200 overflow-hidden">
              <div className="px-3 py-2 border-b border-purple-100 bg-purple-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-purple-900 flex items-center gap-1.5">
                  <UserCog className="h-4 w-4 text-purple-600" />
                  Internal Review
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-800 uppercase tracking-wider">
                  Admin Review
                </span>
              </div>
              <div className="p-3 space-y-2.5">
                {/* Current Version Stage badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <div className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 border ${currentVersion?.approved_by_admin || currentVersion?.status === 'approved' || currentVersion?.status === 'approved_both' || currentVersion?.status === 'pending_customer_review'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : ['revision_requested', 'changes_requested', 'changes_requested_admin', 'sent_to_creator'].includes(currentVersion?.status)
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                    {currentVersion?.approved_by_admin || currentVersion?.status === 'approved' || currentVersion?.status === 'approved_both' || currentVersion?.status === 'pending_customer_review' ? (
                      <><CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Admin Approved</>
                    ) : !currentVersion ? (
                      <><Clock className="h-3.5 w-3.5 text-amber-600" /> Pending</>
                    ) : ['revision_requested', 'changes_requested', 'changes_requested_admin', 'sent_to_creator'].includes(currentVersion?.status) ? (
                      <><Send className="h-3.5 w-3.5 text-purple-600" /> Sent to Creator</>
                    ) : (
                      <><Clock className="h-3.5 w-3.5 text-amber-600" /> Pending Admin Review</>
                    )}
                  </div>

                  {(currentVersion?.submission_stage === 'customer' || currentVersion?.status === 'pending_customer_review' || currentVersion?.status === 'customer_feedback_pending_admin') && (
                    <div className="px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200">
                      <Send className="h-3.5 w-3.5 text-blue-600" /> Sent to Customer
                    </div>
                  )}
                </div>

                {/* Internal Review Actions */}
                <div className="space-y-1.5 pt-1">
                  {currentVersion?.status === 'customer_feedback_pending_admin' || hasPendingCommentsToSend ? (
                    <div className="space-y-2">
                      {currentVersion?.status === 'customer_feedback_pending_admin' && (
                        <div className="text-xs font-semibold text-purple-900 bg-purple-50 p-2.5 rounded-lg border border-purple-250 flex items-start gap-1">
                          <AlertCircle className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                          <span>Customer requested changes. Review comments/replies below.</span>
                        </div>
                      )}

                      <button
                        onClick={() => handleFinalizeFeedback('finalized')}
                        disabled={finalizingFeedback || (!hasPendingCommentsToSend && currentVersion?.status !== 'customer_feedback_pending_admin')}
                        className="w-full py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-xs font-semibold hover:from-orange-600 hover:to-red-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {finalizingFeedback ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                        Send to Creator (Request Revisions)
                      </button>
                      {!hasPendingCommentsToSend && currentVersion?.status !== 'customer_feedback_pending_admin' && (
                        <p className="text-[11px] text-gray-500">No pending comments to send.</p>
                      )}
                      <button
                        onClick={handleApproveAdmin}
                        disabled={approvingAdmin || isOutdatedVersion || hasUnresolvedComments || isRevisionPending || !currentVersion}
                        title={!currentVersion ? "No content submitted yet" : isOutdatedVersion ? "Cannot approve an outdated version" : hasUnresolvedComments ? "Cannot approve with unresolved comments" : isRevisionPending ? "Cannot approve a version with pending revision request" : ""}
                        className="w-full py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg text-xs font-semibold hover:from-emerald-700 hover:to-green-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        {approvingAdmin ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Approving...</>
                        ) : (
                          <><CheckCircle className="h-3.5 w-3.5" /> Approve (Internal Review)</>
                        )}
                      </button>
                    </div>
                  ) : !(currentVersion?.approved_by_admin || currentVersion?.status === 'approved' || currentVersion?.status === 'approved_both' || currentVersion?.status === 'pending_customer_review') ? (
                    <button
                      onClick={handleApproveAdmin}
                      disabled={approvingAdmin || isOutdatedVersion || hasUnresolvedComments || isRevisionPending || !currentVersion}
                      title={!currentVersion ? "No content submitted yet" : isOutdatedVersion ? "Cannot approve an outdated version" : hasUnresolvedComments ? "Cannot approve with unresolved comments" : isRevisionPending ? "Cannot approve a version with pending revision request" : ""}
                      className="w-full py-2 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-lg text-xs font-semibold hover:from-emerald-700 hover:to-green-700 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {approvingAdmin ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Approving...</>
                      ) : (
                        <><CheckCircle className="h-3.5 w-3.5" /> Approve (Internal Review)</>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      {currentVersion?.submission_stage !== 'customer' && currentVersion?.status !== 'pending_customer_review' ? (
                        <button
                          onClick={handleSendToCustomerStage}
                          disabled={sendingCustomer}
                          className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {sendingCustomer ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending...</>
                          ) : (
                            <><Send className="h-3.5 w-3.5" /> Send to Customer for Review</>
                          )}
                        </button>
                      ) : (
                        (currentVersion?.status === 'revision_requested' || currentVersion?.status === 'sent_to_creator' || currentVersion?.status === 'changes_requested') ? (
                          <div className="text-[11px] text-purple-700 bg-purple-50 p-2 rounded-lg border border-purple-150 font-medium flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-purple-600 flex-shrink-0" />
                            Revision requested. Waiting for creator to upload a new version.
                          </div>
                        ) : (currentVersion?.approved_by_customer === true || currentVersion?.status === 'approved_customer' || currentVersion?.status === 'approved_both' || currentVersion?.status === 'published' || currentVersion?.status === 'scheduled') ? (
                          <div className="text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-150 font-medium flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                            This version has been approved by the customer.
                          </div>
                        ) : (
                          <div className="text-[11px] text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-150 font-medium flex items-center gap-1.5">
                            <CheckCircle className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" />
                            This version is currently sent to customer for external review.
                          </div>
                        )
                      )}

                      {(currentVersion?.approved_by_customer !== true && currentVersion?.status !== 'published' && currentVersion?.status !== 'scheduled') && (
                        <button
                          onClick={handleUndoAdminApproval}
                          disabled={undoingAdmin}
                          className="w-full py-1.5 text-amber-700 border border-amber-200 bg-amber-50 rounded-lg text-[11px] font-semibold hover:bg-amber-100 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {undoingAdmin ? (
                            <><Loader2 className="h-3 w-3 animate-spin" /> Undoing...</>
                          ) : (
                            <><RotateCcw className="h-3 w-3" /> Undo Admin Approval</>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>


              </div>
            </div>
          )}

          {/* Comments panel */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200/50 bg-blue-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center">
                <MessageSquare className="h-4 w-4 text-blue-600 mr-1.5" />
                Comments ({commentsForCurrentMedia.length})
              </h3>
              {/* Legend */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  <div className="w-2 h-2 rounded-full bg-purple-600" />
                  <span className="text-[9px] text-gray-500">Internal</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] text-gray-500">External</span>
                </div>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto px-1.5 py-3">
              {commentsForCurrentMedia.length === 0 ? (
                <div className="text-center py-6">
                  <div className="bg-gray-50 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-xs">No comments yet</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {isCommentingLocked ? 'Commenting is disabled after customer approval' : 'Click anywhere on the media to pin a comment'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {commentsForCurrentMedia.map((comment, idx) => {
                    const isAdminComment = comment.authorRole === 'admin' || comment.reviewType === 'internal';
                    const isOutgoing = isAdminComment;
                    const isActive = activeComment === comment.id;
                    const isReplying = replyingTo === comment.id;
                    return (
                      <div
                        key={comment.id || idx}
                        data-cdv-sidebar-comment="true"
                        className={`flex flex-col gap-2 p-3 rounded-xl border transition-all duration-200 ${isActive
                            ? 'bg-purple-50/20 border-purple-200 shadow-sm'
                            : 'bg-slate-50/10 border-slate-100 hover:bg-slate-50/30 hover:border-slate-200'
                          }`}
                      >
                        {/* The initial comment bubble */}
                        <div
                          className={`flex items-start gap-2 max-w-[90%] cursor-pointer group ${isOutgoing ? 'self-end flex-row-reverse' : 'self-start'}`}
                          onClick={() => {
                            const next = isActive ? null : comment.id;
                            setActiveComment(next);
                            if (next) {
                              const c = commentsForCurrentMedia.find(x => x.id === next);
                              if (c && c.videoTimestamp != null && videoRef.current) {
                                videoRef.current.currentTime = c.videoTimestamp;
                                videoRef.current.pause();
                                videoPausedAtRef.current = c.videoTimestamp;
                                videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                              }
                            }
                          }}
                        >
                          <span className={`font-bold text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0 mt-1 shadow-sm ${isOutgoing ? 'bg-purple-500' : 'bg-blue-500'}`}>
                            {idx + 1}
                          </span>
                          <div className={`shadow-sm px-3 py-2 flex flex-col relative ${isOutgoing
                              ? 'bg-[#E7FFDB] border border-[#d3f5c0] rounded-2xl rounded-tr-sm'
                              : 'bg-white border border-gray-200 rounded-2xl rounded-tl-sm'
                            } ${isActive ? 'ring-1 ring-purple-300' : ''}`}>
                            <div className="flex items-center gap-1 mb-0.5">
                              <span className={`text-[9px] font-bold ${isOutgoing ? 'text-green-700' : 'text-blue-700'}`}>
                                {isOutgoing ? 'Internal' : (getCustomerName() || selectedContent?.customerName || selectedContent?.customer_name || comment.authorName || (comment.authorEmail ? comment.authorEmail.split('@')[0] : 'Customer'))}
                              </span>
                              {comment.authorEmail && isOutgoing && (
                                <span className="text-[9px] text-gray-500 truncate max-w-[110px]">• {comment.authorEmail}</span>
                              )}

                            </div>

                            <p className={`text-[13px] break-words leading-snug ${comment.discarded ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                              {comment.message || comment.comment}
                            </p>

                            <div className="flex items-center justify-end gap-2 mt-1.5 pt-1.5 border-t border-black/5">
                              <span className="text-[9px] text-gray-500/80">
                                {comment.timestamp ? new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>



                              {!isAdminComment && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleDiscard(comment.id); }}
                                  className={`flex items-center gap-0.5 text-[10px] font-medium ml-1 transition-colors ${comment.discarded ? 'text-orange-600' : 'text-gray-400 hover:text-orange-500'}`}
                                >
                                  <XCircle className="h-3 w-3" />{comment.discarded ? 'Discarded' : 'Discard'}
                                </button>
                              )}

                              {!isAdminComment && !comment.readByAdmin && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMarkCommentRead(comment.id); }}
                                  className="flex items-center gap-0.5 text-[10px] text-gray-500 hover:text-blue-500 transition-colors font-medium border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50 hover:bg-blue-50 ml-1"
                                  title="Mark as Read"
                                >
                                  <CheckCheck className="h-3 w-3 text-gray-400" /> Mark Read
                                </button>
                              )}
                              {!isAdminComment && comment.readByAdmin && (
                                <span className="flex items-center text-[10px] text-blue-500 font-medium gap-0.5 ml-1" title="Read">
                                  <CheckCheck className="h-3 w-3 text-blue-500" /> Read
                                </span>
                              )}

                              {canAdminReplyToEntry(comment) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (replyingTo === comment.id) {
                                      handleCancelReply();
                                    } else {
                                      handleStartReply(comment.id);
                                    }
                                  }}
                                  className="flex items-center gap-0.5 text-[10px] text-indigo-500 hover:text-indigo-700 transition-colors font-medium ml-1"
                                >
                                  <MessageSquare className="h-3 w-3" /> Reply
                                </button>
                              )}

                              {isAdminComment && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                                  className="flex items-center gap-0.5 text-[10px] text-red-400 hover:text-red-600 transition-colors font-medium ml-1"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}

                              {comment.videoTimestamp != null && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (videoRef.current) {
                                      videoRef.current.currentTime = comment.videoTimestamp;
                                      videoRef.current.pause();
                                      videoPausedAtRef.current = comment.videoTimestamp;
                                      videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                    }
                                    setActiveComment(comment.id);
                                  }}
                                  className="flex items-center gap-0.5 text-[9px] text-white bg-orange-500 hover:bg-orange-600 px-1.5 py-0.5 rounded-full transition-colors ml-1 font-bold shadow-sm"
                                >
                                  ⏱ {formatVideoTime(comment.videoTimestamp)}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Existing replies */}
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
                            const isRepOutgoing = rep.authorRole === 'admin';
                            return (
                              <div
                                key={rep.id || rIdx}
                                className={`flex items-start gap-2 max-w-[90%] group ${isRepOutgoing ? 'self-end flex-row-reverse' : 'self-start'}`}
                              >
                                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-gray-100 border border-gray-200 text-[9px] font-bold text-gray-500 mt-1 shadow-sm">
                                  {(() => {
                                    let name = '';
                                    if (rep.authorRole === 'admin') {
                                      name = rep.authorName || (rep.authorEmail ? rep.authorEmail.split('@')[0] : '') || 'Admin';
                                    } else if (rep.authorRole === 'creator') {
                                      name = rep.authorName || (rep.authorEmail ? rep.authorEmail.split('@')[0] : '') || 'Creator';
                                    } else {
                                      name = rep.authorName || (rep.authorEmail ? rep.authorEmail.split('@')[0] : '') || getCustomerName() || selectedContent?.customerName || selectedContent?.customer_name || 'Customer';
                                    }
                                    return name.trim().charAt(0).toUpperCase() || 'U';
                                  })()}
                                </div>

                                <div className={`px-3 py-2 shadow-sm flex flex-col relative ${isRepOutgoing
                                    ? 'bg-[#E7FFDB] border border-[#d3f5c0] rounded-2xl rounded-tr-sm'
                                    : 'bg-white border border-gray-200 rounded-2xl rounded-tl-sm'
                                  }`}>
                                  {/* WhatsApp style reply quote */}
                                  <div className="mb-1.5 text-[10px] bg-black/5 px-2 py-1 rounded border-l-2 border-indigo-500/50 flex flex-col pointer-events-none select-none max-w-[200px] sm:max-w-[300px]">
                                    <span className="font-semibold text-indigo-600 truncate text-[9px]">{isOutgoing ? 'Internal' : (getCustomerName() || selectedContent?.customerName || selectedContent?.customer_name || comment.authorName || (comment.authorEmail ? comment.authorEmail.split('@')[0] : 'Customer'))}</span>
                                    <span className="truncate text-gray-655 italic text-[11px] leading-tight">"{comment.message || comment.comment}"</span>
                                  </div>
                                  {rep.authorEmail && !isRepOutgoing && (
                                    <span className="text-[9px] font-medium text-gray-500 mb-0.5">{rep.authorEmail}</span>
                                  )}
                                  <p className="text-[13px] text-gray-800 break-words leading-snug">{rep.message || rep.text}</p>

                                  <div className="flex items-center justify-end gap-3 mt-1">
                                    {canAdminReplyToEntry(rep) && !isSameAdminAuthor(rep) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (replyingTo === comment.id) {
                                            handleCancelReply();
                                          } else {
                                            handleStartReply(comment.id);
                                          }
                                        }}
                                        className="flex items-center gap-0.5 text-[9px] text-indigo-500 hover:text-indigo-700 transition-colors font-medium"
                                      >
                                        <MessageSquare className="h-2.5 w-2.5" /> Reply
                                      </button>
                                    )}
                                    {!isRepOutgoing && !rep.readByAdmin && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkReplyRead(comment.id, rep.id);
                                        }}
                                        className="flex items-center gap-0.5 text-[9px] text-gray-500 hover:text-blue-500 transition-colors font-medium border border-gray-200 rounded px-1.5 py-0.5 bg-gray-50 hover:bg-blue-50"
                                        title="Mark as Read"
                                      >
                                        <CheckCheck className="h-2.5 w-2.5 text-gray-400" /> Mark Read
                                      </button>
                                    )}
                                    {!isRepOutgoing && rep.readByAdmin && (
                                      <span className="flex items-center text-[9px] text-blue-500 font-medium gap-0.5" title="Read">
                                        <CheckCheck className="h-2.5 w-2.5 text-blue-500" /> Read
                                      </span>
                                    )}
                                    {isRepOutgoing && (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleDeleteReply(comment.id, rep.id); }}
                                        className="flex items-center gap-0.5 text-[9px] text-red-400 hover:text-red-650 transition-colors font-medium ml-auto"
                                        title="Delete Reply"
                                      >
                                        <Trash2 className="h-2.5 w-2.5" /> Delete
                                      </button>
                                    )}
                                    <span className="text-[9px] text-gray-500/80">
                                      {rep.timestamp ? new Date(rep.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                        })()}

                        {/* Reply input */}
                        {isReplying && isActive && (
                          <div
                            className="mt-1 flex flex-col self-end max-w-[90%] w-full bg-white p-2.5 rounded-2xl shadow-sm border border-indigo-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <p className="text-[10px] text-indigo-500 font-medium">
                                New reply…
                              </p>
                            </div>
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder="Type a message..."
                              rows={2}
                              autoFocus
                              className="w-full text-xs focus:outline-none resize-none bg-transparent placeholder-gray-400"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  if (replyText.trim() && !savingReply) {
                                    handleReplySubmit(comment.id);
                                  }
                                }
                              }}
                            />
                            <div className="flex items-center justify-end gap-2 mt-2">
                              <button
                                onClick={() => handleCancelReply()}
                                className="text-[10px] text-gray-500 hover:text-gray-700 font-medium px-2 py-1"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleReplySubmit(comment.id)}
                                disabled={savingReply || !replyText.trim()}
                                className="flex items-center justify-center w-7 h-7 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-full transition-colors shadow-sm"
                              >
                                {savingReply
                                  ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
                                  : <Send className="h-3 w-3 ml-0.5" />}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ContentDetailView);