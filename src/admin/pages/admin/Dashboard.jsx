import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Users, UserCheck, RefreshCw, ArrowUpRight } from 'lucide-react';

/* ─── Skeleton ─────────────────────────────────────────────────────── */
const CardSkeleton = () => (
  <div className="aur-card aur-card--skeleton">
    <div className="aur-avatar sk-block" />
    <div className="aur-card__body">
      <div className="sk-line sk-line--70" />
      <div className="sk-line sk-line--45" />
    </div>
  </div>
);

/* ─── Person Card ──────────────────────────────────────────────────── */
const PersonCard = React.memo(({ person, variant, href }) => {
  const isCustomer = variant === 'customer';
  const Icon = isCustomer ? Users : UserCheck;
  const displayName = person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unnamed';
  return (
    <div onClick={() => window.open(href, '_blank')} className={`aur-card aur-card--${variant} group`}>
      <div className="aur-avatar">
        {person.profileImage
          ? <img src={person.profileImage} alt={displayName} className="aur-avatar__img" />
          : <Icon className="aur-avatar__icon" />}
      </div>
      <div className="aur-card__body">
        <p className="aur-card__name">{displayName}</p>
        <p className="aur-card__email">{person.email}</p>
        {person.companyName && <p className="aur-card__company">{person.companyName}</p>}
      </div>
      <ArrowUpRight className="aur-card__arrow" />
    </div>
  );
});
PersonCard.displayName = 'PersonCard';

/* ─── Section ──────────────────────────────────────────────────────── */
const Section = ({ icon: Icon, label, count, variant, children, empty }) => (
  <section className={`aur-section aur-section--${variant}`}>
    <div className="aur-section__header">
      <div className="aur-section__title">
        <Icon className="aur-section__icon" />
        <span>{label}</span>
      </div>
      <span className={`aur-badge aur-badge--${variant}`}>{count}</span>
    </div>
    {count > 0
      ? <div className="aur-grid">{children}</div>
      : <div className="aur-empty">{empty}</div>}
  </section>
);

