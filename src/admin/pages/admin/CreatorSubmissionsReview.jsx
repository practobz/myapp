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
  submitted:          { label: 'Pending Review',     color: 'bg-amber-100  text-amber-700  border-amber-200'  },
  approved:           { label: 'Approved',           color: 'bg-green-100  text-green-700  border-green-200'  },
  revision_requested: { label: 'Revision Requested', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  rejected:           { label: 'Rejected',           color: 'bg-red-100    text-red-700    border-red-200'    },
};

const getStatusConfig = (status) =>
  STATUS_CONFIG[status] || { label: status || 'Unknown', color: 'bg-gray-100 text-gray-700 border-gray-200' };

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
    danger:  'bg-red-500   hover:bg-red-600   text-white',
    info:    'bg-cyan-500  hover:bg-cyan-600  text-white',
    ghost:   'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50',
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

  const pinColor = comment.done        ? '#10b981'
    : comment.repositioning            ? '#8b5cf6'
    : comment.editing                  ? '#3b82f6'
    :                                    '#ef4444';

  const popupLeft  = x > 150 ? 'auto' : 30;
  const popupRight = x > 150 ? 30    : 'auto';

  return (
    <div
      style={{
        position: 'absolute',
        top: y - 12, left: x - 12,
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
function ReviewPanel({ submission, onClose, onStatusUpdated }) {
  const mediaItems = normalizeMedia(submission.images);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);

  const [comments, setComments] = useState(() => normalizeComments(submission.comments));
  const [commentsForMedia, setCommentsForMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);

  const [approving, setApproving]          = useState(false);
  const [revising, setRevising]            = useState(false);
  const [revisionNotes, setRevisionNotes]  = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);

  const [localStatus, setLocalStatus] = useState(submission.status);
  const [toast, setToast]             = useState(null);
  const [sidebarTab, setSidebarTab]   = useState('comments');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

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
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
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
              versionId: submission._id,
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

  const handleActivate = (id) => setActiveComment(prev => prev === id ? null : id);

  // ── Status actions ──
  const handleApprove = async () => {
    setApproving(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(submission._id)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId: submission._id, status: 'approved' }),
        }
      );
      if (!res.ok) throw new Error();
      setLocalStatus('approved');
      showToast('Submission approved. Creator notified by email.');
      onStatusUpdated(submission._id, 'approved');
    } catch {
      showToast('Failed to approve. Please try again.', 'error');
    } finally { setApproving(false); }
  };

  const handleRevision = async () => {
    if (!revisionNotes.trim()) return;
    setRevising(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(submission._id)}/status`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ versionId: submission._id, status: 'revision_requested', rejectionReason: revisionNotes.trim() }),
        }
      );
      if (!res.ok) throw new Error();
      setLocalStatus('revision_requested');
      setShowRevisionInput(false);
      setRevisionNotes('');
      showToast('Revision requested. Creator notified by email.');
      onStatusUpdated(submission._id, 'revision_requested');
    } catch {
      showToast('Failed to send revision request.', 'error');
    } finally { setRevising(false); }
  };

  // Derived
  const statusCfg   = getStatusConfig(localStatus);
  const currentMedia = mediaItems[activeMediaIdx];
  const totalComments = comments.length;
  const openComments  = comments.filter(c => !c.done).length;

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

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Media area ── */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 p-4 gap-4 items-center">

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
              <div className="relative inline-block">
                {isVideoUrl(currentMedia.url) ? (
                  <video
                    src={currentMedia.url}
                    controls
                    className="max-w-full h-auto max-h-[60vh] rounded-xl shadow-lg border border-gray-200 object-contain cursor-crosshair"
                    onClick={handleImageClickWithReposition}
                  />
                ) : (
                  <img
                    src={currentMedia.url}
                    alt="media"
                    className="max-w-full h-auto max-h-[60vh] rounded-xl shadow-lg border border-gray-200 object-contain cursor-crosshair"
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
                    className={`w-14 h-14 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0 ${
                      i === activeMediaIdx ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    {isVideoUrl(m.url)
                      ? <div className="w-full h-full bg-gray-200 flex items-center justify-center"><Play className="h-4 w-4 text-gray-500" /></div>
                      : <img src={m.url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </button>
                ))}
              </div>
            )}

            {/* Caption / Notes */}
            {(submission.caption || submission.notes) && (
              <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                {submission.caption && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Caption</p>
                    <div className="bg-white rounded-xl p-3 border border-gray-200 text-sm text-gray-700 leading-relaxed">{submission.caption}</div>
                  </div>
                )}
                {submission.notes && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Notes for Admin</p>
                    <div className="bg-white rounded-xl p-3 border border-gray-200 text-sm text-gray-700 leading-relaxed">{submission.notes}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── RIGHT: Sidebar ── */}
          <div className="w-80 xl:w-96 flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">

            {/* Action area */}
            <div className="p-4 border-b border-gray-100 space-y-2 flex-shrink-0">
              {localStatus === 'submitted' && !showRevisionInput && (
                <div className="flex gap-2">
                  <button onClick={handleApprove} disabled={approving}
                    className="flex-1 py-2.5 bg-green-500 text-white rounded-xl text-sm font-semibold hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                    {approving
                      ? <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Approving...</>
                      : <><CheckCircle className="h-4 w-4" />Approve</>}
                  </button>
                  <button onClick={() => setShowRevisionInput(true)}
                    className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors flex items-center justify-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />Request Revision
                  </button>
                </div>
              )}

              {localStatus === 'submitted' && showRevisionInput && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-700">Describe the revisions needed:</p>
                  <textarea
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 resize-none"
                    rows={3}
                    placeholder="e.g. Please change the caption and replace image 2..."
                    value={revisionNotes}
                    onChange={e => setRevisionNotes(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleRevision} disabled={revising || !revisionNotes.trim()}
                      className="flex-1 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
                      {revising ? 'Sending...' : <><Send className="h-3.5 w-3.5" />Send Request</>}
                    </button>
                    <button onClick={() => { setShowRevisionInput(false); setRevisionNotes(''); }}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-sm hover:bg-gray-50">Cancel</button>
                  </div>
                </div>
              )}

              {localStatus === 'approved' && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-200">
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-green-800">Approved</p>
                    <p className="text-xs text-green-600">Creator has been notified</p>
                  </div>
                </div>
              )}

              {localStatus === 'revision_requested' && (
                <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl border border-orange-200">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-orange-800">Revision Requested</p>
                    <p className="text-xs text-orange-600">Creator has been notified</p>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 flex-shrink-0">
              {[
                { key: 'comments', label: 'Comments', count: totalComments },
                { key: 'details',  label: 'Details',  count: null },
              ].map(tab => (
                <button key={tab.key} onClick={() => setSidebarTab(tab.key)}
                  className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
                    sidebarTab === tab.key
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
                                className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                                  i === activeMediaIdx ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                              className={`rounded-xl cursor-pointer transition-all border overflow-hidden ${
                                activeComment === comment.id
                                  ? 'bg-blue-50 border-blue-200 shadow-sm'
                                  : 'bg-white border-gray-100 hover:bg-gray-50'
                              }`}>
                              <div className="p-2.5 flex items-start gap-2">
                                <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center flex-shrink-0 ${
                                  comment.done ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
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
                  <SidebarRow icon={User}     label="Creator"   value={submission.created_by} />
                  <SidebarRow icon={User}     label="Customer"  value={submission.customer_name} color="text-blue-600" />
                  <SidebarRow icon={Calendar} label="Calendar"  value={submission.calendar_name} />
                  <SidebarRow icon={FileText} label="Item"      value={submission.item_name} />
                  <SidebarRow icon={Clock}    label="Submitted" value={fmtDate(submission.sent_to_admin_at || submission.created_at)} />
                  <SidebarRow icon={FileText} label="Platform"  value={submission.platform} />
                  {Array.isArray(submission.notify_admins) && submission.notify_admins.length > 0 && (
                    <SidebarRow icon={User} label="Notified Admins"
                      value={submission.notify_admins.map(a => a.name || a.email).join(', ')} />
                  )}
                  {submission.hashtags && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Hashtags</p>
                      <p className="text-xs text-blue-500 break-all">{submission.hashtags}</p>
                    </div>
                  )}
                  {submission.approvalNotes && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Approval Notes</p>
                      <p className="text-xs text-gray-700 bg-green-50 rounded-lg p-2 border border-green-100">{submission.approvalNotes}</p>
                    </div>
                  )}
                  {submission.rejectionReason && (
                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Revision Notes</p>
                      <p className="text-xs text-gray-700 bg-orange-50 rounded-lg p-2 border border-orange-100">{submission.rejectionReason}</p>
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
function SubmissionCard({ submission, onView }) {
  const statusCfg    = getStatusConfig(submission.status);
  const commentCount = Array.isArray(submission.comments) ? submission.comments.length : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      <MediaPreview images={submission.images} />

      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
            {statusCfg.label}
          </span>
          {commentCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-gray-400">
              <MessageSquare className="h-3 w-3" />{commentCount}
            </span>
          )}
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
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CreatorSubmissionsReview() {
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
        ? data.filter(s => s.submission_stage === 'admin_review')
        : [];
      adminReview.sort((a, b) =>
        new Date(b.sent_to_admin_at || b.created_at) - new Date(a.sent_to_admin_at || a.created_at)
      );
      setSubmissions(adminReview);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  const handleStatusUpdated = (submissionId, newStatus) => {
    setSubmissions(prev => prev.map(s => s._id === submissionId ? { ...s, status: newStatus } : s));
    setReviewSubmission(prev => prev?._id === submissionId ? { ...prev, status: newStatus } : prev);
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
    return (
      <AdminLayout title="Creator Submissions Review">
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
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Creator Submissions Review">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(submission => (
              <SubmissionCard
                key={submission._id}
                submission={submission}
                onView={() => setReviewSubmission(submission)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Full-screen review panel */}
      {reviewSubmission && (
        <ReviewPanel
          submission={reviewSubmission}
          onClose={() => setReviewSubmission(null)}
          onStatusUpdated={handleStatusUpdated}
        />
      )}
    </AdminLayout>
  );
}

