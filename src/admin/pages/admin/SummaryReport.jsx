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
      <video src={url} className="w-full h-full object-cover opacity-80" muted preload="metadata" />
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
const isVersionVideoUrl = url => /\.(mp4|mov|webm|avi|mkv)/i.test(url);

const VersionRow = ({ version }) => {
  const latestComment = version.comments?.[version.comments.length - 1];
  const feedback = version.rejectionReason || version.approvalNotes || latestComment?.comment || latestComment?.text;
  const feedbackAuthor = latestComment?.authorName || latestComment?.authorEmail;

  const mediaUrls = (version.media || [])
    .map(m => typeof m === 'string' ? m : (m?.url || m?.publicUrl || ''))
    .filter(Boolean);
  const showCount  = Math.min(mediaUrls.length, 5);
  const extraCount = mediaUrls.length - showCount;

  return (
    <div className="pb-3 border-b border-gray-100 last:border-b-0 last:pb-0 space-y-2">
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

      {showCount > 0 && (
        <div className="grid grid-cols-3 gap-1.5 pl-7">
          {mediaUrls.slice(0, showCount).map((url, i) =>
            isVersionVideoUrl(url) ? (
              <div key={i} className="aspect-square rounded-lg bg-gray-900 flex items-center justify-center relative overflow-hidden">
                <video src={url} className="w-full h-full object-cover opacity-60" muted preload="metadata" />
                <PlayCircle className="absolute w-5 h-5 text-white" />
              </div>
            ) : (
              <img
                key={i}
                src={url}
                alt={`v${version.versionNumber} slide ${i + 1}`}
                className="aspect-square w-full rounded-lg object-cover bg-gray-100 border border-gray-200"
                onError={e => { e.target.style.display = 'none'; }}
              />
            )
          )}
          {extraCount > 0 && (
            <div className="aspect-square rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400">
              +{extraCount}
            </div>
          )}
        </div>
      )}

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
const MetricTile = ({ label, value, highlight }) => (
  <div className="text-center">
    <p className={`text-sm font-bold ${highlight ? 'text-emerald-600' : 'text-gray-800'}`}>{fmtNumUI(value)}</p>
    <p className="text-[9px] text-gray-400 leading-tight mt-0.5">{label}</p>
  </div>
);

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

  if (platform === 'instagram') {
    const cells = [
      { label: 'Likes',        value: m.likes      },
      { label: 'Comments',     value: m.comments   },
      { label: 'Views',        value: m.views      },
      { label: 'Shares',       value: m.shares     },
      { label: 'Saved',        value: m.saves ?? m.saved },
      { label: 'Reach',        value: m.reach      },
      { label: 'Interactions', value: m.total_interactions },
    ].filter(c => c.value != null);
    const engRaw  = (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
    const engRate = m.reach && engRaw ? ((engRaw / m.reach) * 100).toFixed(1) : null;
    const mediaTypeLabel = m.media_type ? m.media_type.replace(/_/g, ' ') : null;
    const postDate = m.timestamp
      ? new Date(m.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const permalink = m.permalink || post.instagramPermalink || null;
    const hasAny = cells.length > 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1.5 text-xs font-bold ${PI.color}`}><BarChart2 className="w-3 h-3" />{PI.label}</span>
          {mediaTypeLabel && <span className="text-[10px] bg-pink-50 text-pink-500 border border-pink-100 px-1.5 py-0.5 rounded-full font-medium">{mediaTypeLabel}</span>}
          {postDate && <span className="text-[10px] text-gray-400">{postDate}</span>}
          {permalink && <a href={permalink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[10px] text-blue-500 hover:underline flex items-center gap-0.5">View post <ExternalLink className="w-2.5 h-2.5" /></a>}
        </div>
        {hasAny ? (
          <div className="grid grid-cols-4 gap-1">
            {cells.map(c => <MetricTile key={c.label} label={c.label} value={c.value} />)}
            {engRate && <MetricTile label="Eng. Rate" value={`${engRate}%`} highlight />}
          </div>
        ) : <p className="text-[10px] text-gray-400 italic">Metrics not yet available</p>}
      </div>
    );
  }

  if (platform === 'facebook') {
    const mainCells = [
      { label: 'Likes',       value: m.likes       },
      { label: 'Comments',    value: m.comments    },
      { label: 'Shares',      value: m.shares      },
      { label: 'Clicks',      value: m.clicks      },
      { label: 'Impressions', value: m.impressions },
      { label: 'Reach',       value: m.reach       },
      { label: 'Video Views', value: m.videoViews  },
    ].filter(c => c.value != null);
    const er = typeof m.engagementRate === 'number'
      ? (m.engagementRate * (m.engagementRate > 1 ? 1 : 100)).toFixed(1)
      : null;
    const reactions = m.reactions || {};
    const reactionEntries = Object.entries(reactions).filter(([, v]) => v > 0);
    const postDate = m.created_time
      ? new Date(m.created_time).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const hasAny = mainCells.some(c => c.value != null);
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`flex items-center gap-1.5 text-xs font-bold ${PI.color}`}><BarChart2 className="w-3 h-3" />{PI.label}</span>
          {postDate && <span className="text-[10px] text-gray-400">{postDate}</span>}
        </div>
        {hasAny ? (
          <>
            <div className="grid grid-cols-4 gap-1">
              {mainCells.map(c => <MetricTile key={c.label} label={c.label} value={c.value} />)}
              {er && <MetricTile label="Eng. Rate" value={`${er}%`} highlight />}
            </div>
            {reactionEntries.length > 0 && (
              <div className="flex items-center gap-3 pt-0.5 flex-wrap">
                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide">Reactions</span>
                {reactionEntries.map(([k, v]) => (
                  <span key={k} className="text-[10px] text-gray-600">
                    <span className="font-semibold">{v}</span> <span className="text-gray-400">{k}</span>
                  </span>
                ))}
              </div>
            )}
          </>
        ) : <p className="text-[10px] text-gray-400 italic">Metrics not yet available</p>}
      </div>
    );
  }

  if (platform === 'linkedin') {
    const cells = [
      { label: 'Likes',            value: m.likeCount              ?? m.likes    },
      { label: 'Comments',         value: m.commentCount           ?? m.comments },
      { label: 'Shares',           value: m.shareCount             ?? m.shares   },
      { label: 'Clicks',           value: m.clickCount             ?? m.clicks   },
      { label: 'Impressions',      value: m.impressionCount        ?? m.impressions ?? m.reach },
      { label: 'Unique Imp.',      value: m.uniqueImpressionsCount },
    ].filter(c => c.value != null);
    const engRate = m.engagement != null
      ? (m.engagement * (m.engagement > 1 ? 1 : 100)).toFixed(2)
      : null;
    const hasAny = cells.length > 0;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-bold">
          <BarChart2 className={`w-3 h-3 ${PI.color}`} />
          <span className={PI.color}>{PI.label}</span>
        </div>
        {hasAny ? (
          <div className="grid grid-cols-4 gap-1">
            {cells.map(c => <MetricTile key={c.label} label={c.label} value={c.value} />)}
            {engRate && <MetricTile label="Eng. Rate" value={`${engRate}%`} highlight />}
          </div>
        ) : <p className="text-[10px] text-gray-400 italic">Metrics not yet available</p>}
      </div>
    );
  }

  const genCells = [
    { label: 'Likes',       value: m.likes       },
    { label: 'Comments',    value: m.comments    },
    { label: 'Shares',      value: m.shares      },
    { label: 'Impressions', value: m.impressions ?? m.reach },
  ].filter(c => c.value != null);
  const genReach  = m.reach || m.impressions;
  const genEngRaw = (m.likes || 0) + (m.comments || 0) + (m.shares || 0);
  const genEngRate = genReach && genEngRaw ? ((genEngRaw / genReach) * 100).toFixed(1) : null;
  return (
    <div className="space-y-2">
      <div className={`flex items-center gap-1.5 text-xs font-bold ${PI.color}`}>
        <BarChart2 className="w-3 h-3" /><span>{PI.label}</span>
      </div>
      {genCells.length > 0 ? (
        <div className="grid grid-cols-4 gap-1">
          {genCells.map(c => <MetricTile key={c.label} label={c.label} value={c.value} />)}
          {genEngRate && <MetricTile label="Eng. Rate" value={`${genEngRate}%`} highlight />}
        </div>
      ) : <p className="text-[10px] text-gray-400 italic">Metrics not yet available</p>}
    </div>
  );
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

  const publishedPosts = liveMetrics?.posts?.length > 0
    ? liveMetrics.posts
    : scheduledPosts.filter(p => p.status === 'published' || p.publishedAt);

  const metricsLoading = liveMetrics?.loading === true;

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
              {publishedPosts.flatMap(getPostLinks).filter((l, i, arr) => arr.findIndex(x => (x.platform ?? x.label) === (l.platform ?? l.label)) === i).map((link, li) => (
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

      {!isExpanded && (
        <div className="px-5 pb-4 border-t border-gray-50 pt-3 space-y-2">
          {assignment.caption && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{assignment.caption}</p>
          )}
          {assignment.hashtags && (
            <p className="text-[11px] text-blue-400 line-clamp-1">{assignment.hashtags}</p>
          )}
          <div className="flex items-center justify-between">
            <button onClick={onToggle}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 font-medium transition-colors">
              <ChevronDown className="w-4 h-4" />
              Expand to view versions and metrics
            </button>
            {assignment.totalVersions > 1 && (
              <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {assignment.totalVersions} revisions
              </span>
            )}
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2">
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

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [calendars, setCalendars] = useState([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [contentItems, setContentItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState({});
  const [visibleCount, setVisibleCount] = useState(5);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [searchCreator, setSearchCreator] = useState('');
  const [showCreatorTable, setShowCreatorTable] = useState(false);

  const [liveScheduledPosts, setLiveScheduledPosts] = useState([]);
  const [liveMetricsCache, setLiveMetricsCache] = useState({});
  const fetchedMetricsRef = useRef(new Set());

  const reportRef = useRef(null);

  useEffect(() => {
    const adminId = currentUser?._id || currentUser?.id;
    if (!adminId) return;
    fetch(`${API_URL}/admin/assigned-customers?adminId=${adminId}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => {
        fetch(`${API_URL}/api/customers`)
          .then(r => r.ok ? r.json() : Promise.reject())
          .then(data => setCustomers(Array.isArray(data) ? data : []))
          .catch(() => setCustomers([]));
      });
  }, [currentUser]);

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

  useEffect(() => {
    setContentItems([]);
    setSelectedItem('');
    if (!selectedCalendar) return;
    fetch(`${API_URL}/api/admin/summary-report/items?calendarId=${selectedCalendar}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setContentItems(Array.isArray(data) ? data : []))
      .catch(() => setContentItems([]));
  }, [selectedCalendar]);

  const handleGenerate = useCallback(async () => {
    if (!selectedCustomer) { setError('Please select a customer.'); return; }
    setError('');
    setLoading(true);
    setReport(null);
    try {
      const params = new URLSearchParams({ customerId: selectedCustomer });
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate)   params.set('toDate', toDate);
      if (selectedCalendar) params.set('calendarId', selectedCalendar);
      if (selectedItem)     params.set('itemId', selectedItem);

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
      setLiveMetricsCache({});
      fetchedMetricsRef.current = new Set();
      setReport(data);
      setLiveScheduledPosts(postsData);
    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedCustomer, fromDate, toDate, selectedCalendar, selectedItem]);

  // ── Download PDF ─────────────────────────────────────────────────────────────
  const handleDownloadPDF = useCallback(async () => {
    if (!report) return;
    setPdfLoading(true);
    try {
      const customerObj = customers.find(c => (c._id || c.id) === selectedCustomer);
      const customerName = customerObj?.businessName || customerObj?.name || 'Customer';

      const calendarObj = report.calendar ||
        calendars.find(c => (c._id || c.id) === selectedCalendar) || null;
      const calendarName = (calendarObj?.name || '').replace(/[\x00-\x1F\x7F]/g, ' ').trim();

      // Pre-load thumbnails via backend proxy
      const thumbCache = {};
      const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';
      const VIDEO_EXTS = /\.(mp4|webm|mov|avi|mkv|m4v|ogv)(\?.*)?$/i;
      const isVideoUrl = (url) => VIDEO_EXTS.test(url);
      const tryLoadImg = async (url) => {
        if (!url || thumbCache[url] !== undefined) return;
        if (isVideoUrl(url)) { thumbCache[url] = 'VIDEO'; return; }
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
        if (Array.isArray(a.versions)) {
          for (const v of a.versions) {
            for (const m of (v.media || [])) {
              const u = typeof m === 'string' ? m : (m?.url || m?.publicUrl || '');
              if (u) urls.push(u);
            }
          }
        }
        return urls;
      });
      await Promise.all(allThumbUrls.map(tryLoadImg));

      // ── jsPDF setup ───────────────────────────────────────────────────────
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const PW = 210, PH = 297, M = 18, CW = PW - M * 2;
      let y = 0;

      // ── Professional light palette ────────────────────────────────────────
      // Pure white page, cool-gray borders, slate text, muted steel accents
      const C = {
        pageBg:        [255, 255, 255],   // pure white
        cardBg:        [252, 253, 254],   // off-white card background
        sectionBg:     [247, 249, 251],   // very light blue-gray for tiles
        border:        [218, 224, 230],   // cool gray border
        borderLight:   [232, 237, 242],   // lighter divider
        // Text
        ink:           [30,  36,  44],    // near-black for headings
        body:          [60,  72,  84],    // dark slate for body text
        muted:         [120, 134, 150],   // steel gray for labels
        faint:         [165, 178, 192],   // faint for secondary meta
        // Accent — single muted slate-blue
        accent:        [59,  100, 158],   // professional blue
        accentLight:   [235, 242, 252],   // light accent fill
        // Status — all desaturated/muted
        publishedBg:   [236, 252, 243],  publishedText: [30,  126,  82],
        approvedBg:    [240, 253, 244],  approvedText:  [34,  120,  78],
        reviewBg:      [255, 251, 235],  reviewText:    [160,  98,  26],
        revisionBg:    [255, 247, 237],  revisionText:  [170,  90,  30],
        rejectedBg:    [255, 241, 241],  rejectedText:  [178,  50,  50],
        pendingBg:     [246, 248, 250],  pendingText:   [120, 134, 150],
        // Platform badge — all light-tinted, low saturation
        igBg:          [253, 242, 248],  igText:  [160,  60, 110],
        fbBg:          [240, 246, 255],  fbText:  [40,   90, 170],
        liBg:          [237, 248, 255],  liText:  [30,   90, 150],
        ytBg:          [255, 242, 242],  ytText:  [170,  40,  40],
        twBg:          [245, 248, 251],  twText:  [80,  100, 120],
        // Metric accent
        engGreen:      [30,  126,  82],
      };

      const sf  = a => doc.setFillColor(...a);
      const ss  = a => doc.setDrawColor(...a);
      const sc  = a => doc.setTextColor(...a);
      const sans   = (style = 'normal', sz = 10) => { doc.setFont('helvetica', style); doc.setFontSize(sz); };
      const serif  = (style = 'normal', sz = 10) => { doc.setFont('times', style);     doc.setFontSize(sz); };
      const hairline = () => doc.setLineWidth(0.18);
      const thinLine = () => doc.setLineWidth(0.35);

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
        return new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      };

      // ── Badge helpers ─────────────────────────────────────────────────────
      const getStatusStyle = status => {
        const s = (status || '').toLowerCase();
        return ({
          published:          { bg: C.publishedBg,  tc: C.publishedText,  label: 'Published'  },
          approved:           { bg: C.approvedBg,   tc: C.approvedText,   label: 'Approved'   },
          rejected:           { bg: C.rejectedBg,   tc: C.rejectedText,   label: 'Rejected'   },
          submitted:          { bg: C.reviewBg,     tc: C.reviewText,     label: 'In Review'  },
          in_review:          { bg: C.reviewBg,     tc: C.reviewText,     label: 'In Review'  },
          under_review:       { bg: C.reviewBg,     tc: C.reviewText,     label: 'In Review'  },
          revision_requested: { bg: C.revisionBg,   tc: C.revisionText,   label: 'Revision'   },
          pending:            { bg: C.pendingBg,    tc: C.pendingText,    label: 'Pending'    },
          publishing:         { bg: C.accentLight,  tc: C.accent,         label: 'Publishing' },
        })[s] || { bg: C.pendingBg, tc: C.muted, label: (status || '—').replace(/_/g, ' ') };
      };

      const getPlatformStyle = p => ({
        instagram: { bg: C.igBg, tc: C.igText, label: 'Instagram' },
        facebook:  { bg: C.fbBg, tc: C.fbText, label: 'Facebook'  },
        linkedin:  { bg: C.liBg, tc: C.liText, label: 'LinkedIn'  },
        youtube:   { bg: C.ytBg, tc: C.ytText, label: 'YouTube'   },
        twitter:   { bg: C.twBg, tc: C.twText, label: 'Twitter/X' },
      })[(p || '').toLowerCase()] || { bg: C.sectionBg, tc: C.muted, label: p || '—' };

      // ── Page helpers ──────────────────────────────────────────────────────
      const fillPageBg = () => {
        sf(C.pageBg);
        doc.setLineWidth(0);
        doc.rect(0, 0, PW, PH, 'F');
      };

      const checkY = (need = 20) => {
        if (y + need > PH - 22) {
          doc.addPage();
          fillPageBg();
          y = M;
        }
      };

      // ── Enrich posts from live cache ──────────────────────────────────────
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

      // ── Summary counts ────────────────────────────────────────────────────
      const totalItems      = report.assignments.length;
      const pdfApprovedCount = report.assignments.filter(a =>
        a.versions?.some(v => ['approved', 'published'].includes((v.status || '').toLowerCase()))
      ).length;
      const pdfPublishedCount = report.assignments.filter(a =>
        a.versions?.some(v => (v.status || '').toLowerCase() === 'published')
      ).length;
      const pdfApprovalRate  = totalItems > 0 ? Math.round((pdfApprovedCount / totalItems) * 100) : 0;
      const pdfTotalVersions = report.assignments.reduce((s, a) => s + (a.totalVersions || 1), 0);
      const pdfAvgRevisions  = totalItems > 0 ? (pdfTotalVersions / totalItems).toFixed(1) : '—';
      const platformsSet     = new Set(
        report.assignments.flatMap(a => [
          ...(Array.isArray(a.platforms) ? a.platforms.flat() : []),
          ...(a.platform ? [a.platform] : []),
        ].filter(p => p && typeof p === 'string').map(p => p.toLowerCase()))
      );
      const platformCount = platformsSet.size;
      const periodVal = (report.filters?.fromDate && report.filters?.toDate)
        ? `${report.filters.fromDate} – ${report.filters.toDate}`
        : (report.filters?.fromDate || report.filters?.toDate || 'All dates');

      // ════════════════════════════════════════════════════════════════════
      //  PAGE 1
      // ════════════════════════════════════════════════════════════════════
      fillPageBg();
      y = M;

      // ── Top header bar ────────────────────────────────────────────────────
      // Accent rule at very top
      sf(C.accent); doc.setLineWidth(0);
      doc.rect(0, 0, PW, 1.2, 'F');

      y = M + 2;

      // Left: brand name
      sans('bold', 8); sc(C.ink);
      doc.text(sanitize(customerName).toUpperCase(), M, y);
      sans('normal', 7); sc(C.muted);
      doc.text(sanitize(calendarName ? `Calendar: ${calendarName}` : 'All Calendars'), M, y + 5);

      // Right: meta trio (GENERATED / PERIOD / ITEMS) stacked
      const genDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const rightMeta = [
        { label: 'Generated', value: genDate },
        { label: 'Period',    value: sanitize(periodVal) },
        { label: 'Items',     value: `${totalItems}` },
      ];
      rightMeta.forEach((rm, i) => {
        sans('normal', 7); sc(C.muted);
        doc.text(rm.label + ':', PW - M - 30, y + i * 5);
        sans('bold', 7); sc(C.body);
        doc.text(rm.value, PW - M, y + i * 5, { align: 'right' });
      });

      y += 16;

      // ── Thin divider ──────────────────────────────────────────────────────
      hairline(); ss(C.border);
      doc.line(M, y, PW - M, y);
      y += 10;

      // ── Report title ──────────────────────────────────────────────────────
      serif('normal', 26); sc(C.ink);
      doc.text('Content Performance Report', M, y);
      y += 8;

      // Subtitle tagline
      sans('normal', 8.5); sc(C.muted);
      const execSummary = sanitize(
        `${totalItems} item${totalItems !== 1 ? 's' : ''} · ${platformCount} platform${platformCount !== 1 ? 's' : ''} · ` +
        `${pdfApprovedCount} approved (${pdfApprovalRate}%) · ${pdfPublishedCount} published · avg ${pdfAvgRevisions} revision${parseFloat(pdfAvgRevisions) !== 1 ? 's' : ''} per item`
      );
      doc.text(execSummary, M, y);
      y += 12;

      // ── KPI SUMMARY TILES (5 across) ─────────────────────────────────────
      const TILE_GAP = 4;
      const TILE_W   = (CW - TILE_GAP * 4) / 5;
      const TILE_H   = 26;

      const kpiTiles = [
        { label: 'Total Items',    value: String(totalItems),         sub: null           },
        { label: 'Published',      value: String(pdfPublishedCount),  sub: 'posts live'   },
        { label: 'Approval Rate',  value: `${pdfApprovalRate}%`,      sub: `${pdfApprovedCount} approved` },
        { label: 'Avg Revisions',  value: String(pdfAvgRevisions),    sub: 'per item'     },
        { label: 'Platforms',      value: String(platformCount),      sub: null           },
      ];

      kpiTiles.forEach((tile, i) => {
        const tx = M + i * (TILE_W + TILE_GAP);
        // Card background
        sf(C.sectionBg); hairline(); ss(C.borderLight);
        doc.roundedRect(tx, y, TILE_W, TILE_H, 2, 2, 'FD');
        // Top accent line on first tile
        if (i === 0) {
          sf(C.accent); doc.setLineWidth(0);
          doc.roundedRect(tx, y, TILE_W, 1.5, 1, 1, 'F');
        }
        // Value (serif large)
        serif('normal', 17); sc(C.ink);
        doc.text(tile.value, tx + TILE_W / 2, y + 14, { align: 'center' });
        // Label
        sans('bold', 6); sc(C.muted);
        doc.text(tile.label.toUpperCase(), tx + TILE_W / 2, y + 21.5, { align: 'center' });
      });
      y += TILE_H + 10;

      // ── PLATFORM BREAKDOWN TABLE ──────────────────────────────────────────
      const pdfPlatformMap = {};
      for (const post of pdfMergedPosts) {
        if (post.status !== 'published' && !post.publishedAt && !post.metrics) continue;
        const pl = (Array.isArray(post.platform) ? post.platform[0] : post.platform || 'other').toLowerCase();
        if (!pdfPlatformMap[pl]) pdfPlatformMap[pl] = { pl, posts: 0, reach: 0, likes: 0, comments: 0, shares: 0 };
        pdfPlatformMap[pl].posts++;
        const mm = post.metrics || {};
        pdfPlatformMap[pl].reach    += mm.reach || mm.impressions || 0;
        pdfPlatformMap[pl].likes    += mm.likes || 0;
        pdfPlatformMap[pl].comments += mm.comments || 0;
        pdfPlatformMap[pl].shares   += mm.shares || 0;
      }
      const pdfPlatformRows = Object.values(pdfPlatformMap).sort((a, b) => b.posts - a.posts);

      if (pdfPlatformRows.length > 0) {
        checkY(pdfPlatformRows.length * 7 + 20);

        // Section label
        sans('bold', 7); sc(C.muted);
        doc.text('PLATFORM BREAKDOWN', M, y);
        y += 5;

        hairline(); ss(C.border);
        doc.line(M, y, PW - M, y);
        y += 4;

        const pCols = [
          { label: 'Platform',    w: 30 },
          { label: 'Posts',       w: 16 },
          { label: 'Reach',       w: 24 },
          { label: 'Likes',       w: 20 },
          { label: 'Comments',    w: 24 },
          { label: 'Shares',      w: 20 },
          { label: 'Eng. Rate',   w: 20 },
        ];
        let hx = M;
        pCols.forEach(c => { sans('bold', 6.5); sc(C.faint); doc.text(c.label.toUpperCase(), hx, y); hx += c.w; });
        y += 5;

        for (const row of pdfPlatformRows) {
          const eng = row.likes + row.comments + row.shares;
          const er  = row.reach > 0 ? ((eng / row.reach) * 100).toFixed(1) + '%' : '—';
          const plStyle = getPlatformStyle(row.pl);
          const rowVals = [
            { v: row.pl.charAt(0).toUpperCase() + row.pl.slice(1), w: 30, bold: true },
            { v: String(row.posts),    w: 16 },
            { v: fmtNum(row.reach),    w: 24 },
            { v: fmtNum(row.likes),    w: 20 },
            { v: fmtNum(row.comments), w: 24 },
            { v: fmtNum(row.shares),   w: 20 },
            { v: er,                   w: 20, color: C.engGreen },
          ];
          // Subtle row stripe on alternates
          if (pdfPlatformRows.indexOf(row) % 2 === 0) {
            sf(C.sectionBg); doc.setLineWidth(0);
            doc.rect(M, y - 3.5, CW, 7, 'F');
          }
          let rx = M;
          rowVals.forEach(cell => {
            if (cell.bold) { sans('bold', 7); sc(C.body); }
            else if (cell.color) { sans('bold', 7); sc(cell.color); }
            else { sans('normal', 7); sc(C.body); }
            doc.text(sanitize(cell.v), rx, y);
            rx += cell.w;
          });
          y += 7;
        }
        hairline(); ss(C.border);
        doc.line(M, y, PW - M, y);
        y += 10;
      }

      // ── STATUS DISTRIBUTION ───────────────────────────────────────────────
      const pdfStatusCounts = {};
      for (const a of report.assignments) {
        const latest = a.versions?.[a.versions.length - 1];
        const s = (latest?.status || 'pending').toLowerCase();
        const key = ['submitted', 'in_review', 'under_review'].includes(s) ? 'in_review'
          : s === 'revision_requested' ? 'revision' : s;
        pdfStatusCounts[key] = (pdfStatusCounts[key] || 0) + 1;
      }
      const pdfStatusTotal = report.assignments.length || 1;
      const pdfStatusMeta = {
        published: { label: 'Published', rgb: [30,  126, 82]  },
        approved:  { label: 'Approved',  rgb: [56,  159, 95]  },
        in_review: { label: 'In Review', rgb: [198, 148, 42]  },
        revision:  { label: 'Revision',  rgb: [200, 110, 42]  },
        rejected:  { label: 'Rejected',  rgb: [185,  65, 65]  },
        pending:   { label: 'Pending',   rgb: [180, 192, 205] },
      };
      const pdfStatusRows = ['published', 'approved', 'in_review', 'revision', 'rejected', 'pending']
        .filter(k => pdfStatusCounts[k] > 0)
        .map(k => ({ ...pdfStatusMeta[k], count: pdfStatusCounts[k], pct: Math.round((pdfStatusCounts[k] / pdfStatusTotal) * 100) }));

      if (pdfStatusRows.length > 0) {
        checkY(36);
        sans('bold', 7); sc(C.muted);
        doc.text('STATUS DISTRIBUTION', M, y);
        y += 5;

        // Segmented bar (rounded, with gaps between segments)
        const barH = 7;
        let barX = M;
        for (const sr of pdfStatusRows) {
          const segW = (sr.pct / 100) * CW;
          if (segW < 0.5) continue;
          doc.setFillColor(...sr.rgb);
          doc.setLineWidth(0);
          doc.rect(barX, y, segW - 0.5, barH, 'F');
          barX += segW;
        }
        // Bar border
        hairline(); ss(C.border); doc.setFillColor(0, 0, 0, 0);
        doc.roundedRect(M, y, CW, barH, 1.5, 1.5, 'D');
        y += barH + 5;

        // Legend dots
        let legX = M, legY = y;
        for (const sr of pdfStatusRows) {
          sans('normal', 6.5); sc(C.body);
          const lw = doc.getTextWidth(`${sr.label} ${sr.count} (${sr.pct}%)`) + 10;
          if (legX + lw > PW - M) { legX = M; legY += 6.5; }
          doc.setFillColor(...sr.rgb); doc.setLineWidth(0);
          doc.circle(legX + 1.5, legY - 1.5, 1.5, 'F');
          sc(C.body);
          doc.text(`${sr.label} `, legX + 5, legY);
          sans('bold', 6.5); sc(C.muted);
          doc.text(`${sr.count} (${sr.pct}%)`, legX + 5 + doc.getTextWidth(`${sr.label} `), legY);
          legX += lw;
        }
        y = legY + 9;
      }

      // ── TOP PERFORMING CONTENT ────────────────────────────────────────────
      const pdfTopPerformers = report.assignments
        .map(a => {
          const posts = liveMetricsCache[a.assignmentId]?.posts || [];
          const reach = posts.reduce((s, p) => s + (p.metrics?.reach || p.metrics?.impressions || 0), 0);
          const eng   = posts.reduce((s, p) => s + (p.metrics?.likes || 0) + (p.metrics?.comments || 0) + (p.metrics?.shares || 0), 0);
          return { ...a, _reach: reach, _eng: eng, _rate: reach > 0 ? ((eng / reach) * 100).toFixed(1) : null };
        })
        .filter(a => a._eng > 0 || a._reach > 0)
        .sort((a, b) => b._eng - a._eng)
        .slice(0, 3);

      if (pdfTopPerformers.length > 0) {
        checkY(54);
        sans('bold', 7); sc(C.muted);
        doc.text('TOP PERFORMING CONTENT', M, y);
        y += 5;

        const tpCount = pdfTopPerformers.length;
        const tpTileW = (CW - (tpCount - 1) * 5) / tpCount;
        const tpTileH = 40;

        pdfTopPerformers.forEach((a, i) => {
          const tx = M + i * (tpTileW + 5);
          // Card bg — first is lightly tinted
          sf(i === 0 ? [252, 250, 237] : C.sectionBg);
          hairline(); ss(i === 0 ? [210, 185, 80] : C.borderLight);
          doc.roundedRect(tx, y, tpTileW, tpTileH, 2, 2, 'FD');

          // Rank badge
          const rankBg = i === 0 ? [198, 168, 42] : [185, 195, 210];
          sf(rankBg); doc.setLineWidth(0);
          doc.roundedRect(tx + 3, y + 3.5, 10, 6, 1.5, 1.5, 'F');
          sans('bold', 6.5); sc([255, 255, 255]);
          doc.text(`#${i + 1}`, tx + 8, y + 8, { align: 'center' });

          // Title
          sans('normal', 7.5); sc(C.ink);
          const tpTitle = doc.splitTextToSize(
            sanitize(a.itemTitle || a.caption?.slice(0, 50) || `Item ${i + 1}`),
            tpTileW - 10
          ).slice(0, 2);
          doc.text(tpTitle, tx + 3.5, y + 15);

          // Creator name
          sans('normal', 6); sc(C.muted);
          doc.text(sanitize(a.creatorName || '—'), tx + 3.5, y + 15 + tpTitle.length * 5.5);

          // Stats row at bottom
          const statsY = y + tpTileH - 9;
          hairline(); ss(C.borderLight);
          doc.line(tx + 3, statsY - 3, tx + tpTileW - 3, statsY - 3);

          const statItems = [
            { v: fmtNum(a._eng),   l: 'Eng'   },
            { v: fmtNum(a._reach), l: 'Reach'  },
            ...(a._rate ? [{ v: `${a._rate}%`, l: 'Rate' }] : []),
          ];
          const statW = (tpTileW - 6) / 3;
          statItems.forEach((st, si) => {
            const sx = tx + 3 + si * statW;
            serif('normal', 9); sc(C.ink);
            doc.text(st.v, sx, statsY + 1);
            sans('normal', 5.5); sc(C.faint);
            doc.text(st.l.toUpperCase(), sx, statsY + 6);
          });
        });
        y += tpTileH + 10;
      }

      // ── TWO-COLUMN: Content Type + Creator Performance ────────────────────
      const pdfTypeMap = {};
      for (const a of report.assignments) {
        const t = (a.mediaType || 'image').toLowerCase();
        const label = t === 'carousel' ? 'Carousel' : t === 'video' ? 'Video' : 'Image';
        if (!pdfTypeMap[label]) pdfTypeMap[label] = { label, count: 0, eng: 0, reach: 0 };
        pdfTypeMap[label].count++;
        for (const p of (liveMetricsCache[a.assignmentId]?.posts || [])) {
          if (!p.metrics) continue;
          pdfTypeMap[label].eng   += (p.metrics.likes || 0) + (p.metrics.comments || 0) + (p.metrics.shares || 0);
          pdfTypeMap[label].reach += p.metrics.reach || p.metrics.impressions || 0;
        }
      }
      const pdfTypeRows = Object.values(pdfTypeMap).sort((a, b) => b.count - a.count);

      const pdfCreatorMap = {};
      for (const a of report.assignments) {
        const name = a.creatorName || 'Unknown';
        if (!pdfCreatorMap[name]) pdfCreatorMap[name] = { name, assigned: 0, approved: 0, totalV: 0 };
        pdfCreatorMap[name].assigned++;
        pdfCreatorMap[name].totalV += a.totalVersions || 1;
        if (a.versions?.some(v => ['approved', 'published'].includes((v.status || '').toLowerCase())))
          pdfCreatorMap[name].approved++;
      }
      const pdfCreatorRows = Object.values(pdfCreatorMap).sort((a, b) => b.assigned - a.assigned);

      const colGap = 8;
      const halfW  = (CW - colGap) / 2;
      const colRX  = M + halfW + colGap;

      const typeH = pdfTypeRows.length > 0 ? pdfTypeRows.length * 12 + 18 : 0;
      const crtrH = pdfCreatorRows.length > 0 ? Math.min(pdfCreatorRows.length, 6) * 8 + 22 : 0;
      const twoColH = Math.max(typeH, crtrH);

      if (twoColH > 0) {
        checkY(Math.min(twoColH + 6, 100));
        const twoColY = y;

        // Left: Content Type Breakdown
        if (pdfTypeRows.length > 0) {
          sans('bold', 7); sc(C.muted);
          doc.text('CONTENT TYPE BREAKDOWN', M, twoColY);
          let ty = twoColY + 8;

          for (const ct of pdfTypeRows) {
            const pct = totalItems > 0 ? Math.round((ct.count / totalItems) * 100) : 0;
            const er = ct.reach > 0 ? ((ct.eng / ct.reach) * 100).toFixed(1) + '%' : null;

            sans('bold', 7.5); sc(C.body);
            doc.text(sanitize(ct.label), M, ty);

            sans('normal', 6.5); sc(C.muted);
            const stat = `${ct.count} items (${pct}%)${er ? `  ·  ${er}` : ''}`;
            doc.text(sanitize(stat), M + halfW, ty, { align: 'right' });

            ty += 4;
            // Bar track
            sf(C.borderLight); doc.setLineWidth(0);
            doc.roundedRect(M, ty, halfW, 3, 1.5, 1.5, 'F');
            // Fill bar
            sf(C.accent); doc.setLineWidth(0);
            doc.roundedRect(M, ty, Math.max((pct / 100) * halfW, 2), 3, 1.5, 1.5, 'F');
            ty += 8;
          }
        }

        // Right: Creator Performance table
        if (pdfCreatorRows.length > 0) {
          sans('bold', 7); sc(C.muted);
          doc.text('CREATOR PERFORMANCE', colRX, twoColY);

          let hry = twoColY + 8;
          const crCols = [
            { label: 'Creator', x: colRX,      w: 40 },
            { label: 'Items',   x: colRX + 40, w: 18 },
            { label: 'Appr.',   x: colRX + 58, w: 22 },
            { label: 'Avg Rev', x: colRX + 80, w: 18 },
          ];
          crCols.forEach(c => { sans('bold', 6.5); sc(C.faint); doc.text(c.label.toUpperCase(), c.x, hry); });
          hry += 2;
          hairline(); ss(C.border);
          doc.line(colRX, hry, colRX + halfW, hry);
          hry += 5;

          const displayCreators = pdfCreatorRows.slice(0, 6);
          for (const c of displayCreators) {
            const apprPct = c.assigned > 0 ? Math.round((c.approved / c.assigned) * 100) : 0;
            const avgRev  = c.assigned > 0 ? (c.totalV / c.assigned).toFixed(1) : '—';

            sans('bold', 7); sc(C.body);
            doc.text(sanitize(c.name).slice(0, 20), colRX, hry);
            sans('normal', 7); sc(C.body);
            doc.text(String(c.assigned), colRX + 40, hry);
            doc.text(`${c.approved} (${apprPct}%)`, colRX + 58, hry);
            doc.text(String(avgRev), colRX + 80, hry);
            hry += 8;
          }
          if (pdfCreatorRows.length > 6) {
            sans('normal', 6); sc(C.faint);
            doc.text(`+ ${pdfCreatorRows.length - 6} more creators`, colRX, hry);
          }
        }

        y = twoColY + twoColH + 8;
      }

      // ── Section divider before content items ─────────────────────────────
      hairline(); ss(C.border);
      doc.line(M, y, PW - M, y);
      y += 8;

      sans('bold', 8.5); sc(C.ink);
      doc.text('Content Items', M, y);
      sans('normal', 7); sc(C.muted);
      doc.text(`${report.assignments.length} item${report.assignments.length !== 1 ? 's' : ''}`, PW - M, y, { align: 'right' });
      y += 9;

      // ════════════════════════════════════════════════════════════════════
      //  CONTENT ITEM CARDS
      // ════════════════════════════════════════════════════════════════════
      for (let ai = 0; ai < report.assignments.length; ai++) {
        const assignment = report.assignments[ai];
        try {
          const asmPlatforms = [...new Set([
            ...(Array.isArray(assignment.platforms) ? assignment.platforms.flat() : []),
            ...(Array.isArray(assignment.platform) ? assignment.platform : (assignment.platform ? [assignment.platform] : [])),
          ].filter(p => p && typeof p === 'string').map(p => p.toLowerCase().trim()))];

          const asmAllPosts     = getPdfPosts(assignment);
          const asmMetricsPosts = asmAllPosts.filter(p => p.status === 'published' || p.publishedAt || p.metrics);
          const hasMetrics      = asmMetricsPosts.length > 0;

          const collectMediaImages = (mediaArr) =>
            (mediaArr || []).map(m => typeof m === 'string' ? m : (m?.url || m?.publicUrl || ''))
                            .filter(u => u && !isVideoUrl(u));

          const allThumbs = (() => {
            const urls = [];
            if (assignment.thumbnail && !isVideoUrl(assignment.thumbnail))
              urls.push(assignment.thumbnail);
            if (Array.isArray(assignment.versions)) {
              for (const v of assignment.versions) {
                for (const u of collectMediaImages(v.media)) {
                  if (!urls.includes(u)) urls.push(u);
                }
              }
            }
            if (urls.length === 0 && assignment.thumbnail) urls.push(assignment.thumbnail);
            return urls;
          })();

          const THUMB_SZ       = 26;
          const THUMB_GAP      = 3;
          const showThumbCount = Math.min(allThumbs.length, 4);
          const hasThumbs      = showThumbCount > 0;

          // Estimate card height
          sans('normal', 14);
          const itemTitleText  = sanitize(assignment.itemTitle || assignment.caption?.slice(0, 60) || `Item ${ai + 1}`);
          const titleLinesEst  = doc.splitTextToSize(itemTitleText, CW - 65).length;
          const estCardH = (
            10 +
            Math.max(titleLinesEst * 7, 12) + 4 +
            6 + 4 +
            (asmPlatforms.length > 0 ? 11 : 0) +
            (hasThumbs ? THUMB_SZ + 7 : 0) +
            (assignment.versions?.length > 0 ? 14 : 0) +
            8 +
            (hasMetrics ? 30 : 14) +
            10
          );
          checkY(Math.min(estCardH, 95));

          const cardStartY = y;
          const CARD_PAD   = 7;
          const innerX     = M + CARD_PAD;
          const innerW     = CW - CARD_PAD * 2;
          y += CARD_PAD + 2;

          // ── Item number badge + title ───────────────────────────────────
          // Small index badge
          sf(C.sectionBg); hairline(); ss(C.borderLight); doc.setLineWidth(0);
          doc.roundedRect(innerX, y - 3, 8, 8, 1, 1, 'F');
          sans('bold', 6); sc(C.muted);
          doc.text(String(ai + 1), innerX + 4, y + 2, { align: 'center' });

          // Title
          serif('normal', 14); sc(C.ink);
          const titleLinesArr = doc.splitTextToSize(itemTitleText, innerW - 68).slice(0, 2);
          doc.text(titleLinesArr, innerX + 11, y + 1.5);

          // ── Creator info (top-right) ────────────────────────────────────
          const creatorName = sanitize(assignment.creatorName || '—');
          const AVATAR_R    = 5;
          const avatarCX    = M + CW - CARD_PAD - AVATAR_R;
          const avatarCY    = y + 1;

          sf(C.accentLight); doc.setLineWidth(0);
          doc.circle(avatarCX, avatarCY, AVATAR_R, 'F');
          hairline(); ss(C.border);
          doc.circle(avatarCX, avatarCY, AVATAR_R, 'D');
          sans('bold', 6); sc(C.accent);
          doc.text(getInitials(creatorName), avatarCX, avatarCY + 2, { align: 'center' });
          sans('bold', 7); sc(C.body);
          doc.text(creatorName, avatarCX - AVATAR_R - 2.5, avatarCY + 1, { align: 'right' });
          if (assignment.creatorEmail) {
            sans('normal', 6); sc(C.faint);
            doc.text(sanitize(assignment.creatorEmail), avatarCX - AVATAR_R - 2.5, avatarCY + 6, { align: 'right' });
          }

          y += Math.max(titleLinesArr.length * 7, 12) + 4;

          // ── Meta line ──────────────────────────────────────────────────
          const createdStr = assignment.firstSubmittedAt ? fmtDateShort(assignment.firstSubmittedAt) : '—';
          const mt = (assignment.mediaType || 'image').toLowerCase();
          const mtStr = mt === 'carousel'
            ? `Carousel · ${assignment.slideCount || '?'} slides`
            : mt === 'video' ? 'Video'
            : `Image · ${assignment.slideCount || 1} slide`;
          sans('normal', 7); sc(C.muted);
          doc.text(`${createdStr}  ·  ${mtStr}  ·  ${assignment.totalVersions || 1} version${(assignment.totalVersions || 1) !== 1 ? 's' : ''}`, innerX, y);
          y += 7;

          // ── Platform pills ─────────────────────────────────────────────
          if (asmPlatforms.length > 0) {
            let pillX = innerX;
            for (const pl of asmPlatforms) {
              const plStyle = getPlatformStyle(pl);
              sans('normal', 6.5);
              const pillW = doc.getTextWidth(plStyle.label) + 8;
              if (pillX + pillW > M + CW - CARD_PAD) break;
              sf(plStyle.bg); hairline(); ss(plStyle.bg);
              doc.roundedRect(pillX, y, pillW, 6.5, 3, 3, 'F');
              sc(plStyle.tc);
              doc.text(plStyle.label, pillX + pillW / 2, y + 4.7, { align: 'center' });
              pillX += pillW + 3;
            }
            y += 11;
          }

          // ── Thumbnail strip ────────────────────────────────────────────
          if (hasThumbs) {
            let thumbX = innerX;
            for (let ti = 0; ti < showThumbCount; ti++) {
              const thumbUrl = allThumbs[ti];
              const cached   = thumbCache[thumbUrl];
              const isVideo  = cached === 'VIDEO' || isVideoUrl(thumbUrl);

              if (isVideo) {
                sf([45, 50, 58]); hairline(); ss(C.borderLight);
                doc.roundedRect(thumbX, y, THUMB_SZ, THUMB_SZ, 2, 2, 'FD');
                const cx = thumbX + THUMB_SZ / 2, cy = y + THUMB_SZ / 2 - 2;
                sf([255, 255, 255]); doc.setLineWidth(0);
                doc.triangle(cx - 3.5, cy - 4.5, cx - 3.5, cy + 4.5, cx + 5, cy, 'F');
              } else if (cached) {
                try {
                  const fmt = cached.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                  const props    = doc.getImageProperties(cached);
                  const imgRatio = props.width / props.height;
                  let fitW, fitH;
                  if (imgRatio > 1) { fitW = THUMB_SZ; fitH = THUMB_SZ / imgRatio; }
                  else              { fitH = THUMB_SZ; fitW = THUMB_SZ * imgRatio; }
                  const offX = (THUMB_SZ - fitW) / 2;
                  const offY = (THUMB_SZ - fitH) / 2;
                  sf(C.sectionBg); doc.setLineWidth(0);
                  doc.roundedRect(thumbX, y, THUMB_SZ, THUMB_SZ, 2, 2, 'F');
                  doc.addImage(cached, fmt, thumbX + offX, y + offY, fitW, fitH, undefined, 'FAST');
                  hairline(); ss(C.borderLight); doc.setFillColor(0, 0, 0, 0);
                  doc.roundedRect(thumbX, y, THUMB_SZ, THUMB_SZ, 2, 2, 'D');
                } catch {
                  sf(C.sectionBg); hairline(); ss(C.borderLight);
                  doc.roundedRect(thumbX, y, THUMB_SZ, THUMB_SZ, 2, 2, 'FD');
                  sans('normal', 6.5); sc(C.faint);
                  doc.text('—', thumbX + THUMB_SZ / 2, y + THUMB_SZ / 2 + 2, { align: 'center' });
                }
              } else {
                sf(C.sectionBg); hairline(); ss(C.borderLight);
                doc.roundedRect(thumbX, y, THUMB_SZ, THUMB_SZ, 2, 2, 'FD');
                sans('normal', 6.5); sc(C.faint);
                doc.text('No img', thumbX + THUMB_SZ / 2, y + THUMB_SZ / 2 + 2, { align: 'center' });
              }

              // Slide label below thumbnail
              sans('normal', 5.5); sc(C.faint);
              const barLabel = isVideo ? 'VIDEO' : `Slide ${ti + 1}`;
              doc.text(barLabel, thumbX + THUMB_SZ / 2, y + THUMB_SZ + 3.5, { align: 'center' });

              thumbX += THUMB_SZ + THUMB_GAP;
            }
            // +N more badge
            const extraSlides = Math.max(0, (assignment.slideCount || allThumbs.length) - showThumbCount);
            if (extraSlides > 0) {
              sf(C.sectionBg); hairline(); ss(C.borderLight);
              doc.roundedRect(thumbX, y, THUMB_SZ, THUMB_SZ, 2, 2, 'FD');
              sans('bold', 8); sc(C.muted);
              doc.text(`+${extraSlides}`, thumbX + THUMB_SZ / 2, y + THUMB_SZ / 2 + 2, { align: 'center' });
              sans('normal', 5.5); sc(C.faint);
              doc.text('more', thumbX + THUMB_SZ / 2, y + THUMB_SZ + 3.5, { align: 'center' });
            }
            y += THUMB_SZ + 8;
          }

          // ── Versions: horizontal columns ───────────────────────────────
          if (assignment.versions?.length > 0) {
            hairline(); ss(C.borderLight);
            doc.line(innerX, y, M + CW - CARD_PAD, y);
            y += 5;

            const MAX_COLS = 4;
            const COL_GAP  = 4;
            const THUMB_H  = 32;
            const HDR_H    = 17;
            const CELL_H   = HDR_H + THUMB_H + 4;

            for (let rowStart = 0; rowStart < assignment.versions.length; rowStart += MAX_COLS) {
              const rowVersions = assignment.versions.slice(rowStart, rowStart + MAX_COLS);
              const COLS = rowVersions.length;
              const COL_W = (innerW - (COLS - 1) * COL_GAP) / COLS;

              checkY(CELL_H + 6);

              for (let ci = 0; ci < COLS; ci++) {
                const version = rowVersions[ci];
                const vs      = getStatusStyle(version.status);
                const colX    = innerX + ci * (COL_W + COL_GAP);
                let   colY    = y;

                // Version header: label + badge
                sans('bold', 7.5); sc(C.body);
                doc.text(`v${version.versionNumber}`, colX, colY + 4);

                const vLblW   = doc.getTextWidth(`v${version.versionNumber}`) + 3;
                const badgeX  = colX + vLblW;
                const vBadgeW = doc.getTextWidth(vs.label) + 6;
                sf(vs.bg); doc.setLineWidth(0);
                doc.roundedRect(badgeX, colY, vBadgeW, 6, 3, 3, 'F');
                sans('normal', 5.5); sc(vs.tc);
                doc.text(vs.label, badgeX + vBadgeW / 2, colY + 4.2, { align: 'center' });

                colY += 7;

                if (version.submittedAt) {
                  sans('normal', 6); sc(C.faint);
                  doc.text(new Date(version.submittedAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }), colX, colY + 1);
                  colY += 5;
                }

                // Version thumbnail
                const vMediaUrls = (version.media || [])
                  .map(m => typeof m === 'string' ? m : (m?.url || m?.publicUrl || ''))
                  .filter(Boolean);
                const thumbTop = y + HDR_H;

                if (vMediaUrls.length > 0) {
                  const vUrl    = vMediaUrls[0];
                  const vCached = thumbCache[vUrl];
                  const vIsVid  = vCached === 'VIDEO' || isVideoUrl(vUrl);

                  if (vIsVid) {
                    sf([45, 50, 58]); hairline(); ss(C.borderLight);
                    doc.roundedRect(colX, thumbTop, COL_W, THUMB_H, 2, 2, 'FD');
                    const vcx = colX + COL_W / 2, vcy = thumbTop + THUMB_H / 2;
                    sf([255, 255, 255]); doc.setLineWidth(0);
                    doc.triangle(vcx - 3.5, vcy - 4.5, vcx - 3.5, vcy + 4.5, vcx + 5, vcy, 'F');
                  } else if (vCached) {
                    try {
                      const fmt      = vCached.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                      const props    = doc.getImageProperties(vCached);
                      const imgRatio = props.width / props.height;
                      const boxRatio = COL_W / THUMB_H;
                      let fitW, fitH;
                      if (imgRatio > boxRatio) { fitW = COL_W;   fitH = COL_W / imgRatio; }
                      else                     { fitH = THUMB_H; fitW = THUMB_H * imgRatio; }
                      const offX = (COL_W - fitW) / 2;
                      const offY = (THUMB_H - fitH) / 2;
                      sf(C.sectionBg); doc.setLineWidth(0);
                      doc.roundedRect(colX, thumbTop, COL_W, THUMB_H, 2, 2, 'F');
                      doc.addImage(vCached, fmt, colX + offX, thumbTop + offY, fitW, fitH, undefined, 'FAST');
                      hairline(); ss(C.borderLight); doc.setFillColor(0, 0, 0, 0);
                      doc.roundedRect(colX, thumbTop, COL_W, THUMB_H, 2, 2, 'D');
                    } catch {
                      sf(C.sectionBg); hairline(); ss(C.borderLight);
                      doc.roundedRect(colX, thumbTop, COL_W, THUMB_H, 2, 2, 'FD');
                    }
                  } else {
                    sf(C.sectionBg); hairline(); ss(C.borderLight);
                    doc.roundedRect(colX, thumbTop, COL_W, THUMB_H, 2, 2, 'FD');
                  }

                  if (vMediaUrls.length > 1) {
                    const moreLabel = `+${vMediaUrls.length - 1}`;
                    sans('bold', 5.5);
                    const moreLabelW = doc.getTextWidth(moreLabel) + 5;
                    sf([30, 36, 44]); doc.setLineWidth(0);
                    doc.roundedRect(colX + COL_W - moreLabelW - 2, thumbTop + THUMB_H - 8, moreLabelW, 6, 1, 1, 'F');
                    sc([255, 255, 255]);
                    doc.text(moreLabel, colX + COL_W - 2 - moreLabelW / 2, thumbTop + THUMB_H - 3.5, { align: 'center' });
                  }
                } else {
                  sf(C.sectionBg); hairline(); ss(C.borderLight);
                  doc.roundedRect(colX, thumbTop, COL_W, THUMB_H, 2, 2, 'FD');
                  sans('normal', 6); sc(C.faint);
                  doc.text('No media', colX + COL_W / 2, thumbTop + THUMB_H / 2 + 2, { align: 'center' });
                }
              }
              y += CELL_H + 4;
            }
            y += 2;
          }

          // ── Metrics divider ────────────────────────────────────────────
          hairline(); ss(C.borderLight);
          doc.line(innerX, y, M + CW - CARD_PAD, y);
          y += 5;

          // ── Metrics row ────────────────────────────────────────────────
          if (hasMetrics) {
            let totReach = 0, totLikes = 0, totComments = 0, totShares = 0, totSaves = 0;
            for (const post of asmMetricsPosts) {
              const mm = post.metrics || {};
              totReach    += mm.reach    || mm.impressions || 0;
              totLikes    += mm.likes    || 0;
              totComments += mm.comments || 0;
              totShares   += mm.shares   || 0;
              totSaves    += mm.saves    || mm.saved || 0;
            }
            const totEng    = totLikes + totComments + totShares;
            const engRate   = totReach > 0 ? ((totEng / totReach) * 100).toFixed(1) + '%' : '—';

            const metricCols = [
              { label: 'Reach',    value: fmtNum(totReach)    },
              { label: 'Likes',    value: fmtNum(totLikes)    },
              { label: 'Comments', value: fmtNum(totComments) },
              { label: 'Shares',   value: fmtNum(totShares)   },
              { label: 'Saves',    value: fmtNum(totSaves)    },
              { label: 'Eng. Rate', value: engRate, isRate: true },
            ];

            const metColW   = innerW / 6;
            const metricH   = 26;

            // Light metrics row background
            sf(C.sectionBg); doc.setLineWidth(0);
            doc.roundedRect(innerX, y, innerW, metricH, 2, 2, 'F');

            metricCols.forEach((mc, mi) => {
              const mx = innerX + mi * metColW;
              if (mi > 0) {
                hairline(); ss(C.borderLight);
                doc.line(mx, y + 3, mx, y + metricH - 3);
              }
              // Value
              serif('normal', mi === 5 ? 14 : 16);
              sc(mc.isRate ? C.engGreen : C.ink);
              doc.text(mc.value, mx + metColW / 2, y + 14, { align: 'center' });
              // Label
              sans('bold', 5.5); sc(C.faint);
              doc.text(mc.label.toUpperCase(), mx + metColW / 2, y + 21, { align: 'center' });
            });
            y += metricH + 6;
          } else {
            sans('normal', 7); sc(C.faint);
            doc.text('No performance metrics available', innerX + innerW / 2, y + 6, { align: 'center' });
            y += 12;
          }

          y += CARD_PAD;

          // ── Card border ────────────────────────────────────────────────
          const cardH = y - cardStartY;
          hairline(); ss(C.border);
          doc.roundedRect(M, cardStartY, CW, cardH, 2.5, 2.5, 'D');

          y += 5; // gap between cards

        } catch (asmErr) {
          console.warn('PDF: skipped assignment due to error', asmErr, assignment);
        }
      }

      // ── Footer on every page ──────────────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        // Bottom accent rule
        sf(C.sectionBg); doc.setLineWidth(0);
        doc.rect(0, PH - 14, PW, 14, 'F');
        hairline(); ss(C.border);
        doc.line(0, PH - 14, PW, PH - 14);

        sans('normal', 6.5); sc(C.muted);
        doc.text(
          `${sanitize(customerName)}  ·  ${sanitize(calendarName || 'All Calendars')}`,
          M, PH - 6
        );
        doc.text(
          `${sanitize(periodVal)}  ·  Page ${p} of ${totalPages}`,
          PW - M, PH - 6, { align: 'right' }
        );
      }

      // ── Save ──────────────────────────────────────────────────────────────
      const safeCustomer = sanitize(customerName).replace(/[^a-z0-9]/gi, '_');
      const safeCalendar = sanitize(calendarName || 'Report').replace(/[^a-z0-9]/gi, '_');
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
    setStatusFilter('all');
    setSortBy('date_desc');
    setSearchCreator('');
    setLiveScheduledPosts([]);
    setLiveMetricsCache({});
    fetchedMetricsRef.current = new Set();
  }, []);

  const fetchLiveMetrics = useCallback(async (assignmentId, posts) => {
    if (fetchedMetricsRef.current.has(assignmentId)) return;
    fetchedMetricsRef.current.add(assignmentId);

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

    try {
      const res = await fetch(`${API_URL}/api/admin/post-metrics/live`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: selectedCustomer, posts: publishedPosts }),
      });

      if (res.ok) {
        const json = await res.json();
        const enrichedPosts = json.posts || publishedPosts;
        // Carry back any permalink that the API resolved
        enrichedPosts.forEach(p => {
          if (p.metrics?.permalink && !p.instagramPermalink) {
            p.instagramPermalink = p.metrics.permalink;
          }
        });
        setLiveMetricsCache(prev => ({ ...prev, [assignmentId]: { loading: false, posts: enrichedPosts } }));
        return;
      }
    } catch (err) {
      console.warn('[fetchLiveMetrics] live endpoint failed, falling back to cached data:', err.message);
    }

    // Fallback: keep whatever metrics are already on the posts (from the report payload)
    setLiveMetricsCache(prev => ({ ...prev, [assignmentId]: { loading: false, posts: publishedPosts } }));
  }, [selectedCustomer]);

  const selectedCustomerObj = customers.find(c => (c._id || c.id) === selectedCustomer);
  const selectedCalendarObj = calendars.find(c => c._id === selectedCalendar);

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

  const postsByItem = useMemo(() => {
    if (!report) return { byId: {}, byTitle: {}, all: [] };
    const combined = [...(report.scheduledPosts || [])];
    const existingIds = new Set(combined.map(p => p._id).filter(Boolean));
    for (const lp of liveScheduledPosts) {
      if (lp._id && existingIds.has(lp._id)) continue;
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

  const summaryTotals = useMemo(() => {
    if (!report) return { items: 0, versions: 0, engagements: 0, reach: 0 };
    const cachedPosts = Object.values(liveMetricsCache).filter(v => !v.loading).flatMap(v => v.posts || []);
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
    const publishedCount = report.assignments.filter(a =>
      a.versions?.some(v => (v.status || '').toLowerCase() === 'published') ||
      (liveMetricsCache[a.assignmentId]?.posts || []).some(p => p.status === 'published' || p.publishedAt)
    ).length;
    const approvedCount = report.assignments.filter(a =>
      a.versions?.some(v => ['approved', 'published'].includes((v.status || '').toLowerCase()))
    ).length;
    const approvalRate = report.assignments.length > 0
      ? Math.round((approvedCount / report.assignments.length) * 100) : 0;
    const totalVersionCount = report.assignments.reduce((s, a) => s + (a.totalVersions || 1), 0);
    const avgRevisions = report.assignments.length > 0
      ? (totalVersionCount / report.assignments.length).toFixed(1) : '—';
    const timesToApproval = report.assignments
      .map(a => {
        const firstSub = a.firstSubmittedAt ? new Date(a.firstSubmittedAt) : null;
        const approvedV = a.versions?.find(v => ['approved', 'published'].includes((v.status || '').toLowerCase()));
        const approvedAt = approvedV?.updatedAt || approvedV?.reviewedAt || null;
        if (!firstSub || !approvedAt) return null;
        return (new Date(approvedAt) - firstSub) / (1000 * 60 * 60 * 24);
      })
      .filter(d => d !== null && d >= 0);
    const avgTimeToApproval = timesToApproval.length > 0
      ? (timesToApproval.reduce((s, d) => s + d, 0) / timesToApproval.length).toFixed(1) : null;
    const overallEngRate = reach > 0 ? ((engagements / reach) * 100).toFixed(1) : null;
    return {
      items: report.assignments?.length || 0,
      versions: report.summary?.totalVersions || 0,
      engagements, reach, publishedCount, approvedCount, approvalRate,
      avgRevisions, avgTimeToApproval, overallEngRate,
    };
  }, [report, liveMetricsCache]);

  const platformBreakdown = useMemo(() => {
    if (!report) return [];
    const map = {};
    const allCachedPosts = Object.values(liveMetricsCache).filter(v => !v.loading).flatMap(v => v.posts || []);
    const cachedIds = new Set(allCachedPosts.map(p => p._id).filter(Boolean));
    const fallback = (report.scheduledPosts || []).filter(p => !p._id || !cachedIds.has(p._id));
    for (const post of [...allCachedPosts, ...fallback]) {
      if (post.status !== 'published' && !post.publishedAt && !post.metrics) continue;
      const pl = (Array.isArray(post.platform) ? post.platform[0] : post.platform || 'unknown').toLowerCase();
      if (!map[pl]) map[pl] = { platform: pl, posts: 0, reach: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
      map[pl].posts++;
      if (post.metrics) {
        map[pl].reach    += post.metrics.reach    || post.metrics.impressions || 0;
        map[pl].likes    += post.metrics.likes    || 0;
        map[pl].comments += post.metrics.comments || 0;
        map[pl].shares   += post.metrics.shares   || 0;
        map[pl].saves    += post.metrics.saves    || post.metrics.saved || 0;
      }
    }
    return Object.values(map).sort((a, b) => b.posts - a.posts);
  }, [report, liveMetricsCache]);

  const statusDistribution = useMemo(() => {
    if (!report) return [];
    const counts = {};
    for (const a of (report.assignments || [])) {
      const latest = a.versions?.[a.versions.length - 1];
      const s = (latest?.status || 'pending').toLowerCase();
      const key = ['submitted', 'in_review', 'under_review'].includes(s) ? 'in_review'
        : s === 'revision_requested' ? 'revision' : s;
      counts[key] = (counts[key] || 0) + 1;
    }
    const total = report.assignments?.length || 1;
    const meta = {
      published: { label: 'Published', color: 'bg-emerald-500' },
      approved:  { label: 'Approved',  color: 'bg-green-500'   },
      in_review: { label: 'In Review', color: 'bg-amber-400'   },
      revision:  { label: 'Revision',  color: 'bg-orange-400'  },
      rejected:  { label: 'Rejected',  color: 'bg-red-400'     },
      pending:   { label: 'Pending',   color: 'bg-gray-300'    },
    };
    return ['published', 'approved', 'in_review', 'revision', 'rejected', 'pending']
      .filter(k => counts[k] > 0)
      .map(k => ({ status: k, ...meta[k], count: counts[k], pct: Math.round((counts[k] / total) * 100) }));
  }, [report]);

  const topPerformers = useMemo(() => {
    if (!report) return [];
    return report.assignments
      .map(a => {
        const posts = liveMetricsCache[a.assignmentId]?.posts || [];
        const reach = posts.reduce((s, p) => s + (p.metrics?.reach || p.metrics?.impressions || 0), 0);
        const eng   = posts.reduce((s, p) => s + (p.metrics?.likes || 0) + (p.metrics?.comments || 0) + (p.metrics?.shares || 0), 0);
        return { ...a, _totalReach: reach, _totalEng: eng, _engRate: reach > 0 ? parseFloat(((eng / reach) * 100).toFixed(1)) : 0 };
      })
      .filter(a => a._totalEng > 0 || a._totalReach > 0)
      .sort((a, b) => b._totalEng - a._totalEng)
      .slice(0, 3);
  }, [report, liveMetricsCache]);

  const creatorStats = useMemo(() => {
    if (!report) return [];
    const map = {};
    for (const a of (report.assignments || [])) {
      const name = a.creatorName || 'Unknown';
      if (!map[name]) map[name] = { name, email: a.creatorEmail || '', assigned: 0, approved: 0, published: 0, totalVersions: 0 };
      map[name].assigned++;
      map[name].totalVersions += a.totalVersions || 1;
      if (a.versions?.some(v => ['approved', 'published'].includes((v.status || '').toLowerCase()))) map[name].approved++;
      if (a.versions?.some(v => (v.status || '').toLowerCase() === 'published')) map[name].published++;
    }
    return Object.values(map).sort((a, b) => b.assigned - a.assigned);
  }, [report]);

  const contentTypeStats = useMemo(() => {
    if (!report) return [];
    const map = {};
    for (const a of (report.assignments || [])) {
      const t = (a.mediaType || 'image').toLowerCase();
      const label = t === 'carousel' ? 'Carousel' : t === 'video' ? 'Video' : 'Image';
      if (!map[label]) map[label] = { type: label, count: 0, eng: 0, reach: 0 };
      map[label].count++;
      for (const p of (liveMetricsCache[a.assignmentId]?.posts || [])) {
        if (!p.metrics) continue;
        map[label].eng   += (p.metrics.likes || 0) + (p.metrics.comments || 0) + (p.metrics.shares || 0);
        map[label].reach += p.metrics.reach || p.metrics.impressions || 0;
      }
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [report, liveMetricsCache]);

  const filteredSortedAssignments = useMemo(() => {
    if (!report) return [];
    let items = [...report.assignments];
    if (statusFilter !== 'all') {
      items = items.filter(a => {
        const latest = a.versions?.[a.versions.length - 1];
        const s = (latest?.status || '').toLowerCase();
        if (statusFilter === 'published')  return a.versions?.some(v => (v.status || '').toLowerCase() === 'published');
        if (statusFilter === 'approved')   return ['approved', 'published'].includes(s);
        if (statusFilter === 'in_review')  return ['submitted', 'in_review', 'under_review'].includes(s);
        if (statusFilter === 'rejected')   return s === 'rejected';
        if (statusFilter === 'revision')   return s === 'revision_requested';
        return true;
      });
    }
    if (searchCreator.trim()) {
      const q = searchCreator.trim().toLowerCase();
      items = items.filter(a =>
        (a.creatorName || '').toLowerCase().includes(q) || (a.creatorEmail || '').toLowerCase().includes(q)
      );
    }
    const getEng   = a => (liveMetricsCache[a.assignmentId]?.posts || []).reduce((s, p) => s + (p.metrics?.likes || 0) + (p.metrics?.comments || 0) + (p.metrics?.shares || 0), 0);
    const getReach = a => (liveMetricsCache[a.assignmentId]?.posts || []).reduce((s, p) => s + (p.metrics?.reach || p.metrics?.impressions || 0), 0);
    if (sortBy === 'date_asc')        items.sort((a, b) => new Date(a.firstSubmittedAt || 0) - new Date(b.firstSubmittedAt || 0));
    else if (sortBy === 'date_desc')  items.sort((a, b) => new Date(b.firstSubmittedAt || 0) - new Date(a.firstSubmittedAt || 0));
    else if (sortBy === 'engagement') items.sort((a, b) => getEng(b) - getEng(a));
    else if (sortBy === 'reach')      items.sort((a, b) => getReach(b) - getReach(a));
    else if (sortBy === 'revisions')  items.sort((a, b) => (b.totalVersions || 1) - (a.totalVersions || 1));
    else if (sortBy === 'creator')    items.sort((a, b) => (a.creatorName || '').localeCompare(b.creatorName || ''));
    return items;
  }, [report, statusFilter, searchCreator, sortBy, liveMetricsCache]);

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
        return [];
      })();
      fetchLiveMetrics(assignment.assignmentId, itemPosts);
    });
  }, [report, postsByItem, fetchLiveMetrics]);

  return (
    <AdminLayout title="Content Summary Report">
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

          {/* Breadcrumb + actions */}
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

          {/* Filters card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Filters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

          {loading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-500" />
              <p className="text-sm text-gray-500 font-medium">Building your report…</p>
            </div>
          )}

          {report && !loading && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { icon: FileText,    iconCls: 'text-blue-500',    label: 'Content Items',     value: summaryTotals.items,                              sub: null },
                  { icon: CheckCircle, iconCls: 'text-emerald-500', label: 'Published',         value: summaryTotals.publishedCount,                     sub: null },
                  { icon: TrendingUp,  iconCls: 'text-green-500',   label: 'Approval Rate',     value: summaryTotals.approvalRate + '%',                 sub: `${summaryTotals.approvedCount} approved` },
                  { icon: Layers,      iconCls: 'text-indigo-500',  label: 'Avg Revisions',     value: summaryTotals.avgRevisions,                       sub: `${summaryTotals.versions} total` },
                  { icon: Heart,       iconCls: 'text-rose-500',    label: 'Total Engagements', value: fmtNumUI(summaryTotals.engagements),              sub: summaryTotals.overallEngRate ? `${summaryTotals.overallEngRate}% eng rate` : null },
                  { icon: Eye,         iconCls: 'text-violet-500',  label: 'Total Reach',       value: fmtNumUI(summaryTotals.reach),                    sub: summaryTotals.avgTimeToApproval ? `~${summaryTotals.avgTimeToApproval}d to approve` : null },
                ].map(card => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="bg-white border border-gray-200 rounded-2xl p-4">
                      <Icon className={`w-5 h-5 ${card.iconCls} mb-2`} />
                      <p className="text-xl font-bold text-gray-900">{card.value}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                      {card.sub && <p className="text-[11px] text-gray-400 mt-0.5">{card.sub}</p>}
                    </div>
                  );
                })}
              </div>

              {statusDistribution.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Content Status Distribution</p>
                  <div className="flex h-3 rounded-full overflow-hidden gap-px mb-3">
                    {statusDistribution.map(s => (
                      <div key={s.status} className={`${s.color} transition-all`} style={{ width: `${s.pct}%` }} title={`${s.label}: ${s.count} (${s.pct}%)`} />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {statusDistribution.map(s => (
                      <div key={s.status} className="flex items-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                        <span className="text-xs text-gray-600 font-medium">{s.label}</span>
                        <span className="text-xs text-gray-400">{s.count} ({s.pct}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {topPerformers.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                    Top Performing Content
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {topPerformers.map((a, i) => (
                      <div key={a.assignmentId} className={`rounded-xl border p-3 ${i === 0 ? 'border-amber-200 bg-amber-50' : 'border-gray-100 bg-gray-50'}`}>
                        <div className="flex items-start gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-500'}`}>#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-gray-800 line-clamp-1">{a.itemTitle || a.caption?.slice(0, 50) || `Item ${i + 1}`}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{a.creatorName}</p>
                          </div>
                        </div>
                        <div className="flex gap-3 mt-2 pt-2 border-t border-gray-200">
                          <div>
                            <p className="text-sm font-bold text-gray-800">{fmtNumUI(a._totalEng)}</p>
                            <p className="text-[9px] text-gray-400">Engagements</p>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{fmtNumUI(a._totalReach)}</p>
                            <p className="text-[9px] text-gray-400">Reach</p>
                          </div>
                          {a._engRate > 0 && (
                            <div>
                              <p className="text-sm font-bold text-emerald-600">{a._engRate}%</p>
                              <p className="text-[9px] text-gray-400">Eng. rate</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {platformBreakdown.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-2xl p-5">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Platform Breakdown</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {['Platform', 'Posts', 'Reach', 'Likes', 'Comments', 'Shares', 'Eng. Rate'].map(h => (
                            <th key={h} className="text-left text-[11px] font-bold text-gray-400 uppercase pb-2 pr-4 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {platformBreakdown.map(row => {
                          const eng = row.likes + row.comments + row.shares;
                          const engRate = row.reach > 0 ? ((eng / row.reach) * 100).toFixed(1) : null;
                          return (
                            <tr key={row.platform} className="border-b border-gray-50 last:border-0">
                              <td className="py-2 pr-4"><PlatformPill platform={row.platform} /></td>
                              <td className="py-2 pr-4 font-semibold text-gray-800">{row.posts}</td>
                              <td className="py-2 pr-4 text-gray-600">{fmtNumUI(row.reach)}</td>
                              <td className="py-2 pr-4 text-gray-600">{fmtNumUI(row.likes)}</td>
                              <td className="py-2 pr-4 text-gray-600">{fmtNumUI(row.comments)}</td>
                              <td className="py-2 pr-4 text-gray-600">{fmtNumUI(row.shares)}</td>
                              <td className="py-2 pr-4 font-semibold text-emerald-600">{engRate ? `${engRate}%` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contentTypeStats.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Content Type Breakdown</p>
                    <div className="space-y-3">
                      {contentTypeStats.map(ct => {
                        const engRate = ct.reach > 0 ? ((ct.eng / ct.reach) * 100).toFixed(1) : null;
                        const pct = summaryTotals.items > 0 ? Math.round((ct.count / summaryTotals.items) * 100) : 0;
                        return (
                          <div key={ct.type}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-gray-700">{ct.type}</span>
                              <div className="flex items-center gap-3 text-xs text-gray-500">
                                <span>{ct.count} items ({pct}%)</span>
                                {ct.eng > 0 && <span className="text-emerald-600 font-semibold">{fmtNumUI(ct.eng)} eng</span>}
                                {engRate && <span className="text-gray-400">{engRate}% rate</span>}
                              </div>
                            </div>
                            <div className="h-1.5 bg-gray-100 rounded-full">
                              <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {creatorStats.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Creator Performance</p>
                      {creatorStats.length > 3 && (
                        <button onClick={() => setShowCreatorTable(v => !v)} className="text-xs text-blue-600 font-medium hover:underline">
                          {showCreatorTable ? 'Show less' : `View all ${creatorStats.length}`}
                        </button>
                      )}
                    </div>
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          {['Creator', 'Assigned', 'Approved', 'Avg Rev.'].map(h => (
                            <th key={h} className="text-left text-[11px] font-bold text-gray-400 uppercase pb-2 pr-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(showCreatorTable ? creatorStats : creatorStats.slice(0, 3)).map(c => (
                          <tr key={c.name} className="border-b border-gray-50 last:border-0">
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-1.5">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0 ${getAvatarColor(c.name)}`}>
                                  {getInitials(c.name)}
                                </div>
                                <span className="font-medium text-gray-800 text-xs truncate max-w-[90px]">{c.name}</span>
                              </div>
                            </td>
                            <td className="py-2 pr-3 font-semibold text-gray-800">{c.assigned}</td>
                            <td className="py-2 pr-3">
                              <span className={`text-xs font-semibold ${c.approved === c.assigned ? 'text-emerald-600' : 'text-gray-600'}`}>
                                {c.approved} <span className="text-gray-400 font-normal">({c.assigned > 0 ? Math.round((c.approved / c.assigned) * 100) : 0}%)</span>
                              </span>
                            </td>
                            <td className="py-2 pr-3 text-gray-600">{c.assigned > 0 ? (c.totalVersions / c.assigned).toFixed(1) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {report && !loading && (
            <div ref={reportRef}>
              <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {resolvedCalendarName || 'All Calendars'} — Report
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Showing {Math.min(visibleCount, filteredSortedAssignments.length)} of {filteredSortedAssignments.length} items
                    {filteredSortedAssignments.length !== report.assignments.length ? ` (filtered from ${report.assignments.length})` : ''}
                    {selectedCustomerObj ? ` · ${selectedCustomerObj.businessName || selectedCustomerObj.name}` : ''}
                    {(fromDate || toDate)
                      ? ` · ${fromDate ? new Date(fromDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '…'} – ${toDate ? new Date(toDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '…'}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => {
                      const allIds = report.assignments.map(a => a.assignmentId);
                      const anyCollapsed = allIds.some(id => expandedItems[id] === false);
                      const next = {};
                      allIds.forEach(id => { next[id] = anyCollapsed ? true : false; });
                      setExpandedItems(next);
                    }}
                    className="flex items-center gap-1.5 border border-gray-200 bg-white text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50"
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                    {Object.values(expandedItems).some(v => v === false) ? 'Expand All' : 'Collapse All'}
                  </button>
                  <div className="relative">
                    <User className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search creator…"
                      value={searchCreator}
                      onChange={e => { setSearchCreator(e.target.value); setVisibleCount(5); }}
                      className="pl-7 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-36"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); setVisibleCount(5); }}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="all">All statuses</option>
                    <option value="published">Published</option>
                    <option value="approved">Approved</option>
                    <option value="in_review">In Review</option>
                    <option value="revision">Revision Requested</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <select
                    value={sortBy}
                    onChange={e => { setSortBy(e.target.value); setVisibleCount(5); }}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="date_desc">Newest first</option>
                    <option value="date_asc">Oldest first</option>
                    <option value="engagement">Most engaged</option>
                    <option value="reach">Most reach</option>
                    <option value="revisions">Most revisions</option>
                    <option value="creator">By creator</option>
                  </select>
                </div>
              </div>

              {filteredSortedAssignments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white border border-gray-200 rounded-2xl text-gray-400">
                  <FileText className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-base font-semibold text-gray-500">
                    {report.assignments.length === 0 ? 'No content found' : 'No results match your filters'}
                  </p>
                  <p className="text-sm mt-1">
                    {report.assignments.length === 0 ? 'Try adjusting your filters.' : 'Clear or change the status / creator filters above.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {filteredSortedAssignments.slice(0, visibleCount).map((assignment, ai) => {
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
                        return [];
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
                            if (nowExpanded) {
                              fetchLiveMetrics(assignment.assignmentId, itemPosts);
                            }
                          }}
                        />
                      );
                    })}
                  </div>

                  {visibleCount < filteredSortedAssignments.length && (
                    <div className="flex items-center justify-center gap-3 mt-6 text-sm text-gray-500">
                      <span>Showing {visibleCount} of {filteredSortedAssignments.length} items</span>
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