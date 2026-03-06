import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  Calendar, TrendingUp, BarChart3, PieChart as PieChartIcon, RefreshCw, Download,
  ChevronDown, Layers, Clock, CheckCircle2, AlertTriangle, Info, Sparkles,
  ArrowUpRight, ArrowDownRight, Minus, Filter, Eye
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Skeleton loader component
const Skeleton = memo(({ className = '' }) => (
  <div className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`} />
));

// Chart skeleton loader
const ChartSkeleton = memo(() => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
    <div className="flex items-center justify-between mb-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32 rounded" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <div className="text-right space-y-2">
        <Skeleton className="h-7 w-20 rounded ml-auto" />
        <Skeleton className="h-3 w-16 rounded ml-auto" />
      </div>
    </div>
    <div className="h-48 sm:h-64 flex items-end justify-between gap-2 pt-4">
      {[40, 65, 45, 80, 55, 70, 60, 75, 50, 85, 65, 70].map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${h}%` }} />
      ))}
    </div>
  </div>
));

// Trend indicator component
const TrendIndicator = memo(({ current, previous, size = 'default' }) => {
  if (!previous || previous === 0) return null;
  
  const change = ((current - previous) / previous * 100);
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.5;
  
  const sizeClasses = {
    small: 'text-[10px] px-1.5 py-0.5',
    default: 'text-xs px-2 py-1'
  };
  
  if (isNeutral) {
    return (
      <span className={`inline-flex items-center gap-0.5 bg-gray-100 text-gray-600 rounded-full font-medium ${sizeClasses[size]}`}>
        <Minus className="w-3 h-3" />
        0%
      </span>
    );
  }
  
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full font-medium ${
      isPositive 
        ? 'bg-green-100 text-green-700' 
        : 'bg-red-100 text-red-700'
    } ${sizeClasses[size]}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
});

const TIME_PERIOD_OPTIONS = [
  { value: 7, label: '7 days', shortLabel: '7D', description: 'Last week' },
  { value: 15, label: '15 days', shortLabel: '15D', description: 'Last 2 weeks' },
  { value: 30, label: '30 days', shortLabel: '1M', description: 'Last month' },
  { value: 60, label: '60 days', shortLabel: '2M', description: 'Last 2 months' },
  { value: 90, label: '90 days', shortLabel: '3M', description: 'Last quarter' },
  { value: 180, label: '6 months', shortLabel: '6M', description: 'Last 6 months' },
  { value: 365, label: '1 year', shortLabel: '1Y', description: 'Last year' }
];

const CHART_TYPE_OPTIONS = [
  { value: 'trend', label: 'Trend', fullLabel: 'Trend Chart', icon: TrendingUp, description: 'Area chart showing trends over time' },
  { value: 'bar', label: 'Bar', fullLabel: 'Bar Chart', icon: BarChart3, description: 'Bar chart comparing values' },
  { value: 'pie', label: 'Pie', fullLabel: 'Pie Chart', icon: PieChartIcon, description: 'Distribution breakdown' }
];

