import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import { Eye, Search, AlertCircle, UserCheck, Users, Mail, Phone, ArrowLeft } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL;

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

  const handleViewCreator = (id) => {
    navigate(`/admin/content-creator-details/${id}`);
  };

  const filteredCreators = contentCreators.filter(creator => 
    creator.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creator.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    creator.mobile?.includes(searchTerm)
  );

  if (loading) {
    return (
      <AdminLayout title="Content Creators">
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500 font-medium">Loading content creators...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Content Creators">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="space-y-8">
          {/* Header Section with Navigation */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <button
                  onClick={() => navigate('/admin')}
                  className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Content Creators
                  </h1>
                  <p className="text-gray-600 mt-2">Manage and view all content creators</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
            <div className="flex items-center">
              <div className="relative flex-1">
                <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search content creators by name, email, or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-start shadow-lg">
              <AlertCircle className="h-5 w-5 mr-3 mt-0.5 flex-shrink-0" />
              <span className="font-medium">{error}</span>
            </div>
          )}

          {/* Content Creators Table */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200/50">
              <h2 className="text-xl font-bold text-gray-900">
                Content Creators Directory ({filteredCreators.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">Manage content creator information and assignments</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200/50">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Phone Number
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email Address
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Assigned Content Calendars
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-gray-200/30">
                  {filteredCreators.length > 0 ? (
                    filteredCreators.map((creator) => (
                      <tr key={creator._id} className="hover:bg-white/70 transition-all duration-200 group">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {(creator.name && creator.name.trim() !== '' ? creator.name : (creator.email || 'U')).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-semibold text-gray-900">
                                {creator.name && creator.name.trim() !== '' ? creator.name : 'Unnamed Creator'}
                              </div>
                              <div className="text-xs text-gray-500">Content Creator</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Phone className="h-4 w-4 mr-2 text-gray-400" />
                            {creator.mobile && creator.mobile.trim() !== '' ? creator.mobile : 'Not provided'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            {creator.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{creator.assignedCalendars || 0}</div>
                          <div className="text-xs text-gray-500">
                            {creator.assignedCalendars > 0 ? 'Active assignments' : 'No assignments'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleViewCreator(creator._id)}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md group-hover:shadow-lg"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="bg-gray-100 rounded-full w-16 h-16 flex items-center justify-center mb-4">
                            <UserCheck className="h-8 w-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 mb-2">No content creators found</h3>
                          <p className="text-gray-500">
                            {searchTerm 
                              ? 'No content creators match your search criteria.' 
                              : 'No content creators have been registered yet.'
                            }
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default ContentCreators;