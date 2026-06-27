import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  Image, Play, RefreshCw, CheckCircle, MessageSquare,
  Clock, XCircle, User, Calendar, FileText, Eye, X,
  ChevronLeft, ChevronRight, Trash2, Edit3, Check,
  RotateCcw, Move, Send, AlertCircle, Loader2
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  submitted:          { label: 'Pending Review',     color: 'bg-amber-50  text-amber-700  border-amber-200 shadow-sm shadow-amber-500/5'  },
  approved:           { label: 'Approved',           color: 'bg-emerald-50  text-emerald-700  border-emerald-250 shadow-sm shadow-emerald-500/5'  },
  revision_requested: { label: 'Revision Requested', color: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-500/5' },
  rejected:           { label: 'Rejected',           color: 'bg-rose-50    text-rose-700    border-rose-200 shadow-sm shadow-rose-500/5'    },
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || STATUS_CONFIG['submitted'];

const isVideoUrl = (url) => /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url || '');

// Platform logo icon component
const PlatformIcon = ({ platform, className = "w-4 h-4 flex-shrink-0" }) => {
  if (!platform) return null;
  let p = "";
  if (Array.isArray(platform)) {
    p = platform[0] ? String(platform[0]) : "";
  } else if (typeof platform === "string") {
    p = platform;
  } else {
    p = String(platform);
  }
  p = p.toLowerCase().trim();
  if (p === 'facebook') return (
    <svg viewBox="0 0 24 24" className={className} fill="#1877F2" aria-label="Facebook">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
  if (p === 'instagram') return (
    <svg viewBox="0 0 24 24" className={className} fill="#E1306C" aria-label="Instagram">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
  if (p === 'linkedin') return (
    <svg viewBox="0 0 24 24" className={className} fill="#0A66C2" aria-label="LinkedIn">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
  if (p === 'youtube') return (
    <svg viewBox="0 0 24 24" className={className} fill="#FF0000" aria-label="YouTube">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
  if (p === 'twitter' || p === 'x') return (
    <svg viewBox="0 0 24 24" className={className} fill="#000000" aria-label="X (Twitter)">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
  return null;
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const normalizeMedia = (images) =>
  (Array.isArray(images) ? images : [])
    .map(m => (typeof m === 'string' ? { url: m } : m))
    .filter(m => m?.url);

const normalizeComments = (raw = []) => {
  const mapped = raw.map(c => ({
    ...c,
    x: c.x ?? c.position?.x ?? 0,
    y: c.y ?? c.position?.y ?? 0,
    editing: false,
    repositioning: false,
    isNew: false,
    done: c.done || c.status === 'completed' || false,
    mediaIndex: c.mediaIndex ?? 0,
  }));
  return mapped.filter((c, i, a) => i === a.findIndex(x => x.id === c.id));
};

// ─── Mini action button ────────────────────────────────────────────────────────
const Btn = ({ onClick, variant = 'primary', size = 'sm', children, disabled }) => {
  const v = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/10',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-500/10',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/10',
    danger:  'bg-rose-500   hover:bg-rose-650   text-white shadow-sm shadow-rose-500/10',
    info:    'bg-violet-600  hover:bg-violet-750  text-white shadow-sm shadow-violet-500/10',
    ghost:   'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800 hover:border-slate-300',
  };
  const s = { sm: 'px-2 py-1 text-[10px]', md: 'px-2.5 py-1.5 text-xs', lg: 'px-4 py-2 text-sm' };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${v[variant]} ${s[size]} rounded-lg font-bold transition-all inline-flex items-center justify-center gap-1 disabled:opacity-50 active:scale-[0.97]`}
    >
      {children}
    </button>
  );
};

// ─── Comment Pin + Popup ───────────────────────────────────────────────────────
function CommentPin({ comment, index, onActivate, activeId, hoveredId, setHoveredId,
  onCommentChange, onSubmit, onCancel, onMarkDone, onEdit, onDelete, onReposition }) {

  const isActive = activeId === comment.id || hoveredId === comment.id;
  const x = comment.x ?? 0;
  const y = comment.y ?? 0;
  const isNormalized = x > 0 && x <= 1 && y > 0 && y <= 1;

  const pinColor = comment.done        ? '#10b981'
    : comment.repositioning            ? '#8b5cf6'
    : comment.editing                  ? '#3b82f6'
    :                                    '#ef4444';

  const popupLeft  = (isNormalized ? x > 0.5 : x > 150) ? 'auto' : 32;
  const popupRight = (isNormalized ? x > 0.5 : x > 150) ? 32 : 'auto';

  return (
    <div
      style={{
        position: 'absolute',
        top: isNormalized ? `calc(${y * 100}% - 12px)` : `${y - 12}px`,
        left: isNormalized ? `calc(${x * 100}% - 12px)` : `${x - 12}px`,
        width: 24, height: 24,
        background: pinColor,
        color: '#fff',
        borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 'bold', fontSize: '11px',
        boxShadow: comment.repositioning
          ? '0 0 0 4px rgba(139,92,246,0.4), 0 4px 12px rgba(0,0,0,0.3)'
          : '0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.3)',
        cursor: comment.repositioning ? 'move' : 'pointer',
        zIndex: 10,
        border: '2px solid #fff',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: comment.repositioning ? 'pinPulse 1.5s ease-in-out infinite' : 'none',
      }}
      onMouseEnter={() => setHoveredId(comment.id)}
      onMouseLeave={() => setHoveredId(null)}
      onClick={(e) => { e.stopPropagation(); if (!comment.repositioning) onActivate(comment.id); }}
    >
      {index + 1}

      {/* Popup */}
      {isActive && !comment.repositioning && (
        <div
          style={{
            position: 'absolute',
            left: popupLeft, right: popupRight,
            top: '50%', transform: 'translateY(-50%)',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '12px',
            minWidth: '200px', maxWidth: '240px',
            zIndex: 20,
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            boxSizing: 'border-box',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {comment.editing ? (
            <>
              <textarea
                value={comment.comment}
                onChange={(e) => onCommentChange(comment.id, e.target.value)}
                placeholder="Add comment..."
                className="w-full p-2 border border-slate-200 rounded-lg resize-none text-xs text-slate-800 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none transition-all"
                rows={2}
                autoFocus
              />
              <div className="flex gap-1.5 mt-2">
                <Btn onClick={() => onSubmit(comment.id)} variant="success" size="sm">
                  <Check className="h-3 w-3" />Save
                </Btn>
                <Btn onClick={() => onCancel(comment.id)} variant="ghost" size="sm">Cancel</Btn>
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-800 text-xs leading-relaxed break-words mb-1.5">
                {comment.comment}
                {comment.done && <span className="text-emerald-600 ml-1 font-bold">✓</span>}
              </p>
              {comment.author && <p className="text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wider">— {comment.author}</p>}
              {comment.videoTimestamp != null && (
                <div className="mb-2">
                  <span className="inline-flex items-center gap-1 bg-orange-500 text-white px-2 py-0.5 rounded-full text-[9px] font-bold shadow-sm">
                    ⏱ {formatVideoTime(comment.videoTimestamp)}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                {!comment.done ? (
                  <Btn onClick={(e) => { e.stopPropagation(); onMarkDone(comment.id); }} variant="success" size="sm">
                    <CheckCircle className="h-3 w-3" />Done
                  </Btn>
                ) : (
                  <Btn onClick={(e) => { e.stopPropagation(); onMarkDone(comment.id); }} variant="warning" size="sm">
                    <RotateCcw className="h-3 w-3" />Undo
                  </Btn>
                )}
                <Btn onClick={(e) => { e.stopPropagation(); onEdit(comment.id); }} variant="ghost" size="sm">
                  <Edit3 className="h-3 w-3 text-slate-400" />Edit
                </Btn>
                <Btn onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }} variant="danger" size="sm">
                  <Trash2 className="h-3 w-3" />Delete
                </Btn>
                <Btn onClick={(e) => { e.stopPropagation(); onReposition(comment.id); }} variant="ghost" size="sm">
                  <Move className="h-3 w-3 text-slate-400" />Move
                </Btn>
              </div>
            </>
          )}
        </div>
      )}

      {comment.repositioning && (
        <div style={{
          position: 'absolute', left: 32, top: '50%', transform: 'translateY(-50%)',
          background: '#8b5cf6', color: '#fff', borderRadius: '8px', padding: '6px 10px',
          fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', zIndex: 20,
          boxShadow: '0 4px 12px rgba(139,92,246,0.3)',
        }}>
          Click canvas to place
        </div>
      )}
    </div>
  );
}

// ─── Full-screen Review Panel ──────────────────────────────────────────────────

const formatVideoTime = (seconds) => {
  if (seconds == null || isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

function ReviewPanel({ submission, onClose, onStatusUpdated, onDeleted }) {
  const [localVersions, setLocalVersions] = useState(submission.allVersions || [submission]);
  const [activeVersionIdx, setActiveVersionIdx] = useState((submission.allVersions || [submission]).length - 1);
  const activeVersion = localVersions[activeVersionIdx];

  const mediaItems = normalizeMedia(activeVersion.images);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const videoRef = useRef(null);
  const videoPausedAtRef = useRef(null);

  const [comments, setComments] = useState(() => normalizeComments(activeVersion.comments));
  const [commentsForMedia, setCommentsForMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);

  const [approving, setApproving]          = useState(false);
  const [undoingApproval, setUndoingApproval] = useState(false);

  const [localStatus, setLocalStatus] = useState(activeVersion.status);
  const [toast, setToast]             = useState(null);
  const [sidebarTab, setSidebarTab]   = useState('comments');
  const [sentToCustomer, setSentToCustomer]       = useState(activeVersion.submission_stage === 'customer');
  const [sendingToCustomer, setSendingToCustomer] = useState(false);
  const [deleteConfirm, setDeleteConfirm]         = useState(null); // null | 'version' | 'all'
  const [deleting, setDeleting]                   = useState(false);
  const [mobilePanelTab, setMobilePanelTab]       = useState('actions'); // 'media' | 'actions'

  // Caption / hashtag editing
  const [captionDraft, setCaptionDraft]           = useState(activeVersion.caption || '');
  const [hashtagsDraft, setHashtagsDraft]         = useState(activeVersion.hashtags || '');
  const [savingCaption, setSavingCaption]         = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Re-initialize version-specific state when the active version changes
  useEffect(() => {
    setActiveMediaIdx(0);
    setComments(normalizeComments(localVersions[activeVersionIdx].comments));
    setActiveComment(null);
    setHoveredComment(null);
    setLocalStatus(localVersions[activeVersionIdx].status);
    setSentToCustomer(localVersions[activeVersionIdx].submission_stage === 'customer');
    setDeleteConfirm(null);
    setCaptionDraft(localVersions[activeVersionIdx].caption || '');
    setHashtagsDraft(localVersions[activeVersionIdx].hashtags || '');
  }, [activeVersionIdx]); // eslint-disable-line

  // Sync commentsForMedia
  useEffect(() => {
    setCommentsForMedia(comments.filter(c => (c.mediaIndex ?? 0) === activeMediaIdx));
  }, [comments, activeMediaIdx]);

  // ── Click handlers ──
  const handleImageClick = (e) => {
    if (commentsForMedia.some(c => c.editing)) return;
    const currentMedia = mediaItems[activeMediaIdx];
    const isVideo = currentMedia && isVideoUrl(currentMedia.url);
    const videoTimestamp = (isVideo && videoRef.current && !isNaN(videoRef.current.currentTime))
      ? videoRef.current.currentTime
      : null;
    if (isVideo && videoRef.current) {
      videoPausedAtRef.current = videoRef.current.currentTime;
      videoRef.current.pause();
    }
    const rect = e.target.getBoundingClientRect();
    const newComment = {
      id: uuidv4(),
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      comment: '',
      editing: true,
      done: false,
      repositioning: false,
      isNew: true,
      versionId: submission._id,
      mediaIndex: activeMediaIdx,
      author: 'Admin',
      timestamp: new Date().toISOString(),
      ...(videoTimestamp != null && { videoTimestamp }),
    };
    setComments(prev => [...prev, newComment]);
    setActiveComment(newComment.id);
  };

  const handleImageClickWithReposition = async (e) => {
    const repositioning = commentsForMedia.find(c => c.repositioning);
    if (repositioning) {
      const rect = e.target.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setComments(prev => prev.map(c => c.id === repositioning.id ? { ...c, x, y, repositioning: false } : c));
      try {
        await fetch(
          `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(submission.assignment_id)}/comments/${repositioning.id}`,
          { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ x, y, position: { x, y } }) }
        );
      } catch {}
      return;
    }
    handleImageClick(e);
  };

  // ── Comment CRUD ──
  const handleCommentChange = (id, text) =>
    setComments(prev => prev.map(c => c.id === id ? { ...c, comment: text } : c));

  const handleCommentSubmit = async (id) => {
    const comment = comments.find(c => c.id === id);
    if (!comment?.comment?.trim()) return;
    setComments(prev => prev.map(c => c.id === id ? { ...c, editing: false, isNew: false } : c));
    setActiveComment(null);
    try {
      if (comment.isNew) {
        await fetch(
          `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(submission.assignment_id)}/comment`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              versionId: activeVersion._id,
              comment: {
                id: comment.id,
                x: comment.x, y: comment.y,
                position: { x: comment.x, y: comment.y },
                comment: comment.comment.trim(),
                mediaIndex: comment.mediaIndex ?? 0,
                author: 'Admin',
                timestamp: comment.timestamp,
                status: 'active',
              },
            }),
          }
        );
      } else {
        await fetch(
          `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(submission.assignment_id)}/comments/${id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ comment: comment.comment.trim(), status: 'active' }),
          }
        );
      }
    } catch (e) { console.error('Failed to save comment', e); }
  };

  const handleCommentCancel = (id) => {
    const c = comments.find(x => x.id === id);
    if (!c) return;
    if (c.isNew || !c.comment?.trim()) {
      setComments(prev => prev.filter(x => x.id !== id));
    } else {
      setComments(prev => prev.map(x => x.id === id ? { ...x, editing: false } : x));
    }
    setActiveComment(null);
  };

  const handleDeleteComment = async (id) => {
    setComments(prev => prev.filter(c => c.id !== id));
    setActiveComment(null);
    try {
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(submission.assignment_id)}/comments/${id}`,
        { method: 'DELETE' }
      );
    } catch {}
  };

  const handleMarkDone = async (id) => {
    const c = comments.find(x => x.id === id);
    const newDone = !c?.done;
    setComments(prev => prev.map(x => x.id === id ? { ...x, done: newDone } : x));
    try {
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(submission.assignment_id)}/comments/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ done: newDone, status: newDone ? 'completed' : 'active' }),
        }
      );
    } catch {}
  };

  const handleEditComment = (id) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, editing: true, done: false } : c));
    setActiveComment(id);
  };

  const handleRepositionStart = (id) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, repositioning: true } : c));
    setActiveComment(null);
  };

  const handleActivate = (id) => {
    setActiveComment(prev => {
      const next = prev === id ? null : id;
      if (next) {
        const comment = comments.find(c => c.id === next);
        if (comment && comment.videoTimestamp != null && videoRef.current) {
          videoRef.current.currentTime = comment.videoTimestamp;
          videoRef.current.pause();
          videoPausedAtRef.current = comment.videoTimestamp;
          videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }
      return next;
    });
  };

  // ── Caption / hashtag save ──
  const handleSaveCaptionHashtags = async () => {
    setSavingCaption(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(activeVersion._id)}/caption-hashtags`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ caption: captionDraft.trim(), hashtags: hashtagsDraft.trim() }),
        }
      );
      if (!res.ok) throw new Error();
      // Update local version data so the left panel reflects the change immediately
      setLocalVersions(prev => prev.map((v, i) =>
        i === activeVersionIdx ? { ...v, caption: captionDraft.trim(), hashtags: hashtagsDraft.trim() } : v
      ));
      showToast('Caption and hashtags saved.');
    } catch {
      showToast('Failed to save. Please try again.', 'error');
    } finally {
      setSavingCaption(false);
    }
  };

  // ── Send to customer ──
  const handleSendToCustomer = async () => {
    setSendingToCustomer(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(activeVersion._id)}/send-to-customer`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' } }
      );
      if (!res.ok) throw new Error();
      setSentToCustomer(true);
      showToast('Content sent to customer for review.');
    } catch {
      showToast('Failed to send to customer. Please try again.', 'error');
    } finally {
      setSendingToCustomer(false);
    }
  };

  // ── Delete handlers ──
  const handleDeleteVersion = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(activeVersion._id)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error();
      const newVersions = localVersions.filter((_, i) => i !== activeVersionIdx);
      if (newVersions.length === 0) {
        showToast('Submission deleted.');
        setTimeout(() => onDeleted(submission.assignment_id || submission._id), 1200);
      } else {
        setLocalVersions(newVersions);
        setActiveVersionIdx(Math.min(activeVersionIdx, newVersions.length - 1));
        showToast('Version deleted.');
        setDeleteConfirm(null);
      }
    } catch {
      showToast('Failed to delete version.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSubmission = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const assignmentId = submission.assignment_id || submission._id;
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/assignment/${encodeURIComponent(assignmentId)}`,
        { method: 'DELETE' }
      );
      if (!res.ok) throw new Error();
      showToast('Submission deleted.');
      setTimeout(() => onDeleted(assignmentId), 1200);
    } catch {
      showToast('Failed to delete submission.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // ── Status actions ──
  const handleApprove = async () => {
    setApproving(true);
    try {
      // Get the currently logged-in admin's info so it can be stored as the approver
      let adminUser = null;
      try { adminUser = JSON.parse(localStorage.getItem('user')); } catch { adminUser = null; }
      const adminName = adminUser?.name || adminUser?.email || null;
      const adminEmail = adminUser?.email || null;

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(activeVersion._id)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            versionId: activeVersion._id,
            status: 'approved',
            approvalNotes: 'Approved by admin',
            approved_by_admin: true,
            approved_by_admin_name: adminName,
            approved_by_admin_email: adminEmail,
          }),
        }
      );
      if (!res.ok) throw new Error();
      setLocalStatus('approved');
      showToast('Submission approved. Creator notified by email.');
      onStatusUpdated(activeVersion._id, 'approved');
    } catch {
      showToast('Failed to approve. Please try again.', 'error');
    } finally { setApproving(false); }
  };

  // ── Undo Approval ──
  const handleUndoApproval = async () => {
    setUndoingApproval(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(activeVersion._id)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            versionId: activeVersion._id,
            status: 'submitted',
            approvalNotes: '',
            undo_admin_approval: true,
          }),
        }
      );
      if (!res.ok) throw new Error();
      setLocalStatus('submitted');
      setSentToCustomer(false);
      showToast('Approval undone. Submission is back under review.');
      onStatusUpdated(activeVersion._id, 'submitted');
    } catch {
      showToast('Failed to undo approval. Please try again.', 'error');
    } finally { setUndoingApproval(false); }
  };

  const statusCfg   = getStatusConfig(localStatus);
  const currentMedia = mediaItems[activeMediaIdx];
  const totalComments = comments.length;
  const openComments  = comments.filter(c => !c.done).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden animate-fade-in">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalScale {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-modal-scale {
          animation: modalScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes pinPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white flex items-center gap-2
          ${toast.type === 'success' ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-rose-500 shadow-rose-500/20'} animate-fade-in`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <div className="bg-white flex flex-col w-full h-full sm:h-[85vh] sm:max-h-[800px] max-w-5xl sm:rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative animate-modal-scale">

        {/* ── Panel Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-150 bg-slate-50/50 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4.5 w-4.5 text-slate-500 flex-shrink-0" />
              <h2 className="font-bold text-slate-900 text-base truncate">
                {submission.item_name || submission.caption?.slice(0, 60) || 'Submission Review'}
              </h2>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                <span className="truncate">{submission.created_by}</span>
              </span>
              <span>•</span>
              {submission.customer_name && (
                <>
                  <span className="text-blue-650 font-semibold">{submission.customer_name}</span>
                  <span>•</span>
                </>
              )}
              {submission.calendar_name && (
                <>
                  <span className="text-slate-655 font-medium">{submission.calendar_name}</span>
                  <span>•</span>
                </>
              )}
              {submission.platform && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-slate-150/70 text-slate-700 rounded-md font-semibold text-[11px] capitalize">
                  <PlatformIcon platform={submission.platform} className="w-3 h-3" />
                  {Array.isArray(submission.platform) ? submission.platform.join(', ') : submission.platform}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border shadow-sm ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-200/60 rounded-xl transition-all duration-200 text-slate-400 hover:text-slate-600"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex md:hidden border-b border-slate-200 flex-shrink-0">
          <button
            onClick={() => setMobilePanelTab('media')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${mobilePanelTab === 'media' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/20' : 'text-slate-550 hover:text-slate-800'}`}
          >
            Media
          </button>
          <button
            onClick={() => setMobilePanelTab('actions')}
            className={`flex-1 py-3 text-xs font-bold transition-colors ${mobilePanelTab === 'actions' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/20' : 'text-slate-550 hover:text-slate-800'}`}
          >
            Actions &amp; Comments
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Media area ── */}
          <div className={`${mobilePanelTab === 'media' ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-y-auto bg-slate-950 p-4 gap-4 items-center`}>

            {/* Version selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner gap-1">
              {localVersions.map((v, i) => {
                const vCfg = getStatusConfig(v.status);
                const isActive = i === activeVersionIdx;
                return (
                  <div key={v._id || i} className="flex items-center relative group">
                    <button
                      onClick={() => setActiveVersionIdx(i)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                      }`}
                    >
                      <span>v{i + 1}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-850 text-slate-450 group-hover:bg-slate-800 group-hover:text-slate-350'
                      }`}>
                        {vCfg.label.replace(' Review', '')}
                      </span>
                    </button>
                    {localVersions.length > 1 && (
                      <button
                        onClick={() => { setActiveVersionIdx(i); setDeleteConfirm('version'); }}
                        title={`Delete version v${i + 1}`}
                        className={`p-1 rounded-md ml-0.5 transition-all duration-150 ${
                          isActive
                            ? 'text-white/60 hover:text-white hover:bg-blue-700'
                            : 'text-slate-600 hover:text-rose-450 hover:bg-rose-500/10'
                        }`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Media nav */}
            {mediaItems.length > 1 && (
              <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 rounded-full px-3 py-1 shadow-lg">
                <button
                  onClick={() => setActiveMediaIdx(i => Math.max(0, i - 1))}
                  disabled={activeMediaIdx === 0}
                  className="p-1.5 rounded-full hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-all active:scale-90"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold text-slate-300 tabular-nums">
                  {activeMediaIdx + 1} <span className="text-slate-600">/</span> {mediaItems.length}
                </span>
                <button
                  onClick={() => setActiveMediaIdx(i => Math.min(mediaItems.length - 1, i + 1))}
                  disabled={activeMediaIdx === mediaItems.length - 1}
                  className="p-1.5 rounded-full hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 transition-all active:scale-90"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Media + pins */}
            {currentMedia ? (
              <div className="relative inline-block w-full flex justify-center group/canvas">
                {isVideoUrl(currentMedia.url) ? (
                  <video
                    ref={videoRef}
                    src={currentMedia.url}
                    controls
                    className="w-full max-w-full h-auto max-h-[40vh] sm:max-h-[48vh] rounded-xl shadow-2xl border border-slate-800 object-contain cursor-crosshair transition-all"
                    onClick={handleImageClickWithReposition}
                  />
                ) : (
                  <img
                    src={currentMedia.url}
                    alt="media"
                    className="w-full max-w-full h-auto max-h-[40vh] sm:max-h-[48vh] rounded-xl shadow-2xl border border-slate-800 object-contain cursor-crosshair transition-all"
                    onClick={handleImageClickWithReposition}
                  />
                )}

                {/* Comment pins */}
                {commentsForMedia.map((comment, idx) => {
                  if (activeComment && comment.id !== activeComment && !comment.repositioning && !comment.editing) {
                    return null;
                  }
                  return (
                    <CommentPin
                      key={comment.id}
                      comment={comment}
                      index={idx}
                      activeId={activeComment}
                      hoveredId={hoveredComment}
                      setHoveredId={setHoveredComment}
                      onActivate={handleActivate}
                      onCommentChange={handleCommentChange}
                      onSubmit={handleCommentSubmit}
                      onCancel={handleCommentCancel}
                      onMarkDone={handleMarkDone}
                      onEdit={handleEditComment}
                      onDelete={handleDeleteComment}
                      onReposition={handleRepositionStart}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="w-80 h-60 bg-slate-900 rounded-xl flex items-center justify-center border border-slate-800">
                <div className="text-center">
                  <Image className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No media uploaded</p>
                </div>
              </div>
            )}

            {/* Hint */}
            {currentMedia && (
              <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-sm">
                <p className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                  {isVideoUrl(currentMedia.url)
                    ? "Click on the video to add a comment at the current timestamp"
                    : "Click anywhere on the image to pin a comment"}
                </p>
              </div>
            )}

            {/* Thumbnails */}
            {mediaItems.length > 1 && (
              <div className="flex gap-2 flex-wrap justify-center p-1 bg-slate-900/50 border border-slate-800/60 rounded-xl">
                {mediaItems.map((m, i) => {
                  const isActive = i === activeMediaIdx;
                  return (
                    <button
                      key={i}
                      onClick={() => setActiveMediaIdx(i)}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-150 flex-shrink-0 ${
                        isActive
                          ? 'border-blue-500 ring-2 ring-blue-500/20 scale-105'
                          : 'border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-700'
                      }`}
                    >
                      {isVideoUrl(m.url) ? (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                          <Play className="h-4 w-4 text-slate-355" />
                        </div>
                      ) : (
                        <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Caption / Notes */}
            {(activeVersion.caption || activeVersion.notes) && (
              <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                {activeVersion.caption && (
                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-400" />
                      Post Caption
                    </p>
                    <div className="text-xs text-slate-300 leading-relaxed max-h-[120px] overflow-y-auto whitespace-pre-wrap pr-1">{activeVersion.caption}</div>
                  </div>
                )}
                {activeVersion.notes && (
                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-3.5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                      Notes from Creator
                    </p>
                    <div className="text-xs text-slate-300 leading-relaxed max-h-[120px] overflow-y-auto whitespace-pre-wrap pr-1">{activeVersion.notes}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div className={`${mobilePanelTab === 'actions' ? 'flex' : 'hidden'} md:flex w-full md:w-80 xl:w-96 flex-shrink-0 border-l border-slate-150 bg-white flex-col overflow-hidden`}>

            {/* Action area */}
            <div className="p-4 border-b border-slate-100 space-y-2 flex-shrink-0">
              {!['approved', 'revision_requested', 'rejected'].includes(localStatus) && (
                <button
                  onClick={handleApprove}
                  disabled={approving}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl text-xs font-semibold hover:from-emerald-700 hover:to-green-700 shadow-md hover:shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {approving ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" />Approving...</>
                  ) : (
                    <><CheckCircle className="h-3.5 w-3.5" />Approve Submission</>
                  )}
                </button>
              )}

              {localStatus === 'approved' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 p-3 bg-emerald-50 rounded-xl border border-emerald-150">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-800">Approved</p>
                      <p className="text-[10px] text-emerald-650 font-medium">Creator has been notified</p>
                    </div>
                  </div>
                  {sentToCustomer ? (
                    <div className="flex items-center gap-2.5 p-3 bg-blue-50 rounded-xl border border-blue-150">
                      <Send className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-blue-800">Sent to Customer</p>
                        <p className="text-[10px] text-blue-650 font-medium">Customer can now review this content</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSendToCustomer}
                      disabled={sendingToCustomer}
                      className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg shadow-blue-500/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {sendingToCustomer ? (
                        <><Loader2 className="h-3.5 w-3.5 animate-spin" />Sending...</>
                      ) : (
                        <><Send className="h-3.5 w-3.5" />Send to Customer</>
                      )}
                    </button>
                  )}
                  {/* Undo Approval */}
                  {!sentToCustomer && (
                    <button
                      onClick={handleUndoApproval}
                      disabled={undoingApproval}
                      className="w-full py-2 text-amber-700 border border-amber-200 bg-amber-50/30 rounded-xl text-[11px] font-semibold hover:bg-amber-50/80 hover:border-amber-300 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {undoingApproval ? (
                        <><Loader2 className="h-3 w-3 animate-spin" />Undoing...</>
                      ) : (
                        <><RotateCcw className="h-3.5 w-3.5" />Undo Approval</>
                      )}
                    </button>
                  )}
                </div>
              )}

              {localStatus === 'revision_requested' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 p-3 bg-amber-50 rounded-xl border border-amber-150">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">Revision Requested</p>
                      <p className="text-[10px] text-amber-650 font-medium">Creator has been notified</p>
                    </div>
                  </div>
                  <button
                    onClick={handleApprove}
                    disabled={approving}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {approving ? (
                      <><Loader2 className="h-3.5 w-3.5 animate-spin" />Approving...</>
                    ) : (
                      <><CheckCircle className="h-3.5 w-3.5" />Approve Anyway</>
                    )}
                  </button>
                </div>
              )}

              {/* ── Delete section ── */}
              <div className="border-t border-slate-100 pt-2 space-y-1.5">
                {localVersions.length > 1 && (
                  <button
                    onClick={() => setDeleteConfirm('version')}
                    className="w-full py-2 text-rose-600 border border-rose-100 rounded-xl text-[11px] font-semibold hover:bg-rose-50/50 hover:border-rose-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />Delete Version v{activeVersionIdx + 1}
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirm('all')}
                  className="w-full py-2 text-rose-700 border border-rose-200 bg-rose-50/20 rounded-xl text-[11px] font-semibold hover:bg-rose-50/80 hover:border-rose-300 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />Delete Entire Submission
                </button>
              </div>

              {/* ── Delete confirmation ── */}
              {deleteConfirm && (
                <div className="p-3 bg-rose-50/40 border border-rose-150 rounded-xl space-y-2.5 mt-2 animate-fade-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-rose-900">
                        {deleteConfirm === 'version'
                          ? `Delete version v${activeVersionIdx + 1}?`
                          : `Delete entire submission?`}
                      </p>
                      <p className="text-[10px] text-rose-650 mt-0.5">
                        {deleteConfirm === 'version'
                          ? 'This version will be permanently removed.'
                          : `All ${localVersions.length} version(s) will be permanently removed.`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={deleteConfirm === 'version' ? handleDeleteVersion : handleDeleteSubmission}
                      disabled={deleting}
                      className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-1 shadow-sm transition-all"
                    >
                      {deleting ? (
                        <><Loader2 className="h-3 w-3 animate-spin" />Deleting...</>
                      ) : (
                        'Yes, Delete'
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      disabled={deleting}
                      className="flex-1 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-650 font-semibold hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 bg-slate-50/40 flex-shrink-0">
              {[
                { key: 'comments', label: 'Comments', count: totalComments },
                { key: 'details',  label: 'Details',  count: null },
              ].map(tab => {
                const isActive = sidebarTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setSidebarTab(tab.key)}
                    className={`flex-1 py-3 text-xs font-bold transition-all relative ${
                      isActive
                        ? 'text-blue-600'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== null && tab.count > 0 && (
                      <span className={`ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold transition-all ${
                        isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-655'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                    {isActive && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full mx-6" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Comments tab ── */}
              {sidebarTab === 'comments' && (
                <div className="p-4 space-y-4">
                  {totalComments === 0 ? (
                    <div className="text-center py-16 px-4">
                      <MessageSquare className="h-8 w-8 text-slate-350 mx-auto mb-2.5" />
                      <p className="text-xs font-bold text-slate-500">No comments yet</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">Click anywhere on the image preview to place a comment pin.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Per-media filter pills */}
                      {mediaItems.length > 1 && (
                        <div className="flex gap-1.5 flex-wrap pb-1.5 border-b border-slate-100">
                          {mediaItems.map((_, i) => {
                            const cnt = comments.filter(c => (c.mediaIndex ?? 0) === i).length;
                            const isCurrent = i === activeMediaIdx;
                            return (
                              <button
                                key={i}
                                onClick={() => setActiveMediaIdx(i)}
                                className={`text-[10px] px-2.5 py-1 rounded-lg font-semibold transition-all ${
                                  isCurrent
                                    ? 'bg-blue-50 text-blue-650 border border-blue-200 shadow-sm'
                                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-150'
                                }`}
                              >
                                Media {i + 1} {cnt > 0 && `(${cnt})`}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {commentsForMedia.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">
                            Media {activeMediaIdx + 1} — {commentsForMedia.length} comment{commentsForMedia.length !== 1 ? 's' : ''}
                          </p>
                          {commentsForMedia.map((comment, idx) => {
                            const isActive = activeComment === comment.id;
                            return (
                              <div
                                key={comment.id}
                                onClick={() => handleActivate(comment.id)}
                                className={`rounded-xl cursor-pointer transition-all border overflow-hidden ${
                                  isActive
                                    ? 'bg-blue-50/50 border-blue-200 shadow-sm ring-1 ring-blue-200/50'
                                    : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/40'
                                }`}
                              >
                                <div className="p-3 flex items-start gap-2.5">
                                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 shadow-sm ${
                                    comment.done ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-100'
                                  }`}>
                                    {idx + 1}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs leading-relaxed break-words text-slate-800 ${comment.done ? 'line-through text-slate-400 font-normal' : 'font-semibold'}`}>
                                      {comment.comment}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      {comment.author && (
                                        <span className="text-[9px] font-semibold text-slate-400 flex items-center gap-0.5">
                                          <User className="w-2.5 h-2.5" />
                                          {comment.author}
                                        </span>
                                      )}
                                      {comment.timestamp && (
                                        <span className="text-[9px] text-slate-450">
                                          {new Date(comment.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                    <button
                                      onClick={() => handleMarkDone(comment.id)}
                                      title={comment.done ? 'Undo / Reopen' : 'Mark as resolved'}
                                      className={`p-1 rounded-md transition-colors ${
                                        comment.done
                                          ? 'text-emerald-600 hover:bg-emerald-50'
                                          : 'text-slate-350 hover:text-emerald-600 hover:bg-emerald-50/50'
                                      }`}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      title="Delete comment"
                                      className="p-1 rounded-md text-slate-350 hover:text-rose-605 hover:bg-rose-50/50 transition-colors"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {commentsForMedia.length === 0 && totalComments > 0 && (
                        <div className="text-center py-8 px-4 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <p className="text-xs text-slate-400 font-medium">No comments on this media item.</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Use filters above or click on the image to add one.</p>
                        </div>
                      )}

                      {comments.filter(c => (c.mediaIndex ?? 0) !== activeMediaIdx).length > 0 && (
                        <div className="text-center text-[10px] text-slate-400 py-2 border-t border-slate-100 mt-3 font-medium">
                          {comments.filter(c => (c.mediaIndex ?? 0) !== activeMediaIdx).length} other comment(s) on different media
                        </div>
                      )}
                    </div>
                  )}

                  {totalComments > 0 && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-semibold px-1">
                      <span>{openComments} open · {totalComments - openComments} resolved</span>
                      <span className="text-[10px] font-normal text-slate-450">{totalComments} total</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Details tab ── */}
              {sidebarTab === 'details' && (
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <SidebarRow icon={User}     label="Creator"   value={submission.created_by} />
                    <SidebarRow icon={User}     label="Customer"  value={submission.customer_name} color="text-blue-650" />
                    <SidebarRow icon={Calendar} label="Calendar"  value={submission.calendar_name} />
                    <SidebarRow icon={FileText} label="Item"      value={submission.item_name} />
                    <SidebarRow icon={Clock}    label="Submitted" value={fmtDate(submission.sent_to_admin_at || submission.created_at)} />
                    <SidebarRow icon={FileText} label="Platform"  value={submission.platform} />
                    {Array.isArray(submission.notify_admins) && submission.notify_admins.length > 0 && (
                      <SidebarRow icon={User} label="Notified Admins"
                        value={submission.notify_admins.map(a => a.name || a.email).join(', ')} />
                    )}
                  </div>

                  {/* ── Caption & Hashtags editor ── */}
                  <div className="border-t border-slate-100 pt-4 space-y-3.5">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                      <Edit3 className="h-3.5 w-3.5 text-blue-500" />Caption &amp; Hashtags
                    </p>
                    <div className="space-y-3 p-1">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Caption</label>
                        <textarea
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-slate-50 focus:bg-white transition-all outline-none"
                          rows={3}
                          placeholder="Enter caption for this post…"
                          value={captionDraft}
                          onChange={e => setCaptionDraft(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Hashtags</label>
                        <textarea
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none bg-slate-50 focus:bg-white transition-all outline-none"
                          rows={2}
                          placeholder="#hashtag1 #hashtag2 …"
                          value={hashtagsDraft}
                          onChange={e => setHashtagsDraft(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={handleSaveCaptionHashtags}
                        disabled={savingCaption}
                        className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-500/10 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {savingCaption ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving…</>
                        ) : (
                          <><Check className="h-3.5 w-3.5" />Save Changes</>
                        )}
                      </button>
                    </div>
                  </div>

                  {activeVersion.approvalNotes && (
                    <div className="p-3 bg-emerald-50/50 border border-emerald-150 rounded-xl space-y-1">
                      <p className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        Approval Notes
                      </p>
                      <p className="text-xs text-emerald-700 leading-relaxed font-medium">{activeVersion.approvalNotes}</p>
                    </div>
                  )}
                  {activeVersion.rejectionReason && (
                    <div className="p-3 bg-amber-50/50 border border-amber-150 rounded-xl space-y-1">
                      <p className="text-[9px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-amber-650" />
                        Revision Notes
                      </p>
                      <p className="text-xs text-amber-750 leading-relaxed font-medium">{activeVersion.rejectionReason}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarRow({ icon: Icon, label, value, color = 'text-slate-800' }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 p-2 bg-slate-50/50 rounded-xl border border-slate-100/50 transition-all hover:bg-slate-50 hover:border-slate-150">
      <div className="p-1.5 bg-white rounded-lg border border-slate-100 shadow-sm flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className={`text-xs font-semibold ${color} break-all mt-0.5`}>{value}</div>
      </div>
    </div>
  );
}

// ─── Media Preview (card thumbnail) ───────────────────────────────────────────
function MediaPreview({ images }) {
  const items = normalizeMedia(images);
  if (!items.length) {
    return (
      <div className="h-full bg-slate-100 flex items-center justify-center rounded-t-xl">
        <Image className="h-8 w-8 text-slate-300" />
      </div>
    );
  }
  const first = items[0];
  return (
    <div className="relative h-full bg-slate-150 rounded-t-xl overflow-hidden">
      {isVideoUrl(first.url) ? (
        <>
          <video src={first.url} className="w-full h-full object-cover" muted preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Play className="h-7 w-7 text-white drop-shadow" />
          </div>
        </>
      ) : (
        <img src={first.url} alt="submission" className="w-full h-full object-cover" loading="lazy" />
      )}
      {items.length > 1 && (
        <span className="absolute bottom-2 right-2 bg-slate-900/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
          +{items.length - 1}
        </span>
      )}
    </div>
  );
}

// ─── Submission Card ───────────────────────────────────────────────────────────
function SubmissionCard({ submission, onView, onDelete }) {
  const statusCfg    = getStatusConfig(submission.status);
  const commentCount = Array.isArray(submission.comments) ? submission.comments.length : 0;
  const versionCount = submission.allVersions?.length || 1;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer relative" onClick={onView}>
      {/* Thumbnail */}
      <div className="relative h-36 bg-slate-50 flex-shrink-0 border-b border-slate-100">
        <MediaPreview images={submission.images} />
        <span className={`absolute top-2 left-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusCfg.color}`}>
          {statusCfg.label.replace(' Review', '')}
        </span>
        {versionCount > 1 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700 shadow-sm">
            V{versionCount}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3 flex-1 flex flex-col justify-between relative">
        <div>
          {/* Title */}
          <p className="text-sm font-semibold text-slate-800 truncate mb-1" title={submission.item_name || 'Untitled submission'}>
            {submission.item_name || 'Untitled submission'}
          </p>
        </div>

        <div>
          {/* Footer Info Row */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2.5 pt-2 border-t border-slate-100 flex-shrink-0">
            <span className="capitalize inline-flex items-center gap-1">
              <PlatformIcon platform={submission.platform} className="w-3 h-3" />
              {Array.isArray(submission.platform) ? submission.platform.join(', ') : submission.platform}
            </span>
            <span className="tabular-nums">{fmtDate(submission.sent_to_admin_at || submission.created_at).slice(0, 12)}</span>
          </div>

          {/* Action Row */}
          <div className="flex gap-2 mt-3 w-full flex-shrink-0">
            <button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center"
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              Review
            </button>
            <button
              className="p-1.5 bg-red-50 text-red-650 border border-red-100 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(true);
              }}
              title="Delete submission"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inline absolute delete confirm overlay */}
        {confirmDelete && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm p-3 flex flex-col justify-center items-center rounded-xl z-10 animate-fade-in" onClick={e => e.stopPropagation()}>
            <p className="text-xs font-bold text-slate-805 text-center mb-1">Delete submission?</p>
            <p className="text-[10px] text-slate-500 text-center mb-3">All versions will be deleted permanently.</p>
            <div className="flex gap-2 w-full max-w-[160px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(submission);
                  setConfirmDelete(false);
                }}
                className="flex-1 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 active:scale-95 transition-all shadow shadow-rose-500/10"
              >
                Yes
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(false);
                }}
                className="flex-1 py-1.5 border border-slate-200 bg-slate-50 text-slate-655 rounded-lg text-xs font-bold hover:bg-slate-100 active:scale-95 transition-all"
              >
                No
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CreatorSubmissionsReview({ embedded = false, customerId = null }) {
  const [submissions,      setSubmissions]      = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [refreshing,       setRefreshing]       = useState(false);
  const [filterStatus,     setFilterStatus]     = useState('all');
  const [reviewSubmission, setReviewSubmission] = useState(null);

  const fetchSubmissions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res  = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      const data = await res.json();
      const adminReview = Array.isArray(data)
        ? data.filter(s => Array.isArray(s.notify_admins) && s.notify_admins.length > 0)
        : [];

      const reviewItems = customerId
        ? adminReview.filter(s =>
            s.customer_id === customerId ||
            s.customerId === customerId ||
            s.customer?._id === customerId
          )
        : adminReview;

      // Group by assignment_id so multiple versions appear as one card
      const grouped = {};
      reviewItems.forEach(s => {
        const key = s.assignment_id || s._id;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(s);
      });

      const cards = Object.values(grouped).map(versions => {
        // Sort oldest → newest
        versions.sort((a, b) =>
          new Date(a.sent_to_admin_at || a.created_at) - new Date(b.sent_to_admin_at || b.created_at)
        );
        const latest = versions[versions.length - 1];
        return { ...latest, allVersions: versions };
      });

      cards.sort((a, b) =>
        new Date(b.sent_to_admin_at || b.created_at) - new Date(a.sent_to_admin_at || a.created_at)
      );
      setSubmissions(cards);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId]);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleDeleteSubmission = useCallback(async (submission) => {
    const assignmentId = submission.assignment_id || submission._id;
    setSubmissions(prev => prev.filter(s => (s.assignment_id || s._id) !== assignmentId));
    try {
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/assignment/${encodeURIComponent(assignmentId)}`,
        { method: 'DELETE' }
      );
    } catch {}
  }, []);

  const handleStatusUpdated = (submissionId, newStatus) => {
    const applyUpdate = (s) => {
      if (s._id === submissionId) {
        const updatedVersions = s.allVersions?.map(v =>
          v._id === submissionId ? { ...v, status: newStatus } : v
        );
        return { ...s, status: newStatus, ...(updatedVersions ? { allVersions: updatedVersions } : {}) };
      }
      if (s.allVersions?.some(v => v._id === submissionId)) {
        const updatedVersions = s.allVersions.map(v =>
          v._id === submissionId ? { ...v, status: newStatus } : v
        );
        const latestStatus = updatedVersions[updatedVersions.length - 1].status;
        return { ...s, status: latestStatus, allVersions: updatedVersions };
      }
      return s;
    };
    setSubmissions(prev => prev.map(applyUpdate));
    setReviewSubmission(prev => prev ? applyUpdate(prev) : prev);
  };

  const filtered = filterStatus === 'all'
    ? submissions
    : submissions.filter(s => s.status === filterStatus);

  const counts = {
    all:                submissions.length,
    submitted:          submissions.filter(s => s.status === 'submitted').length,
    approved:           submissions.filter(s => s.status === 'approved').length,
    revision_requested: submissions.filter(s => s.status === 'revision_requested').length,
  };

  if (loading) {
    const loadingContent = (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200/50 animate-pulse">
            <div className="h-40 bg-gray-200 rounded-t-xl" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );

    if (embedded) {
      return loadingContent;
    }

    return (
      <AdminLayout title="Creator Submissions Review">
        {loadingContent}
      </AdminLayout>
    );
  }

  const content = (
    <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Creator Submissions</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Content submitted by creators for your review. Click any card to review, pin comments, approve or request revisions.
            </p>
          </div>
          <button
            onClick={() => fetchSubmissions(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: 'all',                label: 'All' },
            { key: 'submitted',          label: 'Pending Review' },
            { key: 'approved',           label: 'Approved' },
            { key: 'revision_requested', label: 'Revision Requested' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilterStatus(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${filterStatus === tab.key
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full
                ${filterStatus === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Image className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No submissions found</h3>
            <p className="text-sm text-gray-400">
              {filterStatus === 'all'
                ? 'No content creators have submitted content for admin review yet.'
                : `No submissions with status "${getStatusConfig(filterStatus).label}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(submission => (
              <SubmissionCard
                key={submission._id}
                submission={submission}
                onView={() => setReviewSubmission(submission)}
                onDelete={handleDeleteSubmission}
              />
            ))}
          </div>
        )}

      {/* Full-screen review panel */}
      {reviewSubmission && (
        <ReviewPanel
          submission={reviewSubmission}
          onClose={() => setReviewSubmission(null)}
          onStatusUpdated={handleStatusUpdated}
          onDeleted={(assignmentId) => {
            setSubmissions(prev => prev.filter(s => (s.assignment_id || s._id) !== assignmentId));
            setReviewSubmission(null);
          }}
        />
      )}
    </div>
);

  if (embedded) {
    return content;
  }

  return (
    <AdminLayout title="Creator Submissions Review">
      {content}
    </AdminLayout>
  );
}