const METRICS_OPTIONS = [
  { value: 'followers', label: 'Followers', color: '#3B82F6', gradient: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50' },
  { value: 'likes', label: 'Likes', color: '#10B981', gradient: 'from-emerald-500 to-green-600', bgLight: 'bg-emerald-50' },
  { value: 'comments', label: 'Comments', color: '#8B5CF6', gradient: 'from-violet-500 to-purple-600', bgLight: 'bg-violet-50' },
  { value: 'shares', label: 'Shares', color: '#F59E0B', gradient: 'from-amber-500 to-orange-500', bgLight: 'bg-amber-50' },
  { value: 'engagement', label: 'Engagement', color: '#EF4444', gradient: 'from-red-500 to-rose-600', bgLight: 'bg-red-50' },
  { value: 'views', label: 'Views', color: '#06B6D4', gradient: 'from-cyan-500 to-teal-500', bgLight: 'bg-cyan-50' },
  { value: 'reach', label: 'Reach', color: '#84CC16', gradient: 'from-lime-500 to-green-500', bgLight: 'bg-lime-50' },
  { value: 'impressions', label: 'Impressions', color: '#F97316', gradient: 'from-orange-500 to-amber-500', bgLight: 'bg-orange-50' }
];

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, metricInfo }) => {
  if (!active || !payload || !payload.length) return null;
  
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-xl p-3 min-w-[140px]">
      <p className="text-xs text-gray-500 mb-1.5 font-medium">
        {new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded-full shadow-sm"
          style={{ backgroundColor: metricInfo?.color || payload[0]?.color }}
        />
        <span className="font-bold text-gray-900">
          {payload[0]?.value?.toLocaleString()}
        </span>
        <span className="text-xs text-gray-500">{metricInfo?.label}</span>
      </div>
    </div>
  );
};

