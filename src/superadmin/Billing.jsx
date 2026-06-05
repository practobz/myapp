import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, Plus, Edit2, Trash2, X, Check, AlertTriangle,
  Calendar, RefreshCw, Search, Users, BarChart2,
  Facebook, Instagram, Youtube, Linkedin, Twitter, Image,
  Film, BookOpen, LayoutGrid, Bell, Eye, ChevronDown, ChevronUp
} from 'lucide-react';
import SuperAdminLayout from './SuperAdminLayout';

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE = (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://localhost:3001';

const PLATFORMS = [
  { id: 'facebook',  label: 'Facebook',  color: '#1877F2', Icon: Facebook  },
  { id: 'instagram', label: 'Instagram', color: '#E4405F', Icon: Instagram },
  { id: 'youtube',   label: 'YouTube',   color: '#FF0000', Icon: Youtube   },
  { id: 'linkedin',  label: 'LinkedIn',  color: '#0A66C2', Icon: Linkedin  },
  { id: 'twitter',   label: 'Twitter/X', color: '#1DA1F2', Icon: Twitter   },
];

const CONTENT_TYPES = [
  { id: 'post',     label: 'Posts',     Icon: Image,      color: '#6366f1' },
  { id: 'reel',     label: 'Reels',     Icon: Film,       color: '#ec4899' },
  { id: 'story',    label: 'Stories',   Icon: BookOpen,   color: '#f97316' },
  { id: 'carousel', label: 'Carousels', Icon: LayoutGrid, color: '#10b981' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  :root {
    --bl-bg:      #f0f2f8;
    --bl-surface: #ffffff;
    --bl-border:  #e2e8f0;
    --bl-text:    #0f172a;
    --bl-muted:   #64748b;
    --bl-accent:  #6366f1;
    --bl-accent-lt: #eef2ff;
    --bl-radius:  14px;
    --bl-shadow:  0 1px 3px rgba(0,0,0,.05), 0 0 0 1px rgba(0,0,0,.03);
    --bl-shadow-md: 0 4px 14px rgba(0,0,0,.09);
  }

  /* ── Buttons ── */
  .bl-btn {
    display: inline-flex; align-items: center; gap: 7px;
    font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600;
    border: none; cursor: pointer; border-radius: 9px;
    padding: 9px 18px; transition: all .15s ease; white-space: nowrap;
  }
  .bl-btn:disabled { opacity: .45; cursor: not-allowed; }
  .bl-btn-primary {
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.35);
  }
  .bl-btn-primary:hover:not(:disabled) { background: linear-gradient(135deg, #5254cc, #4338ca); transform: translateY(-1px); }
  .bl-btn-ghost {
    background: var(--bl-surface); color: var(--bl-muted);
    border: 1.5px solid var(--bl-border);
  }
  .bl-btn-ghost:hover:not(:disabled) { background: var(--bl-bg); color: var(--bl-text); }
  .bl-btn-danger { background: linear-gradient(135deg, #f87171, #ef4444); color: #fff; }
  .bl-btn-danger:hover:not(:disabled) { background: linear-gradient(135deg, #ef4444, #b91c1c); }
  .bl-btn-sm { padding: 6px 12px; font-size: 12px; border-radius: 7px; }
  .bl-btn-icon { padding: 8px; border-radius: 8px; background: var(--bl-bg); border: 1.5px solid var(--bl-border); color: var(--bl-muted); cursor: pointer; transition: all .15s; }
  .bl-btn-icon:hover { background: var(--bl-accent-lt); border-color: rgba(99,102,241,0.3); color: var(--bl-accent); }

  /* ── Card ── */
  .bl-card {
    background: var(--bl-surface); border: 1px solid var(--bl-border);
    border-radius: var(--bl-radius); box-shadow: var(--bl-shadow);
  }
  .bl-card-header {
    padding: 16px 20px; border-bottom: 1px solid var(--bl-border);
    display: flex; align-items: center; justify-content: space-between;
    background: linear-gradient(to bottom, #fcfdff, var(--bl-surface));
  }
  .bl-card-title { font-size: 14px; font-weight: 700; color: var(--bl-text); display: flex; align-items: center; gap: 8px; }
  .bl-card-body  { padding: 20px; }

  /* ── Search ── */
  .bl-search { position: relative; }
  .bl-search input {
    width: 100%; padding: 10px 14px 10px 38px;
    border: 1.5px solid var(--bl-border); border-radius: 9px;
    font-family: 'Inter', sans-serif; font-size: 13px;
    background: var(--bl-bg); color: var(--bl-text);
    transition: border-color .15s, box-shadow .15s;
  }
  .bl-search input:focus { outline: none; border-color: var(--bl-accent); background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .bl-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--bl-muted); }

  /* ── Customer list ── */
  .bl-cust-list { }
  .bl-cust-item {
    display: flex; align-items: center; gap: 12px;
    padding: 12px 20px; border-bottom: 1px solid var(--bl-border);
    cursor: pointer; transition: background .1s;
  }
  .bl-cust-item:last-child { border-bottom: none; }
  .bl-cust-item:hover { background: #f8f9ff; }
  .bl-cust-item.active { background: #eef2ff; border-left: 3px solid var(--bl-accent); }
  .bl-avatar {
    width: 38px; height: 38px; border-radius: 9px;
    background: linear-gradient(135deg, #6366f1, #4f46e5);
    color: #fff; display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 13px; flex-shrink: 0;
  }
  .bl-cust-name  { font-size: 13px; font-weight: 600; color: var(--bl-text); }
  .bl-cust-email { font-size: 11.5px; color: var(--bl-muted); }
  .bl-plan-count { margin-left: auto; font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 999px; background: var(--bl-accent-lt); color: var(--bl-accent); white-space: nowrap; }

  /* ── Progress bar ── */
  .bl-progress-bar { height: 8px; border-radius: 99px; background: #e5e7eb; overflow: hidden; }
  .bl-progress-fill { height: 8px; border-radius: 99px; transition: width .5s ease; }

  /* ── Plan card ── */
  .bl-plan-card {
    border: 1.5px solid var(--bl-border); border-radius: 12px;
    padding: 18px 20px; margin-bottom: 14px;
    background: linear-gradient(to bottom, #fafbff, #fff);
    transition: box-shadow .15s, border-color .15s;
  }
  .bl-plan-card:hover { box-shadow: var(--bl-shadow-md); border-color: rgba(99,102,241,0.2); }
  .bl-plan-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
  .bl-plan-name   { font-size: 14px; font-weight: 700; color: var(--bl-text); }
  .bl-plan-dates  { font-size: 12px; color: var(--bl-muted); margin-top: 3px; display: flex; align-items: center; gap: 5px; }
  .bl-plan-actions { display: flex; gap: 6px; }

  /* ── Type rows ── */
  .bl-type-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
  .bl-type-icon { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .bl-type-label { font-size: 12.5px; font-weight: 600; color: var(--bl-text); width: 72px; flex-shrink: 0; }
  .bl-type-bar   { flex: 1; }
  .bl-type-count { font-size: 12px; color: var(--bl-muted); width: 60px; text-align: right; flex-shrink: 0; }

  /* ── Platform chips ── */
  .bl-platforms { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
  .bl-plat-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px; font-size: 11.5px; font-weight: 600; color: #fff;
  }

  /* ── Alert badge ── */
  .bl-alert-50  { background: #fef9c3; color: #854d0e; border: 1px solid #fde68a; }
  .bl-alert-75  { background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; }
  .bl-alert-100 { background: #fef2f2; color: #991b1b; border: 1px solid #fca5a5; }
  .bl-alert-badge {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 700; padding: 3px 9px;
    border-radius: 999px; margin-right: 4px;
  }

  /* ── Modal overlay ── */
  .bl-overlay {
    position: fixed; inset: 0; background: rgba(15,17,23,.5);
    display: flex; align-items: center; justify-content: center;
    z-index: 300; backdrop-filter: blur(4px);
    animation: bl-fade-in .15s ease;
  }
  @keyframes bl-fade-in { from { opacity: 0; } to { opacity: 1; } }
  .bl-modal {
    background: #fff; border-radius: 16px; padding: 28px;
    max-width: 560px; width: 95%; max-height: 92vh; overflow-y: auto;
    box-shadow: 0 20px 60px rgba(0,0,0,0.2); border: 1px solid var(--bl-border);
  }
  .bl-modal-title { font-size: 17px; font-weight: 800; color: var(--bl-text); margin-bottom: 22px; display: flex; align-items: center; gap: 10px; }

  /* ── Form elements ── */
  .bl-label { font-size: 12px; font-weight: 700; color: var(--bl-muted); letter-spacing: 0.4px; text-transform: uppercase; margin-bottom: 5px; display: block; }
  .bl-input {
    width: 100%; padding: 10px 14px; border: 1.5px solid var(--bl-border);
    border-radius: 9px; font-family: 'Inter', sans-serif; font-size: 13.5px;
    color: var(--bl-text); background: var(--bl-bg);
    transition: border-color .15s, box-shadow .15s; box-sizing: border-box;
  }
  .bl-input:focus { outline: none; border-color: var(--bl-accent); background: #fff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  .bl-field { margin-bottom: 16px; }
  .bl-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .bl-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }

  /* ── Platform checkboxes ── */
  .bl-plat-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .bl-plat-toggle {
    display: flex; align-items: center; gap: 6px;
    padding: 7px 12px; border-radius: 9px; cursor: pointer;
    border: 1.5px solid var(--bl-border); transition: all .15s;
    font-size: 12.5px; font-weight: 600; color: var(--bl-muted);
    background: var(--bl-bg); user-select: none;
  }
  .bl-plat-toggle.selected { color: #fff; border-color: transparent; }
  .bl-plat-toggle:hover { border-color: #c4cdd8; }

  /* ── Toast ── */
  .bl-toast {
    position: fixed; top: 84px; right: 24px;
    display: flex; align-items: center; gap: 10px;
    padding: 13px 18px; border-radius: 12px;
    font-size: 13px; font-weight: 500;
    box-shadow: 0 10px 32px rgba(0,0,0,0.12); z-index: 999;
    animation: bl-fade-in .22s ease; max-width: 380px;
  }
  .bl-toast.success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
  .bl-toast.error   { background: #fef2f2; border: 1px solid #fca5a5; color: #7f1d1d; }
  .bl-toast.info    { background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; }

  /* ── Empty state ── */
  .bl-empty { text-align: center; padding: 48px 20px; color: var(--bl-muted); }
  .bl-empty-icon { margin: 0 auto 14px; opacity: .35; }
  .bl-empty-title { font-size: 15px; font-weight: 600; color: var(--bl-text); margin-bottom: 6px; }
  .bl-empty-sub   { font-size: 13px; }

  /* ── Section header ── */
  .bl-section-label {
    font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
    color: var(--bl-muted); padding: 8px 20px; background: var(--bl-bg);
    border-bottom: 1px solid var(--bl-border);
  }

  /* ── Quota summary totals ── */
  .bl-quota-summary {
    display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;
  }
  .bl-quota-chip {
    display: flex; align-items: center; gap: 6px;
    padding: 5px 12px; border-radius: 9px; font-size: 12px; font-weight: 600;
    background: #f1f5f9; color: #334155; border: 1px solid #e2e8f0;
  }

  /* ── Two-panel layout ── */
  .bl-panels { display: grid; grid-template-columns: 300px 1fr; gap: 18px; align-items: start; }
  @media (max-width: 900px) { .bl-panels { grid-template-columns: 1fr; } }

  /* ── Confirm modal ── */
  .bl-confirm-body { font-size: 13.5px; color: var(--bl-muted); line-height: 1.6; margin-bottom: 22px; }
  .bl-confirm-actions { display: flex; gap: 10px; justify-content: flex-end; }

  /* ── Loading spinner ── */
  @keyframes bl-spin { to { transform: rotate(360deg); } }
  .bl-spinner { animation: bl-spin 0.8s linear infinite; }

  /* ── scrollable panel ── */
  .bl-cust-scroll { max-height: calc(100vh - 240px); overflow-y: auto; }
  .bl-cust-scroll::-webkit-scrollbar { width: 4px; }
  .bl-cust-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
  .bl-plans-scroll { max-height: calc(100vh - 200px); overflow-y: auto; padding: 20px; }
  .bl-plans-scroll::-webkit-scrollbar { width: 4px; }
  .bl-plans-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }

  /* ── Published posts list ── */
  .bl-posts-list { margin-top: 12px; border-top: 1px solid var(--bl-border); padding-top: 12px; }
  .bl-post-item {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 10px 0; border-bottom: 1px solid #f1f5f9;
  }
  .bl-post-item:last-child { border-bottom: none; }
  .bl-post-thumb {
    width: 56px; height: 56px; border-radius: 8px; object-fit: cover;
    background: #f1f5f9; flex-shrink: 0; border: 1px solid #e2e8f0;
  }
  .bl-post-thumb-placeholder {
    width: 56px; height: 56px; border-radius: 8px; flex-shrink: 0;
    background: #f1f5f9; border: 1px solid #e2e8f0;
    display: flex; align-items: center; justify-content: center; color: #cbd5e1;
  }
  .bl-post-caption {
    font-size: 12.5px; color: #374151; line-height: 1.5;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .bl-post-meta { font-size: 11px; color: #94a3b8; margin-top: 4px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .bl-post-type-badge {
    display: inline-flex; align-items: center; gap: 3px;
    font-size: 10px; font-weight: 700; padding: 2px 7px;
    border-radius: 999px; background: #f1f5f9; color: #475569;
  }
  .bl-view-posts-btn {
    display: flex; align-items: center; gap: 5px;
    font-size: 12px; font-weight: 600; color: var(--bl-accent);
    background: var(--bl-accent-lt); border: 1px solid rgba(99,102,241,0.2);
    border-radius: 7px; padding: 5px 11px; cursor: pointer;
    transition: all .15s; margin-top: 10px; width: 100%; justify-content: center;
  }
  .bl-view-posts-btn:hover { background: #e0e7ff; }
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const initials = (name = '', email = '') =>
  (name || email || '?').slice(0, 2).toUpperCase();

const fmtDate = (d) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return d; }
};

const progressColor = (pct) => {
  if (pct >= 100) return '#ef4444';
  if (pct >= 75)  return '#f97316';
  if (pct >= 50)  return '#f59e0b';
  return '#10b981';
};

const getPct = (used, total) =>
  total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

const EMPTY_QUOTAS = { post: '', reel: '', story: '', carousel: '' };
const EMPTY_FORM = {
  planName: '',
  dateRange: { start: '', end: '' },
  platforms: [],
  quotas: { ...EMPTY_QUOTAS },
};

// ─── API ──────────────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('Invalid server response'); }
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PlatformChip({ platformId }) {
  const p = PLATFORMS.find(x => x.id === platformId);
  if (!p) return null;
  const { Icon, color, label } = p;
  return (
    <span className="bl-plat-chip" style={{ background: color }}>
      <Icon size={11} />
      {label}
    </span>
  );
}

function ProgressRow({ type, used, total }) {
  const { label, Icon, color } = type;
  if (total === 0) return null;
  const pct = getPct(used, total);
  const fill = progressColor(pct);
  return (
    <div className="bl-type-row">
      <div className="bl-type-icon" style={{ background: `${color}18` }}>
        <Icon size={14} color={color} />
      </div>
      <span className="bl-type-label">{label}</span>
      <div className="bl-type-bar">
        <div className="bl-progress-bar">
          <div className="bl-progress-fill" style={{ width: `${pct}%`, background: fill }} />
        </div>
      </div>
      <span className="bl-type-count">{used} / {total}</span>
    </div>
  );
}

function AlertBadges({ alertsSent = {} }) {
  const badges = [];
  if (alertsSent['100']) badges.push({ cls: 'bl-alert-100', label: '100% reached' });
  else if (alertsSent['75']) badges.push({ cls: 'bl-alert-75', label: '75% reached' });
  else if (alertsSent['50']) badges.push({ cls: 'bl-alert-50', label: '50% reached' });
  if (badges.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      {badges.map(b => (
        <span key={b.label} className={`bl-alert-badge ${b.cls}`}>
          <Bell size={10} /> {b.label}
        </span>
      ))}
    </div>
  );
}

// ─── Plan Form Modal ──────────────────────────────────────────────────────────

function PlanFormModal({ customer, plan, onClose, onSaved }) {
  const isEdit = !!plan;
  const [form, setForm] = useState(() => {
    if (plan) {
      return {
        planName: plan.planName || '',
        dateRange: { start: plan.dateRange?.start || '', end: plan.dateRange?.end || '' },
        platforms: plan.platforms || [],
        quotas: {
          post:     String(plan.quotas?.post     ?? ''),
          reel:     String(plan.quotas?.reel     ?? ''),
          story:    String(plan.quotas?.story    ?? ''),
          carousel: String(plan.quotas?.carousel ?? ''),
        },
      };
    }
    return { ...EMPTY_FORM, dateRange: { start: '', end: '' }, platforms: [], quotas: { ...EMPTY_QUOTAS } };
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const togglePlatform = (id) =>
    setForm(f => ({
      ...f,
      platforms: f.platforms.includes(id)
        ? f.platforms.filter(p => p !== id)
        : [...f.platforms, id],
    }));

  const setQuota = (key, val) =>
    setForm(f => ({ ...f, quotas: { ...f.quotas, [key]: val } }));

  const validate = () => {
    if (!form.dateRange.start || !form.dateRange.end)
      return 'Please select a date range.';
    if (new Date(form.dateRange.start) > new Date(form.dateRange.end))
      return 'Start date must be before end date.';
    if (form.platforms.length === 0)
      return 'Select at least one platform.';
    const total = Object.values(form.quotas).reduce((s, v) => s + (parseInt(v) || 0), 0);
    if (total === 0)
      return 'Set a quota for at least one content type.';
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        customerId:    customer._id,
        customerName:  customer.name || customer.email || '',
        customerEmail: customer.email || '',
        planName:      form.planName || `Plan ${fmtDate(form.dateRange.start)} – ${fmtDate(form.dateRange.end)}`,
        dateRange:     form.dateRange,
        platforms:     form.platforms,
        quotas: {
          post:     parseInt(form.quotas.post)     || 0,
          reel:     parseInt(form.quotas.reel)     || 0,
          story:    parseInt(form.quotas.story)    || 0,
          carousel: parseInt(form.quotas.carousel) || 0,
        },
        resetAlerts: isEdit, // reset alert flags when editing
      };

      if (isEdit) {
        await apiFetch(`/api/billing/plans/${plan._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch('/api/billing/plans', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bl-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bl-modal">
        <div className="bl-modal-title">
          <CreditCard size={20} color="#6366f1" />
          {isEdit ? 'Edit Billing Plan' : 'New Billing Plan'}
          <button
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>

        {/* Customer info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 20 }}>
          <div className="bl-avatar">{initials(customer.name, customer.email)}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{customer.name || customer.email}</div>
            {customer.name && <div style={{ fontSize: 11.5, color: '#64748b' }}>{customer.email}</div>}
          </div>
        </div>

        {/* Plan name */}
        <div className="bl-field">
          <label className="bl-label">Plan Name</label>
          <input
            className="bl-input"
            placeholder="e.g. June 2025 Social Plan"
            value={form.planName}
            onChange={e => setForm(f => ({ ...f, planName: e.target.value }))}
          />
        </div>

        {/* Date range */}
        <div className="bl-field">
          <label className="bl-label">Date Range</label>
          <div className="bl-grid-2">
            <input
              type="date"
              className="bl-input"
              value={form.dateRange.start}
              onChange={e => setForm(f => ({ ...f, dateRange: { ...f.dateRange, start: e.target.value } }))}
            />
            <input
              type="date"
              className="bl-input"
              value={form.dateRange.end}
              onChange={e => setForm(f => ({ ...f, dateRange: { ...f.dateRange, end: e.target.value } }))}
            />
          </div>
        </div>

        {/* Platforms */}
        <div className="bl-field">
          <label className="bl-label">Platforms</label>
          <div className="bl-plat-grid">
            {PLATFORMS.map(({ id, label, color, Icon }) => {
              const sel = form.platforms.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  className={`bl-plat-toggle${sel ? ' selected' : ''}`}
                  style={sel ? { background: color } : {}}
                  onClick={() => togglePlatform(id)}
                >
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Quotas */}
        <div className="bl-field">
          <label className="bl-label">Content Quotas</label>
          <div className="bl-grid-4">
            {CONTENT_TYPES.map(({ id, label, Icon, color }) => (
              <div key={id}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 5 }}>
                  <Icon size={13} color={color} /> {label}
                </label>
                <input
                  type="number"
                  min="0"
                  className="bl-input"
                  placeholder="0"
                  value={form.quotas[id]}
                  onChange={e => setQuota(id, e.target.value)}
                  style={{ textAlign: 'center' }}
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 9, marginBottom: 16, fontSize: 13, color: '#b91c1c' }}>
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="bl-btn bl-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="bl-btn bl-btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw size={14} className="bl-spinner" /> : <Check size={14} />}
            {isEdit ? 'Save Changes' : 'Create Plan'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ plan, onClose, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/api/billing/plans/${plan._id}`, { method: 'DELETE' });
      onDeleted();
    } catch (e) {
      alert(e.message);
      setDeleting(false);
    }
  };
  return (
    <div className="bl-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bl-modal" style={{ maxWidth: 400 }}>
        <div className="bl-modal-title">
          <Trash2 size={18} color="#ef4444" /> Delete Plan
        </div>
        <div className="bl-confirm-body">
          Are you sure you want to delete <strong>"{plan.planName}"</strong>? This action cannot be undone.
        </div>
        <div className="bl-confirm-actions">
          <button className="bl-btn bl-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="bl-btn bl-btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? <RefreshCw size={14} className="bl-spinner" /> : <Trash2 size={14} />}
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Plan Detail Panel ────────────────────────────────────────────────────────

const POST_TYPE_LABELS = { post: 'Post', reel: 'Reel', story: 'Story', carousel: 'Carousel' };

function PublishedPostsList({ planId }) {
  const [posts, setPosts]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/billing/plans/${planId}/published-posts`)
      .then(data => setPosts(Array.isArray(data) ? data : []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, [planId]);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8', fontSize: 12 }}>
      <RefreshCw size={13} className="bl-spinner" style={{ display: 'inline', marginRight: 5 }} />
      Loading posts…
    </div>
  );

  if (posts.length === 0) return (
    <div style={{ textAlign: 'center', padding: '10px 0', color: '#94a3b8', fontSize: 12 }}>
      No published posts found in this period.
    </div>
  );

  return (
    <div className="bl-posts-list">
      {posts.map(p => (
        <div key={p.id} className="bl-post-item">
          {p.thumbnail
            ? <img src={p.thumbnail} alt="" className="bl-post-thumb" />
            : <div className="bl-post-thumb-placeholder"><Image size={20} /></div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="bl-post-caption">{p.caption || <em style={{ color: '#94a3b8' }}>No caption</em>}</div>
            <div className="bl-post-meta">
              <span className="bl-post-type-badge">
                {CONTENT_TYPES.find(t => t.id === p.postType)?.label || 'Post'}
              </span>
              {p.platforms.map(plat => <PlatformChip key={plat} platformId={plat} />)}
              <span>{fmtDate(p.publishedAt)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PlanDetail({ plan, onEdit, onDelete, onRefresh }) {
  const [loading, setLoading]         = useState(true);
  const [usage, setUsage]             = useState(null);
  const [showPosts, setShowPosts]     = useState(false);

  const loadUsage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`/api/billing/plans/${plan._id}/usage`);
      setUsage(data.usage);
    } catch { setUsage(null); }
    finally { setLoading(false); }
  }, [plan._id]);

  useEffect(() => { loadUsage(); }, [loadUsage]);

  const quotas = plan.quotas || {};
  const totalQuota = Object.values(quotas).reduce((s, v) => s + (v || 0), 0);
  const totalUsedFinal = usage?.total ?? 0;
  const overallPct = getPct(totalUsedFinal, totalQuota);
  const overallColor = progressColor(overallPct);

  return (
    <div className="bl-plan-card">
      <div className="bl-plan-header">
        <div>
          <div className="bl-plan-name">{plan.planName}</div>
          <div className="bl-plan-dates">
            <Calendar size={11} />
            {fmtDate(plan.dateRange?.start)} – {fmtDate(plan.dateRange?.end)}
          </div>
        </div>
        <div className="bl-plan-actions">
          <button className="bl-btn-icon" title="Refresh usage" onClick={loadUsage}>
            <RefreshCw size={13} className={loading ? 'bl-spinner' : ''} />
          </button>
          <button className="bl-btn-icon" title="Edit plan" onClick={() => onEdit(plan)}>
            <Edit2 size={13} />
          </button>
          <button
            className="bl-btn-icon"
            style={{ color: '#ef4444' }}
            title="Delete plan"
            onClick={() => onDelete(plan)}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Platforms */}
      {plan.platforms?.length > 0 && (
        <div className="bl-platforms">
          {plan.platforms.map(p => <PlatformChip key={p} platformId={p} />)}
        </div>
      )}

      {/* Overall progress */}
      <div style={{ marginTop: 14, marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Overall Usage</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: overallColor }}>
            {loading ? '…' : `${totalUsedFinal} / ${totalQuota} (${overallPct}%)`}
          </span>
        </div>
        <div className="bl-progress-bar">
          <div className="bl-progress-fill" style={{ width: loading ? '0%' : `${overallPct}%`, background: overallColor }} />
        </div>
      </div>

      {/* Per-type breakdown */}
      {!loading && usage && (
        <div style={{ marginTop: 10 }}>
          {CONTENT_TYPES.map(type => (
            <ProgressRow key={type.id} type={type} used={usage[type.id] || 0} total={quotas[type.id] || 0} />
          ))}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#94a3b8', fontSize: 12 }}>
          <RefreshCw size={14} className="bl-spinner" style={{ marginRight: 6 }} />
          Loading usage…
        </div>
      )}

      {/* Alert indicators */}
      <AlertBadges alertsSent={plan.alertsSent} />

      {/* View published posts toggle */}
      {!loading && totalUsedFinal > 0 && (
        <button className="bl-view-posts-btn" onClick={() => setShowPosts(v => !v)}>
          {showPosts ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {showPosts ? 'Hide published posts' : `View ${totalUsedFinal} published post${totalUsedFinal !== 1 ? 's' : ''}`}
        </button>
      )}

      {showPosts && <PublishedPostsList planId={plan._id} />}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Billing() {
  const [customers, setCustomers]         = useState([]);
  const [plans, setPlans]                 = useState({});         // { customerId: [plan, …] }
  const [selectedCustomer, setSelected]   = useState(null);
  const [loadingCust, setLoadingCust]     = useState(true);
  const [loadingPlans, setLoadingPlans]   = useState(false);
  const [search, setSearch]               = useState('');
  const [showForm, setShowForm]           = useState(false);
  const [editPlan, setEditPlan]           = useState(null);
  const [deletePlan, setDeletePlan]       = useState(null);
  const [toast, setToast]                 = useState(null);
  // planCounts from overview: { customerId: N }
  const [planCounts, setPlanCounts]       = useState({});

  // Inject styles once
  useEffect(() => {
    const id = 'bl-billing-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id; el.textContent = STYLES;
      document.head.appendChild(el);
    }
  }, []);

  // Load customers + plan counts
  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoadingCust(true);
    try {
      const [custs, allPlansArr] = await Promise.all([
        apiFetch('/customers'),
        apiFetch('/api/billing/plans'),
      ]);
      setCustomers(Array.isArray(custs) ? custs : []);

      // Count plans per customer
      const counts = {};
      (allPlansArr || []).forEach(p => {
        counts[p.customerId] = (counts[p.customerId] || 0) + 1;
      });
      setPlanCounts(counts);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoadingCust(false);
    }
  }

  async function loadPlansForCustomer(customer) {
    setLoadingPlans(true);
    try {
      const data = await apiFetch(`/api/billing/plans?customerId=${customer._id}`);
      setPlans(prev => ({ ...prev, [customer._id]: data || [] }));
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoadingPlans(false);
    }
  }

  const handleSelectCustomer = (customer) => {
    setSelected(customer);
    if (!plans[customer._id]) {
      loadPlansForCustomer(customer);
    }
  };

  const handlePlanSaved = () => {
    setShowForm(false);
    setEditPlan(null);
    if (selectedCustomer) {
      loadPlansForCustomer(selectedCustomer);
    }
    loadCustomers(); // refresh counts
    showToast(editPlan ? 'Plan updated successfully.' : 'Billing plan created.', 'success');
  };

  const handlePlanDeleted = () => {
    setDeletePlan(null);
    if (selectedCustomer) {
      loadPlansForCustomer(selectedCustomer);
    }
    loadCustomers();
    showToast('Plan deleted.', 'info');
  };

  function showToast(msg, type = 'info') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase())
  );

  const custPlans = selectedCustomer ? (plans[selectedCustomer._id] || []) : [];

  return (
    <SuperAdminLayout
      title="Billing Management"
      subtitle="Set subscription plans & track usage quotas per customer"
    >
      {/* Toast */}
      {toast && (
        <div className={`bl-toast ${toast.type}`}>
          {toast.type === 'success' && <Check size={15} />}
          {toast.type === 'error'   && <AlertTriangle size={15} />}
          {toast.msg}
        </div>
      )}

      <div className="bl-panels">
        {/* ── Left: customer list ── */}
        <div className="bl-card">
          <div className="bl-card-header">
            <span className="bl-card-title"><Users size={15} /> Customers</span>
            <button className="bl-btn-icon" onClick={loadCustomers} title="Refresh">
              <RefreshCw size={13} className={loadingCust ? 'bl-spinner' : ''} />
            </button>
          </div>

          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
            <div className="bl-search">
              <Search size={14} className="bl-search-icon" />
              <input
                placeholder="Search customers…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="bl-cust-scroll">
            {loadingCust ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#94a3b8', fontSize: 13 }}>
                <RefreshCw size={16} className="bl-spinner" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="bl-empty">
                <Users size={32} className="bl-empty-icon" />
                <div className="bl-empty-title">No customers</div>
                <div className="bl-empty-sub">No customers match your search.</div>
              </div>
            ) : (
              filtered.map(c => (
                <div
                  key={c._id}
                  className={`bl-cust-item${selectedCustomer?._id === c._id ? ' active' : ''}`}
                  onClick={() => handleSelectCustomer(c)}
                >
                  <div className="bl-avatar">{initials(c.name, c.email)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="bl-cust-name">{c.name || c.email}</div>
                    {c.name && <div className="bl-cust-email">{c.email}</div>}
                  </div>
                  {(planCounts[c._id] || 0) > 0 && (
                    <span className="bl-plan-count">{planCounts[c._id]} plan{planCounts[c._id] !== 1 ? 's' : ''}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Right: plans panel ── */}
        <div className="bl-card">
          {!selectedCustomer ? (
            <div className="bl-empty" style={{ padding: 64 }}>
              <CreditCard size={40} className="bl-empty-icon" />
              <div className="bl-empty-title">Select a customer</div>
              <div className="bl-empty-sub">Choose a customer on the left to manage their billing plans.</div>
            </div>
          ) : (
            <>
              <div className="bl-card-header">
                <div>
                  <span className="bl-card-title">
                    <CreditCard size={15} />
                    {selectedCustomer.name || selectedCustomer.email}
                  </span>
                  <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                    {custPlans.length} active plan{custPlans.length !== 1 ? 's' : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="bl-btn-icon"
                    onClick={() => loadPlansForCustomer(selectedCustomer)}
                    title="Refresh plans"
                  >
                    <RefreshCw size={13} className={loadingPlans ? 'bl-spinner' : ''} />
                  </button>
                  <button
                    className="bl-btn bl-btn-primary bl-btn-sm"
                    onClick={() => { setEditPlan(null); setShowForm(true); }}
                  >
                    <Plus size={13} /> New Plan
                  </button>
                </div>
              </div>

              <div className="bl-plans-scroll">
                {loadingPlans ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 13 }}>
                    <RefreshCw size={16} className="bl-spinner" style={{ display: 'block', margin: '0 auto 8px' }} />
                    Loading plans…
                  </div>
                ) : custPlans.length === 0 ? (
                  <div className="bl-empty">
                    <BarChart2 size={36} className="bl-empty-icon" />
                    <div className="bl-empty-title">No plans yet</div>
                    <div className="bl-empty-sub" style={{ marginBottom: 16 }}>
                      Create a subscription plan to track post quotas and usage.
                    </div>
                    <button
                      className="bl-btn bl-btn-primary"
                      onClick={() => { setEditPlan(null); setShowForm(true); }}
                    >
                      <Plus size={14} /> Create First Plan
                    </button>
                  </div>
                ) : (
                  custPlans.map(p => (
                    <PlanDetail
                      key={p._id}
                      plan={p}
                      onEdit={plan => { setEditPlan(plan); setShowForm(true); }}
                      onDelete={plan => setDeletePlan(plan)}
                      onRefresh={() => loadPlansForCustomer(selectedCustomer)}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showForm && selectedCustomer && (
        <PlanFormModal
          customer={selectedCustomer}
          plan={editPlan}
          onClose={() => { setShowForm(false); setEditPlan(null); }}
          onSaved={handlePlanSaved}
        />
      )}

      {deletePlan && (
        <DeleteConfirmModal
          plan={deletePlan}
          onClose={() => setDeletePlan(null)}
          onDeleted={handlePlanDeleted}
        />
      )}
    </SuperAdminLayout>
  );
}
