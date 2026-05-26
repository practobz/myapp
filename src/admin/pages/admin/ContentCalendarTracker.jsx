import React, { useState, useEffect, useMemo, useCallback } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search, RefreshCw, Download, ChevronUp, ChevronDown,
  ChevronsUpDown, Calendar, FileText, AlertCircle
} from 'lucide-react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ── sortable header ─────────────────────────────────────────────────────────
function Th({ col, label, sortKey, onSort }) {
  const active = sortKey?.col === col;
  const dir = active ? sortKey.dir : null;
  return (
    <th
      onClick={() => onSort(col)}
      className="px-2 py-2 text-left text-xs font-bold text-gray-700 bg-[#E8F0FE] border border-[#B0C4DE] cursor-pointer select-none whitespace-nowrap hover:bg-[#d2e3fc] transition-colors"
    >
      <div className="flex items-center gap-1">
        {label}
        {dir === 'asc'  ? <ChevronUp className="w-3 h-3 text-blue-600" /> :
         dir === 'desc' ? <ChevronDown className="w-3 h-3 text-blue-600" /> :
                          <ChevronsUpDown className="w-3 h-3 text-gray-400" />}
      </div>
    </th>
  );
}

// ── main component ──────────────────────────────────────────────────────────
export default function ContentCalendarTracker() {
  const { currentUser } = useAuth();

  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // filters
  const [search, setSearch]               = useState('');
  const [filterCustomer, setFilterCustomer] = useState('all');
  const [filterCreator, setFilterCreator] = useState('all');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [dateFrom, setDateFrom]           = useState('');
  const [dateTo, setDateTo]               = useState('');

  // sort
  const [sortKey, setSortKey] = useState({ col: 'date', dir: 'desc' });

  // pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  // ── data loading ──────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);
    try {
      const adminId = currentUser._id || currentUser.id;

      // 1. Get assigned customers
      const custRes = await fetch(`${API}/admin/assigned-customers?adminId=${adminId}`);
      if (!custRes.ok) throw new Error('Failed to fetch assigned customers');
      const customers = await custRes.json();

      if (!customers.length) {
        setRows([]);
        setLoading(false);
        setLastRefresh(new Date());
        return;
      }

      // 2. Fetch calendars + scheduled posts in parallel
      const [calendarArrays, scheduledPostsRaw] = await Promise.all([
        Promise.all(
          customers.map(c =>
            fetch(`${API}/calendars/customer/${c._id}`)
              .then(r => r.ok ? r.json() : [])
              .catch(() => [])
          )
        ),
        fetch(`${API}/api/scheduled-posts`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      ]);
      const scheduledPosts = Array.isArray(scheduledPostsRaw) ? scheduledPostsRaw : [];

      // 3. Flatten to rows
      const customerMap = Object.fromEntries(customers.map(c => [c._id, c]));
      const flat = [];
      let rowNum = 1;

      calendarArrays.forEach((calendars, ci) => {
        const customer = customers[ci];
        (calendars || []).forEach(cal => {
          (cal.contentItems || []).forEach(item => {
            flat.push({
              _rowNum: rowNum++,
              customerId:    customer._id,
              customerName:  customer.name || customer.email || customer._id,
              calendarId:    cal._id,
              calendarName:  cal.name || 'Untitled Calendar',
              itemId:        item.id || item._id || '',
              title:         item.title || item.description || '(no title)',
              description:   item.description || '',
              date:          item.date || item.scheduledDate || '',
              creatorName:   item.assignedToName || item.creatorName || item.assignedTo || '',
              status: (() => {
                const isPublished =
                  item.published === true ||
                  item.status === 'published' ||
                  !!item.publishedAt ||
                  scheduledPosts.some(p =>
                    ((p.item_id && p.item_id === (item.id || item._id)) ||
                     (p.contentId && p.contentId === (item.id || item._id)) ||
                     (p.item_name && p.item_name === (item.title || item.description))) &&
                    (p.status === 'published' || !!p.publishedAt)
                  );
                if (isPublished) return 'published';
                if (item.approvedAt || item.approved_at || item.status === 'approved') return 'approved';
                return item.status || '';
              })(),
              createdAt:     item.createdAt || cal.createdAt || '',
            });
          });
        });
      });

      setRows(flat);
      setLastRefresh(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── derive filter options ─────────────────────────────────────────────────
  const customers  = useMemo(() => [...new Set(rows.map(r => r.customerName))].sort(), [rows]);
  const creators   = useMemo(() => [...new Set(rows.map(r => r.creatorName).filter(Boolean))].sort(), [rows]);

  // ── filtering + sorting ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const fromTs = dateFrom ? new Date(dateFrom).setHours(0, 0, 0, 0) : null;
    const toTs   = dateTo   ? new Date(dateTo).setHours(23, 59, 59, 999) : null;
    return rows.filter(r => {
      if (filterCustomer !== 'all' && r.customerName !== filterCustomer) return false;
      if (filterCreator  !== 'all' && r.creatorName   !== filterCreator)  return false;
      if (filterStatus   !== 'all' && (r.status || '').toLowerCase() !== filterStatus) return false;
      if (q && ![r.customerName, r.calendarName, r.title, r.creatorName]
                 .join(' ').toLowerCase().includes(q)) return false;
      if (fromTs || toTs) {
        const rowTs = r.date ? new Date(r.date).getTime() : null;
        if (!rowTs) return false;
        if (fromTs && rowTs < fromTs) return false;
        if (toTs   && rowTs > toTs)   return false;
      }
      return true;
    });
  }, [rows, search, filterCustomer, filterCreator, filterStatus, dateFrom, dateTo]);

  const sorted = useMemo(() => {
    if (!sortKey) return filtered;
    const { col, dir } = sortKey;
    return [...filtered].sort((a, b) => {
      let av = a[col] ?? '', bv = b[col] ?? '';
      if (col === 'date' || col === 'createdAt' || col === 'publishedAt') {
        av = av ? new Date(av).getTime() : 0;
        bv = bv ? new Date(bv).getTime() : 0;
      } else {
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
      }
      if (av < bv) return dir === 'asc' ? -1 : 1;
      if (av > bv) return dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paginated  = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSort = useCallback(col => {
    setSortKey(prev =>
      prev?.col === col
        ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { col, dir: 'asc' }
    );
    setPage(1);
  }, []);

  const resetFilters = () => {
    setSearch('');
    setFilterCustomer('all');
    setFilterCreator('all');
    setFilterStatus('all');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasActiveFilter = search || filterCustomer !== 'all' || filterCreator !== 'all' || filterStatus !== 'all' || dateFrom || dateTo;

  // ── CSV export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['#', 'Customer', 'Calendar', 'Title', ' Date', 'Creator', 'Status'];
    const csvRows = [
      headers.join(','),
      ...sorted.map((r, i) =>
        [
          i + 1,
          `"${(r.customerName  || '').replace(/"/g, '""')}"`,
          `"${(r.calendarName  || '').replace(/"/g, '""')}"`,
          `"${(r.title         || '').replace(/"/g, '""')}"`,
          r.date ? `="${new Date(r.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}"` : '',
          `"${(r.creatorName   || '').replace(/"/g, '""')}"`,
          `"${(r.status        || '').replace(/"/g, '""')}"`,
        ].join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `content-calendar-tracker-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <AdminLayout title="Content Calendar Tracker">
      <div className="p-3 sm:p-5 space-y-3">

        {/* ── page header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Content Calendar Tracker
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {sorted.length} item{sorted.length !== 1 ? 's' : ''}
              {lastRefresh && ` · refreshed ${lastRefresh.toLocaleTimeString()}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportCSV}
              disabled={!sorted.length}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* ── filters row ── */}
        <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded px-3 py-2">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-6 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <select
            value={filterCustomer}
            onChange={e => { setFilterCustomer(e.target.value); setPage(1); }}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Customers</option>
            {customers.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select
            value={filterCreator}
            onChange={e => { setFilterCreator(e.target.value); setPage(1); }}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Creators</option>
            {creators.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="approved">Approved</option>
          </select>
          <div className="flex items-center gap-1">
            <label className="text-[11px] text-gray-500 whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(1); }}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-1">
            <label className="text-[11px] text-gray-500 whitespace-nowrap">To</label>
            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={e => { setDateTo(e.target.value); setPage(1); }}
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          {hasActiveFilter && (
            <button onClick={resetFilters} className="text-[11px] text-red-500 hover:text-red-700 underline">
              Clear
            </button>
          )}
        </div>

        {/* ── table ── */}
        <div className="rounded overflow-hidden border border-[#B0C4DE] shadow-sm">
          {loading ? (
            <div className="bg-white py-20 flex flex-col items-center gap-3 text-gray-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-xs">Loading calendar data…</span>
            </div>
          ) : error ? (
            <div className="bg-white py-20 flex flex-col items-center gap-2 text-red-500">
              <AlertCircle className="w-5 h-5" />
              <span className="text-xs">{error}</span>
              <button onClick={loadData} className="text-xs underline">Retry</button>
            </div>
          ) : sorted.length === 0 ? (
            <div className="bg-white py-20 flex flex-col items-center gap-2 text-gray-400">
              <FileText className="w-7 h-7" />
              <span className="text-xs">No content items found</span>
              {hasActiveFilter && (
                <button onClick={resetFilters} className="text-xs text-blue-500 underline">Clear filters</button>
              )}
            </div>
          ) : (
            <>
              {/* scrollable table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{ fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif' }}>
                  <colgroup>
                    <col style={{ width: 42 }} />
                    <col style={{ width: 160 }} />
                    <col style={{ width: 160 }} />
                    <col style={{ minWidth: 220 }} />
                    <col style={{ width: 110 }} />
                    <col style={{ width: 140 }} />
                    <col style={{ width: 100 }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 bg-[#E8F0FE] border border-[#B0C4DE]">#</th>
                      <Th col="customerName" label="Customer"       sortKey={sortKey} onSort={handleSort} />
                      <Th col="calendarName" label="Calendar"       sortKey={sortKey} onSort={handleSort} />
                      <Th col="title"        label="Item / Title"   sortKey={sortKey} onSort={handleSort} />
                      <Th col="date"         label=" Date" sortKey={sortKey} onSort={handleSort} />
                      <Th col="creatorName"  label="Creator"        sortKey={sortKey} onSort={handleSort} />
                      <Th col="status"       label="Status"         sortKey={sortKey} onSort={handleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((row, idx) => {
                      const absIdx = (page - 1) * PAGE_SIZE + idx;
                      const isEven = absIdx % 2 === 0;
                      const bg = isEven ? 'bg-white' : 'bg-[#F8FAFF]';
                      const cell = 'border border-[#D0DCEE] px-2 py-[5px] align-middle';
                      return (
                        <tr
                          key={`${row.calendarId}-${row.itemId}-${idx}`}
                          className={`${bg} hover:bg-[#EBF3FF] transition-colors`}
                        >
                          <td className={`${cell} text-center text-[11px] text-gray-400 tabular-nums bg-[#F0F4FA]`}>
                            {absIdx + 1}
                          </td>
                          <td className={`${cell} text-gray-800 font-medium`}>
                            <span className="truncate block max-w-[150px]" title={row.customerName}>{row.customerName}</span>
                          </td>
                          <td className={`${cell} text-gray-700`}>
                            <span className="truncate block max-w-[150px]" title={row.calendarName}>{row.calendarName}</span>
                          </td>
                          <td className={`${cell} text-gray-800`}>
                            <span className="truncate block max-w-[210px]" title={row.title}>{row.title}</span>
                          </td>
                          <td className={`${cell} tabular-nums text-gray-700 whitespace-nowrap`}>
                            {row.date
                              ? new Date(row.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className={`${cell} text-gray-700`}>
                            {row.creatorName
                              ? <span className="truncate block max-w-[130px]" title={row.creatorName}>{row.creatorName}</span>
                              : <span className="text-gray-300 italic">Unassigned</span>}
                          </td>
                          <td className={`${cell} text-center`}>
                            {row.status
                              ? <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  row.status.toLowerCase() === 'published' ? 'bg-green-100 text-green-700' :
                                  row.status.toLowerCase() === 'approved'  ? 'bg-blue-100 text-blue-700'  :
                                  'bg-gray-100 text-gray-600'
                                }`}>{row.status}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── pagination ── */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-[#B0C4DE] bg-[#E8F0FE]">
                  <span className="text-[11px] text-gray-500">
                    {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-2 py-0.5 text-[11px] border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
                    >‹</button>
                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 3, totalPages - 6));
                      const p = start + i;
                      return (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`px-2 py-0.5 text-[11px] border rounded ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                        >{p}</button>
                      );
                    })}
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-2 py-0.5 text-[11px] border border-gray-300 rounded bg-white hover:bg-gray-50 disabled:opacity-40"
                    >›</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
