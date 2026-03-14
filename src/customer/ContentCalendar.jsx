import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import { 
  MessageSquare, CalendarIcon, Instagram, Facebook, Linkedin, Youtube, 
  AlertCircle, Eye, CheckCircle, Video, ExternalLink, Clock, Filter,
  LayoutGrid, List, Search, X, ChevronRight, FileText, TrendingUp,
  Send, Image, Play, Calendar, User, Sparkles, BarChart3, Download
} from 'lucide-react';

// Helper to get default post URL if missing
const getDefaultPostUrl = (post) => {
  if (post.postUrl) return post.postUrl;
  if (!post.platform || !post.postId) return null;
  switch (post.platform) {
    case 'instagram': return `https://www.instagram.com/p/${post.postId}`;
    case 'facebook':  return `https://www.facebook.com/${post.postId}`;
    case 'linkedin':  return `https://www.linkedin.com/feed/update/${post.postId}`;
    case 'youtube':   return `https://www.youtube.com/watch?v=${post.postId}`;
    default:          return null;
  }
};

const getPlatformIcon = (platform) => {
  switch (platform) {
    case 'instagram': return <Instagram className="h-5 w-5 text-pink-600" />;
    case 'facebook':  return <Facebook  className="h-5 w-5 text-blue-600" />;
    case 'linkedin':  return <Linkedin  className="h-5 w-5 text-blue-700" />;
    case 'youtube':   return <Youtube   className="h-5 w-5 text-red-600"  />;
    default:          return null;
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'published':   return 'bg-green-100 text-green-800';
    case 'under_review':return 'bg-yellow-100 text-yellow-800';
    case 'scheduled':   return 'bg-blue-100 text-blue-800';
    case 'waiting_input':return 'bg-orange-100 text-orange-800';
    default:            return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status) => {
  if (!status) return 'Pending';
  switch (status) {
    case 'pending':      return 'Pending';
    case 'published':    return 'Published';
    case 'under_review': return 'Under Review';
    case 'scheduled':    return 'Scheduled';
    case 'waiting_input':return 'Waiting Input';
    default:             return status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1);
  }
};

const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const ext = url.split('.').pop().toLowerCase();
  return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
};

