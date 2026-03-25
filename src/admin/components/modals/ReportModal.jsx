import React, { useState, useMemo } from 'react';
import { X, Download, FileBarChart, Calendar, CheckCircle, Clock, TrendingUp, Info } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { jsPDF } from 'jspdf';

// ─── helpers ─────────────────────────────────────────────────────────────────
const DARK     = [15,  23,  42];
const BLUE     = [59,  130, 246];
const INDIGO   = [99,  102, 241];
const GREEN    = [16,  185, 129];
const AMBER    = [245, 158, 11];
const SLATE    = [100, 116, 139];
const WHITE    = [255, 255, 255];
const BGLIGHT  = [248, 250, 252];
const BORDER   = [226, 232, 240];
const BGLBLUE  = [239, 246, 255];
const BGINDIGO = [238, 242, 255];
const BGGREEN  = [236, 253, 245];
const BGAMBER  = [255, 251, 235];

const RANGE_OPTIONS = [
  { key: '7d',  label: '7 Days',   sub: 'Last 7 days',    fileSuffix: '7-days'   },
  { key: '15d', label: '15 Days',  sub: 'Last 15 days',   fileSuffix: '15-days'  },
  { key: '30d', label: '30 Days',  sub: 'Last 30 days',   fileSuffix: '30-days'  },
  { key: '3m',  label: '3 Months', sub: 'Last 3 months',  fileSuffix: '3-months' },
  { key: '6m',  label: '6 Months', sub: 'Last 6 months',  fileSuffix: '6-months' },
  { key: 'all', label: 'All Time', sub: 'All calendars',  fileSuffix: 'all-time' },
];

function getRangeLabel(key) {
  return RANGE_OPTIONS.find(r => r.key === key)?.label || key;
}

function getDateRange(type) {
  const now = new Date();
  switch (type) {
    case '7d':  return { start: subDays(now, 7),     end: now, isAll: false };
    case '15d': return { start: subDays(now, 15),    end: now, isAll: false };
    case '30d': return { start: subDays(now, 30),    end: now, isAll: false };
    case '3m':  return { start: subMonths(now, 3),   end: now, isAll: false };
    case '6m':  return { start: subMonths(now, 6),   end: now, isAll: false };
    case 'all': return { start: new Date(0),         end: now, isAll: true  };
    default:    return { start: subDays(now, 7),     end: now, isAll: false };
  }
}

function clip(str, max) {
  if (!str) return '—';
  const s = String(str);
  return s.length > max ? s.substring(0, max - 1) + '…' : s;
}

// Draw a filled + stroked rounded rectangle
function roundedFD(doc, x, y, w, h, fill, stroke) {
  doc.setFillColor(...fill);
  if (stroke) doc.setDrawColor(...stroke);
  doc.roundedRect(x, y, w, h, 2, 2, stroke ? 'FD' : 'F');
}

