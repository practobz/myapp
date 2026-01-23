import React, { useState, useEffect, useRef } from 'react';
import { Calendar, TrendingUp, BarChart3, PieChart as PieChartIcon, RefreshCw, Download } from 'lucide-react';
import { 
  AreaChart, Area, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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
        <div key={metric} className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">
                {metricInfo?.label || metric}
              </h4>
              <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600">
                {selectedPeriod}d • {nonZeroCount} pts
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="text-base sm:text-lg lg:text-2xl font-bold" style={{ color: metricInfo?.color }}>
                {data[data.length - 1]?.value?.toLocaleString() || 0}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500">Current</div>
              {maxValue > 0 && (
                <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5">
                  Peak: {maxValue.toLocaleString()}
                </div>
              )}
            </div>
          </div>
          
          <div className="h-48 sm:h-56 lg:h-64">
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
        <div key={metric} className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="min-w-0 flex-1">
              <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">
                {metricInfo?.label || metric}
              </h4>
              <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600">Last {barsToShow} {barsToShow === 1 ? 'day' : 'days'}</p>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="text-base sm:text-lg lg:text-2xl font-bold" style={{ color: metricInfo?.color }}>
                {displayValue.toLocaleString()}
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500">Actual</div>
            </div>
          </div>
          
          <div className="h-48 sm:h-56 lg:h-64">
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
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div>
              <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Distribution</h4>
              <p className="text-[10px] sm:text-xs lg:text-sm text-gray-600">{subtitle}</p>
            </div>
          </div>
          
          <div className="h-48 sm:h-56 lg:h-64">
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 lg:gap-3 mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 lg:pt-4 border-t border-gray-100">
            {pieData.map((entry, index) => (
              <div key={entry.name} className="flex items-center space-x-1.5 sm:space-x-2">
                <div 
                  className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: entry.color }}
                ></div>
                <div className="text-[10px] sm:text-xs text-gray-600 truncate">
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
          
          <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-3 sm:p-4 lg:p-6 shadow-sm">
            <h4 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-2 sm:mb-3 lg:mb-4">Summary</h4>
            <div className="space-y-2 sm:space-y-3 lg:space-y-4">
              {selectedMetrics.map(metric => {
                const data = chartData[metric] || [];
                
                // Always use latest value (actual value) for all metrics
                const latest = data[data.length - 1]?.value || 0;
                const metricInfo = METRICS_OPTIONS.find(m => m.value === metric);
                
                return (
                  <div key={metric} className="p-2 sm:p-3 lg:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                      <span className="font-medium text-gray-700 text-xs sm:text-sm truncate">{metricInfo?.label}</span>
                      <div 
                        className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: metricInfo?.color }}
                      ></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                      <div>
                        <div className="text-gray-500 text-[10px] sm:text-xs">Latest</div>
                        <div className="font-semibold">{latest.toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-[10px] sm:text-xs">Actual</div>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
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

        // Data Table (last 7 days)
        checkPageBreak(50);
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text('Recent Data (Last 7 Days):', margin, yPosition);
        yPosition += 8;

        const recentData = data.slice(-7);
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
    <div className="space-y-3 sm:space-y-4 lg:space-y-6">
      {/* Controls */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
              <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-white" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 truncate">{title}</h3>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {selectedPeriod}d data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={generatePDFReport}
              disabled={generatingPdf || !chartData}
              className="bg-indigo-600 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm flex-shrink-0"
              title="Download PDF Report"
            >
              {generatingPdf ? (
                <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
              ) : (
                <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
              <span className="hidden sm:inline">{generatingPdf ? 'Generating...' : 'Download'}</span>
              <span className="sm:hidden">PDF</span>
            </button>
            <button
              onClick={captureNewSnapshot}
              className="bg-green-600 text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg hover:bg-green-700 flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm flex-shrink-0"
              title="Capture current data snapshot"
            >
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Capture</span>
              <span className="sm:hidden">Snap</span>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          {/* Time Period Selector */}
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Time Period
            </label>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
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
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Chart Type
            </label>
            <select
              value={selectedChart}
              onChange={(e) => setSelectedChart(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            >
              {CHART_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Metrics Selector */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Metrics
            </label>
            <select
              multiple
              value={selectedMetrics}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setSelectedMetrics(values.length > 0 ? values : [defaultMetric]);
              }}
              className="w-full border border-gray-300 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-16 sm:h-20 text-xs sm:text-sm"
            >
              {METRICS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">Hold Ctrl/Cmd</p>
          </div>
        </div>

        {lastUpdated && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-2 sm:mt-3 lg:mt-4 pt-2 sm:pt-3 lg:pt-4 border-t border-gray-200">
            <div className="text-[10px] sm:text-xs text-gray-500 truncate">
              Updated: {new Date(lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-gray-500">
              <div className="bg-blue-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
                📊 Stored
              </div>
              <div className="bg-green-100 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded">
                {chartData && Object.keys(chartData).length} Metrics
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg sm:rounded-xl border border-gray-200 p-4 sm:p-6 lg:p-8 text-center">
          <div className="inline-flex items-center space-x-2 text-blue-600">
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            <span className="text-xs sm:text-sm">Loading data...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg sm:rounded-xl p-3 sm:p-4 lg:p-6">
          <div className="flex items-center space-x-2 text-red-800 mb-2">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="font-medium text-xs sm:text-sm">Data Error</span>
          </div>
          <p className="text-red-700 text-xs sm:text-sm mb-3 line-clamp-2">{error}</p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <button
              onClick={fetchHistoricalData}
              className="bg-red-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-red-700 text-xs sm:text-sm"
            >
              Retry
            </button>
            <button
              onClick={captureNewSnapshot}
              className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg hover:bg-blue-700 text-xs sm:text-sm flex items-center justify-center space-x-2"
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Capture Data</span>
            </button>
          </div>
          <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-xs sm:text-sm">
            <strong>Tip:</strong> Try capturing a snapshot first.
          </div>
        </div>
      )}

      {/* No Data State */}
      {!loading && !error && chartData && Object.keys(chartData).every(key => chartData[key].length === 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center">
          <div className="flex items-center justify-center space-x-2 text-blue-800 mb-2 sm:mb-3">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-sm sm:text-base lg:text-lg font-medium">No Data Available</span>
          </div>
          <p className="text-blue-700 text-xs sm:text-sm mb-3 sm:mb-4">
            No historical data for this {platform} account. Start tracking now.
          </p>
          <button
            onClick={captureNewSnapshot}
            className="bg-blue-600 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2 mx-auto text-xs sm:text-sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Capture First Snapshot</span>
          </button>
        </div>
      )}

      {/* Charts */}
      {chartData && !loading && (
        <div ref={chartContainerRef}>
          {renderChart()}
        </div>
      )}
    </div>
  );
}

export default TimePeriodChart;
