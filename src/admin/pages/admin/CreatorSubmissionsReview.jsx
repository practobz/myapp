import React, { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  Image, Play, RefreshCw, CheckCircle, MessageSquare,
  Clock, XCircle, User, Calendar, FileText, Eye, X,
  ChevronLeft, ChevronRight, Trash2, Edit3, Check,
  RotateCcw, Move, Send, AlertCircle
} from 'lucide-react';

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  submitted: { label: 'Pending Review', color: 'bg-amber-100  text-amber-700  border-amber-200' },
  approved: { label: 'Approved', color: 'bg-green-100  text-green-700  border-green-200' },
  revision_requested: { label: 'Revision Requested', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  rejected: { label: 'Rejected', color: 'bg-red-100    text-red-700    border-red-200' },
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || STATUS_CONFIG['submitted'];

const isVideoUrl = (url) => /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url || '');

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
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    success: 'bg-green-500 hover:bg-green-600 text-white',
    warning: 'bg-orange-500 hover:bg-orange-600 text-white',
    danger: 'bg-red-500   hover:bg-red-600   text-white',
    info: 'bg-cyan-500  hover:bg-cyan-600  text-white',
    ghost: 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
  };
  const s = { sm: 'px-2 py-1 text-[10px]', md: 'px-3 py-1.5 text-xs', lg: 'px-4 py-2 text-sm' };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${v[variant]} ${s[size]} rounded-md font-medium transition-all inline-flex items-center justify-center gap-0.5 disabled:opacity-50`}
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

  const pinColor = comment.done ? '#10b981'
    : comment.repositioning ? '#8b5cf6'
      : comment.editing ? '#3b82f6'
        : '#ef4444';

  const popupLeft = (isNormalized ? x > 0.5 : x > 150) ? 'auto' : 30;
  const popupRight = (isNormalized ? x > 0.5 : x > 150) ? 30 : 'auto';

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
          ? '0 0 0 3px rgba(139,92,246,0.3), 0 2px 8px rgba(0,0,0,0.2)'
          : '0 2px 8px rgba(0,0,0,0.2)',
        cursor: comment.repositioning ? 'move' : 'pointer',
        zIndex: 10,
        border: '2px solid #fff',
        transition: 'all 0.2s',
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
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            padding: '10px',
            minWidth: '180px', maxWidth: '220px',
            zIndex: 20,
            boxShadow: '0 4px 20px rgba(59,130,246,0.15)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {comment.editing ? (
            <>
              <textarea
                value={comment.comment}
                onChange={(e) => onCommentChange(comment.id, e.target.value)}
                placeholder="Add comment..."
                className="w-full p-2 border border-gray-200 rounded-md resize-none text-xs text-gray-900 bg-white focus:border-blue-500 focus:outline-none"
                rows={2}
                autoFocus
              />
              <div className="flex gap-1.5 mt-2">
                <Btn onClick={() => onSubmit(comment.id)} variant="success" size="sm">
                  <Check className="h-2.5 w-2.5 mr-0.5" />Save
                </Btn>
                <Btn onClick={() => onCancel(comment.id)} variant="danger" size="sm">Cancel</Btn>
              </div>
            </>
          ) : (
            <>
              <p className="font-medium text-gray-900 text-xs leading-relaxed break-words mb-2">
                {comment.comment}
                {comment.done && <span className="text-green-600 ml-1">✓</span>}
              </p>
              {comment.author && <p className="text-[10px] text-gray-400 mb-2">— {comment.author}</p>}
              <div className="grid grid-cols-2 gap-1">
                {!comment.done ? (
                  <Btn onClick={(e) => { e.stopPropagation(); onMarkDone(comment.id); }} variant="success" size="sm">
                    <CheckCircle className="h-2.5 w-2.5 mr-0.5" />Done
                  </Btn>
                ) : (
                  <Btn onClick={(e) => { e.stopPropagation(); onMarkDone(comment.id); }} variant="warning" size="sm">
                    <RotateCcw className="h-2.5 w-2.5 mr-0.5" />Undo
                  </Btn>
                )}
                <Btn onClick={(e) => { e.stopPropagation(); onEdit(comment.id); }} variant="warning" size="sm">
                  <Edit3 className="h-2.5 w-2.5 mr-0.5" />Edit
                </Btn>
                <Btn onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }} variant="danger" size="sm">
                  <Trash2 className="h-2.5 w-2.5 mr-0.5" />Del
                </Btn>
                <Btn onClick={(e) => { e.stopPropagation(); onReposition(comment.id); }} variant="info" size="sm">
                  <Move className="h-2.5 w-2.5 mr-0.5" />Move
                </Btn>
              </div>
            </>
          )}
        </div>
      )}

      {comment.repositioning && (
        <div style={{
          position: 'absolute', left: 30, top: '50%', transform: 'translateY(-50%)',
          background: '#8b5cf6', color: '#fff', borderRadius: '6px', padding: '4px 8px',
          fontSize: '10px', fontWeight: 600, whiteSpace: 'nowrap', zIndex: 20,
        }}>
          Click image to place
        </div>
      )}
    </div>
  );
}

// ─── Full-screen Review Panel ──────────────────────────────────────────────────
function ReviewPanel({ submission, onClose, onStatusUpdated, onDeleted }) {
  const [localVersions, setLocalVersions] = useState(submission.allVersions || [submission]);
  const [activeVersionIdx, setActiveVersionIdx] = useState((submission.allVersions || [submission]).length - 1);
  const activeVersion = localVersions[activeVersionIdx];

  const mediaItems = normalizeMedia(activeVersion.images);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);

  const [comments, setComments] = useState(() => normalizeComments(activeVersion.comments));
  const [commentsForMedia, setCommentsForMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);

  const [approving, setApproving] = useState(false);

  const [localStatus, setLocalStatus] = useState(activeVersion.status);
  const [toast, setToast] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('comments');
  const [sentToCustomer, setSentToCustomer] = useState(activeVersion.submission_stage === 'customer');
  const [sendingToCustomer, setSendingToCustomer] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // null | 'version' | 'all'
  const [deleting, setDeleting] = useState(false);
  const [mobilePanelTab, setMobilePanelTab] = useState('actions'); // 'media' | 'actions'

  // Caption / hashtag editing
  const [captionDraft, setCaptionDraft] = useState(activeVersion.caption || '');
  const [hashtagsDraft, setHashtagsDraft] = useState(activeVersion.hashtags || '');
  const [savingCaption, setSavingCaption] = useState(false);

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
      } catch { }
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
    } catch { }
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
    } catch { }
  };

  const handleEditComment = (id) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, editing: true, done: false } : c));
    setActiveComment(id);
  };

  const handleRepositionStart = (id) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, repositioning: true } : c));
    setActiveComment(null);
  };

  const handleActivate = (id) => setActiveComment(prev => prev === id ? null : id);

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
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(activeVersion._id)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId: activeVersion._id, status: 'approved', approvalNotes: 'Approved by admin', approved_by_admin: true }),
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

  // Derived
  const statusCfg = getStatusConfig(localStatus);
  const currentMedia = mediaItems[activeMediaIdx];
  const totalComments = comments.length;
  const openComments = comments.filter(c => !c.done).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 flex items-stretch overflow-hidden">
      <style>{`
        @keyframes pinPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.15); opacity: 0.8; }
        }
      `}</style>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[60] px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white flex items-center gap-2
          ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      <div className="bg-white flex flex-col w-full h-full">

        {/* ── Panel Header ── */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50 flex-shrink-0">
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-gray-900 text-base truncate">
              {submission.item_name || submission.caption?.slice(0, 60) || 'Submission Review'}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <User className="h-3 w-3" />
              <span className="truncate">{submission.created_by}</span>
              {submission.platform && <><span>·</span><span>{submission.platform}</span></>}
              {submission.customer_name && <><span>·</span><span className="text-blue-600">{submission.customer_name}</span></>}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0 ml-4">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCfg.color}`}>
              {statusCfg.label}
            </span>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex md:hidden border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setMobilePanelTab('media')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${mobilePanelTab === 'media' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Media
          </button>
          <button
            onClick={() => setMobilePanelTab('actions')}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${mobilePanelTab === 'actions' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Actions &amp; Comments
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Media area ── */}
          <div className={`${mobilePanelTab === 'media' ? 'flex' : 'hidden'} md:flex flex-1 flex-col overflow-y-auto bg-slate-50 p-4 gap-4 items-center`}>

            {/* Version selector */}
            <div className="flex flex-wrap gap-2 justify-center">
              {localVersions.map((v, i) => {
                const vCfg = getStatusConfig(v.status);
                return (
                  <div key={v._id || i} className="flex items-center">
                    <button
                      onClick={() => setActiveVersionIdx(i)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-l-lg text-xs font-semibold border-y border-l transition-all ${i === activeVersionIdx
                          ? 'bg-blue-600 text-white border-blue-600 shadow'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                    >
                      v{i + 1}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${i === activeVersionIdx ? 'bg-white/20 text-white' : vCfg.color
                        }`}>
                        {vCfg.label}
                      </span>
                    </button>
                    <button
                      onClick={() => { setActiveVersionIdx(i); setDeleteConfirm('version'); }}
                      title={`Delete v${i + 1}`}
                      className={`p-1.5 border-y border-r rounded-r-lg transition-all ${i === activeVersionIdx
                          ? 'bg-blue-700 border-blue-600 text-white/70 hover:text-white hover:bg-blue-800'
                          : 'bg-white border-gray-200 text-gray-300 hover:text-red-500 hover:border-red-300 hover:bg-red-50'
                        }`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Media nav */}
            {mediaItems.length > 1 && (
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveMediaIdx(i => Math.max(0, i - 1))}
                  disabled={activeMediaIdx === 0}
                  className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <span className="text-sm font-medium text-gray-600">{activeMediaIdx + 1} / {mediaItems.length}</span>
                <button onClick={() => setActiveMediaIdx(i => Math.min(mediaItems.length - 1, i + 1))}
                  disabled={activeMediaIdx === mediaItems.length - 1}
                  className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition">
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            )}

            {/* Media + pins */}
            {currentMedia ? (
              <div className="relative inline-block w-full flex justify-center">
                {isVideoUrl(currentMedia.url) ? (
                  <video
                    src={currentMedia.url}
                    controls
                    className="w-full max-w-full h-auto max-h-[45vh] sm:max-h-[60vh] rounded-xl shadow-lg border border-gray-200 object-contain cursor-crosshair"
                    onClick={handleImageClickWithReposition}
                  />
                ) : (
                  <img
                    src={currentMedia.url}
                    alt="media"
                    className="w-full max-w-full h-auto max-h-[45vh] sm:max-h-[60vh] rounded-xl shadow-lg border border-gray-200 object-contain cursor-crosshair"
                    onClick={handleImageClickWithReposition}
                  />
                )}

                {/* Comment pins */}
                {commentsForMedia.map((comment, idx) => (
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
                ))}
              </div>
            ) : (
              <div className="w-80 h-60 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-200">
                <div className="text-center">
                  <Image className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No media</p>
                </div>
              </div>
            )}

            {/* Hint */}
            {currentMedia && !isVideoUrl(currentMedia.url) && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3" />
                Click anywhere on the image to pin a comment
              </p>
            )}

            {/* Thumbnails */}
            {mediaItems.length > 1 && (
              <div className="flex gap-2 flex-wrap justify-center">
                {mediaItems.map((m, i) => (
                  <button key={i} onClick={() => setActiveMediaIdx(i)}
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${i === activeMediaIdx ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                      }`}>
                    {isVideoUrl(m.url)
                      ? <div className="w-full h-full bg-gray-200 flex items-center justify-center"><Play className="h-4 w-4 text-gray-500" /></div>
                      : <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </button>
                ))}
              </div>
            )}

            {/* Caption / Notes */}
            {(activeVersion.caption || activeVersion.notes) && (
              <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeVersion.caption && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Caption</p>
                    <div className="bg-white rounded-xl p-3 border border-gray-200 text-sm text-gray-700 leading-relaxed">{activeVersion.caption}</div>
                  </div>
                )}
                {activeVersion.notes && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Notes for Admin</p>
                    <div className="bg-white rounded-xl p-3 border border-gray-200 text-sm text-gray-700 leading-relaxed">{activeVersion.notes}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div className={`${mobilePanelTab === 'actions' ? 'flex' : 'hidden'} md:flex w-full md:w-80 xl:w-96 flex-shrink-0 border-l border-gray-200 bg-white flex-col overflow-hidden`}>

            {/* Action area */}
            <div className="p-4 border-b border-gray-100 space-y-2 flex-shrink-0">
              {!['approved', 'revision_requested', 'rejected'].includes(localStatus) && (
                <button onClick={handleApprove} disabled={approving}
                  className="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {approving
                    ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Approving...</>
                    : <><CheckCircle className="h-4 w-4" />Approve</>}
                </button>
              )}

              {localStatus === 'approved' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Approved</p>
                      <p className="text-xs text-green-600">Creator has been notified</p>
                    </div>
                  </div>
                  {sentToCustomer ? (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl border border-blue-200">
                      <Send className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-blue-800">Sent to Customer</p>
                        <p className="text-xs text-blue-600">Customer can now review this content</p>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleSendToCustomer}
                      disabled={sendingToCustomer}
                      className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {sendingToCustomer
                        ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
                        : <><Send className="h-4 w-4" />Send to Customer</>}
                    </button>
                  )}
                </div>
              )}

              {localStatus === 'revision_requested' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl border border-orange-200">
                    <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-orange-800">Revision Requested</p>
                      <p className="text-xs text-orange-600">Creator has been notified</p>
                    </div>
                  </div>
                  <button onClick={handleApprove} disabled={approving}
                    className="w-full py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {approving
                      ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Approving...</>
                      : <><CheckCircle className="h-4 w-4" />Approve Anyway</>}
                  </button>
                </div>
              )}

              {/* ── Delete section ── */}
              <div className="border-t border-gray-100 pt-2 space-y-1.5">
                {localVersions.length > 1 && (
                  <button
                    onClick={() => setDeleteConfirm('version')}
                    className="w-full py-2 text-red-500 border border-red-200 rounded-xl text-xs font-semibold hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />Delete Version v{activeVersionIdx + 1}
                  </button>
                )}
                <button
                  onClick={() => setDeleteConfirm('all')}
                  className="w-full py-2 text-red-600 border border-red-300 bg-red-50/50 rounded-xl text-xs font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />Delete Entire Submission
                </button>
              </div>

              {/* ── Delete confirmation ── */}
              {deleteConfirm && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-red-800">
                        {deleteConfirm === 'version'
                          ? `Delete version v${activeVersionIdx + 1}?`
                          : `Delete entire submission?`}
                      </p>
                      <p className="text-[10px] text-red-600 mt-0.5">
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
                      className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {deleting
                        ? <><div className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />Deleting...</>
                        : 'Yes, Delete'}
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      disabled={deleting}
                      className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 flex-shrink-0">
              {[
                { key: 'comments', label: 'Comments', count: totalComments },
                { key: 'details', label: 'Details', count: null },
              ].map(tab => (
                <button key={tab.key} onClick={() => setSidebarTab(tab.key)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${sidebarTab === tab.key
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}>
                  {tab.label}
                  {tab.count !== null && tab.count > 0 && (
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold
                      ${sidebarTab === tab.key ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Comments tab ── */}
              {sidebarTab === 'comments' && (
                <div className="p-3">
                  {totalComments === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400 font-medium">No comments yet</p>
                      <p className="text-xs text-gray-300 mt-1">Click on the image to add a comment pin</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* Per-media filter pills */}
                      {mediaItems.length > 1 && (
                        <div className="flex gap-1.5 flex-wrap mb-3">
                          {mediaItems.map((_, i) => {
                            const cnt = comments.filter(c => (c.mediaIndex ?? 0) === i).length;
                            return (
                              <button key={i} onClick={() => setActiveMediaIdx(i)}
                                className={`text-[10px] px-2 py-1 rounded-full transition-colors ${i === activeMediaIdx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}>
                                Media {i + 1} {cnt > 0 && `(${cnt})`}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {commentsForMedia.length > 0 && (
                        <>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide px-1">
                            Media {activeMediaIdx + 1} — {commentsForMedia.length} comment{commentsForMedia.length !== 1 ? 's' : ''}
                          </p>
                          {commentsForMedia.map((comment, idx) => (
                            <div key={comment.id} onClick={() => handleActivate(comment.id)}
                              className={`rounded-xl cursor-pointer transition-all border overflow-hidden ${activeComment === comment.id
                                  ? 'bg-blue-50 border-blue-200 shadow-sm'
                                  : 'bg-white border-gray-100 hover:bg-gray-50'
                                }`}>
                              <div className="p-2.5 flex items-start gap-2">
                                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${comment.done ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                  }`}>
                                  {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-gray-800 break-words line-clamp-2">
                                    {comment.comment}
                                    {comment.done && <span className="ml-1 text-green-600">✓</span>}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {comment.author && <span className="text-[10px] text-gray-400">{comment.author}</span>}
                                  </div>
                                </div>
                                <div className="flex gap-1 flex-shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleMarkDone(comment.id); }}
                                    title={comment.done ? 'Undo' : 'Mark done'}
                                    className={`p-1 rounded ${comment.done ? 'text-green-500 hover:bg-green-50' : 'text-gray-300 hover:text-green-500 hover:bg-green-50'}`}>
                                    <CheckCircle className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                                    title="Delete"
                                    className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </>
                      )}

                      {commentsForMedia.length === 0 && totalComments > 0 && (
                        <div className="text-center py-6 text-xs text-gray-400">
                          No comments on this media. Switch media or click the image to add one.
                        </div>
                      )}

                      {comments.filter(c => (c.mediaIndex ?? 0) !== activeMediaIdx).length > 0 && (
                        <p className="text-center text-[10px] text-gray-400 py-2 border-t border-gray-100 mt-2">
                          {comments.filter(c => (c.mediaIndex ?? 0) !== activeMediaIdx).length} comment(s) on other media
                        </p>
                      )}
                    </div>
                  )}

                  {totalComments > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <span>{openComments} open · {totalComments - openComments} resolved</span>
                      <span className="text-[10px] text-gray-400">{totalComments} total</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── Details tab ── */}
              {sidebarTab === 'details' && (
                <div className="p-4 space-y-3 text-sm">
                  <SidebarRow icon={User} label="Creator" value={submission.created_by} />
                  <SidebarRow icon={User} label="Customer" value={submission.customer_name} color="text-blue-600" />
                  <SidebarRow icon={Calendar} label="Calendar" value={submission.calendar_name} />
                  <SidebarRow icon={FileText} label="Item" value={submission.item_name} />
                  <SidebarRow icon={Clock} label="Submitted" value={fmtDate(submission.sent_to_admin_at || submission.created_at)} />
                  <SidebarRow icon={FileText} label="Platform" value={submission.platform} />
                  {Array.isArray(submission.notify_admins) && submission.notify_admins.length > 0 && (
                    <SidebarRow icon={User} label="Notified Admins"
                      value={submission.notify_admins.map(a => a.name || a.email).join(', ')} />
                  )}

                  {/* ── Caption & Hashtags editor ── */}
                  <div className="border-t border-gray-100 pt-3 space-y-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                      <Edit3 className="h-3 w-3" />Caption &amp; Hashtags
                    </p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Caption</label>
                        <textarea
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none bg-gray-50 focus:bg-white transition-colors"
                          rows={4}
                          placeholder="Enter caption for this post…"
                          value={captionDraft}
                          onChange={e => setCaptionDraft(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide block mb-1">Hashtags</label>
                        <textarea
                          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none bg-gray-50 focus:bg-white transition-colors"
                          rows={2}
                          placeholder="#hashtag1 #hashtag2 …"
                          value={hashtagsDraft}
                          onChange={e => setHashtagsDraft(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={handleSaveCaptionHashtags}
                        disabled={savingCaption}
                        className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {savingCaption
                          ? <><div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</>
                          : <><Check className="h-3.5 w-3.5" />Save Caption &amp; Hashtags</>}
                      </button>
                    </div>
                  </div>

                  {activeVersion.approvalNotes && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Approval Notes</p>
                      <p className="text-xs text-gray-700 bg-green-50 rounded-lg p-2 border border-green-100">{activeVersion.approvalNotes}</p>
                    </div>
                  )}
                  {activeVersion.rejectionReason && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Revision Notes</p>
                      <p className="text-xs text-gray-700 bg-orange-50 rounded-lg p-2 border border-orange-100">{activeVersion.rejectionReason}</p>
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

function SidebarRow({ icon: Icon, label, value, color = 'text-gray-800' }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
        <div className={`text-sm font-medium ${color} break-all`}>{value}</div>
      </div>
    </div>
  );
}

// ─── Media Preview (card thumbnail) ───────────────────────────────────────────
function MediaPreview({ images }) {
  const items = normalizeMedia(images);
  if (!items.length) {
    return (
      <div className="h-40 bg-gray-100 flex items-center justify-center rounded-t-xl">
        <Image className="h-8 w-8 text-gray-300" />
      </div>
    );
  }
  const first = items[0];
  return (
    <div className="relative h-40 bg-gray-100 rounded-t-xl overflow-hidden">
      {isVideoUrl(first.url) ? (
        <>
          <video src={first.url} className="w-full h-full object-cover" muted preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="h-8 w-8 text-white" />
          </div>
        </>
      ) : (
        <img src={first.url} alt="submission" className="w-full h-full object-cover" loading="lazy" />
      )}
      {items.length > 1 && (
        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
          +{items.length - 1} more
        </span>
      )}
    </div>
  );
}

// ─── Submission Card ───────────────────────────────────────────────────────────
function SubmissionCard({ submission, onView, onDelete }) {
  const statusCfg = getStatusConfig(submission.status);
  const commentCount = Array.isArray(submission.comments) ? submission.comments.length : 0;
  const versionCount = submission.allVersions?.length || 1;
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <div className="relative">
        <MediaPreview images={submission.images} />
        {versionCount > 1 && (
          <span className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
            v{versionCount}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-600 text-white rounded-lg transition-colors"
          title="Delete submission"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
          <div className="flex items-center gap-1.5">
            {versionCount > 1 && (
              <span className="text-[10px] text-blue-500 font-medium">{versionCount} versions</span>
            )}
            {commentCount > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-400">
                <MessageSquare className="h-3 w-3" />{commentCount}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <User className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{submission.created_by || 'Unknown creator'}</span>
        </div>

        {submission.customer_name && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600">
            <User className="h-3 w-3 flex-shrink-0 text-blue-400" />
            <span className="truncate">{submission.customer_name}</span>
          </div>
        )}

        {submission.calendar_name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{submission.calendar_name}</span>
          </div>
        )}

        {submission.item_name && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <FileText className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{submission.item_name}</span>
          </div>
        )}

        {submission.caption && (
          <p className="text-xs text-gray-600 line-clamp-2">{submission.caption}</p>
        )}

        <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-auto pt-1 border-t border-gray-100">
          <Clock className="h-3 w-3" />
          <span>{fmtDate(submission.sent_to_admin_at || submission.created_at)}</span>
        </div>

        <button
          onClick={onView}
          className="w-full py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <Eye className="h-3.5 w-3.5" /> Review &amp; Comment
        </button>
        {confirmDelete && (
          <div className="mt-1 p-2.5 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs font-medium text-red-700 mb-2">Delete this submission?</p>
            <div className="flex gap-2">
              <button
                onClick={() => { onDelete(submission); setConfirmDelete(false); }}
                className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-50"
              >
                Cancel
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
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [reviewSubmission, setReviewSubmission] = useState(null);

  const fetchSubmissions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
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
    } catch { }
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
    all: submissions.length,
    submitted: submissions.filter(s => s.status === 'submitted').length,
    approved: submissions.filter(s => s.status === 'approved').length,
    revision_requested: submissions.filter(s => s.status === 'revision_requested').length,
  };

  if (loading) {
    const loadingContent = (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
          { key: 'all', label: 'All' },
          { key: 'submitted', label: 'Pending Review' },
          { key: 'approved', label: 'Approved' },
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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

