import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import {
  MessageSquare, CalendarIcon, Instagram, Facebook, Linkedin, Youtube,
  AlertCircle, Eye, CheckCircle, Video, ExternalLink, Clock, Filter,
  LayoutGrid, List, Search, X, ChevronRight, FileText, TrendingUp,
  Send, Image, Play, Calendar, User, Sparkles, BarChart3, Download,
  UserCog, ChevronLeft, Shield, PlusCircle, ArrowUpCircle, Loader2
} from 'lucide-react';
import ContentReview from './ContentReview';


// Helper to validate ID values
const isIdValid = (id) => id && id !== 'null' && id !== 'undefined' && id !== 'none' && id !== 'N/A';

// Convert Instagram Media ID to shortcode URL
const instagramMediaIdToUrl = (mediaId, postType) => {
  if (!mediaId) return null;
  const type = (postType || '').toLowerCase();
  if (type === 'story') return null;
  try {
    const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let shortcode = '';
    let n = BigInt(String(mediaId));
    while (n > 0n) {
      shortcode = ALPHABET[Number(n % 64n)] + shortcode;
      n = n / 64n;
    }
    if (!shortcode) return null;
    const path = type === 'reel' ? 'reel' : 'p';
    return `https://www.instagram.com/${path}/${shortcode}/`;
  } catch {
    return null;
  }
};

// Helper to get published post URL across all platforms
const getPostPublishedUrl = (post, item) => {
  if (!post) return null;
  const platform = (post.platform || '').toLowerCase();

  // 1. Manual Platform URLs
  if (post.isManualPublish && item?.manualPlatformUrls) {
    const platformKey = Object.keys(item.manualPlatformUrls).find(
      k => k.toLowerCase() === post.platform?.toLowerCase()
    );
    if (platformKey) {
      const url = item.manualPlatformUrls[platformKey];
      if (url && isIdValid(url)) return url;
    }
  }

  // 2. Platform specific IDs
  if (platform === 'facebook' && isIdValid(post.facebookPostId) && !post.facebookPostId.startsWith('fb_shared_from_')) {
    const fbId = post.facebookPostId;
    return fbId.includes('_')
      ? `https://www.facebook.com/permalink.php?story_fbid=${fbId.split('_')[1]}&id=${fbId.split('_')[0]}`
      : `https://www.facebook.com/${fbId}`;
  }

  if (platform === 'instagram') {
    // Prefer canonical permalink first; generic postUrl is often stale for Instagram.
    if (isIdValid(post.instagramPermalink)) {
      return post.instagramPermalink;
    }
    if (isIdValid(post.instagramPostId)) {
      const igUrl = instagramMediaIdToUrl(post.instagramPostId, post.postType);
      const isLiveButUnavailable = post.metricsSource === 'live' && !post.instagramPermalink;
      if (igUrl && !isLiveButUnavailable) return igUrl;
    }
    if (post.postUrl && isIdValid(post.postUrl)) return post.postUrl;
  }

  if (platform === 'youtube' && isIdValid(post.youtubePostId)) {
    return `https://www.youtube.com/watch?v=${post.youtubePostId}`;
  }

  if (platform === 'linkedin' && isIdValid(post.linkedinPostId)) {
    return `https://www.linkedin.com/feed/update/${post.linkedinPostId}`;
  }

  // 3. Direct postUrl fallback for non-Instagram platforms
  if (platform !== 'instagram' && post.postUrl && isIdValid(post.postUrl)) return post.postUrl;

  // Fallback to basic platform URLs
  if (post.platform && post.postId) {
    switch (platform) {
      case 'facebook': return `https://www.facebook.com/${post.postId}`;
      case 'linkedin': return `https://www.linkedin.com/feed/update/${post.postId}`;
      case 'youtube': return `https://www.youtube.com/watch?v=${post.postId}`;
      default: return null;
    }
  }

  return null;
};

const getPlatformIcon = (platform) => {
  switch (platform) {
    case 'instagram': return <Instagram className="h-5 w-5 text-pink-600" />;
    case 'facebook': return <Facebook className="h-5 w-5 text-blue-600" />;
    case 'linkedin': return <Linkedin className="h-5 w-5 text-blue-700" />;
    case 'youtube': return <Youtube className="h-5 w-5 text-red-600" />;
    default: return null;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'published': return 'bg-green-100 text-green-800';
    case 'under_review': return 'bg-yellow-100 text-yellow-800';
    case 'scheduled': return 'bg-blue-100 text-blue-800';
    case 'waiting_input': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status) => {
  if (!status) return 'Pending';
  switch (status) {
    case 'pending': return 'Pending';
    case 'published': return 'Published';
    case 'under_review': return 'Under Review';
    case 'scheduled': return 'Scheduled';
    case 'waiting_input': return 'Waiting Input';
    default: return status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1);
  }
};

const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const ext = url.split('.').pop().toLowerCase();
  return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
};

// Timeline component showing item lifecycle stages with dates
const ItemTimeline = ({ item, itemStatus, scheduledPosts = [], submissions = [] }) => {
  const nowTs = Date.now();

  const matchedPost = scheduledPosts.find(post =>
    ((post.item_id && post.item_id === item.id) ||
      (post.contentId && post.contentId === item.id) ||
      (post.item_name && post.item_name === (item.title || item.description))) &&
    (post.status === 'published' || post.publishedAt)
  );

  const fmtDate = (d) => {
    if (!d) return null;
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return null;
      return `${dt.getDate()}/${dt.getMonth() + 1} ${dt.getHours().toString().padStart(2, '0')}:${dt.getMinutes().toString().padStart(2, '0')}`;
    } catch { return null; }
  };

  const hasReachedDate = (d) => {
    if (!d) return false;
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return false;
    return dt.getTime() <= nowTs;
  };

  // One upload node per submission â€” only shown when actual files were uploaded.
  // Submissions with no media arrays or video URL are empty stubs and are excluded,
  // so a brand-new calendar item shows only "Created" in its timeline.
  const submissionsWithContent = submissions.filter(s => {
    const media = s.media || s.images || s.files || s.imageUrls || s.mediaUrls || [];
    const hasMedia = Array.isArray(media) && media.length > 0;
    const hasVideo = !!(s.videoUrl || s.video_url);
    return hasMedia || hasVideo;
  });

  const versionSteps = submissionsWithContent.map((s, idx) => {
    // Prefer the uploader's name/email. Could be admin (notify_admins) or creator.
    const uploaderEmail =
      s.created_by || s.createdBy || s.creator_email ||
      (Array.isArray(s.notify_admins) && s.notify_admins.length > 0
        ? (s.notify_admins[0].name || s.notify_admins[0].email)
        : null) ||
      '';
    const label = uploaderEmail
      ? `V${idx + 1} (${uploaderEmail})`
      : `V${idx + 1}`;
    return {
      key: `v${idx + 1}`,
      label,
      done: hasReachedDate(s.created_at || s.createdAt),
      date: fmtDate(s.created_at || s.createdAt),
      tone: 'blue',
    };
  });

  const customerApprovedSub = submissions.find(s =>
    s.approved_by_customer === true ||
    s.status === 'approved_customer' ||
    s.status === 'approved_both'
  );

  // Only mark as approved when there is an actual customer approval record.
  // Being published alone does NOT count as customer approval.
  const isCustomerApproved = !!customerApprovedSub;

  const customerApprovedAt = customerApprovedSub?.approvedAt ||
    customerApprovedSub?.updatedAt || null;

  const customerApprovedDate = fmtDate(customerApprovedAt);
  const publishedAt = matchedPost?.publishedAt || item.publishedAt;

  // Order: Created â†’ V1 (uploader) â†’ V2 â†’ V3 ... â†’ Approved by Customer â†’ Published
  const steps = [
    { key: 'created', label: 'Created', done: hasReachedDate(item.createdAt), date: fmtDate(item.createdAt), tone: 'blue' },
    ...versionSteps,
    { key: 'reviewed', label: 'Approved by Customer', done: isCustomerApproved, date: customerApprovedDate, tone: 'green' },
    { key: 'published', label: 'Published', done: hasReachedDate(publishedAt), date: fmtDate(publishedAt), tone: 'purple' },
  ];

  const toneClasses = {
    blue: {
      dotDone: 'bg-blue-500',
      dotTodo: 'bg-blue-100',
      labelDone: 'text-blue-700 font-medium',
      labelTodo: 'text-blue-350',
      dateDone: 'text-blue-550',
      dateTodo: 'text-blue-200',
      lineDone: 'bg-blue-400',
      lineTodo: 'bg-blue-100',
    },
    orange: {
      dotDone: 'bg-amber-500',
      dotTodo: 'bg-amber-100',
      labelDone: 'text-amber-700 font-medium',
      labelTodo: 'text-amber-350',
      dateDone: 'text-amber-550',
      dateTodo: 'text-amber-200',
      lineDone: 'bg-amber-400',
      lineTodo: 'bg-amber-100',
    },
    green: {
      dotDone: 'bg-emerald-500',
      dotTodo: 'bg-emerald-100',
      labelDone: 'text-emerald-700 font-medium',
      labelTodo: 'text-emerald-355',
      dateDone: 'text-emerald-550',
      dateTodo: 'text-emerald-200',
      lineDone: 'bg-emerald-400',
      lineTodo: 'bg-emerald-100',
    },
    purple: {
      dotDone: 'bg-purple-500',
      dotTodo: 'bg-purple-100',
      labelDone: 'text-purple-700 font-medium',
      labelTodo: 'text-purple-350',
      dateDone: 'text-purple-555',
      dateTodo: 'text-purple-200',
      lineDone: 'bg-purple-400',
      lineTodo: 'bg-purple-100',
    },
  };

  return (
    <div className="flex items-start mt-3 overflow-x-auto pb-1 max-w-full no-scrollbar">
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${step.done ? (toneClasses[step.tone || 'blue']?.dotDone || 'bg-blue-500') : (toneClasses[step.tone || 'blue']?.dotTodo || 'bg-blue-100')}`} />
            <span className={`text-[9px] leading-none mt-1.5 whitespace-nowrap ${step.done ? (toneClasses[step.tone || 'blue']?.labelDone || 'text-blue-705 font-semibold') : (toneClasses[step.tone || 'blue']?.labelTodo || 'text-blue-300')}`}>
              {step.label}
            </span>
            <span className={`text-[8px] leading-none mt-1 whitespace-nowrap ${step.date ? (step.done ? (toneClasses[step.tone || 'blue']?.dateDone || 'text-blue-500') : (toneClasses[step.tone || 'blue']?.dateTodo || 'text-blue-200')) : 'text-transparent select-none'}`}>
              {step.date || 'â€”'}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-px mt-1 mx-1 ${step.done && steps[idx + 1].done ? (toneClasses[steps[idx + 1].tone || 'blue']?.lineDone || 'bg-blue-400') : (toneClasses[steps[idx + 1].tone || 'blue']?.lineTodo || 'bg-blue-100')}`}
              style={{ minWidth: '12px' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

function ContentCalendar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';
  const [selectedContent, setSelectedContent] = useState(null);
  const [statusFilter, setStatusFilter] = useState(initialFilter);
  const [calendars, setCalendars] = useState([]);

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      setStatusFilter(filter);
    }
  }, [searchParams]);
  const [selectedCalendarId, setSelectedCalendarId] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');

  // â”€â”€ Review comments modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [reviewItemId, setReviewItemId] = useState(null);

  let user = null;
  try { user = JSON.parse(localStorage.getItem('user')); } catch { user = null; }
  const customerId = user?.id || user?._id;
  const customerName = user?.name;

  // Refresh only submissions — called after ContentReview closes so the
  // timeline updates immediately without a full page reload.
  const refreshSubmissions = React.useCallback(async () => {
    if (!customerId) return;
    try {
      const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      let submissionsData = await submissionsRes.json();
      if (!Array.isArray(submissionsData)) submissionsData = [];
      setSubmissions(submissionsData.filter(s =>
        s.customer_id === customerId ||
        s.customer_email === user?.email ||
        (s.created_by && user?.email && s.created_by === user.email && !s.customer_id && !s.customer_email)
      ));
    } catch { /* silent — stale data is acceptable */ }
  }, [customerId, user?.email]);

  useEffect(() => {
    const fetchCustomerAndCalendars = async () => {
      setLoading(true);
      try {
        const customerRes = await fetch(`${process.env.REACT_APP_API_URL}/customer/${customerId}`);
        const customerData = await customerRes.json();
        setCustomer(customerData);

        const calendarsRes = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const allCalendars = await calendarsRes.json();
        const customerCalendars = allCalendars
          .filter(c => c.customerId === customerId)
          .sort((a, b) => new Date(b.createdAt || b._id || 0) - new Date(a.createdAt || a._id || 0));
        setCalendars(customerCalendars);

        const postsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
        let postsData = await postsRes.json();
        if (!Array.isArray(postsData)) postsData = [];
        const filteredPosts = postsData.filter(p => p.customerId === customerId);
        setScheduledPosts(filteredPosts);

        // Fetch live metrics in background to enrich permalinks
        const publishedPosts = filteredPosts.filter(p => p.status === 'published' || p.publishedAt);
        if (publishedPosts.length > 0) {
          fetch(`${process.env.REACT_APP_API_URL}/api/admin/post-metrics/live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId, posts: publishedPosts }),
          })
            .then(res => res.ok ? res.json() : null)
            .then(json => {
              if (!json) return;
              const enriched = json.posts || [];
              setScheduledPosts(currentPosts =>
                currentPosts.map(p => {
                  const match = enriched.find(ep => ep._id === p._id);
                  return match ? { ...p, ...match, instagramPermalink: match.metrics?.permalink || match.instagramPermalink || p.instagramPermalink } : p;
                })
              );
            })
            .catch(liveErr => console.warn('Live metrics fetch failed (non-critical):', liveErr));
        }

        const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
        let submissionsData = await submissionsRes.json();
        if (!Array.isArray(submissionsData)) submissionsData = [];
        setSubmissions(submissionsData.filter(s =>
          s.customer_id === customerId ||
          s.customer_email === user?.email ||
          (s.created_by && user?.email && s.created_by === user.email && !s.customer_id && !s.customer_email)
        ));
      } catch {
        setCustomer(null);
        setCalendars([]);
        setScheduledPosts([]);
        setSubmissions([]);
      } finally {
        setLoading(false);
      }
    };
    if (customerId) fetchCustomerAndCalendars();
  }, [customerId]);

  const hasContentSubmitted = (item, calendarId) =>
    submissions.some(sub => {
      const subCalId = sub.calendar_id || sub.calendarId;
      if (subCalId && subCalId !== calendarId) return false;
      const subId = sub.item_id || sub.assignment_id;
      if (subId) {
        return subId === item.id;
      }
      return sub.item_name && sub.item_name === item.title;
    });

  const isItemScheduled = (item, calendarId) =>
    scheduledPosts.some(post => {
      const postCalId = post.calendar_id || post.calendarId;
      if (postCalId && postCalId !== calendarId) return false;
      const postId = post.item_id || post.contentId;
      if (postId) {
        return postId === item.id && (post.status === 'scheduled' || post.status === 'pending' || (post.scheduledDate && !post.publishedAt));
      }
      return post.item_name && post.item_name === item.title &&
        (post.status === 'scheduled' || post.status === 'pending' || (post.scheduledDate && !post.publishedAt));
    });

  const getPublishedPlatformsForItem = (item, calendarId) =>
    scheduledPosts
      .filter(post => {
        const postCalId = post.calendar_id || post.calendarId;
        if (postCalId && postCalId !== calendarId) return false;
        const postId = post.item_id || post.contentId;
        if (postId) {
          return postId === item.id && (post.status === 'published' || post.publishedAt);
        }
        return post.item_name && post.item_name === item.title &&
          (post.status === 'published' || post.publishedAt);
      })
      .map(post => post.platform);

  const isItemPublished = (item, calendarId) =>
    scheduledPosts.some(post => {
      const postCalId = post.calendar_id || post.calendarId;
      if (postCalId && postCalId !== calendarId) return false;
      const postId = post.item_id || post.contentId;
      if (postId) {
        return postId === item.id && (post.status === 'published' || post.publishedAt);
      }
      return post.item_name && post.item_name === item.title &&
        (post.status === 'published' || post.publishedAt);
    });

  const getItemStatus = (item, calendarId) => {
    if (item.published === true) return 'published';
    if (isItemPublished(item, calendarId)) return 'published';
    if (isItemScheduled(item, calendarId)) return 'scheduled';
    if (hasContentSubmitted(item, calendarId)) return 'under_review';
    return item.status || 'pending';
  };

  let allItems = [];
  calendars.forEach(calendar => {
    if (Array.isArray(calendar.contentItems)) {
      if (!selectedCalendarId || calendar._id === selectedCalendarId || calendar.id === selectedCalendarId) {
        calendar.contentItems.forEach((item, index) => {
          const itemStatus = getItemStatus(item, calendar._id);
          const published = item.published === true || isItemPublished(item, calendar._id);
          const stableItemId = item.id || item._id || `${calendar._id}::${index}`;
          allItems.push({
            ...item,
            calendarName: calendar.name || '',
            calendarId: calendar._id,
            id: stableItemId,
            calendarItemIndex: index,
            creator: item.assignedToName || item.assignedTo || calendar.assignedToName || calendar.assignedTo || '',
            status: itemStatus,
            publishedPlatforms: published ? (item.publishedPlatforms || getPublishedPlatformsForItem(item, calendar._id)) : [],
          });
        });
      }
    }
  });

  const filteredItems = statusFilter === 'all' ? allItems : allItems.filter(i => i.status === statusFilter);
  const sortedItems = [...filteredItems].sort((a, b) => {
    // Newest first: prefer createdAt, fall back to scheduled date
    const aTime = new Date(a.createdAt || a.date || 0).getTime();
    const bTime = new Date(b.createdAt || b.date || 0).getTime();
    return bTime - aTime;
  });

  const stats = useMemo(() => ({
    total: allItems.length,
    published: allItems.filter(i => i.status === 'published').length,
    underReview: allItems.filter(i => i.status === 'under_review').length,
    scheduled: allItems.filter(i => i.status === 'scheduled').length,
    pending: allItems.filter(i => !i.status || i.status === 'pending').length,
  }), [calendars, scheduledPosts, submissions, selectedCalendarId]);

  const displayedItems = useMemo(() => {
    if (!searchTerm.trim()) return sortedItems;
    const term = searchTerm.toLowerCase();
    return sortedItems.filter(i =>
      i.description?.toLowerCase().includes(term) ||
      i.title?.toLowerCase().includes(term) ||
      i.creator?.toLowerCase().includes(term)
    );
  }, [sortedItems, searchTerm]);

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // DOWNLOAD REPORT
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const downloadReport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PAGE_W = 210;
    const PAGE_H = 297;
    const MARGIN = 18;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    let y = 0;

    const C = {
      primary: [79, 70, 229],
      success: [16, 185, 129],
      warning: [245, 158, 11],
      info: [59, 130, 246],
      neutral: [107, 114, 128],
      dark: [17, 24, 39],
      mid: [75, 85, 99],
      light: [243, 244, 246],
      white: [255, 255, 255],
      border: [229, 231, 235],
      bgSoft: [248, 250, 252],
    };

    const setFill = (arr) => doc.setFillColor(...arr);
    const setStroke = (arr) => doc.setDrawColor(...arr);
    const setColor = (arr) => doc.setTextColor(...arr);
    const setFont = (style = 'normal', size = 10) => { doc.setFont('helvetica', style); doc.setFontSize(size); };

    const drawPageBg = () => { setFill(C.bgSoft); doc.rect(0, 0, PAGE_W, PAGE_H, 'F'); };
    const hLine = (yPos) => { setStroke(C.border); doc.setLineWidth(0.3); doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos); };

    const newPageIfNeeded = (needed = 20) => {
      if (y + needed > PAGE_H - 22) {
        doc.addPage();
        y = MARGIN;
        drawPageBg();
      }
    };

    // â”€â”€ Page 1: Hero header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    drawPageBg();

    // Hero band
    setFill(C.primary);
    doc.rect(0, 0, PAGE_W, 54, 'F');

    // Decorative blobs
    setFill([99, 91, 255]);
    doc.circle(PAGE_W + 4, 2, 32, 'F');
    setFill([67, 56, 202]);
    doc.circle(12, 58, 22, 'F');

    setFont('bold', 22);
    setColor(C.white);
    doc.text('Content Calendar Report', MARGIN, 23);

    setFont('normal', 10);
    setColor([199, 210, 254]);
    doc.text('Automated performance & status summary', MARGIN, 32);

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    setFont('normal', 8);
    setColor([165, 180, 252]);
    doc.text(`Generated: ${dateStr}`, MARGIN, 40);

    if (customerName) {
      const bx = PAGE_W - MARGIN - 62;
      setFill([67, 56, 202]);
      doc.roundedRect(bx, 10, 62, 15, 3, 3, 'F');
      setFont('bold', 8.5);
      setColor(C.white);
      doc.text(customerName, bx + 4, 20);
    }

    y = 63;

    // â”€â”€ Stat cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    setFont('bold', 11);
    setColor(C.dark);
    doc.text('Overview', MARGIN, y);
    y += 7;

    const cards = [
      { label: 'Total', value: stats.total, color: C.primary },
      { label: 'Published', value: stats.published, color: C.success },
      { label: 'Under Review', value: stats.underReview, color: C.warning },
      { label: 'Scheduled', value: stats.scheduled, color: C.info },
      { label: 'Pending', value: stats.pending, color: C.neutral },
    ];

    const cW = (CONTENT_W - 8) / 5;
    const cH = 28;

    cards.forEach((card, i) => {
      const cx = MARGIN + i * (cW + 2);
      setFill(C.white); setStroke(C.border); doc.setLineWidth(0.3);
      doc.roundedRect(cx, y, cW, cH, 3, 3, 'FD');
      setFill(card.color);
      doc.roundedRect(cx, y, 3, cH, 1.5, 1.5, 'F');
      setFont('bold', 17); setColor(card.color);
      doc.text(String(card.value), cx + 7, y + 13);
      setFont('normal', 7); setColor(C.mid);
      doc.text(card.label, cx + 7, y + 21);
    });

    y += cH + 12;

    // â”€â”€ Progress bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (stats.total > 0) {
      const pct = stats.published / stats.total;
      const barW = CONTENT_W;
      const barH = 7;
      setFont('bold', 9); setColor(C.dark);
      doc.text('Completion Progress', MARGIN, y);
      y += 5;
      setFill(C.border);
      doc.roundedRect(MARGIN, y, barW, barH, 3.5, 3.5, 'F');
      if (pct > 0) { setFill(C.success); doc.roundedRect(MARGIN, y, barW * pct, barH, 3.5, 3.5, 'F'); }
      setFont('bold', 8); setColor(C.success);
      doc.text(`${Math.round(pct * 100)}% published`, PAGE_W - MARGIN - 26, y + 5.5);
      y += barH + 12;
    }

    // â”€â”€ Calendar breakdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if (calendars.length > 1) {
      newPageIfNeeded(50);
      setFont('bold', 11); setColor(C.dark);
      doc.text('Calendar Breakdown', MARGIN, y); y += 7;

      calendars.forEach((cal, ci) => {
        newPageIfNeeded(14);
        const items = cal.contentItems || [];
        const pub = items.filter(i => getItemStatus(i) === 'published').length;
        const pend = items.filter(i => getItemStatus(i) === 'pending').length;
        const rH = 12;
        setFill(ci % 2 === 0 ? C.white : C.light);
        setStroke(C.border); doc.setLineWidth(0.2);
        doc.roundedRect(MARGIN, y, CONTENT_W, rH, 2, 2, 'FD');
        setFill(C.primary); doc.circle(MARGIN + 5, y + rH / 2, 1.8, 'F');
        setFont('bold', 9); setColor(C.dark);
        doc.text(cal.name || `Calendar ${ci + 1}`, MARGIN + 11, y + 8);
        setFont('normal', 8); setColor(C.mid);
        doc.text(`${items.length} items`, MARGIN + 80, y + 8);
        setColor(C.success);
        doc.text(`${pub} published`, MARGIN + 110, y + 8);
        setColor(C.neutral);
        doc.text(`${pend} pending`, MARGIN + 140, y + 8);
        y += rH + 2;
      });
      y += 8;
    }

    // â”€â”€ Items table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    newPageIfNeeded(30);

    // Section header
    setFill(C.primary);
    doc.roundedRect(MARGIN, y, CONTENT_W, 10, 2, 2, 'F');
    setFont('bold', 9); setColor(C.white);
    doc.text('All Content Items', MARGIN + 4, y + 7);
    doc.text(`${displayedItems.length} items`, PAGE_W - MARGIN - 24, y + 7);
    y += 14;

    // Column defs
    const cols = [
      { key: '#', x: MARGIN, w: 9 },
      { key: 'Date', x: MARGIN + 11, w: 24 },
      { key: 'Description', x: MARGIN + 37, w: 66 },
      { key: 'Calendar', x: MARGIN + 105, w: 35 },
      { key: 'Platforms', x: MARGIN + 142, w: 22 },
      { key: 'Status', x: MARGIN + 166, w: 28 },
    ];

    // Header row
    setFill(C.light); setStroke(C.border); doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, 'FD');
    setFont('bold', 7.5); setColor(C.mid);
    cols.forEach(col => doc.text(col.key, col.x + 1, y + 5.8));
    y += 10;

    const STATUS_CFG = {
      published: { color: C.success, label: 'Published' },
      under_review: { color: C.warning, label: 'Under Review' },
      scheduled: { color: C.info, label: 'Scheduled' },
      pending: { color: C.neutral, label: 'Pending' },
      draft: { color: C.neutral, label: 'Draft' },
    };

    displayedItems.forEach((item, idx) => {
      const rH = 11;
      newPageIfNeeded(rH + 4);

      setFill(idx % 2 === 0 ? C.white : C.bgSoft);
      setStroke(C.border); doc.setLineWidth(0.15);
      doc.rect(MARGIN, y, CONTENT_W, rH, 'FD');

      const mid = y + 7.5;
      const cfg = STATUS_CFG[item.status] || STATUS_CFG.pending;

      // Index
      setFont('normal', 7.5); setColor(C.mid);
      doc.text(String(idx + 1), cols[0].x + 2, mid);

      // Date
      let dateLabel = 'â€”';
      try { dateLabel = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }); } catch { }
      setColor(C.dark);
      doc.text(dateLabel, cols[1].x + 1, mid);

      // Description
      const rawDesc = item.description || item.title || 'No description';
      const truncated = doc.splitTextToSize(rawDesc, cols[2].w - 2)[0] || rawDesc.substring(0, 48);
      doc.text(truncated, cols[2].x + 1, mid);

      // Calendar
      setColor(C.mid); setFont('normal', 7);
      doc.text((item.calendarName || '').substring(0, 18), cols[3].x + 1, mid);

      // Platforms
      const plats = (item.publishedPlatforms || []).join(', ').substring(0, 10) || 'â€”';
      doc.text(plats, cols[4].x + 1, mid);

      // Status pill
      const pillW = cols[5].w - 4;
      const pillX = cols[5].x + 2;
      setFill([...cfg.color.map(v => Math.min(255, v + 195))]);
      doc.roundedRect(pillX, y + 2.5, pillW, 6, 1.5, 1.5, 'F');
      setFont('bold', 6.5); setColor(cfg.color);
      doc.text(cfg.label, pillX + pillW / 2, y + 7, { align: 'center' });

      y += rH;
    });

    y += 10;

    // â”€â”€ Status breakdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    newPageIfNeeded(65);
    setFont('bold', 11); setColor(C.dark);
    doc.text('Status Breakdown', MARGIN, y); y += 7;

    const breakdown = [
      { label: 'Published', count: stats.published, color: C.success },
      { label: 'Under Review', count: stats.underReview, color: C.warning },
      { label: 'Scheduled', count: stats.scheduled, color: C.info },
      { label: 'Pending', count: stats.pending, color: C.neutral },
    ];

    breakdown.forEach((row, i) => {
      newPageIfNeeded(14);
      const rH = 12;
      const pctVal = stats.total > 0 ? ((row.count / stats.total) * 100).toFixed(1) : '0.0';
      const maxBarW = CONTENT_W - 85;
      const barFill = stats.total > 0 ? (row.count / stats.total) * maxBarW : 0;

      setFill(i % 2 === 0 ? C.white : C.light);
      setStroke(C.border); doc.setLineWidth(0.2);
      doc.roundedRect(MARGIN, y, CONTENT_W, rH, 2, 2, 'FD');

      setFill(row.color); doc.circle(MARGIN + 5, y + rH / 2, 2.2, 'F');

      setFont('bold', 9); setColor(C.dark);
      doc.text(row.label, MARGIN + 11, y + 8);

      setFont('bold', 9); setColor(row.color);
      doc.text(String(row.count), MARGIN + 62, y + 8);

      const barX = MARGIN + 78;
      const barY = y + 3.5;
      setFill(C.border); doc.roundedRect(barX, barY, maxBarW, 5, 2, 2, 'F');
      if (barFill > 0) { setFill(row.color); doc.roundedRect(barX, barY, barFill, 5, 2, 2, 'F'); }
      setFont('normal', 7.5); setColor(C.mid);
      doc.text(`${pctVal}%`, barX + maxBarW + 3, y + 8);

      y += rH + 2;
    });

    // â”€â”€ Footer on every page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      hLine(PAGE_H - 14);
      setFont('normal', 7); setColor(C.mid);
      doc.text('Content Calendar Report  â€¢  Confidential', MARGIN, PAGE_H - 8);
      doc.text(`Page ${p} of ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
    }

    doc.save(`content-calendar-report-${now.toISOString().slice(0, 10)}.pdf`);
  };
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-gray-500 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <span className="text-sm font-medium">Loading content calendar...</span>
      </div>
    );
  }
  if (!customer) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-red-500 gap-2 px-4 text-center">
        <AlertCircle className="h-8 w-8 text-red-500 animate-pulse" />
        <span className="text-sm font-semibold">Customer account not found.</span>
        <p className="text-xs text-gray-400 max-w-sm">Please make sure the server is started and you are logged in correctly.</p>
      </div>
    );
  }

  const getItemMedia = (item) => {
    if (item.submissionMedia) return { imageUrl: item.submissionMedia, imageUrls: [item.submissionMedia] };
    if (item.imageUrl) return { imageUrl: item.imageUrl, imageUrls: item.imageUrls || [item.imageUrl] };
    if (item.thumbnail) return { imageUrl: item.thumbnail, imageUrls: [item.thumbnail] };
    if (item.aiGeneratedImage) return { imageUrl: item.aiGeneratedImage, imageUrls: [item.aiGeneratedImage] };
    if (item.media?.length > 0) {
      const urls = item.media.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
      return { imageUrl: urls[0], imageUrls: urls };
    }
    if (item.images?.length > 0) {
      const urls = item.images.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
      return { imageUrl: urls[0], imageUrls: urls };
    }
    if (item.imageUrls?.length > 0) return { imageUrl: item.imageUrls[0], imageUrls: item.imageUrls };
    const matchingSubs = submissions
      .filter(sub => {
        const subCalId = sub.calendar_id || sub.calendarId;
        if (subCalId && item.calendarId && subCalId !== item.calendarId) return false;

        const subItemIndex = sub.item_index !== undefined && sub.item_index !== null
          ? Number(sub.item_index)
          : null;
        if (subItemIndex !== null && item.calendarItemIndex !== undefined) {
          if (subItemIndex === Number(item.calendarItemIndex)) return true;
        }

        const subId = sub.assignment_id || sub.item_id;
        if (subId && item.id) {
          return String(subId) === String(item.id);
        }

        return sub.item_name && sub.item_name === item.title;
      })
      .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

    const latestSubmission = matchingSubs[0];
    if (latestSubmission) {
      const subMedia = latestSubmission.media || latestSubmission.images || [];
      if (subMedia.length > 0) {
        const urls = subMedia.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
        if (urls.length > 0) return { imageUrl: urls[0], imageUrls: urls };
      }

      if (latestSubmission.videoUrl || latestSubmission.video_url) {
        const videoUrl = latestSubmission.videoUrl || latestSubmission.video_url;
        return { imageUrl: videoUrl, imageUrls: [videoUrl] };
      }
    }
    return { imageUrl: null, imageUrls: [] };
  };

  const handleOpenReviewPanel = (item, e) => {
    e.stopPropagation();
    setReviewItemId(item.id);
  };

  const handleContentClick = (item) => {
    const scheduledPublishedPosts = scheduledPosts.filter(post => {
      const postId = post.item_id || post.contentId;
      if (postId) {
        return postId === item.id;
      }
      const postCalId = post.calendarId || post.calendar_id;
      if (postCalId && item.calendarId && postCalId !== item.calendarId) return false;
      return post.item_name && post.item_name === item.title;
    });
    const manualPublishedPosts = [];
    if (item.published === true && item.publishedPlatforms?.length > 0) {
      const scheduledPlatforms = new Set(scheduledPublishedPosts.map(p => p.platform?.toLowerCase()));
      const itemMedia = getItemMedia(item);
      item.publishedPlatforms.forEach(platform => {
        if (!scheduledPlatforms.has(platform?.toLowerCase())) {
          manualPublishedPosts.push({
            _id: `manual-${item.id}-${platform}`,
            platform, pageName: `${platform} Post`,
            status: 'published', publishedAt: item.publishedAt,
            scheduledAt: item.publishedAt || item.date,
            caption: item.description || item.title,
            imageUrl: itemMedia.imageUrl,
            imageUrls: itemMedia.imageUrls.length > 0 ? itemMedia.imageUrls : null,
            notes: item.publishedNotes, isManualPublish: true,
          });
        }
      });
    }
    setSelectedContent({ ...item, publishedPosts: [...scheduledPublishedPosts, ...manualPublishedPosts] });
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <div className="px-4 sm:px-6 lg:px-8 py-6">

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-indigo-600" />
                  Calendars
                </h3>
              </div>
              <div className="p-3 max-h-96 overflow-y-auto">
                <button
                  onClick={() => setSelectedCalendarId(null)}
                  className={`w-full text-left p-3 rounded-lg mb-2 transition-all ${!selectedCalendarId ? 'bg-indigo-50 border-2 border-indigo-200 text-indigo-700' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-2 border-transparent'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">All Calendars</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${!selectedCalendarId ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-200 text-gray-600'}`}>{allItems.length}</span>
                  </div>
                </button>
                <div className="space-y-2">
                  {calendars.map((calendar, idx) => {
                    const isSelected = (calendar._id || calendar.id) === selectedCalendarId;
                    return (
                      <button
                        key={calendar._id || calendar.id || idx}
                        onClick={() => setSelectedCalendarId(calendar._id || calendar.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-transparent hover:border-gray-200'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate pr-2">{calendar.name}</span>
                          <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>{calendar.contentItems?.length || 0}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Filter Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-2.5 mb-4">
              <div className="flex items-center gap-2 overflow-x-auto">
                {/* Filter label */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Filter className="h-3.5 w-3.5 text-gray-500" />
                  <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Filter by Status:</span>
                </div>

                {/* Status pills */}
                {[
                  { key: 'all', label: 'All', count: stats.total, color: '' },
                  { key: 'published', label: 'Published', count: stats.published, color: 'emerald' },
                  { key: 'under_review', label: 'Under Review', count: stats.underReview, color: 'amber' },
                  { key: 'scheduled', label: 'Scheduled', count: stats.scheduled, color: 'blue' },
                  { key: 'pending', label: 'Pending', count: stats.pending, color: 'gray' },
                ].map(option => (
                  <button
                    key={option.key}
                    onClick={() => setStatusFilter(option.key)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter === option.key
                      ? option.color === 'emerald' ? 'bg-emerald-600 text-white'
                        : option.color === 'amber' ? 'bg-amber-500 text-white'
                          : option.color === 'blue' ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    {option.label}
                    <span className={`text-[10px] px-1 py-0.5 rounded-full ${statusFilter === option.key ? 'bg-white/20' : 'bg-gray-200'}`}>{option.count}</span>
                  </button>
                ))}

                {/* Divider */}
                <div className="flex-shrink-0 w-px h-5 bg-gray-200 mx-1" />

                {/* Search */}
                <div className="relative flex-shrink-0">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-36 pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition-all"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* View Toggle */}
                <div className="flex-shrink-0 flex items-center bg-gray-100 rounded-lg p-0.5">
                  <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Download */}
                <button
                  onClick={downloadReport}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-medium shadow-sm transition-all active:scale-95 select-none"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span> Report</span>
                </button>
              </div>
            </div>

            {/* Content Items */}
            {displayedItems.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
                {displayedItems.map((item) => {
                  const itemMedia = getItemMedia(item);
                  return viewMode === 'grid' ? (
                    <div key={item.id} onClick={() => handleContentClick(item)} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
                      <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200">
                        {itemMedia.imageUrl ? (
                          isVideoUrl(itemMedia.imageUrl) ? (
                            <div className="relative w-full h-full bg-black">
                              <video
                                src={itemMedia.imageUrl}
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                                <Play className="h-10 w-10 text-white/85" />
                              </div>
                            </div>
                          ) : (
                            <img src={itemMedia.imageUrl} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Image className="h-10 w-10 text-gray-300" /></div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${item.status === 'published' ? 'bg-emerald-500 text-white' :
                            item.status === 'under_review' ? 'bg-amber-500 text-white' :
                              item.status === 'scheduled' ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
                            }`}>
                            {item.status === 'published' && <CheckCircle className="h-3 w-3" />}
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                          <CalendarIcon className="h-3.5 w-3.5" />
                          <span>{format(new Date(item.date), 'MMM dd, yyyy')}</span>
                        </div>
                        <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-3">{item.description || 'No description'}</p>
                        {item.publishedPlatforms?.length > 0 && (
                          <div className="flex items-center gap-1.5 mb-3">
                            {item.publishedPlatforms.slice(0, 4).map((p, i) => <span key={i} className="text-gray-400">{getPlatformIcon(p)}</span>)}
                          </div>
                        )}
                        {item.creator && (
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <User className="h-3.5 w-3.5" /><span className="truncate">{item.creator}</span>
                          </div>
                        )}
                        <button
                          onClick={(e) => handleOpenReviewPanel(item, e)}
                          className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 px-3 py-2 rounded-lg transition-colors font-medium"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /><span>Content Review</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} onClick={() => handleContentClick(item)} className={`bg-white rounded-xl border transition-all cursor-pointer group ${item.status === 'published' ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}`}>
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="w-full sm:w-24 h-24 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex-shrink-0">
                            {itemMedia.imageUrl ? (
                              isVideoUrl(itemMedia.imageUrl) ? (
                                <div className="relative w-full h-full bg-black">
                                  <video
                                    src={itemMedia.imageUrl}
                                    muted
                                    playsInline
                                    preload="metadata"
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                                    <Play className="h-8 w-8 text-white/85" />
                                  </div>
                                </div>
                              ) : (
                                <img src={itemMedia.imageUrl} alt="" className="w-full h-full object-cover" />
                              )
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Image className="h-8 w-8 text-gray-300" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${item.status === 'published' ? 'bg-emerald-100 text-emerald-700' :
                                  item.status === 'under_review' ? 'bg-amber-100 text-amber-700' :
                                    item.status === 'scheduled' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                  }`}>
                                  {item.status === 'published' && <CheckCircle className="h-3 w-3" />}
                                  {item.status === 'scheduled' && <Clock className="h-3 w-3" />}
                                  {item.status === 'under_review' && <Eye className="h-3 w-3" />}
                                  {getStatusLabel(item.status)}
                                </span>
                                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                                  <CalendarIcon className="h-3.5 w-3.5" />
                                  {format(new Date(item.date), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.status === 'published' && (
                                  <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
                                    <ExternalLink className="h-3.5 w-3.5" /><span className="font-medium">View Details</span>
                                  </div>
                                )}
                                <button
                                  onClick={(e) => handleOpenReviewPanel(item, e)}
                                  className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 hover:bg-purple-100 active:bg-purple-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
                                >
                                  <MessageSquare className="h-3.5 w-3.5" /><span>Content Review</span>
                                </button>
                              </div>
                            </div>
                            <p className="text-gray-800 font-medium mb-3 line-clamp-2">{item.description || 'No description available'}</p>
                            <div className="flex flex-wrap items-center gap-4">
                              {item.publishedPlatforms?.length > 0 && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-500">Published on:</span>
                                  <div className="flex items-center gap-1.5">{item.publishedPlatforms.map((p, i) => <span key={i} className="text-gray-500">{getPlatformIcon(p)}</span>)}</div>
                                </div>
                              )}
                              {item.creator && (
                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                  <User className="h-3.5 w-3.5" /><span>{item.creator}</span>
                                </div>
                              )}
                              {item.commentCount > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                                  <MessageSquare className="h-3.5 w-3.5" /><span className="font-medium">{item.commentCount}</span>
                                </div>
                              )}
                            </div>
                            <ItemTimeline
                              item={item}
                              itemStatus={item.status}
                              scheduledPosts={scheduledPosts}
                              submissions={submissions.filter(sub => { if (sub.reviewType === 'internal') return false; const subId = sub.assignment_id || sub.item_id; if (subId) return subId === item.id; return sub.item_name && sub.item_name === item.title; })}
                            />
                          </div>
                          <div className="hidden sm:flex items-center">
                            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No content found</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  {searchTerm ? `No content matches "${searchTerm}". Try a different search term.` : 'No content items found in this calendar.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content Details Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setSelectedContent(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Content Details</h3>
                    <p className="text-xs text-gray-500">View published post information</p>
                  </div>
                </div>
                <button onClick={() => setSelectedContent(null)} className="h-8 w-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-5 border border-gray-100">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <CalendarIcon className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Date</p>
                        <p className="text-sm font-semibold text-gray-900">{format(new Date(selectedContent.date), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${selectedContent.status === 'published' ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                        {selectedContent.status === 'published' ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : <Clock className="h-5 w-5 text-gray-500" />}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Status</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${selectedContent.status === 'published' ? 'bg-emerald-100 text-emerald-700' : getStatusColor(selectedContent.status)}`}>
                          {getStatusLabel(selectedContent.status)}
                        </span>
                      </div>
                    </div>
                    {selectedContent.creator && (
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Assigned to</p>
                          <p className="text-sm font-semibold text-gray-900">{selectedContent.creator}</p>
                        </div>
                      </div>
                    )}
                  </div>
                  {selectedContent.description && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs text-gray-500 font-medium mb-1">Description</p>
                      <p className="text-sm text-gray-700">{selectedContent.description}</p>
                    </div>
                  )}
                </div>

                {selectedContent.publishedPosts?.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                        <Send className="h-4 w-4 text-indigo-600" />Published Posts
                      </h4>
                      <span className="text-xs font-medium px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                        {selectedContent.publishedPosts.length} post{selectedContent.publishedPosts.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedContent.publishedPosts.map((post, idx) => (
                        <div key={post._id || idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-100">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${post.platform === 'facebook' ? 'bg-blue-100' : post.platform === 'instagram' ? 'bg-pink-100' : post.platform === 'linkedin' ? 'bg-blue-100' : post.platform === 'youtube' ? 'bg-red-100' : 'bg-gray-100'}`}>
                                  {getPlatformIcon(post.platform)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{post.pageName || post.channelName || 'Social Media Post'}</p>
                                  <p className="text-xs text-gray-500 capitalize">{post.platform}</p>
                                </div>
                              </div>
                              {getPostPublishedUrl(post, selectedContent) && (
                                <a href={getPostPublishedUrl(post, selectedContent)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
                                  <span>View Post</span><ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="p-4">
                            {post.imageUrls?.length > 1 ? (
                              <div className="mb-4">
                                <div className="grid grid-cols-3 gap-2">
                                  {post.imageUrls.slice(0, 6).map((url, mi) =>
                                    isVideoUrl(url) ? (
                                      <div key={mi} className="relative aspect-square bg-black rounded-lg overflow-hidden">
                                        <video
                                          src={url}
                                          muted
                                          playsInline
                                          preload="metadata"
                                          className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                                          <Play className="h-8 w-8 text-white/85" />
                                        </div>
                                        <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{mi + 1}</span>
                                      </div>
                                    ) : (
                                      <div key={mi} className="relative aspect-square overflow-hidden rounded-lg">
                                        <img src={url} alt={`Item ${mi + 1}`} className="w-full h-full object-cover" />
                                        <span className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-0.5 rounded-full">{mi + 1}</span>
                                      </div>
                                    )
                                  )}
                                  {post.imageUrls.length > 6 && (
                                    <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                                      <span className="text-gray-600 font-semibold">+{post.imageUrls.length - 6}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : post.imageUrl && isVideoUrl(post.imageUrl) ? (
                              <div className="mb-4 rounded-lg overflow-hidden bg-black flex items-center justify-center h-44">
                                <video src={post.imageUrl} controls className="max-w-full max-h-full object-contain" />
                              </div>
                            ) : post.imageUrl ? (
                              <div className="mb-4 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 flex items-center justify-center h-44">
                                <img src={post.imageUrl} alt="Post content" className="max-w-full max-h-full object-contain" />
                              </div>
                            ) : null}
                            {post.caption && <div className="mb-4"><p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{post.caption}</p></div>}
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                              <div className="flex items-center gap-1.5">
                                <Clock className="h-3.5 w-3.5" />
                                <span>Published: {new Date(post.scheduledAt || post.publishedAt).toLocaleString()}</span>
                              </div>
                              {post.postId && <span className="font-mono text-gray-400 text-xs">ID: {post.postId.substring(0, 12)}...</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-gray-400" />
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 mb-1">No Published Posts</h4>
                    <p className="text-sm text-gray-500">No published posts found for this content item.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={() => setSelectedContent(null)} className="px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}
      {reviewItemId && (
        <ContentReview
          itemId={reviewItemId}
          initialSubmissions={submissions}
          onClose={() => {
            setReviewItemId(null);
            // Re-fetch submissions so the timeline reflects any approval
            // made in ContentReview without requiring a manual page refresh.
            refreshSubmissions();
          }}
        />
      )}
    </div>
  );
}

export default ContentCalendar;
