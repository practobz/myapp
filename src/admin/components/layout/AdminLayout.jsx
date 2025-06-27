import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutGrid, Calendar as CalendarIcon, Settings as SettingsIcon, LogOut, Users, Menu, X } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import Logo from './Logo';
import { useAuth } from '../../contexts/AuthContext';

function AdminLayout({ children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: LayoutGrid, label: 'Dashboard', path: '/admin' },
    { icon: Users, label: 'Customers', path: '/admin/customers' },
    { icon: CalendarIcon, label: 'Content Calendar', path: '/admin/calendar' },
    { icon: SettingsIcon, label: 'Settings', path: '/admin/settings' }
  ];

  const isActive = (item) => location.pathname === item.path;

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Sidebar for desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:flex-col md:w-64 bg-[#1a1f2e] z-20">
        <div className="flex items-center h-16 px-4">
          <Logo size="medium" />
        </div>
        <div className="flex flex-col flex-1 overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center w-full px-4 py-2 rounded-md transition-colors ${
                    isActive(item)
                      ? 'bg-[#232b3b] text-white'
                      : 'text-gray-300 hover:bg-[#2d3546] hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="p-4">
            <button
              onClick={async () => {
                await logout?.();
                navigate('/login');
              }}
              className="flex items-center w-full px-4 py-2 text-gray-300 rounded-md hover:bg-[#2d3546] hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black bg-opacity-40"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar */}
          <div className="relative flex flex-col w-64 bg-[#1a1f2e] h-full z-50">
            <button
              className="absolute top-4 right-4 text-white"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="flex items-center h-16 px-4">
              <Logo size="medium" />
            </div>
            <div className="flex flex-col flex-1 overflow-y-auto">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      onClick={() => {
                        navigate(item.path);
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center w-full px-4 py-2 rounded-md transition-colors ${
                        isActive(item)
                          ? 'bg-[#232b3b] text-white'
                          : 'text-gray-300 hover:bg-[#2d3546] hover:text-white'
                      }`}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              <div className="p-4">
                <button
                  onClick={async () => {
                    await logout?.();
                    setSidebarOpen(false);
                    navigate('/login');
                  }}
                  className="flex items-center w-full px-4 py-2 text-gray-300 rounded-md hover:bg-[#2d3546] hover:text-white transition-colors"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-col flex-1 min-h-0 w-full md:ml-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-2 sm:p-4 md:p-6 overflow-auto">
          {children}
        </main>
        <Footer />
      </div>

      {/* Mobile Hamburger */}
      <button
        className="fixed top-4 left-4 z-30 md:hidden bg-white rounded p-2 shadow"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="h-6 w-6 text-gray-800" />
      </button>
    </div>
  );
}

export default AdminLayout;