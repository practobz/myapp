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
import CustomersList from './admin/pages/admin/CustomersList';
import CustomerDetailsView from './admin/pages/admin/CustomerDetailsView';
import Customers from './admin/pages/admin/Customers';
import ContentCreators from './admin/pages/admin/ContentCreators';
import ContentCreatorDetails from './admin/pages/admin/ContentCreatorDetails';

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
import ContentUpload from './content-creators/ContentUpload';
import Profile from './content-creators/Profile';
import Settings from './content-creators/Settings';
import { useAuth } from './admin/contexts/AuthContext';

// --- ProtectedRoute for all portals ---
function ProtectedRoutePortal({ children, role }) {
  const { currentUser } = useAuth();

  // Not logged in
  if (!currentUser) {
    if (role === 'admin') return <Navigate to="/login" replace />;
    if (role === 'customer') return <Navigate to="/customer/login" replace />;
    if (role === 'content_creator') return <Navigate to="/content-creator/login" replace />;
    return <Navigate to="/login" replace />;
  }

  // Wrong role
  if (role && currentUser.role !== role) {
    if (currentUser.role === 'admin') return <Navigate to="/admin" replace />;
    if (currentUser.role === 'customer') return <Navigate to="/customer" replace />;
    if (currentUser.role === 'content_creator') return <Navigate to="/content-creator" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CustomerProvider>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/customer/signup" element={<CustomerSignup />} />
              <Route path="/customer/login" element={<CustomerLogin />} />
              <Route path="/content-creator/signup" element={<ContentCreatorSignup />} />
              <Route path="/content-creator/login" element={<ContentCreatorLogin />} />

              {/* Admin Portal (protected) */}
              <Route path="/admin" element={
                <ProtectedRoutePortal role="admin">
                  <Dashboard />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/customers/:id" element={
                <ProtectedRoutePortal role="admin">
                  <CustomerDetails />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/comment" element={
                <ProtectedRoutePortal role="admin">
                  <Comment />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/customers-list" element={
                <ProtectedRoutePortal role="admin">
                  <CustomersList />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/calendar" element={
                <ProtectedRoutePortal role="admin">
                  <CustomersList />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/customer-details/:id" element={
                <ProtectedRoutePortal role="admin">
                  <CustomerDetailsView />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/customers" element={
                <ProtectedRoutePortal role="admin">
                  <Customers />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/content-creators" element={
                <ProtectedRoutePortal role="admin">
                  <ContentCreators />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/content-creator-details/:id" element={
                <ProtectedRoutePortal role="admin">
                  <ContentCreatorDetails />
                </ProtectedRoutePortal>
              } />

              {/* Customer Portal (protected) */}
              <Route path="/customer" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <CustomerDashboard />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/calendar" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <ContentCalendar />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/settings" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <CustomerSettings />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/subscription" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <Subscription />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/content-review" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <ContentReview />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/approve/:id" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <ContentApproval />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/upload" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <ContentUpload />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />

              {/* Content Creator Portal (protected) */}
              <Route path="/content-creator" element={
                <ProtectedRoutePortal role="content_creator">
                  <ContentCreatorDashboard />
                </ProtectedRoutePortal>
              } />
              <Route path="/content-creator/assignments" element={
                <ProtectedRoutePortal role="content_creator">
                  <Assignments />
                </ProtectedRoutePortal>
              } />
              <Route path="/content-creator/portfolio" element={
                <ProtectedRoutePortal role="content_creator">
                  <ContentPortfolio />
                </ProtectedRoutePortal>
              } />
              <Route path="/content-creator/upload/:assignmentId" element={
                <ProtectedRoutePortal role="content_creator">
                  <ContentUpload />
                </ProtectedRoutePortal>
              } />
              <Route path="/content-creator/upload" element={
                <ProtectedRoutePortal role="content_creator">
                  <ContentUpload />
                </ProtectedRoutePortal>
              } />
              <Route path="/content-creator/profile" element={
                <ProtectedRoutePortal role="content_creator">
                  <Profile />
                </ProtectedRoutePortal>
              } />
              <Route path="/content-creator/settings" element={
                <ProtectedRoutePortal role="content_creator">
                  <Settings />
                </ProtectedRoutePortal>
              } />

              {/* Default route */}
              <Route path="/" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </CustomerProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
