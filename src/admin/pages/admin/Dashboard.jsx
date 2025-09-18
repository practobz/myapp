import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import AdminLayout from '../../components/layout/AdminLayout';
import { Users, Calendar, Clock, TrendingUp, BarChart3, Target, Activity, Zap, Award, UserCheck, Send, Palette } from 'lucide-react';

function Dashboard() {
  const { currentUser } = useAuth();
  const [assignedCustomers, setAssignedCustomers] = useState([]);
  const [contentCreators, setContentCreators] = useState([]);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch assigned customers for current admin
      if (currentUser && currentUser.role === 'admin') {
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
        const response = await fetch(`${apiUrl}/admin/assigned-customers?adminId=${currentUser._id || currentUser.id}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        setAssignedCustomers(data);
      }

      // Fetch content creators
      const creatorsRes = await fetch(`${process.env.REACT_APP_API_URL}/users?role=content_creator`);
      const creatorsData = await creatorsRes.json();
      setContentCreators(Array.isArray(creatorsData) ? creatorsData : (creatorsData.creators || []));

      // Fetch all calendars and aggregate content items
      const calendarsRes = await fetch(`${process.env.REACT_APP_API_URL}/calendars`);
      const calendarsData = await calendarsRes.json();
      // Flatten all contentItems from all calendars
      const allContentItems = Array.isArray(calendarsData)
        ? calendarsData.flatMap(cal => Array.isArray(cal.contentItems) ? cal.contentItems : [])
        : [];
      setContentItems(allContentItems);

    } catch (error) {
      setError('Error fetching dashboard data');
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const totalCustomers = assignedCustomers.length;
  const totalContentCreators = contentCreators.length;
  const totalContentItems = contentItems.length;

  // Calculate engagement metrics (mock data)
  const engagementRate = "78%";
  const monthlyGrowth = "12.5%";
  const reachTarget = "92%";

  if (loading) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex justify-center items-center h-96">
          <span className="text-lg text-gray-600">Loading dashboard...</span>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout title="Dashboard">
        <div className="flex justify-center items-center h-96">
          <span className="text-lg text-red-600">{error}</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center mb-4">
              <div className="p-3 bg-white/10 backdrop-blur-sm rounded-xl mr-4">
                <Activity className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                  Welcome to Aureum Solutions
                </h1>
                <p className="text-blue-100 text-lg mt-2">Manage your social media content effectively and drive engagement</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center">
                  <Zap className="h-6 w-6 text-yellow-400 mr-3" />
                  <div>
                    <p className="text-white/80 text-sm">Active Campaigns</p>
                    <p className="text-white text-xl font-bold">{totalCustomers}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center">
                  <Award className="h-6 w-6 text-green-400 mr-3" />
                  <div>
                    <p className="text-white/80 text-sm">Success Rate</p>
                    <p className="text-white text-xl font-bold">94%</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 rounded-xl p-4 border border-white/20">
                <div className="flex items-center">
                  <TrendingUp className="h-6 w-6 text-blue-400 mr-3" />
                  <div>
                    <p className="text-white/80 text-sm">Growth Rate</p>
                    <p className="text-white text-xl font-bold">{monthlyGrowth}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div 
            onClick={() => navigate('/admin/customers-list')}
            className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total Customers</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalCustomers}</h3>
                <p className="text-sm text-green-600 font-medium mt-1">+5% from last month</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => navigate('/admin/content-creators')}
            className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                <UserCheck className="h-8 w-8 text-white" />
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total Content Creators</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalContentCreators}</h3>
                <p className="text-sm text-green-600 font-medium mt-1">+8% from last month</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => navigate('/admin/customers')}
            className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group cursor-pointer"
          >
            <div className="flex items-center">
              <div className="p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300">
                <Calendar className="h-8 w-8 text-white" />
              </div>
              <div className="ml-6">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Content Items</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{totalContentItems}</h3>
                <p className="text-sm text-green-600 font-medium mt-1">+12% from last week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Metrics
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200/50">
            <h2 className="text-2xl font-bold text-gray-900">Performance Metrics</h2>
            <p className="text-gray-600 mt-2">Track your content performance and engagement</p>
          </div>
          
          <div className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl shadow-md">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Engagement Rate</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{engagementRate}</h3>
                    <p className="text-sm text-green-600 font-medium mt-1">Above average</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-6 border border-pink-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl shadow-md">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Monthly Growth</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{monthlyGrowth}</h3>
                    <p className="text-sm text-green-600 font-medium mt-1">Trending up</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center">
                  <div className="p-3 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl shadow-md">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Reach Target</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{reachTarget}</h3>
                    <p className="text-sm text-green-600 font-medium mt-1">On track</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div> */}

        {/* Quick Actions */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 justify-items-center">
            <button 
              onClick={() => navigate('/admin/customers-list')}
              className="w-full flex items-center justify-center p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Users className="h-6 w-6 mr-3" />
              <span className="font-semibold">View Customers</span>
            </button>
            
            <button 
              onClick={() => navigate('/admin/content-creators')}
              className="w-full flex items-center justify-center p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <UserCheck className="h-6 w-6 mr-3" />
              <span className="font-semibold">Content Creators</span>
            </button>
            
            <button 
              onClick={() => navigate('/admin/customers')}
              className="w-full flex items-center justify-center p-6 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Calendar className="h-6 w-6 mr-3" />
              <span className="font-semibold">Content Calendar</span>
            </button>

            <button 
              onClick={() => navigate('/admin/content-portfolio')}
              className="w-full flex items-center justify-center p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Palette className="h-6 w-6 mr-3" />
              <span className="font-semibold">Content Portfolio</span>
            </button>

            <button 
              onClick={() => navigate('/admin/scheduled-posts')}
              className="w-full flex items-center justify-center p-6 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Send className="h-6 w-6 mr-3" />
              <span className="font-semibold">Scheduled Posts</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;