// ─── PDF builder ─────────────────────────────────────────────────────────────
function buildPDF({ customer, calendars, filteredCalendars, reportType, isItemPublished }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const PW = doc.internal.pageSize.getWidth();
  const PH = doc.internal.pageSize.getHeight();
  const M  = 18;    // margin
  const CW = PW - 2 * M;
  let y = 0;

  const addPage = () => { doc.addPage(); y = M; };
  const checkY = (need) => { if (y + need > PH - 18) addPage(); };

  // ── compute stats ──────────────────────────────────────────────────────────
  const { start, end } = getDateRange(reportType);

  let totalItems = 0, publishedItems = 0;
  filteredCalendars.forEach(cal => {
    (cal.contentItems || []).forEach(item => {
      totalItems++;
      if (isItemPublished(item)) publishedItems++;
    });
  });
  const pendingItems  = totalItems - publishedItems;
  const completionPct = totalItems > 0 ? Math.round((publishedItems / totalItems) * 100) : 0;

  // overall across ALL calendars (for "all-time" context line)
  let allItems = 0, allPub = 0;
  calendars.forEach(cal => {
    (cal.contentItems || []).forEach(item => {
      allItems++;
      if (isItemPublished(item)) allPub++;
    });
  });

  // ── HEADER BANNER ──────────────────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PW, 46, 'F');

  // accent stripe
  doc.setFillColor(...BLUE);
  doc.rect(0, 44, PW, 2, 'F');

  // brand stripe (left edge)
  doc.setFillColor(...INDIGO);
  doc.rect(0, 0, 4, 46, 'F');

  // title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...WHITE);
  doc.text('CONTENT CALENDAR REPORT', M + 2, 18);

  // sub-title
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${getRangeLabel(reportType)} Performance Summary  •  ${customer?.name || 'N/A'}`,
    M + 2, 29
  );

  // right: date range
  const periodStr = `${format(start, 'MMM dd, yyyy')} – ${format(end, 'MMM dd, yyyy')}`;
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(periodStr, PW - M, 24, { align: 'right' });
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, PW - M, 33, { align: 'right' });

  y = 54;

  // ── CUSTOMER INFO STRIP ────────────────────────────────────────────────────
  roundedFD(doc, M, y, CW, 22, BGLIGHT, BORDER);

  const infoFields = [
    { label: 'CUSTOMER',      value: clip(customer?.name, 28),  x: M + 5  },
    { label: 'EMAIL',         value: clip(customer?.email, 35), x: M + 72 },
    { label: 'REPORT PERIOD', value: RANGE_OPTIONS.find(r => r.key === reportType)?.sub || reportType, x: M + 145 },
  ];
  infoFields.forEach(({ label, value, x }) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE);
    doc.text(label, x, y + 8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.text(value, x, y + 17);
  });
  y += 30;

  // ── SUMMARY STATS ──────────────────────────────────────────────────────────
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('PERIOD SUMMARY', M, y);
  y += 5;

  const CARD_H = 28;
  const CARD_W = (CW - 9) / 4;
  const statCards = [
    { label: 'CALENDARS',  value: filteredCalendars.length, color: BLUE,   bg: BGLBLUE  },
    { label: 'TOTAL ITEMS', value: totalItems,              color: INDIGO, bg: BGINDIGO },
    { label: 'PUBLISHED',  value: publishedItems,           color: GREEN,  bg: BGGREEN  },
    { label: 'PENDING',    value: pendingItems,             color: AMBER,  bg: BGAMBER  },
  ];

  statCards.forEach((s, i) => {
    const sx = M + i * (CARD_W + 3);
    roundedFD(doc, sx, y, CARD_W, CARD_H, s.bg, s.color);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...s.color);
    doc.text(String(s.value), sx + CARD_W / 2, y + 14, { align: 'center' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE);
    doc.text(s.label, sx + CARD_W / 2, y + 23, { align: 'center' });
  });
  y += CARD_H + 5;

  // Completion rate bar
  roundedFD(doc, M, y, CW, 13, [241, 245, 249], BORDER);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE);
  doc.text('COMPLETION RATE', M + 5, y + 8.5);

  const barX = M + 48;
  const barW = CW - 70;
  const barH = 4.5;
  const barY = y + 4.5;
  doc.setFillColor(...BORDER);
  doc.roundedRect(barX, barY, barW, barH, 2, 2, 'F');
  if (completionPct > 0) {
    doc.setFillColor(...GREEN);
    doc.roundedRect(barX, barY, (barW * completionPct) / 100, barH, 2, 2, 'F');
  }
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(`${completionPct}%`, PW - M - 2, y + 8.5, { align: 'right' });
  y += 21;

  // ── CALENDAR BREAKDOWN TABLE ───────────────────────────────────────────────
  checkY(25);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('CALENDAR BREAKDOWN', M, y);
  y += 5;

  if (filteredCalendars.length === 0) {
    roundedFD(doc, M, y, CW, 16, [254, 249, 195], [253, 224, 71]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(113, 63, 18);
    doc.text(
      `No calendars were created during this ${reportType} period.`,
      M + 5, y + 10
    );
    y += 24;
  } else {
    // col widths: #, Name, Created, Assigned To, Items, Published, Pending
    const COLS  = [8, 55, 30, 38, 15, 18, 6];
    const HDRS  = ['#', 'Calendar Name', 'Created', 'Assigned To', 'Items', 'Pub.', 'Pend.'];
    const ROW_H = 8;

    // header
    doc.setFillColor(...DARK);
    doc.rect(M, y, CW, ROW_H, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...WHITE);
    let xp = M + 2;
    HDRS.forEach((h, i) => { doc.text(h, xp + 1, y + 5.5); xp += COLS[i]; });
    y += ROW_H;

    filteredCalendars.forEach((cal, ri) => {
      checkY(ROW_H + 2);
      const tot = cal.contentItems?.length || 0;
      const pub = (cal.contentItems || []).filter(it => isItemPublished(it)).length;
      const pnd = tot - pub;
      const row = [
        String(ri + 1),
        clip(cal.name, 28),
        cal.createdAt ? format(new Date(cal.createdAt), 'MMM dd, yyyy') : 'N/A',
        clip(cal.assignedToName || cal.assignedTo, 21),
        String(tot),
        String(pub),
        String(pnd),
      ];

      doc.setFillColor(...(ri % 2 === 0 ? BGLIGHT : WHITE));
      doc.rect(M, y, CW, ROW_H, 'F');
      doc.setDrawColor(...BORDER);
      doc.rect(M, y, CW, ROW_H, 'S');

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      xp = M + 2;
      row.forEach((cell, ci) => {
        if (ci === 5 && pub > 0)        doc.setTextColor(...GREEN);
        else if (ci === 6 && pnd > 0)   doc.setTextColor(...AMBER);
        else                             doc.setTextColor(...DARK);
        doc.text(cell, xp + 1, y + 5.5);
        xp += COLS[ci];
      });
      y += ROW_H;
    });
  }
  y += 10;

  // ── CONTENT ITEMS BREAKDOWN ────────────────────────────────────────────────
  if (filteredCalendars.some(c => (c.contentItems || []).length > 0)) {
    checkY(20);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    doc.text('CONTENT ITEMS BREAKDOWN', M, y);
    y += 5;

    const ICOLS   = [7, 65, 24, 26, 27, 18];
    const IHDRS   = ['#', 'Title / Description', 'Due Date', 'Platform', 'Status', 'Published'];
    const IROW_H  = 7.5;

    filteredCalendars.forEach((cal) => {
      const items = cal.contentItems || [];
      if (!items.length) return;

      checkY(24);

      // Calendar sub-header
      doc.setFillColor(...BLUE);
      doc.rect(M, y, CW, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      doc.text(clip(cal.name, 60), M + 4, y + 5.5);
      const calPub = items.filter(it => isItemPublished(it)).length;
      const badge  = `${calPub}/${items.length} published`;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(badge, PW - M - 2, y + 5.5, { align: 'right' });
      y += 8;

      // item table header
      doc.setFillColor(30, 41, 59);
      doc.rect(M, y, CW, IROW_H - 1, 'F');
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(203, 213, 225);
      let ix = M + 2;
      IHDRS.forEach((h, i) => { doc.text(h, ix + 1, y + 4.5); ix += ICOLS[i]; });
      y += IROW_H - 1;

      items.forEach((item, ii) => {
        if (y + IROW_H > PH - 18) {
          addPage();
          // reprint sub-header on continued page
          doc.setFillColor(...BLUE);
          doc.rect(M, y, CW, 8, 'F');
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...WHITE);
          doc.text(`${clip(cal.name, 45)} (continued)`, M + 4, y + 5.5);
          y += 8;
          doc.setFillColor(30, 41, 59);
          doc.rect(M, y, CW, IROW_H - 1, 'F');
          doc.setFontSize(7);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(203, 213, 225);
          ix = M + 2;
          IHDRS.forEach((h, i) => { doc.text(h, ix + 1, y + 4.5); ix += ICOLS[i]; });
          y += IROW_H - 1;
        }

        const pub    = isItemPublished(item);
        const status = pub ? 'Published' : (item.status || 'Pending');
        const due    = item.date ? format(new Date(item.date), 'MMM dd, yy') : 'N/A';
        let platform = '';
        if (item.type) {
          platform = Array.isArray(item.type)
            ? item.type.join(', ')
            : String(item.type);
          platform = clip(platform, 14);
        }
        const desc = item.title
          ? clip(item.title, 36)
          : clip(item.description || 'Untitled', 36);

        doc.setFillColor(...(ii % 2 === 0 ? BGLIGHT : WHITE));
        doc.rect(M, y, CW, IROW_H, 'F');
        doc.setDrawColor(...BORDER);
        doc.rect(M, y, CW, IROW_H, 'S');

        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const rowData = [String(ii + 1), desc, due, platform || '—', status, pub ? 'Yes' : 'No'];
        ix = M + 2;
        rowData.forEach((cell, ci) => {
          if (ci === 5) doc.setTextColor(...(pub ? GREEN : [100, 116, 139]));
          else if (ci === 4) {
            if (status === 'Published')     doc.setTextColor(...GREEN);
            else if (status === 'approved') doc.setTextColor(...BLUE);
            else if (status === 'in_progress' || status === 'under_review') doc.setTextColor(...INDIGO);
            else                            doc.setTextColor(...SLATE);
          } else {
            doc.setTextColor(...DARK);
          }
          doc.text(cell, ix + 1, y + 4.5);
          ix += ICOLS[ci];
        });
        y += IROW_H;
      });

      y += 6;
    });
  }

  // ── KPI INSIGHTS ──────────────────────────────────────────────────────────
  checkY(32);
  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('KEY INSIGHTS', M, y);
  y += 5;

  const rangeLabel = getRangeLabel(reportType).toLowerCase();
  const insights = [];
  if (filteredCalendars.length > 0) {
    insights.push(`${filteredCalendars.length} calendar${filteredCalendars.length > 1 ? 's' : ''} created in the ${rangeLabel} period.`);
  } else {
    insights.push(`No new calendars were created during the ${rangeLabel} period.`);
  }
  if (completionPct >= 100 && totalItems > 0) {
    insights.push('All content items for this period have been published. Excellent work!');
  } else if (completionPct >= 50 && totalItems > 0) {
    insights.push(`${completionPct}% of items are published — good progress. ${pendingItems} item${pendingItems !== 1 ? 's' : ''} still pending.`);
  } else if (totalItems > 0) {
    insights.push(`${pendingItems} item${pendingItems !== 1 ? 's' : ''} pending — consider scheduling these soon to stay on track.`);
  }
  if (allItems > 0) {
    const allPct = Math.round((allPub / allItems) * 100);
    insights.push(`Overall account completion rate: ${allPct}% (${allPub} of ${allItems} total items published).`);
  }

  doc.setFillColor(238, 242, 255);
  doc.setDrawColor(...INDIGO);
  doc.roundedRect(M, y, CW, 6 + insights.length * 7, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(55, 48, 163);
  insights.forEach((txt, i) => {
    doc.text(`• ${txt}`, M + 5, y + 6 + i * 7);
  });
  y += 6 + insights.length * 7 + 4;

  // ── FOOTER (every page) ───────────────────────────────────────────────────
  const totalPgs = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPgs; p++) {
    doc.setPage(p);
    doc.setFillColor(...DARK);
    doc.rect(0, PH - 11, PW, 11, 'F');
    doc.setFillColor(...BLUE);
    doc.rect(0, PH - 11, 3, 11, 'F');
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Generated by Airspark Content Management Platform', M, PH - 4);
    doc.text(`Page ${p} of ${totalPgs}`, PW - M, PH - 4, { align: 'right' });
  }

  return doc;
}

// ─── Modal component ──────────────────────────────────────────────────────────
function ReportModal({ isOpen, onClose, customer, calendars, isItemPublished }) {
  const [reportType, setReportType]   = useState('7d');
  const [generating, setGenerating]   = useState(false);

  const { start, end, isAll } = useMemo(() => getDateRange(reportType), [reportType]);

  const filteredCalendars = useMemo(
    () =>
      isAll
        ? calendars
        : calendars.filter(cal => {
            const d = cal.createdAt ? new Date(cal.createdAt) : null;
            return d && d >= start && d <= end;
          }),
    [calendars, start, end, isAll]
  );

  const { previewItems, previewPublished } = useMemo(() => {
    let items = 0, published = 0;
    filteredCalendars.forEach(cal => {
      (cal.contentItems || []).forEach(item => {
        items++;
        if (isItemPublished(item)) published++;
      });
    });
    return { previewItems: items, previewPublished: published };
  }, [filteredCalendars, isItemPublished]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const doc = buildPDF({ customer, calendars, filteredCalendars, reportType, isItemPublished });
      const safeName   = (customer?.name || 'customer').replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const fileSuffix = RANGE_OPTIONS.find(r => r.key === reportType)?.fileSuffix || reportType;
      doc.save(`content-report-${safeName}-${fileSuffix}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (err) {
      console.error('Report generation error:', err);
    } finally {
      setGenerating(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Panel */}
        <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-2xl rounded-2xl border border-gray-200 relative">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 rounded-xl">
                <FileBarChart className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">Download Report</h3>
                <p className="text-sm text-gray-500">Content calendar performance summary</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Period selector */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Report Period</label>
            <div className="grid grid-cols-3 gap-2">
              {RANGE_OPTIONS.map(({ key, label, sub }) => (
                <button
                  key={key}
                  onClick={() => setReportType(key)}
                  className={`flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all ${
                    reportType === key
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className={`text-base font-bold leading-tight ${reportType === key ? 'text-indigo-700' : 'text-gray-800'}`}>{label}</span>
                  <span className="text-xs text-gray-400 mt-0.5">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview stats */}
          <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Preview</p>
              <p className="text-xs text-gray-400">
                {isAll ? 'All time' : `${format(start, 'MMM dd')} – ${format(end, 'MMM dd, yyyy')}`}
              </p>
            </div>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {[
                { label: 'Calendars',  value: filteredCalendars.length, color: 'text-indigo-600' },
                { label: 'Items',      value: previewItems,             color: 'text-blue-600'   },
                { label: 'Published',  value: previewPublished,         color: 'text-emerald-600'},
                { label: 'Pending',    value: previewItems - previewPublished, color: 'text-amber-600'  },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-2 bg-white rounded-lg border border-gray-100">
                  <div className={`text-xl font-bold ${color}`}>{value}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>

            {filteredCalendars.length === 0 && (
              <div className="flex items-center gap-2 mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  No calendars found in this period. The report will still include insights.
                </p>
              </div>
            )}
          </div>

          {/* What's included */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Report includes</p>
            <ul className="space-y-1.5">
              {[
                'Customer summary & contact information',
                'Period summary: calendars, items, published, pending',
                'Calendar breakdown table with per-calendar stats',
                'Full content items listing with status & platform',
                'Completion rate progress bar',
                'Key insights & recommendations',
              ].map((line, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;
