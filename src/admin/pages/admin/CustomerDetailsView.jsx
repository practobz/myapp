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
import SchedulePostModal from '../../components/modals/SchedulePostModal';
import ManualPublishModal from '../../components/modals/ManualPublishModal';
import SummaryReport from './SummaryReport';
import CustomerSocialAccounts from './CustomerSocialAccounts';
import CreatorSubmissionsReview from './CreatorSubmissionsReview';
import MultiCustomerAnalytics from './MultiCustomerAnalytics';
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
  QrCode,
  BarChart3,
  Briefcase,
  Globe,
  Send,
  Play,
  Image as ImageIcon,
  Facebook,
  Instagram,
  Linkedin,
  Youtube,
  Loader2,
  RefreshCw,
  Video,
  LayoutGrid,
  Layers,
  Unlink,
} from 'lucide-react';

// ── Social platform badges ───────────────────────────────────────────────────
const PLATFORM_META = {
  facebook: { abbr: 'FB', cls: 'bg-blue-600', title: 'Facebook' },
  instagram: { abbr: 'IG', cls: 'bg-gradient-to-br from-purple-600 to-pink-500', title: 'Instagram' },
  youtube: { abbr: 'YT', cls: 'bg-red-600', title: 'YouTube' },
  linkedin: { abbr: 'LI', cls: 'bg-blue-800', title: 'LinkedIn' },
  twitter: { abbr: 'TW', cls: 'bg-sky-500', title: 'Twitter' },
  x: { abbr: 'X', cls: 'bg-gray-900', title: 'X' },
  tiktok: { abbr: 'TK', cls: 'bg-gray-800', title: 'TikTok' },
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

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS_CONFIG = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'portfolio', label: 'Total Posts', icon: Briefcase },
  { id: 'internal_review', label: 'Internal Review', icon: Layers },
  { id: 'qr', label: 'QR Codes', icon: QrCode },
  { id: 'social', label: 'Social', icon: BarChart3 },
  { id: 'report', label: 'Report', icon: FileText },
  { id: 'info', label: 'Customer Info', icon: User },
];

// ── QR platform config ─────────────────────────────────────────────────────────
const PLATFORMS_QR = [
  { key: 'fb', label: 'Facebook', color: 'bg-blue-600 hover:bg-blue-700', Icon: Facebook },
  { key: 'insta', label: 'Instagram', color: 'bg-pink-600 hover:bg-pink-700', Icon: Instagram },
  { key: 'linkedin', label: 'LinkedIn', color: 'bg-blue-700 hover:bg-blue-800', Icon: Linkedin },
  { key: 'yt', label: 'YouTube', color: 'bg-red-600 hover:bg-red-700', Icon: Youtube },
];

