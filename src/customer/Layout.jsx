import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../admin/components/layout/Logo';
import Footer from '../admin/components/layout/Footer';
import { Bell, ChevronDown, LogOut, Settings, User, Search, ArrowLeft } from 'lucide-react';
import { useAuth } from '../admin/contexts/AuthContext';

function getDisplayName(user) {
  if (user?.displayName) return user.displayName;
  if (user?.email) return user.email.split('@')[0];
  return 'Customer User';
}

function Layout({ children }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, currentUser } = useAuth();

  const handleUserMenuToggle = () => setIsUserMenuOpen((open) => !open);

  const handleNavigation = (path) => {
    setIsUserMenuOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await logout?.();
    navigate('/customer/login');
  };

  // Show back arrow on all pages except /customer
  const showBackArrow = location.pathname !== '/customer';

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/customer');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center">
              {showBackArrow && (
                <button
                  onClick={handleBack}
                  className="p-2 mr-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <Logo size="medium" />
              <div className="ml-6">
                <h1 className="text-xl font-bold text-gray-900">Customer Portal</h1>
                <p className="text-sm text-gray-500">Manage your subscription and settings</p>
              </div>
            </div>
            {/* Search and Notification */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <div className="relative">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm w-64"
                  />
                </div>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 relative">
                  <Bell className="h-5 w-5" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                </button>
              </div>
              {/* User Dropdown */}
              <div className="relative z-50">
                <button
                  onClick={handleUserMenuToggle}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-all duration-200"
                >
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {currentUser?.email ? currentUser.email[0].toUpperCase() : 'C'}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {getDisplayName(currentUser)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentUser?.email || 'customer@email.com'}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200/50 py-2 z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {getDisplayName(currentUser)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {currentUser?.email || 'customer@email.com'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        handleNavigation('/customer/settings');
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Settings
                    </button>
                    <button
                      onClick={() => {
                        handleNavigation('/customer/subscription');
                        setIsUserMenuOpen(false);
                      }}
                      className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <User className="h-4 w-4 mr-3" />
                      My Subscription
                    </button>
                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-3" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>
      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;