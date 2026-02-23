import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Line, Bar, Doughnut, Area } from 'react-chartjs-2';
import { ArrowLeft, ExternalLink, RefreshCw, TrendingUp, Globe, Download, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useAuth } from '../admin/contexts/AuthContext';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const ROIDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [timeframe, setTimeframe] = useState('last_30_days');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState('all'); // 'all' or accountId
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [error, setError] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [connectedAccounts, setConnectedAccounts] = useState([]); // All connected accounts with details
  const [accountsData, setAccountsData] = useState({}); // Per-account analytics data keyed by accountId
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const dashboardRef = useRef(null);

  // Fetch customer analytics data from our new API
  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔍 Current user data:', currentUser);
      console.log('🔍 Customer ID:', currentUser?._id);
      
      if (!currentUser?._id) {
        setDashboardData(null);
        setAnalyticsData(null);
        setIsLoading(false);
        return;
      }

      const customerId = currentUser._id;
      console.log('🔍 Fetching analytics data for customer:', customerId);
      
      // Use full URL to backend server
      const backendUrl = 'https://my-backend-593529385135.asia-south1.run.app';
      
      // First try to get historical data
      try {
        console.log('📊 Attempting to fetch historical data...');
        const dashboardResponse = await fetch(`${backendUrl}/api/historical-data/get?accountId=${customerId}&platform=all&timePeriod=30`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        console.log('📊 Historical data API response status:', dashboardResponse.status);
        
        if (dashboardResponse.ok) {
          const historicalResult = await dashboardResponse.json();
          console.log('📊 Historical data received:', historicalResult);
          console.log('📊 Historical success:', historicalResult.success);
          console.log('📊 Historical structure:', {
            hasData: !!historicalResult.data,
            hasSuccess: !!historicalResult.success,
            snapshotsCount: historicalResult.snapshotsCount || 0
          });
          
          if (historicalResult.success && historicalResult.data) {
            const historicalData = historicalResult.data;
            console.log('📊 Historical data object:', historicalData);
            
            // Check if historical data has actual metrics
            const hasRealData = historicalResult.snapshotsCount > 0;
            console.log('📊 Historical data has real snapshots:', hasRealData);
            
            if (hasRealData) {
              // Process historical data for dashboard
              const processedData = processHistoricalData(historicalData);
              console.log('📊 Processed historical chart data:', processedData);
              
              if (processedData && Object.keys(processedData).length > 0) {
                setDashboardData(processedData);
                setAnalyticsData({
                  customerId: customerId,
                  platforms: Object.keys(processedData),
                  summary: calculateSummaryFromHistoricalData(processedData),
                  isHistorical: true
                });
                setPlatforms(Object.keys(processedData));
                setLastUpdated(new Date().toISOString());
                console.log('✅ Historical data set successfully');
              } else {
                console.log('⚠️ No processed historical data, nothing to display');
                setDashboardData(null);
              }
              setIsLoading(false);
              return;
            } else {
              console.log('📊 Historical data returned empty, falling back to connected accounts...');
            }
          } else {
            console.log('❌ Historical data response missing success or data');
          }
        } else {
          console.log('❌ Historical data response not ok:', dashboardResponse.status);
        }
      } catch (historicalError) {
        console.log('📊 Historical data not available:', historicalError.message);
        console.log('📊 Historical error details:', historicalError);
      }
      
      // If historical data isn't available, try to get basic data from connected accounts
      try {
        console.log('🔗 Attempting to fetch social links...');
        const socialLinksResponse = await fetch(`${backendUrl}/api/customer-social-links/${customerId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(5000)
        });
        
        console.log('🔗 Social links API response status:', socialLinksResponse.status);
        
        if (socialLinksResponse.ok) {
          const socialLinksResult = await socialLinksResponse.json();
          console.log('🔗 Social links data received:', socialLinksResult);
          
          if (socialLinksResult.success && socialLinksResult.accounts && socialLinksResult.accounts.length > 0) {
            console.log('🔗 Found connected accounts, creating preliminary analytics...');
            
            // Process and store all connected accounts with their details
            const processedAccounts = processConnectedAccounts(socialLinksResult.accounts);
            setConnectedAccounts(processedAccounts);
            
            // Create preliminary analytics from connected accounts
            const connectedPlatforms = [...new Set(socialLinksResult.accounts.map(account => account.platform))];
            const preliminaryData = await createPreliminaryAnalytics(socialLinksResult.accounts, timeframe);
            
            console.log('🔗 Preliminary data created:', preliminaryData);
            console.log('🔗 Chart data keys:', Object.keys(preliminaryData.chartData || {}));
            console.log('🔗 Per-account data:', preliminaryData.perAccountData);
            
            setAnalyticsData({
              customerId: customerId,
              platforms: connectedPlatforms,
              isPreliminary: true,
              summary: preliminaryData.summary,
              quickStats: preliminaryData.quickStats,
              accountNames: preliminaryData.accountNames
            });
            setPlatforms(connectedPlatforms);
            setAccountsData(preliminaryData.perAccountData || {});
            setLastUpdated(new Date().toISOString());
            setDashboardData(preliminaryData.chartData);
            setIsLoading(false);
            return;
          } else {
            console.log('🔗 No connected accounts found');
          }
        }
      } catch (socialLinksError) {
        console.log('🔗 Social links not available:', socialLinksError.message);
      }
      
      // No data available
      console.warn('⚠️ No data available');
      setDashboardData(null);
      setAnalyticsData(null);
      
    } catch (err) {
      console.error('❌ Error fetching analytics data:', err);
      // Don't set error for network issues, just use demo data
      if (err.name === 'AbortError' || err.message.includes('fetch')) {
        console.log('🔄 Backend not available, showing demo data');
      } else {
        setError(err.message);
      }
      // Always fallback to empty on any error
      setDashboardData(null);
      setAnalyticsData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Try to fetch real data if we have a customer ID
    if (currentUser?._id) {
      fetchAnalyticsData();
    } else {
      setDashboardData(null);
      setIsLoading(false);
    }
  }, [currentUser?._id, timeframe]);

  // Reset account selection when platform changes
  useEffect(() => {
    setSelectedAccount('all');
  }, [selectedPlatform]);

  // Process connected accounts into a flat list with unique IDs
  const processConnectedAccounts = (accounts) => {
    const processed = [];
    
    accounts.forEach(account => {
      if (account.platform === 'facebook' && account.pages && account.pages.length > 0) {
        // For Facebook, each page is a separate account
        account.pages.forEach(page => {
          processed.push({
            id: `facebook_${page.id}`,
            platform: 'facebook',
            accountId: page.id,
            name: page.name || 'Facebook Page',
            profilePicture: page.picture?.data?.url || null,
            type: 'page',
            hasInstagram: !!page.instagramBusinessAccount,
            instagramId: page.instagramBusinessAccount?.id,
            instagramUsername: page.instagramBusinessAccount?.username
          });
          
          // If this page has Instagram Business Account linked
          if (page.instagramBusinessAccount) {
            processed.push({
              id: `instagram_${page.instagramBusinessAccount.id}`,
              platform: 'instagram',
              accountId: page.instagramBusinessAccount.id,
              name: page.instagramBusinessAccount.username || page.instagramBusinessAccount.name || 'Instagram Account',
              profilePicture: page.instagramBusinessAccount.profile_picture_url || null,
              type: 'business',
              linkedFacebookPage: page.name
            });
          }
        });
      } else if (account.platform === 'instagram') {
        processed.push({
          id: `instagram_${account.platformUserId}`,
          platform: 'instagram',
          accountId: account.platformUserId,
          name: account.name || 'Instagram Account',
          profilePicture: account.profilePicture || null,
          type: 'personal'
        });
      } else if (account.platform === 'youtube' && account.channels && account.channels.length > 0) {
        // For YouTube, each channel is a separate account
        account.channels.forEach(channel => {
          processed.push({
            id: `youtube_${channel.id}`,
            platform: 'youtube',
            accountId: channel.id,
            name: channel.name || channel.title || 'YouTube Channel',
            profilePicture: channel.thumbnail || null,
            type: 'channel',
            subscriberCount: channel.subscriberCount,
            videoCount: channel.videoCount,
            viewCount: channel.viewCount
          });
        });
      } else if (account.platform === 'linkedin') {
        processed.push({
          id: `linkedin_${account.platformUserId}`,
          platform: 'linkedin',
          accountId: account.platformUserId,
          name: account.name || 'LinkedIn Profile',
          profilePicture: account.profilePicture || null,
          type: account.organizationId ? 'organization' : 'personal'
        });
      } else {
        // Generic fallback
        processed.push({
          id: `${account.platform}_${account.platformUserId}`,
          platform: account.platform,
          accountId: account.platformUserId,
          name: account.name || `${account.platform} Account`,
          profilePicture: account.profilePicture || null,
          type: 'unknown'
        });
      }
    });
    
    return processed;
  };

  // Get accounts filtered by selected platform
  const getFilteredAccounts = useMemo(() => {
    if (selectedPlatform === 'all') {
      return connectedAccounts;
    }
    return connectedAccounts.filter(acc => acc.platform === selectedPlatform);
  }, [connectedAccounts, selectedPlatform]);

  // Compute filtered data based on selected platform and account
  const filteredDashboardData = useMemo(() => {
    if (!dashboardData) return null;
    
    // If specific account is selected
    if (selectedAccount !== 'all') {
      const account = connectedAccounts.find(acc => acc.id === selectedAccount);
      if (account && accountsData[selectedAccount]) {
        return { [account.platform]: accountsData[selectedAccount] };
      }
      // Fallback to platform data if no specific account data
      if (account && dashboardData[account.platform]) {
        return { [account.platform]: dashboardData[account.platform] };
      }
      return null;
    }
    
    // If specific platform is selected
    if (selectedPlatform !== 'all') {
      if (dashboardData[selectedPlatform]) {
        return { [selectedPlatform]: dashboardData[selectedPlatform] };
      }
      return null;
    }
    
    // Return all data
    return dashboardData;
  }, [dashboardData, selectedPlatform, selectedAccount, connectedAccounts, accountsData]);


  // Create preliminary analytics from connected social accounts
  const createPreliminaryAnalytics = async (accounts, timeframeKey) => {
    console.log('🔄 Creating preliminary analytics for accounts:', accounts.length);
    
    const platforms = {};
    const connectedPlatforms = [];
    let totalConnectedAccounts = 0;
    let accountNames = {};
    
    // First, try to fetch historical data for each connected account
    try {
      console.log('🔗 Attempting to fetch historical data for connected accounts...');
      const backendUrl = 'https://my-backend-593529385135.asia-south1.run.app';
      const customerId = currentUser._id;
      
      for (const account of accounts) {
        if (account.platform && (account.platformUserId || account.pageId)) {
          const accountId = account.platformUserId || account.pageId || account.name;
          const timePeriod = timeframeKey === 'last_7_days' ? 7 : timeframeKey === 'last_30_days' ? 30 : 90;
          
          try {
            console.log(`🔍 Fetching historical data for ${account.platform}:${accountId}...`);
            const historicalResponse = await fetch(`${backendUrl}/api/historical-data/get?platform=${account.platform}&accountId=${accountId}&timePeriod=${timePeriod}`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              },
              signal: AbortSignal.timeout(8000) // 8 second timeout
            });
            
            if (historicalResponse.ok) {
              const historicalResult = await historicalResponse.json();
              console.log(`📊 Historical data for ${account.platform}:${accountId}:`, historicalResult);
              
              if (historicalResult.success && historicalResult.data && historicalResult.snapshotsCount > 0) {
                // Process historical data for this account
                const historicalPlatformData = processHistoricalDataForAccount(historicalResult.data, account.platform, timeframeKey);
                
                if (historicalPlatformData) {
                  platforms[account.platform] = historicalPlatformData;
                  accountNames[account.platform] = account.name || accountId;
                  
                  if (!connectedPlatforms.includes(account.platform)) {
                    connectedPlatforms.push(account.platform);
                    totalConnectedAccounts++;
                  }
                  
                  console.log(`✅ Used historical data for ${account.platform}`);
                  continue; // Skip to next account since we have real data
                }
              }
            }
          } catch (historicalError) {
            console.log(`⚠️ No historical data for ${account.platform}:${accountId}:`, historicalError.message);
          }
        }
      }
      
      console.log(`📊 Found historical data for ${Object.keys(platforms).length} platforms`);
    } catch (error) {
      console.warn('⚠️ Error fetching historical data:', error.message);
    }

    // First, try to fetch real-time metrics from our new API for accounts without historical data
    try {
      console.log('🔗 Attempting to fetch real-time social metrics...');
      const backendUrl = 'https://my-backend-593529385135.asia-south1.run.app';
      const customerId = currentUser._id;
      
      const metricsResponse = await fetch(`${backendUrl}/api/customer/social-metrics/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      
      console.log('📊 Real-time metrics response status:', metricsResponse.status);
      
      if (metricsResponse.ok) {
        const metricsResult = await metricsResponse.json();
        console.log('📊 Real-time metrics received:', metricsResult);
        
        if (metricsResult.success && metricsResult.metrics) {
          // Use real metrics from the API for platforms that don't have historical data
          const realMetrics = metricsResult.metrics;
          const realAccountNames = metricsResult.accountNames || {};
          
          console.log('📊 Processing real metrics for platforms:', Object.keys(realMetrics));
          
          Object.keys(realMetrics).forEach(platform => {
            // Skip if we already have historical data for this platform
            if (platforms[platform]) {
              console.log(`⏭️ Skipping ${platform} - already have historical data`);
              return;
            }
            
            const metrics = realMetrics[platform];
            
            if (!connectedPlatforms.includes(platform)) {
              connectedPlatforms.push(platform);
              totalConnectedAccounts++;
            }
            
            console.log(`📱 Processing ${platform} metrics:`, metrics);
            
            // Convert real metrics to our dashboard format with growth estimates
            const estimatedPrevious = {
              followers: Math.max(1, Math.round(metrics.followers * 0.85)), // Assume 15% growth
              likes: Math.max(0, Math.round(metrics.likes * 0.75)), // Assume 25% engagement growth
              comments: Math.max(0, Math.round(metrics.comments * 0.80)), // Assume 20% comment growth
              shares: Math.max(0, Math.round((metrics.shares || metrics.totalEngagement * 0.1) * 0.85)) // Estimate shares if not available
            };
            
            const growth = {
              followers: metrics.followers > 0 ? ((metrics.followers - estimatedPrevious.followers) / estimatedPrevious.followers * 100) : 0,
              likes: metrics.likes > 0 ? ((metrics.likes - estimatedPrevious.likes) / Math.max(1, estimatedPrevious.likes) * 100) : 0,
              comments: metrics.comments > 0 ? ((metrics.comments - estimatedPrevious.comments) / Math.max(1, estimatedPrevious.comments) * 100) : 0,
              shares: (metrics.shares || 0) > 0 ? (((metrics.shares || estimatedPrevious.shares) - estimatedPrevious.shares) / Math.max(1, estimatedPrevious.shares) * 100) : 0
            };
            
            if (platform === 'facebook') {
              platforms[platform] = {
                followers: { 
                  current: metrics.followers, 
                  previous: estimatedPrevious.followers, 
                  growth: Math.round(growth.followers * 100) / 100 
                },
                likes: { 
                  current: metrics.likes, 
                  previous: estimatedPrevious.likes, 
                  growth: Math.round(growth.likes * 100) / 100 
                },
                comments: { 
                  current: metrics.comments, 
                  previous: estimatedPrevious.comments, 
                  growth: Math.round(growth.comments * 100) / 100 
                },
                shares: { 
                  current: metrics.shares || Math.round(metrics.totalEngagement * 0.1), 
                  previous: estimatedPrevious.shares, 
                  growth: Math.round(growth.shares * 100) / 100 
                },
                engagement_rate: { 
                  current: Math.min(100, metrics.engagementRate || 0), 
                  previous: Math.min(100, (metrics.engagementRate || 0) * 0.9), 
                  growth: 10 
                },
                monthlyData: generateGrowthTrend(metrics.followers, timeframeKey === 'last_7_days' ? 6 : timeframeKey === 'last_30_days' ? 6 : 12)
              };
              
              console.log(`✅ Created Facebook analytics from real-time data:`, platforms[platform]);
            } else if (platform === 'instagram') {
              platforms[platform] = {
                followers: { 
                  current: metrics.followers, 
                  previous: estimatedPrevious.followers, 
                  growth: Math.round(growth.followers * 100) / 100 
                },
                likes: { 
                  current: metrics.likes, 
                  previous: estimatedPrevious.likes, 
                  growth: Math.round(growth.likes * 100) / 100 
                },
                comments: { 
                  current: metrics.comments, 
                  previous: estimatedPrevious.comments, 
                  growth: Math.round(growth.comments * 100) / 100 
                },
                shares: { 
                  current: Math.round(metrics.totalEngagement * 0.05), // Instagram doesn't have shares, use small portion of engagement
                  previous: Math.round(estimatedPrevious.likes * 0.05), 
                  growth: Math.round(growth.likes * 100) / 100 
                },
                engagement_rate: { 
                  current: Math.min(100, metrics.engagementRate || 0), 
                  previous: Math.min(100, (metrics.engagementRate || 0) * 0.85), 
                  growth: 15 
                },
                monthlyData: generateGrowthTrend(metrics.followers, timeframeKey === 'last_7_days' ? 6 : timeframeKey === 'last_30_days' ? 6 : 12)
              };
              
              console.log(`✅ Created Instagram analytics from real-time data:`, platforms[platform]);
            } else if (platform === 'linkedin') {
              platforms[platform] = {
                followers: { 
                  current: metrics.followers, 
                  previous: estimatedPrevious.followers, 
                  growth: Math.round(growth.followers * 100) / 100 
                },
                likes: { 
                  current: metrics.likes, 
                  previous: estimatedPrevious.likes, 
                  growth: Math.round(growth.likes * 100) / 100 
                },
                comments: { 
                  current: metrics.comments, 
                  previous: estimatedPrevious.comments, 
                  growth: Math.round(growth.comments * 100) / 100 
                },
                shares: { 
                  current: metrics.shares || Math.round(metrics.totalEngagement * 0.3), // LinkedIn has good sharing
                  previous: estimatedPrevious.shares, 
                  growth: Math.round(growth.shares * 100) / 100 
                },
                impressions: {
                  current: metrics.impressions || Math.round(metrics.totalEngagement * 15), // Use real impressions if available
                  previous: Math.round(metrics.totalEngagement * 12),
                  growth: 25
                },
                engagement_rate: { 
                  current: Math.min(100, metrics.engagementRate || 0), 
                  previous: Math.min(100, (metrics.engagementRate || 0) * 0.9), 
                  growth: 12 
                },
                monthlyData: generateGrowthTrend(metrics.followers, timeframeKey === 'last_7_days' ? 6 : timeframeKey === 'last_30_days' ? 6 : 12)
              };
              
              console.log(`✅ Created LinkedIn analytics from real-time data:`, platforms[platform]);
            }
            
            // Update account names
            if (realAccountNames[platform]) {
              accountNames[platform] = realAccountNames[platform];
            }
          });
          
          console.log('✅ Using real metrics for preliminary analytics');
        }
      } else {
        console.warn('⚠️ Could not fetch real-time metrics, falling back to estimates');
      }
    } catch (error) {
      console.warn('⚠️ Error fetching real-time metrics:', error.message);
    }

    // Process connected accounts to create platform data for remaining accounts
    console.log('🔄 Processing connected accounts...', accounts.length, 'accounts found');
    
    accounts.forEach(account => {
      console.log('Processing account:', account.platform, account.name);
      
      // Add platform to connectedPlatforms if not already there
      if (!connectedPlatforms.includes(account.platform)) {
        connectedPlatforms.push(account.platform);
      }
      
      // Skip if we already have data for this platform
      if (platforms[account.platform]) {
        console.log(`⏭️ Skipping ${account.platform} - already have data`);
        return;
      }
      
      processAccountData(account);
    });
    
    // Helper function to process individual account data
    function processAccountData(account) {
      // Count connected accounts (including pages for Facebook)
      if (account.platform === 'facebook' && account.pages) {
        totalConnectedAccounts += account.pages.length;
        
        // For each Facebook page, create estimated data
        account.pages.forEach(page => {
          // Add Facebook platform data with realistic estimates for new/small business
          if (!platforms['facebook']) {
            platforms['facebook'] = {
              followers: { current: 250, previous: 180, growth: 38.9 },
              likes: { current: 120, previous: 85, growth: 41.2 },
              comments: { current: 25, previous: 18, growth: 38.9 },
              shares: { current: 12, previous: 8, growth: 50 },
              engagement_rate: { current: 4.2, previous: 3.8, growth: 10.5 },
              monthlyData: timeframeKey === 'last_7_days' ? [180, 195, 210, 225, 240, 250] :
                          timeframeKey === 'last_30_days' ? [180, 195, 210, 225, 240, 250] :
                          [120, 135, 150, 165, 180, 195, 210, 220, 230, 240, 245, 250]
            };
          }
          
          // Add account name from Facebook page
          if (page.name) {
            accountNames['facebook'] = page.name;
          }
          
          // If Instagram Business Account is available, add Instagram data
          if (page.instagramBusinessAccount && !platforms['instagram']) {
            platforms['instagram'] = {
              followers: { current: 320, previous: 220, growth: 45.5 },
              likes: { current: 180, previous: 130, growth: 38.5 },
              comments: { current: 35, previous: 25, growth: 40 },
              shares: { current: 15, previous: 10, growth: 50 },
              engagement_rate: { current: 5.8, previous: 5.2, growth: 11.5 },
              monthlyData: timeframeKey === 'last_7_days' ? [220, 240, 260, 280, 300, 320] :
                          timeframeKey === 'last_30_days' ? [220, 240, 260, 280, 300, 320] :
                          [150, 170, 190, 210, 220, 240, 250, 270, 285, 300, 310, 320]
            };
            
            if (page.instagramBusinessAccount.username) {
              accountNames['instagram'] = page.instagramBusinessAccount.username;
            }
          }
        });
      } else if (account.platform === 'instagram' && !platforms['instagram']) {
        totalConnectedAccounts += 1;
        
        // Handle direct Instagram connection with small business estimates
        platforms['instagram'] = {
          followers: { current: 320, previous: 220, growth: 45.5 },
          likes: { current: 180, previous: 130, growth: 38.5 },
          comments: { current: 35, previous: 25, growth: 40 },
          shares: { current: 15, previous: 10, growth: 50 },
          engagement_rate: { current: 5.8, previous: 5.2, growth: 11.5 },
          monthlyData: timeframeKey === 'last_7_days' ? [220, 240, 260, 280, 300, 320] :
                      timeframeKey === 'last_30_days' ? [220, 240, 260, 280, 300, 320] :
                      [150, 170, 190, 210, 220, 240, 250, 270, 285, 300, 310, 320]
        };
        
        if (account.name) {
          accountNames['instagram'] = account.name;
        }
      } else if (account.platform === 'youtube' && !platforms['youtube']) {
        totalConnectedAccounts += 1;
        
        // Handle YouTube connection with channel data
        // Use real data from YouTube channels if available
        const channel = account.channels && account.channels[0];
        const subscriberCount = channel ? parseInt(channel.subscriberCount) || 10 : 10;
        const videoCount = channel ? parseInt(channel.videoCount) || 5 : 5;
        const viewCount = channel ? parseInt(channel.viewCount) || 50 : 50;
        
        platforms['youtube'] = {
          subscribers: { 
            current: subscriberCount, 
            previous: Math.max(1, Math.floor(subscriberCount * 0.8)), 
            growth: Math.round(((subscriberCount - Math.floor(subscriberCount * 0.8)) / Math.floor(subscriberCount * 0.8)) * 100) || 25
          },
          views: { 
            current: viewCount, 
            previous: Math.max(1, Math.floor(viewCount * 0.7)), 
            growth: Math.round(((viewCount - Math.floor(viewCount * 0.7)) / Math.floor(viewCount * 0.7)) * 100) || 43
          },
          likes: { 
            current: Math.floor(viewCount * 0.1) || 5, 
            previous: Math.floor(viewCount * 0.05) || 2, 
            growth: 50 
          },
          comments: { 
            current: Math.floor(viewCount * 0.05) || 2, 
            previous: Math.floor(viewCount * 0.02) || 1, 
            growth: 67 
          },
          watchTime: { 
            current: Math.floor(viewCount * 3) || 150, 
            previous: Math.floor(viewCount * 2) || 100, 
            growth: 50 
          },
          engagement_rate: { 
            current: 6.2, 
            previous: 5.1, 
            growth: 21.6 
          },
          monthlyData: timeframeKey === 'last_7_days' ? 
            generateGrowthTrend(subscriberCount, 6) :
            timeframeKey === 'last_30_days' ? 
            generateGrowthTrend(subscriberCount, 6) :
            generateGrowthTrend(subscriberCount, 12)
        };
        
        // Add account name from YouTube channel
        if (account.name) {
          accountNames['youtube'] = account.name;
        } else if (account.channels && account.channels[0] && account.channels[0].name) {
          accountNames['youtube'] = account.channels[0].name;
        }
      } else if (account.platform === 'linkedin' && !platforms['linkedin']) {
        // Do not add LinkedIn mock data. Only add if real/historical/metrics data is available.
        if (account.name) {
          accountNames['linkedin'] = account.name;
        }
      }
    }
    
    // Calculate summary statistics
    const totalFollowers = Object.values(platforms).reduce((total, platform) => {
      const followerKey = platform.subscribers ? 'subscribers' : 'followers';
      return total + (platform[followerKey]?.current || 0);
    }, 0);
    
    const totalEngagement = Object.values(platforms).reduce((total, platform) => {
      return total + 
        (platform.likes?.current || 0) + 
        (platform.comments?.current || 0) + 
        (platform.shares?.current || 0) +
        (platform.views?.current || 0);
    }, 0);
    
    const avgEngagementRate = Object.values(platforms).reduce((sum, platform) => {
      return sum + (platform.engagement_rate?.current || 0);
    }, 0) / Math.max(1, Object.keys(platforms).length);
    
    const overallGrowth = Object.values(platforms).reduce((sum, platform) => {
      const followerKey = platform.subscribers ? 'subscribers' : 'followers';
      return sum + (platform[followerKey]?.growth || 0);
    }, 0) / Math.max(1, Object.keys(platforms).length);
    
    // Build per-account data for individual account filtering
    const perAccountData = {};
    accounts.forEach(account => {
      if (account.platform === 'facebook' && account.pages) {
        account.pages.forEach(page => {
          const accountId = `facebook_${page.id}`;
          perAccountData[accountId] = platforms['facebook'] ? { ...platforms['facebook'] } : null;
          
          if (page.instagramBusinessAccount) {
            const igAccountId = `instagram_${page.instagramBusinessAccount.id}`;
            perAccountData[igAccountId] = platforms['instagram'] ? { ...platforms['instagram'] } : null;
          }
        });
      } else if (account.platform === 'youtube' && account.channels) {
        account.channels.forEach(channel => {
          const accountId = `youtube_${channel.id}`;
          // Create channel-specific data if available
          const subscriberCount = parseInt(channel.subscriberCount) || 0;
          const viewCount = parseInt(channel.viewCount) || 0;
          const videoCount = parseInt(channel.videoCount) || 0;
          
          if (subscriberCount > 0) {
            perAccountData[accountId] = {
              subscribers: { 
                current: subscriberCount, 
                previous: Math.max(1, Math.floor(subscriberCount * 0.8)), 
                growth: 25
              },
              views: { 
                current: viewCount, 
                previous: Math.max(1, Math.floor(viewCount * 0.7)), 
                growth: 43
              },
              likes: { 
                current: Math.floor(viewCount * 0.1) || 5, 
                previous: Math.floor(viewCount * 0.05) || 2, 
                growth: 50 
              },
              comments: { 
                current: Math.floor(viewCount * 0.05) || 2, 
                previous: Math.floor(viewCount * 0.02) || 1, 
                growth: 67 
              },
              engagement_rate: { current: 6.2, previous: 5.1, growth: 21.6 },
              monthlyData: generateGrowthTrend(subscriberCount, 6)
            };
          } else {
            perAccountData[accountId] = platforms['youtube'] ? { ...platforms['youtube'] } : null;
          }
        });
      } else if (account.platform === 'instagram') {
        const accountId = `instagram_${account.platformUserId}`;
        perAccountData[accountId] = platforms['instagram'] ? { ...platforms['instagram'] } : null;
      } else if (account.platform === 'linkedin') {
        const accountId = `linkedin_${account.platformUserId}`;
        perAccountData[accountId] = platforms['linkedin'] ? { ...platforms['linkedin'] } : null;
      }
    });
    
    console.log('Generated preliminary analytics for platforms:', Object.keys(platforms));
    console.log('Full platforms data:', platforms);
    console.log('Account names:', accountNames);
    console.log('Per-account data keys:', Object.keys(perAccountData));
    
    return {
      chartData: platforms,
      accountNames,
      perAccountData,
      summary: {
        totalFollowers,
        totalEngagement,
        averageEngagementRate: avgEngagementRate,
        overallGrowth,
        totalAccounts: totalConnectedAccounts,
        connectedPlatforms: connectedPlatforms.length
      },
      quickStats: {
        totalAccounts: totalConnectedAccounts,
        dataFreshness: new Date().toISOString(),
        lastWeekGrowth: overallGrowth
      }
    };
  };

  // Helper function to process historical data for a single account
  const processHistoricalDataForAccount = (historicalData, platform, timeframeKey) => {
    console.log(`🔄 Processing historical data for ${platform}:`, historicalData);
    
    if (!historicalData || typeof historicalData !== 'object') {
      return null;
    }

    const platformData = {
      monthlyData: []
    };

    // Process each metric type
    Object.keys(historicalData).forEach(metricType => {
      const metricArray = historicalData[metricType];
      
      if (!Array.isArray(metricArray) || metricArray.length === 0) {
        return;
      }

      const latestData = metricArray[metricArray.length - 1];
      const previousData = metricArray.length > 1 ? metricArray[metricArray.length - 2] : latestData;
      
      const currentValue = latestData.value || 0;
      const previousValue = previousData.value || 0;
      const growth = previousValue > 0 ? ((currentValue - previousValue) / previousValue * 100) : 0;

      // Map metrics to platform data structure
      if (metricType === 'followers' && platform !== 'youtube') {
        platformData.followers = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
        platformData.monthlyData = metricArray.map(d => d.value);
      } else if (metricType === 'followers' && platform === 'youtube') {
        platformData.subscribers = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
        platformData.monthlyData = metricArray.map(d => d.value);
      } else if (metricType === 'likes') {
        platformData.likes = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'comments') {
        platformData.comments = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'shares') {
        platformData.shares = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'views' && platform === 'youtube') {
        platformData.views = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'impressions' && platform === 'linkedin') {
        platformData.impressions = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'reach' && (platform === 'facebook' || platform === 'instagram')) {
        platformData.reach = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'engagement') {
        platformData.engagement_rate = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      }
    });

    // Calculate engagement rate if not provided
    if (!platformData.engagement_rate && platformData.likes && platformData.comments) {
      const followerMetric = platformData.subscribers || platformData.followers;
      if (followerMetric && followerMetric.current > 0) {
        const totalEngagement = (platformData.likes.current || 0) + 
                                (platformData.comments.current || 0) + 
                                (platformData.shares?.current || 0);
        const engagementRate = (totalEngagement / followerMetric.current * 100);
        
        platformData.engagement_rate = {
          current: Math.round(engagementRate * 100) / 100,
          previous: Math.round((engagementRate * 0.9) * 100) / 100,
          growth: 10
        };
      }
    }

    console.log(`✅ Processed historical data for ${platform}:`, platformData);
    return platformData;
  };

  // Process historical data from the historical_data API
  const processHistoricalData = (historicalData) => {
    console.log('🔄 Processing historical data:', historicalData);
    
    if (!historicalData || typeof historicalData !== 'object') {
      console.log('❌ Historical data missing or invalid structure');
      return null;
    }

    const platformData = {};

    // Process each metric type in the historical data
    Object.keys(historicalData).forEach(metricType => {
      const metricDataArray = historicalData[metricType];
      
      if (!Array.isArray(metricDataArray) || metricDataArray.length === 0) {
        return;
      }

      console.log(`📊 Processing metric type: ${metricType} with ${metricDataArray.length} data points`);

      // Get the latest values for current metrics
      const latestData = metricDataArray[metricDataArray.length - 1];
      const previousData = metricDataArray.length > 1 ? metricDataArray[metricDataArray.length - 2] : latestData;
      const firstData = metricDataArray[0];

      const currentValue = latestData.value || 0;
      const previousValue = previousData.value || 0;
      const growth = previousValue > 0 ? ((currentValue - previousValue) / previousValue * 100) : 0;

      // Extract platform information (this would need to be enhanced based on your data structure)
      const platform = latestData.platform || 'unknown';
      
      if (!platformData[platform]) {
        platformData[platform] = {};
      }

      // Map historical data metrics to dashboard format
      if (metricType === 'followers') {
        platformData[platform].followers = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100,
          monthlyData: metricDataArray.map(d => d.value)
        };
      } else if (metricType === 'likes') {
        platformData[platform].likes = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'comments') {
        platformData[platform].comments = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'shares') {
        platformData[platform].shares = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'engagement') {
        platformData[platform].engagement_rate = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'views') {
        platformData[platform].views = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'reach') {
        platformData[platform].reach = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      } else if (metricType === 'impressions') {
        platformData[platform].impressions = {
          current: currentValue,
          previous: previousValue,
          growth: Math.round(growth * 100) / 100
        };
      }
    });

    console.log('✅ Processed historical platform data:', Object.keys(platformData));
    return platformData;
  };

  // Calculate summary from historical data
  const calculateSummaryFromHistoricalData = (platformData) => {
    const platforms = Object.keys(platformData);
    
    const totalFollowers = platforms.reduce((total, platform) => {
      const followerKey = platform === 'youtube' ? 'subscribers' : 'followers';
      return total + (platformData[platform]?.[followerKey]?.current || 0);
    }, 0);
    
    const totalEngagement = platforms.reduce((total, platform) => {
      return total + 
        (platformData[platform]?.likes?.current || 0) + 
        (platformData[platform]?.comments?.current || 0) + 
        (platformData[platform]?.shares?.current || 0);
    }, 0);
    
    const avgEngagementRate = platforms.reduce((sum, platform) => {
      return sum + (platformData[platform]?.engagement_rate?.current || 0);
    }, 0) / platforms.length;
    
    const overallGrowth = platforms.reduce((sum, platform) => {
      const followerKey = platform === 'youtube' ? 'subscribers' : 'followers';
      return sum + (platformData[platform]?.[followerKey]?.growth || 0);
    }, 0) / platforms.length;

    return {
      totalFollowers,
      totalEngagement,
      averageEngagementRate: avgEngagementRate,
      overallGrowth,
      totalAccounts: platforms.length,
      connectedPlatforms: platforms.length
    };
  };

  // Process analytics data from our API (keeping as fallback)
  const processAnalyticsData = (dashboard) => {
    console.log('🔄 Processing dashboard data:', dashboard);
    
    if (!dashboard || !dashboard.summary) {
      console.log('❌ Dashboard data missing or invalid structure');
      return null;
    }

    const { summary, platforms: availablePlatforms = [], insights = [] } = dashboard;
    
    // Check if we have any platforms with data
    if (!availablePlatforms || availablePlatforms.length === 0) {
      console.log('❌ No platforms available in dashboard data');
      return null;
    }
    
    console.log('📊 Available platforms:', availablePlatforms);
    console.log('📊 Summary data:', summary);
    
    // Create platform-specific data structure
    const platformData = {};
    
    // Calculate realistic distribution percentages based on platform mix
    const platformDistribution = {
      facebook: 0.35,
      instagram: 0.30,
      youtube: 0.20,
      linkedin: 0.15
    };
    
    // Adjust distribution based on actual platforms present
    const activePlatforms = availablePlatforms.filter(p => p && p.trim());
    const numActivePlatforms = activePlatforms.length;
    
    // Process each available platform
    activePlatforms.forEach((platform, index) => {
      const platformKey = platform.toLowerCase().trim();
      
      console.log(`📱 Processing platform: ${platformKey}`);
      
      // Calculate realistic growth rates
      const estimatedGrowth = {
        followers: Math.round(Math.random() * 20 + 5), // 5-25% growth estimate
        engagement: Math.round(Math.random() * 30 + 10), // 10-40% engagement growth
        posts: Math.round(Math.random() * 15 + 5) // 5-20% content growth
      };
      
      // More evenly distribute followers across platforms
      const platformShare = numActivePlatforms > 0 ? 1 / numActivePlatforms : 0.25;
      const followerShare = Math.floor(summary.totalFollowers * platformShare);
      const engagementShare = Math.floor(summary.totalEngagement * platformShare);
      
      if (platformKey === 'facebook') {
        platformData.facebook = {
          followers: {
            current: followerShare,
            previous: Math.floor(followerShare * 0.85),
            growth: estimatedGrowth.followers
          },
          likes: {
            current: Math.floor(engagementShare * 0.6), // Higher engagement for Facebook
            previous: Math.floor(engagementShare * 0.6 * 0.8),
            growth: estimatedGrowth.engagement
          },
          comments: {
            current: Math.floor(engagementShare * 0.25),
            previous: Math.floor(engagementShare * 0.25 * 0.75),
            growth: estimatedGrowth.engagement + 5
          },
          shares: {
            current: Math.floor(engagementShare * 0.15),
            previous: Math.floor(engagementShare * 0.15 * 0.9),
            growth: estimatedGrowth.engagement - 5
          },
          reach: {
            current: Math.floor(engagementShare * 8),
            previous: Math.floor(engagementShare * 6.5),
            growth: estimatedGrowth.engagement
          },
          engagement_rate: {
            current: summary.averageEngagementRate || 3.2,
            previous: (summary.averageEngagementRate || 3.2) * 0.9,
            growth: 10
          },
          monthlyData: generateGrowthTrend(followerShare, 6)
        };
      }
      
      if (platformKey === 'instagram') {
        platformData.instagram = {
          followers: {
            current: followerShare,
            previous: Math.floor(followerShare * 0.8),
            growth: estimatedGrowth.followers + 5
          },
          likes: {
            current: Math.floor(engagementShare * 0.7), // Instagram has high likes
            previous: Math.floor(engagementShare * 0.7 * 0.7),
            growth: estimatedGrowth.engagement + 10
          },
          comments: {
            current: Math.floor(engagementShare * 0.2),
            previous: Math.floor(engagementShare * 0.2 * 0.75),
            growth: estimatedGrowth.engagement + 8
          },
          shares: {
            current: Math.floor(engagementShare * 0.1), // Instagram shares are lower
            previous: Math.floor(engagementShare * 0.1 * 0.8),
            growth: estimatedGrowth.engagement
          },
          reach: {
            current: Math.floor(engagementShare * 12),
            previous: Math.floor(engagementShare * 9),
            growth: estimatedGrowth.engagement + 5
          },
          engagement_rate: {
            current: (summary.averageEngagementRate || 3.2) * 1.2,
            previous: (summary.averageEngagementRate || 3.2),
            growth: 15
          },
          monthlyData: generateGrowthTrend(followerShare, 6)
        };
      }
      
      if (platformKey === 'youtube') {
        platformData.youtube = {
          subscribers: {
            current: followerShare,
            previous: Math.floor(followerShare * 0.75),
            growth: estimatedGrowth.followers + 10
          },
          views: {
            current: Math.floor(engagementShare * 25), // Views are much higher
            previous: Math.floor(engagementShare * 20),
            growth: estimatedGrowth.engagement + 15
          },
          likes: {
            current: Math.floor(engagementShare * 0.3),
            previous: Math.floor(engagementShare * 0.25),
            growth: estimatedGrowth.engagement
          },
          comments: {
            current: Math.floor(engagementShare * 0.1),
            previous: Math.floor(engagementShare * 0.08),
            growth: estimatedGrowth.engagement + 5
          },
          watchTime: {
            current: Math.floor(engagementShare * 60), // Watch time in minutes
            previous: Math.floor(engagementShare * 45),
            growth: estimatedGrowth.engagement + 8
          },
          engagement_rate: {
            current: (summary.averageEngagementRate || 3.2) * 2,
            previous: (summary.averageEngagementRate || 3.2) * 1.7,
            growth: 18
          },
          monthlyData: generateGrowthTrend(followerShare, 6)
        };
      }
      
      if (platformKey === 'linkedin') {
        platformData.linkedin = {
          followers: {
            current: followerShare,
            previous: Math.floor(followerShare * 0.8),
            growth: estimatedGrowth.followers
          },
          likes: {
            current: Math.floor(engagementShare * 0.4),
            previous: Math.floor(engagementShare * 0.3),
            growth: estimatedGrowth.engagement
          },
          comments: {
            current: Math.floor(engagementShare * 0.3), // LinkedIn has high comment engagement
            previous: Math.floor(engagementShare * 0.25),
            growth: estimatedGrowth.engagement + 3
          },
          shares: {
            current: Math.floor(engagementShare * 0.3), // LinkedIn shares are high
            previous: Math.floor(engagementShare * 0.25),
            growth: estimatedGrowth.engagement + 2
          },
          impressions: {
            current: Math.floor(engagementShare * 15),
            previous: Math.floor(engagementShare * 12),
            growth: estimatedGrowth.engagement
          },
          engagement_rate: {
            current: (summary.averageEngagementRate || 3.2) * 0.8,
            previous: (summary.averageEngagementRate || 3.2) * 0.7,
            growth: 12
          },
          monthlyData: generateGrowthTrend(followerShare, 6)
        };
      }
    });
    
    console.log('✅ Processed platform data:', Object.keys(platformData));
    return platformData;
  };

  // Generate growth trend data
  const generateGrowthTrend = (currentValue, months) => {
    const data = [];
    const totalGrowthRate = 0.25; // 25% total growth over the period
    
    for (let i = 0; i < months; i++) {
      const monthlyGrowthRate = totalGrowthRate / months;
      const value = Math.round(currentValue * (1 - totalGrowthRate + (monthlyGrowthRate * (i + 1))));
      data.push(value);
    }
    
    return data;
  };

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAnalyticsData();
    setIsRefreshing(false);
  };

  // Generate PDF Report
  const generatePDFReport = async () => {
    if (!dashboardData) {
      alert('No data available to generate report');
      return;
    }

    setIsGeneratingPDF(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      // Helper function to add new page if needed
      const checkPageBreak = (neededHeight) => {
        if (yPosition + neededHeight > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      // ========== HEADER SECTION ==========
      pdf.setFillColor(79, 70, 229); // Indigo
      pdf.rect(0, 0, pageWidth, 50, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ROI Analytics Report', margin, 25);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Comprehensive Social Media Performance Analysis', margin, 35);
      
      pdf.setFontSize(10);
      const reportDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      pdf.text(`Generated: ${reportDate}`, margin, 45);

      yPosition = 60;

      // ========== REPORT OVERVIEW ==========
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Report Overview', margin, yPosition);
      yPosition += 10;

      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 30, 3, 3, 'FD');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      
      const timeframeLabel = timeframe === 'last_7_days' ? 'Last 7 Days' : 
                             timeframe === 'last_30_days' ? 'Last 30 Days' : 'Last 90 Days';
      
      const overviewItems = [
        `Time Period: ${timeframeLabel}`,
        `Connected Platforms: ${platforms.length > 0 ? platforms.join(', ') : 'All Platforms'}`,
        `Data Status: ${analyticsData && !analyticsData.isPreliminary ? 'Live Data' : analyticsData?.isPreliminary ? 'Connected Data' : 'Demo Data'}`,
        `Total Accounts Analyzed: ${analyticsData?.summary?.totalAccounts || Object.keys(dashboardData).length}`
      ];
      
      let overviewY = yPosition + 7;
      overviewItems.forEach(item => {
        pdf.text(`• ${item}`, margin + 5, overviewY);
        overviewY += 6;
      });
      
      yPosition += 40;

      // ========== KEY METRICS SUMMARY ==========
      checkPageBreak(60);
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Key Performance Metrics', margin, yPosition);
      yPosition += 10;

      // Metrics boxes
      const boxWidth = (pageWidth - 2 * margin - 15) / 4;
      const boxHeight = 35;
      
      const metrics = [
        { label: 'Total Followers', value: getTotalFollowers().toLocaleString(), color: [59, 130, 246] },
        { label: 'Total Engagement', value: getTotalEngagement().toLocaleString(), color: [34, 197, 94] },
        { label: 'Avg. Engagement Rate', value: `${getAverageEngagementRate()}%`, color: [168, 85, 247] },
        { label: 'Overall ROI', value: `+${getOverallROI()}%`, color: [234, 179, 8] }
      ];

      metrics.forEach((metric, index) => {
        const xPos = margin + (index * (boxWidth + 5));
        
        pdf.setFillColor(metric.color[0], metric.color[1], metric.color[2]);
        pdf.roundedRect(xPos, yPosition, boxWidth, boxHeight, 3, 3, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        pdf.text(metric.label, xPos + 5, yPosition + 10);
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(metric.value, xPos + 5, yPosition + 25);
      });
      
      yPosition += boxHeight + 15;

      // ========== PLATFORM PERFORMANCE ==========
      checkPageBreak(40);
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Platform Performance Details', margin, yPosition);
      yPosition += 10;

      const platformColorMap = {
        facebook: [24, 119, 242],
        instagram: [228, 64, 95],
        youtube: [255, 0, 0],
        linkedin: [0, 119, 181]
      };

      Object.keys(dashboardData).forEach(platform => {
        const data = dashboardData[platform];
        if (!data) return;

        checkPageBreak(50);
        
        const color = platformColorMap[platform] || [107, 114, 128];
        
        // Platform header
        pdf.setFillColor(color[0], color[1], color[2]);
        pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 8, 2, 2, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.text(platform.charAt(0).toUpperCase() + platform.slice(1), margin + 5, yPosition + 6);
        yPosition += 12;

        // Platform metrics table
        pdf.setTextColor(55, 65, 81);
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');

        const followerKey = platform === 'youtube' ? 'subscribers' : 'followers';
        const followerValue = data[followerKey]?.current || 0;
        const followerGrowth = data[followerKey]?.growth || 0;
        
        const platformMetrics = [
          { name: platform === 'youtube' ? 'Subscribers' : 'Followers', value: followerValue.toLocaleString(), growth: `+${followerGrowth}%` },
          { name: 'Likes', value: (data.likes?.current || 0).toLocaleString(), growth: `+${data.likes?.growth || 0}%` },
          { name: 'Comments', value: (data.comments?.current || 0).toLocaleString(), growth: `+${data.comments?.growth || 0}%` },
          { name: platform === 'youtube' ? 'Views' : platform === 'linkedin' ? 'Impressions' : 'Shares', 
            value: (platform === 'youtube' ? data.views?.current : platform === 'linkedin' ? data.impressions?.current : data.shares?.current || 0).toLocaleString(), 
            growth: `+${platform === 'youtube' ? data.views?.growth : platform === 'linkedin' ? data.impressions?.growth : data.shares?.growth || 0}%` },
          { name: 'Engagement Rate', value: `${data.engagement_rate?.current || 0}%`, growth: `+${data.engagement_rate?.growth || 0}%` }
        ];

        // Table headers
        pdf.setFillColor(243, 244, 246);
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('Metric', margin + 3, yPosition + 4);
        pdf.text('Current Value', margin + 50, yPosition + 4);
        pdf.text('Growth', margin + 100, yPosition + 4);
        yPosition += 8;

        pdf.setFont('helvetica', 'normal');
        platformMetrics.forEach(metric => {
          pdf.text(metric.name, margin + 3, yPosition + 4);
          pdf.text(metric.value, margin + 50, yPosition + 4);
          pdf.setTextColor(34, 197, 94);
          pdf.text(metric.growth, margin + 100, yPosition + 4);
          pdf.setTextColor(55, 65, 81);
          yPosition += 6;
        });
        
        yPosition += 8;
      });

      // ========== ROI ANALYSIS SUMMARY ==========
      checkPageBreak(60);
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('ROI Analysis Summary', margin, yPosition);
      yPosition += 12;

      // Summary boxes
      const summaryBoxWidth = (pageWidth - 2 * margin - 10) / 3;
      const summaryBoxHeight = 40;
      
      const summaryMetrics = [
        { label: 'Overall Growth', value: `+${getOverallROI()}%`, subtext: 'Follower increase', bgColor: [220, 252, 231], textColor: [22, 163, 74] },
        { label: 'Avg Engagement', value: `${getAverageEngagementRate()}%`, subtext: 'Across platforms', bgColor: [219, 234, 254], textColor: [37, 99, 235] },
        { label: 'Total Interactions', value: getTotalEngagement().toLocaleString(), subtext: 'Current period', bgColor: [243, 232, 255], textColor: [147, 51, 234] }
      ];

      summaryMetrics.forEach((metric, index) => {
        const xPos = margin + (index * (summaryBoxWidth + 5));
        
        pdf.setFillColor(metric.bgColor[0], metric.bgColor[1], metric.bgColor[2]);
        pdf.roundedRect(xPos, yPosition, summaryBoxWidth, summaryBoxHeight, 3, 3, 'F');
        
        pdf.setTextColor(metric.textColor[0], metric.textColor[1], metric.textColor[2]);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        const valueWidth = pdf.getTextWidth(metric.value);
        pdf.text(metric.value, xPos + (summaryBoxWidth - valueWidth) / 2, yPosition + 15);
        
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        const labelWidth = pdf.getTextWidth(metric.label);
        pdf.text(metric.label, xPos + (summaryBoxWidth - labelWidth) / 2, yPosition + 26);
        
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        const subtextWidth = pdf.getTextWidth(metric.subtext);
        pdf.text(metric.subtext, xPos + (summaryBoxWidth - subtextWidth) / 2, yPosition + 34);
      });
      
      yPosition += summaryBoxHeight + 15;

      // ========== FOOTER ==========
      checkPageBreak(20);
      pdf.setDrawColor(229, 231, 235);
      pdf.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 8;

      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'italic');
      pdf.text('This report was automatically generated by the ROI Analytics Dashboard.', margin, yPosition);
      yPosition += 5;
      pdf.text(`Report generated on ${reportDate}. Data may vary based on platform API availability.`, margin, yPosition);

      // Add page numbers
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
      }

      // Save the PDF
      const fileName = `ROI_Analytics_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const platformColors = {
    facebook: '#1877F2',
    instagram: '#E4405F',
    youtube: '#FF0000',
    linkedin: '#0077B5'
  };

  const getAccountNames = () => {
    // If we have preliminary data from connected accounts, use real account names
    if (analyticsData && analyticsData.isPreliminary) {
      // This will be populated when we fetch the social links
      return analyticsData.accountNames || {
        facebook: 'Aureum Solutions',
        instagram: 'aureum.solutions.in',
        youtube: 'AirsparkOfficial',
        linkedin: 'airspark-inc'
      };
    }
    
    // No account names if no analytics data
    return {};
  };

  const calculateROI = (platform, metric) => {
    if (!dashboardData || !dashboardData[platform] || !dashboardData[platform][metric]) return 0;
    const data = dashboardData[platform][metric];
    return data.previous > 0 ? ((data.current - data.previous) / data.previous * 100).toFixed(1) : 0;
  };

  const getTotalFollowers = () => {
    if (!filteredDashboardData) return 0;
    // If filtering by platform, don't use summary data
    if (selectedPlatform !== 'all') {
      return Object.keys(filteredDashboardData).reduce((total, platform) => {
        const followerKey = platform === 'youtube' ? 'subscribers' : 'followers';
        return total + (filteredDashboardData[platform]?.[followerKey]?.current || 0);
      }, 0);
    }
    if (analyticsData?.summary?.totalFollowers) {
      return analyticsData.summary.totalFollowers;
    }
    return Object.keys(filteredDashboardData).reduce((total, platform) => {
      const followerKey = platform === 'youtube' ? 'subscribers' : 'followers';
      return total + (filteredDashboardData[platform]?.[followerKey]?.current || 0);
    }, 0);
  };

  const getTotalEngagement = () => {
    if (!filteredDashboardData) return 0;
    // If filtering by platform, don't use summary data
    if (selectedPlatform !== 'all') {
      return Object.keys(filteredDashboardData).reduce((total, platform) => {
        const data = filteredDashboardData[platform];
        const likes = data?.likes?.current || 0;
        const comments = data?.comments?.current || 0;
        const shares = data?.shares?.current || 0;
        return total + likes + comments + shares;
      }, 0);
    }
    if (analyticsData?.summary?.totalEngagement) {
      return analyticsData.summary.totalEngagement;
    }
    return Object.keys(filteredDashboardData).reduce((total, platform) => {
      const data = filteredDashboardData[platform];
      const likes = data?.likes?.current || 0;
      const comments = data?.comments?.current || 0;
      const shares = data?.shares?.current || 0;
      return total + likes + comments + shares;
    }, 0);
  };

  const getAverageEngagementRate = () => {
    if (!filteredDashboardData) return 0;
    // If filtering by platform, don't use summary data
    if (selectedPlatform !== 'all') {
      const rates = Object.keys(filteredDashboardData).map(platform => 
        filteredDashboardData[platform]?.engagement_rate?.current || 0
      ).filter(rate => rate > 0);
      return rates.length > 0 ? (rates.reduce((sum, rate) => sum + rate, 0) / rates.length).toFixed(1) : 0;
    }
    if (analyticsData?.summary?.averageEngagementRate) {
      return analyticsData.summary.averageEngagementRate.toFixed(1);
    }
    const rates = Object.keys(filteredDashboardData).map(platform => 
      filteredDashboardData[platform]?.engagement_rate?.current || 0
    ).filter(rate => rate > 0);
    return rates.length > 0 ? (rates.reduce((sum, rate) => sum + rate, 0) / rates.length).toFixed(1) : 0;
  };

  const getOverallROI = () => {
    if (!filteredDashboardData) return 0;
    // If filtering by platform, calculate ROI for that platform only
    if (selectedPlatform !== 'all') {
      const totalCurrent = getTotalFollowers();
      const totalPrevious = Object.keys(filteredDashboardData).reduce((total, platform) => {
        const followerKey = platform === 'youtube' ? 'subscribers' : 'followers';
        return total + (filteredDashboardData[platform]?.[followerKey]?.previous || 0);
      }, 0);
      return totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious * 100).toFixed(1) : 0;
    }
    if (analyticsData?.summary?.overallGrowth) {
      return Math.abs(analyticsData.summary.overallGrowth).toFixed(1);
    }
    const totalCurrent = getTotalFollowers();
    const totalPrevious = Object.keys(filteredDashboardData).reduce((total, platform) => {
      const followerKey = platform === 'youtube' ? 'subscribers' : 'followers';
      return total + (filteredDashboardData[platform]?.[followerKey]?.previous || 0);
    }, 0);
    return totalPrevious > 0 ? ((totalCurrent - totalPrevious) / totalPrevious * 100).toFixed(1) : 0;
  };

  // Chart configurations
  const followerGrowthChart = {
    labels: timeframe === 'last_7_days' 
      ? ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7']
      : timeframe === 'last_30_days'
      ? ['Week 1', 'Week 2', 'Week 3', 'Week 4']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: filteredDashboardData ? Object.keys(filteredDashboardData).map(platform => {
      let monthlyData = filteredDashboardData[platform].monthlyData;
      // If monthlyData is missing or flat, generate synthetic growth
      const dataPoints = timeframe === 'last_7_days' ? 7 : timeframe === 'last_30_days' ? 4 : 12;
      if (!monthlyData || monthlyData.length < dataPoints || monthlyData.every(v => v === monthlyData[0])) {
        const followerKey = platform === 'youtube' ? 'subscribers' : 'followers';
        const current = filteredDashboardData[platform][followerKey]?.current || 0;
        const previous = filteredDashboardData[platform][followerKey]?.previous || 0;
        // Linear interpolation from previous to current
        monthlyData = Array.from({ length: dataPoints }, (_, i) =>
          Math.round(previous + ((current - previous) * (i + 1) / dataPoints))
        );
      }
      return {
        label: platform.charAt(0).toUpperCase() + platform.slice(1),
        data: monthlyData.slice(0, dataPoints),
        borderColor: platformColors[platform],
        backgroundColor: platformColors[platform] + '20',
        fill: true,
        tension: 0.4
      };
    }) : []
  };

  const engagementChart = {
    labels: ['Likes', 'Comments', 'Shares/Views/Impressions'],
    datasets: filteredDashboardData ? Object.keys(filteredDashboardData).map(platform => ({
      label: platform.charAt(0).toUpperCase() + platform.slice(1),
      data: [
        filteredDashboardData[platform].likes?.current || 0,
        filteredDashboardData[platform].comments?.current || 0,
        platform === 'youtube' ? filteredDashboardData[platform].views?.current || 0 : 
        platform === 'linkedin' ? filteredDashboardData[platform].impressions?.current || 0 :
        filteredDashboardData[platform].shares?.current || 0
      ],
      backgroundColor: platformColors[platform],
      borderColor: platformColors[platform],
      borderWidth: 1
    })) : []
  };

  const platformDistribution = {
    labels: filteredDashboardData ? Object.keys(filteredDashboardData).map(p => p.charAt(0).toUpperCase() + p.slice(1)) : [],
    datasets: [{
      data: filteredDashboardData ? Object.keys(filteredDashboardData).map(platform => {
        const followerKey = platform === 'youtube' ? 'subscribers' : 'followers';
        return filteredDashboardData[platform]?.[followerKey]?.current || 0;
      }) : [],
      backgroundColor: filteredDashboardData ? Object.keys(filteredDashboardData).map(platform => platformColors[platform]) : [],
      borderWidth: 2
    }]
  };

  const growthComparisonChart = {
    labels: ['Followers', 'Likes', 'Comments', 'Engagement Rate'],
    datasets: filteredDashboardData ? Object.keys(filteredDashboardData).filter(platform => filteredDashboardData[platform]).map(platform => ({
      label: platform.charAt(0).toUpperCase() + platform.slice(1),
      data: [
        filteredDashboardData[platform]?.[platform === 'youtube' ? 'subscribers' : 'followers']?.growth || 0,
        filteredDashboardData[platform]?.likes?.growth || 0,
        filteredDashboardData[platform]?.comments?.growth || 0,
        filteredDashboardData[platform]?.engagement_rate?.growth || 0
      ],
      backgroundColor: platformColors[platform] + '80',
      borderColor: platformColors[platform],
      borderWidth: 2
    })) : []
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#f0f0f0'
        }
      },
      x: {
        grid: {
          color: '#f0f0f0'
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ROI Analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 text-5xl mb-4">📊</div>
          <p className="text-gray-600 text-lg mb-2">No analytics data available.</p>
          <p className="text-gray-500">Connect your social accounts to see your ROI dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-3 sm:p-6">
      <div className="px-2 sm:px-6 lg:px-12 xl:px-16 2xl:px-24" ref={dashboardRef}>
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-4">
                    <button
                      onClick={() => navigate('/customer')}
                      className="group flex items-center gap-1 sm:gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-white/30 transition-all text-sm sm:text-base"
                    >
                      <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="font-medium hidden sm:inline">Back to Dashboard</span>
                      <span className="font-medium sm:hidden">Back</span>
                    </button>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-3 flex items-center gap-2 sm:gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                      <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7" />
                    </div>
                    <span className="leading-tight">ROI Analytics Dashboard</span>
                  </h1>
                  <p className="text-blue-50 text-sm sm:text-base lg:text-lg">Comprehensive social media performance and return on investment analysis</p>
                </div>
                <div className="flex flex-col sm:items-end gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={generatePDFReport}
                      disabled={isGeneratingPDF}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 disabled:opacity-50 transition-all font-medium text-sm sm:text-base"
                    >
                      {isGeneratingPDF ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="hidden sm:inline">Generating...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          <span className="hidden sm:inline">Download PDF</span>
                          <span className="sm:hidden">PDF</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/20 backdrop-blur-sm text-white rounded-lg hover:bg-white/30 disabled:opacity-50 transition-all font-medium text-sm sm:text-base"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                    </button>
                    <div className={`inline-flex items-center px-2.5 py-1 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold backdrop-blur-sm ${
                      analyticsData && !analyticsData.isPreliminary ? 'bg-emerald-500/90 text-white' : 
                      analyticsData && analyticsData.isPreliminary ? 'bg-blue-500/90 text-white' :
                      'bg-amber-500/90 text-white'
                    }`}>
                      {analyticsData && !analyticsData.isPreliminary ? '✓ Live Data' : 
                       analyticsData && analyticsData.isPreliminary ? '🔗 Connected' :
                       '⚠ Demo'}
                    </div>
                  </div>
                  {lastUpdated && (
                    <div className="text-xs sm:text-sm text-blue-100">
                      Last updated: {new Date(lastUpdated).toLocaleDateString()}
                    </div>
                  )}
                  {!analyticsData && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 w-full sm:w-auto">
                      <p className="text-xs sm:text-sm text-blue-100 mb-1">Connect social accounts to see live data</p>
                      <button
                        onClick={() => navigate('/customer/settings')}
                        className="text-xs sm:text-sm text-white font-semibold inline-flex items-center gap-1 hover:gap-2 transition-all"
                      >
                        Connect Accounts <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  )}
                  {analyticsData && analyticsData.isPreliminary && (
                    <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2.5 sm:p-3 w-full sm:w-auto">
                      <p className="text-xs sm:text-sm text-blue-100 mb-1">Preliminary data from connected accounts</p>
                      <p className="text-xs sm:text-sm text-blue-200">Analytics processing will provide detailed insights</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Accounts Summary */}
        {analyticsData && connectedAccounts.length > 0 && (
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-slate-200 p-4 sm:p-6 mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-3">
              <h2 className="text-lg sm:text-2xl font-bold text-slate-800 flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                Connected Accounts
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs sm:text-sm text-slate-600 bg-slate-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-medium">
                  {connectedAccounts.length} Account{connectedAccounts.length !== 1 ? 's' : ''} • {platforms.length} Platform{platforms.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            
            {/* Account Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {connectedAccounts.map((account) => (
                <div 
                  key={account.id} 
                  className={`relative flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md ${
                    selectedAccount === account.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                  }`}
                  onClick={() => {
                    setSelectedPlatform(account.platform);
                    setSelectedAccount(account.id);
                  }}
                >
                  {/* Platform indicator bar */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
                    style={{ backgroundColor: platformColors[account.platform] || '#6B7280' }}
                  ></div>
                  
                  {/* Account Avatar */}
                  <div className="flex-shrink-0 mt-1">
                    {account.profilePicture ? (
                      <img 
                        src={account.profilePicture} 
                        alt={account.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white shadow-sm"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${account.profilePicture ? 'hidden' : ''}`}
                      style={{ backgroundColor: platformColors[account.platform] || '#6B7280' }}
                    >
                      {account.platform === 'facebook' && '📘'}
                      {account.platform === 'instagram' && '📸'}
                      {account.platform === 'youtube' && '🎬'}
                      {account.platform === 'linkedin' && '💼'}
                    </div>
                  </div>
                  
                  {/* Account Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-sm sm:text-base truncate" title={account.name}>
                      {account.name}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: platformColors[account.platform] || '#6B7280' }}
                      ></span>
                      <span className="text-xs sm:text-sm text-gray-600 capitalize">{account.platform}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 capitalize">{account.type}</span>
                    </div>
                    {/* Additional info for YouTube channels */}
                    {account.platform === 'youtube' && account.subscriberCount && (
                      <div className="text-xs text-gray-500 mt-1">
                        {parseInt(account.subscriberCount).toLocaleString()} subscribers
                      </div>
                    )}
                    {/* Show linked Instagram for Facebook pages */}
                    {account.hasInstagram && (
                      <div className="text-xs text-pink-600 mt-1 flex items-center gap-1">
                        <span>📸</span> Instagram linked
                      </div>
                    )}
                    {/* Show linked Facebook for Instagram */}
                    {account.linkedFacebookPage && (
                      <div className="text-xs text-blue-600 mt-1 flex items-center gap-1 truncate" title={`Via ${account.linkedFacebookPage}`}>
                        <span>📘</span> Via {account.linkedFacebookPage}
                      </div>
                    )}
                  </div>
                  
                  {/* Selection indicator */}
                  {selectedAccount === account.id && (
                    <div className="absolute top-2 right-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            {analyticsData.insights && analyticsData.insights.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Latest Insights</h3>
                <div className="space-y-2">
                  {analyticsData.insights.slice(0, 2).map((insight, index) => (
                    <div key={index} className={`text-sm p-2 rounded ${
                      insight.type === 'positive' ? 'bg-green-50 text-green-700' :
                      insight.type === 'warning' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      <span className="font-medium">{insight.title}:</span> {insight.description}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Job Manager */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <div className="text-center py-4 sm:py-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Post-Level Analytics Available</h3>
              <p className="text-sm sm:text-base text-gray-600 mb-4 px-2">View detailed analytics for individual posts by visiting the respective platform integration pages.</p>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:justify-center gap-2 sm:gap-4">
                <button
                  onClick={() => navigate('/customer/integration/facebook')}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium"
                >
                  <span>📘</span>
                  <span className="hidden sm:inline">Facebook Analytics</span>
                  <span className="sm:hidden">Facebook</span>
                </button>
                <button
                  onClick={() => navigate('/customer/integration/instagram')}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 text-xs sm:text-sm font-medium"
                >
                  <span>📸</span>
                  <span className="hidden sm:inline">Instagram Analytics</span>
                  <span className="sm:hidden">Instagram</span>
                </button>
                <button
                  onClick={() => navigate('/customer/integration/youtube')}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-xs sm:text-sm font-medium"
                >
                  <span>🎬</span>
                  <span className="hidden sm:inline">YouTube Analytics</span>
                  <span className="sm:hidden">YouTube</span>
                </button>
                <button
                  onClick={() => navigate('/customer/integration/linkedin')}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 text-xs sm:text-sm font-medium"
                >
                  <span>💼</span>
                  <span className="hidden sm:inline">LinkedIn Analytics</span>
                  <span className="sm:hidden">LinkedIn</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6 sm:items-end">
            <div className="flex-1 sm:flex-none min-w-[140px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="last_7_days">Last 7 Days</option>
                <option value="last_30_days">Last 30 Days</option>
                <option value="last_90_days">Last 90 Days</option>
              </select>
            </div>
            <div className="flex-1 sm:flex-none min-w-[140px]">
              <label className="block text-sm font-medium text-gray-700 mb-2">Platform Filter</label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="all">All Platforms</option>
                {platforms.includes('facebook') && <option value="facebook">Facebook</option>}
                {platforms.includes('instagram') && <option value="instagram">Instagram</option>}
                {platforms.includes('youtube') && <option value="youtube">YouTube</option>}
                {platforms.includes('linkedin') && <option value="linkedin">LinkedIn</option>}
              </select>
            </div>
            {/* Account Selector - shows when there are multiple accounts */}
            {getFilteredAccounts.length > 0 && (
              <div className="flex-1 sm:flex-none min-w-[200px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account
                  {getFilteredAccounts.length > 1 && (
                    <span className="ml-1 text-xs text-gray-500">({getFilteredAccounts.length} accounts)</span>
                  )}
                </label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Accounts</option>
                  {getFilteredAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.platform})
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* Active filter indicator */}
            {(selectedPlatform !== 'all' || selectedAccount !== 'all') && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedPlatform('all');
                    setSelectedAccount('all');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear Filters
                </button>
              </div>
            )}
          </div>
          {/* Filter summary */}
          {(selectedPlatform !== 'all' || selectedAccount !== 'all') && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-500">Showing:</span>
                {selectedAccount !== 'all' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: platformColors[connectedAccounts.find(a => a.id === selectedAccount)?.platform] || '#6B7280' }}
                    ></span>
                    {connectedAccounts.find(a => a.id === selectedAccount)?.name}
                  </span>
                ) : selectedPlatform !== 'all' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium capitalize">
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: platformColors[selectedPlatform] || '#6B7280' }}
                    ></span>
                    {selectedPlatform}
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg sm:rounded-xl w-fit mb-2 sm:mb-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Followers</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{getTotalFollowers().toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-green-600 mt-0.5 sm:mt-1 hidden sm:block">
                  {selectedAccount !== 'all' 
                    ? connectedAccounts.find(a => a.id === selectedAccount)?.name 
                    : selectedPlatform !== 'all' 
                      ? `${selectedPlatform.charAt(0).toUpperCase() + selectedPlatform.slice(1)} only`
                      : 'Across all platforms'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg sm:rounded-xl w-fit mb-2 sm:mb-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Total Engagement</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{getTotalEngagement().toLocaleString()}</p>
                <p className="text-xs sm:text-sm text-green-600 mt-0.5 sm:mt-1 hidden sm:block">Likes + Comments + Shares</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg sm:rounded-xl w-fit mb-2 sm:mb-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Avg. Engagement Rate</p>
                <p className="text-lg sm:text-2xl font-bold text-gray-900">{getAverageEngagementRate()}%</p>
                <p className="text-xs sm:text-sm text-green-600 mt-0.5 sm:mt-1 hidden sm:block">Platform average</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center">
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-lg sm:rounded-xl w-fit mb-2 sm:mb-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="sm:ml-4">
                <p className="text-xs sm:text-sm font-medium text-gray-600">Overall ROI</p>
                <p className="text-lg sm:text-2xl font-bold text-green-600">+{getOverallROI()}%</p>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">
                  {timeframe === 'last_7_days' ? 'Last 7 days' : timeframe === 'last_30_days' ? 'Last 30 days' : 'Last 90 days'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Follower Growth Over Time</h3>
              <div className="text-xs sm:text-sm text-gray-500">
                {timeframe === 'last_7_days' ? 'Last 7 Days' : timeframe === 'last_30_days' ? 'Last 30 Days' : 'Last 12 Months'}
              </div>
            </div>
            <div className="h-60 sm:h-80">
              <Line data={followerGrowthChart} options={chartOptions} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Platform Distribution</h3>
              <div className="text-xs sm:text-sm text-gray-500">Current Followers</div>
            </div>
            <div className="h-60 sm:h-80">
              <Doughnut 
                data={platformDistribution} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 20
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Engagement Comparison</h3>
              <div className="text-xs sm:text-sm text-gray-500">Current Period</div>
            </div>
            <div className="h-60 sm:h-80">
              <Bar data={engagementChart} options={chartOptions} />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 gap-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Growth Rate Comparison</h3>
              <div className="text-xs sm:text-sm text-gray-500">% Growth</div>
            </div>
            <div className="h-60 sm:h-80">
              <Bar data={growthComparisonChart} options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  y: {
                    ...chartOptions.scales.y,
                    ticks: {
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  }
                }
              }} />
            </div>
          </div>
        </div>

        {/* Platform Details */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Platform Performance Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
            {dashboardData && Object.keys(dashboardData)
              .filter(platform => {
                // Show platform if it has connected accounts OR has at least one real metric
                const hasConnectedAccounts = analyticsData && analyticsData.platforms && analyticsData.platforms.includes(platform);
                const data = dashboardData[platform];
                
                if (hasConnectedAccounts) return true; // Show connected platforms even with 0 metrics
                
                if (!data) return false;
                return (
                  (data.followers && data.followers.current > 0) ||
                  (data.subscribers && data.subscribers.current > 0) ||
                  (data.likes && data.likes.current > 0) ||
                  (data.comments && data.comments.current > 0) ||
                  (data.shares && data.shares.current > 0) ||
                  (data.views && data.views.current > 0) ||
                  (data.impressions && data.impressions.current > 0) ||
                  (data.engagement_rate && data.engagement_rate.current > 0)
                );
              })
              .map(platform => (
                <div key={platform} className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <div>
                      <h3 className="text-base sm:text-lg font-semibold capitalize" style={{ color: platformColors[platform] }}>
                        {platform}
                      </h3>
                      {getAccountNames()[platform] && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1">
                          @{getAccountNames()[platform]}
                        </p>
                      )}
                    </div>
                    <div 
                      className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: platformColors[platform] }}
                    >
                      {analyticsData ? 'Connected' : 'Demo'}
                    </div>
                  </div>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600 font-medium">
                        {platform === 'youtube' ? 'Subscribers' : 'Followers'}
                      </span>
                      <div className="text-right">
                        <div className="font-bold text-sm sm:text-lg">
                          {(dashboardData[platform]?.[platform === 'youtube' ? 'subscribers' : 'followers']?.current || 0).toLocaleString()}
                        </div>
                        <div className="text-xs sm:text-sm text-green-600 font-medium">
                          +{dashboardData[platform]?.[platform === 'youtube' ? 'subscribers' : 'followers']?.growth || 0}%
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600">Likes</span>
                      <div className="text-right">
                        <div className="font-semibold text-sm sm:text-base">
                          {(dashboardData[platform]?.likes?.current || 0).toLocaleString()}
                        </div>
                        <div className="text-xs sm:text-sm text-green-600">
                          +{dashboardData[platform]?.likes?.growth || 0}%
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600">Comments</span>
                      <div className="text-right">
                        <div className="font-semibold text-sm sm:text-base">
                          {(dashboardData[platform]?.comments?.current || 0).toLocaleString()}
                        </div>
                        <div className="text-xs sm:text-sm text-green-600">
                          +{dashboardData[platform]?.comments?.growth || 0}%
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-gray-600">
                        {platform === 'youtube' ? 'Views' : 
                         platform === 'linkedin' ? 'Impressions' : 'Shares'}
                      </span>
                      <div className="text-right">
                        <div className="font-semibold text-sm sm:text-base">
                          {platform === 'youtube' 
                            ? (dashboardData[platform]?.views?.current || 0).toLocaleString()
                            : platform === 'linkedin'
                            ? (dashboardData[platform]?.impressions?.current || 0).toLocaleString()
                            : (dashboardData[platform]?.shares?.current || 0).toLocaleString()
                          }
                        </div>
                        <div className="text-xs sm:text-sm text-green-600">
                          +{platform === 'youtube' 
                            ? (dashboardData[platform]?.views?.growth || 0)
                            : platform === 'linkedin'
                            ? (dashboardData[platform]?.impressions?.growth || 0)
                            : (dashboardData[platform]?.shares?.growth || 0)
                          }%
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 sm:pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm text-gray-600 font-medium">Engagement Rate</span>
                        <div className="text-right">
                          <div className="font-bold text-sm sm:text-lg" style={{ color: platformColors[platform] }}>
                            {dashboardData[platform]?.engagement_rate?.current || 0}%
                          </div>
                          <div className="text-xs sm:text-sm text-green-600 font-medium">
                            +{dashboardData[platform]?.engagement_rate?.growth || 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 sm:pt-4">
                      <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
                        <div 
                          className="h-1.5 sm:h-2 rounded-full transition-all duration-500"
                          style={{ 
                            width: `${Math.min((dashboardData[platform]?.engagement_rate?.current || 0) * 10, 100)}%`,
                            backgroundColor: platformColors[platform]
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* ROI Analysis Section */}
        <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">ROI Analysis Summary</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="text-center p-4 sm:p-6 bg-green-50 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-green-600 mb-1 sm:mb-2">
                +{getOverallROI()}%
              </div>
              <div className="text-base sm:text-lg font-semibold text-gray-800">Overall Growth</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Follower increase</div>
            </div>
            
            <div className="text-center p-4 sm:p-6 bg-blue-50 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-blue-600 mb-1 sm:mb-2">
                {getAverageEngagementRate()}%
              </div>
              <div className="text-base sm:text-lg font-semibold text-gray-800">Avg Engagement</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Across platforms</div>
            </div>
            
            <div className="text-center p-4 sm:p-6 bg-purple-50 rounded-lg">
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 mb-1 sm:mb-2">
                {getTotalEngagement().toLocaleString()}
              </div>
              <div className="text-base sm:text-lg font-semibold text-gray-800">Total Interactions</div>
              <div className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">Current period</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROIDashboard;