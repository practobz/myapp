import React, { useState, useEffect } from 'react';
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
import AdminQrGenerator from './admin/pages/admin/AdminQrGenerator';

// Super Admin imports
import SuperAdminLogin from './superadmin/Login';
import SuperAdminDashboard from './superadmin/Dashboard';
import SuperAdminSignup from './superadmin/Signup';
import ViewAssignments from './superadmin/ViewAssignments';
import SuperAdminAnalytics from './superadmin/Analytics';

// Customer Integration: Instagram Ads
import InstagramAdsIntegration from './customer/Integration/InstagramAdsIntegration';

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

import CustomerSocialMediaLinks from './components/CustomerSocialMediaLinks';
import AdminCustomerSocialManager from './components/AdminCustomerSocialManager';
import IntegratedPostAnalytics from './components/IntegratedPostAnalytics';
import PostAnalytics from './components/PostAnalytics';
import CustomerValueDashboard from './components/CustomerValueDashboard';
import SocialAnalyticsDashboard from './customer/Integration/SocialAnalyticsDashboard';

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
import ContentCreatorMediaLibrary from './content-creators/MediaLibrary';

import { useAuth } from './admin/contexts/AuthContext';
import AIImageGenerator from './components/AIImageGenerator';
import TimePeriodChart from './components/TimeperiodChart';
import WhatsAppIntegration from './components/WhatsAppIntegration';
import SchedulePostModal from './admin/components/modals/SchedulePostModal';
import ContentDetailView from './admin/components/modals/ContentDetailView';
import MetaLoginPopup from './components/MetaLoginPopup';
import CustomerWelcome from './customer/auth/CustomerWelcome';
import Configure from './components/Configure';
import SocialIntegrations from './customer/Integration/SocialIntegrations';

// Import the new component
import CustomerAnalytics from './customer/Analytics';
import ROIDashboard from './customer/ROIDashboard';

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

// Robust query parser: prefer explicit search params, fall back to hash query.
const parseQuery = () => {
  if (window.location.search && window.location.search.length > 1) {
    try {
      return new URLSearchParams(window.location.search);
    } catch (e) { /* fall through */ }
  }
  const hash = window.location.hash || '';
  const idx = hash.indexOf('?');
  if (idx !== -1) {
    try {
      return new URLSearchParams(hash.substring(idx + 1));
    } catch (e) { /* fall through */ }
  }
  return new URLSearchParams();
};

// NEW: Public wrapper to render SocialIntegrations without auth
function SocialIntegrationsPublic() {
  const [customer, setCustomer] = React.useState(null);
  const [platform, setPlatform] = React.useState('');
  const socialRef = React.useRef(null);

  React.useEffect(() => {
    const params = parseQuery();
    const customerId = params.get('customerId') || params.get('id') || '';
    const customerName = params.get('customerName') || params.get('name') || '';
    const platformParam = params.get('platform') || params.get('p') || '';
    if (customerId) {
      setCustomer({ id: customerId, name: customerName || 'Customer' });
    }
    setPlatform(platformParam);
  }, []);

  if (!customer || !platform) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full bg-white rounded-xl p-6 shadow text-center">
          <h3 className="font-semibold text-slate-900">Missing parameters</h3>
          <p className="text-sm text-slate-600 mt-2">This page expects customerId and platform in the URL query. Example: /#/customer/social-integrations?customerId=xxx&platform=facebook</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-start justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-xl p-6 shadow">
        <SocialIntegrations
          ref={socialRef}
          platform={platform}
          customer={customer}
          compact={true}
          onConnectionSuccess={() => {
            // minimal success UX: redirect to home or close
            window.location.href = '/';
          }}
        />
      </div>
    </div>
  );
}

