import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Users, Heart, MessageCircle, Share, Award, Target,
  Calendar, ArrowUp, ArrowDown, Zap, BarChart3, FileText, Download
} from 'lucide-react';
import TrendChart from './TrendChart';

const CustomerValueDashboard = ({ 
  platformData = [], 
  customerInfo = {},
  serviceMetrics = {},
  timeRange = 30 
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState(timeRange);
  const [comparisonMode, setComparisonMode] = useState('growth');

  // Calculate aggregated metrics across all platforms
  const calculateAggregatedMetrics = () => {
    const metrics = {
      totalFollowers: 0,
      totalEngagement: 0,
      totalPosts: 0,
      averageEngagementRate: 0,
      growthMetrics: {},
      platformBreakdown: {}
    };

    platformData.forEach(platform => {
      if (platform.accountInfo) {
        metrics.totalFollowers += platform.accountInfo.followers_count || 0;
      }
      
      if (platform.posts) {
        metrics.totalPosts += platform.posts.length;
        
        platform.posts.forEach(post => {
          const likes = post.like_count || post.likes?.summary?.total_count || 0;
          const comments = post.comments_count || post.comments?.summary?.total_count || 0;
          const shares = post.shares?.count || 0;
          metrics.totalEngagement += likes + comments + shares;
        });

        // Platform-specific breakdown
        metrics.platformBreakdown[platform.platform] = {
          posts: platform.posts.length,
          avgEngagement: platform.posts.length > 0 ? 
            platform.posts.reduce((sum, post) => {
              const likes = post.like_count || post.likes?.summary?.total_count || 0;
              const comments = post.comments_count || post.comments?.summary?.total_count || 0;
              const shares = post.shares?.count || 0;
              return sum + likes + comments + shares;
            }, 0) / platform.posts.length : 0
        };
      }
    });

    metrics.averageEngagementRate = metrics.totalFollowers > 0 
      ? (metrics.totalEngagement / metrics.totalFollowers * 100).toFixed(2)
      : 0;

    return metrics;
  };

  const generateROIReport = () => {
    const metrics = calculateAggregatedMetrics();
    const monthlyServiceCost = serviceMetrics.monthlyFee || 1000; // Default $1000
    
    // Calculate estimated value generated
    const estimatedReachValue = metrics.totalEngagement * 0.1; // $0.10 per engagement
    const brandAwarenessValue = metrics.totalFollowers * 0.05; // $0.05 per follower
    const contentCreationValue = metrics.totalPosts * 25; // $25 per post created
    
    const totalValueGenerated = estimatedReachValue + brandAwarenessValue + contentCreationValue;
    const roi = ((totalValueGenerated - monthlyServiceCost) / monthlyServiceCost * 100).toFixed(1);

    return {
      monthlyInvestment: monthlyServiceCost,
      valueGenerated: totalValueGenerated,
      roi: parseFloat(roi),
      breakdown: {
        reachValue: estimatedReachValue,
        brandValue: brandAwarenessValue,
        contentValue: contentCreationValue
      }
    };
  };

  const metrics = calculateAggregatedMetrics();
  const roiData = generateROIReport();

  const exportCustomerReport = () => {
    const reportData = {
      customerInfo,
      reportDate: new Date().toISOString(),
      timeRange: selectedPeriod,
      aggregatedMetrics: metrics,
      roiAnalysis: roiData,
      platformData: platformData.map(platform => ({
        platform: platform.platform,
        followers: platform.accountInfo?.followers_count || 0,
        posts: platform.posts?.length || 0,
        totalEngagement: platform.posts?.reduce((sum, post) => {
          const likes = post.like_count || post.likes?.summary?.total_count || 0;
          const comments = post.comments_count || post.comments?.summary?.total_count || 0;
          const shares = post.shares?.count || 0;
          return sum + likes + comments + shares;
        }, 0) || 0
      })),
      keyInsights: [
        `Generated ${metrics.totalEngagement.toLocaleString()} total engagements across all platforms`,
        `Maintained ${metrics.averageEngagementRate}% average engagement rate`,
        `Created and published ${metrics.totalPosts} pieces of content`,
        `Achieved ${roiData.roi}% ROI on social media investment`
      ]
    };

    // Generate PDF-ready JSON report
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customer-value-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-8">
        <div className="flex items-center justify-center space-x-3 mb-4">
          <div className="bg-indigo-600 p-3 rounded-2xl">
            <Award className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-indigo-900">Customer Value Report</h1>
        </div>
        <p className="text-indigo-700 text-lg">
          Demonstrating the measurable impact of our social media content strategy
        </p>
        <p className="text-indigo-600 text-sm mt-2">
          Report Period: Last {selectedPeriod} days | Generated on {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* ROI Summary */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="bg-green-600 p-4 rounded-2xl">
              <Target className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-900">Return on Investment</h2>
              <p className="text-green-700">Your social media investment performance</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-4xl font-bold text-green-900">{roiData.roi > 0 ? '+' : ''}{roiData.roi}%</p>
            <p className="text-green-700 font-medium">ROI This Period</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white bg-opacity-70 rounded-xl p-4">
            <h4 className="font-semibold text-green-800 mb-2">Monthly Investment</h4>
            <p className="text-2xl font-bold text-green-900">${roiData.monthlyInvestment.toLocaleString()}</p>
          </div>
          <div className="bg-white bg-opacity-70 rounded-xl p-4">
            <h4 className="font-semibold text-green-800 mb-2">Value Generated</h4>
            <p className="text-2xl font-bold text-green-900">${Math.round(roiData.valueGenerated).toLocaleString()}</p>
          </div>
          <div className="bg-white bg-opacity-70 rounded-xl p-4">
            <h4 className="font-semibold text-green-800 mb-2">Reach Value</h4>
            <p className="text-xl font-bold text-green-900">${Math.round(roiData.breakdown.reachValue).toLocaleString()}</p>
            <p className="text-sm text-green-700">{metrics.totalEngagement.toLocaleString()} engagements</p>
          </div>
          <div className="bg-white bg-opacity-70 rounded-xl p-4">
            <h4 className="font-semibold text-green-800 mb-2">Content Value</h4>
            <p className="text-xl font-bold text-green-900">${Math.round(roiData.breakdown.contentValue).toLocaleString()}</p>
            <p className="text-sm text-green-700">{metrics.totalPosts} posts created</p>
          </div>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-600 p-3 rounded-xl">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center text-blue-600 text-sm font-medium">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span>Growing</span>
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{metrics.totalFollowers.toLocaleString()}</p>
            <p className="text-sm text-gray-600 font-medium">Total Reach</p>
            <p className="text-xs text-gray-500 mt-1">Across all platforms</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-red-500 p-3 rounded-xl">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center text-green-600 text-sm font-medium">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span>{metrics.averageEngagementRate}%</span>
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{metrics.totalEngagement.toLocaleString()}</p>
            <p className="text-sm text-gray-600 font-medium">Total Engagements</p>
            <p className="text-xs text-gray-500 mt-1">Likes, comments, shares</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-600 p-3 rounded-xl">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center text-purple-600 text-sm font-medium">
              <Calendar className="h-4 w-4 mr-1" />
              <span>Consistent</span>
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{metrics.totalPosts}</p>
            <p className="text-sm text-gray-600 font-medium">Content Pieces</p>
            <p className="text-xs text-gray-500 mt-1">Created & published</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-600 p-3 rounded-xl">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div className="flex items-center text-orange-600 text-sm font-medium">
              <Award className="h-4 w-4 mr-1" />
              <span>Optimized</span>
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-900">{metrics.averageEngagementRate}%</p>
            <p className="text-sm text-gray-600 font-medium">Engagement Rate</p>
            <p className="text-xs text-gray-500 mt-1">Above industry average</p>
          </div>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">Platform Performance Breakdown</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(metrics.platformBreakdown).map(([platform, data]) => (
            <div key={platform} className="bg-gray-50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-900 capitalize">{platform}</h4>
                <div className={`w-4 h-4 rounded-full ${
                  platform === 'facebook' ? 'bg-blue-600' :
                  platform === 'instagram' ? 'bg-pink-600' :
                  platform === 'youtube' ? 'bg-red-600' :
                  'bg-gray-600'
                }`}></div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Posts Created:</span>
                  <span className="font-semibold">{data.posts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg. Engagement:</span>
                  <span className="font-semibold">{Math.round(data.avgEngagement)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Performance:</span>
                  <span className="font-semibold text-green-600">Strong</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Value Proposition */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-8">
        <h3 className="text-2xl font-bold text-indigo-900 mb-6">Our Service Impact</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-semibold text-indigo-800 mb-4">📈 What We've Achieved</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span className="text-indigo-700">
                  Generated <strong>{metrics.totalEngagement.toLocaleString()}</strong> total engagements across all your social media platforms
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span className="text-indigo-700">
                  Maintained a <strong>{metrics.averageEngagementRate}%</strong> average engagement rate, exceeding industry standards
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span className="text-indigo-700">
                  Created and published <strong>{metrics.totalPosts}</strong> high-quality, engaging content pieces
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <span className="text-indigo-700">
                  Delivered an estimated <strong>${Math.round(roiData.valueGenerated).toLocaleString()}</strong> in marketing value
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-indigo-800 mb-4">🎯 Ongoing Benefits</h4>
            <ul className="space-y-3">
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <span className="text-indigo-700">
                  Consistent brand presence across all major social platforms
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <span className="text-indigo-700">
                  Professional content creation saving you 20+ hours weekly
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <span className="text-indigo-700">
                  Data-driven optimization improving performance over time
                </span>
              </li>
              <li className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <span className="text-indigo-700">
                  Enhanced audience engagement and brand loyalty
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-indigo-200 text-center">
          <p className="text-indigo-700 font-medium">
            💡 <strong>Bottom Line:</strong> Our content strategy has generated a <strong>{roiData.roi}% ROI</strong> 
            while building your brand and engaging your audience consistently across all platforms.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center space-x-4">
        <button
          onClick={exportCustomerReport}
          className="flex items-center space-x-2 bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
        >
          <Download className="h-5 w-5" />
          <span>Export Full Report</span>
        </button>
        
        <button className="flex items-center space-x-2 bg-gray-100 text-gray-700 px-8 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium">
          <BarChart3 className="h-5 w-5" />
          <span>View Detailed Analytics</span>
        </button>
      </div>
    </div>
  );
};

export default CustomerValueDashboard;