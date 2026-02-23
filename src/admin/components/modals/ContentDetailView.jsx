import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { 
  Send, Image, FileText, MessageSquare, Calendar, ChevronLeft, ChevronRight,
  Play, Trash2
} from 'lucide-react';

// Memoized Comment Marker Component
const CommentMarker = memo(({ comment, index, onToggle, active, hovered, onHover, onLeave, getBoxPosition }) => {
  const { left, right } = getBoxPosition(comment);
  
  return (
    <div
      style={{
        position: "absolute",
        top: (comment.y || comment.position?.y || 0) - 12,
        left: (comment.x || comment.position?.x || 0) - 12,
        width: 24,
        height: 24,
        background: comment.done ? "#10b981" : "#ef4444",
        color: "#fff",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: "bold",
        fontSize: "11px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        cursor: "pointer",
        zIndex: 10,
        border: "2px solid #fff",
        transition: "all 0.2s",
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {index + 1}
      
      {(active || hovered) && (
        <div
          style={{
            position: "absolute",
            left: left,
            right: right,
            top: "50%",
            transform: "translateY(-50%)",
            background: "#fff",
            border: "2px solid #3b82f6",
            borderRadius: "8px",
            padding: "12px",
            minWidth: "240px",
            maxWidth: "280px",
            zIndex: 20,
            boxShadow: "0 4px 16px rgba(59,130,246,0.2)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="font-medium text-gray-900 text-xs leading-relaxed break-words">
            {comment.message || comment.comment}
            {comment.done && <span className="text-green-600 ml-2">✓</span>}
          </p>
          <p className="text-[10px] text-gray-500 mt-1">
            {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
          </p>
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
  onDeleteVersion
}) {
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);

  // Memoized platform parsing
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
    switch((p||'').toLowerCase()){
      case 'facebook': return 'bg-blue-100 text-blue-800';
      case 'instagram': return 'bg-pink-100 text-pink-800';
      case 'youtube': return 'bg-red-100 text-red-800';
      case 'linkedin': return 'bg-blue-50 text-blue-800';
      case 'twitter': return 'bg-sky-100 text-sky-800';
      case 'tiktok': return 'bg-black text-white';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getBoxPosition = useCallback((comment) => {
    let boxLeft = 40;
    let boxRight = "auto";
    const mediaElement = document.querySelector('img[alt*="Version"], video');
    if (mediaElement && mediaElement.width && (comment.x || comment.position?.x) > mediaElement.width / 2) {
      boxLeft = "auto";
      boxRight = 40;
    }
    return { left: boxLeft, right: boxRight };
  }, []);

  useEffect(() => {
    if (selectedContent?.versions?.length) {
      setSelectedVersionIndex(selectedContent.versions.length - 1);
      setSelectedMediaIndex(0);
    }
  }, [selectedContent]);

  useEffect(() => {
    if (selectedContent?.versions?.[selectedVersionIndex]) {
      setCommentsForVersion(selectedContent.versions[selectedVersionIndex].comments || []);
    } else {
      setCommentsForVersion([]);
    }
  }, [selectedContent, selectedVersionIndex]);

  useEffect(() => {
    const filteredComments = commentsForVersion.filter(comment => {
      const commentMediaIndex = comment.mediaIndex !== undefined ? comment.mediaIndex : 0;
      return commentMediaIndex === selectedMediaIndex;
    });
    setCommentsForCurrentMedia(filteredComments);
  }, [commentsForVersion, selectedMediaIndex]);

  const currentVersion = useMemo(() => 
    selectedContent?.versions?.[selectedVersionIndex], 
    [selectedContent, selectedVersionIndex]
  );

  const currentMedia = useMemo(() => 
    currentVersion?.media?.[selectedMediaIndex], 
    [currentVersion, selectedMediaIndex]
  );

  if (!selectedContent) return null;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Compact Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          {/* Calendar/Item Info */}
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
          
          {/* Title & Customer Info */}
          <div>
            {selectedContent.title && (
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">{selectedContent.title}</h1>
            )}
            {selectedContent.description && (
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{selectedContent.description}</p>
            )}
          </div>
          
          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <div>
                <span className="text-gray-500 block">Customer</span>
                <span className="font-medium text-gray-900">{getCustomerName(selectedContent.customerId)}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-cyan-600 rounded-full"></div>
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
              <div className="w-1.5 h-1.5 bg-blue-600 rounded-full"></div>
              <div>
                <span className="text-gray-500 block">Versions</span>
                <span className="font-medium text-gray-900">{selectedContent.totalVersions}</span>
              </div>
            </div>
          </div>

          {/* Status & Action */}
          <div className="flex flex-col sm:flex-row gap-2">
            <span className={`inline-flex items-center px-2 py-1.5 rounded-lg text-xs font-medium ${
              getStatusColor((selectedContent.published === true || isContentPublished(selectedContent.id, selectedContent)) ? 'published' : selectedContent.status)
            }`}>
              {getStatusIcon((selectedContent.published === true || isContentPublished(selectedContent.id, selectedContent)) ? 'published' : selectedContent.status)}
              <span className="ml-1">
                {(selectedContent.published === true || isContentPublished(selectedContent.id, selectedContent)) ? 'Published' : selectedContent.status.replace('_', ' ')}
              </span>
              {(selectedContent.published === true || isContentPublished(selectedContent.id, selectedContent)) && (
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Version Display - Takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
            {/* Header */}
            <div className="px-3 py-2 sm:px-4 sm:py-3 border-b border-gray-200/50 bg-blue-50/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 flex items-center">
                  <Image className="h-4 w-4 text-blue-600 mr-1.5" />
                  Version {currentVersion?.versionNumber}
                  <span className="ml-1.5 text-xs font-normal text-gray-600">
                    / {selectedContent.totalVersions}
                  </span>
                </h3>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      if (selectedVersionIndex > 0) {
                        setSelectedVersionIndex(selectedVersionIndex - 1);
                        setSelectedMediaIndex(0);
                      }
                    }}
                    disabled={selectedVersionIndex === 0}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => {
                      if (selectedVersionIndex < selectedContent.versions.length - 1) {
                        setSelectedVersionIndex(selectedVersionIndex + 1);
                        setSelectedMediaIndex(0);
                      }
                    }}
                    disabled={selectedVersionIndex === selectedContent.versions.length - 1}
                    className="p-1.5 rounded-lg bg-white border border-gray-200 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-blue-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-3 sm:p-4">
              {currentVersion && (
                <div className="space-y-3">
                  {/* Media Display */}
                  {currentVersion.media?.length > 0 ? (
                    <>
                      {/* Media Navigation */}
                      {currentVersion.media.length > 1 && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-600">
                            {selectedMediaIndex + 1} / {currentVersion.media.length}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => selectedMediaIndex > 0 && setSelectedMediaIndex(selectedMediaIndex - 1)}
                              disabled={selectedMediaIndex === 0}
                              className="p-1.5 rounded-lg bg-blue-50 border border-gray-200 hover:bg-white disabled:opacity-50 transition-colors"
                            >
                              <ChevronLeft className="h-3.5 w-3.5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => selectedMediaIndex < currentVersion.media.length - 1 && setSelectedMediaIndex(selectedMediaIndex + 1)}
                              disabled={selectedMediaIndex === currentVersion.media.length - 1}
                              className="p-1.5 rounded-lg bg-blue-50 border border-gray-200 hover:bg-white disabled:opacity-50 transition-colors"
                            >
                              <ChevronRight className="h-3.5 w-3.5 text-blue-600" />
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {/* Media Item */}
                      <div className="flex justify-center">
                        <div 
                          className="relative inline-block"
                          style={{ position: 'relative' }}
                        >
                          {currentMedia?.url && typeof currentMedia.url === 'string' ? (
                            isVideoUrl(currentMedia.url) ? (
                              <video
                                src={currentMedia.url}
                                controls
                                className="max-w-full h-auto max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] rounded-lg shadow border border-gray-200 object-contain"
                                loading="lazy"
                              />
                            ) : (
                              <img
                                src={currentMedia.url}
                                alt={`V${currentVersion.versionNumber} M${selectedMediaIndex + 1}`}
                                className="max-w-full h-auto max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] rounded-lg shadow border border-gray-200 object-contain"
                                loading="lazy"
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
                              getBoxPosition={getBoxPosition}
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

                  {/* Caption & Details */}
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

        {/* Right Side: Version History and Comments */}
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
                const versionDate = new Date(version.createdAt);
                const formattedDate = versionDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                return (
                  <div className="relative" key={version.id}>
                    <button
                      onClick={() => {
                        setSelectedVersionIndex(index);
                        setSelectedMediaIndex(0);
                      }}
                      className={`w-full text-left px-3 py-2 flex flex-col border-l-2 transition-colors ${
                        selectedVersionIndex === index
                          ? "bg-purple-50 border-l-purple-600"
                          : "bg-white border-l-transparent hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 text-xs">
                          V{version.versionNumber}
                        </span>
                        {selectedVersionIndex === index && (
                          <span className="text-[10px] font-medium text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center text-[10px] text-gray-500 gap-2 mt-0.5">
                        <span className="flex items-center">
                          <Calendar className="h-2.5 w-2.5 mr-0.5" />
                          {formattedDate}
                        </span>
                        {version.media?.length > 0 && (
                          <span className="flex items-center">
                            <Image className="h-2.5 w-2.5 mr-0.5" />
                            {version.media.length}
                          </span>
                        )}
                        {version.comments?.length > 0 && (
                          <span className="flex items-center">
                            <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
                            {version.comments.length}
                          </span>
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

          {/* Comments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-200/50 bg-blue-50/50">
              <h3 className="text-sm font-bold text-gray-900 flex items-center">
                <MessageSquare className="h-4 w-4 text-blue-600 mr-1.5" />
                Comments ({commentsForCurrentMedia.length})
              </h3>
            </div>
            <div className="max-h-64 overflow-y-auto p-3">
              {commentsForCurrentMedia.length === 0 ? (
                <div className="text-center py-6">
                  <div className="bg-gray-50 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                    <MessageSquare className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-xs">No comments</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {commentsForCurrentMedia.map((comment, idx) => (
                    <div 
                      key={comment.id || idx} 
                      className={`p-2 rounded-lg border cursor-pointer transition-colors ${
                        activeComment === comment.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 hover:bg-blue-50/50 border-gray-200 hover:border-blue-200/50'
                      }`} 
                      onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-bold text-blue-600 bg-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] flex-shrink-0 border border-gray-200">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 break-words">
                            {comment.message || comment.comment}
                            {comment.done && (
                              <span className="ml-1.5 text-blue-600 text-[10px] font-semibold">✓</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
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
      </div>
    </div>
  );
}

export default memo(ContentDetailView);