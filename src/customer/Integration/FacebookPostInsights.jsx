import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Eye, MessageCircle, Share2, Heart,
  Users, TrendingUp, Clock, ChevronRight, Play,
  Info, Rocket, UserPlus, BarChart3, ThumbsUp
} from 'lucide-react';
import TrendChart from '../../components/TrendChart';

/**
 * FacebookPostInsights Component
 *
 * Displays comprehensive post insights matching Facebook's native Post Insights view.
 * Includes: Views over time, Audience Retention, Engagement, Followers vs Non-followers,
 *           Net Follows, How People Find Your Content, Who Viewed Your Content, Link Clicks.
 *
 * API Reference: https://developers.facebook.com/docs/graph-api/reference/insights#page-post-insights
 */

// ─── Simple line chart (Views over time) ──────────────────────────────────────
const ViewsLineChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const width = 320;
  const height = 80;
  const pad = { top: 8, right: 8, bottom: 20, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const pts = data.map((d, i) => {
    const x = pad.left + (i / (data.length - 1)) * innerW;
    const y = pad.top + (1 - d.value / maxVal) * innerH;
    return `${x},${y}`;
  }).join(' ');

  const areaClose = `${pad.left + innerW},${pad.top + innerH} ${pad.left},${pad.top + innerH}`;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="fbViewsGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1877F2" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1877F2" stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <polygon fill="url(#fbViewsGrad)" points={`${pts} ${areaClose}`} />
        <polyline fill="none" stroke="#1877F2" strokeWidth="2" strokeLinejoin="round" points={pts} />
        {data.map((d, i) => {
          const x = pad.left + (i / (data.length - 1)) * innerW;
          const y = pad.top + (1 - d.value / maxVal) * innerH;
          return <circle key={i} cx={x} cy={y} r="2.5" fill="#1877F2" />;
        })}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{data[0]?.label || ''}</span>
        <span>{data[Math.floor(data.length / 2)]?.label || ''}</span>
        <span>{data[data.length - 1]?.label || ''}</span>
      </div>
    </div>
  );
};

// ─── Audience Retention Chart ──────────────────────────────────────────────────
const RetentionChart = ({ data }) => {
  if (!data || data.length === 0) return null;

  const maxRet = Math.max(...data.map(d => d.retention), 1);
  const width = 320;
  const height = 90;
  const pad = { top: 10, right: 8, bottom: 20, left: 30 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const pts = data.map((d, i) => {
    const x = pad.left + (i / (data.length - 1)) * innerW;
    const y = pad.top + (1 - d.retention / maxRet) * innerH;
    return `${x},${y}`;
  }).join(' ');

  const grids = [0, 25, 50, 75, 100];

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height: 90 }}>
        <defs>
          <linearGradient id="fbRetGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1877F2" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#1877F2" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {grids.map(g => {
          const y = pad.top + (1 - g / 100) * innerH;
          return (
            <g key={g}>
              <line x1={pad.left} y1={y} x2={pad.left + innerW} y2={y} stroke="#E5E7EB" strokeWidth="0.5" />
              <text x={pad.left - 4} y={y + 3} fontSize="7" fill="#9CA3AF" textAnchor="end">{g}%</text>
            </g>
          );
        })}
        <polygon
          fill="url(#fbRetGrad)"
          points={`${pts} ${pad.left + innerW},${pad.top + innerH} ${pad.left},${pad.top + innerH}`}
        />
        <polyline fill="none" stroke="#1877F2" strokeWidth="2" strokeLinejoin="round" points={pts} />
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
};

// ─── Simple Horizontal Progress Bar ───────────────────────────────────────────
const HBar = ({ label, pct, value }) => (
  <div className="mb-2.5">
    <div className="flex justify-between text-xs text-gray-700 mb-1">
      <span>{label}</span>
      <span className="font-medium">{pct?.toFixed(1)}%</span>
    </div>
    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  </div>
);

// ─── Reaction Emoji Pill ───────────────────────────────────────────────────────
const ReactionPill = ({ emoji, label, count }) => (
  <div className="flex flex-col items-center gap-0.5 min-w-[44px]">
    <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg shadow-sm">
      {emoji}
    </div>
    <span className="text-xs font-semibold text-gray-800">{count?.toLocaleString() || 0}</span>
    <span className="text-[9px] text-gray-400">{label}</span>
  </div>
);

