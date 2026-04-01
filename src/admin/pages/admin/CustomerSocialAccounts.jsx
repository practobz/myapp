import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import FacebookPostInsights from '../../../customer/Integration/FacebookPostInsights';
import InstagramPostInsights from '../../../customer/Integration/InstagramPostInsights';
import {
  Users, Search, RefreshCw, ChevronDown, ChevronUp, ExternalLink,
  Facebook, Instagram, Linkedin, Youtube, Globe, CheckCircle,
  AlertCircle, Building2, User, Calendar, Eye, X, ArrowLeft,
  Filter, SlidersHorizontal, Heart, MessageSquare, Share2, Loader2,
  BarChart3, Image as ImageIcon, Play
} from 'lucide-react';

// Platform config for colors and icons
const PLATFORM_CONFIG = {
  facebook: {
    icon: Facebook,
    label: 'Facebook',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    gradient: 'from-blue-500 to-blue-700',
    badge: 'bg-blue-100 text-blue-700',
  },
  instagram: {
    icon: Instagram,
    label: 'Instagram',
    color: 'text-pink-600',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    gradient: 'from-pink-500 to-purple-600',
    badge: 'bg-pink-100 text-pink-700',
  },
  linkedin: {
    icon: Linkedin,
    label: 'LinkedIn',
    color: 'text-blue-700',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    gradient: 'from-blue-600 to-blue-800',
    badge: 'bg-sky-100 text-sky-700',
  },
  youtube: {
    icon: Youtube,
    label: 'YouTube',
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    gradient: 'from-red-500 to-red-700',
    badge: 'bg-red-100 text-red-700',
  },
};

const getPlatformConfig = (platform) =>
  PLATFORM_CONFIG[platform] || {
    icon: Globe,
    label: platform || 'Unknown',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    gradient: 'from-gray-500 to-gray-700',
    badge: 'bg-gray-100 text-gray-700',
  };

const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// Account detail modal
function AccountDetailModal({ account, customer, onClose }) {
  if (!account) return null;

  const config = getPlatformConfig(account.platform);
  const PlatformIcon = config.icon;

  // Posts state
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [postsError, setPostsError] = useState('');

  // Post insights modal state
  const [fbInsightsOpen, setFbInsightsOpen] = useState(false);
  const [fbInsightsPost, setFbInsightsPost] = useState(null);
  const [igInsightsOpen, setIgInsightsOpen] = useState(false);
  const [igInsightsPost, setIgInsightsPost] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // Fetch posts based on platform
  useEffect(() => {
    if (account) fetchPosts();
  }, [account]);

  const fetchPosts = async () => {
    setLoadingPosts(true);
    setPostsError('');
    setPosts([]);

    try {
      if (account.platform === 'facebook') {
        await fetchFacebookPosts();
      } else if (account.platform === 'instagram') {
        await fetchInstagramPosts();
      } else if (account.platform === 'linkedin') {
        await fetchLinkedInPosts();
      } else {
        setPostsError('Post viewing is not available for this platform');
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
      setPostsError(err.message || 'Failed to fetch posts');
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchFacebookPosts = async () => {
    const pages = account.pages || [];
    if (pages.length === 0) {
      setPostsError('No connected Facebook pages found');
      return;
    }

    const allPosts = [];
    const errors = [];

    for (const page of pages) {
      const token = page.accessToken || page.access_token;
      if (!token) {
        errors.push(`Page "${page.name}": no access token stored`);
        continue;
      }
      try {
        // Try /feed first (more permissive), fall back to /posts
        const endpoints = [
          `https://graph.facebook.com/v18.0/${page.id}/feed?fields=id,message,story,created_time,permalink_url,full_picture,attachments{media_type,type},likes.summary(true),comments.summary(true),shares&limit=25&access_token=${token}`,
          `https://graph.facebook.com/v18.0/${page.id}/posts?fields=id,message,created_time,permalink_url,full_picture,type,likes.summary(true),comments.summary(true),shares,reactions.summary(true)&limit=25&access_token=${token}`,
        ];

        let fetched = false;
        for (const url of endpoints) {
          const res = await fetch(url);
          const data = await res.json();
          if (data.error) {
            console.warn(`Graph API error for page "${page.name}":`, data.error);
            errors.push(`${page.name}: ${data.error.message}`);
            continue; // try next endpoint
          }
          if (data.data) {
            // Filter out posts that are just shares (no message/picture from this page)
            const pagePosts = data.data.filter(
              (p) => p.full_picture || p.message || p.story
            );
            allPosts.push(
              ...pagePosts.map((p) => ({
                ...p,
                type: p.attachments?.data?.[0]?.media_type === 'video' ? 'video' : (p.type || 'photo'),
                _pageId: page.id,
                _pageName: page.name,
                _pageAccessToken: token,
                _pageProfilePic: null,
              }))
            );
            fetched = true;
            break;
          }
        }
        if (!fetched && errors.filter((e) => e.startsWith(page.name)).length === 0) {
          errors.push(`${page.name}: no posts returned`);
        }
      } catch (e) {
        console.error(`Error fetching posts for page ${page.id}:`, e);
        errors.push(`${page.name}: ${e.message}`);
      }
    }

    allPosts.sort((a, b) => new Date(b.created_time) - new Date(a.created_time));
    setPosts(allPosts);

    if (allPosts.length === 0 && errors.length > 0) {
      setPostsError(errors.join(' | '));
    }
  };

  const fetchInstagramPosts = async () => {
    // Instagram: fetch media from the IG business account
    const pages = account.pages || [];
    const igAccountId = account.platformUserId;
    let token = null;

    // Find correct access token - page token for IG business accounts
    for (const page of pages) {
      if (page.instagramBusinessAccount || page.instagram_business_account) {
        token = page.accessToken || page.access_token;
        break;
      }
    }
    if (!token) token = account.accessToken;
    if (!token || !igAccountId) {
      setPostsError('No access token or Instagram account ID available');
      return;
    }

    const url = `https://graph.facebook.com/v18.0/${igAccountId}/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,is_comment_enabled&limit=25&access_token=${token}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) {
      setPostsError(data.error.message || 'Instagram API error');
      return;
    }
    setPosts(data.data || []);
  };

  const fetchLinkedInPosts = async () => {
    const token = account.accessToken;
    if (!token) {
      setPostsError('No LinkedIn access token available');
      return;
    }
    try {
      // Detect organization accounts:
      // 1. platformUserId starts with urn:li:organization: (org account stored directly)
      // 2. organizations[] is non-empty (personal account with linked orgs)
      const isOrgByUrn = account.platformUserId?.includes('urn:li:organization:');
      const isOrgByList = (account.organizations?.length || 0) > 0;
      const isOrg = isOrgByUrn || isOrgByList;

      const organizationId = isOrgByUrn
        ? account.platformUserId
        : (account.organizations?.[0]?.id || '');

      const params = new URLSearchParams({
        token,
        accountType: isOrg ? 'organization' : 'personal',
        organizationId: organizationId,
      });
      const res = await fetch(`${apiUrl}/linkedin/posts?${params}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
        if ((data.posts || []).length === 0) {
          setPostsError('No posts found for this LinkedIn account');
        }
      } else {
        setPostsError(data.error || data.message || 'Failed to fetch LinkedIn posts');
      }
    } catch (e) {
      setPostsError('Failed to connect to server');
    }
  };

  // Get the correct page token for FB insights
  const getFbPageForPost = (post) => {
    const page = (account.pages || []).find((p) => p.id === post._pageId);
    return page || account.pages?.[0];
  };

  // Handle clicking a post to open insights
  const handlePostClick = (post) => {
    if (account.platform === 'facebook') {
      setFbInsightsPost(post);
      setFbInsightsOpen(true);
    } else if (account.platform === 'instagram') {
      setIgInsightsPost(post);
      setIgInsightsOpen(true);
    }
    // LinkedIn: no dedicated insights modal, detail shown inline
  };

  // Get IG access token for insights
  const getIgAccessToken = () => {
    const pages = account.pages || [];
    for (const page of pages) {
      if (page.instagramBusinessAccount || page.instagram_business_account) {
        return page.accessToken || page.access_token;
      }
    }
    return account.accessToken;
  };

  // Render a single post card
  const renderPostCard = (post, index) => {
    if (account.platform === 'facebook') {
      return (
        <div
          key={post.id || index}
          className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg"
          onClick={() => handlePostClick(post)}
        >
          {post.full_picture ? (
            <img src={post.full_picture} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex flex-col items-center justify-center p-3">
              <Facebook className="h-6 w-6 text-blue-400 mb-2" />
              {post.message && (
                <p className="text-[10px] text-blue-700 line-clamp-4 text-center leading-tight">
                  {post.message}
                </p>
              )}
            </div>
          )}
          {post.type === 'video' && (
            <div className="absolute top-1.5 right-1.5">
              <Play className="w-4 h-4 text-white drop-shadow-lg" fill="white" />
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm font-semibold">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" fill="white" />
              {post.likes?.summary?.total_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" fill="white" />
              {post.comments?.summary?.total_count || 0}
            </span>
          </div>
        </div>
      );
    }

    if (account.platform === 'instagram') {
      return (
        <div
          key={post.id || index}
          className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg"
          onClick={() => handlePostClick(post)}
        >
          <img
            src={post.thumbnail_url || post.media_url}
            alt=""
            className="w-full h-full object-cover"
          />
          {post.media_type === 'VIDEO' && (
            <div className="absolute top-1.5 right-1.5">
              <Play className="w-4 h-4 text-white drop-shadow-lg" fill="white" />
            </div>
          )}
          {post.media_type === 'CAROUSEL_ALBUM' && (
            <div className="absolute top-1.5 right-1.5">
              <svg className="w-4 h-4 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white text-sm font-semibold">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" fill="white" />
              {post.like_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" fill="white" />
              {post.comments_count || 0}
            </span>
          </div>
        </div>
      );
    }

    if (account.platform === 'linkedin') {
      return (
        <div
          key={post.id || index}
          className="aspect-square relative group cursor-pointer overflow-hidden rounded-lg"
        >
          {post.hasMedia && post.mediaUrl ? (
            post.mediaType === 'video' ? (
              <div className="relative w-full h-full bg-gray-900">
                <Play className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-white drop-shadow-lg z-10" fill="white" />
                <video src={post.mediaUrl} className="w-full h-full object-cover" />
              </div>
            ) : (
              <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
            )
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 p-3 flex flex-col justify-center">
              <Linkedin className="h-5 w-5 text-white mb-2" />
              {post.text && (
                <p className="text-white text-[10px] line-clamp-5 leading-tight">{post.text}</p>
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 text-white text-xs font-semibold">
            {post.likeCount != null && (
              <span className="flex items-center gap-1">
                <Heart className="h-3 w-3" fill="white" /> {post.likeCount}
              </span>
            )}
            {post.commentCount != null && (
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" fill="white" /> {post.commentCount}
              </span>
            )}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`bg-gradient-to-r ${config.gradient} p-5 sm:p-6 rounded-t-2xl sticky top-0 z-10`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {account.profilePicture ? (
                  <img src={account.profilePicture} alt="" className="w-12 h-12 rounded-full border-2 border-white/30" />
                ) : (
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <PlatformIcon className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-white">{account.name || 'Unnamed Account'}</h3>
                  <p className="text-white/70 text-sm">
                    {customer?.customerName} &middot; {config.label}
                  </p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>

          {/* Account info summary */}
          <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
            <div className="flex flex-wrap gap-4 text-sm">
              {account.email && (
                <span className="text-gray-500">
                  <span className="font-medium text-gray-700">Email:</span> {account.email}
                </span>
              )}
              <span className="text-gray-500">
                <span className="font-medium text-gray-700">Connected:</span> {formatDate(account.connectedAt || account.createdAt)}
              </span>
              {account.platformUserId && (
                <span className="text-gray-500">
                  <span className="font-medium text-gray-700">ID:</span>{' '}
                  <span className="font-mono text-xs">{account.platformUserId}</span>
                </span>
              )}
              {account.tokenExpiresAt && (
                <span className={new Date(account.tokenExpiresAt) < new Date() ? 'text-red-600' : 'text-gray-500'}>
                  <span className="font-medium text-gray-700">Token:</span>{' '}
                  {new Date(account.tokenExpiresAt) < new Date() ? 'Expired' : `Expires ${formatDate(account.tokenExpiresAt)}`}
                </span>
              )}
            </div>

            {/* Sub-items: Pages / Channels / Orgs */}
            {((account.pages?.length || 0) + (account.channels?.length || 0) + (account.organizations?.length || 0)) > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {account.pages?.map((page, idx) => (
                  <span key={page.id || idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                    <Building2 className="h-3 w-3" /> {page.name}
                    {page.fanCount != null && <span className="text-blue-500 ml-1">{Number(page.fanCount).toLocaleString()}</span>}
                  </span>
                ))}
                {account.channels?.map((ch, idx) => (
                  <span key={ch.id || idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
                    <Youtube className="h-3 w-3" /> {ch.title || ch.name}
                  </span>
                ))}
                {account.organizations?.map((org, idx) => (
                  <span key={org.id || idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full text-xs font-medium">
                    <Building2 className="h-3 w-3" /> {org.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Posts section */}
          <div className="px-5 sm:px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-gray-500" />
                Posts
                {posts.length > 0 && <span className="text-xs text-gray-400 font-normal">({posts.length})</span>}
              </h4>
              <button
                onClick={fetchPosts}
                disabled={loadingPosts}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${loadingPosts ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {loadingPosts ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-3" />
                <p className="text-sm text-gray-500">Loading posts from {config.label}...</p>
              </div>
            ) : postsError ? (
              <div className="text-center py-8">
                <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-2">{postsError}</p>
                <button
                  onClick={fetchPosts}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8">
                <ImageIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No posts found for this account</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1 sm:gap-1.5">
                {posts.map((post, idx) => renderPostCard(post, idx))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Facebook Post Insights Modal */}
      {fbInsightsOpen && fbInsightsPost && (() => {
        const page = getFbPageForPost(fbInsightsPost);
        return (
          <FacebookPostInsights
            isOpen={fbInsightsOpen}
            onClose={() => { setFbInsightsOpen(false); setFbInsightsPost(null); }}
            post={fbInsightsPost}
            pageAccessToken={page?.accessToken || page?.access_token}
            pageName={page?.name || account.name}
            pageProfilePic={page?.picture?.data?.url || account.profilePicture}
          />
        );
      })()}

      {/* Instagram Post Insights Modal */}
      {igInsightsOpen && igInsightsPost && (
        <InstagramPostInsights
          isOpen={igInsightsOpen}
          onClose={() => { setIgInsightsOpen(false); setIgInsightsPost(null); }}
          post={igInsightsPost}
          accessToken={getIgAccessToken()}
          accountProfile={{
            id: account.platformUserId,
            username: account.name,
            profile_picture_url: account.profilePicture,
          }}
        />
      )}
    </>
  );
}

// Platform badge
function PlatformBadge({ platform, count }) {
  const config = getPlatformConfig(platform);
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.badge}`}>
      <Icon className="h-3 w-3" />
      {config.label}
      {count > 1 && <span className="ml-0.5">×{count}</span>}
    </span>
  );
}

// Account card for grid view
function AccountCard({ account, customer, onClick }) {
  const config = getPlatformConfig(account.platform);
  const Icon = config.icon;

  const subItemCount =
    (account.pages?.length || 0) +
    (account.channels?.length || 0) +
    (account.organizations?.length || 0);

  return (
    <div
      onClick={onClick}
      className={`border ${config.border} rounded-xl p-4 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${config.bg}`}
    >
      <div className="flex items-start gap-3">
        {account.profilePicture ? (
          <img
            src={account.profilePicture}
            alt=""
            className="w-10 h-10 rounded-full border-2 border-white shadow-sm flex-shrink-0"
          />
        ) : (
          <div className={`w-10 h-10 bg-gradient-to-br ${config.gradient} rounded-full flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{account.name || 'Unnamed'}</p>
          <p className={`text-xs ${config.color} font-medium`}>{config.label}</p>
          {account.email && <p className="text-xs text-gray-500 truncate mt-0.5">{account.email}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {formatDate(account.connectedAt || account.createdAt)}
        </span>
        {subItemCount > 0 && (
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {subItemCount} {subItemCount === 1 ? 'page' : 'pages'}
          </span>
        )}
      </div>

      <div className="mt-2 flex justify-end">
        <span className="text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600">
          <Eye className="h-3 w-3" /> View Details
        </span>
      </div>
    </div>
  );
}

// Customer row with expandable accounts
function CustomerRow({ customer, isExpanded, onToggle, onSelectAccount, searchQuery }) {
  const platforms = {};
  customer.socialAccounts.forEach((acc) => {
    platforms[acc.platform] = (platforms[acc.platform] || 0) + 1;
  });

  // Filter accounts by search
  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return customer.socialAccounts;
    const q = searchQuery.toLowerCase();
    return customer.socialAccounts.filter(
      (acc) =>
        (acc.name || '').toLowerCase().includes(q) ||
        (acc.platform || '').toLowerCase().includes(q) ||
        (acc.email || '').toLowerCase().includes(q)
    );
  }, [customer.socialAccounts, searchQuery]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Customer header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{customer.customerName}</h3>
            <p className="text-xs text-gray-500 truncate">
              {customer.customerEmail || <span className="italic text-gray-400">No email</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end">
            {Object.entries(platforms).map(([platform, count]) => (
              <PlatformBadge key={platform} platform={platform} count={count} />
            ))}
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full whitespace-nowrap">
            {customer.socialAccounts.length} account{customer.socialAccounts.length !== 1 ? 's' : ''}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded accounts */}
      {isExpanded && (
        <div className="border-t border-gray-100 p-4 sm:p-5 bg-gray-50/50">
          {filteredAccounts.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-4">No matching accounts found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredAccounts.map((account) => (
                <AccountCard
                  key={account._id}
                  account={account}
                  customer={customer}
                  onClick={() => onSelectAccount(account, customer)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CustomerSocialAccounts() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const abortControllerRef = useRef(null);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());
  const [expandAll, setExpandAll] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  const fetchData = useCallback(
    async (isRefresh = false) => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      if (isRefresh) setIsRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        // Fetch all social accounts and assigned customers in parallel
        const [socialRes, assignedRes] = await Promise.all([
          fetch(`${apiUrl}/api/admin/customer-social-links`, { signal }),
          currentUser?.role === 'admin'
            ? fetch(`${apiUrl}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`, { signal })
            : Promise.resolve(null),
        ]);

        if (!socialRes.ok) throw new Error(`HTTP ${socialRes.status}`);

        const data = await socialRes.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch data');

        let allCustomers = data.data || [];

        // If admin, filter to only show their assigned customers
        if (currentUser?.role === 'admin' && assignedRes) {
          if (assignedRes.ok) {
            const assignedList = await assignedRes.json();
            const assignedIds = new Set(
              (Array.isArray(assignedList) ? assignedList : []).map((c) => c._id)
            );
            allCustomers = allCustomers.filter((c) => assignedIds.has(c.customerId));
          } else {
            allCustomers = [];
          }
        }

        setCustomers(allCustomers);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to load social accounts');
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [apiUrl, currentUser]
  );

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [fetchData]);

  // Filter customers by search + platform
  const filteredCustomers = useMemo(() => {
    let result = customers;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          (c.customerName || '').toLowerCase().includes(q) ||
          (c.customerEmail || '').toLowerCase().includes(q) ||
          c.socialAccounts.some(
            (acc) =>
              (acc.name || '').toLowerCase().includes(q) ||
              (acc.platform || '').toLowerCase().includes(q) ||
              (acc.email || '').toLowerCase().includes(q)
          )
      );
    }

    if (platformFilter !== 'all') {
      result = result
        .map((c) => ({
          ...c,
          socialAccounts: c.socialAccounts.filter((acc) => acc.platform === platformFilter),
        }))
        .filter((c) => c.socialAccounts.length > 0);
    }

    return result;
  }, [customers, searchQuery, platformFilter]);

  // Stats
  const stats = useMemo(() => {
    const totalAccounts = customers.reduce((sum, c) => sum + c.socialAccounts.length, 0);
    const platformCounts = {};
    customers.forEach((c) =>
      c.socialAccounts.forEach((acc) => {
        platformCounts[acc.platform] = (platformCounts[acc.platform] || 0) + 1;
      })
    );
    return { totalCustomers: customers.length, totalAccounts, platformCounts };
  }, [customers]);

  const toggleExpand = (customerId) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedCustomers(new Set());
    } else {
      setExpandedCustomers(new Set(filteredCustomers.map((c) => c.customerId)));
    }
    setExpandAll(!expandAll);
  };

  const handleSelectAccount = (account, customer) => {
    setSelectedAccount(account);
    setSelectedCustomer(customer);
  };

  // Loading state
  if (loading) {
    return (
      <AdminLayout title="Social Accounts">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-48 mb-4" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-40" />
                  <div className="h-3 bg-gray-200 rounded w-56" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminLayout>
    );
  }

  // Error state
  if (error && customers.length === 0) {
    return (
      <AdminLayout title="Social Accounts">
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
          </div>
          <p className="text-lg font-medium text-gray-700">Failed to load social accounts</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Social Accounts">
      <div className="space-y-4 sm:space-y-6">
        {/* Stats banner */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>
          <div className="relative z-10">
            <h2 className="text-lg sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Globe className="h-5 w-5 sm:h-6 sm:w-6" />
              Customer Social Accounts Overview
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
              <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-300" />
                  <span className="text-blue-100 text-xs">Customers</span>
                </div>
                <p className="text-white text-xl font-bold mt-1">{stats.totalCustomers}</p>
              </div>
              <div className="bg-white/10 rounded-xl p-3 border border-white/20">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-green-300" />
                  <span className="text-blue-100 text-xs">Total Accounts</span>
                </div>
                <p className="text-white text-xl font-bold mt-1">{stats.totalAccounts}</p>
              </div>
              {Object.entries(stats.platformCounts).map(([platform, count]) => {
                const config = getPlatformConfig(platform);
                const Icon = config.icon;
                return (
                  <div key={platform} className="bg-white/10 rounded-xl p-3 border border-white/20">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-white/80" />
                      <span className="text-blue-100 text-xs">{config.label}</span>
                    </div>
                    <p className="text-white text-xl font-bold mt-1">{count}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search + filters */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search customers or accounts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Platform filter */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-gray-400 hidden sm:block" />
              <select
                value={platformFilter}
                onChange={(e) => setPlatformFilter(e.target.value)}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Platforms</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
                <option value="youtube">YouTube</option>
              </select>

              {/* Expand / Collapse */}
              <button
                onClick={handleExpandAll}
                className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                {expandAll ? 'Collapse All' : 'Expand All'}
              </button>

              {/* Refresh */}
              <button
                onClick={() => fetchData(true)}
                disabled={isRefreshing}
                className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Active filters indicator */}
          {(searchQuery || platformFilter !== 'all') && (
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <Filter className="h-3 w-3" />
              <span>
                Showing {filteredCustomers.length} of {customers.length} customers
              </span>
              {(searchQuery || platformFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPlatformFilter('all');
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Customer list */}
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              {customers.length === 0 ? 'No Social Accounts Found' : 'No Matching Results'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              {customers.length === 0
                ? 'No customers have connected their social media accounts yet. Customers can connect accounts through their portal.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <CustomerRow
                key={customer.customerId}
                customer={customer}
                isExpanded={expandedCustomers.has(customer.customerId)}
                onToggle={() => toggleExpand(customer.customerId)}
                onSelectAccount={handleSelectAccount}
                searchQuery={platformFilter !== 'all' ? '' : searchQuery}
              />
            ))}
          </div>
        )}
      </div>

      {/* Account detail modal */}
      {selectedAccount && (
        <AccountDetailModal
          account={selectedAccount}
          customer={selectedCustomer}
          onClose={() => {
            setSelectedAccount(null);
            setSelectedCustomer(null);
          }}
        />
      )}
    </AdminLayout>
  );
}

export default CustomerSocialAccounts;
