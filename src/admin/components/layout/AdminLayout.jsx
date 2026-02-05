import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Search, ChevronDown, Settings, LogOut, ArrowLeft } from 'lucide-react';
import Footer from './Footer';
import Logo from './Logo';
import { useAuth } from '../../contexts/AuthContext';

function AdminLayout({ children, title }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { logout, currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout?.();
    navigate('/login');
  };

  const isDashboard =
    location.pathname === '/admin/dashboard' || location.pathname === '/admin';

  // Prefer going back in history when possible (so e.g. viewing a customer detail returns to the list first)
  const handleBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/admin/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#F4F9FF] flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center">
              {!isDashboard && (
                <button
                  onClick={handleBack}
                  className="mr-3 text-[#475569] hover:text-[#0F172A] p-2 hover:bg-[#F4F9FF] rounded-lg"
                  title="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}

              <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-shrink">
                <div
                  onClick={() => navigate('/admin/dashboard')}
                  className="cursor-pointer flex-shrink-0"
                >
                  <Logo size="medium" />
                </div>
                <div className="ml-2 sm:ml-6 min-w-0">
                  <h1 className="text-base sm:text-lg font-bold text-[#0F172A] truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">{title}</h1>
                  <p className="text-[11px] sm:text-xs text-[#475569] truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">
                    Manage your content strategy
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3">
                <div className="relative">
                  <Search className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-[#0066CC] w-64"
                  />
                </div>
                <button className="p-2 hover:bg-[#F4F9FF] rounded-lg relative">
                  <Bell className="h-5 w-5 text-[#475569]" />
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
                </button>
              </div>

              {/* Profile */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-[#F4F9FF]"
                >
                  <div className="h-8 w-8 bg-gradient-to-r from-[#00E5FF] to-[#0066CC] rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-semibold">
                      {currentUser?.email?.[0]?.toUpperCase() || 'A'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-[#475569]" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border py-2">
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          navigate('/admin/settings');
                        }}
                        className="flex w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Settings
                      </button>
                    <button
                      onClick={handleLogout}
                      className="flex w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50"
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

      {/* MAIN CONTENT (FIXED) */}
      <main className="p-2 sm:p-4 lg:p-6">
        {children}
      </main>

      <Footer />
    </div>
  );
}

export default AdminLayout;
