import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, BarChart3, PieChart as PieChartIcon, RefreshCw } from 'lucide-react';
import { 
  AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const TIME_PERIOD_OPTIONS = [
  { value: 7, label: 'Last 7 days' },
  { value: 15, label: 'Last 15 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 2 months' },
  { value: 90, label: 'Last 3 months' },
  { value: 180, label: 'Last 6 months' },
  { value: 365, label: 'Last 1 year' }
];

const CHART_TYPE_OPTIONS = [
  { value: 'trend', label: 'Trend Chart', icon: TrendingUp },
  { value: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { value: 'pie', label: 'Pie Chart', icon: PieChartIcon }
];

const METRICS_OPTIONS = [
  { value: 'followers', label: 'Followers', color: '#3B82F6' },
  { value: 'likes', label: 'Likes', color: '#10B981' },
  { value: 'comments', label: 'Comments', color: '#8B5CF6' },
  { value: 'shares', label: 'Shares', color: '#F59E0B' },
  { value: 'engagement', label: 'Total Engagement', color: '#EF4444' },
  { value: 'views', label: 'Views', color: '#06B6D4' },
  { value: 'reach', label: 'Reach', color: '#84CC16' },
  { value: 'impressions', label: 'Impressions', color: '#F97316' }
];

export function TimePeriodChart({ platform, accountId, title, defaultMetric = 'followers' }) {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedChart, setSelectedChart] = useState('trend');
  const [selectedMetrics, setSelectedMetrics] = useState([defaultMetric]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch historical data when parameters change
  useEffect(() => {
    if (platform && accountId) {
      fetchHistoricalData();
    }
  }, [platform, accountId, selectedPeriod]);

  const fetchHistoricalData = async () => {
    setLoading(true);
    setError(null);
    
    try {
     const response = await fetch(
  `${process.env.REACT_APP_API_URL}/api/analytics-data/chart?platform=${platform}&accountId=${accountId}&timePeriod=${selectedPeriod}`
);
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`✅ Loaded historical data for ${platform}:${accountId}`, {
          period: selectedPeriod,
          snapshots: result.snapshotsCount,
          dataKeys: Object.keys(result.data || {}),
          likesData: result.data?.likes,
          sampleSnapshot: result.data?.likes?.[0],
          debugInfo: result.debug
        });
        
        // Additional validation
        if (result.data?.likes) {
          const likesWithValues = result.data.likes.filter(d => d.value > 0);
          console.log(`📊 Likes analysis:`, {
            totalDataPoints: result.data.likes.length,
            pointsWithValues: likesWithValues.length,
            values: likesWithValues.map(d => ({ date: d.date, value: d.value }))
          });
        }
        
        setChartData(result.data);
        setLastUpdated(new Date().toISOString());
      } else {
        setError(result.error || 'Failed to fetch historical data');
      }
    } catch (err) {
      console.error('Error fetching historical data:', err);
      setError('Failed to fetch historical data');
    } finally {
      setLoading(false);
    }
  };

  const captureNewSnapshot = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/historical-data/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          accountId,
          pageId: accountId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success message with details
        alert(`✅ ${result.message}\n${result.note || ''}`);
        
        // Refresh the chart data after a short delay
        setTimeout(() => {
          fetchHistoricalData();
        }, 1000);
      } else {
        alert(`❌ Failed to capture snapshot: ${result.error}`);
      }
    } catch (err) {
      console.error('Error capturing snapshot:', err);
      alert('❌ Failed to capture snapshot: Network error');
    } finally {
      setLoading(false);
    }
  };

  const renderChart = () => {
    if (!chartData) return null;

    const renderTrendChart = (metric) => {
      const data = chartData[metric] || [];
      const metricInfo = METRICS_OPTIONS.find(m => m.value === metric);
      
      if (data.length === 0) return null;

      // Calculate statistics for better display
      const values = data.map(d => d.value || 0);
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
      const nonZeroCount = values.filter(v => v > 0).length;

      console.log(`📊 [Chart Render] ${metricInfo?.label || metric}:`, {
        dataPoints: data.length,
        currentValue: data[data.length - 1]?.value,
        maxValue,
        minValue,
        avgValue,
        nonZeroCount,
        sampleData: data.slice(-3)
      });

      return (
        <div key={metric} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {metricInfo?.label || metric}
              </h4>
              <p className="text-sm text-gray-600">
                Last {selectedPeriod} days • {nonZeroCount} data points
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: metricInfo?.color }}>
                {data[data.length - 1]?.value?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-500">Current</div>
              {maxValue > 0 && (
                <div className="text-xs text-gray-400 mt-1">
                  Peak: {maxValue.toLocaleString()}
                </div>
              )}
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={metricInfo?.color} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={metricInfo?.color} stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [value?.toLocaleString(), metricInfo?.label]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={metricInfo?.color}
                  strokeWidth={2}
                  fill={`url(#gradient-${metric})`}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    };

    const renderBarChart = (metric) => {
      const data = chartData[metric] || [];
      const metricInfo = METRICS_OPTIONS.find(m => m.value === metric);
      
      if (data.length === 0) return null;

      // Always show latest value (actual value) for all metrics
      
      // Determine how many bars to show based on selected period
      let barsToShow;
      if (selectedPeriod <= 7) barsToShow = selectedPeriod;
      else if (selectedPeriod <= 30) barsToShow = Math.min(14, data.length);
      else if (selectedPeriod <= 90) barsToShow = Math.min(30, data.length);
      else barsToShow = Math.min(60, data.length); // For longer periods, show max 60 bars
      
      const barData = data.slice(-barsToShow);
      
      // Calculate display value - always use the latest value
      const displayValue = barData[barData.length - 1]?.value || 0;

      return (
        <div key={metric} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {metricInfo?.label || metric}
              </h4>
              <p className="text-sm text-gray-600">Last {barsToShow} {barsToShow === 1 ? 'day' : 'days'}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: metricInfo?.color }}>
                {displayValue.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Actual</div>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  formatter={(value) => [value?.toLocaleString(), metricInfo?.label]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Bar 
                  dataKey="value" 
                  fill={metricInfo?.color}
                  radius={[4, 4, 0, 0]}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    };

    const renderPieChart = () => {
      // Always use latest value (actual value) for all metrics
      
      // Create pie chart from values of selected metrics
      const pieData = selectedMetrics.map(metric => {
        const data = chartData[metric] || [];
        
        // Always use latest value for all metrics
        const value = data[data.length - 1]?.value || 0;
        
        const metricInfo = METRICS_OPTIONS.find(m => m.value === metric);
        
        return {
          name: metricInfo?.label || metric,
          value: value,
          color: metricInfo?.color || '#6B7280'
        };
      }).filter(item => item.value > 0);

      if (pieData.length === 0) return null;
      
      const subtitle = 'Current values & period totals';

      return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Metrics Distribution</h4>
              <p className="text-sm text-gray-600">{subtitle}</p>
            </div>
          </div>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [value.toLocaleString(), name]}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                ></div>
                <div className="text-xs text-gray-600">
                  <span className="font-medium">{entry.name}:</span> {entry.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    if (selectedChart === 'pie') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {renderPieChart()}
          
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Summary Statistics</h4>
            <div className="space-y-4">
              {selectedMetrics.map(metric => {
                const data = chartData[metric] || [];
                
                // Always use latest value (actual value) for all metrics
                const latest = data[data.length - 1]?.value || 0;
                const metricInfo = METRICS_OPTIONS.find(m => m.value === metric);
                
                return (
                  <div key={metric} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">{metricInfo?.label}</span>
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: metricInfo?.color }}
                      ></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <div className="text-gray-500">Latest</div>
                        <div className="font-semibold">{latest.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Actual</div>
                        <div className="font-semibold">{latest.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {selectedMetrics.map(metric => 
          selectedChart === 'trend' ? renderTrendChart(metric) : renderBarChart(metric)
        )}
      </div>
    );
  };

  const debugStoredAccounts = async () => {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/historical-data/debug-accounts`);
      const result = await response.json();
      
      if (result.success) {
        console.log('=== STORED SOCIAL ACCOUNTS DEBUG ===');
        console.log(`Total accounts: ${result.totalAccounts}`);
        console.log(`Facebook accounts: ${result.facebookAccounts.length}`);
        
        result.facebookAccounts.forEach(account => {
          console.log(`\n📱 Facebook Account: ${account.name}`);
          console.log(`  - Platform User ID: ${account.platformUserId}`);
          console.log(`  - Has User Token: ${account.hasAccessToken} (${account.accessTokenLength} chars)`);
          console.log(`  - Pages: ${account.pagesCount}`);
          
          account.pages.forEach(page => {
            console.log(`    📄 Page: ${page.name} (ID: ${page.id})`);
            console.log(`       - Has Token: ${page.hasAccessToken} (${page.accessTokenLength} chars)`);
          });
        });
        
        console.log(`\n🎯 Looking for page ID: ${accountId}`);
        const matchingAccounts = result.facebookAccounts.filter(account =>
          account.pages.some(page => page.id === accountId)
        );
        
        if (matchingAccounts.length > 0) {
          console.log(`✅ Found ${matchingAccounts.length} account(s) with this page!`);
          matchingAccounts.forEach(account => {
            const matchingPage = account.pages.find(page => page.id === accountId);
            console.log(`  - Account: ${account.name}`);
            console.log(`  - Page: ${matchingPage.name}`);
            console.log(`  - Has Page Token: ${matchingPage.hasAccessToken}`);
          });
        } else {
          console.log(`❌ No accounts found with page ID: ${accountId}`);
        }
        
        alert(`Debug info logged to console. Found ${result.facebookAccounts.length} Facebook accounts with ${result.facebookAccounts.reduce((sum, acc) => sum + acc.pagesCount, 0)} total pages.`);
      } else {
        alert(`Debug failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Debug error:', error);
      alert('Debug failed: Network error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">
                Historical analytics with {selectedPeriod} days of data
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={captureNewSnapshot}
              className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2 text-sm"
              title="Capture current data snapshot"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Capture Now</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Time Period Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {TIME_PERIOD_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Chart Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chart Type
            </label>
            <select
              value={selectedChart}
              onChange={(e) => setSelectedChart(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CHART_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Metrics Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Metrics to Show
            </label>
            <select
              multiple
              value={selectedMetrics}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedMetrics(values.length > 0 ? values : [defaultMetric]);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
            >
              {METRICS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
          </div>
        </div>

        {lastUpdated && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Last updated: {new Date(lastUpdated).toLocaleString()}
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <div className="bg-blue-100 px-2 py-1 rounded">
                📊 Stored Data
              </div>
              <div className="bg-green-100 px-2 py-1 rounded">
                {chartData && Object.keys(chartData).length} Metrics
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <RefreshCw className="h-5 w-5 animate-spin" />
            <span>Loading historical data...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-center space-x-2 text-red-800 mb-2">
            <Calendar className="h-5 w-5" />
            <span className="font-medium">Historical Data Error</span>
          </div>
          <p className="text-red-700 text-sm mb-3">{error}</p>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchHistoricalData}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
            >
              Retry
            </button>
            <button
              onClick={captureNewSnapshot}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm flex items-center space-x-2"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Capture Data</span>
            </button>
          </div>
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
            <strong>Tip:</strong> If this is a new account, try capturing a snapshot first to establish baseline data.
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && chartData && Object.keys(chartData).every(key => chartData[key].length === 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-blue-800 mb-3">
            <Calendar className="h-6 w-6" />
            <span className="text-lg font-medium">No Historical Data Available</span>
          </div>
          <p className="text-blue-700 text-sm mb-4">
            This {platform} account doesn't have any historical data yet. 
            Start by capturing your first snapshot to begin tracking analytics over time.
          </p>
          <button
            onClick={captureNewSnapshot}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto"
            disabled={loading}
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Capture First Snapshot</span>
          </button>
        </div>
      )}

      {/* Charts */}
      {chartData && !loading && renderChart()}
    </div>
  );
}

export default TimePeriodChart;