/* ─── Dashboard ────────────────────────────────────────────────────── */
function Dashboard() {
  const { currentUser } = useAuth();
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [contentCreators, setContentCreators] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const abortControllerRef = useRef(null);
  const adminName = useMemo(() => {
    if (currentUser?.name) return currentUser.name;
    if (currentUser?.firstName) return currentUser.firstName;
    if (currentUser?.username) return currentUser.username;
    if (currentUser?.email) {
      const parts = currentUser.email.split('@')[0];
      return parts.split(/[._-]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return 'Admin';
  }, [currentUser]);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    isRefresh ? setIsRefreshing(true) : setLoading(true);
    setError('');
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    const opts = { signal };
    try {
      const ps = [];
      if (currentUser?.role === 'admin') {
        ps.push(
          fetch(`${apiUrl}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`, opts)
            .then(r => r.ok ? r.json() : Promise.reject())
            .then(d => ({ type: 'customers', data: d }))
            .catch(e => { if (e?.name === 'AbortError') throw e; return { type: 'customers', data: [] }; })
        );
      } else {
        ps.push(Promise.resolve({ type: 'customers', data: [] }));
      }
      ps.push(
        fetch(`${apiUrl}/users?role=content_creator`, opts)
          .then(r => r.json())
          .then(d => ({ type: 'creators', data: Array.isArray(d) ? d : (d.creators || []) }))
          .catch(e => { if (e?.name === 'AbortError') throw e; return { type: 'creators', data: [] }; })
      );
      ps.push(
        fetch(`${apiUrl}/calendars`, opts)
          .then(r => r.json())
          .then(d => {
            const items = Array.isArray(d) ? d.flatMap(c => Array.isArray(c.contentItems) ? c.contentItems : []) : [];
            return { type: 'content', data: items };
          })
          .catch(e => { if (e?.name === 'AbortError') throw e; return { type: 'content', data: [] }; })
      );
      const results = await Promise.all(ps);
      results.forEach(r => {
        if (r.type === 'customers') setAssignedCustomers(r.data);
        if (r.type === 'creators') setContentCreators(r.data);
        if (r.type === 'content') setContentItems(r.data);
      });
    } catch (e) {
      if (e?.name === 'AbortError') return;
      setError('Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser]);

  useEffect(() => () => abortControllerRef.current?.abort(), []);
  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);
  const handleRefresh = useCallback(() => { if (!isRefreshing) fetchDashboardData(true); }, [fetchDashboardData, isRefreshing]);

  const stats = useMemo(() => ({
    customers: assignedCustomers.length,
    creators: contentCreators.length,
    content: contentItems.length,
  }), [assignedCustomers.length, contentCreators.length, contentItems.length]);

  if (loading) return (
    <AdminLayout title="Dashboard">
      <style>{CSS}</style>
      <div className="aur-page">
        <div className="aur-banner aur-banner--sk" />
        <div className="aur-body">
          {[0, 1].map(i => (
            <div key={i} className="aur-section">
              <div className="aur-section__header">
                <div className="sk-line sk-line--30" />
                <div className="sk-block sk-block--badge" />
              </div>
              <div className="aur-grid">
                {[1, 2, 3].map(j => <CardSkeleton key={j} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );

  if (error) return (
    <AdminLayout title="Dashboard">
      <style>{CSS}</style>
      <div className="aur-error">
        <p className="aur-error__msg">{error}</p>
        <button onClick={handleRefresh} className="aur-btn-retry">
          <RefreshCw className="w-3.5 h-3.5" /> Try Again
        </button>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="Dashboard">
      <style>{CSS}</style>
      <div className="aur-page">

        {/* ── Banner ── */}
        <div className="aur-banner">
          <div className="aur-banner__noise" />
          <div className="aur-banner__left">
            <div className="aur-banner__eyebrow">Aureum Solutions</div>
            <h1 className="aur-banner__title">
              Welcome, {adminName}
            </h1>
            <p className="aur-banner__sub">
              Manage your social media operations
            </p>
          </div>
          <div className="aur-banner__right">
            <div className="aur-pill">
              <span className="aur-pill__num">{stats.customers}</span>
              <span className="aur-pill__label">Customers</span>
            </div>
            <div className="aur-pill">
              <span className="aur-pill__num">{stats.creators}</span>
              <span className="aur-pill__label">Creators</span>
            </div>
            <div className="aur-pill">
              <span className="aur-pill__num">{stats.content}</span>
              <span className="aur-pill__label">Content</span>
            </div>
            <button onClick={handleRefresh} disabled={isRefreshing} className="aur-refresh" title="Refresh">
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'aur-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="aur-body">
          <Section icon={Users} label="Customers" count={stats.customers} variant="customer" empty="No customers assigned yet.">
            {assignedCustomers.map((c, i) => (
              <div key={c._id || c.id} className="aur-enter" style={{ animationDelay: `${i * 35}ms` }}>
                <PersonCard person={c} variant="customer" href={`/#/admin/customer-details/${c._id || c.id}`} />
              </div>
            ))}
          </Section>

          <Section icon={UserCheck} label="Content Creators" count={stats.creators} variant="creator" empty="No content creators found.">
            {contentCreators.map((c, i) => (
              <div key={c._id || c.id} className="aur-enter" style={{ animationDelay: `${i * 35}ms` }}>
                <PersonCard person={c} variant="creator" href={`/#/admin/content-creator-details/${c._id || c.id}`} />
              </div>
            ))}
          </Section>
        </div>

      </div>
    </AdminLayout>
  );
}

/* ─── Styles ───────────────────────────────────────────────────────── */
const CSS = `
/* ── Tokens ── */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');

:root {
  --c-terra:   #2374AB; /* Spanish Blue */
  --c-olive:   #4DCCBD; /* Medium Turquoise */
  --c-forest:  #231651; /* Russian Violet */
  --c-warm:    #D6FFF6; /* Light Cyan */
  --c-cream:   #F3F1F8; /* Soft Lavender page bg */
  --c-white:   #FFFFFF;
  --c-ink:     #231651; /* Russian Violet for text */
  --c-muted:   #504E63;
  --c-border:  #E2DFEB;
  --c-terra-light: #E9F1F7;
  --c-olive-light: #EBFAF7;
  --c-coral:   #FF8484; /* Light Coral */
  --r-card: 10px;
  --r-banner: 14px;
}

/* ── Page shell ── */
.aur-page {
  background: var(--c-cream);
  min-height: 100vh;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Banner ── */
.aur-banner {
  background: url('/banner.png') center/cover no-repeat;
  border-radius: 0; /* Make it full layout banner */
  padding: 48px 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  position: relative;
  overflow: hidden;
  margin-bottom: 20px;
}
.aur-banner__noise {
  position: absolute;
  inset: 0;
  background-image:
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 22px,
      rgba(255,255,255,0.018) 22px,
      rgba(255,255,255,0.018) 23px
    );
  pointer-events: none;
}
.aur-banner--sk {
  height: 86px;
  opacity: 0.3;
  animation: aurPulse 1.4s ease-in-out infinite;
}
.aur-banner__left { position: relative; z-index: 1; }
.aur-banner__eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--c-coral);
  margin-bottom: 5px;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}
.aur-banner__title {
  font-family: 'Outfit', sans-serif;
  font-size: 32px;
  font-weight: 800;
  color: var(--c-white);
  letter-spacing: -0.03em;
  line-height: 1.15;
  margin: 0 0 4px;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8), 0 1px 3px rgba(0, 0, 0, 0.5);
}
.aur-banner__sub {
  font-size: 13px;
  color: var(--c-white);
  font-weight: 500;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
}
.aur-banner__right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
}

/* ── Stat pills ── */
.aur-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 16px;
  background: rgba(35, 22, 81, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  min-width: 64px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.aur-pill__num {
  font-size: 18px;
  font-weight: 700;
  color: var(--c-white);
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}
.aur-pill__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-warm);
  opacity: 0.95;
  margin-top: 3px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* ── Refresh button ── */
.aur-refresh {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(35, 22, 81, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 7px;
  color: var(--c-warm);
  cursor: pointer;
  transition: background 0.15s;
  margin-left: 4px;
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}
.aur-refresh:hover { background: rgba(35, 22, 81, 0.85); }
.aur-refresh:disabled { opacity: 0.45; cursor: not-allowed; }
.aur-spin { animation: aurSpin 0.8s linear infinite; }
@keyframes aurSpin { to { transform: rotate(360deg); } }

/* ── Body ── */
.aur-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* ── Section ── */
.aur-section {
  background: var(--c-white);
  border: 1px solid var(--c-border);
  border-radius: 12px;
  padding: 16px 18px;
}
.aur-section--customer { border-top: 3px solid var(--c-terra); }
.aur-section--creator  { border-top: 3px solid var(--c-olive); }

.aur-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.aur-section__title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 700;
  color: var(--c-ink);
  letter-spacing: -0.01em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.aur-section__icon {
  width: 14px;
  height: 14px;
  color: var(--c-muted);
}
.aur-section--customer .aur-section__icon { color: var(--c-terra); }
.aur-section--creator  .aur-section__icon { color: var(--c-olive); }

/* ── Badge ── */
.aur-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
}
.aur-badge--customer { background: var(--c-terra-light); color: var(--c-terra); }
.aur-badge--creator  { background: var(--c-olive-light); color: var(--c-olive); }

/* ── Grid ── */
.aur-grid {
  display: grid;
  grid-template-columns: repeat(1, 1fr);
  gap: 8px;
}
@media (min-width: 580px)  { .aur-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .aur-grid { grid-template-columns: repeat(3, 1fr); } }

/* ── Card ── */
.aur-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--c-white);
  border: 1px solid var(--c-border);
  border-radius: var(--r-card);
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, box-shadow 0.15s;
  position: relative;
}
.aur-card:hover {
  background: #F9FFFD;
  border-color: #9CE3D5;
  box-shadow: 0 4px 12px rgba(35, 22, 81, 0.08);
}
.aur-card--skeleton { cursor: default; pointer-events: none; }

/* ── Avatar ── */
.aur-avatar {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.aur-card--customer .aur-avatar { background: var(--c-terra-light); }
.aur-card--creator  .aur-avatar { background: var(--c-olive-light); }
.aur-avatar__img  { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.aur-avatar__icon { width: 18px; height: 18px; }
.aur-card--customer .aur-avatar__icon { color: var(--c-terra); }
.aur-card--creator  .aur-avatar__icon { color: var(--c-olive); }

/* ── Card body ── */
.aur-card__body  { flex: 1; min-width: 0; }
.aur-card__name  { font-size: 15px; font-weight: 600; color: var(--c-ink); truncate; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.15s; }
.aur-card:hover .aur-card__name { color: var(--c-terra); }
.aur-card--creator:hover .aur-card__name { color: var(--c-olive); }
.aur-card__email   { font-size: 13px; color: var(--c-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }
.aur-card__company { font-size: 11.5px; color: #A9A79F; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }

/* ── Arrow ── */
.aur-card__arrow {
  width: 13px;
  height: 13px;
  color: #C8C4BC;
  flex-shrink: 0;
  opacity: 0;
  transform: translateX(-3px);
  transition: opacity 0.15s, transform 0.15s;
}
.aur-card:hover .aur-card__arrow { opacity: 1; transform: translateX(0); }
.aur-card--customer:hover .aur-card__arrow { color: var(--c-terra); }
.aur-card--creator:hover  .aur-card__arrow { color: var(--c-olive); }

/* ── Empty ── */
.aur-empty {
  padding: 18px 0;
  text-align: center;
  font-size: 12px;
  color: var(--c-muted);
  border: 1.5px dashed var(--c-border);
  border-radius: 8px;
}

/* ── Error ── */
.aur-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 260px;
}
.aur-error__msg { font-size: 13px; color: var(--c-muted); }
.aur-btn-retry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 16px;
  background: var(--c-terra);
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}
.aur-btn-retry:hover { background: #C05A38; }

/* ── Skeleton blocks ── */
.sk-block {
  background: var(--c-border);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  animation: aurPulse 1.4s ease-in-out infinite;
}
.sk-block--badge { border-radius: 20px; width: 28px; height: 16px; }
.sk-line {
  background: var(--c-border);
  border-radius: 4px;
  height: 10px;
  animation: aurPulse 1.4s ease-in-out infinite;
}
.sk-line--70 { width: 70%; }
.sk-line--45 { width: 45%; margin-top: 5px; }
.sk-line--30 { width: 30%; height: 12px; }
@keyframes aurPulse { 0%,100%{opacity:1} 50%{opacity:0.45} }

/* ── Enter animation ── */
.aur-enter { animation: aurUp 0.3s ease-out both; }
@keyframes aurUp {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Responsive banner ── */
@media (max-width: 580px) {
  .aur-banner { flex-direction: column; align-items: flex-start; gap: 12px; padding: 18px 16px; }
  .aur-banner__title { font-size: 17px; }
  .aur-banner__right { width: 100%; }
  .aur-pill { padding: 5px 10px; min-width: 50px; }
}
`;

export default Dashboard;