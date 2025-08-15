import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, AtSign, Phone, Palette, Briefcase, Camera, Save, Edit3, CheckCircle, AlertCircle, MapPin, Calendar, Award, Star } from 'lucide-react';
import Footer from '../admin/components/layout/Footer';

// Helper to get creator email from localStorage
function getCreatorEmail() {
  let email = '';
  try {
    email = (localStorage.getItem('userEmail') || '').toLowerCase();
    if (!email) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        if (userObj.email) {
          email = userObj.email.toLowerCase();
        }
      }
    }
  } catch (e) {
    email = '';
  }
  return email;
}

// Helper to get creator ID from localStorage
function getCreatorId() {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userObj = JSON.parse(userStr);
      return userObj.id || userObj._id;
    }
    return localStorage.getItem('userId');
  } catch (e) {
    return null;
  }
}

function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: getCreatorEmail() || '',
    mobile: '',
    specialization: 'social-media',
    experience: 'intermediate',
    bio: '',
    location: '',
    joinDate: '',
    portfolio: '',
    skills: [],
    languages: [],
    rating: 0,
    completedProjects: 0,
    clientSatisfaction: 0
  });

  const [editData, setEditData] = useState({ ...profileData });

  const creatorEmail = getCreatorEmail();
  const creatorId = getCreatorId();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!creatorEmail && !creatorId) {
      navigate('/content-creator/login');
      return;
    }
    fetchProfileData();
  }, [creatorEmail, creatorId, navigate]);

  const fetchProfileData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Since /customer/{id} works, use that as primary endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL}/customer/${creatorId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Successfully fetched customer data:', data);
        
        const formattedData = {
          name: data.name || data.fullName || '',
          email: data.email || creatorEmail,
          mobile: data.mobile || data.phone || '',
          specialization: data.specialization || 'social-media',
          experience: data.experience || 'intermediate',
          bio: data.bio || data.description || '',
          location: data.address || data.location || '', // Map address to location
          joinDate: data.joinDate || data.createdAt || new Date().toISOString(),
          portfolio: data.portfolio || data.portfolioUrl || '',
          // Handle skills and languages - they might be stored as strings
          skills: data.skills ? (typeof data.skills === 'string' ? data.skills.split(',').map(s => s.trim()) : data.skills) : ['Content Creation', 'Social Media Management'],
          languages: data.languages ? (typeof data.languages === 'string' ? data.languages.split(',').map(l => l.trim()) : data.languages) : ['English'],
          rating: data.rating || 0,
          completedProjects: data.completedProjects || data.projectsCompleted || 0,
          clientSatisfaction: data.clientSatisfaction || data.satisfaction || 0
        };
        
        setProfileData(formattedData);
        setEditData(formattedData);
      } else {
        throw new Error('Customer data not found');
      }
    } catch (err) {
      console.warn('Error fetching profile:', err.message);
      
      // Use default data with current user info
      const defaultData = {
        name: localStorage.getItem('userName') || 'Content Creator',
        email: creatorEmail,
        mobile: '',
        specialization: 'social-media',
        experience: 'intermediate',
        bio: 'Passionate content creator ready to help brands connect with their audience.',
        location: '',
        joinDate: new Date().toISOString(),
        portfolio: '',
        skills: ['Content Creation', 'Social Media Management'],
        languages: ['English'],
        rating: 0,
        completedProjects: 0,
        clientSatisfaction: 0
      };
      setProfileData(defaultData);
      setEditData(defaultData);
      
      setError('Using default profile data. You can still edit and save your information.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSkillsChange = (e) => {
    const skills = e.target.value.split(',').map(skill => skill.trim()).filter(skill => skill);
    setEditData(prev => ({
      ...prev,
      skills
    }));
  };

  const handleLanguagesChange = (e) => {
    const languages = e.target.value.split(',').map(lang => lang.trim()).filter(lang => lang);
    setEditData(prev => ({
      ...prev,
      languages
    }));
  };

  const validateForm = () => {
    const errors = [];
    
    if (!editData.name.trim()) {
      errors.push('Name is required');
    }
    
    if (!editData.mobile.trim()) {
      errors.push('Mobile number is required');
    } else if (!/^\+?[\d\s-()]+$/.test(editData.mobile)) {
      errors.push('Please enter a valid mobile number');
    }
    
    if (editData.portfolio && !/^https?:\/\/.+\..+/.test(editData.portfolio)) {
      errors.push('Please enter a valid portfolio URL');
    }
    
    if (editData.skills.length === 0) {
      errors.push('At least one skill is required');
    }
    
    if (editData.bio.length > 500) {
      errors.push('Bio must be less than 500 characters');
    }
    
    return errors;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join('. '));
      setSaving(false);
      return;
    }

    try {
      // Since we can fetch from /customer/{id}, let's try to update the same endpoint
      // First, let's get the current customer data to merge with our profile data
      const currentDataResponse = await fetch(`${process.env.REACT_APP_API_URL}/customer/${creatorId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      let currentData = {};
      if (currentDataResponse.ok) {
        currentData = await currentDataResponse.json();
      }

      // Merge the existing customer data with our profile updates
      const payload = {
        ...currentData, // Keep existing customer data
        // Update with profile fields
        name: editData.name,
        mobile: editData.mobile,
        address: editData.location, // Map location to address
        // Add profile-specific fields
        specialization: editData.specialization,
        experience: editData.experience,
        bio: editData.bio,
        portfolio: editData.portfolio,
        skills: Array.isArray(editData.skills) ? editData.skills.join(',') : editData.skills, // Store as comma-separated string
        languages: Array.isArray(editData.languages) ? editData.languages.join(',') : editData.languages,
        // Keep any existing fields that might be important
        joinDate: editData.joinDate || currentData.joinDate || currentData.createdAt,
        rating: editData.rating || currentData.rating || 0,
        completedProjects: editData.completedProjects || currentData.completedProjects || 0,
        clientSatisfaction: editData.clientSatisfaction || currentData.clientSatisfaction || 0
      };

      // Try to update using PUT to customer endpoint
      const response = await fetch(`${process.env.REACT_APP_API_URL}/customer/${creatorId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const updatedData = await response.json();
        console.log('Successfully updated customer profile:', updatedData);
        
        setProfileData({ ...editData });
        setIsEditing(false);
        setSuccess('Profile updated successfully!');
        
        // Update localStorage if name changed
        if (editData.name && editData.name !== localStorage.getItem('userName')) {
          localStorage.setItem('userName', editData.name);
        }
        
        setTimeout(() => setSuccess(''), 5000);
      } else {
        // If PUT doesn't work, try PATCH
        const patchResponse = await fetch(`${process.env.REACT_APP_API_URL}/customer/${creatorId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (patchResponse.ok) {
          console.log('Successfully updated customer profile with PATCH');
          setProfileData({ ...editData });
          setIsEditing(false);
          setSuccess('Profile updated successfully!');
          
          if (editData.name && editData.name !== localStorage.getItem('userName')) {
            localStorage.setItem('userName', editData.name);
          }
          
          setTimeout(() => setSuccess(''), 5000);
        } else {
          // If neither PUT nor PATCH work, save locally and warn user
          console.warn('Server update failed, saving locally');
          setProfileData({ ...editData });
          setIsEditing(false);
          setSuccess('Profile updated locally. Server sync may be limited.');
          
          setTimeout(() => setSuccess(''), 7000);
        }
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      
      // Always save locally as fallback
      setProfileData({ ...editData });
      setIsEditing(false);
      setSuccess('Profile saved locally. Server connection unavailable.');
      
      setTimeout(() => setSuccess(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
    setError('');
  };

  const getSpecializationLabel = (spec) => {
    const specializations = {
      'social-media': 'Social Media Management',
      'graphic-design': 'Graphic Design',
      'video-editing': 'Video Editing',
      'content-writing': 'Content Writing',
      'photography': 'Photography',
      'web-design': 'Web Design'
    };
    return specializations[spec] || spec;
  };

  const getExperienceLabel = (exp) => {
    const experiences = {
      'beginner': 'Beginner (0-1 years)',
      'intermediate': 'Intermediate (2-4 years)',
      'advanced': 'Advanced (5-7 years)',
      'expert': 'Expert (8+ years)'
    };
    return experiences[exp] || exp;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 flex flex-col">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/content-creator')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="flex items-center">
                <div className="p-2 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl shadow-lg">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="ml-3">
                  <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    My Profile
                  </span>
                  <p className="text-sm text-gray-500">Content Creator Portal</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg"
                >
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-xl hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Success/Error Messages */}
      {(success || error) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {success && (
            <div className="bg-green-50/80 backdrop-blur-sm border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center mb-4">
              <CheckCircle className="h-5 w-5 mr-3" />
              <span className="font-medium">{success}</span>
            </div>
          )}
          {error && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center mb-4">
              <AlertCircle className="h-5 w-5 mr-3" />
              <span className="font-medium">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Main Content - Profile Details */}
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Profile Overview */}
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Card */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
                <div className="text-center">
                  <div className="relative inline-block">
                    <div className="w-24 h-24 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {profileData.name ? profileData.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'CC'}
                    </div>
                    <button className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                      <Camera className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-gray-900">{profileData.name || 'Content Creator'}</h2>
                  <p className="text-gray-600">{getSpecializationLabel(profileData.specialization)}</p>
                  {profileData.location && (
                    <div className="flex items-center justify-center mt-2 text-sm text-gray-500">
                      <MapPin className="h-4 w-4 mr-1" />
                      {profileData.location}
                    </div>
                  )}
                </div>

                <div className="mt-6 space-y-4">
                  {profileData.rating > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Rating</span>
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                        <span className="ml-1 text-sm font-semibold text-gray-900">{profileData.rating}</span>
                      </div>
                    </div>
                  )}
                  {profileData.completedProjects > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Projects</span>
                      <span className="text-sm font-semibold text-gray-900">{profileData.completedProjects}</span>
                    </div>
                  )}
                  {profileData.clientSatisfaction > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Satisfaction</span>
                      <span className="text-sm font-semibold text-gray-900">{profileData.clientSatisfaction}%</span>
                    </div>
                  )}
                  {profileData.joinDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-500">Member Since</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {new Date(profileData.joinDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Skills Card */}
              {profileData.skills && profileData.skills.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Award className="h-5 w-5 mr-2 text-purple-600" />
                    Skills
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded-full text-sm font-medium border border-purple-200"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages Card */}
              {profileData.languages && profileData.languages.length > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Languages</h3>
                  <div className="space-y-2">
                    {profileData.languages.map((language, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{language}</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Fluent</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Profile Details - Keep existing form structure */}
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Personal Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                    {isEditing ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="name"
                          value={editData.name}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-gray-900">{profileData.name}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                      <AtSign className="h-5 w-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{profileData.email}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                    {isEditing ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          name="mobile"
                          value={editData.mobile}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                        <Phone className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-gray-900">{profileData.mobile}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    {isEditing ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <MapPin className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          name="location"
                          value={editData.location}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                        <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-gray-900">{profileData.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Professional Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Specialization</label>
                    {isEditing ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Palette className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          name="specialization"
                          value={editData.specialization}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm appearance-none"
                        >
                          <option value="social-media">Social Media Management</option>
                          <option value="graphic-design">Graphic Design</option>
                          <option value="video-editing">Video Editing</option>
                          <option value="content-writing">Content Writing</option>
                          <option value="photography">Photography</option>
                          <option value="web-design">Web Design</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                        <Palette className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-gray-900">{getSpecializationLabel(profileData.specialization)}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                    {isEditing ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Briefcase className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                          name="experience"
                          value={editData.experience}
                          onChange={handleInputChange}
                          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm appearance-none"
                        >
                          <option value="beginner">Beginner (0-1 years)</option>
                          <option value="intermediate">Intermediate (2-4 years)</option>
                          <option value="advanced">Advanced (5-7 years)</option>
                          <option value="expert">Expert (8+ years)</option>
                        </select>
                      </div>
                    ) : (
                      <div className="flex items-center p-3 bg-gray-50 rounded-xl">
                        <Briefcase className="h-5 w-5 text-gray-400 mr-3" />
                        <span className="text-gray-900">{getExperienceLabel(profileData.experience)}</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Portfolio URL</label>
                    {isEditing ? (
                      <input
                        type="url"
                        name="portfolio"
                        value={editData.portfolio}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                        placeholder="https://your-portfolio.com"
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <a
                          href={profileData.portfolio}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 transition-colors"
                        >
                          {profileData.portfolio}
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Skills (comma-separated)</label>
                    {isEditing ? (
                      <textarea
                        name="skills"
                        value={editData.skills.join(', ')}
                        onChange={handleSkillsChange}
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                        placeholder="Social Media Management, Graphic Design, Content Writing..."
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-900">{profileData.skills.join(', ')}</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Languages (comma-separated)</label>
                    {isEditing ? (
                      <input
                        type="text"
                        name="languages"
                        value={editData.languages.join(', ')}
                        onChange={handleLanguagesChange}
                        className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                        placeholder="English, Hindi, Marathi..."
                      />
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-900">{profileData.languages.join(', ')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bio Section */}
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">About Me</h3>
                {isEditing ? (
                  <textarea
                    name="bio"
                    value={editData.bio}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm"
                    placeholder="Tell us about yourself, your experience, and what makes you unique..."
                  />
                ) : (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-gray-700 leading-relaxed">{profileData.bio}</p>
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

export default Profile;