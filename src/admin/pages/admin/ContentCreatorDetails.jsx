import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Building,
  Hash,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Palette,
  Award,
  Shield,
  RefreshCw,
  Briefcase,
  Clock,
  CheckCircle,
  FileText,
  Users
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Skeleton components
const ProfileSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
    <div className="flex items-start gap-5 mb-6">
      <div className="h-16 w-16 bg-gray-200 rounded-xl" />
      <div className="flex-1 space-y-3">
        <div className="h-6 w-48 bg-gray-200 rounded" />
        <div className="h-4 w-32 bg-gray-100 rounded" />
      </div>
      <div className="h-7 w-20 bg-gray-200 rounded-full" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="p-4 bg-gray-50 rounded-lg">
          <div className="h-3 w-16 bg-gray-200 rounded mb-2" />
          <div className="h-5 w-24 bg-gray-100 rounded" />
        </div>
      ))}
    </div>
  </div>
);

const CustomerGroupSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="p-5 flex items-center gap-4">
      <div className="h-11 w-11 bg-gray-200 rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="h-5 w-40 bg-gray-200 rounded" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
      </div>
      <div className="h-5 w-5 bg-gray-200 rounded" />
    </div>
  </div>
);

// Helper functions outside component
const getCustomerColor = (name) => {
  const colors = [
    'bg-blue-600', 'bg-emerald-600', 'bg-purple-600', 'bg-amber-600',
    'bg-rose-600', 'bg-cyan-600', 'bg-indigo-600', 'bg-teal-600'
  ];
  const index = (name || '').charCodeAt(0) % colors.length;
  return colors[index];
};

const getCustomerInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

const getStatusConfig = (status) => {
  const configs = {
    published: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    approved: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    under_review: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    in_progress: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    pending: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
  };
  return configs[status] || configs.pending;
};

// Memoized info item component - compact version
const InfoItem = memo(({ icon: Icon, label, value, mono }) => (
  <div className="flex items-center gap-2.5 py-2 px-3 bg-gray-50/70 rounded-lg">
    <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
    <div className="min-w-0 flex-1">
      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</span>
      <p className={`text-sm font-medium text-gray-900 truncate ${mono ? 'font-mono' : ''}`}>
        {value || 'Not provided'}
      </p>
    </div>
  </div>
));
InfoItem.displayName = 'InfoItem';

// Memoized content item component
const ContentItemCard = memo(({ item, status, statusConfig, formatDate }) => (
  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <div className="h-9 w-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <FileText className="h-4 w-4 text-gray-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-900 truncate">{item.description || 'Untitled'}</p>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Due: {formatDate(item.date)}
        </p>
      </div>
    </div>
    <span className={`px-2 py-1 rounded-md text-xs font-medium ${statusConfig.bg} ${statusConfig.text} border ${statusConfig.border}`}>
      {status.replace('_', ' ')}
    </span>
  </div>
));
ContentItemCard.displayName = 'ContentItemCard';

// Memoized calendar card component
const CalendarCard = memo(({ calendar, isExpanded, onToggle, formatDate, getItemStatus }) => {
  const publishedCount = useMemo(() => 
    calendar.contentItems?.filter(item => getItemStatus(item) === 'published').length || 0,
    [calendar.contentItems, getItemStatus]
  );
  const totalCount = calendar.contentItems?.length || 0;
  const progressPercent = totalCount > 0 ? Math.round((publishedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-gray-100/50 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <div className="min-w-0 text-left">
            <h4 className="text-sm font-medium text-gray-900 truncate">{calendar.name}</h4>
            <p className="text-xs text-gray-500">{totalCount} items</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs text-gray-600 tabular-nums">{publishedCount}/{totalCount}</span>
            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && calendar.contentItems && calendar.contentItems.length > 0 && (
        <div className="p-3 pt-0 space-y-2">
          {calendar.contentItems.map((item, index) => {
            const itemStatus = getItemStatus(item);
            const statusConfig = getStatusConfig(itemStatus);
            return (
              <ContentItemCard
                key={item.id || index}
                item={item}
                status={itemStatus}
                statusConfig={statusConfig}
                formatDate={formatDate}
              />
            );
          })}
        </div>
      )}
      
      {isExpanded && (!calendar.contentItems || calendar.contentItems.length === 0) && (
        <div className="p-4 text-center text-sm text-gray-500">No content items</div>
      )}
    </div>
  );
});
CalendarCard.displayName = 'CalendarCard';

// Memoized customer group component
const CustomerGroup = memo(({ 
  customer, 
  calendars, 
  isExpanded, 
  expandedCalendars,
  onToggleCustomer, 
  onToggleCalendar,
  formatDate,
  getItemStatus
}) => {
  const stats = useMemo(() => {
    let total = 0, published = 0;
    calendars.forEach(cal => {
      cal.contentItems?.forEach(item => {
        total++;
        if (getItemStatus(item) === 'published') published++;
      });
    });
    return { total, published, pending: total - published };
  }, [calendars, getItemStatus]);

  const progressPercent = stats.total > 0 ? Math.round((stats.published / stats.total) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => onToggleCustomer(customer.id)}
        className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className={`h-11 w-11 ${getCustomerColor(customer.name)} rounded-lg flex items-center justify-center text-white font-semibold text-sm`}>
            {getCustomerInitials(customer.name)}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">{customer.name}</h3>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                {calendars.length} calendar{calendars.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                {stats.published} published
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-amber-500" />
                {stats.pending} pending
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 min-w-[40px] text-right tabular-nums">
              {progressPercent}%
            </span>
            <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-5 pb-5 space-y-2">
          {calendars.map(calendar => (
            <CalendarCard
              key={calendar._id}
              calendar={calendar}
              isExpanded={expandedCalendars.has(calendar._id)}
              onToggle={() => onToggleCalendar(calendar._id)}
              formatDate={formatDate}
              getItemStatus={getItemStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
});
CustomerGroup.displayName = 'CustomerGroup';

function ContentCreatorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [assignedCalendars, setAssignedCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCalendars, setExpandedCalendars] = useState(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchCreatorDetails();
    fetchScheduledPosts();
  }, [id]);

  useEffect(() => {
    if (creator) {
      fetchAssignedCalendars();
    }
  }, [creator]);

  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/scheduled-posts`);
      if (response.ok) {
        const posts = await response.json();
        setScheduledPosts(Array.isArray(posts) ? posts : []);
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
      setScheduledPosts([]);
    }
  };

  // Check if item is published (manual or via scheduled post)
  const isItemPublished = useCallback((item) => {
    // Check manual publish flag
    if (item.published === true) return true;
    // Check scheduled posts
    return scheduledPosts.some(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.item_name && post.item_name === (item.title || item.description))) &&
      (post.status === 'published' || post.publishedAt)
    );
  }, [scheduledPosts]);

  // Get item status with published check
  const getItemStatus = useCallback((item) => {
    if (isItemPublished(item)) return 'published';
    return item.status || 'pending';
  }, [isItemPublished]);

  // Group calendars by customer
  const customerGroups = useMemo(() => {
    const groups = {};
    assignedCalendars.forEach(calendar => {
      const customerId = calendar.customerId || 'unknown';
      const customerName = calendar.customerName || 'Unknown Customer';
      if (!groups[customerId]) {
        groups[customerId] = {
          id: customerId,
          name: customerName,
          calendars: []
        };
      }
      groups[customerId].calendars.push(calendar);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [assignedCalendars]);

  // Stats calculation
  const stats = useMemo(() => {
    let totalItems = 0, publishedItems = 0, pendingItems = 0;
    assignedCalendars.forEach(cal => {
      cal.contentItems?.forEach(item => {
        totalItems++;
        if (getItemStatus(item) === 'published') publishedItems++;
        else pendingItems++;
      });
    });
    return { 
      totalCalendars: assignedCalendars.length,
      totalCustomers: customerGroups.length,
      totalItems, 
      publishedItems, 
      pendingItems,
      completionRate: totalItems > 0 ? Math.round((publishedItems / totalItems) * 100) : 0
    };
  }, [assignedCalendars, customerGroups, getItemStatus]);

  // Toggle customer expansion
  const toggleCustomerExpansion = useCallback((customerId) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) newSet.delete(customerId);
      else newSet.add(customerId);
      return newSet;
    });
  }, []);

  const fetchCreatorDetails = async () => {
    try {
      setLoading(true);
      
      // First try to get all content creators and find the one with matching ID
      const allCreatorsResponse = await fetch(`${API_URL}/users?role=content_creator`);
      if (!allCreatorsResponse.ok) throw new Error('Failed to fetch content creators');
      
      const allCreatorsData = await allCreatorsResponse.json();
      const creators = Array.isArray(allCreatorsData) ? allCreatorsData : (allCreatorsData.creators || []);
      
      console.log('All creators:', creators);
      console.log('Looking for ID:', id);
      
      // Find the creator with matching ID
      const foundCreator = creators.find(creator => creator._id === id);
      
      if (!foundCreator) {
        // If not found in the list, try the individual endpoint as fallback
        const individualResponse = await fetch(`${API_URL}/users/${id}`);
        if (!individualResponse.ok) throw new Error('Creator not found');
        
        const individualData = await individualResponse.json();
        console.log('Individual creator API Response:', individualData);
        
        // Handle different response formats
        const creatorData = individualData.doc || individualData;
        setCreator(creatorData);
      } else {
        console.log('Found creator:', foundCreator);
        setCreator(foundCreator);
      }
      
    } catch (err) {
      setError('Failed to load creator details');
      console.error('Error fetching creator:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedCalendars = async () => {
    try {
      const response = await fetch(`${API_URL}/calendars`);
      if (!response.ok) throw new Error('Failed to fetch calendars');
      const calendars = await response.json();
      
      // Get creator email
      const creatorEmail = creator?.email;
      
      if (!creatorEmail) {
        console.log('No creator email found, skipping calendar assignment check');
        return;
      }
      
      // Filter calendars assigned to this creator
      const assigned = calendars.filter(calendar => 
        calendar.assignedTo === creatorEmail || 
        (calendar.contentItems && calendar.contentItems.some(item => item.assignedTo === creatorEmail))
      );
      
      // Enrich with customer names
      const enrichedCalendars = await Promise.all(
        assigned.map(async (calendar) => {
          try {
            const customerResponse = await fetch(`${API_URL}/customer/${calendar.customerId}`);
            const customerData = await customerResponse.json();
            return {
              ...calendar,
              customerName: customerData.name || 'Unknown Customer'
            };
          } catch (err) {
            return {
              ...calendar,
              customerName: 'Unknown Customer'
            };
          }
        })
      );
      
      setAssignedCalendars(enrichedCalendars);
    } catch (err) {
      console.error('Error fetching assigned calendars:', err);
    }
  };

  const toggleCalendarExpansion = useCallback((calendarId) => {
    setExpandedCalendars(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(calendarId)) {
        newExpanded.delete(calendarId);
      } else {
        newExpanded.add(calendarId);
      }
      return newExpanded;
    });
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      return 'N/A';
    }
  }, []);

  const formatSimpleDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, "MMM dd");
    } catch (error) {
      return 'N/A';
    }
  }, []);

  const getSpecializationDisplay = (specialization) => {
    if (!specialization) return 'Not specified';
    
    const specializationMap = {
      'graphic-design': 'Graphic Design',
      'video-editing': 'Video Editing',
      'content-writing': 'Content Writing',
      'social-media': 'Social Media Management',
      'photography': 'Photography',
      'web-design': 'Web Design'
    };
    return specializationMap[specialization] || specialization.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getExperienceDisplay = (experience) => {
    if (!experience) return 'Not specified';
    
    const experienceMap = {
      'beginner': 'Beginner (0-1 years)',
      'intermediate': 'Intermediate (2-4 years)',
      'advanced': 'Advanced (5-7 years)',
      'expert': 'Expert (8+ years)'
    };
    return experienceMap[experience] || experience.replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (isActive) => {
    return isActive 
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
      : 'bg-red-50 text-red-700 border-red-200';
  };

  const getStatusText = (isActive) => isActive ? 'Active' : 'Inactive';

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchCreatorDetails(), fetchScheduledPosts()]);
    if (creator) await fetchAssignedCalendars();
    setIsRefreshing(false);
  }, [creator]);

  // Loading state
  if (loading) {
    return (
      <AdminLayout title="Creator Details">
        <div className="space-y-5">
          <ProfileSkeleton />
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => <CustomerGroupSkeleton key={i} />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error || !creator) {
    return (
      <AdminLayout title="Creator Details">
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-gray-800 font-medium mb-1">Creator not found</p>
            <p className="text-gray-500 text-sm">{error || "This creator doesn't exist."}</p>
          </div>
          <button
            onClick={() => navigate('/admin/content-creators')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Creators
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Creator Details">
      <div className="space-y-5">
        {/* Header Section */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/admin/content-creators')}
                className="h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="h-14 w-14 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-xl">
                  {(creator.name || creator.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-gray-900">
                    {creator.name || creator.email || 'Unnamed Creator'}
                  </h1>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(creator.isActive)}`}>
                    {getStatusText(creator.isActive)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{creator.email}</p>
              </div>
            </div>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900 tabular-nums">{stats.totalCustomers}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Customers</div>
                </div>
                <Users className="h-7 w-7 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-blue-700 tabular-nums">{stats.totalItems}</div>
                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Items</div>
                </div>
                <FileText className="h-7 w-7 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-emerald-700 tabular-nums">{stats.publishedItems}</div>
                  <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Published</div>
                </div>
                <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-amber-700 tabular-nums">{stats.pendingItems}</div>
                  <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Pending</div>
                </div>
                <Clock className="h-7 w-7 text-amber-500" />
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-purple-700 tabular-nums">{stats.completionRate}%</div>
                  <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">Complete</div>
                </div>
                <Briefcase className="h-7 w-7 text-purple-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details - Compact */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            <InfoItem icon={User} label="Name" value={creator.name} />
            <InfoItem icon={Mail} label="Email" value={creator.email} />
            <InfoItem icon={Phone} label="Phone" value={creator.mobile} />
            <InfoItem icon={MapPin} label="Address" value={creator.address} />
            <InfoItem icon={Building} label="Role" value={creator.role?.replace('_', ' ') || 'Content Creator'} />
            <InfoItem icon={Palette} label="Specialization" value={getSpecializationDisplay(creator.specialization)} />
            <InfoItem icon={Award} label="Experience" value={getExperienceDisplay(creator.experience)} />
            <InfoItem icon={Calendar} label="Registered" value={formatDate(creator.createdAt)} />
          </div>
        </div>

        {/* Assigned Work by Customer */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Assigned Work</h2>
                <p className="text-sm text-gray-500 mt-0.5">Content calendars grouped by customer</p>
              </div>
              <span className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium">
                {stats.totalItems} total items
              </span>
            </div>
          </div>

          <div className="p-5">
            {customerGroups.length > 0 ? (
              <div className="space-y-4">
                {customerGroups.map(customer => (
                  <CustomerGroup
                    key={customer.id}
                    customer={customer}
                    calendars={customer.calendars}
                    isExpanded={expandedCustomers.has(customer.id)}
                    expandedCalendars={expandedCalendars}
                    onToggleCustomer={toggleCustomerExpansion}
                    onToggleCalendar={toggleCalendarExpansion}
                    formatDate={formatSimpleDate}
                    getItemStatus={getItemStatus}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-7 w-7 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-1">No assignments yet</h3>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                  This creator hasn't been assigned to any content calendars yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default memo(ContentCreatorDetails);