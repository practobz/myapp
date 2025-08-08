import React, { useState, useEffect, useCallback } from 'react';
import { Twitter, TrendingUp, ExternalLink, CheckCircle, Loader2, BarChart3, Users, Plus, UserCheck, Trash2 } from 'lucide-react';
import TrendChart from '../../components/TrendChart';
import { getUserData, setUserData, removeUserData, migrateToUserSpecificStorage } from '../../utils/sessionUtils';

const API_URL = process.env.REACT_APP_API_URL;

function TwitterIntegration() {
  // Multi-account state
  const [connectedAccounts, setConnectedAccounts] = useState([]);
  const [activeAccountId, setActiveAccountId] = useState(null);
  const [activeAccount, setActiveAccount] = useState(null);

  // Current active account data
  const [user, setUser] = useState(null);
  const [tweets, setTweets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tweetText, setTweetText] = useState('');
  const [posting, setPosting] = useState(false);
  const [postResult, setPostResult] = useState('');

  // Load connected accounts from localStorage on mount
  useEffect(() => {
    // First, migrate any existing data to user-specific storage
    migrateToUserSpecificStorage([
      'tw_connected_accounts',
      'tw_active_account_id'
    ]);

    const savedAccounts = getUserData('tw_connected_accounts');
    const savedActiveId = getUserData('tw_active_account_id');
    
    if (savedAccounts) {
      setConnectedAccounts(savedAccounts);
      if (savedActiveId && savedAccounts.some(acc => acc.id === savedActiveId)) {
        setActiveAccountId(savedActiveId);
        setActiveAccount(savedAccounts.find(acc => acc.id === savedActiveId));
      } else if (savedAccounts.length > 0) {
        setActiveAccountId(savedAccounts[0].id);
        setActiveAccount(savedAccounts[0]);
        setUserData('tw_active_account_id', savedAccounts[0].id);
      }
    }
  }, []);

  // Save accounts to localStorage
  const saveAccountsToStorage = (accounts) => {
    setUserData('tw_connected_accounts', accounts);
  };

  // Poll for session token/profile after popup
  useEffect(() => {
    if (!activeAccount || !activeAccount.sessionId) return;
    let interval;
    let stopped = false;
    let pollCount = 0;
    let tokenFetched = false;
    const maxPolls = 80;

    interval = setInterval(async () => {
      pollCount++;
      try {
        const res = await fetch(`${API_URL}/api/twitter/session?session_id=${activeAccount.sessionId}`);
        if (!res.ok) {
          if (pollCount >= maxPolls) {
            clearInterval(interval);
            setError('Twitter login timed out. Please try again.');
            stopped = true;
          }
          return;
        }
        const data = await res.json();
        if (data.token && !tokenFetched) {
          tokenFetched = true;
          clearInterval(interval);
          // Update account with token/profile
          const updatedAccount = {
            ...activeAccount,
            token: data.token,
            profile: data.profile,
            connectedAt: new Date().toISOString()
          };
          const updatedAccounts = connectedAccounts.map(acc =>
            acc.id === activeAccount.id ? updatedAccount : acc
          );
          setConnectedAccounts(updatedAccounts);
          saveAccountsToStorage(updatedAccounts);
          setActiveAccount(updatedAccount);
          setUser(data.profile);
          setError('');
          setLoading(false);
          fetchTweets(data.token);
          fetchAnalytics(data.token);
          stopped = true;
        } else if (pollCount >= maxPolls) {
          clearInterval(interval);
          setError('Twitter login timed out. Please try again.');
          stopped = true;
        }
      } catch (e) {
        if (pollCount >= maxPolls) {
          clearInterval(interval);
          setError('Twitter login failed. Please check your connection and try again.');
          stopped = true;
        }
      }
    }, 1500);
    return () => {
      if (!stopped) clearInterval(interval);
    };
    // eslint-disable-next-line
  }, [activeAccount]);

  const fetchTweets = useCallback(async (accessToken) => {
    try {
      const url = activeAccount?.sessionId
        ? `${API_URL}/api/twitter/user/tweets?session_id=${activeAccount.sessionId}`
        : `${API_URL}/api/twitter/user/tweets`;
      const headers = accessToken
        ? { Authorization: `Bearer ${accessToken}` }
        : {};
      const res = await fetch(url, { headers });
      const data = await res.json();
      setTweets(data.data || []);
    } catch (e) {}
  }, [activeAccount]);

  const fetchAnalytics = useCallback(async (accessToken) => {
    try {
      const res = await fetch(`${API_URL}/api/twitter/analytics`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      setAnalytics(data.data || data);
    } catch (e) {}
  }, []);

  // Add new account (login flow)
  const handleAddAccount = async () => {
    setError('');
    setLoading(true);
    // Generate new sessionId
    const newSessionId = crypto.randomUUID();
    // Open Twitter logout page in a popup to clear session
    const width = 600, height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const logoutPopup = window.open(
      'https://twitter.com/logout',
      'twitter-logout',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    // Wait for logout popup to close, then start login
    const waitForLogoutAndLogin = () => {
      if (!logoutPopup || logoutPopup.closed) {
        window.open(
          `${API_URL}/api/twitter/login?session_id=${newSessionId}`,
          'twitter-login',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        // Add a placeholder account with sessionId
        const tempAccount = {
          id: newSessionId,
          sessionId: newSessionId,
          token: '',
          profile: null,
          connectedAt: null
        };
        setConnectedAccounts(prev => {
          const updated = [...prev, tempAccount];
          saveAccountsToStorage(updated);
          return updated;
        });
        setActiveAccountId(newSessionId);
        setActiveAccount(tempAccount);
        localStorage.setItem('tw_active_account_id', newSessionId);
        setUser(null);
        setTweets([]);
        setAnalytics(null);
        setLoading(true);
        return;
      }
      setTimeout(waitForLogoutAndLogin, 400);
    };
    waitForLogoutAndLogin();
  };

  // Switch active account
  const switchAccount = (accountId) => {
    const account = connectedAccounts.find(acc => acc.id === accountId);
    if (account) {
      setActiveAccountId(accountId);
      setActiveAccount(account);
      setUserData('tw_active_account_id', accountId);
      setUser(account.profile || null);
      setTweets([]);
      setAnalytics(null);
      if (account.token) {
        fetchTweets(account.token);
        fetchAnalytics(account.token);
      }
    }
  };

  // Remove account
  const removeAccount = (accountId) => {
    const updatedAccounts = connectedAccounts.filter(acc => acc.id !== accountId);
    setConnectedAccounts(updatedAccounts);
    saveAccountsToStorage(updatedAccounts);
    
    if (activeAccountId === accountId) {
      if (updatedAccounts.length > 0) {
        switchAccount(updatedAccounts[0].id);
      } else {
        setActiveAccountId(null);
        setActiveAccount(null);
        setUser(null);
        setTweets([]);
        setAnalytics(null);
        removeUserData('tw_active_account_id');
      }
    }
  };

  // Disconnect all accounts
  const handleDisconnectAll = () => {
    setConnectedAccounts([]);
    setActiveAccountId(null);
    setActiveAccount(null);
    setUser(null);
    setTweets([]);
    setAnalytics(null);
    removeUserData('tw_connected_accounts');
    removeUserData('tw_active_account_id');
  };

  const handleTweetPost = async () => {
    if (!tweetText.trim() || !activeAccount?.token) return;
    setPosting(true);
    setPostResult('');
    try {
      const url = activeAccount.sessionId
        ? `${API_URL}/api/twitter/tweet?session_id=${activeAccount.sessionId}`
        : `${API_URL}/api/twitter/tweet`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeAccount.token}`
        },
        body: JSON.stringify({ text: tweetText })
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setPostResult('Tweet posted successfully!');
        setTweetText('');
        fetchTweets(activeAccount.token);
      } else {
        setPostResult(data.error || 'Failed to post tweet');
      }
    } catch (e) {
      setPostResult('Failed to post tweet');
    }
    setPosting(false);
  };

  // Render account selector
  const renderAccountSelector = () => (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-medium text-gray-700 flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Connected Twitter Accounts ({connectedAccounts.length})
        </h4>
        <button
          onClick={handleAddAccount}
          className="bg-blue-400 text-white px-4 py-2 rounded-lg hover:bg-blue-500 flex items-center space-x-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Account</span>
        </button>
      </div>
      {connectedAccounts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {connectedAccounts.map((account) => (
            <div
              key={account.id}
              className={`border rounded-lg p-4 transition-all cursor-pointer ${
                activeAccountId === account.id
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              onClick={() => switchAccount(account.id)}
            >
              <div className="flex items-center space-x-3">
                {account.profile?.profile_image_url && (
                  <img
                    src={account.profile.profile_image_url}
                    alt={account.profile.username}
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h5 className="font-medium text-gray-900 truncate">
                      @{account.profile?.username || account.id.slice(0, 8)}
                    </h5>
                    {activeAccountId === account.id && (
                      <UserCheck className="h-4 w-4 text-blue-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">
                    {account.profile?.name || 'Not connected'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Connected {account.connectedAt ? new Date(account.connectedAt).toLocaleDateString() : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeAccount(account.id);
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
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

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Twitter className="h-8 w-8 text-blue-400" />
            <span className="ml-2 text-xl font-bold text-[#1a1f2e]">Twitter Integration</span>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          {connectedAccounts.length === 0 ? (
            <div className="text-center py-12">
              <Twitter className="h-16 w-16 text-blue-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">Connect Twitter Account</h4>
              <p className="text-gray-500 mb-4">
                Connect your Twitter profile to access analytics and manage your tweets.
              </p>
              <button
                onClick={handleAddAccount}
                disabled={loading}
                className="bg-blue-400 text-white px-6 py-3 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
              >
                {loading ? 'Connecting...' : 'Connect Twitter Account'}
              </button>
              {error && <div className="mt-4 text-red-600">{error}</div>}
            </div>
          ) : (
            <div className="space-y-6">
              {renderAccountSelector()}
              {activeAccount && activeAccount.profile && (
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6">
                  <div className="flex items-center space-x-4 mb-6">
                    {activeAccount.profile.profile_image_url ? (
                      <img
                        src={activeAccount.profile.profile_image_url}
                        alt="Twitter profile"
                        className="w-20 h-20 rounded-full border-4 border-blue-200"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-blue-400 rounded-full flex items-center justify-center">
                        <Twitter className="h-10 w-10 text-white" />
                      </div>
                    )}
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">@{activeAccount.profile.username}</h2>
                      <p className="text-gray-700 text-sm mt-1">{activeAccount.profile.name}</p>
                      <p className="text-gray-500 text-xs">{activeAccount.profile.description}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-6 text-center">
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="text-2xl font-bold text-blue-400">
                        {activeAccount.profile.public_metrics?.followers_count?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">Followers</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="text-2xl font-bold text-blue-400">
                        {activeAccount.profile.public_metrics?.following_count?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">Following</div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm">
                      <div className="text-2xl font-bold text-blue-400">
                        {activeAccount.profile.public_metrics?.tweet_count?.toLocaleString() || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600 font-medium">Tweets</div>
                    </div>
                  </div>
                </div>
              )}
              {/* Analytics */}
              {analytics && (
                <div className="mt-8 space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-2xl p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="bg-blue-400 p-2 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">Twitter Analytics</h3>
                        <p className="text-sm text-gray-600">Last 30 days performance</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {analytics.followers && (
                      <TrendChart
                        data={analytics.followers}
                        title="Follower Growth"
                        color="#1DA1F2"
                        metric="value"
                      />
                    )}
                    {analytics.tweets && (
                      <TrendChart
                        data={analytics.tweets}
                        title="Tweets per Day"
                        color="#0a85d9"
                        metric="value"
                      />
                    )}
                    {analytics.likes && (
                      <TrendChart
                        data={analytics.likes}
                        title="Likes per Day"
                        color="#17bf63"
                        metric="value"
                      />
                    )}
                  </div>
                </div>
              )}
              {/* Tweets */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Recent Tweets ({tweets.length})
                </h3>
                {/* Compose Tweet UI */}
                <div className="mb-6">
                  <textarea
                    className="w-full border rounded-lg p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-200"
                    rows={3}
                    maxLength={280}
                    placeholder="What's happening?"
                    value={tweetText}
                    onChange={e => setTweetText(e.target.value)}
                    disabled={posting}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">{tweetText.length}/280</span>
                    <button
                      onClick={handleTweetPost}
                      disabled={posting || !tweetText.trim() || tweetText.length > 280 || !activeAccount?.token}
                      className="bg-blue-400 text-white px-4 py-2 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
                    >
                      {posting ? 'Posting...' : 'Post Tweet'}
                    </button>
                  </div>
                  {postResult && (
                    <div className={`mt-2 text-sm ${postResult.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                      {postResult}
                    </div>
                  )}
                </div>
                {/* End Compose Tweet UI */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tweets.length > 0 ? tweets.map(tweet => (
                    <div key={tweet.id} className="bg-gray-50 rounded-xl overflow-hidden hover:shadow-md transition-shadow p-4">
                      <p className="text-sm text-gray-800 mb-3">
                        {tweet.text}
                      </p>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <span>{new Date(tweet.created_at).toLocaleDateString()}</span>
                        <div className="flex items-center space-x-3">
                          <span>❤️ {tweet.public_metrics?.like_count || 0}</span>
                          <span>🔁 {tweet.public_metrics?.retweet_count || 0}</span>
                          <span>💬 {tweet.public_metrics?.reply_count || 0}</span>
                        </div>
                      </div>
                      <a
                        href={`https://twitter.com/${activeAccount.profile.username}/status/${tweet.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-600 text-xs font-medium inline-flex items-center space-x-1"
                      >
                        <span>View on Twitter</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )) : (
                    <div className="col-span-full text-center py-12">
                      <Twitter className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">No tweets found</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={handleDisconnectAll}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors text-sm"
                >
                  Disconnect All
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TwitterIntegration;

