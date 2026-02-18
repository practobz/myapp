import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Linkedin, ArrowLeft, Save, ExternalLink, CheckCircle, Plus, Settings, ChevronDown, ChevronRight, Loader2, Users, UserCheck, Trash2, Send, Image, FileText, TrendingUp, Eye, MessageSquare, Share2, Heart, MousePointer, Building2, User } from 'lucide-react';
import { useAuth } from '../../admin/contexts/AuthContext';
import axios from 'axios';
import { getUserData, setUserData, removeUserData, migrateToUserSpecificStorage } from '../../utils/sessionUtils';

function LinkedInIntegration({ onConnectionStatusChange }) {
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
  // Updated scopes to include all necessary permissions for analytics and comment management
  const LINKEDIN_SCOPE = 'r_basicprofile w_member_social r_member_postAnalytics r_organization_social w_organization_social rw_organization_admin r_organization_followers w_member_social_feed w_organization_social_feed r_organization_social_feed';

  // Helper: Get current customerId (same logic as storeCustomerSocialAccount)
  const getCustomerId = () => {
    let customerId = null;
    
    // 🔥 PRIORITY 1: Check URL parameters first (for QR code links)
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    
    // Check both regular URL params and hash params (for React Router)
    customerId = urlParams.get('customerId') || hashParams.get('customerId');
    
    if (customerId) {
      console.log('✅ Found customer ID in URL for LinkedIn:', customerId);
      return customerId;
    }
    
    // 🔥 PRIORITY 2: Check localStorage as fallback
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    customerId = currentUser.userId || currentUser.id || currentUser._id || currentUser.customer_id;
    
    if (!customerId) {
      const authUser = JSON.parse(localStorage.getItem('user') || '{}');
      customerId = authUser.userId || authUser.id || authUser._id || authUser.customer_id;
    }
    
    if (customerId) {
      console.log('✅ Found customer ID in localStorage for LinkedIn:', customerId);
    } else {
      console.warn('❌ No customer ID found in URL or localStorage for LinkedIn');
    }
    
    return customerId;
  };

  // Helper: Normalize accounts so each has an 'id' property
  const normalizeAccounts = (accounts) => {
    return accounts.map(acc => {
      const accountId = acc.id || acc._id || '';
      const platformUserId = acc.platformUserId || '';
      
      // Detect if this is an organization account by checking the platformUserId or ID
      const isOrgAccount = platformUserId.includes('urn:li:organization:') || accountId.includes('organization');
      
      // Extract organization ID if it's an org account
      let organizationId = acc.organizationId || '';
      if (!organizationId && isOrgAccount) {
        // Try to extract from platformUserId or account ID
        if (platformUserId.includes('urn:li:organization:')) {
          organizationId = platformUserId.replace('urn:li:organization:', '');
        } else if (accountId.includes('organization:')) {
          // Extract from ID like: customerId_linkedin_urn:li:organization:106973671
          const match = accountId.match(/organization:(\d+)/);
          if (match) organizationId = match[1];
        }
      }
      
      return {
        ...acc,
        id: accountId,
        token: acc.token || acc.accessToken, // Map accessToken from DB to token
        accountType: acc.accountType || (isOrgAccount ? 'organization' : 'personal'),
        organizationId: organizationId,
        profile: acc.profile
          ? acc.profile
          : {
              name: acc.name || '',
              headline: acc.headline || acc.preferred_username || '',
              email: acc.email || '',
              picture: acc.picture || ''
            }
      };
    });
  };

  // Check rate limit status on mount
  useEffect(() => {
    const resetTimeStr = localStorage.getItem('linkedin_rate_limit_reset');
    if (resetTimeStr) {
      const resetTime = new Date(resetTimeStr);
      if (resetTime > new Date()) {
        setIsRateLimited(true);
        setRateLimitResetTime(resetTime);
        console.log('⚠️ Rate limit active until:', resetTime);
      } else {
        // Reset time has passed
        localStorage.removeItem('linkedin_rate_limit_reset');
        setIsRateLimited(false);
      }
    }
  }, []);

  // Load accounts from backend on mount
  useEffect(() => {
    const customerId = getCustomerId();
    
    // 🔥 NEW: Log the customer ID detection for debugging
    console.log('🆔 Detected Customer ID for LinkedIn:', {
      customerId,
      urlParams: new URLSearchParams(window.location.search).get('customerId'),
      hashParams: new URLSearchParams(window.location.hash.split('?')[1] || '').get('customerId'),
      localStorage: JSON.parse(localStorage.getItem('currentUser') || '{}'),
      fullUrl: window.location.href
    });
    
    if (!customerId) {
      console.warn('❌ No customer ID available for LinkedIn backend fetch');
      return;
    }

    // Fetch from backend
    const fetchFromBackend = async () => {
      try {
        const res = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${customerId}`);
        const result = await res.json();
        if (result.success && Array.isArray(result.accounts)) {
          // Only keep LinkedIn accounts for this customer
          const linkedinAccounts = result.accounts.filter(
            acc => acc.platform === 'linkedin' && acc.customerId === customerId
          );
          const normalized = normalizeAccounts(linkedinAccounts);
          setConnectedAccounts(normalized);
          setUserData('connected_linkedin_accounts', normalized);
          setUserData('linkedin_connected_accounts', normalized);

          // Select account logic
          const savedSelectedId = getUserData('selected_linkedin_account');
          if (savedSelectedId && normalized.find(acc => acc.id === savedSelectedId)) {
            setSelectedAccountId(savedSelectedId);
          } else if (normalized.length > 0) {
            setSelectedAccountId(normalized[0].id);
            setUserData('selected_linkedin_account', normalized[0].id);
          }
        }
      } catch (err) {
        // fallback to localStorage if backend fails
        const savedAccounts = getUserData('connected_linkedin_accounts');
        const savedSelectedId = getUserData('selected_linkedin_account');
        if (savedAccounts) {
          // Only keep LinkedIn accounts for this customer
          const linkedinAccounts = savedAccounts.filter(
            acc => acc.platform === 'linkedin' && acc.customerId === customerId
          );
          const normalized = normalizeAccounts(linkedinAccounts);
          setConnectedAccounts(normalized);
          setUserData('linkedin_connected_accounts', normalized);
          if (savedSelectedId && normalized.find(acc => acc.id === savedSelectedId)) {
            setSelectedAccountId(savedSelectedId);
          } else if (normalized.length > 0) {
            setSelectedAccountId(normalized[0].id);
          }
        }
      }
    };

    fetchFromBackend();
  }, []); // 🔥 IMPORTANT: Keep dependency array empty to run only on mount

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
          handleLinkedInSuccess(event.data.access_token, event.data.profile);
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
  const handleLinkedInSuccess = async (token, profile) => {
    try {
      setLoading(true);
      setError('');

      // Try to fetch both personal profile and organizations
      // This will work once Community Management API is approved
      let orgsData = null;
      try {
        const orgsResponse = await fetch(`${process.env.REACT_APP_API_URL}/linkedin/organizations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (orgsResponse.ok) {
          orgsData = await orgsResponse.json();
        } else {
          console.warn('Organization access not available yet (Community Management API may need approval)');
        }
      } catch (orgError) {
        console.warn('Could not fetch organizations:', orgError.message);
      }

      // If organization fetch failed, use profile directly
      if (!orgsData) {
        // Extract localized values safely
        const firstName = profile.localizedFirstName || profile.firstName?.localized?.en_US || '';
        const lastName = profile.localizedLastName || profile.lastName?.localized?.en_US || '';
        const headline = typeof profile.headline === 'string' ? profile.headline : (profile.headline?.localized?.en_US || '');
        const name = `${firstName} ${lastName}`.trim() || 'LinkedIn User';
        
        orgsData = {
          personal: {
            id: profile.id,
            name: name,
            headline: headline,
            firstName: firstName,
            lastName: lastName,
            picture: '',
            type: 'personal'
          },
          organizations: []
        };
      }
      console.log('Organizations data:', orgsData);

      // Combine personal and organization accounts
      const allAccounts = [];
      
      // Add personal account
      if (orgsData.personal) {
        allAccounts.push({
          id: orgsData.personal.id,
          _id: orgsData.personal.id,
          token: token,
          profile: {
            name: orgsData.personal.name,
            headline: orgsData.personal.headline || orgsData.personal.email,
            email: orgsData.personal.email,
            picture: orgsData.personal.picture
          },
          accountType: 'personal',
          connectedAt: new Date().toISOString(),
          lastRefreshed: new Date().toISOString()
        });
      }

      // Add organization accounts
      if (orgsData.organizations && orgsData.organizations.length > 0) {
        orgsData.organizations.forEach(org => {
          allAccounts.push({
            id: org.id,
            _id: org.id,
            organizationId: org.organizationId,
            token: token,
            profile: {
              name: org.name,
              headline: org.vanityName ? `@${org.vanityName}` : 'Organization Page',
              email: '',
              picture: org.picture
            },
            accountType: 'organization',
            connectedAt: new Date().toISOString(),
            lastRefreshed: new Date().toISOString()
          });
        });
      }

      if (allAccounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Filter out already connected accounts
      const newAccounts = allAccounts.filter(acc => 
        !connectedAccounts.find(existing => existing.id === acc.id)
      );

      if (newAccounts.length === 0) {
        setError('All these LinkedIn accounts are already connected.');
        setLoading(false);
        return;
      }

      // Update state with all accounts
      const updatedAccounts = [...connectedAccounts, ...newAccounts];
      setConnectedAccounts(updatedAccounts);
      
      // Set as selected if it's the first account
      if (!selectedAccountId) {
        setSelectedAccountId(newAccounts[0].id);
        setUserData('selected_linkedin_account', newAccounts[0].id);
      }

      // Save to localStorage
      setUserData('connected_linkedin_accounts', updatedAccounts);
      setUserData('linkedin_connected_accounts', updatedAccounts);
      
      // Store each new account in backend
      for (const account of newAccounts) {
        await storeCustomerSocialAccount(account);
      }

      const orgCount = newAccounts.filter(a => a.accountType === 'organization').length;
      const personalCount = newAccounts.filter(a => a.accountType === 'personal').length;
      let successMsg = 'Successfully connected ';
      if (personalCount > 0) successMsg += `${personalCount} personal profile${personalCount > 1 ? 's' : ''}`;
      if (orgCount > 0 && personalCount > 0) successMsg += ' and ';
      if (orgCount > 0) successMsg += `${orgCount} organization page${orgCount > 1 ? 's' : ''}`;
      successMsg += '!';
      
      setSuccess(successMsg);
      
      if (onConnectionStatusChange) {
        onConnectionStatusChange(true);
      }

      // Refetch LinkedIn data
      fetchLinkedinData();
    } catch (err) {
      setError('Failed to connect LinkedIn. Please try again.');
      console.error('LinkedIn connection error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Store customer social account for admin access
  const storeCustomerSocialAccount = async (account) => {
    try {
      // 🔥 CRITICAL FIX: Use the correct customer ID detection
      const customerId = getCustomerId();
      
      // Log what we found for debugging
      console.log('🔍 LinkedIn Customer ID search for social account storage:', {
        customerId,
        found: !!customerId,
        urlCustomerId: new URLSearchParams(window.location.search).get('customerId') || 
                       new URLSearchParams(window.location.hash.split('?')[1] || '').get('customerId'),
        localStorageUser: JSON.parse(localStorage.getItem('currentUser') || '{}')
      });
      
      if (!customerId) {
        console.error('No customer ID found for LinkedIn, cannot store social account');
        return;
      }

      const accountData = {
        customerId: customerId, // 🔥 Use the correctly detected customer ID
        platform: 'linkedin',
        platformUserId: account.id,
        name: account.profile.name,
        email: account.profile.email,
        profilePicture: account.profile.picture,
        accessToken: account.token,
        pages: [], // LinkedIn doesn't have pages like Facebook
        connectedAt: account.connectedAt
      };

      console.log('📤 Sending LinkedIn account data with customer ID:', { 
        customerId, 
        platform: 'linkedin', 
        platformUserId: account.id 
      });

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountData)
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('✅ Stored LinkedIn customer social account for admin access with customer ID:', customerId);
      } else {
        console.warn('Failed to store LinkedIn customer social account:', result.error);
      }
      
    } catch (error) {
      console.warn('Failed to store LinkedIn customer social account:', error);
    }
  };

  const selectedAccount = connectedAccounts.find(acc => acc.id === selectedAccountId);

  // LinkedIn profile state
  const [linkedinProfile, setLinkedinProfile] = useState(null);

  // Fetch LinkedIn profile for selected account
  const fetchLinkedinProfile = async (accountId) => {
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
      if (data && data.id) {
        setLinkedinProfile(data);
      } else {
        setError('Unable to load profile information.');
      }
    } catch (err) {
      setError('Unable to load profile information.');
    }
    setLoading(false);
  };

  // LinkedIn data state
  const [linkedinData, setLinkedinData] = useState([]);
  const [linkedinDataLoading, setLinkedinDataLoading] = useState(true);

  // Posts state
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState('');
  
  // Rate limiting state
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [rateLimitResetTime, setRateLimitResetTime] = useState(null);

  // Post analytics state
  const [postAnalytics, setPostAnalytics] = useState({});
  const [loadingAnalytics, setLoadingAnalytics] = useState({});
  
  // Single post analytics state (detailed view)
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [singlePostAnalytics, setSinglePostAnalytics] = useState(null);
  const [loadingSinglePost, setLoadingSinglePost] = useState(false);
  
  // Comments state
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState(false);
  const [replyingToComment, setReplyingToComment] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

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
    postEngagement: '--',
    followers: '--'
  });

  // Calculate analytics from local data (API requires partner access)
  const fetchLinkedinAnalytics = async () => {
    if (!selectedAccount) return;
    
    // Load local posts for this account
    const storageKey = `linkedin_posts_${selectedAccount.id}`;
    const localPosts = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Calculate total engagement from posts
    let totalEngagement = 0;
    localPosts.forEach(post => {
      if (post.analytics) {
        totalEngagement += (post.analytics.likeCount || 0) + 
                          (post.analytics.commentCount || 0) + 
                          (post.analytics.shareCount || 0);
      }
    });
    
    // If organization account, fetch real statistics
    if (selectedAccount.accountType === 'organization' && selectedAccount.organizationId) {
      try {
        // Fetch organization statistics and followers in parallel
        const [statsRes, followersRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/linkedin/organization-statistics`, {
            params: {
              token: selectedAccount.token,
              organizationId: selectedAccount.organizationId
            }
          }).catch(err => ({ data: { success: false } })),
          axios.get(`${process.env.REACT_APP_API_URL}/linkedin/organization-followers`, {
            params: {
              token: selectedAccount.token,
              organizationId: selectedAccount.organizationId
            }
          }).catch(err => ({ data: { success: false } }))
        ]);
        
        if (statsRes.data.success) {
          const stats = statsRes.data.statistics;
          const followersCount = followersRes.data.success ? followersRes.data.followers.total : '--';
          
          setLinkedinAnalytics({
            profileViews: stats.uniqueImpressionsCount || 0,
            connections: '--', // Not applicable for organizations
            postEngagement: stats.likeCount + stats.commentCount + stats.shareCount,
            followers: followersCount,
            impressionCount: stats.impressionCount || 0,
            clickCount: stats.clickCount || 0,
            engagementRate: (stats.engagement * 100).toFixed(2) + '%'
          });
          return;
        }
      } catch (error) {
        console.warn('Failed to fetch organization analytics:', error);
      }
    }
    
    // Fallback to local analytics
    setLinkedinAnalytics({
      profileViews: '--', // Requires partner API access
      connections: '--', // Requires partner API access
      postEngagement: totalEngagement,
      followers: '--' // Requires partner API access
    });
  };

  // Fetch posts from LinkedIn API (now working with v2/posts!)
  const fetchPosts = async () => {
    if (!selectedAccount) return;
    
    setPostsLoading(true);
    setPostsError('');
    
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/linkedin/posts`, {
        params: {
          token: selectedAccount.token,
          accountType: selectedAccount.accountType || 'personal',
          organizationId: selectedAccount.organizationId || ''
        }
      });
      
      if (res.data.success) {
        const fetchedPosts = res.data.posts || [];
        console.log('📊 Fetched posts from LinkedIn:', fetchedPosts.length);
        
        // Merge with locally tracked posts
        const storageKey = `linkedin_posts_${selectedAccount.id}`;
        const localPosts = JSON.parse(localStorage.getItem(storageKey) || '[]');
        
        // Combine and deduplicate
        const allPosts = [...fetchedPosts];
        localPosts.forEach(localPost => {
          if (!allPosts.find(p => p.id === localPost.id)) {
            allPosts.push(localPost);
          }
        });
        
        // Sort by date
        allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setPosts(allPosts);
        
        // Load cached analytics first
        const cachedAnalytics = {};
        allPosts.forEach(post => {
          const cacheKey = `linkedin_analytics_${selectedAccount.id}_${post.id}`;
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            try {
              const { data, timestamp } = JSON.parse(cached);
              cachedAnalytics[post.id] = data;
            } catch (e) {
              // Ignore parse errors
            }
          }
        });
        setPostAnalytics(cachedAnalytics);
        console.log(`📦 Loaded ${Object.keys(cachedAnalytics).length} cached analytics`);
        
        // Only fetch fresh analytics if not rate limited
        if (!isRateLimited) {
          // Fetch analytics gradually for each post (with delay to avoid rate limiting)
          // Only fetch for the first 5 posts to conserve API quota
          const postsToFetch = allPosts.slice(0, 5);
          postsToFetch.forEach((post, index) => {
            setTimeout(() => {
              fetchPostAnalytics(post.id);
            }, index * 2000); // 2000ms (2s) delay between each request to stay well under rate limits
          });
        } else {
          console.log('⚠️ Skipping analytics fetch due to rate limit');
        }
      } else {
        setPostsError('Failed to fetch posts');
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPostsError(error.response?.data?.error || 'Failed to fetch posts from LinkedIn');
      
      // Fallback to local posts
      const storageKey = `linkedin_posts_${selectedAccount.id}`;
      const localPosts = JSON.parse(localStorage.getItem(storageKey) || '[]');
      setPosts(localPosts);
    } finally {
      setPostsLoading(false);
    }
  };

  // Fetch analytics for a specific post with caching
  const fetchPostAnalytics = async (postId, retryCount = 0) => {
    if (!selectedAccount || !postId) return;
    
    // Check if we're rate limited
    if (isRateLimited) {
      console.log('⚠️ Rate limited, skipping analytics fetch');
      return;
    }
    
    // Check cache first - only fetch if data is older than 1 hour
    const cacheKey = `linkedin_analytics_${selectedAccount.id}_${postId}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        const oneHour = 60 * 60 * 1000;
        
        if (age < oneHour) {
          console.log(`✅ Using cached analytics for ${postId.substring(0, 30)}... (age: ${Math.round(age / 1000 / 60)}min)`);
          setPostAnalytics(prev => ({ ...prev, [postId]: data }));
          return;
        }
      } catch (e) {
        console.warn('Cache parse error:', e);
      }
    }
    
    setLoadingAnalytics(prev => ({ ...prev, [postId]: true }));
    
    try {
      const params = {
        token: selectedAccount.token,
        postId: postId
      };
      
      // Add organizationId if available
      if (selectedAccount.organizationId) {
        params.organizationId = selectedAccount.organizationId;
      }
      
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/linkedin/social-actions`, {
        params: params
      });
      
      if (res.data.success) {
        const analyticsData = res.data.actions;
        setPostAnalytics(prev => ({
          ...prev,
          [postId]: analyticsData
        }));
        
        // Cache the result
        localStorage.setItem(cacheKey, JSON.stringify({
          data: analyticsData,
          timestamp: Date.now()
        }));
      }
    } catch (error) {
      // Handle rate limiting
      if (error.response?.status === 429) {
        console.error('🔴 LinkedIn API rate limit reached!');
        setIsRateLimited(true);
        
        // Set reset time to 24 hours from now (LinkedIn's daily limit)
        const resetTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        setRateLimitResetTime(resetTime);
        localStorage.setItem('linkedin_rate_limit_reset', resetTime.toISOString());
        
        // Don't retry on rate limit
        setLoadingAnalytics(prev => ({ ...prev, [postId]: false }));
        return;
      }
      
      // Handle other errors with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.warn(`Failed to fetch analytics for ${postId}, retrying in ${delay}ms...`);
        setTimeout(() => {
          fetchPostAnalytics(postId, retryCount + 1);
        }, delay);
        return;
      }
      
      console.warn(`Failed to fetch analytics for post ${postId}:`, error);
      // Set default values
      setPostAnalytics(prev => ({
        ...prev,
        [postId]: { 
          likeCount: 0, 
          commentCount: 0, 
          shareCount: 0, 
          impressionCount: 0, 
          uniqueImpressionsCount: 0, 
          clickCount: 0, 
          engagement: 0, 
          liked: false 
        }
      }));
    } finally {
      setLoadingAnalytics(prev => ({ ...prev, [postId]: false }));
    }
  };

  // Fetch detailed analytics for a single post
  const fetchSinglePostAnalytics = async (post) => {
    if (!post || !selectedAccount) return;
    
    setSelectedPostId(post.id);
    setLoadingSinglePost(true);
    
    try {
      // Fetch social actions (likes, comments, shares, impressions, clicks)
      const params = {
        token: selectedAccount.token,
        postId: post.id
      };
      
      // Add organizationId if available
      if (selectedAccount.organizationId) {
        params.organizationId = selectedAccount.organizationId;
      }
      
      const actionsRes = await axios.get(`${process.env.REACT_APP_API_URL}/linkedin/social-actions`, {
        params: params
      });
      
      const actions = actionsRes.data.success ? actionsRes.data.actions : {};
      
      // Calculate engagement rate based on available metrics
      const totalEngagement = (actions.likeCount || 0) + (actions.commentCount || 0) + (actions.shareCount || 0) + (actions.clickCount || 0);
      const impressions = actions.impressionCount || actions.uniqueImpressionsCount || 0;
      const engagementRate = impressions > 0 ? ((totalEngagement / impressions) * 100).toFixed(2) : (actions.engagement || 0);
      
      // Set analytics data
      setSinglePostAnalytics({
        post,
        actions,
        metrics: {
          likes: actions.likeCount || 0,
          comments: actions.commentCount || actions.aggregatedTotalComments || 0,
          shares: actions.shareCount || 0,
          impressions: actions.impressionCount || 0,
          uniqueImpressions: actions.uniqueImpressionsCount || 0,
          clicks: actions.clickCount || 0,
          engagement: totalEngagement,
          engagementRate: engagementRate
        }
      });
      
      // Fetch comments if there are any
      if (actions.commentCount > 0 || actions.aggregatedTotalComments > 0) {
        fetchPostComments(post.id);
      }
    } catch (error) {
      console.error('Error fetching single post analytics:', error);
      // Set default values
      setSinglePostAnalytics({
        post,
        actions: { 
          likeCount: 0, 
          commentCount: 0, 
          shareCount: 0, 
          impressionCount: 0, 
          uniqueImpressionsCount: 0, 
          clickCount: 0, 
          engagement: 0 
        },
        metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          impressions: 0,
          uniqueImpressions: 0,
          clicks: 0,
          engagement: 0,
          engagementRate: '0'
        }
      });
    } finally {
      setLoadingSinglePost(false);
    }
  };
  
  // Fetch comments for a post
  const fetchPostComments = async (postId) => {
    if (!selectedAccount) return;
    
    setLoadingComments(true);
    try {
      const res = await axios.get(`${process.env.REACT_APP_API_URL}/linkedin/post-comments`, {
        params: {
          token: selectedAccount.token,
          postId: postId
        }
      });
      
      if (res.data.success && res.data.comments) {
        setPostComments(prev => ({
          ...prev,
          [postId]: res.data.comments
        }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      setPostComments(prev => ({
        ...prev,
        [postId]: []
      }));
    } finally {
      setLoadingComments(false);
    }
  };
  
  // Reply to a comment
  const postReplyToComment = async (commentId, message, postId) => {
    if (!selectedAccount || !message.trim()) return;
    
    setSendingReply(true);
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/linkedin/comment-reply`, {
        token: selectedAccount.token,
        commentId: commentId,
        message: message
      });
      
      if (res.data.success) {
        setReplyText('');
        setReplyingToComment(null);
        // Refresh comments
        fetchPostComments(postId);
        setSuccess('Reply posted successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      setError('Unable to post reply. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setSendingReply(false);
    }
  };
  
  // Delete a comment
  const deleteComment = async (commentId, postId) => {
    if (!selectedAccount) return;
    if (!confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      const res = await axios.delete(`${process.env.REACT_APP_API_URL}/linkedin/comment`, {
        data: {
          token: selectedAccount.token,
          commentId: commentId
        }
      });
      
      if (res.data.success) {
        // Refresh comments
        fetchPostComments(postId);
        setSuccess('Comment deleted successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      setError('Unable to delete comment. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };

  // Fetch LinkedIn data on mount
  useEffect(() => {
    fetchLinkedinData();
  }, []);

  // ...existing code...

  // Fetch LinkedIn analytics on mount and when selectedAccount changes
  useEffect(() => {
    if (selectedAccount) {
      fetchLinkedinAnalytics();
      fetchPosts();
    }
  }, [selectedAccount]);

  // Helper: Check if LinkedIn token is expired (optional, if you store expiry)
  const isTokenExpired = (account) => {
    if (!account.tokenExpiresAt) return false;
    const expiryTime = new Date(account.tokenExpiresAt);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer
    return (expiryTime.getTime() - now.getTime()) < bufferTime;
  };

  // Notify parent about LinkedIn connection status
  useEffect(() => {
    if (onConnectionStatusChange) {
      // Connected if at least one account with a token (and not expired if you track expiry)
      const isConnected = connectedAccounts.length > 0 && connectedAccounts.some(acc => !!acc.token && !isTokenExpired(acc));
      onConnectionStatusChange(isConnected);
    }
  }, [connectedAccounts]); // Removed onConnectionStatusChange from dependencies to prevent infinite loop

  // Disconnect all accounts
  const handleDisconnectAll = async () => {
    // Remove each from backend
    for (const acc of connectedAccounts) {
      try {
        await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${acc.id || acc._id}`, {
          method: 'DELETE'
        });
      } catch (err) {}
    }
    setConnectedAccounts([]);
    setSelectedAccountId(null);
    setError('');
    setSuccess('');
    removeUserData('connected_linkedin_accounts');
    removeUserData('linkedin_connected_accounts'); // <-- Add this line
    removeUserData('selected_linkedin_account');
    fetchLinkedinData();

    if (onConnectionStatusChange) {
      onConnectionStatusChange(false);
    }
  };

  // Disconnect specific account (remove from backend too)
  const disconnectAccount = async (accountId) => {
    const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
    setConnectedAccounts(updatedAccounts);

    // Remove from backend
    try {
      // Try both id and _id for compatibility
      await fetch(`${process.env.REACT_APP_API_URL}/api/customer-social-links/${accountId}`, {
        method: 'DELETE'
      });
    } catch (err) {
      // Ignore backend errors for now
    }

    // If disconnecting the selected account, select another one
    if (selectedAccountId === accountId) {
      const newSelectedId = updatedAccounts.length > 0 ? updatedAccounts[0].id : null;
      setSelectedAccountId(newSelectedId);
      setUserData('selected_linkedin_account', newSelectedId || '');
    }
    setUserData('connected_linkedin_accounts', updatedAccounts);
    setUserData('linkedin_connected_accounts', updatedAccounts); // <-- Add this line
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

    const selectedAccount = connectedAccounts.find(acc => acc.id === selectedAccountId);
    if (!selectedAccount) {
      setPostError('No account selected');
      return;
    }

    setPosting(true);
    setPostSuccess('');
    setPostError('');

    try {
      let imageAsset = null;
      let imageUploadFailed = false;

      // Handle image upload if present
      if (postImage) {
        console.log('🖼️ Attempting to upload direct image file...');
        // Upload new image file
        const formData = new FormData();
        formData.append('image', postImage);
        formData.append('linkedin_token', selectedAccount.token);

        try {
          const imageResponse = await fetch(`${process.env.REACT_APP_API_URL}/linkedin/upload-image`, {
            method: 'POST',
            body: formData
          });

          if (!imageResponse.ok) {
            const errorData = await imageResponse.json();
            console.error('❌ Image upload failed:', errorData);
            imageUploadFailed = true;
          } else {
            const imageData = await imageResponse.json();
            imageAsset = imageData.asset;
            console.log('✅ Image uploaded successfully:', imageAsset);
          }
        } catch (uploadError) {
          console.warn('❌ Image upload failed:', uploadError);
          imageUploadFailed = true;
        }
      } else if (postImagePreview) {
        console.log('🖼️ Attempting to upload image from URL...');
        console.log('🔑 Selected account:', selectedAccount);
        console.log('🔑 Token available:', !!selectedAccount.token);
        // Handle existing image from bucket
        try {
          const imageResponse = await fetch(`${process.env.REACT_APP_API_URL}/linkedin/upload-image-from-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl: postImagePreview,
              linkedin_token: selectedAccount.token,
              accountType: selectedAccount.accountType || 'personal',
              organizationId: selectedAccount.organizationId || ''
            })
          });

          if (!imageResponse.ok) {
            const errorData = await imageResponse.json();
            console.error('❌ Image upload from URL failed:', errorData);
            imageUploadFailed = true;
          } else {
            const imageData = await imageResponse.json();
            imageAsset = imageData.asset;
            console.log('✅ Image from URL uploaded successfully:', imageAsset);
          }
        } catch (uploadError) {
          console.warn('❌ Image upload from URL failed:', uploadError);
          imageUploadFailed = true;
        }
      }

      // Create the post (regardless of image upload success/failure)
      console.log('📝 Creating LinkedIn post...');
      const payload = {
        text: postText,
        linkedin_token: selectedAccount.token,
        accountType: selectedAccount.accountType || 'personal',
        organizationId: selectedAccount.organizationId || '',
        ...(imageAsset && { imageAsset })
      };
      
      console.log('📤 Post payload:', payload);

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
        let successMessage = 'Post created successfully on LinkedIn!';
        if (imageUploadFailed && (postImage || postImagePreview)) {
          successMessage += ' (Note: Image upload failed, posted as text-only)';
        }
        setPostSuccess(successMessage);
        
        // Store post locally for tracking
        const newPost = {
          id: response.data.post?.id || `local-${Date.now()}`,
          shareUrn: response.data.post?.id || `urn:li:share:${Date.now()}`,
          text: postText,
          hasImage: !!postImagePreview,
          imageUrl: postImagePreview,
          createdAt: new Date().toISOString(),
          lifecycleState: 'PUBLISHED',
          visibility: 'PUBLIC',
          analytics: {
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            impressions: 0,
            engagement: 0
          }
        };
        
        // Add to posts list
        setPosts(prev => [newPost, ...prev]);
        
        // Store analytics
        setPostAnalytics(prev => ({
          ...prev,
          [newPost.id]: {
            likeCount: 0,
            commentCount: 0,
            shareCount: 0,
            liked: false
          }
        }));
        
        // Save to localStorage for persistence
        const storageKey = `linkedin_posts_${selectedAccount.id}`;
        const existingPosts = JSON.parse(localStorage.getItem(storageKey) || '[]');
        localStorage.setItem(storageKey, JSON.stringify([newPost, ...existingPosts].slice(0, 50))); // Keep last 50
        
        setPostText('');
        setPostImage(null);
        setPostImagePreview(null);

        // Reset file input
        const fileInput = document.getElementById('post-image-input');
        if (fileInput) fileInput.value = '';

        // Refresh LinkedIn data
        fetchLinkedinData();
      } else {
        setPostError(response.data?.error || 'Failed to create post on LinkedIn.');
      }
    } catch (err) {
      console.error('❌ Error creating post:', err);
      console.error('❌ Error response:', err.response?.data);
      console.error('❌ Error status:', err.response?.status);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to create post. Please try again.';
      
      if (err.response?.data?.error) {
        errorMessage = `Failed to create post: ${err.response.data.error}`;
        if (err.response.data.details) {
          errorMessage += ` (${JSON.stringify(err.response.data.details)})`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setPostError(errorMessage);
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
            {selectedAccount?.accountType === 'organization' && (
              <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Org</span>
            )}
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
      <div className="mb-4 sm:mb-6 px-3 sm:px-0">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h4 className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
            <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            <span className="hidden sm:inline">Connected LinkedIn Accounts</span>
            <span className="sm:hidden">Accounts</span>
            <span className="ml-1">({connectedAccounts.length})</span>
          </h4>
          <button
            onClick={handleLinkedInConnect}
            disabled={loading}
            className="bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-800 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{loading ? 'Connecting...' : 'Add Account'}</span>
            <span className="sm:hidden">{loading ? '...' : 'Add'}</span>
          </button>
        </div>
        
        {connectedAccounts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {connectedAccounts.map((account) => (
              <div
                key={account.id}
                className={`border rounded-lg p-3 sm:p-4 transition-all cursor-pointer ${
                  selectedAccountId === account.id
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                onClick={() => selectAccount(account.id)}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  {account.profile?.picture ? (
                    <img
                      src={account.profile.picture}
                      alt={account.profile.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Linkedin className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <h5 className="font-medium text-gray-900 truncate text-sm sm:text-base">{account.profile?.name}</h5>
                      {selectedAccountId === account.id && (
                        <UserCheck className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">{account.profile?.headline || account.profile?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        account.accountType === 'organization' 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {account.accountType === 'organization' ? (
                          <>
                            <Building2 className="h-3 w-3" />
                            <span>Organization</span>
                          </>
                        ) : (
                          <>
                            <User className="h-3 w-3" />
                            <span>Personal</span>
                          </>
                        )}
                      </span>
                      <p className="text-xs text-gray-500">
                        {/* Fix: Parse and format the connection date correctly */}
                        {
                          (() => {
                            let date = account.connectedAt;
                            if (date) {
                              // Try to parse ISO string or timestamp
                              const parsedDate = new Date(date);
                              if (!isNaN(parsedDate.getTime())) {
                                return parsedDate.toLocaleDateString();
                              }
                            }
                            return "Unknown";
                          })()
                        }
                      </p>
                    </div>
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
  // Function to clean LinkedIn hashtag format
  const cleanLinkedInText = (text) => {
    if (!text) return '';
    // Replace LinkedIn hashtag format {hashtag|\#|tag} with #tag
    return text.replace(/\{hashtag\|\\#\|([^}]+)\}/g, '#$1');
  };

  const renderPostCreation = () => {
    if (!selectedAccount) return null;

    return (
      <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200 shadow-sm p-4 sm:p-6 mb-4 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <div className="bg-blue-700 p-2 rounded-lg">
            <Send className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Create LinkedIn Post</h3>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Share your thoughts with your professional network</p>
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
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <label className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors text-xs sm:text-sm flex-1 sm:flex-initial justify-center">
                <Image className="h-4 w-4" />
                <span>Upload</span>
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
                className="px-3 sm:px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-xs sm:text-sm flex-1 sm:flex-initial justify-center"
                disabled={posting}
              >
                Library
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
            
            {/* Debug notice */}
            {(postImage || postImagePreview) && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Image upload is currently being debugged. If image upload fails, your post will be created as text-only. Check the browser console for detailed error logs.
                </p>
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
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center pt-4 border-t border-gray-200 gap-3 sm:gap-0">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
              <Linkedin className="h-4 w-4" />
              <span className="truncate">Posting as {selectedAccount.profile?.name}</span>
            </div>
            
            <button
              onClick={handleCreatePost}
              disabled={posting || (!postText.trim() && !postImage)}
              className="bg-blue-700 text-white px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors text-sm sm:text-base w-full sm:w-auto"
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

  // Render analytics dashboard
  const renderAnalyticsDashboard = () => {
    if (!selectedAccount) return null;

    return (
      <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200 shadow-sm p-4 sm:p-6 mb-4 sm:mb-8">
        <div className="flex items-center gap-2 sm:gap-3 mb-4">
          <div className="bg-purple-600 p-2 rounded-lg">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900">Analytics Overview</h3>
            <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Track your LinkedIn performance</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className={`bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 ${
            selectedAccount.accountType === 'organization' && typeof linkedinAnalytics.profileViews === 'number' ? '' : 'opacity-60'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <span className="text-xs text-gray-600">
                {selectedAccount.accountType === 'organization' ? 'Impressions' : 'Profile Views'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{linkedinAnalytics.profileViews}</div>
          </div>

          <div className={`bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 ${
            selectedAccount.accountType === 'organization' && typeof linkedinAnalytics.followers === 'number' ? '' : 'opacity-60'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-xs text-gray-600">
                {selectedAccount.accountType === 'organization' ? 'Followers' : 'Connections'}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {selectedAccount.accountType === 'organization' ? linkedinAnalytics.followers : linkedinAnalytics.connections}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <span className="text-xs text-gray-600">Total Posts</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{posts.length}</div>

          </div>

          <div className={`bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 ${
            selectedAccount.accountType === 'organization' && typeof linkedinAnalytics.postEngagement === 'number' ? '' : ''
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-5 w-5 text-orange-600" />
              <span className="text-xs text-gray-600">Total Engagement</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {linkedinAnalytics.postEngagement || 0}
            </div>
          </div>
        </div>
        
        {/* Additional metrics for organizations */}
        {selectedAccount.accountType === 'organization' && linkedinAnalytics.impressionCount !== undefined && (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                <span className="text-xs text-gray-600">Total Impressions</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{linkedinAnalytics.impressionCount}</div>
            </div>
            
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MousePointer className="h-5 w-5 text-pink-600" />
                <span className="text-xs text-gray-600">Total Clicks</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{linkedinAnalytics.clickCount}</div>
            </div>
            
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-teal-600" />
                <span className="text-xs text-gray-600">Engagement Rate</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{linkedinAnalytics.engagementRate || '0%'}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render posts feed
  const renderPostsFeed = () => {
    if (!selectedAccount) return null;

    return (
      <div className="bg-white sm:rounded-2xl border-y sm:border border-gray-200 shadow-sm p-4 sm:p-6 mb-4 sm:mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Posts</h3>
              <p className="text-xs sm:text-sm text-gray-600 hidden sm:block">Your latest LinkedIn posts</p>
            </div>
          </div>
          <button
            onClick={fetchPosts}
            disabled={postsLoading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm disabled:opacity-50"
          >
            <Loader2 className={`h-4 w-4 ${postsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
        
        {posts.length > 0 && (
          <div className="mb-4 space-y-2">
            {isRateLimited && rateLimitResetTime && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h5 className="font-medium text-red-800 text-sm mb-1">Daily Limit Reached</h5>
                    <p className="text-xs text-red-700 mb-2">
                      Analytics will refresh automatically after the reset time.
                    </p>
                    <p className="text-xs text-red-600 font-medium">
                      Resets at: {rateLimitResetTime.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {postsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2">Loading posts...</span>
          </div>
        ) : postsError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{postsError}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No posts yet</p>
            <p className="text-sm">Create your first post to see it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => {
              // Use analytics from post object (fetched from backend) or fall back to state
              const analytics = post.analytics || postAnalytics[post.id] || { likeCount: 0, commentCount: 0, liked: false };
              const isLoadingAnalytics = loadingAnalytics[post.id];
              
              // Debug log for analytics
              if (post.analytics && (post.analytics.likeCount > 0 || post.analytics.commentCount > 0)) {
                console.log(`📊 Rendering post with analytics:`, post.id.substring(0, 30), analytics);
              }
              
              return (
                <div 
                  key={post.id} 
                  className="group border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300 bg-white flex flex-col cursor-pointer hover:border-blue-400"
                  onClick={() => fetchSinglePostAnalytics(post)}
                >
                  {/* Post Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 mb-2">
                      {selectedAccount.profile?.picture ? (
                        <img
                          src={selectedAccount.profile.picture}
                          alt={selectedAccount.profile.name}
                          className="w-10 h-10 rounded-full flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                          <Linkedin className="h-5 w-5 text-white" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{selectedAccount.profile?.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(post.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                        post.lifecycleState === 'PUBLISHED' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {post.lifecycleState === 'PUBLISHED' ? '✓' : '•'}
                      </span>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    {post.text && (
                      <p className="text-gray-800 text-sm mb-3 line-clamp-4 flex-1">
                        {cleanLinkedInText(post.text)}
                      </p>
                    )}

                    {/* Media Display - Show actual image/video if URL is available */}
                    {post.hasMedia && post.mediaUrl && (
                      <div className="mb-3 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                        {post.mediaType === 'video' || post.isVideo ? (
                          <div className="relative">
                            <video
                              src={post.mediaUrl}
                              controls
                              className="w-full max-h-96 object-cover bg-black"
                              poster={post.altText}
                              onClick={(e) => e.stopPropagation()}
                              onError={(e) => {
                                // If video fails to load, show a message
                                e.target.style.display = 'none';
                                const parent = e.target.parentElement;
                                if (parent && !parent.querySelector('.error-message')) {
                                  const msg = document.createElement('div');
                                  msg.className = 'error-message bg-gray-100 p-6 text-center';
                                  msg.innerHTML = `
                                    <div class="flex flex-col items-center gap-2">
                                      <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                                      </svg>
                                      <p class="text-sm text-gray-600">Video preview unavailable</p>
                                      <p class="text-xs text-gray-500">Click "View on LinkedIn" below to watch</p>
                                    </div>
                                  `;
                                  parent.appendChild(msg);
                                }
                              }}
                            >
                              Your browser does not support the video tag.
                            </video>
                          </div>
                        ) : (
                          <img
                            src={post.mediaUrl}
                            alt={post.altText || 'LinkedIn post media'}
                            className="w-full max-h-96 object-cover"
                            onError={(e) => {
                              // If image fails to load (CORS or other issues), show message
                              e.target.style.display = 'none';
                              const parent = e.target.parentElement;
                              if (parent && !parent.querySelector('.error-message')) {
                                const msg = document.createElement('div');
                                msg.className = 'error-message bg-gray-100 p-6 text-center';
                                msg.innerHTML = `
                                  <div class="flex flex-col items-center gap-2">
                                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                    </svg>
                                    <p class="text-sm text-gray-600">Image preview unavailable</p>
                                    <p class="text-xs text-gray-500">Click "View on LinkedIn" below to see the full post</p>
                                  </div>
                                `;
                                parent.appendChild(msg);
                              }
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* Media Indicator - Show only if no URL available */}
                    {post.hasMedia && !post.mediaUrl && (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          {post.isVideo ? (
                            <>
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-xs">Video Post</p>
                                <p className="text-xs text-gray-600">Click to view on LinkedIn</p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Image className="h-5 w-5 text-blue-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-xs">Image Post</p>
                                <p className="text-xs text-gray-600">Click to view on LinkedIn</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Click to view analytics hint */}
                    <div className="mt-auto pt-2">
                      <div className="flex items-center justify-center gap-2 text-xs text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrendingUp className="h-3 w-3" />
                        <span>Click to view detailed analytics</span>
                      </div>
                    </div>
                  </div>

                  {/* Post Footer - Engagement Stats */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100">
                    {isLoadingAnalytics ? (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-xs">Loading stats...</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Heart className={`h-4 w-4 ${analytics.liked ? 'fill-red-500 text-red-500' : ''}`} />
                              <span className="text-xs font-medium">
                                {analytics.likeCount || 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <MessageSquare className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                {analytics.commentCount || 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Share2 className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                {analytics.shareCount || 0}
                              </span>
                            </div>
                          </div>
                          {post.linkedinUrl && (
                            <a
                              href={post.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium group-hover:scale-105 transform"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>View</span>
                            </a>
                          )}
                        </div>
                        {(analytics.impressionCount > 0 || analytics.clickCount > 0) && (
                          <div className="flex items-center gap-3 pt-1 border-t border-gray-200">
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <Eye className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                {analytics.impressionCount?.toLocaleString() || 0} views
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-600">
                              <MousePointer className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                {analytics.clickCount || 0} clicks
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Render single post analytics (detailed view)
  const renderSinglePostAnalytics = () => {
    if (!singlePostAnalytics || !selectedPostId) return null;

    const { post, metrics } = singlePostAnalytics;
    const comments = postComments[selectedPostId] || [];

    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 flex items-start justify-center py-8 px-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 z-10 rounded-t-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {selectedAccount?.profile?.picture ? (
                  <img
                    src={selectedAccount.profile.picture}
                    alt={selectedAccount.profile.name}
                    className="w-12 h-12 rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center flex-shrink-0">
                    <Linkedin className="h-6 w-6 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-lg truncate">Post Analytics</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(post.createdAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedPostId(null);
                  setSinglePostAnalytics(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {loadingSinglePost ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Post Content */}
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-4 sm:p-6 border border-gray-200">
                {post.text && (
                  <p className="text-gray-800 text-sm sm:text-base mb-4 whitespace-pre-wrap">
                    {cleanLinkedInText(post.text)}
                  </p>
                )}
                
                {/* Media Display */}
                {post.hasMedia && post.mediaUrl && (
                  <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
                    {post.mediaType === 'video' || post.isVideo ? (
                      <video
                        src={post.mediaUrl}
                        controls
                        className="w-full max-h-96 object-contain bg-black"
                      >
                        Your browser does not support the video tag.
                      </video>
                    ) : (
                      <img
                        src={post.mediaUrl}
                        alt={post.altText || 'LinkedIn post media'}
                        className="w-full max-h-96 object-contain"
                      />
                    )}
                  </div>
                )}

                {post.linkedinUrl && (
                  <div className="mt-4">
                    <a
                      href={post.linkedinUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>View on LinkedIn</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Engagement Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {/* Likes */}
                <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Heart className="h-4 w-4 text-red-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Likes</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.likes.toLocaleString()}</p>
                </div>

                {/* Comments */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Comments</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.comments.toLocaleString()}</p>
                </div>

                {/* Shares */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Share2 className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Shares</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.shares.toLocaleString()}</p>
                </div>

                {/* Impressions */}
                <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Eye className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Impressions</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.impressions.toLocaleString()}</p>
                </div>

                {/* Unique Impressions */}
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Users className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Unique Views</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.uniqueImpressions.toLocaleString()}</p>
                </div>

                {/* Clicks */}
                <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-4 border border-cyan-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-cyan-100 rounded-lg">
                      <MousePointer className="h-4 w-4 text-cyan-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-600">Clicks</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{metrics.clicks.toLocaleString()}</p>
                </div>
              </div>

              {/* Total Engagement Summary */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-lg">Total Engagement</h4>
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-3xl font-bold mb-1">{metrics.engagement.toLocaleString()}</p>
                    <p className="text-sm text-blue-100">Total Interactions</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold mb-1">{metrics.engagementRate}%</p>
                    <p className="text-sm text-blue-100">Engagement Rate</p>
                  </div>
                </div>
              </div>
              
              {/* Comments Section */}
              {metrics.comments > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-blue-600" />
                      Comments ({comments.length})
                    </h4>
                    {loadingComments && (
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                  </div>
                  
                  {loadingComments ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No comments to display</p>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {comments.map((comment) => (
                        <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-start gap-3">
                            {comment.actor?.profilePicture ? (
                              <img
                                src={comment.actor.profilePicture}
                                alt={comment.actor.name}
                                className="w-8 h-8 rounded-full flex-shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Linkedin className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm text-gray-900">
                                  {comment.actor?.name || 'LinkedIn User'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {comment.created ? new Date(comment.created).toLocaleDateString() : ''}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.message}</p>
                              
                              <div className="flex items-center gap-3 mt-2">
                                <button
                                  onClick={() => setReplyingToComment(comment.id)}
                                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  Reply
                                </button>
                                {comment.canDelete && (
                                  <button
                                    onClick={() => deleteComment(comment.id, selectedPostId)}
                                    className="text-xs text-red-600 hover:text-red-700 font-medium"
                                  >
                                    Delete
                                  </button>
                                )}
                              </div>
                              
                              {replyingToComment === comment.id && (
                                <div className="mt-3 flex gap-2">
                                  <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Write a reply..."
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter' && !sendingReply) {
                                        postReplyToComment(comment.id, replyText, selectedPostId);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => postReplyToComment(comment.id, replyText, selectedPostId)}
                                    disabled={sendingReply || !replyText.trim()}
                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                                  >
                                    {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyingToComment(null);
                                      setReplyText('');
                                    }}
                                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="px-3 sm:px-4">
          <div className="flex items-center gap-2 sm:gap-3 h-14 sm:h-16">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <Linkedin className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold text-gray-900">LinkedIn Integration</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Manage your professional network</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="sm:p-4">
        <div className="bg-white sm:rounded-lg sm:shadow-md sm:p-6">

          {connectedAccounts.length === 0 ? (
            <>
              {/* Integration content */}
              <div className="text-center py-6 sm:py-8 px-4 sm:px-0">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl mb-4">
                  <Linkedin className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                </div>
                <h4 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Connect LinkedIn Accounts</h4>
                <p className="text-sm sm:text-base text-gray-600 mb-4 max-w-md mx-auto">
                  Connect multiple LinkedIn profiles to manage all your professional accounts from one dashboard.
                </p>
                <p className="text-xs sm:text-sm text-gray-500 mb-6">
                  Works with any LinkedIn account - no business account required!
                </p>
                <button 
                  onClick={handleLinkedInConnect}
                  disabled={loading}
                  className="bg-blue-700 text-white px-6 sm:px-8 py-3 rounded-xl hover:bg-blue-800 transition-colors disabled:opacity-50 flex items-center gap-2 sm:space-x-3 mx-auto font-medium text-sm sm:text-base w-full sm:w-auto justify-center"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Linkedin className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span>Connect LinkedIn Account</span>
                    </>
                  )}
                </button>
              </div>

              {/* Simplified Integration Guide */}
              <div className="bg-blue-50 sm:border border-blue-200 rounded-lg p-4 sm:p-6 mx-4 sm:mx-0">
                <h4 className="font-medium text-blue-800 mb-3">How It Works</h4>
                <div className="space-y-2 text-sm text-blue-700">
                  <p>1. Click "Connect LinkedIn Account" above</p>
                  <p>2. Sign in with your LinkedIn credentials</p>
                  <p>3. Grant permission to access your basic profile</p>
                  <p>4. Start creating posts and managing your LinkedIn presence</p>
                </div>
                
                <div className="mt-4 bg-white rounded-lg p-3 sm:border border-blue-200">
                  <p className="text-xs text-blue-600 mb-2">
                    <strong>Personal Accounts:</strong> Works immediately with any LinkedIn account.
                  </p>
                  <p className="text-xs text-blue-600">
                    <strong>Organization Pages:</strong> To manage LinkedIn organization pages, your app needs LinkedIn's Community Management API approval (currently in review). Once approved, reconnect to access organization pages.
                  </p>
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              {renderAccountManagement()}
              
              {selectedAccount && (
                <>
                  {/* Post creation removed */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-indigo-50 sm:rounded-lg sm:border border-blue-200 gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      {selectedAccount.profile?.picture ? (
                        <img 
                          src={selectedAccount.profile.picture} 
                          alt="Profile"
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-blue-200"
                        />
                      ) : (
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <Linkedin className="h-5 w-5 sm:h-6 sm:w-6 text-blue-700" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{selectedAccount.profile?.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{selectedAccount.profile?.headline || selectedAccount.profile?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => refreshAccountData(selectedAccount.id)}
                        disabled={loading}
                        className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 text-xs sm:text-sm flex-1 sm:flex-initial"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Refresh</span>
                      </button>
                      <button
                        onClick={handleDisconnectAll}
                        className="flex items-center justify-center gap-1 sm:gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm flex-1 sm:flex-initial"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span className="hidden sm:inline">Disconnect All</span>
                        <span className="sm:hidden">Disconnect</span>
                      </button>
                    </div>
                  </div>

                  {selectedAccount.accountType === 'organization' && renderAnalyticsDashboard()}
                  {renderPostCreation()}
                  {selectedAccount.accountType === 'organization' && renderPostsFeed()}
                </>
              )}
            </div>
          )}

          {error && (
            <div className="mt-4 p-3 bg-red-50 sm:border border-red-200 rounded mx-3 sm:mx-0">
              <p className="text-red-600 text-sm">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-50 sm:border border-green-200 rounded mx-3 sm:mx-0">
              <p className="text-green-600 text-sm">
                <strong>Success:</strong> {success}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Single Post Analytics Modal */}
      {renderSinglePostAnalytics()}
    </div>
  );
}

export default LinkedInIntegration;