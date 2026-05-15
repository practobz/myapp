import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Filter, Download, Calendar, User, Image as ImageIcon,
  ChevronDown, ChevronUp, RefreshCw, AlertCircle, Loader2,
  ThumbsUp, MessageSquare, Share2, Eye, BarChart2, RotateCcw,
  PlayCircle, Layers, Heart, TrendingUp, Sliders, AlignJustify,
  Clock, CheckCircle, FileText, ExternalLink,
} from 'lucide-react';
import jsPDF from 'jspdf';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtNumUI = n => {
  if (n === null || n === undefined || n === '—' || n === '') return '—';
  const v = Number(n);
  if (isNaN(v)) return String(n);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
  return v.toLocaleString();
};

const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || '??';
};

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500',
  'bg-amber-500', 'bg-teal-500', 'bg-indigo-500', 'bg-pink-500',
];
const getAvatarColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};

// ── Platform pill ─────────────────────────────────────────────────────────────
const PlatformPill = ({ platform }) => {
  const cfg = {
    instagram: { label: 'Instagram', cls: 'bg-pink-50 text-pink-600 border-pink-200' },
    facebook:  { label: 'Facebook',  cls: 'bg-blue-50 text-blue-600 border-blue-200' },
    linkedin:  { label: 'LinkedIn',  cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    twitter:   { label: 'Twitter/X', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    youtube:   { label: 'YouTube',   cls: 'bg-red-50 text-red-600 border-red-200' },
  }[(platform || '').toLowerCase()] || { label: platform || '—', cls: 'bg-gray-50 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  const map = {
    submitted:          'bg-amber-50 text-amber-700 border-amber-200',
    approved:           'bg-green-50 text-green-700 border-green-200',
    rejected:           'bg-red-50 text-red-700 border-red-200',
    revision_requested: 'bg-orange-50 text-orange-700 border-orange-200',
    published:          'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending:            'bg-gray-50 text-gray-600 border-gray-200',
    publishing:         'bg-blue-50 text-blue-700 border-blue-200',
    under_review:       'bg-purple-50 text-purple-700 border-purple-200',
    in_review:          'bg-amber-50 text-amber-700 border-amber-200',
  };
  const cls = map[s] || 'bg-gray-50 text-gray-600 border-gray-200';
  const label = s === 'submitted' ? 'In review'
    : (status || '—').replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
};

// ── Thumbnail ─────────────────────────────────────────────────────────────────
const Thumbnail = ({ url }) => {
  if (!url) {
    return (
      <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
        <ImageIcon className="w-5 h-5 text-gray-400" />
      </div>
    );
  }
  const isVideo = /\.(mp4|mov|webm|avi|mkv)/i.test(url);
  return isVideo ? (
    <div className="w-14 h-14 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
      <video src={url} className="w-full h-full object-cover opacity-60" muted />
      <PlayCircle className="absolute w-6 h-6 text-white" />
    </div>
  ) : (
    <img src={url} alt="thumbnail"
      className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100"
      onError={e => { e.target.style.display = 'none'; }} />
  );
};

// ── Media type badge ──────────────────────────────────────────────────────────
const MediaTypeBadge = ({ mediaType, slideCount }) => {
  const t = (mediaType || '').toLowerCase();
  const label = t === 'carousel' ? `Carousel · ${slideCount || '?'} slides`
    : t === 'video' ? 'Video'
    : `Image · ${slideCount || 1} slide`;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
      {label}
    </span>
  );
};

// ── Version row (inline) ──────────────────────────────────────────────────────
const VersionRow = ({ version }) => {
  const latestComment = version.comments?.[version.comments.length - 1];
  const feedback = version.rejectionReason || version.approvalNotes || latestComment?.comment || latestComment?.text;
  const feedbackAuthor = latestComment?.authorName || latestComment?.authorEmail;
  return (
    <div className="pb-3 border-b border-gray-100 last:border-b-0 last:pb-0 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
          {version.versionNumber}
        </div>
        <span className="text-xs font-semibold text-gray-600">Version {version.versionNumber}</span>
        <StatusBadge status={version.status} />
        {version.submittedAt && (
          <span className="text-[10px] text-gray-400 ml-auto">
            {new Date(version.submittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
          </span>
        )}
      </div>
      {version.caption && (
        <p className="text-xs text-gray-700 leading-relaxed line-clamp-2 pl-7">{version.caption}</p>
      )}
      {version.hashtags && (
        <p className="text-[10px] text-blue-500 pl-7 line-clamp-1">{version.hashtags}</p>
      )}
      {feedback && (
        <div className="flex items-start gap-1 pl-7">
          <CheckCircle className="w-3 h-3 text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-gray-500 italic line-clamp-2">
            "{feedback}"{feedbackAuthor && !version.rejectionReason && !version.approvalNotes ? ` — ${feedbackAuthor}` : ''}
          </p>
        </div>
      )}
    </div>
  );
};

// ── Platform metrics section ──────────────────────────────────────────────────
const PlatformMetricsSection = ({ post }) => {
  const platform = (post.platform || '').toLowerCase();
  const PI = {
    instagram: { color: 'text-pink-600',  label: 'Instagram' },
    facebook:  { color: 'text-blue-600',  label: 'Facebook'  },
    linkedin:  { color: 'text-blue-700',  label: 'LinkedIn'  },
    twitter:   { color: 'text-sky-500',   label: 'Twitter/X' },
    youtube:   { color: 'text-red-600',   label: 'YouTube'   },
  }[platform] || { color: 'text-gray-600', label: post.platform || 'Unknown' };

  const m = post.metrics || {};
  const cells = platform === 'instagram' ? [
    { label: 'Likes',    value: m.likes      },
    { label: 'Comments', value: m.comments   },
    { label: 'Shares',   value: m.shares     },
    { label: 'Saves',    value: m.saves ?? m.saved },
  ] : platform === 'facebook' ? [
    { label: 'Likes',    value: m.likes      },
    { label: 'Comments', value: m.comments   },
    { label: 'Shares',   value: m.shares     },
    { label: 'Clicks',   value: m.clicks     },
  ] : platform === 'linkedin' ? [
    { label: 'Reactions',   value: m.likes ?? m.reactions },
    { label: 'Comments',    value: m.comments  },
    { label: 'Shares',      value: m.shares    },
    { label: 'Impressions', value: m.impressions ?? m.reach },
  ] : [
    { label: 'Likes',       value: m.likes       },
    { label: 'Comments',    value: m.comments    },
    { label: 'Shares',      value: m.shares      },
    { label: 'Impressions', value: m.impressions ?? m.reach },
  ];

  const reach    = m.reach || m.impressions;
  const engRaw   = (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
  const engRate  = reach && engRaw ? ((engRaw / reach) * 100).toFixed(1) : null;

  const hasAnyMetric = cells.some(c => c.value !== undefined && c.value !== null);

  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-1.5 text-xs font-bold ${PI.color}`}>
        <BarChart2 className="w-3 h-3" />
        <span>{PI.label}</span>
      </div>
      {hasAnyMetric ? (
        <>
          <div className="grid grid-cols-4 gap-1">
            {cells.map(c => (
              <div key={c.label} className="text-center">
                <p className="text-sm font-bold text-gray-800">{fmtNumUI(c.value)}</p>
                <p className="text-[9px] text-gray-400">{c.label}</p>
              </div>
            ))}
          </div>
          {platform === 'instagram' && (reach || engRate) && (
            <div className="flex gap-6 pt-0.5">
              {reach != null && <div>
                <p className="text-sm font-bold text-gray-700">{fmtNumUI(reach)}</p>
                <p className="text-[9px] text-gray-400">Reach</p>
              </div>}
              {engRate && <div>
                <p className="text-sm font-bold text-gray-700">{engRate}%</p>
                <p className="text-[9px] text-gray-400">Eng. rate</p>
              </div>}
            </div>
          )}
        </>
      ) : (
        <p className="text-[10px] text-gray-400 italic">Metrics not yet available</p>
      )}
    </div>
  );
};

// ── Convert Instagram numeric media ID → shortcode (no API needed) ──────────
// Instagram encodes its media IDs in base64url. The shortcode is the base64url
// representation of the numeric ID, which gives a direct permalink.
// postType: 'reel' → /reel/SHORTCODE/, 'story' → null (stories expire), else → /p/SHORTCODE/
const instagramMediaIdToUrl = (mediaId, postType) => {
  if (!mediaId) return null;
  const type = (postType || '').toLowerCase();
  if (type === 'story') return null; // stories have no permanent public permalink
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

// ── Build platform redirect URLs from a published post (mirrors CustomerDetailsView) ──
const getPostLinks = (post) => {
  const links = [];
  if (!post) return links;
  if (post.postUrl) links.push({ url: post.postUrl, label: 'View Post', platform: null });
  if (post.facebookPostId && !post.facebookPostId.startsWith('fb_shared_from_')) {
    const fbId = post.facebookPostId;
    const fbUrl = fbId.includes('_')
      ? `https://www.facebook.com/permalink.php?story_fbid=${fbId.split('_')[1]}&id=${fbId.split('_')[0]}`
      : `https://www.facebook.com/${fbId}`;
    if (!links.find(l => l.url === fbUrl)) links.push({ url: fbUrl, label: 'Facebook', platform: 'facebook' });
  }
  if (post.instagramPostId) {
    // Prefer the stored permalink; fall back to deriving it from the media ID
    // Pass postType so Reels get /reel/ path and Stories are skipped
    const igUrl = post.instagramPermalink || instagramMediaIdToUrl(post.instagramPostId, post.postType);
    if (igUrl && !links.find(l => l.url === igUrl))
      links.push({ url: igUrl, label: 'Instagram', platform: 'instagram' });
  }
  if (post.youtubePostId) {
    const ytUrl = `https://www.youtube.com/watch?v=${post.youtubePostId}`;
    if (!links.find(l => l.url === ytUrl)) links.push({ url: ytUrl, label: 'YouTube', platform: 'youtube' });
  }
  if (post.linkedinPostId) {
    const liUrl = `https://www.linkedin.com/feed/update/${post.linkedinPostId}`;
    if (!links.find(l => l.url === liUrl)) links.push({ url: liUrl, label: 'LinkedIn', platform: 'linkedin' });
  }
  if (post.twitterPostId) {
    const twUrl = `https://twitter.com/i/web/status/${post.twitterPostId}`;
    if (!links.find(l => l.url === twUrl)) links.push({ url: twUrl, label: 'Twitter', platform: 'twitter' });
  }
  return links;
};

// ── Content item card ─────────────────────────────────────────────────────────
const ContentItemCard = ({ assignment, scheduledPosts, calendarName, isExpanded, onToggle, liveMetrics }) => {
  const platforms = [...new Set(
    [
      ...(Array.isArray(assignment.platforms) ? assignment.platforms.flat() : []),
      assignment.platform,
      ...scheduledPosts.map(p => p.platform),
    ].filter(p => p && typeof p === 'string').map(p => p.toLowerCase().trim())
  )];

  // Published posts: either from live metrics cache or direct scheduledPosts match
  const publishedPosts = liveMetrics?.posts?.length > 0
    ? liveMetrics.posts
    : scheduledPosts.filter(p => p.status === 'published' || p.publishedAt);

  const metricsLoading = liveMetrics?.loading === true;

  // Posts to show in metrics panel: prefer live-enriched posts, fall back to all matched posts
  // Deduplicate by _id as final safety net
  const metricsPosts = (() => {
    const raw = liveMetrics?.posts?.length > 0
      ? liveMetrics.posts
      : scheduledPosts.filter(p => p.status === 'published' || p.publishedAt || p.metrics);
    const seen = new Set();
    return raw.filter(p => {
      const key = p._id || `${(Array.isArray(p.platform) ? p.platform[0] : p.platform)}|${p.publishedAt || p.scheduledAt}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  })();

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-4 p-5">
        <Thumbnail url={assignment.thumbnail} />
        <div className="flex-1 min-w-0">
          {calendarName && (
            <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {calendarName}
            </p>
          )}
          <h3 className="text-[15px] font-bold text-gray-900 mb-1.5 leading-snug">
            {assignment.itemTitle || assignment.caption?.slice(0, 70) || `Assignment …${assignment.assignmentId?.slice(-6)}`}
          </h3>
          <div className="flex items-center gap-2.5 flex-wrap text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Created {assignment.firstSubmittedAt
                ? new Date(assignment.firstSubmittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </span>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${getAvatarColor(assignment.creatorName)}`}>
              {getInitials(assignment.creatorName)}
            </div>
            <span className="font-medium text-gray-700">{assignment.creatorName}</span>
          </div>
          {/* Published indicator + per-platform links */}
          {publishedPosts.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold">
                <CheckCircle className="w-3 h-3" />
                Published
              </span>
              {publishedPosts[0]?.publishedAt && (
                <span className="text-[10px] text-gray-400">
                  {new Date(publishedPosts[0].publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              {/* Direct links to each platform post */}
              {publishedPosts.flatMap(getPostLinks).filter((l, i, arr) => arr.findIndex(x => x.url === l.url) === i).map((link, li) => (
                <a
                  key={li}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  title={`Open on ${link.label}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  {link.label}
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex flex-wrap gap-1 justify-end">
            {platforms.map(p => <PlatformPill key={p} platform={p} />)}
          </div>
          <MediaTypeBadge mediaType={assignment.mediaType} slideCount={assignment.slideCount} />
        </div>
      </div>

      {/* Collapsed state */}
      {!isExpanded && (
        <div className="px-5 pb-4 border-t border-gray-50 pt-3">
          <button onClick={onToggle}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors">
            <ChevronDown className="w-4 h-4" />
            Expand to view versions and metrics
          </button>
        </div>
      )}

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Versions panel */}
            <div className="p-5 md:border-r border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Versions ({assignment.totalVersions})
              </p>
              <div className="space-y-3">
                {assignment.versions.map(v => (
                  <VersionRow key={v.versionId || v.versionNumber} version={v} />
                ))}
              </div>
            </div>

            {/* Metrics panel */}
            <div className="p-5 border-t md:border-t-0 border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5" />
                Performance Metrics
                {metricsLoading && <Loader2 className="w-3 h-3 animate-spin ml-1 text-blue-400" />}
              </p>
              {metricsLoading ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <Loader2 className="w-8 h-8 mb-2 animate-spin text-blue-300" />
                  <p className="text-xs text-gray-400">Loading live metrics…</p>
                </div>
              ) : metricsPosts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                  <Eye className="w-8 h-8 mb-2" />
                  <p className="text-xs text-gray-400">No published posts found</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {metricsPosts.map((post, i) => {
                    const postLinks = getPostLinks(post);
                    return (
                      <div key={post._id || i}>
                        {/* Published timestamp + direct link */}
                        {(post.publishedAt || postLinks.length > 0) && (
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            {post.publishedAt && (
                              <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                Published {new Date(post.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            )}
                            {postLinks.map((link, li) => (
                              <a
                                key={li}
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                title={`Open ${link.label} post`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 transition-colors"
                              >
                                View on {link.label}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ))}
                          </div>
                        )}
                        <PlatformMetricsSection post={post} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Collapse button */}
          <div className="px-5 py-3 border-t border-gray-100">
            <button onClick={onToggle}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors">
              <ChevronUp className="w-4 h-4" />
              Collapse
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SummaryReport() {
  const { currentUser } = useAuth();

  // Filters
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [contentItems, setContentItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');

  // Report state
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [visibleCount, setVisibleCount] = useState(5);

  // Live scheduled posts fetched directly from the posts API (same source as CustomerDetailsView)
  const [liveScheduledPosts, setLiveScheduledPosts] = useState([]);
  // Per-assignment live metrics cache: assignmentId -> { loading, posts }
  const [liveMetricsCache, setLiveMetricsCache] = useState({});
  const fetchedMetricsRef = useRef(new Set());

  const reportRef = useRef(null);

  // ── Load customers on mount ───────────────────────────────────
  useEffect(() => {
    const adminId = currentUser?._id || currentUser?.id;
    if (!adminId) return;

    // Use assigned customers for this admin
    fetch(`${API_URL}/admin/assigned-customers?adminId=${adminId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => {
        // Fallback: fetch all customers
        fetch(`${API_URL}/api/customers`)
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(data => setCustomers(Array.isArray(data) ? data : []))
          .catch(() => setCustomers([]));
      });
  }, [currentUser]);

  // ── Load calendars when customer changes ─────────────────────
  useEffect(() => {
    setCalendars([]);
    setSelectedCalendar('');
    setContentItems([]);
    setSelectedItem('');
    if (!selectedCustomer) return;

    fetch(`${API_URL}/calendars/customer/${selectedCustomer}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setCalendars(Array.isArray(data) ? data : []))
      .catch(() => setCalendars([]));
  }, [selectedCustomer]);

  // ── Load content items when calendar changes ──────────────────
  useEffect(() => {
    setContentItems([]);
    setSelectedItem('');
    if (!selectedCalendar) return;

    fetch(`${API_URL}/api/admin/summary-report/items?calendarId=${selectedCalendar}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setContentItems(Array.isArray(data) ? data : []))
      .catch(() => setContentItems([]));
  }, [selectedCalendar]);

  // ── Generate report ───────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!selectedCustomer) {
      setError('Please select a customer.');
      return;
    }
    setError('');
    setLoading(true);
    setReport(null);
    try {
      const params = new URLSearchParams({ customerId: selectedCustomer });
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate)   params.set('toDate', toDate);
      if (selectedCalendar) params.set('calendarId', selectedCalendar);
      if (selectedItem)     params.set('itemId', selectedItem);

      // Fetch report and live posts in parallel to avoid the race condition where
      // setReport fires the auto-fetch useEffect before liveScheduledPosts is ready.
      const [reportRes, postsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/summary-report?${params.toString()}`),
        fetch(`${API_URL}/api/scheduled-posts?customerId=${encodeURIComponent(selectedCustomer)}`).catch(() => null),
      ]);
      if (!reportRes.ok) throw new Error(`HTTP ${reportRes.status}`);
      const [data, postsDataRaw] = await Promise.all([
        reportRes.json(),
        postsRes?.ok ? postsRes.json().catch(() => null) : Promise.resolve(null),
      ]);
      const postsData = Array.isArray(postsDataRaw) ? postsDataRaw : [];

      // Reset cache BEFORE updating state so the useEffect that fires on the
      // combined render sees a clean slate and fetches all assignments.
      setLiveMetricsCache({});
      fetchedMetricsRef.current = new Set();
      // Set both in the same synchronous block — React 18 batches them into
      // a single render, so postsByItem is fully populated on the first fire.
      setReport(data);
      setLiveScheduledPosts(postsData);
    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCustomer, fromDate, toDate, selectedCalendar, selectedItem]);

  // ── Download PDF ──────────────────────────────────────────────
  const handleDownloadPDF = useCallback(async () => {
    if (!report) return;
    setPdfLoading(true);
    try {
      const customerObj = customers.find(c => (c._id || c.id) === selectedCustomer);
      const customerName = customerObj?.businessName || customerObj?.name || 'Customer';

      // ── Resolve calendar data (backend report + frontend state fallback) ─
      const calendarObj = report.calendar ||
        calendars.find(c => (c._id || c.id) === selectedCalendar) || null;

      // ── Pre-load thumbnails via backend proxy ─────────────────
      const thumbCache = {};
      const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const tryLoadImg = async (url) => {
        if (!url || thumbCache[url] !== undefined) return;
        try {
          const resp = await fetch(`${API}/api/admin/summary-report/proxy-image?url=${encodeURIComponent(url)}`);
          if (!resp.ok) { thumbCache[url] = null; return; }
          const json = await resp.json();
          thumbCache[url] = json.data || null;
        } catch { thumbCache[url] = null; }
      };
      const allThumbUrls = report.assignments.flatMap(a => {
        const urls = [];
        if (a.thumbnail) urls.push(a.thumbnail);
        if (Array.isArray(a.thumbnails)) urls.push(...a.thumbnails.filter(Boolean));
        return urls;
      });
      await Promise.all(allThumbUrls.map(tryLoadImg));

      // ── jsPDF setup ───────────────────────────────────────────
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = 210, PH = 297, M = 14, CW = PW - M * 2;
      let y = 0;

      // ── Colour palette ────────────────────────────────────────
      const C = {
        navy:     [10,  17,  40],
        navyMid:  [15,  28,  65],
        navyLight:[22,  40,  90],
        cyan:     [6,  182, 212],
        cyanPale: [207, 250, 254],
        white:    [255, 255, 255],
        dark:     [15,  23,  42],
        slate:    [51,  65,  85],
        gray:     [100, 116, 139],
        muted:    [148, 163, 184],
        border:   [226, 232, 240],
        cardBg:   [248, 250, 252],
        blue:     [37,  99,  235],
        bluePale: [219, 234, 254],
        indigo:   [79,  70,  229],
        green:    [22,  163,  74],
        greenPale:[220, 252, 231],
        amber:    [217, 119,   6],
        amberPale:[254, 243, 199],
        red:      [220,  38,  38],
        redPale:  [254, 226, 226],
        pink:     [219,  39, 119],
        pinkPale: [252, 231, 243],
        teal:     [13,  148, 136],
        sky:      [14,  165, 233],
        purple:   [109,  40, 217],
      };

      const sf  = a => doc.setFillColor(...a);
      const ss  = a => doc.setDrawColor(...a);
      const sc  = a => doc.setTextColor(...a);
      const font = (s = 'normal', sz = 10) => { doc.setFont('helvetica', s); doc.setFontSize(sz); };

      const sanitize = str => {
        if (!str) return '';
        return str
          .replace(/[\u2013\u2014]/g, '-')
          .replace(/[\u2018\u2019]/g, "'")
          .replace(/[\u201C\u201D]/g, '"')
          .replace(/\u2026/g, '...')
          .replace(/[^\x00-\xFF]/g, '')
          .trim();
      };

      const fmtNum = n => {
        if (n === undefined || n === null || n === '—') return '—';
        const num = Number(n);
        if (isNaN(num)) return String(n);
        if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
        if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
        return num.toLocaleString();
      };

      const fmtDateShort = d => {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      };

      const checkY = (need = 20) => {
        if (y + need > PH - 18) { doc.addPage(); y = M + 4; }
      };

      // ── Section heading (cyan label + underline) ──────────────
      const sectionLabel = (text) => {
        checkY(14);
        font('bold', 9.5); sc(C.cyan);
        doc.text(text.toUpperCase(), M, y + 6.5);
        y += 8;
        ss(C.cyan); doc.setLineWidth(0.35);
        doc.line(M, y, PW - M, y);
        y += 6;
      };

      // ── Platform maps ─────────────────────────────────────────
      const pColMap  = { instagram: C.pink, facebook: C.blue, linkedin: C.sky, twitter: C.muted, youtube: C.red };
      const platName = { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', twitter: 'Twitter/X', youtube: 'YouTube' };

      // ── Status pill config ────────────────────────────────────
      const getStatusStyle = status => {
        const s = (status || '').toLowerCase();
        return ({
          published:          { bg: C.greenPale, tc: C.green,  label: 'PUBLISHED'  },
          approved:           { bg: C.greenPale, tc: C.green,  label: 'APPROVED'   },
          rejected:           { bg: C.redPale,   tc: C.red,    label: 'REJECTED'   },
          submitted:          { bg: C.amberPale, tc: C.amber,  label: 'IN REVIEW'  },
          in_review:          { bg: C.amberPale, tc: C.amber,  label: 'IN REVIEW'  },
          revision_requested: { bg: C.amberPale, tc: C.amber,  label: 'REVISION'   },
          pending:            { bg: C.cardBg,    tc: C.muted,  label: 'PENDING'    },
          publishing:         { bg: C.bluePale,  tc: C.blue,   label: 'PUBLISHING' },
        })[s] || { bg: C.cardBg, tc: C.muted, label: (status || '—').replace(/_/g, ' ').toUpperCase() };
      };

      // ── Enrich posts from live cache ──────────────────────────
      const pdfAllEnriched = Object.values(liveMetricsCache).flatMap(c => c?.posts || []);
      const pdfEnrichedById = {};
      pdfAllEnriched.forEach(p => { if (p._id) pdfEnrichedById[p._id] = p; });
      const pdfMergedPosts = (report.scheduledPosts || []).map(p =>
        pdfEnrichedById[p._id] ? { ...p, metrics: pdfEnrichedById[p._id].metrics || p.metrics } : p
      );
      const pdfByItemId = {}, pdfByItemTitle = {};
      for (const post of pdfMergedPosts) {
        const itemId = post.itemId || post.item_id || post.contentId;
        if (itemId) { if (!pdfByItemId[itemId]) pdfByItemId[itemId] = []; pdfByItemId[itemId].push(post); }
        const tKey = (post.itemTitle || post.item_name || '').toLowerCase().trim();
        if (tKey) { if (!pdfByItemTitle[tKey]) pdfByItemTitle[tKey] = []; pdfByItemTitle[tKey].push(post); }
      }
      const getPdfPosts = (assignment) => {
        const cached = liveMetricsCache[assignment.assignmentId];
        if (cached?.posts?.length > 0) return cached.posts;
        if (assignment.itemId) { const byId = pdfByItemId[assignment.itemId]; if (byId?.length) return byId; }
        const tKey = (assignment.itemTitle || '').toLowerCase().trim();
        if (tKey) { const byTitle = pdfByItemTitle[tKey]; if (byTitle?.length) return byTitle; }
        return report.assignments.length === 1 ? pdfMergedPosts : [];
      };

      const totalItems   = report.assignments.length;
      const calendarName = sanitize(calendarObj?.name || '');

      // Track which assignment starts on which page (for footer)
      const asmPageMap = []; // [{ assignmentIdx, startPage }]

      // ── RENDER EACH ASSIGNMENT AS ITS OWN SECTION ─────────────
      for (let ai = 0; ai < report.assignments.length; ai++) {
        const assignment = report.assignments[ai];
        try {

        if (ai > 0) { doc.addPage(); y = 0; }
        const sectionStartPage = doc.internal.getNumberOfPages();
        asmPageMap.push({ assignmentIdx: ai, startPage: sectionStartPage });

        // ── HEADER BAND ────────────────────────────────────────
        const HEADER_H = 55;
        sf(C.navy);  doc.rect(0, 0, PW, HEADER_H, 'F');
        sf(C.navyLight); doc.circle(PW - 5, -8, 40, 'F');
        sf(C.navyMid);   doc.circle(PW + 8, HEADER_H - 2, 22, 'F');

        // Badge
        const badgeText = 'CONTENT PERFORMANCE REPORT';
        font('bold', 8); sc(C.cyanPale);
        const badgeW = doc.getTextWidth(badgeText) + 10;
        sf(C.navyLight); doc.roundedRect(M, 8, badgeW, 7.5, 3, 3, 'F');
        doc.text(badgeText, M + 5, 13.5);

        // Title (customer or calendar name)
        const bigTitle = sanitize(customerName);
        font('bold', 24); sc(C.white);
        const titleLines = doc.splitTextToSize(bigTitle, CW - 20).slice(0, 2);
        doc.text(titleLines, M, 30);

        // Subtitle
        const subtitleY = 30 + titleLines.length * 10;
        font('normal', 11); sc([147, 197, 253]);
        doc.text(`Content Calendar: ${calendarName || '—'}`, M, subtitleY);

        // Meta row at bottom of header
        const metaY = HEADER_H - 10;
        const periodVal = (report.filters?.fromDate && report.filters?.toDate)
          ? `${report.filters.fromDate} – ${report.filters.toDate}`
          : (report.filters?.fromDate || report.filters?.toDate || 'All dates');
        const metaCols = [
          { label: 'REPORT GENERATED', value: new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { label: 'PERIOD',           value: sanitize(periodVal) },
          { label: 'ITEMS INCLUDED',   value: `${ai + 1} of ${totalItems}` },
        ];
        const colW3 = CW / 3;
        metaCols.forEach((col, ci) => {
          const cx = M + ci * colW3;
          font('normal', 7.5); sc(C.muted);
          doc.text(col.label, cx, metaY);
          font('bold', 10); sc(C.white);
          doc.text(col.value, cx, metaY + 6);
        });

        y = HEADER_H + 8;

        // ── CALENDAR & ITEM INFO ──────────────────────────────
        sectionLabel('Calendar & Item Info');

        const col1X = M, col2X = M + CW / 2 + 3;
        const halfW  = CW / 2 - 3;

        // Row 1: Calendar Name | Calendar Created
        font('normal', 8.5); sc(C.muted);
        doc.text('CALENDAR NAME',    col1X, y + 5);
        doc.text('CALENDAR CREATED', col2X, y + 5);
        y += 7;
        font('bold', 11.5); sc(C.dark);
        const calNameLines = doc.splitTextToSize(calendarName || 'N/A', halfW).slice(0, 2);
        doc.text(calNameLines, col1X, y + 5.5);
        const calCreatedStr = calendarObj?.createdAt ? sanitize(fmtDateShort(calendarObj.createdAt)) : 'N/A';
        doc.text(calCreatedStr, col2X, y + 5.5);
        y += Math.max(calNameLines.length * 6.5, 6.5) + 7;

        // Row 2: Item Name | Item Created
        checkY(16);
        font('normal', 8.5); sc(C.muted);
        doc.text('ITEM NAME',    col1X, y + 5);
        doc.text('ITEM CREATED', col2X, y + 5);
        y += 7;
        font('bold', 11.5); sc(C.dark);
        const itemName = sanitize(assignment.itemTitle || report.contentItem?.title || '—');
        const itemNameLines = doc.splitTextToSize(itemName, halfW).slice(0, 2);
        doc.text(itemNameLines, col1X, y + 5.5);
        const itemCreated = fmtDateShort(assignment.firstSubmittedAt || report.contentItem?.createdAt);
        doc.text(sanitize(itemCreated), col2X, y + 5.5);
        y += Math.max(itemNameLines.length * 6.5, 6.5) + 8;

        // Platforms row
        const asmPlatforms = [...new Set([
          ...(Array.isArray(assignment.platforms) ? assignment.platforms.flat() : []),
          ...(Array.isArray(assignment.platform)  ? assignment.platform : (assignment.platform ? [String(assignment.platform)] : [])),
        ].filter(p => p && typeof p === 'string').map(p => p.toLowerCase().trim()))];

        if (asmPlatforms.length > 0) {
          checkY(16);
          font('normal', 8.5); sc(C.muted);
          doc.text('PLATFORMS', M, y + 5);
          y += 7;
          let pillX = M;
          for (const pl of asmPlatforms) {
            const plLower = pl.toLowerCase();
            const plLabel = platName[plLower] || pl;
            const dotColor = pColMap[plLower] || C.blue;
            font('normal', 10); sc(C.dark);
            const pillW = doc.getTextWidth(plLabel) + 15;
            if (pillX + pillW > PW - M) break;
            sf(C.cardBg); ss(C.border); doc.setLineWidth(0.2);
            doc.roundedRect(pillX, y, pillW, 9, 4.5, 4.5, 'FD');
            sf(dotColor); doc.circle(pillX + 6, y + 4.5, 2.5, 'F');
            font('normal', 10); sc(C.dark);
            doc.text(plLabel, pillX + 10.5, y + 6.5);
            pillX += pillW + 3;
          }
          y += 13;
        }
        y += 5;

        // ── CONTENT CREATOR ───────────────────────────────────
        sectionLabel('Content Creator');
        checkY(22);

        const creatorName = sanitize(assignment.creatorName || '—');
        const creatorEmail = sanitize(assignment.creatorEmail || '');
        const AVATAR_R = 9;
        const avatarCX = M + AVATAR_R, avatarCY = y + AVATAR_R;

        // Avatar background circle
        sf(C.blue); doc.circle(avatarCX, avatarCY, AVATAR_R, 'F');
        font('bold', 10); sc(C.white);
        doc.text(getInitials(creatorName), avatarCX, avatarCY + 3.5, { align: 'center' });

        // Creator info
        font('bold', 13); sc(C.dark);
        doc.text(creatorName, M + AVATAR_R * 2 + 5, y + 8);
        font('normal', 10); sc(C.gray);
        doc.text(creatorEmail || 'Content Creator', M + AVATAR_R * 2 + 5, y + 15);
        y += AVATAR_R * 2 + 8;

        // ── THUMBNAIL / MEDIA ─────────────────────────────────
        const allThumbs = [
          assignment.thumbnail,
          ...(Array.isArray(assignment.thumbnails) ? assignment.thumbnails : []),
        ].filter(Boolean);
        const totalSlides  = assignment.slideCount || allThumbs.length || 1;
        const showSlideCnt = Math.min(allThumbs.length, 3);
        const extraSlides  = totalSlides > 3 ? totalSlides - 3 : 0;

        sectionLabel('Thumbnail / Media');
        checkY(38);

        const THUMB_SZ = 30, THUMB_GAP = 4;
        let thumbX = M;

        for (let ti = 0; ti < showSlideCnt; ti++) {
          const cached = thumbCache[allThumbs[ti]];
          if (cached) {
            try {
              const fmt = cached.startsWith('data:image/png') ? 'PNG' : 'JPEG';
              doc.addImage(cached, fmt, thumbX, y, THUMB_SZ, THUMB_SZ);
            } catch {
              sf(C.cardBg); ss(C.border); doc.setLineWidth(0.2);
              doc.roundedRect(thumbX, y, THUMB_SZ, THUMB_SZ, 2, 2, 'FD');
            }
          } else {
            sf(C.cardBg); ss(C.border); doc.setLineWidth(0.2);
            doc.roundedRect(thumbX, y, THUMB_SZ, THUMB_SZ, 2, 2, 'FD');
          }
          // Slide label overlay at bottom
          sf(C.navy); doc.rect(thumbX, y + THUMB_SZ - 8, THUMB_SZ, 8, 'F');
          font('bold', 7); sc(C.cyanPale);
          doc.text(`SLIDE ${ti + 1}`, thumbX + THUMB_SZ / 2, y + THUMB_SZ - 2.5, { align: 'center' });
          thumbX += THUMB_SZ + THUMB_GAP;
        }

        // "+N MORE" box
        if (extraSlides > 0) {
          sf([230, 236, 245]); ss(C.border); doc.setLineWidth(0.2);
          doc.roundedRect(thumbX, y, THUMB_SZ, THUMB_SZ, 2, 2, 'FD');
          font('bold', 12); sc(C.gray);
          doc.text(`+${extraSlides}`, thumbX + THUMB_SZ / 2, y + THUMB_SZ / 2 - 1, { align: 'center' });
          font('bold', 8); sc(C.muted);
          doc.text('MORE', thumbX + THUMB_SZ / 2, y + THUMB_SZ / 2 + 6, { align: 'center' });
        }

        y += THUMB_SZ + 5;

        // Media type caption
        const mt     = (assignment.mediaType || 'image').toLowerCase();
        const mtExt  = 'JPG';
        const mtLine = mt === 'carousel'
          ? `Type: Carousel · ${totalSlides} Slides · ${mtExt}`
          : mt === 'video' ? 'Type: Video' : `Type: Image · ${totalSlides} Slide · ${mtExt}`;
        font('normal', 9.5); sc(C.gray);
        doc.text(mtLine, M, y);
        y += 11;

        // ── VERSION HISTORY ───────────────────────────────────
        if (assignment.versions?.length > 0) {
          sectionLabel('Version History');

          for (const version of assignment.versions) {
            const vs = getStatusStyle(version.status);
            checkY(18);

            // Version header row
            const verDate  = version.submittedAt ? ` — ${fmtDateShort(version.submittedAt)}` : '';
            const verLabel = `Version ${version.versionNumber}${verDate}`;

            sf(C.white); ss(C.border); doc.setLineWidth(0.3);
            doc.roundedRect(M, y, CW, 11.5, 2, 2, 'FD');

            font('bold', 10.5); sc(C.dark);
            doc.text(sanitize(verLabel), M + 5, y + 7.5);

            // Status badge (right-aligned)
            font('bold', 9); sc(vs.tc);
            const pillW = doc.getTextWidth(vs.label) + 11;
            sf(vs.bg); ss(vs.tc); doc.setLineWidth(0.25);
            doc.roundedRect(PW - M - pillW - 2, y + 2, pillW, 7.5, 1.5, 1.5, 'FD');
            doc.text(vs.label, PW - M - pillW / 2 - 2, y + 7, { align: 'center' });

            y += 14;

            const isApproved = (version.status || '').toLowerCase() === 'approved';

            if (isApproved) {
              // Approved: caption with left green accent bar
              if (version.caption) {
                checkY(20);
                const captionLines = doc.splitTextToSize(sanitize(version.caption), CW - 12).slice(0, 6);
                const capH = captionLines.length * 6.5 + 6;
                sf(C.green); doc.rect(M + 2, y, 2.5, capH, 'F');
                font('normal', 10.5); sc(C.slate);
                doc.text(captionLines, M + 8, y + 6);
                y += capH + 2;
              }
              // Hashtag chips
              if (version.hashtags) {
                checkY(16);
                const tags = sanitize(version.hashtags).split(/\s+/).filter(t => t.startsWith('#') || t.length > 0).slice(0, 10);
                let tagX = M + 4, tagBaseY = y;
                for (const tag of tags) {
                  const tagW = doc.getTextWidth(tag) + 9;
                  if (tagX + tagW > PW - M - 4) { tagX = M + 4; tagBaseY += 11; checkY(11); }
                  sf(C.bluePale); ss(C.bluePale); doc.setLineWidth(0);
                  doc.roundedRect(tagX, tagBaseY, tagW, 8, 4, 4, 'F');
                  font('normal', 9); sc(C.blue);
                  doc.text(tag, tagX + 4.5, tagBaseY + 5.8);
                  tagX += tagW + 3;
                }
                y = tagBaseY + 12;
              }
            } else {
              // Non-approved: show feedback quote
              const latestCmt = version.comments?.[version.comments.length - 1];
              const feedback  = version.rejectionReason || version.approvalNotes || latestCmt?.comment || latestCmt?.text;
              const feedAuthor = latestCmt?.authorName || latestCmt?.authorEmail;
              if (feedback) {
                checkY(16);
                const feedText  = `"${sanitize(feedback)}"${feedAuthor ? ` — ${sanitize(feedAuthor)}` : ''}`;
                const feedLines = doc.splitTextToSize(feedText, CW - 10).slice(0, 3);
                font('normal', 10); sc(C.gray);
                doc.text(feedLines, M + 5, y + 5.5);
                y += feedLines.length * 6.5 + 5;
              }
            }
            y += 4;
          }
          y += 2;
        }

        // ── PERFORMANCE METRICS ───────────────────────────────
        const asmAllPosts     = getPdfPosts(assignment);
        const asmMetricsPosts = asmAllPosts.filter(p => p.status === 'published' || p.publishedAt || p.metrics);

        if (asmMetricsPosts.length > 0) {
          checkY(55);
          sectionLabel('Performance Metrics');

          // Aggregate
          let totReach = 0, totLikes = 0, totComments = 0, totShares = 0, totImpr = 0, totSaves = 0;
          const platAgg = {}; // { platform: { likes } }
          for (const post of asmMetricsPosts) {
            const mm   = post.metrics || {};
            const plat = (Array.isArray(post.platform) ? post.platform[0] : (post.platform || '')).toLowerCase();
            totLikes    += mm.likes    || 0;
            totComments += mm.comments || 0;
            totShares   += mm.shares   || 0;
            totReach    += mm.reach    || mm.impressions || 0;
            totImpr     += mm.impressions || mm.reach || 0;
            totSaves    += mm.saves    || mm.saved  || 0;
            if (!platAgg[plat]) platAgg[plat] = { likes: 0 };
            platAgg[plat].likes += mm.likes || 0;
          }
          const engRate = totReach > 0 ? ((totLikes + totComments + totShares) / totReach * 100).toFixed(2) : null;

          // ── 4 hero metric numbers (no card, just big numerals) ──
          checkY(30);
          const heroMetrics = [
            { label: 'TOTAL REACH', value: fmtNum(totReach || totImpr) },
            { label: 'LIKES',       value: fmtNum(totLikes)    },
            { label: 'COMMENTS',    value: fmtNum(totComments) },
            { label: 'SHARES',      value: fmtNum(totShares)   },
          ];
          const heroW = (CW - 9) / 4;
          heroMetrics.forEach((hm, i) => {
            const hx = M + i * (heroW + 3);
            font('bold', 22); sc(C.blue);
            doc.text(hm.value, hx + heroW / 2, y + 16, { align: 'center' });
            font('normal', 9); sc(C.muted);
            doc.text(hm.label, hx + heroW / 2, y + 23, { align: 'center' });
          });
          y += 32;

          // ── Platform bar chart ──────────────────────────────
          const platList = Object.keys(platAgg);
          if (platList.length > 0) {
            const maxLikes = Math.max(...platList.map(p => platAgg[p].likes), 1);
            const BAR_LABEL_W = 26, BAR_VAL_W = 28, BAR_MAX_W = CW - BAR_LABEL_W - BAR_VAL_W - 4;
            checkY(platList.length * 11 + 4);
            for (const plat of platList) {
              const plLabel  = platName[plat] || plat;
              const plColor  = pColMap[plat]  || C.blue;
              const plLikes  = platAgg[plat].likes;
              const barW     = plLikes > 0 ? Math.max((plLikes / maxLikes) * BAR_MAX_W, 2) : 0;

              font('normal', 10); sc(C.dark);
              doc.text(plLabel, M, y + 6.3);

              // Background track
              sf(C.border); ss(C.border); doc.setLineWidth(0);
              doc.roundedRect(M + BAR_LABEL_W, y, BAR_MAX_W, 9, 1.5, 1.5, 'FD');
              // Filled bar
              if (barW > 0) {
                sf(plColor);
                doc.roundedRect(M + BAR_LABEL_W, y, barW, 9, 1.5, 1.5, 'F');
              }
              // Value label
              font('normal', 9.5); sc(C.gray);
              doc.text(`${plLikes.toLocaleString()} likes`, PW - M, y + 6.3, { align: 'right' });
              y += 13;
            }
            y += 4;
          }

          // ── Bottom stats row (Impressions, Saves, Eng Rate) ──
          checkY(18);
          ss(C.border); doc.setLineWidth(0.25);
          doc.line(M, y, PW - M, y);
          y += 5;
          const bottomStats = [
            { label: 'IMPRESSIONS',       value: fmtNum(totImpr || totReach) },
            { label: 'SAVES / BOOKMARKS', value: fmtNum(totSaves)            },
            ...(engRate ? [{ label: 'ENGAGEMENT RATE', value: `${engRate}%` }] : []),
          ];
          const bsW = (CW - (bottomStats.length - 1) * 6) / bottomStats.length;
          bottomStats.forEach((bs, i) => {
            const bx = M + i * (bsW + 6);
            font('normal', 8.5); sc(C.muted);
            doc.text(bs.label, bx, y + 5);
            font('bold', 12); sc(C.dark);
            doc.text(bs.value, bx, y + 13);
          });
          y += 22;
        }

        } catch (asmErr) {
          console.warn('PDF: skipped assignment due to error', asmErr, assignment);
        }
      }

      // ── FOOTER on every page ──────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        // Find assignment for this page
        let asmIdx = 0;
        for (let k = asmPageMap.length - 1; k >= 0; k--) {
          if (asmPageMap[k].startPage <= p) { asmIdx = asmPageMap[k].assignmentIdx; break; }
        }
        const asmForPage = report.assignments[asmIdx];
        const itemTitle  = sanitize(asmForPage?.itemTitle || report.contentItem?.title || '');

        ss(C.border); doc.setLineWidth(0.3);
        doc.line(M, PH - 14, PW - M, PH - 14);
        font('normal', 9); sc(C.muted);
        doc.text(`${calendarName}${itemTitle ? ' · ' + itemTitle : ''}`, M, PH - 7);
        font('bold', 9); sc(C.blue);
        doc.text(`Page ${p} of ${totalPages}`, PW - M, PH - 7, { align: 'right' });
      }

      // ── Save ──────────────────────────────────────────────────
      const safeCustomer = sanitize(customerName).replace(/[^a-z0-9]/gi, '_');
      const safeCalendar = sanitize(report?.calendar?.name || 'Report').replace(/[^a-z0-9]/gi, '_');
      const dateStr      = new Date().toISOString().slice(0, 10);
      doc.save(`Content_Performance_Report_${safeCustomer}_${safeCalendar}_${dateStr}.pdf`);

    } catch (err) {
      console.error('PDF generation failed:', err);
      alert(`Failed to generate PDF: ${err?.message || err}`);
    } finally {
      setPdfLoading(false);
    }
  }, [customers, selectedCustomer, selectedCalendar, calendars, report, liveMetricsCache]);


  const handleClearFilters = useCallback(() => {
    setSelectedCustomer('');
    setFromDate('');
    setToDate('');
    setSelectedCalendar('');
    setSelectedItem('');
    setReport(null);
    setError('');
    setExpandedItems({});
    setVisibleCount(5);
    setLiveScheduledPosts([]);
    setLiveMetricsCache({});
    fetchedMetricsRef.current = new Set();
  }, []);

  // ── Fetch live analytics for published posts (mirrors CustomerDetailsView logic) ──
  const fetchLiveMetrics = useCallback(async (assignmentId, posts) => {
    if (fetchedMetricsRef.current.has(assignmentId)) return;
    fetchedMetricsRef.current.add(assignmentId);

    // Deduplicate by _id before processing to prevent multiple entries per post
    const seenIds = new Set();
    const publishedPosts = posts.filter(p => {
      if (!p._id) return p.status === 'published' || !!p.publishedAt;
      if (seenIds.has(p._id)) return false;
      seenIds.add(p._id);
      return p.status === 'published' || !!p.publishedAt;
    });
    if (publishedPosts.length === 0) {
      setLiveMetricsCache(prev => ({ ...prev, [assignmentId]: { loading: false, posts: [] } }));
      return;
    }

    setLiveMetricsCache(prev => ({ ...prev, [assignmentId]: { loading: true, posts: publishedPosts } }));

    const enrichedPosts = publishedPosts.map(p => ({ ...p }));

    for (let i = 0; i < enrichedPosts.length; i++) {
      const post = enrichedPosts[i];
      const platform = (post.platform || '').toLowerCase();
      let metrics = post.metrics || null;

      // ── Instagram ──────────────────────────────────────────────────────────
      if (platform === 'instagram') {
        const instagramId = post.instagramId || post.socialAccountId || post.pageId;
        const postMediaId = post.instagramPostId;
        if (instagramId && postMediaId) {
          try {
            const res = await fetch(`${API_URL}/api/analytics/data?platform=instagram&accountId=${encodeURIComponent(instagramId)}`);
            if (res.ok) {
              const json = await res.json();
              const docs = (Array.isArray(json) ? json : (json.docs || json.data || []))
                .filter(d => d.type === 'analytics_data' && d.platform === 'instagram')
                .sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));
              for (const snap of docs) {
                const found = (snap.media || []).find(m => m.id === postMediaId || m.id === String(postMediaId));
                if (found) {
                  metrics = {
                    likes:    found.likes    ?? found.like_count    ?? 0,
                    comments: found.comments ?? found.comments_count ?? 0,
                    shares:   found.shares   ?? 0,
                    saves:    found.saves    ?? found.saved ?? 0,
                    reach:    found.reach    ?? found.impressions ?? 0,
                  };
                  // Capture the permalink for direct link to the post
                  if (found.permalink) enrichedPosts[i].instagramPermalink = found.permalink;
                  break;
                }
              }
            }
          } catch { /* skip */ }
        }
      }

      // ── Facebook ───────────────────────────────────────────────────────────
      if (platform === 'facebook') {
        const fbPostId = post.facebookPostId;
        if (fbPostId && !fbPostId.startsWith('fb_shared_from_')) {
          const fbAccountId = post.pageId || fbPostId.split('_')[0];
          try {
            const res = await fetch(`${API_URL}/api/analytics/data?platform=facebook&accountId=${encodeURIComponent(fbAccountId)}`);
            if (res.ok) {
              const json = await res.json();
              const docs = (Array.isArray(json) ? json : (json.docs || json.data || []))
                .filter(d => d.type === 'analytics_data' && d.platform === 'facebook')
                .sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));
              for (const snap of docs) {
                const found = (snap.posts || []).find(p => p.id === fbPostId || p.id === String(fbPostId));
                if (found) {
                  metrics = {
                    likes:    found.likes    ?? found.reactionsTotal ?? 0,
                    comments: found.comments ?? 0,
                    shares:   found.shares   ?? 0,
                    clicks:   found.clicks   ?? 0,
                    reach:    found.reach    ?? found.impressions ?? 0,
                  };
                  break;
                }
              }
            }
          } catch { /* skip */ }
        }
      }

      // ── LinkedIn ───────────────────────────────────────────────────────────
      if (platform === 'linkedin') {
        const liPostId = post.linkedinPostId;
        if (liPostId) {
          const liAccountId = post.linkedinAccountId || post.organizationId;
          const liQuery = liAccountId
            ? `platform=linkedin&accountId=${encodeURIComponent(liAccountId)}`
            : `platform=linkedin&customerId=${encodeURIComponent(selectedCustomer)}`;
          try {
            const res = await fetch(`${API_URL}/api/analytics/data?${liQuery}`);
            if (res.ok) {
              const json = await res.json();
              const docs = (Array.isArray(json) ? json : (json.docs || json.data || []))
                .filter(d => d.type === 'analytics_data' && d.platform === 'linkedin')
                .sort((a, b) => new Date(b.collectedAt) - new Date(a.collectedAt));
              for (const snap of docs) {
                const found = (snap.posts || []).find(p => p.id === liPostId || p.id === String(liPostId));
                if (found) {
                  metrics = {
                    likes:        found.likes    ?? found.reactions ?? 0,
                    comments:     found.comments ?? 0,
                    shares:       found.shares   ?? 0,
                    impressions:  found.impressions ?? found.reach ?? 0,
                    reach:        found.reach    ?? 0,
                  };
                  break;
                }
              }
            }
          } catch { /* skip */ }
        }
      }

      enrichedPosts[i] = { ...post, metrics };
    }

    setLiveMetricsCache(prev => ({ ...prev, [assignmentId]: { loading: false, posts: enrichedPosts } }));
  }, [selectedCustomer]);

  const selectedCustomerObj = customers.find(c => (c._id || c.id) === selectedCustomer);
  const selectedCalendarObj = calendars.find(c => c._id === selectedCalendar);

  // Resolve calendar name: selected dropdown → report.calendar → first assignment's calendarId → state lookup
  const resolvedCalendarName = useMemo(() => {
    if (selectedCalendarObj?.name) return selectedCalendarObj.name;
    if (report?.calendar?.name) return report.calendar.name;
    const firstCalId = report?.assignments?.[0]?.calendarId;
    if (firstCalId) {
      const found = calendars.find(c => (c._id || c.id) === firstCalId);
      if (found?.name) return found.name;
    }
    return null;
  }, [selectedCalendarObj, report, calendars]);

  // Group scheduledPosts by itemId AND itemTitle — merge report posts with live fetched posts
  const postsByItem = useMemo(() => {
    if (!report) return { byId: {}, byTitle: {}, all: [] };

    // Start with report's posts, then add live posts (normalised), deduplicate by _id
    const combined = [...(report.scheduledPosts || [])];
    const existingIds = new Set(combined.map(p => p._id).filter(Boolean));
    for (const lp of liveScheduledPosts) {
      if (lp._id && existingIds.has(lp._id)) continue;
      // Normalise live post fields to match the report post shape
      combined.push({
        _id:            lp._id,
        platform:       lp.platform,
        itemId:         lp.item_id     || '',
        itemTitle:      lp.item_name   || '',
        caption:        lp.caption     || '',
        status:         lp.status,
        scheduledAt:    lp.scheduledAt,
        publishedAt:    lp.publishedAt,
        facebookPostId:     lp.facebookPostId     || null,
        instagramPostId:    lp.instagramPostId    || null,
        instagramId:        lp.instagramId        || null,
        instagramPermalink: lp.instagramPermalink || null,
        pageId:             lp.pageId             || null,
        linkedinPostId:     lp.linkedinPostId     || null,
        linkedinAccountId:  lp.linkedinAccountId  || lp.organizationId || null,
        youtubePostId:      lp.youtubePostId      || null,
        twitterPostId:      lp.twitterPostId      || null,
        postType:           lp.postType            || null,
        metrics:        lp.metrics     || null,
        // Keep raw fields for CDV-style matching
        item_id:        lp.item_id     || '',
        item_name:      lp.item_name   || '',
        contentId:      lp.contentId   || '',
      });
    }

    const byId = {}, byTitle = {};
    for (const post of combined) {
      const itemId = post.itemId || post.item_id;
      if (itemId) {
        if (!byId[itemId]) byId[itemId] = [];
        byId[itemId].push(post);
      }
      // Also index by contentId (CDV-style) — skip if same as itemId to avoid double-adding
      if (post.contentId && post.contentId !== itemId) {
        if (!byId[post.contentId]) byId[post.contentId] = [];
        byId[post.contentId].push(post);
      }
      const titleKey = (post.itemTitle || post.item_name || '').toLowerCase().trim();
      if (titleKey) {
        if (!byTitle[titleKey]) byTitle[titleKey] = [];
        byTitle[titleKey].push(post);
      }
    }
    return { byId, byTitle, all: combined };
  }, [report, liveScheduledPosts]);

  // Aggregate totals for summary cards
  const summaryTotals = useMemo(() => {
    if (!report) return { items: 0, versions: 0, engagements: 0, reach: 0 };

    // Prefer enriched posts from liveMetricsCache (have fresh analytics metrics).
    // Fall back to report posts that are not yet cached.
    const cachedPosts = Object.values(liveMetricsCache)
      .filter(v => !v.loading)
      .flatMap(v => v.posts || []);
    const cachedIds = new Set(cachedPosts.map(p => p._id).filter(Boolean));
    const fallbackPosts = (report.scheduledPosts || []).filter(p => !p._id || !cachedIds.has(p._id));
    const allPosts = [...cachedPosts, ...fallbackPosts];

    const engagements = allPosts.reduce((sum, p) => {
      if (!p.metrics) return sum;
      return sum + (p.metrics.likes || 0) + (p.metrics.comments || 0) + (p.metrics.shares || 0);
    }, 0);
    const reach = allPosts.reduce((sum, p) => {
      if (!p.metrics) return sum;
      return sum + (p.metrics.reach || p.metrics.impressions || 0);
    }, 0);
    return {
      items:        report.assignments?.length || 0,
      versions:     report.summary?.totalVersions || 0,
      engagements,
      reach,
    };
  }, [report, liveMetricsCache]);

  // ── Auto-fetch live metrics for all assignments once report + posts are ready ──
  useEffect(() => {
    if (!report || !report.assignments) return;
    report.assignments.forEach(assignment => {
      const titleKey = (assignment.itemTitle || '').toLowerCase().trim();
      const itemPosts = (() => {
        if (assignment.itemId) {
          const byId = postsByItem.byId[assignment.itemId];
          if (byId?.length) return byId;
        }
        if (titleKey) {
          const byTitle = postsByItem.byTitle[titleKey];
          if (byTitle?.length) return byTitle;
        }
        return report.assignments.length === 1 ? postsByItem.all : [];
      })();
      fetchLiveMetrics(assignment.assignmentId, itemPosts);
    });
  }, [report, postsByItem, fetchLiveMetrics]);

  return (
    <AdminLayout title="Content Summary Report">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

          {/* ── Breadcrumb + actions ── */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <span>Admin</span>
              <span className="text-gray-300">/</span>
              <span>Reports</span>
              <span className="text-gray-300">/</span>
              <span className="text-gray-800 font-medium">Content Summary Report</span>
              <span className="ml-1.5 bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Admin</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 border border-gray-300 bg-white text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
              {report && (
                <button
                  onClick={handleDownloadPDF}
                  disabled={pdfLoading}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
                >
                  {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Export PDF
                </button>
              )}
            </div>
          </div>

          {/* ── Filters card ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Customer */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Customer</label>
                <select
                  value={selectedCustomer}
                  onChange={e => { setSelectedCustomer(e.target.value); setReport(null); }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">— Select customer —</option>
                  {customers.map(c => (
                    <option key={c._id || c.id} value={c._id || c.id}>
                      {c.businessName || c.name || c.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Date range</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="flex-1 min-w-0 border border-gray-200 rounded-xl px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-gray-400 text-xs flex-shrink-0">→</span>
                  <input
                    type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="flex-1 min-w-0 border border-gray-200 rounded-xl px-2 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Content calendar */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Content calendar</label>
                <select
                  value={selectedCalendar}
                  onChange={e => { setSelectedCalendar(e.target.value); setReport(null); }}
                  disabled={!selectedCustomer}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">All calendars</option>
                  {calendars.map(cal => (
                    <option key={cal._id} value={cal._id}>{cal.name}</option>
                  ))}
                </select>
              </div>

              {/* Content item */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Content item</label>
                <select
                  value={selectedItem}
                  onChange={e => { setSelectedItem(e.target.value); setReport(null); }}
                  disabled={!selectedCalendar || contentItems.length === 0}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">All items</option>
                  {contentItems.map((item, i) => (
                    <option key={item.id || i} value={item.id || i}>
                      {item.title || item.description || `Item ${i + 1}`}
                      {item.date ? ` (${new Date(item.date).toLocaleDateString()})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
              <button
                onClick={handleClearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Clear filters
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !selectedCustomer}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Generate report
              </button>
            </div>

            {error && (
              <div className="mt-3 flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-4 py-2.5 text-sm border border-red-100">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
              <p className="text-sm text-gray-500 font-medium">Building your report…</p>
            </div>
          )}

          {/* ── Summary stat cards ── */}
          {report && !loading && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { icon: FileText,   iconCls: 'text-blue-500',    label: 'Content items',      value: summaryTotals.items },
                { icon: Layers,     iconCls: 'text-indigo-500',  label: 'Total versions',     value: summaryTotals.versions },
                { icon: Heart,      iconCls: 'text-rose-500',    label: 'Total engagements',  value: fmtNumUI(summaryTotals.engagements) },
                { icon: TrendingUp, iconCls: 'text-emerald-500', label: 'Total reach',        value: fmtNumUI(summaryTotals.reach) },
              ].map(card => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="bg-white border border-gray-200 rounded-2xl p-5">
                    <Icon className={`w-6 h-6 ${card.iconCls} mb-3`} />
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{card.label}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Report body ── */}
          {report && !loading && (
            <div ref={reportRef}>
              {/* Report title row */}
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {resolvedCalendarName || 'All Calendars'} — Report
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Showing {Math.min(visibleCount, report.assignments.length)} of {report.assignments.length} items
                    {selectedCustomerObj ? ` · Customer: ${selectedCustomerObj.businessName || selectedCustomerObj.name}` : ''}
                    {(fromDate || toDate)
                      ? ` · ${fromDate ? new Date(fromDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '…'} – ${toDate ? new Date(toDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '…'}`
                      : ''}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 border border-gray-200 bg-white text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50">
                    <AlignJustify className="w-3.5 h-3.5" />
                    Sort
                  </button>
                  <button className="flex items-center gap-1.5 border border-gray-200 bg-white text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50">
                    <Sliders className="w-3.5 h-3.5" />
                    Columns
                  </button>
                </div>
              </div>

              {/* Content item cards */}
              {report.assignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-2xl text-gray-400">
                  <FileText className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-base font-semibold text-gray-500">No content found</p>
                  <p className="text-sm mt-1">Try adjusting your filters.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {report.assignments.slice(0, visibleCount).map((assignment, ai) => {
                      // Match posts: itemId → contentId → itemTitle → all (if single item)
                      const titleKey = (assignment.itemTitle || '').toLowerCase().trim();
                      const itemPosts = (() => {
                        if (assignment.itemId) {
                          const byId = postsByItem.byId[assignment.itemId];
                          if (byId?.length) return byId;
                        }
                        if (titleKey) {
                          const byTitle = postsByItem.byTitle[titleKey];
                          if (byTitle?.length) return byTitle;
                        }
                        return report.assignments.length === 1 ? postsByItem.all : [];
                      })();
                      const isExpanded = expandedItems[assignment.assignmentId] !== false;
                      const liveMetrics = liveMetricsCache[assignment.assignmentId];
                      return (
                        <ContentItemCard
                          key={assignment.assignmentId}
                          assignment={assignment}
                          scheduledPosts={itemPosts}
                          calendarName={report.calendar?.name || ''}
                          isExpanded={isExpanded}
                          liveMetrics={liveMetrics}
                          onToggle={() => {
                            const nowExpanded = !isExpanded;
                            setExpandedItems(prev => ({
                              ...prev,
                              [assignment.assignmentId]: nowExpanded,
                            }));
                            // Kick off live metric fetch the first time an item is expanded
                            if (nowExpanded) {
                              fetchLiveMetrics(assignment.assignmentId, itemPosts);
                            }
                          }}
                        />
                      );
                    })}
                  </div>

                  {/* Load more */}
                  {visibleCount < report.assignments.length && (
                    <div className="flex items-center justify-center gap-3 mt-6 text-sm text-gray-500">
                      <span>Showing {visibleCount} of {report.assignments.length} items</span>
                      <button
                        onClick={() => setVisibleCount(v => v + 5)}
                        className="text-blue-600 font-semibold hover:underline"
                      >
                        Load more
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
