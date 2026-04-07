import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Upload, Image, X, Check, CheckCircle, FileText, Calendar,
  Palette, Send, Tag, MessageSquare, Play, Video, ChevronDown,
  ChevronUp, ChevronLeft, ChevronRight, Clock, User, History, MapPin
} from 'lucide-react';
import Footer from '../admin/components/layout/Footer';

// Helper to get creator email from localStorage
function getCreatorEmail() {
  let email = '';
  try {
    email = (localStorage.getItem('userEmail') || '').toLowerCase();
    if (!email) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.email) email = userObj.email.toLowerCase();
      }
    }
  } catch (e) {}
  return email;
}

function ContentDetails() {
  const navigate = useNavigate();
  const { calendarId, itemIndex } = useParams();
  const fileInputRef = useRef(null);
  const mediaImgRef = useRef(null);
  const creatorEmail = getCreatorEmail();

  // Accordion open/close state
  const [submitWorkOpen, setSubmitWorkOpen] = useState(true);
  const [versionHistoryOpen, setVersionHistoryOpen] = useState(true);

  // Assignment data
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [previousSubmissionLoaded, setPreviousSubmissionLoaded] = useState(false);

  // Version history
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);
  const [imgDimensions, setImgDimensions] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!creatorEmail) navigate('/content-creator/login');
  }, [creatorEmail, navigate]);

  // Fetch assignment from calendar data
  useEffect(() => {
    const fetchAssignment = async () => {
      setLoading(true);
      try {
        const customersRes = await fetch(`${process.env.REACT_APP_API_URL}/api/customers`);
        const customersData = await customersRes.json();
        const customerMap = {};
        if (Array.isArray(customersData.customers)) {
          customersData.customers.forEach(c => {
            customerMap[c._id || c.id] = {
              name: c.name || c.customerName || c.email || '',
              email: c.email || '',
            };
          });
        }

        const res = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await res.json();
        let found = null;

        calendars.forEach((calendar) => {
          const customerId = calendar.customerId || calendar.customer_id || calendar.customer?._id || '';
          const customerInfo = customerMap[customerId] || {};
          if (Array.isArray(calendar.contentItems)) {
            const idx = parseInt(itemIndex, 10);
            if (!isNaN(idx) && calendar._id === calendarId && calendar.contentItems[idx]) {
              const item = calendar.contentItems[idx];
              found = {
                ...item,
                calendarName: calendar.name || calendar.customerName || calendar.customer || '',
                calendarId: calendar._id,
                customerId,
                customerName: customerInfo.name || calendar.customerName || calendar.name || '',
                customerEmail: customerInfo.email || '',
                id: item.id || item._id || item.title,
                dueDate: item.dueDate || item.due_date || item.date,
                platform: item.platform || 'Instagram',
                requirements: item.requirements || [],
              };
            }
          }
        });
        setAssignment(found);
      } catch (err) {
        setAssignment(null);
      } finally {
        setLoading(false);
      }
    };

    if (calendarId && itemIndex !== undefined) fetchAssignment();
  }, [calendarId, itemIndex]);

  // Fetch version history for this specific assignment
  const fetchVersions = async (assignmentId) => {
    if (!assignmentId) return;
    setVersionsLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      if (!response.ok) return;
      const data = await response.json();
      const submissions = Array.isArray(data) ? data : (data.submissions || []);
      const filtered = submissions.filter(sub => {
        const subId = sub.assignment_id || sub.assignmentId || sub.assignmentID;
        return String(subId) === String(assignmentId);
      });
      filtered.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

      // Normalize to the same shape as ContentPortfolio's selectedContent.versions
      const normMedia = (media) => {
        if (!media || !Array.isArray(media)) return [];
        const getType = (url) => {
          if (!url || typeof url !== 'string') return 'image';
          const ext = url.toLowerCase().split('.').pop();
          return ['mp4','webm','ogg','mov','avi'].includes(ext) ? 'video' : 'image';
        };
        return media.map(item => {
          if (typeof item === 'string') return { url: item, type: getType(item) };
          if (item?.url && typeof item.url === 'string') return { url: item.url, type: item.type || getType(item.url) };
          return null;
        }).filter(Boolean);
      };

      const normalized = filtered.map((version, idx) => ({
        id: version._id,
        versionNumber: idx + 1,
        media: normMedia(version.media || version.images || []),
        caption: version.caption || '',
        hashtags: version.hashtags || '',
        notes: version.notes || '',
        createdAt: version.created_at,
        status: version.status || 'submitted',
        comments: version.comments || [],
        customer_name: version.customer_name || '',
        customer_id: version.customer_id || '',
        customer_email: version.customer_email || '',
      }));

      setVersions(normalized);
      if (normalized.length > 0) {
        setSelectedVersionIndex(normalized.length - 1);
        setSelectedMediaIndex(0);
      }
    } catch (err) {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  useEffect(() => {
    if (assignment?.id) fetchVersions(assignment.id);
  }, [assignment]);

  // Sync commentsForVersion when version selection changes
  useEffect(() => {
    if (versions.length > 0 && versions[selectedVersionIndex]) {
      setCommentsForVersion(versions[selectedVersionIndex].comments || []);
    } else {
      setCommentsForVersion([]);
    }
  }, [versions, selectedVersionIndex]);

  // Filter comments for currently selected media item
  useEffect(() => {
    const filtered = commentsForVersion.filter(comment => {
      const commentMediaIndex = comment.mediaIndex !== undefined ? comment.mediaIndex : 0;
      return commentMediaIndex === selectedMediaIndex;
    });
    setCommentsForCurrentMedia(filtered);
  }, [commentsForVersion, selectedMediaIndex]);

  // Reset image dimensions when version/media selection changes
  useEffect(() => {
    setImgDimensions(null);
  }, [selectedVersionIndex, selectedMediaIndex]);

  // Pre-fill caption/hashtags/notes from latest previous submission
  useEffect(() => {
    const prefill = async () => {
      if (!assignment?.id || previousSubmissionLoaded) return;
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
        if (!response.ok) { setPreviousSubmissionLoaded(true); return; }
        const data = await response.json();
        const submissions = Array.isArray(data) ? data : (data.submissions || []);
        const prev = submissions
          .filter(sub => String(sub.assignment_id || sub.assignmentId) === String(assignment.id))
          .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        if (prev.length > 0) {
          const latest = prev[0];
          if (latest.caption) setCaption(latest.caption);
          if (latest.hashtags) setHashtags(latest.hashtags);
          if (latest.notes) setNotes(latest.notes);
        }
      } catch (err) {}
      setPreviousSubmissionLoaded(true);
    };
    if (assignment && creatorEmail) prefill();
  }, [assignment, creatorEmail, previousSubmissionLoaded]);

  // ── Drag & Drop ──────────────────────────────────────────────────────────────
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files?.[0]) handleFiles(e.target.files);
  };

  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const preview = URL.createObjectURL(file);
        setUploadedFiles(prev => [...prev, {
          id: Date.now() + Math.random(),
          file, preview, name: file.name, size: file.size,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          uploaded: false, uploading: false, publicUrl: null, error: null,
        }]);
      }
    });
  };

  const removeFile = (fileId) => setUploadedFiles(prev => prev.filter(f => f.id !== fileId));

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ── GCS Upload ───────────────────────────────────────────────────────────────
  const uploadFileToGCS = async (fileObj) => {
    setUploadedFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, uploading: true, error: null } : f));
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(fileObj.file);
      });

      const uploadResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/upload-base64`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: fileObj.name, contentType: fileObj.file.type, base64Data }),
      });

      if (!uploadResponse.ok) {
        const err = await uploadResponse.json();
        throw new Error(err.error || uploadResponse.statusText);
      }

      const { publicUrl } = await uploadResponse.json();
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileObj.id ? { ...f, uploading: false, uploaded: true, publicUrl, error: null } : f
      ));
      return { url: publicUrl, type: fileObj.type, name: fileObj.name, size: fileObj.file.size };
    } catch (error) {
      setUploadedFiles(prev => prev.map(f =>
        f.id === fileObj.id ? { ...f, uploading: false, uploaded: false, error: error.message } : f
      ));
      throw error;
    }
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) { alert('Please upload at least one image or video'); return; }
    if (!assignment) { alert('Assignment data not found. Please try again.'); return; }

    const finalCustomerId = assignment.customerId;
    const finalCustomerName = assignment.customerName;

    if (!finalCustomerId || !finalCustomerName || finalCustomerName === 'Unknown Customer') {
      alert('Missing customer information. Please refresh the page and try again.');
      return;
    }

    setSubmitting(true);
    const uploadedMediaUrls = [];

    try {
      const filesToUpload = uploadedFiles.filter(f => !f.uploaded);
      const alreadyUploaded = uploadedFiles.filter(f => f.uploaded);

      const results = await Promise.allSettled(filesToUpload.map(f => uploadFileToGCS(f)));
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') uploadedMediaUrls.push(result.value);
        else throw new Error(`Upload failed for ${filesToUpload[i].name}: ${result.reason.message}`);
      });

      alreadyUploaded.forEach(f => {
        if (f.publicUrl) uploadedMediaUrls.push({ url: f.publicUrl, type: f.type, name: f.name, size: f.size });
      });

      const submissionData = {
        assignment_id: assignment.id,
        caption: caption || '',
        hashtags: hashtags || '',
        notes: notes || '',
        images: uploadedMediaUrls,
        media: uploadedMediaUrls,
        created_by: creatorEmail,
        customer_id: finalCustomerId,
        customer_name: finalCustomerName,
        customer_email: assignment.customerEmail || '',
        platform: assignment.platform || 'Instagram',
        calendar_id: assignment.calendarId,
        calendar_name: assignment.calendarName,
        assignment_title: assignment.title,
        assignment_description: assignment.description,
        due_date: assignment.dueDate,
        status: 'submitted',
        created_at: new Date().toISOString(),
        type: 'submission',
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unknown error');
      }

      alert('Content submitted successfully! The customer will review your work.');

      // Reset upload form
      setUploadedFiles([]);
      setCaption('');
      setHashtags('');
      setNotes('');
      setPreviousSubmissionLoaded(false);

      // Refresh version history
      await fetchVersions(assignment.id);
    } catch (err) {
      alert(`Upload failed: ${err.message}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Version history helpers ──────────────────────────────────────────────────
  const getVersionStatusColor = (status) => {
    switch (status) {
      case 'under_review': case 'submitted': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'published': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'revision_requested': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAssignmentStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'under_review': case 'submitted': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'approved': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'published': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'revision_requested': return 'bg-orange-50 text-orange-700 border-orange-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Unknown date'; }
  };

  const formatVersionDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch { return { date: 'Invalid Date', time: '' }; }
  };

  const groupVersionsByDate = (versionList) => {
    const today = new Date();
    const groups = {};
    versionList.forEach((version, idx) => {
      const versionDate = new Date(version.createdAt);
      let label;
      if (
        versionDate.getDate() === today.getDate() &&
        versionDate.getMonth() === today.getMonth() &&
        versionDate.getFullYear() === today.getFullYear()
      ) {
        label = 'Today';
      } else {
        label = versionDate.toLocaleDateString('en-US', { weekday: 'long' });
      }
      if (!groups[label]) groups[label] = [];
      groups[label].push({ ...version, idx });
    });
    return groups;
  };

  const handleVersionSelect = (index) => {
    setSelectedVersionIndex(index);
    setSelectedMediaIndex(0);
  };

  const handleVersionChange = (direction) => {
    if (direction === 'prev' && selectedVersionIndex > 0) {
      setSelectedVersionIndex(selectedVersionIndex - 1);
      setSelectedMediaIndex(0);
    } else if (direction === 'next' && selectedVersionIndex < versions.length - 1) {
      setSelectedVersionIndex(selectedVersionIndex + 1);
      setSelectedMediaIndex(0);
    }
  };

  const handleMediaChange = (direction) => {
    const currentVersion = versions[selectedVersionIndex];
    if (!currentVersion) return;
    const mediaLength = currentVersion.media.length;
    if (direction === 'prev' && selectedMediaIndex > 0) setSelectedMediaIndex(selectedMediaIndex - 1);
    else if (direction === 'next' && selectedMediaIndex < mediaLength - 1) setSelectedMediaIndex(selectedMediaIndex + 1);
  };

  const handleCommentListClick = (id) => {
    setActiveComment(activeComment === id ? null : id);
  };

  const handleToggleDone = async (id) => {
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment && assignment) {
      const newDone = !comment.done;
      try {
        await fetch(
          `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(assignment.id)}/comments/${comment.id}`,
          { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: newDone, status: newDone ? 'completed' : 'pending' }) }
        );
      } catch (err) {}
      setCommentsForVersion(commentsForVersion.map(c => c.id === id ? { ...c, done: newDone } : c));
      setCommentsForCurrentMedia(commentsForCurrentMedia.map(c => c.id === id ? { ...c, done: newDone } : c));
      if (newDone) setActiveComment(null);
    }
  };

  const handleImgLoad = (e) => {
    const el = e.target;
    if (el.naturalWidth && el.naturalHeight) {
      setImgDimensions({ nw: el.naturalWidth, nh: el.naturalHeight, rw: el.clientWidth, rh: el.clientHeight });
    }
  };

  const getScaledMarkerPos = (commentX, commentY) => {
    if (!imgDimensions || !imgDimensions.nw) return { x: commentX, y: commentY };
    const { nw, nh, rw, rh } = imgDimensions;
    // Comment.jsx records positions at maxWidth:680, maxHeight:440
    const cs = Math.min(1, 680 / nw, 440 / nh);
    return {
      x: commentX * (rw / (nw * cs)),
      y: commentY * (rh / (nh * cs)),
    };
  };

  // ── Loading / Not found states ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <span className="text-lg text-gray-700">Loading assignment...</span>
        </div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <span className="text-lg text-red-600">Assignment not found.</span>
          <button
            onClick={() => navigate('/content-creator/assignments')}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 block mx-auto"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  // Derive display status: prefer latest version status, fall back to assignment status
  const displayStatus = versions.length > 0
    ? (versions[versions.length - 1].status || 'submitted')
    : (assignment.status || 'assigned');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/content-creator/assignments')}
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
                <p className="text-sm text-gray-500">Content Details</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page Body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">

        {/* ── Top Info Card ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{assignment.title}</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wide ${getAssignmentStatusColor(displayStatus)}`}>
                <Clock className="h-3 w-3" />
                {displayStatus.replace(/_/g, ' ')}
              </span>
            </div>
            <button
              onClick={() => navigate('/content-creator/portfolio')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-xl transition-all duration-200 whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Portfolio
            </button>
          </div>

          {/* Meta row */}
          <div className="mt-5 flex flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <User className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Customer</p>
                <p className="text-sm font-semibold text-gray-900">{assignment.customerName || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Platform</p>
                <p className="text-sm font-semibold text-gray-900">{assignment.platform || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Image className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Versions</p>
                <p className="text-sm font-semibold text-gray-900">{versions.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-6">
        {/* ── Accordion 1 : Submit Work ─────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Accordion trigger */}
          <button
            onClick={() => setSubmitWorkOpen(!submitWorkOpen)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Play className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Submit Work</h2>
                <p className="text-sm text-gray-500">Upload media, add caption &amp; hashtags, then submit for review</p>
              </div>
            </div>
            {submitWorkOpen
              ? <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
              : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
          </button>

          {/* Accordion body */}
          {submitWorkOpen && (
            <div className="border-t border-gray-100 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Upload + preview */}
                <div className="lg:col-span-2 space-y-6">

                  {/* Drop zone */}
                  <div>
                    <h3 className="text-base font-semibold mb-3 flex items-center gap-2 text-gray-800">
                      <Upload className="h-5 w-5 text-purple-600" />
                      Upload Media
                    </h3>
                    <div
                      className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                        dragActive
                          ? 'border-purple-400 bg-purple-50 scale-[1.02]'
                          : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,video/*"
                        onChange={handleChange}
                        className="hidden"
                      />
                      <div className="flex justify-center gap-3 mb-3">
                        <Upload className="h-8 w-8 text-gray-400" />
                        <Video className="h-8 w-8 text-gray-400" />
                      </div>
                      <p className="text-base font-medium text-gray-900">
                        Drag and drop your images and videos here
                      </p>
                      <p className="text-sm text-gray-500 my-1">or</p>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Browse Files
                      </button>
                      <p className="text-xs text-gray-400 mt-3">
                        Supports: JPG, PNG, GIF, MP4, MOV, AVI (Max 100 MB per file)
                      </p>
                    </div>
                  </div>

                  {/* Media preview grid */}
                  {uploadedFiles.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <Image className="h-5 w-5 text-purple-600" />
                        Media Files ({uploadedFiles.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {uploadedFiles.map(file => (
                          <div key={file.id} className="relative group">
                            <div
                              className="aspect-square rounded-lg overflow-hidden bg-gray-100 ring-2 ring-transparent group-hover:ring-purple-200 transition-all relative cursor-pointer"
                              onClick={() => setSelectedMedia(file)}
                            >
                              {file.type === 'image' ? (
                                <img src={file.preview} alt={file.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="relative w-full h-full">
                                  <video src={file.preview} className="w-full h-full object-cover" muted />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <Play className="h-8 w-8 text-white" />
                                  </div>
                                  <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
                                    VIDEO
                                  </div>
                                </div>
                              )}

                              {file.uploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <div className="text-white text-center">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-1"></div>
                                    <p className="text-xs">Uploading…</p>
                                  </div>
                                </div>
                              )}

                              {file.uploaded && (
                                <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                                  <Check className="h-3 w-3" />
                                </div>
                              )}

                              {file.error && (
                                <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                                  <div className="text-white text-center p-2">
                                    <X className="h-4 w-4 mx-auto mb-1" />
                                    <p className="text-xs">Failed</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            <button
                              onClick={() => removeFile(file.id)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                            >
                              <X className="h-3 w-3" />
                            </button>

                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              {file.error && (
                                <p className="text-xs text-red-500 mt-0.5 truncate">{file.error}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Assignment Info + Content Form + Submit */}
                <div className="space-y-4">

                  {/* Assignment details */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-purple-600" />
                      Assignment Details
                    </h3>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
                      {assignment.description && (
                        <p className="text-sm text-gray-600">{assignment.description}</p>
                      )}
                      <div className="flex items-center text-xs text-gray-500">
                        <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                        {assignment.customerName}
                      </div>
                      <div className="flex items-center text-xs text-gray-500">
                        <Calendar className="h-3 w-3 mr-1 flex-shrink-0" />
                        Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
                      </div>
                      {assignment.requirements?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-gray-700 mb-1">Requirements:</p>
                          <ul className="space-y-1">
                            {assignment.requirements.map((req, i) => (
                              <li key={i} className="flex items-start text-xs text-gray-600">
                                <Check className="h-3 w-3 mr-1.5 mt-0.5 text-green-500 flex-shrink-0" />
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Caption / Hashtags / Notes */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
                          Caption
                        </span>
                      </label>
                      <textarea
                        value={caption}
                        onChange={e => setCaption(e.target.value)}
                        rows={3}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        placeholder="Write an engaging caption…"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center gap-1">
                          <Tag className="h-3.5 w-3.5 text-purple-500" />
                          Hashtags
                        </span>
                      </label>
                      <input
                        type="text"
                        value={hashtags}
                        onChange={e => setHashtags(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="#fashion #summer #style"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes for Client
                      </label>
                      <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        rows={2}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        placeholder="Additional notes…"
                      />
                    </div>
                  </div>

                  {/* Submit button */}
                  <div className="bg-purple-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      Content will be sent to <strong>{assignment.customerName}</strong> for review
                    </p>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting || uploadedFiles.length === 0 || uploadedFiles.some(f => f.uploading)}
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-md"
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Submitting…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Content
                        </>
                      )}
                    </button>
                    {uploadedFiles.some(f => f.uploading) && (
                      <p className="text-xs text-gray-500 mt-2">Please wait for all uploads to complete</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Accordion 2 : Version History ─────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Accordion trigger */}
          <button
            onClick={() => setVersionHistoryOpen(!versionHistoryOpen)}
            className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors duration-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <History className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Version History</h2>
                <p className="text-sm text-gray-500">
                  {versions.length} {versions.length === 1 ? 'version' : 'versions'} submitted
                </p>
              </div>
            </div>
            {versionHistoryOpen
              ? <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
              : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
          </button>

          {/* Accordion body */}
          {versionHistoryOpen && (
            <div className="border-t border-gray-100 p-6">
              {versionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                    <History className="h-7 w-7 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium">No versions submitted yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Upload your first version using the Submit Work section above
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* ── Left 2/3: Version display ─── */}
                  <div className="xl:col-span-2">
                    <div className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden">
                      {/* Version display header */}
                      <div className="px-5 py-4 border-b border-gray-100 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <Image className="h-4 w-4 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="text-base font-semibold text-gray-900">
                                Version {versions[selectedVersionIndex]?.versionNumber}
                              </h3>
                              <p className="text-xs text-gray-500">of {versions.length} total versions</p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
                            {versions.map((v, i) => (
                              <button
                                key={v.id}
                                onClick={() => handleVersionSelect(i)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                  selectedVersionIndex === i
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700'
                                }`}
                              >
                                V{v.versionNumber}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="p-5">
                        {versions[selectedVersionIndex] && (
                          <div className="space-y-5">
                            {/* Media */}
                            <div>
                              {versions[selectedVersionIndex].media?.length > 0 ? (
                                <div>
                                  {versions[selectedVersionIndex].media.length > 1 && (
                                    <div className="flex items-center justify-between mb-3 px-1">
                                      <span className="text-sm font-medium text-gray-600">
                                        Media {selectedMediaIndex + 1} of {versions[selectedVersionIndex].media.length}
                                      </span>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleMediaChange('prev')}
                                          disabled={selectedMediaIndex === 0}
                                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                          <ChevronLeft className="h-4 w-4 text-gray-600" />
                                        </button>
                                        <button
                                          onClick={() => handleMediaChange('next')}
                                          disabled={selectedMediaIndex === versions[selectedVersionIndex].media.length - 1}
                                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                        >
                                          <ChevronRight className="h-4 w-4 text-gray-600" />
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Current media with comment markers */}
                                  <div className="flex justify-center">
                                    <div className="relative inline-block">
                                      {versions[selectedVersionIndex].media[selectedMediaIndex]?.url &&
                                       typeof versions[selectedVersionIndex].media[selectedMediaIndex].url === 'string' ? (
                                        versions[selectedVersionIndex].media[selectedMediaIndex].type === 'image' ? (
                                          <img
                                            ref={mediaImgRef}
                                            src={versions[selectedVersionIndex].media[selectedMediaIndex].url}
                                            alt={`Version ${versions[selectedVersionIndex].versionNumber} - Media ${selectedMediaIndex + 1}`}
                                            className="max-w-full h-auto max-h-96 rounded-xl shadow-lg border border-gray-200"
                                            onLoad={handleImgLoad}
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                          />
                                        ) : (
                                          <video
                                            src={versions[selectedVersionIndex].media[selectedMediaIndex].url}
                                            controls
                                            className="max-w-full h-auto max-h-96 rounded-xl shadow-lg border border-gray-200"
                                          />
                                        )
                                      ) : (
                                        <div className="w-80 h-64 bg-gray-200 rounded-xl flex items-center justify-center">
                                          <div className="text-center">
                                            <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                            <p className="text-gray-500">Media unavailable</p>
                                          </div>
                                        </div>
                                      )}

                                      {/* Comment markers */}
                                      {commentsForCurrentMedia.map((comment, index) => {
                                        const commentX = comment.x || comment.position?.x || 0;
                                        const commentY = comment.y || comment.position?.y || 0;
                                        const { x: scaledX, y: scaledY } = getScaledMarkerPos(commentX, commentY);
                                        let boxLeft = 40;
                                        let boxRight = 'auto';
                                        if (imgDimensions?.rw ? scaledX > imgDimensions.rw / 2 : commentX > 150) { boxLeft = 'auto'; boxRight = 40; }
                                        return (
                                          <div
                                            key={comment.id}
                                            style={{
                                              position: 'absolute',
                                              top: scaledY - 12, left: scaledX - 12,
                                              width: 24, height: 24,
                                              background: comment.done ? '#10b981' : '#ef4444',
                                              color: '#fff', borderRadius: '50%',
                                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                                              fontWeight: 'bold', fontSize: '11px',
                                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                              cursor: 'pointer', zIndex: 10, border: '2px solid #fff',
                                            }}
                                            onMouseEnter={() => setHoveredComment(comment.id)}
                                            onMouseLeave={() => setHoveredComment(null)}
                                            onClick={(e) => { e.stopPropagation(); handleCommentListClick(comment.id); }}
                                          >
                                            {index + 1}
                                            {(activeComment === comment.id || hoveredComment === comment.id) && (
                                              <div
                                                style={{
                                                  position: 'absolute',
                                                  left: boxLeft, right: boxRight,
                                                  top: '50%', transform: 'translateY(-50%)',
                                                  background: '#fff', border: '1px solid #3b82f6',
                                                  borderRadius: '8px', padding: '12px',
                                                  minWidth: '200px', maxWidth: '280px',
                                                  zIndex: 20, boxShadow: '0 4px 20px rgba(59,130,246,0.15)',
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
                                                <button
                                                  onClick={() => handleToggleDone(comment.id)}
                                                  className={`w-full px-3 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center justify-center ${
                                                    comment.done
                                                      ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                                                      : 'bg-green-600 hover:bg-green-700 text-white'
                                                  }`}
                                                >
                                                  <CheckCircle className="h-3 w-3 mr-1" />
                                                  {comment.done ? 'Undo Done' : 'Mark as Done'}
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Media thumbnails */}
                                  {versions[selectedVersionIndex].media.length > 1 && (
                                    <div className="flex justify-center gap-2 mt-4">
                                      {versions[selectedVersionIndex].media.map((media, index) => (
                                        <button
                                          key={index}
                                          onClick={() => setSelectedMediaIndex(index)}
                                          className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                            selectedMediaIndex === index
                                              ? 'border-purple-500 ring-2 ring-purple-200'
                                              : 'border-gray-200 hover:border-gray-300'
                                          }`}
                                        >
                                          {media.type === 'image' && media.url ? (
                                            <img src={media.url} alt={`Thumbnail ${index + 1}`} className="w-full h-full object-cover" />
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
                                <div className="h-64 bg-gray-200 rounded-xl flex items-center justify-center">
                                  <div className="text-center">
                                    <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                    <p className="text-gray-500">No media available</p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Caption / Hashtags / Notes */}
                            <div className="space-y-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <p className="text-gray-900">{versions[selectedVersionIndex].caption || 'No caption'}</p>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <p className="text-blue-600 font-medium">{versions[selectedVersionIndex].hashtags || 'No hashtags'}</p>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <p className="text-gray-900">{versions[selectedVersionIndex].notes || 'No notes'}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-500">
                                <span>Created: {formatDate(versions[selectedVersionIndex].createdAt)}</span>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getVersionStatusColor(versions[selectedVersionIndex].status)}`}>
                                  {(versions[selectedVersionIndex].status || '').replace(/_/g, ' ').toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Right 1/3: Version History + Comments ─── */}
                  <div className="space-y-5">
                    {/* Version History panel */}
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
                          {Object.entries(groupVersionsByDate(versions)).map(([group, items]) => (
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
                                        ? 'bg-purple-50 border-l-purple-500'
                                        : 'bg-white border-l-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-medium text-gray-900 text-sm">{date}, {time}</span>
                                    </div>
                                    <div className="flex items-center mt-1.5 text-xs text-gray-500 gap-3">
                                      <span className="flex items-center">
                                        <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                          selectedVersionIndex === version.idx ? 'bg-purple-500' : 'bg-gray-300'
                                        }`} />
                                        Version {version.versionNumber}
                                      </span>
                                      {version.media?.length > 0 && (
                                        <span className="flex items-center">
                                          <Image className="h-3 w-3 mr-1" />
                                          {version.media.length}
                                        </span>
                                      )}
                                    </div>
                                    {version.customer_id && (
                                      <div className="mt-1 text-xs text-gray-400">Customer ID: {version.customer_id}</div>
                                    )}
                                    {version.customer_email && (
                                      <div className="mt-1 text-xs text-gray-400">Email: {version.customer_email}</div>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Comments panel */}
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
                                Version {versions[selectedVersionIndex]?.versionNumber} • Media {selectedMediaIndex + 1}
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
                              <div
                                key={comment.id || idx}
                                className={`p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                                  activeComment === comment.id
                                    ? 'bg-purple-50 border-purple-200 shadow-sm'
                                    : 'bg-gray-50 hover:bg-gray-100 border-gray-100 hover:border-gray-200'
                                }`}
                                onClick={() => handleCommentListClick(comment.id)}
                              >
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
                                      {comment.done ? (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleToggleDone(comment.id); }}
                                          className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-gray-100 px-1.5 py-0.5 rounded transition-colors"
                                        >
                                          <CheckCircle className="h-3 w-3 text-emerald-600" />
                                          <span className="text-emerald-600 font-semibold">Done</span>
                                          <span className="text-gray-400">· Undo</span>
                                        </button>
                                      ) : (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleToggleDone(comment.id); }}
                                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-600 bg-gray-50 hover:bg-green-50 px-1.5 py-0.5 rounded transition-colors"
                                        >
                                          <CheckCircle className="h-3 w-3" />
                                          Mark Done
                                        </button>
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
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* ── Media preview modal ─────────────────────────────────────────── */}
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              {selectedMedia.type === 'image' ? (
                <img
                  src={selectedMedia.preview}
                  alt={selectedMedia.name}
                  className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
                />
              ) : (
                <video
                  src={selectedMedia.preview}
                  controls
                  autoPlay
                  className="max-w-full max-h-[85vh] w-auto h-auto"
                />
              )}
              <div className="p-3 bg-gray-50 border-t flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">{selectedMedia.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedMedia.size)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default ContentDetails;
