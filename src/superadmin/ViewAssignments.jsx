import React, { useState, useEffect } from 'react';
import {
  Users, Crown, Mail, User, Search, RefreshCw,
  UserMinus, AlertTriangle, CheckCircle, X, Shield, ChevronDown
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SuperAdminLayout from './SuperAdminLayout';

/* ─────────────────────────────────────────────
   Global Styles
───────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:          #f0f6fb;
    --surface:     #ffffff;
    --border:      #dde5ee;
    --border-lt:   #eaf1f8;
    --text:        #0f1924;
    --muted:       #64748b;
    --muted-lt:    #94a3b8;
    --sky:         #0ea5e9;
    --sky-dk:      #0284c7;
    --sky-lt:      #e0f2fe;
    --sky-mid:     #bae6fd;
    --danger:      #dc2626;
    --success:     #059669;
    --warn:        #d97706;
    --radius:      12px;
    --radius-sm:   8px;
    --shadow-sm:   0 1px 3px rgba(14,30,48,.06), 0 1px 2px rgba(14,30,48,.04);
    --shadow-md:   0 4px 14px rgba(14,30,48,.09);
    --shadow-lg:   0 10px 32px rgba(14,30,48,.12);
    --header-h:    68px;
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); }

  /* ── Shell ── */
  .va-shell { min-height: 100vh; display: flex; flex-direction: column; }

  /* ── Header ── */
  .va-header {
    height: var(--header-h);
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center;
    padding: 0 32px; justify-content: space-between;
    position: sticky; top: 0; z-index: 100;
    box-shadow: var(--shadow-sm);
  }
  .va-header-left { display: flex; align-items: center; gap: 14px; }
  .va-back-btn {
    width: 34px; height: 34px; border-radius: var(--radius-sm);
    background: var(--bg); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: var(--muted); transition: all .15s;
  }
  .va-back-btn:hover { background: var(--sky-lt); border-color: var(--sky-mid); color: var(--sky-dk); }
  .va-header-title { font-size: 17px; font-weight: 700; letter-spacing: -.3px; }
  .va-header-sub   { font-size: 12px; color: var(--muted); margin-top: 1px; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; gap: 7px;
    font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 600;
    border: none; cursor: pointer; border-radius: var(--radius-sm);
    padding: 8px 16px; transition: all .15s; white-space: nowrap;
  }
  .btn:disabled { opacity: .45; cursor: not-allowed; }
  .btn-ghost {
    background: var(--surface); color: var(--muted);
    border: 1px solid var(--border);
  }
  .btn-ghost:hover:not(:disabled) { background: var(--bg); color: var(--text); border-color: #b0c0d0; }
  .btn-sky  { background: var(--sky); color: #fff; }
  .btn-sky:hover:not(:disabled) { background: var(--sky-dk); }
  .btn-danger { background: var(--danger); color: #fff; }
  .btn-danger:hover:not(:disabled) { background: #b91c1c; }

  /* ── Body ── */
  .va-body { flex: 1; padding: 28px 32px; max-width: 1280px; margin: 0 auto; width: 100%; }

  /* ── Stats ── */
  .va-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 20px 22px;
    box-shadow: var(--shadow-sm);
  }
  .stat-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .stat-icon {
    width: 36px; height: 36px; border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
  }
  .si-sky    { background: var(--sky-lt); color: var(--sky); }
  .si-slate  { background: #f1f5f9; color: #475569; }
  .si-green  { background: #ecfdf5; color: var(--success); }
  .si-amber  { background: #fffbeb; color: var(--warn); }
  .stat-value { font-size: 26px; font-weight: 700; letter-spacing: -.5px; }
  .stat-label { font-size: 12px; color: var(--muted); font-weight: 500; margin-top: 2px; }
  .stat-sub   { font-size: 11px; color: var(--muted-lt); margin-top: 5px; }

  /* ── Toolbar ── */
  .va-toolbar {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 16px 22px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; margin-bottom: 20px; box-shadow: var(--shadow-sm);
    flex-wrap: wrap;
  }
  .va-toolbar-title { font-size: 14.5px; font-weight: 700; }
  .va-toolbar-sub   { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .va-toolbar-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

  /* Toggle */
  .toggle-group {
    display: flex; background: var(--bg); border: 1px solid var(--border);
    border-radius: var(--radius-sm); padding: 3px; gap: 2px;
  }
  .toggle-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 6px; border: none;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all .15s; color: var(--muted); background: transparent;
  }
  .toggle-btn.active { background: var(--surface); color: var(--sky-dk); box-shadow: var(--shadow-sm); border: 1px solid var(--border); }
  .toggle-btn:hover:not(.active) { color: var(--text); }

  /* Search */
  .search-wrap { position: relative; }
  .search-wrap input {
    width: 240px; padding: 8px 14px 8px 36px;
    border: 1.5px solid var(--border); border-radius: var(--radius-sm);
    font-family: 'DM Sans', sans-serif; font-size: 13.5px;
    background: var(--bg); color: var(--text); transition: all .15s;
  }
  .search-wrap input:focus { outline: none; border-color: var(--sky); background: var(--surface); width: 280px; }
  .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted-lt); }

  /* ── Section label ── */
  .section-label {
    font-size: 11.5px; font-weight: 700; letter-spacing: .7px; text-transform: uppercase;
    color: var(--muted); margin-bottom: 12px;
  }

  /* ── Admin card ── */
  .admin-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); box-shadow: var(--shadow-sm);
    margin-bottom: 14px; overflow: hidden;
    transition: box-shadow .15s;
  }
  .admin-card:hover { box-shadow: var(--shadow-md); }
  .admin-card-header {
    padding: 16px 22px; border-bottom: 1px solid var(--border-lt);
    display: flex; align-items: center; justify-content: space-between;
    background: linear-gradient(to right, #f8fafc, var(--surface));
  }
  .admin-card-left { display: flex; align-items: center; gap: 12px; }
  .avatar {
    width: 40px; height: 40px; border-radius: var(--radius-sm);
    background: var(--sky); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 14px; flex-shrink: 0;
  }
  .avatar.green   { background: var(--success); }
  .avatar.slate   { background: #64748b; }
  .avatar.amber   { background: var(--warn); }
  .avatar-name  { font-size: 14.5px; font-weight: 700; }
  .avatar-email { font-size: 12px; color: var(--muted); display: flex; align-items: center; gap: 4px; margin-top: 2px; }

  .badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 999px;
  }
  .badge-sky    { background: var(--sky-lt); color: var(--sky-dk); border: 1px solid var(--sky-mid); }
  .badge-green  { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
  .badge-amber  { background: #fffbeb; color: #92400e; border: 1px solid #fde68a; }
  .badge-slate  { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }

  /* ── Customer rows ── */
  .customer-grid { padding: 16px 22px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .customer-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: var(--radius-sm);
    border: 1px solid var(--border-lt); background: var(--bg);
    transition: all .15s; position: relative;
  }
  .customer-row:hover { border-color: var(--sky-mid); background: var(--sky-lt); }
  .customer-row:hover .rm-btn { opacity: 1; }
  .customer-name  { font-size: 13px; font-weight: 600; }
  .customer-email { font-size: 11.5px; color: var(--muted); display: flex; align-items: center; gap: 3px; margin-top: 2px; }
  .rm-btn {
    margin-left: auto; flex-shrink: 0;
    width: 28px; height: 28px; border-radius: 6px;
    border: none; background: transparent; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    color: var(--danger); opacity: 0; transition: all .15s;
  }
  .rm-btn:hover { background: #fef2f2; }
  .rm-btn:disabled { opacity: .3; cursor: not-allowed; }

  /* ── Unassigned section ── */
  .unassigned-card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); box-shadow: var(--shadow-sm);
    overflow: hidden; margin-top: 24px;
  }
  .unassigned-header {
    padding: 16px 22px; border-bottom: 1px solid var(--border-lt);
    display: flex; align-items: center; justify-content: space-between;
    background: #fffbeb;
  }
  .unassigned-grid {
    padding: 16px 22px;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  }
  .unassigned-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: var(--radius-sm);
    border: 1px solid #fde68a; background: #fffbeb;
  }
  .avatar.sm { width: 30px; height: 30px; font-size: 11px; border-radius: 6px; }

  /* ── Empty state ── */
  .empty-state {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 56px 32px;
    text-align: center; box-shadow: var(--shadow-sm);
  }
  .empty-icon { color: var(--muted-lt); margin: 0 auto 12px; display: block; }
  .empty-title { font-size: 15px; font-weight: 700; margin-bottom: 6px; }
  .empty-sub   { font-size: 13px; color: var(--muted); }

  /* ── Loading ── */
  .va-loading {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 320px; gap: 14px;
  }
  .spinner {
    width: 36px; height: 36px; border: 3px solid var(--sky-lt);
    border-top-color: var(--sky); border-radius: 50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Toast ── */
  .toast {
    position: fixed; top: 20px; right: 24px;
    display: flex; align-items: center; gap: 10px;
    padding: 12px 18px; border-radius: 10px;
    font-size: 13.5px; font-weight: 500;
    box-shadow: var(--shadow-lg); z-index: 999; max-width: 380px;
    animation: toast-in .2s ease;
  }
  .toast.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
  .toast.error   { background: #fef2f2; border: 1px solid #fca5a5; color: #7f1d1d; }
  .toast.info    { background: var(--sky-lt); border: 1px solid var(--sky-mid); color: #075985; }
  @keyframes toast-in { from { opacity:0; transform: translateX(16px); } to { opacity:1; transform: none; } }

  /* ── Modal ── */
  .modal-overlay {
    position: fixed; inset: 0; background: rgba(10,20,40,.4);
    display: flex; align-items: center; justify-content: center;
    z-index: 200; animation: fade-in .15s ease;
  }
  @keyframes fade-in { from { opacity:0; } to { opacity:1; } }
  .modal {
    background: var(--surface); border-radius: 14px;
    padding: 28px; max-width: 420px; width: 90%;
    box-shadow: var(--shadow-lg);
  }
  .modal-title  { font-size: 16px; font-weight: 700; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .modal-detail { background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 16px; }
  .modal-detail p { font-size: 13px; color: var(--muted); margin-bottom: 6px; }
  .modal-detail p:last-child { margin-bottom: 0; }
  .modal-detail strong { color: var(--text); font-weight: 600; }
  .modal-body   { font-size: 13.5px; color: var(--muted); line-height: 1.6; margin-bottom: 22px; }
  .modal-actions { display: flex; gap: 10px; }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .va-stats { grid-template-columns: repeat(2,1fr); }
    .customer-grid { grid-template-columns: 1fr; }
    .unassigned-grid { grid-template-columns: repeat(2,1fr); }
  }
  @media (max-width: 560px) {
    .va-body { padding: 20px 16px; }
    .va-header { padding: 0 16px; }
    .va-stats { grid-template-columns: repeat(2,1fr); }
    .va-toolbar { flex-direction: column; align-items: flex-start; }
    .unassigned-grid { grid-template-columns: 1fr; }
    .search-wrap input { width: 100%; }
    .search-wrap input:focus { width: 100%; }
  }
`;

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const initials = (name, email) => (name || email || '?').slice(0, 2).toUpperCase();

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

/* ─────────────────────────────────────────────
   Component
───────────────────────────────────────────── */
const ViewAssignments = () => {
  const [customers, setCustomers]       = useState([]);
  const [admins, setAdmins]             = useState([]);
  const [assignments, setAssignments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [removing, setRemoving]         = useState(false);
  const [searchTerm, setSearchTerm]     = useState('');
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [notification, setNotification] = useState(null);
  const [viewMode, setViewMode]         = useState('admin');
  const navigate = useNavigate();

  useEffect(() => {
    const id = 'va-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = STYLES;
      document.head.appendChild(el);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try { await Promise.all([fetchCustomers(), fetchAdmins()]); }
    finally { setLoading(false); }
  };

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/customers`);
      setCustomers(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/users?role=admin`);
      const data = await res.json();
      setAdmins(data);
      setAssignments(
        data
          .filter(a => a.assignedCustomers?.length > 0)
          .map(a => ({ adminId: a._id, customerIds: a.assignedCustomers }))
      );
    } catch (e) { console.error(e); }
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleRemoveAssignment = async (adminId, customerId) => {
    setRemoving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/remove-assignment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('superadminToken')}`
        },
        body: JSON.stringify({ adminId, customerId })
      });
      const data = await res.json();
      if (res.ok) {
        showNotification('Assignment removed successfully', 'success');
        await fetchAdmins();
      } else {
        showNotification(data.error || 'Failed to remove assignment', 'error');
      }
    } catch (e) {
      showNotification('Network error: ' + e.message, 'error');
    } finally {
      setRemoving(false);
    }
  };

  const handleRemoveClick = (adminId, customerId) => {
    const admin    = admins.find(a => a._id === adminId);
    const customer = customers.find(c => c._id === customerId);
    setRemoveConfirm({
      adminId, customerId,
      adminName:    admin?.name    || admin?.email?.split('@')[0] || 'Unknown Admin',
      customerName: customer?.name || 'Unknown Customer'
    });
  };

  const confirmRemove = async () => {
    if (removeConfirm) {
      await handleRemoveAssignment(removeConfirm.adminId, removeConfirm.customerId);
      setRemoveConfirm(null);
    }
  };

  /* ── Lookup helpers ── */
  const getAdmin    = id => admins.find(a => a._id === id);
  const getCustomer = id => customers.find(c => c._id === id);
  const getAdminName  = id => { const a = getAdmin(id); return a?.name || a?.email?.split('@')[0] || 'Unknown'; };
  const getAdminEmail = id => getAdmin(id)?.email || '';
  const getCustomerName  = id => getCustomer(id)?.name  || 'Unknown';
  const getCustomerEmail = id => getCustomer(id)?.email || '';
  const getAdminsForCustomer = cid => assignments
    .filter(a => a.customerIds.includes(cid))
    .map(a => getAdmin(a.adminId))
    .filter(Boolean);

  /* ── Derived data ── */
  const assignedCustomers   = customers.filter(c => assignments.some(a => a.customerIds.includes(c._id)));
  const unassignedCustomers = customers.filter(c => !assignments.some(a => a.customerIds.includes(c._id)));
  const totalRelationships  = assignments.reduce((n, a) => n + a.customerIds.length, 0);

  const q = searchTerm.toLowerCase();

  const filteredAssignments = assignments.filter(a =>
    getAdminName(a.adminId).toLowerCase().includes(q) ||
    a.customerIds.some(id => getCustomerName(id).toLowerCase().includes(q))
  );

  const filteredCustomers = assignedCustomers.filter(c =>
    (c.name || '').toLowerCase().includes(q) ||
    (c.email || '').toLowerCase().includes(q) ||
    getAdminsForCustomer(c._id).some(a => (a.name || a.email || '').toLowerCase().includes(q))
  );

  if (loading) return (
    <SuperAdminLayout title="View Assignments" subtitle="All customer-admin relationships">
      <div className="va-loading">
        <div className="spinner" />
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading assignments…</span>
      </div>
    </SuperAdminLayout>
  );

  const topbarRight = (
    <button className="btn btn-ghost" onClick={loadData} disabled={loading}>
      <RefreshCw size={14} style={loading ? { animation: 'spin .7s linear infinite' } : {}} />
      Refresh
    </button>
  );

  return (
    <SuperAdminLayout title="View Assignments" subtitle="All customer-admin relationships" topbarRight={topbarRight}>

      {/* ── Toast ── */}
      {notification && (
        <div className={`toast ${notification.type}`}>
          {notification.type === 'success' && <CheckCircle size={15} />}
          {notification.type === 'error'   && <AlertTriangle size={15} />}
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: .7 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Confirm Modal ── */}
      {removeConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              <AlertTriangle size={17} style={{ color: 'var(--danger)' }} />
              Remove Assignment
            </div>
            <div className="modal-detail">
              <p><strong>Customer:</strong> {removeConfirm.customerName}</p>
              <p><strong>Admin:</strong> {removeConfirm.adminName}</p>
            </div>
            <div className="modal-body">
              The customer will no longer be managed by this admin. This action cannot be undone.
            </div>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={confirmRemove} disabled={removing}>
                {removing ? 'Removing…' : 'Remove Assignment'}
              </button>
              <button className="btn btn-ghost" onClick={() => setRemoveConfirm(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <main className="va-body">
        {/* ── Stats ── */}
        <div className="va-stats">
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon si-sky"><Users size={17} /></div>
            </div>
            <div className="stat-value">{customers.length}</div>
            <div className="stat-label">Total Customers</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon si-slate"><Shield size={17} /></div>
            </div>
            <div className="stat-value">{admins.length}</div>
            <div className="stat-label">Active Admins</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon si-green"><Crown size={17} /></div>
            </div>
            <div className="stat-value">{assignedCustomers.length}</div>
            <div className="stat-label">Assigned Customers</div>
            <div className="stat-sub">{totalRelationships} total relationships</div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon si-amber"><User size={17} /></div>
            </div>
            <div className="stat-value">{unassignedCustomers.length}</div>
            <div className="stat-label">Unassigned</div>
            {unassignedCustomers.length > 0 && (
              <div className="stat-sub">Need assignment</div>
            )}
          </div>
        </div>

        {/* ── Toolbar ── */}
        <div className="va-toolbar">
          <div>
            <div className="va-toolbar-title">Assignment Overview</div>
            <div className="va-toolbar-sub">
              {viewMode === 'admin'
                ? `${filteredAssignments.length} admin${filteredAssignments.length !== 1 ? 's' : ''} with assignments`
                : `${filteredCustomers.length} assigned customer${filteredCustomers.length !== 1 ? 's' : ''}`
              }
            </div>
          </div>
          <div className="va-toolbar-right">
            <div className="toggle-group">
              <button
                className={`toggle-btn${viewMode === 'admin' ? ' active' : ''}`}
                onClick={() => setViewMode('admin')}
              >
                <Crown size={13} /> By Admin
              </button>
              <button
                className={`toggle-btn${viewMode === 'customer' ? ' active' : ''}`}
                onClick={() => setViewMode('customer')}
              >
                <Users size={13} /> By Customer
              </button>
            </div>
            <div className="search-wrap">
              <Search size={13} className="search-icon" />
              <input
                type="text"
                placeholder={`Search ${viewMode === 'admin' ? 'admins or customers' : 'customers or admins'}…`}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Admin View ── */}
        {viewMode === 'admin' && (
          <>
            {filteredAssignments.length === 0 ? (
              <div className="empty-state">
                <Crown size={40} className="empty-icon" />
                <div className="empty-title">No assignments found</div>
                <div className="empty-sub" style={{ marginBottom: 18 }}>
                  {assignments.length === 0
                    ? 'No customers have been assigned to admins yet.'
                    : 'No results match your search.'}
                </div>
                <button className="btn btn-sky" onClick={() => navigate('/superadmin/dashboard')}>
                  Create Assignment
                </button>
              </div>
            ) : (
              filteredAssignments.map(assignment => {
                const admin = getAdmin(assignment.adminId);
                return (
                  <div key={assignment.adminId} className="admin-card">
                    <div className="admin-card-header">
                      <div className="admin-card-left">
                        <div className="avatar">{initials(admin?.name, admin?.email)}</div>
                        <div>
                          <div className="avatar-name">{getAdminName(assignment.adminId)}</div>
                          <div className="avatar-email">
                            <Mail size={11} />{getAdminEmail(assignment.adminId)}
                          </div>
                        </div>
                      </div>
                      <span className="badge badge-sky">
                        <Users size={11} />
                        {assignment.customerIds.length} customer{assignment.customerIds.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="customer-grid">
                      {assignment.customerIds.map(cid => (
                        <div key={cid} className="customer-row">
                          <div className="avatar sm amber">{initials(getCustomerName(cid), getCustomerEmail(cid))}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="customer-name">{getCustomerName(cid)}</div>
                            <div className="customer-email"><Mail size={10} />{getCustomerEmail(cid)}</div>
                          </div>
                          <button
                            className="rm-btn"
                            onClick={() => handleRemoveClick(assignment.adminId, cid)}
                            disabled={removing}
                            title="Remove assignment"
                          >
                            <UserMinus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── Customer View ── */}
        {viewMode === 'customer' && (
          <>
            {filteredCustomers.length === 0 ? (
              <div className="empty-state">
                <Users size={40} className="empty-icon" />
                <div className="empty-title">No customers found</div>
                <div className="empty-sub">
                  {assignedCustomers.length === 0
                    ? 'No customers have been assigned yet.'
                    : 'No results match your search.'}
                </div>
              </div>
            ) : (
              filteredCustomers.map(customer => {
                const custAdmins = getAdminsForCustomer(customer._id);
                return (
                  <div key={customer._id} className="admin-card">
                    <div className="admin-card-header">
                      <div className="admin-card-left">
                        <div className="avatar green">{initials(customer.name, customer.email)}</div>
                        <div>
                          <div className="avatar-name">{customer.name}</div>
                          <div className="avatar-email"><Mail size={11} />{customer.email}</div>
                        </div>
                      </div>
                      <span className="badge badge-slate">
                        <Shield size={11} />
                        {custAdmins.length} admin{custAdmins.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="customer-grid">
                      {custAdmins.map(admin => (
                        <div key={admin._id} className="customer-row">
                          <div className="avatar sm">{initials(admin.name, admin.email)}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="customer-name">{admin.name || admin.email?.split('@')[0]}</div>
                            <div className="customer-email"><Mail size={10} />{admin.email}</div>
                          </div>
                          <button
                            className="rm-btn"
                            onClick={() => handleRemoveClick(admin._id, customer._id)}
                            disabled={removing}
                            title="Remove assignment"
                          >
                            <UserMinus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── Unassigned Section ── */}
        {unassignedCustomers.length > 0 && (
          <div className="unassigned-card">
            <div className="unassigned-header">
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>Unassigned Customers</div>
                <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>These customers have no admin assigned</div>
              </div>
              <span className="badge badge-amber">
                {unassignedCustomers.length} unassigned
              </span>
            </div>
            <div className="unassigned-grid">
              {unassignedCustomers.map(c => (
                <div key={c._id} className="unassigned-row">
                  <div className="avatar sm amber">{initials(c.name, c.email)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="customer-name" style={{ fontSize: 12.5 }}>{c.name}</div>
                    <div className="customer-email"><Mail size={10} />{c.email}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border-lt)', textAlign: 'center' }}>
              <button className="btn btn-sky" onClick={() => navigate('/superadmin/dashboard')}>
                Assign These Customers
              </button>
            </div>
          </div>
        )}

      </main>
    </SuperAdminLayout>
  );
};

export default ViewAssignments;