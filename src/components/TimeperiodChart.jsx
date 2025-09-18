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
        `${process.env.REACT_APP_API_URL}/api/historical-data/get?platform=${platform}&accountId=${accountId}&timePeriod=${selectedPeriod}`
      );
      
      const result = await response.json();
      
      if (result.success) {
        setChartData(result.data);
        setLastUpdated(new Date().toISOString());
        console.log(`✅ Loaded historical data for ${platform}:${accountId}`, {
          period: selectedPeriod,
          snapshots: result.snapshotsCount
        });
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
        // Refresh the chart data
        await fetchHistoricalData();
        alert('✅ New snapshot captured successfully!');
      } else {
        alert(`❌ Failed to capture snapshot: ${result.error}`);
      }
    } catch (err) {
      console.error('Error capturing snapshot:', err);
      alert('❌ Failed to capture snapshot');
    }
  };

  const renderChart = () => {
    if (!chartData) return null;

    const renderTrendChart = (metric) => {
      const data = chartData[metric] || [];
      const metricInfo = METRICS_OPTIONS.find(m => m.value === metric);
      
      if (data.length === 0) return null;

      return (
        <div key={metric} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {metricInfo?.label || metric}
              </h4>
              <p className="text-sm text-gray-600">Last {selectedPeriod} days</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: metricInfo?.color }}>
                {data[data.length - 1]?.value?.toLocaleString() || 0}
              </div>
              <div className="text-xs text-gray-500">Current</div>
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

      // Show last 7 days for bar chart
      const barData = data.slice(-7);

      return (
        <div key={metric} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">
                {metricInfo?.label || metric}
              </h4>
              <p className="text-sm text-gray-600">Last 7 days</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold" style={{ color: metricInfo?.color }}>
                {barData.reduce((sum, item) => sum + (item.value || 0), 0).toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Total</div>
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
      // Create pie chart from total values of selected metrics
      const pieData = selectedMetrics.map(metric => {
        const data = chartData[metric] || [];
        const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
        const metricInfo = METRICS_OPTIONS.find(m => m.value === metric);
        
        return {
          name: metricInfo?.label || metric,
          value: total,
          color: metricInfo?.color || '#6B7280'
        };
      }).filter(item => item.value > 0);

      if (pieData.length === 0) return null;

      return (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Metrics Distribution</h4>
              <p className="text-sm text-gray-600">Last {selectedPeriod} days totals</p>
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
                const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
                const average = data.length > 0 ? total / data.length : 0;
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
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-gray-500">Latest</div>
                        <div className="font-semibold">{latest.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Total</div>
                        <div className="font-semibold">{total.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Avg/Day</div>
                        <div className="font-semibold">{Math.round(average).toLocaleString()}</div>
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
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={fetchHistoricalData}
            className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* Charts */}
      {chartData && !loading && renderChart()}
    </div>
  );
}

export default TimePeriodChart;
