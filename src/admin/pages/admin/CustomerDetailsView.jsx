import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import AdminLayout from '../../components/layout/AdminLayout';
import ContentDetailView from '../../components/modals/ContentDetailView';
import ContentItemModal from '../../components/modals/ContentItemModal';
import ContentCalendarModal from '../../components/modals/ContentCalendarModal';
import AssignCreatorModal from '../../components/modals/AssignCreatorModal';
import ReportModal from '../../components/modals/ReportModal';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  Plus,
  AlertCircle,
  Building,
  Hash,
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  MoreVertical,
  Upload,
  CheckCircle,
  X,
  Clock,
  Download,
  TrendingUp,
  ArrowUpDown,
  ExternalLink,
  Heart,
  Share2,
  MessageCircle,
} from 'lucide-react';

// ── Social platform badges ───────────────────────────────────────────────────
const PLATFORM_META = {
  facebook:  { abbr: 'FB', cls: 'bg-blue-600',                                   title: 'Facebook'  },
  instagram: { abbr: 'IG', cls: 'bg-gradient-to-br from-purple-600 to-pink-500', title: 'Instagram' },
  youtube:   { abbr: 'YT', cls: 'bg-red-600',                                    title: 'YouTube'   },
  linkedin:  { abbr: 'LI', cls: 'bg-blue-800',                                   title: 'LinkedIn'  },
  twitter:   { abbr: 'TW', cls: 'bg-sky-500',                                    title: 'Twitter'   },
  x:         { abbr: 'X',  cls: 'bg-gray-900',                                   title: 'X'         },
  tiktok:    { abbr: 'TK', cls: 'bg-gray-800',                                   title: 'TikTok'    },
};

const SocialBadge = memo(({ platform }) => {
  const key = platform?.toLowerCase();
  const meta = PLATFORM_META[key] || {
    abbr: (key?.[0] || '?').toUpperCase(),
    cls: 'bg-gray-400',
    title: platform,
  };
  return (
    <span
      title={meta.title}
      className={`inline-flex items-center justify-center w-6 h-6 rounded text-white text-[10px] font-bold flex-shrink-0 ${meta.cls}`}
    >
      {meta.abbr}
    </span>
  );
});
SocialBadge.displayName = 'SocialBadge';

// ── Trend helpers ─────────────────────────────────────────────────────────────
function buildTrend(calendars, rangeMonths) {
  const allItems = calendars.flatMap(cal => cal.contentItems || []);
  const now = new Date();

  // 1M → daily buckets (last 30 days)
  if (rangeMonths === 1) {
    const buckets = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      buckets.push({ dayKey, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), published: 0, pending: 0 });
    }
    const map = Object.fromEntries(buckets.map(b => [b.dayKey, b]));
    allItems.forEach(item => {
      const key = (item.date || '').slice(0, 10);
      if (map[key]) { if (item.published) map[key].published++; else map[key].pending++; }
    });
    return buckets;
  }

  // 3M → weekly buckets (12 weeks)
  if (rangeMonths === 3) {
    const buckets = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
      const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
      const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6);
      const weekKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      buckets.push({ weekKey, weekEnd, label: weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), published: 0, pending: 0 });
    }
    allItems.forEach(item => {
      if (!item.date) return;
      const itemDate = new Date(item.date);
      for (const bucket of buckets) {
        if (itemDate >= new Date(bucket.weekKey) && itemDate <= bucket.weekEnd) {
          if (item.published) bucket.published++; else bucket.pending++;
          break;
        }
      }
    });
    return buckets;
  }

  // 6M, 1Y, All → monthly buckets (always show year)
  const buckets = [];
  for (let i = rangeMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ monthKey, label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }), published: 0, pending: 0 });
  }
  const map = Object.fromEntries(buckets.map(b => [b.monthKey, b]));
  allItems.forEach(item => {
    const key = (item.date || '').slice(0, 7);
    if (map[key]) { if (item.published) map[key].published++; else map[key].pending++; }
  });
  return buckets;
}

const RANGE_OPTIONS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: 'All', months: 24 },
];

const TrendChart = memo(({ calendars, onClose }) => {
  const [range, setRange] = useState(6);
  const data = useMemo(() => buildTrend(calendars, range), [calendars, range]);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-semibold text-gray-700">Publishing Trend</span>
        </div>
        <div className="flex items-center gap-1">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => setRange(opt.months)}
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                range === opt.months
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={onClose}
            className="ml-1 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="cdvGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="cdvAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} interval={range === 1 ? 4 : range === 3 ? 1 : 0} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}
              formatter={(value, name) => [value, name === 'published' ? 'Published' : 'Pending']}
            />
            <Area type="monotone" dataKey="published" stroke="#10b981" strokeWidth={2} fill="url(#cdvGreen)" dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="pending"   stroke="#f59e0b" strokeWidth={2} fill="url(#cdvAmber)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 bg-emerald-500 rounded-full" />
          <span className="text-xs text-gray-500">Published</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 bg-amber-500 rounded-full" />
          <span className="text-xs text-gray-500">Pending</span>
        </div>
      </div>
    </div>
  );
});
TrendChart.displayName = 'TrendChart';

// Status configuration helper
const getStatusConfig = (status) => {
  const configs = {
    published: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    approved: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    under_review: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    pending: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  };
  return configs[status] || configs.pending;
};

