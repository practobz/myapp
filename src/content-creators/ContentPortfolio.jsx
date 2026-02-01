import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Eye, MessageSquare, Calendar, User, Palette, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Image, FileText, Play, Video, Users } from 'lucide-react';

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
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [groupedByCustomer, setGroupedByCustomer] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);
  
  // Scheduled posts to check published status
  const [scheduledPosts, setScheduledPosts] = useState([]);

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
    fetchScheduledPosts();
  }, []);
  
  // Fetch scheduled posts
  const fetchScheduledPosts = async () => {
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
      if (!res.ok) {
        throw new Error(`Failed to fetch scheduled posts: ${res.statusText}`);
      }
      const data = await res.json();
      setScheduledPosts(data);
    } catch (err) {
      console.error('Failed to fetch scheduled posts:', err);
      setScheduledPosts([]); // Ensure scheduledPosts is an empty array on error
    }
  };

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

      // First, fetch calendars to determine which customers are assigned to this creator
      let assignedCustomerIds = [];
      let assignmentCalendarMap = {}; // Map assignment IDs to calendar info
      try {
        const calendarsRes = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        if (calendarsRes.ok) {
          const calendars = await calendarsRes.json();
          
          // Filter calendars assigned to this creator (by email)
          const assignedCalendars = calendars.filter(calendar => 
            calendar.assignedTo === creatorEmail || 
            (calendar.contentItems && calendar.contentItems.some(item => item.assignedTo === creatorEmail))
          );
          
          // Get unique customer IDs from assigned calendars
          assignedCustomerIds = [...new Set(assignedCalendars.map(cal => cal.customerId).filter(Boolean))];
          console.log('Assigned customer IDs for creator:', assignedCustomerIds);
          
          // Build a map of assignment IDs to calendar info for revision uploads
          assignedCalendars.forEach(calendar => {
            if (Array.isArray(calendar.contentItems)) {
              calendar.contentItems.forEach((item, index) => {
                const itemId = item.id || item._id || item.title;
                if (itemId) {
                  assignmentCalendarMap[itemId] = {
                    calendarId: calendar._id || calendar.id,
                    itemIndex: index
                  };
                }
              });
            }
          });
        }
      } catch (calendarError) {
        console.error('Error fetching calendars for filtering:', calendarError);
        // Continue without filtering if calendar fetch fails
      }

      const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      const submissions = await submissionsRes.json();

      if (!Array.isArray(submissions)) {
        throw new Error('Invalid data received');
      }

      // Filter submissions to only include those from assigned customers
      const filteredSubmissions = assignedCustomerIds.length > 0
        ? submissions.filter(submission => {
            const customerId = submission.customer_id || submission.customerId;
            return assignedCustomerIds.includes(customerId);
          })
        : submissions; // If no assigned customers found, show all (fallback)

      // Group submissions by assignment ID to handle versions
      const groupedSubmissions = {};
      filteredSubmissions.forEach(submission => {
        const assignmentId = submission.assignment_id || submission.assignmentId || 'unknown';
        if (!groupedSubmissions[assignmentId]) {
          groupedSubmissions[assignmentId] = [];
        }
        groupedSubmissions[assignmentId].push(submission);
      });

      // Show only assignments from assigned customers
      const portfolioData = [];
      Object.keys(groupedSubmissions).forEach(assignmentId => {
        const versions = groupedSubmissions[assignmentId].sort((a, b) =>
          new Date(a.created_at) - new Date(b.created_at)
        );
        const baseItem = versions[0];
        
        // Get calendar info for this assignment (for revision uploads)
        const calendarInfo = assignmentCalendarMap[assignmentId] || {};
        
        portfolioData.push({
          id: assignmentId,
          calendarId: calendarInfo.calendarId || null,
          itemIndex: calendarInfo.itemIndex !== undefined ? calendarInfo.itemIndex : null,
          title: baseItem.caption || 'Untitled Post',
          customer: baseItem.customer_name || baseItem.customerName || 'Customer', // Prioritize customer_name from database
          customerId: baseItem.customer_id || baseItem.customerId || '', // Use customer_id from database
          customerEmail: baseItem.customer_email || baseItem.customerEmail || '', // Add customer email
          customerMobile: baseItem.customer_mobile || baseItem.customerMobile || '', // Add customer mobile
          hashtags: baseItem.hashtags || '', // Add hashtags
          platform: baseItem.platform || 'Instagram',
          status: getActualStatus(assignmentId, getLatestStatus(versions)),
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
            customer_email: version.customer_email || version.customerEmail || '',
            customer_mobile: version.customer_mobile || version.customerMobile || '' // Add customer mobile to versions
          })),
          totalVersions: versions.length,
          customerFeedback: getAllFeedback(versions)
        });
      });

      setPortfolioItems(portfolioData);
      
      // Group portfolios by customer
      const customerGroups = {};
      portfolioData.forEach(item => {
        const customerId = item.customerId || 'unknown';
        if (!customerGroups[customerId]) {
          customerGroups[customerId] = {
            customerId: customerId,
            customerName: item.customer,
            customerEmail: item.customerEmail || '',
            portfolios: []
          };
        }
        customerGroups[customerId].portfolios.push(item);
      });
      setGroupedByCustomer(Object.values(customerGroups));
    } catch (error) {
      console.error('Error fetching portfolio items:', error);
      setPortfolioItems([]);
      setGroupedByCustomer([]);
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
  
  // Helper: check if content is published on any platform
  const isContentPublished = (assignmentId) => {
    return scheduledPosts.some(post => post.contentId === assignmentId && post.status === 'published');
  };
  
  // Helper: get actual status considering published posts
  const getActualStatus = (assignmentId, originalStatus) => {
    if (isContentPublished(assignmentId)) {
      return 'published';
    }
    return originalStatus || 'under_review';
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

  const handleUploadRevision = (content) => {
    // Use calendarId and itemIndex if available, otherwise show error
    if (content.calendarId && content.itemIndex !== null && content.itemIndex !== undefined) {
      navigate(`/content-creator/upload/${content.calendarId}/${content.itemIndex}`);
    } else {
      console.error('Cannot upload revision: missing calendar information for content:', content.id);
      alert('Unable to upload revision. Calendar information not found for this content.');
    }
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => {
                  if (selectedContent) {
                    setSelectedContent(null);
                  } else if (selectedCustomer) {
                    setSelectedCustomer(null);
                  } else {
                    navigate('/content-creator');
                  }
                }}
                className="mr-4 p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md">
                  <Palette className="h-5 w-5 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">Content Creator Portal</h1>
                  <p className="text-xs text-gray-500">
                    {selectedContent ? 'Content Details' : selectedCustomer ? selectedCustomer.customerName : 'My Portfolio'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Stats Summary in Header */}
            {!selectedContent && !selectedCustomer && portfolioItems.length > 0 && (
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{groupedByCustomer.length}</p>
                  <p className="text-xs text-gray-500">Customers</p>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{portfolioItems.length}</p>
                  <p className="text-xs text-gray-500">Total Projects</p>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-amber-600">
                    {portfolioItems.filter(i => {
                      const actualStatus = getActualStatus(i.id, i.status);
                      return actualStatus === 'under_review' || actualStatus === 'submitted';
                    }).length}
                  </p>
                  <p className="text-xs text-gray-500">In Review</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!selectedContent && !selectedCustomer ? (
          // Customer Cards View (Level 1)
          <div className="space-y-6">
            {/* Page Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">My Content Portfolio</h2>
                <p className="text-gray-500 mt-1">View your created content grouped by customer</p>
              </div>
              <button
                onClick={() => navigate('/content-creator/assignments')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Assignments
              </button>
            </div>

            {groupedByCustomer.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                <div className="bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
                  <Palette className="h-10 w-10 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No content created yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">Start working on your first assignment to build your portfolio and showcase your work!</p>
                <button
                  onClick={() => navigate('/content-creator/assignments')}
                  className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  View Assignments
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedByCustomer.map((customerData) => {
                  const totalPortfolios = customerData.portfolios.length;
                  const approvedCount = customerData.portfolios.filter(p => {
                    const actualStatus = getActualStatus(p.id, p.status);
                    return actualStatus === 'approved' || actualStatus === 'published';
                  }).length;
                  const pendingCount = customerData.portfolios.filter(p => {
                    const actualStatus = getActualStatus(p.id, p.status);
                    return actualStatus === 'under_review' || actualStatus === 'submitted';
                  }).length;
                  
                  return (
                    <div
                      key={customerData.customerId}
                      className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col"
                    >
                      <div className="p-5 flex-1 flex flex-col">
                        {/* Customer Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-white font-bold text-lg">
                                {customerData.customerName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{customerData.customerName}</h3>
                              {customerData.customerEmail && (
                                <p className="text-sm text-gray-500 truncate max-w-[180px]">{customerData.customerEmail}</p>
                              )}
                              <p className="text-xs text-gray-400">ID: {customerData.customerId}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          <div className="text-center bg-purple-50 rounded-lg p-2">
                            <div className="text-xl font-bold text-purple-600">{totalPortfolios}</div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                          <div className="text-center bg-green-50 rounded-lg p-2">
                            <div className="text-xl font-bold text-green-600">{approvedCount}</div>
                            <div className="text-xs text-gray-500">Approved</div>
                          </div>
                          <div className="text-center bg-amber-50 rounded-lg p-2">
                            <div className="text-xl font-bold text-amber-600">{pendingCount}</div>
                            <div className="text-xs text-gray-500">Pending</div>
                          </div>
                        </div>

                        {/* Recent Portfolios Preview */}
                        <div className="space-y-2 mb-4 flex-1" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                          {customerData.portfolios.slice(0, 5).map((portfolio) => (
                            <div key={portfolio.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2 min-w-0 flex-1">
                                <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                                <span className="text-sm font-medium truncate text-gray-700">{portfolio.title}</span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ml-2 ${getStatusColor(getActualStatus(portfolio.id, portfolio.status))}`}>
                                {getActualStatus(portfolio.id, portfolio.status).replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                          {customerData.portfolios.length > 5 && (
                            <div className="text-center text-sm text-gray-400">
                              +{customerData.portfolios.length - 5} more items
                            </div>
                          )}
                        </div>

                        {/* View Button */}
                        <button
                          onClick={() => setSelectedCustomer(customerData)}
                          className="w-full mt-auto bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2.5 px-4 rounded-xl hover:opacity-90 text-sm font-semibold transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Portfolio
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : selectedCustomer && !selectedContent ? (
          // Portfolio Grid View for Selected Customer (Level 2)
          <div className="space-y-6">
            {/* Page Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedCustomer.customerName}'s Content</h2>
                <p className="text-gray-500 mt-1">
                  {selectedCustomer.portfolios.length} project{selectedCustomer.portfolios.length !== 1 ? 's' : ''} • 
                  ID: {selectedCustomer.customerId}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Customers
              </button>
            </div>

            {selectedCustomer.portfolios.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
                <div className="bg-purple-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-5">
                  <FileText className="h-10 w-10 text-purple-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No content created yet</h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">This customer doesn't have any content in their portfolio.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {selectedCustomer.portfolios.map((item) => {
                  const latestVersion = item.versions[item.versions.length - 1];
                  const firstMedia = latestVersion?.media?.[0];
                  
                  return (
                    <div key={item.id} className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col">
                      {/* Content Preview */}
                      <div className="relative h-40 bg-gray-100">
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          firstMedia.type === 'image' ? (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <div className="bg-white/90 rounded-full p-3">
                                  <Play className="h-8 w-8 text-purple-600" />
                                </div>
                              </div>
                            </div>
                          )
                        ) : null}
                        
                        {/* Fallback when no media or media fails to load */}
                        <div className="w-full h-full bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                          <Image className="h-16 w-16 text-purple-300" />
                        </div>
                        
                        {/* Status Badge - Top Right */}
                        <div className="absolute top-3 right-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold shadow-sm ${getStatusColor(getActualStatus(item.id, item.status))}`}>
                            {getStatusIcon(getActualStatus(item.id, item.status))}
                            <span className="ml-1.5">{getActualStatus(item.id, item.status).replace('_', ' ').toUpperCase()}</span>
                          </span>
                        </div>
                        
                        {/* Version Badge - Top Left */}
                        <div className="absolute top-3 left-3">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-600 text-white shadow-sm">
                            <Image className="h-3 w-3 mr-1" />
                            {item.totalVersions} Version{item.totalVersions !== 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        {/* Quick View Button */}
                        <button
                          onClick={() => handleViewContent(item)}
                          className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm p-2.5 rounded-xl hover:bg-white hover:scale-105 transition-all duration-200 shadow-lg opacity-0 group-hover:opacity-100"
                        >
                          <Eye className="h-5 w-5 text-purple-600" />
                        </button>
                      </div>

                      {/* Content Details */}
                      <div className="p-5 flex flex-col flex-1">
                        {/* Title */}
                        <h3 className="font-bold text-lg text-gray-900 mb-1 line-clamp-1">{item.title}</h3>
                        
                        {/* Platform Badge */}
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{item.platform}</span>
                        </div>

                        {/* Hashtags */}
                        {item.hashtags && (
                          <div className="mb-3">
                            <p className="text-sm text-blue-600 font-medium line-clamp-1">{item.hashtags}</p>
                          </div>
                        )}

                        {/* Meta Info */}
                        <div className="flex items-center justify-between text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{formatDate(item.lastUpdated)}</span>
                          </div>
                          {item.customerFeedback.length > 0 && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span className="font-medium">{item.customerFeedback.length} Comment{item.customerFeedback.length !== 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        <div className="mt-auto">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                          >
                            <Eye className="h-4 w-4" />
                            <span>View Details</span>
                          </button>
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
          <div className="space-y-6">
            {/* Content Header Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedContent.title}</h1>
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold ${getStatusColor(getActualStatus(selectedContent.id, selectedContent.status))}`}>
                      {getStatusIcon(getActualStatus(selectedContent.id, selectedContent.status))}
                      <span className="ml-1.5">{getActualStatus(selectedContent.id, selectedContent.status).replace('_', ' ').toUpperCase()}</span>
                    </span>
                  </div>
                  {selectedContent.description && (
                    <p className="text-gray-600 mb-5">{selectedContent.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-6">
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Customer</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedContent.customer}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Calendar className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Platform</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedContent.platform}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-gray-50 px-4 py-2.5 rounded-xl">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Image className="h-4 w-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Versions</p>
                        <p className="text-sm font-semibold text-gray-900">{selectedContent.totalVersions}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  {(selectedContent.status === 'revision_requested' || selectedContent.customerFeedback.some(f => f.status === 'revision_requested')) && (
                    <button
                      onClick={() => handleUploadRevision(selectedContent)}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-sm"
                    >
                      <Upload className="h-4 w-4" />
                      Upload New Version
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedContent(null)}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Portfolio
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Version Display */}
              <div className="xl:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Image className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            Version {selectedContent.versions[selectedVersionIndex]?.versionNumber}
                          </h3>
                          <p className="text-xs text-gray-500">
                            of {selectedContent.totalVersions} total versions
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleVersionChange('prev')}
                          disabled={selectedVersionIndex === 0}
                          className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleVersionChange('next')}
                          disabled={selectedVersionIndex === selectedContent.versions.length - 1}
                          className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <ChevronRight className="h-4 w-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    {selectedContent.versions[selectedVersionIndex] && (
                      <div className="space-y-5">
                        {/* Media Display */}
                        <div>
                          {selectedContent.versions[selectedVersionIndex].media && selectedContent.versions[selectedVersionIndex].media.length > 0 ? (
                            <div>
                              {/* Media Navigation for multiple items */}
                              {selectedContent.versions[selectedVersionIndex].media.length > 1 && (
                                <div className="flex items-center justify-between mb-3 px-1">
                                  <span className="text-sm font-medium text-gray-600">
                                    Media {selectedMediaIndex + 1} of {selectedContent.versions[selectedVersionIndex].media.length}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleMediaChange('prev')}
                                      disabled={selectedMediaIndex === 0}
                                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                      <ChevronLeft className="h-4 w-4 text-gray-600" />
                                    </button>
                                    <button
                                      onClick={() => handleMediaChange('next')}
                                      disabled={selectedMediaIndex === selectedContent.versions[selectedVersionIndex].media.length - 1}
                                      className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                      <ChevronRight className="h-4 w-4 text-gray-600" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Current Media Item with Comment Markers - relative container for positioning */}
                              <div className="flex justify-center">
                                <div className="relative inline-block">
                                  {selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex] && 
                                   selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url &&
                                   typeof selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url === 'string' ? (
                                    selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].type === 'image' ? (
                                      <img
                                        src={selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url}
                                        alt={`Version ${selectedContent.versions[selectedVersionIndex].versionNumber} - Media ${selectedMediaIndex + 1}`}
                                        className="max-w-full h-auto max-h-96 rounded-xl shadow-lg border border-gray-200"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : (
                                      <video
                                        src={selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url}
                                        controls
                                        className="max-w-full h-auto max-h-96 rounded-xl shadow-lg border border-gray-200"
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    )
                                  ) : (
                                    <div 
                                      className="w-80 h-96 bg-gray-200 rounded-xl flex items-center justify-center"
                                    >
                                      <div className="text-center">
                                        <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                        <p className="text-gray-500">Media unavailable</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Comment Markers - Positioned relative to the media */}
                                  {commentsForCurrentMedia.map((comment, index) => {
                                    const commentX = comment.x || comment.position?.x || 0;
                                    const commentY = comment.y || comment.position?.y || 0;
                                    
                                    // Calculate floating box position based on comment position
                                    let boxLeft = 40;
                                    let boxRight = "auto";
                                    if (commentX > 150) {
                                      boxLeft = "auto";
                                      boxRight = 40;
                                    }

                                    return (
                                      <div
                                        key={comment.id}
                                        style={{
                                          position: "absolute",
                                          top: commentY - 12,
                                          left: commentX - 12,
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
                                              border: "1px solid #3b82f6",
                                              borderRadius: "8px",
                                              padding: "12px",
                                              minWidth: "200px",
                                              maxWidth: "280px",
                                              zIndex: 20,
                                              boxShadow: "0 4px 20px rgba(59,130,246,0.15)",
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <div className="mb-2">
                                              <p className="font-medium text-gray-900 text-sm leading-relaxed break-words">
                                                {comment.message || comment.comment}
                                                {comment.done && <span className="text-green-600 ml-2 text-xs">✓ Done</span>}
                                              </p>
                                              <p className="text-xs text-gray-500 mt-1">
                                                {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                                              </p>
                                            </div>
                                            {!comment.done && (
                                              <button
                                                onClick={() => handleMarkDone(comment.id)}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-200 flex items-center justify-center"
                                              >
                                                <CheckCircle className="h-3 w-3 mr-1" />
                                                Mark as Done
                                              </button>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
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
                                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
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
              <div className="space-y-5">
                {/* Version History Panel */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <FileText className="h-4 w-4 text-emerald-600" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Version History</h3>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    <div className="divide-y divide-gray-100">
                      {Object.entries(groupVersionsByDate(selectedContent.versions)).map(([group, items]) => (
                        <div key={group}>
                          <div className="px-5 pt-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                            {group}
                          </div>
                          {items.map((version) => {
                            const { date, time } = formatVersionDate(version.createdAt);
                            return (
                              <button
                                key={version.id}
                                onClick={() => handleVersionSelect(version.idx)}
                                className={`w-full text-left px-5 py-3 flex flex-col border-l-4 transition-all duration-200 hover:bg-gray-50 ${
                                  selectedVersionIndex === version.idx
                                    ? "bg-purple-50 border-l-purple-500"
                                    : "bg-white border-l-transparent"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {date}, {time}
                                  </span>
                                  {selectedVersionIndex === version.idx && (
                                    <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                                      Current
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center mt-1.5 text-xs text-gray-500 gap-3">
                                  <span className="flex items-center">
                                    <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                      selectedVersionIndex === version.idx ? "bg-purple-500" : "bg-gray-300"
                                    }`} />
                                    Version {version.versionNumber}
                                  </span>
                                  {version.media && version.media.length > 0 && (
                                    <span className="flex items-center">
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
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <MessageSquare className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">Comments</h3>
                          <p className="text-xs text-gray-500">
                            Version {selectedContent.versions[selectedVersionIndex]?.versionNumber} • Media {selectedMediaIndex + 1}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">
                        {commentsForCurrentMedia.length}
                      </span>
                    </div>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-4">
                    {commentsForCurrentMedia.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="bg-gray-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                          <MessageSquare className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">No comments yet</p>
                        <p className="text-gray-400 text-xs mt-1">Comments will appear here when added</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {commentsForCurrentMedia.map((comment, idx) => (
                          <div key={comment.id || idx} className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                            activeComment === comment.id
                              ? 'bg-purple-50 border-purple-200 shadow-sm'
                              : 'bg-gray-50 hover:bg-gray-100 border-gray-100 hover:border-gray-200'
                          }`} onClick={() => handleCommentListClick(comment.id)}>
                            <div className="flex items-start gap-3">
                              <span className="font-bold text-white bg-purple-500 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-800 break-words leading-relaxed">
                                  {comment.message || comment.comment}
                                </p>
                                <div className="flex items-center gap-3 mt-2">
                                  <p className="text-xs text-gray-400">
                                    {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                                  </p>
                                  {comment.done && (
                                    <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      Done
                                    </span>
                                  )}
                                </div>
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