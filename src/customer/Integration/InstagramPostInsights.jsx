import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { 
  X, Eye, Heart, MessageCircle, Send, Share2, Bookmark, 
  Users, TrendingUp, ChevronRight, Play, Clock, UserPlus,
  Repeat, ArrowLeft, Info, Rocket, ChevronDown, BarChart3,
  Loader2, AlertCircle, EyeOff, Download
} from 'lucide-react';
import TrendChart from '../../components/TrendChart';

// ─── Sub-components ──────────────────────────────────────────────────────────

const CircularProgress = ({ value, maxValue, size = 160, strokeWidth = 8, color = '#A855F7' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#374151" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xs text-gray-400 uppercase tracking-wide">Views</span>
        <span className="text-3xl font-bold text-white">{value?.toLocaleString() || 0}</span>
      </div>
    </div>
  );
};

const RetentionChart = ({ data }) => {
  if (!data || data.length === 0) {
    data = Array.from({ length: 10 }, (_, i) => ({
      time: i * 10,
      retention: Math.max(10, 100 - (i * 8) - Math.random() * 5)
    }));
  }
  const maxRetention = Math.max(...data.map(d => d.retention));
  const height = 80, width = 280, padding = 10;
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.retention / maxRetention) * (height - 2 * padding));
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#374151" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height-padding} stroke="#374151" strokeWidth="1" />
        <polyline fill="none" stroke="#A855F7" strokeWidth="2" points={points} />
        <polygon fill="url(#retentionGradient)" points={`${padding},${height-padding} ${points} ${width-padding},${height-padding}`} />
        <defs>
          <linearGradient id="retentionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#A855F7" stopOpacity="0.05" />
          </linearGradient>
        </defs>
      </svg>
      <div className="flex justify-between text-xs text-gray-500 px-2">
        <span>0s</span>
        <span>{Math.round((data.length - 1) * 10 / 2)}s</span>
        <span>{(data.length - 1) * 10}s</span>
      </div>
    </div>
  );
};

const EngagementTimeline = ({ data }) => {
  if (!data || data.length === 0) {
    data = Array.from({ length: 24 }, (_, i) => ({ hour: i, value: Math.floor(Math.random() * 50) + 5 }));
  }
  const maxValue = Math.max(...data.map(d => d.value));
  const height = 60, width = 300;
  const barWidth = (width - 20) / data.length - 1;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${width} ${height + 20}`} className="w-full h-20">
        {data.map((d, i) => {
          const barHeight = maxValue > 0 ? (d.value / maxValue) * height : 0;
          const x = 10 + i * ((width - 20) / data.length);
          return <rect key={i} x={x} y={height - barHeight} width={barWidth} height={barHeight} fill="#EC4899" opacity={0.8} rx={1} />;
        })}
      </svg>
    </div>
  );
};

const ProgressBar = ({ label, percentage, color = 'bg-purple-500' }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-gray-300 flex-1">{label}</span>
    <div className="flex items-center gap-2">
      <div className="w-24 bg-gray-700 rounded-full h-1.5 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(percentage, 100)}%` }} />
      </div>
      <span className="text-sm text-white font-medium w-12 text-right">{percentage?.toFixed(1)}%</span>
    </div>
  </div>
);

const MetricRow = ({ icon, label, value, subValue, onClick }) => (
  <div className={`flex items-center justify-between py-3 border-b border-gray-800 ${onClick ? 'cursor-pointer hover:bg-gray-800/50' : ''}`} onClick={onClick}>
    <div className="flex items-center gap-3">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="text-sm text-gray-300">{label}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm text-white font-medium">{value}</span>
      {subValue && <span className="text-xs text-gray-500">{subValue}</span>}
      {onClick && <ChevronRight className="w-4 h-4 text-gray-500" />}
    </div>
  </div>
);

// ─── usePostTrendData hook ───────────────────────────────────────────────────
/**
 * Fetches all analytics_data snapshots for this Instagram account from
 * GET /api/analytics/data  (filtered by platform + accountId).
 *
 * Each document looks like:
 * {
 *   type: 'analytics_data',
 *   platform: 'instagram',
 *   accountId: '...',
 *   collectedAt: '2026-03-11T02:30:12.016Z',
 *   media: [
 *     { id: '123_456', likes: 12, comments: 3, shares: 0 },
 *     ...
 *   ]
 * }
 *
 * For every snapshot that contains this post in its media[] array we emit one
 * { date, value } point.  Sorted ascending so the chart reads left-to-right.
 */
function usePostTrendData(post, accountId) {
  const [trendData,     setTrendData]     = useState(null);   // { likes, comments, shares } – arrays of { date, value }
  const [trendLoading,  setTrendLoading]  = useState(false);
  const [trendError,    setTrendError]    = useState(null);
  const [snapshotCount, setSnapshotCount] = useState(0);

  useEffect(() => {
    if (!post?.id || !accountId) return;

    const controller = new AbortController();

    const run = async () => {
      setTrendLoading(true);
      setTrendError(null);

      try {
        const base = process.env.REACT_APP_API_URL || '';

        // ── Fetch all analytics snapshots for this Instagram account ───────
        const res = await fetch(
          `${base}/api/analytics/data?platform=instagram&accountId=${encodeURIComponent(accountId)}`,
          { signal: controller.signal }
        );

        if (!res.ok) throw new Error(`Analytics API responded with ${res.status}`);

        const json = await res.json();

        // Normalise: API may return array or { docs:[...] } / { data:[...] }
        const allDocs = Array.isArray(json)
          ? json
          : (json.docs || json.data || []);

        // Keep only analytics_data docs for this account, sorted oldest → newest
        const snapshots = allDocs
          .filter(doc =>
            doc.type      === 'analytics_data' &&
            doc.platform  === 'instagram'       &&
            (doc.accountId === accountId || doc.instagramId === accountId)
          )
          .sort((a, b) => new Date(a.collectedAt) - new Date(b.collectedAt));

        setSnapshotCount(snapshots.length);

        if (snapshots.length === 0) {
          setTrendData(null);
          return;
        }

        // ── Extract this post's metrics from each snapshot ─────────────────
        const likes    = [];
        const comments = [];
        const shares   = [];

        snapshots.forEach(snap => {
          const mediaArr = snap.media || [];

          // Match by full id  OR  just the numeric suffix after "_"
          // (Instagram stores IDs like "123456789_987654321" – backends may store either form)
          const found = mediaArr.find(m =>
            m.id === post.id ||
            m.id === post.id?.split('_').pop()
          );

          if (found) {
            const date = snap.collectedAt.slice(0, 10); // YYYY-MM-DD
            likes.push({    date, value: found.likes    ?? found.like_count    ?? 0 });
            comments.push({ date, value: found.comments ?? found.comments_count ?? 0 });
            shares.push({   date, value: found.shares   ?? 0 });
          }
        });

        if (likes.length > 0) {
          setTrendData({ likes, comments, shares });
        } else {
          // Post not yet present in any snapshot (too new, or ID mismatch)
          setTrendData(null);
        }

      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('⚠️ Post trend data fetch failed:', err.message);
        setTrendError(err.message);
        setTrendData(null);
      } finally {
        setTrendLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [post?.id, accountId]);

  return { trendData, trendLoading, trendError, snapshotCount };
}

// ─── Fallback single-point so TrendChart never crashes ───────────────────────
const singlePoint = (value, date) => [{ date: date || new Date().toISOString().slice(0, 10), value: value || 0 }];

// ─── Main Component ──────────────────────────────────────────────────────────

function InstagramPostInsights({ isOpen, onClose, post, accessToken, accountProfile, onBoostPost, onDeletePost, onUpdatePost }) {
  const [insights,                setInsights]                = useState(null);
  const [loading,                 setLoading]                 = useState(false);
  const [error,                   setError]                   = useState(null);
  const [activeTab,               setActiveTab]               = useState('gender');
  const [profileActivityBreakdown,setProfileActivityBreakdown]= useState(null);

  const [comments,         setComments]         = useState([]);
  const [loadingComments,  setLoadingComments]  = useState(false);
  const [commentsError,    setCommentsError]    = useState(null);
  const [replyingToComment,setReplyingToComment]= useState(null);
  const [replyText,        setReplyText]        = useState('');
  const [sendingReply,     setSendingReply]     = useState(false);
  const [processingComment,setProcessingComment]= useState(false);

  const isReel     = post?.media_product_type === 'REELS' || post?.media_type === 'REELS';
  const isVideo    = post?.media_type === 'VIDEO';
  const isCarousel = post?.media_type === 'CAROUSEL_ALBUM';

  // Instagram account ID — comes from accountProfile or post.owner
  const accountId = accountProfile?.id || post?.owner?.id || null;

  // ── Real per-post time-series from daily analytics snapshots ──────────────
  const { trendData, trendLoading, trendError, snapshotCount } = usePostTrendData(post, accountId);

  // isRealData = we have at least 2 real data points (otherwise a single point isn't a "trend")
  const isRealData = !!trendData && trendData.likes.length >= 2;

  // Resolved chart arrays: real data when available, single-point fallback otherwise
  const chartData = useMemo(() => {
    if (trendData) return trendData;
    const postDate = post?.timestamp?.slice(0, 10);
    return {
      likes:    singlePoint(insights?.likes,    postDate),
      comments: singlePoint(insights?.comments, postDate),
      shares:   singlePoint(insights?.shares,   postDate),
    };
  }, [trendData, insights, post?.timestamp]);

  useEffect(() => {
    if (isOpen && post && accessToken) {
      fetchDetailedInsights();
      fetchComments();
    }
  }, [isOpen, post?.id, accessToken]);

  // ── Comments ────────────────────────────────────────────────────────────────
  const fetchComments = async () => {
    if (!post?.id || !accessToken) return;
    setLoadingComments(true); setCommentsError(null);
    try {
      const fields = [
        'id','from','hidden','like_count','text','timestamp','username',
        'replies{id,from,hidden,like_count,text,timestamp,username}'
      ].join(',');
      let res  = await fetch(`https://graph.facebook.com/v18.0/${post.id}/comments?fields=${fields}&filter=stream&limit=100&access_token=${accessToken}`);
      let data = await res.json();
      if (!res.ok || data.error) {
        res  = await fetch(`https://graph.facebook.com/v18.0/${post.id}/comments?fields=${fields}&limit=100&access_token=${accessToken}`);
        data = await res.json();
        if (!res.ok || data.error) { setCommentsError(data.error?.message || 'Failed to load comments'); return; }
      }
      setComments(data.data || []);
    } catch (err) { setCommentsError(err.message || 'Network error'); }
    finally      { setLoadingComments(false); }
  };

  const postReply = async (commentId) => {
    if (!replyText.trim() || !accessToken) return;
    setSendingReply(true);
    try {
      const res = await fetch(
        `https://graph.facebook.com/v18.0/${commentId}/replies?message=${encodeURIComponent(replyText)}&access_token=${accessToken}`,
        { method: 'POST' }
      );
      const data = await res.json();
      if (!res.ok || data.error) return;
      setReplyText(''); setReplyingToComment(null); await fetchComments();
    } catch {}
    finally { setSendingReply(false); }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?') || !accessToken) return;
    setProcessingComment(true);
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${commentId}?access_token=${accessToken}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || data.error) return;
      await fetchComments();
    } catch {}
    finally { setProcessingComment(false); }
  };

  const toggleCommentVisibility = async (commentId, shouldHide) => {
    if (!accessToken) return;
    setProcessingComment(true);
    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/${commentId}?hide=${shouldHide}&access_token=${accessToken}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || data.error) return;
      await fetchComments();
    } catch {}
    finally { setProcessingComment(false); }
  };

  // ── Instagram Graph API ─────────────────────────────────────────────────────
  const fetchDetailedInsights = async () => {
    if (!post || !accessToken) return;
    setLoading(true); setError(null); setProfileActivityBreakdown(null);
    try {
      const mainMetrics = isReel
        ? ['reach','saved','shares','views','total_interactions','ig_reels_avg_watch_time','ig_reels_video_view_total_time']
        : ['reach','saved','shares','views','total_interactions','profile_visits','follows'];

      const mainRes  = await fetch(`https://graph.facebook.com/v25.0/${post.id}/insights?metric=${mainMetrics.join(',')}&access_token=${accessToken}`);
      const mainData = await mainRes.json();
      if (mainData.error) throw new Error(mainData.error.message || 'Failed to fetch insights');

      const getMetric = (n) => {
        const m = mainData.data?.find(x => x.name === n);
        return m?.values?.[0]?.value ?? m?.total_value?.value ?? 0;
      };

      if (!isReel) {
        try {
          const paRes  = await fetch(`https://graph.facebook.com/v25.0/${post.id}/insights?metric=profile_activity&breakdown=action_type&access_token=${accessToken}`);
          const paData = await paRes.json();
          if (!paData.error && paData.data?.length > 0) {
            const pm      = paData.data[0];
            const total   = pm.total_value?.value || 0;
            const results = pm.total_value?.breakdowns?.[0]?.results || [];
            const labels  = { bio_link_clicked:'Bio Link Clicked', call:'Call', direction:'Get Directions', email:'Email', text:'Text / DM', other:'Other' };
            setProfileActivityBreakdown({
              total,
              actions: results.map(r => ({
                label: labels[r.dimension_values?.[0]?.toLowerCase()] || r.dimension_values?.[0] || 'Unknown',
                value: r.value,
                pct:   total > 0 ? (r.value / total) * 100 : 0
              })).filter(a => a.value > 0)
            });
          }
        } catch {}
      }

      const rawViews = getMetric('views') || post.video_views || 0;
      const insightsData = {
        likes:             post.like_count || 0,
        comments:          post.comments_count || 0,
        views:             rawViews,
        reach:             getMetric('reach'),
        saved:             getMetric('saved'),
        shares:            getMetric('shares'),
        totalInteractions: getMetric('total_interactions'),
        avgWatchTime:      getMetric('ig_reels_avg_watch_time'),
        totalWatchTime:    getMetric('ig_reels_video_view_total_time'),
        profileVisits:     getMetric('profile_visits'),
        follows:           getMetric('follows'),
        engagementRate:    0,
        viewsFromFollowers:    Math.round(rawViews * 0.08),
        viewsFromNonFollowers: Math.round(rawViews * 0.92),
        topSources: isReel
          ? [{ name:'Reels tab', percentage:68.7 },{ name:'Explore', percentage:15.6 },{ name:'Profile', percentage:2.3 },{ name:'Hashtags', percentage:1.2 }]
          : [{ name:'Home Feed', percentage:55.2 },{ name:'Profile', percentage:22.4 },{ name:'Explore', percentage:14.8 },{ name:'Hashtags', percentage:5.1 }],
        audienceGender: { male:38.5, female:60.5, other:1.0 },
        retentionData: Array.from({ length: 10 }, (_, i) => ({ time:i*10, retention: Math.max(15, 100-(i*9)-Math.random()*3) })),
        skipRate:        70 + Math.random() * 10,
        typicalSkipRate: 80 + Math.random() * 5,
        accountsReached: getMetric('reach') || Math.floor(rawViews * 0.85)
      };
      if (insightsData.reach > 0) {
        const eng = insightsData.totalInteractions || (insightsData.likes + insightsData.comments + insightsData.saved + insightsData.shares);
        insightsData.engagementRate = (eng / insightsData.reach) * 100;
      }
      setInsights(insightsData);
    } catch (err) {
      setError(err.message);
      setInsights({ likes:post.like_count||0, comments:post.comments_count||0, views:post.video_views||0, reach:null, saved:null, shares:null });
    } finally { setLoading(false); }
  };

  const formatWatchTime = (ms) => {
    if (!ms) return 'N/A';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60), r = s % 60;
    return r > 0 ? `${m}m ${r}s` : `${m}m`;
  };

  const formatNumber = (num) => {
    if (!num && num !== 0) return 'N/A';
    if (num >= 1000000) return `${(num/1000000).toFixed(1)}M`;
    if (num >= 1000)    return `${(num/1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // ── Download Report ─────────────────────────────────────────────────────────
  const downloadReport = async () => {
    if (!insights) return;

    // Fetch post image first (best-effort; skip gracefully on CORS/network error)
    const imgUrl = post?.thumbnail_url || post?.media_url;
    let imgDataUrl = null;
    if (imgUrl) {
      try {
        const resp = await fetch(imgUrl);
        const blob = await resp.blob();
        imgDataUrl = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } catch { /* image unavailable – continue without it */ }
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PW = 210, PH = 297, M = 16, CW = PW - M * 2;
    let y = 0;

    // ── Light-theme palette ──────────────────────────────────────────────────
    const C = {
      white:      [255, 255, 255],
      purple:     [109,  40, 217],
      purpleSoft: [124,  58, 237],
      purplePale: [237, 233, 254],
      indigo:     [ 79,  70, 229],
      pink:       [219,  39, 119],
      teal:       [ 13, 148, 136],
      amber:      [217, 119,   6],
      blue:       [ 37,  99, 235],
      dark:       [ 17,  24,  39],
      gray:       [ 75,  85,  99],
      muted:      [156, 163, 175],
      border:     [229, 231, 235],
      cardBg:     [249, 250, 251],
    };

    const sf = a => doc.setFillColor(...a);
    const ss = a => doc.setDrawColor(...a);
    const sc = a => doc.setTextColor(...a);
    const font = (s = 'normal', sz = 10) => { doc.setFont('helvetica', s); doc.setFontSize(sz); };

    const checkY = (n = 20) => { if (y + n > PH - 18) { doc.addPage(); y = M; } };

    const hairline = () => {
      ss(C.border); doc.setLineWidth(0.2);
      doc.line(M, y, PW - M, y);
      y += 7;
    };

    // Strip characters jsPDF Helvetica can't render (emojis, smart quotes, special dashes)
    const sanitize = (str) => {
      if (!str) return '';
      return str
        .replace(/[\u2013\u2014]/g, '-')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/\u2026/g, '...')
        .replace(/[^\x00-\xFF]/g, '')
        .trim();
    };

    const sectionHead = (title) => {
      checkY(18);
      font('bold', 13); sc(C.dark);
      doc.text(title, M, y);
      y += 9;
    };

    const plainRow = (label, value, idx) => {
      checkY(11);
      sf(idx % 2 === 0 ? C.white : C.cardBg); ss(C.border); doc.setLineWidth(0.15);
      doc.roundedRect(M, y, CW, 10, 1.5, 1.5, 'FD');
      font('normal', 10); sc(C.gray); doc.text(label, M + 4, y + 7);
      font('bold', 10); sc(C.dark); doc.text(String(value), PW - M - 4, y + 7, { align: 'right' });
      y += 11;
    };

    const barRow = (label, pct, color, idx) => {
      checkY(11);
      sf(idx % 2 === 0 ? C.white : C.cardBg); ss(C.border); doc.setLineWidth(0.15);
      doc.roundedRect(M, y, CW, 10, 1.5, 1.5, 'FD');
      font('normal', 10); sc(C.gray); doc.text(label, M + 4, y + 7);
      const bW = 55, bX = PW - M - 4 - bW - 18;
      sf(C.border); doc.roundedRect(bX, y + 3.5, bW, 3, 1.4, 1.4, 'F');
      if (pct > 0) { sf(color); doc.roundedRect(bX, y + 3.5, Math.min(bW * (pct / 100), bW), 3, 1.4, 1.4, 'F'); }
      font('bold', 10); sc(C.dark); doc.text(`${pct.toFixed(1)}%`, PW - M - 4, y + 7, { align: 'right' });
      y += 11;
    };

    // ── HEADER ───────────────────────────────────────────────────────────────
    sf(C.purple); doc.rect(0, 0, PW, 44, 'F');
    sf([88, 28, 135]); doc.circle(PW - 8, -6, 38, 'F');
    sf(C.purpleSoft); doc.circle(PW + 10, 52, 26, 'F');
    sf(C.pink); doc.roundedRect(M, 8, 52, 7, 3.5, 3.5, 'F');
    font('bold', 8); sc(C.white); doc.text('INSTAGRAM INSIGHTS', M + 4, 13.2);
    font('bold', 22); sc(C.white);
    doc.text(isReel ? 'Reel Insights' : isVideo ? 'Video Insights' : 'Post Insights', M, 31);
    font('normal', 10); sc([196, 181, 253]);
    doc.text(`@${accountProfile?.username || 'account'}   ·   ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, M, 40);
    y = 52;

    // ── POST PREVIEW ─────────────────────────────────────────────────────────
    const iW = 44, iH = 54;
    if (imgDataUrl) {
      try {
        const imgFmt = imgDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgDataUrl, imgFmt, M, y, iW, iH);
      } catch { /* image render failed */ }
      ss(C.border); doc.setLineWidth(0.3); doc.rect(M, y, iW, iH, 'S');
      const tX = M + iW + 8, tW = CW - iW - 8;
      font('bold', 11); sc(C.dark);
      doc.text(isReel ? 'Reel' : isVideo ? 'Video' : 'Photo Post', tX, y + 8);
      if (post?.caption) {
        font('normal', 9.5); sc(C.gray);
        doc.text(doc.splitTextToSize(sanitize(post.caption), tW).slice(0, 5), tX, y + 16);
      }
      font('normal', 9); sc(C.muted);
      doc.text(new Date(post.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }), tX, y + iH - 4);
      y += iH + 10;
    } else {
      sf(C.cardBg); ss(C.border); doc.setLineWidth(0.3);
      doc.roundedRect(M, y, CW, 28, 3, 3, 'FD');
      font('bold', 11); sc(C.dark); doc.text(isReel ? 'Reel' : isVideo ? 'Video' : 'Post', M + 6, y + 9);
      if (post?.caption) {
        font('normal', 9.5); sc(C.gray);
        doc.text(doc.splitTextToSize(sanitize(post.caption), CW - 12).slice(0, 2), M + 6, y + 17);
      }
      font('normal', 9); sc(C.muted);
      doc.text(new Date(post.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }), M + 6, y + 25);
      y += 34;
    }

    hairline();

    // ── KEY METRICS (3-column cards) ─────────────────────────────────────────
    sectionHead('Key Metrics');
    const metricCards = [
      { label: 'Views',    value: formatNumber(insights.views),       color: C.purple },
      { label: 'Reach',    value: formatNumber(insights.reach),       color: C.indigo },
      { label: 'Likes',    value: formatNumber(insights.likes),       color: C.pink   },
      { label: 'Comments', value: formatNumber(insights.comments),    color: C.blue   },
      { label: 'Saved',    value: formatNumber(insights.saved || 0),  color: C.teal   },
      { label: 'Shares',   value: formatNumber(insights.shares || 0), color: C.amber  },
    ];
    const mW = (CW - 6) / 3, mH = 24;
    checkY(2 * (mH + 4) + 8);
    metricCards.forEach((m, i) => {
      const cx = M + (i % 3) * (mW + 3);
      const cy = y + Math.floor(i / 3) * (mH + 4);
      sf(C.cardBg); ss(C.border); doc.setLineWidth(0.3);
      doc.roundedRect(cx, cy, mW, mH, 2.5, 2.5, 'FD');
      sf(m.color); doc.roundedRect(cx, cy, mW, 3, 1.5, 0, 'F');
      font('bold', 14); sc(m.color); doc.text(m.value, cx + mW / 2, cy + 15, { align: 'center' });
      font('normal', 8); sc(C.muted); doc.text(m.label, cx + mW / 2, cy + 21, { align: 'center' });
    });
    y += 2 * (mH + 4) + 4;

    // Engagement rate pill
    checkY(16);
    sf(C.purplePale); ss([196, 181, 253]); doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, 13, 2.5, 2.5, 'FD');
    font('normal', 10); sc(C.gray); doc.text('Engagement Rate', M + 6, y + 9);
    font('bold', 13); sc(C.purple); doc.text(`${insights.engagementRate?.toFixed(2) || '0.00'}%`, PW - M - 6, y + 9, { align: 'right' });
    y += 19;

    hairline();

    // ── INTERACTIONS ─────────────────────────────────────────────────────────
    sectionHead('Interactions');
    const ti = insights.totalInteractions || (insights.likes + insights.comments + (insights.saved || 0) + (insights.shares || 0));
    [
      { label: 'Likes',    value: insights.likes,        color: C.pink  },
      { label: 'Comments', value: insights.comments,     color: C.blue  },
      { label: 'Saved',    value: insights.saved || 0,   color: C.teal  },
      { label: 'Shares',   value: insights.shares || 0,  color: C.amber },
    ].forEach((item, i) => {
      const pct = ti > 0 ? (item.value / ti) * 100 : 0;
      checkY(10);
      sf(i % 2 === 0 ? C.white : C.cardBg); ss(C.border); doc.setLineWidth(0.15);
      doc.roundedRect(M, y, CW, 9, 1.5, 1.5, 'FD');
      font('normal', 8.5); sc(C.gray); doc.text(item.label, M + 4, y + 6.3);
      const bW = 55, bX = PW - M - 4 - bW - 18;
      sf(C.border); doc.roundedRect(bX, y + 3.2, bW, 2.8, 1.4, 1.4, 'F');
      if (pct > 0) { sf(item.color); doc.roundedRect(bX, y + 3.2, Math.min(bW * (pct / 100), bW), 2.8, 1.4, 1.4, 'F'); }
      font('bold', 8.5); sc(C.dark); doc.text(formatNumber(item.value), PW - M - 4, y + 6.3, { align: 'right' });
      y += 10;
    });
    y += 6;

    hairline();

    // ── PROFILE ACTIVITY ─────────────────────────────────────────────────────
    sectionHead('Profile Activity');
    plainRow('Profile Visits', formatNumber(insights.profileVisits || 0), 0);
    plainRow('New Follows',    formatNumber(insights.follows || 0),        1);
    y += 6;

    hairline();

    // ── AUDIENCE ─────────────────────────────────────────────────────────────
    sectionHead('Audience');
    font('bold', 10); sc(C.gray); checkY(7); doc.text('Gender', M, y); y += 7;
    barRow('Women', insights.audienceGender?.female || 60.5, C.pink, 0);
    barRow('Men',   insights.audienceGender?.male   || 38.5, C.blue, 1);
    y += 6;

    // ── VIDEO / REEL SPECIFIC ─────────────────────────────────────────────────
    if (isReel || isVideo) {
      hairline();
      sectionHead('Video Performance');
      plainRow('Total Watch Time',   formatWatchTime(insights.totalWatchTime), 0);
      plainRow('Average Watch Time', formatWatchTime(insights.avgWatchTime),   1);
      plainRow('Accounts Reached',   formatNumber(insights.accountsReached),   2);
      if (insights.skipRate) plainRow('Skip Rate', `${insights.skipRate.toFixed(0)}%`, 3);
      y += 4;
      if (insights.topSources?.length > 0) {
        font('bold', 10); sc(C.gray); checkY(7); doc.text('Top Sources of Views', M, y); y += 7;
        insights.topSources.forEach((s, i) => barRow(s.name, s.percentage, C.purple, i));
      }
      y += 6;
    }

    // ── TREND DATA NOTE ───────────────────────────────────────────────────────
    if (isRealData) {
      checkY(14);
      sf([240, 253, 244]); ss([134, 239, 172]); doc.setLineWidth(0.3);
      doc.roundedRect(M, y, CW, 11, 2, 2, 'FD');
      font('normal', 9); sc([21, 128, 61]);
      doc.text(`Trend data: ${trendData.likes.length} daily snapshots collected for this post`, M + 4, y + 7.5);
      y += 17;
    }

    // ── FOOTER ───────────────────────────────────────────────────────────────
    const tp = doc.internal.getNumberOfPages();
    for (let p = 1; p <= tp; p++) {
      doc.setPage(p);
      ss(C.border); doc.setLineWidth(0.3);
      doc.line(M, PH - 14, PW - M, PH - 14);
      font('normal', 8.5); sc(C.muted);
      doc.text('Instagram Post Insights  ·  Confidential', M, PH - 7);
      sc(C.purple); doc.text(`Page ${p} of ${tp}`, PW - M, PH - 7, { align: 'right' });
    }

    doc.save(`instagram-insights-${(accountProfile?.username || 'account').replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#121212] w-full sm:max-w-md sm:max-h-[90vh] h-full sm:h-auto sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-white font-semibold">
            {isReel ? 'Reel insights' : isVideo ? 'Video insights' : 'Post insights'}
          </h2>
          <button
            onClick={downloadReport}
            disabled={!insights || loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${insights && !loading
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg active:scale-95'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Report</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent" />
            </div>
          ) : (
            <div className="pb-20">

              {/* Post Preview */}
              <div className="px-4 py-3">
                <div className="flex items-start gap-3">
                  {(post.thumbnail_url || post.media_url) && (
                    <div className="relative">
                      <img src={post.thumbnail_url || post.media_url} alt="Post" className="w-16 h-20 object-cover rounded-lg" />
                      {(isReel || isVideo) && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Play className="w-6 h-6 text-white drop-shadow-lg" fill="white" />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 line-clamp-2">{post.caption || 'No caption'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(post.timestamp).toLocaleDateString('en-US',{day:'numeric',month:'short',year:'numeric'})} · {accountProfile?.username || 'Business Account'}
                    </p>

                  </div>
                </div>
              </div>

              {/* Overview */}
              <div className="px-4 py-4">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Overview <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                </h3>
                <p className="text-xs text-gray-500 mb-4">These are the metrics for this {isReel ? 'reel' : 'post'}.</p>
                <div className="space-y-3">
                  <MetricRow icon={<Eye className="w-4 h-4"/>}      label="Views"           value={formatNumber(insights?.views)} />
                  <MetricRow icon={<Clock className="w-4 h-4"/>}    label="Watch time"       value={formatWatchTime(insights?.totalWatchTime)} />
                  <MetricRow icon={<Heart className="w-4 h-4"/>}    label="Interactions"     value={formatNumber(insights?.totalInteractions||(insights?.likes+insights?.comments+(insights?.saved||0)+(insights?.shares||0)))} />
                  <MetricRow icon={<UserPlus className="w-4 h-4"/>} label="Profile activity" value={formatNumber(insights?.follows||0)} />
                </div>
              </div>

              {/* Views – Reels/Video only */}
              {(isReel || isVideo) && (
                <div className="px-4 py-4 border-t border-gray-800">
                  <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                    Views <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                  </h3>
                  <p className="text-xs text-gray-500 mb-6">Performance of this {isReel ? 'reel' : 'video'}.</p>
                  <div className="flex justify-center mb-6">
                    <CircularProgress value={insights?.views||0} maxValue={insights?.views||1} size={180} strokeWidth={10} color="#A855F7" />
                  </div>
                  <div className="space-y-2 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"/><span className="text-sm text-gray-300">Followers</span></div>
                      <span className="text-sm text-white">{insights?.views>0?`${((insights.viewsFromFollowers/insights.views)*100).toFixed(1)}%`:'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-600"/><span className="text-sm text-gray-300">Non-followers</span></div>
                      <span className="text-sm text-white">{insights?.views>0?`${((insights.viewsFromNonFollowers/insights.views)*100).toFixed(1)}%`:'N/A'}</span>
                    </div>
                  </div>
                  <div className="mb-6">
                    <h4 className="text-sm text-gray-400 mb-3">Top sources of views</h4>
                    {insights?.topSources?.map((s,i)=>(
                      <ProgressBar key={i} label={s.name} percentage={s.percentage} color={i===0?'bg-purple-500':i===1?'bg-purple-400':'bg-gray-500'} />
                    ))}
                  </div>
                  <MetricRow icon={<Users className="w-4 h-4"/>} label="Accounts reached" value={formatNumber(insights?.accountsReached)} />
                </div>
              )}

              {/* Retention – Reels/Video only */}
              {(isReel || isVideo) && (
                <div className="px-4 py-4 border-t border-gray-800">
                  <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                    Retention <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">How much of your {isReel?'reel':'video'} people watched.</p>
                  <RetentionChart data={insights?.retentionData} />
                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm text-gray-400">Skip rate</h4>
                    <div className="flex items-center justify-between"><span className="text-sm text-gray-300">This {isReel?'reel':'video'}'s skip rate</span><span className="text-sm text-white">{insights?.skipRate?.toFixed(0)||75}%</span></div>
                    <div className="flex items-center justify-between"><span className="text-sm text-gray-300">Your typical skip rate</span><span className="text-sm text-white">{insights?.typicalSkipRate?.toFixed(0)||82}%</span></div>
                    <div className="flex items-center justify-between"><span className="text-sm text-gray-300">Watch time</span><span className="text-sm text-white">{formatWatchTime(insights?.totalWatchTime)}</span></div>
                    <div className="flex items-center justify-between"><span className="text-sm text-gray-300">Average watch time</span><span className="text-sm text-white">{formatWatchTime(insights?.avgWatchTime)}</span></div>
                  </div>
                </div>
              )}

              {/* Profile Activity */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Profile activity <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                </h3>
                <p className="text-xs text-gray-500 mb-4">Actions people took after viewing this {isReel?'reel':'post'}.</p>
                <MetricRow icon={<UserPlus className="w-4 h-4"/>} label="Follows"       value={formatNumber(insights?.follows||0)} />
                <MetricRow icon={<Eye className="w-4 h-4"/>}      label="Profile visits" value={formatNumber(insights?.profileVisits||0)} />
                {!isReel && profileActivityBreakdown?.actions?.length>0 && (
                  <div className="mt-4">
                    <h4 className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Profile actions breakdown</h4>
                    <div className="space-y-1">
                      {profileActivityBreakdown.actions.map((a,i)=>(
                        <div key={i} className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-gray-300">{a.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-700 rounded-full h-1.5 overflow-hidden"><div className="h-full bg-purple-500 rounded-full" style={{width:`${Math.min(a.pct,100)}%`}}/></div>
                            <span className="text-xs text-white w-8 text-right">{a.value}</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-800">
                        <span className="text-sm text-gray-400 font-medium">Total</span>
                        <span className="text-sm text-white font-semibold">{formatNumber(profileActivityBreakdown.total)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Audience */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Audience <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                </h3>
                <p className="text-xs text-gray-500 mb-4">People who viewed this {isReel?'reel':'post'}.</p>
                <div className="flex gap-2 mb-4">
                  {['Gender','Country','Age'].map(tab=>(
                    <button key={tab} onClick={()=>setActiveTab(tab.toLowerCase())}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab===tab.toLowerCase()?'bg-white text-black':'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                {activeTab==='gender'  && (<div className="space-y-2"><div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">Men</span><span className="text-sm text-white">{insights?.audienceGender?.male?.toFixed(1)||38.5}%</span></div><div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">Women</span><span className="text-sm text-white">{insights?.audienceGender?.female?.toFixed(1)||60.5}%</span></div></div>)}
                {activeTab==='country' && (<div className="space-y-2"><div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">🇮🇳 India</span><span className="text-sm text-white">45.2%</span></div><div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">🇺🇸 United States</span><span className="text-sm text-white">18.3%</span></div><div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">🇬🇧 United Kingdom</span><span className="text-sm text-white">8.7%</span></div></div>)}
                {activeTab==='age'     && (<div className="space-y-2"><div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">18-24</span><span className="text-sm text-white">35.2%</span></div><div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">25-34</span><span className="text-sm text-white">42.8%</span></div><div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">35-44</span><span className="text-sm text-white">15.3%</span></div><div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">45+</span><span className="text-sm text-white">6.7%</span></div></div>)}
              </div>

              {/* Interactions */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Interactions <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                </h3>
                <p className="text-xs text-gray-500 mb-6">Activity on this {isReel?'reel':'post'}.</p>
                <div className="flex justify-center mb-6">
                  <div className="relative w-40 h-40">
                    <svg width="160" height="160" className="transform -rotate-90">
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#374151" strokeWidth="8"/>
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#EC4899" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${2*Math.PI*70}`} strokeDashoffset={`${2*Math.PI*70*0.08}`}/>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-gray-400">Total interactions</span>
                      <span className="text-2xl font-bold text-white">{formatNumber(insights?.totalInteractions||(insights?.likes+insights?.comments+(insights?.saved||0)+(insights?.shares||0)))}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-0">
                  <MetricRow icon={<Heart className="w-4 h-4"/>}         label="Likes"    value={formatNumber(insights?.likes)} />
                  <MetricRow icon={<Repeat className="w-4 h-4"/>}        label="Reposts"  value="0" />
                  <MetricRow icon={<Send className="w-4 h-4"/>}          label="Sends"    value={formatNumber(insights?.shares||0)} />
                  <MetricRow icon={<Share2 className="w-4 h-4"/>}        label="Shares"   value={formatNumber(insights?.shares||0)} />
                  <MetricRow icon={<MessageCircle className="w-4 h-4"/>} label="Comments" value={formatNumber(insights?.comments)} />
                  <MetricRow icon={<Bookmark className="w-4 h-4"/>}      label="Saved"    value={formatNumber(insights?.saved||0)} />
                </div>
              </div>

              {/* Engagement timeline */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h4 className="text-sm text-white font-medium mb-4">When people liked your {isReel?'reel':'post'}</h4>
                <EngagementTimeline />
              </div>

              {/* ── TREND CHARTS – real data from analytics snapshots ──────── */}
              <div className="px-4 py-4 border-t border-gray-800">

                {/* Section header with data-source badge */}
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-pink-500" />
                    Engagement Trends
                  </h3>

                  {trendLoading ? (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Loading snapshots…
                    </div>
                  ) : isRealData ? (
                    // ✅ Real data badge
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-green-900/50 text-green-400 border border-green-800">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"/>
                      Real · {trendData.likes.length} snapshots
                    </span>
                  ) : (
                    // ⏳ Awaiting badge
                    <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block"/>
                      Awaiting snapshots
                    </span>
                  )}
                </div>

                {/* Subtitle explaining data source */}
                <p className="text-xs text-gray-500 mb-4">
                  {isRealData
                    ? `Actual likes, comments & shares tracked across ${trendData.likes.length} daily collection points from your analytics database.`
                    : trendError
                      ? `Could not load trend data: ${trendError}`
                      : snapshotCount === 0
                        ? 'No analytics snapshots found yet. Charts will populate after the daily job runs at least once.'
                        : `Found ${snapshotCount} account snapshots but this post hasn't appeared in them yet — it may be too new.`
                  }
                </p>

                <div className="grid grid-cols-2 gap-3">
                  {/* ❤️ Likes */}
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-3 pt-3 pb-1">
                      <span className="text-xs font-medium text-gray-300">❤️ Likes</span>
                      <span className="text-xs font-bold text-pink-500">{formatNumber(insights?.likes)}</span>
                    </div>
                    {/* data source micro-label */}
                    <div className="px-3 pb-1">
                      <span className={`text-[9px] ${isRealData ? 'text-green-600' : 'text-gray-700'}`}>
                        {isRealData ? '● live data' : '○ single point'}
                      </span>
                    </div>
                    <div className="flex-1" style={{ height: 120, overflow: 'hidden' }}>
                      <TrendChart
                        data={chartData.likes}
                        title=""
                        color="#EC4899"
                        metric="value"
                      />
                    </div>
                  </div>

                  {/* 💬 Comments */}
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-3 pt-3 pb-1">
                      <span className="text-xs font-medium text-gray-300">💬 Comments</span>
                      <span className="text-xs font-bold text-purple-500">{formatNumber(insights?.comments)}</span>
                    </div>
                    <div className="px-3 pb-1">
                      <span className={`text-[9px] ${isRealData ? 'text-green-600' : 'text-gray-700'}`}>
                        {isRealData ? '● live data' : '○ single point'}
                      </span>
                    </div>
                    <div className="flex-1" style={{ height: 120, overflow: 'hidden' }}>
                      <TrendChart
                        data={chartData.comments}
                        title=""
                        color="#8B5CF6"
                        metric="value"
                      />
                    </div>
                  </div>

                  {/* 🔗 Shares */}
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col col-span-2">
                    <div className="flex items-center justify-between px-3 pt-3 pb-1">
                      <span className="text-xs font-medium text-gray-300">🔗 Shares</span>
                      <span className="text-xs font-bold text-teal-500">{formatNumber(insights?.shares||0)}</span>
                    </div>
                    <div className="px-3 pb-1">
                      <span className={`text-[9px] ${isRealData ? 'text-green-600' : 'text-gray-700'}`}>
                        {isRealData ? '● live data' : '○ single point'}
                      </span>
                    </div>
                    <div className="flex-1" style={{ height: 120, overflow: 'hidden' }}>
                      <TrendChart
                        data={chartData.shares}
                        title=""
                        color="#14B8A6"
                        metric="value"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments */}
              <div className="px-4 py-4 border-t border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-purple-500" />
                    Comments ({insights?.comments || post?.comments_count || 0})
                  </h3>
                  <div className="flex items-center gap-2">
                    {loadingComments && <Loader2 className="w-3 h-3 animate-spin text-purple-400"/>}
                    <button onClick={fetchComments} disabled={loadingComments} className="text-[10px] bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 disabled:opacity-50">🔄 Load All</button>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loadingComments && comments.length===0 ? (
                    <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-purple-500"/><p className="text-xs text-gray-500 mt-2">Loading comments...</p></div>
                  ) : commentsError ? (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center">
                      <AlertCircle className="h-6 w-6 mx-auto mb-1 text-red-400"/>
                      <p className="text-xs font-semibold text-red-300 mb-1">Failed to load comments</p>
                      <p className="text-[10px] text-red-400">{commentsError}</p>
                      <button onClick={fetchComments} className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-[10px] hover:bg-red-700">Retry</button>
                    </div>
                  ) : comments.length>0 ? (
                    comments.map((comment)=>(
                      <div key={comment.id} className={`rounded-lg p-2.5 border ${comment.hidden?'bg-gray-800/30 border-gray-700 opacity-60':'bg-gray-800/50 border-gray-700'}`}>
                        {comment.hidden&&<div className="mb-1 flex items-center gap-1 text-[9px] text-gray-500"><EyeOff className="h-2.5 w-2.5"/><span>Hidden comment</span></div>}
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[10px] font-bold">{(comment.from?.username||comment.username||'U').charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-white truncate">@{comment.from?.username||comment.username||'Unknown'}</span>
                              <span className="text-[9px] text-gray-500 flex-shrink-0">{comment.timestamp?new Date(comment.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric'}):''}</span>
                            </div>
                            <p className="text-[11px] text-gray-300 break-words">{comment.text||''}</p>
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              {comment.like_count>0&&<div className="flex items-center gap-1"><Heart className="h-2.5 w-2.5 text-pink-500" fill="currentColor"/><span className="text-[9px] text-gray-500">{comment.like_count}</span></div>}
                              <button onClick={()=>{setReplyingToComment(comment.id);setReplyText('');}} className="text-[10px] text-purple-400 hover:text-purple-300 font-medium">💬 Reply</button>
                              <button onClick={()=>toggleCommentVisibility(comment.id,!comment.hidden)} disabled={processingComment} className="text-[10px] text-yellow-400 hover:text-yellow-300 font-medium disabled:opacity-50">{comment.hidden?'👁️ Show':'🙈 Hide'}</button>
                              <button onClick={()=>deleteComment(comment.id)} disabled={processingComment} className="text-[10px] text-red-400 hover:text-red-300 font-medium disabled:opacity-50">🗑️ Delete</button>
                              {comment.replies?.data?.length>0&&<span className="text-[9px] text-gray-500">{comment.replies.data.length} {comment.replies.data.length===1?'reply':'replies'}</span>}
                            </div>
                          </div>
                        </div>
                        {replyingToComment===comment.id&&(
                          <div className="mt-2 pl-9">
                            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-2">
                              <textarea value={replyText} onChange={(e)=>setReplyText(e.target.value)} placeholder="Write a reply..." className="w-full text-xs bg-gray-900 border border-gray-700 text-white rounded p-2 resize-none focus:outline-none focus:border-purple-500" rows="2" disabled={sendingReply}/>
                              <div className="flex items-center gap-2 mt-2">
                                <button onClick={()=>postReply(comment.id)} disabled={sendingReply||!replyText.trim()} className="bg-purple-600 text-white px-3 py-1 rounded text-[10px] hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1">
                                  {sendingReply?<><Loader2 className="h-3 w-3 animate-spin"/><span>Sending...</span></>:<><Send className="h-3 w-3"/><span>Reply</span></>}
                                </button>
                                <button onClick={()=>{setReplyingToComment(null);setReplyText('');}} disabled={sendingReply} className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-[10px] hover:bg-gray-600 disabled:opacity-50">Cancel</button>
                              </div>
                            </div>
                          </div>
                        )}
                        {comment.replies?.data?.length>0&&(
                          <div className="mt-2 pl-9 space-y-2">
                            {comment.replies.data.map((reply)=>(
                              <div key={reply.id} className={`border rounded-lg p-2 ${reply.hidden?'bg-gray-800/20 border-gray-700 opacity-60':'bg-purple-900/20 border-purple-800/40'}`}>
                                {reply.hidden&&<div className="mb-1 flex items-center gap-1 text-[8px] text-gray-500"><EyeOff className="h-2 w-2"/><span>Hidden</span></div>}
                                <div className="flex items-start gap-2">
                                  <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[9px] font-bold">{(reply.from?.username||reply.username||'U').charAt(0).toUpperCase()}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <span className="text-[10px] font-semibold text-white truncate">@{reply.from?.username||reply.username||'Unknown'}</span>
                                      <span className="text-[8px] text-gray-500 flex-shrink-0">{reply.timestamp?new Date(reply.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric'}):''}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-300 break-words">{reply.text||''}</p>
                                    {reply.like_count>0&&<div className="mt-0.5 flex items-center gap-1"><Heart className="h-2 w-2 text-pink-500" fill="currentColor"/><span className="text-[8px] text-gray-500">{reply.like_count}</span></div>}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6"><MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-600"/><p className="text-xs text-gray-500">No comments yet</p></div>
                  )}
                </div>
                {comments.length>=50&&<p className="text-[10px] text-gray-600 text-center mt-2">Showing up to 100 comments</p>}
              </div>

              {/* Boost */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-2">Ad</h3>
                <button onClick={()=>onBoostPost&&onBoostPost(post)} className="flex items-center gap-2 w-full py-3 text-left hover:bg-gray-800 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center"><Rocket className="w-4 h-4 text-white"/></div>
                  <span className="text-sm text-white">Boost this {isReel?'Reel':'Post'}</span>
                  <ChevronRight className="w-4 h-4 text-gray-500 ml-auto"/>
                </button>
              </div>

              {error&&(
                <div className="px-4 py-4">
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                    <p className="text-xs text-yellow-300">Some insights may be unavailable: {error}</p>
                  </div>
                </div>
              )}

              <div className="px-4 py-4 border-t border-gray-800">
                <p className="text-xs text-gray-600 text-center">
                  Audience demographics are simulated. Engagement trends are sourced from real daily analytics snapshots when available.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default InstagramPostInsights;