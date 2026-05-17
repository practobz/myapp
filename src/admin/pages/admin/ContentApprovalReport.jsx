import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Download, RefreshCw, Filter, Calendar, CheckCircle, Clock,
  AlertCircle, Loader2, User, FileText, BarChart2, X,
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

function exportPDF(rows, summary, adminName) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const PW  = doc.internal.pageSize.getWidth();   // 297
  const PH  = doc.internal.pageSize.getHeight();  // 210
  const M   = 14;
  const CW  = PW - 2 * M;
  let y     = 0;

  const addPage = () => { doc.addPage(); y = M; };
  const checkY  = (need) => { if (y + need > PH - 14) addPage(); };

  const rr = (x, _y, w, h, fill, stroke) => {
    doc.setFillColor(...fill);
    if (stroke) doc.setDrawColor(...stroke);
    doc.roundedRect(x, _y, w, h, 2, 2, stroke ? 'FD' : 'F');
  };

  const clip = (s, max) => {
    const str = String(s || '—');
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  };

  const getPlatformLabel = (p) => {
    const key = String(Array.isArray(p) ? p[0] : p || '').toLowerCase();
    return { instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
             twitter: 'Twitter/X', youtube: 'YouTube' }[key] || (key || '—');
  };

  const fmtD = (iso) => {
    if (!iso) return '—';
    try { return format(parseISO(iso), 'dd MMM yyyy'); } catch { return '—'; }
  };

  // ── HEADER ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...C.dark);
  doc.rect(0, 0, PW, 42, 'F');
  doc.setFillColor(...C.blue);
  doc.rect(0, 40, PW, 2, 'F');
  doc.setFillColor(...C.indigo);
  doc.rect(0, 0, 4, 42, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...C.white);
  doc.text('CONTENT APPROVAL TIMELINE REPORT', M + 3, 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text(`Upload Date  →  Customer Approval Date  •  ${rows.length} item${rows.length !== 1 ? 's' : ''}`, M + 3, 29);

  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, HH:mm')}`, PW - M, 18, { align: 'right' });
  if (adminName) doc.text(`Admin: ${adminName}`, PW - M, 30, { align: 'right' });

  y = 50;

  // ── SUMMARY STATS ──────────────────────────────────────────────────────────
  const CARD_W = (CW - 9) / 4;
  const CARD_H = 28;
  const statCards = [
    { label: 'TOTAL CONTENT',   value: summary.total,            color: C.blue,   bg: C.bgblue  },
    { label: 'APPROVED',        value: summary.approved,         color: C.green,  bg: C.bggreen },
    { label: 'PENDING APPROVAL',value: summary.pending_approval, color: C.amber,  bg: C.bgamber },
    { label: 'AVG DAYS TO APPROVE',
      value: summary.avg_days_to_approval !== null ? `${summary.avg_days_to_approval}d` : '—',
      color: C.indigo, bg: C.bgindig },
  ];
  statCards.forEach((s, i) => {
    const sx = M + i * (CARD_W + 3);
    rr(sx, y, CARD_W, CARD_H, s.bg, s.color);
    doc.setFontSize(19);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...s.color);
    doc.text(String(s.value ?? '—'), sx + CARD_W / 2, y + 14, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.slate);
    doc.text(s.label, sx + CARD_W / 2, y + 24, { align: 'center' });
  });
  y += CARD_H + 8;

  // ── TABLE HEADER ───────────────────────────────────────────────────────────
  const COL = {
    item:     { x: M,        w: 52 },
    customer: { x: M + 53,   w: 35 },
    platform: { x: M + 89,   w: 24 },
    by:       { x: M + 114,  w: 38 },
    uploaded: { x: M + 153,  w: 28 },
    approved: { x: M + 182,  w: 28 },
    days:     { x: M + 211,  w: 18 },
    status:   { x: M + 230,  w: 35 },
  };

  rr(M, y, CW, 11, C.dark, null);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  Object.entries(COL).forEach(([, c]) => {
    const labels = { item: 'CONTENT ITEM', customer: 'CUSTOMER', platform: 'PLATFORM',
      by: 'UPLOADED BY', uploaded: 'UPLOAD DATE', approved: 'APPROVAL DATE',
      days: 'DAYS', status: 'STATUS' };
    doc.text(labels[Object.keys(COL).find(k => COL[k] === c)], c.x + 2, y + 7.5);
  });
  y += 11;

  // ── TABLE ROWS ─────────────────────────────────────────────────────────────
  const ROW_H = 11;
  rows.forEach((row, idx) => {
    checkY(ROW_H + 2);

    const bg = idx % 2 === 0 ? C.white : C.light;
    rr(M, y, CW, ROW_H, bg, null);

    // Thin left accent for approved rows
    if (row.approved_at) {
      doc.setFillColor(...C.green);
      doc.rect(M, y, 1.5, ROW_H, 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...C.dark);

    const textY = y + 7;

    // Content item
    doc.setFont('helvetica', 'bold');
    doc.text(clip(row.item_name || row.calendar_name, 30), COL.item.x + 2, textY);
    if (row.calendar_name && row.calendar_name !== row.item_name) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...C.slate);
      doc.text(clip(row.calendar_name, 30), COL.item.x + 2, y + ROW_H - 1);
      doc.setFontSize(9.5);
      doc.setTextColor(...C.dark);
    }

    // Customer
    doc.setFont('helvetica', 'normal');
    doc.text(clip(row.customer_name, 22), COL.customer.x + 2, textY);

    // Platform
    const pLabel = getPlatformLabel(row.platform);
    doc.setTextColor(...C.indigo);
    doc.text(pLabel, COL.platform.x + 2, textY);
    doc.setTextColor(...C.dark);

    // Uploaded by
    doc.text(clip(row.created_by, 24), COL.by.x + 2, textY);

    // Upload date
    doc.text(fmtD(row.uploaded_at), COL.uploaded.x + 2, textY);

    // Approval date
    if (row.approved_at) {
      doc.setTextColor(...C.green);
      doc.setFont('helvetica', 'bold');
      doc.text(fmtD(row.approved_at), COL.approved.x + 2, textY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
    } else {
      doc.setTextColor(...C.slate);
      doc.text('Pending', COL.approved.x + 2, textY);
      doc.setTextColor(...C.dark);
    }

    // Days pill
    if (row.days_to_approval !== null && row.days_to_approval !== undefined) {
      const d = row.days_to_approval;
      const pillColor = d <= 1 ? C.green : d <= 3 ? C.amber : C.red;
      const pillBg    = d <= 1 ? C.bggreen : d <= 3 ? C.bgamber : C.bgred;
      rr(COL.days.x + 1, y + 2.5, 15, 6, pillBg, null);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...pillColor);
      doc.text(`${d}d`, COL.days.x + 8.5, y + 7, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...C.dark);
      doc.setFontSize(9.5);
    }

    // Status
    const statusLabel = row.status === 'submitted' ? 'In Review'
      : String(row.status || '—').replace(/_/g, ' ');
    const sColor = {
      approved: C.green, rejected: C.red, published: [5, 150, 105],
    }[row.status] || C.slate;
    doc.setTextColor(...sColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(clip(statusLabel, 18), COL.status.x + 2, textY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.dark);
    doc.setFontSize(9.5);

    // Row divider
    doc.setDrawColor(...C.border);
    doc.setLineWidth(0.1);
    doc.line(M, y + ROW_H, M + CW, y + ROW_H);

    y += ROW_H;
  });

  // ── FOOTER on each page ────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...C.dark);
    doc.rect(0, PH - 10, PW, 10, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
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
  const [assignedCustomerIds, setAssignedCustomerIds] = useState(null); // null = not yet loaded
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

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
                onClick={() => exportPDF(filteredRows, summary, currentUser?.name)}
                disabled={filteredRows.length === 0}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Download PDF
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
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Content Item</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uploaded By</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Upload Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Approval Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Days</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/60 transition-colors">
                        {/* Content item */}
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 truncate max-w-[180px]">
                            {row.item_name || '—'}
                          </div>
                          {row.calendar_name && row.calendar_name !== row.item_name && (
                            <div className="text-xs text-gray-400 truncate max-w-[180px]">{row.calendar_name}</div>
                          )}
                        </td>

                        {/* Customer */}
                        <td className="px-4 py-3">
                          <span className="text-gray-700 truncate max-w-[140px] block">
                            {row.customer_name || '—'}
                          </span>
                        </td>

                        {/* Platform */}
                        <td className="px-4 py-3">
                          <PlatformPill platform={row.platform} />
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
                    ))}
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
