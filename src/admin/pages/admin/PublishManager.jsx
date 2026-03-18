import React, { useState, useEffect, useMemo, useCallback, useRef, memo, startTransition } from 'react';
import { 
  Calendar, Clock, CheckCircle, XCircle, Loader2, Filter, 
  Search, ChevronDown, ChevronRight, ExternalLink, Image,
  Facebook, Instagram, Youtube, Linkedin, Twitter, Globe,
  Check, X, AlertCircle, RefreshCw, Users, User, BarChart3
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/layout/AdminLayout';

// Custom hook for debounced value
const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
};

// Skeleton components for loading states
const StatCardSkeleton = () => (
  <div className="bg-white rounded-xl p-4 border border-gray-100 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <div className="h-7 w-12 bg-gray-200 rounded" />
        <div className="h-4 w-20 bg-gray-100 rounded" />
      </div>
      <div className="h-8 w-8 bg-gray-200 rounded-lg" />
    </div>
  </div>
);

const CustomerGroupSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
    <div className="p-5 border-b border-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="h-11 w-11 bg-gray-200 rounded-lg" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-48 bg-gray-100 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-3 w-24 bg-gray-100 rounded" />
          <div className="h-5 w-5 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  </div>
);

// Platform icons mapping - memoized for performance
const PlatformIcon = React.memo(({ platform, size = 16 }) => {
  const iconProps = { size, className: 'inline-block' };
  switch (platform?.toLowerCase()) {
    case 'facebook': return <Facebook {...iconProps} className="text-blue-600" />;
    case 'instagram': return <Instagram {...iconProps} className="text-pink-600" />;
    case 'youtube': return <Youtube {...iconProps} className="text-red-600" />;
    case 'linkedin': return <Linkedin {...iconProps} className="text-blue-700" />;
    case 'twitter': return <Twitter {...iconProps} className="text-gray-700" />;
    default: return <Globe {...iconProps} className="text-gray-500" />;
  }
});
PlatformIcon.displayName = 'PlatformIcon';

const PLATFORMS = [
  { id: 'facebook', name: 'Facebook', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'instagram', name: 'Instagram', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { id: 'youtube', name: 'YouTube', color: 'bg-red-50 text-red-700 border-red-200' },
  { id: 'linkedin', name: 'LinkedIn', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'twitter', name: 'Twitter/X', color: 'bg-gray-50 text-gray-700 border-gray-200' },
  { id: 'other', name: 'Other', color: 'bg-gray-50 text-gray-600 border-gray-200' },
];

// Customer color generator (memoized outside component)
const CUSTOMER_COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'];
const getCustomerColor = (name) => {
  const hash = (name || '').split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  return CUSTOMER_COLORS[hash % CUSTOMER_COLORS.length];
};
const getCustomerInitials = (name) => {
  if (!name || name === 'Unknown Customer') return 'UK';
  return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
};

// Helper to get item image (outside component for performance)
const getItemImage = (item) => {
  if (item.submissionMedia) return item.submissionMedia;
  if (item.imageUrl) return item.imageUrl;
  if (item.thumbnail) return item.thumbnail;
  if (item.aiGeneratedImage) return item.aiGeneratedImage;
  if (item.media?.length > 0) {
    const first = item.media[0];
    return typeof first === 'string' ? first : first?.url;
  }
  if (item.images?.length > 0) {
    const first = item.images[0];
    return typeof first === 'string' ? first : first?.url;
  }
  if (item.imageUrls?.length > 0) return item.imageUrls[0];
  return null;
};

const isVideoUrl = (url) => url && /\.(mp4|mov|webm)|video/i.test(url);

// Memoized Content Item Component
const ContentItem = memo(({ item, index, onOpenModal, calendar }) => {
  const itemImage = useMemo(() => getItemImage(item), [item]);
  const isVideo = useMemo(() => isVideoUrl(itemImage), [itemImage]);
  
  return (
    <div 
      className={`flex items-center justify-between px-5 py-3.5 border-b border-gray-50 last:border-b-0 transition-colors ${
        item.isPublished ? 'bg-emerald-50/50' : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3.5 flex-1 min-w-0">
        <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {itemImage ? (
            isVideo ? (
              <video src={itemImage} className="h-full w-full object-cover" muted preload="metadata" />
            ) : (
              <img 
                src={itemImage} 
                alt="" 
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )
          ) : (
            <Image className="h-4 w-4 text-gray-400" />
          )}
        </div>
        
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-800 text-sm truncate">
              {item.title || item.description || 'Untitled Item'}
            </span>
            {item.isPublished && <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
            {item.date && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(item.date).toLocaleDateString()}
              </span>
            )}
            {item.publishedPlatforms?.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-gray-300">•</span>
                {item.publishedPlatforms.slice(0, 3).map((platform, i) => (
                  <PlatformIcon key={i} platform={platform} size={12} />
                ))}
                {item.publishedPlatforms.length > 3 && (
                  <span className="text-gray-400">+{item.publishedPlatforms.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        {item.isPublished ? (
          <button
            onClick={() => onOpenModal(calendar, item)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-xs font-medium hover:bg-emerald-700 transition-colors"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Published
          </button>
        ) : (
          <button
            onClick={() => onOpenModal(calendar, item)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-md text-xs font-medium hover:bg-gray-800 transition-colors"
          >
            <Check className="h-3.5 w-3.5" />
            Mark Published
          </button>
        )}
      </div>
    </div>
  );
});
ContentItem.displayName = 'ContentItem';

// Memoized Calendar Section
const CalendarSection = memo(({ calendar, isExpanded, onToggle, onOpenModal }) => {
  const publishedCount = useMemo(() => 
    calendar.filteredItems.filter(i => i.isPublished).length, 
    [calendar.filteredItems]
  );
  const progressWidth = useMemo(() => 
    calendar.filteredItems.length > 0 ? (publishedCount / calendar.filteredItems.length) * 100 : 0,
    [publishedCount, calendar.filteredItems.length]
  );
  
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => onToggle(calendar._id)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/70 transition-colors group"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
          <Calendar className="h-4 w-4 text-gray-500" />
          <div className="text-left">
            <div className="font-medium text-gray-800 text-sm">{calendar.name || 'Untitled Calendar'}</div>
            <div className="text-xs text-gray-500">
              {calendar.filteredItems.length} item{calendar.filteredItems.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-gray-600 tabular-nums">
            {publishedCount}/{calendar.filteredItems.length}
          </span>
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progressWidth}%` }}
            />
          </div>
        </div>
      </button>
      
      {isExpanded && (
        <div className="bg-white border-t border-gray-100">
          {calendar.filteredItems.map((item, index) => (
            <ContentItem 
              key={item.id || index} 
              item={item} 
              index={index}
              calendar={calendar}
              onOpenModal={onOpenModal}
            />
          ))}
        </div>
      )}
    </div>
  );
});
CalendarSection.displayName = 'CalendarSection';

// Memoized Customer Group
const CustomerGroup = memo(({ 
  customerGroup, 
  isExpanded, 
  expandedCalendars,
  onToggleCustomer, 
  onToggleCalendar,
  onOpenModal 
}) => {
  const progressPercent = useMemo(() => 
    customerGroup.filteredTotalItems > 0 
      ? Math.round((customerGroup.filteredPublishedItems / customerGroup.filteredTotalItems) * 100)
      : 0,
    [customerGroup.filteredPublishedItems, customerGroup.filteredTotalItems]
  );
  const progressWidth = useMemo(() => 
    customerGroup.filteredTotalItems > 0 
      ? (customerGroup.filteredPublishedItems / customerGroup.filteredTotalItems) * 100 
      : 0,
    [customerGroup.filteredPublishedItems, customerGroup.filteredTotalItems]
  );
  const avatarColor = useMemo(() => getCustomerColor(customerGroup.name), [customerGroup.name]);
  const initials = useMemo(() => getCustomerInitials(customerGroup.name), [customerGroup.name]);
  
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="border-b border-gray-50">
        <button
          onClick={() => onToggleCustomer(customerGroup.id)}
          className="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className={`h-11 w-11 ${avatarColor} rounded-lg flex items-center justify-center text-white font-semibold text-sm`}>
              {initials}
            </div>
            <div className="text-left">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-gray-900">{customerGroup.name}</h3>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                  {customerGroup.calendars.length} calendar{customerGroup.calendars.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  {customerGroup.filteredPublishedItems} published
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  {customerGroup.filteredTotalItems - customerGroup.filteredPublishedItems} pending
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
                  style={{ width: `${progressWidth}%` }}
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
      </div>
      
      {isExpanded && (
        <div className="bg-gray-50/50">
          {customerGroup.calendars.map(calendar => (
            <CalendarSection
              key={calendar._id}
              calendar={calendar}
              isExpanded={expandedCalendars.has(calendar._id)}
              onToggle={onToggleCalendar}
              onOpenModal={onOpenModal}
            />
          ))}
        </div>
      )}
    </div>
  );
});
CustomerGroup.displayName = 'CustomerGroup';

function PublishManager() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // State
  const [calendars, setCalendars] = useState([]);
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 250);
  const [expandedCalendars, setExpandedCalendars] = useState(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [selectedCustomer, setSelectedCustomer] = useState('all');
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [publishModal, setPublishModal] = useState(null); // { calendarId, item }
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [publishNotes, setPublishNotes] = useState('');
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const abortControllerRef = useRef(null);

  // Fetch data with abort controller
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!currentUser) return;
    
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError('');
    
    try {
      const apiUrl = process.env.REACT_APP_API_URL;
      const fetchOptions = { signal };
      const calendarsUrl = `${apiUrl}/calendars`;
      
      // Parallel fetch for better performance - include submissions for media
      if (currentUser.role === 'admin') {
        const [customersRes, calendarsRes, postsRes, submissionsRes] = await Promise.all([
          fetch(`${apiUrl}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`, fetchOptions),
          fetch(calendarsUrl, fetchOptions),
          fetch(`${apiUrl}/api/scheduled-posts`, fetchOptions),
          fetch(`${apiUrl}/api/content-submissions`, fetchOptions)
        ]);
        
        if (customersRes.ok) {
          const assignedCustomers = await customersRes.json();
          const customerIds = assignedCustomers.map(c => c._id);
          const allCalendars = await calendarsRes.json();
          
          const filteredCalendars = allCalendars.filter(cal => 
            customerIds.includes(cal.customerId)
          );
          
          const calendarsWithCustomer = filteredCalendars.map(cal => ({
            ...cal,
            customerName: assignedCustomers.find(c => c._id === cal.customerId)?.name || 'Unknown Customer'
          }));
          
          setCalendars(calendarsWithCustomer);
        }
        
        const posts = await postsRes.json();
        setScheduledPosts(Array.isArray(posts) ? posts : []);
        
        const submissionsData = await submissionsRes.json();
        setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
      } else {
        const [calendarsRes, postsRes, submissionsRes] = await Promise.all([
          fetch(calendarsUrl, fetchOptions),
          fetch(`${apiUrl}/api/scheduled-posts`, fetchOptions),
          fetch(`${apiUrl}/api/content-submissions`, fetchOptions)
        ]);
        
        const allCalendars = await calendarsRes.json();
        setCalendars(allCalendars);
        
        const posts = await postsRes.json();
        setScheduledPosts(Array.isArray(posts) ? posts : []);
        
        const submissionsData = await submissionsRes.json();
        setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError('Failed to load data. Please try again.');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData, refreshKey]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    if (!isRefreshing) {
      fetchData(true);
    }
  }, [fetchData, isRefreshing]);

  // Check if item is published (either manually or via scheduled post)
  const isItemPublished = useCallback((item) => {
    // Check manual publish flag
    if (item.published === true) return true;
    
    // Check scheduled posts
    return scheduledPosts.some(post =>
      ((post.item_id && post.item_id === item.id) ||
       (post.contentId && post.contentId === item.id) ||
       (post.item_name && post.item_name === item.title)) &&
      (post.status === 'published' || post.publishedAt)
    );
  }, [scheduledPosts]);

  // Get published platforms for an item
  const getPublishedPlatforms = useCallback((item) => {
    const platforms = new Set();
    
    // From manual publish
    if (item.publishedPlatforms && Array.isArray(item.publishedPlatforms)) {
      item.publishedPlatforms.forEach(p => platforms.add(p));
    }
    
    // From scheduled posts
    scheduledPosts
      .filter(post =>
        ((post.item_id && post.item_id === item.id) ||
         (post.contentId && post.contentId === item.id) ||
         (post.item_name && post.item_name === item.title)) &&
        (post.status === 'published' || post.publishedAt)
      )
      .forEach(post => {
        if (post.platform) platforms.add(post.platform);
      });
    
    return Array.from(platforms);
  }, [scheduledPosts]);

  // Helper to get media from submissions for a calendar item
  const getMediaForItem = useCallback((item, calendarId, customerId) => {
    // Find matching submission(s) for this calendar item
    const matchingSubmissions = submissions.filter(sub => {
      // Match by calendar and item ID
      if (sub.calendar_id === calendarId && sub.assignment_id === item.id) return true;
      if (sub.calendarId === calendarId && sub.assignmentId === item.id) return true;
      // Match by item title/name
      if (sub.assignment_title === item.title || sub.item_name === item.title) return true;
      // Match by customer and approximate title
      if ((sub.customer_id === customerId || sub.customerId === customerId) && 
          sub.assignment_title && item.title && 
          sub.assignment_title.toLowerCase().includes(item.title.toLowerCase())) return true;
      return false;
    });
    
    if (matchingSubmissions.length === 0) return null;
    
    // Get the latest submission
    const latestSubmission = matchingSubmissions.sort((a, b) => 
      new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0)
    )[0];
    
    // Extract media from submission
    const media = latestSubmission.media || latestSubmission.images || [];
    if (media.length === 0) return null;
    
    const firstMedia = media[0];
    // Handle both string URLs and object with url property
    return typeof firstMedia === 'string' ? firstMedia : firstMedia?.url;
  }, [submissions]);

  // Process calendars with items
  const processedCalendars = useMemo(() => {
    return calendars.map(calendar => {
      const items = (calendar.contentItems || []).map(item => ({
        ...item,
        calendarId: calendar._id,
        calendarName: calendar.name,
        customerName: calendar.customerName || '',
        isPublished: isItemPublished(item),
        publishedPlatforms: getPublishedPlatforms(item),
        // Add media from submissions
        submissionMedia: getMediaForItem(item, calendar._id, calendar.customerId)
      }));
      
      return {
        ...calendar,
        processedItems: items,
        publishedCount: items.filter(i => i.isPublished).length,
        totalCount: items.length
      };
    });
  }, [calendars, isItemPublished, getPublishedPlatforms, getMediaForItem]);

  // Group calendars by customer
  const customerGroups = useMemo(() => {
    const groups = {};
    
    processedCalendars.forEach(calendar => {
      const customerName = calendar.customerName || 'Unknown Customer';
      const customerId = calendar.customerId || 'unknown';
      
      if (!groups[customerId]) {
        groups[customerId] = {
          id: customerId,
          name: customerName,
          calendars: [],
          totalItems: 0,
          publishedItems: 0
        };
      }
      
      groups[customerId].calendars.push(calendar);
      groups[customerId].totalItems += calendar.totalCount;
      groups[customerId].publishedItems += calendar.publishedCount;
    });
    
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [processedCalendars]);

  // Filtered customer groups - use debounced search for performance
  const filteredCustomerGroups = useMemo(() => {
    const searchLower = debouncedSearch.trim().toLowerCase();
    
    return customerGroups.map(customerGroup => {
      const filteredCalendars = customerGroup.calendars.map(calendar => {
        let items = calendar.processedItems;
        
        // Filter by publish status
        if (filter === 'published') {
          items = items.filter(i => i.isPublished);
        } else if (filter === 'unpublished') {
          items = items.filter(i => !i.isPublished);
        }
        
        // Search filter (debounced)
        if (searchLower) {
          items = items.filter(i => 
            i.title?.toLowerCase().includes(searchLower) ||
            i.description?.toLowerCase().includes(searchLower) ||
            i.calendarName?.toLowerCase().includes(searchLower) ||
            i.customerName?.toLowerCase().includes(searchLower)
          );
        }
        
        return { ...calendar, filteredItems: items };
      }).filter(cal => cal.filteredItems.length > 0);
      
      return {
        ...customerGroup,
        calendars: filteredCalendars,
        filteredTotalItems: filteredCalendars.reduce((sum, cal) => sum + cal.filteredItems.length, 0),
        filteredPublishedItems: filteredCalendars.reduce((sum, cal) => 
          sum + cal.filteredItems.filter(item => item.isPublished).length, 0
        )
      };
    }).filter(group => 
      (selectedCustomer === 'all' || group.id === selectedCustomer) && 
      group.calendars.length > 0
    );
  }, [customerGroups, filter, debouncedSearch, selectedCustomer]);

  // Toggle calendar expansion
  const toggleCalendar = (calendarId) => {
    setExpandedCalendars(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calendarId)) {
        newSet.delete(calendarId);
      } else {
        newSet.add(calendarId);
      }
      return newSet;
    });
  };

  // Toggle customer expansion
  const toggleCustomer = (customerId) => {
    setExpandedCustomers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(customerId)) {
        newSet.delete(customerId);
      } else {
        newSet.add(customerId);
      }
      return newSet;
    });
  };

  // Generate customer initials
  const getCustomerInitials = (name) => {
    if (!name || name === 'Unknown Customer') return 'UK';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  // Generate customer color
  const getCustomerColor = (name) => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500',
      'bg-indigo-500', 'bg-red-500', 'bg-yellow-500', 'bg-teal-500'
    ];
    const hash = name.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Toggle item selection
  const toggleItemSelection = (itemId) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Open publish modal for a single item
  const openPublishModal = (calendar, item) => {
    setPublishModal({ calendarId: calendar._id, item });
    setSelectedPlatforms(item.publishedPlatforms || []);
    setPublishNotes(item.publishedNotes || '');
    setSendEmailNotification(false);
  };

  // Close publish modal
  const closePublishModal = () => {
    setPublishModal(null);
    setSelectedPlatforms([]);
    setPublishNotes('');
    setSendEmailNotification(false);
  };

  // Toggle platform selection
  const togglePlatform = (platformId) => {
    setSelectedPlatforms(prev => {
      if (prev.includes(platformId)) {
        return prev.filter(p => p !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  };

  // Mark item as published
  const markAsPublished = async (calendarId, itemId, platforms, notes, published = true, notifyEmail = false) => {
    setSaving(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/calendars/item/${calendarId}/mark-published`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            published,
            publishedPlatforms: platforms,
            publishedNotes: notes,
            publishedAt: new Date().toISOString(),
            sendEmailNotification: notifyEmail
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to update publish status');
      }
      
      // Refresh data
      setRefreshKey(prev => prev + 1);
      closePublishModal();
      
    } catch (error) {
      console.error('Error marking item as published:', error);
      alert('Failed to update publish status. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Bulk mark as published
  const bulkMarkAsPublished = async (calendarId, itemIds, platforms) => {
    setSaving(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/calendars/item/${calendarId}/bulk-publish`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemIds,
            published: true,
            publishedPlatforms: platforms,
            publishedAt: new Date().toISOString()
          })
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to bulk update publish status');
      }
      
      // Refresh data and clear selection
      setSelectedItems(new Set());
      setRefreshKey(prev => prev + 1);
      
    } catch (error) {
      console.error('Error bulk marking items as published:', error);
      alert('Failed to update publish status. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = useMemo(() => {
    let total = 0;
    let published = 0;
    let customers = customerGroups.length;
    let activeCustomers = 0;
    
    customerGroups.forEach(group => {
      total += group.totalItems;
      published += group.publishedItems;
      if (group.totalItems > 0) activeCustomers++;
    });
    
    return { 
      total, 
      published, 
      unpublished: total - published,
      customers,
      activeCustomers,
      publishRate: total > 0 ? Math.round((published / total) * 100) : 0
    };
  }, [customerGroups]);

  // Unique customers for filter dropdown
  const uniqueCustomers = useMemo(() => {
    return customerGroups.map(group => ({
      id: group.id,
      name: group.name,
      count: group.totalItems
    }));
  }, [customerGroups]);

  // Loading state with skeleton UI
  if (loading) {
    return (
      <AdminLayout title="Publish Manager">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="h-11 w-11 bg-gray-200 rounded-lg" />
                <div className="space-y-2">
                  <div className="h-6 w-40 bg-gray-200 rounded" />
                  <div className="h-4 w-64 bg-gray-100 rounded" />
                </div>
              </div>
              <div className="h-10 w-28 bg-gray-200 rounded-lg" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => <StatCardSkeleton key={i} />)}
            </div>
          </div>
          
          {/* Filters Skeleton */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
            <div className="flex gap-4">
              <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 w-36 bg-gray-100 rounded-lg" />
              <div className="h-10 w-28 bg-gray-100 rounded-lg" />
            </div>
          </div>
          
          {/* Content Skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <CustomerGroupSkeleton key={i} />)}
          </div>
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error && !calendars.length) {
    return (
      <AdminLayout title="Publish Manager">
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <AlertCircle className="h-7 w-7 text-red-500" />
          </div>
          <div className="text-center">
            <p className="text-gray-800 font-medium mb-1">Unable to load data</p>
            <p className="text-gray-500 text-sm">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Publish Manager">
      <div className="space-y-5">
        {/* Header & Stats */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-6">
            {/* Header Info */}
            <div className="flex items-center gap-4">
              <div className="h-11 w-11 bg-gray-900 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Publish Manager</h1>
                <p className="text-sm text-gray-500">
                  Track and manage content publishing across all accounts
                </p>
              </div>
            </div>
            
            {/* Action Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
          
          {/* Stats Grid - Clean flat design */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900 tabular-nums">{stats.total}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total</div>
                </div>
                <Calendar className="h-7 w-7 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-emerald-700 tabular-nums">{stats.published}</div>
                  <div className="text-xs text-emerald-600 font-medium uppercase tracking-wide">Published</div>
                </div>
                <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
            </div>
            
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-amber-700 tabular-nums">{stats.unpublished}</div>
                  <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Pending</div>
                </div>
                <Clock className="h-7 w-7 text-amber-500" />
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-gray-900 tabular-nums">{stats.activeCustomers}</div>
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Clients</div>
                </div>
                <Users className="h-7 w-7 text-gray-400" />
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-semibold text-blue-700 tabular-nums">{stats.publishRate}%</div>
                  <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Rate</div>
                </div>
                <BarChart3 className="h-7 w-7 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Controls */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search content, calendars, or customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white transition-all"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Customer Filter */}
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 min-w-[150px]"
              >
                <option value="all">All Customers</option>
                {uniqueCustomers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} ({customer.count})
                  </option>
                ))}
              </select>
              
              {/* Status Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 min-w-[130px]"
              >
                <option value="all">All Status</option>
                <option value="unpublished">Pending</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Groups & Content */}
        <div className="space-y-4">
          {filteredCustomerGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">No content found</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">
                {searchQuery || filter !== 'all' || selectedCustomer !== 'all'
                  ? 'Try adjusting your filters or search criteria'
                  : 'No customers or content calendars have been created yet'}
              </p>
            </div>
          ) : (
            filteredCustomerGroups.map(customerGroup => (
              <CustomerGroup
                key={customerGroup.id}
                customerGroup={customerGroup}
                isExpanded={expandedCustomers.has(customerGroup.id)}
                expandedCalendars={expandedCalendars}
                onToggleCustomer={toggleCustomer}
                onToggleCalendar={toggleCalendar}
                onOpenModal={openPublishModal}
              />
            ))
          )}
        </div>
      </div>

      {/* Publish Modal */}
      {publishModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-900">
                {publishModal.item.isPublished ? 'Update Publish Status' : 'Mark as Published'}
              </h3>
              <p className="text-sm text-gray-500 mt-0.5 truncate">
                {publishModal.item.title || publishModal.item.description || 'Untitled Item'}
              </p>
            </div>
            
            {/* Modal Content */}
            <div className="px-5 py-4 space-y-4">
              {/* Platform Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Platforms
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PLATFORMS.map(platform => (
                    <button
                      key={platform.id}
                      onClick={() => togglePlatform(platform.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-all ${
                        selectedPlatforms.includes(platform.id)
                          ? `${platform.color} border-current`
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <PlatformIcon platform={platform.id} size={16} />
                      <span className="text-sm font-medium">{platform.name}</span>
                      {selectedPlatforms.includes(platform.id) && (
                        <Check className="h-4 w-4 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={publishNotes}
                  onChange={(e) => setPublishNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-gray-900 focus:bg-white resize-none transition-all"
                />
              </div>

              {/* Email Notification Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <div className="text-sm font-medium text-gray-700">Notify client via email</div>
                  <div className="text-xs text-gray-400 mt-0.5">Send a published notification to the client's registered email</div>
                </div>
                <button
                  type="button"
                  onClick={() => setSendEmailNotification(prev => !prev)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                    sendEmailNotification ? 'bg-gray-900' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      sendEmailNotification ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              {publishModal.item.isPublished && (
                <button
                  onClick={() => markAsPublished(
                    publishModal.calendarId, 
                    publishModal.item.id, 
                    [], 
                    '', 
                    false
                  )}
                  disabled={saving}
                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Mark Unpublished
                </button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  onClick={closePublishModal}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => markAsPublished(
                    publishModal.calendarId, 
                    publishModal.item.id, 
                    selectedPlatforms, 
                    publishNotes,
                    true,
                    sendEmailNotification
                  )}
                  disabled={saving || selectedPlatforms.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      {publishModal.item.isPublished ? 'Update' : 'Confirm'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default PublishManager;
