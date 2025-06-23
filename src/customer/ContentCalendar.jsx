import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { MessageSquare, Instagram, Facebook, Linkedin, Youtube, AlertCircle, Eye } from 'lucide-react';

function ContentCalendar() {
  const navigate = useNavigate();
  const [selectedContent, setSelectedContent] = useState(null);
  const [selectedCalendar, setSelectedCalendar] = useState('calendar1');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Mock data for multiple content calendars
  const contentCalendars = {
    calendar1: {
      name: 'Main Brand Calendar',
      items: [
        {
          id: 1,
          date: '2024-03-15',
          status: 'published',
          description: 'New product launch post',
          commentCount: 12,
          platforms: ['instagram', 'facebook'],
          engagement: { likes: 245, shares: 45 }
        },
        {
          id: 2,
          date: '2024-03-16',
          status: 'under_review',
          description: 'Customer testimonial showcase',
          commentCount: 3,
          platforms: ['linkedin'],
          engagement: { likes: 89, shares: 12 }
        },
        {
          id: 3,
          date: '2024-03-17',
          status: 'draft',
          description: 'Behind the scenes video',
          commentCount: 0,
          platforms: ['youtube', 'instagram'],
          engagement: { likes: 0, shares: 0 }
        }
      ]
    },
    calendar2: {
      name: 'Seasonal Campaign',
      items: [
        {
          id: 4,
          date: '2024-03-18',
          status: 'published',
          description: 'Spring collection announcement',
          commentCount: 25,
          platforms: ['instagram', 'facebook', 'linkedin'],
          engagement: { likes: 456, shares: 78 }
        },
        {
          id: 5,
          date: '2024-03-19',
          status: 'waiting_input',
          description: 'Customer feedback compilation',
          commentCount: 0,
          platforms: ['facebook'],
          engagement: { likes: 0, shares: 0 }
        }
      ]
    },
    calendar3: {
      name: 'Event Promotions',
      items: [
        {
          id: 6,
          date: '2024-03-20',
          status: 'scheduled',
          description: 'Upcoming webinar promotion',
          commentCount: 0,
          platforms: ['linkedin', 'youtube'],
          engagement: { likes: 0, shares: 0 }
        }
      ]
    }
  };

  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'instagram':
        return <Instagram className="h-5 w-5 text-pink-600" />;
      case 'facebook':
        return <Facebook className="h-5 w-5 text-blue-600" />;
      case 'linkedin':
        return <Linkedin className="h-5 w-5 text-blue-700" />;
      case 'youtube':
        return <Youtube className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'under_review':
        return 'bg-yellow-100 text-yellow-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'waiting_input':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'waiting_input':
        return 'Waiting Input';
      default:
        return status.replace('_', ' ').charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const handleContentClick = (content) => {
    setSelectedContent(content.status === 'published' ? content : null);
  };

  const currentCalendar = contentCalendars[selectedCalendar];

  // Add all possible statuses for filter buttons
  const statusOptions = [
    { key: 'all', label: 'All', color: 'bg-gray-200 text-gray-800' },
    { key: 'published', label: 'Published', color: 'bg-green-100 text-green-800' },
    { key: 'under_review', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
    { key: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
    { key: 'waiting_input', label: 'Waiting Input', color: 'bg-orange-100 text-orange-800' },
    { key: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' }
  ];

  // Filter and sort items based on statusFilter
  const filteredItems = statusFilter === 'all'
    ? currentCalendar.items
    : currentCalendar.items.filter(item => item.status === statusFilter);

  // Sort items so that filtered status appears first
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (statusFilter === 'all') return 0;
    if (a.status === statusFilter && b.status !== statusFilter) return -1;
    if (a.status !== statusFilter && b.status === statusFilter) return 1;
    return 0;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Calendar Selection Sidebar */}
          <div className="lg:w-1/4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Content Calendars</h3>
              <div className="space-y-2">
                {Object.entries(contentCalendars).map(([key, calendar]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCalendar(key);
                      setStatusFilter('all');
                    }}
                    className={`w-full text-left p-3 rounded-md transition-colors ${
                      selectedCalendar === key
                        ? 'bg-[#1a1f2e] text-white'
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{calendar.name}</div>
                    <div className="text-sm opacity-75">{calendar.items.length} items</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Calendar Content */}
          <div className="lg:w-3/4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{currentCalendar.name}</h2>
                  <p className="text-gray-600 text-sm mt-1">Manage your content schedule</p>
                </div>
                {/* Status Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map(option => (
                    <button
                      key={option.key}
                      onClick={() => setStatusFilter(option.key)}
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border transition-colors
                        ${statusFilter === option.key
                          ? `${option.color} border-[#1a1f2e]`
                          : `${option.color.replace('bg-', 'bg-opacity-50 bg-')} border-transparent hover:border-gray-300`
                        }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-4">
                {sortedItems.map((item) => (
                  <div 
                    key={item.id} 
                    className={`border rounded-lg p-4 ${
                      item.status === 'published' ? 'cursor-pointer hover:bg-gray-50' : ''
                    } transition-colors`}
                    onClick={() => handleContentClick(item)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <span className="text-gray-600">{format(new Date(item.date), 'MMM dd, yyyy')}</span>
                        <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(item.status)}`}>
                          {getStatusLabel(item.status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center text-gray-500">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          <span>{item.commentCount}</span>
                        </div>
                        {item.status === 'published' && (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700 mb-3">{item.description}</p>
                    
                    {/* Platform Icons */}
                    <div className="flex items-center space-x-2">
                      {item.platforms.map((platform) => (
                        <div key={platform} className="text-gray-500">
                          {getPlatformIcon(platform)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {sortedItems.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No content items found in this calendar.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Details Modal */}
      {selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Content Details</h3>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">{format(new Date(selectedContent.date), 'MMMM dd, yyyy')}</p>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500">Description</p>
                  <p className="font-medium">{selectedContent.description}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Published On</p>
                  <div className="flex items-center space-x-3 mt-2">
                    {selectedContent.platforms.map((platform) => (
                      <div key={platform} className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-md">
                        {getPlatformIcon(platform)}
                        <span className="capitalize">{platform}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Engagement</p>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-gray-100 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Likes</p>
                      <p className="font-medium">{selectedContent.engagement.likes}</p>
                    </div>
                    <div className="bg-gray-100 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Shares</p>
                      <p className="font-medium">{selectedContent.engagement.shares}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedContent(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentCalendar;