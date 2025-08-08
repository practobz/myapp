import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Calendar, User, Tag, Loader2, Clock, Image } from 'lucide-react';

function ContentApproval() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');

  useEffect(() => {
    fetchContentData();
  }, [id]);

  const fetchContentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch content submissions to get the specific assignment
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      if (!response.ok) {
        throw new Error('Failed to fetch content data');
      }
      
      const submissions = await response.json();
      
      // Find submissions for this assignment ID
      const assignmentSubmissions = submissions.filter(sub => 
        (sub.assignment_id || sub.assignmentId) === id
      );
      
      if (assignmentSubmissions.length === 0) {
        throw new Error('Content not found');
      }
      
      // Sort by creation date and get the latest version
      const sortedVersions = assignmentSubmissions.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      const latestVersion = sortedVersions[0];
      
      // Normalize media data
      const normalizeMedia = (media) => {
        if (!media || !Array.isArray(media)) return [];
        return media.map(item => {
          if (typeof item === 'string') {
            return { url: item, type: getMediaType(item) };
          }
          if (item && typeof item === 'object') {
            const url = item.url || item.src || item.href || String(item);
            if (typeof url === 'string' && url.trim()) {
              return { url: url, type: item.type || getMediaType(url) };
            }
          }
          return null;
        }).filter(Boolean);
      };
      
      const getMediaType = (url) => {
        if (!url || typeof url !== 'string') return 'image';
        const extension = url.toLowerCase().split('.').pop();
        const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
        return videoExtensions.includes(extension) ? 'video' : 'image';
      };
      
      // Process hashtags
      const processHashtags = (caption) => {
        if (!caption) return [];
        const hashtagRegex = /#[\w]+/g;
        return caption.match(hashtagRegex) || [];
      };
      
      const contentData = {
        id: latestVersion.assignment_id || latestVersion.assignmentId,
        title: latestVersion.caption ? latestVersion.caption.substring(0, 50) + '...' : 'Untitled Post',
        description: latestVersion.notes || 'No description provided',
        createdBy: latestVersion.created_by || 'Content Creator',
        createdDate: latestVersion.created_at,
        platform: latestVersion.platform || 'Instagram',
        type: latestVersion.type || 'Post',
        media: normalizeMedia(latestVersion.media || latestVersion.images || []),
        caption: latestVersion.caption || '',
        notes: latestVersion.notes || '',
        hashtags: processHashtags(latestVersion.caption),
        status: latestVersion.status || 'under_review',
        customerId: latestVersion.customer_id || latestVersion.customerId,
        versionId: latestVersion._id,
        versions: sortedVersions.map((version, index) => ({
          id: version._id,
          versionNumber: sortedVersions.length - index,
          createdAt: version.created_at,
          status: version.status || 'under_review'
        }))
      };
      
      setContent(contentData);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!publishDate || !publishTime) {
      alert('Please select both publish date and time.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Update content status to approved
      const statusResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(content.id)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          approvalNotes: approvalNotes,
          approvedAt: new Date().toISOString(),
          versionId: content.versionId
        })
      });
      
      if (!statusResponse.ok) {
        throw new Error('Failed to update content status');
      }
      
      // Create scheduled post entry
      const scheduledDateTime = new Date(`${publishDate}T${publishTime}`);
      const firstMedia = content.media && content.media.length > 0 ? content.media[0] : null;
      
      const scheduleData = {
        caption: content.caption || 'Content post', // Provide default if empty
        imageUrl: firstMedia?.url || '',
        platform: (content.platform || 'instagram').toLowerCase(),
        scheduledAt: scheduledDateTime.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        status: 'approved_pending_setup', // Use the correct status for approved content
        contentId: content.id,
        customerId: content.customerId,
        approvalNotes: approvalNotes,
        media: content.media,
        // Add the assignment details for reference
        assignmentId: content.id,
        versionId: content.versionId
      };

      console.log('📅 Scheduling data:', scheduleData);
      
      const scheduleResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleData)
      });
      
      if (!scheduleResponse.ok) {
        const errorData = await scheduleResponse.json();
        console.error('❌ Schedule error:', errorData);
        throw new Error(errorData.error || 'Failed to schedule post');
      }
      
      alert('Content approved and scheduled successfully!');
      navigate('/customer/content-review');
      
    } catch (error) {
      console.error('Error approving content:', error);
      alert(`Failed to approve content: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!approvalNotes.trim()) {
      alert('Please provide feedback for rejection.');
      return;
    }
    
    try {
      setSubmitting(true);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(content.id)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: approvalNotes,
          rejectedAt: new Date().toISOString(),
          versionId: content.versionId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to reject content');
      }
      
      alert('Content rejected. Creator will be notified.');
      navigate('/customer/content-review');
      
    } catch (error) {
      console.error('Error rejecting content:', error);
      alert(`Failed to reject content: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 font-medium">Loading content for approval...</p>
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{error || 'Content not found'}</p>
          <button
            onClick={() => navigate('/customer/content-review')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Content Review
          </button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/customer/content-review')}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-3">
                <span className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  Content Approval
                </span>
                <p className="text-sm text-gray-500">Review and approve content for publishing</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Content Preview */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Image className="h-5 w-5 mr-2 text-blue-600" />
                Content Preview
              </h2>
              
              {/* Media Display */}
              <div className="mb-6">
                {content.media && content.media.length > 0 ? (
                  content.media[0].type === 'image' ? (
                    <img 
                      src={content.media[0].url} 
                      alt={content.title}
                      className="w-full h-80 object-cover rounded-xl shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : (
                    <video
                      src={content.media[0].url}
                      controls
                      className="w-full h-80 object-cover rounded-xl shadow-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  )
                ) : null}
                
                {/* Fallback for missing media */}
                <div 
                  className="w-full h-80 bg-gray-200 rounded-xl flex items-center justify-center"
                  style={{ display: (content.media && content.media.length > 0) ? 'none' : 'flex' }}
                >
                  <div className="text-center">
                    <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">No media available</p>
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div className="mb-4">
                <h3 className="font-medium text-gray-900 mb-2">Caption</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                  {content.caption || 'No caption provided'}
                </p>
              </div>

              {/* Hashtags */}
              {content.hashtags && content.hashtags.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Hashtags</h3>
                  <div className="flex flex-wrap gap-2">
                    {content.hashtags.map((tag, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-lg text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Content Details */}
              <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-gray-600">Created by:</span>
                  <span className="ml-2 font-medium">{content.createdBy}</span>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-gray-600">Created:</span>
                  <span className="ml-2 font-medium">{formatDate(content.createdDate)}</span>
                </div>
                <div className="flex items-center">
                  <Tag className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-gray-600">Platform:</span>
                  <span className="ml-2 font-medium">{content.platform}</span>
                </div>
                <div className="flex items-center">
                  <Clock className="h-4 w-4 text-gray-500 mr-2" />
                  <span className="text-gray-600">Versions:</span>
                  <span className="ml-2 font-medium">{content.versions.length}</span>
                </div>
              </div>

              {/* Notes */}
              {content.notes && (
                <div className="mt-4">
                  <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {content.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Approval Form */}
          <div className="space-y-6">
            {/* Publishing Schedule */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-green-600" />
                Publishing Schedule
              </h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="publishDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Publish Date *
                  </label>
                  <input
                    type="date"
                    id="publishDate"
                    value={publishDate}
                    onChange={(e) => setPublishDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="publishTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Publish Time *
                  </label>
                  <input
                    type="time"
                    id="publishTime"
                    value={publishTime}
                    onChange={(e) => setPublishTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Approval Notes */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
                Approval Notes
              </h2>
              <textarea
                placeholder="Add any notes or feedback for the content creator..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <button
                onClick={handleApprove}
                disabled={submitting || !publishDate || !publishTime}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-6 rounded-xl hover:from-green-700 hover:to-emerald-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5 mr-2" />
                )}
                {submitting ? 'Processing...' : 'Approve & Schedule'}
              </button>
              <button
                onClick={handleReject}
                disabled={submitting}
                className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white py-3 px-6 rounded-xl hover:from-red-700 hover:to-pink-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {submitting ? (
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-5 w-5 mr-2" />
                )}
                {submitting ? 'Processing...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentApproval;