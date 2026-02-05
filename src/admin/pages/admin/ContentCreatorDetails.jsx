import React, { useState, useEffect, useCallback, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AdminLayout from '../../components/layout/AdminLayout';
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Building,
  Hash,
  ChevronRight,
  ChevronDown,
  Palette,
  Award,
  Shield
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Memoized info item component for performance
const InfoItem = memo(({ icon: Icon, iconBg, iconColor, label, value, mono }) => (
  <div className="flex items-center gap-2 p-2 bg-gray-50/50 rounded-lg">
    <div className={`p-1.5 ${iconBg} rounded-md flex-shrink-0`}>
      <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-medium text-gray-400 uppercase">{label}</p>
      <p className={`text-xs text-gray-900 font-medium truncate ${mono ? 'font-mono' : ''}`}>
        {value || 'N/A'}
      </p>
    </div>
  </div>
));

InfoItem.displayName = 'InfoItem';

// Memoized calendar card component
const CalendarCard = memo(({ calendar, isExpanded, onToggle, formatSimpleDate }) => (
  <div className="bg-white rounded-lg border border-gray-200/50 shadow-sm overflow-hidden">
    <div 
      className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
      onClick={onToggle}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 bg-blue-100 rounded-md flex-shrink-0">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-gray-900 truncate">{calendar.name}</h4>
            <p className="text-xs text-gray-500 truncate">{calendar.customerName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700">
            {calendar.contentItems?.length || 0}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>
    </div>

    {isExpanded && (
      <div className="border-t border-gray-100 bg-gray-50/30">
        <div className="p-3">
          <h5 className="text-xs font-semibold text-gray-600 mb-2">Content Items</h5>
          {calendar.contentItems && calendar.contentItems.length > 0 ? (
            <div className="space-y-2">
              {calendar.contentItems.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-2 border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.description}</p>
                      <p className="text-[10px] text-gray-500">Due: {formatSimpleDate(item.date)}</p>
                    </div>
                    {item.status && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 flex-shrink-0">
                        {item.status.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-xs">No content items</p>
          )}
        </div>
      </div>
    )}
  </div>
));

CalendarCard.displayName = 'CalendarCard';

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

  const toggleCalendarExpansion = useCallback((calendarId) => {
    setExpandedCalendars(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(calendarId)) {
        newExpanded.delete(calendarId);
      } else {
        newExpanded.add(calendarId);
      }
      return newExpanded;
    });
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, "MMM dd, yyyy");
    } catch (error) {
      return 'N/A';
    }
  }, []);

  const formatSimpleDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, "MMM dd");
    } catch (error) {
      return 'N/A';
    }
  }, []);

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
      <AdminLayout title="Creator Details">
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !creator) {
    return (
      <AdminLayout title="Creator Details">
        <div className="p-4">
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200/50 max-w-sm mx-auto">
            <div className="bg-red-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">Creator not found</h3>
            <p className="text-xs text-gray-500 mb-4">{error || "This creator doesn't exist."}</p>
            <button
              onClick={() => navigate('/admin/content-creators')}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Creator Details">
      <div className="space-y-3 sm:space-y-4">
        {/* Header - Compact */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin/content-creators')}
              className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm sm:text-base">
                {(creator.name || creator.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                {creator.name || creator.email || 'Unnamed Creator'}
              </h2>
              <p className="text-xs text-gray-500 truncate hidden sm:block">Content Creator Profile</p>
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium border ${getStatusColor(creator.isActive)}`}>
              {getStatusText(creator.isActive)}
            </span>
          </div>
        </div>

        {/* Creator Information - Compact Grid */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          <h3 className="text-sm font-bold text-gray-900 mb-3">Profile Details</h3>
          
          <div className="grid grid-cols-2 gap-2">
            {/* Personal Details */}
            <InfoItem 
              icon={User} 
              iconBg="bg-blue-100" 
              iconColor="text-blue-600" 
              label="Name" 
              value={creator.name || 'Not provided'} 
            />
            <InfoItem 
              icon={Mail} 
              iconBg="bg-green-100" 
              iconColor="text-green-600" 
              label="Email" 
              value={creator.email} 
            />
            <InfoItem 
              icon={Phone} 
              iconBg="bg-blue-100" 
              iconColor="text-blue-600" 
              label="Mobile" 
              value={creator.mobile || 'Not provided'} 
            />
            <InfoItem 
              icon={MapPin} 
              iconBg="bg-orange-100" 
              iconColor="text-orange-600" 
              label="Address" 
              value={creator.address || 'Not provided'} 
            />
            
            {/* Professional Details */}
            <InfoItem 
              icon={Building} 
              iconBg="bg-indigo-100" 
              iconColor="text-indigo-600" 
              label="Role" 
              value={creator.role?.replace('_', ' ') || 'Content Creator'} 
            />
            <InfoItem 
              icon={Palette} 
              iconBg="bg-purple-100" 
              iconColor="text-purple-600" 
              label="Specialization" 
              value={getSpecializationDisplay(creator.specialization)} 
            />
            <InfoItem 
              icon={Award} 
              iconBg="bg-yellow-100" 
              iconColor="text-yellow-600" 
              label="Experience" 
              value={getExperienceDisplay(creator.experience)} 
            />
            <InfoItem 
              icon={Calendar} 
              iconBg="bg-teal-100" 
              iconColor="text-teal-600" 
              label="Registered" 
              value={formatDate(creator.createdAt)} 
            />
          </div>

          {/* Permissions Section */}
          {creator.permissions && creator.permissions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <h4 className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Permissions
              </h4>
              <div className="flex flex-wrap gap-1">
                {creator.permissions.map((permission, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700"
                  >
                    {permission.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Assigned Calendars Section - Compact */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
          <div className="px-3 sm:px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Assigned Calendars</h3>
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                {assignedCalendars.length}
              </span>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {assignedCalendars.length > 0 ? (
              <div className="space-y-2">
                {assignedCalendars.map((calendar) => (
                  <CalendarCard
                    key={calendar._id}
                    calendar={calendar}
                    isExpanded={expandedCalendars.has(calendar._id)}
                    onToggle={() => toggleCalendarExpansion(calendar._id)}
                    formatSimpleDate={formatSimpleDate}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="bg-gray-100 rounded-full w-10 h-10 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="h-5 w-5 text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No calendars assigned</h3>
                <p className="text-xs text-gray-500">
                  This creator has no calendar assignments yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default memo(ContentCreatorDetails);