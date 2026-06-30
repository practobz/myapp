import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  MessageSquare, CalendarIcon, Instagram, Facebook, Linkedin, Youtube,
  AlertCircle, Eye, CheckCircle, Video, ExternalLink, Clock, Filter,
  LayoutGrid, List, Search, X, ChevronRight, FileText, TrendingUp,
  Send, Image, Play, Calendar, User, Sparkles, BarChart3, Download,
  UserCog, ChevronLeft, Shield, PlusCircle, ArrowUpCircle, Loader2,
  Heart, Edit, Trash2, Upload
} from 'lucide-react';
import ContentReview from './ContentReview';


// Helper to validate ID values
const isIdValid = (id) => id && id !== 'null' && id !== 'undefined' && id !== 'none' && id !== 'N/A';

const isVisibleToCustomerSubmission = (submission) => {
  if (!submission) return false;
  const stage = submission.submission_stage || submission.submissionStage || '';
  const status = submission.status || '';
  const sentToCustomerAt = submission.sent_to_customer_at || submission.sentToCustomerAt;
  const approvedByAdmin =
    submission.approved_by_admin === true ||
    status === 'approved_admin' ||
    status === 'approved_both' ||
    (status === 'approved' && !submission.approved_by_customer);
  const approvedByCustomer =
    submission.approved_by_customer === true ||
    status === 'approved_customer' ||
    status === 'approved_both';

  if (status === 'published' || submission.published === true) return true;
  if (approvedByCustomer) return true;

  // Support legacy direct customer submissions as in ContentReview.jsx
  const isLegacyDirectCustomerSubmission = stage === 'customer' && !sentToCustomerAt && !approvedByAdmin;
  if (isLegacyDirectCustomerSubmission) return true;

  return (stage === 'customer' || stage === 'approved') && (!!sentToCustomerAt || approvedByAdmin);
};

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

const PLATFORM_META = {
  facebook: { abbr: 'FB', cls: 'bg-blue-600', title: 'Facebook' },
  instagram: { abbr: 'IG', cls: 'bg-gradient-to-br from-purple-600 to-pink-500', title: 'Instagram' },
  youtube: { abbr: 'YT', cls: 'bg-red-600', title: 'YouTube' },
  linkedin: { abbr: 'LI', cls: 'bg-blue-800', title: 'LinkedIn' },
  twitter: { abbr: 'TW', cls: 'bg-sky-500', title: 'Twitter' },
  x: { abbr: 'X', cls: 'bg-gray-900', title: 'X' },
  tiktok: { abbr: 'TK', cls: 'bg-gray-800', title: 'TikTok' },
};

const normalizePlatformKey = (platform) => {
  const value = String(platform || '').trim().toLowerCase();
  if (!value) return null;
  if (value === 'x.com' || value === 'twitter.com') return 'x';
  if (value === 'twitter') return 'twitter';
  if (value === 'tik tok') return 'tiktok';
  return value;
};

const normalizePlatforms = (platformValue) => {
  if (!platformValue) return [];

  const rawValues = Array.isArray(platformValue)
    ? platformValue.flatMap(value => normalizePlatforms(value))
    : typeof platformValue === 'string'
      ? (() => {
        const matches = platformValue.match(/facebook|instagram|youtube|linkedin|twitter|x|tiktok/gi);
        if (matches?.length) return matches;
        return platformValue.split(',');
      })()
      : [platformValue];

  return [...new Set(rawValues
    .map(normalizePlatformKey)
    .filter(Boolean))];
};

const getPlatformDisplayName = (platform) => {
  const key = normalizePlatformKey(platform);
  if (!key) return '';
  return PLATFORM_META[key]?.title || key.charAt(0).toUpperCase() + key.slice(1);
};

