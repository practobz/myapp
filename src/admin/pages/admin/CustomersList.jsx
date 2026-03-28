import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search, AlertCircle, Users, ArrowLeft,
  Calendar, FileText, CheckCircle, Clock,
  ChevronRight, X, TrendingUp
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// ── Social platform badges ───────────────────────────────────────────────────
const PLATFORM_META = {
  facebook:  { abbr: 'FB', cls: 'bg-blue-600',                              title: 'Facebook'  },
  instagram: { abbr: 'IG', cls: 'bg-gradient-to-br from-purple-600 to-pink-500', title: 'Instagram' },
  youtube:   { abbr: 'YT', cls: 'bg-red-600',                               title: 'YouTube'   },
  linkedin:  { abbr: 'LI', cls: 'bg-blue-800',                              title: 'LinkedIn'  },
  twitter:   { abbr: 'TW', cls: 'bg-sky-500',                               title: 'Twitter'   },
  x:         { abbr: 'X',  cls: 'bg-gray-900',                              title: 'X'         },
  tiktok:    { abbr: 'TK', cls: 'bg-gray-800',                              title: 'TikTok'    },
};

const SocialBadge = memo(({ platform }) => {
  const key = platform?.toLowerCase();
  const meta = PLATFORM_META[key] || {
    abbr: (key?.[0] || '?').toUpperCase(),
    cls: 'bg-gray-400',
    title: platform,
  };
  return (
    <span
      title={meta.title}
      className={`inline-flex items-center justify-center w-5 h-5 rounded text-white text-[9px] font-bold flex-shrink-0 ${meta.cls}`}
    >
      {meta.abbr}
    </span>
  );
});
SocialBadge.displayName = 'SocialBadge';

// ── Trend data builder ───────────────────────────────────────────────────────
function buildTrend(calendars, rangeMonths) {
  const allItems = calendars.flatMap(cal => cal.contentItems || []);
  const now = new Date();
  const buckets = [];
  for (let i = rangeMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      monthKey,
      label: d.toLocaleDateString(undefined, { month: 'short', year: rangeMonths > 6 ? '2-digit' : undefined }),
      published: 0,
      pending: 0,
    });
  }
  const map = Object.fromEntries(buckets.map(b => [b.monthKey, b]));
  allItems.forEach(item => {
    const key = (item.date || '').slice(0, 7);
    if (map[key]) {
      if (item.published) map[key].published++;
      else map[key].pending++;
    }
  });
  return buckets;
}

// ── Mini sparkline (inline, non-interactive) ─────────────────────────────────
const MiniSparkline = memo(({ calendars }) => {
  const data = useMemo(() => buildTrend(calendars, 6), [calendars]);
  const hasData = data.some(d => d.published > 0 || d.pending > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-10 w-24">
        <TrendingUp className="h-4 w-4 text-gray-300" />
      </div>
    );
  }

  return (
    <div className="h-10 w-24 pointer-events-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            <linearGradient id="sGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="published"
            stroke="#10b981"
            strokeWidth={1.5}
            fill="url(#sGreen)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
});
MiniSparkline.displayName = 'MiniSparkline';

// ── Expanded trend chart ─────────────────────────────────────────────────────
const RANGE_OPTIONS = [
  { label: '1M', months: 1 },
  { label: '3M', months: 3 },
  { label: '6M', months: 6 },
  { label: '1Y', months: 12 },
  { label: 'All', months: 24 },
];

const ExpandedTrend = memo(({ calendars, onClose }) => {
  const [range, setRange] = useState(6);
  const data = useMemo(() => buildTrend(calendars, range), [calendars, range]);

  return (
    <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/60">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-700">Publishing Trend</span>
        <div className="flex items-center gap-1">
          {RANGE_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={e => { e.stopPropagation(); setRange(opt.months); }}
              className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors ${
                range === opt.months
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-500 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={e => { e.stopPropagation(); onClose(); }}
            className="ml-1 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="exGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="exAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}
              formatter={(value, name) => [value, name === 'published' ? 'Published' : 'Pending']}
            />
            <Area type="monotone" dataKey="published" stroke="#10b981" strokeWidth={2} fill="url(#exGreen)" dot={false} activeDot={{ r: 4 }} />
            <Area type="monotone" dataKey="pending"   stroke="#f59e0b" strokeWidth={2} fill="url(#exAmber)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 bg-emerald-500 rounded-full" />
          <span className="text-xs text-gray-500">Published</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-1.5 bg-amber-500 rounded-full" />
          <span className="text-xs text-gray-500">Pending</span>
        </div>
      </div>
    </div>
  );
});
ExpandedTrend.displayName = 'ExpandedTrend';

// ── Stat chip (desktop) ──────────────────────────────────────────────────────
const StatChip = memo(({ icon: Icon, value, label, iconCls, valueCls }) => (
  <div className="flex flex-col items-center min-w-[52px]">
    <div className="flex items-center gap-1">
      <Icon className={`h-3.5 w-3.5 ${iconCls}`} />
      <span className={`text-sm font-bold tabular-nums ${valueCls}`}>{value}</span>
    </div>
    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wide leading-none mt-0.5">{label}</span>
  </div>
));
StatChip.displayName = 'StatChip';

// ── Stat pill (mobile) ───────────────────────────────────────────────────────
const StatPill = memo(({ icon: Icon, value, label, cls }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
    <Icon className="h-3 w-3" />
    {value} {label}
  </span>
));
StatPill.displayName = 'StatPill';

// ── Customer row ─────────────────────────────────────────────────────────────
const CustomerRow = memo(({
  customer, stats, platforms, calendars,
  onView, isExpanded, onToggleTrend,
}) => {
  const initial = (customer.name || 'U').charAt(0).toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:border-gray-200 transition-colors">
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <div
          onClick={() => onView(customer._id)}
          className="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer"
        >
          <span className="text-white font-bold text-sm">{initial}</span>
        </div>

        {/* Name / email / platforms */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onView(customer._id)}
        >
          <p className="text-sm font-semibold text-gray-900 truncate leading-tight">
            {customer.name || 'Unnamed Customer'}
          </p>
          <p className="text-xs text-gray-500 truncate">{customer.email}</p>
          {platforms.length > 0 && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {platforms.map(p => <SocialBadge key={p} platform={p} />)}
            </div>
          )}
        </div>

        {/* Stats – desktop */}
        <div className="hidden md:flex items-center gap-4 flex-shrink-0 border-l border-gray-100 pl-4 mr-2">
          <StatChip icon={Calendar}     value={stats.calendars} label="Calendars" iconCls="text-blue-500"    valueCls="text-blue-700"    />
          <StatChip icon={FileText}     value={stats.total}     label="Items"     iconCls="text-gray-500"    valueCls="text-gray-700"    />
          <StatChip icon={CheckCircle}  value={stats.published} label="Published" iconCls="text-emerald-500" valueCls="text-emerald-700" />
          <StatChip icon={Clock}        value={stats.pending}   label="Pending"   iconCls="text-amber-500"   valueCls="text-amber-700"   />
        </div>

        {/* Mini sparkline – clickable */}
        <div
          className="flex-shrink-0 cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => onToggleTrend(customer._id)}
          title="Click to expand trend chart"
        >
          <MiniSparkline calendars={calendars} />
        </div>

        {/* Arrow to details */}
        <button
          onClick={() => onView(customer._id)}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Stats – mobile */}
      <div className="md:hidden px-4 pb-3 flex items-center gap-1.5 flex-wrap">
        <StatPill icon={Calendar}    value={stats.calendars} label="Cal"     cls="bg-blue-50 text-blue-700"    />
        <StatPill icon={FileText}    value={stats.total}     label="Items"   cls="bg-gray-100 text-gray-700"   />
        <StatPill icon={CheckCircle} value={stats.published} label="Done"    cls="bg-emerald-50 text-emerald-700" />
        <StatPill icon={Clock}       value={stats.pending}   label="Pending" cls="bg-amber-50 text-amber-700"  />
      </div>

      {/* Expanded trend */}
      {isExpanded && (
        <ExpandedTrend
          calendars={calendars}
          onClose={() => onToggleTrend(customer._id)}
        />
      )}
    </div>
  );
});
CustomerRow.displayName = 'CustomerRow';

