import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Logo from '../admin/components/layout/Logo';
import Footer from '../admin/components/layout/Footer';
import { Bell, ChevronDown, LogOut, Settings, User, ArrowLeft } from 'lucide-react';
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
    navigate('/customer/welcome');
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
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#e6f2fb] via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-lg border-b border-[#0a2342]/10 sticky top-0 z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between h-auto min-h-[4rem]">
            {/* Logo and Title */}
            <div className="flex items-center min-w-0 flex-1">
              {showBackArrow && (
                <button
                  onClick={handleBack}
                  className="p-2 mr-2 rounded-md text-[#38bdf8] hover:text-[#0a2342] hover:bg-[#bae6fd]"
                  aria-label="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              {/* Make Logo clickable */}
              <button
                onClick={() => navigate('/customer')}
                className="focus:outline-none flex-shrink-0"
                aria-label="Go to Dashboard"
                style={{ background: 'none', border: 'none', padding: 0, margin: 0 }}
              >
                <Logo size="medium" />
              </button>
              <div className="ml-3 sm:ml-6 min-w-0">
                <h1 className="text-base sm:text-xl font-bold text-[#0a2342] truncate max-w-[120px] sm:max-w-none">
                  Customer Portal
                </h1>
                <p className="text-xs sm:text-sm text-[#38bdf8] truncate max-w-[120px] sm:max-w-none">
                  Manage your subscription and settings
                </p>
              </div>
            </div>
            {/* User Dropdown */}
            <div className="relative z-50 mt-2 sm:mt-0 flex-shrink-0">
              <button
                onClick={handleUserMenuToggle}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[#bae6fd] transition-all duration-200"
              >
                <div className="h-8 w-8 bg-gradient-to-r from-[#0a2342] to-[#38bdf8] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {currentUser?.email ? currentUser.email[0].toUpperCase() : 'C'}
                  </span>
                </div>
                <div className="hidden sm:block text-left min-w-0">
                  <p className="text-sm font-medium text-[#0a2342] truncate">
                    {getDisplayName(currentUser)}
                  </p>
                  <p className="text-xs text-[#38bdf8] truncate">
                    {currentUser?.email || 'customer@email.com'}
                  </p>
                </div>
                <ChevronDown className="h-4 w-4 text-[#38bdf8]" />
              </button>
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-[#0a2342]/10 py-2 z-50">
                  <div className="px-4 py-3 border-b border-[#bae6fd]">
                    <p className="text-sm font-medium text-[#0a2342]">
                      {getDisplayName(currentUser)}
                    </p>
                    <p className="text-xs text-[#38bdf8]">
                      {currentUser?.email || 'customer@email.com'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      handleNavigation('/customer/settings');
                      setIsUserMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-[#0a2342] hover:bg-[#bae6fd] transition-colors"
                  >
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </button>
                  <button
                    onClick={() => {
                      handleNavigation('/customer/subscription');
                      setIsUserMenuOpen(false);
                    }}
                    className="flex items-center w-full px-4 py-3 text-sm text-[#0a2342] hover:bg-[#bae6fd] transition-colors"
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
      </header>
      {/* Main content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-transparent">
        {children}
      </main>
      <Footer />
    </div>
  );
}

export default Layout;