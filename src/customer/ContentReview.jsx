import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, CheckCircle, Edit3, Trash2, Move } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

function ContentReview() {
  const navigate = useNavigate();

  const [contentItems, setContentItems] = useState([]);
  const [selectedContent, setSelectedContent] = useState(null);
  const [comments, setComments] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`)
  .then((res) => res.json())
  .then((data) => {
    if (!Array.isArray(data)) {
      throw new Error('Invalid data received');
    }

    const mapped = data.map((item) => ({
      id: item._id,
      title: item.caption || 'Untitled Post',
      description: item.notes || '',
      imageUrl: item.images?.[0] || '',
      createdBy: item.created_by || 'Unknown',
      createdAt: item.created_at || '',
      status: 'under_review',
    }));

    setContentItems(mapped);
    if (mapped.length > 0) setSelectedContent(mapped[0]);
  })
  .catch((err) => {
    console.error('Failed to fetch content submissions:', err.message);
  });

  }, []);

  const Button = ({ onClick, children, style, variant = 'primary' }) => {
    const variants = {
      primary: {
        background: 'linear-gradient(90deg, #2563eb 60%, #3b82f6 100%)',
        color: '#fff'
      },
      success: {
        background: 'linear-gradient(90deg, #27ae60 60%, #2ecc71 100%)',
        color: '#fff'
      },
      warning: {
        background: 'linear-gradient(90deg, #ffc107 60%, #ffe082 100%)',
        color: '#212529'
      },
      danger: {
        background: 'linear-gradient(90deg, #e74c3c 60%, #ff7675 100%)',
        color: '#fff'
      },
      info: {
        background: 'linear-gradient(90deg, #6dd5ed 60%, #3a8dde 100%)',
        color: '#2d3a4a'
      }
    };

    return (
      <button
        onClick={onClick}
        style={{
          padding: "6px 12px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          fontWeight: 500,
          fontSize: "0.875rem",
          transition: "all 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          ...variants[variant],
          ...style,
        }}
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
    };
    setComments([...comments, newComment]);
    setActiveComment(newComment.id);
  };

  const handleCommentChange = (id, text) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, comment: text } : c)));
  };

  const handleCommentSubmit = (id) => {
    const comment = comments.find(c => c.id === id);
    if (comment && comment.comment.trim()) {
      setComments(comments.map((c) => (c.id === id ? { ...c, editing: false } : c)));
      setActiveComment(null);
    }
  };

  const handleCommentCancel = (id) => {
    setComments(comments.filter((c) => c.id !== id));
    setActiveComment(null);
  };

  const handleMarkDone = (id) => {
    setComments(comments.map((c) => (c.id === id ? { ...c, done: true } : c)));
    setActiveComment(null);
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

  if (!selectedContent) {
    return <div className="p-6 text-gray-600 text-center">Loading content submissions...</div>;
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
     

      {/* Main Content */}
      <div className="max-w-full lg:max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Sidebar - Content List & Comments */}
          <div className="w-full lg:w-80 flex-shrink-0 space-y-6">
            {/* Content Items */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 w-full">
              <h3 className="text-lg font-semibold mb-4 text-[#2563eb]">Content Items</h3>
              <div className="space-y-3">
                {contentItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedContent.id === item.id
                        ? 'bg-[#e3f2fd] border-2 border-[#2563eb]'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                    onClick={() => {
                      setSelectedContent(item);
                      setComments([]);
                      setActiveComment(null);
                    }}
                  >
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                    <p className="text-xs text-gray-400 mt-1">By {item.createdBy}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Panel */}
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 w-full">
              <div className="flex items-center mb-4">
                <MessageSquare className="h-5 w-5 text-[#2563eb] mr-2" />
                <h3 className="text-lg font-semibold text-[#2563eb]">All Comments</h3>
              </div>
              
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-gray-500 text-sm italic">No comments yet. Click on the image to add comments.</p>
                ) : (
                  comments.map((comment, index) => (
                    <div
                      key={comment.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        activeComment === comment.id
                          ? 'bg-[#e3f2fd] border-2 border-[#2563eb]'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                      onClick={() => handleCommentListClick(comment.id)}
                    >
                      <div className="flex items-start">
                        <span className="font-bold text-[#2563eb] mr-2">{index + 1}.</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {comment.comment}
                            {comment.done && (
                              <span className="ml-2 text-green-600 text-xs">(Done)</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            ({Math.round(comment.x)}, {Math.round(comment.y)})
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          {/* Main Content Area */}
          <div className="flex-1 min-w-0 w-full">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-8 w-full">
              <div className="mb-4 sm:mb-6">
                <h2 className="text-2xl font-bold text-gray-900">{selectedContent.title}</h2>
                <p className="text-gray-600 mt-2">{selectedContent.description}</p>
              </div>

              {/* Image with Comments */}
              <div className="flex justify-center">
                <div
                  style={{
                    position: "relative",
                    display: "inline-block",
                    width: "100%",
                    maxWidth: 500,
                  }}
                  className="w-full"
                >
                  <img
                    src={selectedContent.imageUrl}
                    alt={selectedContent.title}
                    style={{
                      width: "100%",
                      maxWidth: "100%",
                      height: "auto",
                      maxHeight: "50vh",
                      borderRadius: "12px",
                      border: "2px solid #e0eafc",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                      cursor: "crosshair",
                      objectFit: "contain"
                    }}
                    className="w-full max-h-[50vh] object-contain"
                    onClick={handleImageClickWithReposition}
                  />
                  
                  {/* Comment Markers */}
                  {comments.map((comment, index) => {
                    // Calculate floating box position
                    let boxLeft = 40;
                    let boxRight = "auto";
                    const img = document.querySelector(`img[alt="${selectedContent.title}"]`);
                    if (img && img.width && comment.x > img.width / 2) {
                      boxLeft = "auto";
                      boxRight = 40;
                    }

                    return (
                      <div
                        key={comment.id}
                        style={{
                          position: "absolute",
                          top: comment.y - 14,
                          left: comment.x - 14,
                          width: 28,
                          height: 28,
                          background: comment.done ? "#27ae60" : comment.editing ? "#2563eb" : "#e74c3c",
                          color: "#fff",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: "bold",
                          fontSize: "14px",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                          cursor: "pointer",
                          zIndex: 2,
                          border: "2px solid #fff",
                          transition: "all 0.2s",
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
                              border: "2px solid #2563eb",
                              borderRadius: "8px",
                              padding: "12px",
                              minWidth: "200px",
                              maxWidth: "250px",
                              zIndex: 10,
                              boxShadow: "0 4px 20px rgba(37,99,235,0.15)",
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {comment.editing ? (
                              <>
                                <textarea
                                  value={comment.comment}
                                  onChange={(e) => handleCommentChange(comment.id, e.target.value)}
                                  placeholder="Add a comment..."
                                  style={{
                                    width: "100%",
                                    padding: "8px",
                                    borderRadius: "6px",
                                    border: "1px solid #e0eafc",
                                    marginBottom: "8px",
                                    resize: "none",
                                    fontSize: "14px",
                                    fontFamily: "inherit",
                                    minHeight: "60px",
                                    color: "#111", // <-- set text color to black
                                    background: "#fff"
                                  }}
                                  autoFocus
                                />
                                <div style={{ display: "flex", gap: "8px" }}>
                                  <Button
                                    onClick={() => handleCommentSubmit(comment.id)}
                                    variant="success"
                                    style={{ flex: 1, fontSize: "12px", padding: "4px 8px" }}
                                  >
                                    Submit
                                  </Button>
                                  <Button
                                    onClick={() => handleCommentCancel(comment.id)}
                                    variant="danger"
                                    style={{ flex: 1, fontSize: "12px", padding: "4px 8px" }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{
                                  marginBottom: "8px",
                                  fontWeight: "600",
                                  color: "#2563eb",
                                  fontSize: "14px",
                                  wordBreak: "break-word"
                                }}>
                                  {comment.comment}
                                  {comment.done && <span style={{ color: "#27ae60" }}> (Done)</span>}
                                  {comment.repositioning && (
                                    <span style={{ fontStyle: "italic", color: "#3a8dde" }}> (Repositioning...)</span>
                                  )}
                                </div>
                                <div style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: "6px"
                                }}>
                                  {!comment.done && (
                                    <Button
                                      onClick={() => handleMarkDone(comment.id)}
                                      variant="success"
                                      style={{ fontSize: "11px", padding: "4px 6px" }}
                                    >
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Mark as Done
                                    </Button>
                                  )}
                                  <Button
                                    onClick={() => handleEditComment(comment.id)}
                                    variant="warning"
                                    style={{ fontSize: "11px", padding: "4px 6px" }}
                                  >
                                    <Edit3 className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    onClick={() => handleCommentCancel(comment.id)}
                                    variant="danger"
                                    style={{ fontSize: "11px", padding: "4px 6px" }}
                                  >
                                    <Trash2 className="h-3 w-3 mr-1" />
                                    Discard
                                  </Button>
                                  <Button
                                    onClick={() => handleRepositionStart(comment.id)}
                                    variant="info"
                                    style={{ fontSize: "11px", padding: "4px 6px" }}
                                  >
                                    <Move className="h-3 w-3 mr-1" />
                                    Reposition
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

              {/* Action Buttons */}
              <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 w-full">
                <Button
                  onClick={() => navigate(`/customer/approve/${selectedContent.id}`)}
                  variant="success"
                  style={{ padding: "12px 24px" }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Content
                </Button>
                <Button
                  onClick={() => {
                    // Handle request changes
                    console.log('Request changes for:', selectedContent.id);
                  }}
                  variant="warning"
                  style={{ padding: "12px 24px" }}
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Request Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentReview;