import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { ArrowLeft, Upload, Image, X, Check, CheckCircle, FileText, Calendar, Clock, Palette, Send, MapPin, Tag, MessageSquare, Play, Video, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, User, ShieldCheck, AlertCircle, History, Search, Globe, Plus } from 'lucide-react';
import { Facebook, Instagram, Linkedin, Youtube, Twitter } from 'lucide-react';
import ContentCreatorLayout from './Layout';
import { validateMediaForPlatforms, validateThumbnail, hasMixedContent, hasMultipleVideos } from './mediaValidation';

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

function normalizeReviewTabMode(value) {
  if (value === 'admin' || value === 'customer' || value === 'both') return value;
  return 'both';
}

function ContentUpload() {
  const navigate = useNavigate();
  const location = useLocation();
  const { calendarId, itemIndex } = useParams();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef(null);
  const thumbnailInputRef = useRef(null);
  const isAdminPortal = useMemo(() => location.pathname.startsWith('/admin'), [location.pathname]);
  const isAdmin = useMemo(() => getUserRole() === 'admin' || window.location.hash.includes('admin') || isAdminPortal, [isAdminPortal]);
  const [activeTab, setActiveTab] = useState(() => (getUserRole() === 'admin' || window.location.hash.includes('admin') || window.location.pathname.startsWith('/admin')) ? 'customer' : 'admin');
  const [reviewTabMode, setReviewTabMode] = useState('both');

  // State for assignment details
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [thumbnailFileObj, setThumbnailFileObj] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const replaceFileInputRef = useRef(null);
  const [replacingFileId, setReplacingFileId] = useState(null);
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
  const [allPreviousVersions, setAllPreviousVersions] = useState([]);
  // Compute admin-stage versions
  const adminVersions = useMemo(() => {
    return allPreviousVersions
      .filter(v => v.submissionStage !== 'customer' || v.sentToCustomerAt)
      .map((v, idx) => ({
        ...v,
        flowVersionNumber: idx + 1,
        versionNumber: idx + 1
      }));
  }, [allPreviousVersions]);

  // Compute customer-stage versions
  const customerVersions = useMemo(() => {
    return allPreviousVersions
      .filter(v => v.submissionStage === 'customer' || v.submissionStage === '')
      .map((v, idx) => ({
        ...v,
        flowVersionNumber: idx + 1,
        versionNumber: idx + 1
      }));
  }, [allPreviousVersions]);

  // Derive previousVersions from activeTab for easy drop-in compatibility
  const previousVersions = useMemo(() => {
    return activeTab === 'admin' ? adminVersions : customerVersions;
  }, [activeTab, adminVersions, customerVersions]);
  const [versionsAccordionOpen, setVersionsAccordionOpen] = useState(true);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [validationNotice, setValidationNotice] = useState('');
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeVersionComment, setActiveVersionComment] = useState(null);
  const [hoveredVersionComment, setHoveredVersionComment] = useState(null);
  const [versionImgDimensions, setVersionImgDimensions] = useState(null);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const versionImgRef = useRef(null);
  const videoRef = useRef(null);

  // Send-to-customer state
  const [sendingToCustomer, setSendingToCustomer] = useState(false);
  const [sentToCustomer, setSentToCustomer] = useState(false);
  const [adminUploadedForThis, setAdminUploadedForThis] = useState(false);
  const [submitSuccessModal, setSubmitSuccessModal] = useState({
    open: false,
    title: '',
    message: ''
  });

  // Admin notification state
  const [adminsList, setAdminsList] = useState([]);
  const [, setAdminsLoading] = useState(false);

  const displayAdminsList = useMemo(() => {
    if (!assignment || !assignment.customerId) return [];
    return adminsList.filter(admin =>
      admin.assignedCustomers && admin.assignedCustomers.includes(assignment.customerId)
    );
  }, [adminsList, assignment]);

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
            email: a.email || '',
            assignedCustomers: a.assignedCustomers || []
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



  // Assignment picker state (used when no params provided)
  const [pickerAssignments, setPickerAssignments] = useState([]);
  const [pickerCustomers, setPickerCustomers] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerPlatform, setPickerPlatform] = useState('all');
  const [pickerStatus, setPickerStatus] = useState('all');
  const [pickerCustomer, setPickerCustomer] = useState(() => searchParams.get('customer') || 'all');
  const [pickerSort, setPickerSort] = useState('due');
  const [pickerSubmissions, setPickerSubmissions] = useState([]);
  const [pickerScheduledPosts, setPickerScheduledPosts] = useState([]);

  // Helper: flatten platform (string or array) into a lowercase string array
  const flatPlatforms = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => String(v).trim().toLowerCase()).filter(Boolean);
    return [String(val).trim().toLowerCase()];
  };

  const getValidationPlatforms = (val) => {
    if (!val) return [];
    const asString = Array.isArray(val) ? val.join(',') : String(val);
    const matches = asString.match(/facebook|instagram|youtube|linkedin|twitter|tiktok|pinterest/ig);
    if (matches) {
      return [...new Set(matches.map(match => match.toLowerCase()))];
    }
    return flatPlatforms(val);
  };

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
    const isCustomerApproved = subs.some(s => s.approved_by_customer === true || s.status === 'approved_customer' || s.status === 'approved_both');
    if (isCustomerApproved) return 'approved';
    return 'pending';
  };

  const getPickerItemApproval = (a) => {
    const filterStatus = getPickerFilterStatus(a);
    if (filterStatus === 'published') {
      return {
        label: 'Published',
        color: 'bg-purple-100 text-purple-800'
      };
    }
    if (filterStatus === 'pending') {
      return {
        label: 'Pending',
        color: 'bg-orange-100 text-orange-800'
      };
    }

    const subs = pickerSubmissions.filter(sub => {
      const subCal = sub.calendar_id || sub.calendarId;
      const subIdx = sub.item_index !== undefined ? String(sub.item_index) : undefined;
      if (subCal && subIdx !== undefined) {
        return subCal === a.calendarId && subIdx === String(a.itemIndex);
      }
      const subId = sub.assignment_id || sub.assignmentId;
      return subId && String(subId) === String(a.id);
    });

    const isCustomerApproved = subs.some(s => s.approved_by_customer === true || s.status === 'approved_customer' || s.status === 'approved_both') || a.status === 'approved';
    const isAdminApproved = subs.some(s => s.approved_by_admin === true || s.status === 'approved_admin' || s.status === 'approved_both' || (s.status === 'approved' && !s.approved_by_customer) || (s.submission_stage || s.submissionStage || '') === 'customer');

    if (isCustomerApproved && isAdminApproved) {
      return {
        label: 'Both Approved',
        color: 'bg-green-100 text-green-800'
      };
    }
    if (isCustomerApproved) {
      return {
        label: 'Customer Approved',
        color: 'bg-green-100 text-green-800'
      };
    }
    if (isAdminApproved) {
      return {
        label: 'Admin Approved',
        color: 'bg-indigo-100 text-indigo-800'
      };
    }

    return {
      label: 'Approved',
      color: 'bg-green-100 text-green-800'
    };
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
    const isCustApproved = latest.approved_by_customer === true || latest.status === 'approved_customer' || latest.status === 'approved_both';
    if (isCustApproved) {
      return { label: 'Customer Approved', color: 'bg-green-100 text-green-700' };
    }
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

  const selectedCustomer = useMemo(() => {
    if (!pickerCustomer || pickerCustomer === 'all') return null;
    return pickerCustomers.find(c => (c._id || c.id) === pickerCustomer);
  }, [pickerCustomers, pickerCustomer]);

  const pickerStats = useMemo(() => {
    const customerAssignments = pickerAssignments.filter(a => pickerCustomer === 'all' || a.customerId === pickerCustomer);

    const adminApprovedCount = customerAssignments.filter(a => {
      const subs = pickerSubmissions.filter(sub => {
        const subCal = sub.calendar_id || sub.calendarId;
        const subIdx = sub.item_index !== undefined ? String(sub.item_index) : undefined;
        if (subCal && subIdx !== undefined) {
          return subCal === a.calendarId && subIdx === String(a.itemIndex);
        }
        const subId = sub.assignment_id || sub.assignmentId;
        return subId && String(subId) === String(a.id);
      });
      return subs.some(s => s.status === 'approved' && (s.submission_stage || s.submissionStage || 'internal') !== 'customer');
    }).length;

    return {
      total:         customerAssignments.length,
      pending:       customerAssignments.filter(a => getPickerFilterStatus(a) === 'pending').length,
      approved:      customerAssignments.filter(a => getPickerFilterStatus(a) === 'approved').length,
      published:     customerAssignments.filter(a => getPickerFilterStatus(a) === 'published').length,
      adminApproved: adminApprovedCount
    };
  }, [pickerAssignments, pickerSubmissions, pickerScheduledPosts, pickerCustomer]);

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
        setPickerCustomers(custData.customers || []);
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
                  customerId: custId,
                  itemIndex: index,
                  id: item.id || item._id || `${calendar._id || calendar.id}::${index}`,
                  stableItemId: item.id || item._id || `${calendar._id || calendar.id}::${index}`,
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
    setAllPreviousVersions([]);
    setSelectedVersionIndex(0);
    setSelectedMediaIndex(0);
    setCommentsForVersion([]);
    setCommentsForCurrentMedia([]);
    setSentToCustomer(false);
    setAdminUploadedForThis(false);
    setReviewTabMode('both');
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
              id: c._id || c.id,
              reviewTabMode: normalizeReviewTabMode(c.reviewTabMode)
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
              const stableItemId = item.id || item._id || `${calendar._id}::${idx}`;
              found = {
                ...item,
                calendarName: calendar.name || calendar.customerName || calendar.customer || '',
                calendarId: calendar._id,
                customerId: customerId,
                customerName: customerInfo.name || calendar.customerName || calendar.name || '',
                customerEmail: customerInfo.email || '',
                id: stableItemId,
                stableItemId,
                itemIndex: idx,
                dueDate: item.dueDate || item.due_date || item.date,
                platform: item.platform || item.type || 'Instagram',
                requirements: item.requirements || [],
                reviewTabMode: normalizeReviewTabMode(customerInfo.reviewTabMode),
                createdAt: item.createdAt || item.created_at || null,
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
        const initialMode = normalizeReviewTabMode(found?.reviewTabMode) || 'admin';
        setActiveTab(initialMode === 'both' ? 'admin' : initialMode);
        setReviewTabMode(initialMode);
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
        const assignmentCreatedAt = assignment.createdAt ? new Date(assignment.createdAt).getTime() : 0;
        const previousSubmissions = submissions.filter(sub => {
          const subCalendarId = sub.calendar_id || sub.calendarId;
          const subItemIndex  = (sub.item_index !== undefined && sub.item_index !== null)
            ? String(sub.item_index)
            : undefined;
          const subAssignmentId = sub.assignment_id || sub.assignmentId || sub.assignmentID;
          const subCreatedAtValue = sub.created_at || sub.createdAt;
          const subCreatedAt = subCreatedAtValue ? new Date(subCreatedAtValue).getTime() : 0;
          const isNewerThanAssignment = !assignmentCreatedAt || !subCreatedAt || subCreatedAt >= assignmentCreatedAt;

          if (!isNewerThanAssignment) {
            return false;
          }

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
          const normalized = allVersionsSorted
            .map((sub, idx) => ({
              versionNumber: idx + 1,
              caption: sub.caption || '',
              hashtags: sub.hashtags || '',
              notes: sub.notes || '',
              media: [
                ...normMedia(sub.media || sub.images || []),
                ...(sub.thumbnailUrl ? [{ url: sub.thumbnailUrl, type: 'image', isThumbnail: true }] : [])
              ],
              createdAt: sub.created_at || sub.createdAt || '',
              status: sub.status || 'submitted',
              submissionStage: sub.submission_stage || sub.submissionStage || 'internal',
              approvalNotes: sub.approval_notes || sub.approvalNotes || '',
              comments: sub.comments || [],
              id: sub._id || sub.id || idx,
              sentToCustomerAt: sub.sent_to_customer_at || sub.sentToCustomerAt || null,
              thumbnailUrl: sub.thumbnailUrl || null,
            }));
          setAllPreviousVersions(normalized);
          const tabVersions = normalized.filter(v =>
            activeTab === 'admin'
              ? (v.submissionStage !== 'customer' || v.sentToCustomerAt)
              : (v.submissionStage === 'customer' || v.submissionStage === '')
          );
          if (tabVersions.length > 0) {
            setSelectedVersionIndex(tabVersions.length - 1);
            setSelectedMediaIndex(0);
          }
        }

        // Reset selected version when activeTab changes
        // This is handled in a separate useEffect below


        // Pre-fill from latest submission regardless of stage
        const prefillSource = [...previousSubmissions].sort((a, b) =>
          new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
        );

        if (prefillSource.length > 0) {
          const latestSubmission = prefillSource[0];
          if (latestSubmission.caption) setCaption(latestSubmission.caption);
          if (latestSubmission.hashtags) setHashtags(latestSubmission.hashtags);
          if (latestSubmission.notes) setNotes(latestSubmission.notes);

          const revisionStatuses = [
            'revision_requested',
            'changes_requested',
            'changes_requested_admin',
            'changes_requested_customer_approved_admin'
          ];
          if (revisionStatuses.includes(latestSubmission.status)) {
            const mediaItems = normMedia(latestSubmission.media || latestSubmission.images || []);
            const prepopulated = mediaItems.map((item, idx) => {
              const url = item.url;
              const type = item.type || 'image';
              const name = item.name || url.split('/').pop() || `media-${idx}`;
              return {
                id: `existing-${idx}-${Date.now()}`,
                isExisting: true,
                file: null,
                preview: url,
                publicUrl: url,
                type: type,
                name: name,
                uploaded: true,
                uploading: false,
                error: null
              };
            });
            setUploadedFiles(prepopulated);
          }
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

  // No-op: Removed reactive activeTab enforcement to allow manual version selection switching tabs.

  // Sync comments when version or media selection changes and activeTab changes
  useEffect(() => {
    if (previousVersions.length > 0 && previousVersions[selectedVersionIndex]) {
      const allComments = previousVersions[selectedVersionIndex].comments || [];
      const filteredComments = allComments.filter(c => {
        const isAdminComment = c.reviewType === 'internal' || c.authorRole === 'admin' || c.author === 'Admin';
        
        // Hide unfinalized admin comments from the creator
        if (!isAdmin && isAdminComment && !c.finalized) {
          return false;
        }

        return activeTab === 'admin' ? (isAdminComment && !c.discarded) : (!isAdminComment && c.finalized && !c.discarded);
      });
      setCommentsForVersion(filteredComments);
    } else {
      setCommentsForVersion([]);
    }
    setActiveVersionComment(null);
  }, [previousVersions, selectedVersionIndex, activeTab]);

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
    const comment = commentsForCurrentMedia.find(c => c.id === id);
    if (comment && comment.videoTimestamp != null && videoRef.current) {
      videoRef.current.currentTime = comment.videoTimestamp;
      videoRef.current.pause();
      videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
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
    const newReply = {
      id: uuidv4(),
      authorRole: 'creator',
      authorName: 'Creator',
      authorEmail: creatorEmail || '',
      message: replyText.trim(),
      timestamp: new Date().toISOString(),
    };
    const existingReplies = comment.replies || (comment.reply ? [{
      id: 'legacy-creator-reply',
      authorRole: 'creator',
      authorName: 'Creator',
      authorEmail: comment.reply.creatorEmail || '',
      message: comment.reply.text,
      timestamp: comment.reply.timestamp
    }] : []);
    const updatedReplies = [...existingReplies, newReply];
    const replyPayload = {
      reply: {
        text: replyText.trim(),
        creatorEmail: creatorEmail,
        timestamp: new Date().toISOString(),
      },
      replies: updatedReplies,
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

  const handleThumbnailChange = async (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file for the thumbnail.');
        return;
      }

      const validationPlatforms = getValidationPlatforms(assignment?.platform);
      const validationResult = await validateThumbnail(file, {
        platforms: validationPlatforms,
      });

      const validationIssues = validationResult.issues || [];
      const errorIssue = validationIssues.find(issue => issue.level === 'error') || null;
      const warningIssues = validationIssues.filter(issue => issue.level === 'warning');

      if (validationIssues.length > 0) {
        setValidationNotice(validationIssues.map(issue => issue.message).join(' '));
        if (errorIssue) {
          window.alert(errorIssue.message);
          return;
        } else {
          window.alert(validationIssues.map(issue => issue.message).join(' '));
        }
      } else {
        setValidationNotice('');
      }

      const preview = URL.createObjectURL(file);
      setThumbnailFileObj({
        file,
        preview,
        name: file.name,
        size: file.size,
        uploaded: false,
        uploading: false,
        publicUrl: null,
        error: errorIssue ? errorIssue.message : null,
        warnings: warningIssues.map(issue => issue.message),
        validationIssues
      });
    }
  };

  const onThumbnailButtonClick = () => {
    thumbnailInputRef.current?.click();
  };

  const handleFiles = async (files) => {
    const incomingFiles = Array.from(files || []);
    const validationPlatforms = getValidationPlatforms(assignment?.platform);

    const incomingTypes = incomingFiles.map(f => f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : null).filter(Boolean);
    const existingTypes = uploadedFiles.map(f => f.type);
    const allTypes = [...new Set([...existingTypes, ...incomingTypes])];

    if (allTypes.includes('image') && allTypes.includes('video')) {
      window.alert('Mixed content is not allowed for carousel posts. You cannot select images and videos together.');
      return;
    }

    const incomingVideosCount = incomingFiles.filter(f => f.type.startsWith('video/')).length;
    const existingVideosCount = uploadedFiles.filter(f => f.type === 'video').length;
    if (incomingVideosCount + existingVideosCount > 1) {
      window.alert('Multiple videos are not allowed. A carousel post can only contain a single video or multiple images.');
      return;
    }

    for (const file of incomingFiles) {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        continue;
      }

      const validationResult = await validateMediaForPlatforms(file, {
        platforms: validationPlatforms,
      });

      const preview = URL.createObjectURL(file);
      const validationIssues = validationResult.issues || [];
      const errorIssue = validationIssues.find(issue => issue.level === 'error') || null;
      const warningIssues = validationIssues.filter(issue => issue.level === 'warning');

      const newFile = {
        id: Date.now() + Math.random(),
        file,
        preview,
        name: file.name,
        size: file.size,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        uploaded: false,
        uploading: false,
        publicUrl: null,
        error: errorIssue ? errorIssue.message : null,
        warnings: warningIssues.map(issue => issue.message),
        validationIssues,
      };

      setUploadedFiles(prev => [...prev, newFile]);

      if (validationIssues.length > 0) {
        setValidationNotice(validationIssues.map(issue => issue.message).join(' '));
        if (errorIssue) {
          window.alert(errorIssue.message);
        }
      } else {
        setValidationNotice('');
      }
    }
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (!bytes || typeof bytes !== 'number' || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleReplaceClick = (fileId) => {
    setReplacingFileId(fileId);
    replaceFileInputRef.current?.click();
  };

  const handleReplaceChange = async (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0] && replacingFileId !== null) {
      const file = e.target.files[0];
      await handleReplaceFile(replacingFileId, file);
      e.target.value = '';
      setReplacingFileId(null);
    }
  };

  const handleReplaceFile = async (fileId, file) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      window.alert('Please select an image or video file.');
      return;
    }

    const validationPlatforms = getValidationPlatforms(assignment?.platform);

    const incomingType = file.type.startsWith('image/') ? 'image' : 'video';
    const otherFilesTypes = uploadedFiles.filter(f => f.id !== fileId).map(f => f.type);
    const allTypes = [...new Set([...otherFilesTypes, incomingType])];

    if (allTypes.includes('image') && allTypes.includes('video')) {
      window.alert('Mixed content is not allowed for carousel posts. You cannot select images and videos together.');
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const otherVideosCount = uploadedFiles.filter(f => f.id !== fileId && f.type === 'video').length;
    if ((isVideo ? 1 : 0) + otherVideosCount > 1) {
      window.alert('Multiple videos are not allowed. A carousel post can only contain a single video or multiple images.');
      return;
    }

    const validationResult = await validateMediaForPlatforms(file, {
      platforms: validationPlatforms,
    });

    const preview = URL.createObjectURL(file);
    const validationIssues = validationResult.issues || [];
    const errorIssue = validationIssues.find(issue => issue.level === 'error') || null;
    const warningIssues = validationIssues.filter(issue => issue.level === 'warning');

    if (validationIssues.length > 0) {
      setValidationNotice(validationIssues.map(issue => issue.message).join(' '));
      if (errorIssue) {
        window.alert(errorIssue.message);
      }
    } else {
      setValidationNotice('');
    }

    setUploadedFiles(prev => prev.map(f => {
      if (f.id === fileId) {
        return {
          id: f.id,
          file,
          preview,
          name: file.name,
          size: file.size,
          type: file.type.startsWith('image/') ? 'image' : 'video',
          isExisting: false,
          uploaded: false,
          uploading: false,
          publicUrl: null,
          error: errorIssue ? errorIssue.message : null,
          warnings: warningIssues.map(issue => issue.message),
          validationIssues,
        };
      }
      return f;
    }));
  };

  // Upload single file - uses streaming upload for large files (>=10MB), base64 for small files
  const uploadFileToGCS = async (fileObj) => {
    try {
      const fileSizeMB = fileObj.file.size / (1024 * 1024);
      console.log(`📤 Starting upload for ${fileObj.name} (${formatFileSize(fileObj.size)})`);      
      // Validate file object
      if (!fileObj.file || !fileObj.file.size || fileObj.file.size === 0) {
        throw new Error(`Invalid file: ${fileObj.name} has no content or is corrupted`);
      }
      
      // Update file status to uploading
      setUploadedFiles(prev => 
        prev.map(f => f.id === fileObj.id ? { ...f, uploading: true, error: null } : f)
      );

      let publicUrl;

      // Use streaming upload (proxied via backend) for large files (>=10MB).
      // Direct browser→GCS signed URL uploads require bucket-level CORS config.
      // Streaming through the backend avoids that requirement entirely.
      if (fileSizeMB >= 10) {
        console.log(`📤 Using signed-URL upload for large file: ${fileObj.name} (${fileSizeMB.toFixed(2)} MB)`);

        // Step 1: Get a signed URL from the backend
        const signedUrlResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/signed-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: fileObj.name, contentType: fileObj.file.type }),
        });

        if (!signedUrlResponse.ok) {
          const errorData = await signedUrlResponse.json().catch(() => ({}));
          throw new Error(`Failed to get signed URL: ${errorData.error || signedUrlResponse.statusText}`);
        }

        const { signedUrl, publicUrl: signedPublicUrl } = await signedUrlResponse.json();

        // Step 2: PUT the file directly to GCS using the signed URL
        const gcsUploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': fileObj.file.type },
          body: fileObj.file,
        });

        if (!gcsUploadResponse.ok) {
          throw new Error(`GCS upload failed: ${gcsUploadResponse.statusText}`);
        }

        publicUrl = signedPublicUrl;
        console.log(`✅ Successfully uploaded ${fileObj.name} via signed URL`);

      } else {
        // Use base64 upload for small files (<10MB)
        console.log(`📤 Using base64 upload for small file: ${fileObj.name} (${fileSizeMB.toFixed(2)} MB)`);

        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (!result || typeof result !== 'string') {
              reject(new Error('Failed to read file as base64'));
              return;
            }
            const base64 = result.split(',')[1];
            if (!base64 || base64.length === 0) {
              reject(new Error('Base64 conversion resulted in empty data'));
              return;
            }
            resolve(base64);
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(fileObj.file);
        });

        const payload = {
          filename: fileObj.name,
          contentType: fileObj.file.type,
          base64Data: base64Data
        };

        if (!payload.filename || !payload.contentType || !payload.base64Data) {
          throw new Error(`Invalid payload: missing ${!payload.filename ? 'filename' : !payload.contentType ? 'contentType' : 'base64Data'}`);
        }

        const uploadResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/upload-base64`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(`Upload failed: ${errorData.error || uploadResponse.statusText}`);
        }

        const responseData = await uploadResponse.json();
        publicUrl = responseData.publicUrl;

        console.log(`✅ Successfully uploaded ${fileObj.name} via base64`);
      }

      if (!publicUrl) {
        throw new Error('No public URL returned from upload');
      }

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

  const uploadThumbnailToGCS = async (fileObj) => {
    try {
      setThumbnailFileObj(prev => prev ? { ...prev, uploading: true, error: null } : null);
      
      let publicUrl;
      const fileSizeMB = fileObj.file.size / (1024 * 1024);

      if (fileSizeMB >= 10) {
        const signedUrlResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/signed-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: fileObj.name, contentType: fileObj.file.type }),
        });
        if (!signedUrlResponse.ok) throw new Error('Failed to get signed URL');
        const { signedUrl, publicUrl: signedPublicUrl } = await signedUrlResponse.json();

        const gcsUploadResponse = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': fileObj.file.type },
          body: fileObj.file,
        });
        if (!gcsUploadResponse.ok) throw new Error('GCS upload failed');
        publicUrl = signedPublicUrl;
      } else {
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(fileObj.file);
        });

        const uploadResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/upload-base64`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: fileObj.name,
            contentType: fileObj.file.type,
            base64Data
          }),
        });
        if (!uploadResponse.ok) throw new Error('Upload failed');
        const responseData = await uploadResponse.json();
        publicUrl = responseData.publicUrl;
      }

      setThumbnailFileObj(prev => prev ? { ...prev, uploading: false, uploaded: true, publicUrl } : null);
      return { url: publicUrl };
    } catch (error) {
      console.error('Thumbnail upload failed:', error);
      setThumbnailFileObj(prev => prev ? { ...prev, uploading: false, uploaded: false, error: error.message } : null);
      throw error;
    }
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload at least one image or video');
      return;
    }

    if (hasMixedContent(uploadedFiles)) {
      alert('Mixed content is not allowed for carousel posts. You cannot upload images and videos together.');
      return;
    }

    if (hasMultipleVideos(uploadedFiles)) {
      alert('Multiple videos are not allowed. A carousel post can only contain a single video or multiple images.');
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
    let uploadedThumbnailUrl = null;

    try {
      // Upload thumbnail if present and not uploaded yet
      if (thumbnailFileObj) {
        if (!thumbnailFileObj.uploaded) {
          console.log(`📤 Uploading thumbnail file: ${thumbnailFileObj.name}`);
          const thumbRes = await uploadThumbnailToGCS(thumbnailFileObj);
          uploadedThumbnailUrl = thumbRes.url;
        } else {
          uploadedThumbnailUrl = thumbnailFileObj.publicUrl;
        }
      }

      // Upload new files and keep existing ones, preserving exact carousel order
      const uploadPromises = uploadedFiles.map(async (fileObj) => {
        if ((fileObj.isExisting || fileObj.uploaded) && fileObj.publicUrl) {
          return {
            url: fileObj.publicUrl,
            type: fileObj.type,
            name: fileObj.name,
            size: fileObj.size,
            originalName: fileObj.name
          };
        } else {
          return await uploadFileToGCS(fileObj);
        }
      });

      console.log(`📤 Processing ${uploadedFiles.length} files (uploading new/replaced files, keeping existing)...`);
      const results = await Promise.all(uploadPromises);
      uploadedMediaUrls.push(...results);

      console.log(`✅ All files processed successfully. Total: ${uploadedMediaUrls.length}`);

      // Prepare submission data with comprehensive customer information
      const submissionData = {
        assignment_id: assignment.id,
        caption: caption || '',
        hashtags: hashtags || '',
        notes: notes || '',
        images: uploadedMediaUrls, // ✅ This contains the media URLs and metadata
        media: uploadedMediaUrls,  // ✅ Duplicate for backward compatibility
        thumbnailUrl: uploadedThumbnailUrl || null, // ✅ Include video thumbnail url
        created_by: creatorEmail,
        customer_id: finalCustomerId,
        customer_name: finalCustomerName,
        customer_email: finalCustomerEmail || assignment.customerEmail || '',
        platform: assignment.platform || 'Instagram',
        calendar_id: assignment.calendarId,
        calendar_name: assignment.calendarName,
        item_name: assignment.title || '',
        item_id: assignment.stableItemId || assignment.id || '',
        assignment_title: assignment.title,
        assignment_description: assignment.description,
        due_date: assignment.dueDate,
        status: 'submitted',
        // Content creators submit for internal review; customers/admins upload directly for customer review
        submission_stage: activeTab === 'admin' ? 'internal' : 'customer',
        item_index: assignment.itemIndex !== undefined ? Number(assignment.itemIndex) : parseInt(itemIndex, 10),
        created_at: new Date().toISOString(),
        type: 'submission',
        geo_location: (geoLocation.latitude && geoLocation.longitude) ? geoLocation : undefined,
        address: address || undefined,
        contact_info: contactInfo || undefined,
        notify_admins: activeTab === 'admin' ? displayAdminsList : [],
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

      if (activeTab === 'admin') {
        const adminNames = displayAdminsList.map(a => a.name).join(', ');
        const adminMsg = displayAdminsList.length > 0
          ? `Notified admin(s): ${adminNames}.`
          : 'System admins will review this submission.';
        setSubmitSuccessModal({
          open: true,
          title: 'Submitted for Admin Review',
          message: `${adminMsg} Content will move to customer review after approval.`
        });
      } else {
        setSubmitSuccessModal({
          open: true,
          title: 'Submitted for Customer Review',
          message: 'Your content has been sent directly to the customer for review.'
        });
      }
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

  const closeSubmitSuccessModal = () => {
    setSubmitSuccessModal({ open: false, title: '', message: '' });
    if (isAdmin) {
      window.history.back();
      return;
    }
    if (assignment && assignment.customerId) {
      navigate(`/content-creator/assignments?expand=${assignment.customerId}`);
      return;
    }
    navigate('/content-creator/assignments');
  };

  // No params — show assignment picker
  if (!calendarId || itemIndex === undefined) {
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
        
        let matchStatus = false;
        if (pickerStatus === 'all') {
          matchStatus = true;
        } else if (pickerStatus === 'admin_approved') {
          const subs = pickerSubmissions.filter(sub => {
            const subCal = sub.calendar_id || sub.calendarId;
            const subIdx = sub.item_index !== undefined ? String(sub.item_index) : undefined;
            if (subCal && subIdx !== undefined) {
              return subCal === a.calendarId && subIdx === String(a.itemIndex);
            }
            const subId = sub.assignment_id || sub.assignmentId;
            return subId && String(subId) === String(a.id);
          });
          matchStatus = subs.some(s => s.status === 'approved' && (s.submission_stage || s.submissionStage || 'internal') !== 'customer');
        } else {
          matchStatus = getPickerFilterStatus(a) === pickerStatus;
        }

        const matchCustomer = pickerCustomer === 'all' || a.customerId === pickerCustomer;
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

    const pickerHeaderActions = (
      <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-3 py-1.5 rounded-full">
        {pickerAssignments.length} assignments
      </span>
    );

    return (
      <ContentCreatorLayout
        title="Upload Content"
        subtitle="Select an assignment to upload media for"
        icon={<Palette className="h-5 w-5 text-white" />}
        fullWidthContent={true}
        headerActions={pickerHeaderActions}
      >

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
            {/* ── MAIN LIST ── */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
              {/* banner */}
              {selectedCustomer && (
                <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-2xl font-bold overflow-hidden">
                      {selectedCustomer.profileImage ? (
                        <img src={selectedCustomer.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        (selectedCustomer.name || 'C').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold">{selectedCustomer.name || 'Unnamed Customer'}</h1>
                      <p className="text-purple-100 text-sm">{selectedCustomer.email}</p>
                      {selectedCustomer.companyName && (
                        <p className="text-purple-200 text-xs mt-1 bg-white/10 px-2 py-0.5 rounded-full inline-block">
                          {selectedCustomer.companyName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Tabs + Search */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-4 border border-gray-200/50 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all',           label: 'All',               count: pickerStats.total         },
                      { key: 'pending',       label: 'Pending',           count: pickerStats.pending       },
                      { key: 'approved',      label: 'Customer Approved', count: pickerStats.approved      },
                      { key: 'published',     label: 'Published',         count: pickerStats.published     },
                      { key: 'admin_approved',label: 'Admin Approved',    count: pickerStats.adminApproved },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setPickerStatus(opt.key)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          pickerStatus === opt.key
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {opt.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                          pickerStatus === opt.key ? 'bg-white/20 text-white' : 'bg-white text-gray-600'
                        }`}>{opt.count}</span>
                      </button>
                    ))}
                  </div>
                  <div className="relative flex-shrink-0 w-full sm:w-56">
                    <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search assignments…"
                      value={pickerSearch}
                      onChange={e => setPickerSearch(e.target.value)}
                      className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Active filters strip */}
              {(pickerPlatform !== 'all' || pickerStatus !== 'all' || pickerCustomer !== 'all' || pickerSearch) && (
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  <span className="text-xs text-gray-500 font-medium">Active Filters:</span>
                  {pickerPlatform !== 'all' && (
                    <button onClick={() => setPickerPlatform('all')} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium hover:bg-blue-200">
                      {pickerPlatform} <X className="h-3 w-3" />
                    </button>
                  )}
                  {pickerCustomer !== 'all' && (
                    <button onClick={() => setPickerCustomer('all')} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium hover:bg-green-200">
                      {selectedCustomer ? (selectedCustomer.name || selectedCustomer.customerName) : pickerCustomer} <X className="h-3 w-3" />
                    </button>
                  )}
                  {pickerSearch && (
                    <button onClick={() => setPickerSearch('')} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs font-medium hover:bg-gray-300">
                      "{pickerSearch}" <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

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
                                {(() => {
                                  const approval = getPickerItemApproval(a);
                                  return (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${approval.color}`}>
                                      {approval.label}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>

                            {/* Calendar Name / Post Type row */}
                            {(a.calendarName || a.postType) && (
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                {a.calendarName && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Calendar className="h-3 w-3 flex-shrink-0" />
                                    {a.calendarName}
                                  </span>
                                )}
                                {a.postType && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100 capitalize">
                                    {a.postType}
                                  </span>
                                )}
                              </div>
                            )}

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
      </ContentCreatorLayout>
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

  const handleBackAction = () => {
    if (isAdmin) {
      navigate('/admin/dashboard');
      return;
    }
    if (assignment && assignment.customerId) {
      navigate(`/content-creator/assignments?expand=${assignment.customerId}`);
    } else {
      navigate('/content-creator/assignments');
    }
  };

  return (
    <ContentCreatorLayout
      title={isAdmin ? 'Admin Content Upload' : (activeTab === 'admin' ? 'Submit for Admin Review' : 'Content Details')}
      subtitle={isAdmin ? 'Upload and manage customer-facing content from the admin portal' : (activeTab === 'admin' ? 'Admin must approve before content goes to customer' : 'Review and manage customer-facing content submissions')}
      icon={<Palette className="h-5 w-5 text-white" />}
      fullWidthContent={true}
      onBack={handleBackAction}
      homePath={isAdmin ? '/admin/dashboard' : '/content-creator'}
    >
      <div>
        {/* ── Tabs Selector ────────────────────────────────────────────────── */}
        {!isAdmin && reviewTabMode === 'both' && (
          <div className="flex border-b border-gray-200 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-200/50 mb-6">
            <button
              onClick={() => {
                setActiveTab('admin');
                const tabVersions = allPreviousVersions.filter(v => v.submissionStage !== 'customer' || v.sentToCustomerAt);
                if (tabVersions.length > 0) setSelectedVersionIndex(tabVersions.length - 1);
                else setSelectedVersionIndex(0);
                setSelectedMediaIndex(0);
              }}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'admin'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Palette className="h-4 w-4" />
              Admin Review
            </button>
            <button
              onClick={() => {
                setActiveTab('customer');
                const tabVersions = allPreviousVersions.filter(v => v.submissionStage === 'customer' || v.submissionStage === '');
                if (tabVersions.length > 0) setSelectedVersionIndex(tabVersions.length - 1);
                else setSelectedVersionIndex(0);
                setSelectedMediaIndex(0);
              }}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${
                activeTab === 'customer'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <User className="h-4 w-4" />
              Customer Review
            </button>
          </div>
        )}
        {/* Assignment Details moved to right column */}
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
        {activeTab === 'admin' && (() => {
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
                <p className="text-sm font-bold text-green-800">Version {latestApproved.flowVersionNumber || latestApproved.versionNumber} Approved by Admin</p>
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

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Upload Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Version History Accordion — ContentDetails style */}
            <div className="space-y-4">
              {/* Accordion trigger */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden w-full p-5 hover:bg-gray-50 transition-colors duration-200">
                <div className={`flex items-center justify-between gap-3 ${(previousVersions.length === 0 || validationNotice) ? 'mb-4' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setVersionsAccordionOpen(!versionsAccordionOpen)}
                    className="flex items-center gap-3 text-left"
                  >
                    <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                      <History className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900">Version History</h2>
                      <p className="text-sm text-gray-500">
                        {previousVersions.length} {previousVersions.length === 1 ? 'version' : 'versions'} submitted
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVersionsAccordionOpen(!versionsAccordionOpen)}
                    className="p-1 rounded hover:bg-gray-100"
                    aria-label="Toggle version history"
                  >
                    {versionsAccordionOpen
                      ? <ChevronUp className="h-5 w-5 text-gray-400 flex-shrink-0" />
                      : <ChevronDown className="h-5 w-5 text-gray-400 flex-shrink-0" />}
                  </button>
                </div>

                {/* Hidden inputs always rendered in DOM */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleChange}
                  className="hidden"
                />
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="hidden"
                />
                <input
                  ref={replaceFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleReplaceChange}
                  className="hidden"
                />

                {previousVersions.length === 0 && (
                  <>
                    <div
                      className={`relative w-full border-2 border-dashed rounded-xl px-4 py-4 transition-all duration-200 ${
                        dragActive
                          ? 'border-purple-400 bg-purple-50'
                          : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/50'
                      }`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                    >
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Upload className="h-4 w-4" />
                          <Video className="h-4 w-4" />
                          <p className="text-sm whitespace-nowrap">Drop files here</p>
                        </div>
                        <button
                          type="button"
                          onClick={onButtonClick}
                          className="inline-flex items-center px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                        >
                          <Image className="h-3 w-3 mr-1" />
                          Browse Files
                        </button>
                        <button
                          type="button"
                          onClick={onThumbnailButtonClick}
                          className="inline-flex items-center px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        >
                          <Image className="h-3 w-3 mr-1" />
                          Browse Thumbnail
                        </button>
                      </div>
                    </div>

                    {thumbnailFileObj && (
                      <div className="mt-3 p-3 bg-indigo-50/80 border border-indigo-100 rounded-xl flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-3">
                          <img src={thumbnailFileObj.preview} alt="Thumbnail preview" className="w-12 h-12 object-cover rounded-lg border border-indigo-200" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-indigo-900 truncate">{thumbnailFileObj.name}</p>
                            <p className="text-[10px] text-indigo-600">{formatFileSize(thumbnailFileObj.size)}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setThumbnailFileObj(null)}
                          className="p-1 rounded-full text-indigo-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    )}

                    {/* ── WhatsApp-style compact thumbnail strip for initial upload (No versions yet) ── */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {uploadedFiles.map((file) => (
                          <div
                            key={file.id}
                            className="relative group w-16 h-16 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-gray-200 hover:ring-purple-400 transition-all cursor-pointer flex-shrink-0"
                            onClick={() => handleReplaceClick(file.id)}
                            title={`${file.name} — click to replace`}
                          >
                            {/* Thumbnail preview */}
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
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                  <Play className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}

                            {/* Top-left badge: green check (existing) or purple NEW */}
                            <div className={`absolute top-0.5 left-0.5 flex items-center justify-center rounded text-[8px] font-bold leading-none z-10 ${
                              file.isExisting
                                ? 'w-3.5 h-3.5 bg-emerald-500 text-white'
                                : 'px-1 py-0.5 bg-purple-600 text-white'
                            }`}>
                              {file.isExisting ? <Check className="h-2.5 w-2.5" /> : 'NEW'}
                            </div>

                            {/* Spinner overlay when uploading */}
                            {file.uploading && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                              </div>
                            )}

                            {/* Error overlay */}
                            {file.error && (
                              <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center z-20">
                                <X className="h-4 w-4 text-white" />
                              </div>
                            )}

                            {/* Hover remove button (top-right) */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                              className="absolute top-0 right-0 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-bl-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
                              title="Remove"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        ))}

                        {/* "+" add-media tile */}
                        <button
                          type="button"
                          onClick={onButtonClick}
                          className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 flex items-center justify-center transition-all flex-shrink-0"
                          title="Add media"
                        >
                          <Plus className="h-6 w-6 text-gray-400 group-hover:text-purple-500" />
                        </button>
                      </div>
                    )}
                  </>
                )}

                {/* Validation notice */}
                {validationNotice && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                    {validationNotice}
                  </div>
                )}
              </div>

              {/* Accordion body */}
              {versionsAccordionOpen && (
                <div className="">
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
                                    Version {previousVersions[selectedVersionIndex]?.flowVersionNumber || previousVersions[selectedVersionIndex]?.versionNumber}
                                  </h3>
                                  <p className="text-xs text-gray-500">of {previousVersions.length} total versions</p>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2 items-end max-w-xs">
                                {/* Tab-specific Review pills */}
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                    {activeTab === 'admin' ? 'Admin Review' : 'Customer Review'}
                                  </span>
                                  {previousVersions.map((v, i) => (
                                    <button
                                      key={v.id || i}
                                      onClick={() => handleVersionSelect(i)}
                                      className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                                        selectedVersionIndex === i
                                          ? activeTab === 'admin' ? 'bg-purple-600 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm'
                                          : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-700'
                                      }`}
                                    >
                                      V{v.flowVersionNumber || v.versionNumber}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="p-5">
                            {previousVersions[selectedVersionIndex] && (
                              <div className="space-y-5">
                                {/* Media */}
                                <div>
                                  {/* ── WhatsApp-style uploaded-files thumbnail strip ── */}
                                  {uploadedFiles.length > 0 && (
                                    <div className="flex flex-wrap justify-center items-center gap-2 mb-6 bg-gray-50 p-3 rounded-xl border border-gray-100">
                                      {uploadedFiles.map((file) => (
                                        <div
                                          key={file.id}
                                          className="relative group w-16 h-16 rounded-lg overflow-hidden bg-white ring-1 ring-gray-200 hover:ring-purple-400 transition-all cursor-pointer flex-shrink-0"
                                          onClick={() => handleReplaceClick(file.id)}
                                          title={`${file.name} — click to replace`}
                                        >
                                          {/* Thumbnail preview */}
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
                                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                <Play className="h-4 w-4 text-white" />
                                              </div>
                                            </div>
                                          )}

                                          {/* Top-left badge: green check (existing) or purple NEW */}
                                          <div className={`absolute top-0.5 left-0.5 flex items-center justify-center rounded text-[8px] font-bold leading-none z-10 ${
                                            file.isExisting
                                              ? 'w-3.5 h-3.5 bg-emerald-500 text-white'
                                              : 'px-1 py-0.5 bg-purple-600 text-white'
                                          }`}>
                                            {file.isExisting ? <Check className="h-2.5 w-2.5" /> : 'NEW'}
                                          </div>

                                          {/* Spinner overlay when uploading */}
                                          {file.uploading && (
                                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
                                              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                            </div>
                                          )}

                                          {/* Error overlay */}
                                          {file.error && (
                                            <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center z-20">
                                              <X className="h-4 w-4 text-white" />
                                            </div>
                                          )}

                                          {/* Hover remove button (top-right) */}
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                            className="absolute top-0 right-0 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-bl-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-30"
                                            title="Remove"
                                          >
                                            <X className="h-2.5 w-2.5" />
                                          </button>
                                        </div>
                                      ))}

                                      {/* "+" add-media tile */}
                                      <button
                                        type="button"
                                        onClick={onButtonClick}
                                        className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-purple-400 hover:bg-purple-50 flex items-center justify-center transition-all flex-shrink-0 bg-white"
                                        title="Add media"
                                      >
                                        <Plus className="h-6 w-6 text-gray-400" />
                                      </button>

                                      {/* Send button (appears if any new files are added or replaced) */}
                                      {uploadedFiles.some(f => !f.isExisting) && (
                                        <button
                                          type="button"
                                          onClick={handleSubmit}
                                          disabled={uploadedFiles.some(f => f.uploading) || submitting}
                                          className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white flex items-center justify-center transition-all shadow-md group ml-2 flex-shrink-0"
                                          title="Send to Admin"
                                        >
                                          {submitting ? (
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                          ) : (
                                            <Send className="h-5 w-5 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                          )}
                                        </button>
                                      )}
                                    </div>
                                  )}
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
                                                ref={videoRef}
                                                src={previousVersions[selectedVersionIndex].media[selectedMediaIndex].url}
                                                poster={previousVersions[selectedVersionIndex].thumbnailUrl || undefined}
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
                                            const pctX = commentX <= 1 ? commentX * 100 : commentX;
                                            const pctY = commentY <= 1 ? commentY * 100 : commentY;
                                            let boxLeft = 40;
                                            let boxRight = 'auto';
                                            if (pctX > 50) { boxLeft = 'auto'; boxRight = 40; }
                                            return (
                                              <div
                                                key={comment.id}
                                                style={{
                                                  position: 'absolute',
                                                  top: `${pctY}%`, left: `${pctX}%`,
                                                  transform: 'translate(-50%, -50%)',
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
                                                    {(() => {
                                                      const replies = comment.replies || (comment.reply ? [{
                                                        id: 'legacy-creator-reply',
                                                        authorRole: 'creator',
                                                        authorName: comment.reply.creatorName || 'Creator',
                                                        message: comment.reply.text,
                                                        timestamp: comment.reply.timestamp
                                                      }] : []);
                                                      return replies.map((rep, rIdx) => (
                                                        <div key={rep.id || rIdx} className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                                                          <p className="text-[10px] font-bold text-indigo-700 mb-0.5">
                                                            Reply by {rep.authorRole === 'admin' ? 'Admin' : rep.authorRole === 'creator' ? 'Creator' : 'Customer'}
                                                          </p>
                                                          <p className="text-xs text-gray-800 break-words">{rep.message || rep.text}</p>
                                                        </div>
                                                      ));
                                                    })()}
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

                                <div className="space-y-4">
                                  {previousVersions[selectedVersionIndex].thumbnailUrl && (
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">Video Thumbnail</label>
                                      <div className="bg-white rounded-lg p-2 border border-gray-200 inline-block">
                                        <img
                                          src={previousVersions[selectedVersionIndex].thumbnailUrl}
                                          alt="Video thumbnail"
                                          className="w-24 h-24 object-cover rounded border"
                                        />
                                      </div>
                                    </div>
                                  )}
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
                              {/* Admin Review Section */}
                              <div>
                                <div className="px-5 pt-3 pb-2 text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50/60 sticky top-0 z-[5]">
                                  Admin Review Versions
                                </div>
                                {adminVersions.length === 0 ? (
                                  <div className="px-5 py-3 text-xs text-gray-400 italic">No admin versions</div>
                                ) : (
                                  adminVersions.map((version, idx) => {
                                    const { date, time } = formatVersionDate(version.createdAt);
                                    const isSelected = activeTab === 'admin' && selectedVersionIndex === idx;
                                    return (
                                      <button
                                        key={version.id || idx}
                                        onClick={() => {
                                          setActiveTab('admin');
                                          setSelectedVersionIndex(idx);
                                          setSelectedMediaIndex(0);
                                        }}
                                        className={`w-full text-left px-5 py-3 flex flex-col border-l-4 transition-all duration-200 hover:bg-gray-50 ${
                                          isSelected
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
                                              isSelected ? 'bg-purple-500' : 'bg-gray-300'
                                            }`} />
                                            V{version.flowVersionNumber}
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
                                  })
                                )}
                              </div>

                              {/* Customer Review Section */}
                              <div>
                                <div className="px-5 pt-3 pb-2 text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50/60 sticky top-0 z-[5]">
                                  Customer Review Versions
                                </div>
                                {customerVersions.length === 0 ? (
                                  <div className="px-5 py-3 text-xs text-gray-400 italic">No customer versions</div>
                                ) : (
                                  customerVersions.map((version, idx) => {
                                    const { date, time } = formatVersionDate(version.createdAt);
                                    const isSelected = activeTab === 'customer' && selectedVersionIndex === idx;
                                    return (
                                      <button
                                        key={version.id || idx}
                                        onClick={() => {
                                          setActiveTab('customer');
                                          setSelectedVersionIndex(idx);
                                          setSelectedMediaIndex(0);
                                        }}
                                        className={`w-full text-left px-5 py-3 flex flex-col border-l-4 transition-all duration-200 hover:bg-gray-50 ${
                                          isSelected
                                            ? 'bg-amber-50 border-l-amber-500'
                                            : 'bg-white border-l-transparent'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-gray-900 text-sm">{date}, {time}</span>
                                        </div>
                                        <div className="flex items-center mt-1.5 text-xs text-gray-500 gap-3">
                                          <span className="flex items-center">
                                            <span className={`h-1.5 w-1.5 rounded-full mr-1.5 ${
                                              isSelected ? 'bg-amber-500' : 'bg-gray-300'
                                            }`} />
                                            V{version.flowVersionNumber}
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
                                  })
                                )}
                              </div>
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
                                    Version {previousVersions[selectedVersionIndex]?.flowVersionNumber || previousVersions[selectedVersionIndex]?.versionNumber} • Media {selectedMediaIndex + 1}
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

                                    {/* Existing replies */}
                                    {replyingToComment !== comment.id && (() => {
                                      const replies = comment.replies || (comment.reply ? [{
                                        id: 'legacy-creator-reply',
                                        authorRole: 'creator',
                                        authorName: comment.reply.creatorName || 'Creator',
                                        message: comment.reply.text,
                                        timestamp: comment.reply.timestamp
                                      }] : []);
                                      return replies.map((rep, rIdx) => (
                                        <div key={rep.id || rIdx} className="mx-3 mb-3 p-2.5 bg-indigo-50 border border-indigo-200 rounded-lg">
                                          <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wide">Reply</span>
                                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                                              {rep.authorRole === 'admin' ? 'Admin' : rep.authorRole === 'creator' ? 'Creator' : 'Customer'}
                                            </span>
                                            {rep.authorEmail && (
                                              <span className="text-[9px] text-gray-400 truncate max-w-[120px] ml-1.5">{rep.authorEmail}</span>
                                            )}
                                            <span className="text-[10px] text-gray-400 ml-auto">
                                              {rep.timestamp ? new Date(rep.timestamp).toLocaleString() : ''}
                                            </span>
                                          </div>
                                          <p className="text-xs text-gray-800 break-words leading-relaxed">{rep.message || rep.text}</p>
                                        </div>
                                      ));
                                    })()}

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
            {/* Assignment Details (Moved here) */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{assignment.title}</h1>
                  <p className="text-sm text-gray-600">for {assignment.customerName}</p>
                  {assignment.description && (
                    <p className="text-sm text-gray-600 mt-2">{assignment.description}</p>
                  )}
                </div>
                <div className="text-left sm:text-right">
                  <div className="flex items-center text-xs text-gray-500 mb-2 sm:justify-end">
                    <Calendar className="h-3 w-3 mr-1" />
                    {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap sm:justify-end">
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
                    {assignment.postType && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded border text-xs font-semibold bg-amber-50 text-amber-700 border-amber-200 capitalize">
                        {assignment.postType}
                      </span>
                    )}
                  </div>
                </div>
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
                      Admin has approved version {latestApproved.flowVersionNumber || latestApproved.versionNumber}. You can now send it to the customer for their review.
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
                <h3 className="font-semibold text-gray-900 mb-1">
                  {activeTab === 'admin' ? 'Submit for Admin Review' : 'Submit for Customer Review'}
                </h3>
                {activeTab === 'admin' ? (
                  displayAdminsList.length > 0 ? (
                    <p className="text-sm text-gray-600 mb-4">
                      Will be sent to <span className="font-medium text-purple-700">{displayAdminsList.map(a => a.name).join(', ')}</span> for review.
                      Content only reaches the customer after admin approval.
                    </p>
                  ) : (
                    <p className="text-sm text-gray-600 mb-4 flex items-center justify-center gap-1">
                      <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      No assigned admins. Submission will be reviewed by System Admins.
                    </p>
                  )
                ) : (
                  <p className="text-sm text-gray-600 mb-4">
                    Will be sent directly to the customer for review, bypassing the internal admin review process.
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={submitting || uploadedFiles.length === 0 || uploadedFiles.some(f => f.uploading)}
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
                      {activeTab === 'admin' ? 'Submit to Admin for Review' : 'Submit to Customer'}
                    </>
                  )}
                </button>
                {uploadedFiles.some(f => f.uploading) && (
                  <p className="text-xs text-gray-500 mt-2">
                    Please wait for all uploads to complete
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {submitSuccessModal.open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeSubmitSuccessModal}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-5 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider font-semibold text-emerald-100">Submission Confirmed</p>
                  <h3 className="text-lg font-bold leading-tight">{submitSuccessModal.title}</h3>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-sm font-semibold text-emerald-800">Assignment Details</p>
                <p className="text-sm text-gray-900 mt-1 font-medium">{assignment?.title || 'Untitled Assignment'}</p>
                <div className="mt-2 space-y-1 text-xs text-gray-700">
                  <p><span className="font-semibold">Customer:</span> {assignment?.customerName || 'N/A'}</p>
                  <p><span className="font-semibold">Due:</span> {assignment?.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : 'N/A'}</p>
                  <p><span className="font-semibold">Stage:</span> {activeTab === 'admin' ? 'Admin Review' : 'Customer Review'}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{submitSuccessModal.message}</p>
              <button
                onClick={closeSubmitSuccessModal}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <Check className="h-4 w-4" />
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

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
    </ContentCreatorLayout>
  );
}

export default ContentUpload;