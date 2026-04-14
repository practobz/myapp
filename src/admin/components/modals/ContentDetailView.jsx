import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  Send, Image, FileText, MessageSquare, Calendar, ChevronLeft, ChevronRight,
  Trash2, Check, X, CornerDownRight, UserCog, User, MessageCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

// ── Author badge ──────────────────────────────────────────────────────────────
const AuthorBadge = ({ comment }) => {
  const isAdmin = comment.authorRole === 'admin';
  return (
    <div className="flex items-center gap-1 mb-1">
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
    </div>
  );
};

// ── Comment Marker (pin on media) ─────────────────────────────────────────────
const CommentMarker = memo(({
  comment, index, active, hovered,
  onToggle, onHover, onLeave,
  onChange, onSubmit, onCancel,
  onDelete, onMarkDone,
  replyingTo, replyText, onStartReply, onReplyTextChange, onReplySubmit, onCancelReply,
  adminUser,
}) => {
  const isAdmin = comment.authorRole === 'admin';
  const dotBg   = isAdmin ? '#7c3aed' : (comment.done ? '#10b981' : '#ef4444');
  const dotBorder = isAdmin ? '#a78bfa' : '#fff';
  const isReplying = replyingTo === comment.id;

  // Popup left/right: flip when pin is in right half of image
  const imgEl = document.querySelector('img[data-cdv-media]') || document.querySelector('video[data-cdv-media]');
  const cx = comment.x || comment.position?.x || 0;
  const popupLeft = cx > (imgEl?.offsetWidth || 500) / 2 ? 'auto' : 40;
  const popupRight = cx > (imgEl?.offsetWidth || 500) / 2 ? 40 : 'auto';

  const popupStyle = {
    position: 'absolute', left: popupLeft, right: popupRight,
    top: '50%', transform: 'translateY(-50%)',
    background: '#fff', borderRadius: '10px', padding: '12px',
    minWidth: '240px', maxWidth: '290px', zIndex: 40,
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: (comment.y || comment.position?.y || 0) - 12,
        left: (comment.x || comment.position?.x || 0) - 12,
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
          <p className="text-xs font-medium text-gray-900 leading-relaxed break-words">
            {comment.message || comment.comment}
            {comment.done && <span className="ml-1.5 text-green-600 text-[10px]">✓</span>}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">
            {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
          </p>

          {/* Existing admin reply */}
          {comment.adminReply && (
            <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-1 mb-0.5">
                <UserCog className="h-2.5 w-2.5 text-purple-600" />
                <span className="text-[10px] font-bold text-purple-700">{comment.adminReply.adminName || 'Admin'}</span>
                {comment.adminReply.adminEmail && (
                  <span className="text-[9px] text-gray-400 truncate max-w-[90px]">{comment.adminReply.adminEmail}</span>
                )}
              </div>
              <p className="text-xs text-gray-800 break-words">{comment.adminReply.text}</p>
            </div>
          )}

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
              {!isAdmin && !comment.adminReply && (
                <button className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-purple-50 text-purple-700 rounded-md font-medium hover:bg-purple-100"
                  onClick={(e) => { e.stopPropagation(); onStartReply(comment.id); }}>
                  <CornerDownRight className="h-2.5 w-2.5" />Reply
                </button>
              )}
              {!comment.done && (
                <button className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-green-50 text-green-700 rounded-md hover:bg-green-100"
                  onClick={(e) => { e.stopPropagation(); onMarkDone(comment.id); }}>
                  <Check className="h-2.5 w-2.5" />Done
                </button>
              )}
              <button className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-red-50 text-red-500 rounded-md hover:bg-red-100 ml-auto"
                onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}>
                <Trash2 className="h-2.5 w-2.5" />
              </button>
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
}) {
  // ── Admin user from localStorage ─────────────────────────────────────────
  const adminUser = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u || { name: 'Admin', email: '' };
    } catch { return { name: 'Admin', email: '' }; }
  }, []);

  // ── Core UI state ────────────────────────────────────────────────────────
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);
  const [addingComment, setAddingComment] = useState(false);

  // ── Reply state ──────────────────────────────────────────────────────────
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [savingReply, setSavingReply] = useState(false);

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
      case 'facebook':  return 'bg-blue-100 text-blue-800';
      case 'instagram': return 'bg-pink-100 text-pink-800';
      case 'youtube':   return 'bg-red-100 text-red-800';
      case 'linkedin':  return 'bg-blue-50 text-blue-800';
      case 'twitter':   return 'bg-sky-100 text-sky-800';
      case 'tiktok':    return 'bg-black text-white';
      default:          return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // ── Sync comments when content/version changes ───────────────────────────
  useEffect(() => {
    if (selectedContent?.versions?.length) {
      setSelectedVersionIndex(selectedContent.versions.length - 1);
      setSelectedMediaIndex(0);
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

  // ── Image click → place new marker ──────────────────────────────────────
  const handleImageClick = useCallback((e) => {
    if (!addingComment) return;
    if (commentsForCurrentMedia.some(c => c.editing)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newComment = {
      id: uuidv4(),
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
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
    };
    setCommentsForVersion(prev => [...prev, newComment]);
    setActiveComment(newComment.id);
    setAddingComment(false);
  }, [addingComment, commentsForCurrentMedia, adminUser, currentVersion, selectedMediaIndex]);

  const handleCommentChange = useCallback((id, text) => {
    patchCommentLocally(id, { comment: text });
  }, [patchCommentLocally]);

  const handleCommentSubmit = useCallback(async (id) => {
    const comment = commentsForVersion.find(c => c.id === id);
    if (!comment || !comment.comment?.trim()) {
      removeCommentLocally(id);
      setActiveComment(null);
      return;
    }
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
      patchCommentLocally(id, { editing: false, isNew: false });
      setActiveComment(null);
      onRefresh?.();
    } catch (err) {
      console.error('Error saving admin comment:', err);
      patchCommentLocally(id, { editing: false, isNew: false });
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

  const handleDeleteComment = useCallback(async (id) => {
    if (!window.confirm('Delete this comment?')) return;
    removeCommentLocally(id);
    setActiveComment(null);
    try {
      await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      onRefresh?.();
    } catch (err) { console.error('Error deleting comment:', err); }
  }, [selectedContent, removeCommentLocally, onRefresh]);

  // ── Admin reply ──────────────────────────────────────────────────────────
  const handleStartReply = useCallback((commentId) => {
    setReplyingTo(commentId);
    setReplyText('');
    setActiveComment(commentId);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyingTo(null);
    setReplyText('');
  }, []);

  const handleReplySubmit = useCallback(async (commentId) => {
    if (!replyText.trim()) return;
    setSavingReply(true);
    const adminReply = {
      text: replyText.trim(),
      adminName: adminUser?.name || 'Admin',
      adminEmail: adminUser?.email || '',
      timestamp: new Date().toISOString(),
    };
    patchCommentLocally(commentId, { adminReply });
    setReplyingTo(null);
    setReplyText('');
    setActiveComment(null);
    try {
      await fetch(`${API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply }),
      });
      onRefresh?.();
    } catch (err) {
      console.error('Error saving admin reply:', err);
    } finally {
      setSavingReply(false);
    }
  }, [replyText, adminUser, selectedContent, patchCommentLocally, onRefresh]);

  if (!selectedContent) return null;

  const isPublished = selectedContent.published === true || isContentPublished(selectedContent.id, selectedContent);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* ── HEADER ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {(calendarName || itemName) && (
            <div className="flex flex-col sm:flex-row gap-1 sm:gap-3 text-xs">
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

          <div>
            {selectedContent.title && (
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{selectedContent.title}</h1>
            )}
            {selectedContent.description && (
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{selectedContent.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              <div>
                <span className="text-gray-500 block">Customer</span>
                <span className="font-medium text-gray-900">{getCustomerName(selectedContent.customerId)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full" />
              <div>
                <span className="text-gray-500 block">Platform</span>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {parsePlatforms(selectedContent.platform).map((p, i) => (
                    <span key={i} className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${platformColor(p)}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
              <div>
                <span className="text-gray-500 block">Versions</span>
                <span className="font-medium text-gray-900">{selectedContent.totalVersions}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <span className={`inline-flex items-center px-2 py-1.5 rounded-lg text-xs font-medium ${getStatusColor(isPublished ? 'published' : selectedContent.status)}`}>
              {getStatusIcon(isPublished ? 'published' : selectedContent.status)}
              <span className="ml-1">
                {isPublished ? 'Published' : selectedContent.status.replace('_', ' ')}
              </span>
              {isPublished && (
                <span className="ml-1 flex flex-wrap gap-1">
                  {getPublishedPlatformsForContent(selectedContent.id, selectedContent).map((p, idx) => (
                    <span key={idx} className={`px-1 py-0.5 rounded text-[10px] ${platformColor(p)}`}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </span>
                  ))}
                </span>
              )}
            </span>
            <button
              onClick={() => handleScheduleContent(selectedContent)}
              className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Send className="h-3.5 w-3.5 mr-1.5" />
              Post Content
            </button>
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
                      className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                        selectedVersionIndex === idx
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
                          <div className="flex gap-1">
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
                          </div>
                        </div>
                      )}

                      {/* Add Comment toggle */}
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-gray-400">
                          {addingComment
                            ? '📍 Click on the image to pin a comment'
                            : `${commentsForCurrentMedia.length} comment${commentsForCurrentMedia.length !== 1 ? 's' : ''} on this media`}
                        </p>
                        <button
                          onClick={() => setAddingComment(v => !v)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                            addingComment
                              ? 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
                              : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                          }`}
                        >
                          <MessageCircle className="h-3 w-3" />
                          {addingComment ? 'Cancel' : 'Add Comment'}
                        </button>
                      </div>

                      {/* Media + markers */}
                      <div className="flex justify-center">
                        <div className="relative inline-block">
                          {currentMedia?.url && typeof currentMedia.url === 'string' ? (
                            isVideoUrl(currentMedia.url) ? (
                              <video
                                data-cdv-media
                                src={currentMedia.url}
                                controls
                                className="max-w-full h-auto max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] rounded-lg shadow border border-gray-200 object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <img
                                data-cdv-media
                                src={currentMedia.url}
                                alt={`V${currentVersion.versionNumber} M${selectedMediaIndex + 1}`}
                                className={`max-w-full h-auto max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] rounded-lg shadow border border-gray-200 object-contain transition-all ${
                                  addingComment ? 'cursor-crosshair ring-2 ring-purple-400 ring-offset-1' : ''
                                }`}
                                loading="lazy"
                                onClick={handleImageClick}
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
                          {commentsForCurrentMedia.map((comment, index) => (
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
                              replyingTo={replyingTo}
                              replyText={replyText}
                              onStartReply={handleStartReply}
                              onReplyTextChange={setReplyText}
                              onReplySubmit={handleReplySubmit}
                              onCancelReply={handleCancelReply}
                              adminUser={adminUser}
                            />
                          ))}
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
                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Caption</label>
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <p className="text-xs text-gray-900">{currentVersion.caption || 'No caption'}</p>
                      </div>
                    </div>
                    {currentVersion.hashtags && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Hashtags</label>
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                          <p className="text-xs text-gray-900">{currentVersion.hashtags}</p>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                      <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                        <p className="text-xs text-gray-900">{currentVersion.notes || 'No notes'}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <span>Created: {formatDate(currentVersion.createdAt)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(currentVersion.status)}`}>
                        {currentVersion.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Version History + Comments ── */}
        <div className="space-y-3">

          {/* Version History */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200/50 bg-green-50/50">
              <h3 className="text-sm font-bold text-gray-900 flex items-center">
                <FileText className="h-4 w-4 text-green-600 mr-1.5" />
                Version History
              </h3>
            </div>
            <div className="max-h-64 sm:max-h-80 overflow-y-auto">
              {selectedContent.versions.map((version, index) => {
                const fd = new Date(version.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                });
                return (
                  <div className="relative" key={version.id}>
                    <button
                      onClick={() => { setSelectedVersionIndex(index); setSelectedMediaIndex(0); }}
                      className={`w-full text-left px-3 py-2 flex flex-col border-l-2 transition-colors ${
                        selectedVersionIndex === index
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
                    <button
                      className="absolute top-2 right-2 p-1 bg-white rounded-full shadow hover:bg-red-50 transition-colors"
                      title="Delete Version"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this version?')) {
                          onDeleteVersion(version.id, selectedContent.id, selectedContent.customerId);
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

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
                  <span className="text-[9px] text-gray-500">Admin</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[9px] text-gray-500">Customer</span>
                </div>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto p-3">
              {commentsForCurrentMedia.length === 0 ? (
                <div className="text-center py-6">
                  <div className="bg-gray-50 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-xs">No comments yet</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Click "Add Comment" then pin on the image</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {commentsForCurrentMedia.map((comment, idx) => {
                    const isAdminComment = comment.authorRole === 'admin';
                    const isActive = activeComment === comment.id;
                    const isReplying = replyingTo === comment.id;
                    return (
                      <div
                        key={comment.id || idx}
                        className={`rounded-lg border transition-colors overflow-hidden cursor-pointer ${
                          isActive
                            ? isAdminComment ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'
                            : isAdminComment ? 'bg-white border-purple-100 hover:bg-purple-50/40' : 'bg-gray-50 border-gray-200 hover:bg-blue-50/40'
                        }`}
                        onClick={() => setActiveComment(isActive ? null : comment.id)}
                      >
                        <div className="p-2 flex items-start gap-2">
                          {/* Index badge */}
                          <span className={`font-bold rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0 border ${
                            isAdminComment ? 'text-purple-700 bg-purple-100 border-purple-200' : 'text-blue-700 bg-blue-100 border-blue-200'
                          }`}>{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            {/* Author row */}
                            <div className="flex items-center gap-1 mb-0.5 flex-wrap">
                              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                isAdminComment ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {isAdminComment ? <UserCog className="h-2 w-2" /> : <User className="h-2 w-2" />}
                                {isAdminComment ? 'Admin' : 'Customer'}
                              </span>
                              {comment.authorEmail && (
                                <span className="text-[9px] text-gray-400 truncate max-w-[110px]">{comment.authorEmail}</span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-gray-900 break-words">
                              {comment.message || comment.comment}
                              {comment.done && <span className="ml-1.5 text-green-600 text-[10px]">✓</span>}
                            </p>
                            <p className="text-[9px] text-gray-400 mt-0.5">
                              {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                            </p>
                          </div>
                        </div>

                        {/* Existing admin reply */}
                        {comment.adminReply && (
                          <div className="mx-2 mb-2 p-1.5 bg-purple-50 border border-purple-200 rounded-md">
                            <div className="flex items-center gap-1 mb-0.5">
                              <UserCog className="h-2.5 w-2.5 text-purple-600" />
                              <span className="text-[10px] font-bold text-purple-700">{comment.adminReply.adminName || 'Admin'}</span>
                              {comment.adminReply.adminEmail && (
                                <span className="text-[9px] text-gray-400 truncate max-w-[90px]">{comment.adminReply.adminEmail}</span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-700 break-words">{comment.adminReply.text}</p>
                          </div>
                        )}

                        {/* Inline reply textarea */}
                        {!isAdminComment && isReplying && isActive && (
                          <div className="mx-2 mb-2" onClick={(e) => e.stopPropagation()}>
                            <textarea
                              autoFocus
                              className="w-full rounded-lg border border-purple-200 bg-purple-50 text-xs text-gray-900 placeholder-gray-400 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                              rows={2}
                              placeholder="Type admin reply… (Ctrl+Enter to send)"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleReplySubmit(comment.id); }}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex gap-1.5 mt-1">
                              <button
                                className="flex-1 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-semibold disabled:opacity-50"
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

                        {/* Action buttons (when active, not in reply mode) */}
                        {isActive && !isReplying && (
                          <div className="flex items-center gap-1 px-2 pb-2" onClick={(e) => e.stopPropagation()}>
                            {!isAdminComment && !comment.adminReply && (
                              <button
                                className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-purple-50 text-purple-700 border border-purple-200 rounded-md font-medium hover:bg-purple-100 transition-colors"
                                onClick={(e) => { e.stopPropagation(); handleStartReply(comment.id); }}
                              >
                                <CornerDownRight className="h-2.5 w-2.5" />Reply
                              </button>
                            )}
                            {!comment.done && (
                              <button
                                className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-green-50 text-green-700 border border-green-200 rounded-md hover:bg-green-100 transition-colors"
                                onClick={(e) => { e.stopPropagation(); handleMarkDone(comment.id); }}
                              >
                                <Check className="h-2.5 w-2.5" />Done
                              </button>
                            )}
                            <button
                              className="flex items-center gap-0.5 px-2 py-0.5 text-[10px] bg-red-50 text-red-500 border border-red-200 rounded-md hover:bg-red-100 transition-colors ml-auto"
                              onClick={(e) => { e.stopPropagation(); handleDeleteComment(comment.id); }}
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
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