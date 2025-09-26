import React, { useState, useEffect } from 'react';
import { 
  Send, Image, FileText, MessageSquare, Calendar, ChevronLeft, ChevronRight,
  Play, Video
} from 'lucide-react';

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
  calendarName, // <-- add prop
  itemName      // <-- add prop
}) {
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);

  useEffect(() => {
    if (selectedContent) {
      setSelectedVersionIndex(selectedContent.versions.length - 1);
      setSelectedMediaIndex(0);
    }
  }, [selectedContent]);

  useEffect(() => {
    if (selectedContent && selectedContent.versions && selectedContent.versions[selectedVersionIndex]) {
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

  if (!selectedContent) return null;

  return (
    <div className="space-y-8">
      <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="flex-1">
            {/* --- Show calendar and item name at the top --- */}
            {calendarName && (
              <div className="mb-2 text-xs text-gray-500">
                <span className="font-semibold text-blue-700">Calendar:</span> {calendarName}
              </div>
            )}
            {itemName && (
              <div className="mb-2 text-xs text-gray-500">
                <span className="font-semibold text-purple-700">Item:</span> {itemName}
              </div>
            )}
            {/* --- End calendar/item name --- */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedContent.title}</h1>
            <p className="text-gray-600 mb-4">{selectedContent.description}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Customer</span>
                  <p className="text-sm text-gray-900 font-semibold">{getCustomerName(selectedContent.customerId)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Platform</span>
                  <p className="text-sm text-gray-900">{selectedContent.platform}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Total Versions</span>
                  <p className="text-sm text-gray-900">{selectedContent.totalVersions}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {/* Status display logic update */}
            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${
              getStatusColor(
                isContentPublished(selectedContent.id)
                  ? 'published'
                  : selectedContent.status
              )
            }`}>
              {getStatusIcon(
                isContentPublished(selectedContent.id)
                  ? 'published'
                  : selectedContent.status
              )}
              <span className="ml-2">
                {isContentPublished(selectedContent.id)
                  ? 'PUBLISHED'
                  : selectedContent.status.replace('_', ' ').toUpperCase()
                }
              </span>
              {isContentPublished(selectedContent.id) && (
                <span className="ml-2 text-xs text-blue-600">
                  {getPublishedPlatformsForContent(selectedContent.id).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                </span>
              )}
            </span>
            
            <button
              onClick={() => handleScheduleContent(selectedContent)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200"
            >
              <Send className="h-5 w-5 mr-2" />
              Post Content
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Version Display */}
        <div className="xl:col-span-2">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <Image className="h-5 w-5 text-purple-600 mr-2" />
                  Version {selectedContent.versions[selectedVersionIndex]?.versionNumber}
                  <span className="ml-2 text-sm font-normal text-gray-500">
                    of {selectedContent.totalVersions}
                  </span>
                </h3>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      if (selectedVersionIndex > 0) {
                        setSelectedVersionIndex(selectedVersionIndex - 1);
                        setSelectedMediaIndex(0);
                      }
                    }}
                    disabled={selectedVersionIndex === 0}
                    className="p-2 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (selectedVersionIndex < selectedContent.versions.length - 1) {
                        setSelectedVersionIndex(selectedVersionIndex + 1);
                        setSelectedMediaIndex(0);
                      }
                    }}
                    disabled={selectedVersionIndex === selectedContent.versions.length - 1}
                    className="p-2 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6">
              {selectedContent.versions[selectedVersionIndex] && (
                <div className="space-y-6">
                  {/* Media Display */}
                  <div className="text-center">
                    {selectedContent.versions[selectedVersionIndex].media && selectedContent.versions[selectedVersionIndex].media.length > 0 ? (
                      <div className="relative">
                        {/* Media Navigation for multiple items */}
                        {selectedContent.versions[selectedVersionIndex].media.length > 1 && (
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm text-gray-500">
                              {selectedMediaIndex + 1} of {selectedContent.versions[selectedVersionIndex].media.length}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  if (selectedMediaIndex > 0) {
                                    setSelectedMediaIndex(selectedMediaIndex - 1);
                                  }
                                }}
                                disabled={selectedMediaIndex === 0}
                                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (selectedMediaIndex < selectedContent.versions[selectedVersionIndex].media.length - 1) {
                                    setSelectedMediaIndex(selectedMediaIndex + 1);
                                  }
                                }}
                                disabled={selectedMediaIndex === selectedContent.versions[selectedVersionIndex].media.length - 1}
                                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Current Media Item */}
                        {selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex] && 
                         selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url &&
                         typeof selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url === 'string' ? (
                          isVideoUrl(selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url) ? (
                            <video
                              src={selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url}
                              controls
                              className="max-w-full h-auto max-h-96 mx-auto rounded-xl shadow-lg border border-gray-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <img
                              src={selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url}
                              alt={`Version ${selectedContent.versions[selectedVersionIndex].versionNumber} - Media ${selectedMediaIndex + 1}`}
                              className="max-w-full h-auto max-h-96 mx-auto rounded-xl shadow-lg border border-gray-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          )
                        ) : null}
                        
                        {/* Fallback for invalid/missing media */}
                        <div 
                          className="max-w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center"
                          style={{ 
                            display: (selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex]?.url && 
                                     typeof selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url === 'string') 
                              ? 'none' : 'flex' 
                          }}
                        >
                          <div className="text-center">
                            <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-500">Media unavailable</p>
                          </div>
                        </div>

                        {/* Comment Markers */}
                        {commentsForCurrentMedia.map((comment, index) => {
                          let boxLeft = 40;
                          let boxRight = "auto";
                          const mediaElement = document.querySelector(`img[alt*="Version ${selectedContent.versions[selectedVersionIndex].versionNumber}"], video`);
                          if (mediaElement && mediaElement.width && (comment.x || comment.position?.x) > mediaElement.width / 2) {
                            boxLeft = "auto";
                            boxRight = 40;
                          }

                          const commentX = comment.x || comment.position?.x || 0;
                          const commentY = comment.y || comment.position?.y || 0;

                          return (
                            <div
                              key={comment.id}
                              style={{
                                position: "absolute",
                                top: commentY - 16,
                                left: commentX - 16,
                                width: 32,
                                height: 32,
                                background: comment.done ? "#10b981" : "#ef4444",
                                color: "#fff",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: "bold",
                                fontSize: "14px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                                cursor: "pointer",
                                zIndex: 2,
                                border: "3px solid #fff",
                                transition: "all 0.3s",
                              }}
                              onMouseEnter={() => setHoveredComment(comment.id)}
                              onMouseLeave={() => setHoveredComment(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveComment(activeComment === comment.id ? null : comment.id);
                              }}
                            >
                              {index + 1}
                              
                              {/* Floating Comment Box */}
                              {(activeComment === comment.id || hoveredComment === comment.id) && (
                                <div
                                  style={{
                                    position: "absolute",
                                    left: boxLeft,
                                    right: boxRight,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    background: "#fff",
                                    border: "2px solid #3b82f6",
                                    borderRadius: "12px",
                                    padding: "16px",
                                    minWidth: "280px",
                                    maxWidth: "320px",
                                    zIndex: 10,
                                    boxShadow: "0 8px 32px rgba(59,130,246,0.2)",
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="mb-3">
                                    <p className="font-semibold text-gray-900 text-sm leading-relaxed break-words">
                                      {comment.message || comment.comment}
                                      {comment.done && <span className="text-green-600 ml-2">✓ Done</span>}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                      {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="max-w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center">
                        <div className="text-center">
                          <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No media available</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900">{selectedContent.versions[selectedVersionIndex].caption || 'No caption'}</p>
                      </div>
                    </div>

                    {selectedContent.versions[selectedVersionIndex].hashtags && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-900">{selectedContent.versions[selectedVersionIndex].hashtags}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900">{selectedContent.versions[selectedVersionIndex].notes || 'No notes'}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Created: {formatDate(selectedContent.versions[selectedVersionIndex].createdAt)}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedContent.versions[selectedVersionIndex].status)}`}>
                        {selectedContent.versions[selectedVersionIndex].status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Version History and Comments */}
        <div className="space-y-6">
          {/* Version History Panel */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 text-green-600 mr-2" />
                Version History
              </h3>
            </div>
            <div className="max-h-96 overflow-y-auto p-0">
              <div className="divide-y divide-gray-100">
                {selectedContent.versions.map((version, index) => {
                  const versionDate = new Date(version.createdAt);
                  const formattedDate = versionDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  return (
                    <button
                      key={version.id}
                      onClick={() => {
                        setSelectedVersionIndex(index);
                        setSelectedMediaIndex(0);
                      }}
                      className={`w-full text-left px-6 py-4 flex flex-col border-l-4 transition-all duration-200 hover:bg-gray-50 ${
                        selectedVersionIndex === index
                          ? "bg-purple-50 border-l-purple-600"
                          : "bg-white border-l-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-gray-900 text-base">
                          Version {version.versionNumber}
                        </span>
                        {selectedVersionIndex === index && (
                          <span className="ml-2 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="flex items-center mt-1 text-xs text-gray-500 gap-2">
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formattedDate}
                        </span>
                        {version.media && version.media.length > 0 && (
                          <span className="flex items-center ml-2">
                            <Image className="h-3 w-3 mr-1" />
                            {version.media.length} media
                          </span>
                        )}
                        {version.comments && version.comments.length > 0 && (
                          <span className="flex items-center ml-2">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            {version.comments.length} comments
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Comments for selected version */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-purple-50 to-pink-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center">
                <MessageSquare className="h-5 w-5 text-purple-600 mr-2" />
                Comments for Version {selectedContent.versions[selectedVersionIndex]?.versionNumber} - Media {selectedMediaIndex + 1} ({commentsForCurrentMedia.length})
              </h3>
            </div>
            <div className="max-h-80 overflow-y-auto p-4">
              {commentsForCurrentMedia.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-sm">No comments for this media item</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commentsForCurrentMedia.map((comment, idx) => (
                    <div key={comment.id || idx} className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      activeComment === comment.id
                        ? 'bg-blue-50 border-blue-200 shadow-md'
                        : 'bg-gray-50 hover:bg-gray-100/50 border-gray-200 hover:border-gray-300/50'
                    }`} onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}>
                      <div className="flex items-start space-x-3">
                        <span className="font-bold text-purple-600 bg-purple-100 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 break-words">
                            {comment.message || comment.comment}
                            {comment.done && (
                              <span className="ml-2 text-green-600 text-xs font-semibold">✓ Done</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Position: ({Math.round(comment.x || comment.position?.x || 0)}, {Math.round(comment.y || comment.position?.y || 0)})
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

export default ContentDetailView;