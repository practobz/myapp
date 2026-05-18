import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Download, RefreshCw, Filter, Calendar, CheckCircle, Clock,
  AlertCircle, Loader2, User, FileText, BarChart2, X,
  ChevronDown, ChevronRight, MessageSquare, GitBranch,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'dd MMM yyyy'); } catch { return '—'; }
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try { return format(parseISO(iso), 'dd MMM yyyy, h:mm a'); } catch { return '—'; }
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = (status || '').toLowerCase();
  const map = {
    approved:           'bg-green-50 text-green-700 border-green-200',
    submitted:          'bg-amber-50 text-amber-700 border-amber-200',
    rejected:           'bg-red-50 text-red-700 border-red-200',
    revision_requested: 'bg-orange-50 text-orange-700 border-orange-200',
    published:          'bg-emerald-50 text-emerald-700 border-emerald-200',
    under_review:       'bg-purple-50 text-purple-700 border-purple-200',
  };
  const cls = map[s] || 'bg-gray-50 text-gray-600 border-gray-200';
  const label = s === 'submitted' ? 'In Review' : (status || '—').replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-semibold capitalize ${cls}`}>
      {label}
    </span>
  );
};

// ── Platform pill ─────────────────────────────────────────────────────────────
const PlatformPill = ({ platform }) => {
  const p = Array.isArray(platform) ? platform[0] : platform;
  const key = String(p || '').toLowerCase();
  const cfg = {
    instagram: { label: 'Instagram', cls: 'bg-pink-50 text-pink-600 border-pink-200' },
    facebook:  { label: 'Facebook',  cls: 'bg-blue-50 text-blue-600 border-blue-200' },
    linkedin:  { label: 'LinkedIn',  cls: 'bg-sky-50 text-sky-700 border-sky-200' },
    twitter:   { label: 'Twitter/X', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
    youtube:   { label: 'YouTube',   cls: 'bg-red-50 text-red-600 border-red-200' },
  }[key] || { label: String(p || '—'), cls: 'bg-gray-50 text-gray-500 border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 leading-tight">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ── Export helpers ────────────────────────────────────────────────────────────
function exportCSV(rows) {
  const headers = ['Content Item', 'Calendar', 'Customer', 'Platform', 'Uploaded By', 'Upload Date', 'Approval Date', 'Days to Approval', 'Status'];
  const csvRows = rows.map(r => [
    `"${(r.item_name || '').replace(/"/g, '""')}"`,
    `"${(r.calendar_name || '').replace(/"/g, '""')}"`,
    `"${(r.customer_name || '').replace(/"/g, '""')}"`,
    Array.isArray(r.platform) ? r.platform[0] : String(r.platform || ''),
    `"${(r.created_by || '').replace(/"/g, '""')}"`,
    r.uploaded_at ? format(parseISO(r.uploaded_at), 'yyyy-MM-dd') : '',
    r.approved_at ? format(parseISO(r.approved_at), 'yyyy-MM-dd') : '',
    r.days_to_approval !== null && r.days_to_approval !== undefined ? r.days_to_approval : '',
    r.status || '',
  ]);
  const csv = [headers.join(','), ...csvRows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `content-approval-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF colour palette ────────────────────────────────────────────────────────
const C = {
  dark:   [15,  23,  42],
  blue:   [59,  130, 246],
  indigo: [99,  102, 241],
  green:  [22,  163, 74],
  amber:  [217, 119, 6],
  slate:  [100, 116, 139],
  white:  [255, 255, 255],
  light:  [248, 250, 252],
  border: [226, 232, 240],
  bgblue: [239, 246, 255],
  bggreen:[236, 253, 245],
  bgamber:[255, 251, 235],
  bgindig:[238, 242, 255],
  red:    [220, 38,  38],
  bgred:  [254, 242, 242],
};

async function exportPDF(rows, summary, adminName) {
  // ── Pre-load all images as base64 via canvas ─────────────────────────────
  const imageCache = {};
  const allImageUrls = [];
  const allVideoUrls  = [];
  rows.forEach(row =>
    (row.versions || []).forEach(v =>
      (v.images || []).forEach(i => {
        if (!i.url) return;
        if (i.type === 'video') allVideoUrls.push(i.url);
        else allImageUrls.push(i.url);
      })
    )
  );

  const loadImgBase64 = (url) => new Promise((resolve) => {
    const proxyUrl = `${API_URL}/api/image-proxy?url=${encodeURIComponent(url)}`;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const tid = setTimeout(() => resolve(null), 10000);
    img.onload = () => {
      clearTimeout(tid);
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch { resolve(null); }
    };
    img.onerror = () => { clearTimeout(tid); resolve(null); };
    img.src = proxyUrl;
  });

  // Capture a thumbnail from the first frame of a video via <video> + canvas
  const loadVideoThumbnail = (url) => new Promise((resolve) => {
    const proxyUrl = `${API_URL}/api/image-proxy?url=${encodeURIComponent(url)}`;
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.muted = true;
    const tid = setTimeout(() => { video.src = ''; resolve(null); }, 12000);
    video.addEventListener('loadeddata', () => {
      video.currentTime = 0;
    }, { once: true });
    video.addEventListener('seeked', () => {
      clearTimeout(tid);
      try {
        const canvas = document.createElement('canvas');
        canvas.width  = video.videoWidth  || 320;
        canvas.height = video.videoHeight || 180;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch { resolve(null); }
    }, { once: true });
    video.addEventListener('error', () => { clearTimeout(tid); resolve(null); }, { once: true });
    video.src = proxyUrl;
  });

  await Promise.all([
    ...allImageUrls.map(async (url) => {
      const b64 = await loadImgBase64(url);
      if (b64) imageCache[url] = b64;
    }),
    ...allVideoUrls.map(async (url) => {
      const b64 = await loadVideoThumbnail(url);
      if (b64) imageCache[url] = b64;
    }),
  ]);

  // ── Setup ─────────────────────────────────────────────────────────────────
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW  = doc.internal.pageSize.getWidth();
  const PH  = doc.internal.pageSize.getHeight();
  const M   = 12;
  const CW  = PW - 2 * M;
  let y     = 0;

  const addPage = () => { doc.addPage(); y = M; };
  const checkY  = (need) => { if (y + need > PH - 14) addPage(); };
  const clip    = (s, max) => { const str = String(s || '—'); return str.length > max ? str.slice(0, max - 1) + '…' : str; };
  const fmtD    = (iso) => { if (!iso) return '—'; try { return format(parseISO(iso), 'dd MMM yyyy'); } catch { return '—'; } };
  const fmtDT   = (iso) => { if (!iso) return '—'; try { return format(parseISO(iso), 'dd MMM yyyy, h:mm a'); } catch { return '—'; } };

  // ── PAGE HEADER ───────────────────────────────────────────────────────────
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, 40, 'F');
  doc.setFillColor(...C.blue);
  doc.rect(0, 38, PW, 2, 'F');
  doc.setFillColor(...C.indigo);
  doc.rect(0, 0, 4, 40, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...C.white);
  doc.text('CONTENT APPROVAL TIMELINE REPORT', M + 4, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Versions · Images · Comments  •  ${rows.length} item${rows.length !== 1 ? 's' : ''}`, M + 4, 27);

  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, PW - M, 16, { align: 'right' });
  if (adminName) doc.text(`Admin: ${adminName}`, PW - M, 27, { align: 'right' });

  y = 48;

  // ── SUMMARY STATS (4 boxes) ───────────────────────────────────────────────
  const boxW = (CW - 9) / 4;
  [
    { label: 'Total Content',    value: String(summary.total),              color: C.indigo },
    { label: 'Approved',         value: String(summary.approved),           color: C.green  },
    { label: 'Pending Approval', value: String(summary.pending_approval),   color: C.amber  },
    { label: 'Avg Days',         value: summary.avg_days_to_approval !== null ? `${summary.avg_days_to_approval}d` : '—', color: C.blue },
  ].forEach((b, i) => {
    const bx = M + i * (boxW + 3);
    doc.setFillColor(...C.light);
    doc.roundedRect(bx, y, boxW, 18, 2, 2, 'F');
    doc.setFillColor(...b.color);
    doc.rect(bx, y, 3, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...b.color);
    doc.text(b.value, bx + 8, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...C.slate);
    doc.text(b.label, bx + 8, y + 17);
  });
  y += 26;

  // ── SUMMARY TABLE ─────────────────────────────────────────────────────────
  const COL = {
    item:     { x: M,        w: 42, label: 'CONTENT ITEM' },
    customer: { x: M + 43,   w: 28, label: 'CUSTOMER'     },
    by:       { x: M + 72,   w: 38, label: 'UPLOADED BY'  },
    uploaded: { x: M + 111,  w: 22, label: 'UPLOADED'     },
    approved: { x: M + 134,  w: 22, label: 'APPROVED'     },
    days:     { x: M + 157,  w: 11, label: 'DAYS'         },
    status:   { x: M + 169,  w: 21, label: 'STATUS'       },
  };

  checkY(10);
  doc.setFillColor(...C.dark);
  doc.roundedRect(M, y, CW, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...C.white);
  Object.values(COL).forEach(c => doc.text(c.label, c.x + 2, y + 7));
  y += 10;

  const ROW_H = 14;
  rows.forEach((row, idx) => {
    checkY(ROW_H + 2);
    doc.setFillColor(...(idx % 2 === 0 ? C.white : C.light));
    doc.rect(M, y, CW, ROW_H, 'F');

    if (row.approved_at) {
      doc.setFillColor(...C.green);
      doc.rect(M, y, 1.5, ROW_H, 'F');
    }

    const textY = y + 6;

    // Item name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...C.dark);
    doc.text(clip(row.item_name || row.calendar_name, 24), COL.item.x + 2, textY);
    if (row.calendar_name && row.calendar_name !== row.item_name) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...C.slate);
      doc.text(clip(row.calendar_name, 24), COL.item.x + 2, y + ROW_H - 2);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...C.dark);
    doc.text(clip(row.customer_name, 15), COL.customer.x + 2, textY);
    doc.text(clip(row.created_by, 22), COL.by.x + 2, textY);
    doc.text(fmtD(row.uploaded_at), COL.uploaded.x + 2, textY);
    if (row.uploaded_at) {
      try {
        doc.setFontSize(7); doc.setTextColor(...C.slate);
        doc.text(format(parseISO(row.uploaded_at), 'h:mm a'), COL.uploaded.x + 2, textY + 4);
        doc.setFontSize(8); doc.setTextColor(...C.dark);
      } catch { /* ignore */ }
    }

    if (row.approved_at) {
      doc.setTextColor(...C.green); doc.setFont('helvetica', 'bold');
      doc.text(fmtD(row.approved_at), COL.approved.x + 2, textY);
      try {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.slate);
        doc.text(format(parseISO(row.approved_at), 'h:mm a'), COL.approved.x + 2, textY + 4);
        doc.setFontSize(8); doc.setTextColor(...C.dark);
      } catch { /* ignore */ }
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.dark);
    } else {
      doc.setTextColor(...C.slate);
      doc.text('Pending', COL.approved.x + 2, textY);
      doc.setTextColor(...C.dark);
    }

    if (row.days_to_approval !== null && row.days_to_approval !== undefined) {
      const d = row.days_to_approval;
      const pillColor = d <= 1 ? C.green : d <= 3 ? C.amber : C.red;
      const pillBg    = d <= 1 ? C.bggreen : d <= 3 ? C.bgamber : C.bgred;
      doc.setFillColor(...pillBg);
      doc.roundedRect(COL.days.x + 1, y + 4, 9, 6, 1, 1, 'F');
      doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...pillColor);
      doc.text(`${d}d`, COL.days.x + 5.5, y + 8.5, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.dark); doc.setFontSize(8);
    }

    const sLabel = row.status === 'submitted' ? 'In Review' : String(row.status || '—').replace(/_/g, ' ');
    const sClr   = { approved: C.green, rejected: C.red, published: [5, 150, 105] }[row.status] || C.slate;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...sClr);
    doc.text(clip(sLabel, 12), COL.status.x + 2, textY);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...C.dark); doc.setFontSize(8);

    doc.setDrawColor(...C.border); doc.setLineWidth(0.1);
    doc.line(M, y + ROW_H, M + CW, y + ROW_H);
    y += ROW_H;
  });

  y += 12; // gap before detail section

  // ── SECTION DIVIDER: DETAILED VERSIONS & COMMENTS ────────────────────────
  checkY(14);
  doc.setFillColor(...C.dark);
  doc.roundedRect(M, y, CW, 12, 2, 2, 'F');
  doc.setFillColor(...C.indigo);
  doc.rect(M, y, 3, 12, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text('DETAILED VERSIONS & COMMENTS', M + 7, y + 8.5);
  y += 16;

  // ── CONTENT ITEM CARDS ────────────────────────────────────────────────────
  rows.forEach((row) => {
    const versions = row.versions || [];

    checkY(22);

    // Item card header (dark bar)
    doc.setFillColor(...C.dark);
    doc.roundedRect(M, y, CW, 15, 2, 2, 'F');
    doc.setFillColor(...C.indigo);
    doc.rect(M, y, 3, 15, 'F');

    // Item name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...C.white);
    doc.text(clip(row.item_name || '—', 45), M + 6, y + 6.5);

    // Calendar name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(clip(row.calendar_name || '', 35), M + 6, y + 12.5);

    // Status (top-right)
    const sLabel = row.status === 'submitted' ? 'In Review' : String(row.status || '—').replace(/_/g, ' ');
    const sColor = { approved: C.green, rejected: C.red, published: [5, 150, 105] }[row.status] || C.slate;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...sColor);
    doc.text(sLabel.toUpperCase(), PW - M - 3, y + 6.5, { align: 'right' });

    // Meta: customer | upload | approved | days (bottom-right)
    const metaParts = [
      clip(row.customer_name, 22),
      `Uploaded: ${fmtD(row.uploaded_at)}`,
      `Approved: ${row.approved_at ? fmtD(row.approved_at) : 'Pending'}`,
      ...(row.days_to_approval != null ? [`${row.days_to_approval}d`] : []),
    ];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(203, 213, 225);
    doc.text(metaParts.join('  |  '), PW - M - 3, y + 12.5, { align: 'right' });

    y += 17;

    // No versions fallback
    if (versions.length === 0) {
      checkY(8);
      doc.setFillColor(...C.light);
      doc.roundedRect(M + 3, y, CW - 3, 7, 1, 1, 'F');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(...C.slate);
      doc.text('No version data available.', M + 7, y + 5);
      y += 10;
    } else {
      versions.forEach((v) => {
        checkY(14);

        // ── Version header bar ──
        const vBg = [245, 247, 255];
        doc.setFillColor(...vBg);
        doc.roundedRect(M + 3, y, CW - 3, 11, 1, 1, 'F');
        doc.setFillColor(...C.indigo);
        doc.rect(M + 3, y, 2.5, 11, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...C.indigo);
        doc.text(`v${v.version_number}`, M + 8, y + 7.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(...C.dark);
        doc.text(`Uploaded by ${clip(v.created_by, 28)}  on  ${fmtDT(v.uploaded_at)}`, M + 16, y + 4.5);

        // Version status
        const vsLabel = v.status === 'submitted' ? 'In Review' : String(v.status || '—').replace(/_/g, ' ');
        const vsColor = { approved: C.green, rejected: C.red, submitted: C.amber }[v.status] || C.slate;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...vsColor);
        doc.text(vsLabel, PW - M - 4, y + 4.5, { align: 'right' });

        // Approval flags
        const flags = [];
        if (v.approved_by_admin) flags.push('Admin Approved');
        if (v.approved_by_customer && v.approved_at) flags.push(`Customer Approved: ${fmtD(v.approved_at)}`);
        if (flags.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(...C.green);
          doc.text(flags.join('  ·  '), PW - M - 4, y + 9.5, { align: 'right' });
        }
        y += 13;

        // ── Approval / rejection notes ──
        if (v.approval_notes) {
          checkY(7);
          doc.setFillColor(...C.bggreen);
          doc.roundedRect(M + 5, y, CW - 8, 6.5, 1, 1, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...C.green);
          doc.text(`✓  ${clip(v.approval_notes, 95)}`, M + 8, y + 4.5);
          y += 8;
        }
        if (v.rejection_reason) {
          checkY(7);
          doc.setFillColor(...C.bgred);
          doc.roundedRect(M + 5, y, CW - 8, 6.5, 1, 1, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(...C.red);
          doc.text(`✕  ${clip(v.rejection_reason, 95)}`, M + 8, y + 4.5);
          y += 8;
        }

        // ── Image thumbnails ──
        const media = v.images || [];
        if (media.length > 0) {
          const THUMB = 24;
          const GAP   = 3;
          const maxPerRow = Math.floor((CW - 10) / (THUMB + GAP));
          const thumbsToShow = media.slice(0, maxPerRow);
          checkY(THUMB + 6);
          let tx = M + 5;
          thumbsToShow.forEach((img) => {
            if (!imageCache[img.url]) {
              // Placeholder
              doc.setFillColor(...C.border);
              doc.roundedRect(tx, y, THUMB, THUMB, 1, 1, 'F');
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(6);
              doc.setTextColor(...C.slate);
              doc.text(img.type === 'video' ? 'VIDEO' : 'IMG', tx + THUMB / 2, y + THUMB / 2 + 2, { align: 'center' });
            } else {
              try {
                doc.addImage(imageCache[img.url], 'JPEG', tx, y, THUMB, THUMB);
                doc.setDrawColor(...C.border);
                doc.setLineWidth(0.2);
                doc.roundedRect(tx, y, THUMB, THUMB, 1, 1, 'S');
                // Play icon overlay for videos
                if (img.type === 'video') {
                  const cx = tx + THUMB / 2, cy = y + THUMB / 2, r = 4;
                  doc.setFillColor(0, 0, 0, 0.45);
                  doc.circle(cx, cy, r, 'F');
                  doc.setFillColor(255, 255, 255);
                  doc.triangle(cx - 1.2, cy - 2, cx - 1.2, cy + 2, cx + 2.2, cy, 'F');
                }
              } catch { /* skip broken image */ }
            }
            tx += THUMB + GAP;
          });
          if (media.length > maxPerRow) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.5);
            doc.setTextColor(...C.slate);
            doc.text(`+${media.length - maxPerRow} more`, tx, y + THUMB / 2 + 2);
          }
          y += THUMB + 5;
        }

        // ── Comments ──
        const comments = v.comments || [];
        if (comments.length > 0) {
          checkY(10);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7);
          doc.setTextColor(...C.slate);
          doc.text(`COMMENTS (${comments.length})`, M + 5, y + 5);
          y += 7;

          comments.forEach((c) => {
            const textBody = `${c.comment}${c.done ? '  ✓ Done' : ''}`;
            const wrappedLines = doc.splitTextToSize(textBody, CW - 30);
            const lineH = Math.max(wrappedLines.length * 4 + 6, 9);
            checkY(lineH + 2);

            doc.setFillColor(...(c.done ? C.light : C.bgamber));
            doc.roundedRect(M + 5, y, CW - 8, lineH, 1, 1, 'F');

            // Author label
            const authorColor = c.author === 'Admin' ? C.indigo : C.green;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.setTextColor(...authorColor);
            doc.text(`${c.author}:`, M + 8, y + 5);

            const authorW = doc.getTextWidth(`${c.author}: `);

            // Comment text
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...C.dark);
            wrappedLines.forEach((line, li) => {
              doc.text(line, M + 8 + authorW + 1, y + 5 + li * 4);
            });

            // Timestamp top-right
            if (c.timestamp) {
              doc.setFontSize(6);
              doc.setTextColor(...C.slate);
              try { doc.text(format(parseISO(c.timestamp), 'dd MMM, h:mm a'), PW - M - 5, y + 4, { align: 'right' }); } catch {}
            }

            y += lineH + 2;
          });
        } else {
          checkY(7);
          doc.setFillColor(...C.light);
          doc.roundedRect(M + 5, y, CW - 8, 6, 1, 1, 'F');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7);
          doc.setTextColor(...C.slate);
          doc.text('No comments on this version.', M + 8, y + 4.5);
          y += 8;
        }

        y += 3; // gap between versions
      });
    }

    y += 7; // gap between items
  });

  // ── FOOTER on each page ───────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...C.dark);
    doc.rect(0, PH - 10, PW, 10, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('Content Approval Timeline Report  •  Airspark', M, PH - 4);
    doc.text(`Page ${p} of ${totalPages}`, PW - M, PH - 4, { align: 'right' });
  }

  doc.save(`content-approval-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ContentApprovalReport() {
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'superadmin';

  const [allRows, setAllRows]             = useState([]);
  const [assignedCustomerIds, setAssignedCustomerIds] = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [expandedRows, setExpandedRows]   = useState(new Set());
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const toggleRow = (id) => setExpandedRows(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Filters (all client-side)
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [fromDate, setFromDate]                 = useState('');
  const [toDate, setToDate]                     = useState('');
  const [statusFilter, setStatusFilter]         = useState('all');

  // Load assigned customer IDs for this admin (superadmin sees all)
  useEffect(() => {
    if (isSuperAdmin) {
      setAssignedCustomerIds(null); // null = no restriction
      return;
    }
    if (!currentUser?._id) return;
    fetch(`${API_URL}/admin/assigned-customers?adminId=${currentUser._id}`)
      .then(r => r.json())
      .then(data => {
        const ids = Array.isArray(data) ? data.map(c => c._id) : [];
        setAssignedCustomerIds(ids);
      })
      .catch(() => setAssignedCustomerIds([]));
  }, [currentUser?._id, isSuperAdmin]);

  // Load ALL submissions once
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`${API_URL}/api/admin/content-approval-report`);
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const data = await resp.json();
      setAllRows(data.rows || []);
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Rows scoped to this admin's assigned customers
  const scopedRows = useMemo(() => {
    if (!assignedCustomerIds) return allRows; // superadmin: no restriction
    return allRows.filter(r => assignedCustomerIds.includes(r.customer_id));
  }, [allRows, assignedCustomerIds]);

  // Derive unique customers from scoped rows
  const customers = useMemo(() => {
    const map = new Map();
    scopedRows.forEach(r => {
      if (r.customer_id && !map.has(r.customer_id)) {
        map.set(r.customer_id, { id: r.customer_id, name: r.customer_name || r.customer_id });
      }
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [allRows]);

  // Apply all filters client-side
  const filteredRows = useMemo(() => {
    let rows = scopedRows;

    if (selectedCustomer) {
      rows = rows.filter(r => r.customer_id === selectedCustomer);
    }

    if (fromDate) {
      const from = new Date(fromDate);
      rows = rows.filter(r => r.uploaded_at && new Date(r.uploaded_at) >= from);
    }

    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter(r => r.uploaded_at && new Date(r.uploaded_at) <= to);
    }

    if (statusFilter === 'approved') {
      rows = rows.filter(r => r.approved_at);
    } else if (statusFilter === 'pending') {
      rows = rows.filter(r => !r.approved_at);
    }

    return rows;
  }, [allRows, selectedCustomer, fromDate, toDate, statusFilter]);

  // Summary from filtered rows
  const summary = useMemo(() => {
    const approved = filteredRows.filter(r => r.approved_at);
    const avgDays = approved.length > 0
      ? (approved.reduce((s, r) => s + (r.days_to_approval || 0), 0) / approved.length).toFixed(1)
      : null;
    return {
      total:            filteredRows.length,
      approved:         approved.length,
      pending_approval: filteredRows.length - approved.length,
      avg_days_to_approval: avgDays ? Number(avgDays) : null,
    };
  }, [filteredRows]);

  const clearFilters = () => {
    setSelectedCustomer('');
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
  };

  const hasFilters = selectedCustomer || fromDate || toDate || statusFilter !== 'all';

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gray-50">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-indigo-600" />
                Content Approval Timeline Report
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Track when content was uploaded and when it was approved by the customer
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchReport}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => exportCSV(filteredRows)}
                disabled={filteredRows.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={async () => {
                  setPdfGenerating(true);
                  try { await exportPDF(filteredRows, summary, currentUser?.name); }
                  finally { setPdfGenerating(false); }
                }}
                disabled={filteredRows.length === 0 || pdfGenerating}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {pdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {pdfGenerating ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

          {/* ── Filters ────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              {/* Customer */}
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <User className="w-3.5 h-3.5 inline mr-1" />Customer
                </label>
                <select
                  value={selectedCustomer}
                  onChange={e => setSelectedCustomer(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="">All Customers</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* From date */}
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />Upload From
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* To date */}
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Calendar className="w-3.5 h-3.5 inline mr-1" />Upload To
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* Approval status */}
              <div className="flex-1 min-w-0">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  <Filter className="w-3.5 h-3.5 inline mr-1" />Approval Status
                </label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                >
                  <option value="all">All</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending Approval</option>
                </select>
              </div>

              <div className="flex gap-2 sm:pb-0">
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Summary Stats ───────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={FileText}    label="Total Content"         value={summary.total}              color="bg-indigo-500" />
              <StatCard icon={CheckCircle} label="Approved by Customer"  value={summary.approved}           color="bg-green-500" />
              <StatCard icon={Clock}       label="Pending Approval"      value={summary.pending_approval}   color="bg-amber-500" />
              <StatCard
                icon={BarChart2}
                label="Avg Days to Approval"
                value={summary.avg_days_to_approval !== null ? `${summary.avg_days_to_approval}d` : '—'}
                sub="from upload to approval"
                color="bg-blue-500"
              />
          </div>

          {/* ── Error ──────────────────────────────────────────── */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* ── Table ──────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">
                {loading ? 'Loading…' : `${filteredRows.length} result${filteredRows.length !== 1 ? 's' : ''}`}
              </h2>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading report…</span>
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-gray-400">
                <FileText className="w-8 h-8" />
                <p className="text-sm">No content found for the selected filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-8"></th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Content Item</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded By</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Upload Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Approval Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Days</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.map((row) => {
                      const isExpanded = expandedRows.has(row.assignment_id || row.id);
                      return (
                        <React.Fragment key={row.id}>
                          <tr
                            className={`transition-colors ${isExpanded ? 'bg-indigo-50/40' : 'hover:bg-gray-50/60'} cursor-pointer`}
                            onClick={() => toggleRow(row.assignment_id || row.id)}
                          >
                            {/* Expand toggle */}
                            <td className="px-3 py-3 text-gray-400">
                              {isExpanded
                                ? <ChevronDown className="w-4 h-4 text-indigo-500" />
                                : <ChevronRight className="w-4 h-4" />}
                            </td>

                            {/* Content item */}
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900 truncate max-w-[180px]">
                                {row.item_name || '—'}
                              </div>
                              {row.calendar_name && row.calendar_name !== row.item_name && (
                                <div className="text-xs text-gray-400 truncate max-w-[180px]">{row.calendar_name}</div>
                              )}
                              {row.version_count > 1 && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <GitBranch className="w-3 h-3 text-indigo-400" />
                                  <span className="text-xs text-indigo-500 font-medium">{row.version_count} versions</span>
                                </div>
                              )}
                            </td>

                            {/* Customer */}
                            <td className="px-4 py-3">
                              <span className="text-gray-700 truncate max-w-[140px] block">
                                {row.customer_name || '—'}
                              </span>
                            </td>

                            {/* Uploaded by */}
                            <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[140px]">
                              {row.created_by || '—'}
                            </td>

                            {/* Upload date */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-gray-700">{fmtDate(row.uploaded_at)}</span>
                              {row.uploaded_at && (
                                <div className="text-xs text-gray-400">
                                  {format(parseISO(row.uploaded_at), 'h:mm a')}
                                </div>
                              )}
                            </td>

                            {/* Approval date */}
                            <td className="px-4 py-3 whitespace-nowrap">
                              {row.approved_at ? (
                                <>
                                  <span className="text-green-700 font-medium">{fmtDate(row.approved_at)}</span>
                                  <div className="text-xs text-gray-400">
                                    {format(parseISO(row.approved_at), 'h:mm a')}
                                  </div>
                                </>
                              ) : (
                                <span className="text-gray-400 italic text-xs">Not yet approved</span>
                              )}
                            </td>

                            {/* Days to approval */}
                            <td className="px-4 py-3 text-center">
                              {row.days_to_approval !== null && row.days_to_approval !== undefined ? (
                                <span className={`inline-flex items-center justify-center w-10 h-7 rounded-lg text-xs font-bold ${
                                  row.days_to_approval <= 1 ? 'bg-green-100 text-green-700'
                                  : row.days_to_approval <= 3 ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                                }`}>
                                  {row.days_to_approval}d
                                </span>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                          </tr>

                          {/* ── Expanded versions + comments panel ── */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} className="bg-indigo-50/30 px-6 pb-4 pt-2">
                                <div className="space-y-3">
                                  {(!row.versions || row.versions.length === 0) && (
                                    <p className="text-xs text-gray-400 italic py-2">No version data — please refresh the report.</p>
                                  )}
                                  {(row.versions || []).map((v) => (
                                    <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                      {/* Version header */}
                                      <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">
                                          <GitBranch className="w-3 h-3" /> Version {v.version_number}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          Uploaded by <span className="font-medium text-gray-700">{v.created_by || '—'}</span>
                                          {v.uploaded_at && (
                                            <> on <span className="font-medium text-gray-700">{fmtDate(v.uploaded_at)}</span> at {format(parseISO(v.uploaded_at), 'h:mm a')}</>
                                          )}
                                        </span>
                                        <StatusBadge status={v.status} />
                                        {v.approved_by_admin && (
                                          <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium">Admin Approved</span>
                                        )}
                                        {v.approved_by_customer && v.approved_at && (
                                          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded font-medium">
                                            Customer Approved · {fmtDate(v.approved_at)} {format(parseISO(v.approved_at), 'h:mm a')}
                                          </span>
                                        )}
                                      </div>

                                      {/* Approval / rejection notes */}
                                      {v.approval_notes && (
                                        <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5 mb-2">
                                          ✅ <span className="font-medium">Approval note:</span> {v.approval_notes}
                                        </p>
                                      )}
                                      {v.rejection_reason && (
                                        <p className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-1.5 mb-2">
                                          ❌ <span className="font-medium">Rejection reason:</span> {v.rejection_reason}
                                        </p>
                                      )}

                                      {/* Image thumbnails */}
                                      {v.images && v.images.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-3">
                                          {v.images.map((img, ii) => (
                                            img.type === 'video' ? (
                                              <a key={ii} href={img.url} target="_blank" rel="noreferrer" className="block relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition bg-black">
                                                <video
                                                  src={img.url}
                                                  className="w-full h-full object-cover"
                                                  preload="metadata"
                                                  muted
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                  <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                                                    <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                                                  </div>
                                                </div>
                                              </a>
                                            ) : (
                                              <a key={ii} href={img.url} target="_blank" rel="noreferrer">
                                                <img
                                                  src={img.url}
                                                  alt={img.name || `media-${ii + 1}`}
                                                  className="w-20 h-20 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition"
                                                />
                                              </a>
                                            )
                                          ))}
                                        </div>
                                      )}

                                      {/* Comments */}
                                      {v.comments.length > 0 ? (
                                        <div className="mt-2">
                                          <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            <MessageSquare className="w-3.5 h-3.5" />
                                            Comments ({v.comments.length})
                                          </div>
                                          <div className="space-y-1.5">
                                            {v.comments.map((c, ci) => (
                                              <div key={c.id || ci} className={`flex gap-2 items-start text-xs rounded-lg px-3 py-2 ${c.done ? 'bg-gray-50 opacity-60' : 'bg-amber-50'}`}>
                                                <span className={`font-semibold flex-shrink-0 ${c.author === 'Admin' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                                  {c.author}:
                                                </span>
                                                <span className={`text-gray-700 flex-1 ${c.done ? 'line-through' : ''}`}>{c.comment}</span>
                                                {c.timestamp && (
                                                  <span className="text-gray-400 flex-shrink-0 whitespace-nowrap">
                                                    {format(parseISO(c.timestamp), 'dd MMM, h:mm a')}
                                                  </span>
                                                )}
                                                {c.done && <span className="text-green-600 flex-shrink-0 font-medium">✓ Done</span>}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-400 italic mt-1">No comments on this version.</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