export function TimePeriodChart({ platform, accountId, title, defaultMetric = 'followers' }) {
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedChart, setSelectedChart] = useState('trend');
  const [selectedMetrics, setSelectedMetrics] = useState([defaultMetric]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const chartContainerRef = useRef(null);

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
        
        // Check if data is empty for this period
        const hasData = result.data && Object.keys(result.data).some(key => 
          result.data[key] && result.data[key].length > 0
        );
        
        if (!hasData && result.snapshotsCount > 0) {
          // Data exists but not for this period
          console.warn(`⚠️ No data available for ${selectedPeriod} days period, but ${result.snapshotsCount} snapshots exist`);
          setError(`No data available for the last ${selectedPeriod} days. Try selecting a longer time period.`);
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
      const currentValue = data[data.length - 1]?.value || 0;
      const previousValue = data[0]?.value || 0;

      return (
        <div key={metric} className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-lg transition-all duration-300 group">
          {/* Header */}
          <div className="flex items-start justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-3">
              <div 
                className={`p-2 sm:p-2.5 rounded-xl bg-gradient-to-br ${metricInfo?.gradient || 'from-gray-500 to-gray-600'} shadow-lg group-hover:scale-105 transition-transform duration-300`}
              >
                <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900">
                  {metricInfo?.label || metric}
                </h4>
                <p className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1.5">
                  <Clock className="h-3 w-3" />
                  {selectedPeriod} days • {nonZeroCount} data points
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: metricInfo?.color }}>
                {currentValue.toLocaleString()}
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <TrendIndicator current={currentValue} previous={previousValue} size="small" />
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 p-2 sm:p-3 bg-gray-50/80 rounded-xl">
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-gray-500">Peak</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-900">{maxValue.toLocaleString()}</p>
            </div>
            <div className="text-center border-x border-gray-200">
              <p className="text-[10px] sm:text-xs text-gray-500">Average</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-900">{Math.round(avgValue).toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] sm:text-xs text-gray-500">Lowest</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-900">{minValue.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Chart */}
          <div className="h-44 sm:h-52 lg:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metricInfo?.color} stopOpacity={0.4}/>
                    <stop offset="100%" stopColor={metricInfo?.color} stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value;
                  }}
                  width={45}
                />
                <Tooltip content={<CustomTooltip metricInfo={metricInfo} />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={metricInfo?.color}
                  strokeWidth={2.5}
                  fill={`url(#gradient-${metric})`}
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: 'white' }}
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
      
      // Determine how many bars to show based on selected period
      let barsToShow;
      if (selectedPeriod <= 7) barsToShow = selectedPeriod;
      else if (selectedPeriod <= 15) barsToShow = selectedPeriod;
      else if (selectedPeriod <= 30) barsToShow = Math.min(30, data.length);
      else if (selectedPeriod <= 90) barsToShow = Math.min(60, data.length);
      else barsToShow = Math.min(90, data.length);
      
      const barData = data.slice(-barsToShow);
      const displayValue = barData[barData.length - 1]?.value || 0;
      const previousValue = barData[0]?.value || 0;
      const values = barData.map(d => d.value || 0);
      const totalValue = values.reduce((a, b) => a + b, 0);

      return (
        <div key={metric} className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-lg transition-all duration-300 group">
          {/* Header */}
          <div className="flex items-start justify-between mb-4 sm:mb-5">
            <div className="flex items-center gap-3">
              <div 
                className={`p-2 sm:p-2.5 rounded-xl bg-gradient-to-br ${metricInfo?.gradient || 'from-gray-500 to-gray-600'} shadow-lg group-hover:scale-105 transition-transform duration-300`}
              >
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900">
                  {metricInfo?.label || metric}
                </h4>
                <p className="text-[10px] sm:text-xs text-gray-500">
                  Last {barsToShow} {barsToShow === 1 ? 'day' : 'days'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold" style={{ color: metricInfo?.color }}>
                {displayValue.toLocaleString()}
              </div>
              <div className="flex items-center justify-end gap-2 mt-1">
                <TrendIndicator current={displayValue} previous={previousValue} size="small" />
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between mb-4 p-2 sm:p-3 bg-gray-50/80 rounded-xl text-center">
            <div className="flex-1">
              <p className="text-[10px] sm:text-xs text-gray-500">Total</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-900">{totalValue.toLocaleString()}</p>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="flex-1">
              <p className="text-[10px] sm:text-xs text-gray-500">Average</p>
              <p className="text-xs sm:text-sm font-semibold text-gray-900">{Math.round(totalValue / barsToShow).toLocaleString()}</p>
            </div>
          </div>
          
          {/* Chart */}
          <div className="h-44 sm:h-52 lg:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={`bar-gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metricInfo?.color} stopOpacity={1}/>
                    <stop offset="100%" stopColor={metricInfo?.color} stopOpacity={0.7}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#9CA3AF' }}
                  tickFormatter={(value) => {
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                    return value;
                  }}
                  width={45}
                />
                <Tooltip content={<CustomTooltip metricInfo={metricInfo} />} />
                <Bar 
                  dataKey="value" 
                  fill={`url(#bar-gradient-${metric})`}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    };

    const renderPieChart = () => {
      // Create pie chart from values of selected metrics
      const pieData = selectedMetrics.map(metric => {
        const data = chartData[metric] || [];
        const value = data[data.length - 1]?.value || 0;
        const metricInfo = METRICS_OPTIONS.find(m => m.value === metric);
        
        return {
          name: metricInfo?.label || metric,
          value: value,
          color: metricInfo?.color || '#6B7280',
          gradient: metricInfo?.gradient || 'from-gray-500 to-gray-600'
        };
      }).filter(item => item.value > 0);

      if (pieData.length === 0) return null;
      
      const totalValue = pieData.reduce((sum, item) => sum + item.value, 0);

      return (
        <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-lg transition-all duration-300">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg">
              <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-semibold text-gray-900">Metrics Distribution</h4>
              <p className="text-[10px] sm:text-xs text-gray-500">Current values breakdown</p>
            </div>
          </div>
          
          {/* Chart */}
          <div className="h-48 sm:h-56 lg:h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color}
                      className="drop-shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [`${value.toLocaleString()} (${((value / totalValue) * 100).toFixed(1)}%)`, name]}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">{totalValue.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-gray-500">Total</p>
              </div>
            </div>
          </div>
          
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4 pt-4 border-t border-gray-100">
            {pieData.map((entry) => {
              const percentage = ((entry.value / totalValue) * 100).toFixed(1);
              return (
                <div key={entry.name} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div 
                    className="w-3 h-3 rounded-full shadow-sm flex-shrink-0"
                    style={{ backgroundColor: entry.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-700 truncate">{entry.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500">
                      {entry.value.toLocaleString()} ({percentage}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    };

    if (selectedChart === 'pie') {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
          {renderPieChart()}
          
          {/* Summary Card */}
          <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 p-4 sm:p-5 lg:p-6 shadow-sm hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 mb-4 sm:mb-5">
              <div className="p-2 sm:p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900">Metrics Summary</h4>
                <p className="text-[10px] sm:text-xs text-gray-500">Performance at a glance</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {selectedMetrics.map(metric => {
                const data = chartData[metric] || [];
                const latest = data[data.length - 1]?.value || 0;
                const previous = data[0]?.value || 0;
                const metricInfo = METRICS_OPTIONS.find(m => m.value === metric);
                
                return (
                  <div 
                    key={metric} 
                    className={`p-3 sm:p-4 rounded-xl border border-gray-100 ${metricInfo?.bgLight || 'bg-gray-50'} transition-all hover:shadow-sm`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: metricInfo?.color }}
                        />
                        <span className="font-medium text-gray-800 text-sm">{metricInfo?.label}</span>
                      </div>
                      <TrendIndicator current={latest} previous={previous} size="small" />
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">
                      {latest.toLocaleString()}
                    </div>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
                      Started at {previous.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        {selectedMetrics.map(metric => 
          selectedChart === 'trend' ? renderTrendChart(metric) : renderBarChart(metric)
        )}
      </div>
    );
  };

  // Generate comprehensive PDF report
  const generatePDFReport = async () => {
    if (!chartData) {
      alert('No data available to generate report');
      return;
    }

    setGeneratingPdf(true);

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

      // Helper function to format platform name
      const formatPlatformName = (p) => {
        const names = {
          facebook: 'Facebook',
          instagram: 'Instagram',
          twitter: 'Twitter/X',
          linkedin: 'LinkedIn',
          youtube: 'YouTube',
          tiktok: 'TikTok'
        };
        return names[p?.toLowerCase()] || p || 'Unknown Platform';
      };

      // ========== HEADER SECTION ==========
      pdf.setFillColor(59, 130, 246);
      pdf.rect(0, 0, pageWidth, 45, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Analytics Report', margin, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${formatPlatformName(platform)} Performance Analytics`, margin, 30);
      
      pdf.setFontSize(10);
      const reportDate = new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      pdf.text(`Generated: ${reportDate}`, margin, 38);

      yPosition = 55;

      // ========== REPORT SUMMARY SECTION ==========
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Report Summary', margin, yPosition);
      yPosition += 8;

      pdf.setFillColor(249, 250, 251);
      pdf.setDrawColor(229, 231, 235);
      pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 35, 3, 3, 'FD');
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(75, 85, 99);
      
      const summaryItems = [
        `Platform: ${formatPlatformName(platform)}`,
        `Account ID: ${accountId}`,
        `Time Period: Last ${selectedPeriod} days`,
        `Chart Type: ${CHART_TYPE_OPTIONS.find(c => c.value === selectedChart)?.label || selectedChart}`,
        `Metrics Analyzed: ${selectedMetrics.map(m => METRICS_OPTIONS.find(o => o.value === m)?.label || m).join(', ')}`
      ];
      
      let summaryY = yPosition + 7;
      summaryItems.forEach(item => {
        pdf.text(`• ${item}`, margin + 5, summaryY);
        summaryY += 6;
      });
      
      yPosition += 45;

      // ========== EXECUTIVE SUMMARY ==========
      checkPageBreak(60);
      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 10;

      let totalDataPoints = 0;
      let highestPerformer = { metric: '', value: 0, growth: 0 };
      
      selectedMetrics.forEach(metric => {
        const data = chartData[metric] || [];
        if (data.length > 0) {
          totalDataPoints += data.length;
          const firstValue = data[0]?.value || 0;
          const lastValue = data[data.length - 1]?.value || 0;
          const growth = firstValue > 0 ? ((lastValue - firstValue) / firstValue * 100) : 0;
          
          if (lastValue > highestPerformer.value) {
            highestPerformer = { 
              metric: METRICS_OPTIONS.find(m => m.value === metric)?.label || metric, 
              value: lastValue, 
              growth 
            };
          }
        }
      });

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(55, 65, 81);
      
      const executiveSummary = [
        `This report provides a comprehensive analysis of your ${formatPlatformName(platform)} account performance`,
        `over the last ${selectedPeriod} days. The analysis covers ${selectedMetrics.length} key metric(s) with`,
        `${totalDataPoints} data points collected during this period.`,
        ``,
        `Key Highlight: Your ${highestPerformer.metric} shows the strongest performance with`,
        `${highestPerformer.value.toLocaleString()} as the current value${highestPerformer.growth !== 0 ? ` (${highestPerformer.growth > 0 ? '+' : ''}${highestPerformer.growth.toFixed(1)}% change)` : ''}.`
      ];
      
      executiveSummary.forEach(line => {
        pdf.text(line, margin, yPosition);
        yPosition += 5;
      });
      
      yPosition += 10;

      // ========== DETAILED METRICS ANALYSIS ==========
      for (const metric of selectedMetrics) {
        const data = chartData[metric] || [];
        const metricInfo = METRICS_OPTIONS.find(m => m.value === metric);
        
        if (data.length === 0) continue;

        checkPageBreak(80);

        pdf.setFillColor(metricInfo?.color || '#6B7280');
        pdf.rect(margin, yPosition, 4, 10, 'F');
        
        pdf.setTextColor(31, 41, 55);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(metricInfo?.label || metric, margin + 8, yPosition + 7);
        yPosition += 15;

        const values = data.map(d => d.value || 0);
        const currentValue = values[values.length - 1];
        const previousValue = values[0];
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
        const totalValue = values.reduce((a, b) => a + b, 0);
        const nonZeroCount = values.filter(v => v > 0).length;
        const growthPercent = previousValue > 0 ? ((currentValue - previousValue) / previousValue * 100) : 0;

        const peakIndex = values.indexOf(maxValue);
        const lowIndex = values.indexOf(minValue);
        const peakDate = data[peakIndex]?.date ? new Date(data[peakIndex].date).toLocaleDateString() : 'N/A';
        const lowDate = data[lowIndex]?.date ? new Date(data[lowIndex].date).toLocaleDateString() : 'N/A';

        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 45, 2, 2, 'F');

        const statsData = [
          { label: 'Current Value', value: currentValue.toLocaleString() },
          { label: 'Previous Value', value: previousValue.toLocaleString() },
          { label: 'Change', value: `${growthPercent > 0 ? '+' : ''}${growthPercent.toFixed(2)}%` },
          { label: 'Peak Value', value: `${maxValue.toLocaleString()} (${peakDate})` },
          { label: 'Lowest Value', value: `${minValue.toLocaleString()} (${lowDate})` },
          { label: 'Average', value: Math.round(avgValue).toLocaleString() },
          { label: 'Total (Sum)', value: totalValue.toLocaleString() },
          { label: 'Data Points', value: `${nonZeroCount} of ${data.length}` }
        ];

        pdf.setFontSize(9);
        let statsX = margin + 5;
        let statsY = yPosition + 8;
        const colWidth = (pageWidth - 2 * margin - 10) / 4;

        statsData.forEach((stat, index) => {
          if (index > 0 && index % 4 === 0) {
            statsY += 12;
            statsX = margin + 5;
          }
          
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(107, 114, 128);
          pdf.text(stat.label, statsX, statsY);
          
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(31, 41, 55);
          pdf.text(stat.value, statsX, statsY + 5);
          
          statsX += colWidth;
        });

        yPosition += 55;

        // Trend Analysis
        checkPageBreak(30);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text('Trend Analysis:', margin, yPosition);
        yPosition += 6;

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);

        let trendDescription = '';
        if (growthPercent > 10) {
          trendDescription = `Strong upward trend detected. ${metricInfo?.label} has grown significantly by ${growthPercent.toFixed(1)}% over the analysis period, indicating positive momentum and engagement growth.`;
        } else if (growthPercent > 0) {
          trendDescription = `Moderate positive trend observed. ${metricInfo?.label} shows steady growth of ${growthPercent.toFixed(1)}%, suggesting consistent performance improvement.`;
        } else if (growthPercent === 0) {
          trendDescription = `${metricInfo?.label} has remained stable during the analysis period with no significant change, indicating consistent but flat performance.`;
        } else if (growthPercent > -10) {
          trendDescription = `Slight decline detected. ${metricInfo?.label} decreased by ${Math.abs(growthPercent).toFixed(1)}%. Consider reviewing content strategy to reverse this trend.`;
        } else {
          trendDescription = `Significant decline observed. ${metricInfo?.label} dropped by ${Math.abs(growthPercent).toFixed(1)}%. Immediate attention recommended to identify causes and implement corrective measures.`;
        }

        const trendLines = pdf.splitTextToSize(trendDescription, pageWidth - 2 * margin);
        trendLines.forEach(line => {
          pdf.text(line, margin, yPosition);
          yPosition += 5;
        });

        yPosition += 10;

        // Data Table (selected period)
        const recentData = data.slice(-selectedPeriod);
        const tableRowHeight = 6;
        const tableHeaderHeight = 15;
        const estimatedTableHeight = tableHeaderHeight + recentData.length * tableRowHeight + 10;
        checkPageBreak(estimatedTableHeight);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text(`Data for Last ${selectedPeriod} Days:`, margin, yPosition);
        yPosition += 8;
        const tableColWidth = (pageWidth - 2 * margin) / 3;
        
        pdf.setFillColor(243, 244, 246);
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F');
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Date', margin + 3, yPosition + 5);
        pdf.text('Value', margin + tableColWidth + 3, yPosition + 5);
        pdf.text('Change', margin + 2 * tableColWidth + 3, yPosition + 5);
        yPosition += 7;

        pdf.setFont('helvetica', 'normal');
        recentData.forEach((item, index) => {
          // Add new page if needed mid-table, and re-draw header
          if (yPosition + 6 > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
            pdf.setFillColor(243, 244, 246);
            pdf.rect(margin, yPosition, pageWidth - 2 * margin, 7, 'F');
            pdf.setFontSize(9);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(31, 41, 55);
            pdf.text('Date', margin + 3, yPosition + 5);
            pdf.text('Value', margin + tableColWidth + 3, yPosition + 5);
            pdf.text('Change', margin + 2 * tableColWidth + 3, yPosition + 5);
            yPosition += 7;
            pdf.setFont('helvetica', 'normal');
          }

          const prevItem = index > 0 ? recentData[index - 1] : null;
          const change = prevItem ? item.value - prevItem.value : 0;
          const changeText = prevItem ? `${change >= 0 ? '+' : ''}${change.toLocaleString()}` : '-';
          
          if (index % 2 === 0) {
            pdf.setFillColor(249, 250, 251);
            pdf.rect(margin, yPosition, pageWidth - 2 * margin, 6, 'F');
          }
          
          const dateStr = new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          pdf.text(dateStr, margin + 3, yPosition + 4);
          pdf.text(item.value?.toLocaleString() || '0', margin + tableColWidth + 3, yPosition + 4);
          
          if (change > 0) pdf.setTextColor(16, 185, 129);
          else if (change < 0) pdf.setTextColor(239, 68, 68);
          else pdf.setTextColor(107, 114, 128);
          
          pdf.text(changeText, margin + 2 * tableColWidth + 3, yPosition + 4);
          pdf.setTextColor(55, 65, 81);
          
          yPosition += 6;
        });

        yPosition += 15;
      }

      // ========== CAPTURE CHARTS AS IMAGES ==========
      if (chartContainerRef.current) {
        checkPageBreak(100);
        
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text('Visual Analytics', margin, yPosition);
        yPosition += 10;

        try {
          const canvas = await html2canvas(chartContainerRef.current, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pageWidth - 2 * margin;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          if (yPosition + imgHeight > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          
          pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, Math.min(imgHeight, pageHeight - yPosition - margin));
          yPosition += imgHeight + 10;
        } catch (imgError) {
          console.error('Error capturing chart image:', imgError);
          pdf.setFontSize(10);
          pdf.setTextColor(239, 68, 68);
          pdf.text('Chart image could not be captured', margin, yPosition);
          yPosition += 10;
        }
      }

      // ========== RECOMMENDATIONS SECTION ==========
      pdf.addPage();
      yPosition = margin;

      pdf.setFillColor(16, 185, 129);
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Recommendations & Insights', margin, 22);
      
      yPosition = 45;

      pdf.setTextColor(31, 41, 55);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Based on your analytics, here are our recommendations:', margin, yPosition);
      yPosition += 12;

      const recommendations = [];
      
      selectedMetrics.forEach(metric => {
        const data = chartData[metric] || [];
        if (data.length > 0) {
          const values = data.map(d => d.value || 0);
          const current = values[values.length - 1];
          const previous = values[0];
          const growth = previous > 0 ? ((current - previous) / previous * 100) : 0;
          const metricLabel = METRICS_OPTIONS.find(m => m.value === metric)?.label || metric;

          if (growth > 20) {
            recommendations.push({
              type: 'success',
              title: `Excellent ${metricLabel} Growth`,
              text: `Your ${metricLabel.toLowerCase()} has increased by ${growth.toFixed(1)}%. Continue your current strategy and consider scaling successful campaigns.`
            });
          } else if (growth > 5) {
            recommendations.push({
              type: 'info',
              title: `Positive ${metricLabel} Trend`,
              text: `Your ${metricLabel.toLowerCase()} shows healthy growth of ${growth.toFixed(1)}%. Consider A/B testing to optimize further.`
            });
          } else if (growth < -10) {
            recommendations.push({
              type: 'warning',
              title: `${metricLabel} Needs Attention`,
              text: `Your ${metricLabel.toLowerCase()} has declined by ${Math.abs(growth).toFixed(1)}%. Review recent content changes and engagement patterns.`
            });
          }
        }
      });

      recommendations.push({
        type: 'info',
        title: 'Content Consistency',
        text: 'Maintain a consistent posting schedule to keep your audience engaged and improve algorithm visibility.'
      });

      recommendations.push({
        type: 'info',
        title: 'Engagement Strategy',
        text: 'Respond to comments and messages promptly to build community and increase organic reach.'
      });

      recommendations.forEach((rec, index) => {
        checkPageBreak(25);
        
        const colors = {
          success: { bg: [209, 250, 229], border: [16, 185, 129] },
          warning: { bg: [254, 243, 199], border: [245, 158, 11] },
          info: { bg: [219, 234, 254], border: [59, 130, 246] }
        };
        
        const color = colors[rec.type] || colors.info;
        
        pdf.setFillColor(...color.bg);
        pdf.setDrawColor(...color.border);
        pdf.roundedRect(margin, yPosition, pageWidth - 2 * margin, 22, 2, 2, 'FD');
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text(`${index + 1}. ${rec.title}`, margin + 5, yPosition + 7);
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(55, 65, 81);
        const recLines = pdf.splitTextToSize(rec.text, pageWidth - 2 * margin - 10);
        pdf.text(recLines[0], margin + 5, yPosition + 14);
        if (recLines[1]) pdf.text(recLines[1], margin + 5, yPosition + 19);
        
        yPosition += 28;
      });

      // ========== FOOTER ==========
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(
          `Page ${i} of ${pageCount} | ${formatPlatformName(platform)} Analytics Report | Generated by Airspark`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      const fileName = `${platform}_analytics_report_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      console.log('✅ PDF Report generated successfully:', fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
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
    <div className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Header & Controls */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 sm:p-5 lg:p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-20 translate-x-20" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-16 -translate-x-16" />
          
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 sm:p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg lg:text-xl font-bold text-white truncate">{title}</h3>
                <p className="text-xs sm:text-sm text-blue-100 flex items-center gap-1.5 mt-0.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last {selectedPeriod} days</span>
                  {lastUpdated && (
                    <>
                      <span className="mx-1">•</span>
                      <span>Updated {new Date(lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchHistoricalData}
                disabled={loading}
                className="p-2 sm:p-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white transition-all duration-200 disabled:opacity-50"
                title="Refresh Data"
              >
                <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={generatePDFReport}
                disabled={generatingPdf || !chartData}
                className="inline-flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-white text-indigo-600 font-medium rounded-xl hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-xs sm:text-sm shadow-lg"
                title="Download PDF Report"
              >
                {generatingPdf ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">{generatingPdf ? 'Generating...' : 'Export PDF'}</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>
        </div>
        
        {/* Controls Section */}
        <div className="p-4 sm:p-5 lg:p-6 bg-white border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 sm:gap-6">
            {/* Time Period - Simple Dropdown */}
            <div className="flex-1 max-w-[180px]">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Time Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer hover:bg-gray-100 transition-colors"
              >
                {TIME_PERIOD_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Chart Type - Clean Toggle */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Chart Type
              </label>
              <div className="inline-flex bg-gray-100 rounded-lg p-1">
                {CHART_TYPE_OPTIONS.map(option => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => setSelectedChart(option.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        selectedChart === option.value
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrics - Simple Chips */}
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Metrics
              </label>
              <div className="flex flex-wrap gap-1.5">
                {METRICS_OPTIONS.map(option => {
                  const isSelected = selectedMetrics.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => {
                        if (isSelected && selectedMetrics.length > 1) {
                          setSelectedMetrics(selectedMetrics.filter(m => m !== option.value));
                        } else if (!isSelected) {
                          setSelectedMetrics([...selectedMetrics, option.value]);
                        }
                      }}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State with Skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {selectedMetrics.slice(0, 3).map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-red-100 rounded-xl flex-shrink-0">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-red-800 mb-1">Unable to Load Analytics Data</h4>
              <p className="text-red-700 text-xs sm:text-sm mb-4 line-clamp-2">{error}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={fetchHistoricalData}
                  className="inline-flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-xs sm:text-sm font-medium transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
                <button
                  onClick={() => setSelectedPeriod(selectedPeriod === 365 ? 180 : 365)}
                  className="inline-flex items-center gap-2 bg-white border border-red-200 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 text-xs sm:text-sm font-medium transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Try Different Period
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && chartData && Object.keys(chartData).every(key => chartData[key].length === 0) && (
        <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl sm:rounded-2xl border border-blue-200/50 p-6 sm:p-8 lg:p-10">
          <div className="text-center max-w-md mx-auto">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center">
              <Calendar className="h-8 w-8 sm:h-10 sm:w-10 text-blue-500" />
            </div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Data Available Yet</h3>
            <p className="text-gray-600 text-sm sm:text-base mb-6">
              Historical analytics data for this {platform} account hasn't been collected yet. Data will appear here once analytics are captured.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs sm:text-sm font-medium">
              <Info className="h-4 w-4" />
              Analytics are collected daily
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      {chartData && !loading && !error && (
        <div ref={chartContainerRef} className="animate-in fade-in duration-500">
          {renderChart()}
        </div>
      )}
    </div>
  );
}

export default TimePeriodChart;
