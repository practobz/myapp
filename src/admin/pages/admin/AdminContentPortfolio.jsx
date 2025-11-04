import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { 
  ArrowLeft, Eye, MessageSquare, Calendar, User, Palette, Clock, 
  CheckCircle, AlertCircle, Image, FileText, 
  Play, Video, Filter, Search, Facebook, Instagram, Send, Plus, 
  MoreVertical, Edit, Trash2, Users, Grid, List, XCircle, Loader2, Hash,
  Youtube, Linkedin, Check, X, Zap, Settings, RefreshCw
} from 'lucide-react';

import SchedulePostModal from '../../components/modals/SchedulePostModal';
import ContentDetailView from '../../components/modals/ContentDetailView';
import SocialIntegrations from '../../../customer/Integration/SocialIntegrations';
import { useAuth } from '../../contexts/AuthContext';

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
    fetchAssignedCustomers();
    fetchCustomers();
    fetchAllCustomerSocialAccounts();
    fetchScheduledPosts();
    fetchAllCalendars();
    fetchAllSubmissions(); // <-- Fetch submissions separately
    // Remove fetchAllPortfolioItems from here!
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'published':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'revision_requested':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      case 'revision_requested':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c._id === customerId);
    return customer ? customer.name : `Customer ${customerId}`;
  };

  const handleViewContent = (item) => {
    // Make sure calendarName and itemName are set on selectedContent
    setSelectedContent({
      ...item,
      calendarName: item.calendarName || '',
      itemName: item.itemName || ''
    });
  };

  const handleScheduleContent = (item) => {
    setSelectedContentForSchedule(item);
    setShowScheduleModal(true);
  };

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

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Helper to detect video URLs
  const isVideoUrl = (url) => {
    if (!url) return false;
    const ext = url.split('.').pop().toLowerCase();
    return ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext);
  };

  // Helper: get published platforms for a contentId
  const getPublishedPlatformsForContent = (contentId) => {
    return scheduledPosts
      .filter(post => post.contentId === contentId && post.status === 'published')
      .map(post => post.platform);
  };

  // Helper: check if content is published on any platform
  const isContentPublished = (contentId) => {
    return scheduledPosts.some(post => post.contentId === contentId && post.status === 'published');
  };

  // When displaying portfolios, override status if published
  const publishedStatus = (item) => {
    if (isContentPublished(item.id)) {
      return 'published';
    }
    return item.status;
  };

  // Filter portfolios to only assigned customers
  const filteredCustomerPortfolios = allPortfolioItems.filter(customerData => {
    // Only show if customer is assigned to this admin
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

    // --- FIX: Add status filter logic ---
    if (statusFilter !== 'all') {
      // Only include customers with at least one portfolio matching the status filter
      const hasMatchingPortfolio = customerData.portfolios.some(p => {
        // If statusFilter is 'published', use isContentPublished
        if (statusFilter === 'published') {
          return isContentPublished(p.id);
        }
        // For other statuses, check status directly and not published
        return p.status === statusFilter && !isContentPublished(p.id);
      });
      if (!hasMatchingPortfolio) return false;
    }
    // --- END FIX ---

    return true;
  });

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading portfolios...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
                <div className="flex flex-col sm:flex-row gap-4">
               
              <button
                onClick={() => selectedContent ? setSelectedContent(null) : (selectedCustomer ? setSelectedCustomer(null) : navigate('/admin'))}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Palette className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Admin Content Portfolio
                  </span>
                  <p className="text-sm text-gray-500">
                    {selectedContent ? 'Content Details' : selectedCustomer ? 'Customer Portfolio' : 'All Customer Portfolios'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {!selectedContent && !selectedCustomer ? (
            // Customer Portfolio Overview
            <div className="space-y-8">
              <div className="text-center">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Customer Content Portfolios
                </h1>
                <p className="text-gray-600 mt-3 text-lg">View and manage all customer content portfolios</p>
              </div>

              {/* Search and Filters */}
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search customers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="under_review">Under Review</option>
                    <option value="published">Published</option>
                  </select>
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

              {/* Customer Cards */}
              {filteredCustomerPortfolios.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No portfolios found</h3>
                  <p className="text-gray-500">No customer portfolios match your current filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredCustomerPortfolios.map((customerData) => {
                    const customer = customers.find(c => c._id === customerData.customerId);
                    const customerName = customer ? customer.name : `Customer ${customerData.customerId}`;
                    const totalPortfolios = customerData.portfolios.length;
                    const publishedCount = customerData.portfolios.filter(p => isContentPublished(p.id)).length;
                    const pendingCount = customerData.portfolios.filter(p => p.status === 'under_review' && !isContentPublished(p.id)).length;
                    
                    return (
                      <div
                        key={customerData.customerId}
                        className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-[420px]"
                      >
                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-lg">
                                  {customerName.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <h3 className="font-bold text-lg text-gray-900">{customerName}</h3>
                                <p className="text-sm text-gray-600 truncate">{customer?.email}</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">{totalPortfolios}</div>
                              <div className="text-xs text-gray-500">Total</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                              <div className="text-xs text-gray-500">Pending</div>
                            </div>
                          </div>

                          <div
                            className="space-y-2 mb-4"
                            style={{ maxHeight: '100px', overflowY: 'auto', minHeight: 0 }}
                          >
                            {customerData.portfolios.slice(0, 10).map((portfolio, index) => (
                              <div key={portfolio.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                    {/* Only show title if it exists */}
                                    {portfolio.title ? (
                                      <span className="text-sm font-medium truncate">{portfolio.title}</span>
                                    ) : null}
                                  </div>
                                  {/* --- Show calendar and item name --- */}
                                  {portfolio.calendarName && (
                                    <span className="text-xs text-gray-500">Calendar: {portfolio.calendarName}</span>
                                  )}
                                  {portfolio.itemName && (
                                    <span className="text-xs text-gray-500">Item: {portfolio.itemName}</span>
                                  )}
                                </div>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(isContentPublished(portfolio.id) ? 'published' : portfolio.status)} flex-shrink-0`}>
                                  {isContentPublished(portfolio.id) ? 'published' : portfolio.status.replace('_', ' ')}
                                  {isContentPublished(portfolio.id) && (
                                    <span className="ml-2 text-xs text-blue-600">
                                      Published on: {getPublishedPlatformsForContent(portfolio.id).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ))}
                            {customerData.portfolios.length > 10 && (
                              <div className="text-center text-sm text-gray-500">
                                +{customerData.portfolios.length - 10} more items
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => setSelectedCustomer(customerData)}
                            className="w-full mt-auto bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-medium transition-all duration-200"
                          >
                            View Portfolio
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : selectedCustomer && !selectedContent ? (
            // Individual Customer Portfolio View
            <div className="space-y-8">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <span className="text-white font-bold text-2xl">
                        {getCustomerName(selectedCustomer.customerId).charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900">{getCustomerName(selectedCustomer.customerId)}</h1>
                      <p className="text-gray-600">Content Portfolio ({selectedCustomer.portfolios.length} items)</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedCustomer.portfolios.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No content created yet</h3>
                  <p className="text-gray-500">This customer doesn't have any content in their portfolio.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {selectedCustomer.portfolios.map((item) => {
                    const latestVersion = item.versions[item.versions.length - 1];
                    const firstMedia = latestVersion?.media?.[0];
                    
                    return (
                      <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group h-[500px] flex flex-col">
                        {/* Content Preview */}
                        <div className="relative h-48 flex-shrink-0">
                          {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                            isVideoUrl(firstMedia.url) ? (
                              <div className="relative w-full h-full">
                                <video
                                  src={firstMedia.url}
                                  className="w-full h-full object-cover"
                                  muted
                                  controls
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'flex';
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                  <Play className="h-12 w-12 text-white" />
                                </div>
                              </div>
                            ) : (
                              <img 
                                src={firstMedia.url} 
                                alt={item.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            )
                          ) : null}
                          
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                            <Image className="h-12 w-12 text-gray-400" />
                          </div>
                          
                          <div className="absolute top-4 right-4 flex gap-2">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(isContentPublished(item.id) ? 'published' : item.status)}`}>
                              {getStatusIcon(isContentPublished(item.id) ? 'published' : item.status)}
                              <span className="ml-1">{isContentPublished(item.id) ? 'PUBLISHED' : item.status.replace('_', ' ').toUpperCase()}</span>
                              {isContentPublished(item.id) && (
                                <span className="ml-2 text-xs text-blue-600">
                                  {getPublishedPlatformsForContent(item.id).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(', ')}
                                </span>
                              )}
                            </span>
                          </div>
                          
                          <div className="absolute top-4 left-4 flex gap-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                              <Image className="h-3 w-3 mr-1" />
                              {item.totalVersions} Version{item.totalVersions !== 1 ? 's' : ''}
                            </span>
                            {latestVersion?.media && latestVersion.media.length > 1 && (
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                {latestVersion.media.length} Media
                              </span>
                            )}
                          </div>

                          {/* Add delete icon in top right corner */}
                          <button
                            onClick={() => handleDeletePortfolio(item.id, selectedCustomer.customerId)}
                            className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow hover:bg-red-100 transition"
                            title="Delete Portfolio"
                          >
                            <Trash2 className="h-5 w-5 text-red-500" />
                          </button>
                        </div>

                        {/* Content Details */}
                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
                            {item.title ? item.title : null}
                          </h3>
                          {/* --- Show calendar and item name --- */}
                          {item.calendarName && (
                            <div className="text-xs text-gray-500 mb-1">Calendar: {item.calendarName}</div>
                          )}
                          {item.itemName && (
                            <div className="text-xs text-gray-500 mb-1">Item: {item.itemName}</div>
                          )}
                          <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-1">{item.description}</p>
                          
                          <div className="space-y-3 mb-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Platform: {item.platform}</span>
                              <span className="text-gray-500">
                                Updated: {formatDate(item.lastUpdated)}
                              </span>
                            </div>

                            {item.customerFeedback.length > 0 && (
                              <div className="flex items-center text-sm text-blue-600">
                                <MessageSquare className="h-4 w-4 mr-1" />
                                {item.customerFeedback.length} Comment{item.customerFeedback.length !== 1 ? 's' : ''}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 mt-auto">
                            <button
                              onClick={() => handleViewContent(item)}
                              className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </button>
                            
                            <button
                              onClick={() => handleScheduleContent(item)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Post
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
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
              onDeleteVersion={handleDeleteVersion} // <-- pass handler
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
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                      <Settings className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">Connect Social Media Account</h2>
                      <p className="text-sm text-gray-500">Connect {integrationPlatform} for {integrationCustomer?.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowIntegrationModal(false)}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
                  >
                    <XCircle className="h-6 w-6" />
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
      </div>
    </AdminLayout>
  );
}

export default AdminContentPortfolio;