import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Eye, MessageSquare, Calendar, User, Palette, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Image, FileText, Play, Video } from 'lucide-react';

// Helper to get creator email from localStorage
function getCreatorEmail() {
  let email = '';
  try {
    email = (localStorage.getItem('userEmail') || '').toLowerCase();
    if (!email) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.email) {
          email = userObj.email.toLowerCase();
        }
      }
    }
  } catch (e) {
    email = '';
  }
  return email;
}

function ContentPortfolio() {
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);

  // Get current creator's email
  const creatorEmail = getCreatorEmail();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail) {
      navigate('/content-creator/login');
    }
  }, [creatorEmail, navigate]);

  useEffect(() => {
    fetchPortfolioItems();
  }, []);

  useEffect(() => {
    // When selectedContent or selectedVersionIndex changes, update commentsForVersion
    if (selectedContent && selectedContent.versions && selectedContent.versions[selectedVersionIndex]) {
      setCommentsForVersion(selectedContent.versions[selectedVersionIndex].comments || []);
    } else {
      setCommentsForVersion([]);
    }
  }, [selectedContent, selectedVersionIndex]);

  // Add new useEffect to filter comments by media index
  useEffect(() => {
    // Filter comments for the currently selected media item
    const filteredComments = commentsForVersion.filter(comment => {
      // If comment has mediaIndex, use it; otherwise assume it's for media index 0 (backward compatibility)
      const commentMediaIndex = comment.mediaIndex !== undefined ? comment.mediaIndex : 0;
      return commentMediaIndex === selectedMediaIndex;
    });
    setCommentsForCurrentMedia(filteredComments);
  }, [commentsForVersion, selectedMediaIndex]);

  const fetchPortfolioItems = async () => {
    try {
      setLoading(true);

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

      // Show ALL assignments
      const portfolioData = [];
      Object.keys(groupedSubmissions).forEach(assignmentId => {
        const versions = groupedSubmissions[assignmentId].sort((a, b) =>
          new Date(a.created_at) - new Date(b.created_at)
        );
        const baseItem = versions[0];
        
        portfolioData.push({
          id: assignmentId,
          title: baseItem.caption || 'Untitled Post',
          customer: baseItem.customer_name || baseItem.customerName || 'Customer', // Prioritize customer_name from database
          customerId: baseItem.customer_id || baseItem.customerId || '', // Use customer_id from database
          customerEmail: baseItem.customer_email || baseItem.customerEmail || '', // Add customer email
          hashtags: baseItem.hashtags || '', // Add hashtags
          platform: baseItem.platform || 'Instagram',
          status: getLatestStatus(versions),
          createdDate: baseItem.created_at,
          lastUpdated: versions[versions.length - 1].created_at,
          description: baseItem.notes || '',
          versions: versions.map((version, index) => ({
            id: version._id,
            assignment_id: version.assignment_id,
            versionNumber: index + 1,
            media: normalizeMedia(version.media || version.images || []),
            caption: version.caption || '',
            hashtags: version.hashtags || '', // Add hashtags to versions
            notes: version.notes || '',
            createdAt: version.created_at,
            status: version.status || 'submitted',
            comments: version.comments || [],
            customer_name: version.customer_name || version.customerName || 'Customer', // Store customer info in versions
            customer_id: version.customer_id || version.customerId || '',
            customer_email: version.customer_email || version.customerEmail || ''
          })),
          totalVersions: versions.length,
          customerFeedback: getAllFeedback(versions)
        });
      });

      setPortfolioItems(portfolioData);
    } catch (error) {
      console.error('Error fetching portfolio items:', error);
      setPortfolioItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Add helper function to normalize media URLs
  const normalizeMedia = (media) => {
    if (!media || !Array.isArray(media)) return [];
    
    return media.map(item => {
      // If item is already a string (URL), convert to object
      if (typeof item === 'string') {
        return {
          url: item,
          type: getMediaType(item)
        };
      }
      
      // If item is an object with url property
      if (item && typeof item === 'object') {
        const url = item.url || item.src || item.href || String(item);
        
        // Validate URL is actually a string
        if (typeof url === 'string' && url.trim()) {
          return {
            url: url,
            type: item.type || getMediaType(url)
          };
        }
      }
      
      return null;
    }).filter(Boolean); // Remove any null/invalid entries
  };

  // Add helper function to determine media type
  const getMediaType = (url) => {
    if (!url || typeof url !== 'string') return 'image';
    
    const extension = url.toLowerCase().split('.').pop();
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
    
    return videoExtensions.includes(extension) ? 'video' : 'image';
  };

  const getLatestStatus = (versions) => {
    const latestVersion = versions[versions.length - 1];
    return latestVersion.status || 'under_review';
  };

  const getAllFeedback = (versions) => {
    const allFeedback = [];
    versions.forEach((version, versionIndex) => {
      if (version.comments && Array.isArray(version.comments)) {
        version.comments.forEach(comment => {
          allFeedback.push({
            ...comment,
            versionNumber: versionIndex + 1,
            timestamp: comment.timestamp || version.created_at
          });
        });
      }
    });
    return allFeedback.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'published':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'revision_requested':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      case 'revision_requested':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleUploadRevision = (contentId) => {
    navigate(`/content-creator/upload/${contentId}`);
  };

  const handleViewContent = (item) => {
    setSelectedContent(item);
    setSelectedVersionIndex(item.versions.length - 1); // Show latest version by default
    setSelectedMediaIndex(0); // Reset media index
  };

  const handleVersionSelect = (index) => {
    setSelectedVersionIndex(index);
    setSelectedMediaIndex(0); // Reset media index when version changes
  };

  const handleVersionChange = (direction) => {
    if (direction === 'prev' && selectedVersionIndex > 0) {
      setSelectedVersionIndex(selectedVersionIndex - 1);
      setSelectedMediaIndex(0);
    } else if (direction === 'next' && selectedVersionIndex < selectedContent.versions.length - 1) {
      setSelectedVersionIndex(selectedVersionIndex + 1);
      setSelectedMediaIndex(0);
    }
  };

  const handleMediaChange = (direction) => {
    const currentVersion = selectedContent.versions[selectedVersionIndex];
    const mediaLength = currentVersion.media.length;
    
    if (direction === 'prev' && selectedMediaIndex > 0) {
      setSelectedMediaIndex(selectedMediaIndex - 1);
    } else if (direction === 'next' && selectedMediaIndex < mediaLength - 1) {
      setSelectedMediaIndex(selectedMediaIndex + 1);
    }
  };

  const handleCommentListClick = (id) => {
    setActiveComment(activeComment === id ? null : id);
  };

  const handleMarkDone = async (id) => {
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment) {
      try {
        // Update comment status on backend
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(selectedContent.id)}/comments/${comment.id}`, {
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
          // Update both comments arrays
          setCommentsForVersion(commentsForVersion.map((c) => (c.id === id ? { ...c, done: true } : c)));
          setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, done: true } : c)));
          setActiveComment(null);
          
          // Refresh the portfolio data
          await fetchPortfolioItems();
        } else {
          console.error('Failed to update comment status');
          // Still update UI
          setCommentsForVersion(commentsForVersion.map((c) => (c.id === id ? { ...c, done: true } : c)));
          setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, done: true } : c)));
          setActiveComment(null);
        }
      } catch (error) {
        console.error('Error updating comment:', error);
        setCommentsForVersion(commentsForVersion.map((c) => (c.id === id ? { ...c, done: true } : c)));
        setCommentsForCurrentMedia(commentsForCurrentMedia.map((c) => (c.id === id ? { ...c, done: true } : c)));
        setActiveComment(null);
      }
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatVersionDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { date: 'Invalid Date', time: '' };
    }
  };

  const groupVersionsByDate = (versions) => {
    const today = new Date();
    const groups = {};
    
    versions.forEach((version, idx) => {
      const versionDate = new Date(version.createdAt);
      let label;
      
      if (
        versionDate.getDate() === today.getDate() &&
        versionDate.getMonth() === today.getMonth() &&
        versionDate.getFullYear() === today.getFullYear()
      ) {
        label = "Today";
      } else {
        label = versionDate.toLocaleDateString("en-US", { weekday: "long" });
      }
      
      if (!groups[label]) groups[label] = [];
      groups[label].push({ ...version, idx });
    });
    
    return groups;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your portfolio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => selectedContent ? setSelectedContent(null) : navigate('/content-creator')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <Palette className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Content Creator Portal
                </span>
                <p className="text-sm text-gray-500">
                  {selectedContent ? 'Content Details' : 'Portfolio'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedContent ? (
          // Portfolio Grid View
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                My Content Portfolio
              </h1>
              <p className="text-gray-600 mt-3 text-lg">View your created content, versions, and customer feedback</p>
            </div>

            {portfolioItems.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Palette className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No content created yet</h3>
                <p className="text-gray-500 mb-6">Start working on your first assignment to build your portfolio!</p>
                <button
                  onClick={() => navigate('/content-creator/assignments')}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-200"
                >
                  View Assignments
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {portfolioItems.map((item) => {
                  const latestVersion = item.versions[item.versions.length - 1];
                  const firstMedia = latestVersion?.media?.[0];
                  
                  return (
                    <div
                      key={item.id}
                      className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                      style={{ width: 340, minWidth: 340, maxWidth: 340, height: 480, minHeight: 480, maxHeight: 480, display: 'flex', flexDirection: 'column' }}
                    >
                      {/* Content Preview */}
                      <div className="relative" style={{ width: '100%', height: 192 /* 48 * 4 = 192px */ }}>
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          firstMedia.type === 'image' ? (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-full" style={{ width: '100%', height: '100%' }}>
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          )
                        ) : null}
                        
                        {/* Fallback when no media or media fails to load */}
                        <div
                          className="w-full h-full bg-gray-200 flex items-center justify-center"
                          style={{ display: firstMedia?.url ? 'none' : 'flex', width: '100%', height: '100%' }}
                        >
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
                          </span>
                        </div>
                        
                        <div className="absolute top-4 left-4 flex gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                            <Image className="h-3 w-3 mr-1" />
                            {item.totalVersions} Version{item.totalVersions !== 1 ? 's' : ''}
                          </span>
                          {latestVersion?.media && latestVersion.media.length > 1 && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                              {latestVersion.media.length} Media
                            </span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleViewContent(item)}
                          className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-all duration-200 shadow-lg"
                        >
                          <Eye className="h-4 w-4 text-gray-700" />
                        </button>
                      </div>

                      {/* Content Details */}
                      <div className="p-6 flex-1 flex flex-col" style={{ overflow: 'hidden' }}>
                        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                        
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center text-gray-500">
                              <User className="h-4 w-4 mr-1" />
                              <span className="font-medium">{item.customer}</span>
                              {item.customerId && (
                                <span className="ml-2 text-xs text-gray-400">
                                  (ID: {item.customerId.substring(0, 8)}...)
                                </span>
                              )}
                              {item.customerEmail && (
                                <span className="ml-2 text-xs text-gray-400">
                                  ({item.customerEmail})
                                </span>
                              )}
                            </div>
                            <div className="flex items-center text-gray-500">
                              <Calendar className="h-4 w-4 mr-1" />
                              {formatDate(item.createdDate)}
                            </div>
                          </div>

                          {/* Add hashtags display */}
                          {item.hashtags && (
                            <div className="text-sm">
                              <span className="text-gray-500">Hashtags: </span>
                              <span className="text-blue-600 font-medium">{item.hashtags}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500">Platform: {item.platform}</span>
                            <span className="text-gray-500">
                              Updated: {formatDate(item.lastUpdated)}
                            </span>
                          </div>

                          {item.customerFeedback.length > 0 && (
                            <div className="flex items-center text-sm text-blue-600">
                              <MessageSquare className="h-4 w-4 mr-1" />
                              {item.customerFeedback.length} Comment{item.customerFeedback.length !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          
                          {(item.status === 'revision_requested' || item.customerFeedback.some(f => f.status === 'revision_requested')) && (
                            <button
                              onClick={() => handleUploadRevision(item.id)}
                              className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-2 px-4 rounded-xl hover:from-orange-600 hover:to-yellow-600 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Revision
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // Detailed Content View with Version History
          <div className="space-y-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedContent.title}</h1>
                  <p className="text-gray-600 mb-4">{selectedContent.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Customer</span>
                        <p className="text-sm text-gray-900 font-semibold">{selectedContent.customer}</p>
                        {selectedContent.customerId && (
                          <p className="text-xs text-gray-500">ID: {selectedContent.customerId}</p>
                        )}
                        {selectedContent.customerEmail && (
                          <p className="text-xs text-gray-500">Email: {selectedContent.customerEmail}</p>
                        )}
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
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(selectedContent.status)}`}>
                    {getStatusIcon(selectedContent.status)}
                    <span className="ml-2">{selectedContent.status.replace('_', ' ').toUpperCase()}</span>
                  </span>
                  
                  {(selectedContent.status === 'revision_requested' || selectedContent.customerFeedback.some(f => f.status === 'revision_requested')) && (
                    <button
                      onClick={() => handleUploadRevision(selectedContent.id)}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-yellow-600 transition-all duration-200"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Upload New Version
                    </button>
                  )}
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
                          onClick={() => handleVersionChange('prev')}
                          disabled={selectedVersionIndex === 0}
                          className="p-2 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleVersionChange('next')}
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
                                      onClick={() => handleMediaChange('prev')}
                                      disabled={selectedMediaIndex === 0}
                                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handleMediaChange('next')}
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
                                selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].type === 'image' ? (
                                  <img
                                    src={selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url}
                                    alt={`Version ${selectedContent.versions[selectedVersionIndex].versionNumber} - Media ${selectedMediaIndex + 1}`}
                                    className="max-w-full h-auto max-h-96 mx-auto rounded-xl shadow-lg border border-gray-200"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : (
                                  <video
                                    src={selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url}
                                    controls
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
                              
                              {/* Media Thumbnails */}
                              {selectedContent.versions[selectedVersionIndex].media.length > 1 && (
                                <div className="flex justify-center gap-2 mt-4">
                                  {selectedContent.versions[selectedVersionIndex].media.map((media, index) => (
                                    <button
                                      key={index}
                                      onClick={() => setSelectedMediaIndex(index)}
                                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                        selectedMediaIndex === index 
                                          ? 'border-purple-500 ring-2 ring-purple-200' 
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      {media.type === 'image' && media.url && typeof media.url === 'string' ? (
                                        <img
                                          src={media.url}
                                          alt={`Thumbnail ${index + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                          <Video className="h-6 w-6 text-gray-400" />
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Comment Markers - Display comments as floating markers on the media */}
                              {commentsForCurrentMedia.map((comment, index) => {
                                // Calculate floating box position
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
                                      handleCommentListClick(comment.id);
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
                                        {!comment.done && (
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleMarkDone(comment.id)}
                                              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center"
                                            >
                                              <CheckCircle className="h-3 w-3 mr-1" />
                                              Mark as Done
                                            </button>
                                          </div>
                                        )}
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

                          {/* Add hashtags display in detailed view */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-blue-600 font-medium">{selectedContent.versions[selectedVersionIndex].hashtags || 'No hashtags'}</p>
                            </div>
                          </div>

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
                      {Object.entries(groupVersionsByDate(selectedContent.versions)).map(([group, items]) => (
                        <div key={group}>
                          <div className="px-6 pt-4 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50/50">
                            {group}
                          </div>
                          {items.map((version) => {
                            const { date, time } = formatVersionDate(version.createdAt);
                            return (
                              <button
                                key={version.id}
                                onClick={() => handleVersionSelect(version.idx)}
                                className={`w-full text-left px-6 py-4 flex flex-col border-l-4 transition-all duration-200 hover:bg-gray-50 ${
                                  selectedVersionIndex === version.idx
                                    ? "bg-purple-50 border-l-purple-600"
                                    : "bg-white border-l-transparent"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-gray-900 text-base">
                                    {date}, {time}
                                  </span>
                                  {selectedVersionIndex === version.idx && (
                                    <span className="ml-2 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                                      Current version
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center mt-1 text-xs text-gray-500 gap-2">
                                  <span className="flex items-center">
                                    <User className="h-3 w-3 mr-1" />
                                    {version.customer_name || selectedContent.customer || "Customer"}
                                  </span>
                                  <span className="flex items-center ml-2">
                                    <span className={`h-2 w-2 rounded-full mr-1 ${
                                      selectedVersionIndex === version.idx ? "bg-purple-600" : "bg-gray-300"
                                    }`} />
                                    Version {version.versionNumber}
                                  </span>
                                  {version.media && version.media.length > 0 && (
                                    <span className="flex items-center ml-2">
                                      <Image className="h-3 w-3 mr-1" />
                                      {version.media.length}
                                    </span>
                                  )}
                                </div>
                                {(version.customer_id || selectedContent.customerId) && (
                                  <div className="mt-1 text-xs text-gray-400">
                                    Customer ID: {version.customer_id || selectedContent.customerId}
                                  </div>
                                )}
                                {(version.customer_email || selectedContent.customerEmail) && (
                                  <div className="mt-1 text-xs text-gray-400">
                                    Email: {version.customer_email || selectedContent.customerEmail}
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ))}
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
                          }`} onClick={() => handleCommentListClick(comment.id)}>
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
        )}
      </div>
    </div>
  );
}

export default ContentPortfolio;