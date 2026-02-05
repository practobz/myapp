import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  ArrowLeft, Eye, MessageSquare, Calendar, Palette, Clock, 
  CheckCircle, AlertCircle, Image, FileText, 
  Play, Search, Send, 
  Trash2, Users, XCircle,
  Settings
} from 'lucide-react';

import SchedulePostModal from '../../components/modals/SchedulePostModal';
import ContentDetailView from '../../components/modals/ContentDetailView';
import SocialIntegrations from '../../../customer/Integration/SocialIntegrations';
import { useAuth } from '../../contexts/AuthContext';

// Memoized Customer Card Component
const CustomerCard = memo(({ customerData, customer, onSelect, getStatusColor, isContentPublished, getPublishedPlatformsForContent }) => {
  const customerName = customer?.name || `Customer ${customerData.customerId}`;
  const totalPortfolios = customerData.portfolios.length;
  const pendingCount = customerData.portfolios.filter(p => p.status === 'under_review' && !isContentPublished(p.id)).length;
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-3 sm:p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-10 w-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">
              {customerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm text-gray-900 truncate">{customerName}</h3>
            <p className="text-xs text-gray-500 truncate">{customer?.email}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-3 text-center">
          <div className="flex-1">
            <div className="text-lg font-bold text-blue-600">{totalPortfolios}</div>
            <div className="text-[10px] text-gray-500">Total</div>
          </div>
          <div className="flex-1">
            <div className="text-lg font-bold text-yellow-600">{pendingCount}</div>
            <div className="text-[10px] text-gray-500">Pending</div>
          </div>
        </div>

        <div className="space-y-1 mb-3 max-h-20 overflow-y-auto">
          {customerData.portfolios.slice(0, 3).map((portfolio) => (
            <div key={portfolio.id} className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span className="truncate">{portfolio.title || portfolio.calendarName || 'Content'}</span>
              </div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(isContentPublished(portfolio.id) ? 'published' : portfolio.status)}`}>
                {isContentPublished(portfolio.id) ? 'Done' : portfolio.status.replace('_', ' ')}
              </span>
            </div>
          ))}
          {customerData.portfolios.length > 3 && (
            <div className="text-center text-[10px] text-gray-400">
              +{customerData.portfolios.length - 3} more
            </div>
          )}
        </div>

        <button
          onClick={() => onSelect(customerData)}
          className="w-full bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 text-xs font-medium transition-colors"
        >
          View Portfolio
        </button>
      </div>
    </div>
  );
});

CustomerCard.displayName = 'CustomerCard';

// Memoized Portfolio Item Card
const PortfolioCard = memo(({ item, onView, onSchedule, onDelete, formatDate, getStatusColor, getStatusIcon, isContentPublished, getPublishedPlatformsForContent, isVideoUrl }) => {
  const latestVersion = item.versions[item.versions.length - 1];
  const firstMedia = latestVersion?.media?.[0];
  const published = isContentPublished(item.id);
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Media Preview */}
      <div className="relative h-32 sm:h-40 flex-shrink-0 bg-gray-100">
        {firstMedia?.url ? (
          isVideoUrl(firstMedia.url) ? (
            <div className="relative w-full h-full">
              <video src={firstMedia.url} className="w-full h-full object-cover" muted />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="h-8 w-8 text-white" />
              </div>
            </div>
          ) : (
            <img src={firstMedia.url} alt="" className="w-full h-full object-cover" loading="lazy" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Image className="h-8 w-8 text-gray-300" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusColor(published ? 'published' : item.status)}`}>
            {getStatusIcon(published ? 'published' : item.status)}
            <span className="ml-1">{published ? 'Published' : item.status.replace('_', ' ')}</span>
          </span>
        </div>
        
        {/* Version Badge */}
        <div className="absolute top-2 right-2">
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-100 text-purple-700">
            V{item.totalVersions}
          </span>
        </div>
        
        {/* Delete Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute bottom-2 right-2 p-1.5 bg-white/90 rounded-full shadow hover:bg-red-50 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        {item.title && <h3 className="font-medium text-sm text-gray-900 truncate mb-1">{item.title}</h3>}
        {item.calendarName && <p className="text-[10px] text-gray-500 truncate">📅 {item.calendarName}</p>}
        {item.itemName && <p className="text-[10px] text-gray-500 truncate mb-2">📝 {item.itemName}</p>}
        
        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-2">
          <span>{item.platform}</span>
          <span>{formatDate(item.lastUpdated)}</span>
        </div>
        
        {item.customerFeedback?.length > 0 && (
          <div className="flex items-center text-[10px] text-blue-600 mb-2">
            <MessageSquare className="h-3 w-3 mr-1" />
            {item.customerFeedback.length} comments
          </div>
        )}

        <div className="flex gap-2 mt-auto">
          <button
            onClick={onView}
            className="flex-1 bg-purple-600 text-white py-1.5 px-2 rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors flex items-center justify-center"
          >
            <Eye className="h-3 w-3 mr-1" />
            View
          </button>
          <button
            onClick={onSchedule}
            className="flex-1 bg-blue-600 text-white py-1.5 px-2 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Send className="h-3 w-3 mr-1" />
            Post
          </button>
        </div>
      </div>
    </div>
  );
});

PortfolioCard.displayName = 'PortfolioCard';

function AdminContentPortfolio() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Main state
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [allPortfolioItems, setAllPortfolioItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  
  // Customer social accounts from database
  const [customerSocialAccounts, setCustomerSocialAccounts] = useState([]);
  const [loadingSocialAccounts, setLoadingSocialAccounts] = useState(false);
  
  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedContentForSchedule, setSelectedContentForSchedule] = useState(null);
  
  // Integration modal state
  const [showIntegrationModal, setShowIntegrationModal] = useState(false);
  const [integrationPlatform, setIntegrationPlatform] = useState(null);
  const [integrationCustomer, setIntegrationCustomer] = useState(null);

  // New state for scheduled posts
  const [scheduledPosts, setScheduledPosts] = useState([]);
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [calendars, setCalendars] = useState([]); // <-- Add state for calendars
  const [submissions, setSubmissions] = useState([]); // <-- Add this

  useEffect(() => {
    if (currentUser) {
      fetchAssignedCustomers();
      fetchCustomers();
      fetchAllCustomerSocialAccounts();
      fetchScheduledPosts();
      fetchAllCalendars();
      fetchAllSubmissions();
    }
  }, [currentUser]);

  // Add this effect to re-map portfolios when calendars or submissions are loaded
  useEffect(() => {
    if (calendars.length > 0 && submissions.length > 0) {
      mapPortfolioItems();
    }
  }, [calendars, submissions]);

  // Fetch only assigned customers for the current admin
  const fetchAssignedCustomers = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`);
      if (response.ok) {
        const customerData = await response.json();
        setAssignedCustomers(Array.isArray(customerData) ? customerData : []);
        setCustomers(Array.isArray(customerData) ? customerData : []);
      } else {
        setAssignedCustomers([]);
        setCustomers([]);
      }
    } catch (error) {
      setAssignedCustomers([]);
      setCustomers([]);
    }
  };

  // Fetch all customer social accounts from database
  const fetchAllCustomerSocialAccounts = async () => {
    try {
      setLoadingSocialAccounts(true);
      console.log('📱 Fetching all customer social accounts from database...');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/admin/customer-social-links`);
      const data = await response.json();
      
      if (data.success) {
        setCustomerSocialAccounts(data.data || []);
        console.log('✅ Loaded customer social accounts:', data.data?.length || 0);
      } else {
        console.error('❌ Failed to fetch customer social accounts:', data.error);
      }
    } catch (error) {
      console.error('❌ Error fetching customer social accounts:', error);
    } finally {
      setLoadingSocialAccounts(false);
    }
  };

  // Fetch scheduled posts from backend
  const fetchScheduledPosts = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`);
      if (!response.ok) return setScheduledPosts([]);
      const data = await response.json();
      setScheduledPosts(Array.isArray(data) ? data : []);
    } catch {
      setScheduledPosts([]);
    }
  };

  // Fetch all calendars
  const fetchAllCalendars = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
      if (!response.ok) return setCalendars([]);
      const data = await response.json();
      setCalendars(Array.isArray(data) ? data : []);
    } catch {
      setCalendars([]);
    }
  };

  // Fetch submissions from backend
  const fetchAllSubmissions = async () => {
    try {
      const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      const submissionsData = await submissionsRes.json();
      setSubmissions(Array.isArray(submissionsData) ? submissionsData : []);
    } catch {
      setSubmissions([]);
    }
  };

  // Get available social accounts for a customer
  const getCustomerSocialAccounts = (customerId) => {
    const customerData = customerSocialAccounts.find(c => c.customerId === customerId);
    return customerData ? customerData.socialAccounts : [];
  };

  // Handle integration success
  const handleIntegrationSuccess = () => {
    console.log('🎉 Integration successful, refreshing social accounts...');
    fetchAllCustomerSocialAccounts();
    setTimeout(() => {
      setShowIntegrationModal(false);
      setIntegrationPlatform(null);
      setIntegrationCustomer(null);
    }, 3000);
  };

  // Show integration modal for a specific platform and customer
  const showIntegration = (platform, customerId, customerName) => {
    setIntegrationPlatform(platform);
    setIntegrationCustomer({ id: customerId, name: customerName });
    setShowIntegrationModal(true);
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/customers`);
      const data = await response.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  // Helper: Find calendar and content item for a portfolio item
  const getCalendarAndItem = (portfolio) => {
    // Try to find the calendar by customerId and assignmentId/contentId
    const calendar = calendars.find(c => c.customerId === portfolio.customerId && c.contentItems?.some(item =>
      // Try to match by assignmentId, date, or description
      item.assignment_id === portfolio.id ||
      item._id === portfolio.id ||
      item.title === portfolio.title ||
      item.description === portfolio.description
    ));
    if (!calendar) return { calendarName: '', itemName: '' };

    // Find the content item
    const contentItem = calendar.contentItems.find(item =>
      item.assignment_id === portfolio.id ||
      item._id === portfolio.id ||
      item.title === portfolio.title ||
      item.description === portfolio.description
    );
    return {
      calendarName: calendar.name || '',
      itemName: contentItem?.title || contentItem?.description || ''
    };
  };

  const mapPortfolioItems = () => {
    setLoading(true);
    // Group submissions by customer and assignment ID
    const customerGroups = {};
    submissions.forEach(submission => {
      const customerId = submission.customer_id || submission.customerId || 'unknown';
      const assignmentId = submission.assignment_id || submission.assignmentId || 'unknown';
      if (!customerGroups[customerId]) customerGroups[customerId] = {};
      if (!customerGroups[customerId][assignmentId]) customerGroups[customerId][assignmentId] = [];
      customerGroups[customerId][assignmentId].push(submission);
    });

    // Process each customer's portfolios
    const portfolioData = [];
    Object.keys(customerGroups).forEach(customerId => {
      const customerSubmissions = customerGroups[customerId];
      const customerPortfolios = [];
      Object.keys(customerSubmissions).forEach(assignmentId => {
        const versions = customerSubmissions[assignmentId].sort((a, b) =>
          new Date(a.created_at) - new Date(b.created_at)
        );
        const baseItem = versions[0];

        // --- Use saved calendar/item name if available ---
        let calendarName = baseItem.calendar_name || '';
        let itemName = baseItem.item_name || '';
        // If not available, fallback to mapping
        if ((!calendarName || !itemName) && calendars.length > 0) {
          const { calendarName: calName, itemName: itmName } = getCalendarAndItem({
            id: assignmentId,
            customerId,
            title: baseItem.caption || 'Untitled Post',
            description: baseItem.notes || ''
          });
          if (!calendarName) calendarName = calName;
          if (!itemName) itemName = itmName;
        }
        // --- End ---

        customerPortfolios.push({
          id: assignmentId,
          customerId: customerId,
          // Remove default 'Untitled Post', just use caption or empty string
          title: baseItem.caption || '',
          platform: baseItem.platform || 'Instagram',
          status: getLatestStatus(versions),
          createdDate: baseItem.created_at,
          lastUpdated: versions[versions.length - 1].created_at,
          description: baseItem.notes || '',
          versions: versions.map((version, index) => ({
            id: version._id,
            assignment_id: version.assignment_id,
            versionNumber: index + 1,
            media: normalizeMedia(version.media || version.images || []),
            caption: version.caption || '',
            hashtags: version.hashtags || extractHashtags(version.caption || ''),
            notes: version.notes || '',
            createdAt: version.created_at,
            status: version.status || 'submitted',
            comments: version.comments || []
          })),
          totalVersions: versions.length,
          customerFeedback: getAllFeedback(versions),
          calendarName: calendarName, // <-- Attach calendar name
          itemName: itemName         // <-- Attach item name
        });
      });
      portfolioData.push({
        customerId: customerId,
        portfolios: customerPortfolios
      });
    });

    setAllPortfolioItems(portfolioData);
    setLoading(false);
  };

  const extractHashtags = (text) => {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const hashtags = text.match(hashtagRegex);
    return hashtags ? hashtags.join(' ') : '';
  };

  const normalizeMedia = (media) => {
    if (!media || !Array.isArray(media)) return [];
    
    return media.map(item => {
      if (typeof item === 'string') {
        return {
          url: item,
          type: getMediaType(item)
        };
      }
      
      if (item && typeof item === 'object') {
        const url = item.url || item.src || item.href || String(item);
        
        if (typeof url === 'string' && url.trim()) {
          return {
            url: url,
            type: item.type || getMediaType(url)
          };
        }
      }
      
      return null;
    }).filter(Boolean);
  };

  const getMediaType = (url) => {
    if (!url || typeof url !== 'string') return 'image';
    
    const extension = url.toLowerCase().split('.').pop();
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
    
    return videoExtensions.includes(extension) ? 'video' : 'image';
  };

  const getLatestStatus = (versions) => {
    const latestVersion = versions[versions.length - 1];
    return latestVersion.status || 'under_review';
  };

  const getAllFeedback = (versions) => {
    const allFeedback = [];
    versions.forEach((version, versionIndex) => {
      if (version.comments && Array.isArray(version.comments)) {
        version.comments.forEach(comment => {
          allFeedback.push({
            ...comment,
            versionNumber: versionIndex + 1,
            timestamp: comment.timestamp || version.created_at
          });
        });
      }
    });
    return allFeedback.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  };

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'revision_requested':
        return 'bg-orange-100 text-orange-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const getStatusIcon = useCallback((status) => {
    switch (status) {
      case 'approved':
      case 'published':
        return <CheckCircle className="h-3 w-3" />;
      case 'revision_requested':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  }, []);

  const getCustomerName = useCallback((customerId) => {
    const customer = customers.find(c => c._id === customerId);
    return customer ? customer.name : `Customer ${customerId}`;
  }, [customers]);

  const formatDate = useCallback((dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  }, []);

  const isVideoUrl = useCallback((url) => {
    if (!url) return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
  }, []);

  const isContentPublished = useCallback((contentId) => {
    return scheduledPosts.some(post => post.contentId === contentId && post.status === 'published');
  }, [scheduledPosts]);

  const getPublishedPlatformsForContent = useCallback((contentId) => {
    return scheduledPosts
      .filter(post => post.contentId === contentId && post.status === 'published')
      .map(post => post.platform);
  }, [scheduledPosts]);

  const handleViewContent = useCallback((item) => {
    setSelectedContent({
      ...item,
      calendarName: item.calendarName || '',
      itemName: item.itemName || ''
    });
  }, []);

  const handleScheduleContent = useCallback((item) => {
    setSelectedContentForSchedule(item);
    setShowScheduleModal(true);
  }, []);

  // Delete portfolio handler with confirmation
  const handleDeletePortfolio = async (portfolioId, customerId) => {
    if (!window.confirm('Are you sure you want to delete this portfolio?')) return;

    // Call backend API to delete all versions for this assignment/portfolio
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/assignment/${portfolioId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error('Failed to delete portfolio from backend', err);
    }

    // Remove from state
    if (selectedCustomer && selectedCustomer.customerId === customerId) {
      setSelectedCustomer(prev => ({
        ...prev,
        portfolios: prev.portfolios.filter(portfolio => portfolio.id !== portfolioId)
      }));
    }
    setAllPortfolioItems(prevItems =>
      prevItems.map(customerData =>
        customerData.customerId === customerId
          ? {
              ...customerData,
              portfolios: customerData.portfolios.filter(portfolio => portfolio.id !== portfolioId)
            }
          : customerData
      )
    );
  };

  // Delete a version from a portfolio
  const handleDeleteVersion = async (versionId, portfolioId, customerId) => {
    // Delete from backend
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions/${versionId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      // Optionally show error to user
      console.error('Failed to delete version from backend', err);
    }

    // Remove version from state
    if (selectedCustomer && selectedCustomer.customerId === customerId) {
      setSelectedCustomer(prev => ({
        ...prev,
        portfolios: prev.portfolios.map(portfolio =>
          portfolio.id === portfolioId
            ? {
                ...portfolio,
                versions: portfolio.versions.filter(v => v.id !== versionId),
                totalVersions: portfolio.versions.filter(v => v.id !== versionId).length
              }
            : portfolio
        )
      }));
    }
    setAllPortfolioItems(prevItems =>
      prevItems.map(customerData =>
        customerData.customerId === customerId
          ? {
              ...customerData,
              portfolios: customerData.portfolios.map(portfolio =>
                portfolio.id === portfolioId
                  ? {
                      ...portfolio,
                      versions: portfolio.versions.filter(v => v.id !== versionId),
                      totalVersions: portfolio.versions.filter(v => v.id !== versionId).length
                    }
                  : portfolio
              )
            }
          : customerData
      )
    );
    // If viewing a single content, update selectedContent
    if (selectedContent && selectedContent.id === portfolioId) {
      setSelectedContent(prev => ({
        ...prev,
        versions: prev.versions.filter(v => v.id !== versionId),
        totalVersions: prev.versions.filter(v => v.id !== versionId).length
      }));
    }
  };

  // Memoized filtered customer portfolios with sorting
  const filteredCustomerPortfolios = useMemo(() => {
    return allPortfolioItems
      .filter(customerData => {
        const isAssigned = assignedCustomers.some(c => c._id === customerData.customerId);
        if (!isAssigned) return false;

        const customer = customers.find(c => c._id === customerData.customerId);
        const customerName = customer ? customer.name : `Customer ${customerData.customerId}`;
        if (searchTerm && !customerName.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        if (customerFilter !== 'all' && customerData.customerId !== customerFilter) {
          return false;
        }

        if (statusFilter !== 'all') {
          const hasMatchingPortfolio = customerData.portfolios.some(p => {
            if (statusFilter === 'published') {
              return isContentPublished(p.id);
            }
            return p.status === statusFilter && !isContentPublished(p.id);
          });
          if (!hasMatchingPortfolio) return false;
        }

        return true;
      })
      .map(customerData => ({
        ...customerData,
        // Sort portfolios by lastUpdated descending (recent first)
        portfolios: [...customerData.portfolios].sort((a, b) => 
          new Date(b.lastUpdated) - new Date(a.lastUpdated)
        )
      }));
  }, [allPortfolioItems, assignedCustomers, customers, searchTerm, customerFilter, statusFilter, isContentPublished]);

  // Update portfolio status after successful posting
  const updatePortfolioStatus = (contentId, customerId) => {
    setAllPortfolioItems(prevItems => {
      return prevItems.map(customerData => {
        if (customerData.customerId !== customerId) return customerData;
        return {
          ...customerData,
          portfolios: customerData.portfolios.map(portfolio => {
            if (portfolio.id !== contentId) return portfolio;
            const updatedVersions = portfolio.versions.map((v, idx) =>
              idx === portfolio.versions.length - 1
                ? { ...v, status: 'published' }
                : v
            );
            return {
              ...portfolio,
              status: 'published',
              versions: updatedVersions
            };
          })
        };
      });
    });

    if (selectedContent && selectedContent.id === contentId) {
      setSelectedContent(prev => {
        if (!prev) return prev;
        const updatedVersions = prev.versions.map((v, idx) =>
          idx === prev.versions.length - 1
            ? { ...v, status: 'published' }
            : v
        );
        return {
          ...prev,
          status: 'published',
          versions: updatedVersions
        };
      });
    }

    if (selectedCustomer && selectedCustomer.customerId === customerId) {
      setSelectedCustomer(prev => ({
        ...prev,
        portfolios: prev.portfolios.map(portfolio =>
          portfolio.id === contentId
            ? { 
                ...portfolio, 
                status: 'published', 
                versions: portfolio.versions.map((v, idx) =>
                  idx === portfolio.versions.length - 1
                    ? { ...v, status: 'published' }
                    : v
                )
              }
            : portfolio
        )
      }));
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-48">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-3 sm:space-y-4">
        {/* Compact Header */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => selectedContent ? setSelectedContent(null) : (selectedCustomer ? setSelectedCustomer(null) : navigate('/admin'))}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
              <Palette className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {selectedContent ? 'Content Details' : selectedCustomer ? getCustomerName(selectedCustomer.customerId) : 'Content Portfolio'}
              </h1>
              <p className="text-xs text-gray-500">
                {selectedContent ? 'View & manage' : selectedCustomer ? `${selectedCustomer.portfolios.length} items` : 'All customers'}
              </p>
            </div>
          </div>
        </div>

        {!selectedContent && !selectedCustomer ? (
            // Customer Portfolio Overview - Compact
            <>
              {/* Search and Filters - Combined */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 border border-gray-200/50">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
                    >
                      <option value="all">All Status</option>
                      <option value="under_review">Pending</option>
                      <option value="published">Published</option>
                    </select>
                    <select
                      value={customerFilter}
                      onChange={(e) => setCustomerFilter(e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 flex-1 sm:flex-none"
                    >
                      <option value="all">All Customers</option>
                      {customers.map(customer => (
                        <option key={customer._id} value={customer._id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer Cards Grid */}
              {filteredCustomerPortfolios.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No portfolios found</h3>
                  <p className="text-xs text-gray-500">No customer portfolios match filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {filteredCustomerPortfolios.map((customerData) => (
                    <CustomerCard
                      key={customerData.customerId}
                      customerData={customerData}
                      customer={customers.find(c => c._id === customerData.customerId)}
                      onSelect={setSelectedCustomer}
                      getStatusColor={getStatusColor}
                      isContentPublished={isContentPublished}
                      getPublishedPlatformsForContent={getPublishedPlatformsForContent}
                    />
                  ))}
                </div>
              )}
            </>
          ) : selectedCustomer && !selectedContent ? (
            // Individual Customer Portfolio - Grid View
            <>
              {selectedCustomer.portfolios.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">No content yet</h3>
                  <p className="text-xs text-gray-500">This customer has no portfolio items.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
                  {selectedCustomer.portfolios.map((item) => (
                    <PortfolioCard
                      key={item.id}
                      item={item}
                      onView={() => handleViewContent(item)}
                      onSchedule={() => handleScheduleContent(item)}
                      onDelete={() => handleDeletePortfolio(item.id, selectedCustomer.customerId)}
                      formatDate={formatDate}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      isContentPublished={isContentPublished}
                      getPublishedPlatformsForContent={getPublishedPlatformsForContent}
                      isVideoUrl={isVideoUrl}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            // Individual Content Detail View
            <ContentDetailView
              selectedContent={selectedContent}
              getCustomerName={getCustomerName}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              isContentPublished={isContentPublished}
              getPublishedPlatformsForContent={getPublishedPlatformsForContent}
              handleScheduleContent={handleScheduleContent}
              isVideoUrl={isVideoUrl}
              calendarName={selectedContent?.calendarName}
              itemName={selectedContent?.itemName}
              onDeleteVersion={handleDeleteVersion}
            />
          )}
      </div>

        {/* Schedule Post Modal */}
        {showScheduleModal && (
          <SchedulePostModal
            selectedContent={selectedContentForSchedule}
            onClose={() => {
              setShowScheduleModal(false);
              setSelectedContentForSchedule(null);
            }}
            extractHashtags={extractHashtags}
            getCustomerSocialAccounts={getCustomerSocialAccounts}
            getCustomerName={getCustomerName}
            showIntegration={showIntegration}
            updatePortfolioStatus={updatePortfolioStatus}
            onRefreshScheduledPosts={fetchScheduledPosts}
          />
        )}

        {/* Integration Modal */}
        {showIntegrationModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-600 rounded-lg">
                      <Settings className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-gray-900">Connect Account</h2>
                      <p className="text-xs text-gray-500">{integrationPlatform} for {integrationCustomer?.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowIntegrationModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
                  >
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <SocialIntegrations
                  platform={integrationPlatform}
                  customer={integrationCustomer}
                  onConnectionSuccess={handleIntegrationSuccess}
                  onClose={() => setShowIntegrationModal(false)}
                  compact={true}
                />
              </div>
            </div>
          </div>
        )}
    </AdminLayout>
  );
}

export default memo(AdminContentPortfolio);