// ─── Donut / Pie chart for followers vs non-followers ─────────────────────────
const DonutChart = ({ followersPct, nonFollowersPct }) => {
  const r = 42;
  const circ = 2 * Math.PI * r;
  const followersArc = (followersPct / 100) * circ;
  const nonFollowersArc = (nonFollowersPct / 100) * circ;
  return (
    <div className="flex items-center gap-6">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {/* Non-followers (large slice) */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#1877F2" strokeWidth="14"
          strokeDasharray={`${nonFollowersArc} ${circ - nonFollowersArc}`}
          strokeDashoffset={circ * 0.25}
        />
        {/* Followers (small slice) */}
        <circle cx="50" cy="50" r={r} fill="none" stroke="#BBD6F8" strokeWidth="14"
          strokeDasharray={`${followersArc} ${circ - followersArc}`}
          strokeDashoffset={circ * 0.25 - nonFollowersArc}
        />
      </svg>
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#BBD6F8]" />
          <span className="text-gray-700">{followersPct?.toFixed(1)}%</span>
          <span className="text-gray-500 text-xs">Followers</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#1877F2]" />
          <span className="text-gray-700">{nonFollowersPct?.toFixed(1)}%</span>
          <span className="text-gray-500 text-xs">Non-followers</span>
        </div>
      </div>
    </div>
  );
};

// ─── Metric Row ────────────────────────────────────────────────────────────────
const MetricRow = ({ label, value }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-gray-100 last:border-0">
    <span className="text-sm text-gray-600">{label}</span>
    <span className="text-sm font-semibold text-gray-900">{value ?? '—'}</span>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
function FacebookPostInsights({
  isOpen,
  onClose,
  post,
  pageAccessToken,
  pageName,
  pageProfilePic,
  onBoostPost,
}) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audienceTab, setAudienceTab] = useState('age'); // age | countries
  const [trafficTab, setTrafficTab] = useState('traffic'); // traffic | source

  const isVideo =
    post?.type === 'video' ||
    post?.attachments?.data?.[0]?.type === 'video_inline' ||
    post?.attachments?.data?.[0]?.media_type === 'video';

  // ── Fetch insights from Facebook Graph API ────────────────────────────────
  useEffect(() => {
    if (isOpen && post && pageAccessToken) {
      fetchInsights();
    }
  }, [isOpen, post?.id, pageAccessToken]);

  const fetchInsights = async () => {
    if (!post || !pageAccessToken) return;
    setLoading(true);
    setError(null);

    try {
      console.log(`📊 [FacebookPostInsights v25.0] Fetching insights for post ${post.id}…`);

      /**
       * Post-level metrics available per Facebook Graph API v25.0 docs.
       * All use period=lifetime for post-level insights.
       *
       * Batch 1 — Core impression / engagement metrics
       *   post_impressions               Total times post entered a screen
       *   post_impressions_unique        Unique people who saw the post (Reach) — estimated
       *   post_impressions_organic       Organic impressions
       *   post_impressions_paid          Paid (ads) impressions
       *   post_clicks                    Total clicks (no story generated)
       *   post_engaged_users             Unique people who engaged
       *   post_activity_by_action_type   Stories by action type (like, comment, share …)
       *
       * Batch 2 — Per-reaction counts (individual metrics; more reliable than by_type_total)
       *   post_reactions_like_total      Like + Care reactions
       *   post_reactions_love_total
       *   post_reactions_wow_total
       *   post_reactions_haha_total
       *   post_reactions_sorry_total     Sad reactions
       *   post_reactions_anger_total
       *   post_negative_feedback_by_type hide_clicks, hide_all_clicks, report_spam_clicks, unlike_page_clicks
       *
       * Batch 3 — Video-only (fetched only when isVideo)
       *   post_video_views               3-second+ views (includes live views)
       *   post_video_views_organic       Organic 3s+ views
       *   post_video_views_paid          Paid 3s+ views
       *   post_video_complete_views_30s_organic   Played ≥30 s organic
       *   post_video_views_15s           Played ≥15 s
       *   post_video_view_time           Total watch time (ms)
       *   post_video_avg_time_watched    Average watch time (ms)
       *   post_video_retention_graph     Array of 40 retention % intervals
       *
       * NOT requested (deprecated ≥ v19.0):
       *   post_video_views_10s and variants
       */

      const base = `https://graph.facebook.com/v25.0/${post.id}/insights`;
      const tok  = `&access_token=${pageAccessToken}`;

      // Helper: fetch a single metric safely — never throws, returns null on error
      const fetchMetric = async (metric, period = 'lifetime') => {
        try {
          const res = await fetch(`${base}?metric=${metric}&period=${period}${tok}`);
          const json = await res.json();
          if (json?.error) {
            console.warn(`⚠️ Metric "${metric}" failed: ${json.error.message}`);
            return null;
          }
          return json;
        } catch (e) {
          console.warn(`⚠️ Metric "${metric}" threw:`, e.message);
          return null;
        }
      };

      // Fetch all metrics individually in parallel so one failure never blocks others
      const videoMetrics = isVideo ? [
        'post_video_views', 'post_video_views_organic', 'post_video_views_paid',
        'post_video_complete_views_30s_organic', 'post_video_views_15s',
        'post_video_view_time', 'post_video_avg_time_watched', 'post_video_retention_graph',
      ] : [];

      const allMetrics = [
        'post_impressions',
        'post_impressions_unique',
        'post_impressions_organic',
        'post_impressions_organic_unique',
        'post_impressions_paid',
        'post_impressions_paid_unique',
        'post_clicks',
        'post_reactions_like_total',
        'post_reactions_love_total',
        'post_reactions_wow_total',
        'post_reactions_haha_total',
        'post_reactions_sorry_total',
        'post_reactions_anger_total',
        'post_reactions_by_type_total',
        'post_activity_by_action_type',
        ...videoMetrics,
      ];

      const results = await Promise.all(allMetrics.map(m => fetchMetric(m)));

      // Build a combined lookup map: metric name → dataset (or null)
      const metricMap = {};
      allMetrics.forEach((name, i) => { metricMap[name] = results[i]; });

      console.log('📊 Metric results:', Object.fromEntries(
        Object.entries(metricMap).map(([k, v]) => [k, v ? '✅' : '❌'])
      ));

      // Helper: extract value from a single-metric response
      const getVal = (name) => {
        const dataset = metricMap[name];
        const m = dataset?.data?.[0];
        if (!m) return 0;
        const raw = m?.total_value?.value ?? m?.values?.[0]?.value;
        return raw ?? 0;
      };

      // ── Impressions & reach ───────────────────────────────────────────────
      // Some non-unique impression metrics are being deprecated by Facebook (June 2026).
      // Fall back to the _unique (reach) variants when the primary returns 0.
      const reach          = getVal('post_impressions_unique');
      const impressions    = getVal('post_impressions') || reach;
      const impressOrganic = getVal('post_impressions_organic') || getVal('post_impressions_organic_unique');
      const impressPaid    = getVal('post_impressions_paid')    || getVal('post_impressions_paid_unique');
      const clicks         = getVal('post_clicks');

      // ── Activity by action type ───────────────────────────────────────────
      const activityRaw = getVal('post_activity_by_action_type');
      const activity = typeof activityRaw === 'object' ? activityRaw : {};

      // ── Individual reaction counts ──────────────────────────────────────────────────
      // Primary: individual post_reactions_*_total metrics (total_value.value)
      // Fallback: post_reactions_by_type_total object, then post object total in 'like'
      let reactions = {
        like:  getVal('post_reactions_like_total'),
        love:  getVal('post_reactions_love_total'),
        wow:   getVal('post_reactions_wow_total'),
        haha:  getVal('post_reactions_haha_total'),
        sorry: getVal('post_reactions_sorry_total'),
        anger: getVal('post_reactions_anger_total'),
      };

      const apiReactionSum = reactions.like + reactions.love + reactions.wow +
        reactions.haha + reactions.sorry + reactions.anger;

      // If individual metrics all returned 0, try post_reactions_by_type_total (object shape)
      if (apiReactionSum === 0) {
        const byType = getVal('post_reactions_by_type_total');
        if (byType && typeof byType === 'object') {
          reactions = {
            like:  byType.LIKE  || byType.like  || 0,
            love:  byType.LOVE  || byType.love  || 0,
            wow:   byType.WOW   || byType.wow   || 0,
            haha:  byType.HAHA  || byType.haha  || 0,
            sorry: byType.SORRY || byType.sorry || 0,
            anger: byType.ANGER || byType.anger || 0,
          };
        }
      }

      // Final fallback: if API returned nothing, use post object total attributed to 'like'
      const reactionsApiSum = reactions.like + reactions.love + reactions.wow +
        reactions.haha + reactions.sorry + reactions.anger;
      const postObjReactionsTotal = post.reactions?.summary?.total_count ||
        post.likes?.summary?.total_count || 0;

      if (reactionsApiSum === 0 && postObjReactionsTotal > 0) {
        reactions.like = postObjReactionsTotal;
      }

      const reactionsTotal = reactionsApiSum || postObjReactionsTotal || 0;

      // ── Negative feedback (metric removed from batch — default to 0) ──────
      const negTotal = 0;

      // ── Post-object fallback values ───────────────────────────────────────
      const likesCount    = reactions.like  || post.likes?.summary?.total_count      || 0;
      const commentsCount = activity.comment || post.comments?.summary?.total_count  || 0;
      const sharesCount   = activity.share   || post.shares?.count                   || 0;

      // ── Engagement rate ───────────────────────────────────────────────────
      const engNum = reactionsTotal + commentsCount + sharesCount + clicks;
      const engRate = reach > 0 ? (engNum / reach) * 100 : 0;

      // Distribution signals
      const playerLikeRate = impressions > 0
        ? ((reactionsTotal / impressions) * 100).toFixed(2)
        : '0.00';
      const playerHideRate = impressions > 0
        ? ((negTotal / impressions) * 100).toFixed(2)
        : '0.00';

      // ── Video metrics ─────────────────────────────────────────────────────
      const videoViews       = getVal('post_video_views');
      const videoOrganic     = getVal('post_video_views_organic');
      const videoPaid        = getVal('post_video_views_paid');
      const complete30s      = getVal('post_video_complete_views_30s_organic');
      const views15s         = getVal('post_video_views_15s');
      const totalWatchTimeMs = getVal('post_video_view_time');
      const avgWatchTimeMs   = getVal('post_video_avg_time_watched');

      // ── Retention graph — 40-interval array from FB API (% at each interval) ──
      // API returns: [pct_interval_0, pct_interval_1, … pct_interval_39]
      // Each interval = 1/40 of video length. We downsample to 10 points for display.
      let retentionData = null;
      if (isVideo) {
        const retRaw = getVal('post_video_retention_graph');
        if (Array.isArray(retRaw) && retRaw.length > 0) {
          // Downsample 40 → 10 evenly spaced points
          const step = Math.floor(retRaw.length / 10);
          retentionData = Array.from({ length: 10 }, (_, i) => ({
            time:      i * Math.round((retRaw.length - 1) / 9),  // interval index
            retention: Math.max(0, Math.min(100, retRaw[i * step] ?? 0)),
            isReal:    true,
          }));
        } else {
          // Fallback simulated curve if API returns no data
          retentionData = Array.from({ length: 10 }, (_, i) => ({
            time:      i,
            retention: Math.max(5, 90 - i * 8.5 - Math.random() * 3),
            isReal:    false,
          }));
        }
      }

      // Drop-off point: first interval where retention dips below 50 %
      const dropOffInterval = retentionData?.find(d => d.retention < 50);
      const dropOffLabel = dropOffInterval?.isReal === false
        ? null  // don't show misleading drop-off for simulated data
        : dropOffInterval?.time ?? null;

      // Average % watched from API data
      let avgRetentionPct = null;
      if (avgWatchTimeMs && post.video_length_ms) {
        avgRetentionPct = Math.min(100, Math.round((avgWatchTimeMs / post.video_length_ms) * 100));
      } else if (avgWatchTimeMs && isVideo) {
        // Estimate: avg / 7s (rough heuristic for short videos)
        avgRetentionPct = null;
      }

      // ── Organic vs Paid impression ratio ─────────────────────────────────
      // Used to compute followers vs non-followers approximation
      const organicShare = impressions > 0 ? (impressOrganic / impressions) * 100 : 80;
      const paidShare    = impressions > 0 ? (impressPaid    / impressions) * 100 : 0;

      // ── Followers vs Non-followers (simulated — not in post-level API) ────
      const followersPct    = Math.min(50, Math.max(5, 14 + Math.random() * 6));
      const nonFollowersPct = 100 - followersPct;

      // ── Views over time — simulate cumulative growth from lifetime impressions ──
      const viewsOverTime = generateViewsOverTime(impressions || videoViews);

      // ── Traffic sources (simulated — not in post-level API) ────────────────
      const trafficSources = [
        { label: 'Your Page',   pct: 47.6 },
        { label: 'Reels',       pct: 23.8 },
        { label: 'Unavailable', pct: 19.0 },
        { label: 'Feed',        pct: 9.5  },
      ];
      // Organic / Paid / Viral source split derived from actual API data when available
      const sourceSources = impressions > 0
        ? [
            { label: 'Organic', pct: parseFloat(organicShare.toFixed(1)) },
            { label: 'Paid',    pct: parseFloat(paidShare.toFixed(1))    },
            { label: 'Viral',   pct: parseFloat(Math.max(0, 100 - organicShare - paidShare).toFixed(1)) },
          ].filter(s => s.pct > 0)
        : [
            { label: 'Organic', pct: 62.3 },
            { label: 'Viral',   pct: 28.1 },
            { label: 'Paid',    pct: 9.6  },
          ];

      // ── Audience demographics (simulated — Page-level only in FB API) ─────
      const ageGender = [
        { group: '18-24', pct: 89.5 },
        { group: '35-44', pct: 10.5 },
      ];
      const topCountries = [
        { country: '🇮🇳 India',         pct: 45.2 },
        { country: '🇺🇸 United States',  pct: 22.4 },
        { country: '🇬🇧 United Kingdom', pct: 12.3 },
        { country: '🇦🇪 UAE',            pct: 8.7  },
      ];

      setInsights({
        // Impressions
        impressions,
        impressOrganic,
        impressPaid,
        // Reach & engagement
        reach,
        clicks,
        engRate,
        // Counts
        likesCount,
        commentsCount,
        sharesCount,
        reactionsTotal,
        reactions,
        activity,
        // Distribution signals
        playerLikeRate,
        playerHideRate,
        negTotal,
        // Video
        videoViews,
        videoOrganic,
        videoPaid,
        complete30s,
        views15s,
        totalWatchTimeMs,
        avgWatchTimeMs,
        avgRetentionPct,
        retentionData,
        dropOffLabel,
        // Followers split (simulated)
        followersPct,
        nonFollowersPct,
        netFollows: 0,
        // Charts
        viewsOverTime,
        trafficSources,
        sourceSources,
        ageGender,
        topCountries,
      });
    } catch (err) {
      console.error('❌ [FacebookPostInsights] Error:', err);
      setError(err.message);
      // Minimal fallback from post object data
      const likeFallback = post.likes?.summary?.total_count || 0;
      setInsights({
        likesCount:      likeFallback,
        commentsCount:   post.comments?.summary?.total_count || 0,
        sharesCount:     post.shares?.count || 0,
        reactionsTotal:  post.reactions?.summary?.total_count || likeFallback,
        reactions:       { like: likeFallback, love: 0, haha: 0, wow: 0, sorry: 0, anger: 0 },
        playerLikeRate:  '0.00',
        playerHideRate:  '0.00',
        viewsOverTime:   generateViewsOverTime(0),
        trafficSources:  [{ label: 'Your Page', pct: 100 }],
        sourceSources:   [{ label: 'Organic', pct: 100 }],
        ageGender:       [],
        topCountries:    [],
        followersPct:    14,
        nonFollowersPct: 86,
        netFollows:      0,
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const generateViewsOverTime = (total) => {
    const days = 10;
    const labels = Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    let prev = 0;
    return labels.map((label, i) => {
      let factor;
      if (i <= 2) factor = (i + 1) / 3 * 0.65;
      else if (i <= 6) factor = 0.65 + ((i - 2) / 4) * 0.3;
      else factor = 0.95 + ((i - 6) / 3) * 0.05;
      const val = Math.round(total * factor);
      const delta = Math.max(0, val - prev);
      prev = val;
      return { label, value: delta, cumulative: val };
    });
  };

  const fmtMs = (ms) => {
    if (!ms) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  const fmtNum = (n) => {
    if (n === null || n === undefined) return '—';
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white w-full sm:max-w-md sm:max-h-[92vh] h-full sm:h-auto sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            {pageProfilePic ? (
              <img src={pageProfilePic} className="w-8 h-8 rounded-full object-cover" alt="page" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">F</span>
              </div>
            )}
            <div>
              <p className="text-sm font-bold text-gray-900 leading-tight">{pageName || 'Page'}</p>
              <p className="text-[10px] text-gray-500 leading-tight">
                {post?.created_time
                  ? new Date(post.created_time).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })
                  : ''}
                {post?.status_type === 'added_video' || isVideo ? ' · 🌐' : ' · 🌐'}
              </p>
            </div>
          </div>
          <span className="text-sm font-bold text-gray-900">Post insights</span>
        </div>

        {/* ── Scrollable body ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="animate-spin rounded-full h-9 w-9 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : !insights ? null : (
            <div className="pb-10">

              {/* Post preview */}
              {(post?.full_picture || post?.message) && (
                <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-start gap-3">
                  {post.full_picture && (
                    <div className="relative flex-shrink-0">
                      <img src={post.full_picture} alt="Post" className="w-20 h-20 object-cover rounded-lg" />
                      {isVideo && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-7 h-7 text-white drop-shadow-lg" fill="white" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-3">{post.message || post.story || 'No caption'}</p>
                    {post.permalink_url && (
                      <a
                        href={post.permalink_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                      >
                        View post →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* ── 1. Views over time ──────────────────────────────────── */}
              <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-gray-900">Views over time</h3>
                  <button className="p-0.5">
                    <Info className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <ViewsLineChart data={insights.viewsOverTime} />
                <div className="mt-3 space-y-0">
                  <MetricRow label="Views (impressions)" value={fmtNum(insights.impressions || insights.videoViews)} />
                  <MetricRow label="Viewers (reach)"     value={fmtNum(insights.reach)} />
                  {insights.impressOrganic > 0 && (
                    <MetricRow label="Organic impressions" value={fmtNum(insights.impressOrganic)} />
                  )}
                  {insights.impressPaid > 0 && (
                    <MetricRow label="Paid impressions" value={fmtNum(insights.impressPaid)} />
                  )}
                </div>
              </div>

              {/* ── 2. Audience Retention (video only) ─────────────────── */}
              {isVideo && insights.retentionData && (
                <div className="bg-white border-b border-gray-100 px-4 py-4">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-gray-900">Audience retention</h3>
                    <button className="p-0.5">
                      <Info className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mb-1">
                    Average watch time: {fmtMs(insights.avgWatchTimeMs)}
                  </p>
                  {insights.dropOffLabel !== null && insights.dropOffLabel !== undefined && (
                    <div className="flex items-start gap-2 bg-blue-50 rounded-lg px-3 py-2 mb-3">
                      <span className="text-blue-500 text-sm mt-0.5">💡</span>
                      <p className="text-xs text-blue-700">
                        Most of your audience dropped off at the 0:{String(insights.dropOffLabel).padStart(2, '0')} mark.
                      </p>
                    </div>
                  )}
                  {!insights.retentionData?.[0]?.isReal && (
                    <p className="text-[10px] text-gray-400 mb-2 italic">Retention graph is estimated (API data unavailable for this post).</p>
                  )}
                  <RetentionChart data={insights.retentionData} />
                  <div className="mt-3 space-y-0">
                    <MetricRow label="3-second views"            value={fmtNum(insights.videoViews)} />
                    <MetricRow label="3-second views (organic)"  value={fmtNum(insights.videoOrganic)} />
                    {insights.videoPaid > 0 && (
                      <MetricRow label="3-second views (paid)"   value={fmtNum(insights.videoPaid)} />
                    )}
                    <MetricRow label="15-second views"           value={fmtNum(insights.views15s)} />
                    <MetricRow label="30-second complete views"  value={fmtNum(insights.complete30s)} />
                    <MetricRow label="Watch time"                value={fmtMs(insights.totalWatchTimeMs)} />
                    <MetricRow label="Average watch time"        value={fmtMs(insights.avgWatchTimeMs)} />
                    {insights.avgRetentionPct !== null && insights.avgRetentionPct !== undefined && (
                      <MetricRow label="Average percentage watched" value={`${insights.avgRetentionPct}%`} />
                    )}
                  </div>
                </div>
              )}

              {/* ── 3. Engagement ───────────────────────────────────────── */}
              <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">
                    {insights.reactionsTotal + insights.commentsCount + insights.sharesCount + insights.clicks > 0
                      ? `${fmtNum(insights.reactionsTotal + insights.commentsCount + insights.sharesCount)} Engagement`
                      : 'Engagement'}
                  </h3>
                  <button className="p-0.5">
                    <Info className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* 2-col grid: Reactions / Clicks / Comments / Shares */}
                <div className="grid grid-cols-2 gap-0 border border-gray-200 rounded-xl overflow-hidden mb-4">
                  {[
                    { icon: '👍', label: 'Reactions', val: insights.reactionsTotal },
                    { icon: '🖱️',  label: 'Clicks',    val: insights.clicks },
                    { icon: '💬', label: 'Comments',  val: insights.commentsCount },
                    { icon: '↗️', label: 'Shares',    val: insights.sharesCount },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 px-4 py-3 bg-white ${
                        i % 2 === 0 ? 'border-r border-gray-200' : ''
                      } ${i < 2 ? 'border-b border-gray-200' : ''}`}
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <div className="text-base font-bold text-gray-900">{fmtNum(item.val)}</div>
                        <div className="text-[11px] text-gray-500">{item.label}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reaction by type */}
                <h4 className="text-xs font-semibold text-gray-600 mb-3">Reaction by type</h4>
                <div className="flex items-center gap-3 overflow-x-auto pb-1 mb-4">
                  <ReactionPill emoji="👍" label="Like"  count={insights.reactions.like} />
                  <ReactionPill emoji="❤️" label="Love"  count={insights.reactions.love} />
                  <ReactionPill emoji="😂" label="Haha"  count={insights.reactions.haha} />
                  <ReactionPill emoji="😮" label="Wow"   count={insights.reactions.wow} />
                  <ReactionPill emoji="😢" label="Sad"   count={insights.reactions.sorry} />
                  <ReactionPill emoji="😡" label="Angry" count={insights.reactions.anger} />
                </div>

                {/* Distribution signals */}
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Distribution signals</h4>
                <div className="grid grid-cols-2 gap-0 border border-gray-200 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 border-r border-gray-200">
                    <span className="text-2xl">👍</span>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{insights.playerLikeRate}%</div>
                      <div className="text-[10px] text-gray-500">Player like rate</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-2xl">🚫</span>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{insights.playerHideRate}%</div>
                      <div className="text-[10px] text-gray-500">Player hide rate</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 4. Followers vs Non-followers ───────────────────────── */}
              <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Followers vs non-followers</h3>
                  <button className="p-0.5">
                    <Info className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <DonutChart followersPct={insights.followersPct} nonFollowersPct={insights.nonFollowersPct} />
              </div>

              {/* ── 5. Net follows ──────────────────────────────────────── */}
              <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-gray-900">Net follows</h3>
                  <button className="p-0.5">
                    <Info className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="text-center py-3">
                  <span className="text-2xl font-bold text-gray-900">{insights.netFollows ?? 0}</span>
                  <p className="text-xs text-gray-500 mt-1">Net follows</p>
                </div>
              </div>

              {/* ── 6. How people find your content ─────────────────────── */}
              <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">How people find your content</h3>
                  <button className="p-0.5">
                    <Info className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                  {['Traffic', 'Source'].map(t => (
                    <button
                      key={t}
                      onClick={() => setTrafficTab(t.toLowerCase())}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        trafficTab === t.toLowerCase()
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {trafficTab === 'traffic'
                  ? insights.trafficSources.map((s, i) => <HBar key={i} {...s} />)
                  : insights.sourceSources.map((s, i) => <HBar key={i} {...s} />)}
              </div>

              {/* ── 7. Who viewed your content ──────────────────────────── */}
              <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Who viewed your content</h3>
                  <button className="p-0.5">
                    <Info className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                  {[{ id: 'age', label: 'Age and gender' }, { id: 'countries', label: 'Top countries' }].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setAudienceTab(t.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        audienceTab === t.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {audienceTab === 'age' && (
                  <div>
                    <div className="flex gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-500" />Women</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-300" />Men</span>
                      <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-gray-300" />Unknown</span>
                    </div>
                    {insights.ageGender.map((ag, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-700">{ag.group}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${ag.pct}%` }} />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">{ag.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {audienceTab === 'countries' && (
                  <div>
                    {insights.topCountries.map((c, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-700">{c.country}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${c.pct}%` }} />
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12 text-right">{c.pct}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── 8. Link clicks ──────────────────────────────────────── */}
              <div className="bg-white border-b border-gray-100 px-4 py-4">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-bold text-gray-900">Link clicks</h3>
                  <button className="p-0.5">
                    <Info className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                {insights.clicks > 0 ? (
                  <div className="text-center py-3">
                    <span className="text-2xl font-bold text-gray-900">{fmtNum(insights.clicks)}</span>
                    <p className="text-xs text-gray-500 mt-1">Link clicks</p>
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <p className="text-sm font-semibold text-gray-600">Insights not available</p>
                    <p className="text-xs text-gray-400 mt-1">There may not be enough data on your content yet. Check back again later.</p>
                  </div>
                )}
              </div>

              {/* ── 9. Engagement Trend Charts ──────────────────────────── */}
              <div className="bg-white border-b border-gray-100 px-4 py-4">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  Engagement Trends
                </h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Likes */}
                    <div className="bg-white rounded-lg p-2.5 border border-blue-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-gray-700">👍 Likes</span>
                        <span className="text-[11px] font-bold text-blue-600">{fmtNum(insights.likesCount)}</span>
                      </div>
                      <div className="h-20 sm:h-24">
                        <TrendChart data={generateTrendData(insights.likesCount)} title="Likes" color="#3B82F6" metric="value" minimal={true} />
                      </div>
                    </div>
                    {/* Comments */}
                    <div className="bg-white rounded-lg p-2.5 border border-green-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-gray-700">💬 Comments</span>
                        <span className="text-[11px] font-bold text-green-600">{fmtNum(insights.commentsCount)}</span>
                      </div>
                      <div className="h-20 sm:h-24">
                        <TrendChart data={generateTrendData(insights.commentsCount)} title="Comments" color="#10B981" metric="value" minimal={true} />
                      </div>
                    </div>
                    {/* Shares */}
                    <div className="bg-white rounded-lg p-2.5 border border-purple-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-gray-700">🔄 Shares</span>
                        <span className="text-[11px] font-bold text-purple-600">{fmtNum(insights.sharesCount)}</span>
                      </div>
                      <div className="h-20 sm:h-24">
                        <TrendChart data={generateTrendData(insights.sharesCount)} title="Shares" color="#8B5CF6" metric="value" minimal={true} />
                      </div>
                    </div>
                    {/* Reactions */}
                    <div className="bg-white rounded-lg p-2.5 border border-orange-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-gray-700">😍 Reactions</span>
                        <span className="text-[11px] font-bold text-orange-600">{fmtNum(insights.reactionsTotal)}</span>
                      </div>
                      <div className="h-20 sm:h-24">
                        <TrendChart data={generateTrendData(insights.reactionsTotal)} title="Reactions" color="#F59E0B" metric="value" minimal={true} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── 10. Boost Post CTA ──────────────────────────────────── */}
              {onBoostPost && (
                <div className="bg-white px-4 py-4">
                  <button
                    onClick={() => onBoostPost(post)}
                    className="flex items-center gap-3 w-full py-3 px-4 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-left"
                  >
                    <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Rocket className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">Boost this post</p>
                      <p className="text-xs text-gray-500">Reach more people with a paid promotion</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              )}

              {/* Error note */}
              {error && (
                <div className="px-4 py-3">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-700">Some metrics could not be loaded: {error}</p>
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-400 text-center px-4 py-3">
                Note: Audience demographics, retention, and content discovery data are simulated. Facebook API provides limited per-post insights.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper for trend charts — standalone (not a method in the component)
function generateTrendData(total) {
  const n = 10;
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - 1 - i));
    let f = i <= 3 ? (i / 3) * 0.7 : i <= 7 ? 0.7 + ((i - 3) / 4) * 0.25 : 0.95 + ((i - 7) / 3) * 0.05;
    f = Math.min(1, Math.max(0, f + (Math.random() - 0.5) * 0.03));
    return { date: d.toISOString().split('T')[0], value: Math.round(total * f) };
  });
}

export default FacebookPostInsights;
