import React, { useState, useEffect, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { 
  X, Eye, Heart, MessageCircle, Send, Share2, Bookmark, 
  Users, TrendingUp, ChevronRight, Play, Clock, UserPlus,
  Repeat, ArrowLeft, Info, Rocket, ChevronDown, BarChart3,
  Loader2, AlertCircle, Trash2, EyeOff, Download
} from 'lucide-react';
import TrendChart from '../../components/TrendChart';

// ─── Sub-components (unchanged) ─────────────────────────────────────────────

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
    data = Array.from({ length: 10 }, (_, i) => ({ time: i * 10, retention: Math.max(10, 100 - (i * 8) - Math.random() * 5) }));
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
        <span>0s</span><span>{Math.round((data.length - 1) * 10 / 2)}s</span><span>{(data.length - 1) * 10}s</span>
      </div>
    </div>
  );
};

const EngagementTimeline = ({ data, metric = 'likes' }) => {
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
          return <rect key={i} x={x} y={height-barHeight} width={barWidth} height={barHeight} fill="#EC4899" opacity={0.8} rx={1} />;
        })}
      </svg>
    </div>
  );
};

const ProgressBar = ({ label, value, percentage, color = 'bg-purple-500', icon }) => (
  <div className="flex items-center justify-between py-2">
    <div className="flex items-center gap-2 flex-1">
      {icon && <span className="text-gray-400">{icon}</span>}
      <span className="text-sm text-gray-300">{label}</span>
    </div>
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

// ─── Main Component ──────────────────────────────────────────────────────────

function InstagramPostInsights({ isOpen, onClose, post, accessToken, accountProfile, onBoostPost }) {
  const [insights, setInsights]                         = useState(null);
  const [loading, setLoading]                           = useState(false);
  const [error, setError]                               = useState(null);
  const [activeTab, setActiveTab]                       = useState('gender');
  const [profileActivityBreakdown, setProfileActivityBreakdown] = useState(null);

  const [comments, setComments]                         = useState([]);
  const [loadingComments, setLoadingComments]           = useState(false);
  const [commentsError, setCommentsError]               = useState(null);
  const [replyingToComment, setReplyingToComment]       = useState(null);
  const [replyText, setReplyText]                       = useState('');
  const [sendingReply, setSendingReply]                 = useState(false);
  const [processingComment, setProcessingComment]       = useState(false);

  const isReel     = post?.media_product_type === 'REELS' || post?.media_type === 'REELS';
  const isVideo    = post?.media_type === 'VIDEO';
  const isCarousel = post?.media_type === 'CAROUSEL_ALBUM';

  const generatePostTrendData = (metricValue, metricType) => {
    const dataPoints = 10;
    return Array.from({ length: dataPoints }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (dataPoints - 1 - i));
      let pf = i <= 3 ? (i / 3) * 0.7 : i <= 7 ? 0.7 + ((i-3)/4)*0.25 : 0.95 + ((i-7)/3)*0.05;
      pf = Math.max(0, Math.min(1, pf + (Math.random()-0.5)*0.03));
      return { date: date.toISOString().split('T')[0], value: Math.round(metricValue * pf) };
    });
  };

  useEffect(() => {
    if (isOpen && post && accessToken) { fetchDetailedInsights(); fetchComments(); }
  }, [isOpen, post?.id, accessToken]);

  const fetchComments = async () => {
    if (!post?.id || !accessToken) return;
    setLoadingComments(true); setCommentsError(null);
    try {
      const fields = ['id','from','hidden','like_count','text','timestamp','username','replies{id,from,hidden,like_count,text,timestamp,username}'].join(',');
      const response = await fetch(`https://graph.facebook.com/v18.0/${post.id}/comments?fields=${fields}&filter=stream&limit=100&access_token=${accessToken}`);
      let data = await response.json();
      if (!response.ok || data.error) {
        const resp2 = await fetch(`https://graph.facebook.com/v18.0/${post.id}/comments?fields=${fields}&limit=100&access_token=${accessToken}`);
        data = await resp2.json();
        if (!resp2.ok || data.error) { setCommentsError(data.error?.message || 'Failed to load comments'); return; }
      }
      setComments(data.data || []);
    } catch (err) { setCommentsError(err.message || 'Network error'); }
    finally { setLoadingComments(false); }
  };

  const postReply = async (commentId) => {
    if (!replyText.trim() || !accessToken) return;
    setSendingReply(true);
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${commentId}/replies?message=${encodeURIComponent(replyText)}&access_token=${accessToken}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || data.error) return;
      setReplyText(''); setReplyingToComment(null); await fetchComments();
    } catch {}
    finally { setSendingReply(false); }
  };

  const deleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?') || !accessToken) return;
    setProcessingComment(true);
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${commentId}?access_token=${accessToken}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok || data.error) return;
      await fetchComments();
    } catch {}
    finally { setProcessingComment(false); }
  };

  const toggleCommentVisibility = async (commentId, shouldHide) => {
    if (!accessToken) return;
    setProcessingComment(true);
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/${commentId}?hide=${shouldHide}&access_token=${accessToken}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok || data.error) return;
      await fetchComments();
    } catch {}
    finally { setProcessingComment(false); }
  };

  const fetchDetailedInsights = async () => {
    if (!post || !accessToken) return;
    setLoading(true); setError(null); setProfileActivityBreakdown(null);
    try {
      let mainMetrics = isReel
        ? ['reach','saved','shares','views','total_interactions','ig_reels_avg_watch_time','ig_reels_video_view_total_time']
        : ['reach','saved','shares','views','total_interactions','profile_visits','follows'];

      const mainResponse = await fetch(`https://graph.facebook.com/v25.0/${post.id}/insights?metric=${mainMetrics.join(',')}&access_token=${accessToken}`);
      const mainData = await mainResponse.json();
      if (mainData.error) throw new Error(mainData.error.message || 'Failed to fetch insights');

      const getMetricValue = (n) => {
        const m = mainData.data?.find(x => x.name === n);
        return m?.values?.[0]?.value ?? m?.total_value?.value ?? 0;
      };

      if (!isReel) {
        try {
          const paResponse = await fetch(`https://graph.facebook.com/v25.0/${post.id}/insights?metric=profile_activity&breakdown=action_type&access_token=${accessToken}`);
          const paData = await paResponse.json();
          if (!paData.error && paData.data?.length > 0) {
            const pm = paData.data[0];
            const total = pm.total_value?.value || 0;
            const breakdown = pm.total_value?.breakdowns?.[0]?.results || [];
            const actionLabels = { bio_link_clicked:'Bio Link Clicked', call:'Call', direction:'Get Directions', email:'Email', text:'Text / DM', other:'Other' };
            setProfileActivityBreakdown({
              total,
              actions: breakdown.map(r => ({
                label: actionLabels[r.dimension_values?.[0]?.toLowerCase()] || r.dimension_values?.[0] || 'Unknown',
                value: r.value,
                pct: total > 0 ? (r.value / total) * 100 : 0
              })).filter(a => a.value > 0)
            });
          }
        } catch {}
      }

      const rawViews = getMetricValue('views') || post.video_views || 0;
      const insightsData = {
        likes: post.like_count || 0,
        comments: post.comments_count || 0,
        views: rawViews,
        reach: getMetricValue('reach'),
        saved: getMetricValue('saved'),
        shares: getMetricValue('shares'),
        totalInteractions: getMetricValue('total_interactions'),
        avgWatchTime: getMetricValue('ig_reels_avg_watch_time'),
        totalWatchTime: getMetricValue('ig_reels_video_view_total_time'),
        profileVisits: getMetricValue('profile_visits'),
        follows: getMetricValue('follows'),
        engagementRate: 0,
        viewsFromFollowers: Math.round(rawViews * 0.08),
        viewsFromNonFollowers: Math.round(rawViews * 0.92),
        topSources: isReel
          ? [{ name:'Reels tab', percentage:68.7 },{ name:'Explore', percentage:15.6 },{ name:'Profile', percentage:2.3 },{ name:'Hashtags', percentage:1.2 }]
          : [{ name:'Home Feed', percentage:55.2 },{ name:'Profile', percentage:22.4 },{ name:'Explore', percentage:14.8 },{ name:'Hashtags', percentage:5.1 }],
        audienceGender: { male: 38.5, female: 60.5, other: 1.0 },
        retentionData: Array.from({ length: 10 }, (_, i) => ({ time: i*10, retention: Math.max(15, 100-(i*9)-Math.random()*3) })),
        skipRate: 70 + Math.random() * 10,
        typicalSkipRate: 80 + Math.random() * 5,
        accountsReached: getMetricValue('reach') || Math.floor(rawViews * 0.85)
      };
      if (insightsData.reach > 0) {
        const eng = insightsData.totalInteractions || (insightsData.likes + insightsData.comments + insightsData.saved + insightsData.shares);
        insightsData.engagementRate = (eng / insightsData.reach) * 100;
      }
      setInsights(insightsData);
    } catch (err) {
      setError(err.message);
      setInsights({ likes: post.like_count||0, comments: post.comments_count||0, views: post.video_views||0, reach:null, saved:null, shares:null, error:err.message });
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
    if (num >= 1000) return `${(num/1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // DOWNLOAD REPORT FUNCTION
  // ─────────────────────────────────────────────────────────────────────────
  const downloadReport = () => {
    if (!insights) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const PAGE_W  = 210;
    const PAGE_H  = 297;
    const MARGIN  = 16;
    const CW      = PAGE_W - MARGIN * 2;
    let y = 0;

    // ── Palette ────────────────────────────────────────────────
    const C = {
      primary:   [168,  85, 247],   // purple-500
      pink:      [236,  72, 153],   // pink-500
      teal:      [ 20, 184, 166],   // teal-500
      amber:     [245, 158,  11],   // amber-500
      blue:      [ 59, 130, 246],   // blue-500
      dark:      [ 17,  24,  39],   // gray-900
      mid:       [ 75,  85,  99],   // gray-600
      light:     [243, 244, 246],   // gray-100
      muted:     [107, 114, 128],   // gray-500
      white:     [255, 255, 255],
      border:    [229, 231, 235],
      bg:        [248, 250, 252],   // slate-50
      darkBg:    [ 18,  18,  18],   // #121212
      cardBg:    [ 30,  30,  46],   // dark card
    };

    const sf   = (a) => doc.setFillColor(...a);
    const ss   = (a) => doc.setDrawColor(...a);
    const sc   = (a) => doc.setTextColor(...a);
    const font = (s = 'normal', sz = 10) => { doc.setFont('helvetica', s); doc.setFontSize(sz); };

    const drawBg = () => {
      sf(C.darkBg); doc.rect(0, 0, PAGE_W, PAGE_H, 'F');
      // subtle grid dots
      ss([40,40,55]); doc.setLineWidth(0.1);
      for (let gx = 10; gx < PAGE_W; gx += 10) doc.line(gx, 0, gx, PAGE_H);
    };

    const newPage = (need = 20) => {
      if (y + need > PAGE_H - 20) { doc.addPage(); y = MARGIN; drawBg(); }
    };

    const hLine = (yy, color = [50,50,65]) => {
      ss(color); doc.setLineWidth(0.25); doc.line(MARGIN, yy, PAGE_W - MARGIN, yy);
    };

    const sectionTitle = (title, icon = '') => {
      newPage(18);
      // Left accent bar
      sf(C.primary); doc.roundedRect(MARGIN, y, 3, 10, 1, 1, 'F');
      font('bold', 11); sc(C.white);
      doc.text(`${icon}  ${title}`, MARGIN + 7, y + 7.5);
      y += 14;
    };

    const statCard = (x, cardY, w, h, label, value, color) => {
      // Card bg
      sf([28, 28, 44]); ss([50, 50, 70]);
      doc.setLineWidth(0.3);
      doc.roundedRect(x, cardY, w, h, 3, 3, 'FD');
      // Top color accent
      sf(color); doc.roundedRect(x, cardY, w, 3, 1.5, 1.5, 'F');
      // Value
      font('bold', 15); sc(color);
      doc.text(String(value), x + w/2, cardY + h/2 + 2, { align: 'center' });
      // Label
      font('normal', 7); sc(C.muted);
      doc.text(label, x + w/2, cardY + h - 5, { align: 'center' });
    };

    const metricRow = (label, value, idx) => {
      newPage(10);
      const rH = 9;
      sf(idx % 2 === 0 ? [25,25,40] : [22,22,36]);
      ss([45,45,60]); doc.setLineWidth(0.15);
      doc.roundedRect(MARGIN, y, CW, rH, 1.5, 1.5, 'FD');
      font('normal', 8); sc(C.muted);
      doc.text(label, MARGIN + 4, y + 6.2);
      font('bold', 8); sc(C.white);
      doc.text(String(value), PAGE_W - MARGIN - 4, y + 6.2, { align: 'right' });
      y += rH + 1;
    };

    const miniBarRow = (label, pct, color, idx) => {
      newPage(10);
      const rH = 9, barAreaW = 55, barH = 3.5;
      sf(idx % 2 === 0 ? [25,25,40] : [22,22,36]);
      ss([45,45,60]); doc.setLineWidth(0.15);
      doc.roundedRect(MARGIN, y, CW, rH, 1.5, 1.5, 'FD');
      font('normal', 7.5); sc(C.muted);
      doc.text(label, MARGIN + 4, y + 6);
      // bar track
      const barX = PAGE_W - MARGIN - 4 - barAreaW - 14;
      sf([45,45,60]); doc.roundedRect(barX, y + 2.8, barAreaW, barH, 1.5, 1.5, 'F');
      if (pct > 0) { sf(color); doc.roundedRect(barX, y + 2.8, barAreaW * (pct/100), barH, 1.5, 1.5, 'F'); }
      font('bold', 7.5); sc(color);
      doc.text(`${pct.toFixed(1)}%`, PAGE_W - MARGIN - 4, y + 6, { align: 'right' });
      y += rH + 1;
    };

    // ── Page 1 – Hero ─────────────────────────────────────────
    drawBg();

    // Gradient hero band (simulate with two rects)
    sf([88, 28, 135]); doc.rect(0, 0, PAGE_W, 58, 'F');
    sf([49, 10, 101]); doc.rect(0, 38, PAGE_W, 20, 'F');

    // Decorative glow circle top-right
    sf([120, 40, 200]); doc.circle(PAGE_W + 5, -5, 40, 'F');
    sf([168, 85, 247]); doc.circle(PAGE_W - 10, 20, 18, 'F');

    // Instagram-style gradient pill top-left
    sf([236, 72, 153]); doc.roundedRect(MARGIN, 10, 44, 7, 3.5, 3.5, 'F');
    font('bold', 7); sc(C.white);
    doc.text('INSTAGRAM INSIGHTS', MARGIN + 4, 15.2);

    // Title
    font('bold', 24); sc(C.white);
    doc.text(isReel ? 'Reel Insights Report' : isVideo ? 'Video Insights Report' : 'Post Insights Report', MARGIN, 36);

    // Account + date
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    font('normal', 8.5); sc([196, 181, 253]);
    doc.text(`@${accountProfile?.username || 'business_account'}   ·   ${dateStr}`, MARGIN, 48);

    y = 68;

    // ── Stat cards row ─────────────────────────────────────────
    const cards = [
      { label: 'Views',        value: formatNumber(insights.views),        color: C.primary },
      { label: 'Reach',        value: formatNumber(insights.reach),        color: C.pink    },
      { label: 'Interactions', value: formatNumber(insights.totalInteractions || (insights.likes + insights.comments + (insights.saved||0) + (insights.shares||0))), color: C.amber },
      { label: 'Likes',        value: formatNumber(insights.likes),        color: C.pink    },
      { label: 'Comments',     value: formatNumber(insights.comments),     color: C.blue    },
      { label: 'Saved',        value: formatNumber(insights.saved || 0),   color: C.teal    },
    ];
    const cW6 = (CW - 5*2) / 6;
    const cH  = 28;
    cards.forEach((c, i) => statCard(MARGIN + i*(cW6+2), y, cW6, cH, c.label, c.value, c.color));
    y += cH + 12;

    // Engagement rate banner
    sf([30, 20, 50]); ss(C.primary); doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CW, 14, 3, 3, 'FD');
    font('bold', 9); sc(C.primary);
    doc.text('Engagement Rate', MARGIN + 6, y + 9.5);
    const engPct = insights.engagementRate?.toFixed(2) || '0.00';
    font('bold', 13); sc(C.white);
    doc.text(`${engPct}%`, PAGE_W - MARGIN - 6, y + 10, { align: 'right' });
    // mini bar
    const erBarX = MARGIN + 60, erBarW = CW - 80;
    sf([50,40,70]); doc.roundedRect(erBarX, y + 4.5, erBarW, 4, 2, 2, 'F');
    const erFill = Math.min(parseFloat(engPct)/20, 1) * erBarW;
    if (erFill > 0) { sf(C.primary); doc.roundedRect(erBarX, y + 4.5, erFill, 4, 2, 2, 'F'); }
    y += 20;

    // Post caption snippet
    if (post?.caption) {
      newPage(20);
      sf([25,20,40]); ss([50,45,70]); doc.setLineWidth(0.2);
      doc.roundedRect(MARGIN, y, CW, 18, 3, 3, 'FD');
      sf(C.pink); doc.roundedRect(MARGIN, y, 3, 18, 1.5, 1.5, 'F');
      font('bold', 7.5); sc(C.pink);
      doc.text('CAPTION', MARGIN + 6, y + 6);
      font('normal', 8); sc([200, 180, 230]);
      const captionLines = doc.splitTextToSize(post.caption.substring(0, 200), CW - 14);
      doc.text(captionLines.slice(0, 2), MARGIN + 6, y + 13);
      y += 22;
    }

    // ── Section: Views Breakdown ───────────────────────────────
    if (isReel || isVideo) {
      sectionTitle('Views Breakdown', '');
      const vbRows = [
        { label: 'Total Views',        value: formatNumber(insights.views),                                      color: C.primary },
        { label: 'Accounts Reached',   value: formatNumber(insights.accountsReached),                            color: C.pink    },
        { label: 'From Followers',     value: `${((insights.viewsFromFollowers / (insights.views||1))*100).toFixed(1)}%`, color: C.primary },
        { label: 'From Non-Followers', value: `${((insights.viewsFromNonFollowers / (insights.views||1))*100).toFixed(1)}%`, color: C.muted   },
      ];
      vbRows.forEach((r, i) => metricRow(r.label, r.value, i));
      y += 6;

      // Top sources
      newPage(50);
      font('bold', 9); sc([180, 160, 220]);
      doc.text('Top Sources of Views', MARGIN, y); y += 6;
      insights.topSources?.forEach((s, i) => miniBarRow(s.name, s.percentage, i === 0 ? C.primary : i === 1 ? C.pink : C.muted, i));
      y += 8;

      // Watch time
      sectionTitle('Watch Time', '');
      const wtRows = [
        { label: 'Total Watch Time',   value: formatWatchTime(insights.totalWatchTime) },
        { label: 'Average Watch Time', value: formatWatchTime(insights.avgWatchTime)   },
        { label: 'Skip Rate (this)',    value: `${insights.skipRate?.toFixed(0) || 75}%` },
        { label: 'Skip Rate (typical)',value: `${insights.typicalSkipRate?.toFixed(0) || 82}%` },
      ];
      wtRows.forEach((r, i) => metricRow(r.label, r.value, i));
      y += 8;
    }

    // ── Section: Interactions ──────────────────────────────────
    sectionTitle('Interactions', '');
    const totalInteract = insights.totalInteractions || (insights.likes + insights.comments + (insights.saved||0) + (insights.shares||0));
    const interactRows = [
      { label: 'Total Interactions', value: formatNumber(totalInteract),               color: C.amber   },
      { label: 'Likes',              value: formatNumber(insights.likes),              color: C.pink    },
      { label: 'Comments',           value: formatNumber(insights.comments),           color: C.blue    },
      { label: 'Saved',              value: formatNumber(insights.saved || 0),         color: C.teal    },
      { label: 'Shares',             value: formatNumber(insights.shares || 0),        color: C.primary },
    ];
    interactRows.forEach((r, i) => metricRow(r.label, r.value, i));
    y += 8;

    // Visual interaction bars
    newPage(40);
    font('bold', 9); sc([180, 160, 220]);
    doc.text('Interaction Breakdown', MARGIN, y); y += 6;
    if (totalInteract > 0) {
      const iBreaks = [
        { label: 'Likes',    v: insights.likes,        color: C.pink    },
        { label: 'Comments', v: insights.comments,     color: C.blue    },
        { label: 'Saved',    v: insights.saved || 0,   color: C.teal    },
        { label: 'Shares',   v: insights.shares || 0,  color: C.primary },
      ];
      iBreaks.forEach((b, i) => miniBarRow(b.label, totalInteract > 0 ? (b.v/totalInteract)*100 : 0, b.color, i));
    }
    y += 8;

    // ── Section: Profile Activity ──────────────────────────────
    sectionTitle('Profile Activity', '');
    metricRow('Profile Visits', formatNumber(insights.profileVisits || 0), 0);
    metricRow('New Follows',    formatNumber(insights.follows || 0),       1);
    if (profileActivityBreakdown?.actions?.length > 0) {
      y += 4;
      font('bold', 8); sc([180,160,220]);
      doc.text('Action Breakdown', MARGIN, y); y += 6;
      profileActivityBreakdown.actions.forEach((a, i) => miniBarRow(a.label, a.pct, C.primary, i));
    }
    y += 8;

    // ── Section: Audience Demographics ────────────────────────
    sectionTitle('Audience Demographics', '');

    // Gender
    newPage(32);
    font('bold', 8.5); sc([180,160,220]);
    doc.text('Gender', MARGIN, y); y += 6;
    [
      { label: 'Women', pct: insights.audienceGender?.female || 60.5, color: C.pink    },
      { label: 'Men',   pct: insights.audienceGender?.male   || 38.5, color: C.blue    },
      { label: 'Other', pct: insights.audienceGender?.other  ||  1.0, color: C.muted   },
    ].forEach((g, i) => miniBarRow(g.label, g.pct, g.color, i));
    y += 6;

    // Age
    newPage(40);
    font('bold', 8.5); sc([180,160,220]);
    doc.text('Age Groups', MARGIN, y); y += 6;
    [
      { label: '18–24', pct: 35.2, color: C.primary },
      { label: '25–34', pct: 42.8, color: C.pink    },
      { label: '35–44', pct: 15.3, color: C.amber   },
      { label: '45+',   pct:  6.7, color: C.teal    },
    ].forEach((a, i) => miniBarRow(a.label, a.pct, a.color, i));
    y += 6;

    // Country
    newPage(36);
    font('bold', 8.5); sc([180,160,220]);
    doc.text('Top Countries', MARGIN, y); y += 6;
    [
      { label: 'India',          pct: 45.2, color: C.primary },
      { label: 'United States',  pct: 18.3, color: C.blue    },
      { label: 'United Kingdom', pct:  8.7, color: C.teal    },
    ].forEach((c, i) => miniBarRow(c.label, c.pct, c.color, i));
    y += 8;

    // ── Section: Comments Summary ──────────────────────────────
    sectionTitle('Comments Summary', '');
    metricRow('Total Comments', formatNumber(insights.comments), 0);
    metricRow('Loaded Comments', String(comments.length), 1);
    if (comments.length > 0) {
      metricRow('Hidden Comments', String(comments.filter(c => c.hidden).length), 2);
      y += 6;

      // Top 5 comments preview
      font('bold', 8.5); sc([180,160,220]);
      doc.text('Recent Comments', MARGIN, y); y += 6;
      const previewComments = comments.filter(c => !c.hidden).slice(0, 5);
      previewComments.forEach((c, i) => {
        newPage(16);
        const rH = 14;
        sf([25,20,40]); ss([50,45,65]); doc.setLineWidth(0.15);
        doc.roundedRect(MARGIN, y, CW, rH, 2, 2, 'FD');
        // Avatar circle
        sf(i%2===0 ? C.primary : C.pink);
        doc.circle(MARGIN + 7, y + rH/2, 4, 'F');
        font('bold', 7); sc(C.white);
        doc.text((c.from?.username || c.username || 'U').charAt(0).toUpperCase(), MARGIN + 7, y + rH/2 + 2.5, { align: 'center' });
        // Username
        font('bold', 8); sc(C.white);
        doc.text(`@${(c.from?.username || c.username || 'unknown').substring(0,20)}`, MARGIN + 14, y + 6);
        // Comment text
        const txt = (c.text || '').substring(0, 70);
        font('normal', 7.5); sc([180,170,210]);
        doc.text(txt, MARGIN + 14, y + 12);
        // Like count
        if (c.like_count > 0) {
          font('normal', 7); sc(C.pink);
          doc.text(`♥ ${c.like_count}`, PAGE_W - MARGIN - 4, y + 6, { align: 'right' });
        }
        y += rH + 2;
      });
    }
    y += 8;

    // ── Post Info banner ──────────────────────────────────────
    newPage(30);
    sf([30,20,50]); ss([80,60,120]); doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CW, 22, 3, 3, 'FD');
    font('bold', 9); sc(C.primary);
    doc.text('Post Information', MARGIN + 5, y + 8);
    const pDate = post?.timestamp ? new Date(post.timestamp).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' }) : 'N/A';
    const pType = isReel ? 'Reel' : isVideo ? 'Video' : isCarousel ? 'Carousel' : 'Image';
    font('normal', 8); sc([180,160,220]);
    doc.text(`Type: ${pType}   ·   Posted: ${pDate}   ·   Post ID: ${post?.id || 'N/A'}`, MARGIN + 5, y + 16);
    y += 28;

    // ── Footer on every page ──────────────────────────────────
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      // footer bar
      sf([20,15,35]); doc.rect(0, PAGE_H-14, PAGE_W, 14, 'F');
      font('normal', 7); sc(C.muted);
      doc.text('Instagram Post Insights  ·  Confidential', MARGIN, PAGE_H-5);
      sc(C.primary);
      doc.text(`Page ${p} of ${totalPages}`, PAGE_W-MARGIN, PAGE_H-5, { align: 'right' });
    }

    const slug = (accountProfile?.username || 'instagram').replace(/[^a-z0-9]/gi, '_');
    doc.save(`instagram-insights-${slug}-${now.toISOString().slice(0,10)}.pdf`);
  };
  // ─────────────────────────────────────────────────────────────────────────

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#121212] w-full sm:max-w-md sm:max-h-[90vh] h-full sm:h-auto sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h2 className="text-white font-semibold">
            {isReel ? 'Reel insights' : isVideo ? 'Video insights' : 'Post insights'}
          </h2>

          {/* Download Report Button */}
          <button
            onClick={downloadReport}
            disabled={!insights || loading}
            title="Download PDF Report"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
              ${insights && !loading
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-900/40 active:scale-95'
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
                      {new Date(post.timestamp).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' })} · {accountProfile?.username || 'Business Account'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Overview Section */}
              <div className="px-4 py-4">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Overview <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                </h3>
                <p className="text-xs text-gray-500 mb-4">These are the metrics for this {isReel ? 'reel' : 'post'}.</p>
                <div className="space-y-3">
                  <MetricRow icon={<Eye className="w-4 h-4"/>} label="Views" value={formatNumber(insights?.views)} />
                  <MetricRow icon={<Clock className="w-4 h-4"/>} label="Watch time" value={formatWatchTime(insights?.totalWatchTime)} />
                  <MetricRow icon={<Heart className="w-4 h-4"/>} label="Interactions" value={formatNumber(insights?.totalInteractions || (insights?.likes + insights?.comments + (insights?.saved||0) + (insights?.shares||0)))} />
                  <MetricRow icon={<UserPlus className="w-4 h-4"/>} label="Profile activity" value={formatNumber(insights?.follows || 0)} />
                </div>
              </div>

              {/* Views Section */}
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
                      <span className="text-sm text-white">{insights?.views > 0 ? `${((insights.viewsFromFollowers/insights.views)*100).toFixed(1)}%` : 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-600"/><span className="text-sm text-gray-300">Non-followers</span></div>
                      <span className="text-sm text-white">{insights?.views > 0 ? `${((insights.viewsFromNonFollowers/insights.views)*100).toFixed(1)}%` : 'N/A'}</span>
                    </div>
                  </div>
                  <div className="mb-6">
                    <h4 className="text-sm text-gray-400 mb-3">Top sources of views</h4>
                    {insights?.topSources?.map((source, index) => (
                      <ProgressBar key={index} label={source.name} percentage={source.percentage} color={index===0?'bg-purple-500':index===1?'bg-purple-400':'bg-gray-500'} />
                    ))}
                  </div>
                  <MetricRow icon={<Users className="w-4 h-4"/>} label="Accounts reached" value={formatNumber(insights?.accountsReached)} />
                </div>
              )}

              {/* Retention Section */}
              {(isReel || isVideo) && (
                <div className="px-4 py-4 border-t border-gray-800">
                  <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                    Retention <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">How much of your {isReel ? 'reel' : 'video'} people watched.</p>
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
                <p className="text-xs text-gray-500 mb-4">Actions people took after viewing this {isReel ? 'reel' : 'post'}.</p>
                <MetricRow icon={<UserPlus className="w-4 h-4"/>} label="Follows" value={formatNumber(insights?.follows||0)} />
                <MetricRow icon={<Eye className="w-4 h-4"/>} label="Profile visits" value={formatNumber(insights?.profileVisits||0)} />
                {!isReel && profileActivityBreakdown && profileActivityBreakdown.actions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs text-gray-500 mb-3 uppercase tracking-wide">Profile actions breakdown</h4>
                    <div className="space-y-1">
                      {profileActivityBreakdown.actions.map((action, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5">
                          <span className="text-sm text-gray-300">{action.label}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full bg-purple-500 rounded-full" style={{ width:`${Math.min(action.pct,100)}%` }} />
                            </div>
                            <span className="text-xs text-white w-8 text-right">{action.value}</span>
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

              {/* Audience Section */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Audience <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                </h3>
                <p className="text-xs text-gray-500 mb-4">People who viewed this {isReel ? 'reel' : 'post'}.</p>
                <div className="flex gap-2 mb-4">
                  {['Gender','Country','Age'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${activeTab===tab.toLowerCase()?'bg-white text-black':'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                {activeTab === 'gender' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">Men</span><span className="text-sm text-white">{insights?.audienceGender?.male?.toFixed(1)||38.5}%</span></div>
                    <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">Women</span><span className="text-sm text-white">{insights?.audienceGender?.female?.toFixed(1)||60.5}%</span></div>
                  </div>
                )}
                {activeTab === 'country' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">🇮🇳 India</span><span className="text-sm text-white">45.2%</span></div>
                    <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">🇺🇸 United States</span><span className="text-sm text-white">18.3%</span></div>
                    <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">🇬🇧 United Kingdom</span><span className="text-sm text-white">8.7%</span></div>
                  </div>
                )}
                {activeTab === 'age' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">18-24</span><span className="text-sm text-white">35.2%</span></div>
                    <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">25-34</span><span className="text-sm text-white">42.8%</span></div>
                    <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">35-44</span><span className="text-sm text-white">15.3%</span></div>
                    <div className="flex items-center justify-between py-2"><span className="text-sm text-gray-300">45+</span><span className="text-sm text-white">6.7%</span></div>
                  </div>
                )}
              </div>

              {/* Interactions Section */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  Interactions <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                </h3>
                <p className="text-xs text-gray-500 mb-6">Activity on this {isReel ? 'reel' : 'post'}.</p>
                <div className="flex justify-center mb-6">
                  <div className="relative w-40 h-40">
                    <svg width="160" height="160" className="transform -rotate-90">
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#374151" strokeWidth="8"/>
                      <circle cx="80" cy="80" r="70" fill="none" stroke="#EC4899" strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={`${2*Math.PI*70}`} strokeDashoffset={`${2*Math.PI*70*0.08}`}/>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs text-gray-400">Total interactions</span>
                      <span className="text-2xl font-bold text-white">
                        {formatNumber(insights?.totalInteractions || (insights?.likes + insights?.comments + (insights?.saved||0) + (insights?.shares||0)))}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-pink-500"/><span className="text-sm text-gray-300">Followers</span></div><span className="text-sm text-white">0.6%</span></div>
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-gray-600"/><span className="text-sm text-gray-300">Non-followers</span></div><span className="text-sm text-white">100.0%</span></div>
                </div>
              </div>

              {/* Engagement timeline */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h4 className="text-sm text-white font-medium mb-4">When people liked your {isReel ? 'reel' : 'post'}</h4>
                <EngagementTimeline metric="likes" />
              </div>

              {/* Detailed Metrics */}
              <div className="px-4 py-4 border-t border-gray-800">
                <div className="space-y-0">
                  <MetricRow icon={<Heart className="w-4 h-4"/>} label="Likes" value={formatNumber(insights?.likes)} />
                  <MetricRow icon={<Repeat className="w-4 h-4"/>} label="Reposts" value="0" />
                  <MetricRow icon={<Send className="w-4 h-4"/>} label="Sends" value={formatNumber(insights?.shares||0)} />
                  <MetricRow icon={<Share2 className="w-4 h-4"/>} label="Shares" value={formatNumber(insights?.shares||0)} />
                  <MetricRow icon={<MessageCircle className="w-4 h-4"/>} label="Comments" value={formatNumber(insights?.comments)} />
                  <MetricRow icon={<Bookmark className="w-4 h-4"/>} label="Saved" value={formatNumber(insights?.saved||0)} />
                </div>
              </div>

              {/* Engagement Trend Charts */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pink-500" />
                  Engagement Trends
                  <button className="p-0.5 hover:bg-gray-800 rounded-full"><Info className="w-4 h-4 text-gray-500" /></button>
                </h3>
                <p className="text-xs text-gray-500 mb-4">Growth over time since posting.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-3 pt-3 pb-1">
                      <span className="text-xs font-medium text-gray-300">❤️ Likes</span>
                      <span className="text-xs font-bold text-pink-500">{formatNumber(insights?.likes)}</span>
                    </div>
                    <div className="flex-1" style={{ height:130, overflow:'hidden' }}>
                      <TrendChart data={generatePostTrendData(insights?.likes||0,'likes')} title="" color="#EC4899" metric="value" />
                    </div>
                  </div>
                  <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between px-3 pt-3 pb-1">
                      <span className="text-xs font-medium text-gray-300">💬 Comments</span>
                      <span className="text-xs font-bold text-purple-500">{formatNumber(insights?.comments)}</span>
                    </div>
                    <div className="flex-1" style={{ height:130, overflow:'hidden' }}>
                      <TrendChart data={generatePostTrendData(insights?.comments||0,'comments')} title="" color="#8B5CF6" metric="value" />
                    </div>
                  </div>
                  {insights?.saved > 0 && (
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-3 pt-3 pb-1">
                        <span className="text-xs font-medium text-gray-300">🔖 Saved</span>
                        <span className="text-xs font-bold text-amber-500">{formatNumber(insights?.saved)}</span>
                      </div>
                      <div className="flex-1" style={{ height:130, overflow:'hidden' }}>
                        <TrendChart data={generatePostTrendData(insights?.saved||0,'saved')} title="" color="#F59E0B" metric="value" />
                      </div>
                    </div>
                  )}
                  {insights?.shares > 0 && (
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden flex flex-col">
                      <div className="flex items-center justify-between px-3 pt-3 pb-1">
                        <span className="text-xs font-medium text-gray-300">🔗 Shares</span>
                        <span className="text-xs font-bold text-teal-500">{formatNumber(insights?.shares)}</span>
                      </div>
                      <div className="flex-1" style={{ height:130, overflow:'hidden' }}>
                        <TrendChart data={generatePostTrendData(insights?.shares||0,'shares')} title="" color="#14B8A6" metric="value" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Comments Section */}
              <div className="px-4 py-4 border-t border-gray-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-purple-500" />
                    Comments ({insights?.comments || post?.comments_count || 0})
                  </h3>
                  <div className="flex items-center gap-2">
                    {loadingComments && <Loader2 className="w-3 h-3 animate-spin text-purple-400" />}
                    <button onClick={fetchComments} disabled={loadingComments} className="text-[10px] bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700 disabled:opacity-50">
                      🔄 Load All
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {loadingComments && comments.length === 0 ? (
                    <div className="text-center py-4"><Loader2 className="h-5 w-5 animate-spin mx-auto text-purple-500"/><p className="text-xs text-gray-500 mt-2">Loading comments...</p></div>
                  ) : commentsError ? (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-center">
                      <AlertCircle className="h-6 w-6 mx-auto mb-1 text-red-400"/>
                      <p className="text-xs font-semibold text-red-300 mb-1">Failed to load comments</p>
                      <p className="text-[10px] text-red-400">{commentsError}</p>
                      <button onClick={fetchComments} className="mt-2 bg-red-600 text-white px-3 py-1 rounded text-[10px] hover:bg-red-700">Retry</button>
                    </div>
                  ) : comments.length > 0 ? (
                    comments.map((comment) => (
                      <div key={comment.id} className={`rounded-lg p-2.5 border ${comment.hidden?'bg-gray-800/30 border-gray-700 opacity-60':'bg-gray-800/50 border-gray-700'}`}>
                        {comment.hidden && <div className="mb-1 flex items-center gap-1 text-[9px] text-gray-500"><EyeOff className="h-2.5 w-2.5"/><span>Hidden comment</span></div>}
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 bg-gradient-to-br from-pink-400 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[10px] font-bold">{(comment.from?.username||comment.username||'U').charAt(0).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-0.5">
                              <span className="text-xs font-semibold text-white truncate">@{comment.from?.username||comment.username||'Unknown'}</span>
                              <span className="text-[9px] text-gray-500 flex-shrink-0">{comment.timestamp ? new Date(comment.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''}</span>
                            </div>
                            <p className="text-[11px] text-gray-300 break-words">{comment.text||''}</p>
                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                              {comment.like_count > 0 && <div className="flex items-center gap-1"><Heart className="h-2.5 w-2.5 text-pink-500" fill="currentColor"/><span className="text-[9px] text-gray-500">{comment.like_count}</span></div>}
                              <button onClick={() => { setReplyingToComment(comment.id); setReplyText(''); }} className="text-[10px] text-purple-400 hover:text-purple-300 font-medium">💬 Reply</button>
                              <button onClick={() => toggleCommentVisibility(comment.id, !comment.hidden)} disabled={processingComment} className="text-[10px] text-yellow-400 hover:text-yellow-300 font-medium disabled:opacity-50">{comment.hidden?'👁️ Show':'🙈 Hide'}</button>
                              <button onClick={() => deleteComment(comment.id)} disabled={processingComment} className="text-[10px] text-red-400 hover:text-red-300 font-medium disabled:opacity-50">🗑️ Delete</button>
                              {comment.replies?.data?.length > 0 && <span className="text-[9px] text-gray-500">{comment.replies.data.length} {comment.replies.data.length===1?'reply':'replies'}</span>}
                            </div>
                          </div>
                        </div>
                        {replyingToComment === comment.id && (
                          <div className="mt-2 pl-9">
                            <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-2">
                              <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Write a reply..." className="w-full text-xs bg-gray-900 border border-gray-700 text-white rounded p-2 resize-none focus:outline-none focus:border-purple-500" rows="2" disabled={sendingReply} />
                              <div className="flex items-center gap-2 mt-2">
                                <button onClick={() => postReply(comment.id)} disabled={sendingReply||!replyText.trim()} className="bg-purple-600 text-white px-3 py-1 rounded text-[10px] hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1">
                                  {sendingReply ? <><Loader2 className="h-3 w-3 animate-spin"/><span>Sending...</span></> : <><Send className="h-3 w-3"/><span>Reply</span></>}
                                </button>
                                <button onClick={() => { setReplyingToComment(null); setReplyText(''); }} disabled={sendingReply} className="bg-gray-700 text-gray-300 px-3 py-1 rounded text-[10px] hover:bg-gray-600 disabled:opacity-50">Cancel</button>
                              </div>
                            </div>
                          </div>
                        )}
                        {comment.replies?.data?.length > 0 && (
                          <div className="mt-2 pl-9 space-y-2">
                            {comment.replies.data.map((reply) => (
                              <div key={reply.id} className={`border rounded-lg p-2 ${reply.hidden?'bg-gray-800/20 border-gray-700 opacity-60':'bg-purple-900/20 border-purple-800/40'}`}>
                                {reply.hidden && <div className="mb-1 flex items-center gap-1 text-[8px] text-gray-500"><EyeOff className="h-2 w-2"/><span>Hidden</span></div>}
                                <div className="flex items-start gap-2">
                                  <div className="w-5 h-5 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-white text-[9px] font-bold">{(reply.from?.username||reply.username||'U').charAt(0).toUpperCase()}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                      <span className="text-[10px] font-semibold text-white truncate">@{reply.from?.username||reply.username||'Unknown'}</span>
                                      <span className="text-[8px] text-gray-500 flex-shrink-0">{reply.timestamp ? new Date(reply.timestamp).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : ''}</span>
                                    </div>
                                    <p className="text-[10px] text-gray-300 break-words">{reply.text||''}</p>
                                    {reply.like_count > 0 && <div className="mt-0.5 flex items-center gap-1"><Heart className="h-2 w-2 text-pink-500" fill="currentColor"/><span className="text-[8px] text-gray-500">{reply.like_count}</span></div>}
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
                {comments.length >= 50 && <p className="text-[10px] text-gray-600 text-center mt-2">Showing up to 100 comments</p>}
              </div>

              {/* Ad Section */}
              <div className="px-4 py-4 border-t border-gray-800">
                <h3 className="text-white font-semibold mb-2">Ad</h3>
                <button onClick={() => onBoostPost && onBoostPost(post)} className="flex items-center gap-2 w-full py-3 text-left hover:bg-gray-800 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center"><Rocket className="w-4 h-4 text-white"/></div>
                  <span className="text-sm text-white">Boost this {isReel ? 'Reel' : 'Post'}</span>
                  <ChevronRight className="w-4 h-4 text-gray-500 ml-auto"/>
                </button>
              </div>

              {error && (
                <div className="px-4 py-4">
                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3">
                    <p className="text-xs text-yellow-300">Some insights may be unavailable: {error}</p>
                  </div>
                </div>
              )}

              <div className="px-4 py-4 border-t border-gray-800">
                <p className="text-xs text-gray-600 text-center">
                  Note: Some metrics like audience demographics and retention are simulated. Instagram API provides limited per-post insights.
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