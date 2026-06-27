import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Filter, Search, MessageSquare, CheckCircle, Clock, AlertCircle, Palette, Calendar, User, ChevronDown, ChevronUp, Building2, Users, Globe, ShieldCheck, Bell, Send, Image, Eye, Play } from 'lucide-react';
import { Facebook, Instagram, Linkedin, Youtube, Twitter } from 'lucide-react';
import Footer from '../admin/components/layout/Footer';
import Logo from '../admin/components/layout/Logo';
import ContentCreatorLayout from './Layout';
import CustomerFeedback from './CustomerFeedback';

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

function Assignments() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedFilter, setSelectedFilter] = useState(() => {
    const param = searchParams.get('filter') || 'all';
    // 'assigned' from Dashboard maps to 'pending' in this view (initial state)
    return param === 'assigned' ? 'pending' : param;
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerMap, setCustomerMap] = useState({});
  const [expandedCustomers, setExpandedCustomers] = useState({});
  const [expandedCalendars, setExpandedCalendars] = useState({});
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);

  // Scheduled posts to check published status
  const [scheduledPosts, setScheduledPosts] = useState([]);
  // Submissions to show per-assignment review status
  const [submissions, setSubmissions] = useState([]);
  // Counts for stat cards
  const [adminApprovedCount, setAdminApprovedCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Get current creator's email or id
  const creatorEmail = getCreatorEmail();

  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find(c => (c._id || c.id) === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail) {
      navigate('/content-creator/login');
    }
  }, [creatorEmail, navigate]);

  useEffect(() => {
    // Fetch all customers and build a map of customerId -> customerName
    const fetchCustomers = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/customers`);
        const data = await res.json();
        if (Array.isArray(data.customers)) {
          setCustomers(data.customers);
          const map = {};
          data.customers.forEach(c => {
            map[c._id || c.id] = c.name || c.customerName || c.email || '';
          });
          setCustomerMap(map);
        }
      } catch (err) {
        setCustomers([]);
        setCustomerMap({});
      }
    };
    fetchCustomers();
  }, []);

  useEffect(() => {
    // Fetch all content calendar items assigned to this creator
    const fetchAssignments = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const calendars = await res.json();
        let allAssignments = [];
        calendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            calendar.contentItems.forEach((item, index) => {
              allAssignments.push({
                ...item,
                calendarName: calendar.name || calendar.customerName || calendar.customer || '',
                calendarId: calendar._id || calendar.id,
                customerId: calendar.customerId || calendar.customer_id || calendar.customer?._id || '',
                customerName: customerMap[calendar.customerId || calendar.customer_id || (calendar.customer && calendar.customer._id)] || '',
                id: item.id || item._id || item.title || Math.random().toString(36).slice(2),
                itemIndex: index
              });
            });
          }
        });
        const filtered = allAssignments.filter(item =>
          String(item.assignedTo || '').toLowerCase() === creatorEmail
        );
        setAssignments(filtered);
      } catch (err) {
        setAssignments([]);
      }
    };

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
        setScheduledPosts([]);
      }
    };

    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
        if (!res.ok) return;
        const data = await res.json();
        const allSubs = Array.isArray(data) ? data : [];
        // Store ALL submissions for thumbnail/status display (includes admin-uploaded ones)
        setSubmissions(allSubs);
        // Stats use only creator's own submissions
        const creatorSubs = allSubs.filter(s => String(s.created_by || '').toLowerCase() === creatorEmail.toLowerCase());
        // Admin approved count (internal stage only)
        setAdminApprovedCount(creatorSubs.filter(s =>
          s.status === 'approved' &&
          (s.submission_stage || s.submissionStage || 'internal') !== 'customer'
        ).length);
        // Review updates: customer-stage submissions with comments
        setReviewCount(creatorSubs.filter(s =>
          (s.submission_stage || s.submissionStage || '') === 'customer' &&
          Array.isArray(s.comments) && s.comments.length > 0
        ).length);
      } catch (err) {
        console.error('Failed to fetch submissions:', err);
        setSubmissions([]);
      }
    };

    if (creatorEmail && creatorEmail.length > 0 && Object.keys(customerMap).length > 0) {
      fetchAssignments();
      fetchScheduledPosts();
      fetchSubmissions();
    }
  }, [creatorEmail, customerMap]);

  // Helper: check if content is published on any platform
  const isContentPublished = (assignmentId) => {
    return scheduledPosts.some(post => post.contentId === assignmentId && post.status === 'published');
  };

  // Helper: get latest submission for an assignment (used for inline status badges)
  // Accepts either an assignment object or a plain id string for backward compat
  const getLatestSubmission = (assignmentOrId) => {
    const id = assignmentOrId && typeof assignmentOrId === 'object'
      ? (assignmentOrId.id || assignmentOrId._id)
      : assignmentOrId;
    const calId = assignmentOrId && typeof assignmentOrId === 'object' ? assignmentOrId.calendarId : undefined;
    const idx = assignmentOrId && typeof assignmentOrId === 'object' ? assignmentOrId.itemIndex : undefined;
    const subs = submissions.filter(s => {
      const sid = String(s.assignment_id || s.assignmentId || '');
      const iid = String(s.item_id || '');
      const strId = String(id || '');
      if (strId && (sid === strId || iid === strId)) return true;
      if (calId && s.calendar_id === calId && idx !== undefined && s.item_index !== undefined && Number(s.item_index) === Number(idx)) return true;
      return false;
    });
    if (subs.length === 0) return null;
    return [...subs].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
  };

  const isVideoUrl = (url) => /\.(mp4|mov|webm|avi|mkv)(\?|$)/i.test(url || '');

  // Helper: get thumbnail URL from the latest submission for an assignment
  const getSubmissionThumbnail = (assignment) => {
    const sub = getLatestSubmission(assignment);
    if (!sub) return null;
    const images = sub.images || sub.media || [];
    if (!Array.isArray(images) || images.length === 0) return null;
    const first = images[0];
    return typeof first === 'string' ? first : (first?.url || first?.publicUrl || '');
  };

  // Precomputed Sets for reliable submission-based filtering.
  // Built from the latest submissions, avoiding fragile per-assignment ID lookups.
  const submissionFilterSets = useMemo(() => {
    const adminApprovedKeys = new Set();
    const customerApprovedKeys = new Set();
    const anySubmissionKeys = new Set();

    assignments.forEach(assignment => {
      const s = getLatestSubmission(assignment);
      if (!s) return;

      const keys = [];
      if (s.assignment_id) keys.push(String(s.assignment_id));
      if (s.item_id && String(s.item_id) !== String(s.assignment_id)) keys.push(String(s.item_id));
      if (s.calendar_id && s.item_index !== undefined && s.item_index !== null) {
        keys.push(`${s.calendar_id}::${Number(s.item_index)}`);
      }

      // Ensure the assignment's own IDs are added to keys
      const assId = String(assignment.id || assignment._id || '');
      if (assId) keys.push(assId);
      if (assignment.calendarId && assignment.itemIndex !== undefined) {
        keys.push(`${assignment.calendarId}::${Number(assignment.itemIndex)}`);
      }

      const stage = s.submission_stage || s.submissionStage || '';

      // Track every assignment that has any submission
      keys.forEach(k => anySubmissionKeys.add(k));

      const isCustomerApproved = (s.approved_by_customer === true || s.status === 'approved_customer' || s.status === 'approved_both') &&
        s.status !== 'under_review' && s.status !== 'sent_to_creator' && s.status !== 'revision_requested' && s.status !== 'rejected';
      const isAdminApproved = s.approved_by_admin === true || s.status === 'approved_admin' || s.status === 'approved_both' || (s.status === 'approved' && !s.approved_by_customer) || stage === 'customer';

      if (isAdminApproved) {
        keys.forEach(k => adminApprovedKeys.add(k));
      }
      if (isCustomerApproved) {
        keys.forEach(k => customerApprovedKeys.add(k));
      }
    });
    return { adminApprovedKeys, customerApprovedKeys, anySubmissionKeys };
  }, [assignments, submissions]);

  // Check if an assignment matches any key in a submission filter set
  const assignmentMatchesSet = (assignment, set) => {
    if (!set.size) return false;
    const id = String(assignment.id || assignment._id || '');
    if (id && set.has(id)) return true;
    if (assignment.calendarId && assignment.itemIndex !== undefined) {
      if (set.has(`${assignment.calendarId}::${Number(assignment.itemIndex)}`)) return true;
    }
    return false;
  };

  // Helper: get submission review status info for display
  const getSubmissionStatusInfo = (assignmentId) => {
    const sub = getLatestSubmission(assignmentId);
    if (!sub) return null;
    const isCustApproved = (sub.approved_by_customer === true || sub.status === 'approved_customer' || sub.status === 'approved_both') &&
      sub.status !== 'under_review' && sub.status !== 'sent_to_creator' && sub.status !== 'revision_requested' && sub.status !== 'rejected';
    if (isCustApproved) {
      return { label: 'Customer Approved', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle className="h-3 w-3" />, canReupload: false, revisionNotes: '' };
    }
    if (sub.submission_stage === 'customer') {
      return { label: 'Under Customer Review', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: <Eye className="h-3 w-3" />, canReupload: false, revisionNotes: '' };
    }
    if (sub.status === 'revision_requested') {
      return { label: 'Revision Requested', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <AlertCircle className="h-3 w-3" />, canReupload: true, revisionNotes: sub.rejectionReason || '' };
    }
    if (sub.status === 'approved') {
      return { label: 'Approved by Admin', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: <CheckCircle className="h-3 w-3" />, canReupload: false, revisionNotes: '' };
    }
    return { label: 'Under Admin Review', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="h-3 w-3" />, canReupload: false, revisionNotes: '' };
  };

  // Helper: get actual status considering published posts and item.published field
  const getActualStatus = (assignment) => {
    // Check if the item itself is marked as published
    if (assignment.published === true) {
      return 'published';
    }
    if (isContentPublished(assignment.id || assignment._id)) {
      return 'published';
    }
    return assignment.status || 'assigned';
  };

  const getFilterStatus = (assignment) => {
    const actual = getActualStatus(assignment);
    if (actual === 'published') return 'published';
    
    const hasSubmission = assignmentMatchesSet(assignment, submissionFilterSets.anySubmissionKeys);
    const isCustomerApproved = assignmentMatchesSet(assignment, submissionFilterSets.customerApprovedKeys) || (!hasSubmission && actual === 'approved');
    if (isCustomerApproved) return 'approved';
    
    const isAdminApproved = assignmentMatchesSet(assignment, submissionFilterSets.adminApprovedKeys);
    if (isAdminApproved) return 'admin_approved';
    
    return 'pending';
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

  const platformColor = (p) => {
    switch ((p || '').toLowerCase()) {
      case 'facebook': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'instagram': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'youtube': return 'bg-red-100 text-red-700 border-red-200';
      case 'linkedin': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'twitter': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'tiktok': return 'bg-gray-900 text-white border-gray-700';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const PlatformIcon = ({ platform, className = 'h-3 w-3' }) => {
    switch ((platform || '').toLowerCase()) {
      case 'facebook': return <Facebook className={className} />;
      case 'instagram': return <Instagram className={className} />;
      case 'linkedin': return <Linkedin className={className} />;
      case 'youtube': return <Youtube className={className} />;
      case 'twitter': return <Twitter className={className} />;
      default: return <Globe className={className} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'published':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getItemApprovalStatus = (assignment) => {
    const filterStatus = getFilterStatus(assignment);
    if (filterStatus === 'published') {
      return {
        label: 'Published',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    const hasSubmission = assignmentMatchesSet(assignment, submissionFilterSets.anySubmissionKeys);
    const isCustomerApproved = assignmentMatchesSet(assignment, submissionFilterSets.customerApprovedKeys) || (!hasSubmission && getActualStatus(assignment) === 'approved');
    const isAdminApproved = assignmentMatchesSet(assignment, submissionFilterSets.adminApprovedKeys);

    if (isCustomerApproved && isAdminApproved) {
      return {
        label: 'Both Approved',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    if (isCustomerApproved) {
      return {
        label: 'Customer Approved',
        color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }
    if (isAdminApproved) {
      return {
        label: 'Approved by Admin',
        color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        icon: <CheckCircle className="h-4 w-4" />
      };
    }

    return {
      label: 'Pending',
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: <Clock className="h-4 w-4" />
    };
  };

  const getPriorityColor = (priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const stats = useMemo(() => {
    const listToCount = selectedCustomerId
      ? assignments.filter(a => a.customerId === selectedCustomerId)
      : assignments;

    return {
      total: listToCount.length,
      pending: listToCount.filter(a => getFilterStatus(a) === 'pending').length,
      approved: listToCount.filter(a => getFilterStatus(a) === 'approved').length,
      published: listToCount.filter(a => getFilterStatus(a) === 'published').length,
      adminApproved: listToCount.filter(a => getFilterStatus(a) === 'admin_approved').length,
      reviewUpdates: listToCount.filter(a => {
        const sub = getLatestSubmission(a);
        return sub && Array.isArray(sub.comments) && sub.comments.length > 0;
      }).length,
    };
  }, [assignments, selectedCustomerId, scheduledPosts, submissions, submissionFilterSets]);

  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = selectedFilter === 'all' || getFilterStatus(assignment) === selectedFilter;
    const customerStr = typeof assignment.customer === 'string'
      ? assignment.customer
      : String(assignment.customerName || '');
    const titleStr = String(assignment.title || '');
    const typeStr = Array.isArray(assignment.type)
      ? assignment.type.map(String).join(' ')
      : String(assignment.type || '');

    const matchesSearch = customerStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      titleStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      typeStr.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCustomer = !selectedCustomerId || assignment.customerId === selectedCustomerId;
    return matchesFilter && matchesSearch && matchesCustomer;
  });

  const getAssignmentDate = (a) => {
    return new Date(a.assignedAt || a.createdAt || a.dueDate || 0).getTime();
  };

  // Sort assignments flat list by date descending (newest first)
  const sortedAssignments = [...filteredAssignments].sort((a, b) => {
    return getAssignmentDate(b) - getAssignmentDate(a);
  });

  // Group: Customer -> Calendar -> Items
  const groupedByCustomer = sortedAssignments.reduce((acc, assignment) => {
    const custKey = assignment.customerId || 'unknown';
    const custName = assignment.customerName || 'Unknown Customer';
    if (!acc[custKey]) {
      acc[custKey] = { customerName: custName, customerId: custKey, calendars: {}, maxDate: 0 };
    }
    const calKey = assignment.calendarId || 'unknown';
    const calName = assignment.calendarName || 'Unnamed Calendar';
    if (!acc[custKey].calendars[calKey]) {
      acc[custKey].calendars[calKey] = { calendarName: calName, calendarId: calKey, assignments: [], maxDate: 0 };
    }

    const date = getAssignmentDate(assignment);
    if (date > acc[custKey].maxDate) acc[custKey].maxDate = date;
    if (date > acc[custKey].calendars[calKey].maxDate) acc[custKey].calendars[calKey].maxDate = date;

    acc[custKey].calendars[calKey].assignments.push(assignment);
    return acc;
  }, {});

  // Sort customers newest first
  const sortedCustomers = Object.values(groupedByCustomer).sort((a, b) =>
    b.maxDate - a.maxDate
  );

  // All customers from unfiltered assignments (for sidebar)
  const allCustomersSorted = Object.values(
    assignments.reduce((acc, assignment) => {
      const custKey = assignment.customerId || 'unknown';
      const custName = assignment.customerName || 'Unknown Customer';
      if (!acc[custKey]) acc[custKey] = { customerName: custName, customerId: custKey };
      return acc;
    }, {})
  ).sort((a, b) => a.customerName.localeCompare(b.customerName));

  // Auto-expand the customer passed via ?expand=customerId (from Dashboard recent assignment click)
  const expandCustomerId = searchParams.get('expand');
  useEffect(() => {
    if (!expandCustomerId || assignments.length === 0) return;
    setSelectedCustomerId(expandCustomerId);
    setExpandedCustomers(prev => ({ ...prev, [expandCustomerId]: true }));
    const calendarIds = [...new Set(
      assignments
        .filter(a => a.customerId === expandCustomerId)
        .map(a => a.calendarId)
        .filter(Boolean)
    )];
    setExpandedCalendars(prev => {
      const next = { ...prev };
      calendarIds.forEach(id => { next[id] = true; });
      return next;
    });
  }, [assignments, expandCustomerId]);

  const toggleCustomer = (id) => setExpandedCustomers(prev => ({ ...prev, [id]: !prev[id] }));
  const toggleCalendar = (id) => setExpandedCalendars(prev => ({ ...prev, [id]: !prev[id] }));

  const handleAssignmentClick = (assignment) => {
    const itemIndex = assignment.itemIndex !== undefined ? assignment.itemIndex : 0;
    navigate(`/content-creator/upload/${assignment.calendarId}/${itemIndex}`);
  };

  const handleStartWork = (assignment) => {
    // Find the index of this item in the calendar's contentItems array
    const itemIndex = assignment.itemIndex !== undefined ? assignment.itemIndex : 0;
    navigate(`/content-creator/upload/${assignment.calendarId}/${itemIndex}`);
  };

  const handleViewPortfolio = (assignment) => {
    navigate(`/content-creator/portfolio`, { state: { assignmentId: assignment.id } });
  };

  return (
    <ContentCreatorLayout
      title="Content Creator Portal"
      subtitle="Assignment Dashboard"
      icon={<Palette className="h-6 w-6 text-white" />}
      fullWidthContent={true}
    >
      <div className="space-y-5">
        {selectedCustomer && (
          <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 rounded-xl shadow p-2.5 text-white mb-3 flex items-center">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-sm font-bold overflow-hidden flex-shrink-0">
                {selectedCustomer.profileImage ? (
                  <img src={selectedCustomer.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  (selectedCustomer.name || 'C').charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base font-semibold truncate">{selectedCustomer.name || 'Unnamed Customer'}</h1>
                <p className="text-purple-100 text-[11px] truncate">{selectedCustomer.email}</p>
                {selectedCustomer.companyName && (
                  <p className="text-purple-200 text-[10px] mt-0.5 bg-white/10 px-1.5 py-0.5 rounded-full inline-block max-w-full truncate">
                    {selectedCustomer.companyName}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs + Search */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm p-4 border border-gray-200/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'All', count: stats.total },
                { key: 'pending', label: 'Pending', count: stats.pending },
                { key: 'approved', label: 'Customer Approved', count: stats.approved },
                { key: 'published', label: 'Published', count: stats.published },
                { key: 'admin_approved', label: 'Approved by Admin', count: stats.adminApproved },
                { key: 'review_updates', label: 'Review Updates', count: stats.reviewUpdates },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSelectedFilter(opt.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${selectedFilter === opt.key
                      ? 'bg-purple-600 text-white shadow-sm'
                      : opt.key === 'review_updates'
                        ? 'bg-gray-100 text-gray-600 hover:bg-rose-100 hover:text-rose-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {opt.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${selectedFilter === opt.key ? 'bg-white/20 text-white' : 'bg-white text-gray-600'
                    }`}>{opt.count}</span>
                </button>
              ))}
            </div>
            <div className="relative flex-shrink-0">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm w-full sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Assignments List - Customer > Calendar > Items */}
        <div className="space-y-4">
          {selectedFilter === 'review_updates' ? (
            <CustomerFeedback isTab={true} />
          ) : sortedCustomers.length > 0 ? (
            sortedCustomers.map((custGroup) => {
              const isCustExpanded = expandedCustomers[custGroup.customerId] === true;
              const totalItems = Object.values(custGroup.calendars).reduce((sum, cal) => sum + cal.assignments.length, 0);
              return (
                <div key={custGroup.customerId} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  {/* Customer Header */}
                  {!selectedCustomerId && (
                    <div
                      onClick={() => toggleCustomer(custGroup.customerId)}
                      className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 cursor-pointer hover:from-purple-100 hover:to-indigo-100 transition-all duration-150"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow">
                          <Building2 className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-base font-bold text-gray-900">{custGroup.customerName}</h2>
                          <p className="text-xs text-gray-500">
                            {Object.keys(custGroup.calendars).length} {Object.keys(custGroup.calendars).length === 1 ? 'Calendar' : 'Calendars'} &middot; {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                          </p>
                        </div>
                      </div>
                      <div className="p-2 text-gray-400">
                        {isCustExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  )}

                  {/* Calendars under this customer */}
                  {(isCustExpanded || selectedCustomerId) && (
                    <div className="p-4 space-y-4">
                      {Object.values(custGroup.calendars).sort((a, b) => b.maxDate - a.maxDate).map((calGroup) => {
                        const isCalExpanded = expandedCalendars[calGroup.calendarId] === true;
                        return (
                          <div key={calGroup.calendarId} className="border border-gray-200 rounded-xl overflow-hidden">
                            {/* Calendar sub-header */}
                            <div
                              onClick={() => toggleCalendar(calGroup.calendarId)}
                              className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/60 cursor-pointer hover:bg-indigo-100/60 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <div className="p-1 bg-indigo-100 rounded">
                                  <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                                </div>
                                <span className="font-semibold text-gray-800 text-sm">{calGroup.calendarName}</span>
                                <span className="text-xs text-gray-400">{calGroup.assignments.length} {calGroup.assignments.length === 1 ? 'item' : 'items'}</span>
                              </div>
                              <div className="p-1 text-gray-400">
                                {isCalExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </div>
                            </div>

                            {/* Assignment rows under this calendar */}
                            {isCalExpanded && (
                              <div className="divide-y-2 divide-gray-200">
                                {calGroup.assignments.map((assignment, idx) => (
                                  <div
                                    key={assignment.id || assignment._id || idx}
                                    onClick={() => handleAssignmentClick(assignment)}
                                    className="px-4 py-5 hover:bg-purple-50/50 cursor-pointer transition-colors"
                                  >
                                    <div className="flex gap-3 items-start">
                                      {/* Submission thumbnail */}
                                      {(() => {
                                        const thumb = getSubmissionThumbnail(assignment);
                                        const isVid = isVideoUrl(thumb);
                                        return (
                                          <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 relative">
                                            {thumb ? (
                                              isVid ? (
                                                <div className="w-full h-full bg-black relative">
                                                  <video
                                                    src={thumb}
                                                    muted
                                                    playsInline
                                                    preload="metadata"
                                                    className="w-full h-full object-cover"
                                                  />
                                                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                                    <Play className="h-4 w-4 text-white" />
                                                  </div>
                                                </div>
                                              ) : (
                                                <img src={thumb} alt="" className="w-full h-full object-cover" />
                                              )
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center">
                                                <Image className="h-5 w-5 text-gray-300" />
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                      {/* Assignment details */}
                                      <div className="flex-1 min-w-0">
                                        {/* Line 1: Item label + title */}
                                        <div className="flex items-center justify-between gap-2 mb-1.5">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            <span className="text-xs font-semibold text-gray-400 uppercase shrink-0">Item:</span>
                                            <span className="text-sm font-semibold text-gray-800 truncate">{assignment.title}</span>
                                          </div>
                                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                                            {/* Main Badge */}
                                            {(() => {
                                              const statusInfo = getItemApprovalStatus(assignment);
                                              return (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusInfo.color}`}>
                                                  {statusInfo.icon}
                                                  <span>{statusInfo.label}</span>
                                                </span>
                                              );
                                            })()}
                                            {/* Sub Submission Status Badge */}
                                            {(() => {
                                              if (getFilterStatus(assignment) === 'published') return null;
                                              const subStatusInfo = getSubmissionStatusInfo(assignment.id);
                                              if (!subStatusInfo) return null;
                                              if (subStatusInfo.label === 'Approved by Admin' || subStatusInfo.label === 'Customer Approved' || subStatusInfo.label === 'Both Approved') return null;
                                              return (
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${subStatusInfo.color}`}>
                                                  {subStatusInfo.icon}
                                                  <span>{subStatusInfo.label}</span>
                                                </span>
                                              );
                                            })()}
                                          </div>
                                        </div>
                                        {/* Line 2: Platform, Due Date, Priority */}
                                        <div className="flex items-center gap-4 flex-wrap">
                                          <div className="flex items-center gap-1 flex-wrap">
                                            {parsePlatforms(assignment.platform || assignment.type).map((p, i) => (
                                              <span key={i} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium ${platformColor(p)}`}>
                                                <PlatformIcon platform={p} className="h-3 w-3 flex-shrink-0" />
                                                {p.charAt(0).toUpperCase() + p.slice(1)}
                                              </span>
                                            ))}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">Due:</span>
                                            <span className="text-xs text-gray-600">{assignment.dueDate ? format(new Date(assignment.dueDate), 'MMM dd, yyyy') : 'N/A'}</span>
                                          </div>
                                          <div className="flex items-center gap-1">
                                            <span className="text-xs font-semibold text-gray-400 uppercase">Priority:</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(assignment.priority)}`}>
                                              {(assignment.priority || 'Medium').charAt(0).toUpperCase() + (assignment.priority || 'Medium').slice(1).toLowerCase()}
                                            </span>
                                          </div>
                                        </div>
                                        {/* Line 3: Submission Review Status Notes/Actions */}
                                        {(() => {
                                          if (getFilterStatus(assignment) === 'published') return null;
                                          const statusInfo = getSubmissionStatusInfo(assignment.id);
                                          if (!statusInfo) return null;
                                          const isApproved = statusInfo.label === 'Approved by Admin';
                                          const hasBottomContent = isApproved || statusInfo.canReupload || statusInfo.revisionNotes;
                                          if (!hasBottomContent) return null;
                                          return (
                                            <div
                                              className={`flex items-center gap-2 mt-2 pt-2 border-t flex-wrap ${isApproved ? 'border-orange-200 bg-orange-50 -mx-4 px-4 pb-2 rounded-b-xl' : 'border-gray-100'}`}
                                              onClick={e => e.stopPropagation()}
                                            >
                                              {isApproved && (
                                                <CheckCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                                              )}
                                              {isApproved && (
                                                <span className="text-xs text-orange-700 font-medium">Your content was approved by admin!</span>
                                              )}
                                              {statusInfo.canReupload && (
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); handleStartWork(assignment); }}
                                                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                                                >
                                                  Re-upload
                                                </button>
                                              )}
                                              {statusInfo.revisionNotes && (
                                                <span className="text-xs text-orange-600 italic truncate max-w-xs" title={statusInfo.revisionNotes}>
                                                  "{statusInfo.revisionNotes}"
                                                </span>
                                              )}
                                            </div>
                                          );
                                        })()}
                                      </div>{/* end assignment details */}
                                    </div>{/* end flex gap-3 */}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments found</h3>
                <p className="text-gray-500">No assignments match your current search criteria.</p>
              </div>
            </div>
          )}
        </div>
      </div>


    </ContentCreatorLayout>
  );
}

export default Assignments;