const PlatformNameBadges = React.memo(({ platforms = [], tone = 'gray' }) => {
  if (!platforms.length) return null;

  const toneClass = tone === 'published'
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {platforms.map((platform) => (
        <span
          key={platform}
          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full border text-[11px] font-medium ${toneClass}`}
        >
          <PlatformIcon platform={platform} />
          <span>{getPlatformDisplayName(platform)}</span>
        </span>
      ))}
    </div>
  );
});
PlatformNameBadges.displayName = 'PlatformNameBadges';

// Platform logo icon component
const PlatformIcon = React.memo(({ platform }) => {
  const p = normalizePlatformKey(platform);
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
  if (p === 'tiktok') return <span className="text-[10px] font-semibold text-gray-700">TT</span>;
  return <span className="text-[10px] font-medium text-gray-600 capitalize">{platform}</span>;
});
PlatformIcon.displayName = 'PlatformIcon';

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

const PostTrendButton = React.memo(({ isLoading, isActive, onClick }) => (
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

const MiniTrendCharts = React.memo(({ platformData }) => {
  const combined = getCombinedTrendData(platformData).slice(-14);
  if (!combined.length) return null;
  const metrics = [
    { key: 'likes', color: '#EF4444', Icon: Heart, label: 'Likes' },
    { key: 'comments', color: '#3B82F6', Icon: MessageSquare, label: 'Comments' },
    { key: 'shares', color: '#22C55E', Icon: Send, label: 'Shares' },
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

const ExpandedTrendChart = React.memo(({ platformData, dateRange, onDateRangeChange, onClose }) => {
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
    <div className="mt-3 bg-blue-50/50 rounded-lg border border-blue-100 p-3 w-full" onClick={e => e.stopPropagation()}>
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
                  <span className="flex items-center gap-1 text-[10px] text-gray-600"><MessageSquare className="h-2.5 w-2.5 text-blue-500" />{totalComments.toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-[10px] text-gray-600"><Send className="h-2.5 w-2.5 text-green-500" />{totalShares.toLocaleString()}</span>
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

// Timeline component showing item lifecycle stages with dates
const ItemTimeline = ({ item, itemStatus, scheduledPosts = [], submissions = [], isAdmin = false }) => {
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

  let steps = [];
  let toneClasses = {};

  if (isAdmin) {
    const sortedSubmissions = [...submissions].sort(
      (a, b) => new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0)
    );
    const versionSteps = [];
    sortedSubmissions.forEach((s, idx) => {
      // The upload/version node showing the creator who uploaded this
      const creatorEmail = s.created_by || s.createdBy || s.creator_email || '';
      const label = creatorEmail ? `V${idx + 1} (${creatorEmail})` : `V${idx + 1}`;
      versionSteps.push({
        key: `v${idx + 1}`,
        label: label,
        done: hasReachedDate(s.created_at || s.createdAt),
        date: fmtDate(s.created_at || s.createdAt),
        tone: 'blue',
      });

      // Admin Approved Step
      const isAdminApproved = s.approved_by_admin === true || s.status === 'approved_admin' || s.status === 'approved_both' || (s.status === 'approved' && !s.approved_by_customer) || s.submission_stage === 'customer';
      if (isAdminApproved) {
        // Use the actual approver's name/email (stored when admin clicks approve),
        // NOT notify_admins which is just who was notified about the upload.
        const approverName = s.approved_by_admin_name || s.approved_by_admin_email || null;
        const approvedLabel = approverName ? `Admin Approved (${approverName})` : 'Admin Approved';
        versionSteps.push({
          key: `v${idx + 1}_admin_approved`,
          label: approvedLabel,
          done: true,
          date: fmtDate(s.approvedAt || s.updatedAt || s.created_at || s.createdAt),
          tone: 'green',
        });
      }

      // Sent to Customer Step
      if (s.submission_stage === 'customer') {
        versionSteps.push({
          key: `v${idx + 1}_sent_customer`,
          label: `Sent to Customer`,
          done: true,
          date: fmtDate(s.sent_to_customer_at || s.updatedAt || s.created_at || s.createdAt),
          tone: 'purple',
        });
      }
    });

    // Derive customer approval from submission or item status
    const customerApprovedSub = sortedSubmissions.length > 0 && (() => {
      const latest = sortedSubmissions[sortedSubmissions.length - 1];
      const isApproved = latest.approved_by_customer === true ||
        latest.status === 'approved_customer' ||
        latest.status === 'approved_both';
      const isReverted = latest.status === 'under_review' ||
        latest.status === 'sent_to_creator' ||
        latest.status === 'revision_requested' ||
        latest.status === 'rejected';
      return isApproved && !isReverted ? latest : null;
    })();

    const isCustomerApproved = !!customerApprovedSub ||
      itemStatus === 'published' ||
      item.status === 'published' ||
      item.published === true ||
      (item.reviewedAt && sortedSubmissions.length === 0);

    const customerApprovedAt = customerApprovedSub?.approvedAt ||
      customerApprovedSub?.updatedAt ||
      (isCustomerApproved ? (item.reviewedAt || item.publishedAt) : null);

    const customerApprovedDate = fmtDate(customerApprovedAt);
    const publishedAt = matchedPost?.publishedAt || item.publishedAt;

    // Order: Created → Assigned → Due → V1 → V2 → ... → Approved by Customer → Published
    steps = [
      { key: 'created', label: 'Created', done: hasReachedDate(item.createdAt), date: fmtDate(item.createdAt), tone: 'blue' },
      { key: 'assigned', label: 'Assigned', done: hasReachedDate(item.assignedAt), date: fmtDate(item.assignedAt), tone: 'blue' },
      { key: 'due', label: 'Due', done: hasReachedDate(item.date), date: fmtDate(item.date), tone: 'orange' },
      ...versionSteps,
      { key: 'reviewed', label: 'Approved by Customer', done: isCustomerApproved, date: customerApprovedDate, tone: 'blue' },
      { key: 'published', label: 'Published', done: hasReachedDate(publishedAt), date: fmtDate(publishedAt), tone: 'green' },
    ];

    toneClasses = {
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
        dateDone: 'text-amber-550',
        dateTodo: 'text-amber-200',
        lineDone: 'bg-amber-400',
        lineTodo: 'bg-amber-100',
      },
      green: {
        dotDone: 'bg-emerald-500',
        dotTodo: 'bg-emerald-100',
        labelDone: 'text-emerald-700 font-medium',
        labelTodo: 'text-emerald-300',
        dateDone: 'text-emerald-555',
        dateTodo: 'text-emerald-200',
        lineDone: 'bg-emerald-400',
        lineTodo: 'bg-emerald-100',
      },
      purple: {
        dotDone: 'bg-purple-500',
        dotTodo: 'bg-purple-100',
        labelDone: 'text-purple-700 font-medium',
        labelTodo: 'text-purple-300',
        dateDone: 'text-purple-550',
        dateTodo: 'text-purple-200',
        lineDone: 'bg-purple-400',
        lineTodo: 'bg-purple-100',
      },
    };
  } else {
    // Customer timeline logic (default)
    const submissionsWithContent = submissions.filter(s => {
      if (!isVisibleToCustomerSubmission(s)) return false;
      const media = s.media || s.images || s.files || s.imageUrls || s.mediaUrls || [];
      const hasMedia = Array.isArray(media) && media.length > 0;
      const hasVideo = !!(s.videoUrl || s.video_url);
      return hasMedia || hasVideo;
    });

    const versionSteps = submissionsWithContent.map((s, idx) => {
      // Customer view: just show V1, V2... without any email
      return {
        key: `v${idx + 1}`,
        label: `V${idx + 1}`,
        done: hasReachedDate(s.created_at || s.createdAt),
        date: fmtDate(s.created_at || s.createdAt),
        tone: 'blue',
      };
    });

    const sortedSubmissions = submissions
      .filter(isVisibleToCustomerSubmission)
      .sort(
        (a, b) => new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0)
      );

    const customerApprovedSub = sortedSubmissions.length > 0 && (() => {
      const latest = sortedSubmissions[sortedSubmissions.length - 1];
      const isApproved = latest.approved_by_customer === true ||
        latest.status === 'approved_customer' ||
        latest.status === 'approved_both';
      const isReverted = latest.status === 'under_review' ||
        latest.status === 'sent_to_creator' ||
        latest.status === 'revision_requested' ||
        latest.status === 'rejected';
      return isApproved && !isReverted ? latest : null;
    })();

    const isCustomerApproved = !!customerApprovedSub;

    const customerApprovedAt = customerApprovedSub?.approvedAt ||
      customerApprovedSub?.updatedAt || null;

    const customerApprovedDate = fmtDate(customerApprovedAt);
    const publishedAt = matchedPost?.publishedAt || item.publishedAt;

    steps = [
      { key: 'created', label: 'Created', done: hasReachedDate(item.createdAt), date: fmtDate(item.createdAt), tone: 'blue' },
      ...versionSteps,
      { key: 'reviewed', label: 'Approved by Customer', done: isCustomerApproved, date: customerApprovedDate, tone: 'green' },
      { key: 'published', label: 'Published', done: hasReachedDate(publishedAt), date: fmtDate(publishedAt), tone: 'purple' },
    ];

    toneClasses = {
      blue: {
        dotDone: 'bg-blue-500',
        dotTodo: 'bg-blue-100',
        labelDone: 'text-blue-700 font-medium',
        labelTodo: 'text-blue-355',
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
  }

  const layout = isAdmin ? {
    divClass: "flex items-start mt-2 overflow-x-auto pb-0.5 max-w-full no-scrollbar",
    labelClass: (step) => step.done ? (toneClasses[step.tone || 'blue']?.labelDone || 'text-blue-707 font-semibold') : (toneClasses[step.tone || 'blue']?.labelTodo || 'text-blue-300'),
    labelMargin: "mt-0.5",
    dateMargin: "mt-0.5",
    lineMargin: "mx-0.5",
    minWidth: "8px",
    datePlaceholder: "—"
  } : {
    divClass: "flex items-start mt-3 overflow-x-auto pb-1 max-w-full no-scrollbar",
    labelClass: (step) => step.done ? (toneClasses[step.tone || 'blue']?.labelDone || 'text-blue-705 font-semibold') : (toneClasses[step.tone || 'blue']?.labelTodo || 'text-blue-300'),
    labelMargin: "mt-1.5",
    dateMargin: "mt-1",
    lineMargin: "mx-1",
    minWidth: "12px",
    datePlaceholder: "—"
  };

  return (
    <div className={layout.divClass}>
      {steps.map((step, idx) => (
        <React.Fragment key={step.key}>
          <div className={`flex flex-col items-center flex-shrink-0 transition-opacity ${!step.done ? 'opacity-35' : ''}`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${step.done ? (toneClasses[step.tone || 'blue']?.dotDone || 'bg-blue-500') : (toneClasses[step.tone || 'blue']?.dotTodo || 'bg-blue-100')}`} />
            <span className={`text-[9px] leading-none ${layout.labelMargin} whitespace-nowrap ${layout.labelClass(step)}`}>
              {step.label}
            </span>
            <span className={`text-[8px] leading-none ${layout.dateMargin} whitespace-nowrap ${step.date ? (step.done ? (toneClasses[step.tone || 'blue']?.dateDone || 'text-blue-500') : (toneClasses[step.tone || 'blue']?.dateTodo || 'text-blue-200')) : 'text-transparent select-none'}`}>
              {step.date || layout.datePlaceholder}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`flex-1 h-px mt-1 ${layout.lineMargin} ${step.done && steps[idx + 1].done ? (toneClasses[steps[idx + 1].tone || 'blue']?.lineDone || 'bg-blue-400') : (toneClasses[steps[idx + 1].tone || 'blue']?.lineTodo || 'bg-blue-100')}`}
              style={{ minWidth: layout.minWidth }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

function ContentCalendar({
  adminCustomerId = null,
  isAdmin = false,
  calendars: propCalendars = null,
  scheduledPosts: propScheduledPosts = null,
  submissions: propSubmissions = null,
  loading: propLoading = null,
  customer: propCustomer = null,
  onAddItem = null,
  onEditCalendar = null,
  onDeleteCalendar = null,
  onAddCalendar = null,
  onEditItem = null,
  onDeleteItem = null,
  onUploadItem = null,
  onManualPublish = null,
  openContentDetail = null,
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get('filter') || 'all';
  const [selectedContent, setSelectedContent] = useState(null);
  const [statusFilter, setStatusFilter] = useState(initialFilter);

  // Fallbacks to props
  const [internalCalendars, setInternalCalendars] = useState([]);
  const [internalScheduledPosts, setInternalScheduledPosts] = useState([]);
  const [internalSubmissions, setInternalSubmissions] = useState([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalCustomer, setInternalCustomer] = useState(null);

  const calendars = propCalendars !== null ? propCalendars : internalCalendars;
  const scheduledPosts = propScheduledPosts !== null ? propScheduledPosts : internalScheduledPosts;
  const submissions = propSubmissions !== null ? propSubmissions : internalSubmissions;
  const loading = propLoading !== null ? propLoading : (propCalendars !== null ? false : internalLoading);
  const customer = propCustomer !== null ? propCustomer : internalCustomer;

  const setCalendars = propCalendars !== null ? () => { } : setInternalCalendars;
  const setScheduledPosts = propScheduledPosts !== null ? () => { } : setInternalScheduledPosts;
  const setSubmissions = propSubmissions !== null ? () => { } : setInternalSubmissions;
  const setLoading = propLoading !== null ? () => { } : setInternalLoading;
  const setCustomer = propCustomer !== null ? () => { } : setInternalCustomer;

  useEffect(() => {
    const filter = searchParams.get('filter');
    if (filter) {
      setStatusFilter(filter);
    }
  }, [searchParams]);

  const [selectedCalendarId, setSelectedCalendarId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');

  // —— Review comments modal ——————————————————————————————————————
  const [reviewItemId, setReviewItemId] = useState(null);

  let user = null;
  try { user = JSON.parse(localStorage.getItem('user')); } catch { user = null; }
  const customerId = adminCustomerId || user?.id || user?._id;
  const customerName = customer?.name || user?.name;

  // Trend logic for Admin view
  const [postTrendCache, setPostTrendCache] = useState({});
  const fetchedTrendItemsRef = useRef(new Set());
  const [expandedTrendItem, setExpandedTrendItem] = useState(null);
  const [trendDateRange, setTrendDateRange] = useState(7);

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
      const instagramId = matchedPost?.instagramId;
      const postMediaId = matchedPost?.instagramPostId;
      if (instagramId && postMediaId) {
        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL}/api/analytics/data?platform=instagram&accountId=${encodeURIComponent(instagramId)}`);
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

      const fbPostId = matchedPost?.facebookPostId;
      if (fbPostId && !fbPostId.startsWith('fb_shared_from_')) {
        const fbAccountId = matchedPost?.pageId || fbPostId.split('_')[0];
        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL}/api/analytics/data?platform=facebook&accountId=${encodeURIComponent(fbAccountId)}`);
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

      const liPostId = matchedPost?.linkedinPostId;
      if (liPostId) {
        const liAccountId = matchedPost?.linkedinAccountId || matchedPost?.organizationId;
        const liQuery = liAccountId
          ? `platform=linkedin&accountId=${encodeURIComponent(liAccountId)}`
          : `platform=linkedin&customerId=${encodeURIComponent(customerId)}`;
        try {
          const res = await fetch(`${process.env.REACT_APP_API_URL}/api/analytics/data?${liQuery}`);
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
  }, [scheduledPosts, customerId]);

  useEffect(() => {
    if (!isAdmin || scheduledPosts.length === 0) return;
    calendars.forEach(cal => {
      if (!cal?.contentItems) return;
      cal.contentItems.forEach((item, index) => {
        if (isItemPublished(item, cal._id)) {
          const itemKey = item.id || `${cal._id}_${index}`;
          fetchPostTrend(itemKey, item);
        }
      });
    });
  }, [isAdmin, calendars, scheduledPosts, fetchPostTrend]);

  const getItemPublishedLinks = (item) => {
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
  };

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

  const isSubmissionForItem = (sub, item, calendarId = null) => {
    if (!sub || !item) return false;
    const targetCalId = calendarId || item.calendarId;
    const subCalId = sub.calendar_id || sub.calendarId;
    if (subCalId && targetCalId && String(subCalId) !== String(targetCalId)) return false;

    const itemId = item.id || item._id;
    if (itemId) {
      if (sub.item_id && String(sub.item_id) === String(itemId)) return true;
      if (sub.assignment_id && String(sub.assignment_id) === String(itemId)) return true;
    }

    const subId = sub.assignment_id || sub.item_id;
    if (subId && itemId) {
      return String(subId) === String(itemId);
    }
    if (subId || itemId) {
      return false;
    }

    const subItemIndex = (sub.item_index !== undefined && sub.item_index !== null) ? Number(sub.item_index) : null;
    const itemIndex = item.calendarItemIndex !== undefined ? Number(item.calendarItemIndex) : null;
    if (subItemIndex !== null && itemIndex !== null && subCalId && targetCalId && String(subCalId) === String(targetCalId)) {
      return subItemIndex === itemIndex;
    }

    const itemTitle = item.title || item.description;
    return Boolean(sub.item_name && itemTitle && String(sub.item_name).trim() === String(itemTitle).trim());
  };

  const isScheduledPostForItem = (post, item, calendarId = null) => {
    if (!post || !item) return false;
    const targetCalId = calendarId || item.calendarId;
    const postCalId = post.calendar_id || post.calendarId;
    if (postCalId && targetCalId && String(postCalId) !== String(targetCalId)) return false;

    const postId = post.item_id || post.contentId;
    const itemId = item.id || item._id;
    if (postId && itemId) {
      return String(postId) === String(itemId);
    }
    if (postId || itemId) {
      return false;
    }

    const itemTitle = item.title || item.description;
    return Boolean(post.item_name && itemTitle && String(post.item_name).trim() === String(itemTitle).trim());
  };

  const hasContentSubmitted = (item, calendarId) =>
    submissions.some(sub => isSubmissionForItem(sub, item, calendarId));

  const isItemScheduled = (item, calendarId) =>
    scheduledPosts.some(post =>
      isScheduledPostForItem(post, item, calendarId) &&
      (post.status === 'scheduled' || post.status === 'pending' || (post.scheduledDate && !post.publishedAt))
    );

  const getPublishedPlatformsForItem = (item, calendarId) =>
    [...new Set(scheduledPosts
      .filter(post =>
        isScheduledPostForItem(post, item, calendarId) &&
        (post.status === 'published' || post.publishedAt)
      )
      .map(post => normalizePlatformKey(post.platform))
      .filter(Boolean))];

  const isItemPublished = (item, calendarId) =>
    scheduledPosts.some(post =>
      isScheduledPostForItem(post, item, calendarId) &&
      (post.status === 'published' || post.publishedAt)
    );

  const getItemStatus = (item, calendarId) => {
    if (item.published === true) return 'published';
    if (isItemPublished(item, calendarId)) return 'published';
    if (isItemScheduled(item, calendarId)) return 'scheduled';
    if (hasContentSubmitted(item, calendarId)) return 'under_review';
    return item.status || 'pending';
  };

  // Convert email to display name: if it looks like an email, use the part before @
  const toDisplayName = (val) => {
    if (!val) return '';
    if (val.includes('@')) return val.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim();
    return val;
  };

  function getLatestSubmission(item, calendarId = null) {
    const itemSubs = submissions.filter(s => isSubmissionForItem(s, item, calendarId || item.calendarId));
    if (!itemSubs.length) return null;
    return [...itemSubs].sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))[0];
  }

  function getLatestCustomerSubmission(item, calendarId = null) {
    const itemSubs = submissions.filter(s => isSubmissionForItem(s, item, calendarId || item.calendarId) && isVisibleToCustomerSubmission(s));
    if (!itemSubs.length) return null;
    return [...itemSubs].sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))[0];
  }

  let allItems = [];
  calendars.forEach(calendar => {
    if (Array.isArray(calendar.contentItems)) {
      if (!selectedCalendarId || calendar._id === selectedCalendarId || calendar.id === selectedCalendarId) {
        calendar.contentItems.forEach((item, index) => {
          const latestSubmission = getLatestSubmission(item);
          const itemStatus = getItemStatus(item, calendar._id);
          const published = item.published === true || isItemPublished(item, calendar._id);
          const stableItemId = item.id || item._id || `${calendar._id}::${index}`;
          allItems.push({
            ...item,
            calendarName: calendar.name || '',
            calendarId: calendar._id,
            id: stableItemId,
            calendarItemIndex: index,
            selectedPlatforms: normalizePlatforms(item.type || item.platform),
            creator: isAdmin
              ? (item.assignedToName || item.assignedTo || calendar.assignedToName || calendar.assignedTo || '')
              : toDisplayName(item.assignedToName || item.assignedTo || calendar.assignedToName || calendar.assignedTo || ''),
            status: itemStatus,
            publishedPlatforms: published ? normalizePlatforms(item.publishedPlatforms || getPublishedPlatformsForItem(item, calendar._id)) : [],
          });
        });
      }
    }
  });

  const filteredItems = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    if (statusFilter === 'all') return allItems;

    if (statusFilter === 'admin_review') {
      return allItems.filter(item => {
        const latest = getLatestSubmission(item, item.calendarId);
        if (!latest) return false;
        const status = latest.status || 'submitted';
        const stage = latest.submission_stage || latest.submissionStage || 'internal';
        const approvedByAdmin = latest.approved_by_admin === true || status === 'approved_admin' || status === 'approved_both';
        return (stage !== 'customer') && !approvedByAdmin &&
          !['approved', 'rejected', 'revision_requested', 'sent_to_creator', 'published'].includes(status);
      });
    }

    if (statusFilter === 'customer_review') {
      return allItems.filter(item => {
        const latest = getLatestSubmission(item, item.calendarId);
        if (!latest) return false;
        const status = latest.status || 'submitted';
        const stage = latest.submission_stage || latest.submissionStage || 'internal';
        const approvedByCustomer = (latest.approved_by_customer === true || status === 'approved_customer' || status === 'approved_both') &&
          !['under_review', 'sent_to_creator', 'revision_requested', 'rejected'].includes(status);
        return (stage === 'customer') && !approvedByCustomer &&
          !['approved_customer', 'approved_both', 'rejected', 'revision_requested', 'sent_to_creator', 'published'].includes(status);
      });
    }

    if (statusFilter === 'upcoming') {
      return allItems.filter(item => {
        if (item.status === 'published') return false;
        if (!item.date) return false;
        const dueDate = new Date(item.date);
        return dueDate >= today && dueDate <= twoDaysFromNow;
      });
    }

    if (statusFilter === 'overdue') {
      return allItems.filter(item => {
        if (item.status === 'published') return false;
        if (!item.date) return false;
        return new Date(item.date) < today;
      });
    }

    return allItems.filter(i => i.status === statusFilter);
  }, [allItems, statusFilter, submissions]);

  const sortedItems = [...filteredItems].sort((a, b) => {
    // Newest first: prefer createdAt, fall back to scheduled date
    const aTime = new Date(a.createdAt || a.date || 0).getTime();
    const bTime = new Date(b.createdAt || b.date || 0).getTime();
    return bTime - aTime;
  });

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twoDaysFromNow = new Date(today);
    twoDaysFromNow.setDate(today.getDate() + 2);
    twoDaysFromNow.setHours(23, 59, 59, 999);

    let adminReview = 0, customerReview = 0, upcoming = 0, overdue = 0;

    allItems.forEach(item => {
      // Admin / Customer review counts
      const itemSubs = submissions.filter(s => isSubmissionForItem(s, item, item.calendarId));
      if (itemSubs.length) {
        const latest = [...itemSubs].sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0))[0];
        const status = latest.status || 'submitted';
        const stage = latest.submission_stage || latest.submissionStage || 'internal';
        const approvedByAdmin = latest.approved_by_admin === true || status === 'approved_admin' || status === 'approved_both';
        const approvedByCustomer = (latest.approved_by_customer === true || status === 'approved_customer' || status === 'approved_both') &&
          !['under_review', 'sent_to_creator', 'revision_requested', 'rejected'].includes(status);
        if ((stage !== 'customer') && !approvedByAdmin && !['approved', 'rejected', 'revision_requested', 'sent_to_creator', 'published'].includes(status)) adminReview++;
        if ((stage === 'customer') && !approvedByCustomer && !['approved_customer', 'approved_both', 'rejected', 'revision_requested', 'sent_to_creator', 'published'].includes(status)) customerReview++;
      }
      // Upcoming / Overdue counts
      if (item.status !== 'published' && item.date) {
        const dueDate = new Date(item.date);
        if (dueDate < today) overdue++;
        else if (dueDate <= twoDaysFromNow) upcoming++;
      }
    });

    return {
      total: allItems.length,
      published: allItems.filter(i => i.status === 'published').length,
      underReview: allItems.filter(i => i.status === 'under_review').length,
      scheduled: allItems.filter(i => i.status === 'scheduled').length,
      pending: allItems.filter(i => !i.status || i.status === 'pending').length,
      adminReview,
      customerReview,
      upcoming,
      overdue,
    };
  }, [allItems, submissions]);


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

  const getItemMedia = (item, forCustomer = !isAdmin) => {
    const matchingSubs = submissions
      .filter(sub => isSubmissionForItem(sub, item, item.calendarId))
      .sort((a, b) => new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0));

    if (forCustomer) {
      const latestCustomerSub = matchingSubs.find(sub => isVisibleToCustomerSubmission(sub));
      if (latestCustomerSub) {
        const subMedia = latestCustomerSub.media || latestCustomerSub.images || [];
        if (subMedia.length > 0) {
          const urls = subMedia.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
          if (urls.length > 0) return { imageUrl: urls[0], imageUrls: urls };
        }
        if (latestCustomerSub.videoUrl || latestCustomerSub.video_url) {
          const videoUrl = latestCustomerSub.videoUrl || latestCustomerSub.video_url;
          return { imageUrl: videoUrl, imageUrls: [videoUrl] };
        }
      }
      if (item.published === true || item.status === 'published') {
        if (item.submissionMedia) return { imageUrl: item.submissionMedia, imageUrls: [item.submissionMedia] };
        if (item.imageUrl) return { imageUrl: item.imageUrl, imageUrls: item.imageUrls || [item.imageUrl] };
        if (item.thumbnail) return { imageUrl: item.thumbnail, imageUrls: [item.thumbnail] };
        if (item.media?.length > 0) {
          const urls = item.media.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
          return { imageUrl: urls[0], imageUrls: urls };
        }
        if (item.images?.length > 0) {
          const urls = item.images.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
          return { imageUrl: urls[0], imageUrls: urls };
        }
      }
      return { imageUrl: null, imageUrls: [] };
    }

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

    const targetSubmission = matchingSubs[0];
    if (targetSubmission) {
      const subMedia = targetSubmission.media || targetSubmission.images || [];
      if (subMedia.length > 0) {
        const urls = subMedia.map(m => typeof m === 'string' ? m : m?.url).filter(Boolean);
        if (urls.length > 0) return { imageUrl: urls[0], imageUrls: urls };
      }

      if (targetSubmission.videoUrl || targetSubmission.video_url) {
        const videoUrl = targetSubmission.videoUrl || targetSubmission.video_url;
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
    <div className={isAdmin ? "" : "min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100"}>
      <div className={isAdmin ? "" : "px-4 sm:px-6 lg:px-8 py-6"}>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-24">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-slate-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-indigo-600" />
                  Calendars
                </h3>
                {isAdmin && onAddCalendar && (
                  <button
                    onClick={onAddCalendar}
                    className="p-1 hover:bg-gray-200 rounded text-gray-700 transition-colors"
                    title="Add Calendar"
                  >
                    <PlusCircle className="h-4 w-4 text-indigo-600" />
                  </button>
                )}
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
                  {[...calendars].sort((a, b) => {
                    const dateA = new Date(a.createdAt || a.created_at || 0);
                    const dateB = new Date(b.createdAt || b.created_at || 0);
                    return dateB - dateA;
                  }).map((calendar, idx) => {
                    const isSelected = (calendar._id || calendar.id) === selectedCalendarId;
                    return (
                      <div key={calendar._id || calendar.id || idx} className="flex items-center gap-1 group/cal-item">
                        <button
                          onClick={() => setSelectedCalendarId(calendar._id || calendar.id)}
                          className={`flex-1 text-left p-3 rounded-lg transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-transparent hover:border-gray-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate pr-2">{calendar.name}</span>
                            <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>{calendar.contentItems?.length || 0}</span>
                          </div>
                        </button>
                        {isAdmin && (
                          <div className="flex items-center gap-0.5 opacity-0 group-hover/cal-item:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => { e.stopPropagation(); onAddItem && onAddItem(calendar); }}
                              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                              title="Add Item"
                            >
                              <PlusCircle className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onEditCalendar && onEditCalendar(calendar); }}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit Calendar"
                            >
                              <Edit className="h-4.5 w-4.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteCalendar && onDeleteCalendar(calendar._id || calendar.id); }}
                              className="p-1 text-red-650 hover:bg-red-50 rounded transition-colors"
                              title="Delete Calendar"
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>
                        )}
                      </div>
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
                  ...(isAdmin ? [
                    { key: 'admin_review', label: 'Admin Review', count: stats.adminReview, color: 'violet' },
                    { key: 'customer_review', label: 'Customer Review', count: stats.customerReview, color: 'pink' },
                    { key: 'upcoming', label: 'Upcoming', count: stats.upcoming, color: 'cyan' },
                    { key: 'overdue', label: 'Overdue', count: stats.overdue, color: 'red' },
                  ] : []),
                ].map(option => (
                  <button
                    key={option.key}
                    onClick={() => setStatusFilter(option.key)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${statusFilter === option.key
                      ? option.color === 'emerald' ? 'bg-emerald-600 text-white'
                        : option.color === 'amber' ? 'bg-amber-500 text-white'
                          : option.color === 'blue' ? 'bg-blue-600 text-white'
                            : option.color === 'violet' ? 'bg-violet-600 text-white'
                              : option.color === 'pink' ? 'bg-pink-600 text-white'
                                : option.color === 'cyan' ? 'bg-cyan-600 text-white'
                                  : option.color === 'red' ? 'bg-red-600 text-white'
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
                {!isAdmin && (
                  <button
                    onClick={downloadReport}
                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-medium shadow-sm transition-all active:scale-95 select-none"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span> Report</span>
                  </button>
                )}
              </div>
            </div>

            {/* Content Items */}
            {displayedItems.length > 0 ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4' : 'space-y-3'}>
                {displayedItems.map((item, index) => {
                  const itemMedia = getItemMedia(item, !isAdmin);
                  const activeSubmission = isAdmin ? getLatestSubmission(item) : getLatestCustomerSubmission(item);
                  const customerCanSeeThumbnail = isAdmin || item.published === true || item.status === 'published' || (activeSubmission && isVisibleToCustomerSubmission(activeSubmission));
                  const previewMedia = customerCanSeeThumbnail ? itemMedia : { imageUrl: null, imageUrls: [] };
                  const itemKey = item.id || `${item.calendarId}_${index}`;
                  const itemTrendData = postTrendCache[itemKey];
                  const isTrendLoading = itemTrendData === null;
                  const isExpanded = expandedTrendItem === itemKey;
                  const publishedLinks = getItemPublishedLinks(item);

                  return viewMode === 'grid' ? (
                    isAdmin ? (
                      <div
                        key={itemKey}
                        onClick={() => openContentDetail && openContentDetail(item, { _id: item.calendarId, name: item.calendarName })}
                        className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                      >
                        <div>
                          <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200">
                            {previewMedia.imageUrl ? (
                              isVideoUrl(previewMedia.imageUrl) ? (
                                <div className="relative w-full h-full bg-black">
                                  <video
                                    src={previewMedia.imageUrl}
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
                                <img src={previewMedia.imageUrl} alt="" className="w-full h-full object-cover" />
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
                          <div className="p-4 pb-0">
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                              <CalendarIcon className="h-3.5 w-3.5" />
                              <span>{format(new Date(item.date), 'MMM dd, yyyy')}</span>
                            </div>
                            <p className="text-sm text-gray-850 font-semibold mb-1 line-clamp-1">{item.title || 'Untitled'}</p>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{item.description || 'No description'}</p>
                            {item.selectedPlatforms?.length > 0 && (
                              <div className="mb-3">
                                <p className="text-[11px] font-medium text-gray-500 mb-1">Selected for</p>
                                <PlatformNameBadges platforms={item.selectedPlatforms} />
                              </div>
                            )}
                            {item.creator && (
                              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                                <User className="h-3.5 w-3.5" /><span className="truncate">{item.creator}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Admin actions bottom row */}
                        <div className="p-4 pt-0" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                            {item.status === 'published' ? (
                              <PostTrendButton
                                isLoading={isTrendLoading}
                                isActive={isExpanded}
                                onClick={() => {
                                  if (isExpanded) {
                                    setExpandedTrendItem(null);
                                  } else {
                                    fetchPostTrend && fetchPostTrend(itemKey, item);
                                    setExpandedTrendItem(itemKey);
                                  }
                                }}
                              />
                            ) : <div />}
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); onManualPublish && onManualPublish(item, item.calendarId); }}
                                className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                title="Publish Status"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onEditItem && onEditItem(item, item.calendarId); }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onDeleteItem && onDeleteItem(item.calendarId, item); }}
                                className="p-1.5 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); onUploadItem && onUploadItem(item.calendarId, item.calendarItemIndex); }}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                title="Upload"
                              >
                                <Upload className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          {isExpanded && (
                            <div className="mt-3">
                              <ExpandedTrendChart
                                platformData={itemTrendData || {}}
                                dateRange={trendDateRange}
                                onDateRangeChange={setTrendDateRange}
                                onClose={() => setExpandedTrendItem(null)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div key={item.id} onClick={() => handleContentClick(item)} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all cursor-pointer group">
                        <div className="relative h-40 bg-gradient-to-br from-gray-100 to-gray-200">
                          {previewMedia.imageUrl ? (
                            isVideoUrl(previewMedia.imageUrl) ? (
                              <div className="relative w-full h-full bg-black">
                                <video
                                  src={previewMedia.imageUrl}
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
                              <img src={previewMedia.imageUrl} alt="" className="w-full h-full object-cover" />
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
                          <p className="text-sm text-gray-800 font-medium line-clamp-2 mb-3">{item.description || 'No description available'}</p>
                          {item.selectedPlatforms?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-[11px] font-medium text-gray-500 mb-1">Selected for</p>
                              <PlatformNameBadges platforms={item.selectedPlatforms} />
                            </div>
                          )}
                          {publishedLinks?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-[11px] font-medium text-gray-500 mb-1">Published links</p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {publishedLinks.map((link, li) => (
                                  <a
                                    key={li}
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-colors"
                                    title={`Open on ${link.label}${link.isManual ? ' (Manual)' : ''}`}
                                  >
                                    <PlatformIcon platform={link.platform || link.label} />
                                    <span>{link.label}</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                ))}
                              </div>
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
                    )) : (
                    isAdmin ? (
                      <div
                        key={itemKey}
                        onClick={() => openContentDetail && openContentDetail(item, { _id: item.calendarId, name: item.calendarName })}
                        className={`bg-white rounded-xl border transition-all cursor-pointer group ${item.status === 'published' ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}`}
                      >
                        <div className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="w-full sm:w-24 h-24 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex-shrink-0">
                              {previewMedia.imageUrl ? (
                                isVideoUrl(previewMedia.imageUrl) ? (
                                  <div className="relative w-full h-full bg-black">
                                    <video
                                      src={previewMedia.imageUrl}
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
                                  <img src={previewMedia.imageUrl} alt="" className="w-full h-full object-cover" />
                                )
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-gray-200">
                                  <div className="w-14 h-14 rounded-xl bg-white/70 border border-gray-200 shadow-sm flex items-center justify-center">
                                    <Image className="h-7 w-7 text-gray-300" />
                                  </div>
                                </div>
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

                                {/* Admin Action Buttons on Right */}
                                <div className="flex flex-col items-end gap-1" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center gap-1.5">
                                    {item.status === 'published' && (
                                      <PostTrendButton
                                        isLoading={isTrendLoading}
                                        isActive={isExpanded}
                                        onClick={() => {
                                          if (isExpanded) {
                                            setExpandedTrendItem(null);
                                          } else {
                                            fetchPostTrend && fetchPostTrend(itemKey, item);
                                            setExpandedTrendItem(itemKey);
                                          }
                                        }}
                                      />
                                    )}
                                    <button
                                      className="p-1.5 text-gray-400 hover:text-emerald-650 hover:bg-emerald-50 rounded transition-colors touch-manipulation"
                                      onClick={(e) => { e.stopPropagation(); onManualPublish && onManualPublish(item, item.calendarId); }}
                                      title="Publish Status"
                                    >
                                      <CheckCircle className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors touch-manipulation"
                                      onClick={(e) => { e.stopPropagation(); onEditItem && onEditItem(item, item.calendarId); }}
                                      title="Edit"
                                    >
                                      <Edit className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      className="p-1.5 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded transition-colors touch-manipulation"
                                      onClick={(e) => { e.stopPropagation(); onDeleteItem && onDeleteItem(item.calendarId, item); }}
                                      title="Delete"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors touch-manipulation"
                                      onClick={(e) => { e.stopPropagation(); onUploadItem && onUploadItem(item.calendarId, item.calendarItemIndex); }}
                                      title="Upload"
                                    >
                                      <Upload className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  {/* Creator badge below action icons */}
                                  {item.creator && (
                                    <div
                                      title="Content Creator"
                                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-indigo-600 transition-colors cursor-default"
                                    >
                                      <User className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate max-w-[140px]">{item.creator}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <p className="text-sm font-semibold text-gray-900 mb-1">{item.title || 'Untitled'}</p>
                              <p className="text-gray-800 font-medium mb-3 line-clamp-2">{item.description || 'No description available'}</p>
                              <div className="flex flex-wrap items-center gap-4">
                                {item.selectedPlatforms?.length > 0 && (
                                  <div>
                                    <span className="text-xs text-gray-500">Selected for:</span>
                                    <div className="mt-1.5">
                                      <PlatformNameBadges platforms={item.selectedPlatforms} />
                                    </div>
                                  </div>
                                )}
                                {publishedLinks?.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                      {publishedLinks.map((link, li) => (
                                        <a
                                          key={li}
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 transition-colors"
                                          title={`Open on ${link.label}${link.isManual ? ' (Manual)' : ''}`}
                                        >
                                          <PlatformIcon platform={link.platform || link.label} />
                                          {link.isManual && <User className="h-3 w-3 text-emerald-600 bg-emerald-100/50 rounded ml-0.5 p-[2px]" />}
                                          <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                                        </a>
                                      ))}
                                    </div>
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
                                submissions={submissions.filter(sub => {
                                  if (!isAdmin && sub.reviewType === 'internal') return false;
                                  const subId = sub.assignment_id || sub.item_id;
                                  if (subId) return subId === item.id;
                                  return sub.item_name && sub.item_name === item.title;
                                })}
                                isAdmin={isAdmin}
                              />
                              {item.status === 'published' && itemTrendData && typeof itemTrendData === 'object' && (
                                <MiniTrendCharts platformData={itemTrendData} />
                              )}
                            </div>
                            <div className="hidden sm:flex items-center">
                              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>

                          {/* Expanded Trend Chart for List View */}
                          {isExpanded && (
                            <div className="mt-4 border-t border-gray-100 pt-4" onClick={e => e.stopPropagation()}>
                              <ExpandedTrendChart
                                platformData={itemTrendData || {}}
                                dateRange={trendDateRange}
                                onDateRangeChange={setTrendDateRange}
                                onClose={() => setExpandedTrendItem(null)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div key={item.id} onClick={() => handleContentClick(item)} className={`bg-white rounded-xl border transition-all cursor-pointer group ${item.status === 'published' ? 'border-emerald-200 hover:border-emerald-300 hover:shadow-md' : 'border-gray-100 hover:border-gray-200 hover:shadow-md'}`}>
                        <div className="p-4 sm:p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                            <div className="w-full sm:w-24 h-24 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden flex-shrink-0">
                              {previewMedia.imageUrl ? (
                                isVideoUrl(previewMedia.imageUrl) ? (
                                  <div className="relative w-full h-full bg-black">
                                    <video
                                      src={previewMedia.imageUrl}
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
                                  <img src={previewMedia.imageUrl} alt="" className="w-full h-full object-cover" />
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
                                <div className="flex flex-col items-end gap-1">
                                  <div className="flex items-center gap-2">
                                    {item.status === 'published' && (
                                      <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg">
                                        <ExternalLink className="h-3.5 w-3.5" /><span className="font-medium">View Details</span>
                                      </div>
                                    )}
                                    <button
                                      onClick={(e) => handleOpenReviewPanel(item, e)}
                                      className="flex items-center gap-1 text-xs text-purple-650 bg-purple-50 hover:bg-purple-105 active:bg-purple-200 px-3 py-1.5 rounded-lg transition-colors font-medium"
                                    >
                                      <MessageSquare className="h-3.5 w-3.5" /><span>Content Review</span>
                                    </button>
                                  </div>
                                  {item.creator && (
                                    <div
                                      title="Content Creator"
                                      className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-purple-600 transition-colors cursor-default"
                                    >
                                      <User className="h-3 w-3 flex-shrink-0" />
                                      <span className="truncate max-w-[140px]">{item.creator}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-gray-800 font-medium mb-3 line-clamp-2">{item.description || 'No description available'}</p>
                              <div className="flex flex-wrap items-center gap-4">
                                {item.selectedPlatforms?.length > 0 && (
                                  <div>
                                    <span className="text-xs text-gray-500">Selected for:</span>
                                    <div className="mt-1.5">
                                      <PlatformNameBadges platforms={item.selectedPlatforms} />
                                    </div>
                                  </div>
                                )}
                                {publishedLinks?.length > 0 && (
                                  <div>
                                    <span className="text-xs text-gray-500">Published links:</span>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                      {publishedLinks.map((link, li) => (
                                        <a
                                          key={li}
                                          href={link.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 transition-colors"
                                          title={`Open on ${link.label}${link.isManual ? ' (Manual)' : ''}`}
                                        >
                                          <PlatformIcon platform={link.platform || link.label} />
                                          <span>{link.label}</span>
                                          <ExternalLink className="h-3 w-3" />
                                        </a>
                                      ))}
                                    </div>
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
                                submissions={submissions.filter(sub => {
                                  if (!isAdmin && sub.reviewType === 'internal') return false;
                                  return isSubmissionForItem(sub, item, item.calendarId);
                                })}
                                isAdmin={isAdmin}
                              />
                            </div>
                            <div className="hidden sm:flex items-center">
                              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )
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
