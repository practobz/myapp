import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, Calendar, User, Tag } from 'lucide-react';

function ContentApproval() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [approvalNotes, setApprovalNotes] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [publishTime, setPublishTime] = useState('');

  // Mock content data
  const content = {
    id: 1,
    title: 'New Collection Launch Post',
    description: 'Instagram post for the new summer collection launch',
    createdBy: 'Sarah Johnson',
    createdDate: '2024-03-15',
    dueDate: '2024-03-18',
    platform: 'Instagram',
    imageUrl: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800',
    caption: 'Discover our stunning new summer collection! ☀️ Fresh styles, vibrant colors, and unbeatable comfort. Shop now and embrace the season in style! #SummerCollection #Fashion #NewArrivals #Style',
    hashtags: ['#SummerCollection', '#Fashion', '#NewArrivals', '#Style', '#Shopping'],
    targetAudience: 'Women 25-45, Fashion enthusiasts',
    estimatedReach: '15,000 - 25,000',
    bestPostingTime: '6:00 PM - 8:00 PM'
  };

  const handleApprove = () => {
    const approvalData = {
      contentId: id,
      status: 'approved',
      approvalNotes,
      publishDate,
      publishTime,
      approvedAt: new Date().toISOString()
    };
    
    console.log('Approving content:', approvalData);
    // In a real app, this would make an API call
    alert('Content approved successfully!');
    navigate('/customer/content-review');
  };

  const handleReject = () => {
    if (!approvalNotes.trim()) {
      alert('Please provide feedback for rejection.');
      return;
    }
    
    const rejectionData = {
      contentId: id,
      status: 'rejected',
      rejectionReason: approvalNotes,
      rejectedAt: new Date().toISOString()
    };
    
    console.log('Rejecting content:', rejectionData);
    // In a real app, this would make an API call
    alert('Content rejected. Creator will be notified.');
    navigate('/customer/content-review');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Content Approval</h1>
            <p className="text-gray-600 mt-2">Review and approve content for publishing</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Content Preview */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h2 className="text-xl font-semibold mb-4">Content Preview</h2>
                
                {/* Image */}
                <div className="mb-6">
                  <img 
                    src={content.imageUrl} 
                    alt={content.title}
                    className="w-full h-80 object-cover rounded-lg"
                  />
                </div>

                {/* Caption */}
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Caption</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{content.caption}</p>
                </div>

                {/* Hashtags */}
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900 mb-2">Hashtags</h3>
                  <div className="flex flex-wrap gap-2">
                    {content.hashtags.map((tag, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content Details */}
                <div className="space-y-3 text-sm">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-600">Created by:</span>
                    <span className="ml-2 font-medium">{content.createdBy}</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-600">Due date:</span>
                    <span className="ml-2 font-medium">{new Date(content.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center">
                    <Tag className="h-4 w-4 text-gray-500 mr-2" />
                    <span className="text-gray-600">Platform:</span>
                    <span className="ml-2 font-medium">{content.platform}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval Form */}
            <div className="space-y-6">
              {/* Content Analytics */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Content Analytics</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
                    <p className="text-gray-900">{content.targetAudience}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Reach</label>
                    <p className="text-gray-900">{content.estimatedReach}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Best Posting Time</label>
                    <p className="text-gray-900">{content.bestPostingTime}</p>
                  </div>
                </div>
              </div>

              {/* Publishing Schedule */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Publishing Schedule</h2>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="publishDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Publish Date
                    </label>
                    <input
                      type="date"
                      id="publishDate"
                      value={publishDate}
                      onChange={(e) => setPublishDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a1f2e]"
                    />
                  </div>
                  <div>
                    <label htmlFor="publishTime" className="block text-sm font-medium text-gray-700 mb-1">
                      Publish Time
                    </label>
                    <input
                      type="time"
                      id="publishTime"
                      value={publishTime}
                      onChange={(e) => setPublishTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a1f2e]"
                    />
                  </div>
                </div>
              </div>

              {/* Approval Notes */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold mb-4">Approval Notes</h2>
                <textarea
                  placeholder="Add any notes or feedback for the content creator..."
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1a1f2e]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4">
                <button
                  onClick={handleApprove}
                  className="flex-1 bg-green-600 text-white py-3 px-6 rounded-md hover:bg-green-700 flex items-center justify-center"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Approve & Schedule
                </button>
                <button
                  onClick={handleReject}
                  className="flex-1 bg-red-600 text-white py-3 px-6 rounded-md hover:bg-red-700 flex items-center justify-center"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContentApproval;