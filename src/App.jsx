import React, { useState } from 'react';
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
import ScheduledPosts from './admin/ScheduledPosts';
import AdminContentPortfolio from './admin/pages/admin/AdminContentPortfolio';
import AdminContentUpload from './admin/pages/admin/ContentUpload';

// Super Admin imports
import SuperAdminLogin from './superadmin/Login';
import SuperAdminDashboard from './superadmin/Dashboard';
import SuperAdminSignup from './superadmin/Signup';
import ViewAssignments from './superadmin/ViewAssignments';
import SuperAdminAnalytics from './superadmin/Analytics';

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
import MediaLibrary from './customer/MediaLibrary';

// Integration imports
import FacebookIntegration from './customer/Integration/FacebookIntegration';
import InstagramIntegration from './customer/Integration/InstagramIntegration';
import YouTubeIntegration from './customer/Integration/YouTubeIntegration';
import LinkedInIntegration from './customer/Integration/LinkedInIntegration';

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
import AIImageGenerator from './components/AIImageGenerator';

// --- ProtectedRoute for all portals ---
function ProtectedRoutePortal({ children, role }) {
  const { currentUser } = useAuth();

  // Not logged in
  if (!currentUser) {
    if (role === 'admin') return <Navigate to="/login" replace />;
    if (role === 'customer') return <Navigate to="/customer/login" replace />;
    if (role === 'content_creator') return <Navigate to="/content-creator/login" replace />;
    if (role === 'superadmin') return <Navigate to="/superadmin/login" replace />;
    return <Navigate to="/login" replace />;
  }

  // Wrong role
  if (role && currentUser.role !== role) {
    if (currentUser.role === 'admin') return <Navigate to="/admin" replace />;
    if (currentUser.role === 'customer') return <Navigate to="/customer" replace />;
    if (currentUser.role === 'content_creator') return <Navigate to="/content-creator" replace />;
    if (currentUser.role === 'superadmin') return <Navigate to="/superadmin" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  // State to hold integration data
  const [facebookPages, setFacebookPages] = useState([]);
  const [instagramAccount, setInstagramAccount] = useState(null);
  const [youtubeChannels, setYoutubeChannels] = useState([]);
  const [customerInfo, setCustomerInfo] = useState(null);

  return (
    <Router>
      <AuthProvider>
        <CustomerProvider>
          <div className="min-h-screen bg-gray-50">
            <div>
             
            </div>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/customer/signup" element={<CustomerSignup />} />
              <Route path="/customer/login" element={<CustomerLogin />} />
              <Route path="/content-creator/signup" element={<ContentCreatorSignup />} />
              <Route path="/content-creator/login" element={<ContentCreatorLogin />} />
              
              {/* Super Admin Auth Routes */}
              <Route path="/superadmin/signup" element={<SuperAdminSignup />} />
              <Route path="/superadmin/login" element={<SuperAdminLogin />} />

              {/* Customer Media Library & Analytics */}
              <Route path="/customer/media-library" element={<MediaLibrary />} />
              
              {/* Super Admin Portal (protected) */}
              <Route path="/superadmin" element={
                <ProtectedRoutePortal role="superadmin">
                  <SuperAdminDashboard />
                </ProtectedRoutePortal>
              } />
              <Route path="/superadmin/dashboard" element={
                <ProtectedRoutePortal role="superadmin">
                  <SuperAdminDashboard />
                </ProtectedRoutePortal>
              } />
              <Route path="/superadmin/view-assignments" element={
                <ProtectedRoutePortal role="superadmin">
                  <ViewAssignments />
                </ProtectedRoutePortal>
              } />
              <Route path="/superadmin/analytics" element={
                <ProtectedRoutePortal role="superadmin">
                  <SuperAdminAnalytics />
                </ProtectedRoutePortal>
              } />

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
              <Route path="/admin/scheduled-posts" element={
                <ProtectedRoutePortal role="admin">
                  <ScheduledPosts />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/content-portfolio" element={
                <ProtectedRoutePortal role="admin">
                  <AdminContentPortfolio />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/content-upload/:calendarId/:itemIndex" element={
                <ProtectedRoutePortal role="admin">
                  <AdminContentUpload />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/approve/:id" element={
                <ProtectedRoutePortal role="admin">
                  <ContentApproval />
                </ProtectedRoutePortal>
              } />
              
              
              {/* Customer Integration Routes (without CustomerLayout wrapper) */}
              <Route path="/customer/integration/facebook" element={
                <ProtectedRoutePortal role="customer">
                  <FacebookIntegration />
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/integration/instagram" element={
                <ProtectedRoutePortal role="customer">
                  <InstagramIntegration />
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/integration/youtube" element={
                <ProtectedRoutePortal role="customer">
                  <YouTubeIntegration />
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/integration/linkedin" element={
                <ProtectedRoutePortal role="customer">
                  <LinkedInIntegration />
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/whatsapp-integration" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <WhatsAppIntegration />
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
              
          

