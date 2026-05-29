import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, UserPlus, BarChart3, RefreshCw, CheckCircle, AlertCircle,
  X, Crown, Mail, User, AlertTriangle, Search, UserMinus, Shield,
  UserCheck, ArrowRight, Filter, ChevronDown, Power
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Global styles injected once
───────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #f4f5f7;
    --surface:   #ffffff;
    --border:    #e2e4e9;
    --text:      #0f1117;
    --muted:     #6b7280;
    --accent:    #1a56db;
    --accent-lt: #eff4ff;
    --accent-dk: #1240a8;
    --danger:    #dc2626;
    --success:   #059669;
    --warn:      #d97706;
    --header-h:  72px;
    --radius:    12px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
    --shadow-md: 0 4px 12px rgba(0,0,0,.08);
    --shadow-lg: 0 8px 28px rgba(0,0,0,.10);
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); }

  .sa-shell { min-height: 100vh; display: flex; flex-direction: column; }

  /* ── Header ── */
  .sa-header {
    height: var(--header-h);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center;
    padding: 0 32px;
    justify-content: space-between;
    position: sticky; top: 0; z-index: 100;
    box-shadow: var(--shadow-sm);
  }
  .sa-header-brand { display: flex; align-items: center; gap: 12px; }
  .sa-header-icon {
    width: 36px; height: 36px;
    background: var(--accent);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .sa-header-title { font-size: 17px; font-weight: 700; letter-spacing: -.3px; }
  .sa-header-sub { font-size: 12px; color: var(--muted); margin-top: 1px; }
  .sa-header-actions { display: flex; align-items: center; gap: 10px; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; gap: 7px;
    font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 600;
    border: none; cursor: pointer; border-radius: 8px;
    padding: 8px 16px; transition: all .15s ease;
    white-space: nowrap;
  }
  .btn:disabled { opacity: .45; cursor: not-allowed; }
  .btn-ghost {
    background: transparent; color: var(--muted);
    border: 1px solid var(--border);
  }
  .btn-ghost:hover:not(:disabled) { background: var(--bg); color: var(--text); border-color: #c4c8d2; }
  .btn-primary {
    background: var(--accent); color: #fff;
  }
  .btn-primary:hover:not(:disabled) { background: var(--accent-dk); }
  .btn-danger { background: var(--danger); color: #fff; }
  .btn-danger:hover:not(:disabled) { background: #b91c1c; }
  .btn-lg { padding: 11px 24px; font-size: 14.5px; border-radius: 10px; }

  /* ── Body layout ── */
  .sa-body { flex: 1; padding: 28px 32px; max-width: 1280px; margin: 0 auto; width: 100%; }

  /* ── Stat cards ── */
  .sa-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 20px 22px;
    box-shadow: var(--shadow-sm); cursor: default;
    transition: box-shadow .15s, transform .15s;
  }
  .stat-card.clickable { cursor: pointer; }
  .stat-card.clickable:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
  .stat-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .stat-icon {
    width: 38px; height: 38px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
  }
  .stat-icon.blue   { background: #eff4ff; color: var(--accent); }
  .stat-icon.slate  { background: #f1f2f4; color: #4b5563; }
  .stat-icon.green  { background: #ecfdf5; color: var(--success); }
  .stat-icon.amber  { background: #fffbeb; color: var(--warn); }
  .stat-arrow { color: var(--muted); opacity: 0; transition: opacity .15s, transform .15s; }
  .stat-card.clickable:hover .stat-arrow { opacity: 1; transform: translateX(3px); }
  .stat-value { font-size: 28px; font-weight: 700; letter-spacing: -.5px; }
  .stat-label { font-size: 12.5px; color: var(--muted); font-weight: 500; margin-top: 2px; }
  .stat-sub { font-size: 11.5px; color: var(--muted); margin-top: 6px; }

  /* ── Divider ── */
  .sa-section-title {
    font-size: 13px; font-weight: 600; color: var(--muted); letter-spacing: .6px; text-transform: uppercase;
    margin-bottom: 14px;
  }

  /* ── Card ── */
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); box-shadow: var(--shadow-sm);
    overflow: hidden;
  }
  .card-header {
    padding: 18px 22px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title { font-size: 14.5px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
  .card-body { padding: 20px 22px; }

  /* ── Two-col grid ── */
  .sa-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }

  /* ── Select ── */
  .sa-select-wrap { position: relative; }
  .sa-select-wrap select {
    width: 100%;
    padding: 11px 40px 11px 14px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px; font-weight: 500;
    color: var(--text);
    background: var(--surface);
    appearance: none;
    cursor: pointer;
    transition: border-color .15s;
  }
  .sa-select-wrap select:focus { outline: none; border-color: var(--accent); }
  .sa-select-chevron {
    position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
    color: var(--muted); pointer-events: none;
  }

  /* ── Admin preview card ── */
  .admin-preview {
    margin-top: 14px; padding: 14px 16px;
    border: 1.5px solid var(--border); border-radius: 10px;
    background: var(--bg);
    display: flex; align-items: center; gap: 12px;
  }
  .avatar {
    width: 40px; height: 40px; border-radius: 8px;
    background: var(--accent); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 15px; flex-shrink: 0;
  }
  .avatar.sm { width: 32px; height: 32px; font-size: 12px; border-radius: 6px; }
  .avatar-green { background: #059669; }
  .admin-preview-name { font-size: 14px; font-weight: 700; }
  .admin-preview-email { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 4px; margin-top: 2px; }
  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11.5px; font-weight: 600; padding: 3px 9px;
    border-radius: 999px;
  }
  .badge-blue  { background: var(--accent-lt); color: var(--accent); }
  .badge-green { background: #ecfdf5; color: var(--success); }
  .badge-slate { background: #f1f2f4; color: #4b5563; border: 1px solid var(--border); }

  /* ── Search input ── */
  .search-wrap { position: relative; }
  .search-wrap input {
    width: 100%;
    padding: 10px 14px 10px 38px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-family: 'DM Sans', sans-serif; font-size: 13.5px;
    background: var(--bg); color: var(--text);
    transition: border-color .15s, background .15s;
  }
  .search-wrap input:focus { outline: none; border-color: var(--accent); background: var(--surface); }
  .search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--muted); }

  /* ── Customer list ── */
  .customer-scroll { max-height: 360px; overflow-y: auto; }
  .customer-scroll::-webkit-scrollbar { width: 4px; }
  .customer-scroll::-webkit-scrollbar-track { background: transparent; }
  .customer-scroll::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 999px; }
  .customer-item {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background .1s;
  }
  .customer-item:last-child { border-bottom: none; }
  .customer-item:hover { background: var(--bg); }
  .customer-item.selected { background: #f0f5ff; }
  .customer-item input[type=checkbox] {
    width: 16px; height: 16px; accent-color: var(--accent);
    flex-shrink: 0; margin-top: 3px; cursor: pointer;
  }
  .customer-name { font-size: 13.5px; font-weight: 600; }
  .customer-email { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 4px; margin-top: 2px; }
  .customer-admins { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
  .badge-red   { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }
  .badge-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
  .customer-item.inactive { opacity: .65; background: #fafafa; }
  .btn-toggle-active   { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
  .btn-toggle-active:hover:not(:disabled)   { background: #d1fae5; }
  .btn-toggle-inactive { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
  .btn-toggle-inactive:hover:not(:disabled) { background: #fee2e2; }

  /* ── Assignment summary bar ── */
  .summary-bar {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); box-shadow: var(--shadow-sm);
    padding: 18px 24px;
    display: flex; align-items: center; justify-content: space-between; gap: 20px;
  }
  .summary-info { font-size: 13.5px; color: var(--muted); }
  .summary-info strong { color: var(--text); font-weight: 700; }
  .summary-note {
    margin-top: 12px; padding: 12px 16px;
    background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px;
    font-size: 12.5px; color: #92400e;
    display: flex; align-items: flex-start; gap: 8px;
  }

  /* ── Toast ── */
  .toast {
    position: fixed; top: 20px; right: 24px;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px; border-radius: 10px;
    font-size: 13.5px; font-weight: 500;
    box-shadow: var(--shadow-lg); z-index: 999;
    animation: toast-in .2s ease;
    max-width: 380px;
  }
  .toast.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
  .toast.error   { background: #fef2f2; border: 1px solid #fca5a5; color: #7f1d1d; }
  .toast.info    { background: var(--accent-lt); border: 1px solid #bfdbfe; color: #1e3a8a; }
  @keyframes toast-in { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0;
    background: rgba(15,17,23,.45);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; animation: fade-in .15s ease;
  }
  @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
  .modal {
    background: var(--surface); border-radius: 14px;
    padding: 28px; max-width: 420px; width: 90%;
    box-shadow: var(--shadow-lg);
  }
  .modal-title { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .modal-body  { font-size: 13.5px; color: var(--muted); line-height: 1.6; margin-bottom: 22px; }
  .modal-actions { display: flex; gap: 10px; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .sa-stats { grid-template-columns: repeat(2, 1fr); }
    .sa-cols  { grid-template-columns: 1fr; }
  }
  @media (max-width: 560px) {
    .sa-body { padding: 20px 16px; }
    .sa-header { padding: 0 16px; }
    .sa-stats { grid-template-columns: 1fr 1fr; }
    .summary-bar { flex-direction: column; align-items: flex-start; }
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

  // Inject styles once
  useEffect(() => {
    const id = 'sa-styles';
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

  return (
    <div className="sa-shell">
      {/* ── Toast ── */}
      {notification && (
        <div className={`toast ${notification.type}`}>
          {notification.type === 'success' && <CheckCircle size={16} />}
          {notification.type === 'error'   && <AlertCircle size={16} />}
          {notification.type === 'info'    && <AlertCircle size={16} />}
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
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
              Remove Assignment
            </div>
            <div className="modal-body">
              Are you sure you want to remove this customer assignment? This cannot be undone.
            </div>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={async () => { setRemoveConfirm(null); }}
                disabled={loading}>
                {loading ? 'Removing…' : 'Remove'}
              </button>
              <button className="btn btn-ghost" onClick={() => setRemoveConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sa-header">
        <div className="sa-header-brand">
          <div className="sa-header-icon">
            <Crown size={18} color="#fff" />
          </div>
          <div>
            <div className="sa-header-title">Super Admin</div>
            <div className="sa-header-sub">Customer assignment dashboard</div>
          </div>
        </div>
        <div className="sa-header-actions">
          <button
            className="btn btn-ghost"
            onClick={loadInitialData}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/superadmin/analytics')}>
            <BarChart3 size={14} />
            Analytics
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="sa-body">

        {/* ── Stat Row ── */}
        <div className="sa-stats">
          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon blue"><Users size={18} /></div>
            </div>
            <div className="stat-value">{customers.length}</div>
            <div className="stat-label">Total Customers</div>
            <div className="stat-sub">{customers.filter(c => c.isActive !== false).length} active · {customers.filter(c => c.isActive === false).length} inactive</div>
          </div>

          <div className="stat-card">
            <div className="stat-card-top">
              <div className="stat-icon slate"><Shield size={18} /></div>
            </div>
            <div className="stat-value">{admins.length}</div>
            <div className="stat-label">Active Admins</div>
          </div>

          <div
            className="stat-card clickable"
            onClick={() => navigate('/superadmin/analytics')}
            role="button" tabIndex={0}
          >
            <div className="stat-card-top">
              <div className="stat-icon green"><BarChart3 size={18} /></div>
              <ArrowRight size={16} className="stat-arrow" />
            </div>
            <div className="stat-value">{totalAssigned}</div>
            <div className="stat-label">Total Assignments</div>
            <div className="stat-sub">View analytics →</div>
          </div>

          <div
            className="stat-card clickable"
            onClick={() => navigate('/superadmin/view-assignments')}
            role="button" tabIndex={0}
          >
            <div className="stat-card-top">
              <div className="stat-icon amber"><UserCheck size={18} /></div>
              <ArrowRight size={16} className="stat-arrow" />
            </div>
            <div className="stat-value">
              {customers.length > 0
                ? `${Math.round((customers.filter(c => getAdminsForCustomer(c._id).length > 0).length / customers.length) * 100)}%`
                : '—'}
            </div>
            <div className="stat-label">Assignment Rate</div>
            <div className="stat-sub">View all assignments →</div>
          </div>
        </div>

        {/* ── Assignment Section ── */}
        <p className="sa-section-title">New Assignment</p>

        <div className="sa-cols">
          {/* Admin Selection */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <Crown size={15} style={{ color: 'var(--accent)' }} />
                Admin
              </span>
              {selectedAdminObj && (
                <span className="badge badge-blue">
                  <Users size={11} />
                  {(selectedAdminObj.assignedCustomers || []).length} assigned
                </span>
              )}
            </div>
            <div className="card-body">
              <div className="sa-select-wrap">
                <select value={selectedAdmin} onChange={e => setSelectedAdmin(e.target.value)}>
                  <option value="">Choose an admin…</option>
                  {admins.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.name || a.email?.split('@')[0]} — {a.email}
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="sa-select-chevron" />
              </div>

              {selectedAdminObj && (
                <div className="admin-preview">
                  <div className="avatar">{initials(selectedAdminObj.name, selectedAdminObj.email)}</div>
                  <div>
                    <div className="admin-preview-name">
                      {selectedAdminObj.name || selectedAdminObj.email?.split('@')[0]}
                    </div>
                    <div className="admin-preview-email">
                      <Mail size={11} />
                      {selectedAdminObj.email}
                    </div>
                  </div>
                </div>
              )}

              {!selectedAdminObj && (
                <div style={{ marginTop: 16, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.6 }}>
                  Select an admin from the dropdown to view their profile and current assignment count.
                </div>
              )}
            </div>
          </div>

          {/* Customer Selection */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">
                <Users size={15} style={{ color: 'var(--accent)' }} />
                Customers
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {selectedCustomers.length > 0 && (
                  <span className="badge badge-blue">
                    <UserCheck size={11} />
                    {selectedCustomers.length} selected
                  </span>
                )}
                <button
                  className="btn btn-ghost"
                  style={{ padding: '4px 10px', fontSize: 12 }}
                  onClick={handleSelectAll}
                >
                  <Filter size={12} />
                  {selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0
                    ? 'Deselect all' : 'Select all'}
                </button>
              </div>
            </div>

            {/* Search */}
            <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)' }}>
              <div className="search-wrap">
                <Search size={14} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search by name or email…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* List */}
            <div className="customer-scroll">
              {filteredCustomers.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                  <User size={32} style={{ margin: '0 auto 8px', opacity: .3 }} />
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
                      className={`customer-item${isSelected ? ' selected' : ''}${customer.isActive === false ? ' inactive' : ''}`}
                      onClick={() => toggleCustomer(customer._id)}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleCustomer(customer._id)}
                        onClick={e => e.stopPropagation()}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div className="customer-name">{customer.name}</div>
                          {customer.isActive === false && (
                            <span className="badge badge-red" style={{ fontSize: 10.5 }}>Inactive</span>
                          )}
                        </div>
                        <div className="customer-email">
                          <Mail size={11} />
                          {customer.email}
                        </div>
                        {assigned.length > 0 && (
                          <div className="customer-admins">
                            {assigned.map(a => (
                              <span
                                key={a._id}
                                className={`badge ${a._id === selectedAdmin ? 'badge-green' : 'badge-slate'}`}
                              >
                                <Crown size={10} />
                                {a.name || a.email?.split('@')[0]}
                              </span>
                            ))}
                          </div>
                        )}
                        {alreadyThis && selectedAdmin && (
                          <div style={{ marginTop: 6 }}>
                            <span className="badge badge-green" style={{ fontSize: 11 }}>
                              <UserCheck size={10} /> Already assigned
                            </span>
                          </div>
                        )}
                      </div>
                      <button
                        className={`btn ${customer.isActive === false ? 'btn-toggle-active' : 'btn-toggle-inactive'}`}
                        style={{ padding: '5px 10px', fontSize: 11.5, flexShrink: 0 }}
                        disabled={statusUpdating === customer._id}
                        onClick={e => handleToggleStatus(e, customer)}
                        title={customer.isActive === false ? 'Activate account' : 'Deactivate account'}
                      >
                        <Power size={12} />
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
        <div className="summary-bar">
          <div className="summary-info">
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
            className="btn btn-primary btn-lg"
            onClick={handleAssignment}
            disabled={loading || !selectedAdmin || selectedCustomers.length === 0}
          >
            {loading
              ? <><RefreshCw size={16} className="animate-spin" /> Assigning…</>
              : <><UserPlus size={16} /> Assign Now <ArrowRight size={15} /></>
            }
          </button>
        </div>

        {/* Multi-admin note */}
        <div className="summary-note" style={{ marginTop: 12 }}>
          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>Multi-admin support:</strong> Customers can be assigned to multiple admins simultaneously.
            Existing assignments are preserved when creating new ones.
          </span>
        </div>

      </main>
    </div>
  );
};

export default SuperAdminDashboard;