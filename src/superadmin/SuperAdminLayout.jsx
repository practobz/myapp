import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Users, Shield,
  QrCode, LogOut, Crown, UserCog, RefreshCw, CreditCard
} from 'lucide-react';

/* ─────────────────────────────────────────────
   Layout CSS
───────────────────────────────────────────── */
const LAYOUT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --sa-sidebar-w:      260px;
    --sa-sidebar-bg:     #0b0f1e;
    --sa-accent:         #6366f1;
    --sa-accent-glow:    rgba(99,102,241,0.35);
    --sa-accent-dk:      #4f46e5;
    --sa-active-bg:      rgba(99,102,241,0.18);
    --sa-hover-bg:       rgba(255,255,255,0.06);
    --sa-border:         rgba(255,255,255,0.07);
    --sa-text:           #f8fafc;
    --sa-muted:          rgba(248,250,252,0.45);
    --sa-content-bg:     #f0f2f8;
    --sa-white:          #ffffff;
    --sa-card-shadow:    0 2px 8px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.08);
    --sa-card-shadow-hv: 0 6px 20px rgba(0,0,0,0.10);
  }

  body { font-family: 'Inter', 'DM Sans', sans-serif; }

  /* ─── Shell ─── */
  .sa2-shell { display: flex; min-height: 100vh; background: var(--sa-content-bg); }

  /* ─── Sidebar ─── */
  .sa2-sidebar {
    width: var(--sa-sidebar-w);
    min-height: 100vh;
    background: linear-gradient(175deg, #0b0f1e 0%, #111827 40%, #1a1040 80%, #0b0f1e 100%);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0;
    z-index: 50;
    border-right: 1px solid var(--sa-border);
    box-shadow: 4px 0 30px rgba(0,0,0,0.25);
  }

  /* Logo */
  .sa2-logo {
    padding: 26px 20px 22px;
    border-bottom: 1px solid var(--sa-border);
    display: flex; align-items: center; gap: 12px;
    text-decoration: none;
  }
  .sa2-logo-icon {
    width: 42px; height: 42px;
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    border-radius: 11px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 18px var(--sa-accent-glow);
    flex-shrink: 0;
  }
  .sa2-logo-title { font-size: 15px; font-weight: 700; color: var(--sa-text); letter-spacing: -0.3px; }
  .sa2-logo-badge {
    display: inline-block; margin-top: 3px;
    font-size: 9.5px; font-weight: 700; letter-spacing: 1.2px;
    text-transform: uppercase; color: var(--sa-accent);
    background: rgba(99,102,241,0.12);
    border: 1px solid rgba(99,102,241,0.25);
    padding: 1px 7px; border-radius: 999px;
  }

  /* Nav */
  .sa2-nav { flex: 1; padding: 18px 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
  .sa2-nav-label {
    font-size: 10px; font-weight: 700; letter-spacing: 1.2px;
    text-transform: uppercase; color: var(--sa-muted);
    padding: 14px 10px 6px;
  }
  .sa2-nav-item {
    display: flex; align-items: center; gap: 11px;
    padding: 10px 12px; border-radius: 9px;
    cursor: pointer; transition: all 0.14s ease;
    color: var(--sa-muted);
    font-size: 13px; font-weight: 500;
    border: 1px solid transparent;
    background: none;
    width: 100%; text-align: left; font-family: inherit;
    position: relative; text-decoration: none;
  }
  .sa2-nav-item:hover { background: var(--sa-hover-bg); color: var(--sa-text); }
  .sa2-nav-item.active {
    background: var(--sa-active-bg);
    color: var(--sa-text);
    border-color: rgba(99,102,241,0.28);
    font-weight: 600;
  }
  .sa2-nav-item.active::before {
    content: '';
    position: absolute; left: -1px; top: 8px; bottom: 8px;
    width: 3px;
    background: linear-gradient(180deg, #6366f1, #8b5cf6);
    border-radius: 0 3px 3px 0;
  }
  .sa2-nav-icon { width: 17px; height: 17px; flex-shrink: 0; }
  .sa2-nav-divider { height: 1px; background: var(--sa-border); margin: 8px 4px; }

  /* Footer */
  .sa2-sidebar-footer { padding: 14px 12px 20px; border-top: 1px solid var(--sa-border); }
  .sa2-logout {
    width: 100%;
    display: flex; align-items: center; gap: 11px;
    padding: 10px 12px; border-radius: 9px;
    cursor: pointer; transition: all 0.14s;
    color: rgba(248,113,113,0.7);
    font-size: 13px; font-weight: 500;
    background: none; border: 1px solid transparent;
    font-family: inherit;
  }
  .sa2-logout:hover {
    background: rgba(239,68,68,0.1);
    color: #f87171;
    border-color: rgba(239,68,68,0.18);
  }

  /* ─── Content area ─── */
  .sa2-content { margin-left: var(--sa-sidebar-w); flex: 1; display: flex; flex-direction: column; }

  /* Top bar */
  .sa2-topbar {
    height: 64px;
    background: var(--sa-white);
    border-bottom: 1px solid #e4e7f0;
    display: flex; align-items: center;
    padding: 0 32px; gap: 16px;
    position: sticky; top: 0; z-index: 40;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    justify-content: space-between;
  }
  .sa2-topbar-left { display: flex; align-items: center; gap: 12px; }
  .sa2-topbar-title { font-size: 17px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px; }
  .sa2-topbar-sub { font-size: 11.5px; color: #64748b; margin-top: 1px; }
  .sa2-topbar-right { display: flex; align-items: center; gap: 10px; }

  /* Page container */
  .sa2-page { flex: 1; padding: 28px 32px; }

  /* Responsive */
  @media (max-width: 900px) {
    :root { --sa-sidebar-w: 68px; }
    .sa2-logo-title, .sa2-logo-badge, .sa2-nav-item span,
    .sa2-nav-label, .sa2-logout span { display: none; }
    .sa2-logo { justify-content: center; padding: 18px 0; }
    .sa2-nav-item { justify-content: center; padding: 12px; }
    .sa2-nav-item.active::before { display: none; }
    .sa2-logout { justify-content: center; padding: 12px; }
    .sa2-topbar { padding: 0 20px; }
    .sa2-page { padding: 20px 16px; }
  }
`;

/* ─────────────────────────────────────────────
   Nav configuration
───────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: 'Dashboard',        path: '/superadmin/dashboard',          icon: LayoutDashboard },
  { label: 'Analytics',        path: '/superadmin/analytics',          icon: BarChart3       },
  { label: 'View Assignments', path: '/superadmin/view-assignments',   icon: Users           },
  { label: 'Billing',          path: '/superadmin/billing',            icon: CreditCard      },
  { label: 'Admin Management', path: '/superadmin/admin-management',   icon: Shield          },
  { label: 'QR Generator',     path: '/superadmin/qr-generator',       icon: QrCode          },
];

/* ─────────────────────────────────────────────
   Layout component
───────────────────────────────────────────── */
const SuperAdminLayout = ({
  children,
  title = 'Dashboard',
  subtitle = '',
  topbarRight = null,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const id = 'sa2-layout-styles';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = LAYOUT_STYLES;
      document.head.appendChild(el);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('superadminToken');
    localStorage.removeItem('currentUser');
    navigate('/superadmin/login');
  };

  const isActive = (path) => {
    if (path === '/superadmin/dashboard') {
      return location.pathname === '/superadmin' || location.pathname === '/superadmin/dashboard';
    }
    return location.pathname === path;
  };

  return (
    <div className="sa2-shell">
      {/* ── Sidebar ── */}
      <aside className="sa2-sidebar">
        {/* Logo */}
        <div className="sa2-logo">
          <div className="sa2-logo-icon">
            <Crown size={20} color="#fff" />
          </div>
          <div>
            <div className="sa2-logo-title">AirSpark</div>
            <div className="sa2-logo-badge">Super Admin</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sa2-nav">
          <div className="sa2-nav-label">Main Menu</div>

          {NAV_ITEMS.slice(0, 4).map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              className={`sa2-nav-item${isActive(path) ? ' active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={17} className="sa2-nav-icon" />
              <span>{label}</span>
            </button>
          ))}

          <div className="sa2-nav-divider" />
          <div className="sa2-nav-label">Management</div>

          {NAV_ITEMS.slice(4).map(({ label, path, icon: Icon }) => (
            <button
              key={path}
              className={`sa2-nav-item${isActive(path) ? ' active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={17} className="sa2-nav-icon" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Footer / Logout */}
        <div className="sa2-sidebar-footer">
          <button className="sa2-logout" onClick={handleLogout}>
            <LogOut size={17} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="sa2-content">
        {/* Top bar */}
        <header className="sa2-topbar">
          <div className="sa2-topbar-left">
            <div>
              <div className="sa2-topbar-title">{title}</div>
              {subtitle && <div className="sa2-topbar-sub">{subtitle}</div>}
            </div>
          </div>
          <div className="sa2-topbar-right">
            {topbarRight}
          </div>
        </header>

        {/* Page slot */}
        <div className="sa2-page">
          {children}
        </div>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