function ContentCalendar() {
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent]   = useState(null);
  const [statusFilter, setStatusFilter]         = useState('all');
  const [calendars, setCalendars]               = useState([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState(null);
  const [customer, setCustomer]                 = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [scheduledPosts, setScheduledPosts]     = useState([]);
  const [submissions, setSubmissions]           = useState([]);
  const [searchTerm, setSearchTerm]             = useState('');
  const [viewMode, setViewMode]                 = useState('list');

  let user = null;
  try { user = JSON.parse(localStorage.getItem('user')); } catch { user = null; }
  const customerId   = user?.id || user?._id;
  const customerName = user?.name;

  useEffect(() => {
    const fetchCustomerAndCalendars = async () => {
      setLoading(true);
      try {
        const customerRes   = await fetch(`${process.env.REACT_APP_API_URL}/customer/${customerId}`);
        const customerData  = await customerRes.json();
        setCustomer(customerData);

        const calendarsRes  = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
        const allCalendars  = await calendarsRes.json();
        const customerCalendars = allCalendars
          .filter(c => c.customerId === customerId)
          .sort((a, b) => new Date(b.createdAt || b._id || 0) - new Date(a.createdAt || a._id || 0));
        setCalendars(customerCalendars);

        const postsRes  = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
        let postsData   = await postsRes.json();
        if (!Array.isArray(postsData)) postsData = [];
        setScheduledPosts(postsData.filter(p => p.customerId === customerId));

        const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
        let submissionsData  = await submissionsRes.json();
        if (!Array.isArray(submissionsData)) submissionsData = [];
        setSubmissions(submissionsData.filter(s => s.customer_id === customerId || s.customer_email === user?.email));
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

  const hasContentSubmitted = (item) =>
    submissions.some(sub =>
      (sub.item_id && sub.item_id === item.id) ||
      (sub.assignment_id && sub.assignment_id === item.id) ||
      (sub.item_name && sub.item_name === item.title)
    );

  const isItemScheduled = (item) =>
    scheduledPosts.some(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.item_name && post.item_name === item.title)) &&
      (post.status === 'scheduled' || post.status === 'pending' || (post.scheduledDate && !post.publishedAt))
    );

  const getPublishedPlatformsForItem = (item) =>
    scheduledPosts
      .filter(post =>
        ((post.item_id && post.item_id === item.id) ||
         (post.contentId && post.contentId === item.id) ||
         (post.item_name && post.item_name === item.title)) &&
        (post.status === 'published' || post.publishedAt)
      )
      .map(post => post.platform);

  const isItemPublished = (item) =>
    scheduledPosts.some(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.item_name && post.item_name === item.title)) &&
      (post.status === 'published' || post.publishedAt)
    );

  const getItemStatus = (item) => {
    if (item.published === true) return 'published';
    if (isItemPublished(item))   return 'published';
    if (isItemScheduled(item))   return 'scheduled';
    if (hasContentSubmitted(item)) return 'under_review';
    return item.status || 'pending';
  };

  let allItems = [];
  calendars.forEach(calendar => {
    if (Array.isArray(calendar.contentItems)) {
      if (!selectedCalendarId || calendar._id === selectedCalendarId || calendar.id === selectedCalendarId) {
        calendar.contentItems.forEach(item => {
          const itemStatus = getItemStatus(item);
          const published  = item.published === true || isItemPublished(item);
          allItems.push({
            ...item,
            calendarName: calendar.name || '',
            id: item.id || item._id || Math.random().toString(36).slice(2),
            creator: item.assignedToName || item.assignedTo || calendar.assignedToName || calendar.assignedTo || '',
            status: itemStatus,
            publishedPlatforms: published ? (item.publishedPlatforms || getPublishedPlatformsForItem(item)) : [],
          });
        });
      }
    }
  });

  const filteredItems = statusFilter === 'all' ? allItems : allItems.filter(i => i.status === statusFilter);
  const sortedItems   = [...filteredItems].sort((a, b) => {
    if (statusFilter === 'all') return 0;
    if (a.status === statusFilter && b.status !== statusFilter) return -1;
    if (a.status !== statusFilter && b.status === statusFilter) return 1;
    return 0;
  });

  const stats = useMemo(() => ({
    total:       sortedItems.length,
    published:   sortedItems.filter(i => i.status === 'published').length,
    underReview: sortedItems.filter(i => i.status === 'under_review').length,
    scheduled:   sortedItems.filter(i => i.status === 'scheduled').length,
    pending:     sortedItems.filter(i => !i.status || i.status === 'pending').length,
  }), [sortedItems]);

  const displayedItems = useMemo(() => {
    if (!searchTerm.trim()) return sortedItems;
    const term = searchTerm.toLowerCase();
    return sortedItems.filter(i =>
      i.description?.toLowerCase().includes(term) ||
      i.title?.toLowerCase().includes(term) ||
      i.creator?.toLowerCase().includes(term)
    );
  }, [sortedItems, searchTerm]);

  // ─────────────────────────────────────────────────────────────
  // DOWNLOAD REPORT
  // ─────────────────────────────────────────────────────────────
  const downloadReport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const PAGE_W   = 210;
    const PAGE_H   = 297;
    const MARGIN   = 18;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    let y = 0;

    const C = {
      primary:  [79,  70, 229],
      success:  [16, 185, 129],
      warning:  [245,158,  11],
      info:     [59, 130, 246],
      neutral:  [107,114, 128],
      dark:     [17,  24,  39],
      mid:      [75,  85,  99],
      light:    [243,244, 246],
      white:    [255,255, 255],
      border:   [229,231, 235],
      bgSoft:   [248,250, 252],
    };

    const setFill   = (arr) => doc.setFillColor(...arr);
    const setStroke = (arr) => doc.setDrawColor(...arr);
    const setColor  = (arr) => doc.setTextColor(...arr);
    const setFont   = (style = 'normal', size = 10) => { doc.setFont('helvetica', style); doc.setFontSize(size); };

    const drawPageBg = () => { setFill(C.bgSoft); doc.rect(0, 0, PAGE_W, PAGE_H, 'F'); };
    const hLine = (yPos) => { setStroke(C.border); doc.setLineWidth(0.3); doc.line(MARGIN, yPos, PAGE_W - MARGIN, yPos); };

    const newPageIfNeeded = (needed = 20) => {
      if (y + needed > PAGE_H - 22) {
        doc.addPage();
        y = MARGIN;
        drawPageBg();
      }
    };

    // ── Page 1: Hero header ──────────────────────────────────
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

    const now     = new Date();
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

    // ── Stat cards ───────────────────────────────────────────
    setFont('bold', 11);
    setColor(C.dark);
    doc.text('Overview', MARGIN, y);
    y += 7;

    const cards = [
      { label: 'Total',        value: stats.total,       color: C.primary  },
      { label: 'Published',    value: stats.published,   color: C.success  },
      { label: 'Under Review', value: stats.underReview, color: C.warning  },
      { label: 'Scheduled',    value: stats.scheduled,   color: C.info     },
      { label: 'Pending',      value: stats.pending,     color: C.neutral  },
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

    // ── Progress bar ─────────────────────────────────────────
    if (stats.total > 0) {
      const pct  = stats.published / stats.total;
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

    // ── Calendar breakdown ───────────────────────────────────
    if (calendars.length > 1) {
      newPageIfNeeded(50);
      setFont('bold', 11); setColor(C.dark);
      doc.text('Calendar Breakdown', MARGIN, y); y += 7;

      calendars.forEach((cal, ci) => {
        newPageIfNeeded(14);
        const items  = cal.contentItems || [];
        const pub    = items.filter(i => getItemStatus(i) === 'published').length;
        const pend   = items.filter(i => getItemStatus(i) === 'pending').length;
        const rH     = 12;
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

    // ── Items table ──────────────────────────────────────────
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
      { key: '#',          x: MARGIN,       w: 9   },
      { key: 'Date',       x: MARGIN + 11,  w: 24  },
      { key: 'Description',x: MARGIN + 37,  w: 66  },
      { key: 'Calendar',   x: MARGIN + 105, w: 35  },
      { key: 'Platforms',  x: MARGIN + 142, w: 22  },
      { key: 'Status',     x: MARGIN + 166, w: 28  },
    ];

    // Header row
    setFill(C.light); setStroke(C.border); doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, 'FD');
    setFont('bold', 7.5); setColor(C.mid);
    cols.forEach(col => doc.text(col.key, col.x + 1, y + 5.8));
    y += 10;

    const STATUS_CFG = {
      published:    { color: C.success, label: 'Published'    },
      under_review: { color: C.warning, label: 'Under Review' },
      scheduled:    { color: C.info,    label: 'Scheduled'    },
      pending:      { color: C.neutral, label: 'Pending'      },
      draft:        { color: C.neutral, label: 'Draft'        },
    };

    displayedItems.forEach((item, idx) => {
      const rH  = 11;
      newPageIfNeeded(rH + 4);

      setFill(idx % 2 === 0 ? C.white : C.bgSoft);
      setStroke(C.border); doc.setLineWidth(0.15);
      doc.rect(MARGIN, y, CONTENT_W, rH, 'FD');

      const mid  = y + 7.5;
      const cfg  = STATUS_CFG[item.status] || STATUS_CFG.pending;

      // Index
      setFont('normal', 7.5); setColor(C.mid);
      doc.text(String(idx + 1), cols[0].x + 2, mid);

      // Date
      let dateLabel = '—';
      try { dateLabel = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }); } catch {}
      setColor(C.dark);
      doc.text(dateLabel, cols[1].x + 1, mid);

      // Description
      const rawDesc  = item.description || item.title || 'No description';
      const truncated = doc.splitTextToSize(rawDesc, cols[2].w - 2)[0] || rawDesc.substring(0, 48);
      doc.text(truncated, cols[2].x + 1, mid);

      // Calendar
      setColor(C.mid); setFont('normal', 7);
      doc.text((item.calendarName || '').substring(0, 18), cols[3].x + 1, mid);

      // Platforms
      const plats = (item.publishedPlatforms || []).join(', ').substring(0, 10) || '—';
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

    // ── Status breakdown ─────────────────────────────────────
    newPageIfNeeded(65);
    setFont('bold', 11); setColor(C.dark);
    doc.text('Status Breakdown', MARGIN, y); y += 7;

    const breakdown = [
      { label: 'Published',    count: stats.published,   color: C.success },
      { label: 'Under Review', count: stats.underReview, color: C.warning },
      { label: 'Scheduled',    count: stats.scheduled,   color: C.info    },
      { label: 'Pending',      count: stats.pending,     color: C.neutral },
    ];

    breakdown.forEach((row, i) => {
      newPageIfNeeded(14);
      const rH       = 12;
      const pctVal   = stats.total > 0 ? ((row.count / stats.total) * 100).toFixed(1) : '0.0';
      const maxBarW  = CONTENT_W - 85;
      const barFill  = stats.total > 0 ? (row.count / stats.total) * maxBarW : 0;

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

    // ── Footer on every page ──────────────────────────────────
    const total = doc.internal.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      hLine(PAGE_H - 14);
      setFont('normal', 7); setColor(C.mid);
      doc.text('Content Calendar Report  •  Confidential', MARGIN, PAGE_H - 8);
      doc.text(`Page ${p} of ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: 'right' });
    }

    doc.save(`content-calendar-report-${now.toISOString().slice(0, 10)}.pdf`);
  };
  // ─────────────────────────────────────────────────────────────

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  }
  if (!customer) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">Customer not found.</div>;
  }

  const getItemMedia = (item) => {
    if (item.submissionMedia) return { imageUrl: item.submissionMedia, imageUrls: [item.submissionMedia] };
    if (item.imageUrl)        return { imageUrl: item.imageUrl, imageUrls: item.imageUrls || [item.imageUrl] };
    if (item.thumbnail)       return { imageUrl: item.thumbnail, imageUrls: [item.thumbnail] };
    if (item.aiGeneratedImage)return { imageUrl: item.aiGeneratedImage, imageUrls: [item.aiGeneratedImage] };
    if (item.media?.length > 0) {
      const urls = item.media.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
      return { imageUrl: urls[0], imageUrls: urls };
    }
    if (item.images?.length > 0) {
      const urls = item.images.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
      return { imageUrl: urls[0], imageUrls: urls };
    }
    if (item.imageUrls?.length > 0) return { imageUrl: item.imageUrls[0], imageUrls: item.imageUrls };
    const matchingSub = submissions.find(sub =>
      (sub.item_id && sub.item_id === item.id) ||
      (sub.assignment_id && sub.assignment_id === item.id) ||
      (sub.item_name && sub.item_name === item.title)
    );
    if (matchingSub) {
      const subMedia = matchingSub.media || matchingSub.images || [];
      if (subMedia.length > 0) {
        const urls = subMedia.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
        if (urls.length > 0) return { imageUrl: urls[0], imageUrls: urls };
      }
    }
    return { imageUrl: null, imageUrls: [] };
  };

  const handleContentClick = (item) => {
    const scheduledPublishedPosts = scheduledPosts.filter(post =>
      (post.item_id && post.item_id === item.id) ||
      (post.contentId && post.contentId === item.id) ||
      (post.item_name && post.item_name === item.title)
    );
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
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Content Calendar</h1>
                <p className="text-sm text-gray-500">Manage and track your content schedule</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search content..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-gray-50 transition-all"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* View Toggle */}
              <div className="hidden sm:flex items-center bg-gray-100 rounded-lg p-1">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  <List className="h-4 w-4" />
                </button>
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>

              {/* ── DOWNLOAD REPORT BUTTON ── */}
              <button
                onClick={downloadReport}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-medium shadow-sm transition-all active:scale-95 select-none"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Download Report</span>
                <span className="sm:hidden">Report</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
          {[
            { value: stats.total,       label: 'Total Items',   icon: <FileText   className="h-5 w-5 text-gray-600"    />, from: 'from-gray-100',    to: 'to-gray-200',    text: 'text-gray-900'    },
            { value: stats.published,   label: 'Published',     icon: <CheckCircle className="h-5 w-5 text-emerald-600"/>, from: 'from-emerald-50',  to: 'to-green-100',   text: 'text-emerald-600' },
            { value: stats.underReview, label: 'Under Review',  icon: <Eye        className="h-5 w-5 text-amber-600"   />, from: 'from-amber-50',    to: 'to-yellow-100',  text: 'text-amber-600'   },
            { value: stats.scheduled,   label: 'Scheduled',     icon: <Clock      className="h-5 w-5 text-blue-600"    />, from: 'from-blue-50',     to: 'to-indigo-100',  text: 'text-blue-600'    },
            { value: stats.pending,     label: 'Pending',       icon: <Clock      className="h-5 w-5 text-gray-500"    />, from: 'from-gray-50',     to: 'to-slate-100',   text: 'text-gray-600',   hidden: true },
          ].map((s, i) => (
            <div key={i} className={`${s.hidden ? 'hidden lg:block' : ''} bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                  <p className="text-xs text-gray-500 mt-1">{s.label}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${s.from} ${s.to} flex items-center justify-center`}>
                  {s.icon}
                </div>
              </div>
            </div>
          ))}
        </div>

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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'all',          label: 'All',          count: stats.total,       color: '' },
                    { key: 'published',    label: 'Published',    count: stats.published,   color: 'emerald' },
                    { key: 'under_review', label: 'Under Review', count: stats.underReview, color: 'amber'   },
                    { key: 'scheduled',    label: 'Scheduled',    count: stats.scheduled,   color: 'blue'    },
                    { key: 'pending',      label: 'Pending',      count: stats.pending,     color: 'gray'    },
                  ].map(option => (
                    <button
                      key={option.key}
                      onClick={() => setStatusFilter(option.key)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === option.key
                          ? option.color === 'emerald' ? 'bg-emerald-600 text-white'
                          : option.color === 'amber'   ? 'bg-amber-500 text-white'
                          : option.color === 'blue'    ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${statusFilter === option.key ? 'bg-white/20' : 'bg-gray-200'}`}>{option.count}</span>
                    </button>
                  ))}
                </div>
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
                            <div className="w-full h-full flex items-center justify-center bg-gray-900"><Play className="h-10 w-10 text-white/80" /></div>
                          ) : (
                            <img src={itemMedia.imageUrl} alt="" className="w-full h-full object-cover" />
                          )
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Image className="h-10 w-10 text-gray-300" /></div>
                        )}
                        <div className="absolute top-3 left-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
                            item.status === 'published'    ? 'bg-emerald-500 text-white' :
                            item.status === 'under_review' ? 'bg-amber-500 text-white'   :
                            item.status === 'scheduled'    ? 'bg-blue-500 text-white'    : 'bg-gray-600 text-white'
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
                      </div>
                    </div>
                  ) : (
                    <div key={item.id} onClick={() => handleContentClick(item)} className={`bg-white rounded-xl border transition-all cursor-pointer group ${item.status === 'published' ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}`}>
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                          <div className="w-full sm:w-24 h-24 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex-shrink-0">
                            {itemMedia.imageUrl ? (
                              isVideoUrl(itemMedia.imageUrl) ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-900"><Play className="h-8 w-8 text-white/80" /></div>
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
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                  item.status === 'published'    ? 'bg-emerald-100 text-emerald-700' :
                                  item.status === 'under_review' ? 'bg-amber-100 text-amber-700'     :
                                  item.status === 'scheduled'    ? 'bg-blue-100 text-blue-700'        : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {item.status === 'published'    && <CheckCircle className="h-3 w-3" />}
                                  {item.status === 'scheduled'    && <Clock        className="h-3 w-3" />}
                                  {item.status === 'under_review' && <Eye          className="h-3 w-3" />}
                                  {getStatusLabel(item.status)}
                                </span>
                                <span className="text-sm text-gray-500 flex items-center gap-1.5">
                                  <CalendarIcon className="h-3.5 w-3.5" />
                                  {format(new Date(item.date), 'MMM dd, yyyy')}
                                </span>
                              </div>
                              {item.status === 'published' && (
                                <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
                                  <ExternalLink className="h-3.5 w-3.5" /><span className="font-medium">View Details</span>
                                </div>
                              )}
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
                    <div className="space-y-4">
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
                              {getDefaultPostUrl(post) && (
                                <a href={getDefaultPostUrl(post)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium">
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
                                      <div key={mi} className="relative aspect-square bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden">
                                        <Play className="h-8 w-8 text-white/80" />
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
                              <div className="mb-4 rounded-lg overflow-hidden bg-gray-900">
                                <video src={post.imageUrl} controls className="w-full max-h-72 object-contain" />
                              </div>
                            ) : post.imageUrl ? (
                              <div className="mb-4 rounded-lg overflow-hidden">
                                <img src={post.imageUrl} alt="Post content" className="w-full max-h-72 object-cover" />
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
    </div>
  );
}

export default ContentCalendar;