import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Upload, Image, X, Check, CheckCircle, FileText, Calendar, Clock, Palette, Send, MapPin, Tag, MessageSquare, Play, Video, Bell, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, User, ShieldCheck, AlertCircle, History, Search, Globe } from 'lucide-react';
import { Facebook, Instagram, Linkedin, Youtube, Twitter } from 'lucide-react';

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

// Helper to get current user role from localStorage
function getUserRole() {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userObj = JSON.parse(userStr);
      return (userObj.role || '').toLowerCase();
    }
  } catch (e) {}
  return '';
}

function ContentUpload() {
  const navigate = useNavigate();
  const { calendarId, itemIndex } = useParams();
  const fileInputRef = useRef(null);

  // State for assignment details
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [notes, setNotes] = useState('');
  const [geoLocation, setGeoLocation] = useState({ latitude: '', longitude: '' });
  const [address, setAddress] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [previousSubmissionLoaded, setPreviousSubmissionLoaded] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [previousVersions, setPreviousVersions] = useState([]);
  const [versionsAccordionOpen, setVersionsAccordionOpen] = useState(false);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeVersionComment, setActiveVersionComment] = useState(null);
  const [hoveredVersionComment, setHoveredVersionComment] = useState(null);
  const [versionImgDimensions, setVersionImgDimensions] = useState(null);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const versionImgRef = useRef(null);

  // Send-to-customer state
  const [sendingToCustomer, setSendingToCustomer] = useState(false);
  const [sentToCustomer, setSentToCustomer] = useState(false);
  const [adminUploadedForThis, setAdminUploadedForThis] = useState(false);

  // Admin notification state
  const [adminsList, setAdminsList] = useState([]);
  const [selectedAdmins, setSelectedAdmins] = useState([]);
  const [adminsDropdownOpen, setAdminsDropdownOpen] = useState(false);
  const [adminsLoading, setAdminsLoading] = useState(false);

  const creatorEmail = getCreatorEmail();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail) {
      navigate('/content-creator/login');
    }
  }, [creatorEmail, navigate]);

  // Fetch list of admins for notification selector
  useEffect(() => {
    const fetchAdmins = async () => {
      setAdminsLoading(true);
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/users?role=admin`);
        if (res.ok) {
          const data = await res.json();
          const admins = Array.isArray(data) ? data : [];
          setAdminsList(admins.map(a => ({
            id: a._id || a.id,
            name: a.name || a.email || 'Admin',
            email: a.email || ''
          })).filter(a => a.email));
        }
      } catch (err) {
        console.error('❌ Failed to fetch admins:', err);
      } finally {
        setAdminsLoading(false);
      }
    };
    fetchAdmins();
  }, []);

  const toggleAdminSelection = (admin) => {
    setSelectedAdmins(prev => {
      const exists = prev.find(a => a.id === admin.id);
      if (exists) return prev.filter(a => a.id !== admin.id);
      return [...prev, admin];
    });
  };

  // Assignment picker state (used when no params provided)
  const [pickerAssignments, setPickerAssignments] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerPlatform, setPickerPlatform] = useState('all');
  const [pickerStatus, setPickerStatus] = useState('all');
  const [pickerCustomer, setPickerCustomer] = useState('all');
  const [pickerSort, setPickerSort] = useState('due');
  const [pickerSubmissions, setPickerSubmissions] = useState([]);
  const [pickerScheduledPosts, setPickerScheduledPosts] = useState([]);

  // When no params, fetch assignments for the picker
  useEffect(() => {
    if (calendarId && itemIndex !== undefined) return;
    const fetchPicker = async () => {
      setPickerLoading(true);
      try {
        const [custRes, calRes, subRes, schedRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/api/customers`),
          fetch(`${process.env.REACT_APP_API_URL}/calendars`),
          fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`),
          fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`),
        ]);
        const custData = await custRes.json();
        const calendars = await calRes.json();
        const subData = await subRes.json();
        const schedData = schedRes.ok ? await schedRes.json() : [];
        const customerMap = {};
        if (Array.isArray(custData.customers)) {
          custData.customers.forEach(c => {
            customerMap[c._id || c.id] = c.name || c.customerName || c.email || '';
          });
        }
        setPickerSubmissions(Array.isArray(subData) ? subData : (subData.submissions || []));
        setPickerScheduledPosts(Array.isArray(schedData) ? schedData : []);
        const all = [];
        calendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            calendar.contentItems.forEach((item, index) => {
              if ((item.assignedTo || '').toLowerCase() === creatorEmail) {
                const custId = calendar.customerId || calendar.customer_id || calendar.customer?._id || '';
                all.push({
                  ...item,
                  calendarId: calendar._id || calendar.id,
                  calendarName: calendar.name || calendar.customerName || calendar.customer || '',
                  customerName: customerMap[custId] || calendar.customerName || calendar.name || '',
                  itemIndex: index,
                  id: item.id || item._id || item.title,
                  platform: item.platform || item.type || 'Instagram',
                  dueDate: item.dueDate || item.due_date || item.date,
                });
              }
            });
          }
        });
        setPickerAssignments(all);
      } catch (err) {
        setPickerAssignments([]);
      } finally {
        setPickerLoading(false);
      }
    };
    if (creatorEmail) fetchPicker();
  }, [calendarId, itemIndex, creatorEmail]);

  // Reset version state whenever we switch to a different assignment
  useEffect(() => {
    setPreviousSubmissionLoaded(false);
    setPreviousVersions([]);
    setSelectedVersionIndex(0);
    setSelectedMediaIndex(0);
    setCommentsForVersion([]);
    setCommentsForCurrentMedia([]);
    setSentToCustomer(false);
    setAdminUploadedForThis(false);
  }, [calendarId, itemIndex]);

  // Fetch real assignment data based on calendarId and itemIndex
  useEffect(() => {
    const fetchAssignment = async () => {
      setLoading(true);
      try {
        // First fetch customers to build a map
        const customersRes = await fetch(`${process.env.REACT_APP_API_URL}/api/customers`);
        const customersData = await customersRes.json();

        const customerMap = {};
        if (Array.isArray(customersData.customers)) {
          customersData.customers.forEach(c => {
            customerMap[c._id || c.id] = {
              name: c.name || c.customerName || c.email || '',
              email: c.email || '',
              id: c._id || c.id
            };
          });
        }
        
        // Then fetch the specific calendar
        const res = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await res.json();
        
        let found = null;
        calendars.forEach((calendar) => {
          const customerId = calendar.customerId || calendar.customer_id || calendar.customer?._id || '';
          const customerInfo = customerMap[customerId] || {};
          
          if (Array.isArray(calendar.contentItems)) {
            // Use itemIndex to get the correct item
            const idx = parseInt(itemIndex, 10);
            if (!isNaN(idx) && calendar._id === calendarId && calendar.contentItems[idx]) {
              const item = calendar.contentItems[idx];
              found = {
                ...item,
                calendarName: calendar.name || calendar.customerName || calendar.customer || '',
                calendarId: calendar._id,
                customerId: customerId,
                customerName: customerInfo.name || calendar.customerName || calendar.name || '',
                customerEmail: customerInfo.email || '',
                id: item.id || item._id || item.title,
                dueDate: item.dueDate || item.due_date || item.date,
                platform: item.platform || item.type || 'Instagram',
                requirements: item.requirements || [],
              };
              
              // Only log if customer data is missing
              if (!found.customerId) {
                console.error('❌ Customer ID is missing for calendarId:', calendarId, 'itemIndex:', itemIndex);
              }
              if (!found.customerName) {
                console.error('❌ Customer name is missing for calendarId:', calendarId, 'itemIndex:', itemIndex);
              }
            }
          }
        });
        
        if (!found) {
          console.error('❌ Assignment not found for calendarId:', calendarId, 'itemIndex:', itemIndex);
        }
        
        setAssignment(found);
      } catch (err) {
        console.error('❌ Error fetching assignment:', err);
        setAssignment(null);
      } finally {
        setLoading(false);
      }
    };
    if (calendarId && itemIndex !== undefined) {
      fetchAssignment();
    }
  }, [calendarId, itemIndex]);

  // Fetch previous submission to pre-fill caption and hashtags for revisions
  useEffect(() => {
    const fetchPreviousSubmission = async () => {
      if (!assignment || !assignment.id || previousSubmissionLoaded) {
        console.log('⏭️ Skipping fetch - assignment:', !!assignment, 'id:', assignment?.id, 'loaded:', previousSubmissionLoaded);
        return;
      }

      try {
        console.log('🔍 Fetching previous submissions for assignment:', assignment.id, 'by creator:', creatorEmail);
        
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
        
        if (!response.ok) {
          console.error('❌ Failed to fetch previous submissions:', response.status);
          setPreviousSubmissionLoaded(true);
          return;
        }

        const data = await response.json();
        console.log('📦 Received submissions data:', data);
        
        // Handle both array response and object with submissions property
        const submissions = Array.isArray(data) ? data : (data.submissions || []);
        console.log('📋 Total submissions count:', submissions.length);
        
        if (submissions.length > 0) {
          console.log('🔍 Sample submission structure:', {
            assignment_id: submissions[0].assignment_id,
            created_by: submissions[0].created_by,
            caption: submissions[0].caption?.substring(0, 50),
            hashtags: submissions[0].hashtags?.substring(0, 50)
          });
        }
        
        // Filter submissions for this specific assignment
        // Primary: match by calendar_id + item_index (unambiguous)
        // Fallback: match by assignment_id title (for older submissions)
        const previousSubmissions = submissions.filter(sub => {
          const subCalendarId = sub.calendar_id || sub.calendarId;
          const subItemIndex  = (sub.item_index !== undefined && sub.item_index !== null)
            ? String(sub.item_index)
            : undefined;
          const subAssignmentId = sub.assignment_id || sub.assignmentId || sub.assignmentID;

          // Primary — most reliable: calendar_id + item_index
          if (subCalendarId && subItemIndex !== undefined) {
            return subCalendarId === calendarId && subItemIndex === String(itemIndex);
          }

          // Secondary — calendar_id + assignment_id (covers old submissions without item_index)
          if (subCalendarId && subAssignmentId && assignment.id) {
            return subCalendarId === calendarId &&
              String(subAssignmentId) === String(assignment.id) &&
              String(subAssignmentId) !== 'undefined';
          }

          // Final fallback — assignment_id only (legacy)
          return (
            subAssignmentId === assignment.id ||
            subAssignmentId === assignment._id ||
            (subAssignmentId && assignment.id &&
              String(subAssignmentId) === String(assignment.id) &&
              String(subAssignmentId) !== 'undefined')
          );
        });

        console.log('✅ Found', previousSubmissions.length, 'previous submissions for this assignment (any creator)');

        // Show ALL versions (internal and customer-stage) so history is always visible
        const allVersionsSorted = [...previousSubmissions].sort((a, b) =>
          new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0)
        );

        // Derive sentToCustomer from any customer-stage submission
        const anySentToCustomer = allVersionsSorted.some(
          sub => (sub.submission_stage || sub.submissionStage || '') === 'customer'
        );
        setSentToCustomer(anySentToCustomer);

        // Detect if admin (not this creator) already uploaded and sent to customer
        const adminUploaded = allVersionsSorted.some(
          sub => (sub.submission_stage || sub.submissionStage || '') === 'customer' &&
                 (sub.created_by || '') !== creatorEmail
        );
        setAdminUploadedForThis(adminUploaded);

        // Show ALL versions in history (creator should see all their submissions,
        // including ones that have been sent to the customer)
        if (allVersionsSorted.length > 0) {
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
          const normalized = allVersionsSorted
            .map((sub, idx) => ({
              versionNumber: idx + 1,
              caption: sub.caption || '',
              hashtags: sub.hashtags || '',
              notes: sub.notes || '',
              media: normMedia(sub.media || sub.images || []),
              createdAt: sub.created_at || sub.createdAt || '',
              status: sub.status || 'submitted',
              submissionStage: sub.submission_stage || sub.submissionStage || 'internal',
              approvalNotes: sub.approval_notes || sub.approvalNotes || '',
              comments: sub.comments || [],
              id: sub._id || sub.id || idx,
            }));
          setPreviousVersions(normalized);
          setSelectedVersionIndex(normalized.length - 1);
          setSelectedMediaIndex(0);
        }

        // Pre-fill from latest submission regardless of stage
        const prefillSource = [...previousSubmissions].sort((a, b) =>
          new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
        );

        if (prefillSource.length > 0) {
          const latestSubmission = prefillSource[0];
          if (latestSubmission.caption) setCaption(latestSubmission.caption);
          if (latestSubmission.hashtags) setHashtags(latestSubmission.hashtags);
          if (latestSubmission.notes) setNotes(latestSubmission.notes);
        }

        setPreviousSubmissionLoaded(true);
      } catch (err) {
        console.error('❌ Error fetching previous submission:', err);
        setPreviousSubmissionLoaded(true);
      }
    };

    if (assignment && creatorEmail) {
      fetchPreviousSubmission();
    }
  }, [assignment, creatorEmail, previousSubmissionLoaded]);

  // Sync comments when version or media selection changes
  useEffect(() => {
    if (previousVersions.length > 0 && previousVersions[selectedVersionIndex]) {
      setCommentsForVersion(previousVersions[selectedVersionIndex].comments || []);
    } else {
      setCommentsForVersion([]);
    }
    setActiveVersionComment(null);
  }, [previousVersions, selectedVersionIndex]);

  useEffect(() => {
    const filtered = commentsForVersion.filter(c => {
      const idx = c.mediaIndex !== undefined ? c.mediaIndex : 0;
      return idx === selectedMediaIndex;
    });
    setCommentsForCurrentMedia(filtered);
  }, [commentsForVersion, selectedMediaIndex]);

  useEffect(() => {
    setVersionImgDimensions(null);
  }, [selectedVersionIndex, selectedMediaIndex]);

  // ── Version history helpers ───────────────────────────────────────────────
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

  const formatVersionDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return {
        date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'long' }),
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };
    } catch { return { date: 'Invalid Date', time: '' }; }
  };

  const formatVersionDateLong = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch { return 'Unknown date'; }
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

  const handleVersionMediaChange = (direction) => {
    const current = previousVersions[selectedVersionIndex];
    if (!current) return;
    const mediaLength = current.media.length;
    if (direction === 'prev' && selectedMediaIndex > 0) setSelectedMediaIndex(selectedMediaIndex - 1);
    else if (direction === 'next' && selectedMediaIndex < mediaLength - 1) setSelectedMediaIndex(selectedMediaIndex + 1);
  };

  const handleVersionCommentClick = (id) => {
    setActiveVersionComment(activeVersionComment === id ? null : id);
  };

  const handleVersionToggleDone = async (id) => {
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
      if (newDone) setActiveVersionComment(null);
    }
  };

  const handleVersionReplySubmit = async (commentId) => {
    if (!replyText.trim() || !assignment) return;
    const comment = commentsForCurrentMedia.find(c => c.id === commentId);
    if (!comment) return;
    setReplySubmitting(true);
    const replyPayload = {
      reply: {
        text: replyText.trim(),
        creatorEmail: creatorEmail,
        timestamp: new Date().toISOString(),
      }
    };
    try {
      await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(assignment.id)}/comments/${commentId}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(replyPayload) }
      );
      const updated = { ...comment, ...replyPayload };
      setCommentsForVersion(commentsForVersion.map(c => c.id === commentId ? updated : c));
      setCommentsForCurrentMedia(commentsForCurrentMedia.map(c => c.id === commentId ? updated : c));
      setReplyingToComment(null);
      setReplyText('');
    } catch (err) {
      console.error('Failed to save reply:', err);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleVersionImgLoad = (e) => {
    const el = e.target;
    const ew = el.clientWidth, eh = el.clientHeight;
    const nw = el.naturalWidth || ew;
    const nh = el.naturalHeight || eh;
    const scale = Math.min(ew / nw, eh / nh);
    const contentW = nw * scale, contentH = nh * scale;
    setVersionImgDimensions({ contentW, contentH, offsetX: (ew - contentW) / 2, offsetY: (eh - contentH) / 2 });
  };

  const getVersionScaledMarkerPos = (commentX, commentY) => {
    const { contentW = 0, contentH = 0, offsetX = 0, offsetY = 0 } = versionImgDimensions || {};
    if (commentX <= 1 && commentY <= 1 && contentW > 0) {
      return { x: commentX * contentW + offsetX, y: commentY * contentH + offsetY };
    }
    if (contentW > 0) {
      const s = contentW / 680;
      return { x: commentX * s + offsetX, y: commentY * s + offsetY };
    }
    return { x: commentX, y: commentY };
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (files) => {
    Array.from(files).forEach(async file => {
      if (file.type.startsWith('image/')) {
        const preview = URL.createObjectURL(file);
        const newFile = {
          id: Date.now() + Math.random(),
          file: file,
          preview: preview,
          name: file.name,
          size: file.size,
          type: 'image',
          uploaded: false,
          uploading: false,
          publicUrl: null,
          error: null
        };
        setUploadedFiles(prev => [...prev, newFile]);
      } else if (file.type.startsWith('video/')) {
        const preview = URL.createObjectURL(file);
        const newFile = {
          id: Date.now() + Math.random(),
          file: file,
          preview: preview,
          name: file.name,
          size: file.size,
          type: 'video',
          uploaded: false,
          uploading: false,
          publicUrl: null,
          error: null
        };
        setUploadedFiles(prev => [...prev, newFile]);
      }
    });
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Upload single file using base64 upload through backend API
  const uploadFileToGCS = async (fileObj) => {
    try {
      console.log(`📤 Starting upload for ${fileObj.name} (${formatFileSize(fileObj.size)})`);
      
      // Update file status to uploading
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileObj.id ? { ...f, uploading: true, error: null } : f)
      );

      // Convert file to base64
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          // Remove the data URL prefix (e.g., "data:image/png;base64,")
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileObj.file);
      });

      // Upload using base64 through backend API
      const uploadResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/upload-base64`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: fileObj.name,
          contentType: fileObj.file.type,
          base64Data: base64Data
        }),
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(`Upload failed: ${errorData.error || uploadResponse.statusText}`);
      }

      const { publicUrl } = await uploadResponse.json();

      if (!publicUrl) {
        throw new Error('No public URL returned from upload');
      }

      console.log(`✅ Successfully uploaded ${fileObj.name} via base64`);

      // Update file status to uploaded
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileObj.id ? { 
          ...f, 
          uploading: false, 
          uploaded: true, 
          publicUrl: publicUrl,
          error: null 
        } : f)
      );

      return {
        url: publicUrl,
        type: fileObj.type,
        name: fileObj.name,
        size: fileObj.file.size,
        originalName: fileObj.name
      };

    } catch (error) {
      console.error(`❌ Upload failed for ${fileObj.name}:`, error);
      
      // Update file status to error
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileObj.id ? { 
          ...f, 
          uploading: false, 
          uploaded: false, 
          error: error.message 
        } : f)
      );

      throw error;
    }
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one image or video');
      return;
    }

    if (!assignment) {
      alert('Assignment data not found. Please try again.');
      return;
    }

    // Enhanced validation and fallback for customer information
    let finalCustomerId = assignment.customerId;
    let finalCustomerName = assignment.customerName;
    let finalCustomerEmail = assignment.customerEmail;

    if (!finalCustomerId || !finalCustomerName) {
      console.error('❌ Missing customer information in assignment');
      
      // Use calendar data as fallback
      finalCustomerId = finalCustomerId || assignment.calendarId || '';
      finalCustomerName = finalCustomerName || assignment.calendarName || 'Unknown Customer';
    }

    // Additional validation to ensure we have proper customer name
    if (!finalCustomerName || finalCustomerName === 'Unknown Customer') {
      finalCustomerName = finalCustomerName || 
                         assignment.customer || 
                         assignment.client || 
                         assignment.calendarName || 
                         'Unknown Customer';
    }

    // CRITICAL: Ensure we have valid customer information before proceeding
    if (!finalCustomerId || !finalCustomerName || finalCustomerName === 'Unknown Customer') {
      console.error('❌ CRITICAL: Cannot proceed without valid customer information!');
      alert(`Missing customer information. Please contact support.\n\nDetails:\n- Customer ID: ${finalCustomerId || 'Missing'}\n- Customer Name: ${finalCustomerName || 'Missing'}\n- Assignment ID: ${assignment.id}`);
      return;
    }

    setSubmitting(true);
    const uploadedMediaUrls = [];

    try {
      // Upload all files that haven't been uploaded yet
      const filesToUpload = uploadedFiles.filter(f => !f.uploaded);
      const alreadyUploaded = uploadedFiles.filter(f => f.uploaded);

      console.log(`📤 Uploading ${filesToUpload.length} files, ${alreadyUploaded.length} already uploaded`);

      // Upload files in parallel (but limit concurrency to avoid overwhelming the server)
      const uploadPromises = filesToUpload.map(fileObj => uploadFileToGCS(fileObj));
      const uploadResults = await Promise.allSettled(uploadPromises);

      // Process upload results
      uploadResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          uploadedMediaUrls.push(result.value);
        } else {
          console.error(`❌ Failed to upload file ${filesToUpload[index].name}:`, result.reason);
          throw new Error(`Upload failed for ${filesToUpload[index].name}: ${result.reason.message}`);
        }
      });

      // Add already uploaded files
      alreadyUploaded.forEach(fileObj => {
        if (fileObj.publicUrl) {
          uploadedMediaUrls.push({
            url: fileObj.publicUrl,
            type: fileObj.type,
            name: fileObj.name,
            size: fileObj.size,
            originalName: fileObj.name
          });
        }
      });

      console.log(`✅ All files uploaded successfully. Total: ${uploadedMediaUrls.length}`);

      // Prepare submission data with comprehensive customer information
      const submissionData = {
        assignment_id: assignment.id,
        caption: caption || '',
        hashtags: hashtags || '',
        notes: notes || '',
        images: uploadedMediaUrls, // ✅ This contains the media URLs and metadata
        media: uploadedMediaUrls,  // ✅ Duplicate for backward compatibility
        created_by: creatorEmail,
        customer_id: finalCustomerId,
        customer_name: finalCustomerName,
        customer_email: finalCustomerEmail || assignment.customerEmail || '',
        platform: assignment.platform || 'Instagram',
        calendar_id: assignment.calendarId,
        calendar_name: assignment.calendarName,
        item_name: assignment.title || '',
        item_id: assignment.id || '',
        assignment_title: assignment.title,
        assignment_description: assignment.description,
        due_date: assignment.dueDate,
        status: 'submitted',
        // Content creators submit for internal review; customers/admins upload directly for customer review
        submission_stage: getUserRole() === 'content_creator' ? 'internal' : 'customer',
        item_index: parseInt(itemIndex, 10),
        created_at: new Date().toISOString(),
        type: 'submission',
        geo_location: (geoLocation.latitude && geoLocation.longitude) ? geoLocation : undefined,
        address: address || undefined,
        contact_info: contactInfo || undefined,
        notify_admins: selectedAdmins,
      };

      // FINAL VALIDATION - Ensure all critical fields are present
      const missingFields = [];
      if (!submissionData.customer_id) missingFields.push('customer_id');
      if (!submissionData.customer_name) missingFields.push('customer_name');
      if (!submissionData.assignment_id) missingFields.push('assignment_id');
      if (!submissionData.created_by) missingFields.push('created_by');
      if (!submissionData.images || submissionData.images.length === 0) missingFields.push('images');

      if (missingFields.length > 0) {
        console.error('❌ VALIDATION FAILED: Missing required fields:', missingFields);
        alert(`Validation failed. Missing required fields: ${missingFields.join(', ')}`);
        setSubmitting(false);
        return;
      }

      // Additional validation for customer info quality
      if (submissionData.customer_name === 'Unknown Customer' || 
          submissionData.customer_name.length < 2 ||
          !submissionData.customer_id ||
          submissionData.customer_id.length < 5) {
        console.error('❌ QUALITY CHECK FAILED: Invalid customer information quality');
        alert('Invalid customer information detected. Please refresh the page and try again.');
        setSubmitting(false);
        return;
      }

      console.log('📤 Submitting content to API...');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submissionData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Backend submission failed:', errorData);
        throw new Error(`Backend error: ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ Content submission successful:', result);

      const adminNames = selectedAdmins.map(a => a.name).join(', ');
      const adminMsg = selectedAdmins.length > 0
        ? `\n\nNotified admin(s): ${adminNames}`
        : '';
      alert(`Content submitted for admin review!${adminMsg}\n\nThe admin will review your submission and notify you with feedback or approval.`);
      navigate('/content-creator/assignments');
    } catch (err) {
      console.error('❌ Upload error:', err);
      alert(`Upload failed: ${err.message}. Please try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Send approved internal submission to customer for review
  const handleSendToCustomer = async () => {
    const latestApproved = [...previousVersions].reverse().find(v => v.status === 'approved');
    if (!latestApproved) return;
    setSendingToCustomer(true);
    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/api/content-submissions/${encodeURIComponent(latestApproved.id)}/send-to-customer`,
        { method: 'PATCH', headers: { 'Content-Type': 'application/json' } }
      );
      if (!res.ok) throw new Error('Failed');
      setSentToCustomer(true);
    } catch {
      alert('Failed to send to customer. Please try again.');
    } finally {
      setSendingToCustomer(false);
    }
  };

  // Retry upload for failed files
  const retryUpload = async (fileObj) => {
    try {
      await uploadFileToGCS(fileObj);
    } catch (error) {
      console.error('Retry failed:', error);
    }
  };

  // No params — show assignment picker
  if (!calendarId || itemIndex === undefined) {
    // Helper: get normalized display status (mirrors Assignments.jsx getFilterStatus)
    const getPickerFilterStatus = (a) => {
      // Check published flag or scheduled post
      if (a.published === true) return 'published';
      const aid = a.id || a._id || '';
      if (aid && pickerScheduledPosts.some(post => post.contentId === aid && post.status === 'published')) return 'published';
      // Check customer-approval via submissions
      const subs = pickerSubmissions.filter(sub => {
        const subCal = sub.calendar_id || sub.calendarId;
        const subIdx = sub.item_index !== undefined ? String(sub.item_index) : undefined;
        if (subCal && subIdx !== undefined) {
          return subCal === a.calendarId && subIdx === String(a.itemIndex);
        }
        const subId = sub.assignment_id || sub.assignmentId;
        return subId && String(subId) === String(a.id);
      });
      const isCustomerApproved = subs.some(s => s.status === 'approved' && (s.submission_stage || s.submissionStage || '') === 'customer');
      if (isCustomerApproved) return 'approved';
      return 'pending';
    };

    // Helper: get latest internal-stage submission status for a picker assignment
    const getPickerReviewStatus = (a) => {
      const subs = pickerSubmissions.filter(sub => {
        const subCal = sub.calendar_id || sub.calendarId;
        const subIdx = sub.item_index !== undefined ? String(sub.item_index) : undefined;
        if (subCal && subIdx !== undefined) {
          return subCal === a.calendarId && subIdx === String(a.itemIndex);
        }
        const subId = sub.assignment_id || sub.assignmentId;
        return subId && String(subId) === String(a.id);
      });
      if (subs.length === 0) return null;
      const latest = [...subs].sort((x, y) => new Date(y.created_at || 0) - new Date(x.created_at || 0))[0];
      if (latest.submission_stage === 'customer' || latest.submissionStage === 'customer') {
        return { label: 'Admin Directly Sent to Customer', color: 'bg-blue-100 text-blue-700' };
      }
      if (latest.status === 'approved') {
        return { label: 'Approved by Admin', color: 'bg-orange-100 text-orange-700' };
      }
      if (latest.status === 'revision_requested') {
        return { label: 'Revision Requested', color: 'bg-red-100 text-red-700' };
      }
      return { label: 'Under Admin Review', color: 'bg-amber-100 text-amber-700' };
    };

    // Helper: flatten platform (string or array) into a lowercase string array
    const flatPlatforms = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(v => String(v).trim().toLowerCase()).filter(Boolean);
      return [String(val).trim().toLowerCase()];
    };

    // Derived filter options
    const allPlatforms = [...new Set(pickerAssignments.flatMap(a => flatPlatforms(a.platform).map(p => p.charAt(0).toUpperCase() + p.slice(1))))].sort();
    const allStatuses  = [...new Set(pickerAssignments.map(a => getPickerFilterStatus(a)))].sort();
    const allCustomers = [...new Set(pickerAssignments.map(a => a.customerName || a.calendarName || 'Unknown'))].sort();

    const filtered = pickerAssignments
      .filter(a => {
        const q = pickerSearch.toLowerCase();
        const platforms = flatPlatforms(a.platform);
        const matchSearch = !q ||
          (a.title || '').toLowerCase().includes(q) ||
          (a.customerName || '').toLowerCase().includes(q) ||
          platforms.some(p => p.includes(q)) ||
          (a.description || '').toLowerCase().includes(q);
        const matchPlatform = pickerPlatform === 'all' || platforms.some(p => p === pickerPlatform.toLowerCase());
        const matchStatus   = pickerStatus === 'all'   || getPickerFilterStatus(a) === pickerStatus;
        const matchCustomer = pickerCustomer === 'all' || (a.customerName || a.calendarName || 'Unknown') === pickerCustomer;
        return matchSearch && matchPlatform && matchStatus && matchCustomer;
      })
      .sort((a, b) => {
        if (pickerSort === 'due') {
          const da = new Date(a.assignedAt || a.createdAt || a.dueDate || 0);
          const db = new Date(b.assignedAt || b.createdAt || b.dueDate || 0);
          return db - da;
        }
        if (pickerSort === 'name') return (a.title || '').localeCompare(b.title || '');
        if (pickerSort === 'customer') return (a.customerName || '').localeCompare(b.customerName || '');
        return 0;
      });

    const platformColor = (p) => {
      switch ((p || '').toLowerCase()) {
        case 'facebook':  return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'instagram': return 'bg-pink-100 text-pink-700 border-pink-200';
        case 'youtube':   return 'bg-red-100 text-red-700 border-red-200';
        case 'linkedin':  return 'bg-blue-50 text-blue-700 border-blue-200';
        case 'twitter':   return 'bg-sky-100 text-sky-700 border-sky-200';
        case 'tiktok':    return 'bg-gray-900 text-white border-gray-700';
        default:          return 'bg-gray-100 text-gray-700 border-gray-200';
      }
    };

    const PlatformIcon = ({ platform, className = 'h-3 w-3' }) => {
      switch ((platform || '').toLowerCase()) {
        case 'facebook':  return <Facebook  className={className} />;
        case 'instagram': return <Instagram className={className} />;
        case 'linkedin':  return <Linkedin  className={className} />;
        case 'youtube':   return <Youtube   className={className} />;
        case 'twitter':   return <Twitter   className={className} />;
        default:          return <Globe     className={className} />;
      }
    };

    const parsePlatforms = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
      const s = String(val || '');
      if (s.includes(',')) return s.split(',').map(v => v.trim()).filter(Boolean);
      if (s.includes(' ')) return s.split(/\s+/).map(v => v.trim()).filter(Boolean);
      const matches = s.match(/facebook|instagram|youtube|linkedin|twitter|tiktok|pinterest/ig);
      if (matches) return matches.map(m => m.toLowerCase());
      return [s];
    };

    const statusColor = (s) => {
      switch (s) {
        case 'approved':    return 'bg-green-100 text-green-800';
        case 'published':   return 'bg-purple-100 text-purple-800';
        case 'in_progress': return 'bg-amber-100 text-amber-800';
        case 'pending':     return 'bg-orange-100 text-orange-800';
        default:            return 'bg-gray-100 text-gray-700';
      }
    };

    const statusLabel = (s) => (s || 'pending').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16 gap-4">
              <button onClick={() => navigate('/content-creator')} className="text-gray-600 hover:text-gray-900 transition-colors flex-shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <Palette className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <span className="text-xl font-bold text-gray-900">Upload Content</span>
                  <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">Select an assignment to upload media for</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full flex-shrink-0">
                {pickerAssignments.length} assignments
              </span>
            </div>
          </div>
        </header>

        {pickerLoading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mx-auto mb-3"></div>
              <span className="text-gray-600">Loading your assignments…</span>
            </div>
          </div>
        ) : pickerAssignments.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="bg-white rounded-xl shadow-sm p-10 text-center max-w-sm">
              <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No assignments found</p>
              <p className="text-sm text-gray-400 mt-1">You have no active assignments to upload content for.</p>
              <button onClick={() => navigate('/content-creator')} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm">
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden h-[calc(100vh-64px)]">

            {/* ── SIDEBAR ── */}
            <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-y-auto hidden md:flex">
              {/* Search */}
              <div className="p-4 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search assignments…"
                    value={pickerSearch}
                    onChange={e => setPickerSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs rounded-lg bg-gray-50 border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
                  />
                </div>
              </div>

              {/* Stats strip */}
              <div className="px-4 py-3 border-b border-gray-100 grid grid-cols-2 gap-2">
                <div className="bg-purple-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-purple-700">{filtered.length}</p>
                  <p className="text-[10px] text-purple-500 font-medium">Showing</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-indigo-700">{pickerAssignments.length}</p>
                  <p className="text-[10px] text-indigo-500 font-medium">Total</p>
                </div>
              </div>

              {/* Sort */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sort By</p>
                <div className="space-y-1">
                  {[
                    { key: 'due',      label: 'Newest First' },
                    { key: 'name',     label: 'Name' },
                    { key: 'customer', label: 'Customer' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setPickerSort(opt.key)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        pickerSort === opt.key
                          ? 'bg-purple-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform filter */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Platform</p>
                <div className="space-y-1">
                  <button
                    onClick={() => setPickerPlatform('all')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                      pickerPlatform === 'all' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>All Platforms</span>
                    <span className={`text-[10px] px-1.5 rounded-full ${pickerPlatform === 'all' ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {pickerAssignments.length}
                    </span>
                  </button>
                  {allPlatforms.map(p => (
                    <button
                      key={p}
                      onClick={() => setPickerPlatform(p)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                        pickerPlatform === p ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <span>{p}</span>
                      <span className={`text-[10px] px-1.5 rounded-full ${pickerPlatform === p ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {pickerAssignments.filter(a => flatPlatforms(a.platform).some(fp => fp === p.toLowerCase())).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Status filter */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Status</p>
                <div className="space-y-1">
                  <button
                    onClick={() => setPickerStatus('all')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      pickerStatus === 'all' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >All Statuses</button>
                  {allStatuses.map(s => (
                    <button
                      key={s}
                      onClick={() => setPickerStatus(s)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        pickerStatus === s ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer filter */}
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Customer</p>
                <div className="space-y-1">
                  <button
                    onClick={() => setPickerCustomer('all')}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      pickerCustomer === 'all' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >All Customers</button>
                  {allCustomers.map(c => (
                    <button
                      key={c}
                      onClick={() => setPickerCustomer(c)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors truncate ${
                        pickerCustomer === c ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title={c}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </aside>

            {/* ── MAIN LIST ── */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* Mobile search bar */}
              <div className="relative mb-4 md:hidden">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assignments…"
                  value={pickerSearch}
                  onChange={e => setPickerSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-white border border-gray-200 text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>

              {/* Result count + active filters */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-sm text-gray-500 font-medium">
                  {filtered.length} of {pickerAssignments.length} assignments
                </span>
                {pickerPlatform !== 'all' && (
                  <button onClick={() => setPickerPlatform('all')} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200">
                    {pickerPlatform} <X className="h-3 w-3" />
                  </button>
                )}
                {pickerStatus !== 'all' && (
                  <button onClick={() => setPickerStatus('all')} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium hover:bg-orange-200">
                    {statusLabel(pickerStatus)} <X className="h-3 w-3" />
                  </button>
                )}
                {pickerCustomer !== 'all' && (
                  <button onClick={() => setPickerCustomer('all')} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200">
                    {pickerCustomer} <X className="h-3 w-3" />
                  </button>
                )}
                {pickerSearch && (
                  <button onClick={() => setPickerSearch('')} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-300">
                    "{pickerSearch}" <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {filtered.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-10 text-center">
                  <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No matching assignments</p>
                  <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or search term.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map((a, i) => {
                    return (
                      <div
                        key={`${a.calendarId}-${a.itemIndex}-${i}`}
                        className="bg-white rounded-xl shadow-sm border border-transparent hover:border-purple-200 hover:shadow-md transition-all group overflow-hidden"
                      >
                        {/* Top accent bar by platform */}
                        <div className={`h-1 w-full ${(() => {
                          const fps = flatPlatforms(a.platform);
                          if (fps.includes('instagram')) return 'bg-gradient-to-r from-pink-400 to-purple-500';
                          if (fps.includes('facebook'))  return 'bg-blue-500';
                          if (fps.includes('youtube'))   return 'bg-red-500';
                          if (fps.includes('linkedin'))  return 'bg-blue-700';
                          if (fps.includes('twitter'))   return 'bg-sky-400';
                          return 'bg-purple-400';
                        })()}`} />
                        <div className="p-4 flex items-start gap-4">
                          {/* Index badge */}
                          <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold text-sm flex items-center justify-center flex-shrink-0 mt-0.5">
                            {i + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Title + badges row */}
                            <div className="flex items-start gap-2 flex-wrap">
                              <p className="font-bold text-gray-900 group-hover:text-purple-800 text-sm leading-snug flex-1 min-w-0">
                                {a.title || 'Untitled Assignment'}
                              </p>
                              <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                                {parsePlatforms(a.platform || a.type).map((p, pi) => (
                                  <span key={pi} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${platformColor(p)}`}>
                                    <PlatformIcon platform={p} className="h-2.5 w-2.5 flex-shrink-0" />
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                  </span>
                                ))}
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(getPickerFilterStatus(a))}`}>
                                  {statusLabel(getPickerFilterStatus(a))}
                                </span>
                              </div>
                            </div>

                            {/* Customer + Calendar row */}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                {a.customerName || 'Unknown Customer'}
                              </span>
                              {a.calendarName && (
                                <span className="flex items-center gap-1 text-xs text-gray-400">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  {a.calendarName}
                                </span>
                              )}
                            </div>

                            {/* Description */}
                            {a.description && (
                              <p className="text-xs text-gray-400 mt-1 line-clamp-1">{a.description}</p>
                            )}

                            {/* Admin review status label */}
                            {(() => {
                              if (getPickerFilterStatus(a) === 'published') return null;
                              const reviewStatus = getPickerReviewStatus(a);
                              if (!reviewStatus) return null;
                              return (
                                <div className="mt-2">
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${reviewStatus.color}`}>
                                    {reviewStatus.label === 'Approved by Admin' && <span className="w-1.5 h-1.5 rounded-full bg-orange-500 inline-block" />}
                                    {reviewStatus.label}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Due date + action row */}
                            <div className="flex items-center justify-between mt-2.5 gap-2 flex-wrap">
                              <span className="flex items-center gap-1 text-xs font-medium text-gray-400">
                                <Clock className="h-3 w-3 flex-shrink-0" />
                                {a.dueDate
                                  ? 'Due ' + new Date(a.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  : 'No due date'}
                              </span>
                              <button
                                onClick={() => navigate(`/content-creator/upload/${a.calendarId}/${a.itemIndex}`)}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-sm hover:shadow-md flex-shrink-0"
                              >
                                <Send className="h-3 w-3" />
                                Upload
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          </div>
        )}
      </div>
    );
  }

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
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/content-creator/upload')}
                className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Palette className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-3">
                  <span className="text-xl font-bold text-gray-900">Submit for Admin Review</span>
                  <p className="text-xs text-gray-400 leading-none mt-0.5">Admin must approve before content goes to customer</p>
                </div>
              </div>
            </div>

            {/* Assignment Info in Header */}
            <div className="hidden md:flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{assignment.title}</p>
                <p className="text-xs text-gray-500">for {assignment.customerName}</p>
              </div>
              <div className="flex items-center text-xs text-gray-500">
                <Calendar className="h-3 w-3 mr-1" />
                {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {(Array.isArray(assignment.platform) ? assignment.platform : [assignment.platform]).filter(Boolean).map((p, pi) => (
                  <span key={pi} className={`inline-flex items-center gap-1 px-1.5 py-1 rounded border text-xs font-medium ${
                    p.toLowerCase() === 'facebook'  ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    p.toLowerCase() === 'instagram' ? 'bg-pink-100 text-pink-700 border-pink-200' :
                    p.toLowerCase() === 'youtube'   ? 'bg-red-100 text-red-700 border-red-200' :
                    p.toLowerCase() === 'linkedin'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    p.toLowerCase() === 'twitter'   ? 'bg-sky-100 text-sky-700 border-sky-200' :
                    'bg-gray-100 text-gray-700 border-gray-200'
                  }`}>
                    {p.toLowerCase() === 'facebook'  ? <Facebook  className="h-3 w-3" /> :
                     p.toLowerCase() === 'instagram' ? <Instagram className="h-3 w-3" /> :
                     p.toLowerCase() === 'linkedin'  ? <Linkedin  className="h-3 w-3" /> :
                     p.toLowerCase() === 'youtube'   ? <Youtube   className="h-3 w-3" /> :
                     p.toLowerCase() === 'twitter'   ? <Twitter   className="h-3 w-3" /> :
                     <Globe className="h-3 w-3" />}
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Assignment Details - Compact */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6 md:hidden">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">{assignment.title}</h1>
              <p className="text-sm text-gray-600">for {assignment.customerName}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center text-xs text-gray-500 mb-1">
                <Calendar className="h-3 w-3 mr-1" />
                {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
              </div>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {(Array.isArray(assignment.platform) ? assignment.platform : [assignment.platform]).filter(Boolean).map((p, pi) => (
                  <span key={pi} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium ${
                    p.toLowerCase() === 'facebook'  ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    p.toLowerCase() === 'instagram' ? 'bg-pink-100 text-pink-700 border-pink-200' :
                    p.toLowerCase() === 'youtube'   ? 'bg-red-100 text-red-700 border-red-200' :
                    p.toLowerCase() === 'linkedin'  ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    p.toLowerCase() === 'twitter'   ? 'bg-sky-100 text-sky-700 border-sky-200' :
                    'bg-gray-100 text-gray-700 border-gray-200'
                  }`}>
                    {p.toLowerCase() === 'facebook'  ? <Facebook  className="h-3 w-3" /> :
                     p.toLowerCase() === 'instagram' ? <Instagram className="h-3 w-3" /> :
                     p.toLowerCase() === 'linkedin'  ? <Linkedin  className="h-3 w-3" /> :
                     p.toLowerCase() === 'youtube'   ? <Youtube   className="h-3 w-3" /> :
                     p.toLowerCase() === 'twitter'   ? <Twitter   className="h-3 w-3" /> :
                     <Globe className="h-3 w-3" />}
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {assignment.description && (
            <p className="text-sm text-gray-600 mt-2">{assignment.description}</p>
          )}
        </div>

        {/* Admin Uploaded Banner — shown when admin already sent content to customer */}
        {adminUploadedForThis && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl shadow-sm px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-blue-800">Admin Has Already Submitted Content</p>
              <p className="text-xs text-blue-700 mt-0.5">
                The admin has uploaded content for this assignment and sent it directly to the customer. No further upload is needed from you.
              </p>
            </div>
            <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
              <Check className="h-3 w-3" />
              Admin Directly Sent to Customer
            </span>
          </div>
        )}

        {/* Admin Approval Banner — shown when the latest version is approved */}
        {(() => {
          const latestApproved = [...previousVersions]
            .reverse()
            .find(v => v.status === 'approved' || v.status === 'approved_by_admin');
          if (!latestApproved) return null;
          return (
            <div className="bg-green-50 border border-green-200 rounded-xl shadow-sm px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-green-800">Version {latestApproved.versionNumber} Approved by Admin</p>
                {latestApproved.approvalNotes ? (
                  <p className="text-xs text-green-700 mt-0.5">{latestApproved.approvalNotes}</p>
                ) : (
                  <p className="text-xs text-green-600 mt-0.5">Your content has been reviewed and approved. It is ready to be sent to the customer.</p>
                )}
              </div>
              <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-full">
                <Check className="h-3 w-3" />
                Approved
              </span>
            </div>
          );
        })()}

        {/* Workflow Banner */}
        <div className="bg-white border border-purple-100 rounded-xl shadow-sm px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-purple-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800">Admin Review Required</p>
            <p className="text-xs text-gray-500 mt-0.5">Your upload goes to the selected admin first. Once approved, the admin or you can submit the content to the customer's content calendar.</p>
          </div>
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full font-medium">1 Upload</span>
            <span>→</span>
            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-medium">2 Admin Review</span>
            <span>→</span>
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">3 Customer</span>
          </div>
        </div>

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload Area */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Upload className="h-5 w-5 mr-2 text-purple-600" />
                Upload Media
              </h2>
              
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                  dragActive 
                    ? 'border-purple-400 bg-purple-50 scale-105' 
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
                
                <div className="space-y-3">
                  <div className="flex justify-center space-x-2">
                    <Upload className="h-8 w-8 text-gray-400" />
                    <Video className="h-8 w-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-base font-medium text-gray-900">
                      Drag and drop your images and videos here
                    </p>
                    <p className="text-sm text-gray-500">or</p>
                    <button
                      onClick={onButtonClick}
                      className="mt-2 inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                    >
                      <Image className="h-4 w-4 mr-2" />
                      Browse Files
                    </button>
                  </div>
                  <p className="text-xs text-gray-400">
                    Supports: JPG, PNG, GIF, MP4, MOV, AVI (Max 100MB per file)
                  </p>
                </div>
              </div>
            </div>

            {/* Media Preview Grid */}
            {uploadedFiles.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
                  <Image className="h-5 w-5 mr-2 text-purple-600" />
                  Media Files ({uploadedFiles.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="relative group">
                      <div 
                        className="aspect-square rounded-lg overflow-hidden bg-gray-100 ring-2 ring-transparent group-hover:ring-purple-200 transition-all relative cursor-pointer"
                        onClick={() => setSelectedMedia(file)}
                      >
                        {file.type === 'image' ? (
                          <img
                            src={file.preview}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="relative w-full h-full">
                            <video
                              src={file.preview}
                              className="w-full h-full object-cover"
                              muted
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                              <Play className="h-8 w-8 text-white" />
                            </div>
                            <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                              VIDEO
                            </div>
                          </div>
                        )}
                        
                        {/* Upload Status Overlay */}
                        {file.uploading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                              <p className="text-xs">Uploading...</p>
                            </div>
                          </div>
                        )}
                        
                        {file.uploaded && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                            <Check className="h-3 w-3" />
                          </div>
                        )}
                        
                        {file.error && (
                          <div className="absolute inset-0 bg-red-500 bg-opacity-50 flex items-center justify-center">
                            <div className="text-white text-center p-2">
                              <X className="h-4 w-4 mx-auto mb-1" />
                              <p className="text-xs">Failed</p>
                              <button
                                onClick={() => retryUpload(file)}
                                className="text-xs underline mt-1"
                              >
                                Retry
                              </button>
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
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            file.type === 'image' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {file.type.toUpperCase()}
                          </span>
                        </div>
                        {file.error && (
                          <p className="text-xs text-red-500 mt-1 truncate" title={file.error}>
                            {file.error}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Version History Accordion — ContentDetails style */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Accordion trigger */}
              <button
                onClick={() => setVersionsAccordionOpen(!versionsAccordionOpen)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <History className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Version History</h2>
                    <p className="text-sm text-gray-500">
                      {previousVersions.length} {previousVersions.length === 1 ? 'version' : 'versions'} submitted
                    </p>
                  </div>
                </div>
                {versionsAccordionOpen
                  ? <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
              </button>

              {/* Accordion body */}
              {versionsAccordionOpen && (
                <div className="border-t border-gray-100 p-6">
                  {previousVersions.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-gray-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
                        <History className="h-7 w-7 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">No versions submitted yet</p>
                      <p className="text-sm text-gray-400 mt-1">Upload your first version using the form above</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      {/* ── Left 2/3: Version display ── */}
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
                                    Version {previousVersions[selectedVersionIndex]?.versionNumber}
                                  </h3>
                                  <p className="text-xs text-gray-500">of {previousVersions.length} total versions</p>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 items-end max-w-xs">
                                {/* Internal Review pills */}
                                {(() => {
                                  const internal = previousVersions.map((v, i) => ({ v, i })).filter(({ v }) => v.submissionStage !== 'customer');
                                  const customer = previousVersions.map((v, i) => ({ v, i })).filter(({ v }) => v.submissionStage === 'customer');
                                  return (
                                    <>
                                      {internal.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Internal</span>
                                          {internal.map(({ v, i }, ci) => (
                                            <button
                                              key={v.id || i}
                                              onClick={() => handleVersionSelect(i)}
                                              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                                selectedVersionIndex === i
                                                  ? 'bg-purple-600 text-white shadow-sm'
                                                  : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700'
                                              }`}
                                            >
                                              V{ci + 1}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      {customer.length > 0 && (
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                          <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Customer</span>
                                          {customer.map(({ v, i }, ci) => (
                                            <button
                                              key={v.id || i}
                                              onClick={() => handleVersionSelect(i)}
                                              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                                selectedVersionIndex === i
                                                  ? 'bg-amber-500 text-white shadow-sm'
                                                  : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                                              }`}
                                            >
                                              V{ci + 1}
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>

                          <div className="p-5">
                            {previousVersions[selectedVersionIndex] && (
                              <div className="space-y-5">
                                {/* Media */}
                                <div>
                                  {previousVersions[selectedVersionIndex].media?.length > 0 ? (
                                    <div>
                                      {previousVersions[selectedVersionIndex].media.length > 1 && (
                                        <div className="flex items-center justify-between mb-3 px-1">
                                          <span className="text-sm font-medium text-gray-600">
                                            Media {selectedMediaIndex + 1} of {previousVersions[selectedVersionIndex].media.length}
                                          </span>
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleVersionMediaChange('prev')}
                                              disabled={selectedMediaIndex === 0}
                                              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                            >
                                              <ChevronLeft className="h-4 w-4 text-gray-600" />
                                            </button>
                                            <button
                                              onClick={() => handleVersionMediaChange('next')}
                                              disabled={selectedMediaIndex === previousVersions[selectedVersionIndex].media.length - 1}
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
                                          {previousVersions[selectedVersionIndex].media[selectedMediaIndex]?.url &&
                                           typeof previousVersions[selectedVersionIndex].media[selectedMediaIndex].url === 'string' ? (
                                            previousVersions[selectedVersionIndex].media[selectedMediaIndex].type === 'image' ? (
                                              <img
                                                ref={versionImgRef}
                                                src={previousVersions[selectedVersionIndex].media[selectedMediaIndex].url}
                                                alt={`Version ${previousVersions[selectedVersionIndex].versionNumber} - Media ${selectedMediaIndex + 1}`}
                                                className="max-w-full h-auto max-h-96 rounded-xl shadow-lg border border-gray-200"
                                                onLoad={handleVersionImgLoad}
                                                onError={(e) => { e.target.style.display = 'none'; }}
                                              />
                                            ) : (
                                              <video
                                                src={previousVersions[selectedVersionIndex].media[selectedMediaIndex].url}
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
                                            const { x: scaledX, y: scaledY } = getVersionScaledMarkerPos(commentX, commentY);
                                            let boxLeft = 40;
                                            let boxRight = 'auto';
                                            if (versionImgDimensions?.contentW ? scaledX > versionImgDimensions.contentW / 2 : commentX > 150) { boxLeft = 'auto'; boxRight = 40; }
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
                                                onMouseEnter={() => setHoveredVersionComment(comment.id)}
                                                onMouseLeave={() => setHoveredVersionComment(null)}
                                                onClick={(e) => { e.stopPropagation(); handleVersionCommentClick(comment.id); }}
                                              >
                                                {index + 1}
                                                {(activeVersionComment === comment.id || hoveredVersionComment === comment.id) && (
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
                                                    {comment.reply && (
                                                      <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                                                        <p className="text-[10px] font-bold text-indigo-700 mb-0.5">
                                                          Reply by {comment.reply.creatorName || 'Creator'}
                                                        </p>
                                                        <p className="text-xs text-gray-800 break-words">{comment.reply.text}</p>
                                                      </div>
                                                    )}
                                                    <button
                                                      onClick={() => handleVersionToggleDone(comment.id)}
                                                      className={`w-full px-3 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center justify-center mt-2 ${
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

                                      {/* Media thumbnails strip */}
                                      {previousVersions[selectedVersionIndex].media.length > 1 && (
                                        <div className="flex justify-center gap-2 mt-4">
                                          {previousVersions[selectedVersionIndex].media.map((media, index) => (
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

                                {/* Caption / Hashtags / Notes / Status */}
                                <div className="space-y-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                                      <p className="text-gray-900">{previousVersions[selectedVersionIndex].caption || 'No caption'}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Hashtags</label>
                                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                                      <p className="text-blue-600 font-medium">{previousVersions[selectedVersionIndex].hashtags || 'No hashtags'}</p>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                                    <div className="bg-white rounded-lg p-4 border border-gray-200">
                                      <p className="text-gray-900">{previousVersions[selectedVersionIndex].notes || 'No notes'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between text-sm text-gray-500">
                                    <span>Created: {formatVersionDateLong(previousVersions[selectedVersionIndex].createdAt)}</span>
                                    <div className="flex items-center gap-2 flex-wrap justify-end">
                                      {(previousVersions[selectedVersionIndex].status === 'approved' ||
                                        previousVersions[selectedVersionIndex].status === 'approved_by_admin') && (
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                          <ShieldCheck className="h-3 w-3" />
                                          Approved by Admin
                                        </span>
                                      )}
                                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getVersionStatusColor(previousVersions[selectedVersionIndex].status)}`}>
                                        {(previousVersions[selectedVersionIndex].status || '').replace(/_/g, ' ').toUpperCase()}
                                      </span>
                                    </div>
                                  </div>
                                  {(previousVersions[selectedVersionIndex].status === 'approved' ||
                                    previousVersions[selectedVersionIndex].status === 'approved_by_admin') &&
                                    previousVersions[selectedVersionIndex].approvalNotes && (
                                    <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
                                      <ShieldCheck className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <p className="text-xs font-semibold text-green-700 mb-0.5">Admin Approval Note</p>
                                        <p className="text-xs text-green-800">{previousVersions[selectedVersionIndex].approvalNotes}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* ── Right 1/3: Version History list + Comments ── */}
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
                              {(() => {
                                const internalVersions = previousVersions
                                  .map((v, i) => ({ ...v, idx: i }))
                                  .filter(v => v.submissionStage !== 'customer');
                                return (
                                  <>
                                    {internalVersions.length > 0 && (
                                      <div>
                                        <div className="px-5 pt-3 pb-2 text-xs font-bold uppercase tracking-wider text-purple-500 bg-purple-50/60">
                                          Internal Review
                                        </div>
                                        {internalVersions.map((version, ci) => {
                                          const { date, time } = formatVersionDate(version.createdAt);
                                          return (
                                            <button
                                              key={version.id || version.idx}
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
                                                  V{ci + 1}
                                                </span>
                                                {version.media?.length > 0 && (
                                                  <span className="flex items-center">
                                                    <Image className="h-3 w-3 mr-1" />
                                                    {version.media.length}
                                                  </span>
                                                )}
                                              </div>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </>
                                );
                              })()}
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
                                    Version {previousVersions[selectedVersionIndex]?.versionNumber} • Media {selectedMediaIndex + 1}
                                  </p>
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-full">
                                {commentsForCurrentMedia.length}
                              </span>
                            </div>
                          </div>
                          <div className="max-h-96 overflow-y-auto p-4">
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
                                    className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                                      activeVersionComment === comment.id
                                        ? 'bg-purple-50 border-purple-200 shadow-sm'
                                        : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                                    }`}
                                  >
                                    <div
                                      className="p-3 cursor-pointer"
                                      onClick={() => handleVersionCommentClick(comment.id)}
                                    >
                                      <div className="flex items-start gap-3">
                                        <span className="font-bold text-white bg-purple-500 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
                                          {idx + 1}
                                        </span>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm text-gray-800 break-words leading-relaxed">
                                            {comment.message || comment.comment}
                                          </p>
                                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <p className="text-xs text-gray-400">
                                              {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                                            </p>
                                            {comment.done ? (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleVersionToggleDone(comment.id); }}
                                                className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-gray-100 px-1.5 py-0.5 rounded transition-colors"
                                              >
                                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                                                <span className="text-emerald-600 font-semibold">Done</span>
                                                <span className="text-gray-400">· Undo</span>
                                              </button>
                                            ) : (
                                              <button
                                                onClick={(e) => { e.stopPropagation(); handleVersionToggleDone(comment.id); }}
                                                className="flex items-center gap-1 text-xs text-gray-400 hover:text-green-600 bg-gray-50 hover:bg-green-50 px-1.5 py-0.5 rounded transition-colors"
                                              >
                                                <CheckCircle className="h-3 w-3" />
                                                Mark Done
                                              </button>
                                            )}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (replyingToComment === comment.id) {
                                                  setReplyingToComment(null);
                                                  setReplyText('');
                                                } else {
                                                  setReplyingToComment(comment.id);
                                                  setReplyText('');
                                                }
                                              }}
                                              className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded transition-colors"
                                            >
                                              <MessageSquare className="h-3 w-3" />
                                              {comment.reply ? 'Edit Reply' : 'Reply'}
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Existing reply */}
                                    {comment.reply && replyingToComment !== comment.id && (
                                      <div className="mx-3 mb-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Reply</span>
                                          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                                            {comment.reply.creatorName || 'Creator'}
                                          </span>
                                          <span className="text-[10px] text-gray-400 ml-auto">
                                            {comment.reply.timestamp ? new Date(comment.reply.timestamp).toLocaleString() : ''}
                                          </span>
                                        </div>
                                        <p className="text-xs text-gray-800 break-words leading-relaxed">{comment.reply.text}</p>
                                      </div>
                                    )}

                                    {/* Reply input */}
                                    {replyingToComment === comment.id && (
                                      <div
                                        className="mx-3 mb-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {comment.reply && (
                                          <p className="text-[10px] text-indigo-500 mb-1.5 font-medium">Editing your existing reply…</p>
                                        )}
                                        <textarea
                                          value={replyText}
                                          onChange={(e) => setReplyText(e.target.value)}
                                          placeholder="Write your reply…"
                                          rows={2}
                                          autoFocus
                                          className="w-full border border-indigo-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none bg-white"
                                        />
                                        <div className="flex gap-2 mt-2">
                                          <button
                                            onClick={() => handleVersionReplySubmit(comment.id)}
                                            disabled={replySubmitting || !replyText.trim()}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-medium rounded-lg transition-colors"
                                          >
                                            {replySubmitting
                                              ? <div className="animate-spin rounded-full h-3 w-3 border-b border-white" />
                                              : <Send className="h-3 w-3" />}
                                            Send
                                          </button>
                                          <button
                                            onClick={() => { setReplyingToComment(null); setReplyText(''); }}
                                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium rounded-lg transition-colors"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    )}
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

          {/* Right Column - Content Details & Assignment Info */}
          <div className="space-y-6">
            {/* Notify Admin Section — FIRST, most important */}
            <div className="bg-white rounded-lg shadow-sm p-6 border-2 border-purple-100">
              <h2 className="text-lg font-semibold mb-1 flex items-center">
                <Bell className="h-5 w-5 mr-2 text-purple-600" />
                Send to Admin
                <span className="ml-2 text-xs font-medium text-red-500">*</span>
              </h2>
              <p className="text-xs text-gray-500 mb-3">
                Select which admin(s) should review this content. They'll receive an email notification with your submission.
              </p>

              {adminsLoading ? (
                <div className="flex items-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-500 mr-2"></div>
                  Loading admins…
                </div>
              ) : adminsList.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No admins available.</p>
              ) : (
                <div className="border border-gray-200 rounded-md overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setAdminsDropdownOpen(prev => !prev)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors text-sm ${
                      selectedAdmins.length === 0 ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <span className={selectedAdmins.length === 0 ? 'text-red-400' : 'text-gray-700'}>
                      {selectedAdmins.length === 0
                        ? 'Select at least one admin…'
                        : `${selectedAdmins.length} admin${selectedAdmins.length > 1 ? 's' : ''} selected`}
                    </span>
                    {adminsDropdownOpen
                      ? <ChevronUp className="h-4 w-4 text-gray-400" />
                      : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>

                  {adminsDropdownOpen && (
                    <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                      {adminsList.map(admin => {
                        const isSelected = selectedAdmins.some(a => a.id === admin.id);
                        return (
                          <label
                            key={admin.id}
                            className={`flex items-center px-3 py-2.5 cursor-pointer hover:bg-purple-50 transition-colors ${isSelected ? 'bg-purple-50' : 'bg-white'}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleAdminSelection(admin)}
                              className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500 mr-3 flex-shrink-0"
                            />
                            <User className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{admin.name}</p>
                              <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-purple-600 ml-auto flex-shrink-0" />}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {selectedAdmins.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {selectedAdmins.map(admin => (
                    <span
                      key={admin.id}
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs bg-purple-100 text-purple-700 font-medium"
                    >
                      {admin.name}
                      <button
                        type="button"
                        onClick={() => toggleAdminSelection(admin)}
                        className="ml-1 hover:text-purple-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-2 mt-3 p-2.5 bg-amber-50 border border-amber-100 rounded-md">
                  <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Please select at least one admin so they can review and approve your content before it reaches the customer.</p>
                </div>
              )}
            </div>

            {/* Assignment Details - Desktop */}
            <div className="bg-white rounded-lg shadow-sm p-6 hidden md:block">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-purple-600" />
                Assignment Details
              </h2>
              
              <div className="space-y-3">
                <div>
                  <h3 className="font-medium text-gray-900">{assignment.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-4 w-4 mr-1" />
                  {assignment.customerName}
                </div>
                
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar className="h-4 w-4 mr-1" />
                  Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
                </div>

                {assignment.requirements && assignment.requirements.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 text-sm mb-2">Requirements:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {assignment.requirements.map((req, index) => (
                        <li key={index} className="flex items-start">
                          <Check className="h-3 w-3 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                          {req}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Content Details Form */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2 text-purple-600" />
                Content Details
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Caption
                  </label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Draft caption for the post (admin will review before it goes to customer)…"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Tag className="h-4 w-4 inline mr-1" />
                    Hashtags
                  </label>
                  <input
                    type="text"
                    value={hashtags}
                    onChange={(e) => setHashtags(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="#fashion #summer #style"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes for Admin
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Any specific instructions or context for the admin reviewing this content…"
                  />
                </div>
              </div>
            </div>

            {/* Notify Admin section moved to top of right column above — removed from here */}

            {/* Send to Customer — only visible when admin has approved latest version */}
            {(() => {
              const latestApproved = [...previousVersions].reverse().find(v => v.status === 'approved');
              if (!latestApproved) return null;
              return (
                <div className={`rounded-lg shadow-sm p-5 border-2 ${
                  sentToCustomer ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className={`h-5 w-5 ${sentToCustomer ? 'text-green-600' : 'text-orange-600'}`} />
                    <h3 className={`font-semibold text-sm ${sentToCustomer ? 'text-green-800' : 'text-orange-800'}`}>
                      {sentToCustomer ? 'Admin Directly Sent to Customer' : 'Admin Approved — Ready to Send'}
                    </h3>
                  </div>
                  {sentToCustomer ? (
                    <p className="text-xs text-green-700 mb-3">
                      The customer has been notified and can now review this content.
                    </p>
                  ) : (
                    <p className="text-xs text-orange-700 mb-3">
                      Admin has approved version {latestApproved.versionNumber}. You can now send it to the customer for their review.
                    </p>
                  )}
                  {!sentToCustomer && (
                    <button
                      onClick={handleSendToCustomer}
                      disabled={sendingToCustomer}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                    >
                      {sendingToCustomer ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Send to Customer
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Submit Button */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="text-center">
                <h3 className="font-semibold text-gray-900 mb-1">Submit for Admin Review</h3>
                {selectedAdmins.length > 0 ? (
                  <p className="text-sm text-gray-600 mb-4">
                    Will be sent to <span className="font-medium text-purple-700">{selectedAdmins.map(a => a.name).join(', ')}</span> for review.
                    Content only reaches the customer after admin approval.
                  </p>
                ) : (
                  <p className="text-sm text-amber-600 mb-4 flex items-center justify-center gap-1">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    Select an admin above before submitting
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || uploadedFiles.length === 0 || uploadedFiles.some(f => f.uploading) || selectedAdmins.length === 0}
                  className="w-full inline-flex items-center justify-center px-6 py-3 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit to Admin for Review
                    </>
                  )}
                </button>
                {uploadedFiles.some(f => f.uploading) && (
                  <p className="text-xs text-gray-500 mt-2">
                    Please wait for all uploads to complete
                  </p>
                )}
                {selectedAdmins.length === 0 && !adminsLoading && adminsList.length > 0 && (
                  <p className="text-xs text-amber-600 mt-2">Select an admin above to enable submit</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Media Preview Modal */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-7xl max-h-full" onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            
            {/* Media Content */}
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
              
              {/* Media Info */}
              <div className="p-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{selectedMedia.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedMedia.size)}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedMedia.type === 'image' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedMedia.type.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentUpload;