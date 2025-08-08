import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Linkedin, ArrowLeft, Save, ExternalLink, CheckCircle, Plus, Settings, ChevronDown, ChevronRight, Loader2, Users, UserCheck, Trash2, Send, Image, FileText, TrendingUp, Eye, MessageSquare, Share2, Heart } from 'lucide-react';
import { useAuth } from '../../admin/contexts/AuthContext';
import axios from 'axios';
import { getUserData, setUserData, removeUserData, migrateToUserSpecificStorage } from '../../utils/sessionUtils';

function LinkedInIntegration() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [showAccountSelector, setShowAccountSelector] = useState(false);

  // Post creation state
  const [postText, setPostText] = useState('');
  const [postImage, setPostImage] = useState(null);
  const [postImagePreview, setPostImagePreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState('');
  const [postError, setPostError] = useState('');

  // LinkedIn OAuth configuration
  const LINKEDIN_CLIENT_ID = process.env.REACT_APP_LINKEDIN_CLIENT_ID;
  const LINKEDIN_REDIRECT_URI = process.env.REACT_APP_LINKEDIN_REDIRECT_URI;
  // Only use available scopes
  const LINKEDIN_SCOPE = 'openid profile email w_member_social';

  // Load saved accounts from localStorage on mount
  useEffect(() => {
    // First, migrate any existing data to user-specific storage
    migrateToUserSpecificStorage([
      'connected_linkedin_accounts',
      'selected_linkedin_account'
    ]);

    const savedAccounts = getUserData('connected_linkedin_accounts');
    const savedSelectedId = getUserData('selected_linkedin_account');
    
    if (savedAccounts) {
      setConnectedAccounts(savedAccounts);
      
      if (savedSelectedId && savedAccounts.find(acc => acc.id === savedSelectedId)) {
        setSelectedAccountId(savedSelectedId);
      } else if (savedAccounts.length > 0) {
        setSelectedAccountId(savedAccounts[0].id);
      }
    }
  }, []);

  // Start LinkedIn OAuth in popup
  const handleLinkedInConnect = () => {
    setError('');
    setLoading(true);
    const state = Math.random().toString(36).substring(2);
    localStorage.setItem('linkedin_oauth_state', state);

    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINKEDIN_REDIRECT_URI)}&scope=${encodeURIComponent(LINKEDIN_SCOPE)}&state=${state}`;
    
    const width = 600, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authUrl,
      'linkedin-login',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Listen for messages from popup
    const handleMessage = (event) => {
      if (event.data?.source === 'linkedin-callback') {
        window.removeEventListener('message', handleMessage);
        if (event.data.success) {
          handleLinkedInSuccess(event.data.access_token, event.data.userinfo);
        } else {
          setError(event.data.error || 'LinkedIn authentication failed');
          setLoading(false);
        }
        // Don't close popup immediately, let the success page show for a moment
      }
    };

    window.addEventListener('message', handleMessage);

    // Check if popup was closed manually
    const checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', handleMessage);
        setLoading(false);
        if (!success) {
          setError('Popup closed before authentication completed');
        }
      }
    }, 1000);
  };

  // Handle successful LinkedIn authentication
  const handleLinkedInSuccess = async (token, userinfo) => {
    try {
      if (userinfo && userinfo.sub) {
        // Check if account already exists
        const existingAccount = connectedAccounts.find(acc => acc.id === userinfo.sub);
        if (existingAccount) {
          setError('This LinkedIn account is already connected.');
          setLoading(false);
          return;
        }

        // Create profile object from userinfo
        const profile = {
          id: userinfo.sub,
          name: userinfo.name || '',
          headline: userinfo.preferred_username || '',
          email: userinfo.email || '',
          picture: userinfo.picture || ''
        };

        // Add new account
        const newAccount = {
          id: userinfo.sub,
          token: token,
          profile: profile,
          connectedAt: new Date().toISOString(),
          lastRefreshed: new Date().toISOString()
        };

        const updatedAccounts = [...connectedAccounts, newAccount];
        setConnectedAccounts(updatedAccounts);
        
        // Set as selected if it's the first account
        if (!selectedAccountId) {
          setSelectedAccountId(newAccount.id);
          setUserData('selected_linkedin_account', newAccount.id);
        }

        // Save to localStorage with user-specific keys
        setUserData('connected_linkedin_accounts', updatedAccounts);
        
        // Store customer social account for admin access
        await storeCustomerSocialAccount(newAccount);
        
        setError('');
        setSuccess('LinkedIn account connected successfully!');
        setLoading(false);
        
        // Refetch LinkedIn data
        fetchLinkedinData();
      } else {
        setError('Failed to get user information from LinkedIn');
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to process LinkedIn authentication');
      setLoading(false);
    }
  };

  // Store customer social account for admin access
  const storeCustomerSocialAccount = async (account) => {
    try {
      // Get current user/customer ID from auth context or localStorage
      let customerId = null;
      
      // Try multiple ways to get customer ID (similar to contentRoutes.js pattern)
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
      customerId = currentUser.userId || currentUser.id || currentUser._id || currentUser.customer_id;
      
      // If still no customer ID, try getting from other possible sources
      if (!customerId) {
        const authUser = JSON.parse(localStorage.getItem('user') || '{}');
        customerId = authUser.userId || authUser.id || authUser._id || authUser.customer_id;
      }
      
      // Log what we found for debugging
      console.log('🔍 LinkedIn Customer ID search:', {
        currentUser,
        customerId,
        found: !!customerId
      });
      
      if (!customerId) {
        console.warn('No customer ID found, cannot store LinkedIn social account');
        return;
      }

      const accountData = {
        customerId: customerId,
        platform: 'linkedin',
        platformUserId: account.id,
        name: account.profile.name,
        email: account.profile.email,
        profilePicture: account.profile.picture,
        accessToken: account.token,
        pages: [], // LinkedIn doesn't have pages like Facebook
        connectedAt: account.connectedAt
      };

      console.log('📤 Sending LinkedIn account data:', { customerId, platform: 'linkedin', platformUserId: account.id });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored LinkedIn customer social account for admin access');
      } else {
        console.warn('Failed to store LinkedIn customer social account:', result.error);
      }
      
    } catch (error) {
      console.warn('Failed to store LinkedIn customer social account:', error);
    }
  };

  const selectedAccount = connectedAccounts.find(acc => acc.id === selectedAccountId);

  // OIDC userinfo state
  const [oidcUserinfo, setOidcUserinfo] = useState(null);

  // Fetch OIDC userinfo for selected account
  const fetchOidcUserinfo = async (accountId) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (!account) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/linkedin/userinfo`, {
        headers: {
          Authorization: `Bearer ${account.token}`,
        },
        credentials: 'include'
      });
      const data = await response.json();
      if (data && data.sub) {
        setOidcUserinfo(data);
        setSuccess('Fetched OIDC userinfo successfully!');
      } else {
        setError('Failed to fetch OIDC userinfo.');
      }
    } catch (err) {
      setError('Failed to fetch OIDC userinfo.');
    }
    setLoading(false);
  };

  // LinkedIn data state
  const [linkedinData, setLinkedinData] = useState([]);
  const [linkedinDataLoading, setLinkedinDataLoading] = useState(true);

  // Fetch LinkedIn data from API
  const fetchLinkedinData = async () => {
    setLinkedinDataLoading(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/linkedin`);
      setLinkedinData(res.data);
    } catch (error) {
      // Optionally set error state here
    } finally {
      setLinkedinDataLoading(false);
    }
  };

  // LinkedIn analytics state
  const [linkedinAnalytics, setLinkedinAnalytics] = useState({
    profileViews: '--',
    connections: '--',
    postEngagement: '--'
  });

  // Fetch LinkedIn analytics from API
  const fetchLinkedinAnalytics = async () => {
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/linkedin/analytics`);
      setLinkedinAnalytics({
        profileViews: res.data.profileViews ?? '--',
        connections: res.data.connections ?? '--',
        postEngagement: res.data.postEngagement ?? '--'
      });
    } catch (error) {
      setLinkedinAnalytics({
        profileViews: '--',
        connections: '--',
        postEngagement: '--'
      });
    }
  };

  // Fetch LinkedIn data on mount
  useEffect(() => {
    fetchLinkedinData();
  }, []);

  // Refetch LinkedIn data after account connect/disconnect
  useEffect(() => {
    fetchLinkedinData();
  }, [connectedAccounts.length]);

  // Fetch LinkedIn analytics on mount and when selectedAccount changes
  useEffect(() => {
    if (selectedAccount) {
      fetchLinkedinAnalytics();
    }
  }, [selectedAccount]);

  // Disconnect all accounts
  const handleDisconnectAll = () => {
    setConnectedAccounts([]);
    setSelectedAccountId(null);
    setError('');
    setSuccess('');
    removeUserData('connected_linkedin_accounts');
    removeUserData('selected_linkedin_account');
    fetchLinkedinData();
  };

  // Disconnect specific account
  const disconnectAccount = (accountId) => {
    const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
    setConnectedAccounts(updatedAccounts);
    
    // If disconnecting the selected account, select another one
    if (selectedAccountId === accountId) {
      const newSelectedId = updatedAccounts.length > 0 ? updatedAccounts[0].id : null;
      setSelectedAccountId(newSelectedId);
      setUserData('selected_linkedin_account', newSelectedId || '');
    }

    setUserData('connected_linkedin_accounts', updatedAccounts);
    fetchLinkedinData();
  };

  // Select account
  const selectAccount = (accountId) => {
    setSelectedAccountId(accountId);
    setUserData('selected_linkedin_account', accountId);
    setShowAccountSelector(false);
  };

  // Refresh account data
  const refreshAccountData = async (accountId) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (!account) return;

    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/linkedin/profile`, {
        headers: {
          Authorization: `Bearer ${account.token}`,
        },
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data && data.name) {
        const updatedAccounts = connectedAccounts.map(acc => 
          acc.id === accountId 
            ? { ...acc, profile: data, lastRefreshed: new Date().toISOString() }
            : acc
        );
        
        setConnectedAccounts(updatedAccounts);
        setUserData('connected_linkedin_accounts', updatedAccounts);
      }
    } catch (err) {
      setError('Failed to refresh account data.');
    }
    setLoading(false);
  };

  // Handle image upload for posts
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setPostError('Image size should be less than 5MB');
        return;
      }
      
      setPostImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPostImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setPostError('');
    }
  };

  // Bucket image browser state
  const [showImageBrowser, setShowImageBrowser] = useState(false);
  const [bucketImages, setBucketImages] = useState([]);
  const [loadingImages, setLoadingImages] = useState(false);

  // Fetch existing images from bucket
  const fetchBucketImages = async () => {
    setLoadingImages(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/gcs/list-images?limit=100`);
      const result = await response.json();
      if (result.success) {
        setBucketImages(result.images);
      }
    } catch (error) {
      setBucketImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  // Select image from bucket
  const handleSelectExistingImage = (imageUrl) => {
    setPostImagePreview(imageUrl);
    setPostImage(null); // Not a file, just a URL
    setShowImageBrowser(false);
    setPostError('');
  };

  // Remove uploaded image
  const removeImage = () => {
    setPostImage(null);
    setPostImagePreview(null);
  };

  // Create LinkedIn post
  const handleCreatePost = async () => {
    if (!postText.trim() && !postImagePreview) {
      setPostError('Please enter some text or choose an image');
      return;
    }

    if (postImage) {
      setPostError('Direct image upload is not supported yet. Please choose an image from your library or remove the image and try again.');
      setPosting(false);
      return;
    }

    // Warn if image is selected (from bucket)
    if (postImagePreview) {
      setPostError('LinkedIn does not support posting images in proper format for personal accounts. Only your text and a link to the image will be posted. For true image posts, LinkedIn requires special API access.');
    }

    const selectedAccount = connectedAccounts.find(acc => acc.id === selectedAccountId);
    if (!selectedAccount) {
      setPostError('No account selected');
      return;
    }

    setPosting(true);
    setPostSuccess('');

    try {
      // Only support text posts; imageUrl will be ignored by backend
      const payload = {
        text: postText,
        linkedin_token: selectedAccount.token,
        imageUrl: postImagePreview || ''
      };

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/linkedin/post`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${selectedAccount.token}`,
          },
        }
      );

      if (response.data && response.data.success) {
        setPostSuccess('Post created successfully on LinkedIn! (Image not supported)');
        setPostText('');
        setPostImage(null);
        setPostImagePreview(null);

        // Reset file input
        const fileInput = document.getElementById('post-image-input');
        if (fileInput) fileInput.value = '';
      } else {
        setPostError(response.data?.error || 'Failed to create post on LinkedIn.');
      }
    } catch (err) {
      setPostError(
        err.response?.data?.error
          ? `Failed to create post: ${err.response.data.error}${err.response.data.details ? ' - ' + JSON.stringify(err.response.data.details) : ''}`
          : 'Failed to create post. Please try again.'
      );
    } finally {
      setPosting(false);
    }
  };

  const renderAccountSelector = () => {
    if (connectedAccounts.length <= 1) return null;

    return (
      <div className="relative">
        <button
          onClick={() => setShowAccountSelector(!showAccountSelector)}
          className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            {selectedAccount?.profile?.picture ? (
              <img
                src={selectedAccount.profile.picture}
                alt="Profile"
                className="w-6 h-6 rounded-full"
              />
            ) : (
              <Linkedin className="h-4 w-4 text-blue-700" />
            )}
            <span>{selectedAccount?.profile?.name || 'Select Account'}</span>
          </div>
          {showAccountSelector ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>

        {showAccountSelector && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
            <div className="p-2">
              <div className="text-xs font-medium text-gray-500 px-2 py-1 mb-1">
                Connected Accounts ({connectedAccounts.length})
              </div>
              {connectedAccounts.map(account => (
                <button
                  key={account.id}
                  onClick={() => selectAccount(account.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left hover:bg-gray-50 transition-colors ${
                    selectedAccountId === account.id ? 'bg-blue-50 border border-blue-200' : ''
                  }`}
                >
                  {account.profile?.picture ? (
                    <img
                      src={account.profile.picture}
                      alt="Profile"
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Linkedin className="h-4 w-4 text-blue-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {account.profile?.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {account.profile?.headline || account.profile?.email}
                    </div>
                  </div>
                  {selectedAccountId === account.id && (
                    <CheckCircle className="h-4 w-4 text-blue-700" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render account management section
  const renderAccountManagement = () => {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-700 flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Connected LinkedIn Accounts ({connectedAccounts.length})
          </h4>
          <button
            onClick={handleLinkedInConnect}
            disabled={loading}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-800 flex items-center space-x-2 text-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>{loading ? 'Connecting...' : 'Add Account'}</span>
          </button>
        </div>
        
        {connectedAccounts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectedAccounts.map((account) => (
              <div
                key={account.id}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  selectedAccountId === account.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => selectAccount(account.id)}
              >
                <div className="flex items-center space-x-3">
                  {account.profile?.picture ? (
                    <img
                      src={account.profile.picture}
                      alt={account.profile.name}
                      className="w-12 h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Linkedin className="h-6 w-6 text-blue-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h5 className="font-medium text-gray-900 truncate">{account.profile?.name}</h5>
                      {selectedAccountId === account.id && (
                        <UserCheck className="h-4 w-4 text-blue-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 truncate">{account.profile?.headline || account.profile?.email}</p>
                    <p className="text-xs text-gray-500">
                      Connected {new Date(account.connectedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      disconnectAccount(account.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    title="Remove account"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render post creation section
  const renderPostCreation = () => {
    if (!selectedAccount) return null;

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-blue-700 p-2 rounded-lg">
            <Send className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Create LinkedIn Post</h3>
            <p className="text-sm text-gray-600">Share your thoughts with your professional network</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Post text area */}
          <div>
            <textarea
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              placeholder="What's on your mind? Share your professional insights..."
              className="w-full p-4 border border-gray-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              maxLength={3000}
              disabled={posting}
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-gray-500">
                {postText.length}/3000 characters
              </span>
            </div>
          </div>

          {/* Image upload and bucket browser */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors">
              <Image className="h-4 w-4" />
              <span>Upload Image</span>
              <input
                id="post-image-input"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={posting}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                setShowImageBrowser(true);
                fetchBucketImages();
              }}
              className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm"
              disabled={posting}
            >
              Browse Library
            </button>
            {postImagePreview && (
              <div className="relative">
                <img
                  src={postImagePreview}
                  alt="Post preview"
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <button
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                  disabled={posting}
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Image browser modal */}
          {showImageBrowser && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Select Image from Library</h2>
                    <button
                      onClick={() => setShowImageBrowser(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                  {loadingImages ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <span className="ml-2">Loading images...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bucketImages.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                          <Image className="h-16 w-16 mx-auto mb-4 opacity-50" />
                          <p>No images found in your library</p>
                          <p className="text-sm">Upload some images first to see them here</p>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm text-gray-600 mb-4">
                            Found {bucketImages.length} images in your library
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                            {bucketImages.map((image, index) => (
                              <div
                                key={index}
                                className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => handleSelectExistingImage(image.publicUrl)}
                              >
                                <img
                                  src={image.publicUrl}
                                  alt={image.name}
                                  className="w-full h-32 object-cover"
                                />
                                <div className="p-2 bg-gray-50">
                                  <p className="text-xs text-gray-600 truncate" title={image.name}>
                                    {image.name.split('/').pop()}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(image.updated).toLocaleDateString()}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Post button */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Linkedin className="h-4 w-4" />
              <span>Posting as {selectedAccount.profile?.name}</span>
            </div>
            
            <button
              onClick={handleCreatePost}
              disabled={posting || (!postText.trim() && !postImage)}
              className="bg-blue-700 text-white px-6 py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-colors"
            >
              {posting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Post</span>
                </>
              )}
            </button>
          </div>

          {/* Post feedback */}
          {postError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{postError}</p>
            </div>
          )}

          {postSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-600 text-sm">{postSuccess}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Render analytics section (placeholder)
  const renderAnalytics = () => {
    if (!selectedAccount) return null;

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-700 p-2 rounded-lg">
            <TrendingUp className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">LinkedIn Analytics</h3>
            <p className="text-sm text-gray-600">Track your professional network growth</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Profile Views</p>
                <p className="text-2xl font-bold text-gray-900">{linkedinAnalytics.profileViews}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Connections</p>
                <p className="text-2xl font-bold text-gray-900">{linkedinAnalytics.connections}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="bg-purple-100 p-2 rounded-lg">
                <MessageSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Post Engagement</p>
                <p className="text-2xl font-bold text-gray-900">{linkedinAnalytics.postEngagement}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> Detailed analytics require LinkedIn Marketing Developer Platform access. 
            Current integration shows basic profile information only.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/customer/settings')}
              className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <Linkedin className="h-8 w-8 text-blue-700" />
              <span className="ml-2 text-xl font-bold text-[#1a1f2e]">LinkedIn Integration</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Linkedin className="h-6 w-6 text-blue-700" />
            <h3 className="font-medium text-lg">LinkedIn Professional Integration</h3>
          </div>

          {connectedAccounts.length === 0 ? (
            <>
              {/* Integration content */}
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
                  <Linkedin className="h-8 w-8 text-blue-700" />
                </div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Connect LinkedIn Accounts</h4>
                <p className="text-gray-600 mb-4 max-w-md mx-auto">
                  Connect multiple LinkedIn profiles to manage all your professional accounts from one dashboard.
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Works with any LinkedIn account - no business account required!
                </p>
                <button 
                  onClick={handleLinkedInConnect}
                  disabled={loading}
                  className="bg-blue-700 text-white px-8 py-3 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center space-x-3 mx-auto font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Linkedin className="h-5 w-5" />
                      <span>Connect LinkedIn Account</span>
                    </>
                  )}
                </button>
              </div>

              {/* Simplified Integration Guide */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-medium text-blue-800 mb-3">How It Works</h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <p>1. Click "Connect LinkedIn Account" above</p>
                  <p>2. Sign in with your LinkedIn credentials</p>
                  <p>3. Grant permission to access your basic profile</p>
                  <p>4. Start creating posts and managing your LinkedIn presence</p>
                </div>
                
                <div className="mt-4 bg-white rounded-lg p-3 border border-blue-200">
                  <p className="text-xs text-blue-600">
                    <strong>Note:</strong> This integration works with any LinkedIn account. 
                    Advanced features like detailed analytics require LinkedIn Marketing Developer Platform access.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {renderAccountManagement()}
              
              {selectedAccount && (
                <>
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-3">
                      {selectedAccount.profile?.picture ? (
                        <img 
                          src={selectedAccount.profile.picture} 
                          alt="Profile"
                          className="w-12 h-12 rounded-full border-2 border-blue-200"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Linkedin className="h-6 w-6 text-blue-700" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">Active Account: {selectedAccount.profile?.name}</p>
                        <p className="text-sm text-gray-600">{selectedAccount.profile?.headline || selectedAccount.profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => refreshAccountData(selectedAccount.id)}
                        disabled={loading}
                        className="flex items-center space-x-2 px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={handleDisconnectAll}
                        className="flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Disconnect All</span>
                      </button>
                    </div>
                  </div>

                  {renderPostCreation()
                  }
                  {renderAnalytics()}

                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => fetchOidcUserinfo(selectedAccount.id)}
                      disabled={loading}
                      className="flex items-center space-x-2 px-3 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-50 text-sm"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Show OIDC Userinfo</span>
                    </button>
                  </div>

                  {oidcUserinfo && (
                    <div className="mt-6 bg-white rounded-xl p-4 shadow-sm border border-indigo-200">
                      <div className="font-medium text-indigo-600 mb-2">OIDC Userinfo</div>
                      <pre className="text-xs text-gray-700 bg-gray-50 rounded p-2 overflow-x-auto">{JSON.stringify(oidcUserinfo, null, 2)}</pre>
                    </div>
                  )}
                </>
              )}

              {/* LinkedIn Data Grid */}
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">LinkedIn Data</h2>
                {linkedinDataLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {linkedinData.length > 0 ? (
                      linkedinData.map((item, index) => (
                        <div key={index} className="border border-gray-200 p-4 rounded-lg shadow-sm">
                          <p><strong>Company:</strong> {item.company}</p>
                          <p><strong>URL:</strong> {item.url}</p>
                          <p><strong>Status:</strong> {item.status}</p>
                          {/* Show image URL as text if present */}
                          {item.imageUrl ? (
                            <div className="mt-2 text-xs text-blue-700 break-all">
                              <strong>Image URL:</strong> <a href={item.imageUrl} target="_blank" rel="noopener noreferrer">{item.imageUrl}</a>
                            </div>
                          ) : (
                            // Try to extract image URL from text if present
                            (() => {
                              const match = item.text && item.text.match(/\[Image:\s*(https?:\/\/[^\]]+)\]/);
                              if (match) {
                                return (
                                  <div className="mt-2 text-xs text-blue-700 break-all">
                                    <strong>Image URL:</strong> <a href={match[1]} target="_blank" rel="noopener noreferrer">{match[1]}</a>
                                  </div>
                                );
                              }
                              return null;
                            })()
                          )}
                          {/* Show post text */}
                          {item.text && (
                            <div className="mt-2 text-gray-700 text-sm">
                              {item.text}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 text-center py-8 text-gray-500">
                        <Linkedin className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                        <p>No LinkedIn data available yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

             
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-red-600 text-sm">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-green-600 text-sm">
                <strong>Success:</strong> {success}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default LinkedInIntegration;