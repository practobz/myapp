import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../admin/contexts/AuthContext';
import ContentCalendar from './ContentCalendar';

function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleUserMenuToggle = () => setIsUserMenuOpen(!isUserMenuOpen);
  const handleLogout = () => { logout(); navigate('/customer/login'); };
  const handleNavigation = (path) => { navigate(path); setIsUserMenuOpen(false); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Main Content */}
      <div className="min-h-screen">
        <div className="w-full mx-auto py-0">
          <div className="space-y-5">
            {/* Welcome Section - Professional Header */}
            <div
              className="relative overflow-hidden bg-indigo-900 rounded-2xl shadow-xl bg-cover bg-center"
              style={{ backgroundImage: "url('/banner.png')" }}
            >
              <div className="absolute inset-0 bg-slate-900/40"></div>
              <div className="relative px-6 py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
                      Welcome back{currentUser?.name ? `, ${currentUser.name}` : ''}!
                    </h1>
                    <p className="text-blue-50 text-base font-medium flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Track and manage your social media content effectively
                    </p>
                    <p className="text-blue-100/80 text-xs sm:text-sm mt-1.5">
                      {format(new Date(), 'EEEE, MMMM dd, yyyy')}
                    </p>
                  </div>
                  <div className="hidden lg:block">
                    <button
                      onClick={() => navigate('/customer/roi-dashboard')}
                      title="View ROI Analytics Dashboard"
                      className="w-16 h-16 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/20 transition-all duration-300 transform hover:scale-105 cursor-pointer"
                    >
                      <ArrowUpRight className="h-8 w-8 text-white" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Calendar */}
            <ContentCalendar />
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        ></div>
      )}
    </div>
  );
}

export default Dashboard;