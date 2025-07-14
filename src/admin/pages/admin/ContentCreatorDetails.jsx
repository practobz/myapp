import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Calendar,
  AlertCircle,
  Building,
  Hash,
  ChevronRight,
  ChevronDown,
  Palette,
  Briefcase,
  Award,
  Shield
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

function ContentCreatorDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [creator, setCreator] = useState(null);
  const [assignedCalendars, setAssignedCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedCalendars, setExpandedCalendars] = useState(new Set());

  useEffect(() => {
    fetchCreatorDetails();
  }, [id]);

  useEffect(() => {
    if (creator) {
      fetchAssignedCalendars();
    }
  }, [creator]);

  const fetchCreatorDetails = async () => {
    try {
      setLoading(true);
      
      // First try to get all content creators and find the one with matching ID
      const allCreatorsResponse = await fetch(`${API_URL}/users?role=content_creator`);
      if (!allCreatorsResponse.ok) throw new Error('Failed to fetch content creators');
      
      const allCreatorsData = await allCreatorsResponse.json();
      const creators = Array.isArray(allCreatorsData) ? allCreatorsData : (allCreatorsData.creators || []);
      
      console.log('All creators:', creators);
      console.log('Looking for ID:', id);
      
      // Find the creator with matching ID
      const foundCreator = creators.find(creator => creator._id === id);
      
      if (!foundCreator) {
        // If not found in the list, try the individual endpoint as fallback
        const individualResponse = await fetch(`${API_URL}/users/${id}`);
        if (!individualResponse.ok) throw new Error('Creator not found');
        
        const individualData = await individualResponse.json();
        console.log('Individual creator API Response:', individualData);
        
        // Handle different response formats
        const creatorData = individualData.doc || individualData;
        setCreator(creatorData);
      } else {
        console.log('Found creator:', foundCreator);
        setCreator(foundCreator);
      }
      
    } catch (err) {
      setError('Failed to load creator details');
      console.error('Error fetching creator:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedCalendars = async () => {
    try {
      const response = await fetch(`${API_URL}/calendars`);
      if (!response.ok) throw new Error('Failed to fetch calendars');
      const calendars = await response.json();
      
      // Get creator email
      const creatorEmail = creator?.email;
      
      if (!creatorEmail) {
        console.log('No creator email found, skipping calendar assignment check');
        return;
      }
      
      // Filter calendars assigned to this creator
      const assigned = calendars.filter(calendar => 
        calendar.assignedTo === creatorEmail || 
        (calendar.contentItems && calendar.contentItems.some(item => item.assignedTo === creatorEmail))
      );
      
      // Enrich with customer names
      const enrichedCalendars = await Promise.all(
        assigned.map(async (calendar) => {
          try {
            const customerResponse = await fetch(`${API_URL}/customer/${calendar.customerId}`);
            const customerData = await customerResponse.json();
            return {
              ...calendar,
              customerName: customerData.name || 'Unknown Customer'
            };
          } catch (err) {
            return {
              ...calendar,
              customerName: 'Unknown Customer'
            };
          }
        })
      );
      
      setAssignedCalendars(enrichedCalendars);
    } catch (err) {
      console.error('Error fetching assigned calendars:', err);
    }
  };

  const toggleCalendarExpansion = (calendarId) => {
    const newExpanded = new Set(expandedCalendars);
    if (newExpanded.has(calendarId)) {
      newExpanded.delete(calendarId);
    } else {
      newExpanded.add(calendarId);
    }
    setExpandedCalendars(newExpanded);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      return format(date, "MMMM dd, yyyy 'at' HH:mm");
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatSimpleDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getSpecializationDisplay = (specialization) => {
    if (!specialization) return 'Not specified';
    
    const specializationMap = {
      'graphic-design': 'Graphic Design',
      'video-editing': 'Video Editing',
      'content-writing': 'Content Writing',
      'social-media': 'Social Media Management',
      'photography': 'Photography',
      'web-design': 'Web Design'
    };
    return specializationMap[specialization] || specialization.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getExperienceDisplay = (experience) => {
    if (!experience) return 'Not specified';
    
    const experienceMap = {
      'beginner': 'Beginner (0-1 years)',
      'intermediate': 'Intermediate (2-4 years)',
      'advanced': 'Advanced (5-7 years)',
      'expert': 'Expert (8+ years)'
    };
    return experienceMap[experience] || experience.replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (isActive) => {
    return isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200';
  };

  const getStatusText = (isActive) => {
    return isActive ? 'Active' : 'Inactive';
  };

  if (loading) {
    return (
      <AdminLayout title="Content Creator Details">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500 font-medium">Loading creator details...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !creator) {
    return (
      <AdminLayout title="Content Creator Details">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200/50 max-w-md mx-auto mt-20">
            <div className="text-center">
              <div className="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Creator not found</h3>
              <p className="text-gray-600 mb-6">{error || "The content creator you're looking for doesn't exist."}</p>
              <button
                onClick={() => navigate('/admin/content-creators')}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Content Creators
              </button>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Content Creator Details">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="space-y-8">
          {/* Header Section with Navigation */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/admin/content-creators')}
                  className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="flex items-center">
                  <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white font-bold text-lg">
                      {(creator.name || creator.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="ml-4">
                    <h2 className="text-2xl font-bold text-gray-900">{creator.name || creator.email || 'Unnamed Creator'}</h2>
                    <p className="text-gray-600">Content Creator Profile & Assignments</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(creator.isActive)}`}>
                  {getStatusText(creator.isActive)}
                </span>
              </div>
            </div>
          </div>

          {/* Creator Information */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-8 border border-gray-200/50">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Creator Information</h3>
              <p className="text-gray-600">Complete profile and contact details</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Personal Details</h4>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Full Name</p>
                      <p className="text-gray-900 font-medium">{creator.name || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Email Address</p>
                      <p className="text-gray-900 font-medium">{creator.email || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Phone className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Mobile Number</p>
                      <p className="text-gray-900 font-medium">{creator.mobile || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <MapPin className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Address</p>
                      <p className="text-gray-900 font-medium">{creator.address || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="space-y-6">
                <h4 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Professional Details</h4>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <Building className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Role</p>
                      <p className="text-gray-900 font-medium capitalize">{creator.role?.replace('_', ' ') || 'Content Creator'}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Palette className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Specialization</p>
                      <p className="text-gray-900 font-medium">{getSpecializationDisplay(creator.specialization)}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Award className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Experience Level</p>
                      <p className="text-gray-900 font-medium">{getExperienceDisplay(creator.experience)}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-teal-100 rounded-lg">
                      <Calendar className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Registration Date</p>
                      <p className="text-gray-900 font-medium">{formatDate(creator.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 p-4 bg-gray-50/50 rounded-xl">
                    <div className="p-2 bg-pink-100 rounded-lg">
                      <Hash className="h-5 w-5 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500">Creator ID</p>
                      <p className="text-gray-900 font-mono text-sm">{creator._id}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Permissions Section */}
            {creator.permissions && creator.permissions.length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Permissions & Access</h4>
                <div className="flex flex-wrap gap-2">
                  {creator.permissions.map((permission, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                    >
                      <Shield className="h-3 w-3 mr-1" />
                      {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Assigned Calendars Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-gray-200/50">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Assigned Content Calendars</h3>
                  <p className="text-gray-600 mt-1">Content calendars assigned to this creator</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {assignedCalendars.length > 0 ? (
                <div className="space-y-4">
                  {assignedCalendars.map((calendar) => (
                    <div key={calendar._id} className="bg-white rounded-xl border border-gray-200/50 shadow-sm overflow-hidden">
                      <div 
                        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => toggleCalendarExpansion(calendar._id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Calendar className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900">{calendar.name}</h4>
                              <p className="text-sm text-gray-600">Customer: {calendar.customerName}</p>
                              <p className="text-xs text-gray-500">{calendar.contentItems?.length || 0} content items</p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                              Assigned
                            </span>
                            {expandedCalendars.has(calendar._id) ? (
                              <ChevronDown className="h-5 w-5 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                        </div>
                      </div>

                      {expandedCalendars.has(calendar._id) && (
                        <div className="border-t border-gray-200/50 bg-gray-50/50">
                          <div className="p-6">
                            <h5 className="text-sm font-semibold text-gray-700 mb-4">Content Items</h5>
                            {calendar.contentItems && calendar.contentItems.length > 0 ? (
                              <div className="space-y-3">
                                {calendar.contentItems.map((item, index) => (
                                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200/50">
                                    <div className="flex items-start justify-between">
                                      <div>
                                        <p className="font-medium text-gray-900">{item.description}</p>
                                        <p className="text-sm text-gray-600 mt-1">Due: {formatSimpleDate(item.date)}</p>
                                        {item.type && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 mt-2">
                                            {item.type}
                                          </span>
                                        )}
                                      </div>
                                      {item.status && (
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                          {item.status.replace('_', ' ').toUpperCase()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-gray-500 text-sm">No content items in this calendar.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No assigned calendars</h3>
                  <p className="text-gray-500">
                    This content creator has not been assigned to any content calendars yet.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default ContentCreatorDetails;