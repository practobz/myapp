import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Clock, MessageSquare, CheckCircle, Globe, User, ChevronDown, Palette, Eye, Image, FolderOpen, Users, ClipboardList, Send, Bell, ShieldCheck, ArrowUpRight, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from "../admin/contexts/AuthContext";
import Logo from '../admin/components/layout/Logo';
import ContentCreatorLayout from './Layout';

const parsePlatforms = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => String(v).trim()).filter(Boolean);
  const s = String(val);
  if (s.includes(',')) return s.split(',').map(v => v.trim()).filter(Boolean);
  if (s.includes(' ')) return s.split(/\s+/).map(v => v.trim()).filter(Boolean);
  return [s];
};

const platformColor = (p) => {
  switch ((p || '').toLowerCase()) {
    case 'facebook': return 'bg-blue-100 text-blue-800';
    case 'instagram': return 'bg-pink-100 text-pink-800';
    case 'youtube': return 'bg-red-100 text-red-800';
    case 'linkedin': return 'bg-blue-50 text-blue-700';
    case 'twitter': return 'bg-sky-100 text-sky-800';
    case 'tiktok': return 'bg-gray-900 text-white';
    default: return 'bg-gray-100 text-gray-700';
  }
};

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
const PersonCard = React.memo(({ person, variant, href, contentCount, yetToUploadCount }) => {
  const isCustomer = variant === 'customer';
  const Icon = isCustomer ? Users : UserCheck;
  const displayName = person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim() || 'Unnamed';
  const navigate = useNavigate();

  const handleOpen = () => {
    if (variant === 'customer') {
      const targetUrl = `${window.location.origin}${window.location.pathname}#${href}`;
      window.open(targetUrl, '_blank');
    } else {
      navigate(href);
    }
  };

  return (
    <div onClick={handleOpen} className={`aur-card aur-card--${variant} group`}>
      <div className="aur-avatar">
        {person.profileImage
          ? <img src={person.profileImage} alt={displayName} className="aur-avatar__img" />
          : <Icon className="aur-avatar__icon" />}
      </div>
      <div className="aur-card__body">
        <p className="aur-card__name">{displayName}</p>
        <p className="aur-card__email">{person.email}</p>
        {person.companyName && <p className="aur-card__company">{person.companyName}</p>}
        {variant === 'customer' && (
          <div className="flex gap-2 flex-wrap items-center">
            {typeof contentCount === 'number' && (
              <div className="aur-card__count">
                <span className="aur-card__count-num">{contentCount}</span>
                <span className="aur-card__count-label">{contentCount === 1 ? 'Content Item' : 'Content Items'}</span>
              </div>
            )}
            {typeof yetToUploadCount === 'number' && (
              <div className="aur-card__count aur-card__count--pending">
                <span className="aur-card__count-num">{yetToUploadCount}</span>
                <span className="aur-card__count-label">Yet to Upload</span>
              </div>
            )}
          </div>
        )}
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

// Helper to get creator email from localStorage
function getCreatorEmail() {
  let email = '';
  try {
    email = (localStorage.getItem('userEmail') || '').toLowerCase();
    if (!email) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.email) {
          email = userObj.email.toLowerCase();
        }
      }
    }
  } catch (e) {
    email = '';
  }
  return email;
}

function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Real assignments data
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  
  // Scheduled posts to check published status
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  const creatorEmail = getCreatorEmail();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail) {
      navigate('/content-creator/login');
    }
  }, [creatorEmail, navigate]);

  useEffect(() => {
    if (!creatorEmail) return;
    const fetchAssignments = async () => {
      setLoading(true);
      try {
        const [calRes, custRes] = await Promise.all([
          fetch(`${process.env.REACT_APP_API_URL}/calendars`),
          fetch(`${process.env.REACT_APP_API_URL}/api/customers`)
        ]);
        const calendars = await calRes.json();
        const custData = custRes.ok ? await custRes.json() : { customers: [] };
        setCustomers(custData.customers || []);
        const customerMap = {};
        (custData.customers || []).forEach(c => {
          customerMap[c._id || c.id] = c.name || '';
        });
        let allAssignments = [];
        calendars.forEach(calendar => {
          if (Array.isArray(calendar.contentItems)) {
            const resolvedCustomerName =
              customerMap[calendar.customerId] ||
              calendar.customerName ||
              '';
            calendar.contentItems.forEach((item, index) => {
              allAssignments.push({
                ...item,
                customerName: resolvedCustomerName,
                customerId: calendar.customerId || calendar.customer_id || calendar.customer?._id || '',
                customer: resolvedCustomerName,
                calendarId: calendar._id || calendar.id,
                itemIndex: index,
                id: item.id || item._id || item.title || Math.random().toString(36).slice(2)
              });
            });
          }
        });
        const filtered = allAssignments.filter(item =>
          String(item.assignedTo || '').toLowerCase() === creatorEmail
        );
        setAssignments(filtered);
      } catch (err) {
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };
    
    const fetchScheduledPosts = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
        if (!res.ok) {
          throw new Error(`Failed to fetch scheduled posts: ${res.statusText}`);
        }
        const data = await res.json();
        setScheduledPosts(data);
      } catch (err) {
        console.error('Failed to fetch scheduled posts:', err);
        setScheduledPosts([]); // Ensure scheduledPosts is an empty array on error
      }
    };
    
    const fetchSubmissions = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
        const data = res.ok ? await res.json() : [];
        const creatorSubs = Array.isArray(data)
          ? data.filter(sub => String(sub.created_by || '').toLowerCase() === creatorEmail)
          : [];
        setSubmissions(creatorSubs);
      } catch (err) {
        setSubmissions([]);
      }
    };

    fetchAssignments();
    fetchScheduledPosts();
    fetchSubmissions();
  }, [creatorEmail]);

  // Precomputed Sets for reliable submission-based filtering (same logic as Assignments.jsx)
  const submissionFilterSets = useMemo(() => {
    const adminApprovedKeys = new Set();
    const customerApprovedKeys = new Set();
    const reviewKeys = new Set();
    const anySubmissionKeys = new Set();
    submissions.forEach(s => {
      const keys = [];
      if (s.assignment_id) keys.push(String(s.assignment_id));
      if (s.item_id && String(s.item_id) !== String(s.assignment_id)) keys.push(String(s.item_id));
      if (s.calendar_id && s.item_index !== undefined && s.item_index !== null) {
        keys.push(`${s.calendar_id}::${Number(s.item_index)}`);
      }
      const stage = s.submission_stage || s.submissionStage || '';
      // Track every assignment that has any submission
      keys.forEach(k => anySubmissionKeys.add(k));
      
      const isCustomerApproved = s.approved_by_customer === true || s.status === 'approved_customer' || s.status === 'approved_both';
      const isAdminApproved = s.approved_by_admin === true || s.status === 'approved_admin' || s.status === 'approved_both' || (s.status === 'approved' && !s.approved_by_customer) || stage === 'customer';

      if (isAdminApproved) {
        keys.forEach(k => adminApprovedKeys.add(k));
      }
      if (isCustomerApproved) {
        keys.forEach(k => customerApprovedKeys.add(k));
      }
      if (stage === 'customer' && Array.isArray(s.comments) && s.comments.length > 0) {
        keys.forEach(k => reviewKeys.add(k));
      }
    });
    return { adminApprovedKeys, customerApprovedKeys, reviewKeys, anySubmissionKeys };
  }, [submissions]);

  const assignedCustomerIds = useMemo(() => {
    return new Set(assignments.map(a => a.customerId).filter(Boolean));
  }, [assignments]);

  const assignedCustomers = useMemo(() => {
    return customers.filter(c => assignedCustomerIds.has(c._id || c.id));
  }, [customers, assignedCustomerIds]);

  const assignmentMatchesSet = (assignment, set) => {
    if (!set.size) return false;
    const id = String(assignment.id || assignment._id || '');
    if (id && set.has(id)) return true;
    if (assignment.calendarId && assignment.itemIndex !== undefined) {
      if (set.has(`${assignment.calendarId}::${Number(assignment.itemIndex)}`)) return true;
    }
    return false;
  };

  // Helper: check if content is published on any platform
  const isContentPublished = (assignmentId) => {
    return scheduledPosts.some(post => post.contentId === assignmentId && post.status === 'published');
  };
  
  // Helper: get actual status considering published posts and item.published field
  const getActualStatus = (assignment) => {
    // Check if the item itself is marked as published
    if (assignment.published === true) {
      return 'published';
    }
    if (isContentPublished(assignment.id || assignment._id)) {
      return 'published';
    }
    return assignment.status || 'assigned';
  };

  // Helper: get display status (mirrors Assignments.jsx logic)
  const getFilterStatus = (assignment) => {
    const actual = getActualStatus(assignment);
    if (actual === 'published') return 'published';
    if (assignmentMatchesSet(assignment, submissionFilterSets.customerApprovedKeys)) return 'approved';
    if (assignmentMatchesSet(assignment, submissionFilterSets.adminApprovedKeys)) return 'approved';
    const hasSubmission = assignmentMatchesSet(assignment, submissionFilterSets.anySubmissionKeys);
    if (!hasSubmission && actual === 'approved') return 'approved';
    return 'pending';
  };

  // Calculate stats from assignments
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const { stats, adminApprovedCount, customerApprovedCount, reviewCount } = useMemo(() => {
    return {
      adminApprovedCount:  assignments.filter(a => assignmentMatchesSet(a, submissionFilterSets.adminApprovedKeys)).length,
      customerApprovedCount: assignments.filter(a => assignmentMatchesSet(a, submissionFilterSets.customerApprovedKeys)).length,
      reviewCount: assignments.filter(a => assignmentMatchesSet(a, submissionFilterSets.reviewKeys)).length,
      stats: {
        newContentAssigned: assignments.filter(a => {
          const refDate = a.assignedAt || a.createdAt;
          if (refDate) return new Date(refDate) >= oneWeekAgo;
          return getActualStatus(a) === 'pending';
        }).length,
        contentWaitingInputs: assignments.filter(a => getActualStatus(a) === 'pending').length,
        contentPublished: assignments.filter(a => getActualStatus(a) === 'published').length,
        totalAssigned: assignments.length
      }
    };
  }, [assignments, scheduledPosts, submissions, submissionFilterSets]);

  // Recent assignments: show only truly fresh (no submission yet) or revision-requested items
  const pendingRecentAssignments = assignments.filter(a => {
    if (getFilterStatus(a) !== 'pending') return false;
    // If already submitted (under review), exclude unless revision was requested
    if (assignmentMatchesSet(a, submissionFilterSets.anySubmissionKeys)) {
      const latestSub = submissions
        .filter(s => {
          if (s.assignment_id && String(s.assignment_id) === String(a.id || a._id || '')) return true;
          if (a.calendarId && a.itemIndex !== undefined &&
              s.calendar_id === a.calendarId && String(s.item_index) === String(a.itemIndex)) return true;
          return false;
        })
        .sort((x, y) => new Date(y.created_at || 0) - new Date(x.created_at || 0))[0];
      return latestSub?.status === 'revision_requested';
    }
    return true;
  });
  const recentAssignments = (pendingRecentAssignments.length > 0 ? pendingRecentAssignments : assignments)
    .sort((a, b) => {
      const da = new Date(a.assignedAt || a.createdAt || a.dueDate || 0);
      const db = new Date(b.assignedAt || b.createdAt || b.dueDate || 0);
      return db - da;
    })
    .slice(0, 3);

  const handleUserMenuToggle = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const handleLogout = () => {
    logout();
    localStorage.removeItem('userEmail');
    navigate('/content-creator/login');
  };

  return (
    <ContentCreatorLayout title="Content Creator Portal" subtitle="Manage assignments & progress" fullWidthContent={true}>
      <style>{CSS}</style>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 rounded-2xl shadow-lg p-6 sm:p-8 text-white">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome, Content Creator!</h1>
          <p className="text-purple-100 text-sm sm:text-base max-w-xl">Manage your content assignments and track your progress</p>
        </div>

        {/* Customers Section */}
        <Section icon={Users} label="Customers" count={assignedCustomers.length} variant="customer" empty="No customers assigned yet.">
          {loading ? (
            [1, 2, 3].map(j => <CardSkeleton key={j} />)
          ) : (
            assignedCustomers.map((c, i) => {
              const customerId = c._id || c.id;
              const customerAssignments = assignments.filter(item => item.customerId === customerId);
              const count = customerAssignments.length;
              const yetToUploadCount = customerAssignments.filter(a => !assignmentMatchesSet(a, submissionFilterSets.anySubmissionKeys)).length;
              return (
                <div key={customerId} className="aur-enter" style={{ animationDelay: `${i * 35}ms` }}>
                  <PersonCard
                    person={c}
                    variant="customer"
                    href={`/content-creator/assignments?expand=${customerId}`}
                    contentCount={count}
                    yetToUploadCount={yetToUploadCount}
                  />
                </div>
              );
            })
          )}
        </Section>
      </div>
    </ContentCreatorLayout>
  );
}