// Memoized info item component for performance
const InfoItem = memo(({ icon: Icon, iconBg, iconColor, label, value, mono }) => (
  <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
    <div className={`p-1.5 ${iconBg} rounded-md flex-shrink-0`}>
      <Icon className={`h-4 w-4 ${iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-gray-400 uppercase">{label}</p>
      <p className={`text-sm text-gray-900 font-medium truncate ${mono ? 'font-mono' : ''}`}>
        {value || 'N/A'}
      </p>
    </div>
  </div>
));

InfoItem.displayName = 'InfoItem';

// Memoized content item component
const ContentItemCard = memo(({ item, status, statusConfig, formatDate, onTogglePublished, onEdit, onDelete, onUpload, isPublished, calendarId, index }) => (
  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="h-9 w-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        {item.title && <p className="text-sm font-medium text-blue-800 truncate">{item.title}</p>}
        <p className="text-sm text-gray-900 truncate">{item.description || 'Untitled'}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Due: {formatDate(item.date)}
          </p>
          {item.type && (
            <>
              {(Array.isArray(item.type) ? item.type : 
                (typeof item.type === 'string' ? item.type.split(',').map(p => p.trim()) : [item.type])
              ).map((platform, idx) => (
                <span 
                  key={idx}
                  className="inline-flex px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize"
                >
                  {platform}
                </span>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
    <div className="flex items-center gap-1 ml-2">
      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} hidden sm:inline-flex`}>
        {status.replace('_', ' ')}
      </span>
      <button
        className={`p-1.5 rounded transition-colors touch-manipulation ${isPublished ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'}`}
        onClick={(e) => { e.stopPropagation(); onTogglePublished(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePublished(); }}
        title={isPublished ? 'Mark as unpublished' : 'Mark as published'}
      >
        <CheckCircle className="h-3.5 w-3.5" />
      </button>
      <button
        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors touch-manipulation"
        onClick={(e) => { e.stopPropagation(); onEdit(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}
        title="Edit"
      >
        <Edit className="h-3.5 w-3.5" />
      </button>
      <button
        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors touch-manipulation"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
      <button
        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors touch-manipulation"
        onClick={(e) => { e.stopPropagation(); onUpload(); }}
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onUpload(); }}
        title="Upload"
      >
        <Upload className="h-3.5 w-3.5" />
      </button>
    </div>
  </div>
));
ContentItemCard.displayName = 'ContentItemCard';

// Platform logo icon component
const PlatformIcon = ({ platform }) => {
  const p = (platform || '').toLowerCase().trim();
  if (p === 'facebook') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#1877F2" aria-label="Facebook">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
  if (p === 'instagram') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#E1306C" aria-label="Instagram">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
  if (p === 'linkedin') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#0A66C2" aria-label="LinkedIn">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
  if (p === 'youtube') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#FF0000" aria-label="YouTube">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
  if (p === 'twitter' || p === 'x') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#000000" aria-label="X (Twitter)">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
  return <span className="text-[10px] font-medium text-gray-600 capitalize">{platform}</span>;
};

// Timeline component showing item lifecycle stages with dates
const ItemTimeline = ({ item, itemStatus, scheduledPosts = [], submissions = [] }) => {
  const isAssigned = !!item.assignedTo || ['assigned', 'in_progress', 'under_review', 'approved', 'published'].includes(itemStatus);
  // Review is completed when the item is approved/published OR any linked submission has been approved
  const isReviewed = ['approved', 'published'].includes(itemStatus) || submissions.some(s => s.status === 'approved');
  const isPublished = itemStatus === 'published';
  const isDue = isPublished || (item.date && new Date(item.date) <= new Date());

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

  // Version steps — one node per submission, shown between Due and Reviewed
  const versionSteps = submissions.map((s, idx) => ({
    key: `v${idx + 1}`,
    label: `V${idx + 1}`,
    done: true,
    date: fmtDate(s.created_at || s.createdAt),
  }));

  // Derive review date from the approved submission if not stored on item
  const approvedSub = submissions.find(s => s.status === 'approved');
  const reviewedDate = fmtDate(item.reviewedAt || approvedSub?.approvedAt || approvedSub?.updatedAt);

  // Order: Created → Assigned → Due → V1 → V2 → ... → Reviewed → Published
  const steps = [
    { key: 'created',   label: 'Created',   done: true,        date: fmtDate(item.createdAt) },
    { key: 'assigned',  label: 'Assigned',   done: isAssigned,  date: fmtDate(item.assignedAt) },
    { key: 'due',       label: 'Due',        done: isDue,       date: fmtDate(item.date) },
    ...versionSteps,
    { key: 'reviewed',  label: 'Reviewed',   done: isReviewed,  date: reviewedDate },
    { key: 'published', label: 'Published',  done: isPublished, date: fmtDate(matchedPost?.publishedAt || item.publishedAt) },
  ];

  return (
    <div className="flex items-start mt-2 overflow-x-auto pb-0.5">
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${step.done ? 'bg-emerald-500' : 'bg-gray-200'}`} />
            <span className={`text-[9px] leading-none mt-0.5 whitespace-nowrap ${step.done ? 'text-emerald-600 font-medium' : 'text-gray-400'}`}>
              {step.label}
            </span>
            <span className={`text-[8px] leading-none mt-0.5 whitespace-nowrap ${step.date ? (step.done ? 'text-emerald-500' : 'text-gray-300') : 'text-transparent select-none'}`}>
              {step.date || '—'}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-px mt-1 mx-0.5 ${step.done && steps[idx + 1].done ? 'bg-emerald-400' : 'bg-gray-200'}`}
              style={{ minWidth: '8px' }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

// Trend button shown on published items — triggers per-post analytics fetch on click
const PostTrendButton = memo(({ isLoading, isActive, onClick }) => (
  <button
    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors flex-shrink-0 ${
      isActive
        ? 'bg-blue-100 border-blue-300 text-blue-700'
        : 'bg-blue-50 hover:bg-blue-100 border-blue-100 text-blue-600'
    }`}
    onClick={onClick}
    title="View post engagement trend"
  >
    {isLoading
      ? <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      : <TrendingUp className="h-3 w-3" />
    }
    <span className="text-[10px] font-medium hidden sm:inline">Trend</span>
  </button>
));
PostTrendButton.displayName = 'PostTrendButton';

// Helper to combine per-platform trend data by date
const getCombinedTrendData = (platformData) => {
  if (!platformData || typeof platformData !== 'object') return [];
  const byDate = {};
  Object.values(platformData).forEach(arr => {
    (arr || []).forEach(d => {
      if (!byDate[d.date]) byDate[d.date] = { date: d.date, likes: 0, comments: 0, shares: 0 };
      byDate[d.date].likes += d.likes || 0;
      byDate[d.date].comments += d.comments || 0;
      byDate[d.date].shares += d.shares || 0;
    });
  });
  return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
};

// Mini sparkline trend charts shown inline on published calendar items
const MiniTrendCharts = memo(({ platformData }) => {
  const combined = getCombinedTrendData(platformData).slice(-14);
  if (!combined.length) return null;
  const metrics = [
    { key: 'likes', color: '#EF4444', Icon: Heart, label: 'Likes' },
    { key: 'comments', color: '#3B82F6', Icon: MessageCircle, label: 'Comments' },
    { key: 'shares', color: '#22C55E', Icon: Share2, label: 'Shares' },
  ];
  return (
    <div className="flex items-center gap-3 mt-1.5">
      {metrics.map(m => {
        const total = combined.length > 0 ? (combined[combined.length - 1][m.key] || 0) : 0;
        return (
          <div key={m.key} className="flex items-center gap-1">
            <m.Icon className="h-2.5 w-2.5 flex-shrink-0" style={{ color: m.color }} />
            <div className="w-14 h-5">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={combined}>
                  <Line type="monotone" dataKey={m.key} stroke={m.color} strokeWidth={1} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <span className="text-[9px] text-gray-500 tabular-nums">{total}</span>
          </div>
        );
      })}
    </div>
  );
});
MiniTrendCharts.displayName = 'MiniTrendCharts';

// Expanded per-post trend chart with date range selector — per platform
const ExpandedTrendChart = memo(({ platformData, dateRange, onDateRangeChange, onClose }) => {
  const ranges = [
    { label: '7D', value: 7 },
    { label: '14D', value: 14 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
  ];
  const platforms = Object.keys(platformData || {});
  const hasData = platforms.some(p => (platformData[p] || []).length > 0);
  const gridClass = platforms.length >= 3 ? 'grid grid-cols-1 sm:grid-cols-3 gap-3'
    : platforms.length === 2 ? 'grid grid-cols-1 sm:grid-cols-2 gap-3'
    : '';

  return (
    <div className="mt-3 bg-blue-50/50 rounded-lg border border-blue-100 p-3" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-700">Post Engagement Trend</span>
          <div className="flex gap-1">
            {ranges.map(r => (
              <button
                key={r.value}
                onClick={() => onDateRangeChange(r.value)}
                className={`px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors ${
                  dateRange === r.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {!hasData && platforms.length === 0 ? (
        <div className="h-24 flex items-center justify-center">
          <p className="text-xs text-gray-400">No analytics snapshots found for this post yet.</p>
        </div>
      ) : (
        <div className={gridClass}>
          {platforms.map(platform => {
            const data = (platformData[platform] || []).slice(-dateRange);
            const totalLikes    = data.length > 0 ? (data[data.length - 1].likes    || 0) : 0;
            const totalComments = data.length > 0 ? (data[data.length - 1].comments || 0) : 0;
            const totalShares   = data.length > 0 ? (data[data.length - 1].shares   || 0) : 0;
            return (
              <div key={platform} className="bg-white rounded-lg border border-gray-100 p-2.5">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <PlatformIcon platform={platform} />
                  <span className="text-[10px] font-semibold text-gray-700 capitalize">{platform}</span>
                </div>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="flex items-center gap-1 text-[10px] text-gray-600"><Heart className="h-2.5 w-2.5 text-red-500" />{totalLikes.toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-600"><MessageCircle className="h-2.5 w-2.5 text-blue-500" />{totalComments.toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-600"><Share2 className="h-2.5 w-2.5 text-green-500" />{totalShares.toLocaleString()}</span>
                </div>
                {data.length === 0 ? (
                  <div className="h-20 flex items-center justify-center">
                    <p className="text-[10px] text-gray-400">No data yet</p>
                  </div>
                ) : (
                  <div className="h-24 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 8 }}
                          tickFormatter={v => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }}
                          stroke="#9CA3AF"
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #e5e7eb' }}
                          labelFormatter={v => new Date(v).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                        />
                        <Line type="monotone" dataKey="likes"    stroke="#EF4444" strokeWidth={1.5} dot={false} name="Likes" />
                        <Line type="monotone" dataKey="comments" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="Comments" />
                        <Line type="monotone" dataKey="shares"   stroke="#22C55E" strokeWidth={1.5} dot={false} name="Shares" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});
ExpandedTrendChart.displayName = 'ExpandedTrendChart';

function CustomerDetailsView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [creators, setCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditCalendarModalOpen, setIsEditCalendarModalOpen] = useState(false);
  const [calendarToEdit, setCalendarToEdit] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedCalendars, setExpandedCalendars] = useState(new Set());
  const [mobileMenuCalendar, setMobileMenuCalendar] = useState(null);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [showTrend, setShowTrend] = useState(false);
  const [itemSortOrder, setItemSortOrder] = useState('desc');
  // Per-post trend cache: itemKey → {platform: [...]} | null (loading) | undefined (not fetched)
  const [postTrendCache, setPostTrendCache] = useState({});
  const fetchedTrendItemsRef = useRef(new Set());
  const [expandedTrendItem, setExpandedTrendItem] = useState(null);
  const [trendDateRange, setTrendDateRange] = useState(7);
  const [selectedContentDetail, setSelectedContentDetail] = useState(null);
  const [contentDetailLoading, setContentDetailLoading] = useState(false);
  // All content submissions fetched once — used for version nodes in timeline
  const [allSubmissions, setAllSubmissions] = useState([]);

  const API_URL = process.env.REACT_APP_API_URL;

  // Memoize format functions
  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' HH:mm");
    } catch {
      return 'Invalid';
    }
  }, []);

  const formatSimpleDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return 'Invalid';
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchCustomer();
      fetchCalendars();
      fetchCreators();
      fetchScheduledPosts();
      fetchSocialAccounts();
      fetchSubmissions();
    }
  }, [id]);

  const fetchCustomer = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/customer/${id}`);
      if (!response.ok) throw new Error('Failed to fetch customer');
      const data = await response.json();
      setCustomer(data);
    } catch (err) {
      setError('Failed to load customer details');
      console.error('Error fetching customer:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendars = async () => {
    try {
      const response = await fetch(`${API_URL}/calendars`);
      if (!response.ok) throw new Error('Failed to fetch calendars');
      const allCalendars = await response.json();
      
      // Filter calendars for this customer
      const customerCalendars = allCalendars.filter(calendar => calendar.customerId === id);
      setCalendars(customerCalendars);
    } catch (err) {
      console.error('Error fetching calendars:', err);
      setCalendars([]);
    }
  };

  // Fetch content creators for dropdown
  const fetchCreators = async () => {
    try {
      const response = await fetch(`${API_URL}/users?role=content_creator`);
      if (!response.ok) throw new Error('Failed to fetch content creators');
      const data = await response.json();
      setCreators(Array.isArray(data) ? data : (data.creators || []));
    } catch (err) {
      setCreators([]);
    }
  };

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scheduled-posts`);
      if (response.ok) {
        const data = await response.json();
        setScheduledPosts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      setScheduledPosts([]);
    }
  };

  const fetchSocialAccounts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/customer-social-links/${encodeURIComponent(id)}`);
      if (response.ok) {
        const data = await response.json();
        setSocialAccounts(data.accounts || []);
      }
    } catch {
      setSocialAccounts([]);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/content-submissions`);
      if (response.ok) {
        const data = await response.json();
        setAllSubmissions(Array.isArray(data) ? data : []);
      }
    } catch {
      setAllSubmissions([]);
    }
  };

  // Fetch per-post trend data from analytics snapshots (on-demand, cached by itemKey, per-platform)
  const fetchPostTrend = useCallback(async (itemKey, item) => {
    if (fetchedTrendItemsRef.current.has(itemKey)) return;
    fetchedTrendItemsRef.current.add(itemKey);
    setPostTrendCache(prev => ({ ...prev, [itemKey]: null }));

    const itemPlatforms = item.type
      ? (Array.isArray(item.type) ? item.type : (typeof item.type === 'string' ? item.type.split(',').map(p => p.trim()) : []))
      : [];
    const platformResult = {};
    itemPlatforms.forEach(p => { platformResult[p.toLowerCase()] = []; });

    const matchedPosts = scheduledPosts.filter(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.item_name && post.item_name === (item.title || item.description))) &&
      (post.status === 'published' || post.publishedAt)
    );

    for (const matchedPost of matchedPosts) {
      // ── Instagram ──────────────────────────────────────────────────────────
      const instagramId = matchedPost?.instagramId;
      const postMediaId = matchedPost?.instagramPostId;
      if (instagramId && postMediaId) {
        try {
          const res = await fetch(`${API_URL}/api/analytics/data?platform=instagram&accountId=${encodeURIComponent(instagramId)}`);
          if (res.ok) {
            const json = await res.json();
            const allDocs = Array.isArray(json) ? json : (json.docs || json.data || []);
            const snapshots = allDocs
              .filter(doc => doc.type === 'analytics_data' && doc.platform === 'instagram' && (doc.accountId === instagramId || doc.instagramId === instagramId))
              .sort((a, b) => new Date(a.collectedAt) - new Date(b.collectedAt));
            const dataByDate = {};
            snapshots.forEach(snap => {
              const found = (snap.media || []).find(m => m.id === postMediaId || m.id === String(postMediaId));
              if (found) {
                const date = snap.collectedAt.slice(0, 10);
                dataByDate[date] = { date, likes: found.likes ?? found.like_count ?? 0, comments: found.comments ?? found.comments_count ?? 0, shares: found.shares ?? 0 };
              }
            });
            platformResult['instagram'] = Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));
          }
        } catch { /* skip */ }
      }

      // ── Facebook ───────────────────────────────────────────────────────────
      const fbPostId = matchedPost?.facebookPostId;
      if (fbPostId && !fbPostId.startsWith('fb_shared_from_')) {
        const fbAccountId = matchedPost?.pageId || fbPostId.split('_')[0];
        try {
          const res = await fetch(`${API_URL}/api/analytics/data?platform=facebook&accountId=${encodeURIComponent(fbAccountId)}`);
          if (res.ok) {
            const json = await res.json();
            const allDocs = Array.isArray(json) ? json : (json.docs || json.data || []);
            const snapshots = allDocs
              .filter(doc => doc.type === 'analytics_data' && doc.platform === 'facebook')
              .sort((a, b) => new Date(a.collectedAt) - new Date(b.collectedAt));
            const dataByDate = {};
            snapshots.forEach(snap => {
              const found = (snap.posts || []).find(p => p.id === fbPostId || p.id === String(fbPostId));
              if (found) {
                const date = snap.collectedAt.slice(0, 10);
                dataByDate[date] = { date, likes: found.likes ?? found.reactionsTotal ?? 0, comments: found.comments ?? 0, shares: found.shares ?? 0 };
              }
            });
            platformResult['facebook'] = Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));
          }
        } catch { /* skip */ }
      }

      // ── LinkedIn ───────────────────────────────────────────────────────────
      const liPostId = matchedPost?.linkedinPostId;
      if (liPostId) {
        const liAccountId = matchedPost?.linkedinAccountId || matchedPost?.organizationId;
        const liQuery = liAccountId
          ? `platform=linkedin&accountId=${encodeURIComponent(liAccountId)}`
          : `platform=linkedin&customerId=${encodeURIComponent(id)}`;
        try {
          const res = await fetch(`${API_URL}/api/analytics/data?${liQuery}`);
          if (res.ok) {
            const json = await res.json();
            const allDocs = Array.isArray(json) ? json : (json.docs || json.data || []);
            const snapshots = allDocs
              .filter(doc => doc.type === 'analytics_data' && doc.platform === 'linkedin')
              .sort((a, b) => new Date(a.collectedAt) - new Date(b.collectedAt));
            const dataByDate = {};
            snapshots.forEach(snap => {
              const found = (snap.posts || []).find(p => p.id === liPostId || p.id === String(liPostId));
              if (found) {
                const date = snap.collectedAt.slice(0, 10);
                dataByDate[date] = { date, likes: found.likes ?? 0, comments: found.comments ?? 0, shares: found.shares ?? 0 };
              }
            });
            platformResult['linkedin'] = Object.values(dataByDate).sort((a, b) => a.date.localeCompare(b.date));
          }
        } catch { /* skip */ }
      }
    }

    setPostTrendCache(prev => ({ ...prev, [itemKey]: platformResult }));
  }, [scheduledPosts, id]);

  // Auto-fetch trend data for published items in expanded calendars (for mini charts)
  useEffect(() => {
    if (scheduledPosts.length === 0) return;
    expandedCalendars.forEach(calId => {
      const cal = calendars.find(c => c._id === calId);
      if (!cal?.contentItems) return;
      cal.contentItems.forEach((item, index) => {
        if (isItemPublished(item)) {
          const itemKey = item.id || `${cal._id}_${index}`;
          fetchPostTrend(itemKey, item);
        }
      });
    });
  }, [expandedCalendars, calendars, scheduledPosts, fetchPostTrend]);

  const socialPlatforms = useMemo(() => (
    [...new Set(socialAccounts.map(a => a.platform?.toLowerCase()).filter(Boolean))]
  ), [socialAccounts]);

  // Check if item is published (manual or via scheduled post)
  const isItemPublished = useCallback((item) => {
    // Check manual publish flag
    if (item.published === true) return true;
    // Check scheduled posts
    return scheduledPosts.some(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.item_name && post.item_name === (item.title || item.description))) &&
      (post.status === 'published' || post.publishedAt)
    );
  }, [scheduledPosts]);

  // Check if all items in a calendar are published
  const isCalendarPublished = useCallback((calendar) => {
    if (!calendar.contentItems || calendar.contentItems.length === 0) return false;
    return calendar.contentItems.every(item => isItemPublished(item));
  }, [isItemPublished]);

  // Get item status with published check
  const getItemStatus = useCallback((item) => {
    if (isItemPublished(item)) return 'published';
    return item.status || 'pending';
  }, [isItemPublished]);

  // Get published count for a calendar
  const getCalendarStats = useCallback((calendar) => {
    const total = calendar.contentItems?.length || 0;
    const published = calendar.contentItems?.filter(item => isItemPublished(item)).length || 0;
    const progressPercent = total > 0 ? Math.round((published / total) * 100) : 0;
    return { total, published, progressPercent };
  }, [isItemPublished]);

  // Overall stats for all calendars
  const overallStats = useMemo(() => {
    let totalItems = 0, publishedItems = 0;
    calendars.forEach(cal => {
      cal.contentItems?.forEach(item => {
        totalItems++;
        if (isItemPublished(item)) publishedItems++;
      });
    });
    return { 
      totalCalendars: calendars.length,
      totalItems, 
      publishedItems, 
      pendingItems: totalItems - publishedItems,
      completionRate: totalItems > 0 ? Math.round((publishedItems / totalItems) * 100) : 0
    };
  }, [calendars, isItemPublished]);

  const handleCreateCalendar = async (calendarData) => {
    try {
      const response = await fetch(`${API_URL}/calendars`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: id,
          name: calendarData.name,
          description: calendarData.description,
          assignedTo: calendarData.assignedTo,
          contentItems: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to create calendar');
      fetchCalendars();
    } catch (err) {
      console.error('Error creating calendar:', err);
    }
  };

  const handleAddContentItem = async (item) => {
    if (!selectedCalendar) return;

    try {
      // Try to fetch by _id, fallback to customerId if not found
      let calendar = null;
      let calendarRes = await fetch(`${API_URL}/calendars/${selectedCalendar._id}`);
      if (calendarRes.ok) {
        calendar = await calendarRes.json();
      } else {
        // fallback: try to fetch all calendars for this customer and find by _id
        const allRes = await fetch(`${API_URL}/calendars`);
        if (allRes.ok) {
          const allCalendars = await allRes.json();
          calendar = allCalendars.find(c => c._id === selectedCalendar._id);
        }
      }
      if (!calendar || !calendar._id) {
        throw new Error('Calendar not found');
      }

      const now = new Date().toISOString();
      const itemWithTimestamp = {
        ...item,
        createdAt: item.createdAt || now,
        assignedAt: item.assignedAt || (item.assignedTo ? now : undefined),
      };
      const updatedContentItems = [...(calendar.contentItems || []), itemWithTimestamp];

      const response = await fetch(`${API_URL}/calendars/${calendar._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calendar,
          contentItems: updatedContentItems,
          updatedAt: now
        })
      });

      if (!response.ok) throw new Error('Failed to add content item');
      fetchCalendars();
    } catch (err) {
      console.error('Error adding content item:', err);
    }
  };

  const handleAssignCreator = async (creator) => {
    if (!selectedCalendar) return;

    try {
      const calendar = calendars.find(c => c._id === selectedCalendar._id);
      
      const response = await fetch(`${API_URL}/calendars/${selectedCalendar._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calendar,
          assignedTo: creator.email,
          assignedToName: creator.name,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to assign creator');
      fetchCalendars();
    } catch (err) {
      console.error('Error assigning creator:', err);
    }
  };

  const toggleCalendarExpansion = (calendarId) => {
    const newExpanded = new Set(expandedCalendars);
    if (newExpanded.has(calendarId)) {
      newExpanded.delete(calendarId);
    } else {
      newExpanded.add(calendarId);
    }
    setExpandedCalendars(newExpanded);
  };

  // Mobile menu handlers
  const openMobileMenu = useCallback((calendar) => {
    setMobileMenuCalendar(calendar);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuCalendar(null);
  }, []);

  // Edit content item handler
  const handleEditItem = (item, calendarId) => {
    setSelectedItem({
      ...item,
      _calendarId: calendarId,
      originalDate: item.date,
      originalDescription: item.description
    });
    setIsEditModalOpen(true);
  };

  // Update content item handler
  const handleUpdateItem = async (updatedItem) => {
    try {
      const {
        _calendarId,
        date,
        description,
        originalDate,
        originalDescription,
        type,
        status,
        title,
        assignedTo,
        assignedToName
      } = updatedItem;

      if (!_calendarId || !originalDate || !originalDescription) return;

      // Fetch the latest calendar to get all items
      const calendarRes = await fetch(`${API_URL}/calendars/${_calendarId}`);
      let calendar = null;
      if (calendarRes.ok) {
        calendar = await calendarRes.json();
      } else {
        // fallback: try to fetch all calendars and find by _id
        const allRes = await fetch(`${API_URL}/calendars`);
        if (allRes.ok) {
          const allCalendars = await allRes.json();
          calendar = allCalendars.find(c => c._id === _calendarId);
        }
      }
      if (!calendar || !calendar._id) {
        throw new Error('Calendar not found');
      }

      // Find and update the content item in the array
      const updatedContentItems = (calendar.contentItems || []).map(item => {
        if (
          item.date === originalDate &&
          item.description === originalDescription
        ) {
          const newAssignedTo = assignedTo !== undefined ? assignedTo : item.assignedTo;
          return {
            ...item,
            date,
            description,
            type: type !== undefined ? type : item.type,
            status: status !== undefined ? status : item.status,
            title: title !== undefined ? title : item.title,
            assignedTo: newAssignedTo,
            assignedToName: assignedToName !== undefined ? assignedToName : item.assignedToName,
            assignedAt: item.assignedAt || (newAssignedTo && !item.assignedAt ? new Date().toISOString() : undefined),
          }; 
        }
        return item;
      });

      const response = await fetch(`${API_URL}/calendars/${calendar._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calendar,
          contentItems: updatedContentItems,
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to update item');
      fetchCalendars();
    } catch (err) {
      // handle error
    } finally {
      setIsEditModalOpen(false);
    }
  };

  // Delete content item handler
  const handleDeleteItem = async (calendarId, item) => {
    if (!window.confirm('Are you sure you want to delete this content item?')) return;
    try {
      const description = item.description;
      const date = item.date;
      const url = `${API_URL}/calendars/item/${calendarId}/${date}/${encodeURIComponent(description)}`;
      const response = await fetch(url, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete item');
      fetchCalendars();
    } catch (err) {
      // handle error
    }
  };

  // Edit calendar handler (prefill values)
  const handleEditCalendar = (calendar) => {
    setCalendarToEdit(calendar);
    setIsEditCalendarModalOpen(true);
    setMobileMenuCalendar(null);
  };

  // Update calendar handler
  const handleUpdateCalendar = async (updatedCalendarData) => {
    try {
      const response = await fetch(`${API_URL}/calendars/${calendarToEdit._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...calendarToEdit,
          ...updatedCalendarData,
          updatedAt: new Date().toISOString()
        })
      });
      if (!response.ok) throw new Error('Failed to update calendar');
      fetchCalendars();
    } catch (err) {
      // handle error
    } finally {
      setIsEditCalendarModalOpen(false);
      setCalendarToEdit(null);
    }
  };

  // Delete calendar handler (fix: use DELETE method and refresh)
  const handleDeleteCalendar = async (calendarId) => {
    if (!window.confirm('Are you sure you want to delete this content calendar?')) return;
    try {
      const response = await fetch(`${API_URL}/calendars/${calendarId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete calendar');
      fetchCalendars();
    } catch (err) {
      // handle error
    }
    setMobileMenuCalendar(null);
  };

  // Toggle published status of a content item
  const handleTogglePublished = async (calendarId, item) => {
    const newPublishedState = !item.published;
    try {
      const response = await fetch(`${API_URL}/calendars/item/${calendarId}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          published: newPublishedState,
          publishedAt: newPublishedState ? new Date().toISOString() : null,
          publishedPlatforms: item.platforms || item.type || []
        })
      });
      if (!response.ok) throw new Error('Failed to update publish status');
      fetchCalendars();
    } catch (err) {
      console.error('Error toggling publish status:', err);
    }
  };

  // Find the matching scheduled post(s) for a calendar item and build platform links
  const getItemPublishedLinks = useCallback((item) => {
    const links = [];
    if (item.postUrl) {
      links.push({ url: item.postUrl, label: 'View Post', platform: null });
    }
    for (const post of scheduledPosts) {
      const matches =
        (post.item_id && post.item_id === item.id) ||
        (post.contentId && post.contentId === item.id) ||
        (post.item_name && post.item_name === (item.title || item.description));
      if (!matches || !(post.status === 'published' || post.publishedAt)) continue;
      if (post.facebookPostId && !post.facebookPostId.startsWith('fb_shared_from_')) {
        const fbId = post.facebookPostId;
        const fbUrl = fbId.includes('_')
          ? `https://www.facebook.com/permalink.php?story_fbid=${fbId.split('_')[1]}&id=${fbId.split('_')[0]}`
          : `https://www.facebook.com/${fbId}`;
        if (!links.find(l => l.url === fbUrl)) links.push({ url: fbUrl, label: 'Facebook', platform: 'facebook' });
      }
      if (post.instagramPermalink) {
        if (!links.find(l => l.url === post.instagramPermalink)) links.push({ url: post.instagramPermalink, label: 'Instagram', platform: 'instagram' });
      }
      if (post.youtubePostId) {
        const ytUrl = `https://www.youtube.com/watch?v=${post.youtubePostId}`;
        if (!links.find(l => l.url === ytUrl)) links.push({ url: ytUrl, label: 'YouTube', platform: 'youtube' });
      }
      if (post.linkedinPostId) {
        const liUrl = `https://www.linkedin.com/feed/update/${post.linkedinPostId}`;
        if (!links.find(l => l.url === liUrl)) links.push({ url: liUrl, label: 'LinkedIn', platform: 'linkedin' });
      }
    }
    return links;
  }, [scheduledPosts]);

  const getCustomerName = useCallback(() => customer?.name || '', [customer]);

  const isContentPublished = useCallback((contentId, item = null) => {
    if (item && item.published === true) return true;
    return scheduledPosts.some(post => {
      if (post.status !== 'published') return false;
      if (post.contentId === contentId) return true;
      if (post.item_id === contentId) return true;
      if (item?.versions?.some(v => post.contentId === v.id)) return true;
      return false;
    });
  }, [scheduledPosts]);

  const getPublishedPlatformsForContent = useCallback((contentId, item = null) => {
    const manualPlatforms = (item && item.publishedPlatforms) ? item.publishedPlatforms : [];
    const scheduledPlatformsArr = scheduledPosts
      .filter(post => {
        if (post.status !== 'published') return false;
        if (post.contentId === contentId) return true;
        if (post.item_id === contentId) return true;
        if (item?.versions?.some(v => post.contentId === v.id)) return true;
        return false;
      })
      .map(post => post.platform);
    return [...new Set([...manualPlatforms, ...scheduledPlatformsArr])];
  }, [scheduledPosts]);

  const handleScheduleContent = useCallback(() => {
    navigate('/admin/content-portfolio');
  }, [navigate]);

  const handleDeleteVersion = useCallback(async (versionId, portfolioId) => {
    try {
      await fetch(`${API_URL}/api/content-submissions/${versionId}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete version', err);
    }
    setSelectedContentDetail(prev => {
      if (!prev || prev.id !== portfolioId) return prev;
      const newVersions = prev.versions.filter(v => v.id !== versionId);
      return { ...prev, versions: newVersions, totalVersions: newVersions.length };
    });
  }, []);

  const openContentDetail = useCallback(async (item, calendar) => {
    setContentDetailLoading(true);
    setSelectedContentDetail({ _loading: true });
    try {
      const res = await fetch(`${API_URL}/api/content-submissions`);
      if (res.ok) {
        const submissionsData = await res.json();
        const allSubmissions = Array.isArray(submissionsData) ? submissionsData : [];
        const itemId = item.id;
        const itemTitle = item.title || item.description;
        const matching = allSubmissions
          .filter(s =>
            (s.assignment_id && s.assignment_id === itemId) ||
            (s.item_name && s.item_name === itemTitle) ||
            (s.item_id && s.item_id === itemId)
          )
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        const normalizeMedia = (media) => {
          if (!Array.isArray(media)) return [];
          return media.map(m => {
            if (typeof m === 'string') return { url: m, type: /\.(mp4|webm|ogg|mov|avi)$/i.test(m) ? 'video' : 'image' };
            return m;
          });
        };
        setSelectedContentDetail({
          id: itemId,
          customerId: calendar.customerId || id,
          title: (matching[0]?.caption) || item.title || '',
          description: (matching[0]?.notes) || item.description || '',
          platform: item.type || (matching[0]?.platform) || '',
          status: (matching[matching.length - 1]?.status) || item.status || 'pending',
          published: item.published === true,
          publishedPlatforms: item.publishedPlatforms || [],
          totalVersions: matching.length,
          versions: matching.map((s, idx) => ({
            id: s._id,
            assignment_id: s.assignment_id,
            versionNumber: idx + 1,
            media: normalizeMedia(s.media || s.images || []),
            caption: s.caption || '',
            hashtags: s.hashtags || '',
            notes: s.notes || '',
            createdAt: s.created_at,
            status: s.status || 'submitted',
            comments: s.comments || [],
          })),
          calendarName: calendar.name || '',
          itemName: item.title || item.description || '',
        });
      }
    } catch (err) {
      console.error('Error fetching content submissions', err);
      setSelectedContentDetail(null);
    } finally {
      setContentDetailLoading(false);
    }
  }, [id]);

  const getPriorityColor = useCallback((priority) => {
    switch ((priority || '').toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }, []);

  const isVideoUrl = useCallback((url) => {
    if (!url) return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
  }, []);

  if (loading) {
    return (
      <AdminLayout title="Customer Details">
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-gray-500 text-base">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !customer) {
    return (
      <AdminLayout title="Customer Details">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 max-w-sm mx-auto mt-10">
          <div className="text-center">
            <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Not Found</h3>
            <p className="text-base text-gray-600 mb-4">{error || "Customer doesn't exist."}</p>
            <button
              onClick={() => navigate('/admin/customers-list')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${customer.name || 'Customer'} - Details`}>
      <div className="space-y-3 sm:space-y-4">
        {/* Header - Compact */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/admin/customers-list')}
              className="mr-2 p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {(customer.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0 flex-1">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{customer.name || 'Customer'}</h2>
              <p className="text-sm text-gray-500 truncate">{customer.email}</p>
              {socialPlatforms.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {socialPlatforms.map(p => <SocialBadge key={p} platform={p} />)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Customer Info - Side by Side Grid on Mobile */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Customer Information</h3>
          
          {/* 2-Column Grid for Mobile */}
          <div className="grid grid-cols-2 gap-2">
            {/* Personal Details */}
            <InfoItem icon={User} iconBg="bg-blue-100" iconColor="text-blue-600" label="Name" value={customer.name} />
            <InfoItem icon={Mail} iconBg="bg-green-100" iconColor="text-green-600" label="Email" value={customer.email} />
            <InfoItem icon={Phone} iconBg="bg-purple-100" iconColor="text-purple-600" label="Mobile" value={customer.mobile} />
            <InfoItem icon={MapPin} iconBg="bg-orange-100" iconColor="text-orange-600" label="Address" value={customer.address} />
            
            {/* Business Details */}
            <InfoItem icon={FileText} iconBg="bg-indigo-100" iconColor="text-indigo-600" label="GST" value={customer.gstNumber} />
            <InfoItem icon={Building} iconBg="bg-pink-100" iconColor="text-pink-600" label="Role" value={customer.role} />
            <InfoItem icon={Hash} iconBg="bg-yellow-100" iconColor="text-yellow-600" label="ID" value={customer._id} mono />
            <InfoItem icon={Calendar} iconBg="bg-teal-100" iconColor="text-teal-600" label="Registered" value={formatDate(customer.createdAt)} />
          </div>
        </div>

        {/* Content Calendars Section */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {/* Header with Stats */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Content Calendars</h2>
                <p className="text-sm text-gray-500 mt-0.5">Manage content schedule and items</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowTrend(v => !v)}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    showTrend
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  <TrendingUp className="h-4 w-4 mr-1.5" />
                  Trend
                </button>
                <button
                  onClick={() => setIsReportModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download Report
                </button>
                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Calendar
                </button>
              </div>
            </div>
            
            {/* Stats Grid */}
            {calendars.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-semibold text-gray-900 tabular-nums">{overallStats.totalCalendars}</div>
                      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Calendars</div>
                    </div>
                    <Calendar className="h-6 w-6 text-gray-400" />
                  </div>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-semibold text-blue-700 tabular-nums">{overallStats.totalItems}</div>
                      <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Items</div>
                    </div>
                    <FileText className="h-6 w-6 text-blue-500" />
                  </div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-semibold text-emerald-700 tabular-nums">{overallStats.publishedItems}</div>
                      <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Published</div>
                    </div>
                    <CheckCircle className="h-6 w-6 text-emerald-500" />
                  </div>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xl font-semibold text-amber-700 tabular-nums">{overallStats.pendingItems}</div>
                      <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Pending</div>
                    </div>
                    <Clock className="h-6 w-6 text-amber-500" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Trend chart */}
          {showTrend && calendars.length > 0 && (
            <div className="px-4 sm:px-6 pb-4">
              <TrendChart calendars={calendars} onClose={() => setShowTrend(false)} />
            </div>
          )}

          <div className="p-4 sm:p-5">
            {calendars.length > 0 ? (
              <div className="space-y-3">
                {calendars.map((calendar) => {
                  const calStats = getCalendarStats(calendar);
                  return (
                    <div key={calendar._id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                      {/* Calendar Header */}
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-100/50 transition-colors"
                        onClick={() => toggleCalendarExpansion(calendar._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-gray-900 truncate">{calendar.name}</h4>
                                {isCalendarPublished(calendar) && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Complete
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-gray-500">{calStats.total} items</span>
                                {calendar.assignedTo && (
                                  <span className="text-xs text-gray-500 truncate">
                                    Assigned: {calendar.assignedToName || calendar.assignedTo}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress & Actions */}
                          <div className="flex items-center gap-3 ml-3">
                            {/* Progress Bar - Desktop */}
                            <div className="hidden sm:flex items-center gap-2">
                              <span className="text-xs text-gray-600 tabular-nums min-w-[40px] text-right">
                                {calStats.published}/{calStats.total}
                              </span>
                              <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${calStats.progressPercent}%` }}
                                />
                              </div>
                            </div>
                            
                            {/* Desktop Actions */}
                            <div className="hidden sm:flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedCalendar(calendar); setIsContentModalOpen(true); }}
                                className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                title="Add Item"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEditCalendar(calendar); }}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteCalendar(calendar._id); }}
                                className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Mobile Menu Button */}
                            <div className="sm:hidden">
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); openMobileMenu(calendar); }}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </div>

                            {expandedCalendars.has(calendar._id) ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                          </div>
                        </div>
                        
                        {/* Progress Bar - Mobile */}
                        <div className="sm:hidden mt-3 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${calStats.progressPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 tabular-nums">{calStats.progressPercent}%</span>
                        </div>
                      </div>

                      {/* Expanded Content Items */}
                      {expandedCalendars.has(calendar._id) && (
                        <div className="border-t border-gray-200/50 p-3 space-y-2">
                          {calendar.contentItems && calendar.contentItems.length > 0 ? (
                            <>
                              <div className="flex items-center justify-end pb-1">
                                <button
                                  onClick={e => { e.stopPropagation(); setItemSortOrder(o => o === 'desc' ? 'asc' : 'desc'); }}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                  title={itemSortOrder === 'desc' ? 'Newest first — click for oldest first' : 'Oldest first — click for newest first'}
                                >
                                  <ArrowUpDown className="h-3 w-3" />
                                  {itemSortOrder === 'desc' ? 'Newest first' : 'Oldest first'}
                                </button>
                              </div>
                              {[...calendar.contentItems].sort((a, b) => itemSortOrder === 'desc'
                                ? new Date(b.date) - new Date(a.date)
                                : new Date(a.date) - new Date(b.date)
                              ).map((item, index) => {
                              const originalIndex = calendar.contentItems.findIndex(
                                orig => orig.date === item.date && orig.description === item.description
                              );
                              const itemStatus = getItemStatus(item);
                              const statusConfig = getStatusConfig(itemStatus);
                              const itemKey = item.id || `${calendar._id}_${index}`;
                              const itemTrendData = postTrendCache[itemKey];
                              const isTrendLoading = itemTrendData === null;
                              const isExpanded = expandedTrendItem === itemKey;
                              const publishedLinks = itemStatus === 'published' ? getItemPublishedLinks(item) : [];
                              const creatorId = item.assignedTo || calendar.assignedTo;
                              const creatorName = item.assignedToName || calendar.assignedToName || (creators.find(c => c.email === creatorId)?.name) || creatorId || '';
                              // Filter submissions for this item (for version nodes in timeline)
                              const itemTitle = item.title || item.description;
                              const itemSubmissions = allSubmissions
                                .filter(s =>
                                  (s.assignment_id && s.assignment_id === item.id) ||
                                  (s.item_id && s.item_id === item.id) ||
                                  (s.item_name && s.item_name === itemTitle)
                                )
                                .sort((a, b) => new Date(a.created_at || a.createdAt) - new Date(b.created_at || b.createdAt));
                              return (
                                <div key={itemKey} className="bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors overflow-hidden">
                                  <div className="flex items-center justify-between p-3">
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                      <div className="h-9 w-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <FileText className="h-4 w-4 text-gray-400" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {item.title && (
                                            <button
                                              className="text-sm font-medium text-blue-800 truncate hover:text-blue-600 hover:underline cursor-pointer text-left"
                                              onClick={(e) => { e.stopPropagation(); openContentDetail(item, calendar); }}
                                              title="View content details"
                                            >
                                              {item.title}
                                            </button>
                                          )}
                                          {publishedLinks.map((link, li) => (
                                            <a
                                              key={li}
                                              href={link.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="flex-shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-colors"
                                              onClick={e => e.stopPropagation()}
                                              title={`Open on ${link.label}`}
                                            >
                                              <PlatformIcon platform={link.platform || link.label} />
                                              <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                                            </a>
                                          ))}
                                        </div>
                                        <p className="text-sm text-gray-900 truncate">{item.description || 'Untitled'}</p>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                          {item.type && (
                                            (Array.isArray(item.type) ? item.type :
                                              (typeof item.type === 'string' ? item.type.split(',').map(p => p.trim()) : [item.type])
                                            ).map((platform, idx) => (
                                              <span key={idx} title={platform} className="flex items-center justify-center">
                                                <PlatformIcon platform={platform} />
                                              </span>
                                            ))
                                          )}
                                          {creatorName && (
                                            <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                                              <User className="h-2.5 w-2.5" />
                                              {creatorName}
                                            </span>
                                          )}
                                        </div>
                                        <ItemTimeline item={item} itemStatus={itemStatus} scheduledPosts={scheduledPosts} submissions={itemSubmissions} />
                                        {itemStatus === 'published' && itemTrendData && typeof itemTrendData === 'object' && (
                                          <MiniTrendCharts platformData={itemTrendData} />
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-2">
                                      {itemStatus === 'published' && (
                                        <div className="hidden sm:block" onClick={e => e.stopPropagation()}>
                                          <PostTrendButton
                                            isLoading={isTrendLoading}
                                            isActive={isExpanded}
                                            onClick={() => {
                                              if (isExpanded) {
                                                setExpandedTrendItem(null);
                                              } else {
                                                fetchPostTrend(itemKey, item);
                                                setExpandedTrendItem(itemKey);
                                              }
                                            }}
                                          />
                                        </div>
                                      )}
                                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border} hidden sm:inline-flex`}>
                                        {itemStatus.replace('_', ' ')}
                                      </span>
                                      <button
                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors touch-manipulation"
                                        onClick={(e) => { e.stopPropagation(); handleEditItem(item, calendar._id); }}
                                        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleEditItem(item, calendar._id); }}
                                        title="Edit"
                                      >
                                        <Edit className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors touch-manipulation"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteItem(calendar._id, item); }}
                                        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteItem(calendar._id, item); }}
                                        title="Delete"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors touch-manipulation"
                                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/content-upload/${calendar._id}/${originalIndex}`); }}
                                        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/admin/content-upload/${calendar._id}/${originalIndex}`); }}
                                        title="Upload"
                                      >
                                        <Upload className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Mobile trend & post link row */}
                                  <div className="sm:hidden px-3 pb-2 flex items-center gap-2 flex-wrap">
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
                                      {itemStatus.replace('_', ' ')}
                                    </span>
                                    {publishedLinks.map((link, li) => (
                                      <a
                                        key={li}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100"
                                        onClick={e => e.stopPropagation()}
                                      >
                                        <ExternalLink className="h-2.5 w-2.5" /> {link.label}
                                      </a>
                                    ))}
                                    {itemStatus === 'published' && (
                                      <PostTrendButton
                                        isLoading={isTrendLoading}
                                        isActive={isExpanded}
                                        onClick={() => {
                                          if (isExpanded) {
                                            setExpandedTrendItem(null);
                                          } else {
                                            fetchPostTrend(itemKey, item);
                                            setExpandedTrendItem(itemKey);
                                          }
                                        }}
                                      />
                                    )}
                                  </div>

                                  {/* Expanded Trend Chart */}
                                  {isExpanded && (
                                    <div className="px-3 pb-3">
                                      {isTrendLoading ? (
                                        <div className="mt-3 bg-blue-50/50 rounded-lg border border-blue-100 p-6 flex items-center justify-center gap-2">
                                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                          <span className="text-xs text-gray-500">Loading trend data…</span>
                                        </div>
                                      ) : (
                                        <ExpandedTrendChart
                                          platformData={itemTrendData || {}}
                                          dateRange={trendDateRange}
                                          onDateRangeChange={setTrendDateRange}
                                          onClose={() => setExpandedTrendItem(null)}
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            </>
                          ) : (
                            <div className="text-center py-6 text-sm text-gray-500">
                              No content items in this calendar
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-1">No calendars yet</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">
                  Create a content calendar to start managing this customer's content schedule.
                </p>
                <button
                  onClick={() => setIsCalendarModalOpen(true)}
                  className="inline-flex items-center px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Create First Calendar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet Menu */}
      {mobileMenuCalendar && (
        <div className="fixed inset-0 z-[9999] sm:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={closeMobileMenu}
          />
          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl animate-slide-up">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">{mobileMenuCalendar.name}</h3>
              <button
                onClick={closeMobileMenu}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Actions */}
            <div className="p-2">
              <button
                onClick={() => {
                  const cal = mobileMenuCalendar;
                  closeMobileMenu();
                  setSelectedCalendar(cal);
                  setIsContentModalOpen(true);
                }}
                className="w-full flex items-center px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <Plus className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-medium">Add Item</span>
              </button>
              <button
                onClick={() => {
                  handleEditCalendar(mobileMenuCalendar);
                }}
                className="w-full flex items-center px-4 py-4 text-gray-700 hover:bg-gray-50 active:bg-gray-100 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <Edit className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium">Edit Calendar</span>
              </button>
              <button
                onClick={() => {
                  const calId = mobileMenuCalendar._id;
                  closeMobileMenu();
                  handleDeleteCalendar(calId);
                }}
                className="w-full flex items-center px-4 py-4 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl transition-colors"
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <span className="font-medium">Delete Calendar</span>
              </button>
            </div>
            {/* Safe area padding for phones with home indicator */}
            <div className="h-6" />
          </div>
        </div>
      )}

      {/* Modals */}
      <ContentCalendarModal
        isOpen={isCalendarModalOpen}
        onClose={() => setIsCalendarModalOpen(false)}
        onSave={handleCreateCalendar}
        title="Create Content Calendar"
        creators={creators}
      />

      <ContentItemModal
        isOpen={isContentModalOpen}
        onClose={() => {
          setIsContentModalOpen(false);
          setSelectedCalendar(null);
        }}
        onSave={handleAddContentItem}
        title="Add Content Item"
        creators={creators}
        platformOptions={['facebook', 'instagram', 'youtube', 'linkedin']}
        multiPlatform={true}
      />

      <AssignCreatorModal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedCalendar(null);
        }}
        onAssign={handleAssignCreator}
        calendarName={selectedCalendar?.name || ''}
      />

      <ContentItemModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleUpdateItem}
        contentItem={selectedItem}
        title="Edit Content"
        creators={creators}
        platformOptions={['facebook', 'instagram', 'youtube', 'linkedin']}
        multiPlatform={true}
      />

      {/* Edit Calendar Modal with prefilled values */}
      <ContentCalendarModal
        isOpen={isEditCalendarModalOpen}
        onClose={() => {
          setIsEditCalendarModalOpen(false);
          setCalendarToEdit(null);
        }}
        onSave={handleUpdateCalendar}
        title="Edit Content Calendar"
        initialData={calendarToEdit}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        customer={customer}
        calendars={calendars}
        isItemPublished={isItemPublished}
      />

      {/* Content Detail Loading Overlay */}
      {contentDetailLoading && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-600">Loading content details...</p>
          </div>
        </div>
      )}

      {/* Content Detail Modal */}
      {selectedContentDetail && !selectedContentDetail._loading && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto py-4 px-2"
          onClick={() => setSelectedContentDetail(null)}
        >
          <div
            className="w-full max-w-5xl bg-gray-50 rounded-2xl p-4 my-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Content Details</h2>
              <button
                onClick={() => setSelectedContentDetail(null)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ContentDetailView
              selectedContent={selectedContentDetail}
              getCustomerName={getCustomerName}
              formatDate={formatDate}
              getStatusColor={() => ''}
              getStatusIcon={() => null}
              isContentPublished={isContentPublished}
              getPublishedPlatformsForContent={getPublishedPlatformsForContent}
              handleScheduleContent={handleScheduleContent}
              isVideoUrl={isVideoUrl}
              calendarName={selectedContentDetail.calendarName}
              itemName={selectedContentDetail.itemName}
              onDeleteVersion={handleDeleteVersion}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default memo(CustomerDetailsView);