function App() {
  // State to hold integration data
  const [facebookPages, setFacebookPages] = useState([]);
  const [instagramAccount, setInstagramAccount] = useState(null);
  const [youtubeChannels, setYoutubeChannels] = useState([]);
  const [customerInfo, setCustomerInfo] = useState(null);

  // If the QR was generated with search params but the hash points somewhere else
  // (for example ".../configure?...# /login"), rewrite the hash to load /configure
  // with the original query so Configure.jsx runs under HashRouter.
  useEffect(() => {
    try {
      const search = window.location.search || '';
      if (!search || search.length < 2) return;
      const sp = new URLSearchParams(search);
      const hasCustomer = sp.get('customerId');
      const hasPlatform = sp.get('platform') || sp.get('p');
      if (!hasCustomer || !hasPlatform) return;

      const currentHash = (window.location.hash || '').replace(/^#/, '');
      if (!currentHash.startsWith('/configure')) {
        // preserve the exact search string (including any tokens) when building the new hash
        const qs = sp.toString();
        // set hash to route HashRouter understands: "/configure?{qs}"
        window.location.hash = `/configure?${qs}`;
      }
    } catch (e) {
      // ignore errors silently
    }
  }, []);

  return (
    <Router>
      <AuthProvider>
        <CustomerProvider>
          <div className="min-h-screen bg-gray-50">
            <div>
              {/* Remove duplicated IntegratedPostAnalytics here */}
              {/* Pass data as props to dashboard */}
              {/* <IntegratedPostAnalytics
                instagramAccount={instagramAccount}
                facebookPages={facebookPages}
                youtubeChannels={youtubeChannels}
                customerInfo={customerInfo}
              /> */}
            </div>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/signup" element={<Signup />} />
              <Route path="/login" element={<Login />} />
              <Route path="/customer/signup" element={<CustomerSignup />} />
              <Route path="/customer/login" element={<CustomerLogin />} />
              <Route path="/content-creator/signup" element={<ContentCreatorSignup />} />
              <Route path="/content-creator/login" element={<ContentCreatorLogin />} />
              
              {/* QR Code Configure Route - Public (no authentication required) */}
              <Route path="/configure" element={<Configure />} />

              {/* NEW: Public direct access to SocialIntegrations (no login required) */}
              <Route path="/customer/social-integrations" element={<SocialIntegrationsPublic />} />
              <Route path="/social-integrations" element={<SocialIntegrationsPublic />} />
              
              {/* Customer Integration Routes - Public (for QR code access) */}
              <Route path="/customer/integration/facebook" element={<FacebookIntegration />} />
              <Route path="/customer/integration/instagram" element={<InstagramIntegration />} />
              <Route path="/customer/integration/youtube" element={<YouTubeIntegration />} />
              <Route path="/customer/integration/linkedin" element={<LinkedInIntegration />} />
              {/* Public route for Instagram Ads Integration */}
              <Route path="/customer/integration/instagram-ads" element={<InstagramAdsIntegration />} />
              
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
              <Route path="/superadmin/qr-generator" element={
                <ProtectedRoutePortal role="superadmin">
                  <AdminQrGenerator />
                </ProtectedRoutePortal>
              } />

              {/* Admin Portal (protected) */}
              <Route path="/admin" element={
                <ProtectedRoutePortal role="admin">
                  <Dashboard />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/dashboard" element={
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
              
              {/* Admin Social Manager Route */}
              <Route path="/admin/customer-social-manager" element={
                <ProtectedRoutePortal role="admin">
                  <AdminCustomerSocialManager />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/integrated-post-analytics" element={
                <ProtectedRoutePortal role="admin">
                  <IntegratedPostAnalytics
                    instagramAccount={instagramAccount}
                    facebookPages={facebookPages}
                    youtubeChannels={youtubeChannels}
                    customerInfo={customerInfo}
                  />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/post-analytics" element={
                <ProtectedRoutePortal role="admin">
                  <PostAnalytics />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/customer-value-dashboard" element={
                <ProtectedRoutePortal role="admin">
                  <CustomerValueDashboard />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/social-analytics-dashboard" element={
                <ProtectedRoutePortal role="admin">
                  <SocialAnalyticsDashboard />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/timeperiod-chart" element={
                <ProtectedRoutePortal role="admin">
                  <TimePeriodChart />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/schedule-post-modal" element={
                <ProtectedRoutePortal role="admin">
                  <SchedulePostModal />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/content-detail-view" element={
                <ProtectedRoutePortal role="admin">
                  <ContentDetailView />
                </ProtectedRoutePortal>
              } />
              <Route path="/admin/qr-generator" element={
                <ProtectedRoutePortal role="admin">
                  <AdminQrGenerator />
                </ProtectedRoutePortal>
              } />

              {/* Remove routes for Customer Portfolio Overview since module is missing */}

              {/* Customer Portal (protected) */}
              <Route path="/customer/welcome" element={
  <CustomerWelcome />
} />

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
              <Route path="/customer/customer-value-dashboard" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <CustomerValueDashboard />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/integrated-post-analytics" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <IntegratedPostAnalytics
                      instagramAccount={instagramAccount}
                      facebookPages={facebookPages}
                      youtubeChannels={youtubeChannels}
                      customerInfo={customerInfo}
                    />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              {/* Add route for PostAnalytics */}
              <Route path="/customer/post-analytics" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <PostAnalytics />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              {/* Add route for Customer Analytics */}
              <Route path="/customer/analytics" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <CustomerAnalytics />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              {/* Add route for ROI Dashboard */}
              <Route path="/customer/roi-dashboard" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <ROIDashboard />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/social-analytics-dashboard" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <SocialAnalyticsDashboard />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />
              <Route path="/customer/timeperiod-chart" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <TimePeriodChart />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />

              {/* Customer WhatsApp Integration */}
              <Route path="/customer/whatsapp-integration" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <WhatsAppIntegration />
                  </CustomerLayout>
                </ProtectedRoutePortal>
              } />

              {/* Protected route for Instagram Ads Integration (Customer) */}
              <Route path="/customer/instagram-ads-integration" element={
                <ProtectedRoutePortal role="customer">
                  <CustomerLayout>
                    <InstagramAdsIntegration />
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
              <Route path="/content-creator/upload/:calendarId/:itemIndex" element={
                <ProtectedRoutePortal role="content_creator">
                  <ContentUpload />
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
              <Route path="/content-creator/media-library" element={
                <ProtectedRoutePortal role="content_creator">
                  <ContentCreatorMediaLibrary />
                </ProtectedRoutePortal>
              } />
              
              {/* AI Image Generator route for content creators */}
              <Route path="/content-creator/ai-image-generator" element={
                <ProtectedRoutePortal role="content_creator">
                  <AIImageGenerator />
                </ProtectedRoutePortal>
              } />
              <Route path="/content-creator/whatsapp-integration" element={
                <ProtectedRoutePortal role="content_creator">
                  <WhatsAppIntegration />
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
