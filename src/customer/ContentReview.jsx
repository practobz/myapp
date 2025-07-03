import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, CheckCircle, Edit3, Trash2, Move, Bell, ChevronDown, LogOut, Settings, User, Calendar, Clock, Eye, Image, ChevronLeft, ChevronRight } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../admin/contexts/AuthContext';

function ContentReview() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedContentIndex, setSelectedContentIndex] = useState(0);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);

  const [contentItems, setContentItems] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [comments, setComments] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);

  useEffect(() => {
    fetchContentSubmissions();
  }, []);

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
  }, [selectedContent, selectedVersionIndex]);

  const fetchContentSubmissions = async () => {
    try {
      const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      const submissions = await submissionsRes.json();
      
      if (!Array.isArray(submissions)) {
        throw new Error('Invalid data received');
      }

      // Group submissions by assignment ID to handle versions
      const groupedSubmissions = {};
      
      submissions.forEach(submission => {
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
          status: 'under_review',
          platform: baseItem.platform || 'Instagram',
          type: baseItem.type || 'Post',
          versions: versions.map((version, index) => ({
            id: version._id,
            assignment_id: version.assignment_id, // <-- add this line
            versionNumber: index + 1,
            imageUrl: version.images?.[0] || '',
            caption: version.caption || '',
            notes: version.notes || '',
            createdAt: version.created_at,
            comments: version.comments || []
          })),
          totalVersions: versions.length
        });
      });

      setContentItems(contentData);
      if (contentData.length > 0) {
        setSelectedContent(contentData[0]);
        setSelectedVersionIndex(contentData[0].versions.length - 1); // Show latest version by default
      }
    } catch (err) {
      console.error('Failed to fetch content submissions:', err.message);
      setContentItems([]);
    }
  };

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    logout();
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
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    return (
      <button
        onClick={onClick}
        className={`${variants[variant]} ${sizes[size]} rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2`}
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
    if (comments.some((c) => c.editing)) return;
    
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
      timestamp: new Date().toISOString()
    };
    setComments([...comments, newComment]);
    setActiveComment(newComment.id);
  };

  const handleCommentChange = (id, text) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, comment: text } : c)));
  };

  const handleCommentSubmit = async (id) => {
    const comment = comments.find(c => c.id === id);
    if (comment && comment.comment.trim()) {
      try {
        // Prepare comment object to save
        const newCommentObj = {
          id: comment.id,
          comment: comment.comment,
          position: { x: comment.x, y: comment.y },
          timestamp: comment.timestamp,
          status: 'active'
        };

        // Find the version object for this comment
        const versionObj = selectedContent.versions.find(v => v.id === comment.versionId);
        const assignmentIdForPatch = versionObj?.assignment_id;
        const versionIdForPatch = versionObj?.id || comment.versionId;

        if (!assignmentIdForPatch) {
          console.error('No assignment_id found for version, cannot submit comment.');
          return;
        }

        // Save comment to backend: PATCH the submission to add comment to the correct version
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${assignmentIdForPatch}/comment`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            versionId: versionIdForPatch,
            comment: newCommentObj
          })
        });

        if (response.ok) {
          // Update only the comments for the current version in state
          setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setActiveComment(null);

          // Update selectedContent in state to include the new comment for the current version
          setSelectedContent(prevContent => {
            if (!prevContent) return prevContent;
            const updatedVersions = prevContent.versions.map((v, idx) => {
              if (v.id === versionIdForPatch) {
                return {
                  ...v,
                  comments: [...(v.comments || []), newCommentObj]
                };
              }
              return v;
            });
            return { ...prevContent, versions: updatedVersions };
          });
        } else {
          const errorData = await response.json();
          console.error('Failed to save comment:', errorData);
          setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
          setActiveComment(null);
        }
      } catch (error) {
        console.error('Error saving comment:', error);
        setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
        setActiveComment(null);
      }
    }
  };

  const handleCommentCancel = (id) => {
    setComments(comments.filter((c) => c.id !== id));
    setActiveComment(null);
  };

  const handleMarkDone = async (id) => {
    const comment = comments.find(c => c.id === id);
    if (comment) {
      try {
        // Update comment status on backend
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${selectedContent.id}/comments/${comment.id}`, {
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
          setActiveComment(null);
        } else {
          console.error('Failed to update comment status');
          // Still update UI
          setComments(comments.map((c) => (c.id === id ? { ...c, done: true } : c)));
          setActiveComment(null);
        }
      } catch (error) {
        console.error('Error updating comment:', error);
        setComments(comments.map((c) => (c.id === id ? { ...c, done: true } : c)));
        setActiveComment(null);
      }
    }
  };

  const handleEditComment = (id) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, editing: true, done: false } : c)));
    setActiveComment(id);
  };

  const handleRepositionStart = (id) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, repositioning: true } : c)));
    setActiveComment(id);
  };

  const handleImageClickWithReposition = (e) => {
    const repositioningComment = comments.find((c) => c.repositioning);
    if (repositioningComment) {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setComments(
        comments.map((c) =>
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
    setComments(selectedContent.versions[newIndex].comments || []);
    setActiveComment(null);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!selectedContent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading content submissions...</p>
        </div>
      </div>
    );
  }

  const currentVersion = selectedContent.versions[selectedVersionIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
     

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col xl:flex-row gap-8">
          {/* Left Sidebar - Content List */}
          <div className="w-full xl:w-96 flex-shrink-0">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                  Content Items ({contentItems.length})
                </h3>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {contentItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-4 cursor-pointer transition-all duration-200 border-b border-gray-100/50 hover:bg-blue-50/50 ${
                      selectedContentIndex === index
                        ? 'bg-blue-50 border-l-4 border-l-blue-500'
                        : ''
                    }`}
                    onClick={() => handleContentSelect(item, index)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 truncate">{item.title}</h4>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                              {item.status.replace('_', ' ').toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">{item.platform}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">By {item.createdBy}</span>
                          <span className="text-xs text-purple-600 font-medium">
                            {item.totalVersions} version{item.totalVersions !== 1 ? 's' : ''}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{formatDate(item.createdAt)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Panel */}
            <div className="mt-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-purple-50 to-pink-50">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <MessageSquare className="h-5 w-5 text-purple-600 mr-2" />
                  Comments ({comments.length})
                </h3>
              </div>
              
              <div className="max-h-80 overflow-y-auto p-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                      <MessageSquare className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm">No comments yet</p>
                    <p className="text-gray-400 text-xs mt-1">Click on the image to add comments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {comments.map((comment, index) => (
                      <div
                        key={comment.id}
                        className={`p-3 rounded-lg cursor-pointer transition-all duration-200 border ${
                          activeComment === comment.id
                            ? 'bg-blue-50 border-blue-200 shadow-md'
                            : 'bg-gray-50/50 hover:bg-gray-100/50 border-gray-200/50 hover:border-gray-300/50'
                        }`}
                        onClick={() => handleCommentListClick(comment.id)}
                      >
                        <div className="flex items-start space-x-3">
                          <span className="font-bold text-blue-600 bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 break-words">
                              {comment.comment}
                              {comment.done && (
                                <span className="ml-2 text-green-600 text-xs font-semibold">✓ Done</span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
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

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
              {/* Content Header */}
              <div className="px-8 py-6 border-b border-gray-200/50 bg-gradient-to-r from-slate-50 to-blue-50">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedContent.title}</h2>
                    <p className="text-gray-600">{selectedContent.description}</p>
                    <div className="flex items-center mt-2 space-x-4">
                      <span className="text-sm text-gray-500">By {selectedContent.createdBy}</span>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-500">{selectedContent.platform}</span>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedContent.status)}`}>
                      {selectedContent.status.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 border border-purple-200">
                      <Image className="h-4 w-4 mr-1" />
                      {selectedContent.totalVersions} Version{selectedContent.totalVersions !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Version Controls */}
              {selectedContent.totalVersions > 1 && (
                <div className="px-8 py-4 border-b border-gray-200/50 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Version {currentVersion?.versionNumber} of {selectedContent.totalVersions}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleVersionChange('prev')}
                        disabled={selectedVersionIndex === 0}
                        className="p-2 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="px-3 py-1 bg-white rounded-lg border text-sm font-medium">
                        {selectedVersionIndex + 1} / {selectedContent.totalVersions}
                      </span>
                      <button
                        onClick={() => handleVersionChange('next')}
                        disabled={selectedVersionIndex === selectedContent.totalVersions - 1}
                        className="p-2 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 border"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    Created: {formatDate(currentVersion?.createdAt)}
                  </div>
                </div>
              )}

              {/* Image with Comments */}
              <div className="p-8">
                <div className="flex justify-center mb-8">
                  <div className="relative inline-block max-w-full">
                    <img
                      src={currentVersion?.imageUrl}
                      alt={`${selectedContent.title} - Version ${currentVersion?.versionNumber}`}
                      className="max-w-full h-auto max-h-[70vh] rounded-2xl shadow-2xl border-2 border-gray-200/50 object-contain cursor-crosshair"
                      onClick={handleImageClickWithReposition}
                    />
                    
                    {/* Comment Markers */}
                    {comments.map((comment, index) => {
                      // Calculate floating box position
                      let boxLeft = 40;
                      let boxRight = "auto";
                      const img = document.querySelector(`img[alt*="${selectedContent.title}"]`);
                      if (img && img.width && (comment.x || comment.position?.x) > img.width / 2) {
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
                            background: comment.done ? "#10b981" : comment.editing ? "#3b82f6" : "#ef4444",
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
                              {comment.editing ? (
                                <>
                                  <textarea
                                    value={comment.comment}
                                    onChange={(e) => handleCommentChange(comment.id, e.target.value)}
                                    placeholder="Add a comment..."
                                    className="w-full p-3 border-2 border-gray-200 rounded-lg resize-none text-sm text-gray-900 bg-white focus:border-blue-500 focus:outline-none transition-colors"
                                    rows={3}
                                    autoFocus
                                  />
                                  <div className="flex gap-2 mt-3">
                                    <Button
                                      onClick={() => handleCommentSubmit(comment.id)}
                                      variant="success"
                                      size="sm"
                                    >
                                      Submit
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
                                  <div className="mb-3">
                                    <p className="font-semibold text-gray-900 text-sm leading-relaxed break-words">
                                      {comment.comment}
                                      {comment.done && <span className="text-green-600 ml-2">✓ Done</span>}
                                      {comment.repositioning && (
                                        <span className="text-blue-600 italic ml-2">(Repositioning...)</span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    {!comment.done && (
                                      <Button
                                        onClick={() => handleMarkDone(comment.id)}
                                        variant="success"
                                        size="sm"
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Done
                                      </Button>
                                    )}
                                    <Button
                                      onClick={() => handleEditComment(comment.id)}
                                      variant="warning"
                                      size="sm"
                                    >
                                      <Edit3 className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                    <Button
                                      onClick={() => handleCommentCancel(comment.id)}
                                      variant="danger"
                                      size="sm"
                                    >
                                      <Trash2 className="h-3 w-3 mr-1" />
                                      Delete
                                    </Button>
                                    <Button
                                      onClick={() => handleRepositionStart(comment.id)}
                                      variant="info"
                                      size="sm"
                                    >
                                      <Move className="h-3 w-3 mr-1" />
                                      Move
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Version Details */}
                {currentVersion && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900">{currentVersion.caption || 'No caption provided'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-gray-900">{currentVersion.notes || 'No notes provided'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
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