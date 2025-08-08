import React from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

function TrendChart({ data, title, color, metric = 'value' }) {
  // Debug: log data received
  // console.log('TrendChart data for', title, data);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
        <div className="h-24 flex items-center justify-center text-gray-400 text-xs">
          No data available
        </div>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + (item[metric] || 0), 0);
  const average = Math.round(total / data.length);

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">{title}</h4>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            {total.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            Avg: {average.toLocaleString()}
          </div>
        </div>
      </div>
      
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis 
              dataKey="date" 
              hide 
            />
            <YAxis hide />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleDateString()}
              formatter={(value) => [value.toLocaleString(), title]}
              contentStyle={{
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '12px'
              }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: color }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TrendChart;