const CSS = `
/* ── Tokens ── */
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');

:root {
  --aur-c-terra:   #2374AB; /* Spanish Blue */
  --aur-c-olive:   #4DCCBD; /* Medium Turquoise */
  --aur-c-forest:  #231651; /* Russian Violet */
  --aur-c-warm:    #D6FFF6; /* Light Cyan */
  --aur-c-cream:   #F3F1F8; /* Soft Lavender page bg */
  --aur-c-white:   #FFFFFF;
  --aur-c-ink:     #231651; /* Russian Violet for text */
  --aur-c-muted:   #504E63;
  --aur-c-border:  #E2DFEB;
  --aur-c-terra-light: #E9F1F7;
  --aur-c-olive-light: #EBFAF7;
  --aur-c-coral:   #FF8484; /* Light Coral */
  --aur-r-card: 10px;
  --aur-r-banner: 14px;
}

/* ── Section ── */
.aur-section {
  background: var(--aur-c-white);
  border: 1px solid var(--aur-c-border);
  border-radius: 12px;
  padding: 16px 18px;
}
.aur-section--customer { border-top: 3px solid var(--aur-c-terra); }
.aur-section--creator  { border-top: 3px solid var(--aur-c-olive); }

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
  color: var(--aur-c-ink);
  letter-spacing: -0.01em;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.aur-section__icon {
  width: 14px;
  height: 14px;
  color: var(--aur-c-muted);
}
.aur-section--customer .aur-section__icon { color: var(--aur-c-terra); }
.aur-section--creator  .aur-section__icon { color: var(--aur-c-olive); }

/* ── Badge ── */
.aur-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
}
.aur-badge--customer { background: var(--aur-c-terra-light); color: var(--aur-c-terra); }
.aur-badge--creator  { background: var(--aur-c-olive-light); color: var(--aur-c-olive); }

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
  background: var(--aur-c-white);
  border: 1px solid var(--aur-c-border);
  border-radius: var(--aur-r-card);
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
.aur-card--customer .aur-avatar { background: var(--aur-c-terra-light); }
.aur-card--creator  .aur-avatar { background: var(--aur-c-olive-light); }
.aur-avatar__img  { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.aur-avatar__icon { width: 18px; height: 18px; }
.aur-card--customer .aur-avatar__icon { color: var(--aur-c-terra); }
.aur-card--creator  .aur-avatar__icon { color: var(--aur-c-olive); }

/* ── Card body ── */
.aur-card__body  { flex: 1; min-width: 0; }
.aur-card__name  { font-size: 15px; font-weight: 600; color: var(--aur-c-ink); truncate; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.15s; }
.aur-card:hover .aur-card__name { color: var(--aur-c-terra); }
.aur-card--creator:hover .aur-card__name { color: var(--aur-c-olive); }
.aur-card__email   { font-size: 13px; color: var(--aur-c-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }
.aur-card__company { font-size: 11.5px; color: #A9A79F; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 1px; }

/* ── Customer Content Count Pill ── */
.aur-card__count {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  padding: 2px 6px;
  background: var(--aur-c-terra-light);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--aur-c-terra);
  width: fit-content;
  transition: background-color 0.15s, color 0.15s;
}
.aur-card:hover .aur-card__count {
  background: var(--aur-c-terra);
  color: var(--aur-c-white);
}
.aur-card__count--pending {
  background: #FEF3C7;
  color: #D97706;
}
.aur-card:hover .aur-card__count--pending {
  background: #D97706;
  color: var(--aur-c-white);
}

/* ── Card Action Buttons ── */
.aur-card__actions {
  display: flex;
  gap: 6px;
  margin-top: 10px;
}
.aur-card__btn {
  font-family: 'Outfit', sans-serif;
  font-size: 11px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.aur-card__btn--customer {
  background-color: var(--aur-c-terra-light);
  color: var(--aur-c-terra);
  border-color: rgba(35, 116, 171, 0.2);
}
.aur-card__btn--customer:hover {
  background-color: var(--aur-c-terra);
  color: var(--aur-c-white);
  box-shadow: 0 2px 6px rgba(35, 116, 171, 0.15);
}
.aur-card__btn--internal {
  background-color: var(--aur-c-olive-light);
  color: var(--aur-c-olive);
  border-color: rgba(77, 204, 189, 0.2);
}
.aur-card__btn--internal:hover {
  background-color: var(--aur-c-olive);
  color: var(--aur-c-white);
  box-shadow: 0 2px 6px rgba(77, 204, 189, 0.15);
}

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
.aur-card--customer:hover .aur-card__arrow { color: var(--aur-c-terra); }
.aur-card--creator:hover  .aur-card__arrow { color: var(--aur-c-olive); }

/* ── Empty ── */
.aur-empty {
  padding: 18px 0;
  text-align: center;
  font-size: 12px;
  color: var(--aur-c-muted);
  border: 1.5px dashed var(--aur-c-border);
  border-radius: 8px;
}

/* ── Skeleton blocks ── */
.sk-block {
  background: var(--aur-c-border);
  border-radius: 50%;
  width: 34px;
  height: 34px;
  animation: aurPulse 1.4s ease-in-out infinite;
}
.sk-block--badge { border-radius: 20px; width: 28px; height: 16px; }
.sk-line {
  background: var(--aur-c-border);
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
`;

export default Dashboard;