import React from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useCustomers } from '../../contexts/CustomerContext';
import AdminLayout from '../../components/layout/AdminLayout';
import { Eye, Plus, Calendar, Users, Clock, AlertCircle, TrendingUp, BarChart3, Target } from 'lucide-react';

function Dashboard() {
  const { customers } = useCustomers();
  const navigate = useNavigate();

  const handleViewCustomer = (id) => {
    navigate(`/admin/customers/${id}`);
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, "do MMMM");
    } catch (error) {
      return dateString;
    }
  };

  // Calculate statistics
  const totalCustomers = customers.length;
  const totalContentItems = customers.reduce(
    (sum, customer) => sum + customer.contentItems.length,
    0
  );
  const upcomingContent = customers.reduce(
    (sum, customer) => sum + customer.contentItems.filter(
      item => new Date(item.date) > new Date()
    ).length,
    0
  );

  // Calculate engagement metrics (mock data)
  const engagementRate = "78%";
  const monthlyGrowth = "12.5%";
  const reachTarget = "92%";

  return (
    <AdminLayout title="Dashboard">
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="rounded-lg shadow-lg p-4 sm:p-6 text-white" style={{ backgroundColor: '#232b3b' }}>
          <h1
            className="text-2xl sm:text-3xl font-bold mb-2 bg-gradient-to-r from-white via-yellow-400 to-yellow-500 bg-clip-text text-transparent"
          >
            Welcome to Aureum Solutions
          </h1>
          <p className="text-primary-100">Manage your social media content effectively</p>
        </div>

        {/* Main Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Customers</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalCustomers}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-full">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Content Items</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalContentItems}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 transform hover:scale-105 transition-transform duration-300">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-full">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Upcoming Content</p>
                <h3 className="text-2xl font-bold text-gray-900">{upcomingContent}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-full">
                <TrendingUp className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Engagement Rate</p>
                <h3 className="text-2xl font-bold text-gray-900">{engagementRate}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-pink-100 rounded-full">
                <BarChart3 className="h-6 w-6 text-pink-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Monthly Growth</p>
                <h3 className="text-2xl font-bold text-gray-900">{monthlyGrowth}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-full">
                <Target className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Reach Target</p>
                <h3 className="text-2xl font-bold text-gray-900">{reachTarget}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

export default Dashboard;