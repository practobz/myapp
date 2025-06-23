import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Calendar, CreditCard, Package } from 'lucide-react';

function Subscription() {
  const navigate = useNavigate();

  // Mock subscription data
  const subscription = {
    planName: "Professional Plan",
    price: "₹15,000",
    billingCycle: "Monthly",
    startDate: "2024-01-15",
    endDate: "2024-12-15",
    status: "Active",
    features: [
      "Up to 5 Content Calendars",
      "Unlimited Social Media Posts",
      "Multi-platform Publishing",
      "Advanced Analytics",
      "Priority Customer Support",
      "Content Review & Approval",
      "Team Collaboration Tools",
      "Custom Branding Options"
    ],
    nextBillingDate: "2024-04-15",
    autoRenewal: true
  };

  return (
    <div className="max-w-md sm:max-w-lg md:max-w-2xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10">
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">My Subscription</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage your Aureum Solutions subscription</p>
        </div>

        {/* Subscription Overview */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 w-full min-w-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-2 md:gap-0">
            <div className="flex items-center min-w-0">
              <div className="p-3 bg-green-100 rounded-full">
                <Package className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4 min-w-0">
                <h2 className="text-lg sm:text-xl font-semibold truncate">{subscription.planName}</h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  subscription.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {subscription.status}
                </span>
              </div>
            </div>
            <div className="text-left md:text-right mt-3 md:mt-0">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{subscription.price}</p>
              <p className="text-xs sm:text-sm text-gray-500">per {subscription.billingCycle.toLowerCase()}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-6">
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg w-full min-w-0">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Start Date</span>
              </div>
              <p className="text-base sm:text-lg font-semibold mt-1">{new Date(subscription.startDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg w-full min-w-0">
              <div className="flex items-center">
                <Calendar className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">End Date</span>
              </div>
              <p className="text-base sm:text-lg font-semibold mt-1">{new Date(subscription.endDate).toLocaleDateString()}</p>
            </div>
            <div className="bg-gray-50 p-3 sm:p-4 rounded-lg w-full min-w-0">
              <div className="flex items-center">
                <CreditCard className="h-5 w-5 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Next Billing</span>
              </div>
              <p className="text-base sm:text-lg font-semibold mt-1">{new Date(subscription.nextBillingDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="border-t pt-4 md:pt-6">
            <h3 className="text-lg font-semibold mb-2 md:mb-4">Plan Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              {subscription.features.map((feature, index) => (
                <div key={index} className="flex items-center">
                  <Check className="h-5 w-5 text-green-600 mr-3 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Billing Information */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 w-full min-w-0">
          <h3 className="text-lg font-semibold mb-2 md:mb-4">Billing Information</h3>
          <div className="space-y-2 sm:space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Auto-renewal</span>
              <span className={`px-3 py-1 rounded-full text-sm ${
                subscription.autoRenewal ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {subscription.autoRenewal ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment Method</span>
              <span className="text-gray-900">•••• •••• •••• 1234</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
          <button className="btn-primary w-full sm:w-auto">
            Upgrade Plan
          </button>
          <button className="btn-secondary w-full sm:w-auto">
            Download Invoice
          </button>
          <button className="btn-secondary w-full sm:w-auto">
            Manage Payment Method
          </button>
        </div>
      </div>
    </div>
  );
}

export default Subscription;