import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Linkedin, ArrowLeft, Save, ExternalLink } from 'lucide-react';
import { useAuth } from '../../admin/contexts/AuthContext';

function LinkedInIntegration() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate('/customer/settings')}
              className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <Linkedin className="h-8 w-8 text-blue-700" />
              <span className="ml-2 text-xl font-bold text-[#1a1f2e]">LinkedIn Integration</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-3 mb-6">
            <Linkedin className="h-6 w-6 text-blue-700" />
            <h3 className="font-medium text-lg">LinkedIn Professional Integration</h3>
          </div>

          {/* Integration content */}
          <div className="text-center py-8">
            <Linkedin className="h-16 w-16 text-blue-700 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">LinkedIn Integration</h4>
            <p className="text-gray-500 mb-4">
              Connect your LinkedIn profile and company pages for professional content management.
            </p>
            <button className="bg-blue-700 text-white px-6 py-3 rounded-lg hover:bg-blue-800 transition-colors">
              Connect LinkedIn Account
            </button>
          </div>

          {/* Integration Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h4 className="font-medium text-blue-800 mb-3">LinkedIn Integration Setup</h4>
            <div className="space-y-2 text-sm text-blue-700">
              <p>1. Create a LinkedIn App in the LinkedIn Developer Portal</p>
              <p>2. Configure OAuth 2.0 redirect URLs</p>
              <p>3. Request necessary permissions (r_liteprofile, r_emailaddress, w_member_social)</p>
              <p>4. Generate access tokens for your application</p>
              <p>5. Use the credentials to connect your account</p>
            </div>
            <a
              href="https://developer.linkedin.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              LinkedIn Developer Portal
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LinkedInIntegration;
       