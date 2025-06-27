import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, Eye, MessageSquare, Calendar, User, Palette } from 'lucide-react';

function ContentPortfolio() {
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent] = useState(null);

  // Mock data for content creator's portfolio
  const portfolioItems = [
    {
      id: 1,
      title: 'New Collection Launch Post',
      customer: 'Shoppers Stop',
      platform: 'Instagram',
      status: 'under_review',
      createdDate: '2024-03-15',
      imageUrl: 'https://images.pexels.com/photos/996329/pexels-photo-996329.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Instagram post for the new summer collection launch',
      customerFeedback: [
        {
          id: 1,
          message: 'Great work! Can you make the text more prominent?',
          timestamp: '2024-03-15 2:30 PM',
          status: 'revision_requested'
        }
      ]
    },
    {
      id: 2,
      title: 'Weekend Sale Campaign',
      customer: 'Pantaloons',
      platform: 'Facebook',
      status: 'approved',
      createdDate: '2024-03-14',
      imageUrl: 'https://images.pexels.com/photos/230544/pexels-photo-230544.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'Facebook ad creative for weekend sale promotion',
      customerFeedback: [
        {
          id: 1,
          message: 'Perfect! This captures exactly what we wanted. Approved for publishing.',
          timestamp: '2024-03-14 4:15 PM',
          status: 'approved'
        }
      ]
    },
    {
      id: 3,
      title: 'Product Showcase Video',
      customer: 'Fashion Hub',
      platform: 'YouTube',
      status: 'published',
      createdDate: '2024-03-13',
      imageUrl: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800',
      description: 'YouTube video showcasing new product features',
      customerFeedback: [
        {
          id: 1,
          message: 'Excellent work! The video quality and storytelling are outstanding.',
          timestamp: '2024-03-13 6:00 PM',
          status: 'approved'
        }
      ]
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-blue-100 text-blue-800';
      case 'revision_requested':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUploadRevision = (contentId) => {
    // Navigate to upload page for revision
    navigate(`/content-creator/upload/${contentId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/content-creator')}
              className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Palette className="h-6 w-6 text-purple-600" />
              </div>
              <span className="ml-2 text-xl font-bold text-purple-900">Content Creator Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Content Portfolio</h1>
            <p className="text-gray-600 mt-2">View your created content and customer feedback</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {portfolioItems.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                {/* Content Image */}
                <div className="relative">
                  <img 
                    src={item.imageUrl} 
                    alt={item.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-4 right-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ').charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedContent(selectedContent === item.id ? null : item.id)}
                    className="absolute bottom-4 right-4 bg-white bg-opacity-90 p-2 rounded-full hover:bg-opacity-100 transition-all"
                  >
                    <Eye className="h-4 w-4 text-gray-700" />
                  </button>
                </div>

                {/* Content Details */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {item.customer}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(item.createdDate).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    Platform: {item.platform}
                  </div>

                  {/* Customer Feedback */}
                  {selectedContent === item.id && item.customerFeedback.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <h4 className="font-medium text-sm mb-2 flex items-center">
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Customer Feedback
                      </h4>
                      <div className="space-y-2">
                        {item.customerFeedback.map((feedback) => (
                          <div key={feedback.id} className="bg-gray-50 p-2 rounded-md">
                            <p className="text-sm text-gray-700">{feedback.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{feedback.timestamp}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  {item.status === 'under_review' && item.customerFeedback.some(f => f.status === 'revision_requested') && (
                    <div className="mt-3">
                      <button
                        onClick={() => handleUploadRevision(item.id)}
                        className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 text-sm flex items-center justify-center"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Revision
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {portfolioItems.length === 0 && (
            <div className="text-center py-12">
              <Palette className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No content created yet. Start working on your first assignment!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContentPortfolio;