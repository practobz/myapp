import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

function TrendChart({ data, title, color = '#3B82F6', metric = 'value', showTrend = true }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500">No trend data available</p>
      </div>
    );
  }

  // Calculate trend
  const firstValue = data[0]?.[metric] || 0;
  const lastValue = data[data.length - 1]?.[metric] || 0;
  const trendPercentage = firstValue > 0 ? ((lastValue - firstValue) / firstValue * 100) : 0;
  const isPositive = trendPercentage > 0;
  const isNeutral = Math.abs(trendPercentage) < 1;

  const formatTooltipValue = (value) => {
    return typeof value === 'number' ? value.toLocaleString() : value;
  };

  // Format X-axis based on data length (time period)
  const formatXAxisTick = (value) => {
    const date = new Date(value);
    const dataLength = data.length;
    
    if (dataLength <= 7) {
      // For 7 days or less, show month/day
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (dataLength <= 30) {
      // For 30 days or less, show month/day
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (dataLength <= 90) {
      // For 3 months or less, show month/day but fewer ticks
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
      // For longer periods, show month/year
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }
  };

  // Calculate tick interval based on data length
  const getTickInterval = () => {
    const dataLength = data.length;
    if (dataLength <= 7) return 1;
    if (dataLength <= 30) return Math.ceil(dataLength / 6);
    if (dataLength <= 90) return Math.ceil(dataLength / 8);
    return Math.ceil(dataLength / 10);
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {showTrend && (
          <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${
            isNeutral 
              ? 'bg-gray-100 text-gray-600' 
              : isPositive 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
          }`}>
            {isNeutral ? (
              <Minus className="h-4 w-4" />
            ) : isPositive ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span>{Math.abs(trendPercentage).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`gradient-${metric}-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              fontSize={12}
              tickFormatter={formatXAxisTick}
              interval={getTickInterval()}
              angle={data.length > 30 ? -45 : 0}
              textAnchor={data.length > 30 ? "end" : "middle"}
              height={data.length > 30 ? 70 : 50}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              tickFormatter={(value) => {
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                return value.toString();
              }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value) => [formatTooltipValue(value), title]}
              labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            />
            <Area
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2}
              fill={`url(#gradient-${metric}-${title.replace(/\s+/g, '')})`}
              dot={data.length <= 30 ? { fill: color, strokeWidth: 2, r: 3 } : false}
              activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
        <span>Current: {formatTooltipValue(lastValue)}</span>
        <span>Period: {data.length} days</span>
      </div>
    </div>
  );
}

export default TrendChart;