import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Filter, Search, Upload, MessageSquare, CheckCircle, Clock, AlertCircle, Palette } from 'lucide-react';
import Footer from '../admin/components/layout/Footer';

function Assignments() {
  const navigate = useNavigate();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock data for content assignments
  const assignments = [
    {
      id: 1,
      customer: 'Shoppers Stop',
      title: 'New Collection Launch Post',
      type: 'Instagram Post',
      description: 'Create an engaging Instagram post for the new summer collection launch',
      dueDate: '2024-03-18',
      status: 'assigned',
      priority: 'high',
      assignedDate: '2024-03-15'
    },
    {
      id: 2,
      customer: 'Pantaloons',
      title: 'Facebook Campaign Creative',
      type: 'Facebook Ad',
      description: 'Design Facebook ad creative for the weekend sale campaign',
      dueDate: '2024-03-19',
      status: 'in_progress',
      priority: 'medium',
      assignedDate: '2024-03-14'
    },
    {
      id: 3,
      customer: 'Fashion Hub',
      title: 'LinkedIn Article',
      type: 'LinkedIn Post',
      description: 'Write a professional article about sustainable fashion trends',
      dueDate: '2024-03-20',
      status: 'waiting_input',
      priority: 'low',
      assignedDate: '2024-03-13'
    },
    {
      id: 4,
      customer: 'Style Central',
      title: 'Product Photography',
      type: 'Photography',
      description: 'Product photos for new accessories line',
      dueDate: '2024-03-22',
      status: 'approved',
      priority: 'high',
      assignedDate: '2024-03-12'
    },
    {
      id: 5,
      customer: 'Trendy Wear',
      title: 'YouTube Video Script',
      type: 'Video Content',
      description: 'Script for brand story video for YouTube channel',
      dueDate: '2024-03-25',
      status: 'published',
      priority: 'medium',
      assignedDate: '2024-03-10'
    }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'waiting_input':
        return 'bg-orange-100 text-orange-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'published':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned':
        return <AlertCircle className="h-4 w-4" />;
      case 'in_progress':
        return <Clock className="h-4 w-4" />;
      case 'waiting_input':
        return <MessageSquare className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'published':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesFilter = selectedFilter === 'all' || assignment.status === selectedFilter;
    const matchesSearch = assignment.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         assignment.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAssignmentClick = (assignment) => {
    // Navigate to assignment detail page
    // Only navigate if the page exists
    // For this example, do nothing (or show a message) if not implemented
    // navigate(`/content-creator/assignments/${assignment.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
              <span className="ml-2 text-base sm:text-xl font-bold text-purple-900 truncate">Content Creator Portal</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <div className="max-w-2xl sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
          <div className="space-y-3 sm:space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Assignments</h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage your content creation assignments</p>
            </div>

            {/* Filters and Search */}
            <div className="bg-white rounded-lg shadow-md p-3 sm:p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center">
                    <Filter className="h-5 w-5 text-gray-400 mr-2" />
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="all">All Assignments</option>
                      <option value="assigned">New Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="waiting_input">Waiting Input</option>
                      <option value="approved">Approved</option>
                      <option value="published">Published</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center">
                  <div className="relative">
                    <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search assignments..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Assignments List */}
            <div className="bg-white rounded-lg shadow-md p-2 sm:p-4 md:p-6">
              <h2 className="text-xl font-semibold mb-4">
                Assignments ({filteredAssignments.length})
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {filteredAssignments.map((assignment) => (
                  <div 
                    key={assignment.id}
                    className="border rounded-lg p-3 sm:p-4 hover:bg-gray-50 cursor-pointer transition-colors w-full min-w-0"
                    onClick={() => handleAssignmentClick(assignment)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(assignment.status)}`}>
                            {getStatusIcon(assignment.status)}
                            <span className="ml-1">{assignment.status.replace('_', ' ').charAt(0).toUpperCase() + assignment.status.slice(1)}</span>
                          </span>
                          <span className={`text-xs font-medium ${getPriorityColor(assignment.priority)}`}>
                            {assignment.priority.toUpperCase()} PRIORITY
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Customer:</span> {assignment.customer}
                          </div>
                          <div>
                            <span className="font-medium">Type:</span> {assignment.type}
                          </div>
                          <div>
                            <span className="font-medium">Due Date:</span> {format(new Date(assignment.dueDate), 'MMM dd, yyyy')}
                          </div>
                        </div>
                        <p className="text-gray-700 mt-2">{assignment.description}</p>
                      </div>
                      {/* Buttons always inside the card, below content on mobile, right on desktop */}
                      <div className="flex flex-row sm:flex-col items-end sm:items-end gap-2 mt-2 sm:mt-0">
                        {assignment.status === 'assigned' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/content-creator/upload/${assignment.id}`);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700"
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Start Work
                          </button>
                        )}
                        {assignment.status === 'in_progress' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/content-creator/upload/${assignment.id}`);
                            }}
                            className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Continue
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredAssignments.length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No assignments found matching your criteria.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Assignments;