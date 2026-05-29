import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, BarChart3, RefreshCw, CheckCircle, AlertCircle,
  X, Crown, Mail, User, AlertTriangle, Search,
  UserCheck, ArrowRight, Filter, ChevronDown, Power, TrendingUp
} from 'lucide-react';
import SuperAdminLayout from './SuperAdminLayout';

/* ─────────────────────────────────────────────
   Dashboard-scoped styles
───────────────────────────────────────────── */
const STYLES = `
  /* ── Dashboard vars ── */
  :root {
    --d-bg:        #f0f2f8;
    --d-surface:   #ffffff;
    --d-border:    #e2e8f0;
    --d-text:      #0f172a;
    --d-muted:     #64748b;
    --d-accent:    #6366f1;
    --d-accent-lt: #eef2ff;
    --d-accent-dk: #4f46e5;
    --d-danger:    #ef4444;
    --d-success:   #10b981;
    --d-warn:      #f59e0b;
    --d-radius:    14px;
    --d-shadow-sm: 0 1px 3px rgba(0,0,0,.05), 0 0 0 1px rgba(0,0,0,.03);
    --d-shadow-md: 0 4px 14px rgba(0,0,0,.09);
    --d-shadow-lg: 0 10px 32px rgba(0,0,0,.12);
  }

  /* ── Buttons ── */
  .d-btn {
    display: inline-flex; align-items: center; gap: 7px;
    font-family: 'Inter', 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
    border: none; cursor: pointer; border-radius: 9px;
    padding: 9px 18px; transition: all .15s ease;
    white-space: nowrap; letter-spacing: -0.1px;
  }
  .d-btn:disabled { opacity: .45; cursor: not-allowed; }
  .d-btn-ghost {
    background: var(--d-surface); color: var(--d-muted);
    border: 1.5px solid var(--d-border);
  }
  .d-btn-ghost:hover:not(:disabled) { background: var(--d-bg); color: var(--d-text); border-color: #c4cdd8; }
  .d-btn-primary {
    background: linear-gradient(135deg, var(--d-accent), var(--d-accent-dk));
    color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.35);
  }
  .d-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #5254cc, var(--d-accent-dk)); box-shadow: 0 4px 14px rgba(99,102,241,0.5); transform: translateY(-1px); }
  .d-btn-danger { background: linear-gradient(135deg, #f87171, var(--d-danger)); color: #fff; }
  .d-btn-danger:hover:not(:disabled) { background: linear-gradient(135deg, #ef4444, #b91c1c); }
  .d-btn-lg { padding: 12px 26px; font-size: 14px; border-radius: 11px; }
  .d-btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 7px; }

  /* ── Stats grid ── */
  .d-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }

  .d-stat {
    border-radius: var(--d-radius); padding: 22px 22px 20px;
    box-shadow: var(--d-shadow-sm);
    transition: transform .18s, box-shadow .18s;
    overflow: hidden; position: relative; cursor: default;
  }
  .d-stat.clickable { cursor: pointer; }
  .d-stat.clickable:hover { transform: translateY(-3px); box-shadow: var(--d-shadow-md); }

  .d-stat-indigo { background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: #fff; }
  .d-stat-violet { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: #fff; }
  .d-stat-emerald{ background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #fff; }
  .d-stat-amber  { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #fff; }

  .d-stat-icon {
    width: 42px; height: 42px; border-radius: 10px;
    background: rgba(255,255,255,0.2);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 16px;
    backdrop-filter: blur(4px);
  }
  .d-stat-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .d-stat-arrow { opacity: 0; transition: opacity .15s, transform .15s; }
  .d-stat.clickable:hover .d-stat-arrow { opacity: 0.8; transform: translateX(4px); }
  .d-stat-val { font-size: 30px; font-weight: 800; letter-spacing: -1px; color: #fff; line-height: 1; }
  .d-stat-lbl { font-size: 12.5px; font-weight: 600; color: rgba(255,255,255,0.75); margin-top: 4px; text-transform: uppercase; letter-spacing: 0.4px; }
  .d-stat-sub { font-size: 11.5px; color: rgba(255,255,255,0.55); margin-top: 8px; }
  .d-stat-bg-icon {
    position: absolute; right: -6px; bottom: -10px;
    opacity: 0.07;
  }

  /* ── Section title ── */
  .d-section-title {
    font-size: 11.5px; font-weight: 700; color: var(--d-muted);
    letter-spacing: 1px; text-transform: uppercase;
    margin-bottom: 14px; display: flex; align-items: center; gap: 8px;
  }
  .d-section-title::after {
    content: ''; flex: 1; height: 1px; background: var(--d-border);
  }

  /* ── Card ── */
  .d-card {
    background: var(--d-surface); border: 1px solid var(--d-border);
    border-radius: var(--d-radius); box-shadow: var(--d-shadow-sm);
    overflow: hidden;
  }
  .d-card-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--d-border);
    display: flex; align-items: center; justify-content: space-between;
    background: linear-gradient(to bottom, #fcfdff, var(--d-surface));
  }
  .d-card-title { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; color: var(--d-text); }
  .d-card-body { padding: 20px; }

  /* ── Two-col grid ── */
  .d-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 18px; }

  /* ── Select ── */
  .d-select-wrap { position: relative; }
  .d-select-wrap select {
    width: 100%; padding: 11px 40px 11px 14px;
    border: 1.5px solid var(--d-border); border-radius: 9px;
    font-family: 'Inter', 'DM Sans', sans-serif;
    font-size: 13.5px; font-weight: 500; color: var(--d-text);
    background: var(--d-bg); appearance: none; cursor: pointer;
    transition: border-color .15s, box-shadow .15s;
  }
  .d-select-wrap select:focus { outline: none; border-color: var(--d-accent); box-shadow: 0 0 0 3px rgba(99,102,241,0.12); background: #fff; }
  .d-select-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--d-muted); pointer-events: none; }

  /* ── Admin preview ── */
  .d-admin-preview {
    margin-top: 14px; padding: 14px 16px;
    border: 1.5px solid var(--d-border); border-radius: 11px;
    background: linear-gradient(135deg, #f8f9ff, var(--d-bg));
    display: flex; align-items: center; gap: 12px;
  }
  .d-avatar {
    width: 40px; height: 40px; border-radius: 9px;
    background: linear-gradient(135deg, var(--d-accent), var(--d-accent-dk));
    color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px; flex-shrink: 0;
    box-shadow: 0 2px 8px rgba(99,102,241,0.3);
  }
  .d-avatar-name { font-size: 13.5px; font-weight: 700; color: var(--d-text); }
  .d-avatar-email { font-size: 11.5px; color: var(--d-muted); display: flex; align-items: center; gap: 4px; margin-top: 3px; }

  /* ── Badge ── */
  .d-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600; padding: 3px 9px;
    border-radius: 999px;
  }
  .d-badge-indigo { background: var(--d-accent-lt); color: var(--d-accent); border: 1px solid rgba(99,102,241,0.2); }
  .d-badge-green  { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
  .d-badge-slate  { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
  .d-badge-red    { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }
  .d-badge-amber  { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

  /* ── Search ── */
  .d-search { position: relative; }
  .d-search input {
    width: 100%; padding: 10px 14px 10px 38px;
    border: 1.5px solid var(--d-border); border-radius: 9px;
    font-family: 'Inter', 'DM Sans', sans-serif; font-size: 13px;
    background: var(--d-bg); color: var(--d-text);
    transition: border-color .15s, box-shadow .15s;
  }
  .d-search input:focus { outline: none; border-color: var(--d-accent); background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .d-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--d-muted); }

  /* ── Customer list ── */
  .d-cust-scroll { max-height: 340px; overflow-y: auto; }
  .d-cust-scroll::-webkit-scrollbar { width: 4px; }
  .d-cust-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  .d-cust-item {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 11px 18px; border-bottom: 1px solid var(--d-border);
    cursor: pointer; transition: background .1s;
  }
  .d-cust-item:last-child { border-bottom: none; }
  .d-cust-item:hover { background: #f8f9ff; }
  .d-cust-item.selected { background: #eef2ff; }
  .d-cust-item.inactive { opacity: .6; }
  .d-cust-item input[type=checkbox] {
    width: 15px; height: 15px; accent-color: var(--d-accent);
    flex-shrink: 0; margin-top: 4px; cursor: pointer;
  }
  .d-cust-name { font-size: 13px; font-weight: 600; color: var(--d-text); }
  .d-cust-email { font-size: 11.5px; color: var(--d-muted); display: flex; align-items: center; gap: 4px; margin-top: 2px; }
  .d-cust-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }

  .d-toggle-active   { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
  .d-toggle-active:hover:not(:disabled)   { background: #d1fae5; }
  .d-toggle-inactive { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
  .d-toggle-inactive:hover:not(:disabled) { background: #fee2e2; }

  /* ── Summary bar ── */
  .d-summary {
    background: var(--d-surface); border: 1px solid var(--d-border);
    border-radius: var(--d-radius); box-shadow: var(--d-shadow-sm);
    padding: 18px 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 20px;
  }
  .d-summary-info { font-size: 13.5px; color: var(--d-muted); line-height: 1.5; }
  .d-summary-info strong { color: var(--d-text); font-weight: 700; }

  .d-note {
    margin-top: 12px; padding: 12px 16px;
    background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px;
    font-size: 12.5px; color: #92400e;
    display: flex; align-items: flex-start; gap: 8px;
  }

  /* ── Toast ── */
  .d-toast {
    position: fixed; top: 84px; right: 24px;
    display: flex; align-items: center; gap: 10px;
    padding: 13px 18px; border-radius: 12px;
    font-size: 13px; font-weight: 500;
    box-shadow: var(--d-shadow-lg); z-index: 999;
    animation: d-toast-in .22s ease;
    max-width: 380px; backdrop-filter: blur(8px);
  }
  .d-toast.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
  .d-toast.error   { background: #fef2f2; border: 1px solid #fca5a5; color: #7f1d1d; }
  .d-toast.info    { background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; }
  @keyframes d-toast-in { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }

  /* ── Modal ── */
  .d-overlay {
    position: fixed; inset: 0; background: rgba(15,17,23,.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; animation: d-fade-in .15s ease;
    backdrop-filter: blur(4px);
  }
  @keyframes d-fade-in { from { opacity: 0; } to { opacity: 1; } }
  .d-modal {
    background: var(--d-surface); border-radius: 16px;
    padding: 28px; max-width: 420px; width: 90%;
    box-shadow: var(--d-shadow-lg); border: 1px solid var(--d-border);
  }
  .d-modal-title { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 9px; margin-bottom: 10px; color: var(--d-text); }
  .d-modal-body  { font-size: 13.5px; color: var(--d-muted); line-height: 1.6; margin-bottom: 22px; }
  .d-modal-actions { display: flex; gap: 10px; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .d-stats { grid-template-columns: repeat(2, 1fr); }
    .d-cols  { grid-template-columns: 1fr; }
  }
  @media (max-width: 560px) {
    .d-stats { grid-template-columns: 1fr 1fr; }
    .d-summary { flex-direction: column; align-items: flex-start; }
  }
`;

/* ─────────────────────────────────────────────
   API Service
───────────────────────────────────────────── */
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('superadminToken')}`
});

const handleResponse = async (response) => {
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Invalid server response'); }
  if (!response.ok) throw new Error(data.error || data.message || `Error ${response.status}`);
  return data;
};

const apiService = {
  getCustomers: () => fetch(`${API_BASE_URL}/customers`).then(handleResponse),
  getAdmins: () => fetch(`${API_BASE_URL}/users?role=admin`).then(handleResponse),
  assignCustomers: (adminId, customerIds) =>
    fetch(`${API_BASE_URL}/superadmin/assign-customers`, {
      method: 'POST', headers: getAuthHeaders(),
      body: JSON.stringify({ adminId, customerIds })
    }).then(handleResponse),
  setCustomerStatus: (customerId, isActive) =>
    fetch(`${API_BASE_URL}/api/customers/${customerId}/status`, {
      method: 'PUT', headers: getAuthHeaders(),
      body: JSON.stringify({ isActive })
    }).then(handleResponse)
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const initials = (name, email) => {
  const src = name || email || '?';
  return src.slice(0, 2).toUpperCase();
};

const StatCard = ({ gradient, icon: Icon, bgIcon: BgIcon, value, label, sub, clickable, onClick }) => (
  <div className={`d-stat d-stat-${gradient}${clickable ? ' clickable' : ''}`} onClick={onClick} role={clickable ? 'button' : undefined} tabIndex={clickable ? 0 : undefined}>
    <div className="d-stat-top">
      <div className="d-stat-icon"><Icon size={20} color="rgba(255,255,255,0.9)" /></div>
      {clickable && <ArrowRight size={16} className="d-stat-arrow" color="rgba(255,255,255,0.8)" />}
    </div>
    <div className="d-stat-val">{value}</div>
    <div className="d-stat-lbl">{label}</div>
    {sub && <div className="d-stat-sub">{sub}</div>}
    {BgIcon && <BgIcon size={80} className="d-stat-bg-icon" color="#fff" />}
  </div>
);

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
const SuperAdminDashboard = () => {
  const [customers, setCustomers]           = useState([]);
  const [admins, setAdmins]                 = useState([]);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedAdmin, setSelectedAdmin]   = useState('');
  const [loading, setLoading]               = useState(false);
  const [refreshing, setRefreshing]         = useState(false);
  const [notification, setNotification]     = useState(null);
  const [searchTerm, setSearchTerm]         = useState('');
  const [removeConfirm, setRemoveConfirm]   = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(null);
  const navigate = useNavigate();

  // Inject dashboard styles once
  useEffect(() => {
    const id = 'sa-dashboard-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = STYLES;
      document.head.appendChild(el);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, []);

  const loadInitialData = async () => {
    setRefreshing(true);
    try { await Promise.all([fetchCustomers(), fetchAdmins()]); }
    finally { setRefreshing(false); }
  };

  const fetchCustomers = async () => {
    try { setCustomers(await apiService.getCustomers()); }
    catch { showNotification('Failed to fetch customers', 'error'); }
  };

  const fetchAdmins = async () => {
    try { setAdmins(await apiService.getAdmins()); }
    catch { showNotification('Failed to fetch admins', 'error'); }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const toggleCustomer = (id) =>
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );

  const getAdminsForCustomer = (customerId) =>
    admins.filter(a => (a.assignedCustomers || []).includes(customerId));

  const handleToggleStatus = async (e, customer) => {
    e.stopPropagation();
    const newStatus = !customer.isActive;
    setStatusUpdating(customer._id);
    try {
      await apiService.setCustomerStatus(customer._id, newStatus);
      setCustomers(prev =>
        prev.map(c => c._id === customer._id ? { ...c, isActive: newStatus } : c)
      );
      showNotification(
        newStatus
          ? `${customer.name || customer.email} has been activated.`
          : `${customer.name || customer.email} has been deactivated.`,
        newStatus ? 'success' : 'error'
      );
    } catch (err) {
      showNotification(`Failed to update status: ${err.message}`, 'error');
    } finally {
      setStatusUpdating(null);
    }
  };

  const filteredCustomers = customers.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0)
      setSelectedCustomers([]);
    else
      setSelectedCustomers(filteredCustomers.map(c => c._id));
  };

  const handleAssignment = async () => {
    if (!selectedAdmin || selectedCustomers.length === 0) {
      showNotification('Select an admin and at least one customer', 'error'); return;
    }
    setLoading(true);
    try {
      await apiService.assignCustomers(selectedAdmin, selectedCustomers);
      const already = selectedCustomers.filter(cId =>
        getAdminsForCustomer(cId).some(a => a._id === selectedAdmin)
      ).length;
      const fresh = selectedCustomers.length - already;
      const msg = fresh > 0
        ? `${fresh} customer${fresh !== 1 ? 's' : ''} assigned successfully.${already ? ` ${already} already assigned.` : ''}`
        : `All selected customers already assigned to this admin.`;
      showNotification(msg, 'success');
      await Promise.all([fetchCustomers(), fetchAdmins()]);
      setSelectedCustomers([]);
    } catch (e) {
      showNotification(e.message || 'Assignment failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedAdminObj = admins.find(a => a._id === selectedAdmin);
  const totalAssigned = admins.reduce((n, a) => n + (a.assignedCustomers?.length || 0), 0);
  const activeCount = customers.filter(c => c.isActive !== false).length;
  const inactiveCount = customers.filter(c => c.isActive === false).length;
  const assignmentRate = customers.length > 0
    ? Math.round((customers.filter(c => getAdminsForCustomer(c._id).length > 0).length / customers.length) * 100)
    : 0;

  const topbarRight = (
    <button
      className="d-btn d-btn-ghost"
      onClick={loadInitialData}
      disabled={refreshing}
    >
      <RefreshCw size={14} style={refreshing ? { animation: 'spin 1s linear infinite' } : {}} />
      {refreshing ? 'Refreshing…' : 'Refresh'}
    </button>
  );

  return (
    <SuperAdminLayout
      title="Dashboard"
      subtitle="Customer assignment &amp; management overview"
      topbarRight={topbarRight}
    >
      {/* ── Toast ── */}
      {notification && (
        <div className={`d-toast ${notification.type}`}>
          {notification.type === 'success' && <CheckCircle size={15} />}
          {notification.type === 'error'   && <AlertCircle size={15} />}
          {notification.type === 'info'    && <AlertCircle size={15} />}
          <span>{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: .7 }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {removeConfirm && (
        <div className="d-overlay">
          <div className="d-modal">
            <div className="d-modal-title">
              <AlertTriangle size={18} style={{ color: 'var(--d-danger)' }} />
              Remove Assignment
            </div>
            <div className="d-modal-body">
              Are you sure you want to remove this customer assignment? This cannot be undone.
            </div>
            <div className="d-modal-actions">
              <button className="d-btn d-btn-danger" onClick={() => setRemoveConfirm(null)} disabled={loading}>
                {loading ? 'Removing…' : 'Remove'}
              </button>
              <button className="d-btn d-btn-ghost" onClick={() => setRemoveConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stat Row ── */}
      <div className="d-stats">
        <StatCard
          gradient="indigo" icon={Users} bgIcon={Users}
          value={customers.length} label="Total Customers"
          sub={`${activeCount} active · ${inactiveCount} inactive`}
        />
        <StatCard
          gradient="violet" icon={Crown} bgIcon={Crown}
          value={admins.length} label="Active Admins"
          sub="Managing customer accounts"
        />
        <StatCard
          gradient="emerald" icon={BarChart3} bgIcon={BarChart3}
          value={totalAssigned} label="Total Assignments"
          sub="View analytics →"
          clickable onClick={() => navigate('/superadmin/analytics')}
        />
        <StatCard
          gradient="amber" icon={TrendingUp} bgIcon={TrendingUp}
          value={customers.length > 0 ? `${assignmentRate}%` : '—'}
          label="Assignment Rate"
          sub="View all assignments →"
          clickable onClick={() => navigate('/superadmin/view-assignments')}
        />
      </div>

      {/* ── Assignment Section ── */}
      <div className="d-section-title">New Assignment</div>

      <div className="d-cols">
        {/* Admin Selection */}
        <div className="d-card">
          <div className="d-card-header">
            <span className="d-card-title">
              <Crown size={15} style={{ color: 'var(--d-accent)' }} />
              Select Admin
            </span>
            {selectedAdminObj && (
              <span className="d-badge d-badge-indigo">
                <Users size={10} />
                {(selectedAdminObj.assignedCustomers || []).length} assigned
              </span>
            )}
          </div>
          <div className="d-card-body">
            <div className="d-select-wrap">
              <select value={selectedAdmin} onChange={e => setSelectedAdmin(e.target.value)}>
                <option value="">Choose an admin…</option>
                {admins.map(a => (
                  <option key={a._id} value={a._id}>
                    {a.name || a.email?.split('@')[0]} — {a.email}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} className="d-select-chevron" />
            </div>

            {selectedAdminObj ? (
              <div className="d-admin-preview">
                <div className="d-avatar">{initials(selectedAdminObj.name, selectedAdminObj.email)}</div>
                <div>
                  <div className="d-avatar-name">
                    {selectedAdminObj.name || selectedAdminObj.email?.split('@')[0]}
                  </div>
                  <div className="d-avatar-email">
                    <Mail size={11} />
                    {selectedAdminObj.email}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8f9ff', borderRadius: 10, border: '1px dashed #c7d2fe', fontSize: 12.5, color: 'var(--d-muted)', lineHeight: 1.6 }}>
                Select an admin from the dropdown to view their profile and current assignment count.
              </div>
            )}
          </div>
        </div>

        {/* Customer Selection */}
        <div className="d-card">
          <div className="d-card-header">
            <span className="d-card-title">
              <Users size={15} style={{ color: 'var(--d-accent)' }} />
              Select Customers
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {selectedCustomers.length > 0 && (
                <span className="d-badge d-badge-indigo">
                  <UserCheck size={10} />
                  {selectedCustomers.length} selected
                </span>
              )}
              <button
                className="d-btn d-btn-ghost d-btn-sm"
                onClick={handleSelectAll}
              >
                <Filter size={11} />
                {selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0
                  ? 'Deselect all' : 'Select all'}
              </button>
            </div>
          </div>

          {/* Search */}
          <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--d-border)' }}>
            <div className="d-search">
              <Search size={14} className="d-search-icon" />
              <input
                type="text"
                placeholder="Search by name or email…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* List */}
          <div className="d-cust-scroll">
            {filteredCustomers.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--d-muted)', fontSize: 13 }}>
                <User size={32} style={{ margin: '0 auto 8px', opacity: .3, display: 'block' }} />
                No customers found
              </div>
            ) : (
              filteredCustomers.map(customer => {
                const assigned = getAdminsForCustomer(customer._id);
                const alreadyThis = assigned.some(a => a._id === selectedAdmin);
                const isSelected = selectedCustomers.includes(customer._id);

                return (
                  <div
                    key={customer._id}
                    className={`d-cust-item${isSelected ? ' selected' : ''}${customer.isActive === false ? ' inactive' : ''}`}
                    onClick={() => toggleCustomer(customer._id)}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleCustomer(customer._id)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div className="d-cust-name">{customer.name}</div>
                        {customer.isActive === false && (
                          <span className="d-badge d-badge-red" style={{ fontSize: 10 }}>Inactive</span>
                        )}
                      </div>
                      <div className="d-cust-email">
                        <Mail size={10} />
                        {customer.email}
                      </div>
                      {assigned.length > 0 && (
                        <div className="d-cust-tags">
                          {assigned.map(a => (
                            <span
                              key={a._id}
                              className={`d-badge ${a._id === selectedAdmin ? 'd-badge-green' : 'd-badge-slate'}`}
                            >
                              <Crown size={9} />
                              {a.name || a.email?.split('@')[0]}
                            </span>
                          ))}
                        </div>
                      )}
                      {alreadyThis && selectedAdmin && (
                        <div style={{ marginTop: 5 }}>
                          <span className="d-badge d-badge-green" style={{ fontSize: 10.5 }}>
                            <UserCheck size={9} /> Already assigned
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      className={`d-btn d-btn-sm ${customer.isActive === false ? 'd-toggle-active' : 'd-toggle-inactive'}`}
                      style={{ flexShrink: 0 }}
                      disabled={statusUpdating === customer._id}
                      onClick={e => handleToggleStatus(e, customer)}
                      title={customer.isActive === false ? 'Activate account' : 'Deactivate account'}
                    >
                      <Power size={11} />
                      {statusUpdating === customer._id
                        ? '…'
                        : customer.isActive === false ? 'Activate' : 'Deactivate'
                      }
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Summary / Action Bar ── */}
      <div className="d-summary">
        <div className="d-summary-info">
          {selectedAdmin && selectedCustomers.length > 0 ? (
            <>
              Assigning <strong>{selectedCustomers.length} customer{selectedCustomers.length !== 1 ? 's' : ''}</strong> to{' '}
              <strong>{selectedAdminObj?.name || selectedAdminObj?.email?.split('@')[0] || 'selected admin'}</strong>
            </>
          ) : (
            'Select an admin and one or more customers to create an assignment.'
          )}
        </div>
        <button
          className="d-btn d-btn-primary d-btn-lg"
          onClick={handleAssignment}
          disabled={loading || !selectedAdmin || selectedCustomers.length === 0}
        >
          {loading
            ? <><RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Assigning…</>
            : <><UserPlus size={15} /> Assign Now <ArrowRight size={14} /></>
          }
        </button>
      </div>

      {/* Multi-admin note */}
      <div className="d-note">
        <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          <strong>Multi-admin support:</strong> Customers can be assigned to multiple admins simultaneously.
          Existing assignments are preserved when creating new ones.
        </span>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;