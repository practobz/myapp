import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Eye, Search, AlertCircle, UserCheck, Mail, Phone, ArrowLeft, Calendar } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

// Memoized creator card component for performance
const CreatorCard = memo(({ creator, onView }) => (
  <div 
    onClick={() => onView(creator._id)}
    className="bg-white rounded-xl border border-gray-200/50 shadow-sm hover:shadow-md active:shadow-sm transition-all duration-200 cursor-pointer active:scale-[0.99]"
  >
    <div className="p-3 sm:p-4">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="h-10 w-10 sm:h-11 sm:w-11 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-sm sm:text-base">
            {(creator.name || 'U').charAt(0).toUpperCase()}
          </span>
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
            {creator.name || 'Unnamed Creator'}
          </h4>
          <div className="flex items-center text-xs sm:text-sm text-gray-500 truncate">
            <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">{creator.email}</span>
          </div>
        </div>
        
        {/* Right side */}
        <div className="flex flex-col items-end gap-1">
          <Eye className="h-4 w-4 text-gray-400" />
          {creator.mobile && (
            <div className="hidden sm:flex items-center text-xs text-gray-400">
              <Phone className="h-3 w-3 mr-1" />
              <span>{creator.mobile}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom row - compact */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3 w-3 text-gray-400" />
          <span className="text-[10px] sm:text-xs text-gray-600">
            {creator.assignedCalendars || 0} calendar{creator.assignedCalendars !== 1 ? 's' : ''}
          </span>
        </div>
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-medium ${
          creator.assignedCalendars > 0 
            ? 'bg-green-50 text-green-700' 
            : 'bg-gray-50 text-gray-500'
        }`}>
          {creator.assignedCalendars > 0 ? 'Active' : 'No tasks'}
        </span>
      </div>
    </div>
  </div>
));

CreatorCard.displayName = 'CreatorCard';

function ContentCreators() {
  const [contentCreators, setContentCreators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchContentCreators();
  }, []);

  const fetchContentCreators = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/users?role=content_creator`);
      if (!response.ok) {
        throw new Error('Failed to fetch content creators');
      }
      const data = await response.json();
      const creators = Array.isArray(data) ? data : (data.creators || []);
      
      // Fetch calendar assignments for each creator
      const creatorsWithAssignments = await Promise.all(
        creators.map(async (creator) => {
          try {
            const calendarsRes = await fetch(`${API_URL}/calendars`);
            const calendars = await calendarsRes.json();
            
            // Count calendars assigned to this creator
            const assignedCalendars = calendars.filter(calendar => 
              calendar.assignedTo === creator.email || 
              (calendar.contentItems && calendar.contentItems.some(item => item.assignedTo === creator.email))
            );
            
            return {
              ...creator,
              assignedCalendars: assignedCalendars.length
            };
          } catch (err) {
            return {
              ...creator,
              assignedCalendars: 0
            };
          }
        })
      );
      
      setContentCreators(creatorsWithAssignments);
    } catch (err) {
      setError('Failed to load content creators');
      console.error('Error fetching content creators:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewCreator = useCallback((id) => {
    navigate(`/admin/content-creator-details/${id}`);
  }, [navigate]);

  // Memoize filtered creators for performance
  const filteredCreators = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (!term) return contentCreators;
    return contentCreators.filter(creator => 
      creator.name?.toLowerCase().includes(term) ||
      creator.email?.toLowerCase().includes(term) ||
      creator.mobile?.includes(searchTerm)
    );
  }, [contentCreators, searchTerm]);

  if (loading) {
    return (
      <AdminLayout title="Content Creators">
        <div className="flex items-center justify-center h-48">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-2"></div>
            <p className="text-gray-500 text-sm">Loading...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Content Creators">
      <div className="space-y-3 sm:space-y-4">
        {/* Header + Search Combined for Mobile */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-sm p-3 sm:p-4 border border-gray-200/50">
          {/* Header Row */}
          <div className="flex items-center mb-3">
            <button
              onClick={() => navigate('/admin')}
              className="mr-2 p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                Content Creators
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                Manage and view all content creators
              </p>
            </div>
            <span className="text-xs sm:text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
              {filteredCreators.length}
            </span>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search creators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 w-full bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="border px-3 py-2 rounded-lg flex items-center text-sm bg-red-50 border-red-200 text-red-700">
            <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{error}</span>
          </div>
        )}

        {/* Creators List - Compact Grid */}
        {filteredCreators.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {filteredCreators.map((creator) => (
              <CreatorCard
                key={creator._id}
                creator={creator}
                onView={handleViewCreator}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white/80 rounded-xl p-6 text-center border border-gray-200/50">
            <div className="bg-gray-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <UserCheck className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              {searchTerm ? 'No matches found' : 'No content creators'}
            </h3>
            <p className="text-xs text-gray-500">
              {searchTerm 
                ? 'Try a different search term' 
                : 'No content creators registered yet'
              }
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export default memo(ContentCreators);