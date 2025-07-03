import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Eye, MessageSquare, Calendar, User, Palette, Clock, CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Image, FileText } from 'lucide-react';

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
  const [commentsForVersion, setCommentsForVersion] = useState([]);

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

  const fetchPortfolioItems = async () => {
    try {
      setLoading(true);

      const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      const submissions = await submissionsRes.json();

      if (!Array.isArray(submissions)) {
        throw new Error('Invalid data received');
      }

      // Group submissions by assignment ID to handle versions (same as ContentReview.jsx)
      const groupedSubmissions = {};
      submissions.forEach(submission => {
        const assignmentId = submission.assignment_id || submission.assignmentId || 'unknown';
        if (!groupedSubmissions[assignmentId]) {
          groupedSubmissions[assignmentId] = [];
        }
        groupedSubmissions[assignmentId].push(submission);
      });

      // DEBUG: Log creatorEmail and created_by for each version
      // console.log('Current creatorEmail:', creatorEmail);
      // Object.values(groupedSubmissions).forEach(versions =>
      //   versions.forEach(v => console.log('Version created_by:', v.created_by))
      // );

      // Show ALL assignments (remove filter on created_by)
      const portfolioData = [];
      Object.keys(groupedSubmissions).forEach(assignmentId => {
        const versions = groupedSubmissions[assignmentId].sort((a, b) =>
          new Date(a.created_at) - new Date(b.created_at)
        );
        const baseItem = versions[0];
        portfolioData.push({
          id: assignmentId,
          title: baseItem.caption || 'Untitled Post',
          customer: 'Customer',
          platform: baseItem.platform || 'Instagram',
          status: getLatestStatus(versions),
          createdDate: baseItem.created_at,
          lastUpdated: versions[versions.length - 1].created_at,
          description: baseItem.notes || '',
          versions: versions.map((version, index) => ({
            id: version._id,
            assignment_id: version.assignment_id,
            versionNumber: index + 1,
            imageUrl: version.images?.[0] || '',
            caption: version.caption || '',
            notes: version.notes || '',
            createdAt: version.created_at,
            status: version.status || 'submitted',
            comments: version.comments || []
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
  };

  const handleVersionSelect = (index) => {
    setSelectedVersionIndex(index);
  };

  const handleVersionChange = (direction) => {
    if (direction === 'prev' && selectedVersionIndex > 0) {
      setSelectedVersionIndex(selectedVersionIndex - 1);
    } else if (direction === 'next' && selectedVersionIndex < selectedContent.versions.length - 1) {
      setSelectedVersionIndex(selectedVersionIndex + 1);
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
                {portfolioItems.map((item) => (
                  <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                    {/* Content Image */}
                    <div className="relative">
                      <img 
                        src={item.versions[item.versions.length - 1]?.imageUrl} 
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute top-4 right-4 flex gap-2">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                          {getStatusIcon(item.status)}
                          <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
                        </span>
                      </div>
                      <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                          <Image className="h-3 w-3 mr-1" />
                          {item.totalVersions} Version{item.totalVersions !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <button
                        onClick={() => handleViewContent(item)}
                        className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm p-2 rounded-full hover:bg-white transition-all duration-200 shadow-lg"
                      >
                        <Eye className="h-4 w-4 text-gray-700" />
                      </button>
                    </div>

                    {/* Content Details */}
                    <div className="p-6">
                      <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                      
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center text-gray-500">
                            <User className="h-4 w-4 mr-1" />
                            {item.customer}
                          </div>
                          <div className="flex items-center text-gray-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(item.createdDate)}
                          </div>
                        </div>

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
                ))}
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
                        <div className="text-center">
                          <img
                            src={selectedContent.versions[selectedVersionIndex].imageUrl}
                            alt={`Version ${selectedContent.versions[selectedVersionIndex].versionNumber}`}
                            className="max-w-full h-auto max-h-96 mx-auto rounded-xl shadow-lg border border-gray-200"
                          />
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-gray-900">{selectedContent.versions[selectedVersionIndex].caption || 'No caption'}</p>
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
                                    {selectedContent.customer || "Customer"}
                                  </span>
                                  <span className="flex items-center ml-2">
                                    <span className={`h-2 w-2 rounded-full mr-1 ${
                                      selectedVersionIndex === version.idx ? "bg-purple-600" : "bg-gray-300"
                                    }`} />
                                    Version {version.versionNumber}
                                  </span>
                                </div>
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
                      Comments for Version {selectedContent.versions[selectedVersionIndex]?.versionNumber} ({commentsForVersion.length})
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-4">
                    {commentsForVersion.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <MessageSquare className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm">No comments for this version</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {commentsForVersion.map((comment, idx) => (
                          <div key={comment.id || idx} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                            <div className="flex items-start space-x-3">
                              <span className="font-bold text-purple-600 bg-purple-100 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 break-words">
                                  {comment.message || comment.comment}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
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
        )}
      </div>
    </div>
  );
}

export default ContentPortfolio;