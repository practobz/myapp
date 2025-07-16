import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Upload, Eye, MessageSquare, Calendar, User, Palette, Clock, 
  CheckCircle, AlertCircle, ChevronLeft, ChevronRight, Image, FileText, 
  Play, Video, Filter, Search, Facebook, Instagram, Send, Plus, 
  MoreVertical, Edit, Trash2, Users, Grid, List, XCircle, Loader2
} from 'lucide-react';

// Facebook SDK integration
const FACEBOOK_APP_ID = '1678447316162226';

function AdminContentPortfolio() {
  const navigate = useNavigate();
  
  // Main state
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [allPortfolioItems, setAllPortfolioItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  
  // Comments state
  const [commentsForVersion, setCommentsForVersion] = useState([]);
  const [commentsForCurrentMedia, setCommentsForCurrentMedia] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [hoveredComment, setHoveredComment] = useState(null);
  
  // Facebook SDK state
  const [fbSdkLoaded, setFbSdkLoaded] = useState(false);
  const [fbLoggedIn, setFbLoggedIn] = useState(false);
  const [fbPages, setFbPages] = useState([]);
  const [fbUserData, setFbUserData] = useState(null);
  
  // Schedule modal state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedContentForSchedule, setSelectedContentForSchedule] = useState(null);
  const [scheduleFormData, setScheduleFormData] = useState({
    caption: '',
    imageUrl: '',
    platform: 'facebook',
    pageId: '',
    scheduledDate: '',
    scheduledTime: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  });
  const [submitting, setSubmitting] = useState(false);
  
  // Image browser state
  const [showImageBrowser, setShowImageBrowser] = useState(false);
  const [bucketImages, setBucketImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);
  
  const fileInputRef = useRef(null);

  // Load Facebook SDK
  useEffect(() => {
    loadFacebookSDK();
  }, []);

  useEffect(() => {
    fetchCustomers();
    fetchAllPortfolioItems();
  }, []);

  useEffect(() => {
    if (selectedContent && selectedContent.versions && selectedContent.versions[selectedVersionIndex]) {
      setCommentsForVersion(selectedContent.versions[selectedVersionIndex].comments || []);
    } else {
      setCommentsForVersion([]);
    }
  }, [selectedContent, selectedVersionIndex]);

  useEffect(() => {
    const filteredComments = commentsForVersion.filter(comment => {
      const commentMediaIndex = comment.mediaIndex !== undefined ? comment.mediaIndex : 0;
      return commentMediaIndex === selectedMediaIndex;
    });
    setCommentsForCurrentMedia(filteredComments);
  }, [commentsForVersion, selectedMediaIndex]);

  const loadFacebookSDK = () => {
    if (document.getElementById('facebook-jssdk')) {
      setFbSdkLoaded(true);
      return;
    }

    window.fbAsyncInit = function() {
      window.FB.init({
        appId: FACEBOOK_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v19.0'
      });
      setFbSdkLoaded(true);

      window.FB.getLoginStatus(response => {
        if (response.status === 'connected') {
          setFbLoggedIn(true);
          fetchFbUserData();
          fetchFbPages();
        }
      });
    };

    (function(d, s, id){
      var js, fjs = d.getElementsByTagName(s)[0];
      if (d.getElementById(id)) {return;}
      js = d.createElement(s); js.id = id;
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      fjs.parentNode.insertBefore(js, fjs);
    }(document, 'script', 'facebook-jssdk'));
  };

  const handleFbLogin = () => {
    window.FB.login(response => {
      if (response.status === 'connected') {
        setFbLoggedIn(true);
        fetchFbUserData();
        fetchFbPages();
      }
    }, {
      scope: 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_content_publish,instagram_basic'
    });
  };

  const fetchFbUserData = () => {
    window.FB.api('/me', { fields: 'id,name,email,picture' }, function(response) {
      setFbUserData(response);
    });
  };

  const fetchFbPages = () => {
    window.FB.api('/me/accounts', {
      fields: 'id,name,access_token,instagram_business_account'
    }, function(response) {
      if (response && response.data) {
        const pagesWithDetails = response.data.map(page => {
          if (page.instagram_business_account) {
            window.FB.api(`/${page.instagram_business_account.id}`, {
              fields: 'id,username',
              access_token: page.access_token
            }, function(igResponse) {
              if (igResponse) {
                page.instagram_details = igResponse;
                setFbPages(prev => [...prev.filter(p => p.id !== page.id), page]);
              }
            });
          }
          return page;
        });
        setFbPages(pagesWithDetails);
      }
    });
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

  const fetchAllPortfolioItems = async () => {
    try {
      setLoading(true);
      const submissionsRes = await fetch(`${process.env.REACT_APP_API_URL}/api/content-submissions`);
      const submissions = await submissionsRes.json();

      if (!Array.isArray(submissions)) {
        throw new Error('Invalid data received');
      }

      // Group submissions by customer and assignment ID
      const customerGroups = {};
      submissions.forEach(submission => {
        const customerId = submission.customer_id || submission.customerId || 'unknown';
        const assignmentId = submission.assignment_id || submission.assignmentId || 'unknown';
        
        if (!customerGroups[customerId]) {
          customerGroups[customerId] = {};
        }
        
        if (!customerGroups[customerId][assignmentId]) {
          customerGroups[customerId][assignmentId] = [];
        }
        
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
          
          customerPortfolios.push({
            id: assignmentId,
            customerId: customerId,
            title: baseItem.caption || 'Untitled Post',
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
              notes: version.notes || '',
              createdAt: version.created_at,
              status: version.status || 'submitted',
              comments: version.comments || []
            })),
            totalVersions: versions.length,
            customerFeedback: getAllFeedback(versions)
          });
        });
        
        portfolioData.push({
          customerId: customerId,
          portfolios: customerPortfolios
        });
      });

      setAllPortfolioItems(portfolioData);
    } catch (error) {
      console.error('Error fetching portfolio items:', error);
      setAllPortfolioItems([]);
    } finally {
      setLoading(false);
    }
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
    setSelectedContent(item);
    setSelectedVersionIndex(item.versions.length - 1);
    setSelectedMediaIndex(0);
  };

  const handleScheduleContent = (item) => {
    const latestVersion = item.versions[item.versions.length - 1];
    const firstMedia = latestVersion?.media?.[0];
    
    setSelectedContentForSchedule(item);
    setScheduleFormData({
      caption: latestVersion.caption || '',
      imageUrl: firstMedia?.url || '',
      platform: 'facebook',
      pageId: '',
      scheduledDate: '',
      scheduledTime: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    setShowScheduleModal(true);
  };

  const handleApproveContent = (item) => {
    navigate(`/admin/approve/${item.id}`);
  };

  const handleSchedulePost = async () => {
    if (!scheduleFormData.caption || !scheduleFormData.scheduledDate || !scheduleFormData.scheduledTime) {
      alert('Please fill in all required fields');
      return;
    }

    if (scheduleFormData.platform === 'instagram' && !scheduleFormData.imageUrl) {
      alert('Instagram posts require an image');
      return;
    }

    if (!scheduleFormData.pageId) {
      alert('Please select a Facebook page');
      return;
    }

    const selectedPage = fbPages.find(page => page.id === scheduleFormData.pageId);
    if (!selectedPage) {
      alert('Selected page not found. Please refresh and try again.');
      return;
    }

    if ((scheduleFormData.platform === 'instagram' || scheduleFormData.platform === 'both') && 
        !selectedPage.instagram_business_account?.id) {
      alert('Selected page does not have Instagram connected. Please connect Instagram or select Facebook only.');
      return;
    }

    setSubmitting(true);
    try {
      const scheduledDateTime = new Date(`${scheduleFormData.scheduledDate}T${scheduleFormData.scheduledTime}`);
      
      const postData = {
        caption: scheduleFormData.caption,
        imageUrl: scheduleFormData.imageUrl,
        platform: scheduleFormData.platform,
        pageId: scheduleFormData.pageId,
        pageName: selectedPage.name,
        accessToken: selectedPage.access_token,
        instagramId: scheduleFormData.platform === 'instagram' || scheduleFormData.platform === 'both' 
          ? selectedPage.instagram_business_account?.id
          : null,
        scheduledAt: scheduledDateTime.toISOString(),
        timezone: scheduleFormData.timezone,
        status: 'pending',
        contentId: selectedContentForSchedule.id,
        customerId: selectedContentForSchedule.customerId
      };

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/scheduled-posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        alert('Post scheduled successfully!');
        setShowScheduleModal(false);
        setSelectedContentForSchedule(null);
        setScheduleFormData({
          caption: '',
          imageUrl: '',
          platform: 'facebook',
          pageId: '',
          scheduledDate: '',
          scheduledTime: '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to schedule post');
      }
    } catch (error) {
      console.error('Schedule post error:', error);
      alert(`Failed to schedule post: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageUpload = async (file) => {
    try {
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Please choose an image smaller than 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64Data = e.target.result.split(',')[1];
          
          const response = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/upload-base64`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filename: `${Date.now()}_${file.name.replace(/[^\w.-]/g, '_')}`,
              contentType: file.type,
              base64Data: base64Data
            })
          });

          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status}`);
          }

          const result = await response.json();
          setScheduleFormData(prev => ({ ...prev, imageUrl: result.publicUrl }));
          
        } catch (error) {
          console.error('Base64 upload failed:', error);
          alert('Image upload failed. Please try again.');
        }
      };
      
      reader.readAsDataURL(file);
      
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Image upload failed. Please try again.');
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

  const filteredCustomerPortfolios = allPortfolioItems.filter(customerData => {
    const customer = customers.find(c => c._id === customerData.customerId);
    const customerName = customer ? customer.name.toLowerCase() : '';
    
    if (searchTerm && !customerName.includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (customerFilter !== 'all' && customerData.customerId !== customerFilter) {
      return false;
    }
    
    return true;
  });

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
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

      {/* Facebook Connection Status */}
      {!fbLoggedIn && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Facebook className="h-6 w-6 text-blue-600" />
                <div>
                  <h3 className="font-medium text-gray-900">Connect Facebook Account</h3>
                  <p className="text-sm text-gray-600">Connect your Facebook account to schedule posts</p>
                </div>
              </div>
              <button
                onClick={handleFbLogin}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <option value="approved">Approved</option>
                  <option value="under_review">Under Review</option>
                  <option value="revision_requested">Revision Requested</option>
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
                  const approvedCount = customerData.portfolios.filter(p => p.status === 'approved').length;
                  const pendingCount = customerData.portfolios.filter(p => p.status === 'under_review').length;
                  
                  return (
                    <div key={customerData.customerId} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                              <span className="text-white font-bold text-lg">
                                {customerName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{customerName}</h3>
                              <p className="text-sm text-gray-600">{customer?.email}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{totalPortfolios}</div>
                            <div className="text-xs text-gray-500">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
                            <div className="text-xs text-gray-500">Approved</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
                            <div className="text-xs text-gray-500">Pending</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {customerData.portfolios.slice(0, 3).map((portfolio, index) => (
                            <div key={portfolio.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm font-medium truncate">{portfolio.title}</span>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(portfolio.status)}`}>
                                {portfolio.status.replace('_', ' ')}
                              </span>
                            </div>
                          ))}
                          {customerData.portfolios.length > 3 && (
                            <div className="text-center text-sm text-gray-500">
                              +{customerData.portfolios.length - 3} more items
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => setSelectedCustomer(customerData)}
                          className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-medium transition-all duration-200"
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
                  const isApproved = item.status === 'approved';
                  
                  return (
                    <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      {/* Content Preview */}
                      <div className="relative">
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          firstMedia.type === 'image' ? (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-48">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          )
                        ) : null}
                        
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
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
                      </div>

                      {/* Content Details */}
                      <div className="p-6">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                        
                        <div className="space-y-3">
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
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleApproveContent(item)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          
                          {item.status === 'approved' && (
                            <button
                              onClick={() => handleScheduleContent(item)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Schedule
                            </button>
                          )}
                        </div>
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
                  const isApproved = item.status === 'approved';
                  
                  return (
                    <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      {/* Content Preview */}
                      <div className="relative">
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          firstMedia.type === 'image' ? (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-48">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          )
                        ) : null}
                        
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
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
                      </div>

                      {/* Content Details */}
                      <div className="p-6">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                        
                        <div className="space-y-3">
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
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleApproveContent(item)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          
                          {item.status === 'approved' && (
                            <button
                              onClick={() => handleScheduleContent(item)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Schedule
                            </button>
                          )}
                        </div>
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
                  const isApproved = item.status === 'approved';
                  
                  return (
                    <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      {/* Content Preview */}
                      <div className="relative">
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          firstMedia.type === 'image' ? (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-48">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          )
                        ) : null}
                        
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
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
                      </div>

                      {/* Content Details */}
                      <div className="p-6">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                        
                        <div className="space-y-3">
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
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleApproveContent(item)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          
                          {item.status === 'approved' && (
                            <button
                              onClick={() => handleScheduleContent(item)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Schedule
                            </button>
                          )}
                        </div>
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
                  const isApproved = item.status === 'approved';
                  
                  return (
                    <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      {/* Content Preview */}
                      <div className="relative">
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          firstMedia.type === 'image' ? (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-48">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          )
                        ) : null}
                        
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
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
                      </div>

                      {/* Content Details */}
                      <div className="p-6">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                        
                        <div className="space-y-3">
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
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleApproveContent(item)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          
                          {item.status === 'approved' && (
                            <button
                              onClick={() => handleScheduleContent(item)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Schedule
                            </button>
                          )}
                        </div>
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
                  const isApproved = item.status === 'approved';
                  
                  return (
                    <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      {/* Content Preview */}
                      <div className="relative">
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          firstMedia.type === 'image' ? (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-48">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          )
                        ) : null}
                        
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
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
                      </div>

                      {/* Content Details */}
                      <div className="p-6">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                        
                        <div className="space-y-3">
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
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleApproveContent(item)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          
                          {item.status === 'approved' && (
                            <button
                              onClick={() => handleScheduleContent(item)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Schedule
                            </button>
                          )}
                        </div>
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
                  const isApproved = item.status === 'approved';
                  
                  return (
                    <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      {/* Content Preview */}
                      <div className="relative">
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          firstMedia.type === 'image' ? (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-48">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          )
                        ) : null}
                        
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
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
                      </div>

                      {/* Content Details */}
                      <div className="p-6">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                        
                        <div className="space-y-3">
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
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleApproveContent(item)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          
                          {item.status === 'approved' && (
                            <button
                              onClick={() => handleScheduleContent(item)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Schedule
                            </button>
                          )}
                        </div>
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
                  const isApproved = item.status === 'approved';
                  
                  return (
                    <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      {/* Content Preview */}
                      <div className="relative">
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          firstMedia.type === 'image' ? (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-48">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          )
                        ) : null}
                        
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
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
                      </div>

                      {/* Content Details */}
                      <div className="p-6">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                        
                        <div className="space-y-3">
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
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleApproveContent(item)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          
                          {item.status === 'approved' && (
                            <button
                              onClick={() => handleScheduleContent(item)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Schedule
                            </button>
                          )}
                        </div>
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
                  const isApproved = item.status === 'approved';
                  
                  return (
                    <div key={item.id} className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-300 group">
                      {/* Content Preview */}
                      <div className="relative">
                        {firstMedia && firstMedia.url && typeof firstMedia.url === 'string' ? (
                          firstMedia.type === 'image' ? (
                            <img 
                              src={firstMedia.url} 
                              alt={item.title}
                              className="w-full h-48 object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-48">
                              <video
                                src={firstMedia.url}
                                className="w-full h-full object-cover"
                                muted
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                                <Play className="h-12 w-12 text-white" />
                              </div>
                            </div>
                          )
                        ) : null}
                        
                        <div className="w-full h-48 bg-gray-200 flex items-center justify-center" style={{ display: firstMedia?.url ? 'none' : 'flex' }}>
                          <Image className="h-12 w-12 text-gray-400" />
                        </div>
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status.replace('_', ' ').toUpperCase()}</span>
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
                      </div>

                      {/* Content Details */}
                      <div className="p-6">
                        <h3 className="font-bold text-lg text-gray-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                        
                        <div className="space-y-3">
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
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => handleViewContent(item)}
                            className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-700 hover:to-indigo-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                          
                          <button
                            onClick={() => handleApproveContent(item)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-2 px-4 rounded-xl hover:from-green-700 hover:to-emerald-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Approve
                          </button>
                          
                          {item.status === 'approved' && (
                            <button
                              onClick={() => handleScheduleContent(item)}
                              className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-700 hover:to-cyan-700 text-sm font-medium flex items-center justify-center transition-all duration-200"
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Schedule
                            </button>
                          )}
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
          <div className="space-y-8">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedContent.title}</h1>
                  <p className="text-gray-600 mb-4">{selectedContent.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Customer</span>
                        <p className="text-sm text-gray-900 font-semibold">{getCustomerName(selectedContent.customerId)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Platform</span>
                        <p className="text-sm text-gray-900">{selectedContent.platform}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Total Versions</span>
                        <p className="text-sm text-gray-900">{selectedContent.totalVersions}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(selectedContent.status)}`}>
                    {getStatusIcon(selectedContent.status)}
                    <span className="ml-2">{selectedContent.status.replace('_', ' ').toUpperCase()}</span>
                  </span>
                  
                  <button
                    onClick={() => handleApproveContent(selectedContent)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                  >
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Approve Content
                  </button>
                  
                  {selectedContent.status === 'approved' && (
                    <button
                      onClick={() => handleScheduleContent(selectedContent)}
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all duration-200"
                    >
                      <Send className="h-5 w-5 mr-2" />
                      Schedule Post
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
              {/* Version Display */}
              <div className="xl:col-span-2">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center">
                        <Image className="h-5 w-5 text-purple-600 mr-2" />
                        Version {selectedContent.versions[selectedVersionIndex]?.versionNumber}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          of {selectedContent.totalVersions}
                        </span>
                      </h3>
                      
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            if (selectedVersionIndex > 0) {
                              setSelectedVersionIndex(selectedVersionIndex - 1);
                              setSelectedMediaIndex(0);
                            }
                          }}
                          disabled={selectedVersionIndex === 0}
                          className="p-2 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (selectedVersionIndex < selectedContent.versions.length - 1) {
                              setSelectedVersionIndex(selectedVersionIndex + 1);
                              setSelectedMediaIndex(0);
                            }
                          }}
                          disabled={selectedVersionIndex === selectedContent.versions.length - 1}
                          className="p-2 rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {selectedContent.versions[selectedVersionIndex] && (
                      <div className="space-y-6">
                        {/* Media Display */}
                        <div className="text-center">
                          {selectedContent.versions[selectedVersionIndex].media && selectedContent.versions[selectedVersionIndex].media.length > 0 ? (
                            <div className="relative">
                              {/* Media Navigation for multiple items */}
                              {selectedContent.versions[selectedVersionIndex].media.length > 1 && (
                                <div className="flex items-center justify-between mb-4">
                                  <span className="text-sm text-gray-500">
                                    {selectedMediaIndex + 1} of {selectedContent.versions[selectedVersionIndex].media.length}
                                  </span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        if (selectedMediaIndex > 0) {
                                          setSelectedMediaIndex(selectedMediaIndex - 1);
                                        }
                                      }}
                                      disabled={selectedMediaIndex === 0}
                                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                      <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (selectedMediaIndex < selectedContent.versions[selectedVersionIndex].media.length - 1) {
                                          setSelectedMediaIndex(selectedMediaIndex + 1);
                                        }
                                      }}
                                      disabled={selectedMediaIndex === selectedContent.versions[selectedVersionIndex].media.length - 1}
                                      className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                                    >
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Current Media Item */}
                              {selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex] && 
                               selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url &&
                               typeof selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url === 'string' ? (
                                selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].type === 'image' ? (
                                  <img
                                    src={selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url}
                                    alt={`Version ${selectedContent.versions[selectedVersionIndex].versionNumber} - Media ${selectedMediaIndex + 1}`}
                                    className="max-w-full h-auto max-h-96 mx-auto rounded-xl shadow-lg border border-gray-200"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                ) : (
                                  <video
                                    src={selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url}
                                    controls
                                    className="max-w-full h-auto max-h-96 mx-auto rounded-xl shadow-lg border border-gray-200"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                      e.target.nextSibling.style.display = 'flex';
                                    }}
                                  />
                                )
                              ) : null}
                              
                              {/* Fallback for invalid/missing media */}
                              <div 
                                className="max-w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center"
                                style={{ 
                                  display: (selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex]?.url && 
                                           typeof selectedContent.versions[selectedVersionIndex].media[selectedMediaIndex].url === 'string') 
                                    ? 'none' : 'flex' 
                                }}
                              >
                                <div className="text-center">
                                  <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                  <p className="text-gray-500">Media unavailable</p>
                                </div>
                              </div>
                              
                              {/* Media Thumbnails */}
                              {selectedContent.versions[selectedVersionIndex].media.length > 1 && (
                                <div className="flex justify-center gap-2 mt-4">
                                  {selectedContent.versions[selectedVersionIndex].media.map((media, index) => (
                                    <button
                                      key={index}
                                      onClick={() => setSelectedMediaIndex(index)}
                                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                                        selectedMediaIndex === index 
                                          ? 'border-purple-500 ring-2 ring-purple-200' 
                                          : 'border-gray-200 hover:border-gray-300'
                                      }`}
                                    >
                                      {media.type === 'image' && media.url && typeof media.url === 'string' ? (
                                        <img
                                          src={media.url}
                                          alt={`Thumbnail ${index + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.nextSibling.style.display = 'flex';
                                          }}
                                        />
                                      ) : (
                                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                          <Video className="h-6 w-6 text-gray-400" />
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Comment Markers - Display comments as floating markers on the media */}
                              {commentsForCurrentMedia.map((comment, index) => {
                                // Calculate floating box position
                                let boxLeft = 40;
                                let boxRight = "auto";
                                const mediaElement = document.querySelector(`img[alt*="Version ${selectedContent.versions[selectedVersionIndex].versionNumber}"], video`);
                                if (mediaElement && mediaElement.width && (comment.x || comment.position?.x) > mediaElement.width / 2) {
                                  boxLeft = "auto";
                                  boxRight = 40;
                                }

                                const commentX = comment.x || comment.position?.x || 0;
                                const commentY = comment.y || comment.position?.y || 0;

                                return (
                                  <div
                                    key={comment.id}
                                    style={{
                                      position: "absolute",
                                      top: commentY - 16,
                                      left: commentX - 16,
                                      width: 32,
                                      height: 32,
                                      background: comment.done ? "#10b981" : "#ef4444",
                                      color: "#fff",
                                      borderRadius: "50%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: "bold",
                                      fontSize: "14px",
                                      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                                      cursor: "pointer",
                                      zIndex: 2,
                                      border: "3px solid #fff",
                                      transition: "all 0.3s",
                                    }}
                                    onMouseEnter={() => setHoveredComment(comment.id)}
                                    onMouseLeave={() => setHoveredComment(null)}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveComment(activeComment === comment.id ? null : comment.id);
                                    }}
                                  >
                                    {index + 1}
                                    
                                    {/* Floating Comment Box */}
                                    {(activeComment === comment.id || hoveredComment === comment.id) && (
                                      <div
                                        style={{
                                          position: "absolute",
                                          left: boxLeft,
                                          right: boxRight,
                                          top: "50%",
                                          transform: "translateY(-50%)",
                                          background: "#fff",
                                          border: "2px solid #3b82f6",
                                          borderRadius: "12px",
                                          padding: "16px",
                                          minWidth: "280px",
                                          maxWidth: "320px",
                                          zIndex: 10,
                                          boxShadow: "0 8px 32px rgba(59,130,246,0.2)",
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <div className="mb-3">
                                          <p className="font-semibold text-gray-900 text-sm leading-relaxed break-words">
                                            {comment.message || comment.comment}
                                            {comment.done && <span className="text-green-600 ml-2">✓ Done</span>}
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                                          </p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="max-w-full h-96 bg-gray-200 rounded-xl flex items-center justify-center">
                              <div className="text-center">
                                <Image className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                                <p className="text-gray-500">No media available</p>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-gray-900">{selectedContent.versions[selectedVersionIndex].caption || 'No caption'}</p>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                            <div className="bg-gray-50 rounded-lg p-4">
                              <p className="text-gray-900">{selectedContent.versions[selectedVersionIndex].notes || 'No notes'}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <span>Created: {formatDate(selectedContent.versions[selectedVersionIndex].createdAt)}</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedContent.versions[selectedVersionIndex].status)}`}>
                              {selectedContent.versions[selectedVersionIndex].status.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Side: Version History and Comments */}
              <div className="space-y-6">
                {/* Version History Panel */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-green-50 to-emerald-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <FileText className="h-5 w-5 text-green-600 mr-2" />
                      Version History
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto p-0">
                    <div className="divide-y divide-gray-100">
                      {selectedContent.versions.map((version, index) => {
                        const versionDate = new Date(version.createdAt);
                        const formattedDate = versionDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });
                        return (
                          <button
                            key={version.id}
                            onClick={() => {
                              setSelectedVersionIndex(index);
                              setSelectedMediaIndex(0);
                            }}
                            className={`w-full text-left px-6 py-4 flex flex-col border-l-4 transition-all duration-200 hover:bg-gray-50 ${
                              selectedVersionIndex === index
                                ? "bg-purple-50 border-l-purple-600"
                                : "bg-white border-l-transparent"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-gray-900 text-base">
                                Version {version.versionNumber}
                              </span>
                              {selectedVersionIndex === index && (
                                <span className="ml-2 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className="flex items-center mt-1 text-xs text-gray-500 gap-2">
                              <span className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {formattedDate}
                              </span>
                              {version.media && version.media.length > 0 && (
                                <span className="flex items-center ml-2">
                                  <Image className="h-3 w-3 mr-1" />
                                  {version.media.length} media
                                </span>
                              )}
                              {version.comments && version.comments.length > 0 && (
                                <span className="flex items-center ml-2">
                                  <MessageSquare className="h-3 w-3 mr-1" />
                                  {version.comments.length} comments
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Comments for selected version */}
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200/50 bg-gradient-to-r from-purple-50 to-pink-50">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center">
                      <MessageSquare className="h-5 w-5 text-purple-600 mr-2" />
                      Comments for Version {selectedContent.versions[selectedVersionIndex]?.versionNumber} - Media {selectedMediaIndex + 1} ({commentsForCurrentMedia.length})
                    </h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-4">
                    {commentsForCurrentMedia.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
                          <MessageSquare className="h-6 w-6 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm">No comments for this media item</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {commentsForCurrentMedia.map((comment, idx) => (
                          <div key={comment.id || idx} className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                            activeComment === comment.id
                              ? 'bg-blue-50 border-blue-200 shadow-md'
                              : 'bg-gray-50 hover:bg-gray-100/50 border-gray-200 hover:border-gray-300/50'
                          }`} onClick={() => setActiveComment(activeComment === comment.id ? null : comment.id)}>
                            <div className="flex items-start space-x-3">
                              <span className="font-bold text-purple-600 bg-purple-100 rounded-full w-6 h-6 flex items-center justify-center text-xs flex-shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 break-words">
                                  {comment.message || comment.comment}
                                  {comment.done && (
                                    <span className="ml-2 text-green-600 text-xs font-semibold">✓ Done</span>
                                  )}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {comment.timestamp ? new Date(comment.timestamp).toLocaleString() : ''}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Position: ({Math.round(comment.x || comment.position?.x || 0)}, {Math.round(comment.y || comment.position?.y || 0)})
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Schedule Post Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Schedule Post</h2>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Platform Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                  <div className="flex space-x-4">
                    {['facebook', 'instagram', 'both'].map(platform => (
                      <label key={platform} className="flex items-center">
                        <input
                          type="radio"
                          name="platform"
                          value={platform}
                          checked={scheduleFormData.platform === platform}
                          onChange={(e) => setScheduleFormData(prev => ({ ...prev, platform: e.target.value }))
                          }
                          className="mr-2"
                        />
                        <span className="text-sm">
                          {platform === 'facebook' && 'Facebook'}
                          {platform === 'instagram' && 'Instagram'}
                          {platform === 'both' && 'Both'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Page Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Facebook Page</label>
                  <select
                    value={scheduleFormData.pageId}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, pageId: e.target.value }))
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Select a page</option>
                    {fbPages.map(page => (
                      <option key={page.id} value={page.id}>
                        {page.name}
                        {page.instagram_business_account && ' (Instagram connected)'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Caption */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
                  <textarea
                    value={scheduleFormData.caption}
                    onChange={(e) => setScheduleFormData(prev => ({ ...prev, caption: e.target.value }))
                    }
                    rows={4}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Write your post caption..."
                  />
                </div>

                {/* Image */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Image</label>
                  <div className="space-y-3">
                    {scheduleFormData.imageUrl && (
                      <div className="border rounded-lg p-3 bg-gray-50">
                        <img src={scheduleFormData.imageUrl} alt="Selected" className="max-h-32 mx-auto mb-2" />
                        <div className="text-center">
                          <button
                            type="button"
                            onClick={() => setScheduleFormData(prev => ({ ...prev, imageUrl: '' }))
                            }
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove Image
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleImageUpload(file);
                        }}
                        className="hidden"
                      />
                      <Image className="h-6 w-6 mx-auto mb-2 text-gray-400" />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Upload Image
                      </button>
                      <p className="text-xs text-gray-500 mt-1">Max 5MB</p>
                    </div>
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={scheduleFormData.scheduledDate}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, scheduledDate: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                    <input
                      type="time"
                      value={scheduleFormData.scheduledTime}
                      onChange={(e) => setScheduleFormData(prev => ({ ...prev, scheduledTime: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex space-x-4">
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSchedulePost}
                    disabled={submitting || !fbLoggedIn}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    <span>{submitting ? 'Scheduling...' : 'Schedule Post'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminContentPortfolio;