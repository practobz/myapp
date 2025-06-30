import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../admin/contexts/AuthContext';
import { AtSign, Lock, AlertCircle, User, Phone, Palette, Briefcase } from 'lucide-react';
import Footer from '../../admin/components/layout/Footer';

function ContentCreatorSignup() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    specialization: '',
    experience: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Use the correct signup function from your AuthContext
const { contentCreatorSignup } = useAuth();

  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.name) return 'Full name is required';
    if (!formData.email) return 'Email is required';
    if (!/\S+@\S+\.\S+/.test(formData.email)) return 'Email is invalid';
    if (!formData.mobile) return 'Mobile number is required';
    if (!/^[+]?[0-9]{10,15}$/.test(formData.mobile.replace(/\s/g, ''))) return 'Mobile number is invalid';
    if (!formData.specialization) return 'Specialization is required';
    if (!formData.experience) return 'Experience is required';
    if (!formData.password) return 'Password is required';
    if (formData.password.length < 6) return 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) return 'Passwords do not match';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      await contentCreatorSignup(formData.email, formData.password, formData);
      navigate('/content-creator');
    } catch (err) {
      if (err.message === 'Signup request timed out. Please try again.' || err.message === 'Request timed out') {
        setError('Signup request timed out. Please try again.');
      } else {
        setError('Failed to create an account');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="flex-1 flex items-center justify-center py-6 px-2 sm:px-4">
        <div className="w-full max-w-xs sm:max-w-md space-y-8 animate-fade-in">
          <div>
            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-full">
                <Palette className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <h1 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-white">
              Content Creator Portal
            </h1>
            <h2 className="mt-6 text-center text-lg sm:text-2xl font-bold text-gray-200">
              Create your creator account
            </h2>
          </div>

          <div className="mt-8 bg-white rounded-lg shadow-xl p-3 xs:p-4 sm:p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form className="space-y-3 xs:space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    className="input-field pl-10"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <AtSign className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="input-field pl-10"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">
                  Mobile Number
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="mobile"
                    name="mobile"
                    type="tel"
                    required
                    className="input-field pl-10"
                    placeholder="+91 9876543210"
                    value={formData.mobile}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="specialization" className="block text-sm font-medium text-gray-700">
                  Specialization
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Palette className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="specialization"
                    name="specialization"
                    required
                    className="input-field pl-10"
                    value={formData.specialization}
                    onChange={handleInputChange}
                  >
                    <option value="">Select your specialization</option>
                    <option value="social-media">Social Media Content</option>
                    <option value="graphic-design">Graphic Design</option>
                    <option value="video-editing">Video Editing</option>
                    <option value="copywriting">Copywriting</option>
                    <option value="photography">Photography</option>
                    <option value="animation">Animation</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
                  Experience Level
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Briefcase className="h-5 w-5 text-gray-400" />
                  </div>
                  <select
                    id="experience"
                    name="experience"
                    required
                    className="input-field pl-10"
                    value={formData.experience}
                    onChange={handleInputChange}
                  >
                    <option value="">Select experience level</option>
                    <option value="beginner">Beginner (0-1 years)</option>
                    <option value="intermediate">Intermediate (2-4 years)</option>
                    <option value="experienced">Experienced (5-7 years)</option>
                    <option value="expert">Expert (8+ years)</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="input-field pl-10"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    className="input-field pl-10"
                    placeholder="Confirm password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  {loading ? 'Creating account...' : 'Sign up'}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/content-creator/login" className="font-medium text-purple-600 hover:text-purple-500">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default ContentCreatorSignup;