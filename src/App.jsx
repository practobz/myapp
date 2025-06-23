import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider } from './admin/contexts/AuthContext';
import { CustomerProvider } from './admin/contexts/CustomerContext';
import Signup from './admin/pages/auth/Signup';
import Login from './admin/pages/auth/Login';
import Dashboard from './admin/pages/admin/Dashboard';
import CustomerDetails from './admin/pages/admin/CustomerDetails';
import Comment from './admin/pages/admin/Comment';
import ProtectedRoute from './admin/components/ProtectedRoute';

// Customer imports
import CustomerDashboard from './customer/Dashboard';
import ContentCalendar from './customer/ContentCalendar';
import CustomerSettings from './customer/Settings';
import CustomerLayout from './customer/Layout';
import CustomerSignup from './customer/auth/CustomerSignup';
import CustomerLogin from './customer/auth/CustomerLogin';
import Subscription from './customer/Subscription';
import ContentReview from './customer/ContentReview';
import ContentApproval from './customer/ContentApproval';

// Content Creator imports
import ContentCreatorDashboard from './content-creators/Dashboard';
import ContentCreatorSignup from './content-creators/auth/ContentCreatorSignup';
import ContentCreatorLogin from './content-creators/auth/ContentCreatorLogin';
import Assignments from './content-creators/Assignments';
import ContentPortfolio from './content-creators/ContentPortfolio';

function App() {
  return (
    <Router>
      <AuthProvider>
        <CustomerProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/admin" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/customers/:id" element={
                <ProtectedRoute>
                  <CustomerDetails />
                </ProtectedRoute>
              } />
              <Route path="/admin/comment" element={
                <ProtectedRoute>
                  <Comment />
                </ProtectedRoute>
              } />
              {/* Customer auth routes */}
              <Route path="/customer/signup" element={<CustomerSignup />} />
              <Route path="/customer/login" element={<CustomerLogin />} />
              {/* Customer routes with layout */}
              <Route path="/customer" element={
                <CustomerLayout>
                  <CustomerDashboard />
                </CustomerLayout>
              } />
              <Route path="/customer/calendar" element={
                <CustomerLayout>
                  <ContentCalendar />
                </CustomerLayout>
              } />
              <Route path="/customer/settings" element={
                <CustomerLayout>
                  <CustomerSettings />
                </CustomerLayout>
              } />
              <Route path="/customer/subscription" element={
                <CustomerLayout>
                  <Subscription />
                </CustomerLayout>
              } />
              <Route path="/customer/content-review" element={
                <CustomerLayout>
                  <ContentReview />
                </CustomerLayout>
              } />
              <Route path="/customer/approve/:id" element={
                <CustomerLayout>
                  <ContentApproval />
                </CustomerLayout>
              } />
              {/* Content Creator routes */}
              <Route path="/content-creator" element={<ContentCreatorDashboard />} />
              <Route path="/content-creator/signup" element={<ContentCreatorSignup />} />
              <Route path="/content-creator/login" element={<ContentCreatorLogin />} />
              <Route path="/content-creator/assignments" element={<Assignments />} />
              <Route path="/content-creator/portfolio" element={<ContentPortfolio />} />
              {/* Add more content-creator routes as needed */}
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </CustomerProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
