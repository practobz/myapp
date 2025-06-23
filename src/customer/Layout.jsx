import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../admin/components/layout/Logo';
import Footer from '../admin/components/layout/Footer';
import { Bell, User, ChevronDown, ArrowLeft } from 'lucide-react';
import { useAuth } from '../admin/contexts/AuthContext';

function Layout({ children }) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

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

  const showBackArrow = location.pathname !== '/customer';

  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/customer');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center flex-nowrap justify-between h-16 px-2 sm:px-4 bg-white shadow min-w-0">
        <div className="flex items-center min-w-0 flex-shrink-0 overflow-hidden">
          {showBackArrow && (
            <button
              onClick={handleBack}
              className="p-2 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex items-center space-x-2">
            <Logo size="small" />
          </div>
          <span className="ml-2 sm:ml-6 text-base sm:text-xl font-bold text-purple-800 whitespace-nowrap truncate max-w-[100px] xs:max-w-[140px] sm:max-w-xs">
            Customer Portal
          </span>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          {/* Notifications */}
          <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white"></span>
          </button>
          {/* User Menu */}
          <div className="relative">
            <button
              onClick={handleUserMenuToggle}
              className="flex items-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <User className="h-4 w-4" />
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                <button
                  onClick={() => handleNavigation('/customer/subscription')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  My Subscription
                </button>
                <button
                  onClick={() => handleNavigation('/customer/settings')}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Settings
                </button>
                <hr className="my-1" />
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;