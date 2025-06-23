import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import AdminLayout from "../../components/layout/AdminLayout";

// Enhanced Button Component
const Button = ({ onClick, children, style }) => (
  <button
    onClick={onClick}
    style={{
      padding: "3px 8px",
      borderRadius: "5px",
      border: "none",
      background: "linear-gradient(90deg, #2563eb 60%, #3b82f6 100%)",
      color: "#fff",
      cursor: "pointer",
      fontWeight: 500,
      fontSize: "0.82rem",
      transition: "background 0.2s, color 0.2s",
      boxShadow: "0 1px 2px rgba(37,99,235,0.08)",
      ...style,
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#2563eb")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "linear-gradient(90deg, #2563eb 60%, #3b82f6 100%)")}
  >
    {children}
  </button>
);

// ImageUploader
const ImageUploader = ({ onImageSelect }) => (
  <label
    style={{
      display: "block",
      marginBottom: 24,
      width: "100%",
      cursor: "pointer",
    }}
  >
    <div
      style={{
        padding: "18px",
        borderRadius: "10px",
        background: "linear-gradient(90deg, #3a8dde 60%, #6dd5ed 100%)",
        color: "#fff",
        fontWeight: 700,
        border: "none",
        fontSize: "1.08rem",
        boxShadow: "0 2px 8px rgba(58,141,222,0.13)",
        textAlign: "center",
        transition: "background 0.2s",
        marginBottom: 0,
        letterSpacing: 1,
      }}
    >
      <i className="fas fa-upload" style={{ marginRight: 10 }}></i>
      Upload Image
    </div>
    <input
      type="file"
      accept="image/*"
      onChange={(e) => {
        const file = e.target.files[0];
        if (file) onImageSelect(file);
      }}
      style={{ display: "none" }}
    />
  </label>
);

// CommentList
const CommentList = ({ markers, onClick, activeMarker }) => (
  <div
    style={{
      maxHeight: 320,
      overflowY: "auto",
      marginTop: 20,
      background: "#f7fafc",
      borderRadius: 10,
      boxShadow: "0 2px 8px rgba(44,62,80,0.06)",
      padding: "18px 12px",
    }}
  >
    <h3
      style={{
        marginBottom: 14,
        color: "#2563eb",
        fontWeight: 800,
        fontSize: 18,
        letterSpacing: 0.5,
      }}
    >
      All Comments
    </h3>
    <ul style={{ padding: 0, listStyle: "none", margin: 0 }}>
      {markers.length === 0 && (
        <li
          style={{
            color: "#b0b8c1",
            fontStyle: "italic",
            padding: "8px 0",
          }}
        >
          No comments yet.
        </li>
      )}
      {markers.map((m, i) => (
        <li
          key={m.id}
          style={{
            marginBottom: 10,
            background: activeMarker === m.id ? "#e3f2fd" : "#fff",
            borderRadius: 8,
            padding: "10px 12px",
            cursor: "pointer",
            border:
              activeMarker === m.id
                ? "2px solid #2563eb"
                : "1px solid #e0eafc",
            transition: "background 0.2s, border 0.2s",
            boxShadow:
              activeMarker === m.id ? "0 2px 8px #2563eb22" : "none",
          }}
          onClick={() => onClick(m.id)}
        >
          <span
            style={{
              fontWeight: 800,
              color: m.done ? "#27ae60" : "#2563eb",
              fontSize: 15,
            }}
          >
            {i + 1}.
          </span>{" "}
          <span
            style={{
              background: m.done ? "#eafaf1" : "#e3f2fd",
              color: m.done ? "#155724" : "#2d3a4a",
              padding: "2px 8px",
              borderRadius: 4,
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            {m.comment}{" "}
            {m.done && <span style={{ color: "#27ae60" }}>(Done)</span>}
          </span>
          <br />
          <small style={{ color: "#8ca0b3", fontSize: 12 }}>
            ({Math.round(m.x)}, {Math.round(m.y)})
          </small>
        </li>
      ))}
    </ul>
  </div>
);

const Comment = () => {
  const [image, setImage] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [activeMarker, setActiveMarker] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(null);

  const handleImageSelect = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
      setMarkers([]);
      setActiveMarker(null);
    };
    reader.readAsDataURL(file);
  };

  const handleImageClick = (e) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    // Prevent adding marker if one is being edited
    if (markers.some((m) => m.editing)) return;
    const newMarker = {
      id: uuidv4(),
      x,
      y,
      comment: "",
      editing: true,
      done: false,
      repositioning: false,
    };
    setMarkers([...markers, newMarker]);
    setActiveMarker(newMarker.id);
  };

  const handleCommentChange = (id, text) => {
    setMarkers(markers.map((m) => (m.id === id ? { ...m, comment: text } : m)));
  };

  const handleCommentSubmit = (id) => {
    setMarkers(markers.map((m) => (m.id === id ? { ...m, editing: false } : m)));
    setActiveMarker(null);
  };

  const handleCommentCancel = (id) => {
    setMarkers(markers.filter((m) => m.id !== id));
    setActiveMarker(null);
  };

  const handleMarkDone = (id) => {
    setMarkers(markers.map((m) => (m.id === id ? { ...m, done: true } : m)));
  };

  const handleEditComment = (id) => {
    setMarkers(markers.map((m) => (m.id === id ? { ...m, editing: true, done: false } : m)));
    setActiveMarker(id);
  };

  const handleListClick = (id) => {
    setActiveMarker(id);
  };

  const handleRepositionStart = (id) => {
    setMarkers(markers.map((m) => (m.id === id ? { ...m, repositioning: true } : m)));
    setActiveMarker(id);
  };

  // If repositioning, next image click moves marker
  const handleImageClickWithReposition = (e) => {
    const repositioningMarker = markers.find((m) => m.repositioning);
    if (repositioningMarker) {
      const rect = e.target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMarkers(
        markers.map((m) =>
          m.id === repositioningMarker.id ? { ...m, x, y, repositioning: false } : m
        )
      );
      setActiveMarker(null);
      return;
    }
    handleImageClick(e);
  };

  return (
    <AdminLayout>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(120deg, #f7fafc 60%, #e0eafc 100%)",
          fontFamily: "'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
          color: "#2d3a4a",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <main
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            gap: 48,
            padding: "48px 0",
            background: "none",
          }}
        >
          <section
            style={{
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 4px 32px rgba(44,62,80,0.10)",
              padding: 38,
              minWidth: 280,
              width: "100%",
              maxWidth: 420,
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
            }}
          >
            <ImageUploader onImageSelect={handleImageSelect} />
            <CommentList markers={markers} onClick={handleListClick} activeMarker={activeMarker} />
          </section>
          <section
            style={{
              flex: 1,
              background: "#fff",
              borderRadius: 18,
              boxShadow: "0 4px 32px rgba(44,62,80,0.10)",
              padding: 38,
              minHeight: 340,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 12,
              width: "100%",
              maxWidth: 720,
            }}
          >
            {image ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img
                  src={image}
                  alt="Uploaded"
                  style={{
                    maxWidth: 680,
                    maxHeight: 440,
                    borderRadius: 14,
                    border: "2px solid #e0eafc",
                    boxShadow: "0 2px 12px rgba(58,141,222,0.10)",
                    cursor: "crosshair",
                  }}
                  onClick={handleImageClickWithReposition}
                />
                {markers.map((marker, i) => {
                  // Calculate if the floating box should open to the left or right
                  let boxLeft = 40;
                  let boxTransform = "translateY(-50%)";
                  let boxRight = "auto";
                  // If marker is on the right half of the image, open box to the left
                  if (image) {
                    const img = document.querySelector('img[alt="Uploaded"]');
                    if (img && img.width && marker.x > img.width / 2) {
                      boxLeft = "auto";
                      boxRight = 40;
                    }
                  }
                  return (
                    <div
                      key={marker.id}
                      style={{
                        position: "absolute",
                        top: marker.y - 14,
                        left: marker.x - 14,
                        width: 32,
                        height: 32,
                        background: marker.done ? "#27ae60" : marker.editing ? "#2563eb" : "#e74c3c",
                        color: "#fff",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 17,
                        boxShadow: "0 2px 8px rgba(58,141,222,0.15)",
                        cursor: "pointer",
                        zIndex: 2,
                        border: "2.5px solid #fff",
                        transition: "background 0.2s",
                      }}
                      title={marker.comment}
                      onMouseEnter={() => setHoveredMarker(marker.id)}
                      onMouseLeave={() => setHoveredMarker(null)}
                    >
                      {i + 1}
                      {(marker.editing || activeMarker === marker.id || hoveredMarker === marker.id) && (
                        <div
                          style={{
                            position: "absolute",
                            left: boxLeft,
                            right: boxRight,
                            top: "50%",
                            transform: boxTransform,
                            background: "#fff",
                            border: "2px solid #2563eb",
                            borderRadius: 10,
                            padding: 10,
                            minWidth: 160,
                            maxWidth: 200,
                            zIndex: 10,
                            boxShadow: "0 4px 16px rgba(37,99,235,0.13)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "flex-start",
                            gap: 8,
                            overflow: "auto",
                          }}
                        >
                          {marker.editing ? (
                            <>
                              <textarea
                                value={marker.comment}
                                onChange={(e) => handleCommentChange(marker.id, e.target.value)}
                                placeholder="Add a comment..."
                                style={{
                                  width: "100%",
                                  padding: "12px",
                                  borderRadius: "8px",
                                  border: "1.5px solid #e0eafc",
                                  marginBottom: "12px",
                                  resize: "none",
                                  fontSize: "1rem",
                                  background: "#f7fafc",
                                  color: "#222",
                                  fontFamily: "inherit",
                                  minHeight: 60,
                                }}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") handleCommentCancel(marker.id);
                                }}
                              />
                              <div style={{ display: "flex", gap: 12, width: "100%" }}>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCommentSubmit(marker.id);
                                  }}
                                  style={{
                                    flex: 1,
                                    background: "linear-gradient(90deg, #27ae60 60%, #2ecc71 100%)"
                                  }}
                                >
                                  Submit
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCommentCancel(marker.id);
                                  }}
                                  style={{
                                    flex: 1,
                                    background: "linear-gradient(90deg, #e74c3c 60%, #ff7675 100%)"
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                style={{
                                  marginBottom: 6,
                                  fontWeight: 600,
                                  color: "#2563eb",
                                  fontSize: 15,
                                  wordBreak: "break-word"
                                }}
                              >
                                {marker.comment}{" "}
                                {marker.done && <span style={{ color: "#27ae60" }}>(Done)</span>}
                                {marker.repositioning && (
                                  <span style={{ fontStyle: "italic", color: "#3a8dde" }}> (Repositioning...)</span>
                                )}
                              </div>
                              <div style={{
                                display: "flex",
                                gap: 10,
                                width: "100%",
                                flexWrap: "wrap"
                              }}>
                                {!marker.done && (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkDone(marker.id);
                                    }}
                                    style={{
                                      flex: 1,
                                      background: "linear-gradient(90deg, #27ae60 60%, #2ecc71 100%)"
                                    }}
                                  >
                                    Mark as Done
                                  </Button>
                                )}
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditComment(marker.id);
                                  }}
                                  style={{
                                    flex: 1,
                                    background: "linear-gradient(90deg, #ffc107 60%, #ffe082 100%)",
                                    color: "#212529"
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCommentCancel(marker.id);
                                  }}
                                  style={{
                                    flex: 1,
                                    background: "linear-gradient(90deg, #e74c3c 60%, #ff7675 100%)"
                                  }}
                                >
                                  Discard
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRepositionStart(marker.id);
                                  }}
                                  style={{
                                    flex: 1,
                                    background: "linear-gradient(90deg, #6dd5ed 60%, #3a8dde 100%)",
                                    color: "#2d3a4a"
                                  }}
                                >
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
            ) : (
              <div
                style={{
                  color: "#b0b8c1",
                  fontSize: 22,
                  marginTop: 120,
                  textAlign: "center",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                Please upload an image to start.
              </div>
            )}
          </section>
        </main>
        <style>{`
          @media (max-width: 900px) {
            main {
              flex-direction: column !important;
              gap: 24px !important;
              padding: 24px 0 !important;
              align-items: stretch !important;
            }
            section {
              min-width: 0 !important;
              max-width: 100% !important;
              width: 100% !important;
              margin-top: 0 !important;
              padding: 18px !important;
            }
          }
          @media (max-width: 600px) {
            main {
              padding: 8px 0 !important;
            }
            section {
              padding: 8px !important;
            }
            img {
              max-width: 100% !important;
              max-height: 260px !important;
            }
          }
        `}</style>
        {/* FontAwesome CDN for icons */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css"
        />
      </div>
    </AdminLayout>
  );
};

export default Comment;