// ── Portfolio status helpers ───────────────────────────────────────────────────
const getPortfolioStatusColor = (status) => {
  switch (status) {
    case 'under_review': return 'bg-yellow-100 text-yellow-800';
    case 'approved_admin': return 'bg-orange-100 text-orange-800';
    case 'approved_customer': return 'bg-green-100 text-green-800';
    case 'approved_both': return 'bg-teal-100 text-teal-800';
    case 'approved': return 'bg-green-100 text-green-800';
    case 'published': return 'bg-blue-100 text-blue-800';
    case 'revision_requested': return 'bg-orange-100 text-orange-800';
    case 'rejected': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPortfolioStatusLabel = (status) => {
  switch (status) {
    case 'approved_admin': return 'Admin Approved';
    case 'approved_customer': return 'Customer Approved';
    case 'approved_both': return 'Fully Approved';
    case 'under_review': return 'Under Review';
    case 'revision_requested': return 'Revision Needed';
    case 'published': return 'Published';
    case 'submitted': return 'Submitted';
    case 'rejected': return 'Rejected';
    default: return (status || '').replace(/_/g, ' ');
  }
};

// Platform icon used in Social tab
const PlatformIconLarge = ({ platform, className = 'w-5 h-5' }) => {
  const p = (platform || '').toLowerCase();
  if (p === 'facebook') return <Facebook className={className} style={{ color: '#1877F2' }} />;
  if (p === 'instagram') return <Instagram className={className} style={{ color: '#E4405F' }} />;
  if (p === 'linkedin') return <Linkedin className={className} style={{ color: '#0A66C2' }} />;
  if (p === 'youtube') return <Youtube className={className} style={{ color: '#FF0000' }} />;
  return <Globe className={className + ' text-gray-500'} />;
};

const PLATFORM_BG = {
  facebook: 'bg-blue-50 border-blue-200',
  instagram: 'bg-pink-50 border-pink-200',
  linkedin: 'bg-sky-50 border-sky-200',
  youtube: 'bg-red-50 border-red-200',
};

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
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${range === opt.months
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
            <Area type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} fill="url(#cdvAmber)" dot={false} activeDot={{ r: 4 }} />
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
  <div className="flex items-center gap-1.5 p-1.5 bg-gray-50/50 rounded-lg">
    <div className={`p-1 ${iconBg} rounded-md flex-shrink-0`}>
      <Icon className={`h-5 w-5 ${iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-gray-400 uppercase">{label}</p>
      <p className={`text-base text-gray-900 font-medium truncate ${mono ? 'font-mono' : ''}`}>
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
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
  if (p === 'instagram') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#E1306C" aria-label="Instagram">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
  if (p === 'linkedin') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#0A66C2" aria-label="LinkedIn">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
  if (p === 'youtube') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#FF0000" aria-label="YouTube">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
  if (p === 'twitter' || p === 'x') return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#000000" aria-label="X (Twitter)">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
  return <span className="text-[10px] font-medium text-gray-600 capitalize">{platform}</span>;
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

  // Version steps — one node per submission, shown between Due and Reviewed
  // Each version also gets a "→ Admin" step if admins were notified
  const versionSteps = [];
  submissions.forEach((s, idx) => {
    // The upload/version node
    versionSteps.push({
      key: `v${idx + 1}`,
      label: `V${idx + 1}`,
      done: hasReachedDate(s.created_at || s.createdAt),
      date: fmtDate(s.created_at || s.createdAt),
      tone: 'blue',
    });
    // If admins were notified, add a "Sent" node right after
    const notifiedAdmins = Array.isArray(s.notify_admins) ? s.notify_admins : [];
    if (notifiedAdmins.length > 0) {
      const adminLabel = notifiedAdmins.length === 1
        ? notifiedAdmins[0].name || 'Admin'
        : `${notifiedAdmins.length} Admins`;
      versionSteps.push({
        key: `v${idx + 1}_admin`,
        label: `→ ${adminLabel}`,
        done: hasReachedDate(s.sent_to_admin_at || s.created_at || s.createdAt),
        date: fmtDate(s.sent_to_admin_at || s.created_at || s.createdAt),
        tone: 'purple',
      });
    }
  });

  // Derive review date from the approved submission if not stored on item
  const approvedSub = submissions.find(s => s.status === 'approved');
  const reviewedAt = item.reviewedAt || approvedSub?.approvedAt || approvedSub?.updatedAt;
  const reviewedDate = fmtDate(reviewedAt);
  const publishedAt = matchedPost?.publishedAt || item.publishedAt;

  // Order: Created → Assigned → Due → V1 → V2 → ... → Reviewed → Published
  const steps = [
    { key: 'created', label: 'Created', done: hasReachedDate(item.createdAt), date: fmtDate(item.createdAt), tone: 'blue' },
    { key: 'assigned', label: 'Assigned', done: hasReachedDate(item.assignedAt), date: fmtDate(item.assignedAt), tone: 'blue' },
    { key: 'due', label: 'Due', done: hasReachedDate(item.date), date: fmtDate(item.date), tone: 'orange' },
    ...versionSteps,
    { key: 'reviewed', label: 'Reviewed', done: hasReachedDate(reviewedAt), date: reviewedDate, tone: 'blue' },
    { key: 'published', label: 'Published', done: hasReachedDate(publishedAt), date: fmtDate(publishedAt), tone: 'green' },
  ];

  const toneClasses = {
    blue: {
      dotDone: 'bg-blue-500',
      dotTodo: 'bg-blue-100',
      labelDone: 'text-blue-700 font-medium',
      labelTodo: 'text-blue-300',
      dateDone: 'text-blue-500',
      dateTodo: 'text-blue-200',
      lineDone: 'bg-blue-400',
      lineTodo: 'bg-blue-100',
    },
    orange: {
      dotDone: 'bg-amber-500',
      dotTodo: 'bg-amber-100',
      labelDone: 'text-amber-700 font-medium',
      labelTodo: 'text-amber-300',
      dateDone: 'text-amber-500',
      dateTodo: 'text-amber-200',
      lineDone: 'bg-amber-400',
      lineTodo: 'bg-amber-100',
    },
    green: {
      dotDone: 'bg-emerald-500',
      dotTodo: 'bg-emerald-100',
      labelDone: 'text-emerald-700 font-medium',
      labelTodo: 'text-emerald-300',
      dateDone: 'text-emerald-500',
      dateTodo: 'text-emerald-200',
      lineDone: 'bg-emerald-400',
      lineTodo: 'bg-emerald-100',
    },
    purple: {
      dotDone: 'bg-purple-500',
      dotTodo: 'bg-purple-100',
      labelDone: 'text-purple-700 font-medium',
      labelTodo: 'text-purple-300',
      dateDone: 'text-purple-500',
      dateTodo: 'text-purple-200',
      lineDone: 'bg-purple-400',
      lineTodo: 'bg-purple-100',
    },
  };

  return (
    <div className="flex items-start mt-2 overflow-x-auto pb-0.5">
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div className="flex flex-col items-center flex-shrink-0">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${step.done ? (toneClasses[step.tone || 'blue']?.dotDone || 'bg-blue-500') : (toneClasses[step.tone || 'blue']?.dotTodo || 'bg-blue-100')}`} />
            <span className={`text-[9px] leading-none mt-0.5 whitespace-nowrap ${step.done ? (toneClasses[step.tone || 'blue']?.labelDone || 'text-blue-700 font-medium') : (toneClasses[step.tone || 'blue']?.labelTodo || 'text-blue-300')}`}>
              {step.label}
            </span>
            <span className={`text-[8px] leading-none mt-0.5 whitespace-nowrap ${step.date ? (step.done ? (toneClasses[step.tone || 'blue']?.dateDone || 'text-blue-500') : (toneClasses[step.tone || 'blue']?.dateTodo || 'text-blue-200')) : 'text-transparent select-none'}`}>
              {step.date || '—'}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-px mt-1 mx-0.5 ${step.done && steps[idx + 1].done ? (toneClasses[steps[idx + 1].tone || 'blue']?.lineDone || 'bg-blue-400') : (toneClasses[steps[idx + 1].tone || 'blue']?.lineTodo || 'bg-blue-100')}`}
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
    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border transition-colors flex-shrink-0 ${isActive
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
                className={`px-2 py-0.5 text-[10px] rounded-full font-medium transition-colors ${dateRange === r.value
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
            const totalLikes = data.length > 0 ? (data[data.length - 1].likes || 0) : 0;
            const totalComments = data.length > 0 ? (data[data.length - 1].comments || 0) : 0;
            const totalShares = data.length > 0 ? (data[data.length - 1].shares || 0) : 0;
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
                        <Line type="monotone" dataKey="likes" stroke="#EF4444" strokeWidth={1.5} dot={false} name="Likes" />
                        <Line type="monotone" dataKey="comments" stroke="#3B82F6" strokeWidth={1.5} dot={false} name="Comments" />
                        <Line type="monotone" dataKey="shares" stroke="#22C55E" strokeWidth={1.5} dot={false} name="Shares" />
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
  const [isManualPublishModalOpen, setIsManualPublishModalOpen] = useState(false);
  const [manualPublishItem, setManualPublishItem] = useState(null);
  const [manualPublishCalendarId, setManualPublishCalendarId] = useState(null);
  const [manualPublishSaving, setManualPublishSaving] = useState(false);
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

  // ── New tab / section state ────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview');
  // QR tab
  const [qrResult, setQrResult] = useState({});
  const [qrLoading, setQrLoading] = useState(false);
  const [qrExpiration, setQrExpiration] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [qrError, setQrError] = useState('');
  const [qrSuccess, setQrSuccess] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  // Scheduled tab
  const [scheduledPostsFilter, setScheduledPostsFilter] = useState('all');
  // Social tab
  const [selectedSocialAccount, setSelectedSocialAccount] = useState(null);
  // Publish Manager tab
  const [publishModalData, setPublishModalData] = useState(null); // {calendar, item}
  const [scheduleModalData, setScheduleModalData] = useState(null); // selectedContent for SchedulePostModal
  const [pmExpandedCalendars, setPmExpandedCalendars] = useState(new Set());
  const [pmFilter, setPmFilter] = useState('all'); // 'all' | 'published' | 'pending'
  // Summary Report tab
  const [reportFromDate, setReportFromDate] = useState('');
  const [reportToDate, setReportToDate] = useState('');
  const [reportCalendarId, setReportCalendarId] = useState('');
  const [summaryReport, setSummaryReport] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [summaryLiveScheduled, setSummaryLiveScheduled] = useState([]);
  const [summaryExpandedItems, setSummaryExpandedItems] = useState({});

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
    let intervalId;
    if (id) {
      // Run all critical fetches in parallel — no more sequential waterfall
      Promise.all([
        fetchCustomer(),
        fetchCalendars(),
        fetchScheduledPosts(),
      ]);
      // Non-critical fetches that don't block the main view
      fetchCreators();
      fetchSocialAccounts();
      fetchSubmissions();

      // Poll for scheduled posts updates every 30 seconds (reduced from 10s)
      intervalId = setInterval(() => {
        fetchScheduledPosts();
      }, 30000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
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
      // Use scoped endpoint — only fetches calendars for this customer, not all calendars
      const response = await fetch(`${API_URL}/calendars/customer/${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error('Failed to fetch calendars');
      const customerCalendars = await response.json();
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
      const response = await fetch(`${API_URL}/api/scheduled-posts?customerId=${encodeURIComponent(id)}`);
      if (response.ok) {
        const data = await response.json();
        const posts = Array.isArray(data) ? data.filter(p => p.customerId === id) : [];
        // Show posts immediately — don't block on live metrics
        setScheduledPosts(posts);

        // Fetch live metrics asynchronously in background (non-blocking)
        const publishedPosts = posts.filter(p => p.status === 'published' || p.publishedAt);
        if (publishedPosts.length > 0) {
          fetch(`${API_URL}/api/admin/post-metrics/live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ customerId: id, posts: publishedPosts }),
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
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      setScheduledPosts([]);
    }
  };

  const handleDeleteScheduledPost = useCallback(async (postId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled post?')) return;
    try {
      const response = await fetch(`${API_URL}/api/scheduled-posts/${postId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setScheduledPosts(prev => prev.filter(post => post._id !== postId));
      } else {
        alert('Could not delete the post. Please try again.');
      }
    } catch (error) {
      console.error('Delete post error:', error);
      alert('Could not delete the post. Please check your connection.');
    }
  }, [API_URL]);


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
      // Filter by customerId server-side to avoid fetching all submissions
      const response = await fetch(`${API_URL}/api/content-submissions?customerId=${encodeURIComponent(id)}`);
      if (response.ok) {
        const data = await response.json();
        setAllSubmissions(Array.isArray(data) ? data : []);
      }
    } catch {
      setAllSubmissions([]);
    }
  };

  // ── QR Codes helpers ──────────────────────────────────────────────────────
  // Countdown timer for QR expiry
  useEffect(() => {
    if (!qrResult.expiresAt) return;
    const timer = setInterval(() => {
      const remaining = new Date(qrResult.expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        setTimeRemaining('Expired');
        setQrExpiration('expired');
        clearInterval(timer);
      } else {
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${h}h ${m}m ${s}s`);
        setQrExpiration(remaining < 1800000 ? 'warning' : 'valid');
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [qrResult.expiresAt]);

  const handleGenerateQr = useCallback(async (platform) => {
    const validPlatforms = ['fb', 'insta', 'linkedin', 'yt'];
    if (!validPlatforms.includes(platform)) return;
    setQrLoading(true);
    setQrError('');
    setQrSuccess('');
    setQrResult({});
    setQrExpiration(null);
    setTimeRemaining(null);
    try {
      const res = await fetch(`${API_URL}/api/generate-qr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: id, platform, customerName: customer?.name, source: 'admin-qr-generator' }),
      });
      const data = await res.json();
      if (res.ok && data.customerId === id) {
        const isProd = process.env.NODE_ENV === 'production';
        const qrCodeUrl = isProd
          ? `https://airspark.storage.googleapis.com/index.html#/configure?customerId=${id}&platform=${platform}&source=admin-qr-generator&autoConnect=1&t=${Date.now()}`
          : `https://localhost:3000/#/configure?customerId=${id}&platform=${platform}&source=admin-qr-generator&autoConnect=1&t=${Date.now()}`;
        setQrResult({ ...data, qrCodeUrl, platform, customerName: customer?.name, customerId: id });
        setQrExpiration('valid');
        setQrSuccess(`QR code generated for ${customer?.name}!`);
        setTimeout(() => setQrSuccess(''), 3000);
      } else {
        setQrError(data.error || 'Failed to generate QR code');
      }
    } catch {
      setQrError('Network error. Please try again.');
    }
    setQrLoading(false);
  }, [id, customer, API_URL]);

  const downloadQrCode = useCallback(async () => {
    if (!qrResult.qrDataUrl) return;
    const link = document.createElement('a');
    link.download = `qr-${customer?.name || 'customer'}-${qrResult.platform}.png`;
    link.href = qrResult.qrDataUrl;
    link.click();
  }, [qrResult, customer]);

  const handleSendQrEmail = useCallback(async () => {
    if (!qrResult.qrCodeUrl || !qrResult.qrDataUrl || !customer?.email) return;

    const confirmSend = window.confirm('Are you sure you want to send this to customer?');
    if (!confirmSend) return;

    setEmailSending(true);
    setQrError('');
    setQrSuccess('');

    try {
      const res = await fetch(`${API_URL}/api/send-qr-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: id,
          customerEmail: customer.email,
          customerName: customer.name,
          platform: qrResult.platform,
          qrCodeUrl: qrResult.qrCodeUrl,
          qrDataUrl: qrResult.qrDataUrl
        })
      });

      const data = await res.json();
      if (res.ok) {
        setQrSuccess(`Successfully sent integration QR code to ${customer.email}!`);
        setTimeout(() => setQrSuccess(''), 4000);
      } else {
        setQrError(data.error || 'Failed to send email to customer');
      }
    } catch (err) {
      setQrError('Network error. Failed to send email.');
    } finally {
      setEmailSending(false);
    }
  }, [qrResult, customer, id, API_URL]);

  // ── Publish Manager helpers ───────────────────────────────────────────────
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

  const togglePmCalendar = useCallback((calId) => {
    setPmExpandedCalendars(prev => {
      const next = new Set(prev);
      if (next.has(calId)) next.delete(calId); else next.add(calId);
      return next;
    });
  }, []);

  const handleMarkPublished = useCallback(async (calendarId, item) => {
    const newState = !isItemPublished(item);
    try {
      const res = await fetch(`${API_URL}/calendars/item/${calendarId}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          published: newState,
          publishedAt: newState ? new Date().toISOString() : null,
          publishedPlatforms: item.platforms || item.type || []
        })
      });
      if (!res.ok) throw new Error('Failed');
      fetchCalendars();
    } catch (err) {
      console.error('Mark published error:', err);
    }
  }, [isItemPublished, API_URL, fetchCalendars]);

  // Filtered calendars for Publish Manager tab
  const pmCalendars = useMemo(() => {
    return calendars.map(cal => {
      const items = (cal.contentItems || []).map(item => ({
        ...item,
        isPublished: isItemPublished(item),
        calendarId: cal._id,
      }));
      const filtered = pmFilter === 'published' ? items.filter(i => i.isPublished)
        : pmFilter === 'pending' ? items.filter(i => !i.isPublished)
          : items;
      return { ...cal, filteredItems: filtered, publishedCount: items.filter(i => i.isPublished).length, totalCount: items.length };
    }).filter(cal => cal.filteredItems.length > 0);
  }, [calendars, isItemPublished, pmFilter]);

  // ── Summary Report helpers ────────────────────────────────────────────────
  const handleGenerateSummaryReport = useCallback(async () => {
    setSummaryError('');
    setSummaryLoading(true);
    setSummaryReport(null);
    try {
      const params = new URLSearchParams({ customerId: id });
      if (reportFromDate) params.set('fromDate', reportFromDate);
      if (reportToDate) params.set('toDate', reportToDate);
      if (reportCalendarId) params.set('calendarId', reportCalendarId);
      const [reportRes, postsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/summary-report?${params.toString()}`),
        fetch(`${API_URL}/api/scheduled-posts?customerId=${encodeURIComponent(id)}`).catch(() => null),
      ]);
      if (!reportRes.ok) throw new Error(`HTTP ${reportRes.status}`);
      const [data, postsData] = await Promise.all([
        reportRes.json(),
        postsRes?.ok ? postsRes.json().catch(() => null) : Promise.resolve(null),
      ]);
      setSummaryReport(data);
      setSummaryLiveScheduled(Array.isArray(postsData) ? postsData : []);
    } catch {
      setSummaryError('Failed to generate report. Please try again.');
    } finally {
      setSummaryLoading(false);
    }
  }, [id, API_URL, reportFromDate, reportToDate, reportCalendarId]);

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

  // ── Portfolio items mapped from submissions for this customer ──────────────
  const portfolioItemsMapped = useMemo(() => {
    if (!allSubmissions.length) return [];
    const normalizeMedia = (media) => {
      if (!Array.isArray(media)) return [];
      return media.map(m => typeof m === 'string'
        ? { url: m, type: /\.(mp4|webm|ogg|mov|avi)$/i.test(m) ? 'video' : 'image' }
        : m
      ).filter(Boolean);
    };
    // Only include submissions belonging to this customer
    const customerSubs = allSubmissions.filter(s => {
      const cid = s.customer_id || s.customerId;
      if (cid === id) return true;
      // fallback: check if assignment_id matches a calendar item for this customer
      return calendars.some(cal =>
        cal.customerId === id &&
        (cal.contentItems || []).some(ci => ci.id === s.assignment_id || ci.id === s.item_id)
      );
    });
    const groups = {};
    customerSubs.forEach(sub => {
      const key = sub.assignment_id || sub._id;
      if (!groups[key]) groups[key] = [];
      groups[key].push(sub);
    });
    return Object.keys(groups).map(key => {
      const versions = groups[key].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const base = versions[0];
      const latest = versions[versions.length - 1];
      let calendarName = base.calendar_name || '';
      let itemName = base.item_name || '';
      let publishedStatus = false;
      for (const cal of calendars) {
        const ci = (cal.contentItems || []).find(ci =>
          ci.id === key || ci.title === base.caption || ci.description === base.notes
        );
        if (ci) {
          calendarName = calendarName || cal.name;
          itemName = itemName || ci.title || ci.description;
          publishedStatus = isItemPublished(ci);
          break;
        }
      }
      return {
        id: key,
        title: base.caption || '',
        platform: base.platform || '',
        status: latest.status || 'submitted',
        createdDate: base.created_at,
        lastUpdated: latest.created_at,
        totalVersions: versions.length,
        versions: versions.map((v, i) => ({
          id: v._id,
          versionNumber: i + 1,
          media: normalizeMedia(v.media || v.images || []),
          caption: v.caption || '',
          hashtags: v.hashtags || '',
          notes: v.notes || '',
          createdAt: v.created_at,
          status: v.status || 'submitted',
          comments: v.comments || [],
        })),
        calendarName,
        itemName,
        published: publishedStatus,
        publishedPlatforms: [],
      };
    }).sort((a, b) => {
      const dateA = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
      const dateB = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
      return dateB - dateA;
    });
  }, [allSubmissions, id, calendars, isItemPublished]);

  // ── Scheduled posts filtered for tab ──────────────────────────────────────
  const scheduledForTab = useMemo(() => {
    if (scheduledPostsFilter === 'all') return scheduledPosts;
    return scheduledPosts.filter(p => p.status === scheduledPostsFilter);
  }, [scheduledPosts, scheduledPostsFilter]);

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
  // Get published count for a calendar
  const getCalendarStats = useCallback((calendar) => {
    let total = 0, published = 0, pending = 0, upcomingDue = 0, overdue = 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    if (calendar.contentItems) {
      calendar.contentItems.forEach(item => {
        total++;
        if (isItemPublished(item)) {
          published++;
        } else {
          pending++;
          if (item.date) {
            const dueDate = new Date(item.date);
            if (dueDate < today) {
              overdue++;
            } else if (dueDate <= twoDaysFromNow) {
              upcomingDue++;
            }
          }
        }
      });
    }

    const progressPercent = total > 0 ? Math.round((published / total) * 100) : 0;
    return { total, published, pending, upcomingDue, overdue, progressPercent };
  }, [isItemPublished]);

  // Overall stats for all calendars
  const overallStats = useMemo(() => {
    let totalItems = 0, publishedItems = 0, upcomingDue = 0, overdue = 0;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    calendars.forEach(cal => {
      cal.contentItems?.forEach(item => {
        totalItems++;
        const isPublished = isItemPublished(item);
        if (isPublished) {
          publishedItems++;
        } else {
          if (item.date) {
            const dueDate = new Date(item.date);
            if (dueDate < today) {
              overdue++;
            } else if (dueDate <= twoDaysFromNow) {
              upcomingDue++;
            }
          }
        }
      });
    });
    return {
      totalCalendars: calendars.length,
      totalItems,
      publishedItems,
      pendingItems: totalItems - publishedItems,
      upcomingDue,
      overdue,
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

      // Send assignment email notification to the creator
      if (item.assignedTo) {
        try {
          await fetch(`${API_URL}/calendars/notify-creator`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              creatorEmail: item.assignedTo,
              calendarName: calendar.name || 'Content Calendar',
              customerName: customer?.name || '',
              item
            })
          });
        } catch (notifyErr) {
          console.warn('⚠️ Failed to send creator notification email:', notifyErr);
        }
      }

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

  const openManualPublishModal = useCallback((item, calendarId) => {
    setManualPublishItem(item);
    setManualPublishCalendarId(calendarId);
    setIsManualPublishModalOpen(true);
  }, []);

  const handleSaveManualPublish = async (platforms, manualUrls, notes, notifyEmail) => {
    if (!manualPublishCalendarId || !manualPublishItem?.id) return;
    setManualPublishSaving(true);
    try {
      const hasManuallyPublished = platforms.length > 0;
      const response = await fetch(
        `${API_URL}/calendars/item/${manualPublishCalendarId}/mark-published`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId: manualPublishItem.id,
            published: hasManuallyPublished,
            publishedPlatforms: platforms,
            publishedNotes: notes,
            manualPlatformUrls: manualUrls,
            publishedAt: new Date().toISOString(),
            sendEmailNotification: notifyEmail
          })
        }
      );

      if (!response.ok) throw new Error('Failed to save manual publish status');
      fetchCalendars();
      setIsManualPublishModalOpen(false);
      setManualPublishItem(null);
      setManualPublishCalendarId(null);
    } catch (err) {
      console.error('Error saving manual publish status:', err);
      alert('Failed to save publish status. Please try again.');
    } finally {
      setManualPublishSaving(false);
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

  const isIdValid = (id) => id && id !== 'null' && id !== 'undefined' && id !== 'none' && id !== 'N/A';

  // Find the matching scheduled post(s) for a calendar item and build platform links
  const getItemPublishedLinks = useCallback((item) => {
    const links = [];

    // Manual platform URLs first
    if (item.manualPlatformUrls) {
      Object.entries(item.manualPlatformUrls).forEach(([platform, url]) => {
        if (url && isIdValid(url)) {
          links.push({
            url: url,
            label: PLATFORM_META[platform.toLowerCase()]?.title || platform,
            platform: platform.toLowerCase(),
            isManual: true
          });
        }
      });
    }

    if (item.postUrl && isIdValid(item.postUrl)) {
      if (!links.some(l => l.platform === null)) {
        links.push({ url: item.postUrl, label: 'View Post', platform: null });
      }
    }
    for (const post of scheduledPosts) {
      const matches =
        (post.item_id && post.item_id === item.id) ||
        (post.contentId && post.contentId === item.id) ||
        (post.item_name && post.item_name === (item.title || item.description));
      if (!matches || !(post.status === 'published' || post.publishedAt)) continue;
      if (isIdValid(post.facebookPostId) && !post.facebookPostId.startsWith('fb_shared_from_')) {
        const fbId = post.facebookPostId;
        const fbUrl = fbId.includes('_')
          ? `https://www.facebook.com/permalink.php?story_fbid=${fbId.split('_')[1]}&id=${fbId.split('_')[0]}`
          : `https://www.facebook.com/${fbId}`;
        if (!links.some(l => l.platform === 'facebook')) {
          links.push({ url: fbUrl, label: 'Facebook', platform: 'facebook' });
        }
      }
      if (isIdValid(post.instagramPostId)) {
        const igUrl = post.instagramPermalink || instagramMediaIdToUrl(post.instagramPostId, post.postType);
        if (igUrl && !links.some(l => l.platform === 'instagram')) {
          // If we have live metrics source but no permalink, it means the post was not found/available on Instagram
          const isLiveButUnavailable = post.metricsSource === 'live' && !post.instagramPermalink;
          if (!isLiveButUnavailable) {
            links.push({ url: igUrl, label: 'Instagram', platform: 'instagram' });
          }
        }
      } else if (isIdValid(post.instagramPermalink)) {
        if (!links.some(l => l.platform === 'instagram')) {
          links.push({ url: post.instagramPermalink, label: 'Instagram', platform: 'instagram' });
        }
      }
      if (isIdValid(post.youtubePostId)) {
        const ytUrl = `https://www.youtube.com/watch?v=${post.youtubePostId}`;
        if (!links.some(l => l.platform === 'youtube')) {
          links.push({ url: ytUrl, label: 'YouTube', platform: 'youtube' });
        }
      }
      if (isIdValid(post.linkedinPostId)) {
        const liUrl = `https://www.linkedin.com/feed/update/${post.linkedinPostId}`;
        if (!links.some(l => l.platform === 'linkedin')) {
          links.push({ url: liUrl, label: 'LinkedIn', platform: 'linkedin' });
        }
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

  const extractHashtags = useCallback((text = '') => {
    const hashtags = String(text).match(/#[a-zA-Z0-9_]+/g);
    return hashtags ? hashtags.join(' ') : '';
  }, []);

  const getCustomerSocialAccounts = useCallback((customerId) => {
    return customerId === id ? socialAccounts : [];
  }, [id, socialAccounts]);

  const getCustomer = useCallback((customerId) => {
    return customerId === id ? customer : null;
  }, [id, customer]);

  const handleShowIntegration = useCallback((platform) => {
    const map = {
      facebook: 'fb',
      instagram: 'insta',
      linkedin: 'linkedin',
      youtube: 'yt',
    };
    const qrPlatform = map[(platform || '').toLowerCase()];
    setScheduleModalData(null);
    setActiveTab('qr');
    if (qrPlatform) handleGenerateQr(qrPlatform);
  }, [handleGenerateQr]);

  const handleScheduleContent = useCallback((content = null) => {
    const contentToSchedule = content || selectedContentDetail;
    if (!contentToSchedule) return;
    // Do not close the detail modal so it remains underneath
    // setSelectedContentDetail(null);
    setScheduleModalData(contentToSchedule);
  }, [selectedContentDetail]);

  const handleUpdatePortfolioStatus = useCallback(() => {
    fetchSubmissions();
  }, []);

  const handleDeleteVersion = useCallback(async (versionId, portfolioId) => {
    try {
      const response = await fetch(`${API_URL}/api/content-submissions/${versionId}`, { method: 'DELETE' });
      if (response.ok) {
        await fetchSubmissions();
      }
    } catch (err) {
      console.error('Failed to delete version', err);
    }
    setSelectedContentDetail(prev => {
      if (!prev || prev.id !== portfolioId) return prev;
      const newVersions = prev.versions.filter(v => v.id !== versionId);
      return { ...prev, versions: newVersions, totalVersions: newVersions.length };
    });
  }, [API_URL, fetchSubmissions]);

  const handleDeletePortfolioItem = useCallback(async (portfolioId) => {
    if (!window.confirm('Are you sure you want to delete this portfolio item and all its versions?')) return;
    try {
      const response = await fetch(`${API_URL}/api/content-submissions/assignment/${encodeURIComponent(portfolioId)}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        await fetchSubmissions();
      } else {
        alert('Failed to delete the portfolio item. Please try again.');
      }
    } catch (err) {
      console.error('Delete portfolio item error:', err);
      alert('Could not delete the portfolio item. Please check your connection.');
    }
  }, [API_URL, fetchSubmissions]);

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
      <div className="space-y-2 sm:space-y-3">
        {/* Header + Tab Nav */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-2 sm:p-3 border border-gray-200/50">
          <div className="flex items-center">
            <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">
                {(customer.name || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="ml-2 sm:ml-3 min-w-0 flex-1">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{customer.name || 'Customer'}</h2>
              <p className="text-base text-gray-500 truncate">{customer.email}</p>
              {socialPlatforms.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {socialPlatforms.map(p => <SocialBadge key={p} platform={p} />)}
                </div>
              )}
            </div>
          </div>
          {/* Tab Navigation */}
          <div className="flex gap-1 mt-3 overflow-x-auto pb-0.5 scrollbar-hide">
            {TABS_CONFIG.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              // Badge counts
              let badge = null;
              if (tab.id === 'portfolio') badge = portfolioItemsMapped.length || null;
              if (tab.id === 'social') badge = socialAccounts.length || null;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                  {badge !== null && (
                    <span className={`ml-0.5 text-[9px] font-bold px-1 rounded-full ${isActive ? 'bg-white/30 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ══════════ TAB: OVERVIEW ══════════ */}
        {activeTab === 'overview' && (
          <>
            {/* Content Calendars Section */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {/* Header with Stats Inline */}
              <div className="px-3 sm:px-4 py-3 border-b border-gray-100">
                <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                  <div className="flex-shrink-0">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Content Calendars</h2>
                    <p className="text-base text-gray-500 mt-0.5">Manage content schedule and items</p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 xl:ml-auto overflow-hidden">
                    {/* Stats Inline */}
                    {calendars.length > 0 && (
                      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1 sm:pb-0">
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md border border-gray-200 whitespace-nowrap">
                          <span className="text-sm font-bold text-gray-700">{overallStats.totalCalendars}</span>
                          <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Calendars</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded-md border border-blue-200 whitespace-nowrap">
                          <span className="text-sm font-bold text-blue-700">{overallStats.totalItems}</span>
                          <span className="text-[10px] font-medium text-blue-600 uppercase tracking-wide">Items</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-md border border-emerald-200 whitespace-nowrap">
                          <span className="text-sm font-bold text-emerald-700">{overallStats.publishedItems}</span>
                          <span className="text-[10px] font-medium text-emerald-600 uppercase tracking-wide">Published</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-md border border-amber-200 whitespace-nowrap">
                          <span className="text-sm font-bold text-amber-700">{overallStats.pendingItems}</span>
                          <span className="text-[10px] font-medium text-amber-600 uppercase tracking-wide">Pending</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-50 rounded-md border border-orange-200 whitespace-nowrap">
                          <span className="text-sm font-bold text-orange-700">{overallStats.upcomingDue}</span>
                          <span className="text-[10px] font-medium text-orange-600 uppercase tracking-wide">Upcoming</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-red-50 rounded-md border border-red-200 whitespace-nowrap">
                          <span className="text-sm font-bold text-red-700">{overallStats.overdue}</span>
                          <span className="text-[10px] font-medium text-red-600 uppercase tracking-wide">Overdue</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setShowTrend(v => !v)}
                        className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${showTrend
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                      >
                        <TrendingUp className="h-4 w-4 mr-1.5" />
                        Trend
                      </button>
                      <button
                        onClick={() => setIsReportModalOpen(true)}
                        className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Download className="h-4 w-4 mr-1.5" />
                        Report
                      </button>
                      <button
                        onClick={() => setIsCalendarModalOpen(true)}
                        className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Calendar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trend chart */}
              {showTrend && calendars.length > 0 && (
                <div className="px-4 sm:px-6 pb-4">
                  <TrendChart calendars={calendars} onClose={() => setShowTrend(false)} />
                </div>
              )}

              <div className="p-2 sm:p-3">
                {calendars.length > 0 ? (
                  <div className="space-y-1">
                    {[...calendars].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).map((calendar) => {
                      const calStats = getCalendarStats(calendar);
                      return (
                        <div key={calendar._id} className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                          {/* Calendar Header */}
                          <div
                            className="p-2 sm:p-3 cursor-pointer hover:bg-gray-100/50 transition-colors"
                            onClick={() => toggleCalendarExpansion(calendar._id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                  <Calendar className="h-5 w-5 text-blue-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-semibold text-gray-900 truncate">{calendar.name}</h4>
                                    {isCalendarPublished(calendar) && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200 flex-shrink-0">
                                        <CheckCircle className="w-3 h-3 mr-1" />
                                        Complete
                                      </span>
                                    )}
                                    {calStats.total > 0 && (
                                      <div className="flex items-center gap-1.5 ml-1">
                                        <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Published: {calStats.published}</span>
                                        <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Pending: {calStats.pending}</span>
                                        <span className="text-[11px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Upcoming: {calStats.upcomingDue}</span>
                                        <span className="text-[11px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">Overdue: {calStats.overdue}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    <span className="text-xs text-gray-500 font-medium">{calStats.total} items</span>
                                    {calendar.assignedTo && (
                                      <span className="text-[11px] text-gray-500 truncate border-l border-gray-200 pl-3">
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
                            <div className="border-t border-gray-200/50 p-2 space-y-1">
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
                                        <div className="flex items-center justify-between p-2">
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
                                                    title={`Open on ${link.label}${link.isManual ? ' (Manual)' : ''}`}
                                                  >
                                                    <PlatformIcon platform={link.platform || link.label} />
                                                    {link.isManual && <User className="h-3.5 w-3.5 text-emerald-600 bg-emerald-100/50 rounded ml-0.5 p-[2px]" title="Manually Published" />}
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
                                              className={`p-1.5 rounded transition-colors touch-manipulation ${itemStatus === 'published'
                                                ? 'text-emerald-650 hover:bg-emerald-50'
                                                : 'text-gray-400 hover:text-emerald-650 hover:bg-emerald-50'
                                                }`}
                                              onClick={(e) => { e.stopPropagation(); openManualPublishModal(item, calendar._id); }}
                                              onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); openManualPublishModal(item, calendar._id); }}
                                              title="Publish Status"
                                            >
                                              <CheckCircle className="h-3.5 w-3.5" />
                                            </button>
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
                                              <ExternalLink className="h-2.5 w-2.5" /> {link.label} {link.isManual ? '(m)' : ''}
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

          </> /* end overview tab */
        )}

        {/* ══════════ TAB: PORTFOLIO ══════════ */}
        {activeTab === 'portfolio' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Content Portfolio</h2>
                <p className="text-sm text-gray-500 mt-0.5">Submitted content versions for review & publishing</p>
              </div>
              <button
                onClick={fetchSubmissions}
                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              {portfolioItemsMapped.length === 0 ? (
                <div className="text-center py-14">
                  <Briefcase className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No portfolio submissions yet</p>
                  <p className="text-gray-400 text-xs mt-1">Content uploaded by creators will appear here</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {portfolioItemsMapped.map(item => {
                    const latestVersion = item.versions[item.versions.length - 1];
                    const firstMedia = latestVersion?.media?.[0];
                    const isPublished = item.published || isContentPublished(item.id, item);
                    const displayStatus = isPublished ? 'published' : item.status;
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
                        onClick={() => {
                          const fakeItem = { id: item.id, title: item.title, description: item.title, type: item.platform };
                          const fakeCal = { customerId: id, name: item.calendarName };
                          openContentDetail(fakeItem, fakeCal);
                        }}
                      >
                        {/* Thumbnail */}
                        <div className="relative h-36 bg-gray-100 flex-shrink-0">
                          {firstMedia?.url ? (
                            isVideoUrl(firstMedia.url) ? (
                              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                <Video className="h-8 w-8 text-white" />
                              </div>
                            ) : (
                              <img src={firstMedia.url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            )
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-gray-300" />
                            </div>
                          )}
                          <span className={`absolute top-2 left-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getPortfolioStatusColor(displayStatus)}`}>
                            {getPortfolioStatusLabel(displayStatus)}
                          </span>
                          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
                            V{item.totalVersions}
                          </span>
                        </div>
                        {/* Body */}
                        <div className="p-3 flex-1 flex flex-col">
                          {item.title && <p className="text-sm font-medium text-gray-900 truncate mb-1">{item.title}</p>}
                          {item.calendarName && <p className="text-[10px] text-gray-500 truncate">📅 {item.calendarName}</p>}
                          {item.itemName && item.itemName !== item.title && <p className="text-[10px] text-gray-500 truncate">📝 {item.itemName}</p>}
                          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1.5">
                            <span className="capitalize">{item.platform || '—'}</span>
                            <span>{formatSimpleDate(item.lastUpdated)}</span>
                          </div>
                          <div className="flex gap-2 mt-3 w-full">
                            <button
                              className="flex-1 bg-blue-600 text-white py-1.5 px-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                              onClick={e => {
                                e.stopPropagation();
                                const fakeItem = { id: item.id, title: item.title, description: item.title, type: item.platform };
                                const fakeCal = { customerId: id, name: item.calendarName };
                                openContentDetail(fakeItem, fakeCal);
                              }}
                            >
                              View Details
                            </button>
                            <button
                              className="p-1.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center"
                              onClick={e => {
                                e.stopPropagation();
                                handleDeletePortfolioItem(item.id);
                              }}
                              title="Delete Portfolio Item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}


        {/* ══════════ TAB: QR CODES ══════════ */}
        {activeTab === 'internal_review' && (
          <CreatorSubmissionsReview embedded={true} customerId={id} />
        )}

        {/* ══════════ TAB: QR CODES ══════════ */}
        {activeTab === 'qr' && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <QrCode className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">QR Code Generator</h2>
                  <p className="text-sm text-gray-500">Generate social integration QR codes for {customer.name}</p>
                </div>
              </div>
            </div>
            <div className="p-5">
              {/* Platform buttons */}
              <p className="text-sm font-medium text-gray-700 mb-3">Select a platform to generate a QR code:</p>
              <div className="flex flex-wrap gap-3 mb-6">
                {PLATFORMS_QR.map(({ key, label, color, Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleGenerateQr(key)}
                    disabled={qrLoading}
                    className={`${color} text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {qrLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
                    {label}
                  </button>
                ))}
              </div>

              {/* Feedback */}
              {qrError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{qrError}</p>
                </div>
              )}
              {qrSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <p className="text-sm text-green-700">{qrSuccess}</p>
                </div>
              )}

              {/* QR Result */}
              {qrResult.qrDataUrl && (
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  {/* QR Image */}
                  <div className="flex-shrink-0">
                    <div className="p-3 bg-white border-2 border-gray-200 rounded-xl inline-block shadow-sm">
                      <img src={qrResult.qrDataUrl} alt="QR Code" className="w-44 h-44 sm:w-52 sm:h-52" />
                    </div>
                  </div>
                  {/* QR Details */}
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Platform</p>
                      <div className="flex items-center gap-2">
                        {PLATFORMS_QR.find(p => p.key === qrResult.platform) && (() => {
                          const plat = PLATFORMS_QR.find(p => p.key === qrResult.platform);
                          const Icon = plat.Icon;
                          return <><Icon className="h-5 w-5" /><span className="font-semibold text-gray-800">{plat.label}</span></>;
                        })()}
                      </div>
                    </div>
                    {timeRemaining && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Expires in</p>
                        <span className={`text-sm font-medium ${qrExpiration === 'expired' ? 'text-red-600' : qrExpiration === 'warning' ? 'text-amber-600' : 'text-green-600'}`}>
                          {timeRemaining}
                        </span>
                      </div>
                    )}
                    {qrResult.qrCodeUrl && (
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">QR URL</p>
                        <p className="text-xs text-gray-600 break-all bg-gray-50 rounded p-2">{qrResult.qrCodeUrl}</p>
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap pt-1">
                      <button
                        onClick={downloadQrCode}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Download QR
                      </button>
                      <button
                        onClick={handleSendQrEmail}
                        disabled={emailSending}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      >
                        {emailSending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send to Customer
                      </button>
                      {qrResult.configUrl && (
                        <a
                          href={qrResult.configUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Preview
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════ TAB: SOCIAL & ANALYTICS ══════════ */}
        {activeTab === 'social' && (
          <div className="space-y-3">
            <CustomerSocialAccounts embedded={true} customerId={id} />
          </div>
        )}

        {/* ══════════ TAB: SUMMARY REPORT ══════════ */}
        {activeTab === 'report' && (
          <SummaryReport embedded={true} customerId={id} />
        )}

        {/* ══════════ TAB: CUSTOMER INFO ══════════ */}
        {activeTab === 'info' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50 mt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Customer Information</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        )}

      </div>

      {/* Schedule Post Modal from Publish Manager */}
      {scheduleModalData && (
        <SchedulePostModal
          selectedContent={scheduleModalData}
          onClose={() => setScheduleModalData(null)}
          extractHashtags={extractHashtags}
          getCustomerSocialAccounts={getCustomerSocialAccounts}
          getCustomerName={getCustomerName}
          getCustomer={getCustomer}
          showIntegration={handleShowIntegration}
          updatePortfolioStatus={handleUpdatePortfolioStatus}
          onRefreshScheduledPosts={fetchScheduledPosts}
        />
      )}

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

      <ManualPublishModal
        isOpen={isManualPublishModalOpen}
        onClose={() => {
          setIsManualPublishModalOpen(false);
          setManualPublishItem(null);
          setManualPublishCalendarId(null);
        }}
        onSave={handleSaveManualPublish}
        item={manualPublishItem}
        scheduledPosts={scheduledPosts}
        saving={manualPublishSaving}
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
              scheduledPosts={scheduledPosts}
              onDeleteScheduledPost={handleDeleteScheduledPost}
            />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default memo(CustomerDetailsView);