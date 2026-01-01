import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Calendar, CreditCard, Package } from 'lucide-react';

// Subscription plans data
const plans = [
  {
    planName: "Basic Plan",
    price: "₹10,000",
    billingCycle: "Monthly",
    status: "Active",
    features: [
      "Increase in Followers (Organic Growth)",
      "Content Creation (with Keywords) – 2 Platforms (Instagram & LinkedIn)",
      "8-10 professional posts (images) incl. 1 reel/month",
      "Captions with trending keywords & hashtags",
      "Client feedback mentions on stories/highlights",
      "End-to-end handling: Post scheduling for 2 platforms",
      "Monthly performance summaries & analysis",
      "Account Management (Basic)",
      "Steady growth via hashtags, eco-communities, industry pages",
      "Hassle-free digital presence – focus on business, we manage growth"
    ],
    nextBillingDate: "2024-04-15",
    autoRenewal: true,
    startDate: "2024-01-15",
    endDate: "2024-12-15"
  },
  {
    planName: "Growth Plan",
    price: "₹16,000",
    billingCycle: "Monthly",
    status: "Inactive",
    features: [
      "Account Management (3 Platforms: Instagram, LinkedIn, Facebook)",
      "Curate, schedule & automate posting",
      "Handle queries & customer engagement",
      "Detailed insights & recommendations, monthly strategic call",
      "Content Creation & Posting (12-15 posts/month)",
      "Premium creative mix: reels, explainers, testimonials, campaigns",
      "Platform-specific formats & SEO-focused keywords",
      "Targeted Followers Growth: engagement campaigns, follow-back, networking",
      "Community growth via campaigns & interactive posts",
      "Feedback & Review Integration: client feedbacks, story highlights"
    ],
    nextBillingDate: "2024-04-15",
    autoRenewal: true,
    startDate: "2024-01-15",
    endDate: "2024-12-15"
  },
  {
    planName: "Premium Plan",
    price: "₹24,000",
    billingCycle: "Monthly",
    status: "Inactive",
    features: [
      "Account Management (4 Platforms: Instagram, LinkedIn, Facebook, YouTube/Shorts)",
      "360° digital presence, ad monitoring, lead response, engagement",
      "Deep-dive monthly reports, 2 strategic calls",
      "Premium Content Creation: creative + video, professional shoots, animated explainers, 3D flows",
      "Client feedbacks, case studies & testimonials",
      "Followers Growth (Organic + Paid): paid campaigns, influencer tie-ups",
      "Basic SEO: keyword research, website & meta-data upgrade",
      "Paid Promotion: 2 free Instagram Reel boosts/month, Google Ads, influencer collaborations",
      "Analytics & Reporting: ROI insights, growth trends, strategy upgrades",
      "Track engagement, followers, leads generated"
    ],
    nextBillingDate: "2024-04-15",
    autoRenewal: true,
    startDate: "2024-01-15",
    endDate: "2024-12-15"
  }
];

function Subscription() {
  const navigate = useNavigate();
  // Assume the first plan is the user's current plan for demo
  const currentPlanIndex = 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="px-6 sm:px-8 lg:px-12 xl:px-16 2xl:px-24 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Package className="h-6 w-6" />
                </div>
                <h1 className="text-4xl font-bold">Subscription Plans</h1>
              </div>
              <p className="text-blue-50 text-lg mt-2">Compare and manage your Aureum Solutions subscription</p>
            </div>
          </div>

          {/* Plans Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{plans.map((plan, idx) => (
              <div key={plan.planName} className={`bg-white rounded-2xl shadow-lg p-6 border-2 transition-all hover:shadow-2xl ${idx === currentPlanIndex ? 'border-indigo-600 ring-4 ring-indigo-100' : 'border-slate-200'}`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`p-3 rounded-xl ${idx === currentPlanIndex ? 'bg-gradient-to-br from-indigo-500 to-blue-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'}`}>
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-slate-800">{plan.planName}</h2>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      idx === currentPlanIndex ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {idx === currentPlanIndex ? '✓ Current Plan' : 'Available'}
                    </span>
                  </div>
                </div>
                <div className="text-left mb-6">
                  <p className="text-3xl font-bold text-slate-800">{plan.price}</p>
                  <p className="text-sm text-slate-500">per {plan.billingCycle.toLowerCase()}</p>
                </div>
                <div className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-2 text-xs text-slate-600 mb-6 p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <span className="font-medium">Start:</span> {new Date(plan.startDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-600" />
                    <span className="font-medium">End:</span> {new Date(plan.endDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-indigo-600" />
                    <span className="font-medium">Next Billing:</span> {new Date(plan.nextBillingDate).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Auto-renewal:</span> 
                    <span className={`px-2 py-0.5 rounded-full ${plan.autoRenewal ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {plan.autoRenewal ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
                <div>
                  {idx === currentPlanIndex ? (
                    <button className="w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl shadow-md cursor-not-allowed opacity-75">
                      Your Current Plan
                    </button>
                  ) : (
                    <button className="w-full px-6 py-3 bg-gradient-to-r from-slate-100 to-blue-100 text-slate-700 font-semibold rounded-xl hover:from-indigo-100 hover:to-blue-200 transition-all shadow-md hover:shadow-lg border border-slate-200" onClick={() => {/* handle upgrade logic */}}>
                      Switch to {plan.planName}
                    </button>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">Billing Information</h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl">
              <span className="text-slate-700 font-medium">Auto-renewal</span>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                plans[currentPlanIndex].autoRenewal ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white' : 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
              }`}>
                {plans[currentPlanIndex].autoRenewal ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl">
              <span className="text-slate-700 font-medium">Payment Method</span>
              <span className="text-slate-800 font-semibold">•••• •••• •••• 1234</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="group px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
            <Package className="h-5 w-5 group-hover:scale-110 transition-transform" />
            Upgrade Plan
          </button>
          <button className="group px-6 py-3 bg-gradient-to-r from-slate-100 to-blue-100 text-slate-700 font-semibold rounded-xl hover:from-slate-200 hover:to-blue-200 transition-all shadow-md hover:shadow-lg border border-slate-200 flex items-center justify-center gap-2">
            <CreditCard className="h-5 w-5 group-hover:scale-110 transition-transform" />
            Download Invoice
          </button>
          <button className="group px-6 py-3 bg-gradient-to-r from-slate-100 to-blue-100 text-slate-700 font-semibold rounded-xl hover:from-slate-200 hover:to-blue-200 transition-all shadow-md hover:shadow-lg border border-slate-200 flex items-center justify-center gap-2">
            <CreditCard className="h-5 w-5 group-hover:scale-110 transition-transform" />
            Manage Payment Method
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}

export default Subscription;