// ── Main component ───────────────────────────────────────────────────────────
function CustomersList() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrichLoading, setEnrichLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  // enrichment: { [customerId]: { platforms: string[], calendars: object[] } }
  const [enrichment, setEnrichment] = useState({});
  const [expandedTrend, setExpandedTrend] = useState(null); // customerId or null
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      loadAll();
    }
  }, [currentUser]);

  const loadAll = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      setError('Admin authentication required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Fetch customers, all calendars, and scheduled posts in parallel
      const adminId = currentUser._id || currentUser.id;
      const [customersRes, calendarsRes, scheduledPostsRes] = await Promise.all([
        fetch(`${API_URL}/admin/assigned-customers?adminId=${adminId}`),
        fetch(`${API_URL}/calendars`),
        fetch(`${API_URL}/api/scheduled-posts`),
      ]);

      let customerList = [];
      if (customersRes.ok) {
        customerList = await customersRes.json() || [];
      } else if (customersRes.status === 404) {
        customerList = [];
      } else {
        throw new Error(`Failed to fetch customers: ${customersRes.status}`);
      }

      let allCalendars = [];
      if (calendarsRes.ok) {
        allCalendars = await calendarsRes.json() || [];
      }

      let scheduledPosts = [];
      if (scheduledPostsRes.ok) {
        const spData = await scheduledPostsRes.json();
        scheduledPosts = Array.isArray(spData) ? spData : [];
      }

      setCustomers(customerList);

      // Build enrichment: calendars per customer
      const calendarsByCustomer = {};
      allCalendars.forEach(cal => {
        if (!calendarsByCustomer[cal.customerId]) calendarsByCustomer[cal.customerId] = [];
        calendarsByCustomer[cal.customerId].push(cal);
      });

      // Build enrichment per customer (derived entirely from calendar data)
      const enrichMap = {};
      customerList.forEach((c) => {
        const calendars = calendarsByCustomer[c._id] || [];
        const isItemPublished = (item) => {
          if (item.published === true) return true;
          return scheduledPosts.some(post =>
            ((post.item_id && post.item_id === item.id) ||
             (post.contentId && post.contentId === item.id) ||
             (post.item_name && post.item_name === (item.title || item.description))) &&
            (post.status === 'published' || post.publishedAt)
          );
        };
        // Normalize calendars: stamp published=true on items covered by scheduled posts
        // so buildTrend (which reads item.published) gets accurate data
        const normalizedCalendars = calendars.map(cal => ({
          ...cal,
          contentItems: (cal.contentItems || []).map(item => ({
            ...item,
            published: isItemPublished(item),
          })),
        }));
        // Derive platform badges from content item types — not from OAuth accounts.
        // This means customers with no calendars / no content items show no badges,
        // and the badges accurately reflect which platforms content is being created for.
        const platforms = [...new Set(
          normalizedCalendars.flatMap(cal =>
            (cal.contentItems || []).flatMap(item => {
              if (!item.type) return [];
              if (Array.isArray(item.type)) return item.type.map(p => String(p).toLowerCase().trim()).filter(Boolean);
              return String(item.type).split(',').map(p => p.toLowerCase().trim()).filter(Boolean);
            })
          )
        )];
        const allItems = normalizedCalendars.flatMap(cal => cal.contentItems || []);
        const published = allItems.filter(item => item.published).length;
        enrichMap[c._id] = {
          platforms,
          calendars: normalizedCalendars,
          stats: {
            calendars: normalizedCalendars.length,
            total: allItems.length,
            published,
            pending: allItems.length - published,
          },
        };
      });

      setEnrichment(enrichMap);
    } catch (err) {
      console.error('Error loading customers:', err);
      setError('Failed to load customers. Please contact the Super Admin if you need customers assigned.');

      // Fallback
      try {
        const fallback = await fetch(`${API_URL}/customers`);
        if (fallback.ok) {
          const data = await fallback.json();
          setCustomers(data || []);
          setError('Showing all customers (assignment system unavailable)');
        }
      } catch {
        // ignore
      }
    } finally {
      setLoading(false);
      setEnrichLoading(false);
    }
  };

  const handleViewCustomer = useCallback((id) => {
    navigate(`/admin/customer-details/${id}`);
  }, [navigate]);

  const handleToggleTrend = useCallback((customerId) => {
    setExpandedTrend(prev => prev === customerId ? null : customerId);
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return customers;
    return customers.filter(c =>
      c.name?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  }, [customers, searchTerm]);

  const EMPTY_STATS = { calendars: 0, total: 0, published: 0, pending: 0 };

  if (loading) {
    return (
      <AdminLayout title="Customers">
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2" />
            <p className="text-gray-500 text-sm">Loading…</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Customers">
      <div className="space-y-3 sm:space-y-4">

        {/* Header + Search */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          <div className="flex items-center mb-3">
            <button
              onClick={() => navigate('/admin')}
              className="mr-2 p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Customers</h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                Customers assigned by Super Admin
              </p>
            </div>
            <span className="text-xs sm:text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
              {filteredCustomers.length}
            </span>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search customers…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 w-full bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`border px-3 py-2 rounded-lg flex items-center text-sm ${
            error.includes('unavailable')
              ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Customer rows */}
        {filteredCustomers.length > 0 ? (
          <div className="space-y-2 sm:space-y-3">
            {filteredCustomers.map(customer => {
              const data = enrichment[customer._id];
              return (
                <CustomerRow
                  key={customer._id}
                  customer={customer}
                  stats={data?.stats || EMPTY_STATS}
                  platforms={data?.platforms || []}
                  calendars={data?.calendars || []}
                  onView={handleViewCustomer}
                  isExpanded={expandedTrend === customer._id}
                  onToggleTrend={handleToggleTrend}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-white/80 rounded-xl p-6 text-center border border-gray-200/50">
            <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {searchTerm ? 'No matches found' : 'No customers assigned'}
            </h3>
            <p className="text-xs text-gray-500">
              {searchTerm ? 'Try a different search term' : 'Contact Super Admin for assignments'}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default memo(CustomersList);