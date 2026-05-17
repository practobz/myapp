import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  Download, RefreshCw, Filter, Calendar, CheckCircle, Clock,
  AlertCircle, Loader2, User, FileText, BarChart2, X,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

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

// ── Main Component ────────────────────────────────────────────────────────────
export default function ContentApprovalReport() {
  const [rows, setRows]         = useState([]);
  const [summary, setSummary]   = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Filters
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [fromDate, setFromDate]                 = useState('');
  const [toDate, setToDate]                     = useState('');
  const [statusFilter, setStatusFilter]         = useState('all');

  // Load customers for dropdown
  useEffect(() => {
    fetch(`${API_URL}/api/admin/content-approval-report/customers`)
      .then(r => r.json())
      .then(data => setCustomers(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (selectedCustomer) params.set('customerId', selectedCustomer);
      if (fromDate)         params.set('fromDate', fromDate);
      if (toDate)           params.set('toDate', toDate);

      const resp = await fetch(`${API_URL}/api/admin/content-approval-report?${params.toString()}`);
      if (!resp.ok) throw new Error(`Server error ${resp.status}`);
      const data = await resp.json();
      setRows(data.rows || []);
      setSummary(data.summary || null);
    } catch (err) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [selectedCustomer, fromDate, toDate]);

  // Auto-fetch on mount
  useEffect(() => { fetchReport(); }, [fetchReport]);

  // Apply status filter client-side
  const filteredRows = statusFilter === 'all'
    ? rows
    : statusFilter === 'approved'
      ? rows.filter(r => r.approved_at)
      : rows.filter(r => !r.approved_at);

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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Export CSV
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
                    <option key={c._id} value={c._id}>
                      {c.name || c.businessName || c.email}
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
                <button
                  onClick={fetchReport}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Filter className="w-4 h-4" />}
                  Apply
                </button>
                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 rounded-lg border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Summary Stats ───────────────────────────────────── */}
          {summary && (
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
          )}

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
