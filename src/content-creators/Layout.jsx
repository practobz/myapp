import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, ChevronDown, LogOut, Settings, ArrowLeft, Palette } from 'lucide-react';
import { useAuth } from '../admin/contexts/AuthContext';
import Logo from '../admin/components/layout/Logo';
import Footer from '../admin/components/layout/Footer';

// Helpers to get creator information
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

function getCreatorName() {
  try {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userObj = JSON.parse(userStr);
      return userObj.name || userObj.fullName || `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() || 'Content Creator';
    }
  } catch (e) {}
  return 'Content Creator';
}

function ContentCreatorLayout({ children, title, subtitle, icon, headerActions, onBack, showBackArrowOverride }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const creatorEmail = getCreatorEmail();
  const creatorName = getCreatorName();

  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleUserMenuToggle = () => setIsUserMenuOpen((open) => !open);

  const handleNavigation = (path) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setIsUserMenuOpen(false);
    logout();
    localStorage.removeItem('userEmail');
    navigate('/content-creator/login');
  };

  // Only show back arrow on sub-pages unless overridden
  const showBackArrow = showBackArrowOverride !== undefined 
    ? showBackArrowOverride 
    : (location.pathname !== '/content-creator' && location.pathname !== '/content-creator/');

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/content-creator');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      {/* Premium Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo and Titles */}
            <div className="flex items-center min-w-0 flex-1 gap-2">
              {showBackArrow && (
                <button
                  onClick={handleBack}
                  className="p-2 mr-1 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all duration-200 flex-shrink-0"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              
              <button
                onClick={() => navigate('/content-creator')}
                className="focus:outline-none flex-shrink-0 mr-3"
                aria-label="Go to Dashboard"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <Logo size="small" />
              </button>

              <div className="flex items-center min-w-0">
                {icon ? (
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-md mr-3 hidden sm:block">
                    {icon}
                  </div>
                ) : (
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl shadow-md mr-3 hidden sm:block">
                    <Palette className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-lg sm:text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent truncate block">
                    {title || "Content Creator Portal"}
                  </span>
                  {subtitle && (
                    <p className="text-xs text-gray-500 truncate mt-0.5 hidden sm:block">
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Header Actions & User Profile Menu */}
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
              {headerActions && (
                <div className="flex items-center">
                  {headerActions}
                </div>
              )}

              {/* Profile Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={handleUserMenuToggle}
                  className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 transition-all duration-200"
                >
                  <div className="h-8 w-8 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-sm font-bold uppercase">
                      {creatorName ? creatorName[0] : 'U'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 hidden sm:block" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 py-2 z-50 transform origin-top-right transition-all duration-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {creatorName}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {creatorEmail}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => handleNavigation('/content-creator/profile')}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-150"
                    >
                      <User className="h-4 w-4 mr-3 text-gray-400" />
                      My Profile
                    </button>

                    <button
                      onClick={() => handleNavigation('/content-creator/settings')}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors duration-150"
                    >
                      <Settings className="h-4 w-4 mr-3 text-gray-400" />
                      Settings
                    </button>

                    <div className="border-t border-gray-100 my-1" />

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors duration-150"
                    >
                      <LogOut className="h-4 w-4 mr-3 text-red-400" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default ContentCreatorLayout;
